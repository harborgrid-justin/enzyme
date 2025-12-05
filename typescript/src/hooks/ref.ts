/**
 * Enhanced Ref Utilities Module
 *
 * Provides utilities for working with React refs including forwarding,
 * combining, callbacks, and type-safe ref management.
 *
 * @module hooks/ref
 * @example
 * ```typescript
 * const combinedRef = useCombinedRefs(ref1, ref2, ref3);
 * const callbackRef = useCallbackRef((node) => {
 *   // Do something with the node
 * });
 * ```
 */

import {
  MutableRefObject,
  RefCallback,
  ForwardedRef,
  useRef,
  useEffect,
  useCallback,
  useState,
} from 'react';

/**
 * Ref value type - can be a ref object or callback
 */
export type RefValue<T> = MutableRefObject<T> | RefCallback<T> | ForwardedRef<T> | null;

/**
 * Ref change callback type
 */
export type RefChangeCallback<T> = (current: T | null, previous: T | null) => void;

/**
 * Combines multiple refs into a single ref callback
 *
 * @template T - Element or value type
 * @param refs - Array of refs to combine
 * @returns Combined ref callback
 *
 * @example
 * ```typescript
 * function MyComponent({ forwardedRef }) {
 *   const localRef = useRef<HTMLDivElement>(null);
 *   const combinedRef = useCombinedRefs(localRef, forwardedRef);
 *
 *   return <div ref={combinedRef}>Content</div>;
 * }
 * ```
 */
