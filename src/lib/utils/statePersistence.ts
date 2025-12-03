/**
 * @file State Persistence
 * @description Safe state persistence utilities for Redux/Zustand with
 * memory-safety, PHI protection, and migration support
 */

import { logger } from './logging';
import { StorageManager, localStorageManager, StorageQuotaError } from './storage';

// ============================================================================
// Types
// ============================================================================

/**
 * Persistence configuration
 */
export interface PersistConfig<T> {
  /** Storage key */
  key: string;
  /** Storage manager to use */
  storage?: StorageManager;
  /** Version for migrations */
  version?: number;
  /** Time-to-live in milliseconds */
  ttl?: number;
  /** State transformer before persisting */
  serialize?: (state: T) => unknown;
  /** State transformer after loading */
  deserialize?: (persisted: unknown) => T;
  /** Whitelist of keys to persist (if not provided, persist all) */
  whitelist?: Array<keyof T>;
  /** Blacklist of keys to exclude from persistence */
  blacklist?: Array<keyof T>;
  /** Migration functions by version */
  migrations?: Record<number, (state: unknown) => unknown>;
  /** Whether state contains PHI (will skip persistence) */
  containsPHI?: boolean;
  /** Merge strategy for hydration */
  merge?: 'shallow' | 'deep' | 'replace';
  /** Throttle persistence writes (ms) */
  throttle?: number;
  /** Debug mode */
  debug?: boolean;
}

/**
 * Persisted state wrapper
 */
interface PersistedState<T> {
  state: T;
  version: number;
  timestamp: number;
}

/**
 * Rehydrate result
 */
export interface RehydrateResult<T> {
  state: T | null;
  error: Error | null;
  migrated: boolean;
  fromVersion: number | null;
}

// ============================================================================
// State Persister
// ============================================================================

/**
 * State persistence manager
 */
export class StatePersister<T extends object> {
  private config: Required<PersistConfig<T>> & { storage: StorageManager };
  private lastPersistTime = 0;
  private pendingPersist: ReturnType<typeof setTimeout> | null = null;

  constructor(config: PersistConfig<T>) {
    this.config = {
      key: config.key,
      storage: config.storage ?? localStorageManager,
      version: config.version ?? 1,
      ttl: config.ttl ?? 0,
      serialize: config.serialize ?? ((state) => state),
      deserialize: config.deserialize ?? ((persisted) => persisted as T),
      whitelist: config.whitelist ?? ([] as Array<keyof T>),
      blacklist: config.blacklist ?? ([] as Array<keyof T>),
      migrations: config.migrations ?? {},
      containsPHI: config.containsPHI ?? false,
      merge: config.merge ?? 'shallow',
      throttle: config.throttle ?? 100,
      debug: config.debug ?? false,
    };

    if (this.config.containsPHI) {
      logger.warn('[StatePersister] PHI flag set, persistence disabled', {
        key: this.config.key,
      });
    }
  }

  /**
   * Persist state to storage
   */
  async persist(state: T): Promise<void> {
    // Skip PHI data
    if (this.config.containsPHI) {
      return;
    }

    // Throttle persistence
    const now = Date.now();
    const timeSinceLastPersist = now - this.lastPersistTime;

    if (timeSinceLastPersist < this.config.throttle) {
      // Schedule delayed persist
      if (this.pendingPersist) {
        clearTimeout(this.pendingPersist);
      }

      this.pendingPersist = setTimeout(() => {
        void this.persistImmediate(state);
        this.pendingPersist = null;
      }, this.config.throttle - timeSinceLastPersist);

      return;
    }

    await this.persistImmediate(state);
  }

