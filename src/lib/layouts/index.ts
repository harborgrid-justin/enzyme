/**
 * @fileoverview Layouts Module - Main Barrel Export
 *
 * Provides comprehensive layout systems for React applications:
 *
 * ## Adaptive Layouts (@/lib/layouts/adaptive)
 * - Content-aware layout computation
 * - FLIP-based morph transitions
 * - Constraint-based layout solving
 * - CLS (Cumulative Layout Shift) prevention
 *
 * ## Context-Aware Layouts (@/lib/layouts/context-aware)
 * - DOM ancestry tracking and propagation
 * - Viewport-relative positioning
 * - Scroll container awareness
 * - Portal context bridging
 * - Z-index management
 *
 * @example
 * ```tsx
 * import {
 *   // Adaptive layouts
 *   AdaptiveLayout,
 *   AdaptiveGrid,
 *   MorphTransition,
 *   useAdaptiveLayout,
 *
 *   // Context-aware layouts
 *   DOMContextProvider,
 *   ContextAwareBox,
 *   useViewportPosition,
 * } from '@defendr/enzyme/layouts';
 * ```
 *
 * @module layouts
 * @version 1.0.0
 * @license MIT
 */

// =============================================================================
// ADAPTIVE LAYOUT SYSTEM EXPORTS
// =============================================================================

// Types
export type {
  // Foundational types
  LayoutMode,
  TransitionDirection,
  ContentDensity,
  ConstraintPriority,
  EasingFunction,
  GPUAcceleratedProperty,

  // Dimensional types
  Point2D,
  Dimensions,
  BoundingBox,
  BoxSpacing,
  LayoutRect,

  // Layout engine types
  LayoutEngineConfig,
  ContentAnalysis,
  AspectRatioDistribution,
  LayoutState,
  GridLayoutConfig,
  ListLayoutConfig,
  LayoutComputeRequest,
  LayoutComputeResult,

  // Morph transition types
  MorphTransitionConfig,
  FLIPSnapshot,
  Transform3D,
  AnimationContext,
  MorphState,
  PendingTransition,

  // Constraint solver types
  LayoutConstraint,
  ConstraintType,
  ConstraintParams,
  MinMaxConstraintParams,
  AspectRatioConstraintParams,
  AlignmentConstraintParams,
  SpacingConstraintParams,
  OrderConstraintParams,
  VisibilityConstraintParams,
  ContainmentConstraintParams,
  ConstraintSolution,
  ConstraintViolation,

  // CLS guard types
  CLSGuardConfig,
  ReservationStrategy,
  LayoutReservation,
  CLSMeasurement,
  LayoutShiftEntry,

  // Component prop types
  AdaptiveLayoutProps,
  AdaptiveGridProps,
  AdaptiveStackProps,
  AdaptiveContainerProps,
  ContainerBreakpoints,
  MorphTransitionProps,

  // Hook return types
  UseAdaptiveLayoutReturn,
  UseLayoutModeReturn,
  UseLayoutMorphReturn,
  UseContentDensityReturn,
  UseCLSGuardReturn,

  // Context types
  AdaptiveLayoutContextValue,

  // Interface types
  LayoutEngineInterface,
  MorphControllerInterface,
  CLSGuardInterface,
  ConstraintSolverInterface,

  // User preference types
  UserLayoutPreferences,
  AnimationPreferences,
  AccessibilityPreferences,

  // Performance types
  LayoutPerformanceMetrics,
  PerformanceBudget as AdaptivePerformanceBudget,
} from './adaptive';

// Constants
export {
  DEFAULT_LAYOUT_ENGINE_CONFIG,
  DEFAULT_MORPH_TRANSITION_CONFIG,
  DEFAULT_CLS_GUARD_CONFIG,
  DEFAULT_PERFORMANCE_BUDGET,
} from './adaptive';

// Core engines
export {
  LayoutEngine,
  createLayoutEngine,
  getSharedLayoutEngine,
  resetSharedLayoutEngine,
  MorphController,
  createMorphController,
  createElementFLIP,
  performFLIP,
  ConstraintSolver,
  createConstraintSolver,
  CLSGuard,
  createCLSGuard,
  predictCLSImpact,
  createOptimizedReservations,
} from './adaptive';

// Components
export {
  AdaptiveLayout,
  AdaptiveLayoutContext,
  useAdaptiveLayoutContext,
  AdaptiveGrid,
  AdaptiveStack,
  HStack,
  VStack,
  ResponsiveStack,
  AdaptiveContainer,
  ContainerContext,
  useContainerContext,
  useContainerQuery,
  useContainerValue,
  MorphTransition,
  AnimatedPresence,
} from './adaptive';

// Hooks
export {
  useAdaptiveLayout,
  useLayoutMode,
  useLayoutMorph,
  useContentDensity,
  useCLSGuard,
  useIsLayoutMode,
  useLayoutModeValue,
  useMorphElement,
  useDensityThreshold,
  useImageReservation,
  useCLSMonitor,
} from './adaptive';

// Hook option types
export type {
  UseAdaptiveLayoutOptions,
  UseLayoutModeOptions,
  UseLayoutMorphOptions,
  UseContentDensityOptions,
  UseCLSGuardOptions,
} from './adaptive';

// =============================================================================
// CONTEXT-AWARE LAYOUT SYSTEM EXPORTS
// =============================================================================

