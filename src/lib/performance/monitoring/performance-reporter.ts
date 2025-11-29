/**
 * @file Performance Reporter
 * @description Comprehensive performance reporting with multiple output formats,
 * destinations, and customizable reports.
 *
 * Features:
 * - Multiple report formats (JSON, console, analytics)
 * - Configurable destinations
 * - Report aggregation
 * - Threshold-based alerting
 * - Historical comparison
 * - Custom report builders
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Report format
 */
export type ReportFormat = 'json' | 'console' | 'analytics' | 'custom';

/**
 * Report destination
 */
export type ReportDestination = 'console' | 'endpoint' | 'localStorage' | 'callback';

/**
 * Metric data for reporting
 */
export interface ReportMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  target?: number;
  delta?: number;
  timestamp: number;
}

/**
 * Performance report
 */
export interface PerformanceReport {
  id: string;
  timestamp: number;
  url: string;
  metrics: ReportMetric[];
  score: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  summary: ReportSummary;
  context: ReportContext;
  recommendations: string[];
}

/**
 * Report summary
 */
export interface ReportSummary {
  totalMetrics: number;
  goodMetrics: number;
  poorMetrics: number;
  needsImprovementMetrics: number;
  criticalIssues: string[];
}

/**
 * Report context
 */
export interface ReportContext {
  userAgent: string;
  connection?: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  };
  viewport: {
    width: number;
    height: number;
  };
  deviceMemory?: number;
  hardwareConcurrency?: number;
  sessionId?: string;
  userId?: string;
}

/**
 * Reporter configuration
 */
export interface PerformanceReporterConfig {
  /** Enable reporting */
  enabled: boolean;
  /** Report format */
  format: ReportFormat;
  /** Report destination */
  destination: ReportDestination;
  /** Endpoint URL for endpoint destination */
  endpointUrl?: string;
  /** Local storage key */
  storageKey?: string;
  /** Custom callback */
  callback?: (report: PerformanceReport) => void | Promise<void>;
  /** Enable alerting */
  alerting: boolean;
  /** Alert threshold (score below this triggers alert) */
  alertThreshold: number;
  /** Alert callback */
  onAlert?: (report: PerformanceReport, issues: string[]) => void;
  /** Include recommendations */
  includeRecommendations: boolean;
  /** Session ID */
  sessionId?: string;
  /** User ID */
  userId?: string;
  /** Debug mode */
  debug: boolean;
}

/**
 * Alert rule
 */
export interface AlertRule {
  metric: string;
  condition: 'above' | 'below';
  threshold: number;
  severity: 'warning' | 'critical';
  message: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: PerformanceReporterConfig = {
  enabled: true,
  format: 'json',
  destination: 'console',
  alerting: true,
  alertThreshold: 50,
  includeRecommendations: true,
  debug: false,
};

/**
 * Default alert rules
 */
const DEFAULT_ALERT_RULES: AlertRule[] = [
  { metric: 'LCP', condition: 'above', threshold: 4000, severity: 'critical', message: 'LCP is critically slow' },
  { metric: 'CLS', condition: 'above', threshold: 0.25, severity: 'critical', message: 'CLS is causing major layout shifts' },
  { metric: 'INP', condition: 'above', threshold: 500, severity: 'critical', message: 'INP indicates poor interactivity' },
  { metric: 'FCP', condition: 'above', threshold: 3000, severity: 'warning', message: 'FCP is slow' },
  { metric: 'TTFB', condition: 'above', threshold: 1800, severity: 'warning', message: 'TTFB indicates slow server response' },
];

// ============================================================================
// Performance Reporter
// ============================================================================

/**
 * Performance reporting manager
 */
export class PerformanceReporter {
  private config: PerformanceReporterConfig;
  private alertRules: AlertRule[];
  private reportHistory: PerformanceReport[] = [];
  private idCounter = 0;

  constructor(config: Partial<PerformanceReporterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.alertRules = [...DEFAULT_ALERT_RULES];
  }

  /**
   * Generate and send a performance report
   */
  async report(metrics: ReportMetric[]): Promise<PerformanceReport> {
    if (!this.config.enabled) {
      return this.createEmptyReport();
    }

    const report = this.createReport(metrics);
    this.reportHistory.push(report);

    // Check alerts
    if (this.config.alerting) {
      this.checkAlerts(report);
    }

    // Send to destination
    await this.sendReport(report);

    return report;
  }

