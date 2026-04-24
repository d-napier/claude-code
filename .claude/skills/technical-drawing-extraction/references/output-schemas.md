# Output Schemas

JSON schemas for the final aggregated output and for intermediate stages. Pick the variant that matches the user's drawing type; fall back to the generic one if in doubt.

## Generic envelope

Every extraction should produce this outer shape:

```json
{
  "source": "path/to/drawing.pdf",
  "extracted_at": "2026-04-24T14:33:00Z",
  "pipeline_version": "1.0",
  "pages": [
    {
      "page": 1,
      "page_meta": {
        "width_px": 4960,
        "height_px": 3508,
        "dpi": 400
      },
      "title_block": { /* see Title Block schema */ },
      "legend": { /* see Legend schema */ },
      "regions": [
        { /* see Region schema */ }
      ]
    }
  ],
  "aggregated_bom": [ /* see Aggregated BOM schema */ ],
  "validation": {
    "count_reconciliation": { "expected": 294, "extracted": 291, "delta_pct": -1.02 },
    "unresolved_symbol_references": [],
    "within_region_duplicate_tags": []
  }
}
```

## Title block

```json
{
  "drawing_number": "E-101",
  "drawing_title": "MCC-A Single Line Diagram",
  "revision": "C",
  "date": "2026-03-15",
  "drawn_by": "J. Smith",
  "checked_by": "R. Patel",
  "approved_by": "M. Liu",
  "sheet": "1 of 4",
  "scale": "NTS",
  "project": "Refinery Expansion Phase 2",
  "client": "Acme Petrochem",
  "extras": {}
}
```

## Legend

```json
{
  "entries": [
    {
      "id": "legend-item-1",
      "symbol_description": "square with diagonal line, label CB",
      "meaning": "circuit breaker",
      "category": "electrical"
    }
  ]
}
```

## Region

```json
{
  "region_id": "p1-r3",
  "region_label": "MCC-A",
  "region_bbox": [120, 450, 1850, 2200],
  "region_type": "panel",
  "items": [ /* see per-discipline Item schemas below */ ]
}
```

## Item — Electrical (default)

```json
{
  "tag": "QF1",
  "description": "circuit breaker, 3-pole, 63A",
  "part_number": "ABB S203-C63",
  "manufacturer": "ABB",
  "quantity": 1,
  "rating": "63A, 400V",
  "symbol_reference": "legend-item-12",
  "confidence": 0.92,
  "notes": null
}
```

## Item — P&ID / process instrumentation

```json
{
  "tag": "FIC-101",
  "description": "flow indicating controller, inline",
  "loop_number": "101",
  "service": "feedwater",
  "line_number": "L-101-4\"-CS",
  "size": "4 inch",
  "manufacturer": null,
  "part_number": null,
  "symbol_reference": "legend-item-3",
  "confidence": 0.88,
  "notes": "tag partially obscured by pipe annotation"
}
```

## Item — Mechanical parts list

```json
{
  "item_number": "4",
  "description": "M8x20 socket head cap screw",
  "part_number": "DIN 912 M8x20 12.9",
  "material": "steel 12.9",
  "manufacturer": null,
  "quantity": 8,
  "assembly_reference": "BALLOON-4",
  "confidence": 0.95,
  "notes": null
}
```

## Item — Architectural / MEP schedule

```json
{
  "tag": "AHU-1",
  "description": "air handling unit, 10,000 CFM",
  "manufacturer": "Trane",
  "part_number": "CSAA020",
  "location": "Mechanical Room 201",
  "quantity": 1,
  "symbol_reference": "legend-item-7",
  "confidence": 0.90,
  "notes": "schedule value; not directly visible in plan view"
}
```

## Aggregated BOM

After Stage 5, aggregate across all regions. Two common shapes:

### Shape A — flat list with provenance

```json
[
  {
    "tag": "QF1",
    "description": "circuit breaker, 3-pole, 63A",
    "part_number": "ABB S203-C63",
    "manufacturer": "ABB",
    "total_quantity": 1,
    "instances": [
      {"page": 1, "region_id": "p1-r3", "region_label": "MCC-A", "quantity": 1}
    ],
    "confidence_min": 0.92,
    "confidence_mean": 0.92
  }
]
```

### Shape B — grouped by part number, for purchasing

```json
[
  {
    "part_number": "ABB S203-C63",
    "description": "circuit breaker, 3-pole, 63A",
    "manufacturer": "ABB",
    "total_quantity": 14,
    "tags_by_panel": {
      "MCC-A": ["QF1", "QF3"],
      "MCC-B": ["QF1", "QF2", "QF5"],
      "...": []
    }
  }
]
```

## JSON Schema (machine-readable)

For systems that want strict validation, here is the electrical-item schema in JSON Schema Draft 2020-12:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["tag", "description", "quantity", "confidence"],
  "properties": {
    "tag": {"type": "string"},
    "description": {"type": "string"},
    "part_number": {"type": ["string", "null"]},
    "manufacturer": {"type": ["string", "null"]},
    "quantity": {"type": "integer", "minimum": 1},
    "rating": {"type": ["string", "null"]},
    "symbol_reference": {"type": ["string", "null"]},
    "confidence": {"type": "number", "minimum": 0, "maximum": 1},
    "notes": {"type": ["string", "null"]}
  }
}
```

## Tips

- Keep the envelope even if the user wants CSV output — flatten to CSV as a final export step, not during extraction.
- Persist `region_bbox` in output; downstream debuggers will thank you.
- Store `pipeline_version` so that outputs from different prompt versions are distinguishable.
- When exporting to a spreadsheet or ERP, use Shape B (grouped by part number). When feeding back into a review UI, use Shape A (flat with provenance).
