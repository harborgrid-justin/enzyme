/**
 * @file useMemoryPressure Hook
 * @description React hook for monitoring JavaScript heap memory usage and pressure.
 *
 * Provides components with awareness of memory conditions, enabling
 * adaptive behavior to prevent memory-related performance degradation.
 *
 * Note: The Memory API (performance.memory) is only available in Chrome/Chromium browsers.
 * This hook gracefully degrades on unsupported browsers.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const {
 *     pressure,
 *     usagePercent,
 *     isUnderPressure,
 *     shouldReduceMemory
 *   } = useMemoryPressure({
 *     onPressureChange: (pressure) => {
 *       if (pressure === 'critical') {
 *         clearCaches();
 *       }
 *     }
 *   });
 *
 *   // Reduce memory usage when under pressure
 *   if (shouldReduceMemory) {
 *     return <LiteVersion />;
 *   }
 *
 *   return <FullVersion />;
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MEMORY_CONFIG, formatBytes } from '../../../config/performance.config';
import { isMemoryApiSupported, getPerformanceMemory } from '../utils/memory';

// ============================================================================
// Types
// ============================================================================

/**
 * Memory pressure level
 */
export type MemoryPressureLevel = 'normal' | 'warning' | 'critical';

/**
 * Memory snapshot
 */
export interface MemorySnapshot {
  /** Used JS heap size in bytes */
  readonly usedJSHeapSize: number;
  /** Total JS heap size in bytes */
  readonly totalJSHeapSize: number;
  /** JS heap size limit in bytes */
  readonly jsHeapSizeLimit: number;
  /** Usage as percentage (0-100) */
  readonly usagePercent: number;
  /** Current pressure level */
  readonly pressure: MemoryPressureLevel;
  /** Timestamp of snapshot */
  readonly timestamp: number;
}

/**
 * Memory trend data
 */
export interface MemoryTrend {
  /** Direction of memory usage */
  readonly direction: 'increasing' | 'stable' | 'decreasing';
  /** Rate of change (bytes per second) */
  readonly rateOfChange: number;
  /** Estimated time until critical (ms) or null if not increasing */
  readonly timeUntilCritical: number | null;
}

/**
 * Hook options
 */
export interface UseMemoryPressureOptions {
  /** Warning threshold (0-1) */
  readonly warningThreshold?: number;
  /** Critical threshold (0-1) */
  readonly criticalThreshold?: number;
  /** Polling interval (ms) */
  readonly pollingInterval?: number;
  /** Callback on pressure change */
  readonly onPressureChange?: (pressure: MemoryPressureLevel, snapshot: MemorySnapshot) => void;
  /** Callback on critical pressure */
  readonly onCritical?: (snapshot: MemorySnapshot) => void;
  /** Enable automatic cleanup on critical */
  readonly autoCleanup?: boolean;
  /** Custom cleanup function */
  readonly cleanupFn?: () => void;
  /** Enable debug logging */
  readonly debug?: boolean;
}

/**
 * Hook return value
 */
export interface UseMemoryPressureReturn {
  /** Current memory snapshot */
  readonly snapshot: MemorySnapshot | null;
  /** Current pressure level */
  readonly pressure: MemoryPressureLevel;
  /** Usage percentage (0-100) */
  readonly usagePercent: number;
  /** Whether under any pressure (warning or critical) */
  readonly isUnderPressure: boolean;
  /** Whether should reduce memory usage */
  readonly shouldReduceMemory: boolean;
  /** Memory trend */
  readonly trend: MemoryTrend | null;
  /** Whether Memory API is supported */
  readonly isSupported: boolean;
  /** Force a memory snapshot */
  readonly refresh: () => void;
  /** Request garbage collection (if available) */
  readonly requestGC: () => void;
  /** Get memory history */
  readonly getHistory: () => MemorySnapshot[];
  /** Format bytes for display */
  readonly formatBytes: (bytes: number) => string;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for memory pressure monitoring
 */
export function useMemoryPressure(
  options: UseMemoryPressureOptions = {}
): UseMemoryPressureReturn {
  const {
    warningThreshold = MEMORY_CONFIG.warningThreshold,
    criticalThreshold = MEMORY_CONFIG.criticalThreshold,
    pollingInterval = MEMORY_CONFIG.pollingInterval,
    onPressureChange,
    onCritical,
    autoCleanup = MEMORY_CONFIG.autoCleanup,
    cleanupFn,
    debug = false,
  } = options;

  // State
  const [snapshot, setSnapshot] = useState<MemorySnapshot | null>(null);
  const [history, setHistory] = useState<MemorySnapshot[]>([]);
  const [isSupported] = useState(isMemoryApiSupported);

  // Refs for callbacks
  const lastPressureRef = useRef<MemoryPressureLevel>('normal');
  const callbacksRef = useRef({ onPressureChange, onCritical, cleanupFn });

  // Update callbacks ref
  useEffect(() => {
    callbacksRef.current = { onPressureChange, onCritical, cleanupFn };
  }, [onPressureChange, onCritical, cleanupFn]);

  // Calculate pressure level
  const calculatePressure = useCallback(
    (usagePercent: number): MemoryPressureLevel => {
      const usage = usagePercent / 100;
      if (usage >= criticalThreshold) return 'critical';
      if (usage >= warningThreshold) return 'warning';
      return 'normal';
    },
    [warningThreshold, criticalThreshold]
  );

  // Take memory snapshot
  const takeSnapshot = useCallback((): MemorySnapshot | null => {
    const memory = getPerformanceMemory();
    if (!memory) return null;

    const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
    const pressure = calculatePressure(usagePercent);

    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usagePercent,
      pressure,
      timestamp: Date.now(),
    };
  }, [calculatePressure]);

