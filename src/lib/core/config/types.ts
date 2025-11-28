/**
 * @fileoverview Comprehensive type definitions for the centralized library configuration system.
 *
 * This module provides PhD-level type safety for all configuration concerns:
 * - Network configuration (timeouts, retries)
 * - Cache configuration (TTLs, sizes)
 * - Feature flags configuration
 * - Authentication timing
 * - Layout defaults
 * - VDOM/Streaming settings
 * - REST API endpoint registry types
 * - Runtime configuration change events
 *
 * @module core/config/types
 */

// Import branded numeric types from shared utilities
import type {
  Milliseconds as BrandedMilliseconds,
  Seconds as BrandedSeconds,
  Pixels as BrandedPixels,
  Percentage as BrandedPercentage,
  DeepPartial as SharedDeepPartial,
  DeepReadonly as SharedDeepReadonly,
} from '../../shared/type-utils';

// Re-export branded types for module consumers
export type { BrandedMilliseconds as Milliseconds };
export type { BrandedSeconds as Seconds };
export type { BrandedPixels as Pixels };
export type { BrandedPercentage as Percentage };

// Local type aliases for use within this file
type Milliseconds = BrandedMilliseconds;
type Seconds = BrandedSeconds;
type Pixels = BrandedPixels;
type Percentage = BrandedPercentage;
type DeepPartial<T> = SharedDeepPartial<T>;
type DeepReadonly<T> = SharedDeepReadonly<T>;

// Re-export type constructors for convenience
export { ms, sec, px, pct } from '../../shared/type-utils';

// =============================================================================
// Primitive Types
// =============================================================================

/**
 * @deprecated Use the branded Milliseconds type from shared/type-utils instead.
 * This alias is provided for backward compatibility with existing code.
 */
export type MillisecondsUnbranded = number;

/**
 * @deprecated Use the branded Seconds type from shared/type-utils instead.
 * This alias is provided for backward compatibility with existing code.
 */
export type SecondsUnbranded = number;

/**
 * @deprecated Use the branded Pixels type from shared/type-utils instead.
 * This alias is provided for backward compatibility with existing code.
 */
export type PixelsUnbranded = number;

/**
 * @deprecated Use the branded Percentage type from shared/type-utils instead.
 * This alias is provided for backward compatibility with existing code.
 */
export type PercentageUnbranded = number;

/**
 * HTTP methods supported by the endpoint registry.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * Configuration source types for tracking origin.
 */
export type ConfigSource = 'default' | 'environment' | 'remote' | 'runtime' | 'override';

/**
 * Environment types for conditional configuration.
 */
export type Environment = 'development' | 'staging' | 'production' | 'test';

// =============================================================================
// Network Configuration
// =============================================================================

/**
 * Network-related configuration for HTTP clients and connections.
 */
export interface NetworkConfig {
  /** Default timeout for standard API requests (ms) */
  readonly defaultTimeout: Milliseconds;

  /** Extended timeout for long-running operations like uploads (ms) */
  readonly longTimeout: Milliseconds;

  /** Short timeout for quick endpoints like health checks (ms) */
  readonly shortTimeout: Milliseconds;

  /** Timeout specifically for health check endpoints (ms) */
  readonly healthCheckTimeout: Milliseconds;

  /** Base delay for exponential backoff retry (ms) */
  readonly retryBaseDelay: Milliseconds;

  /** Maximum delay between retries (ms) */
  readonly retryMaxDelay: Milliseconds;

  /** Maximum number of retry attempts */
  readonly maxRetryAttempts: number;

  /** Jitter factor for retry delays (0-1) */
  readonly retryJitter: number;

  /** WebSocket ping interval (ms) */
  readonly websocketPingInterval: Milliseconds;

  /** WebSocket reconnect base delay (ms) */
  readonly websocketReconnectDelay: Milliseconds;

  /** Maximum WebSocket reconnection attempts */
  readonly websocketMaxReconnectAttempts: number;

  /** SSE reconnection delay (ms) */
  readonly sseReconnectDelay: Milliseconds;

  /** Maximum SSE reconnection attempts */
  readonly sseMaxReconnectAttempts: number;
}

// =============================================================================
// Cache Configuration
// =============================================================================

/**
 * Cache-related configuration for data caching layers.
 */
