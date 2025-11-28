/**
 * @file useApiCache Hook
 * @description React hook for managing API response caching with utilities for
 * reading, updating, invalidating, and monitoring cache state.
 *
 * @example
 * ```typescript
 * import { useApiCache } from '@/lib/api';
 *
 * function CacheManager() {
 *   const {
 *     getData,
 *     setData,
 *     invalidate,
 *     invalidateAll,
 *     getStats,
 *   } = useApiCache();
 *
 *   // Get cached data
 *   const users = getData<User[]>(['users', 'list']);
 *
 *   // Update cache
 *   setData(['users', '123'], { ...user, name: 'Updated' });
 *
 *   // Invalidate specific queries
 *   await invalidate(['users']);
 *
 *   return <div>Cache entries: {getStats().queries}</div>;
 * }
 * ```
 */

import { useCallback, useMemo, useState, useEffect } from 'react';
import {
  useQueryClient,
  type QueryKey,
  type QueryState,
  type Query,
} from '@tanstack/react-query';
import type { CacheStats } from '../types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Cache query filter options
 */
export interface CacheFilterOptions {
  /** Match exact query key */
  exact?: boolean;
  /** Filter by query type */
  type?: 'active' | 'inactive' | 'all';
  /** Filter stale queries */
  stale?: boolean;
  /** Filter fetching queries */
  fetching?: boolean;
  /** Custom predicate */
  predicate?: (query: Query) => boolean;
}

/**
 * Cache entry info for inspection
 */
export interface CacheEntryInfo<TData = unknown> {
  queryKey: QueryKey;
  data: TData | undefined;
  state: QueryState<TData>;
  isStale: boolean;
  isFetching: boolean;
  dataUpdatedAt: number;
  errorUpdatedAt: number;
  fetchStatus: 'fetching' | 'paused' | 'idle';
}

/**
 * Return type for useApiCache
 */
export interface UseApiCacheResult {
  /** Get cached data for a query key */
  getData: <TData = unknown>(queryKey: QueryKey) => TData | undefined;

  /** Set cached data for a query key */
  setData: <TData = unknown>(
    queryKey: QueryKey,
    updater: TData | ((old: TData | undefined) => TData)
  ) => TData | undefined;

  /** Remove cached data for a query key */
  removeData: (queryKey: QueryKey) => void;

  /** Invalidate queries matching the key */
  invalidate: (queryKey: QueryKey, options?: { exact?: boolean }) => Promise<void>;

  /** Invalidate all queries */
  invalidateAll: () => Promise<void>;

  /** Refetch queries matching the key */
  refetch: (queryKey: QueryKey, options?: { exact?: boolean }) => Promise<void>;

  /** Cancel in-flight queries */
  cancel: (queryKey: QueryKey) => Promise<void>;

  /** Reset queries to initial state */
  reset: (queryKey: QueryKey) => Promise<void>;

  /** Prefetch a query */
  prefetch: <TData = unknown>(
    queryKey: QueryKey,
    queryFn: () => Promise<TData>,
    options?: { staleTime?: number }
  ) => Promise<void>;

  /** Get cache statistics */
  getStats: () => CacheStats;

  /** Get cache entry info */
  getEntry: <TData = unknown>(queryKey: QueryKey) => CacheEntryInfo<TData> | null;

  /** Get all cache entries matching filter */
  getEntries: <TData = unknown>(filter?: CacheFilterOptions) => CacheEntryInfo<TData>[];

  /** Check if query exists in cache */
  hasQuery: (queryKey: QueryKey) => boolean;

  /** Check if query is stale */
  isStale: (queryKey: QueryKey) => boolean;

  /** Check if query is fetching */
  isFetching: (queryKey: QueryKey) => boolean;

  /** Clear entire cache */
  clear: () => void;

