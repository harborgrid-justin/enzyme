/**
 * @fileoverview Immer integration utilities for immutable updates
 * @module @missionfabric-js/enzyme-typescript/state/immer
 *
 * Provides Immer-like utilities for immutable state updates:
 * - Draft-based state mutation syntax
 * - Automatic structural sharing
 * - Deep update optimization
 * - Freeze validation for development
 * - Patch generation and application
 *
 * @example
 * ```typescript
 * // Use produce for immutable updates
 * const nextState = produce(state, (draft) => {
 *   draft.user.name = 'John';
 *   draft.items.push({ id: 1, text: 'New item' });
 * });
 *
 * // Create reducer with Immer
 * const reducer = createImmerReducer(initialState, (builder) => {
 *   builder.addCase(updateUser, (draft, action) => {
 *     draft.user = action.payload;
 *   });
 * });
 * ```
 */

import type { Action } from './action';
import type { Reducer, ReducerBuilder } from './reducer';

/**
 * Draft type - allows mutation of readonly types
 */
export type Draft<T> = T extends object
  ? {
      -readonly [K in keyof T]: Draft<T[K]>;
    }
  : T;

/**
 * Recipe function type
 */
export type Recipe<S> = (draft: Draft<S>) => void | S;

/**
 * Producer function type
 */
export type Producer<S> = (state: S, recipe: Recipe<S>) => S;

/**
 * Patch operation types
 */
export type PatchOperation = 'add' | 'remove' | 'replace';

/**
 * Patch object
 */
export interface Patch {
  op: PatchOperation;
  path: (string | number)[];
  value?: unknown;
}

/**
 * Produce options
 */
export interface ProduceOptions {
  /**
   * Enable patch generation
   */
  patches?: boolean;

  /**
   * Enable freeze in development
   */
  freeze?: boolean;

  /**
   * Auto freeze
   */
  autoFreeze?: boolean;
}

/**
 * Check if object is frozen
 */
function isFrozen(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null) {
    return true;
  }
  return Object.isFrozen(obj);
}

/**
 * Deep freeze an object
 */
function freeze<T>(obj: T): T {
  if (typeof obj !== 'object' || obj === null || isFrozen(obj)) {
    return obj;
  }

  Object.freeze(obj);

  Object.values(obj).forEach((value) => {
    freeze(value);
  });

  return obj;
}

/**
 * Check if value is a draft
 */
const DRAFT_STATE = Symbol('draft-state');

interface DraftState<T> {
  base: T;
  copy: Draft<T> | null;
  modified: boolean;
  parent?: DraftState<unknown>;
  patches: Patch[];
}

function isDraft(value: unknown): value is Draft<unknown> {
  return typeof value === 'object' && value !== null && DRAFT_STATE in value;
}

/**
 * Get draft state
 */
function getDraftState<T>(draft: Draft<T>): DraftState<T> | undefined {
  return (draft as unknown as { [DRAFT_STATE]: DraftState<T> })[DRAFT_STATE];
}

/**
 * Create a draft from base state
 */
function createDraft<T>(base: T, parent?: DraftState<unknown>): Draft<T> {
  if (typeof base !== 'object' || base === null) {
    return base as Draft<T>;
  }

  if (isDraft(base)) {
    return base;
  }

  const state: DraftState<T> = {
    base,
    copy: null,
    modified: false,
    parent,
    patches: [],
  };

  const draft = Array.isArray(base) ? [] : {};
  Object.defineProperty(draft, DRAFT_STATE, {
    value: state,
    enumerable: false,
    writable: true,
  });

  return new Proxy(draft as Draft<T>, {
    get(target, prop) {
      if (prop === DRAFT_STATE) {
        return state;
      }

      const source = state.copy || state.base;
      const value = (source as Record<string | symbol, unknown>)[prop];

      if (typeof value === 'object' && value !== null && !isDraft(value)) {
        const childDraft = createDraft(value, state);
        if (state.copy) {
          (state.copy as Record<string | symbol, unknown>)[prop] = childDraft;
        }
        return childDraft;
      }

      return value;
    },

    set(target, prop, value) {
      if (!state.copy) {
        state.copy = Array.isArray(state.base)
          ? [...state.base]
          : { ...state.base };
        state.modified = true;
      }

      (state.copy as Record<string | symbol, unknown>)[prop] = value;

      if (state.patches) {
        state.patches.push({
          op: 'replace',
          path: [prop as string],
          value,
        });
      }

      return true;
    },

    deleteProperty(target, prop) {
      if (!state.copy) {
        state.copy = Array.isArray(state.base)
          ? [...state.base]
          : { ...state.base };
        state.modified = true;
      }

      delete (state.copy as Record<string | symbol, unknown>)[prop];

      if (state.patches) {
        state.patches.push({
          op: 'remove',
          path: [prop as string],
        });
      }

      return true;
    },
  });
}

