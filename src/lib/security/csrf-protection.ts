/**
 * @fileoverview CSRF Protection System
 * @module @/lib/security/csrf-protection
 *
 * Comprehensive Cross-Site Request Forgery (CSRF) protection for the
 * Harbor React Framework. Implements multiple protection strategies
 * including Synchronizer Token Pattern, Double-Submit Cookie Pattern,
 * and Origin validation.
 *
 * @see https://owasp.org/www-community/attacks/csrf
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
 *
 * @author Harbor Security Team
 * @version 1.0.0
 */

import type React from 'react';
import type {
  CSRFToken,
  CSRFConfig,
  CSRFValidationResult,
  CSRFRequestInterceptor,
  ValidatedCSRFToken,
} from './types';
import {
  csrfConfig,
  isCSRFExcludedPath,
  requiresCSRFProtection,
  isAllowedOrigin,
} from '@/config/security.config';

// ============================================================================
// Constants
// ============================================================================

/**
 * Token entropy in bytes (256 bits)
 */
const TOKEN_ENTROPY_BYTES = 32;

// ============================================================================
// Cryptographic Utilities
// ============================================================================

/**
 * Generate cryptographically secure random bytes
 */
function getRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Convert bytes to base64url string (URL-safe base64)
 */
function bytesToBase64Url(bytes: Uint8Array): string {
  const binString = Array.from(bytes, (byte) =>
    String.fromCharCode(byte)
  ).join('');
  return btoa(binString)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Generate a cryptographically secure CSRF token
 */
function generateTokenValue(): string {
  const bytes = getRandomBytes(TOKEN_ENTROPY_BYTES);
  return bytesToBase64Url(bytes);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ============================================================================
// Cookie Utilities
// ============================================================================

/**
 * Get a cookie value by name
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(';').shift();
    return cookieValue ?? null;
  }

  return null;
}

/**
 * Set a cookie with security options
 */
function setCookie(
  name: string,
  value: string,
  options: {
    maxAge?: number;
    path?: string;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    httpOnly?: boolean;
  } = {}
): void {
  if (typeof document === 'undefined') {
    return;
  }

  const {
    maxAge = 86400, // 1 day
    path = '/',
    secure = true,
    sameSite = 'strict',
  } = options;

  let cookie = `${name}=${value}; Path=${path}`;

  if (maxAge) {
    cookie += `; Max-Age=${maxAge}`;
  }

  if (secure) {
    cookie += '; Secure';
  }

  cookie += `; SameSite=${sameSite}`;

  // Note: httpOnly cannot be set from JavaScript
  // Server must set the cookie with httpOnly flag

  document.cookie = cookie;
}

/**
 * Delete a cookie
 */
function deleteCookie(name: string, path = '/'): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${name}=; Path=${path}; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

// ============================================================================
// CSRF Protection Manager
// ============================================================================

/**
 * CSRF Protection Manager class
 *
 * Provides comprehensive CSRF protection including:
 * - Token generation and validation
 * - Double-submit cookie pattern implementation
 * - Origin/Referer header validation
 * - Automatic request interceptor for fetch/XHR
 *
 * @example
 * ```typescript
 * const csrf = CSRFProtection.getInstance();
 *
 * // Get token for form submission
 * const token = csrf.getToken();
 *
 * // Validate an incoming token
 * const result = csrf.validateToken(requestToken);
 *
 * // Create request interceptor
 * const interceptor = csrf.createRequestInterceptor();
 * ```
 */
class CSRFProtectionClass {
  private static instance: CSRFProtectionClass | null = null;

  private config: CSRFConfig;
  private currentToken: CSRFToken | null = null;
  private initialized = false;

  private constructor(config: CSRFConfig = csrfConfig) {
    this.config = { ...config };
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: CSRFConfig): CSRFProtectionClass {
    CSRFProtectionClass.instance ??= new CSRFProtectionClass(config);
    return CSRFProtectionClass.instance;
  }

  /**
   * Reset singleton instance (for testing)
   */
  static resetInstance(): void {
    if (CSRFProtectionClass.instance) {
      CSRFProtectionClass.instance.cleanup();
      CSRFProtectionClass.instance = null;
    }
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initialize CSRF protection
   * Generates initial token and sets up cookie if using double-submit pattern
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    // Try to load existing token from cookie
    const existingToken = this.loadTokenFromCookie();

    if (existingToken != null && this.isTokenValid(existingToken)) {
      this.currentToken = existingToken;
    } else {
      // Generate new token
      this.regenerateToken();
    }

    this.initialized = true;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.config.mode === 'double-submit-cookie') {
      deleteCookie(this.config.cookieName);
    }
    this.currentToken = null;
    this.initialized = false;
  }

  // ==========================================================================
  // Token Management
  // ==========================================================================

  /**
   * Generate a new CSRF token
   */
  regenerateToken(): ValidatedCSRFToken {
    const token: CSRFToken = {
      token: generateTokenValue(),
      createdAt: Date.now(),
      ttl: this.config.tokenTtl,
      used: false,
    };

    this.currentToken = token;

    // Set cookie for double-submit pattern
    if (this.config.mode === 'double-submit-cookie') {
      this.setTokenCookie(token);
    }

    return token.token as ValidatedCSRFToken;
  }

  /**
   * Get the current CSRF token
   * Regenerates if expired
   */
  getToken(): ValidatedCSRFToken {
    if (this.currentToken == null || !this.isTokenValid(this.currentToken)) {
      return this.regenerateToken();
    }

    return this.currentToken.token as ValidatedCSRFToken;
  }

  /**
   * Get the current token synchronously (may be stale)
   */
  getTokenSync(): string {
    return this.currentToken?.token ?? '';
  }

  /**
   * Check if a token is valid (not expired)
   */
  private isTokenValid(token: CSRFToken): boolean {
    const age = Date.now() - token.createdAt;
    return age < token.ttl;
  }

  /**
   * Load token from cookie (for double-submit pattern)
   */
  private loadTokenFromCookie(): CSRFToken | null {
    if (this.config.mode !== 'double-submit-cookie') {
      return null;
    }

    const cookieValue = getCookie(this.config.cookieName);
    if (!cookieValue) {
      return null;
    }

    try {
      // Cookie contains token:timestamp format
      const [token, timestampStr] = cookieValue.split(':');
      const timestamp = parseInt(timestampStr ?? '0', 10);

      if (!token || isNaN(timestamp)) {
        return null;
      }

      return {
        token,
        createdAt: timestamp,
        ttl: this.config.tokenTtl,
        used: false,
      };
    } catch {
      return null;
    }
  }

  /**
   * Set token cookie for double-submit pattern
   */
  private setTokenCookie(token: CSRFToken): void {
    const cookieValue = `${token.token}:${token.createdAt}`;
    const maxAge = Math.floor(token.ttl / 1000);

    setCookie(this.config.cookieName, cookieValue, {
      maxAge,
      secure: this.config.secureCookies,
      sameSite: this.config.sameSite,
      path: '/',
    });
  }

  // ==========================================================================
  // Token Validation
  // ==========================================================================

  /**
   * Validate a CSRF token from a request
   */
  validateToken(requestToken: string): CSRFValidationResult {
    // Check if we have a current token
    if (!this.currentToken) {
      return {
        isValid: false,
        reason: 'No active CSRF token',
        shouldRotate: true,
      };
    }

    // Check token expiration
    if (!this.isTokenValid(this.currentToken)) {
      return {
        isValid: false,
        reason: 'CSRF token expired',
        shouldRotate: true,
      };
    }

    // Constant-time comparison to prevent timing attacks
    const isMatch = constantTimeCompare(requestToken, this.currentToken.token);

    if (!isMatch) {
      return {
        isValid: false,
        reason: 'CSRF token mismatch',
        token: requestToken,
        shouldRotate: false,
      };
    }

    // Mark token as used
    if (this.config.rotateAfterUse) {
      this.currentToken.used = true;
    }

    return {
      isValid: true,
      token: requestToken,
      shouldRotate: this.config.rotateAfterUse,
    };
  }

  /**
   * Validate double-submit cookie pattern
   */
  validateDoubleSubmit(
    headerToken: string,
    cookieToken?: string
  ): CSRFValidationResult {
    // Get cookie token if not provided
    const cookie = cookieToken ?? getCookie(this.config.cookieName);

    if (!cookie) {
      return {
        isValid: false,
        reason: 'Missing CSRF cookie',
        shouldRotate: true,
      };
    }

    // Parse cookie value (token:timestamp format)
    const [expectedToken] = cookie.split(':');

    if (!expectedToken) {
      return {
        isValid: false,
        reason: 'Invalid CSRF cookie format',
        shouldRotate: true,
      };
    }

    // Compare header token with cookie token
    const isMatch = constantTimeCompare(headerToken, expectedToken);

    if (!isMatch) {
      return {
        isValid: false,
        reason: 'CSRF header/cookie mismatch',
        token: headerToken,
        shouldRotate: false,
      };
    }

    return {
      isValid: true,
      token: headerToken,
      shouldRotate: this.config.rotateAfterUse,
    };
  }

  /**
   * Validate Origin/Referer header
   */
  validateOrigin(
    origin: string | null,
    referer: string | null
  ): CSRFValidationResult {
    if (!this.config.validateOrigin) {
      return { isValid: true, shouldRotate: false };
    }

    // Get the origin to validate
    let requestOrigin = origin;

    if (!requestOrigin && referer) {
      try {
        const url = new URL(referer);
        requestOrigin = url.origin;
      } catch {
        requestOrigin = null;
      }
    }

    // If no origin available, fail closed (secure default)
    if (!requestOrigin) {
      return {
        isValid: false,
        reason: 'Missing Origin/Referer header',
        shouldRotate: false,
      };
    }

    // Check against allowed origins
    if (!isAllowedOrigin(requestOrigin)) {
      return {
        isValid: false,
        reason: `Origin not allowed: ${requestOrigin}`,
        shouldRotate: false,
      };
    }

    return { isValid: true, shouldRotate: false };
  }

  // ==========================================================================
  // Request Interception
  // ==========================================================================

  /**
   * Create a request interceptor that adds CSRF token to requests
   */
  createRequestInterceptor(): CSRFRequestInterceptor {
    return async (config: RequestInit): Promise<RequestInit> => {
      // Get the method
      const method = (config.method ?? 'GET').toUpperCase();

      // Skip if method doesn't require CSRF protection
      if (!requiresCSRFProtection(method)) {
        return config;
      }

      // Get current token
      const token = this.getToken();

      // Add token to headers
      const headers = new Headers(config.headers);
      headers.set(this.config.headerName, token);

      return {
        ...config,
        headers,
      };
    };
  }

  /**
   * Create a fetch wrapper with CSRF protection
   *
   * Note: This method intentionally returns a raw fetch wrapper because:
   * 1. This IS the CSRF security layer that wraps fetch
   * 2. It provides a drop-in fetch replacement with CSRF token injection
   * 3. The apiClient uses this wrapper internally for CSRF protection
   *
   * For application API calls, prefer using apiClient which has CSRF built-in.
   * @see {@link @/lib/api/api-client} for the recommended API client
   */
  createSecureFetch(): typeof fetch {
    const interceptor = this.createRequestInterceptor();

    return async (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> => {
      // Get the URL for path checking
      const url = typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.pathname
          : input.url;

      // Skip CSRF for excluded paths
      // Raw fetch is intentional - this IS the CSRF wrapper
      try {
        const {pathname} = new URL(url, window.location.origin);
        if (isCSRFExcludedPath(pathname)) {
          return fetch(input, init);
        }
      } catch {
        // If URL parsing fails, apply CSRF protection anyway
      }

      // Apply interceptor
      const interceptedInit = await interceptor(init ?? {});

      // Raw fetch is intentional - this wrapper applies CSRF tokens
      return fetch(input, interceptedInit);
    };
  }

  // ==========================================================================
  // Form Helpers
  // ==========================================================================

  /**
   * Get hidden input props for forms
   */
  getFormInputProps(): {
    type: 'hidden';
    name: string;
    value: string;
  } {
    return {
      type: 'hidden',
      name: this.config.fieldName,
      value: this.getTokenSync(),
    };
  }

  /**
   * Get headers object with CSRF token
   */
  async getHeaders(): Promise<Record<string, string>> {
    const token = this.getToken();
    return {
      [this.config.headerName]: token,
    };
  }

  /**
   * Get headers synchronously (may have stale token)
   */
  getHeadersSync(): Record<string, string> {
    return {
      [this.config.headerName]: this.getTokenSync(),
    };
  }

  // ==========================================================================
  // Configuration
  // ==========================================================================

  /**
   * Get current configuration
   */
  getConfig(): Readonly<CSRFConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<CSRFConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
    };
  }

  /**
   * Check if CSRF protection is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get header name for CSRF token
   */
  getHeaderName(): string {
    return this.config.headerName;
  }

  /**
   * Get field name for CSRF token in forms
   */
  getFieldName(): string {
    return this.config.fieldName;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

/**
 * CSRF Protection singleton instance
 */
export const CSRFProtection = CSRFProtectionClass.getInstance();

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a one-time CSRF token
 * For scenarios where token rotation is required
 */
export function generateOneTimeToken(): CSRFToken {
  return {
    token: generateTokenValue(),
    createdAt: Date.now(),
    ttl: csrfConfig.tokenTtl,
    used: false,
  };
}

/**
 * Create a request init object with CSRF token
 */
export async function createSecureRequestInit(
  method: string,
  body?: BodyInit | null,
  additionalHeaders?: Record<string, string>
): Promise<RequestInit> {
  const headers: Record<string, string> = {
    ...additionalHeaders,
  };

  // Add CSRF token for protected methods
  if (requiresCSRFProtection(method)) {
    const token = CSRFProtection.getToken();
    headers[csrfConfig.headerName] = token;
  }

  return {
    method,
    headers,
    body,
    credentials: 'same-origin',
  };
}

/**
 * Create a protected form action handler
 */
export function createProtectedFormHandler(
  action: (formData: FormData) => Promise<void>
): (event: React.FormEvent<HTMLFormElement>) => Promise<void> {
  return async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    // Validate CSRF token from form
    const token = formData.get(csrfConfig.fieldName);

    if (typeof token !== 'string') {
      throw new Error('Missing CSRF token in form');
    }

    const validation = CSRFProtection.validateToken(token);

    if (!validation.isValid) {
      throw new Error(`CSRF validation failed: ${validation.reason}`);
    }

    // Token is valid, proceed with action
    await action(formData);

    // Rotate token if needed
    if (validation.shouldRotate) {
      CSRFProtection.regenerateToken();
    }
  };
}

/**
 * Validate a request for CSRF protection
 * Comprehensive validation using configured mode
 */
export function validateRequest(
  request: {
    method: string;
    headers: Headers | Record<string, string>;
    url: string;
  }
): CSRFValidationResult {
  const { method, headers, url } = request;

  // Skip non-protected methods
  if (!requiresCSRFProtection(method)) {
    return { isValid: true, shouldRotate: false };
  }

  // Skip excluded paths
  try {
    const {pathname} = new URL(url, window.location.origin);
    if (isCSRFExcludedPath(pathname)) {
      return { isValid: true, shouldRotate: false };
    }
  } catch {
    // If URL parsing fails, continue with validation
  }

  const config = CSRFProtection.getConfig();
  const headerValue =
    headers instanceof Headers
      ? headers.get(config.headerName)
      : headers[config.headerName];

  switch (config.mode) {
    case 'synchronizer-token':
      if (!headerValue) {
        return {
          isValid: false,
          reason: `Missing ${config.headerName} header`,
          shouldRotate: false,
        };
      }
      return CSRFProtection.validateToken(headerValue);

    case 'double-submit-cookie':
      if (!headerValue) {
        return {
          isValid: false,
          reason: `Missing ${config.headerName} header`,
          shouldRotate: false,
        };
      }
      return CSRFProtection.validateDoubleSubmit(headerValue);

    case 'origin-check': {
      const origin = headers instanceof Headers
        ? headers.get('Origin')
        : headers['Origin'];
      const referer = headers instanceof Headers
        ? headers.get('Referer')
        : headers['Referer'];
      return CSRFProtection.validateOrigin(origin ?? null, referer ?? null);
    }

    case 'custom-header':
      // Just check that the custom header exists
      if (!headerValue) {
        return {
          isValid: false,
          reason: `Missing required header: ${config.headerName}`,
          shouldRotate: false,
        };
      }
      return { isValid: true, shouldRotate: false };

    default:
      return { isValid: false, reason: 'Unknown CSRF mode', shouldRotate: false };
  }
}

// ============================================================================
// React Utilities
// ============================================================================

/**
 * Create CSRF hidden input element props
 */
export async function createCSRFInputProps(): Promise<{
  type: 'hidden';
  name: string;
  value: string;
}> {
  const token = CSRFProtection.getToken();
  return {
    type: 'hidden',
    name: csrfConfig.fieldName,
    value: token,
  };
}

/**
 * Create meta tag props for CSRF token
 * Useful for JavaScript access to token
 */
export async function createCSRFMetaProps(): Promise<{
  name: string;
  content: string;
}> {
  const token = CSRFProtection.getToken();
  return {
    name: 'csrf-token',
    content: token,
  };
}

// ============================================================================
// Type Exports
// ============================================================================

export type { CSRFProtectionClass };
export type {
  CSRFToken,
  CSRFConfig,
  CSRFValidationResult,
  CSRFRequestInterceptor,
  ValidatedCSRFToken,
};
