/**
 * Configuration loader with multiple source support (env, file, defaults).
 *
 * @module @missionfabric-js/enzyme-typescript/config/loader
 *
 * @example
 * ```typescript
 * import { ConfigLoader } from '@missionfabric-js/enzyme-typescript/config';
 *
 * interface AppConfig {
 *   database: {
 *     host: string;
 *     port: number;
 *   };
 *   api: {
 *     timeout: number;
 *   };
 * }
 *
 * const loader = new ConfigLoader<AppConfig>({
 *   sources: [
 *     { type: 'default', data: { database: { host: 'localhost', port: 5432 } } },
 *     { type: 'file', path: './config.json', format: 'json', priority: 1 },
 *     { type: 'env', envPrefix: 'APP_', priority: 2 }
 *   ]
 * });
 *
 * const config = await loader.load();
 * ```
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  ConfigSchema,
  ConfigSource,
  LoaderOptions,
  IConfigLoader,
} from './types';
import { mergeConfigs } from './merge';
import { validateConfig } from './validate';

/**
 * Configuration loader class.
 *
 * @template T - The configuration schema type
 *
 * @example
 * ```typescript
 * const loader = new ConfigLoader<AppConfig>({
 *   sources: [
 *     { type: 'default', data: defaults },
 *     { type: 'file', path: './config.json' }
 *   ],
 *   validate: true,
 *   validationSchema: schema
 * });
 *
 * const config = await loader.load();
 * console.log(config.database.host);
 * ```
 */
