/**
 * API Metrics
 *
 * Collects and reports API performance metrics including
 * latency, error rates, and throughput.
 *
 * @module api/advanced/api-metrics
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Single request metric.
 */
export interface RequestMetric {
  /** Request URL/endpoint */
  endpoint: string;
  /** HTTP method */
  method: string;
  /** Response status code */
  status: number;
  /** Request duration in milliseconds */
  duration: number;
  /** Request timestamp */
  timestamp: number;
  /** Whether request succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Request size in bytes */
  requestSize?: number;
  /** Response size in bytes */
  responseSize?: number;
  /** Correlation ID */
  correlationId?: string;
  /** Custom tags */
  tags?: Record<string, string>;
}

/**
 * Aggregated metrics for an endpoint.
 */
export interface EndpointMetrics {
  /** Endpoint path */
  endpoint: string;
  /** Total request count */
  totalRequests: number;
  /** Successful requests */
  successCount: number;
  /** Failed requests */
  errorCount: number;
  /** Success rate (0-1) */
  successRate: number;
  /** Average duration in ms */
  avgDuration: number;
  /** Minimum duration in ms */
  minDuration: number;
  /** Maximum duration in ms */
  maxDuration: number;
  /** P50 latency in ms */
  p50Latency: number;
  /** P90 latency in ms */
  p90Latency: number;
  /** P95 latency in ms */
  p95Latency: number;
  /** P99 latency in ms */
  p99Latency: number;
  /** Status code distribution */
  statusCodes: Record<number, number>;
  /** Error distribution */
  errors: Record<string, number>;
  /** Last request timestamp */
  lastRequestAt: number;
  /** Requests per second (recent) */
  requestsPerSecond: number;
}

/**
 * Overall API metrics.
 */
export interface OverallMetrics {
  /** Total requests across all endpoints */
  totalRequests: number;
  /** Total successful requests */
  totalSuccess: number;
  /** Total failed requests */
  totalErrors: number;
  /** Overall success rate */
  successRate: number;
  /** Overall average duration */
  avgDuration: number;
  /** Overall P95 latency */
  p95Latency: number;
  /** Total requests per second */
  requestsPerSecond: number;
  /** Unique endpoints count */
  endpointCount: number;
  /** Metrics collection start time */
  collectionStartedAt: number;
  /** Time window in milliseconds */
  windowMs: number;
}

/**
 * Metrics collector configuration.
 */
export interface MetricsConfig {
  /** Maximum number of metrics to store */
  maxMetrics?: number;
  /** Time window for aggregation (ms) */
  windowMs?: number;
  /** Flush interval for reporters (ms) */
  flushInterval?: number;
  /** Enable detailed per-request storage */
  enableDetailedMetrics?: boolean;
  /** Endpoints to exclude from collection */
  excludeEndpoints?: string[];
  /** Custom metric reporter */
  reporter?: MetricsReporter;
}

/**
 * Metrics reporter interface.
 */
export interface MetricsReporter {
  /** Report a single metric */
  report: (metric: RequestMetric) => void;
  /** Flush all metrics */
  flush: (metrics: RequestMetric[]) => void;
  /** Report aggregated metrics */
  reportAggregated?: (metrics: OverallMetrics) => void;
}

// =============================================================================
// API Metrics Collector Class
// =============================================================================

/**
 * API Metrics Collector for performance monitoring.
 *
 * @example
 * ```typescript
 * const metrics = new APIMetricsCollector({
 *   maxMetrics: 10000,
 *   windowMs: 60000,
 *   reporter: {
 *     report: (metric) => console.log(metric),
 *     flush: (metrics) => sendToAnalytics(metrics),
 *   },
 * });
 *
 * // Record a metric
 * metrics.record({
 *   endpoint: '/users',
 *   method: 'GET',
 *   status: 200,
 *   duration: 150,
 *   timestamp: Date.now(),
 *   success: true,
 * });
 *
 * // Get endpoint metrics
 * const userMetrics = metrics.getEndpointMetrics('/users');
 * console.log(`P95 latency: ${userMetrics.p95Latency}ms`);
 * ```
 */
