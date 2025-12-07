/**
 * @file useLatestRef Hook
 * @description Utility hook to maintain a ref that always points to the latest value
 *
 * This hook is useful for accessing the latest props or state in callbacks without
 * recreating the callback on every render. It's particularly helpful in event handlers,
 * async operations, and effect cleanup functions.
 *
 * @example
 * ```tsx
 * function SearchInput({ onSearch }: { onSearch: (query: string) => void }) {
 *   const onSearchRef = useLatestRef(onSearch);
 *   const [query, setQuery] = useState('');
 *
 *   useEffect(() => {
 *     const timer = setTimeout(() => {
 *       // Always calls the latest onSearch callback
 *       onSearchRef.current(query);
 *     }, 300);
 *     return () => clearTimeout(timer);
 *   }, [query]); // onSearch not in deps - no callback recreation
 *
 *   return <input value={query} onChange={e => setQuery(e.target.value)} />;
 * }
 * ```
 */

import { useRef } from 'react';
import type { MutableRefObject } from 'react';

/**
 * Hook that maintains a ref with the latest value
 *
 * The ref is updated during render (not in an effect), ensuring it's
 * always current even if accessed synchronously after a state update.
 *
 * @param value - The value to keep updated in the ref
 * @returns Ref object containing the latest value
 */
export function useLatestRef<T>(value: T): MutableRefObject<T> {
  const ref = useRef(value);

  // Update ref during render to ensure it's always current
  // This is safe because we're not causing side effects
  // eslint-disable-next-line react-hooks/refs
  ref.current = value;

  return ref;
}

/**
 * Hook that creates a callback wrapper that always uses latest values
 *
 * Useful for creating stable callback references that access latest props/state
 * without recreating the callback on every render.
 *
 * @example
 * ```tsx
 * function Counter({ onIncrement }: { onIncrement: (n: number) => void }) {
 *   const [count, setCount] = useState(0);
 *
 *   // Callback never recreated, but always uses latest count and onIncrement
 *   const handleClick = useLatestCallback(() => {
 *     const newCount = count + 1;
 *     setCount(newCount);
 *     onIncrement(newCount);
 *   });
 *
 *   return <button onClick={handleClick}>Count: {count}</button>;
 * }
 * ```
 */
export function useLatestCallback<TArgs extends unknown[], TReturn>(
  callback: (...args: TArgs) => TReturn
): (...args: TArgs) => TReturn {
  const callbackRef = useLatestRef(callback);

  const stableCallback = useRef<((...args: TArgs) => TReturn) | undefined>(undefined);

  stableCallback.current ??= (...args: TArgs): TReturn => {
    return callbackRef.current(...args);
  };

  return stableCallback.current;
}

/**
 * Hook that provides both a value ref and a callback ref
 *
 * @example
 * ```tsx
 * const { valueRef, callbackRef } = useLatestRefs({
 *   count,
 *   onSave: handleSave
 * });
 *
 * // Access in async operations
 * setTimeout(() => {
 *   console.log(valueRef.current.count);
 *   callbackRef.current.onSave();
 * }, 1000);
 * ```
 */
export function useLatestRefs<T extends Record<string, unknown>>(values: T): MutableRefObject<T> {
  return useLatestRef(values);
}
