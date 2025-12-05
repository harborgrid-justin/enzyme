/**
 * @fileoverview Middleware types and utilities for state management
 * @module @missionfabric-js/enzyme-typescript/state/middleware
 *
 * Provides comprehensive middleware utilities for state management:
 * - Type-safe middleware creation and composition
 * - Built-in middleware (logger, persist, thunk, etc.)
 * - Async action handling
 * - Error handling and recovery
 * - Performance monitoring
 *
 * @example
 * ```typescript
 * // Create store with middleware
 * const store = createStore(
 *   rootReducer,
 *   applyMiddleware(
 *     logger,
 *     thunk,
 *     createPersistMiddleware({ key: 'app-state' })
 *   )
 * );
 *
 * // Custom middleware
 * const crashReporter = createMiddleware((api) => (next) => (action) => {
 *   try {
 *     return next(action);
 *   } catch (error) {
 *     reportError(error);
 *     throw error;
 *   }
 * });
 * ```
 */

import type { Action } from './action';
import type { Reducer } from './reducer';

/**
 * Store API available to middleware
 */
export interface MiddlewareAPI<S = unknown> {
  getState: () => S;
  dispatch: Dispatch;
}

/**
 * Dispatch function type
 */
export type Dispatch<A = Action<string, unknown>> = (action: A) => A;

/**
 * Middleware function type
 */
export type Middleware<S = unknown> = (
  api: MiddlewareAPI<S>
) => (next: Dispatch) => (action: unknown) => unknown;

/**
 * Thunk action type
 */
export type ThunkAction<R, S, E = unknown> = (
  dispatch: Dispatch,
  getState: () => S,
  extraArgument: E
) => R;

/**
 * Store enhancer type
 */
export type StoreEnhancer<S = unknown> = (
  createStore: StoreCreator<S>
) => StoreCreator<S>;

/**
 * Store creator type
 */
export type StoreCreator<S = unknown> = (
  reducer: Reducer<S>,
  initialState?: S
) => Store<S>;

/**
 * Store interface
 */
export interface Store<S = unknown> {
  getState: () => S;
  dispatch: Dispatch;
  subscribe: (listener: () => void) => () => void;
  replaceReducer: (reducer: Reducer<S>) => void;
}

/**
 * Create a type-safe middleware
 *
 * @template S - State type
 * @param middlewareFn - Middleware function
 * @returns Typed middleware
 *
 * @example
 * ```typescript
 * const loggerMiddleware = createMiddleware<RootState>((api) => (next) => (action) => {
 *   console.log('Dispatching:', action);
 *   const result = next(action);
 *   console.log('Next state:', api.getState());
 *   return result;
 * });
 * ```
 */
export function createMiddleware<S = unknown>(
  middlewareFn: Middleware<S>
): Middleware<S> {
  return middlewareFn;
}

/**
 * Logger middleware options
 */
export interface LoggerOptions {
  collapsed?: boolean;
  colors?: {
    title?: string;
    prevState?: string;
    action?: string;
    nextState?: string;
    error?: string;
  };
  level?: 'log' | 'info' | 'warn' | 'error';
  diff?: boolean;
  predicate?: (getState: () => unknown, action: Action<string, unknown>) => boolean;
}

/**
 * Create a logger middleware for debugging
 *
 * @param options - Logger configuration
 * @returns Logger middleware
 *
 * @example
 * ```typescript
 * const logger = createLogger({
 *   collapsed: true,
 *   diff: true,
 *   predicate: (getState, action) => action.type !== 'NOISE_ACTION'
 * });
 * ```
 */
export function createLogger<S = unknown>(
  options: LoggerOptions = {}
): Middleware<S> {
  const {
    collapsed = true,
    colors = {
      title: '#000000',
      prevState: '#9E9E9E',
      action: '#03A9F4',
      nextState: '#4CAF50',
      error: '#F20404',
    },
    level = 'log',
    diff = false,
    predicate,
  } = options;

  return (api) => (next) => (action) => {
    if (predicate && !predicate(api.getState, action as Action<string, unknown>)) {
      return next(action);
    }

    const prevState = api.getState();
    const formattedAction = action as Action<string, unknown>;

    const startTime = Date.now();
    const result = next(action);
    const endTime = Date.now();
    const took = endTime - startTime;

    const nextState = api.getState();

    const groupMethod = collapsed ? 'groupCollapsed' : 'group';

    try {
      if (console[groupMethod]) {
        console[groupMethod](
          `%c action %c${formattedAction.type} %c@ ${new Date().toLocaleTimeString()} (took ${took}ms)`,
          `color: gray; font-weight: lighter;`,
          `color: ${colors.title}; font-weight: bold;`,
          `color: gray; font-weight: lighter;`
        );
      }

      console[level]('%c prev state', `color: ${colors.prevState}; font-weight: bold;`, prevState);
      console[level]('%c action', `color: ${colors.action}; font-weight: bold;`, formattedAction);
      console[level]('%c next state', `color: ${colors.nextState}; font-weight: bold;`, nextState);

      if (diff && prevState !== nextState) {
        console[level]('%c diff', 'color: #E040FB; font-weight: bold;', {
          prev: prevState,
          next: nextState,
        });
      }

      if (console.groupEnd) {
        console.groupEnd();
      }
    } catch (e) {
      console.error('Logger middleware error:', e);
    }

    return result;
  };
}

