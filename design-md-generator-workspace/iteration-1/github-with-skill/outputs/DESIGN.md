# Design System: GitHub (Primer)

## 1. Visual Theme & Atmosphere

GitHub's design is a workbench disguised as a website — functional, unadorned, and optimized for the daily rhythms of software development. Built on Primer, GitHub's open-source design system, the interface prioritizes scan-ability and utility over visual flair. The canvas is a clean white (`#ffffff`) with muted gray surfaces (`#f6f8fa`) that recede behind content, and the singular brand blue (`#0969da`) appears only when something demands your attention: a link, a primary action, a selected state.

The system font stack loads instantly and looks native on every platform. Typography is restrained — one weight for body, one for emphasis, no decorative choices. Every element exists because a developer needs it at 2am while triaging issues. The aesthetic is "invisible infrastructure": when GitHub's design is working, you don't notice it at all.

**Key Characteristics:**
- Clean white canvas (`#ffffff`) with muted gray (`#f6f8fa`) surfaces — deliberately invisible backgrounds
- System font stack (`-apple-system, BlinkMacSystemFont, Segoe UI`) — zero loading cost, native feel
- Single brand accent: GitHub Blue (`#0969da`) for links and primary actions only
- Muted, functional color palette — no vibrant accents outside semantic states (success, danger, warning)
- Compact component density — small buttons, tight padding, optimized for information-heavy views
- Border-driven containment — `1px solid #d0d7de` does most of the structural work
- Label system with colored dots for categorization (languages, statuses, issue labels)

## 2. Color Palette & Roles

### Primary
- **GitHub Blue** (`#0969da`): The sole brand accent — links, primary buttons, active states, selected tabs. Used nowhere decoratively.
- **Canvas White** (`#ffffff`): The primary page background — clean, bright, zero personality by design.
- **Text Primary** (`#1f2328`): Primary text — a neutral near-black with no warm or cool bias.

### Secondary & Accent
- **Green Success** (`#1a7f37`): Merged PRs, passing checks, positive state changes. The "good news" color.
- **Red Danger** (`#d1242f`): Failed checks, destructive actions, critical alerts.
- **Yellow Warning** (`#9a6700`): Pending states, warnings, draft PRs. Deliberately muted (not bright yellow).
- **Purple Done** (`#8250df`): Completed issues, special labels, graph accents.
- **Orange Attention** (`#bc4c00`): Review requested, needs attention.
- **Pink Accent** (`#bf3989`): Sponsor heart, decorative accent in limited contexts.

### Surface & Background
- **Canvas White** (`#ffffff`): Primary background.
- **Canvas Subtle** (`#f6f8fa`): Secondary background — sidebar, code blocks, table headers, inset areas.
- **Canvas Inset** (`#eff2f5`): Deeply recessed backgrounds — disabled inputs, empty states.
- **Overlay** (`#ffffff`): Dropdowns, modals, popovers — white with shadow.
- **Dark Canvas** (`#0d1117`): Dark mode primary background.
- **Dark Subtle** (`#161b22`): Dark mode elevated surfaces.
- **Dark Inset** (`#010409`): Dark mode inset areas.

### Neutrals & Text
- **Text Primary** (`#1f2328`): Default text — headings, body, labels.
- **Text Secondary** (`#656d76`): Descriptions, metadata, secondary information.
- **Text Tertiary** (`#818b98`): Placeholders, disabled text, timestamps.
- **Text Inverse** (`#ffffff`): Text on colored backgrounds (buttons, labels).

### Semantic & Accent
- **Border Default** (`#d0d7de`): Standard border — the most common element in the system.
- **Border Muted** (`#d8dee4`): Subtle borders, inner dividers.
- **Border Strong** (`#afb8c1`): Emphasized borders, input focus-adjacent.
- **Focus Ring** (`#0969da`): Focus outline — `2px solid #0969da` with `2px` offset.
- **Hover BG** (`rgba(208, 215, 222, 0.32)`): Transparent hover overlay on interactive rows.
- **Active BG** (`rgba(208, 215, 222, 0.48)`): Active/pressed state overlay.

### Gradient System
- GitHub is **gradient-free**. The design philosophy is that gradients are decorative, and Primer avoids decoration. Visual hierarchy comes from background color steps (white → subtle → inset), borders, and spacing.

## 3. Typography Rules

