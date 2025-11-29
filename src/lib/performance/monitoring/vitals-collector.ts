/**
 * @file Enhanced Vitals Collector
 * @description Extended Core Web Vitals collection with advanced attribution,
 * custom metrics, and detailed analysis.
 *
 * Features:
 * - Core Web Vitals (LCP, FID, CLS, INP, FCP, TTFB)
 * - Custom metric definitions
 * - Attribution analysis
 * - Element-level tracking
 * - Historical comparison
 * - Threshold management
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Metric name type
 */
export type MetricName =
  | 'LCP'
  | 'FID'
  | 'CLS'
  | 'INP'
  | 'FCP'
  | 'TTFB'
  | 'FMP'
  | 'TTI'
  | 'TBT'
  | 'custom';

/**
 * Metric rating
 */
export type MetricRating = 'good' | 'needs-improvement' | 'poor';

/**
 * Collected metric data
 */
export interface CollectedMetric {
  name: MetricName | string;
  value: number;
  rating: MetricRating;
  delta: number;
  id: string;
  navigationType: string;
  timestamp: number;
  attribution: MetricAttribution | null;
  entries: PerformanceEntry[];
}

/**
 * Metric attribution data
 */
export interface MetricAttribution {
  element?: string;
  url?: string;
  timeToFirstByte?: number;
  resourceLoadDelay?: number;
  elementRenderDelay?: number;
  lcpResourceEntry?: PerformanceResourceTiming;
  largestShiftTarget?: string;
  largestShiftTime?: number;
  loadState?: string;
  eventTarget?: string;
  eventType?: string;
  eventTime?: number;
  nextPaintTime?: number;
}

/**
 * Metric thresholds
 */
export interface MetricThresholds {
  good: number;
  poor: number;
}

/**
 * Collection configuration
 */
export interface VitalsCollectionConfig {
  /** Enable collection */
  enabled: boolean;
  /** Metrics to collect */
  metrics: MetricName[];
  /** Custom thresholds */
  thresholds?: Partial<Record<MetricName, MetricThresholds>>;
  /** Enable attribution */
  attribution: boolean;
  /** Sample rate (0-1) */
  sampleRate: number;
  /** Report endpoint */
  reportEndpoint?: string;
  /** Batch reports */
  batchReports: boolean;
  /** Batch interval in ms */
  batchInterval: number;
  /** Debug mode */
  debug: boolean;
}

/**
 * Metric callback
 */
export type MetricCallback = (metric: CollectedMetric) => void;

// ============================================================================
// Constants
// ============================================================================

/**
 * Default thresholds based on Google recommendations
 */
export const DEFAULT_THRESHOLDS: Record<MetricName, MetricThresholds> = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  INP: { good: 200, poor: 500 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
  FMP: { good: 2000, poor: 4000 },
  TTI: { good: 3800, poor: 7300 },
  TBT: { good: 200, poor: 600 },
  custom: { good: 100, poor: 500 },
};

const DEFAULT_CONFIG: VitalsCollectionConfig = {
  enabled: true,
  metrics: ['LCP', 'FID', 'CLS', 'INP', 'FCP', 'TTFB'],
  attribution: true,
  sampleRate: 1.0,
  batchReports: true,
  batchInterval: 5000,
  debug: false,
};

// ============================================================================
// Enhanced Vitals Collector
// ============================================================================

/**
 * Enhanced vitals collection with attribution
 */
