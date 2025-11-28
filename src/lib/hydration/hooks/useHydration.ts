/**
 * @file useHydration Hook
 * @description Primary hook for accessing the hydration context and system controls.
 *
 * This hook provides access to the core hydration system functionality including:
 * - Global hydration controls (pause, resume, force hydrate)
 * - Configuration access
 * - Metrics retrieval
 * - System state information
 *
 * @module hydration/hooks/useHydration
 *
 * @example
 * ```tsx
 * function HydrationControls() {
 *   const {
 *     isPaused,
 *     pause,
 *     resume,
 *     forceHydrateAll,
 *     getMetrics,
 *   } = useHydration();
 *
 *   const metrics = getMetrics();
 *
 *   return (
 *     <div>
 *       <p>Hydrated: {metrics.hydratedCount}/{metrics.totalBoundaries}</p>
 *       <button onClick={isPaused ? resume : pause}>
 *         {isPaused ? 'Resume' : 'Pause'}
 *       </button>
 *       <button onClick={forceHydrateAll}>
 *         Hydrate All
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */

import { useCallback, useMemo } from 'react';

import {
  useHydrationContext,
  useOptionalHydrationContext,
} from '../HydrationProvider';

import type {
  HydrationContextValue,
  HydrationSchedulerConfig,
  HydrationMetricsSnapshot,
  HydrationBoundaryId,
  HydrationPriority,
  HydrationStatus,
} from '../types';

// ============================================================================
// Types
// ============================================================================

/**
 * Return type for the useHydration hook.
 */
export interface UseHydrationReturn {
  /**
   * Whether the hydration system is initialized.
   */
  readonly isInitialized: boolean;

  /**
   * Whether the hydration scheduler is currently paused.
   */
  readonly isPaused: boolean;

  /**
   * Pauses the hydration scheduler.
   * Pending tasks remain in queue but processing stops.
   */
  readonly pause: () => void;

  /**
   * Resumes a paused hydration scheduler.
   */
  readonly resume: () => void;

  /**
   * Forces immediate hydration of a specific boundary.
   *
   * @param boundaryId - ID of the boundary to hydrate
   */
  readonly forceHydrate: (boundaryId: HydrationBoundaryId) => Promise<void>;

  /**
   * Forces hydration of all pending boundaries.
   */
  readonly forceHydrateAll: () => Promise<void>;

  /**
   * Gets the current status of a hydration boundary.
   *
   * @param boundaryId - ID of the boundary to check
   * @returns The hydration status, or undefined if not found
   */
  readonly getStatus: (boundaryId: HydrationBoundaryId) => HydrationStatus | undefined;

  /**
   * Updates the priority of a hydration boundary.
   *
   * @param boundaryId - ID of the boundary to update
   * @param priority - New priority level
   */
  readonly updatePriority: (
    boundaryId: HydrationBoundaryId,
    priority: HydrationPriority
  ) => void;

  /**
   * Gets the current hydration metrics snapshot.
   *
   * @returns Aggregated hydration metrics
   */
  readonly getMetrics: () => HydrationMetricsSnapshot;

  /**
   * Gets the current hydration configuration.
   */
  readonly config: HydrationSchedulerConfig;
}

/**
 * Options for the useHydration hook.
 */
export interface UseHydrationOptions {
  /**
   * Whether to throw an error if used outside HydrationProvider.
   * If false, returns null-safe defaults when no provider is present.
   *
   * @default true
   */
  readonly throwIfNoProvider?: boolean;
}

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default metrics snapshot for when no provider is available.
 */
const DEFAULT_METRICS: HydrationMetricsSnapshot = {
  totalBoundaries: 0,
  hydratedCount: 0,
  pendingCount: 0,
  failedCount: 0,
  averageHydrationDuration: 0,
  p95HydrationDuration: 0,
  totalReplayedInteractions: 0,
  timeToFullHydration: null,
  timeToAboveFoldHydration: null,
  queueSize: 0,
  timestamp: Date.now(),
};

/**
 * Default config for when no provider is available.
 */
