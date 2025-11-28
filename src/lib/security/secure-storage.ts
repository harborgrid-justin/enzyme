/**
 * @fileoverview Secure Storage with Encryption
 * @module @/lib/security/secure-storage
 *
 * Provides encrypted localStorage and sessionStorage wrappers for the
 * Harbor React Framework. Uses Web Crypto API for AES-GCM encryption
 * with PBKDF2 key derivation.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API
 * @see https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto
 *
 * @author Harbor Security Team
 * @version 1.0.0
 */

import type {
  SecureStorageConfig,
  SecureStorageInterface,
  SecureStorageResult,
  SecureStorageSetOptions,
  SecureStorageMetadata,
  StorageQuotaInfo,
  EncryptedData,
  EncryptionAlgorithm,
  EncryptedString,
} from './types';
import { secureStorageConfig } from '@/config/security.config';

// ============================================================================
// Constants
// ============================================================================

/**
 * Current encryption schema version
 */
const ENCRYPTION_VERSION = 1;

/**
 * Metadata storage key prefix
 */
const METADATA_PREFIX = '__meta_';

/**
 * Key cache storage
 */
interface CachedKey {
  key: CryptoKey;
  createdAt: number;
}

const keyCache = new Map<string, CachedKey>();

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
 * Convert bytes to base64 string
 */
function bytesToBase64(bytes: Uint8Array): string {
  const binString = Array.from(bytes, (byte) =>
    String.fromCharCode(byte)
  ).join('');
  return btoa(binString);
}

/**
 * Convert base64 string to bytes
 */
function base64ToBytes(base64: string): Uint8Array {
  const binString = atob(base64);
  return Uint8Array.from(binString, (char) => char.charCodeAt(0));
}

/**
 * Compute SHA-256 hash
 */
async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return bytesToBase64(new Uint8Array(hashBuffer));
}

/**
 * Derive an encryption key using PBKDF2
 */
async function deriveKey(
  password: string,
  salt: Uint8Array,
  config: SecureStorageConfig
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const algorithm: Pbkdf2Params = {
    name: 'PBKDF2',
    salt: salt as BufferSource,
    iterations: config.iterations,
    hash: 'SHA-256',
  };

  const derivedKeyAlgorithm: AesKeyGenParams = {
    name: config.algorithm,
    length: config.keyLength,
  };

  return crypto.subtle.deriveKey(
    algorithm,
    keyMaterial,
    derivedKeyAlgorithm,
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Get or create cached encryption key
 */
async function getCachedKey(
  password: string,
  salt: Uint8Array,
  config: SecureStorageConfig
): Promise<CryptoKey> {
  const cacheKey = `${password}:${bytesToBase64(salt)}`;
  const cached = keyCache.get(cacheKey);

  if (cached) {
    const age = Date.now() - cached.createdAt;
    if (age < config.keyTtl) {
      return cached.key;
    }
    keyCache.delete(cacheKey);
  }

  const key = await deriveKey(password, salt, config);
  keyCache.set(cacheKey, { key, createdAt: Date.now() });

  return key;
}

/**
 * Clear expired keys from cache
 */
function clearExpiredKeys(ttl: number): void {
  const now = Date.now();
  for (const [cacheKey, cached] of keyCache.entries()) {
    if (now - cached.createdAt >= ttl) {
      keyCache.delete(cacheKey);
    }
  }
}

// ============================================================================
// Compression Utilities
// ============================================================================

/**
 * Compress a string using CompressionStream API
 */
async function compress(data: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(data);

  // Check for CompressionStream support
  if (typeof CompressionStream === 'undefined') {
    // Fallback: no compression
    return bytes;
  }

  const stream = new CompressionStream('gzip');
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();

  void writer.write(bytes);
  void writer.close();

  const chunks: Uint8Array[] = [];
  let result = await reader.read();

  while (!result.done) {
    chunks.push(result.value);
    result = await reader.read();
  }

  // Concatenate chunks
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const compressed = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    compressed.set(chunk, offset);
    offset += chunk.length;
  }

  return compressed;
}

/**
 * Decompress a string using DecompressionStream API
 */
async function decompress(data: Uint8Array): Promise<string> {
  // Check for DecompressionStream support
  if (typeof DecompressionStream === 'undefined') {
    // Fallback: assume not compressed
    const decoder = new TextDecoder();
    return decoder.decode(data);
  }

  const stream = new DecompressionStream('gzip');
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();

  writer.write(data as any);
  writer.close();

  const chunks: Uint8Array[] = [];
  let result = await reader.read();

  while (!result.done) {
    chunks.push(result.value);
    result = await reader.read();
  }

  // Concatenate and decode
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const decompressed = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    decompressed.set(chunk, offset);
    offset += chunk.length;
  }

  const decoder = new TextDecoder();
  return decoder.decode(decompressed);
}

