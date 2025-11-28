/**
 * @fileoverview Centralized configuration registry for the library module.
 *
 * The ConfigRegistry provides:
 * - Single source of truth for all library configuration
 * - Type-safe configuration access with path notation
 * - Runtime configuration updates with change events
 * - Environment-specific overrides
 * - Configuration source tracking
 *
 * @module core/config/registry/ConfigRegistry
 */

import type {
  LibraryConfig,
  DeepPartial,
  DeepReadonly,
  ConfigPath,
  ConfigSource,
  ConfigChangeEvent,
  ConfigChangeListener,
  Unsubscribe,
  IConfigRegistry,
  Environment,
} from '../types';

import {
  DEFAULT_NETWORK_CONFIG,
  DEFAULT_CACHE_CONFIG,
  DEFAULT_FLAGS_CONFIG,
  DEFAULT_AUTH_CONFIG,
  DEFAULT_LAYOUTS_CONFIG,
  DEFAULT_VDOM_CONFIG,
  DEFAULT_UI_CONFIG,
  DEFAULT_MONITORING_CONFIG,
} from '../constants/timing.constants';

import { detectEnvironment as detectEnvFromConfig } from '@/lib/config/environment-config';

// =============================================================================
// Default Configuration
// =============================================================================

/**
 * Complete default library configuration.
 */
const DEFAULT_LIBRARY_CONFIG: LibraryConfig = {
  network: DEFAULT_NETWORK_CONFIG,
  cache: DEFAULT_CACHE_CONFIG,
  flags: DEFAULT_FLAGS_CONFIG,
  auth: DEFAULT_AUTH_CONFIG,
  layouts: DEFAULT_LAYOUTS_CONFIG,
  vdom: DEFAULT_VDOM_CONFIG,
  ui: DEFAULT_UI_CONFIG,
  monitoring: DEFAULT_MONITORING_CONFIG,
};

// =============================================================================
// Environment Overrides
// =============================================================================

/**
 * Environment-specific configuration overrides.
 */
const ENVIRONMENT_OVERRIDES: Record<Environment, DeepPartial<LibraryConfig>> = {
  development: {
    network: {
      defaultTimeout: 60000,       // Longer timeout for debugging
      maxRetryAttempts: 1,         // Fewer retries in dev
    },
    cache: {
      defaultTTL: 60000,           // Shorter cache in dev
    },
    monitoring: {
      samplingRate: 1.0,           // Full sampling in dev
    },
  },
  staging: {
    network: {
      defaultTimeout: 45000,
      maxRetryAttempts: 2,
    },
    monitoring: {
      samplingRate: 0.5,           // 50% sampling in staging
    },
  },
  production: {
    network: {
      defaultTimeout: 30000,
      maxRetryAttempts: 3,
    },
    cache: {
      defaultTTL: 300000,          // 5 minute cache in prod
    },
    monitoring: {
      samplingRate: 0.1,           // 10% sampling in prod
    },
  },
  test: {
    network: {
      defaultTimeout: 5000,        // Fast timeout in tests
      maxRetryAttempts: 0,         // No retries in tests
    },
    cache: {
      defaultTTL: 0,               // No cache in tests
    },
    monitoring: {
      samplingRate: 0,             // No monitoring in tests
    },
  },
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get a value at a dot-notation path from an object.
 */
function getAtPath<T>(obj: unknown, path: string, defaultValue?: T): T {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return defaultValue as T;
    }
    if (typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return defaultValue as T;
    }
  }

  return (current ?? defaultValue) as T;
}

/**
 * Set a value at a dot-notation path in an object.
 */
function setAtPath<T extends object>(obj: T, path: string, value: unknown): T {
  const parts = path.split('.');
  const result = { ...obj } as Record<string, unknown>;
  let current = result;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (part && typeof current[part] === 'object' && current[part] !== null) {
      current[part] = { ...(current[part] as object) };
    } else if (part) {
      current[part] = {};
    }
    if (part) {
      current = current[part] as Record<string, unknown>;
    }
  }

  const lastPart = parts[parts.length - 1];
  if (lastPart !== undefined) {
    current[lastPart] = value;
  }
  return result as T;
}

/**
 * Check if a path exists in an object.
 */
function hasPath(obj: unknown, path: string): boolean {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return false;
    }
    if (typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return false;
    }
  }

  return true;
}

/**
 * Deep merge two objects.
 */
function deepMerge<T extends object>(target: T, source: DeepPartial<T>): T {
  const result = { ...target } as Record<string, unknown>;

  for (const key of Object.keys(source)) {
    const sourceValue = (source as Record<string, unknown>)[key];
    const targetValue = result[key];

    if (
      sourceValue !== null &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue !== null &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(
        targetValue as object,
        sourceValue as DeepPartial<object>
      );
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue;
    }
  }

  return result as T;
}

/**
 * Deep freeze an object.
 */
