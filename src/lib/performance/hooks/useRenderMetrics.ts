/**
 * @file useRenderMetrics Hook
 * @description React hook for component render performance tracking.
 *
 * Provides components with render time measurement capabilities,
 * re-render detection, and performance optimization insights.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const {
 *     renderCount,
 *     lastRenderTime,
 *     averageRenderTime,
 *     isSlowRender,
 *     trackRender
 *   } = useRenderMetrics('MyComponent');
 *
 *   // Track this render
 *   const endRender = trackRender();
 *   useEffect(() => endRender(), []);
 *
 *   if (isSlowRender) {
 *     console.warn('Slow render detected');
 *   }
 *
 *   return <div>Renders: {renderCount}</div>;
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getRenderTracker,
  type RenderTracker,
  type RenderEntry,
  type ComponentRenderStats,
  type RenderPhase,
  type RenderReason,
} from '../render-tracker';
import { RENDER_CONFIG } from '../../../config/performance.config';

// ============================================================================
// Types
// ============================================================================

/**
 * Render metrics for a component
 */
export interface RenderMetrics {
  /** Total render count */
  readonly renderCount: number;
  /** Last render duration (ms) */
  readonly lastRenderTime: number;
  /** Average render time (ms) */
  readonly averageRenderTime: number;
  /** Minimum render time (ms) */
  readonly minRenderTime: number;
  /** Maximum render time (ms) */
  readonly maxRenderTime: number;
  /** 95th percentile render time */
  readonly p95RenderTime: number;
  /** Whether last render was slow */
  readonly isSlowRender: boolean;
  /** Number of wasted renders */
  readonly wastedRenders: number;
  /** Wasted render percentage */
  readonly wastedRenderRate: number;
  /** Render reasons breakdown */
  readonly renderReasons: Record<RenderReason, number>;
  /** Total render time (ms) */
  readonly totalRenderTime: number;
}

/**
 * Hook options
 */
export interface UseRenderMetricsOptions {
  /** Slow render threshold (ms) */
  readonly slowThreshold?: number;
  /** Enable automatic tracking */
  readonly autoTrack?: boolean;
  /** Track props changes */
  readonly trackProps?: boolean;
  /** Track state changes */
  readonly trackState?: boolean;
  /** Callback on slow render */
  readonly onSlowRender?: (entry: RenderEntry) => void;
  /** Callback on wasted render */
  readonly onWastedRender?: (entry: RenderEntry) => void;
  /** Enable debug logging */
  readonly debug?: boolean;
}

/**
 * Hook return value
 */
