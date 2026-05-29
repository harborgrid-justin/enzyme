/**
 * @file State Management Hooks
 * @description A collection of high-impact hooks for managing local component
 * state with rich, type-safe APIs: toggles, counters, step wizards, undo/redo
 * history, and ergonomic collection helpers (list, map, set, queue).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ============================================================================
// useToggle
// ============================================================================

/**
 * Manage a boolean value with a convenient toggle/set function.
 *
 * @param initialValue - Initial boolean state (default `false`).
 * @returns A tuple of the current value and a setter that toggles when called
 *   with no argument, or sets explicitly when passed a boolean.
 *
 * @example
 * const [open, toggle] = useToggle();
 * toggle();      // flips the value
 * toggle(true);  // forces the value to true
 */
export function useToggle(initialValue = false): [boolean, (next?: boolean) => void] {
  const [value, setValue] = useState<boolean>(initialValue);

  const toggle = useCallback((next?: boolean) => {
    setValue((prev) => (typeof next === 'boolean' ? next : !prev));
  }, []);

  return [value, toggle];
}

// ============================================================================
// usePrevious
// ============================================================================

/**
 * Track the previous value of a variable across renders.
 *
 * @param value - The current value.
 * @returns The value from the previous render, or `undefined` on first render.
 */
export function usePrevious<T>(value: T): T | undefined {
  const [current, setCurrent] = useState<T>(value);
  const [previous, setPrevious] = useState<T | undefined>(undefined);

  // Derive the previous value during render (React's recommended pattern for
  // adjusting state in response to a prop/value change) so we never read a ref
  // on the render path.
  if (!Object.is(current, value)) {
    setPrevious(current);
    setCurrent(value);
  }

  return previous;
}

// ============================================================================
// useCounter
// ============================================================================

/** Options for {@link useCounter}. */
export interface UseCounterOptions {
  /** Minimum allowed value (inclusive). */
  min?: number;
  /** Maximum allowed value (inclusive). */
  max?: number;
  /** Default amount applied by `increment`/`decrement` (default `1`). */
  step?: number;
}

/** Result of {@link useCounter}. */
export interface UseCounterResult {
  /** Current count. */
  count: number;
  /** Increase the count by `amount` (or the configured step). */
  increment: (amount?: number) => void;
  /** Decrease the count by `amount` (or the configured step). */
  decrement: (amount?: number) => void;
  /** Set the count to an explicit value (clamped to min/max). */
  set: (value: number) => void;
  /** Reset the count back to the initial value. */
  reset: () => void;
}

/**
 * Manage a numeric counter with optional bounds and step.
 *
 * @param initialValue - Starting value (default `0`), clamped to bounds.
 * @param options - Optional `min`, `max`, and `step` configuration.
 */
export function useCounter(initialValue = 0, options: UseCounterOptions = {}): UseCounterResult {
  const { min = -Infinity, max = Infinity, step = 1 } = options;

  const clamp = useCallback(
    (value: number): number => Math.min(max, Math.max(min, value)),
    [min, max]
  );

  const [count, setCount] = useState<number>(() => clamp(initialValue));

  const increment = useCallback(
    (amount: number = step) => setCount((prev) => clamp(prev + amount)),
    [clamp, step]
  );

  const decrement = useCallback(
    (amount: number = step) => setCount((prev) => clamp(prev - amount)),
    [clamp, step]
  );

  const set = useCallback((value: number) => setCount(clamp(value)), [clamp]);

  const reset = useCallback(() => setCount(clamp(initialValue)), [clamp, initialValue]);

  return useMemo(
    () => ({ count, increment, decrement, set, reset }),
    [count, increment, decrement, set, reset]
  );
}

// ============================================================================
// useStep
// ============================================================================

