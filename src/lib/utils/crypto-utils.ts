/**
 * @fileoverview Shared Cryptographic Utilities
 * @module @/lib/utils/crypto-utils
 *
 * Centralized cryptographic utilities for the Harbor React Framework.
 * This module consolidates previously duplicated crypto functions from:
 * - security/csrf-protection.ts
 * - security/csp-manager.ts
 * - security/secure-storage.ts
 *
 * All cryptographic operations use the Web Crypto API for maximum security.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API
 * @see https://owasp.org/www-project-web-security-testing-guide/
 */

// ============================================================================
// Random Bytes Generation
// ============================================================================

/**
 * Generate cryptographically secure random bytes
 *
 * Uses crypto.getRandomValues() which provides cryptographically strong
 * random values suitable for key generation and token creation.
 *
 * @param length - Number of random bytes to generate
 * @returns Uint8Array of random bytes
 *
 * @example
 * const bytes = getRandomBytes(32); // 256 bits of entropy
 */
export function getRandomBytes(length: number): Uint8Array {
  if (length <= 0) {
    throw new Error('Length must be a positive integer');
  }
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Generate a random hex string of specified byte length
 *
 * @param byteLength - Number of random bytes (output will be 2x characters)
 * @returns Hex-encoded random string
 *
 * @example
 * const hex = generateRandomHex(16); // 32-character hex string
 */
export function generateRandomHex(byteLength: number): string {
  const bytes = getRandomBytes(byteLength);
  return bytesToHex(bytes);
}

/**
 * Generate a random base64url-encoded string of specified byte length
 *
 * @param byteLength - Number of random bytes
 * @returns Base64url-encoded random string
 *
 * @example
 * const token = generateRandomBase64Url(32); // 43-character base64url string
 */
export function generateRandomBase64Url(byteLength: number): string {
  const bytes = getRandomBytes(byteLength);
  return bytesToBase64Url(bytes);
}

// ============================================================================
// Encoding Utilities
// ============================================================================

/**
 * Convert bytes to hexadecimal string
 *
 * @param bytes - Uint8Array to convert
 * @returns Lowercase hex-encoded string
 *
 * @example
 * bytesToHex(new Uint8Array([255, 0, 128])) // "ff0080"
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hexadecimal string to bytes
 *
 * @param hex - Hex-encoded string
 * @returns Uint8Array of bytes
 * @throws Error if hex string is invalid
 *
 * @example
 * hexToBytes("ff0080") // Uint8Array([255, 0, 128])
 */
export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Hex string must have even length');
  }
  if (!/^[0-9a-fA-F]*$/.test(hex)) {
    throw new Error('Invalid hex string');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Convert bytes to standard base64 string
 *
 * @param bytes - Uint8Array to convert
 * @returns Base64-encoded string
 *
 * @example
 * bytesToBase64(new Uint8Array([72, 101, 108, 108, 111])) // "SGVsbG8="
 */
export function bytesToBase64(bytes: Uint8Array): string {
  const binString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binString);
}

/**
 * Convert base64 string to bytes
 *
 * @param base64 - Base64-encoded string
 * @returns Uint8Array of bytes
 * @throws Error if base64 string is invalid
 *
 * @example
 * base64ToBytes("SGVsbG8=") // Uint8Array([72, 101, 108, 108, 111])
 */
export function base64ToBytes(base64: string): Uint8Array {
  const binString = atob(base64);
  return Uint8Array.from(binString, (char) => char.charCodeAt(0));
}

/**
 * Convert bytes to URL-safe base64 string (base64url)
 *
 * URL-safe base64 replaces + with -, / with _, and removes padding.
 * Safe for use in URLs, cookies, and HTML attributes.
 *
 * @param bytes - Uint8Array to convert
 * @returns Base64url-encoded string (no padding)
 *
 * @example
 * bytesToBase64Url(new Uint8Array([255, 255])) // "__8"
 */
