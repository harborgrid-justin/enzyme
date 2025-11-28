/**
 * @file useApiMutation Hook
 * @description React hook for making typed API mutations (POST, PUT, PATCH, DELETE)
 * with optimistic updates, cache invalidation, and error handling.
 *
 * @example
 * ```typescript
 * import { useApiMutation } from '@/lib/api';
 *
 * function CreateUserForm() {
 *   const { mutate, isLoading, error } = useApiMutation<User, CreateUserDto>({
 *     method: 'POST',
 *     url: '/users',
 *     invalidateQueries: [['users', 'list']],
 *     onSuccess: (user) => toast.success(`Created user: ${user.name}`),
 *   });
 *
 *   const handleSubmit = (data: CreateUserDto) => {
 *     mutate({ body: data });
 *   };
 *
 *   return <Form onSubmit={handleSubmit} />;
 * }
 * ```
 */

import { useMemo, useCallback } from 'react';
import {
  useMutation,
  useQueryClient,
  type QueryKey,
  type UseMutationResult,
} from '@tanstack/react-query';
import { useApiClient } from './useApiClient';
import type {
  ApiResponse,
  ApiError,
  RequestConfig,
  QueryParams,
} from '../types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Mutation variables structure
 */
export interface MutationVariables<TBody = unknown> {
  /** Request body */
  body?: TBody;
  /** Path parameters */
  pathParams?: Record<string, string | number>;
  /** Query parameters */
  queryParams?: QueryParams;
}

/**
 * API mutation configuration
 */
export interface ApiMutationConfig<TResponse = unknown, TBody = unknown, TContext = unknown> {
  /** HTTP method */
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Request URL (can include :param placeholders) */
  url: string;
  /** Additional request options */
  requestOptions?: Partial<RequestConfig>;
  /** Query keys to invalidate on success */
  invalidateQueries?: QueryKey[];
  /** Query keys to refetch on success */
  refetchQueries?: QueryKey[];
  /** Query key for optimistic updates */
  optimisticQueryKey?: QueryKey;
  /** Optimistic update function */
  optimisticUpdate?: (
    oldData: unknown,
    variables: MutationVariables<TBody>
  ) => unknown;
  /** On mutate callback (for custom optimistic updates) */
  onMutate?: (variables: MutationVariables<TBody>) => Promise<TContext> | TContext;
  /** On success callback */
  onSuccess?: (
    data: TResponse,
    variables: MutationVariables<TBody>,
    context: TContext | undefined
  ) => void | Promise<void>;
  /** On error callback */
  onError?: (
    error: ApiError,
    variables: MutationVariables<TBody>,
    context: TContext | undefined
  ) => void | Promise<void>;
  /** On settled callback */
  onSettled?: (
    data: TResponse | undefined,
    error: ApiError | null,
    variables: MutationVariables<TBody>,
    context: TContext | undefined
  ) => void | Promise<void>;
  /** Retry configuration */
  retry?: number | boolean;
  /** Retry delay */
  retryDelay?: number;
}

/**
 * Return type for useApiMutation
 */
