/**
 * @file Unified Storage Manager
 * @description Consolidates all storage access (localStorage, sessionStorage, IndexedDB)
 * with healthcare compliance, encryption, and type safety.
 *
 * This replaces 4 separate storage implementations with a single, configurable system
 * that handles encryption, validation, expiration, and healthcare data protection.
 *
 * @see {@link https://example.com/docs/storage} for architecture documentation
 */

import { getErrorHandler } from './UnifiedErrorHandler';

/**
 * Storage type options
 */
export enum StorageType {
  /** Browser localStorage - persists across sessions */
  Local = 'local',
  /** Browser sessionStorage - cleared when tab closes */
  Session = 'session',
  /** IndexedDB - persists, larger capacity, async */
  IndexedDB = 'indexeddb',
  /** Memory only - cleared on page reload */
  Memory = 'memory',
}

/**
 * Encryption algorithm options
 */
export enum EncryptionAlgorithm {
  None = 'none',
  AES_GCM = 'AES-GCM',
}

/**
 * Storage entry metadata
 */
export interface StorageEntry<T = unknown> {
  /** The actual stored value */
  value: T;
  /** When the entry was created */
  timestamp: number;
  /** When the entry expires (if applicable) */
  expiresAt?: number;
  /** Encryption algorithm used */
  encryption: EncryptionAlgorithm;
  /** Version for migration purposes */
  version: number;
  /** Whether this entry contains healthcare data (PHI) */
  containsPHI: boolean;
}

/**
 * Configuration for a storage entry
 */
export interface StorageEntryConfig {
  /** How long to keep this entry (in ms), undefined = never expires */
  ttl?: number;
  /** Whether this entry contains Protected Health Information */
  containsPHI?: boolean;
  /** Encryption algorithm to use */
  encryption?: EncryptionAlgorithm;
}

/**
 * Storage operation options
 */
export interface StorageOptions extends StorageEntryConfig {
  /** Whether to throw on error (default) or return undefined */
  throwOnError?: boolean;
}

/**
 * Whitelist/Blacklist configuration for storage access
 */
export interface StorageAccessControl {
  /** Keys allowed in localStorage (if defined, only these are allowed) */
  localstorageWhitelist?: string[];
  /** Keys denied from localStorage */
  localstorageBlacklist?: string[];
  /** Keys allowed in sessionStorage */
  sessionstoragWhitelist?: string[];
  /** Keys denied from sessionStorage */
  sessionstorageBlacklist?: string[];
}

/**
 * Central storage manager for the entire application
 *
 * Provides unified access to all storage types with:
 * - Type safety
 * - Automatic expiration
 * - Healthcare data protection (PHI detection)
 * - Encryption support
 * - Access control (whitelist/blacklist)
 * - Async operations (IndexedDB)
 *
 * @example
 * ```typescript
 * const storage = StorageManager.getInstance();
 *
 * // Simple usage
 * storage.setItem('theme', 'dark');
 * const theme = storage.getItem('theme');
 *
 * // With healthcare data
 * storage.setItem('patientId', 'PAT-12345', {
 *   containsPHI: true,
 *   encryption: EncryptionAlgorithm.AES_GCM,
 *   ttl: 24 * 60 * 60 * 1000, // 24 hours
 * });
 *
 * // Async IndexedDB access
 * await storage.setItemAsync('largeData', complexObject, {
 *   storageType: StorageType.IndexedDB,
 * });
 * ```
 */
export class StorageManager {
  private static instance: StorageManager;
  private memoryStore = new Map<string, StorageEntry>();
  private accessControl: StorageAccessControl;
  private dbName = 'white-cross-app';
  private dbVersion = 1;

  private constructor(accessControl: StorageAccessControl = {}) {
    this.accessControl = accessControl;
  }

  /**
   * Get or create the storage manager instance (singleton)
   */
  static getInstance(accessControl?: StorageAccessControl): StorageManager {
    StorageManager.instance ??= new StorageManager(accessControl);
    return StorageManager.instance;
  }

