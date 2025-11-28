/**
 * @file Context-Aware Error Messages
 * @description User-friendly, actionable error messages based on context
 *
 * This module provides structured error messages that are:
 * - Context-aware: Tailored to what the user was trying to do
 * - Actionable: Provides clear suggestions for recovery
 * - User-friendly: Avoids technical jargon for end users
 * - Developer-friendly: Includes technical details in development
 */

import type { AppError, ErrorCategory } from './errorTypes';
import { isDev } from '@/lib/core/config/env-helper';

// ============================================================================
// Types
// ============================================================================

/**
 * Context information for generating error messages
 */
export interface ErrorMessageContext {
  /** What the user was trying to do (e.g., "save your changes") */
  userAction?: string;
  /** Resource being accessed (e.g., "dashboard", "user profile") */
  resource?: string;
  /** Feature name (e.g., "Reports", "Settings") */
  feature?: string;
  /** Additional context metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Structured error message for UI rendering
 */
export interface StructuredErrorMessage {
  /** Main error title for display */
  title: string;
  /** Detailed description explaining what went wrong */
  description: string;
  /** Suggested user actions to recover */
  suggestions: string[];
  /** Technical details (development only) */
  technicalDetails?: string;
  /** Whether the error is recoverable */
  recoverable: boolean;
  /** Suggested wait time before retry (ms) */
  retryAfter?: number;
}

/**
 * Toast notification message
 */
export interface ToastMessage {
  /** Short message for toast display */
  message: string;
  /** Toast type for styling */
  type: 'info' | 'warning' | 'error' | 'success';
  /** Auto-dismiss duration in ms (undefined = manual dismiss) */
  duration?: number;
}

// ============================================================================
// Message Templates
// ============================================================================

interface MessageTemplate {
  title: string;
  description: (ctx?: ErrorMessageContext) => string;
  suggestions: (ctx?: ErrorMessageContext) => string[];
  recoverable: boolean;
  retryAfter?: number;
}

const MESSAGE_TEMPLATES: Record<ErrorCategory, MessageTemplate> = {
  network: {
    title: 'Connection Issue',
    description: (ctx) =>
      (ctx?.userAction !== undefined && ctx?.userAction !== null && ctx?.userAction !== '')
        ? `We couldn't ${ctx.userAction} because of a network issue.`
        : 'Unable to connect to our servers.',
    suggestions: () => [
      'Check your internet connection',
      'Try again in a few moments',
      'If the problem persists, try refreshing the page',
    ],
    recoverable: true,
    retryAfter: 3000,
  },

  authentication: {
    title: 'Session Expired',
    description: () => 'Your session has expired for security reasons.',
    suggestions: () => [
      'Log in again to continue',
      'Your work may have been saved automatically',
    ],
    recoverable: true,
  },

  authorization: {
    title: 'Access Denied',
    description: (ctx) =>
      (ctx?.resource !== undefined && ctx?.resource !== null && ctx?.resource !== '')
        ? `You don't have permission to access ${ctx.resource}.`
        : "You don't have permission to perform this action.",
    suggestions: () => [
      'Contact your administrator for access',
      "Verify you're logged into the correct account",
    ],
    recoverable: false,
  },

  validation: {
    title: 'Invalid Input',
    description: () => 'Please check your input and try again.',
    suggestions: () => [
      'Review the highlighted fields',
      'Ensure all required fields are filled',
      'Check for formatting issues',
    ],
    recoverable: true,
  },

  server: {
    title: 'Server Error',
    description: (ctx) =>
      ctx?.feature
        ? `We're having trouble with ${ctx.feature} right now.`
        : 'Something went wrong on our end.',
    suggestions: () => [
      'Try again in a few moments',
      'Our team has been notified',
      'Check our status page for updates',
    ],
    recoverable: true,
    retryAfter: 5000,
  },

  client: {
    title: 'Application Error',
    description: () => 'Something unexpected happened in the application.',
    suggestions: () => [
      'Refresh the page',
      'Clear your browser cache',
      'Try using a different browser',
    ],
    recoverable: true,
  },

  timeout: {
    title: 'Request Timed Out',
    description: (ctx) =>
      ctx?.userAction
        ? `The request to ${ctx.userAction} took too long.`
        : 'The request took longer than expected.',
    suggestions: () => [
      'Check your internet connection',
      'Try again - the server might be busy',
      'Consider trying later if the problem persists',
    ],
    recoverable: true,
    retryAfter: 2000,
  },

  rate_limit: {
    title: 'Slow Down',
    description: () => "You're making requests too quickly.",
    suggestions: () => [
      'Wait a moment before trying again',
      'Avoid rapid clicking or refreshing',
    ],
    recoverable: true,
    retryAfter: 30000,
  },

  unknown: {
    title: 'Unexpected Error',
    description: () => 'An unexpected error occurred.',
    suggestions: () => [
      'Try again',
      'Refresh the page if the problem continues',
      'Contact support if this keeps happening',
    ],
    recoverable: true,
    retryAfter: 1000,
  },
};

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Generate a structured error message based on error and context
 *
 * @param error - The normalized application error
 * @param context - Optional context about what the user was doing
 * @returns Structured error message for UI rendering
 *
 * @example
 * ```tsx
 * const message = getStructuredErrorMessage(error, {
 *   userAction: 'save your document',
 *   feature: 'Documents'
 * });
 *
 * return (
 *   <ErrorDialog
 *     title={message.title}
 *     description={message.description}
 *     actions={message.suggestions}
 *     recoverable={message.recoverable}
 *   />
 * );
 * ```
 */
export function getStructuredErrorMessage(
  error: AppError,
  context?: ErrorMessageContext
): StructuredErrorMessage {
  const template = MESSAGE_TEMPLATES[error.category];

  const result: StructuredErrorMessage = {
    title: template.title,
    description: template.description(context),
    suggestions: template.suggestions(context),
    recoverable: template.recoverable,
  };

  if (isDev() && error.stack) {
    result.technicalDetails = error.stack;
  }

  if (template.retryAfter !== undefined) {
    result.retryAfter = template.retryAfter;
  }

  return result;
}

/**
 * Get a short toast message for the error
 *
 * @param error - The normalized application error
 * @param context - Optional context
 * @returns String suitable for toast notification
 */
export function getToastMessage(error: AppError, context?: ErrorMessageContext): string {
  const template = MESSAGE_TEMPLATES[error.category];
  return template.description(context);
}

/**
 * Get a structured toast notification
 *
 * @param error - The normalized application error
 * @param context - Optional context
 * @returns Toast message with type and duration
 */
export function getToastNotification(
  error: AppError,
  context?: ErrorMessageContext
): ToastMessage {
  const template = MESSAGE_TEMPLATES[error.category];
  const message = template.description(context);

  // Determine toast type based on severity and recoverability
  let type: ToastMessage['type'] = 'error';
  if (error.severity === 'low') {
    type = 'warning';
  }

  // Auto-dismiss only for recoverable errors with retry suggestions
  const duration = template.recoverable && template.retryAfter ? 5000 : undefined;

  const result: ToastMessage = {
    message,
    type,
  };

  if (duration !== undefined) {
    result.duration = duration;
  }

  return result;
}

/**
 * Get a recovery hint for the error
 *
 * @param error - The normalized application error
 * @returns Recovery hint string or null if not recoverable
 */
export function getRecoveryHint(error: AppError): string | null {
  const template = MESSAGE_TEMPLATES[error.category];

  if (!template.recoverable) {
    return null;
  }

  if (template.retryAfter) {
    const seconds = Math.ceil(template.retryAfter / 1000);
    return `Try again in ${seconds} second${seconds > 1 ? 's' : ''}`;
  }

  return template.suggestions()[0] ?? 'Try again';
}

/**
 * Convert HTTP status code to user-friendly message
 *
 * @param status - HTTP status code
 * @returns User-friendly message describing the status
 */
export function httpStatusToMessage(status: number): string {
  const messages: Record<number, string> = {
    400: 'The request was invalid. Please check your input.',
    401: 'Please log in to continue.',
    403: "You don't have permission to do this.",
    404: 'The requested resource was not found.',
    408: 'The request timed out. Please try again.',
    409: 'There was a conflict. Someone may have made changes.',
    413: 'The file is too large.',
    422: "Please check your input - something doesn't look right.",
    429: 'Too many requests. Please slow down.',
    500: "Something went wrong on our end. We're looking into it.",
    502: "We're having trouble connecting. Please try again.",
    503: 'The service is temporarily unavailable.',
    504: 'The request timed out. Please try again.',
  };

  return messages[status] ?? `An error occurred (${status}).`;
}

/**
 * Create a contextual error message with action and resource
 *
 * @param error - The normalized application error
 * @param action - Action being performed (e.g., "load", "save", "delete")
 * @param resource - Resource being acted upon (optional)
 * @returns Contextual message string
 *
 * @example
 * ```tsx
 * const message = createContextualMessage(error, 'save', 'document');
 * // => "Unable to connect while saving document. Check your internet connection."
 * ```
 */
export function createContextualMessage(
  error: AppError,
  action: string,
  resource?: string
): string {
  const actionVerbs: Record<string, string> = {
    load: 'loading',
    save: 'saving',
    create: 'creating',
    update: 'updating',
    delete: 'deleting',
    fetch: 'fetching',
    submit: 'submitting',
    upload: 'uploading',
    download: 'downloading',
    search: 'searching',
    sync: 'syncing',
    export: 'exporting',
    import: 'importing',
  };

  const verb = actionVerbs[action.toLowerCase()] ?? action;
  const resourceStr = resource ? ` ${resource}` : '';

  switch (error.category) {
    case 'network':
      return `Unable to connect while ${verb}${resourceStr}. Check your internet connection.`;
    case 'timeout':
      return `${verb.charAt(0).toUpperCase() + verb.slice(1)}${resourceStr} took too long. Please try again.`;
    case 'server':
      return `Server error while ${verb}${resourceStr}. We're looking into it.`;
    case 'validation':
      return `Please check your input and try ${verb}${resourceStr} again.`;
    case 'authorization':
      return `You don't have permission to ${action}${resourceStr}.`;
    case 'authentication':
      return `Please log in to ${action}${resourceStr}.`;
    case 'rate_limit':
      return `Too many requests. Please wait before ${verb}${resourceStr} again.`;
    default:
      return `Something went wrong while ${verb}${resourceStr}.`;
  }
}

/**
 * Get the appropriate action text for error recovery buttons
 *
 * @param error - The normalized application error
 * @returns Object with primary and secondary action labels
 */
export function getRecoveryActions(error: AppError): {
  primaryAction: string;
  primaryLabel: string;
  secondaryAction?: string;
  secondaryLabel?: string;
} {
  switch (error.category) {
    case 'network':
    case 'timeout':
    case 'server':
      return {
        primaryAction: 'retry',
        primaryLabel: 'Try Again',
        secondaryAction: 'dismiss',
        secondaryLabel: 'Dismiss',
      };

    case 'authentication':
      return {
        primaryAction: 'login',
        primaryLabel: 'Log In',
        secondaryAction: 'dismiss',
        secondaryLabel: 'Later',
      };

    case 'authorization':
      return {
        primaryAction: 'goBack',
        primaryLabel: 'Go Back',
        secondaryAction: 'contact',
        secondaryLabel: 'Request Access',
      };

    case 'validation':
      return {
        primaryAction: 'fix',
        primaryLabel: 'Fix Issues',
      };

    case 'rate_limit':
      return {
        primaryAction: 'wait',
        primaryLabel: 'Wait & Retry',
      };

    default:
      return {
        primaryAction: 'retry',
        primaryLabel: 'Try Again',
        secondaryAction: 'reload',
        secondaryLabel: 'Reload Page',
      };
  }
}

/**
 * Format an error for logging (includes technical details)
 *
 * @param error - The normalized application error
 * @param context - Optional context
 * @returns Formatted string for logging
 */
export function formatErrorForLogging(
  error: AppError,
  context?: ErrorMessageContext
): string {
  const parts: string[] = [
    `[${error.category.toUpperCase()}] ${error.message}`,
    `ID: ${error.id}`,
    `Severity: ${error.severity}`,
    `Timestamp: ${error.timestamp}`,
  ];

  if (context?.userAction) {
    parts.push(`User Action: ${context.userAction}`);
  }

  if (context?.feature) {
    parts.push(`Feature: ${context.feature}`);
  }

  if (context?.resource) {
    parts.push(`Resource: ${context.resource}`);
  }

  if (error.code) {
    parts.push(`Code: ${error.code}`);
  }

  if (error.stack) {
    parts.push(`\nStack:\n${error.stack}`);
  }

  return parts.join('\n');
}

/**
 * Check if an error message should be shown to the user
 *
 * Some errors (like cancelled requests or background sync errors)
 * should be handled silently.
 *
 * @param error - The normalized application error
 * @returns Whether to display the error to the user
 */
export function shouldShowError(error: AppError): boolean {
  // Don't show cancelled/aborted errors
  if (error.message.toLowerCase().includes('abort')) {
    return false;
  }

  if (error.message.toLowerCase().includes('cancel')) {
    return false;
  }

  // Don't show low severity errors in production
  if (!isDev() && error.severity === 'low') {
    return false;
  }

  return true;
}
