/**
 * Rollout Builder
 *
 * Builder classes for creating rollout configurations.
 *
 * @module flags/advanced/rollout-builder
 */

import type {
  PercentageRollout,
  ScheduledRollout,
  RingRollout,
  CanaryRollout,
  ExperimentRollout,
  RolloutStage,
  VariantId,
  SegmentId,
} from './types';

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
  static scheduled(stages: RolloutStage[], options?: { autoAdvance?: boolean }): ScheduledRollout {
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
export class RolloutStageBuilder {
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
    return [...this.stages].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }
}
