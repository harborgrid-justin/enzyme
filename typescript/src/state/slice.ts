/**
 * @fileoverview Redux-style slice creation with type inference
 * @module @missionfabric-js/enzyme-typescript/state/slice
 *
 * Provides utilities for creating Redux slices with automatic type inference:
 * - Type-safe slice creation with reducers and actions
 * - Automatic action creator generation
 * - Nested state updates with Immer-like syntax
 * - Selector generation for slice state
 * - Async thunk integration
 *
 * @example
 * ```typescript
 * const counterSlice = createSlice({
 *   name: 'counter',
 *   initialState: { value: 0, loading: false },
 *   reducers: {
 *     increment: (state) => {
 *       state.value += 1;
 *     },
 *     decrement: (state) => {
 *       state.value -= 1;
 *     },
 *     incrementByAmount: (state, action: PayloadAction<number>) => {
 *       state.value += action.payload;
 *     }
 *   }
 * });
 *
 * export const { increment, decrement, incrementByAmount } = counterSlice.actions;
 * export default counterSlice.reducer;
 * ```
 */

import type { Action, ActionCreator, AsyncActionCreators } from './action';
import type { Reducer } from './reducer';
import { createAction, createAsyncActionCreators } from './action';
import { createReducer } from './reducer';

/**
 * Payload action type
 */
export interface PayloadAction<P = void, M = never> {
  type: string;
  payload: P;
  meta?: M;
  error?: boolean;
}

/**
 * Case reducer function type
 */
export type CaseReducer<S, A extends Action<string, unknown> = Action<string, unknown>> = (
  state: S,
  action: A
) => S | void;

/**
 * Case reducers map
 */
export type CaseReducers<S, AS extends Record<string, unknown> = Record<string, unknown>> = {
  [K in keyof AS]: AS[K] extends undefined
    ? CaseReducer<S, Action<string, void>>
    : AS[K] extends (infer P)
    ? CaseReducer<S, PayloadAction<P>>
    : CaseReducer<S, PayloadAction<AS[K]>>;
};

/**
 * Slice actions from case reducers
 */
export type SliceActions<S, CR extends CaseReducers<S, unknown>> = {
  [K in keyof CR]: CR[K] extends CaseReducer<S, infer A>
    ? A extends PayloadAction<infer P>
      ? ActionCreator<string, P>
      : ActionCreator<string, void>
    : never;
};

/**
 * Extra reducers builder
 */
export interface ExtraReducersBuilder<S> {
  addCase<T extends string, P>(
    actionCreator: ActionCreator<T, P>,
    reducer: CaseReducer<S, PayloadAction<P>>
  ): ExtraReducersBuilder<S>;

  addMatcher<A extends Action<string, unknown>>(
    matcher: (action: Action<string, unknown>) => action is A,
    reducer: CaseReducer<S, A>
  ): ExtraReducersBuilder<S>;

  addDefaultCase(reducer: CaseReducer<S, Action<string, unknown>>): ExtraReducersBuilder<S>;
}

/**
 * Slice configuration
 */
export interface SliceConfig<
  S,
  CR extends CaseReducers<S, unknown> = CaseReducers<S, unknown>,
  Name extends string = string
> {
  name: Name;
  initialState: S;
  reducers: CR;
  extraReducers?: (builder: ExtraReducersBuilder<S>) => void;
}

/**
 * Slice object returned by createSlice
 */
export interface Slice<
  S,
  CR extends CaseReducers<S, unknown> = CaseReducers<S, unknown>,
  Name extends string = string
> {
  name: Name;
  reducer: Reducer<S>;
  actions: SliceActions<S, CR>;
  caseReducers: CR;
  getInitialState: () => S;
}

