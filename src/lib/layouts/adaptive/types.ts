/**
 * @fileoverview Adaptive Layout System Type Definitions
 *
 * This module provides comprehensive type definitions for the Automatic Adaptive
 * & Morphing Layouts system. All types are designed with strict type safety,
 * supporting content-aware layout computation, FLIP-based animations, and
 * zero-CLS layout reservations.
 *
 * @module layouts/adaptive/types
 * @version 1.0.0
 * @license MIT
 */

import type { CSSProperties, ReactNode, RefObject } from 'react';

// =============================================================================
// FOUNDATIONAL TYPES
// =============================================================================

/**
 * Available layout modes that the system can transition between.
 * These represent the primary layout strategies available.
 */
export type LayoutMode = 'grid' | 'list' | 'compact' | 'expanded' | 'dense' | 'sparse';

/**
 * Layout transition direction for determining animation paths.
 */
export type TransitionDirection = 'horizontal' | 'vertical' | 'diagonal' | 'radial';

/**
 * Content density classification for automatic layout selection.
 */
export type ContentDensity = 'minimal' | 'low' | 'medium' | 'high' | 'extreme';

/**
 * Priority levels for layout constraint solving.
 */
export type ConstraintPriority = 'required' | 'strong' | 'medium' | 'weak';

/**
 * Animation easing functions available for morph transitions.
 */
export type EasingFunction =
  | 'linear'
  | 'ease'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'spring'
  | 'bounce'
  | `cubic-bezier(${number}, ${number}, ${number}, ${number})`;

/**
 * GPU-accelerated transform properties for optimal performance.
 */
export type GPUAcceleratedProperty = 'transform' | 'opacity' | 'filter';

// =============================================================================
// DIMENSIONAL TYPES
// =============================================================================

/**
 * Represents a 2D point in layout space.
 */
export interface Point2D {
  readonly x: number;
  readonly y: number;
}

/**
 * Represents dimensions with width and height.
 */
export interface Dimensions {
  readonly width: number;
  readonly height: number;
}

/**
 * Complete bounding box information including position and size.
 */
export interface BoundingBox extends Point2D, Dimensions {
  readonly right: number;
  readonly bottom: number;
}

/**
 * Padding/margin specification with all four sides.
 */
export interface BoxSpacing {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

/**
 * Represents a layout rectangle for FLIP calculations.
 */
export interface LayoutRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly scaleX: number;
  readonly scaleY: number;
  readonly rotation: number;
  readonly opacity: number;
}

// =============================================================================
// LAYOUT ENGINE TYPES
// =============================================================================

/**
 * Configuration for the layout engine.
 */
export interface LayoutEngineConfig {
  /** Enable content-aware layout selection */
  readonly contentAware: boolean;
  /** Enable predictive layout pre-computation */
  readonly predictiveLayout: boolean;
  /** Performance budget in milliseconds for layout computation */
  readonly performanceBudgetMs: number;
  /** Enable user preference learning */
  readonly learnPreferences: boolean;
  /** Default layout mode when content analysis is indeterminate */
  readonly defaultMode: LayoutMode;
  /** Debounce interval for resize observations in milliseconds */
  readonly resizeDebounceMs: number;
  /** Enable accessibility mode adaptations */
  readonly accessibilityMode: boolean;
  /** Dark mode specific layout adaptations */
  readonly darkModeAdaptations: boolean;
}

/**
 * Default layout engine configuration values.
 */
export const DEFAULT_LAYOUT_ENGINE_CONFIG: LayoutEngineConfig = {
  contentAware: true,
  predictiveLayout: true,
  performanceBudgetMs: 16, // One frame at 60fps
  learnPreferences: true,
  defaultMode: 'grid',
  resizeDebounceMs: 100,
  accessibilityMode: false,
  darkModeAdaptations: true,
} as const;

/**
 * Content analysis result from the layout engine.
 */
export interface ContentAnalysis {
  /** Number of items in the content */
  readonly itemCount: number;
  /** Average item dimensions */
  readonly averageItemSize: Dimensions;
  /** Variance in item sizes */
  readonly sizeVariance: number;
  /** Detected content density */
  readonly density: ContentDensity;
  /** Recommended layout mode based on analysis */
  readonly recommendedMode: LayoutMode;
  /** Confidence score (0-1) for the recommendation */
  readonly confidence: number;
  /** Whether content appears to be image-heavy */
  readonly isImageHeavy: boolean;
  /** Whether content appears to be text-heavy */
  readonly isTextHeavy: boolean;
  /** Aspect ratio distribution of content items */
  readonly aspectRatioDistribution: AspectRatioDistribution;
}

