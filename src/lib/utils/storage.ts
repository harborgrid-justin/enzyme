/**
 * @file Storage Utilities
 * @description Enterprise-grade storage utilities with TTL, encryption,
 * quota management, and cross-tab synchronization
 */

import { logger } from './logging';
import { globalEventBus } from './eventEmitter';

// ============================================================================
// Types
// ============================================================================

/**
 * Storage item with metadata
 */
export interface StorageItem<T> {
  value: T;
  timestamp: number;
  ttl?: number;
  version?: number;
  encrypted?: boolean;
}

/**
 * Storage configuration
 */
export interface StorageConfig {
  /** Storage prefix for namespacing */
  prefix?: string;
  /** Default TTL in milliseconds */
  defaultTTL?: number;
  /** Enable encryption for sensitive data */
  enableEncryption?: boolean;
  /** Encryption key (required if encryption enabled) */
  encryptionKey?: string;
  /** Storage version for migrations */
  version?: number;
  /** Maximum storage quota in bytes */
  maxQuota?: number;
  /** Enable cross-tab synchronization */
  syncAcrossTabs?: boolean;
}

/**
 * Storage statistics
 */
export interface StorageStats {
  itemCount: number;
  usedBytes: number;
  availableBytes: number;
  expiredCount: number;
}

/**
 * Migration function type
 */
export type MigrationFn<T> = (oldValue: unknown, oldVersion: number) => T;

// ============================================================================
// Encryption Utilities
// ============================================================================

/**
 * Simple XOR-based obfuscation (not cryptographically secure)
 * For production, use Web Crypto API with proper encryption
 */
function obfuscate(data: string, key: string): string {
  let result = '';
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(
      data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return btoa(result);
}

function deobfuscate(data: string, key: string): string {
  const decoded = atob(data);
  let result = '';
  for (let i = 0; i < decoded.length; i++) {
    result += String.fromCharCode(
      decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return result;
}

/**
 * Secure encryption using Web Crypto API
 */
export class CryptoStorage {
  private key: CryptoKey | null = null;
  private keyPromise: Promise<CryptoKey> | null = null;

  constructor(private passphrase: string) {}

  async encrypt(data: string): Promise<string> {
    const key = await this.getKey();
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(data)
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  async decrypt(data: string): Promise<string> {
    const key = await this.getKey();
    const combined = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));

    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  }

  private async getKey(): Promise<CryptoKey> {
    if (this.key) return this.key;
    if (this.keyPromise) return this.keyPromise;

    this.keyPromise = this.deriveKey();
    this.key = await this.keyPromise;
    return this.key;
  }

  private async deriveKey(): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.passphrase),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('storage-salt-v1'),
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }
}

// ============================================================================
// Storage Manager
// ============================================================================

/**
 * Enterprise storage manager with TTL, encryption, and quota management
 */
export class StorageManager {
  private storage: Storage;
  private config: Required<StorageConfig>;
  private readonly crypto: CryptoStorage | null = null;
  private migrations = new Map<string, MigrationFn<unknown>>();
  private broadcastChannel: BroadcastChannel | null = null;

  constructor(
    storage: Storage,
    config: StorageConfig = {}
  ) {
    this.storage = storage;
    this.config = {
      prefix: config.prefix ?? 'app',
      defaultTTL: config.defaultTTL ?? 0, // 0 = no expiration
      enableEncryption: config.enableEncryption ?? false,
      encryptionKey: config.encryptionKey ?? '',
      version: config.version ?? 1,
      maxQuota: config.maxQuota ?? 5 * 1024 * 1024, // 5MB default
      syncAcrossTabs: config.syncAcrossTabs ?? true,
    };

    if (this.config.enableEncryption && this.config.encryptionKey) {
      this.crypto = new CryptoStorage(this.config.encryptionKey);
    }

    if (this.config.syncAcrossTabs && typeof BroadcastChannel !== 'undefined') {
      this.setupCrossTabSync();
    }

    // Periodic cleanup of expired items
    this.scheduleCleanup();
  }

