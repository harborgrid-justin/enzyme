/**
 * @file Main Store
 * @description Global Zustand store with enterprise-grade middleware stack
 *
 * This is the main store composition file that combines all slices with
 * the production middleware stack: Immer + DevTools + SubscribeWithSelector + Persist
 *
 * Middleware Order (inside-out):
 * 1. immer - Enables immutable updates with mutable syntax
 * 2. devtools - Redux DevTools integration with named actions
 * 3. subscribeWithSelector - Granular subscriptions for performance
 * 4. persist - State persistence to localStorage
 */

import { create, type StateCreator } from 'zustand';
import { devtools, subscribeWithSelector, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { uiSlice, type UISlice } from './slices/uiSlice';
import { sessionSlice, type SessionSlice } from './slices/sessionSlice';
import { settingsSlice, type SettingsSlice } from './slices/settingsSlice';
import { isDebugModeEnabled } from '../flags/debugMode';

// ============================================================================
// Store Types
// ============================================================================

/**
 * Combined store state type
 */
export type StoreState = UISlice & SessionSlice & SettingsSlice & HydrationState;

/**
 * Hydration state for SSR compatibility
 */
interface HydrationState {
  _hasHydrated: boolean;
  _setHasHydrated: (hydrated: boolean) => void;
}

/**
 * Store selector type helper
 */
export type StoreSelector<T> = (state: StoreState) => T;

// ============================================================================
// Persistence Configuration
// ============================================================================

/**
 * Current store version (increment when making breaking changes)
 */
const STORE_VERSION = 4;

/**
 * State to persist (whitelist approach for security and performance)
 *
 * DO NOT persist:
 * - Session data (security - should be re-validated on reload)
 * - Modal state (transient UI)
 * - Loading state (transient UI)
 * - Toasts (transient UI)
 */
const persistedState = (state: StoreState): Partial<StoreState> => ({
  // UI preferences (user experience)
  sidebarOpen: state.sidebarOpen,
  sidebarCollapsed: state.sidebarCollapsed,
  layoutDensity: state.layoutDensity,
  animationsEnabled: state.animationsEnabled,

  // Settings (all persisted for user preferences)
  locale: state.locale,
  timezone: state.timezone,
  dateFormat: state.dateFormat,
  timeFormat: state.timeFormat,
  numberFormat: state.numberFormat,
  theme: state.theme,
  notificationsEnabled: state.notificationsEnabled,
  soundEnabled: state.soundEnabled,
  desktopNotifications: state.desktopNotifications,
  emailNotifications: state.emailNotifications,
  reducedMotion: state.reducedMotion,
  highContrast: state.highContrast,
  fontSize: state.fontSize,
  keyboardShortcutsEnabled: state.keyboardShortcutsEnabled,
  features: state.features,
  analyticsEnabled: state.analyticsEnabled,
  crashReportingEnabled: state.crashReportingEnabled,
});

/**
 * State migrations for version upgrades
 */
const migrations: Record<number, (state: unknown) => unknown> = {
  // Version 1 -> 2: Add layoutDensity
  2: (state: unknown) => ({
    ...(state as object),
    layoutDensity: 'comfortable',
  }),

  // Version 2 -> 3: Add keyboard shortcuts and animations
  3: (state: unknown) => ({
    ...(state as object),
    keyboardShortcutsEnabled: true,
    animationsEnabled: true,
  }),

  // Version 3 -> 4: Add theme and email notifications
  4: (state: unknown) => ({
    ...(state as object),
    theme: 'system',
    emailNotifications: true,
    analyticsEnabled: true,
    crashReportingEnabled: true,
  }),
};

/**
 * Run migrations from persisted version to current version
 */
function migrate(persistedState: unknown, version: number): StoreState {
  let state = persistedState;

  // Run each migration in sequence
  for (let v = version + 1; v <= STORE_VERSION; v++) {
    const migration = migrations[v];
    if (migration) {
      state = migration(state);
    }
  }

  return state as StoreState;
}

// ============================================================================
// Middleware Type Definitions
// ============================================================================

/**
 * Full middleware stack type for proper TypeScript inference
 */
type FullMiddleware = [
  ['zustand/immer', never],
  ['zustand/devtools', never],
  ['zustand/subscribeWithSelector', never],
  ['zustand/persist', unknown]
];

// ============================================================================
// Store Creation
// ============================================================================

/**
 * Slice creator arguments type for composing store slices
 */
type SliceCreatorArgs = Parameters<StateCreator<StoreState, FullMiddleware>>;

/**
 * Combined store creator that composes all slices
 */
const storeCreator: StateCreator<StoreState, FullMiddleware> = (...args: SliceCreatorArgs) => {
  // Cast args to the expected slice parameters - this is safe as all slices
  // use the same StateCreator pattern with compatible argument types
  const sliceArgs = args as unknown as Parameters<typeof uiSlice>;
  const ui = uiSlice(...sliceArgs);
  const session = sessionSlice(...sliceArgs as unknown as Parameters<typeof sessionSlice>);
  const settings = settingsSlice(...sliceArgs as unknown as Parameters<typeof settingsSlice>);

  return {
    // Compose slices
    ...ui,
    ...session,
    ...settings,

    // Hydration tracking (for SSR compatibility)
    _hasHydrated: false,
    _setHasHydrated: (hydrated: boolean) => {
      const [set] = args;
      set(
        (state) => {
          state._hasHydrated = hydrated;
        },
        false,
        { type: '@@HYDRATION/SET_HYDRATED' }
      );
    },
  };
}

/**
 * Global store instance
 *
 * The middleware stack (applied inside-out):
 * 1. immer: Enables writing "mutating" logic in reducers
 * 2. devtools: Connects to Redux DevTools for debugging
 * 3. subscribeWithSelector: Enables selector-based subscriptions
 * 4. persist: Persists state to localStorage with migrations
 */
export const useStore = create<StoreState>()(
  immer(
    devtools(
      subscribeWithSelector(
        persist(storeCreator, {
          name: 'app-store',
          version: STORE_VERSION,
          partialize: persistedState,
          migrate,
          onRehydrateStorage: () => (state) => {
            // Called when hydration completes
            if (state) {
              state._setHasHydrated(true);
            }
          },
        })
      ),
      {
        name: 'AppStore',
        enabled: isDebugModeEnabled(),
        trace: true,
        traceLimit: 25,
      }
    )
  )
);

// ============================================================================
// Store Utilities
// ============================================================================

/**
 * Get a snapshot of the current store state (for use outside React)
 *
 * @example
 * ```typescript
 * const currentLocale = getStoreState().locale;
 * ```
 */
export function getStoreState(): StoreState {
  return useStore.getState();
}

/**
 * Subscribe to store changes with selector (for use outside React)
 *
 * @example
 * ```typescript
 * const unsubscribe = subscribeToStore(
 *   (state) => state.locale,
 *   (newLocale, prevLocale) => {
 *     console.log('Locale changed:', prevLocale, '->', newLocale);
 *   }
 * );
 * ```
 */
export function subscribeToStore<T>(
  selector: StoreSelector<T>,
  callback: (value: T, prevValue: T) => void
): () => void {
  return useStore.subscribe(selector, callback);
}

/**
 * Check if store has hydrated from persistence
 */
export function hasStoreHydrated(): boolean {
  return useStore.getState()._hasHydrated;
}

/**
 * Wait for store hydration to complete
 *
 * @param timeoutMs - Maximum time to wait for hydration (default: 5000ms)
 * @returns true if hydration completed, false if timeout occurred
 *
 * @example
 * ```typescript
 * const hydrated = await waitForHydration();
 * if (hydrated) {
 *   // Store is now hydrated, safe to read persisted values
 * } else {
 *   // Timeout occurred, handle gracefully
 * }
 * ```
 */
export async function waitForHydration(timeoutMs = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    if (hasStoreHydrated()) {
      resolve(true);
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let unsubscribe: (() => void) | null = null;

    const cleanup = (): void => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (unsubscribe !== null) {
        unsubscribe();
        unsubscribe = null;
      }
    };

    // Set up timeout to prevent infinite hanging
    timeoutId = setTimeout(() => {
      cleanup();
      console.warn(
        `[Store] waitForHydration timed out after ${timeoutMs}ms. ` +
        'This may indicate a persistence configuration issue.'
      );
      resolve(false);
    }, timeoutMs);

    unsubscribe = useStore.subscribe(
      (state) => state._hasHydrated,
      (hydrated) => {
        if (hydrated) {
          cleanup();
          resolve(true);
        }
      }
    );
  });
}

