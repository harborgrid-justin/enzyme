/**
 * @file Coordination System Type Definitions
 * @module coordination/types
 * @description PhD-level type system for cross-library coordination.
 *
 * This module provides comprehensive type definitions for the coordination
 * layer including branded types, discriminated unions, generic event types,
 * and variance-correct subscription interfaces.
 *
 * @author Agent 5 - PhD TypeScript Architect
 * @version 1.0.0
 */

import type { ComponentType, Context, ReactNode } from 'react';

// ============================================================================
// Branded Types - Compile-time safety for string identifiers
// ============================================================================

/**
 * Brand interface for nominal typing.
 * @internal
 */
declare const __brand: unique symbol;

/**
 * Creates a branded type that is incompatible with other strings.
 * @template T - The brand identifier
 */
type Brand<T extends string> = string & { readonly [__brand]: T };

/**
 * Unique identifier for a library module.
 * @example 'auth' | 'streaming' | 'hydration'
 */
export type LibraryId = Brand<'LibraryId'>;

/**
 * Unique identifier for a coordination event type.
 * @example 'auth:login' | 'network:offline'
 */
export type EventId = Brand<'EventId'>;

/**
 * Unique identifier for a registered service.
 */
export type ServiceId = Brand<'ServiceId'>;

/**
 * Unique identifier for a state slice.
 */
export type StateSliceId = Brand<'StateSliceId'>;

/**
 * Unique identifier for a subscription.
 */
export type SubscriptionId = Brand<'SubscriptionId'>;

/**
 * Unique identifier for a lifecycle phase.
 */
export type PhaseId = Brand<'PhaseId'>;

/**
 * Creates a branded LibraryId.
 */
export function createLibraryId(id: string): LibraryId {
  return id as LibraryId;
}

/**
 * Creates a branded EventId.
 */
export function createEventId(id: string): EventId {
  return id as EventId;
}

/**
 * Creates a branded ServiceId.
 */
export function createServiceId(id: string): ServiceId {
  return id as ServiceId;
}

/**
 * Creates a branded StateSliceId.
 */
export function createStateSliceId(id: string): StateSliceId {
  return id as StateSliceId;
}

/**
 * Creates a branded SubscriptionId.
 */
export function createSubscriptionId(): SubscriptionId {
  return `sub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}` as SubscriptionId;
}

/**
 * Creates a branded PhaseId.
 */
export function createPhaseId(id: string): PhaseId {
  return id as PhaseId;
}

// ============================================================================
// Event System Types
// ============================================================================

/**
 * Priority levels for event dispatch.
 */
export enum EventPriority {
  /** Critical events that must be processed immediately */
  Critical = 0,
  /** High priority events processed before normal */
  High = 1,
  /** Default priority level */
  Normal = 2,
  /** Low priority events processed during idle time */
  Low = 3,
  /** Background events processed when system is idle */
  Idle = 4,
}

/**
 * Base event payload interface.
 */
export interface BaseEventPayload {
  /** Timestamp when event was created */
  readonly timestamp: number;
  /** Optional correlation ID for event tracing */
  readonly correlationId?: string;
}

/**
 * Coordination event message structure.
 * @template TPayload - The event payload type
 */
