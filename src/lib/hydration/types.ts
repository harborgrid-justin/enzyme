/**
 * @file Hydration System Types
 * @description Comprehensive TypeScript types for the Auto-Prioritized Hydration System.
 *
 * This module defines the type contracts for:
 * - Priority levels and hydration triggers
 * - Hydration state machine states
 * - Scheduler configuration and tasks
 * - Performance metrics and telemetry
 * - Component boundary configuration
 * - Interaction replay buffers
 *
 * @module hydration/types
 */

import type { ReactNode, ComponentType, CSSProperties } from 'react';

// ============================================================================
// Priority System Types
// ============================================================================

/**
 * Hydration priority levels ordered from highest to lowest urgency.
 *
 * - `critical`: Must hydrate immediately (above-the-fold, interactive elements)
 * - `high`: Should hydrate soon (visible in viewport, likely to be interacted with)
 * - `normal`: Standard priority (visible or about to become visible)
 * - `low`: Can be deferred (below-the-fold, secondary content)
 * - `idle`: Only hydrate when browser is idle (footer, non-essential widgets)
 */
export type HydrationPriority = 'critical' | 'high' | 'normal' | 'low' | 'idle';

/**
 * Numeric mapping for priority comparison and queue ordering.
 * Lower numbers indicate higher priority.
 */
export const PRIORITY_WEIGHTS: Record<HydrationPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
  idle: 4,
} as const;

/**
 * Hydration triggers that determine when a component should hydrate.
 *
 * - `immediate`: Hydrate as soon as possible
 * - `visible`: Hydrate when component enters viewport
 * - `interaction`: Hydrate on user interaction (click, focus, hover)
 * - `idle`: Hydrate during browser idle time
 * - `manual`: Explicit programmatic hydration control
 * - `media`: Hydrate based on media query match
 */
export type HydrationTrigger =
  | 'immediate'
  | 'visible'
  | 'interaction'
  | 'idle'
  | 'manual'
  | 'media';

// ============================================================================
// Hydration State Machine Types
// ============================================================================

/**
 * Possible states in the hydration lifecycle.
 *
 * State transitions:
 * - pending -> hydrating -> hydrated
 * - pending -> hydrating -> error
 * - pending -> skipped (SSR-only component)
 */
export type HydrationState = 'pending' | 'hydrating' | 'hydrated' | 'error' | 'skipped';

/**
 * Detailed hydration status with timing information.
 */
export interface HydrationStatus {
  /** Current hydration state */
  readonly state: HydrationState;
  /** Timestamp when hydration started (if applicable) */
  readonly startedAt: number | null;
  /** Timestamp when hydration completed (if applicable) */
  readonly completedAt: number | null;
  /** Duration of hydration in milliseconds */
  readonly duration: number | null;
  /** Error that occurred during hydration (if applicable) */
  readonly error: Error | null;
  /** Number of hydration attempts (for retry logic) */
  readonly attempts: number;
  /** Whether this was a replay-triggered hydration */
  readonly triggeredByReplay: boolean;
}

/**
 * Factory for creating initial hydration status.
 */
export function createInitialHydrationStatus(): HydrationStatus {
  return {
    state: 'pending',
    startedAt: null,
    completedAt: null,
    duration: null,
    error: null,
    attempts: 0,
    triggeredByReplay: false,
  };
}

// ============================================================================
// Hydration Task Types
// ============================================================================

/**
 * Unique identifier for hydration boundaries.
 */
export type HydrationBoundaryId = string & { readonly __brand: 'HydrationBoundaryId' };

/**
 * Creates a branded hydration boundary ID.
 */
export function createBoundaryId(id: string): HydrationBoundaryId {
  return id as HydrationBoundaryId;
}

/**
 * Represents a single hydration task in the scheduler queue.
 */
