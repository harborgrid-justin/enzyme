/* eslint-disable react-refresh/only-export-components */
/* @refresh reset */
/**
 * @file Coordination System Public API
 * @module coordination
 * @description PhD-level intra-library coordination system for seamless library integration.
 *
 * This module provides comprehensive coordination infrastructure for the Harbor
 * React library ecosystem including:
 *
 * - **Event Bus**: Type-safe cross-library event communication
 * - **Dependency Injection**: IoC container with lifecycle management
 * - **Lifecycle Manager**: Phased initialization with dependency ordering
 * - **State Coordinator**: Cross-library state synchronization
 * - **Feature Bridge**: Module interconnection layer
 * - **Hook Composer**: Multi-library hook composition
 * - **Provider Orchestrator**: Automated provider nesting
 * - **Context Bridge**: Cross-boundary context access
 *
 * @author Agent 5 - PhD TypeScript Architect
 * @version 1.0.0
 *
 * @example Quick Start
 * ```tsx
 * import {
 *   CoordinationProvider,
 *   useCoordination,
 *   useCoordinationEvent,
 * } from '@/lib/coordination';
 *
 * function App() {
 *   return (
 *     <CoordinationProvider onReady={() => console.log('Ready!')}>
 *       <MyApp />
 *     </CoordinationProvider>
 *   );
 * }
 *
 * function MyComponent() {
 *   const { eventBus, lifecycle, isReady } = useCoordination();
 *
 *   // Subscribe to events
 *   useCoordinationEvent('auth:login', (event) => {
 *     console.log('User logged in:', event.payload.userId);
 *   });
 *
 *   return <div>Ready: {isReady ? 'Yes' : 'No'}</div>;
 * }
 * ```
 */

// ============================================================================
// React Imports for Provider/Hook Implementation
// ============================================================================

import {
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  createContext,
  type ReactNode,
  type FC,
  type ComponentType,
} from 'react';
// import { CoordinationContext } from '../contexts/CoordinationContext';

// ============================================================================
// Type Exports
// ============================================================================

export type {
  // Branded types
  LibraryId,
  EventId,
  ServiceId,
  StateSliceId,
  SubscriptionId,
  PhaseId,

  // Event types
  CoordinationEvent,
  EventHandler,
  EventSubscription,
  EventSubscriptionOptions,
  EventBusConfig,
  EventBusStats,
  CoordinationEventBus,
  KnownEventType,
  KnownEvents,
  EventPayload,

  // Known event interfaces
  AuthEvents,
  NetworkEvents,
  StateEvents,
  SystemEvents,
  ThemeEvents,
  FeatureFlagEvents,
  HydrationEvents,
  StreamingEvents,
  RealtimeEvents,
  LifecycleEvents,

  // Service types
  ServiceScope,
  ServiceLifecycle,
  ServiceContract,
  ServiceRegistration,
  ServiceRegistrationOptions,
  ServiceFactory,
  DependencyContainer,

  // Lifecycle types
  LibraryState,
  LibraryRegistration,
  LifecyclePhase,
  LifecycleManager,
  LifecycleManagerConfig,

  // State types
  StateChange,
  StateSubscriber,
  StateSliceRegistration,
  StateSyncRule,
  StateCoordinator,
  StateCoordinatorConfig,

  // Provider types
  ProviderDefinition,
  ProviderOrchestratorConfig,

  // Context bridge types
  ContextBridgeDefinition,

  // Coordination context
  CoordinationContextValue,
  CoordinationProviderProps,

  // Utility types
  DeepPartial,
  PartialBy,
  Disposable,
  Result,
} from './types';

export {
  // Enums
  EventPriority,

  // Type creators
  createLibraryId,
  createEventId,
  createServiceId,
  createStateSliceId,
  createSubscriptionId,
  createPhaseId,

  // Type guards
  isLibraryId,
  isEventId,
  isCoordinationEvent,
  isKnownEventType,

  // Result utilities
  ok,
  err,

  // Default configurations
  DEFAULT_EVENT_BUS_CONFIG,
  DEFAULT_LIFECYCLE_CONFIG,
  DEFAULT_LIFECYCLE_PHASES,
  DEFAULT_STATE_COORDINATOR_CONFIG,
} from './types';

// ============================================================================
// Event Bus Exports
// ============================================================================

export {
  // CoordinationEventBusImpl,
  getCoordinationEventBus,
  setCoordinationEventBus,
  resetCoordinationEventBus,
  publishEvent,
  subscribeToEvent,
  // createLibraryScopedBus,
} from './event-bus';