  /**
   * Set item in storage
   */
  async set<T>(
    key: string,
    value: T,
    options: { ttl?: number; encrypt?: boolean } = {}
  ): Promise<void> {
    const fullKey = this.getKey(key);
    const ttl = options.ttl ?? this.config.defaultTTL;
    const shouldEncrypt = options.encrypt ?? false;

    const item: StorageItem<T> = {
      value,
      timestamp: Date.now(),
      ttl: ttl > 0 ? ttl : undefined,
      version: this.config.version,
      encrypted: shouldEncrypt,
    };

    let serialized = JSON.stringify(item);

    // Check quota before saving
    const {size} = new Blob([serialized]);
    const stats = this.getStats();

    if (stats.usedBytes + size > this.config.maxQuota) {
      // Try to free space by removing expired items
      this.cleanup();

      const newStats = this.getStats();
      if (newStats.usedBytes + size > this.config.maxQuota) {
        throw new StorageQuotaError(
          `Storage quota exceeded. Need ${size} bytes, available ${this.config.maxQuota - newStats.usedBytes} bytes.`
        );
      }
    }

    // Encrypt if needed
    if (shouldEncrypt) {
      if (this.crypto) {
        serialized = await this.crypto.encrypt(serialized);
      } else if (this.config.encryptionKey) {
        serialized = obfuscate(serialized, this.config.encryptionKey);
      }
    }

    try {
      this.storage.setItem(fullKey, serialized);
      this.broadcast('set', key);
      logger.debug('[Storage] Set item', { key, ttl, encrypted: shouldEncrypt });
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new StorageQuotaError('Browser storage quota exceeded');
      }
      throw error;
    }
  }

  /**
   * Get item from storage
   */
  async get<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    const fullKey = this.getKey(key);

    try {
      let serialized = this.storage.getItem(fullKey);
      if (serialized === null || serialized === '') return defaultValue;

      // Try to decrypt if it looks encrypted (base64)
      let item: StorageItem<T>;

      try {
        item = JSON.parse(serialized) as StorageItem<T>;
      } catch {
        // Might be encrypted
        if (this.crypto) {
          serialized = await this.crypto.decrypt(serialized);
        } else if (this.config.encryptionKey !== '') {
          serialized = deobfuscate(serialized, this.config.encryptionKey);
        }
        item = JSON.parse(serialized) as StorageItem<T>;
      }

      // Check expiration
      if (item.ttl !== undefined && item.ttl > 0 && Date.now() - item.timestamp > item.ttl) {
        this.storage.removeItem(fullKey);
        logger.debug('[Storage] Item expired', { key });
        return defaultValue;
      }

      // Check version and run migration if needed
      if (item.version !== this.config.version) {
        const migration = this.migrations.get(key);
        if (migration) {
          const migratedValue = migration(item.value, item.version ?? 1) as T;
          await this.set(key, migratedValue);
          return migratedValue;
        }
      }

      return item.value;
    } catch (error) {
      logger.error('[Storage] Failed to get item', { key, error });
      return defaultValue;
    }
  }

  /**
   * Get item synchronously (no encryption support)
   */
  getSync<T>(key: string, defaultValue?: T): T | undefined {
    const fullKey = this.getKey(key);

    try {
      const serialized = this.storage.getItem(fullKey);
      if (serialized === null || serialized === '') return defaultValue;

      const item: StorageItem<T> = JSON.parse(serialized) as StorageItem<T>;

      // Check expiration
      if (item.ttl !== undefined && item.ttl > 0 && Date.now() - item.timestamp > item.ttl) {
        this.storage.removeItem(fullKey);
        return defaultValue;
      }

      return item.value;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Remove item from storage
   */
  remove(key: string): void {
    const fullKey = this.getKey(key);
    this.storage.removeItem(fullKey);
    this.broadcast('remove', key);
    logger.debug('[Storage] Removed item', { key });
  }

  /**
   * Check if key exists and is not expired
   */
  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== undefined;
  }

  /**
   * Clear all items with prefix
   */
  clear(): void {
    const keysToRemove: string[] = [];

    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key?.startsWith(`${this.config.prefix}:`) === true) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => this.storage.removeItem(key));
    this.broadcast('clear');
    logger.debug('[Storage] Cleared all items', { count: keysToRemove.length });
  }

  /**
   * Get all keys with prefix
   */
  keys(): string[] {
    const keys: string[] = [];
    const prefixLength = `${this.config.prefix}:`.length;

    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key?.startsWith(`${this.config.prefix}:`) === true) {
        keys.push(key.substring(prefixLength));
      }
    }

    return keys;
  }

  /**
   * Cleanup expired items
   */
  cleanup(): number {
    let cleaned = 0;

    for (let i = this.storage.length - 1; i >= 0; i--) {
      const key = this.storage.key(i);
      if (!(key?.startsWith(`${this.config.prefix}:`) ?? false)) continue;
      if (key === null) continue;

      try {
        const serialized = this.storage.getItem(key);
        if (serialized === null || serialized === '') continue;

        const item = JSON.parse(serialized) as StorageItem<unknown>;

        if (item.ttl !== undefined && item.ttl > 0 && Date.now() - item.timestamp > item.ttl) {
          this.storage.removeItem(key);
          cleaned++;
        }
      } catch {
        // If we can't parse it, it's corrupted - remove it
        this.storage.removeItem(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('[Storage] Cleaned expired items', { count: cleaned });
    }

    return cleaned;
  }

  /**
   * Get storage statistics
   */
  getStats(): StorageStats {
    let itemCount = 0;
    let usedBytes = 0;
    let expiredCount = 0;

    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (!(key?.startsWith(`${this.config.prefix}:`) ?? false)) continue;
      if (key === null) continue;

      itemCount++;
      const value = this.storage.getItem(key);
      if (value !== null && value !== '') {
        usedBytes += new Blob([key, value]).size;

        try {
          const item = JSON.parse(value) as StorageItem<unknown>;
          if (item.ttl !== undefined && item.ttl > 0 && Date.now() - item.timestamp > item.ttl) {
            expiredCount++;
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    return {
      itemCount,
      usedBytes,
      availableBytes: this.config.maxQuota - usedBytes,
      expiredCount,
    };
  }

  /**
   * Register a migration function for a key
   */
  registerMigration<T>(key: string, migration: MigrationFn<T>): void {
    this.migrations.set(key, migration as MigrationFn<unknown>);
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.broadcastChannel?.close();
    this.broadcastChannel = null;
  }

  /**
   * Get prefixed key
   */
  private getKey(key: string): string {
    return `${this.config.prefix}:${key}`;
  }

  /**
   * Setup cross-tab synchronization
   */
  private setupCrossTabSync(): void {
    this.broadcastChannel = new BroadcastChannel(`${this.config.prefix}-storage`);

    this.broadcastChannel.onmessage = (event: MessageEvent<{ type: string; key?: string }>) => {
      const { type, key } = event.data;

      if (type === 'set' && key !== undefined && key !== '') {
        globalEventBus.emitSync('data:invalidate', { keys: [key] });
      } else if (type === 'remove' && key !== undefined && key !== '') {
        globalEventBus.emitSync('data:invalidate', { keys: [key] });
      } else if (type === 'clear') {
        globalEventBus.emitSync('data:invalidate', { keys: ['*'] });
      }
    };
  }

  /**
   * Broadcast storage change to other tabs
   */
  private broadcast(type: 'set' | 'remove' | 'clear', key?: string): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type, key });
    }
  }

  /**
   * Schedule periodic cleanup of expired items
   */
  private scheduleCleanup(): void {
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanup(), 60000); // Every minute
    }
  }
}

