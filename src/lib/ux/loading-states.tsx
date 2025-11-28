/**
 * @file Intelligent Loading States
 * @description Comprehensive loading state management with progressive
 * enhancement, timeout handling, and accessibility support.
 *
 * Features:
 * - Progressive loading indicators
 * - Minimum display time
 * - Timeout handling
 * - Loading state composition
 * - Accessible announcements
 * - Custom spinners and loaders
 */

import {
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { LoadingContext } from '../contexts/LoadingContext';
import { announce } from './accessibility-enhancer';
import { Spinner } from '../ui/feedback/Spinner';

// ============================================================================
// Types
// ============================================================================

/**
 * Loading state
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error' | 'timeout';

/**
 * Loading phase for progressive display
 */
export type LoadingPhase = 'initial' | 'spinner' | 'skeleton' | 'message' | 'timeout';

/**
 * Loading config
 */
export interface LoadingConfig {
  /** Minimum display time for loading state (ms) */
  minDisplayTime: number;
  /** Delay before showing spinner (ms) */
  spinnerDelay: number;
  /** Delay before showing skeleton (ms) */
  skeletonDelay: number;
  /** Delay before showing message (ms) */
  messageDelay: number;
  /** Timeout threshold (ms) */
  timeoutThreshold: number;
  /** Enable accessibility announcements */
  announceChanges: boolean;
}

/**
 * Loading context value
 */
export interface LoadingContextValue {
  state: LoadingState;
  phase: LoadingPhase;
  message: string | null;
  progress: number | null;
  error: Error | null;
  startLoading: (message?: string) => void;
  stopLoading: () => void;
  setProgress: (progress: number) => void;
  setError: (error: Error) => void;
  reset: () => void;
}

/**
 * Loading provider props
 */
export interface LoadingProviderProps {
  children: ReactNode;
  config?: Partial<LoadingConfig>;
  onTimeout?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Loading indicator props
 */
export interface LoadingIndicatorProps {
  /** Loading state override */
  loading?: boolean;
  /** Minimum display time */
  minDisplayTime?: number;
  /** Delay before showing */
  delay?: number;
  /** Loading message */
  message?: string;
  /** Show spinner */
  showSpinner?: boolean;
  /** Spinner size */
  size?: 'sm' | 'md' | 'lg';
  /** Custom spinner component */
  spinner?: ReactNode;
  /** Overlay mode */
  overlay?: boolean;
  /** Full screen mode */
  fullScreen?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Progressive loader props
 */
export interface ProgressiveLoaderProps {
  /** Loading state */
  loading: boolean;
  /** Error state */
  error?: Error | null;
  /** Success component */
  children: ReactNode;
  /** Initial placeholder */
  initialPlaceholder?: ReactNode;
  /** Spinner placeholder */
  spinnerPlaceholder?: ReactNode;
  /** Skeleton placeholder */
  skeletonPlaceholder?: ReactNode;
  /** Timeout message */
  timeoutMessage?: ReactNode;
  /** Error fallback */
  errorFallback?: (error: Error, retry: () => void) => ReactNode;
  /** Configuration */
  config?: Partial<LoadingConfig>;
  /** Retry function */
  onRetry?: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: LoadingConfig = {
  minDisplayTime: 300,
  spinnerDelay: 100,
  skeletonDelay: 500,
  messageDelay: 2000,
  timeoutThreshold: 10000,
  announceChanges: true,
};

// ============================================================================
// Context
// ============================================================================

/**
 * Use loading context
 */
export function useLoading(): LoadingContextValue {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}

/**
 * Use optional loading context (returns null if not in provider)
 */
export function useOptionalLoading(): LoadingContextValue | null {
  return useContext(LoadingContext);
}

// ============================================================================
// Loading Provider
// ============================================================================

/**
 * Loading state provider
 */
export function LoadingProvider({
  children,
  config: configOverride,
  onTimeout,
  onError,
}: LoadingProviderProps): JSX.Element {
  const config = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...configOverride }),
    [configOverride]
  );

  const [state, setState] = useState<LoadingState>('idle');
  const [phase, setPhase] = useState<LoadingPhase>('initial');
  const [message, setMessage] = useState<string | null>(null);
  const [progress, setProgressValue] = useState<number | null>(null);
  const [error, setErrorValue] = useState<Error | null>(null);

  const loadingStartTime = useRef<number>(0);
  const timeoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseTimers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (timeoutTimer.current) {
      clearTimeout(timeoutTimer.current);
      timeoutTimer.current = null;
    }
    phaseTimers.current.forEach((timer) => clearTimeout(timer));
    phaseTimers.current = [];
  }, []);

  // Start loading
  const startLoading = useCallback(
    (loadingMessage?: string) => {
      clearTimers();
      loadingStartTime.current = Date.now();
      setState('loading');
      setPhase('initial');
      setMessage(loadingMessage || null);
      setProgressValue(null);
      setErrorValue(null);

      // Progressive phase transitions
      phaseTimers.current.push(
        setTimeout(() => setPhase('spinner'), config.spinnerDelay)
      );
      phaseTimers.current.push(
        setTimeout(() => setPhase('skeleton'), config.skeletonDelay)
      );
      phaseTimers.current.push(
        setTimeout(() => setPhase('message'), config.messageDelay)
      );

      // Timeout handling
      timeoutTimer.current = setTimeout(() => {
        setState('timeout');
        setPhase('timeout');
        onTimeout?.();
      }, config.timeoutThreshold);

      // Announce for screen readers
      if (config.announceChanges) {
        announce('Loading started');
      }
    },
    [config, clearTimers, onTimeout]
  );

  // Stop loading
  const stopLoading = useCallback(() => {
    const elapsed = Date.now() - loadingStartTime.current;
    const remaining = Math.max(0, config.minDisplayTime - elapsed);

    const complete = (): void => {
      clearTimers();
      setState('success');
      setPhase('initial');

      if (config.announceChanges) {
        announce('Loading complete');
      }
    };

    if (remaining > 0) {
      setTimeout(complete, remaining);
    } else {
      complete();
    }
  }, [config, clearTimers]);

  // Set progress
  const setProgress = useCallback((value: number) => {
    setProgressValue(Math.max(0, Math.min(100, value)));
  }, []);

  // Set error
  const setError = useCallback(
    (err: Error) => {
      clearTimers();
      setState('error');
      setPhase('initial');
      setErrorValue(err);
      onError?.(err);

      if (config.announceChanges) {
        announce(`Error: ${err.message}`, 'assertive');
      }
    },
    [config, clearTimers, onError]
  );

  // Reset
  const reset = useCallback(() => {
    clearTimers();
    setState('idle');
    setPhase('initial');
    setMessage(null);
    setProgressValue(null);
    setErrorValue(null);
  }, [clearTimers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const value = useMemo(
    () => ({
      state,
      phase,
      message,
      progress,
      error,
      startLoading,
      stopLoading,
      setProgress,
      setError,
      reset,
    }),
    [
      state,
      phase,
      message,
      progress,
      error,
      startLoading,
      stopLoading,
      setProgress,
      setError,
      reset,
    ]
  );

  return (
    <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>
  );
}

// ============================================================================
// Loading Indicator Component
// ============================================================================

/**
 * Loading indicator with delay and minimum display time
 */
export function LoadingIndicator({
  loading = false,
  minDisplayTime = DEFAULT_CONFIG.minDisplayTime,
  delay = DEFAULT_CONFIG.spinnerDelay,
  message,
  showSpinner = true,
  size = 'md',
  spinner,
  overlay = false,
  fullScreen = false,
  className = '',
}: LoadingIndicatorProps): JSX.Element | null {
  const [visible, setVisible] = useState(false);
  const loadingStartTime = useRef<number>(0);
  const delayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (loading) {
      loadingStartTime.current = Date.now();
      delayTimer.current = setTimeout(() => {
        setVisible(true);
      }, delay);
    } else {
      if (delayTimer.current) {
        clearTimeout(delayTimer.current);
        delayTimer.current = null;
      }

      if (visible) {
        const elapsed = Date.now() - loadingStartTime.current;
        const remaining = Math.max(0, minDisplayTime - elapsed);

        if (remaining > 0) {
          setTimeout(() => setVisible(false), remaining);
        } else {
          setVisible(false);
        }
      }
    }

    return () => {
      if (delayTimer.current) {
        clearTimeout(delayTimer.current);
      }
    };
  }, [loading, delay, minDisplayTime, visible]);

  if (!visible) {
    return null;
  }

  const sizeClasses = {
    sm: 'loading-indicator--sm',
    md: 'loading-indicator--md',
    lg: 'loading-indicator--lg',
  };

  const containerClasses = [
    'loading-indicator',
    sizeClasses[size],
    overlay && 'loading-indicator--overlay',
    fullScreen && 'loading-indicator--fullscreen',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={containerClasses}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {showSpinner && (spinner || <DefaultSpinner size={size} />)}
      {message && (
        <span className="loading-indicator__message">{message}</span>
      )}
      <span className="sr-only">Loading{message ? `: ${message}` : ''}...</span>
    </div>
  );
}

