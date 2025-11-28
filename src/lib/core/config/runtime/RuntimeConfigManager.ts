/**
 * @fileoverview Runtime configuration manager for hot updates without restarts.
 *
 * The RuntimeConfigManager provides:
 * - Hot configuration updates
 * - Change batching with debounce
 * - Persistence to storage
 * - Rollback capabilities
 * - Remote configuration polling
 *
 * @module core/config/runtime/RuntimeConfigManager
 */

import type {
  LibraryConfig,
  DeepPartial,
  ConfigPath,
  ConfigSource,
  ConfigChangeEvent,
  ConfigChangeListener,
  RuntimeConfigOptions,
  Unsubscribe,
  Milliseconds,
} from '../types';

import { getConfigRegistry } from '../registry/ConfigRegistry';
import { STORAGE_KEYS, DEFAULT_POLLING_INTERVAL } from '../constants';

// =============================================================================
// Types
// =============================================================================

interface PendingChange {
  path: ConfigPath;
  value: unknown;
  source: ConfigSource;
}

interface ConfigSnapshot {
  timestamp: Date;
  config: DeepPartial<LibraryConfig>;
  reason?: string;
}

// =============================================================================
// RuntimeConfigManager Implementation
// =============================================================================

/**
 * Manages runtime configuration updates with batching, persistence, and rollback.
 *
 * @example
 * ```typescript
 * const manager = RuntimeConfigManager.getInstance();
 *
 * // Enable persistence
 * manager.enablePersistence();
 *
 * // Make changes (batched)
 * manager.set('network.defaultTimeout', 60000);
 * manager.set('cache.defaultTTL', 120000);
 *
 * // Manually flush batched changes
 * manager.flush();
 *
 * // Rollback to last snapshot
 * manager.rollback();
 *
 * // Start polling remote config
 * manager.startPolling('https://config.example.com/lib-config');
 * ```
 */
export class RuntimeConfigManager {
  private static instance: RuntimeConfigManager | null = null;

  private options: Required<RuntimeConfigOptions>;
  private pendingChanges: PendingChange[] = [];
  private snapshots: ConfigSnapshot[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private remoteUrl: string | null = null;
  private listeners: Set<ConfigChangeListener> = new Set();
  private maxSnapshots = 10;

  private constructor(options: RuntimeConfigOptions = {}) {
    this.options = {
      persist: options.persist ?? false,
      storageKey: options.storageKey ?? STORAGE_KEYS.CONFIG_OVERRIDES,
      validate: options.validate ?? true,
      emitEvents: options.emitEvents ?? true,
      debounceDelay: options.debounceDelay ?? 100,
    };

    // Load persisted config on initialization
    if (this.options.persist) {
      this.loadFromStorage();
    }
  }

  /**
   * Get the singleton instance.
   */
  static getInstance(options?: RuntimeConfigOptions): RuntimeConfigManager {
    if (!RuntimeConfigManager.instance) {
      RuntimeConfigManager.instance = new RuntimeConfigManager(options);
    }
    return RuntimeConfigManager.instance;
  }

  /**
   * Reset the singleton instance (for testing).
   */
  static resetInstance(): void {
    if (RuntimeConfigManager.instance) {
      RuntimeConfigManager.instance.stopPolling();
    }
    RuntimeConfigManager.instance = null;
  }

  // ===========================================================================
  // Configuration Updates
  // ===========================================================================

  /**
   * Set a configuration value (batched by default).
   */
  set(path: ConfigPath, value: unknown, source: ConfigSource = 'runtime'): void {
    this.pendingChanges.push({ path, value, source });
    this.scheduleFlush();
  }

  /**
   * Set a configuration value immediately (bypasses batching).
   */
  setImmediate(path: ConfigPath, value: unknown, source: ConfigSource = 'runtime'): void {
    this.createSnapshot(`Before immediate change: ${path}`);
    const registry = getConfigRegistry();
    registry.set(path, value, source);

    if (this.options.persist) {
      this.saveToStorage();
    }
  }

  /**
   * Apply a partial configuration overlay (batched).
   */
  applyOverlay(overlay: DeepPartial<LibraryConfig>, source: ConfigSource = 'runtime'): void {
    this.traverseAndQueue(overlay, '', source);
    this.scheduleFlush();
  }

  /**
   * Apply a partial configuration overlay immediately.
   */
  applyOverlayImmediate(
    overlay: DeepPartial<LibraryConfig>,
    source: ConfigSource = 'runtime'
  ): void {
    this.createSnapshot('Before overlay');
    const registry = getConfigRegistry();
    registry.applyOverlay(overlay, source);

    if (this.options.persist) {
      this.saveToStorage();
    }
  }

  /**
   * Flush all pending changes.
   */
  flush(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.pendingChanges.length === 0) {
      return;
    }

    this.createSnapshot('Before batch update');

    const registry = getConfigRegistry();
    const changes = [...this.pendingChanges];
    this.pendingChanges = [];

    for (const { path, value, source } of changes) {
      registry.set(path, value, source);
    }

    if (this.options.persist) {
      this.saveToStorage();
    }
  }

  /**
   * Cancel pending changes.
   */
  cancelPending(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.pendingChanges = [];
  }

  /**
   * Get the number of pending changes.
   */
  getPendingCount(): number {
    return this.pendingChanges.length;
  }

