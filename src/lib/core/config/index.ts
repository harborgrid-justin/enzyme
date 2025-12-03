/**
 * @fileoverview Centralized Configuration System for the React Library Module.
 *
 * This module provides a PhD-level, enterprise-grade configuration management
 * system for the library, featuring:
 *
 * - **Single Source of Truth**: All library configuration centralized
 * - **Type Safety**: Full TypeScript support with comprehensive types
 * - **Runtime Updates**: Hot configuration changes without restarts
 * - **REST API Registry**: Dynamic endpoint discovery and health tracking
 * - **Environment Awareness**: Automatic per-environment defaults
 * - **React Integration**: Hooks for easy component integration
 * - **App Config Bridge**: Integration with application-level @/config
 *
 * @module core/config
 *
 * @example Basic Usage
 * ```typescript
 * import {
 *   LIB_CONFIG,
 *   getLibConfigValue,
 *   setLibConfigValue,
 *   DEFAULT_TIMEOUT,
 * } from '@/lib/core/config';
 *
 * // Access configuration
 * const timeout = LIB_CONFIG.network.defaultTimeout;
 *
 * // Or by path
 * const cacheTTL = getLibConfigValue('cache.defaultTTL');
 *
 * // Set at runtime
 * setLibConfigValue('network.defaultTimeout', 60000);
 * ```
 *
 * @example React Integration
 * ```tsx
 * import {
 *   useLibConfig,
 *   useLibConfigValue,
 *   useEndpoint,
 *   useEndpointUrl,
 * } from '@/lib/core/config';
 *
 * function MyComponent() {
 *   const config = useLibConfig();
 *   const timeout = useLibConfigValue('network.defaultTimeout', 30000);
 *
 *   return <div>Timeout: {timeout}ms</div>;
 * }
 *
 * function ApiComponent() {
 *   const endpoint = useEndpoint('users.list');
 *   const url = useEndpointUrl('users.detail', { id: '123' });
 *
 *   return <a href={url}>{endpoint?.description}</a>;
 * }
 * ```
 *
 * @example Endpoint Registry
 * ```typescript
 * import {
 *   registerEndpoint,
 *   getEndpoint,
 *   buildEndpointUrl,
 *   getEndpointRegistry,
 * } from '@/lib/core/config';
 *
 * // Register an endpoint
 * registerEndpoint({
 *   name: 'users.list',
 *   path: '/users',
 *   method: 'GET',
 *   auth: true,
 *   cache: { strategy: 'cache-first', ttl: 300000 },
 * });
 *
 * // Build URL with params
 * const url = buildEndpointUrl('users.detail', { id: '123' });
 * ```
 *
 * @example App Config Integration
 * ```typescript
 * import { env, TIMING, API_CONFIG } from '@/config';
 * import { initLibConfigFromApp } from '@/lib/core/config';
 *
 * // Initialize library config from app config
 * initLibConfigFromApp({ env, TIMING, API_CONFIG });
 * ```
 */

// =============================================================================
// Types
// =============================================================================

export type {
  // Primitives
  Milliseconds,
  Seconds,
  Pixels,
  Percentage,
  HttpMethod,
  ConfigSource,
  Environment,

  // Configuration interfaces
  NetworkConfig,
  CacheConfig,
  FeatureFlagsConfig,
  AuthConfig,
  LayoutsConfig,
  VDOMConfig,
  UIConfig,
  MonitoringConfig,
  LibraryConfig,

  // Endpoint types
  CacheStrategy,
  EndpointCacheConfig,
  EndpointRateLimit,
  EndpointHealthStatus,
  EndpointHealth,
  EndpointDefinition,
  EndpointEventType,
  EndpointChangeEvent,
  EndpointChangeListener,

  // Runtime types
  ConfigChangeEvent,
  ConfigChangeListener,
  RuntimeConfigOptions,

  // Utility types
  DeepPartial,
  DeepReadonly,
  ConfigPath,
  ConfigAccessResult,
  Unsubscribe,

  // Interface types
  IConfigRegistry,
  IEndpointRegistry,
} from './types';

// =============================================================================
// Constants
// =============================================================================

