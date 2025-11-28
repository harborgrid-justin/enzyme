/**
 * @file Optimistic Mutations
 * @description Production-grade optimistic update patterns with multi-query rollback,
 * conflict resolution, offline support, and queue management.
 * Designed for seamless UX during mutations.
 */

import {
  type QueryClient,
  type QueryKey,
  useMutation,
  useQueryClient,
  type UseMutationOptions,
  type MutationFunction,
} from '@tanstack/react-query';
import { useCallback, useRef, useMemo } from 'react';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Snapshot of query data for rollback
 */
export interface QuerySnapshot<T = unknown> {
  /** Query key */
  queryKey: QueryKey;
  /** Snapshotted data */
  data: T | undefined;
  /** Snapshot timestamp */
  timestamp: number;
  /** Data version/etag if available */
  version?: string;
}

/**
 * Optimistic mutation context
 */
export interface OptimisticContext<T = unknown> {
  /** Query snapshots for rollback */
  snapshots: QuerySnapshot<T>[];
  /** The optimistic data applied */
  optimisticData?: T;
  /** Rollback function */
  rollbackFn: () => void;
  /** Mutation ID */
  mutationId: string;
  /** Start timestamp */
  startTime: number;
}

/**
 * Conflict resolution strategy
 */
export type ConflictStrategy = 'server-wins' | 'client-wins' | 'merge' | 'manual';

/**
 * Conflict resolution context
 */
export interface ConflictContext<T> {
  /** Server response data */
  serverData: T;
  /** Client optimistic data */
  clientData: T | undefined;
  /** Original data before mutation */
  originalData: T | undefined;
  /** Query key */
  queryKey: QueryKey;
}

/**
 * Optimistic update configuration
 */
export interface OptimisticUpdateConfig<TData, TVariables, TContext = unknown> {
  /** Query keys to update optimistically */
  queryKeys: QueryKey[] | ((variables: TVariables) => QueryKey[]);

  /** Generate optimistic data from variables */
  getOptimisticData: (variables: TVariables, currentData: TData | undefined) => TData;

  /** Handle successful mutation */
  onSuccess?: (data: TData, variables: TVariables, context: OptimisticContext<TData>) => void;

  /** Handle mutation error with rollback */
  onError?: (error: Error, variables: TVariables, context: OptimisticContext<TData>) => void;

  /** Custom rollback logic */
  customRollback?: (snapshots: QuerySnapshot<TData>[], queryClient: QueryClient) => void;

  /** Conflict resolution strategy */
  conflictStrategy?: ConflictStrategy;

  /** Custom merge function for 'merge' strategy */
  mergeFn?: (context: ConflictContext<TData>) => TData;

  /** Manual conflict resolution handler */
  onConflict?: (context: ConflictContext<TData>) => TData | Promise<TData>;

  /** Enable offline optimistic updates */
  offlineSupport?: boolean;

  /** Retry failed mutations when back online */
  retryOnReconnect?: boolean;

  /** Custom context generator */
  getContext?: TContext;
}

// =============================================================================
// OPTIMISTIC MUTATION HOOK
// =============================================================================

/**
 * Create optimistic mutation hook with advanced features
 */
