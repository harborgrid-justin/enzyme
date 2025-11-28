/**
 * @file Async Utilities
 * @description Common async/promise utilities for the application
 */

/**
 * Deferred promise interface
 */
export interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

/**
 * Create a deferred promise
 */
export function defer<T = void>(): Deferred<T> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

/**
 * Delay execution for a specified time
 */
export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100 } = options;
  const startTime = Date.now();

  while (!(await condition())) {
    if (Date.now() - startTime > timeout) {
      throw new Error('waitFor timeout exceeded');
    }
    await delay(interval);
  }
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
    onRetry?: (error: Error, attempt: number) => void;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
    onRetry,
  } = options;

  let lastError: Error;
  let currentDelay = delayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxAttempts) {
        throw lastError;
      }

      onRetry?.(lastError, attempt);
      await delay(currentDelay);
      currentDelay = Math.min(currentDelay * backoffMultiplier, maxDelayMs);
    }
  }

  throw lastError!;
}

/**
 * Run promises with a concurrency limit
 */
export async function concurrent<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number = 5
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const promise = fn(item, i).then((result) => {
      results[i] = result;
    });

    const e: Promise<void> = promise.then(() => {
      executing.splice(executing.indexOf(e), 1);
    });
    executing.push(e);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * Timeout wrapper for promises
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message = 'Operation timed out'
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

/**
 * Create a debounced async function
 */
export function debounceAsync<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  delayMs: number
): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingPromise: Promise<unknown> | null = null;

  return (async (...args: unknown[]) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    return new Promise((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        try {
          pendingPromise = fn(...args);
          const result = await pendingPromise;
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          pendingPromise = null;
        }
      }, delayMs);
    });
  }) as T;
}

/**
 * Create a throttled async function
 */
export function throttleAsync<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  intervalMs: number
): T {
  let lastExecution = 0;
  let pendingPromise: Promise<unknown> | null = null;

  return (async (...args: unknown[]) => {
    const now = Date.now();
    const timeSinceLast = now - lastExecution;

    if (timeSinceLast >= intervalMs) {
      lastExecution = now;
      pendingPromise = fn(...args);
      return pendingPromise;
    }

    if (pendingPromise) {
      return pendingPromise;
    }

    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        lastExecution = Date.now();
        try {
          pendingPromise = fn(...args);
          const result = await pendingPromise;
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          pendingPromise = null;
        }
      }, intervalMs - timeSinceLast);
    });
  }) as T;
}

/**
 * Execute a function and return a tuple of [error, result]
 */
export async function tryCatch<T>(
  fn: () => Promise<T>
): Promise<[Error, null] | [null, T]> {
  try {
    const result = await fn();
    return [null, result];
  } catch (error) {
    return [error instanceof Error ? error : new Error(String(error)), null];
  }
}

/**
 * Create a cancelable promise
 */
export interface CancelablePromise<T> {
  promise: Promise<T>;
  cancel: () => void;
  isCanceled: () => boolean;
}

export function makeCancelable<T>(promise: Promise<T>): CancelablePromise<T> {
  let isCanceled = false;

  const wrappedPromise = new Promise<T>((resolve, reject) => {
    promise
      .then((val) => {
        if (!isCanceled) {
          resolve(val);
        }
      })
      .catch((error) => {
        if (!isCanceled) {
          reject(error);
        }
      });
  });

  return {
    promise: wrappedPromise,
    cancel: () => {
      isCanceled = true;
    },
    isCanceled: () => isCanceled,
  };
}

/**
 * Run async functions in sequence
 */
export async function sequence<T>(
  fns: Array<() => Promise<T>>
): Promise<T[]> {
  const results: T[] = [];
  for (const fn of fns) {
    results.push(await fn());
  }
  return results;
}

/**
 * Create a semaphore for limiting concurrent operations
 */
export function createSemaphore(limit: number) {
  let currentCount = 0;
  const waiting: Array<() => void> = [];

  return {
    async acquire(): Promise<void> {
      if (currentCount < limit) {
        currentCount++;
        return;
      }

      await new Promise<void>((resolve) => {
        waiting.push(resolve);
      });
      currentCount++;
    },

    release(): void {
      currentCount--;
      const next = waiting.shift();
      if (next) {
        next();
      }
    },

    get available(): number {
      return limit - currentCount;
    },

    get waiting(): number {
      return waiting.length;
    },
  };
}
