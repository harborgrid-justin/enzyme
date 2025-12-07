/**
 * Configuration provider pattern with dependency injection.
 *
 * @module @missionfabric-js/enzyme-typescript/config/provider
 *
 * @example
 * ```typescript
 * import { ConfigProvider } from '@missionfabric-js/enzyme-typescript/config';
 *
 * interface AppConfig {
 *   database: {
 *     host: string;
 *     port: number;
 *   };
 * }
 *
 * const provider = new ConfigProvider<AppConfig>({
 *   config: {
 *     database: { host: 'localhost', port: 5432 }
 *   }
 * });
 *
 * const host = provider.get('database').host;
 * const port = provider.getByPath('database.port');
 * ```
 */

import type {
  ConfigSchema,
  ProviderOptions,
  IConfigProvider,
  ConfigChange,
} from './types';

/**
 * Event emitter for configuration changes.
 */
class EventEmitter<T> {
  private listeners = new Map<string, Array<(data: T) => void>>();

  on(event: string, callback: (data: T) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const callbacks = this.listeners.get(event)!;
    callbacks.push(callback);

    return () => {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  emit(event: string, data: T): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const callback of callbacks) {
        callback(data);
      }
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}

/**
 * Configuration provider class.
 *
 * @template T - The configuration schema type
 *
 * @example
 * ```typescript
 * const provider = new ConfigProvider({
 *   config: {
 *     api: { timeout: 5000 },
 *     features: { beta: true }
 *   },
 *   mutable: true,
 *   emitChanges: true
 * });
 *
 * provider.on('change', (change) => {
 *   console.log(`${change.path} changed from ${change.oldValue} to ${change.newValue}`);
 * });
 *
 * provider.set('api', { timeout: 10000 });
 * ```
 */
export class ConfigProvider<T extends ConfigSchema = ConfigSchema>
  implements IConfigProvider<T>
{
  private config: T;
  private readonly mutable: boolean;
  private readonly emitChanges: boolean;
  private readonly namespace?: string;
  private readonly emitter = new EventEmitter<ConfigChange<T>>();

  constructor(options: ProviderOptions<T>) {
    this.config = options.config;
    this.mutable = options.mutable ?? false;
    this.emitChanges = options.emitChanges ?? false;
    this.namespace = options.namespace;
  }

  /**
   * Get configuration value by key.
   *
   * @template K - The key type
   * @param key - The configuration key
   * @returns The configuration value
   *
   * @example
   * ```typescript
   * const database = provider.get('database');
   * console.log(database.host); // 'localhost'
   * ```
   */
  get<K extends keyof T>(key: K): T[K] {
    return this.config[key];
  }

  /**
   * Get nested configuration value by path.
   *
   * @template V - The value type
   * @param path - The configuration path (dot-separated)
   * @returns The configuration value
   * @throws {Error} If path is invalid or value not found
   *
   * @example
   * ```typescript
   * const port = provider.getByPath<number>('database.port');
   * console.log(port); // 5432
   * ```
   */
  getByPath<V = unknown>(path: string): V {
    const parts = path.split('.');
    let value: any = this.config;

    for (const part of parts) {
      if (value == null || typeof value !== 'object') {
        throw new Error(`Invalid path: ${path}`);
      }
      value = value[part];
    }

    if (value === undefined) {
      throw new Error(`Configuration value not found at path: ${path}`);
    }

    return value as V;
  }

  /**
   * Get configuration value by path with a default fallback.
   *
   * @template V - The value type
   * @param path - The configuration path
   * @param defaultValue - Default value if path not found
   * @returns The configuration value or default
   *
   * @example
   * ```typescript
   * const timeout = provider.getOrDefault('api.timeout', 5000);
   * ```
   */
  getOrDefault<V = unknown>(path: string, defaultValue: V): V {
    try {
      return this.getByPath<V>(path);
    } catch {
      return defaultValue;
    }
  }

  /**
   * Set configuration value.
   *
   * @template K - The key type
   * @param key - The configuration key
   * @param value - The new value
   * @throws {Error} If provider is immutable
   *
   * @example
   * ```typescript
   * provider.set('database', { host: 'db.example.com', port: 5432 });
   * ```
   */
  set<K extends keyof T>(key: K, value: T[K]): void {
    if (!this.mutable) {
      throw new Error('Configuration provider is immutable');
    }

    const oldValue = this.config[key];

    if (oldValue === value) {
      return;
    }

    this.config[key] = value;

    if (this.emitChanges) {
      this.emitter.emit('change', {
        path: String(key),
        oldValue,
        newValue: value,
        type: oldValue === undefined ? 'added' : 'modified',
        timestamp: new Date(),
      });
    }
  }

  /**
   * Set nested configuration value by path.
   *
   * @param path - The configuration path
   * @param value - The new value
   * @throws {Error} If provider is immutable or path is invalid
   *
   * @example
   * ```typescript
   * provider.setByPath('database.port', 3306);
   * ```
   */
  setByPath(path: string, value: unknown): void {
    if (!this.mutable) {
      throw new Error('Configuration provider is immutable');
    }

    const parts = path.split('.');
    let current: any = this.config;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];

      if (!(part in current)) {
        current[part] = {};
      } else if (typeof current[part] !== 'object' || current[part] === null) {
        throw new Error(`Cannot set value at path ${path}: ${part} is not an object`);
      }

      current = current[part];
    }

