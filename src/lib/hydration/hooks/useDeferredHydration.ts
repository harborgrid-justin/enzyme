/**
 * @file useDeferredHydration Hook
 * @description Hook for manual control over component hydration timing.
 *
 * This hook provides explicit control over when hydration occurs,
 * useful for components that need programmatic hydration triggers.
 *
 * @module hydration/hooks/useDeferredHydration
 *
 * @example
 * ```tsx
 * function ManualHydrationComponent() {
 *   const {
 *     isHydrated,
 *     hydrate,
 *     cancel,
 *     scheduleHydration,
 *   } = useDeferredHydration({
 *     id: 'manual-component',
 *     priority: 'low',
 *   });
 *
 *   // Hydrate after user clicks a button
 *   const handleClick = async () => {
 *     await hydrate();
 *     console.log('Component is now interactive!');
 *   };
 *
 *   // Or schedule for later
 *   useEffect(() => {
 *     scheduleHydration(5000); // Hydrate after 5 seconds
 *   }, [scheduleHydration]);
 *
 *   return (
 *     <div>
 *       <button onClick={handleClick}>Hydrate Now</button>
 *       {isHydrated ? <InteractiveContent /> : <Placeholder />}
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef, useMemo, useId } from 'react';

import { useOptionalHydrationContext } from '../HydrationProvider';
import { getHydrationScheduler } from '../hydration-scheduler';

import type {
  HydrationPriority,
  HydrationBoundaryId,
  HydrationTask,
  HydrationState,
} from '../types';

import { createBoundaryId } from '../types';

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for deferred hydration.
 */
export interface DeferredHydrationConfig {
  /**
   * Unique identifier for this hydration boundary.
   * Will be auto-generated if not provided.
   */
  readonly id?: string;

  /**
   * Priority level for when hydration is triggered.
   *
   * @default 'normal'
   */
  readonly priority?: HydrationPriority;

  /**
   * Function to execute during hydration.
   * If not provided, hydration is a no-op state transition.
   */
  readonly onHydrate?: () => void | Promise<void>;

  /**
   * Callback when hydration completes.
   */
  readonly onComplete?: (duration: number) => void;

  /**
   * Callback when hydration fails.
   */
  readonly onError?: (error: Error) => void;

  /**
   * Maximum time to wait for hydration in milliseconds.
   *
   * @default 10000
   */
  readonly timeout?: number;

  /**
   * Whether to auto-register with the scheduler.
   *
   * @default false
   */
  readonly autoRegister?: boolean;
}

/**
 * Return type for the useDeferredHydration hook.
 */
export interface UseDeferredHydrationReturn {
  /**
   * Current hydration state.
   */
  readonly state: HydrationState;

  /**
   * Whether the component is fully hydrated.
   */
  readonly isHydrated: boolean;

  /**
   * Whether hydration is in progress.
   */
  readonly isHydrating: boolean;

  /**
   * Whether hydration is pending (not started).
   */
  readonly isPending: boolean;

  /**
   * Error that occurred during hydration, if any.
   */
  readonly error: Error | null;

  /**
   * Duration of hydration in milliseconds, if completed.
   */
  readonly duration: number | null;

  /**
   * The boundary ID for this deferred hydration.
   */
  readonly boundaryId: HydrationBoundaryId;

  /**
   * Triggers immediate hydration.
   *
   * @returns Promise that resolves when hydration completes
   */
  readonly hydrate: () => Promise<void>;

  /**
   * Schedules hydration to occur after a delay.
   *
   * @param delay - Delay in milliseconds before hydration
   * @returns Function to cancel the scheduled hydration
   */
  readonly scheduleHydration: (delay: number) => () => void;

  /**
   * Cancels any pending or scheduled hydration.
   */
  readonly cancel: () => void;

  /**
   * Resets the hydration state to pending.
   * Allows re-hydration after error or completion.
   */
  readonly reset: () => void;

  /**
   * Props to spread on a container element for the scheduler.
   * Includes ref callback and data attributes.
   */
  readonly containerProps: DeferredHydrationContainerProps;
}

/**
 * Props to spread on the container element.
 */
