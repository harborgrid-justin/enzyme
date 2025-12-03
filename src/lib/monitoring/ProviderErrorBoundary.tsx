/**
 * @file Provider Error Boundary
 * @description Enterprise-grade error boundaries for React providers/context
 * to prevent provider initialization failures from crashing the entire app
 */

import React, {
  Component,
  type ReactNode,
  type ErrorInfo,
  type ComponentType,
} from 'react';
import { ErrorReporter } from './ErrorReporter';
import { normalizeError, getUserFriendlyMessage } from './errorTypes';
import type { AppError } from './errorTypes';

/**
 * Provider error boundary configuration
 */
export interface ProviderErrorBoundaryConfig {
  /** Provider name for error reporting */
  providerName: string;
  /** Custom fallback component */
  fallback?: ReactNode | ((error: AppError, retry: () => void) => ReactNode);
  /** Error callback */
  onError?: (error: AppError, errorInfo: ErrorInfo) => void;
  /** Whether this provider is critical (blocks app render) */
  critical?: boolean;
  /** Maximum auto-retry attempts */
  maxRetries?: number;
  /** Auto-retry delay in ms */
  retryDelay?: number;
  /** Fallback value for the provider context */
  fallbackValue?: unknown;
  /** Show error details in development */
  showDetails?: boolean;
}

/**
 * Provider error boundary props
 */
export interface ProviderErrorBoundaryProps extends ProviderErrorBoundaryConfig {
  children: ReactNode;
}

/**
 * Provider error boundary state
 */
interface ProviderErrorBoundaryState {
  hasError: boolean;
  error: AppError | null;
  retryCount: number;
  isRetrying: boolean;
}

/**
 * Default fallback for provider errors
 */
function DefaultProviderFallback({
  error,
  providerName,
  onRetry,
  isRetrying,
  retryCount,
  maxRetries,
  showDetails,
}: {
  error: AppError;
  providerName: string;
  onRetry: () => void;
  isRetrying: boolean;
  retryCount: number;
  maxRetries: number;
  showDetails?: boolean;
}): React.ReactElement {
  const canRetry = retryCount < maxRetries;

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: '#fef2f2',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '32rem',
          padding: '2rem',
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
      >
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#dc2626',
            marginBottom: '0.5rem',
          }}
        >
          Initialization Error
        </h1>

        <p
          style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            marginBottom: '1rem',
          }}
        >
          The <strong>{providerName}</strong> failed to initialize.
        </p>

        <p
          style={{
            color: '#6b7280',
            marginBottom: '1.5rem',
          }}
        >
          {getUserFriendlyMessage(error)}
        </p>

        {showDetails && error.stack && (
          <pre
            style={{
              textAlign: 'left',
              fontSize: '0.75rem',
              padding: '1rem',
              backgroundColor: '#f3f4f6',
              borderRadius: '0.25rem',
              overflow: 'auto',
              maxHeight: '12rem',
              marginBottom: '1.5rem',
            }}
          >
            {error.stack}
          </pre>
        )}

        {retryCount > 0 && (
          <p
            style={{
              fontSize: '0.75rem',
              color: '#9ca3af',
              marginBottom: '1rem',
            }}
          >
            Retry attempts: {retryCount} / {maxRetries}
          </p>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          {canRetry && (
            <button
              onClick={onRetry}
              disabled={isRetrying}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: isRetrying ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: isRetrying ? 'not-allowed' : 'pointer',
                fontWeight: '500',
              }}
            >
              {isRetrying ? 'Retrying...' : 'Try Again'}
            </button>
          )}

          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            Reload Page
          </button>
        </div>

        <p
          style={{
            fontSize: '0.75rem',
            color: '#9ca3af',
            marginTop: '1rem',
          }}
        >
          Error ID: {error.id}
        </p>
      </div>
    </div>
  );
}

/**
 * Provider Error Boundary Component
 *
 * Wraps React providers/context to catch initialization errors
 * and prevent them from crashing the entire application.
 *
 * @example
 * ```tsx
 * <ProviderErrorBoundary providerName="AuthProvider">
 *   <AuthProvider>
 *     {children}
 *   </AuthProvider>
 * </ProviderErrorBoundary>
 * ```
 */
export class ProviderErrorBoundary extends Component<
  ProviderErrorBoundaryProps,
  ProviderErrorBoundaryState
