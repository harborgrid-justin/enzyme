/**
 * Memoization Hook Utilities Module
 *
 * Provides utilities for memoizing values, callbacks, and complex computations
 * with cache control and performance optimization features.
 *
 * @module hooks/memo
 * @example
 * ```typescript
 * const memoizedValue = useMemoWithCache(
 *   () => expensiveComputation(data),
 *   [data],
 *   { maxSize: 100, ttl: 5000 }
 * );
 * ```
 */

import { DependencyList, useMemo, useCallback, useRef, useEffect } from 'react';

/**
 * Memoization cache entry
 */
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  hits: number;
}

/**
 * Memoization cache options
 */
export interface MemoOptions {
  /** Maximum cache size */
  maxSize?: number;
  /** Time-to-live in milliseconds */
  ttl?: number;
  /** Custom equality function */
  equals?: (a: any, b: any) => boolean;
  /** Cache eviction strategy */
  eviction?: 'lru' | 'lfu' | 'fifo';
}

/**
 * Memoization statistics
 */
export interface MemoStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

/**
 * Creates a memoized value with cache control
 *
 * @template T - Value type
 * @param factory - Factory function to create the value
 * @param deps - Dependency array
 * @param options - Memoization options
 * @returns Memoized value
 *
 * @example
 * ```typescript
 * const filteredData = useMemoWithCache(
 *   () => data.filter(item => item.active),
 *   [data],
 *   { maxSize: 10, ttl: 60000 }
 * );
 * ```
 */
