/**
 * @file Performance Monitoring Extension
 * @description Enterprise-grade performance monitoring extension for Enzyme
 *
 * Features:
 * - Web Vitals Tracking (LCP, FID, CLS, FCP, TTFB, INP)
 * - Component Render Tracking (render times, re-renders, wasted renders)
 * - Memory Monitoring (heap size, memory pressure detection)
 * - Network Metrics (request timings, bandwidth estimation)
 * - Long Task Detection (identify blocking operations)
 * - Bundle Size Tracking (monitor chunk sizes)
 * - Performance Budgets (set and enforce limits)
 * - Metric Aggregation (p50, p95, p99 percentiles)
 * - Sampling (configurable sampling rate for production)
 * - Report Generation (performance reports for dashboards)
 *
 * @example
 * ```typescript
 * import { performanceExtension } from '@enzyme/extensions/built-in';
 *
 * // Apply extension
 * const enzyme = new Enzyme().$extends(performanceExtension);
 *
 * // Track component render
 * const stopTracking = enzyme.$trackRender('MyComponent');
 * // ... component renders ...
 * stopTracking();
 *
 * // Measure async operation
 * await enzyme.$measureOperation('fetchData', async () => {
 *   return await fetchData();
 * });
 *
 * // Set performance budget
 * enzyme.$setPerformanceBudget({
 *   LCP: { warning: 2000, critical: 2500 },
 *   'bundle.initial': { warning: 150000, critical: 200000 }
 * });
 *
 * // Get current metrics
 * const metrics = enzyme.$getMetrics();
 * console.log(metrics);
 *
 * // Generate report
 * const report = enzyme.$getPerformanceReport();
 * console.log(report);
 * ```
 */

import type { EnzymeExtension } from '../../../cli/src/extensions/types';

// Import from existing performance modules
import {
  getVitalsCollector,
  type VitalsCollector,
  type VitalsSnapshot,
  type VitalMetricName,
  type VitalMetricEntry,
  type PerformanceBudget,
} from '../../performance/vitals';

import {
  getPerformanceMonitor,
  type PerformanceMonitor,
  type PerformanceMetrics,
  type LongTaskEntry,
  type MemorySnapshot,
} from '../../performance/performance-monitor';

import {
  getBudgetManager,
  type PerformanceBudgetManager,
  type BudgetThreshold,
  type BudgetViolationRecord,
  type BudgetStatusSummary,
  formatBudgetValue,
} from '../../performance/performance-budgets';

import {
  getEnhancedVitalsCollector,
  type EnhancedVitalsCollector,
  type CollectedMetric,
  type MetricName,
} from '../../performance/monitoring/vitals-collector';

// ============================================================================
// Types
// ============================================================================

/**
 * Performance extension configuration
 */
export interface PerformanceExtensionConfig {
  /** Enable web vitals tracking */
  enableVitals?: boolean;
  /** Enable component render tracking */
  enableRenderTracking?: boolean;
  /** Enable memory monitoring */
  enableMemoryMonitoring?: boolean;
  /** Enable long task detection */
  enableLongTaskDetection?: boolean;
  /** Enable network metrics */
  enableNetworkMetrics?: boolean;
  /** Sample rate for production (0-1) */
  sampleRate?: number;
  /** Performance budgets */
  budgets?: Partial<Record<string, BudgetThreshold>>;
  /** Report to analytics endpoint */
  analyticsEndpoint?: string;
  /** Enable debug logging */
  debug?: boolean;
  /** Auto-start monitoring */
  autoStart?: boolean;
}

/**
 * Component render timing
 */
export interface RenderTiming {
  componentName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  phase: 'mount' | 'update' | 'unmount';
  timestamp: number;
}

/**
 * Operation timing
 */
export interface OperationTiming {
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  error?: Error;
  timestamp: number;
}

/**
 * Timeline marker
 */
export interface TimelineMarker {
  name: string;
  timestamp: number;
  type: 'mark' | 'measure';
  duration?: number;
}

/**
 * Aggregated metrics with percentiles
 */
