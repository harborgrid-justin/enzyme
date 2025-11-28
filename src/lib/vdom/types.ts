/**
 * @file Virtual Modular DOM System - Core Type Definitions
 * @module vdom/types
 * @description Comprehensive type system for the Virtual Modular DOM architecture.
 * Provides type-safe interfaces for virtual nodes, module boundaries, hydration,
 * security policies, and cross-module communication.
 *
 * @author Agent 5 - PhD Virtual DOM Expert
 * @version 1.0.0
 */

import type { ReactNode, ComponentType, ErrorInfo } from 'react';

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Branded type for unique module identifiers.
 * Prevents accidental mixing of module IDs with regular strings.
 */
export type ModuleId = string & { readonly __brand: 'ModuleId' };

/**
 * Branded type for virtual node identifiers.
 */
export type VNodeId = string & { readonly __brand: 'VNodeId' };

/**
 * Branded type for security nonces.
 */
export type SecurityNonce = string & { readonly __brand: 'SecurityNonce' };

/**
 * Type-safe event name with module namespace.
 */
export type ModuleEventName<T extends string = string> = `module:${T}`;

/**
 * Deep readonly utility type.
 */
export type DeepReadonly<T> = T extends (infer R)[]
  ? ReadonlyArray<DeepReadonly<R>>
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

/**
 * Optional properties utility.
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// ============================================================================
// Virtual Node Types
// ============================================================================

/**
 * Virtual node types enumeration.
 * Represents different categories of virtual DOM nodes.
 */
export const VNodeType = {
  ELEMENT: 'element',
  TEXT: 'text',
  COMMENT: 'comment',
  FRAGMENT: 'fragment',
  COMPONENT: 'component',
  PORTAL: 'portal',
  SUSPENSE: 'suspense',
  MODULE_BOUNDARY: 'module_boundary',
} as const;

export type VNodeType = (typeof VNodeType)[keyof typeof VNodeType];

/**
 * Virtual node properties interface.
 * Represents attributes and event handlers on virtual elements.
 */
export interface VNodeProps {
  /** CSS class names */
  readonly className?: string;
  /** Inline styles */
  readonly style?: Readonly<Record<string, string | number>>;
  /** Data attributes */
  readonly data?: Readonly<Record<string, string>>;
  /** ARIA attributes */
  readonly aria?: Readonly<Record<string, string | boolean>>;
  /** Event handlers (keys are event names without 'on' prefix) */
  readonly events?: Readonly<Record<string, EventListener>>;
  /** Custom attributes */
  readonly attributes?: Readonly<Record<string, string | number | boolean | null>>;
  /** Key for reconciliation */
  readonly key?: string | number;
  /** Ref callback or ref object */
  readonly ref?: ((el: Element | null) => void) | { current: Element | null };
}

/**
 * Core virtual node interface.
 * Represents a node in the virtual DOM tree.
 */
export interface VirtualNode {
  /** Unique identifier for this virtual node */
  readonly id: VNodeId;
  /** Type of virtual node */
  readonly type: VNodeType;
  /** Tag name for element nodes, component name for component nodes */
  readonly tag: string | ComponentType<unknown>;
  /** Node properties */
  readonly props: VNodeProps;
  /** Child virtual nodes */
  readonly children: ReadonlyArray<VirtualNode | string>;
  /** Parent node reference (null for root) */
  parent: VirtualNode | null;
  /** Associated real DOM element (null before mounting) */
  element: Element | Text | null;
  /** Module boundary this node belongs to */
  readonly moduleId: ModuleId | null;
  /** Hydration state for SSR */
  hydrationState: HydrationState;
  /** Pool generation for garbage collection */
  poolGeneration: number;
  /** Whether this node is currently pooled */
  isPooled: boolean;
  /** Timestamp of last update */
  lastUpdated: number;
}

/**
 * Virtual node creation options.
 */
export interface VNodeCreateOptions {
  /** Parent module ID */
  moduleId?: ModuleId;
  /** Initial hydration state */
  hydrationState?: HydrationState;
  /** Key for reconciliation */
  key?: string | number;
}

// ============================================================================
// Module Lifecycle Types
// ============================================================================