/**
 * Thunk middleware for async actions
 *
 * @example
 * ```typescript
 * const fetchUser = (id: string): ThunkAction<Promise<void>, RootState, unknown> => {
 *   return async (dispatch, getState) => {
 *     dispatch(fetchUserPending(id));
 *     try {
 *       const user = await api.getUser(id);
 *       dispatch(fetchUserFulfilled(user));
 *     } catch (error) {
 *       dispatch(fetchUserRejected(error));
 *     }
 *   };
 * };
 *
 * dispatch(fetchUser('123'));
 * ```
 */
export const thunk: Middleware = (api) => (next) => (action) => {
  if (typeof action === 'function') {
    return action(api.dispatch, api.getState, undefined);
  }
  return next(action);
};

/**
 * Create a thunk middleware with extra argument
 *
 * @template E - Extra argument type
 * @param extraArgument - Extra argument to pass to thunks
 * @returns Thunk middleware
 *
 * @example
 * ```typescript
 * const api = { getUser, createUser };
 * const thunkWithApi = createThunkMiddleware(api);
 *
 * const fetchUser = (id: string): ThunkAction<Promise<void>, RootState, typeof api> => {
 *   return async (dispatch, getState, api) => {
 *     const user = await api.getUser(id);
 *     dispatch(setUser(user));
 *   };
 * };
 * ```
 */
export function createThunkMiddleware<E = unknown>(
  extraArgument: E
): Middleware {
  return (api) => (next) => (action) => {
    if (typeof action === 'function') {
      return action(api.dispatch, api.getState, extraArgument);
    }
    return next(action);
  };
}

/**
 * Error handling middleware options
 */
export interface ErrorHandlerOptions {
  onError?: (error: Error, action: Action<string, unknown>) => void;
  shouldCatch?: (action: Action<string, unknown>) => boolean;
}

/**
 * Create an error handling middleware
 *
 * @param options - Error handler configuration
 * @returns Error handling middleware
 *
 * @example
 * ```typescript
 * const errorHandler = createErrorHandler({
 *   onError: (error, action) => {
 *     console.error('Action error:', action.type, error);
 *     reportError(error);
 *   },
 *   shouldCatch: (action) => !action.type.startsWith('@@')
 * });
 * ```
 */
export function createErrorHandler<S = unknown>(
  options: ErrorHandlerOptions = {}
): Middleware<S> {
  const { onError, shouldCatch = () => true } = options;

  return (api) => (next) => (action) => {
    const formattedAction = action as Action<string, unknown>;

    if (!shouldCatch(formattedAction)) {
      return next(action);
    }

    try {
      return next(action);
    } catch (error) {
      if (onError) {
        onError(error as Error, formattedAction);
      }
      throw error;
    }
  };
}

/**
 * Performance monitoring middleware options
 */
export interface PerformanceOptions {
  threshold?: number;
  onSlow?: (action: Action<string, unknown>, duration: number) => void;
}

/**
 * Create a performance monitoring middleware
 *
 * @param options - Performance monitoring configuration
 * @returns Performance middleware
 *
 * @example
 * ```typescript
 * const performance = createPerformanceMiddleware({
 *   threshold: 16, // Warn if action takes more than 16ms
 *   onSlow: (action, duration) => {
 *     console.warn(`Slow action: ${action.type} took ${duration}ms`);
 *   }
 * });
 * ```
 */
export function createPerformanceMiddleware<S = unknown>(
  options: PerformanceOptions = {}
): Middleware<S> {
  const { threshold = 16, onSlow } = options;

  return (api) => (next) => (action) => {
    const startTime = performance.now();
    const result = next(action);
    const endTime = performance.now();
    const duration = endTime - startTime;

    if (duration > threshold && onSlow) {
      onSlow(action as Action<string, unknown>, duration);
    }

    return result;
  };
}

/**
 * Action buffer middleware for batching
 *
 * @param delay - Delay in milliseconds before flushing buffer
 * @returns Buffer middleware
 *
 * @example
 * ```typescript
 * const buffer = createBufferMiddleware(100);
 * // Actions within 100ms will be batched together
 * ```
 */
export function createBufferMiddleware<S = unknown>(
  delay: number = 50
): Middleware<S> {
  let buffer: Action<string, unknown>[] = [];
  let timeoutId: NodeJS.Timeout | null = null;

  return (api) => (next) => (action) => {
    const formattedAction = action as Action<string, unknown>;

    if (formattedAction.type === '@@buffer/flush') {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      const actions = [...buffer];
      buffer = [];
      actions.forEach((a) => next(a));
      return formattedAction;
    }

    buffer.push(formattedAction);

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      const actions = [...buffer];
      buffer = [];
      timeoutId = null;
      next({ type: '@@batch', payload: actions });
    }, delay);

    return formattedAction;
  };
}

