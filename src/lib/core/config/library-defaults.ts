/**
 * @file Library Defaults Configuration
 * @description Centralized default values for the Harbor React Library.
 *
 * This module provides a single source of truth for all default configuration
 * values used throughout the library. Instead of hardcoding values in individual
 * modules, import defaults from here to ensure consistency and easy modification.
 *
 * ## Design Principles
 *
 * 1. **Centralized**: All defaults in one place for easy discovery and modification
 * 2. **Typed**: Full TypeScript support with branded types for safety
 * 3. **Documented**: Each value includes purpose, range, and reasoning
 * 4. **Overridable**: All defaults can be overridden at runtime via config
 * 5. **Feature-Flag Ready**: Integration points for conditional behavior
 *
 * @module core/config/library-defaults
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * import { TIMING_DEFAULTS, CACHE_DEFAULTS } from '@/lib/core/config/library-defaults';
 *
 * // Use centralized defaults instead of magic numbers
 * const cache = new RequestCache({
 *   defaultTtl: CACHE_DEFAULTS.DEFAULT_TTL_MS,
 *   maxEntries: CACHE_DEFAULTS.MAX_ENTRIES,
 * });
 * ```
 */

// ============================================================================
// Branded Types for Type Safety
// ============================================================================

/**
 * Branded type for milliseconds to prevent unit confusion.
 */
export type Milliseconds = number & { readonly __brand: 'Milliseconds' };

/**
 * Branded type for seconds.
 */
export type Seconds = number & { readonly __brand: 'Seconds' };

/**
 * Branded type for pixels.
 */
export type Pixels = number & { readonly __brand: 'Pixels' };

/**
 * Branded type for percentage (0-1 range).
 */
export type Percentage = number & { readonly __brand: 'Percentage' };

// Helper functions for creating branded values
export const ms = (value: number): Milliseconds => value as Milliseconds;
export const sec = (value: number): Seconds => value as Seconds;
export const px = (value: number): Pixels => value as Pixels;
export const pct = (value: number): Percentage => value as Percentage;

// ============================================================================
// Time Unit Constants
// ============================================================================

/** One second in milliseconds */
export const SECOND: Milliseconds = ms(1000);

/** One minute in milliseconds */
export const MINUTE: Milliseconds = ms(60 * 1000);

/** One hour in milliseconds */
export const HOUR: Milliseconds = ms(60 * 60 * 1000);

/** One day in milliseconds */
export const DAY: Milliseconds = ms(24 * 60 * 60 * 1000);

// ============================================================================
// Timing Defaults
// ============================================================================

/**
 * Default timing values used throughout the library.
 */
