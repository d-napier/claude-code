# Design System: Forge

## 1. Visual Theme & Atmosphere

Forge is a terminal that escaped into the browser and refused to apologize — brutalist, high-contrast, and unapologetically raw. Every surface is near-black (`#0d0d0d`), every corner is sharp (0px radius everywhere), and the only concession to color is the electric neon accents that cut through the darkness like syntax highlighting in a midnight coding session. The design doesn't try to be friendly — it tries to be *fast*, *clear*, and *honest*.

Monospace typography dominates everything: headings, body text, labels, buttons. There are no serifs, no sans-serifs, just the grid-aligned reliability of fixed-width characters. This isn't a limitation — it's a statement. When every character occupies the same width, layouts align with mechanical precision, code and prose share the same visual language, and the boundary between "reading documentation" and "reading code" dissolves.

**Key Characteristics:**
- Near-black void canvas (`#0d0d0d`) — darker than most "dark modes", approaching true terminal black
- Monospace-only typography (`JetBrains Mono`) — no proportional fonts anywhere in the system
- Zero border-radius — every element has sharp, precise corners. No softening.
- Neon accent palette: Electric Green (`#00ff88`), Cyan (`#00e5ff`), Amber (`#ffb300`), Magenta (`#ff3388`)
- Minimal decoration — no gradients, no illustrations, no shadows. Borders do all the structural work.
- High contrast ratios (12:1+) — text sears itself into the dark background
- Terminal-inspired UI patterns: blinking cursors, monospace tables, command-line prompts
- Dense information display — every pixel earns its place

## 2. Color Palette & Roles

### Primary
- **Void** (`#0d0d0d`): The primary canvas — a near-black that's warmer than `#000000` but still reads as pure dark. The foundation of everything.
- **Electric Green** (`#00ff88`): The primary accent — used for active states, primary CTAs, success indicators, and the blinking cursor. The "power on" color.
- **Bone** (`#e8e8e8`): Primary text color — a slightly warm off-white that's easier on the eyes than pure white against the void.

### Secondary & Accent
- **Cyan** (`#00e5ff`): Links, informational states, and secondary interactive elements. The "data" color.
- **Amber** (`#ffb300`): Warnings, caution states, and highlighted text. The "attention" color.
- **Magenta** (`#ff3388`): Errors, destructive actions, and critical alerts. The "danger" color.
- **Violet** (`#aa66ff`): Tertiary accent for tags, categories, and decorative differentiation.

### Surface & Background
- **Void** (`#0d0d0d`): Page background — the base layer.
- **Surface** (`#161616`): Elevated containers, cards, code blocks — one step up from void.
- **Surface Raised** (`#1e1e1e`): Secondary elevated surfaces, hover states on cards.
- **Surface Inset** (`#080808`): Inset areas, input backgrounds — one step below void.

### Neutrals & Text
- **Bone** (`#e8e8e8`): Primary text — high contrast against void.
- **Silver** (`#a0a0a0`): Secondary text — descriptions, metadata.
- **Dim** (`#666666`): Tertiary text — placeholders, disabled states.
- **Faint** (`#333333`): Quaternary — barely visible, structural hints.

### Semantic & Accent
- **Border Default** (`#2a2a2a`): Standard borders — visible but restrained.
- **Border Strong** (`#444444`): Emphasized borders, active section outlines.
- **Border Active** (`#00ff88`): Focus borders, active element outlines — full neon.
- **Divider** (`#1a1a1a`): Horizontal rules and section separators.

### Gradient System
- Forge is **gradient-free**. Gradients imply softness and transition — Forge prefers hard edges and binary states. Color changes are abrupt and intentional. If something needs visual interest, use a border or a background color shift, never a gradient.

## 3. Typography Rules

### Font Family
- **Everything**: `'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Source Code Pro', Consolas, monospace`