  /** Subscribe to cache changes */
  subscribe: (callback: () => void) => () => void;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook for managing API response cache
 *
 * @returns Cache management utilities
 *
 * @example
 * ```typescript
 * function UserList() {
 *   const { getData, setData, invalidate } = useApiCache();
 *
 *   // Read from cache
 *   const cachedUsers = getData<User[]>(['users', 'list']);
 *
 *   // Optimistically update cache
 *   const handleOptimisticUpdate = (userId: string, updates: Partial<User>) => {
 *     setData<User[]>(['users', 'list'], (users) =>
 *       users?.map(u => u.id === userId ? { ...u, ...updates } : u) ?? []
 *     );
 *   };
 *
 *   // Invalidate after mutation
 *   const handleMutationSuccess = async () => {
 *     await invalidate(['users']);
 *   };
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function useApiCache(): UseApiCacheResult {
  const queryClient = useQueryClient();

  // Get cached data
  const getData = useCallback(
    <TData = unknown>(queryKey: QueryKey): TData | undefined => {
      return queryClient.getQueryData<TData>(queryKey);
    },
    [queryClient]
  );

  // Set cached data
  const setData = useCallback(
    <TData = unknown>(
      queryKey: QueryKey,
      updater: TData | ((old: TData | undefined) => TData)
    ): TData | undefined => {
      return queryClient.setQueryData<TData>(queryKey, updater);
    },
    [queryClient]
  );

  // Remove cached data
  const removeData = useCallback(
    (queryKey: QueryKey): void => {
      queryClient.removeQueries({ queryKey });
    },
    [queryClient]
  );

  // Invalidate queries
  const invalidate = useCallback(
    async (queryKey: QueryKey, options?: { exact?: boolean }): Promise<void> => {
      await queryClient.invalidateQueries({
        queryKey,
        exact: options?.exact,
      });
    },
    [queryClient]
  );

  // Invalidate all queries
  const invalidateAll = useCallback(async (): Promise<void> => {
    await queryClient.invalidateQueries();
  }, [queryClient]);

  // Refetch queries
  const refetch = useCallback(
    async (queryKey: QueryKey, options?: { exact?: boolean }): Promise<void> => {
      await queryClient.refetchQueries({
        queryKey,
        exact: options?.exact,
      });
    },
    [queryClient]
  );

  // Cancel queries
  const cancel = useCallback(
    async (queryKey: QueryKey): Promise<void> => {
      await queryClient.cancelQueries({ queryKey });
    },
    [queryClient]
  );

  // Reset queries
  const reset = useCallback(
    async (queryKey: QueryKey): Promise<void> => {
      await queryClient.resetQueries({ queryKey });
    },
    [queryClient]
  );

  // Prefetch query
  const prefetch = useCallback(
    async <TData = unknown>(
      queryKey: QueryKey,
      queryFn: () => Promise<TData>,
      options?: { staleTime?: number }
    ): Promise<void> => {
      await queryClient.prefetchQuery({
        queryKey,
        queryFn,
        staleTime: options?.staleTime,
      });
    },
    [queryClient]
  );

  // Get cache statistics
  const getStats = useCallback((): CacheStats => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();

    let hits = 0;
    let misses = 0;
    let totalSize = 0;

    for (const query of queries) {
      const { state } = query;
      if (state.data !== undefined) {
        hits++;
        // Estimate size (rough approximation)
        try {
          totalSize += JSON.stringify(state.data).length * 2; // UTF-16
        } catch {
          // Skip circular references
        }
      } else {
        misses++;
      }
    }

    return {
      entries: queries.length,
      size: totalSize,
      hits,
      misses,
      hitRate: queries.length > 0 ? hits / queries.length : 0,
      evictions: 0, // Not tracked by React Query
    };
  }, [queryClient]);

  // Get cache entry info
  const getEntry = useCallback(
    <TData = unknown>(queryKey: QueryKey): CacheEntryInfo<TData> | null => {
      const query = queryClient.getQueryCache().find({ queryKey });

      if (!query) return null;

      const state = query.state as QueryState<TData>;

      return {
        queryKey: query.queryKey,
        data: state.data,
        state,
        isStale: query.isStale(),
        isFetching: query.state.fetchStatus === 'fetching',
        dataUpdatedAt: state.dataUpdatedAt,
        errorUpdatedAt: state.errorUpdatedAt,
        fetchStatus: state.fetchStatus,
      };
    },
    [queryClient]
  );

  // Get all cache entries
  const getEntries = useCallback(
    <TData = unknown>(filter?: CacheFilterOptions): CacheEntryInfo<TData>[] => {
      const cache = queryClient.getQueryCache();
      let queries = cache.getAll();

      // Apply filters
      if (filter) {
        if (filter.type === 'active') {
          queries = queries.filter((q) => q.isActive());
        } else if (filter.type === 'inactive') {
          queries = queries.filter((q) => !q.isActive());
        }

        if (filter.stale !== undefined) {
          queries = queries.filter((q) => q.isStale() === filter.stale);
        }

        if (filter.fetching !== undefined) {
          queries = queries.filter(
            (q) => (q.state.fetchStatus === 'fetching') === filter.fetching
          );
        }

        if (filter.predicate) {
          queries = queries.filter(filter.predicate);
        }
      }

      return queries.map((query) => {
        const state = query.state as QueryState<TData>;
        return {
          queryKey: query.queryKey,
          data: state.data,
          state,
          isStale: query.isStale(),
          isFetching: query.state.fetchStatus === 'fetching',
          dataUpdatedAt: state.dataUpdatedAt,
          errorUpdatedAt: state.errorUpdatedAt,
          fetchStatus: state.fetchStatus,
        };
      });
    },
    [queryClient]
  );

  // Check if query exists
  const hasQuery = useCallback(
    (queryKey: QueryKey): boolean => {
      return queryClient.getQueryCache().find({ queryKey }) !== undefined;
    },
    [queryClient]
  );

  // Check if query is stale
  const isStale = useCallback(
    (queryKey: QueryKey): boolean => {
      const query = queryClient.getQueryCache().find({ queryKey });
      return query?.isStale() ?? true;
    },
    [queryClient]
  );

  // Check if query is fetching
  const isFetching = useCallback(
    (queryKey: QueryKey): boolean => {
      return queryClient.isFetching({ queryKey }) > 0;
    },
    [queryClient]
  );

  // Clear cache
  const clear = useCallback((): void => {
    queryClient.clear();
  }, [queryClient]);

  // Subscribe to cache changes
  const subscribe = useCallback(
    (callback: () => void): (() => void) => {
      return queryClient.getQueryCache().subscribe(callback);
    },
    [queryClient]
  );

  return useMemo(
    () => ({
      getData,
      setData,
      removeData,
      invalidate,
      invalidateAll,
      refetch,
      cancel,
      reset,
      prefetch,
      getStats,
      getEntry,
      getEntries,
      hasQuery,
      isStale,
      isFetching,
      clear,
      subscribe,
    }),
    [
      getData,
      setData,
      removeData,
      invalidate,
      invalidateAll,
      refetch,
      cancel,
      reset,
      prefetch,
      getStats,
      getEntry,
      getEntries,
      hasQuery,
      isStale,
      isFetching,
      clear,
      subscribe,
    ]
  );
}

// =============================================================================
// SPECIALIZED HOOKS
// =============================================================================

/**
 * Hook for monitoring cache statistics
 *
 * @example
 * ```typescript
 * function CacheMonitor() {
 *   const { stats, isMonitoring, startMonitoring, stopMonitoring } = useCacheMonitor({
 *     interval: 5000,
 *     autoStart: true,
 *   });
 *
 *   return (
 *     <div>
 *       <p>Entries: {stats.entries}</p>
 *       <p>Hit Rate: {(stats.hitRate * 100).toFixed(1)}%</p>
 *       <p>Size: {(stats.size / 1024).toFixed(1)} KB</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useCacheMonitor(options?: {
  interval?: number;
  autoStart?: boolean;
}): {
  stats: CacheStats;
  isMonitoring: boolean;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  refresh: () => void;
} {
  const { getStats, subscribe } = useApiCache();
  const [stats, setStats] = useState<CacheStats>(getStats);
  const [isMonitoring, setIsMonitoring] = useState(options?.autoStart ?? false);

  const refresh = useCallback(() => {
    setStats(getStats());
  }, [getStats]);

  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
  }, []);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
  }, []);

  // Subscribe to cache changes
  useEffect(() => {
    if (isMonitoring) {
      const unsubscribe = subscribe(refresh);
      return unsubscribe;
    }
    return undefined;
  }, [isMonitoring, subscribe, refresh]);

  // Polling interval
  useEffect(() => {
    if (isMonitoring === true && options?.interval !== undefined && options.interval !== null && options.interval > 0) {
      const timer = setInterval(refresh, options.interval);
      return () => clearInterval(timer);
    }
    return undefined;
  }, [isMonitoring, options?.interval, refresh]);

  return {
    stats,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    refresh,
  };
}