export function useCombinedRefs<T>(...refs: RefValue<T>[]): RefCallback<T> {
  return useCallback(
    (value: T | null) => {
      refs.forEach((ref) => {
        if (!ref) return;

        if (typeof ref === 'function') {
          ref(value);
        } else {
          (ref as MutableRefObject<T | null>).current = value;
        }
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    refs
  );
}

/**
 * Creates a ref callback that executes a function when the ref changes
 *
 * @template T - Element or value type
 * @param callback - Function to call when ref changes
 * @returns Ref callback
 *
 * @example
 * ```typescript
 * const ref = useCallbackRef<HTMLDivElement>((node) => {
 *   if (node) {
 *     console.log('Element mounted:', node);
 *   } else {
 *     console.log('Element unmounted');
 *   }
 * });
 *
 * return <div ref={ref}>Content</div>;
 * ```
 */
export function useCallbackRef<T>(
  callback: (current: T | null, previous: T | null) => void | (() => void)
): RefCallback<T> {
  const ref = useRef<T | null>(null);
  const cleanup = useRef<(() => void) | void>();

  return useCallback(
    (value: T | null) => {
      // Run cleanup from previous callback if it exists
      if (cleanup.current) {
        cleanup.current();
        cleanup.current = undefined;
      }

      const previous = ref.current;
      ref.current = value;

      // Execute callback and store cleanup if returned
      if (value !== previous) {
        cleanup.current = callback(value, previous);
      }
    },
    [callback]
  );
}

/**
 * Creates a ref that tracks the previous value
 *
 * @template T - Value type
 * @param value - Current value
 * @returns Previous value
 *
 * @example
 * ```typescript
 * function MyComponent({ count }: { count: number }) {
 *   const prevCount = usePreviousRef(count);
 *
 *   useEffect(() => {
 *     console.log(`Count changed from ${prevCount.current} to ${count}`);
 *   }, [count, prevCount]);
 * }
 * ```
 */
export function usePreviousRef<T>(value: T): MutableRefObject<T | undefined> {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref;
}

/**
 * Creates a ref that stays constant across renders
 *
 * @template T - Value type
 * @param value - Initial value
 * @returns Constant ref
 *
 * @example
 * ```typescript
 * const constantId = useConstantRef(() => generateUniqueId());
 * ```
 */
export function useConstantRef<T>(value: T | (() => T)): MutableRefObject<T> {
  const ref = useRef<T | null>(null);

  if (ref.current === null) {
    ref.current = typeof value === 'function' ? (value as () => T)() : value;
  }

  return ref as MutableRefObject<T>;
}

/**
 * Creates a ref that executes a callback when it changes
 *
 * @template T - Ref type
 * @param onChange - Callback when ref changes
 * @returns Ref object and setter
 *
 * @example
 * ```typescript
 * const [ref, setRef] = useRefWithCallback<HTMLDivElement>((current, prev) => {
 *   console.log('Ref changed:', current);
 * });
 * ```
 */
export function useRefWithCallback<T>(
  onChange: RefChangeCallback<T>
): [MutableRefObject<T | null>, RefCallback<T>] {
  const ref = useRef<T | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const setRef = useCallback<RefCallback<T>>((value: T | null) => {
    const previous = ref.current;
    ref.current = value;

    if (value !== previous) {
      onChangeRef.current(value, previous);
    }
  }, []);

  return [ref, setRef];
}

/**
 * Creates a ref that notifies when the element mounts/unmounts
 *
 * @template T - Element type
 * @param onMount - Callback when element mounts
 * @param onUnmount - Callback when element unmounts
 * @returns Ref callback
 *
 * @example
 * ```typescript
 * const ref = useMountRef<HTMLDivElement>(
 *   (element) => console.log('Mounted:', element),
 *   (element) => console.log('Unmounted:', element)
 * );
 * ```
 */
export function useMountRef<T>(
  onMount?: (element: T) => void | (() => void),
  onUnmount?: (element: T) => void
): RefCallback<T> {
  const cleanup = useRef<(() => void) | void>();

  return useCallback(
    (element: T | null) => {
      if (cleanup.current) {
        cleanup.current();
        cleanup.current = undefined;
      }

      if (element) {
        if (onMount) {
          cleanup.current = onMount(element);
        }
      } else if (onUnmount && element !== null) {
        onUnmount(element as T);
      }
    },
    [onMount, onUnmount]
  );
}

/**
 * Forwards a ref to a child component with additional processing
 *
 * @template T - Ref type
 * @param ref - Forwarded ref
 * @param process - Function to process ref value
 * @returns Processed ref callback
 *
 * @example
 * ```typescript
 * const MyComponent = forwardRef<HTMLDivElement>((props, ref) => {
 *   const processedRef = useForwardedRef(ref, (node) => {
 *     // Do something with node before forwarding
 *     return node;
 *   });
 *
 *   return <div ref={processedRef}>Content</div>;
 * });
 * ```
 */
export function useForwardedRef<T>(
  ref: ForwardedRef<T>,
  process?: (value: T | null) => T | null
): RefCallback<T> {
  return useCallback(
    (value: T | null) => {
      const processed = process ? process(value) : value;

      if (!ref) return;

      if (typeof ref === 'function') {
        ref(processed);
      } else {
        ref.current = processed;
      }
    },
    [ref, process]
  );
}

/**
 * Creates a ref that stores the latest value without causing re-renders
 *
 * @template T - Value type
 * @param value - Current value
 * @returns Ref with latest value
 *
 * @example
 * ```typescript
 * function MyComponent({ onChange }: { onChange: () => void }) {
 *   const onChangeRef = useLatestRef(onChange);
 *
 *   useEffect(() => {
 *     const handler = () => onChangeRef.current();
 *     // Handler always has latest onChange
 *   }, [onChangeRef]);
 * }
 * ```
 */
export function useLatestRef<T>(value: T): MutableRefObject<T> {
  const ref = useRef(value);

  useEffect(() => {
    ref.current = value;
  });

  return ref;
}

/**
 * Creates a stable ref callback that doesn't change identity
 *
 * @template T - Ref type
 * @param callback - Callback to execute when ref is set
 * @returns Stable ref callback
 *
 * @example
 * ```typescript
 * const ref = useStableRefCallback<HTMLDivElement>((node) => {
 *   if (node) {
 *     observer.observe(node);
 *   }
 * });
 * ```
 */
export function useStableRefCallback<T>(
  callback: (value: T | null) => void | (() => void)
): RefCallback<T> {
  const callbackRef = useLatestRef(callback);
  const cleanup = useRef<(() => void) | void>();

  return useCallback((value: T | null) => {
    if (cleanup.current) {
      cleanup.current();
      cleanup.current = undefined;
    }

    cleanup.current = callbackRef.current(value);
  }, [callbackRef]);
}

/**
 * Creates a ref that measures element dimensions
 *
 * @template T - Element type
 * @returns Ref callback and current dimensions
 *
 * @example
 * ```typescript
 * const [ref, dimensions] = useMeasureRef<HTMLDivElement>();
 *
 * return (
 *   <div ref={ref}>
 *     Width: {dimensions.width}, Height: {dimensions.height}
 *   </div>
 * );
 * ```
 */
export function useMeasureRef<T extends Element>(): [
  RefCallback<T>,
  { width: number; height: number; top: number; left: number }
] {
  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0,
    top: 0,
    left: 0,
  });

  const ref = useCallbackRef<T>((node) => {
    if (!node) return;

    const updateDimensions = () => {
      const rect = node.getBoundingClientRect();
      setDimensions({
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
      });
    };

    updateDimensions();

    const observer = new ResizeObserver(updateDimensions);
    observer.observe(node);

    return () => observer.disconnect();
  });

  return [ref, dimensions];
}

/**
 * Creates a ref that automatically focuses an element
 *
 * @template T - Element type
 * @param shouldFocus - Whether to focus the element
 * @returns Ref callback
 *
 * @example
 * ```typescript
 * const ref = useFocusRef<HTMLInputElement>(isOpen);
 *
 * return <input ref={ref} />;
 * ```
 */
export function useFocusRef<T extends HTMLElement>(
  shouldFocus = true
): RefCallback<T> {
  return useCallback(
    (element: T | null) => {
      if (element && shouldFocus) {
        element.focus();
      }
    },
    [shouldFocus]
  );
}

/**
 * Creates a ref that tracks element visibility
 *
 * @template T - Element type
 * @param options - Intersection observer options
 * @returns Ref callback and visibility state
 *
 * @example
 * ```typescript
 * const [ref, isVisible] = useVisibilityRef<HTMLDivElement>({
 *   threshold: 0.5,
 * });
 *
 * return <div ref={ref}>{isVisible ? 'Visible' : 'Hidden'}</div>;
 * ```
 */
export function useVisibilityRef<T extends Element>(
  options?: IntersectionObserverInit
): [RefCallback<T>, boolean] {
  const [isVisible, setIsVisible] = useState(false);

  const ref = useCallbackRef<T>((node) => {
    if (!node) {
      setIsVisible(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      options
    );

    observer.observe(node);

    return () => observer.disconnect();
  });

  return [ref, isVisible];
}

/**
 * Creates a ref that stores multiple elements in an array
 *
 * @template T - Element type
 * @returns Ref creator function and array of elements
 *
 * @example
 * ```typescript
 * const [createRef, elements] = useRefArray<HTMLLIElement>();
 *
 * return (
 *   <ul>
 *     {items.map((item, i) => (
 *       <li key={item.id} ref={createRef(i)}>
 *         {item.name}
 *       </li>
 *     ))}
 *   </ul>
 * );
 * ```
 */
export function useRefArray<T>(): [
  (index: number) => RefCallback<T>,
  MutableRefObject<(T | null)[]>
] {
  const refs = useRef<(T | null)[]>([]);

  const createRef = useCallback(
    (index: number): RefCallback<T> =>
      (element: T | null) => {
        refs.current[index] = element;
      },
    []
  );

  return [createRef, refs];
}

/**
 * Creates a ref map for dynamic collections
 *
 * @template T - Element type
 * @template K - Key type
 * @returns Ref creator function and ref map
 *
 * @example
 * ```typescript
 * const [createRef, refMap] = useRefMap<HTMLDivElement, string>();
 *
 * return items.map((item) => (
 *   <div key={item.id} ref={createRef(item.id)}>
 *     {item.name}
 *   </div>
 * ));
 * ```
 */
export function useRefMap<T, K extends string | number>(): [
  (key: K) => RefCallback<T>,
  MutableRefObject<Map<K, T>>
] {
  const map = useRef(new Map<K, T>());

  const createRef = useCallback(
    (key: K): RefCallback<T> =>
      (element: T | null) => {
        if (element) {
          map.current.set(key, element);
        } else {
          map.current.delete(key);
        }
      },
    []
  );

  return [createRef, map];
}

/**
 * Creates a ref that executes cleanup when component unmounts
 *
 * @template T - Ref type
 * @param cleanup - Cleanup function
 * @returns Ref object
 *
 * @example
 * ```typescript
 * const ref = useRefWithCleanup<WebSocket>((ws) => {
 *   ws?.close();
 * });
 *
 * ref.current = new WebSocket(url);
 * ```
 */
export function useRefWithCleanup<T>(
  cleanup: (value: T | null) => void
): MutableRefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    return () => cleanup(ref.current);
  }, [cleanup]);

  return ref;
}

