/**
 * @fileoverview Type-safe store factory with middleware support
 * @module @missionfabric-js/enzyme-typescript/state/store
 *
 * Provides utilities for creating and managing state stores:
 * - Type-safe store creation with middleware
 * - Store enhancers and composition
 * - Subscription management
 * - Hot module replacement support
 * - DevTools integration
 *
 * @example
 * ```typescript
 * const store = createStore(
 *   rootReducer,
 *   {
 *     preloadedState: initialState,
 *     enhancers: [applyMiddleware(logger, thunk)],
 *     devTools: true
 *   }
 * );
 *
 * store.dispatch(increment());
 * const state = store.getState();
 * ```
 */

import type { Reducer } from './reducer';
import type { Action } from './action';
import type { Middleware, StoreEnhancer } from './middleware';

/**
 * Listener function type
 */
export type Listener = () => void;

/**
 * Unsubscribe function type
 */
export type Unsubscribe = () => void;

/**
 * Dispatch function type
 */
export type Dispatch<A = Action<string, unknown>> = (action: A) => A;

/**
 * Store interface
 */
export interface Store<S = unknown, A extends Action<string, unknown> = Action<string, unknown>> {
  /**
   * Get the current state
   */
  getState(): S;

  /**
   * Dispatch an action
   */
  dispatch(action: A): A;

  /**
   * Subscribe to state changes
   */
  subscribe(listener: Listener): Unsubscribe;

  /**
   * Replace the current reducer
   */
  replaceReducer(nextReducer: Reducer<S, A>): void;

  /**
   * Observable interface for RxJS integration
   */
  [Symbol.observable]?: () => Observable<S>;
}

/**
 * Observable interface
 */
export interface Observable<T> {
  subscribe(observer: Observer<T>): { unsubscribe: () => void };
}

/**
 * Observer interface
 */
export interface Observer<T> {
  next?(value: T): void;
  error?(error: unknown): void;
  complete?(): void;
}

/**
 * Store configuration options
 */
export interface StoreConfig<S, A extends Action<string, unknown> = Action<string, unknown>> {
  preloadedState?: S;
  enhancers?: StoreEnhancer<S>[];
  middleware?: Middleware<S>[];
  devTools?: boolean | DevToolsOptions;
}

/**
 * DevTools configuration options
 */
export interface DevToolsOptions {
  name?: string;
  trace?: boolean;
  traceLimit?: number;
  features?: {
    pause?: boolean;
    lock?: boolean;
    persist?: boolean;
    export?: boolean;
    import?: boolean;
    jump?: boolean;
    skip?: boolean;
    reorder?: boolean;
    dispatch?: boolean;
    test?: boolean;
  };
}

/**
 * Create a Redux-style store
 *
 * @template S - State type
 * @template A - Action type
 * @param reducer - Root reducer function
 * @param config - Store configuration options
 * @returns Store instance
 *
 * @example
 * ```typescript
 * interface RootState {
 *   counter: number;
 *   users: User[];
 * }
 *
 * const store = createStore<RootState>(
 *   rootReducer,
 *   {
 *     preloadedState: { counter: 0, users: [] },
 *     middleware: [logger, thunk],
 *     devTools: { name: 'MyApp' }
 *   }
 * );
 * ```
 */
export function createStore<
  S,
  A extends Action<string, unknown> = Action<string, unknown>
