/**
 * @fileoverview Configuration loader for multiple sources.
 *
 * Loads configuration from:
 * - Default values
 * - Environment variables
 * - Configuration files
 * - Remote endpoints
 *
 * @module config/config-loader
 *
 * @example
 * ```typescript
 * const loader = new ConfigLoader({
 *   envPrefix: 'REACT_APP_',
 *   debug: true,
 * });
 *
 * loader.addDefaultSource(defaultConfig);
 * loader.addEnvSource();
 *
 * const config = await loader.load();
 * ```
 */

import type {
  ConfigRecord,
  ConfigValue,
  ConfigSource,
  ConfigSourceType,
  ConfigSchema,
  ConfigLoaderOptions,
  RemoteConfigOptions,
  Environment,
} from './types';
import { ConfigMerger, getValueAtPath } from './config-merger';
import { ConfigValidator } from './config-validator';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_ENV_PREFIX = 'APP_';
const DEFAULT_REMOTE_TIMEOUT = 10000;

// ============================================================================
// Config Loader
// ============================================================================

/**
 * Configuration loader that combines multiple sources.
 */
export class ConfigLoader {
  private sources: ConfigSource[] = [];
  private schema?: ConfigSchema;
  private options: Required<ConfigLoaderOptions>;
  private loaded = false;
  private cachedConfig: ConfigRecord | null = null;

  constructor(options: ConfigLoaderOptions = {}) {
    this.options = {
      basePath: options.basePath ?? '',
      envPrefix: options.envPrefix ?? DEFAULT_ENV_PREFIX,
      remoteUrl: options.remoteUrl ?? '',
      watch: options.watch ?? false,
      debug: options.debug ?? false,
      detectEnvironment: options.detectEnvironment ?? this.defaultDetectEnvironment.bind(this),
    };
  }

  /**
   * Set the configuration schema for validation.
   */
  setSchema(schema: ConfigSchema): this {
    this.schema = schema;
    return this;
  }

  /**
   * Add a source with default values.
   */
  addDefaultSource(config: ConfigRecord): this {
    this.sources.push({
      type: 'default',
      name: 'default',
      priority: 1000,
      data: config,
    });
    return this;
  }

  /**
   * Add environment variables as a source.
   */
  addEnvSource(prefix?: string): this {
    const envPrefix = prefix ?? this.options.envPrefix;
    const data = this.loadFromEnvironment(envPrefix);

    this.sources.push({
      type: 'environment',
      name: 'env',
      priority: 100,
      data,
    });

    return this;
  }

  /**
   * Add a static configuration source.
   */
  addSource(
    type: ConfigSourceType,
    name: string,
    data: ConfigRecord,
    priority?: number
  ): this {
    this.sources.push({
      type,
      name,
      priority: priority ?? this.getDefaultPriority(type),
      data,
    });
    return this;
  }

  /**
   * Add a remote configuration source.
   */
  async addRemoteSource(options: RemoteConfigOptions): Promise<this> {
    const data = await this.loadFromRemote(options);

    this.sources.push({
      type: 'remote',
      name: `remote-${options.url}`,
      priority: 50,
      data,
    });

    return this;
  }

  /**
   * Load and merge all configuration sources.
   */
  async load(): Promise<ConfigRecord> {
    this.log('Loading configuration...');

    // Sort sources by priority (lower = higher priority)
    const sortedSources = [...this.sources].sort(
      (a, b) => b.priority - a.priority
    );

    // Merge in order (higher priority last so it overwrites)
    const merger = new ConfigMerger({ strategy: 'deep' });
    const config = merger.merge(...sortedSources.map((s) => s.data));

    await Promise.resolve(); // Ensure async

    // Apply schema defaults
    if (this.schema) {
      this.applyDefaults(config, this.schema);
    }

    // Validate if schema is set
    if (this.schema) {
      const validator = new ConfigValidator(this.schema);
      const result = validator.validate(config);

      if (!result.valid) {
        const errorMessages = result.errors.map((e) => `${e.path}: ${e.message}`);
        throw new Error(`Configuration validation failed:\n${errorMessages.join('\n')}`);
      }

      if (result.warnings.length > 0) {
        result.warnings.forEach((w) => this.log(`Warning: ${w}`));
      }
    }

    this.cachedConfig = config;
    this.loaded = true;

    this.log(`Configuration loaded from ${this.sources.length} sources`);
    return config;
  }

  /**
   * Get the current configuration.
   */
  getConfig(): ConfigRecord {
    if (!this.loaded || !this.cachedConfig) {
      throw new Error('Configuration not loaded. Call load() first.');
    }
    return this.cachedConfig;
  }

  /**
   * Get a value from the configuration.
   */
  get<T = ConfigValue>(path: string, defaultValue?: T): T {
    const config = this.getConfig();
    return getValueAtPath<T>(config, path, defaultValue);
  }

  /**
   * Get the current environment.
   */
  getEnvironment(): Environment {
    return this.options.detectEnvironment();
  }

  /**
   * Check if a source is loaded.
   */
  hasSource(name: string): boolean {
    return this.sources.some((s) => s.name === name);
  }

  /**
   * Get all loaded sources.
   */
  getSources(): readonly ConfigSource[] {
    return [...this.sources];
  }