export interface AggregatedMetrics {
  /** Metric name */
  name: string;
  /** Sample count */
  count: number;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Average value */
  mean: number;
  /** Median (50th percentile) */
  p50: number;
  /** 75th percentile */
  p75: number;
  /** 90th percentile */
  p90: number;
  /** 95th percentile */
  p95: number;
  /** 99th percentile */
  p99: number;
  /** Standard deviation */
  stdDev: number;
}

/**
 * Network quality estimate
 */
export interface NetworkQuality {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
  timestamp: number;
}

/**
 * Bundle size info
 */
export interface BundleInfo {
  name: string;
  size: number;
  gzipSize?: number;
  type: 'initial' | 'async' | 'vendor';
  timestamp: number;
}

/**
 * Performance report
 */
export interface PerformanceReport {
  /** Report generation timestamp */
  timestamp: number;
  /** Current URL */
  url: string;
  /** Session duration */
  sessionDuration: number;
  /** Web Vitals snapshot */
  vitals: VitalsSnapshot | null;
  /** Performance metrics */
  performance: PerformanceMetrics | null;
  /** Budget status */
  budgetStatus: BudgetStatusSummary[];
  /** Recent violations */
  violations: BudgetViolationRecord[];
  /** Aggregated render metrics */
  renderMetrics: AggregatedMetrics[];
  /** Network quality */
  networkQuality: NetworkQuality | null;
  /** Overall health score (0-100) */
  healthScore: number;
  /** Recommendations */
  recommendations: string[];
}

// ============================================================================
// Performance Extension State
// ============================================================================

/**
 * Global state for performance extension
 */
class PerformanceExtensionState {
  private static instance: PerformanceExtensionState | null = null;

  // Core services
  private vitalsCollector: VitalsCollector | null = null;
  private enhancedCollector: EnhancedVitalsCollector | null = null;
  private performanceMonitor: PerformanceMonitor | null = null;
  private budgetManager: PerformanceBudgetManager | null = null;

  // Tracking data
  private renderTimings: Map<string, RenderTiming> = new Map();
  private operationTimings: OperationTiming[] = [];
  private timelineMarkers: TimelineMarker[] = [];
  private bundleInfo: Map<string, BundleInfo> = new Map();
  private sessionStartTime: number = Date.now();
  private isStarted = false;

  // Configuration
  private config: Required<PerformanceExtensionConfig>;

  // Cleanup functions
  private cleanupFunctions: (() => void)[] = [];

  private constructor(config: PerformanceExtensionConfig = {}) {
    this.config = {
      enableVitals: config.enableVitals ?? true,
      enableRenderTracking: config.enableRenderTracking ?? true,
      enableMemoryMonitoring: config.enableMemoryMonitoring ?? true,
      enableLongTaskDetection: config.enableLongTaskDetection ?? true,
      enableNetworkMetrics: config.enableNetworkMetrics ?? true,
      sampleRate: config.sampleRate ?? 1.0,
      budgets: config.budgets ?? {},
      analyticsEndpoint: config.analyticsEndpoint ?? '',
      debug: config.debug ?? false,
      autoStart: config.autoStart ?? true,
    };

    if (this.config.autoStart) {
      this.start();
    }
  }

  public static getInstance(config?: PerformanceExtensionConfig): PerformanceExtensionState {
    if (!PerformanceExtensionState.instance) {
      PerformanceExtensionState.instance = new PerformanceExtensionState(config);
    }
    return PerformanceExtensionState.instance;
  }

  public static resetInstance(): void {
    if (PerformanceExtensionState.instance) {
      PerformanceExtensionState.instance.stop();
      PerformanceExtensionState.instance = null;
    }
  }

