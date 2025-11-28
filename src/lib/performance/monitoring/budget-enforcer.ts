/**
 * @file Performance Budget Enforcer
 * @description Strict performance budget enforcement with configurable alerts,
 * automatic degradation strategies, and compliance reporting.
 *
 * Features:
 * - Multiple budget categories (vitals, bundle, runtime)
 * - Real-time enforcement
 * - Automatic degradation strategies
 * - Compliance reporting
 * - Alert management
 * - Integration with feature flags
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Budget category
 */
export type BudgetCategory = 'vitals' | 'bundle' | 'runtime' | 'network' | 'memory' | 'custom';

/**
 * Budget severity level
 */
export type BudgetSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Budget enforcement mode
 */
export type EnforcementMode = 'monitor' | 'warn' | 'enforce' | 'strict';

/**
 * Degradation action type
 */
export type DegradationAction =
  | 'disable-animations'
  | 'reduce-image-quality'
  | 'disable-prefetch'
  | 'reduce-polling'
  | 'disable-feature'
  | 'fallback-ui'
  | 'custom';

/**
 * Individual budget definition
 */
export interface BudgetDefinition {
  /** Budget name/identifier */
  name: string;
  /** Budget category */
  category: BudgetCategory;
  /** Warning threshold */
  warningThreshold: number;
  /** Error threshold */
  errorThreshold: number;
  /** Critical threshold (triggers immediate action) */
  criticalThreshold?: number;
  /** Unit for display */
  unit: string;
  /** Whether lower is better (default: true for performance metrics) */
  lowerIsBetter?: boolean;
  /** Degradation actions when threshold exceeded */
  degradationActions?: DegradationAction[];
  /** Feature flag to disable when exceeded */
  featureFlagToDisable?: string;
  /** Custom enforcement logic */
  enforcer?: (value: number, budget: BudgetDefinition) => EnforcementResult;
  /** Description */
  description?: string;
}

/**
 * Enforcement result
 */
export interface EnforcementResult {
  /** Is the budget compliant */
  compliant: boolean;
  /** Current severity level */
  severity: BudgetSeverity;
  /** Current value */
  value: number;
  /** Exceeded threshold */
  threshold: number;
  /** Overage amount */
  overage: number;
  /** Overage percentage */
  overagePercent: number;
  /** Actions triggered */
  actionsTriggered: DegradationAction[];
  /** Timestamp */
  timestamp: number;
  /** Additional message */
  message?: string;
}

/**
 * Budget violation event
 */
export interface BudgetViolation {
  /** Unique violation ID */
  id: string;
  /** Budget definition */
  budget: BudgetDefinition;
  /** Enforcement result */
  result: EnforcementResult;
  /** URL where violation occurred */
  url: string;
  /** Number of consecutive violations */
  consecutiveViolations: number;
  /** First violation timestamp */
  firstViolationAt: number;
  /** Last violation timestamp */
  lastViolationAt: number;
}

/**
 * Compliance report for a single budget
 */
export interface BudgetComplianceReport {
  /** Budget name */
  name: string;
  /** Category */
  category: BudgetCategory;
  /** Is currently compliant */
  isCompliant: boolean;
  /** Current value */
  currentValue: number;
  /** Warning threshold */
  warningThreshold: number;
  /** Error threshold */
  errorThreshold: number;
  /** Current utilization percentage */
  utilizationPercent: number;
  /** Headroom before warning */
  headroom: number;
  /** Samples analyzed */
  samples: number;
  /** Average value */
  average: number;
  /** Peak value */
  peak: number;
  /** Compliance rate (percentage of time compliant) */
  complianceRate: number;
  /** Active degradation actions */
  activeDegradations: DegradationAction[];
}

/**
 * Full compliance report
 */
export interface ComplianceReport {
  /** Report ID */
  id: string;
  /** Report timestamp */
  timestamp: number;
  /** Report period start */
  periodStart: number;
  /** Report period end */
  periodEnd: number;
  /** Overall compliance status */
  overallCompliant: boolean;
  /** Overall compliance score (0-100) */
  complianceScore: number;
  /** Individual budget reports */
  budgets: BudgetComplianceReport[];
  /** Active violations */
  activeViolations: BudgetViolation[];
  /** Recommendations */
  recommendations: string[];
}