*Forge uses a single monospace font for all text — headings, body, labels, buttons, code. There is no secondary font. This is the core design decision that defines the system.*

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display / Hero | JetBrains Mono | 48px (3rem) | 700 | 1.10 | -0.02em | All uppercase, maximum density |
| Page Title | JetBrains Mono | 36px (2.25rem) | 700 | 1.15 | -0.01em | Uppercase optional |
| Section Heading | JetBrains Mono | 28px (1.75rem) | 700 | 1.20 | normal | Section anchors |
| Sub-heading | JetBrains Mono | 22px (1.375rem) | 600 | 1.25 | normal | Feature titles |
| Sub-heading Small | JetBrains Mono | 18px (1.125rem) | 600 | 1.30 | normal | Card titles |
| Body Large | JetBrains Mono | 16px (1rem) | 400 | 1.65 | normal | Intro text, emphasis |
| Body Standard | JetBrains Mono | 14px (0.875rem) | 400 | 1.65 | normal | Default reading text |
| Body Small | JetBrains Mono | 13px (0.8125rem) | 400 | 1.55 | normal | Compact body text |
| Caption | JetBrains Mono | 12px (0.75rem) | 400 | 1.45 | 0.02em | Metadata, timestamps |
| Label | JetBrains Mono | 11px (0.6875rem) | 600 | 1.25 | 0.08em | Form labels, badges, always uppercase |
| Overline | JetBrains Mono | 10px (0.625rem) | 700 | 1.35 | 0.12em | Category markers, always uppercase |
| Button | JetBrains Mono | 13px (0.8125rem) | 600 | 1.15 | 0.04em | Button text, uppercase |
| Code | JetBrains Mono | 14px (0.875rem) | 400 | 1.65 | normal | Same as body — no visual distinction needed |

### Principles
- **One font to rule them all**: Using monospace for everything isn't just an aesthetic choice — it means every layout is grid-aligned, every column of text lines up, and the visual difference between "content" and "code" disappears. This is a developer tool; code IS the content.
- **Uppercase for structure**: Headings, labels, overlines, and buttons use uppercase to differentiate them from body text. Since you can't rely on font-family or serif/sans contrast, case transformation and weight do all the hierarchy work.
- **Dense but readable**: Body text at 14px/1.65 line-height is compact but not cramped. The monospace letterforms need more vertical space than proportional fonts, so the generous line-height compensates.
- **Weight as the only lever**: With one font family and no italics, weight (400/600/700) is the primary tool for emphasis. Use it deliberately.

## 4. Component Stylings

### Buttons

**Primary (Neon)**
- Background: Electric Green (`#00ff88`)
- Text: Void (`#0d0d0d`)
- Padding: 8px 16px
- Radius: 0px
- Border: none
- Hover: `#00cc6e` background
- Active: `#00aa5c` background
- Text: 13px/600/uppercase
- The command-execute button — bright, unmissable, sharp

**Secondary (Outlined)**
- Background: transparent
- Text: Bone (`#e8e8e8`)
- Border: `1px solid #444444`
- Padding: 8px 16px
- Radius: 0px
- Hover: `#1e1e1e` background, border becomes `#666666`
- Active: `#2a2a2a` background

**Ghost**
- Background: transparent
- Text: Cyan (`#00e5ff`)
- Border: none
- Padding: 8px 12px
- Radius: 0px
- Hover: `rgba(0, 229, 255, 0.08)` background
- Appears as an inline link-button hybrid

**Destructive**
- Background: Magenta (`#ff3388`)
- Text: Void (`#0d0d0d`)
- Padding: 8px 16px
- Radius: 0px
- Border: none
- Hover: `#dd2277` background
- For irreversible actions — delete, revoke, terminate

### Cards & Containers
- Background: Surface (`#161616`)
- Border: `1px solid #2a2a2a`
- Radius: 0px — always sharp corners
- Shadow: none — Forge doesn't use shadows. Borders handle all containment.
- Padding: 20px
- Hover: border shifts to `#444444`
- Header bar pattern: `border-bottom: 1px solid #2a2a2a` with label text in uppercase

