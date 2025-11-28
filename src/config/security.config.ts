/**
 * @fileoverview Security Configuration
 * @module @/config/security.config
 *
 * Centralized security settings for the Harbor React Framework.
 * This configuration file defines security policies, CSP rules,
 * CSRF protection settings, and secure storage options.
 *
 * IMPORTANT: Review these settings for your specific deployment environment.
 * Production deployments should use strict security policies.
 *
 * @author Harbor Security Team
 * @version 1.0.0
 */

import type {
  CSPPolicy,
  CSPManagerConfig,
  CSRFConfig,
  SecureStorageConfig,
  SecurityConfiguration,
} from '@/lib/security/types';
import { env } from './env';

// ============================================================================
// Content Security Policy Configuration
// ============================================================================

/**
 * Base CSP policy for development environment
 * More permissive to allow hot reload and dev tools
 */
const developmentCSPPolicy: CSPPolicy = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-eval'"], // unsafe-eval needed for HMR
  'script-src-elem': ["'self'"],
  'style-src': ["'self'", "'unsafe-inline'"], // unsafe-inline for dev styles
  'style-src-elem': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'blob:', 'https:'],
  'font-src': ["'self'", 'data:'],
  'connect-src': [
    "'self'",
    'ws://localhost:*',  // WebSocket for HMR
    'wss://localhost:*',
    'http://localhost:*',
    'https://localhost:*',
  ],
  'media-src': ["'self'", 'blob:'],
  'object-src': ['none'],
  'frame-src': ["'self'"],
  'worker-src': ["'self'", 'blob:'],
  'child-src': ["'self'", 'blob:'],
  'form-action': ["'self'"],
  'frame-ancestors': ["'self'"],
  'base-uri': ["'self'"],
  'manifest-src': ["'self'"],
};

/**
 * Base CSP policy for staging environment
 * Moderately strict with reporting enabled
 */
const stagingCSPPolicy: CSPPolicy = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'strict-dynamic'"],
  'script-src-elem': ["'self'"],
  'style-src': ["'self'"],
  'style-src-elem': ["'self'"],
  'img-src': ["'self'", 'data:', 'https:'],
  'font-src': ["'self'"],
  'connect-src': ["'self'", env.apiBaseUrl, env.wsUrl, env.sseUrl],
  'media-src': ["'self'"],
  'object-src': ['none'],
  'frame-src': ["'self'"],
  'worker-src': ["'self'", 'blob:'],
  'child-src': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'self'"],
  'base-uri': ["'self'"],
  'manifest-src': ["'self'"],
  'upgrade-insecure-requests': [],
};

/**
 * Base CSP policy for production environment
 * Maximum security with strict policies
 */
const productionCSPPolicy: CSPPolicy = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'strict-dynamic'"],
  'script-src-elem': ["'self'"],
  'style-src': ["'self'"],
  'style-src-elem': ["'self'"],
  'img-src': ["'self'", 'data:', 'https:'],
  'font-src': ["'self'"],
  'connect-src': ["'self'", env.apiBaseUrl, env.wsUrl, env.sseUrl],
  'media-src': ["'self'"],
  'object-src': ['none'],
  'frame-src': ['none'],
  'worker-src': ["'self'"],
  'child-src': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ['none'],
  'base-uri': ["'self'"],
  'manifest-src': ["'self'"],
  'upgrade-insecure-requests': [],
  'block-all-mixed-content': [],
};

/**
 * Get the appropriate CSP policy based on environment
 */
function getCSPPolicy(): CSPPolicy {
  if (env.isDev) {
    return developmentCSPPolicy;
  }
  if (env.isStaging) {
    return stagingCSPPolicy;
  }
  return productionCSPPolicy;
}

/**
 * CSP Manager configuration
 */
export const cspConfig: CSPManagerConfig = {
  basePolicy: getCSPPolicy(),
  enableNonces: true,
  nonceTtl: 1000 * 60 * 60, // 1 hour
  reportViolations: true,
  reportUri: env.isProd ? '/api/security/csp-report' : undefined,
  reportOnly: env.isDev, // Report-only mode in development
  violationHandlers: [],
} as const;

// ============================================================================
// CSRF Protection Configuration
// ============================================================================

/**
 * CSRF protection configuration
 */