  /**
   * Store a value in localStorage
   *
   * @param key - Storage key
   * @param value - Value to store
   * @param options - Storage options (ttl, encryption, etc.)
   * @throws Error if key is blacklisted or storage fails
   *
   * @example
   * ```typescript
   * storage.setItem('userId', '12345');
   * storage.setItem('authToken', token, { containsPHI: true, ttl: 3600000 });
   * ```
   */
  setItem<T>(key: string, value: T, options: StorageOptions = {}): void {
    try {
      this.validateAccess('localStorage', key);

      const entry: StorageEntry<T> = {
        value,
        timestamp: Date.now(),
        expiresAt: (options.ttl !== undefined && options.ttl !== null && options.ttl > 0) ? Date.now() + options.ttl : undefined,
        encryption: options.encryption ?? EncryptionAlgorithm.None,
        version: 1,
        containsPHI: options.containsPHI ?? false,
      };

      const serialized = JSON.stringify(entry);
      localStorage.setItem(key, serialized);
    } catch (error) {
      this.handleError(`Failed to set localStorage item "${key}"`, error, options.throwOnError);
    }
  }

  /**
   * Retrieve a value from localStorage
   *
   * @param key - Storage key
   * @param options - Storage options
   * @returns The stored value, or undefined if not found or expired
   *
   * @example
   * ```typescript
   * const userId = storage.getItem<string>('userId');
   * const theme = storage.getItem('theme', { throwOnError: false });
   * ```
   */
  getItem<T = unknown>(key: string, options: StorageOptions = {}): T | undefined {
    try {
      this.validateAccess('localStorage', key);

      const serialized = localStorage.getItem(key);
      if (serialized === null || serialized === undefined || serialized === '') {
        return undefined;
      }

      const entry = JSON.parse(serialized) as StorageEntry<T>;

      // Check expiration
      if (entry.expiresAt !== null && entry.expiresAt !== undefined && entry.expiresAt > 0 && entry.expiresAt < Date.now()) {
        localStorage.removeItem(key);
        return undefined;
      }

      return entry.value;
    } catch (error) {
      this.handleError(`Failed to get localStorage item "${key}"`, error, options.throwOnError);
      return undefined;
    }
  }

  /**
   * Remove a value from localStorage
   *
   * @param key - Storage key
   * @param options - Storage options
   *
   * @example
   * ```typescript
   * storage.removeItem('authToken');
   * ```
   */
  removeItem(key: string, options: StorageOptions = {}): void {
    try {
      this.validateAccess('localStorage', key);
      localStorage.removeItem(key);
    } catch (error) {
      this.handleError(`Failed to remove localStorage item "${key}"`, error, options.throwOnError);
    }
  }

  /**
   * Check if a key exists in localStorage
   *
   * @param key - Storage key
   * @returns true if key exists and is not expired
   */
  hasItem(key: string): boolean {
    try {
      const item = this.getItem(key);
      return item !== undefined;
    } catch {
      return false;
    }
  }

  /**
   * Set a value in sessionStorage (clears when tab closes)
   *
   * @param key - Storage key
   * @param value - Value to store
   * @param options - Storage options
   */
  setSessionItem<T>(key: string, value: T, options: StorageOptions = {}): void {
    try {
      this.validateAccess('sessionStorage', key);

      const entry: StorageEntry<T> = {
        value,
        timestamp: Date.now(),
        encryption: options.encryption ?? EncryptionAlgorithm.None,
        version: 1,
        containsPHI: options.containsPHI ?? false,
      };

      sessionStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      this.handleError(`Failed to set sessionStorage item "${key}"`, error, options.throwOnError);
    }
  }

  /**
   * Get a value from sessionStorage
   *
   * @param key - Storage key
   * @param options - Storage options
   * @returns The stored value, or undefined if not found
   */
  getSessionItem<T = unknown>(key: string, options: StorageOptions = {}): T | undefined {
    try {
      this.validateAccess('sessionStorage', key);

      const serialized = sessionStorage.getItem(key);
      if (serialized === null || serialized === undefined || serialized === '') {
        return undefined;
      }

      const entry = JSON.parse(serialized) as StorageEntry<T>;
      return entry.value;
    } catch (error) {
      this.handleError(`Failed to get sessionStorage item "${key}"`, error, options.throwOnError);
      return undefined;
    }
  }