export function useOptimisticMutation<TData = unknown, TError = Error, TVariables = void>(
  mutationFn: MutationFunction<TData, TVariables>,
  config: OptimisticUpdateConfig<TData, TVariables>,
  options?: Omit<
    UseMutationOptions<TData, TError, TVariables, OptimisticContext<TData>>,
    'mutationFn' | 'onMutate' | 'onError' | 'onSuccess' | 'onSettled'
  >
): ReturnType<typeof useMutation<TData, TError, TVariables, OptimisticContext<TData>>> {
  const queryClient = useQueryClient();
  const pendingMutationsRef = useRef<Map<string, OptimisticContext<TData>>>(new Map());

  return useMutation<TData, TError, TVariables, OptimisticContext<TData>>({
    mutationFn,

    onMutate: async (variables): Promise<OptimisticContext<TData>> => {
      const mutationId = crypto.randomUUID();
      const startTime = Date.now();

      // Get query keys to update
      const queryKeys = typeof config.queryKeys === 'function' ? config.queryKeys(variables) : config.queryKeys;

      // Cancel any outgoing refetches to prevent race conditions
      await Promise.all(queryKeys.map(async (key) => queryClient.cancelQueries({ queryKey: key })));

      // Snapshot current data for all affected queries
      const snapshots: QuerySnapshot<TData>[] = queryKeys.map((queryKey) => ({
        queryKey,
        data: queryClient.getQueryData<TData>(queryKey),
        timestamp: startTime,
      }));

      // Apply optimistic updates to all queries
      for (const snapshot of snapshots) {
        const optimisticData = config.getOptimisticData(variables, snapshot.data);
        queryClient.setQueryData<TData>(snapshot.queryKey, optimisticData);
      }

      // Create rollback function
      const rollbackFn = () => {
        for (const snapshot of snapshots) {
          queryClient.setQueryData(snapshot.queryKey, snapshot.data);
        }
      };

      // Store context for potential rollback
      const context: OptimisticContext<TData> = {
        snapshots,
        rollbackFn,
        mutationId,
        startTime,
      };

      pendingMutationsRef.current.set(mutationId, context);

      return context;
    },

    onError: (error, variables, context) => {
      if (!context) return;

      // Execute rollback
      if (config.customRollback) {
        config.customRollback(context.snapshots, queryClient);
      } else {
        context.rollbackFn();
      }

      // Notify error handler
      config.onError?.(error as Error, variables, context);

      // Clean up
      pendingMutationsRef.current.delete(context.mutationId);
    },

    onSuccess: async (data, variables, context) => {
      if (!context) return;

      // Handle conflict resolution based on strategy
      for (const snapshot of context.snapshots) {
        const currentData = queryClient.getQueryData<TData>(snapshot.queryKey);

        const conflictContext: ConflictContext<TData> = {
          serverData: data,
          clientData: currentData,
          originalData: snapshot.data,
          queryKey: snapshot.queryKey,
        };

        let finalData: TData;

        switch (config.conflictStrategy) {
          case 'server-wins':
            finalData = data;
            break;

          case 'merge':
            if (config.mergeFn) {
              finalData = config.mergeFn(conflictContext);
            } else {
              // Default merge: shallow merge server into client
              finalData =
                data !== null && typeof data === 'object'
                  ? ({ ...currentData, ...data } as TData)
                  : data;
            }
            break;

          case 'manual':
            if (config.onConflict) {
              finalData = await config.onConflict(conflictContext);
            } else {
              finalData = data;
            }
            break;

          case 'client-wins':
          default:
            // Keep optimistic data, just invalidate for freshness
            queryClient.invalidateQueries({ queryKey: snapshot.queryKey });
            continue;
        }

        queryClient.setQueryData(snapshot.queryKey, finalData);
      }

      config.onSuccess?.(data, variables, context);

      // Clean up
      pendingMutationsRef.current.delete(context.mutationId);
    },

    onSettled: () => {
      // Additional cleanup if needed
    },

    ...options,
  });
}

// =============================================================================
// LIST OPTIMISTIC UPDATE HELPERS
// =============================================================================

/**
 * List item with required ID
 */
export interface ListItem {
  id: string;
}

/**
 * List response structure
 */
export interface ListResponse<T extends ListItem> {
  items: T[];
  total?: number;
}

/**
 * Create optimistic update helpers for list operations
 */