  /**
   * Start all performance monitoring
   */
  public start(): void {
    if (this.isStarted) {
      this.log('Performance monitoring already started');
      return;
    }

    // Check sample rate
    if (Math.random() > this.config.sampleRate) {
      this.log('Skipping performance monitoring (sample rate)');
      return;
    }

    this.log('Starting performance monitoring');
    this.isStarted = true;
    this.sessionStartTime = Date.now();

    // Initialize vitals collector
    if (this.config.enableVitals) {
      this.vitalsCollector = getVitalsCollector({
        reportToAnalytics: !!this.config.analyticsEndpoint,
        analyticsEndpoint: this.config.analyticsEndpoint,
        budgets: this.config.budgets as Partial<PerformanceBudget>,
        debug: this.config.debug,
        sampleRate: this.config.sampleRate,
      });
      const cleanupVitals = this.vitalsCollector.init();
      this.cleanupFunctions.push(cleanupVitals);

      // Initialize enhanced collector
      this.enhancedCollector = getEnhancedVitalsCollector({
        enabled: true,
        metrics: ['LCP', 'FID', 'CLS', 'INP', 'FCP', 'TTFB'],
        attribution: true,
        sampleRate: this.config.sampleRate,
        reportEndpoint: this.config.analyticsEndpoint,
        debug: this.config.debug,
      });
      const cleanupEnhanced = this.enhancedCollector.init();
      this.cleanupFunctions.push(cleanupEnhanced);
    }

    // Initialize performance monitor
    this.performanceMonitor = getPerformanceMonitor({
      enableLongTaskMonitoring: this.config.enableLongTaskDetection,
      enableMemoryMonitoring: this.config.enableMemoryMonitoring,
      enableFrameMonitoring: true,
      enableResourceMonitoring: this.config.enableNetworkMetrics,
      debug: this.config.debug,
    });
    this.performanceMonitor.start();

    // Initialize budget manager
    this.budgetManager = getBudgetManager({
      budgets: this.config.budgets,
      enableAutoDegradation: true,
      debug: this.config.debug,
      onViolation: (violation) => {
        this.log('Budget violation:', violation);
        if (this.config.analyticsEndpoint) {
          this.sendToAnalytics('budget_violation', violation);
        }
      },
    });

    this.log('Performance monitoring started');
  }

  /**
   * Stop all performance monitoring
   */
  public stop(): void {
    if (!this.isStarted) return;

    this.log('Stopping performance monitoring');

    // Run cleanup functions
    this.cleanupFunctions.forEach((cleanup) => cleanup());
    this.cleanupFunctions = [];

    // Stop monitor
    if (this.performanceMonitor) {
      this.performanceMonitor.stop();
    }

    this.isStarted = false;
    this.log('Performance monitoring stopped');
  }

