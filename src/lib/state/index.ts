/**
 * @file State Management Exports
 * @description Central export for all state management utilities
 *
 * This module provides a production-grade state management system built on Zustand with:
 * - Immer for immutable updates with mutable syntax
 * - DevTools integration with action naming
 * - Memoized selectors for performance
 * - Feature-scoped stores with registration
 * - Type-safe slices and actions
 */

// ============================================================================
// Core Store Exports
// ============================================================================

export {
  useStore,
  getStoreState,
  subscribeToStore,
  hasStoreHydrated,
  waitForHydration,
  resetStore,
  clearPersistedStore,
  registerFeatureStore,
  unregisterFeatureStore,
  getFeatureStore,
  getFeatureStoreNames,
  resetAllFeatureStores,
  type StoreState,
  type StoreSelector,
} from './store';

// ============================================================================
// Slice Exports
// ============================================================================

export * from './slices';

// ============================================================================
// Selector Exports
// ============================================================================

export * from './selectors';

// ============================================================================
// Hook Exports
// ============================================================================

export * from './hooks';

// ============================================================================
// Core Utilities (Factories & Types)
// ============================================================================

// Types
export type {
  // Core types
  Selector,
  EqualityFn,
  ParameterizedSelector,
  HydrationState,
  ResetState,
  StoreUtilities,
  EnhancedStore,
  // Slice types
  SliceCreator,
  SliceWithActions,
  SliceDefinition,
  // Store config types
  PersistConfig,
  DevToolsConfig,
  StoreConfig,
  FeatureStoreConfig,
  // Feature store types
  FeatureStoreRegistry,
  FeatureStoreMeta,
  // Listener types
  ListenerEvent,
  ListenerCallback,
  ListenerConfig,
} from './core';

// Store factories
export {
  createAppStore,
  createSimpleStore,
  createMinimalStore,
  createStoreReset,
  type AppStoreConfig,
} from './core';

// Slice factories
export {
  createSlice,
  createAction,
  combineSlices,
  type SliceConfig,
  type SliceSetter,
  type SliceGetter,
  type SliceState,
  type SliceActions,
  type SliceType,
} from './core';

// Selector factories
export {
  createSelector,
  createObjectSelector,
  createArraySelector,
  createParameterizedSelector,
  createBoundedParameterizedSelector,
  combineSelectors,
  pickSelector,
  omitSelector,
  selectorUtils,
} from './core';

// Feature store factories
export {
  createFeatureStore,
  createLazyFeatureStore,
  createFeatureStoreHooks,
  subscribeToFeatureStore,
  featureStoreRegistry,
  type CreateFeatureStoreConfig,
  type LazyFeatureStore,
} from './core';

// ============================================================================
// Multi-Tab Sync (BroadcastChannel)
// ============================================================================

export {
  createBroadcastSync,
  useBroadcastSync,
  type SyncMessage,
  type SyncMessageType,
  type ConflictStrategy,
  type BroadcastSyncConfig,
  type BroadcastSyncInstance,
} from './sync';