export interface CoordinationEvent<TPayload = unknown> {
  /** Unique event identifier */
  readonly id: string;
  /** Event type identifier */
  readonly type: EventId;
  /** Source library that emitted the event */
  readonly source: LibraryId;
  /** Target library (null for broadcast) */
  readonly target: LibraryId | null;
  /** Event payload */
  readonly payload: TPayload;
  /** Event priority */
  readonly priority: EventPriority;
  /** Creation timestamp */
  readonly timestamp: number;
  /** Correlation ID for event tracing */
  readonly correlationId?: string;
  /** Whether acknowledgment is required */
  readonly requiresAck?: boolean;
  /** Event metadata */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Event handler function type.
 * @template TPayload - The event payload type
 */
export type EventHandler<TPayload = unknown> = (
  event: CoordinationEvent<TPayload>
) => void | Promise<void>;

/**
 * Event subscription options.
 */
export interface EventSubscriptionOptions {
  /** Filter events by source library */
  sourceFilter?: LibraryId | LibraryId[] | RegExp;
  /** Filter events by target */
  targetFilter?: LibraryId | null;
  /** Minimum priority to receive */
  priorityFilter?: EventPriority;
  /** Whether to receive events from own library */
  receiveSelf?: boolean;
  /** Maximum events to receive before auto-unsubscribe */
  maxEvents?: number;
  /** Subscription timeout in milliseconds */
  timeout?: number;
  /** Transform payload before delivery */
  transform?: <T, U>(payload: T) => U;
  /** Debounce handler calls (ms) */
  debounce?: number;
  /** Throttle handler calls (ms) */
  throttle?: number;
}

/**
 * Event subscription handle.
 */
export interface EventSubscription {
  /** Subscription ID */
  readonly id: SubscriptionId;
  /** Subscribed event type */
  readonly eventType: EventId;
  /** Subscribing library */
  readonly library: LibraryId;
  /** Whether subscription is active */
  readonly isActive: boolean;
  /** Number of events received */
  readonly eventsReceived: number;
  /** Unsubscribe from events */
  unsubscribe(): void;
}

/**
 * Event bus configuration.
 */
export interface EventBusConfig {
  /** Maximum events to buffer */
  maxBufferSize: number;
  /** Enable event deduplication */
  enableDeduplication: boolean;
  /** Deduplication window (ms) */
  deduplicationWindow: number;
  /** Enable event persistence for replay */
  enablePersistence: boolean;
  /** Maximum persisted events */
  maxPersistedEvents: number;
  /** Enable debug logging */
  debug: boolean;
  /** Custom event validator */
  validator?: (event: CoordinationEvent) => boolean;
  /** Error handler */
  onError?: (error: Error, event: CoordinationEvent) => void;
}

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
  /** Active subscriptions count */
  activeSubscriptions: number;
  /** Events by type */
  eventsByType: Map<EventId, number>;
  /** Events by priority */
  eventsByPriority: Record<EventPriority, number>;
  /** Average delivery time (ms) */
  avgDeliveryTime: number;
}

// ============================================================================
// Known Event Types - Type-safe event definitions
// ============================================================================

/**
 * Authentication events.
 */
export interface AuthEvents {
  'auth:login': {
    userId: string;
    roles: string[];
    permissions: string[];
    timestamp: number;
  };
  'auth:logout': {
    userId: string;
    reason: 'manual' | 'session-expired' | 'forced';
    timestamp: number;
  };
  'auth:session-expired': {
    userId: string;
    expiredAt: number;
  };
  'auth:token-refreshed': {
    userId: string;
    expiresAt: number;
  };
  'auth:permissions-changed': {
    userId: string;
    added: string[];
    removed: string[];
  };
}

/**
 * Network events.
 */
export interface NetworkEvents {
  'network:online': {
    timestamp: number;
  };
  'network:offline': {
    timestamp: number;
  };
  'network:quality-changed': {
    quality: 'excellent' | 'good' | 'fair' | 'poor';
    effectiveType: '4g' | '3g' | '2g' | 'slow-2g';
    downlink: number;
    rtt: number;
  };
}

/**
 * State events.
 */
export interface StateEvents {
  'state:changed': {
    sliceId: StateSliceId;
    path: string[];
    previousValue: unknown;
    newValue: unknown;
  };
  'state:reset': {
    sliceId: StateSliceId;
    reason: string;
  };
  'state:hydrated': {
    sliceId: StateSliceId;
    fromPersistence: boolean;
  };
}

/**
 * System events.
 */
export interface SystemEvents {
  'system:memory-pressure': {
    level: 'none' | 'moderate' | 'critical';
    usedHeap: number;
    totalHeap: number;
  };
  'system:performance-warning': {
    metric: string;
    value: number;
    threshold: number;
  };
  'system:error': {
    error: Error;
    context: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  };
}

/**
 * Theme events.
 */
export interface ThemeEvents {
  'theme:changed': {
    mode: 'light' | 'dark' | 'system';
    resolvedMode: 'light' | 'dark';
    source: 'user' | 'system';
  };
}

/**
 * Feature flag events.
 */