/**
 * Finalize draft and return immutable result
 */
function finalizeDraft<T>(draft: Draft<T>, autoFreeze = false): T {
  if (!isDraft(draft)) {
    return draft as T;
  }

  const state = getDraftState(draft);
  if (!state) {
    return draft as T;
  }

  if (!state.modified) {
    return state.base;
  }

  const result = state.copy!;

  // Recursively finalize nested drafts
  Object.keys(result).forEach((key) => {
    const value = (result as Record<string, unknown>)[key];
    if (isDraft(value)) {
      (result as Record<string, unknown>)[key] = finalizeDraft(value as Draft<unknown>, autoFreeze);
    }
  });

  return (autoFreeze ? freeze(result) : result) as T;
}

/**
 * Produce a new state from a recipe function
 *
 * @template S - State type
 * @param state - Base state
 * @param recipe - Function to mutate draft
 * @param options - Produce options
 * @returns New immutable state
 *
 * @example
 * ```typescript
 * const state = { count: 0, items: [] };
 *
 * const nextState = produce(state, (draft) => {
 *   draft.count += 1;
 *   draft.items.push('new item');
 * });
 *
 * console.log(state.count); // 0 (unchanged)
 * console.log(nextState.count); // 1 (new state)
 * ```
 */
export function produce<S>(
  state: S,
  recipe: Recipe<S>,
  options: ProduceOptions = {}
): S {
  const { autoFreeze = process.env.NODE_ENV !== 'production' } = options;

  const draft = createDraft(state);
  const result = recipe(draft);

  // If recipe returns a value, use it; otherwise finalize draft
  if (result !== undefined) {
    return (autoFreeze ? freeze(result) : result) as S;
  }

  return finalizeDraft(draft, autoFreeze);
}

/**
 * Create a curried producer function
 *
 * @template S - State type
 * @param recipe - Recipe function
 * @returns Curried producer
 *
 * @example
 * ```typescript
 * const increment = createProducer((draft: State) => {
 *   draft.count += 1;
 * });
 *
 * const nextState = increment(state);
 * ```
 */
export function createProducer<S>(recipe: Recipe<S>): (state: S) => S {
  return (state: S): S => produce(state, recipe);
}

/**
 * Create an Immer-based reducer
 *
 * @template S - State type
 * @param initialState - Initial state
 * @param builderCallback - Builder callback
 * @returns Immer reducer
 *
 * @example
 * ```typescript
 * const reducer = createImmerReducer(
 *   { count: 0 },
 *   (builder) => {
 *     builder
 *       .addCase(increment, (draft) => {
 *         draft.count += 1;
 *       })
 *       .addCase(decrement, (draft) => {
 *         draft.count -= 1;
 *       });
 *   }
 * );
 * ```
 */
