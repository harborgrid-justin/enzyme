/**
 * @fileoverview Action creator utilities with type safety and payload validation
 * @module @missionfabric-js/enzyme-typescript/state/action
 *
 * Provides type-safe action creator utilities for state management with support for:
 * - Strongly typed action creators with automatic type inference
 * - Payload validation and transformation
 * - Action meta data and error handling
 * - Async action creators with promise lifecycle
 * - Action batching and debouncing
 *
 * @example
 * ```typescript
 * // Basic action creator
 * const increment = createAction('counter/increment');
 * const action = increment(); // { type: 'counter/increment' }
 *
 * // With payload
 * const addUser = createAction<{ id: string; name: string }>('users/add');
 * const action = addUser({ id: '1', name: 'John' });
 *
 * // With prepare callback
 * const addTodo = createAction('todos/add', (text: string) => ({
 *   payload: { id: Date.now(), text, completed: false }
 * }));
 *
 * // Async action
 * const fetchUser = createAsyncAction('users/fetch', async (id: string) => {
 *   const response = await fetch(`/api/users/${id}`);
 *   return response.json();
 * });
 * ```
 */

/**
 * Base action type with type and optional payload
 */
export interface Action<T extends string = string, P = void> {
  type: T;
  payload: P;
  error?: boolean;
  meta?: Record<string, unknown>;
}

/**
 * Action without payload
 */
export interface ActionWithoutPayload<T extends string = string> {
  type: T;
  error?: boolean;
  meta?: Record<string, unknown>;
}

/**
 * Action creator function type
 */
export interface ActionCreator<T extends string, P = void> {
  (...args: P extends void ? [] : [P]): P extends void
    ? ActionWithoutPayload<T>
    : Action<T, P>;
  type: T;
  match: (action: { type: string }) => action is P extends void
    ? ActionWithoutPayload<T>
    : Action<T, P>;
}

/**
 * Prepare callback result type
 */
export interface PrepareResult<P, M = never> {
  payload: P;
  meta?: M extends never ? Record<string, unknown> : M;
  error?: boolean;
}

/**
 * Action creator with prepare callback
 */
export interface ActionCreatorWithPrepare<
  T extends string,
  P,
  Args extends unknown[]
> {
  (...args: Args): Action<T, P>;
  type: T;
  match: (action: { type: string }) => action is Action<T, P>;
}

/**
 * Async action states
 */
export type AsyncActionState = 'pending' | 'fulfilled' | 'rejected';

/**
 * Async action types
 */
export interface AsyncActionTypes<T extends string> {
  pending: `${T}/pending`;
  fulfilled: `${T}/fulfilled`;
  rejected: `${T}/rejected`;
}

/**
 * Async action creators
 */
export interface AsyncActionCreators<T extends string, Arg, Result> {
  pending: ActionCreator<`${T}/pending`, Arg>;
  fulfilled: ActionCreator<`${T}/fulfilled`, Result>;
  rejected: ActionCreator<`${T}/rejected`, Error>;
  typePrefix: T;
}

/**
 * Create a type-safe action creator
 *
 * @template T - Action type string
 * @template P - Payload type
 * @param type - The action type string
 * @returns Action creator function with type property and match method
 *
 * @example
 * ```typescript
 * // Simple action
 * const reset = createAction('counter/reset');
 * dispatch(reset()); // { type: 'counter/reset' }
 *
 * // With payload
 * const setCount = createAction<number>('counter/set');
 * dispatch(setCount(42)); // { type: 'counter/set', payload: 42 }
 *
 * // Type matching
 * if (setCount.match(action)) {
 *   // action.payload is typed as number
 *   console.log(action.payload);
 * }
 * ```
 */
export function createAction<P = void>(
  type: string
): ActionCreator<string, P> {
  const actionCreator = ((payload?: P) => {
    if (payload === undefined) {
      return { type };
    }
    return { type, payload };
  }) as ActionCreator<string, P>;

  actionCreator.type = type;
  actionCreator.match = (action: { type: string }): action is Action<string, P> => {
    return action.type === type;
  };

  return actionCreator;
}

