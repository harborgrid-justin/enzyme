/**
 * @file Performance Regression Detector
 * @description Statistical analysis to detect performance regressions in real-time.
 * Uses moving averages, standard deviation, and trend analysis to identify
 * significant degradations in application performance.
 *
 * Features:
 * - Statistical regression detection
 * - Baseline establishment
 * - Trend analysis
 * - Anomaly detection
 * - Alert thresholds
 * - Historical comparison
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Regression severity level
 */
export type RegressionSeverity = 'minor' | 'moderate' | 'severe' | 'critical';

/**
 * Regression status
 */
export type RegressionStatus = 'stable' | 'improving' | 'regressing' | 'anomaly';

/**
 * Metric sample for analysis
 */
export interface MetricSample {
  /** Metric name */
  name: string;
  /** Metric value */
  value: number;
  /** Timestamp */
  timestamp: number;
  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Baseline statistics for a metric
 */
export interface MetricBaseline {
  /** Metric name */
  name: string;
  /** Mean value */
  mean: number;
  /** Standard deviation */
  standardDeviation: number;
  /** Median value */
  median: number;
  /** 95th percentile */
  p95: number;
  /** 99th percentile */
  p99: number;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Sample count */
  sampleCount: number;
  /** Timestamp when baseline was established */
  establishedAt: number;
  /** Last updated timestamp */
  updatedAt: number;
}

/**
 * Detected regression event
 */
export interface RegressionEvent {
  /** Unique event ID */
  id: string;
  /** Metric name */
  metric: string;
  /** Current value */
  currentValue: number;
  /** Baseline value (mean) */
  baselineValue: number;
  /** Percentage deviation from baseline */
  deviation: number;
  /** Z-score (standard deviations from mean) */
  zScore: number;
  /** Regression severity */
  severity: RegressionSeverity;
  /** Detection timestamp */
  timestamp: number;
  /** Number of consecutive regression samples */
  consecutiveRegressions: number;
  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Trend analysis result
 */
export interface TrendAnalysis {
  /** Metric name */
  metric: string;
  /** Trend direction */
  direction: 'improving' | 'stable' | 'degrading';
  /** Trend strength (0-1) */
  strength: number;
  /** Slope of linear regression */
  slope: number;
  /** Predicted value at next interval */
  predictedNext: number;
  /** Correlation coefficient (R-squared) */
  rSquared: number;
  /** Analysis period in samples */
  periodSamples: number;
  /** Timestamp */
  timestamp: number;
}

/**
 * Anomaly detection result
 */
export interface AnomalyResult {
  /** Is this value an anomaly */
  isAnomaly: boolean;
  /** Anomaly score (higher = more anomalous) */
  score: number;
  /** Z-score of the value */
  zScore: number;
  /** Is it an upper outlier */
  isUpperOutlier: boolean;
  /** Is it a lower outlier */
  isLowerOutlier: boolean;
  /** Expected range */
  expectedRange: { min: number; max: number };
}

/**
 * Regression detection configuration
 */
export interface RegressionDetectorConfig {
  /** Enable regression detection */
  enabled: boolean;
  /** Minimum samples required for baseline */
  minBaselineSamples: number;
  /** Maximum samples to store per metric */
  maxSamplesPerMetric: number;
  /** Z-score threshold for regression (default: 2.0) */
  zScoreThreshold: number;
  /** Percentage threshold for regression (default: 0.15 = 15%) */
  percentageThreshold: number;
  /** Consecutive regressions required to trigger alert */
  consecutiveThreshold: number;
  /** Baseline recalculation interval in ms */
  baselineUpdateInterval: number;
  /** Trend analysis window size */
  trendWindowSize: number;
  /** Enable anomaly filtering */
  filterAnomalies: boolean;
  /** Anomaly score threshold */
  anomalyThreshold: number;
  /** Severity thresholds (deviation percentages) */
  severityThresholds: {
    minor: number;
    moderate: number;
    severe: number;
    critical: number;
  };
  /** Callback for regression events */
  onRegression?: (event: RegressionEvent) => void;
  /** Callback for recovery events */
  onRecovery?: (metric: string, baseline: MetricBaseline) => void;
  /** Debug mode */
  debug: boolean;
}

/**
 * Regression detector state summary
 */
export interface DetectorSummary {
  /** Total metrics tracked */
  metricsTracked: number;
  /** Metrics with established baselines */
  metricsWithBaselines: number;
  /** Metrics currently regressing */
  regressingMetrics: string[];
  /** Total regressions detected */
  totalRegressions: number;
  /** Recent regressions (last 24h) */
  recentRegressions: RegressionEvent[];
  /** Overall system status */
  status: RegressionStatus;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: RegressionDetectorConfig = {
  enabled: true,
  minBaselineSamples: 30,
  maxSamplesPerMetric: 1000,
  zScoreThreshold: 2.0,
  percentageThreshold: 0.15,
  consecutiveThreshold: 3,
  baselineUpdateInterval: 3600000, // 1 hour
  trendWindowSize: 20,
  filterAnomalies: true,
  anomalyThreshold: 3.0,
  severityThresholds: {
    minor: 0.10,     // 10%
    moderate: 0.25,  // 25%
    severe: 0.50,    // 50%
    critical: 1.0,   // 100%
  },
  debug: false,
};

// ============================================================================
// Statistical Utilities
// ============================================================================

/**
 * Calculate mean of an array
 */
function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculate standard deviation
 */
function calculateStandardDeviation(values: number[], mean?: number): number {
  if (values.length < 2) return 0;
  const m = mean ?? calculateMean(values);
  const squaredDiffs = values.map(v => Math.pow(v - m, 2));
  return Math.sqrt(squaredDiffs.reduce((sum, v) => sum + v, 0) / (values.length - 1));
}

/**
 * Calculate median
 */
function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
    : (sorted[mid] ?? 0);
}

/**
 * Calculate percentile
 */
function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower] ?? 0;
  return (sorted[lower] ?? 0) + ((sorted[upper] ?? 0) - (sorted[lower] ?? 0)) * (index - lower);
}

