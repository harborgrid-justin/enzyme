# Theme Type Definitions

> Complete TypeScript type reference for the theme system

## Overview

The theme system provides comprehensive TypeScript types for type safety, autocomplete support, and better developer experience.

### Location

```
/home/user/enzyme/src/lib/theme/types.ts
```

---

## Theme Mode Types

### ThemeMode

```typescript
type ThemeMode = 'light' | 'dark' | 'system';
```

Represents the user's theme preference setting.

**Values**:
- `'light'`: Light mode
- `'dark'`: Dark mode
- `'system'`: Follow system preference

**Usage**:
```typescript
const [theme, setTheme] = useState<ThemeMode>('system');
```

### ResolvedTheme

```typescript
type ResolvedTheme = 'light' | 'dark';
```

Represents the actual theme being applied (system preference resolved to light or dark).

**Values**:
- `'light'`: Light mode is active
- `'dark'`: Dark mode is active

**Usage**:
```typescript
const { resolvedTheme } = useThemeContext();
// resolvedTheme is always 'light' or 'dark', never 'system'
```

---

## Color Palette Types

### ColorPalette

Complete color palette interface with all semantic colors.

```typescript
interface ColorPalette {
  // Primary brand colors
  primary: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };

  // Secondary colors
  secondary: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };

  // Neutral colors
  neutral: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };

  // Semantic colors
  success: string;
  warning: string;
  error: string;
  info: string;

  // Background colors
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
  };

  // Text colors
  text: {
    primary: string;
    secondary: string;
    muted: string;
    inverted: string;
  };

  // Border colors
  border: {
    default: string;
    muted: string;
    emphasis: string;
  };
}
```

**Usage**:
```typescript
import { useThemeContext } from '@missionfabric-js/enzyme';

function MyComponent() {
  const { palette } = useThemeContext();

  return (
    <div style={{
      backgroundColor: palette.background.primary,
      color: palette.text.primary,
      borderColor: palette.border.default,
    }}>
      Content
    </div>
  );
}
```

---

## Design Token Types

### SpacingScale

```typescript
interface SpacingScale {
  0: string;
  0.5: string;
  1: string;
  1.5: string;
  2: string;
  2.5: string;
  3: string;
  3.5: string;
  4: string;
  5: string;
  6: string;
  7: string;
  8: string;
  9: string;
  10: string;
  11: string;
  12: string;
  14: string;
  16: string;
  20: string;
  24: string;
  28: string;
  32: string;
  36: string;
  40: string;
  44: string;
  48: string;
  52: string;
  56: string;
  60: string;
  64: string;
  72: string;
  80: string;
  96: string;
}
```

### RadiusScale

```typescript
interface RadiusScale {
  none: string;
  sm: string;
  default: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  full: string;
}
```

### FontSizeScale

```typescript
interface FontSizeScale {
  xs: string;
  sm: string;
  base: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  '4xl': string;
  '5xl': string;
  '6xl': string;
  '7xl': string;
  '8xl': string;
  '9xl': string;
}
```

### FontWeightScale

```typescript
interface FontWeightScale {
  thin: number;
  extralight: number;
  light: number;
  normal: number;
  medium: number;
  semibold: number;
  bold: number;
  extrabold: number;
  black: number;
}
```

### LineHeightScale

```typescript
interface LineHeightScale {
  none: number;
  tight: number;
  snug: number;
  normal: number;
  relaxed: number;
  loose: number;
}
```

### ShadowScale

```typescript
interface ShadowScale {
  sm: string;
  default: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  inner: string;
  none: string;
}
```

### TransitionDurations

```typescript
interface TransitionDurations {
  fast: string;
  normal: string;
  slow: string;
}
```

### ZIndexScale

```typescript
interface ZIndexScale {
  auto: string;
  0: number;
  10: number;
  20: number;
  30: number;
  40: number;
  50: number;
  dropdown: number;
  sticky: number;
  fixed: number;
  modalBackdrop: number;
  modal: number;
  popover: number;
  tooltip: number;
}
```

### DesignTokens

Complete design tokens interface.

