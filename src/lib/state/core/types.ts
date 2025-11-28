/**
 * @file Core State Types
 * @description Type-safe state management foundations for Zustand
 */

import type { StateCreator, StoreApi, UseBoundStore } from 'zustand';

// ============================================================================
// Store Middleware Types
// ============================================================================

/**
 * Store middleware types for proper type inference
 * Order: immer -> devtools -> subscribeWithSelector -> persist
 */
export type StoreMiddleware = [
  ['zustand/immer', never],
  ['zustand/devtools', never],
  ['zustand/subscribeWithSelector', never],
  ['zustand/persist', unknown]
];

/**
 * Slice creator type with full middleware support
 */
export type SliceCreator<
  TSlice,
  TStore = TSlice,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TMiddleware extends any[] = []
> = StateCreator<TStore, TMiddleware, [], TSlice>;

// ============================================================================
// Action Types
// ============================================================================

/**
 * Action with named type for DevTools
 */
export type NamedAction<T extends string, P = void> = P extends void
  ? { type: T }
  : { type: T; payload: P };

/**
 * Action creator function type
 */
export type ActionCreator<TPayload = void> = TPayload extends void
  ? () => void
  : (payload: TPayload) => void;

// ============================================================================
// Selector Types
// ============================================================================

/**
 * Selector function type
 */
export type Selector<TState, TResult> = (state: TState) => TResult;

/**
 * Equality function for selectors
 */
export type EqualityFn<T> = (a: T, b: T) => boolean;

/**
 * Parameterized selector (selector factory)
 */
export type ParameterizedSelector<TState, TParam, TResult> = (
  param: TParam
) => Selector<TState, TResult>;

// ============================================================================
// Slice Types
// ============================================================================

/**
 * Store slice with actions
 */
export interface SliceWithActions<TState, TActions> {
  state: TState;
  actions: TActions;
}

/**
 * Slice configuration
 */
export interface SliceDefinition<
  TState extends object,
  TActions extends Record<string, (...args: unknown[]) => void>
> {
  name: string;
  initialState: TState;
  actions: TActions;
}

// ============================================================================
// Hydration Types
// ============================================================================

/**
 * Hydration state for persisted stores
 */
export interface HydrationState {
  _hasHydrated: boolean;
  _setHasHydrated: (hydrated: boolean) => void;
}

/**
 * Reset capability for stores
 */
export interface ResetState {
  _reset: () => void;
}

/**
 * Combined store utilities
 */
export type StoreUtilities = HydrationState & ResetState;

// ============================================================================
// Feature Store Types
// ============================================================================

/**
 * Feature store registration
 */
export interface FeatureStoreRegistry {
  register: <T>(name: string, store: T) => void;
  unregister: (name: string) => void;
  getStore: <T>(name: string) => T | undefined;
  getAllStores: () => Map<string, unknown>;
  reset: () => void;
}

/**
 * Feature store metadata
 */
export interface FeatureStoreMeta {
  name: string;
  version?: number;
  registeredAt: number;
}

// ============================================================================
// Listener Types
// ============================================================================

/**
 * Listener middleware event
 */
export interface ListenerEvent<TState> {
  type: string;
  payload?: unknown;
  prevState: TState;
  nextState: TState;
}

/**
 * Listener callback
 */
export type ListenerCallback<TState> = (event: ListenerEvent<TState>) => void;

/**
 * Listener middleware configuration
 */
export interface ListenerConfig<TState> {
  /** Action types to listen for (empty = all) */
  actionTypes?: string[];
  /** State selector to watch */
  selector?: Selector<TState, unknown>;
  /** Callback function */
  callback: ListenerCallback<TState>;
}

// ============================================================================
// Store Enhancer Types
// ============================================================================

/**
 * Store enhancer for adding capabilities
 */
export type StoreEnhancer<TState> = (
  store: UseBoundStore<StoreApi<TState>>
) => UseBoundStore<StoreApi<TState>>;

/**
 * Store with enhanced capabilities
 * Extends the Zustand store hook with additional metadata and methods
 */
export type EnhancedStore<TState> = UseBoundStore<StoreApi<TState>> & {
  /** Feature name (for feature stores) */
  featureName?: string;
  /** Unregister from global registry */
  unregister?: () => void;
  /** Reset to initial state */
  reset?: () => void;
};

// ============================================================================
// Persistence Types
// ============================================================================

/**
 * Persistence configuration
 */
export interface PersistConfig<TState> {
  /** Storage key */
  key: string;
  /** State to persist (whitelist) */
  partialize?: (state: TState) => Partial<TState>;
  /** Storage version for migrations */
  version?: number;
  /** Migration functions */
  migrate?: (persistedState: unknown, version: number) => TState;
  /** Skip hydration (for manual hydration) */
  skipHydration?: boolean;
  /** Storage engine override */
  storage?: 'localStorage' | 'sessionStorage' | 'custom';
}

/**
 * Migration function type
 */
export type MigrationFn<TState> = (
  persistedState: unknown,
  version: number
) => Partial<TState>;

// ============================================================================
// DevTools Types
// ============================================================================

/**
 * DevTools configuration
 */
export interface DevToolsConfig {
  /** Store name in DevTools */
  name: string;
  /** Enable DevTools (default: development only) */
  enabled?: boolean;
  /** Anonymous action type for unnamed actions */
  anonymousActionType?: string;
  /** Enable trace (shows stack trace in DevTools) */
  trace?: boolean;
  /** Trace stack limit */
  traceLimit?: number;
}

// ============================================================================
// Store Configuration Types
// ============================================================================

/**
 * Full store configuration
 */
export interface StoreConfig<TState> {
  /** Store name for DevTools */
  name: string;
  /** Persistence configuration */
  persist?: PersistConfig<TState>;
  /** DevTools configuration */
  devtools?: boolean | DevToolsConfig;
  /** Enable subscribeWithSelector */
  subscribeWithSelector?: boolean;
  /** Enable immer */
  immer?: boolean;
}

/**
 * Feature store configuration
 */
export interface FeatureStoreConfig<TState> extends StoreConfig<TState> {
  /** Auto-register with global registry */
  register?: boolean;
  /** Lazy initialization */
  lazy?: boolean;
}
