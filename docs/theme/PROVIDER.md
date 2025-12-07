# Theme Provider

> Context provider for theme management and configuration

## Overview

The `ThemeProvider` component manages the application's theme state, handles theme persistence, integrates with system preferences, and provides theme context to all child components.

### Location

```
/home/user/enzyme/src/lib/theme/ThemeProvider.tsx
```

## Features

- Theme state management (light, dark, system)
- localStorage persistence
- System preference detection and monitoring
- Feature flag integration for dark mode
- CSS class and data attribute management
- Memoized context values for performance
- TypeScript support

## Setup

### Basic Setup

```typescript
import { ThemeProvider } from '@missionfabric-js/enzyme';
import { App } from './App';

function Root() {
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
}
```

### With Default Theme

```typescript
<ThemeProvider defaultTheme="dark">
  <App />
</ThemeProvider>
```

### With Router

```typescript
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@missionfabric-js/enzyme';

function Root() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  );
}
```

## Props

```typescript
interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: 'light' | 'dark' | 'system';
}
```

### defaultTheme

- **Type**: `'light' | 'dark' | 'system'`
- **Default**: `'system'` (or stored preference)
- **Description**: Initial theme to use. If not provided, reads from localStorage or falls back to system preference.

## Theme Context

The ThemeProvider exposes a context value with the following shape:

```typescript
interface ThemeContextValue {
  theme: 'light' | 'dark' | 'system';
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleTheme: () => void;
  palette: LightPalette | DarkPalette;
  tokens: DesignTokens;
  darkModeEnabled: boolean;
}
```

### Properties

#### theme
- **Type**: `'light' | 'dark' | 'system'`
- **Description**: Current theme setting (what the user selected)

#### resolvedTheme
- **Type**: `'light' | 'dark'`
- **Description**: Actual theme being applied (system preference resolved)

#### setTheme
- **Type**: `(theme: 'light' | 'dark' | 'system') => void`
- **Description**: Function to set the theme
- **Note**: If dark mode feature flag is disabled, dark/system modes are rejected

#### toggleTheme
- **Type**: `() => void`
- **Description**: Toggle between light and dark themes
- **Note**: Disabled when dark mode feature flag is off

#### palette
- **Type**: `LightPalette | DarkPalette`
- **Description**: Current color palette based on resolved theme

#### tokens
- **Type**: `DesignTokens`
- **Description**: Design tokens (spacing, typography, shadows, etc.)

#### darkModeEnabled
- **Type**: `boolean`
- **Description**: Whether dark mode is enabled via feature flag

## Using the Theme Context

### useThemeContext Hook

```typescript
import { useThemeContext } from '@missionfabric-js/enzyme';

function MyComponent() {
  const {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    palette,
    tokens,
    darkModeEnabled
  } = useThemeContext();

  return (
    <div>
      <p>Current theme: {resolvedTheme}</p>
      <button onClick={toggleTheme}>
        Toggle Theme
      </button>
    </div>
  );
}
```

### Theme Toggle Component

```typescript
import { useThemeContext } from '@missionfabric-js/enzyme';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';

function ThemeToggle() {
  const { resolvedTheme, toggleTheme, darkModeEnabled } = useThemeContext();

  if (!darkModeEnabled) {
    return null; // Hide toggle when dark mode is disabled
  }

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
    >
      {resolvedTheme === 'dark' ? (
        <SunIcon width={20} />
      ) : (
        <MoonIcon width={20} />
      )}
    </button>
  );
}
```

### Theme Selector

```typescript
function ThemeSelector() {
  const { theme, setTheme, darkModeEnabled } = useThemeContext();

  return (
    <select
      value={theme}
      onChange={(e) => setTheme(e.target.value as any)}
    >
      <option value="light">Light</option>
      {darkModeEnabled && <option value="dark">Dark</option>}
      {darkModeEnabled && <option value="system">System</option>}
    </select>
  );
}
```

## Theme Persistence

The ThemeProvider automatically persists theme preference to localStorage:

- **Storage Key**: `'app-theme'`
- **Values**: `'light' | 'dark' | 'system'`
- **Behavior**:
  - Reads on mount
  - Saves on every theme change
  - Persists across sessions

### Clearing Stored Theme

```typescript
function ResetTheme() {
  const { setTheme } = useThemeContext();

  const handleReset = () => {
    localStorage.removeItem('app-theme');
    setTheme('system'); // Reset to system preference
  };

  return <button onClick={handleReset}>Reset Theme</button>;
}
```

## System Preference Detection

The provider automatically detects and responds to OS theme preference:

### Initial Detection

```typescript
// Detects system preference on mount
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
  ? 'dark'
  : 'light';
```

### Live Updates

```typescript
// Listens for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (theme === 'system') {
    // Update resolved theme when system preference changes
    setResolvedTheme(e.matches ? 'dark' : 'light');
  }
});
```

### Manual System Preference

```typescript
function FollowSystem() {
  const { setTheme } = useThemeContext();

  return (
    <button onClick={() => setTheme('system')}>
      Use System Preference
    </button>
  );
}
```

## DOM Updates

The ThemeProvider automatically updates the DOM when theme changes:

### HTML Class

```html
<!-- Light mode -->
<html class="light">

<!-- Dark mode -->
<html class="dark">
```

### Data Attribute

