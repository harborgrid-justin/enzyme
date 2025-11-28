/**
 * @file Feature Store Factory
 * @description Create isolated feature stores with registration and lifecycle management
 *
 * Feature stores are scoped to specific features/modules and provide:
 * - Isolation from the global store
 * - Optional persistence with feature-specific keys
 * - Auto-registration with global registry for debugging
 * - Lazy initialization support for code-split features
 */

import { create, type StateCreator } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { EnhancedStore } from './types';
import { isDev, devWarn } from '@/lib/core/config/env-helper';

// ============================================================================
// Feature Store Registry (Global)
// ============================================================================

/**
 * Global registry for feature stores
 * Enables debugging and cross-feature communication
 */
class FeatureStoreRegistryImpl {
  private stores = new Map<string, unknown>();
  private metadata = new Map<string, { registeredAt: number; version?: number }>();

  /**
   * Register a feature store
   */
  register<T>(name: string, store: T, version?: number): void {
    if (this.stores.has(name)) {
      devWarn(`[FeatureStore] Store "${name}" already registered. Replacing.`);
    }
    this.stores.set(name, store);
    this.metadata.set(name, { registeredAt: Date.now(), version });
  }

  /**
   * Unregister a feature store
   */
  unregister(name: string): boolean {
    this.metadata.delete(name);
    return this.stores.delete(name);
  }

  /**
   * Get a registered store
   */
  getStore<T>(name: string): T | undefined {
    return this.stores.get(name) as T | undefined;
  }

  /**
   * Check if a store is registered
   */
  has(name: string): boolean {
    return this.stores.has(name);
  }

  /**
   * Get all registered store names
   */
  getNames(): string[] {
    return Array.from(this.stores.keys());
  }

  /**
   * Get metadata for a store
   */
  getMetadata(name: string): { version?: number; registeredAt: number } | undefined {
    return this.metadata.get(name);
  }

  /**
   * Reset all feature stores (call their _reset if available)
   */
  resetAll(): void {
    this.stores.forEach((store) => {
      const typedStore = store as { getState?: () => { _reset?: () => void } };
      if (typeof typedStore.getState === 'function') {
        const state = typedStore.getState();
        if (typeof state._reset === 'function') {
          state._reset();
        }
      }
    });
  }

  /**
   * Clear the registry (does not reset stores)
   */
  clear(): void {
    this.stores.clear();
    this.metadata.clear();
  }
}

/** Global feature store registry instance */
export const featureStoreRegistry = new FeatureStoreRegistryImpl();

// ============================================================================
// Feature Store Configuration
// ============================================================================

/**
 * Feature store configuration options
 */
export interface CreateFeatureStoreConfig<TState> {
  /** Feature name (used in DevTools and registry) */
  name: string;
  /** Persist to storage */
  persist?: {
    /** Storage key (defaults to `feature-${name}`) */
    key?: string;
    /** State to persist (whitelist) */
    partialize?: (state: TState) => Partial<TState>;
    /** Storage version for migrations */
    version?: number;
  };
  /** Register with global store registry (default: true) */
  register?: boolean;
  /** Enable DevTools (default: development only) */
  devtools?: boolean;
}

// ============================================================================
// Feature Store Factory
// ============================================================================

/**
 * Create a feature-scoped store
 *
 * Features:
 * - Immer for immutable updates
 * - DevTools integration with feature namespace
 * - Optional persistence with versioning
 * - Auto-registration with global registry
 *
 * @example
 * ```typescript
 * interface TasksState {
 *   tasks: Task[];
 *   selectedId: string | null;
 * }
 *
 * interface TasksActions {
 *   addTask: (task: Task) => void;
 *   selectTask: (id: string | null) => void;
 * }
 *
 * export const useTasksStore = createFeatureStore<TasksState & TasksActions>(
 *   (set) => ({
 *     tasks: [],
 *     selectedId: null,
 *     addTask: (task) => {
 *       set((state) => { state.tasks.push(task) }, false, { type: 'tasks/addTask' });
 *     },
 *     selectTask: (id) => {
 *       set((state) => { state.selectedId = id }, false, { type: 'tasks/selectTask' });
 *     },
 *   }),
 *   { name: 'tasks', persist: { partialize: (s) => ({ tasks: s.tasks }) } }
 * );
 * ```
 */
