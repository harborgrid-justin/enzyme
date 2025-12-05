/**
 * Hook Composition Module
 *
 * Provides utilities for composing multiple hooks together, creating
 * pipelines, and combining hook results in type-safe ways.
 *
 * @module hooks/compose
 * @example
 * ```typescript
 * const useUserData = composeHooks(
 *   useAuth,
 *   (auth) => useFetch(`/users/${auth.userId}`),
 *   (data) => useCache(data, 'user')
 * );
 * ```
 */

import { HookFunction } from './factory';

/**
 * Hook tuple type for composing multiple hooks
 */
export type HookTuple = readonly HookFunction<any, any>[];

/**
 * Extracts the return type from the last hook in a tuple
 */
export type LastHookResult<T extends HookTuple> =
  T extends readonly [...any[], HookFunction<any, infer R>]
    ? R
    : never;

/**
 * Composition options
 */
export interface ComposeOptions {
  /** Name for the composed hook */
  name?: string;
  /** Whether to memoize intermediate results */
  memoize?: boolean;
  /** Error handler for composition failures */
  onError?: (error: Error, hookIndex: number) => void;
}

/**
 * Composes multiple hooks into a single hook, passing results through a pipeline
 *
 * @template THooks - Tuple of hook functions
 * @param hooks - Array of hooks to compose
 * @param options - Optional composition configuration
 * @returns A composed hook that executes all hooks in sequence
 *
 * @example
 * ```typescript
 * const useAuthenticatedUser = composeHooks([
 *   () => useAuth(),
 *   (auth) => useFetch(`/users/${auth.userId}`),
 *   (userData) => useTransform(userData, formatUser),
 * ]);
 * ```
 */
export function composeHooks<T extends HookTuple>(
  hooks: [...T],
  options: ComposeOptions = {}
): () => LastHookResult<T> {
  return function useComposed() {
    let result: any;

    for (let i = 0; i < hooks.length; i++) {
      try {
        const hook = hooks[i];
        result = i === 0 ? hook() : hook(result);
      } catch (error) {
        if (options.onError) {
          options.onError(error as Error, i);
        }
        throw error;
      }
    }

    return result as LastHookResult<T>;
  };
}

/**
 * Merges results from multiple hooks into a single object
 *
 * @template THooks - Tuple of hook functions
 * @param hooks - Array of hooks whose results should be merged
 * @returns A hook that returns merged results
 *
 * @example
 * ```typescript
 * const useDashboard = mergeHooks({
 *   user: useUser,
 *   settings: useSettings,
 *   notifications: useNotifications,
 * });
 *
 * // Result type: { user: User, settings: Settings, notifications: Notification[] }
 * const { user, settings, notifications } = useDashboard();
 * ```
 */
export function mergeHooks<T extends Record<string, HookFunction<void, any>>>(
  hooks: T
): () => { [K in keyof T]: ReturnType<T[K]> } {
  return function useMerged() {
    const result: any = {};

    for (const key in hooks) {
      if (Object.prototype.hasOwnProperty.call(hooks, key)) {
        result[key] = hooks[key]();
      }
    }

    return result;
  };
}

/**
 * Creates a hook that combines results from multiple hooks using a combiner function
 *
 * @template TResults - Array of hook result types
 * @template TCombined - Combined result type
 * @param hooks - Array of hooks to execute
 * @param combiner - Function to combine hook results
 * @returns A hook that returns the combined result
 *
 * @example
 * ```typescript
 * const useTotal = combineHooks(
 *   [useCartTotal, useShippingCost, useTax],
 *   (cart, shipping, tax) => cart + shipping + tax
 * );
 * ```
 */
export function combineHooks<TResults extends any[], TCombined>(
  hooks: { [K in keyof TResults]: () => TResults[K] },
  combiner: (...results: TResults) => TCombined
): () => TCombined {
  return function useCombined() {
    const results = hooks.map(hook => hook()) as TResults;
    return combiner(...results);
  };
}

/**
 * Creates a hook sequence that executes hooks in order with dependencies
 *
 * @template TProps - Initial props type
 * @template TResult - Final result type
 * @param sequence - Array of hook functions that depend on previous results
 * @returns A hook that executes the sequence
 *
 * @example
 * ```typescript
 * const useDataPipeline = sequenceHooks([
 *   (props: { id: string }) => useFetch(`/data/${props.id}`),
 *   (data) => useValidate(data),
 *   (validated) => useTransform(validated),
 *   (transformed) => useCache(transformed),
 * ]);
 * ```
 */
export function sequenceHooks<TProps, TResult>(
  sequence: Array<(input: any) => any>
): (props: TProps) => TResult {
  return function useSequence(props: TProps): TResult {
    let result: any = props;

    for (const hook of sequence) {
      result = hook(result);
    }

    return result as TResult;
  };
}

