/**
 * Centralized Error Handler for Enzyme VS Code Extension
 *
 * This module provides:
 * - Centralized error handling and recovery
 * - User-friendly error notifications
 * - Error aggregation and reporting
 * - Automatic retry mechanisms
 * - Circuit breaker pattern for failing operations
 *
 * @module error-handler
 */

import * as vscode from 'vscode';
import {
  EnzymeError,
  ErrorSeverity,
  ErrorCategory,
  ErrorCode,
  wrapError,
  getUserMessage,
  getRecoverySuggestions,
  formatErrorForLogging,
} from './errors';
import { logger } from './logger';
import type {
  RecoveryAction} from './errors';

/**
 * Error handler configuration
 */
export interface ErrorHandlerConfig {
  /** Whether to show error notifications to users */
  showNotifications: boolean;
  /** Whether to log errors */
  logErrors: boolean;
  /** Whether to report errors to telemetry */
  reportToTelemetry: boolean;
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Circuit breaker threshold (number of failures before opening circuit) */
  circuitBreakerThreshold: number;
  /** Circuit breaker reset timeout in ms */
  circuitBreakerResetTimeout: number;
}

/**
 * Default error handler configuration
 */
const DEFAULT_CONFIG: ErrorHandlerConfig = {
  showNotifications: true,
  logErrors: true,
  reportToTelemetry: true,
  maxRetries: 3,
  circuitBreakerThreshold: 5,
  circuitBreakerResetTimeout: 60000, // 1 minute
};

/**
 * Circuit breaker state
 */
enum CircuitState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Circuit tripped, rejecting calls
  HALF_OPEN = 'half_open', // Testing if service recovered
}

/**
 * Circuit breaker for an operation
 */
interface CircuitBreaker {
  state: CircuitState;
  failureCount: number;
  lastFailureTime: number;
  resetTimer?: ReturnType<typeof setTimeout>;
}

/**
 * Retry strategy configuration
 */
export interface RetryStrategy {
  /** Maximum number of retries */
  maxRetries: number;
  /** Initial delay in ms */
  initialDelay: number;
  /** Maximum delay in ms */
  maxDelay: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
  /** Whether to use exponential backoff */
  exponentialBackoff: boolean;
  /** Custom retry condition */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

/**
 * Default retry strategy
 */
const DEFAULT_RETRY_STRATEGY: RetryStrategy = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  exponentialBackoff: true,
};

/**
 * Error aggregation for batch reporting
 */
interface ErrorAggregation {
  count: number;
  firstOccurrence: number;
  lastOccurrence: number;
  error: EnzymeError;
}

