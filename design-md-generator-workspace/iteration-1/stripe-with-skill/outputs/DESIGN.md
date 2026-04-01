# Design System: Stripe

## 1. Visual Theme & Atmosphere

Stripe's design is financial infrastructure rendered as visual poetry — precise, confident, and effortlessly sophisticated. The experience is built on a deep navy canvas (`#0a2540`) that evokes the gravitas of institutional finance while the signature gradient text treatment (cycling through violet, cyan, and pink) injects an unmistakable futurism. Where most fintech feels either sterile or desperate-to-be-cool, Stripe threads the needle: every element signals "we are serious engineers who also have taste."

The typography backbone is a system sans-serif stack that prioritizes readability and loading speed over personality — the design itself provides the personality through color, spacing, and immaculate component craft. Shadows are layered and realistic, borders are subtle, and the overall density sits at a comfortable middle ground between dashboard-tight and marketing-generous.

**Key Characteristics:**
- Deep navy primary canvas (`#0a2540`) — darker than most tech brands, conveying trust and depth
- Signature gradient text using violet-to-cyan-to-pink sweeps for hero moments
- Layered, multi-stop box shadows creating realistic depth without heaviness
- System font stack (`-apple-system, BlinkMacSystemFont, Segoe UI`) — speed over novelty
- Cool-toned neutral scale with blue undertones throughout every gray
- Generous but disciplined spacing — 8px base unit, never cramped, never wasteful
- Rounded corners everywhere (6-12px) softening the engineering precision

## 2. Color Palette & Roles

### Primary
- **Stripe Blurple** (`#635bff`): The core brand color — a distinctive blue-violet used for primary CTAs, active states, and brand moments. Instantly recognizable and unlike any competitor.
- **Navy Deep** (`#0a2540`): The primary dark surface and hero background — a rich, blue-black that feels authoritative without being oppressive.
- **White Pure** (`#ffffff`): Primary light surface and text-on-dark color.

### Secondary & Accent
- **Cyan Bright** (`#00d4ff`): Gradient accent and data visualization highlight — electric and modern.
- **Pink Accent** (`#ff80b5`): Gradient terminal color and secondary accent for illustrations.
- **Green Success** (`#30b130`): Success states, positive metrics, and confirmation — a natural, confident green.
- **Red Error** (`#df1b41`): Error states and destructive actions — urgent without being aggressive.
- **Yellow Warning** (`#f5be3b`): Warning states and caution indicators.
- **Blue Info** (`#0073e6`): Informational states and links — a standard, accessible blue.

### Surface & Background
- **Canvas Light** (`#f6f9fc`): The primary light-mode page background — a barely-there cool blue-gray.
- **Card White** (`#ffffff`): Card and container backgrounds on light surfaces.
- **Surface Elevated** (`#f0f3f7`): Secondary surfaces, code blocks, and inset areas.
- **Navy Deep** (`#0a2540`): Dark-mode page background and hero sections.
- **Navy Mid** (`#1a3a5c`): Dark-mode elevated surfaces and card backgrounds.
- **Navy Light** (`#2a4a6c`): Dark-mode secondary surfaces and hover states.

### Neutrals & Text
- **Ink Dark** (`#1a1f36`): Primary text on light backgrounds — a blue-tinted near-black.
- **Ink Mid** (`#425466`): Secondary text and descriptions — cool-toned medium gray.
- **Ink Light** (`#697386`): Tertiary text, metadata, and placeholders.
- **Ink Faint** (`#8898aa`): Disabled text and subtle metadata.
- **Snow Dark** (`#c1c9d2`): Text on dark backgrounds — secondary level.
- **Snow Light** (`#e3e8ee`): Borders and dividers on light surfaces.
- **Snow White** (`#f7fafc`): Lightest neutral, subtle backgrounds.

### Semantic & Accent
- **Border Default** (`#e3e8ee`): Standard light-mode border — a cool, barely-visible gray.
- **Border Strong** (`#c1c9d2`): Prominent borders and input outlines.
- **Border Dark** (`#2a4a6c`): Borders on dark surfaces.
- **Focus Ring** (`#635bff`): Focus indicator using brand Blurple with `0 0 0 3px rgba(99, 91, 255, 0.25)`.
- **Hover Overlay** (`rgba(99, 91, 255, 0.04)`): Subtle hover state overlay.
- **Active Overlay** (`rgba(99, 91, 255, 0.08)`): Active/pressed state overlay.

### Gradient System
- **Hero Gradient**: `linear-gradient(135deg, #635bff 0%, #00d4ff 50%, #ff80b5 100%)` — the signature Stripe sweep, used sparingly for hero text and key visual moments.
- **Mesh Gradient**: Complex multi-point radial gradients used in marketing hero backgrounds, blending navy, violet, cyan, and pink.
- **Surface Gradient**: `linear-gradient(180deg, #f6f9fc 0%, #ffffff 100%)` — subtle top-to-bottom on light sections.

