/**
 * @file Configuration Registry
 * @description Central registry for all application configuration with namespace support.
 *
 * The Configuration Registry provides:
 * - Namespace-based configuration isolation
 * - Type-safe configuration access
 * - Configuration versioning and migrations
 * - Subscription-based change notifications
 * - Thread-safe concurrent access patterns
 *
 * @module config/config-registry
 */

import type {
  ConfigValue,
  ConfigRecord,
  ConfigNamespace,
  ConfigEntry,
  ConfigEntryMeta,
  ConfigSource,
  ConfigEnvironment as _ConfigEnvironment,
  ConfigSchema,
  ConfigChangeEvent,
  ConfigChangeListener,
  ConfigUnsubscribe,
  ConfigSetOptions,
  ConfigMigration,
  MigrationResult,
  ConfigValidationResult,
  DeepReadonly,
} from './types';
import { CONFIG_NAMESPACES, createNamespace } from './types';
import { validateConfig } from './config-validation';

// =============================================================================
// Internal Types
// =============================================================================

interface RegistryEntry<T extends ConfigValue = ConfigValue> {
  value: T;
  meta: ConfigEntryMeta;
  schema?: ConfigSchema;
}

interface NamespaceData {
  entries: Map<string, RegistryEntry>;
  listeners: Map<string, Set<ConfigChangeListener>>;
  wildcardListeners: Set<ConfigChangeListener>;
  migrations: ConfigMigration[];
  currentVersion: number;
}

// =============================================================================
// Configuration Registry Class
// =============================================================================

/**
 * Central Configuration Registry
 *
 * Provides namespace-based configuration management with:
 * - Type-safe configuration access
 * - Change subscriptions
 * - Version migrations
 * - Validation support
 *
 * @example
 * ```typescript
 * const registry = ConfigRegistry.getInstance();
 *
 * // Register configuration
 * registry.set(CONFIG_NAMESPACES.STREAMING, 'bufferSize', 65536);
 *
 * // Get configuration
 * const bufferSize = registry.get<number>(CONFIG_NAMESPACES.STREAMING, 'bufferSize');
 *
 * // Subscribe to changes
 * const unsubscribe = registry.subscribe(
 *   CONFIG_NAMESPACES.STREAMING,
 *   'bufferSize',
 *   (event) => console.log('Buffer size changed:', event.newValue)
 * );
 * ```
 */
export class ConfigRegistry {
  private static instance: ConfigRegistry | null = null;
  private readonly namespaces: Map<ConfigNamespace, NamespaceData> = new Map();
  private readonly globalListeners: Set<ConfigChangeListener> = new Set();
  private frozen: boolean = false;

  private constructor() {
    // Initialize built-in namespaces
    Object.values(CONFIG_NAMESPACES).forEach((namespace) => {
      this.ensureNamespace(namespace);
    });
  }

  /**
   * Get the singleton registry instance
   */
  public static getInstance(): ConfigRegistry {
    ConfigRegistry.instance ??= new ConfigRegistry();
    return ConfigRegistry.instance;
  }

  /**
   * Reset the registry (useful for testing)
   */
  public static reset(): void {
    ConfigRegistry.instance = null;
  }

  // ---------------------------------------------------------------------------
  // Namespace Management
  // ---------------------------------------------------------------------------

  /**
   * Ensure a namespace exists in the registry
   */
  private ensureNamespace(namespace: ConfigNamespace): NamespaceData {
    if (!this.namespaces.has(namespace)) {
      this.namespaces.set(namespace, {
        entries: new Map(),
        listeners: new Map(),
        wildcardListeners: new Set(),
        migrations: [],
        currentVersion: 1,
      });
    }
    const ns = this.namespaces.get(namespace);
    if (ns == null) {
      throw new Error(`Failed to initialize namespace: ${String(namespace)}`);
    }
    return ns;
  }

  /**
   * Create a new namespace
   *
   * @param name - Namespace name
   * @returns Created namespace identifier
   */
  public createNamespace(name: string): ConfigNamespace {
    const namespace = createNamespace(name);
    this.ensureNamespace(namespace);
    return namespace;
  }

  /**
   * Check if a namespace exists
   */
  public hasNamespace(namespace: ConfigNamespace): boolean {
    return this.namespaces.has(namespace);
  }

  /**
   * Get all registered namespaces
   */
  public getNamespaces(): ConfigNamespace[] {
    return Array.from(this.namespaces.keys());
  }