/**
 * Create a slice with automatic action creators and reducer
 *
 * @template S - State type
 * @template CR - Case reducers type
 * @template Name - Slice name
 * @param config - Slice configuration
 * @returns Slice object with actions and reducer
 *
 * @example
 * ```typescript
 * interface TodoState {
 *   items: Todo[];
 *   filter: 'all' | 'active' | 'completed';
 * }
 *
 * const todoSlice = createSlice({
 *   name: 'todos',
 *   initialState: { items: [], filter: 'all' } as TodoState,
 *   reducers: {
 *     addTodo: (state, action: PayloadAction<{ text: string }>) => {
 *       state.items.push({
 *         id: Date.now().toString(),
 *         text: action.payload.text,
 *         completed: false
 *       });
 *     },
 *     toggleTodo: (state, action: PayloadAction<string>) => {
 *       const todo = state.items.find(t => t.id === action.payload);
 *       if (todo) {
 *         todo.completed = !todo.completed;
 *       }
 *     },
 *     setFilter: (state, action: PayloadAction<TodoState['filter']>) => {
 *       state.filter = action.payload;
 *     }
 *   }
 * });
 * ```
 */
export function createSlice<
  S,
  CR extends CaseReducers<S, Record<string, unknown>>,
  Name extends string = string
>(config: SliceConfig<S, CR, Name>): Slice<S, CR, Name> {
  const { name, initialState, reducers, extraReducers } = config;

  // Create action creators
  const actionCreators = {} as SliceActions<S, CR>;
  const actionTypes: Record<string, string> = {};

  for (const reducerName in reducers) {
    const type = `${name}/${reducerName}`;
    actionTypes[reducerName] = type;
    actionCreators[reducerName] = createAction(type) as SliceActions<S, CR>[keyof CR];
  }

  // Create reducer
  const sliceReducer = createReducer(initialState, (builder) => {
    // Add case reducers
    for (const reducerName in reducers) {
      const type = actionTypes[reducerName];
      const caseReducer = reducers[reducerName];

      builder.addCase({ type, match: () => false } as ActionCreator<string, unknown>, (state, action) => {
        const result = caseReducer(state, action as unknown as PayloadAction<unknown>);
        return result === undefined ? state : result;
      });
    }

    // Add extra reducers if provided
    if (extraReducers) {
      extraReducers(builder as unknown as ExtraReducersBuilder<S>);
    }
  });

  return {
    name,
    reducer: sliceReducer,
    actions: actionCreators,
    caseReducers: reducers,
    getInitialState: () => initialState,
  };
}

/**
 * Prepare action payload
 */
export type PreparedAction<P, M = never> = {
  payload: P;
  meta?: M;
  error?: boolean;
};

/**
 * Create a slice with prepare callbacks for actions
 *
 * @example
 * ```typescript
 * const slice = createSliceWithPrepare({
 *   name: 'todos',
 *   initialState: [] as Todo[],
 *   reducers: {
 *     addTodo: {
 *       prepare: (text: string) => ({
 *         payload: {
 *           id: nanoid(),
 *           text,
 *           completed: false
 *         }
 *       }),
 *       reducer: (state, action) => {
 *         state.push(action.payload);
 *       }
 *     }
 *   }
 * });
 * ```
 */
export function createSliceWithPrepare<
  S,
  CR extends Record<
    string,
    {
      prepare: (...args: never[]) => PreparedAction<unknown>;
      reducer: CaseReducer<S, PayloadAction<unknown>>;
    }
  >,
  Name extends string = string