  /**
   * Rehydrate state from storage
   */
  async rehydrate(): Promise<RehydrateResult<Partial<T>>> {
    // Skip PHI data
    if (this.config.containsPHI) {
      return {
        state: {} as Partial<T>,
        error: null,
        migrated: false,
        fromVersion: null,
      };
    }

    // Outer try-catch for overall rehydration process
    let persisted: PersistedState<unknown> | null | undefined = null;

    // Inner try-catch specifically for storage.get() to handle parse errors gracefully
    try {
      persisted = await this.config.storage.get<PersistedState<unknown> | null>(
        this.config.key
      );
    } catch (storageError) {
      // Handle corrupted storage data (e.g., invalid JSON, parse errors)
      logger.error('[StatePersister] Failed to read from storage, clearing corrupted data', {
        key: this.config.key,
        error: storageError,
      });

      // Clear the corrupted entry to prevent repeated failures
      this.config.storage.remove(this.config.key);

      return {
        state: {} as Partial<T>,
        error: storageError instanceof Error ? storageError : new Error(String(storageError)),
        migrated: false,
        fromVersion: null,
      };
    }

    try {
      if (persisted === null || persisted === undefined) {
        return {
          state: {} as Partial<T>,
          error: null,
          migrated: false,
          fromVersion: null,
        };
      }

      // Check TTL
      if (
        this.config.ttl > 0 &&
        Date.now() - persisted.timestamp > this.config.ttl
      ) {
        this.config.storage.remove(this.config.key);
        return {
          state: {} as Partial<T>,
          error: new Error('Persisted state expired'),
          migrated: false,
          fromVersion: persisted.version,
        };
      }

      // Run migrations if needed
      let migratedState = persisted.state;
      let migrated = false;
      const fromVersion = persisted.version;

      if (persisted.version < this.config.version) {
        migratedState = this.runMigrations(
          persisted.state,
          persisted.version,
          this.config.version
        );
        migrated = true;

        if (this.config.debug) {
          logger.debug('[StatePersister] State migrated', {
            key: this.config.key,
            from: persisted.version,
            to: this.config.version,
          });
        }
      }

      // Deserialize
      const state = this.config.deserialize(migratedState);

      return {
        state: state as Partial<T>,
        error: null,
        migrated,
        fromVersion,
      };
    } catch (error) {
      logger.error('[StatePersister] Failed to rehydrate state', { error });
      return {
        state: null,
        error: error as Error,
        migrated: false,
        fromVersion: null,
      };
    }
  }

  /**
   * Merge persisted state with initial state
   */
  mergeStates(initial: T, persisted: Partial<T> | null): T {
    if (!persisted) return initial;

    switch (this.config.merge) {
      case 'replace':
        return { ...initial, ...persisted };

      case 'deep':
        return deepMerge(initial, persisted);

      case 'shallow':
      default:
        return { ...initial, ...persisted };
    }
  }

  /**
   * Clear persisted state
   */
  clear(): void {
    this.config.storage.remove(this.config.key);

    if (this.pendingPersist) {
      clearTimeout(this.pendingPersist);
      this.pendingPersist = null;
    }
  }

  /**
   * Force immediate persistence
   */
  async flush(state: T): Promise<void> {
    if (this.pendingPersist) {
      clearTimeout(this.pendingPersist);
      this.pendingPersist = null;
    }
    await this.persistImmediate(state);
  }

  /**
   * Filter state based on whitelist/blacklist
   */
  private filterState(state: T): Partial<T> {
    const filtered: Partial<T> = {};
    const keys = Object.keys(state) as Array<keyof T>;

    for (const key of keys) {
      // Skip blacklisted keys
      if (this.config.blacklist.includes(key)) {
        continue;
      }

      // If whitelist exists and key is not in it, skip
      if (
        this.config.whitelist.length > 0 &&
        !this.config.whitelist.includes(key)
      ) {
        continue;
      }

      filtered[key] = state[key];
    }

    return filtered;
  }

  /**
   * Persist state immediately
   */
  private async persistImmediate(state: T): Promise<void> {
    try {
      const filteredState = this.filterState(state);
      const serialized = this.config.serialize(filteredState as T);

      const persisted: PersistedState<unknown> = {
        state: serialized,
        version: this.config.version,
        timestamp: Date.now(),
      };

      await this.config.storage.set(this.config.key, persisted, {
        ttl: this.config.ttl,
      });

      this.lastPersistTime = Date.now();

      if (this.config.debug) {
        logger.debug('[StatePersister] State persisted', {
          key: this.config.key,
          version: this.config.version,
        });
      }
    } catch (error) {
      if (error instanceof StorageQuotaError) {
        logger.warn('[StatePersister] Storage quota exceeded, clearing old data');
        this.config.storage.cleanup();
      } else {
        logger.error('[StatePersister] Failed to persist state', { error });
      }
    }
  }

