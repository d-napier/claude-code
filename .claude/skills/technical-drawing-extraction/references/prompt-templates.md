# Prompt Templates

Ready-to-adapt prompts for each vision-LLM stage. Copy, fill in placeholders (`{{like_this}}`), and keep the reasoning-effort guidance.

## Stage 3 — Missed region detection

**Reasoning effort: low**

```
You are analyzing a technical drawing page to find panel regions that a layout detector missed.

The image shows a {{drawing_type}} (e.g. electrical single-line diagram).
Each panel is a self-contained rectangular region containing components and their labels — think of it as a cabinet or subsystem.

A layout detector has already identified these regions:
{{existing_regions_as_json_list_of_bboxes_with_ids}}

Your task: identify any panel regions that were missed. Do not include:
- Title blocks
- Revision tables
- Legend boxes
- The overall page frame

Return a JSON object of this exact shape (use tool-use if available):

{
  "missed_regions": [
    {
      "bbox": [x0, y0, x1, y1],
      "reason": "short description of why this is a panel the detector missed"
    }
  ]
}

Coordinates are in pixels, origin top-left, same as the image. If there are no missed regions, return {"missed_regions": []}.
```

## Stage 4 (optional) — Region classification

**Reasoning effort: low**

```
Classify this cropped region from a {{drawing_type}} into exactly one of:
- "panel": contains components and their labels; a BOM should be extracted from it
- "title_block": drawing metadata (drawing number, date, author, revision)
- "legend": symbol-to-description mapping
- "revision_table": history of changes
- "other": anything else

Return JSON: {"classification": "...", "confidence": 0.0-1.0}
```

## Stage 5 — Per-region BOM extraction

**Reasoning effort: medium**

```
You are extracting a Bill of Materials from a single panel of a {{drawing_type}}.

## Context

Drawing metadata (from title block):
{{title_block_fields_as_key_value_pairs}}

Legend for this drawing:
{{legend_as_symbol_description_table}}

OCR text detected inside this region (use as ground truth for text recognition):
{{ocr_lines_with_coordinates}}

## Task

Examine the image and list every distinct component visible inside this panel. For each component, emit:

- tag: the component's identifier on the drawing (e.g. "QF1", "K2", "V-101")
- description: a short human-readable description
- part_number: manufacturer part number if shown
- manufacturer: if shown
- quantity: number of instances with this exact tag in this panel (usually 1)
- symbol_reference: the legend entry ID that matches this symbol, or null
- confidence: your confidence 0.0-1.0
- notes: anything a human reviewer should know (illegible part number, ambiguous symbol, overlapping annotation)

## Rules

- One row per tag. If the same tag appears twice with the same part number, count it once with quantity>1 only if the drawing explicitly shows a multiplier; otherwise flag it in notes.
- Never invent a part number. If you can't read it, emit null and describe in notes.
- Never invent a symbol reference. If the symbol isn't in the legend, emit null and describe in notes.
- Do not extract components from adjacent panels that bleed into this crop. Stay inside the dominant panel region.

## Output schema

{
  "region_label": "human-readable name of this panel if visible on the drawing",
  "items": [
    {
      "tag": "...",
      "description": "...",
      "part_number": "...",
      "manufacturer": "...",
      "quantity": 1,
      "symbol_reference": "...",
      "confidence": 0.0,
      "notes": null
    }
  ]
}
```

## Stage 5 variant — Title-block extraction

**Reasoning effort: low**

```
Extract metadata fields from this title block. Return JSON:

{
  "drawing_number": "...",
  "drawing_title": "...",
  "revision": "...",
  "date": "...",
  "drawn_by": "...",
  "checked_by": "...",
  "approved_by": "...",
  "sheet": "... of ...",
  "scale": "...",
  "project": "...",
  "client": "...",
  "extras": {"any_other_labeled_field": "value"}
}

For any field not present, use null. Dates in ISO format when possible.
```

## Stage 5 variant — Legend extraction

**Reasoning effort: low**

```
Extract the symbol-to-description mapping from this legend. Return JSON:

{
  "entries": [
    {
      "id": "legend-item-1",
      "symbol_description": "how the symbol looks — shape, orientation, key features",
      "meaning": "what the symbol represents",
      "category": "electrical | mechanical | instrumentation | piping | other"
    }
  ]
}

Preserve the order on the drawing. Use "legend-item-{n}" as stable IDs.
```

## Cross-region reconciliation (optional)

**Reasoning effort: medium**

Used when two regions disagree (e.g. a summary table lists counts that don't match aggregated per-panel extractions).

```
You are reconciling two extractions from the same drawing.

Extraction A (per-panel BOMs aggregated):
{{json_a}}

Extraction B (summary table):
{{json_b}}

Identify discrepancies. For each:
- Which tag/part is affected
- Whether A or B is more likely correct, and why
- A recommended resolution

Return JSON:
{
  "discrepancies": [
    {
      "tag": "...",
      "a_quantity": 0,
      "b_quantity": 0,
      "likely_correct": "A | B | unclear",
      "reason": "...",
      "recommended_action": "re-extract region X at higher DPI | accept B | flag for human review"
    }
  ]
}
```

## Prompting principles

A few patterns that consistently help on these tasks:

1. **Tell the model what to ignore.** "Do not extract from adjacent panels" cuts a big error class.
2. **Give the model the legend and OCR as text.** Don't make it re-read what a cheaper tool already read accurately.
3. **Ask for confidence and notes per row, not overall.** Overall confidence is useless; per-row flags are actionable.
4. **Forbid invention explicitly.** Models are biased toward filling fields. "Never invent a part number" changes behavior meaningfully.
5. **Define the de-duplication policy in the prompt.** Without guidance, models silently merge or silently duplicate — both bad.
