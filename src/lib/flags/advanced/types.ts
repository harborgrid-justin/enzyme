/**
 * @fileoverview Core types for the advanced feature flag system.
 *
 * This module provides comprehensive type definitions for:
 * - Flag evaluation contexts
 * - Targeting rules and conditions
 * - Rollout configurations
 * - Segments and variants
 * - Flag lifecycle management
 *
 * @module flags/advanced/types
 */

// ============================================================================
// Base Types
// ============================================================================

/**
 * Unique identifier for a feature flag.
 */
export type FlagId = string;

/**
 * Unique identifier for a variant.
 */
export type VariantId = string;

/**
 * Unique identifier for a segment.
 */
export type SegmentId = string;

/**
 * Unique identifier for a user.
 */
export type UserId = string;

/**
 * Represents any valid JSON value for flag payloads.
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

// ============================================================================
// Evaluation Context
// ============================================================================

/**
 * User attributes for targeting rules.
 */
export interface UserAttributes {
  /** Unique user identifier */
  readonly id: UserId;
  /** User email address */
  readonly email?: string;
  /** User display name */
  readonly name?: string;
  /** Organization or tenant identifier */
  readonly organizationId?: string;
  /** User's assigned groups */
  readonly groups?: readonly string[];
  /** User roles for RBAC */
  readonly roles?: readonly string[];
  /** User permissions */
  readonly permissions?: readonly string[];
  /** User plan or subscription tier */
  readonly plan?: string;
  /** Account creation timestamp */
  readonly createdAt?: Date;
  /** Whether user is internal/employee */
  readonly isInternal?: boolean;
  /** Whether user is in beta program */
  readonly isBeta?: boolean;
  /** Custom attributes for targeting */
  readonly custom?: Readonly<Record<string, JsonValue>>;
}

/**
 * Device and environment information.
 */
export interface DeviceContext {
  /** Device type */
  readonly type: 'mobile' | 'tablet' | 'desktop' | 'tv' | 'unknown';
  /** Operating system */
  readonly os?: string;
  /** OS version */
  readonly osVersion?: string;
  /** Browser name */
  readonly browser?: string;
  /** Browser version */
  readonly browserVersion?: string;
  /** Device manufacturer */
  readonly manufacturer?: string;
  /** Device model */
  readonly model?: string;
  /** Screen width in pixels */
  readonly screenWidth?: number;
  /** Screen height in pixels */
  readonly screenHeight?: number;
  /** Device pixel ratio */
  readonly pixelRatio?: number;
  /** Whether device supports touch */
  readonly isTouchDevice?: boolean;
}

/**
 * Application context for evaluation.
 */
export interface ApplicationContext {
  /** Application name */
  readonly name: string;
  /** Application version */
  readonly version: string;
  /** Build number or commit hash */
  readonly build?: string;
  /** Current environment */
  readonly environment: 'development' | 'staging' | 'production' | 'test';
  /** Application platform */
  readonly platform?: 'web' | 'ios' | 'android' | 'electron' | 'node';
  /** Current locale */
  readonly locale?: string;
  /** Timezone identifier */
  readonly timezone?: string;
}

/**
 * Network and location context.
 */
export interface NetworkContext {
  /** Connection type */
  readonly connectionType?: 'wifi' | 'cellular' | 'ethernet' | 'offline' | 'unknown';
  /** Effective connection type */
  readonly effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  /** Downlink speed in Mbps */
  readonly downlinkSpeed?: number;
  /** Round trip time in ms */
  readonly rtt?: number;
  /** Whether connection is metered */
  readonly isMetered?: boolean;
  /** Country code (ISO 3166-1 alpha-2) */
  readonly countryCode?: string;
  /** Region/state code */
  readonly regionCode?: string;
  /** City name */
  readonly city?: string;
  /** IP address (hashed or partial for privacy) */
  readonly ipHash?: string;
}

/**
 * Session context for evaluation.
 */
