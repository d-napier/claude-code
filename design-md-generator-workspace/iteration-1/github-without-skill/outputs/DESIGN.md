# DESIGN.md -- GitHub Primer Design System

> A design-token reference for AI coding agents building GitHub-styled interfaces.
> Format: Stitch-compatible plain-text design system.

---

## 1. Overview

GitHub's visual language is **Primer** -- a design system emphasizing clarity, density, and function. Interfaces are clean, information-rich, and built on neutral backgrounds with blue accent highlights. Typography relies on the system font stack for speed and native feel.

**Design principles:**
- Content-first: UI chrome stays minimal so code and data dominate.
- Functional color: Color conveys meaning (success, danger, warning), not decoration.
- Density without clutter: Compact layouts with generous whitespace between sections.
- Accessible by default: WCAG 2.1 AA contrast ratios on all text.

---

## 2. Color Tokens

### 2.1 Light Mode

| Token                  | Value       | Usage                                  |
|------------------------|-------------|----------------------------------------|
| `--color-canvas-default` | `#ffffff` | Page background                        |
| `--color-canvas-subtle`  | `#f6f8fa` | Secondary backgrounds, sidebars, cards |
| `--color-canvas-inset`   | `#eff2f5` | Inset panels, code blocks background   |
| `--color-border-default` | `#d1d9e0` | Default borders                        |
| `--color-border-muted`   | `#d8dee4` | Subtle dividers                        |
| `--color-fg-default`     | `#1f2328` | Primary text                           |
| `--color-fg-muted`       | `#656d76` | Secondary text, captions               |
| `--color-fg-subtle`      | `#6e7781` | Placeholder text, disabled labels      |
| `--color-accent-fg`      | `#0969da` | Links, primary actions                 |
| `--color-accent-emphasis`| `#0969da` | Primary button background              |
| `--color-accent-muted`   | `#54aeff66` | Accent background tint               |
| `--color-success-fg`     | `#1a7f37` | Success text, merged icons             |
| `--color-success-emphasis`| `#1f883d`| Success button background              |
| `--color-danger-fg`      | `#d1242f` | Error text, destructive actions        |
| `--color-danger-emphasis` | `#cf222e` | Danger button background              |
| `--color-attention-fg`   | `#9a6700` | Warning text                           |
| `--color-attention-emphasis`| `#bf8700`| Warning badge background             |
| `--color-open-fg`        | `#1a7f37` | Open issue/PR icon                     |
| `--color-closed-fg`      | `#cf222e` | Closed issue icon                      |
| `--color-done-fg`        | `#8250df` | Done/merged PR icon                    |
| `--color-neutral-emphasis`| `#6e7781`| Counter badges, neutral labels         |

### 2.2 Dark Mode

| Token                  | Value       | Usage                                  |
|------------------------|-------------|----------------------------------------|
| `--color-canvas-default` | `#0d1117` | Page background                        |
| `--color-canvas-subtle`  | `#161b22` | Secondary backgrounds, sidebars        |
| `--color-canvas-inset`   | `#010409` | Inset panels, code blocks background   |
| `--color-border-default` | `#30363d` | Default borders                        |
| `--color-border-muted`   | `#21262d` | Subtle dividers                        |
| `--color-fg-default`     | `#e6edf3` | Primary text                           |
| `--color-fg-muted`       | `#8b949e` | Secondary text                         |
| `--color-fg-subtle`      | `#6e7681` | Placeholder text                       |
| `--color-accent-fg`      | `#4493f8` | Links, primary actions                 |
| `--color-accent-emphasis`| `#1f6feb` | Primary button background              |
| `--color-accent-muted`   | `#388bfd33` | Accent background tint               |
| `--color-success-fg`     | `#3fb950` | Success text                           |
| `--color-success-emphasis`| `#238636`| Success button background              |
| `--color-danger-fg`      | `#f85149` | Error text                             |
| `--color-danger-emphasis` | `#da3633` | Danger button background              |
| `--color-attention-fg`   | `#d29922` | Warning text                           |
| `--color-attention-emphasis`| `#9e6a03`| Warning badge background             |
| `--color-open-fg`        | `#3fb950` | Open issue/PR icon                     |
| `--color-closed-fg`      | `#f85149` | Closed issue icon                      |
| `--color-done-fg`        | `#a371f7` | Done/merged PR icon                    |
| `--color-neutral-emphasis`| `#6e7681`| Counter badges                         |

---

## 3. Typography

### 3.1 Font Stack

```
--font-family-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
--font-family-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
```

### 3.2 Scale