export function createListOptimisticUpdates<TItem extends ListItem, TList extends ListResponse<TItem>>(): {
  addItem: (list: TList | undefined, newItem: TItem, position?: 'start' | 'end') => TList;
  updateItem: (list: TList | undefined, id: string, updates: Partial<TItem>) => TList;
  removeItem: (list: TList | undefined, id: string) => TList;
  reorderItems: (list: TList | undefined, fromIndex: number, toIndex: number) => TList;
  moveItem: (list: TList | undefined, id: string, toIndex: number) => TList;
  replaceList: (list: TList | undefined, newItems: TItem[]) => TList;
  findItem: (list: TList | undefined, id: string) => TItem | undefined;
  hasItem: (list: TList | undefined, id: string) => boolean;
} {
  return {
    /**
     * Optimistically add item to list
     */
    addItem: (list: TList | undefined, newItem: TItem, position: 'start' | 'end' = 'end'): TList => {
      if (!list) {
        return { items: [newItem], total: 1 } as TList;
      }
      return {
        ...list,
        items: position === 'start' ? [newItem, ...list.items] : [...list.items, newItem],
        total: (list.total ?? list.items.length) + 1,
      };
    },

    /**
     * Optimistically update item in list
     * @returns The updated list, or an empty list structure if input is undefined
     */
    updateItem: (list: TList | undefined, id: string, updates: Partial<TItem>): TList => {
      if (!list) {
        return { items: [], total: 0 } as TList;
      }
      return {
        ...list,
        items: list.items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
      };
    },

    /**
     * Optimistically remove item from list
     * @returns The updated list, or an empty list structure if input is undefined
     */
    removeItem: (list: TList | undefined, id: string): TList => {
      if (!list) {
        return { items: [], total: 0 } as TList;
      }
      return {
        ...list,
        items: list.items.filter((item) => item.id !== id),
        total: Math.max(0, (list.total ?? list.items.length) - 1),
      };
    },

    /**
     * Optimistically reorder items in list
     * @returns The reordered list, or an empty list structure if input is undefined
     */
    reorderItems: (list: TList | undefined, fromIndex: number, toIndex: number): TList => {
      if (!list) {
        return { items: [], total: 0 } as TList;
      }
      const items = [...list.items];
      const [removed] = items.splice(fromIndex, 1);
      if (removed !== undefined) {
        items.splice(toIndex, 0, removed);
      }
      return { ...list, items };
    },

    /**
     * Optimistically move item by ID
     * @returns The updated list, or an empty list structure if input is undefined
     */
    moveItem: (list: TList | undefined, id: string, toIndex: number): TList => {
      if (!list) {
        return { items: [], total: 0 } as TList;
      }
      const fromIndex = list.items.findIndex((item) => item.id === id);
      if (fromIndex === -1) return list;
      const items = [...list.items];
      const [removed] = items.splice(fromIndex, 1);
      if (removed !== undefined) {
        items.splice(toIndex, 0, removed);
      }
      return { ...list, items };
    },

    /**
     * Optimistically replace entire list
     */
    replaceList: (list: TList | undefined, newItems: TItem[]): TList => {
      return {
        ...(list ?? {}),
        items: newItems,
        total: newItems.length,
      } as TList;
    },

    /**
     * Find item by ID
     */
    findItem: (list: TList | undefined, id: string): TItem | undefined => {
      return list?.items.find((item) => item.id === id);
    },

    /**
     * Check if item exists
     */
    hasItem: (list: TList | undefined, id: string): boolean => {
      return list?.items.some((item) => item.id === id) ?? false;
    },
  };
}

// =============================================================================
// OFFLINE MUTATION QUEUE
// =============================================================================

/**
 * Queued mutation entry
 */
export interface QueuedMutation<TVariables = unknown> {
  id: string;
  mutationFn: () => Promise<unknown>;
  rollbackFn: () => void;
  variables: TVariables;
  timestamp: number;
  retries: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'failed';
}

/**
 * Mutation queue configuration
 */
export interface MutationQueueConfig {
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Retry delay (ms) */
  retryDelay?: number;
  /** Persist queue to storage */
  persist?: boolean;
  /** Storage key for persistence */
  storageKey?: string;
  /** Callback when mutation succeeds */
  onSuccess?: (mutation: QueuedMutation) => void;
  /** Callback when mutation fails permanently */
  onFailure?: (mutation: QueuedMutation, error: Error) => void;
  /** Callback when queue status changes */
  onStatusChange?: (status: QueueStatus) => void;
}

/**
 * Queue status
 */
export interface QueueStatus {
  pending: number;
  processing: boolean;
  online: boolean;
  failed: number;
  lastSync?: number;
}

/**
 * Optimistic mutation queue for offline support
 */
