/**
 * @file Error Recovery Hooks
 * @description React hooks for error handling and recovery patterns
 *
 * These hooks provide consistent patterns for:
 * - Async operations with automatic retry
 * - Network-aware operations
 * - Optimistic updates with rollback
 * - Safe callbacks with error boundaries
 * - Error toast management
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { normalizeError, isRetryableError, type AppError } from '../monitoring/errorTypes';
import { ErrorReporter } from '../monitoring/ErrorReporter';
import { networkMonitor } from '../utils/networkStatus';
import { useIsMounted } from './shared/useIsMounted';

// ============================================================================
// Types
// ============================================================================

/**
 * Async operation state
 */
export interface AsyncState<T> {
  /** Operation result data */
  data: T | null;
  /** Error if operation failed */
  error: AppError | null;
  /** Whether operation is in progress */
  isLoading: boolean;
  /** Whether operation has errored */
  isError: boolean;
  /** Whether operation completed successfully */
  isSuccess: boolean;
  /** Number of retry attempts made */
  retryCount: number;
}

/**
 * Recovery options for async operations
 */
export interface RecoveryOptions {
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Initial retry delay in ms */
  retryDelay?: number;
  /** Whether to auto-retry on failure */
  autoRetry?: boolean;
  /** Whether to execute on mount */
  executeOnMount?: boolean;
  /** Callback on error */
  onError?: (error: AppError) => void;
  /** Callback on success */
  onSuccess?: <T>(data: T) => void;
  /** Callback on each retry */
  onRetry?: (attempt: number) => void;
}

/**
 * Async operation with recovery controls
 */
export interface AsyncWithRecovery<T> extends AsyncState<T> {
  /** Execute the async operation */
  execute: () => Promise<T | null>;
  /** Retry the operation */
  retry: () => Promise<T | null>;
  /** Reset state */
  reset: () => void;
}

// ============================================================================
// useAsyncWithRecovery
// ============================================================================

/**
 * Hook for async operations with automatic error recovery
 *
 * @example
 * ```tsx
 * function UserProfile({ userId }: { userId: string }) {
 *   const {
 *     data: user,
 *     isLoading,
 *     isError,
 *     error,
 *     execute,
 *     retry
 *   } = useAsyncWithRecovery(
 *     () => fetchUser(userId),
 *     {
 *       executeOnMount: true,
 *       maxRetries: 3,
 *       autoRetry: true,
 *       onError: (err) => toast.error(err.message)
 *     }
 *   );
 *
 *   if (isLoading) return <Skeleton />;
 *   if (isError) return <ErrorState onRetry={retry} />;
 *   return <UserCard user={user} />;
 * }
 * ```
 */
export function useAsyncWithRecovery<T>(
  asyncFn: () => Promise<T>,
  options: RecoveryOptions = {}
): AsyncWithRecovery<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    autoRetry = false,
    executeOnMount = false,
    onError,
    onSuccess,
    onRetry,
  } = options;

  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    isLoading: false,
    isError: false,
    isSuccess: false,
    retryCount: 0,
  });

  const isMounted = useIsMounted();
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);

  // Define execute before using it in the effect
  const executeRef = useRef<(() => Promise<T | null>) | null>(null);

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const execute = useCallback(async (): Promise<T | null> => {
    if (!isMounted()) return null;

    setState((prev) => ({
      ...prev,
      isLoading: true,
      isError: false,
      error: null,
    }));

    try {
      const result = await asyncFn();

      if (isMounted()) {
        setState({
          data: result,
          error: null,
          isLoading: false,
          isError: false,
          isSuccess: true,
          retryCount: 0,
        });
        retryCountRef.current = 0;
        onSuccess?.(result);
      }

      return result;
    } catch (err) {
      const appError = normalizeError(err);

      if (isMounted()) {
        const newRetryCount = retryCountRef.current;

        setState((prev) => ({
          ...prev,
          error: appError,
          isLoading: false,
          isError: true,
          isSuccess: false,
          retryCount: newRetryCount,
        }));

        onError?.(appError);

        // Auto-retry if enabled and error is retryable
        if (autoRetry && isRetryableError(appError) && newRetryCount < maxRetries) {
          const delay = retryDelay * Math.pow(2, newRetryCount);
          retryTimeoutRef.current = setTimeout(() => {
            if (isMounted() && executeRef.current != null) {
              retryCountRef.current++;
              onRetry?.(retryCountRef.current);
              void executeRef.current();
            }
          }, delay);
        }
      }

      return null;
    }
  }, [asyncFn, autoRetry, isMounted, maxRetries, onError, onRetry, onSuccess, retryDelay]);

  // Store execute in ref for use in timeout
  // eslint-disable-next-line react-hooks/refs
  executeRef.current = execute;

  const retry = useCallback(async (): Promise<T | null> => {
    if (!isMounted()) return null;

    retryCountRef.current++;
    setState((prev) => ({
      ...prev,
      retryCount: retryCountRef.current,
    }));

    onRetry?.(retryCountRef.current);
    return execute();
  }, [execute, isMounted, onRetry]);

  const reset = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    retryCountRef.current = 0;
    setState({
      data: null,
      error: null,
      isLoading: false,
      isError: false,
      isSuccess: false,
      retryCount: 0,
    });
  }, []);

  // Execute on mount if requested
  useEffect(() => {
    if (executeOnMount) {
      void execute();
    }
  }, [executeOnMount, execute]);

  return {
    ...state,
    execute,
    retry,
    reset,
  };
}

