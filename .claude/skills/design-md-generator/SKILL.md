---
name: design-md-generator
description: Generate DESIGN.md files — plain-text design system documents that AI coding agents read to produce consistent UI. Use this skill whenever the user mentions DESIGN.md, design systems for AI agents, design tokens in markdown, Stitch format, or wants to create a structured design reference from a website URL, brand name, design description, or existing design tokens. Also trigger when someone asks to "document a design system", "create a design spec for AI", or wants a reusable design file that agents can follow.
---

Generate comprehensive DESIGN.md files following the Google Stitch format — structured markdown documents that give AI coding agents everything they need to produce consistent, on-brand UI without access to Figma or design tools.

## What is DESIGN.md?

A DESIGN.md is a plain-text design system document with 9 standard sections. No Figma exports or JSON schemas required — just markdown that any AI agent can read and follow. The format was popularized by Google Stitch and adopted widely for AI-assisted development.

## Input Sources

Users may provide any combination of:

- **A website URL** — Fetch the site, inspect its visual language, and reverse-engineer the design system
- **A brand or product name** — Use known brand knowledge (colors, typography, aesthetic) to construct the system
- **Design tokens or variables** — CSS custom properties, Tailwind config, Figma export, or raw JSON tokens
- **An aesthetic description** — "warm and minimal", "brutalist dark mode", "playful SaaS dashboard"
- **An existing partial design system** — Fill gaps and restructure into the full 9-section format

When working from a URL, use WebFetch to pull the page and extract visual signals: colors, font stacks, spacing patterns, border radii, shadow styles, and overall aesthetic direction. Cross-reference with any known brand guidelines for that company.

When working from a brand name alone, draw on your knowledge of the brand's visual identity, but be transparent about what you're inferring versus what you know. Invite the user to correct specifics.

## The 9-Section Structure

Every DESIGN.md follows this structure. Each section has a specific purpose — don't skip sections, and don't merge them. The sections build on each other: colors feed into components, components reference typography, layout governs spacing everywhere.

### Section 1: Visual Theme & Atmosphere

Set the emotional and aesthetic tone for the entire system. This is the "vibe check" — a narrative paragraph (2-4 sentences) that describes what the design *feels* like, followed by bullet points capturing key characteristics.

Think in metaphors: "a literary salon reimagined as a product page", "engineering precision over decoration", "approachability through warm minimalism". This framing helps AI agents make judgment calls when the spec doesn't cover a specific scenario.

Include 5-8 **Key Characteristics** as bullet points, each with a concrete detail (color code, technique name, or specific pattern).

**Example opening:**
> Claude's interface is a literary salon reimagined as a product page — warm, unhurried, and quietly intellectual. The entire experience is built on a parchment-toned canvas (`#f5f4ed`) that deliberately evokes the feeling of high-quality paper rather than a digital surface.

### Section 2: Color Palette & Roles

Organize colors by *role*, not just name. Group them into:

- **Primary** — The 2-3 colors that define the brand (main text color, brand accent, secondary accent)
- **Secondary & Accent** — Supporting colors (error, success, info, warning, focus)
- **Surface & Background** — Page backgrounds, card backgrounds, elevated surfaces, dark-mode surfaces
- **Neutrals & Text** — The full gray scale with semantic roles (primary text, secondary text, muted, disabled)
- **Semantic & Accent** — Borders, rings/outlines, dividers, interactive state colors
- **Gradient System** — Whether gradients are used, and if so, how; or explicitly state "gradient-free"

For every color entry, provide:
- A **semantic name** in bold (e.g., **Parchment**, **Terracotta Brand**)
- The **hex value** in inline code (e.g., `#f5f4ed`)
- A **one-line description** of where and why it's used

This is the most reference-heavy section. Be exhaustive — an AI agent picking a border color at 2am shouldn't have to guess.

### Section 3: Typography Rules

Three subsections:

1. **Font Family** — Headline, body/UI, and code fonts with fallback stacks
2. **Hierarchy** — A markdown table with columns: Role, Font, Size, Weight, Line Height, Letter Spacing, Notes. Include 12-18 rows covering display, headings, body variants, captions, labels, overlines, and code.
3. **Principles** — 3-5 guiding rules that explain the *reasoning* behind the type choices (e.g., "Serif for authority, sans for utility", "Single weight for serifs to maintain a consistent voice")

The hierarchy table is the core artifact here. Be precise — include px values with rem equivalents, exact weights (not "bold" but "700"), and specific line-height ratios.

### Section 4: Component Stylings

Cover the standard component categories:

- **Buttons** — Define 3-5 variants (primary, secondary, ghost, destructive, etc.) with background, text color, padding, border-radius, shadow/ring, and hover/active states
- **Cards & Containers** — Background, border, radius, shadow, padding for light and dark variants
- **Inputs & Forms** — Text color, background, border, focus ring, padding, radius
- **Navigation** — Layout, background, link colors, active states, border treatments
- **Image Treatment** — Border radius on media, shadow, aspect ratio handling

Also include **Distinctive Components** — the unique elements that make this design system special (e.g., model comparison cards, pricing tiers, feature grids). These are brand-specific and should feel opinionated.

