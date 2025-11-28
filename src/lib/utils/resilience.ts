/**
 * @file Resilience Utilities
 * @description Enterprise-grade retry policies, circuit breakers, and fault tolerance patterns
 */

/**
 * Retry policy configuration
 */
export interface RetryConfig {
  /** Maximum retry attempts */
  maxAttempts?: number;
  /** Initial delay between retries (ms) */
  initialDelay?: number;
  /** Maximum delay between retries (ms) */
  maxDelay?: number;
  /** Delay multiplier for exponential backoff */
  backoffMultiplier?: number;
  /** Whether to add jitter to delays */
  jitter?: boolean;
  /** Predicate to determine if error is retryable */
  retryOn?: (error: unknown, attempt: number) => boolean;
  /** Callback on each retry attempt */
  onRetry?: (error: unknown, attempt: number, delay: number) => void;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: Required<Omit<RetryConfig, 'signal' | 'onRetry'>> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
  retryOn: () => true,
};

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateDelay(
  attempt: number,
  config: Pick<Required<RetryConfig>, 'initialDelay' | 'maxDelay' | 'backoffMultiplier' | 'jitter'>
): number {
  const exponentialDelay =
    config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1);
  const boundedDelay = Math.min(exponentialDelay, config.maxDelay);

  if (config.jitter) {
    // Add random jitter (±25%)
    const jitterRange = boundedDelay * 0.25;
    return boundedDelay + (Math.random() * 2 - 1) * jitterRange;
  }

  return boundedDelay;
}

/**
 * Sleep for a specified duration
 */
async function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted === true) {
      reject(new Error('Aborted'));
      return;
    }

    const timeoutId = setTimeout(resolve, ms);

    signal?.addEventListener('abort', () => {
      clearTimeout(timeoutId);
      reject(new Error('Aborted'));
    });
  });
}

/**
 * Execute function with retry logic
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
      if (config.signal?.aborted === true) {
        throw new Error('Aborted');
      }

      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      const shouldRetry =
        attempt < resolvedConfig.maxAttempts &&
        resolvedConfig.retryOn(error, attempt) === true;

      if (!shouldRetry) {
        break;
      }

      // Calculate and wait for delay
      const delay = calculateDelay(attempt, resolvedConfig);
      config.onRetry?.(error, attempt, delay);

      await sleep(delay, config.signal);
    }
  }

  throw lastError;
}

/**
 * Retry policy builder for fluent configuration
 */
export class RetryPolicy {
  private config: RetryConfig;

  constructor(config: RetryConfig = {}) {
    this.config = config;
  }

  /**
   * Set max attempts
   */
  attempts(max: number): RetryPolicy {
    return new RetryPolicy({ ...this.config, maxAttempts: max });
  }

  /**
   * Set delays
   */
  delays(initial: number, max?: number): RetryPolicy {
    return new RetryPolicy({
      ...this.config,
      initialDelay: initial,
      maxDelay: max ?? initial * 10,
    });
  }

  /**
   * Set backoff multiplier
   */
  backoff(multiplier: number): RetryPolicy {
    return new RetryPolicy({ ...this.config, backoffMultiplier: multiplier });
  }

  /**
   * Enable/disable jitter
   */
  withJitter(enabled = true): RetryPolicy {
    return new RetryPolicy({ ...this.config, jitter: enabled });
  }

  /**
   * Set retry condition
   */
  retryIf(predicate: (error: unknown, attempt: number) => boolean): RetryPolicy {
    return new RetryPolicy({ ...this.config, retryOn: predicate });
  }

  /**
   * Set retry callback
   */
  onRetry(callback: (error: unknown, attempt: number, delay: number) => void): RetryPolicy {
    return new RetryPolicy({ ...this.config, onRetry: callback });
  }

  /**
   * Execute with this policy
   */
  async execute<T>(fn: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    return withRetry(fn, { ...this.config, signal });
  }
}

/**
 * Circuit breaker states
 */
export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Failure threshold before opening */
  failureThreshold?: number;
  /** Success threshold for half-open to close */
  successThreshold?: number;
  /** Time to wait before trying half-open (ms) */
  resetTimeout?: number;
  /** Time window for failure counting (ms) */
  failureWindow?: number;
  /** Callback on state change */
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
}