// ============================================================================
// useNetworkAwareOperation
// ============================================================================

/**
 * Result of network-aware operation hook
 */
export interface NetworkAwareOperationResult<T> {
  /** Execute the operation */
  execute: () => Promise<T | null>;
  /** Current online status */
  isOnline: boolean;
  /** Whether waiting for network */
  isWaiting: boolean;
  /** Error if any */
  error: AppError | null;
}

/**
 * Hook for network-aware operations that wait for connectivity
 *
 * @example
 * ```tsx
 * function SyncButton() {
 *   const { execute, isOnline, isWaiting } = useNetworkAwareOperation(
 *     () => syncData(),
 *     { requiresNetwork: true, waitForOnline: true }
 *   );
 *
 *   return (
 *     <button onClick={execute} disabled={isWaiting}>
 *       {isWaiting ? 'Waiting for connection...' : 'Sync'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useNetworkAwareOperation<T>(
  operation: () => Promise<T>,
  options: {
    /** Whether operation requires network */
    requiresNetwork?: boolean;
    /** Whether to wait for online status */
    waitForOnline?: boolean;
    /** Timeout for waiting (ms) */
    onlineTimeout?: number;
  } = {}
): NetworkAwareOperationResult<T> {
  const {
    requiresNetwork = true,
    waitForOnline = true,
    onlineTimeout = 30000,
  } = options;

  const [isOnline, setIsOnline] = useState(() => networkMonitor.isOnline());
  const [isWaiting, setIsWaiting] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  useEffect(() => {
    return networkMonitor.onStatusChange((status) => {
      setIsOnline(status.online);
    });
  }, []);

  const execute = useCallback(async (): Promise<T | null> => {
    setError(null);

    if (requiresNetwork && !networkMonitor.isOnline()) {
      if (waitForOnline) {
        setIsWaiting(true);
        const online = await networkMonitor.waitForOnline(onlineTimeout);
        setIsWaiting(false);

        if (!online) {
          const offlineError = normalizeError(new Error('Network unavailable'));
          setError(offlineError);
          return null;
        }
      } else {
        const offlineError = normalizeError(new Error('Network unavailable'));
        setError(offlineError);
        return null;
      }
    }

    try {
      return await operation();
    } catch (err) {
      const appError = normalizeError(err);
      setError(appError);
      return null;
    }
  }, [operation, requiresNetwork, waitForOnline, onlineTimeout]);

  return {
    execute,
    isOnline,
    isWaiting,
    error,
  };
}

// ============================================================================
// useOptimisticUpdate
// ============================================================================

/**
 * Result of optimistic update hook
 */
export interface OptimisticUpdateResult<T, U> {
  /** Current value (optimistic or confirmed) */
  value: T;
  /** Perform optimistic update */
  update: (optimisticValue: T, updateData: U) => Promise<void>;
  /** Whether update is pending */
  isPending: boolean;
  /** Error if update failed */
  error: AppError | null;
}

/**
 * Hook for optimistic updates with automatic rollback on failure
 *
 * @example
 * ```tsx
 * function LikeButton({ post }: { post: Post }) {
 *   const { value: likes, update, isPending } = useOptimisticUpdate(
 *     post.likes,
 *     (newLikes) => updatePostLikes(post.id, newLikes),
 *     { onRollback: () => toast.error('Failed to like') }
 *   );
 *
 *   const handleLike = () => {
 *     update(likes + 1, likes + 1);
 *   };
 *
 *   return (
 *     <button onClick={handleLike} disabled={isPending}>
 *       {likes} likes
 *     </button>
 *   );
 * }
 * ```
 */
