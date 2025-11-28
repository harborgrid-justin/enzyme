/**
 * @fileoverview Feature flag lifecycle management.
 *
 * Provides comprehensive lifecycle handling:
 * - State transitions (draft -> active -> deprecated -> archived)
 * - Expiration and cleanup tracking
 * - Technical debt monitoring
 * - Audit logging
 * - Review reminders
 *
 * @module flags/advanced/flag-lifecycle
 *
 * @example
 * ```typescript
 * const manager = new LifecycleManager();
 *
 * // Activate a flag
 * const lifecycle = manager.activate(flag.lifecycle, 'user@example.com');
 *
 * // Check for stale flags
 * const staleFlags = manager.getStaleFlags(flags, 30);
 *
 * // Generate cleanup report
 * const report = manager.generateCleanupReport(flags);
 * ```
 */

import type {
  FlagLifecycle,
  FlagLifecycleState,
  FeatureFlag,
  FlagId,
} from './types';

// ============================================================================
// Types
// ============================================================================

/**
 * Options for state transitions.
 */
export interface TransitionOptions {
  /** User making the change */
  readonly user: string;
  /** Reason for transition */
  readonly reason?: string;
  /** Scheduled date for next transition */
  readonly scheduledDate?: Date;
}

/**
 * Lifecycle event.
 */
export interface LifecycleEvent {
  readonly type: 'created' | 'activated' | 'paused' | 'deprecated' | 'archived';
  readonly flagId: FlagId;
  readonly previousState?: FlagLifecycleState;
  readonly newState: FlagLifecycleState;
  readonly timestamp: Date;
  readonly user: string;
  readonly reason?: string;
}

/**
 * Cleanup report for technical debt management.
 */
export interface CleanupReport {
  /** Flags that are overdue for review */
  readonly overdueForReview: FlagId[];
  /** Flags that are deprecated and should be removed */
  readonly readyForRemoval: FlagId[];
  /** Flags that have been enabled for everyone (100% rollout) */
  readonly fullyRolledOut: FlagId[];
  /** Flags with no activity in specified period */
  readonly dormant: FlagId[];
  /** Flags approaching their deprecation date */
  readonly approachingDeprecation: FlagId[];
  /** Total technical debt score */
  readonly technicalDebtScore: number;
  /** Recommendations */
  readonly recommendations: CleanupRecommendation[];
}

/**
 * A cleanup recommendation.
 */
export interface CleanupRecommendation {
  readonly flagId: FlagId;
  readonly action: 'remove' | 'review' | 'deprecate' | 'archive';
  readonly reason: string;
  readonly priority: 'high' | 'medium' | 'low';
  readonly estimatedEffort: 'minimal' | 'moderate' | 'significant';
}

/**
 * Flag health status.
 */
export interface FlagHealth {
  readonly flagId: FlagId;
  readonly state: FlagLifecycleState;
  readonly ageInDays: number;
  readonly isOverdueForReview: boolean;
  readonly isApproachingDeprecation: boolean;
  readonly isStale: boolean;
  readonly lastActivityDaysAgo?: number;
  readonly healthScore: number; // 0-100
  readonly issues: string[];
}

// ============================================================================
// State Transition Rules
// ============================================================================

/**
 * Valid state transitions.
 */
const VALID_TRANSITIONS: Record<FlagLifecycleState, FlagLifecycleState[]> = {
  draft: ['active', 'archived'],
  active: ['paused', 'deprecated'],
  paused: ['active', 'deprecated', 'archived'],
  deprecated: ['archived'],
  archived: [], // Terminal state
};

/**
 * Check if a state transition is valid.
 */
