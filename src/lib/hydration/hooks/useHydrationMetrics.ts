/**
 * @file useHydrationMetrics Hook
 * @description Hook for accessing and monitoring hydration performance metrics.
 *
 * This hook provides access to aggregated hydration metrics including:
 * - Hydration counts and rates
 * - Timing statistics (average, p95, total)
 * - Interaction replay statistics
 * - Real-time metric updates
 *
 * @module hydration/hooks/useHydrationMetrics
 *
 * @example
 * ```tsx
 * function HydrationDashboard() {
 *   const metrics = useHydrationMetrics();
 *
 *   return (
 *     <div className="metrics-dashboard">
 *       <MetricCard
 *         label="Hydration Progress"
 *         value={`${metrics.hydratedCount}/${metrics.totalBoundaries}`}
 *         progress={metrics.hydrationProgress}
 *       />
 *       <MetricCard
 *         label="Average Duration"
 *         value={`${metrics.averageHydrationDuration.toFixed(0)}ms`}
 *       />
 *       <MetricCard
 *         label="P95 Duration"
 *         value={`${metrics.p95HydrationDuration.toFixed(0)}ms`}
 *       />
 *       <MetricCard
 *         label="Time to Full Hydration"
 *         value={metrics.timeToFullHydration
 *           ? `${metrics.timeToFullHydration.toFixed(0)}ms`
 *           : 'In progress...'}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useOptionalHydrationContext } from '../HydrationProvider';
import { getHydrationScheduler } from '../hydration-scheduler';

import type { HydrationMetricsSnapshot } from '../types';

// ============================================================================
// Types
// ============================================================================

/**
 * Extended metrics with computed values.
 */
export interface UseHydrationMetricsReturn extends HydrationMetricsSnapshot {
  /**
   * Hydration progress as a percentage (0-100).
   */
  readonly hydrationProgress: number;

  /**
   * Estimated time remaining for full hydration in milliseconds.
   * null if not enough data for estimation.
   */
  readonly estimatedTimeRemaining: number | null;

  /**
   * Current hydration rate (boundaries per second).
   */
  readonly hydrationRate: number;

  /**
   * Whether all boundaries have been hydrated.
   */
  readonly isFullyHydrated: boolean;

  /**
   * Whether above-the-fold content has been hydrated.
   */
  readonly isAboveFoldHydrated: boolean;

  /**
   * Interaction replay success rate (0-1).
   */
  readonly replaySuccessRate: number;

  /**
   * History of hydration durations for charting.
   */
  readonly durationHistory: readonly number[];

  /**
   * Manually refresh the metrics.
   */
  readonly refresh: () => void;
}

/**
 * Options for the useHydrationMetrics hook.
 */
export interface UseHydrationMetricsOptions {
  /**
   * Polling interval for metrics updates in milliseconds.
   * Set to 0 to disable polling.
   *
   * @default 1000
   */
  readonly pollInterval?: number;

  /**
   * Maximum number of duration entries to keep in history.
   *
   * @default 50
   */
  readonly historySize?: number;

  /**
   * Whether to enable real-time updates via events.
   *
   * @default true
   */
  readonly realtime?: boolean;
}

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default metrics snapshot.
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

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculates the hydration rate (boundaries per second).
 */
function calculateHydrationRate(
  currentCount: number,
  previousCount: number,
  intervalMs: number
): number {
  if (intervalMs <= 0) return 0;
  const countDiff = currentCount - previousCount;
  return (countDiff / intervalMs) * 1000;
}

/**
 * Estimates time remaining based on current rate.
 */
