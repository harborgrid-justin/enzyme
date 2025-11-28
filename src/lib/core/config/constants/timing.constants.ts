/**
 * @fileoverview Centralized timing constants for the library module.
 *
 * This module consolidates ALL timing-related values that were previously
 * scattered across multiple files. By centralizing these values:
 *
 * 1. Single source of truth for all timing defaults
 * 2. Easy to adjust timing behavior globally
 * 3. Consistent timing across all library modules
 * 4. Full type safety with dedicated types
 *
 * @module core/config/constants/timing
 */

import type {
  Milliseconds,
  Seconds,
  NetworkConfig,
  CacheConfig,
  FeatureFlagsConfig,
  AuthConfig,
  LayoutsConfig,
  VDOMConfig,
  UIConfig,
  MonitoringConfig,
} from '../types';

// =============================================================================
// Time Unit Helpers
// =============================================================================

/** One second in milliseconds */
export const SECOND: Milliseconds = 1000;

/** One minute in milliseconds */
export const MINUTE: Milliseconds = 60 * SECOND;

/** One hour in milliseconds */
export const HOUR: Milliseconds = 60 * MINUTE;

// =============================================================================
// Network Timing Defaults
// =============================================================================

/**
 * Default network configuration values.
 *
 * These values are optimized for typical web applications with:
 * - Reasonable timeout for standard API calls
 * - Extended timeout for file uploads and long-running operations
 * - Exponential backoff for retries
 */
export const DEFAULT_NETWORK_CONFIG: NetworkConfig = {
  // Request timeouts
  defaultTimeout: 30 * SECOND,        // Standard API requests
  longTimeout: 2 * MINUTE,            // File uploads, report generation
  shortTimeout: 10 * SECOND,          // Quick endpoints
  healthCheckTimeout: 5 * SECOND,     // Health checks

  // Retry configuration
  retryBaseDelay: 1 * SECOND,
  retryMaxDelay: 30 * SECOND,
  maxRetryAttempts: 3,
  retryJitter: 0.25,                  // 25% jitter

  // WebSocket configuration
  websocketPingInterval: 30 * SECOND,
  websocketReconnectDelay: 3 * SECOND,
  websocketMaxReconnectAttempts: 10,

  // SSE configuration
  sseReconnectDelay: 5 * SECOND,
  sseMaxReconnectAttempts: 10,
} as const;

// =============================================================================
// Cache Timing Defaults
// =============================================================================

/**
 * Default cache configuration values.
 *
 * Cache TTLs are tiered based on data volatility:
 * - Short: Real-time data that changes frequently
 * - Default: Standard application data
 * - Long: Slowly changing configuration
 * - Extended: Reference data, rarely changes
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  // TTL tiers
  shortTTL: 1 * MINUTE,
  defaultTTL: 5 * MINUTE,
  longTTL: 30 * MINUTE,
  extendedTTL: 1 * HOUR,

  // Cache management
  maxSize: 1000,                      // Max LRU cache entries
  staleWhileRevalidate: 1 * HOUR,     // Background revalidation window
  gcInterval: 5 * MINUTE,             // Garbage collection interval
  memoryPressureThreshold: 50 * 1024 * 1024, // 50MB
} as const;

// =============================================================================
// Feature Flags Timing Defaults
// =============================================================================

/**
 * Default feature flags configuration values.
 */
export const DEFAULT_FLAGS_CONFIG: FeatureFlagsConfig = {
  pollingInterval: 1 * MINUTE,
  websocketPingInterval: 30 * SECOND,
  cacheTTL: 5 * MINUTE,
  maxFailures: 5,
  jitter: 0.1,                        // 10% jitter
  fetchTimeout: 10 * SECOND,
  evaluationTimeout: 50,              // 50ms max for rule evaluation
  maxCachedFlags: 1000,
  storageKey: 'feature-flags',
} as const;

// =============================================================================
// Authentication Timing Defaults
// =============================================================================

/**
 * Default authentication timing configuration.
 */
