/**
 * @file Optimistic Sync
 * @description Optimistic updates with automatic rollback, retry logic,
 * and state reconciliation for seamless user experience.
 *
 * Features:
 * - Optimistic state updates
 * - Automatic rollback on failure
 * - Retry with exponential backoff
 * - State snapshot management
 * - Pending changes tracking
 * - React integration hooks
 *
 * @example
 * ```typescript
 * import { useOptimisticSync } from '@/lib/data/sync';
 *
 * const { data, update, isPending, pendingChanges } = useOptimisticSync({
 *   key: 'user',
 *   fetcher: fetchUser,
 *   updater: updateUser,
 * });
 *
 * // Optimistic update
 * update({ name: 'New Name' });
 * ```
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Optimistic update status
 */
export type OptimisticStatus =
  | 'idle'
  | 'pending'
  | 'syncing'
  | 'success'
  | 'error'
  | 'rolled-back';

/**
 * Pending change record
 */
export interface PendingChange<T = unknown> {
  /** Unique ID for this change */
  id: string;
  /** Original data before change */
  snapshot: T;
  /** Optimistic data after change */
  optimisticData: T;
  /** Change payload */
  payload: Partial<T>;
  /** Change timestamp */
  timestamp: number;
  /** Current status */
  status: OptimisticStatus;
  /** Error message if failed */
  error?: string;
  /** Retry count */
  retryCount: number;
}

/**
 * Optimistic sync configuration
 */
export interface OptimisticSyncConfig<T> {
  /** Unique key for this sync */
  key: string;
  /** Initial data */
  initialData?: T;
  /** Fetch current data */
  fetcher?: () => Promise<T>;
  /** Persist changes to server */
  persister: (data: T, payload: Partial<T>) => Promise<T>;
  /** Merge function for optimistic updates */
  merger?: (current: T, payload: Partial<T>) => T;
  /** Rollback function */
  rollback?: (snapshot: T, error: Error) => T;
  /** Max retry attempts */
  maxRetries?: number;
  /** Retry delay base (ms) */
  retryDelay?: number;
  /** Debounce updates (ms) */
  debounceMs?: number;
  /** Batch updates within window (ms) */
  batchWindow?: number;
  /** Enable persistence queue */
  enableQueue?: boolean;
  /** On success callback */
  onSuccess?: (data: T, payload: Partial<T>) => void;
  /** On error callback */
  onError?: (error: Error, payload: Partial<T>, snapshot: T) => void;
  /** On rollback callback */
  onRollback?: (snapshot: T, error: Error) => void;
}

/**
 * Optimistic sync state
 */
export interface OptimisticSyncState<T> {
  /** Current data (may be optimistic) */
  data: T | undefined;
  /** Server-confirmed data */
  confirmedData: T | undefined;
  /** Whether any changes are pending */
  isPending: boolean;
  /** Whether currently syncing */
  isSyncing: boolean;
  /** Last error */
  error: Error | null;
  /** Status */
  status: OptimisticStatus;
  /** Pending changes */
  pendingChanges: PendingChange<T>[];
  /** Is data stale (has pending changes) */
  isStale: boolean;
}

/**
 * Optimistic sync actions
 */
export interface OptimisticSyncActions<T> {
  /** Apply optimistic update */
  update: (payload: Partial<T>) => Promise<T>;
  /** Refresh from server */
  refresh: () => Promise<T | undefined>;
  /** Rollback all pending changes */
  rollbackAll: () => void;
  /** Rollback specific change */
  rollbackChange: (changeId: string) => void;
  /** Retry failed changes */
  retryFailed: () => Promise<void>;
  /** Reset state */
  reset: (data?: T) => void;
}

/**
 * Optimistic sync return type
 */
export type OptimisticSyncReturn<T> = OptimisticSyncState<T> & OptimisticSyncActions<T>;

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Default merger - shallow merge
 */
function defaultMerger<T>(current: T, payload: Partial<T>): T {
  if (current === null || current === undefined) {
    return payload as T;
  }

  if (typeof current !== 'object') {
    return payload as T;
  }

  return { ...current, ...payload };
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Calculate retry delay with exponential backoff and jitter
 */
function calculateRetryDelay(attempt: number, baseDelay: number): number {
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), 30000);
  const jitter = Math.random() * 1000;
  return exponentialDelay + jitter;
}

