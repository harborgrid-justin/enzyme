/**
 * Lifecycle Hook Utilities Module
 *
 * Provides utilities for managing component lifecycle events with type-safe
 * hooks for mount, unmount, update, and other lifecycle phases.
 *
 * @module hooks/lifecycle
 * @example
 * ```typescript
 * const useComponentLifecycle = () => {
 *   useMount(() => console.log('Component mounted'));
 *   useUnmount(() => console.log('Component unmounting'));
 *   useUpdate(() => console.log('Component updated'));
 * };
 * ```
 */

import { DependencyList, EffectCallback, useEffect, useRef } from 'react';

/**
 * Lifecycle phase type
 */
export type LifecyclePhase = 'mount' | 'update' | 'unmount';

/**
 * Lifecycle callback function type
 */
export type LifecycleCallback = () => void | (() => void);

/**
 * Lifecycle event listener configuration
 */
export interface LifecycleListener {
  phase: LifecyclePhase;
  callback: LifecycleCallback;
  dependencies?: DependencyList;
}

/**
 * Creates a hook that executes a callback only on component mount
 *
 * @param callback - Function to execute on mount
 * @returns Cleanup function if provided by callback
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   useMount(() => {
 *     console.log('Component mounted');
 *     return () => console.log('Cleanup on unmount');
 *   });
 * }
 * ```
 */
