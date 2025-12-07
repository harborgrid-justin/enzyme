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
 * @param webviewCspSource - The webview's CSP source from VS Code
 * @param nonce - The nonce for inline scripts
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
  const directives: string[] = [
    "default-src 'none'",
    `style-src ${webviewCspSource}`,
    `script-src 'nonce-${nonce}'`,
  ];

  if (options?.allowFonts !== false) {
    directives.push(`font-src ${webviewCspSource}`);
  }

  if (options?.allowImages !== false) {
    directives.push(`img-src ${webviewCspSource} https: data:`);
  }

  if (options?.allowConnections && options.allowConnections.length > 0) {
    directives.push(`connect-src ${options.allowConnections.join(' ')}`);
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
 * Prevents path traversal attacks
 * @param path - Path to validate
 * @param allowedBase - Base directory that paths must be within
 * @returns Sanitized path or null if invalid
 */
export function sanitizePath(path: string, allowedBase?: string): string | null {
  if (typeof path !== 'string') {
    return null;
  }

  // Remove null bytes and normalize separators
  const normalized = path.replace(/\0/g, '').replace(/\\/g, '/');

  // Check for path traversal attempts
  if (normalized.includes('..') || normalized.includes('//')) {
    return null;
  }

  // If an allowed base is specified, verify the path is within it
  if (allowedBase) {
    const normalizedBase = allowedBase.replace(/\\/g, '/');
    if (!normalized.startsWith(normalizedBase)) {
      return null;
    }
  }

  return normalized;
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