// ============================================================================
// Dependency Injection Exports
// ============================================================================

export {
  DependencyInjectorImpl,
  createServiceContract,
  getGlobalContainer,
  setGlobalContainer,
  resetGlobalContainer,
  registerService,
  resolveService,
  tryResolveService,

  // Pre-defined contracts
  LoggerContract,
  ConfigContract,
  TelemetryContract,
  type ILogger,
  type IConfigService,
  type ITelemetryService,
} from './dependency-injector';

// ============================================================================
// Lifecycle Manager Exports
// ============================================================================

export {
  LifecycleManagerImpl,
  getLifecycleManager,
  setLifecycleManager,
  resetLifecycleManager,
  registerLibrary,
  initializeLibraries,
  shutdownLibraries,

  // Pre-defined IDs
  LIBRARY_IDS,
  PHASE_IDS,
} from './lifecycle-manager';

// ============================================================================
// State Coordinator Exports
// ============================================================================

export {
  StateCoordinatorImpl,
  getStateCoordinator,
  setStateCoordinator,
  resetStateCoordinator,
  registerStateSlice,

  // Pre-defined IDs
  SLICE_IDS,
} from './state-coordinator';

// ============================================================================
// Feature Bridge Exports
// ============================================================================

export {
  FeatureBridgeImpl,
  createFeatureId,
  getFeatureBridge,
  setFeatureBridge,
  resetFeatureBridge,
  registerFeature,
  invokeCapability,
  invokeAnyCapability,
  type FeatureId,
  type FeatureCapability,
  type FeatureRegistration,
  type InvocationOptions,
  type InvocationResult,
  type FeatureBridgeConfig,
} from './feature-bridge';

// ============================================================================
// Hook Composer Exports
// ============================================================================

export {
  useComposedHooks,
  useSelectiveHooks,
  useConditionalHook,
  useMemoizedComposition,
  useParallelHooks,
  useHookSequence,
  defineHook,
  defineAsyncHook,
  type HookState,
  type ComposedResult,
  type HookDef,
  type AsyncHookResult,
  type CompositionOptions,
} from './hook-composer';

// ============================================================================
// Provider Orchestrator Exports
// ============================================================================

export {
  ProviderOrchestratorImpl,
  OrchestratedProviders,
  getProviderOrchestrator,
  setProviderOrchestrator,
  resetProviderOrchestrator,
  registerProvider,
  getGlobalProviderTree,
  DefaultLoadingFallback,
  DefaultErrorFallback,
  type OrchestratedProvidersProps,
} from './provider-orchestrator';

// ============================================================================
// Context Bridge Exports
// ============================================================================

export {
  ContextBridgeImpl,
  ContextBridgeProvider,
  useBridgeManager,
  useBridgedContext,
  BridgeSource,
  BridgeConsumer,
  createComposedContext,
  useMultiContextSelector,
  withBridgedContext,
  getContextBridgeManager,
  setContextBridgeManager,
  resetContextBridgeManager,
  type BridgeOptions,
  type ContextBridgeProviderProps,
  type BridgeSourceProps,
  type BridgeConsumerProps,
  type WithBridgedContextProps,
} from './context-bridge';

// ============================================================================
// Coordination Context
// ============================================================================

import type {
  CoordinationContextValue,
  KnownEventType,
  EventPayload,
  EventHandler,
  EventSubscriptionOptions,
  ServiceContract,
} from './types';
import { createLibraryId } from './types';
import { getCoordinationEventBus } from './event-bus';
import { getGlobalContainer } from './dependency-injector';
import { getLifecycleManager } from './lifecycle-manager';
import { getStateCoordinator } from './state-coordinator';

/**
 * Coordination context for React.
 */
const CoordinationContext = createContext<CoordinationContextValue | null>(null);
CoordinationContext.displayName = 'CoordinationContext';

/**
 * Props for CoordinationProvider component.
 */
export interface CoordinationProviderComponentProps {
  /** Child components */
  children: ReactNode;
  /** Debug mode */
  debug?: boolean;
  /** Callback when coordination is ready */
  onReady?: () => void;
  /** Error handler */
  onError?: (error: Error) => void;
  /** Whether to auto-initialize libraries */
  autoInitialize?: boolean;
}

/**
 * Provider component for the coordination system.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <CoordinationProvider
 *       debug={process.env.NODE_ENV === 'development'}
 *       onReady={() => console.log('Coordination ready')}
 *       autoInitialize
 *     >
 *       <AppContent />
 *     </CoordinationProvider>
 *   );
 * }
 * ```
 */