>(
  reducer: Reducer<S, A>,
  config: StoreConfig<S, A> = {}
): Store<S, A> {
  const {
    preloadedState,
    enhancers = [],
    middleware = [],
    devTools = false,
  } = config;

  let currentReducer = reducer;
  let currentState = preloadedState as S;
  let currentListeners: Listener[] = [];
  let nextListeners = currentListeners;
  let isDispatching = false;

  // Initialize state
  if (currentState === undefined) {
    currentState = currentReducer(undefined, { type: '@@INIT' } as A);
  }

  /**
   * Ensure listeners array can be mutated
   */
  function ensureCanMutateNextListeners(): void {
    if (nextListeners === currentListeners) {
      nextListeners = currentListeners.slice();
    }
  }

  /**
   * Get the current state
   */
  function getState(): S {
    if (isDispatching) {
      throw new Error('Cannot read state while dispatching');
    }
    return currentState;
  }

  /**
   * Subscribe to state changes
   */
  function subscribe(listener: Listener): Unsubscribe {
    if (typeof listener !== 'function') {
      throw new Error('Listener must be a function');
    }

    if (isDispatching) {
      throw new Error('Cannot subscribe while dispatching');
    }

    let isSubscribed = true;

    ensureCanMutateNextListeners();
    nextListeners.push(listener);

    return function unsubscribe() {
      if (!isSubscribed) {
        return;
      }

      if (isDispatching) {
        throw new Error('Cannot unsubscribe while dispatching');
      }

      isSubscribed = false;

      ensureCanMutateNextListeners();
      const index = nextListeners.indexOf(listener);
      nextListeners.splice(index, 1);
      currentListeners = [];
    };
  }

  /**
   * Dispatch an action
   */
  function dispatch(action: A): A {
    if (!action || typeof action.type !== 'string') {
      throw new Error('Actions must have a type property');
    }

    if (isDispatching) {
      throw new Error('Reducers may not dispatch actions');
    }

    try {
      isDispatching = true;
      currentState = currentReducer(currentState, action);
    } finally {
      isDispatching = false;
    }

    const listeners = (currentListeners = nextListeners);
    for (let i = 0; i < listeners.length; i++) {
      const listener = listeners[i];
      listener();
    }

    return action;
  }

  /**
   * Replace the current reducer
   */
  function replaceReducer(nextReducer: Reducer<S, A>): void {
    currentReducer = nextReducer;
    dispatch({ type: '@@REPLACE' } as A);
  }

  /**
   * Observable interface for RxJS integration
   */
  function observable(): Observable<S> {
    const outerSubscribe = subscribe;

    return {
      subscribe(observer: Observer<S> | ((state: S) => void)) {
        if (typeof observer === 'function') {
          const observerObject: Observer<S> = { next: observer };
          return observable().subscribe(observerObject);
        }

        function observeState() {
          if (observer.next) {
            observer.next(getState());
          }
        }

        observeState();
        const unsubscribe = outerSubscribe(observeState);

        return { unsubscribe };
      },
    };
  }

  const store: Store<S, A> = {
    getState,
    dispatch,
    subscribe,
    replaceReducer,
    [Symbol.observable]: observable,
  };

  // Apply middleware enhancers
  if (middleware.length > 0) {
    const middlewareEnhancer = applyMiddleware(...middleware);
    enhancers.unshift(middlewareEnhancer);
  }

  // Apply all enhancers
  if (enhancers.length > 0) {
    const composedEnhancer = composeEnhancers(...enhancers);
    return composedEnhancer(
      (reducer: Reducer<S, A>, preloadedState?: S) =>
        createStore(reducer, { preloadedState }) as Store<S, A>
    )(currentReducer, currentState);
  }

  return store;
}

/**
 * Compose multiple store enhancers
 *
 * @param enhancers - Store enhancers to compose
 * @returns Composed enhancer
 *
 * @example
 * ```typescript
 * const enhancer = composeEnhancers(
 *   applyMiddleware(logger),
 *   devToolsEnhancer(),
 *   persistEnhancer()
 * );
 * ```
 */
export function composeEnhancers<S>(
  ...enhancers: StoreEnhancer<S>[]
): StoreEnhancer<S> {
  if (enhancers.length === 0) {
    return (createStore) => createStore;
  }

  if (enhancers.length === 1) {
    return enhancers[0];
  }

  return enhancers.reduce(
    (a, b) =>
      (createStore) =>
        a(b(createStore))
  );
}

/**
 * Apply middleware to store
 */
function applyMiddleware<S>(...middlewares: Middleware<S>[]): StoreEnhancer<S> {
  return (createStore) => (reducer, preloadedState) => {
    const store = createStore(reducer, preloadedState);
    let dispatch: Dispatch = () => {
      throw new Error('Dispatching while constructing middleware is not allowed');
    };

    const middlewareAPI = {
      getState: store.getState,
      dispatch: (action: Action<string, unknown>) => dispatch(action),
    };

    const chain = middlewares.map((middleware) => middleware(middlewareAPI));
    dispatch = chain.reduceRight(
      (next, middleware) => middleware(next),
      store.dispatch
    );

    return {
      ...store,
      dispatch,
    };
  };
}

/**
 * Create a store with hot module replacement support
 *
 * @template S - State type
 * @param reducer - Root reducer
 * @param config - Store configuration
 * @returns Store with HMR support
 *
 * @example
 * ```typescript
 * const store = createStoreWithHMR(rootReducer, { middleware: [thunk] });
 *
 * if (module.hot) {
 *   module.hot.accept('./reducers', () => {
 *     const nextReducer = require('./reducers').default;
 *     store.replaceReducer(nextReducer);
 *   });
 * }
 * ```
 */
