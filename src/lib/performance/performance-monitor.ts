/**
 * @file Enhanced Performance Monitor
 * @description Comprehensive real-time performance monitoring system with:
 * - Performance budgets enforcement
 * - Long task detection and reporting
 * - Memory pressure monitoring
 * - Frame rate monitoring
 * - Resource timing analysis
 *
 * This module serves as the central orchestrator for all performance monitoring
 * capabilities, providing a unified API for tracking and reporting performance
 * metrics across the application.
 *
 * @example
 * ```typescript
 * import { PerformanceMonitor } from '@/lib/performance';
 *
 * const monitor = PerformanceMonitor.getInstance();
 * monitor.start();
 *
 * // Subscribe to events
 * monitor.on('longTask', (task) => console.log('Long task detected:', task));
 * monitor.on('budgetViolation', (violation) => console.warn('Budget exceeded:', violation));
 * ```
 */

import {
  performanceConfig,
  type PerformanceConfig,
  VITAL_THRESHOLDS,
  meetsVitalThreshold,
  formatDuration,
} from '../../config/performance.config';

/**
 * Type for valid vital metric names
 */
type VitalMetricName = keyof typeof VITAL_THRESHOLDS;

/**
 * Type guard to check if a string is a valid vital metric name
 */
function isVitalMetricName(metric: string): metric is VitalMetricName {
  return metric in VITAL_THRESHOLDS;
}
import {
  isMemoryApiSupported as isMemoryApiAvailable,
  getPerformanceMemory,
} from './utils/memory';

// ============================================================================
// Types
// ============================================================================

/**
 * Performance monitor event types
 */
export type PerformanceEventType =
  | 'longTask'
  | 'frameDrop'
  | 'memoryPressure'
  | 'budgetViolation'
  | 'resourceSlow'
  | 'vitalUpdate'
  | 'monitorStart'
  | 'monitorStop';

/**
 * Long task entry with attribution
 */
export interface LongTaskEntry {
  readonly id: string;
  readonly name: string;
  readonly startTime: number;
  readonly duration: number;
  readonly attribution: LongTaskAttribution[];
  readonly isCritical: boolean;
  readonly timestamp: number;
}

/**
 * Long task attribution (script/container info)
 */
export interface LongTaskAttribution {
  readonly name: string;
  readonly entryType: string;
  readonly startTime: number;
  readonly duration: number;
  readonly containerType?: string;
  readonly containerName?: string;
  readonly containerId?: string;
  readonly containerSrc?: string;
}

/**
 * Frame timing entry
 */
export interface FrameTimingEntry {
  readonly timestamp: number;
  readonly duration: number;
  readonly dropped: boolean;
  readonly fps: number;
}

/**
 * Memory snapshot
 */
export interface MemorySnapshot {
  readonly timestamp: number;
  readonly usedJSHeapSize: number;
  readonly totalJSHeapSize: number;
  readonly jsHeapSizeLimit: number;
  readonly usagePercentage: number;
  readonly pressure: 'normal' | 'warning' | 'critical';
}

/**
 * Budget violation entry
 */
export interface BudgetViolation {
  readonly id: string;
  readonly budgetType: string;
  readonly metricName: string;
  readonly actualValue: number;
  readonly budgetValue: number;
  readonly overage: number;
  readonly overagePercentage: number;
  readonly severity: 'warning' | 'critical';
  readonly timestamp: number;
  readonly url: string;
}

/**
 * Slow resource entry
 */
export interface SlowResourceEntry {
  readonly name: string;
  readonly initiatorType: string;
  readonly duration: number;
  readonly transferSize: number;
  readonly startTime: number;
  readonly threshold: number;
}

/**
 * Aggregated performance metrics
 */