export const CoordinationProvider: FC<CoordinationProviderComponentProps> = ({
  children,
  debug = false,
  onReady,
  onError,
  autoInitialize = true,
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const initRef = useRef(false);

  // Initialize coordination system
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const initialize = async (): Promise<void> => {
      try {
        if (autoInitialize) {
          const lifecycle = getLifecycleManager();
          await lifecycle.initialize();
        }

        setIsInitialized(true);
        onReady?.();

        if (debug) {
          console.info('[Coordination] System initialized');
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        onError?.(err);

        if (debug) {
          console.error('[Coordination] Initialization failed:', error);
        }
      }
    };

    void initialize();

    // Cleanup on unmount
    return () => {
      const lifecycle = getLifecycleManager();
      void lifecycle.shutdown().catch(console.error);
    };
  }, [autoInitialize, debug, onError, onReady]);

  // Create context value
  const contextValue = useMemo<CoordinationContextValue>(
    () => ({
      eventBus: getCoordinationEventBus() as unknown as import('./types').CoordinationEventBus,
      container: getGlobalContainer(),
      lifecycle: getLifecycleManager(),
      stateCoordinator: getStateCoordinator({ debug }),
      isInitialized,
      version: '1.0.0',
    }),
    [debug, isInitialized]
  );

  return (
    <CoordinationContext.Provider value={contextValue}>{children}</CoordinationContext.Provider>
  );
};

CoordinationProvider.displayName = 'CoordinationProvider';

// ============================================================================
// Core Hook: useCoordination
// ============================================================================

/**
 * Hook to access the coordination system.
 *
 * @returns Coordination context value
 * @throws Error if used outside CoordinationProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { eventBus, lifecycle, isInitialized } = useCoordination();
 *
 *   const handleClick = () => {
 *     eventBus.publish('theme:changed', {
 *       mode: 'dark',
 *       resolvedMode: 'dark',
 *       source: 'user',
 *     });
 *   };
 *
 *   return (
 *     <button onClick={handleClick} disabled={!isInitialized}>
 *       Toggle Theme
 *     </button>
 *   );
 * }
 * ```
 */
export function useCoordination(): CoordinationContextValue {
  const context = useContext(CoordinationContext);

  if (!context) {
    throw new Error(
      'useCoordination must be used within a CoordinationProvider. ' +
        'Wrap your component tree with <CoordinationProvider>.'
    );
  }

  return context;
}

/**
 * Hook to optionally access the coordination system.
 * Returns null if outside CoordinationProvider.
 */
export function useOptionalCoordination(): CoordinationContextValue | null {
  return useContext(CoordinationContext);
}

// ============================================================================
// Event Hooks
// ============================================================================

/**
 * Hook to subscribe to coordination events.
 *
 * @template T - Event type
 * @param type - Event type to subscribe to
 * @param handler - Event handler
 * @param options - Subscription options
 *
 * @example
 * ```tsx
 * function AuthListener() {
 *   useCoordinationEvent('auth:login', (event) => {
 *     console.log('User logged in:', event.payload.userId);
 *   });
 *
 *   useCoordinationEvent('auth:logout', (event) => {
 *     console.log('User logged out:', event.payload.reason);
 *   });
 *
 *   return null;
 * }
 * ```
 */
export function useCoordinationEvent<T extends KnownEventType>(
  type: T,
  handler: EventHandler<EventPayload<T>>,
  options?: EventSubscriptionOptions
): void {
  const { eventBus } = useCoordination();

  useEffect(() => {
    const subscription = eventBus.subscribe(type, handler, options);
    return () => subscription.unsubscribe();
  }, [eventBus, type, handler, options]);
}

/**
 * Hook to publish coordination events.
 *
 * @returns Publish function
 *
 * @example
 * ```tsx
 * function ThemeToggle() {
 *   const publish = useCoordinationPublish();
 *
 *   const toggleTheme = () => {
 *     publish('theme:changed', {
 *       mode: 'dark',
 *       resolvedMode: 'dark',
 *       source: 'user',
 *     });
 *   };
 *
 *   return <button onClick={toggleTheme}>Toggle Theme</button>;
 * }
 * ```
 */
export function useCoordinationPublish(): <T extends KnownEventType>(
  type: T,
  payload: EventPayload<T>
) => string {
  const { eventBus } = useCoordination();

  return useCallback(
    <T extends KnownEventType>(type: T, payload: EventPayload<T>) => {
      return eventBus.publish(type, payload);
    },
    [eventBus]
  );
}