export interface SessionContext {
  /** Session identifier */
  readonly sessionId: string;
  /** Session start time */
  readonly startedAt: Date;
  /** Number of page views in session */
  readonly pageViews?: number;
  /** Session duration in seconds */
  readonly duration?: number;
  /** Referrer URL */
  readonly referrer?: string;
  /** UTM parameters */
  readonly utm?: {
    readonly source?: string;
    readonly medium?: string;
    readonly campaign?: string;
    readonly term?: string;
    readonly content?: string;
  };
  /** Whether this is the user's first session */
  readonly isFirstSession?: boolean;
  /** Entry page path */
  readonly entryPage?: string;
}

/**
 * Complete evaluation context for flag decisions.
 */
export interface EvaluationContext {
  /** User information */
  readonly user?: UserAttributes;
  /** Device information */
  readonly device?: DeviceContext;
  /** Application information */
  readonly application?: ApplicationContext;
  /** Network information */
  readonly network?: NetworkContext;
  /** Session information */
  readonly session?: SessionContext;
  /** Evaluation timestamp */
  readonly timestamp?: Date;
  /** Custom context properties */
  readonly custom?: Readonly<Record<string, JsonValue>>;
}

// ============================================================================
// Targeting Rules
// ============================================================================

/**
 * Comparison operators for targeting conditions.
 */
export type ComparisonOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'matches' // regex
  | 'in'
  | 'notIn'
  | 'greaterThan'
  | 'greaterThanOrEquals'
  | 'lessThan'
  | 'lessThanOrEquals'
  | 'before' // date
  | 'after' // date
  | 'exists'
  | 'notExists'
  | 'semverGreaterThan'
  | 'semverLessThan'
  | 'semverEquals';

/**
 * Attribute path for nested property access.
 * Supports dot notation: "user.custom.department"
 */
export type AttributePath = string;

/**
 * A single targeting condition.
 */
export interface TargetingCondition {
  /** Attribute to check (supports dot notation) */
  readonly attribute: AttributePath;
  /** Comparison operator */
  readonly operator: ComparisonOperator;
  /** Value(s) to compare against */
  readonly value: JsonValue | readonly JsonValue[];
  /** Whether comparison is case-sensitive (default: true) */
  readonly caseSensitive?: boolean;
  /** Negate the condition result */
  readonly negate?: boolean;
}

/**
 * Logical operators for combining conditions.
 */
export type LogicalOperator = 'and' | 'or';

/**
 * A group of conditions combined with a logical operator.
 */
export interface ConditionGroup {
  /** How to combine conditions */
  readonly operator: LogicalOperator;
  /** Conditions in this group */
  readonly conditions: readonly (TargetingCondition | ConditionGroup)[];
}

/**
 * A targeting rule that maps conditions to a variant.
 */
export interface TargetingRule {
  /** Unique rule identifier */
  readonly id: string;
  /** Human-readable rule name */
  readonly name: string;
  /** Rule description */
  readonly description?: string;
  /** Rule priority (lower = higher priority) */
  readonly priority: number;
  /** Conditions that must be met */
  readonly conditions: ConditionGroup;
  /** Variant to serve when rule matches */
  readonly variantId: VariantId;
  /** Whether rule is enabled */
  readonly enabled: boolean;
  /** Rule schedule constraints */
  readonly schedule?: RuleSchedule;
}

/**
 * Time-based constraints for rules.
 */
export interface RuleSchedule {
  /** Rule start time */
  readonly startTime?: Date;
  /** Rule end time */
  readonly endTime?: Date;
  /** Days of week when rule is active (0 = Sunday) */
  readonly daysOfWeek?: readonly number[];
  /** Hours of day when rule is active (0-23) */
  readonly hoursOfDay?: readonly number[];
  /** Timezone for schedule evaluation */
  readonly timezone?: string;
}

// ============================================================================
// Rollout Configuration
// ============================================================================

/**
 * Rollout strategies for gradual feature release.
 */
export type RolloutStrategy =
  | 'percentage'
  | 'scheduled'
  | 'ring'
  | 'canary'
  | 'experiment';

/**
 * Percentage-based rollout configuration.
 */
export interface PercentageRollout {
  readonly strategy: 'percentage';
  /** Percentage of users to include (0-100) */
  readonly percentage: number;
  /** Hash key for consistent assignment */
  readonly hashKey?: string;
  /** Salt for hash randomization */
  readonly salt?: string;
  /** Whether to use sticky assignment */
  readonly sticky?: boolean;
}

