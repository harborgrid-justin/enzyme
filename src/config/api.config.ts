/**
 * @file API Configuration
 * @description Centralized API endpoints, configuration, and query keys.
 *
 * This module consolidates:
 * - API endpoint definitions
 * - Request configuration (timeouts, retries)
 * - React Query key factories
 *
 * USAGE:
 * ```typescript
 * import { API_CONFIG, QUERY_KEYS, API_ENDPOINTS } from '@/config';
 *
 * // Use endpoints
 * const url = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.USERS.BASE}`;
 *
 * // Use query keys
 * useQuery({
 *   queryKey: QUERY_KEYS.USERS.LIST({ page: 1 }),
 *   // ...
 * });
 * ```
 */

import { env } from './env';
import { API_TIMING, RETRY_CONFIG } from './timing.constants';

// =============================================================================
// API Endpoints
// =============================================================================

/**
 * API endpoint definitions with full type safety
 *
 * Organized by domain for easy discovery and maintenance.
 */
export const API_ENDPOINTS = {
  // ---------------------------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------------------------
  AUTH: {
    /** User login */
    LOGIN: '/auth/login',
    /** User logout */
    LOGOUT: '/auth/logout',
    /** User registration */
    REGISTER: '/auth/register',
    /** Token refresh */
    REFRESH: '/auth/refresh',
    /** Session validation */
    SESSION: '/auth/session',
    /** Current user info */
    ME: '/auth/me',
    /** Email verification */
    VERIFY_EMAIL: '/auth/verify-email',
    /** Resend verification email */
    RESEND_VERIFICATION: '/auth/resend-verification',
    /** Request password reset */
    FORGOT_PASSWORD: '/auth/forgot-password',
    /** Reset password with token */
    RESET_PASSWORD: '/auth/reset-password',
    /** MFA endpoints */
    MFA: {
      /** Setup MFA */
      SETUP: '/auth/mfa/setup',
      /** Enable MFA */
      ENABLE: '/auth/mfa/enable',
      /** Disable MFA */
      DISABLE: '/auth/mfa/disable',
      /** Verify MFA code */
      VERIFY: '/auth/mfa/verify',
    },
  },

  // ---------------------------------------------------------------------------
  // Users
  // ---------------------------------------------------------------------------
  USERS: {
    /** Users list (GET) / Create user (POST) */
    BASE: '/users',
    /** Single user by ID */
    DETAIL: (id: string) => `/users/${id}` as const,
    /** Current user profile */
    PROFILE: '/users/profile',
    /** User avatar upload */
    AVATAR: (id: string) => `/users/${id}/avatar` as const,
    /** User permissions */
    PERMISSIONS: (id: string) => `/users/${id}/permissions` as const,
  },

  // ---------------------------------------------------------------------------
  // Reports
  // ---------------------------------------------------------------------------
  REPORTS: {
    /** Reports list (GET) / Create report (POST) */
    BASE: '/reports',
    /** Single report by ID */
    DETAIL: (id: string) => `/reports/${id}` as const,
    /** Generate a new report */
    GENERATE: '/reports/generate',
    /** Export report */
    EXPORT: (id: string) => `/reports/${id}/export` as const,
    /** Report summary/stats */
    SUMMARY: '/reports/summary',
    /** Report templates */
    TEMPLATES: '/reports/templates',
  },

  // ---------------------------------------------------------------------------
  // Dashboard / Analytics
  // ---------------------------------------------------------------------------
  ANALYTICS: {
    /** Dashboard overview stats */
    DASHBOARD: '/analytics/dashboard',
    /** Detailed metrics */
    METRICS: '/analytics/metrics',
    /** Activity feed */
    ACTIVITY: '/analytics/activity',
    /** Charts data */
    CHARTS: '/analytics/charts',
    /** Events tracking */
    EVENTS: '/analytics/events',
  },

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------
  SETTINGS: {
    /** General settings */
    GENERAL: '/settings/general',
    /** Notification preferences */
    NOTIFICATIONS: '/settings/notifications',
    /** Security settings */
    SECURITY: '/settings/security',
    /** API keys */
    API_KEYS: '/settings/api-keys',
  },

  // ---------------------------------------------------------------------------
  // Admin
  // ---------------------------------------------------------------------------
  ADMIN: {
    /** System overview */
    OVERVIEW: '/admin/overview',
    /** User management */
    USERS: '/admin/users',
    /** Role management */
    ROLES: '/admin/roles',
    /** System logs */
    LOGS: '/admin/logs',
    /** System configuration */
    CONFIG: '/admin/config',
  },

  // ---------------------------------------------------------------------------
  // Entities (Generic CRUD)
  // ---------------------------------------------------------------------------
  ENTITIES: {
    /** Entities list */
    BASE: '/entities',
    /** Single entity by ID */
    DETAIL: (id: string) => `/entities/${id}` as const,
  },

  // ---------------------------------------------------------------------------
  // File Uploads
  // ---------------------------------------------------------------------------
  FILES: {
    /** Upload file */
    UPLOAD: '/files/upload',
    /** Download file */
    DOWNLOAD: (id: string) => `/files/${id}` as const,
    /** Delete file */
    DELETE: (id: string) => `/files/${id}` as const,
  },

  // ---------------------------------------------------------------------------
  // Health & System
  // ---------------------------------------------------------------------------
  HEALTH: {
    /** Health check */
    CHECK: '/health',
    /** Readiness check */
    READY: '/health/ready',
    /** Liveness check */
    LIVE: '/health/live',
  },
} as const;