/**
 * Create an action creator with a prepare callback
 *
 * @template T - Action type string
 * @template P - Payload type
 * @template Args - Prepare function arguments
 * @param type - The action type string
 * @param prepare - Function to prepare the action payload
 * @returns Action creator with prepare logic
 *
 * @example
 * ```typescript
 * const addTodo = createAction(
 *   'todos/add',
 *   (text: string, priority: number = 0) => ({
 *     payload: {
 *       id: nanoid(),
 *       text,
 *       priority,
 *       createdAt: Date.now()
 *     },
 *     meta: {
 *       timestamp: Date.now()
 *     }
 *   })
 * );
 *
 * dispatch(addTodo('Buy milk', 1));
 * ```
 */
export function createActionWithPrepare<
  T extends string,
  P,
  Args extends unknown[]
>(
  type: T,
  prepare: (...args: Args) => PrepareResult<P>
): ActionCreatorWithPrepare<T, P, Args> {
  const actionCreator = ((...args: Args) => {
    const prepared = prepare(...args);
    return {
      type,
      payload: prepared.payload,
      ...(prepared.meta && { meta: prepared.meta }),
      ...(prepared.error !== undefined && { error: prepared.error }),
    };
  }) as ActionCreatorWithPrepare<T, P, Args>;

  actionCreator.type = type;
  actionCreator.match = (action: { type: string }): action is Action<T, P> => {
    return action.type === type;
  };

  return actionCreator;
}

/**
 * Create async action creators for pending, fulfilled, and rejected states
 *
 * @template T - Action type prefix
 * @template Arg - Async function argument type
 * @template Result - Async function result type
 * @param typePrefix - The action type prefix
 * @returns Object containing action creators for all async states
 *
 * @example
 * ```typescript
 * const fetchUser = createAsyncActionCreators<'users/fetch', string, User>(
 *   'users/fetch'
 * );
 *
 * // Usage in async thunk
 * async function loadUser(id: string, dispatch: Dispatch) {
 *   dispatch(fetchUser.pending(id));
 *   try {
 *     const user = await api.getUser(id);
 *     dispatch(fetchUser.fulfilled(user));
 *   } catch (error) {
 *     dispatch(fetchUser.rejected(error as Error));
 *   }
 * }
 * ```
 */
export function createAsyncActionCreators<
  T extends string,
  Arg = void,
  Result = void
>(typePrefix: T): AsyncActionCreators<T, Arg, Result> {
  return {
    pending: createAction<Arg>(`${typePrefix}/pending`),
    fulfilled: createAction<Result>(`${typePrefix}/fulfilled`),
    rejected: createAction<Error>(`${typePrefix}/rejected`),
    typePrefix,
  };
}

/**
 * Create an async action creator with automatic lifecycle handling
 *
 * @template T - Action type prefix
 * @template Arg - Async function argument type
 * @template Result - Async function result type
 * @param typePrefix - The action type prefix
 * @param payloadCreator - Async function to execute
 * @returns Async action dispatcher
 *
 * @example
 * ```typescript
 * const fetchUser = createAsyncAction(
 *   'users/fetch',
 *   async (id: string) => {
 *     const response = await fetch(`/api/users/${id}`);
 *     if (!response.ok) throw new Error('Failed to fetch user');
 *     return response.json() as Promise<User>;
 *   }
 * );
 *
 * // Dispatch returns a promise
 * const result = await dispatch(fetchUser('123'));
 * if (fetchUser.fulfilled.match(result)) {
 *   console.log('User loaded:', result.payload);
 * }
 * ```
 */
export function createAsyncAction<T extends string, Arg, Result>(
  typePrefix: T,
  payloadCreator: (arg: Arg) => Promise<Result>
) {
  const actionCreators = createAsyncActionCreators<T, Arg, Result>(typePrefix);

  const asyncActionCreator = (arg: Arg) => {
    return async (dispatch: (action: unknown) => void) => {
      dispatch(actionCreators.pending(arg as Arg extends void ? never : Arg));

      try {
        const result = await payloadCreator(arg);
        const fulfilledAction = actionCreators.fulfilled(
          result as Result extends void ? never : Result
        );
        dispatch(fulfilledAction);
        return fulfilledAction;
      } catch (error) {
        const rejectedAction = actionCreators.rejected(error as Error);
        dispatch(rejectedAction);
        return rejectedAction;
      }
    };
  };

  return Object.assign(asyncActionCreator, actionCreators);
}

/**
 * Check if an action is of a specific type
 *
 * @param action - Action to check
 * @param type - Expected action type
 * @returns Type predicate
 *
 * @example
 * ```typescript
 * if (isActionType(action, 'users/add')) {
 *   // action.type is narrowed to 'users/add'
 * }
 * ```
 */
