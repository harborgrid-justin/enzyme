/**
 * @file Hydration Provider
 * @description Global context provider for the Auto-Prioritized Hydration System.
 *
 * The HydrationProvider:
 * - Manages the hydration scheduler lifecycle
 * - Provides hydration context to child components
 * - Integrates with performance monitoring
 * - Collects and reports hydration metrics
 *
 * @module hydration/HydrationProvider
 *
 * @example
 * ```tsx
 * import { HydrationProvider } from '@/lib/hydration';
 *
 * function App() {
 *   return (
 *     <HydrationProvider
 *       config={{ debug: true }}
 *       onMetric={(metric) => console.log('Hydration metric:', metric)}
 *     >
 *       <MainContent />
 *     </HydrationProvider>
 *   );
 * }
 * ```
 */

/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';

import {
  type HydrationScheduler,
  getHydrationScheduler,
  type SchedulerState,
} from './hydration-scheduler';

import type {
  HydrationContextValue,
  HydrationProviderProps,
  HydrationSchedulerConfig,
  HydrationTask,
  HydrationStatus,
  HydrationPriority,
  HydrationBoundaryId,
  HydrationMetricsSnapshot,
  HydrationMetricsReporter,
  HydrationEvent,
  PartialHydrationConfig,
} from './types';

import { mergeWithDefaults } from './types';

// ============================================================================
// Context
// ============================================================================

/**
 * Hydration context for accessing the hydration system.
 */
const HydrationContext = createContext<HydrationContextValue | null>(null);

/**
 * Display name for React DevTools.
 */
HydrationContext.displayName = 'HydrationContext';

// ============================================================================
// Internal Types
// ============================================================================

interface HydrationProviderState {
  isInitialized: boolean;
  isPaused: boolean;
  schedulerState: SchedulerState | null;
}

// ============================================================================
// HydrationProvider Component
// ============================================================================

/**
 * Global provider for the Auto-Prioritized Hydration System.
 *
 * This component manages the hydration scheduler and provides context to all
 * HydrationBoundary components in the tree.
 *
 * @param props - Provider props
 * @returns The provider wrapping children
 *
 * @example
 * ```tsx
 * <HydrationProvider
 *   config={{
 *     debug: process.env.NODE_ENV === 'development',
 *     budget: { frameTimeLimit: 50 },
 *   }}
 *   autoStart={true}
 *   onMetric={(metric, snapshot) => {
 *     analytics.track('hydration_complete', metric);
 *   }}
 * >
 *   <App />
 * </HydrationProvider>
 * ```
 */