export const TIMING_DEFAULTS = {
  // ---------------------------------------------------------------------------
  // Network Timeouts
  // ---------------------------------------------------------------------------

  /**
   * Default timeout for API requests.
   * @default 30000 (30 seconds)
   */
  API_TIMEOUT_MS: ms(30000),

  /**
   * Default timeout for module loading.
   * @default 5000 (5 seconds)
   */
  MODULE_LOAD_TIMEOUT_MS: ms(5000),

  /**
   * Default timeout for hydration tasks.
   * @default 10000 (10 seconds)
   */
  HYDRATION_TASK_TIMEOUT_MS: ms(10000),

  /**
   * Default timeout for streaming operations.
   * @default 60000 (60 seconds)
   */
  STREAM_TIMEOUT_MS: ms(60000),

  // ---------------------------------------------------------------------------
  // Retry Configuration
  // ---------------------------------------------------------------------------

  /**
   * Base delay for retry operations.
   * @default 1000 (1 second)
   */
  RETRY_BASE_DELAY_MS: ms(1000),

  /**
   * Maximum delay for retry backoff.
   * @default 30000 (30 seconds)
   */
  RETRY_MAX_DELAY_MS: ms(30000),

  /**
   * Maximum jitter range for retry delays (as percentage).
   * @default 0.25 (25%)
   */
  RETRY_JITTER_RANGE: pct(0.25),

  /**
   * Maximum number of retry attempts.
   * @default 3
   */
  MAX_RETRY_ATTEMPTS: 3,

  // ---------------------------------------------------------------------------
  // Debounce & Throttle
  // ---------------------------------------------------------------------------

  /**
   * Default debounce delay for user input.
   * @default 300 (300ms)
   */
  DEBOUNCE_DELAY_MS: ms(300),

  /**
   * Default throttle delay for scroll/resize handlers.
   * @default 100 (100ms)
   */
  THROTTLE_DELAY_MS: ms(100),

  // ---------------------------------------------------------------------------
  // Session & Activity
  // ---------------------------------------------------------------------------

  /**
   * Default session timeout.
   * @default 1800000 (30 minutes)
   */
  SESSION_TIMEOUT_MS: ms(30 * 60 * 1000),

  /**
   * Activity check interval for session monitoring.
   * @default 60000 (1 minute)
   */
  ACTIVITY_CHECK_INTERVAL_MS: ms(60000),

  // ---------------------------------------------------------------------------
  // Animation
  // ---------------------------------------------------------------------------

  /**
   * Default animation duration.
   * @default 200 (200ms)
   */
  ANIMATION_DURATION_MS: ms(200),

  /**
   * Default toast display duration.
   * @default 5000 (5 seconds)
   */
  TOAST_DURATION_MS: ms(5000),

  // ---------------------------------------------------------------------------
  // Polling & Updates
  // ---------------------------------------------------------------------------

  /**
   * Default polling interval for status checks.
   * @default 1000 (1 second)
   */
  POLL_INTERVAL_MS: ms(1000),

  /**
   * Interval for garbage collection in caches.
   * @default 60000 (1 minute)
   */
  GC_INTERVAL_MS: ms(60000),
} as const;

// ============================================================================
// Cache Defaults
// ============================================================================

/**
 * Default cache configuration values.
 */
export const CACHE_DEFAULTS = {
  /**
   * Default cache TTL (time-to-live).
   * @default 300000 (5 minutes)
   */
  DEFAULT_TTL_MS: ms(5 * 60 * 1000),

  /**
   * Maximum cache entries.
   * @default 100
   */
  MAX_ENTRIES: 100,

  /**
   * Request deduplication window.
   * @default 100 (100ms)
   */
  DEDUPLICATION_WINDOW_MS: ms(100),

  /**
   * Stale-while-revalidate TTL.
   * @default 60000 (1 minute)
   */
  STALE_TTL_MS: ms(60000),
} as const;

// ============================================================================
// Queue & Buffer Defaults
// ============================================================================

/**
 * Default queue and buffer sizes.
 */
export const QUEUE_DEFAULTS = {
  /**
   * Maximum queue size for hydration tasks.
   * @default 1000
   */
  MAX_HYDRATION_QUEUE_SIZE: 1000,

  /**
   * Maximum queue size for request batching.
   * @default 50
   */
  MAX_BATCH_SIZE: 50,

  /**
   * Maximum buffer size for streaming.
   * @default 1000
   */
  MAX_STREAM_BUFFER_SIZE: 1000,

  /**
   * Maximum offline queue size.
   * @default 100
   */
  MAX_OFFLINE_QUEUE_SIZE: 100,

  /**
   * Maximum event history size.
   * @default 1000
   */
  MAX_EVENT_HISTORY_SIZE: 1000,

  /**
   * Maximum navigation history length.
   * @default 50
   */
  MAX_NAVIGATION_HISTORY: 50,
} as const;

// ============================================================================
// Performance Defaults
// ============================================================================

/**
 * Default performance configuration values.
 */