function deepFreeze<T extends object>(obj: T): DeepReadonly<T> {
  const propNames = Object.getOwnPropertyNames(obj);

  for (const name of propNames) {
    const value = (obj as Record<string, unknown>)[name];

    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value as object);
    }
  }

  return Object.freeze(obj) as DeepReadonly<T>;
}

// =============================================================================
// ConfigRegistry Implementation
// =============================================================================

/**
 * Centralized configuration registry for the library.
 *
 * Provides type-safe access to all library configuration with support for:
 * - Runtime updates
 * - Environment-specific overrides
 * - Change subscriptions
 * - Source tracking
 *
 * @example
 * ```typescript
 * const registry = ConfigRegistry.getInstance();
 *
 * // Get complete config
 * const config = registry.getConfig();
 *
 * // Get specific value
 * const timeout = registry.get('network.defaultTimeout');
 *
 * // Update at runtime
 * registry.set('network.defaultTimeout', 60000);
 *
 * // Subscribe to changes
 * const unsub = registry.subscribe((event) => {
 *   console.log(`${event.path} changed to ${event.newValue}`);
 * });
 * ```
 */
export class ConfigRegistry implements IConfigRegistry {
  private static instance: ConfigRegistry | null = null;

  private config: LibraryConfig;
  private sources: Map<string, ConfigSource> = new Map();
  private listeners: Set<ConfigChangeListener> = new Set();
  private pathListeners: Map<string, Set<ConfigChangeListener>> = new Map();
  private environment: Environment = 'development';
  private frozen = false;

  private constructor() {
    this.config = { ...DEFAULT_LIBRARY_CONFIG };
    this.initializeSources();
    this.detectEnvironment();
  }

  /**
   * Get the singleton instance.
   */
  static getInstance(): ConfigRegistry {
    if (!ConfigRegistry.instance) {
      ConfigRegistry.instance = new ConfigRegistry();
    }
    return ConfigRegistry.instance;
  }

  /**
   * Reset the singleton instance (for testing).
   */
  static resetInstance(): void {
    ConfigRegistry.instance = null;
  }

  /**
   * Initialize source tracking for all paths.
   */
  private initializeSources(): void {
    this.traverseAndMarkSource(this.config, '', 'default');
  }

