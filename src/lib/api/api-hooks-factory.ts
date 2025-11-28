/**
 * @file API Hooks Factory
 * @description Factory for generating type-safe React Query hooks from API endpoint definitions.
 * Provides automatic query key management, optimistic updates, and standardized error handling.
 *
 * This module enables:
 * - Automatic generation of typed useQuery hooks from endpoint definitions
 * - Automatic generation of typed useMutation hooks with optimistic updates
 * - Standardized query key generation and cache management
 * - Built-in error handling patterns with recovery options
 * - Integration with TanStack Query for caching and synchronization
 *
 * @example
 * ```typescript
 * import { createApiHooks } from '@/lib/api';
 *
 * // Define API contract
 * const userApi = {
 *   getUser: {
 *     method: 'GET' as const,
 *     path: '/users/:id',
 *   },
 *   createUser: {
 *     method: 'POST' as const,
 *     path: '/users',
 *   },
 * };
 *
 * // Generate hooks
 * const { useGetUser, useCreateUser } = createApiHooks(userApi);
 *
 * // Use in component
 * const { data: user } = useGetUser({ pathParams: { id: '123' } });
 * const createMutation = useCreateUser({
 *   onSuccess: () => invalidateQueries(['users']),
 * });
 * ```
 */

import {
  useQuery,
  useMutation,
  useInfiniteQuery,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
  type QueryKey,
  type QueryClient,
} from '@tanstack/react-query';
import { useMemo, useCallback, useRef } from 'react';
import type {
  ApiEndpoint,
  ApiError,
  RequestConfig,
  QueryParams,
  ApiResponse,
  PaginatedResponse,
  PaginationMeta,
} from './types';
import { apiClient, ApiClient } from './api-client';
import { TIMING } from '@/config';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Query hook configuration
 */
export interface QueryHookConfig<TResponse, TError = ApiError> {
  /** Enable/disable the query */
  enabled?: boolean;
  /** Stale time in milliseconds */
  staleTime?: number;
  /** Garbage collection time */
  gcTime?: number;
  /** Refetch on window focus */
  refetchOnWindowFocus?: boolean;
  /** Refetch on mount behavior */
  refetchOnMount?: boolean | 'always';
  /** Refetch interval */
  refetchInterval?: number | false;
  /** Retry configuration */
  retry?: number | boolean | ((failureCount: number, error: TError) => boolean);
  /** Select/transform data */
  select?: (data: TResponse) => TResponse;
  /** On success callback */
  onSuccess?: (data: TResponse) => void;
  /** On error callback */
  onError?: (error: TError) => void;
  /** Keep previous data */
  keepPreviousData?: boolean;
  /** Placeholder data */
  placeholderData?: TResponse | (() => TResponse | undefined);
  /** Initial data */
  initialData?: TResponse | (() => TResponse);
  /** Custom query key suffix */
  queryKeySuffix?: unknown[];
}

/**
 * Mutation hook configuration
 */
export interface MutationHookConfig<TResponse, TVariables, TError = ApiError, TContext = unknown> {
  /** On mutate callback for optimistic updates */
  onMutate?: (variables: TVariables) => Promise<TContext> | TContext;
  /** On success callback */
  onSuccess?: (data: TResponse, variables: TVariables, context: TContext | undefined) => void;
  /** On error callback */
  onError?: (error: TError, variables: TVariables, context: TContext | undefined) => void;
  /** On settled callback */
  onSettled?: (
    data: TResponse | undefined,
    error: TError | null,
    variables: TVariables,
    context: TContext | undefined
  ) => void;
  /** Query keys to invalidate on success */
  invalidateQueries?: QueryKey[];
  /** Query keys to refetch on success */
  refetchQueries?: QueryKey[];
  /** Retry configuration */
  retry?: number | boolean;
}

/**
 * Infinite query hook configuration
 */
export interface InfiniteQueryHookConfig<TResponse, TError = ApiError>
  extends Omit<QueryHookConfig<TResponse, TError>, 'select'> {
  /** Get next page parameter from response */
  getNextPageParam?: (lastPage: TResponse, pages: TResponse[]) => unknown | undefined;
  /** Get previous page parameter from response */
  getPreviousPageParam?: (firstPage: TResponse, pages: TResponse[]) => unknown | undefined;
}

/**
 * Request parameters for query hooks
 */
export interface QueryRequestParams {
  /** Path parameters for URL substitution */
  pathParams?: Record<string, string | number>;
  /** Query parameters */
  queryParams?: QueryParams;
  /** Additional request config */
  config?: Partial<RequestConfig>;
}

