/**
 * @file Performance Monitoring Module
 * @description Comprehensive performance monitoring infrastructure for React applications.
 *
 * Provides real-time performance tracking, regression detection, budget enforcement,
 * and Real User Monitoring (RUM) capabilities.
 *
 * @example
 * ```typescript
 * import {
 *   // Vitals Collection
 *   EnhancedVitalsCollector,
 *   getEnhancedVitalsCollector,
 *
 *   // Performance Reporting
 *   PerformanceReporter,
 *   getPerformanceReporter,
 *
 *   // Regression Detection
 *   RegressionDetector,
 *   getRegressionDetector,
 *   recordPerformanceSample,
 *
 *   // Budget Enforcement
 *   BudgetEnforcer,
 *   getBudgetEnforcer,
 *   enforceBudget,
 *
 *   // Real User Monitoring
 *   RealUserMonitoring,
 *   initRUM,
 *   trackCustomEvent,
 * } from '@/lib/performance/monitoring';
 * ```
 */

// ============================================================================
// Enhanced Vitals Collector
// ============================================================================
export {
  // Class
  EnhancedVitalsCollector,
  // Factory functions
  getEnhancedVitalsCollector,
  resetEnhancedVitalsCollector,
  // Constants
  DEFAULT_THRESHOLDS,
  // Types
  type MetricName,
  type MetricRating,
  type CollectedMetric,
  type MetricAttribution,
  type MetricThresholds,
  type VitalsCollectionConfig,
  type MetricCallback,
} from './vitals-collector';

// ============================================================================
// Performance Reporter
// ============================================================================
export {
  // Class
  PerformanceReporter,
  // Factory functions
  getPerformanceReporter,
  resetPerformanceReporter,
  // Types
  type ReportFormat,
  type ReportDestination,
  type ReportMetric,
  type PerformanceReport,
  type ReportSummary,
  type ReportContext,
  type PerformanceReporterConfig,
  type AlertRule,
} from './performance-reporter';

// ============================================================================
// Regression Detector
// ============================================================================
export {
  // Class
  RegressionDetector,
  // Factory functions
  getRegressionDetector,
  resetRegressionDetector,
  // Convenience functions
  recordPerformanceSample,
  analyzePerformanceTrend,
  getRegressionSummary,
  // Types
  type RegressionSeverity,
  type RegressionStatus,
  type MetricSample,
  type MetricBaseline,
  type RegressionEvent,
  type TrendAnalysis,
  type AnomalyResult,
  type RegressionDetectorConfig,
  type DetectorSummary,
} from './regression-detector';

// ============================================================================
// Budget Enforcer
// ============================================================================
export {
  // Class
  BudgetEnforcer,
  // Factory functions
  getBudgetEnforcer,
  resetBudgetEnforcer,
  // Convenience functions
  checkBudget,
  enforceBudget,
  getComplianceReport,
  isPerformanceDegraded,
  isDegradationActive,
  // Constants
  DEFAULT_VITALS_BUDGETS,
  DEFAULT_BUNDLE_BUDGETS,
  DEFAULT_RUNTIME_BUDGETS,
  // Types
  type BudgetCategory,
  type BudgetSeverity,
  type EnforcementMode,
  type DegradationAction,
  type BudgetDefinition,
  type EnforcementResult,
  type BudgetViolation,
  type BudgetComplianceReport,
  type ComplianceReport,
  type BudgetEnforcerConfig,
} from './budget-enforcer';

// ============================================================================
// Real User Monitoring
// ============================================================================
export {
  // Class
  RealUserMonitoring,
  // Factory functions
  getRUM,
  initRUM,
  resetRUM,
  // Convenience functions
  trackPageView,
  trackCustomEvent,
  trackRUMError,
  setRUMUserId,
  getRUMSessionSummary,
  // Types
  type SessionStatus,
  type RUMEventType,
  type UserSession,
  type DeviceInfo,
  type UTMParams,
  type PageViewEvent,
  type InteractionEvent,
  type ErrorEvent,
  type ResourceEvent,
  type RageClickEvent,
  type FormAbandonmentEvent,
  type RUMEvent,
  type RUMConfig,
  type SessionSummary,
} from './real-user-monitoring';

// ============================================================================
// Unified Initialization
// ============================================================================

import {
  getEnhancedVitalsCollector,
  type VitalsCollectionConfig,
} from './vitals-collector';
import {
  getPerformanceReporter,
  type PerformanceReporterConfig,
} from './performance-reporter';
import {
  getRegressionDetector,
  type RegressionDetectorConfig,
} from './regression-detector';
import {
  getBudgetEnforcer,
  type BudgetEnforcerConfig,
} from './budget-enforcer';
import { getRUM, type RUMConfig } from './real-user-monitoring';

/**
 * Unified monitoring configuration
 */
export interface MonitoringSystemConfig {
  /** Enable monitoring system */
  enabled?: boolean;
  /** Vitals collection configuration */
  vitals?: Partial<VitalsCollectionConfig>;
  /** Reporter configuration */
  reporter?: Partial<PerformanceReporterConfig>;
  /** Regression detection configuration */
  regression?: Partial<RegressionDetectorConfig>;
  /** Budget enforcement configuration */
  budget?: Partial<BudgetEnforcerConfig>;
  /** RUM configuration */
  rum?: Partial<RUMConfig>;
}