/**
 * Module lifecycle states.
 * Represents the current state of a module in its lifecycle.
 */
export const ModuleLifecycleState = {
  /** Module is registered but not yet initialized */
  REGISTERED: 'registered',
  /** Module is currently being initialized */
  INITIALIZING: 'initializing',
  /** Module has been initialized but not mounted */
  INITIALIZED: 'initialized',
  /** Module is currently mounting */
  MOUNTING: 'mounting',
  /** Module is fully mounted and active */
  MOUNTED: 'mounted',
  /** Module is in suspended state (lazy) */
  SUSPENDED: 'suspended',
  /** Module is currently unmounting */
  UNMOUNTING: 'unmounting',
  /** Module has been unmounted */
  UNMOUNTED: 'unmounted',
  /** Module encountered an error */
  ERROR: 'error',
  /** Module has been disposed */
  DISPOSED: 'disposed',
} as const;

export type ModuleLifecycleState =
  (typeof ModuleLifecycleState)[keyof typeof ModuleLifecycleState];

/**
 * Module lifecycle event types.
 */
export const ModuleLifecycleEvent = {
  BEFORE_INIT: 'beforeInit',
  AFTER_INIT: 'afterInit',
  BEFORE_MOUNT: 'beforeMount',
  AFTER_MOUNT: 'afterMount',
  BEFORE_UPDATE: 'beforeUpdate',
  AFTER_UPDATE: 'afterUpdate',
  BEFORE_UNMOUNT: 'beforeUnmount',
  AFTER_UNMOUNT: 'afterUnmount',
  ERROR: 'error',
  DISPOSE: 'dispose',
} as const;

export type ModuleLifecycleEvent =
  (typeof ModuleLifecycleEvent)[keyof typeof ModuleLifecycleEvent];

/**
 * Lifecycle hook callback type.
 */
export type LifecycleHook<T = void> = () => T | Promise<T>;

/**
 * Module lifecycle hooks configuration.
 */
export interface ModuleLifecycleHooks {
  /** Called before module initialization */
  readonly onBeforeInit?: LifecycleHook;
  /** Called after module initialization */
  readonly onAfterInit?: LifecycleHook;
  /** Called before module mounts */
  readonly onBeforeMount?: LifecycleHook;
  /** Called after module mounts */
  readonly onAfterMount?: LifecycleHook;
  /** Called before module updates */
  readonly onBeforeUpdate?: LifecycleHook;
  /** Called after module updates */
  readonly onAfterUpdate?: LifecycleHook;
  /** Called before module unmounts */
  readonly onBeforeUnmount?: LifecycleHook;
  /** Called after module unmounts */
  readonly onAfterUnmount?: LifecycleHook;
  /** Called when module encounters an error */
  readonly onError?: (error: Error, errorInfo?: ErrorInfo) => void;
  /** Called when module is being disposed */
  readonly onDispose?: LifecycleHook;
}

// ============================================================================
// Hydration Types
// ============================================================================

/**
 * Hydration states for SSR support.
 */
export const HydrationState = {
  /** Not yet hydrated (server-rendered HTML) */
  DEHYDRATED: 'dehydrated',
  /** Hydration is pending/scheduled */
  PENDING: 'pending',
  /** Currently hydrating */
  HYDRATING: 'hydrating',
  /** Fully hydrated and interactive */
  HYDRATED: 'hydrated',
  /** Hydration skipped (client-only) */
  SKIPPED: 'skipped',
  /** Hydration failed */
  FAILED: 'failed',
} as const;

export type HydrationState = (typeof HydrationState)[keyof typeof HydrationState];

/**
 * Hydration priority levels.
 * Lower numbers indicate higher priority.
 */
export const HydrationPriority = {
  /** Critical - hydrate immediately (above fold, interactive) */
  CRITICAL: 1,
  /** High - hydrate soon (visible, may be interacted with) */
  HIGH: 2,
  /** Normal - standard hydration priority */
  NORMAL: 3,
  /** Low - hydrate when idle (below fold) */
  LOW: 4,
  /** Deferred - hydrate only when needed */
  DEFERRED: 5,
} as const;