export function useMemoWithCache<T>(
  factory: () => T,
  deps: DependencyList,
  options: MemoOptions = {}
): T {
  const cache = useRef<Map<string, CacheEntry<T>>>(new Map());
  const { maxSize = 100, ttl } = options;

  return useMemo(() => {
    const key = JSON.stringify(deps);
    const cached = cache.current.get(key);

    // Check if cached value is still valid
    if (cached) {
      const isExpired = ttl && Date.now() - cached.timestamp > ttl;

      if (!isExpired) {
        cached.hits++;
        return cached.value;
      }
    }

    // Compute new value
    const value = factory();

    // Add to cache
    cache.current.set(key, {
      value,
      timestamp: Date.now(),
      hits: 0,
    });

    // Evict if cache is too large
    if (cache.current.size > maxSize) {
      const firstKey = cache.current.keys().next().value;
      cache.current.delete(firstKey);
    }

    return value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Creates a memoized callback with cache and statistics
 *
 * @template T - Callback function type
 * @param callback - Callback function to memoize
 * @param deps - Dependency array
 * @returns Memoized callback
 *
 * @example
 * ```typescript
 * const handleClick = useMemoizedCallback(
 *   (id: string) => {
 *     console.log('Clicked:', id);
 *   },
 *   [dependency]
 * );
 * ```
 */
export function useMemoizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: DependencyList
): T {
  return useCallback(callback, deps);
}

/**
 * Creates a memoized value with deep comparison
 *
 * @template T - Value type
 * @param factory - Factory function to create the value
 * @param deps - Dependency array
 * @returns Memoized value with deep comparison
 *
 * @example
 * ```typescript
 * const config = useDeepMemo(
 *   () => ({ settings, preferences }),
 *   [settings, preferences]
 * );
 * ```
 */
export function useDeepMemo<T>(
  factory: () => T,
  deps: DependencyList
): T {
  const ref = useRef<{ deps: DependencyList; value: T }>();

  if (!ref.current || !deepEqual(ref.current.deps, deps)) {
    ref.current = {
      deps,
      value: factory(),
    };
  }

  return ref.current.value;
}

/**
 * Creates a memoized value that only updates when comparator returns true
 *
 * @template T - Value type
 * @param value - Value to memoize
 * @param comparator - Function to determine if value should update
 * @returns Memoized value
 *
 * @example
 * ```typescript
 * const stableUser = useCustomMemo(
 *   user,
 *   (prev, next) => prev?.id !== next?.id
 * );
 * ```
 */
export function useCustomMemo<T>(
  value: T,
  comparator: (prev: T | undefined, next: T) => boolean
): T {
  const ref = useRef<T>();

  if (ref.current === undefined || comparator(ref.current, value)) {
    ref.current = value;
  }

  return ref.current;
}

/**
 * Creates a lazy-initialized memoized value
 *
 * @template T - Value type
 * @param initializer - Function to initialize the value
 * @returns Lazily initialized value
 *
 * @example
 * ```typescript
 * const expensiveValue = useLazyMemo(() => {
 *   return computeExpensiveValue();
 * });
 * ```
 */
export function useLazyMemo<T>(initializer: () => T): T {
  const ref = useRef<T | null>(null);
  const initialized = useRef(false);

  if (!initialized.current) {
    ref.current = initializer();
    initialized.current = true;
  }

  return ref.current as T;
}

/**
 * Creates a memoized selector with input and result memoization
 *
 * @template TInput - Input type
 * @template TOutput - Output type
 * @param selector - Selector function
 * @param input - Input value
 * @param options - Memoization options
 * @returns Memoized selector result
 *
 * @example
 * ```typescript
 * const selectedItems = useMemoSelector(
 *   (items) => items.filter(item => item.selected),
 *   allItems
 * );
 * ```
 */
export function useMemoSelector<TInput, TOutput>(
  selector: (input: TInput) => TOutput,
  input: TInput,
  options: MemoOptions = {}
): TOutput {
  const { equals = Object.is } = options;
  const prevInput = useRef<TInput>();
  const prevOutput = useRef<TOutput>();

  if (prevInput.current === undefined || !equals(prevInput.current, input)) {
    prevInput.current = input;
    prevOutput.current = selector(input);
  }

  return prevOutput.current as TOutput;
}

/**
 * Creates a memoized factory function
 *
 * @template TArgs - Argument types
 * @template TResult - Result type
 * @param factory - Factory function
 * @param deps - Dependency array
 * @returns Memoized factory
 *
 * @example
 * ```typescript
 * const createHandler = useMemoFactory(
 *   (id: string) => () => handleClick(id),
 *   [handleClick]
 * );
 *
 * const handler = createHandler('item-1');
 * ```
 */
export function useMemoFactory<TArgs extends any[], TResult>(
  factory: (...args: TArgs) => TResult,
  deps: DependencyList
): (...args: TArgs) => TResult {
  const cache = useRef<Map<string, TResult>>(new Map());

  return useCallback(
    (...args: TArgs): TResult => {
      const key = JSON.stringify(args);
      const cached = cache.current.get(key);

      if (cached !== undefined) {
        return cached;
      }

      const result = factory(...args);
      cache.current.set(key, result);
      return result;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps
  );
}

/**
 * Creates a memoized async function with result caching
 *
 * @template TArgs - Argument types
 * @template TResult - Result type
 * @param asyncFn - Async function to memoize
 * @param deps - Dependency array
 * @param options - Memoization options
 * @returns Memoized async function
 *
 * @example
 * ```typescript
 * const fetchUser = useMemoAsync(
 *   async (userId: string) => {
 *     const response = await fetch(`/api/users/${userId}`);
 *     return response.json();
 *   },
 *   [],
 *   { ttl: 60000 }
 * );
 * ```
 */
export function useMemoAsync<TArgs extends any[], TResult>(
  asyncFn: (...args: TArgs) => Promise<TResult>,
  deps: DependencyList,
  options: MemoOptions = {}
): (...args: TArgs) => Promise<TResult> {
  const cache = useRef<Map<string, CacheEntry<Promise<TResult>>>>(new Map());
  const { maxSize = 100, ttl } = options;

  return useCallback(
    async (...args: TArgs): Promise<TResult> => {
      const key = JSON.stringify(args);
      const cached = cache.current.get(key);

      if (cached) {
        const isExpired = ttl && Date.now() - cached.timestamp > ttl;

        if (!isExpired) {
          cached.hits++;
          return cached.value;
        }
      }

      const promise = asyncFn(...args);

      cache.current.set(key, {
        value: promise,
        timestamp: Date.now(),
        hits: 0,
      });

      // Evict if cache is too large
      if (cache.current.size > maxSize) {
        const firstKey = cache.current.keys().next().value;
        cache.current.delete(firstKey);
      }

      return promise;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps
  );
}

/**
 * Creates a ref-based memoization for expensive computations
 *
 * @template T - Value type
 * @param compute - Computation function
 * @param deps - Dependency array
 * @returns Computed value
 *
 * @example
 * ```typescript
 * const sortedData = useRefMemo(
 *   () => data.sort((a, b) => a.value - b.value),
 *   [data]
 * );
 * ```
 */
export function useRefMemo<T>(
  compute: () => T,
  deps: DependencyList
): T {
  const ref = useRef<{ deps: DependencyList; value: T }>();

  if (!ref.current || !shallowEqual(ref.current.deps, deps)) {
    ref.current = {
      deps,
      value: compute(),
    };
  }

  return ref.current.value;
}

/**
 * Memoization cache manager
 */
export class MemoCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private stats = { hits: 0, misses: 0 };

  constructor(private options: MemoOptions = {}) {}

  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    const isExpired =
      this.options.ttl && Date.now() - entry.timestamp > this.options.ttl;

    if (isExpired) {
      this.cache.delete(key);
      this.stats.misses++;
      return undefined;
    }

    entry.hits++;
    this.stats.hits++;
    return entry.value;
  }

  set(key: string, value: T): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      hits: 0,
    });

    this.evict();
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const isExpired =
      this.options.ttl && Date.now() - entry.timestamp > this.options.ttl;

    if (isExpired) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  getStats(): MemoStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  private evict(): void {
    const maxSize = this.options.maxSize || 100;

    if (this.cache.size <= maxSize) return;

    const evictionStrategy = this.options.eviction || 'lru';

    switch (evictionStrategy) {
      case 'lru':
        this.evictLRU();
        break;
      case 'lfu':
        this.evictLFU();
        break;
      case 'fifo':
        this.evictFIFO();
        break;
    }
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private evictLFU(): void {
    let leastUsedKey: string | null = null;
    let leastHits = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.hits < leastHits) {
        leastHits = entry.hits;
        leastUsedKey = key;
      }
    }

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
    }
  }

  private evictFIFO(): void {
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.cache.delete(firstKey);
    }
  }
}