### Font Family
- **Headline / Body / UI**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif`
- **Code**: `ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace`

*GitHub uses the system font stack for all non-code text. The monospace stack is carefully ordered to prefer platform-native options.*

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display | System Sans | 40px (2.5rem) | 700 | 1.20 | normal | Marketing pages only |
| Page Title | System Sans | 32px (2rem) | 600 | 1.25 | normal | Repository name, settings page title |
| Section Heading | System Sans | 24px (1.5rem) | 600 | 1.25 | normal | README h1, section headers |
| Sub-heading | System Sans | 20px (1.25rem) | 600 | 1.30 | normal | README h2, card titles |
| Sub-heading Small | System Sans | 16px (1rem) | 600 | 1.50 | normal | README h3, list headers |
| Body Large | System Sans | 16px (1rem) | 400 | 1.50 | normal | README body, descriptions |
| Body Standard | System Sans | 14px (0.875rem) | 400 | 1.50 | normal | Default UI text — the workhorse size |
| Body Small | System Sans | 12px (0.75rem) | 400 | 1.50 | normal | Metadata, timestamps, secondary info |
| Caption | System Sans | 11px (0.6875rem) | 400 | 1.45 | normal | Fine print, legal |
| Label | System Sans | 12px (0.75rem) | 600 | 1.25 | normal | Form labels, nav items |
| Button | System Sans | 14px (0.875rem) | 500 | 1.15 | normal | Button text |
| Counter | System Sans | 12px (0.75rem) | 600 | 1.00 | normal | Notification badges, tab counters |
| Code Block | System Mono | 13px (0.8125rem) | 400 | 1.55 | normal | Code blocks, diffs |
| Code Inline | System Mono | 85% of parent | 400 | inherit | normal | Inline code in prose |

### Principles
- **14px is the center of gravity**: GitHub's most common text size is 14px — smaller than most modern sites (16px is the web default). This reflects the information density developers need: more content visible, less scrolling.
- **Weight 600 for all emphasis**: GitHub uses semibold (600) rather than bold (700) for headings. This feels authoritative without being heavy — appropriate for an interface where text is dense.
- **Monospace at 85%**: Inline code is sized at 85% of its container's font size, preventing code spans from disrupting the line rhythm of prose text.
- **Flat line-height**: 1.50 across almost all body sizes creates a uniform vertical rhythm. No size-specific adjustments.

## 4. Component Stylings

### Buttons

**Primary (Blue)**
- Background: GitHub Blue (`#0969da`)
- Text: White (`#ffffff`)
- Padding: 5px 16px
- Radius: 6px
- Border: `1px solid rgba(27, 31, 36, 0.15)`
- Shadow: `0 1px 0 rgba(27, 31, 36, 0.04)`
- Hover: `#0860ca` background
- Active: `#0757ba` background
- Font: 14px/500
- Height: 32px — intentionally compact

**Secondary (Default)**
- Background: Canvas Subtle (`#f6f8fa`)
- Text: Text Primary (`#1f2328`)
- Border: `1px solid #d0d7de`
- Padding: 5px 16px
- Radius: 6px
- Shadow: `0 1px 0 rgba(27, 31, 36, 0.04)`
- Hover: `#f3f4f6` background, border darkens to `#c4cdd5`
- Height: 32px

**Danger**
- Background: Red Danger (`#d1242f`)
- Text: White (`#ffffff`)
- Border: `1px solid rgba(27, 31, 36, 0.15)`
- Padding: 5px 16px
- Radius: 6px
- Hover: `#bf222b` background

**Invisible (Ghost)**
- Background: transparent
- Text: GitHub Blue (`#0969da`)
- Border: none
- Padding: 5px 16px
- Radius: 6px
- Hover: `rgba(208, 215, 222, 0.32)` background

### Cards & Containers
- Background: Canvas White (`#ffffff`) — no colored cards
- Border: `1px solid #d0d7de`
- Radius: 6px
- Shadow: none for standard containers; `0 1px 3px rgba(27, 31, 36, 0.12)` for overlays
- Padding: 16px
- List items within cards: separated by `1px solid #d8dee4` borders, no extra padding between

### Inputs & Forms
- Background: Canvas White (`#ffffff`)
- Text: Text Primary (`#1f2328`)
- Placeholder: Text Tertiary (`#818b98`)
- Border: `1px solid #d0d7de`
- Padding: 5px 12px
- Radius: 6px
- Height: 32px
- Focus: `2px solid #0969da` outline with `2px` offset
- Error: border becomes Red Danger, error message in 12px red below
- Label: 14px/600, Text Primary, 4px margin-bottom