/**
 * Request parameters for mutation hooks
 */
export interface MutationRequestParams<TBody = unknown> {
  /** Path parameters for URL substitution */
  pathParams?: Record<string, string | number>;
  /** Query parameters */
  queryParams?: QueryParams;
  /** Request body */
  body?: TBody;
  /** Additional request config */
  config?: Partial<RequestConfig>;
}

/**
 * Generated hook type for queries
 */
export type GeneratedQueryHook<TResponse, TParams extends QueryRequestParams = QueryRequestParams> = (
  params?: TParams,
  config?: QueryHookConfig<TResponse>
) => ReturnType<typeof useQuery<TResponse, ApiError>>;

/**
 * Generated hook type for mutations
 */
export type GeneratedMutationHook<
  TResponse,
  TVariables extends MutationRequestParams = MutationRequestParams,
> = (
  config?: MutationHookConfig<TResponse, TVariables>
) => ReturnType<typeof useMutation<TResponse, ApiError, TVariables>>;

/**
 * API hooks collection type
 */
export type ApiHooks<TContract extends Record<string, ApiEndpoint>> = {
  [K in keyof TContract as `use${Capitalize<string & K>}`]: TContract[K]['method'] extends 'GET'
    ? GeneratedQueryHook<
        TContract[K] extends ApiEndpoint<unknown, infer R> ? R : unknown,
        QueryRequestParams
      >
    : GeneratedMutationHook<
        TContract[K] extends ApiEndpoint<unknown, infer R> ? R : unknown,
        MutationRequestParams<TContract[K] extends ApiEndpoint<infer Req> ? Req : unknown>
      >;
};

// =============================================================================
// QUERY KEY FACTORY
// =============================================================================

/**
 * Create query key factory for an API contract
 */
export function createQueryKeyFactory<TContract extends Record<string, ApiEndpoint>>(
  namespace: string
): Record<keyof TContract, (...args: unknown[]) => QueryKey> {
  const cache = new Map<string, (...args: unknown[]) => QueryKey>();

  return new Proxy({} as Record<keyof TContract, (...args: unknown[]) => QueryKey>, {
    get: (_, prop: string) => {
      if (!cache.has(prop)) {
        cache.set(prop, (...args: unknown[]) => [namespace, prop, ...args]);
      }
      return cache.get(prop);
    },
  });
}

/**
 * Build query key from endpoint and params
 */
function buildQueryKey(
  namespace: string,
  endpointName: string,
  params?: QueryRequestParams
): QueryKey {
  const key: unknown[] = [namespace, endpointName];

  if (params?.pathParams) {
    key.push(params.pathParams);
  }

  if (params?.queryParams && Object.keys(params.queryParams).length > 0) {
    key.push(params.queryParams);
  }

  return key;
}

// =============================================================================
// HOOK FACTORY
// =============================================================================

/**
 * Configuration for the hooks factory
 */
export interface HooksFactoryConfig {
  /** API client instance to use */
  client?: ApiClient;
  /** Namespace for query keys */
  namespace: string;
  /** Default stale time */
  defaultStaleTime?: number;
  /** Default retry configuration */
  defaultRetry?: number | boolean;
  /** Global error handler */
  onError?: (error: ApiError) => void;
  /** Global success handler */
  onSuccess?: (data: unknown) => void;
}

/**
 * Create typed API hooks from an endpoint contract
 *
 * @typeParam TContract - API contract type mapping endpoint names to definitions
 * @param contract - Object defining API endpoints
 * @param config - Factory configuration
 * @returns Object with generated hooks for each endpoint
 *
 * @example
 * ```typescript
 * // Define the contract
 * const usersApi = {
 *   getUsers: {
 *     method: 'GET' as const,
 *     path: '/users',
 *   },
 *   getUser: {
 *     method: 'GET' as const,
 *     path: '/users/:id',
 *   },
 *   createUser: {
 *     method: 'POST' as const,
 *     path: '/users',
 *   },
 *   updateUser: {
 *     method: 'PATCH' as const,
 *     path: '/users/:id',
 *   },
 *   deleteUser: {
 *     method: 'DELETE' as const,
 *     path: '/users/:id',
 *   },
 * } as const;
 *
 * // Generate hooks
 * const userHooks = createApiHooks(usersApi, { namespace: 'users' });
 *
 * // Use hooks
 * const { data: users } = userHooks.useGetUsers();
 * const { data: user } = userHooks.useGetUser({ pathParams: { id: '123' } });
 * const createMutation = userHooks.useCreateUser();
 * ```
 */
