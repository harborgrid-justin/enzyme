/**
 * @file useModule Hook
 * @module vdom/hooks/useModule
 * @description Primary hook for accessing module context, state, and
 * cross-module communication capabilities within a module boundary.
 *
 * @author Agent 5 - PhD Virtual DOM Expert
 * @version 1.0.0
 */

import { useMemo, useCallback } from 'react';
import {
  type ModuleId,
  type UseModuleReturn,
  type EventHandler,
  type EventSubscription,
  type EventSubscriptionOptions,
  type ModuleBoundaryConfig,
  type ModulePerformanceMetrics,
  ModuleLifecycleState,
} from '../types';
import { useModuleContext } from '../ModuleBoundary';
import { useEventBus } from '../ModuleProvider';

/**
 * Primary hook for accessing module context and capabilities.
 * Provides module identification, state, metrics, and event communication.
 *
 * @returns Module context and utilities
 * @throws Error if used outside a ModuleBoundary
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const {
 *     moduleId,
 *     config,
 *     isMounted,
 *     emit,
 *     on,
 *   } = useModule();
 *
 *   // Subscribe to events
 *   useEffect(() => {
 *     const subscription = on('user:action', (message) => {
 *       console.log('Action received:', message.payload);
 *     });
 *
 *     return () => subscription.unsubscribe();
 *   }, [on]);
 *
 *   // Emit events
 *   const handleClick = () => {
 *     emit('button:clicked', { buttonId: 'submit' });
 *   };
 *
 *   return (
 *     <div>
 *       <span>Module: {config.name}</span>
 *       <button onClick={handleClick}>Submit</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useModule(): UseModuleReturn {
  const context = useModuleContext();
  const eventBus = useEventBus();

  const {
    moduleId,
    config,
    state,
  } = context;

  // Derived state - use destructuring
  const { lifecycleState, isVisible, error, metrics } = state;
  const isMounted = lifecycleState === ModuleLifecycleState.MOUNTED;
  const hasError = error !== null;

  // Event emission
  const emit = useCallback(
    <T>(name: string, payload: T): void => {
      eventBus.publish(name, payload, moduleId);
    },
    [eventBus, moduleId]
  );

  // Event subscription
  const on = useCallback(
    <T>(
      name: string,
      handler: EventHandler<T>,
      _options?: EventSubscriptionOptions
    ): EventSubscription => {
      const subscriptionId = `${moduleId}-${name}-${Date.now()}`;
      let isActive = true;
      const unsubscribeFn = eventBus.subscribe(name, handler, moduleId);
      
      const unsubscribe = (): void => {
        if (isActive) {
          isActive = false;
          unsubscribeFn();
        }
      };
      
      return {
        id: subscriptionId,
        eventName: name,
        unsubscribe,
        get isActive() { return isActive; },
      };
    },
    [eventBus, moduleId]
  );

  // Memoize return value
  return useMemo<UseModuleReturn>(
    () => ({
      moduleId,
      config,
      lifecycleState,
      isMounted,
      isVisible,
      hasError,
      error,
      metrics,
      emit,
      on,
    }),
    [
      moduleId,
      config,
      lifecycleState,
      isMounted,
      isVisible,
      hasError,
      error,
      metrics,
      emit,
      on,
    ]
  );
}

/**
 * Hook to get the current module ID.
 * @returns Module ID
 * @throws Error if used outside a ModuleBoundary
 */
export function useModuleId(): ModuleId {
  const { moduleId } = useModule();
  return moduleId;
}

/**
 * Hook to get the current module configuration.
 * @returns Module configuration
 * @throws Error if used outside a ModuleBoundary
 */
export function useModuleConfig(): ModuleBoundaryConfig {
  const { config } = useModule();
  return config;
}

/**
 * Hook to check if the module is mounted.
 * @returns Whether module is mounted
 * @throws Error if used outside a ModuleBoundary
 */
export function useIsModuleMounted(): boolean {
  const { isMounted } = useModule();
  return isMounted;
}

/**
 * Hook to get the module's performance metrics.
 * @returns Performance metrics
 * @throws Error if used outside a ModuleBoundary
 */
export function useModuleMetrics(): ModulePerformanceMetrics {
  const { metrics } = useModule();
  return metrics;
}

/**
 * Hook to emit events from the current module.
 * @returns Event emitter function
 * @throws Error if used outside a ModuleBoundary
 *
 * @example
 * ```tsx
 * const emit = useModuleEmit();
 *
 * const handleSave = () => {
 *   emit('data:saved', { id: '123', timestamp: Date.now() });
 * };
 * ```
 */
export function useModuleEmit(): <T>(name: string, payload: T) => void {
  const { emit } = useModule();
  return emit;
}

/**
 * Hook to subscribe to events in the current module.
 * @returns Event subscription function
 * @throws Error if used outside a ModuleBoundary
 *
 * @example
 * ```tsx
 * const on = useModuleSubscribe();
 *
 * useEffect(() => {
 *   const sub = on('notification:received', (msg) => {
 *     showNotification(msg.payload);
 *   });
 *
 *   return () => sub.unsubscribe();
 * }, [on]);
 * ```
 */
export function useModuleSubscribe(): <T>(
  name: string,
  handler: EventHandler<T>,
  options?: EventSubscriptionOptions
) => EventSubscription {
  const { on } = useModule();
  return on;
}