```typescript
interface DesignTokens {
  spacing: SpacingScale;
  radius: RadiusScale;
  fontSize: FontSizeScale;
  fontWeight: FontWeightScale;
  lineHeight: LineHeightScale;
  shadow: ShadowScale;
  transition: TransitionDurations;
  zIndex: ZIndexScale;
}
```

**Usage**:
```typescript
import { tokens } from '@missionfabric-js/enzyme';

const cardStyle = {
  padding: tokens.spacing[4],
  borderRadius: tokens.radius.lg,
  boxShadow: tokens.shadow.md,
};
```

---

## Theme Configuration Types

### ThemeConfig

```typescript
interface ThemeConfig {
  mode: ThemeMode;
  resolvedMode: ResolvedTheme;
  palette: ColorPalette;
  tokens: DesignTokens;
}
```

Complete theme configuration object.

**Properties**:
- `mode`: User's theme preference
- `resolvedMode`: Actual theme being displayed
- `palette`: Current color palette
- `tokens`: Design token values

### ThemeContextValue

```typescript
interface ThemeContextValue {
  /** Current theme mode setting */
  mode: ThemeMode;

  /** Resolved theme (light or dark) */
  resolvedMode: ResolvedTheme;

  /** Set theme mode */
  setMode: (mode: ThemeMode) => void;

  /** Current theme configuration */
  theme: ThemeConfig;
}
```

Value provided by ThemeContext.

**Usage**:
```typescript
import { useThemeContext } from '@missionfabric-js/enzyme';

function MyComponent() {
  const {
    mode,
    resolvedMode,
    setMode,
    theme
  } = useThemeContext();

  return (
    <div>
      <p>Current mode: {mode}</p>
      <p>Resolved: {resolvedMode}</p>
      <button onClick={() => setMode('dark')}>
        Dark Mode
      </button>
    </div>
  );
}
```

---

## Token Type Helpers

### Individual Token Types

```typescript
type SpacingToken = keyof typeof tokens.spacing;
type RadiusToken = keyof typeof tokens.radius;
type FontSizeToken = keyof typeof tokens.fontSize;
type FontWeightToken = keyof typeof tokens.fontWeight;
type ShadowToken = keyof typeof tokens.shadow;
type ZIndexToken = keyof typeof tokens.zIndex;
type ColorToken = keyof typeof colorTokens;
```

**Usage**:
```typescript
function applySpacing(value: SpacingToken) {
  return tokens.spacing[value];
}

applySpacing('md'); // OK
applySpacing('invalid'); // TypeScript error
```

### Token Value Types

```typescript
type Tokens = typeof tokens;
type ColorTokens = typeof colorTokens;
```

**Usage**:
```typescript
function getToken<K extends keyof Tokens>(key: K): Tokens[K] {
  return tokens[key];
}

const spacing = getToken('spacing'); // SpacingScale
const radius = getToken('radius');   // RadiusScale
```

---

## Palette-Specific Types

### LightPalette

```typescript
type LightPalette = typeof lightPalette;
```

Type for light mode color palette.

### DarkPalette

```typescript
type DarkPalette = typeof darkPalette;
```

Type for dark mode color palette.

**Usage**:
```typescript
import type { LightPalette, DarkPalette } from '@missionfabric-js/enzyme';

function getPalette(theme: ResolvedTheme): LightPalette | DarkPalette {
  return theme === 'light' ? lightPalette : darkPalette;
}
```

---

## Type Guards

### Type checking helpers

```typescript
function isThemeMode(value: string): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

function isResolvedTheme(value: string): value is ResolvedTheme {
  return value === 'light' || value === 'dark';
}
```

**Usage**:
```typescript
const userInput = localStorage.getItem('theme');

if (isThemeMode(userInput)) {
  setTheme(userInput);
}
```

---

## Generic Component Props

### Theme-Aware Props

```typescript
interface ThemedComponentProps {
  theme?: ThemeMode;
  palette?: ColorPalette;
  tokens?: DesignTokens;
}
```

Props for components that accept theme overrides.

**Usage**:
```typescript
function ThemedCard({ theme, palette, tokens, children }: ThemedComponentProps & { children: ReactNode }) {
  const defaultTheme = useThemeContext();
  const activeTheme = theme || defaultTheme.mode;

  return (
    <div style={{
      backgroundColor: palette?.background.primary || defaultTheme.palette.background.primary,
    }}>
      {children}
    </div>
  );
}
```