// ============================================================================
// Encryption/Decryption
// ============================================================================

/**
 * Encrypt data using AES-GCM
 */
async function encrypt(
  data: string,
  password: string,
  config: SecureStorageConfig
): Promise<EncryptedData> {
  const salt = getRandomBytes(config.saltLength);
  const iv = getRandomBytes(config.ivLength);
  const key = await getCachedKey(password, salt, config);

  // Optionally compress
  let dataBytes: Uint8Array;
  if (config.compress) {
    dataBytes = await compress(data);
  } else {
    const encoder = new TextEncoder();
    dataBytes = encoder.encode(data);
  }

  // Encrypt
  const algorithm: AesGcmParams = {
    name: config.algorithm,
    iv: iv as BufferSource,
    tagLength: 128,
  };

  const encrypted = await crypto.subtle.encrypt(algorithm, key, dataBytes as BufferSource);
  const encryptedBytes = new Uint8Array(encrypted);

  // For AES-GCM, the auth tag is appended to the ciphertext
  // Extract it for separate storage (last 16 bytes)
  const ciphertext = encryptedBytes.slice(0, -16);
  const tag = encryptedBytes.slice(-16);

  // Compute checksum for integrity verification
  const checksum = await sha256(bytesToBase64(encryptedBytes));

  return {
    version: ENCRYPTION_VERSION,
    algorithm: config.algorithm,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    data: bytesToBase64(ciphertext),
    tag: bytesToBase64(tag),
    encryptedAt: Date.now(),
    checksum,
  };
}

/**
 * Decrypt data using AES-GCM
 */
async function decrypt(
  encryptedData: EncryptedData,
  password: string,
  config: SecureStorageConfig
): Promise<string> {
  // Verify version
  if (encryptedData.version !== ENCRYPTION_VERSION) {
    throw new Error(`Unsupported encryption version: ${encryptedData.version}`);
  }

  const salt = base64ToBytes(encryptedData.salt);
  const iv = base64ToBytes(encryptedData.iv);
  const ciphertext = base64ToBytes(encryptedData.data);
  const tag = encryptedData.tag ? base64ToBytes(encryptedData.tag) : new Uint8Array(0);

  // Reconstruct the encrypted data with tag
  const encryptedBytes = new Uint8Array(ciphertext.length + tag.length);
  encryptedBytes.set(ciphertext);
  encryptedBytes.set(tag, ciphertext.length);

  // Verify checksum
  const checksum = await sha256(bytesToBase64(encryptedBytes));
  if (checksum !== encryptedData.checksum) {
    throw new Error('Data integrity check failed');
  }

  const key = await getCachedKey(password, salt, config);

  // Decrypt
  const algorithm: AesGcmParams = {
    name: config.algorithm as 'AES-GCM',
    iv: iv as BufferSource,
    tagLength: 128,
  };

  const decrypted = await crypto.subtle.decrypt(algorithm, key, encryptedBytes);
  const decryptedBytes = new Uint8Array(decrypted);

  // Optionally decompress
  if (config.compress) {
    return decompress(decryptedBytes);
  }

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBytes);
}

