/**
 * Enhanced State Hook Utilities Module
 *
 * Provides utilities for creating enhanced state hooks with middleware,
 * validation, persistence, and advanced state management features.
 *
 * @module hooks/state
 * @example
 * ```typescript
 * const [state, setState] = useEnhancedState(initialState, {
 *   middleware: [logger, validator],
 *   persist: 'localStorage',
 * });
 * ```
 */

import { Dispatch, SetStateAction, useState, useCallback, useRef, useEffect } from 'react';

/**
 * State updater function type
 */
export type StateUpdater<T> = (prevState: T) => T;

/**
 * State setter type that accepts value or updater function
 */
export type StateSetter<T> = Dispatch<SetStateAction<T>>;

/**
 * State middleware function type
 */
export type StateMiddleware<T> = (
  nextState: T,
  prevState: T,
  action: SetStateAction<T>
) => T;

/**
 * State validator function type
 */
export type StateValidator<T> = (state: T) => boolean | string;

/**
 * Storage adapter interface for state persistence
 */
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Enhanced state options
 */
export interface EnhancedStateOptions<T> {
  /** Middleware functions to process state updates */
  middleware?: StateMiddleware<T>[];
  /** Validator function for state */
  validator?: StateValidator<T>;
  /** Storage key for persistence */
  persist?: string | { key: string; storage?: StorageAdapter };
  /** Callback when state changes */
  onChange?: (state: T, prevState: T) => void;
  /** Callback when validation fails */
  onValidationError?: (error: string, attemptedState: T) => void;
  /** Whether to enable undo/redo */
  history?: boolean | { maxSize?: number };
}

/**
 * Enhanced state result type
 */
