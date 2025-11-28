/**
 * @file Smart Error Recovery UX
 * @description PhD-level intelligent error recovery with automatic retry strategies,
 * user-friendly progress indication, and circuit breaker integration.
 *
 * Features:
 * - Automatic recovery strategies
 * - Intelligent retry logic with exponential backoff
 * - User-friendly progress indication
 * - Circuit breaker UX integration
 * - Network-aware recovery
 * - Graceful degradation messaging
 */

import { useCallback, useEffect, useState, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

/**
 * Error severity levels
 */
export type RecoveryErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Recovery strategy types
 */
export type RecoveryStrategy = 'retry' | 'refresh' | 'fallback' | 'redirect' | 'manual' | 'none';

/**
 * Recovery state
 */
export type RecoveryState = 'idle' | 'recovering' | 'recovered' | 'failed' | 'circuit-open';

/**
 * Recovery progress info
 */
export interface RecoveryProgress {
  /** Current state */
  state: RecoveryState;
  /** Current attempt number */
  attempt: number;
  /** Maximum attempts */
  maxAttempts: number;
  /** Progress percentage (0-100) */
  percentage: number;
  /** Time until next retry in ms */
  nextRetryIn: number;
  /** Error message */
  message: string;
  /** User-friendly suggestion */
  suggestion: string;
}

/**
 * Error classification result
 */
export interface ErrorClassification {
  /** Error severity */
  severity: RecoveryErrorSeverity;
  /** Is recoverable */
  recoverable: boolean;
  /** Recommended strategy */
  strategy: RecoveryStrategy;
  /** Is network related */
  isNetworkError: boolean;
  /** Is rate limited */
  isRateLimited: boolean;
  /** Is authentication error */
  isAuthError: boolean;
  /** Is validation error */
  isValidationError: boolean;
  /** Retry delay suggestion in ms */
  suggestedRetryDelay: number;
}

/**
 * Recovery options
 */
export interface RecoveryOptions {
  /** Maximum retry attempts */
  maxAttempts?: number;
  /** Base delay between retries in ms */
  baseDelay?: number;
  /** Maximum delay between retries in ms */
  maxDelay?: number;
  /** Backoff multiplier */
  backoffMultiplier?: number;
  /** Add jitter to delays */
  jitter?: boolean;
  /** Retry only on specific errors */
  retryOn?: (error: Error) => boolean;
  /** Custom error classifier */
  classifier?: (error: Error) => ErrorClassification;
  /** On recovery attempt */
  onAttempt?: (attempt: number, error: Error) => void;
  /** On recovery success */
  onSuccess?: () => void;
  /** On recovery failure */
  onFailure?: (error: Error, attempts: number) => void;
  /** Respect circuit breaker state */
  respectCircuitBreaker?: boolean;
}

/**
 * Circuit breaker state
 */
export interface CircuitBreakerState {
  /** Is circuit open */
  isOpen: boolean;
  /** Failures count */
  failures: number;
  /** Last failure timestamp */
  lastFailure: number | null;
  /** Time until half-open in ms */
  resetIn: number;
}

// ============================================================================
// Error Classification
// ============================================================================

/**
 * Default error classifier
 */
export function classifyRecoveryError(error: Error): ErrorClassification {
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  // Network errors
  if (
    name.includes('network') ||
    name.includes('fetch') ||
    message.includes('network') ||
    message.includes('failed to fetch') ||
    message.includes('connection') ||
    message.includes('timeout') ||
    message.includes('offline')
  ) {
    return {
      severity: 'warning',
      recoverable: true,
      strategy: 'retry',
      isNetworkError: true,
      isRateLimited: false,
      isAuthError: false,
      isValidationError: false,
      suggestedRetryDelay: 2000,
    };
  }

  // Rate limiting
  if (
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('429')
  ) {
    return {
      severity: 'warning',
      recoverable: true,
      strategy: 'retry',
      isNetworkError: false,
      isRateLimited: true,
      isAuthError: false,
      isValidationError: false,
      suggestedRetryDelay: 60000, // 1 minute
    };
  }

  // Authentication errors
  if (
    message.includes('unauthorized') ||
    message.includes('unauthenticated') ||
    message.includes('401') ||
    message.includes('403') ||
    message.includes('forbidden')
  ) {
    return {
      severity: 'error',
      recoverable: false,
      strategy: 'redirect',
      isNetworkError: false,
      isRateLimited: false,
      isAuthError: true,
      isValidationError: false,
      suggestedRetryDelay: 0,
    };
  }

  // Validation errors
  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('400')
  ) {
    return {
      severity: 'warning',
      recoverable: false,
      strategy: 'manual',
      isNetworkError: false,
      isRateLimited: false,
      isAuthError: false,
      isValidationError: true,
      suggestedRetryDelay: 0,
    };
  }

  // Server errors
  if (
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('504') ||
    message.includes('server error')
  ) {
    return {
      severity: 'error',
      recoverable: true,
      strategy: 'retry',
      isNetworkError: false,
      isRateLimited: false,
      isAuthError: false,
      isValidationError: false,
      suggestedRetryDelay: 5000,
    };
  }

  // Default: unknown error
  return {
    severity: 'error',
    recoverable: false,
    strategy: 'fallback',
    isNetworkError: false,
    isRateLimited: false,
    isAuthError: false,
    isValidationError: false,
    suggestedRetryDelay: 3000,
  };
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyErrorMessage(
  classification: ErrorClassification
): { message: string; suggestion: string } {
  if (classification.isNetworkError) {
    return {
      message: 'Connection issue detected',
      suggestion: 'Please check your internet connection. We\'ll retry automatically.',
    };
  }

  if (classification.isRateLimited) {
    return {
      message: 'Too many requests',
      suggestion: 'Please wait a moment. The system will retry automatically.',
    };
  }

  if (classification.isAuthError) {
    return {
      message: 'Session expired',
      suggestion: 'Please sign in again to continue.',
    };
  }

  if (classification.isValidationError) {
    return {
      message: 'Invalid input',
      suggestion: 'Please check your input and try again.',
    };
  }

  return {
    message: 'Something went wrong',
    suggestion: 'We\'re working on it. Please try again shortly.',
  };
}

// ============================================================================
// Recovery Engine
// ============================================================================

/**
 * Smart recovery engine
 */
export class RecoveryEngine {
  private options: Required<RecoveryOptions>;
  private circuitBreaker: CircuitBreakerState = {
    isOpen: false,
    failures: 0,
    lastFailure: null,
    resetIn: 0,
  };
  private circuitBreakerThreshold = 5;
  private circuitBreakerTimeout = 30000;

  constructor(options: RecoveryOptions = {}) {
    this.options = {
      maxAttempts: options.maxAttempts ?? 3,
      baseDelay: options.baseDelay ?? 1000,
      maxDelay: options.maxDelay ?? 30000,
      backoffMultiplier: options.backoffMultiplier ?? 2,
      jitter: options.jitter ?? true,
      retryOn: options.retryOn ?? (() => true),
      classifier: options.classifier ?? classifyRecoveryError,
      onAttempt: options.onAttempt ?? (() => {}),
      onSuccess: options.onSuccess ?? (() => {}),
      onFailure: options.onFailure ?? (() => {}),
      respectCircuitBreaker: options.respectCircuitBreaker ?? true,
    };
  }

  /**
   * Execute with automatic recovery
   */
  async execute<T>(
    operation: () => Promise<T>,
    onProgress?: (progress: RecoveryProgress) => void
  ): Promise<T> {
    // Check circuit breaker
    if (this.options.respectCircuitBreaker && this.circuitBreaker.isOpen) {
      const now = Date.now();
      const timeSinceFailure = now - (this.circuitBreaker.lastFailure ?? 0);

      if (timeSinceFailure < this.circuitBreakerTimeout) {
        const resetIn = this.circuitBreakerTimeout - timeSinceFailure;
        onProgress?.({
          state: 'circuit-open',
          attempt: 0,
          maxAttempts: this.options.maxAttempts,
          percentage: 0,
          nextRetryIn: resetIn,
          message: 'Service temporarily unavailable',
          suggestion: `Please wait ${Math.ceil(resetIn / 1000)} seconds`,
        });
        throw new Error('Circuit breaker is open');
      } else {
        // Half-open: allow one attempt
        this.circuitBreaker.isOpen = false;
      }
    }

    let lastError: Error = new Error('Unknown error');
    let attempt = 0;

    while (attempt < this.options.maxAttempts) {
      attempt++;

      try {
        onProgress?.({
          state: 'recovering',
          attempt,
          maxAttempts: this.options.maxAttempts,
          percentage: (attempt / this.options.maxAttempts) * 100,
          nextRetryIn: 0,
          message: `Attempt ${attempt} of ${this.options.maxAttempts}`,
          suggestion: 'Please wait...',
        });

        const result = await operation();

        // Success - reset circuit breaker
        this.circuitBreaker.failures = 0;
        this.circuitBreaker.isOpen = false;
        this.options.onSuccess();

        onProgress?.({
          state: 'recovered',
          attempt,
          maxAttempts: this.options.maxAttempts,
          percentage: 100,
          nextRetryIn: 0,
          message: 'Success',
          suggestion: '',
        });

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.options.onAttempt(attempt, lastError);

        // Classify error
        const classification = this.options.classifier(lastError);

        // Check if we should retry
        if (!classification.recoverable || !this.options.retryOn(lastError)) {
          break;
        }

        // Update circuit breaker
        this.circuitBreaker.failures++;
        this.circuitBreaker.lastFailure = Date.now();

        if (this.circuitBreaker.failures >= this.circuitBreakerThreshold) {
          this.circuitBreaker.isOpen = true;
        }

        // Calculate delay
        if (attempt < this.options.maxAttempts) {
          const delay = this.calculateDelay(attempt, classification.suggestedRetryDelay);
          const { message, suggestion } = getUserFriendlyErrorMessage(classification);

          onProgress?.({
            state: 'recovering',
            attempt,
            maxAttempts: this.options.maxAttempts,
            percentage: (attempt / this.options.maxAttempts) * 100,
            nextRetryIn: delay,
            message,
            suggestion: `${suggestion} Retrying in ${Math.ceil(delay / 1000)}s...`,
          });

          await this.delay(delay);
        }
      }
    }

    // All attempts failed
    this.options.onFailure(lastError, attempt);

    const classification = this.options.classifier(lastError);
    const { message, suggestion } = getUserFriendlyErrorMessage(classification);

    onProgress?.({
      state: 'failed',
      attempt,
      maxAttempts: this.options.maxAttempts,
      percentage: 100,
      nextRetryIn: 0,
      message,
      suggestion,
    });

    throw lastError;
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number, suggestedDelay: number): number {
    let delay = Math.max(
      this.options.baseDelay * Math.pow(this.options.backoffMultiplier, attempt - 1),
      suggestedDelay
    );

    // Cap at max delay
    delay = Math.min(delay, this.options.maxDelay);

    // Add jitter
    if (this.options.jitter) {
      const jitter = delay * 0.2 * Math.random();
      delay = delay + jitter - delay * 0.1;
    }

    return Math.round(delay);
  }

  /**
   * Delay helper
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get circuit breaker state
   */
  getCircuitBreakerState(): CircuitBreakerState {
    const now = Date.now();
    const timeSinceFailure = now - (this.circuitBreaker.lastFailure ?? 0);
    const resetIn = this.circuitBreaker.isOpen
      ? Math.max(0, this.circuitBreakerTimeout - timeSinceFailure)
      : 0;

    return { ...this.circuitBreaker, resetIn };
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker = {
      isOpen: false,
      failures: 0,
      lastFailure: null,
      resetIn: 0,
    };
  }
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook for automatic error recovery
 */
export function useRecovery<T>(
  operation: () => Promise<T>,
  options: RecoveryOptions & { enabled?: boolean } = {}
): {
  execute: () => Promise<T>;
  progress: RecoveryProgress;
  isRecovering: boolean;
  error: Error | null;
  reset: () => void;
} {
  const { enabled = true, ...recoveryOptions } = options;
  const engineRef = useRef<RecoveryEngine | null>(null);
  engineRef.current ??= new RecoveryEngine(recoveryOptions);
  const engine = engineRef.current;
  const [progress, setProgress] = useState<RecoveryProgress>({
    state: 'idle',
    attempt: 0,
    maxAttempts: recoveryOptions.maxAttempts ?? 3,
    percentage: 0,
    nextRetryIn: 0,
    message: '',
    suggestion: '',
  });
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (): Promise<T> => {
    if (!enabled) {
      return operation();
    }

    setError(null);
    try {
      return await engine.execute(operation, setProgress);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      throw e;
    }
  }, [enabled, engine, operation]);

  const reset = useCallback(() => {
    setProgress({
      state: 'idle',
      attempt: 0,
      maxAttempts: recoveryOptions.maxAttempts ?? 3,
      percentage: 0,
      nextRetryIn: 0,
      message: '',
      suggestion: '',
    });
    setError(null);
    engine.resetCircuitBreaker();
  }, [engine, recoveryOptions.maxAttempts]);

  return {
    execute,
    progress,
    isRecovering: progress.state === 'recovering',
    error,
    reset,
  };
}

/**
 * Hook for circuit breaker awareness
 */
export function useCircuitBreaker(options: RecoveryOptions = {}): {
  state: CircuitBreakerState;
  isOpen: boolean;
  reset: () => void;
} {
  const engineRef = useRef<RecoveryEngine | null>(null);
  engineRef.current ??= new RecoveryEngine(options);
  const engine = engineRef.current;
  const [state, setState] = useState<CircuitBreakerState>(() => engine.getCircuitBreakerState());

  useEffect(() => {
    const interval = setInterval(() => {
      setState(engine.getCircuitBreakerState());
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, [engine]);

  const reset = useCallback(() => {
    engine.resetCircuitBreaker();
    setState(engine.getCircuitBreakerState());
  }, [engine]);

  return {
    state,
    isOpen: state.isOpen,
    reset,
  };
}

/**
 * Hook for network-aware recovery
 */
export function useNetworkAwareRecovery<T>(
  operation: () => Promise<T>,
  options: RecoveryOptions = {}
): {
  execute: () => Promise<T>;
  isOnline: boolean;
  isRecovering: boolean;
  progress: RecoveryProgress;
  error: Error | null;
} {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = (): void => setIsOnline(true);
    const handleOffline = (): void => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const { execute, progress, isRecovering, error } = useRecovery(operation, {
    ...options,
    enabled: isOnline,
  });

  return { execute, isOnline, isRecovering, progress, error };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create recovery engine
 */
export function createRecoveryEngine(options?: RecoveryOptions): RecoveryEngine {
  return new RecoveryEngine(options);
}

/**
 * Execute with recovery
 */
export async function executeWithRecovery<T>(
  operation: () => Promise<T>,
  options?: RecoveryOptions
): Promise<T> {
  return new RecoveryEngine(options).execute(operation);
}

// ============================================================================
// Exports
// ============================================================================

export default {
  RecoveryEngine,
  classifyRecoveryError,
  getUserFriendlyErrorMessage,
  createRecoveryEngine,
  executeWithRecovery,
  useRecovery,
  useCircuitBreaker,
  useNetworkAwareRecovery,
};