/** Result of {@link useStep}. */
export interface UseStepResult {
  /** Current step (1-based). */
  step: number;
  /** Jump to a specific step (clamped to `[1, maxStep]`). */
  setStep: (step: number) => void;
  /** Advance to the next step if possible. */
  next: () => void;
  /** Go back to the previous step if possible. */
  prev: () => void;
  /** Reset back to step 1. */
  reset: () => void;
  /** Whether a next step exists. */
  canGoNext: boolean;
  /** Whether a previous step exists. */
  canGoPrev: boolean;
  /** Whether the current step is the first. */
  isFirst: boolean;
  /** Whether the current step is the last. */
  isLast: boolean;
}

/**
 * Drive a multi-step flow (wizard, onboarding, carousel) with guarded
 * navigation between `1` and `maxStep`.
 *
 * @param maxStep - Total number of steps (minimum `1`).
 */
export function useStep(maxStep: number): UseStepResult {
  const total = Math.max(1, Math.floor(maxStep));
  const [step, setStepState] = useState(1);

  const clamp = useCallback((value: number) => Math.min(total, Math.max(1, value)), [total]);

  const setStep = useCallback((value: number) => setStepState(clamp(value)), [clamp]);
  const next = useCallback(() => setStepState((prev) => clamp(prev + 1)), [clamp]);
  const prev = useCallback(() => setStepState((prev) => clamp(prev - 1)), [clamp]);
  const reset = useCallback(() => setStepState(1), []);

  return useMemo(
    () => ({
      step,
      setStep,
      next,
      prev,
      reset,
      canGoNext: step < total,
      canGoPrev: step > 1,
      isFirst: step === 1,
      isLast: step === total,
    }),
    [step, setStep, next, prev, reset, total]
  );
}

// ============================================================================
// useStateHistory (undo / redo)
// ============================================================================

/** Result of {@link useStateHistory}. */
export interface UseStateHistoryResult<T> {
  /** Current value. */
  state: T;
  /** Push a new value onto the history, truncating any redo branch. */
  set: (value: T | ((prev: T) => T)) => void;
  /** Step back to the previous value. */
  undo: () => void;
  /** Step forward to the next value. */
  redo: () => void;
  /** Whether an undo is available. */
  canUndo: boolean;
  /** Whether a redo is available. */
  canRedo: boolean;
  /** Full history snapshot (oldest → newest). */
  history: readonly T[];
  /** Clear history and reset to the provided value. */
  reset: (value?: T) => void;
}

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

/**
 * Manage a value with full undo/redo history.
 *
 * @param initialValue - The starting value.
 * @param capacity - Maximum number of past entries to retain (default `100`).
 */