const DEFAULT_CONFIG: HydrationSchedulerConfig = {
  budget: {
    frameTimeLimit: 50,
    maxTasksPerFrame: 10,
    minIdleTime: 100,
    yieldToMain: true,
  },
  visibility: {
    root: null,
    rootMargin: '100px 0px',
    threshold: 0,
    triggerOnce: true,
  },
  debug: false,
  interactionStrategy: 'replay',
  useIdleCallback: true,
  maxQueueSize: 1000,
  taskTimeout: 10000,
  collectMetrics: true,
  metricsSampleRate: 1.0,
};

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Primary hook for accessing the hydration system.
 *
 * Provides access to global hydration controls, metrics, and configuration.
 * Must be used within a HydrationProvider unless `throwIfNoProvider` is false.
 *
 * @param options - Hook options
 * @returns Hydration system interface
 * @throws If used outside HydrationProvider and throwIfNoProvider is true
 *
 * @example
 * ```tsx
 * // Basic usage
 * function MyComponent() {
 *   const { getMetrics, isPaused, pause, resume } = useHydration();
 *
 *   const metrics = getMetrics();
 *   console.log(`${metrics.hydratedCount} of ${metrics.totalBoundaries} hydrated`);
 *
 *   return (
 *     <button onClick={isPaused ? resume : pause}>
 *       {isPaused ? 'Resume' : 'Pause'} Hydration
 *     </button>
 *   );
 * }
 *
 * // Safe usage outside provider
 * function SafeComponent() {
 *   const hydration = useHydration({ throwIfNoProvider: false });
 *
 *   // hydration will have null-safe defaults if no provider
 *   return <div>Hydrated: {hydration.getMetrics().hydratedCount}</div>;
 * }
 * ```
 */
export function useHydration(options: UseHydrationOptions = {}): UseHydrationReturn {
  const { throwIfNoProvider = true } = options;

  // IMPORTANT: Always call hooks unconditionally to comply with Rules of Hooks.
  // React hooks must be called in the same order on every render.
  const optionalContext = useOptionalHydrationContext();

  // If throwIfNoProvider is true and no context exists, throw an error after hooks are called
  if (throwIfNoProvider && optionalContext === null) {
    throw new Error(
      'useHydration must be used within a HydrationProvider. ' +
        'Wrap your app with <HydrationProvider> to use hydration features.'
    );
  }

  // Use the optional context result (which may be null if no provider)
  const context = optionalContext;

  // ==========================================================================
  // Memoized Callbacks
  // ==========================================================================

  const pause = useCallback(() => {
    context?.pause();
  }, [context]);

  const resume = useCallback(() => {
    context?.resume();
  }, [context]);

  const forceHydrate = useCallback(
    async (boundaryId: HydrationBoundaryId): Promise<void> => {
      await context?.forceHydrate(boundaryId);
    },
    [context]
  );

  const forceHydrateAll = useCallback(async (): Promise<void> => {
    await context?.forceHydrateAll();
  }, [context]);

  const getStatus = useCallback(
    (boundaryId: HydrationBoundaryId): HydrationStatus | undefined => {
      return context?.getBoundaryStatus(boundaryId);
    },
    [context]
  );

  const updatePriority = useCallback(
    (boundaryId: HydrationBoundaryId, priority: HydrationPriority): void => {
      context?.updatePriority(boundaryId, priority);
    },
    [context]
  );

  const getMetrics = useCallback((): HydrationMetricsSnapshot => {
    return context?.getMetrics() ?? DEFAULT_METRICS;
  }, [context]);

  // ==========================================================================
  // Return Value
  // ==========================================================================

  return useMemo<UseHydrationReturn>(
    () => ({
      isInitialized: context?.isInitialized ?? false,
      isPaused: context?.isPaused ?? false,
      pause,
      resume,
      forceHydrate,
      forceHydrateAll,
      getStatus,
      updatePriority,
      getMetrics,
      config: context?.config ?? DEFAULT_CONFIG,
    }),
    [
      context?.isInitialized,
      context?.isPaused,
      context?.config,
      pause,
      resume,
      forceHydrate,
      forceHydrateAll,
      getStatus,
      updatePriority,
      getMetrics,
    ]
  );
}

/**
 * Hook to check if hydration context is available.
 *
 * Useful for conditional rendering based on hydration support.
 *
 * @returns true if within a HydrationProvider
 *
 * @example
 * ```tsx
 * function ConditionalFeature() {
 *   const hasHydration = useHasHydrationContext();
 *
 *   if (!hasHydration) {
 *     return <FallbackComponent />;
 *   }
 *
 *   return <HydrationAwareComponent />;
 * }
 * ```
 */
export function useHasHydrationContext(): boolean {
  const context = useOptionalHydrationContext();
  return context !== null;
}

// ============================================================================
// Exports
// ============================================================================

export type { HydrationContextValue };