export const DEFAULT_AUTH_CONFIG: AuthConfig = {
  tokenRefreshBuffer: 5 * MINUTE,     // Refresh 5 min before expiry
  sessionTimeout: 30 * MINUTE,        // 30 min inactivity timeout
  sessionCheckInterval: 1 * MINUTE,   // Check session every minute
  defaultTokenLifetime: 3600 as Seconds, // 1 hour in seconds
  logoutRedirectDelay: 1500,          // 1.5 seconds
  lockoutDuration: 15 * MINUTE,       // 15 min lockout after failed attempts
  maxLoginAttempts: 5,
  tokenCheckInterval: 1 * MINUTE,
} as const;

// =============================================================================
// Layout Timing Defaults
// =============================================================================

/**
 * Default layout configuration values.
 */
export const DEFAULT_LAYOUTS_CONFIG: LayoutsConfig = {
  // Responsive defaults
  defaultBreakpoint: 768,             // Mobile/desktop breakpoint (px)
  defaultGap: 16,                     // Default spacing (px)
  defaultPadding: 16,                 // Default padding (px)
  minColumnWidth: 200,                // Grid minimum column width (px)

  // CLS (Cumulative Layout Shift) timing
  clsEntryMaxAge: 5 * SECOND,
  clsSessionWindowGap: 1 * SECOND,
  clsMaxSessionWindow: 5 * SECOND,

  // Animation/transitions
  morphTransitionDuration: 300,       // ms

  // Event handling
  resizeDebounce: 150,                // ms
  scrollThrottle: 16,                 // ~60fps
  scrollEdgeThreshold: 5,             // px

  // Viewport intersection
  viewportThresholds: [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1],
} as const;

// =============================================================================
// VDOM Configuration Defaults
// =============================================================================

/**
 * Default VDOM and streaming configuration.
 */
export const DEFAULT_VDOM_CONFIG: VDOMConfig = {
  // Pool management
  poolSize: 100,
  gcInterval: 5 * MINUTE,
  memoryLimit: 100 * 1024 * 1024,     // 100MB

  // Batching
  maxBatchSize: 50,

  // Streaming
  streamBufferSize: 64 * 1024,        // 64KB
  streamHighWaterMark: 16 * 1024,     // 16KB
  streamTimeout: 1 * MINUTE,
  streamRetryDelay: 1 * SECOND,
} as const;

// =============================================================================
// UI Timing Defaults
// =============================================================================

/**
 * Default UI timing configuration.
 */
export const DEFAULT_UI_CONFIG: UIConfig = {
  // Debounce values
  inputDebounce: 300,
  formDebounce: 500,
  searchDebounce: 300,
  resizeDebounce: 150,

  // Throttle values
  scrollThrottle: 16,                 // ~60fps

  // Animation durations
  animationFast: 100,
  animationStandard: 200,
  animationSlow: 300,

  // Feedback timing
  toastDuration: 5 * SECOND,
  spinnerDelay: 200,                  // Prevent flash of spinner
  skeletonMinDisplay: 500,            // Prevent flash of content

  // Focus management
  focusTrapDelay: 50,
} as const;

// =============================================================================
// Monitoring Configuration Defaults
// =============================================================================

/**
 * Default monitoring configuration.
 */
export const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  metricsFlushInterval: 30 * SECOND,
  samplingRate: 1.0,                  // 100% sampling in dev, adjust in prod
  slowRequestThreshold: 1 * SECOND,
  latencyBuckets: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
  memoryCheckInterval: 30 * SECOND,
  fpsSamplingInterval: 100,
  longTaskThreshold: 50,              // 50ms (Web Performance standard)
  maxStoredMetrics: 1000,
} as const;

// =============================================================================
// Individual Timing Constants (for direct import)
// =============================================================================

// Network timeouts
export const DEFAULT_TIMEOUT = DEFAULT_NETWORK_CONFIG.defaultTimeout;
export const DEFAULT_LONG_TIMEOUT = DEFAULT_NETWORK_CONFIG.longTimeout;
export const DEFAULT_SHORT_TIMEOUT = DEFAULT_NETWORK_CONFIG.shortTimeout;
export const DEFAULT_HEALTH_CHECK_TIMEOUT = DEFAULT_NETWORK_CONFIG.healthCheckTimeout;
export const DEFAULT_REMOTE_TIMEOUT = 10 * SECOND;

