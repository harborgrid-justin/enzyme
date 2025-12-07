/**
 * @file Secret Manager
 * @description Enterprise-grade secret management using VS Code SecretStorage API
 *
 * SECURITY: This service provides secure storage for sensitive data like API keys,
 * tokens, and credentials. Secrets are encrypted at rest and stored in OS-level
 * secure storage (Keychain on macOS, Credential Vault on Windows, Secret Service on Linux).
 *
 * OWASP Compliance:
 * - A02:2021 - Cryptographic Failures: Uses OS-level encryption
 * - A04:2021 - Insecure Design: Centralized secret management
 * - A07:2021 - Identification and Authentication Failures: Secure credential storage
 */

import * as vscode from 'vscode';
import { logger } from './logger';

// =============================================================================
// Types
// =============================================================================

/**
 * Secret key types for type safety
 */
export type SecretKey =
  | 'enzyme.apiKey'
  | 'enzyme.authToken'
  | 'enzyme.refreshToken'
  | 'enzyme.githubToken'
  | 'enzyme.npmToken'
  | 'enzyme.customApiKey'
  | `enzyme.custom.${string}`;

/**
 * Secret metadata
 */
export interface SecretMetadata {
  key: SecretKey;
  description: string;
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
}

// =============================================================================
// Secret Manager
// =============================================================================

/**
 * SECURITY: Centralized secret management service
 *
 * This service provides enterprise-grade secret storage using VS Code's
 * SecretStorage API, which stores secrets in:
 * - macOS: Keychain
 * - Windows: Credential Vault
 * - Linux: Secret Service API (libsecret)
 *
 * All secrets are encrypted at rest by the OS.
 *
 * @example
 * ```typescript
 * const secretManager = new SecretManager(context);
 *
 * // Store a secret
 * await secretManager.store('enzyme.apiKey', 'sk-1234567890');
 *
 * // Retrieve a secret
 * const apiKey = await secretManager.get('enzyme.apiKey');
 *
 * // Delete a secret
 * await secretManager.delete('enzyme.apiKey');
 * ```
 */
export class SecretManager {
  private storage: vscode.SecretStorage;
  private metadataKey = 'enzyme.secrets.metadata';
  private disposables: vscode.Disposable[] = [];

  /**
   * SECURITY: Initialize secret manager with VS Code's SecretStorage
   * @param context - VS Code extension context
   */
  constructor(private context: vscode.ExtensionContext) {
    this.storage = context.secrets;

    // Listen for secret changes
    this.disposables.push(
      this.storage.onDidChange((e: vscode.SecretStorageChangeEvent) => {
        logger.debug(`Secret changed: ${e.key}`);
      })
    );

    logger.info('SecretManager initialized with OS-level encryption');
  }

