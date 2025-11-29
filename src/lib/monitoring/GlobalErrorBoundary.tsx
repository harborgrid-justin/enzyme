/* @refresh reset */
/**
 * @file Global Error Boundary
 * @description App-wide boundary catching render/runtime errors
 */

/* eslint-disable react-refresh/only-export-components */

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorReporter } from './ErrorReporter';
import type { AppError } from './errorTypes';
import { normalizeError, getUserFriendlyMessage } from './errorTypes';

/**
 * Global error boundary props
 */
export interface GlobalErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: AppError, reset: () => void) => ReactNode);
  onError?: (error: AppError, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

/**
 * Global error boundary state
 */
interface GlobalErrorBoundaryState {
  hasError: boolean;
  error: AppError | null;
}

/**
 * Default error fallback UI
 */
function DefaultErrorFallback({
  error,
  onReset,
  showDetails,
}: {
  error: AppError;
  onReset: () => void;
  showDetails?: boolean;
}): React.ReactElement {
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
            marginBottom: '1rem',
          }}
        >
          Something went wrong
        </h1>
        
        <p
          style={{
            color: '#6b7280',
            marginBottom: '1.5rem',
          }}
        >
          {getUserFriendlyMessage(error)}
        </p>

        {(showDetails === true && error.stack != null && error.stack.length > 0) && (
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
        
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            onClick={onReset}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            Try Again
          </button>
          
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
 * Global error boundary component
 */
export class GlobalErrorBoundary extends Component<
  GlobalErrorBoundaryProps,
  GlobalErrorBoundaryState
> {
  constructor(props: GlobalErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: Error): GlobalErrorBoundaryState {
    const appError = normalizeError(error);
    return { hasError: true, error: appError };
  }
  
  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const appError = normalizeError(error);
    
    // Report to error monitoring
    ErrorReporter.reportError(error, {
      component: errorInfo.componentStack?.split('\n')[1]?.trim(),
      metadata: {
        componentStack: errorInfo.componentStack,
      },
    });
    
    // Call custom error handler
    this.props.onError?.(appError, errorInfo);
  }
  
  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };
  
  override render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, showDetails } = this.props;
    
    if (hasError && error) {
      if (typeof fallback === 'function') {
        return fallback(error, this.handleReset);
      }

      if (fallback != null) {
        return fallback;
      }
      
      return (
        <DefaultErrorFallback
          error={error}
          onReset={this.handleReset}
          showDetails={showDetails}
        />
      );
    }
    
    return children;
  }
}
