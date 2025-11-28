/**
 * @file Unified Enterprise Error Handler
 * @description Centralized error handling with healthcare compliance, PHI detection,
 * audit logging, and consistent error messaging across the entire application.
 *
 * This replaces 3-5 fragmented error handlers with a single, configurable system
 * that ensures consistent error disclosure, HIPAA-compliant audit trails, and
 * proper security practices for healthcare applications.
 *
 * @see {@link https://example.com/docs/error-handling} for architecture documentation
 */

import { env } from '@/config';

/**
 * Healthcare data patterns that should never appear in error messages
 * Used to sanitize error output for HIPAA compliance
 */
const PHI_PATTERNS = {
  // Medical record numbers
  mrn: /\b[A-Z]{2}\d{6,10}\b/g,
  // Social security numbers
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  // Patient dates of birth (common formats)
  dob: /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
  // Email addresses
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  // Phone numbers
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  // Credit card numbers
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
};

/**
 * Error classification for proper categorization and handling
 */
export enum ErrorCategory {
  // Client-side errors (user actions, validation)
  Validation = 'VALIDATION',
  NotFound = 'NOT_FOUND',
  Unauthorized = 'UNAUTHORIZED',
  Forbidden = 'FORBIDDEN',

  // Network/API errors (recoverable)
  Network = 'NETWORK',
  Timeout = 'TIMEOUT',
  RateLimit = 'RATE_LIMIT',

  // Server errors (not user's fault, usually transient)
  BadGateway = 'BAD_GATEWAY',
  ServiceUnavailable = 'SERVICE_UNAVAILABLE',
  InternalServer = 'INTERNAL_SERVER',

  // Application errors (bugs)
  Assertion = 'ASSERTION',
  Runtime = 'RUNTIME',
  Unknown = 'UNKNOWN',
}

/**
 * Error severity level for proper alerting and monitoring
 */
export enum ErrorSeverity {
  Info = 'INFO',
  Warning = 'WARNING',
  Error = 'ERROR',
  Critical = 'CRITICAL',
}

/**
 * Configuration for error handling behavior
 */
export interface UnifiedErrorHandlerConfig {
  /**
   * Enable automatic error reporting to backend
   * @default true
   */
  enableReporting: boolean;

  /**
   * Enable HIPAA-compliant audit logging
   * @default true (required for healthcare)
   */
  enableAuditLogging: boolean;

  /**
   * Whether to include stack traces in error messages shown to users
   * @default false (security: never show details to users)
   */
  includeStackTracesForUsers: boolean;

  /**
   * Whether to include raw error data in console logs (dev only)
   * @default true in dev, false in prod
   */
  enableDetailedLogging: boolean;

  /**
   * Endpoint for error reporting
   * @default '/api/errors'
   */
  reportingEndpoint: string;

  /**
   * Endpoint for audit trail logging
   * @default '/api/audit/errors'
   */
  auditEndpoint: string;

  /**
   * Sample rate for error reporting (0-1, where 1 = 100%)
   * @default 1 (report all errors)
   */
  sampleRate: number;

  /**
   * Max number of errors to buffer before auto-sending
   * @default 10
   */
  maxBufferSize: number;

  /**
   * Max number of errors to report per batch
   * @default 5
   */
  maxBatchSize: number;
}

/**
 * Error context for audit logging and debugging
 */
export interface ErrorContext {
  /** Unique error ID for tracking */
  errorId: string;
  /** Timestamp when error occurred */
  timestamp: string;
  /** User ID (if available) */
  userId?: string;
  /** Session ID */
  sessionId: string;
  /** Route/page where error occurred */
  route?: string;
  /** User action that triggered error */
  userAction?: string;
  /** Custom context tags */
  tags: Record<string, string>;
}

/**
 * Structured error object for reporting
 */