export const csrfConfig: CSRFConfig = {
  mode: 'double-submit-cookie',
  cookieName: '__Host-csrf-token',
  headerName: 'X-CSRF-Token',
  fieldName: '_csrf',
  tokenTtl: 1000 * 60 * 60 * 24, // 24 hours
  rotateAfterUse: false, // Can cause issues with concurrent requests
  excludePaths: [
    '/api/health',
    '/api/public/*',
    '/api/webhooks/*',
  ],
  protectedMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  validateOrigin: true,
  allowedOrigins: env.isProd
    ? [
        // Add your production origins here
        'https://your-domain.com',
      ]
    : [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
      ],
  secureCookies: env.isProd,
  sameSite: env.isProd ? 'strict' : 'lax',
} as const;

// ============================================================================
// Secure Storage Configuration
// ============================================================================

/**
 * Secure storage configuration for encrypted data
 */
export const secureStorageConfig: SecureStorageConfig = {
  algorithm: 'AES-GCM',
  keyLength: 256,
  kdf: 'PBKDF2',
  iterations: env.isProd ? 600000 : 100000, // OWASP recommended
  saltLength: 32,
  ivLength: 12, // 96 bits for AES-GCM
  storagePrefix: '__secure_',
  compress: true,
  maxItemSize: 1024 * 1024 * 5, // 5MB
  storageQuota: 1024 * 1024 * 50, // 50MB
  useIndexedDB: true,
  keyTtl: 1000 * 60 * 30, // 30 minutes
} as const;

// ============================================================================
// Main Security Configuration
// ============================================================================

/**
 * Complete security configuration for the application
 */
export const securityConfig: SecurityConfiguration = {
  csp: cspConfig,
  csrf: csrfConfig,
  storage: secureStorageConfig,
  enableLogging: env.isDev,
  reportToServer: env.isProd || env.isStaging,
  reportEndpoint: '/api/security/violations',
  maxViolationHistory: 100,
  blockOnViolation: env.isProd,
} as const;

// ============================================================================
// Security Constants
// ============================================================================

/**
 * Security-related timing constants
 */
export const SECURITY_TIMING = {
  /** Nonce regeneration interval */
  NONCE_REGENERATION_INTERVAL: 1000 * 60 * 30, // 30 minutes
  /** CSRF token refresh interval */
  CSRF_TOKEN_REFRESH_INTERVAL: 1000 * 60 * 60, // 1 hour
  /** Secure storage key cache TTL */
  STORAGE_KEY_CACHE_TTL: 1000 * 60 * 30, // 30 minutes
  /** Violation report debounce */
  VIOLATION_REPORT_DEBOUNCE: 1000, // 1 second
  /** Maximum time to wait for encryption */
  ENCRYPTION_TIMEOUT: 5000, // 5 seconds
} as const;

/**
 * Security header names
 */
export const SECURITY_HEADERS = {
  /** Content Security Policy header */
  CSP: 'Content-Security-Policy',
  /** CSP Report-Only header */
  CSP_REPORT_ONLY: 'Content-Security-Policy-Report-Only',
  /** CSRF token header */
  CSRF_TOKEN: csrfConfig.headerName,
  /** Strict Transport Security */
  HSTS: 'Strict-Transport-Security',
  /** X-Content-Type-Options */
  X_CONTENT_TYPE_OPTIONS: 'X-Content-Type-Options',
  /** X-Frame-Options */
  X_FRAME_OPTIONS: 'X-Frame-Options',
  /** X-XSS-Protection */
  X_XSS_PROTECTION: 'X-XSS-Protection',
  /** Referrer-Policy */
  REFERRER_POLICY: 'Referrer-Policy',
  /** Permissions-Policy */
  PERMISSIONS_POLICY: 'Permissions-Policy',
} as const;

/**
 * Allowed HTML tags for sanitization (default safe set)
 */
export const ALLOWED_HTML_TAGS = [
  'a',
  'abbr',
  'address',
  'article',
  'aside',
  'b',
  'bdi',
  'bdo',
  'blockquote',
  'br',
  'caption',
  'cite',
  'code',
  'col',
  'colgroup',
  'data',
  'dd',
  'del',
  'details',
  'dfn',
  'div',
  'dl',
  'dt',
  'em',
  'figcaption',
  'figure',
  'footer',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hgroup',
  'hr',
  'i',
  'img',
  'ins',
  'kbd',
  'li',
  'main',
  'mark',
  'nav',
  'ol',
  'p',
  'picture',
  'pre',
  'q',
  'rp',
  'rt',
  'ruby',
  's',
  'samp',
  'section',
  'small',
  'source',
  'span',
  'strong',
  'sub',
  'summary',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'time',
  'tr',
  'u',
  'ul',
  'var',
  'wbr',
] as const;