export interface FeatureFlagEvents {
  'flags:changed': {
    flagKey: string;
    previousValue: unknown;
    newValue: unknown;
  };
  'flags:refreshed': {
    count: number;
    source: 'remote' | 'cache' | 'local';
  };
}

/**
 * Hydration events.
 */
export interface HydrationEvents {
  'hydration:started': {
    boundaryId: string;
    priority: string;
  };
  'hydration:completed': {
    boundaryId: string;
    duration: number;
  };
  'hydration:all-complete': {
    totalBoundaries: number;
    totalDuration: number;
  };
}

/**
 * Streaming events.
 */
export interface StreamingEvents {
  'streaming:started': {
    streamId: string;
    priority: string;
  };
  'streaming:paused': {
    streamId: string;
    reason: string;
  };
  'streaming:completed': {
    streamId: string;
    bytesTransferred: number;
  };
  'streaming:error': {
    streamId: string;
    error: string;
  };
}

/**
 * Realtime events.
 */
export interface RealtimeEvents {
  'realtime:connected': {
    connectionType: 'websocket' | 'sse';
    url: string;
  };
  'realtime:disconnected': {
    connectionType: 'websocket' | 'sse';
    reason: string;
  };
  'realtime:message': {
    channel: string;
    data: unknown;
  };
}

/**
 * Lifecycle events.
 */
export interface LifecycleEvents {
  'lifecycle:phase-started': {
    phaseId: PhaseId;
    phaseName: string;
    order: number;
  };
  'lifecycle:phase-completed': {
    phaseId: PhaseId;
    phaseName: string;
    duration: number;
  };
  'lifecycle:library-initialized': {
    libraryId: LibraryId;
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
}

/**
 * All known coordination events.
 */
export interface KnownEvents
  extends AuthEvents,
    NetworkEvents,
    StateEvents,
    SystemEvents,
    ThemeEvents,
    FeatureFlagEvents,
    HydrationEvents,
    StreamingEvents,
    RealtimeEvents,
    LifecycleEvents {}

/**
 * Type-safe event type extraction.
 */
export type KnownEventType = keyof KnownEvents;

/**
 * Get payload type for a known event.
 */
export type EventPayload<T extends KnownEventType> = KnownEvents[T];

// ============================================================================
// Dependency Injection Types
// ============================================================================

/**
 * Service scope determines instance lifetime.
 */
export type ServiceScope = 'singleton' | 'scoped' | 'transient';

/**
 * Service lifecycle phase for ordering.
 */
export type ServiceLifecycle = 'bootstrap' | 'core' | 'feature' | 'ui' | 'lazy';

/**
 * Service contract definition.
 * @template T - The service interface type
 */
export interface ServiceContract<T> {
  /** Unique service identifier */
  readonly id: ServiceId;
  /** Human-readable service name */
  readonly name: string;
  /** Service version */
  readonly version: string;
  /** Default implementation (optional) */
  readonly defaultValue?: T;
  /** Service lifecycle phase */
  readonly lifecycle?: ServiceLifecycle;
}

/**
 * Service registration options.
 */
export interface ServiceRegistrationOptions {
  /** Service scope */
  scope?: ServiceScope;
  /** Service lifecycle phase */
  lifecycle?: ServiceLifecycle;
  /** Dependencies that must be resolved first */
  dependencies?: ServiceId[];
  /** Tags for service discovery */
  tags?: string[];
  /** Whether this is the primary implementation */
  primary?: boolean;
  /** Conditional registration predicate */
  condition?: () => boolean;
}

/**
 * Service factory function type.
 */
export type ServiceFactory<T> = (container: DependencyContainer) => T | Promise<T>;

/**
 * Service registration entry.
 */
export interface ServiceRegistration<T = unknown> {
  /** Service contract */
  contract: ServiceContract<T>;
  /** Service implementation or factory */
  implementation: T | ServiceFactory<T>;
  /** Registration options */
  options: ServiceRegistrationOptions;
  /** Whether implementation is a factory */
  isFactory: boolean;
  /** Registration timestamp */
  registeredAt: number;
}

/**
 * Dependency container interface.
 */
export interface DependencyContainer {
  /** Register a service */
  register<T>(
    contract: ServiceContract<T>,
    implementation: T | ServiceFactory<T>,
    options?: ServiceRegistrationOptions
  ): void;

