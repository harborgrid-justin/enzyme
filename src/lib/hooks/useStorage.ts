/**
 * @file Web Storage Hooks
 * @description SSR-safe hooks that persist React state to `localStorage` or
 * `sessionStorage` with pluggable serialization and cross-tab synchronization.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/** A value or a functional updater, mirroring `useState`'s setter signature. */
export type StorageSetter<T> = (value: T | ((prev: T) => T)) => void;

/** Options for the storage hooks. */
export interface UseStorageOptions<T> {
  /** Serialize a value before writing to storage (default `JSON.stringify`). */
  serialize?: (value: T) => string;
  /** Deserialize a stored string (default `JSON.parse`). */
  deserialize?: (raw: string) => T;
  /**
   * Keep state in sync across browser tabs/windows via the `storage` event.
   * Only meaningful for `localStorage`. Default `true`.
   */
  syncTabs?: boolean;
}

function readValue<T>(
  storage: Storage | null,
  key: string,
  initialValue: T,
  deserialize: (raw: string) => T
): T {
  if (storage === null) return initialValue;
  try {
    const raw = storage.getItem(key);
    return raw === null ? initialValue : deserialize(raw);
  } catch {
    return initialValue;
  }
}

function createStorageHook(getStorage: () => Storage | null) {
  return function useStorage<T>(
    key: string,
    initialValue: T | (() => T),
    options: UseStorageOptions<T> = {}
  ): [T, StorageSetter<T>, () => void] {
    const {
      serialize = JSON.stringify,
      deserialize = JSON.parse as (raw: string) => T,
      syncTabs = true,
    } = options;

    // Resolve a lazy initial value once.
    const initialRef = useRef<T>(
      typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue
    );

    // Keep serializers in refs so listeners always see the latest without
    // re-subscribing on every render. Updated outside render to satisfy the
    // rules of hooks.
    const serializeRef = useRef(serialize);
    const deserializeRef = useRef(deserialize);
    useEffect(() => {
      serializeRef.current = serialize;
      deserializeRef.current = deserialize;
    });

    const [storedValue, setStoredValue] = useState<T>(() =>
      readValue(getStorage(), key, initialRef.current, deserialize)
    );

    const setValue = useCallback<StorageSetter<T>>(
      (value) => {
        setStoredValue((prev) => {
          const next = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value;
          const storage = getStorage();
          if (storage !== null) {
            try {
              storage.setItem(key, serializeRef.current(next));
            } catch {
              // Storage may be full or unavailable (private mode); keep state.
            }
          }
          return next;
        });
      },
      [key]
    );

    const remove = useCallback(() => {
      const storage = getStorage();
      if (storage !== null) {
        try {
          storage.removeItem(key);
        } catch {
          // Ignore storage errors.
        }
      }
      setStoredValue(initialRef.current);
    }, [key]);

    // Re-read when the key changes.
    useEffect(() => {
      setStoredValue(readValue(getStorage(), key, initialRef.current, deserializeRef.current));
    }, [key]);

    // Cross-tab synchronization for localStorage.
    useEffect(() => {
      if (!syncTabs || typeof window === 'undefined') return undefined;
      const targetStorage = getStorage();
      const onStorage = (event: StorageEvent): void => {
        if (event.key !== key || event.storageArea !== targetStorage) return;
        if (event.newValue === null) {
          setStoredValue(initialRef.current);
        } else {
          try {
            setStoredValue(deserializeRef.current(event.newValue));
          } catch {
            // Ignore malformed payloads from other tabs.
          }
        }
      };
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    }, [key, syncTabs]);

    return [storedValue, setValue, remove];
  };
}

function getLocalStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function getSessionStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

/**
 * Persist state to `localStorage`, surviving reloads and syncing across tabs.
 *
 * @param key - Storage key.
 * @param initialValue - Initial value (or a lazy initializer) used when no
 *   value is stored.
 * @param options - Serialization and sync options.
 * @returns A `[value, setValue, remove]` tuple. `remove` clears the stored key
 *   and resets to the initial value.
 */
export const useLocalStorage = createStorageHook(getLocalStorage);

/**
 * Persist state to `sessionStorage` for the lifetime of the page session.
 *
 * @param key - Storage key.
 * @param initialValue - Initial value (or a lazy initializer).
 * @param options - Serialization options (`syncTabs` is ignored here).
 * @returns A `[value, setValue, remove]` tuple.
 */
export const useSessionStorage = createStorageHook(getSessionStorage);