/**
 * Budget enforcer configuration
 */
export interface BudgetEnforcerConfig {
  /** Enable enforcement */
  enabled: boolean;
  /** Enforcement mode */
  mode: EnforcementMode;
  /** Budget definitions */
  budgets: BudgetDefinition[];
  /** Grace period before enforcement (ms) */
  gracePeriod: number;
  /** Consecutive violations required */
  violationThreshold: number;
  /** Alert cooldown period (ms) */
  alertCooldown: number;
  /** Enable automatic degradation */
  autoDegradation: boolean;
  /** Callback for violations */
  onViolation?: (violation: BudgetViolation) => void;
  /** Callback for compliance restoration */
  onCompliance?: (budget: BudgetDefinition) => void;
  /** Callback for degradation activation */
  onDegradation?: (action: DegradationAction, budget: BudgetDefinition) => void;
  /** Custom degradation handlers */
  degradationHandlers?: Partial<Record<DegradationAction, () => void | Promise<void>>>;
  /** Debug mode */
  debug: boolean;
}

/**
 * Sample record for tracking
 */
interface BudgetSample {
  value: number;
  timestamp: number;
  compliant: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default Core Web Vitals budgets
 */
export const DEFAULT_VITALS_BUDGETS: BudgetDefinition[] = [
  {
    name: 'LCP',
    category: 'vitals',
    warningThreshold: 2500,
    errorThreshold: 4000,
    criticalThreshold: 6000,
    unit: 'ms',
    description: 'Largest Contentful Paint',
    degradationActions: ['disable-animations', 'reduce-image-quality'],
  },
  {
    name: 'INP',
    category: 'vitals',
    warningThreshold: 200,
    errorThreshold: 500,
    criticalThreshold: 1000,
    unit: 'ms',
    description: 'Interaction to Next Paint',
    degradationActions: ['disable-animations', 'reduce-polling'],
  },
  {
    name: 'CLS',
    category: 'vitals',
    warningThreshold: 0.1,
    errorThreshold: 0.25,
    criticalThreshold: 0.5,
    unit: '',
    description: 'Cumulative Layout Shift',
  },
  {
    name: 'FCP',
    category: 'vitals',
    warningThreshold: 1800,
    errorThreshold: 3000,
    criticalThreshold: 5000,
    unit: 'ms',
    description: 'First Contentful Paint',
  },
  {
    name: 'TTFB',
    category: 'vitals',
    warningThreshold: 800,
    errorThreshold: 1800,
    criticalThreshold: 3000,
    unit: 'ms',
    description: 'Time to First Byte',
  },
];

/**
 * Default bundle budgets
 */
export const DEFAULT_BUNDLE_BUDGETS: BudgetDefinition[] = [
  {
    name: 'total-bundle',
    category: 'bundle',
    warningThreshold: 300 * 1024, // 300KB
    errorThreshold: 500 * 1024,    // 500KB
    criticalThreshold: 1024 * 1024, // 1MB
    unit: 'bytes',
    description: 'Total JavaScript bundle size',
    degradationActions: ['disable-feature'],
  },
  {
    name: 'initial-bundle',
    category: 'bundle',
    warningThreshold: 150 * 1024, // 150KB
    errorThreshold: 250 * 1024,    // 250KB
    criticalThreshold: 400 * 1024, // 400KB
    unit: 'bytes',
    description: 'Initial JavaScript bundle size',
  },
  {
    name: 'css-bundle',
    category: 'bundle',
    warningThreshold: 50 * 1024,  // 50KB
    errorThreshold: 100 * 1024,    // 100KB
    criticalThreshold: 200 * 1024, // 200KB
    unit: 'bytes',
    description: 'Total CSS bundle size',
  },
];

/**
 * Default runtime budgets
 */
export const DEFAULT_RUNTIME_BUDGETS: BudgetDefinition[] = [
  {
    name: 'long-tasks',
    category: 'runtime',
    warningThreshold: 50,
    errorThreshold: 100,
    criticalThreshold: 200,
    unit: 'ms',
    description: 'Maximum long task duration',
    degradationActions: ['disable-animations'],
  },
  {
    name: 'frame-rate',
    category: 'runtime',
    warningThreshold: 55,
    errorThreshold: 45,
    criticalThreshold: 30,
    unit: 'fps',
    lowerIsBetter: false, // Higher FPS is better
    description: 'Target frame rate',
    degradationActions: ['disable-animations'],
  },
  {
    name: 'memory-usage',
    category: 'memory',
    warningThreshold: 50 * 1024 * 1024,  // 50MB
    errorThreshold: 100 * 1024 * 1024,    // 100MB
    criticalThreshold: 200 * 1024 * 1024, // 200MB
    unit: 'bytes',
    description: 'JavaScript heap usage',
    degradationActions: ['disable-prefetch'],
  },
];

const DEFAULT_CONFIG: BudgetEnforcerConfig = {
  enabled: true,
  mode: 'warn',
  budgets: [
    ...DEFAULT_VITALS_BUDGETS,
    ...DEFAULT_BUNDLE_BUDGETS,
    ...DEFAULT_RUNTIME_BUDGETS,
  ],
  gracePeriod: 5000,
  violationThreshold: 3,
  alertCooldown: 60000,
  autoDegradation: true,
  debug: false,
};

// ============================================================================
// Budget Enforcer Class
// ============================================================================

/**
 * Performance budget enforcement manager
 */
export class BudgetEnforcer {
  private config: BudgetEnforcerConfig;
  private budgetMap: Map<string, BudgetDefinition> = new Map();
  private samples: Map<string, BudgetSample[]> = new Map();
  private violations: Map<string, BudgetViolation> = new Map();
  private activeDegradations: Set<DegradationAction> = new Set();
  private lastAlertTimes: Map<string, number> = new Map();
  private consecutiveCounts: Map<string, number> = new Map();
  private startTime: number = Date.now();
  private idCounter = 0;