export function isValidTransition(
  from: FlagLifecycleState,
  to: FlagLifecycleState
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ============================================================================
// Lifecycle Manager
// ============================================================================

/**
 * Manager for feature flag lifecycle operations.
 */
export class LifecycleManager {
  private eventListeners: Array<(event: LifecycleEvent) => void> = [];
  private activityLog = new Map<FlagId, Date>();

  /**
   * Create initial lifecycle metadata.
   */
  createLifecycle(createdBy: string, options?: {
    ticketId?: string;
    documentationUrl?: string;
    owner?: string;
    reviewDate?: Date;
  }): FlagLifecycle {
    const now = new Date();
    return {
      state: 'draft',
      createdAt: now,
      createdBy,
      updatedAt: now,
      updatedBy: createdBy,
      ticketId: options?.ticketId,
      documentationUrl: options?.documentationUrl,
      owner: options?.owner,
      reviewDate: options?.reviewDate ?? this.getDefaultReviewDate(now),
    };
  }

  /**
   * Activate a flag.
   */
  activate(
    lifecycle: FlagLifecycle,
    user: string,
    reason?: string
  ): FlagLifecycle {
    this.validateTransition(lifecycle.state, 'active');

    const updated: FlagLifecycle = {
      ...lifecycle,
      state: 'active',
      updatedAt: new Date(),
      updatedBy: user,
      activatedAt: new Date(),
    };

    this.emitEvent({
      type: 'activated',
      flagId: '',
      previousState: lifecycle.state,
      newState: 'active',
      timestamp: new Date(),
      user,
      reason,
    });

    return updated;
  }

  /**
   * Pause a flag (temporarily disable).
   */
  pause(
    lifecycle: FlagLifecycle,
    user: string,
    _reason?: string
  ): FlagLifecycle {
    this.validateTransition(lifecycle.state, 'paused');

    return {
      ...lifecycle,
      state: 'paused',
      updatedAt: new Date(),
      updatedBy: user,
    };
  }

  /**
   * Deprecate a flag.
   */
  deprecate(
    lifecycle: FlagLifecycle,
    user: string,
    options?: {
      deprecationDate?: Date;
      removalDate?: Date;
      reason?: string;
    }
  ): FlagLifecycle {
    this.validateTransition(lifecycle.state, 'deprecated');

    const now = new Date();
    return {
      ...lifecycle,
      state: 'deprecated',
      updatedAt: now,
      updatedBy: user,
      deprecationDate: options?.deprecationDate ?? now,
      removalDate: options?.removalDate ?? this.getDefaultRemovalDate(now),
    };
  }

  /**
   * Archive a flag.
   */
  archive(
    lifecycle: FlagLifecycle,
    user: string,
    _reason?: string
  ): FlagLifecycle {
    this.validateTransition(lifecycle.state, 'archived');

    return {
      ...lifecycle,
      state: 'archived',
      updatedAt: new Date(),
      updatedBy: user,
    };
  }

  /**
   * Update review date.
   */
  setReviewDate(
    lifecycle: FlagLifecycle,
    reviewDate: Date,
    user: string
  ): FlagLifecycle {
    return {
      ...lifecycle,
      reviewDate,
      updatedAt: new Date(),
      updatedBy: user,
    };
  }

  /**
   * Update owner.
   */
  setOwner(
    lifecycle: FlagLifecycle,
    owner: string,
    user: string
  ): FlagLifecycle {
    return {
      ...lifecycle,
      owner,
      updatedAt: new Date(),
      updatedBy: user,
    };
  }

  private validateTransition(
    from: FlagLifecycleState,
    to: FlagLifecycleState
  ): void {
    if (!isValidTransition(from, to)) {
      throw new Error(
        `Invalid state transition from '${from}' to '${to}'`
      );
    }
  }

  private getDefaultReviewDate(from: Date): Date {
    const reviewDate = new Date(from);
    reviewDate.setDate(reviewDate.getDate() + 30); // 30 days default
    return reviewDate;
  }

  private getDefaultRemovalDate(from: Date): Date {
    const removalDate = new Date(from);
    removalDate.setDate(removalDate.getDate() + 90); // 90 days default
    return removalDate;
  }

  // ==========================================================================
  // Activity Tracking
  // ==========================================================================

  /**
   * Record activity for a flag.
   */
  recordActivity(flagId: FlagId): void {
    this.activityLog.set(flagId, new Date());
  }

  /**
   * Get last activity date for a flag.
   */
  getLastActivity(flagId: FlagId): Date | undefined {
    return this.activityLog.get(flagId);
  }

  // ==========================================================================
  // Health & Analysis
  // ==========================================================================

  /**
   * Get health status for a flag.
   */
  getFlagHealth(flag: FeatureFlag): FlagHealth {
    const lifecycle = flag.lifecycle;
    const now = new Date();
    const issues: string[] = [];

    const ageInDays = Math.floor(
      (now.getTime() - lifecycle.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    const isOverdueForReview =
      lifecycle.reviewDate && lifecycle.reviewDate < now;
    const isApproachingDeprecation =
      lifecycle.deprecationDate &&
      lifecycle.deprecationDate > now &&
      lifecycle.deprecationDate.getTime() - now.getTime() <
        7 * 24 * 60 * 60 * 1000; // 7 days

    const lastActivity = this.activityLog.get(flag.id);
    const lastActivityDaysAgo = lastActivity
      ? Math.floor(
          (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
        )
      : undefined;
    const isStale = lastActivityDaysAgo !== undefined && lastActivityDaysAgo > 30;

    // Calculate health score
    let healthScore = 100;

    if (isOverdueForReview) {
      healthScore -= 20;
      issues.push('Overdue for review');
    }

    if (isStale) {
      healthScore -= 15;
      issues.push('No recent activity');
    }

    if (lifecycle.state === 'deprecated') {
      healthScore -= 10;
      issues.push('Flag is deprecated');
    }

    if (ageInDays > 180) {
      healthScore -= 10;
      issues.push('Flag is over 6 months old');
    }

    if (!lifecycle.owner) {
      healthScore -= 10;
      issues.push('No owner assigned');
    }

    if (!lifecycle.documentationUrl) {
      healthScore -= 5;
      issues.push('No documentation link');
    }

    if (!lifecycle.ticketId) {
      healthScore -= 5;
      issues.push('No ticket reference');
    }

    return {
      flagId: flag.id,
      state: lifecycle.state,
      ageInDays,
      isOverdueForReview: isOverdueForReview ?? false,
      isApproachingDeprecation: isApproachingDeprecation ?? false,
      isStale,
      lastActivityDaysAgo,
      healthScore: Math.max(0, healthScore),
      issues,
    };
  }

  /**
   * Get stale flags (no activity in specified days).
   */
  getStaleFlags(
    flags: readonly FeatureFlag[],
    staleDays: number = 30
  ): FeatureFlag[] {
    const now = new Date();
    const cutoff = new Date(now.getTime() - staleDays * 24 * 60 * 60 * 1000);

    return flags.filter((flag) => {
      const lastActivity = this.activityLog.get(flag.id);
      return (
        flag.lifecycle.state === 'active' &&
        (!lastActivity || lastActivity < cutoff)
      );
    });
  }

  /**
   * Get flags that are overdue for review.
   */
  getOverdueFlags(flags: readonly FeatureFlag[]): FeatureFlag[] {
    const now = new Date();
    return flags.filter(
      (flag) =>
        flag.lifecycle.reviewDate &&
        flag.lifecycle.reviewDate < now &&
        flag.lifecycle.state !== 'archived'
    );
  }

  /**
   * Get deprecated flags ready for removal.
   */
  getFlagsReadyForRemoval(flags: readonly FeatureFlag[]): FeatureFlag[] {
    const now = new Date();
    return flags.filter(
      (flag) =>
        flag.lifecycle.state === 'deprecated' &&
        flag.lifecycle.removalDate &&
        flag.lifecycle.removalDate < now
    );
  }

  /**
   * Generate a comprehensive cleanup report.
   */
  generateCleanupReport(flags: readonly FeatureFlag[]): CleanupReport {
    const now = new Date();
    const sevenDaysFromNow = new Date(
      now.getTime() + 7 * 24 * 60 * 60 * 1000
    );

    const overdueForReview: FlagId[] = [];
    const readyForRemoval: FlagId[] = [];
    const fullyRolledOut: FlagId[] = [];
    const dormant: FlagId[] = [];
    const approachingDeprecation: FlagId[] = [];
    const recommendations: CleanupRecommendation[] = [];

    let technicalDebtScore = 0;

    for (const flag of flags) {
      const health = this.getFlagHealth(flag);

      // Overdue for review
      if (health.isOverdueForReview) {
        overdueForReview.push(flag.id);
        technicalDebtScore += 5;
        recommendations.push({
          flagId: flag.id,
          action: 'review',
          reason: 'Flag is overdue for scheduled review',
          priority: 'medium',
          estimatedEffort: 'minimal',
        });
      }

      // Ready for removal
      if (
        flag.lifecycle.state === 'deprecated' &&
        flag.lifecycle.removalDate &&
        flag.lifecycle.removalDate < now
      ) {
        readyForRemoval.push(flag.id);
        technicalDebtScore += 10;
        recommendations.push({
          flagId: flag.id,
          action: 'remove',
          reason: 'Deprecated flag past removal date',
          priority: 'high',
          estimatedEffort: 'moderate',
        });
      }

      // Fully rolled out
      if (
        flag.rollout &&
        'percentage' in flag.rollout &&
        flag.rollout.percentage === 100
      ) {
        fullyRolledOut.push(flag.id);
        technicalDebtScore += 3;
        recommendations.push({
          flagId: flag.id,
          action: 'remove',
          reason: 'Flag is at 100% rollout - consider removing',
          priority: 'low',
          estimatedEffort: 'moderate',
        });
      }

      // Dormant
      if (health.isStale && flag.lifecycle.state === 'active') {
        dormant.push(flag.id);
        technicalDebtScore += 2;
        recommendations.push({
          flagId: flag.id,
          action: 'review',
          reason: 'No activity in over 30 days',
          priority: 'low',
          estimatedEffort: 'minimal',
        });
      }

      // Approaching deprecation
      if (
        flag.lifecycle.deprecationDate &&
        flag.lifecycle.deprecationDate > now &&
        flag.lifecycle.deprecationDate < sevenDaysFromNow
      ) {
        approachingDeprecation.push(flag.id);
        recommendations.push({
          flagId: flag.id,
          action: 'deprecate',
          reason: 'Deprecation date approaching',
          priority: 'medium',
          estimatedEffort: 'minimal',
        });
      }

      // Old active flags
      if (health.ageInDays > 180 && flag.lifecycle.state === 'active') {
        technicalDebtScore += 3;
        if (
          !recommendations.some(
            (r) => r.flagId === flag.id && r.action === 'review'
          )
        ) {
          recommendations.push({
            flagId: flag.id,
            action: 'review',
            reason: 'Flag has been active for over 6 months',
            priority: 'medium',
            estimatedEffort: 'minimal',
          });
        }
      }
    }

    // Sort recommendations by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );

    return {
      overdueForReview,
      readyForRemoval,
      fullyRolledOut,
      dormant,
      approachingDeprecation,
      technicalDebtScore,
      recommendations,
    };
  }

  // ==========================================================================
  // Event Handling
  // ==========================================================================

  /**
   * Add event listener.
   */
  addEventListener(listener: (event: LifecycleEvent) => void): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove event listener.
   */
  removeEventListener(listener: (event: LifecycleEvent) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  private emitEvent(event: LifecycleEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in lifecycle event listener:', error);
      }
    }
  }
}

// ============================================================================
// Lifecycle Builder
// ============================================================================

/**
 * Fluent builder for creating lifecycle metadata.
 */
export class LifecycleBuilder {
  private lifecycle: Partial<FlagLifecycle> = {};

  constructor(createdBy: string) {
    const now = new Date();
    this.lifecycle = {
      state: 'draft',
      createdAt: now,
      createdBy,
      updatedAt: now,
      updatedBy: createdBy,
    };
  }

  /**
   * Set ticket/issue reference.
   */
  ticket(ticketId: string): this {
    this.lifecycle.ticketId = ticketId;
    return this;
  }

  /**
   * Set documentation URL.
   */
  documentation(url: string): this {
    this.lifecycle.documentationUrl = url;
    return this;
  }

  /**
   * Set owner.
   */
  owner(owner: string): this {
    this.lifecycle.owner = owner;
    return this;
  }

  /**
   * Set review date.
   */
  reviewDate(date: Date): this {
    this.lifecycle.reviewDate = date;
    return this;
  }

  /**
   * Set deprecation date.
   */
  deprecationDate(date: Date): this {
    this.lifecycle.deprecationDate = date;
    return this;
  }

  /**
   * Set removal date.
   */
  removalDate(date: Date): this {
    this.lifecycle.removalDate = date;
    return this;
  }

  /**
   * Build the lifecycle metadata.
   */
  build(): FlagLifecycle {
    return {
      state: this.lifecycle.state ?? 'draft',
      createdAt: this.lifecycle.createdAt ?? new Date(),
      createdBy: this.lifecycle.createdBy ?? 'unknown',
      updatedAt: this.lifecycle.updatedAt ?? new Date(),
      updatedBy: this.lifecycle.updatedBy ?? 'unknown',
      ticketId: this.lifecycle.ticketId,
      documentationUrl: this.lifecycle.documentationUrl,
      owner: this.lifecycle.owner,
      reviewDate: this.lifecycle.reviewDate,
      deprecationDate: this.lifecycle.deprecationDate,
      removalDate: this.lifecycle.removalDate,
    };
  }
}

/**
 * Create a lifecycle builder.
 */
export function createLifecycle(createdBy: string): LifecycleBuilder {
  return new LifecycleBuilder(createdBy);
}

// ============================================================================
// Singleton Instance
// ============================================================================

let instance: LifecycleManager | null = null;

/**
 * Get the singleton lifecycle manager instance.
 */
export function getLifecycleManager(): LifecycleManager {
  if (!instance) {
    instance = new LifecycleManager();
  }
  return instance;
}

/**
 * Reset the singleton instance.
 */
export function resetLifecycleManager(): void {
  instance = null;
}
