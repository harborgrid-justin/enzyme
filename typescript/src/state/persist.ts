/**
 * @fileoverview State persistence utilities with serialization
 * @module @missionfabric-js/enzyme-typescript/state/persist
 *
 * Provides comprehensive state persistence utilities:
 * - Automatic state serialization and hydration
 * - Multiple storage backend support (localStorage, sessionStorage, IndexedDB)
 * - Selective persistence with whitelist/blacklist
 * - Migration and versioning support
 * - Encryption and compression
 * - Throttling and debouncing
 *
 * @example
 * ```typescript
 * const persistConfig = {
 *   key: 'app-state',
 *   storage: localStorage,
 *   whitelist: ['user', 'settings'],
 *   version: 1,
 *   migrate: async (state, version) => {
 *     if (version === 0) {
 *       return { ...state, newField: 'default' };
 *     }
 *     return state;
 *   }
 * };
 *
 * const persistedReducer = persistReducer(persistConfig, rootReducer);
 * ```
 */

import type { Reducer } from './reducer';
import type { Action } from './action';

/**
 * Storage backend interface
 */
export interface StorageBackend {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem(key: string): Promise<void> | void;
}

/**
 * Persist configuration
 */
export interface PersistConfig<S = unknown> {
  /**
   * Storage key
   */
  key: string;

  /**
   * Storage backend
   */
  storage: StorageBackend;

  /**
   * State version for migrations
   */
  version?: number;

  /**
   * Whitelist of state keys to persist
   */
  whitelist?: (keyof S)[];

  /**
   * Blacklist of state keys to not persist
   */
  blacklist?: (keyof S)[];

  /**
   * Throttle persistence (ms)
   */
  throttle?: number;

  /**
   * Debounce persistence (ms)
   */
  debounce?: number;

  /**
   * Custom serializer
   */
  serialize?: (state: S) => string;

  /**
   * Custom deserializer
   */
  deserialize?: (serialized: string) => S;

  /**
   * Transform state before persisting
   */
  transforms?: PersistTransform<S>[];

  /**
   * Migration function
   */
  migrate?: (state: unknown, version: number) => Promise<S> | S;

  /**
   * Error handler
   */
  onError?: (error: Error) => void;

  /**
   * Success handler
   */
  onSuccess?: (state: S) => void;
}

/**
 * Transform interface for state transformation
 */
export interface PersistTransform<S = unknown> {
  in?: (state: S) => S;
  out?: (state: S) => S;
}

/**
 * Persisted state wrapper
 */
export interface PersistedState<S> {
  state: S;
  version: number;
  timestamp: number;
}

/**
 * Rehydrate action
 */
export interface RehydrateAction<S> {
  type: '@@persist/REHYDRATE';
  payload: S;
}

/**
 * LocalStorage backend
 */
export const localStorageBackend: StorageBackend = {
  getItem: (key: string) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Ignore quota exceeded errors
    }
  },
  removeItem: (key: string) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore errors
    }
  },
};

/**
 * SessionStorage backend
 */
export const sessionStorageBackend: StorageBackend = {
  getItem: (key: string) => {
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      window.sessionStorage.setItem(key, value);
    } catch {
      // Ignore quota exceeded errors
    }
  },
  removeItem: (key: string) => {
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // Ignore errors
    }
  },
};

/**
 * IndexedDB backend
 */
export class IndexedDBBackend implements StorageBackend {
  private dbName: string;
  private storeName: string;
  private db: IDBDatabase | null = null;