export type HydrationPriority =
  (typeof HydrationPriority)[keyof typeof HydrationPriority];

/**
 * Hydration trigger types.
 */
export const HydrationTrigger = {
  /** Hydrate immediately on load */
  IMMEDIATE: 'immediate',
  /** Hydrate when element becomes visible */
  VISIBLE: 'visible',
  /** Hydrate during idle time */
  IDLE: 'idle',
  /** Hydrate on user interaction */
  INTERACTION: 'interaction',
  /** Hydrate only when explicitly triggered */
  MANUAL: 'manual',
} as const;

export type HydrationTrigger =
  (typeof HydrationTrigger)[keyof typeof HydrationTrigger];

/**
 * Hydration configuration for a module.
 */
export interface HydrationConfig {
  /** Hydration priority level */
  readonly priority: HydrationPriority;
  /** What triggers hydration */
  readonly trigger: HydrationTrigger;
  /** Timeout before fallback (ms) */
  readonly timeout?: number;
  /** Root margin for visibility trigger */
  readonly rootMargin?: string;
  /** Visibility threshold (0-1) */
  readonly threshold?: number;
  /** Whether to hydrate children independently */
  readonly independentChildren?: boolean;
  /** Callback when hydration starts */
  readonly onHydrationStart?: () => void;
  /** Callback when hydration completes */
  readonly onHydrationComplete?: () => void;
  /** Callback when hydration fails */
  readonly onHydrationError?: (error: Error) => void;
}

/**
 * Hydration data passed from server.
 */
export interface HydrationData {
  /** Unique identifier */
  readonly id: string;
  /** Module ID this data belongs to */
  readonly moduleId: ModuleId;
  /** Serialized state */
  readonly state: unknown;
  /** Timestamp when data was created */
  readonly timestamp: number;
  /** Checksum for integrity verification */
  readonly checksum: string;
  /** Whether data has been sanitized */
  readonly sanitized: boolean;
}

// ============================================================================
// Module Boundary Types
// ============================================================================

/**
 * Module dependency type.
 */
export interface ModuleDependency {
  /** ID of the dependency module */
  readonly moduleId: ModuleId;
  /** Whether this dependency is required */
  readonly required: boolean;
  /** Minimum version if versioned */
  readonly minVersion?: string;
  /** Whether to load lazily */
  readonly lazy?: boolean;
}

/**
 * Slot definition for module composition.
 */
export interface ModuleSlotDefinition {
  /** Unique slot name */
  readonly name: string;
  /** Default content if slot is empty */
  readonly defaultContent?: ReactNode;
  /** Whether slot is required */
  readonly required?: boolean;
  /** Accepted child module types */
  readonly accepts?: ReadonlyArray<string>;
  /** Maximum number of children */
  readonly maxChildren?: number;
}

/**
 * Module boundary configuration.
 */
export interface ModuleBoundaryConfig {
  /** Unique module identifier */
  readonly id: ModuleId;
  /** Human-readable module name */
  readonly name: string;
  /** Module version */
  readonly version?: string;
  /** Module dependencies */
  readonly dependencies?: ReadonlyArray<ModuleDependency>;
  /** Available slots for composition */
  readonly slots?: ReadonlyArray<ModuleSlotDefinition>;
  /** Lifecycle hooks */
  readonly lifecycle?: ModuleLifecycleHooks;
  /** Hydration configuration */
  readonly hydration?: Partial<HydrationConfig>;
  /** Security configuration */
  readonly security?: Partial<ModuleSecurityConfig>;
  /** Whether module should be isolated */
  readonly isolated?: boolean;
  /** Performance budget (ms) */
  readonly performanceBudget?: number;
  /** Whether to enable strict mode */
  readonly strict?: boolean;
}

/**
 * Module boundary state.
 */
export interface ModuleBoundaryState {
  /** Current lifecycle state */
  readonly lifecycleState: ModuleLifecycleState;
  /** Current hydration state */
  readonly hydrationState: HydrationState;
  /** Whether module is currently visible */
  readonly isVisible: boolean;
  /** Whether module is currently active */
  readonly isActive: boolean;
  /** Error if module is in error state */
  readonly error: Error | null;
  /** Error info from React error boundary */
  readonly errorInfo: ErrorInfo | null;
  /** Slot contents */
  readonly slots: Map<string, ReactNode>;
  /** Module-scoped state */
  readonly moduleState: Map<string, unknown>;
  /** Performance metrics */
  readonly metrics: ModulePerformanceMetrics;
}