## 3. Typography Rules

### Font Family
- **Headline / Body / UI**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif`
- **Code**: `'JetBrains Mono', 'Source Code Pro', Menlo, Monaco, Consolas, monospace`

*Note: Stripe uses the system font stack exclusively. No custom web fonts. This is a deliberate choice — performance over personality.*

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display / Hero | System Sans | 64px (4rem) | 700 | 1.06 | -0.04em | Maximum impact, often with gradient text |
| Page Title | System Sans | 48px (3rem) | 700 | 1.10 | -0.03em | Section heroes and landing page headers |
| Section Heading | System Sans | 36px (2.25rem) | 700 | 1.15 | -0.02em | Major section dividers |
| Sub-heading Large | System Sans | 28px (1.75rem) | 600 | 1.25 | -0.01em | Feature titles and card headers |
| Sub-heading | System Sans | 24px (1.5rem) | 600 | 1.30 | -0.01em | Secondary section titles |
| Sub-heading Small | System Sans | 20px (1.25rem) | 600 | 1.35 | normal | Smaller feature headings |
| Body Large | System Sans | 18px (1.125rem) | 400 | 1.60 | normal | Intro paragraphs and emphasis text |
| Body Standard | System Sans | 16px (1rem) | 400 | 1.60 | normal | Standard body text |
| Body Small | System Sans | 14px (0.875rem) | 400 | 1.55 | normal | Compact body, table cells |
| Caption | System Sans | 13px (0.8125rem) | 400 | 1.45 | 0.01em | Metadata, footnotes |
| Label | System Sans | 12px (0.75rem) | 600 | 1.25 | 0.05em | Form labels, badges |
| Overline | System Sans | 11px (0.6875rem) | 700 | 1.35 | 0.1em | Uppercase category labels |
| Button | System Sans | 14px (0.875rem) | 600 | 1.15 | 0.02em | Button text |
| Code Block | JetBrains Mono | 14px (0.875rem) | 400 | 1.55 | -0.01em | Code blocks and terminal |
| Code Inline | JetBrains Mono | 13px (0.8125rem) | 400 | inherit | -0.01em | Inline code snippets |

### Principles
- **System fonts for speed**: The system stack eliminates font loading entirely. For a payments platform, every millisecond matters — the design earns personality through color and layout, not typeface selection.
- **Tight display tracking**: Large headlines use negative letter-spacing (-0.04em at 64px) that progressively relaxes at smaller sizes. This creates visual density at hero scale while maintaining readability in body text.
- **Weight as hierarchy**: Only three weights — 400 (body), 600 (emphasis/UI), 700 (display). No light weights, no extra-bold. Constraint creates consistency.
- **Generous body line-height**: 1.60 for body text — notably spacious, giving the content a premium, unhurried feel despite the system font choice.

## 4. Component Stylings

### Buttons

**Primary (Blurple)**
- Background: Stripe Blurple (`#635bff`)
- Text: White Pure (`#ffffff`)
- Padding: 8px 16px
- Radius: 6px
- Shadow: `0 1px 1px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.16)`
- Hover: `#7a73ff` background, shadow intensifies
- Active: `#5851db` background, shadow reduces
- The primary CTA — confident and unmistakable

**Secondary (Outlined)**
- Background: White Pure (`#ffffff`)
- Text: Ink Dark (`#1a1f36`)
- Border: `1px solid #e3e8ee`
- Padding: 8px 16px
- Radius: 6px
- Shadow: `0 1px 1px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.08)`
- Hover: `#f6f9fc` background
- Active: `#e3e8ee` background

**Ghost (Text)**
- Background: transparent
- Text: Stripe Blurple (`#635bff`)
- Padding: 8px 12px
- Radius: 6px
- Hover: `rgba(99, 91, 255, 0.04)` background
- Active: `rgba(99, 91, 255, 0.08)` background
- No border, no shadow

**Destructive**
- Background: Red Error (`#df1b41`)
- Text: White Pure (`#ffffff`)
- Padding: 8px 16px
- Radius: 6px
- Shadow: `0 1px 1px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.16)`
- Hover: `#e8365a` background
- Active: `#c4173a` background

### Cards & Containers
- Background: Card White (`#ffffff`) on light; Navy Mid (`#1a3a5c`) on dark
- Border: `1px solid #e3e8ee` on light; `1px solid rgba(255,255,255,0.1)` on dark
- Radius: 8px standard; 12px for featured cards
- Shadow: `0 2px 4px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)` — subtle, layered
- Hover shadow: `0 4px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.10)` — lifts on interaction
- Internal padding: 24px standard; 32px for featured
- Section borders: `1px solid #e3e8ee` for internal dividers

