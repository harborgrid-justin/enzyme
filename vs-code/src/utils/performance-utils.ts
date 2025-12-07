/**
 * Performance Utilities
 * Common utilities for debouncing, throttling, and performance optimization
 */

/**
 * PERFORMANCE: Debounce function
 * Delays function execution until after a specified wait period has elapsed
 * since the last time it was invoked
 *
 * @param fn - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 *
 * @example
 * const debouncedSave = debounce(() => saveFile(), 500);
 * debouncedSave(); // Will execute after 500ms of no additional calls
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | undefined;

  return function(...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = undefined;
    }, wait);
  };
}

/**
 * PERFORMANCE: Throttle function
 * Ensures function is called at most once per specified time period
 *
 * @param fn - Function to throttle
 * @param limit - Time limit in milliseconds
 * @returns Throttled function
 *
 * @example
 * const throttledScroll = throttle(() => handleScroll(), 100);
 * throttledScroll(); // Will execute at most once per 100ms
 */
export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  let lastArgs: Parameters<T> | undefined;

  return function(...args: Parameters<T>) {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;

      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          fn(...lastArgs);
          lastArgs = undefined;
        }
      }, limit);
    } else {
      lastArgs = args;
    }
  };
}

/**
 * PERFORMANCE: Async debounce function
 * Debounces async functions
 *
 * @param fn - Async function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced async function
 */
export function debounceAsync<T extends (...args: unknown[]) => Promise<void>>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => Promise<void> {
  let timeoutId: NodeJS.Timeout | undefined;
  let pendingPromise: Promise<void> | undefined;

  return async function(...args: Parameters<T>): Promise<void> {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (!pendingPromise) {
      pendingPromise = new Promise<void>((resolve) => {
        timeoutId = setTimeout(async () => {
          await fn(...args);
          timeoutId = undefined;
          pendingPromise = undefined;
          resolve();
        }, wait);
      });
    }

    return pendingPromise;
  };
}

/**
 * PERFORMANCE: Memoize function results
 * Caches function results based on arguments
 *
 * @param fn - Function to memoize
 * @param keyFn - Optional function to generate cache key
 * @returns Memoized function
 *
 * @example
 * const memoizedCalculate = memoize((a: number, b: number) => a + b);
 * memoizedCalculate(1, 2); // Calculates
 * memoizedCalculate(1, 2); // Returns cached result
 */
export function memoize<T extends (...args: unknown[]) => unknown>(
  fn: T,
  keyFn?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args) as ReturnType<T>;
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * PERFORMANCE: Batch function calls
 * Batches multiple function calls into a single execution
 *
 * @param fn - Function to batch
 * @param wait - Wait time in milliseconds
 * @param maxBatchSize - Maximum batch size
 * @returns Batched function
 */
export function batch<T>(
  fn: (items: T[]) => void,
  wait: number,
  maxBatchSize: number = 100
): (item: T) => void {
  const items: T[] = [];
  let timeoutId: NodeJS.Timeout | undefined;

  const flush = () => {
    if (items.length > 0) {
      const batch = items.splice(0, items.length);
      fn(batch);
    }
    timeoutId = undefined;
  };

  return (item: T) => {
    items.push(item);

    if (items.length >= maxBatchSize) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      flush();
    } else if (!timeoutId) {
      timeoutId = setTimeout(flush, wait);
    }
  };
}

/**
 * PERFORMANCE: Lazy initialization
 * Initializes a value only when first accessed
 *
 * @param initializer - Function to initialize the value
 * @returns Lazy value getter
 *
 * @example
 * const lazyValue = lazy(() => expensiveCalculation());
 * const value = lazyValue(); // Only calculates on first call
 */
export function lazy<T>(initializer: () => T): () => T {
  let value: T | undefined;
  let initialized = false;

  return (): T => {
    if (!initialized) {
      value = initializer();
      initialized = true;
    }
    return value!;
  };
}

/**
 * PERFORMANCE: Rate limiter
 * Limits the rate at which a function can be called
 *
 * @param maxCalls - Maximum number of calls
 * @param perMilliseconds - Time period in milliseconds
 * @returns Rate limiter function
 */
export function rateLimit(
  maxCalls: number,
  perMilliseconds: number
): (fn: () => void) => boolean {
  const calls: number[] = [];

  return (fn: () => void): boolean => {
    const now = Date.now();

    // Remove old calls outside the time window
    while (calls.length > 0 && now - calls[0]! > perMilliseconds) {
      calls.shift();
    }

    // Check if we can make a new call
    if (calls.length < maxCalls) {
      calls.push(now);
      fn();
      return true;
    }

    return false;
  };
}

/**
 * PERFORMANCE: Async queue
 * Processes async tasks sequentially with concurrency limit
 */
export class AsyncQueue<T> {
  private queue: Array<() => Promise<T>> = [];
  private running = 0;
  private maxConcurrency: number;

  constructor(maxConcurrency: number = 1) {
    this.maxConcurrency = maxConcurrency;
  }

  /**
   * Add task to queue
   */
  public async add(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
          return result;
        } catch (error) {
          reject(error);
          throw error;
        }
      });

      this.process();
    });
  }

  /**
   * Process queue
   */
  private async process(): Promise<void> {
    if (this.running >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    this.running++;
    const task = this.queue.shift();

    if (task) {
      try {
        await task();
      } finally {
        this.running--;
        this.process();
      }
    }
  }

  /**
   * Get queue size
   */
  public size(): number {
    return this.queue.length;
  }

  /**
   * Clear queue
   */
  public clear(): void {
    this.queue = [];
  }
}

/**
 * PERFORMANCE: Sleep utility
 * Pauses execution for specified milliseconds
 *
 * @param ms - Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * PERFORMANCE: Retry with exponential backoff
 * Retries a function with exponential backoff
 *
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries
 * @param baseDelay - Base delay in milliseconds
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}
