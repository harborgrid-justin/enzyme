/**
 * @file Timing Constants
 * @description Centralized timing values to eliminate magic numbers.
 *
 * This module consolidates all timing-related constants used across the application:
 * - Query stale times and garbage collection times
 * - API request timeouts
 * - Authentication timing (token refresh, session timeout)
 * - UI timing (debounce, animations, toasts)
 * - Background task intervals
 *
 * USAGE:
 * ```typescript
 * import { TIMING } from '@/config';
 *
 * // Use in queries
 * staleTime: TIMING.QUERY.STALE.MEDIUM,
 *
 * // Use in debounce
 * useDebouncedValue(value, TIMING.UI.DEBOUNCE.INPUT);
 *
 * // Use in API calls
 * timeout: TIMING.API.TIMEOUT,
 * ```
 */

// =============================================================================
// Time Unit Helpers (for readability)
// =============================================================================

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

// =============================================================================
// Query Timing
// =============================================================================

/**
 * React Query stale time configurations
 *
 * Stale time determines how long data is considered "fresh" before
 * React Query will refetch it in the background.
 */
export const QUERY_STALE_TIMES = {
  /** Real-time data (30 seconds) - live dashboards, active sessions */
  REALTIME: 30 * SECOND,

  /** Frequently changing data (1 minute) - activity feeds, notifications */
  SHORT: MINUTE,

  /** Standard data (5 minutes) - lists, user data */
  MEDIUM: 5 * MINUTE,

  /** Slowly changing data (10 minutes) - reports, analytics */
  LONG: 10 * MINUTE,

  /** Reference data (30 minutes) - config, static lookups */
  EXTENDED: 30 * MINUTE,

  /** Static data (1 hour) - rarely changes */
  STATIC: HOUR,
} as const;

/**
 * React Query garbage collection times
 *
 * GC time determines how long unused data is kept in cache before
 * being garbage collected.
 */
export const QUERY_GC_TIMES = {
  /** Quick cleanup (5 minutes) */
  SHORT: 5 * MINUTE,

  /** Standard cleanup (30 minutes) */
  MEDIUM: 30 * MINUTE,

  /** Extended cache (1 hour) */
  LONG: HOUR,
} as const;

// =============================================================================
// API Timing
// =============================================================================

/**
 * API request configuration
 */
export const API_TIMING = {
  /** Default request timeout (30 seconds) */
  TIMEOUT: 30 * SECOND,

  /** Long-running request timeout (2 minutes) - file uploads, reports */
  TIMEOUT_LONG: 2 * MINUTE,

  /** Short timeout for quick endpoints (10 seconds) */
  TIMEOUT_SHORT: 10 * SECOND,

  /** Very short timeout for health checks (5 seconds) */
  TIMEOUT_HEALTH: 5 * SECOND,

  /** Retry delays (exponential backoff base) */
  RETRY_BASE_DELAY: SECOND,

  /** Maximum retry delay */
  RETRY_MAX_DELAY: 30 * SECOND,
} as const;

// =============================================================================
// Authentication Timing
// =============================================================================

/**
 * Authentication-related timing
 */
export const AUTH_TIMING = {
  /** Token refresh buffer (refresh 5 min before expiry) */
  TOKEN_EXPIRY_BUFFER: 5 * MINUTE,

  /** Session timeout (30 min inactivity) */
  SESSION_TIMEOUT: 30 * MINUTE,

  /** Account lockout duration after failed attempts */
  LOCKOUT_DURATION: 15 * MINUTE,

  /** Token refresh interval */
  REFRESH_INTERVAL: 5 * MINUTE,

  /** Redirect delay after logout */
  LOGOUT_REDIRECT_DELAY: 1500,

  /** Token validation check interval */
  TOKEN_CHECK_INTERVAL: MINUTE,
} as const;

// =============================================================================
// UI Timing
// =============================================================================

/**
 * UI interaction timing
 */
