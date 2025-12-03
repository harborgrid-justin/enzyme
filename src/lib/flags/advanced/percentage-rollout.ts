/**
 * @fileoverview Percentage-based rollout engine for gradual feature releases.
 *
 * Supports multiple rollout strategies:
 * - Simple percentage rollouts
 * - Scheduled/staged rollouts
 * - Ring-based rollouts (internal -> beta -> GA)
 * - Canary releases
 * - A/B test traffic allocation
 *
 * Uses consistent hashing to ensure users always get the same experience.
 *
 * @module flags/advanced/percentage-rollout
 *
 * @example
 * ```typescript
 * const engine = new PercentageRolloutEngine();
 *
 * const rollout: PercentageRollout = {
 *   strategy: 'percentage',
 *   percentage: 25,
 *   sticky: true,
 * };
 *
 * const result = engine.evaluate(rollout, context, 'feature-key', variants);
 * if (result.included) {
 *   console.log('User is in the rollout');
 * }
 * ```
 */

import type {
  RolloutConfig,
  PercentageRollout,
  ScheduledRollout,
  RingRollout,
  CanaryRollout,
  ExperimentRollout,
  EvaluationContext,
  Variant,
  VariantId,
  SegmentId,
  RolloutStage,
} from './types';

// ============================================================================
// Types
// ============================================================================

/**
 * Result of rollout evaluation.
 */
export interface RolloutResult {
  /** Whether the user is included in the rollout */
  readonly included: boolean;
  /** The variant to serve */
  readonly variantId?: VariantId;
  /** The percentage bucket the user falls into */
  readonly bucket?: number;
  /** Current rollout percentage */
  readonly percentage?: number;
  /** Current stage (for staged rollouts) */
  readonly stage?: string;
  /** Current ring (for ring rollouts) */
  readonly ring?: string;
  /** Whether user is in canary group */
  readonly isCanary?: boolean;
  /** Experiment details */
  readonly experiment?: {
    readonly experimentId: string;
    readonly allocationPercentage: number;
  };
}

/**
 * Hash function type for consistent user bucketing.
 */
export type HashFunction = (key: string, salt?: string) => number;

// ============================================================================
// Default Hash Function
// ============================================================================

/**
 * Default hash function using a simple but effective algorithm.
 * Returns a value between 0 and 100.
 */
function defaultHashFunction(key: string, salt: string = ''): number {
  const input = key + salt;
  let hash = 0;

  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }

  // Convert to positive number and normalize to 0-100
  return Math.abs(hash % 10000) / 100;
}

// ============================================================================
// Percentage Rollout Engine
// ============================================================================

/**
 * Engine for evaluating percentage-based rollouts.
 */
export class PercentageRolloutEngine {
  private readonly hashFunction: HashFunction;
  private stickyBuckets = new Map<string, number>();

  constructor(hashFunction?: HashFunction) {
    this.hashFunction = hashFunction ?? defaultHashFunction;
  }

  /**
   * Evaluate a rollout configuration.
   */
  evaluate(
    rollout: RolloutConfig,
    context: EvaluationContext,
    flagKey: string,
    variants: readonly Variant[]
  ): RolloutResult {
    switch (rollout.strategy) {
      case 'percentage':
        return this.evaluatePercentage(rollout, context, flagKey, variants);
      case 'scheduled':
        return this.evaluateScheduled(rollout, context, flagKey, variants);
      case 'ring':
        return this.evaluateRing(rollout, context, flagKey, variants);
      case 'canary':
        return this.evaluateCanary(rollout, context, flagKey, variants);
      case 'experiment':
        return this.evaluateExperiment(rollout, context, flagKey, variants);
      default:
        return { included: false };
    }
  }

  // ==========================================================================
  // Percentage Rollout
  // ==========================================================================

  /**
   * Set a sticky bucket for a user/flag combination.
   */
  setStickyBucket(flagKey: string, hashKey: string, bucket: number): void {
    this.stickyBuckets.set(`${flagKey}:${hashKey}`, bucket);
  }