// Retry configuration
export const DEFAULT_RETRY_BASE_DELAY = DEFAULT_NETWORK_CONFIG.retryBaseDelay;
export const DEFAULT_RETRY_MAX_DELAY = DEFAULT_NETWORK_CONFIG.retryMaxDelay;
export const DEFAULT_MAX_RETRY_ATTEMPTS = DEFAULT_NETWORK_CONFIG.maxRetryAttempts;

// Cache TTLs
export const DEFAULT_CACHE_TTL = DEFAULT_CACHE_CONFIG.defaultTTL;
export const DEFAULT_SHORT_CACHE_TTL = DEFAULT_CACHE_CONFIG.shortTTL;
export const DEFAULT_LONG_CACHE_TTL = DEFAULT_CACHE_CONFIG.longTTL;

// Feature flags
export const DEFAULT_POLLING_INTERVAL = DEFAULT_FLAGS_CONFIG.pollingInterval;
export const DEFAULT_PING_INTERVAL = DEFAULT_FLAGS_CONFIG.websocketPingInterval;
export const DEFAULT_FLAG_CACHE_TTL = DEFAULT_FLAGS_CONFIG.cacheTTL;
export const DEFAULT_MAX_FAILURES = DEFAULT_FLAGS_CONFIG.maxFailures;
export const DEFAULT_JITTER = DEFAULT_FLAGS_CONFIG.jitter;
export const EVALUATION_TIMEOUT = DEFAULT_FLAGS_CONFIG.evaluationTimeout;

// Authentication
export const TOKEN_REFRESH_BUFFER = DEFAULT_AUTH_CONFIG.tokenRefreshBuffer;
export const SESSION_TIMEOUT = DEFAULT_AUTH_CONFIG.sessionTimeout;
export const SESSION_CHECK_INTERVAL = DEFAULT_AUTH_CONFIG.sessionCheckInterval;
export const DEFAULT_TOKEN_LIFETIME = DEFAULT_AUTH_CONFIG.defaultTokenLifetime;
export const REFRESH_BUFFER_MS = DEFAULT_AUTH_CONFIG.tokenRefreshBuffer;

// Layouts
export const DEFAULT_BREAKPOINT = DEFAULT_LAYOUTS_CONFIG.defaultBreakpoint;
export const DEFAULT_GAP = DEFAULT_LAYOUTS_CONFIG.defaultGap;
export const DEFAULT_PADDING = DEFAULT_LAYOUTS_CONFIG.defaultPadding;
export const DEFAULT_MIN_COLUMN_WIDTH = DEFAULT_LAYOUTS_CONFIG.minColumnWidth;
export const MAX_ENTRY_AGE_MS = DEFAULT_LAYOUTS_CONFIG.clsEntryMaxAge;
export const SESSION_WINDOW_GAP_MS = DEFAULT_LAYOUTS_CONFIG.clsSessionWindowGap;
export const MAX_SESSION_WINDOW_MS = DEFAULT_LAYOUTS_CONFIG.clsMaxSessionWindow;

// UI
export const DEFAULT_DEBOUNCE = DEFAULT_UI_CONFIG.inputDebounce;
export const DEFAULT_SCROLL_THROTTLE = DEFAULT_UI_CONFIG.scrollThrottle;
export const DEFAULT_THROTTLE_MS = DEFAULT_UI_CONFIG.scrollThrottle;

// VDOM
export const DEFAULT_POOL_SIZE = DEFAULT_VDOM_CONFIG.poolSize;
export const DEFAULT_GC_INTERVAL = DEFAULT_VDOM_CONFIG.gcInterval;
export const DEFAULT_MEMORY_LIMIT = DEFAULT_VDOM_CONFIG.memoryLimit;
export const DEFAULT_BATCH_SIZE = DEFAULT_VDOM_CONFIG.maxBatchSize;

// Monitoring
export const DEFAULT_METRICS_FLUSH_INTERVAL = DEFAULT_MONITORING_CONFIG.metricsFlushInterval;
export const DEFAULT_SLOW_REQUEST_THRESHOLD = DEFAULT_MONITORING_CONFIG.slowRequestThreshold;
export const DEFAULT_BUCKETS = DEFAULT_MONITORING_CONFIG.latencyBuckets;