  constructor(config: Partial<BudgetEnforcerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeBudgets();
  }

  /**
   * Check a value against a budget
   */
  check(budgetName: string, value: number): EnforcementResult {
    const budget = this.budgetMap.get(budgetName);
    if (!budget) {
      return this.createPassingResult(value);
    }

    // Use custom enforcer if provided
    if (budget.enforcer) {
      return budget.enforcer(value, budget);
    }

    // Standard enforcement
    return this.enforce(budget, value);
  }

  /**
   * Record a metric value for a budget
   */
  record(budgetName: string, value: number): EnforcementResult {
    const result = this.check(budgetName, value);
    const budget = this.budgetMap.get(budgetName);

    if (!budget) return result;

    // Store sample
    this.recordSample(budgetName, value, result.compliant);

    // Handle violation
    if (!result.compliant) {
      this.handleViolation(budget, result);
    } else {
      this.handleCompliance(budget);
    }

    return result;
  }

  /**
   * Add or update a budget definition
   */
  addBudget(budget: BudgetDefinition): void {
    this.budgetMap.set(budget.name, budget);
    this.config.budgets = Array.from(this.budgetMap.values());
  }

  /**
   * Remove a budget
   */
  removeBudget(budgetName: string): void {
    this.budgetMap.delete(budgetName);
    this.samples.delete(budgetName);
    this.violations.delete(budgetName);
    this.consecutiveCounts.delete(budgetName);
  }

  /**
   * Get current compliance report
   */
  getComplianceReport(): ComplianceReport {
    const now = Date.now();
    const budgetReports: BudgetComplianceReport[] = [];
    let compliantCount = 0;

    for (const [name, budget] of this.budgetMap) {
      const report = this.getBudgetComplianceReport(name, budget);
      budgetReports.push(report);
      if (report.isCompliant) compliantCount++;
    }

    const activeViolations = Array.from(this.violations.values());
    const overallCompliant = activeViolations.length === 0;
    const complianceScore = this.budgetMap.size > 0
      ? Math.round((compliantCount / this.budgetMap.size) * 100)
      : 100;

    return {
      id: this.generateId(),
      timestamp: now,
      periodStart: this.startTime,
      periodEnd: now,
      overallCompliant,
      complianceScore,
      budgets: budgetReports,
      activeViolations,
      recommendations: this.generateRecommendations(budgetReports),
    };
  }

  /**
   * Get active violations
   */
  getActiveViolations(): BudgetViolation[] {
    return Array.from(this.violations.values());
  }

  /**
   * Get active degradations
   */
  getActiveDegradations(): DegradationAction[] {
    return Array.from(this.activeDegradations);
  }

