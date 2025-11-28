/**
 * @file Error Recovery
 * @description Enterprise-grade error recovery strategies with fallbacks,
 * graceful degradation, and automatic recovery mechanisms
 */

import { normalizeError, type AppError, type ErrorCategory } from '../monitoring/errorTypes';
import { ErrorReporter } from '../monitoring/ErrorReporter';

/**
 * Recovery strategy types
 */
export type RecoveryStrategy =
  | 'retry'
  | 'fallback'
  | 'cache'
  | 'degrade'
  | 'skip'
  | 'escalate';

/**
 * Recovery context
 */
export interface RecoveryContext {
  error: AppError;
  operation: string;
  attempts: number;
  startTime: number;
  metadata?: Record<string, unknown>;
}

/**
 * Recovery result
 */
export interface RecoveryResult<T> {
  success: boolean;
  value?: T;
  strategy: RecoveryStrategy;
  recovered: boolean;
  error?: AppError;
}

/**
 * Recovery handler function
 */
export type RecoveryHandler<T> = (
  context: RecoveryContext
) => Promise<RecoveryResult<T>> | RecoveryResult<T>;

/**
 * Recovery configuration
 */
export interface RecoveryConfig<T> {
  /** Maximum recovery attempts */
  maxAttempts?: number;
  /** Strategies to try in order */
  strategies?: RecoveryStrategy[];
  /** Custom handlers for each strategy */
  handlers?: Partial<Record<RecoveryStrategy, RecoveryHandler<T>>>;
  /** Fallback value */
  fallbackValue?: T | (() => T | Promise<T>);
  /** Cache key for cache strategy */
  cacheKey?: string;
  /** Degraded functionality */
  degradedFn?: () => T | Promise<T>;
  /** Should escalate condition */
  shouldEscalate?: (error: AppError, attempts: number) => boolean;
  /** On recovery callback */
  onRecovery?: (result: RecoveryResult<T>, context: RecoveryContext) => void;
}

/**
 * Error recovery manager
 */
export class ErrorRecovery<T> {
  private config: Required<Omit<RecoveryConfig<T>, 'handlers' | 'cacheKey' | 'degradedFn' | 'fallbackValue' | 'shouldEscalate' | 'onRecovery'>> & RecoveryConfig<T>;
  private cache: Map<string, { value: T; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(config: RecoveryConfig<T> = {}) {
    this.config = {
      maxAttempts: config.maxAttempts ?? 3,
      strategies: config.strategies ?? ['retry', 'fallback', 'cache', 'degrade', 'escalate'],
      handlers: config.handlers,
      fallbackValue: config.fallbackValue,
      cacheKey: config.cacheKey,
      degradedFn: config.degradedFn,
      shouldEscalate: config.shouldEscalate,
      onRecovery: config.onRecovery,
    };
  }

  /**
   * Execute operation with recovery
   */
  async execute(
    operation: () => Promise<T>,
    operationName: string,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const startTime = Date.now();
    let lastError: AppError | null = null;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        const result = await operation();

        // Cache successful result
        if (this.config.cacheKey !== undefined && this.config.cacheKey !== '') {
          this.cache.set(this.config.cacheKey, { value: result, timestamp: Date.now() });
        }

        return result;
      } catch (error) {
        lastError = normalizeError(error);

        // Create recovery context
        const context: RecoveryContext = {
          error: lastError,
          operation: operationName,
          attempts: attempt,
          startTime,
          metadata,
        };

        // Try recovery strategies
        for (const strategy of this.config.strategies) {
          const result = await this.tryStrategy(strategy, context);

          if (result.success) {
            this.config.onRecovery?.(result, context);
            return result.value as T;
          }
        }
      }
    }

    // All recovery attempts failed
    const errorToThrow = lastError ?? new Error('All recovery attempts failed');
    ErrorReporter.reportError(errorToThrow, {
      action: 'recovery_failed',
      metadata: {
        operation: operationName,
        attempts: this.config.maxAttempts,
      },
    });

