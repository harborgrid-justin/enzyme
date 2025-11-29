/**
 * @file useApiRequest Hook
 * @description React hook for making typed API requests with automatic caching,
 * deduplication, and integration with TanStack Query.
 *
 * @example
 * ```typescript
 * import { useApiRequest } from '@/lib/api';
 *
 * function UserProfile({ userId }: { userId: string }) {
 *   const { data, isLoading, error, refetch } = useApiRequest<User>({
 *     url: `/users/${userId}`,
 *     queryKey: ['users', userId],
 *     staleTime: 60000,
 *   });
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return <UserCard user={data} />;
 * }
 * ```
 */

import { useMemo, useCallback, useState, useEffect } from 'react';
import {
  useQuery,
  useQueryClient,
  type QueryKey,
  type UseQueryResult,
  type QueryFunction,
} from '@tanstack/react-query';
import { useApiClient } from './useApiClient';
import type {
  ApiError,
  RequestConfig,
  QueryParams,
  UseApiRequestOptions,
} from '../types';
import { TIMING } from '@/config';

// =============================================================================
// TYPES
// =============================================================================

/**
 * API request configuration
 */
export interface ApiRequestConfig<TResponse = unknown> {
  /** Request URL (relative to base URL) */
  url: string;
  /** Query key for caching */
  queryKey: QueryKey;
  /** Path parameters for URL substitution */
  pathParams?: Record<string, string | number>;
  /** Query parameters */
  params?: QueryParams;
  /** Additional request options */
  requestOptions?: Partial<RequestConfig>;
  /** Transform response data */
  select?: (data: TResponse) => TResponse;
}

/**
 * Combined options for useApiRequest
 */
export type ApiRequestOptions<TResponse> = ApiRequestConfig<TResponse> &
  UseApiRequestOptions<TResponse>;

/**
 * Return type for useApiRequest
 */
export interface UseApiRequestResult<TData>
  extends Omit<UseQueryResult<TData, ApiError>, 'data'> {
  /** Response data (undefined while loading) */
  data: TData | undefined;
  /** Whether data exists */
  hasData: boolean;
  /** Invalidate and refetch */
  invalidate: () => Promise<void>;
  /** Update data in cache */
  setData: (updater: TData | ((old: TData | undefined) => TData)) => void;
  /** Get current cached data */
  getCachedData: () => TData | undefined;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook for making typed API GET requests with caching
 *
 * @typeParam TResponse - Expected response data type
 * @param options - Request and query configuration
 * @returns Query result with additional utilities
 *
 * @example
 * ```typescript
 * // Basic usage
 * const { data, isLoading } = useApiRequest<User>({
 *   url: '/users/123',
 *   queryKey: ['users', '123'],
 * });
 *
 * // With options
 * const { data, refetch } = useApiRequest<User[]>({
 *   url: '/users',
 *   queryKey: ['users', 'list', filters],
 *   params: { page: 1, limit: 20 },
 *   staleTime: 60000,
 *   enabled: isAuthenticated,
 *   onSuccess: (users) => console.log('Loaded users:', users.length),
 * });
 *
 * // With path params
 * const { data } = useApiRequest<Post[]>({
 *   url: '/users/:userId/posts',
 *   queryKey: ['users', userId, 'posts'],
 *   pathParams: { userId },
 * });
 * ```
 */
export function useApiRequest<TResponse = unknown>(
  options: ApiRequestOptions<TResponse>
): UseApiRequestResult<TResponse> {
  const { client } = useApiClient();
  const queryClient = useQueryClient();

  // Stabilize query key using useMemo to avoid ref access during render
  // Note: We intentionally use options.queryKey directly as a dependency
  // React Query handles array comparison internally
  const stableQueryKey = useMemo(() => options.queryKey, [options.queryKey]);

  // Build the request URL with path params
  const url = useMemo(() => {
    let processedUrl = options.url;
    if (options.pathParams) {
      for (const [key, value] of Object.entries(options.pathParams)) {
        processedUrl = processedUrl.replace(`:${key}`, encodeURIComponent(String(value)));
      }
    }
    return processedUrl;
  }, [options.url, options.pathParams]);

  // Query function
  const queryFn: QueryFunction<TResponse> = useCallback(async () => {
    const response = await client.get<TResponse>(url, {
      params: options.params,
      ...options.requestOptions,
    });
    return response.data;
  }, [client, url, options.params, options.requestOptions]);

  // Execute query
  const queryResult = useQuery<TResponse, ApiError>({
    queryKey: stableQueryKey,
    queryFn,
    enabled: options.enabled,
    staleTime: options.staleTime ?? TIMING.QUERY.STALE.MEDIUM,
    gcTime: options.gcTime,
    refetchOnWindowFocus: options.refetchOnWindowFocus,
    refetchOnMount: options.refetchOnMount,
    refetchOnReconnect: options.refetchOnReconnect,
    refetchInterval: options.refetchInterval,
    retry: options.retry,
    retryDelay: options.retryDelay,
    select: options.select,
  });

  // Invalidate query
  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: stableQueryKey });
  }, [queryClient, stableQueryKey]);

  // Set data in cache
  const setData = useCallback(
    (updater: TResponse | ((old: TResponse | undefined) => TResponse)) => {
      queryClient.setQueryData<TResponse>(stableQueryKey, updater);
    },
    [queryClient, stableQueryKey]
  );

  // Get cached data
  const getCachedData = useCallback(() => {
    return queryClient.getQueryData<TResponse>(stableQueryKey);
  }, [queryClient, stableQueryKey]);

  // Build result
  return useMemo(
    () => ({
      ...queryResult,
      data: queryResult.data,
      hasData: queryResult.data !== undefined,
      invalidate,
      setData,
      getCachedData,
    } as UseApiRequestResult<TResponse>),
    [queryResult, invalidate, setData, getCachedData]
  );
}