### Inputs & Forms
- Background: Surface Inset (`#080808`)
- Text: Bone (`#e8e8e8`)
- Placeholder: Dim (`#666666`)
- Border: `1px solid #2a2a2a`
- Padding: 8px 12px
- Radius: 0px
- Focus: border becomes Electric Green (`#00ff88`), no box-shadow
- Error: border becomes Magenta (`#ff3388`)
- Label: 11px/600/uppercase, Silver (`#a0a0a0`), 4px margin-bottom
- Cursor in inputs blinks green (via `caret-color: #00ff88`)

### Navigation
- Background: Void (`#0d0d0d`)
- Border-bottom: `1px solid #2a2a2a`
- Height: 48px — compact
- Logo: "FORGE" in 16px/700/uppercase Electric Green
- Links: Silver (`#a0a0a0`), 13px/400
- Active link: Bone (`#e8e8e8`) with `border-bottom: 2px solid #00ff88`
- Hover: Bone (`#e8e8e8`)

### Image Treatment
- Border-radius: 0px — always sharp
- Border: `1px solid #2a2a2a`
- Screenshots: presented raw, no decorative chrome
- Diagrams: use the neon palette on void backgrounds

### Distinctive Components

**Terminal Output Block**
- Background: Void (`#0d0d0d`)
- Border: `1px solid #2a2a2a`
- Padding: 16px 20px
- Header: `$ command` prefix in Electric Green, output in Bone
- Line numbers optional, in Dim (`#666666`)
- Cursor: blinking block cursor in Electric Green (CSS animation)

**Status Indicator Row**
- Horizontal row of status badges
- Active/Running: Electric Green dot + text
- Pending: Amber dot + text
- Failed: Magenta dot + text
- Dots are 8px squares (not circles — no border-radius), inline with text

**Data Table**
- Border: `1px solid #2a2a2a` on all cells
- Header row: Surface (`#161616`) background, uppercase labels
- Body rows: alternating Void / Surface Inset (`#080808`)
- Hover: border-left becomes `2px solid #00ff88`
- Monospace alignment means columns naturally align without extra formatting

## 5. Layout Principles

### Spacing System
- Base unit: 4px
- Scale: 4px, 8px, 12px, 16px, 20px, 24px, 32px, 48px, 64px
- Component internal: 8-16px
- Card padding: 20px
- Section spacing: 48-64px — tighter than typical because density is a feature

### Grid & Container
- Max container width: 960px — narrower than average, optimized for readability of monospace text
- Gutter: 16px
- Common layouts: single column (docs), 2-column (split view), 3-column (dashboards)
- Sidebar: 200px fixed width when present
- No hero patterns — Forge doesn't do marketing. Content starts immediately.

### Whitespace Philosophy
- Dense by default. Forge is a tool, not a magazine — every pixel should serve a purpose. Whitespace exists for readability (line-height, padding) not for "breathing room." The void background IS the breathing room. Sections are separated by borders, not empty space.

### Border Radius Scale

| Name | Value | Usage |
|------|-------|-------|
| None | 0px | Everything. Every single element. |

That's it. Forge has no border-radius scale because Forge has no border-radius. Every corner is 90 degrees. This is non-negotiable.

## 6. Depth & Elevation

| Level | Name | Shadow | Usage |
|-------|------|--------|-------|
| 0 | Void | none | Base page level |
| 1 | Surface | none — use `background: #161616` | Cards, containers, elevated areas |
| 2 | Raised | none — use `background: #1e1e1e` | Hover states, dropdowns |
| 3 | Inset | none — use `background: #080808` | Input fields, inset areas |

Forge does not use shadows. Ever. Depth is communicated exclusively through background color shifts and borders. This is the brutalist approach: no illusion of physical depth, just explicit layering through color. A card sits on the void not because it casts a shadow but because it's a different shade of dark.

### Decorative Depth
- **Neon glow**: The closest thing to decorative depth is the occasional `text-shadow: 0 0 8px rgba(0, 255, 136, 0.5)` on hero text or active indicators. Used extremely sparingly.
- **Border emphasis**: Active elements use a brighter border (`#00ff88`) rather than elevation change.

## 7. Do's and Don'ts

