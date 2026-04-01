# Example DESIGN.md Structure Reference

This file shows the exact markdown patterns to follow. Read this when generating a DESIGN.md to match the expected formatting conventions.

## Table of Contents
1. [Document Header](#document-header)
2. [Section 1 Pattern](#section-1-visual-theme--atmosphere)
3. [Section 2 Pattern](#section-2-color-palette--roles)
4. [Section 3 Pattern](#section-3-typography-rules)
5. [Section 4-9 Notes](#sections-4-9)

## Document Header

```markdown
# Design System: [Brand Name]
```

Always start with an H1 that names the brand or project.

## Section 1: Visual Theme & Atmosphere

```markdown
## 1. Visual Theme & Atmosphere

[2-4 sentence narrative paragraph using evocative language and metaphors.
Reference specific colors inline with backtick-wrapped hex codes.
Describe what makes this design distinctive compared to peers.]

**Key Characteristics:**
- [Specific trait] (`#hexval`) [why it matters]
- [Technique or pattern] — [brief explanation]
- [5-8 total bullet points]
```

## Section 2: Color Palette & Roles

```markdown
## 2. Color Palette & Roles

### Primary
- **Semantic Name** (`#hexval`): Description of role and usage context.
- **Another Color** (`#hexval`): Description.

### Secondary & Accent
- **Error Red** (`#hexval`): Description.
- **Focus Blue** (`#hexval`): Description.

### Surface & Background
- **Light Surface** (`#hexval`): Description.
- **Dark Surface** (`#hexval`): Description.

### Neutrals & Text
- **Primary Text** (`#hexval`): Description.
- **Secondary Text** (`#hexval`): Description.
- **Muted Text** (`#hexval`): Description.

### Semantic & Accent
- **Standard Border** (`#hexval`): Description.
- **Focus Ring** (`#hexval`): Description.

### Gradient System
- [Description of gradient usage or "gradient-free" statement]
```

## Section 3: Typography Rules

```markdown
## 3. Typography Rules

### Font Family
- **Headline**: `Font Name`, with fallback: `Fallback Font`
- **Body / UI**: `Font Name`, with fallback: `Fallback Font`
- **Code**: `Font Name`, with fallback: `monospace`

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display / Hero | Font | 64px (4rem) | 700 | 1.10 | -0.02em | Usage note |
| Section Heading | Font | 48px (3rem) | 700 | 1.15 | -0.01em | Usage note |
| ... | ... | ... | ... | ... | ... | ... |
| Code | Mono Font | 14px (0.875rem) | 400 | 1.60 | 0 | Inline code |

### Principles
- **[Principle name]**: Explanation of the reasoning.
- **[Principle name]**: Explanation of the reasoning.
```

## Sections 4-9

### Section 4: Component Stylings
Group by component type (Buttons, Cards, Inputs, Navigation, Images, Distinctive Components). For each variant, specify background, text color, padding, radius, shadow, and state changes. Use the exact same color names from Section 2.

### Section 5: Layout Principles
Subsections: Spacing System, Grid & Container, Whitespace Philosophy, Border Radius Scale. Include the numeric scale and max-width values.

### Section 6: Depth & Elevation
A table of elevation levels with CSS shadow strings. Philosophy paragraph explaining the approach.

### Section 7: Do's and Don'ts
Two lists (### Do / ### Don't) with 8-12 items each. Items should reference specific design system elements.

### Section 8: Responsive Behavior
Breakpoints table, touch targets, collapsing strategy, image behavior.

### Section 9: Agent Prompt Guide
Quick Color Reference (top 5-8 colors), Example Component Prompts (2-3 prompts), Iteration Guide (checklist).