export interface PerformanceMetrics {
  readonly longTasks: LongTaskEntry[];
  readonly totalLongTaskTime: number;
  readonly longTaskCount: number;
  readonly criticalLongTaskCount: number;
  readonly frameDrops: number;
  readonly averageFps: number;
  readonly memorySnapshots: MemorySnapshot[];
  readonly currentMemoryPressure: 'normal' | 'warning' | 'critical';
  readonly budgetViolations: BudgetViolation[];
  readonly slowResources: SlowResourceEntry[];
  readonly timestamp: number;
}

/**
 * Event callback type
 */
export type PerformanceEventCallback<T = unknown> = (data: T) => void;

/**
 * Event subscription
 */
interface EventSubscription {
  readonly id: string;
  readonly type: PerformanceEventType;
  readonly callback: PerformanceEventCallback;
}

/**
 * Monitor configuration options
 */
export interface PerformanceMonitorOptions {
  readonly config?: Partial<PerformanceConfig>;
  readonly autoStart?: boolean;
  readonly enableLongTaskMonitoring?: boolean;
  readonly enableMemoryMonitoring?: boolean;
  readonly enableFrameMonitoring?: boolean;
  readonly enableResourceMonitoring?: boolean;
  readonly slowResourceThreshold?: number;
  readonly debug?: boolean;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate unique ID
 */
function generateId(): string {
  return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if PerformanceObserver is supported
 */
function isPerformanceObserverSupported(): boolean {
  return typeof PerformanceObserver !== 'undefined';
}

// ============================================================================
// Performance Monitor Class
// ============================================================================

/**
 * Comprehensive performance monitoring system
 *
 * Singleton class that orchestrates all performance monitoring activities
 * including long task detection, memory pressure monitoring, frame rate
 * tracking, and budget enforcement.
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor | null = null;

  private readonly config: PerformanceConfig;
  private readonly options: Required<PerformanceMonitorOptions>;
  private readonly subscriptions: Map<string, EventSubscription> = new Map();

  private isRunning = false;
  private longTaskObserver: PerformanceObserver | null = null;
  private resourceObserver: PerformanceObserver | null = null;
  private frameMonitorId: number | null = null;
  private memoryMonitorId: ReturnType<typeof setInterval> | null = null;

  private longTasks: LongTaskEntry[] = [];
  private frameTimings: FrameTimingEntry[] = [];
  private memorySnapshots: MemorySnapshot[] = [];
  private budgetViolations: BudgetViolation[] = [];
  private slowResources: SlowResourceEntry[] = [];

  private lastFrameTime = 0;
  private frameCount = 0;
  private droppedFrames = 0;

  /**
   * Private constructor for singleton pattern
   */
  private constructor(options: PerformanceMonitorOptions = {}) {
    this.config = { ...performanceConfig, ...options.config };
    this.options = {
      config: this.config,
      autoStart: options.autoStart ?? false,
      enableLongTaskMonitoring: options.enableLongTaskMonitoring ?? true,
      enableMemoryMonitoring: options.enableMemoryMonitoring ?? true,
      enableFrameMonitoring: options.enableFrameMonitoring ?? true,
      enableResourceMonitoring: options.enableResourceMonitoring ?? true,
      slowResourceThreshold: options.slowResourceThreshold ?? 1000,
      debug: options.debug ?? this.config.monitoring.debug,
    };

    if (this.options.autoStart) {
      this.start();
    }
  }

  /**
   * Get singleton instance
   */
  public static getInstance(options?: PerformanceMonitorOptions): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor(options);
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Reset singleton instance (mainly for testing)
   */
  public static resetInstance(): void {
    if (PerformanceMonitor.instance) {
      PerformanceMonitor.instance.stop();
      PerformanceMonitor.instance = null;
    }
  }

  // ==========================================================================
  // Lifecycle Methods
  // ==========================================================================

  /**
   * Start all performance monitoring
   */
  public start(): void {
    if (this.isRunning) {
      this.log('Monitor already running');
      return;
    }

    this.log('Starting performance monitor');
    this.isRunning = true;

    if (this.options.enableLongTaskMonitoring) {
      this.startLongTaskMonitoring();
    }

    if (this.options.enableMemoryMonitoring) {
      this.startMemoryMonitoring();
    }

    if (this.options.enableFrameMonitoring) {
      this.startFrameMonitoring();
    }

    if (this.options.enableResourceMonitoring) {
      this.startResourceMonitoring();
    }

    this.emit('monitorStart', { timestamp: Date.now() });
  }

  /**
   * Stop all performance monitoring
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.log('Stopping performance monitor');
    this.isRunning = false;

    this.stopLongTaskMonitoring();
    this.stopMemoryMonitoring();
    this.stopFrameMonitoring();
    this.stopResourceMonitoring();

    this.emit('monitorStop', { timestamp: Date.now() });
  }

  /**
   * Reset all collected metrics
   */
  public reset(): void {
    this.longTasks = [];
    this.frameTimings = [];
    this.memorySnapshots = [];
    this.budgetViolations = [];
    this.slowResources = [];
    this.frameCount = 0;
    this.droppedFrames = 0;
    this.lastFrameTime = 0;

    this.log('Metrics reset');
  }

  // ==========================================================================
  // Long Task Monitoring
  // ==========================================================================

  /**
   * Start long task monitoring
   */
  private startLongTaskMonitoring(): void {
    if (!isPerformanceObserverSupported()) {
      this.log('PerformanceObserver not supported, skipping long task monitoring');
      return;
    }

    try {
      this.longTaskObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();

        entries.forEach((entry) => {
          const taskEntry = this.processLongTask(entry);
          if (taskEntry) {
            this.longTasks.push(taskEntry);
            this.trimBuffer(this.longTasks, this.config.longTask.historyBufferSize);
            this.emit('longTask', taskEntry);

            // Check if budget is exceeded
            if (this.longTasks.length > this.config.longTask.maxPerPageLoad) {
              this.recordBudgetViolation({
                budgetType: 'longTask',
                metricName: 'longTaskCount',
                actualValue: this.longTasks.length,
                budgetValue: this.config.longTask.maxPerPageLoad,
                severity: 'warning',
              });
            }
          }
        });
      });

      this.longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.log('Long task monitoring started');
    } catch (error) {
      this.log('Failed to start long task monitoring:', error);
    }
  }

  /**
   * Stop long task monitoring
   */
  private stopLongTaskMonitoring(): void {
    if (this.longTaskObserver) {
      this.longTaskObserver.disconnect();
      this.longTaskObserver = null;
    }
  }

  /**
   * Process a long task entry
   */
  private processLongTask(entry: PerformanceEntry): LongTaskEntry | null {
    const {duration} = entry;
    const isCritical = duration >= this.config.longTask.criticalThreshold;

    // Extract attribution if available
    const attribution: LongTaskAttribution[] = [];
    const entryWithAttribution = entry as PerformanceEntry & {
      attribution?: Array<{
        name?: string;
        entryType?: string;
        startTime?: number;
        duration?: number;
        containerType?: string;
        containerName?: string;
        containerId?: string;
        containerSrc?: string;
      }>;
    };

    if (entryWithAttribution.attribution) {
      entryWithAttribution.attribution.forEach((attr) => {
        attribution.push({
          name: attr.name ?? 'unknown',
          entryType: attr.entryType ?? 'unknown',
          startTime: attr.startTime ?? 0,
          duration: attr.duration ?? 0,
          containerType: attr.containerType,
          containerName: attr.containerName,
          containerId: attr.containerId,
          containerSrc: attr.containerSrc,
        });
      });
    }

    return {
      id: generateId(),
      name: entry.name,
      startTime: entry.startTime,
      duration,
      attribution,
      isCritical,
      timestamp: Date.now(),
    };
  }

  // ==========================================================================
  // Memory Monitoring
  // ==========================================================================

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    if (!isMemoryApiAvailable()) {
      this.log('Memory API not available, skipping memory monitoring');
      return;
    }

    this.memoryMonitorId = setInterval(() => {
      const snapshot = this.captureMemorySnapshot();
      if (snapshot) {
        this.memorySnapshots.push(snapshot);
        this.trimBuffer(this.memorySnapshots, 100);

        if (snapshot.pressure !== 'normal') {
          this.emit('memoryPressure', snapshot);

          if (snapshot.pressure === 'critical') {
            this.recordBudgetViolation({
              budgetType: 'memory',
              metricName: 'heapUsage',
              actualValue: snapshot.usagePercentage,
              budgetValue: this.config.memory.criticalThreshold,
              severity: 'critical',
            });
          }
        }
      }
    }, this.config.memory.pollingInterval);

    this.log('Memory monitoring started');
  }

  /**
   * Stop memory monitoring
   */
  private stopMemoryMonitoring(): void {
    if (this.memoryMonitorId) {
      clearInterval(this.memoryMonitorId);
      this.memoryMonitorId = null;
    }
  }

  /**
   * Capture memory snapshot
   */
  private captureMemorySnapshot(): MemorySnapshot | null {
    const memory = getPerformanceMemory();
    if (!memory) return null;

    const usagePercentage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    let pressure: 'normal' | 'warning' | 'critical' = 'normal';

    if (usagePercentage >= this.config.memory.criticalThreshold) {
      pressure = 'critical';
    } else if (usagePercentage >= this.config.memory.warningThreshold) {
      pressure = 'warning';
    }

    return {
      timestamp: Date.now(),
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usagePercentage,
      pressure,
    };
  }

  /**
   * Get current memory pressure level
   */
  public getMemoryPressure(): 'normal' | 'warning' | 'critical' {
    const snapshot = this.captureMemorySnapshot();
    return snapshot?.pressure ?? 'normal';
  }

  // ==========================================================================
  // Frame Rate Monitoring
  // ==========================================================================

  /**
   * Start frame rate monitoring
   */
  private startFrameMonitoring(): void {
    if (typeof requestAnimationFrame === 'undefined') {
      this.log('requestAnimationFrame not available, skipping frame monitoring');
      return;
    }

    this.lastFrameTime = performance.now();
    this.frameLoop();
    this.log('Frame monitoring started');
  }

  /**
   * Stop frame rate monitoring
   */
  private stopFrameMonitoring(): void {
    if (this.frameMonitorId !== null) {
      cancelAnimationFrame(this.frameMonitorId);
      this.frameMonitorId = null;
    }
  }

  /**
   * Frame loop for FPS monitoring
   */
  private frameLoop = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;

    this.frameCount++;

    // Detect dropped frames (> 2x frame budget indicates dropped frame)
    const dropped = delta > this.config.runtime.frameBudget * 2;
    if (dropped) {
      this.droppedFrames++;
      this.emit('frameDrop', {
        duration: delta,
        expected: this.config.runtime.frameBudget,
        timestamp: now,
      });
    }

    // Record frame timing periodically (every 60 frames)
    if (this.frameCount % 60 === 0) {
      const fps = 1000 / delta;
      const entry: FrameTimingEntry = {
        timestamp: now,
        duration: delta,
        dropped,
        fps: Math.round(fps),
      };
      this.frameTimings.push(entry);
      this.trimBuffer(this.frameTimings, 100);
    }

    this.frameMonitorId = requestAnimationFrame(this.frameLoop);
  };

  /**
   * Get current FPS
   */
  public getCurrentFps(): number {
    if (this.frameTimings.length === 0) return 60;
    const recent = this.frameTimings.slice(-10);
    const avgFps = recent.reduce((sum, f) => sum + f.fps, 0) / recent.length;
    return Math.round(avgFps);
  }

  // ==========================================================================
  // Resource Monitoring
  // ==========================================================================

  /**
   * Start resource monitoring
   */
  private startResourceMonitoring(): void {
    if (!isPerformanceObserverSupported()) {
      return;
    }

    try {
      this.resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries() as PerformanceResourceTiming[];

        entries.forEach((entry) => {
          if (entry.duration > this.options.slowResourceThreshold) {
            const slowEntry: SlowResourceEntry = {
              name: entry.name,
              initiatorType: entry.initiatorType,
              duration: entry.duration,
              transferSize: entry.transferSize,
              startTime: entry.startTime,
              threshold: this.options.slowResourceThreshold,
            };

            this.slowResources.push(slowEntry);
            this.trimBuffer(this.slowResources, 50);
            this.emit('resourceSlow', slowEntry);
          }
        });
      });

      this.resourceObserver.observe({ entryTypes: ['resource'] });
      this.log('Resource monitoring started');
    } catch (error) {
      this.log('Failed to start resource monitoring:', error);
    }
  }

  /**
   * Stop resource monitoring
   */
  private stopResourceMonitoring(): void {
    if (this.resourceObserver) {
      this.resourceObserver.disconnect();
      this.resourceObserver = null;
    }
  }

  // ==========================================================================
  // Budget Enforcement
  // ==========================================================================

  /**
   * Record a budget violation
   */
  private recordBudgetViolation(violation: Omit<BudgetViolation, 'id' | 'overage' | 'overagePercentage' | 'timestamp' | 'url'>): void {
    const entry: BudgetViolation = {
      id: generateId(),
      ...violation,
      overage: violation.actualValue - violation.budgetValue,
      overagePercentage: ((violation.actualValue - violation.budgetValue) / violation.budgetValue) * 100,
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : '',
    };

    this.budgetViolations.push(entry);
    this.trimBuffer(this.budgetViolations, 100);
    this.emit('budgetViolation', entry);
  }

  /**
   * Check a custom budget
   */
  public checkBudget(
    budgetType: string,
    metricName: string,
    actualValue: number,
    budgetValue: number,
    severity: 'warning' | 'critical' = 'warning'
  ): boolean {
    const isViolated = actualValue > budgetValue;

    if (isViolated) {
      this.recordBudgetViolation({
        budgetType,
        metricName,
        actualValue,
        budgetValue,
        severity,
      });
    }

    return !isViolated;
  }

  /**
   * Check Core Web Vital against threshold
   */
  public checkVitalBudget(metric: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    // Validate metric is a known vital threshold
    if (!isVitalMetricName(metric)) {
      this.log(`Unknown vital metric: ${metric}`);
      return 'poor';
    }

    const rating = meetsVitalThreshold(metric, value);
    const vitalThreshold = VITAL_THRESHOLDS[metric];
    const budgetValue = vitalThreshold?.good ?? 0;

    if (rating === 'poor') {
      this.recordBudgetViolation({
        budgetType: 'vital',
        metricName: metric,
        actualValue: value,
        budgetValue,
        severity: 'critical',
      });
    } else if (rating === 'needs-improvement') {
      this.recordBudgetViolation({
        budgetType: 'vital',
        metricName: metric,
        actualValue: value,
        budgetValue,
        severity: 'warning',
      });
    }

    this.emit('vitalUpdate', { metric, value, rating });
    return rating;
  }

  // ==========================================================================
  // Event System
  // ==========================================================================

  /**
   * Subscribe to performance events
   */
  public on<T = unknown>(
    type: PerformanceEventType,
    callback: PerformanceEventCallback<T>
  ): () => void {
    const id = generateId();
    const subscription: EventSubscription = {
      id,
      type,
      callback: callback as PerformanceEventCallback,
    };

    this.subscriptions.set(id, subscription);

    // Return unsubscribe function
    return () => {
      this.subscriptions.delete(id);
    };
  }

  /**
   * Emit performance event
   */
  private emit<T>(type: PerformanceEventType, data: T): void {
    this.subscriptions.forEach((subscription) => {
      if (subscription.type === type) {
        try {
          subscription.callback(data);
        } catch (error) {
          this.log(`Error in event handler for ${type}:`, error);
        }
      }
    });
  }

  // ==========================================================================
  // Metrics Access
  // ==========================================================================

  /**
   * Get aggregated performance metrics
   */
  public getMetrics(): PerformanceMetrics {
    const totalLongTaskTime = this.longTasks.reduce((sum, t) => sum + t.duration, 0);
    const criticalLongTaskCount = this.longTasks.filter((t) => t.isCritical).length;

    return {
      longTasks: [...this.longTasks],
      totalLongTaskTime,
      longTaskCount: this.longTasks.length,
      criticalLongTaskCount,
      frameDrops: this.droppedFrames,
      averageFps: this.getCurrentFps(),
      memorySnapshots: [...this.memorySnapshots],
      currentMemoryPressure: this.getMemoryPressure(),
      budgetViolations: [...this.budgetViolations],
      slowResources: [...this.slowResources],
      timestamp: Date.now(),
    };
  }

  /**
   * Get long tasks
   */
  public getLongTasks(): LongTaskEntry[] {
    return [...this.longTasks];
  }

  /**
   * Get budget violations
   */
  public getBudgetViolations(): BudgetViolation[] {
    return [...this.budgetViolations];
  }

  /**
   * Get slow resources
   */
  public getSlowResources(): SlowResourceEntry[] {
    return [...this.slowResources];
  }

  /**
   * Get memory snapshots
   */
  public getMemorySnapshots(): MemorySnapshot[] {
    return [...this.memorySnapshots];
  }

  /**
   * Check if monitoring is running
   */
  public isMonitoring(): boolean {
    return this.isRunning;
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

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
    if (this.options.debug) {
      console.log(`[PerformanceMonitor] ${message}`, ...args);
    }
  }

  /**
   * Generate performance report
   */
  public generateReport(): string {
    const metrics = this.getMetrics();

    const lines = [
      '='.repeat(60),
      'PERFORMANCE MONITOR REPORT',
      '='.repeat(60),
      '',
      `Generated: ${new Date().toISOString()}`,
      `URL: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}`,
      '',
      '--- Long Tasks ---',
      `Total Count: ${metrics.longTaskCount}`,
      `Critical Count: ${metrics.criticalLongTaskCount}`,
      `Total Blocking Time: ${formatDuration(metrics.totalLongTaskTime)}`,
      '',
      '--- Frame Rate ---',
      `Average FPS: ${metrics.averageFps}`,
      `Dropped Frames: ${metrics.frameDrops}`,
      '',
      '--- Memory ---',
      `Current Pressure: ${metrics.currentMemoryPressure}`,
      `Snapshots: ${metrics.memorySnapshots.length}`,
      '',
      '--- Budget Violations ---',
      `Total Violations: ${metrics.budgetViolations.length}`,
      ...metrics.budgetViolations.slice(-5).map(
        (v) => `  - ${v.metricName}: ${v.actualValue} (budget: ${v.budgetValue})`
      ),
      '',
      '--- Slow Resources ---',
      `Total: ${metrics.slowResources.length}`,
      ...metrics.slowResources.slice(-5).map(
        (r) => `  - ${r.name.split('/').pop()}: ${formatDuration(r.duration)}`
      ),
      '',
      '='.repeat(60),
    ];

    return lines.join('\n');
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get the singleton PerformanceMonitor instance
 */
export function getPerformanceMonitor(
  options?: PerformanceMonitorOptions
): PerformanceMonitor {
  return PerformanceMonitor.getInstance(options);
}

/**
 * Start performance monitoring with default options
 */
export function startPerformanceMonitoring(
  options?: PerformanceMonitorOptions
): PerformanceMonitor {
  const monitor = getPerformanceMonitor(options);
  monitor.start();
  return monitor;
}

/**
 * Stop performance monitoring
 */
export function stopPerformanceMonitoring(): void {
  const monitor = getPerformanceMonitor();
  monitor.stop();
}

// ============================================================================
// Exports
// ============================================================================