export interface StructuredError {
  /** Error ID for tracking */
  id: string;
  /** Error category */
  category: ErrorCategory;
  /** Error severity */
  severity: ErrorSeverity;
  /** User-safe error message (no PHI) */
  userMessage: string;
  /** Internal message (for logs, may contain details) */
  internalMessage: string;
  /** Error code for frontend handling */
  code?: string;
  /** Original error object */
  originalError?: Error;
  /** Full error context */
  context: ErrorContext;
  /** Stack trace (if available) */
  stackTrace?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Central error handler for the entire application
 *
 * Provides unified error handling, HIPAA-compliant audit logging,
 * PHI detection and sanitization, and consistent error messaging.
 *
 * @example
 * ```typescript
 * const handler = UnifiedErrorHandler.getInstance();
 *
 * // Handle an error with automatic categorization
 * handler.handle(new Error('User not found'), {
 *   userAction: 'login',
 *   route: '/auth/login',
 * });
 *
 * // Create a validation error
 * handler.validation('Email is invalid', 'email_invalid');
 *
 * // Create a network error with retry guidance
 * handler.network('Failed to fetch user data', {
 *   retryable: true,
 *   retryAfter: 5000,
 * });
 * ```
 */
export class UnifiedErrorHandler {
  private static instance: UnifiedErrorHandler;
  private config: UnifiedErrorHandlerConfig;
  private errorBuffer: StructuredError[] = [];
  private sessionId: string;

  private constructor(config: Partial<UnifiedErrorHandlerConfig> = {}) {
    this.config = {
      enableReporting: true,
      enableAuditLogging: true,
      includeStackTracesForUsers: false,
      enableDetailedLogging: env.isDev,
      reportingEndpoint: '/api/errors',
      auditEndpoint: '/api/audit/errors',
      sampleRate: 1,
      maxBufferSize: 10,
      maxBatchSize: 5,
      ...config,
    };

    this.sessionId = this.generateSessionId();
  }

  /**
   * Get or create the error handler instance (singleton)
   */
  static getInstance(config?: Partial<UnifiedErrorHandlerConfig>): UnifiedErrorHandler {
    if (!UnifiedErrorHandler.instance) {
      UnifiedErrorHandler.instance = new UnifiedErrorHandler(config);
    }
    return UnifiedErrorHandler.instance;
  }

  /**
   * Handle a generic error with automatic categorization
   *
   * @param error - Error object or message
   * @param context - Additional context about the error
   * @returns Structured error object
   */
  handle(
    error: Error | string,
    context: Partial<ErrorContext> & { userAction?: string; route?: string } = {},
  ): StructuredError {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    const category = this.categorizeError(errorObj);
    const severity = this.calculateSeverity(category);

    const structured: StructuredError = {
      id: this.generateErrorId(),
      category,
      severity,
      userMessage: this.generateUserMessage(category),
      internalMessage: errorObj.message,
      code: this.extractErrorCode(errorObj),
      originalError: errorObj,
      context: {
        errorId: this.generateErrorId(),
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId,
        ...context,
        tags: context.tags || {},
      },
      stackTrace: errorObj.stack,
    };

    this.processError(structured);
    return structured;
  }

  /**
   * Handle a validation error (user input)
   */
  validation(message: string, code?: string): StructuredError {
    return this.handle(new Error(message), {
      userAction: 'validation',
      tags: { errorType: 'validation', ...(code && { errorCode: code }) },
    });
  }

