/**
 * Percentage Rollout Engine
 *
 * Main engine for evaluating percentage-based rollouts across different strategies.
 *
 * @module flags/advanced/rollout-engine
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
  RolloutStage,
} from './types';
import type { HashFunction } from './hash-function';
import { defaultHashFunction } from './hash-function';

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
    if (hashKey === null || hashKey === undefined || hashKey === '') {
      return { included: false, percentage: rollout.percentage };
    }

    let bucket: number;

    // Check for sticky bucket
    if (rollout.sticky === true) {
      const stickyKey = `${flagKey}:${hashKey}`;
      const cachedBucket = this.stickyBuckets.get(stickyKey);
      if (cachedBucket !== undefined) {
        bucket = cachedBucket;
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
    if (hashKey === null || hashKey === undefined || hashKey === '') {
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
    if (userId === undefined || userId === null || userId === '') {
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
    if (hashKey === null || hashKey === undefined || hashKey === '') {
      return { included: false };
    }

    // Check if user is in canary segment
    if (rollout.canarySegment !== undefined && rollout.canarySegment !== null && rollout.canarySegment !== '') {
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
    if (rollout.endDate !== undefined && rollout.endDate !== null && new Date() > rollout.endDate) {
      return { included: false };
    }

    const hashKey = this.getDefaultHashKey(context);
    if (hashKey === null || hashKey === undefined || hashKey === '') {
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
    const firstVariantId = variants[0]?.id;
    return nonControl?.id ?? firstVariantId ?? 'default';
  }
}