export function createApiHooks<TContract extends Record<string, ApiEndpoint>>(
  contract: TContract,
  config: HooksFactoryConfig
): ApiHooks<TContract> {
  const { client = apiClient, namespace, defaultStaleTime = TIMING.QUERY.STALE.MEDIUM } = config;

  const hooks: Record<string, unknown> = {};

  for (const [endpointName, endpoint] of Object.entries(contract)) {
    const hookName = `use${capitalize(endpointName)}`;

    if (endpoint.method === 'GET') {
      // Generate query hook
      hooks[hookName] = createQueryHook(
        client,
        namespace,
        endpointName,
        endpoint,
        defaultStaleTime,
        config.onError
      );
    } else {
      // Generate mutation hook
      hooks[hookName] = createMutationHook(
        client,
        namespace,
        endpointName,
        endpoint,
        config.onError,
        config.onSuccess
      );
    }
  }

  return hooks as ApiHooks<TContract>;
}

/**
 * Create a query hook for a GET endpoint
 */
function createQueryHook<TResponse>(
  client: ApiClient,
  namespace: string,
  endpointName: string,
  endpoint: ApiEndpoint,
  defaultStaleTime: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  globalOnError?: (error: ApiError) => void
) {
  return (params?: QueryRequestParams, hookConfig?: QueryHookConfig<TResponse>) => {
    const queryKey = useMemo(
      () => [
        ...buildQueryKey(namespace, endpointName, params),
        ...(hookConfig?.queryKeySuffix || []),
      ],
      [params, hookConfig?.queryKeySuffix]
    );

    const queryFn = useCallback(async (): Promise<TResponse> => {
      const url = substitutePathParams(endpoint.path, params?.pathParams);

      const response = await client.get<TResponse>(url, {
        params: params?.queryParams,
        timeout: endpoint.timeout,
        ...params?.config,
      });

      return response.data;
    }, [params]);

    return useQuery<TResponse, ApiError>({
      queryKey,
      queryFn,
      enabled: hookConfig?.enabled,
      staleTime: hookConfig?.staleTime ?? defaultStaleTime,
      gcTime: hookConfig?.gcTime,
      refetchOnWindowFocus: hookConfig?.refetchOnWindowFocus,
      refetchOnMount: hookConfig?.refetchOnMount,
      refetchInterval: hookConfig?.refetchInterval,
      retry: hookConfig?.retry,
      select: hookConfig?.select,
      placeholderData: hookConfig?.placeholderData as UseQueryOptions<TResponse, ApiError>['placeholderData'],
      initialData: hookConfig?.initialData,
    });
  };
}

/**
 * Create a mutation hook for POST/PUT/PATCH/DELETE endpoints
 */
function createMutationHook<TResponse, TBody = unknown>(
  client: ApiClient,
  namespace: string,
  endpointName: string,
  endpoint: ApiEndpoint,
  globalOnError?: (error: ApiError) => void,
  globalOnSuccess?: (data: unknown) => void
) {
  return <TContext = unknown>(
    hookConfig?: MutationHookConfig<TResponse, MutationRequestParams<TBody>, ApiError, TContext>
  ) => {
    const queryClient = useQueryClient();

    const mutationFn = useCallback(
      async (variables: MutationRequestParams<TBody>): Promise<TResponse> => {
        const url = substitutePathParams(endpoint.path, variables?.pathParams);

        let response: ApiResponse<TResponse>;

        switch (endpoint.method) {
          case 'POST':
            response = await client.post<TResponse, TBody>(url, variables?.body, {
              params: variables?.queryParams,
              timeout: endpoint.timeout,
              ...variables?.config,
            });
            break;
          case 'PUT':
            response = await client.put<TResponse, TBody>(url, variables?.body, {
              params: variables?.queryParams,
              timeout: endpoint.timeout,
              ...variables?.config,
            });
            break;
          case 'PATCH':
            response = await client.patch<TResponse, TBody>(url, variables?.body, {
              params: variables?.queryParams,
              timeout: endpoint.timeout,
              ...variables?.config,
            });
            break;
          case 'DELETE':
            response = await client.delete<TResponse>(url, {
              params: variables?.queryParams,
              timeout: endpoint.timeout,
              ...variables?.config,
            });
            break;
          default:
            response = await client.request<TResponse>({
              method: endpoint.method,
              url,
              body: variables?.body,
              params: variables?.queryParams,
              timeout: endpoint.timeout,
              ...variables?.config,
            });
        }

        return response.data;
      },
      []
    );

    return useMutation<TResponse, ApiError, MutationRequestParams<TBody>, TContext>({
      mutationFn,
      onMutate: hookConfig?.onMutate,
      onSuccess: async (data, variables, context) => {
        // Call custom success handler
        hookConfig?.onSuccess?.(data, variables, context);
        globalOnSuccess?.(data);

        // Invalidate queries
        if (hookConfig?.invalidateQueries) {
          await Promise.all(
            hookConfig.invalidateQueries.map((key) =>
              queryClient.invalidateQueries({ queryKey: key })
            )
          );
        }

        // Refetch queries
        if (hookConfig?.refetchQueries) {
          await Promise.all(
            hookConfig.refetchQueries.map((key) =>
              queryClient.refetchQueries({ queryKey: key })
            )
          );
        }
      },
      onError: (error, variables, context) => {
        hookConfig?.onError?.(error, variables, context);
        globalOnError?.(error);
      },
      onSettled: hookConfig?.onSettled,
      retry: hookConfig?.retry,
    });
  };
}

