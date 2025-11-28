/**
 * @file Store Factory
 * @description Creates Zustand stores with production-grade middleware stack:
 *              Immer + DevTools + SubscribeWithSelector + Persist
 */

import { create, type StateCreator } from 'zustand';
import { devtools, subscribeWithSelector, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { HydrationState, ResetState } from './types';

// ============================================================================
// Store Configuration
// ============================================================================

/**
 * App store configuration options
 */
export interface AppStoreConfig<TState> {
  /** Store name for DevTools */
  name: string;
  /** Persistence configuration */
  persist?: {
    /** Storage key */
    key: string;
    /** State to persist (whitelist) */
    partialize?: (state: TState) => Partial<TState>;
    /** Storage version for migrations */
    version?: number;
    /** Migration functions */
    migrate?: (persistedState: unknown, version: number) => TState;
    /** Skip hydration */
    skipHydration?: boolean;
  };
  /** Enable DevTools (default: true in dev) */
  devtools?: boolean;
  /** Custom DevTools options */
  devtoolsOptions?: {
    enabled?: boolean;
    anonymousActionType?: string;
    trace?: boolean;
    traceLimit?: number;
  };
}

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Full middleware stack type for proper inference
 */
type FullMiddleware = [
  ['zustand/immer', never],
  ['zustand/devtools', never],
  ['zustand/subscribeWithSelector', never],
  ['zustand/persist', unknown]
];

/**
 * Middleware stack without persistence
 */
type NoPersistMiddleware = [
  ['zustand/immer', never],
  ['zustand/devtools', never],
  ['zustand/subscribeWithSelector', never]
];

// ============================================================================
// Store Factory
// ============================================================================

/**
 * Create a type-safe Zustand store with all middleware
 *
 * Middleware order (inside-out):
 * 1. immer - Enables immutable updates with mutable syntax
 * 2. devtools - Redux DevTools integration with action names
 * 3. subscribeWithSelector - Granular subscriptions for performance
 * 4. persist - Optional state persistence to localStorage
 *
 * @example
 * ```typescript
 * const useStore = createAppStore(
 *   (set, get) => ({
 *     count: 0,
 *     increment: () => set((state) => { state.count += 1 }, false, { type: 'increment' }),
 *   }),
 *   { name: 'CounterStore' }
 * );
 * ```
 */
export function createAppStore<TState extends object>(
  initializer: StateCreator<
    TState & HydrationState & ResetState,
    FullMiddleware,
    [],
    TState
  >,
  config: AppStoreConfig<TState>
) {
  const {
    name,
    persist: persistConfig,
    devtools: enableDevtools = process.env['NODE_ENV'] === 'development',
    devtoolsOptions = {},
  } = config;

  // Build initial state reference for reset
  let initialState: TState | null = null;

  const storeCreator: StateCreator<
    TState & HydrationState & ResetState,
    FullMiddleware
  > = (set, get, api) => {
    const sliceState = initializer(set, get, api);

    // Capture initial state for reset capability
    initialState = { ...sliceState };

    return {
      ...sliceState,

      // Hydration tracking
      _hasHydrated: !persistConfig,
      _setHasHydrated: (hydrated: boolean) => {
        set(
          (state) => {
            state._hasHydrated = hydrated;
          },
          false,
          { type: '@@HYDRATION/SET_HYDRATED' }
        );
      },

      // Reset capability for logout/clear
      _reset: () => {
        if (initialState) {
          set(
            () => ({ ...initialState } as TState & HydrationState & ResetState),
            true,
            { type: '@@RESET/STORE' }
          );
        }
      },
    };
  };

  // Apply middleware in correct order (inside-out)
  // immer -> devtools -> subscribeWithSelector -> persist
  if (persistConfig !== undefined) {
    return create<TState & HydrationState & ResetState>()(
      immer(
        devtools(
          subscribeWithSelector(
            persist(storeCreator, {
              name: persistConfig.key,
              partialize: persistConfig.partialize as (
                state: TState & HydrationState & ResetState
              ) => Partial<TState & HydrationState & ResetState>,
              version: persistConfig.version ?? 1,
              migrate: persistConfig.migrate as (
                persistedState: unknown,
                version: number
              ) => TState & HydrationState & ResetState,
              skipHydration: persistConfig.skipHydration ?? false,
              onRehydrateStorage: () => (state) => {
                state?._setHasHydrated(true);
              },
            })
          ),
          {
            name,
            enabled: enableDevtools,
            ...devtoolsOptions,
          }
        )
      )
    );
  }

  // Without persistence - simpler middleware stack
  return create<TState & HydrationState & ResetState>()(
    immer(
      devtools(
        subscribeWithSelector(storeCreator as StateCreator<
          TState & HydrationState & ResetState,
          NoPersistMiddleware
        >),
        {
          name,
          enabled: enableDevtools,
          ...devtoolsOptions,
        }
      )
    )
  );
}

// ============================================================================
// Simple Store Factory (No Persistence)
// ============================================================================

/**
 * Create a simple Zustand store with Immer and DevTools
 * Use this for stores that don't need persistence
 *
 * @example
 * ```typescript
 * const useUIStore = createSimpleStore(
 *   (set) => ({
 *     isOpen: false,
 *     toggle: () => set((state) => { state.isOpen = !state.isOpen }, false, { type: 'toggle' }),
 *   }),
 *   'UIStore'
 * );
 * ```
 */
export function createSimpleStore<TState extends object>(
  initializer: StateCreator<TState, [['zustand/immer', never], ['zustand/devtools', never]], [], TState>,
  name: string,
  enableDevtools = process.env['NODE_ENV'] === 'development'
) {
  return create<TState>()(
    immer(
      devtools(initializer, {
        name,
        enabled: enableDevtools,
      })
    )
  );
}

// ============================================================================
// Minimal Store Factory
// ============================================================================

/**
 * Create a minimal Zustand store with just Immer
 * Use this for simple local stores
 *
 * @example
 * ```typescript
 * const useLocalStore = createMinimalStore((set) => ({
 *   items: [],
 *   addItem: (item) => set((state) => { state.items.push(item) }),
 * }));
 * ```
 */
export function createMinimalStore<TState extends object>(
  initializer: StateCreator<TState, [['zustand/immer', never]], [], TState>
) {
  return create<TState>()(immer(initializer));
}

// ============================================================================
// Store Utilities
// ============================================================================

/**
 * Wait for store hydration to complete
 */
export async function waitForHydration<TState extends HydrationState>(
  store: { getState: () => TState; subscribe: (selector: (state: TState) => boolean, callback: (value: boolean) => void) => () => void }
): Promise<void> {
  return new Promise((resolve) => {
    if (store.getState()._hasHydrated) {
      resolve();
      return;
    }

    const unsubscribe = store.subscribe(
      (state) => state._hasHydrated,
      (hydrated) => {
        if (hydrated) {
          unsubscribe();
          resolve();
        }
      }
    );
  });
}

/**
 * Create a reset function for a store
 */
export function createStoreReset<TState extends ResetState>(
  store: { getState: () => TState }
): () => void {
  return () => {
    store.getState()._reset();
  };
}
