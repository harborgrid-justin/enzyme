/**
 * @file Performance Monitor
 * @description Enterprise-grade performance monitoring with metrics collection,
 * profiling, and web vitals tracking
 */

/**
 * Performance metric types
 */
export type MetricType =
  | 'timing'
  | 'counter'
  | 'gauge'
  | 'histogram';

/**
 * Performance metric entry
 */
export interface PerformanceMetric {
  name: string;
  type: MetricType;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
  unit?: string;
}

/**
 * Histogram bucket
 */
interface HistogramBucket {
  le: number;
  count: number;
}

/**
 * Histogram data
 */
export interface HistogramData {
  buckets: HistogramBucket[];
  sum: number;
  count: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p90: number;
  p99: number;
}

/**
 * Performance monitor configuration
 */
export interface PerformanceMonitorConfig {
  /** Enable performance monitoring */
  enabled?: boolean;
  /** Sample rate (0-1) */
  sampleRate?: number;
  /** Buffer size before flush */
  bufferSize?: number;
  /** Flush interval (ms) */
  flushInterval?: number;
  /** Metric reporter function */
  reporter?: (metrics: PerformanceMetric[]) => void | Promise<void>;
  /** Default tags for all metrics */
  defaultTags?: Record<string, string>;
}

/**
 * Default histogram buckets (in ms)
 */
const DEFAULT_BUCKETS = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

/**
 * Performance monitor class
 */
export class PerformanceMonitor {
  private config: Required<Omit<PerformanceMonitorConfig, 'reporter' | 'defaultTags'>> & {
    reporter?: PerformanceMonitorConfig['reporter'];
    defaultTags: Record<string, string>;
  };
  private buffer: PerformanceMetric[] = [];
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private marks: Map<string, number> = new Map();

  constructor(config: PerformanceMonitorConfig = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      sampleRate: config.sampleRate ?? 1.0,
      bufferSize: config.bufferSize ?? 100,
      flushInterval: config.flushInterval ?? 30000, // 30 seconds
      reporter: config.reporter,
      defaultTags: config.defaultTags ?? {},
    };

