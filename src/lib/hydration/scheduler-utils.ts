/**
 * Utility functions for the hydration scheduler.
 */

/**
 * Checks if requestIdleCallback is available.
 */
export function hasIdleCallback(): boolean {
  return typeof window !== 'undefined' && 'requestIdleCallback' in window;
}

/**
 * Safe requestIdleCallback with fallback.
 */
export function requestIdle(
  callback: (deadline: IdleDeadline) => void,
  options?: IdleRequestOptions
): number {
  if (hasIdleCallback()) {
    return window.requestIdleCallback(callback, options);
  }

  // Fallback using setTimeout with simulated deadline
  const timeoutId = window.setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining: () => 50,
    });
  }, options?.timeout ?? 100);
  return timeoutId;
}

/**
 * Safe cancelIdleCallback with fallback.
 */
export function cancelIdle(handle: number): void {
  if (hasIdleCallback()) {
    window.cancelIdleCallback(handle);
  } else {
    window.clearTimeout(handle);
  }
}

/**
 * Type for the experimental Scheduler API on window
 */
interface WindowWithScheduler extends Window {
  scheduler: {
    yield: () => Promise<void>;
  };
}

/**
 * Type guard for checking if window has the scheduler.yield API
 */
function hasSchedulerYieldAPI(win: Window): win is WindowWithScheduler {
  return (
    'scheduler' in win &&
    typeof (win as WindowWithScheduler).scheduler === 'object' &&
    (win as WindowWithScheduler).scheduler !== null &&
    'yield' in (win as WindowWithScheduler).scheduler
  );
}

/**
 * Yields to the main thread.
 */
export async function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    if (hasSchedulerYieldAPI(window)) {
      // Use scheduler.yield if available (modern browsers)
      void window.scheduler.yield().then(resolve);
    } else {
      // Fallback to setTimeout
      setTimeout(resolve, 0);
    }
  });
}

/**
 * Calculates percentile from sorted array.
 */
export function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const index = Math.ceil((p / 100) * sortedValues.length) - 1;
  const clampedIndex = Math.max(0, Math.min(index, sortedValues.length - 1));
  return sortedValues[clampedIndex] ?? 0;
}