export interface DeferredHydrationContainerProps {
  readonly ref: (element: HTMLElement | null) => void;
  readonly 'data-hydration-boundary-id': string;
  readonly 'data-hydration-state': HydrationState;
  readonly 'data-hydration-deferred': boolean;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for manual control over component hydration.
 *
 * Provides explicit control over hydration timing, useful for:
 * - Components that should only hydrate on user action
 * - Delayed hydration after initial render
 * - Conditional hydration based on external factors
 * - Testing hydration behavior
 *
 * @param config - Deferred hydration configuration
 * @returns Deferred hydration control interface
 *
 * @example
 * ```tsx
 * // Basic manual hydration
 * function ManualComponent() {
 *   const { isHydrated, hydrate, containerProps } = useDeferredHydration({
 *     id: 'manual-section',
 *     onHydrate: async () => {
 *       // Initialize component
 *       await loadData();
 *     },
 *   });
 *
 *   return (
 *     <div {...containerProps}>
 *       {isHydrated ? (
 *         <InteractiveContent />
 *       ) : (
 *         <button onClick={hydrate}>Load Content</button>
 *       )}
 *     </div>
 *   );
 * }
 *
 * // Scheduled hydration
 * function DelayedComponent() {
 *   const { isHydrated, scheduleHydration, cancel } = useDeferredHydration({
 *     id: 'delayed-section',
 *   });
 *
 *   useEffect(() => {
 *     // Hydrate after 3 seconds of visibility
 *     const cancelSchedule = scheduleHydration(3000);
 *
 *     return cancelSchedule;
 *   }, [scheduleHydration]);
 *
 *   return (
 *     <div>
 *       {isHydrated ? <Content /> : <Loading />}
 *       <button onClick={cancel}>Cancel Hydration</button>
 *     </div>
 *   );
 * }
 *
 * // Conditional hydration
 * function ConditionalComponent({ shouldHydrate }: { shouldHydrate: boolean }) {
 *   const { isHydrated, hydrate } = useDeferredHydration({
 *     id: 'conditional-section',
 *   });
 *
 *   useEffect(() => {
 *     if (shouldHydrate && !isHydrated) {
 *       hydrate();
 *     }
 *   }, [shouldHydrate, isHydrated, hydrate]);
 *
 *   return <div>{isHydrated ? <Interactive /> : <Static />}</div>;
 * }
 * ```
 */
export function useDeferredHydration(
  config: DeferredHydrationConfig = {}
): UseDeferredHydrationReturn {
  const {
    id: providedId,
    priority = 'normal',
    onHydrate,
    onComplete,
    onError,
    timeout = 10000,
    autoRegister = false,
  } = config;

  // Generate stable ID
  const reactId = useId();
  const boundaryId = useMemo(
    () => createBoundaryId(providedId ?? `deferred-${reactId.replace(/:/g, '-')}`),
    [providedId, reactId]
  );

  // Get context (optional)
  const context = useOptionalHydrationContext();

  // ==========================================================================
  // State
  // ==========================================================================

  const [state, setState] = useState<HydrationState>('pending');
  const [error, setError] = useState<Error | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  // ==========================================================================
  // Refs
  // ==========================================================================

  const elementRef = useRef<HTMLElement | null>(null);
  const scheduleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydrationStartRef = useRef<number | null>(null);
  const isCancelledRef = useRef(false);

  // ==========================================================================
  // Element Ref Callback
  // ==========================================================================

  const setElementRef = useCallback((element: HTMLElement | null) => {
    elementRef.current = element;
  }, []);

  // ==========================================================================
  // Hydration Function
  // ==========================================================================

  const performHydration = useCallback(async (): Promise<void> => {
    if (state === 'hydrated' || state === 'hydrating') {
      return;
    }

    if (isCancelledRef.current) {
      isCancelledRef.current = false;
      return;
    }

    // Clear any scheduled hydration
    if (scheduleTimeoutRef.current) {
      clearTimeout(scheduleTimeoutRef.current);
      scheduleTimeoutRef.current = null;
    }

    // Start hydration
    setState('hydrating');
    hydrationStartRef.current = performance.now();

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Hydration timeout after ${timeout}ms`));
      }, timeout);
    });

    try {
      // Execute hydration with timeout
      await Promise.race([
        Promise.resolve(onHydrate?.()),
        timeoutPromise,
      ]);

      // Check if cancelled during hydration
      if (isCancelledRef.current) {
        isCancelledRef.current = false;
        setState('pending');
        return;
      }

      // Calculate duration
      const hydrationDuration = performance.now() - (hydrationStartRef.current ?? 0);
      setDuration(hydrationDuration);

      // Mark as hydrated
      setState('hydrated');

      // Callback
      onComplete?.(hydrationDuration);
    } catch (err) {
      const hydrationError = err instanceof Error ? err : new Error(String(err));
      setError(hydrationError);
      setState('error');
      onError?.(hydrationError);
      throw hydrationError;
    }
  }, [state, timeout, onHydrate, onComplete, onError]);

  // ==========================================================================
  // Schedule Function
  // ==========================================================================

  const scheduleHydration = useCallback(
    (delay: number): (() => void) => {
      // Clear any existing schedule
      if (scheduleTimeoutRef.current) {
        clearTimeout(scheduleTimeoutRef.current);
      }

      // Schedule new hydration
      scheduleTimeoutRef.current = setTimeout(() => {
        performHydration();
      }, delay);

      // Return cancel function
      return () => {
        if (scheduleTimeoutRef.current) {
          clearTimeout(scheduleTimeoutRef.current);
          scheduleTimeoutRef.current = null;
        }
      };
    },
    [performHydration]
  );

  // ==========================================================================
  // Cancel Function
  // ==========================================================================

  const cancel = useCallback((): void => {
    // Cancel scheduled hydration
    if (scheduleTimeoutRef.current) {
      clearTimeout(scheduleTimeoutRef.current);
      scheduleTimeoutRef.current = null;
    }

    // Mark as cancelled if hydrating
    if (state === 'hydrating') {
      isCancelledRef.current = true;
    }
  }, [state]);

  // ==========================================================================
  // Reset Function
  // ==========================================================================

  const reset = useCallback((): void => {
    cancel();
    setState('pending');
    setError(null);
    setDuration(null);
    isCancelledRef.current = false;
  }, [cancel]);

  // ==========================================================================
  // Auto-Registration
  // ==========================================================================

  useEffect(() => {
    if (!autoRegister) {
      return;
    }

    const task: HydrationTask = {
      id: boundaryId,
      priority,
      trigger: 'manual',
      hydrate: performHydration,
      enqueuedAt: Date.now(),
      element: elementRef.current,
      cancellable: true,
      metadata: {
        componentName: providedId,
      },
    };

    if (context) {
      context.registerBoundary(task);
      return () => context.unregisterBoundary(boundaryId);
    } else {
      try {
        const scheduler = getHydrationScheduler();
        scheduler.register(task);
        return () => scheduler.unregister(boundaryId);
      } catch {
        // Scheduler not available
        return;
      }
    }
  }, [autoRegister, boundaryId, priority, performHydration, context, providedId]);

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  useEffect(() => {
    return () => {
      if (scheduleTimeoutRef.current) {
        clearTimeout(scheduleTimeoutRef.current);
      }
    };
  }, []);

  // ==========================================================================
  // Container Props
  // ==========================================================================

  const containerProps = useMemo<DeferredHydrationContainerProps>(
    () => ({
      ref: setElementRef,
      'data-hydration-boundary-id': boundaryId,
      'data-hydration-state': state,
      'data-hydration-deferred': true,
    }),
    [boundaryId, state, setElementRef]
  );

  // ==========================================================================
  // Return
  // ==========================================================================

  return useMemo<UseDeferredHydrationReturn>(
    () => ({
      state,
      isHydrated: state === 'hydrated',
      isHydrating: state === 'hydrating',
      isPending: state === 'pending',
      error,
      duration,
      boundaryId,
      hydrate: performHydration,
      scheduleHydration,
      cancel,
      reset,
      containerProps,
    }),
    [
      state,
      error,
      duration,
      boundaryId,
      performHydration,
      scheduleHydration,
      cancel,
      reset,
      containerProps,
    ]
  );
}

/**
 * Hook for creating a simple deferred hydration trigger.
 *
 * Simplified version of useDeferredHydration for common use cases.
 *
 * @param id - Optional boundary ID
 * @returns Tuple of [isHydrated, hydrate function]
 *
 * @example
 * ```tsx
 * function SimpleDeferred() {
 *   const [isHydrated, hydrate] = useSimpleDeferredHydration('my-component');
 *
 *   return (
 *     <div>
 *       {isHydrated ? (
 *         <InteractiveContent />
 *       ) : (
 *         <button onClick={hydrate}>Load</button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useSimpleDeferredHydration(
  id?: string
): [boolean, () => Promise<void>] {
  const { isHydrated, hydrate } = useDeferredHydration({ id });
  return [isHydrated, hydrate];
}

/**
 * Hook for hydration that triggers on idle.
 *
 * Schedules hydration to occur during browser idle time.
 *
 * @param config - Deferred hydration configuration
 * @returns Deferred hydration control interface
 *
 * @example
 * ```tsx
 * function IdleHydratedComponent() {
 *   const { isHydrated } = useIdleHydration({
 *     id: 'idle-component',
 *     idleTimeout: 5000,
 *   });
 *
 *   return <div>{isHydrated ? <Content /> : <Skeleton />}</div>;
 * }
 * ```
 */
export function useIdleHydration(
  config: DeferredHydrationConfig & { idleTimeout?: number } = {}
): UseDeferredHydrationReturn {
  const { idleTimeout = 2000, ...restConfig } = config;
  const deferredHydration = useDeferredHydration(restConfig);

  useEffect(() => {
    if (deferredHydration.isHydrated || deferredHydration.isHydrating) {
      return;
    }

    // Use requestIdleCallback if available
    if ('requestIdleCallback' in window) {
      const handle = window.requestIdleCallback(
        () => {
          deferredHydration.hydrate();
        },
        { timeout: idleTimeout }
      );

      return () => window.cancelIdleCallback(handle);
    } else {
      // Fallback to setTimeout
      const timeoutId = setTimeout(() => {
        deferredHydration.hydrate();
      }, idleTimeout);

      return () => clearTimeout(timeoutId);
    }
  }, [deferredHydration, idleTimeout]);

  return deferredHydration;
}

// ============================================================================
// Exports
// ============================================================================

// Types are already exported inline above