export function isActionType<T extends string>(
  action: { type: string },
  type: T
): action is Action<T, unknown> {
  return action.type === type;
}

/**
 * Check if an action matches any of the provided types
 *
 * @param action - Action to check
 * @param types - Array of action types to match
 * @returns True if action matches any type
 *
 * @example
 * ```typescript
 * if (matchesAnyType(action, ['users/add', 'users/update'])) {
 *   // Handle user modifications
 * }
 * ```
 */
export function matchesAnyType(
  action: { type: string },
  types: string[]
): boolean {
  return types.includes(action.type);
}

/**
 * Create a type guard for multiple action creators
 *
 * @param actionCreators - Array of action creators to match
 * @returns Type guard function
 *
 * @example
 * ```typescript
 * const addUser = createAction<User>('users/add');
 * const updateUser = createAction<User>('users/update');
 *
 * const isUserAction = createMatcher([addUser, updateUser]);
 *
 * if (isUserAction(action)) {
 *   // action is typed as User action
 * }
 * ```
 */
export function createMatcher<AC extends ActionCreator<string, unknown>>(
  actionCreators: AC[]
): (action: { type: string }) => boolean {
  const types = actionCreators.map((ac) => ac.type);
  return (action: { type: string }) => types.includes(action.type);
}

/**
 * Action batching utility
 */
export interface BatchAction {
  type: '@@batch';
  payload: Action<string, unknown>[];
}

/**
 * Create a batch action containing multiple actions
 *
 * @param actions - Array of actions to batch
 * @returns Batch action
 *
 * @example
 * ```typescript
 * const batchedAction = batch([
 *   increment(),
 *   addUser({ id: '1', name: 'John' }),
 *   setLoading(false)
 * ]);
 *
 * dispatch(batchedAction);
 * ```
 */
export function batch(actions: Action<string, unknown>[]): BatchAction {
  return {
    type: '@@batch',
    payload: actions,
  };
}

/**
 * Create a debounced action creator
 *
 * @param actionCreator - Original action creator
 * @param delay - Debounce delay in milliseconds
 * @returns Debounced action creator
 *
 * @example
 * ```typescript
 * const search = createAction<string>('search/query');
 * const debouncedSearch = debounce(search, 300);
 *
 * // Only dispatches after 300ms of inactivity
 * debouncedSearch('query');
 * ```
 */
export function debounce<AC extends ActionCreator<string, unknown>>(
  actionCreator: AC,
  delay: number
): AC {
  let timeoutId: NodeJS.Timeout | null = null;

  const debouncedCreator = ((...args: unknown[]) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    return new Promise((resolve) => {
      timeoutId = setTimeout(() => {
        const action = (actionCreator as (...args: unknown[]) => unknown)(...args);
        resolve(action);
      }, delay);
    });
  }) as AC;

  debouncedCreator.type = actionCreator.type;
  debouncedCreator.match = actionCreator.match;

  return debouncedCreator;
}

/**
 * Create a throttled action creator
 *
 * @param actionCreator - Original action creator
 * @param delay - Throttle delay in milliseconds
 * @returns Throttled action creator
 *
 * @example
 * ```typescript
 * const trackScroll = createAction<number>('ui/scroll');
 * const throttledScroll = throttle(trackScroll, 100);
 *
 * // Only dispatches once per 100ms
 * window.addEventListener('scroll', (e) => {
 *   dispatch(throttledScroll(window.scrollY));
 * });
 * ```
 */
export function throttle<AC extends ActionCreator<string, unknown>>(
  actionCreator: AC,
  delay: number
): AC {
  let lastCall = 0;
  let timeoutId: NodeJS.Timeout | null = null;

  const throttledCreator = ((...args: unknown[]) => {
    const now = Date.now();

    if (now - lastCall >= delay) {
      lastCall = now;
      return (actionCreator as (...args: unknown[]) => unknown)(...args);
    }

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    return new Promise((resolve) => {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        const action = (actionCreator as (...args: unknown[]) => unknown)(...args);
        resolve(action);
      }, delay - (now - lastCall));
    });
  }) as AC;

  throttledCreator.type = actionCreator.type;
  throttledCreator.match = actionCreator.match;

  return throttledCreator;
}