export interface HydrationTask {
  /** Unique identifier for this hydration boundary */
  readonly id: HydrationBoundaryId;
  /** Priority level determining queue position */
  readonly priority: HydrationPriority;
  /** What triggers hydration */
  readonly trigger: HydrationTrigger;
  /** Function to execute hydration */
  readonly hydrate: () => Promise<void>;
  /** Callback when hydration completes successfully */
  readonly onHydrated?: () => void;
  /** Callback when hydration fails */
  readonly onError?: (error: Error) => void;
  /** Timestamp when task was enqueued */
  readonly enqueuedAt: number;
  /** DOM element reference for visibility tracking */
  readonly element?: HTMLElement | null;
  /** Estimated hydration cost in milliseconds (for budget management) */
  readonly estimatedCost?: number;
  /** Maximum time to wait before hydration (timeout) */
  readonly timeout?: number;
  /** Whether this task can be cancelled */
  readonly cancellable?: boolean;
  /** Metadata for debugging and telemetry */
  readonly metadata?: HydrationTaskMetadata;
}

/**
 * Optional metadata attached to hydration tasks.
 */
export interface HydrationTaskMetadata {
  /** Component display name */
  readonly componentName?: string;
  /** Route path where component is rendered */
  readonly routePath?: string;
  /** Whether component is above the fold */
  readonly aboveTheFold?: boolean;
  /** Parent boundary ID for hierarchical tracking */
  readonly parentBoundaryId?: HydrationBoundaryId;
  /** Custom tags for filtering metrics */
  readonly tags?: readonly string[];
}

// ============================================================================
// Scheduler Configuration Types
// ============================================================================

/**
 * Budget configuration for the hydration scheduler.
 * Prevents main thread blocking during hydration.
 */
export interface HydrationBudget {
  /** Maximum time per hydration frame in milliseconds (default: 50ms for 60fps) */
  readonly frameTimeLimit: number;
  /** Maximum number of tasks to process per frame */
  readonly maxTasksPerFrame: number;
  /** Minimum idle time required for background hydration */
  readonly minIdleTime: number;
  /** Whether to yield to more important work */
  readonly yieldToMain: boolean;
}

/**
 * Default hydration budget optimized for 60fps.
 */
export const DEFAULT_HYDRATION_BUDGET: HydrationBudget = {
  frameTimeLimit: 50, // 50ms per frame leaves room for other work
  maxTasksPerFrame: 10, // Process up to 10 small components per frame
  minIdleTime: 100, // Require 100ms idle for background hydration
  yieldToMain: true, // Always yield to user input
} as const;

/**
 * Visibility detection configuration using IntersectionObserver.
 */
export interface VisibilityConfig {
  /** Root element for intersection calculation (null = viewport) */
  readonly root?: Element | null;
  /** Margin around root for intersection calculation */
  readonly rootMargin?: string;
  /** Visibility threshold(s) for triggering hydration */
  readonly threshold?: number | readonly number[];
  /** Whether to disconnect observer after first intersection */
  readonly triggerOnce?: boolean;
}

/**
 * Default visibility configuration with reasonable margins.
 */
export const DEFAULT_VISIBILITY_CONFIG: VisibilityConfig = {
  root: null,
  rootMargin: '100px 0px', // Hydrate slightly before entering viewport
  threshold: 0,
  triggerOnce: true,
} as const;

/**
 * Configuration for the hydration scheduler.
 */
export interface HydrationSchedulerConfig {
  /** Hydration budget configuration */
  readonly budget: HydrationBudget;
  /** Visibility detection configuration */
  readonly visibility: VisibilityConfig;
  /** Enable debug logging */
  readonly debug: boolean;
  /** Strategy for handling interactions during hydration */
  readonly interactionStrategy: InteractionStrategy;
  /** Whether to use requestIdleCallback for idle hydration */
  readonly useIdleCallback: boolean;
  /** Maximum queue size before dropping low-priority tasks */
  readonly maxQueueSize: number;
  /** Timeout for stalled tasks in milliseconds */
  readonly taskTimeout: number;
  /** Whether to collect performance metrics */
  readonly collectMetrics: boolean;
  /** Sample rate for metrics collection (0-1) */
  readonly metricsSampleRate: number;
}

/**
 * Strategy for handling user interactions during hydration.
 */
export type InteractionStrategy =
  | 'replay' // Buffer and replay interactions after hydration
  | 'immediate-hydrate' // Immediately hydrate on any interaction
  | 'block' // Block interaction until hydrated (not recommended)
  | 'passthrough'; // Allow interaction to propagate (may cause issues)

/**
 * Default scheduler configuration.
 */
