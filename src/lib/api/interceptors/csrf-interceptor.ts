/**
 * @file CSRF Token Interceptor
 * @description Request interceptor that automatically adds CSRF tokens to mutation requests.
 *
 * This interceptor:
 * - Reads CSRF token from cookies (configurable cookie name)
 * - Adds X-CSRF-Token header to all mutation requests (POST, PUT, PATCH, DELETE)
 * - Skips CSRF for GET/HEAD/OPTIONS requests (safe methods)
 * - Supports custom token extraction and header configuration
 *
 * @example
 * ```typescript
 * import { apiClient } from '@/lib/api';
 * import { createCsrfInterceptor } from '@/lib/api/interceptors/csrf-interceptor';
 *
 * // Add CSRF protection to API client
 * const removeCsrfInterceptor = apiClient.addRequestInterceptor(
 *   createCsrfInterceptor()
 * );
 *
 * // Or with custom configuration
 * apiClient.addRequestInterceptor(
 *   createCsrfInterceptor({
 *     cookieName: 'XSRF-TOKEN',
 *     headerName: 'X-XSRF-Token',
 *   })
 * );
 * ```
 *
 * @module api/interceptors/csrf-interceptor
 */

import type { RequestConfig, RequestInterceptor } from '../types';

// =============================================================================
// Types
// =============================================================================

/**
 * CSRF interceptor configuration
 */
export interface CsrfInterceptorConfig {
  /**
   * Cookie name containing the CSRF token.
   * @default 'csrf_token'
   */
  cookieName?: string;

  /**
   * Header name to send the CSRF token.
   * @default 'X-CSRF-Token'
   */
  headerName?: string;

  /**
   * HTTP methods that require CSRF protection.
   * Safe methods (GET, HEAD, OPTIONS) are excluded by default.
   * @default ['POST', 'PUT', 'PATCH', 'DELETE']
   */
  protectedMethods?: string[];

  /**
   * Custom function to extract CSRF token.
   * Overrides cookie-based extraction when provided.
   */
  tokenExtractor?: () => string | null;

  /**
   * URL patterns to exclude from CSRF protection.
   * Supports string matching and RegExp patterns.
   */
  excludePatterns?: Array<string | RegExp>;

  /**
   * Callback when CSRF token is missing for a protected request.
   * Useful for logging or triggering token refresh.
   */
  onMissingToken?: (config: RequestConfig) => void;
}

// =============================================================================
// Cookie Utilities
// =============================================================================

/**
 * Parse cookies from document.cookie string.
 * @param cookieString - Raw cookie string
 * @returns Map of cookie names to values
 */
function parseCookies(cookieString: string): Map<string, string> {
  const cookies = new Map<string, string>();

  if (!cookieString) {
    return cookies;
  }

  const pairs = cookieString.split(';');
  for (const pair of pairs) {
    const [name, ...valueParts] = pair.trim().split('=');
    if (name != null && name !== '') {
      // Handle cookies with '=' in the value
      const value = valueParts.join('=');
      cookies.set(name.trim(), decodeURIComponent(value ?? ''));
    }
  }

  return cookies;
}

/**
 * Get CSRF token from cookies.
 * @param cookieName - Name of the cookie containing the token
 * @returns CSRF token or null if not found
 */
function getCsrfTokenFromCookie(cookieName: string): string | null {
  // Guard for SSR/non-browser environments
  if (typeof document === 'undefined') {
    return null;
  }

  const cookies = parseCookies(document.cookie);
  return cookies.get(cookieName) ?? null;
}

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: Required<Omit<CsrfInterceptorConfig, 'tokenExtractor' | 'onMissingToken' | 'excludePatterns'>> = {
  cookieName: 'csrf_token',
  headerName: 'X-CSRF-Token',
  protectedMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],
};

// =============================================================================
// CSRF Interceptor Factory
// =============================================================================

/**
 * Create a CSRF token request interceptor.
 *
 * Automatically adds CSRF tokens to mutation requests by reading
 * from cookies and adding to request headers.
 *
 * @param config - Interceptor configuration
 * @returns Request interceptor function
 *
 * @example Basic usage
 * ```typescript
 * const csrfInterceptor = createCsrfInterceptor();
 * apiClient.addRequestInterceptor(csrfInterceptor);
 * ```
 *
 * @example With custom cookie name (common with frameworks like Django/Rails)
 * ```typescript
 * const csrfInterceptor = createCsrfInterceptor({
 *   cookieName: 'XSRF-TOKEN',  // Angular/Django style
 *   headerName: 'X-XSRF-Token',
 * });
 * ```
 *
 * @example With custom token extractor (e.g., from meta tag)
 * ```typescript
 * const csrfInterceptor = createCsrfInterceptor({
 *   tokenExtractor: () => {
 *     const meta = document.querySelector('meta[name="csrf-token"]');
 *     return meta?.getAttribute('content') || null;
 *   },
 * });
 * ```
 */