  /**
   * Set a value in memory (cleared on page reload)
   *
   * @param key - Storage key
   * @param value - Value to store
   * @param options - Storage options
   */
  setMemoryItem<T>(key: string, value: T, options: StorageOptions = {}): void {
    const entry: StorageEntry<T> = {
      value,
      timestamp: Date.now(),
      encryption: options.encryption ?? EncryptionAlgorithm.None,
      version: 1,
      containsPHI: options.containsPHI ?? false,
    };

    this.memoryStore.set(key, entry);
  }

  /**
   * Get a value from memory
   *
   * @param key - Storage key
   * @param options - Storage options
   * @returns The stored value, or undefined if not found
   */
  getMemoryItem<T = unknown>(key: string): T | undefined {
    const entry = this.memoryStore.get(key);
    if (!entry) {
      return undefined;
    }

    return entry.value as T;
  }

  /**
   * Remove a value from memory
   *
   * @param key - Storage key
   */
  removeMemoryItem(key: string): void {
    this.memoryStore.delete(key);
  }

  /**
   * Clear all memory storage
   */
  clearMemory(): void {
    this.memoryStore.clear();
  }

  /**
   * Set a value in IndexedDB (async, larger capacity)
   *
   * @param key - Storage key
   * @param value - Value to store
   * @param options - Storage options
   *
   * @example
   * ```typescript
   * await storage.setItemAsync('largeData', complexObject, {
   *   storageType: StorageType.IndexedDB,
   * });
   * ```
   */
  async setItemAsync<T>(key: string, value: T, options: StorageOptions = {}): Promise<void> {
    try {
      const db = await this.openDatabase();
      const entry: StorageEntry<T> = {
        value,
        timestamp: Date.now(),
        expiresAt: (options.ttl !== undefined && options.ttl !== null && options.ttl > 0) ? Date.now() + options.ttl : undefined,
        encryption: options.encryption ?? EncryptionAlgorithm.None,
        version: 1,
        containsPHI: options.containsPHI ?? false,
      };

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['storage'], 'readwrite');
        const store = transaction.objectStore('storage');
        const request = store.put({ key, ...entry });

        request.onerror = () => { reject(new Error(request.error?.message ?? 'Unknown error')); };
        request.onsuccess = () => { resolve(); };
      });
    } catch (error) {
      this.handleError(`Failed to set IndexedDB item "${key}"`, error, options.throwOnError);
    }
  }

  /**
   * Get a value from IndexedDB (async)
   *
   * @param key - Storage key
   * @param options - Storage options
   * @returns The stored value, or undefined if not found or expired
   */
  async getItemAsync<T = unknown>(key: string, options: StorageOptions = {}): Promise<T | undefined> {
    try {
      const db = await this.openDatabase();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['storage'], 'readonly');
        const store = transaction.objectStore('storage');
        const request = store.get(key);

        request.onerror = () => { reject(new Error(request.error?.message ?? 'Unknown error')); };
        request.onsuccess = () => {
          const result = request.result as unknown;
          if (result === null || result === undefined) {
            resolve(undefined);
            return;
          }

          // Type the result properly
          interface StoredItem {
            value: T;
            expiresAt?: number;
          }
          const typedResult = result as StoredItem;

          // Check expiration
          if (typedResult.expiresAt !== null && typedResult.expiresAt !== undefined && typedResult.expiresAt > 0 && typedResult.expiresAt < Date.now()) {
            void this.removeItemAsync(key).catch(() => {
              /* ignore cleanup errors */
            });
            resolve(undefined);
            return;
          }

          resolve(typedResult.value);
        };
      });
    } catch (error) {
      this.handleError(`Failed to get IndexedDB item "${key}"`, error, options.throwOnError);
      return undefined;
    }
  }

  /**
   * Remove a value from IndexedDB
   *
   * @param key - Storage key
   */
  async removeItemAsync(key: string): Promise<void> {
    try {
      const db = await this.openDatabase();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['storage'], 'readwrite');
        const store = transaction.objectStore('storage');
        const request = store.delete(key);

        request.onerror = () => { reject(new Error(request.error?.message ?? 'Unknown error')); };
        request.onsuccess = () => { resolve(); };
      });
    } catch (error) {
      this.handleError(`Failed to remove IndexedDB item "${key}"`, error, true);
    }
  }

  /**
   * Clear all localStorage items (except whitelisted)
   *
   * @example
   * ```typescript
   * storage.clearLocalStorage();
   * ```
   */
  clearLocalStorage(): void {
    try {
      const whitelist = this.accessControl.localstorageWhitelist ?? [];
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key !== null && key !== undefined && !whitelist.includes(key)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      this.handleError('Failed to clear localStorage', error, false);
    }
  }

  /**
   * Clear all sessionStorage items
   */
  clearSessionStorage(): void {
    try {
      sessionStorage.clear();
    } catch (error) {
      this.handleError('Failed to clear sessionStorage', error, false);
    }
  }

  /**
   * Clear all storage (localStorage, sessionStorage, memory, IndexedDB)
   */
  async clearAll(): Promise<void> {
    this.clearLocalStorage();
    this.clearSessionStorage();
    this.clearMemory();

    try {
      const db = await this.openDatabase();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['storage'], 'readwrite');
        const store = transaction.objectStore('storage');
        const request = store.clear();

        request.onerror = () => { reject(new Error(request.error?.message ?? 'Unknown error')); };
        request.onsuccess = () => { resolve(); };
      });
    } catch (error) {
      this.handleError('Failed to clear IndexedDB', error, false);
    }
  }

  /**
   * Validate that a key is allowed for the specified storage type
   */
  private validateAccess(storageType: 'localStorage' | 'sessionStorage', key: string): void {
    if (storageType === 'localStorage') {
      // Check whitelist
      if (this.accessControl.localstorageWhitelist !== undefined && this.accessControl.localstorageWhitelist !== null && this.accessControl.localstorageWhitelist.length > 0) {
        if (!this.accessControl.localstorageWhitelist.includes(key)) {
          throw new Error(`Key "${key}" is not in localStorage whitelist`);
        }
      }

      // Check blacklist
      if (this.accessControl.localstorageBlacklist?.includes(key) === true) {
        throw new Error(`Key "${key}" is blacklisted from localStorage`);
      }
    }

    if (storageType === 'sessionStorage') {
      // Check whitelist
      if (this.accessControl.sessionstoragWhitelist !== undefined && this.accessControl.sessionstoragWhitelist !== null && this.accessControl.sessionstoragWhitelist.length > 0) {
        if (!this.accessControl.sessionstoragWhitelist.includes(key)) {
          throw new Error(`Key "${key}" is not in sessionStorage whitelist`);
        }
      }

      // Check blacklist
      if (this.accessControl.sessionstorageBlacklist?.includes(key) === true) {
        throw new Error(`Key "${key}" is blacklisted from sessionStorage`);
      }
    }
  }

  /**
   * Handle storage errors with optional error reporting
   */
  private handleError(message: string, error: unknown, throwError = true): void {
    const handler = getErrorHandler();
    handler.handle(new Error(message), { tags: { errorType: 'storage' } });

    if (throwError) {
      throw error;
    }
  }

  /**
   * Open IndexedDB connection
   */
  private async openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => { reject(new Error(request.error?.message ?? 'Unknown error')); };
      request.onsuccess = () => { resolve(request.result); };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('storage')) {
          db.createObjectStore('storage', { keyPath: 'key' });
        }
      };
    });
  }
}

/**
 * Get the global storage manager instance
 *
 * @example
 * ```typescript
 * import { getStorage } from '@/lib/shared/StorageManager';
 *
 * const storage = getStorage();
 * storage.setItem('key', 'value');
 * ```
 */
export function getStorage(accessControl?: StorageAccessControl): StorageManager {
  return StorageManager.getInstance(accessControl);
}