### Navigation

**Top Nav (Header)**
- Background: `#24292f` (dark header)
- Height: 48px (mobile), 64px (desktop)
- Logo: GitHub Octomark in white
- Links: White (`#ffffff`), 14px/400
- Search: dark input with `1px solid #57606a` border
- Right side: avatar, notifications counter

**Underline Nav (Tabs)**
- Border-bottom: `1px solid #d0d7de` on the nav container
- Links: Text Secondary (`#656d76`), 14px/400
- Active: Text Primary (`#1f2328`) with `2px solid #fd8c73` (accent orange) or Blue bottom border
- Counter badges: 12px/600 in Canvas Subtle rounded pill
- Hover: `rgba(208, 215, 222, 0.32)` background

### Image Treatment
- Border-radius: 6px on screenshots and images
- Avatars: 50% radius (circle), available in 16/20/24/32/40/48px
- Border: `1px solid #d0d7de` on images within content
- No shadows on images

### Distinctive Components

**Repository Card**
- White background, `1px solid #d0d7de` border, 6px radius
- Repo name as blue link (14px/600)
- Description in Text Secondary (14px/400), max 2 lines
- Bottom row: language dot (12px colored circle) + language name, star count, fork count
- Padding: 16px

**Issue/PR Row**
- Full-width row in a bordered list
- Left: colored open/closed icon (green circle or purple merged icon)
- Title: 14px/600 as link, Text Primary
- Metadata: 12px Text Secondary — author, labels, timestamp
- Labels: colored pills with 12px text
- Hover: `rgba(208, 215, 222, 0.32)` full-row background

**Label/Badge**
- Background: semantic color at ~15% opacity
- Text: semantic color at full saturation
- Padding: 2px 8px
- Radius: 16px (pill shape)
- Font: 12px/600
- Examples: `background: #ddf4ff; color: #0969da` for blue labels

## 5. Layout Principles

### Spacing System
- Base unit: 4px
- Scale: 4px, 8px, 12px, 16px, 24px, 32px, 40px, 48px, 64px
- Component internal: 4-8px (compact) or 12-16px (standard)
- Card padding: 16px
- Section spacing: 24-32px (pages are dense)

### Grid & Container
- Max container width: 1280px for repos, 1012px for settings/marketing
- Sidebar: 296px (desktop), collapses at mobile
- Main content: fluid, max ~800px for readability
- Gutter: 16px (mobile), 24px (desktop)
- 12-column grid system (flexbox-based)

### Whitespace Philosophy
- GitHub is *dense by necessity*. A repo page shows the file tree, README, sidebar, branch selector, contributor list, and more — all at once. Whitespace exists only to separate concerns, not to create breathing room. When space is available (marketing pages), sections breathe more (48-64px spacing). But the product is compact.

### Border Radius Scale

| Name | Value | Usage |
|------|-------|-------|
| None | 0px | Full-bleed sections, progress bars |
| Small | 4px | Inline code, small badges |
| Default | 6px | Buttons, inputs, cards, containers — the standard |
| Large | 12px | Modals, large callout boxes |
| Pill | 16px | Labels, counters, filter pills |
| Circle | 50% | Avatars, status dots |

## 6. Depth & Elevation

| Level | Name | Shadow | Usage |
|-------|------|--------|-------|
| 0 | Flat | none | Default state — most elements |
| 1 | Low | `0 1px 0 rgba(27, 31, 36, 0.04)` | Buttons at rest — barely perceptible |
| 2 | Medium | `0 1px 3px rgba(27, 31, 36, 0.12), 0 8px 24px rgba(66, 74, 83, 0.12)` | Dropdowns, popovers |
| 3 | High | `0 3px 6px rgba(140, 149, 159, 0.15), 0 12px 28px rgba(140, 149, 159, 0.2)` | Modals, full-screen overlays |

GitHub uses shadows sparingly — most UI elements (cards, containers, sidebars) use borders instead. Shadows appear only on floating elements: dropdowns, tooltips, modals. The button shadow (`0 1px 0`) is so subtle it's primarily tactile — it makes buttons feel slightly raised without being visually prominent.

### Decorative Depth
- **None.** GitHub does not use decorative depth. No blurs, no glows, no gradients. Elevation is purely functional — "is this element floating above the page or not?"

## 7. Do's and Don'ts