/**
 * Distribution of aspect ratios in content items.
 */
export interface AspectRatioDistribution {
  readonly portrait: number;
  readonly square: number;
  readonly landscape: number;
  readonly ultrawide: number;
}

/**
 * Complete layout state at a given point in time.
 */
export interface LayoutState {
  /** Current layout mode */
  readonly mode: LayoutMode;
  /** Container dimensions */
  readonly containerDimensions: Dimensions;
  /** Individual item positions and sizes */
  readonly itemRects: ReadonlyMap<string, LayoutRect>;
  /** Grid-specific configuration if in grid mode */
  readonly gridConfig?: GridLayoutConfig;
  /** List-specific configuration if in list mode */
  readonly listConfig?: ListLayoutConfig;
  /** Timestamp of this state */
  readonly timestamp: number;
  /** Whether this is a transitional state */
  readonly isTransitioning: boolean;
}

/**
 * Grid layout specific configuration.
 */
export interface GridLayoutConfig {
  /** Number of columns */
  readonly columns: number;
  /** Gap between items */
  readonly gap: number;
  /** Row height (can be 'auto' or fixed) */
  readonly rowHeight: number | 'auto';
  /** Grid auto-flow direction */
  readonly autoFlow: 'row' | 'column' | 'dense';
  /** Alignment of items within grid cells */
  readonly itemAlignment: 'start' | 'center' | 'end' | 'stretch';
}

/**
 * List layout specific configuration.
 */
export interface ListLayoutConfig {
  /** Gap between list items */
  readonly gap: number;
  /** List direction */
  readonly direction: 'vertical' | 'horizontal';
  /** Item height (can be 'auto' or fixed) */
  readonly itemHeight: number | 'auto';
  /** Whether to alternate row backgrounds */
  readonly alternateRows: boolean;
}

/**
 * Layout computation request.
 */
export interface LayoutComputeRequest {
  /** ID of the container element */
  readonly containerId: string;
  /** IDs of child items */
  readonly itemIds: readonly string[];
  /** Current container dimensions */
  readonly containerDimensions: Dimensions;
  /** Optional forced layout mode */
  readonly forcedMode?: LayoutMode;
  /** Animation context for smooth transitions */
  readonly animationContext?: AnimationContext;
}

/**
 * Layout computation result.
 */
export interface LayoutComputeResult {
  /** Computed layout state */
  readonly state: LayoutState;
  /** Content analysis used for computation */
  readonly analysis: ContentAnalysis;
  /** Computation time in milliseconds */
  readonly computeTimeMs: number;
  /** Whether performance budget was exceeded */
  readonly budgetExceeded: boolean;
  /** CLS impact prediction */
  readonly predictedCLS: number;
}

// =============================================================================
// MORPH TRANSITION TYPES
// =============================================================================

/**
 * Configuration for morph transitions.
 */
export interface MorphTransitionConfig {
  /** Duration of the transition in milliseconds */
  readonly duration: number;
  /** Easing function for the transition */
  readonly easing: EasingFunction;
  /** Whether the transition can be interrupted */
  readonly interruptible: boolean;
  /** Delay before starting the transition */
  readonly delay: number;
  /** Stagger delay between items in milliseconds */
  readonly staggerDelay: number;
  /** Maximum stagger delay to prevent long transitions */
  readonly maxStaggerDelay: number;
  /** Whether to use GPU acceleration */
  readonly gpuAccelerated: boolean;
  /** Properties to animate (GPU-accelerated only) */
  readonly animatedProperties: readonly GPUAcceleratedProperty[];
  /** Callback when transition starts */
  readonly onStart?: () => void;
  /** Callback for each animation frame */
  readonly onFrame?: (progress: number) => void;
  /** Callback when transition completes */
  readonly onComplete?: () => void;
  /** Callback if transition is interrupted */
  readonly onInterrupt?: () => void;
}

/**
 * Default morph transition configuration.
 */