export class EnhancedVitalsCollector {
  private config: VitalsCollectionConfig;
  private thresholds: Record<string, MetricThresholds>;
  private metrics: Map<string, CollectedMetric[]> = new Map();
  private callbacks: Set<MetricCallback> = new Set();
  private reportBuffer: CollectedMetric[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private observers: PerformanceObserver[] = [];
  private isInitialized = false;

  constructor(config: Partial<VitalsCollectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.thresholds = {
      ...DEFAULT_THRESHOLDS,
      ...config.thresholds,
    };
  }

  /**
   * Initialize vitals collection
   */
  init(): () => void {
    if (this.isInitialized || !this.config.enabled) {
      return () => {};
    }

    // Check sample rate
    if (Math.random() > this.config.sampleRate) {
      this.log('Skipping collection (sample rate)');
      return () => {};
    }

    this.isInitialized = true;
    this.log('Initializing enhanced vitals collector');

    // Set up metric collection
    this.setupMetricCollection();

    // Set up batch reporting
    if (this.config.batchReports) {
      this.startBatchFlush();
    }

    // Set up page lifecycle handlers
    this.setupLifecycleHandlers();

    // Return cleanup function
    return () => this.cleanup();
  }

  /**
   * Subscribe to metric updates
   */
  subscribe(callback: MetricCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Get all collected metrics
   */
  getMetrics(): Map<string, CollectedMetric[]> {
    return new Map(this.metrics);
  }

  /**
   * Get specific metric
   */
  getMetric(name: MetricName): CollectedMetric[] {
    return this.metrics.get(name) ?? [];
  }

  /**
   * Get latest value for a metric
   */
  getLatestValue(name: MetricName): CollectedMetric | null {
    const metrics = this.metrics.get(name);
    return metrics?.[metrics.length - 1] ?? null;
  }

  /**
   * Track a custom metric
   */
  trackCustomMetric(
    name: string,
    value: number,
    thresholds?: MetricThresholds
  ): void {
    const effectiveThresholds = thresholds ?? this.thresholds.custom;
    const rating = effectiveThresholds ? this.calculateRating(value, effectiveThresholds) : 'good';

    const metric: CollectedMetric = {
      name,
      value,
      rating,
      delta: value,
      id: this.generateId(),
      navigationType: 'custom',
      timestamp: Date.now(),
      attribution: null,
      entries: [],
    };

    this.recordMetric(metric);
  }

  /**
   * Start a custom timing
   */
  startTiming(name: string): () => void {
    const startTime = performance.now();
    const startMark = `${name}-start`;
    performance.mark(startMark);

    return () => {
      const endMark = `${name}-end`;
      performance.mark(endMark);
      performance.measure(name, startMark, endMark);

      const duration = performance.now() - startTime;
      this.trackCustomMetric(name, duration);
    };
  }

  /**
   * Flush any pending reports
   */
  flush(): void {
    if (this.reportBuffer.length === 0) return;

    const reports = [...this.reportBuffer];
    this.reportBuffer = [];

    if (this.config.reportEndpoint != null && this.config.reportEndpoint !== '') {
      void this.sendToEndpoint(reports);
    }
  }

  /**
   * Get summary statistics
   */
  getSummary(): Record<string, { value: number; rating: MetricRating } | null> {
    const summary: Record<string, { value: number; rating: MetricRating } | null> = {};

    for (const name of this.config.metrics) {
      const latest = this.getLatestValue(name);
      summary[name] = latest ? { value: latest.value, rating: latest.rating } : null;
    }

    return summary;
  }

  /**
   * Calculate overall performance score
   */
  calculateScore(): number {
    const weights: Record<MetricName, number> = {
      LCP: 0.25,
      INP: 0.30,
      CLS: 0.25,
      FCP: 0.10,
      TTFB: 0.10,
      FID: 0,
      FMP: 0,
      TTI: 0,
      TBT: 0,
      custom: 0,
    };

    let totalWeight = 0;
    let weightedScore = 0;

    for (const name of this.config.metrics) {
      const latest = this.getLatestValue(name);
      if (latest && weights[name] > 0) {
        const score = this.ratingToScore(latest.rating);
        weightedScore += score * weights[name];
        totalWeight += weights[name];
      }
    }

    return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private setupMetricCollection(): void {
    if (typeof PerformanceObserver === 'undefined') {
      this.log('PerformanceObserver not supported');
      return;
    }

    // LCP
    if (this.config.metrics.includes('LCP')) {
      this.observeLCP();
    }

    // FID
    if (this.config.metrics.includes('FID')) {
      this.observeFID();
    }

    // CLS
    if (this.config.metrics.includes('CLS')) {
      this.observeCLS();
    }

    // INP
    if (this.config.metrics.includes('INP')) {
      this.observeINP();
    }

    // FCP
    if (this.config.metrics.includes('FCP')) {
      this.observeFCP();
    }

    // TTFB
    if (this.config.metrics.includes('TTFB')) {
      this.observeTTFB();
    }
  }

  private observeLCP(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & {
          element?: Element;
          url?: string;
          renderTime?: number;
          loadTime?: number;
        };

        if (lastEntry != null) {
          const value = lastEntry.startTime;
          const attribution = this.config.attribution
            ? {
                element: this.getElementSelector(lastEntry.element),
                url: lastEntry.url,
                elementRenderDelay: lastEntry.renderTime,
                resourceLoadDelay: lastEntry.loadTime,
              }
            : null;

          this.recordMetric({
            name: 'LCP',
            value,
            rating: this.calculateRating(value, this.thresholds.LCP ?? DEFAULT_THRESHOLDS.LCP),
            delta: value,
            id: this.generateId(),
            navigationType: this.getNavigationType(),
            timestamp: Date.now(),
            attribution,
            entries: [lastEntry],
          });
        }
      });

      observer.observe({ type: 'largest-contentful-paint', buffered: true });
      this.observers.push(observer);
    } catch (e) {
      this.log('Failed to observe LCP', e);
    }
  }

