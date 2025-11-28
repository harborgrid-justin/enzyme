/**
 * @file Selector Factory
 * @description Create memoized selectors with automatic dependency tracking
 *
 * This module provides utilities for creating performant, memoized selectors
 * that prevent unnecessary re-renders by caching results and using shallow
 * equality comparisons.
 */

import { shallow } from 'zustand/shallow';
import type { Selector, EqualityFn } from './types';

// ============================================================================
// Memoization Cache Types
// ============================================================================

/**
 * Memoization cache entry
 */
interface CacheEntry<T> {
  deps: unknown[];
  result: T;
}

// ============================================================================
// Core Selector Factories
// ============================================================================

/**
 * Create a memoized selector that only recomputes when dependencies change
 *
 * Similar to Reselect's createSelector, but optimized for Zustand.
 * Uses reference equality for dependencies and optional custom equality for results.
 *
 * @example
 * ```typescript
 * // Combine multiple primitive selectors into a computed value
 * const selectFullName = createSelector(
 *   [selectFirstName, selectLastName],
 *   (first, last) => `${first} ${last}`
 * );
 *
 * // With custom equality
 * const selectFilteredItems = createSelector(
 *   [selectItems, selectFilter],
 *   (items, filter) => items.filter(item => item.includes(filter)),
 *   shallow // Use shallow equality for array comparison
 * );
 * ```
 */
export function createSelector<TState, TDeps extends unknown[], TResult>(
  dependencySelectors: { [K in keyof TDeps]: Selector<TState, TDeps[K]> },
  combiner: (...deps: TDeps) => TResult,
  equalityFn: EqualityFn<TResult> = Object.is
): Selector<TState, TResult> {
  let cache: CacheEntry<TResult> | null = null;

  return (state: TState): TResult => {
    // Extract dependencies from state
    const deps = dependencySelectors.map((selector) => selector(state)) as TDeps;

    // Check if dependencies changed (reference equality)
    if (cache !== null && deps.every((dep, i) => Object.is(dep, cache?.deps[i]))) {
      return cache.result;
    }

    // Recompute result
    const result = combiner(...deps);

    // Check if result changed (for referential stability)
    if (cache !== null && equalityFn(cache.result, result)) {
      // Update deps but keep old result reference
      cache.deps = deps;
      return cache.result;
    }

    // Update cache with new result
    cache = { deps, result };
    return result;
  };
}

/**
 * Create a selector that returns a stable object reference
 *
 * Use this for selectors that return objects to prevent unnecessary re-renders.
 * Uses shallow equality to compare object properties.
 *
 * @example
 * ```typescript
 * // This selector will return the same reference if properties are equal
 * const selectDisplaySettings = createObjectSelector((state) => ({
 *   locale: state.locale,
 *   timezone: state.timezone,
 *   dateFormat: state.dateFormat,
 * }));
 * ```
 */
export function createObjectSelector<TState, TResult extends object>(
  selector: Selector<TState, TResult>
): Selector<TState, TResult> {
  let cache: TResult | null = null;

  return (state: TState): TResult => {
    const result = selector(state);

    // Use shallow equality for object comparison
    if (cache && shallow(cache, result)) {
      return cache;
    }

    cache = result;
    return result;
  };
}

/**
 * Create a selector that returns a stable array reference
 *
 * Use this for selectors that return arrays to prevent unnecessary re-renders.
 * Uses element-wise reference equality comparison.
 *
 * @example
 * ```typescript
 * const selectActiveItems = createArraySelector((state) =>
 *   state.items.filter(item => item.active)
 * );
 * ```
 */
export function createArraySelector<TState, TItem>(
  selector: Selector<TState, TItem[]>
): Selector<TState, TItem[]> {
  let cache: TItem[] | null = null;

  return (state: TState): TItem[] => {
    const result = selector(state);

    // Compare array length and element references
    if (
      cache &&
      cache.length === result.length &&
      cache.every((item, i) => Object.is(item, result[i]))
    ) {
      return cache;
    }

    cache = result;
    return result;
  };
}

