/**
 * @file useDeferredStream Hook
 * @description Hook for deferring stream content until specific conditions are met.
 *
 * Enables intelligent deferral of streaming based on visibility,
 * browser idle state, user interaction, or custom events.
 *
 * @module streaming/hooks/useDeferredStream
 * @version 1.0.0
 * @author Harbor Framework Team
 *
 * @example
 * ```tsx
 * function LazySection({ children }: { children: ReactNode }) {
 *   const { isDeferred, ref, triggerNow } = useDeferredStream({
 *     deferUntilVisible: true,
 *     maxDeferMs: 5000,
 *   });
 *
 *   return (
 *     <div ref={ref}>
 *       {isDeferred ? <Placeholder /> : children}
 *       {isDeferred && <button onClick={triggerNow}>Load Now</button>}
 *     </div>
 *   );
 * }
 * ```
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useLayoutEffect,
  type RefObject,
} from 'react';

import { useOptionalStreamContext } from '../StreamProvider';

import { type UseDeferredStreamOptions, type UseDeferredStreamResult, DeferReason } from '../types';

// ============================================================================
// Default Options
// ============================================================================

const DEFAULT_OPTIONS: Required<UseDeferredStreamOptions> = {
  deferUntilVisible: false,
  deferUntilIdle: false,
  deferUntilEvent: '',
  maxDeferMs: 30000,
  visibilityThreshold: 0.1,
};

// ============================================================================
// Default Result
// ============================================================================

const DEFAULT_RESULT: UseDeferredStreamResult = {
  isDeferred: false,
  triggerNow: () => {},
  ref: { current: null as HTMLElement | null } as RefObject<HTMLElement>,
  deferReason: null,
};

// ============================================================================
// Idle Callback Polyfill
// ============================================================================

/**
 * RequestIdleCallback with fallback for unsupported browsers.
 */
function requestIdleCallbackPolyfill(
  callback: IdleRequestCallback,
  options?: IdleRequestOptions
): number {
  if (typeof requestIdleCallback !== 'undefined') {
    return requestIdleCallback(callback, options);
  }

  // Fallback: use setTimeout with delay
  const timeout = options?.timeout ?? 50;
  const start = Date.now();

  return window.setTimeout(
    () => {
      callback({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
      });
    },
    Math.min(timeout, 50)
  ) as unknown as number;
}

/**
 * CancelIdleCallback with fallback.
 */
function cancelIdleCallbackPolyfill(handle: number): void {
  if (typeof cancelIdleCallback !== 'undefined') {
    cancelIdleCallback(handle);
  } else {
    clearTimeout(handle);
  }
}

// ============================================================================
// Main Hook Implementation
// ============================================================================

/**
 * Hook for deferring stream content.
 *
 * @description
 * Provides fine-grained control over when streaming should begin,
 * based on various conditions like visibility, idle state, or events.
 *
 * Deferral strategies:
 * - **Visibility**: Defer until element enters viewport
 * - **Idle**: Defer until browser is idle (requestIdleCallback)
 * - **Event**: Defer until a custom event is fired
 * - **Time-based**: Maximum defer duration before auto-triggering
 *
 * Features:
 * - Multiple deferral conditions (AND logic)
 * - Manual trigger override
 * - Maximum defer timeout
 * - Reason tracking for debugging
 * - Automatic cleanup
 *
 * @param options - Deferral configuration
 * @returns Deferral state and controls
 *
 * @example
 * ```tsx
 * // Defer until visible
 * const { isDeferred, ref } = useDeferredStream({
 *   deferUntilVisible: true,
 * });
 *
 * // Defer until browser is idle
 * const { isDeferred } = useDeferredStream({
 *   deferUntilIdle: true,
 * });
 *
 * // Defer until custom event
 * const { isDeferred } = useDeferredStream({
 *   deferUntilEvent: 'user-scrolled',
 * });
 *
 * // Combined conditions with timeout
 * const { isDeferred, ref, triggerNow, deferReason } = useDeferredStream({
 *   deferUntilVisible: true,
 *   deferUntilIdle: true,
 *   maxDeferMs: 3000,
 * });
 * ```
 */