/**
 * Virtual module interface.
 * Represents a complete module unit.
 */
export interface VirtualModule {
  /** Module configuration */
  readonly config: ModuleBoundaryConfig;
  /** Module state */
  readonly state: ModuleBoundaryState;
  /** Root virtual nodes */
  readonly vdom: ReadonlyArray<VirtualNode>;
  /** Container element */
  container: Element | null;
  /** Portal roots */
  readonly portals: Map<string, Element>;
  /** Child modules */
  readonly children: Map<ModuleId, VirtualModule>;
  /** Parent module */
  parent: VirtualModule | null;
}

// ============================================================================
// Security Types
// ============================================================================

/**
 * Content Security Policy directive types.
 */
export interface CSPDirectives {
  readonly 'default-src'?: ReadonlyArray<string>;
  readonly 'script-src'?: ReadonlyArray<string>;
  readonly 'style-src'?: ReadonlyArray<string>;
  readonly 'img-src'?: ReadonlyArray<string>;
  readonly 'font-src'?: ReadonlyArray<string>;
  readonly 'connect-src'?: ReadonlyArray<string>;
  readonly 'frame-src'?: ReadonlyArray<string>;
  readonly 'object-src'?: ReadonlyArray<string>;
  readonly 'base-uri'?: ReadonlyArray<string>;
  readonly 'form-action'?: ReadonlyArray<string>;
}

/**
 * Module security configuration.
 */
export interface ModuleSecurityConfig {
  /** CSP directives for this module */
  readonly csp?: CSPDirectives;
  /** Security nonce for inline scripts/styles */
  readonly nonce?: SecurityNonce;
  /** Whether to sandbox the module */
  readonly sandbox?: boolean;
  /** Sandbox flags if sandboxed */
  readonly sandboxFlags?: ReadonlyArray<string>;
  /** Trusted types policy name */
  readonly trustedTypesPolicy?: string;
  /** Whether to sanitize hydration data */
  readonly sanitizeHydration?: boolean;
  /** Allowed cross-module event patterns */
  readonly allowedEvents?: ReadonlyArray<string | RegExp>;
  /** Blocked cross-module event patterns */
  readonly blockedEvents?: ReadonlyArray<string | RegExp>;
  /** Maximum message size for cross-module communication */
  readonly maxMessageSize?: number;
  /** Whether to validate message origins */
  readonly validateOrigins?: boolean;
}

/**
 * Security context for a module.
 */
export interface SecurityContext {
  /** Security configuration */
  readonly config: ModuleSecurityConfig;
  /** Current nonce */
  readonly nonce: SecurityNonce | null;
  /** Whether context is secure */
  readonly isSecure: boolean;
  /** Violations detected */
  readonly violations: ReadonlyArray<SecurityViolation>;
  /** Validate content against policy */
  readonly validateContent: (content: string) => boolean;
  /** Sanitize content */
  readonly sanitize: (content: string) => string;
  /** Check if event is allowed */
  readonly isEventAllowed: (eventName: string) => boolean;
}

/**
 * Security violation record.
 */
export interface SecurityViolation {
  /** Type of violation */
  readonly type: 'csp' | 'xss' | 'injection' | 'origin' | 'size';
  /** Description of violation */
  readonly message: string;
  /** Module where violation occurred */
  readonly moduleId: ModuleId;
  /** Timestamp of violation */
  readonly timestamp: number;
  /** Source of violation */
  readonly source?: string;
  /** Blocked content */
  readonly blockedContent?: string;
}

// ============================================================================
// Event Bus Types
// ============================================================================

/**
 * Event priority levels.
 */
export const EventPriority = {
  /** Highest priority - process immediately */
  CRITICAL: 0,
  /** High priority */
  HIGH: 1,
  /** Normal priority */
  NORMAL: 2,
  /** Low priority - process when idle */
  LOW: 3,
} as const;