### Do
- Use 0px border-radius on everything — this is the single most important visual rule
- Use monospace (`JetBrains Mono`) for all text — headings, body, labels, buttons, everything
- Use uppercase for structural text (headings, labels, buttons) to create hierarchy without font variation
- Keep the neon palette surgical — Electric Green for primary actions and active states, other neons for their semantic roles only
- Use borders (`1px solid #2a2a2a`) instead of shadows for all containment and separation
- Design for information density — minimize decorative whitespace
- Use the Status Indicator pattern (colored squares + text) for all status displays
- Let the void (`#0d0d0d`) do the visual work — most of the screen should be dark empty space

### Don't
- Don't add border-radius to anything — not even "just a little" 2px. Zero means zero.
- Don't use proportional fonts anywhere — even for marketing copy or legal text
- Don't use shadows or box-shadows (except the rare neon text-shadow on hero text)
- Don't use gradients — Forge's palette is flat. Color transitions are hard edges.
- Don't use colored backgrounds on cards — cards are always Surface (`#161616`) with borders
- Don't soften the neon colors — `#00ff88` not `#66ffaa`. Full saturation.
- Don't use illustrations, icons, or decorative imagery — text and color do all communication
- Don't add hover animations or transitions longer than 100ms — state changes should feel instant
- Don't use pure white (`#ffffff`) for text — Bone (`#e8e8e8`) is the maximum brightness
- Don't center-align body text — monospace text is always left-aligned

## 8. Responsive Behavior

### Breakpoints

| Name | Min Width | Changes |
|------|-----------|---------|
| Mobile | 0px | Single column, hamburger nav, full-width cards, 12px gutters |
| Tablet | 768px | Two-column layouts, sidebar collapses to top bar, 16px gutters |
| Desktop | 1024px | Full layout, persistent sidebar, 960px max container |

### Touch Targets
- Minimum touch target: 44x44px
- Button minimum height: 36px
- Input minimum height: 36px
- Nav links: 44px touch area
- Table rows: 40px minimum height for tap targets

### Collapsing Strategy
- Sidebar: persistent → top nav at tablet
- Data tables: horizontal scroll (never wrap or hide columns)
- Card grids: 3-col → 2-col → 1-col stack
- Terminal blocks: horizontal scroll, never wrap
- Split views: side-by-side → stacked

### Image Behavior
- Screenshots: `max-width: 100%`, horizontal scroll if needed
- Diagrams: scale down proportionally
- No responsive image art direction — content scales uniformly

## 9. Agent Prompt Guide

### Quick Color Reference
- Page background: `#0d0d0d`
- Card background: `#161616`
- Primary text: `#e8e8e8`
- Primary accent: `#00ff88`
- Secondary accent: `#00e5ff`
- Default border: `#2a2a2a`
- Warning: `#ffb300`
- Error: `#ff3388`

### Example Component Prompts

**"Build a Forge-style dashboard panel"**
> Card with `#161616` background, `1px solid #2a2a2a` border, 0px radius, 20px padding. Header: 11px uppercase label in `#a0a0a0` with `border-bottom: 1px solid #2a2a2a`. Content in 14px JetBrains Mono. Status indicators use 8px colored squares (not circles).

**"Create a Forge-style command input"**
> Full-width input on `#080808` background, `1px solid #2a2a2a` border, 0px radius. Prefix `>` in Electric Green (`#00ff88`) at 14px monospace. Text in Bone (`#e8e8e8`). Focus: border goes `#00ff88`. Caret color: `#00ff88`.

**"Design a Forge-style data table"**
> `1px solid #2a2a2a` borders on all cells. Header row: `#161616` background, 11px/600/uppercase labels. Body rows: alternating `#0d0d0d` and `#080808`. All text in JetBrains Mono 14px. Hover: left border becomes `2px solid #00ff88`. 0px radius on everything.

### Iteration Guide
1. Is border-radius 0px on literally everything?
2. Is all text in JetBrains Mono (or monospace fallback)?
3. Are headings, labels, and buttons in uppercase?
4. Are you using borders instead of shadows for depth?
5. Is the neon palette at full saturation (not muted or pastel)?
6. Is the layout dense — minimal decorative whitespace?
7. Is there zero gradient usage anywhere?