export {
  // Time units
  SECOND,
  MINUTE,
  HOUR,

  // Configuration defaults
  DEFAULT_NETWORK_CONFIG,
  DEFAULT_CACHE_CONFIG,
  DEFAULT_FLAGS_CONFIG,
  DEFAULT_AUTH_CONFIG,
  DEFAULT_LAYOUTS_CONFIG,
  DEFAULT_VDOM_CONFIG,
  DEFAULT_UI_CONFIG,
  DEFAULT_MONITORING_CONFIG,

  // Individual constants (for backward compatibility)
  DEFAULT_TIMEOUT,
  DEFAULT_LONG_TIMEOUT,
  DEFAULT_SHORT_TIMEOUT,
  DEFAULT_HEALTH_CHECK_TIMEOUT,
  DEFAULT_REMOTE_TIMEOUT,
  DEFAULT_RETRY_BASE_DELAY,
  DEFAULT_RETRY_MAX_DELAY,
  DEFAULT_MAX_RETRY_ATTEMPTS,
  DEFAULT_CACHE_TTL,
  DEFAULT_SHORT_CACHE_TTL,
  DEFAULT_LONG_CACHE_TTL,
  DEFAULT_POLLING_INTERVAL,
  DEFAULT_PING_INTERVAL,
  DEFAULT_FLAG_CACHE_TTL,
  DEFAULT_MAX_FAILURES,
  DEFAULT_JITTER,
  EVALUATION_TIMEOUT,
  TOKEN_REFRESH_BUFFER,
  SESSION_TIMEOUT,
  SESSION_CHECK_INTERVAL,
  DEFAULT_TOKEN_LIFETIME,
  REFRESH_BUFFER_MS,
  DEFAULT_BREAKPOINT,
  DEFAULT_GAP,
  DEFAULT_PADDING,
  DEFAULT_MIN_COLUMN_WIDTH,
  MAX_ENTRY_AGE_MS,
  SESSION_WINDOW_GAP_MS,
  MAX_SESSION_WINDOW_MS,
  DEFAULT_DEBOUNCE,
  DEFAULT_SCROLL_THROTTLE,
  DEFAULT_THROTTLE_MS,
  DEFAULT_POOL_SIZE,
  DEFAULT_GC_INTERVAL,
  DEFAULT_MEMORY_LIMIT,
  DEFAULT_BATCH_SIZE,
  DEFAULT_METRICS_FLUSH_INTERVAL,
  DEFAULT_SLOW_REQUEST_THRESHOLD,
  DEFAULT_BUCKETS,

  // String constants
  STORAGE_KEYS,
  HEADER_NAMES,
  QUERY_PARAMS,
  CONTENT_TYPES,
  DEFAULT_ENV_PREFIX,
  DEFAULT_PORTAL_ROOT_ID,
  DEFAULT_SLOT_NAME,
  GRAPH_API,
  AZURE_AD,

  // Numeric constants
  PAGINATION,
  RATE_LIMITS,
  SCROLL_THRESHOLDS,
  INTERSECTION_THRESHOLDS,
  SIZE_LIMITS,
} from './constants';

// =============================================================================
// Registry
// =============================================================================

export {
  // Config Registry
  ConfigRegistry,
  getConfigRegistry,
  getLibConfig,
  getLibConfigValue,
  setLibConfigValue,
  subscribeToLibConfig,
  LIB_CONFIG,

  // Endpoint Registry
  EndpointRegistry,
  getEndpointRegistry,
  registerEndpoint,
  getEndpoint,
  buildEndpointUrl,
  isEndpointHealthy,
} from './registry';

// =============================================================================
// Runtime
// =============================================================================

export {
  RuntimeConfigManager,
  getRuntimeConfigManager,
  setRuntimeConfig,
  applyRuntimeOverlay,
  rollbackConfig,
  startConfigPolling,
  stopConfigPolling,
} from './runtime';

// =============================================================================
// Integration
// =============================================================================

export { AppConfigBridge, getAppConfigBridge, initLibConfigFromApp } from './integration';

// =============================================================================
// React Hooks
// =============================================================================

export {
  // Configuration hooks
  useLibConfig,
  useNetworkConfig,
  useCacheConfig,
  useFlagsConfig,
  useAuthConfig,
  useLayoutsConfig,
  useVDOMConfig,
  useUIConfig,
  useMonitoringConfig,
  useLibConfigValue,
  useLibConfigState,
  useRuntimeConfig,
  useConfigChangeTracking,
  useLastConfigChange,
  useLibConfigSelector,
  useLibConfigExists,
  useLibConfigPaths,
  useLibConfigEnvironment,

  // Endpoint hooks
  useEndpoint,
  useAllEndpoints,
  useEndpointsByTag,
  useEndpointUrl,
  useEndpointUrlBuilder,
  useEndpointHealth,
  useIsEndpointHealthy,
  useUnhealthyEndpoints,
  useDegradedEndpoints,
  useEndpointStats,
  useEndpointChangeTracking,
  useLastEndpointChange,
  useRegisterEndpoint,
  useEndpointRegistry,
} from './hooks';

// =============================================================================
// Convenience Re-exports for Common Patterns
// =============================================================================

/**
 * Quick access to network timeout (most commonly used).
 */
export { DEFAULT_TIMEOUT as TIMEOUT } from './constants';

/**
 * Quick access to cache TTL (commonly used).
 */
export { DEFAULT_CACHE_TTL as CACHE_TTL } from './constants';

/**
 * Quick access to debounce delay (commonly used).
 */
export { DEFAULT_DEBOUNCE as DEBOUNCE } from './constants';
