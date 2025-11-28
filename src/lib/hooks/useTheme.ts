/**
 * @file useTheme Hook
 * @description Hook for accessing and manipulating theme state
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useThemeContext } from '../theme/ThemeProvider';

/**
 * Theme mode type
 */
type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Theme hook return type
 */
export interface UseThemeReturn {
  /** Current theme mode */
  theme: ThemeMode;
  
  /** Whether dark mode is active */
  isDark: boolean;
  
  /** Whether light mode is active */
  isLight: boolean;
  
  /** Toggle between light and dark mode */
  toggle: () => void;
  
  /** Set specific theme mode */
  setTheme: (mode: ThemeMode) => void;
  
  /** Set to light mode */
  setLight: () => void;
  
  /** Set to dark mode */
  setDark: () => void;
  
  /** Set to system preference */
  setSystem: () => void;
  
  /** Get CSS variable value */
  getCssVar: (name: string) => string;
  
  /** Apply theme class to element */
  applyThemeClass: (element: HTMLElement) => void;
}

/**
 * Hook for accessing and manipulating theme state
 */
export function useTheme(): UseThemeReturn {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useThemeContext();
  
  const isDark = resolvedTheme === 'dark';
  const isLight = resolvedTheme === 'light';
  
  const setLight = useCallback(() => {
    setTheme('light');
  }, [setTheme]);
  
  const setDark = useCallback(() => {
    setTheme('dark');
  }, [setTheme]);
  
  const setSystem = useCallback(() => {
    setTheme('system');
  }, [setTheme]);
  
  const getCssVar = useCallback((name: string): string => {
    if (typeof window === 'undefined') return '';
    return getComputedStyle(document.documentElement)
      .getPropertyValue(`--${name}`)
      .trim();
  }, []);
  
  const applyThemeClass = useCallback(
    (element: HTMLElement) => {
      element.classList.remove('theme-light', 'theme-dark');
      element.classList.add(`theme-${resolvedTheme}`);
    },
    [resolvedTheme]
  );
  
  return useMemo(
    () => ({
      theme,
      isDark,
      isLight,
      toggle: toggleTheme,
      setTheme,
      setLight,
      setDark,
      setSystem,
      getCssVar,
      applyThemeClass,
    }),
    [
      theme,
      isDark,
      isLight,
      toggleTheme,
      setTheme,
      setLight,
      setDark,
      setSystem,
      getCssVar,
      applyThemeClass,
    ]
  );
}

/**
 * Hook for watching system theme preference changes
 */
export function useSystemThemePreference(): {
  prefersDark: boolean;
  prefersLight: boolean;
} {
  const [prefersDark, setPrefersDark] = useState(false);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setPrefersDark(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => {
      setPrefersDark(e.matches);
    };
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);
  
  return {
    prefersDark,
    prefersLight: !prefersDark,
  };
}