/**
 * Scheduled rollout configuration.
 */
export interface ScheduledRollout {
  readonly strategy: 'scheduled';
  /** Rollout stages */
  readonly stages: readonly RolloutStage[];
  /** Current stage index */
  readonly currentStage: number;
  /** Whether to auto-advance stages */
  readonly autoAdvance: boolean;
}

/**
 * A stage in a scheduled rollout.
 */
export interface RolloutStage {
  /** Stage name */
  readonly name: string;
  /** Percentage at this stage */
  readonly percentage: number;
  /** When this stage starts */
  readonly startTime: Date;
  /** Minimum duration before next stage */
  readonly minDuration?: number;
  /** Success criteria for auto-advance */
  readonly criteria?: RolloutCriteria;
}

/**
 * Criteria for rollout advancement.
 */
export interface RolloutCriteria {
  /** Minimum sample size */
  readonly minSampleSize?: number;
  /** Maximum error rate */
  readonly maxErrorRate?: number;
  /** Minimum success rate */
  readonly minSuccessRate?: number;
  /** Custom metric thresholds */
  readonly metrics?: readonly MetricThreshold[];
}

/**
 * A metric threshold for rollout criteria.
 */
export interface MetricThreshold {
  /** Metric name */
  readonly name: string;
  /** Threshold operator */
  readonly operator: 'lessThan' | 'greaterThan' | 'equals';
  /** Threshold value */
  readonly value: number;
}

/**
 * Ring-based rollout configuration (e.g., internal -> beta -> GA).
 */
export interface RingRollout {
  readonly strategy: 'ring';
  /** Deployment rings */
  readonly rings: readonly DeploymentRing[];
  /** Current active ring */
  readonly currentRing: string;
}

/**
 * A deployment ring.
 */
export interface DeploymentRing {
  /** Ring identifier */
  readonly id: string;
  /** Ring name */
  readonly name: string;
  /** Segment IDs included in this ring */
  readonly segments: readonly SegmentId[];
  /** Ring priority (lower = earlier) */
  readonly priority: number;
}

/**
 * Canary rollout configuration.
 */
export interface CanaryRollout {
  readonly strategy: 'canary';
  /** Canary percentage */
  readonly canaryPercentage: number;
  /** Canary segment (if targeting specific users) */
  readonly canarySegment?: SegmentId;
  /** Success criteria for full rollout */
  readonly criteria: RolloutCriteria;
  /** Automatic rollback on failure */
  readonly autoRollback: boolean;
}

/**
 * Experiment/A-B test rollout configuration.
 */
export interface ExperimentRollout {
  readonly strategy: 'experiment';
  /** Experiment identifier */
  readonly experimentId: string;
  /** Traffic allocation per variant */
  readonly allocation: readonly VariantAllocation[];
  /** Experiment end date */
  readonly endDate?: Date;
  /** Primary metric for analysis */
  readonly primaryMetric: string;
}

/**
 * Traffic allocation for a variant in an experiment.
 */
export interface VariantAllocation {
  /** Variant identifier */
  readonly variantId: VariantId;
  /** Traffic percentage (0-100) */
  readonly percentage: number;
}

/**
 * Union type for all rollout configurations.
 */
export type RolloutConfig =
  | PercentageRollout
  | ScheduledRollout
  | RingRollout
  | CanaryRollout
  | ExperimentRollout;

// ============================================================================
// Segments
// ============================================================================

/**
 * A user segment for targeting.
 */
export interface Segment {
  /** Unique segment identifier */
  readonly id: SegmentId;
  /** Segment name */
  readonly name: string;
  /** Segment description */
  readonly description?: string;
  /** Segment membership rules */
  readonly rules: ConditionGroup;
  /** Explicitly included user IDs */
  readonly includedUsers?: readonly UserId[];
  /** Explicitly excluded user IDs */
  readonly excludedUsers?: readonly UserId[];
  /** Estimated segment size */
  readonly estimatedSize?: number;
  /** Last updated timestamp */
  readonly updatedAt: Date;
  /** Segment tags for organization */
  readonly tags?: readonly string[];
}