export function useOptimisticUpdate<T, U>(
  currentValue: T,
  updateFn: (update: U) => Promise<T>,
  options: {
    /** Callback when rollback occurs */
    onRollback?: (original: T, error: AppError) => void;
    /** Callback on successful update */
    onSuccess?: (newValue: T) => void;
  } = {}
): OptimisticUpdateResult<T, U> {
  const [value, setValue] = useState<T>(currentValue);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const originalValueRef = useRef<T>(currentValue);

  // Sync with external value
  useEffect(() => {
    setValue(currentValue);
    originalValueRef.current = currentValue;
  }, [currentValue]);

  const update = useCallback(
    async (optimisticValue: T, updateData: U): Promise<void> => {
      const original = originalValueRef.current;

      // Apply optimistic update
      setValue(optimisticValue);
      setIsPending(true);
      setError(null);

      try {
        const result = await updateFn(updateData);
        setValue(result);
        originalValueRef.current = result;
        options.onSuccess?.(result);
      } catch (err) {
        const appError = normalizeError(err);

        // Rollback to original
        setValue(original);
        setError(appError);
        options.onRollback?.(original, appError);

        ErrorReporter.reportError(err, {
          action: 'optimistic_update_rollback',
        });
      } finally {
        setIsPending(false);
      }
    },
    [updateFn, options]
  );

  return {
    value,
    update,
    isPending,
    error,
  };
}

// ============================================================================
// useSafeCallback
// ============================================================================

/**
 * Result of safe callback hook
 */
export interface SafeCallbackResult<Args extends unknown[], Return> {
  /** Execute callback with error handling */
  execute: (...args: Args) => Promise<Return | undefined>;
  /** Error if callback failed */
  error: AppError | null;
  /** Clear error state */
  clearError: () => void;
}

/**
 * Hook that wraps a callback with error handling
 *
 * @example
 * ```tsx
 * function DeleteButton({ onDelete }: { onDelete: () => Promise<void> }) {
 *   const { execute, error, clearError } = useSafeCallback(onDelete, {
 *     onError: (err) => console.error('Delete failed:', err),
 *     reportError: true
 *   });
 *
 *   return (
 *     <>
 *       <button onClick={execute}>Delete</button>
 *       {error && <p>Error: {error.message}</p>}
 *     </>
 *   );
 * }
 * ```
 */
export function useSafeCallback<Args extends unknown[], Return>(
  callback: (...args: Args) => Return | Promise<Return>,
  options: {
    /** Callback on error */
    onError?: (error: AppError) => void;
    /** Fallback return value on error */
    fallbackValue?: Return;
    /** Whether to report errors */
    reportError?: boolean;
  } = {}
): SafeCallbackResult<Args, Return> {
  const { onError, fallbackValue, reportError = true } = options;
  const [error, setError] = useState<AppError | null>(null);

  const execute = useCallback(
    async (...args: Args): Promise<Return | undefined> => {
      setError(null);

      try {
        const result = await callback(...args);
        return result;
      } catch (err) {
        const appError = normalizeError(err);
        setError(appError);
        onError?.(appError);

        if (reportError) {
          ErrorReporter.reportError(err, {
            action: 'safe_callback_error',
          });
        }

        return fallbackValue;
      }
    },
    [callback, onError, fallbackValue, reportError]
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    execute,
    error,
    clearError,
  };
}

// ============================================================================
// useErrorToast
// ============================================================================

/**
 * Toast error entry
 */
export interface ToastEntry {
  id: string;
  error: AppError;
}

/**
 * Result of error toast hook
 */
export interface ErrorToastResult {
  /** Current toast entries */
  toasts: ToastEntry[];
  /** Show error toast */
  showError: (error: unknown) => void;
  /** Dismiss specific toast */
  dismissToast: (id: string) => void;
  /** Clear all toasts */
  clearAll: () => void;
}

/**
 * Hook for managing error toasts with auto-dismiss
 *
 * @example
 * ```tsx
 * function App() {
 *   const { toasts, showError, dismissToast } = useErrorToast({
 *     duration: 5000,
 *     maxToasts: 3
 *   });
 *
 *   return (
 *     <>
 *       <ErrorToastContainer>
 *         {toasts.map(t => (
 *           <Toast key={t.id} error={t.error} onDismiss={() => dismissToast(t.id)} />
 *         ))}
 *       </ErrorToastContainer>
 *       {// Pass showError to child components //}
 *     </>
 *   );
 * }
 * ```
 */
export function useErrorToast(
  options: {
    /** Auto-dismiss duration in ms */
    duration?: number;
    /** Maximum toasts to show */
    maxToasts?: number;
  } = {}
): ErrorToastResult {
  const { duration = 5000, maxToasts = 3 } = options;
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const showError = useCallback(
    (error: unknown) => {
      const appError = normalizeError(error);
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      setToasts((prev) => {
        const newToasts = [...prev, { id, error: appError }];
        // Limit to maxToasts
        return newToasts.slice(-maxToasts);
      });

      // Auto-dismiss
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    },
    [duration, maxToasts]
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    showError,
    dismissToast,
    clearAll,
  };
}