export type EventPriority = (typeof EventPriority)[keyof typeof EventPriority];

/**
 * Base event message interface.
 */
export interface ModuleEventMessage<T = unknown> {
  /** Unique event ID */
  readonly id: string;
  /** Event name */
  readonly name: string;
  /** Source module ID */
  readonly source: ModuleId;
  /** Target module ID (null for broadcast) */
  readonly target: ModuleId | null;
  /** Event payload */
  readonly payload: T;
  /** Event priority */
  readonly priority: EventPriority;
  /** Timestamp */
  readonly timestamp: number;
  /** Whether event requires acknowledgment */
  readonly requiresAck?: boolean;
  /** Correlation ID for request-response patterns */
  readonly correlationId?: string;
}

/**
 * Event subscription options.
 */
export interface EventSubscriptionOptions {
  /** Filter by source module */
  readonly sourceFilter?: ModuleId | RegExp;
  /** Priority filter (only receive events of this priority or higher) */
  readonly priorityFilter?: EventPriority;
  /** Whether to receive own events */
  readonly receiveSelf?: boolean;
  /** Maximum events to receive before auto-unsubscribe */
  readonly maxEvents?: number;
  /** Timeout before auto-unsubscribe */
  readonly timeout?: number;
  /** Transform payload before delivery */
  readonly transform?: <T>(payload: T) => T;
}

/**
 * Event handler type.
 */
export type EventHandler<T = unknown> = (
  message: ModuleEventMessage<T>
) => void | Promise<void>;

/**
 * Subscription handle for cleanup.
 */
export interface EventSubscription {
  /** Unique subscription ID */
  readonly id: string;
  /** Event name subscribed to */
  readonly eventName: string;
  /** Unsubscribe from event */
  readonly unsubscribe: () => void;
  /** Whether subscription is still active */
  readonly isActive: boolean;
}

// ============================================================================
// Pool Types
// ============================================================================

/**
 * Pool configuration.
 */
export interface VDOMPoolConfig {
  /** Initial pool size */
  readonly initialSize: number;
  /** Maximum pool size */
  readonly maxSize: number;
  /** Minimum free nodes to maintain */
  readonly minFreeNodes: number;
  /** Growth factor when pool needs expansion */
  readonly growthFactor: number;
  /** Shrink threshold (percentage of unused nodes) */
  readonly shrinkThreshold: number;
  /** GC interval in milliseconds */
  readonly gcIntervalMs: number;
  /** Node TTL before eligible for GC */
  readonly nodeTtlMs: number;
  /** Enable memory pressure detection */
  readonly enableMemoryPressure: boolean;
  /** Memory threshold to trigger aggressive GC (0-1) */
  readonly memoryPressureThreshold: number;
}

/**
 * Pool statistics.
 */
export interface VDOMPoolStats {
  /** Total nodes in pool */
  readonly totalNodes: number;
  /** Currently in-use nodes */
  readonly inUseNodes: number;
  /** Available nodes */
  readonly freeNodes: number;
  /** Nodes acquired since start */
  readonly acquireCount: number;
  /** Nodes released since start */
  readonly releaseCount: number;
  /** Pool expansions performed */
  readonly expansionCount: number;
  /** GC runs performed */
  readonly gcCount: number;
  /** Nodes collected by GC */
  readonly gcCollectedCount: number;
  /** Current pool generation */
  readonly generation: number;
  /** Estimated memory usage (bytes) */
  readonly estimatedMemoryBytes: number;
  /** Last GC timestamp */
  readonly lastGcTimestamp: number;
  /** Pool utilization (0-1) */
  readonly utilization: number;
}

// ============================================================================
// Registry Types
// ============================================================================

/**
 * Module registration entry.
 */
export interface ModuleRegistryEntry {
  /** Module configuration */
  readonly config: ModuleBoundaryConfig;
  /** Dynamic import function for lazy loading */
  readonly loader?: () => Promise<ComponentType<unknown>>;
  /** Loaded component (null if not yet loaded) */
  component: ComponentType<unknown> | null;
  /** Loading state */
  loadingState: 'idle' | 'loading' | 'loaded' | 'error';
  /** Loading error if any */
  loadingError: Error | null;
  /** Registration timestamp */
  readonly registeredAt: number;
  /** Last accessed timestamp */
  lastAccessedAt: number;
  /** Access count */
  accessCount: number;
  /** Whether module supports HMR */
  readonly hmrEnabled?: boolean;
}

