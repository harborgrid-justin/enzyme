/**
 * @file Adaptive Layout Context
 * @description Context for adaptive layout management (Fast Refresh compliant).
 */

import { createContext } from 'react';

/**
 * Breakpoint names
 */
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/**
 * Layout mode
 */
export type LayoutMode = 'mobile' | 'tablet' | 'desktop';

/**
 * Adaptive layout context value
 */
export interface AdaptiveLayoutContextValue {
  currentBreakpoint: Breakpoint;
  layoutMode: LayoutMode;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  matchesBreakpoint: (breakpoint: Breakpoint) => boolean;
  isAboveBreakpoint: (breakpoint: Breakpoint) => boolean;
  isBelowBreakpoint: (breakpoint: Breakpoint) => boolean;
}

/**
 * Adaptive layout context - extracted for Fast Refresh compliance
 */
export const AdaptiveLayoutContext = createContext<AdaptiveLayoutContextValue | null>(null);

AdaptiveLayoutContext.displayName = 'AdaptiveLayoutContext';
