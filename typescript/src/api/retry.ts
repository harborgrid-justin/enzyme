/**
 * Retry Logic with Exponential Backoff
 *
 * @module @missionfabric-js/enzyme-typescript/api/retry
 * @description Configurable retry strategies with exponential backoff and jitter
 *
 * @example
 * ```typescript
 * import { withRetry, retryStrategy } from '@missionfabric-js/enzyme-typescript/api';
 *
 * const result = await withRetry(
 *   () => fetch('/api/users'),
 *   { maxAttempts: 3, backoff: 'exponential' }
 * );
 * ```
 */

import { ApiError, isApiError } from './error';

/**
 * Backoff strategy
 */
export type BackoffStrategy = 'linear' | 'exponential' | 'fibonacci' | 'custom';

/**
 * Retry predicate function
 */
export type RetryPredicate = (error: unknown, attempt: number) => boolean | Promise<boolean>;

/**
 * Backoff calculator function
 */
export type BackoffCalculator = (attempt: number, baseDelay: number) => number;

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts?: number;
  /** Initial delay in milliseconds */
  initialDelay?: number;
  /** Maximum delay in milliseconds */
  maxDelay?: number;
  /** Backoff strategy */
  backoff?: BackoffStrategy;
  /** Custom backoff calculator */
  customBackoff?: BackoffCalculator;
  /** Jitter factor (0-1) to randomize delays */
  jitter?: number;
  /** Retry timeout in milliseconds */
  timeout?: number;
  /** Predicate to determine if error is retryable */
  shouldRetry?: RetryPredicate;
  /** Callback before each retry */
  onRetry?: (error: unknown, attempt: number, delay: number) => void | Promise<void>;
}

/**
 * Retry result
 */
export interface RetryResult<T> {
  /** Result value */
  value?: T;
  /** Final error if all retries failed */
  error?: unknown;
  /** Number of attempts made */
  attempts: number;
  /** Total time spent in milliseconds */
  duration: number;
  /** Whether the operation succeeded */
  success: boolean;
}

/**
 * Default retry configuration
 */
const DEFAULT_CONFIG: Required<Omit<RetryConfig, 'customBackoff' | 'shouldRetry' | 'onRetry'>> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoff: 'exponential',
  jitter: 0.1,
  timeout: 60000,
};

/**
 * Calculate delay based on backoff strategy
 */
function calculateDelay(
  attempt: number,
  config: Required<Omit<RetryConfig, 'customBackoff' | 'shouldRetry' | 'onRetry'>>
): number {
  const { backoff, initialDelay, maxDelay, jitter } = config;

  let delay: number;

  switch (backoff) {
    case 'linear':
      delay = initialDelay * attempt;
      break;

    case 'exponential':
      delay = initialDelay * Math.pow(2, attempt - 1);
      break;

    case 'fibonacci': {
      const fib = (n: number): number => {
        if (n <= 1) return 1;
        let a = 1, b = 1;
        for (let i = 2; i <= n; i++) {
          [a, b] = [b, a + b];
        }
        return b;
      };
      delay = initialDelay * fib(attempt - 1);
      break;
    }

    default:
      delay = initialDelay;
  }

  // Apply max delay cap
  delay = Math.min(delay, maxDelay);

  // Apply jitter
  if (jitter > 0) {
    const jitterAmount = delay * jitter;
    delay += (Math.random() * 2 - 1) * jitterAmount;
  }

  return Math.max(0, Math.floor(delay));
}

/**
 * Default retry predicate
 */