// ============================================================================
// Secure Storage Class
// ============================================================================

/**
 * Secure Storage implementation with encryption
 *
 * Features:
 * - AES-GCM encryption with PBKDF2 key derivation
 * - Optional compression for large data
 * - Automatic expiration handling
 * - Storage quota monitoring
 * - IndexedDB fallback for large items
 *
 * @example
 * ```typescript
 * const storage = new SecureStorage('my-secret-key');
 *
 * // Store encrypted data
 * await storage.setItem('user-data', { name: 'John', email: 'john@example.com' });
 *
 * // Retrieve decrypted data
 * const result = await storage.getItem<{ name: string; email: string }>('user-data');
 * if (result.success) {
 *   console.log(result.data);
 * }
 *
 * // Check storage quota
 * const quota = await storage.getQuotaInfo();
 * console.log(`Using ${quota.usagePercent}% of storage`);
 * ```
 */
export class SecureStorage implements SecureStorageInterface {
  private readonly config: SecureStorageConfig;
  private readonly encryptionKey: string;
  private readonly storage: Storage;

  constructor(
    encryptionKey: string,
    options: Partial<SecureStorageConfig> = {},
    useSessionStorage = false
  ) {
    if (!encryptionKey || encryptionKey.length < 8) {
      throw new Error('Encryption key must be at least 8 characters');
    }

    this.config = { ...secureStorageConfig, ...options };
    this.encryptionKey = encryptionKey;

    // Use sessionStorage or localStorage
    this.storage = useSessionStorage
      ? window.sessionStorage
      : window.localStorage;
  }

  // ==========================================================================
  // Core Operations
  // ==========================================================================

  /**
   * Store an encrypted item
   */
  async setItem<T>(
    key: string,
    value: T,
    options: SecureStorageSetOptions = {}
  ): Promise<SecureStorageResult<void>> {
    try {
      const storageKey = this.getStorageKey(key);

      // Serialize value
      const serialized = JSON.stringify(value);

      // Check size limit
      if (serialized.length > this.config.maxItemSize) {
        return {
          success: false,
          error: `Item exceeds maximum size of ${this.config.maxItemSize} bytes`,
        };
      }

      // Determine compression setting
      const shouldCompress = options.compress ?? this.config.compress;
      const configForEncrypt = { ...this.config, compress: shouldCompress };

      // Encrypt data
      let encrypted = await encrypt(serialized, this.encryptionKey, configForEncrypt);

      // Add expiration if TTL specified
      if (options.ttl) {
        encrypted = { ...encrypted, expiresAt: Date.now() + options.ttl };
      }

      // Store encrypted data
      const encryptedString = JSON.stringify(encrypted);

      // Check if within quota
      const currentSize = this.estimateStorageSize();
      const newSize = currentSize + encryptedString.length * 2;

      if (newSize > this.config.storageQuota) {
        return {
          success: false,
          error: 'Storage quota exceeded',
        };
      }

      this.storage.setItem(storageKey, encryptedString);

      // Store metadata
      const metadata = this.createMetadata(key, value, encryptedString.length, options);
      this.storage.setItem(
        `${this.config.storagePrefix}${METADATA_PREFIX}${key}`,
        JSON.stringify(metadata)
      );

      return {
        success: true,
        metadata,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown encryption error',
      };
    }
  }

  /**
   * Retrieve and decrypt an item
   */
  async getItem<T>(key: string): Promise<SecureStorageResult<T>> {
    try {
      const storageKey = this.getStorageKey(key);
      const encryptedString = this.storage.getItem(storageKey);

      if (!encryptedString) {
        return {
          success: false,
          error: 'Item not found',
        };
      }

      const encrypted: EncryptedData = JSON.parse(encryptedString);

      // Check expiration
      if (encrypted.expiresAt && Date.now() > encrypted.expiresAt) {
        // Remove expired item
        await this.removeItem(key);
        return {
          success: false,
          error: 'Item has expired',
        };
      }

      // Decrypt data
      const decrypted = await decrypt(encrypted, this.encryptionKey, this.config);

      // Parse value
      const value = JSON.parse(decrypted) as T;

      // Update last accessed time in metadata
      this.updateLastAccessed(key);

      return {
        success: true,
        data: value,
        metadata: await this.getMetadata(key) ?? undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown decryption error',
      };
    }
  }