export interface EnhancedStateResult<T> {
  state: T;
  setState: StateSetter<T>;
  reset: () => void;
  undo?: () => void;
  redo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

/**
 * Creates an enhanced state hook with middleware and validation
 *
 * @template T - State type
 * @param initialState - Initial state value or factory function
 * @param options - Enhanced state options
 * @returns Enhanced state result
 *
 * @example
 * ```typescript
 * const loggerMiddleware = (next, prev, action) => {
 *   console.log('State update:', { prev, next, action });
 *   return next;
 * };
 *
 * const { state, setState, reset } = useEnhancedState(
 *   { count: 0, name: '' },
 *   {
 *     middleware: [loggerMiddleware],
 *     validator: (state) => state.count >= 0 || 'Count must be positive',
 *     onChange: (state, prev) => console.log('Changed from', prev, 'to', state),
 *   }
 * );
 * ```
 */
export function useEnhancedState<T>(
  initialState: T | (() => T),
  options: EnhancedStateOptions<T> = {}
): EnhancedStateResult<T> {
  const initialValue = typeof initialState === 'function'
    ? (initialState as () => T)()
    : initialState;

  // Load persisted state if available
  const persistedState = options.persist
    ? loadPersistedState(options.persist, initialValue)
    : initialValue;

  const [state, setStateInternal] = useState<T>(persistedState);
  const prevStateRef = useRef<T>(persistedState);

  // History management
  const historyRef = useRef<{
    past: T[];
    future: T[];
  }>({ past: [], future: [] });

  const historyEnabled = options.history === true ||
    (typeof options.history === 'object' && options.history !== null);
  const maxHistorySize = typeof options.history === 'object' && options.history !== null
    ? options.history.maxSize || 50
    : 50;

  const setState: StateSetter<T> = useCallback(
    (action: SetStateAction<T>) => {
      setStateInternal(prevState => {
        // Resolve next state
        const nextState = typeof action === 'function'
          ? (action as StateUpdater<T>)(prevState)
          : action;

        // Apply middleware
        let processedState = nextState;
        if (options.middleware) {
          for (const middleware of options.middleware) {
            processedState = middleware(processedState, prevState, action);
          }
        }

        // Validate state
        if (options.validator) {
          const validationResult = options.validator(processedState);
          if (validationResult !== true) {
            const error = typeof validationResult === 'string'
              ? validationResult
              : 'Validation failed';

            if (options.onValidationError) {
              options.onValidationError(error, processedState);
            }

            return prevState; // Keep previous state on validation failure
          }
        }

        // Add to history
        if (historyEnabled && processedState !== prevState) {
          historyRef.current.past.push(prevState);
          if (historyRef.current.past.length > maxHistorySize) {
            historyRef.current.past.shift();
          }
          historyRef.current.future = [];
        }

        // Call onChange callback
        if (options.onChange && processedState !== prevState) {
          options.onChange(processedState, prevState);
        }

        prevStateRef.current = processedState;
        return processedState;
      });
    },
    [options, historyEnabled, maxHistorySize]
  );

  // Persist state when it changes
  useEffect(() => {
    if (options.persist) {
      persistState(options.persist, state);
    }
  }, [state, options.persist]);

  const reset = useCallback(() => {
    setState(initialValue);
  }, [initialValue, setState]);

  const undo = useCallback(() => {
    if (historyRef.current.past.length > 0) {
      const previous = historyRef.current.past.pop()!;
      historyRef.current.future.push(state);
      setStateInternal(previous);
    }
  }, [state]);

  const redo = useCallback(() => {
    if (historyRef.current.future.length > 0) {
      const next = historyRef.current.future.pop()!;
      historyRef.current.past.push(state);
      setStateInternal(next);
    }
  }, [state]);

  return {
    state,
    setState,
    reset,
    ...(historyEnabled && {
      undo,
      redo,
      canUndo: historyRef.current.past.length > 0,
      canRedo: historyRef.current.future.length > 0,
    }),
  };
}

/**
 * Creates a state hook with automatic validation
 *
 * @template T - State type
 * @param initialState - Initial state value
 * @param validator - Validator function
 * @returns State, setter, and validation error
 *
 * @example
 * ```typescript
 * const [age, setAge, error] = useValidatedState(0, (value) =>
 *   value >= 0 && value <= 120 || 'Age must be between 0 and 120'
 * );
 * ```
 */
export function useValidatedState<T>(
  initialState: T,
  validator: StateValidator<T>
): [T, StateSetter<T>, string | null] {
  const [error, setError] = useState<string | null>(null);

  const { state, setState } = useEnhancedState(initialState, {
    validator,
    onValidationError: (err) => setError(err),
  });

  const wrappedSetState: StateSetter<T> = useCallback(
    (action) => {
      setError(null);
      setState(action);
    },
    [setState]
  );

  return [state, wrappedSetState, error];
}

/**
 * Creates a state hook with automatic persistence to storage
 *
 * @template T - State type
 * @param key - Storage key
 * @param initialState - Initial state value
 * @param storage - Optional storage adapter (defaults to localStorage)
 * @returns State and setter
 *
 * @example
 * ```typescript
 * const [theme, setTheme] = usePersistedState('theme', 'light');
 * ```
 */
export function usePersistedState<T>(
  key: string,
  initialState: T,
  storage?: StorageAdapter
): [T, StateSetter<T>] {
  const { state, setState } = useEnhancedState(initialState, {
    persist: { key, storage },
  });

  return [state, setState];
}

/**
 * Creates a state hook with undo/redo functionality
 *
 * @template T - State type
 * @param initialState - Initial state value
 * @param maxHistorySize - Maximum history size
 * @returns State, setter, and history controls
 *
 * @example
 * ```typescript
 * const { state, setState, undo, redo, canUndo, canRedo } =
 *   useStateWithHistory({ text: '' }, 50);
 * ```
 */
export function useStateWithHistory<T>(
  initialState: T,
  maxHistorySize = 50
): Required<EnhancedStateResult<T>> {
  const result = useEnhancedState(initialState, {
    history: { maxSize: maxHistorySize },
  });

  return result as Required<EnhancedStateResult<T>>;
}

/**
 * Creates a state hook that batches updates
 *
 * @template T - State type
 * @param initialState - Initial state value
 * @param batchDelay - Delay in milliseconds before applying batched updates
 * @returns State, setter, and flush function
 *
 * @example
 * ```typescript
 * const [state, setState, flush] = useBatchedState({ items: [] }, 100);
 *
 * // Multiple updates are batched
 * setState(s => ({ items: [...s.items, item1] }));
 * setState(s => ({ items: [...s.items, item2] }));
 * // Both applied after 100ms, or immediately with flush()
 * ```
 */
export function useBatchedState<T>(
  initialState: T,
  batchDelay = 0
): [T, (action: SetStateAction<T>) => void, () => void] {
  const [state, setState] = useState(initialState);
  const pendingUpdates = useRef<SetStateAction<T>[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (pendingUpdates.current.length > 0) {
      setState(prevState => {
        let nextState = prevState;
        for (const action of pendingUpdates.current) {
          nextState = typeof action === 'function'
            ? (action as StateUpdater<T>)(nextState)
            : action;
        }
        return nextState;
      });
      pendingUpdates.current = [];
    }
  }, []);

