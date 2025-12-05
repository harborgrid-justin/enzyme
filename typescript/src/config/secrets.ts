/**
 * Secure secrets management with encryption support.
 *
 * @module @missionfabric-js/enzyme-typescript/config/secrets
 *
 * @example
 * ```typescript
 * import { SecretsManager } from '@missionfabric-js/enzyme-typescript/config';
 *
 * const secrets = new SecretsManager({
 *   encrypt: true,
 *   encryptionOptions: {
 *     key: process.env.ENCRYPTION_KEY
 *   }
 * });
 *
 * await secrets.set('apiKey', 'secret-value');
 * const apiKey = await secrets.get('apiKey');
 * ```
 */

import * as crypto from 'crypto';
import type { SecretOptions, EncryptionOptions } from './types';

/**
 * Secret metadata.
 */
export interface SecretMetadata {
  /** When the secret was created */
  createdAt: Date;

  /** When the secret was last modified */
  updatedAt: Date;

  /** When the secret expires (optional) */
  expiresAt?: Date;

  /** Secret tags for organization */
  tags?: string[];

  /** Whether the secret is encrypted */
  encrypted: boolean;
}

/**
 * Secret entry.
 */
export interface SecretEntry {
  /** Secret value */
  value: string;

  /** Secret metadata */
  metadata: SecretMetadata;
}

/**
 * Secrets manager class.
 *
 * @example
 * ```typescript
 * const manager = new SecretsManager({
 *   encrypt: true,
 *   encryptionOptions: {
 *     algorithm: 'aes-256-gcm',
 *     key: Buffer.from(process.env.MASTER_KEY!, 'hex')
 *   },
 *   cache: true,
 *   cacheTTL: 60000 // 1 minute
 * });
 *
 * await manager.set('db.password', 'supersecret');
 * const password = await manager.get('db.password');
 * ```
 */
export class SecretsManager {
  private secrets = new Map<string, SecretEntry>();
  private cache = new Map<string, { value: string; expiresAt: number }>();
  private encryptionKey?: Buffer;

  constructor(private options: SecretOptions = {}) {
    if (options.encrypt && options.encryptionOptions?.key) {
      this.encryptionKey = this.deriveKey(options.encryptionOptions);
    }
  }

  /**
   * Set a secret value.
   *
   * @param key - Secret key
   * @param value - Secret value
   * @param metadata - Optional metadata
   *
   * @example
   * ```typescript
   * await secrets.set('apiKey', 'sk_live_123', {
   *   tags: ['production', 'stripe'],
   *   expiresAt: new Date('2024-12-31')
   * });
   * ```
   */
  async set(
    key: string,
    value: string,
    metadata?: Partial<SecretMetadata>
  ): Promise<void> {
    let storedValue = value;

    // Encrypt if enabled
    if (this.options.encrypt && this.encryptionKey) {
      storedValue = await this.encrypt(value);
    }

    const entry: SecretEntry = {
      value: storedValue,
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        encrypted: !!this.options.encrypt,
        ...metadata,
      },
    };

    this.secrets.set(key, entry);