    if (this.config.enabled && this.config.flushInterval > 0) {
      this.startFlushTimer();
    }
  }

  /**
   * Record a timing metric
   */
  timing(
    name: string,
    value: number,
    tags?: Record<string, string>
  ): void {
    if (!this.shouldSample()) return;

    this.addMetric({
      name,
      type: 'timing',
      value,
      timestamp: Date.now(),
      tags: { ...this.config.defaultTags, ...tags },
      unit: 'ms',
    });

    // Also add to histogram
    this.recordHistogram(name, value);
  }

  /**
   * Increment a counter
   */
  increment(
    name: string,
    value = 1,
    tags?: Record<string, string>
  ): void {
    if (!this.config.enabled) return;

    const key = this.getKey(name, tags);
    const current = this.counters.get(key) ?? 0;
    this.counters.set(key, current + value);

    this.addMetric({
      name,
      type: 'counter',
      value: current + value,
      timestamp: Date.now(),
      tags: { ...this.config.defaultTags, ...tags },
    });
  }

  /**
   * Decrement a counter
   */
  decrement(
    name: string,
    value = 1,
    tags?: Record<string, string>
  ): void {
    this.increment(name, -value, tags);
  }

  /**
   * Set a gauge value
   */
  gauge(
    name: string,
    value: number,
    tags?: Record<string, string>
  ): void {
    if (!this.config.enabled) return;

    const key = this.getKey(name, tags);
    this.gauges.set(key, value);

    this.addMetric({
      name,
      type: 'gauge',
      value,
      timestamp: Date.now(),
      tags: { ...this.config.defaultTags, ...tags },
    });
  }

  /**
   * Record a histogram value
   */
  histogram(
    name: string,
    value: number,
    tags?: Record<string, string>
  ): void {
    if (!this.shouldSample()) return;

    this.recordHistogram(name, value);

    this.addMetric({
      name,
      type: 'histogram',
      value,
      timestamp: Date.now(),
      tags: { ...this.config.defaultTags, ...tags },
      unit: 'ms',
    });
  }

  /**
   * Get histogram statistics
   */
  getHistogramStats(name: string): HistogramData | null {
    const values = this.histograms.get(name);
    if (!values || values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const count = values.length;

    // Calculate percentiles
    const p50 = sorted[Math.floor(count * 0.5)] ?? 0;
    const p90 = sorted[Math.floor(count * 0.9)] ?? 0;
    const p99 = sorted[Math.floor(count * 0.99)] ?? 0;

    // Calculate bucket counts
    const buckets = DEFAULT_BUCKETS.map((le) => ({
      le,
      count: values.filter((v) => v <= le).length,
    }));

    return {
      buckets,
      sum,
      count,
      min: sorted[0] ?? 0,
      max: sorted[count - 1] ?? 0,
      avg: sum / count,
      p50,
      p90,
      p99,
    };
  }

  /**
   * Mark a point in time for later measurement
   */
  mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  /**
   * Measure time since a mark
   */
  measure(name: string, markName: string, tags?: Record<string, string>): number {
    const start = this.marks.get(markName);
    if (start === undefined) {
      console.warn(`[PerformanceMonitor] Mark "${markName}" not found`);
      return 0;
    }

    const duration = performance.now() - start;
    this.timing(name, duration, tags);
    return duration;
  }

  /**
   * Create a timer function
   */
  startTimer(name: string, tags?: Record<string, string>): () => number {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.timing(name, duration, tags);
      return duration;
    };
  }

  /**
   * Time an async function
   */
  async timeAsync<T>(
    name: string,
    fn: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    const end = this.startTimer(name, tags);
    try {
      return await fn();
    } finally {
      end();
    }
  }

  /**
   * Time a sync function
   */
  timeSync<T>(
    name: string,
    fn: () => T,
    tags?: Record<string, string>
  ): T {
    const end = this.startTimer(name, tags);
    try {
      return fn();
    } finally {
      end();
    }
  }

  /**
   * Flush metrics buffer
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const metrics = [...this.buffer];
    this.buffer = [];

    try {
      await this.config.reporter?.(metrics);
    } catch (error) {
      console.error('[PerformanceMonitor] Failed to report metrics:', error);
      // Re-add metrics to buffer if reporting fails
      this.buffer.unshift(...metrics);
    }
  }

  /**
   * Get all current counter values
   */
  getCounters(): Map<string, number> {
    return new Map(this.counters);
  }

  /**
   * Get all current gauge values
   */
  getGauges(): Map<string, number> {
    return new Map(this.gauges);
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.buffer = [];
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.marks.clear();
  }

  /**
   * Dispose the monitor
   */
  dispose(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    void this.flush();
    this.reset();
  }

  /**
   * Start periodic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, this.config.flushInterval);
  }

  /**
   * Check if metric should be sampled
   */
  private shouldSample(): boolean {
    return this.config.enabled && Math.random() < (this.config.sampleRate ?? 1);
  }

  /**
   * Record histogram internally
   */
  private recordHistogram(name: string, value: number): void {
    const values = this.histograms.get(name) ?? [];
    values.push(value);

    // Keep last 1000 values
    if (values.length > 1000) {
      values.shift();
    }

    this.histograms.set(name, values);
  }

  /**
   * Add metric to buffer
   */
  private addMetric(metric: PerformanceMetric): void {
    this.buffer.push(metric);

    if (this.buffer.length >= this.config.bufferSize) {
      void this.flush();
    }
  }

  /**
   * Generate key from name and tags
   */
  private getKey(name: string, tags?: Record<string, string>): string {
    if (!tags) return name;
    const tagStr = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return `${name}:${tagStr}`;
  }
}

/**
 * Web Vitals metrics
 */