// ============================================================================
// Variants
// ============================================================================

/**
 * Variant value types.
 */
export type VariantValueType = 'boolean' | 'string' | 'number' | 'json';

/**
 * A feature flag variant.
 */
export interface Variant<T = JsonValue> {
  /** Unique variant identifier */
  readonly id: VariantId;
  /** Variant name */
  readonly name: string;
  /** Variant description */
  readonly description?: string;
  /** Variant value */
  readonly value: T;
  /** Value type for validation */
  readonly valueType: VariantValueType;
  /** Whether this is the control/default variant */
  readonly isControl?: boolean;
  /** Additional payload data */
  readonly payload?: Readonly<Record<string, JsonValue>>;
  /** Attachment references (e.g., config files) */
  readonly attachments?: readonly string[];
}

// ============================================================================
// Flag Dependencies
// ============================================================================

/**
 * Dependency types between flags.
 */
export type DependencyType =
  | 'requires' // This flag requires another to be enabled
  | 'conflicts' // This flag conflicts with another
  | 'implies' // Enabling this flag implies another should be enabled
  | 'supersedes'; // This flag supersedes/replaces another

/**
 * A dependency between flags.
 */
export interface FlagDependency {
  /** The flag this dependency is defined on */
  readonly sourceFlag: FlagId;
  /** The flag being depended upon */
  readonly targetFlag: FlagId;
  /** Type of dependency */
  readonly type: DependencyType;
  /** Required variant of target flag (for 'requires' type) */
  readonly requiredVariant?: VariantId;
  /** Description of the dependency */
  readonly description?: string;
}

// ============================================================================
// Flag Lifecycle
// ============================================================================

/**
 * Feature flag lifecycle states.
 */
export type FlagLifecycleState =
  | 'draft'
  | 'active'
  | 'paused'
  | 'deprecated'
  | 'archived';

/**
 * Flag lifecycle metadata.
 */
export interface FlagLifecycle {
  /** Current state */
  readonly state: FlagLifecycleState;
  /** When the flag was created */
  readonly createdAt: Date;
  /** Who created the flag */
  readonly createdBy: string;
  /** When the flag was last updated */
  readonly updatedAt: Date;
  /** Who last updated the flag */
  readonly updatedBy: string;
  /** When the flag was activated */
  readonly activatedAt?: Date;
  /** Planned deprecation date */
  readonly deprecationDate?: Date;
  /** Planned removal date */
  readonly removalDate?: Date;
  /** Associated issue/ticket number */
  readonly ticketId?: string;
  /** Associated documentation URL */
  readonly documentationUrl?: string;
  /** Flag owner (team or individual) */
  readonly owner?: string;
  /** Review date for flag cleanup */
  readonly reviewDate?: Date;
}

// ============================================================================
// Complete Flag Definition
// ============================================================================

/**
 * Complete feature flag definition.
 */
export interface FeatureFlag<T = JsonValue> {
  /** Unique flag identifier */
  readonly id: FlagId;
  /** Flag key (used in code) */
  readonly key: string;
  /** Human-readable name */
  readonly name: string;
  /** Flag description */
  readonly description?: string;
  /** Flag tags for organization */
  readonly tags?: readonly string[];
  /** Flag variants */
  readonly variants: readonly Variant<T>[];
  /** Default variant when no rules match */
  readonly defaultVariant: VariantId;
  /** Off variant when flag is disabled */
  readonly offVariant: VariantId;
  /** Whether flag is enabled */
  readonly enabled: boolean;
  /** Targeting rules */
  readonly targetingRules?: readonly TargetingRule[];
  /** Rollout configuration */
  readonly rollout?: RolloutConfig;
  /** Prerequisite segments */
  readonly segments?: readonly SegmentId[];
  /** Flag dependencies */
  readonly dependencies?: readonly FlagDependency[];
  /** Lifecycle metadata */
  readonly lifecycle: FlagLifecycle;
  /** Client-side availability */
  readonly clientSideAvailability?: {
    readonly usingMobileKey?: boolean;
    readonly usingEnvironmentId?: boolean;
  };
}