// ============================================================================
// Progressive Loader Component
// ============================================================================

/**
 * Progressive loader with phased placeholders
 */
export function ProgressiveLoader({
  loading,
  error,
  children,
  initialPlaceholder,
  spinnerPlaceholder,
  skeletonPlaceholder,
  timeoutMessage,
  errorFallback,
  config: configOverride,
  onRetry,
}: ProgressiveLoaderProps): JSX.Element {
  const config = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...configOverride }),
    [configOverride]
  );

  const [phase, setPhase] = useState<LoadingPhase>('initial');
  const [timedOut, setTimedOut] = useState(false);
  const phaseTimers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  useEffect(() => {
    if (loading) {
      setPhase('initial');
      setTimedOut(false);

      // Clear previous timers
      phaseTimers.current.forEach((timer) => clearTimeout(timer));
      phaseTimers.current = [];

      // Set up phase transitions
      phaseTimers.current.push(
        setTimeout(() => setPhase('spinner'), config.spinnerDelay)
      );

      if (skeletonPlaceholder) {
        phaseTimers.current.push(
          setTimeout(() => setPhase('skeleton'), config.skeletonDelay)
        );
      }

      phaseTimers.current.push(
        setTimeout(() => setPhase('message'), config.messageDelay)
      );

      phaseTimers.current.push(
        setTimeout(() => {
          setPhase('timeout');
          setTimedOut(true);
        }, config.timeoutThreshold)
      );
    } else {
      // Clear timers on complete
      phaseTimers.current.forEach((timer) => clearTimeout(timer));
      phaseTimers.current = [];
      setPhase('initial');
    }

    return () => {
      phaseTimers.current.forEach((timer) => clearTimeout(timer));
    };
  }, [loading, config, skeletonPlaceholder]);

  // Error state
  if (error) {
    if (errorFallback) {
      return <>{errorFallback(error, onRetry || (() => {}))}</>;
    }

    return (
      <div className="progressive-loader__error" role="alert">
        <p>An error occurred: {error.message}</p>
        {onRetry && (
          <button onClick={onRetry} className="progressive-loader__retry">
            Retry
          </button>
        )}
      </div>
    );
  }

  // Success state
  if (!loading && !timedOut) {
    return <>{children}</>;
  }

  // Timeout state
  if (timedOut) {
    return (
      <div className="progressive-loader__timeout" role="alert">
        {timeoutMessage || (
          <>
            <p>This is taking longer than expected.</p>
            {onRetry && (
              <button onClick={onRetry} className="progressive-loader__retry">
                Retry
              </button>
            )}
          </>
        )}
      </div>
    );
  }

  // Loading phases
  switch (phase) {
    case 'initial':
      return <>{initialPlaceholder || null}</>;

    case 'spinner':
      return (
        <>
          {spinnerPlaceholder || (
            <div className="progressive-loader__spinner">
              <DefaultSpinner size="md" />
            </div>
          )}
        </>
      );

    case 'skeleton':
      return <>{skeletonPlaceholder || spinnerPlaceholder || <DefaultSpinner size="md" />}</>;

    case 'message':
      return (
        <div className="progressive-loader__message">
          {skeletonPlaceholder || <DefaultSpinner size="md" />}
          <p>Still loading...</p>
        </div>
      );

    default:
      return <>{spinnerPlaceholder || <DefaultSpinner size="md" />}</>;
  }
}