export interface WebVitals {
  /** Largest Contentful Paint */
  LCP?: number;
  /** First Input Delay */
  FID?: number;
  /** Cumulative Layout Shift */
  CLS?: number;
  /** First Contentful Paint */
  FCP?: number;
  /** Time to First Byte */
  TTFB?: number;
  /** Interaction to Next Paint */
  INP?: number;
}

/**
 * Web Vitals collector
 */
export class WebVitalsCollector {
  private vitals: WebVitals = {};
  private callbacks: Set<(vitals: WebVitals) => void> = new Set();
  private observer: PerformanceObserver | null = null;

  /**
   * Start collecting web vitals
   */
  start(): void {
    if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') {
      return;
    }

    // Collect paint timing
    this.observePaintTiming();

    // Collect layout shift
    this.observeLayoutShift();

    // Collect largest contentful paint
    this.observeLCP();

    // Collect first input delay
    this.observeFirstInput();
  }

  /**
   * Get current vitals
   */
  getVitals(): WebVitals {
    // Calculate TTFB
    if (typeof window !== 'undefined' && window.performance !== undefined) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      if (navigation !== undefined) {
        this.vitals.TTFB = navigation.responseStart - navigation.requestStart;
      }
    }
    return { ...this.vitals };
  }

  /**
   * Subscribe to vitals updates
   */
  subscribe(callback: (vitals: WebVitals) => void): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Stop collecting
   */
  stop(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  /**
   * Observe paint timing
   */
  private observePaintTiming(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.vitals.FCP = entry.startTime;
            this.notify();
          }
        }
      });
      observer.observe({ entryTypes: ['paint'] });
    } catch {
      // Paint timing not supported
    }
  }

  /**
   * Observe layout shift
   */
  private observeLayoutShift(): void {
    try {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutShiftEntry = entry as PerformanceEntry & {
            hadRecentInput?: boolean;
            value?: number;
          };
          if (layoutShiftEntry.hadRecentInput !== true && typeof layoutShiftEntry.value === 'number' && layoutShiftEntry.value > 0) {
            clsValue += layoutShiftEntry.value;
            this.vitals.CLS = clsValue;
            this.notify();
          }
        }
      });
      observer.observe({ entryTypes: ['layout-shift'] });
    } catch {
      // Layout shift not supported
    }
  }

  /**
   * Observe LCP
   */
  private observeLCP(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          this.vitals.LCP = lastEntry.startTime;
          this.notify();
        }
      });
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch {
      // LCP not supported
    }
  }

  /**
   * Observe first input
   */
  private observeFirstInput(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entry = list.getEntries()[0] as PerformanceEntry & {
          processingStart?: number;
        };
        if (entry?.processingStart !== undefined) {
          this.vitals.FID = entry.processingStart - entry.startTime;
          this.notify();
        }
      });
      observer.observe({ entryTypes: ['first-input'] });
    } catch {
      // First input not supported
    }
  }

  /**
   * Notify subscribers
   */
  private notify(): void {
    const vitals = this.getVitals();
    for (const callback of this.callbacks) {
      try {
        callback(vitals);
      } catch (error) {
        console.error('[WebVitalsCollector] Callback error:', error);
      }
    }
  }
}

/**
 * Resource timing utilities
 */
