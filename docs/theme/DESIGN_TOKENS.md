# Design Tokens

> Complete reference for design tokens and color systems

## Overview

Design tokens provide semantic, consistent values for styling across the application. They include color tokens, spacing, typography, shadows, z-index, and more.

### Locations

- **Tokens**: `/home/user/enzyme/src/lib/theme/tokens.ts`
- **Light Palette**: `/home/user/enzyme/src/lib/theme/palettes/light.ts`
- **Dark Palette**: `/home/user/enzyme/src/lib/theme/palettes/dark.ts`
- **Tailwind Tokens**: `/home/user/enzyme/src/config/design-tokens.ts`

## Color Tokens

Color tokens use CSS variables for dynamic theming and provide fallback values.

### Import

```typescript
import { colorTokens } from '@missionfabric-js/enzyme';
```

### Primary Colors

```typescript
colorTokens.primary.default  // Main brand color: #3b82f6
colorTokens.primary.hover    // Hover state: #2563eb
colorTokens.primary.active   // Active state: #1d4ed8
colorTokens.primary.light    // Light variant: #dbeafe
colorTokens.primary.lighter  // Lightest variant: #eff6ff
```

**Usage**:
```typescript
<button style={{ backgroundColor: colorTokens.primary.default }}>
  Click Me
</button>
```

### Secondary Colors

```typescript
colorTokens.secondary.default  // #64748b
colorTokens.secondary.hover    // #475569
colorTokens.secondary.active   // #334155
colorTokens.secondary.light    // #f1f5f9
colorTokens.secondary.lighter  // #f8fafc
```

### Semantic Colors

#### Success

```typescript
colorTokens.success.default  // #22c55e
colorTokens.success.hover    // #16a34a
colorTokens.success.light    // #dcfce7
colorTokens.success.lighter  // #f0fdf4
```

#### Warning

```typescript
colorTokens.warning.default  // #f59e0b
colorTokens.warning.hover    // #d97706
colorTokens.warning.light    // #fef3c7
colorTokens.warning.lighter  // #fffbeb
```

#### Error

```typescript
colorTokens.error.default  // #ef4444
colorTokens.error.hover    // #dc2626
colorTokens.error.light    // #fee2e2
colorTokens.error.lighter  // #fef2f2
```

#### Info

```typescript
colorTokens.info.default  // #3b82f6
colorTokens.info.hover    // #2563eb
colorTokens.info.light    // #dbeafe
colorTokens.info.lighter  // #eff6ff
```

### Neutral Colors

```typescript
colorTokens.neutral.white  // #ffffff
colorTokens.neutral.black  // #000000
colorTokens.neutral[50]    // #fafafa
colorTokens.neutral[100]   // #f4f4f5
colorTokens.neutral[200]   // #e4e4e7
colorTokens.neutral[300]   // #d4d4d8
colorTokens.neutral[400]   // #a1a1aa
colorTokens.neutral[500]   // #71717a
colorTokens.neutral[600]   // #52525b
colorTokens.neutral[700]   // #3f3f46
colorTokens.neutral[800]   // #27272a
colorTokens.neutral[900]   // #18181b
```

### Background Colors

```typescript
colorTokens.background.primary   // Main background
colorTokens.background.secondary // Secondary areas
colorTokens.background.tertiary  // Tertiary areas
colorTokens.background.muted     // Muted backgrounds
colorTokens.background.inverse   // Inverted (for contrast)
```

**Light Mode Values**:
- primary: `#ffffff`
- secondary: `#f8fafc`
- tertiary: `#f1f5f9`
- muted: `#f9fafb`
- inverse: `#0f172a`

**Dark Mode Values**:
- primary: `#0f172a`
- secondary: `#1e293b`
- tertiary: `#334155`
- muted: `#1e293b`
- inverse: `#ffffff`

### Text Colors

```typescript
colorTokens.text.primary    // Main text
colorTokens.text.secondary  // Secondary text
colorTokens.text.tertiary   // Tertiary text
colorTokens.text.muted      // Muted text
colorTokens.text.inverse    // Inverted text
```

