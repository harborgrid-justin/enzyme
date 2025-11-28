/**
 * @file useDataSync Hook
 * @description React hook for multi-source data synchronization with
 * conflict resolution, optimistic updates, and offline support.
 *
 * Features:
 * - Multi-source sync (API, localStorage, memory)
 * - Conflict resolution with customizable strategies
 * - Optimistic updates with automatic rollback
 * - Offline queue management
 * - Real-time sync status
 *
 * @example
 * ```typescript
 * import { useDataSync } from '@/lib/data';
 *
 * function UserList() {
 *   const {
 *     data,
 *     isLoading,
 *     isSyncing,
 *     sync,
 *     update,
 *     conflicts,
 *     resolveConflict,
 *   } = useDataSync({
 *     entityType: 'users',
 *     sources: [apiSource, localStorageSource],
 *     conflictStrategy: 'latest-wins',
 *   });
 *
 *   return <ul>{data.map(user => <li key={user.id}>{user.name}</li>)}</ul>;
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLatestRef } from '../../hooks/shared/useLatestRef';
import type {
  SyncEngine,
  SyncStatus,
  SyncResult,
  SyncConflict,
  SyncOptions,
  SyncEvent,
} from '../sync/sync-engine';
import type { ConflictStrategy, ConflictResolutionResult } from '../sync/conflict-resolver';
import type { Entity } from '../normalization/normalizer';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Sync state for an entity type
 */
export interface SyncState<T extends Entity> {
  /** Current data */
  data: T[];
  /** Sync status */
  status: SyncStatus;
  /** Is initial load */
  isLoading: boolean;
  /** Is syncing */
  isSyncing: boolean;
  /** Is offline */
  isOffline: boolean;
  /** Last sync timestamp */
  lastSyncAt: number | null;
  /** Pending changes count */
  pendingChanges: number;
  /** Active conflicts */
  conflicts: SyncConflict<T>[];
  /** Last error */
  error: Error | null;
}

/**
 * Sync hook options
 */
export interface UseDataSyncOptions<T extends Entity> {
  /** Sync engine instance */
  engine: SyncEngine;
  /** Entity type to sync */
  entityType: string;
  /** Initial data */
  initialData?: T[];
  /** Auto sync on mount */
  autoSync?: boolean;
  /** Sync interval in ms (0 = manual only) */
  syncInterval?: number;
  /** Conflict resolution strategy */
  conflictStrategy?: ConflictStrategy;
  /** Custom conflict resolver */
  onConflict?: (conflict: SyncConflict) => Promise<ConflictResolutionResult<unknown>>;
  /** Callback on sync success */
  onSyncSuccess?: (result: SyncResult<T>) => void;
  /** Callback on sync error */
  onSyncError?: (error: Error) => void;
  /** Callback on data change */
  onDataChange?: (data: T[]) => void;
  /** Enable optimistic updates */
  optimisticUpdates?: boolean;
  /** Filter function for data */
  filter?: (item: T) => boolean;
  /** Sort function for data */
  sort?: (a: T, b: T) => number;
}

/**
 * Sync hook return type
 */
