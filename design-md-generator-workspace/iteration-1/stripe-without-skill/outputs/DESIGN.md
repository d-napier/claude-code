# DESIGN.md — Stripe

> A plain-text design system reference for AI coding agents to produce consistent Stripe-branded UI.

---

## 1. Brand Personality

Stripe's brand personality is **precise, confident, and developer-friendly**. The visual identity conveys trust through clean geometry, generous whitespace, and a sophisticated color palette that balances professionalism with approachability. Stripe positions itself as the infrastructure layer for internet commerce — technical yet accessible, powerful yet simple.

**Voice & Tone:**
- Clear and direct; avoid jargon unless speaking to developers
- Confident but not arrogant
- Technically precise without being cold
- Forward-looking and optimistic

**Core Brand Values:**
- Simplicity in complexity
- Meticulous craft and attention to detail
- Global scale with local care
- Developer empowerment

---

## 2. Colors

### Primary Palette

| Token                  | Hex       | RGB              | Usage                              |
|------------------------|-----------|------------------|------------------------------------|
| `--color-primary`      | `#635BFF` | `99, 91, 255`    | Primary brand purple (Blurple)     |
| `--color-primary-dark` | `#4B45C6` | `75, 69, 198`    | Hover/active state for primary     |
| `--color-primary-light`| `#7A73FF` | `122, 115, 255`  | Light variant for highlights       |

### Secondary / Accent Colors

| Token                     | Hex       | RGB              | Usage                              |
|---------------------------|-----------|------------------|------------------------------------|
| `--color-cyan`            | `#00D4AA` | `0, 212, 170`    | Success, positive states           |
| `--color-blue`            | `#0A2540` | `10, 37, 64`     | Dark navy, primary text on light   |
| `--color-yellow`          | `#FFD60A` | `255, 214, 10`   | Warnings, highlights               |
| `--color-pink`            | `#FF6059` | `255, 96, 89`    | Errors, destructive actions        |

### Neutral Palette

| Token                       | Hex       | RGB              | Usage                              |
|-----------------------------|-----------|------------------|------------------------------------|
| `--color-neutral-900`       | `#0A2540` | `10, 37, 64`     | Headings, primary text             |
| `--color-neutral-700`       | `#425466` | `66, 84, 102`    | Body text                          |
| `--color-neutral-500`       | `#697386` | `105, 115, 134`  | Secondary text, captions           |
| `--color-neutral-300`       | `#A3ACB9` | `163, 172, 185`  | Borders, dividers                  |
| `--color-neutral-200`       | `#E3E8EE` | `227, 232, 238`  | Light borders, subtle dividers     |
| `--color-neutral-100`       | `#F6F9FC` | `246, 249, 252`  | Background tint, cards             |
| `--color-neutral-50`        | `#FFFFFF` | `255, 255, 255`  | Page background                    |

### Gradient Palette

| Token                      | Value                                              | Usage                    |
|----------------------------|----------------------------------------------------|--------------------------|
| `--gradient-brand`         | `linear-gradient(135deg, #635BFF 0%, #00D4AA 100%)`| Hero sections, CTAs      |
| `--gradient-mesh`          | `radial-gradient(at 40% 20%, #635BFF 0%, transparent 50%), radial-gradient(at 80% 80%, #00D4AA 0%, transparent 50%)` | Decorative backgrounds |
| `--gradient-dark`          | `linear-gradient(180deg, #0A2540 0%, #1B3A5C 100%)`| Dark section backgrounds |

### Dark Mode Palette

| Token                       | Hex       | Usage                              |
|-----------------------------|-----------|-------------------------------------|
| `--dark-bg`                 | `#0A2540` | Page background                     |
| `--dark-surface`            | `#1B3A5C` | Card/surface background             |
| `--dark-surface-elevated`   | `#243B53` | Elevated surface (modals, dropdowns)|
| `--dark-text-primary`       | `#FFFFFF` | Primary text                        |
| `--dark-text-secondary`     | `#A3ACB9` | Secondary text                      |
| `--dark-border`             | `#2D4A63` | Borders                             |