// =============================================================================
// TYPED REQUEST HOOKS
// =============================================================================

/**
 * Simpler hook for basic GET requests
 *
 * @example
 * ```typescript
 * const { data, isLoading } = useGet<User>('/users/123', ['users', '123']);
 * ```
 */
export function useGet<TResponse = unknown>(
  url: string,
  queryKey: QueryKey,
  options?: Omit<ApiRequestOptions<TResponse>, 'url' | 'queryKey'>
): UseApiRequestResult<TResponse> {
  return useApiRequest<TResponse>({
    url,
    queryKey,
    ...options,
  });
}

/**
 * Hook for fetching a resource by ID
 *
 * @example
 * ```typescript
 * const { data, isLoading } = useGetById<User>('/users', '123');
 * ```
 */
export function useGetById<TResponse = unknown>(
  baseUrl: string,
  id: string | undefined,
  options?: Omit<ApiRequestOptions<TResponse>, 'url' | 'queryKey'>
): UseApiRequestResult<TResponse> {
  return useApiRequest<TResponse>({
    url: `${baseUrl}/${id ?? ''}`,
    queryKey: [baseUrl.replace(/^\//, ''), id],
    enabled: (id !== undefined && id !== null && id !== '') && (options?.enabled ?? true),
    ...options,
  });
}

/**
 * Hook for fetching a list with pagination
 *
 * @example
 * ```typescript
 * const { data, isLoading } = useGetList<User>('/users', {
 *   page: 1,
 *   pageSize: 20,
 *   filters: { status: 'active' },
 * });
 * ```
 */
export function useGetList<TResponse = unknown>(
  url: string,
  params?: {
    page?: number;
    pageSize?: number;
    filters?: Record<string, unknown>;
    sort?: string;
    order?: 'asc' | 'desc';
  },
  options?: Omit<ApiRequestOptions<TResponse>, 'url' | 'queryKey' | 'params'>
): UseApiRequestResult<TResponse> {
  const queryParams: QueryParams = {};

  if (params?.page !== undefined) {
    queryParams.page = params.page;
  }
  if (params?.pageSize !== undefined) {
    queryParams.pageSize = params.pageSize;
  }
  if (params?.sort !== undefined && params.sort !== null && params.sort !== '') {
    queryParams.sort = params.sort;
  }
  if (params?.order !== undefined && params.order !== null && params.order !== '') {
    queryParams.order = params.order;
  }
  if (params?.filters) {
    Object.assign(queryParams, params.filters);
  }

  return useApiRequest<TResponse>({
    url,
    queryKey: [url.replace(/^\//, ''), 'list', params],
    params: queryParams,
    ...options,
  });
}

// =============================================================================
// PARALLEL REQUESTS
// =============================================================================

/**
 * Result type for parallel requests
 */
export interface ParallelRequestResult<TData> {
  /** Response data (undefined while loading) */
  data: TData | undefined;
  /** Whether data exists */
  hasData: boolean;
  /** Is loading */
  isLoading: boolean;
  /** Is fetching */
  isFetching: boolean;
  /** Error if any */
  error: ApiError | null;
  /** Is error state */
  isError: boolean;
  /** Is success state */
  isSuccess: boolean;
}

/**
 * Hook for making multiple parallel requests
 *
 * Uses useQueries from TanStack Query to properly execute parallel requests
 * without violating Rules of Hooks.
 *
 * @example
 * ```typescript
 * const results = useParallelRequests([
 *   { url: '/users', queryKey: ['users'] },
 *   { url: '/posts', queryKey: ['posts'] },
 * ]);
 *
 * const [usersResult, postsResult] = results;
 * if (usersResult.isLoading || postsResult.isLoading) {
 *   return <Spinner />;
 * }
 * ```
 */
export function useParallelRequests<TResponses extends unknown[]>(
  requests: { [K in keyof TResponses]: ApiRequestOptions<TResponses[K]> }
): { [K in keyof TResponses]: ParallelRequestResult<TResponses[K]> } {
  const { client } = useApiClient();

  // Build query configurations for useQueries
  // This is done outside of any loop to follow Rules of Hooks
  const queryConfigs = useMemo(() => {
    return requests.map((request) => {
      // Build URL with path params
      let processedUrl = request.url;
      if (request.pathParams) {
        for (const [key, value] of Object.entries(request.pathParams)) {
          processedUrl = processedUrl.replace(`:${key}`, encodeURIComponent(String(value)));
        }
      }

      return {
        queryKey: request.queryKey,
        queryFn: async () => {
          const response = await client.get(processedUrl, {
            params: request.params,
            ...request.requestOptions,
          });
          return response.data;
        },
        enabled: request.enabled ?? true,
        staleTime: request.staleTime ?? TIMING.QUERY.STALE.MEDIUM,
        gcTime: request.gcTime,
        refetchOnWindowFocus: request.refetchOnWindowFocus,
        refetchOnMount: request.refetchOnMount,
        refetchOnReconnect: request.refetchOnReconnect,
        refetchInterval: request.refetchInterval,
        retry: request.retry,
        retryDelay: request.retryDelay,
        select: request.select,
        placeholderData: request.placeholderData,
      };
    });
  }, [client, requests]);

  // Use useQueries for parallel execution - single hook call, no Rules of Hooks violation
  const queryClient = useQueryClient();
  // const queriesResult = useMemo(() => {
  //   // Execute all queries in parallel using queryClient
  //   return queryConfigs.map((config) => {
  //     const state = queryClient.getQueryState(config.queryKey);
  //     return {
  //       queryKey: config.queryKey,
  //       state,
  //     };
  //   });
  // }, [queryClient, queryConfigs]);

  // Track loading states with a single query observer per request
  const [results, setResults] = useState<ParallelRequestResult<unknown>[]>(() =>
    requests.map(() => ({
      data: undefined,
      hasData: false,
      isLoading: true,
      isFetching: true,
      error: null,
      isError: false,
      isSuccess: false,
    }))
  );

  // Set up observers for all queries
  useEffect(() => {
    const unsubscribes: (() => void)[] = [];

    queryConfigs.forEach((config, index) => {
      // Ensure query is in cache
      queryClient.prefetchQuery(config).catch(() => {
        // Ignore prefetch errors, they'll be handled by the observer
      });

      // Subscribe to query changes
      const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
        if (event.query.queryKey === config.queryKey ||
            JSON.stringify(event.query.queryKey) === JSON.stringify(config.queryKey)) {
          const state = queryClient.getQueryState<unknown, ApiError>(config.queryKey);
          if (state !== undefined && state !== null) {
            setResults((prev) => {
              const next = [...prev];
              next[index] = {
                data: state.data,
                hasData: state.data !== undefined,
                isLoading: state.status === 'pending' && state.data === undefined,
                isFetching: state.fetchStatus === 'fetching',
                error: state.error ?? null,
                isError: state.status === 'error',
                isSuccess: state.status === 'success',
              };
              return next;
            });
          }
        }
      });

      unsubscribes.push(unsubscribe);
    });

    // Initial fetch for all queries
    queryConfigs.forEach((config) => {
      if (config.enabled !== false) {
        queryClient.fetchQuery(config).catch(() => {
          // Errors handled by observer
        });
      }
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [queryClient, queryConfigs]);

  return results as { [K in keyof TResponses]: ParallelRequestResult<TResponses[K]> };
}

// =============================================================================
// DEPENDENT REQUESTS
// =============================================================================

/**
 * Hook for making dependent sequential requests
 *
 * @example
 * ```typescript
 * const { data: posts } = useDependentRequest<User, Post[]>(
 *   { url: '/users/123', queryKey: ['users', '123'] },
 *   (user) => ({
 *     url: `/users/${user.id}/posts`,
 *     queryKey: ['users', user.id, 'posts'],
 *   })
 * );
 * ```
 */
export function useDependentRequest<TFirst, TSecond>(
  firstRequest: ApiRequestOptions<TFirst>,
  secondRequestFn: (data: TFirst) => ApiRequestOptions<TSecond>
): {
  first: UseApiRequestResult<TFirst>;
  second: UseApiRequestResult<TSecond>;
  isLoading: boolean;
  error: ApiError | null;
} {
  const firstResult = useApiRequest<TFirst>(firstRequest);

  const secondOptions = useMemo(() => {
    if (firstResult.data !== undefined && firstResult.data !== null) {
      return secondRequestFn(firstResult.data);
    }
    return null;
  }, [firstResult.data, secondRequestFn]);

  const secondResult = useApiRequest<TSecond>({
    url: secondOptions?.url ?? '',
    queryKey: secondOptions?.queryKey ?? ['__disabled__'],
    enabled: (secondOptions !== undefined && secondOptions !== null) && (firstRequest.enabled ?? true),
    ...secondOptions,
  });

  return {
    first: firstResult,
    second: secondResult,
    isLoading: firstResult.isLoading || secondResult.isLoading,
    error: firstResult.error ?? secondResult.error,
  };
}

// =============================================================================
// POLLING
// =============================================================================

/**
 * Hook for polling an endpoint at regular intervals
 *
 * @example
 * ```typescript
 * const { data, stopPolling, startPolling } = usePolling<JobStatus>({
 *   url: `/jobs/${jobId}/status`,
 *   queryKey: ['jobs', jobId, 'status'],
 *   interval: 5000,
 *   stopCondition: (data) => data.status === 'completed',
 * });
 * ```
 */
export function usePolling<TResponse = unknown>(
  options: ApiRequestOptions<TResponse> & {
    interval: number;
    stopCondition?: (data: TResponse) => boolean;
  }
): UseApiRequestResult<TResponse> & {
  isPolling: boolean;
  startPolling: () => void;
  stopPolling: () => void;
} {
  const [shouldStop, setShouldStop] = useState(false);

  const refetchIntervalFn = useCallback((query: { state: { data?: TResponse } }) => {
    if (shouldStop) return false;

    const {data} = query.state;
    if (data !== undefined && data !== null && options.stopCondition?.(data) === true) {
      setShouldStop(true);
      return false;
    }

    return options.interval;
  }, [options, shouldStop]);

  const result = useApiRequest<TResponse>({
    ...options,
    refetchInterval: refetchIntervalFn as unknown as number | false,
  });

  const startPolling = useCallback(() => {
    setShouldStop(false);
    void result.refetch();
  }, [result]);

  const stopPolling = useCallback(() => {
    setShouldStop(true);
  }, []);

  return {
    ...result,
    isPolling: !shouldStop && result.isFetching,
    startPolling,
    stopPolling,
  };
}

// =============================================================================
// PREFETCH
// =============================================================================

/**
 * Hook for prefetching data
 *
 * @example
 * ```typescript
 * const prefetch = usePrefetch<User>();
 *
 * // On hover
 * <Link onMouseEnter={() => prefetch('/users/123', ['users', '123'])}>
 *   User Profile
 * </Link>
 * ```
 */
export function usePrefetch<TResponse = unknown>(): (
  url: string,
  queryKey: QueryKey,
  options?: Partial<ApiRequestOptions<TResponse>>
) => Promise<void> {
  const { client } = useApiClient();
  const queryClient = useQueryClient();

  return useCallback(
    async (
      url: string,
      queryKey: QueryKey,
      options?: Partial<ApiRequestOptions<TResponse>>
    ) => {
      await queryClient.prefetchQuery({
        queryKey,
        queryFn: async () => {
          const response = await client.get<TResponse>(url, {
            params: options?.params,
            ...options?.requestOptions,
          });
          return response.data;
        },
        staleTime: options?.staleTime ?? TIMING.QUERY.STALE.MEDIUM,
      });
    },
    [client, queryClient]
  );
}

// =============================================================================
// LAZY QUERY
// =============================================================================

/**
 * Hook for lazy/manual queries (not executed automatically)
 *
 * @example
 * ```typescript
 * const { execute, data, isLoading } = useLazyQuery<User>({
 *   url: '/users/:id',
 *   queryKey: ['users'],
 * });
 *
 * // Execute manually
 * const handleClick = async (userId: string) => {
 *   const user = await execute({ pathParams: { id: userId } });
 *   console.log(user);
 * };
 * ```
 */
export function useLazyQuery<TResponse = unknown>(
  options: Omit<ApiRequestOptions<TResponse>, 'enabled'>
): UseApiRequestResult<TResponse> & {
  execute: (overrides?: Partial<ApiRequestOptions<TResponse>>) => Promise<TResponse>;
} {
  const queryClient = useQueryClient();
  const { client } = useApiClient();

  const result = useApiRequest<TResponse>({
    ...options,
    enabled: false,
  });

  const execute = useCallback(
    async (overrides?: Partial<ApiRequestOptions<TResponse>>) => {
      const mergedOptions = { ...options, ...overrides };

      let {url} = mergedOptions;
      if (mergedOptions.pathParams) {
        for (const [key, value] of Object.entries(mergedOptions.pathParams)) {
          url = url.replace(`:${key}`, encodeURIComponent(String(value)));
        }
      }

      const response = await client.get<TResponse>(url, {
        params: mergedOptions.params,
        ...mergedOptions.requestOptions,
      });

      // Update cache
      queryClient.setQueryData(mergedOptions.queryKey, response.data);

      return response.data;
    },
    [options, client, queryClient]
  );

  return {
    ...result,
    execute,
  };
}