/**
 * Creates a managed memoization cache
 *
 * @template T - Cache value type
 * @param options - Cache options
 * @returns Cache instance
 *
 * @example
 * ```typescript
 * const cache = useMemoCache<User>({ maxSize: 50, ttl: 30000 });
 *
 * const user = cache.get(userId) || fetchUser(userId);
 * cache.set(userId, user);
 * ```
 */
export function useMemoCache<T>(options: MemoOptions = {}): MemoCache<T> {
  const cache = useRef<MemoCache<T>>();

  if (!cache.current) {
    cache.current = new MemoCache<T>(options);
  }

  return cache.current;
}

/**
 * Creates a throttled memoized value
 *
 * @template T - Value type
 * @param value - Value to throttle
 * @param interval - Throttle interval in milliseconds
 * @returns Throttled value
 *
 * @example
 * ```typescript
 * const throttledScrollY = useThrottledMemo(scrollY, 100);
 * ```
 */
export function useThrottledMemo<T>(value: T, interval: number): T {
  const lastUpdate = useRef(Date.now());
  const throttled = useRef(value);

  const now = Date.now();
  if (now - lastUpdate.current >= interval) {
    throttled.current = value;
    lastUpdate.current = now;
  }

  return throttled.current;
}

/**
 * Creates a debounced memoized value
 *
 * @template T - Value type
 * @param value - Value to debounce
 * @param delay - Debounce delay in milliseconds
 * @returns Debounced value
 *
 * @example
 * ```typescript
 * const debouncedSearch = useDebouncedMemo(searchQuery, 500);
 * ```
 */
export function useDebouncedMemo<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Deep equality comparison helper
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, idx) => deepEqual(val, b[idx]));
  }

  if (typeof a === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) => deepEqual(a[key], b[key]));
  }

  return false;
}

/**
 * Shallow equality comparison helper
 */
function shallowEqual(a: any[], b: any[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((val, idx) => Object.is(val, b[idx]));
}

// Helper import for useState
import * as React from 'react';