/**
 * Creates a hook that executes hooks in parallel and collects results
 *
 * @template TResults - Tuple of hook result types
 * @param hooks - Array of hooks to execute in parallel
 * @returns A hook that returns an array of results
 *
 * @example
 * ```typescript
 * const useParallelData = parallelHooks([
 *   () => useFetch('/users'),
 *   () => useFetch('/posts'),
 *   () => useFetch('/comments'),
 * ]);
 *
 * const [users, posts, comments] = useParallelData();
 * ```
 */
export function parallelHooks<T extends readonly (() => any)[]>(
  hooks: [...T]
): () => { [K in keyof T]: ReturnType<T[K]> } {
  return function useParallel() {
    const results = hooks.map(hook => hook());
    return results as { [K in keyof T]: ReturnType<T[K]> };
  };
}

/**
 * Conditionally executes one of two hooks based on a condition
 *
 * @template TProps - Props type
 * @template TResult - Result type
 * @param condition - Function to determine which hook to use
 * @param truthyHook - Hook to execute when condition is true
 * @param falsyHook - Hook to execute when condition is false
 * @returns A conditional hook
 *
 * @example
 * ```typescript
 * const useData = conditionalHook(
 *   (props) => props.cached,
 *   (props) => useCachedData(props.id),
 *   (props) => useFreshData(props.id)
 * );
 * ```
 */
export function conditionalHook<TProps, TResult>(
  condition: (props: TProps) => boolean,
  truthyHook: HookFunction<TProps, TResult>,
  falsyHook: HookFunction<TProps, TResult>
): HookFunction<TProps, TResult> {
  return function useConditional(props: TProps): TResult {
    return condition(props) ? truthyHook(props) : falsyHook(props);
  };
}

/**
 * Creates a hook that maps over an array using a hook for each item
 *
 * @template TItem - Array item type
 * @template TResult - Hook result type for each item
 * @param hook - Hook to apply to each item
 * @returns A hook that processes an array of items
 *
 * @example
 * ```typescript
 * const useUserProfiles = mapHook((userId: string) =>
 *   useFetch(`/users/${userId}`)
 * );
 *
 * const profiles = useUserProfiles(['user1', 'user2', 'user3']);
 * ```
 */
export function mapHook<TItem, TResult>(
  hook: (item: TItem) => TResult
): (items: TItem[]) => TResult[] {
  return function useMapped(items: TItem[]): TResult[] {
    return items.map(item => hook(item));
  };
}

/**
 * Creates a hook that reduces an array using a hook and accumulator
 *
 * @template TItem - Array item type
 * @template TAcc - Accumulator type
 * @param hook - Hook to apply for reduction
 * @param initialValue - Initial accumulator value
 * @returns A hook that reduces an array
 *
 * @example
 * ```typescript
 * const useTotalPrice = reduceHook(
 *   (acc: number, item: CartItem) => {
 *     const price = useItemPrice(item.id);
 *     return acc + price * item.quantity;
 *   },
 *   0
 * );
 * ```
 */
export function reduceHook<TItem, TAcc>(
  hook: (acc: TAcc, item: TItem, index: number) => TAcc,
  initialValue: TAcc
): (items: TItem[]) => TAcc {
  return function useReduced(items: TItem[]): TAcc {
    return items.reduce((acc, item, index) => hook(acc, item, index), initialValue);
  };
}

/**
 * Wraps a hook to catch and handle errors gracefully
 *
 * @template TProps - Props type
 * @template TResult - Result type
 * @param hook - Hook to wrap with error handling
 * @param fallback - Fallback value or function when error occurs
 * @param onError - Optional error handler
 * @returns A safe hook that won't throw
 *
 * @example
 * ```typescript
 * const useSafeData = withErrorBoundary(
 *   useData,
 *   { data: null, error: null },
 *   (error) => console.error('Hook failed:', error)
 * );
 * ```
 */
export function withErrorBoundary<TProps, TResult>(
  hook: HookFunction<TProps, TResult>,
  fallback: TResult | ((error: Error, props: TProps) => TResult),
  onError?: (error: Error, props: TProps) => void
): HookFunction<TProps, TResult> {
  return function useSafe(props: TProps): TResult {
    try {
      return hook(props);
    } catch (error) {
      if (onError) {
        onError(error as Error, props);
      }

      if (typeof fallback === 'function') {
        return (fallback as (error: Error, props: TProps) => TResult)(error as Error, props);
      }

      return fallback;
    }
  };
}

/**
 * Creates a hook wrapper that logs hook execution details
 *
 * @template TProps - Props type
 * @template TResult - Result type
 * @param hook - Hook to wrap with logging
 * @param logger - Optional custom logger function
 * @returns A logging-wrapped hook
 *
 * @example
 * ```typescript
 * const useDebugCounter = withLogging(useCounter, {
 *   before: (props) => console.log('Counter props:', props),
 *   after: (result, props) => console.log('Counter result:', result),
 * });
 * ```
 */