/**
 * Module registry query options.
 */
export interface ModuleQueryOptions {
  /** Filter by lifecycle state */
  readonly lifecycleState?: ModuleLifecycleState;
  /** Filter by hydration state */
  readonly hydrationState?: HydrationState;
  /** Include only modules matching pattern */
  readonly namePattern?: RegExp;
  /** Include dependencies */
  readonly includeDependencies?: boolean;
  /** Maximum depth for dependency resolution */
  readonly maxDepth?: number;
}

// ============================================================================
// Loader Types
// ============================================================================

/**
 * Module loading priority.
 */
export const LoadingPriority = {
  /** Critical - load immediately */
  CRITICAL: 0,
  /** High - load soon */
  HIGH: 1,
  /** Normal - standard loading */
  NORMAL: 2,
  /** Low - load when idle */
  LOW: 3,
  /** Prefetch - load in background */
  PREFETCH: 4,
} as const;

export type LoadingPriority = (typeof LoadingPriority)[keyof typeof LoadingPriority];

/**
 * Module loading options.
 */
export interface ModuleLoadOptions {
  /** Loading priority */
  readonly priority?: LoadingPriority;
  /** Timeout in milliseconds */
  readonly timeout?: number;
  /** Retry count on failure */
  readonly retries?: number;
  /** Retry delay in milliseconds */
  readonly retryDelay?: number;
  /** Whether to preload dependencies */
  readonly preloadDependencies?: boolean;
  /** Callback on loading progress */
  readonly onProgress?: (progress: number) => void;
  /** Callback on loading complete */
  readonly onComplete?: () => void;
  /** Callback on loading error */
  readonly onError?: (error: Error) => void;
}

/**
 * Module loading state.
 */
export interface ModuleLoadingState {
  /** Module ID */
  readonly moduleId: ModuleId;
  /** Current loading state */
  readonly state: 'idle' | 'queued' | 'loading' | 'loaded' | 'error';
  /** Loading progress (0-1) */
  readonly progress: number;
  /** Error if state is 'error' */
  readonly error: Error | null;
  /** Started loading timestamp */
  readonly startedAt: number | null;
  /** Completed loading timestamp */
  readonly completedAt: number | null;
  /** Dependencies loaded */
  readonly dependenciesLoaded: number;
  /** Total dependencies */
  readonly dependenciesTotal: number;
}

// ============================================================================
// Performance Types
// ============================================================================

/**
 * Module performance metrics.
 */
export interface ModulePerformanceMetrics {
  /** Time to initialize (ms) */
  readonly initTime: number;
  /** Time to mount (ms) */
  readonly mountTime: number;
  /** Time to hydrate (ms) */
  readonly hydrationTime: number;
  /** Render count */
  readonly renderCount: number;
  /** Total render time (ms) */
  readonly totalRenderTime: number;
  /** Average render time (ms) */
  readonly avgRenderTime: number;
  /** Peak render time (ms) */
  readonly peakRenderTime: number;
  /** Update count */
  readonly updateCount: number;
  /** Memory usage estimate (bytes) */
  readonly memoryEstimate: number;
  /** Virtual nodes count */
  readonly vNodeCount: number;
  /** DOM nodes count */
  readonly domNodeCount: number;
  /** Last measured timestamp */
  readonly lastMeasuredAt: number;
}

/**
 * Performance budget configuration.
 */
export interface PerformanceBudget {
  /** Maximum init time (ms) */
  readonly maxInitTime?: number;
  /** Maximum mount time (ms) */
  readonly maxMountTime?: number;
  /** Maximum render time (ms) */
  readonly maxRenderTime?: number;
  /** Maximum hydration time (ms) */
  readonly maxHydrationTime?: number;
  /** Maximum virtual nodes */
  readonly maxVNodes?: number;
  /** Maximum memory (bytes) */
  readonly maxMemory?: number;
  /** Callback when budget exceeded */
  readonly onBudgetExceeded?: (
    metric: keyof PerformanceBudget,
    value: number,
    budget: number
  ) => void;
}

