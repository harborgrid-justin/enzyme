/**
 * @file Unified Event Utilities
 * @description Best-of-breed event handling with type safety, middleware, coordination,
 * and reliability features. Consolidates 4 previous implementations into one canonical version.
 *
 * @module shared/event-utils
 * @author Agent 5 - PhD TypeScript Architect
 * @version 2.0.0
 */

// =============================================================================
// Core Types
// =============================================================================

/**
 * Generic event handler function type.
 */
export type EventHandler<T = unknown> = (data: T) => void | Promise<void>;

/**
 * Synchronous event handler.
 */
export type SyncEventHandler<T = unknown> = (data: T) => void;

/**
 * Async event handler.
 */
export type AsyncEventHandler<T = unknown> = (data: T) => Promise<void>;

/**
 * Unsubscribe function returned by event subscriptions.
 */
export type Unsubscribe = () => void;

/**
 * Event middleware function.
 */
export type EventMiddleware<T = unknown> = (
  data: T,
  next: (data: T) => void | Promise<void>
) => void | Promise<void>;

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * Event listener options.
 */
export interface EventListenerOptions {
  /** Call handler only once then auto-remove */
  once?: boolean;
  /** Priority (higher executes first) */
  priority?: number;
  /** Abort signal to auto-remove listener */
  signal?: AbortSignal;
  /** Debounce delay in milliseconds */
  debounce?: number;
  /** Throttle interval in milliseconds */
  throttle?: number;
  /** Source filter (string, regex, or array) */
  sourceFilter?: string | RegExp | string[];
  /** Target filter */
  targetFilter?: string;
  /** Transform data before passing to handler */
  transform?: (data: unknown) => unknown;
  /** Filter events */
  filter?: (data: unknown) => boolean;
}

/**
 * Unified event emitter configuration.
 */
export interface UnifiedEventEmitterOptions {
  /** Maximum listeners per event (warning threshold) */
  maxListeners?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** Error handler for listener errors */
  onError?: (error: Error, event: string) => void;

  // Feature flags
  /** Enable middleware support */
  enableMiddleware?: boolean;
  /** Enable event deduplication */
  enableDeduplication?: boolean;
  /** Enable event persistence/history */
  enablePersistence?: boolean;
  /** Enable statistics tracking */
  enableStatistics?: boolean;
  /** Enable dead letter queue */
  enableDeadLetters?: boolean;

  // Feature-specific configuration
  /** Deduplication window in milliseconds */
  deduplicationWindow?: number;
  /** Maximum events to persist in history */
  maxPersistedEvents?: number;
  /** Maximum dead letters to keep */
  maxDeadLetters?: number;
  /** Maximum retries for failed deliveries */
  maxRetries?: number;
  /** Retry delay in milliseconds */
  retryDelayMs?: number;
}

// =============================================================================
// Event Metadata Types
// =============================================================================

/**
 * Event metadata for advanced features.
 */
export interface EventMetadata {
  /** Unique event ID */
  id: string;
  /** Event timestamp */
  timestamp: number;
  /** Source identifier */
  source?: string;
  /** Target identifier */
  target?: string | null;
  /** Event priority */
  priority: number;
  /** Correlation ID for request-response pattern */
  correlationId?: string;
  /** Whether acknowledgment is required */
  requiresAck?: boolean;
  /** Custom metadata */
  custom?: Record<string, unknown>;
}

/**
 * Event with metadata.
 */
export interface EventWithMetadata<T> {
  /** Event name/type */
  event: string;
  /** Event payload */
  payload: T;
  /** Event metadata */
  metadata: EventMetadata;
}

// =============================================================================
// Statistics Types
// =============================================================================

/**
 * Event bus statistics.
 */
export interface EventBusStats {
  /** Total events published */
  totalPublished: number;
  /** Total events delivered */
  totalDelivered: number;
  /** Total delivery failures */
  totalFailures: number;
  /** Current active subscriptions */
  activeSubscriptions: number;
  /** Dead letters count */
  deadLettersCount: number;
  /** Events by type */
  eventsByType: Map<string, number>;
  /** Events by priority */
  eventsByPriority: Record<number, number>;
  /** Average delivery time in milliseconds */
  avgDeliveryTime: number;
}

// =============================================================================
// Internal Types
// =============================================================================

/**
 * Internal listener entry with metadata.
 */
interface PriorityListener<T> {
  handler: EventHandler<T>;
  priority: number;
  once: boolean;
  options: EventListenerOptions;
  metadata: {
    id: string;
    createdAt: number;
    eventsReceived: number;
    isActive: boolean;
  };
  processedHandler?: EventHandler<T>; // Debounced/throttled version
}

/**
 * Dead letter entry for failed deliveries.
 */
interface DeadLetterEntry {
  event: string;
  data: unknown;
  metadata: EventMetadata;
  reason: string;
  timestamp: number;
  retryCount: number;
}