export const UI_TIMING = {
  /** Debounce configurations */
  DEBOUNCE: {
    /** Fast debounce (100ms) - immediate feedback */
    FAST: 100,

    /** Input debounce (300ms) - search, filters */
    INPUT: 300,

    /** Form debounce (500ms) - form validation */
    FORM: 500,

    /** Resize debounce (150ms) - window resize */
    RESIZE: 150,

    /** Scroll debounce (100ms) - scroll handlers */
    SCROLL: 100,
  },

  /** Throttle configurations */
  THROTTLE: {
    /** Fast throttle (100ms) */
    FAST: 100,

    /** Standard throttle (200ms) */
    STANDARD: 200,

    /** Scroll throttle (16ms - ~60fps) */
    SCROLL: 16,
  },

  /** Animation durations */
  ANIMATION: {
    /** Instant (0ms) - no animation */
    INSTANT: 0,

    /** Fast animations (100ms) */
    FAST: 100,

    /** Standard animations (200ms) */
    STANDARD: 200,

    /** Slow animations (300ms) */
    SLOW: 300,

    /** Page transitions (400ms) */
    PAGE: 400,

    /** Modal transitions (250ms) */
    MODAL: 250,
  },

  /** Toast/notification durations */
  TOAST: {
    /** Short toast (3 seconds) */
    SHORT: 3 * SECOND,

    /** Standard toast (5 seconds) */
    STANDARD: 5 * SECOND,

    /** Long toast (8 seconds) */
    LONG: 8 * SECOND,

    /** Error toast (10 seconds) - more time to read */
    ERROR: 10 * SECOND,

    /** Persistent (0 = manual dismiss) */
    PERSISTENT: 0,
  },

  /** Loading state delays */
  LOADING: {
    /** Delay before showing spinner (prevents flash) */
    SPINNER_DELAY: 200,

    /** Minimum loading display time */
    MIN_DISPLAY: 500,

    /** Skeleton placeholder delay */
    SKELETON_DELAY: 100,
  },

  /** Focus management */
  FOCUS: {
    /** Delay for focus trap initialization */
    TRAP_DELAY: 50,

    /** Delay for auto-focus */
    AUTO_DELAY: 100,
  },
} as const;

// =============================================================================
// Polling & Background Tasks
// =============================================================================

/**
 * Background task timing
 */
export const BACKGROUND_TIMING = {
  /** Polling intervals */
  POLL: {
    /** Fast polling (10 seconds) - real-time updates */
    FAST: 10 * SECOND,

    /** Standard polling (30 seconds) */
    STANDARD: 30 * SECOND,

    /** Slow polling (1 minute) */
    SLOW: MINUTE,

    /** Very slow polling (5 minutes) */
    VERY_SLOW: 5 * MINUTE,
  },

  /** Auto-save interval */
  AUTOSAVE: 30 * SECOND,

  /** Heartbeat interval for connection keep-alive */
  HEARTBEAT: 30 * SECOND,

  /** Performance metrics flush interval */
  METRICS_FLUSH: 30 * SECOND,

  /** Cache cleanup interval */
  CACHE_CLEANUP: 5 * MINUTE,

  /** WebSocket ping interval */
  WS_PING: 25 * SECOND,

  /** SSE reconnection delay */
  SSE_RECONNECT: 5 * SECOND,
} as const;

// =============================================================================
// Retry Configuration
// =============================================================================

/**
 * Retry attempt configurations
 */
export const RETRY_CONFIG = {
  /** Default retry attempts */
  DEFAULT_ATTEMPTS: 3,

  /** API retry attempts */
  API_ATTEMPTS: 3,

  /** Auth refresh retry attempts */
  AUTH_ATTEMPTS: 2,

  /** File upload retry attempts */
  UPLOAD_ATTEMPTS: 2,

  /** WebSocket reconnection attempts */
  WEBSOCKET_ATTEMPTS: 5,

  /** SSE reconnection attempts */
  SSE_ATTEMPTS: 10,

  /** Mutation retry attempts */
  MUTATION_ATTEMPTS: 1,
} as const;

// =============================================================================
// Rate Limiting
// =============================================================================

/**
 * Rate limiting configurations
 */
export const RATE_LIMIT = {
  /** Maximum requests per minute for API calls */
  API_REQUESTS_PER_MINUTE: 60,

  /** Maximum search requests per second */
  SEARCH_REQUESTS_PER_SECOND: 2,

  /** Maximum file uploads per minute */
  UPLOADS_PER_MINUTE: 10,

  /** Cool-down after rate limit hit */
  COOLDOWN: 60 * SECOND,
} as const;

