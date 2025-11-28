/**
 * @file Hierarchical Error Boundary System
 * @description Multi-level error boundaries with context-aware recovery
 *
 * This module provides a hierarchical error boundary system that allows
 * errors to be caught and handled at appropriate levels without crashing
 * the entire application.
 */

import React, {
  Component,
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  useRef,
  type ReactNode,
  type ErrorInfo,
  type ComponentType,
} from 'react';
import { ErrorReporter } from './ErrorReporter';
import { normalizeError, getUserFriendlyMessage } from './errorTypes';
import type { AppError } from './errorTypes';
import { useFocusTrap } from '../ux/accessibility-auto';

// ============================================================================
// Types
// ============================================================================

/**
 * Error boundary hierarchy levels
 * - critical: App-wide errors that require full page reload
 * - feature: Feature/page level errors that can be isolated
 * - component: Component level errors with retry capability
 * - widget: Small UI element errors that degrade gracefully
 */
export type ErrorBoundaryLevel = 'critical' | 'feature' | 'component' | 'widget';

/**
 * Recovery action types available to error boundaries
 */
export type RecoveryAction =
  | 'retry'
  | 'reset'
  | 'reload'
  | 'navigate'
  | 'escalate'
  | 'degrade';

/**
 * Error boundary context value exposed to children
 */
export interface ErrorBoundaryContextValue {
  /** Current boundary level */
  level: ErrorBoundaryLevel;
  /** Registered boundary ID */
  boundaryId: string;
  /** Parent boundary ID (null for root) */
  parentBoundaryId: string | null;
  /** Report error to parent boundary */
  escalateError: (error: AppError) => void;
  /** Reset current boundary state */
  resetBoundary: () => void;
  /** Check if boundary is in error state */
  hasError: boolean;
  /** Current error if any */
  error: AppError | null;
}

/**
 * Props for the hierarchical error boundary component
 */
export interface HierarchicalErrorBoundaryProps {
  children: ReactNode;
  /** Boundary level determines behavior and styling */
  level: ErrorBoundaryLevel;
  /** Unique boundary identifier (auto-generated if not provided) */
  boundaryId?: string;
  /** Custom fallback component or render function */
  fallback?: ReactNode | ((props: ErrorFallbackProps) => ReactNode);
  /** Allowed recovery actions for this boundary */
  allowedActions?: RecoveryAction[];
  /** Custom recovery handler */
  onRecover?: (action: RecoveryAction, error: AppError) => Promise<boolean>;
  /** Determines if error should escalate to parent */
  shouldEscalate?: (error: AppError) => boolean;
  /** Error callback for logging/reporting */
  onError?: (error: AppError, errorInfo: ErrorInfo) => void;
  /** Degraded component to show on error */
  degradedComponent?: ReactNode;
  /** Maximum auto-retry attempts */
  maxAutoRetry?: number;
  /** Auto-retry delay in ms */
  autoRetryDelay?: number;
}

/**
 * Props passed to error fallback components
 */
export interface ErrorFallbackProps {
  error: AppError;
  level: ErrorBoundaryLevel;
  boundaryId: string;
  allowedActions: RecoveryAction[];
  onAction: (action: RecoveryAction) => Promise<void>;
  isRecovering: boolean;
  retryCount: number;
}

// ============================================================================
// Context
// ============================================================================

/**
 * Hierarchical Error Boundary Context - provides error boundary state to children
 */
const HierarchicalErrorBoundaryContext = createContext<ErrorBoundaryContextValue | null>(null);
HierarchicalErrorBoundaryContext.displayName = 'HierarchicalErrorBoundaryContext';

/**
 * Hook to access the nearest error boundary context
 * @throws Error if used outside of a HierarchicalErrorBoundary
 */
export function useErrorBoundary(): ErrorBoundaryContextValue {
  const context = useContext(HierarchicalErrorBoundaryContext);
  if (!context) {
    throw new Error('useErrorBoundary must be used within HierarchicalErrorBoundary');
  }
  return context;
}

/**
 * Hook to access error boundary context safely (returns null if not available)
 */
export function useErrorBoundaryOptional(): ErrorBoundaryContextValue | null {
  return useContext(HierarchicalErrorBoundaryContext);
}

/**
 * Hook to programmatically trigger an error in the nearest boundary
 */
export function useErrorTrigger(): (error: unknown) => void {
  const [, setError] = useState<Error | null>(null);

  return useCallback((error: unknown) => {
    setError(() => {
      throw error instanceof Error ? error : new Error(String(error));
    });
  }, []);
}

// ============================================================================
// Level Configuration
// ============================================================================