const defaultShouldRetry: RetryPredicate = (error: unknown) => {
  if (isApiError(error)) {
    return error.isRetryable();
  }
  // Retry on network errors
  return error instanceof TypeError && error.message.includes('fetch');
};

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute function with retry logic
 *
 * @example
 * ```typescript
 * const data = await withRetry(
 *   async () => {
 *     const response = await fetch('/api/data');
 *     if (!response.ok) throw await ApiError.fromResponse(response);
 *     return response.json();
 *   },
 *   {
 *     maxAttempts: 5,
 *     backoff: 'exponential',
 *     onRetry: (error, attempt, delay) => {
 *       console.log(`Retry attempt ${attempt} after ${delay}ms`);
 *     }
 *   }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const result = await executeWithRetry(fn, config);

  if (result.success && result.value !== undefined) {
    return result.value;
  }

  throw result.error;
}

/**
 * Execute function with retry logic and return detailed result
 *
 * @example
 * ```typescript
 * const result = await executeWithRetry(() => fetchData());
 * if (result.success) {
 *   console.log(`Success after ${result.attempts} attempts`);
 * } else {
 *   console.error(`Failed after ${result.attempts} attempts`);
 * }
 * ```
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<RetryResult<T>> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const {
    maxAttempts,
    timeout,
    shouldRetry = defaultShouldRetry,
    onRetry,
    customBackoff,
  } = fullConfig;

  const startTime = Date.now();
  let attempt = 0;
  let lastError: unknown;

  const timeoutPromise = timeout
    ? new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Retry timeout after ${timeout}ms`)), timeout)
      )
    : null;

  const executeWithTimeout = async (): Promise<RetryResult<T>> => {
    while (attempt < maxAttempts) {
      attempt++;

      try {
        const value = await fn();
        return {
          value,
          attempts: attempt,
          duration: Date.now() - startTime,
          success: true,
        };
      } catch (error) {
        lastError = error;

        // Check if we should retry
        const isLastAttempt = attempt >= maxAttempts;
        if (isLastAttempt) {
          break;
        }

        const shouldRetryResult = await shouldRetry(error, attempt);
        if (!shouldRetryResult) {
          break;
        }

        // Calculate delay
        const delay = customBackoff
          ? customBackoff(attempt, fullConfig.initialDelay)
          : calculateDelay(attempt, fullConfig);

        // Call onRetry callback
        if (onRetry) {
          await onRetry(error, attempt, delay);
        }

        // Wait before retry
        await sleep(delay);
      }
    }

    return {
      error: lastError,
      attempts: attempt,
      duration: Date.now() - startTime,
      success: false,
    };
  };

  try {
    if (timeoutPromise) {
      return await Promise.race([executeWithTimeout(), timeoutPromise]);
    }
    return await executeWithTimeout();
  } catch (error) {
    return {
      error,
      attempts: attempt,
      duration: Date.now() - startTime,
      success: false,
    };
  }
}

/**
 * Retry strategy builder
 */
export class RetryStrategy {
  private config: RetryConfig = {};

  /**
   * Set maximum attempts
   */
  maxAttempts(count: number): this {
    this.config.maxAttempts = count;
    return this;
  }

  /**
   * Set initial delay
   */
  initialDelay(ms: number): this {
    this.config.initialDelay = ms;
    return this;
  }

  /**
   * Set maximum delay
   */
  maxDelay(ms: number): this {
    this.config.maxDelay = ms;
    return this;
  }

  /**
   * Set backoff strategy
   */
  withBackoff(strategy: BackoffStrategy): this {
    this.config.backoff = strategy;
    return this;
  }

  /**
   * Set custom backoff calculator
   */
  withCustomBackoff(calculator: BackoffCalculator): this {
    this.config.customBackoff = calculator;
    return this;
  }

  /**
   * Set jitter factor
   */
  withJitter(factor: number): this {
    this.config.jitter = Math.max(0, Math.min(1, factor));
    return this;
  }

  /**
   * Set timeout
   */
  withTimeout(ms: number): this {
    this.config.timeout = ms;
    return this;
  }

  /**
   * Set retry predicate
   */
  when(predicate: RetryPredicate): this {
    this.config.shouldRetry = predicate;
    return this;
  }

  /**
   * Set retry callback
   */
  onRetry(callback: RetryConfig['onRetry']): this {
    this.config.onRetry = callback;
    return this;
  }

  /**
   * Build retry configuration
   */
  build(): RetryConfig {
    return { ...this.config };
  }

