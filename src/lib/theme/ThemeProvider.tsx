import React, {
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode
} from 'react';
import { ThemeContext, type ThemeContextValue } from '../contexts/ThemeContext';
import { lightPalette } from './palettes/light';
import { darkPalette } from './palettes/dark';
import { tokens } from './tokens';
import { useFeatureFlag } from '../flags/useFeatureFlag';
import { flagKeys } from '../flags/flagKeys';

type Theme = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'app-theme';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
}

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

/**
 * Global theme context with persistence + dark/light mode.
 * Respects the 'dark-mode' feature flag - when disabled, forces light mode only.
 */
export function ThemeProvider({ children, defaultTheme }: ThemeProviderProps): React.ReactElement {
  // Check if dark mode toggle is enabled via feature flag
  const darkModeEnabled = useFeatureFlag(flagKeys.DARK_MODE);

  const [theme, setThemeState] = useState<Theme>(() => {
    // If dark mode is disabled, always use light theme
    if (!darkModeEnabled) return 'light';
    return defaultTheme ?? getStoredTheme();
  });
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    // If dark mode is disabled, always resolve to light
    if (!darkModeEnabled) return 'light';
    const initial = defaultTheme ?? getStoredTheme();
    return initial === 'system' ? getSystemTheme() : initial;
  });

  // Update resolved theme when theme or system preference changes
  useEffect(() => {
    const resolved = theme === 'system' ? getSystemTheme() : theme;

    // Apply theme to document and update state
    queueMicrotask(() => {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(resolved);
      document.documentElement.setAttribute('data-theme', resolved);
      setResolvedTheme(resolved);
    });
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (): void => {
      if (theme === 'system') {
        const newResolved = getSystemTheme();
        setResolvedTheme(newResolved);
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(newResolved);
        document.documentElement.setAttribute('data-theme', newResolved);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    // If dark mode is disabled, ignore attempts to set dark/system themes
    if (!darkModeEnabled && (newTheme === 'dark' || newTheme === 'system')) {
      console.warn('[ThemeProvider] Dark mode is disabled via feature flag. Ignoring theme change.');
      return;
    }
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  }, [darkModeEnabled]);

  const toggleTheme = useCallback(() => {
    // If dark mode is disabled, do nothing
    if (!darkModeEnabled) {
      console.warn('[ThemeProvider] Dark mode is disabled via feature flag. Theme toggle is disabled.');
      return;
    }
    setTheme(resolvedTheme === 'light' ? 'dark' : 'light');
  }, [darkModeEnabled, resolvedTheme, setTheme]);

  const palette = useMemo(() =>
    resolvedTheme === 'dark' ? darkPalette : lightPalette,
    [resolvedTheme]
  );

  // PERFORMANCE: Memoize context value to prevent unnecessary re-renders
  const value: ThemeContextValue = useMemo(() => ({
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    palette,
    tokens,
    darkModeEnabled,
  }), [theme, resolvedTheme, setTheme, toggleTheme, palette, darkModeEnabled]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access the theme context.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
}