> {
  private retryTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(props: ProviderErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
      isRetrying: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ProviderErrorBoundaryState> {
    return {
      hasError: true,
      error: normalizeError(error),
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { providerName, onError, maxRetries = 3, retryDelay = 2000 } = this.props;
    const appError = normalizeError(error);

    // Report to error monitoring with provider context
    ErrorReporter.reportError(error, {
      component: providerName,
      action: 'provider_initialization_error',
      metadata: {
        providerName,
        componentStack: errorInfo.componentStack,
        retryCount: this.state.retryCount,
        isCritical: this.props.critical ?? true,
      },
    });

    // Notify error callback
    onError?.(appError, errorInfo);

    // Attempt auto-retry if configured
    if (this.state.retryCount < maxRetries) {
      this.scheduleAutoRetry(retryDelay);
    }
  }

  override componentWillUnmount(): void {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  override render(): ReactNode {
    const {
      children,
      providerName,
      fallback,
      maxRetries = 3,
      showDetails,
    } = this.props;
    const { hasError, error, retryCount, isRetrying } = this.state;

    if (hasError && error) {
      if (typeof fallback === 'function') {
        return fallback(error, this.handleRetry);
      }

      if (fallback !== undefined) {
        return fallback;
      }

      return (
        <DefaultProviderFallback
          error={error}
          providerName={providerName}
          onRetry={this.handleRetry}
          isRetrying={isRetrying}
          retryCount={retryCount}
          maxRetries={maxRetries}
          showDetails={showDetails}
        />
      );
    }

    return children;
  }

  private scheduleAutoRetry(delay: number): void {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }

    this.retryTimeoutId = setTimeout(() => {
      this.handleRetry();
    }, delay * Math.pow(1.5, this.state.retryCount)); // Exponential backoff
  }

  private handleRetry = (): void => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      retryCount: prev.retryCount + 1,
      isRetrying: true,
    }));

    // Reset isRetrying after a short delay
    setTimeout(() => {
      this.setState({ isRetrying: false });
    }, 100);
  };
}

/**
 * HOC to wrap a provider component with error boundary
 *
 * @example
 * ```tsx
 * const SafeAuthProvider = withProviderErrorBoundary(AuthProvider, {
 *   providerName: 'AuthProvider',
 *   critical: true,
 * });
 * ```
 */
export function withProviderErrorBoundary<P extends object>(
  ProviderComponent: ComponentType<P>,
  config: ProviderErrorBoundaryConfig
): ComponentType<P> {
  const { displayName: componentDisplayName, name: componentName } = ProviderComponent;

  let displayName = config.providerName;
  if (!displayName) {
    if (componentDisplayName != null && componentDisplayName !== '') {
      displayName = componentDisplayName;
    } else if (componentName != null && componentName !== '') {
      displayName = componentName;
    } else {
      displayName = 'UnknownProvider';
    }
  }

  function SafeProvider(props: P): React.ReactElement {
    return (
      <ProviderErrorBoundary {...config} providerName={displayName}>
        <ProviderComponent {...props} />
      </ProviderErrorBoundary>
    );
  }

  SafeProvider.displayName = `withProviderErrorBoundary(${displayName})`;

  return SafeProvider;
}

/**
 * Pre-configured provider boundaries for common providers
 */
export function AuthProviderBoundary({
  children,
  ...props
}: Omit<ProviderErrorBoundaryProps, 'providerName'>): React.ReactElement {
  return (
    <ProviderErrorBoundary
      providerName="AuthProvider"
      critical={true}
      maxRetries={2}
      {...props}
    >
      {children}
    </ProviderErrorBoundary>
  );
}

export function ConfigProviderBoundary({
  children,
  ...props
}: Omit<ProviderErrorBoundaryProps, 'providerName'>): React.ReactElement {
  return (
    <ProviderErrorBoundary
      providerName="ConfigProvider"
      critical={true}
      maxRetries={3}
      {...props}
    >
      {children}
    </ProviderErrorBoundary>
  );
}

export function RealtimeProviderBoundary({
  children,
  ...props
}: Omit<ProviderErrorBoundaryProps, 'providerName'>): React.ReactElement {
  return (
    <ProviderErrorBoundary
      providerName="RealtimeProvider"
      critical={false}
      maxRetries={3}
      {...props}
    >
      {children}
    </ProviderErrorBoundary>
  );
}

export function SecurityProviderBoundary({
  children,
  ...props
}: Omit<ProviderErrorBoundaryProps, 'providerName'>): React.ReactElement {
  return (
    <ProviderErrorBoundary
      providerName="SecurityProvider"
      critical={true}
      maxRetries={2}
      {...props}
    >
      {children}
    </ProviderErrorBoundary>
  );
}