// =============================================================================
// OPTIMISTIC SYNC HOOK
// =============================================================================

/**
 * React hook for optimistic updates
 */
export function useOptimisticSync<T>(
  config: OptimisticSyncConfig<T>
): OptimisticSyncReturn<T> {
  const {
    initialData,
    fetcher,
    persister,
    merger = defaultMerger,
    rollback,
    maxRetries = 3,
    retryDelay = 1000,
    debounceMs = 0,
    batchWindow = 0,
    enableQueue = true,
    onSuccess,
    onError,
    onRollback,
  } = config;

  // State
  const [data, setData] = useState<T | undefined>(initialData);
  const [confirmedData, setConfirmedData] = useState<T | undefined>(initialData);
  const [pendingChanges, setPendingChanges] = useState<PendingChange<T>[]>([]);
  const [status, setStatus] = useState<OptimisticStatus>('idle');
  const [error, setError] = useState<Error | null>(null);

  // Refs
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const batchQueue = useRef<Partial<T>[]>([]);
  const batchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isMounted = useRef(true);

  // Cleanup
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (batchTimer.current) clearTimeout(batchTimer.current);
    };
  }, []);

  // Derived state
  const isPending = pendingChanges.some(
    (c) => c.status === 'pending' || c.status === 'syncing'
  );
  const isSyncing = pendingChanges.some((c) => c.status === 'syncing');
  const isStale = pendingChanges.length > 0;

  // Persist change to server
  const persistChange = useCallback(
    async (change: PendingChange<T>): Promise<T> => {
      if (!isMounted.current) throw new Error('Component unmounted');

      // Update change status
      setPendingChanges((prev) =>
        prev.map((c) => (c.id === change.id ? { ...c, status: 'syncing' } : c))
      );
      setStatus('syncing');

      try {
        const result = await persister(change.optimisticData, change.payload);

        if (!isMounted.current) return result;

        // Success - remove from pending and update confirmed
        setPendingChanges((prev) => prev.filter((c) => c.id !== change.id));
        setConfirmedData(result);
        setData(result);
        setStatus('success');
        setError(null);

        onSuccess?.(result, change.payload);

        return result;
      } catch (err) {
        if (!isMounted.current) throw err;

        const error = err instanceof Error ? err : new Error(String(err));

        // Check if should retry
        if (change.retryCount < maxRetries) {
          // Schedule retry
          setPendingChanges((prev) =>
            prev.map((c) =>
              c.id === change.id
                ? { ...c, status: 'pending', retryCount: c.retryCount + 1 }
                : c
            )
          );

          const delay = calculateRetryDelay(change.retryCount, retryDelay);
          setTimeout(() => {
            const updatedChange = pendingChanges.find((c) => c.id === change.id);
            if (updatedChange != null) {
              void persistChange(updatedChange);
            }
          }, delay);
        } else {
          // Max retries exceeded - rollback
          rollbackChange(change.id);
          onError?.(error, change.payload, change.snapshot);
        }

        setError(error);
        throw error;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [persister, maxRetries, retryDelay, onSuccess, onError, pendingChanges]
  );

  // Apply optimistic update
  const update = useCallback(
    async (payload: Partial<T>): Promise<T> => {
      const currentData = data;
      if (currentData === undefined) {
        throw new Error('Cannot update undefined data');
      }

      // Handle batching
      if (batchWindow > 0) {
        batchQueue.current.push(payload);

        batchTimer.current ??= setTimeout(() => {
          const batchedPayload = batchQueue.current.reduce(
            (acc, p) => ({ ...acc, ...p }),
            {} as Partial<T>
          );
          batchQueue.current = [];
          batchTimer.current = undefined;
          void update(batchedPayload);
        }, batchWindow);

        // Return current data for batch
        return currentData;
      }

      // Handle debouncing
      if (debounceMs > 0) {
        return new Promise<T>((resolve) => {
          if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
          }

          debounceTimer.current = setTimeout(() => {
            void applyUpdate(payload).then((result) => { resolve(result); return result; }).catch((err: unknown) => {
              const error = err instanceof Error ? err : new Error(String(err));
              throw error;
            });
          }, debounceMs);
        });
      }

      return applyUpdate(payload);

      async function applyUpdate(updatePayload: Partial<T>): Promise<T> {
        const snapshot = currentData as T;
        const optimisticData = merger(snapshot, updatePayload);

        // Create pending change
        const change: PendingChange<T> = {
          id: generateId(),
          snapshot,
          optimisticData,
          payload: updatePayload,
          timestamp: Date.now(),
          status: 'pending',
          retryCount: 0,
        };

        // Apply optimistic update immediately
        setData(optimisticData);
        setStatus('pending');
        setPendingChanges((prev) => [...prev, change]);

        // Persist if queue enabled
        if (enableQueue) {
          try {
            return await persistChange(change);
          } catch {
            // Error handled in persistChange
            return optimisticData;
          }
        }

        return optimisticData;
      }
    },
    [data, merger, batchWindow, debounceMs, enableQueue, persistChange]
  );

  // Refresh from server
  const refresh = useCallback(async (): Promise<T | undefined> => {
    if (!fetcher) return data;

    try {
      const freshData = await fetcher();
      if (isMounted.current) {
        setConfirmedData(freshData);

        // Only update data if no pending changes
        if (pendingChanges.length === 0) {
          setData(freshData);
        }
      }
      return freshData;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return undefined;
    }
  }, [fetcher, data, pendingChanges.length]);

  // Rollback specific change
  const rollbackChange = useCallback(
    (changeId: string) => {
      const change = pendingChanges.find((c) => c.id === changeId);
      if (!change) return;

      // Get rollback data
      let rollbackData = change.snapshot;
      if (rollback) {
        rollbackData = rollback(
          change.snapshot,
          new Error('Manual rollback')
        );
      }

      // Remove change and restore data
      setPendingChanges((prev) => prev.filter((c) => c.id !== changeId));

      // Recalculate data from remaining changes
      const remainingChanges = pendingChanges.filter((c) => c.id !== changeId);
      const baseData = confirmedData ?? rollbackData;
      if (remainingChanges.length === 0) {
        setData(baseData);
      } else {
        // Apply remaining changes to confirmed data
        const reappliedData = remainingChanges.reduce(
          (acc, c) => merger(acc, c.payload),
          baseData
        );
        setData(reappliedData);
      }

      setStatus('rolled-back');
      onRollback?.(rollbackData, new Error('Manual rollback'));
    },
    [pendingChanges, rollback, confirmedData, merger, onRollback]
  );

  // Rollback all changes
  const rollbackAll = useCallback(() => {
    if (pendingChanges.length === 0) return;

    const firstSnapshot = pendingChanges[0]?.snapshot;
    if (firstSnapshot === undefined || firstSnapshot === null) return;
    let rollbackData = firstSnapshot;

    if (rollback !== undefined && rollback !== null) {
      rollbackData = rollback(firstSnapshot, new Error('Rollback all')) as NonNullable<T>;
    }

    setPendingChanges([]);
    setData(confirmedData ?? rollbackData);
    setStatus('rolled-back');
    onRollback?.(rollbackData, new Error('Rollback all'));
  }, [pendingChanges, rollback, confirmedData, onRollback]);

  // Retry failed changes
  const retryFailed = useCallback(async () => {
    const failedChanges = pendingChanges.filter(
      (c) => c.status === 'error' || c.retryCount > 0
    );

    for (const change of failedChanges) {
      try {
        await persistChange({
          ...change,
          retryCount: 0,
        });
      } catch {
        // Error handled in persistChange
      }
    }
  }, [pendingChanges, persistChange]);

  // Reset state
  const reset = useCallback(
    (newData?: T) => {
      setPendingChanges([]);
      setStatus('idle');
      setError(null);

      if (newData !== undefined) {
        setData(newData);
        setConfirmedData(newData);
      } else if (initialData !== undefined) {
        setData(initialData);
        setConfirmedData(initialData);
      }
    },
    [initialData]
  );

  return {
    // State
    data,
    confirmedData,
    isPending,
    isSyncing,
    error,
    status,
    pendingChanges,
    isStale,

    // Actions
    update,
    refresh,
    rollbackAll,
    rollbackChange,
    retryFailed,
    reset,
  };
}