  /**
   * Check if a specific degradation is active
   */
  isDegraded(action: DegradationAction): boolean {
    return this.activeDegradations.has(action);
  }

  /**
   * Manually activate a degradation
   */
  activateDegradation(action: DegradationAction): void {
    if (!this.activeDegradations.has(action)) {
      this.activeDegradations.add(action);
      this.executeDegradation(action);
      this.log(`Manually activated degradation: ${action}`);
    }
  }

  /**
   * Manually deactivate a degradation
   */
  deactivateDegradation(action: DegradationAction): void {
    this.activeDegradations.delete(action);
    this.log(`Deactivated degradation: ${action}`);
  }

  /**
   * Reset all degradations
   */
  resetDegradations(): void {
    this.activeDegradations.clear();
    this.log('All degradations reset');
  }

  /**
   * Clear violation for a budget
   */
  clearViolation(budgetName: string): void {
    this.violations.delete(budgetName);
    this.consecutiveCounts.delete(budgetName);
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.samples.clear();
    this.violations.clear();
    this.activeDegradations.clear();
    this.lastAlertTimes.clear();
    this.consecutiveCounts.clear();
    this.startTime = Date.now();
  }

  /**
   * Get budget definition
   */
  getBudget(name: string): BudgetDefinition | undefined {
    return this.budgetMap.get(name);
  }

  /**
   * Get all budgets
   */
  getAllBudgets(): BudgetDefinition[] {
    return Array.from(this.budgetMap.values());
  }

