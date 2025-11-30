# Dark Mode

> Complete guide to implementing and customizing dark mode in Enzyme applications

## Overview

Enzyme's theme system includes comprehensive dark mode support with automatic system preference detection, manual theme switching, persistent user preferences, and smooth transitions between themes.

## Key Features

- **Light and Dark Modes**: Pre-built, WCAG-compliant color palettes
- **System Preference Detection**: Automatic theme based on OS settings
- **Manual Override**: User can choose preferred theme
- **Persistent Preferences**: Theme choice saved to localStorage
- **Smooth Transitions**: Optional CSS transitions between themes
- **Feature Flag Integration**: Enable/disable dark mode via feature flags
- **CSS Variables**: Runtime theme switching without re-renders
- **SSR Compatible**: No flash of wrong theme

## Quick Start

### 1. Wrap Your App

```typescript
import { ThemeProvider } from '@missionfabric-js/enzyme';

function App() {
  return (
    <ThemeProvider>
      {/* App respects system preference by default */}
      <YourApp />
    </ThemeProvider>
  );
}
```

### 2. Add Theme Toggle

```typescript
import { useThemeContext } from '@missionfabric-js/enzyme';

function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useThemeContext();

  return (
    <button onClick={toggleTheme} aria-label="Toggle theme">
      {resolvedTheme === 'dark' ? '🌙 Dark' : '☀️ Light'}
    </button>
  );
}
```

### 3. Use Theme-Aware Styles

```typescript
function Card() {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-bg-primary)',
        color: 'var(--color-text-primary)',
        border: '1px solid var(--color-border-default)'
      }}
    >
      Card content
    </div>
  );
}
```

## Theme Modes

### Light Mode

Default theme optimized for daylight viewing.