  // ==========================================================================
  // Scheduled Rollout
  // ==========================================================================

  /**
   * Clear sticky buckets.
   */
  clearStickyBuckets(): void {
    this.stickyBuckets.clear();
  }

  /**
   * Get the bucket for a user/flag combination.
   */
  getBucket(flagKey: string, hashKey: string, salt?: string): number {
    return this.hashFunction(`${flagKey}:${hashKey}`, salt ?? 'default');
  }

  // ==========================================================================
  // Ring Rollout
  // ==========================================================================

  private evaluatePercentage(
    rollout: PercentageRollout,
    context: EvaluationContext,
    flagKey: string,
    variants: readonly Variant[]
  ): RolloutResult {
    const hashKey = rollout.hashKey ?? this.getDefaultHashKey(context);
    if (hashKey == null || hashKey === '') {
      return { included: false, percentage: rollout.percentage };
    }

    let bucket: number;

    // Check for sticky bucket
    if (rollout.sticky === true) {
      const stickyKey = `${flagKey}:${hashKey}`;
      const existingBucket = this.stickyBuckets.get(stickyKey);
      if (existingBucket != null) {
        bucket = existingBucket;
      } else {
        bucket = this.hashFunction(
          `${flagKey}:${hashKey}`,
          rollout.salt ?? 'default'
        );
        this.stickyBuckets.set(stickyKey, bucket);
      }
    } else {
      bucket = this.hashFunction(
        `${flagKey}:${hashKey}`,
        rollout.salt ?? 'default'
      );
    }

    const included = bucket < rollout.percentage;

    return {
      included,
      variantId: included ? this.selectVariant(bucket, variants) : undefined,
      bucket,
      percentage: rollout.percentage,
    };
  }

  private evaluateScheduled(
    rollout: ScheduledRollout,
    context: EvaluationContext,
    flagKey: string,
    variants: readonly Variant[]
  ): RolloutResult {
    const now = context.timestamp ?? new Date();
    const currentStage = this.getCurrentStage(rollout.stages, now);

    if (!currentStage) {
      return { included: false };
    }

    const hashKey = this.getDefaultHashKey(context);
    if (hashKey == null || hashKey === '') {
      return { included: false, stage: currentStage.name };
    }

    const bucket = this.hashFunction(`${flagKey}:${hashKey}`, 'scheduled');
    const included = bucket < currentStage.percentage;

    return {
      included,
      variantId: included ? this.selectVariant(bucket, variants) : undefined,
      bucket,
      percentage: currentStage.percentage,
      stage: currentStage.name,
    };
  }

  private getCurrentStage(
    stages: readonly RolloutStage[],
    now: Date
  ): RolloutStage | null {
    let currentStage: RolloutStage | null = null;

    for (const stage of stages) {
      if (stage.startTime <= now) {
        currentStage = stage;
      } else {
        break;
      }
    }

    return currentStage;
  }

  // ==========================================================================
  // Canary Rollout
  // ==========================================================================

  private evaluateRing(
    rollout: RingRollout,
    context: EvaluationContext,
    flagKey: string,
    variants: readonly Variant[]
  ): RolloutResult {
    const userId = context.user?.id;
    if (userId == null || userId === '') {
      return { included: false };
    }

    // Find which ring the user belongs to
    for (const ring of rollout.rings) {
      if (ring.priority > this.getRingPriority(rollout.currentRing, rollout.rings)) {
        continue; // Skip rings that haven't been reached yet
      }

      // Check if user is in any of the ring's segments
      // Note: Segment matching is done externally, here we just check inclusion
      for (const _ of ring.segments) {
        // In a real implementation, this would check segment membership
        // For now, we'll use a hash-based approach

        // Ring-based bucketing
        if (this.isInRing(ring.id, rollout.currentRing, rollout.rings)) {
          const bucket = this.hashFunction(`${flagKey}:${userId}`, 'ring');
          return {
            included: true,
            variantId: this.selectVariant(bucket, variants),
            bucket,
            ring: ring.name,
          };
        }
      }
    }

    return { included: false, ring: rollout.currentRing };
  }

