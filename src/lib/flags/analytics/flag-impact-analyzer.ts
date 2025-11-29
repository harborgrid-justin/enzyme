/**
 * @fileoverview Feature flag impact analysis for measuring flag effects.
 *
 * Provides impact analysis capabilities:
 * - Metric correlation with flag states
 * - A/B test results analysis
 * - Statistical significance testing
 * - Impact scoring and reporting
 *
 * @module flags/analytics/flag-impact-analyzer
 *
 * @example
 * ```typescript
 * const analyzer = new FlagImpactAnalyzer();
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
 * console.log(impact.metrics);
 * ```
 */

import type {
  VariantId,
  UserId,
  JsonValue,
} from '../advanced/types';
// import type { Mutable } from '../../utils/types';

// ============================================================================
// Types
// ============================================================================

/**
 * Metric data point.
 */
export interface MetricDataPoint {
  /** Metric name */
  readonly name: string;
  /** Metric value */
  readonly value: number;
  /** Associated flag key */
  readonly flagKey?: string;
  /** Associated variant */
  readonly variantId?: VariantId;
  /** User ID */
  readonly userId?: UserId;
  /** Session ID */
  readonly sessionId?: string;
  /** Timestamp */
  readonly timestamp: Date;
  /** Additional dimensions */
  readonly dimensions?: Record<string, JsonValue>;
}

/**
 * Metric statistics.
 */
export interface MetricStats {
  /** Metric name */
  readonly name: string;
  /** Number of data points */
  readonly count: number;
  /** Sum of values */
  readonly sum: number;
  /** Mean value */
  readonly mean: number;
  /** Median value */
  readonly median: number;
  /** Standard deviation */
  readonly stdDev: number;
  /** Minimum value */
  readonly min: number;
  /** Maximum value */
  readonly max: number;
  /** 25th percentile */
  readonly p25: number;
  /** 75th percentile */
  readonly p75: number;
  /** 95th percentile */
  readonly p95: number;
  /** 99th percentile */
  readonly p99: number;
}

/**
 * Variant comparison results.
 */
export interface VariantComparison {
  /** Control variant */
  readonly control: VariantId;
  /** Treatment variant */
  readonly treatment: VariantId;
  /** Metric name */
  readonly metric: string;
  /** Control stats */
  readonly controlStats: MetricStats;
  /** Treatment stats */
  readonly treatmentStats: MetricStats;
  /** Absolute difference */
  readonly absoluteDiff: number;
  /** Relative difference (lift) */
  readonly relativeDiff: number;
  /** P-value from statistical test */
  readonly pValue: number;
  /** Confidence interval */
  readonly confidenceInterval: {
    readonly lower: number;
    readonly upper: number;
    readonly level: number;
  };
  /** Is statistically significant */
  readonly isSignificant: boolean;
  /** Recommended action */
  readonly recommendation: 'winner' | 'loser' | 'inconclusive' | 'more_data_needed';
}

/**
 * Flag impact analysis result.
 */
export interface FlagImpactAnalysis {
  /** Flag key */
  readonly flagKey: string;
  /** Analysis timestamp */
  readonly analyzedAt: Date;
  /** Analysis period start */
  readonly periodStart: Date;
  /** Analysis period end */
  readonly periodEnd: Date;
  /** Total users in analysis */
  readonly totalUsers: number;
  /** Users per variant */
  readonly variantUsers: Record<VariantId, number>;
  /** Metrics analyzed */
  readonly metrics: string[];
  /** Metric comparisons */
  readonly comparisons: VariantComparison[];
  /** Overall impact score (-100 to 100) */
  readonly impactScore: number;
  /** Confidence in results */
  readonly confidence: 'low' | 'medium' | 'high';
  /** Summary */
  readonly summary: string;
}

/**
 * Impact analyzer configuration.
 */
