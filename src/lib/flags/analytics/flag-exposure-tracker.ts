/**
 * @fileoverview Feature flag exposure tracking for experiments and A/B tests.
 *
 * Provides comprehensive exposure tracking:
 * - User exposure recording
 * - Deduplication
 * - Cohort assignment
 * - Experiment integration
 *
 * @module flags/analytics/flag-exposure-tracker
 *
 * @example
 * ```typescript
 * const tracker = new ExposureTracker({
 *   deduplicationWindow: 24 * 60 * 60 * 1000, // 24 hours
 *   onExposure: (exposure) => analytics.track('flag_exposure', exposure),
 * });
 *
 * // Track exposure
 * tracker.trackExposure({
 *   flagKey: 'new-checkout',
 *   variantId: 'variant-b',
 *   userId: 'user-123',
 * });
 *
 * // Get exposure data
 * const exposures = tracker.getExposures('user-123');
 * ```
 */

import type {
  // FlagId,
  VariantId,
  UserId,
  EvaluationReason,
  JsonValue,
} from '../advanced/types';
// import type { Mutable } from '../../utils/types';

// ============================================================================
// Types
// ============================================================================

/**
 * Exposure event data.
 */
export interface ExposureEvent {
  /** Flag key */
  readonly flagKey: string;
  /** Assigned variant */
  readonly variantId: VariantId;
  /** User ID */
  readonly userId: UserId;
  /** Session ID */
  readonly sessionId?: string;
  /** Experiment ID if part of experiment */
  readonly experimentId?: string;
  /** Cohort assignment */
  readonly cohort?: string;
  /** Evaluation reason */
  readonly reason?: EvaluationReason;
  /** Whether this is first exposure */
  readonly isFirstExposure: boolean;
  /** Timestamp */
  readonly timestamp: Date;
  /** Page/screen where exposure occurred */
  readonly page?: string;
  /** Additional properties */
  readonly properties?: Record<string, JsonValue>;
}

/**
 * Stored exposure record.
 */
export interface ExposureRecord {
  /** Flag key */
  readonly flagKey: string;
  /** Variant ID */
  readonly variantId: VariantId;
  /** First exposure timestamp */
  readonly firstExposedAt: Date;
  /** Last exposure timestamp */
  readonly lastExposedAt: Date;
  /** Total exposure count */
  readonly exposureCount: number;
  /** Experiment ID */
  readonly experimentId?: string;
  /** Cohort */
  readonly cohort?: string;
}

/**
 * User exposure summary.
 */
export interface UserExposureSummary {
  /** User ID */
  readonly userId: UserId;
  /** Total flags exposed to */
  readonly flagCount: number;
  /** Total exposure events */
  readonly totalExposures: number;
  /** Experiments participating in */
  readonly experiments: string[];
  /** Flag exposures */
  readonly exposures: ExposureRecord[];
  /** First activity */
  readonly firstSeenAt: Date;
  /** Last activity */
  readonly lastSeenAt: Date;
}

/**
 * Exposure tracker configuration.
 */
export interface ExposureTrackerConfig {
  /** Enable tracking */
  readonly enabled?: boolean;
  /** Deduplication window in ms (default: 24h) */
  readonly deduplicationWindow?: number;
  /** Storage key prefix */
  readonly storagePrefix?: string;
  /** Use persistent storage */
  readonly persistent?: boolean;
  /** Callback on exposure */
  readonly onExposure?: (exposure: ExposureEvent) => void;
  /** Batch exposures before callback */
  readonly batchSize?: number;
  /** Batch flush interval */
  readonly flushInterval?: number;
  /** Enable debug logging */
  readonly debug?: boolean;
  /** Maximum stored exposures per user */
  readonly maxExposuresPerUser?: number;
}

/**
 * Input for tracking exposure.
 */
export interface TrackExposureInput {
  /** Flag key */
  readonly flagKey: string;
  /** Variant ID */
  readonly variantId: VariantId;
  /** User ID */
  readonly userId: UserId;
  /** Session ID */
  readonly sessionId?: string;
  /** Experiment ID */
  readonly experimentId?: string;
  /** Cohort */
  readonly cohort?: string;
  /** Evaluation reason */
  readonly reason?: EvaluationReason;
  /** Current page/screen */
  readonly page?: string;
  /** Additional properties */
  readonly properties?: Record<string, JsonValue>;
}

// ============================================================================
// Exposure Tracker
// ============================================================================

/**
 * Tracks feature flag exposures for analytics and experiments.
 */
