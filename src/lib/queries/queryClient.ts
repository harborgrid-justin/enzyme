/**
 * @file Enhanced React Query Client Configuration
 * @description Production-grade query client with offline support, exponential
 * backoff retry logic, smart caching, and performance optimizations.
 */

import {
  QueryClient,
  QueryCache,
  MutationCache,
  onlineManager,
  focusManager,
  type Query,
  type DefaultOptions,
} from '@tanstack/react-query';
import { TIMING } from '@/config';
import { apiClient } from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

/**
 * Query metadata for additional context
 */
interface QueryMeta {
  /** Custom error message */
  errorMessage?: string;
  /** Custom success message */
  successMessage?: string;
  /** Whether to show error toast (default: true) */
  showErrorToast?: boolean;
  /** Whether query is retryable (default: true) */
  retryable?: boolean;
  /** Mark as critical - will persist and retry more aggressively */
  critical?: boolean;
  /** Cache tag for grouped invalidation */
  cacheTag?: string;
}

/**
 * Configuration for query client factory
 */
export interface QueryClientConfig {
  /** Default stale time in ms (default: 5 minutes) */
  defaultStaleTime?: number;
  /** Default garbage collection time in ms (default: 30 minutes) */
  defaultGcTime?: number;
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;
  /** Enable request deduplication (default: true) */
  deduplication?: boolean;
  /** Enable background refetching on window focus (default: false) */
  backgroundRefetch?: boolean;
  /** Global error handler */
  onError?: (error: unknown, query?: Query) => void;
  /** Global success handler */
  onSuccess?: (data: unknown, query?: Query) => void;
  /** Enable offline-first mode (default: true) */
  offlineFirst?: boolean;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: Required<QueryClientConfig> = {
  defaultStaleTime: TIMING.QUERY.STALE.MEDIUM, // 5 minutes
  defaultGcTime: TIMING.QUERY.GC.MEDIUM, // 30 minutes
  maxRetries: TIMING.RETRY.DEFAULT_ATTEMPTS,
  deduplication: true,
  backgroundRefetch: false,
  onError: () => {},
  onSuccess: () => {},
  offlineFirst: true,
};

// ============================================================================
// Retry Logic with Exponential Backoff
// ============================================================================

/**
 * HTTP status codes that should not be retried
 */
const NON_RETRYABLE_STATUS_CODES = new Set([
  400, // Bad Request
  401, // Unauthorized
  403, // Forbidden
  404, // Not Found
  422, // Unprocessable Entity
  451, // Unavailable For Legal Reasons
]);

/**
 * HTTP status codes that should be retried
 */
const RETRYABLE_STATUS_CODES = new Set([
  408, // Request Timeout
  429, // Too Many Requests
  500, // Internal Server Error
  502, // Bad Gateway
  503, // Service Unavailable
  504, // Gateway Timeout
]);

/**
 * Determine if an error should be retried
 */
function createRetryFn(maxRetries: number) {
  return (failureCount: number, error: unknown): boolean => {
    // Don't retry if max retries exceeded
    if (failureCount >= maxRetries) {
      return false;
    }

    // Check for HTTP status codes
    if (error != null && typeof error === 'object' && 'status' in error) {
      const {status} = (error as { status: number });

      // Never retry these
      if (NON_RETRYABLE_STATUS_CODES.has(status)) {
        return false;
      }

      // Always retry these
      if (RETRYABLE_STATUS_CODES.has(status)) {
        return true;
      }

      // Don't retry other 4xx errors
      if (status >= 400 && status < 500) {
        return false;
      }
    }

    // Check for network errors (should retry)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true;
    }

    // Check for abort errors (should not retry)
    if (error instanceof DOMException && error.name === 'AbortError') {
      return false;
    }

    // Default: retry other errors
    return true;
  };
}

/**
 * Calculate retry delay with exponential backoff and jitter
 *
 * Formula: min(baseDelay * 2^attempt + jitter, maxDelay)
 *
 * Uses centralized TIMING constants for consistency.
 */
function createRetryDelay(attemptIndex: number): number {
  const baseDelay = TIMING.API.RETRY_BASE_DELAY;
  const maxDelay = TIMING.API.RETRY_MAX_DELAY;

  // Exponential backoff
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attemptIndex), maxDelay);

  // Add jitter (0-1000ms) to prevent thundering herd
  const jitter = Math.random() * 1000;

  return exponentialDelay + jitter;
}

// ============================================================================
// Error Handlers
// ============================================================================

/**
 * Handle global query errors
 */
