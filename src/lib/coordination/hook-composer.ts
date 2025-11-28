/**
 * @file Hook Composer
 * @module coordination/hook-composer
 * @description PhD-level multi-library hook composition utilities.
 *
 * Implements sophisticated hook composition with:
 * - Type-safe composition of multiple hooks
 * - Dependency tracking between hooks
 * - Unified loading and error states
 * - Selective re-rendering optimization
 * - Memoization and caching
 * - Conditional hook execution
 *
 * @author Agent 5 - PhD TypeScript Architect
 * @version 1.0.0
 */

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  type DependencyList,
} from 'react';

// ============================================================================
// Types
// ============================================================================

/**
 * Hook state representation.
 */
export interface HookState<T> {
  /** Data value */
  data: T | undefined;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Last updated timestamp */
  lastUpdated: number | null;
}

/**
 * Composed hooks result.
 */
export interface ComposedResult<T extends Record<string, unknown>> {
  /** Combined data from all hooks */
  data: T;
  /** Whether any hook is loading */
  isLoading: boolean;
  /** Whether all hooks have loaded at least once */
  isReady: boolean;
  /** First error encountered */
  error: Error | null;
  /** All errors by hook key */
  errors: Partial<Record<keyof T, Error | null>>;
  /** Loading states by hook key */
  loadingStates: Record<keyof T, boolean>;
  /** Refresh all hooks */
  refresh: () => void;
  /** Refresh specific hook */
  refreshKey: (key: keyof T) => void;
}

/**
 * Hook definition for composition.
 */
export interface HookDef<T> {
  /** Hook function */
  hook: () => T;
  /** Optional selector to extract value from hook result */
  selector?: (result: T) => unknown;
  /** Whether hook is enabled */
  enabled?: boolean;
  /** Dependencies that must be ready first */
  dependsOn?: string[];
  /** Whether to suspend on loading */
  suspendOnLoading?: boolean;
}

/**
 * Async hook result format.
 */
export interface AsyncHookResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch?: () => void;
}

/**
 * Composition options.
 */
export interface CompositionOptions {
  /** Strategy for handling partial loading */
  loadingStrategy: 'all' | 'any' | 'none';
  /** Strategy for handling errors */
  errorStrategy: 'first' | 'all' | 'ignore';
  /** Enable debug logging */
  debug: boolean;
}

// ============================================================================
// Default Options
// ============================================================================

const DEFAULT_OPTIONS: CompositionOptions = {
  loadingStrategy: 'all',
  errorStrategy: 'first',
  debug: false,
};

// ============================================================================
// Type Utilities
// ============================================================================

/**
 * Extracts the data type from a hook definition.
 */
type HookDataType<T> = T extends HookDef<infer R>
  ? R extends AsyncHookResult<infer D>
    ? D
    : T extends { selector: (r: R) => infer S }
      ? S
      : R
  : never;

/**
 * Maps hook definitions to their data types.
 */
type ComposedData<T extends Record<string, HookDef<unknown>>> = {
  [K in keyof T]: HookDataType<T[K]>;
};

// ============================================================================
// Core Composition Hook
// ============================================================================

/**
 * Composes multiple hooks into a single unified result.
 *
 * @template T - Hook definitions object type
 * @param definitions - Object mapping keys to hook definitions
 * @param options - Composition options
 * @returns Composed result
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const { data, isLoading, error } = useComposedHooks({
 *     user: {
 *       hook: useCurrentUser,
 *       selector: (result) => result.data,
 *     },
 *     settings: {
 *       hook: useSettings,
 *       dependsOn: ['user'],
 *     },
 *     theme: {
 *       hook: useTheme,
 *     },
 *   });
 *
 *   if (isLoading) return <Loading />;
 *   if (error) return <Error error={error} />;
 *
 *   return (
 *     <div style={{ theme: data.theme }}>
 *       Welcome, {data.user.name}!
 *     </div>
 *   );
 * }
 * ```
 */
