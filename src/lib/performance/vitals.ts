/**
 * @file Web Vitals Collection and Reporting System
 * @description Enterprise-grade Core Web Vitals collection with analytics integration,
 * performance budgets, and real-time monitoring capabilities.
 *
 * Targets:
 * - LCP: < 2500ms (good), < 4000ms (needs improvement)
 * - INP: < 200ms (good), < 500ms (needs improvement)
 * - CLS: < 0.1 (good), < 0.25 (needs improvement)
 * - FCP: < 1800ms (good), < 3000ms (needs improvement)
 * - TTFB: < 800ms (good), < 1800ms (needs improvement)
 */

import {
  onCLS,
  onFCP,
  onINP,
  onLCP,
  onTTFB,
  type Metric,
} from 'web-vitals';

// ============================================================================
// Types
// ============================================================================

/**
 * Core Web Vitals metric names
 */
export type VitalMetricName = 'CLS' | 'FCP' | 'INP' | 'LCP' | 'TTFB';

/**
 * Performance rating based on Core Web Vitals thresholds
 */
export type PerformanceRating = 'good' | 'needs-improvement' | 'poor';

/**
 * Extended metric with rating and context
 */
export interface VitalMetricEntry {
  name: VitalMetricName;
  value: number;
  rating: PerformanceRating;
  delta: number;
  id: string;
  navigationType: string;
  timestamp: number;
  attribution?: unknown;
}

/**
 * Aggregated vitals snapshot
 */
export interface VitalsSnapshot {
  CLS?: VitalMetricEntry;
  FCP?: VitalMetricEntry;
  INP?: VitalMetricEntry;
  LCP?: VitalMetricEntry;
  TTFB?: VitalMetricEntry;
  timestamp: number;
  url: string;
  path: string;
  score: number;
  rating: PerformanceRating;
}

/**
 * Performance budget configuration
 */
export interface PerformanceBudget {
  CLS: { good: number; poor: number };
  FCP: { good: number; poor: number };
  INP: { good: number; poor: number };
  LCP: { good: number; poor: number };
  TTFB: { good: number; poor: number };
}

/**
 * Budget violation event
 */
export interface BudgetViolation {
  metric: VitalMetricName;
  value: number;
  budget: number;
  severity: 'warning' | 'critical';
  timestamp: number;
  url: string;
}

/**
 * Vitals reporter callback
 */
export type VitalsReporter = (
  metric: VitalMetricEntry,
  snapshot: VitalsSnapshot
) => void;

/**
 * Budget violation callback
 */
export type BudgetViolationHandler = (violation: BudgetViolation) => void;

/**
 * Configuration for vitals collection
 */