/**
 * Reset store to initial state (useful for logout)
 *
 * This will:
 * - End the session
 * - Close all modals
 * - Clear toasts
 * - Stop any loading states
 *
 * Note: Settings are preserved by default (user preferences)
 *
 * @param clearSettings - Also reset settings to defaults
 */
export function resetStore(clearSettings = false): void {
  const state = useStore.getState();

  // End session
  state.endSession();

  // Reset UI state
  state.closeAllModals();
  state.clearToasts();
  state.setGlobalLoading(false);

  // Optionally reset settings
  if (clearSettings) {
    state.resetSettings();
  }
}

/**
 * Clear persisted store data from localStorage
 *
 * Use with caution - this removes all persisted state
 */
export function clearPersistedStore(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('app-store');
  }
}

// ============================================================================
// Feature Store Registry
// ============================================================================

type FeatureStore = ReturnType<typeof create>;

const featureStores = new Map<string, FeatureStore>();

/**
 * Register a feature store with the global registry
 *
 * @example
 * ```typescript
 * const useReportsStore = createFeatureStore(...);
 * registerFeatureStore('reports', useReportsStore);
 * ```
 */
export function registerFeatureStore(name: string, store: FeatureStore): void {
  if (featureStores.has(name)) {
    console.warn(`[Store] Feature store "${name}" already registered, replacing...`);
  }
  featureStores.set(name, store);
}

/**
 * Unregister a feature store from the global registry
 */
export function unregisterFeatureStore(name: string): void {
  featureStores.delete(name);
}

/**
 * Get a feature store by name
 */
export function getFeatureStore<T>(name: string): T | undefined {
  return featureStores.get(name) as T | undefined;
}

/**
 * Get all registered feature store names
 */
export function getFeatureStoreNames(): string[] {
  return Array.from(featureStores.keys());
}

/**
 * Reset all feature stores that have a reset method
 *
 * @param clearRegistry - Also clear the feature store registry (default: true)
 *                       Set to false if you want to keep stores registered but reset
 */
export function resetAllFeatureStores(clearRegistry = true): void {
  featureStores.forEach((store, _name) => {
    // Type the store's getState method properly
    type StoreWithReset = { reset?: () => void; _reset?: () => void };
    const state = (store.getState as () => StoreWithReset)();
    if (typeof state.reset === 'function') {
      state.reset();
    } else if (typeof state._reset === 'function') {
      state._reset();
    }
  });

  // Clear the registry to prevent memory leaks from orphaned store references
  if (clearRegistry) {
    featureStores.clear();
  }
}

// ============================================================================
// Development Helpers
// ============================================================================

// Expose store to window when debug mode is enabled for debugging
if (isDebugModeEnabled() && typeof window !== 'undefined') {
  (window as unknown as { __STORE__: typeof useStore }).__STORE__ = useStore;
}