  /**
   * SECURITY: Store a secret securely
   *
   * Secrets are:
   * - Encrypted at rest by OS-level secure storage
   * - Never logged or exposed in plaintext
   * - Automatically synced across machines (if Settings Sync is enabled)
   *
   * @param key - Secret key (must match SecretKey type)
   * @param value - Secret value (will be encrypted)
   * @returns Promise that resolves when secret is stored
   * @throws Error if storage fails
   */
  public async store(key: SecretKey, value: string): Promise<void> {
    try {
      // SECURITY: Validate inputs
      if (!key || typeof key !== 'string') {
        throw new Error('Invalid secret key');
      }

      if (!value || typeof value !== 'string') {
        throw new Error('Invalid secret value');
      }

      // SECURITY: Never log the actual secret value
      logger.debug(`Storing secret: ${key} (length: ${value.length})`);

      // Store the secret (encrypted by VS Code)
      await this.storage.store(key, value);

      // Update metadata
      await this.updateMetadata(key, {
        key,
        description: this.getSecretDescription(key),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      logger.info(`Secret stored successfully: ${key}`);
    } catch (error) {
      logger.error(`Failed to store secret: ${key}`, error);
      throw new Error(`Failed to store secret: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * SECURITY: Retrieve a secret securely
   *
   * @param key - Secret key
   * @returns Promise that resolves with secret value or undefined if not found
   * @throws Error if retrieval fails
   */
  public async get(key: SecretKey): Promise<string | undefined> {
    try {
      // SECURITY: Never log the retrieved value
      logger.debug(`Retrieving secret: ${key}`);

      const value = await this.storage.get(key);

      if (value) {
        // Check if secret is expired
        const metadata = await this.getMetadata(key);
        if (metadata?.expiresAt && metadata.expiresAt < Date.now()) {
          logger.warn(`Secret expired: ${key}`);
          await this.delete(key);
          return undefined;
        }

        logger.debug(`Secret retrieved: ${key} (length: ${value.length})`);
      } else {
        logger.debug(`Secret not found: ${key}`);
      }

      return value;
    } catch (error) {
      logger.error(`Failed to retrieve secret: ${key}`, error);
      throw new Error(`Failed to retrieve secret: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * SECURITY: Delete a secret
   *
   * @param key - Secret key
   * @returns Promise that resolves when secret is deleted
   */
  public async delete(key: SecretKey): Promise<void> {
    try {
      logger.debug(`Deleting secret: ${key}`);

      await this.storage.delete(key);
      await this.removeMetadata(key);

      logger.info(`Secret deleted: ${key}`);
    } catch (error) {
      logger.error(`Failed to delete secret: ${key}`, error);
      throw new Error(`Failed to delete secret: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * SECURITY: Check if a secret exists
   *
   * @param key - Secret key
   * @returns Promise that resolves with true if secret exists
   */
  public async has(key: SecretKey): Promise<boolean> {
    const value = await this.get(key);
    return value !== undefined;
  }

  /**
   * SECURITY: Clear all secrets (use with caution!)
   *
   * This will delete ALL stored secrets. Should only be used for:
   * - User-initiated logout
   * - Extension uninstall cleanup
   * - Development/testing purposes
   *
   * @returns Promise that resolves when all secrets are cleared
   */
  public async clearAll(): Promise<void> {
    try {
      const metadata = await this.getAllMetadata();

      logger.warn('Clearing all secrets');

      for (const meta of metadata) {
        await this.storage.delete(meta.key);
      }

      await this.storage.delete(this.metadataKey);

      logger.info('All secrets cleared');
    } catch (error) {
      logger.error('Failed to clear secrets', error);
      throw new Error(`Failed to clear secrets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * SECURITY: List all secret keys (not values!)
   *
   * Returns only the keys, never the actual secret values.
   * Useful for UI display and management.
   *
   * @returns Promise that resolves with array of secret metadata
   */
  public async listSecrets(): Promise<SecretMetadata[]> {
    return this.getAllMetadata();
  }

  /**
   * SECURITY: Store a secret with expiration
   *
   * @param key - Secret key
   * @param value - Secret value
   * @param expiresIn - Expiration time in milliseconds
   */
  public async storeWithExpiration(
    key: SecretKey,
    value: string,
    expiresIn: number
  ): Promise<void> {
    await this.store(key, value);

    const metadata = await this.getMetadata(key);
    if (metadata) {
      metadata.expiresAt = Date.now() + expiresIn;
      await this.updateMetadata(key, metadata);
    }
  }

  /**
   * SECURITY: Rotate a secret
   *
   * Useful for rotating API keys, tokens, etc.
   *
   * @param key - Secret key
   * @param newValue - New secret value
   * @returns Promise that resolves with old value (for cleanup)
   */
  public async rotate(key: SecretKey, newValue: string): Promise<string | undefined> {
    const oldValue = await this.get(key);
    await this.store(key, newValue);
    return oldValue;
  }

  // =============================================================================
  // Metadata Management
  // =============================================================================

  /**
   * Get metadata for a secret
   */
  private async getMetadata(key: SecretKey): Promise<SecretMetadata | undefined> {
    const allMetadata = await this.getAllMetadata();
    return allMetadata.find(m => m.key === key);
  }

  /**
   * Get all secret metadata
   */
  private async getAllMetadata(): Promise<SecretMetadata[]> {
    try {
      const metadataJson = await this.storage.get(this.metadataKey);
      if (!metadataJson) {
        return [];
      }

      return JSON.parse(metadataJson);
    } catch (error) {
      logger.error('Failed to get secret metadata', error);
      return [];
    }
  }

  /**
   * Update metadata for a secret
   */
  private async updateMetadata(key: SecretKey, metadata: SecretMetadata): Promise<void> {
    const allMetadata = await this.getAllMetadata();
    const index = allMetadata.findIndex(m => m.key === key);

    if (index >= 0) {
      allMetadata[index] = metadata;
    } else {
      allMetadata.push(metadata);
    }

    await this.storage.store(this.metadataKey, JSON.stringify(allMetadata));
  }

  /**
   * Remove metadata for a secret
   */
  private async removeMetadata(key: SecretKey): Promise<void> {
    const allMetadata = await this.getAllMetadata();
    const filtered = allMetadata.filter(m => m.key !== key);
    await this.storage.store(this.metadataKey, JSON.stringify(filtered));
  }

  /**
   * Get human-readable description for a secret key
   */
  private getSecretDescription(key: SecretKey): string {
    const descriptions: Record<string, string> = {
      'enzyme.apiKey': 'Enzyme API Key',
      'enzyme.authToken': 'Authentication Token',
      'enzyme.refreshToken': 'Refresh Token',
      'enzyme.githubToken': 'GitHub Personal Access Token',
      'enzyme.npmToken': 'NPM Authentication Token',
      'enzyme.customApiKey': 'Custom API Key',
    };

    return descriptions[key] || 'Custom Secret';
  }

  /**
   * Dispose secret manager
   */
  public dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let secretManagerInstance: SecretManager | null = null;

/**
 * SECURITY: Get or create singleton SecretManager instance
 *
 * @param context - VS Code extension context
 * @returns SecretManager instance
 */
export function getSecretManager(context: vscode.ExtensionContext): SecretManager {
  if (!secretManagerInstance) {
    secretManagerInstance = new SecretManager(context);
  }
  return secretManagerInstance;
}

/**
 * SECURITY: Reset secret manager (for testing)
 */
export function resetSecretManager(): void {
  if (secretManagerInstance) {
    secretManagerInstance.dispose();
    secretManagerInstance = null;
  }
}
