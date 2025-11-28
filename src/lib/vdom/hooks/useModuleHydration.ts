/**
 * @file useModuleHydration Hook
 * @module vdom/hooks/useModuleHydration
 * @description Hook for controlling module hydration with manual triggers,
 * state tracking, and hydration data access.
 *
 * @author Agent 5 - PhD Virtual DOM Expert
 * @version 1.0.0
 */

import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react';
import {
  type UseModuleHydrationReturn,
  type HydrationData,
  HydrationState,
  type HydrationPriority,
  HydrationTrigger,
} from '../types';
import { useModuleContext } from '../ModuleBoundary';

/**
 * Hook for controlling module hydration.
 * Provides hydration state, manual triggers, and hydration data access.
 *
 * @returns Hydration state and controls
 * @throws Error if used outside a ModuleBoundary
 *
 * @example
 * ```tsx
 * function HeavyComponent() {
 *   const {
 *     hydrationState,
 *     isHydrated,
 *     isPending,
 *     hydrate,
 *     progress,
 *     data,
 *   } = useModuleHydration();
 *
 *   if (!isHydrated) {
 *     return (
 *       <div>
 *         <p>Loading... {Math.round(progress * 100)}%</p>
 *         <button onClick={hydrate}>Hydrate Now</button>
 *       </div>
 *     );
 *   }
 *
 *   return <ExpensiveContent initialData={data?.state} />;
 * }
 * ```
 */
export function useModuleHydration(): UseModuleHydrationReturn {
  const context = useModuleContext();

  // Local state for progress tracking
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  // Track hydration state from context
  const {hydrationState} = context.state;

  // Derived states
  const isHydrated = hydrationState === HydrationState.HYDRATED;
  const isPending = hydrationState === HydrationState.PENDING;
  const isHydrating = hydrationState === HydrationState.HYDRATING;
  const hasFailed = hydrationState === HydrationState.FAILED;

  // Progress simulation during hydration
  useEffect(() => {
    if (isHydrating) {
      let progressValue = 0;
      const interval = setInterval(() => {
        progressValue += 0.1;
        if (progressValue >= 0.9) {
          clearInterval(interval);
        }
        setProgress(Math.min(progressValue, 0.9));
      }, 50);

      return () => clearInterval(interval);
    }
    return undefined;
  }, [isHydrating]);

  // Update progress when hydration completes or fails
  useLayoutEffect(() => {
    if (isHydrated) {
      // Use a microtask to avoid synchronous setState during render
      void Promise.resolve().then(() => {
        setProgress(1);
      });
    } else if (hasFailed) {
      void Promise.resolve().then(() => {
        setProgress(0);
      });
    }
  }, [isHydrated, hasFailed]);

  // Update error state from context
  useLayoutEffect(() => {
    if (context.state.error && hasFailed) {
      // Use a microtask to avoid synchronous setState during render
      void Promise.resolve().then(() => {
        setError(context.state.error);
      });
    }
  }, [context.state.error, hasFailed]);

  // Manual hydration trigger
  const hydrate = useCallback(async () => {
    if (isHydrated || isHydrating) {
      return;
    }

    setProgress(0);
    setError(null);

    try {
      await context.hydrate();
    } catch (err) {
      const hydrationError = err instanceof Error ? err : new Error(String(err));
      setError(hydrationError);
      throw hydrationError;
    }
  }, [context, isHydrated, isHydrating]);

  // Skip hydration (client-only)
  const skip = useCallback(() => {
    context.dispatch({
      type: 'TRANSITION_STATE',
      to: context.state.lifecycleState, // Keep current lifecycle state
    });
    // Mark hydration as skipped through a different mechanism
    // This would require extending the action types
  }, [context]);

  // Get hydration data from context
  const hydrationData: HydrationData | null = null; // TODO: Implement hydration data retrieval

  // Return memoized object
  return useMemo<UseModuleHydrationReturn>(
    () => ({
      hydrationState,
      isHydrated,
      isPending,
      isHydrating,
      hasFailed,
      error,
      progress,
      hydrate,
      skip,
      data: hydrationData,
    }),
    [
      hydrationState,
      isHydrated,
      isPending,
      isHydrating,
      hasFailed,
      error,
      progress,
      hydrate,
      skip,
      hydrationData,
    ]
  );
}