// =============================================================================
// INFINITE QUERY HOOK FACTORY
// =============================================================================

/**
 * Create an infinite query hook for paginated endpoints
 *
 * @example
 * ```typescript
 * const useInfiniteUsers = createInfiniteQueryHook<User[]>({
 *   client: apiClient,
 *   namespace: 'users',
 *   endpointName: 'list',
 *   endpoint: { method: 'GET', path: '/users' },
 *   getNextPageParam: (lastPage) => lastPage.pagination?.nextCursor,
 * });
 *
 * // In component
 * const { data, fetchNextPage, hasNextPage } = useInfiniteUsers();
 * ```
 */
export function createInfiniteQueryHook<TResponse>(config: {
  client?: ApiClient;
  namespace: string;
  endpointName: string;
  endpoint: ApiEndpoint;
  getNextPageParam?: (lastPage: TResponse, pages: TResponse[]) => unknown | undefined;
  getPreviousPageParam?: (firstPage: TResponse, pages: TResponse[]) => unknown | undefined;
  pageParamName?: string;
}) {
  const {
    client = apiClient,
    namespace,
    endpointName,
    endpoint,
    getNextPageParam,
    getPreviousPageParam,
    pageParamName = 'cursor',
  } = config;

  return (
    params?: QueryRequestParams,
    hookConfig?: InfiniteQueryHookConfig<TResponse>
  ) => {
    const queryKey = useMemo(
      () => [...buildQueryKey(namespace, `${endpointName}.infinite`, params)],
      [params]
    );

    return useInfiniteQuery<TResponse, ApiError>({
      queryKey,
      queryFn: async ({ pageParam }) => {
        const url = substitutePathParams(endpoint.path, params?.pathParams);

        const response = await client.get<TResponse>(url, {
          params: {
            ...(params?.queryParams as Record<string, unknown>),
            [pageParamName]: pageParam,
          },
          timeout: endpoint.timeout,
          ...params?.config,
        });

        return response.data;
      },
      initialPageParam: undefined,
      getNextPageParam: (hookConfig?.getNextPageParam || getNextPageParam) as any,
      getPreviousPageParam: (hookConfig?.getPreviousPageParam || getPreviousPageParam) as any,
      enabled: hookConfig?.enabled,
      staleTime: hookConfig?.staleTime,
      gcTime: hookConfig?.gcTime,
      refetchOnWindowFocus: hookConfig?.refetchOnWindowFocus,
      refetchOnMount: hookConfig?.refetchOnMount,
      retry: hookConfig?.retry,
    });
  };
}

// =============================================================================
// OPTIMISTIC UPDATE HELPERS
// =============================================================================

/**
 * Configuration for optimistic updates
 */
export interface OptimisticUpdateConfig<TData, TVariables> {
  /** Query key to update */
  queryKey: QueryKey;
  /** Function to compute optimistic update */
  updater: (oldData: TData | undefined, variables: TVariables) => TData;
  /** Whether to await the mutation */
  awaitMutation?: boolean;
  /**
   * QueryClient instance for cache operations.
   * Required - do not rely on global state.
   */
  queryClient: QueryClient;
}

