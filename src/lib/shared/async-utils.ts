/**
 * @file Unified Async Utilities
 * @description Centralized async operation utilities including sleep, retry,
 * debounce, throttle, timeout, mutex, semaphore, and promise pools.
 *
 * This module consolidates duplicate implementations from:
 * - utils/asyncUtils.ts
 * - utils/resilience.ts
 * - services/EnhancedInterceptors.ts
 * - state/sync/BroadcastSync.ts
 *
 * @module shared/async-utils
 */

// =============================================================================
// Sleep / Delay
// =============================================================================

/**
 * Sleep for a specified duration with optional abort signal support.
 *
 * @param ms - Duration in milliseconds
 * @param signal - Optional AbortSignal for cancellation
 * @returns Promise that resolves after the delay
 * @throws Error if aborted
 *
 * @example
 * ```ts
 * // Simple delay
 * await sleep(1000);
 *
 * // With abort signal
 * const controller = new AbortController();
 * setTimeout(() => controller.abort(), 500);
 * await sleep(1000, controller.signal); // throws after 500ms
 * ```
 */
export async function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Aborted'));
      return;
    }

    const timeoutId = setTimeout(resolve, ms);

    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timeoutId);
        reject(new Error('Aborted'));
      },
      { once: true }
    );
  });
}

// =============================================================================
// Retry Configuration
// =============================================================================

/**
 * Retry configuration options
 */
export interface RetryConfig {
  /** Maximum retry attempts (default: 3) */
  maxAttempts?: number;
  /** Initial delay between retries in ms (default: 1000) */
  initialDelayMs?: number;
  /** Maximum delay between retries in ms (default: 30000) */
  maxDelayMs?: number;
  /** Delay multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;
  /** Whether to add random jitter to delays (default: true) */
  jitter?: boolean;
  /** Predicate to determine if error is retryable */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  /** Callback on each retry attempt */
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: Required<
  Omit<RetryConfig, 'signal' | 'onRetry' | 'shouldRetry'>
> & { shouldRetry: NonNullable<RetryConfig['shouldRetry']> } = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true,
  shouldRetry: () => true,
};

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateRetryDelay(
  attempt: number,
  config: Pick<
    Required<RetryConfig>,
    'initialDelayMs' | 'maxDelayMs' | 'backoffMultiplier' | 'jitter'
  >
): number {
  const exponentialDelay =
    config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
  const boundedDelay = Math.min(exponentialDelay, config.maxDelayMs);

  if (config.jitter) {
    // Add random jitter of +/-25%
    const jitterRange = boundedDelay * 0.25;
    return boundedDelay + (Math.random() * 2 - 1) * jitterRange;
  }

  return boundedDelay;
}

// =============================================================================
// Retry Functions
// =============================================================================

/**
 * Execute an async function with retry logic and exponential backoff.
 *
 * @param fn - Async function to execute
 * @param config - Retry configuration
 * @returns Result of the function
 * @throws Last error if all retries fail
 *
 * @example
 * ```ts
 * const result = await withRetry(
 *   () => fetchData(),
 *   {
 *     maxAttempts: 5,
 *     initialDelayMs: 500,
 *     shouldRetry: (error) => error instanceof NetworkError,
 *     onRetry: (error, attempt) => console.log(`Retry ${attempt}...`),
 *   }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const resolvedConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: unknown;

  for (let attempt = 1; attempt <= resolvedConfig.maxAttempts; attempt++) {
    try {
      // Check for abort before attempting
      if (config.signal?.aborted) {
        throw new Error('Aborted');
      }

      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      const shouldRetry =
        attempt < resolvedConfig.maxAttempts &&
        resolvedConfig.shouldRetry(error, attempt);

      if (!shouldRetry) {
        break;
      }

      // Calculate and wait for delay
      const delayMs = calculateRetryDelay(attempt, resolvedConfig);
      config.onRetry?.(error, attempt, delayMs);

      await sleep(delayMs, config.signal);
    }
  }

  throw lastError;
}

/**
 * Fluent retry policy builder
 *
 * @example
 * ```ts
 * const policy = new RetryPolicy()
 *   .attempts(5)
 *   .delays(500, 10000)
 *   .backoff(2)
 *   .withJitter()
 *   .retryIf((error) => error instanceof NetworkError);
 *
 * const result = await policy.execute(() => fetchData());
 * ```
 */
