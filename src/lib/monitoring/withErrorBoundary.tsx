/**
 * @file With Error Boundary HOC
 * @description HOC to wrap any component with local try/catch UI
 */

import React, { Component, type ErrorInfo, type ReactNode, type ComponentType } from 'react';
import { ErrorReporter } from './ErrorReporter';
import type { AppError } from './errorTypes';
import { normalizeError, getUserFriendlyMessage } from './errorTypes';

/**
 * Error boundary options
 */
export interface WithErrorBoundaryOptions {
  fallback?: ReactNode | ((error: AppError, reset: () => void) => ReactNode);
  onError?: (error: AppError, errorInfo: ErrorInfo) => void;
  componentName?: string;
  showReset?: boolean;
}

/**
 * Error boundary state
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: AppError | null;
}

/**
 * Minimal inline error fallback
 */
function InlineErrorFallback({
  error,
  onReset,
  showReset,
}: {
  error: AppError;
  onReset: () => void;
  showReset?: boolean;
}) {
  return (
    <div
      role="alert"
      style={{
        padding: '1rem',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '0.375rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: '#dc2626',
          fontSize: '0.875rem',
        }}
      >
        <svg
          style={{ width: '1rem', height: '1rem', flexShrink: 0 }}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
        <span>{getUserFriendlyMessage(error)}</span>
        {showReset && (
          <button
            onClick={onReset}
            style={{
              marginLeft: 'auto',
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              color: '#dc2626',
              backgroundColor: 'transparent',
              border: '1px solid #fecaca',
              borderRadius: '0.25rem',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Create an error boundary class for a specific component
 */
function createErrorBoundary(
  options: WithErrorBoundaryOptions
): ComponentType<{ children: ReactNode }> {
  return class extends Component<{ children: ReactNode }, ErrorBoundaryState> {
    constructor(props: { children: ReactNode }) {
      super(props);
      this.state = { hasError: false, error: null };
    }
    
    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
      return { hasError: true, error: normalizeError(error) };
    }
    
    override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
      const appError = normalizeError(error);
      
      ErrorReporter.reportError(error, {
        component: options.componentName,
        metadata: {
          componentStack: errorInfo.componentStack,
        },
      });
      
      options.onError?.(appError, errorInfo);
    }
    
    handleReset = (): void => {
      this.setState({ hasError: false, error: null });
    };
    
    override render(): ReactNode {
      const { hasError, error } = this.state;
      const { children } = this.props;
      
      if (hasError && error) {
        if (typeof options.fallback === 'function') {
          return options.fallback(error, this.handleReset);
        }
        
        if (options.fallback) {
          return options.fallback;
        }
        
        return (
          <InlineErrorFallback
            error={error}
            onReset={this.handleReset}
            showReset={options.showReset !== false}
          />
        );
      }
      
      return children;
    }
  };
}

/**
 * Higher-order component to wrap any component with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: WithErrorBoundaryOptions = {}
): ComponentType<P> {
  const componentName =
    options.componentName ||
    WrappedComponent.displayName ||
    WrappedComponent.name ||
    'Component';
  
  const ErrorBoundary = createErrorBoundary({
    ...options,
    componentName,
  });
  
  const WithErrorBoundary: React.FC<P> = (props: P) => (
    <ErrorBoundary>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );
  
  WithErrorBoundary.displayName = `withErrorBoundary(${componentName})`;
  
  return WithErrorBoundary;
}

/**
 * Component version for declarative usage
 */
export function ErrorBoundary({
  children,
  fallback,
  onError,
  showReset = true,
}: {
  children: ReactNode;
  fallback?: ReactNode | ((error: AppError, reset: () => void) => ReactNode);
  onError?: (error: AppError, errorInfo: ErrorInfo) => void;
  showReset?: boolean;
}) {
  const BoundaryComponent = createErrorBoundary({
    fallback,
    onError,
    showReset,
  });
  
  return <BoundaryComponent>{children}</BoundaryComponent>;
}