/**
 * Create optimistic mutation handlers.
 *
 * IMPORTANT: Requires explicit QueryClient instance to avoid global state issues.
 * Use useQueryClient() hook in your component to get the client instance.
 *
 * @example
 * ```typescript
 * function UserComponent() {
 *   const queryClient = useQueryClient();
 *
 *   const updateUserMutation = useUpdateUser({
 *     ...createOptimisticMutation({
 *       queryClient,
 *       queryKey: ['users', userId],
 *       updater: (oldUser, variables) => ({ ...oldUser, ...variables.body }),
 *     }),
 *   });
 * }
 * ```
 */
export function createOptimisticMutation<TData, TVariables>(
  config: OptimisticUpdateConfig<TData, TVariables>
): Pick<
  MutationHookConfig<TData, TVariables, ApiError, { previousData: TData | undefined }>,
  'onMutate' | 'onError' | 'onSettled'
> {
  const { queryClient } = config;

  return {
    onMutate: async (variables: TVariables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: config.queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<TData>(config.queryKey);

      // Optimistically update
      queryClient.setQueryData<TData>(config.queryKey, (old) =>
        config.updater(old, variables)
      );

      return { previousData };
    },

    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(config.queryKey, context.previousData);
      }
    },

    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: config.queryKey });
    },
  };
}

/**
 * Create optimistic list update handlers (for adding/removing items).
 *
 * IMPORTANT: Requires explicit QueryClient instance to avoid global state issues.
 * Use useQueryClient() hook in your component to get the client instance.
 *
 * @example
 * ```typescript
 * function UserListComponent() {
 *   const queryClient = useQueryClient();
 *
 *   const deleteUserMutation = useDeleteUser({
 *     ...createOptimisticListMutation({
 *       queryClient,
 *       queryKey: ['users', 'list'],
 *       operation: 'remove',
 *       getItemId: (item) => item.id,
 *       getVariableId: (variables) => variables.pathParams?.id,
 *     }),
 *   });
 * }
 * ```
 */
export function createOptimisticListMutation<
  TItem extends { id: string | number },
  TVariables,
>(config: {
  /** QueryClient instance - required */
  queryClient: QueryClient;
  queryKey: QueryKey;
  operation: 'add' | 'remove' | 'update';
  getItemId: (item: TItem) => string | number;
  getVariableId?: (variables: TVariables) => string | number | undefined;
  getNewItem?: (variables: TVariables) => TItem;
  getUpdatedItem?: (oldItem: TItem, variables: TVariables) => TItem;
}): Pick<
  MutationHookConfig<TItem, TVariables, ApiError, { previousData: TItem[] | undefined }>,
  'onMutate' | 'onError' | 'onSettled'
> {
  const { queryClient } = config;

  return {
    onMutate: async (variables: TVariables) => {
      await queryClient.cancelQueries({ queryKey: config.queryKey });

      const previousData = queryClient.getQueryData<TItem[]>(config.queryKey);

      queryClient.setQueryData<TItem[]>(config.queryKey, (old) => {
        if (!old) return old;

        switch (config.operation) {
          case 'add':
            if (config.getNewItem) {
              return [...old, config.getNewItem(variables)];
            }
            return old;

          case 'remove': {
            const id = config.getVariableId?.(variables);
            if (id === undefined) return old;
            return old.filter((item) => config.getItemId(item) !== id);
          }

          case 'update': {
            const id = config.getVariableId?.(variables);
            if (id === undefined) return old;
            return old.map((item) => {
              if (config.getItemId(item) === id && config.getUpdatedItem) {
                return config.getUpdatedItem(item, variables);
              }
              return item;
            });
          }

          default:
            return old;
        }
      });

      return { previousData };
    },

    onError: (_error, _variables, context) => {
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(config.queryKey, context.previousData);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: config.queryKey });
    },
  };
}

// =============================================================================
// ERROR HANDLING PATTERNS
// =============================================================================

/**
 * Error handling configuration
 */
export interface ErrorHandlerConfig {
  /** Show toast notification */
  showToast?: boolean;
  /** Report to error tracking service */
  reportError?: boolean;
  /** Custom error messages by code */
  messages?: Record<string, string>;
  /** Retry configuration */
  retryConfig?: {
    maxRetries: number;
    retryCondition?: (error: ApiError) => boolean;
  };
  /** Fallback data on error */
  fallbackData?: unknown;
  /** Custom error handler */
  onError?: (error: ApiError) => void;
}

