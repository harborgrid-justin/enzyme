/**
 * @file Virtual Modular DOM System
 * @module vdom
 * @description Complete Virtual Modular DOM system for Harbor React Framework.
 * Provides module boundary management, memory-efficient VDOM pooling,
 * security sandboxing, and cross-module communication.
 *
 * @author Agent 5 - PhD Virtual DOM Expert
 * @version 1.0.0
 *
 * @example
 * ```tsx
 * import {
 *   ModuleProvider,
 *   ModuleBoundary,
 *   ModuleSlot,
 *   useModule,
 *   useModuleState,
 * } from '@/lib/vdom';
 *
 * function App() {
 *   return (
 *     <ModuleProvider>
 *       <ModuleBoundary id="app" name="Application">
 *         <Dashboard />
 *       </ModuleBoundary>
 *     </ModuleProvider>
 *   );
 * }
 *
 * function Dashboard() {
 *   const { moduleId, emit } = useModule();
 *   const { state, setState } = useModuleState('counter', { initialValue: 0 });
 *
 *   return (
 *     <ModuleBoundary id="dashboard" name="Dashboard">
 *       <p>Count: {state}</p>
 *       <button onClick={() => setState(s => s + 1)}>Increment</button>
 *     </ModuleBoundary>
 *   );
 * }
 * ```
 */

// =============================================================================
// Types
// =============================================================================
export type {
  // Core types
  ModuleId,
  VNodeId,
  SecurityNonce,
  ModuleEventName,
  DeepReadonly,
  Optional,

  // Virtual node types
  VNodeProps,
  VirtualNode,
  VNodeCreateOptions,

  // Module lifecycle types
  ModuleLifecycleHooks,

  // Hydration types
  HydrationConfig,
  HydrationData,

  // Module boundary types
  ModuleDependency,
  ModuleSlotDefinition,
  ModuleBoundaryConfig,
  ModuleBoundaryState,
  VirtualModule,

  // Security types
  CSPDirectives,
  ModuleSecurityConfig,
  SecurityContext,
  SecurityViolation,

  // Event bus types
  ModuleEventMessage,
  EventSubscriptionOptions,
  EventHandler,
  EventSubscription,

  // Pool types
  VDOMPoolConfig,
  VDOMPoolStats,

  // Registry types
  ModuleRegistryEntry,
  ModuleQueryOptions,

  // Loader types
  ModuleLoadOptions,
  ModuleLoadingState,

  // Performance types
  ModulePerformanceMetrics,
  PerformanceBudget,

  // Context types
  ModuleContextValue,
  ModuleAction,
  ModuleProviderConfig,

  // Hook return types
  UseModuleReturn,
  UseModuleStateReturn,
  UseModuleBoundaryReturn,
  UseModuleHydrationReturn,
  UseSecureModuleReturn,
} from './types';
import { isDev, devLog } from '@/lib/core/config/env-helper';

// Type enums and constants
export {
  VNodeType,
  ModuleLifecycleState,
  ModuleLifecycleEvent,
  HydrationState,
  HydrationPriority,
  HydrationTrigger,
  EventPriority,
  LoadingPriority,

  // Factory functions
  createModuleId,
  createVNodeId,
  createSecurityNonce,
  isModuleId,
  isVNodeId,

  // Default configurations
  DEFAULT_HYDRATION_CONFIG,
  DEFAULT_POOL_CONFIG,
  DEFAULT_SECURITY_CONFIG,
} from './types';

// =============================================================================
// Virtual Module
// =============================================================================
export {
  VirtualModuleManager,
  createVirtualModule,
  createValidatedModuleId,
  createMinimalConfig,
} from './virtual-module';

// =============================================================================
// VDOM Pool
// =============================================================================
export {
  VDOMPool,
  getDefaultPool,
  setDefaultPool,
  resetDefaultPool,
  createVDOMPool,
  acquireNode,
  releaseNode,
} from './vdom-pool';

// =============================================================================
// Module Registry
// =============================================================================
export {
  ModuleRegistry,
  getDefaultRegistry,
  setDefaultRegistry,
  resetDefaultRegistry,
  registerModule,
  getModuleComponent,
  createModuleRegistration,
} from './module-registry';

export type {
  HMRUpdateHandler,
  ModuleRegistrationOptions,
  DependencyResolutionResult,
} from './module-registry';

// =============================================================================
// Module Loader
// =============================================================================
export {
  ModuleLoader,
  getDefaultLoader,
  setDefaultLoader,
  resetDefaultLoader,
  loadModule,
  prefetchModule,
  createLazyLoader,
} from './module-loader';

export type { PrefetchHint, LoadingMetrics } from './module-loader';

// =============================================================================
// Security Sandbox
// =============================================================================
export {
  SecuritySandbox,
  ContentSanitizer,
  CSPManager,
  EventValidator,
  createSecuritySandbox,
  createStrictSecurityConfig,
  createRelaxedSecurityConfig,
} from './security-sandbox';