/**
 * Hook for watching specific cache entries
 *
 * @example
 * ```typescript
 * function UserCacheWatcher({ userId }: { userId: string }) {
 *   const { entry, isLoaded, isStale } = useCacheEntry<User>(['users', userId]);
 *
 *   if (!isLoaded) return <p>Not in cache</p>;
 *   if (isStale) return <p>Data is stale</p>;
 *
 *   return <p>User: {entry.data?.name}</p>;
 * }
 * ```
 */
export function useCacheEntry<TData = unknown>(queryKey: QueryKey): {
  entry: CacheEntryInfo<TData> | null;
  isLoaded: boolean;
  isStale: boolean;
  isFetching: boolean;
  refresh: () => void;
} {
  const { getEntry, subscribe } = useApiCache();
  const [entry, setEntry] = useState<CacheEntryInfo<TData> | null>(() =>
    getEntry<TData>(queryKey)
  );

  const refresh = useCallback(() => {
    setEntry(getEntry<TData>(queryKey));
  }, [getEntry, queryKey]);

  // Subscribe to changes
  useEffect(() => {
    const unsubscribe = subscribe(refresh);
    return unsubscribe;
  }, [subscribe, refresh]);

  // Update when query key changes
  const serializedKey = JSON.stringify(queryKey);
  useEffect(() => {
    // Refresh is intentionally called here to update cache entry when query key changes
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh, serializedKey]);

  return {
    entry,
    isLoaded: entry?.data !== undefined,
    isStale: entry?.isStale ?? true,
    isFetching: entry?.isFetching ?? false,
    refresh,
  };
}