/**
 * Hook to check if the module is hydrated.
 * @returns Whether module is hydrated
 */
export function useIsHydrated(): boolean {
  const { isHydrated } = useModuleHydration();
  return isHydrated;
}

/**
 * Hook to trigger hydration imperatively.
 * @returns Hydration trigger function
 */
export function useHydrateTrigger(): () => Promise<void> {
  const { hydrate } = useModuleHydration();
  return hydrate;
}

/**
 * Hook to get hydration progress.
 * @returns Progress value (0-1)
 */
export function useHydrationProgress(): number {
  const { progress } = useModuleHydration();
  return progress;
}

/**
 * Hook to execute callback when hydration completes.
 * @param callback - Callback to execute
 *
 * @example
 * ```tsx
 * useOnHydrated(() => {
 *   analytics.track('module_hydrated', { moduleId });
 * });
 * ```
 */
export function useOnHydrated(callback: () => void): void {
  const { isHydrated } = useModuleHydration();
  const callbackRef = useRef(callback);

  // Update ref on callback change
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Call when hydrated
  useEffect(() => {
    if (isHydrated) {
      callbackRef.current();
    }
  }, [isHydrated]);
}

/**
 * Hook to execute callback when hydration fails.
 * @param callback - Callback to execute with error
 *
 * @example
 * ```tsx
 * useOnHydrationError((error) => {
 *   errorReporter.capture(error);
 * });
 * ```
 */
export function useOnHydrationError(callback: (error: Error) => void): void {
  const { hasFailed, error } = useModuleHydration();
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (hasFailed && error) {
      callbackRef.current(error);
      return;
    }
  }, [hasFailed, error]);
}

/**
 * Hook to defer rendering until hydration is complete.
 * @param fallback - Content to show while hydrating
 * @param children - Content to show when hydrated
 * @returns Appropriate content based on hydration state
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   return useHydrationGuard(
 *     <LoadingSkeleton />,
 *     <ActualContent />
 *   );
 * }
 * ```
 */
export function useHydrationGuard<T>(fallback: T, content: T): T {
  const { isHydrated } = useModuleHydration();

  if (isHydrated) {
    return content;
  }

  return fallback;
}

/**
 * Hook for controlling hydration timing.
 * @param options - Hydration timing options
 * @returns Hydration controls
 */
export function useHydrationTiming(options: {
  delay?: number;
  priority?: HydrationPriority;
  trigger?: HydrationTrigger;
}): {
  shouldHydrate: boolean;
  scheduleHydration: () => void;
  cancelHydration: () => void;
} {
  const { hydrate, isHydrated, isHydrating } = useModuleHydration();
  const [shouldHydrate, setShouldHydrate] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleHydration = useCallback(() => {
    if (isHydrated || isHydrating) {
      return;
    }

    const delay = options.delay ?? 0;

    if (delay > 0) {
      timeoutRef.current = setTimeout(() => {
        setShouldHydrate(true);
        void hydrate();
      }, delay);
    } else {
      setShouldHydrate(true);
      void hydrate();
    }
  }, [options.delay, hydrate, isHydrated, isHydrating]);

  const cancelHydration = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setShouldHydrate(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Handle trigger-based hydration
  useEffect(() => {
    if (options.trigger === HydrationTrigger.IMMEDIATE) {
      // Use queueMicrotask to avoid synchronous setState
      queueMicrotask(() => {
        scheduleHydration();
      });
      return undefined;
    } else if (options.trigger === HydrationTrigger.IDLE) {
      if ('requestIdleCallback' in window) {
        const id = window.requestIdleCallback(() => {
          scheduleHydration();
        });
        return () => window.cancelIdleCallback(id);
      } else {
        const timeout = setTimeout(scheduleHydration, 100);
        return () => clearTimeout(timeout);
      }
    }
    return undefined;
  }, [options.trigger, scheduleHydration]);

  return useMemo(
  () => ({
    shouldHydrate,
    scheduleHydration,
    cancelHydration,
  }),
  [shouldHydrate, scheduleHydration, cancelHydration]
);
}