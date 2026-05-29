/**
 * @file Lifecycle & Timing Hooks
 * @description Small, composable primitives that smooth over common React
 * lifecycle papercuts: update-only effects, first-render detection, stable
 * event callbacks, and a controllable countdown timer.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type DependencyList } from 'react';

// ============================================================================
// useMount
// ============================================================================

/**
 * Run a callback exactly once, after the component first mounts. A semantic,
 * dependency-free alternative to `useEffect(fn, [])` that reads more clearly at
 * call sites and always invokes the latest callback.
 *
 * @param onMount - Callback to run on mount; may return a cleanup function that
 *   runs on unmount.
 */
export function useMount(onMount: () => void | (() => void)): void {
  const onMountRef = useRef(onMount);

  useEffect(() => {
    onMountRef.current = onMount;
  });

  useEffect(() => {
    // Intentionally run only on mount/unmount; the latest callback is read
    // through onMountRef.
    return onMountRef.current();
  }, []);
}

// ============================================================================
// useUpdateEffect
// ============================================================================

/**
 * Like `useEffect`, but skips the effect on the initial render — it only runs
 * when one of its dependencies changes.
 *
 * @param effect - Effect callback (may return a cleanup function).
 * @param deps - Dependency list, as with `useEffect`.
 */
export function useUpdateEffect(effect: () => void | (() => void), deps?: DependencyList): void {
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return undefined;
    }
    return effect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// ============================================================================
// useEventCallback
// ============================================================================

/**
 * Returns a stable function identity that always invokes the latest version of
 * `callback`. Useful for passing handlers to memoized children or effects
 * without retriggering them, while still reading fresh props/state.
 *
 * @param callback - The handler to wrap.
 */
export function useEventCallback<Args extends unknown[], Return>(
  callback: (...args: Args) => Return
): (...args: Args) => Return {
  const ref = useRef<(...args: Args) => Return>(callback);

  useEffect(() => {
    ref.current = callback;
  });

  return useCallback((...args: Args): Return => ref.current(...args), []);
}

// ============================================================================
// useCountdown
// ============================================================================

/** Options for {@link useCountdown}. */
export interface UseCountdownOptions {
  /** Tick interval in milliseconds (default `1000`). */
  interval?: number;
  /** Amount subtracted on each tick (default `1`). */
  step?: number;
  /** Value at which the countdown stops (default `0`). */
  target?: number;
  /** Start counting immediately on mount (default `false`). */
  autoStart?: boolean;
  /** Invoked once when the countdown reaches the target. */
  onComplete?: () => void;
}

/** Result of {@link useCountdown}. */
export interface UseCountdownResult {
  /** Current count. */
  count: number;
  /** Whether the countdown is actively ticking. */
  isRunning: boolean;
  /** Whether the countdown has reached its target. */
  isComplete: boolean;
  /** Start (or resume) counting down. */
  start: () => void;
  /** Pause without resetting. */
  pause: () => void;
  /** Stop and reset to the initial value. */
  reset: () => void;
}

/**
 * A controllable countdown timer driven by component state.
 *
 * @param initialCount - The value to count down from.
 * @param options - Tick interval, step, target, autostart, and completion callback.
 */
export function useCountdown(
  initialCount: number,
  options: UseCountdownOptions = {}
): UseCountdownResult {
  const { interval = 1000, step = 1, target = 0, autoStart = false, onComplete } = options;

  const [count, setCount] = useState(initialCount);
  const [isRunning, setIsRunning] = useState(autoStart);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  const descending = initialCount >= target;
  const isComplete = descending ? count <= target : count >= target;

  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);
  const reset = useCallback(() => {
    setIsRunning(false);
    setCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    if (!isRunning) return undefined;

    const timer = setInterval(() => {
      setCount((prev) => {
        const next = descending ? prev - step : prev + step;
        const reachedTarget = descending ? next <= target : next >= target;
        if (reachedTarget) {
          setIsRunning(false);
          onCompleteRef.current?.();
          return target;
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isRunning, interval, step, target, descending]);

  return useMemo(
    () => ({ count, isRunning, isComplete, start, pause, reset }),
    [count, isRunning, isComplete, start, pause, reset]
  );
}