| Token        | Size   | Weight | Line-Height | Usage                        |
|--------------|--------|--------|-------------|------------------------------|
| `--text-h1`  | 32px   | 600    | 1.25        | Page titles                  |
| `--text-h2`  | 24px   | 600    | 1.25        | Section headings             |
| `--text-h3`  | 20px   | 600    | 1.25        | Subsection headings          |
| `--text-h4`  | 16px   | 600    | 1.5         | Card titles, labels          |
| `--text-body`| 14px   | 400    | 1.5         | Body text (default)          |
| `--text-small`| 12px  | 400    | 1.5         | Captions, metadata, counters |
| `--text-mono`| 12px   | 400    | 1.45        | Code, diffs, terminal output |

### 3.3 Weight Tokens

| Token           | Value | Usage                          |
|-----------------|-------|--------------------------------|
| `--font-light`  | 300   | Large display text (rare)      |
| `--font-normal` | 400   | Body text                      |
| `--font-medium` | 500   | Emphasized body, nav items     |
| `--font-semibold`| 600  | Headings, button labels        |
| `--font-bold`   | 700   | Strong emphasis (rare)         |

---

## 4. Spacing

GitHub uses a 4px base unit with an 8px grid system.

| Token    | Value | Usage                                     |
|----------|-------|-------------------------------------------|
| `--s-0`  | 0     | No spacing                                |
| `--s-1`  | 4px   | Tight: icon-to-label gap                  |
| `--s-2`  | 8px   | Compact: inline element gaps              |
| `--s-3`  | 16px  | Default: padding inside cards, form gaps  |
| `--s-4`  | 24px  | Comfortable: section padding              |
| `--s-5`  | 32px  | Spacious: between major page sections     |
| `--s-6`  | 40px  | Extra: page-level vertical rhythm         |
| `--s-7`  | 48px  | Page top/bottom margins                   |
| `--s-8`  | 64px  | Hero section padding                      |

---

## 5. Layout

### 5.1 Container Widths

| Token              | Value   | Usage                        |
|--------------------|---------|------------------------------|
| `--width-sm`       | 544px   | Narrow modals, dropdowns     |
| `--width-md`       | 768px   | Settings pages               |
| `--width-lg`       | 1012px  | Repository content area      |
| `--width-xl`       | 1280px  | Full-width page container    |

### 5.2 Common Layouts

- **Repository page**: Sidebar (296px) + Main content (fluid, max 1012px). Sidebar collapses below `768px`.
- **Settings page**: Vertical nav (220px) + Content area (max 768px), centered.
- **Feed/timeline**: Single column, max 1012px, centered with `--s-4` horizontal padding.
- **Header**: Full-width, 64px tall, dark background (`#24292f` light / `#161b22` dark).

### 5.3 Breakpoints

| Token    | Value  | Description          |
|----------|--------|----------------------|
| `--bp-sm`| 544px  | Small phones         |
| `--bp-md`| 768px  | Tablets              |
| `--bp-lg`| 1012px | Small desktops       |
| `--bp-xl`| 1280px | Large desktops       |

---

## 6. Component Patterns

### 6.1 Buttons

| Variant    | Background              | Text Color    | Border                  |
|------------|-------------------------|---------------|-------------------------|
| Primary    | `--color-accent-emphasis` | `#ffffff`    | transparent             |
| Default    | `--color-canvas-subtle`  | `--color-fg-default` | `--color-border-default` |
| Danger     | `--color-danger-emphasis` | `#ffffff`    | transparent             |
| Outline    | transparent             | `--color-accent-fg` | `--color-accent-fg`     |
| Invisible  | transparent             | `--color-accent-fg` | none                    |

**Shared properties:**
- Height: 32px (medium), 28px (small)
- Padding: 12px 16px (medium), 8px 12px (small)
- Border-radius: 6px
- Font-size: 14px, weight 500
- Hover: darken background by 5-10%
- Disabled: opacity 0.5, cursor not-allowed

### 6.2 Inputs

- Height: 32px
- Padding: 5px 12px
- Border: 1px solid `--color-border-default`
- Border-radius: 6px
- Background: `--color-canvas-default`
- Font-size: 14px
- Focus: border-color `--color-accent-fg`, box-shadow `0 0 0 3px var(--color-accent-muted)`

### 6.3 Cards / Boxes

- Background: `--color-canvas-default`
- Border: 1px solid `--color-border-default`
- Border-radius: 6px
- Padding: 16px
- No drop shadow (GitHub avoids shadows in favor of borders)

### 6.4 Labels / Badges

