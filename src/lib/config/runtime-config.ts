/**
 * @fileoverview Runtime configuration management with change tracking.
 *
 * Provides runtime configuration capabilities:
 * - Dynamic value updates
 * - Change tracking and history
 * - Event subscriptions
 * - Rollback support
 *
 * @module config/runtime-config
 *
 * @example
 * ```typescript
 * const runtime = new RuntimeConfig(initialConfig);
 *
 * // Subscribe to changes
 * runtime.subscribe((event) => {
 *   console.log('Config changed:', event.changes);
 * });
 *
 * // Update a value
 * runtime.set('feature.enabled', true);
 *
 * // Rollback last change
 * runtime.rollback();
 * ```
 */

import type {
  ConfigRecord,
  ConfigValue,
  ConfigChange,
  ConfigEvent,
  ConfigEventListener,
  ConfigSourceType,
} from './types';
import {
  getValueAtPath,
  setValueAtPath,
  deleteValueAtPath,
  hasPath,
} from './config-merger';

// ============================================================================
// Types
// ============================================================================

/**
 * Runtime config options.
 */
export interface RuntimeConfigOptions {
  /** Maximum history entries to keep */
  readonly maxHistory?: number;
  /** Enable debug logging */
  readonly debug?: boolean;
  /** Whether changes trigger events immediately */
  readonly immediateEvents?: boolean;
}

/**
 * History entry for rollback.
 */
interface HistoryEntry {
  readonly changes: ConfigChange[];
  readonly timestamp: Date;
}

// ============================================================================
// Runtime Config
// ============================================================================

/**
 * Runtime configuration manager with change tracking.
 */
export class RuntimeConfig<T extends ConfigRecord = ConfigRecord> {
  private config: T;
  private listeners = new Set<ConfigEventListener>();
  private history: HistoryEntry[] = [];
  private options: Required<RuntimeConfigOptions>;
  private pendingChanges: ConfigChange[] = [];
  private batchMode = false;

  constructor(initialConfig: T, options: RuntimeConfigOptions = {}) {
    this.config = { ...initialConfig };
    this.options = {
      maxHistory: options.maxHistory ?? 50,
      debug: options.debug ?? false,
      immediateEvents: options.immediateEvents ?? true,
    };
  }

  // ==========================================================================
  // Getters
  // ==========================================================================

  /**
   * Get the current configuration.
   */
  getConfig(): T {
    return { ...this.config };
  }

  /**
   * Get a value at a path.
   */
  get<V = ConfigValue>(path: string, defaultValue?: V): V {
    return getValueAtPath<V>(this.config, path, defaultValue);
  }

  /**
   * Check if a path exists.
   */
  has(path: string): boolean {
    return hasPath(this.config, path);
  }

  // ==========================================================================
  // Setters
  // ==========================================================================

  /**
   * Set a value at a path.
   */
  set(path: string, value: ConfigValue, source: ConfigSourceType = 'runtime'): void {
    const previousValue = getValueAtPath(this.config, path);

    if (JSON.stringify(previousValue) === JSON.stringify(value)) {
      return; // No change
    }

    this.config = setValueAtPath(this.config, path, value) as T;

    const change: ConfigChange = {
      path,
      previousValue,
      newValue: value,
      source,
      timestamp: new Date(),
    };

    if (this.batchMode) {
      this.pendingChanges.push(change);
    } else {
      this.recordChange([change]);
      if (this.options.immediateEvents) {
        this.emitEvent({ type: 'change', changes: [change], timestamp: new Date() });
      }
    }

    this.log(`Set ${path} = ${JSON.stringify(value)}`);
  }

  /**
   * Delete a value at a path.
   */
  delete(path: string, source: ConfigSourceType = 'runtime'): void {
    if (!hasPath(this.config, path)) {
      return;
    }

    const previousValue = getValueAtPath(this.config, path);
    this.config = deleteValueAtPath(this.config, path) as T;

    const change: ConfigChange = {
      path,
      previousValue,
      newValue: undefined as unknown as ConfigValue,
      source,
      timestamp: new Date(),
    };

    if (this.batchMode) {
      this.pendingChanges.push(change);
    } else {
      this.recordChange([change]);
      if (this.options.immediateEvents) {
        this.emitEvent({ type: 'change', changes: [change], timestamp: new Date() });
      }
    }

    this.log(`Deleted ${path}`);
  }

  /**
   * Update multiple values at once.
   */
  update(updates: Record<string, ConfigValue>, source: ConfigSourceType = 'runtime'): void {
    this.batch(() => {
      for (const [path, value] of Object.entries(updates)) {
        this.set(path, value, source);
      }
    });
  }

  /**
   * Reset to a new configuration.
   */
  reset(config: T): void {
    const previousConfig = this.config;
    this.config = { ...config };

    this.recordChange([
      {
        path: '',
        previousValue: previousConfig,
        newValue: config,
        source: 'runtime',
        timestamp: new Date(),
      },
    ]);

    this.emitEvent({
      type: 'reload',
      changes: [
        {
          path: '',
          previousValue: previousConfig,
          newValue: config,
          source: 'runtime',
          timestamp: new Date(),
        },
      ],
      timestamp: new Date(),
    });

    this.log('Configuration reset');
  }

