/**
 * @file Storage Configuration
 * @description Centralized localStorage/sessionStorage key management.
 *
 * CRITICAL: All storage keys MUST be defined here.
 * No hardcoded storage keys should exist elsewhere in the codebase.
 *
 * USAGE:
 * ```typescript
 * import { STORAGE_KEYS, getStorageItem, setStorageItem } from '@/config';
 *
 * // Type-safe storage access
 * const theme = getStorageItem(STORAGE_KEYS.THEME);
 * setStorageItem(STORAGE_KEYS.THEME, 'dark');
 *
 * // Direct key access
 * localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
 * ```
 */

import { env } from './env';

// =============================================================================
// Storage Key Definitions
// =============================================================================

/**
 * LocalStorage key definitions
 *
 * All storage keys used by the application are defined here.
 * Using constants prevents typos and enables easy refactoring.
 */
export const STORAGE_KEYS = {
  // ---------------------------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------------------------

  /** Access token storage key (derived from env config) */
  AUTH_TOKEN: env.authTokenKey,

  /** Refresh token storage key */
  REFRESH_TOKEN: `${env.authTokenKey}_refresh`,

  /** Token expiry timestamp */
  TOKEN_EXPIRY: `${env.authTokenKey}_expiry`,

  /** Cached user data */
  USER: 'auth_user',

  /** Remember me preference */
  REMEMBER_ME: 'auth_remember_me',

  /** Last authenticated user email (for remember me) */
  LAST_EMAIL: 'auth_last_email',

  // ---------------------------------------------------------------------------
  // User Preferences
  // ---------------------------------------------------------------------------

  /** Theme preference (light/dark/system) */
  THEME: 'pref_theme',

  /** Language preference */
  LANGUAGE: 'pref_language',

  /** Sidebar collapsed state */
  SIDEBAR_STATE: 'pref_sidebar_collapsed',

  /** Table page size preference */
  PAGE_SIZE: 'pref_page_size',

  /** Dashboard layout preference */
  DASHBOARD_LAYOUT: 'pref_dashboard_layout',

  /** Compact mode preference */
  COMPACT_MODE: 'pref_compact_mode',

  // ---------------------------------------------------------------------------
  // Application State
  // ---------------------------------------------------------------------------

  /** Last visited route (for redirect after login) */
  LAST_ROUTE: 'app_last_route',

  /** Dismissed notices/banners */
  DISMISSED_NOTICES: 'app_dismissed_notices',

  /** Onboarding completion status */
  ONBOARDING_COMPLETE: 'app_onboarding_complete',

  /** Recently viewed items */
  RECENT_ITEMS: 'app_recent_items',

  /** Search history */
  SEARCH_HISTORY: 'app_search_history',

  // ---------------------------------------------------------------------------
  // Feature Flags
  // ---------------------------------------------------------------------------

  /** Feature flag overrides (dev only) */
  FLAG_OVERRIDES: 'flags_overrides',

  /** Feature flag cache */
  FLAG_CACHE: 'flags_cache',

  /** Flag cache timestamp */
  FLAG_CACHE_TIME: 'flags_cache_time',

  // ---------------------------------------------------------------------------
  // Cache Prefixes
  // ---------------------------------------------------------------------------

  /** API response cache prefix */
  CACHE_PREFIX: 'cache:',

  /** Form draft prefix */
  DRAFT_PREFIX: 'draft:',

  /** Query cache prefix */
  QUERY_PREFIX: 'query:',

  // ---------------------------------------------------------------------------
  // Session Storage Keys
  // ---------------------------------------------------------------------------

  /** Current session ID */
  SESSION_ID: 'session_id',

  /** Tab/window ID (for multi-tab handling) */
  TAB_ID: 'tab_id',

  /** Pending redirect URL */
  REDIRECT_URL: 'session_redirect_url',
} as const;

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Storage key type
 */
export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/**
 * Storage value type map for type-safe get/set operations
 *
 * Maps storage keys to their expected value types.
 * Add new entries here when adding new storage keys.
 */