/**
 * Centralized Error Handler class
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private config: ErrorHandlerConfig;
  private readonly circuitBreakers: Map<string, CircuitBreaker>;
  private readonly errorAggregations: Map<string, ErrorAggregation>;
  private telemetryService: any; // Will be injected

  /**
   *
   * @param config
   */
  private constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.circuitBreakers = new Map();
    this.errorAggregations = new Map();
  }

  /**
   * Get singleton instance
   *
   * @param config - Optional configuration override
   * @returns ErrorHandler instance
   */
  public static getInstance(config?: Partial<ErrorHandlerConfig>): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler(config);
    }
    return ErrorHandler.instance;
  }

  /**
   * Set telemetry service for error reporting
   *
   * @param telemetryService - Telemetry service instance
   */
  public setTelemetryService(telemetryService: any): void {
    this.telemetryService = telemetryService;
  }

  /**
   * Update configuration
   *
   * @param config - Partial configuration to update
   */
  public updateConfig(config: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Handle an error with full processing pipeline
   *
   * @param error - Error to handle
   * @param context - Additional context
   * @param options - Handling options
   * @param context.component
   * @param context.operation
   * @param options.showNotification
   * @param options.logError
   * @param options.reportToTelemetry
   * @param options.userMessage
   * @param options.recoveryActions
   * @returns Promise that resolves when error is handled
   *
   * @example
   * ```typescript
   * try {
   *   await someOperation();
   * } catch (error) {
   *   await errorHandler.handleError(error, { component: 'MyComponent' });
   * }
   * ```
   */
  public async handleError(
    error: unknown,
    context: { component?: string; operation?: string } = {},
    options: {
      showNotification?: boolean;
      logError?: boolean;
      reportToTelemetry?: boolean;
      userMessage?: string;
      recoveryActions?: RecoveryAction[];
    } = {}
  ): Promise<void> {
    // Wrap error if not already an EnzymeError
    const enzymeError = error instanceof EnzymeError
      ? error
      : wrapError(error, 'An unexpected error occurred', context);

    // Log error
    if (options.logError ?? this.config.logErrors) {
      this.logError(enzymeError);
    }

    // Aggregate error for reporting
    this.aggregateError(enzymeError);

    // Report to telemetry
    if ((options.reportToTelemetry ?? this.config.reportToTelemetry) && enzymeError.reportable) {
      await this.reportErrorToTelemetry(enzymeError);
    }

    // Show notification
    if (options.showNotification ?? this.config.showNotifications) {
      await this.showErrorNotification(
        enzymeError,
        options.userMessage,
        options.recoveryActions || enzymeError.recoveryActions
      );
    }
  }

  /**
   * Execute an operation with error handling and retry logic
   *
   * @param operation - Operation to execute
   * @param operationName - Name for logging and circuit breaker
   * @param retryStrategy - Optional retry strategy
   * @returns Result of the operation
   *
   * @example
   * ```typescript
   * const result = await errorHandler.executeWithRetry(
   *   async () => await fetchData(),
   *   'fetchData',
   *   { maxRetries: 3 }
   * );
   * ```
   */
  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    retryStrategy: Partial<RetryStrategy> = {}
  ): Promise<T> {
    const strategy: RetryStrategy = { ...DEFAULT_RETRY_STRATEGY, ...retryStrategy };
    let lastError: unknown;
    let attempt = 0;

    // Check circuit breaker
    if (this.isCircuitOpen(operationName)) {
      throw new EnzymeError(
        `Circuit breaker is open for operation: ${operationName}`,
        ErrorCode.INTERNAL_ERROR,
        ErrorCategory.INTERNAL,
        ErrorSeverity.HIGH,
        { operation: operationName },
        'This operation is temporarily unavailable due to repeated failures. Please try again later.'
      );
    }

    while (attempt <= strategy.maxRetries) {
      try {
        const result = await operation();
        // Success - reset circuit breaker
        this.recordSuccess(operationName);
        return result;
      } catch (error) {
        lastError = error;
        attempt++;

        // Record failure for circuit breaker
        this.recordFailure(operationName);

        // Check if we should retry
        const shouldRetry = strategy.shouldRetry
          ? strategy.shouldRetry(error, attempt)
          : attempt <= strategy.maxRetries;

        if (!shouldRetry || attempt > strategy.maxRetries) {
          break;
        }

        // Calculate delay
        const delay = this.calculateRetryDelay(attempt, strategy);

        logger.warn(
          `Retry attempt ${attempt}/${strategy.maxRetries} for ${operationName} after ${delay}ms`,
          { error: error instanceof Error ? error.message : String(error) }
        );

        // Wait before retrying
        await this.sleep(delay);
      }
    }

    // All retries exhausted
    throw wrapError(
      lastError,
      `Operation '${operationName}' failed after ${attempt} attempts`,
      { operation: operationName }
    );
  }

  /**
   * Execute an operation with timeout
   *
   * @param operation - Operation to execute
   * @param timeoutMs - Timeout in milliseconds
   * @param operationName - Name for error messages
   * @returns Result of the operation
   *
   * @example
   * ```typescript
   * const result = await errorHandler.executeWithTimeout(
   *   async () => await longRunningOperation(),
   *   5000,
   *   'longRunningOperation'
   * );
   * ```
   */
  public async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    operationName: string
  ): Promise<T> {
    return new Promise<T>(async (resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        reject(
          new EnzymeError(
            `Operation '${operationName}' timed out after ${timeoutMs}ms`,
            ErrorCode.COMMAND_TIMEOUT,
            ErrorCategory.COMMAND,
            ErrorSeverity.MEDIUM,
            { operation: operationName },
            `The operation took too long to complete (timeout: ${timeoutMs}ms)`,
            ['Try increasing the timeout', 'Check network connectivity', 'Optimize the operation']
          )
        );
      }, timeoutMs);

      try {
        const result = await operation();
        clearTimeout(timeoutHandle);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutHandle);
        reject(error);
      }
    });
  }

  /**
   * Show error notification to user
   *
   * @param error - Error to display
   * @param customMessage - Custom user message
   * @param recoveryActions - Recovery actions
   */
  private async showErrorNotification(
    error: EnzymeError,
    customMessage?: string,
    recoveryActions: RecoveryAction[] = []
  ): Promise<void> {
    const message = customMessage || getUserMessage(error);
    const suggestions = getRecoverySuggestions(error);

    // Build action items
    const items: string[] = [];

    // Add "Show Details" for all errors
    items.push('Show Details');

    // Add recovery actions
    const actionMap = new Map<string, RecoveryAction>();
    for (const action of recoveryActions) {
      items.push(action.label);
      actionMap.set(action.label, action);
    }

    // Add "Copy Error" for debugging
    items.push('Copy Error');

    // Show appropriate notification based on severity
    let selection: string | undefined;

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        selection = await vscode.window.showErrorMessage(message, ...items);
        break;
      case ErrorSeverity.MEDIUM:
        selection = await vscode.window.showWarningMessage(message, ...items);
        break;
      case ErrorSeverity.LOW:
        selection = await vscode.window.showInformationMessage(message, ...items);
        break;
    }

    // Handle user selection
    if (selection === 'Show Details') {
      await this.showErrorDetails(error, suggestions);
    } else if (selection === 'Copy Error') {
      await this.copyErrorToClipboard(error);
    } else if (selection && actionMap.has(selection)) {
      const action = actionMap.get(selection)!;
      try {
        await action.handler();
      } catch (handlerError) {
        logger.error('Recovery action failed', handlerError);
      }
    }
  }

  /**
   * Show detailed error information
   *
   * @param error - Error to show
   * @param suggestions - Recovery suggestions
   */
  private async showErrorDetails(error: EnzymeError, suggestions: string[]): Promise<void> {
    const details = [
      `Error Code: ${error.code}`,
      `Category: ${error.category}`,
      `Severity: ${error.severity}`,
      '',
      'Message:',
      error.message,
    ];

    if (error.context.filePath) {
      details.push('', `File: ${error.context.filePath}`);
    }

    if (suggestions.length > 0) {
      details.push('', 'Recovery Suggestions:');
      suggestions.forEach(s => details.push(`• ${s}`));
    }

    if (error.stack) {
      details.push('', 'Stack Trace:', error.stack);
    }

    const document = await vscode.workspace.openTextDocument({
      content: details.join('\n'),
      language: 'plaintext',
    });

    await vscode.window.showTextDocument(document);
    logger.show();
  }

  /**
   * Copy error details to clipboard
   *
   * @param error - Error to copy
   */
  private async copyErrorToClipboard(error: EnzymeError): Promise<void> {
    const errorText = formatErrorForLogging(error, true);
    await vscode.env.clipboard.writeText(errorText);
    vscode.window.showInformationMessage('Error details copied to clipboard');
  }

  /**
   * Log error with proper formatting
   *
   * @param error - Error to log
   */
  private logError(error: EnzymeError): void {
    const formatted = formatErrorForLogging(error, true);

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        logger.error(formatted);
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn(formatted);
        break;
      case ErrorSeverity.LOW:
        logger.info(formatted);
        break;
    }
  }

  /**
   * Report error to telemetry service
   *
   * @param error - Error to report
   */
  private async reportErrorToTelemetry(error: EnzymeError): Promise<void> {
    if (!this.telemetryService) {
      return;
    }

    try {
      this.telemetryService.trackError(error, {
        code: error.code,
        category: error.category,
        severity: error.severity,
        component: error.context.component,
        operation: error.context.operation,
      });
    } catch (telemetryError) {
      // Don't throw errors from telemetry
      logger.debug('Failed to report error to telemetry', telemetryError);
    }
  }

  /**
   * Aggregate errors for batch reporting
   *
   * @param error - Error to aggregate
   */
  private aggregateError(error: EnzymeError): void {
    const key = `${error.code}:${error.message}`;
    const existing = this.errorAggregations.get(key);

    if (existing) {
      existing.count++;
      existing.lastOccurrence = Date.now();
    } else {
      this.errorAggregations.set(key, {
        count: 1,
        firstOccurrence: Date.now(),
        lastOccurrence: Date.now(),
        error,
      });
    }

    // Clean up old aggregations (older than 1 hour)
    const oneHourAgo = Date.now() - 3600000;
    for (const [key, agg] of this.errorAggregations.entries()) {
      if (agg.lastOccurrence < oneHourAgo) {
        this.errorAggregations.delete(key);
      }
    }
  }

  /**
   * Get aggregated error statistics
   *
   * @returns Map of error aggregations
   */
  public getErrorAggregations(): Map<string, ErrorAggregation> {
    return new Map(this.errorAggregations);
  }

  /**
   * Clear error aggregations
   */
  public clearAggregations(): void {
    this.errorAggregations.clear();
  }

  /**
   * Check if circuit is open for an operation
   *
   * @param operationName - Operation name
   * @returns True if circuit is open
   */
  private isCircuitOpen(operationName: string): boolean {
    const breaker = this.circuitBreakers.get(operationName);
    if (!breaker) {
      return false;
    }

    if (breaker.state === CircuitState.OPEN) {
      // Check if it's time to try half-open
      const timeSinceFailure = Date.now() - breaker.lastFailureTime;
      if (timeSinceFailure >= this.config.circuitBreakerResetTimeout) {
        breaker.state = CircuitState.HALF_OPEN;
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Record a successful operation
   *
   * @param operationName - Operation name
   */
  private recordSuccess(operationName: string): void {
    const breaker = this.circuitBreakers.get(operationName);
    if (breaker) {
      breaker.failureCount = 0;
      breaker.state = CircuitState.CLOSED;
      if (breaker.resetTimer) {
        clearTimeout(breaker.resetTimer);
        delete breaker.resetTimer;
      }
    }
  }

  /**
   * Record a failed operation
   *
   * @param operationName - Operation name
   */
  private recordFailure(operationName: string): void {
    let breaker = this.circuitBreakers.get(operationName);

    if (!breaker) {
      breaker = {
        state: CircuitState.CLOSED,
        failureCount: 0,
        lastFailureTime: 0,
      };
      this.circuitBreakers.set(operationName, breaker);
    }

    breaker.failureCount++;
    breaker.lastFailureTime = Date.now();

    // Trip circuit if threshold exceeded
    if (breaker.failureCount >= this.config.circuitBreakerThreshold) {
      breaker.state = CircuitState.OPEN;
      logger.warn(`Circuit breaker opened for operation: ${operationName}`);

      // Set timer to attempt reset
      breaker.resetTimer = setTimeout(() => {
        breaker.state = CircuitState.HALF_OPEN;
        logger.info(`Circuit breaker half-open for operation: ${operationName}`);
      }, this.config.circuitBreakerResetTimeout);
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   *
   * @param attempt - Current attempt number
   * @param strategy - Retry strategy
   * @returns Delay in milliseconds
   */
  private calculateRetryDelay(attempt: number, strategy: RetryStrategy): number {
    if (!strategy.exponentialBackoff) {
      return strategy.initialDelay;
    }

    const delay = strategy.initialDelay * Math.pow(strategy.backoffMultiplier, attempt - 1);
    return Math.min(delay, strategy.maxDelay);
  }

  /**
   * Sleep for specified duration
   *
   * @param ms - Duration in milliseconds
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Reset circuit breaker for an operation
   *
   * @param operationName - Operation name
   */
  public resetCircuitBreaker(operationName: string): void {
    const breaker = this.circuitBreakers.get(operationName);
    if (breaker) {
      breaker.state = CircuitState.CLOSED;
      breaker.failureCount = 0;
      if (breaker.resetTimer) {
        clearTimeout(breaker.resetTimer);
        delete breaker.resetTimer;
      }
    }
  }

  /**
   * Get circuit breaker status
   *
   * @returns Map of circuit breakers and their states
   */
  public getCircuitBreakers(): Map<string, CircuitBreaker> {
    return new Map(this.circuitBreakers);
  }

  /**
   * Execute an operation with performance monitoring
   *
   * PERFORMANCE: Tracks operation duration and logs warnings for slow operations
   *
   * @param operation - Operation to execute
   * @param operationName - Name for logging
   * @param performanceThreshold - Threshold in ms for slow operation warning (default: 1000ms)
   * @returns Result of the operation
   *
   * ERROR HANDLING: Automatically handles and logs errors with full context
   *
   * @example
   * ```typescript
   * const result = await errorHandler.executeWithPerformanceMonitoring(
   *   async () => await expensiveOperation(),
   *   'expensiveOperation',
   *   500 // Warn if takes longer than 500ms
   * );
   * ```
   */
  public async executeWithPerformanceMonitoring<T>(
    operation: () => Promise<T>,
    operationName: string,
    performanceThreshold = 1000
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await operation();
      const duration = Date.now() - startTime;

      // Log performance warning if operation is slow
      if (duration > performanceThreshold) {
        logger.warn(
          `PERFORMANCE WARNING: ${operationName} took ${duration}ms (threshold: ${performanceThreshold}ms)`,
          { operation: operationName, duration, threshold: performanceThreshold }
        );
      } else {
        logger.debug(`${operationName} completed in ${duration}ms`);
      }

      return result;
    } catch (error) {
      await this.handleError(error, {
        component: 'PerformanceMonitoring',
        operation: operationName,
      }, {
        showNotification: true,
        logError: true,
        reportToTelemetry: true,
      });
      throw error;
    }
  }

  /**
   * Dispose error handler and clean up resources
   *
   * PERFORMANCE: Critical for preventing memory leaks
   * - Clears all circuit breaker timers
   * - Clears error aggregations
   * - Ensures no memory is retained
   *
   * ERROR HANDLING: Catches and logs any disposal errors
   */
  public dispose(): void {
    try {
      // Clear all circuit breaker timers
      for (const breaker of this.circuitBreakers.values()) {
        if (breaker.resetTimer) {
          clearTimeout(breaker.resetTimer);
        }
      }
      this.circuitBreakers.clear();
      this.errorAggregations.clear();

      logger.debug('ErrorHandler disposed successfully');
    } catch (error) {
      logger.error('Error disposing ErrorHandler', error);
    }
  }
}

/**
 * Global error handler instance
 */
export const errorHandler = ErrorHandler.getInstance();

/**
 * Decorator for automatic error handling
 *
 * @param target - Class prototype
 * @param propertyKey - Method name
 * @param descriptor - Property descriptor
 *
 * @example
 * ```typescript
 * class MyClass {
 *   @handleErrors
 *   async myMethod() {
 *     // method implementation
 *   }
 * }
 * ```
 */
export function handleErrors(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    try {
      return await originalMethod.apply(this, args);
    } catch (error) {
      await errorHandler.handleError(error, {
        component: target.constructor.name,
        operation: propertyKey,
      });
      throw error;
    }
  };

  return descriptor;
}
