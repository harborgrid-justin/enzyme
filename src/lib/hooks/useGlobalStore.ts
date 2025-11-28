/**
 * @file useGlobalStore Hook
 * @description Hook for accessing global Zustand store with selectors
 */

import { useCallback, useMemo, useRef } from 'react';
import { useStore, type StoreState } from '../state/store';

/**
 * Selector function type
 */
export type Selector<T> = (state: StoreState) => T;

/**
 * Hook for accessing specific state slice
 */
export function useGlobalStore<T>(selector: Selector<T>): T {
  return useStore(selector);
}

/**
 * Hook for accessing multiple state slices
 *
 * Note: Uses a combined selector to comply with Rules of Hooks.
 * Hooks must not be called inside loops, conditions, or nested functions.
 */
export function useGlobalStoreMultiple<T extends Record<string, unknown>>(
  selectors: { [K in keyof T]: Selector<T[K]> }
): T {
  // Use a version counter for stable useMemo dependency tracking
  // This avoids the problematic ternary dependency pattern
  const versionRef = useRef(0);
  const selectorsRef = useRef(selectors);
  const keysRef = useRef<string[]>([]);

  // Check if selectors have actually changed (shallow comparison of values)
  const currentKeys = Object.keys(selectors);
  const keysChanged = currentKeys.length !== keysRef.current.length ||
    currentKeys.some((key, i) => key !== keysRef.current[i]);
  const selectorsChanged = keysChanged ||
    currentKeys.some(key => selectors[key as keyof T] !== selectorsRef.current[key as keyof T]);

  if (selectorsChanged) {
    selectorsRef.current = selectors;
    keysRef.current = currentKeys;
    // Increment version to trigger useMemo recalculation
    versionRef.current++;
  }

  // Create a combined selector that extracts all values at once
  // Using version counter as dependency ensures stable reference tracking
  const combinedSelector = useMemo(() => {
    const stableSelectors = selectorsRef.current;
    return (state: StoreState): T => {
      const result = {} as T;
      for (const key of Object.keys(stableSelectors) as (keyof T)[]) {
        result[key] = stableSelectors[key](state);
      }
      return result;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionRef.current]);

  // Use shallow comparison for the result to prevent unnecessary re-renders
  const resultRef = useRef<T | null>(null);

  return useStore((state) => {
    const newResult = combinedSelector(state);

    if (resultRef.current !== null && resultRef.current !== undefined) {
      // Shallow compare the results
      const keys = Object.keys(newResult) as (keyof T)[];
      const prevResult = resultRef.current;
      const hasChanged = keys.some(key => !Object.is(newResult[key], prevResult[key]));
      if (!hasChanged) {
        return resultRef.current;
      }
    }

    resultRef.current = newResult;
    return newResult;
  });
}

/**
 * Hook for computed values from store
 *
 * Uses the compute function directly as a selector with memoization
 * to prevent unnecessary re-renders.
 */
export function useGlobalStoreComputed<T>(
  compute: (state: StoreState) => T,
  deps: unknown[] = []
): T {
  // Memoize the selector based on deps to maintain referential stability
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoizedSelector = useCallback(compute, deps);

  // Use a custom equality function that caches and compares results
  const resultRef = useRef<{ value: T; initialized: boolean }>({ value: undefined as T, initialized: false });

  return useStore((state) => {
    const newValue = memoizedSelector(state);

    // On first run, initialize the cache
    if (!resultRef.current.initialized) {
      resultRef.current = { value: newValue, initialized: true };
      return newValue;
    }

    // For objects/arrays, use shallow comparison for stability
    const prevValue = resultRef.current.value;
    if (Object.is(newValue, prevValue)) {
      return prevValue;
    }

    // Update cache and return new value
    resultRef.current.value = newValue;
    return newValue;
  });
}

/**
 * Hook for store actions
 */
export function useGlobalStoreActions(): Record<string, unknown> {
  const actions = useStore((_state) => ({
    // Add your store actions here based on your actual store implementation
    // Example: reset: state.reset,
  }));

  return actions;
}

/**
 * Extended state interface for optional hydration state
 */
interface HydratableState {
  _hydrated?: boolean;
}

/**
 * Hook for checking if store is hydrated (useful for SSR)
 */
export function useStoreHydrated(): boolean {
  const hydrated = useStore((state) => (state as StoreState & HydratableState)._hydrated ?? true);
  return hydrated;
}

/**
 * Create a bound selector hook for a specific slice
 */
export function createSliceHook<T>(selector: Selector<T>) {
  return function useSlice(): T {
    return useStore(selector);
  };
}

/**
 * Create a bound action hook
 */
export function createActionHook<T extends (...args: unknown[]) => unknown>(
  actionSelector: Selector<T>
) {
  return function useAction(): T {
    return useStore(actionSelector);
  };
}

/**
 * Hook for subscribing to store changes with callback
 */
export function useGlobalStoreSubscription<T>(
  selector: Selector<T>,
  callback: (value: T, prevValue: T) => void
): { value: T; ref: (node: T | null) => void } {
  const value = useStore(selector);
  const prevValueRef = useCallback(
    (node: T | null) => {
      if (node !== null && node !== value) {
        callback(value, node as T);
      }
    },
    [value, callback]
  );

  return { value, ref: prevValueRef };
}

/**
 * Extended state interface for optional nested structures
 * These allow flexibility for different store configurations
 */
interface ExtendedStoreState {
  ui?: {
    sidebarOpen?: boolean;
    theme?: string;
  };
  user?: {
    current?: unknown;
  };
  notifications?: {
    items?: unknown[];
    unreadCount?: number;
  };
  // Direct properties from UISlice
  sidebarOpen?: boolean;
  theme?: string;
}

/**
 * Type guard for accessing optional nested state
 */
function getNestedOrDirect<T>(
  state: StoreState & ExtendedStoreState,
  nestedPath: keyof ExtendedStoreState,
  nestedKey: string,
  directKey: keyof StoreState,
  defaultValue: T
): T {
  const nested = state[nestedPath];
  if (nested != null && typeof nested === 'object' && nestedKey in nested) {
    return (nested as Record<string, unknown>)[nestedKey] as T;
  }
  if (directKey in state) {
    return state[directKey] as T;
  }
  return defaultValue;
}

/**
 * Common selectors for convenience
 */
export const globalSelectors = {
  // UI state - check nested first, then direct properties
  sidebarOpen: (state: StoreState): boolean =>
    getNestedOrDirect(state, 'ui', 'sidebarOpen', 'sidebarOpen' as keyof StoreState, true),
  theme: (state: StoreState): string =>
    getNestedOrDirect(state, 'ui', 'theme', 'theme' as keyof StoreState, 'light'),

  // User state
  currentUser: (state: StoreState): unknown => {
    const extended = state as StoreState & ExtendedStoreState;
    return extended.user?.current ?? null;
  },
  isAuthenticated: (state: StoreState): boolean => {
    const extended = state as StoreState & ExtendedStoreState;
    return extended.user?.current != null;
  },

  // Notifications
  notifications: (state: StoreState): unknown[] => {
    const extended = state as StoreState & ExtendedStoreState;
    return extended.notifications?.items ?? [];
  },
  unreadCount: (state: StoreState): number => {
    const extended = state as StoreState & ExtendedStoreState;
    return extended.notifications?.unreadCount ?? 0;
  },
} as const;

/**
 * Pre-built hooks using common selectors
 */
export const useIsSidebarOpen = (): boolean => useGlobalStore(globalSelectors.sidebarOpen);
export const useCurrentUser = (): unknown => useGlobalStore(globalSelectors.currentUser);
export const useIsAuthenticated = (): boolean => useGlobalStore(globalSelectors.isAuthenticated);
export const useUnreadNotificationCount = (): number => useGlobalStore(globalSelectors.unreadCount);