---

## 3. Typography

### Font Stack

| Token              | Value                                              | Usage            |
|--------------------|----------------------------------------------------|------------------|
| `--font-primary`   | `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` | All UI text |
| `--font-mono`      | `'JetBrains Mono', 'SF Mono', 'Fira Code', monospace` | Code samples |

### Type Scale

| Token           | Size   | Weight | Line Height | Letter Spacing | Usage              |
|-----------------|--------|--------|-------------|----------------|--------------------|
| `--text-hero`   | 64px   | 700    | 1.1         | -0.02em        | Hero headlines     |
| `--text-h1`     | 48px   | 700    | 1.15        | -0.02em        | Page titles        |
| `--text-h2`     | 36px   | 600    | 1.2         | -0.01em        | Section headings   |
| `--text-h3`     | 28px   | 600    | 1.3         | -0.01em        | Sub-section heads  |
| `--text-h4`     | 22px   | 600    | 1.35        | 0              | Card titles        |
| `--text-body-lg`| 18px   | 400    | 1.6         | 0              | Large body text    |
| `--text-body`   | 16px   | 400    | 1.6         | 0              | Default body text  |
| `--text-body-sm`| 14px   | 400    | 1.5         | 0              | Small text, labels |
| `--text-caption`| 12px   | 500    | 1.5         | 0.02em         | Captions, metadata |
| `--text-code`   | 14px   | 400    | 1.6         | 0              | Inline/block code  |

### Font Weight Tokens

| Token              | Value | Usage                          |
|--------------------|-------|--------------------------------|
| `--weight-regular` | 400   | Body text                      |
| `--weight-medium`  | 500   | Labels, captions, emphasis     |
| `--weight-semibold`| 600   | Subheadings, buttons           |
| `--weight-bold`    | 700   | Headlines                      |

---

## 4. Spacing & Layout

### Spacing Scale

| Token           | Value | Usage                          |
|-----------------|-------|--------------------------------|
| `--space-1`     | 4px   | Tight inner padding            |
| `--space-2`     | 8px   | Icon gaps, compact padding     |
| `--space-3`     | 12px  | Small element spacing          |
| `--space-4`     | 16px  | Default inner padding          |
| `--space-5`     | 24px  | Card padding, form gaps        |
| `--space-6`     | 32px  | Section inner spacing          |
| `--space-8`     | 48px  | Large section gaps             |
| `--space-10`    | 64px  | Section vertical padding       |
| `--space-12`    | 80px  | Major section breaks           |
| `--space-16`    | 128px | Hero/footer vertical padding   |

### Layout

| Token                  | Value   | Usage                         |
|------------------------|---------|-------------------------------|
| `--max-width-content`  | 1080px  | Main content max-width        |
| `--max-width-wide`     | 1280px  | Wide layout sections          |
| `--max-width-narrow`   | 680px   | Text-heavy content            |
| `--grid-columns`       | 12      | Grid column count             |
| `--grid-gutter`        | 24px    | Grid gutter width             |

### Breakpoints

| Token              | Value   | Usage                         |
|--------------------|---------|-------------------------------|
| `--bp-mobile`      | 480px   | Small phones                  |
| `--bp-tablet`      | 768px   | Tablets                       |
| `--bp-desktop`     | 1024px  | Desktop                       |
| `--bp-wide`        | 1280px  | Wide desktop                  |

---

## 5. Borders & Radii

| Token                     | Value                 | Usage                              |
|---------------------------|-----------------------|------------------------------------|
| `--radius-sm`             | 6px                   | Buttons, inputs, small cards       |
| `--radius-md`             | 8px                   | Cards, containers                  |
| `--radius-lg`             | 12px                  | Modals, large cards                |
| `--radius-xl`             | 16px                  | Hero cards, feature panels         |
| `--radius-full`           | 9999px                | Pills, avatars, badges             |
| `--border-default`        | `1px solid #E3E8EE`  | Default border                     |
| `--border-focus`          | `2px solid #635BFF`  | Focus ring                         |
| `--border-dark`           | `1px solid #2D4A63`  | Dark mode border                   |