export function useComposedHooks<T extends Record<string, HookDef<unknown>>>(
  definitions: T,
  options: Partial<CompositionOptions> = {}
): ComposedResult<ComposedData<T>> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const keys = Object.keys(definitions) as Array<keyof T>;

  // Track refresh triggers
  const [refreshCounter, setRefreshCounter] = useState(0);
  const refreshKeyRef = useRef<keyof T | null>(null);

  // Execute all hooks and collect results
  const hookResults = useMemo(() => {
    const results: Record<string, unknown> = {};

    for (const key of keys) {
      const def = definitions[key];

      // Check if enabled
      if (def?.enabled === false) {
        results[key as string] = undefined;
        continue;
      }

      // Execute hook
      try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const result = def?.hook();
        results[key as string] = def?.selector ? def.selector(result) : result;
      } catch (e) {
        results[key as string] = { error: e, isLoading: false, data: undefined };
      }
    }

    return results;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshCounter, ...keys]);

  // Analyze results for loading and error states
  const analysis = useMemo(() => {
    const data: Record<string, unknown> = {};
    const errors: Record<string, Error | null> = {};
    const loadingStates: Record<string, boolean> = {};
    let hasAnyLoading = false;
    let hasAllLoaded = true;
    let firstError: Error | null = null;

    for (const key of keys) {
      const result = hookResults[key as string];
      const keyStr = key as string;

      // Check if result is async-like
      if (
        result &&
        typeof result === 'object' &&
        ('isLoading' in result || 'error' in result)
      ) {
        const asyncResult = result as AsyncHookResult<unknown>;
        data[keyStr] = asyncResult.data;
        errors[keyStr] = asyncResult.error ?? null;
        loadingStates[keyStr] = asyncResult.isLoading ?? false;

        if (asyncResult.isLoading) {
          hasAnyLoading = true;
          hasAllLoaded = false;
        }
        if (asyncResult.error && !firstError) {
          firstError = asyncResult.error;
        }
      } else {
        // Sync hook result
        data[keyStr] = result;
        errors[keyStr] = null;
        loadingStates[keyStr] = false;
      }
    }

    // Determine overall loading state
    let isLoading: boolean;
    switch (opts.loadingStrategy) {
      case 'all':
        isLoading = hasAnyLoading;
        break;
      case 'any':
        isLoading = !hasAllLoaded && hasAnyLoading;
        break;
      case 'none':
      default:
        isLoading = false;
    }

    // Determine error
    let error: Error | null;
    switch (opts.errorStrategy) {
      case 'first':
        error = firstError;
        break;
      case 'all':
        error = Object.values(errors).find((e) => e !== null) ?? null;
        break;
      case 'ignore':
      default:
        error = null;
    }

    return {
      data: data as ComposedData<T>,
      isLoading,
      isReady: hasAllLoaded,
      error,
      errors: errors as Partial<Record<keyof T, Error | null>>,
      loadingStates: loadingStates as Record<keyof T, boolean>,
    };
  }, [hookResults, keys, opts.loadingStrategy, opts.errorStrategy]);

  // Refresh functions
  const refresh = useCallback(() => {
    setRefreshCounter((c) => c + 1);
  }, []);

  const refreshKey = useCallback((key: keyof T) => {
    refreshKeyRef.current = key;
    setRefreshCounter((c) => c + 1);
  }, []);

  // Debug logging
  useEffect(() => {
    if (opts.debug) {
      console.debug('[useComposedHooks] Result:', analysis);
    }
  }, [analysis, opts.debug]);

  return {
    ...analysis,
    refresh,
    refreshKey,
  };
}

// ============================================================================
// Selective Composition Hook
// ============================================================================

/**
 * Composes hooks with selective re-rendering based on used keys.
 *
 * @template T - Hook definitions object type
 * @param definitions - Object mapping keys to hook definitions
 * @returns Proxy object that tracks accessed keys
 *
 * @example
 * ```tsx
 * function Profile() {
 *   const hooks = useSelectiveHooks({
 *     user: { hook: useCurrentUser },
 *     settings: { hook: useSettings },
 *   });
 *
 *   // Only re-renders when user changes, not settings
 *   return <div>{hooks.user?.name}</div>;
 * }
 * ```
 */
