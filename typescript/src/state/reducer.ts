/**
 * @fileoverview Reducer composition and type utilities for state management
 * @module @missionfabric-js/enzyme-typescript/state/reducer
 *
 * Provides utilities for creating and composing reducers with full type safety:
 * - Type-safe reducer creation with automatic state inference
 * - Reducer composition and combination
 * - Action handler mapping
 * - Reducer enhancers and middleware
 * - Immutable state updates
 *
 * @example
 * ```typescript
 * // Basic reducer
 * const counterReducer = createReducer(0, (builder) => {
 *   builder
 *     .addCase(increment, (state) => state + 1)
 *     .addCase(decrement, (state) => state - 1)
 *     .addCase(setCount, (state, action) => action.payload);
 * });
 *
 * // Combine reducers
 * const rootReducer = combineReducers({
 *   counter: counterReducer,
 *   users: usersReducer,
 * });
 * ```
 */

import type { Action, ActionCreator } from './action';

/**
 * Reducer function type
 */
export type Reducer<S = unknown, A extends Action<string, unknown> = Action<string, unknown>> = (
  state: S | undefined,
  action: A
) => S;

/**
 * Action handler function
 */
export type ActionHandler<S, A extends Action<string, unknown>> = (
  state: S,
  action: A
) => S;

/**
 * Action handlers map
 */
export type ActionHandlersMap<S> = {
  [K: string]: ActionHandler<S, Action<string, unknown>>;
};

/**
 * Reducer builder for type-safe action handling
 */
export interface ReducerBuilder<S> {
  /**
   * Add a case handler for a specific action
   */
  addCase<T extends string, P>(
    actionCreator: ActionCreator<T, P>,
    handler: ActionHandler<S, Action<T, P>>
  ): ReducerBuilder<S>;

  /**
   * Add a matcher for multiple action types
   */
  addMatcher<A extends Action<string, unknown>>(
    matcher: (action: Action<string, unknown>) => action is A,
    handler: ActionHandler<S, A>
  ): ReducerBuilder<S>;

  /**
   * Add a default case handler
   */
  addDefaultCase(handler: ActionHandler<S, Action<string, unknown>>): ReducerBuilder<S>;
}

/**
 * Case handler entry
 */
interface CaseHandler<S> {
  type: 'case';
  actionType: string;
  handler: ActionHandler<S, Action<string, unknown>>;
}

/**
 * Matcher handler entry
 */
interface MatcherHandler<S> {
  type: 'matcher';
  matcher: (action: Action<string, unknown>) => boolean;
  handler: ActionHandler<S, Action<string, unknown>>;
}

/**
 * Default handler entry
 */
interface DefaultHandler<S> {
  type: 'default';
  handler: ActionHandler<S, Action<string, unknown>>;
}

type HandlerEntry<S> = CaseHandler<S> | MatcherHandler<S> | DefaultHandler<S>;

/**
 * Create a type-safe reducer with builder pattern
 *
 * @template S - State type
 * @param initialState - Initial state value
 * @param builderCallback - Callback to configure the reducer builder
 * @returns Type-safe reducer function
 *
 * @example
 * ```typescript
 * interface CounterState {
 *   value: number;
 *   lastUpdate: number;
 * }
 *
 * const counterReducer = createReducer<CounterState>(
 *   { value: 0, lastUpdate: Date.now() },
 *   (builder) => {
 *     builder
 *       .addCase(increment, (state) => ({
 *         value: state.value + 1,
 *         lastUpdate: Date.now()
 *       }))
 *       .addCase(decrement, (state) => ({
 *         value: state.value - 1,
 *         lastUpdate: Date.now()
 *       }))
 *       .addCase(reset, () => ({
 *         value: 0,
 *         lastUpdate: Date.now()
 *       }));
 *   }
 * );
 * ```
 */
export function createReducer<S>(
  initialState: S,
  builderCallback: (builder: ReducerBuilder<S>) => void
): Reducer<S> {
  const handlers: HandlerEntry<S>[] = [];

  const builder: ReducerBuilder<S> = {
    addCase<T extends string, P>(
      actionCreator: ActionCreator<T, P>,
      handler: ActionHandler<S, Action<T, P>>
    ): ReducerBuilder<S> {
      handlers.push({
        type: 'case',
        actionType: actionCreator.type,
        handler: handler as ActionHandler<S, Action<string, unknown>>,
      });
      return this;
    },

    addMatcher<A extends Action<string, unknown>>(
      matcher: (action: Action<string, unknown>) => action is A,
      handler: ActionHandler<S, A>
    ): ReducerBuilder<S> {
      handlers.push({
        type: 'matcher',
        matcher,
        handler: handler as ActionHandler<S, Action<string, unknown>>,
      });
      return this;
    },

    addDefaultCase(handler: ActionHandler<S, Action<string, unknown>>): ReducerBuilder<S> {
      handlers.push({
        type: 'default',
        handler,
      });
      return this;
    },
  };

  builderCallback(builder);

  return (state = initialState, action: Action<string, unknown>): S => {
    for (const entry of handlers) {
      if (entry.type === 'case' && entry.actionType === action.type) {
        return entry.handler(state, action);
      }

      if (entry.type === 'matcher' && entry.matcher(action)) {
        return entry.handler(state, action);
      }

      if (entry.type === 'default') {
        return entry.handler(state, action);
      }
    }

    return state;
  };
}

