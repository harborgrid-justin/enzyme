/**
 * @file useLongTaskDetector Hook
 * @description React hook for detecting and responding to long tasks.
 *
 * Long tasks (>50ms) block the main thread and impact user interactivity.
 * This hook provides components with awareness of long tasks, enabling
 * adaptive behavior to improve perceived performance.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const {
 *     longTasks,
 *     isBlocked,
 *     totalBlockingTime,
 *     onLongTask
 *   } = useLongTaskDetector({
 *     onLongTask: (task) => {
 *       analytics.track('long_task', { duration: task.duration });
 *     }
 *   });
 *
 *   // Show loading indicator during blocking
 *   if (isBlocked) {
 *     return <Skeleton />;
 *   }
 *
 *   return <ExpensiveComponent />;
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  getPerformanceMonitor,
  type LongTaskEntry,
  type PerformanceMonitor,
} from '../performance-monitor';
import { LONG_TASK_CONFIG } from '../../../config/performance.config';

// ============================================================================
// Types
// ============================================================================

/**
 * Long task summary statistics
 */
export interface LongTaskStats {
  /** Total number of long tasks */
  readonly count: number;
  /** Number of critical long tasks (>100ms) */
  readonly criticalCount: number;
  /** Total blocking time (ms) */
  readonly totalBlockingTime: number;
  /** Average long task duration (ms) */
  readonly averageDuration: number;
  /** Maximum long task duration (ms) */
  readonly maxDuration: number;
  /** Recent long task rate (tasks per minute) */
  readonly ratePerMinute: number;
  /** Time since last long task (ms) */
  readonly timeSinceLastTask: number | null;
}

/**
 * Hook options
 */
export interface UseLongTaskDetectorOptions {
  /** Long task threshold (ms) - default 50ms */
  readonly threshold?: number;
  /** Critical threshold (ms) - default 100ms */
  readonly criticalThreshold?: number;
  /** Maximum tasks to keep in history */
  readonly maxHistory?: number;
  /** Callback when long task is detected */
  readonly onLongTask?: (task: LongTaskEntry) => void;
  /** Callback when critical long task is detected */
  readonly onCriticalTask?: (task: LongTaskEntry) => void;
  /** Time window for "isBlocked" detection (ms) */
  readonly blockDetectionWindow?: number;
  /** Enable debug logging */
  readonly debug?: boolean;
}

/**
 * Hook return value
 */