/**
 * Circuit breaker for fault isolation
 */
export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures: number[] = [];
  private successes = 0;
  private lastFailureTime = 0;
  private config: Required<Omit<CircuitBreakerConfig, 'onStateChange'>> & {
    onStateChange?: CircuitBreakerConfig['onStateChange'];
  };

  constructor(config: CircuitBreakerConfig = {}) {
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      successThreshold: config.successThreshold ?? 2,
      resetTimeout: config.resetTimeout ?? 30000, // 30 seconds
      failureWindow: config.failureWindow ?? 60000, // 1 minute
      onStateChange: config.onStateChange,
    };
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    if (this.state === 'open' && this.shouldAttemptReset()) {
      this.transition('half-open');
    }
    return this.state;
  }

  /**
   * Check if reset should be attempted
   */
  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime >= this.config.resetTimeout;
  }

  /**
   * Transition to new state
   */
  private transition(newState: CircuitState): void {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;

      if (newState === 'closed') {
        this.failures = [];
        this.successes = 0;
      } else if (newState === 'half-open') {
        this.successes = 0;
      }

      this.config.onStateChange?.(oldState, newState);
    }
  }

  /**
   * Record success
   */
  success(): void {
    if (this.state === 'half-open') {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.transition('closed');
      }
    } else if (this.state === 'closed') {
      // Clean up old failures
      this.cleanOldFailures();
    }
  }

  /**
   * Record failure
   */
  failure(): void {
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      this.transition('open');
    } else if (this.state === 'closed') {
      this.failures.push(Date.now());
      this.cleanOldFailures();

      if (this.failures.length >= this.config.failureThreshold) {
        this.transition('open');
      }
    }
  }

  /**
   * Clean failures outside window
   */
  private cleanOldFailures(): void {
    const cutoff = Date.now() - this.config.failureWindow;
    this.failures = this.failures.filter((time) => time > cutoff);
  }

  /**
   * Execute function through circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const state = this.getState();

    if (state === 'open') {
      throw new CircuitOpenError('Circuit breaker is open');
    }

    try {
      const result = await fn();
      this.success();
      return result;
    } catch (error) {
      this.failure();
      throw error;
    }
  }

  /**
   * Get circuit statistics
   */
  getStats(): {
    state: CircuitState;
    failures: number;
    successesInHalfOpen: number;
    lastFailure: Date | null;
  } {
    return {
      state: this.state,
      failures: this.failures.length,
      successesInHalfOpen: this.successes,
      lastFailure: this.lastFailureTime ? new Date(this.lastFailureTime) : null,
    };
  }

  /**
   * Force reset the circuit
   */
  reset(): void {
    this.transition('closed');
    this.failures = [];
    this.successes = 0;
    this.lastFailureTime = 0;
  }
}

/**
 * Error thrown when circuit is open
 */
export class CircuitOpenError extends Error {
  readonly isCircuitOpen = true;