interface LevelConfig {
  priority: number;
  defaultActions: RecoveryAction[];
  autoRetry: boolean;
  maxAutoRetry: number;
}

const LEVEL_CONFIG: Record<ErrorBoundaryLevel, LevelConfig> = {
  critical: {
    priority: 0,
    defaultActions: ['reload'],
    autoRetry: false,
    maxAutoRetry: 0,
  },
  feature: {
    priority: 1,
    defaultActions: ['retry', 'reset', 'escalate'],
    autoRetry: true,
    maxAutoRetry: 2,
  },
  component: {
    priority: 2,
    defaultActions: ['retry', 'reset', 'degrade'],
    autoRetry: true,
    maxAutoRetry: 3,
  },
  widget: {
    priority: 3,
    defaultActions: ['retry', 'degrade'],
    autoRetry: true,
    maxAutoRetry: 3,
  },
};

// ============================================================================
// Boundary State
// ============================================================================

interface HierarchicalErrorBoundaryState {
  hasError: boolean;
  error: AppError | null;
  isRecovering: boolean;
  retryCount: number;
  isDegraded: boolean;
}

// ============================================================================
// Boundary ID Generator
// ============================================================================

let boundaryIdCounter = 0;

function generateBoundaryId(): string {
  return `boundary_${++boundaryIdCounter}_${Math.random().toString(36).substring(2, 7)}`;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Hierarchical Error Boundary Component
 *
 * Provides multi-level error containment with automatic recovery strategies.
 * Errors are caught at the appropriate level and can either be handled locally
 * or escalated to parent boundaries.
 *
 * @example
 * ```tsx
 * <HierarchicalErrorBoundary level="feature">
 *   <MyFeatureComponent />
 * </HierarchicalErrorBoundary>
 * ```
 */
export class HierarchicalErrorBoundary extends Component<
  HierarchicalErrorBoundaryProps,
  HierarchicalErrorBoundaryState
> {
  static override contextType = HierarchicalErrorBoundaryContext;
  declare context: ErrorBoundaryContextValue | null;

  private boundaryId: string;
  private retryTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(props: HierarchicalErrorBoundaryProps) {
    super(props);
    this.boundaryId = props.boundaryId ?? generateBoundaryId();
    this.state = {
      hasError: false,
      error: null,
      isRecovering: false,
      retryCount: 0,
      isDegraded: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<HierarchicalErrorBoundaryState> {
    return {
      hasError: true,
      error: normalizeError(error),
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const appError = normalizeError(error);
    const { level, onError, shouldEscalate, maxAutoRetry, autoRetryDelay } = this.props;
    const config = LEVEL_CONFIG[level];

    // Report error to monitoring service
    ErrorReporter.reportError(error, {
      component: this.boundaryId,
      action: 'error_boundary_catch',
      metadata: {
        level,
        boundaryId: this.boundaryId,
        parentBoundaryId: this.context?.boundaryId ?? null,
        componentStack: errorInfo.componentStack,
        retryCount: this.state.retryCount,
      },
    });

    // Notify error callback
    onError?.(appError, errorInfo);

    // Determine if error should escalate to parent
    const shouldEscalateError =
      shouldEscalate?.(appError) ??
      (appError.severity === 'critical' ||
        (this.state.retryCount >= (maxAutoRetry ?? config.maxAutoRetry) && level !== 'critical'));

    if (shouldEscalateError && this.context) {
      this.context.escalateError(appError);
      return;
    }

    // Attempt auto-retry for appropriate levels
    const effectiveMaxAutoRetry = maxAutoRetry ?? config.maxAutoRetry;
    if (
      config.autoRetry &&
      this.state.retryCount < effectiveMaxAutoRetry &&
      this.isRetryableError(appError)
    ) {
      const delay = autoRetryDelay ?? 1000 * Math.pow(2, this.state.retryCount);
      this.scheduleAutoRetry(delay);
    }
  }

  override componentWillUnmount(): void {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private isRetryableError(error: AppError): boolean {
    const retryableCategories = ['network', 'timeout', 'server', 'rate_limit'];
    return retryableCategories.includes(error.category);
  }

  private scheduleAutoRetry(delay: number): void {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }

    this.retryTimeoutId = setTimeout(() => {
      void this.handleAction('retry');
    }, delay);
  }

  private handleAction = async (action: RecoveryAction): Promise<void> => {
    const { onRecover, degradedComponent } = this.props;
    const { error } = this.state;

    if (!error) return;

    this.setState({ isRecovering: true });

    try {
      // Call custom recovery handler first
      if (onRecover) {
        const handled = await onRecover(action, error);
        if (handled) {
          this.setState({
            hasError: false,
            error: null,
            isRecovering: false,
            retryCount: 0,
            isDegraded: false,
          });
          return;
        }
      }

      // Default action handlers
      switch (action) {
        case 'retry':
          this.setState((prev) => ({
            hasError: false,
            error: null,
            isRecovering: false,
            retryCount: prev.retryCount + 1,
          }));
          break;

        case 'reset':
          this.setState({
            hasError: false,
            error: null,
            isRecovering: false,
            retryCount: 0,
            isDegraded: false,
          });
          break;

        case 'reload':
          window.location.reload();
          break;

        case 'navigate':
          window.location.href = '/';
          break;

        case 'escalate':
          if (this.context) {
            this.context.escalateError(error);
          }
          break;

        case 'degrade':
          if (degradedComponent) {
            this.setState({
              isDegraded: true,
              isRecovering: false,
            });
          }
          break;
      }
    } catch {
      this.setState({ isRecovering: false });
    }
  };

  private escalateError = (error: AppError): void => {
    this.setState({ hasError: true, error });
  };

  private resetBoundary = (): void => {
    void this.handleAction('reset');
  };

  override render(): ReactNode {
    const { children, level, fallback, allowedActions, degradedComponent } = this.props;
    const { hasError, error, isRecovering, retryCount, isDegraded } = this.state;
    const config = LEVEL_CONFIG[level];

    const contextValue: ErrorBoundaryContextValue = {
      level,
      boundaryId: this.boundaryId,
      parentBoundaryId: this.context?.boundaryId ?? null,
      escalateError: this.escalateError,
      resetBoundary: this.resetBoundary,
      hasError,
      error,
    };

    // Show degraded component if in degraded mode
    if (isDegraded && degradedComponent) {
      return (
        <HierarchicalErrorBoundaryContext.Provider value={contextValue}>
          {degradedComponent}
        </HierarchicalErrorBoundaryContext.Provider>
      );
    }

    if (hasError && error) {
      const actions = allowedActions ?? config.defaultActions;
      const fallbackProps: ErrorFallbackProps = {
        error,
        level,
        boundaryId: this.boundaryId,
        allowedActions: actions,
        onAction: this.handleAction,
        isRecovering,
        retryCount,
      };

      if (typeof fallback === 'function') {
        return (
          <HierarchicalErrorBoundaryContext.Provider value={contextValue}>
            {fallback(fallbackProps)}
          </HierarchicalErrorBoundaryContext.Provider>
        );
      }

      if (fallback) {
        return (
          <HierarchicalErrorBoundaryContext.Provider value={contextValue}>
            {fallback}
          </HierarchicalErrorBoundaryContext.Provider>
        );
      }

      return (
        <HierarchicalErrorBoundaryContext.Provider value={contextValue}>
          <DefaultHierarchicalFallback {...fallbackProps} />
        </HierarchicalErrorBoundaryContext.Provider>
      );
    }

    return (
      <HierarchicalErrorBoundaryContext.Provider value={contextValue}>
        {children}
      </HierarchicalErrorBoundaryContext.Provider>
    );
  }
}

// ============================================================================
// Default Fallback Components
// ============================================================================

function DefaultHierarchicalFallback({
  error,
  level,
  allowedActions,
  onAction,
  isRecovering,
  retryCount,
}: ErrorFallbackProps): JSX.Element {
  // Use focus trap to keep focus within the error UI for critical/feature levels
  const shouldTrapFocus = level === 'critical' || level === 'feature';
  const focusTrapRef = useFocusTrap(shouldTrapFocus);
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  // Focus the first interactive element when the error boundary appears
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      if (firstButtonRef.current) {
        firstButtonRef.current.focus();
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, []);

  const getContainerStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    };

    switch (level) {
      case 'critical':
        return {
          ...baseStyles,
          minHeight: '100vh',
          padding: '2rem',
          backgroundColor: '#fef2f2',
        };
      case 'feature':
        return {
          ...baseStyles,
          padding: '2rem',
          minHeight: '300px',
          backgroundColor: '#fff7ed',
          borderRadius: '8px',
        };
      case 'component':
        return {
          ...baseStyles,
          padding: '1rem',
          backgroundColor: '#fefce8',
          borderRadius: '6px',
        };
      case 'widget':
        return {
          ...baseStyles,
          padding: '0.75rem',
          backgroundColor: '#f0f9ff',
          borderRadius: '4px',
        };
    }
  };

  const getIcon = (): string => {
    switch (level) {
      case 'critical':
        return '!!!';
      case 'feature':
        return '!!';
      case 'component':
        return '!';
      case 'widget':
        return 'i';
    }
  };

  const getMessage = (): string => {
    switch (level) {
      case 'critical':
        return 'A critical error occurred. Please reload the page.';
      case 'feature':
        return 'This feature is temporarily unavailable.';
      case 'component':
        return 'Something went wrong with this section.';
      case 'widget':
        return 'Unable to load this content.';
    }
  };

  // Combine refs for focus trap container
  const containerRef = shouldTrapFocus ? focusTrapRef : undefined;

  return (
    <div
      ref={containerRef}
      style={getContainerStyles()}
      role="alertdialog"
      aria-modal={shouldTrapFocus}
      aria-labelledby="error-title"
      aria-describedby="error-description"
    >
      <div
        id="error-title"
        style={{
          fontSize: level === 'widget' ? '1rem' : '1.5rem',
          fontWeight: 'bold',
          marginBottom: '0.5rem',
          color: '#1f2937',
        }}
      >
        {getIcon()} {getMessage()}
      </div>

      <p id="error-description" style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
        {getUserFriendlyMessage(error)}
      </p>

      {retryCount > 0 && (
        <p style={{ color: '#9ca3af', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
          Retry attempts: {retryCount}
        </p>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {allowedActions.map((action, index) => (
          <button
            key={action}
            ref={index === 0 ? firstButtonRef : undefined}
            onClick={() => void onAction(action)}
            disabled={isRecovering}
            aria-busy={isRecovering}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              borderRadius: '4px',
              cursor: isRecovering ? 'not-allowed' : 'pointer',
              opacity: isRecovering ? 0.6 : 1,
              backgroundColor: action === 'retry' ? '#3b82f6' : '#6b7280',
              color: 'white',
              fontWeight: 500,
              fontSize: '0.875rem',
            }}
          >
            {isRecovering ? 'Recovering...' : getActionLabel(action)}
          </button>
        ))}
      </div>

      <p style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '1rem' }}>
        Error ID: {error.id}
      </p>
    </div>
  );
}

function getActionLabel(action: RecoveryAction): string {
  const labels: Record<RecoveryAction, string> = {
    retry: 'Try Again',
    reset: 'Reset',
    reload: 'Reload Page',
    navigate: 'Go Home',
    escalate: 'Report Issue',
    degrade: 'Use Basic Mode',
  };
  return labels[action];
}

// ============================================================================
// Convenience Components
// ============================================================================

type PartialBoundaryProps = Omit<HierarchicalErrorBoundaryProps, 'level'>;

/**
 * Critical boundary - for app-wide errors
 * Use at the root of your application
 */
export function CriticalErrorBoundary({
  children,
  ...props
}: PartialBoundaryProps): JSX.Element {
  return (
    <HierarchicalErrorBoundary level="critical" {...props}>
      {children}
    </HierarchicalErrorBoundary>
  );
}

/**
 * Feature boundary - for feature/page level errors
 * Use around major features or route components
 */
export function FeatureErrorBoundary({
  children,
  ...props
}: PartialBoundaryProps): JSX.Element {
  return (
    <HierarchicalErrorBoundary level="feature" {...props}>
      {children}
    </HierarchicalErrorBoundary>
  );
}

/**
 * Component boundary - for component level errors
 * Use around complex components that might fail
 */
export function ComponentErrorBoundary({
  children,
  ...props
}: PartialBoundaryProps): JSX.Element {
  return (
    <HierarchicalErrorBoundary level="component" {...props}>
      {children}
    </HierarchicalErrorBoundary>
  );
}

/**
 * Widget boundary - for small UI element errors
 * Use around widgets, cards, or small interactive elements
 */
export function WidgetErrorBoundary({
  children,
  ...props
}: PartialBoundaryProps): JSX.Element {
  return (
    <HierarchicalErrorBoundary level="widget" {...props}>
      {children}
    </HierarchicalErrorBoundary>
  );
}

// ============================================================================
// HOC
// ============================================================================

/**
 * Higher-order component for wrapping components with error boundaries
 *
 * @example
 * ```tsx
 * const SafeComponent = withHierarchicalErrorBoundary(MyComponent, 'component');
 * ```
 */
export function withHierarchicalErrorBoundary<P extends object>(
  WrappedComponent: ComponentType<P>,
  level: ErrorBoundaryLevel,
  options?: Omit<HierarchicalErrorBoundaryProps, 'level' | 'children'>
): ComponentType<P> {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  function WithErrorBoundary(props: P): JSX.Element {
    return (
      <HierarchicalErrorBoundary
        level={level}
        boundaryId={`${displayName}_boundary`}
        {...options}
      >
        <WrappedComponent {...props} />
      </HierarchicalErrorBoundary>
    );
  }

  WithErrorBoundary.displayName = `withHierarchicalErrorBoundary(${displayName})`;

  return WithErrorBoundary;
}
