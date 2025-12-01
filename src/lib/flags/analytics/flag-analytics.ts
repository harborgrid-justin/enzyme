/**
 * @fileoverview Feature flag analytics collection and reporting.
 *
 * Provides comprehensive analytics for feature flags:
 * - Evaluation tracking
 * - Usage metrics
 * - Performance monitoring
 * - Error tracking
 *
 * @module flags/analytics/flag-analytics
 *
 * @example
 * ```typescript
 * const analytics = new FlagAnalytics({
 *   batchSize: 100,
 *   flushInterval: 30000,
 *   endpoint: 'https://api.example.com/analytics',
 * });
 *
 * analytics.trackEvaluation({
 *   flagKey: 'new-feature',
 *   variantId: 'enabled',
 *   userId: 'user-123',
 * });
 *
 * const report = analytics.getReport();
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
 * Evaluation event for analytics.
 */
export interface EvaluationEvent {
  /** Flag key */
  readonly flagKey: string;
  /** Variant ID */
  readonly variantId: VariantId;
  /** User ID */
  readonly userId?: UserId;
  /** Session ID */
  readonly sessionId?: string;
  /** Evaluation reason */
  readonly reason?: EvaluationReason;
  /** Evaluation time in ms */
  readonly durationMs?: number;
  /** Timestamp */
  readonly timestamp: Date;
  /** Whether value was from cache */
  readonly cached?: boolean;
  /** Additional metadata */
  readonly metadata?: Record<string, JsonValue>;
}

/**
 * Aggregated metrics for a flag.
 */
export interface FlagMetrics {
  /** Flag key */
  readonly flagKey: string;
  /** Total evaluations */
  readonly evaluationCount: number;
  /** Evaluations per variant */
  readonly variantCounts: Record<VariantId, number>;
  /** Unique users */
  readonly uniqueUsers: number;
  /** Unique sessions */
  readonly uniqueSessions: number;
  /** Average evaluation time */
  readonly avgDurationMs: number;
  /** Cache hit rate */
  readonly cacheHitRate: number;
  /** Errors count */
  readonly errorCount: number;
  /** First evaluation */
  readonly firstSeen: Date;
  /** Last evaluation */
  readonly lastSeen: Date;
}

/**
 * Analytics configuration.
 */
export interface FlagAnalyticsConfig {
  /** Enable analytics collection */
  readonly enabled?: boolean;
  /** Batch size before flushing */
  readonly batchSize?: number;
  /** Flush interval in ms */
  readonly flushInterval?: number;
  /** Analytics endpoint URL */
  readonly endpoint?: string;
  /** API key for endpoint */
  readonly apiKey?: string;
  /** Custom flush handler */
  readonly onFlush?: (events: EvaluationEvent[]) => Promise<void>;
  /** Error handler */
  readonly onError?: (error: Error) => void;
  /** Enable debug logging */
  readonly debug?: boolean;
  /** Sample rate (0-1) */
  readonly sampleRate?: number;
  /** Max events to store */
  readonly maxEvents?: number;
}

/**
 * Analytics report.
 */
export interface AnalyticsReport {
  /** Report generation time */
  readonly generatedAt: Date;
  /** Time period start */
  readonly periodStart: Date;
  /** Time period end */
  readonly periodEnd: Date;
  /** Total evaluations */
  readonly totalEvaluations: number;
  /** Unique flags evaluated */
  readonly uniqueFlags: number;
  /** Unique users */
  readonly uniqueUsers: number;
  /** Metrics per flag */
  readonly flagMetrics: FlagMetrics[];
  /** Top flags by evaluation count */
  readonly topFlags: Array<{ flagKey: string; count: number }>;
  /** Error rate */
  readonly errorRate: number;
}

// ============================================================================
// Flag Analytics
// ============================================================================

/**
 * Analytics collector for feature flags.
 */
export class FlagAnalytics {
  private events: EvaluationEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private config: Required<FlagAnalyticsConfig>;
  private flagMetrics = new Map<string, {
    evaluationCount: number;
    variantCounts: Map<VariantId, number>;
    uniqueUsers: Set<string>;
    uniqueSessions: Set<string>;
    totalDuration: number;
    cacheHits: number;
    errorCount: number;
    firstSeen: Date;
    lastSeen: Date;
  }>();
  private listeners = new Set<(events: EvaluationEvent[]) => void>();
  private periodStart = new Date();

