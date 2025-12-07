/**
 * @fileoverview Memoized selector utilities with dependency tracking
 * @module @missionfabric-js/enzyme-typescript/state/selector
 *
 * Provides powerful selector utilities for efficient state derivation:
 * - Memoized selectors with automatic recomputation
 * - Dependency tracking and optimization
 * - Parametric selectors with argument support
 * - Selector composition and reuse
 * - Performance monitoring and debugging
 *
 * @example
 * ```typescript
 * // Basic selector
 * const selectUsers = (state: RootState) => state.users;
 *
 * // Memoized selector
 * const selectActiveUsers = createSelector(
 *   [selectUsers],
 *   (users) => users.filter(u => u.active)
 * );
 *
 * // Parametric selector
 * const selectUserById = createParametricSelector(
 *   [(state: RootState) => state.users, (_: RootState, id: string) => id],
 *   (users, id) => users.find(u => u.id === id)
 * );
 * ```
 */

/**
 * Selector function type
 */
export type Selector<S, R> = (state: S) => R;

/**
 * Parametric selector type
 */
export type ParametricSelector<S, P extends unknown[], R> = (
  state: S,
  ...params: P
) => R;

/**
 * Output selector function
 */
export type OutputSelector<Input extends unknown[], Result> = (
  ...input: Input
) => Result;

/**
 * Memoized selector with additional methods
 */
export interface MemoizedSelector<S, R> extends Selector<S, R> {
  recomputations: () => number;
  resetRecomputations: () => void;
  clearCache: () => void;
  dependencies: Selector<S, unknown>[];
}

/**
 * Equality check function
 */
export type EqualityFn<T = unknown> = (a: T, b: T) => boolean;

/**
 * Default equality check (reference equality)
 */
export const defaultEqualityCheck: EqualityFn = (a, b) => a === b;

/**
 * Shallow equality check for objects and arrays
 */
export function shallowEqual<T = unknown>(a: T, b: T): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (a === null || b === null) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  return keysA.every((key) => {
    return (a as Record<string, unknown>)[key] === (b as Record<string, unknown>)[key];
  });
}

/**
 * Deep equality check
 */
export function deepEqual<T = unknown>(a: T, b: T): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (a === null || b === null) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  return keysA.every((key) => {
    const valueA = (a as Record<string, unknown>)[key];
    const valueB = (b as Record<string, unknown>)[key];

    if (typeof valueA === 'object' && typeof valueB === 'object') {
      return deepEqual(valueA, valueB);
    }

    return valueA === valueB;
  });
}

/**
 * Create a memoized selector
 *
 * @template S - State type
 * @template R - Result type
 * @param dependencies - Input selectors
 * @param combiner - Function to compute result from inputs
 * @param options - Memoization options
 * @returns Memoized selector
 *
 * @example
 * ```typescript
 * const selectTotalPrice = createSelector(
 *   [(state: RootState) => state.cart.items],
 *   (items) => items.reduce((sum, item) => sum + item.price, 0)
 * );
 *
 * // With custom equality
 * const selectUserNames = createSelector(
 *   [(state: RootState) => state.users],
 *   (users) => users.map(u => u.name),
 *   { equalityCheck: shallowEqual }
 * );
 * ```
 */
export function createSelector<S, R, Deps extends Selector<S, unknown>[]>(
  dependencies: [...Deps],
  combiner: (...args: { [K in keyof Deps]: ReturnType<Deps[K]> }) => R,
  options: {
    equalityCheck?: EqualityFn;
    maxCacheSize?: number;
  } = {}
): MemoizedSelector<S, R> {
  const { equalityCheck = defaultEqualityCheck, maxCacheSize = 1 } = options;

  let lastArgs: unknown[] | null = null;
  let lastResult: R | undefined = undefined;
  let recomputationCount = 0;

  const memoizedSelector = ((state: S): R => {
    const currentArgs = dependencies.map((dep) => dep(state));

    // Check if we can return cached result
    if (
      lastArgs !== null &&
      currentArgs.length === lastArgs.length &&
      currentArgs.every((arg, index) => equalityCheck(arg, lastArgs![index]))
    ) {
      return lastResult!;
    }

    // Recompute
    recomputationCount++;
    lastArgs = currentArgs;
    lastResult = combiner(...(currentArgs as { [K in keyof Deps]: ReturnType<Deps[K]> }));

    return lastResult;
  }) as MemoizedSelector<S, R>;

  memoizedSelector.recomputations = () => recomputationCount;
  memoizedSelector.resetRecomputations = () => {
    recomputationCount = 0;
  };
  memoizedSelector.clearCache = () => {
    lastArgs = null;
    lastResult = undefined;
  };
  memoizedSelector.dependencies = dependencies;

  return memoizedSelector;
}