export type StorageValueMap = {
  // Auth
  [STORAGE_KEYS.AUTH_TOKEN]: string;
  [STORAGE_KEYS.REFRESH_TOKEN]: string;
  [STORAGE_KEYS.TOKEN_EXPIRY]: number | string;
  [STORAGE_KEYS.USER]: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
    avatar?: string;
  };
  [STORAGE_KEYS.REMEMBER_ME]: boolean | string;
  [STORAGE_KEYS.LAST_EMAIL]: string;

  // Preferences
  [STORAGE_KEYS.THEME]: 'light' | 'dark' | 'system';
  [STORAGE_KEYS.LANGUAGE]: string;
  [STORAGE_KEYS.SIDEBAR_STATE]: boolean | string;
  [STORAGE_KEYS.PAGE_SIZE]: number | string;
  [STORAGE_KEYS.DASHBOARD_LAYOUT]: 'grid' | 'list' | 'compact';
  [STORAGE_KEYS.COMPACT_MODE]: boolean | string;

  // App State
  [STORAGE_KEYS.LAST_ROUTE]: string;
  [STORAGE_KEYS.DISMISSED_NOTICES]: string[];
  [STORAGE_KEYS.ONBOARDING_COMPLETE]: boolean | string;
  [STORAGE_KEYS.RECENT_ITEMS]: Array<{
    id: string;
    type: string;
    title: string;
    timestamp: number;
  }>;
  [STORAGE_KEYS.SEARCH_HISTORY]: string[];

  // Feature Flags
  [STORAGE_KEYS.FLAG_OVERRIDES]: Record<string, boolean>;
  [STORAGE_KEYS.FLAG_CACHE]: Record<string, boolean>;
  [STORAGE_KEYS.FLAG_CACHE_TIME]: number | string;

  // Session
  [STORAGE_KEYS.SESSION_ID]: string;
  [STORAGE_KEYS.TAB_ID]: string;
  [STORAGE_KEYS.REDIRECT_URL]: string;
};

// =============================================================================
// Type-Safe Storage Utilities
// =============================================================================

/**
 * Type-safe storage getter
 *
 * @param key - Storage key
 * @param storage - Storage type (default: localStorage)
 * @returns Parsed value or null if not found
 *
 * @example
 * ```typescript
 * const theme = getStorageItem(STORAGE_KEYS.THEME);
 * // Type is: 'light' | 'dark' | 'system' | null
 * ```
 */
export function getStorageItem<K extends keyof StorageValueMap>(
  key: K,
  storage: Storage = localStorage
): StorageValueMap[K] | null {
  try {
    const value = storage.getItem(key as string);
    if (value === null) return null;

    // Try to parse as JSON
    try {
      return JSON.parse(value) as StorageValueMap[K];
    } catch {
      // Return raw value if not JSON
      return value as unknown as StorageValueMap[K];
    }
  } catch (error) {
    console.warn(`Failed to read storage key "${key}":`, error);
    return null;
  }
}

/**
 * Type-safe storage setter
 *
 * @param key - Storage key
 * @param value - Value to store
 * @param storage - Storage type (default: localStorage)
 *
 * @example
 * ```typescript
 * setStorageItem(STORAGE_KEYS.THEME, 'dark');
 * setStorageItem(STORAGE_KEYS.USER, { id: '123', email: 'test@example.com', role: 'user' });
 * ```
 */
export function setStorageItem<K extends keyof StorageValueMap>(
  key: K,
  value: StorageValueMap[K],
  storage: Storage = localStorage
): void {
  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    storage.setItem(key as string, serialized);
  } catch (error) {
    console.warn(`Failed to write storage key "${key}":`, error);
  }
}

/**
 * Remove storage item
 *
 * @param key - Storage key
 * @param storage - Storage type (default: localStorage)
 */
export function removeStorageItem(
  key: StorageKey,
  storage: Storage = localStorage
): void {
  try {
    storage.removeItem(key);
  } catch (error) {
    console.warn(`Failed to remove storage key "${key}":`, error);
  }
}

/**
 * Check if storage key exists
 *
 * @param key - Storage key
 * @param storage - Storage type (default: localStorage)
 * @returns True if key exists
 */
export function hasStorageItem(
  key: StorageKey,
  storage: Storage = localStorage
): boolean {
  try {
    return storage.getItem(key) !== null;
  } catch {
    return false;
  }
}

// =============================================================================
// Bulk Storage Operations
// =============================================================================

/**
 * Clear all app storage (preserves other apps' data)
 *
 * This clears only keys defined in STORAGE_KEYS, plus any
 * keys with recognized prefixes (cache:, draft:, query:).
 */
export function clearAppStorage(): void {
  // Get all defined storage keys (non-prefix values)
  const keysToRemove = Object.values(STORAGE_KEYS).filter(
    (key) => !key.endsWith(':')
  );

  // Remove each defined key
  keysToRemove.forEach((key) => {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch {
      // Ignore errors
    }
  });

  // Clear prefixed items
  clearPrefixedStorage(STORAGE_KEYS.CACHE_PREFIX);
  clearPrefixedStorage(STORAGE_KEYS.DRAFT_PREFIX);
  clearPrefixedStorage(STORAGE_KEYS.QUERY_PREFIX);
}

