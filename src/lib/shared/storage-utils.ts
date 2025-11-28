/**
 * @file Unified Storage Utilities
 * @description Standardized storage abstractions for localStorage, sessionStorage,
 * and in-memory storage with TTL and type safety.
 *
 * @module shared/storage-utils
 */

import { isObject, isNumber } from './type-utils';

// =============================================================================
// Types
// =============================================================================

/**
 * Storage item wrapper with metadata.
 */
export interface StorageItem<T> {
  value: T;
  timestamp: number;
  ttl?: number;
  version?: number;
}

/**
 * Storage options for set operations.
 */
export interface StorageSetOptions {
  /** Time-to-live in milliseconds (0 = no expiration) */
  ttlMs?: number;
  /** Version number for migrations */
  version?: number;
}

/**
 * Storage configuration.
 */
export interface StorageConfig {
  /** Prefix for all keys */
  prefix?: string;
  /** Default TTL in milliseconds */
  defaultTtlMs?: number;
  /** Storage version */
  version?: number;
}

// =============================================================================
// Storage Wrapper
// =============================================================================

/**
 * Type-safe storage wrapper with TTL support.
 *
 * @example
 * ```ts
 * const storage = new StorageWrapper(localStorage, { prefix: 'app' });
 *
 * // Set with TTL
 * storage.set('user', { name: 'John' }, { ttlMs: 3600000 });
 *
 * // Get with type
 * const user = storage.get<User>('user');
 * ```
 */
export class StorageWrapper {
  private storage: Storage;
  private config: Required<StorageConfig>;

  constructor(storage: Storage, config: StorageConfig = {}) {
    this.storage = storage;
    this.config = {
      prefix: config.prefix ?? '',
      defaultTtlMs: config.defaultTtlMs ?? 0,
      version: config.version ?? 1,
    };
  }

  /**
   * Get prefixed storage key.
   */
  private getKey(key: string): string {
    return this.config.prefix ? `${this.config.prefix}:${key}` : key;
  }

  /**
   * Set a value in storage.
   */
  set<T>(key: string, value: T, options: StorageSetOptions = {}): boolean {
    const fullKey = this.getKey(key);
    const ttl = options.ttlMs ?? this.config.defaultTtlMs;

    const item: StorageItem<T> = {
      value,
      timestamp: Date.now(),
      ttl: ttl > 0 ? ttl : undefined,
      version: options.version ?? this.config.version,
    };

    try {
      this.storage.setItem(fullKey, JSON.stringify(item));
      return true;
    } catch (error) {
      // Storage quota exceeded or other error
      console.warn('[Storage] Failed to set item:', key, error);
      return false;
    }
  }

  /**
   * Get a value from storage.
   */
  get<T>(key: string, defaultValue?: T): T | undefined {
    const fullKey = this.getKey(key);

    try {
      const raw = this.storage.getItem(fullKey);
      if (raw === null || raw === undefined || raw === '') return defaultValue;

      const item = JSON.parse(raw) as unknown;
      if (!this.isStorageItem(item)) {
        // Legacy value without wrapper
        return item as T;
      }

      // Check expiration
      const ttl = item.ttl;
      if (ttl !== undefined && ttl !== null && ttl > 0 && Date.now() - item.timestamp > ttl) {
        this.remove(key);
        return defaultValue;
      }

      return item.value as T;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Check if item is a StorageItem wrapper.
   */
  private isStorageItem(value: unknown): value is StorageItem<unknown> {
    return (
      isObject(value) &&
      'value' in value &&
      'timestamp' in value &&
      isNumber(value.timestamp)
    );
  }

  /**
   * Remove a value from storage.
   */
  remove(key: string): void {
    const fullKey = this.getKey(key);
    this.storage.removeItem(fullKey);
  }

  /**
   * Check if a key exists and is not expired.
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Get all keys with the configured prefix.
   */
  keys(): string[] {
    const keys: string[] = [];
    const prefix = this.config.prefix ? `${this.config.prefix}:` : '';

    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key?.startsWith(prefix) === true) {
        keys.push(prefix !== '' ? key.slice(prefix.length) : key);
      }
    }

    return keys;
  }

  /**
   * Clear all items with the configured prefix.
   */
  clear(): void {
    const keysToRemove: string[] = [];
    const prefix = this.config.prefix ? `${this.config.prefix}:` : '';

    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key !== null && (prefix === '' || key.startsWith(prefix))) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => this.storage.removeItem(key));
  }

  /**
   * Remove all expired items.
   */
  cleanup(): number {
    let removed = 0;
    const prefix = this.config.prefix ? `${this.config.prefix}:` : '';
    const now = Date.now();

    for (let i = this.storage.length - 1; i >= 0; i--) {
      const key = this.storage.key(i);
      if (key === null || (prefix && !key.startsWith(prefix))) continue;

      try {
        const raw = this.storage.getItem(key);
        if (raw === null || raw === undefined || raw === '') continue;

        const item = JSON.parse(raw) as unknown;
        if (
          this.isStorageItem(item) &&
          item.ttl &&
          now - item.timestamp > item.ttl
        ) {
          this.storage.removeItem(key);
          removed++;
        }
      } catch {
        // Corrupted item, remove it
        this.storage.removeItem(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Get storage statistics.
   */
  getStats(): {
    itemCount: number;
    totalSize: number;
    expiredCount: number;
  } {
    let itemCount = 0;
    let totalSize = 0;
    let expiredCount = 0;
    const prefix = this.config.prefix ? `${this.config.prefix}:` : '';
    const now = Date.now();

    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key === null || (prefix && !key.startsWith(prefix))) continue;

      itemCount++;
      const value = this.storage.getItem(key);
      if (value) {
        totalSize += key.length + value.length;

        try {
          const item = JSON.parse(value) as unknown;
          if (
            this.isStorageItem(item) &&
            item.ttl &&
            now - item.timestamp > item.ttl
          ) {
            expiredCount++;
          }
        } catch {
          // Ignore
        }
      }
    }

    return { itemCount, totalSize, expiredCount };
  }
}

// =============================================================================
// Memory Storage
// =============================================================================

/**
 * In-memory storage implementation (SSR-safe fallback).
 */
export class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Check if localStorage is available.
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, 'test');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if sessionStorage is available.
 */