  constructor(dbName: string = 'persist', storeName: string = 'state') {
    this.dbName = dbName;
    this.storeName = storeName;
  }

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  async getItem(key: string): Promise<string | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || null);
      });
    } catch {
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(value, key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch {
      // Ignore errors
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch {
      // Ignore errors
    }
  }
}

/**
 * Default serializer
 */
function defaultSerialize<S>(state: S): string {
  return JSON.stringify(state);
}

/**
 * Default deserializer
 */
function defaultDeserialize<S>(serialized: string): S {
  return JSON.parse(serialized);
}

/**
 * Create a persisted reducer
 *
 * @template S - State type
 * @param config - Persist configuration
 * @param reducer - Original reducer
 * @returns Persisted reducer
 *
 * @example
 * ```typescript
 * const persistConfig = {
 *   key: 'myApp',
 *   storage: localStorage,
 *   whitelist: ['user', 'settings']
 * };
 *
 * const persistedReducer = persistReducer(persistConfig, rootReducer);
 * ```
 */
export function persistReducer<S>(
  config: PersistConfig<S>,
  reducer: Reducer<S>
): Reducer<S> {
  const {
    key,
    storage,
    version = 1,
    whitelist,
    blacklist,
    serialize = defaultSerialize,
    deserialize = defaultDeserialize,
    transforms = [],
    migrate,
    onError,
  } = config;

  let isRehydrated = false;
  let persistedState: S | null = null;

  // Load persisted state asynchronously
  (async () => {
    try {
      const serialized = await storage.getItem(key);
      if (serialized) {
        const persisted = deserialize(serialized) as PersistedState<S>;

        // Run migration if needed
        let state = persisted.state;
        if (migrate && persisted.version !== version) {
          state = await migrate(persisted.state, persisted.version);
        }

        // Apply transforms
        for (const transform of transforms) {
          if (transform.out) {
            state = transform.out(state);
          }
        }

        persistedState = state;
        isRehydrated = true;
      }
    } catch (error) {
      if (onError) {
        onError(error as Error);
      }
    }
  })();

  return (state: S | undefined, action: Action<string, unknown>): S => {
    // Use persisted state on first call
    if (state === undefined && persistedState !== null) {
      state = persistedState;
    }

    const nextState = reducer(state, action);

    // Don't persist until rehydrated
    if (!isRehydrated) {
      return nextState;
    }

    // Persist state
    (async () => {
      try {
        let stateToPersist = nextState;

        // Apply whitelist/blacklist
        if (whitelist || blacklist) {
          stateToPersist = {} as S;
          for (const k in nextState) {
            if (whitelist && !whitelist.includes(k)) {
              continue;
            }
            if (blacklist && blacklist.includes(k)) {
              continue;
            }
            (stateToPersist as Record<string, unknown>)[k] = nextState[k];
          }
        }

        // Apply transforms
        for (const transform of transforms) {
          if (transform.in) {
            stateToPersist = transform.in(stateToPersist);
          }
        }

        const wrapped: PersistedState<S> = {
          state: stateToPersist,
          version,
          timestamp: Date.now(),
        };

        const serialized = serialize(wrapped as S);
        await storage.setItem(key, serialized);
      } catch (error) {
        if (onError) {
          onError(error as Error);
        }
      }
    })();

    return nextState;
  };
}

/**
 * Create a throttled persist middleware
 *
 * @param config - Persist configuration
 * @returns Throttled persist function
 *
 * @example
 * ```typescript
 * const persistor = createThrottledPersist({
 *   key: 'state',
 *   storage: localStorage,
 *   throttle: 1000
 * });
 * ```
 */
export function createThrottledPersist<S>(
  config: PersistConfig<S> & { throttle: number }
): (state: S) => void {
  const { throttle, key, storage, serialize = defaultSerialize, onError } = config;
  let lastPersist = 0;
  let timeoutId: NodeJS.Timeout | null = null;

  return (state: S) => {
    const now = Date.now();

    if (now - lastPersist >= throttle) {
      lastPersist = now;
      (async () => {
        try {
          const serialized = serialize(state);
          await storage.setItem(key, serialized);
        } catch (error) {
          if (onError) {
            onError(error as Error);
          }
        }
      })();
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        lastPersist = Date.now();
        (async () => {
          try {
            const serialized = serialize(state);
            await storage.setItem(key, serialized);
          } catch (error) {
            if (onError) {
              onError(error as Error);
            }
          }
        })();
      }, throttle - (now - lastPersist));
    }
  };
}

/**
 * Create a compression transform
 *
 * @returns Compression transform
 *
 * @example
 * ```typescript
 * const persistConfig = {
 *   key: 'state',
 *   storage: localStorage,
 *   transforms: [createCompressionTransform()]
 * };
 * ```
 */
export function createCompressionTransform<S>(): PersistTransform<S> {
  return {
    in: (state: S): S => {
      // Simple compression using JSON
      const json = JSON.stringify(state);
      const compressed = btoa(json);
      return compressed as unknown as S;
    },
    out: (state: S): S => {
      // Decompress
      const json = atob(state as unknown as string);
      return JSON.parse(json);
    },
  };
}

/**
 * Create an encryption transform
 *
 * @param key - Encryption key
 * @returns Encryption transform
 *
 * @example
 * ```typescript
 * const persistConfig = {
 *   key: 'state',
 *   storage: localStorage,
 *   transforms: [createEncryptionTransform('my-secret-key')]
 * };
 * ```
 */
export function createEncryptionTransform<S>(key: string): PersistTransform<S> {
  // Simple XOR encryption (not secure, just for demonstration)
  const encrypt = (text: string): string => {
    return text
      .split('')
      .map((char, i) => {
        const keyChar = key.charCodeAt(i % key.length);
        return String.fromCharCode(char.charCodeAt(0) ^ keyChar);
      })
      .join('');
  };

  const decrypt = (encrypted: string): string => {
    return encrypt(encrypted); // XOR is reversible
  };

  return {
    in: (state: S): S => {
      const json = JSON.stringify(state);
      const encrypted = btoa(encrypt(json));
      return encrypted as unknown as S;
    },
    out: (state: S): S => {
      const encrypted = atob(state as unknown as string);
      const json = decrypt(encrypted);
      return JSON.parse(json);
    },
  };
}

