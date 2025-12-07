/**
 * API Error Types and Handling Utilities
 *
 * @module @missionfabric-js/enzyme-typescript/api/error
 * @description Type-safe error handling utilities for API operations
 *
 * @example
 * ```typescript
 * import { ApiError, isApiError, handleApiError } from '@missionfabric-js/enzyme-typescript/api';
 *
 * try {
 *   const response = await fetch('/api/users');
 *   if (!response.ok) {
 *     throw await ApiError.fromResponse(response);
 *   }
 * } catch (error) {
 *   if (isApiError(error)) {
 *     console.error(`API Error: ${error.message}`, error.details);
 *   }
 * }
 * ```
 */

/**
 * HTTP status code categories
 */
export enum ErrorCategory {
  /** Client errors (4xx) */
  CLIENT = 'CLIENT',
  /** Server errors (5xx) */
  SERVER = 'SERVER',
  /** Network errors */
  NETWORK = 'NETWORK',
  /** Timeout errors */
  TIMEOUT = 'TIMEOUT',
  /** Validation errors */
  VALIDATION = 'VALIDATION',
  /** Authentication errors */
  AUTH = 'AUTH',
  /** Unknown errors */
  UNKNOWN = 'UNKNOWN',
}

/**
 * API error details interface
 */
export interface ApiErrorDetails {
  /** HTTP status code */
  status?: number;
  /** HTTP status text */
  statusText?: string;
  /** Error category */
  category: ErrorCategory;
  /** Request URL */
  url?: string;
  /** Request method */
  method?: string;
  /** Response headers */
  headers?: Record<string, string>;
  /** Error code from API */
  code?: string;
  /** Additional error data */
  data?: unknown;
  /** Original error */
  cause?: Error;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Validation error details
 */
export interface ValidationError {
  /** Field name */
  field: string;
  /** Error message */
  message: string;
  /** Validation rule that failed */
  rule?: string;
  /** Expected value or format */
  expected?: unknown;
  /** Actual value received */
  actual?: unknown;
}

/**
 * API Error class with enhanced details
 *
 * @example
 * ```typescript
 * throw new ApiError(
 *   'Failed to fetch user',
 *   {
 *     status: 404,
 *     category: ErrorCategory.CLIENT,
 *     url: '/api/users/123',
 *     method: 'GET'
 *   }
 * );
 * ```
 */
export class ApiError extends Error {
  public readonly details: ApiErrorDetails;
  public readonly name = 'ApiError';

  constructor(message: string, details: Omit<ApiErrorDetails, 'timestamp'>) {
    super(message);
    this.details = {
      ...details,
      timestamp: new Date(),
    };

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }

    // Set the prototype explicitly
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  /**
   * Create ApiError from fetch Response
   */
  static async fromResponse(
    response: Response,
    options?: { method?: string; cause?: Error }
  ): Promise<ApiError> {
    const { method, cause } = options || {};
    let errorData: unknown;
    let errorMessage = response.statusText || 'Request failed';

    try {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        errorData = await response.json();
        if (typeof errorData === 'object' && errorData !== null) {
          const data = errorData as Record<string, unknown>;
          errorMessage = (data.message as string) || (data.error as string) || errorMessage;
        }
      } else {
        errorData = await response.text();
        if (typeof errorData === 'string' && errorData.length < 200) {
          errorMessage = errorData;
        }
      }
    } catch {
      // Ignore parsing errors
    }

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return new ApiError(errorMessage, {
      status: response.status,
      statusText: response.statusText,
      category: categorizeStatusCode(response.status),
      url: response.url,
      method,
      headers,
      data: errorData,
      cause,
    });
  }

  /**
   * Create network error
   */
  static network(url: string, cause?: Error): ApiError {
    return new ApiError('Network request failed', {
      category: ErrorCategory.NETWORK,
      url,
      cause,
    });
  }

  /**
   * Create timeout error
   */
  static timeout(url: string, timeoutMs: number): ApiError {
    return new ApiError(`Request timeout after ${timeoutMs}ms`, {
      category: ErrorCategory.TIMEOUT,
      url,
    });
  }

  /**
   * Create validation error
   */
  static validation(
    message: string,
    errors: ValidationError[],
    url?: string
  ): ApiError {
    return new ApiError(message, {
      category: ErrorCategory.VALIDATION,
      url,
      data: { errors },
    });
  }

  /**
   * Check if error is retryable
   */
  isRetryable(): boolean {
    const { status, category } = this.details;

    // Network and timeout errors are retryable
    if (category === ErrorCategory.NETWORK || category === ErrorCategory.TIMEOUT) {
      return true;
    }

    // Certain server errors are retryable
    if (status) {
      return status === 408 || status === 429 || status === 503 || status === 504;
    }

    return false;
  }

  /**
   * Check if error is authentication related
   */
  isAuthError(): boolean {
    const { status, category } = this.details;
    return category === ErrorCategory.AUTH || status === 401 || status === 403;
  }