export interface CacheConfig {
  /** Default TTL for cached items (ms) */
  readonly defaultTTL: Milliseconds;

  /** Short TTL for frequently changing data (ms) */
  readonly shortTTL: Milliseconds;

  /** Long TTL for slowly changing data (ms) */
  readonly longTTL: Milliseconds;

  /** Extended TTL for reference/static data (ms) */
  readonly extendedTTL: Milliseconds;

  /** Maximum number of items in LRU caches */
  readonly maxSize: number;

  /** Stale-while-revalidate window (ms) */
  readonly staleWhileRevalidate: Milliseconds;

  /** Garbage collection interval (ms) */
  readonly gcInterval: Milliseconds;

  /** Memory pressure threshold (bytes) */
  readonly memoryPressureThreshold: number;
}

// =============================================================================
// Feature Flags Configuration
// =============================================================================

/**
 * Feature flags system configuration.
 */
export interface FeatureFlagsConfig {
  /** Polling interval for remote flag updates (ms) */
  readonly pollingInterval: Milliseconds;

  /** WebSocket ping interval for real-time flags (ms) */
  readonly websocketPingInterval: Milliseconds;

  /** Cache TTL for flag values (ms) */
  readonly cacheTTL: Milliseconds;

  /** Maximum consecutive failures before circuit breaker */
  readonly maxFailures: number;

  /** Jitter factor for polling (0-1) */
  readonly jitter: number;

  /** Timeout for remote flag fetches (ms) */
  readonly fetchTimeout: Milliseconds;

  /** Evaluation timeout for complex rules (ms) */
  readonly evaluationTimeout: Milliseconds;

  /** Maximum cached flag entries */
  readonly maxCachedFlags: number;

  /** Local storage key for persisted flags */
  readonly storageKey: string;
}

// =============================================================================
// Authentication Configuration
// =============================================================================

/**
 * Authentication timing configuration.
 */
export interface AuthConfig {
  /** Buffer time before token expiry to trigger refresh (ms) */
  readonly tokenRefreshBuffer: Milliseconds;

  /** Session timeout for inactivity (ms) */
  readonly sessionTimeout: Milliseconds;

  /** Interval for session validity checks (ms) */
  readonly sessionCheckInterval: Milliseconds;

  /** Default token lifetime if not specified by server (seconds) */
  readonly defaultTokenLifetime: Seconds;

  /** Delay after logout before redirect (ms) */
  readonly logoutRedirectDelay: Milliseconds;

  /** Account lockout duration after failed attempts (ms) */
  readonly lockoutDuration: Milliseconds;

  /** Maximum login attempts before lockout */
  readonly maxLoginAttempts: number;

  /** Token validation check interval (ms) */
  readonly tokenCheckInterval: Milliseconds;
}

// =============================================================================
// Layouts Configuration
// =============================================================================

/**
 * Layout system defaults and configuration.
 */
export interface LayoutsConfig {
  /** Default responsive breakpoint (px) */
  readonly defaultBreakpoint: Pixels;

  /** Default gap between layout items (px) */
  readonly defaultGap: Pixels;

  /** Default padding for containers (px) */
  readonly defaultPadding: Pixels;

  /** Minimum column width for grid layouts (px) */
  readonly minColumnWidth: Pixels;

  /** Maximum age for CLS entries (ms) */
  readonly clsEntryMaxAge: Milliseconds;

  /** CLS session window gap (ms) */
  readonly clsSessionWindowGap: Milliseconds;

  /** Maximum CLS session window duration (ms) */
  readonly clsMaxSessionWindow: Milliseconds;

  /** Morph transition duration (ms) */
  readonly morphTransitionDuration: Milliseconds;

  /** Resize debounce delay (ms) */
  readonly resizeDebounce: Milliseconds;

  /** Scroll throttle interval (ms) */
  readonly scrollThrottle: Milliseconds;

  /** Edge threshold for scroll detection (px) */
  readonly scrollEdgeThreshold: Pixels;

  /** Viewport intersection thresholds */
  readonly viewportThresholds: readonly number[];
}

// =============================================================================
// VDOM Configuration
// =============================================================================

/**
 * Virtual DOM and streaming configuration.
 */