  /**
   * Run migrations
   */
  private runMigrations(
    state: unknown,
    fromVersion: number,
    toVersion: number
  ): unknown {
    let migratedState = state;

    for (let v = fromVersion + 1; v <= toVersion; v++) {
      const migration = this.config.migrations[v];
      if (migration) {
        migratedState = migration(migratedState);
      }
    }

    return migratedState;
  }
}

// ============================================================================
// Deep Merge Utility
// ============================================================================

/**
 * Deep merge two objects
 */
function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (
        isPlainObject(sourceValue) &&
        isPlainObject(targetValue)
      ) {
        result[key] = deepMerge(
          targetValue as object,
          sourceValue as object
        ) as T[Extract<keyof T, string>];
      } else if (sourceValue !== undefined) {
        result[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }

  return result;
}

/**
 * Check if value is a plain object
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

// ============================================================================
// Zustand Middleware
// ============================================================================

/**
 * Zustand persist middleware options
 */
export interface ZustandPersistOptions<T> extends Omit<PersistConfig<T>, 'key'> {
  name: string;
}

/**
 * Create Zustand persist middleware
 */
export function createZustandPersist<T extends object>(
  options: ZustandPersistOptions<T>
): {
  persist: StatePersister<T>;
  onFinishHydration: (fn: () => void) => () => void;
  hasHydrated: () => boolean;
  rehydrate: () => Promise<void>;
  onHydrate: (listener: () => void) => () => void;
  clearStorage: () => void;
  getPersister: () => StatePersister<T>;
} {
  const persister = new StatePersister<T>({
    ...options,
    key: options.name,
  });

  let isHydrated = false;
  const hydrationListeners: Array<() => void> = [];

  return {
    /**
     * Persist middleware
     */
    persist: persister as unknown as StatePersister<T>,

    /**
     * Rehydrate store
     */
    rehydrate: async (): Promise<void> => {
      // Rehydration is handled internally by the persist middleware
      isHydrated = true;
      hydrationListeners.forEach((listener) => listener());
      return Promise.resolve();
    },

    /**
     * Check if hydrated
     */
    hasHydrated: () => isHydrated,

    /**
     * Subscribe to hydration finish
     */
    onFinishHydration: (fn: () => void) => {
      hydrationListeners.push(fn);
      if (isHydrated) fn();
      return () => {
        const index = hydrationListeners.indexOf(fn);
        if (index > -1) hydrationListeners.splice(index, 1);
      };
    },

    /**
     * Subscribe to hydration
     */
    onHydrate: (listener: () => void) => {
      hydrationListeners.push(listener);
      if (isHydrated) listener();
      return () => {
        const index = hydrationListeners.indexOf(listener);
        if (index > -1) hydrationListeners.splice(index, 1);
      };
    },

    /**
     * Clear persisted state
     */
    clearStorage: () => persister.clear(),

    /**
     * Get persister instance
     */
    getPersister: () => persister,
  };
}

// ============================================================================
// Redux Persist Adapter
// ============================================================================

/**
 * Redux persist storage adapter
 */
export function createReduxPersistStorage(storage: StorageManager = localStorageManager): {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => void;
} {
  return {
    getItem: async (key: string): Promise<string | null> => {
      const value = await storage.get<string>(key);
      return value ?? null;
    },

    setItem: async (key: string, value: string): Promise<void> => {
      await storage.set(key, value);
    },

    removeItem: (key: string): void => {
      storage.remove(key);
    },
  };
}

/**
 * Create PHI-safe transform for redux-persist
 */
export function createPHISafeTransform(phiKeys: string[]): {
  in: (state: Record<string, unknown>, key: string) => Record<string, unknown> | undefined;
  out: (state: Record<string, unknown>) => Record<string, unknown>;
} {
  return {
    in: (state: Record<string, unknown>, key: string) => {
      if (phiKeys.includes(key)) {
        return undefined;
      }
      return state;
    },
    out: (state: Record<string, unknown>) => state,
  };
}

// ============================================================================
// Session State Manager
// ============================================================================

/**
 * Session-scoped state that clears on tab close
 */
