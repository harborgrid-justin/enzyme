/**
 * Subscription Hook Utilities Module
 *
 * Provides utilities for managing subscriptions to external data sources,
 * event emitters, observables, and reactive patterns.
 *
 * @module hooks/subscription
 * @example
 * ```typescript
 * const data = useSubscription(observable, {
 *   onNext: (value) => console.log(value),
 *   onError: (error) => console.error(error),
 * });
 * ```
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

/**
 * Subscription callback type
 */
export type SubscriptionCallback<T> = (value: T) => void;

/**
 * Unsubscribe function type
 */
export type UnsubscribeFn = () => void;

/**
 * Observable-like interface
 */
export interface Observable<T> {
  subscribe(
    observer: Observer<T> | SubscriptionCallback<T>
  ): { unsubscribe: UnsubscribeFn } | UnsubscribeFn;
}

/**
 * Observer interface
 */
export interface Observer<T> {
  next?: (value: T) => void;
  error?: (error: Error) => void;
  complete?: () => void;
}

/**
 * Event emitter interface
 */
export interface EventEmitter<T = any> {
  on(event: string, handler: (data: T) => void): void;
  off(event: string, handler: (data: T) => void): void;
}

/**
 * Subscription options
 */
export interface SubscriptionOptions<T> {
  /** Callback when new value is received */
  onNext?: (value: T) => void;
  /** Callback when error occurs */
  onError?: (error: Error) => void;
  /** Callback when subscription completes */
  onComplete?: () => void;
  /** Initial value */
  initialValue?: T;
  /** Whether to re-subscribe on dependency changes */
  resubscribeOnChange?: boolean;
}

/**
 * Subscribes to an observable and returns the current value
 *
 * @template T - Value type
 * @param observable - Observable to subscribe to
 * @param options - Subscription options
 * @returns Current value from the observable
 *
 * @example
 * ```typescript
 * function UserProfile({ userId }: { userId: string }) {
 *   const user = useSubscription(userObservable$, {
 *     initialValue: null,
 *     onError: (error) => console.error('Failed to load user:', error),
 *   });
 *
 *   if (!user) return <div>Loading...</div>;
 *   return <div>{user.name}</div>;
 * }
 * ```
 */
export function useSubscription<T>(
  observable: Observable<T> | null | undefined,
  options: SubscriptionOptions<T> = {}
): T | undefined {
  const { onNext, onError, onComplete, initialValue } = options;
  const [value, setValue] = useState<T | undefined>(initialValue);

  useEffect(() => {
    if (!observable) return;

    const observer: Observer<T> = {
      next: (val) => {
        setValue(val);
        onNext?.(val);
      },
      error: (err) => {
        onError?.(err);
      },
      complete: () => {
        onComplete?.();
      },
    };

    const subscription = observable.subscribe(observer);
    const unsubscribe =
      typeof subscription === 'function'
        ? subscription
        : subscription.unsubscribe;

    return () => unsubscribe();
  }, [observable, onNext, onError, onComplete]);

  return value;
}

/**
 * Subscribes to an event emitter
 *
 * @template T - Event data type
 * @param emitter - Event emitter instance
 * @param eventName - Event name to subscribe to
 * @param handler - Event handler function
 *
 * @example
 * ```typescript
 * function WebSocketComponent({ socket }: { socket: EventEmitter }) {
 *   useEventSubscription(socket, 'message', (data) => {
 *     console.log('Received message:', data);
 *   });
 * }
 * ```
 */
export function useEventSubscription<T>(
  emitter: EventEmitter<T> | null | undefined,
  eventName: string,
  handler: (data: T) => void
): void {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!emitter) return;

    const wrappedHandler = (data: T) => handlerRef.current(data);
    emitter.on(eventName, wrappedHandler);

    return () => {
      emitter.off(eventName, wrappedHandler);
    };
  }, [emitter, eventName]);
}

/**
 * Creates a subscription to multiple observables
 *
 * @template T - Tuple of observable value types
 * @param observables - Array of observables
 * @returns Array of current values
 *
 * @example
 * ```typescript
 * const [user, settings, notifications] = useMultipleSubscriptions([
 *   user$,
 *   settings$,
 *   notifications$,
 * ]);
 * ```
 */
export function useMultipleSubscriptions<T extends Observable<any>[]>(
  observables: [...T]
): { [K in keyof T]: T[K] extends Observable<infer R> ? R | undefined : never } {
  const values = observables.map((observable) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useSubscription(observable)
  );

  return values as any;
}

/**
 * Creates a subscription with automatic cleanup
 *
 * @template T - Value type
 * @param subscribe - Subscribe function that returns unsubscribe function
 * @param deps - Dependency array
 * @returns Current value
 *
 * @example
 * ```typescript
 * const messages = useSubscriptionWithCleanup<Message>(
 *   (setValue) => {
 *     const ws = new WebSocket(url);
 *     ws.onmessage = (e) => setValue(JSON.parse(e.data));
 *     return () => ws.close();
 *   },
 *   [url]
 * );
 * ```
 */