  constructor(message = 'Circuit breaker is open') {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

/**
 * Bulkhead pattern for resource isolation
 */
export class Bulkhead {
  private running = 0;
  private queue: Array<{
    resolve: () => void;
    reject: (error: Error) => void;
  }> = [];
  private maxConcurrent: number;
  private maxQueue: number;

  constructor(maxConcurrent: number, maxQueue = 100) {
    this.maxConcurrent = maxConcurrent;
    this.maxQueue = maxQueue;
  }

  /**
   * Execute function with bulkhead isolation
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Wait for available slot
    if (this.running >= this.maxConcurrent) {
      if (this.queue.length >= this.maxQueue) {
        throw new BulkheadFullError('Bulkhead queue is full');
      }

      await new Promise<void>((resolve, reject) => {
        this.queue.push({ resolve, reject });
      });
    }

    this.running++;

    try {
      return await fn();
    } finally {
      this.running--;

      // Release next queued request
      const next = this.queue.shift();
      if (next) {
        next.resolve();
      }
    }
  }

  /**
   * Get bulkhead statistics
   */
  getStats(): {
    running: number;
    queued: number;
    maxConcurrent: number;
    maxQueue: number;
    available: number;
  } {
    return {
      running: this.running,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent,
      maxQueue: this.maxQueue,
      available: Math.max(0, this.maxConcurrent - this.running),
    };
  }

  /**
   * Clear the queue (reject all pending)
   */
  clearQueue(): void {
    const error = new BulkheadFullError('Queue cleared');
    for (const item of this.queue) {
      item.reject(error);
    }
    this.queue = [];
  }
}

/**
 * Error thrown when bulkhead is full
 */
export class BulkheadFullError extends Error {
  readonly isBulkheadFull = true;

  constructor(message = 'Bulkhead is full') {
    super(message);
    this.name = 'BulkheadFullError';
  }
}

/**
 * Timeout wrapper
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeout: number,
  timeoutError?: Error
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(timeoutError ?? new TimeoutError(`Operation timed out after ${timeout}ms`)),
        timeout
      )
    ),
  ]);
}

/**
 * Timeout error
 */
export class TimeoutError extends Error {
  readonly isTimeout = true;

  constructor(message = 'Operation timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Fallback wrapper
 */
export async function withFallback<T>(
  fn: () => Promise<T>,
  fallback: T | (() => T | Promise<T>)
): Promise<T> {
  try {
    return await fn();
  } catch {
    return typeof fallback === 'function' ? (fallback as () => T | Promise<T>)() : fallback;
  }
}

/**
 * Compose multiple resilience patterns
 */
export function compose<T>(
  fn: () => Promise<T>,
  ...wrappers: Array<(fn: () => Promise<T>) => Promise<T>>
): () => Promise<T> {
  return wrappers.reduceRight<() => Promise<T>>(
    (wrapped, wrapper) => async () => wrapper(wrapped),
    fn
  );
}

/**
 * Create a resilient function with all patterns
 */
export function createResilientFn<Args extends unknown[], Result>(
  fn: (...args: Args) => Promise<Result>,
  options: {
    retry?: RetryConfig;
    circuitBreaker?: CircuitBreaker;
    bulkhead?: Bulkhead;
    timeout?: number;
    fallback?: Result | (() => Result | Promise<Result>);
  } = {}
): (...args: Args) => Promise<Result> {
  return async (...args: Args): Promise<Result> => {
    const execute = async (): Promise<Result> => {
      let operation: () => Promise<Result> = async () => fn(...args);

      // Apply timeout
      const { timeout } = options;
      if (timeout !== undefined && timeout > 0) {
        const originalOp = operation;
        operation = async () => withTimeout(originalOp, timeout);
      }

      // Apply circuit breaker
      if (options.circuitBreaker !== undefined) {
        const cb = options.circuitBreaker;
        const originalOp = operation;
        operation = async () => cb.execute(originalOp);
      }

      // Apply bulkhead
      if (options.bulkhead !== undefined) {
        const bh = options.bulkhead;
        const originalOp = operation;
        operation = async () => bh.execute(originalOp);
      }

      // Apply retry
      if (options.retry !== undefined) {
        return withRetry(operation, options.retry);
      }

      return operation();
    };

    // Apply fallback
    if (options.fallback !== undefined) {
      return withFallback(execute, options.fallback);
    }

    return execute();
  };
}

/**
 * Predefined retry policies
 */
export const retryPolicies = {
  /** No retry */
  none: new RetryPolicy().attempts(1),

  /** Quick retry (3 attempts, 100ms start) */
  quick: new RetryPolicy().attempts(3).delays(100, 1000),

  /** Standard retry (3 attempts, 1s start) */
  standard: new RetryPolicy().attempts(3).delays(1000, 10000),

  /** Extended retry (5 attempts, 2s start) */
  extended: new RetryPolicy().attempts(5).delays(2000, 30000),

  /** Network retry (retry on network errors) */
  network: new RetryPolicy()
    .attempts(3)
    .delays(1000, 10000)
    .retryIf((error) => {
      if (error instanceof Error) {
        return (
          error.message.includes('network') ||
          error.message.includes('fetch') ||
          error.message.includes('ECONNREFUSED')
        );
      }
      return false;
    }),
};