export function bytesToBase64Url(bytes: Uint8Array): string {
  const base64 = bytesToBase64(bytes);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Convert URL-safe base64 string to bytes
 *
 * @param base64url - Base64url-encoded string
 * @returns Uint8Array of bytes
 *
 * @example
 * base64UrlToBytes("__8") // Uint8Array([255, 255])
 */
export function base64UrlToBytes(base64url: string): Uint8Array {
  // Restore standard base64 format
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
  const padding = (4 - (base64.length % 4)) % 4;
  base64 += '='.repeat(padding);
  return base64ToBytes(base64);
}

// ============================================================================
// Secure Comparison
// ============================================================================

/**
 * Constant-time string comparison to prevent timing attacks
 *
 * Timing attacks can reveal secret values by measuring comparison time.
 * This function always takes the same amount of time regardless of
 * where strings differ.
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns true if strings are equal, false otherwise
 *
 * @example
 * constantTimeCompare(userToken, storedToken)
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still perform comparison to maintain constant time
    // Use a dummy comparison of same length
    const dummy = 'x'.repeat(Math.max(a.length, b.length));
    let dummyResult = 0;
    for (let i = 0; i < dummy.length; i++) {
      dummyResult |= dummy.charCodeAt(i) ^ dummy.charCodeAt(i);
    }
    // Suppress unused variable warning
    void dummyResult;
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Constant-time byte array comparison
 *
 * @param a - First byte array to compare
 * @param b - Second byte array to compare
 * @returns true if arrays are equal, false otherwise
 */
export function constantTimeCompareBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return result === 0;
}

// ============================================================================
// Hashing Utilities
// ============================================================================

/**
 * Compute SHA-256 hash of data
 *
 * @param data - String or bytes to hash
 * @returns Promise resolving to hex-encoded hash
 *
 * @example
 * const hash = await sha256("hello world");
 */
export async function sha256(data: string | Uint8Array): Promise<string> {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const buffer = bytes.buffer instanceof ArrayBuffer ? bytes.buffer : new Uint8Array(bytes).buffer;
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return bytesToHex(new Uint8Array(hashBuffer));
}

/**
 * Compute SHA-512 hash of data
 *
 * @param data - String or bytes to hash
 * @returns Promise resolving to hex-encoded hash
 */
export async function sha512(data: string | Uint8Array): Promise<string> {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const buffer = bytes.buffer instanceof ArrayBuffer ? bytes.buffer : new Uint8Array(bytes).buffer;
  const hashBuffer = await crypto.subtle.digest('SHA-512', buffer);
  return bytesToHex(new Uint8Array(hashBuffer));
}

// ============================================================================
// Token Generation
// ============================================================================

/**
 * Generate a cryptographically secure token
 *
 * Default generates 32 bytes (256 bits) of entropy, base64url encoded.
 *
 * @param byteLength - Number of random bytes (default: 32)
 * @returns Secure random token string
 *
 * @example
 * const csrfToken = generateSecureToken();
 * const sessionId = generateSecureToken(64);
 */
export function generateSecureToken(byteLength: number = 32): string {
  return generateRandomBase64Url(byteLength);
}

/**
 * Generate a nonce for Content Security Policy
 *
 * Generates a 16-byte (128-bit) base64-encoded nonce suitable for CSP.
 *
 * @returns Base64-encoded nonce string
 *
 * @example
 * const nonce = generateCSPNonce();
 * // Use in CSP header: script-src 'nonce-{nonce}'
 */
export function generateCSPNonce(): string {
  const bytes = getRandomBytes(16);
  return bytesToBase64(bytes);
}

// ============================================================================
// Key Derivation
// ============================================================================

/**
 * Derive a key from a password using PBKDF2
 *
 * Uses PBKDF2-SHA256 with configurable iterations for password-based
 * key derivation. Suitable for encrypting user data with user passwords.
 *
 * @param password - User password
 * @param salt - Salt bytes (should be random per-user)
 * @param iterations - Number of PBKDF2 iterations (default: 100000)
 * @param keyLength - Output key length in bytes (default: 32)
 * @returns Promise resolving to derived key bytes
 *
 * @example
 * const salt = getRandomBytes(16);
 * const key = await deriveKey(password, salt);
 */
export async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number = 100000,
  keyLength: number = 32
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const saltBuffer = salt.buffer instanceof ArrayBuffer ? salt.buffer : new Uint8Array(salt).buffer;
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: saltBuffer,
      iterations,
    },
    passwordKey,
    keyLength * 8
  );

  return new Uint8Array(derivedBits);
}

// ============================================================================
// Type Exports
// ============================================================================

export type {};