// ============================================================================
// Context Types
// ============================================================================

/**
 * Module context value.
 */
export interface ModuleContextValue {
  /** Module ID */
  readonly moduleId: ModuleId;
  /** Module configuration */
  readonly config: ModuleBoundaryConfig;
  /** Module state */
  readonly state: ModuleBoundaryState;
  /** Security context */
  readonly security: SecurityContext;
  /** Parent module context (null if root) */
  readonly parent: ModuleContextValue | null;
  /** Dispatch module action */
  readonly dispatch: (action: ModuleAction) => void;
  /** Get slot content */
  readonly getSlot: (name: string) => ReactNode | null;
  /** Set slot content */
  readonly setSlot: (name: string, content: ReactNode) => void;
  /** Trigger hydration */
  readonly hydrate: () => Promise<void>;
  /** Subscribe to lifecycle events */
  readonly subscribe: (
    event: ModuleLifecycleEvent,
    handler: () => void
  ) => () => void;
}

/**
 * Module actions for state updates.
 */
export type ModuleAction =
  | { type: 'SET_STATE'; key: string; value: unknown }
  | { type: 'MERGE_STATE'; state: Record<string, unknown> }
  | { type: 'RESET_STATE' }
  | { type: 'SET_SLOT'; name: string; content: ReactNode }
  | { type: 'CLEAR_SLOT'; name: string }
  | { type: 'TRIGGER_HYDRATION' }
  | { type: 'SET_VISIBILITY'; isVisible: boolean }
  | { type: 'SET_ERROR'; error: Error; errorInfo?: ErrorInfo }
  | { type: 'CLEAR_ERROR' }
  | { type: 'TRANSITION_STATE'; to: ModuleLifecycleState };

/**
 * Module provider configuration.
 */
export interface ModuleProviderConfig {
  /** Enable development mode features */
  readonly devMode?: boolean;
  /** Enable strict mode checks */
  readonly strictMode?: boolean;
  /** Global security configuration */
  readonly security?: Partial<ModuleSecurityConfig>;
  /** Global hydration configuration */
  readonly hydration?: Partial<HydrationConfig>;
  /** Global performance budget */
  readonly performanceBudget?: PerformanceBudget;
  /** VDOM pool configuration */
  readonly poolConfig?: Partial<VDOMPoolConfig>;
  /** Enable telemetry */
  readonly enableTelemetry?: boolean;
  /** Telemetry reporter */
  readonly telemetryReporter?: (metrics: ModulePerformanceMetrics) => void;
}

// ============================================================================
// Hook Return Types
// ============================================================================

/**
 * useModule hook return type.
 */
export interface UseModuleReturn {
  /** Module ID */
  readonly moduleId: ModuleId;
  /** Module configuration */
  readonly config: ModuleBoundaryConfig;
  /** Module lifecycle state */
  readonly lifecycleState: ModuleLifecycleState;
  /** Whether module is mounted */
  readonly isMounted: boolean;
  /** Whether module is visible */
  readonly isVisible: boolean;
  /** Whether module has error */
  readonly hasError: boolean;
  /** Module error if any */
  readonly error: Error | null;
  /** Performance metrics */
  readonly metrics: ModulePerformanceMetrics;
  /** Emit event */
  readonly emit: <T>(name: string, payload: T) => void;
  /** Subscribe to event */
  readonly on: <T>(
    name: string,
    handler: EventHandler<T>,
    options?: EventSubscriptionOptions
  ) => EventSubscription;
}

/**
 * useModuleState hook return type.
 */
export interface UseModuleStateReturn<T> {
  /** Current state value */
  readonly state: T;
  /** Set state value */
  readonly setState: (value: T | ((prev: T) => T)) => void;
  /** Merge partial state */
  readonly mergeState: (partial: Partial<T>) => void;
  /** Reset to initial state */
  readonly resetState: () => void;
  /** Whether state is loading */
  readonly isLoading: boolean;
  /** State error if any */
  readonly error: Error | null;
}