**Contrast Ratios** (Light Mode):
- primary: 16.1:1 (AAA)
- secondary: 6.0:1 (AA)
- tertiary: 4.6:1 (AA)
- muted: 5.0:1 (AA)

**Contrast Ratios** (Dark Mode):
- primary: 15.8:1 (AAA)
- secondary: 9.0:1 (AAA)
- tertiary: 5.5:1 (AA)
- muted: 4.8:1 (AA)

### Border Colors

```typescript
colorTokens.border.default   // Standard borders
colorTokens.border.muted     // Subtle borders
colorTokens.border.emphasis  // Emphasized borders
colorTokens.border.focus     // Focus indicators
```

### Interactive States

```typescript
colorTokens.interactive.hover     // Hover background
colorTokens.interactive.active    // Active/pressed background
colorTokens.interactive.selected  // Selected state
colorTokens.interactive.disabled  // Disabled state
```

---

## Spacing Tokens

Consistent spacing values based on 4px grid.

### Import

```typescript
import { tokens } from '@missionfabric-js/enzyme';
```

### Values

```typescript
tokens.spacing.xs    // 0.25rem (4px)
tokens.spacing.sm    // 0.5rem (8px)
tokens.spacing.md    // 1rem (16px)
tokens.spacing.lg    // 1.5rem (24px)
tokens.spacing.xl    // 2rem (32px)
tokens.spacing['2xl'] // 3rem (48px)
tokens.spacing['3xl'] // 4rem (64px)
```

### Usage

```typescript
// Padding
<div style={{ padding: tokens.spacing.md }}>

// Margin
<div style={{ margin: tokens.spacing.lg }}>

// Gap
<div style={{ gap: tokens.spacing.sm }}>
```

### Responsive Spacing

```typescript
// Mobile
padding: tokens.spacing.sm

// Desktop
@media (min-width: 768px) {
  padding: tokens.spacing.lg
}
```

---

## Typography Tokens

### Font Sizes

```typescript
tokens.fontSize.xs    // 0.75rem (12px)
tokens.fontSize.sm    // 0.875rem (14px)
tokens.fontSize.base  // 1rem (16px)
tokens.fontSize.lg    // 1.125rem (18px)
tokens.fontSize.xl    // 1.25rem (20px)
tokens.fontSize['2xl'] // 1.5rem (24px)
tokens.fontSize['3xl'] // 1.875rem (30px)
tokens.fontSize['4xl'] // 2.25rem (36px)
```

### Font Weights

```typescript
tokens.fontWeight.normal    // 400
tokens.fontWeight.medium    // 500
tokens.fontWeight.semibold  // 600
tokens.fontWeight.bold      // 700
```

### Line Heights

```typescript
tokens.lineHeight.none     // 1
tokens.lineHeight.tight    // 1.25
tokens.lineHeight.snug     // 1.375
tokens.lineHeight.normal   // 1.5
tokens.lineHeight.relaxed  // 1.625
tokens.lineHeight.loose    // 2
```

### Usage

```typescript
<h1 style={{
  fontSize: tokens.fontSize['2xl'],
  fontWeight: tokens.fontWeight.bold,
  lineHeight: tokens.lineHeight.tight
}}>
  Heading
</h1>
```

---

## Border Radius

### Values

```typescript
tokens.radius.none  // 0
tokens.radius.sm    // 0.125rem (2px)
tokens.radius.md    // 0.25rem (4px)
tokens.radius.lg    // 0.5rem (8px)
tokens.radius.xl    // 1rem (16px)
tokens.radius.full  // 9999px (circular)
```

### Usage

```typescript
// Card
<div style={{ borderRadius: tokens.radius.lg }}>

// Button
<button style={{ borderRadius: tokens.radius.md }}>

// Avatar
<img style={{ borderRadius: tokens.radius.full }}>
```

---

## Shadows

### Values

```typescript
tokens.shadow.none    // No shadow
tokens.shadow.sm      // Subtle: 0 1px 2px 0 rgb(0 0 0 / 0.05)
tokens.shadow.md      // Medium: 0 4px 6px -1px rgb(0 0 0 / 0.1)
tokens.shadow.lg      // Large: 0 10px 15px -3px rgb(0 0 0 / 0.1)
tokens.shadow.xl      // Extra large: 0 20px 25px -5px rgb(0 0 0 / 0.1)
```