// =============================================================================
// OPTIMISTIC LIST HOOK
// =============================================================================

/**
 * Item with required ID
 */
export interface ListItem {
  id: string;
}

/**
 * Optimistic list configuration
 */
export interface OptimisticListConfig<T extends ListItem> {
  /** Unique key for this list */
  key: string;
  /** Initial items */
  initialItems?: T[];
  /** Fetch items */
  fetcher?: () => Promise<T[]>;
  /** Create item */
  createItem?: (item: Omit<T, 'id'>) => Promise<T>;
  /** Update item */
  updateItem?: (id: string, updates: Partial<T>) => Promise<T>;
  /** Delete item */
  deleteItem?: (id: string) => Promise<void>;
  /** Generate temporary ID for optimistic creates */
  generateId?: () => string;
  /** Max retries */
  maxRetries?: number;
  /** Callbacks */
  onCreateSuccess?: (item: T) => void;
  onUpdateSuccess?: (item: T) => void;
  onDeleteSuccess?: (id: string) => void;
  onError?: (error: Error, operation: string) => void;
}

/**
 * Pending list operation
 */
export interface PendingListOperation<T> {
  id: string;
  type: 'create' | 'update' | 'delete';
  itemId: string;
  data?: T | Partial<T>;
  timestamp: number;
  status: OptimisticStatus;
  retryCount: number;
}