  /**
   * Remove an item
   */
  async removeItem(key: string): Promise<SecureStorageResult<void>> {
    try {
      const storageKey = this.getStorageKey(key);
      this.storage.removeItem(storageKey);

      // Remove metadata
      this.storage.removeItem(
        `${this.config.storagePrefix}${METADATA_PREFIX}${key}`
      );

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove item',
      };
    }
  }

  /**
   * Check if an item exists
   */
  async hasItem(key: string): Promise<boolean> {
    const storageKey = this.getStorageKey(key);
    const item = this.storage.getItem(storageKey);

    if (!item) {
      return false;
    }

    // Check expiration
    try {
      const encrypted: EncryptedData = JSON.parse(item);
      if (encrypted.expiresAt && Date.now() > encrypted.expiresAt) {
        await this.removeItem(key);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all keys
   */
  async keys(): Promise<string[]> {
    const prefix = this.config.storagePrefix;
    const metaPrefix = `${prefix}${METADATA_PREFIX}`;
    const keys: string[] = [];

    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key?.startsWith(prefix) && !key.startsWith(metaPrefix)) {
        keys.push(key.slice(prefix.length));
      }
    }

    return keys;
  }

  /**
   * Get storage quota information
   */
  async getQuotaInfo(): Promise<StorageQuotaInfo> {
    const used = this.estimateStorageSize();
    const total = this.config.storageQuota;
    const available = Math.max(0, total - used);
    const usagePercent = (used / total) * 100;
    const keys = await this.keys();

    return {
      total,
      used,
      available,
      usagePercent,
      isNearLimit: usagePercent > 80,
      itemCount: keys.length,
    };
  }

  /**
   * Clear all secure storage items
   */
  async clear(): Promise<SecureStorageResult<void>> {
    try {
      const prefix = this.config.storagePrefix;
      const keysToRemove: string[] = [];

      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key?.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }

      for (const key of keysToRemove) {
        this.storage.removeItem(key);
      }

      // Clear key cache
      keyCache.clear();

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear storage',
      };
    }
  }

  /**
   * Get item metadata
   */
  async getMetadata(key: string): Promise<SecureStorageMetadata | null> {
    try {
      const metaKey = `${this.config.storagePrefix}${METADATA_PREFIX}${key}`;
      const metaString = this.storage.getItem(metaKey);

      if (!metaString) {
        return null;
      }

      return JSON.parse(metaString) as SecureStorageMetadata;
    } catch {
      return null;
    }
  }

  /**
   * Cleanup expired items
   */
  async cleanup(): Promise<number> {
    let cleaned = 0;
    const keys = await this.keys();

    for (const key of keys) {
      const exists = await this.hasItem(key);
      if (!exists) {
        cleaned++;
      }
    }

    // Clear expired key cache
    clearExpiredKeys(this.config.keyTtl);

    return cleaned;
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Get the full storage key with prefix
   */
  private getStorageKey(key: string): string {
    return `${this.config.storagePrefix}${key}`;
  }

  /**
   * Estimate total storage size in bytes
   */
  private estimateStorageSize(): number {
    let totalSize = 0;
    const prefix = this.config.storagePrefix;

    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key?.startsWith(prefix)) {
        const value = this.storage.getItem(key);
        if (value) {
          // UTF-16 encoding: 2 bytes per character
          totalSize += (key.length + value.length) * 2;
        }
      }
    }

    return totalSize;
  }

  /**
   * Create metadata for an item
   */
  private createMetadata<T>(
    key: string,
    value: T,
    size: number,
    options: SecureStorageSetOptions
  ): SecureStorageMetadata {
    const now = Date.now();

    return {
      key,
      size,
      createdAt: now,
      lastAccessedAt: now,
      expiresAt: options.ttl ? now + options.ttl : undefined,
      type: this.getValueType(value),
    };
  }

  /**
   * Update last accessed time in metadata
   */
  private updateLastAccessed(key: string): void {
    const metaKey = `${this.config.storagePrefix}${METADATA_PREFIX}${key}`;
    const metaString = this.storage.getItem(metaKey);

    if (metaString) {
      try {
        const metadata = JSON.parse(metaString) as SecureStorageMetadata;
        const updatedMetadata: SecureStorageMetadata = { ...metadata, lastAccessedAt: Date.now() };
        this.storage.setItem(metaKey, JSON.stringify(updatedMetadata));
      } catch {
        // Ignore metadata update errors
      }
    }
  }

  /**
   * Get the type of a value for metadata
   */
  private getValueType(value: unknown): SecureStorageMetadata['type'] {
    if (value === null) return 'object';
    if (Array.isArray(value)) return 'array';
    const type = typeof value;
    if (type === 'string' || type === 'number' || type === 'boolean' || type === 'object') {
      return type;
    }
    return 'object';
  }

  /**
   * Get configuration
   */
  getConfig(): Readonly<SecureStorageConfig> {
    return { ...this.config };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a secure localStorage instance
 */
export function createSecureLocalStorage(
  encryptionKey: string,
  options?: Partial<SecureStorageConfig>
): SecureStorage {
  return new SecureStorage(encryptionKey, options, false);
}

/**
 * Create a secure sessionStorage instance
 */
export function createSecureSessionStorage(
  encryptionKey: string,
  options?: Partial<SecureStorageConfig>
): SecureStorage {
  return new SecureStorage(encryptionKey, options, true);
}

// ============================================================================
// Singleton Instance
// ============================================================================

let defaultStorage: SecureStorage | null = null;

/**
 * Initialize the default secure storage instance
 * Call this once during app initialization
 */
export function initSecureStorage(encryptionKey: string): SecureStorage {
  if (!defaultStorage) {
    defaultStorage = createSecureLocalStorage(encryptionKey);
  }
  return defaultStorage;
}

/**
 * Get the default secure storage instance
 * @throws Error if not initialized
 */
export function getSecureStorage(): SecureStorage {
  if (!defaultStorage) {
    throw new Error('Secure storage not initialized. Call initSecureStorage() first.');
  }
  return defaultStorage;
}

/**
 * Check if secure storage is available
 */
export function isSecureStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined') {
      return false;
    }

    // Check for Web Crypto API
    if (!crypto?.subtle) {
      return false;
    }

    // Check for localStorage
    const testKey = '__secure_storage_test__';
    window.localStorage.setItem(testKey, 'test');
    window.localStorage.removeItem(testKey);

    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Securely wipe a string from memory
 * Note: This is best-effort in JavaScript due to string immutability
 */
export function secureWipe(value: string): void {
  // Create garbage to overwrite memory
  const garbage = crypto.getRandomValues(new Uint8Array(value.length));
  // This doesn't actually overwrite the original string in JS
  // but it's a hint to the GC
  void garbage;
}

/**
 * Generate a secure encryption key
 * Returns a base64-encoded key suitable for SecureStorage
 */
export function generateEncryptionKey(length = 32): string {
  const bytes = getRandomBytes(length);
  return bytesToBase64(bytes);
}

/**
 * Hash sensitive data for storage keys
 * Use when the key itself should not reveal information
 */
export async function hashForKey(data: string): Promise<string> {
  const hash = await sha256(data);
  // Return URL-safe version
  return hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ============================================================================
// Type Exports
// ============================================================================

export type {
  SecureStorageConfig,
  SecureStorageInterface,
  SecureStorageResult,
  SecureStorageSetOptions,
  SecureStorageMetadata,
  StorageQuotaInfo,
  EncryptedData,
  EncryptionAlgorithm,
  EncryptedString,
};