/**
 * Clear all storage items with a given prefix
 *
 * @param prefix - Key prefix to match
 * @param storage - Storage type (default: localStorage)
 */
export function clearPrefixedStorage(
  prefix: string,
  storage: Storage = localStorage
): void {
  try {
    const keysToRemove: string[] = [];

    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => storage.removeItem(key));
  } catch (error) {
    console.warn(`Failed to clear prefixed storage "${prefix}":`, error);
  }
}

/**
 * Clear auth-related storage (for logout)
 */
export function clearAuthStorage(): void {
  const authKeys = [
    STORAGE_KEYS.AUTH_TOKEN,
    STORAGE_KEYS.REFRESH_TOKEN,
    STORAGE_KEYS.TOKEN_EXPIRY,
    STORAGE_KEYS.USER,
    STORAGE_KEYS.SESSION_ID,
  ] as const;

  authKeys.forEach((key) => {
    removeStorageItem(key, localStorage);
    removeStorageItem(key, sessionStorage);
  });
}

/**
 * Clear user preference storage (for reset to defaults)
 */
export function clearPreferenceStorage(): void {
  const prefKeys = [
    STORAGE_KEYS.THEME,
    STORAGE_KEYS.LANGUAGE,
    STORAGE_KEYS.SIDEBAR_STATE,
    STORAGE_KEYS.PAGE_SIZE,
    STORAGE_KEYS.DASHBOARD_LAYOUT,
    STORAGE_KEYS.COMPACT_MODE,
  ] as const;

  prefKeys.forEach((key) => {
    removeStorageItem(key, localStorage);
  });
}

// =============================================================================
// Prefixed Storage Utilities
// =============================================================================

/**
 * Get prefixed storage item (for cache, drafts, etc.)
 *
 * @param prefix - Storage prefix
 * @param id - Item identifier
 * @returns Parsed value or null
 *
 * @example
 * ```typescript
 * const draft = getPrefixedItem(STORAGE_KEYS.DRAFT_PREFIX, 'report-123');
 * ```
 */
export function getPrefixedItem<T>(prefix: string, id: string): T | null {
  const key = `${prefix}${id}`;
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Set prefixed storage item
 *
 * @param prefix - Storage prefix
 * @param id - Item identifier
 * @param value - Value to store
 *
 * @example
 * ```typescript
 * setPrefixedItem(STORAGE_KEYS.DRAFT_PREFIX, 'report-123', formData);
 * ```
 */
export function setPrefixedItem<T>(prefix: string, id: string, value: T): void {
  const key = `${prefix}${id}`;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to write prefixed storage "${key}":`, error);
  }
}

/**
 * Remove prefixed storage item
 */
export function removePrefixedItem(prefix: string, id: string): void {
  const key = `${prefix}${id}`;
  localStorage.removeItem(key);
}

/**
 * Get all items with a given prefix
 *
 * @param prefix - Storage prefix
 * @returns Array of [id, value] tuples
 */
export function getAllPrefixedItems<T>(
  prefix: string
): Array<{ id: string; value: T }> {
  const items: Array<{ id: string; value: T }> = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      try {
        const id = key.slice(prefix.length);
        const value = JSON.parse(localStorage.getItem(key) || 'null') as T;
        if (value !== null) {
          items.push({ id, value });
        }
      } catch {
        // Skip invalid items
      }
    }
  }

  return items;
}

// =============================================================================
// Storage Size Utilities
// =============================================================================

/**
 * Estimate storage usage in bytes
 *
 * @param storage - Storage type (default: localStorage)
 * @returns Approximate size in bytes
 */
export function estimateStorageSize(storage: Storage = localStorage): number {
  let totalSize = 0;

  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key) {
      const value = storage.getItem(key) || '';
      // Approximate: 2 bytes per character (UTF-16)
      totalSize += (key.length + value.length) * 2;
    }
  }

  return totalSize;
}

/**
 * Check if storage is near capacity
 *
 * @param threshold - Threshold in bytes (default: 4MB)
 * @returns True if storage exceeds threshold
 */
export function isStorageNearCapacity(threshold: number = 4 * 1024 * 1024): boolean {
  return estimateStorageSize() > threshold;
}

/**
 * Format storage size for display
 *
 * @param bytes - Size in bytes
 * @returns Human-readable size string
 */
export function formatStorageSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