export class APIMetricsCollector {
  private config: Required<MetricsConfig>;
  private metrics: RequestMetric[];
  private endpointCache: Map<string, number[]>;
  private collectionStartedAt: number;
  private flushTimer?: ReturnType<typeof setInterval>;

  /**
   * Create a new metrics collector.
   *
   * @param config - Collector configuration
   */
  constructor(config: MetricsConfig = {}) {
    this.config = {
      maxMetrics: 10000,
      windowMs: 300000, // 5 minutes
      flushInterval: 60000, // 1 minute
      enableDetailedMetrics: true,
      excludeEndpoints: [],
      reporter: { report: () => {}, flush: () => {} },
      ...config,
    };

    this.metrics = [];
    this.endpointCache = new Map();
    this.collectionStartedAt = Date.now();

    // Start flush timer
    if (this.config.flushInterval > 0) {
      this.flushTimer = setInterval(() => {
        this.flush();
      }, this.config.flushInterval);
    }
  }

  // ===========================================================================
  // Recording Methods
  // ===========================================================================

  /**
   * Record a request metric.
   *
   * @param metric - Metric to record
   */
  record(metric: RequestMetric): void {
    // Check exclusions
    if (this.shouldExclude(metric.endpoint)) {
      return;
    }

    // Store metric
    if (this.config.enableDetailedMetrics) {
      this.metrics.push(metric);

      // Enforce max size
      if (this.metrics.length > this.config.maxMetrics) {
        this.metrics = this.metrics.slice(-this.config.maxMetrics);
      }
    }

    // Update endpoint cache for quick aggregation
    const cacheKey = this.getEndpointKey(metric.endpoint, metric.method);
    const durations = this.endpointCache.get(cacheKey) ?? [];
    durations.push(metric.duration);

    // Keep only recent durations
    if (durations.length > 1000) {
      durations.splice(0, durations.length - 1000);
    }

    this.endpointCache.set(cacheKey, durations);

    // Report to reporter
    this.config.reporter.report(metric);
  }

  /**
   * Create a timing wrapper for requests.
   *
   * @param endpoint - Request endpoint
   * @param method - HTTP method
   * @param tags - Custom tags
   * @returns Timing functions
   */
  startTiming(
    endpoint: string,
    method: string,
    tags?: Record<string, string>
  ): {
    success: (status: number, responseSize?: number) => void;
    error: (error: Error, status?: number) => void;
  } {
    const startTime = Date.now();
    const correlationId = crypto.randomUUID();

    return {
      success: (status: number, responseSize?: number) => {
        this.record({
          endpoint,
          method,
          status,
          duration: Date.now() - startTime,
          timestamp: startTime,
          success: true,
          responseSize,
          correlationId,
          tags,
        });
      },
      error: (error: Error, status = 0) => {
        this.record({
          endpoint,
          method,
          status,
          duration: Date.now() - startTime,
          timestamp: startTime,
          success: false,
          error: error.message,
          correlationId,
          tags,
        });
      },
    };
  }

  // ===========================================================================
  // Aggregation Methods
  // ===========================================================================

  /**
   * Get metrics for a specific endpoint.
   *
   * @param endpoint - Endpoint path
   * @param method - Optional HTTP method filter
   * @returns Aggregated endpoint metrics
   */
  getEndpointMetrics(endpoint: string, method?: string): EndpointMetrics {
    const windowStart = Date.now() - this.config.windowMs;

    const relevantMetrics = this.metrics.filter(
      m =>
        m.endpoint === endpoint &&
        (method == null || method === '' || m.method === method) &&
        m.timestamp >= windowStart
    );

    return this.aggregateMetrics(endpoint, relevantMetrics);
  }