    // Clear cache for this key
    this.cache.delete(key);
  }

  /**
   * Get a secret value.
   *
   * @param key - Secret key
   * @returns The decrypted secret value
   * @throws {Error} If secret not found or expired
   *
   * @example
   * ```typescript
   * const apiKey = await secrets.get('apiKey');
   * console.log('API Key:', apiKey);
   * ```
   */
  async get(key: string): Promise<string> {
    // Check cache first
    if (this.options.cache) {
      const cached = this.cache.get(key);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
      }
    }

    const entry = this.secrets.get(key);

    if (!entry) {
      throw new Error(`Secret not found: ${key}`);
    }

    // Check expiration
    if (entry.metadata.expiresAt && entry.metadata.expiresAt < new Date()) {
      this.secrets.delete(key);
      throw new Error(`Secret expired: ${key}`);
    }

    let value = entry.value;

    // Decrypt if encrypted
    if (entry.metadata.encrypted && this.encryptionKey) {
      value = await this.decrypt(value);
    }

    // Update cache
    if (this.options.cache) {
      this.cache.set(key, {
        value,
        expiresAt: Date.now() + (this.options.cacheTTL || 60000),
      });
    }

    return value;
  }

  /**
   * Check if a secret exists.
   *
   * @param key - Secret key
   * @returns True if the secret exists and is not expired
   *
   * @example
   * ```typescript
   * if (await secrets.has('apiKey')) {
   *   console.log('API key is configured');
   * }
   * ```
   */
  async has(key: string): Promise<boolean> {
    const entry = this.secrets.get(key);

    if (!entry) {
      return false;
    }

    // Check expiration
    if (entry.metadata.expiresAt && entry.metadata.expiresAt < new Date()) {
      this.secrets.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a secret.
   *
   * @param key - Secret key
   *
   * @example
   * ```typescript
   * await secrets.delete('oldApiKey');
   * ```
   */
  async delete(key: string): Promise<void> {
    this.secrets.delete(key);
    this.cache.delete(key);
  }

  /**
   * List all secret keys.
   *
   * @param filter - Optional filter function
   * @returns Array of secret keys
   *
   * @example
   * ```typescript
   * // Get all production secrets
   * const prodKeys = await secrets.list((meta) =>
   *   meta.tags?.includes('production')
   * );
   * ```
   */
  async list(
    filter?: (metadata: SecretMetadata) => boolean
  ): Promise<string[]> {
    const keys: string[] = [];

    for (const [key, entry] of this.secrets.entries()) {
      // Skip expired secrets
      if (
        entry.metadata.expiresAt &&
        entry.metadata.expiresAt < new Date()
      ) {
        this.secrets.delete(key);
        continue;
      }

      // Apply filter if provided
      if (filter && !filter(entry.metadata)) {
        continue;
      }

      keys.push(key);
    }

    return keys;
  }

  /**
   * Get secret metadata without retrieving the value.
   *
   * @param key - Secret key
   * @returns Secret metadata
   *
   * @example
   * ```typescript
   * const metadata = await secrets.getMetadata('apiKey');
   * console.log('Created:', metadata.createdAt);
   * ```
   */
  async getMetadata(key: string): Promise<SecretMetadata> {
    const entry = this.secrets.get(key);

    if (!entry) {
      throw new Error(`Secret not found: ${key}`);
    }

    return entry.metadata;
  }

  /**
   * Rotate a secret (update with new value, keeping metadata).
   *
   * @param key - Secret key
   * @param newValue - New secret value
   *
   * @example
   * ```typescript
   * await secrets.rotate('apiKey', 'new-secret-value');
   * ```
   */
  async rotate(key: string, newValue: string): Promise<void> {
    const entry = this.secrets.get(key);

    if (!entry) {
      throw new Error(`Secret not found: ${key}`);
    }

    await this.set(key, newValue, {
      ...entry.metadata,
      updatedAt: new Date(),
    });
  }

  /**
   * Clear all secrets.
   *
   * @example
   * ```typescript
   * await secrets.clear();
   * ```
   */
  async clear(): Promise<void> {
    this.secrets.clear();
    this.cache.clear();
  }

  /**
   * Export secrets (encrypted) for backup.
   *
   * @returns JSON string of encrypted secrets
   *
   * @example
   * ```typescript
   * const backup = await secrets.export();
   * await fs.writeFile('secrets-backup.json', backup);
   * ```
   */
  async export(): Promise<string> {
    const data: Record<string, SecretEntry> = {};

    for (const [key, entry] of this.secrets.entries()) {
      data[key] = entry;
    }

    return JSON.stringify(data, null, 2);
  }

  /**
   * Import secrets from backup.
   *
   * @param data - JSON string of secrets
   *
   * @example
   * ```typescript
   * const backup = await fs.readFile('secrets-backup.json', 'utf-8');
   * await secrets.import(backup);
   * ```
   */
  async import(data: string): Promise<void> {
    const parsed = JSON.parse(data) as Record<string, SecretEntry>;

    for (const [key, entry] of Object.entries(parsed)) {
      // Convert date strings back to Date objects
      entry.metadata.createdAt = new Date(entry.metadata.createdAt);
      entry.metadata.updatedAt = new Date(entry.metadata.updatedAt);
      if (entry.metadata.expiresAt) {
        entry.metadata.expiresAt = new Date(entry.metadata.expiresAt);
      }

      this.secrets.set(key, entry);
    }
  }

  /**
   * Derive encryption key from options.
   *
   * @param options - Encryption options
   * @returns Derived key buffer
   */
  private deriveKey(options: EncryptionOptions): Buffer {
    if (Buffer.isBuffer(options.key)) {
      return options.key;
    }

    if (typeof options.key === 'string') {
      // If a salt is provided, derive the key
      if (options.salt) {
        const salt = Buffer.isBuffer(options.salt)
          ? options.salt
          : Buffer.from(options.salt);

        const keyDerivation = options.keyDerivation || 'pbkdf2';
        const iterations = options.iterations || 100000;

        switch (keyDerivation) {
          case 'pbkdf2':
            return crypto.pbkdf2Sync(
              options.key,
              salt,
              iterations,
              32,
              'sha256'
            );

          case 'scrypt':
            return crypto.scryptSync(options.key, salt, 32);

          default:
            throw new Error(`Unsupported key derivation: ${keyDerivation}`);
        }
      }

      // Otherwise, use the key directly as hex
      return Buffer.from(options.key, 'hex');
    }

    throw new Error('Invalid encryption key');
  }

  /**
   * Encrypt a value.
   *
   * @param value - Value to encrypt
   * @returns Encrypted value as base64 string
   */
  private async encrypt(value: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not set');
    }

    const algorithm = this.options.encryptionOptions?.algorithm || 'aes-256-gcm';

    if (algorithm === 'aes-256-gcm') {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(algorithm, this.encryptionKey, iv);

      let encrypted = cipher.update(value, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = (cipher as crypto.CipherGCM).getAuthTag();

      // Format: iv:authTag:encrypted
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } else {
      // For CBC modes
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(algorithm, this.encryptionKey, iv);

      let encrypted = cipher.update(value, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Format: iv:encrypted
      return `${iv.toString('hex')}:${encrypted}`;
    }
  }

  /**
   * Decrypt a value.
   *
   * @param encrypted - Encrypted value
   * @returns Decrypted value
   */
  private async decrypt(encrypted: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not set');
    }

    const algorithm = this.options.encryptionOptions?.algorithm || 'aes-256-gcm';

    if (algorithm === 'aes-256-gcm') {
      const [ivHex, authTagHex, encryptedHex] = encrypted.split(':');

      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = crypto.createDecipheriv(
        algorithm,
        this.encryptionKey,
        iv
      ) as crypto.DecipherGCM;

      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } else {
      // For CBC modes
      const [ivHex, encryptedHex] = encrypted.split(':');

      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv(
        algorithm,
        this.encryptionKey,
        iv
      );

      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    }
  }
}

/**
 * Scan configuration for potential secrets and warn.
 *
 * @param config - Configuration object
 * @param patterns - Patterns to identify secrets
 * @returns Array of potential secret paths
 *
 * @example
 * ```typescript
 * const secrets = scanForSecrets(config, [
 *   /password/i,
 *   /api[_-]?key/i,
 *   /secret/i,
 *   /token/i
 * ]);
 *
 * if (secrets.length > 0) {
 *   console.warn('Potential secrets found:', secrets);
 * }
 * ```
 */
export function scanForSecrets(
  config: Record<string, unknown>,
  patterns: RegExp[] = [
    /password/i,
    /passwd/i,
    /secret/i,
    /api[_-]?key/i,
    /private[_-]?key/i,
    /token/i,
    /credential/i,
  ],
  path = ''
): string[] {
  const secrets: string[] = [];

  for (const [key, value] of Object.entries(config)) {
    const currentPath = path ? `${path}.${key}` : key;

    // Check if key matches secret pattern
    const isSecret = patterns.some((pattern) => pattern.test(key));

    if (isSecret && typeof value === 'string') {
      secrets.push(currentPath);
    }

    // Recursively scan nested objects
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      secrets.push(
        ...scanForSecrets(
          value as Record<string, unknown>,
          patterns,
          currentPath
        )
      );
    }
  }

  return secrets;
}