export interface ImpactAnalyzerConfig {
  /** Enable analysis */
  readonly enabled?: boolean;
  /** Default control variant */
  readonly defaultControl?: VariantId;
  /** Significance threshold (p-value) */
  readonly significanceThreshold?: number;
  /** Minimum sample size for analysis */
  readonly minSampleSize?: number;
  /** Confidence level for intervals */
  readonly confidenceLevel?: number;
  /** Enable debug logging */
  readonly debug?: boolean;
  /** Maximum data points to store per metric */
  readonly maxDataPoints?: number;
}

/**
 * Input for recording a metric.
 */
export interface RecordMetricInput {
  /** Flag key */
  readonly flagKey?: string;
  /** Variant ID */
  readonly variantId?: VariantId;
  /** User ID */
  readonly userId?: UserId;
  /** Session ID */
  readonly sessionId?: string;
  /** Additional dimensions */
  readonly dimensions?: Record<string, JsonValue>;
}

// ============================================================================
// Statistical Utilities
// ============================================================================

/**
 * Calculate mean of values.
 */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculate standard deviation.
 */
function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const squareDiffs = values.map((v) => Math.pow(v - avg, 2));
  return Math.sqrt(mean(squareDiffs));
}

/**
 * Calculate percentile.
 */
function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower] ?? 0;
  return (sorted[lower] ?? 0) * (upper - index) + (sorted[upper] ?? 0) * (index - lower);
}

/**
 * Two-sample t-test for means comparison.
 */
function tTest(
  sample1: number[],
  sample2: number[]
): { tStatistic: number; pValue: number } {
  const n1 = sample1.length;
  const n2 = sample2.length;

  if (n1 < 2 || n2 < 2) {
    return { tStatistic: 0, pValue: 1 };
  }

  const mean1 = mean(sample1);
  const mean2 = mean(sample2);
  const var1 = Math.pow(standardDeviation(sample1), 2);
  const var2 = Math.pow(standardDeviation(sample2), 2);

  // Pooled standard error
  const se = Math.sqrt(var1 / n1 + var2 / n2);

  if (se === 0) {
    return { tStatistic: 0, pValue: 1 };
  }

  const tStatistic = (mean1 - mean2) / se;

  // Degrees of freedom (Welch-Satterthwaite)
  const df =
    Math.pow(var1 / n1 + var2 / n2, 2) /
    (Math.pow(var1 / n1, 2) / (n1 - 1) + Math.pow(var2 / n2, 2) / (n2 - 1));

  // Approximate p-value using t-distribution
  // Using a simplified approximation for two-tailed test
  const pValue = approximateTDistribution(Math.abs(tStatistic), df);

  return { tStatistic, pValue };
}

/**
 * Approximate p-value from t-distribution.
 * Using a simplified approximation for the cumulative distribution.
 */
function approximateTDistribution(t: number, df: number): number {
  // Simple approximation for large df
  if (df > 100) {
    // Use normal approximation
    const z = t;
    // Approximate using error function
    const p = 2 * (1 - normalCDF(Math.abs(z)));
    return p;
  }

  // For smaller df, use a simple approximation
  const a = df / (df + t * t);
  const b = Math.pow(a, df / 2);
  const p = 1 - b;
  return Math.min(1, Math.max(0, p));
}

/**
 * Standard normal CDF approximation.
 */
function normalCDF(z: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * z);
  const y =
    1.0 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Calculate confidence interval for difference of means.
 */
function confidenceInterval(
  sample1: number[],
  sample2: number[],
  level: number
): { lower: number; upper: number } {
  const n1 = sample1.length;
  const n2 = sample2.length;

  if (n1 < 2 || n2 < 2) {
    return { lower: 0, upper: 0 };
  }

  const mean1 = mean(sample1);
  const mean2 = mean(sample2);
  const var1 = Math.pow(standardDeviation(sample1), 2);
  const var2 = Math.pow(standardDeviation(sample2), 2);

  const se = Math.sqrt(var1 / n1 + var2 / n2);
  const diff = mean1 - mean2;

  // Z-score for confidence level (approximate)
  const zScores: Record<number, number> = {
    0.9: 1.645,
    0.95: 1.96,
    0.99: 2.576,
  };
  const z = zScores[level] ?? 1.96;

  return {
    lower: diff - z * se,
    upper: diff + z * se,
  };
}