export function useDeferredStream(options: UseDeferredStreamOptions = {}): UseDeferredStreamResult {
  const {
    deferUntilVisible = DEFAULT_OPTIONS.deferUntilVisible,
    deferUntilIdle = DEFAULT_OPTIONS.deferUntilIdle,
    deferUntilEvent = DEFAULT_OPTIONS.deferUntilEvent,
    maxDeferMs = DEFAULT_OPTIONS.maxDeferMs,
    visibilityThreshold = DEFAULT_OPTIONS.visibilityThreshold,
  } = options;

  const context = useOptionalStreamContext();

  // State tracking
  const [isVisible, setIsVisible] = useState(!deferUntilVisible);
  const [isIdle, setIsIdle] = useState(!deferUntilIdle);
  const [eventFired, setEventFired] = useState(!deferUntilEvent);
  const [manuallyTriggered, setManuallyTriggered] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  // Refs
  const elementRef = useRef<HTMLElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const idleCallbackRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // ==========================================================================
  // Computed Deferral State
  // ==========================================================================

  const isDeferred = useMemo(() => {
    // Manual trigger overrides all deferral
    if (manuallyTriggered || timedOut) return false;

    // Check all deferral conditions
    const conditions = [
      deferUntilVisible && !isVisible,
      deferUntilIdle && !isIdle,
      deferUntilEvent && !eventFired,
    ];

    // Deferred if any condition is still pending
    return conditions.some(Boolean);
  }, [
    deferUntilVisible,
    deferUntilIdle,
    deferUntilEvent,
    isVisible,
    isIdle,
    eventFired,
    manuallyTriggered,
    timedOut,
  ]);

  const deferReason = useMemo<DeferReason | null>(() => {
    if (!isDeferred) return null;

    if (deferUntilVisible && !isVisible) return DeferReason.NotVisible;
    if (deferUntilIdle && !isIdle) return DeferReason.BrowserBusy;
    if (deferUntilEvent && !eventFired) return DeferReason.WaitingForEvent;

    return null;
  }, [
    isDeferred,
    deferUntilVisible,
    deferUntilIdle,
    deferUntilEvent,
    isVisible,
    isIdle,
    eventFired,
  ]);

  // ==========================================================================
  // Manual Trigger
  // ==========================================================================

  const triggerNow = useCallback(() => {
    setManuallyTriggered(true);
  }, []);

  // ==========================================================================
  // Visibility Observer
  // ==========================================================================

  useEffect(() => {
    if (!deferUntilVisible || typeof IntersectionObserver === 'undefined') {
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= visibilityThreshold) {
            if (mountedRef.current) {
              setIsVisible(true);
            }
            // Stop observing once visible
            observerRef.current?.disconnect();
          }
        }
      },
      {
        threshold: visibilityThreshold,
        rootMargin: '50px', // Start loading slightly before visible
      }
    );

    // Observe element if available
    if (elementRef.current) {
      observerRef.current.observe(elementRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [deferUntilVisible, visibilityThreshold]);

  // Re-observe when element changes
  const setRef = useCallback(
    (element: HTMLElement | null) => {
      elementRef.current = element;

      if (element && observerRef.current && deferUntilVisible) {
        observerRef.current.observe(element);
      }
    },
    [deferUntilVisible]
  );

  // Create stable ref object
  const refObject = useMemo(
    () => ({
      get current() {
        return elementRef.current;
      },
      set current(value: HTMLElement | null) {
        setRef(value);
      },
    }),
    [setRef]
  );

  // ==========================================================================
  // Idle Callback
  // ==========================================================================

  useEffect(() => {
    if (!deferUntilIdle) {
      return;
    }

    idleCallbackRef.current = requestIdleCallbackPolyfill(
      () => {
        if (mountedRef.current) {
          setIsIdle(true);
        }
      },
      { timeout: maxDeferMs }
    );

    return () => {
      if (idleCallbackRef.current !== null) {
        cancelIdleCallbackPolyfill(idleCallbackRef.current);
      }
    };
  }, [deferUntilIdle, maxDeferMs]);

  // ==========================================================================
  // Event Listener
  // ==========================================================================

  useEffect(() => {
    if (!deferUntilEvent) {
      return;
    }

    const handleEvent = (): void => {
      if (mountedRef.current) {
        setEventFired(true);
      }
    };

    // Listen for custom event on window
    window.addEventListener(deferUntilEvent, handleEvent);

    return () => {
      window.removeEventListener(deferUntilEvent, handleEvent);
    };
  }, [deferUntilEvent]);

  // ==========================================================================
  // Maximum Defer Timeout
  // ==========================================================================

  useEffect(() => {
    if (maxDeferMs <= 0 || !isDeferred) {
      return;
    }

    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setTimedOut(true);
      }
    }, maxDeferMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [maxDeferMs, isDeferred]);

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Return default if no context
  if (!context) {
    return DEFAULT_RESULT;
  }

  return {
    isDeferred,
    triggerNow,
    ref: refObject as RefObject<HTMLElement>,
    deferReason,
  };
}

// ============================================================================
// Specialized Deferral Hooks
// ============================================================================