### Do
- Use `1px solid #d0d7de` as the default border — it's the most common element in GitHub's UI
- Keep buttons compact: 32px height, 5px 16px padding — GitHub buttons are deliberately small
- Use 14px as the default text size for UI elements, not 16px
- Use semibold (600) for emphasis rather than bold (700)
- Use GitHub Blue (`#0969da`) only for links and primary actions — nowhere decorative
- Apply semantic colors at reduced opacity for label backgrounds (e.g., `#ddf4ff` for blue labels)
- Use system font stack — no custom fonts, no Google Fonts
- Keep card/container padding tight: 16px standard

### Don't
- Don't use shadows on cards or containers — use borders instead
- Don't use GitHub Blue for backgrounds, borders, or decoration — only for text links and primary button fills
- Don't use bold (700) in the UI — GitHub's heaviest weight is semibold (600)
- Don't use gradient backgrounds or colored surfaces — surfaces are always white, subtle gray, or inset gray
- Don't add large spacing between sections in product views — GitHub is dense
- Don't round avatars with border-radius less than 50% — they're either square (org) or circle (user)
- Don't use colored text for body content — all body text is Text Primary or Text Secondary
- Don't add decorative elements (icons, illustrations, patterns) in product views
- Don't use Pill radius (16px) on buttons or inputs — only on labels and counters

## 8. Responsive Behavior

### Breakpoints

| Name | Min Width | Changes |
|------|-----------|---------|
| Mobile | 0px | Single column, bottom nav, full-width containers, 16px padding |
| Tablet | 544px | Sidebar becomes toggle-able, 2-column file browser |
| Desktop | 768px | Full sidebar, inline navigation |
| Wide | 1012px | Max-width containers activate, 3-column layouts |
| Ultra | 1280px | Widest container, spacious repo layout |

### Touch Targets
- Minimum touch target: 44x44px (even though buttons render at 32px, hit area extends)
- Button minimum height: 32px (small), 40px (medium/mobile)
- Input minimum height: 32px
- List row tap target: full row width, 40px minimum height

### Collapsing Strategy
- Repository sidebar: persistent → hidden behind toggle at tablet
- Navigation tabs: horizontal scroll with fade hints at mobile
- File browser: 2-pane → single column with breadcrumb
- PR conversation: full-width at all sizes (already single-column)
- Markdown tables: horizontal scroll within container

### Image Behavior
- Avatars: fixed sizes (16-48px), never scale
- README images: max-width 100%, natural aspect ratio
- Screenshots: contained within card, horizontal scroll if oversized
- Diagrams (Mermaid): scale down proportionally

## 9. Agent Prompt Guide

### Quick Color Reference
- Page background: `#ffffff`
- Subtle surface: `#f6f8fa`
- Primary text: `#1f2328`
- Secondary text: `#656d76`
- Brand blue (links/actions): `#0969da`
- Default border: `#d0d7de`
- Success green: `#1a7f37`
- Danger red: `#d1242f`

### Example Component Prompts

**"Build a GitHub-style repository list"**
> White container with `1px solid #d0d7de` border, 6px radius. Each repo is a row with `border-bottom: 1px solid #d8dee4`. Repo name: 14px/600 in `#0969da` (link). Description: 14px/400 in `#656d76`, max 2 lines. Bottom: 12px language dot + name, star icon + count, fork icon + count in `#656d76`. 16px padding per row.

**"Create a GitHub-style issue card"**
> Full-width row. Left: green open icon or purple closed icon. Title: 14px/600 in `#1f2328`. Labels as colored pills (12px/600, semantic color at ~15% opacity background). Metadata row: 12px in `#656d76` — "#1234 opened 3 days ago by username". Hover: `rgba(208, 215, 222, 0.32)` background on full row.

**"Design a GitHub-style button group"**
> Primary: `#0969da` bg, white text, 5px 16px padding, 6px radius, 32px height. Secondary: `#f6f8fa` bg, `#1f2328` text, `1px solid #d0d7de` border. Danger: `#d1242f` bg, white text. All buttons 14px/500. Shadow: `0 1px 0 rgba(27, 31, 36, 0.04)`.

### Iteration Guide
1. Is the default text size 14px (not 16px)?
2. Are buttons 32px height with 5px vertical padding?
3. Are you using borders (`#d0d7de`) instead of shadows for containment?
4. Is Blue (`#0969da`) used only for links and primary actions?
5. Are all surfaces white or gray (no colored backgrounds)?
6. Is the font stack system-native (no custom fonts)?
7. Are labels using the pill shape (16px radius) with reduced-opacity colored backgrounds?