export class RetryPolicy {
  private config: RetryConfig;

  constructor(config: RetryConfig = {}) {
    this.config = config;
  }

  /** Set maximum retry attempts */
  attempts(max: number): RetryPolicy {
    return new RetryPolicy({ ...this.config, maxAttempts: max });
  }

  /** Set initial and maximum delay in milliseconds */
  delays(initialMs: number, maxMs?: number): RetryPolicy {
    return new RetryPolicy({
      ...this.config,
      initialDelayMs: initialMs,
      maxDelayMs: maxMs ?? initialMs * 10,
    });
  }

  /** Set backoff multiplier */
  backoff(multiplier: number): RetryPolicy {
    return new RetryPolicy({ ...this.config, backoffMultiplier: multiplier });
  }

  /** Enable or disable jitter */
  withJitter(enabled = true): RetryPolicy {
    return new RetryPolicy({ ...this.config, jitter: enabled });
  }

  /** Set retry condition predicate */
  retryIf(
    predicate: (error: unknown, attempt: number) => boolean
  ): RetryPolicy {
    return new RetryPolicy({ ...this.config, shouldRetry: predicate });
  }

  /** Set retry callback */
  onRetry(
    callback: (error: unknown, attempt: number, delayMs: number) => void
  ): RetryPolicy {
    return new RetryPolicy({ ...this.config, onRetry: callback });
  }

  /** Execute a function with this policy */
  async execute<T>(fn: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    return withRetry(fn, { ...this.config, signal });
  }
}

/**
 * Predefined retry policies for common use cases
 */
export const retryPolicies = {
  /** No retry - execute once */
  none: new RetryPolicy().attempts(1),

  /** Quick retry - 3 attempts, 100ms start, for fast operations */
  quick: new RetryPolicy().attempts(3).delays(100, 1000),

  /** Standard retry - 3 attempts, 1s start, for typical API calls */
  standard: new RetryPolicy().attempts(3).delays(1000, 10000),

  /** Extended retry - 5 attempts, 2s start, for critical operations */
  extended: new RetryPolicy().attempts(5).delays(2000, 30000),

  /** Network retry - retries on network-related errors */
  network: new RetryPolicy()
    .attempts(3)
    .delays(1000, 10000)
    .retryIf((error) => {
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return (
          message.includes('network') ||
          message.includes('fetch') ||
          message.includes('econnrefused') ||
          message.includes('timeout')
        );
      }
      return false;
    }),
} as const;

// =============================================================================
// Timeout
// =============================================================================

/**
 * Timeout error class
 */
export class TimeoutError extends Error {
  readonly isTimeout = true;

  constructor(message = 'Operation timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Execute a function with a timeout limit.
 *
 * @param fn - Async function to execute
 * @param timeoutMs - Timeout in milliseconds
 * @param errorMessage - Optional custom error message
 * @returns Result of the function
 * @throws TimeoutError if operation exceeds timeout
 *
 * @example
 * ```ts
 * const result = await withTimeout(
 *   () => fetchData(),
 *   5000,
 *   'Data fetch timed out'
 * );
 * ```
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(
            new TimeoutError(
              errorMessage ?? `Operation timed out after ${timeoutMs}ms`
            )
          );
        });
      }),
    ]);
    return result;
  } finally {
    clearTimeout(timeoutId);
  }
}

// =============================================================================
// Debounce
// =============================================================================

/**
 * Debounce options
 */
export interface DebounceOptions {
  /** Debounce delay in milliseconds */
  delayMs: number;
  /** Maximum wait time in milliseconds before forced execution */
  maxWaitMs?: number;
  /** Execute on leading edge (default: false) */
  leading?: boolean;
  /** Execute on trailing edge (default: true) */
  trailing?: boolean;
}

/**
 * Debounced function interface
 */
export interface DebouncedFn<Args extends unknown[], R> {
  (...args: Args): Promise<R>;
  /** Cancel pending execution */
  cancel(): void;
  /** Execute immediately and return result */
  flush(): Promise<R | undefined>;
  /** Check if there's a pending execution */
  pending(): boolean;
}

/**
 * Deferred promise with external resolve/reject
 */
export interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

