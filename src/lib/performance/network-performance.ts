/**
 * @file Network Performance Module
 * @description Comprehensive network performance analysis and optimization with:
 * - Request timing analysis (DNS, TCP, TLS, TTFB, download)
 * - Bandwidth detection and estimation
 * - Request prioritization hints
 * - Connection quality metrics
 * - Adaptive loading strategies
 *
 * This module provides deep insights into network performance and enables
 * intelligent adaptation based on network conditions.
 *
 * @example
 * ```typescript
 * import { NetworkPerformanceAnalyzer, getNetworkQuality } from '@/lib/performance';
 *
 * const analyzer = NetworkPerformanceAnalyzer.getInstance();
 *
 * // Get current network quality
 * const quality = analyzer.getQuality();
 * if (quality.effectiveType === 'slow-2g') {
 *   // Load low-quality images
 * }
 *
 * // Analyze a specific request
 * const timing = analyzer.analyzeRequest('https://api.example.com/data');
 * console.info(`TTFB: ${timing.ttfb}ms, Download: ${timing.downloadTime}ms`);
 * ```
 */

import { formatBytes, formatDuration, getNetworkTier, type NetworkTierConfig, } from '../../config/performance.config';

// ============================================================================
// Types
// ============================================================================

/**
 * Network connection type
 */
export type ConnectionType =
  | 'bluetooth'
  | 'cellular'
  | 'ethernet'
  | 'wifi'
  | 'wimax'
  | 'other'
  | 'none'
  | 'unknown';

/**
 * Effective connection type (Network Information API)
 */
export type EffectiveConnectionType = 'slow-2g' | '2g' | '3g' | '4g';

/**
 * Request timing breakdown
 */
export interface RequestTiming {
  readonly name: string;
  readonly url: string;
  readonly startTime: number;
  readonly duration: number;
  /** DNS lookup time */
  readonly dnsLookup: number;
  /** TCP connection time */
  readonly tcpConnect: number;
  /** TLS negotiation time (HTTPS only) */
  readonly tlsNegotiation: number;
  /** Time to first byte */
  readonly ttfb: number;
  /** Content download time */
  readonly downloadTime: number;
  /** Transfer size in bytes */
  readonly transferSize: number;
  /** Encoded body size */
  readonly encodedBodySize: number;
  /** Decoded body size */
  readonly decodedBodySize: number;
  /** Resource type */
  readonly initiatorType: string;
  /** Effective bandwidth during this request (bytes/sec) */
  readonly effectiveBandwidth: number;
  /** Server timing entries */
  readonly serverTiming: ServerTimingEntry[];
  /** Timestamp */
  readonly timestamp: number;
}

/**
 * Server timing entry
 */
export interface ServerTimingEntry {
  readonly name: string;
  readonly duration: number;
  readonly description: string;
}

/**
 * Network quality metrics
 */
export interface NetworkQuality {
  /** Effective connection type */
  readonly effectiveType: EffectiveConnectionType;
  /** Estimated downlink speed in Mbps */
  readonly downlink: number;
  /** Estimated round-trip time in ms */
  readonly rtt: number;
  /** Data saver enabled */
  readonly saveData: boolean;
  /** Connection type */
  readonly type: ConnectionType;
  /** Network tier configuration */
  readonly tier: NetworkTierConfig;
  /** Overall quality score (0-100) */
  readonly score: number;
  /** Is connection metered */
  readonly isMetered: boolean;
  /** Timestamp */
  readonly timestamp: number;
}

/**
 * Bandwidth measurement
 */
export interface BandwidthMeasurement {
  readonly timestamp: number;
  /** Estimated bandwidth in bytes/sec */
  readonly bandwidth: number;
  /** Number of samples used */
  readonly sampleCount: number;
  /** Confidence level (0-1) */
  readonly confidence: number;
  /** Trend direction */
  readonly trend: 'improving' | 'stable' | 'degrading';
}

/**
 * Request priority hint
 */
