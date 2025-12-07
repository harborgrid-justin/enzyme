/**
 * Performance Monitor for Enzyme VS Code Extension
 * Tracks and measures performance metrics for optimization
 */

import { logger } from './logger';

/**
 * Performance metric entry
 */
interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

/**
 * PERFORMANCE: Performance monitoring utility
 * Measures and tracks extension performance metrics
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics = new Map<string, PerformanceMetric>();
  private metricHistory: PerformanceMetric[] = [];
  private readonly MAX_HISTORY = 100;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start measuring a metric
   */
  public start(name: string, metadata?: Record<string, unknown>): void {
    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata,
    });
  }

  /**
   * End measuring a metric
   */
  public end(name: string): number | undefined {
    const metric = this.metrics.get(name);
    if (!metric) {
      logger.warn(`Performance metric not found: ${name}`);
      return undefined;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;

    // Add to history
    this.metricHistory.push({ ...metric });
    if (this.metricHistory.length > this.MAX_HISTORY) {
      this.metricHistory.shift();
    }

    // Remove from active metrics
    this.metrics.delete(name);

    // Log slow operations
    if (duration > 1000) {
      logger.warn(`Slow operation: ${name} took ${duration.toFixed(2)}ms`, metric.metadata);
    } else {
      logger.debug(`Performance: ${name} took ${duration.toFixed(2)}ms`, metric.metadata);
    }

    return duration;
  }

  /**
   * Measure a function execution
   */
  public async measure<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    this.start(name, metadata);
    try {
      const result = await fn();
      return result;
    } finally {
      this.end(name);
    }
  }

  /**
   * Measure a synchronous function execution
   */
  public measureSync<T>(
    name: string,
    fn: () => T,
    metadata?: Record<string, unknown>
  ): T {
    this.start(name, metadata);
    try {
      const result = fn();
      return result;
    } finally {
      this.end(name);
    }
  }

  /**
   * Get metric statistics
   */
  public getStatistics(): {
    totalMetrics: number;
    activeMetrics: number;
    averageDuration: number;
    slowOperations: PerformanceMetric[];
  } {
    const completedMetrics = this.metricHistory.filter(m => m.duration !== undefined);
    const totalDuration = completedMetrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    const averageDuration = completedMetrics.length > 0 ? totalDuration / completedMetrics.length : 0;

    const slowOperations = completedMetrics
      .filter(m => (m.duration || 0) > 1000)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0));

    return {
      totalMetrics: this.metricHistory.length,
      activeMetrics: this.metrics.size,
      averageDuration,
      slowOperations,
    };
  }

  /**
   * Get all metrics
   */
  public getMetrics(): PerformanceMetric[] {
    return [...this.metricHistory];
  }

  /**
   * Clear metrics
   */
  public clear(): void {
    this.metrics.clear();
    this.metricHistory = [];
  }

  /**
   * Export metrics as JSON
   */
  public exportMetrics(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      statistics: this.getStatistics(),
      metrics: this.metricHistory,
    }, null, 2);
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = PerformanceMonitor.getInstance();

/**
 * Decorator for measuring method performance
 */
export function measurePerformance(target: unknown, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
  const originalMethod = descriptor.value;

  descriptor.value = async function(...args: unknown[]) {
    const monitor = PerformanceMonitor.getInstance();
    const metricName = `${target.constructor.name}.${propertyKey}`;

    monitor.start(metricName);
    try {
      const result = await originalMethod.apply(this, args);
      return result;
    } finally {
      monitor.end(metricName);
    }
  };

  return descriptor;
}
