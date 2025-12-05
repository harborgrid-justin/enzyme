/**
 * Hook Factory Module
 *
 * Provides utilities for creating typed custom React hooks with automatic
 * type inference and consistent patterns.
 *
 * @module hooks/factory
 * @example
 * ```typescript
 * const useCounter = createHook(() => {
 *   const [count, setCount] = useState(0);
 *   return { count, increment: () => setCount(c => c + 1) };
 * });
 * ```
 */

import { DependencyList, EffectCallback } from 'react';

/**
 * Hook function type that accepts props and returns a result
 *
 * @template TProps - The props type for the hook
 * @template TResult - The return type of the hook
 */
export type HookFunction<TProps = void, TResult = unknown> =
  TProps extends void
    ? () => TResult
    : (props: TProps) => TResult;

/**
 * Hook configuration options
 */
export interface HookConfig {
  /** Hook name for debugging */
  name?: string;
  /** Whether to memoize the hook result */
  memoize?: boolean;
  /** Development mode validations */
  validate?: boolean;
}

/**
 * Hook factory result type
 */
export type HookFactoryResult<TProps, TResult> = {
  /** The created hook function */
  hook: HookFunction<TProps, TResult>;
  /** Hook metadata */
  meta: {
    name: string;
    config: HookConfig;
  };
};

/**
 * Creates a typed custom hook with metadata and optional configuration
 *
 * @template TProps - The props type for the hook
 * @template TResult - The return type of the hook
 * @param fn - The hook implementation function
 * @param config - Optional hook configuration
 * @returns A hook factory result with the hook and metadata
 *
 * @example
 * ```typescript
 * // Simple hook without props
 * const useToggle = createHook(() => {
 *   const [value, setValue] = useState(false);
 *   const toggle = () => setValue(v => !v);
 *   return { value, toggle };
 * }, { name: 'useToggle' });
 *
 * // Hook with props
 * interface CounterProps {
 *   initial?: number;
 *   step?: number;
 * }
 *
 * const useCounter = createHook<CounterProps, {
 *   count: number;
 *   increment: () => void;
 *   decrement: () => void;
 * }>((props) => {
 *   const [count, setCount] = useState(props.initial ?? 0);
 *   const step = props.step ?? 1;
 *
 *   return {
 *     count,
 *     increment: () => setCount(c => c + step),
 *     decrement: () => setCount(c => c - step),
 *   };
 * }, { name: 'useCounter', validate: true });
 * ```
 */
export function createHook<TProps = void, TResult = unknown>(
  fn: HookFunction<TProps, TResult>,
  config: HookConfig = {}
): HookFactoryResult<TProps, TResult> {
  const hookName = config.name || fn.name || 'useCustomHook';

  const hook: HookFunction<TProps, TResult> = ((...args: unknown[]) => {
    if (config.validate && process.env.NODE_ENV !== 'production') {
      validateHookCall(hookName);
    }

    return (fn as (...args: unknown[]) => TResult)(...args);
  }) as HookFunction<TProps, TResult>;

  // Add display name for debugging
  Object.defineProperty(hook, 'name', {
    value: hookName,
    writable: false,
  });

  return {
    hook,
    meta: {
      name: hookName,
      config,
    },
  };
}

/**
 * Creates a hook that accepts parameters and returns a typed result
 *
 * @template TParams - Parameter types as a tuple
 * @template TResult - The return type of the hook
 * @param fn - The hook implementation function
 * @param config - Optional hook configuration
 * @returns The parameterized hook function
 *
 * @example
 * ```typescript
 * const useFetch = createParameterizedHook<[string, RequestInit?], {
 *   data: any;
 *   loading: boolean;
 *   error: Error | null;
 * }>((url, init) => {
 *   const [data, setData] = useState(null);
 *   const [loading, setLoading] = useState(true);
 *   const [error, setError] = useState(null);
 *
 *   useEffect(() => {
 *     fetch(url, init)
 *       .then(res => res.json())
 *       .then(setData)
 *       .catch(setError)
 *       .finally(() => setLoading(false));
 *   }, [url, init]);
 *
 *   return { data, loading, error };
 * });
 * ```
 */
export function createParameterizedHook<
  TParams extends unknown[] = [],
  TResult = unknown
>(
  fn: (...params: TParams) => TResult,
  config: HookConfig = {}
): (...params: TParams) => TResult {
  const hookName = config.name || fn.name || 'useParameterizedHook';

  const hook = (...params: TParams): TResult => {
    if (config.validate && process.env.NODE_ENV !== 'production') {
      validateHookCall(hookName);
    }

    return fn(...params);
  };

  Object.defineProperty(hook, 'name', {
    value: hookName,
    writable: false,
  });

  return hook;
}

/**
 * Creates a hook with initialization logic that runs once
 *
 * @template TResult - The return type of the hook
 * @param initializer - Function that runs once on mount
 * @param config - Optional hook configuration
 * @returns The initialized hook function
 *
 * @example
 * ```typescript
 * const useWebSocket = createInitializedHook((url: string) => {
 *   const ws = useRef<WebSocket | null>(null);
 *   const [status, setStatus] = useState<'connecting' | 'open' | 'closed'>('connecting');
 *
 *   useEffect(() => {
 *     ws.current = new WebSocket(url);
 *     ws.current.onopen = () => setStatus('open');
 *     ws.current.onclose = () => setStatus('closed');
 *
 *     return () => ws.current?.close();
 *   }, [url]);
 *
 *   return { ws: ws.current, status };
 * });
 * ```
 */
