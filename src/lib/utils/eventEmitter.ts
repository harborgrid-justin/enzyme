/**
 * @file Event Emitter - Re-exports from shared event-utils
 * @description Provides backward compatibility for modules importing from eventEmitter
 */

export {
  createEventEmitter,
  globalEventBus,
  events,
  type AppEvents,
  type EventHandler,
  type UnifiedEventEmitterOptions,
  UnifiedEventEmitter,
} from '../shared/event-utils';

// Re-export types
export type {
  EventListenerOptions,
  Unsubscribe,
  EventMiddleware,
  IEventEmitter,
  EventBusStats,
} from '../shared/event-utils';

// Re-export EventEmitter as alias
export { UnifiedEventEmitter as EventEmitter } from '../shared/event-utils';