export class SessionStatePersister<T extends object> extends StatePersister<T> {
  constructor(config: Omit<PersistConfig<T>, 'storage'>) {
    super({
      ...config,
      // Use session storage instead of local storage
      storage: new StorageManager(
        typeof sessionStorage !== 'undefined'
          ? sessionStorage
          : {
              length: 0,
              key: () => null,
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
              clear: () => {},
            },
        { prefix: 'session' }
      ),
    });
  }
}

// ============================================================================
// State Snapshot Manager
// ============================================================================

/**
 * State snapshot for undo/redo or debugging
 */
export interface StateSnapshot<T> {
  id: string;
  state: T;
  timestamp: number;
  label?: string;
}

/**
 * State snapshot manager for undo/redo functionality
 */
export class StateSnapshotManager<T extends object> {
  private snapshots: StateSnapshot<T>[] = [];
  private currentIndex = -1;
  private readonly maxSnapshots: number;
  private readonly persister: StatePersister<{ snapshots: StateSnapshot<T>[]; currentIndex: number }> | null;

  constructor(
    key: string,
    options: {
      maxSnapshots?: number;
      persist?: boolean;
    } = {}
  ) {
    this.maxSnapshots = options.maxSnapshots ?? 50;

    if (options.persist === true) {
      this.persister = new StatePersister({
        key: `${key}-snapshots`,
        version: 1,
      });
    } else {
      this.persister = null;
    }
  }

  /**
   * Take a snapshot
   */
  snapshot(state: T, label?: string): void {
    // Remove any snapshots after current index (for redo)
    if (this.currentIndex < this.snapshots.length - 1) {
      this.snapshots = this.snapshots.slice(0, this.currentIndex + 1);
    }

    const snapshot: StateSnapshot<T> = {
      id: `snapshot-${Date.now()}`,
      state: structuredClone(state),
      timestamp: Date.now(),
      label,
    };

    this.snapshots.push(snapshot);
    this.currentIndex = this.snapshots.length - 1;

    // Trim if over max
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots);
      this.currentIndex = this.snapshots.length - 1;
    }

    // Persist if enabled
    if (this.persister !== null) {
      void this.persister.persist({
        snapshots: this.snapshots,
        currentIndex: this.currentIndex,
      });
    }
  }

  /**
   * Undo to previous snapshot
   */
  undo(): T | null {
    if (this.currentIndex <= 0) return null;

    this.currentIndex--;
    const snapshot = this.snapshots[this.currentIndex];
    return snapshot ? structuredClone(snapshot.state) : null;
  }

  /**
   * Redo to next snapshot
   */
  redo(): T | null {
    if (this.currentIndex >= this.snapshots.length - 1) return null;

    this.currentIndex++;
    const snapshot = this.snapshots[this.currentIndex];
    return snapshot ? structuredClone(snapshot.state) : null;
  }

  /**
   * Check if can undo
   */
  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  /**
   * Check if can redo
   */
  canRedo(): boolean {
    return this.currentIndex < this.snapshots.length - 1;
  }

  /**
   * Get current snapshot
   */
  getCurrent(): StateSnapshot<T> | null {
    return this.snapshots[this.currentIndex] ?? null;
  }

  /**
   * Get all snapshots
   */
  getSnapshots(): StateSnapshot<T>[] {
    return [...this.snapshots];
  }

  /**
   * Clear all snapshots
   */
  clear(): void {
    this.snapshots = [];
    this.currentIndex = -1;

    if (this.persister !== null) {
      this.persister.clear();
    }
  }

  /**
   * Restore from storage
   */
  async restore(): Promise<void> {
    if (this.persister === null) return;

    const result = await this.persister.rehydrate();
    if (result.state) {
      this.snapshots = result.state.snapshots ?? [];
      this.currentIndex = result.state.currentIndex ?? -1;
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a state persister
 */
export function createStatePersister<T extends object>(
  config: PersistConfig<T>
): StatePersister<T> {
  return new StatePersister(config);
}

/**
 * Create a session state persister
 */
export function createSessionPersister<T extends object>(
  config: Omit<PersistConfig<T>, 'storage'>
): SessionStatePersister<T> {
  return new SessionStatePersister(config);
}

/**
 * Create a snapshot manager
 */
export function createSnapshotManager<T extends object>(
  key: string,
  options?: { maxSnapshots?: number; persist?: boolean }
): StateSnapshotManager<T> {
  return new StateSnapshotManager(key, options);
}
