/**
 * @file Common Query Helpers
 * @description General-purpose query helpers shared across features
 */

import {
  useQueryClient,
  type InvalidateQueryFilters,
  type QueryKey,
  type QueryState,
} from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

/**
 * Prefetch query options
 */
export interface PrefetchOptions {
  staleTime?: number;
  force?: boolean;
}

/**
 * Hook to prefetch queries on demand
 */
export function usePrefetch(): {
  prefetch: <T>(
    queryKey: QueryKey,
    queryFn: () => Promise<T>,
    options?: PrefetchOptions
  ) => Promise<void>;
} {
  const queryClient = useQueryClient();

  const prefetch = useCallback(
    async <T>(
      queryKey: QueryKey,
      queryFn: () => Promise<T>,
      options?: PrefetchOptions
    ): Promise<void> => {
      const { staleTime = 5 * 60 * 1000, force = false } = options ?? {};

      if (force) {
        await queryClient.fetchQuery({
          queryKey,
          queryFn,
          staleTime,
        });
      } else {
        await queryClient.prefetchQuery({
          queryKey,
          queryFn,
          staleTime,
        });
      }
    },
    [queryClient]
  );

  return { prefetch };
}

/**
 * Hook to invalidate queries by pattern
 */
export function useInvalidateQueries(): {
  invalidate: (filters: InvalidateQueryFilters) => Promise<void>;
  invalidateAll: () => Promise<void>;
  invalidateByKey: (queryKey: QueryKey) => Promise<void>;
} {
  const queryClient = useQueryClient();

  const invalidate = useCallback(
    async (filters: InvalidateQueryFilters) => {
      await queryClient.invalidateQueries(filters);
    },
    [queryClient]
  );

  const invalidateAll = useCallback(async () => {
    await queryClient.invalidateQueries();
  }, [queryClient]);

  const invalidateByKey = useCallback(
    async (queryKey: QueryKey) => {
      await queryClient.invalidateQueries({ queryKey });
    },
    [queryClient]
  );

  return {
    invalidate,
    invalidateAll,
    invalidateByKey,
  };
}

/**
 * Hook to get query state information
 */
export function useQueryState<T>(queryKey: QueryKey): {
  state: QueryState<T, Error> | undefined;
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  isPending: boolean;
} {
  const queryClient = useQueryClient();

  const state = useMemo(() => {
    return queryClient.getQueryState<T>(queryKey);
  }, [queryClient, queryKey]);

  const data = useMemo(() => {
    return queryClient.getQueryData<T>(queryKey);
  }, [queryClient, queryKey]);

  const isLoading = state?.fetchStatus === 'fetching';
  const isError = state?.status === 'error';
  const isSuccess = state?.status === 'success';
  const isPending = state?.status === 'pending';

  return {
    state,
    data,
    isLoading,
    isError,
    isSuccess,
    isPending,
  };
}

/**
 * Hook to manage optimistic updates
 */
export function useOptimisticUpdate<T>(): {
  update: <R>(
    queryKey: QueryKey,
    updateFn: (old: T | undefined) => T,
    mutationFn: () => Promise<R>,
    options?: {
      onError?: (error: Error, previousData: T | undefined) => void;
      onSuccess?: (result: R) => void;
    }
  ) => Promise<R>;
} {
  const queryClient = useQueryClient();

  const update = useCallback(
    async <R>(
      queryKey: QueryKey,
      updateFn: (old: T | undefined) => T,
      mutationFn: () => Promise<R>,
      options?: {
        onError?: (error: Error, previousData: T | undefined) => void;
        onSuccess?: (result: R) => void;
      }
    ) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<T>(queryKey);

      // Optimistically update
      queryClient.setQueryData<T>(queryKey, updateFn);

      try {
        const result = await mutationFn();
        options?.onSuccess?.(result);
        return result;
      } catch (error) {
        // Rollback on error
        queryClient.setQueryData<T>(queryKey, previousData);
        options?.onError?.(error as Error, previousData);
        throw error;
      }
    },
    [queryClient]
  );

  return { update };
}

/**
 * Merge paginated data helper
 */
export function mergePaginatedData<T extends { id: string }>(
  existing: T[] | undefined,
  incoming: T[]
): T[] {
  if (!existing) return incoming;

  const existingMap = new Map(existing.map((item) => [item.id, item]));

  incoming.forEach((item) => {
    existingMap.set(item.id, item);
  });

  return Array.from(existingMap.values());
}

/**
 * Infinite query page merger
 */
export function mergeInfinitePages<T>(pages: T[][], newPage: T[], pageIndex: number): T[][] {
  const result = [...pages];
  result[pageIndex] = newPage;
  return result;
}

/**
 * Query retry delay calculator (exponential backoff)
 */
export function calculateRetryDelay(attemptIndex: number): number {
  const baseDelay = 1000;
  const maxDelay = 30000;
  const delay = Math.min(baseDelay * Math.pow(2, attemptIndex), maxDelay);
  // Add jitter
  return delay + Math.random() * 1000;
}

/**
 * Check if query data is stale
 */
export function isQueryStale(
  state: QueryState<unknown, Error> | undefined,
  staleTime: number
): boolean {
  if (state?.dataUpdatedAt == null || state.dataUpdatedAt === 0) return true;
  return Date.now() - state.dataUpdatedAt > staleTime;
}

/**
 * Create a typed query key factory
 */
export function createQueryKeyFactory<T extends Record<string, unknown>>(
  scope: string
): {
  all: readonly [string];
  lists: () => readonly [string, 'list'];
  list: (filters?: T) => readonly [string, 'list', T | undefined];
  details: () => readonly [string, 'detail'];
  detail: (id: string) => readonly [string, 'detail', string];
} {
  return {
    all: [scope] as const,
    lists: () => [scope, 'list'] as const,
    list: (filters?: T) => [scope, 'list', filters] as const,
    details: () => [scope, 'detail'] as const,
    detail: (id: string) => [scope, 'detail', id] as const,
  };
}

/**
 * Batch query updates for performance
 */
export function useBatchQueryUpdates(): {
  batchUpdate: (updates: Array<{ queryKey: QueryKey; data: unknown }>) => void;
} {
  const queryClient = useQueryClient();

  const batchUpdate = useCallback(
    (updates: Array<{ queryKey: QueryKey; data: unknown }>) => {
      queryClient.setQueriesData({ predicate: () => true }, (oldData: unknown) => {
        const update = updates.find((u) => JSON.stringify(u.queryKey) === JSON.stringify(oldData));
        return update ? update.data : oldData;
      });
    },
    [queryClient]
  );

  return { batchUpdate };
}
