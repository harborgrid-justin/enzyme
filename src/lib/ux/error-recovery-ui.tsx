/**
 * @file Error Recovery UI
 * @description Graceful error recovery components with user-friendly messaging,
 * retry mechanisms, and progressive degradation.
 *
 * Features:
 * - User-friendly error messages
 * - Retry with exponential backoff
 * - Offline detection and recovery
 * - Progressive degradation
 * - Error context preservation
 * - Analytics integration
 */

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { isDev } from '@/lib/core/config/env-helper';

// ============================================================================
// Types
// ============================================================================

/**
 * Error severity levels
 */
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'fatal';

/**
 * Error category
 */
export type ErrorCategory =
  | 'network'
  | 'auth'
  | 'validation'
  | 'permission'
  | 'notFound'
  | 'timeout'
  | 'server'
  | 'critical'
  | 'unknown';

/**
 * Error info with context
 */
export interface ErrorInfo {
  error: Error;
  category: ErrorCategory;
  severity: ErrorSeverity;
  isRetryable: boolean;
  userMessage: string;
  technicalMessage: string;
  suggestions: string[];
  timestamp: number;
  context?: Record<string, unknown>;
}

/**
 * Recovery action
 */
export interface RecoveryAction {
  id: string;
  label: string;
  description?: string;
  action: () => void | Promise<void>;
  primary?: boolean;
  destructive?: boolean;
}

/**
 * Error recovery props
 */
export interface ErrorRecoveryProps {
  /** The error that occurred */
  error: Error | null;
  /** Error category override */
  category?: ErrorCategory;
  /** Custom error message */
  message?: string;
  /** Retry callback */
  onRetry?: () => void | Promise<void>;
  /** Reset/dismiss callback */
  onReset?: () => void;
  /** Navigate away callback */
  onNavigate?: (path: string) => void;
  /** Custom recovery actions */
  actions?: RecoveryAction[];
  /** Enable automatic retry */
  autoRetry?: boolean;
  /** Auto retry delay in ms */
  autoRetryDelay?: number;
  /** Maximum auto retry attempts */
  maxAutoRetries?: number;
  /** Show technical details */
  showTechnicalDetails?: boolean;
  /** Custom fallback component */
  fallback?: ReactNode;
  /** Children to render when no error */
  children?: ReactNode;
  /** Full screen error */
  fullScreen?: boolean;
  /** Compact mode */
  compact?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * Offline recovery props
 */
export interface OfflineRecoveryProps {
  /** Pending actions to sync */
  pendingActions?: number;
  /** Last sync timestamp */
  lastSync?: number;
  /** Force retry callback */
  onForceRetry?: () => void;
  /** Children to render when online */
  children?: ReactNode;
  /** Custom offline message */
  offlineMessage?: string;
}

/**
 * Degraded state props
 */
export interface DegradedStateProps {
  /** Features that are unavailable */
  unavailableFeatures: string[];
  /** Reason for degradation */
  reason: string;
  /** Expected recovery time */
  estimatedRecoveryTime?: string;
  /** Children to render */
  children?: ReactNode;
  /** Dismiss callback */
  onDismiss?: () => void;
}

// ============================================================================
// Error Classification
// ============================================================================

/**
 * Classify an error into a category
 */
export function classifyError(error: Error): ErrorCategory {
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  // Network errors
  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('connection') ||
    name === 'networkerror' ||
    name === 'typeerror' // Often from failed fetch
  ) {
    return 'network';
  }

  // Authentication errors
  if (
    message.includes('unauthorized') ||
    message.includes('authentication') ||
    message.includes('login') ||
    message.includes('401')
  ) {
    return 'auth';
  }

  // Permission errors
  if (
    message.includes('forbidden') ||
    message.includes('permission') ||
    message.includes('403')
  ) {
    return 'permission';
  }

  // Not found errors
  if (message.includes('not found') || message.includes('404')) {
    return 'notFound';
  }

  // Timeout errors
  if (message.includes('timeout') || message.includes('timed out')) {
    return 'timeout';
  }

  // Server errors
  if (
    message.includes('server') ||
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('504')
  ) {
    return 'server';
  }

  // Validation errors
  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('400')
  ) {
    return 'validation';
  }

  return 'unknown';
}

/**
 * Get error severity
 */
function getSeverity(category: ErrorCategory): ErrorSeverity {
  switch (category) {
    case 'validation':
      return 'warning';
    case 'network':
    case 'timeout':
      return 'error';
    case 'auth':
    case 'permission':
      return 'error';
    case 'server':
    case 'critical':
      return 'fatal';
    default:
      return 'error';
  }
}

