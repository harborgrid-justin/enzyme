/**
 * @file Lazy Exports for Performance Module
 * @description Lazy-loaded exports for dev-only and heavy components.
 * Use these exports to reduce initial bundle size by deferring
 * loading of development tools and monitoring dashboards.
 *
 * @example
 * ```tsx
 * import { Suspense } from 'react';
 * import { LazyPerformanceObservatory } from '@/lib/performance/lazy-exports';
 *
 * function App() {
 *   return (
 *     <Suspense fallback={<div>Loading...</div>}>
 *       {import.meta.env.DEV && <LazyPerformanceObservatory />}
 *     </Suspense>
 *   );
 * }
 * ```
 */

import { lazy } from 'react';

// ============================================================================
// Dev-Only Component Lazy Exports
// ============================================================================

/**
 * Lazy-loaded Render Tracker component
 * Use for development-only render performance debugging
 */
export const LazyRenderTracker = lazy(() =>
  import('./render-tracker').then((module) => ({
    default: module.RenderTracker,
  }))
);

/**
 * Lazy-loaded Performance Observatory dashboard
 * Use for development-only performance monitoring UI
 */
export const LazyPerformanceObservatory = lazy(() =>
  import('./PerformanceObservatory').then((module) => ({
    default: module.PerformanceObservatory,
  }))
);

/**
 * Lazy-loaded Performance Monitor class
 * Use when monitoring features are needed conditionally
 */
export const LazyPerformanceMonitor = lazy(() =>
  import('./performance-monitor').then((module) => ({
    default: () => {
      // Return a functional component that provides the monitor
      const monitor = module.getPerformanceMonitor();
      return monitor;
    },
  }))
);

/**
 * Lazy-loaded Memory Guardian
 * Heavy component for memory leak detection
 */
export const LazyMemoryGuardian = lazy(() =>
  import('./memory-guardian').then((module) => ({
    default: () => {
      module.getMemoryGuardian();
      return null;
    },
  }))
);

/**
 * Lazy-loaded Bundle Optimizer
 * Use for runtime bundle optimization features
 */
export const LazyBundleOptimizer = lazy(() =>
  import('./bundle-optimizer').then((module) => ({
    default: () => {
      module.getBundleOptimizer();
      return null;
    },
  }))
);

// ============================================================================
// Utility Functions for Conditional Loading
// ============================================================================

/**
 * Conditionally import performance observatory only in development
 */
export async function importPerformanceObservatoryInDev(): Promise<
  typeof import('./PerformanceObservatory') | null
> {
  if (process.env.NODE_ENV === 'development' || import.meta.env?.DEV) {
    return import('./PerformanceObservatory');
  }
  return null;
}

/**
 * Conditionally import render tracker only in development
 */
export async function importRenderTrackerInDev(): Promise<
  typeof import('./render-tracker') | null
> {
  if (process.env.NODE_ENV === 'development' || import.meta.env?.DEV) {
    return import('./render-tracker');
  }
  return null;
}

/**
 * Preload performance components for faster subsequent loads
 * Call this during idle time if you expect to use these components
 */
export function preloadPerformanceComponents(): void {
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(() => {
      import('./PerformanceObservatory');
      import('./render-tracker');
    });
  } else {
    setTimeout(() => {
      import('./PerformanceObservatory');
      import('./render-tracker');
    }, 100);
  }
}

// ============================================================================
// Type Exports
// ============================================================================

export type { PerformanceObservatoryProps } from './PerformanceObservatory';
export type { RenderTrackerConfig } from './render-tracker';