// =============================================================================
// Event Bus
// =============================================================================
export {
  ModuleEventBus,
  getDefaultEventBus,
  setDefaultEventBus,
  resetDefaultEventBus,
  subscribe,
  publish,
} from './event-bus';

export type { EventBusStats, EventBusConfig } from './event-bus';

// =============================================================================
// React Components
// =============================================================================

// ModuleProvider
export { ModuleProvider } from './ModuleProvider';

export {
  useModuleSystem,
  useModuleHierarchy,
  ModuleHierarchyProvider,
  useVDOMPool,
  useModuleRegistry,
  useModuleLoader,
  useEventBus,
  useDevMode,
} from './ModuleProviderExports';

export type { ModuleSystemContextValue, ModuleProviderProps } from './ModuleProviderContext';

// ModuleBoundary
export { ModuleBoundary, useModuleContext, useOptionalModuleContext } from './ModuleBoundary';

export type { ModuleBoundaryProps } from './ModuleBoundary';

// ModuleSlot
export {
  ModuleSlot,
  DynamicModuleSlot,
  LazyModuleSlot,
  ModuleOutlet,
  ConditionalModuleSlot,
  ModulePortalSlot,
} from './ModuleSlot';

export { useFillSlot, useSlotContent, useIsSlotFilled } from './ModuleSlotExports';

export type {
  ModuleSlotProps,
  DynamicModuleSlotProps,
  ModuleOutletProps,
  LazyModuleSlotProps,
  ConditionalModuleSlotProps,
  ModulePortalSlotProps,
} from './ModuleSlot';

// =============================================================================
// Hooks
// =============================================================================
export {
  // useModule
  useModule,
  useModuleId,
  useModuleConfig,
  useIsModuleMounted,
  useModuleMetrics,
  useModuleEmit,
  useModuleSubscribe,

  // useModuleState
  useModuleState,
  useSimpleModuleState,
  useBooleanModuleState,
  useArrayModuleState,
  useRecordModuleState,

  // useModuleBoundary
  useModuleBoundary,
  useBoundaryDimensions,
  useBoundaryVisibility,
  useModuleDepth,
  useModulePath,
  useIsNestedModule,
  useParentModuleId,
  useSlot,
  useSlots,

  // useModuleHydration
  useModuleHydration,
  useIsHydrated,
  useHydrateTrigger,
  useHydrationProgress,
  useOnHydrated,
  useOnHydrationError,
  useHydrationGuard,
  useHydrationTiming,

  // useSecureModule
  useSecureModule,
  useSecurityNonce,
  useIsSecure,
  useSanitizer,
  useContentValidator,
  useSecurityViolations,
  useSafeHtml,
  useSecureUrl,
  useSecureStyleProps,
  useSecureScriptProps,
  useIsEventAllowed,
  useSecureMessaging,
} from './hooks';

export type { UseModuleStateOptions } from './hooks';

// =============================================================================
// Convenience Re-exports
// =============================================================================

/**
 * Initialize the Virtual Modular DOM system with default configuration.
 * Call this once at application startup.
 *
 * @param config - Optional provider configuration
 *
 * @example
 * ```tsx
 * import { initializeVDOM } from '@/lib/vdom';
 *
 * // Initialize with defaults
 * initializeVDOM();
 *
 * // Or with custom configuration
 * initializeVDOM({
 *   devMode: true,
 *   enableTelemetry: true,
 * });
 * ```
 */
export function initializeVDOM(config?: Partial<import('./types').ModuleProviderConfig>): void {
  // Initialize default instances
  const pool = getDefaultPool();
  const registry = getDefaultRegistry();
  getDefaultLoader();
  getDefaultEventBus();

  // Log initialization in development
  if ((config?.devMode ?? false) || isDev()) {
    devLog('[VDOM] Virtual Modular DOM System initialized', {
      poolStats: pool.getStats(),
      registrySize: registry.size,
    });
  }
}

/**
 * Clean up the Virtual Modular DOM system.
 * Call this when shutting down the application.
 */
export function cleanupVDOM(): void {
  resetDefaultPool();
  resetDefaultRegistry();
  resetDefaultLoader();
  resetDefaultEventBus();
}

// =============================================================================
// Module Circuit Breaker
// =============================================================================
export {
  ModuleCircuitBreaker,
  ModuleCircuitOpenError,
  getModuleCircuitBreaker,
  resetModuleCircuitBreaker,
  setModuleCircuitBreaker,
  withModuleCircuitBreaker,
  withModuleCircuitBreakerFallback,
  canLoadModules,
  getModuleCircuitState,
  type ModuleCircuitBreakerConfig,
  type ModuleLoadingMetrics as ModuleCircuitBreakerMetrics,
} from './module-circuit-breaker';

// Re-export helper functions
import { getDefaultPool } from './vdom-pool';
import { getDefaultRegistry } from './module-registry';
import { getDefaultLoader } from './module-loader';
import { getDefaultEventBus, resetDefaultEventBus } from './event-bus';
import { resetDefaultPool } from './vdom-pool';
import { resetDefaultRegistry } from './module-registry';
import { resetDefaultLoader } from './module-loader';