export function useSubscriptionWithCleanup<T>(
  subscribe: (setValue: (value: T) => void) => UnsubscribeFn,
  deps: React.DependencyList
): T | undefined {
  const [value, setValue] = useState<T | undefined>();

  useEffect(() => {
    const unsubscribe = subscribe(setValue);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return value;
}

/**
 * Creates a store with subscription capabilities
 */
export class SubscriptionStore<T> {
  private subscribers = new Set<SubscriptionCallback<T>>();
  private value: T;

  constructor(initialValue: T) {
    this.value = initialValue;
  }

  /**
   * Gets the current value
   */
  getValue(): T {
    return this.value;
  }

  /**
   * Sets a new value and notifies subscribers
   */
  setValue(value: T | ((prev: T) => T)): void {
    const nextValue = typeof value === 'function' ? (value as (prev: T) => T)(this.value) : value;

    if (nextValue !== this.value) {
      this.value = nextValue;
      this.notify();
    }
  }

  /**
   * Subscribes to value changes
   */
  subscribe(callback: SubscriptionCallback<T>): UnsubscribeFn {
    this.subscribers.add(callback);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Notifies all subscribers
   */
  private notify(): void {
    this.subscribers.forEach((callback) => callback(this.value));
  }

  /**
   * Gets the number of subscribers
   */
  getSubscriberCount(): number {
    return this.subscribers.size;
  }

  /**
   * Clears all subscribers
   */
  clearSubscribers(): void {
    this.subscribers.clear();
  }
}

/**
 * Creates a subscription store hook
 *
 * @template T - Store value type
 * @param store - Subscription store instance
 * @returns Current store value and setter
 *
 * @example
 * ```typescript
 * const store = new SubscriptionStore({ count: 0 });
 *
 * function Counter() {
 *   const [value, setValue] = useStore(store);
 *
 *   return (
 *     <button onClick={() => setValue(v => ({ count: v.count + 1 }))}>
 *       Count: {value.count}
 *     </button>
 *   );
 * }
 * ```
 */
export function useStore<T>(
  store: SubscriptionStore<T>
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => store.getValue());

  useEffect(() => {
    // Sync with current store value on mount
    setValue(store.getValue());

    // Subscribe to changes
    const unsubscribe = store.subscribe(setValue);
    return unsubscribe;
  }, [store]);

  const setStoreValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      store.setValue(newValue);
    },
    [store]
  );

  return [value, setStoreValue];
}

/**
 * Creates a selector hook for subscription store
 *
 * @template T - Store value type
 * @template S - Selected value type
 * @param store - Subscription store instance
 * @param selector - Selector function
 * @returns Selected value
 *
 * @example
 * ```typescript
 * const count = useStoreSelector(store, state => state.count);
 * ```
 */
export function useStoreSelector<T, S>(
  store: SubscriptionStore<T>,
  selector: (state: T) => S
): S {
  const [selectedValue, setSelectedValue] = useState<S>(() =>
    selector(store.getValue())
  );

  useEffect(() => {
    const updateValue = (value: T) => {
      const nextSelected = selector(value);
      setSelectedValue((prev) => {
        // Only update if selected value changed
        return Object.is(prev, nextSelected) ? prev : nextSelected;
      });
    };

    // Initial sync
    updateValue(store.getValue());

    // Subscribe to changes
    const unsubscribe = store.subscribe(updateValue);
    return unsubscribe;
  }, [store, selector]);

  return selectedValue;
}

/**
 * WebSocket subscription hook
 *
 * @template T - Message data type
 * @param url - WebSocket URL
 * @param options - WebSocket options
 * @returns WebSocket state and controls
 *
 * @example
 * ```typescript
 * const {
 *   data,
 *   status,
 *   send,
 *   reconnect,
 * } = useWebSocket<Message>('ws://localhost:8080', {
 *   onMessage: (msg) => console.log('Received:', msg),
 *   reconnectAttempts: 3,
 * });
 * ```
 */