  private traverseAndMarkSource(obj: unknown, prefix: string, source: ConfigSource): void {
    if (obj === null || typeof obj !== 'object') {
      if (prefix) {
        this.sources.set(prefix, source);
      }
      return;
    }

    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        this.traverseAndMarkSource(value, path, source);
      } else {
        this.sources.set(path, source);
      }
    }
  }

  /**
   * Detect and apply environment.
   * Uses centralized detectEnvironment() from environment-config to avoid
   * duplicating environment detection logic across the codebase.
   */
  private detectEnvironment(): void {
    const detectedEnv = detectEnvFromConfig();
    this.applyEnvironmentOverrides(detectedEnv);
  }

  // ===========================================================================
  // IConfigRegistry Implementation
  // ===========================================================================

  /**
   * Get the complete library configuration (frozen).
   */
  getConfig(): DeepReadonly<LibraryConfig> {
    return deepFreeze({ ...this.config });
  }

  /**
   * Get a configuration value by path.
   */
  get<T>(path: ConfigPath, defaultValue?: T): T {
    return getAtPath<T>(this.config, path, defaultValue);
  }

  /**
   * Check if a configuration path exists.
   */
  has(path: ConfigPath): boolean {
    return hasPath(this.config, path);
  }

  /**
   * Set a runtime configuration value.
   */
  set(path: ConfigPath, value: unknown, source: ConfigSource = 'runtime'): void {
    if (this.frozen) {
      console.warn('[ConfigRegistry] Cannot modify frozen configuration');
      return;
    }

    const previousValue = this.get(path);

    if (JSON.stringify(previousValue) === JSON.stringify(value)) {
      return; // No change
    }

    this.config = setAtPath(this.config, path, value);
    this.sources.set(path, source);

    const event: ConfigChangeEvent = {
      path,
      previousValue,
      newValue: value,
      source,
      timestamp: new Date(),
    };

    this.emitChange(event);
  }

  /**
   * Reset configuration to defaults.
   */
  reset(path?: ConfigPath): void {
    if (path) {
      const defaultValue = getAtPath(DEFAULT_LIBRARY_CONFIG, path);
      this.set(path, defaultValue, 'default');
    } else {
      this.config = { ...DEFAULT_LIBRARY_CONFIG };
      this.sources.clear();
      this.initializeSources();
      this.applyEnvironmentOverrides(this.environment);
    }
  }

  /**
   * Subscribe to all configuration changes.
   */
  subscribe(listener: ConfigChangeListener): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Subscribe to changes at a specific path.
   */
  subscribeToPath(path: ConfigPath, listener: ConfigChangeListener): Unsubscribe {
    if (!this.pathListeners.has(path)) {
      this.pathListeners.set(path, new Set());
    }
    this.pathListeners.get(path)!.add(listener);

    return () => {
      const listeners = this.pathListeners.get(path);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.pathListeners.delete(path);
        }
      }
    };
  }

  /**
   * Apply environment-specific overrides.
   */
  applyEnvironmentOverrides(env: Environment): void {
    this.environment = env;
    const overrides = ENVIRONMENT_OVERRIDES[env];

    if (overrides) {
      this.config = deepMerge(this.config, overrides);
      this.traverseAndMarkSource(overrides, '', 'environment');
    }
  }

  /**
   * Get the source of a configuration value.
   */
  getSource(path: ConfigPath): ConfigSource {
    return this.sources.get(path) ?? 'default';
  }

  // ===========================================================================
  // Additional Methods
  // ===========================================================================

  /**
   * Get the current environment.
   */
  getEnvironment(): Environment {
    return this.environment;
  }

  /**
   * Apply a partial configuration overlay.
   */
  applyOverlay(overlay: DeepPartial<LibraryConfig>, source: ConfigSource = 'override'): void {
    this.config = deepMerge(this.config, overlay);
    this.traverseAndMarkSource(overlay, '', source);
  }

  /**
   * Freeze the configuration (prevent further modifications).
   */
  freeze(): void {
    this.frozen = true;
  }

  /**
   * Unfreeze the configuration.
   */
  unfreeze(): void {
    this.frozen = false;
  }

  /**
   * Check if configuration is frozen.
   */
  isFrozen(): boolean {
    return this.frozen;
  }

  /**
   * Get all configuration paths.
   */
  getAllPaths(): string[] {
    return Array.from(this.sources.keys());
  }

  /**
   * Export configuration as JSON.
   */
  toJSON(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from JSON.
   */
  fromJSON(json: string, source: ConfigSource = 'runtime'): void {
    try {
      const parsed = JSON.parse(json) as DeepPartial<LibraryConfig>;
      this.applyOverlay(parsed, source);
    } catch (error) {
      console.error('[ConfigRegistry] Failed to parse JSON:', error);
      throw error;
    }
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private emitChange(event: ConfigChangeEvent): void {
    // Notify global listeners
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('[ConfigRegistry] Error in change listener:', error);
      }
    }

    // Notify path-specific listeners
    for (const [path, listeners] of this.pathListeners) {
      if (event.path === path || event.path.startsWith(`${path}.`)) {
        for (const listener of listeners) {
          try {
            listener(event);
          } catch (error) {
            console.error('[ConfigRegistry] Error in path listener:', error);
          }
        }
      }
    }
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Get the ConfigRegistry singleton instance.
 */
export function getConfigRegistry(): ConfigRegistry {
  return ConfigRegistry.getInstance();
}

/**
 * Get the complete library configuration.
 */
export function getLibConfig(): DeepReadonly<LibraryConfig> {
  return getConfigRegistry().getConfig();
}

/**
 * Get a configuration value by path.
 */
export function getLibConfigValue<T>(path: ConfigPath, defaultValue?: T): T {
  return getConfigRegistry().get(path, defaultValue);
}

/**
 * Set a runtime configuration value.
 */
export function setLibConfigValue(path: ConfigPath, value: unknown): void {
  getConfigRegistry().set(path, value, 'runtime');
}

/**
 * Subscribe to configuration changes.
 */
export function subscribeToLibConfig(listener: ConfigChangeListener): Unsubscribe {
  return getConfigRegistry().subscribe(listener);
}

// =============================================================================
// Typed Accessors
// =============================================================================

/**
 * Type-safe accessors for configuration domains.
 */
export const LIB_CONFIG: {
  readonly network: DeepReadonly<LibraryConfig['network']>;
  readonly cache: DeepReadonly<LibraryConfig['cache']>;
  readonly flags: DeepReadonly<LibraryConfig['flags']>;
  readonly auth: DeepReadonly<LibraryConfig['auth']>;
  readonly layouts: DeepReadonly<LibraryConfig['layouts']>;
  readonly vdom: DeepReadonly<LibraryConfig['vdom']>;
  readonly ui: DeepReadonly<LibraryConfig['ui']>;
  readonly monitoring: DeepReadonly<LibraryConfig['monitoring']>;
} = {
  get network() {
    return getConfigRegistry().getConfig().network;
  },
  get cache() {
    return getConfigRegistry().getConfig().cache;
  },
  get flags() {
    return getConfigRegistry().getConfig().flags;
  },
  get auth() {
    return getConfigRegistry().getConfig().auth;
  },
  get layouts() {
    return getConfigRegistry().getConfig().layouts;
  },
  get vdom() {
    return getConfigRegistry().getConfig().vdom;
  },
  get ui() {
    return getConfigRegistry().getConfig().ui;
  },
  get monitoring() {
    return getConfigRegistry().getConfig().monitoring;
  },
};