export interface VDOMConfig {
  /** Object pool size for VDOM nodes */
  readonly poolSize: number;

  /** Garbage collection interval (ms) */
  readonly gcInterval: Milliseconds;

  /** Memory limit for VDOM operations (bytes) */
  readonly memoryLimit: number;

  /** Maximum batch size for updates */
  readonly maxBatchSize: number;

  /** Stream buffer size (bytes) */
  readonly streamBufferSize: number;

  /** Stream high water mark (bytes) */
  readonly streamHighWaterMark: number;

  /** Global stream timeout (ms) */
  readonly streamTimeout: Milliseconds;

  /** Stream retry delay (ms) */
  readonly streamRetryDelay: Milliseconds;
}

// =============================================================================
// UI Configuration
// =============================================================================

/**
 * UI timing and behavior configuration.
 */
export interface UIConfig {
  /** Debounce for input changes (ms) */
  readonly inputDebounce: Milliseconds;

  /** Debounce for form validation (ms) */
  readonly formDebounce: Milliseconds;

  /** Debounce for search queries (ms) */
  readonly searchDebounce: Milliseconds;

  /** Debounce for window resize (ms) */
  readonly resizeDebounce: Milliseconds;

  /** Throttle for scroll handlers (ms) */
  readonly scrollThrottle: Milliseconds;

  /** Animation duration for fast transitions (ms) */
  readonly animationFast: Milliseconds;

  /** Animation duration for standard transitions (ms) */
  readonly animationStandard: Milliseconds;

  /** Animation duration for slow transitions (ms) */
  readonly animationSlow: Milliseconds;

  /** Toast display duration (ms) */
  readonly toastDuration: Milliseconds;

  /** Delay before showing loading spinner (ms) */
  readonly spinnerDelay: Milliseconds;

  /** Minimum skeleton display time (ms) */
  readonly skeletonMinDisplay: Milliseconds;

  /** Focus trap initialization delay (ms) */
  readonly focusTrapDelay: Milliseconds;
}

// =============================================================================
// Monitoring Configuration
// =============================================================================

/**
 * Performance monitoring and metrics configuration.
 */
export interface MonitoringConfig {
  /** Metrics flush interval (ms) */
  readonly metricsFlushInterval: Milliseconds;

  /** Performance sampling rate (0-1) */
  readonly samplingRate: number;

  /** Slow request threshold (ms) */
  readonly slowRequestThreshold: Milliseconds;

  /** Histogram buckets for latency */
  readonly latencyBuckets: readonly number[];

  /** Memory check interval (ms) */
  readonly memoryCheckInterval: Milliseconds;

  /** FPS sampling interval (ms) */
  readonly fpsSamplingInterval: Milliseconds;

  /** Long task threshold (ms) */
  readonly longTaskThreshold: Milliseconds;

  /** Maximum stored metrics */
  readonly maxStoredMetrics: number;
}

// =============================================================================
// Complete Library Configuration
// =============================================================================

/**
 * Complete library configuration interface.
 *
 * This is the top-level configuration object that aggregates all
 * domain-specific configurations.
 */
export interface LibraryConfig {
  /** Network and HTTP configuration */
  readonly network: NetworkConfig;

  /** Cache configuration */
  readonly cache: CacheConfig;

  /** Feature flags configuration */
  readonly flags: FeatureFlagsConfig;

  /** Authentication timing configuration */
  readonly auth: AuthConfig;

  /** Layout system configuration */
  readonly layouts: LayoutsConfig;

  /** VDOM and streaming configuration */
  readonly vdom: VDOMConfig;

  /** UI timing configuration */
  readonly ui: UIConfig;

  /** Monitoring configuration */
  readonly monitoring: MonitoringConfig;
}

// =============================================================================
// Endpoint Registry Types
// =============================================================================

/**
 * Cache strategy for endpoint responses.
 */
export type CacheStrategy =
  | 'no-cache'
  | 'cache-first'
  | 'network-first'
  | 'stale-while-revalidate';

/**
 * Cache configuration for an endpoint.
 */
export interface EndpointCacheConfig {
  /** Cache strategy */
  readonly strategy: CacheStrategy;

  /** Time to live in milliseconds */
  readonly ttl: Milliseconds;

  /** Cache tags for invalidation */
  readonly tags?: readonly string[];

