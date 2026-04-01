# DESIGN.md -- Forge

> A brutalist dark-mode design system for developer tools.
> Monospace everything. High contrast. No mercy.

---

## 1. Design Philosophy

Forge is a terminal that escaped into the browser. Every surface is flat, every edge is sharp, every pixel is deliberate. There are no rounded corners. There is no decoration that does not serve a purpose. The aesthetic is brutalist: raw, exposed structure, unapologetic contrast, and neon accents that cut through near-black backgrounds like cursor blips in a void.

### Principles

- **Terminal-native**: Everything looks like it belongs in a terminal. Monospace is the only typeface. Hierarchy comes from weight, size, and color -- never from font variety.
- **High contrast**: Text is always legible. Neon on near-black. White on charcoal. Never muddy, never subtle.
- **Sharp edges**: Border-radius is always 0. Squares and rectangles only. No pills, no circles, no soft anything.
- **Minimal decoration**: No shadows, no gradients, no background images. Borders are 1px solid. That is the decoration.
- **Density over whitespace**: Information-dense layouts. Developers want data, not breathing room.

---

## 2. Color Tokens

All backgrounds are near-black. All accents are neon. There is no light mode.

### Backgrounds

| Token                    | Value       | Usage                          |
|--------------------------|-------------|--------------------------------|
| `--bg-void`              | `#0a0a0a`   | Page background, deepest layer |
| `--bg-surface`           | `#111111`   | Cards, panels, containers      |
| `--bg-elevated`          | `#1a1a1a`   | Modals, dropdowns, popovers    |
| `--bg-input`             | `#0d0d0d`   | Input fields, text areas       |
| `--bg-hover`             | `#1f1f1f`   | Hover state for interactive    |
| `--bg-active`            | `#252525`   | Active/pressed state           |

### Foreground

| Token                    | Value       | Usage                          |
|--------------------------|-------------|--------------------------------|
| `--fg-primary`           | `#e0e0e0`   | Primary text                   |
| `--fg-secondary`         | `#888888`   | Secondary text, labels         |
| `--fg-muted`             | `#555555`   | Disabled, placeholder          |
| `--fg-inverse`           | `#0a0a0a`   | Text on neon backgrounds       |

### Neon Accents

| Token                    | Value       | Usage                          |
|--------------------------|-------------|--------------------------------|
| `--accent-green`         | `#00ff88`   | Success, primary actions, links|
| `--accent-cyan`          | `#00e5ff`   | Info, secondary actions        |
| `--accent-magenta`       | `#ff00aa`   | Errors, destructive actions    |
| `--accent-yellow`        | `#ffdd00`   | Warnings, highlights           |
| `--accent-orange`        | `#ff6600`   | Badges, notifications          |
| `--accent-white`         | `#ffffff`   | Emphasis, active indicators    |

### Borders

| Token                    | Value       | Usage                          |
|--------------------------|-------------|--------------------------------|
| `--border-default`       | `#2a2a2a`   | Default borders                |
| `--border-focus`         | `#00ff88`   | Focus rings                    |
| `--border-error`         | `#ff00aa`   | Error state borders            |

---

## 3. Typography

One typeface. Monospace. Forever.

### Font Stack

```
--font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', 'Cascadia Code', 'Consolas', monospace;
```

All text uses `--font-mono`. There are no serif or sans-serif fonts in this system.

### Scale

| Token              | Size     | Line Height | Weight | Usage                    |
|--------------------|----------|-------------|--------|--------------------------|
| `--text-xs`        | `11px`   | `16px`      | 400    | Captions, metadata       |
| `--text-sm`        | `13px`   | `20px`      | 400    | Secondary text, labels   |
| `--text-base`      | `14px`   | `22px`      | 400    | Body text, default       |
| `--text-md`        | `16px`   | `24px`      | 500    | Subheadings              |
| `--text-lg`        | `20px`   | `28px`      | 600    | Section headings         |
| `--text-xl`        | `28px`   | `36px`      | 700    | Page titles              |
| `--text-2xl`       | `40px`   | `48px`      | 800    | Hero text                |

### Rules

- Letter-spacing: `0.02em` on all text.
- Text-transform: `uppercase` on labels, badges, and section headers.
- No italic. Use `--accent-cyan` color to denote emphasis instead.
- Code blocks use the same font (everything is already monospace) but get a `--bg-input` background and `1px solid --border-default` border.

---

## 4. Spacing

An 8px base grid. Tight but consistent.

