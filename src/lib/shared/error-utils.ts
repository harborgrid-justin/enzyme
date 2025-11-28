/**
 * @file Unified Error Utilities
 * @description Standardized error creation, classification, normalization,
 * and error handling patterns.
 *
 * @module shared/error-utils
 */

// =============================================================================
// Error Categories
// =============================================================================

/**
 * Error category for classification and handling decisions.
 */
export type ErrorCategory =
  | 'network'
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'not_found'
  | 'conflict'
  | 'rate_limit'
  | 'timeout'
  | 'server'
  | 'client'
  | 'unknown';

/**
 * Error severity level.
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

// =============================================================================
// Base Error Classes
// =============================================================================

/**
 * Base application error with category and metadata support.
 */
export class AppError extends Error {
  readonly category: ErrorCategory;
  readonly severity: ErrorSeverity;
  readonly code?: string;
  readonly statusCode?: number;
  readonly metadata?: Record<string, unknown>;
  readonly timestamp: number;
  readonly isRetryable: boolean;

  constructor(
    message: string,
    options: {
      category?: ErrorCategory;
      severity?: ErrorSeverity;
      code?: string;
      statusCode?: number;
      metadata?: Record<string, unknown>;
      cause?: Error;
      isRetryable?: boolean;
    } = {}
  ) {
    super(message, { cause: options.cause });
    this.name = 'AppError';
    this.category = options.category ?? 'unknown';
    this.severity = options.severity ?? 'medium';
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.metadata = options.metadata;
    this.timestamp = Date.now();
    this.isRetryable = options.isRetryable ?? this.determineRetryable();
  }

  private determineRetryable(): boolean {
    const retryableCategories: ErrorCategory[] = [
      'network',
      'timeout',
      'rate_limit',
      'server',
    ];
    return retryableCategories.includes(this.category);
  }

  /**
   * Convert to plain object for serialization.
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      category: this.category,
      severity: this.severity,
      code: this.code,
      statusCode: this.statusCode,
      metadata: this.metadata,
      timestamp: this.timestamp,
      isRetryable: this.isRetryable,
      stack: this.stack,
    };
  }
}

/**
 * Network-related error.
 */
export class NetworkError extends AppError {
  constructor(
    message: string,
    options: Omit<ConstructorParameters<typeof AppError>[1], 'category'> = {}
  ) {
    super(message, { ...options, category: 'network' });
    this.name = 'NetworkError';
  }
}

/**
 * Validation error with field-level details.
 */
export class ValidationError extends AppError {
  readonly fields: Record<string, string[]>;

  constructor(
    message: string,
    fields: Record<string, string[]> = {},
    options: Omit<
      ConstructorParameters<typeof AppError>[1],
      'category' | 'isRetryable'
    > = {}
  ) {
    super(message, { ...options, category: 'validation', isRetryable: false });
    this.name = 'ValidationError';
    this.fields = fields;
  }

  /**
   * Get all error messages as flat array.
   */
  getAllMessages(): string[] {
    return Object.values(this.fields).flat();
  }

