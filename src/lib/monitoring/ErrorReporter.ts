/**
 * @file Error Reporter
 * @description Sends errors to external monitoring services (Sentry/Datadog/etc.)
 */

import type {
  AppError,
  ErrorContext,
  ErrorReport,
} from './errorTypes';
import { normalizeError } from './errorTypes';
import { isDebugModeEnabled, isDevelopmentEnv } from '../flags/debugMode';

/**
 * Error reporter configuration
 */
export interface ErrorReporterConfig {
  enabled: boolean;
  dsn?: string;
  environment: string;
  version: string;
  sampleRate?: number;
  beforeSend?: (report: ErrorReport) => ErrorReport | null;
  ignoredErrors?: (string | RegExp)[];
}

/**
 * Default reporter configuration
 * Note: 'enabled' uses isDevelopmentEnv() inverse for production detection
 * since error reporting should always be on in production
 */
const defaultConfig: ErrorReporterConfig = {
  enabled: !isDevelopmentEnv(),
  environment: (process.env['NODE_ENV'] !== undefined && process.env['NODE_ENV'] !== null && process.env['NODE_ENV'] !== '') ? process.env['NODE_ENV'] : 'development',
  version: '1.0.0',
  sampleRate: 1.0,
  ignoredErrors: [
    'ResizeObserver loop limit exceeded',
    'Network request failed',
    /^Loading chunk .* failed/,
  ],
};

/**
 * Error reporter state
 */
let config: ErrorReporterConfig = defaultConfig;
let currentContext: ErrorContext = {};
let errorQueue: ErrorReport[] = [];
let isInitialized = false;

/**
 * Initialize the error reporter
 */
export function initErrorReporter(options: Partial<ErrorReporterConfig> = {}): void {
  config = { ...defaultConfig, ...options };
  isInitialized = true;
  
  // Set up global error handlers
  if (typeof window !== 'undefined') {
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
  }
  
  // Flush any queued errors
  flushErrorQueue();
}

/**
 * Set the user context for error reports
 */
export function setUserContext(userId?: string, sessionId?: string): void {
  currentContext = {
    ...currentContext,
    ...(userId !== undefined && { userId }),
    ...(sessionId !== undefined && { sessionId }),
  };
}

/**
 * Set additional context for error reports
 */
export function setErrorContext(context: Partial<ErrorContext>): void {
  currentContext = { ...currentContext, ...context };
}

/**
 * Clear error context
 */
export function clearErrorContext(): void {
  currentContext = {};
}

/**
 * Report an error
 */
export function reportError(
  error: unknown,
  context?: Partial<ErrorContext>
): void {
  const appError = normalizeError(error);
  
  // Check if error should be ignored
  if (shouldIgnoreError(appError)) {
    return;
  }
  
  const report = createErrorReport(appError, context);
  
  // Apply beforeSend hook
  const finalReport = config.beforeSend ? config.beforeSend(report) : report;
  if (!finalReport) {
    return;
  }
  
  // Apply sample rate
  if (config.sampleRate && Math.random() > config.sampleRate) {
    return;
  }
  
  if (isInitialized && config.enabled) {
    sendErrorReport(finalReport);
  } else {
    // Queue error for later
    errorQueue.push(finalReport);
  }
  
  // Log when debug mode is enabled
  if (isDebugModeEnabled()) {
    console.error('[Error Reporter]', appError.message, appError);
  }
}

/**
 * Report a warning (lower severity)
 */
export function reportWarning(
  message: string,
  context?: Partial<ErrorContext>
): void {
  const appError: AppError = {
    id: `warn_${Date.now()}`,
    message,
    category: 'client',
    severity: 'low',
    timestamp: new Date().toISOString(),
  };
  
  const report = createErrorReport(appError, context);

  if (isDebugModeEnabled()) {
    console.warn('[Warning]', message, context);
  }
  
  if (isInitialized && config.enabled) {
    sendErrorReport(report);
  }
}

/**
 * Report an info event
 */
export function reportInfo(
  message: string,
  metadata?: Record<string, unknown>
): void {
  if (isDebugModeEnabled()) {
    console.info('[Info]', message, metadata);
  }
  
  // Send as breadcrumb in production
  addBreadcrumb('info', message, metadata);
}

/**
 * Add a breadcrumb for error context
 */
export function addBreadcrumb(
  type: string,
  message: string,
  data?: Record<string, unknown>
): void {
  // In production, this would add to Sentry/Datadog breadcrumbs
  // Log to console when debug mode is enabled
  if (isDebugModeEnabled()) {
    console.debug('[Breadcrumb]', type, message, data);
  }
}

/**
 * Create error report from app error
 */
function createErrorReport(
  appError: AppError,
  context?: Partial<ErrorContext>
): ErrorReport {
  const route = typeof window !== 'undefined' ? window.location.pathname : undefined;
  
  return {
    ...appError,
    context: {
      ...currentContext,
      ...context,
      ...(route !== undefined && { route }),
    },
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    environment: config.environment,
    version: config.version,
  };
}

/**
 * Send error report to external service
 *
 * Note: This function intentionally uses raw fetch() rather than apiClient because:
 * 1. Error reporting must be independent to avoid circular dependencies
 * 2. Reporting endpoints are typically third-party services (Sentry, Datadog)
 * 3. Must work even when apiClient itself encounters errors
 *
 * @see {@link @/lib/api/api-client} for application API calls
 */
async function sendErrorReport(report: ErrorReport): Promise<void> {
  try {
    // In a real implementation, this would send to Sentry/Datadog
    // For now, we'll use a generic endpoint
    if (config.dsn) {
      // Raw fetch is intentional - error reporting must be independent
      await fetch(config.dsn, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });
    }
  } catch (error) {
    // Fail silently to avoid infinite loops
    console.error('[ErrorReporter] Failed to send error report', error);
  }
}

/**
 * Handle global error events
 */
function handleGlobalError(event: ErrorEvent): void {
  reportError(event.error || event.message, {
    action: 'global_error',
    metadata: {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    },
  });
}

/**
 * Handle unhandled promise rejections
 */
function handleUnhandledRejection(event: PromiseRejectionEvent): void {
  reportError(event.reason, {
    action: 'unhandled_rejection',
  });
}

/**
 * Check if error should be ignored
 */
function shouldIgnoreError(error: AppError): boolean {
  if (!config.ignoredErrors) return false;
  
  return config.ignoredErrors.some((pattern) => {
    if (typeof pattern === 'string') {
      return error.message.includes(pattern);
    }
    return pattern.test(error.message);
  });
}

/**
 * Flush queued errors
 */
function flushErrorQueue(): void {
  if (!config.enabled) return;
  
  errorQueue.forEach((report) => {
    sendErrorReport(report);
  });
  errorQueue = [];
}

/**
 * Export error reporter as singleton object
 */
export const ErrorReporter = {
  init: initErrorReporter,
  setUserContext,
  setErrorContext,
  clearErrorContext,
  reportError,
  reportWarning,
  reportInfo,
  addBreadcrumb,
};
