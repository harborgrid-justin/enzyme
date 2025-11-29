/**
 * @fileoverview useSecureStorage Hook
 * @module @/lib/security/hooks/useSecureStorage
 *
 * React hook for encrypted storage access with automatic
 * state synchronization and error handling.
 *
 * @author Harbor Security Team
 * @version 1.0.0
 */

import {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import type { SecureStorageSetOptions, UseSecureStorageResult } from '../types';
import { getSecureStorage, type SecureStorage } from '../secure-storage';

/**
 * Options for the useSecureStorage hook
 */
export interface UseSecureStorageOptions {
  /** Custom SecureStorage instance (defaults to global instance) */
  storage?: SecureStorage;
  /** Initial value before first load */
  initialValue?: unknown;
  /** Whether to sync with other tabs via storage events */
  syncAcrossTabs?: boolean;
  /** Auto-refresh interval in milliseconds */
  refreshInterval?: number;
}

/**
 * Hook for accessing encrypted secure storage
 *
 * Provides a React-friendly interface for reading and writing
 * encrypted data with automatic state management.
 *
 * @param key - The storage key
 * @param options - Hook options
 * @returns Secure storage operations and state
 *
 * @example
 * ```tsx
 * function SecureDataComponent() {
 *   const {
 *     value,
 *     isLoading,
 *     error,
 *     setValue,
 *     removeValue,
 *     refresh,
 *   } = useSecureStorage<UserPreferences>('user-preferences');
 *
 *   if (isLoading) return <Loading />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return (
 *     <div>
 *       <p>Theme: {value?.theme ?? 'default'}</p>
 *       <button onClick={() => setValue({ theme: 'dark' })}>
 *         Set Dark Theme
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSecureStorage<T>(
  key: string,
  options: UseSecureStorageOptions = {}
): UseSecureStorageResult<T> {
  const {
    storage,
    initialValue,
    syncAcrossTabs = false,
    refreshInterval,
  } = options;

  // State
  const [value, setValueState] = useState<T | null>(
    (initialValue as T | undefined) ?? null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Refs for cleanup
  const mountedRef = useRef(true);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Get storage instance
  const getStorage = useCallback((): SecureStorage => {
    return storage ?? getSecureStorage();
  }, [storage]);

  // Load value from storage
  const loadValue = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const storageInstance = getStorage();
      const result = await storageInstance.getItem<T>(key);

      if (!mountedRef.current) return;

      if (result.success) {
        setValueState(result.data ?? null);
      } else {
        // Item not found is not an error
        if (result.error !== 'Item not found') {
          setError(new Error(result.error));
        }
        setValueState(null);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err : new Error('Failed to load value'));
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [key, getStorage]);

  // Set value in storage
  const setValue = useCallback(
    async (newValue: T, setOptions?: SecureStorageSetOptions): Promise<void> => {
      try {
        setError(null);

        const storageInstance = getStorage();
        const result = await storageInstance.setItem(key, newValue, setOptions);

        if (!mountedRef.current) return;

        if (result.success) {
          setValueState(newValue);
        } else {
          throw new Error(result.error);
        }
      } catch (err) {
        if (!mountedRef.current) return;
        const error = err instanceof Error ? err : new Error('Failed to set value');
        setError(error);
        throw error;
      }
    },
    [key, getStorage]
  );

  // Remove value from storage
  const removeValue = useCallback(async (): Promise<void> => {
    try {
      setError(null);

      const storageInstance = getStorage();
      const result = await storageInstance.removeItem(key);

      if (!mountedRef.current) return;

      if (result.success) {
        setValueState(null);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      const error = err instanceof Error ? err : new Error('Failed to remove value');
      setError(error);
      throw error;
    }
  }, [key, getStorage]);

  // Refresh value from storage
  const refresh = useCallback(async (): Promise<void> => {
    await loadValue();
  }, [loadValue]);

  // Initial load
  useEffect(() => {
    mountedRef.current = true;
    void loadValue();

    return () => {
      mountedRef.current = false;
    };
  }, [loadValue]);

  // Set up refresh interval
  useEffect(() => {
    if ((refreshInterval != null && refreshInterval > 0)) {
      refreshIntervalRef.current = setInterval(() => {
        void loadValue();
      }, refreshInterval);

      return () => {
        if (refreshIntervalRef.current != null) {
          clearInterval(refreshIntervalRef.current);
          refreshIntervalRef.current = null;
        }
      };
    }
    return undefined;
  }, [refreshInterval, loadValue]);

  // Sync across tabs via storage events
  useEffect(() => {
    if (syncAcrossTabs !== true || typeof window === 'undefined') {
      return;
    }

    const handleStorageChange = (event: StorageEvent): void => {
      // Check if the changed key matches our key
      // Note: Secure storage uses a prefix, so we need to check for that
      if (event.key?.includes(key) === true) {
        void loadValue();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [syncAcrossTabs, key, loadValue]);

  return {
    value,
    isLoading,
    error,
    setValue,
    removeValue,
    refresh,
  };
}

/**
 * Hook for accessing secure storage with TTL
 * Convenience wrapper with automatic expiration
 *
 * @param key - The storage key
 * @param ttl - Time-to-live in milliseconds
 * @param options - Hook options (excluding refreshInterval which is set automatically)
 * @returns Secure storage operations and state with TTL enforcement
 */
export function useSecureStorageWithTTL<T>(
  key: string,
  ttl: number,
  options: Omit<UseSecureStorageOptions, 'refreshInterval'> = {}
): UseSecureStorageResult<T> {
  const result = useSecureStorage<T>(key, {
    ...options,
    // Refresh at half the TTL to catch expirations
    refreshInterval: ttl / 2,
  });

  // Store setValue in a ref to avoid dependency instability
  const setValueRef = useRef(result.setValue);
  useEffect(() => {
    setValueRef.current = result.setValue;
  }, [result.setValue]);

  // Wrapper to always include TTL
  const setValueWithTTL = useCallback(
    async (newValue: T, setOptions?: SecureStorageSetOptions): Promise<void> => {
      await setValueRef.current(newValue, { ...setOptions, ttl });
    },
    [ttl]
  );

  return {
    ...result,
    setValue: setValueWithTTL,
  };
}
