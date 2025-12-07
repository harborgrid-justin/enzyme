/**
 * @fileoverview DevTools integration utilities
 * @module @missionfabric-js/enzyme-typescript/state/devtools
 *
 * Provides utilities for integrating with Redux DevTools:
 * - DevTools extension connection
 * - Action monitoring and time travel
 * - State inspection and debugging
 * - Custom action sanitization
 * - Performance monitoring
 *
 * @example
 * ```typescript
 * const store = createStore(
 *   rootReducer,
 *   composeWithDevTools({
 *     name: 'MyApp',
 *     trace: true,
 *     traceLimit: 25
 *   })(applyMiddleware(thunk, logger))
 * );
 *
 * // Manual DevTools integration
 * const devTools = connectDevTools({
 *   name: 'MyApp',
 *   features: { jump: true, skip: true }
 * });
 * ```
 */

import type { Action } from './action';
import type { Store, StoreEnhancer } from './store';

/**
 * DevTools extension interface
 */
export interface DevToolsExtension {
  connect(options?: DevToolsOptions): DevToolsConnection;
  disconnect(): void;
  send(action: Action<string, unknown>, state: unknown): void;
}

/**
 * DevTools connection interface
 */
export interface DevToolsConnection {
  init(state: unknown): void;
  send(action: Action<string, unknown> | string, state: unknown): void;
  subscribe(listener: (message: DevToolsMessage) => void): () => void;
  unsubscribe(): void;
  error(message: string): void;
}

/**
 * DevTools message from extension
 */
export interface DevToolsMessage {
  type: string;
  payload?: unknown;
  state?: string;
  id?: string;
}

/**
 * DevTools configuration options
 */
export interface DevToolsOptions {
  /**
   * Name of the instance shown in DevTools
   */
  name?: string;

  /**
   * Action creators to use in the Dispatcher
   */
  actionCreators?: Record<string, (...args: unknown[]) => Action<string, unknown>>;

  /**
   * Maximum allowed actions to be stored in the history tree
   */
  maxAge?: number;

  /**
   * Enable/disable all features
   */
  features?: {
    /**
     * Start/pause recording of dispatched actions
     */
    pause?: boolean;
    /**
     * Lock/unlock dispatching actions and side effects
     */
    lock?: boolean;
    /**
     * Persist states on page reload
     */
    persist?: boolean;
    /**
     * Export history of actions in a file
     */
    export?: boolean | 'custom';
    /**
     * Import history of actions from a file
     */
    import?: boolean | 'custom';
    /**
     * Jump to a specific action
     */
    jump?: boolean;
    /**
     * Skip (cancel) actions
     */
    skip?: boolean;
    /**
     * Drag and drop actions in the history list
     */
    reorder?: boolean;
    /**
     * Dispatch custom actions or action creators
     */
    dispatch?: boolean;
    /**
     * Generate tests for the selected actions
     */
    test?: boolean;
  };

  /**
   * Action/state sanitizers
   */
  actionSanitizer?: <A extends Action<string, unknown>>(action: A, id: number) => A;
  stateSanitizer?: <S>(state: S, index: number) => S;

  /**
   * Predicate function to filter actions
   */
  predicate?: <A extends Action<string, unknown>>(state: unknown, action: A) => boolean;

  /**
   * Auto sanitize state
   */
  serialize?: boolean | {
    options?: boolean | {
      undefined?: boolean;
      function?: boolean | ((fn: (...args: unknown[]) => unknown) => string);
      symbol?: boolean;
      map?: boolean;
      set?: boolean;
      date?: boolean;
      regex?: boolean;
      error?: boolean;
      nan?: boolean;
      infinity?: boolean;
    };
    replacer?: (key: string, value: unknown) => unknown;
    reviver?: (key: string, value: unknown) => unknown;
    immutable?: unknown;
    refs?: unknown[];
  };

  /**
   * Enable trace of action calls
   */
  trace?: boolean;