  /**
   * Track component render
   */
  public trackRender(componentName: string, phase: 'mount' | 'update' | 'unmount' = 'update'): () => void {
    if (!this.config.enableRenderTracking) {
      return () => {};
    }

    const startTime = performance.now();
    const timing: RenderTiming = {
      componentName,
      startTime,
      phase,
      timestamp: Date.now(),
    };

    const key = `${componentName}_${startTime}`;
    this.renderTimings.set(key, timing);

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      timing.endTime = endTime;
      timing.duration = duration;

      this.renderTimings.set(key, timing);

      // Record in budget if slow render
      if (duration > 16) { // Slower than 60fps frame budget
        this.budgetManager?.record('runtime.jsPerFrame', duration);
      }

      this.log(`Render ${componentName} (${phase}): ${duration.toFixed(2)}ms`);
    };
  }

  /**
   * Measure async operation
   */
  public async measureOperation<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    const startMark = `${name}_start`;
    performance.mark(startMark);

    let success = true;
    let error: Error | undefined;
    let result: T;

    try {
      result = await fn();
    } catch (err) {
      success = false;
      error = err as Error;
      throw err;
    } finally {
      const endTime = performance.now();
      const endMark = `${name}_end`;
      performance.mark(endMark);
      performance.measure(name, startMark, endMark);

      const duration = endTime - startTime;

      const timing: OperationTiming = {
        name,
        startTime,
        endTime,
        duration,
        success,
        error,
        timestamp: Date.now(),
      };

      this.operationTimings.push(timing);
      this.trimBuffer(this.operationTimings, 100);

      this.log(`Operation ${name}: ${duration.toFixed(2)}ms (${success ? 'success' : 'error'})`);

      // Track custom metric
      if (this.enhancedCollector) {
        this.enhancedCollector.trackCustomMetric(`operation.${name}`, duration);
      }
    }

    return result!;
  }

  /**
   * Set performance budget
   */
  public setPerformanceBudget(budgets: Partial<Record<string, BudgetThreshold>>): void {
    Object.entries(budgets).forEach(([name, threshold]) => {
      this.budgetManager?.registerBudget(name, threshold);
    });
    this.log('Performance budgets updated');
  }

  /**
   * Get current metrics
   */
  public getMetrics(): {
    vitals: VitalsSnapshot | null;
    performance: PerformanceMetrics | null;
    budgets: BudgetStatusSummary[];
    renders: RenderTiming[];
    operations: OperationTiming[];
    timeline: TimelineMarker[];
  } {
    return {
      vitals: this.vitalsCollector?.getSnapshot() ?? null,
      performance: this.performanceMonitor?.getMetrics() ?? null,
      budgets: this.budgetManager?.getAllStatuses() ?? [],
      renders: Array.from(this.renderTimings.values()),
      operations: [...this.operationTimings],
      timeline: [...this.timelineMarkers],
    };
  }

  /**
   * Mark timeline event
   */
  public markTimeline(name: string, type: 'mark' | 'measure' = 'mark'): void {
    const marker: TimelineMarker = {
      name,
      timestamp: Date.now(),
      type,
    };

    this.timelineMarkers.push(marker);
    this.trimBuffer(this.timelineMarkers, 100);

    // Use Performance API
    performance.mark(name);
    this.log(`Timeline marker: ${name}`);
  }

  /**
   * Get network quality
   */
  public getNetworkQuality(): NetworkQuality | null {
    if (!this.config.enableNetworkMetrics) return null;

    const nav = navigator as Navigator & {
      connection?: {
        effectiveType?: string;
        downlink?: number;
        rtt?: number;
        saveData?: boolean;
      };
    };

    if (!nav.connection) return null;

    return {
      effectiveType: nav.connection.effectiveType ?? 'unknown',
      downlink: nav.connection.downlink ?? 0,
      rtt: nav.connection.rtt ?? 0,
      saveData: nav.connection.saveData ?? false,
      timestamp: Date.now(),
    };
  }

  /**
   * Track bundle size
   */
  public trackBundleSize(name: string, size: number, type: 'initial' | 'async' | 'vendor' = 'async', gzipSize?: number): void {
    const info: BundleInfo = {
      name,
      size,
      gzipSize,
      type,
      timestamp: Date.now(),
    };

    this.bundleInfo.set(name, info);

    // Record in budget
    const budgetKey = `bundle.${type}`;
    this.budgetManager?.record(budgetKey, size);

    this.log(`Bundle tracked: ${name} (${this.formatBytes(size)})`);
  }

  /**
   * Calculate percentiles from array of values
   */
  private calculatePercentiles(values: number[]): Omit<AggregatedMetrics, 'name' | 'count' | 'stdDev'> {
    if (values.length === 0) {
      return { min: 0, max: 0, mean: 0, p50: 0, p75: 0, p90: 0, p95: 0, p99: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;

    const percentile = (p: number): number => {
      const index = Math.ceil((p / 100) * sorted.length) - 1;
      return sorted[Math.max(0, Math.min(index, sorted.length - 1))] ?? 0;
    };

    return {
      min: sorted[0] ?? 0,
      max: sorted[sorted.length - 1] ?? 0,
      mean,
      p50: percentile(50),
      p75: percentile(75),
      p90: percentile(90),
      p95: percentile(95),
      p99: percentile(99),
    };
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(values: number[], mean: number): number {
    if (values.length === 0) return 0;
    const squareDiffs = values.map((value) => Math.pow(value - mean, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquareDiff);
  }

  /**
   * Generate performance report
   */
  public generateReport(): PerformanceReport {
    const vitals = this.vitalsCollector?.getSnapshot() ?? null;
    const performance = this.performanceMonitor?.getMetrics() ?? null;
    const budgetStatus = this.budgetManager?.getAllStatuses() ?? [];
    const violations = this.budgetManager?.getViolations() ?? [];
    const healthScore = this.budgetManager?.getHealthScore() ?? 100;

    // Aggregate render metrics
    const renderDurations = Array.from(this.renderTimings.values())
      .filter((r) => r.duration !== undefined)
      .map((r) => r.duration!);

    const renderMetrics: AggregatedMetrics[] = [];
    if (renderDurations.length > 0) {
      const stats = this.calculatePercentiles(renderDurations);
      renderMetrics.push({
        name: 'component.renderTime',
        count: renderDurations.length,
        ...stats,
        stdDev: this.calculateStdDev(renderDurations, stats.mean),
      });
    }

    // Generate recommendations
    const recommendations: string[] = [];

    // Check vitals
    if (vitals) {
      if (vitals.LCP && vitals.LCP.rating !== 'good') {
        recommendations.push(`Optimize Largest Contentful Paint (${vitals.LCP.value.toFixed(0)}ms). Consider lazy loading images or reducing initial bundle size.`);
      }
      if (vitals.INP && vitals.INP.rating !== 'good') {
        recommendations.push(`Improve Interaction to Next Paint (${vitals.INP.value.toFixed(0)}ms). Reduce JavaScript execution time or use web workers.`);
      }
      if (vitals.CLS && vitals.CLS.rating !== 'good') {
        recommendations.push(`Reduce Cumulative Layout Shift (${vitals.CLS.value.toFixed(3)}). Reserve space for dynamic content and use size attributes on images.`);
      }
    }

    // Check long tasks
    if (performance && performance.criticalLongTaskCount > 0) {
      recommendations.push(`Found ${performance.criticalLongTaskCount} critical long tasks. Break up large synchronous operations or use requestIdleCallback.`);
    }

    // Check memory pressure
    if (performance && performance.currentMemoryPressure !== 'normal') {
      recommendations.push(`Memory pressure detected (${performance.currentMemoryPressure}). Review memory usage and implement cleanup strategies.`);
    }

    // Check budget violations
    const recentViolations = violations.filter((v) => v.timestamp > Date.now() - 60000);
    if (recentViolations.length > 0) {
      recommendations.push(`${recentViolations.length} budget violations in the last minute. Review performance budgets and optimize critical paths.`);
    }

    return {
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      sessionDuration: Date.now() - this.sessionStartTime,
      vitals,
      performance,
      budgetStatus,
      violations: violations.slice(-10),
      renderMetrics,
      networkQuality: this.getNetworkQuality(),
      healthScore,
      recommendations,
    };
  }

  /**
   * Send data to analytics endpoint
   */
  private async sendToAnalytics(eventName: string, data: unknown): Promise<void> {
    if (!this.config.analyticsEndpoint) return;

    try {
      const payload = {
        event: eventName,
        data,
        timestamp: Date.now(),
        url: typeof window !== 'undefined' ? window.location.href : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      };

      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        navigator.sendBeacon(this.config.analyticsEndpoint, JSON.stringify(payload));
      } else {
        await fetch(this.config.analyticsEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        });
      }
    } catch (error) {
      this.log('Failed to send analytics:', error);
    }
  }

  /**
   * Format bytes
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Trim buffer to max size
   */
  private trimBuffer<T>(buffer: T[], maxSize: number): void {
    if (buffer.length > maxSize) {
      buffer.splice(0, buffer.length - maxSize);
    }
  }

  /**
   * Debug logging
   */
  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      console.info(`[PerformanceExtension] ${message}`, ...args);
    }
  }
}