/**
 * Allowed HTML attributes per tag
 */
export const ALLOWED_HTML_ATTRIBUTES: Record<string, readonly string[]> = {
  '*': ['class', 'id', 'title', 'lang', 'dir', 'aria-*', 'data-*', 'role'],
  a: ['href', 'target', 'rel', 'hreflang'],
  abbr: ['title'],
  blockquote: ['cite'],
  col: ['span'],
  colgroup: ['span'],
  data: ['value'],
  del: ['cite', 'datetime'],
  img: ['src', 'alt', 'width', 'height', 'loading', 'decoding', 'srcset', 'sizes'],
  ins: ['cite', 'datetime'],
  ol: ['reversed', 'start', 'type'],
  q: ['cite'],
  source: ['src', 'srcset', 'sizes', 'type', 'media'],
  table: ['summary'],
  td: ['colspan', 'rowspan', 'headers'],
  th: ['colspan', 'rowspan', 'headers', 'scope', 'abbr'],
  time: ['datetime'],
} as const;

/**
 * Allowed URL schemes for href/src attributes
 */
export const ALLOWED_URL_SCHEMES = [
  'http',
  'https',
  'mailto',
  'tel',
] as const;

// ============================================================================
// Security Validation Utilities
// ============================================================================

/**
 * Validate that a URL uses an allowed scheme
 */
export function isAllowedUrlScheme(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    return ALLOWED_URL_SCHEMES.some((scheme) =>
      parsed.protocol === `${scheme}:`
    );
  } catch {
    // Relative URLs are allowed
    return !url.includes(':') || url.startsWith('/');
  }
}

/**
 * Check if a hostname is in the allowed origins list
 */
export function isAllowedOrigin(origin: string): boolean {
  return csrfConfig.allowedOrigins.some((allowed) => {
    if (allowed.includes('*')) {
      const pattern = new RegExp(
        `^${  allowed.replace(/\*/g, '.*')  }$`
      );
      return pattern.test(origin);
    }
    return allowed === origin;
  });
}

/**
 * Check if a path is excluded from CSRF protection
 */
export function isCSRFExcludedPath(path: string): boolean {
  return csrfConfig.excludePaths.some((excluded) => {
    if (excluded.endsWith('/*')) {
      return path.startsWith(excluded.slice(0, -1));
    }
    return path === excluded;
  });
}

/**
 * Check if an HTTP method requires CSRF protection
 */
export function requiresCSRFProtection(method: string): boolean {
  return csrfConfig.protectedMethods.includes(method.toUpperCase());
}

// ============================================================================
// Exports
// ============================================================================

export type {
  CSPPolicy,
  CSPManagerConfig,
  CSRFConfig,
  SecureStorageConfig,
  SecurityConfiguration,
};

/**
 * Get security configuration summary for diagnostics
 * Sensitive values are redacted
 */
export function getSecurityConfigSummary(): Record<string, unknown> {
  return {
    csp: {
      enableNonces: cspConfig.enableNonces,
      reportOnly: cspConfig.reportOnly,
      reportViolations: cspConfig.reportViolations,
    },
    csrf: {
      mode: csrfConfig.mode,
      protectedMethods: csrfConfig.protectedMethods,
      sameSite: csrfConfig.sameSite,
      secureCookies: csrfConfig.secureCookies,
      excludedPathCount: csrfConfig.excludePaths.length,
    },
    storage: {
      algorithm: secureStorageConfig.algorithm,
      keyLength: secureStorageConfig.keyLength,
      compress: secureStorageConfig.compress,
      maxItemSize: `${secureStorageConfig.maxItemSize / 1024 / 1024}MB`,
      storageQuota: `${secureStorageConfig.storageQuota / 1024 / 1024}MB`,
    },
    logging: securityConfig.enableLogging,
    reportToServer: securityConfig.reportToServer,
    environment: env.appEnv,
  };
}