export const DEFAULT_SCHEDULER_CONFIG: HydrationSchedulerConfig = {
  budget: DEFAULT_HYDRATION_BUDGET,
  visibility: DEFAULT_VISIBILITY_CONFIG,
  debug: false,
  interactionStrategy: 'replay',
  useIdleCallback: true,
  maxQueueSize: 1000,
  taskTimeout: 10000,
  collectMetrics: true,
  metricsSampleRate: 1.0,
} as const;

// ============================================================================
// Hydration Metrics Types
// ============================================================================

/**
 * Performance metrics for a single hydration operation.
 */
export interface HydrationMetric {
  /** Boundary ID that was hydrated */
  readonly boundaryId: HydrationBoundaryId;
  /** Component name (if available) */
  readonly componentName?: string;
  /** Priority at time of hydration */
  readonly priority: HydrationPriority;
  /** What triggered hydration */
  readonly trigger: HydrationTrigger;
  /** Time spent waiting in queue */
  readonly queueDuration: number;
  /** Time spent hydrating */
  readonly hydrationDuration: number;
  /** Total time from enqueue to hydrated */
  readonly totalDuration: number;
  /** Whether hydration was successful */
  readonly success: boolean;
  /** Error message if hydration failed */
  readonly errorMessage?: string;
  /** Number of interactions replayed */
  readonly replayedInteractions: number;
  /** Timestamp of metric collection */
  readonly timestamp: number;
}

/**
 * Aggregated hydration metrics for the session.
 */
export interface HydrationMetricsSnapshot {
  /** Total boundaries registered */
  readonly totalBoundaries: number;
  /** Boundaries successfully hydrated */
  readonly hydratedCount: number;
  /** Boundaries pending hydration */
  readonly pendingCount: number;
  /** Boundaries that failed hydration */
  readonly failedCount: number;
  /** Average hydration duration in milliseconds */
  readonly averageHydrationDuration: number;
  /** 95th percentile hydration duration */
  readonly p95HydrationDuration: number;
  /** Total interactions replayed */
  readonly totalReplayedInteractions: number;
  /** Time to full hydration (all boundaries) in milliseconds */
  readonly timeToFullHydration: number | null;
  /** Time to above-the-fold hydration */
  readonly timeToAboveFoldHydration: number | null;
  /** Current queue size */
  readonly queueSize: number;
  /** Snapshot timestamp */
  readonly timestamp: number;
}

/**
 * Metrics reporter callback type.
 */
export type HydrationMetricsReporter = (
  metric: HydrationMetric,
  snapshot: HydrationMetricsSnapshot
) => void;

// ============================================================================
// Interaction Replay Types
// ============================================================================

/**
 * Types of interactions that can be replayed.
 */
export type ReplayableInteractionType =
  | 'click'
  | 'focus'
  | 'input'
  | 'keydown'
  | 'keyup'
  | 'submit'
  | 'change'
  | 'touchstart'
  | 'touchend';

/**
 * Captured interaction for replay after hydration.
 */
export interface CapturedInteraction {
  /** Unique interaction ID */
  readonly id: string;
  /** Type of interaction */
  readonly type: ReplayableInteractionType;
  /** Target element selector for re-targeting */
  readonly targetSelector: string;
  /** Original event properties to replay */
  readonly eventInit: Partial<EventInit>;
  /** Timestamp when interaction occurred */
  readonly capturedAt: number;
  /** Input value at time of capture (for input events) */
  readonly inputValue?: string;
  /** Key information (for keyboard events) */
  readonly keyInfo?: {
    readonly key: string;
    readonly code: string;
    readonly shiftKey: boolean;
    readonly ctrlKey: boolean;
    readonly altKey: boolean;
    readonly metaKey: boolean;
  };
  /** Pointer position (for click/touch events) */
  readonly pointerPosition?: {
    readonly clientX: number;
    readonly clientY: number;
  };
}

/**
 * Configuration for interaction replay.
 */
export interface InteractionReplayConfig {
  /** Maximum time to buffer interactions before discarding */
  readonly maxBufferTime: number;
  /** Maximum number of interactions to buffer */
  readonly maxBufferSize: number;
  /** Delay between replayed events in milliseconds */
  readonly replayDelay: number;
  /** Event types to capture for replay */
  readonly captureTypes: readonly ReplayableInteractionType[];
  /** Whether to prevent default during capture */
  readonly preventDefaultDuringCapture: boolean;
  /** Whether to show visual feedback during capture */
  readonly showCaptureIndicator: boolean;
}