    if (errorToThrow instanceof Error) {
      throw errorToThrow;
    }
    const errorMessage = typeof errorToThrow === 'object' && errorToThrow !== null
      ? JSON.stringify(errorToThrow)
      : String(errorToThrow);
    throw new Error(`Recovery failed: ${errorMessage}`);
  }

  /**
   * Try a specific recovery strategy
   */
  private async tryStrategy(
    strategy: RecoveryStrategy,
    context: RecoveryContext
  ): Promise<RecoveryResult<T>> {
    // Check for custom handler first
    const customHandler = this.config.handlers?.[strategy];
    if (customHandler) {
      return customHandler(context);
    }

    // Use default handlers
    switch (strategy) {
      case 'retry':
        return this.retryStrategy(context);

      case 'fallback':
        return this.fallbackStrategy(context);

      case 'cache':
        return this.cacheStrategy(context);

      case 'degrade':
        return this.degradeStrategy(context);

      case 'skip':
        return this.skipStrategy(context);

      case 'escalate':
        return this.escalateStrategy(context);

      default:
        return { success: false, strategy, recovered: false };
    }
  }

  /**
   * Retry strategy
   */
  private retryStrategy(context: RecoveryContext): RecoveryResult<T> {
    // Retry is handled by the main execute loop
    // This strategy just signals that retry is possible
    const isRetryable = this.isRetryableError(context.error);
    return {
      success: false,
      strategy: 'retry',
      recovered: false,
      error: isRetryable ? undefined : context.error,
    };
  }

  /**
   * Fallback strategy
   */
  private async fallbackStrategy(_context: RecoveryContext): Promise<RecoveryResult<T>> {
    if (this.config.fallbackValue === undefined) {
      return { success: false, strategy: 'fallback', recovered: false };
    }

    try {
      const value =
        typeof this.config.fallbackValue === 'function'
          ? await (this.config.fallbackValue as () => T | Promise<T>)()
          : this.config.fallbackValue;

      return {
        success: true,
        value,
        strategy: 'fallback',
        recovered: true,
      };
    } catch {
      return { success: false, strategy: 'fallback', recovered: false };
    }
  }

  /**
   * Cache strategy
   */
  private cacheStrategy(_context: RecoveryContext): RecoveryResult<T> {
    if (this.config.cacheKey === undefined || this.config.cacheKey === '') {
      return { success: false, strategy: 'cache', recovered: false };
    }

    const cached = this.cache.get(this.config.cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return {
        success: true,
        value: cached.value,
        strategy: 'cache',
        recovered: true,
      };
    }

    return { success: false, strategy: 'cache', recovered: false };
  }

  /**
   * Degrade strategy
   */
  private async degradeStrategy(_context: RecoveryContext): Promise<RecoveryResult<T>> {
    if (!this.config.degradedFn) {
      return { success: false, strategy: 'degrade', recovered: false };
    }

    try {
      const value = await this.config.degradedFn();
      return {
        success: true,
        value,
        strategy: 'degrade',
        recovered: true,
      };
    } catch {
      return { success: false, strategy: 'degrade', recovered: false };
    }
  }

  /**
   * Skip strategy
   */
  private skipStrategy(_context: RecoveryContext): RecoveryResult<T> {
    // Skip just returns success with undefined value
    // Used when the operation is optional
    return {
      success: true,
      value: undefined as unknown as T,
      strategy: 'skip',
      recovered: true,
    };
  }

  /**
   * Escalate strategy
   */
  private escalateStrategy(context: RecoveryContext): RecoveryResult<T> {
    const shouldEscalate =
      this.config.shouldEscalate?.(context.error, context.attempts) ??
      context.error.severity === 'critical';

    if (shouldEscalate) {
      // Report escalated error
      ErrorReporter.reportError(context.error, {
        action: 'escalated',
        metadata: {
          operation: context.operation,
          attempts: context.attempts,
        },
      });
    }

    return { success: false, strategy: 'escalate', recovered: false };
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: AppError): boolean {
    const retryableCategories: ErrorCategory[] = [
      'network',
      'timeout',
      'rate_limit',
      'server',
    ];
    return retryableCategories.includes(error.category);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Recovery builder for fluent configuration
 */
export class RecoveryBuilder<T> {
  private config: RecoveryConfig<T> = {};

  /**
   * Set max attempts
   */
  maxAttempts(n: number): RecoveryBuilder<T> {
    this.config.maxAttempts = n;
    return this;
  }

  /**
   * Set strategies
   */
  strategies(...strategies: RecoveryStrategy[]): RecoveryBuilder<T> {
    this.config.strategies = strategies;
    return this;
  }

  /**
   * Set fallback value
   */
  fallback(value: T | (() => T | Promise<T>)): RecoveryBuilder<T> {
    this.config.fallbackValue = value;
    return this;
  }

  /**
   * Set cache key
   */
  cache(key: string): RecoveryBuilder<T> {
    this.config.cacheKey = key;
    return this;
  }

  /**
   * Set degraded function
   */
  degrade(fn: () => T | Promise<T>): RecoveryBuilder<T> {
    this.config.degradedFn = fn;
    return this;
  }

  /**
   * Set custom handler
   */
  handler(strategy: RecoveryStrategy, handler: RecoveryHandler<T>): RecoveryBuilder<T> {
    this.config.handlers ??= {};
    this.config.handlers[strategy] = handler;
    return this;
  }

  /**
   * Set recovery callback
   */
  onRecovery(
    callback: (result: RecoveryResult<T>, context: RecoveryContext) => void
  ): RecoveryBuilder<T> {
    this.config.onRecovery = callback;
    return this;
  }

  /**
   * Build the recovery manager
   */
  build(): ErrorRecovery<T> {
    return new ErrorRecovery<T>(this.config);
  }

  /**
   * Execute with configured recovery
   */
  async execute(
    operation: () => Promise<T>,
    operationName: string,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    return this.build().execute(operation, operationName, metadata);
  }
}

/**
 * Create a recovery builder
 */
export function recover<T>(): RecoveryBuilder<T> {
  return new RecoveryBuilder<T>();
}

/**
 * Graceful degradation wrapper
 */
export async function withGracefulDegradation<T>(
  primaryFn: () => Promise<T>,
  fallbackFn: () => T | Promise<T>,
  options?: {
    shouldDegrade?: (error: unknown) => boolean;
    onDegrade?: (error: unknown) => void;
  }
): Promise<{ value: T; degraded: boolean }> {
  try {
    const value = await primaryFn();
    return { value, degraded: false };
  } catch (error) {
    const shouldDegrade = options?.shouldDegrade?.(error) ?? true;

    if (shouldDegrade) {
      options?.onDegrade?.(error);
      const value = await fallbackFn();
      return { value, degraded: true };
    }

    throw error;
  }
}

/**
 * Circuit breaker with fallback
 */
export function withCircuitFallback<T>(
  primaryFn: () => Promise<T>,
  fallbackFn: () => T | Promise<T>,
  options?: {
    failureThreshold?: number;
    resetTimeout?: number;
  }
): () => Promise<T> {
  let failures = 0;
  let lastFailure = 0;
  const threshold = options?.failureThreshold ?? 5;
  const resetTimeout = options?.resetTimeout ?? 30000;

  return async () => {
    // Check if circuit should be half-open
    if (failures >= threshold) {
      if (Date.now() - lastFailure < resetTimeout) {
        // Circuit open - use fallback
        return fallbackFn();
      }
      // Try to reset
      failures = Math.floor(failures / 2);
    }

    try {
      const result = await primaryFn();
      failures = 0;
      return result;
    } catch (error) {
      failures++;
      lastFailure = Date.now();

      if (failures >= threshold) {
        return fallbackFn();
      }

      throw error;
    }
  };
}

/**
 * Stale-while-revalidate pattern
 */
export function staleWhileRevalidate<T>(
  fetchFn: () => Promise<T>,
  options: {
    cacheKey: string;
    staleTime?: number;
    maxAge?: number;
    storage?: Storage;
  }
): () => Promise<T> {
  const staleTime = options.staleTime ?? 60000; // 1 minute
  const maxAge = options.maxAge ?? 3600000; // 1 hour
  const storage = options.storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);

  const getCached = (): { value: T; timestamp: number } | null => {
    if (!storage) return null;
    try {
      const cached = storage.getItem(options.cacheKey);
      if (cached === null || cached === '') return null;
      const parsed: unknown = JSON.parse(cached);
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'value' in parsed &&
        'timestamp' in parsed &&
        typeof (parsed as { timestamp: unknown }).timestamp === 'number'
      ) {
        return parsed as { value: T; timestamp: number };
      }
      return null;
    } catch {
      return null;
    }
  };

  const setCached = (value: T): void => {
    if (!storage) return;
    try {
      storage.setItem(
        options.cacheKey,
        JSON.stringify({ value, timestamp: Date.now() })
      );
    } catch {
      // Storage full or unavailable
    }
  };

  return async () => {
    const cached = getCached();
    const now = Date.now();

    // If we have fresh cached data, return it immediately
    if (cached && now - cached.timestamp < staleTime) {
      return cached.value;
    }

    // If we have stale (but not expired) cached data
    if (cached && now - cached.timestamp < maxAge) {
      // Return stale data immediately
      // Revalidate in background
      fetchFn()
        .then(setCached)
        .catch(() => {}); // Ignore revalidation errors

      return cached.value;
    }

    // No valid cache - fetch fresh data
    const value = await fetchFn();
    setCached(value);
    return value;
  };
}

/**
 * Automatic retry with exponential backoff
 */
export async function autoRetry<T>(
  fn: () => Promise<T>,
  options?: {
    maxAttempts?: number;
    baseDelay?: number;
    maxDelay?: number;
    shouldRetry?: (error: unknown, attempt: number) => boolean;
    onRetry?: (error: unknown, attempt: number, delay: number) => void;
  }
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 3;
  const baseDelay = options?.baseDelay ?? 1000;
  const maxDelay = options?.maxDelay ?? 30000;
  const shouldRetry = options?.shouldRetry ?? (() => true);

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt >= maxAttempts || !shouldRetry(error, attempt)) {
        break;
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      options?.onRetry?.(error, attempt, delay);

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Safe async operation wrapper
 */
export async function safe<T>(
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
 * Safe sync operation wrapper
 */
export function safeSync<T>(fn: () => T): [T, null] | [null, Error] {
  try {
    const result = fn();
    return [result, null];
  } catch (error) {
    return [null, error instanceof Error ? error : new Error(String(error))];
  }
}