/** Default maximum cache size for parameterized selectors */
const DEFAULT_MAX_CACHE_SIZE = 100;

/**
 * Create a parameterized selector (selector factory)
 *
 * Use this when you need selectors that depend on external parameters.
 * The returned function is memoized per parameter value with LRU eviction.
 *
 * @param factory - Factory function that creates a selector for each parameter
 * @param maxSize - Maximum cache size (default: 100). When exceeded, least recently used entries are evicted.
 *
 * @example
 * ```typescript
 * const selectItemById = createParameterizedSelector(
 *   (id: string) => (state) => state.items.find(item => item.id === id)
 * );
 *
 * // In component:
 * const item = useStore(selectItemById('123'));
 * ```
 */
export function createParameterizedSelector<TState, TParam, TResult>(
  factory: (param: TParam) => Selector<TState, TResult>,
  maxSize: number = DEFAULT_MAX_CACHE_SIZE
): (param: TParam) => Selector<TState, TResult> {
  const selectorCache = new Map<TParam, Selector<TState, TResult>>();

  return (param: TParam) => {
    if (selectorCache.has(param)) {
      // Move to end (most recently used) for LRU behavior
      const selector = selectorCache.get(param);
      selectorCache.delete(param);
      selectorCache.set(param, selector);
      return selector;
    }

    // Evict oldest entries if at capacity
    if (selectorCache.size >= maxSize) {
      const firstKey = selectorCache.keys().next().value;
      if (firstKey !== undefined) {
        selectorCache.delete(firstKey);
      }
    }

    const selector = factory(param);
    selectorCache.set(param, selector);
    return selector;
  };
}

/**
 * Create a parameterized selector with cache limit
 *
 * Same as createParameterizedSelector but with LRU cache eviction.
 * Use this when parameters can have many unique values.
 *
 * @example
 * ```typescript
 * const selectUserById = createBoundedParameterizedSelector(
 *   (id: string) => (state) => state.users[id],
 *   100 // Cache up to 100 selectors
 * );
 * ```
 */
export function createBoundedParameterizedSelector<TState, TParam, TResult>(
  factory: (param: TParam) => Selector<TState, TResult>,
  maxSize: number = 50
): (param: TParam) => Selector<TState, TResult> {
  const selectorCache = new Map<TParam, Selector<TState, TResult>>();

  return (param: TParam) => {
    if (selectorCache.has(param)) {
      // Move to end (most recently used)
      const selector = selectorCache.get(param);
      selectorCache.delete(param);
      selectorCache.set(param, selector);
      return selector;
    }

    // Evict oldest if at capacity
    if (selectorCache.size >= maxSize) {
      const firstKey = selectorCache.keys().next().value;
      if (firstKey !== undefined) {
        selectorCache.delete(firstKey);
      }
    }

    const selector = factory(param);
    selectorCache.set(param, selector);
    return selector;
  };
}

// ============================================================================
// Selector Combinators
// ============================================================================

/**
 * Combine multiple selectors into one with shallow equality
 *
 * Use this to select multiple values from state in a single hook call
 * while maintaining referential stability.
 *
 * @example
 * ```typescript
 * const selectUserProfile = combineSelectors({
 *   name: selectUserName,
 *   email: selectUserEmail,
 *   avatar: selectUserAvatar,
 * });
 *
 * // In component:
 * const { name, email, avatar } = useStore(selectUserProfile, shallow);
 * ```
 */
export function combineSelectors<TState, TResult extends Record<string, unknown>>(
  selectors: { [K in keyof TResult]: Selector<TState, TResult[K]> }
): Selector<TState, TResult> {
  const keys = Object.keys(selectors) as (keyof TResult)[];
  let cache: TResult | null = null;

  return (state: TState): TResult => {
    const result = {} as TResult;
    let hasChanged = cache === null;

    for (const key of keys) {
      result[key] = selectors[key](state);
      if (!hasChanged && !Object.is(result[key], cache![key])) {
        hasChanged = true;
      }
    }

    if (!hasChanged) {
      return cache!;
    }

    cache = result;
    return result;
  };
}