  /**
   * Add custom alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.push(rule);
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(metric: string): void {
    this.alertRules = this.alertRules.filter((r) => r.metric !== metric);
  }

  /**
   * Get report history
   */
  getHistory(): PerformanceReport[] {
    return [...this.reportHistory];
  }

  /**
   * Get latest report
   */
  getLatestReport(): PerformanceReport | null {
    return this.reportHistory[this.reportHistory.length - 1] ?? null;
  }

  /**
   * Clear report history
   */
  clearHistory(): void {
    this.reportHistory = [];
  }

  /**
   * Compare two reports
   */
  compareReports(
    report1: PerformanceReport,
    report2: PerformanceReport
  ): {
    improved: string[];
    regressed: string[];
    unchanged: string[];
    scoreDelta: number;
  } {
    const improved: string[] = [];
    const regressed: string[] = [];
    const unchanged: string[] = [];

    const metrics1 = new Map(report1.metrics.map((m) => [m.name, m]));
    const metrics2 = new Map(report2.metrics.map((m) => [m.name, m]));

    for (const [name, metric1] of metrics1) {
      const metric2 = metrics2.get(name);
      if (!metric2) continue;

      // For CLS, lower is better. For time-based metrics, also lower is better.
      const delta = metric2.value - metric1.value;
      const threshold = metric1.value * 0.05; // 5% threshold

      if (Math.abs(delta) < threshold) {
        unchanged.push(name);
      } else if (delta < 0) {
        // Value decreased = improved for most metrics
        improved.push(name);
      } else {
        regressed.push(name);
      }
    }

    return {
      improved,
      regressed,
      unchanged,
      scoreDelta: report2.score - report1.score,
    };
  }