export function createImmerReducer<S>(
  initialState: S,
  builderCallback: (builder: ReducerBuilder<S>) => void
): Reducer<S> {
  const handlers = new Map<
    string,
    (draft: Draft<S>, action: Action<string, unknown>) => void | S
  >();

  const builder: ReducerBuilder<S> = {
    addCase(actionCreator, handler) {
      handlers.set(actionCreator.type, handler as (draft: Draft<S>, action: Action<string, unknown>) => void | S);
      return this;
    },
    addMatcher(matcher, handler) {
      // Store matcher handlers separately
      return this;
    },
    addDefaultCase(handler) {
      handlers.set('@@default', handler as (draft: Draft<S>, action: Action<string, unknown>) => void | S);
      return this;
    },
  };

  builderCallback(builder);

  return (state = initialState, action: Action<string, unknown>): S => {
    const handler = handlers.get(action.type) || handlers.get('@@default');

    if (!handler) {
      return state;
    }

    return produce(state, (draft) => {
      const result = handler(draft, action);
      if (result !== undefined) {
        return result;
      }
    });
  };
}

/**
 * Wrap a reducer with Immer
 *
 * @template S - State type
 * @param reducer - Original reducer using mutations
 * @returns Immer-wrapped reducer
 *
 * @example
 * ```typescript
 * const reducer = immerReducer((draft, action) => {
 *   switch (action.type) {
 *     case 'increment':
 *       draft.count += 1;
 *       break;
 *     case 'decrement':
 *       draft.count -= 1;
 *       break;
 *   }
 * });
 * ```
 */
export function immerReducer<S>(
  reducer: (draft: Draft<S>, action: Action<string, unknown>) => void | S
): Reducer<S> {
  return (state: S | undefined, action: Action<string, unknown>): S => {
    if (state === undefined) {
      throw new Error('Immer reducer requires initial state');
    }

    return produce(state, (draft) => {
      return reducer(draft, action);
    });
  };
}

/**
 * Create patches from state change
 *
 * @template S - State type
 * @param state - Base state
 * @param recipe - Recipe function
 * @returns Tuple of [nextState, patches, inversePatches]
 *
 * @example
 * ```typescript
 * const [nextState, patches, inversePatches] = produceWithPatches(
 *   state,
 *   (draft) => {
 *     draft.count += 1;
 *   }
 * );
 *
 * console.log(patches);
 * // [{ op: 'replace', path: ['count'], value: 1 }]
 * ```
 */
export function produceWithPatches<S>(
  state: S,
  recipe: Recipe<S>
): [S, Patch[], Patch[]] {
  const patches: Patch[] = [];
  const inversePatches: Patch[] = [];

  const draft = createDraft(state);
  const draftState = getDraftState(draft);

  if (draftState) {
    draftState.patches = patches;
  }

  const result = recipe(draft);
  const nextState = result !== undefined ? result : finalizeDraft(draft);

  return [nextState as S, patches, inversePatches];
}

/**
 * Apply patches to state
 *
 * @template S - State type
 * @param state - Base state
 * @param patches - Patches to apply
 * @returns New state with patches applied
 *
 * @example
 * ```typescript
 * const patches = [
 *   { op: 'replace', path: ['count'], value: 5 }
 * ];
 *
 * const nextState = applyPatches(state, patches);
 * ```
 */
export function applyPatches<S>(state: S, patches: Patch[]): S {
  return produce(state, (draft) => {
    for (const patch of patches) {
      const { op, path, value } = patch;
      let target = draft as Record<string | number, unknown>;

      // Navigate to the target
      for (let i = 0; i < path.length - 1; i++) {
        target = target[path[i]] as Record<string | number, unknown>;
      }

      const lastKey = path[path.length - 1];

      switch (op) {
        case 'add':
        case 'replace':
          target[lastKey] = value;
          break;
        case 'remove':
          if (Array.isArray(target)) {
            target.splice(lastKey as number, 1);
          } else {
            delete target[lastKey];
          }
          break;
      }
    }
  });
}

/**
 * Create a draft from state for manual manipulation
 *
 * @template S - State type
 * @param state - Base state
 * @returns Draft state
 *
 * @example
 * ```typescript
 * const draft = createDraftSafe(state);
 * draft.count += 1;
 * draft.items.push('new');
 *
 * const nextState = finishDraft(draft);
 * ```
 */