// ============================================================================
// Lifecycle Hooks
// ============================================================================

/**
 * Hook to check if all libraries are initialized.
 *
 * @returns Whether all libraries are initialized
 */
export function useIsCoordinationReady(): boolean {
  const { isInitialized, lifecycle } = useCoordination();
  return isInitialized && lifecycle.isFullyInitialized();
}

/**
 * Hook to get library initialization state.
 *
 * @param libraryId - Library ID
 * @returns Library state or undefined
 */
export function useLibraryState(libraryId: string): string | undefined {
  const { lifecycle } = useCoordination();
  const brandedId = createLibraryId(libraryId);
  const [state, setState] = useState(() => lifecycle.getLibraryState(brandedId));

  useEffect(() => {
    // Poll for state changes (could be improved with event subscription)
    const interval = setInterval(() => {
      const newState = lifecycle.getLibraryState(brandedId);
      setState(newState);
    }, 100);

    return () => clearInterval(interval);
  }, [lifecycle, brandedId]);

  return state;
}

// ============================================================================
// Service Hooks
// ============================================================================

/**
 * Hook to resolve a service from the DI container.
 *
 * @template T - Service type
 * @param contract - Service contract
 * @returns Resolved service
 */
export function useService<T>(contract: ServiceContract<T>): T {
  const { container } = useCoordination();
  return useMemo(() => container.resolve(contract), [container, contract]);
}

/**
 * Hook to try resolving a service.
 *
 * @template T - Service type
 * @param contract - Service contract
 * @returns Service or undefined
 */
export function useTryService<T>(contract: ServiceContract<T>): T | undefined {
  const { container } = useCoordination();
  return useMemo(() => container.tryResolve(contract), [container, contract]);
}

// ============================================================================
// Higher-Order Component: withCoordination
// ============================================================================

/**
 * Props injected by withCoordination HOC.
 */
export interface WithCoordinationProps {
  coordination: CoordinationContextValue;
}

/**
 * Higher-order component to inject coordination context.
 *
 * @template P - Component props
 * @param Component - Component to wrap
 * @returns Wrapped component
 *
 * @example
 * ```tsx
 * interface MyComponentProps extends WithCoordinationProps {
 *   title: string;
 * }
 *
 * class MyComponent extends React.Component<MyComponentProps> {
 *   handleClick = () => {
 *     this.props.coordination.eventBus.publish('theme:changed', {
 *       mode: 'dark',
 *       resolvedMode: 'dark',
 *       source: 'user',
 *     });
 *   };
 *
 *   render() {
 *     return (
 *       <button onClick={this.handleClick}>
 *         {this.props.title}
 *       </button>
 *     );
 *   }
 * }
 *
 * export default withCoordination(MyComponent);
 * ```
 */
export function withCoordination<P extends WithCoordinationProps>(
  Component: ComponentType<P>
): FC<Omit<P, keyof WithCoordinationProps>> {
  const WrappedComponent: FC<Omit<P, keyof WithCoordinationProps>> = (props) => {
    const coordination = useCoordination();
    return <Component {...(props as P)} coordination={coordination} />;
  };

  WrappedComponent.displayName = `withCoordination(${Component.displayName ?? Component.name ?? 'Component'})`;

  return WrappedComponent;
}

// ============================================================================
// Convenience Utilities
// ============================================================================

/**
 * Initializes the coordination system outside of React.
 *
 * @param options - Initialization options
 * @returns Cleanup function
 *
 * @example
 * ```typescript
 * // In main.ts
 * import { initCoordination } from '@/lib/coordination';
 *
 * const cleanup = await initCoordination({
 *   debug: import.meta.env.DEV,
 * });
 *
 * // On app shutdown
 * cleanup();
 * ```
 */
export async function initCoordination(
  options: {
    debug?: boolean;
  } = {}
): Promise<() => Promise<void>> {
  const { debug = false } = options;

  // Initialize event bus
  const eventBus = getCoordinationEventBus();

  // Initialize lifecycle
  const lifecycle = getLifecycleManager();
  await lifecycle.initialize();

  if (debug) {
    console.info('[Coordination] System initialized outside React');
  }

  // Return cleanup function
  return async () => {
    await lifecycle.shutdown();
    eventBus.clear();

    if (debug) {
      console.info('[Coordination] System shut down');
    }
  };
}

/**
 * Gets the coordination system version.
 */
export function getCoordinationVersion(): string {
  return '1.0.0';
}

// ============================================================================
// Export Context for Advanced Usage
// ============================================================================

export { CoordinationContext };