export interface UseLongTaskDetectorReturn {
  /** Recent long tasks */
  readonly longTasks: LongTaskEntry[];
  /** Long task statistics */
  readonly stats: LongTaskStats;
  /** Whether main thread is currently blocked */
  readonly isBlocked: boolean;
  /** Whether we're in a high-blocking period */
  readonly isHighBlocking: boolean;
  /** Total blocking time */
  readonly totalBlockingTime: number;
  /** Most recent long task */
  readonly lastTask: LongTaskEntry | null;
  /** Register callback for long tasks */
  readonly onLongTask: (callback: (task: LongTaskEntry) => void) => () => void;
  /** Clear long task history */
  readonly clearHistory: () => void;
  /** Check if component should defer rendering */
  readonly shouldDefer: () => boolean;
  /** Get attribution for last task */
  readonly getLastTaskAttribution: () => string | null;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for long task detection
 */
export function useLongTaskDetector(
  options: UseLongTaskDetectorOptions = {}
): UseLongTaskDetectorReturn {
  const {
    threshold = LONG_TASK_CONFIG.threshold,
    maxHistory = LONG_TASK_CONFIG.historyBufferSize,
    onLongTask,
    onCriticalTask,
    blockDetectionWindow = 100,
    debug = false,
  } = options;

  // Get monitor instance
  const monitorRef = useRef<PerformanceMonitor | null>(null);
  monitorRef.current ??= getPerformanceMonitor({ debug });
  const monitor = monitorRef.current;

  // State
  const [longTasks, setLongTasks] = useState<LongTaskEntry[]>([]);
  const [isBlocked, setIsBlocked] = useState(false);
  const [lastTaskTime, setLastTaskTime] = useState<number | null>(null);

  // Callbacks ref for stable identity
  const callbacksRef = useRef<Set<(task: LongTaskEntry) => void>>(new Set());

  // Block detection timer
  const blockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subscribe to long tasks from monitor
  useEffect(() => {
    // Ensure monitor is running
    if (!monitor.isMonitoring()) {
      monitor.start();
    }

    const unsubscribe = monitor.on<LongTaskEntry>('longTask', (task) => {
      // Update state
      setLongTasks((prev) => {
        const updated = [...prev, task];
        return updated.slice(-maxHistory);
      });

      setLastTaskTime(Date.now());

      // Set blocked state
      setIsBlocked(true);
      if (blockTimerRef.current) {
        clearTimeout(blockTimerRef.current);
      }
      blockTimerRef.current = setTimeout(() => {
        setIsBlocked(false);
      }, blockDetectionWindow);

      // Notify callbacks
      onLongTask?.(task);
      callbacksRef.current.forEach((cb) => cb(task));

      // Check for critical
      if (task.isCritical) {
        onCriticalTask?.(task);
      }

      if (debug) {
        // eslint-disable-next-line no-console
        console.log(
          `[useLongTaskDetector] Long task detected: ${task.duration.toFixed(2)}ms`,
          task.isCritical ? '(CRITICAL)' : ''
        );
      }
    });

    return () => {
      unsubscribe();
      if (blockTimerRef.current) {
        clearTimeout(blockTimerRef.current);
      }
    };
  }, [
    monitor,
    maxHistory,
    blockDetectionWindow,
    onLongTask,
    onCriticalTask,
    debug,
  ]);

  // Calculate statistics
  const stats = useMemo<LongTaskStats>(() => {
    if (longTasks.length === 0) {
      return {
        count: 0,
        criticalCount: 0,
        totalBlockingTime: 0,
        averageDuration: 0,
        maxDuration: 0,
        ratePerMinute: 0,
        timeSinceLastTask: null,
      };
    }

    const durations = longTasks.map((t) => t.duration);
    const criticalTasks = longTasks.filter((t) => t.isCritical);
    const totalBlocking = durations.reduce(
      (sum, d) => sum + Math.max(0, d - threshold),
      0
    );

    // Calculate rate (tasks in last minute)
    const oneMinuteAgo = Date.now() - 60000;
    const recentTasks = longTasks.filter((t) => t.timestamp >= oneMinuteAgo);

    return {
      count: longTasks.length,
      criticalCount: criticalTasks.length,
      totalBlockingTime: totalBlocking,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      maxDuration: Math.max(...durations),
      ratePerMinute: recentTasks.length,
      timeSinceLastTask: lastTaskTime !== null && lastTaskTime !== 0 ? Date.now() - lastTaskTime : null,
    };
  }, [longTasks, threshold, lastTaskTime]);

  // Calculate if high blocking period
  const isHighBlocking = useMemo(() => {
    // High blocking if more than 5 long tasks in the last 30 seconds
    const thirtySecondsAgo = Date.now() - 30000;
    const recentTasks = longTasks.filter((t) => t.timestamp >= thirtySecondsAgo);
    return recentTasks.length > 5;
  }, [longTasks]);

  // Get last task
  const lastTask = useMemo((): LongTaskEntry | null => {
    return longTasks.length > 0 ? longTasks[longTasks.length - 1] ?? null : null;
  }, [longTasks]);

  // Register callback
  const registerCallback = useCallback(
    (callback: (task: LongTaskEntry) => void): (() => void) => {
      callbacksRef.current.add(callback);
      return () => {
        callbacksRef.current.delete(callback);
      };
    },
    []
  );

  // Clear history
  const clearHistory = useCallback(() => {
    setLongTasks([]);
    setLastTaskTime(null);
  }, []);

  // Should defer rendering
  const shouldDefer = useCallback((): boolean => {
    // Defer if currently blocked or in high blocking period
    return isBlocked || isHighBlocking;
  }, [isBlocked, isHighBlocking]);

  // Get attribution for last task
  const getLastTaskAttribution = useCallback((): string | null => {
    if ((lastTask === null) || (lastTask.attribution.length === 0)) {
      return null;
    }

    const [attr] = lastTask.attribution;
    if ((attr?.containerSrc !== undefined) && (attr.containerSrc !== null) && (attr.containerSrc !== '')) {
      return attr.containerSrc;
    }
    if ((attr?.containerName !== undefined) && (attr.containerName !== null) && (attr.containerName !== '')) {
      return attr.containerName;
    }
    return attr?.name ?? null;
  }, [lastTask]);

  return {
    longTasks,
    stats,
    isBlocked,
    isHighBlocking,
    totalBlockingTime: stats.totalBlockingTime,
    lastTask,
    onLongTask: registerCallback,
    clearHistory,
    shouldDefer,
    getLastTaskAttribution,
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to defer rendering during long tasks
 */
export function useDeferredRender<T>(
  value: T,
  options: UseLongTaskDetectorOptions = {}
): T {
  const { shouldDefer } = useLongTaskDetector(options);
  const [deferredValue, setDeferredValue] = useState(value);

  useEffect(() => {
    if (!shouldDefer()) {
      setTimeout(() => {
        setDeferredValue(value);
      }, 0);
      return;
    } else {
      // Use requestIdleCallback to update when idle
      const id = requestIdleCallback(() => {
        setDeferredValue(value);
      }) as unknown as number;
      return () => cancelIdleCallback(id);
    }
  }, [value, shouldDefer]);

  return deferredValue;
}

/**
 * Hook to track blocking time for a specific operation
 */
export function useBlockingTimeTracker(): {
  startTracking: () => void;
  stopTracking: () => number;
  blockingTime: number;
} {
  const [blockingTime, setBlockingTime] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const tasksDuringOperationRef = useRef<LongTaskEntry[]>([]);

  const { onLongTask } = useLongTaskDetector();

  useEffect(() => {
    const unsubscribe = onLongTask((task) => {
      if (startTimeRef.current !== null) {
        tasksDuringOperationRef.current.push(task);
      }
    });
    return unsubscribe;
  }, [onLongTask]);

  const startTracking = useCallback(() => {
    startTimeRef.current = performance.now();
    tasksDuringOperationRef.current = [];
  }, []);

  const stopTracking = useCallback(() => {
    if (startTimeRef.current === null) return 0;

    const totalBlocking = tasksDuringOperationRef.current.reduce(
      (sum, task) => sum + Math.max(0, task.duration - 50),
      0
    );

    setBlockingTime(totalBlocking);
    startTimeRef.current = null;
    tasksDuringOperationRef.current = [];

    return totalBlocking;
  }, []);

  return { startTracking, stopTracking, blockingTime };
}

/**
 * Hook that yields to main thread during long operations
 */
/**
 * Type for the experimental Scheduler API
 */
interface SchedulerWithYield {
  scheduler: {
    yield: () => Promise<void>;
  };
}

/**
 * Type guard for checking if globalThis has the scheduler.yield API
 */
function hasSchedulerYield(obj: typeof globalThis): obj is typeof globalThis & SchedulerWithYield {
  return (
    'scheduler' in obj &&
    typeof (obj as SchedulerWithYield).scheduler === 'object' &&
    (obj as SchedulerWithYield).scheduler !== null &&
    'yield' in (obj as SchedulerWithYield).scheduler
  );
}

export function useYieldToMain(): {
  yieldToMain: () => Promise<void>;
  yieldIfNeeded: (elapsedMs: number) => Promise<void>;
} {
  const yieldToMain = useCallback(async (): Promise<void> => {
    return new Promise((resolve) => {
      if (hasSchedulerYield(globalThis)) {
        const global = globalThis as unknown as SchedulerWithYield;
        void global.scheduler.yield().then(resolve);
      } else {
        setTimeout(resolve, 0);
      }
    });
  }, []);

  const yieldIfNeeded = useCallback(
    async (elapsedMs: number): Promise<void> => {
      // Yield if we've been running for more than 50ms
      if (elapsedMs > 50) {
        await yieldToMain();
      }
    },
    [yieldToMain]
  );

  return { yieldToMain, yieldIfNeeded };
}

// ============================================================================
// Polyfill for requestIdleCallback
// ============================================================================

const requestIdleCallback =
  (typeof window !== 'undefined') && (window.requestIdleCallback !== undefined)
    ? window.requestIdleCallback
    : (callback: () => void) => setTimeout(callback, 1);

const cancelIdleCallback =
  (typeof window !== 'undefined') && (window.cancelIdleCallback !== undefined)
    ? window.cancelIdleCallback
    : (id: number) => clearTimeout(id);