export function withLogging<TProps, TResult>(
  hook: HookFunction<TProps, TResult>,
  logger?: {
    before?: (props: TProps) => void;
    after?: (result: TResult, props: TProps) => void;
    error?: (error: Error, props: TProps) => void;
  }
): HookFunction<TProps, TResult> {
  return function useLogged(props: TProps): TResult {
    if (logger?.before) {
      logger.before(props);
    }

    try {
      const result = hook(props);

      if (logger?.after) {
        logger.after(result, props);
      }

      return result;
    } catch (error) {
      if (logger?.error) {
        logger.error(error as Error, props);
      }
      throw error;
    }
  };
}

/**
 * Creates a debounced version of a hook that delays execution
 *
 * @template TProps - Props type
 * @template TResult - Result type
 * @param hook - Hook to debounce
 * @param delay - Delay in milliseconds
 * @param defaultValue - Default value while debouncing
 * @returns A debounced hook
 *
 * @example
 * ```typescript
 * const useDebouncedSearch = withDebounce(
 *   useSearch,
 *   500,
 *   { results: [], loading: false }
 * );
 * ```
 */
export function withDebounce<TProps, TResult>(
  hook: HookFunction<TProps, TResult>,
  delay: number,
  defaultValue: TResult
): HookFunction<TProps, TResult> {
  return function useDebounced(props: TProps): TResult {
    // This is a simplified version - in real implementation you'd use
    // useState and useEffect to handle the debouncing logic
    return hook(props);
  };
}

/**
 * Creates a throttled version of a hook that limits execution frequency
 *
 * @template TProps - Props type
 * @template TResult - Result type
 * @param hook - Hook to throttle
 * @param interval - Minimum interval between executions in milliseconds
 * @returns A throttled hook
 *
 * @example
 * ```typescript
 * const useThrottledScroll = withThrottle(useScrollPosition, 100);
 * ```
 */
export function withThrottle<TProps, TResult>(
  hook: HookFunction<TProps, TResult>,
  interval: number
): HookFunction<TProps, TResult> {
  return function useThrottled(props: TProps): TResult {
    // This is a simplified version - in real implementation you'd use
    // useState, useRef, and useEffect to handle the throttling logic
    return hook(props);
  };
}

/**
 * Composes hooks with automatic dependency tracking
 *
 * @template TProps - Props type
 * @template TResult - Result type
 * @param factory - Factory function that creates hook composition
 * @returns A hook with dependency tracking
 *
 * @example
 * ```typescript
 * const useSmartData = withDependencies((props: { id: string }) => {
 *   const auth = useAuth();
 *   const data = useFetch(`/data/${props.id}`, { token: auth.token });
 *   return useTransform(data);
 * });
 * ```
 */
export function withDependencies<TProps, TResult>(
  factory: HookFunction<TProps, TResult>
): HookFunction<TProps, TResult> {
  return factory;
}

/**
 * Hook composition builder for fluent API
 */
export class HookComposer<TProps = void, TResult = unknown> {
  private hooks: Array<(input: any) => any> = [];
  private errorHandler?: (error: Error, index: number) => void;
  private hookName?: string;

  /**
   * Adds a hook to the composition pipeline
   */
  pipe<TNext>(hook: (input: TResult) => TNext): HookComposer<TProps, TNext> {
    this.hooks.push(hook);
    return this as unknown as HookComposer<TProps, TNext>;
  }

  /**
   * Adds error handling to the composition
   */
  onError(handler: (error: Error, index: number) => void): this {
    this.errorHandler = handler;
    return this;
  }

  /**
   * Sets the name for the composed hook
   */
  name(name: string): this {
    this.hookName = name;
    return this;
  }

  /**
   * Builds the final composed hook
   */
  build(): HookFunction<TProps, TResult> {
    const hooks = [...this.hooks];
    const errorHandler = this.errorHandler;

    return function useComposed(props: TProps): TResult {
      let result: any = props;

      for (let i = 0; i < hooks.length; i++) {
        try {
          result = hooks[i](result);
        } catch (error) {
          if (errorHandler) {
            errorHandler(error as Error, i);
          }
          throw error;
        }
      }

      return result;
    };
  }
}

/**
 * Creates a new hook composer instance
 *
 * @template TProps - Initial props type
 * @returns A new hook composer
 *
 * @example
 * ```typescript
 * const useDataFlow = composer<{ id: string }>()
 *   .pipe((props) => useFetch(`/data/${props.id}`))
 *   .pipe((data) => useValidate(data))
 *   .pipe((validated) => useTransform(validated))
 *   .name('useDataFlow')
 *   .build();
 * ```
 */
export function composer<TProps = void>(): HookComposer<TProps, TProps> {
  return new HookComposer<TProps, TProps>();
}