// Types
export type {
  // Layout types
  LayoutType,
  PositionType,
  OverflowType,
  FlexDirection,
  GridAutoFlow,

  // Dimension types
  DimensionValue,
  DimensionBounds,
  LayoutConstraints,
  ComputedBounds,

  // Ancestor types
  LayoutAncestor,
  FlexContainerProperties,
  GridContainerProperties,

  // Viewport types
  VisibilityState,
  ScrollDirection,
  ViewportInfo,
  ViewportPosition,

  // Scroll types
  ScrollContainer,
  StickyState,

  // Portal types
  PortalContext,
  DOMContextSnapshot,

  // Z-index types
  ZIndexLayer,
  ZIndexContext,

  // Main context type
  DOMContext,

  // Component props
  ContextAwareComponentProps,
  DOMContextProviderProps,
  ContextAwareBoxProps,
  PortalBridgeProps,
  ScrollAwareContainerProps,
  ViewportAnchorProps,

  // Hook return types
  UseDOMContextReturn,
  UseLayoutAncestryReturn,
  UseViewportPositionReturn,
  UseScrollContextReturn,
  UsePortalContextReturn,

  // Event types
  DOMContextChangeEvent,
  ScrollEventDetail,

  // Configuration types
  ContextTrackingConfig,
} from './context-aware';

// Type guards and constants
export {
  Z_INDEX_LAYERS,
  DEFAULT_TRACKING_CONFIG,
  isDefined,
  isLayoutType,
  isPositionType,
  isScrollContainer,
} from './context-aware';

// Core systems
export {
  DOMContextTracker,
  getDOMContextTracker,
  findAncestorByType,
  findScrollContainerAncestor,
  findContainingBlockAncestor,
  computeInheritedConstraints,
  isWithinLayoutType,
  getLayoutDepth,
  ViewportTracker,
  getViewportTracker,
  getViewport,
  onViewportChange,
  isElementInViewport,
  getViewportPosition,
  getDistanceFromViewportCenter,
  getOptimalScrollPosition,
  ScrollTracker,
  ScrollContainerRegistry,
  getScrollContainerRegistry,
  findScrollContainer,
  createScrollTracker,
  PortalContextManager,
  getPortalContextManager,
  createPortalContext,
  destroyPortalContext,
  getPortalContextForElement,
  isInPortal,
  getPortalHierarchy,
  ZIndexManager,
  getZIndexManager,
  registerZIndex,
  unregisterZIndex,
  getLayerZIndex,
  bringToFront,
  sendToBack,
} from './context-aware';

// Callback types
export type {
  ViewportChangeCallback,
  VisibilityChangeCallback,
  VisibilityObserverOptions,
  ScrollCallback,
  ScrollEdgeCallback,
  StickyCallback,
  ScrollTrackingOptions,
  PortalContextOptions,
  PortalLifecycleCallback,
  BridgedEventHandler,
  ZIndexRegistration,
  ZIndexRegistrationOptions,
  ZIndexChangeCallback,
} from './context-aware';

// Components
export {
  DOMContextProvider,
  DOMContextReactContext,
  DOMContextUpdateContext,
  DOMContextConsumer,
  useDOMContextValue,
  useDOMContextRefresh,
  withDOMContext,
  NestedDOMContextProvider,
  useDOMContextSelector,
  ContextAwareBox,
  FlexBox,
  GridBox,
  PortalBridge,
  usePortalBridgeContext,
  ModalPortal,
  TooltipPortal,
  PopoverPortal,
  ScrollAwareContainer,
  useScrollContainerContext,
  useScrollControl,
  ViewportAnchor,
  LazyLoad,
  StickyHeader,
  ScrollTrigger,
} from './context-aware';

// Component prop types
export type {
  DOMContextConsumerProps,
  WithDOMContextProps,
  NestedDOMContextProviderProps,
  PolymorphicContextAwareBoxProps,
  BoxContext,
  OnContextReadyCallback,
  FlexBoxProps,
  GridBoxProps,
  ModalPortalProps,
  TooltipPortalProps,
  PopoverPortalProps,
  ExtendedScrollAwareContainerProps,
  ExtendedViewportAnchorProps,
  LazyLoadProps,
  StickyHeaderProps,
  ScrollTriggerProps,
} from './context-aware';

// Hooks
export {
  // DOM Context hooks
  useDOMContext,
  useDOMContextWithElement,
  useContextSelector,
  useContextEffect,

  // Layout Ancestry hooks
  useLayoutAncestry,
  useFlexAncestor,
  useGridAncestor,
  useScrollContainerAncestor,
  useContainingBlockAncestor,
  useIsInFlex,
  useIsInGrid,
  useIsInInline,
  useAvailableWidth,
  useAvailableHeight,
  useParentAspectRatio,

  // Viewport Position hooks
  useViewportPosition,
  useVisibility,
  useIntersectionRatio,
  useDistanceFromViewport,
  useDistanceFromCenter,
  useViewport,
  useViewportDimensions,
  useViewportScroll,
  useIsTouch,
  useOrientation,
  useSafeAreaInsets,

  // Scroll Context hooks
  useScrollContext,
  useScrollContainer,
  useScrollDirection,
  useScrollProgress,
  useIsScrolling,
  useScrollEdges,
  useScrollPosition,
  useScrollVelocity,
  useScrollToTop,
  useScrollToBottom,
  useScrollIntoView,

  // Portal Context hooks
  usePortalContext,
  useIsInPortal,
  useSourceContext,
  usePortalNestingDepth,
  usePortalHierarchy,
  useZIndexForLayer,
  useZIndexContext,
  useZIndexRegistration,
  useZIndexLayers,
} from './context-aware';

// Hook types
export type { DOMContextSelector } from './context-aware';