/**
 * Create a debounced function that delays execution until after the
 * specified delay has elapsed since the last call.
 *
 * @param fn - Function to debounce
 * @param options - Debounce options or delay in milliseconds
 * @returns Debounced function with cancel, flush, and pending methods
 *
 * @example
 * ```ts
 * const debouncedSearch = debounce(
 *   (query: string) => searchApi(query),
 *   { delayMs: 300, maxWaitMs: 1000 }
 * );
 *
 * // These calls will be debounced
 * debouncedSearch('h');
 * debouncedSearch('he');
 * debouncedSearch('hel');
 * const result = await debouncedSearch('hello'); // Only this executes
 * ```
 */
export function debounce<Args extends unknown[], R>(
  fn: (...args: Args) => R | Promise<R>,
  options: DebounceOptions | number
): DebouncedFn<Args, R> {
  const opts: DebounceOptions =
    typeof options === 'number' ? { delayMs: options } : options;

  const { delayMs, maxWaitMs, leading = false, trailing = true } = opts;

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let maxWaitTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Args | null = null;
  let lastThis: unknown = null;
  let leadingCalled = false;
  let deferred: Deferred<R> | null = null;

  function invokeFunc(): void {
    if (lastArgs === null) return;

    const args = lastArgs;
    const thisArg = lastThis;
    lastArgs = null;
    lastThis = null;

    try {
      const result = fn.apply(thisArg, args);
      if (result instanceof Promise) {
        result.then(
          (value) => deferred?.resolve(value),
          (error) => deferred?.reject(error)
        );
      } else {
        deferred?.resolve(result);
      }
    } catch (error) {
      deferred?.reject(error);
    }

    deferred = null;
    leadingCalled = false;
  }

  function cancel(): void {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (maxWaitTimeoutId) {
      clearTimeout(maxWaitTimeoutId);
      maxWaitTimeoutId = null;
    }
    lastArgs = null;
    lastThis = null;
    leadingCalled = false;
    deferred?.reject(new Error('Debounced function cancelled'));
    deferred = null;
  }

  async function flush(): Promise<R | undefined> {
    if (timeoutId === null && maxWaitTimeoutId === null) {
      return Promise.resolve(undefined);
    }

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (maxWaitTimeoutId) {
      clearTimeout(maxWaitTimeoutId);
      maxWaitTimeoutId = null;
    }

    invokeFunc();
    return deferred?.promise ?? Promise.resolve(undefined);
  }

  function pending(): boolean {
    return timeoutId !== null || maxWaitTimeoutId !== null;
  }

  async function debounced(this: unknown, ...args: Args): Promise<R> {
    const isFirstCall = lastArgs === null && !leadingCalled;
    lastArgs = args;
    lastThis = this; // eslint-disable-line @typescript-eslint/no-this-alias

    deferred ??= createDeferred<R>();

    // Handle leading edge
    if (leading && isFirstCall && !leadingCalled) {
      leadingCalled = true;
      invokeFunc();
      return deferred.promise;
    }

    // Clear existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Set up trailing edge timeout
    if (trailing) {
      timeoutId = setTimeout(() => {
        timeoutId = null;
        invokeFunc();
      }, delayMs);
    }

    // Set up max wait timeout
    if (maxWaitMs !== undefined && maxWaitTimeoutId === null) {
      maxWaitTimeoutId = setTimeout(() => {
        maxWaitTimeoutId = null;
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        invokeFunc();
      }, maxWaitMs);
    }

    return deferred.promise;
  }

  debounced.cancel = cancel;
  debounced.flush = flush;
  debounced.pending = pending;

  return debounced;
}

// =============================================================================
// Throttle
// =============================================================================

/**
 * Throttle options
 */
export interface ThrottleOptions {
  /** Throttle interval in milliseconds */
  intervalMs: number;
  /** Execute on leading edge (default: true) */
  leading?: boolean;
  /** Execute on trailing edge (default: true) */
  trailing?: boolean;
}

/**
 * Throttled function interface
 */
export interface ThrottledFn<Args extends unknown[], R> {
  (...args: Args): R | undefined;
  /** Cancel pending trailing execution */
  cancel(): void;
  /** Execute immediately with last arguments */
  flush(): R | undefined;
}

/**
 * Create a throttled function that only executes at most once per interval.
 *
 * @param fn - Function to throttle
 * @param options - Throttle options or interval in milliseconds
 * @returns Throttled function with cancel and flush methods
 *
 * @example
 * ```ts
 * const throttledScroll = throttle(
 *   (event: ScrollEvent) => handleScroll(event),
 *   { intervalMs: 100 }
 * );
 *
 * window.addEventListener('scroll', throttledScroll);
 * ```
 */