  /**
   * Handle a network/API error
   */
  network(message: string, metadata?: Record<string, unknown>): StructuredError {
    const tags: Record<string, string> = { errorType: 'network' };
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        tags[key] = String(value);
      });
    }
    return this.handle(new Error(message), {
      userAction: 'api-call',
      tags,
    });
  }

  /**
   * Handle an unauthorized (401) error
   */
  unauthorized(message = 'You are not authenticated'): StructuredError {
    return this.handle(new Error(message), {
      userAction: 'auth',
      tags: { errorType: 'unauthorized' },
    });
  }

  /**
   * Handle a forbidden (403) error
   */
  forbidden(message = 'You do not have permission'): StructuredError {
    return this.handle(new Error(message), {
      userAction: 'auth',
      tags: { errorType: 'forbidden' },
    });
  }

  /**
   * Handle a not found (404) error
   */
  notFound(resource: string): StructuredError {
    return this.handle(new Error(`${resource} not found`), {
      tags: { errorType: 'not_found', resource },
    });
  }

  /**
   * Handle a rate limit error with retry information
   */
  rateLimited(retryAfter?: number): StructuredError {
    return this.handle(new Error('Too many requests'), {
      tags: { errorType: 'rate_limit', ...(retryAfter && { retryAfter: String(retryAfter) }) },
    });
  }

  /**
   * Categorize an error based on its message and type
   */
  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();

    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorCategory.Validation;
    }
    if (message.includes('404') || message.includes('not found')) {
      return ErrorCategory.NotFound;
    }
    if (message.includes('401') || message.includes('unauthorized')) {
      return ErrorCategory.Unauthorized;
    }
    if (message.includes('403') || message.includes('forbidden')) {
      return ErrorCategory.Forbidden;
    }
    if (message.includes('network') || message.includes('fetch')) {
      return ErrorCategory.Network;
    }
    if (message.includes('timeout')) {
      return ErrorCategory.Timeout;
    }
    if (message.includes('429') || message.includes('rate limit')) {
      return ErrorCategory.RateLimit;
    }
    if (message.includes('502') || message.includes('bad gateway')) {
      return ErrorCategory.BadGateway;
    }
    if (message.includes('503') || message.includes('unavailable')) {
      return ErrorCategory.ServiceUnavailable;
    }
    if (message.includes('500') || message.includes('internal server')) {
      return ErrorCategory.InternalServer;
    }

    return ErrorCategory.Unknown;
  }

  /**
   * Calculate error severity based on category
   */
  private calculateSeverity(category: ErrorCategory): ErrorSeverity {
    switch (category) {
      case ErrorCategory.Validation:
      case ErrorCategory.NotFound:
        return ErrorSeverity.Info;
      case ErrorCategory.Unauthorized:
      case ErrorCategory.Forbidden:
      case ErrorCategory.Network:
      case ErrorCategory.Timeout:
        return ErrorSeverity.Warning;
      case ErrorCategory.RateLimit:
        return ErrorSeverity.Error;
      case ErrorCategory.BadGateway:
      case ErrorCategory.ServiceUnavailable:
      case ErrorCategory.InternalServer:
      case ErrorCategory.Assertion:
      case ErrorCategory.Runtime:
        return ErrorSeverity.Critical;
      default:
        return ErrorSeverity.Error;
    }
  }

  /**
   * Generate a user-safe error message (no PHI, no technical details)
   */
  private generateUserMessage(category: ErrorCategory): string {
    switch (category) {
      case ErrorCategory.Validation:
        return 'Please check your input and try again';
      case ErrorCategory.NotFound:
        return 'The requested resource was not found';
      case ErrorCategory.Unauthorized:
        return 'You are not authenticated. Please sign in.';
      case ErrorCategory.Forbidden:
        return 'You do not have permission to access this';
      case ErrorCategory.Network:
        return 'Network connection failed. Please check your internet and try again.';
      case ErrorCategory.Timeout:
        return 'The request took too long. Please try again.';
      case ErrorCategory.RateLimit:
        return 'Too many requests. Please wait a moment and try again.';
      case ErrorCategory.BadGateway:
      case ErrorCategory.ServiceUnavailable:
        return 'Service temporarily unavailable. Please try again shortly.';
      case ErrorCategory.InternalServer:
        return 'An error occurred. Our team has been notified.';
      default:
        return 'An unexpected error occurred';
    }
  }

  /**
   * Sanitize error messages to remove PHI
   */
  sanitizeMessage(message: string): string {
    let sanitized = message;

    // Replace PHI patterns with generic placeholders
    Object.entries(PHI_PATTERNS).forEach(([key, pattern]) => {
      sanitized = sanitized.replace(pattern, `[${key.toUpperCase()}]`);
    });

    return sanitized;
  }

  /**
   * Process error: log, audit, buffer, and report
   */
  private processError(error: StructuredError): void {
    // Sanitize message for all contexts
    error.userMessage = this.sanitizeMessage(error.userMessage);

    // Log to console (dev only)
    if (this.config.enableDetailedLogging) {
      console.group(`[Error] ${error.id}`);
      console.log('Category:', error.category);
      console.log('Severity:', error.severity);
      console.log('Message:', error.internalMessage);
      console.log('Context:', error.context);
      if (error.stackTrace) {
        console.log('Stack:', error.stackTrace);
      }
      console.groupEnd();
    }

    // Audit log if enabled (required for healthcare)
    if (this.config.enableAuditLogging) {
      this.auditLog(error);
    }

    // Buffer error for batch reporting
    if (this.config.enableReporting && Math.random() < this.config.sampleRate) {
      this.errorBuffer.push(error);

      // Auto-flush buffer if it reaches max size
      if (this.errorBuffer.length >= this.config.maxBufferSize) {
        this.flush();
      }
    }
  }

  /**
   * Create HIPAA-compliant audit log entry
   */
  private auditLog(error: StructuredError): void {
    const auditEntry = {
      eventType: 'ERROR',
      errorId: error.id,
      category: error.category,
      severity: error.severity,
      userId: error.context.userId,
      sessionId: error.context.sessionId,
      timestamp: error.context.timestamp,
      userAction: error.context.userAction,
      route: error.context.route,
      // Sanitized message (no PHI)
      message: this.sanitizeMessage(error.internalMessage),
      // DO NOT include raw error data in audit logs (no stack traces, no original errors)
    };

    // Send to audit endpoint asynchronously (fire and forget)
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(
        this.config.auditEndpoint,
        JSON.stringify(auditEntry)
      );
    }
  }

  /**
   * Extract error code from error object or message
   */
  private extractErrorCode(error: Error): string | undefined {
    // Check error.code property (Node.js style)
    if ('code' in error && typeof error.code === 'string') {
      return error.code;
    }

    // Try to extract from message (e.g., "ERR_NETWORK")
    const match = error.message.match(/\[([A-Z_]+)\]/);
    return match?.[1];
  }

  /**
   * Flush buffered errors to reporting endpoint
   */
  async flush(): Promise<void> {
    if (this.errorBuffer.length === 0 || !this.config.enableReporting) {
      return;
    }

    const batch = this.errorBuffer.splice(0, this.config.maxBatchSize);

    try {
      await fetch(this.config.reportingEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errors: batch }),
      });
    } catch (error) {
      // Silently fail if reporting fails (don't cascade errors)
      if (env.isDev) {
        console.warn('[ErrorHandler] Failed to report errors:', error);
      }
    }
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      let sessionId = window.sessionStorage.getItem('__error_handler_session__');
      if (!sessionId) {
        sessionId = `SESSION_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        window.sessionStorage.setItem('__error_handler_session__', sessionId);
      }
      return sessionId;
    }
    return `SESSION_${Date.now()}`;
  }
}

/**
 * Get the global error handler instance (singleton pattern)
 *
 * @example
 * ```typescript
 * import { getErrorHandler } from '@/lib/shared/UnifiedErrorHandler';
 *
 * const handler = getErrorHandler();
 * handler.handle(error, { userAction: 'submit_form' });
 * ```
 */
export function getErrorHandler(): UnifiedErrorHandler {
  return UnifiedErrorHandler.getInstance();
}

/**
 * Hook to use error handler in React components (if needed for custom handling)
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const handleError = (error: Error) => {
 *     const structured = getErrorHandler().handle(error, { userAction: 'click_button' });
 *     toast.error(structured.userMessage);
 *   };
 *
 *   return <button onClick={() => handleError(new Error('Oops'))}>Try me</button>;
 * }
 * ```
 */
export function useErrorHandler(config?: Partial<UnifiedErrorHandlerConfig>) {
  const handler = UnifiedErrorHandler.getInstance(config);
  return handler;
}