/**
 * Redact secrets from a configuration object.
 *
 * @param config - Configuration object
 * @param patterns - Patterns to identify secrets
 * @param redactValue - Value to use for redaction
 * @returns Configuration with secrets redacted
 *
 * @example
 * ```typescript
 * const safeConfig = redactSecrets({
 *   database: { password: 'secret123' },
 *   apiKey: 'abc123'
 * });
 *
 * console.log(safeConfig);
 * // { database: { password: '[REDACTED]' }, apiKey: '[REDACTED]' }
 * ```
 */
export function redactSecrets<T extends Record<string, unknown>>(
  config: T,
  patterns: RegExp[] = [
    /password/i,
    /passwd/i,
    /secret/i,
    /api[_-]?key/i,
    /private[_-]?key/i,
    /token/i,
    /credential/i,
  ],
  redactValue = '[REDACTED]'
): T {
  const result: any = {};

  for (const [key, value] of Object.entries(config)) {
    // Check if key matches secret pattern
    const isSecret = patterns.some((pattern) => pattern.test(key));

    if (isSecret && typeof value === 'string') {
      result[key] = redactValue;
    } else if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value)
    ) {
      result[key] = redactSecrets(
        value as Record<string, unknown>,
        patterns,
        redactValue
      );
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

/**
 * Generate a secure encryption key.
 *
 * @param bits - Key size in bits (128, 192, or 256)
 * @returns Hex-encoded encryption key
 *
 * @example
 * ```typescript
 * const key = generateEncryptionKey(256);
 * console.log('Encryption key:', key);
 * // Store this key securely, e.g., in environment variables
 * ```
 */
export function generateEncryptionKey(bits: 128 | 192 | 256 = 256): string {
  const bytes = bits / 8;
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Generate a secure salt for key derivation.
 *
 * @param bytes - Salt size in bytes
 * @returns Hex-encoded salt
 *
 * @example
 * ```typescript
 * const salt = generateSalt(32);
 * console.log('Salt:', salt);
 * ```
 */
export function generateSalt(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}