/**
 * Create a middleware that only processes specific actions
 *
 * @param predicate - Function to test if action should be processed
 * @param middleware - Middleware to conditionally apply
 * @returns Conditional middleware
 *
 * @example
 * ```typescript
 * const conditionalLogger = createConditionalMiddleware(
 *   (action) => !action.type.startsWith('@@'),
 *   logger
 * );
 * ```
 */
export function createConditionalMiddleware<S = unknown>(
  predicate: (action: Action<string, unknown>) => boolean,
  middleware: Middleware<S>
): Middleware<S> {
  return (api) => {
    const middlewareChain = middleware(api);
    return (next) => {
      const conditionalNext = middlewareChain(next);
      return (action) => {
        const formattedAction = action as Action<string, unknown>;
        if (predicate(formattedAction)) {
          return conditionalNext(action);
        }
        return next(action);
      };
    };
  };
}

/**
 * Compose multiple middleware into a single middleware
 *
 * @param middlewares - Array of middleware to compose
 * @returns Composed middleware
 *
 * @example
 * ```typescript
 * const composed = composeMiddleware([
 *   logger,
 *   thunk,
 *   errorHandler
 * ]);
 * ```
 */
export function composeMiddleware<S = unknown>(
  middlewares: Middleware<S>[]
): Middleware<S> {
  return (api) => {
    const chains = middlewares.map((middleware) => middleware(api));
    return (next) => {
      return chains.reduceRight((composed, chain) => {
        return chain(composed);
      }, next);
    };
  };
}

/**
 * Apply middleware to a store
 *
 * @param middlewares - Middleware to apply
 * @returns Store enhancer
 *
 * @example
 * ```typescript
 * const enhancer = applyMiddleware(logger, thunk, errorHandler);
 * const store = createStore(reducer, enhancer);
 * ```
 */
export function applyMiddleware<S = unknown>(
  ...middlewares: Middleware<S>[]
): StoreEnhancer<S> {
  return (createStore: StoreCreator<S>) => {
    return (reducer: Reducer<S>, initialState?: S): Store<S> => {
      const store = createStore(reducer, initialState);
      let dispatch: Dispatch = () => {
        throw new Error('Dispatching while constructing middleware is not allowed');
      };

      const middlewareAPI: MiddlewareAPI<S> = {
        getState: store.getState,
        dispatch: (action) => dispatch(action),
      };

      const chain = middlewares.map((middleware) => middleware(middlewareAPI));
      dispatch = chain.reduceRight((composed, middleware) => {
        return middleware(composed);
      }, store.dispatch);

      return {
        ...store,
        dispatch,
      };
    };
  };
}

/**
 * Create a middleware that delays actions
 *
 * @param delay - Delay in milliseconds
 * @returns Delay middleware
 *
 * @example
 * ```typescript
 * const delayMiddleware = createDelayMiddleware(1000);
 * // All actions will be delayed by 1 second
 * ```
 */
export function createDelayMiddleware<S = unknown>(
  delay: number
): Middleware<S> {
  return (api) => (next) => (action) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(next(action));
      }, delay);
    });
  };
}

/**
 * Create a middleware for action analytics
 *
 * @param tracker - Analytics tracking function
 * @returns Analytics middleware
 *
 * @example
 * ```typescript
 * const analytics = createAnalyticsMiddleware((action, state) => {
 *   trackEvent('action', {
 *     type: action.type,
 *     timestamp: Date.now(),
 *     state: state
 *   });
 * });
 * ```
 */
export function createAnalyticsMiddleware<S = unknown>(
  tracker: (action: Action<string, unknown>, state: S) => void
): Middleware<S> {
  return (api) => (next) => (action) => {
    const result = next(action);
    const state = api.getState();
    tracker(action as Action<string, unknown>, state);
    return result;
  };
}

/**
 * Create a middleware that prevents duplicate actions
 *
 * @param options - Deduplication options
 * @returns Deduplication middleware
 *
 * @example
 * ```typescript
 * const dedupe = createDedupeMiddleware({
 *   windowMs: 1000, // Prevent duplicates within 1 second
 *   keySelector: (action) => action.type
 * });
 * ```
 */
export function createDedupeMiddleware<S = unknown>(options: {
  windowMs?: number;
  keySelector?: (action: Action<string, unknown>) => string;
} = {}): Middleware<S> {
  const { windowMs = 1000, keySelector = (action) => action.type } = options;
  const actionTimestamps = new Map<string, number>();

  return (api) => (next) => (action) => {
    const formattedAction = action as Action<string, unknown>;
    const key = keySelector(formattedAction);
    const now = Date.now();
    const lastTime = actionTimestamps.get(key);

    if (lastTime && now - lastTime < windowMs) {
      return formattedAction; // Skip duplicate
    }

    actionTimestamps.set(key, now);
    return next(action);
  };
}