/**
 * Monitoring system instance references
 */
export interface MonitoringSystem {
  /** Vitals collector */
  vitals: ReturnType<typeof getEnhancedVitalsCollector>;
  /** Performance reporter */
  reporter: ReturnType<typeof getPerformanceReporter>;
  /** Regression detector */
  regression: ReturnType<typeof getRegressionDetector>;
  /** Budget enforcer */
  budget: ReturnType<typeof getBudgetEnforcer>;
  /** RUM instance */
  rum: ReturnType<typeof getRUM>;
  /** Cleanup function */
  cleanup: () => void;
}

/**
 * Initialize the complete monitoring system
 *
 * @example
 * ```typescript
 * const monitoring = initMonitoringSystem({
 *   vitals: { enabled: true, sampleRate: 0.5 },
 *   reporter: { destination: 'endpoint', endpointUrl: '/api/perf' },
 *   regression: { zScoreThreshold: 2.5 },
 *   budget: { mode: 'enforce', autoDegradation: true },
 *   rum: { trackErrors: true, trackClicks: true },
 * });
 *
 * // Later...
 * monitoring.cleanup();
 * ```
 */
export function initMonitoringSystem(
  config: MonitoringSystemConfig = {}
): MonitoringSystem {
  const enabled = config.enabled !== false;

  if (!enabled) {
    // Return disabled instances
    const disabledConfig = { enabled: false };
    return {
      vitals: getEnhancedVitalsCollector(disabledConfig),
      reporter: getPerformanceReporter(disabledConfig as Partial<PerformanceReporterConfig>),
      regression: getRegressionDetector(disabledConfig),
      budget: getBudgetEnforcer(disabledConfig as Partial<BudgetEnforcerConfig>),
      rum: getRUM(disabledConfig),
      cleanup: () => {},
    };
  }

  // Initialize components
  const vitals = getEnhancedVitalsCollector(config.vitals);
  const reporter = getPerformanceReporter(config.reporter);
  const regression = getRegressionDetector(config.regression);
  const budget = getBudgetEnforcer(config.budget);
  const rum = getRUM(config.rum);

  // Start collectors
  const vitalsCleanup = vitals.init();
  const rumCleanup = rum.init();

  // Wire up integrations
  vitals.subscribe((metric) => {
    // Feed metrics to regression detector
    regression.recordSample({
      name: metric.name,
      value: metric.value,
      timestamp: metric.timestamp,
    });

    // Feed metrics to budget enforcer
    budget.record(metric.name, metric.value);
  });

  // Cleanup function
  const cleanup = (): void => {
    vitalsCleanup();
    rumCleanup();
    regression.reset();
    budget.reset();
  };

  return {
    vitals,
    reporter,
    regression,
    budget,
    rum,
    cleanup,
  };
}

/**
 * Quick start: Initialize monitoring with sensible defaults
 *
 * @example
 * ```typescript
 * // In main.tsx
 * const cleanup = await quickStartMonitoring({
 *   debug: import.meta.env.DEV,
 *   endpoint: '/api/monitoring',
 *   sampleRate: import.meta.env.PROD ? 0.1 : 1.0,
 * });
 * ```
 */
export function quickStartMonitoring(options: {
  /** Enable debug mode */
  debug?: boolean;
  /** Analytics endpoint */
  endpoint?: string;
  /** Sample rate (0-1) */
  sampleRate?: number;
  /** Callback when performance regression detected */
  onRegression?: (event: import('./regression-detector').RegressionEvent) => void;
  /** Callback when budget violated */
  onBudgetViolation?: (violation: import('./budget-enforcer').BudgetViolation) => void;
} = {}): () => void {
  const {
    debug = false,
    endpoint,
    sampleRate = 1.0,
    onRegression,
    onBudgetViolation,
  } = options;

  const system = initMonitoringSystem({
    vitals: {
      enabled: true,
      sampleRate,
      debug,
      reportEndpoint: endpoint,
    },
    reporter: {
      enabled: true,
      destination: (endpoint !== null && endpoint !== undefined) ? 'endpoint' : 'console',
      endpointUrl: endpoint,
      debug,
    },
    regression: {
      enabled: true,
      debug,
      onRegression,
    },
    budget: {
      enabled: true,
      mode: 'warn',
      debug,
      onViolation: onBudgetViolation,
    },
    rum: {
      enabled: true,
      sampleRate,
      debug,
      endpoint,
    },
  });

  return system.cleanup;
}

// ============================================================================
// Type Aliases for Convenience
// ============================================================================

// Note: All primary types are exported from their respective modules above.
// These aliases provide semantic naming for cross-module usage:
//
// - VitalMetricName -> MetricName (from vitals-collector)
// - VitalCollectedMetric -> CollectedMetric (from vitals-collector)
// - MonitoringReport -> PerformanceReport (from performance-reporter)
// - MonitoringReportMetric -> ReportMetric (from performance-reporter)
// - MonitoringRegressionEvent -> RegressionEvent (from regression-detector)
// - MonitoringTrendAnalysis -> TrendAnalysis (from regression-detector)
// - MonitoringBudget -> BudgetDefinition (from budget-enforcer)
// - MonitoringComplianceReport -> ComplianceReport (from budget-enforcer)
// - MonitoringSession -> UserSession (from real-user-monitoring)
// - MonitoringRUMEvent -> RUMEvent (from real-user-monitoring)
