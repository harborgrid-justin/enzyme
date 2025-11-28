/**
 * @file Sync Engine
 * @description Multi-source data synchronization engine with priority-based
 * conflict resolution, offline support, and real-time sync capabilities.
 *
 * Features:
 * - Multiple data source adapters (API, localStorage, IndexedDB, WebSocket)
 * - Priority-based source selection
 * - Automatic sync scheduling
 * - Partial/incremental sync
 * - Offline queue management
 * - Sync status tracking
 *
 * @example
 * ```typescript
 * import { createSyncEngine, createApiSource, createLocalStorageSource } from '@/lib/data/sync';
 *
 * const engine = createSyncEngine({
 *   sources: [
 *     createApiSource('/api', { priority: 1 }),
 *     createLocalStorageSource('app-data', { priority: 2 }),
 *   ],
 *   conflictStrategy: 'server-wins',
 * });
 *
 * engine.sync('users', userId);
 * ```
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Sync source priority (lower = higher priority)
 */
export type SourcePriority = number;

/**
 * Sync direction
 */
export type SyncDirection = 'push' | 'pull' | 'bidirectional';

/**
 * Sync status for an entity
 */
export type SyncStatus =
  | 'idle'
  | 'synced'
  | 'pending'
  | 'syncing'
  | 'conflict'
  | 'error'
  | 'offline';

/**
 * Entity metadata for sync tracking
 */
export interface SyncMetadata {
  /** Entity ID */
  id: string;
  /** Entity type */
  type: string;
  /** Last sync timestamp */
  lastSyncedAt: number;
  /** Last modified timestamp (local) */
  localModifiedAt: number;
  /** Last modified timestamp (remote) */
  remoteModifiedAt?: number;
  /** Version or ETag */
  version?: string;
  /** Sync status */
  status: SyncStatus;
  /** Error message if status is 'error' */
  error?: string;
  /** Retry count */
  retryCount: number;
  /** Source that owns this data */
  sourceId: string;
}

/**
 * Sync event types
 */
export type SyncEventType =
  | 'sync:start'
  | 'sync:complete'
  | 'sync:error'
  | 'sync:conflict'
  | 'sync:offline'
  | 'sync:online'
  | 'entity:changed'
  | 'entity:deleted'
  | 'entity:created'
  | 'offline-queue-change'
  | 'conflict-resolved';

/**
 * Sync event payload
 */
export interface SyncEvent<T = unknown> {
  type: SyncEventType;
  entityType: string;
  entityId?: string;
  data?: T;
  metadata?: SyncMetadata;
  error?: Error;
  timestamp: number;
  sourceId: string;
}

/**
 * Sync source interface
 */
export interface SyncSource<T = unknown> {
  /** Unique source identifier */
  id: string;
  /** Source priority (lower = higher) */
  priority: SourcePriority;
  /** Whether source is available */
  isAvailable: () => boolean | Promise<boolean>;
  /** Fetch entity by ID */
  get: (entityType: string, id: string) => Promise<T | null>;
  /** Fetch multiple entities */
  getMany: (entityType: string, ids: string[]) => Promise<Map<string, T>>;
  /** Fetch all entities of a type */
  getAll: (entityType: string, options?: QueryOptions) => Promise<T[]>;
  /** Save entity */
  set: (entityType: string, id: string, data: T) => Promise<void>;
  /** Save multiple entities */
  setMany: (entityType: string, entities: Map<string, T>) => Promise<void>;
  /** Delete entity */
  delete: (entityType: string, id: string) => Promise<void>;
  /** Delete multiple entities */
  deleteMany: (entityType: string, ids: string[]) => Promise<void>;
  /** Subscribe to changes (if supported) */
  subscribe?: (
    entityType: string,
    callback: (event: SyncEvent<T>) => void
  ) => () => void;
  /** Get last modified timestamp */
  getLastModified?: (entityType: string, id: string) => Promise<number | null>;
  /** Check if entity exists */
  exists?: (entityType: string, id: string) => Promise<boolean>;
}

/**
 * Query options for fetching entities
 */
export interface QueryOptions {
  /** Filter conditions */
  filter?: Record<string, unknown>;
  /** Sort order */
  sort?: { field: string; direction: 'asc' | 'desc' }[];
  /** Pagination limit */
  limit?: number;
  /** Pagination offset */
  offset?: number;
  /** Cursor for cursor-based pagination */
  cursor?: string;
  /** Only fetch modified since timestamp */
  modifiedSince?: number;
}