  private observeFID(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries() as Array<PerformanceEventTiming & {
          target?: Element;
        }>;

        for (const entry of entries) {
          const value = entry.processingStart - entry.startTime;
          const attribution = this.config.attribution
            ? {
                eventTarget: this.getElementSelector(entry.target),
                eventType: entry.name,
                eventTime: entry.startTime,
              }
            : null;

          this.recordMetric({
            name: 'FID',
            value,
            rating: this.calculateRating(value, this.thresholds.FID ?? DEFAULT_THRESHOLDS.FID),
            delta: value,
            id: this.generateId(),
            navigationType: this.getNavigationType(),
            timestamp: Date.now(),
            attribution,
            entries: [entry],
          });
        }
      });

      observer.observe({ type: 'first-input', buffered: true });
      this.observers.push(observer);
    } catch (e) {
      this.log('Failed to observe FID', e);
    }
  }

  private observeCLS(): void {
    try {
      let clsValue = 0;
      let clsEntries: PerformanceEntry[] = [];
      let sessionValue = 0;
      let sessionEntries: PerformanceEntry[] = [];
      let previousEndTime = 0;

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as Array<PerformanceEntry & {
          hadRecentInput?: boolean;
          value?: number;
          sources?: Array<{ node?: Element }>;
        }>) {
          // Ignore entries with recent input
          if (entry.hadRecentInput) continue;

          const firstEntryTime = sessionEntries[0]?.startTime ?? 0;
          const timeSinceFirstEntry = entry.startTime - firstEntryTime;
          const timeSinceLastEntry = entry.startTime - previousEndTime;

          // Start new session if gap > 1s or total duration > 5s
          if (timeSinceLastEntry > 1000 || timeSinceFirstEntry > 5000) {
            if (sessionValue > clsValue) {
              clsValue = sessionValue;
              clsEntries = sessionEntries;
            }
            sessionValue = 0;
            sessionEntries = [];
          }

          sessionValue += entry.value ?? 0;
          sessionEntries.push(entry);
          previousEndTime = entry.startTime + (entry.duration || 0);

          // Update if new session is larger
          if (sessionValue > clsValue) {
            clsValue = sessionValue;
            clsEntries = sessionEntries;

            const largestShift = clsEntries.reduce((a, b) => {
              const aValue = (a as { value?: number }).value ?? 0;
              const bValue = (b as { value?: number }).value ?? 0;
              return aValue > bValue ? a : b;
            }) as PerformanceEntry & { sources?: Array<{ node?: Element }> };

            const attribution = this.config.attribution
              ? {
                  largestShiftTarget: this.getElementSelector(
                    largestShift.sources?.[0]?.node
                  ),
                  largestShiftTime: largestShift.startTime,
                }
              : null;

            this.recordMetric({
              name: 'CLS',
              value: clsValue,
              rating: this.thresholds.CLS ? this.calculateRating(clsValue, this.thresholds.CLS) : 'good',
              delta: entry.value ?? 0,
              id: this.generateId(),
              navigationType: this.getNavigationType(),
              timestamp: Date.now(),
              attribution,
              entries: clsEntries,
            });
          }
        }
      });

      observer.observe({ type: 'layout-shift', buffered: true });
      this.observers.push(observer);
    } catch (e) {
      this.log('Failed to observe CLS', e);
    }
  }

  private observeINP(): void {
    try {
      const interactionEntries: PerformanceEventTiming[] = [];
      let maxINP = 0;

      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries() as PerformanceEventTiming[];

        for (const entry of entries) {
          // Filter for meaningful interactions
          if (
            entry.interactionId &&
            entry.entryType === 'event' &&
            ['pointerdown', 'pointerup', 'keydown', 'keyup', 'click'].includes(entry.name)
          ) {
            interactionEntries.push(entry);

            // Calculate INP (98th percentile of interactions)
            const sortedDurations = interactionEntries
              .map((e) => e.duration)
              .sort((a, b) => b - a);

            const idx = Math.ceil(sortedDurations.length * 0.02) - 1;
            const inp = sortedDurations[Math.max(0, idx)] ?? 0;

            if (inp > maxINP) {
              maxINP = inp;

              const longestEntry = interactionEntries.reduce((a, b) =>
                a.duration > b.duration ? a : b
              ) as PerformanceEventTiming & { target?: Element };

              const attribution = this.config.attribution
                ? {
                    eventTarget: this.getElementSelector(longestEntry.target),
                    eventType: longestEntry.name,
                    eventTime: longestEntry.startTime,
                    nextPaintTime: longestEntry.processingEnd,
                  }
                : null;

              this.recordMetric({
                name: 'INP',
                value: inp,
                rating: this.calculateRating(inp, this.thresholds.INP ?? DEFAULT_THRESHOLDS.INP),
                delta: inp - maxINP,
                id: this.generateId(),
                navigationType: this.getNavigationType(),
                timestamp: Date.now(),
                attribution,
                entries: [longestEntry],
              });
            }
          }
        }
      });

      observer.observe({
        type: 'event',
        buffered: true,
        durationThreshold: 16,
      });
      this.observers.push(observer);
    } catch (e) {
      this.log('Failed to observe INP', e);
    }
  }

  private observeFCP(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcpEntry = entries.find((e) => e.name === 'first-contentful-paint');

        if (fcpEntry) {
          const value = fcpEntry.startTime;

          this.recordMetric({
            name: 'FCP',
            value,
            rating: this.calculateRating(value, this.thresholds.FCP ?? DEFAULT_THRESHOLDS.FCP),
            delta: value,
            id: this.generateId(),
            navigationType: this.getNavigationType(),
            timestamp: Date.now(),
            attribution: null,
            entries: [fcpEntry],
          });
        }
      });

      observer.observe({ type: 'paint', buffered: true });
      this.observers.push(observer);
    } catch (e) {
      this.log('Failed to observe FCP', e);
    }
  }

  private observeTTFB(): void {
    try {
      const navEntries = performance.getEntriesByType('navigation');
      const navEntry = navEntries[0];

      if (navEntry) {
        const value = navEntry.responseStart - navEntry.requestStart;

        const attribution = this.config.attribution
          ? {
              timeToFirstByte: value,
              url: navEntry.name,
            }
          : null;

        this.recordMetric({
          name: 'TTFB',
          value,
          rating: this.calculateRating(value, this.thresholds.TTFB ?? DEFAULT_THRESHOLDS.TTFB),
          delta: value,
          id: this.generateId(),
          navigationType: this.getNavigationType(),
          timestamp: Date.now(),
          attribution,
          entries: [navEntry],
        });
      }
    } catch (e) {
      this.log('Failed to observe TTFB', e);
    }
  }

  private recordMetric(metric: CollectedMetric): void {
    const existing = this.metrics.get(metric.name) ?? [];
    existing.push(metric);
    this.metrics.set(metric.name, existing);

    this.log(`Recorded ${metric.name}: ${metric.value} (${metric.rating})`);

    // Notify callbacks
    this.callbacks.forEach((cb) => cb(metric));

    // Buffer for batch reporting
    if (this.config.batchReports) {
      this.reportBuffer.push(metric);
    }
  }

  private calculateRating(value: number, thresholds: MetricThresholds): MetricRating {
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.poor) return 'needs-improvement';
    return 'poor';
  }

  private ratingToScore(rating: MetricRating): number {
    switch (rating) {
      case 'good':
        return 100;
      case 'needs-improvement':
        return 50;
      case 'poor':
        return 0;
    }
  }

  private getElementSelector(element?: Element | null): string | undefined {
    if (!element) return undefined;

    const tag = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : '';
    const classes = element.classList.length > 0
      ? `.${Array.from(element.classList).join('.')}`
      : '';

    return `${tag}${id}${classes}`;
  }

  private getNavigationType(): string {
    const navEntries = performance.getEntriesByType('navigation');
    return navEntries[0]?.type ?? 'unknown';
  }

  private setupLifecycleHandlers(): void {
    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'hidden') {
        this.flush();
      }
    };

    const handlePagehide = (): void => {
      this.flush();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePagehide);
  }

  private startBatchFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.batchInterval);
  }

  /**
   * Send collected metrics to the reporting endpoint.
   *
   * Note: This method intentionally uses raw fetch/sendBeacon because:
   * 1. Web Vitals reporting should be independent of the main API client
   * 2. Uses keepalive/sendBeacon for reliability when page is unloading
   * 3. Reporting endpoints are often third-party analytics services
   *
   * @see {@link @/lib/api/api-client} for application API calls
   */
  private async sendToEndpoint(metrics: CollectedMetric[]): Promise<void> {
    if (!this.config.reportEndpoint) return;

    try {
      const payload = {
        metrics,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
      };

      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          this.config.reportEndpoint,
          JSON.stringify(payload)
        );
      } else {
        // Raw fetch is intentional - uses keepalive for page unload reliability
        await fetch(this.config.reportEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        });
      }

      this.log(`Sent ${metrics.length} metrics to endpoint`);
    } catch (e) {
      this.log('Failed to send metrics', e);
    }
  }

  private cleanup(): void {
    this.isInitialized = false;

    // Disconnect observers
    this.observers.forEach((o) => o.disconnect());
    this.observers = [];

    // Clear timer
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Final flush
    this.flush();
  }

  private generateId(): string {
    return `v-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      console.info(`[VitalsCollector] ${message}`, ...args);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let collectorInstance: EnhancedVitalsCollector | null = null;

/**
 * Get or create the global vitals collector
 */
export function getEnhancedVitalsCollector(
  config?: Partial<VitalsCollectionConfig>
): EnhancedVitalsCollector {
  if (!collectorInstance) {
    collectorInstance = new EnhancedVitalsCollector(config);
  }
  return collectorInstance;
}

/**
 * Reset the collector instance
 */
export function resetEnhancedVitalsCollector(): void {
  collectorInstance = null;
}