export const PERFORMANCE_DEFAULTS = {
  // ---------------------------------------------------------------------------
  // Frame Budget
  // ---------------------------------------------------------------------------

  /**
   * Target frame time for smooth 60fps.
   * @default 16 (16ms)
   */
  FRAME_TIME_MS: ms(16),

  /**
   * Maximum tasks per frame to prevent jank.
   * @default 10
   */
  MAX_TASKS_PER_FRAME: 10,

  /**
   * Minimum idle time before scheduling low-priority work.
   * @default 100 (100ms)
   */
  MIN_IDLE_TIME_MS: ms(100),

  // ---------------------------------------------------------------------------
  // Memory Thresholds
  // ---------------------------------------------------------------------------

  /**
   * Moderate memory pressure threshold.
   * @default 0.7 (70%)
   */
  MEMORY_MODERATE_THRESHOLD: pct(0.7),

  /**
   * Critical memory pressure threshold.
   * @default 0.9 (90%)
   */
  MEMORY_CRITICAL_THRESHOLD: pct(0.9),

  // ---------------------------------------------------------------------------
  // Metrics Collection
  // ---------------------------------------------------------------------------

  /**
   * Default sample rate for performance metrics.
   * @default 1.0 (100%)
   */
  METRICS_SAMPLE_RATE: pct(1.0),

  /**
   * Report interval for performance metrics.
   * @default 60000 (1 minute)
   */
  METRICS_REPORT_INTERVAL_MS: ms(60000),
} as const;

// ============================================================================
// UI Defaults
// ============================================================================

/**
 * Default UI configuration values.
 */
export const UI_DEFAULTS = {
  // ---------------------------------------------------------------------------
  // Layout
  // ---------------------------------------------------------------------------

  /**
   * Default sidebar width.
   * @default 280
   */
  SIDEBAR_WIDTH_PX: px(280),

  /**
   * Collapsed sidebar width.
   * @default 64
   */
  SIDEBAR_COLLAPSED_WIDTH_PX: px(64),

  /**
   * Default modal max width.
   * @default 500
   */
  MODAL_MAX_WIDTH_PX: px(500),

  // ---------------------------------------------------------------------------
  // Spacing
  // ---------------------------------------------------------------------------

  /**
   * Base spacing unit.
   * @default 4
   */
  SPACING_UNIT_PX: px(4),

  /**
   * Default border radius.
   * @default 8
   */
  BORDER_RADIUS_PX: px(8),

  // ---------------------------------------------------------------------------
  // Z-Index Scale
  // ---------------------------------------------------------------------------

  /**
   * Z-index for dropdowns.
   * @default 100
   */
  Z_INDEX_DROPDOWN: 100,

  /**
   * Z-index for modals.
   * @default 200
   */
  Z_INDEX_MODAL: 200,

  /**
   * Z-index for toasts.
   * @default 300
   */
  Z_INDEX_TOAST: 300,

  /**
   * Z-index for tooltips.
   * @default 400
   */
  Z_INDEX_TOOLTIP: 400,
} as const;

// ============================================================================
// Network Defaults
// ============================================================================

/**
 * Default network configuration values.
 */
export const NETWORK_DEFAULTS = {
  /**
   * Maximum concurrent requests.
   * @default 6
   */
  MAX_CONCURRENT_REQUESTS: 6,

  /**
   * Rate limit: requests per window.
   * @default 100
   */
  RATE_LIMIT_MAX_REQUESTS: 100,

  /**
   * Rate limit: window duration.
   * @default 60000 (1 minute)
   */
  RATE_LIMIT_WINDOW_MS: ms(60000),

  /**
   * Connection ping interval.
   * @default 30000 (30 seconds)
   */
  PING_INTERVAL_MS: ms(30000),

  /**
   * WebSocket reconnect delay.
   * @default 3000 (3 seconds)
   */
  WS_RECONNECT_DELAY_MS: ms(3000),

  /**
   * Maximum WebSocket reconnect attempts.
   * @default 10
   */
  MAX_WS_RECONNECT_ATTEMPTS: 10,
} as const;

// ============================================================================
// Feature Flag Keys
// ============================================================================

/**
 * Standard feature flag keys for library features.
 * These should be used consistently across all modules.
 */
