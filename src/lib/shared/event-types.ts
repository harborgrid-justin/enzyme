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