export function useWebSocket<T = any>(
  url: string | null,
  options: {
    onMessage?: (data: T) => void;
    onOpen?: (event: Event) => void;
    onClose?: (event: CloseEvent) => void;
    onError?: (error: Event) => void;
    reconnectAttempts?: number;
    reconnectDelay?: number;
  } = {}
): {
  data: T | null;
  status: 'connecting' | 'open' | 'closing' | 'closed';
  send: (data: string | ArrayBufferLike | Blob | ArrayBufferView) => void;
  reconnect: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<'connecting' | 'open' | 'closing' | 'closed'>('closed');
  const ws = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const reconnectTimeout = useRef<NodeJS.Timeout>();

  const {
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnectAttempts = 3,
    reconnectDelay = 1000,
  } = options;

  const connect = useCallback(() => {
    if (!url) return;

    setStatus('connecting');
    const socket = new WebSocket(url);
    ws.current = socket;

    socket.onopen = (event) => {
      setStatus('open');
      reconnectCount.current = 0;
      onOpen?.(event);
    };

    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        setData(parsed);
        onMessage?.(parsed);
      } catch {
        setData(event.data);
        onMessage?.(event.data);
      }
    };

    socket.onclose = (event) => {
      setStatus('closed');
      onClose?.(event);

      // Attempt reconnect
      if (reconnectCount.current < reconnectAttempts) {
        reconnectCount.current++;
        reconnectTimeout.current = setTimeout(() => {
          connect();
        }, reconnectDelay * reconnectCount.current);
      }
    };

    socket.onerror = (error) => {
      onError?.(error);
    };
  }, [url, onMessage, onOpen, onClose, onError, reconnectAttempts, reconnectDelay]);

  useEffect(() => {
    if (url) {
      connect();
    }

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [url, connect]);

  const send = useCallback((data: string | ArrayBufferLike | Blob | ArrayBufferView) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(data);
    }
  }, []);

  const reconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close();
    }
    reconnectCount.current = 0;
    connect();
  }, [connect]);

  return { data, status, send, reconnect };
}

/**
 * Server-Sent Events (SSE) subscription hook
 *
 * @template T - Event data type
 * @param url - SSE endpoint URL
 * @param options - SSE options
 * @returns SSE state
 *
 * @example
 * ```typescript
 * const { data, status } = useSSE<Notification>('/api/notifications', {
 *   onMessage: (notification) => toast(notification.message),
 * });
 * ```
 */
export function useSSE<T = any>(
  url: string | null,
  options: {
    onMessage?: (data: T) => void;
    onError?: (error: Event) => void;
    eventType?: string;
  } = {}
): {
  data: T | null;
  status: 'connecting' | 'open' | 'closed';
} {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<'connecting' | 'open' | 'closed'>('closed');

  const { onMessage, onError, eventType = 'message' } = options;

  useEffect(() => {
    if (!url) return;

    setStatus('connecting');
    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      setStatus('open');
    };

    const handleMessage = (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data);
        setData(parsed);
        onMessage?.(parsed);
      } catch {
        setData(event.data);
        onMessage?.(event.data);
      }
    };

    eventSource.addEventListener(eventType, handleMessage);

    eventSource.onerror = (error) => {
      setStatus('closed');
      onError?.(error);
    };

    return () => {
      eventSource.close();
    };
  }, [url, eventType, onMessage, onError]);

  return { data, status };
}

/**
 * Creates a pub/sub pattern hook
 *
 * @template T - Event data type
 * @returns Publish and subscribe functions
 *
 * @example
 * ```typescript
 * const eventBus = usePubSub<UserEvent>();
 *
 * function Publisher() {
 *   const { publish } = eventBus;
 *   return <button onClick={() => publish({ type: 'login', userId: '123' })}>
 *     Login
 *   </button>;
 * }
 *
 * function Subscriber() {
 *   const { subscribe } = eventBus;
 *
 *   useEffect(() => {
 *     return subscribe((event) => {
 *       console.log('Event:', event);
 *     });
 *   }, [subscribe]);
 * }
 * ```
 */
export function usePubSub<T>(): {
  publish: (data: T) => void;
  subscribe: (callback: SubscriptionCallback<T>) => UnsubscribeFn;
} {
  const subscribers = useRef(new Set<SubscriptionCallback<T>>());

  const publish = useCallback((data: T) => {
    subscribers.current.forEach((callback) => callback(data));
  }, []);

  const subscribe = useCallback((callback: SubscriptionCallback<T>) => {
    subscribers.current.add(callback);

    return () => {
      subscribers.current.delete(callback);
    };
  }, []);

  return { publish, subscribe };
}

/**
 * Polling subscription hook
 *
 * @template T - Data type
 * @param fetcher - Function to fetch data
 * @param interval - Polling interval in milliseconds
 * @param options - Polling options
 * @returns Current data and controls
 *
 * @example
 * ```typescript
 * const { data, loading, error, start, stop } = usePolling(
 *   async () => {
 *     const res = await fetch('/api/status');
 *     return res.json();
 *   },
 *   5000,
 *   { immediate: true }
 * );
 * ```
 */
export function usePolling<T>(
  fetcher: () => Promise<T>,
  interval: number,
  options: {
    immediate?: boolean;
    onError?: (error: Error) => void;
  } = {}
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  start: () => void;
  stop: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isPolling, setIsPolling] = useState(options.immediate ?? true);
  const intervalRef = useRef<NodeJS.Timeout>();

  const { onError } = options;

  const poll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      setData(result);
    } catch (err) {
      const error = err as Error;
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [fetcher, onError]);

  useEffect(() => {
    if (!isPolling) return;

    // Initial poll
    poll();

    // Set up interval
    intervalRef.current = setInterval(poll, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPolling, interval, poll]);

  const start = useCallback(() => setIsPolling(true), []);
  const stop = useCallback(() => setIsPolling(false), []);

  return { data, loading, error, start, stop };
}

// Helper import for React types
import * as React from 'react';