/**
 * Hook for bulk cache operations
 *
 * @example
 * ```typescript
 * function BulkCacheOperations() {
 *   const { invalidateByTag, removeByPredicate } = useBulkCacheOperations();
 *
 *   const handleLogout = async () => {
 *     // Invalidate all user-related queries
 *     await invalidateByTag('user');
 *   };
 *
 *   const handleClearStale = () => {
 *     removeByPredicate((query) => query.isStale());
 *   };
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function useBulkCacheOperations(): {
  invalidateByTag: (tag: string) => Promise<void>;
  invalidateByPrefix: (prefix: string) => Promise<void>;
  removeByPredicate: (predicate: (query: Query) => boolean) => void;
  refetchActive: () => Promise<void>;
  refetchStale: () => Promise<void>;
} {
  const queryClient = useQueryClient();

  const invalidateByTag = useCallback(
    async (tag: string): Promise<void> => {
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const { meta } = query;
          const tags = meta?.tags as string[] | undefined;
          return Boolean(meta?.tag === tag || tags?.includes(tag));
        },
      });
    },
    [queryClient]
  );

  const invalidateByPrefix = useCallback(
    async (prefix: string): Promise<void> => {
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const [firstKey] = query.queryKey;
          return typeof firstKey === 'string' && firstKey.startsWith(prefix);
        },
      });
    },
    [queryClient]
  );

  const removeByPredicate = useCallback(
    (predicate: (query: Query) => boolean): void => {
      queryClient.removeQueries({ predicate });
    },
    [queryClient]
  );

  const refetchActive = useCallback(async (): Promise<void> => {
    await queryClient.refetchQueries({ type: 'active' });
  }, [queryClient]);

  const refetchStale = useCallback(async (): Promise<void> => {
    await queryClient.refetchQueries({ stale: true });
  }, [queryClient]);

  return {
    invalidateByTag,
    invalidateByPrefix,
    removeByPredicate,
    refetchActive,
    refetchStale,
  };
}