  constructor(config: FlagAnalyticsConfig = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      batchSize: config.batchSize ?? 100,
      flushInterval: config.flushInterval ?? 30000,
      endpoint: config.endpoint ?? '',
      apiKey: config.apiKey ?? '',
      onFlush: config.onFlush ?? this.defaultFlush.bind(this),
      onError: config.onError ?? console.error,
      debug: config.debug ?? false,
      sampleRate: config.sampleRate ?? 1,
      maxEvents: config.maxEvents ?? 10000,
    };

    this.startFlushTimer();
  }

  // ==========================================================================
  // Event Tracking
  // ==========================================================================

  /**
   * Track a flag evaluation event.
   */
  trackEvaluation(event: Omit<EvaluationEvent, 'timestamp'>): void {
    if (!this.config.enabled) {
      return;
    }

    // Apply sampling
    if (this.config.sampleRate < 1 && Math.random() > this.config.sampleRate) {
      return;
    }

    const fullEvent: EvaluationEvent = {
      ...event,
      timestamp: new Date(),
    };

    this.events.push(fullEvent);
    this.updateMetrics(fullEvent);

    // Check if we should flush
    if (this.events.length >= this.config.batchSize) {
      void this.flush();
    }

    // Enforce max events
    if (this.events.length > this.config.maxEvents) {
      this.events = this.events.slice(-this.config.maxEvents);
    }

    this.log(`Tracked evaluation: ${event.flagKey} -> ${event.variantId}`);
  }

  /**
   * Track an error during evaluation.
   */
  trackError(flagKey: string, error: Error, metadata?: Record<string, JsonValue>): void {
    const metrics = this.getOrCreateMetrics(flagKey);
    metrics.errorCount++;
    metrics.lastSeen = new Date();

    this.trackEvaluation({
      flagKey,
      variantId: 'error',
      reason: 'ERROR',
      metadata: {
        error: error.message,
        ...metadata,
      },
    });
  }

  private updateMetrics(event: EvaluationEvent): void {
    const metrics = this.getOrCreateMetrics(event.flagKey);

    metrics.evaluationCount++;
    metrics.lastSeen = event.timestamp;

    // Update variant counts
     
    const currentCount = metrics.variantCounts.get(event.variantId) ?? 0;
    metrics.variantCounts.set(event.variantId, currentCount + 1);

    // Track unique users
    if (event.userId != null && event.userId !== '') {
       
      metrics.uniqueUsers.add(event.userId);
    }

    // Track unique sessions
    if (event.sessionId != null && event.sessionId !== '') {
       
      metrics.uniqueSessions.add(event.sessionId);
    }

    // Track duration
    if (event.durationMs !== undefined) {
      metrics.totalDuration += event.durationMs;
    }

    // Track cache hits
    if (event.cached === true) {
      metrics.cacheHits++;
    }
  }

  private getOrCreateMetrics(flagKey: string): {
    evaluationCount: number;
    variantCounts: Map<VariantId, number>;
    uniqueUsers: Set<string>;
    uniqueSessions: Set<string>;
    totalDuration: number;
    cacheHits: number;
    errorCount: number;
    firstSeen: Date;
    lastSeen: Date;
  } {
    let metrics = this.flagMetrics.get(flagKey);
    if (metrics == null) {
      metrics = {
        evaluationCount: 0,
        variantCounts: new Map(),
        uniqueUsers: new Set(),
        uniqueSessions: new Set(),
        totalDuration: 0,
        cacheHits: 0,
        errorCount: 0,
        firstSeen: new Date(),
        lastSeen: new Date(),
      };
      this.flagMetrics.set(flagKey, metrics);
    }
    return metrics;
  }

  // ==========================================================================
  // Flushing
  // ==========================================================================

  /**
   * Flush pending events.
   */
  async flush(): Promise<void> {
    if (this.events.length === 0) {
      return;
    }

    const eventsToFlush = [...this.events];
    this.events = [];

    try {
      await this.config.onFlush(eventsToFlush);
      this.notifyListeners(eventsToFlush);
      this.log(`Flushed ${eventsToFlush.length} events`);
    } catch (error) {
      // Put events back on failure
      this.events = [...eventsToFlush, ...this.events];
      this.config.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Default flush handler that sends events to the configured endpoint.
   *
   * Note: This method intentionally uses raw fetch() rather than apiClient because:
   * 1. Analytics should be independent of the main API client to avoid circular dependencies
   * 2. Analytics endpoints may be on a different domain/service
   * 3. This should work even if the main API client fails
   *
   * @see {@link @/lib/api/api-client} for the main API client
   */
  private async defaultFlush(events: EvaluationEvent[]): Promise<void> {
    if (!this.config.endpoint) {
      return;
    }

    // Raw fetch is intentional - analytics should be independent of apiClient
    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey
          ? { Authorization: `Bearer ${this.config.apiKey}` }
          : {}),
      },
      body: JSON.stringify({ events }),
    });

    if (!response.ok) {
      throw new Error(`Analytics flush failed: ${response.status}`);
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
  // Metrics and Reporting
  // ==========================================================================

  /**
   * Get metrics for a specific flag.
   */
  getMetrics(flagKey: string): FlagMetrics | null {
    const metrics = this.flagMetrics.get(flagKey);
    if (!metrics) {
      return null;
    }

    return {
      flagKey,
      evaluationCount: metrics.evaluationCount,
      variantCounts: Object.fromEntries(metrics.variantCounts),
      uniqueUsers: metrics.uniqueUsers.size,
      uniqueSessions: metrics.uniqueSessions.size,
      avgDurationMs:
        metrics.evaluationCount > 0
          ? metrics.totalDuration / metrics.evaluationCount
          : 0,
      cacheHitRate:
        metrics.evaluationCount > 0
          ? metrics.cacheHits / metrics.evaluationCount
          : 0,
      errorCount: metrics.errorCount,
      firstSeen: metrics.firstSeen,
      lastSeen: metrics.lastSeen,
    };
  }

  /**
   * Get all flag metrics.
   */
  getAllMetrics(): FlagMetrics[] {
    const results: FlagMetrics[] = [];
    for (const flagKey of this.flagMetrics.keys()) {
      const metrics = this.getMetrics(flagKey);
      if (metrics) {
        results.push(metrics);
      }
    }
    return results;
  }

  /**
   * Generate an analytics report.
   */
  getReport(): AnalyticsReport {
    const allMetrics = this.getAllMetrics();
    const now = new Date();

    const uniqueUsers = new Set<string>();
    let totalEvaluations = 0;
    let totalErrors = 0;

    for (const metrics of allMetrics) {
      totalEvaluations += metrics.evaluationCount;
      totalErrors += metrics.errorCount;
    }

    // Collect unique users across all flags
    for (const metrics of this.flagMetrics.values()) {
      for (const userId of metrics.uniqueUsers) {
        uniqueUsers.add(userId);
      }
    }

    // Sort flags by evaluation count
    const topFlags = allMetrics
      .map((m) => ({ flagKey: m.flagKey, count: m.evaluationCount }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      generatedAt: now,
      periodStart: this.periodStart,
      periodEnd: now,
      totalEvaluations,
      uniqueFlags: allMetrics.length,
      uniqueUsers: uniqueUsers.size,
      flagMetrics: allMetrics,
      topFlags,
      errorRate: totalEvaluations > 0 ? totalErrors / totalEvaluations : 0,
    };
  }

  // ==========================================================================
  // Subscriptions
  // ==========================================================================

  /**
   * Subscribe to flush events.
   */
  subscribe(listener: (events: EvaluationEvent[]) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(events: EvaluationEvent[]): void {
    for (const listener of this.listeners) {
      try {
        listener(events);
      } catch (error) {
        this.log('Error in listener:', error);
      }
    }
  }

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  /**
   * Reset all metrics and events.
   */
  reset(): void {
    this.events = [];
    this.flagMetrics.clear();
    this.periodStart = new Date();
    this.log('Analytics reset');
  }

  /**
   * Shutdown the analytics collector.
   */
  async shutdown(): Promise<void> {
    this.stopFlushTimer();
    await this.flush();
    this.listeners.clear();
    this.log('Analytics shutdown');
  }

  /**
   * Enable or disable analytics.
   */
  setEnabled(enabled: boolean): void {
    (this.config as { enabled: boolean }).enabled = enabled;
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
      console.log(`[FlagAnalytics] ${message}`, ...args);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let instance: FlagAnalytics | null = null;

/**
 * Get the singleton analytics instance.
 */
export function getFlagAnalytics(): FlagAnalytics {
  instance ??= new FlagAnalytics();
  return instance;
}

/**
 * Initialize the singleton with configuration.
 */
export function initFlagAnalytics(config: FlagAnalyticsConfig): FlagAnalytics {
  instance = new FlagAnalytics(config);
  return instance;
}

/**
 * Reset the singleton instance.
 */
export function resetFlagAnalytics(): void {
  if (instance) {
    void instance.shutdown();
  }
  instance = null;
}
