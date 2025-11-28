/**
 * @file Resource Cleanup Hook
 * @description React hooks for component lifecycle resource management,
 * automatic cleanup, and memory leak prevention
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  DisposableRegistry,
  createDisposable,
  type Disposable,
} from '../utils/memoryManager';
import { useIsMounted, useMountedState } from './shared/useIsMounted';

/**
 * Hook for managing disposable resources with automatic cleanup
 * Cleans up all registered resources when component unmounts
 */
export function useDisposable(): {
  register: <T extends Disposable>(disposable: T) => T;
  registerFn: (cleanup: () => void) => Disposable;
  unregister: (disposable: Disposable) => void;
  disposeAll: () => void;
} {
  const registryRef = useRef<DisposableRegistry | undefined>(undefined);

  // Initialize registry lazily
  registryRef.current ??= new DisposableRegistry();

  // Cleanup on unmount
  useEffect(() => {
    const registry = registryRef.current;
    return () => {
      registry?.dispose();
    };
  }, []);

  const register = useCallback(<T extends Disposable>(disposable: T): T => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return registryRef.current!.register(disposable);
  }, []);

  const registerFn = useCallback((cleanup: () => void): Disposable => {
    const disposable = createDisposable(cleanup);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return registryRef.current!.register(disposable);
  }, []);

  const unregister = useCallback((disposable: Disposable): void => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    registryRef.current!.unregister(disposable);
  }, []);

  const disposeAll = useCallback((): void => {
    registryRef.current?.dispose();
    registryRef.current = new DisposableRegistry();
  }, []);

  return { register, registerFn, unregister, disposeAll };
}

/**
 * Hook for managing abort controllers with automatic cleanup
 */
export function useAbortController(): {
  getSignal: () => AbortSignal;
  abort: (reason?: string) => void;
  reset: () => AbortController;
} {
  const controllerRef = useRef<AbortController>(new AbortController());

  // Abort on unmount
  useEffect(() => {
    return () => {
      controllerRef.current.abort('Component unmounted');
    };
  }, []);

  const getSignal = useCallback((): AbortSignal => {
    // Create new controller if current one is aborted
    if (controllerRef.current.signal.aborted) {
      controllerRef.current = new AbortController();
    }
    return controllerRef.current.signal;
  }, []);

  const abort = useCallback((reason?: string): void => {
    controllerRef.current.abort(reason);
  }, []);

  const reset = useCallback((): AbortController => {
    controllerRef.current = new AbortController();
    return controllerRef.current;
  }, []);

  return { getSignal, abort, reset };
}

/**
 * Hook for managing timeouts with automatic cleanup
 */
export function useTimeout(): {
  set: (callback: () => void, delay: number) => number;
  clear: (id: number) => void;
  clearAll: () => void;
} {
  const timeoutsRef = useRef<Set<number>>(new Set());

  // Clear all on unmount
  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => {
      timeouts.forEach((id) => clearTimeout(id));
      timeouts.clear();
    };
  }, []);

  const set = useCallback((callback: () => void, delay: number): number => {
    const id = setTimeout(() => {
      timeoutsRef.current.delete(id);
      callback();
    }, delay) as unknown as number;
    timeoutsRef.current.add(id);
    return id;
  }, []);

  const clear = useCallback((id: number): void => {
    clearTimeout(id);
    timeoutsRef.current.delete(id);
  }, []);

  const clearAll = useCallback((): void => {
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current.clear();
  }, []);

  return { set, clear, clearAll };
}

/**
 * Hook for managing intervals with automatic cleanup
 */
export function useInterval(): {
  set: (callback: () => void, delay: number) => number;
  clear: (id: number) => void;
  clearAll: () => void;
} {
  const intervalsRef = useRef<Set<number>>(new Set());

  // Clear all on unmount
  useEffect(() => {
    const intervals = intervalsRef.current;
    return () => {
      intervals.forEach((id) => clearInterval(id));
      intervals.clear();
    };
  }, []);

  const set = useCallback((callback: () => void, delay: number): number => {
    const id = setInterval(callback, delay) as unknown as number;
    intervalsRef.current.add(id);
    return id;
  }, []);

  const clear = useCallback((id: number): void => {
    clearInterval(id);
    intervalsRef.current.delete(id);
  }, []);

  const clearAll = useCallback((): void => {
    intervalsRef.current.forEach((id) => clearInterval(id));
    intervalsRef.current.clear();
  }, []);

  return { set, clear, clearAll };
}

/**
 * Hook for managing event listeners with automatic cleanup
 */