| Token              | Value    | Usage                          |
|--------------------|----------|--------------------------------|
| `--space-1`        | `4px`    | Inline padding, tight gaps     |
| `--space-2`        | `8px`    | Default gap, input padding     |
| `--space-3`        | `12px`   | Card padding (small)           |
| `--space-4`        | `16px`   | Card padding (default)         |
| `--space-5`        | `24px`   | Section gaps                   |
| `--space-6`        | `32px`   | Page section margins           |
| `--space-8`        | `48px`   | Major section breaks           |
| `--space-10`       | `64px`   | Page-level top/bottom padding  |

---

## 5. Borders & Edges

No rounded corners. No exceptions.

```
--radius: 0;
--border-width: 1px;
--border-style: solid;
```

### Border Patterns

- **Default border**: `1px solid var(--border-default)`
- **Focus border**: `1px solid var(--accent-green)` -- replaces outlines
- **Error border**: `1px solid var(--accent-magenta)`
- **Dividers**: `1px solid var(--border-default)` -- horizontal rules between sections
- **No box-shadow**. Ever. Use borders or background color changes for elevation.

---

## 6. Components

### 6.1 Buttons

```
Primary:
  background: var(--accent-green)
  color: var(--fg-inverse)
  border: none
  padding: var(--space-2) var(--space-4)
  font: var(--text-sm), uppercase, weight 600
  cursor: pointer

  :hover -> background: #00cc6e
  :active -> background: #00aa5a

Secondary:
  background: transparent
  color: var(--fg-primary)
  border: 1px solid var(--border-default)
  padding: var(--space-2) var(--space-4)
  font: var(--text-sm), uppercase, weight 600

  :hover -> border-color: var(--fg-primary)
  :active -> background: var(--bg-active)

Destructive:
  background: var(--accent-magenta)
  color: var(--fg-inverse)
  border: none
  padding: var(--space-2) var(--space-4)
  font: var(--text-sm), uppercase, weight 600

  :hover -> background: #cc0088
  :active -> background: #aa0070

Ghost:
  background: transparent
  color: var(--fg-secondary)
  border: none
  padding: var(--space-2) var(--space-4)
  font: var(--text-sm), uppercase, weight 600

  :hover -> color: var(--fg-primary)
```

### 6.2 Inputs

```
Text Input:
  background: var(--bg-input)
  color: var(--fg-primary)
  border: 1px solid var(--border-default)
  padding: var(--space-2) var(--space-3)
  font: var(--text-base), monospace
  caret-color: var(--accent-green)

  ::placeholder -> color: var(--fg-muted)
  :focus -> border-color: var(--accent-green)

Textarea:
  Same as text input but min-height: 120px
  resize: vertical

Select:
  Same border/background as text input
  Custom arrow indicator using --fg-secondary
```

### 6.3 Cards / Panels

```
Panel:
  background: var(--bg-surface)
  border: 1px solid var(--border-default)
  padding: var(--space-4)
  border-radius: 0

Panel Header:
  border-bottom: 1px solid var(--border-default)
  padding-bottom: var(--space-3)
  margin-bottom: var(--space-3)
  font: var(--text-sm), uppercase, color: var(--fg-secondary)
```

### 6.4 Tables

```
Table:
  width: 100%
  border-collapse: collapse
  font: var(--text-sm)

  th:
    text-align: left
    color: var(--fg-secondary)
    text-transform: uppercase
    font-weight: 600
    padding: var(--space-2) var(--space-3)
    border-bottom: 1px solid var(--border-default)

  td:
    padding: var(--space-2) var(--space-3)
    border-bottom: 1px solid var(--border-default)
    color: var(--fg-primary)

  tr:hover:
    background: var(--bg-hover)
```

### 6.5 Badges / Tags

```
Badge:
  display: inline-block
  padding: var(--space-1) var(--space-2)
  font: var(--text-xs), uppercase, weight 700
  border: 1px solid currentColor
  background: transparent

  Variants by color:
    success -> color: var(--accent-green)
    info    -> color: var(--accent-cyan)
    warning -> color: var(--accent-yellow)
    error   -> color: var(--accent-magenta)
    neutral -> color: var(--fg-secondary)
```

### 6.6 Navigation / Tabs

```
Tab Bar:
  border-bottom: 1px solid var(--border-default)
  display: flex
  gap: 0

Tab:
  padding: var(--space-2) var(--space-4)
  font: var(--text-sm), uppercase
  color: var(--fg-secondary)
  border-bottom: 2px solid transparent
  cursor: pointer

  :hover -> color: var(--fg-primary)
  [active] -> color: var(--accent-green), border-bottom-color: var(--accent-green)
```