export interface UseRenderMetricsReturn {
  /** Current render metrics */
  readonly metrics: RenderMetrics;
  /** Total render count */
  readonly renderCount: number;
  /** Last render duration */
  readonly lastRenderTime: number;
  /** Average render time */
  readonly averageRenderTime: number;
  /** Whether currently slow */
  readonly isSlowRender: boolean;
  /** Start tracking a render (returns stop function) */
  readonly trackRender: (phase?: RenderPhase) => () => void;
  /** Start tracking an interaction */
  readonly trackInteraction: (name: string) => () => void;
  /** Get full component stats */
  readonly getStats: () => ComponentRenderStats | null;
  /** Mark render as wasted */
  readonly markWastedRender: () => void;
  /** Reset metrics */
  readonly reset: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for component render metrics
 */
export function useRenderMetrics(
  componentName: string,
  options: UseRenderMetricsOptions = {}
): UseRenderMetricsReturn {
  const {
    slowThreshold = RENDER_CONFIG.slowComponentThreshold,
    autoTrack = false,
    trackProps = false,
    trackState = false,
    onSlowRender,
    onWastedRender,
    debug = false,
  } = options;

  // Get tracker instance
  const trackerRef = useRef<RenderTracker | null>(null);
  trackerRef.current ??= getRenderTracker({
    slowThreshold,
    debug,
    onSlowRender: (entry) => {
      if (entry.componentName === componentName) {
        onSlowRender?.(entry);
      }
    },
    onWastedRender: (entry) => {
      if (entry.componentName === componentName) {
        onWastedRender?.(entry);
      }
    },
  });

  const tracker = trackerRef.current;

  // Component instance ID (stable across renders)
  const componentIdRef = useRef<string>('');
  if (componentIdRef.current === '') {
    componentIdRef.current = `${componentName}_${Math.random().toString(36).substr(2, 6)}`;
  }

  // Track render count
  const renderCountRef = useRef(0);

  // State for metrics
  const [metrics, setMetrics] = useState<RenderMetrics>(() => ({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    minRenderTime: 0,
    maxRenderTime: 0,
    p95RenderTime: 0,
    isSlowRender: false,
    wastedRenders: 0,
    wastedRenderRate: 0,
    renderReasons: {
      initial: 0,
      'props-change': 0,
      'state-change': 0,
      'context-change': 0,
      'parent-render': 0,
      'hooks-change': 0,
      'force-update': 0,
      unknown: 0,
    },
    totalRenderTime: 0,
  }));

  // Track props for change detection
  const prevPropsRef = useRef<Record<string, unknown> | undefined>(undefined);
  const prevStateRef = useRef<Record<string, unknown> | undefined>(undefined);

  // Update metrics from tracker
  const updateMetrics = useCallback(() => {
    const stats = tracker.getComponentStats(componentName);
    if (stats) {
      setMetrics({
        renderCount: stats.totalRenders,
        lastRenderTime: stats.lastRenderTime,
        averageRenderTime: stats.averageRenderTime,
        minRenderTime: stats.minRenderTime,
        maxRenderTime: stats.maxRenderTime,
        p95RenderTime: stats.p95RenderTime,
        isSlowRender: stats.isSlowComponent,
        wastedRenders: stats.wastedRenders,
        wastedRenderRate: stats.wastedRenderRate,
        renderReasons: stats.rendersByReason,
        totalRenderTime: stats.totalRenderTime,
      });
    }
  }, [tracker, componentName]);

  // Auto-track renders
  useEffect(() => {
    renderCountRef.current++;

    if (autoTrack) {
      const stopTracking = tracker.startRender(componentName, {
        componentId: componentIdRef.current,
        isInitial: renderCountRef.current === 1,
        props: trackProps ? prevPropsRef.current : undefined,
        state: trackState ? prevStateRef.current : undefined,
      });

      // Stop tracking after render is complete
      const timeoutId = setTimeout(() => {
        stopTracking();
        updateMetrics();
      }, 0);

      return () => {
        clearTimeout(timeoutId);
      };
    }
    
    return undefined;
  });

  // Manual track render
  const trackRender = useCallback(
    (phase: RenderPhase = 'render') => {
      const stopTracking = tracker.startRender(componentName, {
        componentId: componentIdRef.current,
        phase,
        isInitial: renderCountRef.current === 1,
        props: trackProps ? prevPropsRef.current : undefined,
        state: trackState ? prevStateRef.current : undefined,
      });

      return () => {
        stopTracking();
        updateMetrics();
      };
    },
    [tracker, componentName, trackProps, trackState, updateMetrics]
  );

  // Track interaction
  const trackInteraction = useCallback(
    (name: string) => {
      return tracker.startInteraction(name);
    },
    [tracker]
  );

  // Get full stats
  const getStats = useCallback((): ComponentRenderStats | null => {
    return tracker.getComponentStats(componentName);
  }, [tracker, componentName]);

  // Mark wasted render (manual)
  const markWastedRender = useCallback(() => {
    // This is a placeholder - in a real implementation,
    // we'd need to update the last render entry
    if (debug) {
      console.info(`[useRenderMetrics] Wasted render marked for ${componentName}`);
    }
  }, [componentName, debug]);

  // Reset metrics
  const reset = useCallback(() => {
    setMetrics({
      renderCount: 0,
      lastRenderTime: 0,
      averageRenderTime: 0,
      minRenderTime: 0,
      maxRenderTime: 0,
      p95RenderTime: 0,
      isSlowRender: false,
      wastedRenders: 0,
      wastedRenderRate: 0,
      renderReasons: {
        initial: 0,
        'props-change': 0,
        'state-change': 0,
        'context-change': 0,
        'parent-render': 0,
        'hooks-change': 0,
        'force-update': 0,
        unknown: 0,
      },
      totalRenderTime: 0,
    });
    renderCountRef.current = 0;
  }, []);

  return {
    metrics,
    renderCount: metrics.renderCount,
    lastRenderTime: metrics.lastRenderTime,
    averageRenderTime: metrics.averageRenderTime,
    isSlowRender: metrics.isSlowRender,
    trackRender,
    trackInteraction,
    getStats,
    markWastedRender,
    reset,
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to measure a specific render phase
 */
export function useRenderPhaseMetrics(
  componentName: string,
  phase: RenderPhase
): {
  duration: number;
  measure: () => () => void;
} {
  const [duration, setDuration] = useState(0);
  const tracker = getRenderTracker();

  const measure = useCallback(() => {
    const stop = tracker.startRender(componentName, { phase });
    return () => {
      const entry = stop();
      if (entry) {
        setDuration(entry.duration);
      }
    };
  }, [tracker, componentName, phase]);

  return { duration, measure };
}

/**
 * Hook for render profiling during development
 */
export function useRenderProfiler(
  componentName: string
): {
  onRender: (
    id: string,
    phase: 'mount' | 'update',
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number
  ) => void;
  getReport: () => string;
} {
  const tracker = getRenderTracker();
  const durationsRef = useRef<number[]>([]);

  const onRender = useCallback(
    (
      _id: string,
      phase: 'mount' | 'update',
      actualDuration: number,
      _baseDuration: number,
      _startTime: number,
      _commitTime: number
    ) => {
      durationsRef.current.push(actualDuration);

      // Track in our system
      const stop = tracker.startRender(componentName, {
        isInitial: phase === 'mount',
      });
      stop();
    },
    [tracker, componentName]
  );

  const getReport = useCallback(() => {
    const durations = durationsRef.current;
    if (durations.length === 0) return 'No renders recorded';

    const sorted = [...durations].sort((a, b) => a - b);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];

    return [
      `Component: ${componentName}`,
      `Renders: ${durations.length}`,
      `Average: ${avg.toFixed(2)}ms`,
      `P50: ${p50?.toFixed(2) ?? 'N/A'}ms`,
      `P95: ${p95?.toFixed(2) ?? 'N/A'}ms`,
      `Min: ${sorted[0]?.toFixed(2) ?? 'N/A'}ms`,
      `Max: ${sorted[sorted.length - 1]?.toFixed(2) ?? 'N/A'}ms`,
    ].join('\n');
  }, [componentName]);

  return { onRender, getReport };
}

/**
 * Hook to detect unnecessary re-renders
 */
export function useWastedRenderDetector(
  componentName: string,
  deps: unknown[]
): {
  wasWasted: boolean;
  reason: string | null;
} {
  const prevDepsRef = useRef<unknown[] | null>(null);
  const [wasWasted, setWasWasted] = useState(false);
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    if (prevDepsRef.current === null) {
      prevDepsRef.current = deps;
      return;
    }

    // Check if any deps actually changed
    const changed: number[] = [];
    const prevDeps = prevDepsRef.current;
    deps.forEach((dep, i) => {
      if (prevDeps !== null && dep !== prevDeps[i]) {
        changed.push(i);
      }
    });

    queueMicrotask(() => {
      if (changed.length === 0) {
        setWasWasted(true);
        setReason(`No dependencies changed for ${componentName}`);
      } else {
        setWasWasted(false);
        setReason(null);
      }
    });

    prevDepsRef.current = deps;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { wasWasted, reason };
}

// ============================================================================
// Exports
// ============================================================================

// Types are already exported at their declaration sites