function getErrorSeverity(category: ErrorCategory): ErrorSeverity {
  return getSeverity(category);
}

/**
 * Check if error is retryable
 */
export function isRetryable(category: ErrorCategory): boolean {
  return ['network', 'timeout', 'server'].includes(category);
}

/**
 * Get user-friendly error message
 */
export function getUserMessage(category: ErrorCategory, error: Error): string {
  switch (category) {
    case 'network':
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    case 'auth':
      return 'Your session has expired. Please sign in again to continue.';
    case 'permission':
      return "You don't have permission to perform this action. Please contact your administrator.";
    case 'notFound':
      return "The requested resource could not be found. It may have been moved or deleted.";
    case 'timeout':
      return 'The request took too long to complete. Please try again.';
    case 'server':
      return "We're experiencing technical difficulties. Our team has been notified and is working on it.";
    case 'validation':
      return error.message || 'Please check your input and try again.';
    default:
      return 'An unexpected error occurred. Please try again later.';
  }
}

/**
 * Get recovery suggestions
 */
export function getRecoverySuggestions(category: ErrorCategory): string[] {
  switch (category) {
    case 'network':
      return [
        'Check your internet connection',
        'Try refreshing the page',
        'Disable VPN or proxy if enabled',
      ];
    case 'auth':
      return [
        'Sign in again',
        'Clear your browser cookies',
        'Try a different browser',
      ];
    case 'permission':
      return [
        'Contact your administrator',
        'Verify your account permissions',
        'Try signing out and back in',
      ];
    case 'timeout':
      return [
        'Wait a moment and try again',
        'Check if the server is responding',
        'Try with a smaller request',
      ];
    case 'server':
      return [
        'Wait a few minutes and try again',
        'Check our status page',
        'Contact support if the issue persists',
      ];
    default:
      return [
        'Refresh the page',
        'Clear your browser cache',
        'Contact support if the issue persists',
      ];
  }
}

/**
 * Create error info from an error
 */
export function createErrorInfo(
  error: Error,
  categoryOverride?: ErrorCategory
): ErrorInfo {
  const category = categoryOverride || classifyError(error);

  return {
    error,
    category,
    severity: getErrorSeverity(category),
    isRetryable: isRetryable(category),
    userMessage: getUserMessage(category, error),
    technicalMessage: error.message,
    suggestions: getRecoverySuggestions(category),
    timestamp: Date.now(),
  };
}

// ============================================================================
// Error Recovery Component
// ============================================================================

/**
 * Error recovery component with retry and navigation
 */