export class ExposureTracker {
  private config: Required<ExposureTrackerConfig>;
  private userExposures = new Map<UserId, Map<string, ExposureRecord>>();
  private pendingExposures: ExposureEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<(exposure: ExposureEvent) => void>();

  constructor(config: ExposureTrackerConfig = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      deduplicationWindow: config.deduplicationWindow ?? 24 * 60 * 60 * 1000,
      storagePrefix: config.storagePrefix ?? 'flag_exposure_',
      persistent: config.persistent ?? true,
      onExposure: config.onExposure ?? (() => {}),
      batchSize: config.batchSize ?? 10,
      flushInterval: config.flushInterval ?? 5000,
      debug: config.debug ?? false,
      maxExposuresPerUser: config.maxExposuresPerUser ?? 100,
    };

    this.loadFromStorage();
    this.startFlushTimer();
  }

  // ==========================================================================
  // Exposure Tracking
  // ==========================================================================

  /**
   * Track a flag exposure.
   */
  trackExposure(input: TrackExposureInput): ExposureEvent | null {
    if (!this.config.enabled) {
      return null;
    }

    const { flagKey, variantId, userId, experimentId, cohort } = input;
    const exposureKey = this.getExposureKey(flagKey, experimentId);
    const now = new Date();

    // Get or create user exposures
    if (!this.userExposures.has(userId)) {
      this.userExposures.set(userId, new Map());
    }
    const userMap = this.userExposures.get(userId);

    // Check for existing exposure
    const existing = userMap.get(exposureKey);
    const isFirstExposure = !existing;
    const isDuplicate = this.isDuplicateExposure(existing, now);

    // Update or create exposure record
    const record: ExposureRecord = existing
      ? {
          ...existing,
          lastExposedAt: now,
          exposureCount: existing.exposureCount + 1,
        }
      : {
          flagKey,
          variantId,
          firstExposedAt: now,
          lastExposedAt: now,
          exposureCount: 1,
          experimentId,
          cohort,
        };

    userMap.set(exposureKey, record);
    this.enforceMaxExposures(userId);

    // Only emit event if not a duplicate within window
    if (isDuplicate) {
      this.log(`Duplicate exposure suppressed: ${flagKey} for ${userId}`);
      return null;
    }

    const exposure: ExposureEvent = {
      flagKey,
      variantId,
      userId,
      sessionId: input.sessionId,
      experimentId,
      cohort,
      reason: input.reason,
      isFirstExposure,
      timestamp: now,
      page: input.page,
      properties: input.properties,
    };

    this.pendingExposures.push(exposure);
    this.notifyListeners(exposure);
    this.saveToStorage();

    // Flush if batch size reached
    if (this.pendingExposures.length >= this.config.batchSize) {
      void this.flush();
    }

    this.log(`Tracked exposure: ${flagKey}/${variantId} for ${userId}`);
    return exposure;
  }

  /**
   * Track multiple exposures at once.
   */
  trackExposures(inputs: TrackExposureInput[]): ExposureEvent[] {
    const events: ExposureEvent[] = [];
    for (const input of inputs) {
      const event = this.trackExposure(input);
      if (event) {
        events.push(event);
      }
    }
    return events;
  }

  private isDuplicateExposure(
    existing: ExposureRecord | undefined,
    now: Date
  ): boolean {
    if (!existing) {
      return false;
    }

    const timeSinceLastExposure =
      now.getTime() - existing.lastExposedAt.getTime();
    return timeSinceLastExposure < this.config.deduplicationWindow;
  }

  private getExposureKey(flagKey: string, experimentId?: string): string {
    return experimentId ? `${flagKey}:${experimentId}` : flagKey;
  }

  private enforceMaxExposures(userId: UserId): void {
    const userMap = this.userExposures.get(userId);
    if (!userMap) {
      return;
    }

    if (userMap.size > this.config.maxExposuresPerUser) {
      // Remove oldest exposures
      const entries = Array.from(userMap.entries()).sort(
        (a, b) => a[1].lastExposedAt.getTime() - b[1].lastExposedAt.getTime()
      );

      const toRemove = entries.slice(
        0,
        userMap.size - this.config.maxExposuresPerUser
      );
      for (const [key] of toRemove) {
        userMap.delete(key);
      }
    }
  }

  // ==========================================================================
  // Exposure Queries
  // ==========================================================================

  /**
   * Get exposure record for a user and flag.
   */
  getExposure(userId: UserId, flagKey: string, experimentId?: string): ExposureRecord | null {
    const userMap = this.userExposures.get(userId);
    if (!userMap) {
      return null;
    }

    const key = this.getExposureKey(flagKey, experimentId);
    return userMap.get(key) ?? null;
  }

  /**
   * Get all exposures for a user.
   */
  getExposures(userId: UserId): ExposureRecord[] {
    const userMap = this.userExposures.get(userId);
    if (!userMap) {
      return [];
    }
    return Array.from(userMap.values());
  }

  /**
   * Get user exposure summary.
   */
  getUserSummary(userId: UserId): UserExposureSummary | null {
    const userMap = this.userExposures.get(userId);
    if (!userMap || userMap.size === 0) {
      return null;
    }

    const exposures = Array.from(userMap.values());
    const experiments = new Set<string>();
    let totalExposures = 0;
    let firstSeenAt = new Date();
    let lastSeenAt = new Date(0);

    for (const exposure of exposures) {
      totalExposures += exposure.exposureCount;

      if (exposure.experimentId) {
        experiments.add(exposure.experimentId);
      }

      if (exposure.firstExposedAt < firstSeenAt) {
        firstSeenAt = exposure.firstExposedAt;
      }

      if (exposure.lastExposedAt > lastSeenAt) {
        lastSeenAt = exposure.lastExposedAt;
      }
    }

    return {
      userId,
      flagCount: exposures.length,
      totalExposures,
      experiments: Array.from(experiments),
      exposures,
      firstSeenAt,
      lastSeenAt,
    };
  }

  /**
   * Check if user was exposed to a flag.
   */
  wasExposed(userId: UserId, flagKey: string, experimentId?: string): boolean {
    return this.getExposure(userId, flagKey, experimentId) !== null;
  }

  /**
   * Get the variant a user was exposed to.
   */
  getExposedVariant(userId: UserId, flagKey: string, experimentId?: string): VariantId | null {
    const exposure = this.getExposure(userId, flagKey, experimentId);
    return exposure?.variantId ?? null;
  }

  /**
   * Get all users exposed to a flag.
   */
  getExposedUsers(flagKey: string, experimentId?: string): UserId[] {
    const users: UserId[] = [];
    const key = this.getExposureKey(flagKey, experimentId);

    for (const [userId, userMap] of this.userExposures.entries()) {
      if (userMap.has(key)) {
        users.push(userId);
      }
    }

    return users;
  }

  /**
   * Get exposure counts by variant.
   */
  getVariantExposures(flagKey: string, experimentId?: string): Record<VariantId, number> {
    const counts: Record<VariantId, number> = {};
    const key = this.getExposureKey(flagKey, experimentId);

    for (const userMap of this.userExposures.values()) {
      const exposure = userMap.get(key);
      if (exposure) {
        counts[exposure.variantId] = (counts[exposure.variantId] ?? 0) + 1;
      }
    }

    return counts;
  }

  // ==========================================================================
  // Experiment Support
  // ==========================================================================

  /**
   * Get all users in an experiment.
   */
  getExperimentUsers(experimentId: string): UserId[] {
    const users: UserId[] = [];

    for (const [userId, userMap] of this.userExposures.entries()) {
      for (const exposure of userMap.values()) {
        if (exposure.experimentId === experimentId) {
          users.push(userId);
          break;
        }
      }
    }

    return users;
  }

  /**
   * Get experiment cohort assignments.
   */
  getExperimentCohorts(experimentId: string): Record<string, UserId[]> {
    const cohorts: Record<string, UserId[]> = {};

    for (const [userId, userMap] of this.userExposures.entries()) {
      for (const exposure of userMap.values()) {
        if (exposure.experimentId === experimentId && exposure.cohort) {
          if (!cohorts[exposure.cohort]) {
            cohorts[exposure.cohort] = [];
          }
          cohorts[exposure.cohort]?.push(userId);
        }
      }
    }

    return cohorts;
  }

  /**
   * Get variant distribution for an experiment.
   */
  getExperimentDistribution(experimentId: string): Record<VariantId, number> {
    const distribution: Record<VariantId, number> = {};

    for (const userMap of this.userExposures.values()) {
      for (const exposure of userMap.values()) {
        if (exposure.experimentId === experimentId) {
          distribution[exposure.variantId] =
            (distribution[exposure.variantId] ?? 0) + 1;
        }
      }
    }

    return distribution;
  }

  // ==========================================================================
  // Subscriptions
  // ==========================================================================

  /**
   * Subscribe to exposure events.
   */
  subscribe(listener: (exposure: ExposureEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(exposure: ExposureEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(exposure);
      } catch (error) {
        this.log('Error in exposure listener:', error);
      }
    }
  }

  // ==========================================================================
  // Flushing
  // ==========================================================================

  /**
   * Flush pending exposures.
   */
  async flush(): Promise<void> {
    if (this.pendingExposures.length === 0) {
      return;
    }

    const exposures = [...this.pendingExposures];
    this.pendingExposures = [];

    try {
      for (const exposure of exposures) {
        await this.config.onExposure(exposure);
      }
      this.log(`Flushed ${exposures.length} exposures`);
    } catch (error) {
      // Put exposures back on failure
      this.pendingExposures = [...exposures, ...this.pendingExposures];
      this.log('Error flushing exposures:', error);
    }
  }

  private startFlushTimer(): void {
    if (this.flushTimer) {
      return;
    }

    this.flushTimer = setInterval(() => {
      void this.flush();
    }, this.config.flushInterval);
  }

  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  // ==========================================================================
  // Storage
  // ==========================================================================

  private loadFromStorage(): void {
    if (!this.config.persistent || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const stored = localStorage.getItem(`${this.config.storagePrefix}data`);
      if (stored) {
        const data = JSON.parse(stored);

        for (const [userId, exposures] of Object.entries(data)) {
          const userMap = new Map<string, ExposureRecord>();

          for (const [key, record] of Object.entries(exposures as Record<string, unknown>)) {
            const typedRecord = record as ExposureRecord;
            userMap.set(key, {
              ...typedRecord,
              firstExposedAt: new Date(typedRecord.firstExposedAt),
              lastExposedAt: new Date(typedRecord.lastExposedAt),
            });
          }

          this.userExposures.set(userId, userMap);
        }

        this.log(`Loaded ${this.userExposures.size} users from storage`);
      }
    } catch (error) {
      this.log('Error loading from storage:', error);
    }
  }

  private saveToStorage(): void {
    if (!this.config.persistent || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const data: Record<string, Record<string, ExposureRecord>> = {};

      for (const [userId, userMap] of this.userExposures.entries()) {
        data[userId] = Object.fromEntries(userMap.entries());
      }

      localStorage.setItem(
        `${this.config.storagePrefix}data`,
        JSON.stringify(data)
      );
    } catch (error) {
      this.log('Error saving to storage:', error);
    }
  }

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  /**
   * Clear all exposure data.
   */
  clear(): void {
    this.userExposures.clear();
    this.pendingExposures = [];

    if (this.config.persistent && typeof localStorage !== 'undefined') {
      localStorage.removeItem(`${this.config.storagePrefix}data`);
    }

    this.log('Exposure data cleared');
  }

  /**
   * Clear exposures for a specific user.
   */
  clearUser(userId: UserId): void {
    this.userExposures.delete(userId);
    this.saveToStorage();
    this.log(`Cleared exposures for user: ${userId}`);
  }

  /**
   * Shutdown the tracker.
   */
  async shutdown(): Promise<void> {
    this.stopFlushTimer();
    await this.flush();
    this.saveToStorage();
    this.listeners.clear();
    this.log('Exposure tracker shutdown');
  }

  /**
   * Enable or disable tracking.
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (enabled) {
      this.startFlushTimer();
    } else {
      this.stopFlushTimer();
    }
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      // eslint-disable-next-line no-console
      console.log(`[ExposureTracker] ${message}`, ...args);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let instance: ExposureTracker | null = null;

/**
 * Get the singleton exposure tracker instance.
 */
export function getExposureTracker(): ExposureTracker {
  instance ??= new ExposureTracker();
  return instance;
}

/**
 * Initialize the singleton with configuration.
 */
export function initExposureTracker(config: ExposureTrackerConfig): ExposureTracker {
  instance = new ExposureTracker(config);
  return instance;
}

/**
 * Reset the singleton instance.
 */
export function resetExposureTracker(): void {
  if (instance) {
    instance.shutdown();
  }
  instance = null;
}

// ============================================================================
// React Hook Support
// ============================================================================

/**
 * Create exposure tracking context for React.
 */
export function createExposureContext(config?: ExposureTrackerConfig) {
  const tracker = new ExposureTracker(config);

  return {
    tracker,
    trackExposure: tracker.trackExposure.bind(tracker),
    getExposure: tracker.getExposure.bind(tracker),
    wasExposed: tracker.wasExposed.bind(tracker),
    subscribe: tracker.subscribe.bind(tracker),
  };
}
