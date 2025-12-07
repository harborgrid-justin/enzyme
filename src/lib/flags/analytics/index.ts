/**
 * @fileoverview Feature flag analytics module exports.
 *
 * This module provides comprehensive analytics capabilities for feature flags:
 * - Usage analytics and metrics collection
 * - Exposure tracking for experiments and A/B tests
 * - Impact analysis with statistical significance testing
 *
 * @module flags/analytics
 *
 * @example
 * ```typescript
 * import {
 *   FlagAnalytics,
 *   ExposureTracker,
 *   FlagImpactAnalyzer,
 *   initFlagAnalytics,
 *   initExposureTracker,
 *   initImpactAnalyzer,
 * } from '@/lib/flags/analytics';
 *
 * // Initialize analytics
 * const analytics = initFlagAnalytics({
 *   batchSize: 100,
 *   flushInterval: 30000,
 *   endpoint: 'https://api.example.com/analytics',
 * });
 *
 * // Track evaluations
 * analytics.trackEvaluation({
 *   flagKey: 'new-feature',
 *   variantId: 'enabled',
 *   userId: 'user-123',
 * });
 *
 * // Initialize exposure tracking
 * const tracker = initExposureTracker({
 *   deduplicationWindow: 24 * 60 * 60 * 1000,
 *   onExposure: (exposure) => console.log('Exposed:', exposure),
 * });
 *
 * // Track exposures
 * tracker.trackExposure({
 *   flagKey: 'new-checkout',
 *   variantId: 'variant-b',
 *   userId: 'user-123',
 *   experimentId: 'checkout-experiment',
 * });
 *
 * // Initialize impact analyzer
 * const analyzer = initImpactAnalyzer({
 *   significanceThreshold: 0.05,
 *   minSampleSize: 100,
 * });
 *
 * // Record metrics
 * analyzer.recordMetric('conversion_rate', 0.15, {
 *   flagKey: 'new-checkout',
 *   variantId: 'variant-b',
 *   userId: 'user-123',
 * });
 *
 * // Analyze impact
 * const impact = analyzer.analyzeImpact('new-checkout');
 * console.log(impact?.summary);
 * ```
 */

// ============================================================================
// Flag Analytics
// ============================================================================

export {
  FlagAnalytics,
  getFlagAnalytics,
  initFlagAnalytics,
  resetFlagAnalytics,
} from './flag-analytics';

export type {
  EvaluationEvent,
  FlagMetrics,
  FlagAnalyticsConfig,
  AnalyticsReport,
} from './flag-analytics';

// ============================================================================
// Exposure Tracking
// ============================================================================

export {
  ExposureTracker,
  getExposureTracker,
  initExposureTracker,
  resetExposureTracker,
  createExposureContext,
} from './flag-exposure-tracker';

export type {
  ExposureEvent,
  ExposureRecord,
  UserExposureSummary,
  ExposureTrackerConfig,
  TrackExposureInput,
} from './flag-exposure-tracker';

// ============================================================================
// Impact Analysis
// ============================================================================

export {
  FlagImpactAnalyzer,
  getImpactAnalyzer,
  initImpactAnalyzer,
  resetImpactAnalyzer,
} from './flag-impact-analyzer';

export type {
  MetricDataPoint,
  MetricStats,
  VariantComparison,
  FlagImpactAnalysis,
  ImpactAnalyzerConfig,
  RecordMetricInput,
} from './flag-impact-analyzer';

// ============================================================================
// Unified Analytics Factory
// ============================================================================

import { FlagAnalytics, type FlagAnalyticsConfig } from './flag-analytics';
import { ExposureTracker, type ExposureTrackerConfig } from './flag-exposure-tracker';
import { FlagImpactAnalyzer, type ImpactAnalyzerConfig } from './flag-impact-analyzer';

/**
 * Configuration for the unified analytics suite.
 */
export interface AnalyticsSuiteConfig {
  /** Flag analytics configuration */
  readonly analytics?: FlagAnalyticsConfig;
  /** Exposure tracker configuration */
  readonly exposure?: ExposureTrackerConfig;
  /** Impact analyzer configuration */
  readonly impact?: ImpactAnalyzerConfig;
  /** Enable all analytics by default */
  readonly enabled?: boolean;
  /** Debug mode for all components */
  readonly debug?: boolean;
}

/**
 * Unified analytics suite combining all analytics capabilities.
 */
export interface AnalyticsSuite {
  /** Flag analytics collector */
  readonly analytics: FlagAnalytics;
  /** Exposure tracker */
  readonly exposure: ExposureTracker;
  /** Impact analyzer */
  readonly impact: FlagImpactAnalyzer;
  /** Shutdown all analytics */
  shutdown(): Promise<void>;
  /** Reset all analytics */
  reset(): void;
  /** Set enabled state for all */
  setEnabled(enabled: boolean): void;
}