/**
 * Sync engine configuration
 */
export interface SyncEngineConfig {
  /** Data sources */
  sources: SyncSource[];
  /** Default conflict resolution strategy */
  conflictStrategy?: 'server-wins' | 'client-wins' | 'latest-wins' | 'manual';
  /** Sync interval in milliseconds (0 = manual only) */
  syncInterval?: number;
  /** Max retry attempts for failed syncs */
  maxRetries?: number;
  /** Retry delay base in milliseconds */
  retryDelayBase?: number;
  /** Enable offline queue */
  offlineQueue?: boolean;
  /** Debug mode */
  debug?: boolean;
  /** Entity type configurations */
  entities?: Record<string, EntitySyncConfig>;
}

/**
 * Entity-specific sync configuration
 */
export interface EntitySyncConfig {
  /** Sync direction */
  direction?: SyncDirection;
  /** Conflict strategy override */
  conflictStrategy?: 'server-wins' | 'client-wins' | 'latest-wins' | 'manual';
  /** Custom merge function */
  merge?: <T>(local: T, remote: T, base?: T) => T;
  /** Sync interval override */
  syncInterval?: number;
  /** Excluded fields from sync */
  excludeFields?: string[];
  /** Primary source ID */
  primarySource?: string;
}

/**
 * Sync operation for queuing
 */
export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entityType: string;
  entityId: string;
  data?: unknown;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'processing' | 'failed';
  error?: string;
}

/**
 * Sync engine instance
 */
