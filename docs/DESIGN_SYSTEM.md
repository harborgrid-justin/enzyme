# Design System Guide

> **Scope**: This document covers the React Template's design token system and styling patterns.
> It defines centralized design tokens for consistent UI styling across the application.

---

## Overview

This template includes a **centralized design token system** that prevents styling inconsistencies and reduces errors. All design tokens are defined in `src/config/design-tokens.ts` and exported through `@/config`.

## Why Use Design Tokens?

### Problems Solved
- ❌ **Before**: `bg-green-100 text-green-800` repeated 47 times across codebase
- ✅ **After**: `STATUS_BADGES.success` used consistently everywhere

- ❌ **Before**: Typos like `bg-grean-100` or `text-green-700` vs `text-green-800`
- ✅ **After**: TypeScript autocomplete prevents typos

- ❌ **Before**: Difficult to change theme colors (find & replace across 100+ files)
- ✅ **After**: Update one constant, changes apply everywhere

## Quick Start

```tsx
import { 
  STATUS_BADGES, 
  ICON_CONTAINERS, 
  COLORS, 
  LAYOUTS,
  TYPOGRAPHY 
} from '@/config';

// Instead of:
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
  Active
</span>

// Use:
<span className={STATUS_BADGES.success}>Active</span>

// Instead of:
<div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">

// Use:
<div className={ICON_CONTAINERS.primary}>
```

## Available Token Categories

### 1. Status Badges
Pre-styled badge components for consistent status indicators:

```tsx
import { STATUS_BADGES } from '@/config';

<span className={STATUS_BADGES.success}>Active</span>
<span className={STATUS_BADGES.warning}>Pending</span>
<span className={STATUS_BADGES.error}>Failed</span>
<span className={STATUS_BADGES.info}>Processing</span>
<span className={STATUS_BADGES.neutral}>Draft</span>

// Entity-specific statuses
<span className={STATUS_BADGES.entity.active}>Active</span>
<span className={STATUS_BADGES.entity.pending}>Pending</span>
<span className={STATUS_BADGES.entity.archived}>Archived</span>
```

### 2. Icon Containers
Circular icon backgrounds with semantic colors:

```tsx
import { ICON_CONTAINERS } from '@/config';

<div className={ICON_CONTAINERS.primary}>📊</div>
<div className={ICON_CONTAINERS.success}>✓</div>
<div className={ICON_CONTAINERS.warning}>⏳</div>
<div className={ICON_CONTAINERS.error}>✗</div>

// With sizes
<div className={ICON_CONTAINERS.sm}>🔔</div>
<div className={ICON_CONTAINERS.md}>🔔</div>
<div className={ICON_CONTAINERS.lg}>🔔</div>
```

### 3. Colors
Semantic color system for backgrounds, text, and borders:

```tsx
import { COLORS } from '@/config';

// Backgrounds
<div className={COLORS.background.primary}>Content</div>
<div className={COLORS.background.secondary}>Sidebar</div>

// Text
<p className={COLORS.text.primary}>Heading</p>
<p className={COLORS.text.secondary}>Body text</p>
<p className={COLORS.text.muted}>Caption</p>

// Brand colors
<button className={COLORS.brand.primary}>Primary CTA</button>
<div className={COLORS.brand.primaryLight}>Highlight</div>

// Semantic colors
<div className={COLORS.success.light}>Success message</div>
<div className={COLORS.error.light}>Error message</div>
<div className={COLORS.warning.light}>Warning message</div>
```

### 4. Layouts
Common flexbox and grid patterns:

```tsx
import { LAYOUTS } from '@/config';

// Flexbox
<div className={LAYOUTS.flex.center}>Centered content</div>
<div className={LAYOUTS.flex.centerBetween}>Navbar</div>
<div className={LAYOUTS.flex.column}>Vertical stack</div>

// Grids
<div className={LAYOUTS.grid.cols2}>Two column grid</div>
<div className={LAYOUTS.grid.cols3}>Three column grid</div>

// Containers
<div className={LAYOUTS.container.default}>Standard width</div>
<div className={LAYOUTS.container.narrow}>Blog post width</div>
```

### 5. Typography
Consistent text sizing and hierarchy:

```tsx
import { TYPOGRAPHY } from '@/config';

<h1 className={TYPOGRAPHY.h1}>Main Heading</h1>
<h2 className={TYPOGRAPHY.h2}>Section Heading</h2>
<p className={TYPOGRAPHY.body.default}>Body text</p>
<p className={TYPOGRAPHY.body.small}>Small text</p>
<span className={TYPOGRAPHY.muted}>Metadata</span>
<code className={TYPOGRAPHY.code}>Code snippet</code>
```

### 6. Cards
Reusable card styling patterns:

```tsx
import { CARDS } from '@/config';

<div className={CARDS.default}>Standard card</div>
<div className={CARDS.elevated}>Elevated card with shadow</div>
<div className={CARDS.interactive}>Clickable card</div>
<div className={CARDS.flat}>Flat background card</div>
```

### 7. Spacing
Standardized padding, margin, and gap values:

```tsx
import { SPACING } from '@/config';

<div className={SPACING.padding.md}>Content</div>
<div className={SPACING.margin.lg}>Spaced element</div>
<div className={SPACING.gap.sm}>Flex container</div>
<div className={SPACING.space.md}>Stack</div>
```

