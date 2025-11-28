# Theming Module

> **Module**: `@/lib/theme`
> Theme management, design tokens, and color palettes for the Harbor React Library.

## Overview

The theming module provides comprehensive theming infrastructure:

- **ThemeProvider** - React context for theme state
- **Design Tokens** - Consistent spacing, typography, colors
- **Palettes** - Light/dark mode color schemes
- **CSS Variables** - Runtime theme switching

## Key Exports

```typescript
import {
  // Provider
  ThemeProvider,
  useTheme,

  // Tokens
  tokens,
  spacing,
  typography,
  colors,

  // Palettes
  lightPalette,
  darkPalette,

  // Utilities
  createTheme,
  mergeThemes,
} from '@/lib/theme';
```

## Usage

### Theme Provider

```typescript
import { ThemeProvider } from '@/lib/theme';

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="app-theme">
      <MainContent />
    </ThemeProvider>
  );
}
```

### Using Theme Hook

```typescript
function ThemedButton() {
  const { theme, setTheme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      style={{
        background: theme === 'dark' ? colors.dark.bg : colors.light.bg
      }}
    >
      Current: {theme}
    </button>
  );
}
```

### Design Tokens

```typescript
import { tokens, spacing, typography } from '@/lib/theme';

const styles = {
  container: {
    padding: spacing.md,        // 1rem
    marginBottom: spacing.lg,   // 1.5rem
    fontSize: typography.base,  // 1rem
    fontWeight: typography.medium,
  },
};
```

### Custom Theme

```typescript
const customTheme = createTheme({
  colors: {
    primary: '#3b82f6',
    secondary: '#6366f1',
  },
  spacing: {
    unit: 4, // 4px base unit
  },
});

<ThemeProvider theme={customTheme}>
  <App />
</ThemeProvider>
```

## CSS Variables

The theme system exposes CSS variables for use in stylesheets:

```css
.card {
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
}
```

## Related Documentation

- [Configuration Guide](../CONFIGURATION.md)
- [Design System](../../../../docs/DESIGN_SYSTEM.md)
- [Accessibility](../../../styles/accessibility.css)