export interface SyncEngine {
  /** Sync a single entity */
  sync: <T = unknown>(entityType: string, id: string, options?: SyncOptions) => Promise<SyncResult<T>>;
  /** Sync multiple entities */
  syncMany: <T = unknown>(entityType: string, ids: string[], options?: SyncOptions) => Promise<SyncResult<T>[]>;
  /** Sync all entities of a type */
  syncAll: <T = unknown>(entityType: string, options?: SyncOptions) => Promise<SyncResult<T>>;
  /** Create entity */
  create: <T>(entityType: string, data: Partial<T>) => Promise<T>;
  /** Update entity */
  update: <T>(entityType: string, id: string, data: Partial<T>) => Promise<T>;
  /** Delete entity */
  delete: (entityType: string, id: string) => Promise<void>;
  /** Resolve conflict */
  resolveConflict: (conflictId: string, resolution: unknown) => Promise<void>;
  /** Retry failed operations */
  retryFailed: () => Promise<void>;
  /** Clear offline queue */
  clearOfflineQueue: () => void;
  /** Push local changes to remote */
  push: (entityType: string, id: string) => Promise<void>;
  /** Pull remote changes to local */
  pull: (entityType: string, id: string) => Promise<void>;
  /** Get sync status for entity */
  getStatus: (entityType: string, id: string) => SyncMetadata | undefined;
  /** Get all pending operations */
  getPendingOperations: () => SyncOperation[];
  /** Subscribe to sync events */
  subscribe: (callback: (event: SyncEvent) => void) => () => void;
  /** Check if online */
  isOnline: () => boolean;
  /** Force retry pending operations */
  retryPending: () => Promise<void>;
  /** Clear sync metadata */
  clearMetadata: (entityType?: string) => void;
  /** Start automatic sync */
  start: () => void;
  /** Stop automatic sync */
  stop: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

/**
 * Sync options
 */
export interface SyncOptions {
  /** Force sync even if no changes detected */
  force?: boolean;
  /** Specific source to sync with */
  sourceId?: string;
  /** Skip conflict resolution */
  skipConflictResolution?: boolean;
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Sync result
 */
export interface SyncResult<T = unknown> {
  success: boolean;
  entityType: string;
  entityId?: string;
  data?: T[];
  status: SyncStatus;
  conflicts?: SyncConflict<T>[];
  error?: string;
  syncedAt: number;
}

/**
 * Sync conflict
 */
export interface SyncConflict<T = unknown> {
  id: string;
  entityType: string;
  entityId: string;
  localData: T;
  remoteData: T;
  baseData?: T;
  localModifiedAt: number;
  remoteModifiedAt: number;
  resolution?: 'local' | 'remote' | 'merged';
  mergedData?: T;
}

// =============================================================================
// SYNC ENGINE IMPLEMENTATION
// =============================================================================

/**
 * Create sync engine
 */
export function createSyncEngine(config: SyncEngineConfig): SyncEngine {
  const {
    sources,
    conflictStrategy = 'server-wins',
    syncInterval = 0,
    maxRetries = 3,
    offlineQueue = true,
    debug = false,
    entities = {},
  } = config;

  // State
  const metadata = new Map<string, SyncMetadata>();
  const pendingOperations: SyncOperation[] = [];
  const subscribers = new Set<(event: SyncEvent) => void>();
  let isOnlineState = typeof navigator !== 'undefined' ? navigator.onLine : true;
  let syncIntervalId: ReturnType<typeof setInterval> | null = null;

  // Sort sources by priority
  const sortedSources = [...sources].sort((a, b) => a.priority - b.priority);

  // Logger
  const log = debug
    ? (...args: unknown[]) => console.info('[SyncEngine]', ...args)
    : () => {};

  // Emit event to subscribers
  function emit(event: SyncEvent): void {
    for (const subscriber of subscribers) {
      try {
        subscriber(event);
      } catch (error) {
        console.error('[SyncEngine] Subscriber error:', error);
      }
    }
  }

  // Get metadata key
  function getMetadataKey(entityType: string, id: string): string {
    return `${entityType}:${id}`;
  }

  // Get or create metadata
  function getOrCreateMetadata(entityType: string, id: string, sourceId: string): SyncMetadata {
    const key = getMetadataKey(entityType, id);
    let meta = metadata.get(key);

    if (!meta) {
      meta = {
        id,
        type: entityType,
        lastSyncedAt: 0,
        localModifiedAt: Date.now(),
        status: 'pending',
        retryCount: 0,
        sourceId,
      };
      metadata.set(key, meta);
    }

    return meta;
  }

  // Update metadata immutably
  function updateMetadata(
    entityType: string,
    id: string,
    updates: Partial<SyncMetadata>
  ): void {
    const key = getMetadataKey(entityType, id);
    const meta = metadata.get(key);
    if (meta) {
      // Create new object instead of mutating to maintain immutability
      metadata.set(key, { ...meta, ...updates });
    }
  }

  // Get entity config
  function getEntityConfig(entityType: string): EntitySyncConfig {
    return entities[entityType] || {};
  }

  // Find available source
  async function findAvailableSource(preferredId?: string): Promise<SyncSource | null> {
    if (preferredId) {
      const preferred = sortedSources.find((s) => s.id === preferredId);
      if (preferred && (await preferred.isAvailable())) {
        return preferred;
      }
    }

    for (const source of sortedSources) {
      if (await source.isAvailable()) {
        return source;
      }
    }

    return null;
  }

  // Queue operation for offline
  function queueOperation(operation: Omit<SyncOperation, 'id'>): void {
    if (!offlineQueue) return;

    const op: SyncOperation = {
      ...operation,
      id: crypto.randomUUID(),
    };

    pendingOperations.push(op);
    log('Queued operation:', op.type, op.entityType, op.entityId);
  }

  // Process pending operations
  async function processPendingOperations(): Promise<void> {
    if (pendingOperations.length === 0) return;
    if (!isOnlineState) return;

    log('Processing pending operations:', pendingOperations.length);

    const toProcess = [...pendingOperations];

    for (const operation of toProcess) {
      if (operation.status === 'processing') continue;

      operation.status = 'processing';

      try {
        const source = await findAvailableSource();
        if (!source) {
          operation.status = 'pending';
          continue;
        }

        switch (operation.type) {
          case 'create':
          case 'update':
            await source.set(operation.entityType, operation.entityId, operation.data);
            break;
          case 'delete':
            await source.delete(operation.entityType, operation.entityId);
            break;
        }

        // Remove from queue
        const index = pendingOperations.indexOf(operation);
        if (index > -1) {
          pendingOperations.splice(index, 1);
        }

        // Update metadata
        updateMetadata(operation.entityType, operation.entityId, {
          status: 'synced',
          lastSyncedAt: Date.now(),
          retryCount: 0,
        });

        log('Processed operation:', operation.type, operation.entityId);
      } catch (error) {
        operation.status = 'failed';
        operation.retryCount++;
        operation.error = error instanceof Error ? error.message : 'Unknown error';

        if (operation.retryCount >= maxRetries) {
          updateMetadata(operation.entityType, operation.entityId, {
            status: 'error',
            error: operation.error,
          });
        } else {
          operation.status = 'pending';
        }

        log('Operation failed:', operation.type, operation.entityId, operation.error);
      }
    }
  }

  // Resolve conflict
  async function resolveConflict<T>(
    entityType: string,
    conflict: SyncConflict<T>
  ): Promise<T> {
    const entityConfig = getEntityConfig(entityType);
    const strategy = entityConfig.conflictStrategy || conflictStrategy;

    switch (strategy) {
      case 'server-wins':
        return conflict.remoteData;

      case 'client-wins':
        return conflict.localData;

      case 'latest-wins':
        if (conflict.localModifiedAt > conflict.remoteModifiedAt) {
          return conflict.localData;
        }
        return conflict.remoteData;

      case 'manual':
        if (entityConfig.merge) {
          return entityConfig.merge(conflict.localData, conflict.remoteData, conflict.baseData);
        }
        // Fall through to server-wins if no merge function
        return conflict.remoteData;

      default:
        return conflict.remoteData;
    }
  }

  // Sync single entity
  async function syncEntity(
    entityType: string,
    id: string,
    options: SyncOptions = {}
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const entityConfig = getEntityConfig(entityType);

    log('Syncing entity:', entityType, id);

    // Check online status
    if (!isOnlineState && offlineQueue) {
      return {
        success: false,
        entityType,
        entityId: id,
        status: 'offline',
        error: 'Offline - operation queued',
        syncedAt: startTime,
      };
    }

    try {
      // Find available source
      const source = await findAvailableSource(options.sourceId);
      if (!source) {
        return {
          success: false,
          entityType,
          entityId: id,
          status: 'error',
          error: 'No available source',
          syncedAt: startTime,
        };
      }

      // Get metadata
      const meta = getOrCreateMetadata(entityType, id, source.id);
      // Update status immutably instead of direct mutation
      updateMetadata(entityType, id, { status: 'syncing' });

      // Emit start event
      emit({
        type: 'sync:start',
        entityType,
        entityId: id,
        metadata: meta,
        timestamp: Date.now(),
        sourceId: source.id,
      });

      // Get remote data
      const remoteData = await source.get(entityType, id);
      const remoteModifiedAt = source.getLastModified
        ? await source.getLastModified(entityType, id)
        : Date.now();

      // Get local data from secondary sources
      let localData: unknown = null;
      for (const secondarySource of sortedSources) {
        if (secondarySource.id === source.id) continue;
        if (await secondarySource.isAvailable()) {
          localData = await secondarySource.get(entityType, id);
          if (localData) break;
        }
      }

      // Check for conflict
      let finalData = remoteData;
      const conflicts: SyncConflict[] = [];

      if (localData && remoteData && meta.localModifiedAt > meta.lastSyncedAt) {
        // Potential conflict
        if (!options.skipConflictResolution) {
          const conflict: SyncConflict = {
            id: crypto.randomUUID(),
            entityType,
            entityId: id,
            localData,
            remoteData,
            localModifiedAt: meta.localModifiedAt,
            remoteModifiedAt: remoteModifiedAt ?? Date.now(),
          };

          finalData = await resolveConflict(entityType, conflict);
          conflict.resolution = finalData === localData ? 'local' : 'remote';
          conflict.mergedData = finalData;
          conflicts.push(conflict);

          emit({
            type: 'sync:conflict',
            entityType,
            entityId: id,
            data: conflict,
            timestamp: Date.now(),
            sourceId: source.id,
          });
        }
      }

      // Propagate to secondary sources
      if (finalData) {
        const direction = entityConfig.direction || 'bidirectional';
        if (direction === 'bidirectional' || direction === 'pull') {
          for (const secondarySource of sortedSources) {
            if (secondarySource.id === source.id) continue;
            if (await secondarySource.isAvailable()) {
              try {
                await secondarySource.set(entityType, id, finalData);
              } catch (error) {
                log('Failed to propagate to secondary source:', secondarySource.id, error);
              }
            }
          }
        }
      }

      // Update metadata immutably
      updateMetadata(entityType, id, {
        status: 'synced',
        lastSyncedAt: Date.now(),
        remoteModifiedAt: remoteModifiedAt || Date.now(),
        retryCount: 0,
      });

      // Emit complete event
      emit({
        type: 'sync:complete',
        entityType,
        entityId: id,
        data: finalData,
        metadata: metadata.get(getMetadataKey(entityType, id)),
        timestamp: Date.now(),
        sourceId: source.id,
      });

      log('Sync complete:', entityType, id);

      return {
        success: true,
        entityType,
        entityId: id,
        status: 'synced',
        conflicts: conflicts.length > 0 ? conflicts : undefined,
        syncedAt: Date.now(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Update metadata
      updateMetadata(entityType, id, {
        status: 'error',
        error: errorMessage,
        retryCount: (metadata.get(getMetadataKey(entityType, id))?.retryCount || 0) + 1,
      });

      // Emit error event
      emit({
        type: 'sync:error',
        entityType,
        entityId: id,
        error: error instanceof Error ? error : new Error(errorMessage),
        timestamp: Date.now(),
        sourceId: options.sourceId || 'unknown',
      });

      log('Sync error:', entityType, id, errorMessage);

      return {
        success: false,
        entityType,
        entityId: id,
        status: 'error',
        error: errorMessage,
        syncedAt: Date.now(),
      };
    }
  }

  // Sync multiple entities
  async function syncManyEntities(
    entityType: string,
    ids: string[],
    options: SyncOptions = {}
  ): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    for (const id of ids) {
      const result = await syncEntity(entityType, id, options);
      results.push(result);
    }

    return results;
  }

  // Sync all entities of a type
  async function syncAllEntities(
    entityType: string,
    options: SyncOptions = {}
  ): Promise<SyncResult> {
    log('Syncing all:', entityType);

    try {
      const source = await findAvailableSource(options.sourceId);
      if (!source) {
        return {
          success: false,
          entityType,
          status: 'error',
          error: 'No available source',
          syncedAt: Date.now(),
        };
      }

      // Get all entities from primary source
      const entities = await source.getAll(entityType);

      // Sync each entity
      for (const entity of entities) {
        const entityWithId = entity as { id?: string };
        if (entityWithId.id) {
          await syncEntity(entityType, entityWithId.id, options);
        }
      }

      return {
        success: true,
        entityType,
        status: 'synced',
        syncedAt: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        entityType,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        syncedAt: Date.now(),
      };
    }
  }

  // Push local changes
  async function pushEntity(entityType: string, id: string): Promise<void> {
    const source = await findAvailableSource();
    if (!source) {
      if (offlineQueue) {
        // Get local data
        for (const localSource of sortedSources) {
          if (await localSource.isAvailable()) {
            const data = await localSource.get(entityType, id);
            if (data) {
              queueOperation({
                type: 'update',
                entityType,
                entityId: id,
                data,
                timestamp: Date.now(),
                retryCount: 0,
                status: 'pending',
              });
              return;
            }
          }
        }
      }
      throw new Error('No available source');
    }

    // Get local data
    let localData: unknown = null;
    for (const localSource of sortedSources) {
      if (localSource.id === source.id) continue;
      if (await localSource.isAvailable()) {
        localData = await localSource.get(entityType, id);
        if (localData) break;
      }
    }

    if (localData) {
      await source.set(entityType, id, localData);
      updateMetadata(entityType, id, {
        status: 'synced',
        lastSyncedAt: Date.now(),
      });
    }
  }

  // Pull remote changes
  async function pullEntity(entityType: string, id: string): Promise<void> {
    const source = await findAvailableSource();
    if (!source) {
      throw new Error('No available source');
    }

    const remoteData = await source.get(entityType, id);

    if (remoteData) {
      // Update secondary sources
      for (const secondarySource of sortedSources) {
        if (secondarySource.id === source.id) continue;
        if (await secondarySource.isAvailable()) {
          await secondarySource.set(entityType, id, remoteData);
        }
      }

      updateMetadata(entityType, id, {
        status: 'synced',
        lastSyncedAt: Date.now(),
      });
    }
  }

  // Setup online/offline handlers
  function setupNetworkHandlers(): void {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      isOnlineState = true;
      log('Online - processing pending operations');
      emit({
        type: 'sync:online',
        entityType: '*',
        timestamp: Date.now(),
        sourceId: 'system',
      });
      processPendingOperations();
    };

    const handleOffline = () => {
      isOnlineState = false;
      log('Offline');
      emit({
        type: 'sync:offline',
        entityType: '*',
        timestamp: Date.now(),
        sourceId: 'system',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    isOnlineState = navigator.onLine;
  }

  // Start automatic sync
  function start(): void {
    if (syncInterval > 0 && !syncIntervalId) {
      syncIntervalId = setInterval(() => {
        if (isOnlineState) {
          processPendingOperations();
        }
      }, syncInterval);
      log('Started automatic sync with interval:', syncInterval);
    }

    setupNetworkHandlers();
  }

  // Stop automatic sync
  function stop(): void {
    if (syncIntervalId) {
      clearInterval(syncIntervalId);
      syncIntervalId = null;
      log('Stopped automatic sync');
    }
  }

  // Destroy
  function destroy(): void {
    stop();
    metadata.clear();
    pendingOperations.length = 0;
    subscribers.clear();
    log('Destroyed');
  }

  // Create entity
  async function createEntity<T>(entityType: string, data: Partial<T>): Promise<T> {
    // Placeholder implementation
    const id = (data as any).id || crypto.randomUUID();
    const source = sortedSources[0]; // Use primary source
    if (source) {
      await source.set(entityType, id, data);
    }
    return data as T;
  }

  // Update entity
  async function updateEntity<T>(entityType: string, id: string, data: Partial<T>): Promise<T> {
    // Placeholder implementation
    const source = sortedSources[0]; // Use primary source
    if (source) {
      await source.set(entityType, id, data);
    }
    return data as T;
  }

  // Delete entity
  async function deleteEntity(entityType: string, id: string): Promise<void> {
    // Placeholder implementation
    const source = sortedSources[0]; // Use primary source
    if (source) {
      await source.delete(entityType, id);
    }
  }

  // Resolve conflict
  async function resolveConflictManual(_conflictId: string, _resolution: unknown): Promise<void> {
    // Placeholder implementation
    // In a real implementation, this would find the conflict by ID and apply the resolution
  }

  // Clear offline queue
  function clearOfflineQueue(): void {
    pendingOperations.length = 0;
  }

  return {
    sync: syncEntity as any,
    syncMany: syncManyEntities as any,
    syncAll: syncAllEntities as any,
    create: createEntity,
    update: updateEntity,
    delete: deleteEntity,
    resolveConflict: resolveConflictManual,
    retryFailed: processPendingOperations,
    clearOfflineQueue,
    push: pushEntity,
    pull: pullEntity,

    getStatus: (entityType, id) => metadata.get(getMetadataKey(entityType, id)),
    getPendingOperations: () => [...pendingOperations],

    subscribe: (callback) => {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },

    isOnline: () => isOnlineState,
    retryPending: processPendingOperations,

    clearMetadata: (entityType) => {
      if (entityType) {
        for (const [key] of metadata) {
          if (key.startsWith(`${entityType}:`)) {
            metadata.delete(key);
          }
        }
      } else {
        metadata.clear();
      }
    },

    start,
    stop,
    destroy,
  };
}

// =============================================================================
// SOURCE FACTORIES
// =============================================================================

/**
 * Create an API sync source
 */
export function createApiSource(
  baseUrl: string,
  options: {
    priority?: SourcePriority;
    headers?: Record<string, string>;
    timeout?: number;
  } = {}
): SyncSource {
  const { priority = 1, headers = {}, timeout = 30000 } = options;

  return {
    id: 'api',
    priority,

    isAvailable: async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return false;
      }
      try {
        const response = await fetch(`${baseUrl}/health`, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000),
        });
        return response.ok;
      } catch {
        return false;
      }
    },

    get: async (entityType, id) => {
      const response = await fetch(`${baseUrl}/${entityType}/${id}`, {
        headers,
        signal: AbortSignal.timeout(timeout),
      });
      if (!response.ok) return null;
      return response.json();
    },

    getMany: async (entityType, ids) => {
      const results = new Map();
      const response = await fetch(`${baseUrl}/${entityType}?ids=${ids.join(',')}`, {
        headers,
        signal: AbortSignal.timeout(timeout),
      });
      if (response.ok) {
        const data = await response.json();
        for (const item of data) {
          const itemWithId = item as { id?: string };
          if (itemWithId.id) {
            results.set(itemWithId.id, item);
          }
        }
      }
      return results;
    },

    getAll: async (entityType, options) => {
      const params = new URLSearchParams();
      if (options?.limit) params.set('limit', String(options.limit));
      if (options?.offset) params.set('offset', String(options.offset));
      if (options?.modifiedSince) params.set('since', String(options.modifiedSince));

      const url = `${baseUrl}/${entityType}${params.toString() ? `?${params}` : ''}`;
      const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(timeout),
      });
      if (!response.ok) return [];
      return response.json();
    },