  /** Resolve a service */
  resolve<T>(contract: ServiceContract<T>): T;

  /** Try to resolve a service (returns undefined if not found) */
  tryResolve<T>(contract: ServiceContract<T>): T | undefined;

  /** Check if a service is registered */
  has(contract: ServiceContract<unknown>): boolean;

  /** Unregister a service */
  unregister(contract: ServiceContract<unknown>): boolean;

  /** Get all services with a tag */
  getByTag<T>(tag: string): T[];

  /** Create a child container */
  createChild(): DependencyContainer;

  /** Dispose the container */
  dispose(): Promise<void>;
}

// ============================================================================
// Lifecycle Management Types
// ============================================================================

/**
 * Library lifecycle state.
 */
export type LibraryState =
  | 'uninitialized'
  | 'initializing'
  | 'initialized'
  | 'running'
  | 'suspending'
  | 'suspended'
  | 'resuming'
  | 'disposing'
  | 'disposed'
  | 'error';

/**
 * Lifecycle phase definition.
 */
export interface LifecyclePhase {
  /** Phase identifier */
  id: PhaseId;
  /** Phase name */
  name: string;
  /** Execution order (lower = earlier) */
  order: number;
  /** Libraries to initialize in this phase */
  libraries: LibraryId[];
  /** Whether phase can run in parallel */
  parallel?: boolean;
  /** Timeout for phase completion (ms) */
  timeout?: number;
  /** Retry attempts on failure */
  retries?: number;
}

/**
 * Library initialization function.
 */
export type LibraryInitializer = () => void | Promise<void>;

/**
 * Library cleanup function.
 */
export type LibraryCleanup = () => void | Promise<void>;

/**
 * Library registration for lifecycle management.
 */
export interface LibraryRegistration {
  /** Library identifier */
  id: LibraryId;
  /** Library name */
  name: string;
  /** Library version */
  version: string;
  /** Dependencies on other libraries */
  dependencies: LibraryId[];
  /** Lifecycle phase */
  phase: PhaseId;
  /** Initialization function */
  initialize: LibraryInitializer;
  /** Cleanup function */
  cleanup?: LibraryCleanup;
  /** Suspend function (for memory pressure) */
  suspend?: () => void | Promise<void>;
  /** Resume function */
  resume?: () => void | Promise<void>;
  /** Health check function */
  healthCheck?: () => boolean | Promise<boolean>;
  /** Current state */
  state: LibraryState;
  /** Initialization timestamp */
  initializedAt?: number;
  /** Last error */
  lastError?: Error;
}

/**
 * Lifecycle manager configuration.
 */
export interface LifecycleManagerConfig {
  /** Phases in order */
  phases: LifecyclePhase[];
  /** Global initialization timeout (ms) */
  initTimeout: number;
  /** Global shutdown timeout (ms) */
  shutdownTimeout: number;
  /** Enable parallel initialization within phases */
  enableParallel: boolean;
  /** Error handler */
  onError?: (error: Error, library: LibraryRegistration) => void;
  /** Phase completion handler */
  onPhaseComplete?: (phase: LifecyclePhase, duration: number) => void;
}

// ============================================================================
// State Coordination Types
// ============================================================================

/**
 * State change notification.
 */
export interface StateChange<T = unknown> {
  /** State slice identifier */
  sliceId: StateSliceId;
  /** Library that owns the state */
  sourceLibrary: LibraryId;
  /** Path to changed value */
  path: string[];
  /** Previous value */
  previousValue: T;
  /** New value */
  newValue: T;
  /** Change timestamp */
  timestamp: number;
  /** Change operation type */
  operation: 'set' | 'delete' | 'merge' | 'reset';
}

/**
 * State subscription callback.
 */
export type StateSubscriber<T = unknown> = (change: StateChange<T>) => void;

/**
 * State slice registration.
 */
export interface StateSliceRegistration<T = unknown> {
  /** Slice identifier */
  id: StateSliceId;
  /** Owning library */
  library: LibraryId;
  /** Initial state value */
  initialValue: T;
  /** State getter */
  getState: () => T;
  /** State setter */
  setState: (value: T | ((prev: T) => T)) => void;
  /** Selective subscription */
  subscribe: (subscriber: StateSubscriber<T>) => () => void;
  /** Persistence configuration */
  persistence?: {
    key: string;
    serialize?: (state: T) => string;
    deserialize?: (data: string) => T;
  };
}

/**
 * State coordinator configuration.
 */
export interface StateCoordinatorConfig {
  /** Enable state change batching */
  enableBatching: boolean;
  /** Batch window (ms) */
  batchWindow: number;
  /** Enable state persistence */
  enablePersistence: boolean;
  /** Storage key prefix */
  storagePrefix: string;
  /** Debug mode */
  debug: boolean;
}

/**
 * Cross-library state sync rule.
 */
export interface StateSyncRule<TSource = unknown, TTarget = unknown> {
  /** Rule identifier */
  id: string;
  /** Source slice */
  sourceSlice: StateSliceId;
  /** Source path selector */
  sourcePath: string[];
  /** Target slice */
  targetSlice: StateSliceId;
  /** Target path */
  targetPath: string[];
  /** Transform function */
  transform?: (value: TSource) => TTarget;
  /** Condition for sync */
  condition?: (value: TSource) => boolean;
  /** Sync direction */
  direction: 'one-way' | 'two-way';
}

// ============================================================================
// Provider Orchestration Types
// ============================================================================

/**
 * Provider definition for orchestration.
 */
export interface ProviderDefinition {
  /** Provider identifier */
  id: string;
  /** Provider component */
  Component: ComponentType<{ children: ReactNode }>;
  /** Required dependencies (other provider IDs) */
  dependencies: string[];
  /** Props to pass to provider */
  props?: Record<string, unknown>;
  /** Order priority (lower = outer) */
  order?: number;
  /** Conditional rendering predicate */
  condition?: () => boolean;
}

/**
 * Provider orchestrator configuration.
 */
export interface ProviderOrchestratorConfig {
  /** Providers to orchestrate */
  providers: ProviderDefinition[];
  /** Error boundary for provider tree */
  errorBoundary?: ComponentType<{ children: ReactNode }>;
  /** Loading component during initialization */
  loadingComponent?: ComponentType;
  /** Strict mode for provider ordering */
  strictOrdering: boolean;
}

// ============================================================================
// Context Bridge Types
// ============================================================================

/**
 * Context value extractor function.
 */
export type ContextExtractor<TContext, TValue> = (context: TContext) => TValue;

/**
 * Context bridge definition.
 */
export interface ContextBridgeDefinition<TSource, TTarget> {
  /** Bridge identifier */
  id: string;
  /** Source context */
  sourceContext: Context<TSource | null>;
  /** Target context */
  targetContext: Context<TTarget | null>;
  /** Value transformer */
  transformer: (source: TSource) => TTarget;
  /** Update strategy */
  updateStrategy: 'immediate' | 'batched' | 'debounced';
  /** Debounce/batch window (ms) */
  updateWindow?: number;
}

// ============================================================================
// Hook Composition Types
// ============================================================================

/**
 * Composed hook result.
 */
export interface ComposedHookResult<T extends Record<string, unknown>> {
  /** Combined data from all hooks */
  data: T;
  /** Whether any hook is loading */
  isLoading: boolean;
  /** Combined error (first error encountered) */
  error: Error | null;
  /** Individual hook states */
  hookStates: Record<keyof T, { isLoading: boolean; error: Error | null }>;
  /** Refresh all hooks */
  refresh: () => void;
}

/**
 * Hook definition for composition.
 */
export interface HookDefinition<T> {
  /** Hook identifier */
  id: string;
  /** The hook function */
  hook: () => T;
  /** Optional selector to extract value */
  selector?: (result: T) => unknown;
  /** Dependencies on other hooks */
  dependencies?: string[];
}

// ============================================================================
// Coordination Context Types
// ============================================================================

/**
 * Main coordination context value.
 */
export interface CoordinationContextValue {
  /** Event bus for cross-library communication */
  readonly eventBus: CoordinationEventBus;
  /** Dependency injection container */
  readonly container: DependencyContainer;
  /** Lifecycle manager */
  readonly lifecycle: LifecycleManager;
  /** State coordinator */
  readonly stateCoordinator: StateCoordinator;
  /** Whether coordination system is initialized */
  readonly isInitialized: boolean;
  /** Coordination system version */
  readonly version: string;
}

/**
 * Coordination event bus interface.
 */
export interface CoordinationEventBus {
  /** Publish an event */
  publish<T extends KnownEventType>(
    type: T,
    payload: EventPayload<T>,
    options?: Partial<Omit<CoordinationEvent, 'type' | 'payload' | 'id' | 'timestamp'>>
  ): string;