  // ===========================================================================
  // Snapshots and Rollback
  // ===========================================================================

  /**
   * Create a snapshot of the current configuration.
   */
  createSnapshot(reason?: string): void {
    const registry = getConfigRegistry();
    const config = registry.getConfig();

    this.snapshots.push({
      timestamp: new Date(),
      config: JSON.parse(JSON.stringify(config)),
      reason,
    });

    // Keep only the last N snapshots
    while (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }
  }

  /**
   * Rollback to the last snapshot.
   */
  rollback(): boolean {
    if (this.snapshots.length === 0) {
      console.warn('[RuntimeConfigManager] No snapshots available for rollback');
      return false;
    }

    const snapshot = this.snapshots.pop()!;
    const registry = getConfigRegistry();
    registry.reset();
    registry.applyOverlay(snapshot.config, 'runtime');

    if (this.options.persist) {
      this.saveToStorage();
    }

    console.info('[RuntimeConfigManager] Rolled back to snapshot from', snapshot.timestamp);
    return true;
  }

  /**
   * Get all snapshots.
   */
  getSnapshots(): readonly ConfigSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Clear all snapshots.
   */
  clearSnapshots(): void {
    this.snapshots = [];
  }

  // ===========================================================================
  // Persistence
  // ===========================================================================

  /**
   * Enable configuration persistence.
   */
  enablePersistence(storageKey?: string): void {
    this.options.persist = true;
    if (storageKey) {
      this.options.storageKey = storageKey;
    }
    this.saveToStorage();
  }

  /**
   * Disable configuration persistence.
   */
  disablePersistence(): void {
    this.options.persist = false;
  }

  /**
   * Save current configuration to storage.
   */
  saveToStorage(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      const registry = getConfigRegistry();
      const config = registry.getConfig();
      localStorage.setItem(this.options.storageKey, JSON.stringify(config));
    } catch (error) {
      console.error('[RuntimeConfigManager] Failed to save to storage:', error);
    }
  }

  /**
   * Load configuration from storage.
   */
  loadFromStorage(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      const stored = localStorage.getItem(this.options.storageKey);
      if (stored) {
        const config = JSON.parse(stored) as DeepPartial<LibraryConfig>;
        const registry = getConfigRegistry();
        registry.applyOverlay(config, 'runtime');
      }
    } catch (error) {
      console.error('[RuntimeConfigManager] Failed to load from storage:', error);
    }
  }

  /**
   * Clear persisted configuration.
   */
  clearStorage(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.options.storageKey);
    }
  }

  // ===========================================================================
  // Remote Configuration
  // ===========================================================================

  /**
   * Start polling for remote configuration updates.
   */
  startPolling(url: string, interval: Milliseconds = DEFAULT_POLLING_INTERVAL): void {
    this.remoteUrl = url;

    // Fetch immediately
    this.fetchRemoteConfig();

    // Set up polling
    this.pollingTimer = setInterval(() => {
      this.fetchRemoteConfig();
    }, interval);
  }

  /**
   * Stop polling for remote configuration.
   */
  stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    this.remoteUrl = null;
  }

  /**
   * Fetch remote configuration once.
   */
  async fetchRemoteConfig(): Promise<void> {
    if (!this.remoteUrl) {
      return;
    }

    try {
      const response = await fetch(this.remoteUrl, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const config = (await response.json()) as DeepPartial<LibraryConfig>;
      this.applyOverlayImmediate(config, 'remote');
    } catch (error) {
      console.error('[RuntimeConfigManager] Failed to fetch remote config:', error);
    }
  }

  // ===========================================================================
  // Subscriptions
  // ===========================================================================

  /**
   * Subscribe to runtime configuration changes.
   */
  subscribe(listener: ConfigChangeListener): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private scheduleFlush(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.flush();
    }, this.options.debounceDelay);
  }

  private traverseAndQueue(obj: unknown, prefix: string, source: ConfigSource): void {
    if (obj === null || typeof obj !== 'object') {
      if (prefix) {
        this.pendingChanges.push({ path: prefix, value: obj, source });
      }
      return;
    }

    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        this.traverseAndQueue(value, path, source);
      } else {
        this.pendingChanges.push({ path, value, source });
      }
    }
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Get the RuntimeConfigManager singleton instance.
 */
export function getRuntimeConfigManager(
  options?: RuntimeConfigOptions
): RuntimeConfigManager {
  return RuntimeConfigManager.getInstance(options);
}

/**
 * Set a runtime configuration value.
 */
export function setRuntimeConfig(path: ConfigPath, value: unknown): void {
  getRuntimeConfigManager().set(path, value);
}

/**
 * Apply a runtime configuration overlay.
 */
export function applyRuntimeOverlay(overlay: DeepPartial<LibraryConfig>): void {
  getRuntimeConfigManager().applyOverlay(overlay);
}

/**
 * Rollback to the previous configuration snapshot.
 */
export function rollbackConfig(): boolean {
  return getRuntimeConfigManager().rollback();
}

/**
 * Start polling for remote configuration.
 */
export function startConfigPolling(url: string, interval?: Milliseconds): void {
  getRuntimeConfigManager().startPolling(url, interval);
}

/**
 * Stop polling for remote configuration.
 */
export function stopConfigPolling(): void {
  getRuntimeConfigManager().stopPolling();
}