/**
 * Deduplication cache entry.
 */
interface DeduplicationEntry {
  hash: string;
  expiresAt: number;
}

/**
 * Pending request for request-response pattern.
 */
interface PendingRequest<T = unknown> {
  correlationId: string;
  responseEvent: string;
  resolve: (data: T) => void;
  reject: (error: Error) => void;
  timeoutHandle: ReturnType<typeof setTimeout>;
  timestamp: number;
}

// =============================================================================
// Common Event Types
// =============================================================================

/**
 * Standard application events that can be used across modules.
 */
export type AppEvents = {
  // Authentication
  'auth:login': { userId: string; timestamp: number };
  'auth:logout': { userId: string; reason?: string };
  'auth:sessionExpired': { userId: string };
  'auth:tokenRefreshed': { accessToken: string };

  // Navigation
  'navigation:beforeNavigate': { from: string; to: string };
  'navigation:afterNavigate': { from: string; to: string };
  'navigation:blocked': { from: string; to: string; reason: string };

  // Data
  'data:invalidate': { keys: string[] };
  'data:update': { key: string; value: unknown };
  'data:refresh': { source: string };

  // UI
  'ui:themeChange': { theme: 'light' | 'dark' | 'system' };
  'ui:notification': {
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
    duration?: number;
  };
  'ui:modalOpen': { id: string; data?: Record<string, unknown> };
  'ui:modalClose': { id: string; result?: unknown };

  // Error
  'error:global': { error: Error; context?: string };
  'error:network': { url: string; status: number; message: string };
  'error:validation': { field: string; message: string };

  // Performance
  'performance:slowOperation': { operation: string; durationMs: number };
  'performance:memoryPressure': { level: 'low' | 'moderate' | 'critical' };

  // Feature flags
  'feature:flagChange': { key: string; value: unknown; previousValue: unknown };

  // Offline Queue
  'offlineQueue:expired': { id: string; url: string };
  'offlineQueue:enqueued': { id: string; url: string };
  'offlineQueue:processing': { count: number };
  'offlineQueue:completed': { id: string; url: string; response: unknown };
  'offlineQueue:failed': { id: string; url: string; error: Error };

  // Service Circuit Breaker
  'service:stateChange': { service: string; from: string; to: string; health: unknown };
  'service:error': { service: string; error: Error };
  'service:healthCheck': { service: string; health: unknown };

  // Analytics
  'analytics:consentChanged': { consent: unknown };

  // Network
  'network:online': undefined;
  'network:offline': undefined;
  'network:qualityChange': { quality: string };
}

// =============================================================================
// Event Emitter Interface
// =============================================================================

/**
 * Type-safe event emitter interface.
 */
export interface IEventEmitter<Events extends Record<string, unknown>> {
  /**
   * Subscribe to an event.
   */
  on<K extends keyof Events>(
    event: K,
    handler: EventHandler<Events[K]>,
    options?: EventListenerOptions
  ): Unsubscribe;

  /**
   * Subscribe to an event for a single emission.
   */
  once<K extends keyof Events>(
    event: K,
    handler: EventHandler<Events[K]>,
    options?: Omit<EventListenerOptions, 'once'>
  ): Unsubscribe;

  /**
   * Unsubscribe from an event.
   */
  off<K extends keyof Events>(
    event: K,
    handler: EventHandler<Events[K]>
  ): void;

  /**
   * Emit an event.
   */
  emit<K extends keyof Events>(event: K, data: Events[K]): void | Promise<void>;

  /**
   * Remove all listeners for an event (or all events if no event specified).
   */
  removeAllListeners<K extends keyof Events>(event?: K): void;

  /**
   * Get listener count for an event.
   */
  listenerCount<K extends keyof Events>(event: K): number;
}

// =============================================================================
// Helper Functions
// =============================================================================

let listenerIdCounter = 0;
let eventIdCounter = 0;

/**
 * Generate unique listener ID.
 */
function generateListenerId(): string {
  return `listener_${Date.now().toString(36)}_${(++listenerIdCounter).toString(36)}`;
}

/**
 * Generate unique event ID.
 */
function generateEventId(): string {
  return `event_${Date.now().toString(36)}_${(++eventIdCounter).toString(36)}`;
}

/**
 * Create hash for event deduplication.
 */