export interface UseDataSyncReturn<T extends Entity> {
  /** Current state */
  state: SyncState<T>;
  /** Current data */
  data: T[];
  /** Is loading */
  isLoading: boolean;
  /** Is syncing */
  isSyncing: boolean;
  /** Is offline */
  isOffline: boolean;
  /** Has conflicts */
  hasConflicts: boolean;
  /** Active conflicts */
  conflicts: SyncConflict[];
  /** Last error */
  error: Error | null;
  /** Trigger sync */
  sync: (options?: SyncOptions) => Promise<SyncResult<T>>;
  /** Create entity */
  create: (data: Omit<T, 'id'>) => Promise<T>;
  /** Update entity */
  update: (id: string, data: Partial<T>) => Promise<T>;
  /** Delete entity */
  remove: (id: string) => Promise<void>;
  /** Resolve conflict */
  resolveConflict: (conflictId: string, resolution: 'local' | 'remote' | 'merge', mergedData?: T) => Promise<void>;
  /** Resolve all conflicts */
  resolveAllConflicts: (strategy: 'local' | 'remote') => Promise<void>;
  /** Retry failed syncs */
  retryFailed: () => Promise<void>;
  /** Clear offline queue */
  clearOfflineQueue: () => void;
  /** Get entity by ID */
  getById: (id: string) => T | undefined;
  /** Refresh data */
  refresh: () => Promise<void>;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook for data synchronization
 *
 * @param options - Sync options
 * @returns Sync state and methods
 */
export function useDataSync<T extends Entity>(
  options: UseDataSyncOptions<T>
): UseDataSyncReturn<T> {
  const {
    engine,
    entityType,
    initialData = [],
    autoSync = true,
    syncInterval = 0,
    onSyncSuccess,
    onSyncError,
    onDataChange,
    optimisticUpdates = true,
    filter,
    sort,
  } = options;

  // State
  const [state, setState] = useState<SyncState<T>>({
    data: initialData,
    status: 'idle',
    isLoading: autoSync,
    isSyncing: false,
    isOffline: !navigator.onLine,
    lastSyncAt: null,
    pendingChanges: 0,
    conflicts: [],
    error: null,
  });

  // Refs
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const engineRef = useRef(engine);
  engineRef.current = engine;

  // Processed data
  const processedData = useMemo(() => {
    let result = [...state.data];

    if (filter) {
      result = result.filter(filter);
    }

    if (sort) {
      result.sort(sort);
    }

    return result;
  }, [state.data, filter, sort]);

  // Handle sync events
  useEffect(() => {
    const unsubscribe = engine.subscribe((event: SyncEvent) => {
      if (!mountedRef.current) return;

      switch (event.type) {
        case 'sync-start' as SyncEventType:
          setState((prev) => ({
            ...prev,
            isSyncing: true,
            status: 'syncing',
          }));
          break;

        case 'sync:complete':
          setState((prev) => ({
            ...prev,
            isSyncing: false,
            isLoading: false,
            status: 'synced',
            lastSyncAt: Date.now(),
            error: null,
          }));
          break;

        case 'sync:error':
          setState((prev) => ({
            ...prev,
            isSyncing: false,
            isLoading: false,
            status: 'error',
            error: event.data as Error,
          }));
          break;

        case 'sync:conflict':
          setState((prev) => ({
            ...prev,
            conflicts: [...prev.conflicts, event.data as SyncConflict],
          }));
          break;

        case 'offline-queue-change':
          setState((prev) => ({
            ...prev,
            pendingChanges: (event.data as { count: number }).count,
          }));
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [engine]);

  // Sync function - defined before effects that depend on it
  const sync = useCallback(async (syncOptions?: SyncOptions): Promise<SyncResult<T>> => {
    setState((prev) => ({
      ...prev,
      isSyncing: true,
      status: 'syncing',
    }));

    try {
      const result = await engineRef.current.sync<T>(entityType, syncOptions);

      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          data: result.data as T[],
          isSyncing: false,
          isLoading: false,
          status: (result.conflicts?.length ?? 0) > 0 ? 'conflict' : 'synced',
          lastSyncAt: Date.now(),
          conflicts: result.conflicts ?? [],
          error: null,
        }));

        onDataChange?.(result.data as T[]);
        onSyncSuccess?.(result as SyncResult<T>);
      }

      return result as SyncResult<T>;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          isSyncing: false,
          isLoading: false,
          status: 'error',
          error: err,
        }));

        onSyncError?.(err);
      }