export function ErrorRecovery({
  error,
  category: categoryOverride,
  message,
  onRetry,
  onReset,
  onNavigate,
  actions,
  autoRetry = false,
  autoRetryDelay = 5000,
  maxAutoRetries = 3,
  showTechnicalDetails = isDev(),
  fallback,
  children,
  fullScreen = false,
  compact = false,
  className = '',
}: ErrorRecoveryProps): React.ReactElement {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Create error info
  const errorInfo = useMemo(
    () => (error ? createErrorInfo(error, categoryOverride) : null),
    [error, categoryOverride]
  );

  // Auto retry effect
  useEffect(() => {
    if (!error || !autoRetry || !errorInfo?.isRetryable || !onRetry) {
      return;
    }

    if (retryCount >= maxAutoRetries) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsRetrying(true);
      setRetryCount((c) => c + 1);
      try {
        await onRetry();
      } catch {
        // Retry failed, will be caught by next cycle
      } finally {
        setIsRetrying(false);
      }
    }, autoRetryDelay * Math.pow(2, retryCount));

    return () => clearTimeout(timer);
  }, [error, autoRetry, autoRetryDelay, maxAutoRetries, retryCount, errorInfo, onRetry]);

  // Reset retry count when error changes
  useEffect(() => {
    setRetryCount(0);
  }, [error]);

  // Handle manual retry
  const handleRetry = useCallback(async () => {
    if (!onRetry) return;

    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  }, [onRetry]);

  // No error, render children
  if (!error) {
    return <>{children}</>;
  }

  // Use custom fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Build default recovery actions
  const defaultActions: RecoveryAction[] = [];

  if (errorInfo?.isRetryable && onRetry) {
    defaultActions.push({
      id: 'retry',
      label: isRetrying ? 'Retrying...' : 'Try Again',
      action: handleRetry,
      primary: true,
    });
  }

  if (errorInfo?.category === 'auth' && onNavigate) {
    defaultActions.push({
      id: 'login',
      label: 'Sign In',
      action: () => onNavigate('/login'),
      primary: true,
    });
  }

  if (onNavigate) {
    defaultActions.push({
      id: 'home',
      label: 'Go Home',
      action: () => onNavigate('/'),
    });
  }

  if (onReset) {
    defaultActions.push({
      id: 'dismiss',
      label: 'Dismiss',
      action: onReset,
    });
  }

  const allActions = [...defaultActions, ...(actions || [])];

  // Container classes
  const containerClasses = [
    'error-recovery',
    fullScreen && 'error-recovery--fullscreen',
    compact && 'error-recovery--compact',
    `error-recovery--${errorInfo?.severity}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClasses} role="alert">
      {/* Icon */}
      <div className="error-recovery__icon">
        <ErrorIcon severity={errorInfo?.severity || 'error'} />
      </div>

      {/* Content */}
      <div className="error-recovery__content">
        <h2 className="error-recovery__title">
          {getErrorTitle(errorInfo?.category || 'unknown')}
        </h2>

        <p className="error-recovery__message">
          {message || errorInfo?.userMessage}
        </p>

        {/* Auto retry status */}
        {autoRetry && errorInfo?.isRetryable && retryCount > 0 && (
          <p className="error-recovery__retry-status">
            {retryCount >= maxAutoRetries
              ? 'Automatic retry failed. Please try manually.'
              : `Retrying automatically... (${retryCount}/${maxAutoRetries})`}
          </p>
        )}

        {/* Suggestions */}
        {!compact && errorInfo && errorInfo.suggestions.length > 0 && (
          <div className="error-recovery__suggestions">
            <h3>Things you can try:</h3>
            <ul>
              {errorInfo.suggestions.map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Technical details */}
        {showTechnicalDetails && (
          <div className="error-recovery__technical">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="error-recovery__details-toggle"
            >
              {showDetails ? 'Hide' : 'Show'} Technical Details
            </button>
            {showDetails && (
              <pre className="error-recovery__details">
                {errorInfo?.technicalMessage}
                {'\n\n'}
                {error.stack}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {allActions.length > 0 && (
        <div className="error-recovery__actions">
          {allActions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={async () => action.action()}
              disabled={isRetrying && action.id === 'retry'}
              className={[
                'error-recovery__action',
                action.primary && 'error-recovery__action--primary',
                action.destructive && 'error-recovery__action--destructive',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Offline Recovery Component
// ============================================================================

/**
 * Offline detection and recovery component
 */
export function OfflineRecovery({
  pendingActions,
  lastSync,
  onForceRetry,
  children,
  offlineMessage,
}: OfflineRecoveryProps): React.ReactElement {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleOnline = (): void => {
      setIsOnline(true);
      // Auto-hide banner after a moment
      setTimeout(() => setShowBanner(false), 3000);
    };

    const handleOffline = (): void => {
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    setIsOnline(navigator.onLine);
    setShowBanner(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Format last sync time
  const lastSyncText = lastSync
    ? `Last synced ${formatTimeAgo(lastSync)}`
    : 'Not synced';

  if (!showBanner) {
    return <>{children}</>;
  }

  return (
    <>
      <div
        className={`offline-banner ${isOnline ? 'offline-banner--online' : 'offline-banner--offline'}`}
        role="status"
      >
        <div className="offline-banner__content">
          <span className="offline-banner__icon">
            {isOnline ? (
              <OnlineIcon />
            ) : (
              <OfflineIcon />
            )}
          </span>

          <span className="offline-banner__message">
            {isOnline
              ? 'Back online! Syncing your changes...'
              : offlineMessage || "You're offline. Some features may be unavailable."}
          </span>

          {!isOnline && pendingActions !== undefined && pendingActions > 0 && (
            <span className="offline-banner__pending">
              {pendingActions} pending change{pendingActions > 1 ? 's' : ''}
            </span>
          )}

          {!isOnline && lastSync && (
            <span className="offline-banner__sync">{lastSyncText}</span>
          )}

          {!isOnline && onForceRetry && (
            <button
              type="button"
              onClick={onForceRetry}
              className="offline-banner__retry"
            >
              Retry
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowBanner(false)}
            className="offline-banner__close"
            aria-label="Dismiss"
          >
            &times;
          </button>
        </div>
      </div>
      {children}
    </>
  );
}

// ============================================================================
// Degraded State Component
// ============================================================================

/**
 * Degraded state indicator
 */
export function DegradedState({
  unavailableFeatures,
  reason,
  estimatedRecoveryTime,
  children,
  onDismiss,
}: DegradedStateProps): React.ReactElement {
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  if (dismissed || unavailableFeatures.length === 0) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="degraded-state" role="status">
        <div className="degraded-state__content">
          <span className="degraded-state__icon">
            <WarningIcon />
          </span>

          <div className="degraded-state__info">
            <p className="degraded-state__message">
              Some features are temporarily unavailable: {unavailableFeatures.join(', ')}
            </p>
            <p className="degraded-state__reason">{reason}</p>
            {estimatedRecoveryTime && (
              <p className="degraded-state__recovery">
                Estimated recovery: {estimatedRecoveryTime}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="degraded-state__close"
            aria-label="Dismiss"
          >
            &times;
          </button>
        </div>
      </div>
      {children}
    </>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function ErrorIcon({ severity }: { severity: ErrorSeverity }): React.ReactElement {
  const color = {
    info: '#3b82f6',
    warning: '#f59e0b',
    error: '#ef4444',
    fatal: '#dc2626',
  }[severity];

  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
      <line x1="12" y1="8" x2="12" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1" fill={color} />
    </svg>
  );
}

function OfflineIcon(): React.ReactElement {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M1 1L23 23M16.72 11.06C18.29 12.02 19.5 13.54 20 15.34M5 12.55C7.06 10.13 10.36 9 13.84 9.44M8.53 16.11C10.19 14.72 12.5 14.22 14.68 14.88M12 20H12.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function OnlineIcon(): React.ReactElement {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M5 12.55C7.56 9.65 11.47 8.68 15.11 9.42M1.42 9C4.85 4.58 10.63 2.49 16.1 3.75M8.53 16.11C10.85 14.09 14.34 13.92 16.83 15.73M12 20H12.01M20.41 5C22.18 7.2 23.14 10 23 13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WarningIcon(): React.ReactElement {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18C1.64 18.3 1.55 18.64 1.55 19C1.55 19.36 1.64 19.7 1.82 20C2 20.3 2.25 20.56 2.57 20.73C2.88 20.91 3.24 21 3.62 21H20.38C20.76 21 21.12 20.91 21.43 20.73C21.75 20.56 22 20.3 22.18 20C22.36 19.7 22.45 19.36 22.45 19C22.45 18.64 22.36 18.3 22.18 18L13.71 3.86C13.53 3.56 13.28 3.32 12.97 3.15C12.66 2.98 12.33 2.89 12 2.89C11.67 2.89 11.34 2.98 11.03 3.15C10.72 3.32 10.47 3.56 10.29 3.86Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ============================================================================
// Utilities
// ============================================================================

function getErrorTitle(category: ErrorCategory): string {
  switch (category) {
    case 'network':
      return 'Connection Error';
    case 'auth':
      return 'Authentication Required';
    case 'permission':
      return 'Access Denied';
    case 'notFound':
      return 'Not Found';
    case 'timeout':
      return 'Request Timeout';
    case 'server':
      return 'Server Error';
    case 'validation':
      return 'Invalid Input';
    default:
      return 'Something Went Wrong';
  }
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

// ============================================================================
// CSS Export
// ============================================================================

export const errorRecoveryStyles = `
  .error-recovery {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
    gap: 1.5rem;
  }

  .error-recovery--fullscreen {
    min-height: 100vh;
    background: #f9fafb;
  }

  .error-recovery--compact {
    padding: 1rem;
    gap: 1rem;
  }

  .error-recovery__title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #111827;
  }

  .error-recovery__message {
    margin: 0;
    color: #6b7280;
    max-width: 400px;
  }

  .error-recovery__suggestions {
    text-align: left;
    background: #f3f4f6;
    padding: 1rem;
    border-radius: 8px;
    max-width: 400px;
  }

  .error-recovery__suggestions h3 {
    margin: 0 0 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
  }

  .error-recovery__suggestions ul {
    margin: 0;
    padding-left: 1.25rem;
    color: #6b7280;
    font-size: 0.875rem;
  }

  .error-recovery__actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .error-recovery__action {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    border: 1px solid #d1d5db;
    background: white;
    color: #374151;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s;
  }

  .error-recovery__action:hover {
    background: #f9fafb;
  }

  .error-recovery__action--primary {
    background: #3b82f6;
    border-color: #3b82f6;
    color: white;
  }

  .error-recovery__action--primary:hover {
    background: #2563eb;
  }

  .error-recovery__action--destructive {
    color: #ef4444;
    border-color: #fca5a5;
  }

  .offline-banner {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 9999;
    padding: 0.75rem 1rem;
  }

  .offline-banner--offline {
    background: #fef3c7;
    color: #92400e;
  }

  .offline-banner--online {
    background: #d1fae5;
    color: #065f46;
  }

  .offline-banner__content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .degraded-state {
    background: #fef3c7;
    border-bottom: 1px solid #fcd34d;
    padding: 0.75rem 1rem;
  }

  .degraded-state__content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    max-width: 1200px;
    margin: 0 auto;
  }
`;
