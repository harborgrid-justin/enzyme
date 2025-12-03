/**
 * @file Performance Budget System
 * @description Comprehensive performance budget management with:
 * - Configurable budgets per metric
 * - Budget violation alerts and callbacks
 * - Automatic performance degradation strategies
 * - Budget trending and history tracking
 * - Statistical analysis of budget adherence
 *
 * This system provides fine-grained control over performance budgets,
 * enabling proactive performance management and automatic adaptation
 * when budgets are exceeded.
 *
 * @example
 * ```typescript
 * import { PerformanceBudgetManager } from '@/lib/performance';
 *
 * const budgetManager = new PerformanceBudgetManager({
 *   budgets: {
 *     'LCP': { warning: 2000, critical: 2500, unit: 'ms' },
 *     'bundle.initial': { warning: 150000, critical: 200000, unit: 'bytes' },
 *   },
 *   onViolation: (violation) => {
 *     analytics.track('performance_budget_violation', violation);
 *   },
 * });
 *
 * // Record metrics
 * budgetManager.record('LCP', 2100); // Triggers warning
 * budgetManager.record('bundle.initial', 250000); // Triggers critical
 * ```
 */

import {
  VITAL_THRESHOLDS,
  BUNDLE_BUDGET,
  RUNTIME_BUDGET,
  formatBytes,
  formatDuration,
} from '../../config/performance.config';

// ============================================================================
// Types
// ============================================================================

/**
 * Budget threshold configuration
 */
export interface BudgetThreshold {
  /** Warning threshold value */
  readonly warning: number;
  /** Critical threshold value */
  readonly critical: number;
  /** Unit of measurement */
  readonly unit: 'ms' | 'bytes' | 'score' | 'count' | 'percent' | 'fps';
  /** Human-readable description */
  readonly description?: string;
  /** Enable automatic degradation when exceeded */
  readonly enableDegradation?: boolean;
  /** Degradation strategy */
  readonly degradationStrategy?: DegradationStrategy;
}

/**
 * Degradation strategy for when budgets are exceeded
 */
export type DegradationStrategy =
  | 'reduce-animations'
  | 'reduce-images'
  | 'reduce-features'
  | 'reduce-polling'
  | 'defer-non-critical'
  | 'custom';

/**
 * Budget violation severity
 */
export type ViolationSeverity = 'warning' | 'critical';

/**
 * Budget violation record
 */
export interface BudgetViolationRecord {
  readonly id: string;
  readonly budgetName: string;
  readonly value: number;
  readonly threshold: number;
  readonly severity: ViolationSeverity;
  readonly overage: number;
  readonly overagePercent: number;
  readonly timestamp: number;
  readonly url: string;
  readonly userAgent: string;
  readonly sessionId: string;
}

/**
 * Budget metric entry
 */
export interface BudgetMetricEntry {
  readonly budgetName: string;
  readonly value: number;
  readonly timestamp: number;
  readonly status: 'ok' | 'warning' | 'critical';
  readonly percentOfBudget: number;
}

/**
 * Budget trend data
 */
export interface BudgetTrend {
  readonly budgetName: string;
  readonly entries: BudgetMetricEntry[];
  readonly average: number;
  readonly min: number;
  readonly max: number;
  readonly p50: number;
  readonly p75: number;
  readonly p90: number;
  readonly p99: number;
  readonly trend: 'improving' | 'stable' | 'degrading';
  readonly violationRate: number;
  readonly lastUpdated: number;
}

/**
 * Budget status summary
 */
export interface BudgetStatusSummary {
  readonly budgetName: string;
  readonly threshold: BudgetThreshold;
  readonly currentValue: number | null;
  readonly status: 'ok' | 'warning' | 'critical' | 'unknown';
  readonly trend: BudgetTrend | null;
  readonly recentViolations: BudgetViolationRecord[];
}

/**
 * Degradation state
 */
export interface DegradationState {
  readonly isActive: boolean;
  readonly level: 'none' | 'light' | 'moderate' | 'aggressive';
  readonly activeStrategies: DegradationStrategy[];
  readonly reason: string | null;
  readonly activatedAt: number | null;
}

/**
 * Budget manager configuration
 */