  /**
   * Get overall API metrics.
   */
  getOverallMetrics(): OverallMetrics {
    const windowStart = Date.now() - this.config.windowMs;
    const now = Date.now();

    const relevantMetrics = this.metrics.filter(m => m.timestamp >= windowStart);

    const durations = relevantMetrics.map(m => m.duration).sort((a, b) => a - b);
    const successCount = relevantMetrics.filter(m => m.success).length;
    const endpoints = new Set(relevantMetrics.map(m => m.endpoint));

    const windowSeconds = (now - windowStart) / 1000;

    return {
      totalRequests: relevantMetrics.length,
      totalSuccess: successCount,
      totalErrors: relevantMetrics.length - successCount,
      successRate:
        relevantMetrics.length > 0
          ? successCount / relevantMetrics.length
          : 1,
      avgDuration:
        durations.length > 0
          ? durations.reduce((a, b) => a + b, 0) / durations.length
          : 0,
      p95Latency: this.percentile(durations, 95),
      requestsPerSecond:
        windowSeconds > 0 ? relevantMetrics.length / windowSeconds : 0,
      endpointCount: endpoints.size,
      collectionStartedAt: this.collectionStartedAt,
      windowMs: this.config.windowMs,
    };
  }

  /**
   * Get metrics for all endpoints.
   */
  getAllEndpointMetrics(): EndpointMetrics[] {
    const endpoints = new Set(this.metrics.map(m => `${m.method}:${m.endpoint}`));
    const results: EndpointMetrics[] = [];

    for (const key of endpoints) {
      const [method, ...endpointParts] = key.split(':');
      const endpoint = endpointParts.join(':');
      results.push(this.getEndpointMetrics(endpoint, method));
    }

    return results.sort((a, b) => b.totalRequests - a.totalRequests);
  }