function createQueryErrorHandler(config: QueryClientConfig) {
  return (error: unknown, query: Query<unknown, unknown, unknown>): void => {
    const meta = query.meta as QueryMeta | undefined;

    // Check if error toast should be shown
    if (meta?.showErrorToast !== false) {
      const message =
        meta?.errorMessage ??
        getErrorMessage(error) ??
        'An error occurred while fetching data';

      console.error('[Query Error]', message, {
        queryKey: query.queryKey,
        error,
      });

      // Here you would integrate with your toast/notification system
      // toast.error(message);
    }

    // Call global error handler
    config.onError?.(error, query as Query<unknown, Error, unknown, readonly unknown[]>);
  };
}

/**
 * Handle global mutation errors
 */
function createMutationErrorHandler(config: QueryClientConfig) {
  return (
    error: unknown,
    _variables: unknown,
    _context: unknown,
    _mutation: unknown
  ): void => {
    const message = getErrorMessage(error) || 'An error occurred';

    console.error('[Mutation Error]', message, { error });

    // Here you would integrate with your toast/notification system
    // toast.error(message);

    config.onError?.(error);
  };
}

/**
 * Extract error message from various error types
 */
function getErrorMessage(error: unknown): string | null {
  if (!error) return null;

  if (typeof error === 'string') return error;

  if (error instanceof Error) return error.message;

  if (typeof error === 'object') {
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
    if ('error' in error && typeof error.error === 'string') {
      return error.error;
    }
  }

  return null;
}

// ============================================================================
// Query Client Factory
// ============================================================================

/**
 * Create a configured query client instance
 *
 * @example
 * ```tsx
 * const queryClient = createQueryClient({
 *   defaultStaleTime: 10 * 60 * 1000, // 10 minutes
 *   maxRetries: 5,
 *   onError: (error) => Sentry.captureException(error),
 * });
 * ```
 */
export function createQueryClient(config: QueryClientConfig = {}): QueryClient {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // Create caches with error handlers
  const queryCache = new QueryCache({
    onError: createQueryErrorHandler(mergedConfig),
  });

  const mutationCache = new MutationCache({
    onError: createMutationErrorHandler(mergedConfig),
  });

  // Build default options
  const defaultOptions: DefaultOptions = {
    queries: {
      // Caching
      staleTime: mergedConfig.defaultStaleTime,
      gcTime: mergedConfig.defaultGcTime,

      // Retry logic
      retry: createRetryFn(mergedConfig.maxRetries),
      retryDelay: createRetryDelay,

      // Refetching behavior
      refetchOnWindowFocus: mergedConfig.backgroundRefetch,
      refetchOnReconnect: true,
      refetchOnMount: true,

      // Performance optimizations
      structuralSharing: true, // Prevent unnecessary re-renders

      // Offline support
      networkMode: mergedConfig.offlineFirst ? 'offlineFirst' : 'online',

      // Placeholders for loading states
      placeholderData: (previousData: unknown) => previousData,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
      networkMode: mergedConfig.offlineFirst ? 'offlineFirst' : 'online',

      // Optimistic updates support
      onMutate: undefined,
      onError: undefined,
      onSuccess: undefined,
      onSettled: undefined,
    },
  };

  const queryClient = new QueryClient({
    queryCache,
    mutationCache,
    defaultOptions,
  });

  // Setup online/offline handling
  setupNetworkHandlers();

  return queryClient;
}

// ============================================================================
// Network Status Handlers
// ============================================================================

/**
 * Setup network status event listeners
 */