**Characteristics:**
- Light backgrounds (#ffffff, #f9fafb)
- Dark text (#111827, #1f2937)
- High contrast for readability
- Bright, vibrant accent colors

**Best for:**
- Daylight use
- Well-lit environments
- Reading-heavy content
- Data visualization

### Dark Mode

Optimized for low-light environments and reducing eye strain.

**Characteristics:**
- Dark backgrounds (#111827, #1f2937)
- Light text (#f9fafb, #e5e7eb)
- Maintained WCAG contrast ratios
- Muted accent colors
- OLED-friendly deep blacks

**Best for:**
- Night-time use
- Low-light environments
- Reducing eye strain
- OLED displays (battery saving)
- Professional/creative work

### System Mode

Automatically matches the operating system's theme preference.

```typescript
<ThemeProvider defaultMode="system">
  <App />
</ThemeProvider>
```

**Behavior:**
- Detects `prefers-color-scheme` media query
- Updates automatically when OS theme changes
- Respects user's system-wide preference
- Default mode if no preference stored

## Theme Context API

### useThemeContext Hook

```typescript
import { useThemeContext } from '@missionfabric-js/enzyme';

function Component() {
  const {
    mode,           // Current mode: 'light' | 'dark' | 'system'
    resolvedTheme,  // Actual theme: 'light' | 'dark'
    setMode,        // Set theme mode
    toggleTheme,    // Toggle between light/dark
  } = useThemeContext();

  return (
    <div>
      <p>Mode: {mode}</p>
      <p>Resolved: {resolvedTheme}</p>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  );
}
```

### Context Properties

| Property | Type | Description |
|----------|------|-------------|
| `mode` | `'light' \| 'dark' \| 'system'` | User's selected mode |
| `resolvedTheme` | `'light' \| 'dark'` | Actual applied theme |
| `setMode` | `(mode) => void` | Set theme mode |
| `toggleTheme` | `() => void` | Toggle between light/dark |

## Configuration

### Theme Provider Props

```typescript
<ThemeProvider
  // Initial theme mode
  defaultMode="system"  // 'light' | 'dark' | 'system'

  // localStorage key for persistence
  storageKey="app-theme"

  // Disable smooth transitions
  disableTransition={false}

  // Custom color palettes
  palette={{
    light: customLightPalette,
    dark: customDarkPalette
  }}

  // Custom design tokens
  tokens={customTokens}
>
  <App />
</ThemeProvider>
```

### Configuration Options

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `defaultMode` | `ThemeMode` | `'system'` | Initial theme mode |
| `storageKey` | `string` | `'enzyme-theme'` | localStorage key |
| `disableTransition` | `boolean` | `false` | Disable theme transitions |
| `palette` | `object` | Built-in palettes | Custom color palettes |
| `tokens` | `object` | Built-in tokens | Custom design tokens |

## Color Palettes

### Light Palette

```typescript
{
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    // ... 200-800
    900: '#1e3a8a',
    default: '#3b82f6',
    hover: '#2563eb',
    active: '#1d4ed8'
  },
  background: {
    primary: '#ffffff',
    secondary: '#f9fafb',
    tertiary: '#f3f4f6',
    card: '#ffffff',
    overlay: 'rgba(0, 0, 0, 0.5)'
  },
  text: {
    primary: '#111827',
    secondary: '#4b5563',
    tertiary: '#6b7280',
    muted: '#9ca3af',
    inverse: '#ffffff'
  },
  // ... more colors
}
```

### Dark Palette

```typescript
{
  primary: {
    50: '#1e3a8a',
    // ... inverted scale
    900: '#eff6ff',
    default: '#60a5fa',
    hover: '#3b82f6',
    active: '#2563eb'
  },
  background: {
    primary: '#111827',
    secondary: '#1f2937',
    tertiary: '#374151',
    card: '#1f2937',
    overlay: 'rgba(0, 0, 0, 0.7)'
  },
  text: {
    primary: '#f9fafb',
    secondary: '#e5e7eb',
    tertiary: '#d1d5db',
    muted: '#9ca3af',
    inverse: '#111827'
  },
  // ... more colors
}
```

### Color Categories

Both palettes include:
- **Primary/Secondary**: Brand colors
- **Semantic**: Success, warning, error, info
- **Neutral**: Gray scale
- **Background**: Page, card, overlay
- **Text**: Primary, secondary, tertiary, muted
- **Border**: Default, muted, emphasis, focus
- **Interactive**: Hover, active states

## CSS Variables

All theme colors are available as CSS variables:

```css
/* Backgrounds */
var(--color-bg-primary)
var(--color-bg-secondary)
var(--color-bg-tertiary)
var(--color-bg-card)
var(--color-bg-overlay)

/* Text */
var(--color-text-primary)
var(--color-text-secondary)
var(--color-text-tertiary)
var(--color-text-muted)
var(--color-text-inverse)

/* Borders */
var(--color-border-default)
var(--color-border-muted)
var(--color-border-emphasis)
var(--color-border-focus)

/* Semantic */
var(--color-success)
var(--color-warning)
var(--color-error)
var(--color-info)

/* Primary scale */
var(--color-primary-50)
var(--color-primary-100)
/* ... through 900 */
var(--color-primary-default)
var(--color-primary-hover)
var(--color-primary-active)
```

## Theme-Aware Components

### Pattern 1: CSS Variables

```typescript
// Best practice: Uses CSS variables
function Card({ children }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-bg-card)',
        color: 'var(--color-text-primary)',
        borderColor: 'var(--color-border-default)'
      }}
    >
      {children}
    </div>
  );
}
```

### Pattern 2: Conditional Styling

```typescript
// When you need different logic per theme
function Logo() {
  const { resolvedTheme } = useThemeContext();

  return (
    <img
      src={resolvedTheme === 'dark' ? '/logo-dark.svg' : '/logo-light.svg'}
      alt="Logo"
    />
  );
}
```

### Pattern 3: Color Tokens

```typescript
// Static colors (doesn't auto-update)
import { colorTokens } from '@missionfabric-js/enzyme/theme';

const style = {
  backgroundColor: colorTokens.background.primary,
  color: colorTokens.text.primary
};
```

## Theme Switching

### Manual Theme Selection

```typescript
function ThemeSettings() {
  const { mode, setMode } = useThemeContext();

  return (
    <div>
      <h3>Theme Preference</h3>
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
      <label>
        <input
          type="radio"
          checked={mode === 'system'}
          onChange={() => setMode('system')}
        />
        System
      </label>
    </div>
  );
}
```

### Toggle Button

```typescript
function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useThemeContext();

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {resolvedTheme === 'dark' ? (
        <SunIcon className="h-5 w-5" />
      ) : (
        <MoonIcon className="h-5 w-5" />
      )}
    </button>
  );
}
```

### Dropdown Menu

```typescript
function ThemeMenu() {
  const { mode, setMode } = useThemeContext();

  const options = [
    { value: 'light', label: 'Light', icon: '☀️' },
    { value: 'dark', label: 'Dark', icon: '🌙' },
    { value: 'system', label: 'System', icon: '💻' }
  ];

  return (
    <select value={mode} onChange={(e) => setMode(e.target.value)}>
      {options.map(({ value, label, icon }) => (
        <option key={value} value={value}>
          {icon} {label}
        </option>
      ))}
    </select>
  );
}
```

## System Preference Detection

### Detecting System Theme

The theme system automatically detects the OS theme preference:

```typescript
// Automatically handled by ThemeProvider
<ThemeProvider defaultMode="system">
  {/* Automatically detects and applies system theme */}
</ThemeProvider>
```

### Listening to System Changes

Theme updates automatically when system preference changes:

```typescript
// No code needed - automatic detection
// Updates when user changes OS theme
```

### Manual Detection

```typescript
// Check system preference manually
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

// Listen to changes
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
mediaQuery.addEventListener('change', (e) => {
  console.log('System theme changed to:', e.matches ? 'dark' : 'light');
});
```

## Persistence

### localStorage Storage

Theme preference is automatically saved:

```typescript
// Saved as: { mode: 'dark' }
localStorage.setItem('enzyme-theme', JSON.stringify({ mode: 'dark' }));

// Retrieved on app load
const saved = localStorage.getItem('enzyme-theme');
```

### Custom Storage Key

```typescript
<ThemeProvider storageKey="my-app-theme">
  <App />
</ThemeProvider>
```

### Disable Persistence

```typescript
<ThemeProvider storageKey={null}>
  {/* Theme not persisted */}
</ThemeProvider>
```

## Preventing Flash of Wrong Theme

### Add Script to HTML Head

Prevent flash of wrong theme on page load:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>My App</title>

  <!-- Theme script BEFORE any content -->
  <script>
    try {
      const stored = localStorage.getItem('enzyme-theme');
      if (stored) {
        const { mode } = JSON.parse(stored);
        let theme = mode;

        if (mode === 'system') {
          theme = window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
        }

        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        }
      }
    } catch (e) {
      console.error('Theme initialization error:', e);
    }
  </script>
</head>
<body>
  <div id="root"></div>
</body>
</html>
```

## Custom Palettes

### Creating Custom Theme

```typescript
import { ThemeProvider } from '@missionfabric-js/enzyme';

const customPalette = {
  light: {
    primary: {
      default: '#6366f1',
      hover: '#4f46e5',
      active: '#4338ca'
    },
    background: {
      primary: '#ffffff',
      secondary: '#f9fafb',
      tertiary: '#f3f4f6'
    },
    text: {
      primary: '#111827',
      secondary: '#6b7280'
    },
    // ... complete palette
  },
  dark: {
    primary: {
      default: '#818cf8',
      hover: '#6366f1',
      active: '#4f46e5'
    },
    background: {
      primary: '#0f172a',
      secondary: '#1e293b',
      tertiary: '#334155'
    },
    text: {
      primary: '#f1f5f9',
      secondary: '#cbd5e1'
    },
    // ... complete palette
  }
};

function App() {
  return (
    <ThemeProvider palette={customPalette}>
      <YourApp />
    </ThemeProvider>
  );
}
```

### Extending Default Palettes

```typescript
import { lightPalette, darkPalette } from '@missionfabric-js/enzyme/theme';

const customPalette = {
  light: {
    ...lightPalette,
    primary: {
      ...lightPalette.primary,
      default: '#6366f1' // Override primary color
    }
  },
  dark: {
    ...darkPalette,
    primary: {
      ...darkPalette.primary,
      default: '#818cf8' // Override primary color
    }
  }
};
```

## Accessibility

### WCAG Contrast Compliance

Both light and dark palettes meet WCAG AA standards:

**Light Mode:**
- Primary text: 16.1:1 (AAA)
- Secondary text: 6.0:1 (AA)
- Tertiary text: 4.6:1 (AA)

**Dark Mode:**
- Primary text: 15.8:1 (AAA)
- Secondary text: 9.0:1 (AAA)
- Tertiary text: 5.5:1 (AA)

### Testing Contrast

```typescript
import { checkContrast, hexToRgb } from '@missionfabric-js/enzyme/ux';

const fg = hexToRgb('#111827');
const bg = hexToRgb('#ffffff');

const result = checkContrast(fg, bg);
console.log(`Contrast ratio: ${result.ratio}:1`);
console.log(`WCAG AA: ${result.aa ? 'Pass' : 'Fail'}`);
```

### Theme Toggle Accessibility

```typescript
function AccessibleThemeToggle() {
  const { resolvedTheme, toggleTheme } = useThemeContext();

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
      aria-pressed={resolvedTheme === 'dark'}
    >
      <span aria-hidden="true">
        {resolvedTheme === 'dark' ? '☀️' : '🌙'}
      </span>
      <span className="sr-only">
        Current theme: {resolvedTheme}
      </span>
    </button>
  );
}
```

## Best Practices

### 1. Always Use CSS Variables

```typescript
// ✅ Good: Auto-updates with theme
<div style={{ color: 'var(--color-text-primary)' }} />

// ❌ Avoid: Static, doesn't update
import { colorTokens } from '@missionfabric-js/enzyme/theme';
<div style={{ color: colorTokens.text.primary }} />
```

### 2. Test Both Themes

Always test your UI in both light and dark modes:

```typescript
// Use theme toggle during development
function DevTools() {
  const { resolvedTheme, toggleTheme } = useThemeContext();

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="dev-tools">
      <button onClick={toggleTheme}>
        Theme: {resolvedTheme}
      </button>
    </div>
  );
}
```

### 3. Provide Theme Control

Give users explicit theme control:

```typescript
// ✅ Good: User can choose
<ThemeSettings />

// ❌ Avoid: Force system theme
// Users may want dark mode even if system is light
```

### 4. Handle Images

Use appropriate images for each theme:

```typescript
function ThemedImage() {
  const { resolvedTheme } = useThemeContext();

  return (
    <picture>
      <source
        srcSet="/image-dark.png"
        media="(prefers-color-scheme: dark)"
      />
      <img src="/image-light.png" alt="Themed content" />
    </picture>
  );
}
```

### 5. Smooth Transitions

Enable transitions for better UX:

```typescript
<ThemeProvider disableTransition={false}>
  {/* Smooth color transitions */}
</ThemeProvider>
```

Add CSS for smooth transitions:

```css
* {
  transition: background-color 200ms ease, color 200ms ease, border-color 200ms ease;
}
```

## Troubleshooting

### Theme Not Persisting

**Problem**: Theme resets on page reload

**Solution**: Ensure storageKey is set

```typescript
<ThemeProvider storageKey="app-theme">
  <App />
</ThemeProvider>
```

### Flash of Wrong Theme

**Problem**: Wrong theme flashes on load

**Solution**: Add initialization script to HTML head (see [Preventing Flash](#preventing-flash-of-wrong-theme))

### CSS Variables Not Working

**Problem**: Colors not updating

**Solution**: Ensure you're using CSS variables, not static tokens

```typescript
// ✅ Correct
backgroundColor: 'var(--color-bg-primary)'

// ❌ Incorrect
backgroundColor: colorTokens.background.primary
```

### System Theme Not Detected

**Problem**: System mode not working

**Solution**: Check browser support

```typescript
const supportsSystemTheme = window.matchMedia('(prefers-color-scheme: dark)').media !== 'not all';

if (!supportsSystemTheme) {
  // Fallback to manual selection
  setMode('light');
}
```

## See Also

- [Theme Provider](./PROVIDER.md) - Theme provider setup
- [Design Tokens](./DESIGN_TOKENS.md) - Design token reference
- [Type Definitions](./TYPES.md) - TypeScript types
- [UI Components](../ui/README.md) - Theme-aware components

---

## Related Documentation

### Theme System
- [Theme System Overview](./README.md) - Complete theme system guide
- [Theme Provider](./PROVIDER.md) - Theme provider configuration
- [Design Tokens](./DESIGN_TOKENS.md) - Color palettes and tokens
- [Type Definitions](./TYPES.md) - Theme mode types

### UI & Components
- [UI Components](../ui/README.md) - Dark mode-aware components
- [Design System](../DESIGN_SYSTEM.md) - Dark mode design patterns
- [Components Reference](../COMPONENTS_REFERENCE.md) - Component dark mode styling

### Accessibility
- [Accessibility](../ux/ACCESSIBILITY.md) - Dark mode contrast compliance
- [WCAG Contrast](../ux/ACCESSIBILITY.md#color-contrast) - Contrast ratio testing

### Implementation
- [Feature Flags](../flags/README.md) - Dark mode feature flag
- [Getting Started](../GETTING_STARTED.md) - Initial dark mode setup

---

**Version:** 3.0.0
**Last Updated:** 2025-11-29