/**
 * Create a parametric selector that accepts additional arguments
 *
 * @template S - State type
 * @template P - Parameters type
 * @template R - Result type
 * @param dependencies - Input selectors (can use params)
 * @param combiner - Function to compute result
 * @returns Parametric selector
 *
 * @example
 * ```typescript
 * const selectUserById = createParametricSelector(
 *   [
 *     (state: RootState) => state.users,
 *     (_: RootState, userId: string) => userId
 *   ],
 *   (users, userId) => users.find(u => u.id === userId)
 * );
 *
 * const user = selectUserById(state, '123');
 * ```
 */
export function createParametricSelector<
  S,
  P extends unknown[],
  R,
  Deps extends ParametricSelector<S, P, unknown>[]
>(
  dependencies: [...Deps],
  combiner: (...args: { [K in keyof Deps]: ReturnType<Deps[K]> }) => R
): ParametricSelector<S, P, R> {
  const cache = new Map<string, R>();

  return (state: S, ...params: P): R => {
    const cacheKey = JSON.stringify(params);

    if (cache.has(cacheKey)) {
      const currentArgs = dependencies.map((dep) => dep(state, ...params));
      const cachedArgs = cache.get(cacheKey);

      // Simple equality check - could be enhanced
      if (JSON.stringify(currentArgs) === JSON.stringify(cachedArgs)) {
        return cache.get(cacheKey)!;
      }
    }

    const args = dependencies.map((dep) => dep(state, ...params));
    const result = combiner(...(args as { [K in keyof Deps]: ReturnType<Deps[K]> }));

    cache.set(cacheKey, result);
    return result;
  };
}

/**
 * Create a selector factory for parametric selectors
 *
 * @template S - State type
 * @template P - Parameters type
 * @template R - Result type
 * @param createSelectorFn - Function that creates selector for given params
 * @returns Selector factory
 *
 * @example
 * ```typescript
 * const makeSelectUserPosts = createSelectorFactory((userId: string) =>
 *   createSelector(
 *     [(state: RootState) => state.posts],
 *     (posts) => posts.filter(p => p.userId === userId)
 *   )
 * );
 *
 * const selectUser1Posts = makeSelectUserPosts('user1');
 * const selectUser2Posts = makeSelectUserPosts('user2');
 * ```
 */
export function createSelectorFactory<S, P extends unknown[], R>(
  createSelectorFn: (...params: P) => Selector<S, R>
): (...params: P) => Selector<S, R> {
  const cache = new Map<string, Selector<S, R>>();

  return (...params: P): Selector<S, R> => {
    const key = JSON.stringify(params);

    if (!cache.has(key)) {
      cache.set(key, createSelectorFn(...params));
    }

    return cache.get(key)!;
  };
}

/**
 * Create a structured selector from object of selectors
 *
 * @template S - State type
 * @template R - Result shape
 * @param selectors - Object mapping keys to selectors
 * @returns Selector that returns object with same shape
 *
 * @example
 * ```typescript
 * const selectUserData = createStructuredSelector({
 *   user: (state: RootState) => state.currentUser,
 *   posts: (state: RootState) => state.posts,
 *   comments: (state: RootState) => state.comments
 * });
 *
 * const data = selectUserData(state);
 * // { user: User, posts: Post[], comments: Comment[] }
 * ```
 */
export function createStructuredSelector<
  S,
  R extends Record<string, unknown>
>(selectors: { [K in keyof R]: Selector<S, R[K]> }): Selector<S, R> {
  const keys = Object.keys(selectors) as (keyof R)[];

  return createSelector(
    keys.map((key) => selectors[key]) as Selector<S, unknown>[],
    (...values) => {
      return keys.reduce((result, key, index) => {
        result[key] = values[index] as R[keyof R];
        return result;
      }, {} as R);
    }
  );
}

/**
 * Create a selector that chains multiple selectors
 *
 * @param selectors - Array of selectors to chain
 * @returns Chained selector
 *
 * @example
 * ```typescript
 * const selectUserName = chainSelectors(
 *   (state: RootState) => state.currentUserId,
 *   (userId: string) => (state: RootState) => state.users[userId],
 *   (user: User) => user.name
 * );
 * ```
 */
export function chainSelectors<S, R>(
  ...selectors: Selector<unknown, unknown>[]
): Selector<S, R> {
  return (state: S): R => {
    return selectors.reduce((result, selector) => {
      return selector(result);
    }, state as unknown) as R;
  };
}

/**
 * Options for selector performance tracking
 */
export interface SelectorPerformanceOptions {
  name?: string;
  threshold?: number;
  onSlow?: (name: string, duration: number, recomputations: number) => void;
}

/**
 * Wrap a selector with performance tracking
 *
 * @template S - State type
 * @template R - Result type
 * @param selector - Selector to track
 * @param options - Performance options
 * @returns Wrapped selector with tracking
 *
 * @example
 * ```typescript
 * const selectExpensiveData = withPerformanceTracking(
 *   createSelector(
 *     [(state) => state.data],
 *     (data) => expensiveComputation(data)
 *   ),
 *   {
 *     name: 'selectExpensiveData',
 *     threshold: 5,
 *     onSlow: (name, duration) => {
 *       console.warn(`Slow selector ${name}: ${duration}ms`);
 *     }
 *   }
 * );
 * ```
 */