  /**
   * Clear all sources.
   */
  clearSources(): void {
    this.sources = [];
    this.loaded = false;
    this.cachedConfig = null;
  }

  // ==========================================================================
  // Environment Variable Loading
  // ==========================================================================

  private loadFromEnvironment(prefix: string): ConfigRecord {
    const config: ConfigRecord = {};

    // In browser environment
    if (typeof window !== 'undefined') {
      // Try import.meta.env (Vite)
      const importMetaEnv = import.meta?.env ?? {};

      for (const [key, value] of Object.entries(importMetaEnv)) {
        if (key.startsWith(prefix)) {
          const configKey = this.envKeyToConfigKey(key, prefix);
          config[configKey] = this.parseEnvValue(value as string);
        }
      }

      // Try process.env (CRA, Next.js SSR)
      if (typeof process !== 'undefined' && process.env != null) {
        for (const [key, value] of Object.entries(process.env)) {
          if (key.startsWith(prefix) && value !== undefined) {
            const configKey = this.envKeyToConfigKey(key, prefix);
            config[configKey] = this.parseEnvValue(value);
          }
        }
      }
    }

    // In Node.js environment
    if (typeof process !== 'undefined' && process.env != null) {
      for (const [key, value] of Object.entries(process.env)) {
        if (key.startsWith(prefix) && value !== undefined) {
          const configKey = this.envKeyToConfigKey(key, prefix);
          config[configKey] = this.parseEnvValue(value);
        }
      }
    }

    this.log(`Loaded ${Object.keys(config).length} env variables`);
    return config;
  }

  private envKeyToConfigKey(envKey: string, prefix: string): string {
    // Remove prefix and convert to camelCase
    const withoutPrefix = envKey.substring(prefix.length);
    return withoutPrefix
      .toLowerCase()
      .replace(/_([a-z])/g, (_: string, letter: string) => letter.toUpperCase());
  }

  private parseEnvValue(value: string): ConfigValue {
    // Try to parse as JSON
    try {
      return JSON.parse(value) as ConfigValue;
    } catch {
      // Return as string
      return value;
    }
  }

  // ==========================================================================
  // Remote Loading
  // ==========================================================================

  /**
   * Load configuration from a remote URL.
   *
   * Note: This method intentionally uses raw fetch() rather than apiClient because:
   * 1. Config loading happens before the apiClient may be fully initialized
   * 2. Config endpoints may be on CDN or static hosting (not API servers)
   * 3. The config loader should be independent of the API layer
   *
   * @see {@link @/lib/api/api-client} for the main API client
   */
  private async loadFromRemote(options: RemoteConfigOptions): Promise<ConfigRecord> {
    const { url, apiKey, timeout = DEFAULT_REMOTE_TIMEOUT, headers = {} } = options;

    this.log(`Loading remote config from ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Raw fetch is intentional - config loading must work before apiClient init
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey != null && apiKey !== '' ? { Authorization: `Bearer ${apiKey}` } : {}),
          ...headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as ConfigRecord;
      this.log(`Loaded remote config: ${Object.keys(data as Record<string, unknown>).length} keys`);
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      this.log('Failed to load remote config:', error);
      throw error;
    }
  }

  // ==========================================================================
  // Schema Defaults
  // ==========================================================================

  private applyDefaults(config: ConfigRecord, schema: ConfigSchema): void {
    for (const [key, fieldSchema] of Object.entries(schema)) {
      if (config[key] === undefined && fieldSchema.default !== undefined) {
        config[key] = fieldSchema.default;
      }

      if (
        fieldSchema.properties &&
        typeof config[key] === 'object' &&
        config[key] !== null
      ) {
        this.applyDefaults(config[key] as ConfigRecord, fieldSchema.properties);
      }
    }
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  private defaultDetectEnvironment(): Environment {
    // Try import.meta.env (Vite)
    if (import.meta?.env?.MODE !== undefined) {
      return import.meta.env.MODE as Environment;
    }

    // Try process.env (Node.js, CRA)
    if (typeof process !== 'undefined' && process.env?.NODE_ENV != null && process.env.NODE_ENV !== '') {
      return process.env.NODE_ENV as Environment;
    }

    return 'development';
  }

  private getDefaultPriority(type: ConfigSourceType): number {
    switch (type) {
      case 'default':
        return 1000;
      case 'file':
        return 500;
      case 'remote':
        return 200;
      case 'environment':
        return 100;
      case 'runtime':
        return 10;
      default:
        return 500;
    }
  }

  private log(message: string, ...args: unknown[]): void {
    if (this.options.debug === true) {
      console.info(`[ConfigLoader] ${message}`, ...args);
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a configuration loader with common setup.
 */
export function createConfigLoader(options?: ConfigLoaderOptions): ConfigLoader {
  return new ConfigLoader(options);
}

/**
 * Load configuration from multiple sources.
 */
export async function loadConfig(
  defaults: ConfigRecord,
  options?: ConfigLoaderOptions
): Promise<ConfigRecord> {
  const loader = new ConfigLoader(options);
  loader.addDefaultSource(defaults);
  loader.addEnvSource();
  return loader.load();
}