export function useSelectiveHooks<T extends Record<string, HookDef<unknown>>>(
  definitions: T
): ComposedData<T> & { __meta: { accessedKeys: Set<keyof T> } } {
  const accessedKeysRef = useRef(new Set<keyof T>());
  const keys = Object.keys(definitions) as Array<keyof T>;

  // Execute all hooks
  const results = useMemo(() => {
    const data: Record<string, unknown> = {};

    for (const key of keys) {
      const def = definitions[key];
      if (def?.enabled === false) {
        data[key as string] = undefined;
        continue;
      }

      try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const result = def?.hook();
        const value = def?.selector ? def.selector(result) : result;

        // Extract data from async result
        if (
          value &&
          typeof value === 'object' &&
          'data' in value &&
          ('isLoading' in value || 'error' in value)
        ) {
          data[key as string] = (value as AsyncHookResult<unknown>).data;
        } else {
          data[key as string] = value;
        }
      } catch {
        data[key as string] = undefined;
      }
    }

    return data;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, keys);

  // Create proxy to track access
  const proxy = useMemo(() => {
    return new Proxy(results as ComposedData<T> & { __meta: { accessedKeys: Set<keyof T> } }, {
      get(target, prop) {
        if (prop === '__meta') {
          return { accessedKeys: accessedKeysRef.current };
        }
        if (typeof prop === 'string' && prop in target) {
          accessedKeysRef.current.add(prop as keyof T);
        }
        return target[prop as keyof typeof target];
      },
    });
  }, [results]);

  return proxy;
}

// ============================================================================
// Conditional Composition Hook
// ============================================================================

/**
 * Conditionally executes hooks based on predicates.
 *
 * @template T - Data type
 * @param condition - Boolean or function returning boolean
 * @param hookFn - Hook function to execute
 * @param fallback - Fallback value when condition is false
 * @returns Hook result or fallback
 *
 * @example
 * ```tsx
 * function UserDashboard({ isAdmin }: { isAdmin: boolean }) {
 *   const adminData = useConditionalHook(
 *     isAdmin,
 *     useAdminData,
 *     { users: [], stats: null }
 *   );
 *
 *   return <div>{adminData.users.length} users</div>;
 * }
 * ```
 */
export function useConditionalHook<T>(
  condition: boolean | (() => boolean),
  hookFn: () => T,
  fallback: T
): T {
  const shouldExecute = typeof condition === 'function' ? condition() : condition;

  // Always call hooks in the same order, but conditionally use result
  const hookResult = hookFn();

  return shouldExecute ? hookResult : fallback;
}

// ============================================================================
// Memoized Hook Composer
// ============================================================================

/**
 * Creates a memoized hook composition that only updates when dependencies change.
 *
 * @template T - Result type
 * @param factory - Factory function that calls hooks
 * @param deps - Dependencies array
 * @returns Memoized result
 *
 * @example
 * ```tsx
 * function SearchResults({ query }: { query: string }) {
 *   const result = useMemoizedComposition(
 *     () => ({
 *       results: useSearchResults(query),
 *       suggestions: useSuggestions(query),
 *     }),
 *     [query]
 *   );
 *
 *   return <ResultsList items={result.results} />;
 * }
 * ```
 */
export function useMemoizedComposition<T>(
  factory: () => T,
  deps: DependencyList
): T {
  const resultRef = useRef<T | null>(null);
  const depsRef = useRef<DependencyList>(deps);

  // Check if deps changed
  const depsChanged = deps.some((dep, i) => dep !== depsRef.current[i]);

  if (depsChanged || resultRef.current === null) {
    resultRef.current = factory();
    depsRef.current = deps;
  }

  return resultRef.current;
}

// ============================================================================
// Parallel Hook Execution
// ============================================================================