/**
 * Extended result with additional controls.
 */
export interface UseExtendedDeferredStreamResult extends UseDeferredStreamResult {
  /** Time remaining until max defer timeout */
  timeRemaining: number | null;
  /** Whether deferral is due to visibility */
  isDeferredByVisibility: boolean;
  /** Whether deferral is due to idle state */
  isDeferredByIdle: boolean;
  /** Whether deferral is due to event */
  isDeferredByEvent: boolean;
  /** Reset deferral state */
  reset: () => void;
}

/**
 * Extended deferred stream hook with additional information.
 *
 * @example
 * ```tsx
 * function DetailedDeferred() {
 *   const {
 *     isDeferred,
 *     isDeferredByVisibility,
 *     isDeferredByIdle,
 *     timeRemaining,
 *     ref,
 *     reset,
 *   } = useExtendedDeferredStream({
 *     deferUntilVisible: true,
 *     deferUntilIdle: true,
 *     maxDeferMs: 5000,
 *   });
 *
 *   return (
 *     <div ref={ref}>
 *       {isDeferred && (
 *         <div>
 *           <p>Waiting: {isDeferredByVisibility ? 'visibility' : 'idle'}</p>
 *           <p>Time remaining: {timeRemaining}ms</p>
 *           <button onClick={reset}>Reset</button>
 *         </div>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useExtendedDeferredStream(
  options: UseDeferredStreamOptions = {}
): UseExtendedDeferredStreamResult {
  const base = useDeferredStream(options);
  const [startTime] = useState(() => Date.now());
  const [timeRemaining, setTimeRemaining] = useState<number | null>(options.maxDeferMs ?? null);
  const [resetCount, setResetCount] = useState(0);

  useLayoutEffect(() => {
    if (options.maxDeferMs == null || options.maxDeferMs === 0 || !base.isDeferred) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTimeRemaining(null);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, (options.maxDeferMs ?? 0) - elapsed);
      setTimeRemaining(remaining);
    }, 100);

    return () => clearInterval(interval);
  }, [options.maxDeferMs, base.isDeferred, startTime, resetCount]);

  const isDeferredByVisibility = base.deferReason === DeferReason.NotVisible;
  const isDeferredByIdle = base.deferReason === DeferReason.BrowserBusy;
  const isDeferredByEvent = base.deferReason === DeferReason.WaitingForEvent;

  const reset = useCallback(() => {
    setResetCount((c) => c + 1);
  }, []);

  return {
    ...base,
    timeRemaining,
    isDeferredByVisibility,
    isDeferredByIdle,
    isDeferredByEvent,
    reset,
  };
}

/**
 * Hook for deferring until element is visible.
 *
 * @description
 * Convenience hook for visibility-based deferral.
 *
 * @example
 * ```tsx
 * function LazyImage({ src }: { src: string }) {
 *   const { isDeferred, ref } = useDeferUntilVisible();
 *
 *   return (
 *     <div ref={ref}>
 *       {isDeferred ? <Skeleton /> : <img src={src} />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useDeferUntilVisible(
  options: Omit<UseDeferredStreamOptions, 'deferUntilVisible'> = {}
): UseDeferredStreamResult {
  return useDeferredStream({
    ...options,
    deferUntilVisible: true,
  });
}

/**
 * Hook for deferring until browser is idle.
 *
 * @description
 * Convenience hook for idle-based deferral.
 *
 * @example
 * ```tsx
 * function NonCriticalWidget() {
 *   const { isDeferred } = useDeferUntilIdle();
 *
 *   if (isDeferred) return null;
 *
 *   return <ExpensiveWidget />;
 * }
 * ```
 */
export function useDeferUntilIdle(
  options: Omit<UseDeferredStreamOptions, 'deferUntilIdle'> = {}
): UseDeferredStreamResult {
  return useDeferredStream({
    ...options,
    deferUntilIdle: true,
  });
}

/**
 * Hook for deferring until a custom event.
 *
 * @description
 * Convenience hook for event-based deferral.
 *
 * @param eventName - Name of the event to wait for
 * @param options - Additional options
 *
 * @example
 * ```tsx
 * function AfterLoginContent() {
 *   const { isDeferred } = useDeferUntilEvent('user:logged-in');
 *
 *   if (isDeferred) return <LoginPrompt />;
 *
 *   return <AuthenticatedContent />;
 * }
 * ```
 */
export function useDeferUntilEvent(
  eventName: string,
  options: Omit<UseDeferredStreamOptions, 'deferUntilEvent'> = {}
): UseDeferredStreamResult {
  return useDeferredStream({
    ...options,
    deferUntilEvent: eventName,
  });
}