export class OptimisticMutationQueue {
  private queue: QueuedMutation[] = [];
  private processing = false;
  private config: Required<MutationQueueConfig>;
  private onlineHandler?: () => void;

  constructor(config: MutationQueueConfig = {}) {
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      persist: config.persist ?? true,
      storageKey: config.storageKey ?? 'optimistic_mutation_queue',
      onSuccess: config.onSuccess ?? (() => {}),
      onFailure: config.onFailure ?? (() => {}),
      onStatusChange: config.onStatusChange ?? (() => {}),
    };

    // Load persisted queue
    if (this.config.persist) {
      this.loadFromStorage();
    }

    // Listen for online status
    if (typeof window !== 'undefined') {
      this.onlineHandler = (): void => {
        void this.process();
      };
      window.addEventListener('online', this.onlineHandler);
    }
  }

  /**
   * Add mutation to queue
   */
  add<TVariables>(
    mutationFn: () => Promise<unknown>,
    rollbackFn: () => void,
    variables: TVariables
  ): string {
    const id = crypto.randomUUID();

    this.queue.push({
      id,
      mutationFn,
      rollbackFn,
      variables,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: this.config.maxRetries,
      status: 'pending',
    });

    this.persist();
    this.notifyStatusChange();

    // Try to process immediately
    void this.process();

    return id;
  }

  /**
   * Remove mutation from queue
   */
  remove(id: string): boolean {
    const index = this.queue.findIndex((m) => m.id === id);
    if (index === -1) return false;

    this.queue.splice(index, 1);
    this.persist();
    this.notifyStatusChange();
    return true;
  }

  /**
   * Process queued mutations
   */
  async process(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    this.processing = true;
    this.notifyStatusChange();

    while (this.queue.length > 0 && (typeof navigator === 'undefined' || navigator.onLine)) {
      const mutation = this.queue.shift();
      if (!mutation) break;
      
      mutation.status = 'processing';
      this.persist();

      try {
        await mutation.mutationFn();
        this.queue.shift();
        this.persist();
        this.config.onSuccess(mutation);
      } catch (error) {
        mutation.retries++;
        mutation.status = 'pending';

        if (mutation.retries >= mutation.maxRetries) {
          // Rollback and remove from queue
          mutation.rollbackFn();
          this.queue.shift();
          this.persist();
          this.config.onFailure(mutation, error as Error);
        } else {
          // Wait before retry with exponential backoff
          await new Promise((r) => setTimeout(r, this.config.retryDelay * Math.pow(2, mutation.retries - 1)));
        }
      }
    }

    this.processing = false;
    this.notifyStatusChange();
  }

  /**
   * Rollback all pending mutations
   */
  rollbackAll(): void {
    for (const mutation of this.queue) {
      try {
        mutation.rollbackFn();
      } catch (error) {
        console.error('Rollback failed:', error);
      }
    }
    this.queue = [];
    this.persist();
    this.notifyStatusChange();
  }

  /**
   * Get queue status
   */
  getStatus(): QueueStatus {
    return {
      pending: this.queue.filter(m => m.status === 'pending').length,
      processing: this.processing,
      online: typeof navigator === 'undefined' || navigator.onLine,
      failed: this.queue.filter(m => m.status === 'failed').length,
    };
  }

  /**
   * Get all queued mutations
   */
  getQueue(): QueuedMutation[] {
    return [...this.queue];
  }

  /**
   * Persist queue to storage
   */
  private persist(): void {
    if (!this.config.persist) return;

    try {
      // Only persist serializable data
      const persistable = this.queue.map(({ id, variables, timestamp, retries, maxRetries, status }) => ({
        id,
        variables,
        timestamp,
        retries,
        maxRetries,
        status,
      }));
      localStorage.setItem(this.config.storageKey, JSON.stringify(persistable));
    } catch {
      // Storage may be unavailable
    }
  }

  /**
   * Load queue from storage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored !== null && stored !== '') {
        // Note: Functions cannot be restored, so persisted mutations
        // need to be re-registered by the application
        console.info('[MutationQueue] Loaded queue metadata:', JSON.parse(stored));
      }
    } catch {
      // Storage may be unavailable
    }
  }

  /**
   * Notify status change
   */
  private notifyStatusChange(): void {
    this.config.onStatusChange(this.getStatus());
  }

  /**
   * Clean up
   */
  destroy(): void {
    if (this.onlineHandler && typeof window !== 'undefined') {
      window.removeEventListener('online', this.onlineHandler);
    }
  }
}