  /** Subscribe to events */
  subscribe<T extends KnownEventType>(
    type: T,
    handler: EventHandler<EventPayload<T>>,
    options?: EventSubscriptionOptions
  ): EventSubscription;

  /** Subscribe to multiple event types */
  subscribeMany<T extends KnownEventType>(
    types: T[],
    handler: EventHandler<EventPayload<T>>,
    options?: EventSubscriptionOptions
  ): EventSubscription[];

  /** Subscribe once */
  once<T extends KnownEventType>(
    type: T,
    handler: EventHandler<EventPayload<T>>
  ): EventSubscription;

  /** Request-response pattern */
  request<TReq extends KnownEventType, TRes extends KnownEventType>(
    requestType: TReq,
    responseType: TRes,
    payload: EventPayload<TReq>,
    timeout?: number
  ): Promise<EventPayload<TRes>>;

  /** Get event bus statistics */
  getStats(): EventBusStats;

  /** Clear event bus */
  clear(): void;
}

/**
 * Lifecycle manager interface.
 */
export interface LifecycleManager {
  /** Register a library */
  registerLibrary(registration: Omit<LibraryRegistration, 'state'>): void;

  /** Unregister a library */
  unregisterLibrary(id: LibraryId): void;

  /** Initialize all libraries */
  initialize(): Promise<void>;