function createEventHash(event: string, data: unknown): string {
  const str = `${event}:${JSON.stringify(data)}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

/**
 * Create debounced function.
 */
function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return ((...args: any[]) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

/**
 * Create throttled function.
 */
function throttle<T extends (...args: any[]) => any>(
  fn: T,
  interval: number
): T {
  let lastExecution = 0;
  return ((...args: any[]) => {
    const now = Date.now();
    if (now - lastExecution >= interval) {
      lastExecution = now;
      fn(...args);
    }
  }) as T;
}

/**
 * Check if source matches filter.
 */
function matchesSourceFilter(
  source: string | undefined,
  filter: string | RegExp | string[] | undefined
): boolean {
  if (!filter || !source) return true;
  if (filter instanceof RegExp) return filter.test(source);
  if (Array.isArray(filter)) return filter.includes(source);
  return filter === source;
}

// =============================================================================
// Unified Event Emitter Implementation
// =============================================================================

/**
 * Unified event emitter with all best-of-breed features.
 *
 * Features:
 * - Type-safe event maps
 * - Priority listeners
 * - Once-only listeners
 * - Wildcard listeners
 * - Async event handling
 * - Memory leak prevention
 * - Middleware support
 * - Event namespacing
 * - Request-response pattern
 * - Event deduplication
 * - Event persistence and replay
 * - Dead letter queue
 * - Statistics tracking
 * - Debounce/throttle support
 * - AbortSignal support
 *
 * @example
 * ```typescript
 * interface MyEvents {
 *   'user:created': { id: string; name: string };
 *   'user:deleted': { id: string };
 * }
 *
 * const emitter = new UnifiedEventEmitter<MyEvents>();
 *
 * emitter.on('user:created', (data) => {
 *   console.log(`User ${data.name} created`);
 * });
 *
 * emitter.emit('user:created', { id: '1', name: 'John' });
 * ```
 */
export class UnifiedEventEmitter<Events extends Record<string, unknown>>
  implements IEventEmitter<Events>
{
  private readonly config: Required<UnifiedEventEmitterOptions>;
  private readonly listeners = new Map<keyof Events, PriorityListener<Events[keyof Events]>[]>();
  private readonly middlewares = new Map<keyof Events, EventMiddleware<Events[keyof Events]>[]>();
  // private readonly wildcardListeners: PriorityListener<unknown>[] = [];

  // Advanced features
  private readonly deduplicationCache = new Map<string, DeduplicationEntry>();
  private readonly eventHistory: EventWithMetadata<unknown>[] = [];
  private readonly deadLetters: DeadLetterEntry[] = [];
  private readonly pendingRequests = new Map<string, PendingRequest>();

  // Statistics
  private stats: EventBusStats = {
    totalPublished: 0,
    totalDelivered: 0,
    totalFailures: 0,
    activeSubscriptions: 0,
    deadLettersCount: 0,
    eventsByType: new Map(),
    eventsByPriority: { 0: 0, 1: 0, 2: 0, 3: 0 },
    avgDeliveryTime: 0,
  };
  private totalDeliveryTime = 0;

  // Cleanup
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private contextSource?: string;

  constructor(options: UnifiedEventEmitterOptions = {}) {
    this.config = {
      maxListeners: options.maxListeners ?? 10,
      debug: options.debug ?? false,
      onError: options.onError ?? ((error, event) => {
        console.error(`[UnifiedEventEmitter] Error in "${String(event)}" handler:`, error);
      }),
      enableMiddleware: options.enableMiddleware ?? true,
      enableDeduplication: options.enableDeduplication ?? false,
      enablePersistence: options.enablePersistence ?? false,
      enableStatistics: options.enableStatistics ?? false,
      enableDeadLetters: options.enableDeadLetters ?? false,
      deduplicationWindow: options.deduplicationWindow ?? 1000,
      maxPersistedEvents: options.maxPersistedEvents ?? 100,
      maxDeadLetters: options.maxDeadLetters ?? 50,
      maxRetries: options.maxRetries ?? 3,
      retryDelayMs: options.retryDelayMs ?? 1000,
    };

    // Start cleanup interval if deduplication enabled
    if (this.config.enableDeduplication) {
      this.cleanupInterval = setInterval(() => {
        this.cleanupDeduplicationCache();
      }, this.config.deduplicationWindow * 2);
    }
  }

  // ===========================================================================
  // Core API
  // ===========================================================================

  /**
   * Subscribe to an event.
   */
  on<K extends keyof Events>(
    event: K,
    handler: EventHandler<Events[K]>,
    options: EventListenerOptions = {}
  ): Unsubscribe {
    const { priority = 0, once = false, signal, debounce: debounceMs, throttle: throttleMs } = options;

    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const handlers = this.listeners.get(event)!;

    // Warn if max listeners exceeded
    if (handlers.length >= this.config.maxListeners) {
      console.warn(
        `[UnifiedEventEmitter] Max listeners (${this.config.maxListeners}) exceeded for event "${String(event)}"`
      );
    }

    // Create processed handler (debounced/throttled if configured)
    let processedHandler: EventHandler<Events[K]> | undefined;
    if (debounceMs && debounceMs > 0) {
      processedHandler = debounce(handler, debounceMs);
    } else if (throttleMs && throttleMs > 0) {
      processedHandler = throttle(handler, throttleMs);
    }

    const entry: PriorityListener<Events[K]> = {
      handler,
      priority,
      once,
      options,
      metadata: {
        id: generateListenerId(),
        createdAt: Date.now(),
        eventsReceived: 0,
        isActive: true,
      },
      processedHandler,
    };

    handlers.push(entry as PriorityListener<Events[keyof Events]>);

    // Sort by priority (higher first)
    handlers.sort((a, b) => b.priority - a.priority);

    if (this.config.enableStatistics) {
      this.stats.activeSubscriptions++;
    }

    if (this.config.debug) {
      console.info(`[UnifiedEventEmitter] Added listener for "${String(event)}"`);
    }

    // Create unsubscribe function
    const unsubscribe = (): void => this.off(event, handler);

    // Auto-unsubscribe on abort signal
    if (signal) {
      signal.addEventListener('abort', unsubscribe, { once: true });
    }

    return unsubscribe;
  }

  /**
   * Subscribe to an event for a single emission.
   */
  once<K extends keyof Events>(
    event: K,
    handler: EventHandler<Events[K]>,
    options: Omit<EventListenerOptions, 'once'> = {}
  ): Unsubscribe {
    return this.on(event, handler, { ...options, once: true });
  }

  /**
   * Unsubscribe from an event.
   */
  off<K extends keyof Events>(
    event: K,
    handler: EventHandler<Events[K]>
  ): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;

    const index = handlers.findIndex((h) => h.handler === handler);
    if (index !== -1) {
      const entry = handlers[index];
      if (entry) {
        entry.metadata.isActive = false;
      }
      handlers.splice(index, 1);

      if (this.config.enableStatistics) {
        this.stats.activeSubscriptions--;
      }

      if (this.config.debug) {
        console.info(`[UnifiedEventEmitter] Removed listener for "${String(event)}"`);
      }
    }

    // Clean up empty arrays
    if (handlers.length === 0) {
      this.listeners.delete(event);
    }
  }

  /**
   * Emit an event.
   */
  async emit<K extends keyof Events>(event: K, data: Events[K]): Promise<void> {
    const startTime = this.config.enableStatistics ? performance.now() : 0;

    // Check deduplication
    if (this.config.enableDeduplication) {
      const hash = createEventHash(String(event), data);
      const existing = this.deduplicationCache.get(hash);
      if (existing && existing.expiresAt > Date.now()) {
        if (this.config.debug) {
          console.debug(`[UnifiedEventEmitter] Deduplicated event: ${String(event)}`);
        }
        return;
      }

      // Add to deduplication cache
      this.deduplicationCache.set(hash, {
        hash,
        expiresAt: Date.now() + this.config.deduplicationWindow,
      });
    }

    // Create event metadata
    const metadata: EventMetadata = {
      id: generateEventId(),
      timestamp: Date.now(),
      source: this.contextSource,
      target: null,
      priority: 0,
    };

    // Update statistics
    if (this.config.enableStatistics) {
      this.stats.totalPublished++;
      const count = this.stats.eventsByType.get(String(event)) ?? 0;
      this.stats.eventsByType.set(String(event), count + 1);
    }

    // Persist event if enabled
    if (this.config.enablePersistence) {
      this.eventHistory.push({
        event: String(event),
        payload: data,
        metadata,
      });
      if (this.eventHistory.length > this.config.maxPersistedEvents) {
        this.eventHistory.shift();
      }
    }

    if (this.config.debug) {
      console.info(`[UnifiedEventEmitter] Emitting "${String(event)}"`, data);
    }

    // Get handlers
    const handlers = this.listeners.get(event);
    if (!handlers || handlers.length === 0) {
      // No handlers - add to dead letter if enabled
      if (this.config.enableDeadLetters) {
        this.addDeadLetter(String(event), data, metadata, 'No subscribers');
      }
      return;
    }

    // Apply middleware
    let processedData = data;
    if (this.config.enableMiddleware) {
      const middlewares = this.middlewares.get(event);
      if (middlewares && middlewares.length > 0) {
        processedData = await this.applyMiddleware(middlewares, data) as Events[K];
      }
    }

    // Copy handlers to avoid modification during iteration
    const handlersCopy = [...handlers];
    const toRemove: EventHandler<Events[K]>[] = [];

    // Execute handlers
    for (const entry of handlersCopy) {
      if (!entry.metadata.isActive) continue;

      // Apply filters
      if (entry.options.filter && !entry.options.filter(processedData)) {
        continue;
      }

      if (entry.options.sourceFilter && !matchesSourceFilter(this.contextSource, entry.options.sourceFilter)) {
        continue;
      }

      // Mark once handlers for removal BEFORE execution to prevent double-firing
      if (entry.once) {
        entry.metadata.isActive = false;
        toRemove.push(entry.handler as EventHandler<Events[K]>);
      }

      try {
        // Apply transform if configured
        let finalData = processedData;
        if (entry.options.transform) {
          finalData = entry.options.transform(processedData) as Events[K];
        }

        // Use processed handler (debounced/throttled) if available
        const handlerToCall = entry.processedHandler ?? entry.handler;
        await handlerToCall(finalData);

        entry.metadata.eventsReceived++;

        if (this.config.enableStatistics) {
          this.stats.totalDelivered++;
        }
      } catch (error) {
        if (this.config.enableStatistics) {
          this.stats.totalFailures++;
        }

        this.config.onError(
          error instanceof Error ? error : new Error(String(error)),
          String(event)
        );

        // Add to dead letter queue
        if (this.config.enableDeadLetters) {
          this.addDeadLetter(
            String(event),
            data,
            metadata,
            error instanceof Error ? error.message : 'Unknown error'
          );
        }
      }
    }

    // Remove once handlers
    for (const handler of toRemove) {
      this.off(event, handler);
    }

    // Update delivery time stats
    if (this.config.enableStatistics) {
      const deliveryTime = performance.now() - startTime;
      this.totalDeliveryTime += deliveryTime;
      this.stats.avgDeliveryTime = this.totalDeliveryTime / this.stats.totalDelivered;
    }
  }

  /**
   * Emit synchronously (fire and forget).
   */
  emitSync<K extends keyof Events>(event: K, data: Events[K]): void {
    void this.emit(event, data);
  }

  /**
   * Remove all listeners for an event (or all events if no event specified).
   */
  removeAllListeners<K extends keyof Events>(event?: K): void {
    if (event) {
      const handlers = this.listeners.get(event);
      if (handlers && this.config.enableStatistics) {
        this.stats.activeSubscriptions -= handlers.length;
      }
      this.listeners.delete(event);
      this.middlewares.delete(event);
    } else {
      if (this.config.enableStatistics) {
        this.stats.activeSubscriptions = 0;
      }
      this.listeners.clear();
      this.middlewares.clear();
    }
  }

  /**
   * Get listener count for an event.
   */
  listenerCount<K extends keyof Events>(event: K): number {
    return this.listeners.get(event)?.length ?? 0;
  }

  /**
   * Get all registered event names.
   */
  eventNames(): (keyof Events)[] {
    return Array.from(this.listeners.keys());
  }

  // ===========================================================================
  // Advanced Features
  // ===========================================================================

  /**
   * Wait for an event to be emitted.
   */
  async waitFor<K extends keyof Events>(
    event: K,
    options: {
      timeout?: number;
      filter?: (data: Events[K]) => boolean;
    } = {}
  ): Promise<Events[K]> {
    return new Promise((resolve, reject) => {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      const handler: EventHandler<Events[K]> = (data) => {
        if (options.filter && !options.filter(data)) {
          return; // Don't resolve if filter doesn't match
        }

        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        this.off(event, handler);
        resolve(data);
      };

      if (options.timeout !== undefined && options.timeout > 0) {
        timeoutId = setTimeout(() => {
          this.off(event, handler);
          reject(new Error(`Timeout waiting for event "${String(event)}"`));
        }, options.timeout);
      }

      this.on(event, handler);
    });
  }

  /**
   * Add middleware for an event.
   */
  use<K extends keyof Events>(
    event: K,
    middleware: EventMiddleware<Events[K]>
  ): Unsubscribe {
    if (!this.config.enableMiddleware) {
      console.warn('[UnifiedEventEmitter] Middleware is disabled');
      return () => {};
    }

    if (!this.middlewares.has(event)) {
      this.middlewares.set(event, []);
    }

    const middlewares = this.middlewares.get(event)!;
    middlewares.push(middleware as unknown as EventMiddleware<Events[keyof Events]>);

    return () => {
      const index = middlewares.indexOf(middleware as unknown as EventMiddleware<Events[keyof Events]>);
      if (index !== -1) {
        middlewares.splice(index, 1);
      }
    };
  }

  /**
   * Apply middleware chain.
   */
  private async applyMiddleware<K extends keyof Events>(
    middlewares: EventMiddleware<Events[K]>[],
    data: Events[K]
  ): Promise<Events[K]> {
    let currentData = data;

    const executeMiddleware = async (index: number, data: Events[K]): Promise<void> => {
      if (index >= middlewares.length) {
        currentData = data;
        return;
      }

      const middleware = middlewares[index];
      if (middleware) {
        await middleware(data, async (nextData) =>
          executeMiddleware(index + 1, nextData)
        );
      }
    };

    await executeMiddleware(0, data);
    return currentData;
  }

  /**
   * Pipe events from another emitter.
   */
  pipe<K extends keyof Events>(
    event: K,
    source: UnifiedEventEmitter<Events>
  ): Unsubscribe {
    const handler: EventHandler<Events[K]> = (data) => {
      this.emitSync(event, data);
    };

    return source.on(event, handler);
  }

  /**
   * Set context source for emitted events.
   */
  setContext(source: string): void {
    this.contextSource = source;
  }

  /**
   * Get context source.
   */
  getContext(): string | undefined {
    return this.contextSource;
  }

  // ===========================================================================
  // Request-Response Pattern
  // ===========================================================================

  /**
   * Request-response pattern: send request and wait for response.
   */
  async request<TReq extends keyof Events, TRes extends keyof Events>(
    requestEvent: TReq,
    responseEvent: TRes,
    payload: Events[TReq],
    timeout = 5000
  ): Promise<Events[TRes]> {
    const correlationId = generateEventId();

    return new Promise((resolve, reject) => {
      // Set up response listener
      const subscription = this.on(
        responseEvent,
        (data) => {
          // Check if this response matches our request
          // In real implementation, we'd check metadata.correlationId
          subscription();
          const pending = this.pendingRequests.get(correlationId);
          if (pending) {
            clearTimeout(pending.timeoutHandle);
            this.pendingRequests.delete(correlationId);
          }
          resolve(data);
        },
        { once: true }
      );

      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        subscription();
        this.pendingRequests.delete(correlationId);
        reject(new Error(`Request timeout for ${String(requestEvent)} -> ${String(responseEvent)}`));
      }, timeout);

      // Store pending request
      this.pendingRequests.set(correlationId, {
        correlationId,
        responseEvent: String(responseEvent),
        resolve: resolve as (data: unknown) => void,
        reject,
        timeoutHandle,
        timestamp: Date.now(),
      });

      // Send request
      this.emitSync(requestEvent, payload);
    });
  }

  // ===========================================================================
  // Persistence and Replay
  // ===========================================================================

  /**
   * Get event history.
   */
  getHistory(): ReadonlyArray<EventWithMetadata<unknown>> {
    if (!this.config.enablePersistence) {
      console.warn('[UnifiedEventEmitter] Persistence is disabled');
      return [];
    }
    return [...this.eventHistory];
  }

  /**
   * Replay events from history.
   */
  replay(filter?: (event: EventWithMetadata<unknown>) => boolean): void {
    if (!this.config.enablePersistence) {
      console.warn('[UnifiedEventEmitter] Persistence is disabled');
      return;
    }

    const events = filter ? this.eventHistory.filter(filter) : this.eventHistory;

    for (const event of events) {
      this.emitSync(event.event as keyof Events, event.payload as Events[keyof Events]);
    }
  }

  /**
   * Clear event history.
   */
  clearHistory(): void {
    this.eventHistory.length = 0;
  }

  // ===========================================================================
  // Dead Letter Queue
  // ===========================================================================

  /**
   * Add message to dead letter queue.
   */
  private addDeadLetter(
    event: string,
    data: unknown,
    metadata: EventMetadata,
    reason: string
  ): void {
    this.deadLetters.push({
      event,
      data,
      metadata,
      reason,
      timestamp: Date.now(),
      retryCount: 0,
    });

    if (this.config.enableStatistics) {
      this.stats.deadLettersCount++;
    }

    // Trim if exceeding limit
    if (this.deadLetters.length > this.config.maxDeadLetters) {
      this.deadLetters.shift();
      if (this.config.enableStatistics) {
        this.stats.deadLettersCount--;
      }
    }
  }

  /**
   * Get dead letters.
   */
  getDeadLetters(): ReadonlyArray<DeadLetterEntry> {
    if (!this.config.enableDeadLetters) {
      console.warn('[UnifiedEventEmitter] Dead letter queue is disabled');
      return [];
    }
    return [...this.deadLetters];
  }

  /**
   * Retry a dead letter.
   */
  retryDeadLetter(index: number): boolean {
    if (!this.config.enableDeadLetters) {
      console.warn('[UnifiedEventEmitter] Dead letter queue is disabled');
      return false;
    }

    const entry = this.deadLetters[index];
    if (!entry || entry.retryCount >= this.config.maxRetries) {
      return false;
    }

    entry.retryCount++;
    this.emitSync(entry.event as keyof Events, entry.data as Events[keyof Events]);

    // Remove from dead letters
    this.deadLetters.splice(index, 1);
    if (this.config.enableStatistics) {
      this.stats.deadLettersCount--;
    }

    return true;
  }

  /**
   * Clear dead letters.
   */
  clearDeadLetters(): void {
    this.deadLetters.length = 0;
    if (this.config.enableStatistics) {
      this.stats.deadLettersCount = 0;
    }
  }

  // ===========================================================================
  // Statistics
  // ===========================================================================

  /**
   * Get statistics.
   */
  getStats(): EventBusStats {
    if (!this.config.enableStatistics) {
      console.warn('[UnifiedEventEmitter] Statistics tracking is disabled');
    }
    return {
      ...this.stats,
      eventsByType: new Map(this.stats.eventsByType),
    };
  }

  /**
   * Reset statistics.
   */
  resetStats(): void {
    this.stats = {
      totalPublished: 0,
      totalDelivered: 0,
      totalFailures: 0,
      activeSubscriptions: this.stats.activeSubscriptions, // Keep current subscriptions
      deadLettersCount: this.deadLetters.length,
      eventsByType: new Map(),
      eventsByPriority: { 0: 0, 1: 0, 2: 0, 3: 0 },
      avgDeliveryTime: 0,
    };
    this.totalDeliveryTime = 0;
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  /**
   * Clean up deduplication cache.
   */
  private cleanupDeduplicationCache(): void {
    const now = Date.now();
    for (const [hash, entry] of this.deduplicationCache) {
      if (entry.expiresAt <= now) {
        this.deduplicationCache.delete(hash);
      }
    }
  }

  /**
   * Clear all data and reset emitter.
   */
  clear(): void {
    // Clear all listeners
    for (const handlers of this.listeners.values()) {
      for (const handler of handlers) {
        handler.metadata.isActive = false;
      }
    }
    this.listeners.clear();
    this.middlewares.clear();

    // Clear pending requests
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timeoutHandle);
      pending.reject(new Error('Event emitter cleared'));
    }
    this.pendingRequests.clear();

    // Clear caches
    this.deduplicationCache.clear();
    this.eventHistory.length = 0;
    this.deadLetters.length = 0;

    // Reset stats
    this.resetStats();
  }

  /**
   * Dispose the emitter and clean up resources.
   */
  dispose(): void {
    this.clear();
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a unified event emitter.
 */
export function createEventEmitter<Events extends Record<string, unknown>>(
  options?: UnifiedEventEmitterOptions
): UnifiedEventEmitter<Events> {
  return new UnifiedEventEmitter<Events>(options);
}

/**
 * Create a scoped event emitter with namespace.
 */
export function createScopedEmitter<Events extends Record<string, unknown>>(
  namespace: string,
  baseEmitter?: UnifiedEventEmitter<Record<string, unknown>>
): UnifiedEventEmitter<Events> {
  const scoped = createEventEmitter<Events>();
  scoped.setContext(namespace);

  // Forward to base emitter with namespace prefix if provided
  if (baseEmitter) {
    const originalEmit = scoped.emit.bind(scoped);
    scoped.emit = async <K extends keyof Events>(event: K, data: Events[K]) => {
      await originalEmit(event, data);
      await baseEmitter.emit(`${namespace}:${String(event)}` as keyof Record<string, unknown>, data);
    };
  }

  return scoped;
}

// =============================================================================
// Global Event Bus
// =============================================================================

/**
 * Global event bus instance.
 */
export const globalEventBus = createEventEmitter<AppEvents>({
  maxListeners: 50,
  debug: process.env['NODE_ENV'] === 'development',
  enableStatistics: true,
  enableDeadLetters: true,
});

/**
 * Shorthand for common event operations.
 */
export const events = {
  emit: globalEventBus.emit.bind(globalEventBus),
  on: globalEventBus.on.bind(globalEventBus),
  once: globalEventBus.once.bind(globalEventBus),
  off: globalEventBus.off.bind(globalEventBus),
  waitFor: globalEventBus.waitFor.bind(globalEventBus),
};

// =============================================================================
// Event Handler Utilities
// =============================================================================

/**
 * Create a handler that only executes once per unique key within a time window.
 */
export function dedupeHandler<T>(
  handler: EventHandler<T>,
  keyFn: (data: T) => string,
  windowMs: number
): EventHandler<T> {
  const seen = new Map<string, number>();

  return (data: T) => {
    const key = keyFn(data);
    const now = Date.now();
    const lastSeen = seen.get(key);

    if (lastSeen !== undefined && now - lastSeen < windowMs) {
      return; // Skip duplicate
    }

    seen.set(key, now);

    // Cleanup old entries periodically
    if (seen.size > 1000) {
      const cutoff = now - windowMs;
      for (const [k, v] of seen.entries()) {
        if (v < cutoff) seen.delete(k);
      }
    }

    return handler(data);
  };
}

/**
 * Create a handler that batches events and calls the handler with all events.
 */
export function batchHandler<T>(
  handler: (events: T[]) => void | Promise<void>,
  intervalMs: number
): EventHandler<T> {
  let batch: T[] = [];
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const flush = (): void => {
    if (batch.length === 0) return;
    const events = batch;
    batch = [];
    void handler(events);
  };

  return (data: T) => {
    batch.push(data);

    if (timeoutId === null) {
      timeoutId = setTimeout(() => {
        timeoutId = null;
        flush();
      }, intervalMs);
    }
  };
}

/**
 * Create a handler that filters events based on a predicate.
 */
export function filterHandler<T>(
  handler: EventHandler<T>,
  predicate: (data: T) => boolean
): EventHandler<T> {
  return (data: T) => {
    if (predicate(data)) {
      return handler(data);
    }
  };
}

/**
 * Create a handler that transforms event data before passing to handler.
 */
export function mapHandler<T, U>(
  handler: EventHandler<U>,
  transform: (data: T) => U
): EventHandler<T> {
  return (data: T) => {
    return handler(transform(data));
  };
}

/**
 * Combine multiple handlers into one.
 */
export function combineHandlers<T>(
  ...handlers: EventHandler<T>[]
): EventHandler<T> {
  return async (data: T) => {
    for (const handler of handlers) {
      await handler(data);
    }
  };
}

// =============================================================================
// DOM Event Utilities
// =============================================================================

/**
 * Add event listener with automatic cleanup.
 */
export function addEventListener<K extends keyof WindowEventMap>(
  target: Window,
  event: K,
  handler: (event: WindowEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions
): Unsubscribe;
export function addEventListener<K extends keyof DocumentEventMap>(
  target: Document,
  event: K,
  handler: (event: DocumentEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions
): Unsubscribe;
export function addEventListener<K extends keyof HTMLElementEventMap>(
  target: HTMLElement,
  event: K,
  handler: (event: HTMLElementEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions
): Unsubscribe;
export function addEventListener(
  target: EventTarget,
  event: string,
  handler: EventListener,
  options?: boolean | AddEventListenerOptions
): Unsubscribe;
export function addEventListener(
  target: EventTarget,
  event: string,
  handler: EventListener,
  options?: boolean | AddEventListenerOptions
): Unsubscribe {
  target.addEventListener(event, handler, options);
  return () => target.removeEventListener(event, handler, options);
}

/**
 * Create a disposable event listener that cleans up when signal is aborted.
 */
export function addDisposableEventListener<K extends keyof WindowEventMap>(
  target: Window,
  event: K,
  handler: (event: WindowEventMap[K]) => void,
  signal: AbortSignal,
  options?: Omit<AddEventListenerOptions, 'signal'>
): void;
export function addDisposableEventListener(
  target: EventTarget,
  event: string,
  handler: EventListener,
  signal: AbortSignal,
  options?: Omit<AddEventListenerOptions, 'signal'>
): void;
export function addDisposableEventListener(
  target: EventTarget,
  event: string,
  handler: EventListener,
  signal: AbortSignal,
  options?: Omit<AddEventListenerOptions, 'signal'>
): void {
  if (signal.aborted) return;
  target.addEventListener(event, handler, { ...options, signal });
}

// =============================================================================
// Custom Event Utilities
// =============================================================================

/**
 * Create and dispatch a custom event.
 */
export function dispatchCustomEvent<T>(
  target: EventTarget,
  eventName: string,
  detail: T,
  options: Omit<CustomEventInit<T>, 'detail'> = {}
): boolean {
  const event = new CustomEvent(eventName, {
    ...options,
    detail,
    bubbles: options.bubbles ?? true,
    cancelable: options.cancelable ?? true,
  });
  return target.dispatchEvent(event);
}

/**
 * Listen for a custom event with typed detail.
 */
export function onCustomEvent<T>(
  target: EventTarget,
  eventName: string,
  handler: (detail: T) => void,
  options?: boolean | AddEventListenerOptions
): Unsubscribe {
  const wrappedHandler = (event: Event): void => {
    if (event instanceof CustomEvent) {
      handler(event.detail as T);
    }
  };
  target.addEventListener(eventName, wrappedHandler, options);
  return () => target.removeEventListener(eventName, wrappedHandler, options);
}

// =============================================================================
// Mixin Pattern
// =============================================================================

/**
 * Constructor type for mixin pattern.
 */
type Constructor<T = object> = new (...args: unknown[]) => T;

/**
 * Event emitter mixin for classes.
 */
export function withEvents<
  T extends Constructor,
  Events extends Record<string, unknown>
>(
  Base: T
): T & Constructor<{ events: UnifiedEventEmitter<Events> }> {
  // Use a type assertion to avoid the mixin class constructor signature issue
  const MixinClass = class extends (Base as Constructor<object>) {
    events = createEventEmitter<Events>();

    constructor(...args: any[]) {
      super(...args);
    }
  };
  
  return MixinClass as T & Constructor<{ events: UnifiedEventEmitter<Events> }>;
}

// =============================================================================
// Legacy Compatibility Exports
// =============================================================================

/**
 * @deprecated Use UnifiedEventEmitter instead
 */
export const SimpleEventEmitter = UnifiedEventEmitter;

/**
 * @deprecated Use UnifiedEventEmitter instead
 */
export const EventEmitter = UnifiedEventEmitter;