/**
 * Calculate Z-score
 */
function calculateZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

/**
 * Calculate linear regression slope
 */
function calculateLinearRegressionSlope(values: number[]): { slope: number; rSquared: number } {
  if (values.length < 2) return { slope: 0, rSquared: 0 };

  const n = values.length;
  const xMean = (n - 1) / 2; // Mean of indices 0, 1, 2, ..., n-1
  const yMean = calculateMean(values);

  let numerator = 0;
  let denominator = 0;
  let ssTotal = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = i - xMean;
    const yDiff = (values[i] ?? 0) - yMean;
    numerator += xDiff * yDiff;
    denominator += xDiff * xDiff;
    ssTotal += yDiff * yDiff;
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;

  // Calculate R-squared
  let ssResidual = 0;
  for (let i = 0; i < n; i++) {
    const predicted = yMean + slope * (i - xMean);
    ssResidual += Math.pow((values[i] ?? 0) - predicted, 2);
  }

  const rSquared = ssTotal !== 0 ? 1 - (ssResidual / ssTotal) : 0;

  return { slope, rSquared: Math.max(0, Math.min(1, rSquared)) };
}

// ============================================================================
// Regression Detector Class
// ============================================================================

/**
 * Performance regression detection engine
 */
export class RegressionDetector {
  private config: RegressionDetectorConfig;
  private samples: Map<string, MetricSample[]> = new Map();
  private baselines: Map<string, MetricBaseline> = new Map();
  private consecutiveCounts: Map<string, number> = new Map();
  private regressionHistory: RegressionEvent[] = [];
  private baselineUpdateTimers: Map<string, number> = new Map();
  private idCounter = 0;