  /**
   * Get budgets by category
   */
  getBudgetsByCategory(category: BudgetCategory): BudgetDefinition[] {
    return Array.from(this.budgetMap.values()).filter(b => b.category === category);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private initializeBudgets(): void {
    for (const budget of this.config.budgets) {
      this.budgetMap.set(budget.name, budget);
    }
  }

  private enforce(budget: BudgetDefinition, value: number): EnforcementResult {
    const lowerIsBetter = budget.lowerIsBetter !== false;
    const actionsTriggered: DegradationAction[] = [];

    let severity: BudgetSeverity = 'info';
    let threshold = 0;
    let compliant = true;

    // Determine severity based on thresholds
    if (lowerIsBetter) {
      if (budget.criticalThreshold !== null && budget.criticalThreshold !== undefined && value > budget.criticalThreshold) {
        severity = 'critical';
        threshold = budget.criticalThreshold;
        compliant = false;
      } else if (value > budget.errorThreshold) {
        severity = 'error';
        threshold = budget.errorThreshold;
        compliant = false;
      } else if (value > budget.warningThreshold) {
        severity = 'warning';
        threshold = budget.warningThreshold;
        // Warning is still compliant but needs attention
      }
    } else {
      // Higher is better (e.g., frame rate)
      if (budget.criticalThreshold && value < budget.criticalThreshold) {
        severity = 'critical';
        threshold = budget.criticalThreshold;
        compliant = false;
      } else if (value < budget.errorThreshold) {
        severity = 'error';
        threshold = budget.errorThreshold;
        compliant = false;
      } else if (value < budget.warningThreshold) {
        severity = 'warning';
        threshold = budget.warningThreshold;
      }
    }

    // Calculate overage
    const overage = lowerIsBetter
      ? Math.max(0, value - budget.errorThreshold)
      : Math.max(0, budget.errorThreshold - value);
    const overagePercent = budget.errorThreshold !== 0
      ? (overage / budget.errorThreshold) * 100
      : 0;

    // Determine degradation actions
    if (!compliant && this.config.autoDegradation && budget.degradationActions) {
      actionsTriggered.push(...budget.degradationActions);
    }

    return {
      compliant,
      severity,
      value,
      threshold: threshold || budget.errorThreshold,
      overage,
      overagePercent,
      actionsTriggered,
      timestamp: Date.now(),
      message: this.generateMessage(budget, value, severity),
    };
  }

  private recordSample(budgetName: string, value: number, compliant: boolean): void {
    if (!this.samples.has(budgetName)) {
      this.samples.set(budgetName, []);
    }

    const samples = this.samples.get(budgetName)!;
    samples.push({
      value,
      timestamp: Date.now(),
      compliant,
    });

    // Keep last 100 samples
    if (samples.length > 100) {
      samples.shift();
    }
  }

  private handleViolation(budget: BudgetDefinition, result: EnforcementResult): void {
    const count = (this.consecutiveCounts.get(budget.name) || 0) + 1;
    this.consecutiveCounts.set(budget.name, count);

    // Check if we should create/update violation
    if (count >= this.config.violationThreshold) {
      const now = Date.now();
      const existing = this.violations.get(budget.name);

      const violation: BudgetViolation = {
        id: existing?.id || this.generateId(),
        budget,
        result,
        url: typeof window !== 'undefined' ? window.location.href : '',
        consecutiveViolations: count,
        firstViolationAt: existing?.firstViolationAt || now,
        lastViolationAt: now,
      };

      this.violations.set(budget.name, violation);

      // Check alert cooldown
      const lastAlert = this.lastAlertTimes.get(budget.name) || 0;
      if (now - lastAlert > this.config.alertCooldown) {
        this.lastAlertTimes.set(budget.name, now);
        this.config.onViolation?.(violation);
        this.log(`Budget violation: ${budget.name} = ${result.value} (threshold: ${result.threshold})`);
      }

      // Execute degradations if in enforce mode
      if (this.config.mode === 'enforce' || this.config.mode === 'strict') {
        for (const action of result.actionsTriggered) {
          if (!this.activeDegradations.has(action)) {
            this.activeDegradations.add(action);
            this.executeDegradation(action, budget);
          }
        }
      }
    }
  }

  private handleCompliance(budget: BudgetDefinition): void {
    const previousCount = this.consecutiveCounts.get(budget.name) || 0;
    this.consecutiveCounts.set(budget.name, 0);

    // Clear violation if it existed
    if (this.violations.has(budget.name)) {
      this.violations.delete(budget.name);
      this.config.onCompliance?.(budget);
      this.log(`Budget compliance restored: ${budget.name}`);
    }

    // Consider deactivating degradations if all related budgets are compliant
    if (previousCount >= this.config.violationThreshold && budget.degradationActions) {
      for (const action of budget.degradationActions) {
        // Check if any other budget still needs this degradation
        let stillNeeded = false;
        for (const [, violation] of this.violations) {
          if (violation.result.actionsTriggered.includes(action)) {
            stillNeeded = true;
            break;
          }
        }
        if (!stillNeeded) {
          this.activeDegradations.delete(action);
        }
      }
    }
  }

  private executeDegradation(action: DegradationAction, budget?: BudgetDefinition): void {
    const handler = this.config.degradationHandlers?.[action];
    if (handler) {
      void handler();
    }

    if (budget) {
      this.config.onDegradation?.(action, budget);
    }

    this.log(`Executing degradation: ${action}`);
  }

  private getBudgetComplianceReport(name: string, budget: BudgetDefinition): BudgetComplianceReport {
    const samples = this.samples.get(name) || [];
    const violation = this.violations.get(name);

    const values = samples.map(s => s.value);
    const compliantSamples = samples.filter(s => s.compliant);
    const currentValue = values.length > 0 ? values[values.length - 1] : 0;
    const average = values.length > 0
      ? values.reduce((sum, v) => sum + v, 0) / values.length
      : 0;
    const peak = values.length > 0 ? Math.max(...values) : 0;
    const complianceRate = samples.length > 0
      ? (compliantSamples.length / samples.length) * 100
      : 100;

    const lowerIsBetter = budget.lowerIsBetter !== false;
    const safeCurrentValue = currentValue ?? 0;
    const utilizationPercent = lowerIsBetter
      ? (safeCurrentValue / budget.errorThreshold) * 100
      : (budget.errorThreshold / safeCurrentValue) * 100;
    const headroom = lowerIsBetter
      ? budget.warningThreshold - safeCurrentValue
      : safeCurrentValue - budget.warningThreshold;

    return {
      name,
      category: budget.category,
      isCompliant: !violation,
      currentValue: safeCurrentValue,
      warningThreshold: budget.warningThreshold,
      errorThreshold: budget.errorThreshold,
      utilizationPercent: Math.min(utilizationPercent, 200),
      headroom: Math.max(headroom, 0),
      samples: samples.length,
      average,
      peak,
      complianceRate,
      activeDegradations: violation?.result.actionsTriggered || [],
    };
  }

  private generateRecommendations(reports: BudgetComplianceReport[]): string[] {
    const recommendations: string[] = [];

    for (const report of reports) {
      if (!report.isCompliant) {
        switch (report.category) {
          case 'vitals':
            if (report.name === 'LCP') {
              recommendations.push('Optimize LCP by preloading critical resources and using responsive images');
            } else if (report.name === 'CLS') {
              recommendations.push('Reduce CLS by setting explicit dimensions on images and avoiding dynamic content insertion');
            } else if (report.name === 'INP') {
              recommendations.push('Improve INP by breaking up long tasks and optimizing event handlers');
            }
            break;
          case 'bundle':
            recommendations.push(`Consider code splitting to reduce ${report.name}`);
            recommendations.push('Review and remove unused dependencies');
            break;
          case 'runtime':
            recommendations.push('Profile and optimize expensive computations');
            recommendations.push('Consider using Web Workers for heavy processing');
            break;
          case 'memory':
            recommendations.push('Review for memory leaks and unnecessary caching');
            recommendations.push('Consider implementing data virtualization');
            break;
        }
      } else if (report.utilizationPercent > 80) {
        recommendations.push(`${report.name} is at ${report.utilizationPercent.toFixed(0)}% of budget - consider optimization before it exceeds threshold`);
      }
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  private generateMessage(budget: BudgetDefinition, value: number, severity: BudgetSeverity): string {
    const formattedValue = this.formatValue(value, budget.unit);
    const formattedThreshold = this.formatValue(budget.errorThreshold, budget.unit);

    switch (severity) {
      case 'critical':
        return `CRITICAL: ${budget.name} is ${formattedValue} (critical threshold: ${this.formatValue(budget.criticalThreshold!, budget.unit)})`;
      case 'error':
        return `ERROR: ${budget.name} exceeds budget at ${formattedValue} (limit: ${formattedThreshold})`;
      case 'warning':
        return `WARNING: ${budget.name} is ${formattedValue} (approaching limit: ${formattedThreshold})`;
      default:
        return `${budget.name}: ${formattedValue}`;
    }
  }

  private formatValue(value: number, unit: string): string {
    if (unit === 'bytes') {
      if (value >= 1024 * 1024) {
        return `${(value / (1024 * 1024)).toFixed(1)}MB`;
      } else if (value >= 1024) {
        return `${(value / 1024).toFixed(1)}KB`;
      }
      return `${value}B`;
    }
    return unit ? `${value}${unit}` : `${value}`;
  }

  private createPassingResult(value: number): EnforcementResult {
    return {
      compliant: true,
      severity: 'info',
      value,
      threshold: 0,
      overage: 0,
      overagePercent: 0,
      actionsTriggered: [],
      timestamp: Date.now(),
    };
  }

  private generateId(): string {
    return `budget-${Date.now()}-${++this.idCounter}`;
  }

  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      console.log(`[BudgetEnforcer] ${message}`, ...args);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let enforcerInstance: BudgetEnforcer | null = null;

/**
 * Get or create the global budget enforcer
 */
export function getBudgetEnforcer(config?: Partial<BudgetEnforcerConfig>): BudgetEnforcer {
  if (!enforcerInstance) {
    enforcerInstance = new BudgetEnforcer(config);
  }
  return enforcerInstance;
}

/**
 * Reset the enforcer instance
 */
export function resetBudgetEnforcer(): void {
  enforcerInstance?.reset();
  enforcerInstance = null;
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Check a metric against its budget
 */
export function checkBudget(budgetName: string, value: number): EnforcementResult {
  return getBudgetEnforcer().check(budgetName, value);
}

/**
 * Record and enforce a metric value
 */
export function enforceBudget(budgetName: string, value: number): EnforcementResult {
  return getBudgetEnforcer().record(budgetName, value);
}

/**
 * Get current compliance report
 */
export function getComplianceReport(): ComplianceReport {
  return getBudgetEnforcer().getComplianceReport();
}

/**
 * Check if any degradation is currently active
 */
export function isPerformanceDegraded(): boolean {
  return getBudgetEnforcer().getActiveDegradations().length > 0;
}

/**
 * Check if a specific degradation action is active
 */
export function isDegradationActive(action: DegradationAction): boolean {
  return getBudgetEnforcer().isDegraded(action);
}