  /** Whether to vary cache by user */
  readonly varyByUser?: boolean;
}

/**
 * Rate limiting configuration for an endpoint.
 */
export interface EndpointRateLimit {
  /** Maximum requests per window */
  readonly requests: number;

  /** Window size in milliseconds */
  readonly window: Milliseconds;

  /** Whether to apply per-user or global */
  readonly scope: 'user' | 'global';
}

/**
 * Health status for an endpoint.
 */
export type EndpointHealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

/**
 * Endpoint health information.
 */
export interface EndpointHealth {
  /** Current health status */
  readonly status: EndpointHealthStatus;

  /** Last successful request timestamp */
  readonly lastSuccess?: Date;

  /** Last failure timestamp */
  readonly lastFailure?: Date;

  /** Consecutive failure count */
  readonly failureCount: number;

  /** Average response time (ms) */
  readonly avgResponseTime?: Milliseconds;

  /** Error message if unhealthy */
  readonly errorMessage?: string;
}

/**
 * Complete endpoint definition.
 */
export interface EndpointDefinition {
  /** Unique endpoint name/identifier */
  readonly name: string;

  /** URL path (can include :param placeholders) */
  readonly path: string;

  /** HTTP method */
  readonly method: HttpMethod;

  /** Human-readable description */
  readonly description?: string;

  /** API version (e.g., 'v1', 'v2') */
  readonly version?: string;

  /** Whether authentication is required */
  readonly auth: boolean;

  /** Request timeout override (ms) */
  readonly timeout?: Milliseconds;

  /** Number of retry attempts */
  readonly retries?: number;

  /** Cache configuration */
  readonly cache?: EndpointCacheConfig;

  /** Rate limiting configuration */
  readonly rateLimit?: EndpointRateLimit;

  /** Tags for categorization/filtering */
  readonly tags?: readonly string[];

  /** Base URL override (for external services) */
  readonly baseUrl?: string;

  /** Custom headers for this endpoint */
  readonly headers?: Readonly<Record<string, string>>;

  /** Request body schema (for validation) */
  readonly requestSchema?: unknown;

  /** Response body schema (for validation) */
  readonly responseSchema?: unknown;

  /** Whether endpoint is deprecated */
  readonly deprecated?: boolean;

  /** Deprecation message */
  readonly deprecationMessage?: string;

  /** Replacement endpoint if deprecated */
  readonly replacedBy?: string;
}

/**
 * Endpoint change event types.
 */
export type EndpointEventType =
  | 'registered'
  | 'updated'
  | 'removed'
  | 'health-changed';

/**
 * Endpoint change event.
 */
export interface EndpointChangeEvent {
  /** Event type */
  readonly type: EndpointEventType;

  /** Endpoint name */
  readonly name: string;

  /** Endpoint definition (for registered/updated) */
  readonly endpoint?: EndpointDefinition;

  /** Previous health status (for health-changed) */
  readonly previousHealth?: EndpointHealth;

  /** New health status (for health-changed) */
  readonly newHealth?: EndpointHealth;

  /** Event timestamp */
  readonly timestamp: Date;
}

/**
 * Endpoint change listener function.
 */
export type EndpointChangeListener = (event: EndpointChangeEvent) => void;

/**
 * Unsubscribe function returned by subscribe methods.
 */
export type Unsubscribe = () => void;

// =============================================================================
// Runtime Configuration Types
// =============================================================================

/**
 * Configuration change event.
 */
export interface ConfigChangeEvent {
  /** Dot-notation path that changed */
  readonly path: string;

  /** Previous value */
  readonly previousValue: unknown;

  /** New value */
  readonly newValue: unknown;

  /** Source of the change */
  readonly source: ConfigSource;

  /** Change timestamp */
  readonly timestamp: Date;
}

/**
 * Configuration change listener.
 */
export type ConfigChangeListener = (event: ConfigChangeEvent) => void;

/**
 * Runtime configuration options.
 */
export interface RuntimeConfigOptions {
  /** Whether to persist changes to storage */
  readonly persist?: boolean;

  /** Storage key for persistence */
  readonly storageKey?: string;

  /** Whether to validate changes against schema */
  readonly validate?: boolean;

  /** Whether to emit change events */
  readonly emitEvents?: boolean;