/**
 * Default interaction replay configuration.
 */
export const DEFAULT_REPLAY_CONFIG: InteractionReplayConfig = {
  maxBufferTime: 5000,
  maxBufferSize: 50,
  replayDelay: 10,
  captureTypes: ['click', 'focus', 'input', 'change', 'submit'],
  preventDefaultDuringCapture: true,
  showCaptureIndicator: false,
} as const;

// ============================================================================
// Component Types
// ============================================================================

/**
 * Props for the HydrationBoundary component.
 */
export interface HydrationBoundaryProps {
  /** Unique identifier for this boundary */
  readonly id?: string;
  /** Child components to hydrate */
  readonly children: ReactNode;
  /** Priority level for hydration scheduling */
  readonly priority?: HydrationPriority;
  /** What triggers hydration */
  readonly trigger?: HydrationTrigger;
  /** Placeholder to show before hydration */
  readonly placeholder?: ReactNode;
  /** Component to show if hydration fails */
  readonly errorFallback?: ReactNode | ((error: Error) => ReactNode);
  /** Callback when hydration starts */
  readonly onHydrationStart?: () => void;
  /** Callback when hydration completes */
  readonly onHydrationComplete?: (duration: number) => void;
  /** Callback when hydration fails */
  readonly onHydrationError?: (error: Error) => void;
  /** Whether to skip hydration entirely (SSR-only) */
  readonly ssrOnly?: boolean;
  /** Custom visibility configuration */
  readonly visibilityConfig?: Partial<VisibilityConfig>;
  /** Media query for media-triggered hydration */
  readonly mediaQuery?: string;
  /** Timeout for hydration in milliseconds */
  readonly timeout?: number;
  /** Estimated hydration cost for budget management */
  readonly estimatedCost?: number;
  /** Whether this component is above the fold */
  readonly aboveTheFold?: boolean;
  /** Additional CSS class for the wrapper */
  readonly className?: string;
  /** Additional styles for the wrapper */
  readonly style?: CSSProperties;
}

/**
 * Props for the HydrationProvider component.
 */
export interface HydrationProviderProps {
  /** Child components */
  readonly children: ReactNode;
  /** Scheduler configuration */
  readonly config?: Partial<HydrationSchedulerConfig>;
  /** Callback for metrics reporting */
  readonly onMetric?: HydrationMetricsReporter;
  /** Whether to auto-start the scheduler */
  readonly autoStart?: boolean;
  /** Whether to integrate with performance monitoring */
  readonly integrateWithPerformance?: boolean;
}

// ============================================================================
// Context Types
// ============================================================================

/**
 * Value provided by the HydrationContext.
 */
export interface HydrationContextValue {
  /** Register a new hydration boundary */
  readonly registerBoundary: (task: HydrationTask) => void;
  /** Unregister a hydration boundary */
  readonly unregisterBoundary: (id: HydrationBoundaryId) => void;
  /** Get current status of a boundary */
  readonly getBoundaryStatus: (id: HydrationBoundaryId) => HydrationStatus | undefined;
  /** Update priority of a boundary */
  readonly updatePriority: (id: HydrationBoundaryId, priority: HydrationPriority) => void;
  /** Force immediate hydration of a boundary */
  readonly forceHydrate: (id: HydrationBoundaryId) => Promise<void>;
  /** Force hydration of all boundaries */
  readonly forceHydrateAll: () => Promise<void>;
  /** Pause hydration scheduling */
  readonly pause: () => void;
  /** Resume hydration scheduling */
  readonly resume: () => void;
  /** Check if scheduler is paused */
  readonly isPaused: boolean;
  /** Get current metrics snapshot */
  readonly getMetrics: () => HydrationMetricsSnapshot;
  /** Current configuration */
  readonly config: HydrationSchedulerConfig;
  /** Whether system has initialized */
  readonly isInitialized: boolean;
}

// ============================================================================
// HOC Types
// ============================================================================

/**
 * Options for the withHydrationBoundary HOC.
 */
