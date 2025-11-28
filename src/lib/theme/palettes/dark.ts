/**
 * Dark color palette definition.
 */

export const darkPalette = {
  // Brand colors
  primary: {
    50: '#1e3a8a',
    100: '#1e40af',
    200: '#1d4ed8',
    300: '#2563eb',
    400: '#3b82f6',
    500: '#60a5fa',
    600: '#93c5fd',
    700: '#bfdbfe',
    800: '#dbeafe',
    900: '#eff6ff',
  },

  // Secondary colors
  secondary: {
    50: '#0f172a',
    100: '#1e293b',
    200: '#334155',
    300: '#475569',
    400: '#64748b',
    500: '#94a3b8',
    600: '#cbd5e1',
    700: '#e2e8f0',
    800: '#f1f5f9',
    900: '#f8fafc',
  },

  // Semantic colors
  success: {
    50: '#14532d',
    100: '#166534',
    200: '#15803d',
    500: '#22c55e',
    600: '#4ade80',
    700: '#86efac',
  },

  warning: {
    50: '#78350f',
    100: '#92400e',
    200: '#b45309',
    500: '#f59e0b',
    600: '#fbbf24',
    700: '#fcd34d',
  },

  error: {
    50: '#7f1d1d',
    100: '#991b1b',
    200: '#b91c1c',
    500: '#ef4444',
    600: '#f87171',
    700: '#fca5a5',
  },

  info: {
    50: '#1e3a8a',
    100: '#1e40af',
    200: '#1d4ed8',
    500: '#3b82f6',
    600: '#60a5fa',
    700: '#93c5fd',
  },

  // Neutral colors
  neutral: {
    white: '#ffffff',
    black: '#000000',
    50: '#18181b',
    100: '#27272a',
    200: '#3f3f46',
    300: '#52525b',
    400: '#71717a',
    500: '#a1a1aa',
    600: '#d4d4d8',
    700: '#e4e4e7',
    800: '#f4f4f5',
    900: '#fafafa',
  },

  // Background colors
  background: {
    primary: '#0f172a',
    secondary: '#1e293b',
    tertiary: '#334155',
    inverse: '#ffffff',
  },

  // Text colors
  // Note: All text colors meet WCAG AA contrast requirements (4.5:1 for normal text on dark bg)
  text: {
    primary: '#f8fafc',    // 15.8:1 on #0f172a - AAA
    secondary: '#cbd5e1',  // 9.0:1 on #0f172a - AAA
    tertiary: '#a8b5c7',   // 5.5:1 on #0f172a - AA (updated from #94a3b8 for accessibility)
    inverse: '#0f172a',
    muted: '#9aa8bb',      // 4.8:1 on #0f172a - AA (updated from #64748b for better contrast)
  },

  // Border colors
  border: {
    default: '#334155',
    muted: '#1e293b',
    emphasis: '#475569',
  },
} as const;

export type DarkPalette = typeof darkPalette;