export interface VitalsCollectorConfig {
  /** Enable reporting to analytics endpoint */
  reportToAnalytics?: boolean;
  /** Analytics endpoint URL */
  analyticsEndpoint?: string;
  /** Custom performance budgets */
  budgets?: Partial<PerformanceBudget>;
  /** Callback for each metric update */
  onMetric?: VitalsReporter;
  /** Callback for budget violations */
  onBudgetViolation?: BudgetViolationHandler;
  /** Sample rate for reporting (0-1) */
  sampleRate?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** Batch reports before sending */
  batchReports?: boolean;
  /** Batch flush interval in ms */
  batchInterval?: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default Core Web Vitals thresholds (Google recommended)
 */
export const DEFAULT_BUDGETS: PerformanceBudget = {
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  INP: { good: 200, poor: 500 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 },
};

/**
 * Metric weights for overall score calculation
 */
const METRIC_WEIGHTS: Record<VitalMetricName, number> = {
  LCP: 0.25,
  INP: 0.30, // INP replaced FID with higher weight
  CLS: 0.25,
  FCP: 0.10,
  TTFB: 0.10,
};

// ============================================================================
// Utilities
// ============================================================================

/**
 * Calculate rating based on value and thresholds
 */
function calculateRating(
  value: number,
  thresholds: { good: number; poor: number }
): PerformanceRating {
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Convert rating to numeric score (0-100)
 */
function ratingToScore(rating: PerformanceRating): number {
  switch (rating) {
    case 'good':
      return 100;
    case 'needs-improvement':
      return 50;
    case 'poor':
      return 0;
  }
}

/**
 * Calculate overall performance score from vitals
 */
function calculateOverallScore(metrics: Partial<Record<VitalMetricName, VitalMetricEntry>>): number {
  let totalWeight = 0;
  let weightedScore = 0;

  for (const [name, entry] of Object.entries(metrics)) {
    if (entry !== undefined && entry !== null) {
      const weight = METRIC_WEIGHTS[name as VitalMetricName];
      weightedScore += ratingToScore(entry.rating) * weight;
      totalWeight += weight;
    }
  }

  return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
}

/**
 * Get overall rating from score
 */
function scoreToRating(score: number): PerformanceRating {
  if (score >= 90) return 'good';
  if (score >= 50) return 'needs-improvement';
  return 'poor';
}

// ============================================================================
// Vitals Collector Class
// ============================================================================

/**
 * Core Web Vitals collector with real-time monitoring
 */
export class VitalsCollector {
  private config: Required<VitalsCollectorConfig>;
  private metrics: Partial<Record<VitalMetricName, VitalMetricEntry>> = {};
  private subscribers: Set<VitalsReporter> = new Set();
  private budgetHandlers: Set<BudgetViolationHandler> = new Set();
  private reportBuffer: VitalMetricEntry[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private isInitialized = false;

  // Performance optimization: Cache calculated score to avoid recalculation on every getSnapshot()
  private cachedScore: number | null = null;
  private cachedScoreMetricsVersion = 0;
  private metricsVersion = 0;

  constructor(config: VitalsCollectorConfig = {}) {
    this.config = {
      reportToAnalytics: config.reportToAnalytics ?? false,
      analyticsEndpoint: config.analyticsEndpoint ?? '/api/analytics/vitals',
      budgets: { ...DEFAULT_BUDGETS, ...config.budgets },
      onMetric: config.onMetric ?? (() => {}),
      onBudgetViolation: config.onBudgetViolation ?? (() => {}),
      sampleRate: config.sampleRate ?? 1,
      debug: config.debug ?? false,
      batchReports: config.batchReports ?? true,
      batchInterval: config.batchInterval ?? 5000,
    };
  }

  /**
   * Initialize vitals collection
   */
  init(): () => void {
    if (this.isInitialized) {
      this.log('VitalsCollector already initialized');
      return () => {};
    }

    // Check sample rate
    if (Math.random() > this.config.sampleRate) {
      this.log('Skipping vitals collection (sample rate)');
      return () => {};
    }

    this.log('Initializing VitalsCollector');
    this.isInitialized = true;

    // Register metric handlers
    onCLS(this.handleMetric.bind(this));
    onFCP(this.handleMetric.bind(this));
    onINP(this.handleMetric.bind(this));
    onLCP(this.handleMetric.bind(this));
    onTTFB(this.handleMetric.bind(this));

    // Setup batch flush
    if (this.config.batchReports) {
      this.scheduleBatchFlush();
    }

    // Setup unload handlers with stored references for proper cleanup
    const handlePagehide = (): void => this.flush();
    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'hidden') {
        this.flush();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePagehide);

    // Return cleanup function
    return () => {
      this.isInitialized = false;
      this.flush();
      if (this.flushTimer) {
        clearTimeout(this.flushTimer);
      }
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePagehide);
    };
  }

  /**
   * Handle incoming metric
   */
  private handleMetric(metric: Metric): void {
    const name = metric.name as VitalMetricName;
    const budget = this.config.budgets[name];

    if (!budget) return;

    const entry: VitalMetricEntry = {
      name,
      value: metric.value,
      rating: calculateRating(metric.value, budget),
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType,
      timestamp: Date.now(),
      attribution: this.extractAttribution(metric),
    };

    this.metrics[name] = entry;
    // Invalidate cached score when metrics change
    this.metricsVersion++;
    this.log(`Metric ${name}: ${metric.value} (${entry.rating})`);

    // Check budget violation
    this.checkBudgetViolation(entry);

    // Get current snapshot
    const snapshot = this.getSnapshot();

    // Notify subscribers
    this.config.onMetric(entry, snapshot);
    this.subscribers.forEach((subscriber) => subscriber(entry, snapshot));

    // Buffer for batch reporting
    if (this.config.reportToAnalytics) {
      this.reportBuffer.push(entry);
    }
  }

  /**
   * Extract attribution data from metric
   */
  private extractAttribution(metric: Metric): unknown {
    // Type-specific attribution using optional chaining
    const metricWithAttribution = metric as Metric & { attribution?: unknown };
    return metricWithAttribution.attribution;
  }

  /**
   * Check and report budget violations
   */
  private checkBudgetViolation(entry: VitalMetricEntry): void {
    const budget = this.config.budgets[entry.name];
    if (!budget) return;

    let violation: BudgetViolation | null = null;

    if (entry.value > budget.poor) {
      violation = {
        metric: entry.name,
        value: entry.value,
        budget: budget.poor,
        severity: 'critical',
        timestamp: Date.now(),
        url: window.location.href,
      };
    } else if (entry.value > budget.good) {
      violation = {
        metric: entry.name,
        value: entry.value,
        budget: budget.good,
        severity: 'warning',
        timestamp: Date.now(),
        url: window.location.href,
      };
    }

    if (violation) {
      this.config.onBudgetViolation(violation);
      this.budgetHandlers.forEach((handler) => handler(violation));
    }
  }

  /**
   * Schedule batch flush
   */
  private scheduleBatchFlush(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    this.flushTimer = setTimeout(() => {
      this.flush();
      this.scheduleBatchFlush();
    }, this.config.batchInterval);
  }

  /**
   * Flush buffered reports to analytics
   */
  flush(): void {
    if (this.reportBuffer.length === 0) return;

    const reports = [...this.reportBuffer];
    this.reportBuffer = [];

    if (this.config.reportToAnalytics && this.config.analyticsEndpoint) {
      void this.sendToAnalytics(reports);
    }
  }

  /**
   * Send metrics to analytics endpoint
   */
  private async sendToAnalytics(metrics: VitalMetricEntry[]): Promise<void> {
    try {
      const payload = {
        metrics,
        snapshot: this.getSnapshot(),
        userAgent: navigator.userAgent,
        connection: this.getConnectionInfo(),
        timestamp: Date.now(),
      };

      // Use sendBeacon for reliability during page unload
      if (typeof navigator.sendBeacon !== 'undefined') {
        navigator.sendBeacon(
          this.config.analyticsEndpoint,
          JSON.stringify(payload)
        );
      } else {
        await fetch(this.config.analyticsEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        });
      }

      this.log(`Sent ${metrics.length} metrics to analytics`);
    } catch (error) {
      console.error('[VitalsCollector] Failed to send analytics:', error);
    }
  }

