/**
 * @file Core State Exports
 * @description Export all core state management utilities
 */

// Types
export type {
  StoreMiddleware,
  SliceCreator,
  NamedAction,
  ActionCreator,
  Selector,
  EqualityFn,
  ParameterizedSelector,
  SliceWithActions,
  SliceDefinition,
  HydrationState,
  ResetState,
  StoreUtilities,
  FeatureStoreRegistry,
  FeatureStoreMeta,
  ListenerEvent,
  ListenerCallback,
  ListenerConfig,
  StoreEnhancer,
  EnhancedStore,
  PersistConfig,
  MigrationFn,
  DevToolsConfig,
  StoreConfig,
  FeatureStoreConfig,
} from './types';

// Store Factory
export {
  createAppStore,
  createSimpleStore,
  createMinimalStore,
  waitForHydration,
  createStoreReset,
  type AppStoreConfig,
} from './createStore';

// Slice Factory
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
} from './createSlice';

// Selector Factory
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
} from './createSelectors';

// Feature Store Factory
export {
  createFeatureStore,
  createLazyFeatureStore,
  createFeatureStoreHooks,
  subscribeToFeatureStore,
  featureStoreRegistry,
  type CreateFeatureStoreConfig,
  type LazyFeatureStore,
} from './createFeatureStore';
