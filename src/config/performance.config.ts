/**
 * @file Performance Configuration
 * @description Centralized performance thresholds, budgets, and monitoring configuration.
 *
 * This configuration defines:
 * - Core Web Vitals targets and thresholds
 * - Performance budgets for bundles, assets, and runtime
 * - Long task detection thresholds
 * - Memory pressure levels
 * - Network quality tiers
 * - Render performance baselines
 *
 * All values are calibrated based on Google's Core Web Vitals recommendations
 * and industry best practices for high-performance web applications.
 *
 * @see https://web.dev/vitals/
 * @see https://developer.chrome.com/docs/lighthouse/performance/
 */

import { isProd, isStaging } from '@/lib/core/config/env-helper';

// ============================================================================
// Types
// ============================================================================

/**
 * Core Web Vitals metric configuration
 */
export interface VitalMetricThreshold {
  /** Good threshold (green zone) */
  readonly good: number;
  /** Needs improvement threshold (yellow zone) */
  readonly needsImprovement: number;
  /** Poor threshold (red zone) */
  readonly poor: number;
  /** Unit of measurement */
  readonly unit: 'ms' | 's' | 'score' | 'ratio';
  /** Human-readable description */
  readonly description: string;
}

/**
 * Bundle size budget configuration
 */
export interface BundleBudget {
  /** Maximum size for initial bundle (bytes) */
  readonly initial: number;
  /** Maximum size for any async chunk (bytes) */
  readonly asyncChunk: number;
  /** Maximum total vendor bundle size (bytes) */
  readonly vendor: number;
  /** Maximum total application size (bytes) */
  readonly total: number;
  /** Warning threshold as percentage of limit */
  readonly warningThreshold: number;
}

/**
 * Runtime performance budget
 */
export interface RuntimeBudget {
  /** Maximum JavaScript execution time per frame (ms) */
  readonly jsExecutionPerFrame: number;
  /** Maximum style recalculation time (ms) */
  readonly styleRecalc: number;
  /** Maximum layout time (ms) */
  readonly layout: number;
  /** Maximum paint time (ms) */
  readonly paint: number;
  /** Maximum composite time (ms) */
  readonly composite: number;
  /** Target frames per second */
  readonly targetFps: number;
  /** Frame budget in milliseconds (1000 / targetFps) */
  readonly frameBudget: number;
}

/**
 * Long task detection configuration
 */
export interface LongTaskConfig {
  /** Threshold for classifying a task as "long" (ms) */
  readonly threshold: number;
  /** Threshold for critical long tasks (ms) */
  readonly criticalThreshold: number;
  /** Maximum long tasks per page load before warning */
  readonly maxPerPageLoad: number;
  /** Sampling rate for long task attribution (0-1) */
  readonly attributionSampleRate: number;
  /** Buffer size for storing long task history */
  readonly historyBufferSize: number;
}

/**
 * Memory pressure configuration
 */
export interface MemoryConfig {
  /** Warning threshold as percentage of JS heap limit */
  readonly warningThreshold: number;
  /** Critical threshold as percentage of JS heap limit */
  readonly criticalThreshold: number;
  /** Polling interval for memory checks (ms) */
  readonly pollingInterval: number;
  /** GC trigger threshold (MB) */
  readonly gcTriggerSize: number;
  /** Enable automatic cleanup on pressure */
  readonly autoCleanup: boolean;
}

/**
 * Network quality tier configuration
 */
export interface NetworkTierConfig {
  /** Tier name */
  readonly name: string;
  /** Minimum RTT for this tier (ms) */
  readonly minRtt: number;
  /** Maximum RTT for this tier (ms) */
  readonly maxRtt: number;
  /** Minimum downlink for this tier (Mbps) */
  readonly minDownlink: number;
  /** Recommended prefetch strategy */
  readonly prefetchStrategy: 'aggressive' | 'moderate' | 'conservative' | 'none';
  /** Recommended image quality */
  readonly imageQuality: 'high' | 'medium' | 'low' | 'placeholder';
}