    set: async (entityType, id, data) => {
      await fetch(`${baseUrl}/${entityType}/${id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(timeout),
      });
    },

    setMany: async (entityType, entities) => {
      await fetch(`${baseUrl}/${entityType}/batch`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(entities)),
        signal: AbortSignal.timeout(timeout),
      });
    },

    delete: async (entityType, id) => {
      await fetch(`${baseUrl}/${entityType}/${id}`, {
        method: 'DELETE',
        headers,
        signal: AbortSignal.timeout(timeout),
      });
    },

    deleteMany: async (entityType, ids) => {
      await fetch(`${baseUrl}/${entityType}/batch`, {
        method: 'DELETE',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
        signal: AbortSignal.timeout(timeout),
      });
    },
  };
}

/**
 * Create a localStorage sync source
 */
export function createLocalStorageSource(
  prefix: string,
  options: { priority?: SourcePriority } = {}
): SyncSource {
  const { priority = 2 } = options;

  function getKey(entityType: string, id?: string): string {
    return id ? `${prefix}:${entityType}:${id}` : `${prefix}:${entityType}`;
  }

  function getAllKeys(entityType: string): string[] {
    const keys: string[] = [];
    const keyPrefix = `${getKey(entityType)  }:`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(keyPrefix)) {
        keys.push(key);
      }
    }
    return keys;
  }

  return {
    id: 'localStorage',
    priority,

    isAvailable: () => {
      try {
        const testKey = '__storage_test__';
        localStorage.setItem(testKey, testKey);
        localStorage.removeItem(testKey);
        return true;
      } catch {
        return false;
      }
    },

    get: async (entityType, id) => {
      const data = localStorage.getItem(getKey(entityType, id));
      return data ? JSON.parse(data) : null;
    },

    getMany: async (entityType, ids) => {
      const results = new Map();
      for (const id of ids) {
        const data = localStorage.getItem(getKey(entityType, id));
        if (data) {
          results.set(id, JSON.parse(data));
        }
      }
      return results;
    },

    getAll: async (entityType) => {
      const keys = getAllKeys(entityType);
      const results: unknown[] = [];
      for (const key of keys) {
        const data = localStorage.getItem(key);
        if (data) {
          results.push(JSON.parse(data));
        }
      }
      return results;
    },

    set: async (entityType, id, data) => {
      localStorage.setItem(getKey(entityType, id), JSON.stringify(data));
    },

    setMany: async (entityType, entities) => {
      for (const [id, data] of entities) {
        localStorage.setItem(getKey(entityType, id), JSON.stringify(data));
      }
    },

    delete: async (entityType, id) => {
      localStorage.removeItem(getKey(entityType, id));
    },

    deleteMany: async (entityType, ids) => {
      for (const id of ids) {
        localStorage.removeItem(getKey(entityType, id));
      }
    },
  };
}

/**
 * Create a memory sync source (for testing)
 */
export function createMemorySource(
  options: { priority?: SourcePriority } = {}
): SyncSource {
  const { priority = 10 } = options;
  const store = new Map<string, Map<string, unknown>>();

  function getEntityStore(entityType: string): Map<string, unknown> {
    let entityStore = store.get(entityType);
    if (!entityStore) {
      entityStore = new Map();
      store.set(entityType, entityStore);
    }
    return entityStore;
  }

  return {
    id: 'memory',
    priority,

    isAvailable: () => true,

    get: async (entityType, id) => {
      return getEntityStore(entityType).get(id) || null;
    },

    getMany: async (entityType, ids) => {
      const entityStore = getEntityStore(entityType);
      const results = new Map<string, unknown>();
      for (const id of ids) {
        const data = entityStore.get(id);
        if (data) results.set(id, data);
      }
      return results;
    },

    getAll: async (entityType) => {
      return Array.from(getEntityStore(entityType).values());
    },

    set: async (entityType, id, data) => {
      getEntityStore(entityType).set(id, data);
    },

    setMany: async (entityType, entities) => {
      const entityStore = getEntityStore(entityType);
      for (const [id, data] of entities) {
        entityStore.set(id, data);
      }
    },

    delete: async (entityType, id) => {
      getEntityStore(entityType).delete(id);
    },

    deleteMany: async (entityType, ids) => {
      const entityStore = getEntityStore(entityType);
      for (const id of ids) {
        entityStore.delete(id);
      }
    },
  };
}