```html
<!-- Light mode -->
<html data-theme="light">

<!-- Dark mode -->
<html data-theme="dark">
```

### CSS Usage

```css
/* Target light mode */
html.light {
  --color-bg-primary: #ffffff;
}

/* Target dark mode */
html.dark {
  --color-bg-primary: #0f172a;
}

/* Or use data attribute */
[data-theme="light"] {
  --color-bg-primary: #ffffff;
}
```

## Feature Flag Integration

The ThemeProvider integrates with the feature flag system:

### Dark Mode Flag

```typescript
// In flagKeys.ts
export const flagKeys = {
  DARK_MODE: 'dark-mode',
};
```

### Behavior When Disabled

When the `dark-mode` feature flag is disabled:

1. Theme is forced to `'light'`
2. `setTheme('dark')` is ignored with console warning
3. `setTheme('system')` is ignored with console warning
4. `toggleTheme()` is no-op with console warning
5. `darkModeEnabled` returns `false`

### Example Warning

```typescript
// When dark mode flag is disabled
setTheme('dark');
// Console: "[ThemeProvider] Dark mode is disabled via feature flag. Ignoring theme change."
```

## Performance Optimizations

The ThemeProvider is optimized for performance:

### Memoized Context Value

```typescript
const value = useMemo(() => ({
  theme,
  resolvedTheme,
  setTheme,
  toggleTheme,
  palette,
  tokens,
  darkModeEnabled,
}), [theme, resolvedTheme, setTheme, toggleTheme, palette, darkModeEnabled]);
```

### Batched DOM Updates

```typescript
// Uses microtask queue to batch updates
queueMicrotask(() => {
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(resolved);
  document.documentElement.setAttribute('data-theme', resolved);
  setResolvedTheme(resolved);
});
```

### Stable Callbacks

```typescript
const setTheme = useCallback((newTheme: Theme) => {
  // Stable callback prevents consumer re-renders
}, [darkModeEnabled]);
```

## Advanced Usage

### Custom Theme Provider

```typescript
import { ThemeProvider } from '@missionfabric-js/enzyme';

function CustomThemeProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait for app initialization
    initializeApp().then(() => setIsReady(true));
  }, []);

  if (!isReady) {
    return <LoadingScreen />;
  }

  return (
    <ThemeProvider defaultTheme="dark">
      {children}
    </ThemeProvider>
  );
}
```

### Theme-Aware Component

```typescript
import { useThemeContext } from '@missionfabric-js/enzyme';

function ThemedCard({ children }: { children: ReactNode }) {
  const { resolvedTheme, tokens } = useThemeContext();

  const cardStyle = {
    padding: tokens.spacing.lg,
    borderRadius: tokens.radius.lg,
    backgroundColor: resolvedTheme === 'dark'
      ? 'rgba(255, 255, 255, 0.05)'
      : 'rgba(0, 0, 0, 0.02)',
  };

  return <div style={cardStyle}>{children}</div>;
}
```

### Server-Side Rendering

```typescript
// Server component
import { ThemeProvider } from '@missionfabric-js/enzyme';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

Note: Use `suppressHydrationWarning` on `<html>` to prevent hydration warnings when theme class is applied client-side.

## Troubleshooting

### Theme Not Persisting

**Issue**: Theme resets on page reload

**Solution**: Check localStorage is available and not blocked

```typescript
function checkLocalStorage() {
  try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
    return true;
  } catch {
    return false;
  }
}
```

### Theme Toggle Not Working

**Issue**: `toggleTheme()` does nothing

**Possible Causes**:
1. Dark mode feature flag is disabled
2. Not wrapped in ThemeProvider
3. Context not properly consumed

**Solution**: Check `darkModeEnabled` value and verify provider setup

### Flash of Wrong Theme

**Issue**: Brief flash of light theme on page load in dark mode

**Solution**: Use inline script to set theme before React hydrates

```html
<script>
  const theme = localStorage.getItem('app-theme') || 'system';
  const resolved = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;
  document.documentElement.classList.add(resolved);
  document.documentElement.setAttribute('data-theme', resolved);
</script>
```

## Examples

See example implementations:
- `/examples/theme/basic-setup.tsx` - Basic theme provider setup
- `/examples/theme/theme-toggle.tsx` - Theme toggle component
- `/examples/theme/theme-aware-component.tsx` - Component using theme
- `/examples/theme/ssr-setup.tsx` - Server-side rendering setup

## See Also

- [Theme System Overview](./README.md)
- [Design Tokens](./DESIGN_TOKENS.md)
- [Type Definitions](./TYPES.md)

---

## Related Documentation

### Theme System
- [Theme System Overview](./README.md) - Complete theme system guide
- [Design Tokens](./DESIGN_TOKENS.md) - Colors, spacing, typography tokens
- [Type Definitions](./TYPES.md) - TypeScript theme types
- [Dark Mode](./DARK_MODE.md) - Dark mode implementation

### UI & Components
- [UI Components](../ui/README.md) - Theme-aware components
- [Design System](../DESIGN_SYSTEM.md) - Design tokens and styling patterns

### Configuration & Setup
- [Getting Started](../GETTING_STARTED.md) - Initial setup guide
- [Feature Flags](../flags/README.md) - Dark mode feature flag

### Integration
- [UI + Theme Integration](../integration/UI_THEME_HOOKS_ACCESSIBILITY.md) - Theme provider integration