### Inputs & Forms
- Background: White Pure (`#ffffff`)
- Text: Ink Dark (`#1a1f36`)
- Placeholder: Ink Faint (`#8898aa`)
- Border: `1px solid #c1c9d2`
- Padding: 8px 12px
- Radius: 6px
- Focus: border changes to Blurple (`#635bff`) with `0 0 0 3px rgba(99, 91, 255, 0.25)` ring
- Error: border changes to Red Error (`#df1b41`) with `0 0 0 3px rgba(223, 27, 65, 0.15)` ring
- Label: 12px/600 weight, Ink Mid (`#425466`), 4px margin-bottom

### Navigation
- Background: Navy Deep (`#0a2540`) for main nav; White (`#ffffff`) for dashboard nav
- Height: 64px
- Logo: Stripe wordmark in White or Blurple depending on surface
- Links: `#c1c9d2` (dark nav) or `#425466` (light nav), 14px/600 weight
- Active link: White (`#ffffff`) on dark; Blurple (`#635bff`) on light
- Hover: `#ffffff` on dark; Ink Dark (`#1a1f36`) on light
- Border-bottom: `1px solid rgba(255,255,255,0.1)` on dark; `1px solid #e3e8ee` on light

### Image Treatment
- Border-radius: 8px on screenshots, 12px on hero images
- Shadow: layered card shadow for elevated screenshots
- Code screenshots on dark: presented with the terminal chrome and rounded corners
- Browser mockups: subtle drop shadow, 12px radius

### Distinctive Components

**Pricing Tier Cards**
- Three-column grid with a "recommended" card getting a Blurple top border (3px)
- Price displayed at 48px/700 weight
- Feature checklist with Green Success checkmarks
- CTA button matches the tier importance (Primary for recommended, Secondary for others)

**Code Snippet Blocks**
- Background: `#1a1f36` (dark code surface)
- Border: `1px solid #2a4a6c`
- Radius: 8px
- Padding: 20px 24px
- Syntax highlighting: keywords in Cyan Bright (`#00d4ff`), strings in Pink Accent (`#ff80b5`), comments in `#697386`
- Language badge: top-right, 11px uppercase label
- Copy button: ghost style, appears on hover

**Gradient Hero Section**
- Background: mesh gradient on Navy Deep canvas
- Text: White with gradient treatment on headline via `background-clip: text`
- Large centered layout, max-width 720px
- Primary CTA centered below headline

## 5. Layout Principles

### Spacing System
- Base unit: 4px
- Scale: 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px, 80px, 96px, 128px
- Component internal: 8-16px typical
- Card padding: 24-32px
- Section spacing: 64-128px between major sections

### Grid & Container
- Max container width: 1080px for content; 1280px for dashboards
- Gutter: 24px (desktop), 16px (mobile)
- Common layouts: single column (docs), 2-column (feature sections), 3-column (pricing/cards)
- Hero: centered, max-width 720px for text content
- Dashboard: sidebar (240px) + main content (fluid)

### Whitespace Philosophy
- Stripe uses whitespace to convey premium quality — sections breathe with 80-128px vertical spacing. The space itself communicates "we have nothing to prove, no need to cram." Individual components maintain a moderate density (8-16px internal padding) because the product is ultimately a tool, not a magazine.

### Border Radius Scale

| Name | Value | Usage |
|------|-------|-------|
| Sharp | 0px | Dividers, progress bars |
| Small | 4px | Badges, tags, tooltips |
| Default | 6px | Buttons, inputs, small cards |
| Medium | 8px | Standard cards, dropdowns |
| Large | 12px | Featured cards, hero images, modals |
| Round | 50% | Avatars, status dots |

## 6. Depth & Elevation

| Level | Name | Shadow | Usage |
|-------|------|--------|-------|
| 0 | Flat | none | Inline elements, text |
| 1 | Low | `0 1px 1px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.08)` | Buttons, inputs at rest |
| 2 | Card | `0 2px 4px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)` | Cards, dropdowns |
| 3 | Raised | `0 4px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.10)` | Hover cards, popovers |
| 4 | Overlay | `0 8px 16px rgba(0,0,0,0.08), 0 16px 48px rgba(0,0,0,0.16)` | Modals, overlays |
| 5 | Dramatic | `0 24px 48px rgba(0,0,0,0.12), 0 48px 96px rgba(0,0,0,0.20)` | Hero elements, floating UI |

Stripe uses **multi-stop layered shadows** — every elevation level combines two shadow declarations. The first provides a tight, close shadow for definition; the second provides a wider, softer spread for ambient depth. This dual-layer approach creates realistic depth that never looks like a flat cutout.