  /**
   * Get slow requests.
   *
   * @param threshold - Duration threshold in ms
   * @param limit - Maximum results
   */
  getSlowRequests(threshold: number, limit = 100): RequestMetric[] {
    return this.metrics
      .filter(m => m.duration >= threshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Get recent errors.
   *
   * @param limit - Maximum results
   */
  getRecentErrors(limit = 100): RequestMetric[] {
    return this.metrics
      .filter(m => !m.success)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get error distribution.
   */
  getErrorDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};

    for (const metric of this.metrics.filter(m => !m.success)) {
      const key = metric.error ?? `HTTP ${metric.status}`;
      distribution[key] = (distribution[key] ?? 0) + 1;
    }

    return distribution;
  }

  // ===========================================================================
  // Export & Reporting
  // ===========================================================================

  /**
   * Flush metrics to reporter.
   */
  flush(): void {
    if (this.metrics.length === 0) return;

    const metricsToFlush = [...this.metrics];
    this.config.reporter.flush(metricsToFlush);

    if (this.config.reporter.reportAggregated) {
      this.config.reporter.reportAggregated(this.getOverallMetrics());
    }
  }

  /**
   * Export metrics as JSON.
   */
  exportJSON(): string {
    return JSON.stringify({
      overall: this.getOverallMetrics(),
      endpoints: this.getAllEndpointMetrics(),
      metrics: this.config.enableDetailedMetrics ? this.metrics : [],
    });
  }

  /**
   * Export metrics as CSV.
   */
  exportCSV(): string {
    const headers = [
      'timestamp',
      'endpoint',
      'method',
      'status',
      'duration',
      'success',
      'error',
    ];

    const rows = this.metrics.map(m => [
      new Date(m.timestamp).toISOString(),
      m.endpoint,
      m.method,
      m.status,
      m.duration,
      m.success,
      m.error ?? '',
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  /**
   * Clear all metrics.
   */
  clear(): void {
    this.metrics = [];
    this.endpointCache.clear();
    this.collectionStartedAt = Date.now();
  }

  /**
   * Dispose of the collector.
   */
  dispose(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
    this.clear();
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Check if endpoint should be excluded.
   */
  private shouldExclude(endpoint: string): boolean {
    return this.config.excludeEndpoints.some(
      pattern => endpoint.includes(pattern) || new RegExp(pattern).test(endpoint)
    );
  }

  /**
   * Get cache key for endpoint.
   */
  private getEndpointKey(endpoint: string, method: string): string {
    return `${method}:${endpoint}`;
  }

  /**
   * Aggregate metrics for an endpoint.
   */
  private aggregateMetrics(
    endpoint: string,
    metrics: RequestMetric[]
  ): EndpointMetrics {
    if (metrics.length === 0) {
      return this.emptyEndpointMetrics(endpoint);
    }

    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const successCount = metrics.filter(m => m.success).length;
    const statusCodes: Record<number, number> = {};
    const errors: Record<string, number> = {};

    for (const m of metrics) {
      statusCodes[m.status] = (statusCodes[m.status] ?? 0) + 1;
      if (!m.success && m.error != null && m.error !== '') {
        errors[m.error] = (errors[m.error] ?? 0) + 1;
      }
    }

    const windowStart = Date.now() - this.config.windowMs;
    const recentMetrics = metrics.filter(m => m.timestamp >= windowStart);
    const windowSeconds = this.config.windowMs / 1000;

    const [minDuration] = durations;
    const maxDuration = durations[durations.length - 1];

    return {
      endpoint,
      totalRequests: metrics.length,
      successCount,
      errorCount: metrics.length - successCount,
      successRate: successCount / metrics.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: minDuration ?? 0,
      maxDuration: maxDuration ?? 0,
      p50Latency: this.percentile(durations, 50),
      p90Latency: this.percentile(durations, 90),
      p95Latency: this.percentile(durations, 95),
      p99Latency: this.percentile(durations, 99),
      statusCodes,
      errors,
      lastRequestAt: Math.max(...metrics.map(m => m.timestamp)),
      requestsPerSecond: recentMetrics.length / windowSeconds,
    };
  }

  /**
   * Create empty endpoint metrics.
   */
  private emptyEndpointMetrics(endpoint: string): EndpointMetrics {
    return {
      endpoint,
      totalRequests: 0,
      successCount: 0,
      errorCount: 0,
      successRate: 1,
      avgDuration: 0,
      minDuration: 0,
      maxDuration: 0,
      p50Latency: 0,
      p90Latency: 0,
      p95Latency: 0,
      p99Latency: 0,
      statusCodes: {},
      errors: {},
      lastRequestAt: 0,
      requestsPerSecond: 0,
    };
  }

  /**
   * Calculate percentile.
   */
  private percentile(sortedValues: number[], p: number): number {
    if (sortedValues.length === 0) return 0;

    const index = Math.ceil((p / 100) * sortedValues.length) - 1;
    const value = sortedValues[Math.max(0, index)];
    return value ?? 0;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new metrics collector.
 *
 * @param config - Collector configuration
 * @returns APIMetricsCollector instance
 */
export function createMetricsCollector(config?: MetricsConfig): APIMetricsCollector {
  return new APIMetricsCollector(config);
}

// =============================================================================
// Built-in Reporters
// =============================================================================

/**
 * Console reporter for debugging.
 */
export const consoleReporter: MetricsReporter = {
  report: (metric) => {
    const status = metric.success ? 'OK' : 'ERR';
    // eslint-disable-next-line no-console
    console.log(
      `[API] ${metric.method} ${metric.endpoint} ${status} ${metric.duration}ms`
    );
  },
  flush: (metrics) => {
    // eslint-disable-next-line no-console
    console.log(`[API Metrics] Flushing ${metrics.length} metrics`);
  },
  reportAggregated: (metrics) => {
    // eslint-disable-next-line no-console
    console.log('[API Metrics] Aggregated:', {
      requests: metrics.totalRequests,
      successRate: `${(metrics.successRate * 100).toFixed(1)}%`,
      avgDuration: `${metrics.avgDuration.toFixed(0)}ms`,
      p95: `${metrics.p95Latency.toFixed(0)}ms`,
      rps: metrics.requestsPerSecond.toFixed(2),
    });
  },
};

/**
 * Create a batched reporter that accumulates metrics.
 */
export function createBatchedReporter(
  onBatch: (metrics: RequestMetric[]) => void,
  options?: { batchSize?: number; maxWait?: number }
): MetricsReporter {
  const { batchSize = 100, maxWait = 10000 } = options ?? {};
  let batch: RequestMetric[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  const sendBatch = (): void => {
    if (batch.length > 0) {
      onBatch([...batch]);
      batch = [];
    }
    if (timer != null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return {
    report: (metric) => {
      batch.push(metric);

      if (batch.length >= batchSize) {
        sendBatch();
      } else {
        timer ??= setTimeout(sendBatch, maxWait);
      }
    },
    flush: () => {
      sendBatch();
    },
  };
}