function estimateTimeRemaining(
  pendingCount: number,
  rate: number
): number | null {
  if (rate <= 0 || pendingCount <= 0) return null;
  return (pendingCount / rate) * 1000;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for accessing and monitoring hydration performance metrics.
 *
 * Provides real-time access to hydration metrics with computed values
 * for progress tracking, rate estimation, and performance analysis.
 *
 * @param options - Hook options
 * @returns Extended hydration metrics
 *
 * @example
 * ```tsx
 * // Basic metrics display
 * function MetricsDisplay() {
 *   const {
 *     hydrationProgress,
 *     averageHydrationDuration,
 *     isFullyHydrated,
 *   } = useHydrationMetrics();
 *
 *   return (
 *     <div>
 *       <progress value={hydrationProgress} max={100} />
 *       <span>{hydrationProgress.toFixed(0)}% hydrated</span>
 *       <span>Avg: {averageHydrationDuration.toFixed(0)}ms</span>
 *       {isFullyHydrated && <span>All components interactive!</span>}
 *     </div>
 *   );
 * }
 *
 * // Performance monitoring integration
 * function PerformanceMonitor() {
 *   const metrics = useHydrationMetrics({ pollInterval: 500 });
 *
 *   useEffect(() => {
 *     // Report to analytics when fully hydrated
 *     if (metrics.isFullyHydrated && metrics.timeToFullHydration) {
 *       analytics.track('full_hydration', {
 *         duration: metrics.timeToFullHydration,
 *         average: metrics.averageHydrationDuration,
 *         p95: metrics.p95HydrationDuration,
 *         totalBoundaries: metrics.totalBoundaries,
 *       });
 *     }
 *   }, [metrics.isFullyHydrated, metrics]);
 *
 *   return null;
 * }
 *
 * // Duration history chart
 * function DurationChart() {
 *   const { durationHistory, averageHydrationDuration } = useHydrationMetrics({
 *     historySize: 100,
 *   });
 *
 *   return (
 *     <LineChart
 *       data={durationHistory}
 *       average={averageHydrationDuration}
 *       label="Hydration Duration (ms)"
 *     />
 *   );
 * }
 * ```
 */
export function useHydrationMetrics(
  options: UseHydrationMetricsOptions = {}
): UseHydrationMetricsReturn {
  const { pollInterval = 1000, historySize = 50, realtime = true } = options;

  // Get context (optional)
  const context = useOptionalHydrationContext();

  // ==========================================================================
  // State
  // ==========================================================================

  const [metrics, setMetrics] = useState<HydrationMetricsSnapshot>(DEFAULT_METRICS);
  const [durationHistory, setDurationHistory] = useState<number[]>([]);
  const [hydrationRate, setHydrationRate] = useState(0);

  // ==========================================================================
  // Refs
  // ==========================================================================

  const previousCountRef = useRef(0);
  const previousTimestampRef = useRef(0);

  // Initialize timestamp ref on first mount
  useEffect(() => {
    if (previousTimestampRef.current === 0) {
      previousTimestampRef.current = Date.now();
    }
  }, []);

  // ==========================================================================
  // Metrics Fetcher
  // ==========================================================================

  const fetchMetrics = useCallback(() => {
    let newMetrics: HydrationMetricsSnapshot | undefined;

    if (context) {
      newMetrics = context.getMetrics();
    } else {
      try {
        const scheduler = getHydrationScheduler();
        newMetrics = scheduler.getMetrics();
      } catch {
        // Scheduler not available
        return;
      }
    }

    if (newMetrics !== null && newMetrics !== undefined) {
      // Calculate hydration rate
      const now = Date.now();
      const intervalMs = now - previousTimestampRef.current;
      const rate = calculateHydrationRate(
        newMetrics.hydratedCount,
        previousCountRef.current,
        intervalMs
      );

      setHydrationRate(rate);
      previousCountRef.current = newMetrics.hydratedCount;
      previousTimestampRef.current = now;

      setMetrics(newMetrics);
    }
  }, [context]);

  // ==========================================================================
  // Event Subscription
  // ==========================================================================

  useEffect(() => {
    if (!realtime) {
      return;
    }

    try {
      const scheduler = getHydrationScheduler();

      return scheduler.on('hydration:complete', (event) => {
        // Update duration history
        const payload = event.payload as { duration: number } | undefined;
        if (payload?.duration !== null && payload?.duration !== undefined) {
          setDurationHistory((prev) => {
            const newHistory = [...prev, payload.duration];
            // Keep only the last historySize entries
            return newHistory.slice(-historySize);
          });
        }

        // Refresh metrics
        fetchMetrics();
      });
    } catch {
      // Scheduler not available
      return;
    }
  }, [realtime, historySize, fetchMetrics]);

  // ==========================================================================
  // Polling
  // ==========================================================================

  useEffect(() => {
    // Initial fetch
    fetchMetrics();

    // Setup polling if enabled
    if (pollInterval > 0) {
      const intervalId = setInterval(fetchMetrics, pollInterval);
      return () => clearInterval(intervalId);
    }

    return;
  }, [fetchMetrics, pollInterval]);

  // ==========================================================================
  // Computed Values
  // ==========================================================================




  return useMemo<UseHydrationMetricsReturn>(() => {
    const hydrationProgress =
      metrics.totalBoundaries > 0 ? (metrics.hydratedCount / metrics.totalBoundaries) * 100 : 0;

    const estimatedTimeRemaining = estimateTimeRemaining(metrics.pendingCount, hydrationRate);

    const isFullyHydrated =
      metrics.totalBoundaries > 0 && metrics.hydratedCount === metrics.totalBoundaries;

    const isAboveFoldHydrated = metrics.timeToAboveFoldHydration !== null;

    // Calculate replay success rate (assuming all replays succeed for now)
    const replaySuccessRate = metrics.totalReplayedInteractions > 0 ? 1.0 : 0;

    return {
      ...metrics,
      hydrationProgress,
      estimatedTimeRemaining,
      hydrationRate,
      isFullyHydrated,
      isAboveFoldHydrated,
      replaySuccessRate,
      durationHistory,
      refresh: fetchMetrics,
    };
  }, [metrics, durationHistory, hydrationRate, fetchMetrics]);
}

/**
 * Hook for watching a specific metric value.
 *
 * Useful for triggering effects when metrics cross thresholds.
 *
 * @param selector - Function to select the metric value
 * @param options - Hook options
 * @returns The selected metric value
 *
 * @example
 * ```tsx
 * function ProgressWatcher() {
 *   const progress = useHydrationMetricValue((m) => m.hydrationProgress);
 *
 *   useEffect(() => {
 *     if (progress >= 50) {
 *       console.log('Half hydrated!');
 *     }
 *     if (progress >= 100) {
 *       console.log('Fully hydrated!');
 *     }
 *   }, [progress]);
 *
 *   return <span>Progress: {progress.toFixed(0)}%</span>;
 * }
 * ```
 */
export function useHydrationMetricValue<T>(
  selector: (metrics: UseHydrationMetricsReturn) => T,
  options?: UseHydrationMetricsOptions
): T {
  const metrics = useHydrationMetrics(options);
  return selector(metrics);
}

/**
 * Hook for getting hydration progress.
 *
 * @returns Hydration progress percentage (0-100)
 *
 * @example
 * ```tsx
 * function ProgressBar() {
 *   const progress = useHydrationProgress();
 *   return <progress value={progress} max={100} />;
 * }
 * ```
 */
export function useHydrationProgress(): number {
  return useHydrationMetricValue((m) => m.hydrationProgress);
}

/**
 * Hook for checking if hydration is complete.
 *
 * @returns true if all boundaries are hydrated
 *
 * @example
 * ```tsx
 * function LoadingIndicator() {
 *   const isComplete = useIsHydrationComplete();
 *
 *   if (isComplete) {
 *     return null;
 *   }
 *
 *   return <Spinner />;
 * }
 * ```
 */
export function useIsHydrationComplete(): boolean {
  return useHydrationMetricValue((m) => m.isFullyHydrated);
}

/**
 * Hook for getting time to full hydration.
 *
 * @returns Time to full hydration in ms, or null if not complete
 *
 * @example
 * ```tsx
 * function HydrationTime() {
 *   const time = useTimeToFullHydration();
 *
 *   if (time === null) {
 *     return <span>Hydrating...</span>;
 *   }
 *
 *   return <span>Hydrated in {time.toFixed(0)}ms</span>;
 * }
 * ```
 */
export function useTimeToFullHydration(): number | null {
  return useHydrationMetricValue((m) => m.timeToFullHydration);
}

// ============================================================================
// Debug Hook
// ============================================================================

/**
 * Hook for debugging hydration metrics.
 *
 * Logs metrics to console on each update.
 *
 * @param label - Label for console output
 *
 * @example
 * ```tsx
 * function DebugComponent() {
 *   useHydrationMetricsDebug('HydrationMetrics');
 *   return <div>Check console for metrics</div>;
 * }
 * ```
 */
export function useHydrationMetricsDebug(label = 'HydrationMetrics'): void {
  const metrics = useHydrationMetrics({ pollInterval: 500 });

  useEffect(() => {
    console.info(`[${label}]`, {
      progress: `${metrics.hydrationProgress.toFixed(0)}%`,
      hydrated: `${metrics.hydratedCount}/${metrics.totalBoundaries}`,
      pending: metrics.pendingCount,
      failed: metrics.failedCount,
      avgDuration: `${metrics.averageHydrationDuration.toFixed(0)}ms`,
      p95Duration: `${metrics.p95HydrationDuration.toFixed(0)}ms`,
      rate: `${metrics.hydrationRate.toFixed(1)}/s`,
      queueSize: metrics.queueSize,
      timeToFull: metrics.timeToFullHydration !== null && metrics.timeToFullHydration !== undefined
        ? `${metrics.timeToFullHydration.toFixed(0)}ms`
        : 'pending',
    });
  }, [metrics, label]);
}

// ============================================================================
// Exports
// ============================================================================

// Types are already exported inline above