export function HydrationProvider({
  children,
  config: configOverrides,
  onMetric,
  autoStart = true,
  integrateWithPerformance = true,
}: HydrationProviderProps): React.JSX.Element {
  // ==========================================================================
  // Refs
  // ==========================================================================

  /**
   * Scheduler instance reference.
   * Using ref to avoid re-creating on every render.
   */
  const schedulerRef = useRef<HydrationScheduler | null>(null);

  /**
   * Metrics callback reference.
   * Using ref to avoid stale closures in event handlers.
   */
  const onMetricRef = useRef<HydrationMetricsReporter | undefined>(onMetric);

  // Update ref in effect to avoid ref access during render
  useEffect(() => {
    onMetricRef.current = onMetric;
  }, [onMetric]);

  /**
   * Configuration merged with defaults.
   */
  const config = useMemo<HydrationSchedulerConfig>(
    () => mergeWithDefaults(configOverrides as PartialHydrationConfig),
    [configOverrides]
  );

  // ==========================================================================
  // State
  // ==========================================================================

  const [state, setState] = useState<HydrationProviderState>({
    isInitialized: false,
    isPaused: false,
    schedulerState: null,
  });

  // ==========================================================================
  // Scheduler Initialization
  // ==========================================================================

  useEffect(() => {
    // Create or get scheduler
    schedulerRef.current ??= getHydrationScheduler(config);

    const scheduler = schedulerRef.current;

    // Setup event listeners
    const unsubscribeComplete = scheduler.on('hydration:complete', (event) => {
      // Update state
      setState((prev) => ({
        ...prev,
        schedulerState: scheduler.getState(),
      }));

      // Report metric
      if (onMetricRef.current) {
        const payload = event.payload as { duration: number; replayedCount: number } | undefined;
        if (event.boundaryId && payload) {
          const status = scheduler.getStatus(event.boundaryId);
          if (status) {
            const metric = {
              boundaryId: event.boundaryId,
              priority: 'normal' as HydrationPriority, // Would need to track this
              trigger: 'visible' as const,
              queueDuration: 0,
              hydrationDuration: payload.duration,
              totalDuration: payload.duration,
              success: true,
              replayedInteractions: payload.replayedCount,
              timestamp: event.timestamp,
            };
            onMetricRef.current(metric, scheduler.getMetrics());
          }
        }
      }
    });

    const unsubscribeError = scheduler.on('hydration:error', (event) => {
      setState((prev) => ({
        ...prev,
        schedulerState: scheduler.getState(),
      }));

      // Report error metric
      if (onMetricRef.current && event.boundaryId) {
        const payload = event.payload as { error: Error; duration: number } | undefined;
        if (payload) {
          const metric = {
            boundaryId: event.boundaryId,
            priority: 'normal' as HydrationPriority,
            trigger: 'visible' as const,
            queueDuration: 0,
            hydrationDuration: payload.duration,
            totalDuration: payload.duration,
            success: false,
            errorMessage: payload.error.message,
            replayedInteractions: 0,
            timestamp: event.timestamp,
          };
          onMetricRef.current(metric, scheduler.getMetrics());
        }
      }
    });

    const unsubscribePaused = scheduler.on('scheduler:paused', () => {
      setState((prev) => ({
        ...prev,
        isPaused: true,
        schedulerState: scheduler.getState(),
      }));
    });

    const unsubscribeResumed = scheduler.on('scheduler:resumed', () => {
      setState((prev) => ({
        ...prev,
        isPaused: false,
        schedulerState: scheduler.getState(),
      }));
    });

    // Mark as initialized
    setState({
      isInitialized: true,
      isPaused: false,
      schedulerState: scheduler.getState(),
    });

    // Auto-start if configured
    if (autoStart) {
      scheduler.start();
    }

    // Performance monitoring integration
    let vitalsUnsubscribe: (() => void) | undefined;

    if (integrateWithPerformance && typeof window !== 'undefined') {
      // Report hydration metrics as custom performance entries
      const reportToPerformance = (event: HydrationEvent): void => {
        if ('performance' in window && 'mark' in performance) {
          const name = `hydration:${event.boundaryId ?? 'unknown'}`;

          if (event.type === 'hydration:start') {
            performance.mark(`${name}:start`);
          } else if (event.type === 'hydration:complete') {
            performance.mark(`${name}:end`);
            try {
              performance.measure(name, `${name}:start`, `${name}:end`);
            } catch {
              // Marks might not exist, ignore
            }
          }
        }
      };

      const unsubStart = scheduler.on('hydration:start', reportToPerformance);
      const unsubComplete = scheduler.on('hydration:complete', reportToPerformance);

      vitalsUnsubscribe = () => {
        unsubStart();
        unsubComplete();
      };
    }

    // Cleanup
    return () => {
      unsubscribeComplete();
      unsubscribeError();
      unsubscribePaused();
      unsubscribeResumed();
      vitalsUnsubscribe?.();
    };
  }, [autoStart, integrateWithPerformance, config]);

  // ==========================================================================
  // Context Methods
  // ==========================================================================

  const registerBoundary = useCallback((task: HydrationTask): void => {
    schedulerRef.current?.register(task);
  }, []);

  const unregisterBoundary = useCallback((id: HydrationBoundaryId): void => {
    schedulerRef.current?.unregister(id);
  }, []);

  const getBoundaryStatus = useCallback(
    (id: HydrationBoundaryId): HydrationStatus | undefined => {
      return schedulerRef.current?.getStatus(id);
    },
    []
  );

  const updatePriority = useCallback(
    (id: HydrationBoundaryId, priority: HydrationPriority): void => {
      schedulerRef.current?.updatePriority(id, priority);
    },
    []
  );

  const forceHydrate = useCallback(
    async (id: HydrationBoundaryId): Promise<void> => {
      await schedulerRef.current?.forceHydrate(id);
    },
    []
  );

  const forceHydrateAll = useCallback(async (): Promise<void> => {
    await schedulerRef.current?.forceHydrateAll();
  }, []);

  const pause = useCallback((): void => {
    schedulerRef.current?.pause();
  }, []);

  const resume = useCallback((): void => {
    schedulerRef.current?.resume();
  }, []);

  const getMetrics = useCallback((): HydrationMetricsSnapshot => {
    return (
      schedulerRef.current?.getMetrics() ?? {
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
      }
    );
  }, []);

  // ==========================================================================
  // Context Value
  // ==========================================================================

  const contextValue = useMemo<HydrationContextValue>(
    () => ({
      registerBoundary,
      unregisterBoundary,
      getBoundaryStatus,
      updatePriority,
      forceHydrate,
      forceHydrateAll,
      pause,
      resume,
      isPaused: state.isPaused,
      getMetrics,
      config,
      isInitialized: state.isInitialized,
    }),
    [
      registerBoundary,
      unregisterBoundary,
      getBoundaryStatus,
      updatePriority,
      forceHydrate,
      forceHydrateAll,
      pause,
      resume,
      state.isPaused,
      state.isInitialized,
      getMetrics,
      config,
    ]
  );

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <HydrationContext.Provider value={contextValue}>
      {children}
    </HydrationContext.Provider>
  );
}

// ============================================================================
// Hook for Accessing Context
// ============================================================================

/**
 * Hook to access the hydration context.
 *
 * @returns The hydration context value
 * @throws If used outside of HydrationProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { forceHydrate, getMetrics } = useHydrationContext();
 *
 *   const handleClick = () => {
 *     forceHydrate('my-boundary');
 *   };
 *
 *   return <button onClick={handleClick}>Hydrate Now</button>;
 * }
 * ```
 */
export function useHydrationContext(): HydrationContextValue {
  const context = useContext(HydrationContext);

  if (!context) {
    throw new Error(
      'useHydrationContext must be used within a HydrationProvider. ' +
        'Wrap your app with <HydrationProvider> to use hydration features.'
    );
  }

  return context;
}

/**
 * Hook to optionally access the hydration context.
 * Returns null if not within a HydrationProvider.
 *
 * @returns The hydration context value, or null
 *
 * @example
 * ```tsx
 * function OptionalHydrationComponent() {
 *   const hydration = useOptionalHydrationContext();
 *
 *   if (!hydration) {
 *     // Render without hydration features
 *     return <div>No hydration</div>;
 *   }
 *
 *   return <div>Hydration enabled</div>;
 * }
 * ```
 */
export function useOptionalHydrationContext(): HydrationContextValue | null {
  return useContext(HydrationContext);
}

// ============================================================================
// Exports
// ============================================================================

export { HydrationContext };
export type { HydrationContextValue, HydrationProviderProps };