/**
 * Create a selector that picks specific keys from state
 *
 * @example
 * ```typescript
 * const selectUIState = pickSelector<StoreState>()('sidebarOpen', 'activeModal');
 * ```
 */
export function pickSelector<TState>() {
  return <K extends keyof TState>(...keys: K[]): Selector<TState, Pick<TState, K>> => {
    return createObjectSelector((state) => {
      const result = {} as Pick<TState, K>;
      for (const key of keys) {
        result[key] = state[key];
      }
      return result;
    });
  };
}

/**
 * Create a selector that omits specific keys from state
 *
 * @example
 * ```typescript
 * const selectPublicState = omitSelector<StoreState>()('_internal', 'password');
 * ```
 */
export function omitSelector<TState extends object>() {
  return <K extends keyof TState>(...keys: K[]): Selector<TState, Omit<TState, K>> => {
    return createObjectSelector((state) => {
      const result = { ...state };
      for (const key of keys) {
        delete result[key];
      }
      return result as Omit<TState, K>;
    });
  };
}

// ============================================================================
// Utility Selectors
// ============================================================================

/**
 * Selector utility functions
 */
export const selectorUtils = {
  /**
   * Identity selector (passthrough)
   */
  identity: <T>(value: T): T => value,

  /**
   * Create a selector with default value
   *
   * @example
   * ```typescript
   * const selectUserOrDefault = selectorUtils.withDefault(
   *   (state) => state.user,
   *   { name: 'Guest', email: '' }
   * );
   * ```
   */
  withDefault: <TState, T>(
    selector: Selector<TState, T | undefined | null>,
    defaultValue: T
  ): Selector<TState, T> => {
    return (state) => selector(state) ?? defaultValue;
  },

  /**
   * Create a boolean selector from a predicate
   *
   * @example
   * ```typescript
   * const selectHasItems = selectorUtils.predicate(
   *   (state) => state.items,
   *   (items) => items.length > 0
   * );
   * ```
   */
  predicate: <TState, T>(
    selector: Selector<TState, T>,
    predicate: (value: T) => boolean
  ): Selector<TState, boolean> => {
    return (state) => predicate(selector(state));
  },

  /**
   * Create a mapped selector
   *
   * @example
   * ```typescript
   * const selectItemIds = selectorUtils.map(
   *   (state) => state.items,
   *   (items) => items.map(item => item.id)
   * );
   * ```
   */
  map: <TState, TInput, TOutput>(
    selector: Selector<TState, TInput>,
    transform: (value: TInput) => TOutput
  ): Selector<TState, TOutput> => {
    let lastInput: TInput | undefined;
    let lastOutput: TOutput | undefined;

    return (state) => {
      const input = selector(state);
      if (Object.is(input, lastInput) && lastOutput !== undefined) {
        return lastOutput;
      }
      lastInput = input;
      lastOutput = transform(input);
      return lastOutput;
    };
  },

  /**
   * Create a filtered selector
   *
   * @example
   * ```typescript
   * const selectActiveItems = selectorUtils.filter(
   *   (state) => state.items,
   *   (item) => item.active
   * );
   * ```
   */
  filter: <TState, T>(
    selector: Selector<TState, T[]>,
    predicate: (item: T) => boolean
  ): Selector<TState, T[]> => {
    return createArraySelector((state) => selector(state).filter(predicate));
  },

  /**
   * Create a find selector
   *
   * @example
   * ```typescript
   * const selectFirstActiveItem = selectorUtils.find(
   *   (state) => state.items,
   *   (item) => item.active
   * );
   * ```
   */
  find: <TState, T>(
    selector: Selector<TState, T[]>,
    predicate: (item: T) => boolean
  ): Selector<TState, T | undefined> => {
    let lastArray: T[] | undefined;
    let lastResult: T | undefined;

    return (state) => {
      const array = selector(state);
      if (array === lastArray) {
        return lastResult;
      }
      lastArray = array;
      lastResult = array.find(predicate);
      return lastResult;
    };
  },
};