/**
 * Create standardized error handlers for queries
 *
 * @example
 * ```typescript
 * const errorHandler = createErrorHandler({
 *   showToast: true,
 *   messages: {
 *     'HTTP_404': 'User not found',
 *     'HTTP_403': 'You do not have permission to view this user',
 *   },
 * });
 *
 * const { data } = useUser({
 *   onError: errorHandler.onError,
 * });
 * ```
 */
export function createErrorHandler(config: ErrorHandlerConfig = {}) {
  const { showToast = true, reportError = true, messages = {} } = config;

  return {
    onError: (error: ApiError) => {
      // Get custom message or use default
      const message = messages[error.code] || error.message;

      // Show toast notification
      if (showToast) {
        // Integration with toast system
        console.error('[API Error]', message, { error });
      }

      // Report to error tracking
      if (reportError && error.severity === 'error') {
        // Integration with error tracking service
        console.error('[Error Tracking]', error);
      }

      // Call custom handler
      config.onError?.(error);
    },

    retry: (failureCount: number, error: ApiError): boolean => {
      if (!config.retryConfig) return false;
      if (failureCount >= config.retryConfig.maxRetries) return false;
      if (config.retryConfig.retryCondition) {
        return config.retryConfig.retryCondition(error);
      }
      return error.retryable;
    },

    fallbackData: config.fallbackData,
  };
}

// =============================================================================
// PREFETCH HELPERS
// =============================================================================

/**
 * Create prefetch function for an endpoint
 *
 * @example
 * ```typescript
 * const prefetchUser = createPrefetch({
 *   client: apiClient,
 *   queryClient,
 *   namespace: 'users',
 *   endpointName: 'get',
 *   endpoint: { method: 'GET', path: '/users/:id' },
 * });
 *
 * // Prefetch on hover
 * onMouseEnter={() => prefetchUser({ pathParams: { id: userId } })}
 * ```
 */
export function createPrefetch<TResponse>(config: {
  client?: ApiClient;
  queryClient: QueryClient;
  namespace: string;
  endpointName: string;
  endpoint: ApiEndpoint;
  staleTime?: number;
}) {
  const {
    client = apiClient,
    queryClient,
    namespace,
    endpointName,
    endpoint,
    staleTime = TIMING.QUERY.STALE.MEDIUM,
  } = config;

  return async (params?: QueryRequestParams): Promise<void> => {
    const queryKey = buildQueryKey(namespace, endpointName, params);
    const url = substitutePathParams(endpoint.path, params?.pathParams);

    await queryClient.prefetchQuery({
      queryKey,
      queryFn: async () => {
        const response = await client.get<TResponse>(url, {
          params: params?.queryParams,
          timeout: endpoint.timeout,
        });
        return response.data;
      },
      staleTime,
    });
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Substitute path parameters in URL
 */
function substitutePathParams(
  path: string,
  params?: Record<string, string | number>
): string {
  if (!params) return path;

  let url = path;
  for (const [key, value] of Object.entries(params)) {
    url = url.replace(`:${key}`, encodeURIComponent(String(value)));
  }
  return url;
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert endpoint name to hook name
 */
export function toHookName(name: string): string {
  return `use${capitalize(name)}`;
}

/**
 * Extract pagination from response
 */
export function extractPaginationFromResponse<T>(
  response: PaginatedResponse<T>
): PaginationMeta {
  return response.pagination;
}

/**
 * Merge infinite query pages
 */
export function mergeInfinitePages<T>(
  pages: PaginatedResponse<T>[]
): T[] {
  return pages.flatMap((page) => page.items);
}

// =============================================================================
// HOOK UTILITIES
// =============================================================================

/**
 * Hook to get stable query key reference
 */
export function useStableQueryKey(key: QueryKey): QueryKey {
  const keyRef = useRef(key);
  const serialized = JSON.stringify(key);
  const serializedRef = useRef(serialized);

  if (serializedRef.current !== serialized) {
    serializedRef.current = serialized;
    keyRef.current = key;
  }

  return keyRef.current;
}

/**
 * Hook to track mutation loading state across multiple mutations
 */
export function useMutationLoadingState(
  ...mutations: Array<{ isPending: boolean }>
): boolean {
  return mutations.some((m) => m.isPending);
}

/**
 * Hook to combine multiple mutation errors
 */
export function useCombinedMutationError(
  ...mutations: Array<{ error: ApiError | null }>
): ApiError | null {
  return mutations.find((m) => m.error)?.error || null;
}