// =============================================================================
// API Configuration Object
// =============================================================================

/**
 * Complete API configuration
 */
export const API_CONFIG = {
  /** Base URL for all API requests */
  BASE_URL: env.apiBaseUrl,

  /** Request timeout settings */
  TIMEOUT: {
    /** Default timeout (30s) */
    DEFAULT: API_TIMING.TIMEOUT,
    /** Long timeout for uploads/reports (2min) */
    LONG: API_TIMING.TIMEOUT_LONG,
    /** Short timeout for quick endpoints (10s) */
    SHORT: API_TIMING.TIMEOUT_SHORT,
    /** Health check timeout (5s) */
    HEALTH: API_TIMING.TIMEOUT_HEALTH,
  },

  /** Retry configuration */
  RETRY: {
    /** Number of retry attempts */
    ATTEMPTS: RETRY_CONFIG.API_ATTEMPTS,
    /** Base delay for exponential backoff */
    BASE_DELAY: API_TIMING.RETRY_BASE_DELAY,
    /** Maximum delay between retries */
    MAX_DELAY: API_TIMING.RETRY_MAX_DELAY,
  },

  /** All endpoints */
  ENDPOINTS: API_ENDPOINTS,

  /** Default request headers */
  HEADERS: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  } as const,

  /** Pagination defaults */
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
    PAGE_SIZE_OPTIONS: [10, 20, 50, 100] as const,
  },
} as const;

// =============================================================================
// Query Keys Factory
// =============================================================================

/**
 * React Query key factory for consistent cache key generation
 *
 * Using a factory pattern ensures:
 * 1. Type-safe query key generation
 * 2. Consistent key structure across the app
 * 3. Easy invalidation with partial matching
 *
 * @example
 * ```typescript
 * // In a query
 * useQuery({
 *   queryKey: QUERY_KEYS.USERS.DETAIL('123'),
 *   // ...
 * });
 *
 * // Invalidating
 * queryClient.invalidateQueries({
 *   queryKey: QUERY_KEYS.USERS.ALL
 * });
 * ```
 */