/**
 * Type guard to check if a value is a ref object
 *
 * @param value - Value to check
 * @returns True if value is a ref object
 *
 * @example
 * ```typescript
 * if (isRefObject(value)) {
 *   console.log(value.current);
 * }
 * ```
 */
export function isRefObject<T>(value: any): value is MutableRefObject<T> {
  return (
    value !== null &&
    typeof value === 'object' &&
    'current' in value
  );
}

/**
 * Type guard to check if a value is a ref callback
 *
 * @param value - Value to check
 * @returns True if value is a ref callback
 *
 * @example
 * ```typescript
 * if (isRefCallback(value)) {
 *   value(element);
 * }
 * ```
 */
export function isRefCallback<T>(value: any): value is RefCallback<T> {
  return typeof value === 'function';
}

/**
 * Safely sets a ref value (handles both ref objects and callbacks)
 *
 * @param ref - Ref to set
 * @param value - Value to set
 *
 * @example
 * ```typescript
 * setRef(myRef, element);
 * ```
 */
export function setRef<T>(ref: RefValue<T>, value: T | null): void {
  if (!ref) return;

  if (typeof ref === 'function') {
    ref(value);
  } else {
    (ref as MutableRefObject<T | null>).current = value;
  }
}

/**
 * Safely gets a ref value
 *
 * @param ref - Ref to get value from
 * @returns Current ref value
 *
 * @example
 * ```typescript
 * const element = getRef(myRef);
 * ```
 */
export function getRef<T>(ref: RefValue<T>): T | null {
  if (!ref) return null;

  if (typeof ref === 'function') {
    return null; // Callbacks don't have a current value to retrieve
  }

  return (ref as MutableRefObject<T | null>).current;
}