export function throttle<Args extends unknown[], R>(
  fn: (...args: Args) => R,
  options: ThrottleOptions | number
): ThrottledFn<Args, R> {
  const opts: ThrottleOptions =
    typeof options === 'number' ? { intervalMs: options } : options;

  const { intervalMs, leading = true, trailing = true } = opts;

  let lastCallTime: number | null = null;
  let lastResult: R | undefined;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Args | null = null;
  let lastThis: unknown = null;

  function invokeFunc(): R {
    const args = lastArgs ?? ([] as unknown as Args);
    const thisArg = lastThis;
    lastArgs = null;
    lastThis = null;
    lastResult = fn.apply(thisArg, args);
    return lastResult;
  }

  function cancel(): void {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastCallTime = null;
    lastArgs = null;
    lastThis = null;
  }

  function flush(): R | undefined {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (lastArgs !== null) {
      return invokeFunc();
    }
    return lastResult;
  }

  function throttled(this: unknown, ...args: Args): R | undefined {
    const now = Date.now();
    const timeSinceLastCall =
      lastCallTime !== null ? now - lastCallTime : intervalMs;

    lastArgs = args;
    lastThis = this; // eslint-disable-line @typescript-eslint/no-this-alias

    if (timeSinceLastCall >= intervalMs) {
      lastCallTime = now;

      if (leading) {
        return invokeFunc();
      }
    }

    if (trailing && !timeoutId) {
      timeoutId = setTimeout(() => {
        timeoutId = null;
        lastCallTime = Date.now();
        invokeFunc();
      }, intervalMs - timeSinceLastCall);
    }

    return lastResult;
  }

  throttled.cancel = cancel;
  throttled.flush = flush;

  return throttled;
}

// =============================================================================
// Mutex and Semaphore
// =============================================================================

/**
 * Mutex for exclusive access to a resource.
 *
 * @example
 * ```ts
 * const mutex = new Mutex();
 *
 * // Manual lock/unlock
 * const release = await mutex.acquire();
 * try {
 *   await criticalOperation();
 * } finally {
 *   release();
 * }
 *
 * // Or use runExclusive
 * const result = await mutex.runExclusive(async () => {
 *   return await criticalOperation();
 * });
 * ```
 */
export class Mutex {
  private locked = false;
  private queue: Array<() => void> = [];

  /** Acquire the lock, returns a release function */
  async acquire(): Promise<() => void> {
    if (!this.locked) {
      this.locked = true;
      return () => this.release();
    }

    return new Promise((resolve) => {
      this.queue.push(() => {
        this.locked = true;
        resolve(() => this.release());
      });
    });
  }

  private release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.locked = false;
    }
  }

  /** Execute a function with exclusive lock */
  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const release = await this.acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  }

  /** Check if the mutex is currently locked */
  isLocked(): boolean {
    return this.locked;
  }

  /** Get the number of waiting acquires */
  getQueueLength(): number {
    return this.queue.length;
  }
}

/**
 * Semaphore for limiting concurrent access to a resource.
 *
 * @example
 * ```ts
 * // Allow max 5 concurrent operations
 * const semaphore = new Semaphore(5);
 *
 * const results = await Promise.all(
 *   urls.map(url =>
 *     semaphore.runWithPermit(() => fetch(url))
 *   )
 * );
 * ```
 */
export class Semaphore {
  private permits: number;
  private readonly maxPermits: number;
  private queue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
    this.maxPermits = permits;
  }

  /** Acquire a permit, returns a release function */
  async acquire(): Promise<() => void> {
    if (this.permits > 0) {
      this.permits--;
      return () => this.release();
    }

    return new Promise((resolve) => {
      this.queue.push(() => {
        this.permits--;
        resolve(() => this.release());
      });
    });
  }

  private release(): void {
    this.permits++;
    const next = this.queue.shift();
    if (next) {
      next();
    }
  }

  /** Execute a function with a permit */
  async runWithPermit<T>(fn: () => Promise<T>): Promise<T> {
    const release = await this.acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  }

  /** Get available permits */
  availablePermits(): number {
    return this.permits;
  }

  /** Get the number of waiting acquires */
  getQueueLength(): number {
    return this.queue.length;
  }

  /** Get max permits configured */
  getMaxPermits(): number {
    return this.maxPermits;
  }
}