  const batchedSetState = useCallback(
    (action: SetStateAction<T>) => {
      pendingUpdates.current.push(action);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(flush, batchDelay);
    },
    [batchDelay, flush]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [state, batchedSetState, flush];
}

/**
 * Creates a state hook with computed derived state
 *
 * @template TState - State type
 * @template TDerived - Derived state type
 * @param initialState - Initial state value
 * @param derive - Function to derive state
 * @returns State, setter, and derived state
 *
 * @example
 * ```typescript
 * const [items, setItems, total] = useDerivedState(
 *   [] as Item[],
 *   (items) => items.reduce((sum, item) => sum + item.price, 0)
 * );
 * ```
 */
export function useDerivedState<TState, TDerived>(
  initialState: TState,
  derive: (state: TState) => TDerived
): [TState, StateSetter<TState>, TDerived] {
  const [state, setState] = useState(initialState);
  const derived = derive(state);

  return [state, setState, derived];
}

/**
 * Creates a state hook that automatically resets after a delay
 *
 * @template T - State type
 * @param initialState - Initial state value
 * @param resetDelay - Delay in milliseconds before reset
 * @returns State and setter
 *
 * @example
 * ```typescript
 * const [message, setMessage] = useAutoResetState('', 3000);
 *
 * // Message automatically resets to '' after 3 seconds
 * setMessage('Success!');
 * ```
 */
export function useAutoResetState<T>(
  initialState: T,
  resetDelay: number
): [T, StateSetter<T>] {
  const [state, setState] = useState(initialState);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const setStateWithReset: StateSetter<T> = useCallback(
    (action: SetStateAction<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setState(action);

      timeoutRef.current = setTimeout(() => {
        setState(initialState);
      }, resetDelay);
    },
    [initialState, resetDelay]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [state, setStateWithReset];
}

/**
 * Creates a toggle state hook for boolean values
 *
 * @param initialValue - Initial boolean value
 * @returns Value, toggle function, set true, and set false
 *
 * @example
 * ```typescript
 * const [isOpen, toggle, open, close] = useToggle(false);
 * ```
 */
export function useToggle(
  initialValue = false
): [boolean, () => void, () => void, () => void] {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => setValue(v => !v), []);
  const setTrue = useCallback(() => setValue(true), []);
  const setFalse = useCallback(() => setValue(false), []);

  return [value, toggle, setTrue, setFalse];
}

/**
 * Creates a counter state hook with increment and decrement
 *
 * @param initialValue - Initial counter value
 * @param step - Step size for increment/decrement
 * @returns Counter value and control functions
 *
 * @example
 * ```typescript
 * const { count, increment, decrement, reset, set } = useCounter(0, 1);
 * ```
 */
export function useCounter(
  initialValue = 0,
  step = 1
): {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
  set: (value: number) => void;
} {
  const [count, setCount] = useState(initialValue);

  const increment = useCallback(() => setCount(c => c + step), [step]);
  const decrement = useCallback(() => setCount(c => c - step), [step]);
  const reset = useCallback(() => setCount(initialValue), [initialValue]);
  const set = useCallback((value: number) => setCount(value), []);

  return { count, increment, decrement, reset, set };
}

/**
 * Helper function to load persisted state from storage
 */
function loadPersistedState<T>(
  persist: string | { key: string; storage?: StorageAdapter },
  defaultValue: T
): T {
  try {
    const key = typeof persist === 'string' ? persist : persist.key;
    const storage = typeof persist === 'object' && persist.storage
      ? persist.storage
      : (typeof window !== 'undefined' ? window.localStorage : null);

    if (!storage) return defaultValue;

    const item = storage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn('Failed to load persisted state:', error);
    return defaultValue;
  }
}

/**
 * Helper function to persist state to storage
 */
function persistState<T>(
  persist: string | { key: string; storage?: StorageAdapter },
  state: T
): void {
  try {
    const key = typeof persist === 'string' ? persist : persist.key;
    const storage = typeof persist === 'object' && persist.storage
      ? persist.storage
      : (typeof window !== 'undefined' ? window.localStorage : null);

    if (!storage) return;

    storage.setItem(key, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to persist state:', error);
  }
}

/**
 * Creates middleware that logs state changes
 *
 * @template T - State type
 * @param prefix - Optional log prefix
 * @returns Logging middleware
 *
 * @example
 * ```typescript
 * const { state, setState } = useEnhancedState(initialState, {
 *   middleware: [createLoggingMiddleware('MyComponent')],
 * });
 * ```
 */
export function createLoggingMiddleware<T>(
  prefix = 'State'
): StateMiddleware<T> {
  return (nextState, prevState, action) => {
    console.group(`${prefix} Update`);
    console.log('Previous:', prevState);
    console.log('Action:', action);
    console.log('Next:', nextState);
    console.groupEnd();
    return nextState;
  };
}

/**
 * Creates middleware that freezes state in development
 *
 * @template T - State type
 * @returns Freezing middleware
 *
 * @example
 * ```typescript
 * const { state, setState } = useEnhancedState(initialState, {
 *   middleware: [createFreezingMiddleware()],
 * });
 * ```
 */
export function createFreezingMiddleware<T>(): StateMiddleware<T> {
  return (nextState) => {
    if (process.env.NODE_ENV !== 'production' && typeof nextState === 'object' && nextState !== null) {
      return Object.freeze(nextState) as T;
    }
    return nextState;
  };
}