>(config: {
  name: Name;
  initialState: S;
  reducers: CR;
}): Slice<S, { [K in keyof CR]: CR[K]['reducer'] }, Name> {
  const { name, initialState, reducers } = config;

  const actionCreators: Record<string, unknown> = {};
  const caseReducers: Record<string, CaseReducer<S, PayloadAction<unknown>>> = {};

  for (const key in reducers) {
    const { prepare, reducer } = reducers[key];
    const type = `${name}/${key}`;

    // Create action creator with prepare
    actionCreators[key] = (...args: unknown[]) => {
      const prepared = prepare(...(args as never[]));
      return {
        type,
        payload: prepared.payload,
        ...(prepared.meta && { meta: prepared.meta }),
        ...(prepared.error !== undefined && { error: prepared.error }),
      };
    };

    caseReducers[key] = reducer;
  }

  const sliceReducer = createReducer(initialState, (builder) => {
    for (const key in caseReducers) {
      const type = `${name}/${key}`;
      builder.addCase(
        { type, match: () => false } as ActionCreator<string, unknown>,
        caseReducers[key] as CaseReducer<S, Action<string, unknown>>
      );
    }
  });

  return {
    name,
    reducer: sliceReducer,
    actions: actionCreators as SliceActions<S, { [K in keyof CR]: CR[K]['reducer'] }>,
    caseReducers: caseReducers as { [K in keyof CR]: CR[K]['reducer'] },
    getInitialState: () => initialState,
  };
}

/**
 * Create an async slice with thunk support
 *
 * @example
 * ```typescript
 * const userSlice = createAsyncSlice({
 *   name: 'users',
 *   initialState: {
 *     data: null,
 *     loading: false,
 *     error: null
 *   },
 *   reducers: {},
 *   asyncThunks: {
 *     fetchUser: async (id: string) => {
 *       const response = await fetch(`/api/users/${id}`);
 *       return response.json();
 *     }
 *   }
 * });
 * ```
 */
export function createAsyncSlice<
  S,
  CR extends CaseReducers<S, Record<string, unknown>>,
  AT extends Record<string, (arg: never) => Promise<unknown>>,
  Name extends string = string
>(config: {
  name: Name;
  initialState: S;
  reducers: CR;
  asyncThunks: AT;
}): Slice<S, CR, Name> & {
  thunks: {
    [K in keyof AT]: AsyncActionCreators<
      `${Name}/${K & string}`,
      Parameters<AT[K]>[0],
      Awaited<ReturnType<AT[K]>>
    >;
  };
} {
  const { name, initialState, reducers, asyncThunks } = config;

  // Create base slice
  const slice = createSlice({ name, initialState, reducers });

  // Create async action creators
  const thunks = {} as {
    [K in keyof AT]: AsyncActionCreators<
      `${Name}/${K & string}`,
      Parameters<AT[K]>[0],
      Awaited<ReturnType<AT[K]>>
    >;
  };

  for (const thunkName in asyncThunks) {
    const typePrefix = `${name}/${thunkName}` as `${Name}/${typeof thunkName}`;
    thunks[thunkName] = createAsyncActionCreators(typePrefix);
  }

  return {
    ...slice,
    thunks,
  };
}

/**
 * Combine multiple slices into one
 *
 * @param slices - Array of slices to combine
 * @returns Combined slice
 *
 * @example
 * ```typescript
 * const combinedSlice = combineSlices({
 *   counter: counterSlice,
 *   todos: todoSlice,
 *   users: userSlice
 * });
 * ```
 */
export function combineSlices<
  Slices extends Record<string, Slice<unknown, CaseReducers<unknown>, string>>
>(slices: Slices): {
  name: string;
  reducer: Reducer<{ [K in keyof Slices]: ReturnType<Slices[K]['getInitialState']> }>;
  actions: { [K in keyof Slices]: Slices[K]['actions'] };
} {
  type CombinedState = { [K in keyof Slices]: ReturnType<Slices[K]['getInitialState']> };

  const names = Object.keys(slices);
  const combinedName = names.join('+');

  // Combine reducers
  const combinedReducer = (
    state: CombinedState | undefined,
    action: Action<string, unknown>
  ): CombinedState => {
    const nextState = {} as CombinedState;
    let hasChanged = false;

    for (const key of names) {
      const slice = slices[key as keyof Slices];
      const previousStateForKey = state?.[key as keyof Slices];
      const nextStateForKey = slice.reducer(
        previousStateForKey as ReturnType<typeof slice.getInitialState>,
        action
      );

      nextState[key as keyof Slices] = nextStateForKey as CombinedState[keyof Slices];
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
    }

    return hasChanged ? nextState : (state as CombinedState);
  };

  // Combine actions
  const combinedActions = {} as { [K in keyof Slices]: Slices[K]['actions'] };
  for (const key of names) {
    combinedActions[key as keyof Slices] = slices[key as keyof Slices].actions;
  }

  return {
    name: combinedName,
    reducer: combinedReducer,
    actions: combinedActions,
  };
}

