/**
 * @file Error Types
 * @description Normalized error category definitions
 */

/**
 * Error severity levels
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Error categories for classification
 */
export type ErrorCategory =
  | 'network'
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'server'
  | 'client'
  | 'timeout'
  | 'rate_limit'
  | 'unknown';

/**
 * Normalized application error
 */
export interface AppError {
  id: string;
  message: string;
  code?: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  timestamp: string;
  stack?: string;
  context?: Record<string, unknown>;
  originalError?: unknown;
}

/**
 * Error context for reporting
 */
export interface ErrorContext extends Record<string, unknown> {
  userId?: string;
  sessionId?: string;
  route?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Error report for external services
 */
export interface ErrorReport extends AppError {
  context: ErrorContext;
  userAgent: string;
  url: string;
  environment: string;
  version: string;
}

/**
 * Network error specific details
 */
export interface NetworkErrorDetails {
  status?: number;
  statusText?: string;
  url?: string;
  method?: string;
  responseBody?: unknown;
}

/**
 * Validation error specific details
 */
export interface ValidationErrorDetails {
  field: string;
  constraint: string;
  value?: unknown;
}

/**
 * Determine error category from error object
 */
export function categorizeError(error: unknown): ErrorCategory {
  if (error === null || error === undefined) return 'unknown';
  
  if (error instanceof TypeError) {
    return 'client';
  }
  
  if (typeof error === 'object' && 'status' in error) {
    const {status} = (error as { status: number });
    
    if (status === 401) return 'authentication';
    if (status === 403) return 'authorization';
    if (status === 422 || status === 400) return 'validation';
    if (status === 408) return 'timeout';
    if (status === 429) return 'rate_limit';
    if (status >= 500) return 'server';
    if (status >= 400) return 'client';
  }
  
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('network') || message.includes('fetch')) {
      return 'network';
    }
    if (message.includes('timeout')) {
      return 'timeout';
    }
  }
  
  return 'unknown';
}

/**
 * Determine error severity from category
 */
export function getSeverity(category: ErrorCategory): ErrorSeverity {
  switch (category) {
    case 'server':
    case 'authentication':
      return 'high';
    case 'authorization':
    case 'rate_limit':
      return 'medium';
    case 'validation':
    case 'client':
    case 'timeout':
      return 'low';
    case 'network':
    case 'unknown':
    default:
      return 'medium';
  }
}

/**
 * Create normalized error from any error type
 */
export function normalizeError(
  error: unknown,
  context?: Partial<AppError>
): AppError {
  const category = categorizeError(error);
  const severity = getSeverity(category);
  
  let message = 'An unexpected error occurred';
  let stack: string | undefined;
  
  if (error instanceof Error) {
    message = error.message;
    stack = error.stack;
  } else if (typeof error === 'string') {
    message = error;
  } else if (typeof error === 'object' && error !== null) {
    if ('message' in error) {
      message = String((error as { message: unknown }).message);
    }
  }
  
  return {
    id: generateErrorId(),
    message,
    category,
    severity,
    timestamp: new Date().toISOString(),
    stack,
    originalError: error,
    ...context,
  };
}

/**
 * Generate unique error ID
 */
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: AppError): boolean {
  return ['network', 'timeout', 'rate_limit', 'server'].includes(error.category);
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: AppError): string {
  switch (error.category) {
    case 'network':
      return 'Unable to connect. Please check your internet connection.';
    case 'authentication':
      return 'Your session has expired. Please log in again.';
    case 'authorization':
      return 'You do not have permission to perform this action.';
    case 'validation':
      return 'Please check your input and try again.';
    case 'timeout':
      return 'The request timed out. Please try again.';
    case 'rate_limit':
      return 'Too many requests. Please wait a moment and try again.';
    case 'server':
      return 'Something went wrong on our end. Please try again later.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}