/**
 * Render performance configuration
 */
export interface RenderConfig {
  /** Maximum acceptable render time for a component (ms) */
  readonly maxComponentRenderTime: number;
  /** Threshold for flagging a component as slow (ms) */
  readonly slowComponentThreshold: number;
  /** Maximum acceptable re-render count per interaction */
  readonly maxRerendersPerInteraction: number;
  /** Wasted render detection threshold (ms) */
  readonly wastedRenderThreshold: number;
  /** Enable render profiling in production */
  readonly enableProdProfiling: boolean;
  /** Sample rate for render metrics collection (0-1) */
  readonly sampleRate: number;
}

/**
 * Complete performance configuration
 */
export interface PerformanceConfig {
  readonly vitals: Record<string, VitalMetricThreshold>;
  readonly bundle: BundleBudget;
  readonly runtime: RuntimeBudget;
  readonly longTask: LongTaskConfig;
  readonly memory: MemoryConfig;
  readonly networkTiers: NetworkTierConfig[];
  readonly render: RenderConfig;
  readonly monitoring: MonitoringConfig;
}

/**
 * Monitoring and reporting configuration
 */
export interface MonitoringConfig {
  /** Enable real-time monitoring */
  readonly enabled: boolean;
  /** Reporting endpoint */
  readonly endpoint: string;
  /** Batch size for metric reports */
  readonly batchSize: number;
  /** Flush interval (ms) */
  readonly flushInterval: number;
  /** Sample rate for production (0-1) */
  readonly productionSampleRate: number;
  /** Include attribution data */
  readonly includeAttribution: boolean;
  /** Enable debug mode */
  readonly debug: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Core Web Vitals thresholds (Google recommended)
 *
 * @see https://web.dev/vitals/
 */
export const VITAL_THRESHOLDS: Record<string, VitalMetricThreshold> = {
  LCP: {
    good: 2500,
    needsImprovement: 4000,
    poor: 4000,
    unit: 'ms',
    description: 'Largest Contentful Paint - Time to render the largest visible element',
  },
  INP: {
    good: 200,
    needsImprovement: 500,
    poor: 500,
    unit: 'ms',
    description: 'Interaction to Next Paint - Responsiveness to user interactions',
  },
  CLS: {
    good: 0.1,
    needsImprovement: 0.25,
    poor: 0.25,
    unit: 'score',
    description: 'Cumulative Layout Shift - Visual stability of the page',
  },
  FCP: {
    good: 1800,
    needsImprovement: 3000,
    poor: 3000,
    unit: 'ms',
    description: 'First Contentful Paint - Time to first content render',
  },
  TTFB: {
    good: 800,
    needsImprovement: 1800,
    poor: 1800,
    unit: 'ms',
    description: 'Time to First Byte - Server response time',
  },
  FID: {
    good: 100,
    needsImprovement: 300,
    poor: 300,
    unit: 'ms',
    description: 'First Input Delay - Time from first interaction to browser response',
  },
  TBT: {
    good: 200,
    needsImprovement: 600,
    poor: 600,
    unit: 'ms',
    description: 'Total Blocking Time - Sum of blocking portions of long tasks',
  },
  SI: {
    good: 3400,
    needsImprovement: 5800,
    poor: 5800,
    unit: 'ms',
    description: 'Speed Index - How quickly content is visually displayed',
  },
} as const;

/**
 * Bundle size budgets (in bytes)
 *
 * Based on performance budget best practices:
 * - Initial bundle should be < 200KB gzipped for fast FCP
 * - Async chunks should be < 100KB for quick route transitions
 */
export const BUNDLE_BUDGET: BundleBudget = {
  initial: 200 * 1024,        // 200 KB
  asyncChunk: 100 * 1024,     // 100 KB
  vendor: 150 * 1024,         // 150 KB
  total: 500 * 1024,          // 500 KB
  warningThreshold: 0.8,      // Warn at 80% of budget
} as const;

/**
 * Runtime performance budgets
 *
 * Based on RAIL performance model:
 * - Response: < 100ms for user input
 * - Animation: 60fps = 16.67ms per frame
 * - Idle: Maximize idle time for background work
 * - Load: < 1000ms for interactive
 */
export const RUNTIME_BUDGET: RuntimeBudget = {
  jsExecutionPerFrame: 10,    // Leave 6ms for browser work
  styleRecalc: 2,
  layout: 2,
  paint: 2,
  composite: 1,
  targetFps: 60,
  frameBudget: 16.67,
} as const;

/**
 * Long task detection configuration
 *
 * Long tasks > 50ms block the main thread and impact INP.
 * Critical tasks > 100ms cause noticeable jank.
 */
export const LONG_TASK_CONFIG: LongTaskConfig = {
  threshold: 50,
  criticalThreshold: 100,
  maxPerPageLoad: 10,
  attributionSampleRate: 0.1,
  historyBufferSize: 100,
} as const;

/**
 * Memory pressure configuration
 *
 * Chrome typically limits JS heap to ~4GB.
 * Warning at 70%, critical at 90% of available heap.
 */
export const MEMORY_CONFIG: MemoryConfig = {
  warningThreshold: 0.7,
  criticalThreshold: 0.9,
  pollingInterval: 5000,
  gcTriggerSize: 100,         // 100 MB
  autoCleanup: true,
} as const;

/**
 * Network quality tiers based on Network Information API
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API
 */
export const NETWORK_TIERS: NetworkTierConfig[] = [
  {
    name: '4g',
    minRtt: 0,
    maxRtt: 100,
    minDownlink: 10,
    prefetchStrategy: 'aggressive',
    imageQuality: 'high',
  },
  {
    name: '3g',
    minRtt: 100,
    maxRtt: 300,
    minDownlink: 1,
    prefetchStrategy: 'moderate',
    imageQuality: 'medium',
  },
  {
    name: 'slow-3g',
    minRtt: 300,
    maxRtt: 700,
    minDownlink: 0.4,
    prefetchStrategy: 'conservative',
    imageQuality: 'low',
  },
  {
    name: '2g',
    minRtt: 700,
    maxRtt: Infinity,
    minDownlink: 0,
    prefetchStrategy: 'none',
    imageQuality: 'placeholder',
  },
] as const;

/**
 * Render performance configuration
 *
 * Based on React DevTools Profiler recommendations:
 * - Components should render in < 16ms for 60fps
 * - Wasted renders indicate unnecessary re-renders
 */
export const RENDER_CONFIG: RenderConfig = {
  maxComponentRenderTime: 16,
  slowComponentThreshold: 8,
  maxRerendersPerInteraction: 5,
  wastedRenderThreshold: 2,
  enableProdProfiling: false,
  sampleRate: 0.1,
} as const;

/**
 * Monitoring and reporting configuration
 */
export const MONITORING_CONFIG: MonitoringConfig = {
  enabled: true,
  endpoint: '/api/analytics/performance',
  batchSize: 10,
  flushInterval: 30000,
  productionSampleRate: 0.1,
  includeAttribution: true,
  debug: false,
} as const;

// ============================================================================
// Environment-Specific Configurations
// ============================================================================

/**
 * Development configuration with relaxed thresholds
 */
export const DEV_PERFORMANCE_CONFIG: PerformanceConfig = {
  vitals: VITAL_THRESHOLDS,
  bundle: {
    ...BUNDLE_BUDGET,
    // Relax bundle limits in dev (source maps, HMR)
    initial: BUNDLE_BUDGET.initial * 3,
    total: BUNDLE_BUDGET.total * 3,
  },
  runtime: RUNTIME_BUDGET,
  longTask: {
    ...LONG_TASK_CONFIG,
    // More permissive in dev
    maxPerPageLoad: 50,
    attributionSampleRate: 1.0,
  },
  memory: {
    ...MEMORY_CONFIG,
    pollingInterval: 10000,
  },
  networkTiers: NETWORK_TIERS,
  render: {
    ...RENDER_CONFIG,
    enableProdProfiling: true,
    sampleRate: 1.0,
  },
  monitoring: {
    ...MONITORING_CONFIG,
    debug: true,
    productionSampleRate: 1.0,
  },
} as const;

/**
 * Production configuration with strict thresholds
 */
export const PROD_PERFORMANCE_CONFIG: PerformanceConfig = {
  vitals: VITAL_THRESHOLDS,
  bundle: BUNDLE_BUDGET,
  runtime: RUNTIME_BUDGET,
  longTask: LONG_TASK_CONFIG,
  memory: MEMORY_CONFIG,
  networkTiers: NETWORK_TIERS,
  render: RENDER_CONFIG,
  monitoring: MONITORING_CONFIG,
} as const;

/**
 * Staging configuration (production-like with more monitoring)
 */
export const STAGING_PERFORMANCE_CONFIG: PerformanceConfig = {
  vitals: VITAL_THRESHOLDS,
  bundle: BUNDLE_BUDGET,
  runtime: RUNTIME_BUDGET,
  longTask: {
    ...LONG_TASK_CONFIG,
    attributionSampleRate: 0.5,
  },
  memory: MEMORY_CONFIG,
  networkTiers: NETWORK_TIERS,
  render: {
    ...RENDER_CONFIG,
    sampleRate: 0.5,
  },
  monitoring: {
    ...MONITORING_CONFIG,
    productionSampleRate: 0.5,
    debug: false,
  },
} as const;

// ============================================================================
// Configuration Getters
// ============================================================================

/**
 * Get performance configuration based on environment
 */
export function getPerformanceConfig(): PerformanceConfig {
  if (isProd()) {
    return PROD_PERFORMANCE_CONFIG;
  }
  if (isStaging()) {
    return STAGING_PERFORMANCE_CONFIG;
  }
  return DEV_PERFORMANCE_CONFIG;
}

/**
 * Check if a value meets a vital threshold
 */
export function meetsVitalThreshold(
  metric: keyof typeof VITAL_THRESHOLDS,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const threshold = VITAL_THRESHOLDS[metric];
  if (!threshold) return 'poor';

  if (value <= threshold.good) return 'good';
  if (value <= threshold.needsImprovement) return 'needs-improvement';
  return 'poor';
}

/**
 * Get network tier based on current conditions
 */
export function getNetworkTier(rtt: number, downlink: number): NetworkTierConfig {
  for (const tier of NETWORK_TIERS) {
    if (rtt >= tier.minRtt && rtt < tier.maxRtt && downlink >= tier.minDownlink) {
      return tier;
    }
  }
  // Default to slowest tier
  return NETWORK_TIERS[NETWORK_TIERS.length - 1]!;
}

/**
 * Calculate bundle budget usage
 */
export function calculateBudgetUsage(
  actualSize: number,
  budgetType: keyof BundleBudget
): { usage: number; status: 'ok' | 'warning' | 'exceeded' } {
  const budget = BUNDLE_BUDGET[budgetType];
  if (typeof budget !== 'number') {
    return { usage: 0, status: 'ok' };
  }

  const usage = actualSize / budget;

  if (usage > 1) {
    return { usage, status: 'exceeded' };
  }
  if (usage > BUNDLE_BUDGET.warningThreshold) {
    return { usage, status: 'warning' };
  }
  return { usage, status: 'ok' };
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(2)}us`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// ============================================================================
// Export Default Configuration
// ============================================================================

/**
 * Default performance configuration (environment-aware)
 */
export const performanceConfig = getPerformanceConfig();