  /** Shutdown all libraries */
  shutdown(): Promise<void>;

  /** Get library state */
  getLibraryState(id: LibraryId): LibraryState | undefined;

  /** Get all library states */
  getAllStates(): Map<LibraryId, LibraryState>;

  /** Check if all libraries are initialized */
  isFullyInitialized(): boolean;

  /** Perform health check */
  healthCheck(): Promise<Map<LibraryId, boolean>>;
}

/**
 * State coordinator interface.
 */
export interface StateCoordinator {
  /** Register a state slice */
  registerSlice<T>(registration: StateSliceRegistration<T>): void;

  /** Unregister a state slice */
  unregisterSlice(id: StateSliceId): void;

  /** Add a sync rule */
  addSyncRule<TSource, TTarget>(rule: StateSyncRule<TSource, TTarget>): void;

  /** Remove a sync rule */
  removeSyncRule(id: string): void;

  /** Get state from a slice */
  getState<T>(sliceId: StateSliceId): T | undefined;

  /** Set state in a slice */
  setState<T>(sliceId: StateSliceId, value: T | ((prev: T) => T)): void;

  /** Subscribe to state changes */
  subscribe<T>(sliceId: StateSliceId, subscriber: StateSubscriber<T>): () => void;

  /** Subscribe to all state changes */
  subscribeAll(subscriber: StateSubscriber): () => void;
}

// ============================================================================
// Coordination Provider Props
// ============================================================================

/**
 * Props for CoordinationProvider component.
 */
export interface CoordinationProviderProps {
  /** Child components */
  children: ReactNode;
  /** Event bus configuration */
  eventBusConfig?: Partial<EventBusConfig>;
  /** Lifecycle configuration */
  lifecycleConfig?: Partial<LifecycleManagerConfig>;
  /** State coordinator configuration */
  stateConfig?: Partial<StateCoordinatorConfig>;
  /** Provider orchestrator configuration */
  providerConfig?: Partial<ProviderOrchestratorConfig>;
  /** Debug mode */
  debug?: boolean;
  /** Callback when coordination is ready */
  onReady?: () => void;
  /** Error handler */
  onError?: (error: Error) => void;
}

// ============================================================================
// Default Configurations
// ============================================================================

/**
 * Default event bus configuration.
 */
export const DEFAULT_EVENT_BUS_CONFIG: EventBusConfig = {
  maxBufferSize: 1000,
  enableDeduplication: true,
  deduplicationWindow: 100,
  enablePersistence: false,
  maxPersistedEvents: 100,
  debug: false,
};

/**
 * Default lifecycle phases.
 */
export const DEFAULT_LIFECYCLE_PHASES: LifecyclePhase[] = [
  { id: createPhaseId('bootstrap'), name: 'Bootstrap', order: 0, libraries: [], parallel: false },
  { id: createPhaseId('core'), name: 'Core', order: 1, libraries: [], parallel: true },
  { id: createPhaseId('feature'), name: 'Feature', order: 2, libraries: [], parallel: true },
  { id: createPhaseId('ui'), name: 'UI', order: 3, libraries: [], parallel: true },
];

/**
 * Default lifecycle manager configuration.
 */
export const DEFAULT_LIFECYCLE_CONFIG: LifecycleManagerConfig = {
  phases: DEFAULT_LIFECYCLE_PHASES,
  initTimeout: 30000,
  shutdownTimeout: 10000,
  enableParallel: true,
};

/**
 * Default state coordinator configuration.
 */
export const DEFAULT_STATE_COORDINATOR_CONFIG: StateCoordinatorConfig = {
  enableBatching: true,
  batchWindow: 16, // ~1 frame at 60fps
  enablePersistence: false,
  storagePrefix: 'coordination_state_',
  debug: false,
};

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Extracts the value type from a context.
 */
export type ContextValue<T> = T extends Context<infer V> ? V : never;

/**
 * Makes specified keys optional.
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Deep partial type.
 *
 * @deprecated Import from '../../shared/type-utils' instead.
 * This re-export is provided for backward compatibility.
 */
export type { DeepPartial } from '../shared/type-utils';

/**
 * Extracts the payload type from an event.
 */
export type ExtractPayload<T> = T extends CoordinationEvent<infer P> ? P : never;

/**
 * Creates a union of all event types from an event map.
 */
export type EventTypes<T> = keyof T;

/**
 * Async or sync function type.
 */
export type MaybeAsync<T> = T | Promise<T>;

/**
 * Disposable interface for cleanup.
 */
export interface Disposable {
  dispose(): void | Promise<void>;
}

/**
 * Result type for operations that can fail.
 *
 * @deprecated Import from '../shared/type-utils' instead.
 * This re-export is provided for backward compatibility.
 */
export type { Result } from '../shared/type-utils';

/**
 * Creates a successful result.
 *
 * @deprecated Import from '../shared/type-utils' instead.
 */
export { ok } from '../shared/type-utils';

/**
 * Creates a failed result.
 *
 * @deprecated Import from '../shared/type-utils' instead.
 */
export { err } from '../shared/type-utils';

/**
 * Type guard to check if a Result is successful.
 *
 * @deprecated Import from '../shared/type-utils' instead.
 */
export { isOk } from '../shared/type-utils';

/**
 * Type guard to check if a Result is a failure.
 *
 * @deprecated Import from '../shared/type-utils' instead.
 */
export { isErr } from '../shared/type-utils';

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for LibraryId.
 */
export function isLibraryId(value: unknown): value is LibraryId {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Type guard for EventId.
 */
export function isEventId(value: unknown): value is EventId {
  return typeof value === 'string' && value.includes(':');
}

/**
 * Type guard for CoordinationEvent.
 */
export function isCoordinationEvent(value: unknown): value is CoordinationEvent {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'type' in value &&
    'source' in value &&
    'payload' in value &&
    'priority' in value &&
    'timestamp' in value
  );
}

/**
 * Type guard for known event types.
 */
export function isKnownEventType(type: string): type is KnownEventType {
  const knownPrefixes = [
    'auth:',
    'network:',
    'state:',
    'system:',
    'theme:',
    'flags:',
    'hydration:',
    'streaming:',
    'realtime:',
    'lifecycle:',
  ];
  return knownPrefixes.some((prefix) => type.startsWith(prefix));
}