### 6.7 Terminal / Code Blocks

```
Terminal Block:
  background: var(--bg-void)
  border: 1px solid var(--border-default)
  padding: var(--space-4)
  font: var(--text-sm), monospace
  color: var(--fg-primary)
  overflow-x: auto

  Prompt prefix: color: var(--accent-green), content: "$ "
  Output text: color: var(--fg-secondary)
  Error text: color: var(--accent-magenta)
```

### 6.8 Tooltips / Popovers

```
Tooltip:
  background: var(--bg-elevated)
  color: var(--fg-primary)
  border: 1px solid var(--border-default)
  padding: var(--space-1) var(--space-2)
  font: var(--text-xs)
  max-width: 240px
  border-radius: 0
```

### 6.9 Status Indicators

```
Status Dot:
  width: 8px
  height: 8px
  display: inline-block (square, not circle)
  border-radius: 0

  online  -> background: var(--accent-green)
  warning -> background: var(--accent-yellow)
  error   -> background: var(--accent-magenta)
  offline -> background: var(--fg-muted)
```

---

## 7. Iconography

No icon library. Use ASCII/Unicode characters where icons are needed:

| Purpose       | Character  |
|---------------|------------|
| Close         | `x`        |
| Menu          | `===`      |
| Arrow right   | `-->`      |
| Arrow left    | `<--`      |
| Expand        | `[+]`      |
| Collapse      | `[-]`      |
| Check         | `[x]`      |
| Unchecked     | `[ ]`      |
| Warning       | `/!\`      |
| Info          | `(i)`      |
| Loading       | `...`      |
| Separator     | `|`        |

---

## 8. Motion & Animation

Minimal. Functional only.

```
--transition-fast: 80ms ease-out;
--transition-default: 150ms ease-out;
```

- Use `--transition-fast` for color and border changes (hover, focus).
- Use `--transition-default` for layout changes (expand/collapse).
- No easing curves beyond `ease-out`.
- No decorative animations. No bouncing. No sliding. No fading.
- Cursor blink animation allowed on active input carets only.

---

## 9. Layout Patterns

### Page Structure

```
[HEADER BAR -- 48px height, bg-surface, bottom border]
[SIDEBAR -- 240px width, bg-surface, right border | MAIN CONTENT -- flexible]
[STATUS BAR -- 28px height, bg-surface, top border, text-xs]
```

### Grid

- Use CSS Grid for page-level layout.
- Use Flexbox for component-level alignment.
- Column gap: `var(--space-4)`
- Row gap: `var(--space-3)`

### Responsive

- Sidebar collapses below 768px.
- Minimum content width: 320px.
- No breakpoint above 1440px -- content maxes out, extra space stays void-black.

---

## 10. Do / Don't

### DO

- Use monospace for everything
- Keep borders at 1px
- Use neon accents sparingly -- they are for signaling, not decorating
- Maintain high contrast ratios (minimum 7:1 for body text)
- Use uppercase for labels, navigation, and badges
- Prefix terminal-style prompts with `$` or `>`

### DON'T

- Use border-radius (ever)
- Use box-shadow (ever)
- Use gradients
- Use more than one typeface
- Use emoji in the UI
- Use light backgrounds
- Add decorative elements that serve no function
- Use smooth, playful, or friendly language in the UI -- be terse and direct

---

## 11. Sample CSS Custom Properties

```css
:root {
  /* Backgrounds */
  --bg-void: #0a0a0a;
  --bg-surface: #111111;
  --bg-elevated: #1a1a1a;
  --bg-input: #0d0d0d;
  --bg-hover: #1f1f1f;
  --bg-active: #252525;

  /* Foreground */
  --fg-primary: #e0e0e0;
  --fg-secondary: #888888;
  --fg-muted: #555555;
  --fg-inverse: #0a0a0a;

  /* Accents */
  --accent-green: #00ff88;
  --accent-cyan: #00e5ff;
  --accent-magenta: #ff00aa;
  --accent-yellow: #ffdd00;
  --accent-orange: #ff6600;
  --accent-white: #ffffff;

  /* Borders */
  --border-default: #2a2a2a;
  --border-focus: #00ff88;
  --border-error: #ff00aa;

  /* Typography */
  --font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', 'Cascadia Code', 'Consolas', monospace;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-8: 48px;
  --space-10: 64px;

  /* Motion */
  --transition-fast: 80ms ease-out;
  --transition-default: 150ms ease-out;

  /* Borders */
  --radius: 0;
  --border-width: 1px;
}
```

---

*FORGE -- built to ship, not to decorate.*
