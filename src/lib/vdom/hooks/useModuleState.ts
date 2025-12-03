/**
 * @file useModuleState Hook
 * @module vdom/hooks/useModuleState
 * @description Hook for managing isolated module state with type safety,
 * persistence support, and state synchronization capabilities.
 *
 * @author Agent 5 - PhD Virtual DOM Expert
 * @version 1.0.0
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { type UseModuleStateReturn } from '../types';
import { useModuleContext } from '../ModuleBoundary';

/**
 * Options for useModuleState hook.
 */
export interface UseModuleStateOptions<T> {
  /** Initial state value */
  initialValue: T;
  /** Storage key for persistence */
  storageKey?: string;
  /** Whether to persist to sessionStorage instead of localStorage */
  useSessionStorage?: boolean;
  /** Custom serializer */
  serialize?: (value: T) => string;
  /** Custom deserializer */
  deserialize?: (value: string) => T;
  /** Validation function */
  validate?: (value: unknown) => value is T;
  /** Callback when state changes */
  onChange?: (value: T, previousValue: T) => void;
}

/**
 * Hook for managing isolated module state.
 * Provides state isolation within module boundaries with optional persistence.
 *
 * @param key - State key (unique within module)
 * @param options - State options
 * @returns State value and setter utilities
 * @throws Error if used outside a ModuleBoundary
 *
 * @example
 * ```tsx
 * function Counter() {
 *   const { state, setState } = useModuleState('count', {
 *     initialValue: 0,
 *     storageKey: 'counter-value',
 *   });
 *
 *   return (
 *     <div>
 *       <p>Count: {state}</p>
 *       <button onClick={() => setState(state + 1)}>Increment</button>
 *       <button onClick={() => setState(prev => prev - 1)}>Decrement</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useModuleState<T>(
  key: string,
  options: UseModuleStateOptions<T>
): UseModuleStateReturn<T> {
  const context = useModuleContext();
  const {
    initialValue,
    storageKey,
    useSessionStorage = false,
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    validate,
    onChange,
  } = options;

  // Track previous value for onChange callback
  const previousValueRef = useRef<T>(initialValue);

  // Initialize state from context or storage
  const [localState, setLocalState] = useState<T>(() => {
    // Check module context first
    const contextValue = context.state.moduleState.get(key);
    if (contextValue !== undefined) {
      return contextValue as T;
    }

    // Check storage if persistence is enabled
    if (storageKey !== null && storageKey !== undefined && storageKey !== '') {
      try {
        const storage = useSessionStorage ? sessionStorage : localStorage;
        const stored = storage.getItem(storageKey);
        if (stored !== null && stored !== undefined && stored !== '') {
          const parsed: unknown = deserialize(stored);
          if (!validate || validate(parsed as T)) {
            return parsed as T;
          }
        }
      } catch (error) {
        console.warn(`Failed to load state from storage: ${storageKey}`, error);
      }
    }

    return initialValue;
  });

  const [error, setError] = useState<Error | null>(null);
  const isLoading = false; // State is loaded synchronously

  // Sync with module context
  useEffect(() => {
    context.dispatch({
      type: 'SET_STATE',
      key,
      value: localState,
    });
  }, [context, key, localState]);

  // Persist to storage when state changes
  useEffect(() => {
    if (storageKey === null || storageKey === undefined || storageKey === '') {
      return;
    }

    try {
      const storage = useSessionStorage ? sessionStorage : localStorage;
      storage.setItem(storageKey, serialize(localState));
    } catch (error) {
      console.warn(`Failed to persist state to storage: ${storageKey}`, error);
    }
  }, [localState, storageKey, serialize, useSessionStorage]);

  // Call onChange when state changes
  useEffect(() => {
    if (localState !== previousValueRef.current) {
      onChange?.(localState, previousValueRef.current);
      previousValueRef.current = localState;
    }
  }, [localState, onChange]);

  // Set state with validation
  const setState = useCallback(
    (valueOrUpdater: T | ((prev: T) => T)) => {
      setLocalState((prev) => {
        const newValue =
          typeof valueOrUpdater === 'function'
            ? (valueOrUpdater as (prev: T) => T)(prev)
            : valueOrUpdater;

        if (validate && !validate(newValue)) {
          setError(new Error(`Invalid state value for key: ${key}`));
          return prev;
        }

        setError(null);
        return newValue;
      });
    },
    [key, validate]
  );

  // Merge partial state (for object states)
  const mergeState = useCallback(
    (partial: Partial<T>) => {
      setLocalState((prev) => {
        if (typeof prev !== 'object' || prev === null) {
          console.warn('mergeState called on non-object state');
          return prev;
        }

        const newValue = { ...prev, ...partial } as T;

        if (validate && !validate(newValue)) {
          setError(new Error(`Invalid merged state for key: ${key}`));
          return prev;
        }

        setError(null);
        return newValue;
      });
    },
    [key, validate]
  );

  // Reset to initial value
  const resetState = useCallback(() => {
    setLocalState(initialValue);
    setError(null);

    // Clear from storage
    if (storageKey !== null && storageKey !== undefined && storageKey !== '') {
      try {
        const storage = useSessionStorage ? sessionStorage : localStorage;
        storage.removeItem(storageKey);
      } catch {
        // Ignore storage errors
      }
    }
  }, [initialValue, storageKey, useSessionStorage]);

  // Return memoized object
  return useMemo<UseModuleStateReturn<T>>(
    () => ({
      state: localState,
      setState,
      mergeState,
      resetState,
      isLoading,
      error,
    }),
    [localState, setState, mergeState, resetState, isLoading, error]
  );
}

/**
 * Simplified hook for module state without persistence.
 * @param key - State key
 * @param initialValue - Initial value
 * @returns State and setter
 *
 * @example
 * ```tsx
 * const [name, setName] = useSimpleModuleState('userName', '');
 * ```
 */
