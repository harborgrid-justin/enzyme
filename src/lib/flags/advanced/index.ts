/**
 * @fileoverview Advanced feature flag module exports.
 *
 * This module provides enterprise-grade feature flag capabilities:
 * - Comprehensive targeting rules
 * - Percentage-based rollouts
 * - User segmentation
 * - Multi-variate flags
 * - Flag dependencies
 * - Lifecycle management
 *
 * @module flags/advanced
 *
 * @example
 * ```typescript
 * import {
 *   FlagEngine,
 *   initFlagEngine,
 *   createTargetingRule,
 *   createSegment,
 *   RolloutBuilder,
 * } from '@/lib/flags/advanced';
 *
 * // Initialize the engine
 * const engine = initFlagEngine({
 *   debug: true,
 *   offlineMode: false,
 * });
 *
 * // Create targeting rules
 * const betaRule = createTargetingRule()
 *   .id('beta-users')
 *   .name('Beta Users')
 *   .priority(1)
 *   .variant('enabled')
 *   .where('user.isBeta', true)
 *   .build();
 *
 * // Create segments
 * const internalSegment = createSegment()
 *   .id('internal')
 *   .name('Internal Users')
 *   .endsWith('user.email', '@company.com')
 *   .build();
 *
 * // Configure rollouts
 * const rollout = RolloutBuilder.percentage(25, { sticky: true });
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export type {
  // Base Types
  FlagId,
  VariantId,
  SegmentId,
  UserId,
  JsonValue,

  // Evaluation Context
  UserAttributes,
  DeviceContext,
  ApplicationContext,
  NetworkContext,
  SessionContext,
  EvaluationContext,

  // Targeting
  ComparisonOperator,
  AttributePath,
  TargetingCondition,
  LogicalOperator,
  ConditionGroup,
  TargetingRule,
  RuleSchedule,

  // Rollout
  RolloutStrategy,
  PercentageRollout,
  ScheduledRollout,
  RolloutStage,
  RolloutCriteria,
  MetricThreshold,
  RingRollout,
  DeploymentRing,
  CanaryRollout,
  ExperimentRollout,
  VariantAllocation,
  RolloutConfig,

  // Segments
  Segment,

  // Variants
  VariantValueType,
  Variant,

  // Dependencies
  DependencyType,
  FlagDependency,

  // Lifecycle
  FlagLifecycleState,
  FlagLifecycle,

  // Complete Flag
  FeatureFlag,

  // Evaluation Result
  EvaluationReason,
  EvaluationResult,
  EvaluationError,

  // Events
  FlagEvaluationEvent,
  FlagExposureEvent,
  FlagChangeEvent,
  FlagEvent,

  // Configuration
  FlagEngineConfig,
} from './types';

// ============================================================================
// Flag Engine
// ============================================================================

export {
  FlagEngine,
  getFlagEngine,
  initFlagEngine,
  resetFlagEngine,
} from './flag-engine';

// ============================================================================
// Targeting Rules
// ============================================================================

export {
  TargetingRulesEngine,
  TargetingRuleBuilder,
  ConditionGroupBuilder,
  createTargetingRule,
} from './targeting-rules';

export type {
  TargetingResult,
  TargetingDetails,
  RuleEvaluation,
  ConditionResult,
} from './targeting-rules';

// ============================================================================
// Percentage Rollout
// ============================================================================

export {
  PercentageRolloutEngine,
  RolloutBuilder,
  calculateRolloutImpact,
  generateRolloutSchedule,
} from './percentage-rollout';

export type {
  RolloutResult,
  HashFunction,
} from './percentage-rollout';

// ============================================================================
// Segments
// ============================================================================

export {
  SegmentMatcher,
  SegmentBuilder,
  createSegment,
  SegmentFactories,
  composeSegments,
} from './flag-segments';

export type {
  SegmentMatchResult,
  SegmentMatchReason,
  SegmentMatchDetails,
  SegmentCompositionOp,
  ComposedSegment,
} from './flag-segments';

// ============================================================================
// Variants
// ============================================================================

export {
  VariantManager,
  VariantBuilder,
  createVariant,
  getVariantManager,
  VariantSets,
  calculateVariantStats,
  compareVariants,
} from './flag-variants';

export type {
  CreateVariantOptions,
  WeightedVariant,
  VariantStats,
  VariantComparison,
} from './flag-variants';

// ============================================================================
// Dependencies
// ============================================================================

export {
  DependencyResolver,
  DependencyBuilder,
  createDependencies,
  getDependencyResolver,
  resetDependencyResolver,
  validateDependencies,
  generateDependencyDOT,
  isValidTransition,
} from './flag-dependencies';

export type {
  DependencyResolutionResult,
  UnsatisfiedDependency,
  FlagEvaluator,
} from './flag-dependencies';

// ============================================================================
// Lifecycle
// ============================================================================

export {
  LifecycleManager,
  LifecycleBuilder,
  createLifecycle,
  getLifecycleManager,
  resetLifecycleManager,
} from './flag-lifecycle';

export type {
  TransitionOptions,
  LifecycleEvent,
  CleanupReport,
  CleanupRecommendation,
  FlagHealth,
} from './flag-lifecycle';