// ============================================================================
// useRecoveryState
// ============================================================================

/**
 * Recovery state for component error handling
 */
export interface RecoveryState {
  /** Current error if any */
  error: AppError | null;
  /** Number of recovery attempts */
  recoveryAttempts: number;
  /** Whether currently recovering */
  isRecovering: boolean;
  /** Set error state */
  setError: (error: unknown) => void;
  /** Clear error state */
  clearError: () => void;
  /** Attempt recovery */
  attemptRecovery: (recoveryFn: () => Promise<void>) => Promise<boolean>;
  /** Reset all state */
  reset: () => void;
}

/**
 * Hook for managing component-level error recovery state
 *
 * @example
 * ```tsx
 * function DataFetcher() {
 *   const recovery = useRecoveryState({ maxAttempts: 3 });
 *
 *   useEffect(() => {
 *     fetchData().catch(recovery.setError);
 *   }, []);
 *
 *   if (recovery.error) {
 *     return (
 *       <ErrorDisplay
 *         error={recovery.error}
 *         onRetry={() => recovery.attemptRecovery(() => fetchData())}
 *         isRetrying={recovery.isRecovering}
 *       />
 *     );
 *   }
 *
 *   return <DataDisplay />;
 * }
 * ```
 */
export function useRecoveryState(
  options: {
    /** Maximum recovery attempts */
    maxAttempts?: number;
    /** Callback when max attempts reached */
    onMaxAttemptsReached?: (error: AppError) => void;
  } = {}
): RecoveryState {
  const { maxAttempts = 3, onMaxAttemptsReached } = options;

  const [error, setErrorState] = useState<AppError | null>(null);
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false);

  const setError = useCallback((err: unknown) => {
    setErrorState(normalizeError(err));
  }, []);

  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);

  const attemptRecovery = useCallback(
    async (recoveryFn: () => Promise<void>): Promise<boolean> => {
      if (recoveryAttempts >= maxAttempts) {
        if (error) {
          onMaxAttemptsReached?.(error);
        }
        return false;
      }

      setIsRecovering(true);
      setRecoveryAttempts((prev) => prev + 1);

      try {
        await recoveryFn();
        setErrorState(null);
        setRecoveryAttempts(0);
        return true;
      } catch (err) {
        const appError = normalizeError(err);
        setErrorState(appError);

        if (recoveryAttempts + 1 >= maxAttempts) {
          onMaxAttemptsReached?.(appError);
        }

        return false;
      } finally {
        setIsRecovering(false);
      }
    },
    [error, recoveryAttempts, maxAttempts, onMaxAttemptsReached]
  );

  const reset = useCallback(() => {
    setErrorState(null);
    setRecoveryAttempts(0);
    setIsRecovering(false);
  }, []);

  return {
    error,
    recoveryAttempts,
    isRecovering,
    setError,
    clearError,
    attemptRecovery,
    reset,
  };
}

// ============================================================================
// useErrorContext
// ============================================================================

/**
 * Contextual error information for better UX
 */
export interface ErrorContext {
  /** User action that triggered the error */
  action: string;
  /** Resource being accessed */
  resource?: string;
  /** Feature name */
  feature?: string;
}

/**
 * Hook for managing contextual error information
 *
 * @example
 * ```tsx
 * function UserEditor() {
 *   const errorContext = useErrorContext({
 *     action: 'update profile',
 *     resource: 'user settings',
 *     feature: 'Profile'
 *   });
 *
 *   const handleSave = async () => {
 *     try {
 *       await saveProfile();
 *     } catch (err) {
 *       // Error will have context attached
 *       errorContext.reportError(err);
 *     }
 *   };
 *
 *   return <Form onSubmit={handleSave} />;
 * }
 * ```
 */
export function useErrorContext(context: ErrorContext): {
  context: ErrorContext;
  reportError: (error: unknown) => void;
  createContextualError: (error: unknown) => AppError;
} {
  const contextRef = useRef(context);
  // eslint-disable-next-line react-hooks/refs
  contextRef.current = context;

  const reportError = useCallback((error: unknown) => {
    ErrorReporter.reportError(error, {
      action: contextRef.current.action,
      metadata: {
        resource: contextRef.current.resource,
        feature: contextRef.current.feature,
      },
    });
  }, []);

  const createContextualError = useCallback(
    (error: unknown): AppError => {
      const appError = normalizeError(error);
      return {
        ...appError,
        context: {
          ...contextRef.current,
        },
      } as AppError;
    },
    []
  );

  return {
    context,
    reportError,
    createContextualError,
  };
}
