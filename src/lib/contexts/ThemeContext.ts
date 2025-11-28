/**
 * @file Theme Context
 * @description Context for theme management (Fast Refresh compliant).
 */

import { createContext } from 'react';

/**
 * Color scheme
 */
export type ColorScheme = 'light' | 'dark' | 'auto';

/**
 * Theme configuration
 */
export interface ThemeConfig {
  colorScheme: ColorScheme;
  primaryColor?: string;
  accentColor?: string;
  errorColor?: string;
  warningColor?: string;
  successColor?: string;
  infoColor?: string;
  fontFamily?: string;
  fontSize?: string;
  lineHeight?: number;
  borderRadius?: string;
  boxShadow?: string;
}

/**
 * Theme context value
 */
export interface ThemeContextValue {
  theme: 'light' | 'dark' | 'system';
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleTheme: () => void;
  palette: Record<string, string | Record<string, string>>;
  tokens: Record<string, string | Record<string, string>>;
  /** Whether dark mode toggle is enabled via feature flag */
  darkModeEnabled: boolean;
}

/**
 * Theme context - extracted for Fast Refresh compliance
 */
export const ThemeContext = createContext<ThemeContextValue | null>(null);