  /**
   * Maximum stack trace frames to be stored
   */
  traceLimit?: number;

  /**
   * Should catch errors
   */
  shouldCatchErrors?: boolean;

  /**
   * Should record changes
   */
  shouldRecordChanges?: boolean;

  /**
   * Should stringify actions
   */
  shouldStringifyActions?: boolean;

  /**
   * Should log actions to console
   */
  shouldLogActions?: boolean;
}

/**
 * Get DevTools extension instance
 *
 * @returns DevTools extension or undefined if not available
 */
export function getDevToolsExtension(): DevToolsExtension | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const globalWindow = window as typeof window & {
    __REDUX_DEVTOOLS_EXTENSION__?: DevToolsExtension;
  };

  return globalWindow.__REDUX_DEVTOOLS_EXTENSION__;
}

/**
 * Check if DevTools extension is available
 *
 * @returns True if DevTools is available
 */
export function isDevToolsAvailable(): boolean {
  return getDevToolsExtension() !== undefined;
}

/**
 * Connect to DevTools extension
 *
 * @param options - DevTools configuration options
 * @returns DevTools connection or null
 *
 * @example
 * ```typescript
 * const devTools = connectDevTools({
 *   name: 'MyApp',
 *   trace: true,
 *   features: {
 *     pause: true,
 *     jump: true,
 *     skip: true
 *   }
 * });
 *
 * if (devTools) {
 *   devTools.init(initialState);
 *   devTools.send(action, state);
 * }
 * ```
 */
export function connectDevTools(
  options: DevToolsOptions = {}
): DevToolsConnection | null {
  const extension = getDevToolsExtension();
  if (!extension) {
    return null;
  }

  return extension.connect(options);
}

/**
 * Compose store enhancers with DevTools
 *
 * @param options - DevTools options
 * @returns Composer function
 *
 * @example
 * ```typescript
 * const store = createStore(
 *   reducer,
 *   composeWithDevTools(
 *     applyMiddleware(thunk, logger)
 *   )
 * );
 * ```
 */
export function composeWithDevTools<S>(
  options?: DevToolsOptions
): <E extends StoreEnhancer<S>[]>(...enhancers: E) => StoreEnhancer<S> {
  return (...enhancers: StoreEnhancer<S>[]): StoreEnhancer<S> => {
    if (enhancers.length === 0) {
      return (createStore) => createStore;
    }

    if (!isDevToolsAvailable()) {
      // Fallback to regular composition if DevTools is not available
      return enhancers.reduce(
        (a, b) => (createStore) => a(b(createStore))
      );
    }

    const extension = getDevToolsExtension()!;
    const devToolsEnhancer = (createStore: (reducer: unknown, preloadedState?: unknown) => Store<S>) => {
      return (reducer: unknown, preloadedState?: unknown): Store<S> => {
        const store = createStore(reducer, preloadedState);
        const devTools = extension.connect(options);

        devTools.init(store.getState());

        const originalDispatch = store.dispatch;
        store.dispatch = ((action: Action<string, unknown>) => {
          const result = originalDispatch(action);
          devTools.send(action, store.getState());
          return result;
        }) as typeof store.dispatch;

        return store;
      };
    };

    return [...enhancers, devToolsEnhancer].reduce(
      (a, b) => (createStore) => a(b(createStore))
    );
  };
}

/**
 * Create a DevTools enhancer
 *
 * @param options - DevTools options
 * @returns DevTools enhancer
 *
 * @example
 * ```typescript
 * const enhancer = devToolsEnhancer({
 *   name: 'MyApp',
 *   trace: true
 * });
 *
 * const store = createStore(reducer, enhancer);
 * ```
 */
