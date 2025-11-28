/**
 * @file Error Normalizer
 * @description Error normalization utilities for converting various error formats
 * into consistent ApiError objects with proper categorization and metadata.
 */

import type {
  ApiError,
  ErrorCategory,
  ErrorSeverity,
  FieldError,
  ServerErrorResponse,
} from './types';

/**
 * Error normalization configuration
 */
export interface ErrorNormalizationConfig {
  /** Map custom error codes to categories */
  codeMapping?: Record<string, ErrorCategory>;
  /** Extract field errors from response */
  extractFieldErrors?: (response: unknown) => FieldError[] | undefined;
  /** Custom message generator */
  generateMessage?: (status: number, response: unknown) => string;
  /** Include response body in error */
  includeResponseBody?: boolean;
}

/**
 * Default error code to category mapping
 */
const DEFAULT_CODE_MAPPING: Record<string, ErrorCategory> = {
  UNAUTHENTICATED: 'authentication',
  UNAUTHORIZED: 'authorization',
  FORBIDDEN: 'authorization',
  NOT_FOUND: 'not_found',
  CONFLICT: 'conflict',
  VALIDATION_ERROR: 'validation',
  INVALID_INPUT: 'validation',
  RATE_LIMITED: 'rate_limit',
  TIMEOUT: 'timeout',
  INTERNAL_ERROR: 'server',
  SERVICE_UNAVAILABLE: 'server',
};

/**
 * Normalize various error formats into a consistent ApiError
 *
 * @param error - Error from API or network
 * @param config - Normalization configuration
 * @returns Normalized ApiError
 *
 * @example
 * ```typescript
 * try {
 *   await apiClient.get('/users');
 * } catch (error) {
 *   const normalizedError = normalizeError(error);
 *   console.log(normalizedError.category); // 'authentication', 'validation', etc.
 *   console.log(normalizedError.fieldErrors); // Field-level errors
 * }
 * ```
 */
export function normalizeError(
  error: unknown,
  config: ErrorNormalizationConfig = {}
): ApiError {
  // Already an ApiError
  if (isApiError(error)) {
    return error;
  }

  // Network error
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return createNetworkError(error.message, error);
  }

  // Abort error
  if (error instanceof DOMException && error.name === 'AbortError') {
    return createAbortError();
  }

  // HTTP error response
  if (isErrorResponse(error)) {
    return normalizeHttpError(error, config);
  }

  // Generic Error
  if (error instanceof Error) {
    return createUnknownError(error.message, error);
  }

  // String error
  if (typeof error === 'string') {
    return createUnknownError(error);
  }

  // Fallback
  return createUnknownError('An unexpected error occurred');
}

/**
 * Normalize HTTP error response
 */
function normalizeHttpError(
  error: { status: number; response?: unknown; message?: string },
  config: ErrorNormalizationConfig
): ApiError {
  const { status, response, message: errorMessage } = error;
  const category = getErrorCategory(status);
  const severity = getErrorSeverity(category);

  let message = errorMessage ?? `HTTP ${status}`;
  let code = `HTTP_${status}`;
  let fieldErrors: FieldError[] | undefined;

  // Parse response body
  if (response !== null && response !== undefined && typeof response === 'object') {
    const serverError = response as ServerErrorResponse;

    // Extract message
    if (serverError.message != null && serverError.message !== '') {
      ({ message } = serverError);
    } else if (serverError.error) {
      message =
        typeof serverError.error === 'string'
          ? serverError.error
          : serverError.error.message ?? message;
    }

    // Extract code
    if (serverError.code) {
      code = serverError.code;
    } else if (
      serverError.error &&
      typeof serverError.error === 'object' &&
      serverError.error.code
    ) {
      code = serverError.error.code;
    }

    // Extract field errors
    if (config.extractFieldErrors) {
      fieldErrors = config.extractFieldErrors(response);
    } else if (serverError.errors && Array.isArray(serverError.errors)) {
      fieldErrors = serverError.errors.map((e) => ({
        field: e.field,
        message: e.message,
      }));
    }

    // Custom message generation
    if (config.generateMessage) {
      message = config.generateMessage(status, response);
    }
  }

  // Map code to category
  const codeMapping = { ...DEFAULT_CODE_MAPPING, ...config.codeMapping };
  const mappedCategory = codeMapping[code] ?? category;

  return createApiError({
    status,
    code,
    message,
    category: mappedCategory,
    severity,
    fieldErrors,
    response: config.includeResponseBody ? response : undefined,
    retryable: isRetryableStatus(status),
  });
}

/**
 * Get error category from HTTP status
 */
function getErrorCategory(status: number): ErrorCategory {
  if (status === 401) return 'authentication';
  if (status === 403) return 'authorization';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 422 || status === 400) return 'validation';
  if (status === 429) return 'rate_limit';
  if (status === 408) return 'timeout';
  if (status >= 500) return 'server';
  return 'unknown';
}

/**
 * Get error severity from category
 */
function getErrorSeverity(category: ErrorCategory): ErrorSeverity {
  switch (category) {
    case 'authentication':
    case 'authorization':
    case 'server':
      return 'error';
    case 'validation':
    case 'conflict':
    case 'not_found':
      return 'warning';
    case 'rate_limit':
    case 'timeout':
      return 'info';
    default:
      return 'error';
  }
}

/**
 * Check if status is retryable
 */
function isRetryableStatus(status: number): boolean {
  return [408, 429, 500, 502, 503, 504].includes(status);
}

/**
 * Type guard for API errors
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'name' in error &&
    (error as ApiError).name === 'ApiError'
  );
}

/**
 * Type guard for error responses
 */
function isErrorResponse(
  error: unknown
): error is { status: number; response?: unknown; message?: string } {
  return (
    error !== null &&
    typeof error === 'object' &&
    'status' in error &&
    typeof (error as { status: unknown }).status === 'number'
  );
}

/**
 * Create API error factory functions
 */
function createApiError(params: {
  status: number;
  code: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  fieldErrors?: FieldError[];
  response?: unknown;
  cause?: Error;
  retryable: boolean;
}): ApiError {
  const error = new Error(params.message) as ApiError;
  error.name = 'ApiError';
  error.status = params.status;
  error.code = params.code;
  error.message = params.message;
  error.category = params.category;
  error.severity = params.severity;
  error.fieldErrors = params.fieldErrors;
  error.response = params.response;
  error.cause = params.cause;
  error.retryable = params.retryable;
  error.timestamp = Date.now();
  return error;
}

function createNetworkError(message: string, cause?: Error): ApiError {
  return createApiError({
    status: 0,
    code: 'NETWORK_ERROR',
    message: message ?? 'Network error occurred',
    category: 'network',
    severity: 'error',
    cause,
    retryable: true,
  });
}

function createAbortError(): ApiError {
  return createApiError({
    status: 0,
    code: 'ABORTED',
    message: 'Request was aborted',
    category: 'cancelled',
    severity: 'info',
    retryable: false,
  });
}

function createUnknownError(message: string, cause?: Error): ApiError {
  return createApiError({
    status: 0,
    code: 'UNKNOWN_ERROR',
    message,
    category: 'unknown',
    severity: 'error',
    cause,
    retryable: false,
  });
}