export type RequestPriority = 'highest' | 'high' | 'normal' | 'low' | 'lowest';

/**
 * Priority recommendation
 */
export interface PriorityRecommendation {
  readonly url: string;
  readonly resourceType: string;
  readonly recommendedPriority: RequestPriority;
  readonly reason: string;
  readonly fetchPriority?: 'high' | 'low' | 'auto';
  readonly shouldPreload: boolean;
  readonly shouldPreconnect: boolean;
  readonly shouldDefer: boolean;
}

/**
 * Network statistics
 */
export interface NetworkStats {
  readonly totalRequests: number;
  readonly totalTransferSize: number;
  readonly averageTtfb: number;
  readonly averageDownloadTime: number;
  readonly averageBandwidth: number;
  readonly p50Ttfb: number;
  readonly p95Ttfb: number;
  readonly slowRequests: number;
  readonly failedRequests: number;
  readonly requestsByType: Record<string, number>;
  readonly sizeByType: Record<string, number>;
}

/**
 * Analyzer configuration
 */
export interface NetworkAnalyzerConfig {
  /** Slow request threshold (ms) */
  readonly slowThreshold?: number;
  /** Maximum request history */
  readonly maxHistorySize?: number;
  /** Enable auto-monitoring */
  readonly autoMonitor?: boolean;
  /** Bandwidth measurement interval (ms) */
  readonly bandwidthInterval?: number;
  /** Callback on slow request */
  readonly onSlowRequest?: (timing: RequestTiming) => void;
  /** Callback on network quality change */
  readonly onQualityChange?: (quality: NetworkQuality) => void;
  /** Enable debug logging */
  readonly debug?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: Required<NetworkAnalyzerConfig> = {
  slowThreshold: 1000,
  maxHistorySize: 500,
  autoMonitor: true,
  bandwidthInterval: 10000,
  onSlowRequest: () => {},
  onQualityChange: () => {},
  debug: false,
};

/**
 * Resource type priorities
 */
const RESOURCE_PRIORITIES: Record<string, RequestPriority> = {
  document: 'highest',
  script: 'high',
  css: 'high',
  font: 'high',
  img: 'normal',
  fetch: 'normal',
  xmlhttprequest: 'normal',
  media: 'low',
  video: 'low',
  audio: 'low',
  beacon: 'lowest',
  other: 'low',
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get navigator connection object
 */
function getNavigatorConnection(): {
  effectiveType?: EffectiveConnectionType;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  type?: ConnectionType;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
} | null {
  const nav = navigator as Navigator & {
    connection?: {
      effectiveType?: EffectiveConnectionType;
      downlink?: number;
      rtt?: number;
      saveData?: boolean;
      type?: ConnectionType;
      addEventListener?: (type: string, listener: () => void) => void;
      removeEventListener?: (type: string, listener: () => void) => void;
    };
    mozConnection?: typeof nav.connection;
    webkitConnection?: typeof nav.connection;
  };

  return nav.connection ?? nav.mozConnection ?? nav.webkitConnection ?? null;
}

/**
 * Calculate percentile from sorted array
 */
function percentile(sortedArr: number[], p: number): number {
  if (sortedArr.length === 0) return 0;
  const index = Math.ceil((p / 100) * sortedArr.length) - 1;
  return sortedArr[Math.max(0, Math.min(index, sortedArr.length - 1))] ?? 0;
}

/**
 * Generate unique ID
 */


// ============================================================================
// Network Performance Analyzer
// ============================================================================

/**
 * Comprehensive network performance analyzer
 */
export class NetworkPerformanceAnalyzer {
  private static instance: NetworkPerformanceAnalyzer | null = null;

  private readonly config: Required<NetworkAnalyzerConfig>;
  private readonly requestHistory: RequestTiming[] = [];
  private readonly bandwidthHistory: BandwidthMeasurement[] = [];

  private resourceObserver: PerformanceObserver | null = null;
  private bandwidthIntervalId: ReturnType<typeof setInterval> | null = null;
  private lastQuality: NetworkQuality | null = null;
  private connectionChangeHandler: (() => void) | null = null;

  /**
   * Private constructor for singleton pattern
   */
  private constructor(config: NetworkAnalyzerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (this.config.autoMonitor) {
      this.startMonitoring();
    }
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: NetworkAnalyzerConfig): NetworkPerformanceAnalyzer {
    NetworkPerformanceAnalyzer.instance ??= new NetworkPerformanceAnalyzer(config);
    return NetworkPerformanceAnalyzer.instance;
  }

  /**
   * Reset singleton instance (for testing)
   */
  public static resetInstance(): void {
    if (NetworkPerformanceAnalyzer.instance !== null) {
      NetworkPerformanceAnalyzer.instance.stopMonitoring();
      NetworkPerformanceAnalyzer.instance = null;
    }
  }

  // ==========================================================================
  // Monitoring Control
  // ==========================================================================

  /**
   * Start monitoring network performance
   */
  public startMonitoring(): void {
    this.startResourceObserver();
    this.startBandwidthMeasurement();
    this.startConnectionListener();
    this.log('Network monitoring started');
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    this.stopResourceObserver();
    this.stopBandwidthMeasurement();
    this.stopConnectionListener();
    this.log('Network monitoring stopped');
  }

  /**
   * Analyze a specific request by URL
   */
  public analyzeRequest(url: string): RequestTiming | null {
    const entries = performance.getEntriesByName(url, 'resource') as PerformanceResourceTiming[];
    if (entries.length === 0) return null;

    // Get the most recent entry
    const entry = entries[entries.length - 1];
    if (entry === undefined) return null;
    return this.processResourceEntry(entry);
  }

  /**
   * Analyze all requests matching a pattern
   */
  public analyzeRequestsMatching(pattern: RegExp): RequestTiming[] {
    const entries = performance.getEntriesByType('resource');
    return entries
      .filter((e) => pattern.test(e.name))
      .map((e) => this.processResourceEntry(e))
      .filter((t): t is RequestTiming => t !== null);
  }

  /**
   * Get current network quality
   */
  public getQuality(): NetworkQuality {
    const connection = getNavigatorConnection();

    const effectiveType: EffectiveConnectionType = connection?.effectiveType ?? '4g';
    const downlink = connection?.downlink ?? 10;
    const rtt = connection?.rtt ?? 50;
    const saveData = connection?.saveData ?? false;
    const type: ConnectionType = connection?.type ?? 'unknown';

    // Get tier configuration
    const tier = getNetworkTier(rtt, downlink);

    // Calculate quality score (0-100)
    const rttScore = Math.max(0, 100 - (rtt / 10));
    const downlinkScore = Math.min(100, downlink * 10);
    const score = Math.round((rttScore + downlinkScore) / 2);

    // Determine if metered
    const isMetered = type === 'cellular' || saveData;

    return {
      effectiveType,
      downlink,
      rtt,
      saveData,
      type,
      tier,
      score,
      isMetered,
      timestamp: Date.now(),
    };
  }

  /**
   * Get quality-based loading strategy
   */
  public getLoadingStrategy(): {
    imageQuality: 'high' | 'medium' | 'low' | 'placeholder';
    prefetchStrategy: 'aggressive' | 'moderate' | 'conservative' | 'none';
    shouldReduceMotion: boolean;
    shouldDeferNonCritical: boolean;
    maxConcurrentRequests: number;
  } {
    const quality = this.getQuality();

    return {
      imageQuality: quality.tier.imageQuality,
      prefetchStrategy: quality.tier.prefetchStrategy,
      shouldReduceMotion: quality.score < 50 || quality.saveData,
      shouldDeferNonCritical: quality.score < 30,
      maxConcurrentRequests: (() => {
        if (quality.score >= 70) return 6;
        if (quality.score >= 40) return 4;
        return 2;
      })(),
    };
  }

  /**
   * Measure current bandwidth from recent requests
   */
  public measureBandwidth(): BandwidthMeasurement | null {
    const recentRequests = this.requestHistory
      .filter((r) => Date.now() - r.timestamp < 60000) // Last minute
      .filter((r) => r.transferSize > 0 && r.downloadTime > 0);

    if (recentRequests.length === 0) return null;

    // Calculate weighted bandwidth (larger transfers are more accurate)
    let totalWeight = 0;
    let weightedBandwidth = 0;

    recentRequests.forEach((r) => {
      const weight = Math.log(r.transferSize + 1);
      weightedBandwidth += r.effectiveBandwidth * weight;
      totalWeight += weight;
    });

    const bandwidth = totalWeight > 0 ? weightedBandwidth / totalWeight : 0;

    // Calculate trend
    const trend = this.calculateBandwidthTrend();

    // Calculate confidence based on sample count and variability
    const confidence = Math.min(1, recentRequests.length / 10);

    return {
      timestamp: Date.now(),
      bandwidth,
      sampleCount: recentRequests.length,
      confidence,
      trend,
    };
  }

  /**
   * Get estimated bandwidth
   */
  public getEstimatedBandwidth(): number {
    const measurement = this.measureBandwidth();
    if (measurement !== null && measurement.confidence > 0.5) {
      return measurement.bandwidth;
    }

    // Fall back to Network Information API
    const connection = getNavigatorConnection();
    return ((connection?.downlink ?? 10) * 1024 * 1024) / 8; // Convert Mbps to bytes/sec
  }

  /**
   * Get priority recommendation for a resource
   */
  public getPriorityRecommendation(
    url: string,
    resourceType: string,
    options: {
      isAboveFold?: boolean;
      isLCP?: boolean;
      isInteractive?: boolean;
    } = {}
  ): PriorityRecommendation {
    const quality = this.getQuality();


    let recommendedPriority: RequestPriority = RESOURCE_PRIORITIES[resourceType] ?? 'normal';
    let fetchPriority: 'high' | 'low' | 'auto' = 'auto';
    let shouldPreload = false;
    let shouldPreconnect = false;
    let shouldDefer = false;
    let reason = 'Standard priority for resource type';

    // Boost priority for critical resources
    if (options.isLCP === true) {
      recommendedPriority = 'highest';
      fetchPriority = 'high';
      shouldPreload = true;
      reason = 'LCP candidate - highest priority';
    } else if (options.isAboveFold === true && resourceType === 'img') {
      recommendedPriority = 'high';
      fetchPriority = 'high';
      shouldPreload = true;
      reason = 'Above-fold image - preload recommended';
    } else if (options.isInteractive === true) {
      recommendedPriority = 'high';
      reason = 'Interactive element - high priority';
    }

    // Reduce priority on slow connections
    if (quality.score < 30) {
      if (options.isLCP !== true && options.isAboveFold !== true) {
        recommendedPriority = 'low';
        fetchPriority = 'low';
        shouldDefer = true;
        reason = 'Slow connection - defer non-critical resources';
      }
    }

    // Check if preconnect would help
    try {
      const urlObj = new URL(url);
      const {origin} = urlObj;
      const isCrossOrigin = origin !== window.location.origin;
      if (isCrossOrigin && (recommendedPriority === 'highest' || recommendedPriority === 'high')) {
        shouldPreconnect = true;
      }
    } catch {
      // Invalid URL, skip preconnect recommendation
    }

    return {
      url,
      resourceType,
      recommendedPriority,
      reason,
      fetchPriority,
      shouldPreload,
      shouldPreconnect,
      shouldDefer,
    };
  }

  // ==========================================================================
  // Request Analysis
  // ==========================================================================

  /**
   * Get network statistics
   */
  public getStats(): NetworkStats {
    const requests = this.requestHistory;

    if (requests.length === 0) {
      return {
        totalRequests: 0,
        totalTransferSize: 0,
        averageTtfb: 0,
        averageDownloadTime: 0,
        averageBandwidth: 0,
        p50Ttfb: 0,
        p95Ttfb: 0,
        slowRequests: 0,
        failedRequests: 0,
        requestsByType: {},
        sizeByType: {},
      };
    }

    const ttfbs = requests.map((r) => r.ttfb).sort((a, b) => a - b);
    const totalSize = requests.reduce((s, r) => s + r.transferSize, 0);
    const totalTtfb = ttfbs.reduce((s, t) => s + t, 0);
    const totalDownload = requests.reduce((s, r) => s + r.downloadTime, 0);
    const totalBandwidth = requests.reduce((s, r) => s + r.effectiveBandwidth, 0);
    const slowCount = requests.filter((r) => r.ttfb > this.config.slowThreshold).length;

    const requestsByType: Record<string, number> = {};
    const sizeByType: Record<string, number> = {};

    requests.forEach((r) => {
      const type = r.initiatorType ?? 'other';
      requestsByType[type] = (requestsByType[type] ?? 0) + 1;
      sizeByType[type] = (sizeByType[type] ?? 0) + r.transferSize;
    });

    return {
      totalRequests: requests.length,
      totalTransferSize: totalSize,
      averageTtfb: totalTtfb / requests.length,
      averageDownloadTime: totalDownload / requests.length,
      averageBandwidth: totalBandwidth / requests.length,
      p50Ttfb: percentile(ttfbs, 50),
      p95Ttfb: percentile(ttfbs, 95),
      slowRequests: slowCount,
      failedRequests: 0, // Resource timing doesn't capture failures
      requestsByType,
      sizeByType,
    };
  }

  /**
   * Get request history
   */
  public getHistory(): RequestTiming[] {
    return [...this.requestHistory];
  }

  /**
   * Get slow requests
   */
  public getSlowRequests(): RequestTiming[] {
    return this.requestHistory.filter((r) => r.ttfb > this.config.slowThreshold);
  }

  // ==========================================================================
  // Network Quality
  // ==========================================================================

  /**
   * Clear history
   */
  public clearHistory(): void {
    this.requestHistory.length = 0;
    this.bandwidthHistory.length = 0;
    this.log('History cleared');
  }

  /**
   * Generate network performance report
   */
  public generateReport(): string {
    const stats = this.getStats();
    const quality = this.getQuality();
    const bandwidth = this.measureBandwidth();
    const slowRequests = this.getSlowRequests();

    const lines = [
      '='.repeat(60),
      'NETWORK PERFORMANCE REPORT',
      '='.repeat(60),
      '',
      `Generated: ${new Date().toISOString()}`,
      '',
      '--- Network Quality ---',
      `Effective Type: ${quality.effectiveType}`,
      `RTT: ${quality.rtt}ms`,
      `Downlink: ${quality.downlink} Mbps`,
      `Quality Score: ${quality.score}/100`,
      `Data Saver: ${quality.saveData ? 'Enabled' : 'Disabled'}`,
      '',
      '--- Bandwidth ---',
      `Estimated: ${bandwidth !== null ? `${formatBytes(bandwidth.bandwidth)  }/s` : 'N/A'}`,
      `Confidence: ${bandwidth !== null ? `${(bandwidth.confidence * 100).toFixed(0)  }%` : 'N/A'}`,
      `Trend: ${bandwidth?.trend ?? 'N/A'}`,
      '',
      '--- Request Statistics ---',
      `Total Requests: ${stats.totalRequests}`,
      `Total Transfer: ${formatBytes(stats.totalTransferSize)}`,
      `Average TTFB: ${formatDuration(stats.averageTtfb)}`,
      `P50 TTFB: ${formatDuration(stats.p50Ttfb)}`,
      `P95 TTFB: ${formatDuration(stats.p95Ttfb)}`,
      `Slow Requests: ${stats.slowRequests}`,
      '',
      '--- Requests by Type ---',
    ];

    Object.entries(stats.requestsByType)
      .sort(([, a], [, b]) => b - a)
      .forEach(([type, count]) => {
        const size = stats.sizeByType[type] ?? 0;
        lines.push(`  ${type}: ${count} requests, ${formatBytes(size)}`);
      });

    if (slowRequests.length > 0) {
      lines.push('');
      lines.push('--- Slow Requests (Top 5) ---');
      slowRequests.slice(0, 5).forEach((r) => {
        lines.push(`  - ${r.name}: TTFB ${formatDuration(r.ttfb)}`);
      });
    }

    lines.push('');
    lines.push('='.repeat(60));

    return lines.join('\n');
  }

  // ==========================================================================
  // Bandwidth Measurement
  // ==========================================================================

  /**
   * Start resource timing observer
   */
  private startResourceObserver(): void {
    if (typeof PerformanceObserver === 'undefined') return;

    try {
      this.resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries() as PerformanceResourceTiming[];
        entries.forEach((entry) => {
          const timing = this.processResourceEntry(entry);
          if (timing !== null) {
            this.requestHistory.push(timing);
            this.trimHistory();

            if (timing.ttfb > this.config.slowThreshold) {
              this.config.onSlowRequest(timing);
              this.log(`Slow request: ${timing.url} (TTFB: ${formatDuration(timing.ttfb)})`);
            }
          }
        });
      });

      this.resourceObserver.observe({ entryTypes: ['resource'] });
    } catch (error) {
      this.log('Failed to start resource observer:', error);
    }
  }