// ============================================================================
// Default Spinner - Re-exports canonical Spinner component
// ============================================================================

interface DefaultSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

/**
 * DefaultSpinner wraps the canonical Spinner component from ui/feedback/Spinner.
 * This consolidates spinner implementations to a single source of truth.
 * Use Spinner directly for more control over variants and colors.
 */
function DefaultSpinner({ size = 'md' }: DefaultSpinnerProps): JSX.Element {
  return <Spinner size={size} variant="primary" label="Loading" />;
}

// ============================================================================
// Progress Bar
// ============================================================================

export interface ProgressBarProps {
  /** Progress value (0-100) */
  value: number;
  /** Show percentage text */
  showPercentage?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Color variant */
  variant?: 'primary' | 'success' | 'warning' | 'error';
  /** Animated progress */
  animated?: boolean;
  /** Striped pattern */
  striped?: boolean;
  /** Indeterminate state */
  indeterminate?: boolean;
  /** Custom label */
  label?: string;
  /** Additional class names */
  className?: string;
}

/**
 * Progress bar component
 */
export function ProgressBar({
  value,
  showPercentage = false,
  size = 'md',
  variant = 'primary',
  animated = false,
  striped = false,
  indeterminate = false,
  label,
  className = '',
}: ProgressBarProps): JSX.Element {
  const clampedValue = Math.max(0, Math.min(100, value));

  const containerClasses = [
    'progress-bar',
    `progress-bar--${size}`,
    `progress-bar--${variant}`,
    animated && 'progress-bar--animated',
    striped && 'progress-bar--striped',
    indeterminate && 'progress-bar--indeterminate',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={containerClasses}
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || 'Progress'}
    >
      <div
        className="progress-bar__fill"
        style={{ width: indeterminate ? undefined : `${clampedValue}%` }}
      />
      {showPercentage && !indeterminate && (
        <span className="progress-bar__text">{Math.round(clampedValue)}%</span>
      )}
    </div>
  );
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook for managing async loading state
 */