export class ConfigLoader<T extends ConfigSchema = ConfigSchema>
  implements IConfigLoader<T>
{
  private config: T | null = null;
  private watchers: Array<() => void> = [];
  private changeCallbacks: Array<(config: T) => void> = [];

  constructor(private options: LoaderOptions<T>) {
    if (!options.sources || options.sources.length === 0) {
      throw new Error('At least one configuration source is required');
    }
  }

  /**
   * Load configuration from all sources.
   *
   * @returns The loaded and merged configuration
   * @throws {Error} If loading fails and source is not optional
   *
   * @example
   * ```typescript
   * const config = await loader.load();
   * console.log('Configuration loaded:', config);
   * ```
   */
  async load(): Promise<T> {
    const sources = [...this.options.sources].sort(
      (a, b) => (a.priority || 0) - (b.priority || 0)
    );

    let config: Partial<T> = this.options.defaults || {};

    for (const source of sources) {
      try {
        const sourceConfig = await this.loadSource(source);

        // Apply transformation if provided
        const transformedConfig = source.transform
          ? source.transform(sourceConfig)
          : sourceConfig;

        config = mergeConfigs(
          config as T,
          transformedConfig,
          this.options.mergeOptions
        );
      } catch (error) {
        if (source.optional) {
          console.warn(
            `Optional configuration source failed to load: ${source.type}`,
            error
          );
          continue;
        }
        throw new Error(
          `Failed to load configuration from ${source.type}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    // Validate configuration
    if (this.options.validate && this.options.validationSchema) {
      const result = await validateConfig(
        config as T,
        this.options.validationSchema
      );

      if (!result.valid) {
        const errorMessage = result.errors
          .map((e) => `${e.path}: ${e.message}`)
          .join('\n');

        if (this.options.throwOnValidationError !== false) {
          throw new Error(`Configuration validation failed:\n${errorMessage}`);
        } else {
          console.error('Configuration validation warnings:\n', errorMessage);
        }
      }
    }

    // Freeze configuration if requested
    if (this.options.freeze) {
      Object.freeze(config);
    }

    this.config = config as T;

    // Set up watching if requested
    if (this.options.watch && this.options.watchOptions) {
      await this.setupWatch();
    }

    return this.config;
  }

  /**
   * Reload configuration from all sources.
   *
   * @returns The reloaded configuration
   *
   * @example
   * ```typescript
   * const config = await loader.reload();
   * console.log('Configuration reloaded:', config);
   * ```
   */
  async reload(): Promise<T> {
    const oldConfig = this.config;
    const newConfig = await this.load();

    // Notify change callbacks
    if (oldConfig && this.options.onChange) {
      await this.options.onChange(newConfig, []);
    }

    // Notify watchers
    for (const callback of this.changeCallbacks) {
      callback(newConfig);
    }

    return newConfig;
  }

  /**
   * Get current configuration.
   *
   * @returns The current configuration
   * @throws {Error} If configuration hasn't been loaded yet
   *
   * @example
   * ```typescript
   * const config = loader.getConfig();
   * console.log(config.database.host);
   * ```
   */
  getConfig(): T {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call load() first.');
    }
    return this.config;
  }

  /**
   * Watch for configuration changes.
   *
   * @param callback - Callback to invoke when configuration changes
   * @returns Function to stop watching
   *
   * @example
   * ```typescript
   * const unwatch = loader.watch((config) => {
   *   console.log('Configuration changed:', config);
   * });
   *
   * // Later, stop watching
   * unwatch();
   * ```
   */
  watch(callback: (config: T) => void): () => void {
    this.changeCallbacks.push(callback);

    return () => {
      const index = this.changeCallbacks.indexOf(callback);
      if (index !== -1) {
        this.changeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Stop all watchers and clean up.
   */
  dispose(): void {
    for (const unwatch of this.watchers) {
      unwatch();
    }
    this.watchers = [];
    this.changeCallbacks = [];
  }

  /**
   * Load configuration from a single source.
   *
   * @param source - The configuration source
   * @returns The loaded configuration
   */
  private async loadSource(source: ConfigSource<T>): Promise<Partial<T>> {
    switch (source.type) {
      case 'object':
        return source.data || {};

      case 'env':
        return this.loadFromEnv(source);

      case 'file':
        return this.loadFromFile(source);

      case 'remote':
        return this.loadFromRemote(source);

      case 'vault':
        return this.loadFromVault(source);

      case 'default':
        return source.data || {};

      default:
        if (source.loader) {
          return source.loader();
        }
        throw new Error(`Unsupported source type: ${source.type}`);
    }
  }

  /**
   * Load configuration from environment variables.
   *
   * @param source - The environment source configuration
   * @returns The loaded configuration
   */
  private loadFromEnv(source: ConfigSource<T>): Partial<T> {
    const config: any = {};
    const prefix = source.envPrefix || '';

    for (const [key, value] of Object.entries(process.env)) {
      if (!key.startsWith(prefix)) {
        continue;
      }

      const configKey = key.slice(prefix.length);
      const path = configKey.split('__');

      let current = config;
      for (let i = 0; i < path.length - 1; i++) {
        const segment = path[i].toLowerCase();
        if (!current[segment]) {
          current[segment] = {};
        }
        current = current[segment];
      }

      const lastSegment = path[path.length - 1].toLowerCase();
      current[lastSegment] = this.parseEnvValue(value || '');
    }

    return config;
  }

  /**
   * Parse environment variable value to appropriate type.
   *
   * @param value - The environment variable value
   * @returns The parsed value
   */
  private parseEnvValue(value: string): unknown {
    // Try to parse as JSON
    if (
      (value.startsWith('{') && value.endsWith('}')) ||
      (value.startsWith('[') && value.endsWith(']'))
    ) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }

    // Parse booleans
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Parse numbers
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      return Number(value);
    }

    // Return as string
    return value;
  }

  /**
   * Load configuration from a file.
   *
   * @param source - The file source configuration
   * @returns The loaded configuration
   */
  private async loadFromFile(source: ConfigSource<T>): Promise<Partial<T>> {
    if (!source.path) {
      throw new Error('File path is required for file source');
    }

    const filePath = path.resolve(source.path);
    const content = await fs.readFile(filePath, 'utf-8');

    const format = source.format || this.detectFormat(filePath);

    switch (format) {
      case 'json':
        return JSON.parse(content);

      case 'yaml':
      case 'yml':
        return this.parseYaml(content);

      case 'toml':
        return this.parseToml(content);

      case 'ini':
        return this.parseIni(content);

      case 'js':
      case 'ts':
        // Dynamic import for JS/TS files
        const module = await import(filePath);
        return module.default || module;

      default:
        throw new Error(`Unsupported file format: ${format}`);
    }
  }

  /**
   * Detect file format from extension.
   *
   * @param filePath - The file path
   * @returns The detected format
   */
  private detectFormat(filePath: string): string {
    const ext = path.extname(filePath).slice(1).toLowerCase();
    return ext || 'json';
  }

  /**
   * Parse YAML content.
   *
   * @param content - The YAML content
   * @returns The parsed configuration
   */
  private parseYaml(content: string): Partial<T> {
    // Simple YAML parser (for production, use a library like js-yaml)
    // This is a basic implementation for demonstration
    try {
      // Try to use js-yaml if available
      const yaml = require('yaml');
      return yaml.parse(content);
    } catch {
      throw new Error('YAML parsing requires the "yaml" package to be installed');
    }
  }

  /**
   * Parse TOML content.
   *
   * @param content - The TOML content
   * @returns The parsed configuration
   */
  private parseToml(content: string): Partial<T> {
    try {
      // Try to use @iarna/toml if available
      const toml = require('@iarna/toml');
      return toml.parse(content);
    } catch {
      throw new Error('TOML parsing requires the "@iarna/toml" package to be installed');
    }
  }

  /**
   * Parse INI content.
   *
   * @param content - The INI content
   * @returns The parsed configuration
   */
  private parseIni(content: string): Partial<T> {
    const config: any = {};
    let currentSection: any = config;
    let sectionName = '';

    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('#')) {
        continue;
      }

      // Section header
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        sectionName = trimmed.slice(1, -1);
        currentSection = config[sectionName] = {};
        continue;
      }

      // Key-value pair
      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex !== -1) {
        const key = trimmed.slice(0, separatorIndex).trim();
        const value = trimmed.slice(separatorIndex + 1).trim();
        currentSection[key] = this.parseEnvValue(value);
      }
    }

    return config;
  }

  /**
   * Load configuration from a remote URL.
   *
   * @param source - The remote source configuration
   * @returns The loaded configuration
   */
  private async loadFromRemote(source: ConfigSource<T>): Promise<Partial<T>> {
    if (!source.url) {
      throw new Error('URL is required for remote source');
    }

    const headers: Record<string, string> = {};

    if (source.credentials?.token) {
      headers['Authorization'] = `Bearer ${source.credentials.token}`;
    } else if (source.credentials?.apiKey) {
      headers['X-API-Key'] = source.credentials.apiKey;
    } else if (source.credentials?.username && source.credentials?.password) {
      const auth = Buffer.from(
        `${source.credentials.username}:${source.credentials.password}`
      ).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }

    const response = await fetch(source.url, { headers });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json();
    }

    const text = await response.text();
    return JSON.parse(text);
  }

  /**
   * Load configuration from a secret vault.
   *
   * @param source - The vault source configuration
   * @returns The loaded configuration
   */
  private async loadFromVault(source: ConfigSource<T>): Promise<Partial<T>> {
    // This would integrate with services like HashiCorp Vault, AWS Secrets Manager, etc.
    // Implementation depends on the specific vault provider
    if (source.loader) {
      return source.loader();
    }

    throw new Error(
      'Vault source requires a custom loader function to be provided'
    );
  }

  /**
   * Set up file watching for configuration changes.
   */
  private async setupWatch(): Promise<void> {
    // This would use fs.watch or a library like chokidar
    // Simplified implementation for demonstration
    const fileSources = this.options.sources.filter(
      (s) => s.type === 'file' && s.path
    );

    for (const source of fileSources) {
      if (source.path) {
        try {
          const watcher = fs.watch(source.path, async (event) => {
            if (event === 'change') {
              await this.reload();
            }
          });

          this.watchers.push(() => {
            // Note: fs.watch returns an AsyncIterable, so we'd need to handle cleanup differently
            // This is a simplified version
          });
        } catch (error) {
          console.warn(`Failed to watch file: ${source.path}`, error);
        }
      }
    }
  }
}

/**
 * Create a configuration loader with a fluent API.
 *
 * @template T - The configuration schema type
 * @returns A loader builder
 *
 * @example
 * ```typescript
 * const loader = createLoader<AppConfig>()
 *   .addSource({ type: 'default', data: defaults })
 *   .addSource({ type: 'file', path: './config.json' })
 *   .addSource({ type: 'env', envPrefix: 'APP_' })
 *   .withValidation(schema)
 *   .build();
 *
 * const config = await loader.load();
 * ```
 */
export function createLoader<T extends ConfigSchema = ConfigSchema>() {
  const options: LoaderOptions<T> = {
    sources: [],
  };

  return {
    addSource(source: ConfigSource<T>) {
      options.sources.push(source);
      return this;
    },

    addDefaults(defaults: Partial<T>) {
      options.defaults = defaults;
      return this;
    },

    withValidation(schema: LoaderOptions<T>['validationSchema']) {
      options.validate = true;
      options.validationSchema = schema;
      return this;
    },

    withWatch(watchOptions?: LoaderOptions<T>['watchOptions']) {
      options.watch = true;
      options.watchOptions = watchOptions;
      return this;
    },

    onChange(callback: LoaderOptions<T>['onChange']) {
      options.onChange = callback;
      return this;
    },

    freeze() {
      options.freeze = true;
      return this;
    },

    build(): ConfigLoader<T> {
      return new ConfigLoader(options);
    },
  };
}

/**
 * Load configuration with automatic source detection.
 *
 * @template T - The configuration schema type
 * @param paths - File paths to try loading from
 * @param defaults - Default configuration
 * @returns The loaded configuration
 *
 * @example
 * ```typescript
 * const config = await loadConfig<AppConfig>(
 *   ['./config.json', './config.yaml'],
 *   { database: { port: 5432 } }
 * );
 * ```
 */
export async function loadConfig<T extends ConfigSchema>(
  paths: string[],
  defaults?: Partial<T>
): Promise<T> {
  const sources: ConfigSource<T>[] = [
    { type: 'default', data: defaults, priority: 0 },
  ];

  for (const filePath of paths) {
    try {
      await fs.access(filePath);
      sources.push({
        type: 'file',
        path: filePath,
        optional: true,
        priority: 1,
      });
    } catch {
      // File doesn't exist, skip
    }
  }

  // Add environment variables with highest priority
  sources.push({
    type: 'env',
    envPrefix: 'APP_',
    priority: 2,
  });

  const loader = new ConfigLoader<T>({ sources });
  return loader.load();
}