export function useMount(callback: LifecycleCallback): void {
  useEffect(() => {
    return callback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Creates a hook that executes a callback only on component unmount
 *
 * @param callback - Function to execute on unmount
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   useUnmount(() => {
 *     console.log('Component unmounting');
 *     // Cleanup logic here
 *   });
 * }
 * ```
 */
export function useUnmount(callback: () => void): void {
  const callbackRef = useRef(callback);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      callbackRef.current();
    };
  }, []);
}

/**
 * Creates a hook that executes a callback on every update (but not on mount)
 *
 * @param callback - Function to execute on updates
 * @param deps - Optional dependency array
 *
 * @example
 * ```typescript
 * function MyComponent({ value }: { value: number }) {
 *   useUpdate(() => {
 *     console.log('Value updated:', value);
 *   }, [value]);
 * }
 * ```
 */
export function useUpdate(callback: EffectCallback, deps?: DependencyList): void {
  const isMounted = useRef(false);

  useEffect(() => {
    if (isMounted.current) {
      return callback();
    }

    isMounted.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Creates a hook that tracks whether the component is mounted
 *
 * @returns A ref object with current mount status
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const isMounted = useIsMounted();
 *
 *   const fetchData = async () => {
 *     const data = await api.getData();
 *     if (isMounted.current) {
 *       setData(data);
 *     }
 *   };
 * }
 * ```
 */
export function useIsMounted(): { current: boolean } {
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return isMounted;
}

/**
 * Creates a hook that executes different callbacks for mount and unmount
 *
 * @param onMount - Callback to execute on mount
 * @param onUnmount - Callback to execute on unmount
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   useMountUnmount(
 *     () => console.log('Mounted'),
 *     () => console.log('Unmounted')
 *   );
 * }
 * ```
 */
export function useMountUnmount(
  onMount: () => void,
  onUnmount: () => void
): void {
  const onUnmountRef = useRef(onUnmount);

  useEffect(() => {
    onUnmountRef.current = onUnmount;
  }, [onUnmount]);

  useEffect(() => {
    onMount();
    return () => {
      onUnmountRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Creates a hook that executes a callback only once, either on mount or first render
 *
 * @param callback - Function to execute once
 * @param deps - Optional dependencies
 *
 * @example
 * ```typescript
 * function MyComponent({ id }: { id: string }) {
 *   useOnce(() => {
 *     console.log('This runs only once for this id');
 *   }, [id]);
 * }
 * ```
 */
export function useOnce(callback: EffectCallback, deps?: DependencyList): void {
  const hasRun = useRef(false);

  useEffect(() => {
    if (!hasRun.current) {
      hasRun.current = true;
      return callback();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Creates a hook that executes a callback after a delay on mount
 *
 * @param callback - Function to execute after delay
 * @param delay - Delay in milliseconds
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   useDelayedMount(() => {
 *     console.log('This runs 1 second after mount');
 *   }, 1000);
 * }
 * ```
 */
export function useDelayedMount(callback: () => void, delay: number): void {
  useMount(() => {
    const timeoutId = setTimeout(callback, delay);
    return () => clearTimeout(timeoutId);
  });
}

/**
 * Creates a hook that executes callbacks at different lifecycle phases
 *
 * @param listeners - Array of lifecycle listeners
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   useLifecycle([
 *     { phase: 'mount', callback: () => console.log('Mounted') },
 *     { phase: 'update', callback: () => console.log('Updated') },
 *     { phase: 'unmount', callback: () => console.log('Unmounted') },
 *   ]);
 * }
 * ```
 */
export function useLifecycle(listeners: LifecycleListener[]): void {
  listeners.forEach(({ phase, callback, dependencies }) => {
    switch (phase) {
      case 'mount':
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useMount(callback);
        break;
      case 'update':
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useUpdate(callback, dependencies);
        break;
      case 'unmount':
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useUnmount(callback as () => void);
        break;
    }
  });
}

/**
 * Creates a hook that tracks the previous value of a prop or state
 *
 * @template T - Value type
 * @param value - Current value to track
 * @returns Previous value
 *
 * @example
 * ```typescript
 * function MyComponent({ count }: { count: number }) {
 *   const prevCount = usePrevious(count);
 *
 *   useEffect(() => {
 *     if (prevCount !== undefined && prevCount < count) {
 *       console.log('Count increased');
 *     }
 *   }, [count, prevCount]);
 * }
 * ```
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * Creates a hook that tracks the first value of a prop or state
 *
 * @template T - Value type
 * @param value - Current value
 * @returns First value
 *
 * @example
 * ```typescript
 * function MyComponent({ userId }: { userId: string }) {
 *   const firstUserId = useFirstValue(userId);
 *
 *   // firstUserId remains the initial value
 * }
 * ```
 */
export function useFirstValue<T>(value: T): T {
  const firstValue = useRef<T>(value);
  return firstValue.current;
}

/**
 * Creates a hook that executes a callback when dependencies change
 *
 * @param callback - Function to execute on change
 * @param deps - Dependency array to watch
 *
 * @example
 * ```typescript
 * function MyComponent({ userId }: { userId: string }) {
 *   useOnChange(() => {
 *     console.log('User ID changed to:', userId);
 *   }, [userId]);
 * }
 * ```
 */
export function useOnChange(callback: EffectCallback, deps: DependencyList): void {
  useUpdate(callback, deps);
}

/**
 * Creates a hook that counts the number of renders
 *
 * @returns Current render count
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const renderCount = useRenderCount();
 *
 *   console.log(`Rendered ${renderCount} times`);
 * }
 * ```
 */
export function useRenderCount(): number {
  const count = useRef(0);

  useEffect(() => {
    count.current += 1;
  });

  return count.current;
}

/**
 * Creates a hook that tracks update count (renders after initial mount)
 *
 * @returns Current update count
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const updateCount = useUpdateCount();
 *
 *   console.log(`Updated ${updateCount} times`);
 * }
 * ```
 */
export function useUpdateCount(): number {
  const count = useRef(0);

  useUpdate(() => {
    count.current += 1;
  });

  return count.current;
}

/**
 * Creates a hook that executes a callback when component is about to unmount
 * with access to the latest props/state
 *
 * @template T - Context type
 * @param callback - Function to execute on unmount with context
 * @param context - Context to pass to callback
 *
 * @example
 * ```typescript
 * function MyComponent({ userId }: { userId: string }) {
 *   useUnmountWithContext(
 *     (ctx) => {
 *       console.log('Unmounting with userId:', ctx.userId);
 *     },
 *     { userId }
 *   );
 * }
 * ```
 */
export function useUnmountWithContext<T>(
  callback: (context: T) => void,
  context: T
): void {
  const contextRef = useRef(context);
  const callbackRef = useRef(callback);

  useEffect(() => {
    contextRef.current = context;
    callbackRef.current = callback;
  });

  useEffect(() => {
    return () => {
      callbackRef.current(contextRef.current);
    };
  }, []);
}

/**
 * Lifecycle event emitter for tracking component lifecycle
 */
export class LifecycleEmitter {
  private listeners: Map<LifecyclePhase, Set<LifecycleCallback>> = new Map([
    ['mount', new Set()],
    ['update', new Set()],
    ['unmount', new Set()],
  ]);

  /**
   * Adds a listener for a lifecycle phase
   */
  on(phase: LifecyclePhase, callback: LifecycleCallback): () => void {
    const set = this.listeners.get(phase);
    if (set) {
      set.add(callback);
    }

    // Return unsubscribe function
    return () => {
      const set = this.listeners.get(phase);
      if (set) {
        set.delete(callback);
      }
    };
  }

  /**
   * Emits an event for a lifecycle phase
   */
  emit(phase: LifecyclePhase): void {
    const set = this.listeners.get(phase);
    if (set) {
      set.forEach(callback => callback());
    }
  }

  /**
   * Clears all listeners
   */
  clear(): void {
    this.listeners.forEach(set => set.clear());
  }
}

/**
 * Creates a lifecycle emitter hook
 *
 * @returns Lifecycle emitter instance
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const lifecycle = useLifecycleEmitter();
 *
 *   useEffect(() => {
 *     const unsubscribe = lifecycle.on('mount', () => {
 *       console.log('Mounted');
 *     });
 *
 *     return unsubscribe;
 *   }, [lifecycle]);
 * }
 * ```
 */
export function useLifecycleEmitter(): LifecycleEmitter {
  const emitter = useRef(new LifecycleEmitter());

  useMount(() => {
    emitter.current.emit('mount');
  });

  useUpdate(() => {
    emitter.current.emit('update');
  });

  useUnmount(() => {
    emitter.current.emit('unmount');
    emitter.current.clear();
  });

  return emitter.current;
}

/**
 * Creates a hook that executes a callback when specific props change
 *
 * @template T - Props type
 * @param callback - Function to execute when props change
 * @param props - Props object to watch
 * @param keys - Optional array of specific keys to watch
 *
 * @example
 * ```typescript
 * function MyComponent(props: { userId: string; theme: string }) {
 *   usePropsChange(
 *     (prev, next) => {
 *       console.log('User changed from', prev.userId, 'to', next.userId);
 *     },
 *     props,
 *     ['userId']
 *   );
 * }
 * ```
 */
export function usePropsChange<T extends Record<string, any>>(
  callback: (prevProps: T | undefined, nextProps: T) => void,
  props: T,
  keys?: (keyof T)[]
): void {
  const prevProps = usePrevious(props);

  useEffect(() => {
    if (!prevProps) return;

    const keysToCheck = keys || (Object.keys(props) as (keyof T)[]);
    const hasChanged = keysToCheck.some(key => prevProps[key] !== props[key]);

    if (hasChanged) {
      callback(prevProps, props);
    }
  }, [props, prevProps, keys, callback]);
}

/**
 * Creates a hook for async initialization on mount
 *
 * @template T - Result type
 * @param asyncFn - Async function to execute
 * @returns Object with loading state, result, and error
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { loading, result, error } = useAsyncMount(async () => {
 *     const data = await fetchData();
 *     return data;
 *   });
 *
 *   if (loading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   return <div>Data: {result}</div>;
 * }
 * ```
 */
export function useAsyncMount<T>(
  asyncFn: () => Promise<T>
): {
  loading: boolean;
  result: T | null;
  error: Error | null;
} {
  const [loading, setLoading] = React.useState(true);
  const [result, setResult] = React.useState<T | null>(null);
  const [error, setError] = React.useState<Error | null>(null);
  const isMounted = useIsMounted();

  useMount(() => {
    asyncFn()
      .then(data => {
        if (isMounted.current) {
          setResult(data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (isMounted.current) {
          setError(err);
          setLoading(false);
        }
      });
  });

  return { loading, result, error };
}

// Helper import for useState
import * as React from 'react';