export function useEventListener(): {
  add: <K extends keyof WindowEventMap>(
    target: EventTarget,
    type: K,
    listener: (event: WindowEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ) => () => void;
  remove: (cleanup: () => void) => void;
  removeAll: () => void;
} {
  const cleanupsRef = useRef<Set<() => void>>(new Set());

  // Remove all on unmount
  useEffect(() => {
    const cleanups = cleanupsRef.current;
    return () => {
      cleanups.forEach((cleanup) => cleanup());
      cleanups.clear();
    };
  }, []);

  const add = useCallback(<K extends keyof WindowEventMap>(
    target: EventTarget,
    type: K,
    listener: (event: WindowEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): () => void => {
    target.addEventListener(type, listener as EventListener, options);

    const cleanup = (): void => {
      target.removeEventListener(type, listener as EventListener, options);
      cleanupsRef.current.delete(cleanup);
    };

    cleanupsRef.current.add(cleanup);
    return cleanup;
  }, []);

  const remove = useCallback((cleanup: () => void): void => {
    cleanup();
    cleanupsRef.current.delete(cleanup);
  }, []);

  const removeAll = useCallback((): void => {
    cleanupsRef.current.forEach((cleanup) => cleanup());
    cleanupsRef.current.clear();
  }, []);

  return { add, remove, removeAll };
}

/**
 * Hook for managing subscriptions with automatic cleanup
 */
export function useSubscription(): {
  subscribe: <T>(
    subscribe: (callback: (value: T) => void) => () => void,
    callback: (value: T) => void
  ) => () => void;
  unsubscribe: (cleanup: () => void) => void;
  unsubscribeAll: () => void;
} {
  const subscriptionsRef = useRef<Set<() => void>>(new Set());

  // Unsubscribe all on unmount
  useEffect(() => {
    const subscriptions = subscriptionsRef.current;
    return () => {
      subscriptions.forEach((unsubscribe) => unsubscribe());
      subscriptions.clear();
    };
  }, []);

  const subscribe = useCallback(<T>(
    subscribeFn: (callback: (value: T) => void) => () => void,
    callback: (value: T) => void
  ): () => void => {
    const unsubscribe = subscribeFn(callback);
    subscriptionsRef.current.add(unsubscribe);
    return () => {
      unsubscribe();
      subscriptionsRef.current.delete(unsubscribe);
    };
  }, []);

  const unsubscribe = useCallback((cleanup: () => void): void => {
    cleanup();
    subscriptionsRef.current.delete(cleanup);
  }, []);

  const unsubscribeAll = useCallback((): void => {
    subscriptionsRef.current.forEach((unsubscribe) => unsubscribe());
    subscriptionsRef.current.clear();
  }, []);

  return { subscribe, unsubscribe, unsubscribeAll };
}

/**
 * Hook for running cleanup effect on unmount
 */
export function useUnmountEffect(effect: () => void): void {
  const effectRef = useRef(effect);
  // eslint-disable-next-line react-hooks/refs
  effectRef.current = effect;

  useEffect(() => {
    return () => {
      effectRef.current();
    };
  }, []);
}

/**
 * Hook for tracking mounted state
 * @deprecated Use useMountedState from shared utilities instead
 */
export { useMountedState as useMounted } from './shared/useIsMounted';


/**
 * Hook for safe state updates that prevent updates after unmount
 */
export function useSafeState<T>(initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setStateInternal] = React.useState(initialValue);
  const isMounted = useIsMounted();

  const setState = useCallback((value: T | ((prev: T) => T)): void => {
    if (isMounted()) {
      setStateInternal(value);
    }
  }, [isMounted, setStateInternal]);

  return [state, setState];
}


/**
 * Hook for ref-based cleanup that runs synchronously
 */
export function useRefCleanup<T>(
  factory: () => T,
  cleanup: (value: T) => void
): React.RefObject<T> {
  const ref = useRef<T | null>(null);
  // Store cleanup function in a ref to avoid re-running effect when it changes
  const cleanupRef = useRef(cleanup);
  cleanupRef.current = cleanup;

  // Initialize
  ref.current ??= factory();

  // Cleanup - uses ref to always call latest cleanup function
  useEffect(() => {
    return () => {
      if (ref.current !== null) {
        cleanupRef.current(ref.current);
        ref.current = null;
      }
    };
  }, []); // Empty deps - cleanup ref always has latest function

  return ref as React.RefObject<T>;
}

/**
 * Hook for managing WebSocket connections with cleanup
 */
export function useWebSocketCleanup(
  url: string | (() => string),
  options?: {
    protocols?: string | string[];
    onOpen?: (event: Event) => void;
    onMessage?: (event: MessageEvent) => void;
    onError?: (event: Event) => void;
    onClose?: (event: CloseEvent) => void;
    reconnect?: boolean;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
  }
): {
  ws: WebSocket | null;
  send: (data: string | ArrayBuffer | Blob) => void;
  close: (code?: number, reason?: string) => void;
  reconnect: () => void;
  readyState: number;
} {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const connect = useCallback(() => {
    const wsUrl = typeof url === 'function' ? url() : url;
    const ws = new WebSocket(wsUrl, options?.protocols);

    ws.onopen = (event) => {
      reconnectAttemptsRef.current = 0;
      options?.onOpen?.(event);
    };

    ws.onmessage = options?.onMessage ?? ((): void => {});
    ws.onerror = options?.onError ?? ((): void => {});

    ws.onclose = (event) => {
      options?.onClose?.(event);

      // Auto reconnect
      if (
        options?.reconnect === true &&
        event.wasClean !== true &&
        reconnectAttemptsRef.current < (options?.maxReconnectAttempts ?? 5)
      ) {
        reconnectAttemptsRef.current++;
        reconnectTimeoutRef.current = setTimeout(
          (): void => {
            connect();
          },
          options?.reconnectInterval ?? 3000
        );
      }
    };

    wsRef.current = ws;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  // Connect on mount
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current !== undefined && reconnectTimeoutRef.current !== null) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current !== null && wsRef.current !== undefined) {
        wsRef.current.close(1000, 'Component unmounted');
        wsRef.current = null;
      }
    };
  }, [connect]);

  const send = useCallback((data: string | ArrayBuffer | Blob): void => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    }
  }, []);

  const close = useCallback((code?: number, reason?: string): void => {
    reconnectAttemptsRef.current = Infinity; // Prevent reconnect
    wsRef.current?.close(code, reason);
  }, []);

  const manualReconnect = useCallback((): void => {
    reconnectAttemptsRef.current = 0;
    if (wsRef.current != null) {
      wsRef.current.close();
    }
    connect();
  }, [connect]);

  return {
    ws: wsRef.current,
    send,
    close,
    reconnect: manualReconnect,
    readyState: wsRef.current?.readyState ?? WebSocket.CLOSED,
  };
}