  /**
   * Generate console report
   */
  generateConsoleReport(report: PerformanceReport): string {
    const lines: string[] = [
      '========================================',
      '       PERFORMANCE REPORT',
      '========================================',
      '',
      `URL: ${report.url}`,
      `Timestamp: ${new Date(report.timestamp).toISOString()}`,
      `Overall Score: ${report.score}/100 (${report.rating})`,
      '',
      'METRICS:',
      '--------',
    ];

    for (const metric of report.metrics) {
      let indicator: string;
      if (metric.rating === 'good') {
        indicator = '[OK]';
      } else if (metric.rating === 'poor') {
        indicator = '[!!]';
      } else {
        indicator = '[!]';
      }
      lines.push(`${indicator} ${metric.name}: ${this.formatValue(metric.name, metric.value)}`);
    }

    lines.push('');
    lines.push('SUMMARY:');
    lines.push('--------');
    lines.push(`Good: ${report.summary.goodMetrics}/${report.summary.totalMetrics}`);
    lines.push(`Needs Improvement: ${report.summary.needsImprovementMetrics}/${report.summary.totalMetrics}`);
    lines.push(`Poor: ${report.summary.poorMetrics}/${report.summary.totalMetrics}`);

    if (report.summary.criticalIssues.length > 0) {
      lines.push('');
      lines.push('CRITICAL ISSUES:');
      lines.push('----------------');
      report.summary.criticalIssues.forEach((issue) => {
        lines.push(`- ${issue}`);
      });
    }

    if (report.recommendations.length > 0) {
      lines.push('');
      lines.push('RECOMMENDATIONS:');
      lines.push('----------------');
      report.recommendations.forEach((rec) => {
        lines.push(`- ${rec}`);
      });
    }

    lines.push('');
    lines.push('========================================');

    return lines.join('\n');
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private createReport(metrics: ReportMetric[]): PerformanceReport {
    const score = this.calculateScore(metrics);
    const summary = this.createSummary(metrics);
    const recommendations = this.config.includeRecommendations
      ? this.generateRecommendations(metrics)
      : [];

    return {
      id: this.generateId(),
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      metrics,
      score,
      rating: this.scoreToRating(score),
      summary,
      context: this.getContext(),
      recommendations,
    };
  }

  private calculateScore(metrics: ReportMetric[]): number {
    if (metrics.length === 0) return 0;

    const weights: Record<string, number> = {
      LCP: 0.25,
      INP: 0.30,
      CLS: 0.25,
      FCP: 0.10,
      TTFB: 0.10,
    };

    let totalWeight = 0;
    let weightedScore = 0;

    for (const metric of metrics) {
      const weight = weights[metric.name] ?? 0.1;
      const score = this.ratingToScore(metric.rating);
      weightedScore += score * weight;
      totalWeight += weight;
    }

    return (totalWeight !== null && totalWeight !== undefined && totalWeight > 0) ? Math.round(weightedScore / totalWeight) : 0;
  }

  private createSummary(metrics: ReportMetric[]): ReportSummary {
    const criticalIssues: string[] = [];

    for (const metric of metrics) {
      if (metric.rating === 'poor') {
        criticalIssues.push(`${metric.name} is poor (${this.formatValue(metric.name, metric.value)})`);
      }
    }

    return {
      totalMetrics: metrics.length,
      goodMetrics: metrics.filter((m) => m.rating === 'good').length,
      needsImprovementMetrics: metrics.filter((m) => m.rating === 'needs-improvement').length,
      poorMetrics: metrics.filter((m) => m.rating === 'poor').length,
      criticalIssues,
    };
  }

  private generateRecommendations(metrics: ReportMetric[]): string[] {
    const recommendations: string[] = [];

    for (const metric of metrics) {
      if (metric.rating === 'good') continue;

      switch (metric.name) {
        case 'LCP':
          recommendations.push('Optimize Largest Contentful Paint by preloading critical resources');
          recommendations.push('Consider using a CDN for faster asset delivery');
          recommendations.push('Optimize and compress images');
          break;
        case 'CLS':
          recommendations.push('Set explicit dimensions for images and video elements');
          recommendations.push('Reserve space for ads and embeds');
          recommendations.push('Avoid inserting content above existing content');
          break;
        case 'INP':
          recommendations.push('Reduce JavaScript execution time');
          recommendations.push('Break up long tasks into smaller chunks');
          recommendations.push('Use web workers for heavy computations');
          break;
        case 'FCP':
          recommendations.push('Eliminate render-blocking resources');
          recommendations.push('Inline critical CSS');
          recommendations.push('Minimize server response time');
          break;
        case 'TTFB':
          recommendations.push('Optimize server response time');
          recommendations.push('Use edge caching with a CDN');
          recommendations.push('Consider server-side rendering optimizations');
          break;
      }
    }

    // Remove duplicates
    return [...new Set(recommendations)];
  }

  private getContext(): ReportContext {
    if (typeof window === 'undefined') {
      return {
        userAgent: '',
        viewport: { width: 0, height: 0 },
      };
    }

    const nav = navigator as Navigator & {
      connection?: {
        effectiveType?: string;
        downlink?: number;
        rtt?: number;
        saveData?: boolean;
      };
      deviceMemory?: number;
    };

    return {
      userAgent: navigator.userAgent,
      connection: nav.connection
        ? {
            effectiveType: nav.connection.effectiveType,
            downlink: nav.connection.downlink,
            rtt: nav.connection.rtt,
            saveData: nav.connection.saveData,
          }
        : undefined,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      deviceMemory: nav.deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency,
      sessionId: this.config.sessionId,
      userId: this.config.userId,
    };
  }

  private checkAlerts(report: PerformanceReport): void {
    const triggeredAlerts: string[] = [];

    // Check score threshold
    if (report.score < this.config.alertThreshold) {
      triggeredAlerts.push(`Overall score (${report.score}) is below threshold (${this.config.alertThreshold})`);
    }

    // Check individual metric rules
    for (const rule of this.alertRules) {
      const metric = report.metrics.find((m) => m.name === rule.metric);
      if (!metric) continue;

      const triggered =
        rule.condition === 'above'
          ? metric.value > rule.threshold
          : metric.value < rule.threshold;

      if (triggered) {
        triggeredAlerts.push(`[${rule.severity.toUpperCase()}] ${rule.message}`);
      }
    }

    if (triggeredAlerts.length > 0) {
      this.config.onAlert?.(report, triggeredAlerts);
      this.log(`Alerts triggered: ${triggeredAlerts.join(', ')}`);
    }
  }

  private async sendReport(report: PerformanceReport): Promise<void> {
    switch (this.config.destination) {
      case 'console':
        console.info(this.generateConsoleReport(report));
        break;

      case 'endpoint':
        await this.sendToEndpoint(report);
        break;

      case 'localStorage':
        this.saveToLocalStorage(report);
        break;

      case 'callback':
        await this.config.callback?.(report);
        break;
    }
  }

  /**
   * Send performance report to endpoint.
   *
   * Note: This method intentionally uses raw fetch/sendBeacon because:
   * 1. Performance reporting should be independent of the main API client
   * 2. Uses keepalive/sendBeacon for reliability when page is unloading
   * 3. Reporting endpoints may be third-party analytics services
   *
   * @see {@link @/lib/api/api-client} for application API calls
   */
  private async sendToEndpoint(report: PerformanceReport): Promise<void> {
    if (this.config.endpointUrl === null || this.config.endpointUrl === undefined) {
      this.log('No endpoint URL configured');
      return;
    }

    try {
      const body = this.formatReport(report);

      if (navigator.sendBeacon !== null && navigator.sendBeacon !== undefined) {
        navigator.sendBeacon(this.config.endpointUrl, JSON.stringify(body));
      } else {
        // Raw fetch is intentional - uses keepalive for page unload reliability
        await fetch(this.config.endpointUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          keepalive: true,
        });
      }

      this.log('Report sent to endpoint');
    } catch (e) {
      this.log('Failed to send report', e);
    }
  }