/**
 * Create a nested slice for managing nested state
 *
 * @example
 * ```typescript
 * const nestedSlice = createNestedSlice({
 *   name: 'ui',
 *   initialState: {
 *     modal: { isOpen: false, content: null },
 *     sidebar: { isOpen: true, width: 250 }
 *   },
 *   slices: {
 *     modal: modalSlice,
 *     sidebar: sidebarSlice
 *   }
 * });
 * ```
 */
export function createNestedSlice<
  S extends Record<string, unknown>,
  Slices extends { [K in keyof S]: Slice<S[K], CaseReducers<S[K]>, string> }
>(config: {
  name: string;
  initialState: S;
  slices: Slices;
}): Slice<S, CaseReducers<S, Record<string, unknown>>, string> {
  const { name, initialState, slices } = config;

  const reducer = (state: S | undefined, action: Action<string, unknown>): S => {
    if (!state) state = initialState;

    const nextState = { ...state };
    let hasChanged = false;

    for (const key in slices) {
      const slice = slices[key];
      const nextSliceState = slice.reducer(state[key], action);

      if (nextSliceState !== state[key]) {
        nextState[key] = nextSliceState;
        hasChanged = true;
      }
    }

    return hasChanged ? nextState : state;
  };

  // Combine all actions
  const actions = {} as Record<string, unknown>;
  for (const key in slices) {
    Object.assign(actions, slices[key].actions);
  }

  return {
    name,
    reducer,
    actions: actions as SliceActions<S, CaseReducers<S, Record<string, unknown>>>,
    caseReducers: {} as CaseReducers<S, Record<string, unknown>>,
    getInitialState: () => initialState,
  };
}

/**
 * Create selectors for a slice
 *
 * @template S - State type
 * @param slice - Slice to create selectors for
 * @param selectSliceState - Function to select slice state from root state
 * @returns Object with generated selectors
 *
 * @example
 * ```typescript
 * const selectors = createSliceSelectors(
 *   counterSlice,
 *   (state: RootState) => state.counter
 * );
 *
 * const count = selectors.selectValue(state);
 * const loading = selectors.selectLoading(state);
 * ```
 */
export function createSliceSelectors<S extends Record<string, unknown>, RootState>(
  slice: Slice<S, CaseReducers<S>, string>,
  selectSliceState: (state: RootState) => S
): { [K in keyof S as `select${Capitalize<K & string>}`]: (state: RootState) => S[K] } {
  const selectors = {} as {
    [K in keyof S as `select${Capitalize<K & string>}`]: (state: RootState) => S[K];
  };

  const initialState = slice.getInitialState();

  for (const key in initialState) {
    const capitalizedKey = (key.charAt(0).toUpperCase() + key.slice(1)) as Capitalize<
      typeof key
    >;
    const selectorName = `select${capitalizedKey}` as `select${typeof capitalizedKey}`;

    selectors[selectorName] = (state: RootState) => {
      return selectSliceState(state)[key];
    };
  }

  return selectors;
}

/**
 * Type helper to extract slice state type
 */
export type SliceState<S extends Slice<unknown, CaseReducers<unknown>, string>> =
  ReturnType<S['getInitialState']>;

/**
 * Type helper to extract slice actions type
 */
export type SliceActionsType<S extends Slice<unknown, CaseReducers<unknown>, string>> =
  S['actions'];