### 8. Animations
Consistent transition and animation utilities:

```tsx
import { ANIMATIONS } from '@/config';

<button className={ANIMATIONS.transition.default}>Smooth transition</button>
<div className={ANIMATIONS.hover.scale}>Scale on hover</div>
<div className={ANIMATIONS.hover.lift}>Lift on hover</div>
<div className={ANIMATIONS.loading}>Loading pulse</div>
```

### 9. Accessibility
WCAG-compliant focus and screen reader utilities:

```tsx
import { A11Y } from '@/config';

<button className={A11Y.focusRing}>Accessible button</button>
<button className={A11Y.focusVisible}>Modern focus visible</button>
<span className={A11Y.srOnly}>Screen reader only text</span>
```

### 10. Button Variants & Sizes
Extended button styling (matches Button component):

```tsx
import { BUTTON_VARIANTS, BUTTON_SIZES } from '@/config';

// Use with custom buttons or <a> tags styled as buttons
<a href="/action" className={`${BUTTON_VARIANTS.primary} ${BUTTON_SIZES.md}`}>
  Link styled as button
</a>

<div className={`${BUTTON_VARIANTS.danger} ${BUTTON_SIZES.lg}`}>
  Custom clickable element
</div>
```

## Advanced Usage

### Combining Tokens

```tsx
import { combineTokens, LAYOUTS, SPACING, COLORS } from '@/config';

<div className={combineTokens(
  LAYOUTS.flex.centerBetween,
  SPACING.padding.lg,
  COLORS.background.elevated
)}>
  Complex component
</div>
```

### Dynamic Styling

```tsx
import { STATUS_BADGES } from '@/config';

const getStatusBadge = (status: EntityStatus) => {
  return STATUS_BADGES.entity[status];
};

<span className={getStatusBadge(entity.status)}>
  {entity.status}
</span>
```

### Custom Extensions

You can extend the design tokens for domain-specific needs:

```tsx
// In your component file
import { COLORS } from '@/config';

const MEDICATION_STATUS_BADGES = {
  prescribed: COLORS.info.light + ' px-2 py-1 rounded',
  dispensed: COLORS.success.light + ' px-2 py-1 rounded',
  discontinued: COLORS.error.light + ' px-2 py-1 rounded',
} as const;
```

## Migration Guide

### Migrating Existing Components

1. **Find repeated Tailwind classes** in your component
2. **Search design-tokens.ts** for matching pattern
3. **Replace** with token constant
4. **Import** from `@/config`

Example:

```diff
- import { cn } from '@/lib/utils';
+ import { STATUS_BADGES } from '@/config';

- <span className={cn(
-   'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
-   'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
- )}>
+ <span className={STATUS_BADGES.success}>
```

## Benefits

### Type Safety
- ✅ TypeScript autocomplete shows all available tokens
- ✅ Typos caught at compile time
- ✅ Refactoring tools work across codebase

### Maintainability
- ✅ Single source of truth for all styling
- ✅ Easy to update theme colors globally
- ✅ Consistent dark mode support

### Developer Experience
- ✅ Less code to write (50% reduction in className length)
- ✅ Faster development with autocomplete
- ✅ Easier code reviews (semantic names vs Tailwind classes)

### Performance
- ✅ No runtime overhead (constants compiled away)
- ✅ Better tree-shaking potential
- ✅ Smaller bundle size from reduced duplication

## Best Practices

1. **Always use tokens for repeated patterns** (3+ occurrences)
2. **Prefer semantic tokens** over raw Tailwind classes
3. **Extend tokens** rather than creating inline styles
4. **Document custom extensions** in component files
5. **Keep design-tokens.ts** in sync across templates

## Common Patterns

### Status Indicators

```tsx
import { STATUS_BADGES } from '@/config';

const StatusBadge = ({ status }: { status: string }) => (
  <span className={STATUS_BADGES[status] || STATUS_BADGES.neutral}>
    {status}
  </span>
);
```

### Stat Cards

```tsx
import { ICON_CONTAINERS, LAYOUTS } from '@/config';

const StatCard = ({ value, label, variant }) => (
  <div className={LAYOUTS.flex.centerBetween}>
    <div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
    <div className={ICON_CONTAINERS[variant]}>
      {/* Icon */}
    </div>
  </div>
);
```

### Form States

```tsx
import { INPUT_STATES } from '@/config';

const Input = ({ error, ...props }) => (
  <input
    className={`base-input-classes ${error ? INPUT_STATES.error : INPUT_STATES.default}`}
    {...props}
  />
);
```

## Related Documentation

- [Architecture Overview](./ARCHITECTURE.md) - System architecture and design decisions
- [Components Reference](./COMPONENTS_REFERENCE.md) - UI component library documentation
- [Configuration Guide](./CONFIGURATION.md) - Configuration system overview
- [Hooks Reference](./HOOKS_REFERENCE.md) - Custom hooks documentation
- [Performance Guide](./PERFORMANCE.md) - Performance optimization strategies

## Support

If you need to add new design tokens:

1. Add to `src/config/design-tokens.ts`
2. Export from `src/config/index.ts`
3. Update this documentation
4. Submit PR for team review