For each component, specify exact values: pixel padding, hex colors, shadow strings, border-radius in px. An AI agent should be able to implement any component from this section alone without referencing a visual mock.

### Section 5: Layout Principles

Four subsections:

1. **Spacing System** — Base unit (typically 4px or 8px) and the full scale
2. **Grid & Container** — Max width, column structure, common layouts
3. **Whitespace Philosophy** — The *why* behind spacing decisions (generous for editorial feel, dense for dashboards, etc.)
4. **Border Radius Scale** — Named scale from sharp to fully rounded, with px values and usage guidance

### Section 6: Depth & Elevation

Define an elevation system with 4-6 levels:

| Level | Name | Shadow | Usage |
|-------|------|--------|-------|

Include the exact CSS shadow strings. Describe the philosophical approach — some systems use ring-based shadows (like `0px 0px 0px 1px`), others use traditional drop shadows, others use layered ambient occlusion. Explain the choice.

Add a **Decorative Depth** subsection for any non-standard depth techniques (gradients behind cards, blurred backgrounds, etc.).

### Section 7: Do's and Don'ts

Two parallel lists of 8-12 items each:

**Do:**
- Actionable, specific guidance (not vague "be consistent")
- Each item should reference a concrete element from the design system

**Don't:**
- Common mistakes and anti-patterns specific to *this* design system
- Patterns that look similar but violate the system's philosophy

This section is the guardrail that prevents an AI agent from technically following specs but missing the spirit. Write items that would catch a well-meaning but uninformed implementation.

### Section 8: Responsive Behavior

Cover:

- **Breakpoints** — A table with name, min-width, and what changes at each
- **Touch Targets** — Minimum sizes for mobile interaction
- **Collapsing Strategy** — How multi-column layouts degrade (grid → stack, sidebar → drawer, etc.)
- **Image Behavior** — How images/media scale, crop, or reflow

### Section 9: Agent Prompt Guide

This is the "cheat sheet" section — designed for quick reference when an AI agent is mid-implementation:

1. **Quick Color Reference** — The 5-8 most-used colors in a scannable format
2. **Example Component Prompts** — 2-3 ready-to-use prompt snippets showing how to request components in this design system's style
3. **Iteration Guide** — A 5-7 point checklist for self-review ("Did I use the correct border treatment?", "Are my grays warm or cool?")

## Writing Quality Standards

**Be specific, not vague.** Every color has a hex code. Every size has a pixel value. Every shadow has a CSS string. "Subtle border" is useless; `1px solid rgba(0,0,0,0.1)` is actionable.

**Use semantic naming.** Colors are "Parchment" and "Terracotta Brand", not "Light Background 1" and "Accent Orange". Names should encode *meaning* and *intent*.

**Write evocative descriptions.** The Visual Theme section especially should read like design criticism, not a spec sheet. Help the AI agent understand the *feeling*, not just the values.

**Include the reasoning.** For each major design decision, briefly explain *why*. "Warm grays with yellow-brown undertones because cool blue-grays feel clinical" is 10x more useful than just listing the hex values, because it helps an agent extrapolate to scenarios you didn't explicitly cover.

**Tables for structured data.** Typography hierarchy, elevation levels, breakpoints, and spacing scales should always be markdown tables — they're scannable and unambiguous.

**Inline code for technical values.** Hex colors, font names, CSS properties, and pixel values go in backtick code formatting.

## Preview HTML Generation

After generating the DESIGN.md, also create two companion files:

### preview.html
A visual catalog that renders the design system as a living reference page. Include:
- Color swatches with hex labels for every color in the palette
- Typography samples showing each level of the hierarchy
- Button variants in all states (default, hover, active, disabled)
- Card and container examples
- Spacing and border-radius visual scale
- Shadow/elevation examples

Style this page *using the design system itself* — it should be both a reference and a demonstration.

### preview-dark.html
The same catalog rendered in the dark-mode variant. If the design system doesn't define dark mode, create a sensible dark-mode adaptation based on the system's principles, or skip this file and note that the system is light-only.

Both preview files should be self-contained HTML (inline CSS, no external dependencies beyond Google Fonts if needed) so they can be opened directly in a browser.

## Workflow

1. **Understand the source.** If given a URL, fetch it and study the visual language. If given a brand name, recall what you know. If given a description, explore the aesthetic space. Ask clarifying questions if the input is ambiguous.

2. **Draft the DESIGN.md.** Write all 9 sections in order. Cross-reference between sections — colors mentioned in Component Stylings must match Section 2, typography in components must match Section 3.

3. **Generate preview files.** Create preview.html (and preview-dark.html if applicable) that visually demonstrate the system.

4. **Self-review.** Before presenting to the user, check:
   - Are all 9 sections present and substantive?
   - Does every color have a hex code and semantic name?
   - Does the typography table have 12+ rows with all columns filled?
   - Are component specs detailed enough to implement without guessing?
   - Do the Do's and Don'ts reference specific elements from *this* system?
   - Does the preview HTML actually use the documented styles?
   - Is the document internally consistent (no color referenced in Section 4 that isn't defined in Section 2)?

5. **Present to the user.** Share the DESIGN.md and preview files. Offer to adjust any section based on their feedback.