  constructor(config: Partial<RegressionDetectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Record a metric sample
   */
  recordSample(sample: MetricSample): RegressionEvent | null {
    if (!this.config.enabled) return null;

    const { name, value, timestamp } = sample;

    // Initialize sample array if needed
    if (!this.samples.has(name)) {
      this.samples.set(name, []);
    }

    const samples = this.samples.get(name)!;
    samples.push({ ...sample, timestamp: timestamp || Date.now() });

    // Trim samples if exceeding max
    if (samples.length > this.config.maxSamplesPerMetric) {
      samples.shift();
    }

    // Check if we need to establish/update baseline
    this.maybeUpdateBaseline(name);

    // Check for regression
    const baseline = this.baselines.get(name);
    if (!baseline) return null;

    // Filter anomalies if enabled
    if (this.config.filterAnomalies) {
      const anomaly = this.detectAnomaly(value, baseline);
      if (anomaly.isAnomaly) {
        this.log(`Anomaly detected for ${name}: ${value} (score: ${anomaly.score.toFixed(2)})`);
        return null;
      }
    }

    // Check for regression
    return this.checkRegression(name, value, baseline, sample.context);
  }

  /**
   * Get or establish baseline for a metric
   */
  getBaseline(metric: string): MetricBaseline | null {
    return this.baselines.get(metric) || null;
  }

  /**
   * Manually set baseline for a metric
   */
  setBaseline(metric: string, baseline: Partial<MetricBaseline>): void {
    const existing = this.baselines.get(metric);
    const now = Date.now();

    this.baselines.set(metric, {
      name: metric,
      mean: baseline.mean ?? existing?.mean ?? 0,
      standardDeviation: baseline.standardDeviation ?? existing?.standardDeviation ?? 0,
      median: baseline.median ?? existing?.median ?? 0,
      p95: baseline.p95 ?? existing?.p95 ?? 0,
      p99: baseline.p99 ?? existing?.p99 ?? 0,
      min: baseline.min ?? existing?.min ?? 0,
      max: baseline.max ?? existing?.max ?? Infinity,
      sampleCount: baseline.sampleCount ?? existing?.sampleCount ?? 0,
      establishedAt: existing?.establishedAt ?? now,
      updatedAt: now,
    });
  }

  /**
   * Perform trend analysis for a metric
   */
  analyzeTrend(metric: string): TrendAnalysis | null {
    const samples = this.samples.get(metric);
    if (!samples || samples.length < this.config.trendWindowSize) {
      return null;
    }

    const recentSamples = samples.slice(-this.config.trendWindowSize);
    const values = recentSamples.map(s => s.value);
    const { slope, rSquared } = calculateLinearRegressionSlope(values);

    const mean = calculateMean(values);
    const normalizedSlope = mean !== 0 ? slope / mean : 0;

    // Determine direction based on slope
    let direction: 'improving' | 'stable' | 'degrading';
    const slopeThreshold = 0.01; // 1% change per sample

    if (Math.abs(normalizedSlope) < slopeThreshold) {
      direction = 'stable';
    } else if (normalizedSlope < 0) {
      // Negative slope = values decreasing = improving (for most metrics)
      direction = 'improving';
    } else {
      direction = 'degrading';
    }

    // Calculate strength based on R-squared and slope magnitude
    const strength = Math.min(1, rSquared * Math.abs(normalizedSlope) * 10);

    // Predict next value
    const lastValue = values[values.length - 1];
    const predictedNext = (lastValue ?? 0) + slope;

    return {
      metric,
      direction,
      strength,
      slope,
      predictedNext: Math.max(0, predictedNext),
      rSquared,
      periodSamples: values.length,
      timestamp: Date.now(),
    };
  }

  /**
   * Detect anomalies in a value
   */
  detectAnomaly(value: number, baseline: MetricBaseline): AnomalyResult {
    const zScore = calculateZScore(value, baseline.mean, baseline.standardDeviation);
    const absZScore = Math.abs(zScore);

    // Calculate anomaly score (normalized)
    const score = Math.min(absZScore / this.config.anomalyThreshold, 2);

    // Determine expected range (3 sigma)
    const rangeMultiplier = 3;
    const expectedMin = baseline.mean - rangeMultiplier * baseline.standardDeviation;
    const expectedMax = baseline.mean + rangeMultiplier * baseline.standardDeviation;

    return {
      isAnomaly: absZScore > this.config.anomalyThreshold,
      score,
      zScore,
      isUpperOutlier: zScore > this.config.anomalyThreshold,
      isLowerOutlier: zScore < -this.config.anomalyThreshold,
      expectedRange: {
        min: Math.max(0, expectedMin),
        max: expectedMax,
      },
    };
  }

  /**
   * Get regression history
   */
  getRegressionHistory(limit?: number): RegressionEvent[] {
    const history = [...this.regressionHistory].reverse();
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Get summary of detector state
   */
  getSummary(): DetectorSummary {
    const recentCutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
    const recentRegressions = this.regressionHistory.filter(r => r.timestamp > recentCutoff);

    const regressingMetrics: string[] = [];
    for (const [metric, count] of this.consecutiveCounts) {
      if (count >= this.config.consecutiveThreshold) {
        regressingMetrics.push(metric);
      }
    }

    // Determine overall status
    let status: RegressionStatus = 'stable';
    if (regressingMetrics.length > 0) {
      status = 'regressing';
    } else {
      // Check if any metrics are improving
      let improvingCount = 0;
      for (const metric of this.baselines.keys()) {
        const trend = this.analyzeTrend(metric);
        if (trend?.direction === 'improving') {
          improvingCount++;
        }
      }
      if (improvingCount > this.baselines.size / 2) {
        status = 'improving';
      }
    }

    return {
      metricsTracked: this.samples.size,
      metricsWithBaselines: this.baselines.size,
      regressingMetrics,
      totalRegressions: this.regressionHistory.length,
      recentRegressions,
      status,
    };
  }

  /**
   * Reset detector state for a specific metric
   */
  resetMetric(metric: string): void {
    this.samples.delete(metric);
    this.baselines.delete(metric);
    this.consecutiveCounts.delete(metric);
    this.baselineUpdateTimers.delete(metric);
  }

  /**
   * Reset all detector state
   */
  reset(): void {
    this.samples.clear();
    this.baselines.clear();
    this.consecutiveCounts.clear();
    this.regressionHistory = [];
    this.baselineUpdateTimers.clear();
  }

  /**
   * Export current state for persistence
   */
  exportState(): {
    baselines: Record<string, MetricBaseline>;
    consecutiveCounts: Record<string, number>;
  } {
    return {
      baselines: Object.fromEntries(this.baselines),
      consecutiveCounts: Object.fromEntries(this.consecutiveCounts),
    };
  }

  /**
   * Import persisted state
   */
  importState(state: {
    baselines?: Record<string, MetricBaseline>;
    consecutiveCounts?: Record<string, number>;
  }): void {
    if (state.baselines) {
      this.baselines = new Map(Object.entries(state.baselines));
    }
    if (state.consecutiveCounts) {
      this.consecutiveCounts = new Map(Object.entries(state.consecutiveCounts));
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private maybeUpdateBaseline(metric: string): void {
    const samples = this.samples.get(metric);
    if (!samples) return;

    const existing = this.baselines.get(metric);
    const now = Date.now();

    // Check if we should update
    const shouldUpdate =
      !existing ||
      (samples.length >= this.config.minBaselineSamples &&
        now - (existing?.updatedAt || 0) > this.config.baselineUpdateInterval);

    if (!shouldUpdate) return;
    if (samples.length < this.config.minBaselineSamples) return;

    // Calculate new baseline
    const values = samples.map(s => s.value);
    const mean = calculateMean(values);
    const standardDeviation = calculateStandardDeviation(values, mean);
    const median = calculateMedian(values);
    const p95 = calculatePercentile(values, 95);
    const p99 = calculatePercentile(values, 99);
    const min = Math.min(...values);
    const max = Math.max(...values);

    const baseline: MetricBaseline = {
      name: metric,
      mean,
      standardDeviation,
      median,
      p95,
      p99,
      min,
      max,
      sampleCount: values.length,
      establishedAt: existing?.establishedAt || now,
      updatedAt: now,
    };

    this.baselines.set(metric, baseline);
    this.log(`Baseline updated for ${metric}: mean=${mean.toFixed(2)}, stdDev=${standardDeviation.toFixed(2)}`);
  }

  private checkRegression(
    metric: string,
    value: number,
    baseline: MetricBaseline,
    context?: Record<string, unknown>
  ): RegressionEvent | null {
    const zScore = calculateZScore(value, baseline.mean, baseline.standardDeviation);
    const deviation = baseline.mean !== 0 ? (value - baseline.mean) / baseline.mean : 0;

    // Check if this is a regression (higher values are worse for most metrics)
    const isRegression =
      zScore > this.config.zScoreThreshold || deviation > this.config.percentageThreshold;

    if (isRegression) {
      // Increment consecutive count
      const currentCount = (this.consecutiveCounts.get(metric) || 0) + 1;
      this.consecutiveCounts.set(metric, currentCount);

      // Only create event if we've hit the threshold
      if (currentCount >= this.config.consecutiveThreshold) {
        const severity = this.calculateSeverity(deviation);

        const event: RegressionEvent = {
          id: this.generateId(),
          metric,
          currentValue: value,
          baselineValue: baseline.mean,
          deviation: deviation * 100, // Convert to percentage
          zScore,
          severity,
          timestamp: Date.now(),
          consecutiveRegressions: currentCount,
          context,
        };

        this.regressionHistory.push(event);
        this.config.onRegression?.(event);
        this.log(`Regression detected for ${metric}: ${(deviation * 100).toFixed(1)}% deviation`);

        return event;
      }
    } else {
      // Reset consecutive count on recovery
      const previousCount = this.consecutiveCounts.get(metric) || 0;
      if (previousCount >= this.config.consecutiveThreshold) {
        this.config.onRecovery?.(metric, baseline);
        this.log(`Recovery detected for ${metric}`);
      }
      this.consecutiveCounts.set(metric, 0);
    }

    return null;
  }

  private calculateSeverity(deviation: number): RegressionSeverity {
    const absDeviation = Math.abs(deviation);
    const thresholds = this.config.severityThresholds;

    if (absDeviation >= thresholds.critical) return 'critical';
    if (absDeviation >= thresholds.severe) return 'severe';
    if (absDeviation >= thresholds.moderate) return 'moderate';
    return 'minor';
  }

  private generateId(): string {
    return `reg-${Date.now()}-${++this.idCounter}`;
  }

  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      console.log(`[RegressionDetector] ${message}`, ...args);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let detectorInstance: RegressionDetector | null = null;

/**
 * Get or create the global regression detector
 */
export function getRegressionDetector(
  config?: Partial<RegressionDetectorConfig>
): RegressionDetector {
  if (!detectorInstance) {
    detectorInstance = new RegressionDetector(config);
  }
  return detectorInstance;
}

/**
 * Reset the detector instance
 */
export function resetRegressionDetector(): void {
  detectorInstance?.reset();
  detectorInstance = null;
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Record a performance sample
 */
export function recordPerformanceSample(
  metric: string,
  value: number,
  context?: Record<string, unknown>
): RegressionEvent | null {
  return getRegressionDetector().recordSample({
    name: metric,
    value,
    timestamp: Date.now(),
    context,
  });
}

/**
 * Analyze performance trend for a metric
 */
export function analyzePerformanceTrend(metric: string): TrendAnalysis | null {
  return getRegressionDetector().analyzeTrend(metric);
}

/**
 * Get current regression summary
 */
export function getRegressionSummary(): DetectorSummary {
  return getRegressionDetector().getSummary();
}
