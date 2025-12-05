/**
 * Effect Hook Utilities Module
 *
 * Provides utilities for managing side effects with enhanced cleanup,
 * dependency tracking, and async effect handling.
 *
 * @module hooks/effect
 * @example
 * ```typescript
 * useAsyncEffect(async () => {
 *   const data = await fetchData();
 *   setData(data);
 * }, [dependency]);
 * ```
 */

import { DependencyList, EffectCallback, useEffect, useRef, useCallback } from 'react';

/**
 * Async effect callback type
 */
export type AsyncEffectCallback = () => Promise<void | (() => void)>;

/**
 * Effect cleanup function type
 */
export type CleanupFunction = () => void;

/**
 * Effect configuration options
 */
export interface EffectOptions {
  /** Whether to skip initial effect execution */
  skipInitial?: boolean;
  /** Debounce delay in milliseconds */
  debounce?: number;
  /** Throttle interval in milliseconds */
  throttle?: number;
  /** Callback when effect throws an error */
  onError?: (error: Error) => void;
}

/**
 * Creates an effect hook for async operations with automatic cleanup
 *
 * @param effect - Async effect callback
 * @param deps - Dependency array
 *
 * @example
 * ```typescript
 * function MyComponent({ userId }: { userId: string }) {
 *   useAsyncEffect(async () => {
 *     const user = await fetchUser(userId);
 *     setUser(user);
 *
 *     return () => {
 *       // Cleanup logic
 *     };
 *   }, [userId]);
 * }
 * ```
 */