export const DEFAULT_MORPH_TRANSITION_CONFIG: MorphTransitionConfig = {
  duration: 300,
  easing: 'ease-out',
  interruptible: true,
  delay: 0,
  staggerDelay: 20,
  maxStaggerDelay: 200,
  gpuAccelerated: true,
  animatedProperties: ['transform', 'opacity'],
} as const;

/**
 * FLIP animation snapshot for an element.
 */
export interface FLIPSnapshot {
  /** Element identifier */
  readonly id: string;
  /** First position (before layout change) */
  readonly first: LayoutRect;
  /** Last position (after layout change) */
  readonly last: LayoutRect;
  /** Invert transform to apply */
  readonly invert: Transform3D;
  /** Play state tracking */
  readonly playState: 'pending' | 'running' | 'completed' | 'interrupted';
}

/**
 * 3D transform representation.
 */
export interface Transform3D {
  readonly translateX: number;
  readonly translateY: number;
  readonly translateZ: number;
  readonly scaleX: number;
  readonly scaleY: number;
  readonly scaleZ: number;
  readonly rotateX: number;
  readonly rotateY: number;
  readonly rotateZ: number;
}

/**
 * Animation context for coordinating transitions.
 */
export interface AnimationContext {
  /** Unique identifier for this animation batch */
  readonly batchId: string;
  /** Snapshots of elements being animated */
  readonly snapshots: ReadonlyMap<string, FLIPSnapshot>;
  /** Current progress (0-1) */
  readonly progress: number;
  /** Whether animation is running */
  readonly isRunning: boolean;
  /** Start timestamp */
  readonly startTime: number | null;
  /** Cancel function */
  readonly cancel: () => void;
}

/**
 * Morph transition state.
 */
export interface MorphState {
  /** Current transition configuration */
  readonly config: MorphTransitionConfig;
  /** Active animation context */
  readonly context: AnimationContext | null;
  /** Previous layout state */
  readonly fromState: LayoutState | null;
  /** Target layout state */
  readonly toState: LayoutState | null;
  /** Queue of pending transitions */
  readonly queue: readonly PendingTransition[];
}

/**
 * Pending transition in the queue.
 */
export interface PendingTransition {
  readonly id: string;
  readonly targetState: LayoutState;
  readonly config: Partial<MorphTransitionConfig>;
  readonly timestamp: number;
}

// =============================================================================
// CONSTRAINT SOLVER TYPES
// =============================================================================

/**
 * Layout constraint definition.
 */
export interface LayoutConstraint {
  /** Unique identifier for this constraint */
  readonly id: string;
  /** Type of constraint */
  readonly type: ConstraintType;
  /** Priority of this constraint */
  readonly priority: ConstraintPriority;
  /** Constraint parameters */
  readonly params: ConstraintParams;
  /** Whether this constraint is currently active */
  readonly active: boolean;
}

/**
 * Types of layout constraints.
 */
export type ConstraintType =
  | 'min-width'
  | 'max-width'
  | 'min-height'
  | 'max-height'
  | 'aspect-ratio'
  | 'alignment'
  | 'spacing'
  | 'order'
  | 'visibility'
  | 'containment';

/**
 * Parameters for different constraint types.
 */
export type ConstraintParams =
  | MinMaxConstraintParams
  | AspectRatioConstraintParams
  | AlignmentConstraintParams
  | SpacingConstraintParams
  | OrderConstraintParams
  | VisibilityConstraintParams
  | ContainmentConstraintParams;

/**
 * Min/max dimension constraint parameters.
 */
export interface MinMaxConstraintParams {
  readonly type: 'dimension';
  readonly value: number;
  readonly unit: 'px' | '%' | 'vw' | 'vh';
}

/**
 * Aspect ratio constraint parameters.
 */
export interface AspectRatioConstraintParams {
  readonly type: 'aspect-ratio';
  readonly ratio: number;
  readonly tolerance: number;
}

/**
 * Alignment constraint parameters.
 */
export interface AlignmentConstraintParams {
  readonly type: 'alignment';
  readonly horizontal: 'start' | 'center' | 'end' | 'stretch';
  readonly vertical: 'start' | 'center' | 'end' | 'stretch';
}

/**
 * Spacing constraint parameters.
 */