export function isSessionStorageAvailable(): boolean {
  try {
    const testKey = '__storage_test__';
    window.sessionStorage.setItem(testKey, 'test');
    window.sessionStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get localStorage with fallback to memory storage.
 */
export function getLocalStorage(): Storage {
  if (typeof window !== 'undefined' && isLocalStorageAvailable()) {
    return window.localStorage;
  }
  return new MemoryStorage();
}

/**
 * Get sessionStorage with fallback to memory storage.
 */
export function getSessionStorage(): Storage {
  if (typeof window !== 'undefined' && isSessionStorageAvailable()) {
    return window.sessionStorage;
  }
  return new MemoryStorage();
}

/**
 * Create a localStorage wrapper with prefix.
 */
export function createLocalStorage(config: StorageConfig = {}): StorageWrapper {
  return new StorageWrapper(getLocalStorage(), config);
}

/**
 * Create a sessionStorage wrapper with prefix.
 */
export function createSessionStorage(
  config: StorageConfig = {}
): StorageWrapper {
  return new StorageWrapper(getSessionStorage(), config);
}

/**
 * Create a memory storage wrapper.
 */
export function createMemoryStorage(): StorageWrapper {
  return new MemoryStorage() as unknown as StorageWrapper;
}

// =============================================================================
// Convenience Functions
// =============================================================================

// Default storage instances
let defaultLocalStorage: StorageWrapper | null = null;
let defaultSessionStorage: StorageWrapper | null = null;

/**
 * Get default localStorage wrapper.
 */
function getDefaultLocalStorage(): StorageWrapper {
  if (!defaultLocalStorage) {
    defaultLocalStorage = createLocalStorage({ prefix: 'app' });
  }
  return defaultLocalStorage;
}

/**
 * Get default sessionStorage wrapper.
 */
function getDefaultSessionStorage(): StorageWrapper {
  if (!defaultSessionStorage) {
    defaultSessionStorage = createSessionStorage({ prefix: 'app' });
  }
  return defaultSessionStorage;
}

/**
 * Set a value in localStorage.
 */
export function setLocal<T>(
  key: string,
  value: T,
  options?: StorageSetOptions
): boolean {
  return getDefaultLocalStorage().set(key, value, options);
}

/**
 * Get a value from localStorage.
 */
export function getLocal<T>(key: string, defaultValue?: T): T | undefined {
  return getDefaultLocalStorage().get<T>(key, defaultValue);
}

/**
 * Remove a value from localStorage.
 */
export function removeLocal(key: string): void {
  getDefaultLocalStorage().remove(key);
}

/**
 * Set a value in sessionStorage.
 */
export function setSession<T>(
  key: string,
  value: T,
  options?: StorageSetOptions
): boolean {
  return getDefaultSessionStorage().set(key, value, options);
}

/**
 * Get a value from sessionStorage.
 */
export function getSession<T>(key: string, defaultValue?: T): T | undefined {
  return getDefaultSessionStorage().get<T>(key, defaultValue);
}

/**
 * Remove a value from sessionStorage.
 */
export function removeSession(key: string): void {
  getDefaultSessionStorage().remove(key);
}

// =============================================================================
// JSON Storage Helpers
// =============================================================================

/**
 * Safely parse JSON from storage with type guard.
 */
export function getJsonFromStorage<T>(
  storage: Storage,
  key: string,
  guard: (value: unknown) => value is T
): T | null {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    return guard(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Save JSON to storage.
 */
export function setJsonToStorage<T>(
  storage: Storage,
  key: string,
  value: T
): boolean {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// Storage Event Utilities
// =============================================================================

/**
 * Listen for storage changes across tabs.
 *
 * @param callback - Callback when storage changes
 * @param options - Filter options
 * @returns Unsubscribe function
 */
export function onStorageChange(
  callback: (event: StorageEvent) => void,
  options: { key?: string; storage?: Storage } = {}
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handler = (event: StorageEvent): void => {
    // Filter by key if specified
    if (options.key && event.key !== options.key) return;

    // Filter by storage type if specified
    if (options.storage && event.storageArea !== options.storage) return;

    callback(event);
  };

  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

/**
 * Watch a specific key for changes.
 */
export function watchStorageKey<T>(
  key: string,
  callback: (newValue: T | null, oldValue: T | null) => void,
  options: { storage?: Storage } = {}
): () => void {
  return onStorageChange(
    (event) => {
      if (event.key !== key) return;

      const parse = (val: string | null): T | null => {
        if (!val) return null;
        try {
          return JSON.parse(val) as T;
        } catch {
          return val as unknown as T;
        }
      };

      callback(parse(event.newValue), parse(event.oldValue));
    },
    { key, storage: options.storage }
  );
}