  /**
   * Stop resource observer
   */
  private stopResourceObserver(): void {
    if (this.resourceObserver !== null) {
      this.resourceObserver.disconnect();
      this.resourceObserver = null;
    }
  }

  /**
   * Start bandwidth measurement
   */
  private startBandwidthMeasurement(): void {
    this.bandwidthIntervalId = setInterval(() => {
      const measurement = this.measureBandwidth();
      if (measurement !== null) {
        this.bandwidthHistory.push(measurement);
        if (this.bandwidthHistory.length > 100) {
          this.bandwidthHistory.shift();
        }
      }
    }, this.config.bandwidthInterval);
  }

  // ==========================================================================
  // Priority Recommendations
  // ==========================================================================

  /**
   * Stop bandwidth measurement
   */
  private stopBandwidthMeasurement(): void {
    if (this.bandwidthIntervalId !== null) {
      clearInterval(this.bandwidthIntervalId);
      this.bandwidthIntervalId = null;
    }
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================

  /**
   * Start connection change listener
   */
  private startConnectionListener(): void {
    const connection = getNavigatorConnection();
    if (connection?.addEventListener === undefined || connection?.addEventListener === null) return;

    this.connectionChangeHandler = () => {
      const quality = this.getQuality();
      if (this.hasQualityChanged(quality)) {
        this.config.onQualityChange(quality);
        this.lastQuality = quality;
        this.log('Network quality changed:', quality.effectiveType);
      }
    };

    connection.addEventListener('change', this.connectionChangeHandler);
  }

  /**
   * Stop connection listener
   */
  private stopConnectionListener(): void {
    if (this.connectionChangeHandler === null) return;

    const connection = getNavigatorConnection();
    if (connection?.removeEventListener !== undefined && connection?.removeEventListener !== null) {
      connection.removeEventListener('change', this.connectionChangeHandler);
    }
    this.connectionChangeHandler = null;
  }

  /**
   * Check if network quality has changed significantly
   */
  private hasQualityChanged(newQuality: NetworkQuality): boolean {
    if (this.lastQuality === null) return true;
    return newQuality.effectiveType !== this.lastQuality.effectiveType ||
           Math.abs(newQuality.score - this.lastQuality.score) > 10;
  }

  /**
   * Process a resource timing entry
   */
  private processResourceEntry(entry: PerformanceResourceTiming): RequestTiming | null {
    // Skip entries with no timing data
    if (entry.duration === 0) return null;

    const dnsLookup = entry.domainLookupEnd - entry.domainLookupStart;
    const tcpConnect = entry.connectEnd - entry.connectStart;
    const tlsNegotiation = entry.secureConnectionStart > 0
      ? entry.connectEnd - entry.secureConnectionStart
      : 0;
    const ttfb = entry.responseStart - entry.requestStart;
    const downloadTime = entry.responseEnd - entry.responseStart;

    // Calculate effective bandwidth
    const effectiveBandwidth = downloadTime > 0
      ? (entry.transferSize / downloadTime) * 1000
      : 0;

    // Extract server timing
    const serverTiming: ServerTimingEntry[] = [];
    if ('serverTiming' in entry && Array.isArray(entry.serverTiming)) {
      entry.serverTiming.forEach((st: { name: string; duration: number; description: string }) => {
        serverTiming.push({
          name: st.name,
          duration: st.duration,
          description: st.description,
        });
      });
    }

    return {
      name: entry.name.split('/').pop() ?? entry.name,
      url: entry.name,
      startTime: entry.startTime,
      duration: entry.duration,
      dnsLookup: Math.max(0, dnsLookup),
      tcpConnect: Math.max(0, tcpConnect),
      tlsNegotiation: Math.max(0, tlsNegotiation),
      ttfb: Math.max(0, ttfb),
      downloadTime: Math.max(0, downloadTime),
      transferSize: entry.transferSize,
      encodedBodySize: entry.encodedBodySize,
      decodedBodySize: entry.decodedBodySize,
      initiatorType: entry.initiatorType,
      effectiveBandwidth,
      serverTiming,
      timestamp: Date.now(),
    };
  }

  // ==========================================================================
  // Reporting
  // ==========================================================================

  /**
   * Calculate bandwidth trend
   */
  private calculateBandwidthTrend(): 'improving' | 'stable' | 'degrading' {
    if (this.bandwidthHistory.length < 2) return 'stable';

    const recent = this.bandwidthHistory.slice(-5);
    const older = this.bandwidthHistory.slice(-10, -5);

    if (older.length === 0) return 'stable';

    const recentAvg = recent.reduce((s, m) => s + m.bandwidth, 0) / recent.length;
    const olderAvg = older.reduce((s, m) => s + m.bandwidth, 0) / older.length;

    const change = ((recentAvg - olderAvg) / olderAvg) * 100;

    if (change > 10) return 'improving';
    if (change < -10) return 'degrading';
    return 'stable';
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  /**
   * Trim history to max size
   */
  private trimHistory(): void {
    if (this.requestHistory.length > this.config.maxHistorySize) {
      this.requestHistory.splice(0, this.requestHistory.length - this.config.maxHistorySize);
    }
  }

  /**
   * Debug logging
   */
  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      console.info(`[NetworkAnalyzer] ${message}`, ...args);
    }
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get the singleton NetworkPerformanceAnalyzer instance
 */
export function getNetworkAnalyzer(
  config?: NetworkAnalyzerConfig
): NetworkPerformanceAnalyzer {
  return NetworkPerformanceAnalyzer.getInstance(config);
}

/**
 * Get current network quality (convenience function)
 */
export function getNetworkQuality(): NetworkQuality {
  return getNetworkAnalyzer().getQuality();
}

/**
 * Check if on slow connection
 */
export function isSlowConnection(): boolean {
  const quality = getNetworkQuality();
  return quality.score < 50 || quality.effectiveType === 'slow-2g' || quality.effectiveType === '2g';
}

/**
 * Check if data saver is enabled
 */
export function isDataSaverEnabled(): boolean {
  return getNetworkQuality().saveData;
}

/**
 * Get loading strategy based on network
 */
export function getAdaptiveLoadingStrategy(): ReturnType<NetworkPerformanceAnalyzer['getLoadingStrategy']> {
  return getNetworkAnalyzer().getLoadingStrategy();
}

// ============================================================================
// Exports
// ============================================================================