export const resourceTiming = {
  /**
   * Get all resource timing entries
   */
  getEntries(): PerformanceResourceTiming[] {
    if (typeof window === 'undefined' || window.performance === undefined) {
      return [];
    }
    return performance.getEntriesByType('resource');
  },

  /**
   * Get entries by type
   */
  getEntriesByType(type: 'script' | 'link' | 'img' | 'fetch' | 'xmlhttprequest'): PerformanceResourceTiming[] {
    return this.getEntries().filter((entry) => entry.initiatorType === type);
  },

  /**
   * Get slow resources
   */
  getSlowResources(threshold = 1000): PerformanceResourceTiming[] {
    return this.getEntries().filter((entry) => entry.duration > threshold);
  },

  /**
   * Get total transfer size
   */
  getTotalTransferSize(): number {
    return this.getEntries().reduce((sum, entry) => sum + (entry.transferSize ?? 0), 0);
  },

  /**
   * Get resource summary
   */
  getSummary(): {
    count: number;
    totalSize: number;
    slowCount: number;
    avgDuration: number;
    byType: Record<string, number>;
  } {
    const entries = this.getEntries();
    const byType: Record<string, number> = {};

    for (const entry of entries) {
      byType[entry.initiatorType] = (byType[entry.initiatorType] ?? 0) + 1;
    }

    const totalDuration = entries.reduce((sum, e) => sum + e.duration, 0);

    return {
      count: entries.length,
      totalSize: this.getTotalTransferSize(),
      slowCount: this.getSlowResources().length,
      avgDuration: entries.length > 0 ? totalDuration / entries.length : 0,
      byType,
    };
  },

  /**
   * Clear resource timing buffer
   */
  clearBuffer(): void {
    if (typeof window !== 'undefined' && typeof window.performance !== 'undefined') {
      performance.clearResourceTimings();
    }
  },
};

/**
 * Long task observer
 */
export class LongTaskObserver {
  private observer: PerformanceObserver | null = null;
  private tasks: Array<{ startTime: number; duration: number; attribution: string }> = [];
  private callbacks: Set<(task: { startTime: number; duration: number; attribution: string }) => void> = new Set();

  /**
   * Start observing long tasks
   */
  start(): void {
    if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') {
      return;
    }

    try {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const longTaskEntry = entry as PerformanceEntry & {
            attribution?: Array<{ name?: string }>;
          };
          const task = {
            startTime: entry.startTime,
            duration: entry.duration,
            attribution: longTaskEntry.attribution?.[0]?.name ?? 'unknown',
          };
          this.tasks.push(task);
          this.notifyCallbacks(task);
        }
      });
      this.observer.observe({ entryTypes: ['longtask'] });
    } catch {
      // Long tasks not supported
    }
  }

  /**
   * Stop observing
   */
  stop(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  /**
   * Subscribe to long task events
   */
  subscribe(callback: (task: { startTime: number; duration: number; attribution: string }) => void): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Get all recorded long tasks
   */
  getTasks(): Array<{ startTime: number; duration: number; attribution: string }> {
    return [...this.tasks];
  }

  /**
   * Get task statistics
   */
  getStats(): {
    count: number;
    totalDuration: number;
    avgDuration: number;
    maxDuration: number;
  } {
    if (this.tasks.length === 0) {
      return { count: 0, totalDuration: 0, avgDuration: 0, maxDuration: 0 };
    }

    const totalDuration = this.tasks.reduce((sum, t) => sum + t.duration, 0);
    const maxDuration = Math.max(...this.tasks.map((t) => t.duration));

    return {
      count: this.tasks.length,
      totalDuration,
      avgDuration: totalDuration / this.tasks.length,
      maxDuration,
    };
  }

  /**
   * Clear recorded tasks
   */
  clear(): void {
    this.tasks = [];
  }

  /**
   * Notify callbacks
   */
  private notifyCallbacks(task: { startTime: number; duration: number; attribution: string }): void {
    for (const callback of this.callbacks) {
      try {
        callback(task);
      } catch (error) {
        console.error('[LongTaskObserver] Callback error:', error);
      }
    }
  }
}

  /**
   * Global performance monitor singleton
   */
  export const performanceMonitor = new PerformanceMonitor({
    reporter: (metrics) => {
      if (import.meta.env.DEV) {
        console.info('[Performance]', metrics);
      }
    },
  });/**
 * Global web vitals collector
 */
export const webVitals = new WebVitalsCollector();

/**
 * Global long task observer
 */
export const longTaskObserver = new LongTaskObserver();
