/**
 * @file VDOM Event Bus
 * @description Module event bus for cross-module communication in the Virtual DOM system
 */

import { globalEventBus, createEventEmitter, type EventHandler } from '../shared/event-utils';

// =============================================================================
// Types
// =============================================================================

export interface EventBusConfig {
  /** Maximum listeners per event */
  maxListeners?: number;
  /** Enable debug mode */
  debug?: boolean;
  /** Enable event history */
  enableHistory?: boolean;
  /** Maximum events in history */
  maxHistorySize?: number;
}

export interface EventBusStats {
  /** Total events published */
  totalPublished: number;
  /** Total events delivered */
  totalDelivered: number;
  /** Active subscriptions */
  activeSubscriptions: number;
  /** Events by type */
  eventsByType: Map<string, number>;
}

export interface ModuleEventMessage<T = unknown> {
  /** Source module ID */
  source: string;
  /** Target module ID (optional, broadcast if not specified) */
  target?: string;
  /** Event type */
  type: string;
  /** Event payload */
  payload: T;
  /** Timestamp */
  timestamp: number;
}

export type ModuleEventHandler<T = unknown> = EventHandler<ModuleEventMessage<T>>;

// =============================================================================
// Module Event Bus
// =============================================================================

export interface ModuleEventBusOptions {
  /** Enable security checks */
  enableSecurity?: boolean;
  /** Maximum listeners per event */
  maxListeners?: number;
  /** Enable debug mode */
  debug?: boolean;
  /** Enable event history */
  enableHistory?: boolean;
  /** Maximum events in history */
  maxHistorySize?: number;
}

/**
 * Event bus for cross-module communication
 */
export class ModuleEventBus {
  private readonly emitter;
  private readonly moduleSubscriptions = new Map<string, Set<() => void>>();
  // private readonly options: ModuleEventBusOptions;

  constructor(options: ModuleEventBusOptions = {}) {
    // this.options = options;
    this.emitter = createEventEmitter<Record<string, ModuleEventMessage>>({
      maxListeners: options.maxListeners ?? 100,
      debug: options.debug ?? false,
      enableStatistics: true,
    });
  }

  /**
   * Subscribe to events
   */
  subscribe<T = unknown>(
    eventType: string,
    handler: ModuleEventHandler<T>,
    moduleId?: string
  ): () => void {
    const unsubscribe = this.emitter.on(eventType, handler as EventHandler<ModuleEventMessage>);

    // Track subscription by module if provided
    if (moduleId) {
      if (!this.moduleSubscriptions.has(moduleId)) {
        this.moduleSubscriptions.set(moduleId, new Set());
      }
      this.moduleSubscriptions.get(moduleId)!.add(unsubscribe);
    }

    return unsubscribe;
  }

  /**
   * Publish an event
   */
  publish<T = unknown>(
    eventType: string,
    payload: T,
    source: string,
    target?: string
  ): void {
    const message: ModuleEventMessage<T> = {
      source,
      target,
      type: eventType,
      payload,
      timestamp: Date.now(),
    };

    this.emitter.emitSync(eventType, message as ModuleEventMessage);
  }

  /**
   * Unsubscribe all handlers for a module
   */
  unsubscribeModule(moduleId: string): void {
    const subscriptions = this.moduleSubscriptions.get(moduleId);
    if (subscriptions) {
      for (const unsubscribe of subscriptions) {
        unsubscribe();
      }
      this.moduleSubscriptions.delete(moduleId);
    }
  }

  /**
   * Get statistics
   */
  getStats(): EventBusStats {
    const stats = this.emitter.getStats();
    return {
      totalPublished: stats.totalPublished,
      totalDelivered: stats.totalDelivered,
      activeSubscriptions: stats.activeSubscriptions,
      eventsByType: stats.eventsByType,
    };
  }

  /**
   * Clear all subscriptions
   */
  clear(): void {
    this.emitter.clear();
    this.moduleSubscriptions.clear();
  }

  /**
   * Dispose the event bus
   */
  dispose(): void {
    this.clear();
    this.emitter.dispose();
  }
}

// =============================================================================
// Default Instance
// =============================================================================

let defaultEventBus: ModuleEventBus | null = null;

/**
 * Get the default event bus instance
 */
export function getDefaultEventBus(): ModuleEventBus {
  if (!defaultEventBus) {
    defaultEventBus = new ModuleEventBus();
  }
  return defaultEventBus;
}

/**
 * Set a custom default event bus
 */
export function setDefaultEventBus(bus: ModuleEventBus): void {
  defaultEventBus = bus;
}

/**
 * Reset the default event bus
 */
export function resetDefaultEventBus(): void {
  if (defaultEventBus) {
    defaultEventBus.dispose();
    defaultEventBus = null;
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Subscribe to an event on the default event bus
 */
export function subscribe<T = unknown>(
  eventType: string,
  handler: ModuleEventHandler<T>,
  moduleId?: string
): () => void {
  return getDefaultEventBus().subscribe(eventType, handler, moduleId);
}

/**
 * Publish an event on the default event bus
 */
export function publish<T = unknown>(
  eventType: string,
  payload: T,
  source: string,
  target?: string
): void {
  getDefaultEventBus().publish(eventType, payload, source, target);
}

// Re-export global event bus for convenience
export { globalEventBus };