/**
 * Create a unified analytics suite with all components configured.
 *
 * @param config - Configuration for all analytics components
 * @returns Unified analytics suite
 *
 * @example
 * ```typescript
 * const suite = createAnalyticsSuite({
 *   analytics: {
 *     endpoint: 'https://api.example.com/analytics',
 *     batchSize: 100,
 *   },
 *   exposure: {
 *     deduplicationWindow: 86400000,
 *   },
 *   impact: {
 *     significanceThreshold: 0.05,
 *   },
 *   debug: true,
 * });
 *
 * // Use the suite
 * suite.analytics.trackEvaluation({ ... });
 * suite.exposure.trackExposure({ ... });
 * suite.impact.recordMetric('metric', value, { ... });
 *
 * // Cleanup
 * await suite.shutdown();
 * ```
 */
export function createAnalyticsSuite(config: AnalyticsSuiteConfig = {}): AnalyticsSuite {
  const { analytics: analyticsConfig, exposure: exposureConfig, impact: impactConfig } = config;
  const enabled = config.enabled ?? true;
  const debug = config.debug ?? false;

  const analytics = new FlagAnalytics({
    ...analyticsConfig,
    enabled: analyticsConfig?.enabled ?? enabled,
    debug: analyticsConfig?.debug ?? debug,
  });

  const exposure = new ExposureTracker({
    ...exposureConfig,
    enabled: exposureConfig?.enabled ?? enabled,
    debug: exposureConfig?.debug ?? debug,
  });

  const impact = new FlagImpactAnalyzer({
    ...impactConfig,
    enabled: impactConfig?.enabled ?? enabled,
    debug: impactConfig?.debug ?? debug,
  });

  return {
    analytics,
    exposure,
    impact,

    async shutdown(): Promise<void> {
      await Promise.all([analytics.shutdown(), exposure.shutdown()]);
    },

    reset(): void {
      analytics.reset();
      exposure.clear();
      impact.clear();
    },

    setEnabled(enabled: boolean): void {
      analytics.setEnabled(enabled);
      exposure.setEnabled(enabled);
      impact.setEnabled(enabled);
    },
  };
}

// ============================================================================
// Analytics Integration Helpers
// ============================================================================

/**
 * Connect analytics to flag evaluation events.
 *
 * @param suite - Analytics suite to connect
 * @param options - Connection options
 * @returns Disconnect function
 *
 * @example
 * ```typescript
 * import { getFlagEngine } from '@/lib/flags/advanced';
 * import { createAnalyticsSuite, connectAnalytics } from '@/lib/flags/analytics';
 *
 * const suite = createAnalyticsSuite();
 * const engine = getFlagEngine();
 *
 * // Connect analytics to engine
 * const disconnect = connectAnalytics(suite, {
 *   trackEvaluations: true,
 *   trackExposures: true,
 *   recordMetrics: true,
 * });
 *
 * // Later: disconnect
 * disconnect();
 * ```
 */
export function connectAnalytics(
  suite: AnalyticsSuite,
  options: {
    trackEvaluations?: boolean;
    trackExposures?: boolean;
    recordMetrics?: boolean;
  } = {}
): () => void {
  const { trackEvaluations = true, trackExposures = true } = options;
  const unsubscribers: Array<() => void> = [];

  // Connect exposure tracking to analytics events
  if (trackEvaluations && trackExposures) {
    const unsubscribe = suite.analytics.subscribe((events) => {
      for (const event of events) {
        if (event.userId != null && event.userId !== '') {
          suite.exposure.trackExposure({
            flagKey: event.flagKey,
            variantId: event.variantId,
            userId: event.userId,
            sessionId: event.sessionId,
            reason: event.reason,
          });
        }
      }
    });
    unsubscribers.push(unsubscribe);
  }

  return () => {
    for (const unsubscribe of unsubscribers) {
      unsubscribe();
    }
  };
}

/**
 * Get aggregated analytics data from all components.
 *
 * @param suite - Analytics suite to aggregate from
 * @returns Aggregated analytics data
 */
export function getAggregatedAnalytics(suite: AnalyticsSuite): {
  report: ReturnType<FlagAnalytics['getReport']>;
  exposureCount: number;
  impactAnalyses: ReturnType<FlagImpactAnalyzer['analyzeImpact']>[];
} {
  const report = suite.analytics.getReport();

  // Count total exposures across all tracked flags
  let exposureCount = 0;
  for (const flag of report.flagMetrics) {
    exposureCount += flag.evaluationCount;
  }

  // Get impact analyses for all tracked flags
  const impactAnalyses: ReturnType<FlagImpactAnalyzer['analyzeImpact']>[] = [];
  for (const flagKey of suite.impact.getFlagKeys()) {
    const analysis = suite.impact.analyzeImpact(flagKey);
    if (analysis) {
      impactAnalyses.push(analysis);
    }
  }

  return {
    report,
    exposureCount,
    impactAnalyses,
  };
}