### Usage

```typescript
// Card
<div style={{ boxShadow: tokens.shadow.md }}>

// Dropdown
<div style={{ boxShadow: tokens.shadow.lg }}>

// Modal
<div style={{ boxShadow: tokens.shadow.xl }}>
```

---

## Z-Index Scale

Consistent layering for overlapping elements.

### Values

```typescript
tokens.zIndex.base      // '0'
tokens.zIndex.dropdown  // '100'
tokens.zIndex.sticky    // '200'
tokens.zIndex.modal     // '300'
tokens.zIndex.popover   // '400'
tokens.zIndex.tooltip   // '500'
tokens.zIndex.toast     // '600'
```

### Usage

```typescript
// Dropdown menu
<div style={{ zIndex: tokens.zIndex.dropdown }}>

// Modal backdrop
<div style={{ zIndex: tokens.zIndex.modal }}>

// Toast notifications
<div style={{ zIndex: tokens.zIndex.toast }}>
```

### Numeric Values

For components requiring numeric z-index:

```typescript
parseInt(tokens.zIndex.modal) // 300
parseInt(tokens.zIndex.toast) // 600
```

---

## Transitions

### Values

```typescript
tokens.transition.fast    // 150ms ease-in-out
tokens.transition.normal  // 250ms ease-in-out
tokens.transition.slow    // 350ms ease-in-out
```

### Usage

```typescript
<button style={{
  transition: tokens.transition.normal
}}>
  Hover me
</button>
```

---

## Breakpoints

Responsive design breakpoints.

### Values

```typescript
tokens.breakpoint.sm    // 640px
tokens.breakpoint.md    // 768px
tokens.breakpoint.lg    // 1024px
tokens.breakpoint.xl    // 1280px
tokens.breakpoint['2xl'] // 1536px
```

### Usage with Media Queries

```typescript
const styles = {
  padding: tokens.spacing.sm,

  [`@media (min-width: ${tokens.breakpoint.md})`]: {
    padding: tokens.spacing.lg,
  },
};
```

---

## Tailwind Design Tokens

For applications using Tailwind CSS, additional utility tokens are available.

### Location

```
/home/user/enzyme/src/config/design-tokens.ts
```

### Import

```typescript
import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  STATUS_BADGES,
  BUTTON_VARIANTS,
  // ... more
} from '@missionfabric-js/enzyme/config/design-tokens';
```

### Status Badges

```typescript
STATUS_BADGES.success  // Green badge
STATUS_BADGES.warning  // Yellow badge
STATUS_BADGES.error    // Red badge
STATUS_BADGES.info     // Blue badge
STATUS_BADGES.neutral  // Gray badge
```

### Button Variants

```typescript
BUTTON_VARIANTS.primary    // Primary button classes
BUTTON_VARIANTS.secondary  // Secondary button classes
BUTTON_VARIANTS.outline    // Outlined button classes
BUTTON_VARIANTS.ghost      // Ghost button classes
BUTTON_VARIANTS.danger     // Danger button classes
```

### Cards

```typescript
CARDS.default      // Standard card
CARDS.elevated     // Card with shadow
CARDS.interactive  // Hoverable card
CARDS.flat         // Flat card
```

### Gradients

```typescript
GRADIENTS.primary   // Primary brand gradient
GRADIENTS.success   // Success gradient
GRADIENTS.hero      // Hero section gradient
GRADIENTS.mesh      // Mesh gradient effect
```

See `/home/user/enzyme/src/config/design-tokens.ts` for complete reference.

---

## Color Palettes

### Light Palette

Full color scale for light mode:

```typescript
import { lightPalette } from '@missionfabric-js/enzyme';

// Primary colors
lightPalette.primary[50]   // #eff6ff
lightPalette.primary[500]  // #3b82f6
lightPalette.primary[900]  // #1e3a8a

// Neutral colors
lightPalette.neutral[50]   // #fafafa
lightPalette.neutral[500]  // #71717a
lightPalette.neutral[900]  // #18181b

// Semantic colors
lightPalette.success[500]  // #22c55e
lightPalette.warning[500]  // #f59e0b
lightPalette.error[500]    // #ef4444

// Background colors
lightPalette.background.primary    // #ffffff
lightPalette.background.secondary  // #f8fafc

// Text colors (WCAG AA compliant)
lightPalette.text.primary    // #0f172a (16.1:1)
lightPalette.text.secondary  // #475569 (6.0:1)
lightPalette.text.tertiary   // #5c6b7f (4.6:1)
```

### Dark Palette

Full color scale for dark mode:

```typescript
import { darkPalette } from '@missionfabric-js/enzyme';

// Primary colors (inverted scale)
darkPalette.primary[50]   // #1e3a8a
darkPalette.primary[500]  // #60a5fa
darkPalette.primary[900]  // #eff6ff

// Background colors
darkPalette.background.primary    // #0f172a
darkPalette.background.secondary  // #1e293b

// Text colors (WCAG AA compliant)
darkPalette.text.primary    // #f8fafc (15.8:1)
darkPalette.text.secondary  // #cbd5e1 (9.0:1)
darkPalette.text.tertiary   // #a8b5c7 (5.5:1)
```

---

## Customization

### Extending Tokens

```typescript
import { tokens } from '@missionfabric-js/enzyme';

const customTokens = {
  ...tokens,
  spacing: {
    ...tokens.spacing,
    '4xl': '5rem',
    '5xl': '6rem',
  },
};
```

### Custom Colors

```typescript
const customColors = {
  brand: {
    primary: '#ff6b6b',
    secondary: '#4ecdc4',
  },
};

// Usage
<div style={{ backgroundColor: customColors.brand.primary }}>
```

### CSS Variables

Define custom CSS variables:

```css
:root {
  --custom-color-primary: #ff6b6b;
  --custom-spacing-base: 1.5rem;
}

.dark {
  --custom-color-primary: #ff8888;
}
```

```typescript
<div style={{
  color: 'var(--custom-color-primary)',
  padding: 'var(--custom-spacing-base)'
}}>
```

---

## Best Practices

1. **Use Semantic Tokens**: Prefer `colorTokens.text.primary` over `#000000`
2. **Consistent Spacing**: Use spacing tokens for all padding, margin, and gaps
3. **Typography Scale**: Use font size tokens for consistent hierarchy
4. **Z-Index Scale**: Use z-index tokens for predictable layering
5. **Accessible Colors**: Use provided color combinations for WCAG compliance
6. **Responsive Design**: Use breakpoint tokens for media queries
7. **Theme-Aware**: Use CSS variables for colors that change with theme

---

## TypeScript Types

Token types for autocomplete and type safety:

```typescript
import type {
  SpacingToken,
  FontSizeToken,
  ColorToken,
  RadiusToken,
  ShadowToken,
  ZIndexToken,
} from '@missionfabric-js/enzyme';
```

---

## See Also

- [Theme System Overview](./README.md)
- [Theme Provider](./PROVIDER.md)
- [Type Definitions](./TYPES.md)

---

## Related Documentation

### Theme System
- [Theme System Overview](./README.md) - Complete theme system guide
- [Theme Provider](./PROVIDER.md) - Theme provider setup
- [Type Definitions](./TYPES.md) - TypeScript types for tokens
- [Dark Mode](./DARK_MODE.md) - Dark mode color palettes

### UI & Components
- [UI Components](../ui/README.md) - Components using design tokens
- [Design System](../DESIGN_SYSTEM.md) - Tailwind design tokens and patterns
- [Components Reference](../COMPONENTS_REFERENCE.md) - Component styling APIs

### Styling & Implementation
- [Input Components](../ui/INPUT_COMPONENTS.md) - Button variants and sizes
- [Feedback Components](../ui/FEEDBACK_COMPONENTS.md) - Loading animations and colors
- [Layout Components](../ui/LAYOUT_COMPONENTS.md) - Layout spacing and structure

### Accessibility
- [Accessibility](../ux/ACCESSIBILITY.md) - WCAG-compliant color contrast
- [Dark Mode](./DARK_MODE.md) - Accessible dark mode contrast ratios