/**
 * useModuleBoundary hook return type.
 */
export interface UseModuleBoundaryReturn {
  /** Boundary element ref */
  readonly boundaryRef: React.RefObject<HTMLElement | null>;
  /** Slot definitions */
  readonly slots: ReadonlyArray<ModuleSlotDefinition>;
  /** Get slot content */
  readonly getSlot: (name: string) => ReactNode | null;
  /** Fill slot with content */
  readonly fillSlot: (name: string, content: ReactNode) => void;
  /** Clear slot content */
  readonly clearSlot: (name: string) => void;
  /** Boundary dimensions */
  readonly dimensions: DOMRect | null;
  /** Is boundary visible */
  readonly isVisible: boolean;
  /** Parent boundary info */
  readonly parentBoundary: UseModuleBoundaryReturn | null;
}

/**
 * useModuleHydration hook return type.
 */
export interface UseModuleHydrationReturn {
  /** Current hydration state */
  readonly hydrationState: HydrationState;
  /** Whether hydration is complete */
  readonly isHydrated: boolean;
  /** Whether hydration is pending */
  readonly isPending: boolean;
  /** Whether hydration is in progress */
  readonly isHydrating: boolean;
  /** Whether hydration failed */
  readonly hasFailed: boolean;
  /** Hydration error if failed */
  readonly error: Error | null;
  /** Hydration progress (0-1) */
  readonly progress: number;
  /** Trigger manual hydration */
  readonly hydrate: () => Promise<void>;
  /** Skip hydration */
  readonly skip: () => void;
  /** Hydration data from server */
  readonly data: HydrationData | null;
}

/**
 * useSecureModule hook return type.
 */
export interface UseSecureModuleReturn {
  /** Security context */
  readonly securityContext: SecurityContext;
  /** Current nonce */
  readonly nonce: SecurityNonce | null;
  /** Whether context is secure */
  readonly isSecure: boolean;
  /** Validate content */
  readonly validateContent: (content: string) => boolean;
  /** Sanitize content */
  readonly sanitize: (content: string) => string;
  /** Check if event is allowed */
  readonly isEventAllowed: (eventName: string) => boolean;
  /** Security violations */
  readonly violations: ReadonlyArray<SecurityViolation>;
  /** Report security violation */
  readonly reportViolation: (violation: Omit<SecurityViolation, 'timestamp'>) => void;
}

// ============================================================================
// Factory Functions Type Helpers
// ============================================================================

/**
 * Creates a branded ModuleId from a string.
 */
export function createModuleId(id: string): ModuleId {
  return id as ModuleId;
}

/**
 * Creates a branded VNodeId from a string.
 */
export function createVNodeId(id: string): VNodeId {
  return id as VNodeId;
}

/**
 * Creates a branded SecurityNonce from a string.
 */
export function createSecurityNonce(nonce: string): SecurityNonce {
  return nonce as SecurityNonce;
}

/**
 * Type guard for ModuleId.
 */
export function isModuleId(value: unknown): value is ModuleId {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Type guard for VNodeId.
 */
export function isVNodeId(value: unknown): value is VNodeId {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Default hydration configuration.
 */
export const DEFAULT_HYDRATION_CONFIG: HydrationConfig = {
  priority: HydrationPriority.NORMAL,
  trigger: HydrationTrigger.VISIBLE,
  timeout: 5000,
  rootMargin: '100px',
  threshold: 0.1,
  independentChildren: false,
} as const;

/**
 * Default pool configuration.
 */
export const DEFAULT_POOL_CONFIG: VDOMPoolConfig = {
  initialSize: 100,
  maxSize: 10000,
  minFreeNodes: 20,
  growthFactor: 2,
  shrinkThreshold: 0.75,
  gcIntervalMs: 30000,
  nodeTtlMs: 60000,
  enableMemoryPressure: true,
  memoryPressureThreshold: 0.9,
} as const;

/**
 * Default security configuration.
 */
export const DEFAULT_SECURITY_CONFIG: ModuleSecurityConfig = {
  sandbox: false,
  sanitizeHydration: true,
  maxMessageSize: 1024 * 1024, // 1MB
  validateOrigins: true,
} as const;