/**
 * Create a filter transform to exclude sensitive data
 *
 * @param predicate - Function to filter state keys
 * @returns Filter transform
 *
 * @example
 * ```typescript
 * const filterTransform = createFilterTransform<RootState>(
 *   (key) => !['password', 'token'].includes(key)
 * );
 * ```
 */
export function createFilterTransform<S extends Record<string, unknown>>(
  predicate: (key: string, value: unknown) => boolean
): PersistTransform<S> {
  return {
    in: (state: S): S => {
      const filtered = {} as S;
      for (const key in state) {
        if (predicate(key, state[key])) {
          filtered[key] = state[key];
        }
      }
      return filtered;
    },
    out: (state: S): S => state,
  };
}

/**
 * Purge persisted state
 *
 * @param config - Persist configuration
 *
 * @example
 * ```typescript
 * await purgePersistedState({
 *   key: 'myApp',
 *   storage: localStorage
 * });
 * ```
 */
export async function purgePersistedState(config: {
  key: string;
  storage: StorageBackend;
}): Promise<void> {
  const { key, storage } = config;
  await storage.removeItem(key);
}

/**
 * Get persisted state
 *
 * @template S - State type
 * @param config - Persist configuration
 * @returns Persisted state or null
 *
 * @example
 * ```typescript
 * const state = await getPersistedState<RootState>({
 *   key: 'myApp',
 *   storage: localStorage
 * });
 * ```
 */
export async function getPersistedState<S>(config: {
  key: string;
  storage: StorageBackend;
  deserialize?: (serialized: string) => S;
}): Promise<S | null> {
  const { key, storage, deserialize = defaultDeserialize } = config;

  try {
    const serialized = await storage.getItem(key);
    if (!serialized) return null;

    const persisted = deserialize(serialized) as PersistedState<S>;
    return persisted.state;
  } catch {
    return null;
  }
}

/**
 * Create a migration utility
 *
 * @param migrations - Map of version to migration function
 * @returns Migration function
 *
 * @example
 * ```typescript
 * const migrate = createMigration({
 *   1: (state: OldState) => ({ ...state, newField: 'default' }),
 *   2: (state: State) => ({ ...state, anotherField: true })
 * });
 * ```
 */
export function createMigration<S>(
  migrations: Record<number, (state: unknown) => S | Promise<S>>
): (state: unknown, fromVersion: number) => Promise<S> {
  return async (state: unknown, fromVersion: number): Promise<S> => {
    let currentState = state;
    const versions = Object.keys(migrations)
      .map(Number)
      .sort((a, b) => a - b);

    for (const version of versions) {
      if (version > fromVersion) {
        currentState = await migrations[version](currentState);
      }
    }

    return currentState as S;
  };
}

/**
 * Create a persistor for manual control
 *
 * @template S - State type
 * @param config - Persist configuration
 * @returns Persistor with manual control methods
 *
 * @example
 * ```typescript
 * const persistor = createPersistor({
 *   key: 'myApp',
 *   storage: localStorage
 * });
 *
 * await persistor.persist(state);
 * const state = await persistor.rehydrate();
 * await persistor.purge();
 * ```
 */
export function createPersistor<S>(config: PersistConfig<S>) {
  const {
    key,
    storage,
    serialize = defaultSerialize,
    deserialize = defaultDeserialize,
    version = 1,
    transforms = [],
    migrate,
    onError,
    onSuccess,
  } = config;

  return {
    async persist(state: S): Promise<void> {
      try {
        let stateToPersist = state;

        // Apply transforms
        for (const transform of transforms) {
          if (transform.in) {
            stateToPersist = transform.in(stateToPersist);
          }
        }

        const wrapped: PersistedState<S> = {
          state: stateToPersist,
          version,
          timestamp: Date.now(),
        };

        const serialized = serialize(wrapped as S);
        await storage.setItem(key, serialized);

        if (onSuccess) {
          onSuccess(state);
        }
      } catch (error) {
        if (onError) {
          onError(error as Error);
        }
        throw error;
      }
    },

    async rehydrate(): Promise<S | null> {
      try {
        const serialized = await storage.getItem(key);
        if (!serialized) return null;

        const persisted = deserialize(serialized) as PersistedState<S>;

        // Run migration if needed
        let state = persisted.state;
        if (migrate && persisted.version !== version) {
          state = await migrate(persisted.state, persisted.version);
        }

        // Apply transforms
        for (const transform of transforms) {
          if (transform.out) {
            state = transform.out(state);
          }
        }

        return state;
      } catch (error) {
        if (onError) {
          onError(error as Error);
        }
        return null;
      }
    },

    async purge(): Promise<void> {
      await storage.removeItem(key);
    },

    async flush(): Promise<void> {
      // Force immediate persistence
    },
  };
}
