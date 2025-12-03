# Theme Module

> **Purpose:** Centralized theming system with dark mode support, design tokens, and CSS variable management.

## Overview

The Theme module provides a comprehensive theming solution for React applications with support for multiple color
schemes (light, dark, system), design tokens for consistent spacing and typography, and seamless integration with CSS
variables for runtime theme switching.

Built on modern CSS custom properties, this module allows you to define your design system once and apply it
consistently across your entire application. It includes pre-built light and dark palettes, automatic system preference
detection, persistent theme selection, and TypeScript support for type-safe theme access.

Perfect for applications requiring dark mode, custom branding, or white-label solutions, this module provides the
foundation for a consistent, accessible, and maintainable design system.

## Key Features

- Light and dark theme support
- System preference detection (prefers-color-scheme)
- Persistent theme selection (localStorage)
- CSS custom properties for all design tokens
- Design tokens for colors, spacing, typography, shadows, borders
- Type-safe theme access with TypeScript
- Runtime theme switching without page reload
- Custom theme palettes
- Theme inheritance and overrides
- SSR compatible
- Accessibility (WCAG contrast ratios)
- Minimal bundle size (~2KB gzipped)

## Quick Start

```tsx
import { ThemeProvider, useThemeContext } from '@/lib/theme';

// 1. Wrap app with ThemeProvider
function App() {
  return (
    <ThemeProvider>
      <YourApp />
    </ThemeProvider>
  );
}

// 2. Use theme in components
function ThemeToggle() {
  const { mode, setMode, resolvedTheme } = useThemeContext();

  return (
    <div>
      <p>Current theme: {resolvedTheme}</p>
      <button onClick={() => setMode('light')}>Light</button>
      <button onClick={() => setMode('dark')}>Dark</button>
      <button onClick={() => setMode('system')}>System</button>
    </div>
  );
}

// 3. Access theme tokens
function StyledComponent() {
  const { tokens } = useThemeContext();

  return (
    <div style={{
      padding: tokens.spacing.md,
      borderRadius: tokens.radius.md,
      backgroundColor: 'var(--color-bg-primary)',
      color: 'var(--color-text-primary)',
    }}>
      Themed content
    </div>
  );
}
```

## Exports

### Components

- `ThemeProvider` - Context provider for theme system

### Hooks

- `useThemeContext` - Access theme state and methods

### Palettes

- `lightPalette` - Light theme color palette
- `darkPalette` - Dark theme color palette

### Tokens

- `tokens` - Design token object
    - `spacing` - Spacing scale (xs, sm, md, lg, xl, xxl)
    - `radius` - Border radius values
    - `fontSize` - Font size scale
    - `fontWeight` - Font weight values
    - `lineHeight` - Line height values
    - `shadow` - Box shadow presets
    - `breakpoint` - Responsive breakpoints
    - `zIndex` - Z-index scale

### Types

- `ThemeMode` - Theme mode ('light' | 'dark' | 'system')
- `ResolvedTheme` - Actual theme ('light' | 'dark')
- `ThemeConfig` - Theme configuration
- `ThemeContextValue` - Context value type
- `ColorPalette` - Color palette structure
- `DesignTokens` - Design token structure
- `Tokens` - Token object type
- `SpacingToken` - Spacing value type
- `RadiusToken` - Radius value type
- `FontSizeToken` - Font size value type

## Architecture

The theme module uses CSS custom properties for runtime theming:

```
┌──────────────────────────────────────┐
│       ThemeProvider (React)           │
│   Manages mode, persistence, system  │
└─────────────────┬────────────────────┘
                  │
┌─────────────────┴────────────────────┐
│      CSS Custom Properties            │
│  --color-bg-primary, --spacing-md    │
└─────────────────┬────────────────────┘
                  │
┌─────────────────┴────────────────────┐
│      Components & Styles              │
│   Use var(--color-bg-primary)        │
└──────────────────────────────────────┘
```

### Integration Points

- **UI Module**: All components use theme tokens
- **State Module**: Theme preference stored in settings slice
- **Performance**: CSS variables avoid style recalculation

## Common Patterns

### Pattern 1: Theme Toggle Button

```tsx
import { useThemeContext } from '@/lib/theme';

function ThemeToggle() {
  const { mode, setMode, resolvedTheme } = useThemeContext();

  const toggleTheme = () => {
    setMode(mode === 'light' ? 'dark' : 'light');
  };

  return (
    <button onClick={toggleTheme} aria-label="Toggle theme">
      {resolvedTheme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}
```

### Pattern 2: Using Design Tokens

```tsx
import { tokens } from '@/lib/theme';

function Card({ children }) {
  return (
    <div
      style={{
        padding: tokens.spacing.lg,
        borderRadius: tokens.radius.md,
        boxShadow: tokens.shadow.md,
        backgroundColor: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
      }}
    >
      {children}
    </div>
  );
}
```

### Pattern 3: Custom Theme Palette

```tsx
import { ThemeProvider } from '@/lib/theme';

const customPalette = {
  light: {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    bg: {
      primary: '#ffffff',
      secondary: '#f9fafb',
      tertiary: '#f3f4f6',
    },
    text: {
      primary: '#111827',
      secondary: '#6b7280',
      tertiary: '#9ca3af',
    },
    // ... more colors
  },
  dark: {
    primary: '#818cf8',
    secondary: '#a78bfa',
    bg: {
      primary: '#111827',
      secondary: '#1f2937',
      tertiary: '#374151',
    },
    text: {
      primary: '#f9fafb',
      secondary: '#d1d5db',
      tertiary: '#9ca3af',
    },
    // ... more colors
  },
};

function App() {
  return (
    <ThemeProvider palette={customPalette}>
      <YourApp />
    </ThemeProvider>
  );
}
```