export function createInitializedHook<TProps = void, TResult = unknown>(
  initializer: HookFunction<TProps, TResult>,
  config: HookConfig = {}
): HookFunction<TProps, TResult> {
  return createHook(initializer, {
    ...config,
    name: config.name || 'useInitialized',
  }).hook;
}

/**
 * Hook builder for creating hooks with fluent API
 */
export class HookBuilder<TProps = void, TResult = unknown> {
  private hookFn?: HookFunction<TProps, TResult>;
  private config: HookConfig = {};

  /**
   * Sets the hook implementation
   */
  implementation(fn: HookFunction<TProps, TResult>): this {
    this.hookFn = fn;
    return this;
  }

  /**
   * Sets the hook name
   */
  name(name: string): this {
    this.config.name = name;
    return this;
  }

  /**
   * Enables memoization
   */
  memoized(): this {
    this.config.memoize = true;
    return this;
  }

  /**
   * Enables validation
   */
  validated(): this {
    this.config.validate = true;
    return this;
  }

  /**
   * Builds the final hook
   */
  build(): HookFactoryResult<TProps, TResult> {
    if (!this.hookFn) {
      throw new Error('Hook implementation is required');
    }

    return createHook(this.hookFn, this.config);
  }
}

/**
 * Creates a hook builder instance
 *
 * @template TProps - The props type for the hook
 * @template TResult - The return type of the hook
 * @returns A new hook builder instance
 *
 * @example
 * ```typescript
 * const useTimer = hookBuilder<{ interval: number }, number>()
 *   .name('useTimer')
 *   .validated()
 *   .implementation(({ interval }) => {
 *     const [time, setTime] = useState(0);
 *
 *     useEffect(() => {
 *       const id = setInterval(() => setTime(t => t + 1), interval);
 *       return () => clearInterval(id);
 *     }, [interval]);
 *
 *     return time;
 *   })
 *   .build();
 * ```
 */
export function hookBuilder<TProps = void, TResult = unknown>(): HookBuilder<TProps, TResult> {
  return new HookBuilder<TProps, TResult>();
}

/**
 * Validates that a hook is being called in a valid context
 *
 * @param hookName - The name of the hook being validated
 * @internal
 */
function validateHookCall(hookName: string): void {
  // Basic validation - in production you might want more sophisticated checks
  if (typeof React !== 'undefined' && React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
    const dispatcher = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current;

    if (!dispatcher) {
      console.warn(
        `${hookName}: Hook called outside of a React component context. ` +
        'Hooks can only be called inside the body of a function component.'
      );
    }
  }
}

/**
 * Type guard to check if a value is a hook function
 *
 * @param value - Value to check
 * @returns True if value is a hook function
 *
 * @example
 * ```typescript
 * const myHook = () => useState(0);
 *
 * if (isHookFunction(myHook)) {
 *   // TypeScript knows myHook is a function
 *   const result = myHook();
 * }
 * ```
 */
export function isHookFunction<TProps = unknown, TResult = unknown>(
  value: unknown
): value is HookFunction<TProps, TResult> {
  return typeof value === 'function' && value.name.startsWith('use');
}

/**
 * Creates a conditional hook that only executes when a condition is met
 *
 * @template TProps - The props type for the hook
 * @template TResult - The return type of the hook
 * @param condition - Function that determines if hook should execute
 * @param hook - The hook to conditionally execute
 * @param fallback - Optional fallback value when condition is false
 * @returns A conditional hook function
 *
 * @example
 * ```typescript
 * const useAuthenticatedData = createConditionalHook(
 *   (props) => props.isAuthenticated,
 *   (props) => useFetch(props.url),
 *   null
 * );
 * ```
 */
export function createConditionalHook<TProps, TResult>(
  condition: (props: TProps) => boolean,
  hook: HookFunction<TProps, TResult>,
  fallback?: TResult
): HookFunction<TProps, TResult | undefined> {
  return ((props: TProps) => {
    const shouldExecute = condition(props);

    if (shouldExecute) {
      return hook(props);
    }

    return fallback;
  }) as HookFunction<TProps, TResult | undefined>;
}

/**
 * Wraps a hook with middleware that can modify props or result
 *
 * @template TProps - The props type for the hook
 * @template TResult - The return type of the hook
 * @param hook - The hook to wrap
 * @param middleware - Middleware configuration
 * @returns A wrapped hook function
 *
 * @example
 * ```typescript
 * const useLoggingCounter = withHookMiddleware(useCounter, {
 *   before: (props) => {
 *     console.log('Counter props:', props);
 *     return props;
 *   },
 *   after: (result) => {
 *     console.log('Counter result:', result);
 *     return result;
 *   },
 * });
 * ```
 */
export function withHookMiddleware<TProps, TResult>(
  hook: HookFunction<TProps, TResult>,
  middleware: {
    before?: (props: TProps) => TProps;
    after?: (result: TResult, props: TProps) => TResult;
  }
): HookFunction<TProps, TResult> {
  return ((props: TProps) => {
    const processedProps = middleware.before ? middleware.before(props) : props;
    const result = hook(processedProps);
    return middleware.after ? middleware.after(result, processedProps) : result;
  }) as HookFunction<TProps, TResult>;
}