// ============================================================================
// Evaluation Result
// ============================================================================

/**
 * Reason for flag evaluation result.
 */
export type EvaluationReason =
  | 'OFF' // Flag is disabled
  | 'TARGET_MATCH' // User matched a targeting rule
  | 'RULE_MATCH' // User matched a rule condition
  | 'SEGMENT_MATCH' // User matched a segment
  | 'ROLLOUT' // User included via rollout
  | 'PREREQUISITE_FAILED' // Prerequisite flag not met
  | 'DEPENDENCY_FAILED' // Dependency constraint not met
  | 'DEFAULT' // No rules matched, using default
  | 'ERROR' // Evaluation error
  | 'STALE'; // Using cached/stale value

/**
 * Detailed evaluation result.
 */
export interface EvaluationResult<T = JsonValue> {
  /** Flag key */
  readonly flagKey: string;
  /** Resolved value */
  readonly value: T;
  /** Variant ID that was selected */
  readonly variantId: VariantId;
  /** Reason for this result */
  readonly reason: EvaluationReason;
  /** ID of the rule that matched (if applicable) */
  readonly ruleId?: string;
  /** ID of the segment that matched (if applicable) */
  readonly segmentId?: string;
  /** Whether value might be stale */
  readonly isStale: boolean;
  /** Evaluation timestamp */
  readonly timestamp: Date;
  /** Evaluation duration in milliseconds */
  readonly durationMs: number;
  /** Error details if evaluation failed */
  readonly error?: EvaluationError;
  /** Additional metadata */
  readonly metadata?: Readonly<Record<string, JsonValue>>;
}

/**
 * Evaluation error details.
 */
export interface EvaluationError {
  /** Error code */
  readonly code: string;
  /** Error message */
  readonly message: string;
  /** Whether error is transient */
  readonly isTransient: boolean;
  /** Stack trace (development only) */
  readonly stack?: string;
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Flag evaluation event for analytics.
 */
export interface FlagEvaluationEvent {
  readonly type: 'evaluation';
  readonly flagKey: string;
  readonly variantId: VariantId;
  readonly value: JsonValue;
  readonly reason: EvaluationReason;
  readonly context: EvaluationContext;
  readonly timestamp: Date;
  readonly durationMs: number;
}

/**
 * Flag exposure event for experiments.
 */
export interface FlagExposureEvent {
  readonly type: 'exposure';
  readonly flagKey: string;
  readonly variantId: VariantId;
  readonly experimentId?: string;
  readonly userId: UserId;
  readonly sessionId: string;
  readonly timestamp: Date;
  readonly metadata?: Record<string, JsonValue>;
}

/**
 * Flag value change event.
 */
export interface FlagChangeEvent {
  readonly type: 'change';
  readonly flagKey: string;
  readonly previousValue: JsonValue;
  readonly newValue: JsonValue;
  readonly previousVariantId: VariantId;
  readonly newVariantId: VariantId;
  readonly timestamp: Date;
}

/**
 * Union of all flag events.
 */
export type FlagEvent =
  | FlagEvaluationEvent
  | FlagExposureEvent
  | FlagChangeEvent;

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Flag engine configuration.
 */
export interface FlagEngineConfig {
  /** Default evaluation context */
  readonly defaultContext?: Partial<EvaluationContext>;
  /** Cache TTL in milliseconds */
  readonly cacheTtl?: number;
  /** Enable offline mode */
  readonly offlineMode?: boolean;
  /** Fallback values when flags cannot be evaluated */
  readonly fallbacks?: Readonly<Record<FlagId, JsonValue>>;
  /** Enable debug logging */
  readonly debug?: boolean;
  /** Custom hash function for rollouts */
  readonly hashFunction?: (key: string, salt?: string) => number;
  /** Event handlers */
  readonly onEvaluation?: (event: FlagEvaluationEvent) => void;
  readonly onExposure?: (event: FlagExposureEvent) => void;
  readonly onChange?: (event: FlagChangeEvent) => void;
  readonly onError?: (error: Error, flagKey: string) => void;
}