export function useSimpleModuleState<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const { state, setState } = useModuleState(key, { initialValue });
  return [state, setState];
}

/**
 * Hook for boolean module state with toggle functionality.
 * @param key - State key
 * @param initialValue - Initial boolean value
 * @returns Boolean state with utilities
 *
 * @example
 * ```tsx
 * const { value, toggle, setTrue, setFalse } = useBooleanModuleState('isOpen', false);
 * ```
 */
export function useBooleanModuleState(
  key: string,
  initialValue: boolean = false
): {
  value: boolean;
  toggle: () => void;
  setTrue: () => void;
  setFalse: () => void;
  setValue: (value: boolean) => void;
} {
  const { state, setState } = useModuleState(key, { initialValue });

  const toggle = useCallback(() => {
    setState((prev) => !prev);
  }, [setState]);

  const setTrue = useCallback(() => {
    setState(true);
  }, [setState]);

  const setFalse = useCallback(() => {
    setState(false);
  }, [setState]);

  return useMemo(
    () => ({
      value: state,
      toggle,
      setTrue,
      setFalse,
      setValue: setState,
    }),
    [state, toggle, setTrue, setFalse, setState]
  );
}

/**
 * Hook for array module state with common array operations.
 * @param key - State key
 * @param initialValue - Initial array value
 * @returns Array state with utilities
 *
 * @example
 * ```tsx
 * const { items, add, remove, update, clear } = useArrayModuleState('todos', []);
 *
 * // Add item
 * add({ id: '1', text: 'New todo' });
 *
 * // Remove item
 * remove((item) => item.id === '1');
 * ```
 */
export function useArrayModuleState<T>(
  key: string,
  initialValue: T[] = []
): {
  items: T[];
  add: (item: T) => void;
  addMany: (items: T[]) => void;
  remove: (predicate: (item: T) => boolean) => void;
  update: (predicate: (item: T) => boolean, updater: (item: T) => T) => void;
  clear: () => void;
  setItems: (items: T[] | ((prev: T[]) => T[])) => void;
} {
  const { state, setState, resetState } = useModuleState(key, { initialValue });

  const add = useCallback(
    (item: T) => {
      setState((prev) => [...prev, item]);
    },
    [setState]
  );

  const addMany = useCallback(
    (items: T[]) => {
      setState((prev) => [...prev, ...items]);
    },
    [setState]
  );

  const remove = useCallback(
    (predicate: (item: T) => boolean) => {
      setState((prev) => prev.filter((item) => !predicate(item)));
    },
    [setState]
  );

  const update = useCallback(
    (predicate: (item: T) => boolean, updater: (item: T) => T) => {
      setState((prev) => prev.map((item) => (predicate(item) ? updater(item) : item)));
    },
    [setState]
  );

  return useMemo(
    () => ({
      items: state,
      add,
      addMany,
      remove,
      update,
      clear: resetState,
      setItems: setState,
    }),
    [state, add, addMany, remove, update, resetState, setState]
  );
}

/**
 * Hook for map/record module state.
 * @param key - State key
 * @param initialValue - Initial record value
 * @returns Record state with utilities
 */
export function useRecordModuleState<K extends string, V>(
  key: string,
  initialValue: Record<K, V> = {} as Record<K, V>
): {
  record: Record<K, V>;
  get: (key: K) => V | undefined;
  set: (key: K, value: V) => void;
  remove: (key: K) => void;
  has: (key: K) => boolean;
  clear: () => void;
  setRecord: (record: Record<K, V>) => void;
} {
  const { state, setState, resetState } = useModuleState(key, { initialValue });

  const get = useCallback((recordKey: K): V | undefined => state[recordKey], [state]);

  const set = useCallback(
    (recordKey: K, value: V) => {
      setState((prev) => ({ ...prev, [recordKey]: value }));
    },
    [setState]
  );

  const remove = useCallback(
    (recordKey: K) => {
      setState((prev) => {
        const next = { ...prev };
        delete next[recordKey];
        return next;
      });
    },
    [setState]
  );

  const has = useCallback((recordKey: K): boolean => recordKey in state, [state]);

  return useMemo(
    () => ({
      record: state,
      get,
      set,
      remove,
      has,
      clear: resetState,
      setRecord: setState,
    }),
    [state, get, set, remove, has, resetState, setState]
  );
}
