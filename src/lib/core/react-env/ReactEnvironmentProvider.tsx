/**
 * @fileoverview React Environment Provider Component
 *
 * A provider component that validates the React environment and provides
 * context about environment health to child components. This helps prevent
 * blank pages caused by React version conflicts or multiple React instances.
 *
 * @module core/react-env/ReactEnvironmentProvider
 * @version 1.0.0
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
} from 'react';
import {
  checkReactEnvironment,
  type ReactEnvironmentStatus,
  type ReactEnvironmentConfig,
} from './index';

// ============================================================================
// Context
// ============================================================================

/**
 * Context value for React environment status.
 */
export interface ReactEnvironmentContextValue {
  /** Current environment status */
  status: ReactEnvironmentStatus | null;
  /** Whether the environment is healthy */
  isHealthy: boolean;
  /** Whether the check is still pending */
  isPending: boolean;
  /** Force a re-check of the environment */
  recheck: () => void;
}

const defaultContextValue: ReactEnvironmentContextValue = {
  status: null,
  isHealthy: true,
  isPending: true,
  recheck: () => {},
};

const ReactEnvironmentContext = createContext<ReactEnvironmentContextValue>(defaultContextValue);

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access React environment status.
 *
 * @returns React environment context value
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isHealthy, status } = useReactEnvironment();
 *
 *   if (!isHealthy) {
 *     return <div>React environment issues detected</div>;
 *   }
 *
 *   return <div>App is running</div>;
 * }
 * ```
 */
export function useReactEnvironment(): ReactEnvironmentContextValue {
  return useContext(ReactEnvironmentContext);
}

// ============================================================================
// Provider Props
// ============================================================================

/**
 * Props for ReactEnvironmentProvider.
 */
export interface ReactEnvironmentProviderProps {
  /** Child components */
  children: ReactNode;
  /**
   * Configuration for environment checks.
   */
  config?: ReactEnvironmentConfig;
  /**
   * Content to render when environment is unhealthy.
   * If not provided, children will still render with a console warning.
   */
  fallback?: ReactNode;
  /**
   * Whether to block rendering of children when environment is unhealthy.
   * @default false
   */
  blockOnUnhealthy?: boolean;
  /**
   * Callback when environment issues are detected.
   */
  onEnvironmentError?: (status: ReactEnvironmentStatus) => void;
}

// ============================================================================
// Provider Component
// ============================================================================

/**
 * Provider component that validates the React environment.
 *
 * Wraps your application to detect React version conflicts and provide
 * environment health information to child components.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <ReactEnvironmentProvider>
 *   <App />
 * </ReactEnvironmentProvider>
 *
 * // With fallback and blocking
 * <ReactEnvironmentProvider
 *   blockOnUnhealthy
 *   fallback={<ErrorPage message="React configuration error" />}
 *   onEnvironmentError={(status) => console.error('React issues:', status)}
 * >
 *   <App />
 * </ReactEnvironmentProvider>
 * ```
 */
