/* @refresh reset */
/**
 * @file Query Error Boundary
 * @description Boundary specifically for data-fetch errors
 */

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorReporter } from './ErrorReporter';
import type { AppError } from './errorTypes';
import { normalizeError, getUserFriendlyMessage, isRetryableError } from './errorTypes';

/**
 * Query error boundary props
 */
export interface QueryErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((props: QueryErrorFallbackProps) => ReactNode);
  onError?: (error: AppError) => void;
  onRetry?: () => void;
  queryKey?: string;
}

/**
 * Query error fallback props
 */
export interface QueryErrorFallbackProps {
  error: AppError;
  reset: () => void;
  retry: () => void;
  isRetryable: boolean;
}

/**
 * Query error boundary state
 */
interface QueryErrorBoundaryState {
  hasError: boolean;
  error: AppError | null;
}

/**
 * Default query error fallback UI
 */
function DefaultQueryErrorFallback({
  error,
  reset,
  retry,
  isRetryable,
}: QueryErrorFallbackProps): React.ReactElement {
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: '#fff7ed',
        borderRadius: '0.5rem',
        border: '1px solid #fed7aa',
      }}
    >
      <svg
        style={{
          width: '3rem',
          height: '3rem',
          color: '#f97316',
          marginBottom: '1rem',
        }}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      
      <h2
        style={{
          fontSize: '1.125rem',
          fontWeight: '600',
          color: '#c2410c',
          marginBottom: '0.5rem',
        }}
      >
        Failed to load data
      </h2>
      
      <p
        style={{
          color: '#9a3412',
          marginBottom: '1rem',
          fontSize: '0.875rem',
        }}
      >
        {getUserFriendlyMessage(error)}
      </p>
      
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {isRetryable && (
          <button
            onClick={retry}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#f97316',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '0.875rem',
            }}
          >
            Retry
          </button>
        )}
        
        <button
          onClick={reset}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'white',
            color: '#c2410c',
            border: '1px solid #fed7aa',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '0.875rem',
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

/**
 * Query error boundary component
 */
export class QueryErrorBoundary extends Component<
  QueryErrorBoundaryProps,
  QueryErrorBoundaryState
> {
  constructor(props: QueryErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: Error): QueryErrorBoundaryState {
    const appError = normalizeError(error);
    return { hasError: true, error: appError };
  }
  
  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const appError = normalizeError(error);
    
    // Report to error monitoring
    ErrorReporter.reportError(error, {
      action: 'query_error',
      metadata: {
        queryKey: this.props.queryKey,
        componentStack: errorInfo.componentStack,
      },
    });
    
    // Call custom error handler
    this.props.onError?.(appError);
  }
  
  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };
  
  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };
  
  override render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;
    
    if (hasError && error) {
      const fallbackProps: QueryErrorFallbackProps = {
        error,
        reset: this.handleReset,
        retry: this.handleRetry,
        isRetryable: isRetryableError(error),
      };
      
      if (typeof fallback === 'function') {
        return fallback(fallbackProps);
      }

      if (fallback != null) {
        return fallback;
      }
      
      return <DefaultQueryErrorFallback {...fallbackProps} />;
    }
    
    return children;
  }
}

/**
 * Hook-based error boundary wrapper for functional components
 */
export function withQueryErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  boundaryProps?: Omit<QueryErrorBoundaryProps, 'children'>
): React.FC<P> {
  return function WrappedComponent(props: P) {
    return (
      <QueryErrorBoundary {...boundaryProps}>
        <Component {...props} />
      </QueryErrorBoundary>
    );
  };
}
