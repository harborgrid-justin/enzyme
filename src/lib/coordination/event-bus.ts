/**
 * @file Coordination Event Bus
 * @module coordination/event-bus
 * @description Event bus for coordination module cross-component communication.
 *
 * Provides a typed event bus for lifecycle, state coordination, and feature bridge events.
 *
 * @author Agent 5 - PhD TypeScript Architect
 * @version 1.0.0
 */

// ============================================================================
// Event Types
// ============================================================================

/**
 * Coordination event types and their payloads.
 */
export interface CoordinationEvents {
  // Lifecycle events
  'lifecycle:phase-started': {
    phaseId: string;
    phaseName: string;
    order: number;
  };
  'lifecycle:phase-completed': {
    phaseId: string;
    phaseName: string;
    duration: number;
  };
  'lifecycle:library-initialized': {
    libraryId: string;
    duration: number;
  };
  'lifecycle:all-initialized': {
    totalDuration: number;
    libraryCount: number;
  };
  'lifecycle:shutdown-started': Record<string, never>;
  'lifecycle:shutdown-completed': {
    duration: number;
  };

  // State coordination events
  'state:changed': {
    sliceId: string;
    path?: string[];
    previousValue: unknown;
    newValue: unknown;
  };
  'state:synced': {
    ruleId: string;
    sourceSlice: string;
    targetSlice: string;
  };

  // Feature bridge events
  'feature:registered': {
    featureId: string;
    name: string;
    capabilities: string[];
  };
  'feature:loaded': {
    featureId: string;
    duration: number;
  };
  'feature:capability-invoked': {
    featureId: string;
    capability: string;
    duration: number;
    success: boolean;
  };
}

/**
 * Event names for coordination.
 */
export type CoordinationEventName = keyof CoordinationEvents;

/**
 * Event handler type.
 */
export type CoordinationEventHandler<E extends CoordinationEventName> = (
  payload: CoordinationEvents[E]
) => void;

// ============================================================================
// Event Bus Implementation
// ============================================================================

/**
 * Coordination event bus for typed pub/sub communication.
 */
export class CoordinationEventBus {
  /** Event listeners map */
  private readonly listeners: Map<
    CoordinationEventName,
    Set<CoordinationEventHandler<CoordinationEventName>>
  > = new Map();

  /** Debug mode */
  private debug = false;

  /**
   * Enables or disables debug logging.
   */
  setDebug(enabled: boolean): void {
    this.debug = enabled;
  }

  /**
   * Subscribes to an event.
   * @param event - Event name
   * @param handler - Event handler
   * @returns Unsubscribe function
   */
  subscribe<E extends CoordinationEventName>(
    event: E,
    handler: CoordinationEventHandler<E>
  ): () => void {
    let handlers = this.listeners.get(event);
    if (!handlers) {
      handlers = new Set();
      this.listeners.set(event, handlers);
    }

    handlers.add(handler as CoordinationEventHandler<CoordinationEventName>);

    return () => {
      handlers?.delete(handler as CoordinationEventHandler<CoordinationEventName>);
      if (handlers?.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  /**
   * Publishes an event.
   * @param event - Event name
   * @param payload - Event payload
   */
  publish<E extends CoordinationEventName>(
    event: E,
    payload: CoordinationEvents[E]
  ): void {
    if (this.debug) {
      console.debug(`[CoordinationEventBus] ${event}`, payload);
    }

    const handlers = this.listeners.get(event);
    if (!handlers) return;

    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (error) {
        console.error(`[CoordinationEventBus] Handler error for ${event}:`, error);
      }
    }
  }

  /**
   * Subscribes to an event once.
   * @param event - Event name
   * @param handler - Event handler
   * @returns Unsubscribe function
   */
  once<E extends CoordinationEventName>(
    event: E,
    handler: CoordinationEventHandler<E>
  ): () => void {
    const unsubscribe = this.subscribe(event, (payload) => {
      unsubscribe();
      handler(payload);
    });
    return unsubscribe;
  }

  /**
   * Removes all listeners for an event.
   * @param event - Event name (optional, clears all if not provided)
   */
  clear(event?: CoordinationEventName): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Gets the number of listeners for an event.
   * @param event - Event name
   */
  listenerCount(event: CoordinationEventName): number {
    return this.listeners.get(event)?.size ?? 0;
  }

  /**
   * Subscribes to multiple event types.
   * @param events - Event names
   * @param handler - Event handler
   * @returns Array of unsubscribe functions
   */
  subscribeMany<E extends CoordinationEventName>(
    events: E[],
    handler: CoordinationEventHandler<E>
  ): (() => void)[] {
    return events.map(event => this.subscribe(event, handler));
  }

  /**
   * Request-response pattern.
   * @param requestEvent - Request event name
   * @param responseEvent - Response event name
   * @param payload - Request payload
   * @param timeout - Timeout in milliseconds
   * @returns Promise that resolves with the response payload
   */
  async request<TReq extends CoordinationEventName, TRes extends CoordinationEventName>(
    requestEvent: TReq,
    responseEvent: TRes,
    payload: CoordinationEvents[TReq],
    timeout = 5000
  ): Promise<CoordinationEvents[TRes]> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        unsubscribe();
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout);

      const unsubscribe = this.once(responseEvent, (responsePayload) => {
        clearTimeout(timer);
        resolve(responsePayload);
      });

      this.publish(requestEvent, payload);
    });
  }

  /**
   * Get event bus statistics.
   * @returns Event bus statistics
   */
  getStats(): {
    totalPublished: number;
    totalDelivered: number;
    totalFailures: number;
    activeSubscriptions: number;
  } {
    let totalSubscriptions = 0;
    for (const handlers of this.listeners.values()) {
      totalSubscriptions += handlers.size;
    }

    return {
      totalPublished: 0, // Could track this with a counter if needed
      totalDelivered: 0, // Could track this with a counter if needed
      totalFailures: 0,  // Could track this with a counter if needed
      activeSubscriptions: totalSubscriptions,
    };
  }

  /**
   * Disposes the event bus.
   */
  dispose(): void {
    this.listeners.clear();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Global coordination event bus instance.
 */
let globalEventBus: CoordinationEventBus | null = null;

/**
 * Gets the global coordination event bus.
 * @returns Coordination event bus instance
 */
export function getCoordinationEventBus(): CoordinationEventBus {
  if (!globalEventBus) {
    globalEventBus = new CoordinationEventBus();
  }
  return globalEventBus;
}

/**
 * Sets the global coordination event bus.
 * @param bus - Event bus instance
 */
export function setCoordinationEventBus(bus: CoordinationEventBus): void {
  if (globalEventBus) {
    globalEventBus.dispose();
  }
  globalEventBus = bus;
}

/**
 * Resets the global coordination event bus.
 */
export function resetCoordinationEventBus(): void {
  if (globalEventBus) {
    globalEventBus.dispose();
    globalEventBus = null;
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Publishes an event to the global bus.
 */
export function publishEvent<E extends CoordinationEventName>(
  event: E,
  payload: CoordinationEvents[E]
): void {
  getCoordinationEventBus().publish(event, payload);
}

/**
 * Subscribes to an event on the global bus.
 */
export function subscribeToEvent<E extends CoordinationEventName>(
  event: E,
  handler: CoordinationEventHandler<E>
): () => void {
  return getCoordinationEventBus().subscribe(event, handler);
}

/**
 * Subscribes to an event once on the global bus.
 */
export function onceEvent<E extends CoordinationEventName>(
  event: E,
  handler: CoordinationEventHandler<E>
): () => void {
  return getCoordinationEventBus().once(event, handler);
}