export interface BudgetManagerConfig {
  /** Custom budget definitions */
  readonly budgets?: Record<string, BudgetThreshold>;
  /** Violation callback */
  readonly onViolation?: (violation: BudgetViolationRecord) => void;
  /** Recovery callback (when metric returns to ok) */
  readonly onRecovery?: (budgetName: string) => void;
  /** Degradation state change callback */
  readonly onDegradationChange?: (state: DegradationState) => void;
  /** History retention period (ms) */
  readonly historyRetention?: number;
  /** Maximum history entries per budget */
  readonly maxHistoryEntries?: number;
  /** Enable automatic degradation */
  readonly enableAutoDegradation?: boolean;
  /** Consecutive violations before degradation */
  readonly degradationThreshold?: number;
  /** Session ID for tracking */
  readonly sessionId?: string;
  /** Enable debug logging */
  readonly debug?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default budget definitions combining Core Web Vitals and resource budgets
 */
export const DEFAULT_BUDGETS: Record<string, BudgetThreshold> = {
  // Core Web Vitals
  LCP: {
    warning: VITAL_THRESHOLDS.LCP?.good ?? 2500,
    critical: VITAL_THRESHOLDS.LCP?.needsImprovement ?? 4000,
    unit: 'ms',
    description: 'Largest Contentful Paint',
    enableDegradation: true,
    degradationStrategy: 'reduce-images',
  },
  INP: {
    warning: VITAL_THRESHOLDS.INP?.good ?? 200,
    critical: VITAL_THRESHOLDS.INP?.needsImprovement ?? 500,
    unit: 'ms',
    description: 'Interaction to Next Paint',
    enableDegradation: true,
    degradationStrategy: 'reduce-animations',
  },
  CLS: {
    warning: VITAL_THRESHOLDS.CLS?.good ?? 0.1,
    critical: VITAL_THRESHOLDS.CLS?.needsImprovement ?? 0.25,
    unit: 'score',
    description: 'Cumulative Layout Shift',
  },
  FCP: {
    warning: VITAL_THRESHOLDS.FCP?.good ?? 1800,
    critical: VITAL_THRESHOLDS.FCP?.needsImprovement ?? 3000,
    unit: 'ms',
    description: 'First Contentful Paint',
  },
  TTFB: {
    warning: VITAL_THRESHOLDS.TTFB?.good ?? 800,
    critical: VITAL_THRESHOLDS.TTFB?.needsImprovement ?? 1800,
    unit: 'ms',
    description: 'Time to First Byte',
  },

  // Bundle budgets
  'bundle.initial': {
    warning: BUNDLE_BUDGET.initial * BUNDLE_BUDGET.warningThreshold,
    critical: BUNDLE_BUDGET.initial,
    unit: 'bytes',
    description: 'Initial bundle size',
    enableDegradation: true,
    degradationStrategy: 'defer-non-critical',
  },
  'bundle.async': {
    warning: BUNDLE_BUDGET.asyncChunk * BUNDLE_BUDGET.warningThreshold,
    critical: BUNDLE_BUDGET.asyncChunk,
    unit: 'bytes',
    description: 'Async chunk size',
  },
  'bundle.vendor': {
    warning: BUNDLE_BUDGET.vendor * BUNDLE_BUDGET.warningThreshold,
    critical: BUNDLE_BUDGET.vendor,
    unit: 'bytes',
    description: 'Vendor bundle size',
  },
  'bundle.total': {
    warning: BUNDLE_BUDGET.total * BUNDLE_BUDGET.warningThreshold,
    critical: BUNDLE_BUDGET.total,
    unit: 'bytes',
    description: 'Total bundle size',
  },

  // Runtime budgets
  'runtime.jsPerFrame': {
    warning: RUNTIME_BUDGET.jsExecutionPerFrame * 0.8,
    critical: RUNTIME_BUDGET.jsExecutionPerFrame,
    unit: 'ms',
    description: 'JS execution per frame',
    enableDegradation: true,
    degradationStrategy: 'reduce-animations',
  },
  'runtime.fps': {
    warning: 50,
    critical: 30,
    unit: 'fps',
    description: 'Frames per second',
    enableDegradation: true,
    degradationStrategy: 'reduce-animations',
  },

  // Memory budgets
  'memory.heapUsage': {
    warning: 70,
    critical: 90,
    unit: 'percent',
    description: 'JS heap usage percentage',
    enableDegradation: true,
    degradationStrategy: 'reduce-features',
  },

  // Long task budgets
  'longTask.count': {
    warning: 5,
    critical: 10,
    unit: 'count',
    description: 'Long tasks per page load',
  },
  'longTask.totalBlockingTime': {
    warning: 200,
    critical: 600,
    unit: 'ms',
    description: 'Total blocking time',
  },
} as const;

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<BudgetManagerConfig> = {
  budgets: DEFAULT_BUDGETS,
  onViolation: () => {},
  onRecovery: () => {},
  onDegradationChange: () => {},
  historyRetention: 24 * 60 * 60 * 1000, // 24 hours
  maxHistoryEntries: 1000,
  enableAutoDegradation: true,
  degradationThreshold: 3,
  sessionId: generateSessionId(),
  debug: false,
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate unique ID
 */
function generateId(): string {
  return `budget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate percentile from sorted array
 */
function percentile(sortedArr: number[], p: number): number {
  if (sortedArr.length === 0) return 0;
  const index = Math.ceil((p / 100) * sortedArr.length) - 1;
  const safeIndex = Math.max(0, Math.min(index, sortedArr.length - 1));
  const value = sortedArr[safeIndex];
  return value ?? 0;
}

/**
 * Format value based on unit
 */
export function formatBudgetValue(value: number, unit: BudgetThreshold['unit']): string {
  switch (unit) {
    case 'ms':
      return formatDuration(value);
    case 'bytes':
      return formatBytes(value);
    case 'score':
      return value.toFixed(3);
    case 'count':
      return Math.round(value).toString();
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'fps':
      return `${Math.round(value)} fps`;
    default:
      return value.toString();
  }
}

// ============================================================================
// Performance Budget Manager
// ============================================================================

/**
 * Comprehensive performance budget management system
 */
export class PerformanceBudgetManager {
  private readonly config: Required<BudgetManagerConfig>;
  private readonly budgets: Map<string, BudgetThreshold>;
  private readonly history: Map<string, BudgetMetricEntry[]>;
  private readonly violations: BudgetViolationRecord[];
  private readonly currentValues: Map<string, number>;
  private readonly consecutiveViolations: Map<string, number>;
  private degradationState: DegradationState;

  constructor(config: BudgetManagerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.budgets = new Map(Object.entries({ ...DEFAULT_BUDGETS, ...config.budgets }));
    this.history = new Map();
    this.violations = [];
    this.currentValues = new Map();
    this.consecutiveViolations = new Map();
    this.degradationState = {
      isActive: false,
      level: 'none',
      activeStrategies: [],
      reason: null,
      activatedAt: null,
    };

    // Initialize history maps
    this.budgets.forEach((_, name) => {
      this.history.set(name, []);
      this.consecutiveViolations.set(name, 0);
    });
  }

  // ==========================================================================
  // Budget Management
  // ==========================================================================

  /**
   * Register a custom budget
   */
  public registerBudget(name: string, threshold: BudgetThreshold): void {
    this.budgets.set(name, threshold);
    this.history.set(name, []);
    this.consecutiveViolations.set(name, 0);
    this.log(`Registered budget: ${name}`);
  }

  /**
   * Update an existing budget threshold
   */
  public updateBudget(name: string, updates: Partial<BudgetThreshold>): void {
    const existing = this.budgets.get(name);
    if (existing === undefined) {
      throw new Error(`Budget "${name}" not found`);
    }

    this.budgets.set(name, { ...existing, ...updates });
    this.log(`Updated budget: ${name}`);
  }

  /**
   * Remove a budget
   */
  public removeBudget(name: string): void {
    this.budgets.delete(name);
    this.history.delete(name);
    this.consecutiveViolations.delete(name);
    this.currentValues.delete(name);
    this.log(`Removed budget: ${name}`);
  }

  /**
   * Get budget threshold
   */
  public getBudget(name: string): BudgetThreshold | undefined {
    return this.budgets.get(name);
  }

  /**
   * Get all budgets
   */
  public getAllBudgets(): Map<string, BudgetThreshold> {
    return new Map(this.budgets);
  }

  // ==========================================================================
  // Metric Recording
  // ==========================================================================

  /**
   * Record a metric value
   */
  public record(budgetName: string, value: number): BudgetMetricEntry {
    const threshold = this.budgets.get(budgetName);
    if (threshold === undefined) {
      throw new Error(`Budget "${budgetName}" not found`);
    }

    const status = this.evaluateStatus(value, threshold);
    const percentOfBudget = this.calculatePercentOfBudget(value, threshold);

    const entry: BudgetMetricEntry = {
      budgetName,
      value,
      timestamp: Date.now(),
      status,
      percentOfBudget,
    };

    // Update current value
    const previousValue = this.currentValues.get(budgetName);
    const previousStatus = previousValue !== undefined
      ? this.evaluateStatus(previousValue, threshold)
      : 'ok';
    this.currentValues.set(budgetName, value);

    // Add to history
    const historyEntries = this.history.get(budgetName) ?? [];
    historyEntries.push(entry);
    this.trimHistory(budgetName);

    // Handle status changes
    if (status !== 'ok') {
      this.handleViolation(budgetName, value, threshold, status);
    } else if (previousStatus !== 'ok') {
      // Recovered from violation
      this.handleRecovery(budgetName);
    }

    this.log(`Recorded ${budgetName}: ${formatBudgetValue(value, threshold.unit)} (${status})`);
    return entry;
  }

  /**
   * Batch record multiple metrics
   */
  public recordBatch(metrics: Record<string, number>): BudgetMetricEntry[] {
    return Object.entries(metrics).map(([name, value]) => this.record(name, value));
  }

  /**
   * Deactivate degradation
   */
  public deactivateDegradation(): void {
    const newState: DegradationState = {
      isActive: false,
      level: 'none',
      activeStrategies: [],
      reason: null,
      activatedAt: null,
    };

    this.degradationState = newState;
    this.config.onDegradationChange(newState);
    this.log('Degradation deactivated');
  }

  /**
   * Get current degradation state
   */
  public getDegradationState(): DegradationState {
    return { ...this.degradationState };
  }

  // ==========================================================================
  // Violation Handling
  // ==========================================================================

  /**
   * Check if a specific strategy is active
   */
  public isStrategyActive(strategy: DegradationStrategy): boolean {
    return this.degradationState.activeStrategies.includes(strategy);
  }

  /**
   * Get trend data for a budget
   */
  public getTrend(budgetName: string): BudgetTrend | null {
    const entries = this.history.get(budgetName);
    if (entries === undefined || entries.length === 0) return null;

    const values = entries.map((e) => e.value).sort((a, b) => a - b);
    const average = values.reduce((a, b) => a + b, 0) / values.length;

    // Calculate trend direction
    const trend = this.calculateTrendDirection(entries);

    // Calculate violation rate
    const violations = entries.filter((e) => e.status !== 'ok').length;
    const violationRate = (violations / entries.length) * 100;

    const [minValue] = values;
    const maxValue = values[values.length - 1];

    return {
      budgetName,
      entries: [...entries],
      average,
      min: minValue ?? 0,
      max: maxValue ?? 0,
      p50: percentile(values, 50),
      p75: percentile(values, 75),
      p90: percentile(values, 90),
      p99: percentile(values, 99),
      trend,
      violationRate,
      lastUpdated: Date.now(),
    };
  }

  // ==========================================================================
  // Degradation Management
  // ==========================================================================

  /**
   * Get all trends
   */
  public getAllTrends(): Map<string, BudgetTrend | null> {
    const trends = new Map<string, BudgetTrend | null>();
    this.budgets.forEach((_, name) => {
      trends.set(name, this.getTrend(name));
    });
    return trends;
  }

  /**
   * Get status summary for a budget
   */
  public getStatus(budgetName: string): BudgetStatusSummary | null {
    const threshold = this.budgets.get(budgetName);
    if (threshold === undefined) return null;

    const currentValue = this.currentValues.get(budgetName) ?? null;
    const status = currentValue !== null
      ? this.evaluateStatus(currentValue, threshold)
      : 'unknown';

    const recentViolations = this.violations
      .filter((v) => v.budgetName === budgetName)
      .slice(-10);

    return {
      budgetName,
      threshold,
      currentValue,
      status,
      trend: this.getTrend(budgetName),
      recentViolations,
    };
  }

  /**
   * Get all status summaries
   */
  public getAllStatuses(): BudgetStatusSummary[] {
    const statuses: BudgetStatusSummary[] = [];
    this.budgets.forEach((_, name) => {
      const status = this.getStatus(name);
      if (status) statuses.push(status);
    });
    return statuses;
  }

  /**
   * Get all violations
   */
  public getViolations(): BudgetViolationRecord[] {
    return [...this.violations];
  }

  /**
   * Get violations for a specific budget
   */
  public getViolationsFor(budgetName: string): BudgetViolationRecord[] {
    return this.violations.filter((v) => v.budgetName === budgetName);
  }

  /**
   * Get overall health score (0-100)
   */
  public getHealthScore(): number {
    let totalScore = 0;
    let count = 0;

    this.budgets.forEach((threshold, name) => {
      const value = this.currentValues.get(name);
      if (value !== undefined) {
        const percent = this.calculatePercentOfBudget(value, threshold);
        // Convert to health score (lower percent = higher score)
        const score = Math.max(0, Math.min(100, 100 - (percent - 100)));
        totalScore += score;
        count++;
      }
    });

    return count > 0 ? Math.round(totalScore / count) : 100;
  }

  // ==========================================================================
  // Trending & Analysis
  // ==========================================================================

  /**
   * Generate report
   */
  public generateReport(): string {
    const statuses = this.getAllStatuses();
    const healthScore = this.getHealthScore();
    const degradation = this.getDegradationState();

    const lines = [
      '='.repeat(60),
      'PERFORMANCE BUDGET REPORT',
      '='.repeat(60),
      '',
      `Generated: ${new Date().toISOString()}`,
      `Health Score: ${healthScore}/100`,
      `Degradation: ${degradation.isActive ? `Active (${degradation.level})` : 'Inactive'}`,
      '',
      '--- Budget Status ---',
      '',
    ];

    statuses.forEach((status) => {
      const value = status.currentValue !== null
        ? formatBudgetValue(status.currentValue, status.threshold.unit)
        : 'N/A';
      let indicator: string;
      if (status.status === 'ok') {
        indicator = '[OK]';
      } else if (status.status === 'warning') {
        indicator = '[WARN]';
      } else {
        indicator = '[CRIT]';
      }
      lines.push(`${indicator} ${status.budgetName}: ${value}`);
    });

    if (this.violations.length > 0) {
      lines.push('');
      lines.push('--- Recent Violations ---');
      lines.push('');
      this.violations.slice(-10).forEach((v) => {
        const threshold = this.budgets.get(v.budgetName);
        const unit = threshold?.unit ?? 'ms';
        lines.push(
          `  - ${v.budgetName}: ${formatBudgetValue(v.value, unit)} ` +
          `(${v.severity}, +${v.overagePercent.toFixed(1)}%)`
        );
      });
    }

    lines.push('');
    lines.push('='.repeat(60));

    return lines.join('\n');
  }

  /**
   * Clear all history
   */
  public clearHistory(): void {
    this.history.forEach((_, key) => {
      this.history.set(key, []);
    });
    this.violations.length = 0;
    this.log('History cleared');
  }

  /**
   * Evaluate metric status against threshold
   */
  private evaluateStatus(
    value: number,
    threshold: BudgetThreshold
  ): 'ok' | 'warning' | 'critical' {
    // For FPS, lower is worse (inverse threshold)
    if (threshold.unit === 'fps') {
      if (value < threshold.critical) return 'critical';
      if (value < threshold.warning) return 'warning';
      return 'ok';
    }

    // For other metrics, higher is worse
    if (value >= threshold.critical) return 'critical';
    if (value >= threshold.warning) return 'warning';
    return 'ok';
  }

  // ==========================================================================
  // Status & Reporting
  // ==========================================================================

  /**
   * Calculate percentage of budget used
   */
  private calculatePercentOfBudget(value: number, threshold: BudgetThreshold): number {
    // Use warning threshold as 100% baseline
    if (threshold.unit === 'fps') {
      return (threshold.warning / value) * 100;
    }
    return (value / threshold.warning) * 100;
  }

  /**
   * Handle a budget violation
   */
  private handleViolation(
    budgetName: string,
    value: number,
    threshold: BudgetThreshold,
    severity: ViolationSeverity
  ): void {
    // Increment consecutive violations
    const consecutive = (this.consecutiveViolations.get(budgetName) ?? 0) + 1;
    this.consecutiveViolations.set(budgetName, consecutive);

    // Create violation record
    const thresholdValue = severity === 'critical' ? threshold.critical : threshold.warning;
    let overage: number;
    let overagePercent: number;

    if (threshold.unit === 'fps') {
      overage = thresholdValue - value;
      overagePercent = (overage / thresholdValue) * 100;
    } else {
      overage = value - thresholdValue;
      overagePercent = (overage / thresholdValue) * 100;
    }

    const violation: BudgetViolationRecord = {
      id: generateId(),
      budgetName,
      value,
      threshold: thresholdValue,
      severity,
      overage,
      overagePercent,
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      sessionId: this.config.sessionId,
    };

    this.violations.push(violation);
    this.trimViolations();

    // Notify via callback
    this.config.onViolation(violation);

    // Check for automatic degradation
    if (
      this.config.enableAutoDegradation && threshold.enableDegradation === true &&
      consecutive >= this.config.degradationThreshold
    ) {
      this.activateDegradation(budgetName, threshold);
    }
  }

  /**
   * Handle recovery from violation
   */
  private handleRecovery(budgetName: string): void {
    this.consecutiveViolations.set(budgetName, 0);
    this.config.onRecovery(budgetName);

    // Check if we can deactivate degradation
    this.checkDegradationRecovery();
  }

  /**
   * Activate degradation for a budget
   */
  private activateDegradation(budgetName: string, threshold: BudgetThreshold): void {
    const strategy = threshold.degradationStrategy ?? 'reduce-features';

    // Update degradation state
    const newState: DegradationState = {
      isActive: true,
      level: this.calculateDegradationLevel(),
      activeStrategies: [...new Set([...this.degradationState.activeStrategies, strategy])],
      reason: `Budget "${budgetName}" exceeded threshold ${this.config.degradationThreshold} times`,
      activatedAt: this.degradationState.activatedAt ?? Date.now(),
    };

    this.degradationState = newState;
    this.config.onDegradationChange(newState);
    this.log(`Degradation activated: ${strategy} for ${budgetName}`);
  }

  /**
   * Check if degradation can be deactivated
   */
  private checkDegradationRecovery(): void {
    if (!this.degradationState.isActive) return;

    // Check if all budgets are now ok
    let allOk = true;
    this.budgets.forEach((threshold, name) => {
      const value = this.currentValues.get(name);
      if (value !== undefined) {
        const status = this.evaluateStatus(value, threshold);
        if (status !== 'ok' && threshold.enableDegradation === true) {
          allOk = false;
        }
      }
    });

    if (allOk) {
      this.deactivateDegradation();
    }
  }

  /**
   * Calculate degradation level based on active strategies
   */
  private calculateDegradationLevel(): 'none' | 'light' | 'moderate' | 'aggressive' {
    const count = this.degradationState.activeStrategies.length;
    if (count === 0) return 'none';
    if (count <= 1) return 'light';
    if (count <= 2) return 'moderate';
    return 'aggressive';
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  /**
   * Calculate trend direction
   */
  private calculateTrendDirection(
    entries: BudgetMetricEntry[]
  ): 'improving' | 'stable' | 'degrading' {
    if (entries.length < 2) return 'stable';

    // Compare recent entries to older entries
    const midpoint = Math.floor(entries.length / 2);
    const oldAvg = entries
      .slice(0, midpoint)
      .reduce((sum, e) => sum + e.value, 0) / midpoint;
    const newAvg = entries
      .slice(midpoint)
      .reduce((sum, e) => sum + e.value, 0) / (entries.length - midpoint);

    const changePercent = ((newAvg - oldAvg) / oldAvg) * 100;

    if (changePercent < -5) return 'improving';
    if (changePercent > 5) return 'degrading';
    return 'stable';
  }

  /**
   * Trim history to max entries
   */
  private trimHistory(budgetName: string): void {
    const entries = this.history.get(budgetName);
    if (entries === undefined) return;

    // Remove entries older than retention period
    const cutoff = Date.now() - this.config.historyRetention;
    const filtered = entries.filter((e) => e.timestamp >= cutoff);

    // Trim to max entries
    if (filtered.length > this.config.maxHistoryEntries) {
      filtered.splice(0, filtered.length - this.config.maxHistoryEntries);
    }

    this.history.set(budgetName, filtered);
  }

  /**
   * Trim violations to reasonable size
   */
  private trimViolations(): void {
    if (this.violations.length > 1000) {
      this.violations.splice(0, this.violations.length - 1000);
    }
  }

  /**
   * Debug logging
   */
  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      console.info(`[BudgetManager] ${message}`, ...args);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let budgetManagerInstance: PerformanceBudgetManager | null = null;

/**
 * Get or create the global PerformanceBudgetManager instance
 */
export function getBudgetManager(config?: BudgetManagerConfig): PerformanceBudgetManager {
  budgetManagerInstance ??= new PerformanceBudgetManager(config);
  return budgetManagerInstance;
}

/**
 * Reset the global instance (for testing)
 */
export function resetBudgetManager(): void {
  budgetManagerInstance = null;
}

// ============================================================================
// Exports
// ============================================================================

// createBudgetMonitor is available as a named export from the module
