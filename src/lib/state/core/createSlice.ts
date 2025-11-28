/**
 * @file Slice Factory
 * @description Type-safe slice creation with automatic action naming for DevTools
 */

import type { Draft } from 'immer';
import type { StateCreator } from 'zustand';

// ============================================================================
// Types
// ============================================================================

/**
 * Slice setter with automatic action naming
 * Wraps the standard set function to add DevTools action names
 */
export type SliceSetter<TState> = {
  /**
   * Update state with an updater function (Immer-style)
   * @param updater - Function that mutates draft state
   * @param actionName - Optional action name for DevTools
   */
  (updater: (state: Draft<TState>) => void, actionName?: string): void;
  /**
   * Update state with partial state
   * @param partial - Partial state to merge
   * @param actionName - Optional action name for DevTools
   */
  (partial: Partial<TState>, actionName?: string): void;
};

/**
 * Slice getter that returns only slice state
 */
export type SliceGetter<TState> = () => TState;

/**
 * Slice configuration
 */
export interface SliceConfig<TState, TActions> {
  /** Slice name (used in DevTools action prefixes) */
  name: string;
  /** Initial state */
  initialState: TState;
  /** Action creators */
  actions: (set: SliceSetter<TState>, get: SliceGetter<TState>) => TActions;
}

// ============================================================================
// Slice Factory
// ============================================================================

/**
 * Create a type-safe slice with automatic action naming
 *
 * Features:
 * - Automatic action naming for DevTools (format: "sliceName/actionName")
 * - Immer-compatible state updates
 * - Slice-scoped getter that only returns slice state
 * - Full TypeScript inference
 *
 * @example
 * ```typescript
 * export const counterSlice = createSlice({
 *   name: 'counter',
 *   initialState: { count: 0 },
 *   actions: (set, get) => ({
 *     increment: () => {
 *       set((state) => { state.count += 1 }, 'increment');
 *     },
 *     decrement: () => {
 *       set((state) => { state.count -= 1 }, 'decrement');
 *     },
 *     incrementBy: (amount: number) => {
 *       set((state) => { state.count += amount }, 'incrementBy');
 *     },
 *     getCount: () => get().count,
 *   }),
 * });
 * ```
 */
export function createSlice<
  TState extends object,
  TActions extends Record<string, (...args: never[]) => unknown>,
  TStore extends TState & TActions = TState & TActions
>(
  config: SliceConfig<TState, TActions>
): StateCreator<
  TStore,
  [['zustand/immer', never], ['zustand/devtools', never]],
  [],
  TState & TActions
> {
  const { name, initialState, actions } = config;

  return (set, get) => {
    // Create named setter that prefixes action names with slice name
    const namedSet: SliceSetter<TState> = (
      updaterOrPartial: ((state: Draft<TState>) => void) | Partial<TState>,
      actionName?: string
    ) => {
      const type = actionName ? `${name}/${actionName}` : `${name}/update`;

      if (typeof updaterOrPartial === 'function') {
        // Immer-style updater function - the updater for TState is compatible with TStore which extends TState
        const storeUpdater = (state: Draft<TStore>): void => {
          updaterOrPartial(state as Draft<TState>);
        };
        (set as (
          updater: (state: Draft<TStore>) => void,
          replace: boolean,
          action: { type: string }
        ) => void)(storeUpdater, false, { type });
      } else {
        // Partial state update
        (set as (
          partial: Partial<TStore>,
          replace: boolean,
          action: { type: string }
        ) => void)(updaterOrPartial as Partial<TStore>, false, { type });
      }
    };

    // Create slice-scoped getter that extracts only slice state
    const sliceGet: SliceGetter<TState> = () => {
      const state = get();
      const sliceState = {} as TState;
      for (const key of Object.keys(initialState)) {
        (sliceState as Record<string, unknown>)[key] = (state as Record<string, unknown>)[key];
      }
      return sliceState;
    };

    // Create actions with named setter and scoped getter
    const sliceActions = actions(namedSet, sliceGet);

    return {
      ...initialState,
      ...sliceActions,
    };
  };
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Extract state type from a slice config
 */
export type SliceState<T> = T extends SliceConfig<infer S, unknown> ? S : never;

/**
 * Extract actions type from a slice config
 */
export type SliceActions<T> = T extends SliceConfig<unknown, infer A> ? A : never;

/**
 * Extract full slice type (state + actions) from a slice config
 */
export type SliceType<T> = T extends SliceConfig<infer S, infer A> ? S & A : never;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a simple action creator (for use outside createSlice)
 *
 * @example
 * ```typescript
 * const increment = createAction<number>('counter/increment', (set) => (amount) => {
 *   set((state) => { state.count += amount });
 * });
 * ```
 */
export function createAction<TPayload = void, TState = unknown>(
  _type: string,
  handler: (
    set: (updater: (state: Draft<TState>) => void) => void
  ) => TPayload extends void ? () => void : (payload: TPayload) => void
): TPayload extends void ? () => void : (payload: TPayload) => void {
  // This is a placeholder that will be bound to actual set when used
  return handler((_updater) => {
    // Intentionally no-op - action not bound to store
  }) as TPayload extends void ? () => void : (payload: TPayload) => void;
}

/**
 * Combine multiple slices into a single state creator
 *
 * @example
 * ```typescript
 * const useStore = create(
 *   combineSlices(counterSlice, uiSlice, settingsSlice)
 * );
 * ```
 */
export function combineSlices<T extends object>(
  ...slices: StateCreator<T, [['zustand/immer', never], ['zustand/devtools', never]], [], T>[]
): StateCreator<T, [['zustand/immer', never], ['zustand/devtools', never]], [], T> {
  return (...args) => {
    return slices.reduce((acc, slice) => ({
      ...acc,
      ...slice(...args),
    }), {} as T);
  };
}