export function useAsyncEffect(
  effect: AsyncEffectCallback,
  deps?: DependencyList
): void {
  useEffect(() => {
    let cleanup: CleanupFunction | void;
    let cancelled = false;

    const executeEffect = async () => {
      try {
        cleanup = await effect();
      } catch (error) {
        if (!cancelled) {
          console.error('Async effect error:', error);
        }
      }
    };

    executeEffect();

    return () => {
      cancelled = true;
      if (cleanup) {
        cleanup();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Creates an effect that only runs when dependencies change (not on mount)
 *
 * @param effect - Effect callback
 * @param deps - Dependency array
 *
 * @example
 * ```typescript
 * function MyComponent({ count }: { count: number }) {
 *   useUpdateEffect(() => {
 *     console.log('Count updated to:', count);
 *   }, [count]);
 * }
 * ```
 */
export function useUpdateEffect(
  effect: EffectCallback,
  deps?: DependencyList
): void {
  const isMounted = useRef(false);

  useEffect(() => {
    if (isMounted.current) {
      return effect();
    }
    isMounted.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Creates a debounced effect that delays execution
 *
 * @param effect - Effect callback
 * @param deps - Dependency array
 * @param delay - Debounce delay in milliseconds
 *
 * @example
 * ```typescript
 * function SearchComponent({ query }: { query: string }) {
 *   useDebouncedEffect(() => {
 *     searchApi(query).then(setResults);
 *   }, [query], 500);
 * }
 * ```
 */
export function useDebouncedEffect(
  effect: EffectCallback,
  deps: DependencyList,
  delay: number
): void {
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      effect();
    }, delay);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delay]);
}

/**
 * Creates a throttled effect that limits execution frequency
 *
 * @param effect - Effect callback
 * @param deps - Dependency array
 * @param interval - Throttle interval in milliseconds
 *
 * @example
 * ```typescript
 * function ScrollComponent() {
 *   const [scrollY, setScrollY] = useState(0);
 *
 *   useThrottledEffect(() => {
 *     console.log('Scroll position:', scrollY);
 *   }, [scrollY], 100);
 * }
 * ```
 */
export function useThrottledEffect(
  effect: EffectCallback,
  deps: DependencyList,
  interval: number
): void {
  const lastRun = useRef(Date.now());

  useEffect(() => {
    const now = Date.now();

    if (now - lastRun.current >= interval) {
      lastRun.current = now;
      return effect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, interval]);
}

/**
 * Creates an effect with configurable options
 *
 * @param effect - Effect callback
 * @param deps - Dependency array
 * @param options - Effect options
 *
 * @example
 * ```typescript
 * useConfigurableEffect(
 *   () => console.log('Effect running'),
 *   [dependency],
 *   { skipInitial: true, debounce: 300 }
 * );
 * ```
 */
export function useConfigurableEffect(
  effect: EffectCallback,
  deps: DependencyList,
  options: EffectOptions = {}
): void {
  const isMounted = useRef(false);

  useEffect(() => {
    if (options.skipInitial && !isMounted.current) {
      isMounted.current = true;
      return;
    }

    let timeoutId: NodeJS.Timeout | undefined;
    let cleanup: void | CleanupFunction;

    const executeEffect = () => {
      try {
        cleanup = effect();
      } catch (error) {
        if (options.onError) {
          options.onError(error as Error);
        } else {
          throw error;
        }
      }
    };

    if (options.debounce) {
      timeoutId = setTimeout(executeEffect, options.debounce);
    } else if (options.throttle) {
      // Simplified throttle - in production use more sophisticated logic
      executeEffect();
    } else {
      executeEffect();
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (cleanup) {
        cleanup();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Creates an effect that runs on an interval
 *
 * @param callback - Function to execute on interval
 * @param delay - Interval delay in milliseconds (null to pause)
 *
 * @example
 * ```typescript
 * function Timer() {
 *   const [count, setCount] = useState(0);
 *
 *   useInterval(() => {
 *     setCount(c => c + 1);
 *   }, 1000);
 * }
 * ```
 */
export function useInterval(
  callback: () => void,
  delay: number | null
): void {
  const savedCallback = useRef(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval
  useEffect(() => {
    if (delay === null) {
      return;
    }

    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

/**
 * Creates an effect that runs on a timeout
 *
 * @param callback - Function to execute after timeout
 * @param delay - Timeout delay in milliseconds (null to cancel)
 *
 * @example
 * ```typescript
 * function DelayedMessage() {
 *   const [show, setShow] = useState(false);
 *
 *   useTimeout(() => {
 *     setShow(true);
 *   }, 3000);
 * }
 * ```
 */
export function useTimeout(
  callback: () => void,
  delay: number | null
): void {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) {
      return;
    }

    const id = setTimeout(() => savedCallback.current(), delay);
    return () => clearTimeout(id);
  }, [delay]);
}

/**
 * Creates an effect that fetches data with loading and error states
 *
 * @template T - Data type
 * @param fetcher - Async function to fetch data
 * @param deps - Dependency array
 * @returns Object with data, loading, and error states
 *
 * @example
 * ```typescript
 * function UserProfile({ userId }: { userId: string }) {
 *   const { data, loading, error, refetch } = useFetchEffect(
 *     async () => {
 *       const response = await fetch(`/api/users/${userId}`);
 *       return response.json();
 *     },
 *     [userId]
 *   );
 * }
 * ```
 */
export function useFetchEffect<T>(
  fetcher: () => Promise<T>,
  deps: DependencyList
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const [refetchCount, setRefetchCount] = React.useState(0);

  useAsyncEffect(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [...deps, refetchCount]);

  const refetch = useCallback(() => {
    setRefetchCount(c => c + 1);
  }, []);

  return { data, loading, error, refetch };
}

/**
 * Creates an effect that tracks when dependencies change
 *
 * @param deps - Dependencies to track
 * @param onChange - Callback when dependencies change
 *
 * @example
 * ```typescript
 * function MyComponent({ userId, theme }: Props) {
 *   useDependencyChange(
 *     [userId, theme],
 *     (prev, next) => {
 *       console.log('Changed from', prev, 'to', next);
 *     }
 *   );
 * }
 * ```
 */
export function useDependencyChange(
  deps: DependencyList,
  onChange: (prevDeps: DependencyList | undefined, nextDeps: DependencyList) => void
): void {
  const prevDeps = useRef<DependencyList>();

  useEffect(() => {
    if (prevDeps.current !== undefined) {
      onChange(prevDeps.current, deps);
    }
    prevDeps.current = deps;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Creates an effect that only runs when specific dependencies change
 *
 * @param effect - Effect callback
 * @param deps - Dependency array
 * @param whitelist - Array of indices of dependencies to watch
 *
 * @example
 * ```typescript
 * // Only runs when the first dependency changes
 * useConditionalEffect(
 *   () => console.log('First dep changed'),
 *   [dep1, dep2, dep3],
 *   [0]
 * );
 * ```
 */
export function useConditionalEffect(
  effect: EffectCallback,
  deps: DependencyList,
  whitelist: number[]
): void {
  const prevDeps = useRef<DependencyList>();

  useEffect(() => {
    if (!prevDeps.current) {
      prevDeps.current = deps;
      return effect();
    }

    const hasChanged = whitelist.some(index => {
      return deps[index] !== prevDeps.current![index];
    });

    if (hasChanged) {
      prevDeps.current = deps;
      return effect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Creates an effect with cleanup tracking
 *
 * @param effect - Effect callback that may return cleanup
 * @param deps - Dependency array
 * @returns Object with cleanup status
 *
 * @example
 * ```typescript
 * const { cleanedUp } = useCleanupEffect(() => {
 *   const subscription = subscribe();
 *   return () => subscription.unsubscribe();
 * }, []);
 * ```
 */
export function useCleanupEffect(
  effect: EffectCallback,
  deps?: DependencyList
): { cleanedUp: boolean } {
  const cleanedUp = useRef(false);

  useEffect(() => {
    cleanedUp.current = false;
    const cleanup = effect();

    return () => {
      cleanedUp.current = true;
      if (cleanup) {
        cleanup();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { cleanedUp: cleanedUp.current };
}

/**
 * Creates an effect that executes in sequence with previous effects
 *
 * @param effect - Async effect callback
 * @param deps - Dependency array
 *
 * @example
 * ```typescript
 * useSequentialEffect(async () => {
 *   await step1();
 *   await step2();
 *   await step3();
 * }, [dependency]);
 * ```
 */
export function useSequentialEffect(
  effect: AsyncEffectCallback,
  deps: DependencyList
): void {
  const queue = useRef<Promise<any>>(Promise.resolve());

  useAsyncEffect(async () => {
    queue.current = queue.current.then(effect);
    await queue.current;
  }, deps);
}

/**
 * Creates an effect that can be cancelled
 *
 * @param effect - Effect callback that receives a cancel signal
 * @param deps - Dependency array
 *
 * @example
 * ```typescript
 * useCancellableEffect(({ cancelled }) => {
 *   fetch('/api/data')
 *     .then(res => {
 *       if (!cancelled()) {
 *         setData(res.data);
 *       }
 *     });
 * }, []);
 * ```
 */
export function useCancellableEffect(
  effect: (signal: { cancelled: () => boolean }) => void | CleanupFunction,
  deps?: DependencyList
): void {
  useEffect(() => {
    let cancelled = false;
    const signal = {
      cancelled: () => cancelled,
    };

    const cleanup = effect(signal);

    return () => {
      cancelled = true;
      if (cleanup) {
        cleanup();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Creates an effect that retries on failure
 *
 * @param effect - Async effect that may fail
 * @param deps - Dependency array
 * @param options - Retry options
 *
 * @example
 * ```typescript
 * useRetryEffect(
 *   async () => {
 *     const data = await fetchData();
 *     setData(data);
 *   },
 *   [url],
 *   { maxRetries: 3, delay: 1000 }
 * );
 * ```
 */
export function useRetryEffect(
  effect: AsyncEffectCallback,
  deps: DependencyList,
  options: {
    maxRetries?: number;
    delay?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): void {
  const { maxRetries = 3, delay = 1000, onRetry } = options;

  useAsyncEffect(async () => {
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= maxRetries) {
      try {
        return await effect();
      } catch (error) {
        lastError = error as Error;
        attempt++;

        if (attempt <= maxRetries) {
          if (onRetry) {
            onRetry(attempt, lastError);
          }
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }
    }

    if (lastError) {
      throw lastError;
    }
  }, deps);
}

/**
 * Creates an effect that only runs when online
 *
 * @param effect - Effect callback
 * @param deps - Dependency array
 *
 * @example
 * ```typescript
 * useOnlineEffect(() => {
 *   syncData();
 * }, [data]);
 * ```
 */
export function useOnlineEffect(
  effect: EffectCallback,
  deps?: DependencyList
): void {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.navigator.onLine) {
      return effect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Deep comparison effect that compares dependency values deeply
 *
 * @param effect - Effect callback
 * @param deps - Dependency array
 *
 * @example
 * ```typescript
 * useDeepCompareEffect(() => {
 *   console.log('Object changed:', obj);
 * }, [obj]);
 * ```
 */
export function useDeepCompareEffect(
  effect: EffectCallback,
  deps: DependencyList
): void {
  const ref = useRef<DependencyList>();

  if (!ref.current || !deepEqual(ref.current, deps)) {
    ref.current = deps;
  }

  useEffect(effect, [ref.current]);
}

/**
 * Helper function for deep equality comparison
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, idx) => deepEqual(val, b[idx]));
  }

  if (typeof a === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(key => deepEqual(a[key], b[key]));
  }

  return false;
}

// Helper import for useState
import * as React from 'react';