/**
 * React hook for optimistic list operations
 */
export function useOptimisticList<T extends ListItem>(
  config: OptimisticListConfig<T>
): {
  items: T[];
  isPending: boolean;
  error: Error | null;
  create: (item: Omit<T, 'id'>) => Promise<T>;
  update: (id: string, updates: Partial<T>) => Promise<T>;
  remove: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  reset: (newItems?: T[]) => void;
} {
  const {
    initialItems = [],
    fetcher,
    createItem,
    updateItem,
    deleteItem,
    generateId = () => `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    maxRetries = 3,
    onCreateSuccess,
    onUpdateSuccess,
    onDeleteSuccess,
    onError,
  } = config;

  // State
  const [items, setItems] = useState<T[]>(initialItems);
  const [confirmedItems, setConfirmedItems] = useState<T[]>(initialItems);
  const [pendingOps, setPendingOps] = useState<PendingListOperation<T>[]>([]);
  const [error, setError] = useState<Error | null>(null);

  // Refs
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Derived state
  const isPending = pendingOps.some((op) => op.status === 'pending' || op.status === 'syncing');
  const pendingIds = useMemo(
    () => new Set(pendingOps.map((op) => op.itemId)),
    [pendingOps]
  );

  // Fetch items
  const refresh = useCallback(async (): Promise<T[]> => {
    if (!fetcher) return items;

    try {
      const freshItems = await fetcher();
      if (isMounted.current) {
        setConfirmedItems(freshItems);

        // Merge with pending operations
        const pendingCreates = pendingOps
          .filter((op) => op.type === 'create' && op.status !== 'error')
          .map((op) => op.data as T);

        const pendingDeleteIds = new Set(
          pendingOps.filter((op) => op.type === 'delete').map((op) => op.itemId)
        );

        const mergedItems = [
          ...freshItems.filter((item) => !pendingDeleteIds.has(item.id)),
          ...pendingCreates,
        ];

        setItems(mergedItems);
      }
      return freshItems;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return items;
    }
  }, [fetcher, items, pendingOps]);

  // Create item
  const add = useCallback(
    async (itemData: Omit<T, 'id'>): Promise<T> => {
      const tempId = generateId();
      const optimisticItem = { ...itemData, id: tempId } as T;

      // Add optimistically
      setItems((prev) => [...prev, optimisticItem]);

      // Track operation
      const op: PendingListOperation<T> = {
        id: generateId(),
        type: 'create',
        itemId: tempId,
        data: optimisticItem,
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
      };
      setPendingOps((prev) => [...prev, op]);

      if (!createItem) {
        return optimisticItem;
      }

      try {
        setPendingOps((prev) =>
          prev.map((o) => (o.id === op.id ? { ...o, status: 'syncing' } : o))
        );

        const createdItem = await createItem(itemData);

        if (isMounted.current) {
          // Replace temp item with real item
          setItems((prev) =>
            prev.map((item) => (item.id === tempId ? createdItem : item))
          );
          setConfirmedItems((prev) => [...prev, createdItem]);
          setPendingOps((prev) => prev.filter((o) => o.id !== op.id));
          onCreateSuccess?.(createdItem);
        }

        return createdItem;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));

        if (isMounted.current && op.retryCount >= maxRetries) {
          // Remove optimistic item
          setItems((prev) => prev.filter((item) => item.id !== tempId));
          setPendingOps((prev) => prev.filter((o) => o.id !== op.id));
          onError?.(error, 'create');
        }

        setError(error);
        throw error;
      }
    },
    [createItem, generateId, maxRetries, onCreateSuccess, onError]
  );

  // Update item
  const update = useCallback(
    async (id: string, updates: Partial<T>): Promise<T> => {
      const currentItem = items.find((item) => item.id === id);
      if (!currentItem) {
        throw new Error(`Item ${id} not found`);
      }

      const optimisticItem = { ...currentItem, ...updates };

      // Update optimistically
      setItems((prev) =>
        prev.map((item) => (item.id === id ? optimisticItem : item))
      );

      // Track operation
      const op: PendingListOperation<T> = {
        id: generateId(),
        type: 'update',
        itemId: id,
        data: updates,
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
      };
      setPendingOps((prev) => [...prev, op]);

      if (!updateItem) {
        return optimisticItem;
      }

      try {
        setPendingOps((prev) =>
          prev.map((o) => (o.id === op.id ? { ...o, status: 'syncing' } : o))
        );

        const updatedItem = await updateItem(id, updates);

        if (isMounted.current) {
          setItems((prev) =>
            prev.map((item) => (item.id === id ? updatedItem : item))
          );
          setConfirmedItems((prev) =>
            prev.map((item) => (item.id === id ? updatedItem : item))
          );
          setPendingOps((prev) => prev.filter((o) => o.id !== op.id));
          onUpdateSuccess?.(updatedItem);
        }

        return updatedItem;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));

        if (isMounted.current && op.retryCount >= maxRetries) {
          // Rollback
          setItems((prev) =>
            prev.map((item) => (item.id === id ? currentItem : item))
          );
          setPendingOps((prev) => prev.filter((o) => o.id !== op.id));
          onError?.(error, 'update');
        }

        setError(error);
        throw error;
      }
    },
    [items, updateItem, generateId, maxRetries, onUpdateSuccess, onError]
  );

  // Delete item
  const remove = useCallback(
    async (id: string): Promise<void> => {
      const currentItem = items.find((item) => item.id === id);
      if (!currentItem) return;

      // Remove optimistically
      setItems((prev) => prev.filter((item) => item.id !== id));

      // Track operation
      const op: PendingListOperation<T> = {
        id: generateId(),
        type: 'delete',
        itemId: id,
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
      };
      setPendingOps((prev) => [...prev, op]);

      if (!deleteItem) return;

      try {
        setPendingOps((prev) =>
          prev.map((o) => (o.id === op.id ? { ...o, status: 'syncing' } : o))
        );

        await deleteItem(id);

        if (isMounted.current) {
          setConfirmedItems((prev) => prev.filter((item) => item.id !== id));
          setPendingOps((prev) => prev.filter((o) => o.id !== op.id));
          onDeleteSuccess?.(id);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));

        if (isMounted.current && op.retryCount >= maxRetries) {
          // Rollback - add item back
          setItems((prev) => [...prev, currentItem]);
          setPendingOps((prev) => prev.filter((o) => o.id !== op.id));
          onError?.(error, 'delete');
        }

        setError(error);
        throw error;
      }
    },
    [items, deleteItem, generateId, maxRetries, onDeleteSuccess, onError]
  );

  // Reset
  const reset = useCallback((newItems?: T[]) => {
    const resetItems = newItems ?? initialItems;
    setItems(resetItems);
    setConfirmedItems(resetItems);
    setPendingOps([]);
    setError(null);
  }, [initialItems]);

  return {
    // State
    items,
    confirmedItems,
    isPending,
    error,
    pendingOps,
    pendingIds,

    // Actions
    add,
    update,
    remove,
    refresh,
    reset,

    // Utilities
    getItem: (id: string) => items.find((item) => item.id === id),
    isItemPending: (id: string) => pendingIds.has(id),
  };
}