export interface UseApiMutationResult<TResponse, TBody = unknown>
  extends Omit<UseMutationResult<TResponse, ApiError, MutationVariables<TBody>, unknown>, never> {
  /** Execute mutation with just body */
  mutateWithBody: (body: TBody) => void;
  /** Execute mutation async with just body */
  mutateAsyncWithBody: (body: TBody) => Promise<TResponse>;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook for making typed API mutations
 *
 * @typeParam TResponse - Expected response data type
 * @typeParam TBody - Request body type
 * @typeParam TContext - Mutation context type (for optimistic updates)
 * @param config - Mutation configuration
 * @returns Mutation result with utilities
 *
 * @example
 * ```typescript
 * // Create mutation
 * const createUser = useApiMutation<User, CreateUserDto>({
 *   method: 'POST',
 *   url: '/users',
 *   invalidateQueries: [['users', 'list']],
 * });
 *
 * // Execute
 * createUser.mutate({ body: { name: 'John', email: 'john@example.com' } });
 *
 * // Or with simplified API
 * createUser.mutateWithBody({ name: 'John', email: 'john@example.com' });
 *
 * // Update mutation with path params
 * const updateUser = useApiMutation<User, UpdateUserDto>({
 *   method: 'PATCH',
 *   url: '/users/:id',
 *   invalidateQueries: [['users', 'list']],
 * });
 *
 * updateUser.mutate({
 *   pathParams: { id: '123' },
 *   body: { name: 'Updated Name' },
 * });
 *
 * // Delete mutation
 * const deleteUser = useApiMutation<void>({
 *   method: 'DELETE',
 *   url: '/users/:id',
 *   invalidateQueries: [['users', 'list']],
 * });
 *
 * deleteUser.mutate({ pathParams: { id: '123' } });
 * ```
 */
export function useApiMutation<
  TResponse = unknown,
  TBody = unknown,
  TContext = unknown,
>(
  config: ApiMutationConfig<TResponse, TBody, TContext>
): UseApiMutationResult<TResponse, TBody> {
  const { client } = useApiClient();
  const queryClient = useQueryClient();

  // Mutation function
  const mutationFn = useCallback(
    async (variables: MutationVariables<TBody>): Promise<TResponse> => {
      // Build URL with path params
      let url = config.url;
      if (variables.pathParams) {
        for (const [key, value] of Object.entries(variables.pathParams)) {
          url = url.replace(`:${key}`, encodeURIComponent(String(value)));
        }
      }

      const requestOptions: Partial<RequestConfig> = {
        params: variables.queryParams,
        ...config.requestOptions,
      };

      let response: ApiResponse<TResponse>;

      switch (config.method) {
        case 'POST':
          response = await client.post<TResponse, TBody>(
            url,
            variables.body,
            requestOptions
          );
          break;
        case 'PUT':
          response = await client.put<TResponse, TBody>(
            url,
            variables.body,
            requestOptions
          );
          break;
        case 'PATCH':
          response = await client.patch<TResponse, TBody>(
            url,
            variables.body,
            requestOptions
          );
          break;
        case 'DELETE':
          response = await client.delete<TResponse>(url, requestOptions);
          break;
      }

      return response.data;
    },
    [client, config.url, config.method, config.requestOptions]
  );

  // Build onMutate handler with optimistic update support
  const onMutate = useCallback(
    async (variables: MutationVariables<TBody>): Promise<TContext> => {
      // Run custom onMutate if provided
      if (config.onMutate) {
        return config.onMutate(variables);
      }

      // Handle built-in optimistic updates
      if (config.optimisticQueryKey && config.optimisticUpdate) {
        await queryClient.cancelQueries({ queryKey: config.optimisticQueryKey });

        const previousData = queryClient.getQueryData(config.optimisticQueryKey);

        queryClient.setQueryData(config.optimisticQueryKey, (old: unknown) =>
          config.optimisticUpdate!(old, variables)
        );

        return { previousData } as TContext;
      }

      return undefined as TContext;
    },
    [queryClient, config]
  );

  // Build onSuccess handler
  const onSuccess = useCallback(
    async (
      data: TResponse,
      variables: MutationVariables<TBody>,
      context: TContext | undefined
    ) => {
      // Invalidate queries
      if (config.invalidateQueries && config.invalidateQueries.length > 0) {
        await Promise.all(
          config.invalidateQueries.map((queryKey) =>
            queryClient.invalidateQueries({ queryKey })
          )
        );
      }

      // Refetch queries
      if (config.refetchQueries && config.refetchQueries.length > 0) {
        await Promise.all(
          config.refetchQueries.map((queryKey) =>
            queryClient.refetchQueries({ queryKey })
          )
        );
      }

      // Call custom onSuccess
      if (config.onSuccess) {
        await config.onSuccess(data, variables, context);
      }
    },
    [queryClient, config]
  );

  // Build onError handler
  const onError = useCallback(
    async (
      error: ApiError,
      variables: MutationVariables<TBody>,
      context: TContext | undefined
    ) => {
      // Rollback optimistic update
      if (config.optimisticQueryKey && context) {
        const ctx = context as { previousData?: unknown };
        if (ctx.previousData !== undefined) {
          queryClient.setQueryData(config.optimisticQueryKey, ctx.previousData);
        }
      }

      // Call custom onError
      if (config.onError) {
        await config.onError(error, variables, context);
      }
    },
    [queryClient, config]
  );

  // Build onSettled handler
  const onSettled = useCallback(
    async (
      data: TResponse | undefined,
      error: ApiError | null,
      variables: MutationVariables<TBody>,
      context: TContext | undefined
    ) => {
      // Invalidate optimistic query to ensure fresh data
      if (config.optimisticQueryKey) {
        await queryClient.invalidateQueries({ queryKey: config.optimisticQueryKey });
      }

      // Call custom onSettled
      if (config.onSettled) {
        await config.onSettled(data, error, variables, context);
      }
    },
    [queryClient, config]
  );

  // Execute mutation
  const mutation = useMutation<TResponse, ApiError, MutationVariables<TBody>, TContext>({
    mutationFn,
    onMutate,
    onSuccess,
    onError,
    onSettled,
    retry: config.retry,
    retryDelay: config.retryDelay,
  });

  // Simplified mutate functions
  const mutateWithBody = useCallback(
    (body: TBody) => {
      mutation.mutate({ body });
    },
    [mutation]
  );

  const mutateAsyncWithBody = useCallback(
    (body: TBody) => {
      return mutation.mutateAsync({ body });
    },
    [mutation]
  );

  // Build result
  return useMemo(
    () => ({
      ...mutation,
      mutateWithBody,
      mutateAsyncWithBody,
    }),
    [mutation, mutateWithBody, mutateAsyncWithBody]
  );
}

// =============================================================================
// TYPED MUTATION HOOKS
// =============================================================================

/**
 * Hook for POST mutations
 *
 * @example
 * ```typescript
 * const createUser = usePost<User, CreateUserDto>('/users', {
 *   invalidateQueries: [['users', 'list']],
 * });
 *
 * createUser.mutateWithBody({ name: 'John' });
 * ```
 */
export function usePost<TResponse = unknown, TBody = unknown, TContext = unknown>(
  url: string,
  options?: Omit<ApiMutationConfig<TResponse, TBody, TContext>, 'method' | 'url'>
): UseApiMutationResult<TResponse, TBody> {
  return useApiMutation<TResponse, TBody, TContext>({
    method: 'POST',
    url,
    ...options,
  });
}

/**
 * Hook for PUT mutations
 *
 * @example
 * ```typescript
 * const updateUser = usePut<User, UpdateUserDto>('/users/:id', {
 *   invalidateQueries: [['users', 'list']],
 * });
 *
 * updateUser.mutate({
 *   pathParams: { id: '123' },
 *   body: { name: 'Updated' },
 * });
 * ```
 */
export function usePut<TResponse = unknown, TBody = unknown, TContext = unknown>(
  url: string,
  options?: Omit<ApiMutationConfig<TResponse, TBody, TContext>, 'method' | 'url'>
): UseApiMutationResult<TResponse, TBody> {
  return useApiMutation<TResponse, TBody, TContext>({
    method: 'PUT',
    url,
    ...options,
  });
}

/**
 * Hook for PATCH mutations
 *
 * @example
 * ```typescript
 * const patchUser = usePatch<User, Partial<User>>('/users/:id');
 *
 * patchUser.mutate({
 *   pathParams: { id: '123' },
 *   body: { status: 'active' },
 * });
 * ```
 */
export function usePatch<TResponse = unknown, TBody = unknown, TContext = unknown>(
  url: string,
  options?: Omit<ApiMutationConfig<TResponse, TBody, TContext>, 'method' | 'url'>
): UseApiMutationResult<TResponse, TBody> {
  return useApiMutation<TResponse, TBody, TContext>({
    method: 'PATCH',
    url,
    ...options,
  });
}

/**
 * Hook for DELETE mutations
 *
 * @example
 * ```typescript
 * const deleteUser = useDelete<void>('/users/:id', {
 *   invalidateQueries: [['users', 'list']],
 * });
 *
 * deleteUser.mutate({ pathParams: { id: '123' } });
 * ```
 */
export function useDelete<TResponse = unknown, TContext = unknown>(
  url: string,
  options?: Omit<ApiMutationConfig<TResponse, never, TContext>, 'method' | 'url'>
): UseApiMutationResult<TResponse, never> {
  return useApiMutation<TResponse, never, TContext>({
    method: 'DELETE',
    url,
    ...options,
  });
}

// =============================================================================
// OPTIMISTIC UPDATE HELPERS
// =============================================================================

/**
 * Create optimistic update configuration for adding item to list
 *
 * @example
 * ```typescript
 * const createUser = usePost<User, CreateUserDto>('/users', {
 *   ...createOptimisticAdd(['users', 'list'], (body) => ({
 *     ...body,
 *     id: 'temp-id',
 *     createdAt: new Date().toISOString(),
 *   })),
 * });
 * ```
 */
export function createOptimisticAdd<TItem>(
  queryKey: QueryKey,
  createTempItem: (body: unknown) => TItem
): Pick<
  ApiMutationConfig<TItem, unknown, { previousData: TItem[] | undefined }>,
  'optimisticQueryKey' | 'optimisticUpdate'
> {
  return {
    optimisticQueryKey: queryKey,
    optimisticUpdate: (oldData, variables) => {
      const items = oldData as TItem[] | undefined;
      if (!items) return [createTempItem(variables.body)];
      return [...items, createTempItem(variables.body)];
    },
  };
}

/**
 * Create optimistic update configuration for updating item in list
 *
 * @example
 * ```typescript
 * const updateUser = usePatch<User, Partial<User>>('/users/:id', {
 *   ...createOptimisticUpdate<User>(['users', 'list'], (item) => item.id),
 * });
 * ```
 */
export function createOptimisticUpdate<TItem extends Record<string, unknown>>(
  queryKey: QueryKey,
  getItemId: (item: TItem) => string | number
): Pick<
  ApiMutationConfig<TItem, Partial<TItem>, { previousData: TItem[] | undefined }>,
  'optimisticQueryKey' | 'optimisticUpdate'
> {
  return {
    optimisticQueryKey: queryKey,
    optimisticUpdate: (oldData, variables) => {
      const items = oldData as TItem[] | undefined;
      if (!items) return items;

      const id = variables.pathParams?.id;
      if (!id) return items;

      return items.map((item) =>
        getItemId(item) === id ? { ...item, ...variables.body } : item
      );
    },
  };
}

/**
 * Create optimistic update configuration for removing item from list
 *
 * @example
 * ```typescript
 * const deleteUser = useDelete<void>('/users/:id', {
 *   ...createOptimisticRemove<User>(['users', 'list'], (item) => item.id),
 * });
 * ```
 */
export function createOptimisticRemove<TItem>(
  queryKey: QueryKey,
  getItemId: (item: TItem) => string | number
): Pick<
  ApiMutationConfig<void, never, { previousData: TItem[] | undefined }>,
  'optimisticQueryKey' | 'optimisticUpdate'
> {
  return {
    optimisticQueryKey: queryKey,
    optimisticUpdate: (oldData, variables) => {
      const items = oldData as TItem[] | undefined;
      if (!items) return items;

      const id = variables.pathParams?.id;
      if (!id) return items;

      return items.filter((item) => getItemId(item) !== id);
    },
  };
}

// =============================================================================
// BATCH MUTATIONS
// =============================================================================

/**
 * Hook for executing multiple mutations in sequence
 *
 * @example
 * ```typescript
 * const batchUpdate = useBatchMutation<User, UpdateUserDto>(
 *   '/users/:id',
 *   'PATCH'
 * );
 *
 * await batchUpdate.mutateAsync([
 *   { pathParams: { id: '1' }, body: { status: 'active' } },
 *   { pathParams: { id: '2' }, body: { status: 'active' } },
 * ]);
 * ```
 */
export function useBatchMutation<TResponse = unknown, TBody = unknown>(
  url: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  options?: Omit<ApiMutationConfig<TResponse[], TBody>, 'method' | 'url'>
): {
  mutate: (variables: MutationVariables<TBody>[]) => void;
  mutateAsync: (variables: MutationVariables<TBody>[]) => Promise<TResponse[]>;
  isPending: boolean;
  isError: boolean;
  error: ApiError | null;
  data: TResponse[] | undefined;
  reset: () => void;
} {
  const { client } = useApiClient();
  const queryClient = useQueryClient();

  const mutation = useMutation<TResponse[], ApiError, MutationVariables<TBody>[]>({
    mutationFn: async (variables) => {
      const results: TResponse[] = [];

      for (const v of variables) {
        let reqUrl = url;
        if (v.pathParams) {
          for (const [key, value] of Object.entries(v.pathParams)) {
            reqUrl = reqUrl.replace(`:${key}`, encodeURIComponent(String(value)));
          }
        }

        let response: ApiResponse<TResponse>;

        switch (method) {
          case 'POST':
            response = await client.post<TResponse, TBody>(reqUrl, v.body);
            break;
          case 'PUT':
            response = await client.put<TResponse, TBody>(reqUrl, v.body);
            break;
          case 'PATCH':
            response = await client.patch<TResponse, TBody>(reqUrl, v.body);
            break;
          case 'DELETE':
            response = await client.delete<TResponse>(reqUrl);
            break;
        }

        results.push(response.data);
      }

      return results;
    },
    onSuccess: async () => {
      if (options?.invalidateQueries) {
        await Promise.all(
          options.invalidateQueries.map((queryKey) =>
            queryClient.invalidateQueries({ queryKey })
          )
        );
      }
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
}
