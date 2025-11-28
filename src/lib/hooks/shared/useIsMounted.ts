/**
 * @file useIsMounted Hook
 * @description Utility hook to track component mounted state and prevent updates after unmount
 * 
 * This hook is essential for preventing memory leaks and "Can't perform a React state update
 * on an unmounted component" warnings. Use it to guard async operations and state updates.
 * 
 * @example
 * ```tsx
 * function DataFetcher() {
 *   const isMounted = useIsMounted();
 *   const [data, setData] = useState(null);
 * 
 *   useEffect(() => {
 *     fetchData().then(result => {
 *       if (isMounted()) {
 *         setData(result);
 *       }
 *     });
 *   }, [isMounted]);
 * 
 *   return <div>{data}</div>;
 * }
 * ```
 */

import { useRef, useEffect, useCallback } from 'react';

/**
 * Hook to track if component is currently mounted
 * 
 * Returns a function that returns true if the component is still mounted.
 * This is useful for preventing state updates on unmounted components.
 * 
 * @returns Function that returns true if component is mounted
 */
export function useIsMounted(): () => boolean {
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return useCallback(() => mountedRef.current, []);
}

/**
 * Hook that provides both a check function and a guard wrapper
 * 
 * @example
 * ```tsx
 * const { isMounted, ifMounted } = useMountedState();
 * 
 * // Direct check
 * if (isMounted()) {
 *   setState(value);
 * }
 * 
 * // Guard wrapper
 * ifMounted(() => setState(value));
 * ```
 */
export function useMountedState(): {
  isMounted: () => boolean;
  ifMounted: <T>(fn: () => T) => T | undefined;
} {
  const isMounted = useIsMounted();

  const ifMounted = useCallback(
    <T>(fn: () => T): T | undefined => {
      if (isMounted()) {
        return fn();
      }
      return undefined;
    },
    [isMounted]
  );

  return { isMounted, ifMounted };
}
