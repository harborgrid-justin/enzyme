/**
 * @file Security Utilities
 * @description Security utilities for the Enzyme VS Code extension
 * Provides HTML escaping, CSP nonce generation, and input sanitization
 */

import * as crypto from 'crypto';

/**
 * HTML entity map for escaping
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Escape HTML special characters to prevent XSS attacks
 * @param str - String to escape
 * @returns Escaped string safe for HTML insertion
 */
export function escapeHtml(str: string): string {
  if (typeof str !== 'string') {
    return '';
  }
  return str.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Escape a string for use in JavaScript string literals
 * @param str - String to escape
 * @returns Escaped string safe for JS string literals
 */
export function escapeJs(str: string): string {
  if (typeof str !== 'string') {
    return '';
  }
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E');
}

/**
 * Generate a cryptographically secure nonce for CSP
 * @returns Base64 encoded nonce string
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('base64');
}

/**
 * Build a secure Content Security Policy string
 * SECURITY: Implements strict CSP following Microsoft VS Code security guidelines
 * @param webviewCspSource - The webview's CSP source from VS Code
 * @param nonce - The nonce for inline scripts and styles
 * @param options - Additional CSP options
 * @returns CSP string
 */
export function buildCsp(
  webviewCspSource: string,
  nonce: string,
  options?: {
    allowImages?: boolean;
    allowFonts?: boolean;
    allowConnections?: string[];
  }
): string {
  // SECURITY: Build strict CSP with defense in depth
  const directives: string[] = [
    // Block everything by default
    "default-src 'none'",
    // Only allow styles from extension with nonce
    `style-src ${webviewCspSource} 'nonce-${nonce}'`,
    // Only allow scripts with nonce (no eval, no unsafe-inline)
    `script-src 'nonce-${nonce}'`,
    // Block object/embed/applet tags
    "object-src 'none'",
    // Prevent base tag hijacking
    "base-uri 'none'",
    // Block form submissions
    "form-action 'none'",
    // Prevent framing
    "frame-ancestors 'none'",
  ];

  if (options?.allowFonts !== false) {
    directives.push(`font-src ${webviewCspSource}`);
  }

  if (options?.allowImages !== false) {
    // SECURITY: Only allow HTTPS images (no http://), data URIs, and extension resources
    directives.push(`img-src ${webviewCspSource} https: data:`);
  }

  if (options?.allowConnections && options.allowConnections.length > 0) {
    // SECURITY: Only allow explicitly whitelisted connection targets
    // Default to extension resources only
    directives.push(`connect-src ${webviewCspSource} ${options.allowConnections.join(' ')}`);
  } else {
    // Default: only allow connections to extension resources
    directives.push(`connect-src ${webviewCspSource}`);
  }

  return directives.join('; ');
}

/**
 * Sanitize user input for safe use in various contexts
 * @param input - User input to sanitize
 * @param maxLength - Maximum allowed length (default: 1000)
 * @returns Sanitized string
 */
export function sanitizeInput(input: string, maxLength: number = 1000): string {
  if (typeof input !== 'string') {
    return '';
  }
  // Trim, limit length, and remove control characters
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Validate and sanitize a file path
 * Prevents path traversal attacks using robust validation
 * @param path - Path to validate
 * @param allowedBase - Base directory that paths must be within
 * @returns Sanitized path or null if invalid
 */
export function sanitizePath(path: string, allowedBase?: string): string | null {
  if (typeof path !== 'string') {
    return null;
  }

  // Remove null bytes
  let sanitized = path.replace(/\0/g, '');

  // Normalize path separators to forward slashes
  sanitized = sanitized.replace(/\\/g, '/');

  // Remove any leading slashes to prevent absolute path access
  sanitized = sanitized.replace(/^\/+/, '');

  // Check for various path traversal patterns
  const traversalPatterns = [
    /\.\./,           // Standard traversal (..)
    /%2e%2e/i,        // URL encoded (..)
    /\.\.\\/,         // Windows style
    /\.\.\//,         // Unix style
    /\.\.%2f/i,       // Mixed encoding
    /%252e%252e/i,    // Double URL encoding
    /\.%2e/i,         // Partial encoding
    /%2e\./i,         // Partial encoding
  ];

  for (const pattern of traversalPatterns) {
    if (pattern.test(sanitized)) {
      return null;
    }
  }

  // Check for consecutive slashes (could be used in bypass attempts)
  if (/\/\/+/.test(sanitized)) {
    return null;
  }

  // Validate characters - only allow safe path characters
  if (!/^[a-zA-Z0-9\-_./]+$/.test(sanitized)) {
    return null;
  }

  // If an allowed base is specified, verify the resolved path is within it
  if (allowedBase) {
    const normalizedBase = allowedBase.replace(/\\/g, '/').replace(/\/+$/, '');

    // Ensure the path starts with the base or is relative
    if (!sanitized.startsWith(normalizedBase + '/') && sanitized !== normalizedBase) {
      // For relative paths, prepend the base
      sanitized = normalizedBase + '/' + sanitized;
    }

    // Verify the final path is still within the allowed base
    if (!sanitized.startsWith(normalizedBase + '/') && sanitized !== normalizedBase) {
      return null;
    }
  }

  return sanitized;
}

/**
 * Create a safe JSON string for embedding in HTML script tags
 * @param data - Data to serialize
 * @returns Safe JSON string
 */
export function safeJsonStringify(data: unknown): string {
  const json = JSON.stringify(data);
  // Escape characters that could break out of script context
  return json
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E')
    .replace(/&/g, '\\u0026')
    .replace(/'/g, '\\u0027');
}