  /**
   * Get connection information
   */
  private getConnectionInfo(): Record<string, unknown> {
    const nav = navigator as Navigator & {
      connection?: {
        effectiveType?: string;
        downlink?: number;
        rtt?: number;
        saveData?: boolean;
      };
    };

    return {
      effectiveType: nav.connection?.effectiveType,
      downlink: nav.connection?.downlink,
      rtt: nav.connection?.rtt,
      saveData: nav.connection?.saveData,
    };
  }

  /**
   * Get current vitals snapshot
   * Performance optimized: Uses cached score to avoid recalculation on every call
   */
  getSnapshot(): VitalsSnapshot {
    // Use cached score if metrics haven't changed
    if (this.cachedScore === null || this.cachedScoreMetricsVersion !== this.metricsVersion) {
      this.cachedScore = calculateOverallScore(this.metrics);
      this.cachedScoreMetricsVersion = this.metricsVersion;
    }

    return {
      ...this.metrics,
      timestamp: Date.now(),
      url: window.location.href,
      path: window.location.pathname,
      score: this.cachedScore,
      rating: scoreToRating(this.cachedScore),
    };
  }

  /**
   * Get specific metric
   */
  getMetric(name: VitalMetricName): VitalMetricEntry | undefined {
    return this.metrics[name];
  }

  /**
   * Subscribe to metric updates
   */
  subscribe(callback: VitalsReporter): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Subscribe to budget violations
   */
  onViolation(callback: BudgetViolationHandler): () => void {
    this.budgetHandlers.add(callback);
    return () => this.budgetHandlers.delete(callback);
  }

  /**
   * Debug logging
   */
  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      console.info(`[VitalsCollector] ${message}`, ...args);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let collectorInstance: VitalsCollector | null = null;

/**
 * Get or create the global VitalsCollector instance
 */
export function getVitalsCollector(config?: VitalsCollectorConfig): VitalsCollector {
  collectorInstance ??= new VitalsCollector(config);
  return collectorInstance;
}

/**
 * Initialize vitals collection with config
 */
export function initVitals(config?: VitalsCollectorConfig): () => void {
  const collector = getVitalsCollector(config);
  return collector.init();
}

// ============================================================================
// React Integration Helpers
// ============================================================================

/**
 * Format metric value for display
 */
export function formatMetricValue(name: VitalMetricName, value: number): string {
  if (name === 'CLS') {
    return value.toFixed(3);
  }
  return `${Math.round(value)}ms`;
}

/**
 * Get color for rating
 */
export function getRatingColor(rating: PerformanceRating): string {
  switch (rating) {
    case 'good':
      return '#22c55e'; // green-500
    case 'needs-improvement':
      return '#f59e0b'; // amber-500
    case 'poor':
      return '#ef4444'; // red-500
  }
}

/**
 * Get metric description
 */
export function getMetricDescription(name: VitalMetricName): string {
  switch (name) {
    case 'LCP':
      return 'Largest Contentful Paint - Time to render the largest visible element';
    case 'INP':
      return 'Interaction to Next Paint - Responsiveness to user interactions';
    case 'CLS':
      return 'Cumulative Layout Shift - Visual stability of the page';
    case 'FCP':
      return 'First Contentful Paint - Time to first content render';
    case 'TTFB':
      return 'Time to First Byte - Server response time';
  }
}

/**
 * Get metric target value
 */
export function getMetricTarget(name: VitalMetricName): string {
  const budget = DEFAULT_BUDGETS[name];
  if (name === 'CLS') {
    return `< ${budget.good}`;
  }
  return `< ${budget.good}ms`;
}

// ============================================================================
// Exports
// ============================================================================

export {
  calculateRating,
  calculateOverallScore,
  ratingToScore,
  scoreToRating,
};