export interface SpacingConstraintParams {
  readonly type: 'spacing';
  readonly min: number;
  readonly max: number;
  readonly preferred: number;
}

/**
 * Order constraint parameters.
 */
export interface OrderConstraintParams {
  readonly type: 'order';
  readonly before?: readonly string[];
  readonly after?: readonly string[];
}

/**
 * Visibility constraint parameters.
 */
export interface VisibilityConstraintParams {
  readonly type: 'visibility';
  readonly condition: 'always' | 'viewport' | 'container' | 'custom';
  readonly threshold: number;
}

/**
 * Containment constraint parameters.
 */
export interface ContainmentConstraintParams {
  readonly type: 'containment';
  readonly contain: boolean;
  readonly overflow: 'visible' | 'hidden' | 'scroll' | 'auto';
}

/**
 * Constraint solution result.
 */
export interface ConstraintSolution {
  /** Whether all required constraints were satisfied */
  readonly feasible: boolean;
  /** Computed positions for each item */
  readonly positions: ReadonlyMap<string, Point2D>;
  /** Computed sizes for each item */
  readonly sizes: ReadonlyMap<string, Dimensions>;
  /** Constraint violations (if any) */
  readonly violations: readonly ConstraintViolation[];
  /** Solve time in milliseconds */
  readonly solveTimeMs: number;
}

/**
 * Information about a constraint violation.
 */
export interface ConstraintViolation {
  readonly constraintId: string;
  readonly severity: 'error' | 'warning';
  readonly message: string;
  readonly affectedItems: readonly string[];
}

// =============================================================================
// CLS GUARD TYPES
// =============================================================================

/**
 * CLS Guard configuration.
 */
export interface CLSGuardConfig {
  /** Enable CLS prevention */
  readonly enabled: boolean;
  /** Maximum allowed CLS score */
  readonly maxCLS: number;
  /** Enable layout reservation */
  readonly reserveLayout: boolean;
  /** Reservation strategy */
  readonly reservationStrategy: ReservationStrategy;
  /** Enable CLS monitoring */
  readonly monitor: boolean;
  /** Callback when CLS threshold is exceeded */
  readonly onThresholdExceeded?: (score: number) => void;
}

/**
 * Default CLS guard configuration.
 */
export const DEFAULT_CLS_GUARD_CONFIG: CLSGuardConfig = {
  enabled: true,
  maxCLS: 0.05,
  reserveLayout: true,
  reservationStrategy: 'skeleton',
  monitor: true,
} as const;

/**
 * Layout reservation strategies.
 */
export type ReservationStrategy =
  | 'skeleton'      // Show skeleton placeholder
  | 'dimensions'    // Reserve exact dimensions
  | 'aspect-ratio'  // Reserve with aspect ratio
  | 'minimum'       // Reserve minimum dimensions
  | 'none';         // No reservation

/**
 * Layout reservation specification.
 */
export interface LayoutReservation {
  /** Unique identifier */
  readonly id: string;
  /** Reserved dimensions */
  readonly dimensions: Dimensions;
  /** Aspect ratio (if using aspect-ratio strategy) */
  readonly aspectRatio?: number;
  /** Minimum dimensions (if using minimum strategy) */
  readonly minDimensions?: Dimensions;
  /** Whether reservation is currently active */
  readonly active: boolean;
  /** Timestamp when reservation was created */
  readonly createdAt: number;
  /** Expected content load time (for optimization) */
  readonly expectedLoadTimeMs?: number;
}

/**
 * CLS measurement result.
 */
export interface CLSMeasurement {
  /** Current CLS score */
  readonly score: number;
  /** Individual layout shift entries */
  readonly entries: readonly LayoutShiftEntry[];
  /** Whether threshold was exceeded */
  readonly thresholdExceeded: boolean;
  /** Timestamp of measurement */
  readonly timestamp: number;
}

/**
 * Individual layout shift entry.
 */
export interface LayoutShiftEntry {
  /** Element that shifted */
  readonly elementId: string | null;
  /** Shift value */
  readonly value: number;
  /** Whether shift had user interaction */
  readonly hadRecentInput: boolean;
  /** Timestamp */
  readonly startTime: number;
}

// =============================================================================
// COMPONENT PROPS TYPES
// =============================================================================

/**
 * Props for the AdaptiveLayout component.
 */