  // ==========================================================================
  // Experiment Rollout
  // ==========================================================================

  private getRingPriority(
    ringId: string,
    rings: readonly { id: string; priority: number }[]
  ): number {
    const ring = rings.find((r) => r.id === ringId);
    return ring?.priority ?? Infinity;
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private isInRing(
    ringId: string,
    currentRing: string,
    rings: readonly { id: string; priority: number }[]
  ): boolean {
    const ringPriority = this.getRingPriority(ringId, rings);
    const currentPriority = this.getRingPriority(currentRing, rings);
    return ringPriority <= currentPriority;
  }

  private evaluateCanary(
    rollout: CanaryRollout,
    context: EvaluationContext,
    flagKey: string,
    variants: readonly Variant[]
  ): RolloutResult {
    const hashKey = this.getDefaultHashKey(context);
    if (hashKey == null || hashKey === '') {
      return { included: false };
    }

    // Check if user is in canary segment
    if (rollout.canarySegment != null && rollout.canarySegment !== '') {
      // Segment check would be done externally
      // Here we use hash-based bucketing
    }

    const bucket = this.hashFunction(`${flagKey}:${hashKey}`, 'canary');
    const isCanary = bucket < rollout.canaryPercentage;

    return {
      included: isCanary,
      variantId: isCanary ? this.selectVariant(bucket, variants) : undefined,
      bucket,
      percentage: rollout.canaryPercentage,
      isCanary,
    };
  }

  private evaluateExperiment(
    rollout: ExperimentRollout,
    context: EvaluationContext,
    flagKey: string,
    _variants: readonly Variant[]
  ): RolloutResult {
    // Check if experiment has ended
    if (rollout.endDate && new Date() > rollout.endDate) {
      return { included: false };
    }

    const hashKey = this.getDefaultHashKey(context);
    if (hashKey == null || hashKey === '') {
      return { included: false };
    }

    const bucket = this.hashFunction(`${flagKey}:${hashKey}`, rollout.experimentId);

    // Allocate to variants based on percentage allocation
    let cumulativePercentage = 0;
    for (const allocation of rollout.allocation) {
      cumulativePercentage += allocation.percentage;
      if (bucket < cumulativePercentage) {
        // const variant = variants.find((v) => v.id === allocation.variantId);
        return {
          included: true,
          variantId: allocation.variantId,
          bucket,
          percentage: allocation.percentage,
          experiment: {
            experimentId: rollout.experimentId,
            allocationPercentage: allocation.percentage,
          },
        };
      }
    }

    // User not allocated to any variant
    return {
      included: false,
      bucket,
      experiment: {
        experimentId: rollout.experimentId,
        allocationPercentage: 0,
      },
    };
  }

  private getDefaultHashKey(context: EvaluationContext): string | null {
    return (
      context.user?.id ??
      context.session?.sessionId ??
      null
    );
  }

  private selectVariant(
    _bucket: number,
    variants: readonly Variant[]
  ): VariantId {
    // Find the first non-control variant, or use the first variant
    const nonControl = variants.find((v) => v.isControl !== true);
    return nonControl?.id ?? variants[0]?.id ?? 'default';
  }
}

// ============================================================================
// Rollout Builder
// ============================================================================

/**
 * Builder for creating rollout configurations.
 */
export class RolloutBuilder {
  /**
   * Create a simple percentage rollout.
   */
  static percentage(
    percentage: number,
    options?: Partial<Omit<PercentageRollout, 'strategy' | 'percentage'>>
  ): PercentageRollout {
    return {
      strategy: 'percentage',
      percentage: Math.max(0, Math.min(100, percentage)),
      sticky: options?.sticky ?? true,
      hashKey: options?.hashKey,
      salt: options?.salt,
    };
  }