// =============================================================================
// Aggregated Export
// =============================================================================

/**
 * All timing constants aggregated for convenient access
 *
 * @example
 * ```typescript
 * import { TIMING } from '@/config';
 *
 * // Query timing
 * const staleTime = TIMING.QUERY.STALE.MEDIUM;
 *
 * // API timing
 * const timeout = TIMING.API.TIMEOUT;
 *
 * // UI timing
 * const debounce = TIMING.UI.DEBOUNCE.INPUT;
 * ```
 */
export const TIMING = {
  QUERY: {
    STALE: QUERY_STALE_TIMES,
    GC: QUERY_GC_TIMES,
  },
  API: API_TIMING,
  AUTH: AUTH_TIMING,
  UI: UI_TIMING,
  BACKGROUND: BACKGROUND_TIMING,
  RETRY: RETRY_CONFIG,
  RATE_LIMIT,
} as const;

// =============================================================================
// Type Exports
// =============================================================================

export type QueryStaleTime = (typeof QUERY_STALE_TIMES)[keyof typeof QUERY_STALE_TIMES];
export type QueryGcTime = (typeof QUERY_GC_TIMES)[keyof typeof QUERY_GC_TIMES];
export type ApiTimeout = (typeof API_TIMING)[keyof typeof API_TIMING];
export type ToastDuration = (typeof UI_TIMING.TOAST)[keyof typeof UI_TIMING.TOAST];
export type DebounceDuration = (typeof UI_TIMING.DEBOUNCE)[keyof typeof UI_TIMING.DEBOUNCE];
export type AnimationDuration = (typeof UI_TIMING.ANIMATION)[keyof typeof UI_TIMING.ANIMATION];
export type PollingInterval = (typeof BACKGROUND_TIMING.POLL)[keyof typeof BACKGROUND_TIMING.POLL];
export type RetryAttempts = (typeof RETRY_CONFIG)[keyof typeof RETRY_CONFIG];

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Convert milliseconds to a human-readable duration string
 *
 * @example
 * ```typescript
 * formatDuration(TIMING.QUERY.STALE.MEDIUM); // "5 minutes"
 * formatDuration(TIMING.API.TIMEOUT); // "30 seconds"
 * ```
 */
export function formatDuration(ms: number): string {
  if (ms === 0) return 'instant';
  if (ms < SECOND) return `${ms}ms`;
  if (ms < MINUTE) return `${ms / SECOND} seconds`;
  if (ms < HOUR) return `${ms / MINUTE} minutes`;
  return `${ms / HOUR} hours`;
}

/**
 * Calculate exponential backoff delay
 *
 * @param attempt - Current attempt number (0-indexed)
 * @param baseDelay - Base delay in ms (default: API_TIMING.RETRY_BASE_DELAY)
 * @param maxDelay - Maximum delay in ms (default: API_TIMING.RETRY_MAX_DELAY)
 * @returns Delay in milliseconds
 *
 * @example
 * ```typescript
 * calculateBackoff(0); // 1000ms
 * calculateBackoff(1); // 2000ms
 * calculateBackoff(2); // 4000ms
 * calculateBackoff(3); // 8000ms
 * calculateBackoff(4); // 16000ms
 * calculateBackoff(5); // 30000ms (capped at max)
 * ```
 */
export function calculateBackoff(
  attempt: number,
  baseDelay: number = API_TIMING.RETRY_BASE_DELAY,
  maxDelay: number = API_TIMING.RETRY_MAX_DELAY
): number {
  const delay = baseDelay * Math.pow(2, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * Calculate exponential backoff with jitter
 *
 * Adds random jitter to prevent thundering herd problem
 *
 * @param attempt - Current attempt number (0-indexed)
 * @param baseDelay - Base delay in ms
 * @param maxDelay - Maximum delay in ms
 * @returns Delay in milliseconds with jitter applied
 */
export function calculateBackoffWithJitter(
  attempt: number,
  baseDelay: number = API_TIMING.RETRY_BASE_DELAY,
  maxDelay: number = API_TIMING.RETRY_MAX_DELAY
): number {
  const backoff = calculateBackoff(attempt, baseDelay, maxDelay);
  // Add up to 25% random jitter
  const jitter = backoff * 0.25 * Math.random();
  return Math.floor(backoff + jitter);
}