- Font-size: 12px, weight 500
- Padding: 0 7px
- Height: 20px
- Border-radius: 10px (pill shape)
- Background: varies by semantic color
- Text: white on emphasis backgrounds, or colored text on muted backgrounds

### 6.5 Navigation Tabs

- **UnderlineNav**: Bottom border 2px on active tab, color `--color-accent-fg`
- Tab padding: 8px 16px
- Font-size: 14px
- Inactive: `--color-fg-muted`, no underline
- Hover: `--color-fg-default`, light gray bottom border

### 6.6 Avatars

| Size    | Pixels | Usage               |
|---------|--------|---------------------|
| Small   | 20px   | Inline mentions      |
| Medium  | 32px   | Comment headers      |
| Large   | 48px   | Profile cards        |
| XLarge  | 96px   | Profile pages        |

- Shape: circle (border-radius 50%)
- Border: none by default; 1px `--color-border-muted` on white backgrounds

### 6.7 Flash / Alerts

| Type    | Background   | Border-left       | Icon color               |
|---------|--------------|--------------------|--------------------------|
| Info    | `#ddf4ff`    | 3px `--color-accent-fg` | `--color-accent-fg` |
| Success | `#dafbe1`    | 3px `--color-success-fg`| `--color-success-fg`|
| Warning | `#fff8c5`    | 3px `--color-attention-fg`| `--color-attention-fg`|
| Danger  | `#ffebe9`    | 3px `--color-danger-fg` | `--color-danger-fg` |

---

## 7. Iconography

- Icon set: **Octicons** (GitHub's custom icon library)
- Default size: 16px
- Stroke: 1.5px
- Color: inherits from text color (`currentColor`)
- Alignment: vertically centered with adjacent text

---

## 8. Borders & Radii

| Token                  | Value | Usage                          |
|------------------------|-------|--------------------------------|
| `--border-width`       | 1px   | Default border width           |
| `--border-thick`       | 2px   | Active tab underline, focus    |
| `--radius-sm`          | 3px   | Small elements, inline code    |
| `--radius-md`          | 6px   | Buttons, inputs, cards         |
| `--radius-lg`          | 12px  | Modals, large containers       |
| `--radius-full`        | 9999px| Pills, avatars                 |

---

## 9. Shadows

GitHub uses shadows sparingly. Borders are preferred over shadows.

| Token               | Value                                      | Usage           |
|----------------------|--------------------------------------------|-----------------|
| `--shadow-sm`        | `0 1px 0 rgba(31,35,40,0.04)`             | Buttons         |
| `--shadow-md`        | `0 3px 6px rgba(140,149,159,0.15)`        | Dropdowns       |
| `--shadow-lg`        | `0 8px 24px rgba(140,149,159,0.2)`        | Modals, dialogs |
| `--shadow-xl`        | `0 12px 28px rgba(140,149,159,0.3)`       | Popovers        |

---

## 10. Motion

| Token                | Value              | Usage                          |
|----------------------|--------------------|--------------------------------|
| `--duration-fast`    | 80ms               | Hover state transitions        |
| `--duration-normal`  | 150ms              | Expand/collapse, tab switches  |
| `--duration-slow`    | 300ms              | Modal open/close               |
| `--easing-default`   | `ease-in-out`      | Most transitions               |
| `--easing-decelerate`| `cubic-bezier(0.25, 1, 0.5, 1)` | Enter animations |

---

## 11. Z-Index Scale

| Token          | Value | Usage                    |
|----------------|-------|--------------------------|
| `--z-dropdown` | 100   | Dropdown menus           |
| `--z-sticky`   | 200   | Sticky headers           |
| `--z-overlay`  | 300   | Overlay backgrounds      |
| `--z-modal`    | 400   | Modal dialogs            |
| `--z-toast`    | 500   | Toast notifications      |
| `--z-tooltip`  | 600   | Tooltips                 |

---

## 12. Accessibility Notes

- All interactive elements must have visible focus indicators (3px accent ring).
- Minimum contrast ratio: 4.5:1 for normal text, 3:1 for large text.
- Use `aria-label` on icon-only buttons.
- Keyboard navigation: all interactive elements reachable via Tab; Escape closes modals/dropdowns.
- Reduced motion: respect `prefers-reduced-motion` by disabling transitions.

---

## 13. File Manifest

| File              | Description                                |
|-------------------|--------------------------------------------|
| `DESIGN.md`       | This file -- full design token reference   |
| `preview.html`    | Light mode component preview               |
| `preview-dark.html`| Dark mode component preview               |