---

## 6. Shadows & Elevation

| Token                    | Value                                                            | Usage                    |
|--------------------------|------------------------------------------------------------------|--------------------------|
| `--shadow-sm`            | `0 1px 3px rgba(10,37,64,0.08)`                                 | Subtle lift (inputs)     |
| `--shadow-md`            | `0 4px 12px rgba(10,37,64,0.08)`                                | Cards, dropdowns         |
| `--shadow-lg`            | `0 8px 24px rgba(10,37,64,0.12)`                                | Modals, popovers         |
| `--shadow-xl`            | `0 16px 48px rgba(10,37,64,0.16)`                               | Hero cards, dialogs      |
| `--shadow-primary`       | `0 4px 12px rgba(99,91,255,0.3)`                                | Primary button glow      |
| `--shadow-dark-sm`       | `0 1px 3px rgba(0,0,0,0.3)`                                     | Dark mode subtle lift    |
| `--shadow-dark-md`       | `0 4px 12px rgba(0,0,0,0.4)`                                    | Dark mode cards          |

---

## 7. Component Specs

### Buttons

**Primary Button:**
```
background: var(--color-primary)
color: #FFFFFF
padding: 10px 20px
border-radius: var(--radius-sm)
font-size: var(--text-body)
font-weight: var(--weight-semibold)
box-shadow: var(--shadow-primary)
hover: background var(--color-primary-dark), transform translateY(-1px)
active: transform translateY(0)
transition: all 150ms ease
```

**Secondary Button:**
```
background: transparent
color: var(--color-primary)
border: 1px solid var(--color-primary)
padding: 10px 20px
border-radius: var(--radius-sm)
font-weight: var(--weight-semibold)
hover: background rgba(99,91,255,0.06)
```

**Ghost Button:**
```
background: transparent
color: var(--color-neutral-700)
padding: 10px 20px
border-radius: var(--radius-sm)
font-weight: var(--weight-medium)
hover: background var(--color-neutral-100)
```

**Button Sizes:**
| Size   | Padding      | Font Size |
|--------|-------------|-----------|
| Small  | 6px 12px    | 14px      |
| Medium | 10px 20px   | 16px      |
| Large  | 14px 28px   | 18px      |

### Cards

```
background: var(--color-neutral-50)
border: var(--border-default)
border-radius: var(--radius-md)
padding: var(--space-5)
box-shadow: var(--shadow-sm)
hover: box-shadow var(--shadow-md), transform translateY(-2px)
transition: all 200ms ease
```

**Dark Mode Card:**
```
background: var(--dark-surface)
border: var(--border-dark)
box-shadow: var(--shadow-dark-sm)
```

### Inputs

```
background: #FFFFFF
border: 1px solid var(--color-neutral-300)
border-radius: var(--radius-sm)
padding: 10px 14px
font-size: var(--text-body)
color: var(--color-neutral-900)
focus: border-color var(--color-primary), box-shadow 0 0 0 3px rgba(99,91,255,0.15)
placeholder-color: var(--color-neutral-500)
transition: border-color 150ms ease, box-shadow 150ms ease
```

### Navigation Bar

```
background: rgba(255,255,255,0.95)
backdrop-filter: blur(12px)
border-bottom: 1px solid var(--color-neutral-200)
height: 64px
padding: 0 var(--space-5)
position: sticky
top: 0
z-index: 100
```

### Badges / Pills

```
display: inline-flex
align-items: center
padding: 2px 10px
border-radius: var(--radius-full)
font-size: var(--text-caption)
font-weight: var(--weight-medium)
```