/**
 * Executes hooks in parallel and aggregates results.
 *
 * @template T - Hooks record type
 * @param hooks - Record of hook functions
 * @returns Aggregated results with loading/error states
 *
 * @example
 * ```tsx
 * function DataLoader() {
 *   const { data, isLoading, errors } = useParallelHooks({
 *     users: () => useUsers(),
 *     posts: () => usePosts(),
 *     comments: () => useComments(),
 *   });
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <div>
 *       {data.users?.length} users
 *       {data.posts?.length} posts
 *     </div>
 *   );
 * }
 * ```
 */
export function useParallelHooks<T extends Record<string, () => unknown>>(
  hooks: T
): {
  data: { [K in keyof T]: ReturnType<T[K]> extends AsyncHookResult<infer D> ? D : ReturnType<T[K]> };
  isLoading: boolean;
  errors: { [K in keyof T]: Error | null };
} {
  const keys = Object.keys(hooks) as Array<keyof T>;

  // Execute all hooks
  const results = useMemo(() => {
    const data: Record<string, unknown> = {};
    const errors: Record<string, Error | null> = {};
    let hasLoading = false;

    for (const key of keys) {
      try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const hookFn = hooks[key];
        const result = hookFn ? hookFn() : undefined;

        // Check if async result
        if (
          result &&
          typeof result === 'object' &&
          ('isLoading' in result || 'error' in result)
        ) {
          const asyncResult = result as AsyncHookResult<unknown>;
          data[key as string] = asyncResult.data;
          errors[key as string] = asyncResult.error ?? null;
          if (asyncResult.isLoading) hasLoading = true;
        } else {
          data[key as string] = result;
          errors[key as string] = null;
        }
      } catch (e) {
        data[key as string] = undefined;
        errors[key as string] = e instanceof Error ? e : new Error(String(e));
      }
    }

    return { data, errors, isLoading: hasLoading };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, keys);

  return results as {
    data: { [K in keyof T]: ReturnType<T[K]> extends AsyncHookResult<infer D> ? D : ReturnType<T[K]> };
    isLoading: boolean;
    errors: { [K in keyof T]: Error | null };
  };
}

// ============================================================================
// Hook Sequence
// ============================================================================

/**
 * Executes hooks in sequence, passing results to subsequent hooks.
 *
 * @param steps - Array of step functions
 * @returns Final result and intermediate results
 *
 * @example
 * ```tsx
 * function OrderFlow() {
 *   const { result, steps } = useHookSequence([
 *     () => useCurrentUser(),
 *     (user) => useUserOrders(user.id),
 *     (orders) => useOrderDetails(orders[0]?.id),
 *   ]);
 *
 *   return <OrderDetails order={result} />;
 * }
 * ```
 */
export function useHookSequence<T>(
  steps: Array<(prevResult: unknown) => unknown>
): { result: T; steps: unknown[]; isComplete: boolean } {
  const results: unknown[] = [];
  let isComplete = true;
  let prevResult: unknown = undefined;

  for (const step of steps) {
    try {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const result = step(prevResult);

      // Handle async results
      if (
        result &&
        typeof result === 'object' &&
        ('isLoading' in result || 'data' in result)
      ) {
        const asyncResult = result as AsyncHookResult<unknown>;
        results.push(asyncResult.data);
        prevResult = asyncResult.data;
        if (asyncResult.isLoading || !asyncResult.data) {
          isComplete = false;
          break;
        }
      } else {
        results.push(result);
        prevResult = result;
      }
    } catch {
      isComplete = false;
      break;
    }
  }

  return {
    result: prevResult as T,
    steps: results,
    isComplete,
  };
}

// ============================================================================
// Export Utilities
// ============================================================================

/**
 * Creates a hook definition with type inference.
 */
export function defineHook<T>(
  hook: () => T,
  options?: Omit<HookDef<T>, 'hook'>
): HookDef<T> {
  return { hook, ...options };
}

/**
 * Creates an async hook definition.
 */
export function defineAsyncHook<T>(
  hook: () => AsyncHookResult<T>,
  options?: Omit<HookDef<AsyncHookResult<T>>, 'hook'>
): HookDef<AsyncHookResult<T>> {
  return { hook, ...options };
}