// =============================================================================
// Cancellation Token
// =============================================================================

/**
 * Cancellation token for aborting async operations.
 *
 * @example
 * ```ts
 * const token = new CancellationToken();
 *
 * // Start operation
 * fetchWithCancellation(url, token.signal);
 *
 * // Cancel after 5 seconds
 * setTimeout(() => token.cancel('Timeout'), 5000);
 * ```
 */
export class CancellationToken {
  private controller: AbortController;
  private reason?: Error;

  constructor() {
    this.controller = new AbortController();
  }

  /** Get the abort signal */
  get signal(): AbortSignal {
    return this.controller.signal;
  }

  /** Check if cancelled */
  get isCancelled(): boolean {
    return this.controller.signal.aborted;
  }

  /** Cancel the token with an optional reason */
  cancel(reason?: string | Error): void {
    this.reason =
      reason instanceof Error ? reason : new Error(reason ?? 'Cancelled');
    this.controller.abort(this.reason);
  }

  /** Get cancellation reason */
  getCancellationReason(): Error | undefined {
    return this.reason;
  }

  /** Throw if cancelled */
  throwIfCancelled(): void {
    if (this.isCancelled) {
      throw this.reason ?? new Error('Cancelled');
    }
  }

  /** Register callback for cancellation */
  onCancel(callback: (reason?: Error) => void): () => void {
    const handler = (): void => callback(this.reason);
    this.controller.signal.addEventListener('abort', handler);
    return () => this.controller.signal.removeEventListener('abort', handler);
  }
}

// =============================================================================
// Promise Utilities
// =============================================================================

/**
 * Map over items with controlled concurrency.
 *
 * @param items - Items to process
 * @param mapper - Async mapper function
 * @param concurrency - Max concurrent operations (default: 5)
 * @returns Array of results in same order as input
 *
 * @example
 * ```ts
 * const results = await pMap(
 *   urls,
 *   async (url) => fetch(url).then(r => r.json()),
 *   3 // Max 3 concurrent requests
 * );
 * ```
 */
export async function pMap<T, R>(
  items: T[],
  mapper: (item: T, index: number) => Promise<R>,
  concurrency = 5
): Promise<R[]> {
  const results: R[] = [];
  const semaphore = new Semaphore(concurrency);

  await Promise.all(
    items.map(async (item, index) => {
      const result = await semaphore.runWithPermit(() => mapper(item, index));
      results[index] = result;
    })
  );

  return results;
}

/**
 * Execute async functions sequentially.
 *
 * @param items - Items to process
 * @param mapper - Async mapper function
 * @returns Array of results in same order as input
 */
export async function pSeries<T, R>(
  items: T[],
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item !== undefined) {
      results.push(await mapper(item, i));
    }
  }
  return results;
}

/**
 * Execute with cleanup guaranteed after completion.
 *
 * @param fn - Async function to execute
 * @param cleanup - Cleanup function to run after fn completes
 * @returns Result of fn
 */
export async function withCleanup<T>(
  fn: () => Promise<T>,
  cleanup: () => void | Promise<void>
): Promise<T> {
  try {
    return await fn();
  } finally {
    await cleanup();
  }
}

/**
 * Safe async execution returning tuple of [result, error].
 *
 * @param fn - Async function to execute
 * @returns Tuple of [result, null] on success or [null, error] on failure
 *
 * @example
 * ```ts
 * const [data, error] = await safeAsync(() => fetchData());
 * if (error) {
 *   console.error('Failed:', error);
 * } else {
 *   console.log('Success:', data);
 * }
 * ```
 */
export async function safeAsync<T>(
  fn: () => Promise<T>
): Promise<[T, null] | [null, Error]> {
  try {
    const result = await fn();
    return [result, null];
  } catch (error) {
    return [null, error instanceof Error ? error : new Error(String(error))];
  }
}

/**
 * Safe sync execution returning tuple of [result, error].
 */
export function safeSync<T>(fn: () => T): [T, null] | [null, Error] {
  try {
    const result = fn();
    return [result, null];
  } catch (error) {
    return [null, error instanceof Error ? error : new Error(String(error))];
  }
}