export function useStateHistory<T>(initialValue: T, capacity = 100): UseStateHistoryResult<T> {
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialValue,
    future: [],
  });

  const set = useCallback(
    (value: T | ((prev: T) => T)) => {
      setHistory((current) => {
        const nextValue =
          typeof value === 'function' ? (value as (prev: T) => T)(current.present) : value;
        if (Object.is(nextValue, current.present)) return current;
        const past = [...current.past, current.present];
        if (past.length > capacity) past.shift();
        return { past, present: nextValue, future: [] };
      });
    },
    [capacity]
  );

  const undo = useCallback(() => {
    setHistory((current) => {
      if (current.past.length === 0) return current;
      const previous = current.past[current.past.length - 1] as T;
      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((current) => {
      if (current.future.length === 0) return current;
      const next = current.future[0] as T;
      return {
        past: [...current.past, current.present],
        present: next,
        future: current.future.slice(1),
      };
    });
  }, []);

  const reset = useCallback(
    (value?: T) => {
      setHistory({
        past: [],
        present: value ?? initialValue,
        future: [],
      });
    },
    [initialValue]
  );

  return useMemo(
    () => ({
      state: history.present,
      set,
      undo,
      redo,
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
      history: [...history.past, history.present],
      reset,
    }),
    [history, set, undo, redo, reset]
  );
}

// ============================================================================
// useList
// ============================================================================

/** Result of {@link useList}. */
export interface UseListResult<T> {
  /** Current list. */
  list: T[];
  /** Replace the entire list. */
  set: (list: T[]) => void;
  /** Append one or more items. */
  push: (...items: T[]) => void;
  /** Remove the item at `index`. */
  removeAt: (index: number) => void;
  /** Insert `item` at `index`. */
  insertAt: (index: number, item: T) => void;
  /** Replace the item at `index`. */
  updateAt: (index: number, item: T) => void;
  /** Move an item from one index to another. */
  move: (from: number, to: number) => void;
  /** Keep only items matching the predicate. */
  filter: (predicate: (item: T, index: number) => boolean) => void;
  /** Sort the list in place using an optional comparator. */
  sort: (compareFn?: (a: T, b: T) => number) => void;
  /** Remove all items. */
  clear: () => void;
  /** Reset back to the initial list. */
  reset: () => void;
}

/**
 * Manage an array with a rich set of immutable update helpers.
 *
 * @param initialList - The starting array (default `[]`).
 */
export function useList<T>(initialList: T[] = []): UseListResult<T> {
  const [list, setList] = useState<T[]>(initialList);

  const set = useCallback((next: T[]) => setList(next), []);
  const push = useCallback((...items: T[]) => setList((prev) => [...prev, ...items]), []);
  const removeAt = useCallback(
    (index: number) => setList((prev) => prev.filter((_, i) => i !== index)),
    []
  );
  const insertAt = useCallback(
    (index: number, item: T) =>
      setList((prev) => {
        const next = [...prev];
        next.splice(index, 0, item);
        return next;
      }),
    []
  );
  const updateAt = useCallback(
    (index: number, item: T) =>
      setList((prev) => prev.map((existing, i) => (i === index ? item : existing))),
    []
  );
  const move = useCallback(
    (from: number, to: number) =>
      setList((prev) => {
        if (from < 0 || from >= prev.length || to < 0 || to >= prev.length) return prev;
        const next = [...prev];
        const [item] = next.splice(from, 1);
        next.splice(to, 0, item as T);
        return next;
      }),
    []
  );
  const filter = useCallback(
    (predicate: (item: T, index: number) => boolean) => setList((prev) => prev.filter(predicate)),
    []
  );
  const sort = useCallback(
    (compareFn?: (a: T, b: T) => number) => setList((prev) => [...prev].sort(compareFn)),
    []
  );
  const clear = useCallback(() => setList([]), []);
  const reset = useCallback(() => setList(initialList), [initialList]);

  return useMemo(
    () => ({ list, set, push, removeAt, insertAt, updateAt, move, filter, sort, clear, reset }),
    [list, set, push, removeAt, insertAt, updateAt, move, filter, sort, clear, reset]
  );
}

// ============================================================================
// useMap
// ============================================================================

/** Result of {@link useMap}. */
export interface UseMapResult<K, V> {
  /** Current map (a fresh instance on every change). */
  map: Map<K, V>;
  /** Set a key/value pair. */
  set: (key: K, value: V) => void;
  /** Set many entries at once. */
  setAll: (entries: Iterable<readonly [K, V]>) => void;
  /** Remove a key. */
  remove: (key: K) => void;
  /** Read a value. */
  get: (key: K) => V | undefined;
  /** Whether a key exists. */
  has: (key: K) => boolean;
  /** Remove all entries. */
  clear: () => void;
  /** Reset to the initial entries. */
  reset: () => void;
}

/**
 * Manage a `Map` with immutable update helpers.
 *
 * @param initialEntries - Optional initial entries.
 */
export function useMap<K, V>(initialEntries?: Iterable<readonly [K, V]>): UseMapResult<K, V> {
  const [map, setMap] = useState<Map<K, V>>(() => new Map(initialEntries));

  const set = useCallback((key: K, value: V) => {
    setMap((prev) => {
      const next = new Map(prev);
      next.set(key, value);
      return next;
    });
  }, []);

  const setAll = useCallback((entries: Iterable<readonly [K, V]>) => {
    setMap((prev) => {
      const next = new Map(prev);
      for (const [key, value] of entries) next.set(key, value);
      return next;
    });
  }, []);

  const remove = useCallback((key: K) => {
    setMap((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const get = useCallback((key: K) => map.get(key), [map]);
  const has = useCallback((key: K) => map.has(key), [map]);
  const clear = useCallback(() => setMap(new Map()), []);
  const reset = useCallback(() => setMap(new Map(initialEntries)), [initialEntries]);

  return useMemo(
    () => ({ map, set, setAll, remove, get, has, clear, reset }),
    [map, set, setAll, remove, get, has, clear, reset]
  );
}

// ============================================================================
// useSet
// ============================================================================

/** Result of {@link useSet}. */
export interface UseSetResult<T> {
  /** Current set (a fresh instance on every change). */
  set: Set<T>;
  /** Add a value. */
  add: (value: T) => void;
  /** Remove a value. */
  remove: (value: T) => void;
  /** Add the value if absent, otherwise remove it. */
  toggle: (value: T) => void;
  /** Whether a value is present. */
  has: (value: T) => boolean;
  /** Remove all values. */
  clear: () => void;
  /** Reset to the initial values. */
  reset: () => void;
}

/**
 * Manage a `Set` with immutable update helpers.
 *
 * @param initialValues - Optional initial values.
 */
export function useSet<T>(initialValues?: Iterable<T>): UseSetResult<T> {
  const [set, setSet] = useState<Set<T>>(() => new Set(initialValues));

  const add = useCallback((value: T) => {
    setSet((prev) => {
      if (prev.has(value)) return prev;
      const next = new Set(prev);
      next.add(value);
      return next;
    });
  }, []);

  const remove = useCallback((value: T) => {
    setSet((prev) => {
      if (!prev.has(value)) return prev;
      const next = new Set(prev);
      next.delete(value);
      return next;
    });
  }, []);

  const toggle = useCallback((value: T) => {
    setSet((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }, []);

  const has = useCallback((value: T) => set.has(value), [set]);
  const clear = useCallback(() => setSet(new Set()), []);
  const reset = useCallback(() => setSet(new Set(initialValues)), [initialValues]);

  return useMemo(
    () => ({ set, add, remove, toggle, has, clear, reset }),
    [set, add, remove, toggle, has, clear, reset]
  );
}

// ============================================================================
// useQueue
// ============================================================================

/** Result of {@link useQueue}. */
export interface UseQueueResult<T> {
  /** Current queue contents (front → back). */
  queue: T[];
  /** Enqueue an item at the back. */
  add: (item: T) => void;
  /** Dequeue and return the front item (or `undefined` when empty). */
  remove: () => T | undefined;
  /** The item at the front without removing it. */
  first: T | undefined;
  /** The item at the back. */
  last: T | undefined;
  /** Number of items. */
  size: number;
  /** Remove all items. */
  clear: () => void;
}

/**
 * A simple FIFO queue backed by component state.
 *
 * @param initialQueue - Optional initial items.
 */
export function useQueue<T>(initialQueue: T[] = []): UseQueueResult<T> {
  const [queue, setQueue] = useState<T[]>(initialQueue);
  const queueRef = useRef(queue);

  // Mirror the committed queue into a ref (outside render) so `remove` can
  // synchronously return the item it dequeues.
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const add = useCallback((item: T) => setQueue((prev) => [...prev, item]), []);

  const remove = useCallback((): T | undefined => {
    const [first] = queueRef.current;
    if (first === undefined && queueRef.current.length === 0) return undefined;
    setQueue((prev) => prev.slice(1));
    return first;
  }, []);

  const clear = useCallback(() => setQueue([]), []);

  return useMemo(
    () => ({
      queue,
      add,
      remove,
      first: queue[0],
      last: queue[queue.length - 1],
      size: queue.length,
      clear,
    }),
    [queue, add, remove, clear]
  );
}