  private saveToLocalStorage(report: PerformanceReport): void {
    const key = this.config.storageKey ?? 'performance-reports';

    try {
      const storedValue = localStorage.getItem(key);
      const existing: unknown = storedValue !== null && storedValue !== undefined ? JSON.parse(storedValue) : [];

      if (Array.isArray(existing)) {
        existing.push(report);
        // Keep only last 100 reports
        const trimmed: unknown = existing.slice(-100);
        if (Array.isArray(trimmed)) {
          localStorage.setItem(key, JSON.stringify(trimmed));
        }
      }

      this.log('Report saved to localStorage');
    } catch (e) {
      this.log('Failed to save to localStorage', e);
    }
  }

  private formatReport(report: PerformanceReport): unknown {
    switch (this.config.format) {
      case 'json':
        return report;

      case 'analytics':
        // Format for Google Analytics or similar
        return {
          event: 'performance_report',
          metrics: Object.fromEntries(report.metrics.map((m) => [m.name, m.value])),
          score: report.score,
          url: report.url,
        };

      default:
        return report;
    }
  }

  private formatValue(name: string, value: number): string {
    if (name === 'CLS') {
      return value.toFixed(3);
    }
    return `${Math.round(value)}ms`;
  }

  private ratingToScore(rating: 'good' | 'needs-improvement' | 'poor'): number {
    switch (rating) {
      case 'good':
        return 100;
      case 'needs-improvement':
        return 50;
      case 'poor':
        return 0;
    }
  }

  private scoreToRating(score: number): 'good' | 'needs-improvement' | 'poor' {
    if (score >= 90) return 'good';
    if (score >= 50) return 'needs-improvement';
    return 'poor';
  }

  private createEmptyReport(): PerformanceReport {
    return {
      id: this.generateId(),
      timestamp: Date.now(),
      url: '',
      metrics: [],
      score: 0,
      rating: 'poor',
      summary: {
        totalMetrics: 0,
        goodMetrics: 0,
        poorMetrics: 0,
        needsImprovementMetrics: 0,
        criticalIssues: [],
      },
      context: {
        userAgent: '',
        viewport: { width: 0, height: 0 },
      },
      recommendations: [],
    };
  }

  private generateId(): string {
    return `report-${Date.now()}-${++this.idCounter}`;
  }

  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      console.info(`[PerformanceReporter] ${message}`, ...args);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let reporterInstance: PerformanceReporter | null = null;

/**
 * Get or create the global performance reporter
 */
export function getPerformanceReporter(
  config?: Partial<PerformanceReporterConfig>
): PerformanceReporter {
  reporterInstance ??= new PerformanceReporter(config);
  return reporterInstance;
}

/**
 * Reset the reporter instance
 */
export function resetPerformanceReporter(): void {
  reporterInstance = null;
}
