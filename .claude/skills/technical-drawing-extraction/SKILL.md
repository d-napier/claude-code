---
name: technical-drawing-extraction
description: Design and build pipelines that extract structured data (bills of materials, parts lists, component inventories, tag IDs, annotations) from complex technical drawings — electrical single-line diagrams, P&IDs, mechanical drawings, wiring diagrams, schematics, architectural plans, panel schedules. Use this whenever a user wants to turn a dense engineering drawing into structured data (JSON, CSV, a spreadsheet, a database row) and a naive "send the page to a vision model" approach would fail due to visual complexity. Also use this when the user mentions extracting component lists, tag IDs, part numbers, symbols, or schedules from CAD outputs, scanned drawings, or PDF blueprints — even if they don't say "pipeline" or "BOM". If the user is building document extraction over engineering drawings, reach for this skill.
---

# Technical Drawing Extraction

Extracting structured data from engineering drawings looks deceptively simple: "just send the PDF to a vision model and ask for a table." That approach fails, and it fails in recognizable ways:

- **Missed components** — the model skims over dense regions.
- **Hallucinated components** — plausible-looking entries that aren't on the page.
- **Mis-attribution** — component X listed under panel Y when it belongs to Z.

The pattern that works is to stop treating the page as the unit of work. Decompose first, then extract. This skill captures that methodology, drawn from Microsoft's published pipeline that reached ~94% accuracy on electrical single-line diagrams by combining a cheap layout detector with a vision LLM, rather than leaning on the vision LLM alone.

## When to use this skill

Reach for this skill when the user wants structured extraction from:

- Electrical: SLDs, panel schedules, wiring diagrams, BOMs, one-line diagrams
- Process: P&IDs, instrumentation diagrams, piping drawings
- Mechanical: assembly drawings, parts lists, GD&T drawings
- Architectural / MEP: floor plans with equipment schedules, riser diagrams
- Any dense, multi-region technical drawing where a single page mixes diagrams, title blocks, legends, and schedules

Do NOT use this for simple OCR of clean forms or a single tidy table — a layout model or plain OCR handles those directly.

## The core idea

**The unit of analysis is the region, not the page.** Every reliable pipeline does two things a naive one doesn't:

1. **Layout-first, vision-second.** A cheap, deterministic layout detector (Azure Document Intelligence's prebuilt-layout, PaddleOCR PP-Structure, LayoutParser, unstructured.io, or even a tuned OpenCV contour pass for CAD-clean line art) locates regions. Reserve vision-LLM calls for the gaps the layout detector misses and for the actual semantic read inside each region. A layout call is typically 10–100× cheaper than a vision-LLM call and doesn't hallucinate.
2. **Separate content from chrome.** Title blocks, revision tables, and legends are not BOM content — they are *context*. Detect and exclude them from extraction, but keep the legend around: it's how you decode the symbols that appear inside each panel.

If you internalize only those two things, the rest of this skill is implementation detail.

## Pipeline (five stages)

Adapt the stages to the user's drawing type and source format. Not every drawing needs every stage — the SVG shortcut in Stage 2 can skip vision entirely when vector geometry is preserved.

### Stage 1 — Preprocessing (rule-based)

- Render PDF pages to raster images at **300 DPI minimum**. Bump to 400–600 DPI when the drawing has small labels (sub-8pt text, tag IDs under 3mm on the physical drawing).
- Normalize orientation — it is common for landscape drawings to be embedded rotated in a portrait PDF.
- Strip or flatten CAD layers if the source is a multi-layer PDF; many vision models get confused by overlapping layers.
- If the source is SVG or a PDF with preserved vectors, jump to the geometric alternative in `references/pipeline-stages.md` — closed polygons of line segments often *are* the panel boundaries, and extracting them deterministically is both cheaper and more accurate than vision.

### Stage 2 — Layout detection (deterministic)

Run a layout model over each full page image. Collect:

- **Figure regions**: the diagrams/panels themselves
- **Tables**: revision tables, schedules, legends
- **Text blocks with coordinates**: you will need these in Stage 5

This is your baseline. Well-structured drawings land 70–90% of regions here. See `references/pipeline-stages.md` for tool-specific notes on Azure DI, PaddleOCR, LayoutParser, and the geometric approach for SVG/vector input.

### Stage 3 — Region completion (vision LLM, **low reasoning**)

Feed the full page image plus the Stage 2 regions (as a list of bounding boxes annotated on the image or described in text) to a vision LLM and ask: "Which panels did the layout detector miss? Return their bounding boxes in this JSON shape." Use **low reasoning effort** — this is a spatial grounding task. Medium or high reasoning burns tokens without improving spatial accuracy.

Merge the Stage 2 and Stage 3 regions. Deduplicate by IoU threshold (0.5 works well as a starting point).

See `references/prompt-templates.md` for the exact prompt.

### Stage 4 — Region cropping and classification (rule-based + one vision call)

Crop each region to its own image using the merged bounding boxes. Add a small margin (10–20 px) to avoid clipping edge labels. Save crops indexed by `{page}-{region_id}`.

Classify each crop as:

- **Content** — extract BOM/components from this
- **Chrome** — title block, revision table, legend; don't produce BOM rows, but do extract separately (the legend feeds Stage 5; the title block captures drawing metadata)

For mixed drawings where the classifier is ambiguous, one low-reasoning vision call to label the crop is fine — it's one call per region, not per component.

### Stage 5 — Per-region semantic extraction (vision LLM, **medium reasoning**)

For each content region, run a vision LLM with a strict JSON schema. Use **medium reasoning effort** — the article's benchmark shows ~86% accuracy at low vs ~89–91% at medium; high reasoning's marginal gain rarely justifies the doubled latency across dozens of region calls.

Key prompt choices (full templates in `references/prompt-templates.md`):

- **Inject the legend** from Stage 4 into the prompt so the model can decode symbols correctly.
- **Constrain output to JSON schema** (see `references/output-schemas.md`). Tool-use / structured-output mode if your provider supports it.
- **Ask the model to flag uncertainty** on each row rather than silently guessing. A `confidence` field and a `notes` field catch the edge cases humans need to review.

Aggregate across regions. Deduplicate by `(page, region_id, tag, part_number)` — the same component appears in multiple panels legitimately (different tags), and the same tag within a panel almost always indicates a decoding error, not an intentional duplicate.

## Reasoning calibration

From the published benchmarks, calibrate reasoning effort to the task type:

| Task type | Example | Reasoning effort |
|---|---|---|
| Spatial grounding | "Where are the panels?" | **low** |
| Classification | "Is this a legend or a panel?" | **low** |
| Semantic reading | "List every component and its part number." | **medium** |
| Cross-region reconciliation | "Resolve conflicts between two extractions." | **medium** |

Avoid defaulting to high reasoning "to be safe". The tokens compound across every region call and latency grows faster than accuracy.

## Output schema

Default shape for extracted items:

```json
{
  "source": "path/to/drawing.pdf",
  "page": 1,
  "region_id": "panel-3",
  "region_bbox": [x0, y0, x1, y1],
  "region_label": "MCC-A",
  "items": [
    {
      "tag": "QF1",
      "description": "circuit breaker, 3-pole, 63A",
      "part_number": "ABB S203-C63",
      "manufacturer": "ABB",
      "quantity": 1,
      "symbol_reference": "legend-item-12",
      "confidence": 0.92,
      "notes": null
    }
  ]
}
```

Variants for mechanical parts lists, P&ID instruments, and architectural schedules live in `references/output-schemas.md`.

## Validation

Run these before declaring the extraction done:

1. **Count reconciliation.** If the drawing carries a visible summary count (title block totals, "total items: 47"), compare. Flag discrepancies >5% for human review.
2. **Tag uniqueness within region.** Duplicate tags in the same panel almost always mean a decoding error, not an intentional duplicate.
3. **Legend coverage.** Every `symbol_reference` emitted in Stage 5 should resolve to a legend entry from Stage 4. Unresolved references indicate the model invented a symbol.
4. **Spot-check bounding boxes.** For 2-3 regions per run, visually confirm the crop captured the full panel. Regions clipped mid-component produce silently wrong extractions.

## Common failure modes

- **Dense legend on the right edge** → the layout model merges it with the adjacent panel. Fix: bias Stage 3's prompt toward legend keywords ("symbol", "ref", "qty", "description"), or pre-split the rightmost 15% of the page.
- **Rotated or stamped text in title blocks** → OCR misreads. Fix: route title blocks to the vision LLM (Stage 5) rather than relying on the layout detector's OCR.
- **Tiny part numbers** → DPI too low. Fix: re-render just the failed region at 600 DPI and re-run Stage 5 on the higher-resolution crop.
- **Same panel duplicated across revision pages** → double-counted. Fix: include page number in the dedup key, or compute page-level perceptual hashes and skip near-duplicates.
- **Model emits markdown-formatted JSON** → downstream parse errors. Fix: use structured-output / tool-use mode; don't rely on "respond only in JSON".

## Working with a user on their extraction problem

When helping a user build one of these pipelines:

1. Ask what the source format is (raster PDF, vector PDF, SVG, scanned image, CAD native). This drives Stage 1 decisions and whether the SVG shortcut is viable.
2. Ask for one representative drawing page. Dimensions, density, and layout vary enormously — prompts tuned for an SLD will underperform on a P&ID.
3. Ask what the downstream consumer is (spreadsheet, ERP import, database). This drives the output schema.
4. Prototype Stages 1–4 first with a deterministic layout tool before touching the vision LLM. Most debugging pain comes from vision calls; push them as late as possible.
5. Measure on a labeled page before scaling. The ~94% accuracy in the published pipeline came with a labeled test set; without one, you can't tell if a prompt change helped or hurt.

## Reference files

- `references/pipeline-stages.md` — per-stage implementation detail, tool choices, SVG/vector shortcut
- `references/prompt-templates.md` — ready-to-adapt prompts for Stages 3 and 5
- `references/output-schemas.md` — JSON schema variants for electrical, mechanical, P&ID, and architectural extraction
