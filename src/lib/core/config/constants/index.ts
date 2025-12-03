/**
 * @fileoverview Centralized constants exports for the library configuration system.
 *
 * This module re-exports all constants from domain-specific modules,
 * providing a single import point for all library defaults.
 *
 * @module core/config/constants
 *
 * @example
 * ```typescript
 * import {
 *   DEFAULT_TIMEOUT,
 *   DEFAULT_CACHE_TTL,
 *   DEFAULT_DEBOUNCE,
 * } from '@/lib/core/config/constants';
 * ```
 */

// =============================================================================
// Timing Constants
// =============================================================================

export {
  // Time units
  SECOND,
  MINUTE,
  HOUR,

  // Configuration objects
  DEFAULT_NETWORK_CONFIG,
  DEFAULT_CACHE_CONFIG,
  DEFAULT_FLAGS_CONFIG,
  DEFAULT_AUTH_CONFIG,
  DEFAULT_LAYOUTS_CONFIG,
  DEFAULT_VDOM_CONFIG,
  DEFAULT_UI_CONFIG,
  DEFAULT_MONITORING_CONFIG,

  // Network timeouts
  DEFAULT_TIMEOUT,
  DEFAULT_LONG_TIMEOUT,
  DEFAULT_SHORT_TIMEOUT,
  DEFAULT_HEALTH_CHECK_TIMEOUT,
  DEFAULT_REMOTE_TIMEOUT,

  // Retry configuration
  DEFAULT_RETRY_BASE_DELAY,
  DEFAULT_RETRY_MAX_DELAY,
  DEFAULT_MAX_RETRY_ATTEMPTS,

  // Cache TTLs
  DEFAULT_CACHE_TTL,
  DEFAULT_SHORT_CACHE_TTL,
  DEFAULT_LONG_CACHE_TTL,

  // Feature flags
  DEFAULT_POLLING_INTERVAL,
  DEFAULT_PING_INTERVAL,
  DEFAULT_FLAG_CACHE_TTL,
  DEFAULT_MAX_FAILURES,
  DEFAULT_JITTER,
  EVALUATION_TIMEOUT,

  // Authentication
  TOKEN_REFRESH_BUFFER,
  SESSION_TIMEOUT,
  SESSION_CHECK_INTERVAL,
  DEFAULT_TOKEN_LIFETIME,
  REFRESH_BUFFER_MS,

  // Layouts
  DEFAULT_BREAKPOINT,
  DEFAULT_GAP,
  DEFAULT_PADDING,
  DEFAULT_MIN_COLUMN_WIDTH,
  MAX_ENTRY_AGE_MS,
  SESSION_WINDOW_GAP_MS,
  MAX_SESSION_WINDOW_MS,

  // UI
  DEFAULT_DEBOUNCE,
  DEFAULT_SCROLL_THROTTLE,
  DEFAULT_THROTTLE_MS,

  // VDOM
  DEFAULT_POOL_SIZE,
  DEFAULT_GC_INTERVAL,
  DEFAULT_MEMORY_LIMIT,
  DEFAULT_BATCH_SIZE,

  // Monitoring
  DEFAULT_METRICS_FLUSH_INTERVAL,
  DEFAULT_SLOW_REQUEST_THRESHOLD,
  DEFAULT_BUCKETS,
} from './timing.constants';

// =============================================================================
// String Constants
// =============================================================================

/**
 * Default storage keys used across the library.
 */
export const STORAGE_KEYS = {
  FEATURE_FLAGS: 'feature-flags',
  FLAG_SEGMENTS: 'feature-flag-segments',
  AUTH_ACCESS_TOKEN: 'auth_access_token',
  AUTH_REFRESH_TOKEN: 'auth_refresh_token',
  AUTH_TOKEN_EXPIRY: 'auth_token_expiry',
  CONFIG_OVERRIDES: 'lib_config_overrides',
  ENDPOINT_HEALTH: 'endpoint_health_cache',
} as const;

/**
 * Default header names used by the library.
 */
export const HEADER_NAMES = {
  API_VERSION: 'X-API-Version',
  REQUEST_ID: 'X-Request-ID',
  CORRELATION_ID: 'X-Correlation-ID',
  IDEMPOTENCY_KEY: 'X-Idempotency-Key',
  CONTENT_TYPE: 'Content-Type',
  ACCEPT: 'Accept',
  AUTHORIZATION: 'Authorization',
} as const;

/**
 * Default query parameter names.
 */
export const QUERY_PARAMS = {
  API_VERSION: 'api-version',
  PAGE: 'page',
  PAGE_SIZE: 'pageSize',
  SORT: 'sort',
  ORDER: 'order',
  SEARCH: 'search',
} as const;

/**
 * Default content types.
 */
export const CONTENT_TYPES = {
  JSON: 'application/json',
  FORM_URLENCODED: 'application/x-www-form-urlencoded',
  MULTIPART_FORM: 'multipart/form-data',
  TEXT_PLAIN: 'text/plain',
  ACCEPT_PREFIX: 'application/vnd.api',
} as const;

/**
 * Default environment variable prefix.
 */
export const DEFAULT_ENV_PREFIX = 'APP_';

/**
 * Default portal root ID.
 */
export const DEFAULT_PORTAL_ROOT_ID = 'portal-root';

/**
 * Default slot name for routing.
 */
export const DEFAULT_SLOT_NAME = 'children';

/**
 * Microsoft Graph API constants.
 */
export const GRAPH_API = {
  BASE_URL: 'https://graph.microsoft.com',
  DEFAULT_VERSION: 'v1.0',
} as const;

/**
 * Azure AD constants.
 */
export const AZURE_AD = {
  LOGIN_URL: 'https://login.microsoftonline.com',
  COMMON_TENANT: 'common',
} as const;

// =============================================================================
// Numeric Constants
// =============================================================================

/**
 * Default pagination values.
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100] as const,
} as const;

/**
 * Default rate limiting values.
 */
export const RATE_LIMITS = {
  API_REQUESTS_PER_MINUTE: 60,
  SEARCH_REQUESTS_PER_SECOND: 2,
  UPLOADS_PER_MINUTE: 10,
} as const;

/**
 * Default edge thresholds for scroll detection.
 */
export const SCROLL_THRESHOLDS = {
  EDGE: 5,
  NEAR_TOP: 50,
  NEAR_BOTTOM: 50,
} as const;

/**
 * Viewport intersection default thresholds.
 */
export const INTERSECTION_THRESHOLDS = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1] as const;

/**
 * File size limits.
 */
export const SIZE_LIMITS = {
  MAX_UPLOAD_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_CACHE_SIZE: 50 * 1024 * 1024, // 50MB
} as const;