### Pattern 4: System Theme with Override

```tsx
import { ThemeProvider } from '@/lib/theme';

function App() {
  return (
    <ThemeProvider
      defaultMode="system" // Follow system preference
      storageKey="app-theme" // Persist user override
    >
      <YourApp />
    </ThemeProvider>
  );
}

// User can override system preference
function Settings() {
  const { mode, setMode } = useThemeContext();

  return (
    <div>
      <label>
        <input
          type="radio"
          checked={mode === 'system'}
          onChange={() => setMode('system')}
        />
        System
      </label>
      <label>
        <input
          type="radio"
          checked={mode === 'light'}
          onChange={() => setMode('light')}
        />
        Light
      </label>
      <label>
        <input
          type="radio"
          checked={mode === 'dark'}
          onChange={() => setMode('dark')}
        />
        Dark
      </label>
    </div>
  );
}
```

### Pattern 5: Theme-Aware Components

```tsx
import { useThemeContext } from '@/lib/theme';

function Logo() {
  const { resolvedTheme } = useThemeContext();

  return (
    <img
      src={resolvedTheme === 'light' ? '/logo-light.svg' : '/logo-dark.svg'}
      alt="Logo"
    />
  );
}

// Or use CSS variables
function AdaptiveImage() {
  return (
    <div
      style={{
        backgroundImage: resolvedTheme === 'light'
          ? 'url(/bg-light.jpg)'
          : 'url(/bg-dark.jpg)',
      }}
    />
  );
}
```

### Pattern 6: Responsive Design with Tokens

```tsx
import { tokens } from '@/lib/theme';

function ResponsiveGrid() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: tokens.spacing.lg,
        padding: tokens.spacing.md,

        [`@media (min-width: ${tokens.breakpoint.md})`]: {
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: tokens.spacing.xl,
        },
      }}
    >
      <Card />
      <Card />
      <Card />
    </div>
  );
}
```

## Configuration

### Theme Provider Configuration

```tsx
import { ThemeProvider } from '@/lib/theme';

<ThemeProvider
  // Initial theme mode
  defaultMode="system" // 'light' | 'dark' | 'system'

  // Storage key for persistence
  storageKey="app-theme"

  // Custom color palettes
  palette={{
    light: lightPalette,
    dark: darkPalette,
  }}

  // Disable persistence
  disableTransition={false} // Smooth theme transition

  // Custom tokens
  tokens={{
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      xxl: '3rem',
    },
    // ... more tokens
  }}
>
  <App />
</ThemeProvider>
```

### CSS Variables Reference

```css
/* Background colors */
--color-bg-primary
--color-bg-secondary
--color-bg-tertiary
--color-bg-card
--color-bg-overlay

/* Text colors */
--color-text-primary
--color-text-secondary
--color-text-tertiary
--color-text-inverse

/* Border colors */
--color-border
--color-border-hover
--color-border-focus

/* Brand colors */
--color-primary
--color-primary-hover
--color-secondary
--color-secondary-hover

/* Semantic colors */
--color-success
--color-warning
--color-error
--color-info

/* Spacing */
--spacing-xs
--spacing-sm
--spacing-md
--spacing-lg
--spacing-xl
--spacing-xxl

/* Border radius */
--radius-sm
--radius-md
--radius-lg
--radius-full

/* Shadows */
--shadow-sm
--shadow-md
--shadow-lg

/* Typography */
--font-size-xs
--font-size-sm
--font-size-md
--font-size-lg
--font-size-xl
```

## Testing

### Testing Theme Context

```tsx
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/lib/theme';

function renderWithTheme(ui, { mode = 'light' } = {}) {
  return render(
    <ThemeProvider defaultMode={mode}>
      {ui}
    </ThemeProvider>
  );
}

describe('ThemedComponent', () => {
  it('renders in light mode', () => {
    renderWithTheme(<ThemedComponent />);
    expect(screen.getByTestId('component')).toHaveClass('light');
  });

  it('renders in dark mode', () => {
    renderWithTheme(<ThemedComponent />, { mode: 'dark' });
    expect(screen.getByTestId('component')).toHaveClass('dark');
  });
});
```

## Performance Considerations

1. **CSS Variables**: Native browser support, no JavaScript overhead
2. **Bundle Size**: ~2KB gzipped (minimal)
3. **Rendering**: Theme changes don't trigger re-renders
4. **Persistence**: localStorage is sync, no async overhead
5. **Transitions**: Optional smooth transitions (~200ms)

## Troubleshooting

### Issue: Theme Not Persisting

**Solution:** Ensure storageKey is set:

```tsx
<ThemeProvider storageKey="my-app-theme">
```

### Issue: Flash of Wrong Theme on Load

**Solution:** Add script to HTML head:

```html
<script>
  try {
    const theme = localStorage.getItem('app-theme');
    if (theme) {
      document.documentElement.classList.add(theme);
    }
  } catch (e) {}
</script>
```

### Issue: CSS Variables Not Working

**Solution:** Ensure ThemeProvider is at root:

```tsx
<ThemeProvider>
  <App />
</ThemeProvider>
```

### Issue: System Theme Not Detected

**Solution:** Check browser support for prefers-color-scheme:

```tsx
const supportsSystemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches !== undefined;
```

## See Also

- [Design Tokens](./tokens.ts)
- [Color Palettes](./palettes/README.md)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme)
- [UI Module](../ui/README.md) - Themed components
- [State Module](../state/README.md) - Theme state persistence

---

**Version:** 3.0.0
**Last Updated:** 2025-11-27