  /**
   * Get validation errors
   */
  getValidationErrors(): ValidationError[] | undefined {
    if (this.details.category === ErrorCategory.VALIDATION) {
      const data = this.details.data as { errors?: ValidationError[] };
      return data?.errors;
    }
    return undefined;
  }

  /**
   * Convert to JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      details: {
        ...this.details,
        timestamp: this.details.timestamp.toISOString(),
      },
      stack: this.stack,
    };
  }
}

/**
 * Categorize HTTP status code
 */
function categorizeStatusCode(status: number): ErrorCategory {
  if (status === 401 || status === 403) {
    return ErrorCategory.AUTH;
  }
  if (status === 422 || status === 400) {
    return ErrorCategory.VALIDATION;
  }
  if (status >= 400 && status < 500) {
    return ErrorCategory.CLIENT;
  }
  if (status >= 500) {
    return ErrorCategory.SERVER;
  }
  return ErrorCategory.UNKNOWN;
}

/**
 * Type guard for ApiError
 *
 * @example
 * ```typescript
 * if (isApiError(error)) {
 *   console.log(error.details.status);
 * }
 * ```
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Error handler function type
 */
export type ErrorHandler<T = unknown> = (error: ApiError) => T | Promise<T>;

/**
 * Error handler configuration
 */
export interface ErrorHandlerConfig<T = unknown> {
  /** Handler for client errors */
  onClientError?: ErrorHandler<T>;
  /** Handler for server errors */
  onServerError?: ErrorHandler<T>;
  /** Handler for network errors */
  onNetworkError?: ErrorHandler<T>;
  /** Handler for timeout errors */
  onTimeoutError?: ErrorHandler<T>;
  /** Handler for authentication errors */
  onAuthError?: ErrorHandler<T>;
  /** Handler for validation errors */
  onValidationError?: ErrorHandler<T>;
  /** Default handler for all other errors */
  onError?: ErrorHandler<T>;
}

/**
 * Handle API error with categorized handlers
 *
 * @example
 * ```typescript
 * const result = await handleApiError(error, {
 *   onAuthError: async (err) => {
 *     await refreshToken();
 *     return retryRequest();
 *   },
 *   onValidationError: (err) => {
 *     showValidationErrors(err.getValidationErrors());
 *   },
 *   onError: (err) => {
 *     showErrorNotification(err.message);
 *   }
 * });
 * ```
 */
export async function handleApiError<T = unknown>(
  error: unknown,
  handlers: ErrorHandlerConfig<T>
): Promise<T | undefined> {
  if (!isApiError(error)) {
    return handlers.onError?.(
      new ApiError('Unknown error occurred', {
        category: ErrorCategory.UNKNOWN,
        cause: error instanceof Error ? error : undefined,
      })
    );
  }

  const { category } = error.details;

  if (error.isAuthError() && handlers.onAuthError) {
    return handlers.onAuthError(error);
  }

  switch (category) {
    case ErrorCategory.CLIENT:
      return handlers.onClientError?.(error) ?? handlers.onError?.(error);
    case ErrorCategory.SERVER:
      return handlers.onServerError?.(error) ?? handlers.onError?.(error);
    case ErrorCategory.NETWORK:
      return handlers.onNetworkError?.(error) ?? handlers.onError?.(error);
    case ErrorCategory.TIMEOUT:
      return handlers.onTimeoutError?.(error) ?? handlers.onError?.(error);
    case ErrorCategory.VALIDATION:
      return handlers.onValidationError?.(error) ?? handlers.onError?.(error);
    default:
      return handlers.onError?.(error);
  }
}

/**
 * Aggregate multiple errors
 *
 * @example
 * ```typescript
 * const results = await Promise.allSettled(requests);
 * const errors = results
 *   .filter(r => r.status === 'rejected')
 *   .map(r => r.reason);
 *
 * if (errors.length > 0) {
 *   throw new AggregateApiError('Multiple requests failed', errors);
 * }
 * ```
 */
export class AggregateApiError extends Error {
  public readonly errors: ApiError[];
  public readonly name = 'AggregateApiError';

  constructor(message: string, errors: unknown[]) {
    super(message);
    this.errors = errors.filter(isApiError);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AggregateApiError);
    }

    Object.setPrototypeOf(this, AggregateApiError.prototype);
  }

  /**
   * Get errors by category
   */
  getErrorsByCategory(category: ErrorCategory): ApiError[] {
    return this.errors.filter((error) => error.details.category === category);
  }

  /**
   * Check if any error is retryable
   */
  hasRetryableErrors(): boolean {
    return this.errors.some((error) => error.isRetryable());
  }

  /**
   * Convert to JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      errors: this.errors.map((error) => error.toJSON()),
    };
  }
}

/**
 * Type guard for AggregateApiError
 */
export function isAggregateApiError(error: unknown): error is AggregateApiError {
  return error instanceof AggregateApiError;
}
