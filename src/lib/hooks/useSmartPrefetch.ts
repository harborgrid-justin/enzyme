/**
 * @file Smart Prefetching Utilities
 * @description Intelligent prefetching with network awareness and connection quality detection
 * for optimal performance. Pure TypeScript utilities without React dependencies.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Connection quality type based on Network Information API
 */
export type ConnectionType = '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';

/**
 * Network information from the Navigator.connection API
 */
export interface NetworkInformation {
  effectiveType?: ConnectionType;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

/**
 * Navigator with connection property
 */
interface NavigatorWithConnection extends Navigator {
  connection?: EventTarget & NetworkInformation;
}

/**
 * Configuration for a prefetch target
 */
export interface PrefetchTarget {
  /** Query key for data prefetching */
  queryKey: readonly unknown[];
  /** Data fetcher function */
  queryFn: () => Promise<unknown>;
  /** Route module loader for code splitting */
  moduleLoader?: () => Promise<unknown>;
  /** Priority (higher = more important, 0-10) */
  priority?: number;
  /** Stale time for prefetched data (ms) */
  staleTime?: number;
}

/**
 * Options for smart prefetch manager
 */
export interface SmartPrefetchOptions {
  /** Skip prefetch on slow connections or data saver mode */
  respectDataSaver?: boolean;
  /** Max concurrent prefetches to avoid overwhelming network */
  maxConcurrent?: number;
  /** Minimum connection quality required for prefetching */
  minConnectionQuality?: ConnectionType;
}

// ============================================================================
// Network Quality Utilities
// ============================================================================

/**
 * Connection quality ranking for comparison
 */
const CONNECTION_QUALITY_RANK: Record<ConnectionType, number> = {
  '4g': 4,
  '3g': 3,
  '2g': 2,
  'slow-2g': 1,
  unknown: 3, // Assume decent connection if unknown
};

/**
 * Get current network information
 */
export function getNetworkInfo(): NetworkInformation {
  const navigator = globalThis.navigator as NavigatorWithConnection | undefined;
  const connection = navigator?.connection;

  return {
    effectiveType: connection?.effectiveType ?? 'unknown',
    downlink: connection?.downlink ?? Infinity,
    rtt: connection?.rtt ?? 0,
    saveData: connection?.saveData ?? false,
  };
}

/**
 * Check if current connection meets minimum quality requirement
 */
export function meetsMinimumQuality(
  current: ConnectionType,
  minimum: ConnectionType
): boolean {
  return CONNECTION_QUALITY_RANK[current] >= CONNECTION_QUALITY_RANK[minimum];
}

/**
 * Check if prefetching should be allowed based on network conditions
 */
export function shouldAllowPrefetch(
  options: {
    respectDataSaver?: boolean;
    minConnectionQuality?: ConnectionType;
  } = {}
): boolean {
  const {
    respectDataSaver = true,
    minConnectionQuality = '2g',
  } = options;

  const networkInfo = getNetworkInfo();

  // Respect data saver mode
  if (respectDataSaver && networkInfo.saveData === true) {
    return false;
  }

  // Check minimum connection quality
  return meetsMinimumQuality(networkInfo.effectiveType ?? 'unknown', minConnectionQuality);


}

// ============================================================================
// Smart Prefetch Manager
// ============================================================================

/**
 * Manages intelligent prefetching with network awareness and concurrency control
 */
export class SmartPrefetchManager {
  private prefetchedKeys = new Set<string>();
  private activePrefetches = 0;
  private options: Required<SmartPrefetchOptions>;

  constructor(options: SmartPrefetchOptions = {}) {
    this.options = {
      respectDataSaver: options.respectDataSaver ?? true,
      maxConcurrent: options.maxConcurrent ?? 3,
      minConnectionQuality: options.minConnectionQuality ?? '2g',
    };
  }

  /**
   * Execute prefetch for a target
   */
  async prefetch(target: PrefetchTarget): Promise<void> {
    const key = JSON.stringify(target.queryKey);

    // Skip if already prefetched
    if (this.prefetchedKeys.has(key)) {
      return;
    }

    // Check if we should prefetch
    if (!this.shouldPrefetch()) {
      return;
    }

    this.prefetchedKeys.add(key);
    this.activePrefetches++;

    try {
      // Prefetch module code if provided (code splitting)
      if (target.moduleLoader) {
        target.moduleLoader().catch(() => {
          // Silent fail for module prefetch - not critical
        });
      }

      // Execute data fetch
      await target.queryFn();
    } catch {
      // Remove from prefetched set on error to allow retry
      this.prefetchedKeys.delete(key);
    } finally {
      this.activePrefetches--;
    }
  }

  /**
   * Prefetch multiple targets during idle time
   */
  prefetchOnIdle(targets: PrefetchTarget[]): void {
    // Sort by priority (highest first)
    const sorted = [...targets].sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
    );

    if ('requestIdleCallback' in globalThis) {
      sorted.forEach((target) => {
        requestIdleCallback(
          () => {
            void this.prefetch(target);
          },
          { timeout: 5000 } // 5 second timeout
        );
      });
    } else {
      // Fallback: staggered setTimeout
      sorted.forEach((target, index) => {
        setTimeout(() => {
          void this.prefetch(target);
        }, 1000 + index * 200);
      });
    }
  }

  /**
   * Clear prefetch cache (for testing or reset)
   */
  clearCache(): void {
    this.prefetchedKeys.clear();
  }

  /**
   * Get current prefetch stats
   */
  getStats(): {
    prefetchedCount: number;
    activeCount: number;
    maxConcurrent: number;
  } {
    return {
      prefetchedCount: this.prefetchedKeys.size,
      activeCount: this.activePrefetches,
      maxConcurrent: this.options.maxConcurrent,
    };
  }

  /**
   * Check if prefetching should happen based on network and concurrency
   */
  private shouldPrefetch(): boolean {
    // Don't prefetch if too many active requests
    if (this.activePrefetches >= this.options.maxConcurrent) {
      return false;
    }

    return shouldAllowPrefetch({
      respectDataSaver: this.options.respectDataSaver,
      minConnectionQuality: this.options.minConnectionQuality,
    });
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Helper to create type-safe prefetch configurations
 */
export function createPrefetchConfig<T>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<T>,
  options?: Omit<PrefetchTarget, 'queryKey' | 'queryFn'>
): PrefetchTarget {
  return {
    queryKey,
    queryFn,
    ...options,
  };
}

/**
 * Create a debounced prefetch function
 */
export function createDebouncedPrefetch(
  manager: SmartPrefetchManager,
  delay: number = 100
): (target: PrefetchTarget) => void {
  const timeouts = new Map<string, ReturnType<typeof setTimeout>>();

  return (target: PrefetchTarget) => {
    const key = JSON.stringify(target.queryKey);

    // Clear existing timeout
    const existingTimeout = timeouts.get(key);
    if (existingTimeout !== undefined && existingTimeout !== null) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      void manager.prefetch(target);
      timeouts.delete(key);
    }, delay);

    timeouts.set(key, timeout);
  };
}

/**
 * Monitor network quality changes
 */
export function monitorNetworkQuality(
  callback: (info: NetworkInformation) => void
): () => void {
  const navigator = globalThis.navigator as NavigatorWithConnection | undefined;
  const connection = navigator?.connection;

  if (!connection) {
    // Return no-op cleanup function
    return () => {};
  }

  const handleChange = (): void => {
    callback(getNetworkInfo());
  };

  connection.addEventListener('change', handleChange);

  return () => {
  connection.removeEventListener('change', handleChange);
};
}