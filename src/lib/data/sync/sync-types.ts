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