export function withPerformanceTracking<S, R>(
  selector: MemoizedSelector<S, R>,
  options: SelectorPerformanceOptions = {}
): MemoizedSelector<S, R> {
  const { name = 'unnamed', threshold = 10, onSlow } = options;

  const trackedSelector = ((state: S): R => {
    const startTime = performance.now();
    const result = selector(state);
    const endTime = performance.now();
    const duration = endTime - startTime;

    if (duration > threshold && onSlow) {
      onSlow(name, duration, selector.recomputations());
    }

    return result;
  }) as MemoizedSelector<S, R>;

  trackedSelector.recomputations = selector.recomputations;
  trackedSelector.resetRecomputations = selector.resetRecomputations;
  trackedSelector.clearCache = selector.clearCache;
  trackedSelector.dependencies = selector.dependencies;

  return trackedSelector;
}

/**
 * Create a selector that only recomputes when specific paths change
 *
 * @template S - State type
 * @template R - Result type
 * @param pathSelector - Function to select the path to watch
 * @param resultSelector - Function to compute result
 * @param equalityCheck - Custom equality check
 * @returns Memoized selector
 *
 * @example
 * ```typescript
 * const selectUserAge = createPathSelector(
 *   (state: RootState) => state.users[state.currentUserId],
 *   (user) => user.age,
 *   shallowEqual
 * );
 * ```
 */
export function createPathSelector<S, T, R>(
  pathSelector: Selector<S, T>,
  resultSelector: (value: T) => R,
  equalityCheck: EqualityFn<T> = defaultEqualityCheck
): MemoizedSelector<S, R> {
  return createSelector([pathSelector], resultSelector, { equalityCheck });
}

/**
 * Create a weak memoized selector (caches only last result)
 *
 * @template S - State type
 * @template R - Result type
 * @param selector - Selector function to memoize
 * @returns Weakly memoized selector
 *
 * @example
 * ```typescript
 * const selectFilteredItems = weakMemoize((state: RootState) => {
 *   return state.items.filter(item => item.active);
 * });
 * ```
 */
export function weakMemoize<S, R>(
  selector: Selector<S, R>
): MemoizedSelector<S, R> {
  let lastState: S | undefined;
  let lastResult: R | undefined;
  let recomputations = 0;

  const memoized = ((state: S): R => {
    if (state === lastState) {
      return lastResult!;
    }

    recomputations++;
    lastState = state;
    lastResult = selector(state);
    return lastResult;
  }) as MemoizedSelector<S, R>;

  memoized.recomputations = () => recomputations;
  memoized.resetRecomputations = () => {
    recomputations = 0;
  };
  memoized.clearCache = () => {
    lastState = undefined;
    lastResult = undefined;
  };
  memoized.dependencies = [];

  return memoized;
}

/**
 * Create a selector with LRU cache
 *
 * @template S - State type
 * @template R - Result type
 * @param selector - Selector function
 * @param cacheSize - Maximum cache size
 * @returns LRU cached selector
 *
 * @example
 * ```typescript
 * const selectUser = createLRUSelector(
 *   (state: RootState, id: string) => state.users[id],
 *   100 // Cache up to 100 users
 * );
 * ```
 */
export function createLRUSelector<S, P extends unknown[], R>(
  selector: ParametricSelector<S, P, R>,
  cacheSize: number = 10
): ParametricSelector<S, P, R> {
  const cache = new Map<string, { value: R; timestamp: number }>();

  return (state: S, ...params: P): R => {
    const key = JSON.stringify([state, ...params]);

    if (cache.has(key)) {
      const entry = cache.get(key)!;
      // Move to end (most recently used)
      cache.delete(key);
      cache.set(key, entry);
      return entry.value;
    }

    const result = selector(state, ...params);
    cache.set(key, { value: result, timestamp: Date.now() });

    // Remove oldest entry if cache is full
    if (cache.size > cacheSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    return result;
  };
}

/**
 * Create a debounced selector
 *
 * @template S - State type
 * @template R - Result type
 * @param selector - Selector to debounce
 * @param delay - Debounce delay in milliseconds
 * @returns Debounced selector
 *
 * @example
 * ```typescript
 * const selectSearchResults = createDebouncedSelector(
 *   (state: RootState) => expensiveSearch(state.searchQuery),
 *   300
 * );
 * ```
 */
export function createDebouncedSelector<S, R>(
  selector: Selector<S, R>,
  delay: number
): Selector<S, Promise<R>> {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastResult: R | undefined;

  return (state: S): Promise<R> => {
    return new Promise((resolve) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        lastResult = selector(state);
        resolve(lastResult);
      }, delay);
    });
  };
}