export function ReactEnvironmentProvider({
  children,
  config,
  fallback,
  blockOnUnhealthy = false,
  onEnvironmentError,
}: ReactEnvironmentProviderProps): React.JSX.Element {
  const [status, setStatus] = useState<ReactEnvironmentStatus | null>(null);
  const [isPending, setIsPending] = useState(true);

  const checkEnvironment = React.useCallback(() => {
    try {
      const envStatus = checkReactEnvironment({
        ...config,
        logWarnings: config?.logWarnings ?? true,
      });
      setStatus(envStatus);

      // Call error callback if there are issues
      if (envStatus.issues.length > 0 && onEnvironmentError) {
        onEnvironmentError(envStatus);
      }
    } catch (err) {
      // Create an error status if the check itself fails
      const errorStatus: ReactEnvironmentStatus = {
        isReactAvailable: false,
        isReactDOMAvailable: false,
        reactVersion: null,
        hasMultipleInstances: false,
        isVersionCompatible: false,
        issues: [{
          type: 'hooks_error',
          severity: 'error',
          message: `Environment check failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
          resolution: 'Check that React is properly installed and configured.',
        }],
        checkedAt: Date.now(),
      };
      setStatus(errorStatus);
      onEnvironmentError?.(errorStatus);
    } finally {
      setIsPending(false);
    }
  }, [config, onEnvironmentError]);

  useEffect(() => {
    // Run check on mount (client-side only)
    if (typeof window !== 'undefined') {
      // Small delay to ensure React is fully loaded
      const timeoutId = setTimeout(() => {
        checkEnvironment();
      }, 0);

      return () => clearTimeout(timeoutId);
    }

    // SSR - assume healthy
    setStatus({
      isReactAvailable: true,
      isReactDOMAvailable: true,
      reactVersion: null,
      hasMultipleInstances: false,
      isVersionCompatible: true,
      issues: [],
      checkedAt: Date.now(),
    });
    setIsPending(false);
    return undefined;
  }, [checkEnvironment]);

  const isHealthy = useMemo(() => {
    if (status === null) return true; // Assume healthy while pending
    return status.issues.filter(i => i.severity === 'error').length === 0;
  }, [status]);

  const contextValue = useMemo<ReactEnvironmentContextValue>(() => ({
    status,
    isHealthy,
    isPending,
    recheck: checkEnvironment,
  }), [status, isHealthy, isPending, checkEnvironment]);

  // Render fallback if unhealthy and blocking is enabled
  if (!isHealthy && blockOnUnhealthy) {
    if (fallback !== undefined) {
      return (
        <ReactEnvironmentContext.Provider value={contextValue}>
          {fallback}
        </ReactEnvironmentContext.Provider>
      );
    }

    // Default error display
    return (
      <ReactEnvironmentContext.Provider value={contextValue}>
        <div
          style={{
            padding: '20px',
            margin: '20px',
            backgroundColor: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '8px',
            color: '#856404',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <h2 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>
            React Environment Error
          </h2>
          <p style={{ margin: '0 0 10px 0' }}>
            Issues were detected with your React configuration that may cause blank pages or unexpected behavior.
          </p>
          {status?.issues.map((issue, index) => (
            <div
              key={index}
              style={{
                padding: '10px',
                marginBottom: '10px',
                backgroundColor: issue.severity === 'error' ? '#f8d7da' : '#fff3cd',
                borderRadius: '4px',
              }}
            >
              <strong>{issue.type}:</strong> {issue.message}
              {issue.resolution !== undefined && issue.resolution !== '' && (
                <div style={{ marginTop: '5px', fontSize: '14px' }}>
                  <em>Resolution: {issue.resolution}</em>
                </div>
              )}
            </div>
          ))}
          <p style={{ margin: '10px 0 0 0', fontSize: '14px' }}>
            <strong>Common fix:</strong> Run <code style={{ backgroundColor: '#f4f4f4', padding: '2px 4px' }}>npm ls react</code> to check for duplicate React installations.
          </p>
        </div>
      </ReactEnvironmentContext.Provider>
    );
  }

  return (
    <ReactEnvironmentContext.Provider value={contextValue}>
      {children}
    </ReactEnvironmentContext.Provider>
  );
}

ReactEnvironmentProvider.displayName = 'ReactEnvironmentProvider';

// ============================================================================
// HOC for environment checking
// ============================================================================

/**
 * Higher-order component that checks React environment before rendering.
 *
 * @param Component - Component to wrap
 * @param fallback - Optional fallback to render on environment error
 * @returns Wrapped component
 *
 * @example
 * ```tsx
 * const SafeApp = withReactEnvironmentCheck(App);
 * // or
 * const SafeApp = withReactEnvironmentCheck(App, <LoadingSpinner />);
 * ```
 */
export function withReactEnvironmentCheck<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
): React.FC<P> {
  const WrappedComponent: React.FC<P> = (props) => {
    const { isHealthy, isPending } = useReactEnvironment();

    if (isPending) {
      return fallback !== undefined ? <>{fallback}</> : null;
    }

    if (!isHealthy && fallback !== undefined) {
      return <>{fallback}</>;
    }

    return <Component {...props} />;
  };

  WrappedComponent.displayName = `withReactEnvironmentCheck(${Component.displayName ?? Component.name ?? 'Component'})`;

  return WrappedComponent;
}