| Variant   | Background              | Color                   |
|-----------|-------------------------|-------------------------|
| Default   | `var(--color-neutral-100)` | `var(--color-neutral-700)` |
| Primary   | `rgba(99,91,255,0.1)`   | `var(--color-primary)`  |
| Success   | `rgba(0,212,170,0.1)`   | `#00A67E`               |
| Warning   | `rgba(255,214,10,0.1)`  | `#B8860B`               |
| Error     | `rgba(255,96,89,0.1)`   | `var(--color-pink)`     |

### Code Blocks

```
background: var(--color-neutral-900)
color: #E3E8EE
border-radius: var(--radius-md)
padding: var(--space-5)
font-family: var(--font-mono)
font-size: var(--text-code)
line-height: 1.6
overflow-x: auto
```

**Syntax Highlighting Tokens:**
| Token     | Color     |
|-----------|-----------|
| Keyword   | `#FF6059` |
| String    | `#00D4AA` |
| Comment   | `#697386` |
| Function  | `#635BFF` |
| Number    | `#FFD60A` |
| Operator  | `#A3ACB9` |

---

## 8. Iconography & Imagery

### Icons

- **Style:** Outlined, 1.5px stroke weight, rounded caps and joins
- **Default Size:** 24x24px (with 20x20 and 16x16 variants)
- **Color:** Inherits current text color via `currentColor`
- **Grid:** Icons designed on a 24px grid with 2px padding
- **Library:** Use Lucide Icons or similar geometric outline icon set

### Imagery Guidelines

- **Photography:** Avoid stock photography; prefer abstract gradients, geometric patterns, and product screenshots
- **Illustrations:** Use clean, minimal geometric shapes with the brand color palette
- **Mesh Gradients:** Stripe heavily uses animated mesh gradients as decorative hero backgrounds using the brand purple, cyan, and blue palette
- **Code Screenshots:** Frequently used to demonstrate developer experience; render with the dark code block styling above
- **Aspect Ratios:** Product images at 16:9 or 4:3; icons always square

---

## 9. Motion & Interaction

### Timing

| Token                   | Value   | Usage                              |
|-------------------------|---------|------------------------------------|
| `--duration-fast`       | 100ms   | Micro-interactions (hover color)   |
| `--duration-normal`     | 200ms   | Standard transitions               |
| `--duration-slow`       | 350ms   | Layout shifts, modals              |
| `--duration-entrance`   | 500ms   | Page entrance animations           |

### Easing

| Token                   | Value                        | Usage                    |
|-------------------------|------------------------------|--------------------------|
| `--ease-default`        | `cubic-bezier(0.25, 0.1, 0.25, 1)` | General purpose   |
| `--ease-out`            | `cubic-bezier(0, 0, 0.25, 1)`      | Elements entering  |
| `--ease-in-out`         | `cubic-bezier(0.42, 0, 0.58, 1)`   | Symmetric motions  |
| `--ease-spring`         | `cubic-bezier(0.34, 1.56, 0.64, 1)`| Playful bounces    |

### Interaction Patterns

- **Hover lift:** Cards and buttons translate Y by -1px to -2px with increased shadow
- **Focus rings:** 3px spread box-shadow in primary color at 15% opacity
- **Page transitions:** Fade in from opacity 0 to 1 over `--duration-entrance`
- **Staggered lists:** Items enter with 50ms delay between each, fading up from 20px below
- **Scroll reveals:** Sections fade in and translate up as they enter the viewport
- **Button press:** Scale to 0.98 on active state
- **Loading states:** Pulse animation on skeleton placeholders using neutral-200 to neutral-100

### Reduced Motion

When `prefers-reduced-motion: reduce` is active:
- Disable all transform-based animations
- Keep opacity transitions but reduce duration to 100ms
- Replace slide animations with simple fades

---

*Generated for AI coding agents. Reference these tokens and specs to produce Stripe-consistent UI without guesswork.*