/**
 * Hook for managing all resources with unified interface
 */
export function useResourceManager(): {
  disposable: ReturnType<typeof useDisposable>;
  abort: ReturnType<typeof useAbortController>;
  timeout: ReturnType<typeof useTimeout>;
  interval: ReturnType<typeof useInterval>;
  eventListener: ReturnType<typeof useEventListener>;
  subscription: ReturnType<typeof useSubscription>;
  mounted: ReturnType<typeof useMountedState>;
  cleanupAll: () => void;
} {
  const disposable = useDisposable();
  const abort = useAbortController();
  const timeout = useTimeout();
  const interval = useInterval();
  const eventListener = useEventListener();
  const subscription = useSubscription();
  const mounted = useMountedState();

  const cleanupAll = useCallback(() => {
    disposable.disposeAll();
    abort.abort('Manual cleanup');
    timeout.clearAll();
    interval.clearAll();
    eventListener.removeAll();
    subscription.unsubscribeAll();
  }, [disposable, abort, timeout, interval, eventListener, subscription]);

  return {
    disposable,
    abort,
    timeout,
    interval,
    eventListener,
    subscription,
    mounted,
    cleanupAll,
  };
}

/**
 * Hook for async operations with automatic cancellation
 */
export function useAsync<T, Args extends unknown[]>(
  asyncFn: (...args: Args) => Promise<T>,
  deps: React.DependencyList = []
): {
  execute: (...args: Args) => Promise<T | undefined>;
  cancel: () => void;
  loading: boolean;
  error: Error | null;
  value: T | undefined;
} {
  const [state, setState] = useSafeState<{
    loading: boolean;
    error: Error | null;
    value: T | undefined;
  }>({
    loading: false,
    error: null,
    value: undefined,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const isMounted = useIsMounted();

  const execute = useCallback(async (...args: Args): Promise<T | undefined> => {
    // Cancel previous request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const result = await asyncFn(...args);

      if (isMounted() && !abortControllerRef.current?.signal.aborted) {
        setState({ loading: false, error: null, value: result });
        return result;
      }
    } catch (error) {
      if (isMounted() && !abortControllerRef.current?.signal.aborted) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        setState({ loading: false, error: errorObj, value: undefined });
      }
    }

    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setState((prev) => ({ ...prev, loading: false }));
  }, [setState]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    execute,
    cancel,
    ...state,
  };
}