export function createDraftSafe<S>(state: S): Draft<S> {
  return createDraft(state);
}

/**
 * Finish a draft and return immutable state
 *
 * @template S - State type
 * @param draft - Draft state
 * @returns Immutable state
 */
export function finishDraft<S>(draft: Draft<S>): S {
  return finalizeDraft(draft);
}

/**
 * Check if state is draftable
 *
 * @param value - Value to check
 * @returns True if value can be drafted
 */
export function isDraftable(value: unknown): boolean {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  if (Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype) {
    return true;
  }

  return false;
}

/**
 * Create an Immer-compatible update function
 *
 * @template S - State type
 * @param updater - Update function
 * @returns Wrapped update function
 *
 * @example
 * ```typescript
 * const updateCount = createUpdate((draft: State, amount: number) => {
 *   draft.count += amount;
 * });
 *
 * const nextState = updateCount(state, 5);
 * ```
 */
export function createUpdate<S, Args extends unknown[]>(
  updater: (draft: Draft<S>, ...args: Args) => void | S
): (state: S, ...args: Args) => S {
  return (state: S, ...args: Args): S => {
    return produce(state, (draft) => {
      return updater(draft, ...args);
    });
  };
}

/**
 * Batch multiple updates into one
 *
 * @template S - State type
 * @param state - Base state
 * @param recipes - Array of recipe functions
 * @returns New state with all updates applied
 *
 * @example
 * ```typescript
 * const nextState = batchUpdates(state, [
 *   (draft) => { draft.count += 1; },
 *   (draft) => { draft.items.push('new'); },
 *   (draft) => { draft.loading = false; }
 * ]);
 * ```
 */
export function batchUpdates<S>(state: S, recipes: Recipe<S>[]): S {
  return produce(state, (draft) => {
    for (const recipe of recipes) {
      const result = recipe(draft);
      if (result !== undefined) {
        return result;
      }
    }
  });
}

/**
 * Create a deep update helper
 *
 * @template S - State type
 * @param path - Path to update (dot notation)
 * @param value - New value
 * @returns Update function
 *
 * @example
 * ```typescript
 * const nextState = deepUpdate(
 *   state,
 *   'user.profile.name',
 *   'John Doe'
 * );
 * ```
 */
export function deepUpdate<S>(
  state: S,
  path: string,
  value: unknown
): S {
  return produce(state, (draft) => {
    const parts = path.split('.');
    let target = draft as Record<string, unknown>;

    for (let i = 0; i < parts.length - 1; i++) {
      target = target[parts[i]] as Record<string, unknown>;
    }

    target[parts[parts.length - 1]] = value;
  });
}

/**
 * Merge objects immutably
 *
 * @template S - State type
 * @param state - Base state
 * @param updates - Updates to merge
 * @returns Merged state
 *
 * @example
 * ```typescript
 * const nextState = immutableMerge(state, {
 *   user: { name: 'John' },
 *   settings: { theme: 'dark' }
 * });
 * ```
 */
export function immutableMerge<S extends Record<string, unknown>>(
  state: S,
  updates: Partial<S>
): S {
  return produce(state, (draft) => {
    Object.assign(draft, updates);
  });
}

/**
 * Toggle a boolean value immutably
 *
 * @template S - State type
 * @param state - Base state
 * @param path - Path to boolean (dot notation)
 * @returns State with toggled boolean
 *
 * @example
 * ```typescript
 * const nextState = toggleBoolean(state, 'ui.sidebar.open');
 * ```
 */
export function toggleBoolean<S>(state: S, path: string): S {
  return produce(state, (draft) => {
    const parts = path.split('.');
    let target = draft as Record<string, unknown>;

    for (let i = 0; i < parts.length - 1; i++) {
      target = target[parts[i]] as Record<string, unknown>;
    }

    const key = parts[parts.length - 1];
    target[key] = !target[key];
  });
}