export interface AdaptiveLayoutProps {
  /** Child elements to layout */
  readonly children: ReactNode;
  /** Initial layout mode */
  readonly initialMode?: LayoutMode;
  /** Layout engine configuration */
  readonly config?: Partial<LayoutEngineConfig>;
  /** Morph transition configuration */
  readonly transitionConfig?: Partial<MorphTransitionConfig>;
  /** CLS guard configuration */
  readonly clsConfig?: Partial<CLSGuardConfig>;
  /** Layout constraints */
  readonly constraints?: readonly LayoutConstraint[];
  /** Callback when layout mode changes */
  readonly onModeChange?: (mode: LayoutMode, analysis: ContentAnalysis) => void;
  /** Callback when layout computation completes */
  readonly onLayoutComputed?: (result: LayoutComputeResult) => void;
  /** Custom className */
  readonly className?: string;
  /** Custom styles */
  readonly style?: CSSProperties;
  /** Test ID for testing */
  readonly testId?: string;
}

/**
 * Props for the AdaptiveGrid component.
 */
export interface AdaptiveGridProps {
  /** Child elements */
  readonly children: ReactNode;
  /** Minimum column width */
  readonly minColumnWidth?: number;
  /** Maximum columns */
  readonly maxColumns?: number;
  /** Gap between items */
  readonly gap?: number;
  /** Enable auto-sizing rows */
  readonly autoRows?: boolean;
  /** Grid auto-flow */
  readonly autoFlow?: 'row' | 'column' | 'dense';
  /** Enable masonry layout for variable height items */
  readonly masonry?: boolean;
  /** Custom className */
  readonly className?: string;
  /** Custom styles */
  readonly style?: CSSProperties;
}

/**
 * Props for the AdaptiveStack component.
 */
export interface AdaptiveStackProps {
  /** Child elements */
  readonly children: ReactNode;
  /** Stack direction */
  readonly direction?: 'vertical' | 'horizontal' | 'responsive';
  /** Breakpoint for responsive direction switch */
  readonly breakpoint?: number;
  /** Gap between items */
  readonly gap?: number;
  /** Alignment */
  readonly align?: 'start' | 'center' | 'end' | 'stretch';
  /** Justify content */
  readonly justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  /** Enable wrapping */
  readonly wrap?: boolean;
  /** Custom className */
  readonly className?: string;
  /** Custom styles */
  readonly style?: CSSProperties;
}

/**
 * Props for the AdaptiveContainer component.
 */
export interface AdaptiveContainerProps {
  /** Child elements */
  readonly children: ReactNode;
  /** Container query breakpoints */
  readonly breakpoints?: ContainerBreakpoints;
  /** Enable content density detection */
  readonly detectDensity?: boolean;
  /** Padding configuration */
  readonly padding?: number | BoxSpacing;
  /** Maximum width */
  readonly maxWidth?: number | string;
  /** Center container */
  readonly centered?: boolean;
  /** Custom className */
  readonly className?: string;
  /** Custom styles */
  readonly style?: CSSProperties;
}

/**
 * Container query breakpoints.
 */
export interface ContainerBreakpoints {
  readonly xs?: number;
  readonly sm?: number;
  readonly md?: number;
  readonly lg?: number;
  readonly xl?: number;
}

/**
 * Props for the MorphTransition component.
 */
export interface MorphTransitionProps {
  /** Child element */
  readonly children: ReactNode;
  /** Unique key for FLIP tracking */
  readonly layoutId: string;
  /** Transition configuration */
  readonly config?: Partial<MorphTransitionConfig>;
  /** Whether element is present (for enter/exit animations) */
  readonly present?: boolean;
  /** Initial animation state */
  readonly initial?: Partial<LayoutRect>;
  /** Animation state when present */
  readonly animate?: Partial<LayoutRect>;
  /** Animation state when exiting */
  readonly exit?: Partial<LayoutRect>;
  /** Custom className */
  readonly className?: string;
  /** Custom styles */
  readonly style?: CSSProperties;
}

// =============================================================================
// HOOK RETURN TYPES
// =============================================================================

/**
 * Return type for useAdaptiveLayout hook.
 */