  /**
   * Execute function with this strategy
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return withRetry(fn, this.config);
  }
}

/**
 * Create retry strategy builder
 *
 * @example
 * ```typescript
 * const strategy = retryStrategy()
 *   .maxAttempts(5)
 *   .withBackoff('exponential')
 *   .withJitter(0.2)
 *   .when((error) => error instanceof NetworkError)
 *   .build();
 *
 * const result = await withRetry(fetchData, strategy);
 * ```
 */
export function retryStrategy(): RetryStrategy {
  return new RetryStrategy();
}

/**
 * Common retry strategies
 */
export const retryStrategies = {
  /**
   * Aggressive retry for critical operations
   */
  aggressive: (): RetryConfig => ({
    maxAttempts: 5,
    initialDelay: 500,
    maxDelay: 10000,
    backoff: 'exponential',
    jitter: 0.2,
  }),

  /**
   * Conservative retry for non-critical operations
   */
  conservative: (): RetryConfig => ({
    maxAttempts: 2,
    initialDelay: 2000,
    maxDelay: 5000,
    backoff: 'linear',
    jitter: 0.1,
  }),

  /**
   * Network retry optimized for network failures
   */
  network: (): RetryConfig => ({
    maxAttempts: 4,
    initialDelay: 1000,
    maxDelay: 20000,
    backoff: 'exponential',
    jitter: 0.3,
    shouldRetry: (error) => {
      if (isApiError(error)) {
        return error.details.category === 'NETWORK' || error.details.category === 'TIMEOUT';
      }
      return true;
    },
  }),

  /**
   * Server error retry for 5xx errors
   */
  serverError: (): RetryConfig => ({
    maxAttempts: 3,
    initialDelay: 2000,
    maxDelay: 15000,
    backoff: 'fibonacci',
    jitter: 0.15,
    shouldRetry: (error) => {
      if (isApiError(error)) {
        const status = error.details.status;
        return status !== undefined && status >= 500;
      }
      return false;
    },
  }),

  /**
   * Rate limit retry for 429 errors
   */
  rateLimit: (): RetryConfig => ({
    maxAttempts: 5,
    initialDelay: 5000,
    maxDelay: 60000,
    backoff: 'exponential',
    jitter: 0.1,
    shouldRetry: (error) => {
      if (isApiError(error)) {
        return error.details.status === 429;
      }
      return false;
    },
  }),

  /**
   * No retry
   */
  none: (): RetryConfig => ({
    maxAttempts: 1,
  }),
};

/**
 * Retry with exponential backoff (convenience function)
 *
 * @example
 * ```typescript
 * const data = await retryExponential(
 *   () => fetch('/api/data').then(r => r.json()),
 *   5 // max attempts
 * );
 * ```
 */
export async function retryExponential<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3
): Promise<T> {
  return withRetry(fn, {
    maxAttempts,
    backoff: 'exponential',
  });
}

/**
 * Retry specific status codes
 *
 * @example
 * ```typescript
 * const data = await retryOnStatus(
 *   () => fetchData(),
 *   [408, 429, 503, 504]
 * );
 * ```
 */
export async function retryOnStatus<T>(
  fn: () => Promise<T>,
  statusCodes: number[],
  config: RetryConfig = {}
): Promise<T> {
  return withRetry(fn, {
    ...config,
    shouldRetry: (error) => {
      if (isApiError(error)) {
        const status = error.details.status;
        return status !== undefined && statusCodes.includes(status);
      }
      return false;
    },
  });
}

/**
 * Circuit breaker state
 */
interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Failure threshold before opening circuit */
  failureThreshold?: number;
  /** Timeout before attempting to close circuit (ms) */
  resetTimeout?: number;
  /** Success threshold to close from half-open (ms) */
  successThreshold?: number;
}

/**
 * Create circuit breaker with retry
 *
 * @example
 * ```typescript
 * const breaker = createCircuitBreaker({
 *   failureThreshold: 5,
 *   resetTimeout: 60000
 * });
 *
 * const data = await breaker.execute(() => fetchData());
 * ```
 */
export function createCircuitBreaker(config: CircuitBreakerConfig = {}) {
  const {
    failureThreshold = 5,
    resetTimeout = 60000,
    successThreshold = 2,
  } = config;

  const state: CircuitBreakerState = {
    failures: 0,
    lastFailureTime: 0,
    state: 'closed',
  };

  let successCount = 0;

  return {
    async execute<T>(fn: () => Promise<T>, retryConfig?: RetryConfig): Promise<T> {
      // Check if circuit is open
      if (state.state === 'open') {
        const timeSinceLastFailure = Date.now() - state.lastFailureTime;
        if (timeSinceLastFailure < resetTimeout) {
          throw new Error('Circuit breaker is open');
        }
        state.state = 'half-open';
        successCount = 0;
      }

      try {
        const result = await withRetry(fn, retryConfig);

        // Success - update state
        if (state.state === 'half-open') {
          successCount++;
          if (successCount >= successThreshold) {
            state.state = 'closed';
            state.failures = 0;
          }
        } else {
          state.failures = 0;
        }

        return result;
      } catch (error) {
        state.failures++;
        state.lastFailureTime = Date.now();

        if (state.failures >= failureThreshold) {
          state.state = 'open';
        }

        throw error;
      }
    },

    getState: () => ({ ...state }),
    reset: () => {
      state.failures = 0;
      state.state = 'closed';
      successCount = 0;
    },
  };
}