export const LIBRARY_FEATURE_FLAGS = {
  // ---------------------------------------------------------------------------
  // Core Features
  // ---------------------------------------------------------------------------

  /** Enable streaming data support */
  STREAMING_ENABLED: 'lib.streaming.enabled',

  /** Enable progressive hydration */
  HYDRATION_ENABLED: 'lib.hydration.enabled',

  /** Enable priority-based hydration */
  HYDRATION_PRIORITY_ENABLED: 'lib.hydration.priority',

  /** Enable offline queue support */
  OFFLINE_QUEUE_ENABLED: 'lib.offline.enabled',

  /** Enable data sync features */
  DATA_SYNC_ENABLED: 'lib.data.sync.enabled',

  // ---------------------------------------------------------------------------
  // Performance Features
  // ---------------------------------------------------------------------------

  /** Enable predictive prefetching */
  PREDICTIVE_PREFETCH_ENABLED: 'lib.perf.predictive.enabled',

  /** Enable memory pressure monitoring */
  MEMORY_MONITORING_ENABLED: 'lib.perf.memory.enabled',

  /** Enable render tracking */
  RENDER_TRACKING_ENABLED: 'lib.perf.render.enabled',

  // ---------------------------------------------------------------------------
  // Debug Features
  // ---------------------------------------------------------------------------

  /** Enable debug mode */
  DEBUG_MODE: 'lib.debug.enabled',

  /** Enable verbose logging */
  VERBOSE_LOGGING: 'lib.debug.verbose',

  /** Enable DevTools integration */
  DEVTOOLS_ENABLED: 'lib.debug.devtools',
} as const;

// ============================================================================
// Consolidated Library Config Type
// ============================================================================

/**
 * Complete library configuration interface.
 * Use this type for providing runtime overrides.
 */
export interface LibraryConfig {
  readonly timing: Partial<typeof TIMING_DEFAULTS>;
  readonly cache: Partial<typeof CACHE_DEFAULTS>;
  readonly queue: Partial<typeof QUEUE_DEFAULTS>;
  readonly performance: Partial<typeof PERFORMANCE_DEFAULTS>;
  readonly ui: Partial<typeof UI_DEFAULTS>;
  readonly network: Partial<typeof NETWORK_DEFAULTS>;
  readonly features: Partial<Record<keyof typeof LIBRARY_FEATURE_FLAGS, boolean>>;
}

/**
 * Get a timing default with optional override.
 */
export function getTimingDefault<K extends keyof typeof TIMING_DEFAULTS>(
  key: K,
  override?: number
): typeof TIMING_DEFAULTS[K] {
  return (override ?? TIMING_DEFAULTS[key]) as typeof TIMING_DEFAULTS[K];
}

/**
 * Get a cache default with optional override.
 */
export function getCacheDefault<K extends keyof typeof CACHE_DEFAULTS>(
  key: K,
  override?: number
): typeof CACHE_DEFAULTS[K] {
  return (override ?? CACHE_DEFAULTS[key]) as typeof CACHE_DEFAULTS[K];
}

/**
 * Get a queue default with optional override.
 */
export function getQueueDefault<K extends keyof typeof QUEUE_DEFAULTS>(
  key: K,
  override?: number
): typeof QUEUE_DEFAULTS[K] {
  return (override ?? QUEUE_DEFAULTS[key]) as typeof QUEUE_DEFAULTS[K];
}

// ============================================================================
// Export All Defaults
// ============================================================================

export const LIBRARY_DEFAULTS = {
  timing: TIMING_DEFAULTS,
  cache: CACHE_DEFAULTS,
  queue: QUEUE_DEFAULTS,
  performance: PERFORMANCE_DEFAULTS,
  ui: UI_DEFAULTS,
  network: NETWORK_DEFAULTS,
  featureFlags: LIBRARY_FEATURE_FLAGS,
} as const;

export default LIBRARY_DEFAULTS;