  // Request garbage collection (Chrome DevTools only)
  const requestGC = useCallback((): void => {
    if (typeof globalThis !== 'undefined' && 'gc' in globalThis) {
      try {
        const globalWithGC = globalThis as typeof globalThis & { gc: () => void };
        globalWithGC.gc();
        if (debug) {
          console.log('[useMemoryPressure] GC requested');
        }
      } catch {
        if (debug) {
          console.log('[useMemoryPressure] GC not available');
        }
      }
    }
  }, [debug]);

  // Perform cleanup
  const performCleanup = useCallback((): void => {
    if (debug) {
      console.log('[useMemoryPressure] Performing cleanup');
    }

    // Clear caches if available
    if ('caches' in globalThis) {
      // Don't actually clear caches, just log
      if (debug) {
        console.log('[useMemoryPressure] Cache clearing would be performed here');
      }
    }

    // Call custom cleanup
    callbacksRef.current.cleanupFn?.();

    // Request GC
    requestGC();
  }, [debug, requestGC]);

  // Polling effect
  useEffect(() => {
    if (!isSupported) return;

    const poll = (): void => {
      const newSnapshot = takeSnapshot();
      if (!newSnapshot) return;

      setSnapshot(newSnapshot);
      setHistory((prev) => {
        const updated = [...prev, newSnapshot];
        // Keep last 100 snapshots
        return updated.slice(-100);
      });

      // Check for pressure change
      if (newSnapshot.pressure !== lastPressureRef.current) {
        if (debug) {
          console.log(
            `[useMemoryPressure] Pressure changed: ${lastPressureRef.current} -> ${newSnapshot.pressure}`
          );
        }

        callbacksRef.current.onPressureChange?.(newSnapshot.pressure, newSnapshot);

        // Handle critical
        if (newSnapshot.pressure === 'critical') {
          callbacksRef.current.onCritical?.(newSnapshot);

          if (autoCleanup) {
            performCleanup();
          }
        }

        lastPressureRef.current = newSnapshot.pressure;
      }
    };

    // Initial poll
    poll();

    // Set up interval
    const intervalId = setInterval(poll, pollingInterval);

    return () => clearInterval(intervalId);
  }, [isSupported, pollingInterval, takeSnapshot, autoCleanup, performCleanup, debug]);

  // Calculate trend
  const trend = useMemo<MemoryTrend | null>(() => {
    if (history.length < 2) return null;

    const recentHistory = history.slice(-10);
    const oldestSnapshot = recentHistory[0];
    const newestSnapshot = recentHistory[recentHistory.length - 1];

    if (!oldestSnapshot || !newestSnapshot) return null;

    const timeDiff = newestSnapshot.timestamp - oldestSnapshot.timestamp;
    if (timeDiff === 0) return null;

    const byteDiff = newestSnapshot.usedJSHeapSize - oldestSnapshot.usedJSHeapSize;
    const rateOfChange = (byteDiff / timeDiff) * 1000; // bytes per second

    let direction: 'increasing' | 'stable' | 'decreasing';
    if (Math.abs(rateOfChange) < 1024 * 10) {
      // Less than 10KB/s change
      direction = 'stable';
    } else if (rateOfChange > 0) {
      direction = 'increasing';
    } else {
      direction = 'decreasing';
    }

    // Calculate time until critical
    let timeUntilCritical: number | null = null;
    if (direction === 'increasing' && newestSnapshot.pressure !== 'critical') {
      const criticalBytes = newestSnapshot.jsHeapSizeLimit * criticalThreshold;
      const bytesToCritical = criticalBytes - newestSnapshot.usedJSHeapSize;
      if (bytesToCritical > 0 && rateOfChange > 0) {
        timeUntilCritical = (bytesToCritical / rateOfChange) * 1000;
      }
    }

    return {
      direction,
      rateOfChange,
      timeUntilCritical,
    };
  }, [history, criticalThreshold]);