export interface UseAdaptiveLayoutReturn {
  /** Current layout state */
  readonly layoutState: LayoutState | null;
  /** Current layout mode */
  readonly mode: LayoutMode;
  /** Content analysis */
  readonly analysis: ContentAnalysis | null;
  /** Whether layout is computing */
  readonly isComputing: boolean;
  /** Whether layout is transitioning */
  readonly isTransitioning: boolean;
  /** Force a specific layout mode */
  readonly setMode: (mode: LayoutMode) => void;
  /** Trigger layout recomputation */
  readonly recompute: () => void;
  /** Container ref to attach */
  readonly containerRef: RefObject<HTMLDivElement | null>;
}

/**
 * Return type for useLayoutMode hook.
 */
export interface UseLayoutModeReturn {
  /** Current layout mode */
  readonly mode: LayoutMode;
  /** Previous layout mode */
  readonly previousMode: LayoutMode | null;
  /** Set layout mode */
  readonly setMode: (mode: LayoutMode) => void;
  /** Whether mode is locked (manual override) */
  readonly isLocked: boolean;
  /** Lock mode to prevent auto-changes */
  readonly lockMode: () => void;
  /** Unlock mode to allow auto-changes */
  readonly unlockMode: () => void;
}

/**
 * Return type for useLayoutMorph hook.
 */
export interface UseLayoutMorphReturn {
  /** Trigger a morph transition */
  readonly morph: (targetState: Partial<LayoutState>) => Promise<void>;
  /** Cancel current transition */
  readonly cancel: () => void;
  /** Current transition progress (0-1) */
  readonly progress: number;
  /** Whether transitioning */
  readonly isTransitioning: boolean;
  /** Register an element for FLIP tracking */
  readonly registerElement: (id: string, ref: RefObject<HTMLElement>) => void;
  /** Unregister an element */
  readonly unregisterElement: (id: string) => void;
  /** Take FLIP snapshot */
  readonly snapshot: () => void;
}

/**
 * Return type for useContentDensity hook.
 */
export interface UseContentDensityReturn {
  /** Current content density */
  readonly density: ContentDensity;
  /** Item count */
  readonly itemCount: number;
  /** Average item size */
  readonly averageItemSize: Dimensions | null;
  /** Size variance */
  readonly sizeVariance: number;
  /** Is content image-heavy */
  readonly isImageHeavy: boolean;
  /** Is content text-heavy */
  readonly isTextHeavy: boolean;
  /** Force density recalculation */
  readonly recalculate: () => void;
}

/**
 * Return type for useCLSGuard hook.
 */
export interface UseCLSGuardReturn {
  /** Current CLS score */
  readonly clsScore: number;
  /** Whether CLS threshold exceeded */
  readonly thresholdExceeded: boolean;
  /** Create a layout reservation */
  readonly reserve: (id: string, dimensions: Dimensions) => LayoutReservation;
  /** Release a reservation */
  readonly release: (id: string) => void;
  /** Get active reservations */
  readonly reservations: ReadonlyMap<string, LayoutReservation>;
  /** CLS measurements history */
  readonly measurements: readonly CLSMeasurement[];
}

// =============================================================================
// CONTEXT TYPES
// =============================================================================

/**
 * Adaptive layout context value.
 */
export interface AdaptiveLayoutContextValue {
  /** Layout engine instance */
  readonly engine: LayoutEngineInterface;
  /** Morph transition controller */
  readonly morphController: MorphControllerInterface;
  /** CLS guard instance */
  readonly clsGuard: CLSGuardInterface;
  /** Constraint solver instance */
  readonly constraintSolver: ConstraintSolverInterface;
  /** Current configuration */
  readonly config: LayoutEngineConfig;
  /** Current layout state */
  readonly layoutState: LayoutState | null;
  /** Register child element */
  readonly registerChild: (id: string, ref: RefObject<HTMLElement>) => void;
  /** Unregister child element */
  readonly unregisterChild: (id: string) => void;
}

// =============================================================================
// INTERFACE TYPES (for implementations)
// =============================================================================

/**
 * Layout engine interface.
 */
export interface LayoutEngineInterface {
  readonly config: LayoutEngineConfig;
  configure(config: Partial<LayoutEngineConfig>): void;
  analyze(container: HTMLElement): ContentAnalysis;
  compute(request: LayoutComputeRequest): LayoutComputeResult;
  selectMode(analysis: ContentAnalysis, constraints: readonly LayoutConstraint[]): LayoutMode;
  observe(container: HTMLElement, callback: (entry: ResizeObserverEntry) => void): () => void;
  destroy(): void;
}