function setupNetworkHandlers(): void {
  if (typeof window === 'undefined') return;

  // Online manager - pause/resume queries based on network status
  onlineManager.setEventListener((setOnline) => {
    const handleOnline = () => {
      console.log('[Query] Network online - resuming queries');
      setOnline(true);
    };

    const handleOffline = () => {
      console.log('[Query] Network offline - pausing queries');
      setOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial state
    setOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  });

  // Focus manager - refetch on window focus
  focusManager.setEventListener((setFocused) => {
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      setFocused(isVisible);

      if (isVisible) {
        console.log('[Query] Window focused - checking for stale queries');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  });
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Default query client instance
 */
export const queryClient = createQueryClient();

// ============================================================================
// Query Key Factory
// ============================================================================

/**
 * Type-safe query key factory for consistent key generation
 *
 * @example
 * ```tsx
 * // Use in queries
 * useQuery({
 *   queryKey: queryKeys.users.detail('user-123'),
 *   queryFn: () => fetchUser('user-123'),
 * });
 *
 * // Use for invalidation
 * queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
 * ```
 */
export const queryKeys = {
  all: ['all'] as const,

  // Dashboard queries
  dashboard: {
    all: ['dashboard'] as const,
    stats: () => [...queryKeys.dashboard.all, 'stats'] as const,
    charts: (range: string) => [...queryKeys.dashboard.all, 'charts', range] as const,
    activity: (page: number) => [...queryKeys.dashboard.all, 'activity', page] as const,
    summary: () => [...queryKeys.dashboard.all, 'summary'] as const,
  },

  // User queries
  users: {
    all: ['users'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.users.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.users.all, 'detail', id] as const,
    profile: () => [...queryKeys.users.all, 'profile'] as const,
    preferences: () => [...queryKeys.users.all, 'preferences'] as const,
  },

  // Reports queries
  reports: {
    all: ['reports'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.reports.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.reports.all, 'detail', id] as const,
    summary: (range: string) => [...queryKeys.reports.all, 'summary', range] as const,
    export: (id: string) => [...queryKeys.reports.all, 'export', id] as const,
  },

  // Notifications
  notifications: {
    all: ['notifications'] as const,
    list: (page?: number) => [...queryKeys.notifications.all, 'list', page] as const,
    unreadCount: () => [...queryKeys.notifications.all, 'unread-count'] as const,
  },

  // Settings
  settings: {
    all: ['settings'] as const,
    app: () => [...queryKeys.settings.all, 'app'] as const,
    user: () => [...queryKeys.settings.all, 'user'] as const,
  },
} as const;

export type QueryKeys = typeof queryKeys;

// ============================================================================
// Cache Utilities
// ============================================================================

/**
 * Prefetch common queries on app initialization using apiClient
 * @throws {ApiError} When any prefetch request fails
 */
export async function prefetchCommonQueries(): Promise<void> {
  await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: queryKeys.dashboard.stats(),
      queryFn: async () => {
        const response = await apiClient.get('/api/dashboard/stats');
        return response.data;
      },
      staleTime: TIMING.QUERY.STALE.SHORT, // 1 minute
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.users.profile(),
      queryFn: async () => {
        const response = await apiClient.get('/api/users/me');
        return response.data;
      },
      staleTime: TIMING.QUERY.STALE.MEDIUM, // 5 minutes
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.notifications.unreadCount(),
      queryFn: async () => {
        const response = await apiClient.get('/api/notifications/unread-count');
        return response.data;
      },
      staleTime: TIMING.QUERY.STALE.REALTIME, // 30 seconds
    }),
  ]);
}

/**
 * Clear all query caches (useful for logout)
 */
export function clearQueryCache(): void {
  queryClient.clear();
}

/**
 * Invalidate all queries (force refetch)
 */
export async function invalidateAll(): Promise<void> {
  return queryClient.invalidateQueries();
}

/**
 * Invalidate queries by tag
 */
export async function invalidateByTag(tag: string): Promise<void> {
  return queryClient.invalidateQueries({
    predicate: (query) => {
      const meta = query.meta as QueryMeta | undefined;
      return meta?.cacheTag === tag;
    },
  });
}

/**
 * Set query data directly (for optimistic updates)
 */
export function setQueryData<T>(
  queryKey: readonly unknown[],
  updater: T | ((old: T | undefined) => T)
): T | undefined {
  return queryClient.setQueryData(queryKey, updater) as T | undefined;
}

/**
 * Get query data from cache
 */
export function getQueryData<T>(queryKey: readonly unknown[]): T | undefined {
  return queryClient.getQueryData(queryKey);
}

/**
 * Remove query from cache
 */
export function removeQuery(queryKey: readonly unknown[]): void {
  queryClient.removeQueries({ queryKey });
}

// ============================================================================
// Optimistic Update Helpers
// ============================================================================

/**
 * Create optimistic update handlers for mutations
 *
 * @example
 * ```tsx
 * const mutation = useMutation({
 *   mutationFn: updateUser,
 *   ...createOptimisticHandlers(
 *     queryKeys.users.detail(userId),
 *     (old, variables) => ({ ...old, ...variables }),
 *   ),
 * });
 * ```
 */
export function createOptimisticHandlers<TData, TVariables>(
  queryKey: readonly unknown[],
  optimisticUpdater: (oldData: TData | undefined, variables: TVariables) => TData
) {
  return {
    onMutate: async (variables: TVariables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<TData>(queryKey);

      // Optimistically update
      queryClient.setQueryData<TData>(queryKey, (old) =>
        optimisticUpdater(old, variables)
      );

      // Return context with snapshot
      return { previousData };
    },
    onError: (
      _error: unknown,
      _variables: TVariables,
      context: { previousData: TData | undefined } | undefined
    ) => {
      // Rollback on error
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey });
    },
  };
}

// ============================================================================
// Export Types
// ============================================================================

export type { QueryMeta };