      throw err;
    }
  }, [entityType, onDataChange, onSyncSuccess, onSyncError]);

  // Use useLatestRef to avoid stale closures when sync is called from effects
  // This ensures the effect always calls the latest sync function without
  // causing effect re-runs when sync's dependencies change
  const syncRef = useLatestRef(sync);

  // Handle online/offline status
  // Uses syncRef to avoid stale closure and prevent effect re-runs
  useEffect(() => {
    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOffline: false }));
      // Trigger sync when coming back online - use ref to get latest sync function
      syncRef.current().catch(console.error);
    };

    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOffline: true }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []); // Empty deps - syncRef.current always has latest sync function

  // Create entity
  const create = useCallback(async (data: Omit<T, 'id'>): Promise<T> => {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newEntity = { ...data, id: tempId } as T;

    // Optimistic update
    if (optimisticUpdates) {
      setState((prev) => ({
        ...prev,
        data: [...prev.data, newEntity],
        pendingChanges: prev.pendingChanges + 1,
      }));
    }

    try {
      const created = await engineRef.current.create<T>(entityType, data as Partial<T>);

      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          data: prev.data.map((item) =>
            item.id === tempId ? created : item
          ),
          pendingChanges: Math.max(0, prev.pendingChanges - 1),
        }));
      }

      return created;
    } catch (error) {
      // Rollback on error
      if (optimisticUpdates && mountedRef.current) {
        setState((prev) => ({
          ...prev,
          data: prev.data.filter((item) => item.id !== tempId),
          pendingChanges: Math.max(0, prev.pendingChanges - 1),
          error: error instanceof Error ? error : new Error(String(error)),
        }));
      }
      throw error;
    }
  }, [entityType, optimisticUpdates]);

  // Update entity
  const update = useCallback(async (id: string, data: Partial<T>): Promise<T> => {
    const originalItem = state.data.find((item) => item.id === id);

    // Optimistic update
    if (optimisticUpdates && originalItem) {
      setState((prev) => ({
        ...prev,
        data: prev.data.map((item) =>
          item.id === id ? { ...item, ...data } : item
        ),
        pendingChanges: prev.pendingChanges + 1,
      }));
    }

    try {
      const updated = await engineRef.current.update<T>(entityType, id, data);

      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          data: prev.data.map((item) =>
            item.id === id ? updated : item
          ),
          pendingChanges: Math.max(0, prev.pendingChanges - 1),
        }));
      }

      return updated;
    } catch (error) {
      // Rollback on error
      if (optimisticUpdates && originalItem && mountedRef.current) {
        setState((prev) => ({
          ...prev,
          data: prev.data.map((item) =>
            item.id === id ? originalItem : item
          ),
          pendingChanges: Math.max(0, prev.pendingChanges - 1),
          error: error instanceof Error ? error : new Error(String(error)),
        }));
      }
      throw error;
    }
  }, [entityType, optimisticUpdates, state.data]);

  // Remove entity
  const remove = useCallback(async (id: string): Promise<void> => {
    const originalItem = state.data.find((item) => item.id === id);

    // Optimistic update
    if (optimisticUpdates) {
      setState((prev) => ({
        ...prev,
        data: prev.data.filter((item) => item.id !== id),
        pendingChanges: prev.pendingChanges + 1,
      }));
    }

    try {
      await engineRef.current.delete(entityType, id);

      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          pendingChanges: Math.max(0, prev.pendingChanges - 1),
        }));
      }
    } catch (error) {
      // Rollback on error
      if (optimisticUpdates && originalItem && mountedRef.current) {
        setState((prev) => ({
          ...prev,
          data: [...prev.data, originalItem],
          pendingChanges: Math.max(0, prev.pendingChanges - 1),
          error: error instanceof Error ? error : new Error(String(error)),
        }));
      }
      throw error;
    }
  }, [entityType, optimisticUpdates, state.data]);

  // Resolve conflict
  const resolveConflict = useCallback(async (
    conflictId: string,
    resolution: 'local' | 'remote' | 'merge',
    mergedData?: T
  ): Promise<void> => {
    const conflict = state.conflicts.find((c) => c.id === conflictId);
    if (!conflict) return;

    let resolvedData: T;

    switch (resolution) {
      case 'local':
        resolvedData = conflict.localData as T;
        break;
      case 'remote':
        resolvedData = conflict.remoteData as T;
        break;
      case 'merge':
        if (!mergedData) {
          throw new Error('Merged data required for merge resolution');
        }
        resolvedData = mergedData;
        break;
    }

    await engineRef.current.resolveConflict(conflictId, resolvedData);

    if (mountedRef.current) {
      setState((prev) => ({
        ...prev,
        data: prev.data.map((item) =>
          item.id === conflict.entityId ? resolvedData : item
        ),
        conflicts: prev.conflicts.filter((c) => c.id !== conflictId),
      }));
    }
  }, [state.conflicts]);

  // Resolve all conflicts
  const resolveAllConflicts = useCallback(async (strategy: 'local' | 'remote'): Promise<void> => {
    for (const conflict of state.conflicts) {
      await resolveConflict(conflict.id, strategy);
    }
  }, [state.conflicts, resolveConflict]);

  // Retry failed syncs
  const retryFailed = useCallback(async (): Promise<void> => {
    await engineRef.current.retryFailed();
  }, []);

  // Clear offline queue
  const clearOfflineQueue = useCallback((): void => {
    engineRef.current.clearOfflineQueue();
    setState((prev) => ({ ...prev, pendingChanges: 0 }));
  }, []);

  // Get entity by ID
  const getById = useCallback((id: string): T | undefined => {
    return state.data.find((item) => item.id === id);
  }, [state.data]);

  // Refresh data
  const refresh = useCallback(async (): Promise<void> => {
    await sync({ force: true });
  }, [sync]);

  // Refs for state values used in interval to avoid interval recreation
  const stateRef = useLatestRef(state);

  // Auto sync on mount
  useEffect(() => {
    if (autoSync) {
      // Use syncRef to get the latest sync function
      syncRef.current().catch(console.error);
    }
  }, [autoSync]); // syncRef always has latest sync, no need to include in deps

  // Sync interval
  // Uses refs for sync and state to avoid interval recreation on every state change
  useEffect(() => {
    if (syncInterval > 0) {
      intervalRef.current = setInterval(() => {
        // Use refs to get latest values without causing effect re-runs
        const currentState = stateRef.current;
        if (!currentState.isOffline && !currentState.isSyncing) {
          syncRef.current().catch(console.error);
        }
      }, syncInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [syncInterval]); // Only re-create interval when syncInterval changes

  // Cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    state,
    data: processedData,
    isLoading: state.isLoading,
    isSyncing: state.isSyncing,
    isOffline: state.isOffline,
    hasConflicts: state.conflicts.length > 0,
    conflicts: state.conflicts,
    error: state.error,
    sync,
    create,
    update,
    remove,
    resolveConflict,
    resolveAllConflicts,
    retryFailed,
    clearOfflineQueue,
    getById,
    refresh,
  };
}

// =============================================================================
// SPECIALIZED HOOKS
// =============================================================================

/**
 * Hook for sync status only
 *
 * @param engine - Sync engine instance
 * @returns Sync status
 */
export function useSyncStatus(engine: SyncEngine): {
  status: SyncStatus;
  isOnline: boolean;
  pendingChanges: number;
  lastSyncAt: number | null;
} {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [pendingChanges, setPendingChanges] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const unsubscribe = engine.subscribe((event: SyncEvent) => {
      switch (event.type) {
        case 'sync:start':
          setStatus('syncing');
          break;
        case 'sync:complete':
          setStatus('synced');
          setLastSyncAt(Date.now());
          break;
        case 'sync:error':
          setStatus('error');
          break;
        case 'offline-queue-change':
          setPendingChanges((event.data as { count: number }).count);
          break;
      }
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [engine]);

  return { status, isOnline, pendingChanges, lastSyncAt };
}

/**
 * Hook for conflict management
 *
 * @param engine - Sync engine instance
 * @returns Conflict management methods
 */
export function useSyncConflicts(engine: SyncEngine): {
  conflicts: SyncConflict[];
  hasConflicts: boolean;
  resolveConflict: (id: string, data: Entity) => Promise<void>;
  resolveAllLocal: () => Promise<void>;
  resolveAllRemote: () => Promise<void>;
} {
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);

  useEffect(() => {
    const unsubscribe = engine.subscribe((event: SyncEvent) => {
      if (event.type === 'sync:conflict') {
        setConflicts((prev) => [...prev, event.data as SyncConflict]);
      }
      if (event.type === 'conflict-resolved') {
        const { id } = event.data as { id: string };
        setConflicts((prev) => prev.filter((c) => c.id !== id));
      }
    });

    return unsubscribe;
  }, [engine]);

  const resolveConflict = useCallback(async (id: string, data: Entity) => {
    await engine.resolveConflict(id, data);
    setConflicts((prev) => prev.filter((c) => c.id !== id));
  }, [engine]);

  const resolveAllLocal = useCallback(async () => {
    for (const conflict of conflicts) {
      await resolveConflict(conflict.id, conflict.localData);
    }
  }, [conflicts, resolveConflict]);

  const resolveAllRemote = useCallback(async () => {
    for (const conflict of conflicts) {
      await resolveConflict(conflict.id, conflict.remoteData);
    }
  }, [conflicts, resolveConflict]);

  return {
    conflicts,
    hasConflicts: conflicts.length > 0,
    resolveConflict,
    resolveAllLocal,
    resolveAllRemote,
  };
}

export default useDataSync;