  /**
   * Create a scheduled rollout.
   */
  static scheduled(
    stages: RolloutStage[],
    options?: { autoAdvance?: boolean }
  ): ScheduledRollout {
    return {
      strategy: 'scheduled',
      stages,
      currentStage: 0,
      autoAdvance: options?.autoAdvance ?? false,
    };
  }

  /**
   * Create rollout stages for scheduled rollout.
   */
  static stages(): RolloutStageBuilder {
    return new RolloutStageBuilder();
  }

  /**
   * Create a ring-based rollout.
   */
  static ring(
    rings: Array<{
      id: string;
      name: string;
      segments: SegmentId[];
      priority: number;
    }>,
    currentRing: string
  ): RingRollout {
    return {
      strategy: 'ring',
      rings,
      currentRing,
    };
  }

  /**
   * Create a canary rollout.
   */
  static canary(
    canaryPercentage: number,
    options?: {
      canarySegment?: SegmentId;
      autoRollback?: boolean;
    }
  ): CanaryRollout {
    return {
      strategy: 'canary',
      canaryPercentage,
      canarySegment: options?.canarySegment,
      criteria: {
        maxErrorRate: 0.01, // 1% error rate threshold
        minSampleSize: 100,
      },
      autoRollback: options?.autoRollback ?? true,
    };
  }

  /**
   * Create an experiment rollout.
   */
  static experiment(
    experimentId: string,
    allocation: Array<{ variantId: VariantId; percentage: number }>,
    options?: {
      primaryMetric: string;
      endDate?: Date;
    }
  ): ExperimentRollout {
    return {
      strategy: 'experiment',
      experimentId,
      allocation,
      primaryMetric: options?.primaryMetric ?? 'conversion',
      endDate: options?.endDate,
    };
  }
}

/**
 * Builder for rollout stages.
 */
class RolloutStageBuilder {
  private stages: RolloutStage[] = [];

  /**
   * Add a stage.
   */
  stage(
    name: string,
    percentage: number,
    startTime: Date,
    options?: { minDuration?: number }
  ): this {
    this.stages.push({
      name,
      percentage,
      startTime,
      minDuration: options?.minDuration,
    });
    return this;
  }

  /**
   * Add an internal stage (e.g., employees only).
   */
  internal(startTime: Date): this {
    return this.stage('internal', 0, startTime);
  }

  /**
   * Add a beta stage.
   */
  beta(percentage: number, startTime: Date): this {
    return this.stage('beta', percentage, startTime);
  }

  /**
   * Add a GA (general availability) stage.
   */
  ga(startTime: Date): this {
    return this.stage('ga', 100, startTime);
  }

  /**
   * Build the stages.
   */
  build(): RolloutStage[] {
    return [...this.stages].sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime()
    );
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate what percentage of users would be affected by a rollout change.
 */
export function calculateRolloutImpact(
  currentPercentage: number,
  newPercentage: number
): {
  added: number;
  removed: number;
  unchanged: number;
} {
  if (newPercentage > currentPercentage) {
    return {
      added: newPercentage - currentPercentage,
      removed: 0,
      unchanged: currentPercentage,
    };
  } else {
    return {
      added: 0,
      removed: currentPercentage - newPercentage,
      unchanged: newPercentage,
    };
  }
}

/**
 * Generate a suggested rollout schedule.
 */
export function generateRolloutSchedule(
  startDate: Date,
  targetPercentage: number = 100,
  durationDays: number = 7
): RolloutStage[] {
  const stages: RolloutStage[] = [];
  const percentages = [1, 5, 10, 25, 50, 75, targetPercentage];
  const msPerDay = 24 * 60 * 60 * 1000;

  let currentDate = new Date(startDate);
  const interval = durationDays / percentages.length;

  for (const percentage of percentages) {
    if (percentage > targetPercentage) break;

    stages.push({
      name: `${percentage}%`,
      percentage,
      startTime: new Date(currentDate),
      minDuration: interval * msPerDay,
    });

    currentDate = new Date(currentDate.getTime() + interval * msPerDay);
  }

  return stages;
}
