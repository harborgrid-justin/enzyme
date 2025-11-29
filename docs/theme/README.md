# Theme System

> Comprehensive theming system with dark mode, design tokens, and CSS variables

## Overview

The Enzyme theme system provides a powerful, flexible, and performant way to manage application theming. It includes support for light and dark modes, comprehensive design tokens, CSS variables for dynamic theming, and seamless integration with all UI components.

## Features

- **Light and Dark Modes**: Pre-built color palettes optimized for both themes
- **System Preference Detection**: Automatic theme detection from OS settings
- **Theme Persistence**: Saves user preference to localStorage
- **Feature Flag Integration**: Dark mode can be toggled via feature flags
- **CSS Variables**: Dynamic theming with CSS custom properties
- **Design Tokens**: Comprehensive token system for spacing, colors, typography, and more
- **Type Safety**: Full TypeScript support with comprehensive types
- **Performance Optimized**: Memoized context values and minimal re-renders
- **Accessibility**: WCAG AA compliant color combinations

## Architecture

The theme system consists of four main parts:

1. **ThemeProvider**: Context provider that manages theme state
2. **Design Tokens**: Semantic design values (spacing, colors, typography, etc.)
3. **Color Palettes**: Light and dark color schemes
4. **CSS Variables**: Runtime-switchable color values

### File Structure

```
/home/user/enzyme/src/lib/theme/
├── ThemeProvider.tsx       # Theme context provider
├── types.ts                # TypeScript type definitions
├── tokens.ts               # Design token definitions
├── palettes/
│   ├── light.ts           # Light mode color palette
│   ├── dark.ts            # Dark mode color palette
│   └── index.ts           # Palette exports
└── index.ts               # Public exports
```

## Quick Start

### 1. Wrap Your App

```typescript
import { ThemeProvider } from '@missionfabric-js/enzyme';

function App() {
  return (
    <ThemeProvider>
      <YourApp />
    </ThemeProvider>
  );
}
```

### 2. Use Theme Tokens

```typescript
import { tokens, colorTokens } from '@missionfabric-js/enzyme';

function MyComponent() {
  return (
    <div
      style={{
        padding: tokens.spacing.md,
        backgroundColor: colorTokens.background.primary,
        borderRadius: tokens.radius.lg,
      }}
    >
      Content
    </div>
  );
}
```

### 3. Access Theme Context

```typescript
import { useThemeContext } from '@missionfabric-js/enzyme';

function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useThemeContext();

  return (
    <button onClick={toggleTheme}>
      {resolvedTheme === 'dark' ? '🌙' : '☀️'}
    </button>
  );
}
```

## Theme Modes

The theme system supports three modes:

### Light Mode
- Default theme
- Optimized for daylight viewing
- High contrast for readability
- Light backgrounds with dark text

### Dark Mode
- Reduced eye strain in low light
- OLED-friendly dark backgrounds
- Inverted color palette
- Maintained contrast ratios

### System Mode
- Automatically matches OS preference
- Detects `prefers-color-scheme` media query
- Updates when system preference changes
- Default behavior if no preference stored

## Color System

### Semantic Color Tokens

The theme uses semantic color tokens that adapt to the current theme:

```typescript
colorTokens.primary.default    // Primary brand color
colorTokens.text.primary       // Primary text color
colorTokens.background.primary // Primary background color
colorTokens.success.default    // Success indicator color
colorTokens.error.default      // Error indicator color
```

### CSS Variables

All colors are available as CSS variables for runtime theming:

```css
var(--color-primary-500)
var(--color-bg-primary)
var(--color-text-primary)
var(--color-border-default)
```

### Color Palettes

Each palette includes:
- Primary colors (50-900 scale)
- Secondary colors (50-900 scale)
- Semantic colors (success, warning, error, info)
- Neutral colors (50-900 scale)
- Background colors (primary, secondary, tertiary)
- Text colors (primary, secondary, muted)
- Border colors (default, muted, emphasis)

## Design Tokens

Design tokens provide consistent values across your application:

### Spacing
```typescript
tokens.spacing.xs   // 0.25rem (4px)
tokens.spacing.sm   // 0.5rem (8px)
tokens.spacing.md   // 1rem (16px)
tokens.spacing.lg   // 1.5rem (24px)
tokens.spacing.xl   // 2rem (32px)
```

### Typography
```typescript
tokens.fontSize.xs    // 0.75rem (12px)
tokens.fontSize.base  // 1rem (16px)
tokens.fontSize['2xl'] // 1.5rem (24px)
tokens.fontWeight.medium // 500
tokens.fontWeight.bold   // 700
```