  /**
   * Clear all entries in a namespace
   */
  public clearNamespace(namespace: ConfigNamespace): void {
    if (this.frozen) {
      throw new Error('Cannot modify frozen registry');
    }

    const data = this.namespaces.get(namespace);
    if (data) {
      const entries = Array.from(data.entries.entries());
      data.entries.clear();

      // Notify listeners
      entries.forEach(([key, entry]) => {
        this.notifyListeners(namespace, key, entry.value, undefined, 'runtime');
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Configuration Access
  // ---------------------------------------------------------------------------

  /**
   * Get a configuration value
   *
   * @param namespace - Configuration namespace
   * @param key - Configuration key
   * @returns Configuration value or undefined
   */
  public get<T extends ConfigValue = ConfigValue>(
    namespace: ConfigNamespace,
    key: string
  ): T | undefined {
    const data = this.namespaces.get(namespace);
    if (!data) return undefined;

    const entry = data.entries.get(key);
    return entry?.value as T | undefined;
  }

  /**
   * Get a configuration value with a default fallback
   *
   * @param namespace - Configuration namespace
   * @param key - Configuration key
   * @param defaultValue - Default value if not found
   * @returns Configuration value or default
   */
  public getOrDefault<T extends ConfigValue = ConfigValue>(
    namespace: ConfigNamespace,
    key: string,
    defaultValue: T
  ): T {
    const value = this.get<T>(namespace, key);
    return value ?? defaultValue;
  }

  /**
   * Get all configurations in a namespace
   *
   * @param namespace - Configuration namespace
   * @returns Record of all configurations
   */
  public getNamespaceConfig<T extends ConfigRecord = ConfigRecord>(
    namespace: ConfigNamespace
  ): DeepReadonly<T> {
    const data = this.namespaces.get(namespace);
    if (!data) return {} as DeepReadonly<T>;

    const result: ConfigRecord = {};
    data.entries.forEach((entry, key) => {
      result[key] = entry.value;
    });

    return Object.freeze(result) as DeepReadonly<T>;
  }

  /**
   * Get configuration entry with metadata
   */
  public getEntry<T extends ConfigValue = ConfigValue>(
    namespace: ConfigNamespace,
    key: string
  ): ConfigEntry<T> | undefined {
    const data = this.namespaces.get(namespace);
    if (!data) return undefined;

    const entry = data.entries.get(key);
    if (!entry) return undefined;

    return {
      namespace,
      key,
      value: entry.value as T,
      schema: entry.schema,
      meta: entry.meta,
    };
  }

  /**
   * Get metadata for a configuration entry
   */
  public getMeta(
    namespace: ConfigNamespace,
    key: string
  ): ConfigEntryMeta | undefined {
    const entry = this.getEntry(namespace, key);
    return entry?.meta;
  }

  /**
   * Check if a configuration exists
   */
  public has(namespace: ConfigNamespace, key: string): boolean {
    const data = this.namespaces.get(namespace);
    return data?.entries.has(key) ?? false;
  }

  // ---------------------------------------------------------------------------
  // Configuration Modification
  // ---------------------------------------------------------------------------

  /**
   * Set a configuration value
   *
   * @param namespace - Configuration namespace
   * @param key - Configuration key
   * @param value - Configuration value
   * @param options - Set options
   */
  public set<T extends ConfigValue = ConfigValue>(
    namespace: ConfigNamespace,
    key: string,
    value: T,
    options: ConfigSetOptions = {}
  ): void {
    if (this.frozen && !(options.source?.includes('override') ?? false)) {
      throw new Error('Cannot modify frozen registry');
    }

    const data = this.ensureNamespace(namespace);
    const existingEntry = data.entries.get(key);

    // Check if entry is frozen
    if ((existingEntry?.meta.frozen === true) && options.source !== 'override') {
      throw new Error(`Configuration "${namespace}:${key}" is frozen and cannot be modified`);
    }

    // Validate if schema provided
    if (options.schema && !(options.skipValidation === true)) {
      const validation = validateConfig(options.schema, value, `${namespace}.${key}`);
      if (!validation.success) {
        throw new Error(
          `Validation failed for "${namespace}:${key}": ${validation.errors?.map((e) => e.message).join(', ')}`
        );
      }
    }

    const previousValue = existingEntry?.value;
    const now = new Date().toISOString();

    const meta: ConfigEntryMeta = {
      registeredAt: existingEntry?.meta.registeredAt ?? now,
      updatedAt: now,
      source: options.source ?? 'runtime',
      frozen: options.freeze ?? false,
      version: data.currentVersion,
      tags: options.tags,
      environments: options.environments,
    };

    data.entries.set(key, {
      value: (options.freeze === true) ? Object.freeze(value as object) as T : value,
      meta,
      schema: options.schema,
    });

    // Notify listeners
    if (!(options.silent === true)) {
      this.notifyListeners(
        namespace,
        key,
        previousValue,
        value,
        options.source ?? 'runtime'
      );
    }
  }

  /**
   * Set multiple configuration values at once
   */
  public setMany<T extends ConfigRecord = ConfigRecord>(
    namespace: ConfigNamespace,
    values: T,
    options: ConfigSetOptions = {}
  ): void {
    Object.entries(values).forEach(([key, value]) => {
      this.set(namespace, key, value, { ...options, silent: true });
    });

    // Send batch notification
    if (!(options.silent === true)) {
      this.notifyListeners(
        namespace,
        '*',
        undefined,
        values as ConfigValue,
        options.source ?? 'runtime'
      );
    }
  }

  /**
   * Delete a configuration
   */
  public delete(namespace: ConfigNamespace, key: string): boolean {
    if (this.frozen) {
      throw new Error('Cannot modify frozen registry');
    }

    const data = this.namespaces.get(namespace);
    if (!data) return false;

    const entry = data.entries.get(key);
    if (!entry) return false;

    if (entry.meta.frozen) {
      throw new Error(`Configuration "${namespace}:${key}" is frozen and cannot be deleted`);
    }

    data.entries.delete(key);
    this.notifyListeners(namespace, key, entry.value, undefined, 'runtime');

    return true;
  }

  /**
   * Merge configuration into existing values
   */
  public merge<T extends ConfigRecord = ConfigRecord>(
    namespace: ConfigNamespace,
    key: string,
    partial: Partial<T>,
    options: ConfigSetOptions = {}
  ): void {
    const existing = this.get<T>(namespace, key) ?? ({} as T);
    const merged = { ...existing, ...partial };
    this.set(namespace, key, merged as ConfigValue, options);
  }

  // ---------------------------------------------------------------------------
  // Subscriptions
  // ---------------------------------------------------------------------------

  /**
   * Subscribe to configuration changes
   *
   * @param namespace - Configuration namespace
   * @param key - Configuration key or '*' for all changes in namespace
   * @param listener - Change listener
   * @returns Unsubscribe function
   */
  public subscribe(
    namespace: ConfigNamespace,
    key: string,
    listener: ConfigChangeListener
  ): ConfigUnsubscribe {
    const data = this.ensureNamespace(namespace);

    if (key === '*') {
      data.wildcardListeners.add(listener);
      return () => data.wildcardListeners.delete(listener);
    }

    if (!data.listeners.has(key)) {
      data.listeners.set(key, new Set());
    }
    const listenerSet = data.listeners.get(key);
    if (listenerSet != null) {
      listenerSet.add(listener);
    }

    return () => {
      data.listeners.get(key)?.delete(listener);
    };
  }

  /**
   * Subscribe to all configuration changes across all namespaces
   */
  public subscribeGlobal(listener: ConfigChangeListener): ConfigUnsubscribe {
    this.globalListeners.add(listener);
    return () => this.globalListeners.delete(listener);
  }

  /**
   * Notify listeners of a configuration change
   */
  private notifyListeners(
    namespace: ConfigNamespace,
    key: string,
    previousValue: ConfigValue | undefined,
    newValue: ConfigValue | undefined,
    source: ConfigSource
  ): void {
    let eventType: 'set' | 'delete';
    if (newValue === undefined) {
      eventType = 'delete';
    } else {
      eventType = 'set';
    }

    const event: ConfigChangeEvent = {
      type: eventType,
      namespace,
      key,
      previousValue,
      newValue,
      source,
      timestamp: new Date().toISOString(),
    };

    const data = this.namespaces.get(namespace);
    if (data) {
      // Key-specific listeners
      data.listeners.get(key)?.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in config listener for ${namespace}:${key}:`, error);
        }
      });

      // Wildcard listeners
      data.wildcardListeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in wildcard config listener for ${namespace}:`, error);
        }
      });
    }

    // Global listeners
    this.globalListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in global config listener:', error);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Versioning & Migrations
  // ---------------------------------------------------------------------------

  /**
   * Register a migration for a namespace
   */
  public registerMigration<TFrom extends ConfigValue, TTo extends ConfigValue>(
    namespace: ConfigNamespace,
    migration: ConfigMigration<TFrom, TTo>
  ): void {
    const data = this.ensureNamespace(namespace);
    data.migrations.push(migration as unknown as ConfigMigration);
    data.migrations.sort((a, b) => a.fromVersion - b.fromVersion);
  }

  /**
   * Run migrations for a namespace
   */
  public migrate<T extends ConfigValue>(
    namespace: ConfigNamespace,
    config: ConfigValue,
    fromVersion: number,
    toVersion: number
  ): MigrationResult<T> {
    const startTime = performance.now();
    const data = this.namespaces.get(namespace);

    if (!data) {
      return {
        success: false,
        path: [],
        errors: [`Namespace "${namespace}" not found`],
        durationMs: performance.now() - startTime,
      };
    }

    const applicableMigrations = data.migrations.filter(
      (m) => m.fromVersion >= fromVersion && m.toVersion <= toVersion
    );

    if (applicableMigrations.length === 0) {
      return {
        success: true,
        data: config as T,
        path: [fromVersion],
        durationMs: performance.now() - startTime,
      };
    }

    let currentConfig = config;
    const path: number[] = [fromVersion];
    const errors: string[] = [];

    for (const migration of applicableMigrations) {
      try {
        currentConfig = migration.migrate(currentConfig);
        path.push(migration.toVersion);
      } catch (error) {
        errors.push(
          `Migration ${migration.fromVersion} -> ${migration.toVersion} failed: ${error instanceof Error ? error.message : String(error)}`
        );
        break;
      }
    }

    return {
      success: errors.length === 0,
      data: errors.length === 0 ? (currentConfig as T) : undefined,
      path,
      errors: errors.length > 0 ? errors : undefined,
      durationMs: performance.now() - startTime,
    };
  }

  /**
   * Get the current version for a namespace
   */
  public getVersion(namespace: ConfigNamespace): number {
    const data = this.namespaces.get(namespace);
    return data?.currentVersion ?? 1;
  }

  /**
   * Set the version for a namespace
   */
  public setVersion(namespace: ConfigNamespace, version: number): void {
    const data = this.ensureNamespace(namespace);
    data.currentVersion = version;
  }

  // ---------------------------------------------------------------------------
  // Bulk Operations
  // ---------------------------------------------------------------------------

  /**
   * Export all configuration from the registry
   */
  public export(): Record<string, ConfigRecord> {
    const result: Record<string, ConfigRecord> = {};

    this.namespaces.forEach((data, namespace) => {
      const namespaceConfig: ConfigRecord = {};
      data.entries.forEach((entry, key) => {
        namespaceConfig[key] = entry.value;
      });
      result[namespace as string] = namespaceConfig;
    });

    return result;
  }

  /**
   * Import configuration into the registry
   */
  public import(
    config: Record<string, ConfigRecord>,
    options: ConfigSetOptions = {}
  ): void {
    Object.entries(config).forEach(([namespace, values]) => {
      const ns = createNamespace(namespace);
      this.setMany(ns, values, options);
    });
  }

  /**
   * Freeze the registry to prevent further modifications
   */
  public freeze(): void {
    this.frozen = true;
    this.namespaces.forEach((data) => {
      data.entries.forEach((entry) => {
        if (typeof entry.value === 'object' && entry.value !== null) {
          Object.freeze(entry.value);
        }
      });
    });
  }

  /**
   * Check if the registry is frozen
   */
  public isFrozen(): boolean {
    return this.frozen;
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  /**
   * Validate a namespace against its registered schemas
   */
  public validateNamespace(namespace: ConfigNamespace): ConfigValidationResult[] {
    const data = this.namespaces.get(namespace);
    if (!data) {
      return [{
        success: false,
        errors: [{
          path: namespace as string,
          message: `Namespace "${namespace}" not found`,
          code: 'NAMESPACE_NOT_FOUND',
        }],
        meta: {
          namespace: namespace as string,
          version: 1,
          validatedAt: new Date().toISOString(),
          durationMs: 0,
        },
      }];
    }

    const results: ConfigValidationResult[] = [];

    data.entries.forEach((entry, key) => {
      if (entry.schema) {
        const result = validateConfig(entry.schema, entry.value, `${namespace}.${key}`);
        results.push(result);
      }
    });

    return results;
  }

  /**
   * Validate all namespaces
   */
  public validateAll(): Map<ConfigNamespace, ConfigValidationResult[]> {
    const results = new Map<ConfigNamespace, ConfigValidationResult[]>();

    this.namespaces.forEach((_, namespace) => {
      results.set(namespace, this.validateNamespace(namespace));
    });

    return results;
  }

  // ---------------------------------------------------------------------------
  // Debugging
  // ---------------------------------------------------------------------------

  /**
   * Get registry statistics
   */
  public getStats(): {
    namespaceCount: number;
    totalEntries: number;
    listenerCount: number;
    frozen: boolean;
  } {
    let totalEntries = 0;
    let listenerCount = 0;

    this.namespaces.forEach((data) => {
      totalEntries += data.entries.size;
      data.listeners.forEach((listeners) => {
        listenerCount += listeners.size;
      });
      listenerCount += data.wildcardListeners.size;
    });

    listenerCount += this.globalListeners.size;

    return {
      namespaceCount: this.namespaces.size,
      totalEntries,
      listenerCount,
      frozen: this.frozen,
    };
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Get the global configuration registry instance
 */
export function getConfigRegistry(): ConfigRegistry {
  return ConfigRegistry.getInstance();
}

/**
 * Register configuration in a namespace
 */
export function registerConfig<T extends ConfigValue>(
  namespace: ConfigNamespace,
  key: string,
  value: T,
  options?: ConfigSetOptions
): void {
  getConfigRegistry().set(namespace, key, value, options);
}

/**
 * Get configuration from a namespace
 */
export function getConfig<T extends ConfigValue>(
  namespace: ConfigNamespace,
  key: string
): T | undefined {
  return getConfigRegistry().get<T>(namespace, key);
}

/**
 * Subscribe to configuration changes
 */
export function subscribeToConfig(
  namespace: ConfigNamespace,
  key: string,
  listener: ConfigChangeListener
): ConfigUnsubscribe {
  return getConfigRegistry().subscribe(namespace, key, listener);
}

// =============================================================================
// Type-Safe Namespace Helpers
// =============================================================================

/**
 * Create a type-safe configuration accessor for a namespace
 *
 * @example
 * ```typescript
 * interface StreamingNSConfig {
 *   bufferSize: number;
 *   enabled: boolean;
 * }
 *
 * const streaming = createTypedNamespace<StreamingNSConfig>(CONFIG_NAMESPACES.STREAMING);
 *
 * streaming.set('bufferSize', 65536); // Type-safe
 * const size = streaming.get('bufferSize'); // Returns number | undefined
 * ```
 */
export function createTypedNamespace<T extends ConfigRecord>(
  namespace: ConfigNamespace
): TypedNamespaceAccessor<T> {
  const registry = getConfigRegistry();

  return {
    get<K extends keyof T & string>(key: K): T[K] | undefined {
      return registry.get<T[K]>(namespace, key);
    },

    getOrDefault<K extends keyof T & string>(key: K, defaultValue: T[K]): T[K] {
      return registry.getOrDefault<T[K]>(namespace, key, defaultValue);
    },

    set<K extends keyof T & string>(
      key: K,
      value: T[K],
      options?: ConfigSetOptions
    ): void {
      registry.set(namespace, key, value, options);
    },

    has<K extends keyof T & string>(key: K): boolean {
      return registry.has(namespace, key);
    },

    delete<K extends keyof T & string>(key: K): boolean {
      return registry.delete(namespace, key);
    },

    getAll(): DeepReadonly<Partial<T>> {
      return registry.getNamespaceConfig<Partial<T>>(namespace);
    },

    subscribe<K extends keyof T & string>(
      key: K | '*',
      listener: ConfigChangeListener<T[K]>
    ): ConfigUnsubscribe {
      return registry.subscribe(namespace, key, listener as ConfigChangeListener);
    },

    namespace,
  };
}

/**
 * Type-safe namespace accessor interface
 */
export interface TypedNamespaceAccessor<T extends ConfigRecord> {
  get<K extends keyof T & string>(key: K): T[K] | undefined;
  getOrDefault<K extends keyof T & string>(key: K, defaultValue: T[K]): T[K];
  set<K extends keyof T & string>(key: K, value: T[K], options?: ConfigSetOptions): void;
  has<K extends keyof T & string>(key: K): boolean;
  delete<K extends keyof T & string>(key: K): boolean;
  getAll(): DeepReadonly<Partial<T>>;
  subscribe<K extends keyof T & string>(
    key: K | '*',
    listener: ConfigChangeListener<T[K]>
  ): ConfigUnsubscribe;
  readonly namespace: ConfigNamespace;
}