/**
 * Create a simple reducer from action handlers map
 *
 * @template S - State type
 * @param initialState - Initial state value
 * @param handlers - Map of action types to handler functions
 * @returns Reducer function
 *
 * @example
 * ```typescript
 * const counterReducer = createSimpleReducer(0, {
 *   'counter/increment': (state) => state + 1,
 *   'counter/decrement': (state) => state - 1,
 *   'counter/set': (state, action) => action.payload,
 * });
 * ```
 */
export function createSimpleReducer<S>(
  initialState: S,
  handlers: ActionHandlersMap<S>
): Reducer<S> {
  return (state = initialState, action: Action<string, unknown>): S => {
    const handler = handlers[action.type];
    return handler ? handler(state, action) : state;
  };
}

/**
 * Combine multiple reducers into a single reducer
 *
 * @template S - Combined state type
 * @param reducers - Object mapping state keys to reducer functions
 * @returns Combined reducer function
 *
 * @example
 * ```typescript
 * const rootReducer = combineReducers({
 *   counter: counterReducer,
 *   users: usersReducer,
 *   settings: settingsReducer,
 * });
 *
 * // State shape: { counter: number, users: User[], settings: Settings }
 * ```
 */
export function combineReducers<S extends Record<string, unknown>>(
  reducers: { [K in keyof S]: Reducer<S[K]> }
): Reducer<S> {
  const reducerKeys = Object.keys(reducers) as (keyof S)[];

  return (state: S | undefined, action: Action<string, unknown>): S => {
    const nextState = {} as S;
    let hasChanged = false;

    for (const key of reducerKeys) {
      const reducer = reducers[key];
      const previousStateForKey = state?.[key];
      const nextStateForKey = reducer(previousStateForKey, action);

      nextState[key] = nextStateForKey;
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
    }

    return hasChanged ? nextState : (state as S);
  };
}

/**
 * Create a reducer that only handles specific actions
 *
 * @template S - State type
 * @param reducer - Original reducer
 * @param predicate - Function to test if action should be handled
 * @returns Filtered reducer
 *
 * @example
 * ```typescript
 * const userReducer = filterActions(
 *   rootReducer,
 *   (action) => action.type.startsWith('users/')
 * );
 * ```
 */
export function filterActions<S>(
  reducer: Reducer<S>,
  predicate: (action: Action<string, unknown>) => boolean
): Reducer<S> {
  return (state: S | undefined, action: Action<string, unknown>): S => {
    if (predicate(action)) {
      return reducer(state, action);
    }
    return state as S;
  };
}

/**
 * Compose multiple reducers that operate on the same state
 *
 * @template S - State type
 * @param reducers - Array of reducers to compose
 * @returns Composed reducer
 *
 * @example
 * ```typescript
 * const composedReducer = composeReducers([
 *   loggingReducer,
 *   validationReducer,
 *   businessLogicReducer,
 * ]);
 * ```
 */
export function composeReducers<S>(reducers: Reducer<S>[]): Reducer<S> {
  return (state: S | undefined, action: Action<string, unknown>): S => {
    return reducers.reduce((currentState, reducer) => {
      return reducer(currentState, action);
    }, state as S);
  };
}

/**
 * Create a reducer enhancer for cross-cutting concerns
 *
 * @template S - State type
 * @param enhancer - Function that wraps a reducer
 * @returns Enhanced reducer
 *
 * @example
 * ```typescript
 * const withLogging = createReducerEnhancer((reducer) => {
 *   return (state, action) => {
 *     console.log('Before:', state);
 *     const nextState = reducer(state, action);
 *     console.log('After:', nextState);
 *     return nextState;
 *   };
 * });
 *
 * const enhancedReducer = withLogging(counterReducer);
 * ```
 */
export function createReducerEnhancer<S>(
  enhancer: (reducer: Reducer<S>) => Reducer<S>
): (reducer: Reducer<S>) => Reducer<S> {
  return enhancer;
}

/**
 * Create a reducer with undo/redo functionality
 *
 * @template S - State type
 * @param reducer - Original reducer
 * @param options - Undo configuration options
 * @returns Undoable reducer and undo/redo actions
 *
 * @example
 * ```typescript
 * const { reducer: undoableReducer, undo, redo, clear } = withUndo(
 *   counterReducer,
 *   { limit: 10 }
 * );
 *
 * dispatch(increment()); // Can be undone
 * dispatch(undo());      // Reverts last action
 * dispatch(redo());      // Re-applies undone action
 * ```
 */