  // Refresh (manual snapshot)
  const refresh = useCallback((): void => {
    const newSnapshot = takeSnapshot();
    if (newSnapshot) {
      setSnapshot(newSnapshot);
    }
  }, [takeSnapshot]);

  // Get history
  const getHistory = useCallback((): MemorySnapshot[] => {
    return [...history];
  }, [history]);

  // Derived values
  const pressure = snapshot?.pressure ?? 'normal';
  const usagePercent = snapshot?.usagePercent ?? 0;
  const isUnderPressure = pressure !== 'normal';
  const shouldReduceMemory = pressure === 'critical' || (pressure === 'warning' && (trend?.direction === 'increasing'));

  return {
    snapshot,
    pressure,
    usagePercent,
    isUnderPressure,
    shouldReduceMemory,
    trend,
    isSupported,
    refresh,
    requestGC,
    getHistory,
    formatBytes,
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook that triggers cleanup when memory pressure is detected
 */
export function useMemoryCleanup(
  cleanupFn: () => void,
  options: { threshold?: MemoryPressureLevel } = {}
): void {
  const { threshold = 'warning' } = options;
  const cleanupRef = useRef(cleanupFn);

  useEffect(() => {
    cleanupRef.current = cleanupFn;
  }, [cleanupFn]);

  const { pressure: _pressure } = useMemoryPressure({
    onPressureChange: (newPressure) => {
      if (
        (threshold === 'warning' && newPressure !== 'normal') ||
        (threshold === 'critical' && newPressure === 'critical')
      ) {
        cleanupRef.current();
      }
    },
  });
}

/**
 * Hook that provides memory-aware caching
 */
export function useMemoryAwareCache<T>(
  maxSize: number = 100
): {
  get: (key: string) => T | undefined;
  set: (key: string, value: T) => void;
  clear: () => void;
  size: number;
} {
  const cacheRef = useRef<Map<string, T>>(new Map());
  const [size, setSize] = useState(0);

  const { shouldReduceMemory } = useMemoryPressure();

  // Reduce cache size when under pressure
  useEffect(() => {
    if (shouldReduceMemory && cacheRef.current.size > 0) {
      // Keep only half the items
      const entries = Array.from(cacheRef.current.entries());
      const toKeep = entries.slice(-Math.floor(entries.length / 2));
      cacheRef.current = new Map(toKeep);
      setSize(cacheRef.current.size);
    }
  }, [shouldReduceMemory]);

  const get = useCallback((key: string): T | undefined => {
    return cacheRef.current.get(key);
  }, []);

  const set = useCallback(
    (key: string, value: T): void => {
      // Evict oldest if at capacity
      if (cacheRef.current.size >= maxSize) {
        const firstKey = cacheRef.current.keys().next().value;
        if (firstKey) cacheRef.current.delete(firstKey);
      }

      cacheRef.current.set(key, value);
      setSize(cacheRef.current.size);
    },
    [maxSize]
  );

  const clear = useCallback((): void => {
    cacheRef.current.clear();
    setSize(0);
  }, []);

  return { get, set, clear, size };
}

/**
 * Hook that monitors component memory impact
 */
export function useComponentMemoryImpact(): {
  mountSize: number | null;
  currentSize: number | null;
  impact: number | null;
} {
  const mountSizeRef = useRef<number | null>(null);
  const [currentSize, setCurrentSize] = useState<number | null>(null);

  const { snapshot } = useMemoryPressure();

  // Capture mount size
  useEffect(() => {
    if (snapshot && mountSizeRef.current === null) {
      mountSizeRef.current = snapshot.usedJSHeapSize;
    }
  }, [snapshot]);

  // Update current size
  useEffect(() => {
    if (snapshot) {
      setCurrentSize(snapshot.usedJSHeapSize);
    }
  }, [snapshot]);

  const impact = useMemo(() => {
    if (mountSizeRef.current === null || currentSize === null) return null;
    return currentSize - mountSizeRef.current;
  }, [currentSize]);

  return {
    mountSize: mountSizeRef.current,
    currentSize,
    impact,
  };
}

// ============================================================================
// Exports
// ============================================================================

// Types are already exported at their declaration sites
