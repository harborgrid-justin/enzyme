/**
 * Environment-specific configuration (dev, staging, prod).
 *
 * @module @missionfabric-js/enzyme-typescript/config/environment
 *
 * @example
 * ```typescript
 * import { EnvironmentManager } from '@missionfabric-js/enzyme-typescript/config';
 *
 * const envManager = new EnvironmentManager({
 *   environments: {
 *     development: { config: devConfig },
 *     production: { config: prodConfig }
 *   },
 *   current: 'development'
 * });
 *
 * const config = envManager.getConfig();
 * ```
 */

import type { ConfigSchema, EnvironmentConfig } from './types';
import { mergeConfigs } from './merge';

/**
 * Environment type.
 */
export type Environment =
  | 'development'
  | 'dev'
  | 'staging'
  | 'stage'
  | 'production'
  | 'prod'
  | 'test'
  | 'local'
  | string;

/**
 * Environment manager options.
 */
export interface EnvironmentManagerOptions<T extends ConfigSchema = ConfigSchema> {
  /** Environment configurations */
  environments: Record<string, EnvironmentConfig<T>>;

  /** Current environment */
  current?: Environment;

  /** Auto-detect environment from NODE_ENV */
  autoDetect?: boolean;

  /** Default environment if not detected */
  defaultEnvironment?: Environment;

  /** Base configuration inherited by all environments */
  base?: T;
}

/**
 * Environment manager class.
 *
 * @template T - The configuration schema type
 *
 * @example
 * ```typescript
 * const manager = new EnvironmentManager({
 *   environments: {
 *     development: {
 *       environment: 'development',
 *       config: {
 *         api: { url: 'http://localhost:3000' }
 *       }
 *     },
 *     production: {
 *       environment: 'production',
 *       config: {
 *         api: { url: 'https://api.example.com' }
 *       }
 *     }
 *   },
 *   autoDetect: true,
 *   base: {
 *     logging: { level: 'info' }
 *   }
 * });
 *
 * const config = manager.getConfig();
 * ```
 */
export class EnvironmentManager<T extends ConfigSchema = ConfigSchema> {
  private currentEnv: Environment;
  private environments: Map<string, EnvironmentConfig<T>>;
  private base?: T;

  constructor(private options: EnvironmentManagerOptions<T>) {
    this.environments = new Map(Object.entries(options.environments));
    this.base = options.base;

    // Determine current environment
    if (options.current) {
      this.currentEnv = options.current;
    } else if (options.autoDetect) {
      this.currentEnv = this.detectEnvironment();
    } else {
      this.currentEnv = options.defaultEnvironment || 'development';
    }
  }

  /**
   * Detect environment from NODE_ENV or other environment variables.
   *
   * @returns Detected environment
   */
  private detectEnvironment(): Environment {
    const nodeEnv = process.env.NODE_ENV?.toLowerCase();

    // Map common NODE_ENV values to standard environments
    switch (nodeEnv) {
      case 'development':
      case 'dev':
        return 'development';
      case 'staging':
      case 'stage':
        return 'staging';
      case 'production':
      case 'prod':
        return 'production';
      case 'test':
        return 'test';
      default:
        return this.options.defaultEnvironment || 'development';
    }
  }

  /**
   * Get the current environment name.
   *
   * @returns Current environment
   *
   * @example
   * ```typescript
   * const env = manager.getCurrentEnvironment();
   * console.log('Running in:', env); // 'development'
   * ```
   */
  getCurrentEnvironment(): Environment {
    return this.currentEnv;
  }

  /**
   * Set the current environment.
   *
   * @param environment - Environment to set
   *
   * @example
   * ```typescript
   * manager.setEnvironment('production');
   * ```
   */
  setEnvironment(environment: Environment): void {
    if (!this.environments.has(environment)) {
      throw new Error(`Environment not found: ${environment}`);
    }
    this.currentEnv = environment;
  }

  /**
   * Get configuration for the current environment.
   *
   * @returns The configuration object
   *
   * @example
   * ```typescript
   * const config = manager.getConfig();
   * console.log(config.api.url);
   * ```
   */
  getConfig(): T {
    return this.getConfigForEnvironment(this.currentEnv);
  }

  /**
   * Get configuration for a specific environment.
   *
   * @param environment - Environment name
   * @returns The configuration object
   *
   * @example
   * ```typescript
   * const prodConfig = manager.getConfigForEnvironment('production');
   * ```
   */
  getConfigForEnvironment(environment: Environment): T {
    const envConfig = this.environments.get(environment);

    if (!envConfig) {
      throw new Error(`Environment not found: ${environment}`);
    }

    // Start with base config
    let config = this.base ? { ...this.base } : ({} as T);

    // Apply inheritance if specified
    if (envConfig.inherits) {
      const parentConfig = this.getConfigForEnvironment(envConfig.inherits);
      config = mergeConfigs(config, parentConfig);
    }

    // Merge environment-specific config
    config = mergeConfigs(config, envConfig.config);

    return config;
  }

