/**
 * @file Sync Module Index
 * @description Exports for the data synchronization library including
 * multi-source sync engine, conflict resolution, and optimistic updates.
 */

// Sync Engine
export {
  // Types
  type SourcePriority,
  type SyncDirection,
  type SyncStatus,
  type SyncMetadata,
  type SyncEventType,
  type SyncEvent,
  type SyncSource,
  type QueryOptions,
  type SyncEngineConfig,
  type EntitySyncConfig,
  type SyncOperation,
  type SyncEngine,
  type SyncOptions,
  type SyncResult,
  type SyncConflict,

  // Factory
  createSyncEngine,

  // Source Factories
  createApiSource,
  createLocalStorageSource,
  createMemorySource,
} from './sync-engine';

// Conflict Resolver
export {
  // Types
  type ConflictStrategy,
  type FieldStrategy,
  type Conflict,
  type ConflictResolutionResult,
  type ConflictResolverConfig,
  type VectorClock,
  type ConflictResolver,

  // Factory
  createConflictResolver,

  // Utilities
  threeWayMerge,
  compareVectorClocks,
  mergeVectorClocks,
  incrementVectorClock,
  createVectorClock,

  // Presets
  serverWinsResolver,
  clientWinsResolver,
  latestWinsResolver,
  threeWayMergeResolver,
} from './conflict-resolver';

// Optimistic Sync
export {
  // Types
  type OptimisticStatus,
  type PendingChange,
  type OptimisticSyncConfig,
  type OptimisticSyncState,
  type OptimisticSyncActions,
  type OptimisticSyncReturn,
  type ListItem,
  type OptimisticListConfig,
  type PendingListOperation,

  // Hooks
  useOptimisticSync,
  useOptimisticList,
} from './optimistic-sync';