  /**
   * Get error messages for a specific field.
   */
  getFieldErrors(field: string): string[] {
    return this.fields[field] ?? [];
  }
}

/**
 * Authentication error.
 */
export class AuthenticationError extends AppError {
  constructor(
    message = 'Authentication required',
    options: Omit<
      ConstructorParameters<typeof AppError>[1],
      'category' | 'statusCode' | 'isRetryable'
    > = {}
  ) {
    super(message, {
      ...options,
      category: 'authentication',
      statusCode: 401,
      isRetryable: false,
    });
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error.
 */
export class AuthorizationError extends AppError {
  constructor(
    message = 'Access denied',
    options: Omit<
      ConstructorParameters<typeof AppError>[1],
      'category' | 'statusCode' | 'isRetryable'
    > = {}
  ) {
    super(message, {
      ...options,
      category: 'authorization',
      statusCode: 403,
      isRetryable: false,
    });
    this.name = 'AuthorizationError';
  }
}

/**
 * Not found error.
 */
export class NotFoundError extends AppError {
  readonly resource?: string;

  constructor(
    message = 'Resource not found',
    resource?: string,
    options: Omit<
      ConstructorParameters<typeof AppError>[1],
      'category' | 'statusCode' | 'isRetryable'
    > = {}
  ) {
    super(message, {
      ...options,
      category: 'not_found',
      statusCode: 404,
      isRetryable: false,
    });
    this.name = 'NotFoundError';
    this.resource = resource;
  }
}

/**
 * Rate limit error.
 */
export class RateLimitError extends AppError {
  readonly retryAfterMs?: number;

  constructor(
    message = 'Rate limit exceeded',
    retryAfterMs?: number,
    options: Omit<
      ConstructorParameters<typeof AppError>[1],
      'category' | 'statusCode'
    > = {}
  ) {
    super(message, {
      ...options,
      category: 'rate_limit',
      statusCode: 429,
      isRetryable: true,
    });
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Timeout error.
 */
export class TimeoutError extends AppError {
  readonly timeoutMs: number;

  constructor(
    message: string,
    timeoutMs: number,
    options: Omit<ConstructorParameters<typeof AppError>[1], 'category'> = {}
  ) {
    super(message, { ...options, category: 'timeout', isRetryable: true });
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Conflict error (e.g., resource already exists).
 */
export class ConflictError extends AppError {
  constructor(
    message = 'Resource conflict',
    options: Omit<
      ConstructorParameters<typeof AppError>[1],
      'category' | 'statusCode' | 'isRetryable'
    > = {}
  ) {
    super(message, {
      ...options,
      category: 'conflict',
      statusCode: 409,
      isRetryable: false,
    });
    this.name = 'ConflictError';
  }
}

// =============================================================================
// Error Normalization
// =============================================================================

/**
 * Normalize any error into an AppError instance.
 *
 * @param error - Any error value
 * @returns Normalized AppError
 *
 * @example
 * ```ts
 * try {
 *   await fetchData();
 * } catch (error) {
 *   const appError = normalizeError(error);
 *   console.log(appError.category, appError.message);
 * }
 * ```
 */
export function normalizeError(error: unknown): AppError {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }

  // Standard Error
  if (error instanceof Error) {
    return fromError(error);
  }

  // String
  if (typeof error === 'string') {
    return new AppError(error);
  }

  // Object with message
  if (
    error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return fromErrorObject(error as { message: string; [key: string]: unknown });
  }

  // Unknown
  return new AppError('An unknown error occurred', {
    metadata: { originalError: String(error) },
  });
}

/**
 * Convert standard Error to AppError.
 */
function fromError(error: Error): AppError {
  const category = categorizeError(error);
  const severity = determineSeverity(category, error);

  return new AppError(error.message, {
    category,
    severity,
    cause: error,
    metadata: {
      originalName: error.name,
      originalStack: error.stack,
    },
  });
}

/**
 * Convert error-like object to AppError.
 */
function fromErrorObject(obj: {
  message: string;
  [key: string]: unknown;
}): AppError {
  const category = (obj.category as ErrorCategory) ?? categorizeByStatusCode(obj);
  const statusCode =
    typeof obj.statusCode === 'number'
      ? obj.statusCode
      : typeof obj.status === 'number'
        ? obj.status
        : undefined;

  return new AppError(obj.message, {
    category,
    statusCode,
    code: typeof obj.code === 'string' ? obj.code : undefined,
    metadata: obj,
  });
}

/**
 * Categorize error based on message and type.
 */
function categorizeError(error: Error): ErrorCategory {
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  // Network errors
  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('econnrefused') ||
    message.includes('enotfound') ||
    name === 'networkerror' ||
    name === 'typeerror' // fetch throws TypeError on network failure
  ) {
    return 'network';
  }

  // Timeout errors
  if (message.includes('timeout') || message.includes('timed out')) {
    return 'timeout';
  }

  // Abort errors
  if (message.includes('abort') || name === 'aborterror') {
    return 'client';
  }

  return 'unknown';
}

/**
 * Categorize by HTTP status code.
 */
function categorizeByStatusCode(obj: Record<string, unknown>): ErrorCategory {
  const status =
    typeof obj.statusCode === 'number'
      ? obj.statusCode
      : typeof obj.status === 'number'
        ? obj.status
        : 0;

  if (status === 400) return 'validation';
  if (status === 401) return 'authentication';
  if (status === 403) return 'authorization';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 429) return 'rate_limit';
  if (status >= 500) return 'server';
  if (status >= 400) return 'client';

  return 'unknown';
}

/**
 * Determine error severity.
 */
function determineSeverity(
  category: ErrorCategory,
  error: Error
): ErrorSeverity {
  // Critical errors
  if (category === 'server' && error.message.toLowerCase().includes('critical')) {
    return 'critical';
  }

  // High severity
  if (category === 'authentication' || category === 'server') {
    return 'high';
  }

  // Medium severity
  if (
    category === 'network' ||
    category === 'timeout' ||
    category === 'authorization'
  ) {
    return 'medium';
  }

  // Low severity
  if (category === 'validation' || category === 'not_found') {
    return 'low';
  }

  return 'medium';
}

// =============================================================================
// Error Checking Utilities
// =============================================================================

/**
 * Check if error is retryable based on category and properties.
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.isRetryable;
  }

  const normalized = normalizeError(error);
  return normalized.isRetryable;
}

/**
 * Check if error is a specific category.
 */
export function isErrorCategory(
  error: unknown,
  category: ErrorCategory
): boolean {
  if (error instanceof AppError) {
    return error.category === category;
  }

  const normalized = normalizeError(error);
  return normalized.category === category;
}

/**
 * Check if error is a network error.
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return (
    error instanceof NetworkError ||
    isErrorCategory(error, 'network')
  );
}

/**
 * Check if error is a validation error.
 */
export function isValidationError(error: unknown): error is ValidationError {
  return (
    error instanceof ValidationError ||
    isErrorCategory(error, 'validation')
  );
}

/**
 * Check if error is an authentication error.
 */
export function isAuthenticationError(
  error: unknown
): error is AuthenticationError {
  return (
    error instanceof AuthenticationError ||
    isErrorCategory(error, 'authentication')
  );
}

/**
 * Check if error is a timeout error.
 */
export function isTimeoutError(error: unknown): error is TimeoutError {
  return (
    error instanceof TimeoutError ||
    isErrorCategory(error, 'timeout')
  );
}

// =============================================================================
// Error Creation Helpers
// =============================================================================

/**
 * Create error from HTTP response.
 *
 * @param response - HTTP response object
 * @param body - Parsed response body
 * @returns Appropriate AppError subclass
 */
export function fromHttpResponse(
  response: { status: number; statusText: string },
  body?: { message?: string; error?: string; errors?: Record<string, string[]> }
): AppError {
  const message =
    body?.message ??
    body?.error ??
    response.statusText ??
    `HTTP ${response.status}`;

  switch (response.status) {
    case 400:
      return new ValidationError(message, body?.errors ?? {}, {
        statusCode: 400,
      });
    case 401:
      return new AuthenticationError(message);
    case 403:
      return new AuthorizationError(message);
    case 404:
      return new NotFoundError(message);
    case 409:
      return new ConflictError(message);
    case 429:
      return new RateLimitError(message);
    default:
      if (response.status >= 500) {
        return new AppError(message, {
          category: 'server',
          statusCode: response.status,
          severity: 'high',
        });
      }
      return new AppError(message, {
        category: 'client',
        statusCode: response.status,
      });
  }
}

// =============================================================================
// Error Handling Patterns
// =============================================================================

/**
 * Result type for operations that can fail.
 */
export type Result<T, E = AppError> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Create a success result.
 */
export function success<T>(data: T): Result<T, never> {
  return { success: true, data };
}

/**
 * Create a failure result.
 */
export function failure<E>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Wrap an async function to return Result instead of throwing.
 *
 * @example
 * ```ts
 * const result = await tryCatch(() => fetchData());
 * if (result.success) {
 *   console.log(result.data);
 * } else {
 *   console.error(result.error.message);
 * }
 * ```
 */
export async function tryCatch<T>(
  fn: () => Promise<T>
): Promise<Result<T, AppError>> {
  try {
    const data = await fn();
    return success(data);
  } catch (error) {
    return failure(normalizeError(error));
  }
}

/**
 * Sync version of tryCatch.
 */
export function tryCatchSync<T>(fn: () => T): Result<T, AppError> {
  try {
    const data = fn();
    return success(data);
  } catch (error) {
    return failure(normalizeError(error));
  }
}

/**
 * Unwrap a Result, throwing if it's a failure.
 */
export function unwrap<T>(result: Result<T>): T {
  if (result.success) {
    return result.data;
  }
  throw result.error;
}

/**
 * Unwrap a Result with a default value for failures.
 */
export function unwrapOr<T>(result: Result<T>, defaultValue: T): T {
  if (result.success) {
    return result.data;
  }
  return defaultValue;
}

/**
 * Map over a successful Result.
 */
export function mapResult<T, U>(
  result: Result<T>,
  fn: (data: T) => U
): Result<U> {
  if (result.success) {
    return success(fn(result.data));
  }
  return result;
}

/**
 * Flat map over a successful Result.
 */
export function flatMapResult<T, U>(
  result: Result<T>,
  fn: (data: T) => Result<U>
): Result<U> {
  if (result.success) {
    return fn(result.data);
  }
  return result;
}