export function createStoreWithHMR<S>(
  reducer: Reducer<S>,
  config: StoreConfig<S> = {}
): Store<S> & { replaceReducer: (nextReducer: Reducer<S>) => void } {
  return createStore(reducer, config) as Store<S> & {
    replaceReducer: (nextReducer: Reducer<S>) => void;
  };
}

/**
 * Create a store with state persistence
 *
 * @template S - State type
 * @param reducer - Root reducer
 * @param config - Store configuration with persist options
 * @returns Store with persistence
 *
 * @example
 * ```typescript
 * const store = createPersistedStore(rootReducer, {
 *   persistKey: 'myApp',
 *   storage: localStorage,
 *   whitelist: ['user', 'settings']
 * });
 * ```
 */
export function createPersistedStore<S>(
  reducer: Reducer<S>,
  config: StoreConfig<S> & {
    persistKey?: string;
    storage?: Storage;
    whitelist?: (keyof S)[];
    blacklist?: (keyof S)[];
  } = {}
): Store<S> {
  const {
    persistKey = 'store',
    storage = typeof window !== 'undefined' ? window.localStorage : undefined,
    whitelist,
    blacklist,
    ...storeConfig
  } = config;

  // Load persisted state
  let preloadedState = storeConfig.preloadedState;
  if (storage) {
    try {
      const persistedState = storage.getItem(persistKey);
      if (persistedState) {
        const parsed = JSON.parse(persistedState);
        preloadedState = { ...preloadedState, ...parsed } as S;
      }
    } catch (error) {
      console.error('Failed to load persisted state:', error);
    }
  }

  const store = createStore(reducer, { ...storeConfig, preloadedState });

  // Subscribe to persist state changes
  if (storage) {
    store.subscribe(() => {
      try {
        const state = store.getState();
        let stateToPersist = state;

        // Apply whitelist/blacklist
        if (whitelist || blacklist) {
          stateToPersist = {} as S;
          for (const key in state) {
            if (whitelist && !whitelist.includes(key as keyof S)) {
              continue;
            }
            if (blacklist && blacklist.includes(key as keyof S)) {
              continue;
            }
            (stateToPersist as Record<string, unknown>)[key] = state[key];
          }
        }

        storage.setItem(persistKey, JSON.stringify(stateToPersist));
      } catch (error) {
        console.error('Failed to persist state:', error);
      }
    });
  }

  return store;
}

/**
 * Create multiple stores with shared configuration
 *
 * @param configs - Array of store configurations
 * @returns Array of stores
 *
 * @example
 * ```typescript
 * const [mainStore, adminStore] = createStores([
 *   { reducer: mainReducer, middleware: [logger] },
 *   { reducer: adminReducer, middleware: [logger, auth] }
 * ]);
 * ```
 */
export function createStores<S extends unknown[]>(
  configs: { [K in keyof S]: { reducer: Reducer<S[K]>; config?: StoreConfig<S[K]> } }
): { [K in keyof S]: Store<S[K]> } {
  return configs.map(({ reducer, config }) =>
    createStore(reducer, config)
  ) as { [K in keyof S]: Store<S[K]> };
}

/**
 * Store event emitter for advanced subscription patterns
 */
export class StoreEventEmitter<S> {
  private listeners = new Map<string, Set<(state: S) => void>>();

  /**
   * Subscribe to specific state changes
   */
  on(event: string, listener: (state: S) => void): Unsubscribe {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);

    return () => {
      const listeners = this.listeners.get(event);
      if (listeners) {
        listeners.delete(listener);
      }
    };
  }

  /**
   * Emit an event to all listeners
   */
  emit(event: string, state: S): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => listener(state));
    }
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

/**
 * Create a store with event emitter
 *
 * @template S - State type
 * @param reducer - Root reducer
 * @param config - Store configuration
 * @returns Store with event emitter
 *
 * @example
 * ```typescript
 * const { store, events } = createStoreWithEvents(rootReducer);
 *
 * events.on('user:login', (state) => {
 *   console.log('User logged in:', state.user);
 * });
 *
 * events.emit('user:login', store.getState());
 * ```
 */
export function createStoreWithEvents<S>(
  reducer: Reducer<S>,
  config: StoreConfig<S> = {}
): { store: Store<S>; events: StoreEventEmitter<S> } {
  const store = createStore(reducer, config);
  const events = new StoreEventEmitter<S>();

  return { store, events };
}

/**
 * Type helper to extract store state type
 */
export type StoreState<S extends Store<unknown>> = S extends Store<infer State>
  ? State
  : never;

/**
 * Type helper to extract store action type
 */
export type StoreAction<S extends Store<unknown, infer A>> = A;