export function createCsrfInterceptor(config: CsrfInterceptorConfig = {}): RequestInterceptor {
  const {
    cookieName = DEFAULT_CONFIG.cookieName,
    headerName = DEFAULT_CONFIG.headerName,
    protectedMethods = DEFAULT_CONFIG.protectedMethods,
    tokenExtractor,
    excludePatterns = [],
    onMissingToken,
  } = config;

  return (requestConfig: RequestConfig): RequestConfig => {
    // Skip CSRF for safe methods
    const method = requestConfig.method?.toUpperCase() || 'GET';
    if (!protectedMethods.includes(method)) {
      return requestConfig;
    }

    // Check if URL matches any exclude pattern
    const url = requestConfig.url || '';
    const isExcluded = excludePatterns.some((pattern) => {
      if (typeof pattern === 'string') {
        return url.includes(pattern);
      }
      return pattern.test(url);
    });

    if (isExcluded) {
      return requestConfig;
    }

    // Get CSRF token
    const token = tokenExtractor
      ? tokenExtractor()
      : getCsrfTokenFromCookie(cookieName);

    // Handle missing token
    if (token === undefined || token === null || token === '') {
      if (onMissingToken) {
        onMissingToken(requestConfig);
      }
      // Continue without token - server will reject if required
      return requestConfig;
    }

    // Add CSRF token to headers
    return {
      ...requestConfig,
      headers: {
        ...requestConfig.headers,
        [headerName]: token,
      },
    };
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Manually set CSRF token in cookies.
 * Useful for testing or when token is received via non-cookie mechanism.
 *
 * @param token - CSRF token value
 * @param cookieName - Cookie name (default: 'csrf_token')
 * @param options - Cookie options
 */
export function setCsrfToken(
  token: string,
  cookieName = 'csrf_token',
  options: {
    path?: string;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
    maxAge?: number;
  } = {}
): void {
  if (typeof document === 'undefined') {
    return;
  }

  const {
    path = '/',
    secure = true,
    sameSite = 'Strict',
    maxAge = 86400, // 24 hours
  } = options;

  let cookie = `${cookieName}=${encodeURIComponent(token)}`;
  cookie += `; Path=${path}`;
  cookie += `; Max-Age=${maxAge}`;
  cookie += `; SameSite=${sameSite}`;

  if (secure) {
    cookie += '; Secure';
  }

  document.cookie = cookie;
}

/**
 * Clear CSRF token from cookies.
 *
 * @param cookieName - Cookie name (default: 'csrf_token')
 * @param path - Cookie path (default: '/')
 */
export function clearCsrfToken(cookieName = 'csrf_token', path = '/'): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${cookieName}=; Path=${path}; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

/**
 * Get current CSRF token value.
 *
 * @param cookieName - Cookie name (default: 'csrf_token')
 * @returns Current token or null
 */
export function getCsrfToken(cookieName = 'csrf_token'): string | null {
  return getCsrfTokenFromCookie(cookieName);
}

// =============================================================================
// Pre-configured Interceptor Instances
// =============================================================================

/**
 * Default CSRF interceptor with standard configuration.
 * Uses 'csrf_token' cookie and 'X-CSRF-Token' header.
 */
export const defaultCsrfInterceptor = createCsrfInterceptor();

/**
 * Angular/Django style CSRF interceptor.
 * Uses 'XSRF-TOKEN' cookie and 'X-XSRF-Token' header.
 */
export const xsrfInterceptor = createCsrfInterceptor({
  cookieName: 'XSRF-TOKEN',
  headerName: 'X-XSRF-Token',
});

/**
 * Rails style CSRF interceptor.
 * Reads token from meta tag instead of cookie.
 */
export const railsCsrfInterceptor = createCsrfInterceptor({
  headerName: 'X-CSRF-Token',
  tokenExtractor: () => {
    if (typeof document === 'undefined') {
      return null;
    }
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta?.getAttribute('content') ?? null;
  },
});