// =============================================================================
// REACT HOOKS FOR MUTATION QUEUE
// =============================================================================

export interface MutationQueueStatus {
  pending: number;
  processing: boolean;
  failed: number;
}

/**
 * Hook to use the optimistic mutation queue
 */
export function useMutationQueue(config?: MutationQueueConfig): {
  add: <TVariables>(mutationFn: () => Promise<unknown>, rollbackFn: () => void, variables: TVariables) => string;
  remove: (id: string) => boolean;
  process: () => Promise<void>;
  rollbackAll: () => void;
  getStatus: () => MutationQueueStatus;
} {
  const queueRef = useRef<OptimisticMutationQueue | null>(null);

  queueRef.current ??= new OptimisticMutationQueue(config);

  const add = useCallback(
    <TVariables>(mutationFn: () => Promise<unknown>, rollbackFn: () => void, variables: TVariables) => {
      if (!queueRef.current) throw new Error('Queue not initialized');
      return queueRef.current.add(mutationFn, rollbackFn, variables);
    },
    []
  );

  const remove = useCallback((id: string) => {
    if (!queueRef.current) throw new Error('Queue not initialized');
    return queueRef.current.remove(id);
  }, []);

  const process = useCallback(async () => {
    if (!queueRef.current) throw new Error('Queue not initialized');
    return queueRef.current.process();
  }, []);

  const rollbackAll = useCallback(() => {
    if (!queueRef.current) throw new Error('Queue not initialized');
    return queueRef.current.rollbackAll();
  }, []);

  const getStatus = useCallback(() => {
    if (!queueRef.current) throw new Error('Queue not initialized');
    return queueRef.current.getStatus();
  }, []);

  return useMemo(
    () => ({
      add,
      remove,
      process,
      rollbackAll,
      getStatus,
    }),
    [add, remove, process, rollbackAll, getStatus]
  );
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create a deep clone of data for snapshotting
 *
 * @remarks
 * This function handles primitive types, arrays, Date, Map, Set, and plain objects.
 * The type assertions are safe because we preserve the structure of the input.
 */
export function deepClone<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    // Safe cast: we're creating an array of the same element type
    return data.map((item) => deepClone(item)) as T;
  }

  if (data instanceof Date) {
    // Safe cast: Date to Date preserves type
    return new Date(data.getTime()) as T;
  }

  if (data instanceof Map) {
    // Safe cast: Map clone preserves Map type
    const result = new Map<unknown, unknown>();
    data.forEach((value, key) => {
      result.set(key, deepClone(value));
    });
    return result as T;
  }

  if (data instanceof Set) {
    // Safe cast: Set clone preserves Set type
    const result = new Set<unknown>();
    data.forEach((value) => {
      result.add(deepClone(value));
    });
    return result as T;
  }

  // Plain object clone
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(data)) {
    result[key] = deepClone((data as Record<string, unknown>)[key]);
  }
  return result as T;
}

/**
 * Merge two objects deeply
 */
export function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    const targetValue = result[key];
    const sourceValue = source[key];

    if (sourceValue === undefined) {
      continue;
    }

    if (
      typeof targetValue === 'object' &&
      targetValue !== null &&
      typeof sourceValue === 'object' &&
      sourceValue !== null &&
      !Array.isArray(targetValue) &&
      !Array.isArray(sourceValue)
    ) {
      (result as Record<string, unknown>)[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      );
    } else {
      (result as Record<string, unknown>)[key] = sourceValue;
    }
  }

  return result;
}

// =============================================================================
// GLOBAL INSTANCES
// =============================================================================

/**
 * Global optimistic mutation queue
 */
export const globalMutationQueue = new OptimisticMutationQueue();