    const lastPart = parts[parts.length - 1];
    const oldValue = current[lastPart];

    if (oldValue === value) {
      return;
    }

    current[lastPart] = value;

    if (this.emitChanges) {
      this.emitter.emit('change', {
        path,
        oldValue,
        newValue: value,
        type: oldValue === undefined ? 'added' : 'modified',
        timestamp: new Date(),
      });
    }
  }

  /**
   * Check if configuration key exists.
   *
   * @param key - The configuration key or path
   * @returns True if the key exists
   *
   * @example
   * ```typescript
   * if (provider.has('database.host')) {
   *   console.log('Database host is configured');
   * }
   * ```
   */
  has(key: string): boolean {
    try {
      if (key.includes('.')) {
        this.getByPath(key);
      } else {
        return key in this.config;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all configuration.
   *
   * @returns The complete configuration object
   *
   * @example
   * ```typescript
   * const allConfig = provider.getAll();
   * console.log(JSON.stringify(allConfig, null, 2));
   * ```
   */
  getAll(): T {
    return this.config;
  }

  /**
   * Update multiple configuration values.
   *
   * @param updates - Object with updates to apply
   * @throws {Error} If provider is immutable
   *
   * @example
   * ```typescript
   * provider.update({
   *   database: { host: 'newhost.com' },
   *   api: { timeout: 10000 }
   * });
   * ```
   */
  update(updates: Partial<T>): void {
    if (!this.mutable) {
      throw new Error('Configuration provider is immutable');
    }

    for (const key in updates) {
      if (Object.prototype.hasOwnProperty.call(updates, key)) {
        this.set(key as keyof T, updates[key] as T[keyof T]);
      }
    }
  }

  /**
   * Delete a configuration value.
   *
   * @param key - The configuration key
   * @throws {Error} If provider is immutable
   *
   * @example
   * ```typescript
   * provider.delete('tempSetting');
   * ```
   */
  delete(key: keyof T): void {
    if (!this.mutable) {
      throw new Error('Configuration provider is immutable');
    }

    const oldValue = this.config[key];

    if (oldValue === undefined) {
      return;
    }

    delete this.config[key];

    if (this.emitChanges) {
      this.emitter.emit('change', {
        path: String(key),
        oldValue,
        newValue: undefined,
        type: 'deleted',
        timestamp: new Date(),
      });
    }
  }

  /**
   * Listen for configuration changes.
   *
   * @param callback - Callback to invoke on changes
   * @returns Function to unsubscribe
   *
   * @example
   * ```typescript
   * const unsubscribe = provider.on('change', (change) => {
   *   console.log('Configuration changed:', change);
   * });
   *
   * // Later...
   * unsubscribe();
   * ```
   */
  on(
    event: 'change',
    callback: (change: ConfigChange<T>) => void
  ): () => void {
    return this.emitter.on(event, callback);
  }

  /**
   * Create a scoped provider for a nested configuration.
   *
   * @template K - The key type
   * @param key - The configuration key to scope to
   * @returns A new provider scoped to the key
   *
   * @example
   * ```typescript
   * const dbProvider = provider.scope('database');
   * const host = dbProvider.get('host');
   * ```
   */
  scope<K extends keyof T>(
    key: K
  ): T[K] extends ConfigSchema ? ConfigProvider<T[K]> : never {
    const scopedConfig = this.get(key);

    if (typeof scopedConfig !== 'object' || scopedConfig === null) {
      throw new Error(`Cannot scope to non-object key: ${String(key)}`);
    }

    const namespacePath = this.namespace
      ? `${this.namespace}.${String(key)}`
      : String(key);

    return new ConfigProvider({
      config: scopedConfig as ConfigSchema,
      mutable: this.mutable,
      emitChanges: this.emitChanges,
      namespace: namespacePath,
    }) as any;
  }

  /**
   * Clone the provider with a new configuration.
   *
   * @param config - The new configuration
   * @returns A new provider instance
   *
   * @example
   * ```typescript
   * const newProvider = provider.clone(updatedConfig);
   * ```
   */
  clone(config?: T): ConfigProvider<T> {
    return new ConfigProvider({
      config: config || { ...this.config },
      mutable: this.mutable,
      emitChanges: this.emitChanges,
      namespace: this.namespace,
    });
  }

  /**
   * Convert configuration to JSON.
   *
   * @returns JSON string representation
   *
   * @example
   * ```typescript
   * const json = provider.toJSON();
   * ```
   */
  toJSON(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Dispose the provider and remove all listeners.
   */
  dispose(): void {
    this.emitter.removeAllListeners();
  }
}

/**
 * Global configuration provider registry.
 */
class ConfigProviderRegistry {
  private providers = new Map<string, ConfigProvider<any>>();

  /**
   * Register a provider with a name.
   *
   * @param name - The provider name
   * @param provider - The provider instance
   */
  register<T extends ConfigSchema>(
    name: string,
    provider: ConfigProvider<T>
  ): void {
    if (this.providers.has(name)) {
      throw new Error(`Provider "${name}" is already registered`);
    }
    this.providers.set(name, provider);
  }

  /**
   * Get a registered provider.
   *
   * @param name - The provider name
   * @returns The provider instance
   * @throws {Error} If provider not found
   */
  get<T extends ConfigSchema>(name: string): ConfigProvider<T> {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider "${name}" not found`);
    }
    return provider;
  }

  /**
   * Check if a provider is registered.
   *
   * @param name - The provider name
   * @returns True if registered
   */
  has(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * Unregister a provider.
   *
   * @param name - The provider name
   */
  unregister(name: string): void {
    const provider = this.providers.get(name);
    if (provider) {
      provider.dispose();
      this.providers.delete(name);
    }
  }

  /**
   * Unregister all providers.
   */
  clear(): void {
    for (const provider of this.providers.values()) {
      provider.dispose();
    }
    this.providers.clear();
  }
}

/**
 * Global provider registry instance.
 */
export const registry = new ConfigProviderRegistry();

/**
 * Create a configuration provider.
 *
 * @template T - The configuration schema type
 * @param config - The configuration object
 * @param options - Provider options
 * @returns A new provider instance
 *
 * @example
 * ```typescript
 * const provider = createProvider({
 *   database: { host: 'localhost', port: 5432 }
 * }, { mutable: true });
 * ```
 */
export function createProvider<T extends ConfigSchema>(
  config: T,
  options?: Omit<ProviderOptions<T>, 'config'>
): ConfigProvider<T> {
  return new ConfigProvider({ ...options, config });
}

/**
 * Create and register a global configuration provider.
 *
 * @template T - The configuration schema type
 * @param name - The provider name
 * @param config - The configuration object
 * @param options - Provider options
 * @returns The created provider
 *
 * @example
 * ```typescript
 * registerProvider('app', appConfig, { mutable: false });
 *
 * // Later, in another module
 * const provider = registry.get('app');
 * ```
 */
export function registerProvider<T extends ConfigSchema>(
  name: string,
  config: T,
  options?: Omit<ProviderOptions<T>, 'config'>
): ConfigProvider<T> {
  const provider = createProvider(config, options);
  registry.register(name, provider);
  return provider;
}

/**
 * Get a registered configuration provider.
 *
 * @template T - The configuration schema type
 * @param name - The provider name
 * @returns The provider instance
 *
 * @example
 * ```typescript
 * const provider = getProvider<AppConfig>('app');
 * const dbHost = provider.getByPath('database.host');
 * ```
 */
export function getProvider<T extends ConfigSchema>(
  name: string
): ConfigProvider<T> {
  return registry.get<T>(name);
}

/**
 * Configuration dependency injection container.
 */
export class ConfigContainer {
  private providers = new Map<symbol | string, ConfigProvider<any>>();

  /**
   * Bind a configuration to a token.
   *
   * @template T - The configuration schema type
   * @param token - The injection token
   * @param config - The configuration object
   * @param options - Provider options
   */
  bind<T extends ConfigSchema>(
    token: symbol | string,
    config: T,
    options?: Omit<ProviderOptions<T>, 'config'>
  ): void {
    this.providers.set(token, createProvider(config, options));
  }

  /**
   * Get a configuration by token.
   *
   * @template T - The configuration schema type
   * @param token - The injection token
   * @returns The provider instance
   */
  get<T extends ConfigSchema>(token: symbol | string): ConfigProvider<T> {
    const provider = this.providers.get(token);
    if (!provider) {
      throw new Error(`No configuration bound to token: ${String(token)}`);
    }
    return provider;
  }

  /**
   * Check if a token is bound.
   *
   * @param token - The injection token
   * @returns True if bound
   */
  has(token: symbol | string): boolean {
    return this.providers.has(token);
  }

  /**
   * Unbind a token.
   *
   * @param token - The injection token
   */
  unbind(token: symbol | string): void {
    const provider = this.providers.get(token);
    if (provider) {
      provider.dispose();
      this.providers.delete(token);
    }
  }

  /**
   * Clear all bindings.
   */
  clear(): void {
    for (const provider of this.providers.values()) {
      provider.dispose();
    }
    this.providers.clear();
  }
}