  /** Debounce delay for batched updates (ms) */
  readonly debounceDelay?: Milliseconds;
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Deep partial type for configuration overrides.
 *
 * @deprecated Import from '../../shared/type-utils' instead.
 * This re-export is provided for backward compatibility.
 */
export type { SharedDeepPartial as DeepPartial };

/**
 * Deep readonly type for immutable configuration.
 *
 * Re-exported from shared utilities for consistency.
 */
export type { DeepReadonly } from '../../shared/type-utils';

/**
 * Path type for dot-notation access.
 */
export type ConfigPath = string;

/**
 * Configuration value accessor result.
 */
export interface ConfigAccessResult<T> {
  /** Whether the value exists */
  readonly exists: boolean;

  /** The value if it exists */
  readonly value?: T;

  /** The source of the value */
  readonly source?: ConfigSource;
}

// =============================================================================
// Registry Interface Types
// =============================================================================

/**
 * Interface for the centralized configuration registry.
 */
export interface IConfigRegistry {
  /**
   * Get the complete library configuration.
   */
  getConfig(): DeepReadonly<LibraryConfig>;

  /**
   * Get a specific configuration value by path.
   */
  get<T>(path: ConfigPath, defaultValue?: T): T;

  /**
   * Check if a configuration path exists.
   */
  has(path: ConfigPath): boolean;

  /**
   * Set a runtime configuration value.
   */
  set(path: ConfigPath, value: unknown, source?: ConfigSource): void;

  /**
   * Reset configuration to defaults.
   */
  reset(path?: ConfigPath): void;

  /**
   * Subscribe to configuration changes.
   */
  subscribe(listener: ConfigChangeListener): Unsubscribe;

  /**
   * Subscribe to changes at a specific path.
   */
  subscribeToPath(path: ConfigPath, listener: ConfigChangeListener): Unsubscribe;

  /**
   * Apply environment-specific overrides.
   */
  applyEnvironmentOverrides(env: Environment): void;

  /**
   * Get configuration source for a path.
   */
  getSource(path: ConfigPath): ConfigSource;
}

/**
 * Interface for the endpoint registry.
 */
export interface IEndpointRegistry {
  /**
   * Register a new endpoint.
   */
  register(definition: EndpointDefinition): void;

  /**
   * Register multiple endpoints at once.
   */
  registerBatch(definitions: readonly EndpointDefinition[]): void;

  /**
   * Get an endpoint by name.
   */
  get(name: string): EndpointDefinition | undefined;

  /**
   * Get all endpoints matching a tag.
   */
  getByTag(tag: string): readonly EndpointDefinition[];

  /**
   * Get all endpoints matching a path pattern.
   */
  getByPath(pathPattern: string): readonly EndpointDefinition[];

  /**
   * Get all registered endpoints.
   */
  getAll(): readonly EndpointDefinition[];

  /**
   * Update an existing endpoint.
   */
  update(name: string, updates: Partial<EndpointDefinition>): void;

  /**
   * Remove an endpoint.
   */
  remove(name: string): void;

  /**
   * Check if an endpoint exists.
   */
  has(name: string): boolean;

  /**
   * Mark an endpoint as healthy.
   */
  markHealthy(name: string, responseTime?: Milliseconds): void;

  /**
   * Mark an endpoint as unhealthy.
   */
  markUnhealthy(name: string, reason: string): void;

  /**
   * Get health status for an endpoint.
   */
  getHealth(name: string): EndpointHealth | undefined;

  /**
   * Get all unhealthy endpoints.
   */
  getUnhealthyEndpoints(): readonly string[];

  /**
   * Subscribe to endpoint changes.
   */
  subscribe(listener: EndpointChangeListener): Unsubscribe;

  /**
   * Build a full URL for an endpoint.
   */
  buildUrl(name: string, params?: Record<string, string | number>): string;

  /**
   * Build a URL with query parameters.
   */
  buildUrlWithQuery(
    name: string,
    params?: Record<string, string | number>,
    query?: Record<string, string | number | boolean>
  ): string;
}

// =============================================================================
// Export All Types
// =============================================================================

export type {
  Milliseconds as Ms,
  DeepPartial as PartialConfig,
  DeepReadonly as ReadonlyConfig,
};