export const QUERY_KEYS = {
  // ---------------------------------------------------------------------------
  // Auth Keys
  // ---------------------------------------------------------------------------
  AUTH: {
    /** All auth-related queries */
    ALL: ['auth'] as const,
    /** Current session */
    SESSION: ['auth', 'session'] as const,
    /** Current user */
    USER: ['auth', 'user'] as const,
    /** MFA status */
    MFA: ['auth', 'mfa'] as const,
  },

  // ---------------------------------------------------------------------------
  // Users Keys
  // ---------------------------------------------------------------------------
  USERS: {
    /** All user-related queries */
    ALL: ['users'] as const,
    /** Users list with optional filters */
    LIST: (filters?: Record<string, unknown>) => ['users', 'list', filters] as const,
    /** Single user detail */
    DETAIL: (id: string) => ['users', 'detail', id] as const,
    /** Current user profile */
    PROFILE: () => ['users', 'profile'] as const,
    /** User permissions */
    PERMISSIONS: (id: string) => ['users', 'permissions', id] as const,
  },

  // ---------------------------------------------------------------------------
  // Reports Keys
  // ---------------------------------------------------------------------------
  REPORTS: {
    /** All report-related queries */
    ALL: ['reports'] as const,
    /** Reports list with optional filters */
    LIST: (filters?: Record<string, unknown>) => ['reports', 'list', filters] as const,
    /** Single report detail */
    DETAIL: (id: string) => ['reports', 'detail', id] as const,
    /** Report summary for a time range */
    SUMMARY: (range: string) => ['reports', 'summary', range] as const,
    /** Report templates */
    TEMPLATES: () => ['reports', 'templates'] as const,
  },

  // ---------------------------------------------------------------------------
  // Dashboard Keys
  // ---------------------------------------------------------------------------
  DASHBOARD: {
    /** All dashboard queries */
    ALL: ['dashboard'] as const,
    /** Dashboard statistics */
    STATS: () => ['dashboard', 'stats'] as const,
    /** Dashboard charts for a time range */
    CHARTS: (range: string) => ['dashboard', 'charts', range] as const,
    /** Activity feed with pagination */
    ACTIVITY: (page: number) => ['dashboard', 'activity', page] as const,
    /** Real-time metrics */
    METRICS: () => ['dashboard', 'metrics'] as const,
  },

  // ---------------------------------------------------------------------------
  // Analytics Keys
  // ---------------------------------------------------------------------------
  ANALYTICS: {
    /** All analytics queries */
    ALL: ['analytics'] as const,
    /** Analytics overview */
    OVERVIEW: (range: string) => ['analytics', 'overview', range] as const,
    /** Specific metric */
    METRIC: (metricId: string, range: string) =>
      ['analytics', 'metric', metricId, range] as const,
  },

  // ---------------------------------------------------------------------------
  // Settings Keys
  // ---------------------------------------------------------------------------
  SETTINGS: {
    /** All settings queries */
    ALL: ['settings'] as const,
    /** General settings */
    GENERAL: () => ['settings', 'general'] as const,
    /** Notification settings */
    NOTIFICATIONS: () => ['settings', 'notifications'] as const,
    /** Security settings */
    SECURITY: () => ['settings', 'security'] as const,
  },

  // ---------------------------------------------------------------------------
  // Entities Keys (Generic)
  // ---------------------------------------------------------------------------
  ENTITIES: {
    /** All entity queries */
    ALL: ['entities'] as const,
    /** Entity list with filters */
    LIST: (filters?: Record<string, unknown>) => ['entities', 'list', filters] as const,
    /** Single entity detail */
    DETAIL: (id: string) => ['entities', 'detail', id] as const,
    /** Infinite scroll list */
    INFINITE: (filters?: Record<string, unknown>) =>
      ['entities', 'infinite', filters] as const,
  },

  // ---------------------------------------------------------------------------
  // Admin Keys
  // ---------------------------------------------------------------------------
  ADMIN: {
    /** All admin queries */
    ALL: ['admin'] as const,
    /** System overview */
    OVERVIEW: () => ['admin', 'overview'] as const,
    /** Admin users list */
    USERS: (filters?: Record<string, unknown>) => ['admin', 'users', filters] as const,
    /** System logs */
    LOGS: (filters?: Record<string, unknown>) => ['admin', 'logs', filters] as const,
    /** Roles list */
    ROLES: () => ['admin', 'roles'] as const,
  },
} as const;

// =============================================================================
// Type Exports
// =============================================================================

/** Type for API endpoints object */
export type ApiEndpoints = typeof API_ENDPOINTS;

/** Type for API configuration object */
export type ApiConfig = typeof API_CONFIG;

/** Type for query key factory */
export type QueryKeyFactory = typeof QUERY_KEYS;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Build a full API URL from an endpoint
 *
 * @param endpoint - Relative endpoint path
 * @returns Full URL with base URL
 *
 * @example
 * ```typescript
 * buildApiUrl(API_ENDPOINTS.USERS.BASE)
 * // Returns: 'http://localhost:3001/api/users'
 *
 * buildApiUrl(API_ENDPOINTS.USERS.DETAIL('123'))
 * // Returns: 'http://localhost:3001/api/users/123'
 * ```
 */