### Decorative Depth
- **Mesh gradients**: Hero backgrounds use complex radial gradients blending navy, violet, cyan, and pink at various stops to create atmospheric depth
- **Blur effects**: `backdrop-filter: blur(12px)` on navigation overlays when scrolling over gradient backgrounds
- **Glow effects**: Subtle colored glows behind primary CTAs on dark backgrounds using `box-shadow: 0 0 40px rgba(99, 91, 255, 0.3)`

## 7. Do's and Don'ts

### Do
- Use Stripe Blurple (`#635bff`) exclusively for primary actions and brand moments — it's the single most recognizable element
- Apply the dual-layer shadow pattern to all elevated elements — never use a single shadow declaration
- Set body text line-height to 1.60 — the generous spacing is part of the premium feel
- Use negative letter-spacing on headings (-0.02em to -0.04em) — tight headlines are a core part of the visual rhythm
- Reserve gradient text treatment for hero headlines only — scarcity makes it impactful
- Use cool-toned grays throughout — every neutral should have a slight blue undertone
- Keep border-radius consistent: 6px for small interactive elements, 8px for cards
- Use the system font stack — do not substitute custom web fonts

### Don't
- Don't use warm grays or neutral grays — Stripe's palette is exclusively cool-toned
- Don't apply gradients to buttons, badges, or small UI elements — gradients are for hero moments only
- Don't use border-radius larger than 12px on standard UI elements (only avatars get 50%)
- Don't use single-layer shadows — always use the dual-layer pattern from the elevation table
- Don't mix font weights beyond 400/600/700 — no 300 or 800
- Don't use colored backgrounds for cards on light theme — cards are always white with shadow for elevation
- Don't place more than one primary (Blurple) button in the same visual section
- Don't use pure black (`#000000`) for text — always use Ink Dark (`#1a1f36`)
- Don't put gradient text on anything smaller than 36px — it becomes illegible

## 8. Responsive Behavior

### Breakpoints

| Name | Min Width | Changes |
|------|-----------|---------|
| Mobile | 0px | Single column, stacked cards, hamburger nav, 16px gutters |
| Tablet | 640px | Two-column card grids, visible nav links, 20px gutters |
| Desktop | 1024px | Full layout, sidebar nav in dashboard, 24px gutters |
| Wide | 1280px | Max container width, increased section spacing |
| Ultra | 1440px | Content remains at max-width, extra margin auto-centers |

### Touch Targets
- Minimum touch target: 44x44px
- Button minimum height: 36px (small), 40px (medium), 48px (large)
- Input minimum height: 40px
- Nav links: 44px touch area with padding

### Collapsing Strategy
- Navigation: full links → hamburger menu at mobile
- Pricing grid: 3 columns → vertical stack at mobile, with recommended tier first
- Feature sections: 2-column (image + text) → stacked at tablet, image above text
- Dashboard sidebar: persistent → collapsible drawer at tablet
- Code blocks: horizontal scroll when content exceeds viewport width

### Image Behavior
- Hero images: `object-fit: cover` with maintained aspect ratio
- Screenshots: scale proportionally, max-width 100%
- Logos/icons: fixed sizes, centered on mobile
- Code screenshots: horizontal scroll rather than scale-down

## 9. Agent Prompt Guide

### Quick Color Reference
- Page background (light): `#f6f9fc`
- Page background (dark): `#0a2540`
- Primary text: `#1a1f36`
- Brand accent: `#635bff`
- Card background: `#ffffff`
- Default border: `#e3e8ee`
- Secondary text: `#425466`
- Success: `#30b130`

### Example Component Prompts

**"Build a Stripe-style pricing section"**
> Three-column card grid on `#f6f9fc` background. Each card is white with `1px solid #e3e8ee` border, 8px radius, dual-layer shadow. Middle card has a 3px `#635bff` top border and "Recommended" badge. Prices in 48px/700 weight, feature lists with green checkmarks. Primary CTA on recommended card, secondary on others.

**"Create a Stripe-style code example block"**
> Dark container (`#1a1f36`), 8px radius, `1px solid #2a4a6c` border. JetBrains Mono at 14px. Keywords in `#00d4ff`, strings in `#ff80b5`, comments in `#697386`. Language badge top-right in 11px uppercase. Copy button appears on hover.

**"Design a Stripe-style hero section"**
> Navy Deep (`#0a2540`) background with mesh gradient. Hero text in white, 64px/700 weight, -0.04em tracking. Headline uses `background-clip: text` gradient (blurple → cyan → pink). Centered layout, max-width 720px. Primary Blurple CTA button below.

### Iteration Guide
1. Are all grays cool-toned (blue undertone, never warm)?
2. Are shadows using the dual-layer pattern?
3. Is border-radius 6px for buttons/inputs, 8px for cards, 12px for featured elements?
4. Is gradient text reserved for hero headlines only?
5. Are you using the system font stack (no custom fonts)?
6. Is Blurple used sparingly — only for primary actions and brand moments?
7. Is the section spacing generous (64-128px)?