  // ==========================================================================
  // Batch Operations
  // ==========================================================================

  /**
   * Start a batch of changes.
   */
  startBatch(): void {
    this.batchMode = true;
    this.pendingChanges = [];
  }

  /**
   * Commit the current batch.
   */
  commitBatch(): void {
    if (!this.batchMode) {
      return;
    }

    const changes = [...this.pendingChanges];
    this.batchMode = false;
    this.pendingChanges = [];

    if (changes.length > 0) {
      this.recordChange(changes);
      this.emitEvent({ type: 'change', changes, timestamp: new Date() });
    }
  }

  /**
   * Rollback the current batch.
   */
  rollbackBatch(): void {
    if (!this.batchMode) {
      return;
    }

    // Reverse the pending changes
    for (let i = this.pendingChanges.length - 1; i >= 0; i--) {
      const change = this.pendingChanges[i];
      if (change.previousValue !== undefined) {
        this.config = setValueAtPath(this.config, change.path, change.previousValue) as T;
      } else {
        this.config = deleteValueAtPath(this.config, change.path) as T;
      }
    }

    this.batchMode = false;
    this.pendingChanges = [];
    this.log('Batch rolled back');
  }

  /**
   * Execute a function in batch mode.
   */
  batch(fn: () => void): void {
    this.startBatch();
    try {
      fn();
      this.commitBatch();
    } catch (error) {
      this.rollbackBatch();
      throw error;
    }
  }

  // ==========================================================================
  // History and Rollback
  // ==========================================================================

  /**
   * Rollback the last change.
   */
  rollback(): boolean {
    if (this.history.length === 0) {
      return false;
    }

    const entry = this.history.pop()!;

    // Reverse the changes
    for (let i = entry.changes.length - 1; i >= 0; i--) {
      const change = entry.changes[i];
      if (change.previousValue !== undefined) {
        this.config = setValueAtPath(this.config, change.path, change.previousValue) as T;
      } else {
        this.config = deleteValueAtPath(this.config, change.path) as T;
      }
    }

    this.log(`Rolled back ${entry.changes.length} changes`);
    return true;
  }

  /**
   * Get the change history.
   */
  getHistory(): readonly HistoryEntry[] {
    return [...this.history];
  }

  /**
   * Clear the change history.
   */
  clearHistory(): void {
    this.history = [];
  }

  private recordChange(changes: ConfigChange[]): void {
    this.history.push({
      changes,
      timestamp: new Date(),
    });

    // Trim history if needed
    while (this.history.length > this.options.maxHistory) {
      this.history.shift();
    }
  }

  // ==========================================================================
  // Subscriptions
  // ==========================================================================

  /**
   * Subscribe to configuration events.
   */
  subscribe(listener: ConfigEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Subscribe to changes at a specific path.
   */
  subscribeToPath(
    path: string,
    listener: (value: ConfigValue, change: ConfigChange) => void
  ): () => void {
    const wrappedListener: ConfigEventListener = (event) => {
      if (event.type !== 'change' || !event.changes) {
        return;
      }

      for (const change of event.changes) {
        if (change.path === path || change.path.startsWith(`${path}.`)) {
          listener(getValueAtPath(this.config, path), change);
        }
      }
    };

    return this.subscribe(wrappedListener);
  }

  private emitEvent(event: ConfigEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        this.log('Error in event listener:', error);
      }
    }
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  /**
   * Create a snapshot of the current configuration.
   */
  snapshot(): T {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Restore from a snapshot.
   */
  restore(snapshot: T): void {
    this.reset(snapshot);
  }

  private log(message: string, ...args: unknown[]): void {
    if (this.options.debug) {
      console.log(`[RuntimeConfig] ${message}`, ...args);
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a runtime config instance.
 */
export function createRuntimeConfig<T extends ConfigRecord>(
  initialConfig: T,
  options?: RuntimeConfigOptions
): RuntimeConfig<T> {
  return new RuntimeConfig(initialConfig, options);
}

// ============================================================================
// Singleton Instance
// ============================================================================

let instance: RuntimeConfig | null = null;

/**
 * Get the singleton runtime config instance.
 */
export function getRuntimeConfig<T extends ConfigRecord = ConfigRecord>(): RuntimeConfig<T> {
  if (!instance) {
    instance = new RuntimeConfig({});
  }
  return instance as RuntimeConfig<T>;
}

/**
 * Initialize the singleton with a configuration.
 */
export function initRuntimeConfig<T extends ConfigRecord>(
  config: T,
  options?: RuntimeConfigOptions
): RuntimeConfig<T> {
  instance = new RuntimeConfig(config, options);
  return instance as RuntimeConfig<T>;
}

/**
 * Reset the singleton instance.
 */
export function resetRuntimeConfig(): void {
  instance = null;
}