// ============================================================================
// Extension Definition
// ============================================================================

/**
 * Performance monitoring extension for Enzyme
 *
 * Provides comprehensive performance tracking capabilities including:
 * - Web Vitals (LCP, FID, CLS, FCP, TTFB, INP)
 * - Component render performance
 * - Memory monitoring
 * - Long task detection
 * - Performance budgets
 * - Metric aggregation and reporting
 */
export const performanceExtension: EnzymeExtension = {
  name: 'enzyme:performance',
  version: '2.0.0',
  description: 'Enterprise-grade performance monitoring with Web Vitals, budgets, and real-time tracking',

  // ============================================================================
  // Client Methods
  // ============================================================================

  client: {
    /**
     * Start performance monitoring
     */
    $startPerformanceMonitoring(config?: PerformanceExtensionConfig): void {
      const state = PerformanceExtensionState.getInstance(config);
      state.start();
    },

    /**
     * Stop performance monitoring
     */
    $stopPerformanceMonitoring(): void {
      const state = PerformanceExtensionState.getInstance();
      state.stop();
    },

    /**
     * Track component render
     * @param componentName - Name of the component
     * @returns Stop function to call when render completes
     */
    $trackRender(componentName: string, phase?: 'mount' | 'update' | 'unmount'): () => void {
      const state = PerformanceExtensionState.getInstance();
      return state.trackRender(componentName, phase);
    },

    /**
     * Measure async operation
     * @param name - Operation name
     * @param fn - Async function to measure
     * @returns Promise with operation result
     */
    async $measureOperation<T>(name: string, fn: () => Promise<T>): Promise<T> {
      const state = PerformanceExtensionState.getInstance();
      return state.measureOperation(name, fn);
    },

    /**
     * Set performance budget
     * @param budget - Budget configuration
     */
    $setPerformanceBudget(budget: Partial<Record<string, BudgetThreshold>>): void {
      const state = PerformanceExtensionState.getInstance();
      state.setPerformanceBudget(budget);
    },

    /**
     * Get current metrics
     * @returns Current performance metrics
     */
    $getMetrics(): {
      vitals: VitalsSnapshot | null;
      performance: PerformanceMetrics | null;
      budgets: BudgetStatusSummary[];
      renders: RenderTiming[];
      operations: OperationTiming[];
      timeline: TimelineMarker[];
    } {
      const state = PerformanceExtensionState.getInstance();
      return state.getMetrics();
    },

    /**
     * Get performance report
     * @returns Comprehensive performance report
     */
    $getPerformanceReport(): PerformanceReport {
      const state = PerformanceExtensionState.getInstance();
      return state.generateReport();
    },

    /**
     * Mark timeline event
     * @param name - Marker name
     * @param type - Marker type ('mark' or 'measure')
     */
    $markTimeline(name: string, type?: 'mark' | 'measure'): void {
      const state = PerformanceExtensionState.getInstance();
      state.markTimeline(name, type);
    },

    /**
     * Get network quality information
     * @returns Network quality metrics
     */
    $getNetworkQuality(): NetworkQuality | null {
      const state = PerformanceExtensionState.getInstance();
      return state.getNetworkQuality();
    },

    /**
     * Track bundle size
     * @param name - Bundle name
     * @param size - Bundle size in bytes
     * @param type - Bundle type
     * @param gzipSize - Gzipped size (optional)
     */
    $trackBundleSize(
      name: string,
      size: number,
      type?: 'initial' | 'async' | 'vendor',
      gzipSize?: number
    ): void {
      const state = PerformanceExtensionState.getInstance();
      state.trackBundleSize(name, size, type, gzipSize);
    },

    /**
     * Export performance report as JSON
     * @returns JSON string of performance report
     */
    $exportReport(): string {
      const state = PerformanceExtensionState.getInstance();
      const report = state.generateReport();
      return JSON.stringify(report, null, 2);
    },

    /**
     * Reset performance monitoring state
     */
    $resetPerformanceMonitoring(): void {
      PerformanceExtensionState.resetInstance();
    },
  },
};

// ============================================================================
// Exports
// ============================================================================

export type {
  PerformanceExtensionConfig,
  RenderTiming,
  OperationTiming,
  TimelineMarker,
  AggregatedMetrics,
  NetworkQuality,
  BundleInfo,
  PerformanceReport,
};

export default performanceExtension;