// ============================================================================
// Impact Analyzer
// ============================================================================

/**
 * Analyzes the impact of feature flags on metrics.
 */
export class FlagImpactAnalyzer {
  private config: Required<ImpactAnalyzerConfig>;
  private metrics = new Map<string, MetricDataPoint[]>();
  private flagMetrics = new Map<string, Map<string, MetricDataPoint[]>>();

  constructor(config: ImpactAnalyzerConfig = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      defaultControl: config.defaultControl ?? 'control',
      significanceThreshold: config.significanceThreshold ?? 0.05,
      minSampleSize: config.minSampleSize ?? 30,
      confidenceLevel: config.confidenceLevel ?? 0.95,
      debug: config.debug ?? false,
      maxDataPoints: config.maxDataPoints ?? 10000,
    };
  }

  // ==========================================================================
  // Metric Recording
  // ==========================================================================

  /**
   * Record a metric value.
   */
  recordMetric(name: string, value: number, input: RecordMetricInput = {}): void {
    if (!this.config.enabled) {
      return;
    }

    const dataPoint: MetricDataPoint = {
      name,
      value,
      flagKey: input.flagKey,
      variantId: input.variantId,
      userId: input.userId,
      sessionId: input.sessionId,
      timestamp: new Date(),
      dimensions: input.dimensions,
    };

    // Store in general metrics
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    const metricList = this.metrics.get(name);
    metricList.push(dataPoint);
    this.enforceMaxDataPoints(metricList);

    // Store in flag-specific metrics
    if (input.flagKey !== undefined && input.flagKey !== '' && input.variantId !== undefined && input.variantId !== '') {
      const {flagKey} = input;
      if (!this.flagMetrics.has(flagKey)) {
        this.flagMetrics.set(flagKey, new Map());
      }
      const flagMap = this.flagMetrics.get(flagKey);

      const key = `${name}:${input.variantId}`;
      if (!flagMap.has(key)) {
        flagMap.set(key, []);
      }
      const flagMetricList = flagMap.get(key);
      flagMetricList.push(dataPoint);
      this.enforceMaxDataPoints(flagMetricList);
    }

    this.log(`Recorded metric: ${name} = ${value}`);
  }

  /**
   * Record multiple metrics at once.
   */
  recordMetrics(
    metrics: Array<{ name: string; value: number }>,
    input: RecordMetricInput = {}
  ): void {
    for (const { name, value } of metrics) {
      this.recordMetric(name, value, input);
    }
  }

  private enforceMaxDataPoints(list: MetricDataPoint[]): void {
    while (list.length > this.config.maxDataPoints) {
      list.shift();
    }
  }

  // ==========================================================================
  // Metric Statistics
  // ==========================================================================

  /**
   * Calculate statistics for a metric.
   */
  getMetricStats(name: string, filter?: (dp: MetricDataPoint) => boolean): MetricStats | null {
    const dataPoints = this.metrics.get(name);
    if (!dataPoints || dataPoints.length === 0) {
      return null;
    }

    const filtered = filter ? dataPoints.filter(filter) : dataPoints;
    if (filtered.length === 0) {
      return null;
    }

    const values = filtered.map((dp) => dp.value);
    return this.calculateStats(name, values);
  }

  /**
   * Calculate statistics for a metric by variant.
   */
  getVariantStats(
    flagKey: string,
    metric: string,
    variantId: VariantId
  ): MetricStats | null {
    const flagMap = this.flagMetrics.get(flagKey);
    if (!flagMap) {
      return null;
    }

    const key = `${metric}:${variantId}`;
    const dataPoints = flagMap.get(key);
    if (!dataPoints || dataPoints.length === 0) {
      return null;
    }

    const values = dataPoints.map((dp) => dp.value);
    return this.calculateStats(metric, values);
  }

  private calculateStats(name: string, values: number[]): MetricStats {
    const sorted = [...values].sort((a, b) => a - b);

    return {
      name,
      count: values.length,
      sum: values.reduce((sum, v) => sum + v, 0),
      mean: mean(values),
      median: percentile(values, 50),
      stdDev: standardDeviation(values),
      min: sorted[0] ?? 0,
      max: sorted[sorted.length - 1] ?? 0,
      p25: percentile(values, 25),
      p75: percentile(values, 75),
      p95: percentile(values, 95),
      p99: percentile(values, 99),
    };
  }

  // ==========================================================================
  // Impact Analysis
  // ==========================================================================

  /**
   * Compare two variants for a metric.
   */
  compareVariants(
    flagKey: string,
    metric: string,
    controlVariant: VariantId,
    treatmentVariant: VariantId
  ): VariantComparison | null {
    const controlStats = this.getVariantStats(flagKey, metric, controlVariant);
    const treatmentStats = this.getVariantStats(flagKey, metric, treatmentVariant);

    if (!controlStats || !treatmentStats) {
      return null;
    }

    // Get raw values for statistical tests
    const controlValues = this.getVariantValues(flagKey, metric, controlVariant);
    const treatmentValues = this.getVariantValues(flagKey, metric, treatmentVariant);

    // Perform t-test
    const { pValue } = tTest(treatmentValues, controlValues);

    // Calculate confidence interval
    const ci = confidenceInterval(
      treatmentValues,
      controlValues,
      this.config.confidenceLevel
    );

    const absoluteDiff = treatmentStats.mean - controlStats.mean;
    const relativeDiff =
      controlStats.mean !== 0
        ? ((treatmentStats.mean - controlStats.mean) / controlStats.mean) * 100
        : 0;

    const isSignificant = pValue < this.config.significanceThreshold;

    // Determine recommendation
    let recommendation: VariantComparison['recommendation'] = 'inconclusive';
    if (controlStats.count < this.config.minSampleSize ||
        treatmentStats.count < this.config.minSampleSize) {
      recommendation = 'more_data_needed';
    } else if (isSignificant) {
      recommendation = absoluteDiff > 0 ? 'winner' : 'loser';
    }

    return {
      control: controlVariant,
      treatment: treatmentVariant,
      metric,
      controlStats,
      treatmentStats,
      absoluteDiff,
      relativeDiff,
      pValue,
      confidenceInterval: {
        lower: ci.lower,
        upper: ci.upper,
        level: this.config.confidenceLevel,
      },
      isSignificant,
      recommendation,
    };
  }

  private getVariantValues(
    flagKey: string,
    metric: string,
    variantId: VariantId
  ): number[] {
    const flagMap = this.flagMetrics.get(flagKey);
    if (!flagMap) {
      return [];
    }

    const key = `${metric}:${variantId}`;
    const dataPoints = flagMap.get(key);
    if (!dataPoints) {
      return [];
    }

    return dataPoints.map((dp) => dp.value);
  }

  /**
   * Analyze impact of a flag across all metrics.
   */
  analyzeImpact(
    flagKey: string,
    controlVariant?: VariantId
  ): FlagImpactAnalysis | null {
    const flagMap = this.flagMetrics.get(flagKey);
    if (!flagMap) {
      return null;
    }

    const control = controlVariant ?? this.config.defaultControl;
    const now = new Date();

    // Find all metrics and variants
    const metricsSet = new Set<string>();
    const variantsSet = new Set<VariantId>();
    let periodStart = now;
    let periodEnd = new Date(0);
    const userSet = new Set<string>();

    for (const [key, dataPoints] of flagMap.entries()) {
      const [metric, variant] = key.split(':');
      if (metric !== undefined && metric !== '') metricsSet.add(metric);
      if (variant !== undefined && variant !== '') variantsSet.add(variant);

      for (const dp of dataPoints) {
        if (dp.timestamp < periodStart) {
          periodStart = dp.timestamp;
        }
        if (dp.timestamp > periodEnd) {
          periodEnd = dp.timestamp;
        }
        if (dp.userId !== undefined && dp.userId !== '') {
          userSet.add(dp.userId);
        }
      }
    }

    const metrics = Array.from(metricsSet);
    const variants = Array.from(variantsSet);
    const treatmentVariants = variants.filter((v) => v !== control);

    // Run comparisons
    const comparisons: VariantComparison[] = [];
    for (const metric of metrics) {
      for (const treatment of treatmentVariants) {
        const comparison = this.compareVariants(flagKey, metric, control, treatment);
        if (comparison) {
          comparisons.push(comparison);
        }
      }
    }

    // Calculate variant users
    const variantUsers: Record<VariantId, number> = {};
    for (const variant of variants) {
      const userIds = new Set<string>();
      for (const [key, dataPoints] of flagMap.entries()) {
        if (key.endsWith(`:${variant}`)) {
          for (const dp of dataPoints) {
            if (dp.userId !== undefined && dp.userId !== '') {
              userIds.add(dp.userId);
            }
          }
        }
      }
      variantUsers[variant] = userIds.size;
    }

    // Calculate overall impact score
    const impactScore = this.calculateImpactScore(comparisons);
    const confidence = this.determineConfidence(comparisons, variantUsers);

    // Generate summary
    const summary = this.generateSummary(comparisons, impactScore);

    return {
      flagKey,
      analyzedAt: now,
      periodStart,
      periodEnd,
      totalUsers: userSet.size,
      variantUsers,
      metrics,
      comparisons,
      impactScore,
      confidence,
      summary,
    };
  }

  private calculateImpactScore(comparisons: VariantComparison[]): number {
    if (comparisons.length === 0) {
      return 0;
    }

    let totalScore = 0;
    let significantCount = 0;

    for (const comparison of comparisons) {
      if (comparison.isSignificant) {
        significantCount++;
        // Score based on relative difference (capped at -100 to 100)
        const score = Math.max(-100, Math.min(100, comparison.relativeDiff));
        totalScore += score;
      }
    }

    if (significantCount === 0) {
      return 0;
    }

    return Math.round(totalScore / significantCount);
  }

  private determineConfidence(
    comparisons: VariantComparison[],
    variantUsers: Record<VariantId, number>
  ): 'low' | 'medium' | 'high' {
    // Check sample sizes
    const totalUsers = Object.values(variantUsers).reduce((sum, n) => sum + n, 0);
    if (totalUsers < this.config.minSampleSize * 2) {
      return 'low';
    }

    // Check significance
    const significantCount = comparisons.filter((c) => c.isSignificant).length;
    const significanceRatio = significantCount / comparisons.length;

    if (significanceRatio >= 0.7 && totalUsers >= this.config.minSampleSize * 10) {
      return 'high';
    }

    if (significanceRatio >= 0.3) {
      return 'medium';
    }

    return 'low';
  }

  private generateSummary(
    comparisons: VariantComparison[],
    impactScore: number
  ): string {
    if (comparisons.length === 0) {
      return 'No data available for analysis.';
    }

    const winners = comparisons.filter((c) => c.recommendation === 'winner');
    const losers = comparisons.filter((c) => c.recommendation === 'loser');
    const needsData = comparisons.filter(
      (c) => c.recommendation === 'more_data_needed'
    );

    const parts: string[] = [];

    if (winners.length > 0) {
      parts.push(
        `${winners.length} metric(s) show significant positive impact`
      );
    }

    if (losers.length > 0) {
      parts.push(`${losers.length} metric(s) show significant negative impact`);
    }

    if (needsData.length > 0) {
      parts.push(`${needsData.length} metric(s) need more data`);
    }

    if (parts.length === 0) {
      parts.push('No significant impact detected');
    }

    let impactDirection: string;
    if (impactScore > 0) {
      impactDirection = 'positive';
    } else if (impactScore < 0) {
      impactDirection = 'negative';
    } else {
      impactDirection = 'neutral';
    }
    parts.push(`Overall impact: ${impactDirection} (score: ${impactScore})`);

    return `${parts.join('. ')  }.`;
  }

  // ==========================================================================
  // Queries
  // ==========================================================================

  /**
   * Get all recorded metrics.
   */
  getMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }

  /**
   * Get all flags with metrics.
   */
  getFlagKeys(): string[] {
    return Array.from(this.flagMetrics.keys());
  }

  /**
   * Get metrics for a flag.
   */
  getFlagMetrics(flagKey: string): string[] {
    const flagMap = this.flagMetrics.get(flagKey);
    if (!flagMap) {
      return [];
    }

    const metrics = new Set<string>();
    for (const key of flagMap.keys()) {
      const [metric] = key.split(':');
      if (metric !== undefined && metric !== '') metrics.add(metric);
    }

    return Array.from(metrics);
  }

  /**
   * Get variants for a flag.
   */
  getFlagVariants(flagKey: string): VariantId[] {
    const flagMap = this.flagMetrics.get(flagKey);
    if (!flagMap) {
      return [];
    }

    const variants = new Set<VariantId>();
    for (const key of flagMap.keys()) {
      const parts = key.split(':');
      if (parts.length > 1 && parts[1] !== undefined && parts[1] !== '') {
        variants.add(parts[1]);
      }
    }

    return Array.from(variants);
  }

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  /**
   * Clear all data.
   */
  clear(): void {
    this.metrics.clear();
    this.flagMetrics.clear();
    this.log('All data cleared');
  }

  /**
   * Clear data for a specific flag.
   */
  clearFlag(flagKey: string): void {
    this.flagMetrics.delete(flagKey);
    this.log(`Data cleared for flag: ${flagKey}`);
  }

  /**
   * Enable or disable analysis.
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  // ==========================================================================
  // Export
  // ==========================================================================

  /**
   * Export all data as JSON.
   */
  exportData(): {
    metrics: Record<string, MetricDataPoint[]>;
    flagMetrics: Record<string, Record<string, MetricDataPoint[]>>;
  } {
    const metrics: Record<string, MetricDataPoint[]> = {};
    for (const [name, dataPoints] of this.metrics.entries()) {
      metrics[name] = dataPoints;
    }

    const flagMetrics: Record<string, Record<string, MetricDataPoint[]>> = {};
    for (const [flagKey, flagMap] of this.flagMetrics.entries()) {
      flagMetrics[flagKey] = {};
      for (const [key, dataPoints] of flagMap.entries()) {
        flagMetrics[flagKey][key] = dataPoints;
      }
    }

    return { metrics, flagMetrics };
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      // eslint-disable-next-line no-console
      console.log(`[FlagImpactAnalyzer] ${message}`, ...args);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let instance: FlagImpactAnalyzer | null = null;

/**
 * Get the singleton impact analyzer instance.
 */
export function getImpactAnalyzer(): FlagImpactAnalyzer {
  instance ??= new FlagImpactAnalyzer();
  return instance;
}

/**
 * Initialize the singleton with configuration.
 */
export function initImpactAnalyzer(config: ImpactAnalyzerConfig): FlagImpactAnalyzer {
  instance = new FlagImpactAnalyzer(config);
  return instance;
}

/**
 * Reset the singleton instance.
 */
export function resetImpactAnalyzer(): void {
  instance = null;
}