export function withUndo<S>(
  reducer: Reducer<S>,
  options: { limit?: number } = {}
): {
  reducer: Reducer<{ past: S[]; present: S; future: S[] }>;
  undo: () => Action<'@@undo', void>;
  redo: () => Action<'@@redo', void>;
  clear: () => Action<'@@undo/clear', void>;
} {
  const { limit = 50 } = options;

  type UndoableState = {
    past: S[];
    present: S;
    future: S[];
  };

  const undoableReducer = (
    state: UndoableState | undefined,
    action: Action<string, unknown>
  ): UndoableState => {
    if (!state) {
      const initialState = reducer(undefined, action);
      return {
        past: [],
        present: initialState,
        future: [],
      };
    }

    const { past, present, future } = state;

    switch (action.type) {
      case '@@undo': {
        if (past.length === 0) return state;
        const previous = past[past.length - 1];
        const newPast = past.slice(0, past.length - 1);
        return {
          past: newPast,
          present: previous,
          future: [present, ...future],
        };
      }

      case '@@redo': {
        if (future.length === 0) return state;
        const next = future[0];
        const newFuture = future.slice(1);
        return {
          past: [...past, present],
          present: next,
          future: newFuture,
        };
      }

      case '@@undo/clear': {
        return {
          past: [],
          present,
          future: [],
        };
      }

      default: {
        const newPresent = reducer(present, action);
        if (present === newPresent) {
          return state;
        }

        const newPast = [...past, present];
        if (newPast.length > limit) {
          newPast.shift();
        }

        return {
          past: newPast,
          present: newPresent,
          future: [],
        };
      }
    }
  };

  return {
    reducer: undoableReducer,
    undo: () => ({ type: '@@undo', payload: undefined as void }),
    redo: () => ({ type: '@@redo', payload: undefined as void }),
    clear: () => ({ type: '@@undo/clear', payload: undefined as void }),
  };
}

/**
 * Create a reducer that resets to initial state on specific action
 *
 * @template S - State type
 * @param reducer - Original reducer
 * @param resetActionType - Action type that triggers reset
 * @returns Resettable reducer
 *
 * @example
 * ```typescript
 * const resettableReducer = withReset(
 *   userReducer,
 *   'auth/logout'
 * );
 *
 * // State resets to initial value when logout action is dispatched
 * dispatch({ type: 'auth/logout' });
 * ```
 */
export function withReset<S>(
  reducer: Reducer<S>,
  resetActionType: string
): Reducer<S> {
  return (state: S | undefined, action: Action<string, unknown>): S => {
    if (action.type === resetActionType) {
      return reducer(undefined, action);
    }
    return reducer(state, action);
  };
}

/**
 * Create a reducer that batches actions
 *
 * @template S - State type
 * @param reducer - Original reducer
 * @returns Batch-enabled reducer
 *
 * @example
 * ```typescript
 * const batchReducer = withBatch(rootReducer);
 *
 * dispatch({
 *   type: '@@batch',
 *   payload: [increment(), addUser(user), setLoading(false)]
 * });
 * ```
 */
export function withBatch<S>(reducer: Reducer<S>): Reducer<S> {
  return (state: S | undefined, action: Action<string, unknown>): S => {
    if (action.type === '@@batch' && Array.isArray(action.payload)) {
      return action.payload.reduce((currentState, batchedAction) => {
        return reducer(currentState, batchedAction as Action<string, unknown>);
      }, state as S);
    }
    return reducer(state, action);
  };
}

/**
 * Create a reducer with state validation
 *
 * @template S - State type
 * @param reducer - Original reducer
 * @param validator - Validation function
 * @returns Validated reducer
 *
 * @example
 * ```typescript
 * const validatedReducer = withValidation(
 *   counterReducer,
 *   (state) => {
 *     if (state < 0) throw new Error('Counter cannot be negative');
 *     return true;
 *   }
 * );
 * ```
 */
export function withValidation<S>(
  reducer: Reducer<S>,
  validator: (state: S) => boolean
): Reducer<S> {
  return (state: S | undefined, action: Action<string, unknown>): S => {
    const nextState = reducer(state, action);
    if (validator(nextState)) {
      return nextState;
    }
    return state as S;
  };
}

/**
 * Create a scoped reducer that only handles actions with specific prefix
 *
 * @template S - State type
 * @param reducer - Original reducer
 * @param prefix - Action type prefix to handle
 * @returns Scoped reducer
 *
 * @example
 * ```typescript
 * const userReducer = scopedReducer(baseReducer, 'users/');
 * // Only handles actions like 'users/add', 'users/update', etc.
 * ```
 */
export function scopedReducer<S>(
  reducer: Reducer<S>,
  prefix: string
): Reducer<S> {
  return filterActions(reducer, (action) => action.type.startsWith(prefix));
}