export function devToolsEnhancer<S>(
  options: DevToolsOptions = {}
): StoreEnhancer<S> {
  if (!isDevToolsAvailable()) {
    return (createStore) => createStore;
  }

  const extension = getDevToolsExtension()!;

  return (createStore) => (reducer, preloadedState) => {
    const store = createStore(reducer, preloadedState);
    const devTools = extension.connect(options);

    devTools.init(store.getState());

    // Subscribe to DevTools messages
    devTools.subscribe((message: DevToolsMessage) => {
      if (message.type === 'DISPATCH' && message.state) {
        const state = JSON.parse(message.state);
        // Handle time travel
        store.replaceReducer(() => state);
      }
    });

    const originalDispatch = store.dispatch;
    store.dispatch = ((action: Action<string, unknown>) => {
      const result = originalDispatch(action);
      devTools.send(action, store.getState());
      return result;
    }) as typeof store.dispatch;

    return store;
  };
}

/**
 * Create an action sanitizer to hide sensitive data
 *
 * @param sensitiveKeys - Array of keys to sanitize
 * @returns Action sanitizer function
 *
 * @example
 * ```typescript
 * const sanitizer = createActionSanitizer(['password', 'token', 'apiKey']);
 *
 * const devTools = connectDevTools({
 *   actionSanitizer: sanitizer
 * });
 * ```
 */
export function createActionSanitizer(
  sensitiveKeys: string[]
): <A extends Action<string, unknown>>(action: A, id: number) => A {
  return <A extends Action<string, unknown>>(action: A): A => {
    if (!action.payload || typeof action.payload !== 'object') {
      return action;
    }

    const sanitized = { ...action };
    const payload = { ...(action.payload as Record<string, unknown>) };

    for (const key of sensitiveKeys) {
      if (key in payload) {
        payload[key] = '<<SANITIZED>>';
      }
    }

    sanitized.payload = payload as A['payload'];
    return sanitized;
  };
}

/**
 * Create a state sanitizer to hide sensitive data
 *
 * @param paths - Array of paths to sanitize (dot notation)
 * @returns State sanitizer function
 *
 * @example
 * ```typescript
 * const sanitizer = createStateSanitizer(['user.password', 'auth.token']);
 *
 * const devTools = connectDevTools({
 *   stateSanitizer: sanitizer
 * });
 * ```
 */
export function createStateSanitizer(
  paths: string[]
): <S>(state: S, index: number) => S {
  return <S>(state: S): S => {
    if (!state || typeof state !== 'object') {
      return state;
    }

    const sanitized = JSON.parse(JSON.stringify(state));

    for (const path of paths) {
      const parts = path.split('.');
      let current = sanitized as Record<string, unknown>;

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!(part in current) || typeof current[part] !== 'object') {
          break;
        }
        current = current[part] as Record<string, unknown>;
      }

      const lastPart = parts[parts.length - 1];
      if (lastPart in current) {
        current[lastPart] = '<<SANITIZED>>';
      }
    }

    return sanitized;
  };
}

/**
 * Create an action predicate filter
 *
 * @param filter - Filter function or action type patterns
 * @returns Predicate function
 *
 * @example
 * ```typescript
 * // Filter by action type prefix
 * const predicate = createActionPredicate(['@@redux', '@@internal']);
 *
 * // Custom filter
 * const predicate = createActionPredicate(
 *   (state, action) => !action.type.startsWith('@@')
 * );
 *
 * const devTools = connectDevTools({ predicate });
 * ```
 */
export function createActionPredicate(
  filter: string[] | ((state: unknown, action: Action<string, unknown>) => boolean)
): (state: unknown, action: Action<string, unknown>) => boolean {
  if (Array.isArray(filter)) {
    return (state: unknown, action: Action<string, unknown>) => {
      return !filter.some((prefix) => action.type.startsWith(prefix));
    };
  }

  return filter;
}

/**
 * DevTools logger for debugging
 *
 * @param options - Logger options
 * @returns Logger object
 *
 * @example
 * ```typescript
 * const logger = createDevToolsLogger({
 *   collapsed: true,
 *   colors: true
 * });
 *
 * logger.logAction(action, prevState, nextState);
 * logger.logError(error);
 * ```
 */