export interface WithHydrationBoundaryOptions<P = unknown> {
  /** Display name for the wrapped component */
  readonly displayName?: string;
  /** Default priority for the boundary */
  readonly defaultPriority?: HydrationPriority;
  /** Default trigger for the boundary */
  readonly defaultTrigger?: HydrationTrigger;
  /** Placeholder to show before hydration */
  readonly placeholder?: ReactNode | ((props: P) => ReactNode);
  /** Whether component is above the fold */
  readonly aboveTheFold?: boolean;
  /** Estimated hydration cost */
  readonly estimatedCost?: number;
}

/**
 * Higher-order component type for hydration boundaries.
 */
export type WithHydrationBoundary = <P extends object>(
  Component: ComponentType<P>,
  options?: WithHydrationBoundaryOptions<P>
) => ComponentType<P & Partial<HydrationBoundaryProps>>;

// ============================================================================
// Event Types
// ============================================================================

/**
 * Events emitted by the hydration system.
 */
export type HydrationEventType =
  | 'boundary:registered'
  | 'boundary:unregistered'
  | 'hydration:start'
  | 'hydration:complete'
  | 'hydration:error'
  | 'scheduler:paused'
  | 'scheduler:resumed'
  | 'interaction:captured'
  | 'interaction:replayed'
  | 'queue:overflow';

/**
 * Base hydration event structure.
 */
export interface HydrationEvent {
  readonly type: HydrationEventType;
  readonly timestamp: number;
  readonly boundaryId?: HydrationBoundaryId;
  readonly payload?: unknown;
}

/**
 * Event listener for hydration events.
 */
export type HydrationEventListener = (event: HydrationEvent) => void;

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Partial configuration that can be merged with defaults.
 */
export type PartialHydrationConfig = Partial<{
  budget: Partial<HydrationBudget>;
  visibility: Partial<VisibilityConfig>;
  debug: boolean;
  interactionStrategy: InteractionStrategy;
  useIdleCallback: boolean;
  maxQueueSize: number;
  taskTimeout: number;
  collectMetrics: boolean;
  metricsSampleRate: number;
}>;

/**
 * Deep merge configuration with defaults.
 */
export function mergeWithDefaults(partial: PartialHydrationConfig = {}): HydrationSchedulerConfig {
  return {
    budget: {
      ...DEFAULT_HYDRATION_BUDGET,
      ...partial.budget,
    },
    visibility: {
      ...DEFAULT_VISIBILITY_CONFIG,
      ...partial.visibility,
    },
    debug: partial.debug ?? DEFAULT_SCHEDULER_CONFIG.debug,
    interactionStrategy:
      partial.interactionStrategy ?? DEFAULT_SCHEDULER_CONFIG.interactionStrategy,
    useIdleCallback: partial.useIdleCallback ?? DEFAULT_SCHEDULER_CONFIG.useIdleCallback,
    maxQueueSize: partial.maxQueueSize ?? DEFAULT_SCHEDULER_CONFIG.maxQueueSize,
    taskTimeout: partial.taskTimeout ?? DEFAULT_SCHEDULER_CONFIG.taskTimeout,
    collectMetrics: partial.collectMetrics ?? DEFAULT_SCHEDULER_CONFIG.collectMetrics,
    metricsSampleRate: partial.metricsSampleRate ?? DEFAULT_SCHEDULER_CONFIG.metricsSampleRate,
  };
}

/**
 * Type guard to check if a value is a valid hydration priority.
 */
export function isHydrationPriority(value: unknown): value is HydrationPriority {
  return typeof value === 'string' && ['critical', 'high', 'normal', 'low', 'idle'].includes(value);
}

/**
 * Type guard to check if a value is a valid hydration trigger.
 */
export function isHydrationTrigger(value: unknown): value is HydrationTrigger {
  return (
    typeof value === 'string' &&
    ['immediate', 'visible', 'interaction', 'idle', 'manual', 'media'].includes(value)
  );
}

/**
 * Type guard to check if a value is a valid hydration state.
 */
export function isHydrationState(value: unknown): value is HydrationState {
  return (
    typeof value === 'string' &&
    ['pending', 'hydrating', 'hydrated', 'error', 'skipped'].includes(value)
  );
}