### Border Radius
```typescript
tokens.radius.sm   // 0.125rem (2px)
tokens.radius.md   // 0.25rem (4px)
tokens.radius.lg   // 0.5rem (8px)
tokens.radius.full // 9999px
```

### Shadows
```typescript
tokens.shadow.sm  // Subtle shadow
tokens.shadow.md  // Medium shadow
tokens.shadow.lg  // Large shadow
```

### Z-Index
```typescript
tokens.zIndex.dropdown // 100
tokens.zIndex.modal    // 300
tokens.zIndex.toast    // 600
```

## Accessibility

The theme system ensures WCAG compliance:

### Color Contrast
- All text colors meet WCAG AA standards (4.5:1 minimum)
- Large text meets AAA standards where possible
- Interactive elements have sufficient contrast
- Focus indicators are clearly visible

### Light Mode Contrast Ratios
- Primary text: 16.1:1 (AAA)
- Secondary text: 6.0:1 (AA)
- Tertiary text: 4.6:1 (AA)
- Muted text: 5.0:1 (AA)

### Dark Mode Contrast Ratios
- Primary text: 15.8:1 (AAA)
- Secondary text: 9.0:1 (AAA)
- Tertiary text: 5.5:1 (AA)
- Muted text: 4.8:1 (AA)

## Best Practices

### 1. Always Use Tokens

```typescript
// Good
padding: tokens.spacing.md

// Avoid
padding: '16px'
```

### 2. Use Semantic Colors

```typescript
// Good
color: colorTokens.text.primary
backgroundColor: colorTokens.success.lighter

// Avoid
color: '#000000'
backgroundColor: '#dcfce7'
```

### 3. Test Both Themes

Always test your UI in both light and dark modes to ensure proper contrast and readability.

### 4. Respect User Preferences

Don't force a theme. Allow users to choose their preference or follow system settings.

### 5. Use CSS Variables for Dynamic Values

```typescript
// Good - adapts to theme changes
backgroundColor: 'var(--color-bg-primary)'

// Works but doesn't adapt
backgroundColor: colorTokens.background.primary
```

## Feature Flag Integration

The theme system integrates with feature flags:

```typescript
// In your flag configuration
export const flagKeys = {
  DARK_MODE: 'dark-mode',
};

// When dark mode flag is disabled:
// - Theme is forced to light mode
// - Theme toggle is disabled
// - User preference is ignored
```

This allows gradual rollout or A/B testing of dark mode.

## Performance

The theme system is optimized for performance:

- Context values memoized to prevent unnecessary re-renders
- Theme changes batched with microtask queue
- CSS variables updated without JavaScript re-renders
- Static token values don't trigger updates
- Minimal DOM operations on theme switch

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- IE11: Not supported (CSS variables required)

## Migration Guide

### From Inline Styles

```typescript
// Before
<div style={{ padding: '16px', color: '#000' }}>

// After
<div style={{
  padding: tokens.spacing.md,
  color: colorTokens.text.primary
}}>
```

### From Tailwind Classes

```typescript
// Before
<div className="p-4 bg-white text-black">

// After
<div style={{
  padding: tokens.spacing.md,
  backgroundColor: colorTokens.background.primary,
  color: colorTokens.text.primary
}}>
```

### From CSS Modules

```css
/* styles.module.css - Before */
.container {
  padding: 16px;
  background: white;
}

/* After - Use CSS variables */
.container {
  padding: var(--spacing-md);
  background: var(--color-bg-primary);
}
```

## Documentation

For detailed information, see:

- [Theme Provider](/home/user/enzyme/docs/theme/PROVIDER.md) - Setup and configuration
- [Design Tokens](/home/user/enzyme/docs/theme/DESIGN_TOKENS.md) - Complete token reference
- [Type Definitions](/home/user/enzyme/docs/theme/TYPES.md) - TypeScript types

## Examples

See the theme examples directory for complete usage examples:
- Basic theme setup
- Custom theme provider
- Dark mode toggle
- Theme-aware components
- CSS variable usage

## Troubleshooting

### Theme Not Changing

1. Ensure `ThemeProvider` wraps your app
2. Check that dark mode feature flag is enabled
3. Verify CSS variables are properly loaded
4. Check browser DevTools for theme class on `<html>`

### Colors Not Updating

1. Use CSS variables instead of token values for dynamic colors
2. Ensure components re-render on theme change
3. Check that color tokens reference CSS variables

### Performance Issues

1. Memoize components using theme values
2. Avoid inline style objects (extract to constants)
3. Use CSS variables for frequently changing values
4. Profile with React DevTools to find re-render issues