export function createDevToolsLogger(options: {
  collapsed?: boolean;
  colors?: boolean;
} = {}) {
  const { collapsed = true, colors = true } = options;

  return {
    logAction<S>(
      action: Action<string, unknown>,
      prevState: S,
      nextState: S
    ): void {
      const groupMethod = collapsed ? 'groupCollapsed' : 'group';

      if (colors) {
        console[groupMethod](
          `%c action %c${action.type}`,
          'color: gray; font-weight: lighter;',
          'color: black; font-weight: bold;'
        );
      } else {
        console[groupMethod](`action ${action.type}`);
      }

      console.log('%c prev state', 'color: #9E9E9E; font-weight: bold;', prevState);
      console.log('%c action', 'color: #03A9F4; font-weight: bold;', action);
      console.log('%c next state', 'color: #4CAF50; font-weight: bold;', nextState);
      console.groupEnd();
    },

    logError(error: Error): void {
      console.error('%c error', 'color: #F20404; font-weight: bold;', error);
    },

    logWarning(message: string): void {
      console.warn('%c warning', 'color: #FF9800; font-weight: bold;', message);
    },

    logInfo(message: string): void {
      console.info('%c info', 'color: #2196F3; font-weight: bold;', message);
    },
  };
}

/**
 * Monitor store for DevTools integration
 *
 * @template S - State type
 * @param store - Store to monitor
 * @param options - Monitor options
 * @returns Unsubscribe function
 *
 * @example
 * ```typescript
 * const unsubscribe = monitorStore(store, {
 *   name: 'MyApp',
 *   logActions: true,
 *   logState: true
 * });
 * ```
 */
export function monitorStore<S>(
  store: Store<S>,
  options: DevToolsOptions & {
    logActions?: boolean;
    logState?: boolean;
  } = {}
): () => void {
  const { logActions = false, logState = false, ...devToolsOptions } = options;

  const devTools = connectDevTools(devToolsOptions);
  if (!devTools) {
    return () => {};
  }

  devTools.init(store.getState());

  const logger = createDevToolsLogger();
  const originalDispatch = store.dispatch;

  store.dispatch = ((action: Action<string, unknown>) => {
    const prevState = store.getState();
    const result = originalDispatch(action);
    const nextState = store.getState();

    devTools.send(action, nextState);

    if (logActions) {
      logger.logAction(action, prevState, nextState);
    }

    return result;
  }) as typeof store.dispatch;

  const unsubscribe = store.subscribe(() => {
    if (logState) {
      console.log('State updated:', store.getState());
    }
  });

  return () => {
    devTools.unsubscribe();
    unsubscribe();
  };
}

/**
 * Create a trace middleware for action debugging
 *
 * @param options - Trace options
 * @returns Trace middleware
 *
 * @example
 * ```typescript
 * const trace = createTraceMiddleware({
 *   limit: 10,
 *   include: ['user/', 'auth/']
 * });
 * ```
 */
export function createTraceMiddleware<S = unknown>(options: {
  limit?: number;
  include?: string[];
  exclude?: string[];
} = {}) {
  const { limit = 25, include = [], exclude = [] } = options;

  return (api: { getState: () => S; dispatch: (action: unknown) => unknown }) =>
    (next: (action: unknown) => unknown) =>
    (action: unknown): unknown => {
      const formattedAction = action as Action<string, unknown>;

      // Check include/exclude filters
      if (include.length > 0 && !include.some((p) => formattedAction.type.startsWith(p))) {
        return next(action);
      }

      if (exclude.length > 0 && exclude.some((p) => formattedAction.type.startsWith(p))) {
        return next(action);
      }

      // Capture stack trace
      const error = new Error();
      const stack = error.stack?.split('\n').slice(2, 2 + limit).join('\n');

      console.group(`Action: ${formattedAction.type}`);
      console.log('Payload:', formattedAction.payload);
      console.log('Stack trace:', stack);
      console.groupEnd();

      return next(action);
    };
}