export function useLoadingState(
  config: Partial<LoadingConfig> = {}
): {
  isLoading: boolean;
  phase: LoadingPhase;
  error: Error | null;
  startLoading: () => void;
  stopLoading: () => void;
  setError: (error: Error) => void;
  reset: () => void;
  wrapAsync: <T>(promise: Promise<T>) => Promise<T>;
} {
  const fullConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);
  const [isLoading, setIsLoading] = useState(false);
  const [phase, setPhase] = useState<LoadingPhase>('initial');
  const [error, setErrorState] = useState<Error | null>(null);
  const loadingStartTime = useRef<number>(0);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current = [];
  }, []);

  const startLoading = useCallback(() => {
    clearTimers();
    loadingStartTime.current = Date.now();
    setIsLoading(true);
    setPhase('initial');
    setErrorState(null);

    timers.current.push(
      setTimeout(() => setPhase('spinner'), fullConfig.spinnerDelay)
    );
    timers.current.push(
      setTimeout(() => setPhase('skeleton'), fullConfig.skeletonDelay)
    );
    timers.current.push(
      setTimeout(() => setPhase('message'), fullConfig.messageDelay)
    );
    timers.current.push(
      setTimeout(() => setPhase('timeout'), fullConfig.timeoutThreshold)
    );
  }, [fullConfig, clearTimers]);

  const stopLoading = useCallback(() => {
    const elapsed = Date.now() - loadingStartTime.current;
    const remaining = Math.max(0, fullConfig.minDisplayTime - elapsed);

    const complete = (): void => {
      clearTimers();
      setIsLoading(false);
      setPhase('initial');
    };

    if (remaining > 0) {
      setTimeout(complete, remaining);
    } else {
      complete();
    }
  }, [fullConfig, clearTimers]);

  const setError = useCallback(
    (err: Error) => {
      clearTimers();
      setIsLoading(false);
      setPhase('initial');
      setErrorState(err);
    },
    [clearTimers]
  );

  const reset = useCallback(() => {
    clearTimers();
    setIsLoading(false);
    setPhase('initial');
    setErrorState(null);
  }, [clearTimers]);

  const wrapAsync = useCallback(
    async <T,>(promise: Promise<T>): Promise<T> => {
      startLoading();
      try {
        const result = await promise;
        stopLoading();
        return result;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
    },
    [startLoading, stopLoading, setError]
  );

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  return {
    isLoading,
    phase,
    error,
    startLoading,
    stopLoading,
    setError,
    reset,
    wrapAsync,
  };
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * CSS for loading states (include in your stylesheets)
 */
export const loadingStateStyles = `
  .loading-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .loading-indicator--sm { font-size: 0.875rem; }
  .loading-indicator--md { font-size: 1rem; }
  .loading-indicator--lg { font-size: 1.25rem; }

  .loading-indicator--overlay {
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.8);
    z-index: 100;
  }

  .loading-indicator--fullscreen {
    position: fixed;
    inset: 0;
    background: rgba(255, 255, 255, 0.95);
    z-index: 9999;
  }

  .loading-spinner {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .progress-bar {
    position: relative;
    width: 100%;
    background: #e5e7eb;
    border-radius: 9999px;
    overflow: hidden;
  }

  .progress-bar--sm { height: 0.25rem; }
  .progress-bar--md { height: 0.5rem; }
  .progress-bar--lg { height: 1rem; }

  .progress-bar__fill {
    height: 100%;
    background: currentColor;
    transition: width 0.3s ease;
  }

  .progress-bar--primary { color: #3b82f6; }
  .progress-bar--success { color: #22c55e; }
  .progress-bar--warning { color: #f59e0b; }
  .progress-bar--error { color: #ef4444; }

  .progress-bar--indeterminate .progress-bar__fill {
    width: 30%;
    animation: indeterminate 1.5s infinite linear;
  }

  @keyframes indeterminate {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(400%); }
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
`;