  /**
   * Check if an environment exists.
   *
   * @param environment - Environment name
   * @returns True if the environment exists
   *
   * @example
   * ```typescript
   * if (manager.hasEnvironment('staging')) {
   *   console.log('Staging environment is configured');
   * }
   * ```
   */
  hasEnvironment(environment: Environment): boolean {
    return this.environments.has(environment);
  }

  /**
   * Add or update an environment configuration.
   *
   * @param environment - Environment name
   * @param config - Environment configuration
   *
   * @example
   * ```typescript
   * manager.addEnvironment('testing', {
   *   environment: 'testing',
   *   config: testConfig,
   *   inherits: 'development'
   * });
   * ```
   */
  addEnvironment(
    environment: Environment,
    config: EnvironmentConfig<T>
  ): void {
    this.environments.set(environment, config);
  }

  /**
   * Remove an environment configuration.
   *
   * @param environment - Environment name
   *
   * @example
   * ```typescript
   * manager.removeEnvironment('testing');
   * ```
   */
  removeEnvironment(environment: Environment): void {
    if (environment === this.currentEnv) {
      throw new Error('Cannot remove the current environment');
    }
    this.environments.delete(environment);
  }

  /**
   * List all available environments.
   *
   * @returns Array of environment names
   *
   * @example
   * ```typescript
   * const envs = manager.listEnvironments();
   * console.log('Available environments:', envs);
   * ```
   */
  listEnvironments(): Environment[] {
    return Array.from(this.environments.keys());
  }

  /**
   * Check if running in development environment.
   *
   * @returns True if in development
   *
   * @example
   * ```typescript
   * if (manager.isDevelopment()) {
   *   enableDebugMode();
   * }
   * ```
   */
  isDevelopment(): boolean {
    return this.currentEnv === 'development' || this.currentEnv === 'dev';
  }

  /**
   * Check if running in production environment.
   *
   * @returns True if in production
   *
   * @example
   * ```typescript
   * if (manager.isProduction()) {
   *   enablePerformanceOptimizations();
   * }
   * ```
   */
  isProduction(): boolean {
    return this.currentEnv === 'production' || this.currentEnv === 'prod';
  }

  /**
   * Check if running in staging environment.
   *
   * @returns True if in staging
   *
   * @example
   * ```typescript
   * if (manager.isStaging()) {
   *   enableStagingFeatures();
   * }
   * ```
   */
  isStaging(): boolean {
    return this.currentEnv === 'staging' || this.currentEnv === 'stage';
  }

  /**
   * Check if running in test environment.
   *
   * @returns True if in test
   *
   * @example
   * ```typescript
   * if (manager.isTest()) {
   *   mockExternalServices();
   * }
   * ```
   */
  isTest(): boolean {
    return this.currentEnv === 'test';
  }

  /**
   * Get environment-specific value with fallback.
   *
   * @template V - Value type
   * @param values - Environment-specific values
   * @param defaultValue - Default value if environment not in values
   * @returns The environment-specific value
   *
   * @example
   * ```typescript
   * const timeout = manager.getEnvironmentValue({
   *   development: 30000,
   *   production: 5000
   * }, 10000);
   * ```
   */
  getEnvironmentValue<V>(
    values: Partial<Record<Environment, V>>,
    defaultValue: V
  ): V {
    return values[this.currentEnv] ?? defaultValue;
  }
}

/**
 * Create an environment manager.
 *
 * @template T - The configuration schema type
 * @param options - Environment manager options
 * @returns A new environment manager
 *
 * @example
 * ```typescript
 * const manager = createEnvironmentManager({
 *   environments: {
 *     development: { environment: 'development', config: devConfig },
 *     production: { environment: 'production', config: prodConfig }
 *   },
 *   autoDetect: true
 * });
 * ```
 */
export function createEnvironmentManager<T extends ConfigSchema>(
  options: EnvironmentManagerOptions<T>
): EnvironmentManager<T> {
  return new EnvironmentManager(options);
}

/**
 * Detect the current environment.
 *
 * @returns The detected environment
 *
 * @example
 * ```typescript
 * const env = detectEnvironment();
 * console.log('Current environment:', env);
 * ```
 */
export function detectEnvironment(): Environment {
  const nodeEnv = process.env.NODE_ENV?.toLowerCase();

  switch (nodeEnv) {
    case 'development':
    case 'dev':
      return 'development';
    case 'staging':
    case 'stage':
      return 'staging';
    case 'production':
    case 'prod':
      return 'production';
    case 'test':
      return 'test';
    default:
      return 'development';
  }
}

/**
 * Check if running in a specific environment.
 *
 * @param environment - Environment to check
 * @returns True if running in the specified environment
 *
 * @example
 * ```typescript
 * if (isEnvironment('production')) {
 *   console.log('Running in production');
 * }
 * ```
 */
export function isEnvironment(environment: Environment): boolean {
  const current = detectEnvironment();
  return current === environment;
}

