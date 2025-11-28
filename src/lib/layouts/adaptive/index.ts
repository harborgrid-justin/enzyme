/**
 * @fileoverview Adaptive Layout System
 *
 * A world-class Automatic Adaptive & Morphing Layouts system for React applications.
 * This module provides content-aware layout computation, FLIP-based morph transitions,
 * constraint-based layout solving, and CLS prevention.
 *
 * ## Features
 *
 * - **Content-Aware Layouts**: Automatically select optimal layout modes based on
 *   content analysis (item count, size variance, content type)
 *
 * - **FLIP Animations**: GPU-accelerated morph transitions using the First, Last,
 *   Invert, Play technique for smooth 60fps animations
 *
 * - **Constraint Solver**: Sophisticated constraint-based layout system with
 *   priority-based resolution
 *
 * - **CLS Prevention**: Zero Cumulative Layout Shift through layout reservations
 *   and skeleton placeholders
 *
 * - **Breakpoint-Free**: Content-driven responsive design without traditional
 *   viewport breakpoints
 *
 * ## Quick Start
 *
 * ```tsx
 * import {
 *   AdaptiveLayout,
 *   AdaptiveGrid,
 *   MorphTransition,
 *   useAdaptiveLayout,
 * } from '@/lib/layouts/adaptive';
 *
 * function Gallery({ items }) {
 *   return (
 *     <AdaptiveLayout
 *       initialMode="grid"
 *       config={{ contentAware: true }}
 *       transitionConfig={{ duration: 300 }}
 *     >
 *       <AdaptiveGrid minColumnWidth={200} gap={16}>
 *         {items.map(item => (
 *           <MorphTransition key={item.id} layoutId={item.id}>
 *             <Card>{item.content}</Card>
 *           </MorphTransition>
 *         ))}
 *       </AdaptiveGrid>
 *     </AdaptiveLayout>
 *   );
 * }
 * ```
 *
 * ## Layout Modes
 *
 * - `grid` - Multi-column grid layout
 * - `list` - Single-column list layout
 * - `compact` - Dense grid with smaller items
 * - `expanded` - Spacious layout with larger items
 * - `dense` - Maximum density layout
 * - `sparse` - Generous spacing for readability
 *
 * ## Architecture
 *
 * The system is composed of several key parts:
 *
 * 1. **Layout Engine** - Content analysis and layout computation
 * 2. **Morph Controller** - FLIP animation orchestration
 * 3. **Constraint Solver** - Layout constraint resolution
 * 4. **CLS Guard** - Layout shift prevention and monitoring
 *
 * @module layouts/adaptive
 * @version 1.0.0
 * @license MIT
 */

// =============================================================================
// TYPE EXPORTS
// =============================================================================

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
  PerformanceBudget,
} from './types.ts';

// =============================================================================
// CONSTANT EXPORTS
// =============================================================================

export {
  DEFAULT_LAYOUT_ENGINE_CONFIG,
  DEFAULT_MORPH_TRANSITION_CONFIG,
  DEFAULT_CLS_GUARD_CONFIG,
  DEFAULT_PERFORMANCE_BUDGET,
} from './types.ts';

// =============================================================================
// CORE ENGINE EXPORTS
// =============================================================================

export {
  LayoutEngine,
  createLayoutEngine,
  getSharedLayoutEngine,
  resetSharedLayoutEngine,
} from './layout-engine.ts';

export {
  MorphController,
  createMorphController,
  createElementFLIP,
  performFLIP,
} from './morph-transition.ts';

export {
  ConstraintSolver,
  createConstraintSolver,
} from './constraint-solver.ts';

export {
  CLSGuard,
  createCLSGuard,
  predictCLSImpact,
  createOptimizedReservations,
} from './cls-guard.ts';

// =============================================================================
// COMPONENT EXPORTS
// =============================================================================

export {
  AdaptiveLayout,
  AdaptiveLayoutContext,
  useAdaptiveLayoutContext,
} from './AdaptiveLayout.tsx';

export {
  AdaptiveGrid,
} from './AdaptiveGrid.tsx';

export {
  AdaptiveStack,
  HStack,
  VStack,
  ResponsiveStack,
} from './AdaptiveStack.tsx';

export {
  AdaptiveContainer,
  ContainerContext,
  useContainerContext,
  useContainerQuery,
  useContainerValue,
} from './AdaptiveContainer.tsx';

export {
  MorphTransition,
  AnimatedPresence,
} from './MorphTransition.tsx';

// =============================================================================
// HOOK EXPORTS
// =============================================================================

export {
  // Primary hooks
  useAdaptiveLayout,
  useLayoutMode,
  useLayoutMorph,
  useContentDensity,
  useCLSGuard,

  // Helper hooks
  useIsLayoutMode,
  useLayoutModeValue,
  useMorphElement,
  useDensityThreshold,
  useImageReservation,
  useCLSMonitor,

  // Hook option types
  type UseAdaptiveLayoutOptions,
  type UseLayoutModeOptions,
  type UseLayoutMorphOptions,
  type UseContentDensityOptions,
  type UseCLSGuardOptions,
} from './hooks/index.ts';