/**
 * Morph controller interface.
 */
export interface MorphControllerInterface {
  readonly config: MorphTransitionConfig;
  readonly isTransitioning: boolean;
  configure(config: Partial<MorphTransitionConfig>): void;
  snapshotFirst(elements: Map<string, HTMLElement>): Map<string, LayoutRect>;
  snapshotLast(elements: Map<string, HTMLElement>): Map<string, LayoutRect>;
  createAnimation(
    first: Map<string, LayoutRect>,
    last: Map<string, LayoutRect>,
    elements: Map<string, HTMLElement>
  ): AnimationContext;
  play(context: AnimationContext): Promise<void>;
  cancel(): void;
  destroy(): void;
}

/**
 * CLS guard interface.
 */
export interface CLSGuardInterface {
  readonly config: CLSGuardConfig;
  readonly currentScore: number;
  configure(config: Partial<CLSGuardConfig>): void;
  createReservation(id: string, dimensions: Dimensions, strategy?: ReservationStrategy): LayoutReservation;
  releaseReservation(id: string): void;
  measureCLS(): CLSMeasurement;
  observeCLS(callback: (measurement: CLSMeasurement) => void): () => void;
  destroy(): void;
}

/**
 * Constraint solver interface.
 */
export interface ConstraintSolverInterface {
  addConstraint(constraint: LayoutConstraint): void;
  removeConstraint(id: string): void;
  updateConstraint(id: string, updates: Partial<LayoutConstraint>): void;
  solve(
    items: ReadonlyMap<string, Dimensions>,
    containerDimensions: Dimensions
  ): ConstraintSolution;
  validate(solution: ConstraintSolution): readonly ConstraintViolation[];
  clear(): void;
}

// =============================================================================
// USER PREFERENCE TYPES
// =============================================================================

/**
 * User layout preferences learned over time.
 */
export interface UserLayoutPreferences {
  /** Preferred layout mode for different content types */
  readonly modePreferences: ReadonlyMap<ContentDensity, LayoutMode>;
  /** Preferred animation settings */
  readonly animationPreferences: AnimationPreferences;
  /** Accessibility preferences */
  readonly accessibilityPreferences: AccessibilityPreferences;
  /** Timestamps of preference updates */
  readonly lastUpdated: number;
}

/**
 * Animation-related preferences.
 */
export interface AnimationPreferences {
  readonly reducedMotion: boolean;
  readonly preferredDuration: number;
  readonly preferredEasing: EasingFunction;
}

/**
 * Accessibility-related preferences.
 */
export interface AccessibilityPreferences {
  readonly highContrast: boolean;
  readonly largeText: boolean;
  readonly reducedMotion: boolean;
  readonly screenReader: boolean;
}

// =============================================================================
// PERFORMANCE TYPES
// =============================================================================

/**
 * Performance metrics for layout operations.
 */
export interface LayoutPerformanceMetrics {
  /** Layout computation time */
  readonly computeTimeMs: number;
  /** Animation frame time */
  readonly frameTimeMs: number;
  /** Memory usage estimate */
  readonly memoryUsageBytes: number;
  /** Number of elements tracked */
  readonly trackedElements: number;
  /** Number of active constraints */
  readonly activeConstraints: number;
  /** Frame rate during animations */
  readonly fps: number;
  /** Whether performance budget was exceeded */
  readonly budgetExceeded: boolean;
}

/**
 * Performance budget configuration.
 */
export interface PerformanceBudget {
  /** Maximum compute time per frame */
  readonly maxComputeTimeMs: number;
  /** Maximum memory usage */
  readonly maxMemoryBytes: number;
  /** Minimum acceptable FPS */
  readonly minFps: number;
  /** Maximum tracked elements */
  readonly maxTrackedElements: number;
}

/**
 * Default performance budget.
 */
export const DEFAULT_PERFORMANCE_BUDGET: PerformanceBudget = {
  maxComputeTimeMs: 16,
  maxMemoryBytes: 50 * 1024 * 1024, // 50MB
  minFps: 55,
  maxTrackedElements: 1000,
} as const;