---

## Extending Types

### Custom Theme Types

```typescript
import type { ThemeConfig } from '@missionfabric-js/enzyme';

interface CustomThemeConfig extends ThemeConfig {
  customColors: {
    brand: string;
    accent: string;
  };
}
```

### Custom Palette

```typescript
import type { ColorPalette } from '@missionfabric-js/enzyme';

interface ExtendedPalette extends ColorPalette {
  custom: {
    gradient: string;
    highlight: string;
  };
}
```

---

## Type Utilities

### Extracting Token Keys

```typescript
type SpacingKeys = keyof typeof tokens.spacing;
// 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'

type ColorKeys = keyof typeof colorTokens;
// 'primary' | 'secondary' | 'success' | 'warning' | 'error' | ...
```

### Extracting Token Values

```typescript
type SpacingValues = typeof tokens.spacing[keyof typeof tokens.spacing];
// '0.25rem' | '0.5rem' | '1rem' | ...

type PrimaryColorValues = typeof colorTokens.primary[keyof typeof colorTokens.primary];
// 'var(--color-primary-500, #3b82f6)' | ...
```

---

## Best Practices

### 1. Use Specific Types

```typescript
// Good
function setPadding(value: SpacingToken) {
  return tokens.spacing[value];
}

// Less specific
function setPadding(value: string) {
  return tokens.spacing[value as SpacingToken];
}
```

### 2. Type Component Props

```typescript
// Good
interface CardProps {
  padding?: SpacingToken;
  shadow?: ShadowToken;
  radius?: RadiusToken;
}

// Avoid
interface CardProps {
  padding?: string;
  shadow?: string;
  radius?: string;
}
```

### 3. Use Type Inference

```typescript
// TypeScript infers the return type
function getThemeValue(key: keyof Tokens) {
  return tokens[key]; // Type is inferred correctly
}
```

### 4. Constrain Generic Types

```typescript
// Good - constrained to valid keys
function getColorToken<K extends keyof typeof colorTokens>(key: K) {
  return colorTokens[key];
}

// Avoid - too generic
function getColorToken(key: string) {
  return colorTokens[key as keyof typeof colorTokens];
}
```

---

## Examples

### Typed Theme Hook

```typescript
function useTypedTheme() {
  const context = useThemeContext();

  const setTheme = useCallback((theme: ThemeMode) => {
    if (theme !== 'light' && theme !== 'dark' && theme !== 'system') {
      throw new Error(`Invalid theme: ${theme}`);
    }
    context.setMode(theme);
  }, [context]);

  return {
    ...context,
    setTheme,
  };
}
```

### Typed Style Builder

```typescript
interface StyleOptions {
  spacing?: SpacingToken;
  radius?: RadiusToken;
  shadow?: ShadowToken;
}

function buildStyle(options: StyleOptions): CSSProperties {
  return {
    padding: options.spacing ? tokens.spacing[options.spacing] : undefined,
    borderRadius: options.radius ? tokens.radius[options.radius] : undefined,
    boxShadow: options.shadow ? tokens.shadow[options.shadow] : undefined,
  };
}

const style = buildStyle({
  spacing: 'md',
  radius: 'lg',
  shadow: 'md',
});
```

---

## See Also

- [Theme System Overview](./README.md)
- [Theme Provider](./PROVIDER.md)
- [Design Tokens](./DESIGN_TOKENS.md)

---

## Related Documentation

### Theme System
- [Theme System Overview](./README.md) - Complete theme system guide
- [Theme Provider](./PROVIDER.md) - Theme provider types and configuration
- [Design Tokens](./DESIGN_TOKENS.md) - Token values and usage
- [Dark Mode](./DARK_MODE.md) - Theme mode types

### TypeScript & Development
- [Getting Started](../GETTING_STARTED.md) - TypeScript setup
- [Components Reference](../COMPONENTS_REFERENCE.md) - Component prop types

### Integration
- [UI Components](../ui/README.md) - Components with type-safe props
- [Hooks Reference](../hooks/README.md) - Type-safe theme hooks