// ============================================================================
// Storage Quota Error
// ============================================================================

/**
 * Error thrown when storage quota is exceeded
 */
export class StorageQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageQuotaError';
  }
}

// ============================================================================
// Session Storage Manager
// ============================================================================

/**
 * Session-scoped storage with automatic cleanup
 */
export class SessionStorageManager extends StorageManager {
  constructor(config: Omit<StorageConfig, 'syncAcrossTabs'> = {}) {
    super(
      typeof sessionStorage !== 'undefined'
        ? sessionStorage
        : createMemoryStorage(),
      { ...config, syncAcrossTabs: false }
    );
  }
}

// ============================================================================
// Memory Storage (SSR-safe fallback)
// ============================================================================

/**
 * In-memory storage implementation for SSR
 */
export function createMemoryStorage(): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    key(index: number): string | null {
      const keys = Array.from(store.keys());
      return keys[index] ?? null;
    },
    getItem(key: string): string | null {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      store.set(key, value);
    },
    removeItem(key: string): void {
      store.delete(key);
    },
    clear(): void {
      store.clear();
    },
  };
}

// ============================================================================
// Default Instances
// ============================================================================

/**
 * Default localStorage manager
 */
export const localStorageManager = new StorageManager(
  typeof localStorage !== 'undefined' ? localStorage : createMemoryStorage(),
  {
    prefix: 'app',
    syncAcrossTabs: true,
  }
);

/**
 * Default sessionStorage manager
 */
export const sessionStorageManager = new SessionStorageManager({
  prefix: 'app-session',
});

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Set item in local storage
 */
export async function setLocal<T>(
  key: string,
  value: T,
  options?: { ttl?: number; encrypt?: boolean }
): Promise<void> {
  return localStorageManager.set(key, value, options);
}

/**
 * Get item from local storage
 */
export async function getLocal<T>(key: string, defaultValue?: T): Promise<T | undefined> {
  return localStorageManager.get(key, defaultValue);
}

/**
 * Remove item from local storage
 */
export function removeLocal(key: string): void {
  localStorageManager.remove(key);
}

/**
 * Set item in session storage
 */
export async function setSession<T>(
  key: string,
  value: T,
  options?: { ttl?: number; encrypt?: boolean }
): Promise<void> {
  return sessionStorageManager.set(key, value, options);
}

/**
 * Get item from session storage
 */
export async function getSession<T>(key: string, defaultValue?: T): Promise<T | undefined> {
  return sessionStorageManager.get(key, defaultValue);
}

/**
 * Remove item from session storage
 */
export function removeSession(key: string): void {
  sessionStorageManager.remove(key);
}