/**
 * Check if running in development.
 *
 * @returns True if in development
 *
 * @example
 * ```typescript
 * if (isDevelopment()) {
 *   console.log('Development mode');
 * }
 * ```
 */
export function isDevelopment(): boolean {
  return isEnvironment('development') || isEnvironment('dev');
}

/**
 * Check if running in production.
 *
 * @returns True if in production
 *
 * @example
 * ```typescript
 * if (isProduction()) {
 *   console.log('Production mode');
 * }
 * ```
 */
export function isProduction(): boolean {
  return isEnvironment('production') || isEnvironment('prod');
}

/**
 * Check if running in staging.
 *
 * @returns True if in staging
 *
 * @example
 * ```typescript
 * if (isStaging()) {
 *   console.log('Staging mode');
 * }
 * ```
 */
export function isStaging(): boolean {
  return isEnvironment('staging') || isEnvironment('stage');
}

/**
 * Check if running in test.
 *
 * @returns True if in test
 *
 * @example
 * ```typescript
 * if (isTest()) {
 *   console.log('Test mode');
 * }
 * ```
 */
export function isTest(): boolean {
  return isEnvironment('test');
}

/**
 * Get environment variable with type conversion and default.
 *
 * @template T - Return type
 * @param key - Environment variable key
 * @param defaultValue - Default value if not found
 * @param converter - Optional converter function
 * @returns The environment variable value
 *
 * @example
 * ```typescript
 * const port = getEnvVar('PORT', 3000, Number);
 * const debug = getEnvVar('DEBUG', false, (v) => v === 'true');
 * const apiUrl = getEnvVar('API_URL', 'http://localhost');
 * ```
 */
export function getEnvVar<T>(
  key: string,
  defaultValue: T,
  converter?: (value: string) => T
): T {
  const value = process.env[key];

  if (value === undefined) {
    return defaultValue;
  }

  if (converter) {
    try {
      return converter(value);
    } catch {
      return defaultValue;
    }
  }

  // Auto-detect type from default value
  const defaultType = typeof defaultValue;

  switch (defaultType) {
    case 'number':
      const num = Number(value);
      return (isNaN(num) ? defaultValue : num) as T;

    case 'boolean':
      return (value.toLowerCase() === 'true') as T;

    case 'object':
      if (Array.isArray(defaultValue)) {
        try {
          return JSON.parse(value) as T;
        } catch {
          return value.split(',') as T;
        }
      }
      try {
        return JSON.parse(value) as T;
      } catch {
        return defaultValue;
      }

    default:
      return value as T;
  }
}

/**
 * Require environment variable (throw if not set).
 *
 * @param key - Environment variable key
 * @param converter - Optional converter function
 * @returns The environment variable value
 * @throws {Error} If environment variable is not set
 *
 * @example
 * ```typescript
 * const apiKey = requireEnvVar('API_KEY');
 * const port = requireEnvVar('PORT', Number);
 * ```
 */
export function requireEnvVar<T = string>(
  key: string,
  converter?: (value: string) => T
): T {
  const value = process.env[key];

  if (value === undefined || value === '') {
    throw new Error(`Required environment variable not set: ${key}`);
  }

  if (converter) {
    try {
      return converter(value);
    } catch (error) {
      throw new Error(
        `Failed to convert environment variable ${key}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  return value as T;
}

/**
 * Load environment-specific configuration from files.
 *
 * @template T - Configuration type
 * @param baseConfig - Base configuration
 * @param overrides - Environment-specific overrides
 * @returns Merged configuration
 *
 * @example
 * ```typescript
 * const config = loadEnvironmentConfig(baseConfig, {
 *   development: devConfig,
 *   production: prodConfig
 * });
 * ```
 */
export function loadEnvironmentConfig<T extends ConfigSchema>(
  baseConfig: T,
  overrides: Partial<Record<Environment, Partial<T>>>
): T {
  const env = detectEnvironment();
  const envOverride = overrides[env];

  if (!envOverride) {
    return baseConfig;
  }

  return mergeConfigs(baseConfig, envOverride);
}

/**
 * Environment variable prefix helper.
 *
 * @example
 * ```typescript
 * const env = createEnvPrefix('MY_APP_');
 *
 * const port = env.get('PORT', 3000, Number);
 * const apiKey = env.require('API_KEY');
 * ```
 */
export function createEnvPrefix(prefix: string) {
  return {
    /**
     * Get environment variable with prefix.
     */
    get<T>(key: string, defaultValue: T, converter?: (value: string) => T): T {
      return getEnvVar(`${prefix}${key}`, defaultValue, converter);
    },

    /**
     * Require environment variable with prefix.
     */
    require<T = string>(key: string, converter?: (value: string) => T): T {
      return requireEnvVar(`${prefix}${key}`, converter);
    },

    /**
     * Check if environment variable exists.
     */
    has(key: string): boolean {
      return process.env[`${prefix}${key}`] !== undefined;
    },
  };
}