export function createFeatureStore<TState extends object>(
  initializer: StateCreator<TState, [['zustand/immer', never], ['zustand/devtools', never]], [], TState>,
  config: CreateFeatureStoreConfig<TState>
): EnhancedStore<TState> {
  const {
    name,
    persist: persistConfig,
    register = true,
    devtools: enableDevtools = isDev(),
  } = config;

  const devtoolsName = `Feature/${name}`;

  // Store will be properly typed after creation
  let store: ReturnType<typeof create<TState>>;

  if (persistConfig !== undefined) {
    const storageKey = persistConfig.key ?? `feature-${name}`;

    store = create<TState>()(
      immer(
        devtools(
          persist(initializer as StateCreator<TState, [['zustand/immer', never], ['zustand/devtools', never], ['zustand/persist', unknown]], [], TState>, {
            name: storageKey,
            partialize: persistConfig.partialize as (state: TState) => Partial<TState>,
            version: persistConfig.version ?? 1,
          }),
          {
            name: devtoolsName,
            enabled: enableDevtools,
          }
        )
      )
    );
  } else {
    store = create<TState>()(
      immer(
        devtools(initializer, {
          name: devtoolsName,
          enabled: enableDevtools,
        })
      )
    );
  }

  // Enhance store with feature-specific methods
  const enhancedStore = store as EnhancedStore<TState>;
  enhancedStore.featureName = name;
  enhancedStore.unregister = () => {
    if (register) {
      featureStoreRegistry.unregister(name);
    }
  };

  // Register with global registry
  if (register) {
    featureStoreRegistry.register(name, enhancedStore, persistConfig?.version);
  }

  return enhancedStore;
}

// ============================================================================
// Lazy Feature Store
// ============================================================================

/**
 * Lazy feature store handle
 */
export interface LazyFeatureStore<TState extends object> {
  /** Get or create the store */
  getStore: () => EnhancedStore<TState>;
  /** Check if store is initialized */
  isInitialized: () => boolean;
  /** Destroy the store and clean up */
  destroy: () => void;
  /** Feature name */
  featureName: string;
}

/**
 * Create a lazy feature store (only created when first accessed)
 *
 * Use this for code-split features where you don't want to create
 * the store until the feature is actually used.
 *
 * @example
 * ```typescript
 * export const tasksStoreLazy = createLazyFeatureStore<TasksState & TasksActions>(
 *   (set) => ({
 *     tasks: [],
 *     addTask: (task) => set((state) => { state.tasks.push(task) }, false, { type: 'tasks/add' }),
 *   }),
 *   { name: 'tasks' }
 * );
 *
 * // Later, when feature is needed:
 * const store = tasksStoreLazy.getStore();
 * const tasks = store((s) => s.tasks);
 * ```
 */
export function createLazyFeatureStore<TState extends object>(
  initializer: StateCreator<TState, [['zustand/immer', never], ['zustand/devtools', never]], [], TState>,
  config: CreateFeatureStoreConfig<TState>
): LazyFeatureStore<TState> {
  let store: EnhancedStore<TState> | null = null;

  return {
    featureName: config.name,

    getStore: () => {
      if (!store) {
        store = createFeatureStore(initializer, config);
      }
      return store;
    },

    isInitialized: () => store !== null,

    destroy: () => {
      if (store) {
        store.unregister?.();
        store = null;
      }
    },
  };
}

// ============================================================================
// Feature Store Utilities
// ============================================================================

/**
 * Hook factory for feature store with proper typing
 *
 * @example
 * ```typescript
 * const { useStore, useSelector, useActions } = createFeatureStoreHooks(useTasksStore);
 *
 * // In component:
 * const tasks = useSelector((s) => s.tasks);
 * const { addTask } = useActions();
 * ```
 */
export function createFeatureStoreHooks<TState extends object>(
  useStore: EnhancedStore<TState>
) {
  // Create a stable selector for actions that uses shallow equality
  // to prevent returning new object references on every render
  let cachedActions: Record<string, unknown> | null = null;
  let cachedActionKeys: string[] = [];

  const actionsSelector = (state: TState): Record<string, unknown> => {
    const actions: Record<string, unknown> = {};
    const actionKeys: string[] = [];

    for (const key in state) {
      if (typeof state[key] === 'function') {
        actions[key] = state[key];
        actionKeys.push(key);
      }
    }

    // Check if actions have changed (same keys and same function references)
    if (
      cachedActions !== null &&
      actionKeys.length === cachedActionKeys.length &&
      actionKeys.every((key, i) =>
        key === cachedActionKeys[i] && actions[key] === cachedActions![key]
      )
    ) {
      return cachedActions;
    }

    cachedActions = actions;
    cachedActionKeys = actionKeys;
    return actions;
  };

  return {
    /** The raw store hook */
    useStore,

    /** Select a slice of state */
    useSelector: <T>(selector: (state: TState) => T): T => {
      return useStore(selector);
    },

    /** Get all actions (assumes actions are functions on state) */
    useActions: <TActions extends Record<string, (...args: never[]) => unknown>>(): TActions => {
      return useStore(actionsSelector) as TActions;
    },
  };
}

/**
 * Subscribe to a feature store outside of React
 *
 * @example
 * ```typescript
 * const unsubscribe = subscribeToFeatureStore(
 *   useTasksStore,
 *   (s) => s.tasks.length,
 *   (count) => console.log(`Task count: ${count}`)
 * );
 * ```
 */
export function subscribeToFeatureStore<TState extends object, TSlice>(
  store: EnhancedStore<TState>,
  selector: (state: TState) => TSlice,
  callback: (value: TSlice, prevValue: TSlice) => void
): () => void {
  let prevValue = selector(store.getState());

  return store.subscribe((state) => {
    const nextValue = selector(state);
    if (!Object.is(nextValue, prevValue)) {
      callback(nextValue, prevValue);
      prevValue = nextValue;
    }
  });
}
