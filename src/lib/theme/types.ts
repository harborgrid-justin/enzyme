/**
 * @file Theme Types
 * @description Type definitions for the theming system
 */

/**
 * Theme mode options
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Resolved theme (system resolves to light or dark)
 */
export type ResolvedTheme = 'light' | 'dark';

/**
 * Color palette definition
 */
export interface ColorPalette {
  // Primary colors
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

/**
 * Spacing scale
 */
export interface SpacingScale {
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

/**
 * Border radius scale
 */
export interface RadiusScale {
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

/**
 * Font size scale
 */
export interface FontSizeScale {
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

/**
 * Font weight scale
 */
export interface FontWeightScale {
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

/**
 * Line height scale
 */
export interface LineHeightScale {
  none: number;
  tight: number;
  snug: number;
  normal: number;
  relaxed: number;
  loose: number;
}

/**
 * Shadow scale
 */
export interface ShadowScale {
  sm: string;
  default: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  inner: string;
  none: string;
}

/**
 * Transition durations
 */
export interface TransitionDurations {
  fast: string;
  normal: string;
  slow: string;
}

/**
 * Z-index scale
 */
export interface ZIndexScale {
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

/**
 * Design tokens
 */
export interface DesignTokens {
  spacing: SpacingScale;
  radius: RadiusScale;
  fontSize: FontSizeScale;
  fontWeight: FontWeightScale;
  lineHeight: LineHeightScale;
  shadow: ShadowScale;
  transition: TransitionDurations;
  zIndex: ZIndexScale;
}

/**
 * Complete theme configuration
 */
export interface ThemeConfig {
  mode: ThemeMode;
  resolvedMode: ResolvedTheme;
  palette: ColorPalette;
  tokens: DesignTokens;
}

/**
 * Theme context value
 */
export interface ThemeContextValue {
  /** Current theme mode setting */
  mode: ThemeMode;
  
  /** Resolved theme (light or dark) */
  resolvedMode: ResolvedTheme;
  
  /** Set theme mode */
  setMode: (mode: ThemeMode) => void;
  
  /** Current theme configuration */
  theme: ThemeConfig;
}