export function buildApiUrl(endpoint: string): string {
  const baseUrl = API_CONFIG.BASE_URL.replace(/\/$/, '');
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${path}`;
}

/**
 * Build a full API URL with query parameters
 *
 * @param endpoint - Relative endpoint path
 * @param params - Query parameters
 * @returns Full URL with base URL and query string
 *
 * @example
 * ```typescript
 * buildApiUrlWithParams(API_ENDPOINTS.USERS.BASE, { page: 1, limit: 20 })
 * // Returns: 'http://localhost:3001/api/users?page=1&limit=20'
 * ```
 */
export function buildApiUrlWithParams(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  const url = buildApiUrl(endpoint);

  if (!params || Object.keys(params).length === 0) {
    return url;
  }

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `${url}?${queryString}` : url;
}

/**
 * Check if an HTTP status code indicates a retryable error
 *
 * @param status - HTTP status code
 * @returns True if the error should be retried
 */
export function isRetryableStatus(status: number): boolean {
  // Retry on timeout (408), rate limit (429), and server errors (5xx)
  // But NOT on other client errors (4xx)
  if (status === 408 || status === 429) {
    return true;
  }
  return status >= 500;
}

/**
 * Check if an error is a network error (no status code)
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.name === 'TypeError' ||
      error.message.includes('network') ||
      error.message.includes('fetch')
    );
  }
  return false;
}

// =============================================================================
// Endpoint Registry (Enhanced)
// =============================================================================

/**
 * HTTP method types
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Endpoint definition with full metadata
 */
export interface EndpointDefinition {
  /** HTTP method */
  method: HttpMethod;
  /** URL path (can include :param placeholders) */
  path: string;
  /** Endpoint description */
  description?: string;
  /** Whether authentication is required */
  auth: boolean;
  /** Request timeout override */
  timeout?: number;
  /** Cache configuration */
  cache?: {
    /** Cache strategy */
    strategy: 'no-cache' | 'cache-first' | 'network-first' | 'stale-while-revalidate';
    /** TTL in milliseconds */
    ttl: number;
  };
  /** Rate limiting configuration */
  rateLimit?: {
    /** Requests per window */
    requests: number;
    /** Window size in milliseconds */
    window: number;
  };
  /** Tags for categorization */
  tags?: string[];
}

/**
 * Typed endpoint registry for API contract definition
 *
 * This registry provides complete metadata about each endpoint,
 * enabling automatic client generation and documentation.
 *
 * @example
 * ```typescript
 * const userEndpoint = ENDPOINT_REGISTRY.users.getById;
 * console.log(userEndpoint.method); // 'GET'
 * console.log(userEndpoint.auth); // true
 * ```
 */
export const ENDPOINT_REGISTRY = {
  // ---------------------------------------------------------------------------
  // Authentication Endpoints
  // ---------------------------------------------------------------------------
  auth: {
    login: {
      method: 'POST' as const,
      path: API_ENDPOINTS.AUTH.LOGIN,
      description: 'Authenticate user with credentials',
      auth: false,
      cache: { strategy: 'no-cache' as const, ttl: 0 },
      tags: ['auth', 'public'],
    },
    logout: {
      method: 'POST' as const,
      path: API_ENDPOINTS.AUTH.LOGOUT,
      description: 'End user session',
      auth: true,
      cache: { strategy: 'no-cache' as const, ttl: 0 },
      tags: ['auth'],
    },
    register: {
      method: 'POST' as const,
      path: API_ENDPOINTS.AUTH.REGISTER,
      description: 'Register new user account',
      auth: false,
      cache: { strategy: 'no-cache' as const, ttl: 0 },
      tags: ['auth', 'public'],
    },
    refresh: {
      method: 'POST' as const,
      path: API_ENDPOINTS.AUTH.REFRESH,
      description: 'Refresh authentication tokens',
      auth: false,
      cache: { strategy: 'no-cache' as const, ttl: 0 },
      tags: ['auth'],
    },
    session: {
      method: 'GET' as const,
      path: API_ENDPOINTS.AUTH.SESSION,
      description: 'Get current session status',
      auth: true,
      cache: { strategy: 'network-first' as const, ttl: 60000 },
      tags: ['auth'],
    },
    me: {
      method: 'GET' as const,
      path: API_ENDPOINTS.AUTH.ME,
      description: 'Get current user info',
      auth: true,
      cache: { strategy: 'cache-first' as const, ttl: 300000 },
      tags: ['auth', 'user'],
    },
  },

  // ---------------------------------------------------------------------------
  // User Endpoints
  // ---------------------------------------------------------------------------
  users: {
    list: {
      method: 'GET' as const,
      path: API_ENDPOINTS.USERS.BASE,
      description: 'List all users with pagination',
      auth: true,
      cache: { strategy: 'stale-while-revalidate' as const, ttl: 60000 },
      tags: ['users'],
    },
    getById: {
      method: 'GET' as const,
      path: '/users/:id',
      description: 'Get user by ID',
      auth: true,
      cache: { strategy: 'cache-first' as const, ttl: 300000 },
      tags: ['users'],
    },
    create: {
      method: 'POST' as const,
      path: API_ENDPOINTS.USERS.BASE,
      description: 'Create new user',
      auth: true,
      cache: { strategy: 'no-cache' as const, ttl: 0 },
      tags: ['users', 'mutation'],
    },
    update: {
      method: 'PATCH' as const,
      path: '/users/:id',
      description: 'Update user by ID',
      auth: true,
      cache: { strategy: 'no-cache' as const, ttl: 0 },
      tags: ['users', 'mutation'],
    },
    delete: {
      method: 'DELETE' as const,
      path: '/users/:id',
      description: 'Delete user by ID',
      auth: true,
      cache: { strategy: 'no-cache' as const, ttl: 0 },
      tags: ['users', 'mutation'],
    },
    profile: {
      method: 'GET' as const,
      path: API_ENDPOINTS.USERS.PROFILE,
      description: 'Get current user profile',
      auth: true,
      cache: { strategy: 'cache-first' as const, ttl: 300000 },
      tags: ['users', 'profile'],
    },
  },

  // ---------------------------------------------------------------------------
  // Report Endpoints
  // ---------------------------------------------------------------------------
  reports: {
    list: {
      method: 'GET' as const,
      path: API_ENDPOINTS.REPORTS.BASE,
      description: 'List all reports with pagination',
      auth: true,
      cache: { strategy: 'stale-while-revalidate' as const, ttl: 120000 },
      tags: ['reports'],
    },
    getById: {
      method: 'GET' as const,
      path: '/reports/:id',
      description: 'Get report by ID',
      auth: true,
      cache: { strategy: 'cache-first' as const, ttl: 600000 },
      tags: ['reports'],
    },
    generate: {
      method: 'POST' as const,
      path: API_ENDPOINTS.REPORTS.GENERATE,
      description: 'Generate new report',
      auth: true,
      timeout: API_TIMING.TIMEOUT_LONG,
      cache: { strategy: 'no-cache' as const, ttl: 0 },
      tags: ['reports', 'mutation', 'long-running'],
    },
    export: {
      method: 'GET' as const,
      path: '/reports/:id/export',
      description: 'Export report to file',
      auth: true,
      timeout: API_TIMING.TIMEOUT_LONG,
      cache: { strategy: 'no-cache' as const, ttl: 0 },
      tags: ['reports', 'export'],
    },
  },

  // ---------------------------------------------------------------------------
  // Analytics Endpoints
  // ---------------------------------------------------------------------------
  analytics: {
    dashboard: {
      method: 'GET' as const,
      path: API_ENDPOINTS.ANALYTICS.DASHBOARD,
      description: 'Get dashboard overview data',
      auth: true,
      cache: { strategy: 'stale-while-revalidate' as const, ttl: 30000 },
      tags: ['analytics', 'dashboard'],
    },
    metrics: {
      method: 'GET' as const,
      path: API_ENDPOINTS.ANALYTICS.METRICS,
      description: 'Get detailed metrics',
      auth: true,
      cache: { strategy: 'stale-while-revalidate' as const, ttl: 60000 },
      tags: ['analytics', 'metrics'],
    },
    activity: {
      method: 'GET' as const,
      path: API_ENDPOINTS.ANALYTICS.ACTIVITY,
      description: 'Get activity feed',
      auth: true,
      cache: { strategy: 'network-first' as const, ttl: 30000 },
      tags: ['analytics', 'activity'],
    },
  },

  // ---------------------------------------------------------------------------
  // Health Endpoints
  // ---------------------------------------------------------------------------
  health: {
    check: {
      method: 'GET' as const,
      path: API_ENDPOINTS.HEALTH.CHECK,
      description: 'Basic health check',
      auth: false,
      timeout: API_TIMING.TIMEOUT_HEALTH,
      cache: { strategy: 'no-cache' as const, ttl: 0 },
      tags: ['health', 'public'],
    },
    ready: {
      method: 'GET' as const,
      path: API_ENDPOINTS.HEALTH.READY,
      description: 'Readiness probe',
      auth: false,
      timeout: API_TIMING.TIMEOUT_HEALTH,
      cache: { strategy: 'no-cache' as const, ttl: 0 },
      tags: ['health', 'public'],
    },
    live: {
      method: 'GET' as const,
      path: API_ENDPOINTS.HEALTH.LIVE,
      description: 'Liveness probe',
      auth: false,
      timeout: API_TIMING.TIMEOUT_HEALTH,
      cache: { strategy: 'no-cache' as const, ttl: 0 },
      tags: ['health', 'public'],
    },
  },
} as const;

/** Type for endpoint registry */
export type EndpointRegistry = typeof ENDPOINT_REGISTRY;

// =============================================================================
// Environment-Specific Configuration
// =============================================================================

/**
 * Environment-specific API settings
 */
export interface EnvironmentApiConfig {
  /** Base URL for this environment */
  baseUrl: string;
  /** Enable request logging */
  logging: boolean;
  /** Enable mock server */
  mockEnabled: boolean;
  /** Default timeout */
  timeout: number;
  /** Retry attempts */
  retryAttempts: number;
  /** Enable request deduplication */
  deduplicate: boolean;
}

/**
 * Get API configuration for specific environment
 */
export function getEnvironmentApiConfig(): EnvironmentApiConfig {
  const isDev = env.isDev;
  const isProd = env.isProd;

  return {
    baseUrl: env.apiBaseUrl,
    logging: isDev,
    mockEnabled: isDev && !env.apiBaseUrl.includes('api.'),
    timeout: isProd ? API_TIMING.TIMEOUT : API_TIMING.TIMEOUT * 2,
    retryAttempts: isProd ? RETRY_CONFIG.API_ATTEMPTS : 1,
    deduplicate: true,
  };
}

// =============================================================================
// Request/Response Types (OpenAPI Compatible)
// =============================================================================

/**
 * Standard success response envelope
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    requestId?: string;
    timestamp?: string;
    version?: string;
  };
}

/**
 * Standard error response envelope
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    fieldErrors?: Array<{
      field: string;
      message: string;
      code?: string;
    }>;
  };
  meta?: {
    requestId?: string;
    timestamp?: string;
  };
}

/**
 * Standard paginated response envelope
 */
export interface ApiPaginatedResponse<T> {
  success: true;
  data: {
    items: T[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
      nextCursor?: string;
      prevCursor?: string;
    };
  };
  meta?: {
    requestId?: string;
    timestamp?: string;
  };
}

/**
 * Common request parameters for list endpoints
 */
export interface ListRequestParams {
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, unknown>;
}

/**
 * Build list request query string
 */
export function buildListParams(params: ListRequestParams): Record<string, string | number> {
  const query: Record<string, string | number> = {};

  if (params.page !== undefined) query.page = params.page;
  if (params.pageSize !== undefined) query.pageSize = params.pageSize;
  if (params.sort) query.sort = params.sort;
  if (params.order) query.order = params.order;
  if (params.search) query.search = params.search;

  // Flatten filters
  if (params.filters) {
    for (const [key, value] of Object.entries(params.filters)) {
      if (value !== undefined && value !== null) {
        query[`filter[${key}]`] = String(value);
      }
    }
  }

  return query;
}

// =============================================================================
// API Versioning
// =============================================================================

/**
 * Current API version
 */
export const API_VERSION = 'v1';

/**
 * Supported API versions
 */
export const SUPPORTED_API_VERSIONS = ['v1'] as const;

/**
 * API version type
 */
export type ApiVersion = (typeof SUPPORTED_API_VERSIONS)[number];

/**
 * Get versioned API URL
 */
export function getVersionedApiUrl(version: ApiVersion = API_VERSION): string {
  return `${API_CONFIG.BASE_URL}/${version}`;
}

/**
 * Build versioned endpoint URL
 */
export function buildVersionedUrl(
  endpoint: string,
  version: ApiVersion = API_VERSION
): string {
  const versionedBase = getVersionedApiUrl(version);
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${versionedBase}${path}`;
}
