/**
 * Centralized design tokens (spacing, colors, typography).
 * These tokens provide semantic values for consistent UI styling.
 */

/**
 * Semantic color tokens for use with theme system.
 * These map to palette values and provide CSS variable references.
 */
export const colorTokens = {
  // Primary brand colors
  primary: {
    default: 'var(--color-primary-500, #3b82f6)',
    hover: 'var(--color-primary-600, #2563eb)',
    active: 'var(--color-primary-700, #1d4ed8)',
    light: 'var(--color-primary-100, #dbeafe)',
    lighter: 'var(--color-primary-50, #eff6ff)',
  },

  // Secondary colors
  secondary: {
    default: 'var(--color-secondary-500, #64748b)',
    hover: 'var(--color-secondary-600, #475569)',
    active: 'var(--color-secondary-700, #334155)',
    light: 'var(--color-secondary-100, #f1f5f9)',
    lighter: 'var(--color-secondary-50, #f8fafc)',
  },

  // Semantic colors
  success: {
    default: 'var(--color-success-500, #22c55e)',
    hover: 'var(--color-success-600, #16a34a)',
    light: 'var(--color-success-100, #dcfce7)',
    lighter: 'var(--color-success-50, #f0fdf4)',
  },

  warning: {
    default: 'var(--color-warning-500, #f59e0b)',
    hover: 'var(--color-warning-600, #d97706)',
    light: 'var(--color-warning-100, #fef3c7)',
    lighter: 'var(--color-warning-50, #fffbeb)',
  },

  error: {
    default: 'var(--color-error-500, #ef4444)',
    hover: 'var(--color-error-600, #dc2626)',
    light: 'var(--color-error-100, #fee2e2)',
    lighter: 'var(--color-error-50, #fef2f2)',
  },

  info: {
    default: 'var(--color-info-500, #3b82f6)',
    hover: 'var(--color-info-600, #2563eb)',
    light: 'var(--color-info-100, #dbeafe)',
    lighter: 'var(--color-info-50, #eff6ff)',
  },

  // Neutral/Gray colors
  neutral: {
    white: '#ffffff',
    black: '#000000',
    50: 'var(--color-neutral-50, #fafafa)',
    100: 'var(--color-neutral-100, #f4f4f5)',
    200: 'var(--color-neutral-200, #e4e4e7)',
    300: 'var(--color-neutral-300, #d4d4d8)',
    400: 'var(--color-neutral-400, #a1a1aa)',
    500: 'var(--color-neutral-500, #71717a)',
    600: 'var(--color-neutral-600, #52525b)',
    700: 'var(--color-neutral-700, #3f3f46)',
    800: 'var(--color-neutral-800, #27272a)',
    900: 'var(--color-neutral-900, #18181b)',
  },

  // Background colors
  background: {
    primary: 'var(--color-bg-primary, #ffffff)',
    secondary: 'var(--color-bg-secondary, #f8fafc)',
    tertiary: 'var(--color-bg-tertiary, #f1f5f9)',
    muted: 'var(--color-bg-muted, #f9fafb)',
    inverse: 'var(--color-bg-inverse, #0f172a)',
  },

  // Text colors
  text: {
    primary: 'var(--color-text-primary, #0f172a)',
    secondary: 'var(--color-text-secondary, #475569)',
    tertiary: 'var(--color-text-tertiary, #5c6b7f)',
    muted: 'var(--color-text-muted, #6b7280)',
    inverse: 'var(--color-text-inverse, #ffffff)',
  },

  // Border colors
  border: {
    default: 'var(--color-border-default, #e2e8f0)',
    muted: 'var(--color-border-muted, #f1f5f9)',
    emphasis: 'var(--color-border-emphasis, #cbd5e1)',
    focus: 'var(--color-border-focus, #3b82f6)',
  },

  // Interactive states
  interactive: {
    hover: 'var(--color-interactive-hover, rgba(0, 0, 0, 0.04))',
    active: 'var(--color-interactive-active, rgba(0, 0, 0, 0.08))',
    selected: 'var(--color-interactive-selected, #eff6ff)',
    disabled: 'var(--color-interactive-disabled, #f4f4f5)',
  },
} as const;

export const tokens = {
  // Spacing (in pixels, converted to rem in CSS)
  spacing: {
    xs: '0.25rem', // 4px
    sm: '0.5rem', // 8px
    md: '1rem', // 16px
    lg: '1.5rem', // 24px
    xl: '2rem', // 32px
    '2xl': '3rem', // 48px
    '3xl': '4rem', // 64px
  },

  // Border radius
  radius: {
    none: '0',
    sm: '0.125rem', // 2px
    md: '0.25rem', // 4px
    lg: '0.5rem', // 8px
    xl: '1rem', // 16px
    full: '9999px',
  },

  // Font sizes
  fontSize: {
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    base: '1rem', // 16px
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
  },

  // Font weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  // Line heights
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },

  // Shadows
  shadow: {
    none: 'none',
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },

  // Z-index
  zIndex: {
    base: '0',
    dropdown: '100',
    sticky: '200',
    modal: '300',
    popover: '400',
    tooltip: '500',
    toast: '600',
  },

  // Transitions
  transition: {
    fast: '150ms ease-in-out',
    normal: '250ms ease-in-out',
    slow: '350ms ease-in-out',
  },

  // Breakpoints
  breakpoint: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
} as const;

export type Tokens = typeof tokens;
export type ColorTokens = typeof colorTokens;
export type SpacingToken = keyof typeof tokens.spacing;
export type RadiusToken = keyof typeof tokens.radius;
export type FontSizeToken = keyof typeof tokens.fontSize;
export type FontWeightToken = keyof typeof tokens.fontWeight;
export type ShadowToken = keyof typeof tokens.shadow;
export type ZIndexToken = keyof typeof tokens.zIndex;
export type ColorToken = keyof typeof colorTokens;
