# Pipeline Stages — Implementation Detail

Detailed notes for each stage. Read the section relevant to the current stage — don't read the whole file up front.

## Stage 1 — Preprocessing

### DPI selection

DPI is the first knob that matters. Too low and small labels vanish; too high and every downstream call balloons.

| Drawing type | Baseline DPI | Bump to |
|---|---|---|
| Typical SLD, P&ID | 300 | 400 for dense panels |
| Wiring diagrams with <6pt labels | 400 | 600 |
| Architectural plans with schedules | 300 | 400 if schedules are tiny |
| Scanned drawings with noise | 400 (then denoise) | — |

Re-rendering at higher DPI for *just* a failed region is often cheaper than re-running the whole page at high DPI.

### Rotation normalization

Many landscape drawings are embedded rotated 90° in portrait PDFs. Detect via:
- EXIF/PDF page metadata first (cheap)
- Hough-transform-based skew detection as fallback (still cheap)
- Vision LLM as last resort

### Vector vs raster routing

If the source is SVG or a vector PDF *and* the drawing tool preserved panel boundaries as closed polylines:

1. Parse paths with `svgpathtools`, `pikepdf`, or `cairo`.
2. Find closed polygons whose bounding box dimensions fit a "panel" heuristic (aspect ratio 0.5–2.5, area > 5% of page).
3. Use these polygons directly as Stage 2 regions. Skip Stages 2–3 entirely.

This is the fastest and most accurate path when available. The article reports it working well for vendor CAD exports.

## Stage 2 — Layout detection

### Tool choice

| Tool | Strengths | Weaknesses |
|---|---|---|
| Azure Document Intelligence (`prebuilt-layout`) | Fast, managed, returns tables + figures + text with coordinates | Paid per page; less accurate on non-office drawings |
| PaddleOCR PP-Structure | Free, strong table/figure detection | Self-hosted; setup friction |
| LayoutParser (Detectron2 models) | Flexible, custom models for engineering drawings exist | Requires GPU for tolerable latency |
| unstructured.io | Batteries-included, handles many formats | Less granular bounding boxes |
| OpenCV contour detection | Deterministic, zero cost, great on clean CAD | Falls over on handwritten or noisy scans |

Default recommendation: Azure DI if the user is already in Azure; PaddleOCR otherwise. Don't pick a tool the user hasn't heard of.

### What to collect

From the layout model, persist:
- `regions[]`: list of `{bbox, type, confidence}` where type ∈ {figure, table, text}
- `lines[]`: OCR lines with `{text, bbox, confidence}` — you will need these in Stage 5 for hybrid extraction
- `page_meta`: `{width_px, height_px, dpi}` — downstream coordinates depend on this

### Common mistakes

- **Using table detection for panels.** Panels are diagrams, not tables. Use figure detection or custom region detection.
- **Trusting confidence scores blindly.** Layout-model confidence correlates with accuracy for text but not for figure boundaries. Always sanity-check figure regions visually for a sample.

## Stage 3 — Region completion

Stage 2 misses regions when:
- Panels lack a clear rectangular border
- Adjacent panels share a wall
- Panels are very large and get split into two figures

Feed the full page image + a list of existing region bboxes to the vision LLM and ask it to identify missed regions. Use **low reasoning**.

Prompt template in `prompt-templates.md`. Merge results with IoU dedup.

## Stage 4 — Region cropping and classification

### Cropping

Crop each merged region with a small margin. Save as `{source_stem}_p{page}_r{region_id}.png`.

```python
margin = 15  # pixels
x0 = max(0, bbox[0] - margin)
y0 = max(0, bbox[1] - margin)
x1 = min(W, bbox[2] + margin)
y1 = min(H, bbox[3] + margin)
crop = image.crop((x0, y0, x1, y1))
```

### Classification

Heuristics first, vision LLM second:

- Position-based: title blocks are almost always bottom-right or top-right; legends are often right-edge or bottom; revision tables sit in the title block.
- Content-based: legend crops have lots of small symbols; title blocks have repeated label pairs ("Drawing No:", "Date:", "Drawn By:").
- Size-based: title blocks have consistent aspect ratios per drawing standard (ISO, ANSI templates).

If heuristics are ambiguous, one low-reasoning vision call per crop with a 4-way classifier prompt ("content panel", "title block", "legend", "revision table") is acceptable.

## Stage 5 — Per-region semantic extraction

### Model selection

Use a strong vision model. At the time of the article:
- Claude Opus/Sonnet with vision
- GPT-5.4 with `reasoning={"effort": "medium"}`
- Gemini 2.x Pro

Avoid "mini" or "nano" vision tiers for this step — accuracy drop is material.

### Structured output

Always constrain output with tool-use / structured-output mode. Do not rely on "respond only in JSON" in the prompt — models sometimes wrap in markdown or emit explanations.

### Legend injection

In the Stage 5 prompt, include the Stage 4 legend as parsed text:

```
Legend for this drawing:
  Symbol   Description
  --A--    3-phase conductor
  CB       circuit breaker
  ...
```

This step alone fixes a large class of "what is this symbol?" hallucinations.

### Hybrid OCR + vision

The article's hybrid approach combines layout-model OCR with vision:

1. From Stage 2, collect OCR lines whose bounding boxes fall inside the current region's bbox.
2. Pass those OCR lines (text + coordinates) to the vision LLM alongside the cropped image.
3. Instruct the model to treat the OCR as ground truth for text recognition and use the image for symbol/spatial reasoning.

This is the state-of-the-art pattern: OCR handles text precision, vision handles semantics. Pure vision loses on tiny part numbers; pure OCR loses on symbol decoding.

### Per-region output

Emit one JSON object per region (see `output-schemas.md`). Do not aggregate to a single array in this stage — keep region attribution intact for downstream deduplication.

## Cross-region aggregation (after Stage 5)

Deduplication key: `(page, region_id, tag, part_number)`.

Intentional cross-region duplicates: same part number across multiple panels with different tags. Keep both.

Accidental within-region duplicates: same tag twice in one region. Almost always a decoding error — log and flag, don't silently merge.

### Reconciliation with summary tables

If the drawing has a summary/totals table (common in mechanical parts lists), run a separate Stage 5 pass on that table. Compare summary counts to aggregated-from-panels counts. Discrepancies > 5% warrant a re-run at higher DPI on the disagreeing regions.
