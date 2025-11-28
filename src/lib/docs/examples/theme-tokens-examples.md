# Theme Tokens Examples

> **Module**: `@/lib/theme`
> **Key Exports**: `tokens`, `colorTokens`, `useTheme`, `ThemeProvider`

This guide provides comprehensive examples for using the theme token system.

---

## Table of Contents

- [Basic Token Usage](#basic-token-usage)
- [Color Tokens](#color-tokens)
- [Spacing Tokens](#spacing-tokens)
- [Typography Tokens](#typography-tokens)
- [Component Styling](#component-styling)
- [Dark Mode](#dark-mode)
- [Custom Themes](#custom-themes)
- [CSS Variables](#css-variables)

---

## Basic Token Usage

### Importing Tokens

```tsx
import { tokens, colorTokens } from '@/lib/theme/tokens';

// Use in inline styles
const style = {
  padding: tokens.spacing[4],
  fontSize: tokens.fontSize.base,
  borderRadius: tokens.radius.md,
  color: colorTokens.text.primary,
};
```

### Token Categories

```tsx
import { tokens } from '@/lib/theme/tokens';

// Spacing: 0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64
tokens.spacing[4]  // '1rem' (16px)

// Font Size: xs, sm, base, lg, xl, 2xl, 3xl, 4xl, 5xl
tokens.fontSize.base  // '1rem'

// Font Weight: normal, medium, semibold, bold
tokens.fontWeight.semibold  // 600

// Border Radius: none, sm, md, lg, xl, 2xl, full
tokens.radius.md  // '0.375rem'

// Shadows: none, sm, md, lg, xl, 2xl, inner
tokens.shadow.md  // '0 4px 6px -1px rgba(0, 0, 0, 0.1)'

// Z-Index: dropdown, sticky, fixed, modal, popover, tooltip, toast
tokens.zIndex.modal  // '300'
```

---

## Color Tokens

### Semantic Colors

```tsx
import { colorTokens } from '@/lib/theme/tokens';

// Primary colors (blue)
colorTokens.primary.default      // '#3b82f6'
colorTokens.primary.light        // '#60a5fa'
colorTokens.primary.dark         // '#2563eb'

// Status colors
colorTokens.success.default      // '#22c55e'
colorTokens.warning.default      // '#f59e0b'
colorTokens.error.default        // '#ef4444'
colorTokens.info.default         // '#06b6d4'

// Neutral grays
colorTokens.neutral[50]          // '#f9fafb'
colorTokens.neutral[500]         // '#6b7280'
colorTokens.neutral[900]         // '#111827'
```

### Text Colors

```tsx
// Text colors for different purposes
colorTokens.text.primary         // Main text
colorTokens.text.secondary       // Supporting text
colorTokens.text.muted           // Disabled/placeholder text
colorTokens.text.inverse         // Text on dark backgrounds
```

### Background Colors

```tsx
// Background colors
colorTokens.background.default   // Main background
colorTokens.background.muted     // Subtle background
colorTokens.background.paper     // Card/elevated surfaces
```

### Interactive States

```tsx
// Interactive element states
colorTokens.interactive.hover    // Hover state
colorTokens.interactive.pressed  // Active/pressed state
colorTokens.interactive.selected // Selected item
colorTokens.interactive.disabled // Disabled state
```

---

## Spacing Tokens

### Using Spacing Scale

```tsx
import { tokens } from '@/lib/theme/tokens';

function Card({ children }) {
  return (
    <div
      style={{
        padding: tokens.spacing[6],        // 1.5rem (24px)
        margin: tokens.spacing[4],         // 1rem (16px)
        gap: tokens.spacing[3],            // 0.75rem (12px)
      }}
    >
      {children}
    </div>
  );
}
```

### Spacing Reference

```tsx
// Complete spacing scale
const spacingExamples = {
  px: tokens.spacing.px,    // '1px'
  0: tokens.spacing[0],     // '0'
  0.5: tokens.spacing[0.5], // '0.125rem' (2px)
  1: tokens.spacing[1],     // '0.25rem' (4px)
  2: tokens.spacing[2],     // '0.5rem' (8px)
  3: tokens.spacing[3],     // '0.75rem' (12px)
  4: tokens.spacing[4],     // '1rem' (16px)
  5: tokens.spacing[5],     // '1.25rem' (20px)
  6: tokens.spacing[6],     // '1.5rem' (24px)
  8: tokens.spacing[8],     // '2rem' (32px)
  10: tokens.spacing[10],   // '2.5rem' (40px)
  12: tokens.spacing[12],   // '3rem' (48px)
  16: tokens.spacing[16],   // '4rem' (64px)
};
```

---

## Typography Tokens

### Font Sizes

```tsx
import { tokens } from '@/lib/theme/tokens';

function Typography() {
  return (
    <div>
      <h1 style={{ fontSize: tokens.fontSize['4xl'] }}>Heading 1</h1>
      <h2 style={{ fontSize: tokens.fontSize['3xl'] }}>Heading 2</h2>
      <h3 style={{ fontSize: tokens.fontSize['2xl'] }}>Heading 3</h3>
      <p style={{ fontSize: tokens.fontSize.base }}>Body text</p>
      <small style={{ fontSize: tokens.fontSize.sm }}>Small text</small>
    </div>
  );
}
```

### Font Weights

```tsx
function TextWeights() {
  return (
    <div>
      <p style={{ fontWeight: tokens.fontWeight.normal }}>Normal (400)</p>
      <p style={{ fontWeight: tokens.fontWeight.medium }}>Medium (500)</p>
      <p style={{ fontWeight: tokens.fontWeight.semibold }}>Semibold (600)</p>
      <p style={{ fontWeight: tokens.fontWeight.bold }}>Bold (700)</p>
    </div>
  );
}
```

### Line Heights

```tsx
function LineHeights() {
  return (
    <div>
      <p style={{ lineHeight: tokens.lineHeight.none }}>None (1)</p>
      <p style={{ lineHeight: tokens.lineHeight.tight }}>Tight (1.25)</p>
      <p style={{ lineHeight: tokens.lineHeight.normal }}>Normal (1.5)</p>
      <p style={{ lineHeight: tokens.lineHeight.relaxed }}>Relaxed (1.625)</p>
    </div>
  );
}
```

---

## Component Styling

### Button with Tokens

```tsx
import { tokens, colorTokens } from '@/lib/theme/tokens';

function StyledButton({ variant = 'primary', children }) {
  const baseStyles = {
    padding: `${tokens.spacing[2]} ${tokens.spacing[4]}`,
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.medium,
    borderRadius: tokens.radius.md,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
  };

  const variantStyles = {
    primary: {
      backgroundColor: colorTokens.primary.default,
      color: colorTokens.text.inverse,
    },
    secondary: {
      backgroundColor: colorTokens.background.muted,
      color: colorTokens.text.primary,
    },
    outline: {
      backgroundColor: 'transparent',
      color: colorTokens.primary.default,
      border: `1px solid ${colorTokens.border.default}`,
    },
  };

  return (
    <button style={{ ...baseStyles, ...variantStyles[variant] }}>
      {children}
    </button>
  );
}
```

### Card Component

```tsx
function TokenCard({ title, children }) {
  return (
    <div
      style={{
        backgroundColor: colorTokens.background.paper,
        borderRadius: tokens.radius.lg,
        padding: tokens.spacing[6],
        boxShadow: tokens.shadow.md,
        border: `1px solid ${colorTokens.border.subtle}`,
      }}
    >
      <h3
        style={{
          fontSize: tokens.fontSize.lg,
          fontWeight: tokens.fontWeight.semibold,
          color: colorTokens.text.primary,
          marginBottom: tokens.spacing[4],
        }}
      >
        {title}
      </h3>
      <div style={{ color: colorTokens.text.secondary }}>{children}</div>
    </div>
  );
}
```

### Input Field

```tsx
function TokenInput({ label, error, ...props }) {
  return (
    <div style={{ marginBottom: tokens.spacing[4] }}>
      <label
        style={{
          display: 'block',
          fontSize: tokens.fontSize.sm,
          fontWeight: tokens.fontWeight.medium,
          color: colorTokens.text.primary,
          marginBottom: tokens.spacing[1],
        }}
      >
        {label}
      </label>
      <input
        style={{
          width: '100%',
          padding: `${tokens.spacing[2]} ${tokens.spacing[3]}`,
          fontSize: tokens.fontSize.base,
          borderRadius: tokens.radius.md,
          border: `1px solid ${error ? colorTokens.error.default : colorTokens.border.default}`,
          outline: 'none',
        }}
        {...props}
      />
      {error && (
        <span
          style={{
            display: 'block',
            fontSize: tokens.fontSize.sm,
            color: colorTokens.error.default,
            marginTop: tokens.spacing[1],
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
}
```

---

## Dark Mode

### Theme Provider Setup

```tsx
import { ThemeProvider, useTheme } from '@/lib/theme';

function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <MyApp />
    </ThemeProvider>
  );
}
```

### Using Theme Hook

```tsx
import { useTheme } from '@/lib/theme';

function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <div>
      <p>Current theme: {resolvedTheme}</p>
      <button onClick={() => setTheme('light')}>Light</button>
      <button onClick={() => setTheme('dark')}>Dark</button>
      <button onClick={() => setTheme('system')}>System</button>
    </div>
  );
}
```

### Theme-Aware Component

```tsx
import { useTheme } from '@/lib/theme';
import { colorTokens } from '@/lib/theme/tokens';

function ThemeAwareCard({ children }) {
  const { resolvedTheme } = useTheme();

  // Colors automatically adapt based on CSS variables
  // when theme changes
  return (
    <div
      style={{
        backgroundColor: colorTokens.background.paper,
        color: colorTokens.text.primary,
        borderRadius: tokens.radius.lg,
        padding: tokens.spacing[4],
      }}
    >
      {children}
    </div>
  );
}
```

---

## Custom Themes

### Extending Default Tokens

```tsx
import { tokens, colorTokens } from '@/lib/theme/tokens';

// Custom color palette
const customColors = {
  ...colorTokens,
  brand: {
    primary: '#6366f1',    // Indigo
    secondary: '#8b5cf6',  // Violet
    accent: '#ec4899',     // Pink
  },
};

// Use custom colors
function BrandButton({ children }) {
  return (
    <button
      style={{
        backgroundColor: customColors.brand.primary,
        color: 'white',
        padding: `${tokens.spacing[2]} ${tokens.spacing[4]}`,
        borderRadius: tokens.radius.md,
      }}
    >
      {children}
    </button>
  );
}
```

### Creating Theme Variants

```tsx
const themes = {
  default: {
    primary: colorTokens.primary.default,
    background: colorTokens.background.default,
    text: colorTokens.text.primary,
  },
  ocean: {
    primary: '#0891b2',
    background: '#ecfeff',
    text: '#164e63',
  },
  forest: {
    primary: '#16a34a',
    background: '#f0fdf4',
    text: '#14532d',
  },
};

function ThemedComponent({ theme = 'default', children }) {
  const colors = themes[theme];

  return (
    <div
      style={{
        backgroundColor: colors.background,
        color: colors.text,
      }}
    >
      {children}
    </div>
  );
}
```

---

## CSS Variables

### Token CSS Variables

```css
/* Generated CSS variables from tokens */
:root {
  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  --spacing-4: 1rem;

  --color-primary: #3b82f6;
  --color-text-primary: #111827;
  --color-background: #ffffff;

  --radius-md: 0.375rem;
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

[data-theme='dark'] {
  --color-text-primary: #f9fafb;
  --color-background: #111827;
}
```

### Using CSS Variables in Components

```tsx
function CSSVarComponent() {
  return (
    <div
      style={{
        padding: 'var(--spacing-4)',
        color: 'var(--color-text-primary)',
        backgroundColor: 'var(--color-background)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      Using CSS Variables
    </div>
  );
}
```

---

## See Also

- [Button Examples](./button-examples.md)
- [Accessibility Examples](./accessibility-examples.md)
- [Performance Examples](./performance-examples.md)
