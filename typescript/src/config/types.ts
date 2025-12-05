/**
 * Configuration type definitions and interfaces for the enzyme framework.
 *
 * @module @missionfabric-js/enzyme-typescript/config/types
 *
 * @example
 * ```typescript
 * import { ConfigSchema, ConfigSource, MergeStrategy } from '@missionfabric-js/enzyme-typescript/config';
 *
 * interface AppConfig extends ConfigSchema {
 *   database: {
 *     host: string;
 *     port: number;
 *   };
 *   api: {
 *     timeout: number;
 *   };
 * }
 *
 * const source: ConfigSource<AppConfig> = {
 *   type: 'file',
 *   path: './config.json',
 *   format: 'json',
 *   priority: 1
 * };
 * ```
 */

/**
 * Base configuration schema interface.
 * All configuration objects should extend this interface.
 */
export interface ConfigSchema {
  [key: string]: unknown;
}

/**
 * Configuration source types.
 */
export type ConfigSourceType =
  | 'env'           // Environment variables
  | 'file'          // File-based configuration
  | 'object'        // In-memory object
  | 'remote'        // Remote configuration service
  | 'vault'         // Secret vault (HashiCorp Vault, AWS Secrets Manager, etc.)
  | 'default';      // Default values

/**
 * Configuration file formats.
 */
export type ConfigFormat =
  | 'json'
  | 'yaml'
  | 'yml'
  | 'toml'
  | 'ini'
  | 'js'
  | 'ts';

/**
 * Configuration source definition.
 *
 * @template T - The configuration schema type
 */
export interface ConfigSource<T extends ConfigSchema = ConfigSchema> {
  /** Source type */
  type: ConfigSourceType;

  /** Source priority (higher values override lower values) */
  priority?: number;

  /** File path for file-based sources */
  path?: string;

  /** File format */
  format?: ConfigFormat;

  /** Configuration data for object sources */
  data?: Partial<T>;

  /** Environment variable prefix (e.g., 'APP_') */
  envPrefix?: string;

  /** Remote URL for remote sources */
  url?: string;

  /** Authentication credentials */
  credentials?: {
    username?: string;
    password?: string;
    token?: string;
    apiKey?: string;
  };

  /** Custom loader function */
  loader?: () => Promise<Partial<T>>;

  /** Whether this source is optional (won't fail if missing) */
  optional?: boolean;

  /** Cache duration in milliseconds */
  cacheDuration?: number;

  /** Transformation function applied after loading */
  transform?: (data: Partial<T>) => Partial<T>;
}

/**
 * Configuration merge strategies.
 */
export type MergeStrategy =
  | 'deep'          // Deep merge objects and arrays
  | 'shallow'       // Shallow merge, replace objects
  | 'override'      // Always use the new value
  | 'preserve'      // Keep existing value, ignore new
  | 'append'        // Append arrays instead of replacing
  | 'custom';       // Use custom merge function

/**
 * Configuration merge options.
 */
export interface MergeOptions {
  /** Default merge strategy */
  strategy?: MergeStrategy;

  /** Custom merge function */
  customMerge?: <T>(target: T, source: T, key: string) => T;

  /** Whether to clone objects during merge */
  clone?: boolean;

  /** Whether to merge arrays */
  mergeArrays?: boolean;

  /** Array merge strategy */
  arrayStrategy?: 'replace' | 'concat' | 'unique';

  /** Keys to exclude from merging */
  excludeKeys?: string[];

  /** Whether to preserve undefined values */
  preserveUndefined?: boolean;
}

/**
 * Configuration validation rule types.
 */
export type ValidationRuleType =
  | 'required'
  | 'type'
  | 'range'
  | 'pattern'
  | 'enum'
  | 'custom';

/**
 * Configuration validation rule.
 *
 * @template T - The value type
 */
export interface ValidationRule<T = unknown> {
  /** Rule type */
  type: ValidationRuleType;

  /** Expected type for type validation */
  expectedType?: 'string' | 'number' | 'boolean' | 'object' | 'array';

  /** Minimum value for range validation */
  min?: number;

  /** Maximum value for range validation */
  max?: number;

  /** Pattern for string validation */
  pattern?: RegExp;

  /** Allowed values for enum validation */
  allowedValues?: T[];

  /** Custom validation function */
  validator?: (value: T) => boolean | Promise<boolean>;

  /** Error message */
  message?: string;
}

/**
 * Configuration validation schema.
 *
 * @template T - The configuration schema type
 */
export interface ValidationSchema<T extends ConfigSchema = ConfigSchema> {
  [K: string]: ValidationRule | ValidationRule[] | ValidationSchema<any>;
}

/**
 * Configuration validation error.
 */
export interface ValidationError {
  /** Configuration key path */
  path: string;

  /** Error message */
  message: string;

  /** Actual value */
  value?: unknown;

  /** Expected value or type */
  expected?: unknown;

  /** Rule that failed */
  rule?: ValidationRule;
}

/**
 * Configuration validation result.
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;

  /** Validation errors */
  errors: ValidationError[];

  /** Warnings (non-critical issues) */
  warnings?: ValidationError[];
}

/**
 * Configuration loader options.
 *
 * @template T - The configuration schema type
 */
export interface LoaderOptions<T extends ConfigSchema = ConfigSchema> {
  /** Configuration sources */
  sources: ConfigSource<T>[];

  /** Default configuration */
  defaults?: Partial<T>;

  /** Merge options */
  mergeOptions?: MergeOptions;

  /** Validation schema */
  validationSchema?: ValidationSchema<T>;

  /** Whether to validate configuration */
  validate?: boolean;

  /** Whether to throw on validation errors */
  throwOnValidationError?: boolean;

  /** Whether to freeze the configuration (make immutable) */
  freeze?: boolean;

  /** Environment name (dev, staging, prod, etc.) */
  environment?: string;

  /** Whether to watch for configuration changes */
  watch?: boolean;

  /** Watch options */
  watchOptions?: WatchOptions;

  /** Configuration change callback */
  onChange?: (config: T, changes: ConfigChange<T>[]) => void | Promise<void>;
}

/**
 * Configuration watch options.
 */
export interface WatchOptions {
  /** Paths to watch */
  paths?: string[];

  /** Watch interval in milliseconds */
  interval?: number;

  /** Whether to watch recursively */
  recursive?: boolean;

  /** Debounce delay in milliseconds */
  debounce?: number;

  /** File patterns to ignore */
  ignore?: string[];
}

/**
 * Configuration change event.
 *
 * @template T - The configuration schema type
 */
export interface ConfigChange<T extends ConfigSchema = ConfigSchema> {
  /** Configuration key path */
  path: string;

  /** Old value */
  oldValue: unknown;

  /** New value */
  newValue: unknown;

  /** Change type */
  type: 'added' | 'modified' | 'deleted';

  /** Source that triggered the change */
  source?: ConfigSource<T>;

  /** Timestamp of the change */
  timestamp: Date;
}

/**
 * Configuration provider options.
 *
 * @template T - The configuration schema type
 */
export interface ProviderOptions<T extends ConfigSchema = ConfigSchema> {
  /** Configuration object */
  config: T;

  /** Whether to allow runtime updates */
  mutable?: boolean;

  /** Whether to emit change events */
  emitChanges?: boolean;

  /** Namespace for scoped configuration */
  namespace?: string;
}

/**
 * Secret encryption options.
 */
export interface EncryptionOptions {
  /** Encryption algorithm */
  algorithm?: 'aes-256-gcm' | 'aes-256-cbc' | 'aes-192-cbc';

  /** Encryption key */
  key?: string | Buffer;

  /** Key derivation function */
  keyDerivation?: 'pbkdf2' | 'scrypt' | 'argon2';

  /** Salt for key derivation */
  salt?: string | Buffer;

  /** Iterations for key derivation */
  iterations?: number;
}

/**
 * Secret configuration options.
 */
export interface SecretOptions {
  /** Whether to encrypt secrets */
  encrypt?: boolean;

  /** Encryption options */
  encryptionOptions?: EncryptionOptions;

  /** Secret provider (e.g., AWS Secrets Manager, HashiCorp Vault) */
  provider?: 'aws' | 'azure' | 'gcp' | 'vault' | 'env';

  /** Provider-specific configuration */
  providerConfig?: Record<string, unknown>;

  /** Whether to cache secrets */
  cache?: boolean;

  /** Cache TTL in milliseconds */
  cacheTTL?: number;

  /** Secret key patterns to identify secrets */
  secretPatterns?: RegExp[];
}

/**
 * Feature flag configuration.
 */
export interface FeatureFlag {
  /** Feature name */
  name: string;

  /** Whether the feature is enabled */
  enabled: boolean;

  /** Feature description */
  description?: string;

  /** Rollout percentage (0-100) */
  rollout?: number;

  /** User/group targeting rules */
  targeting?: {
    users?: string[];
    groups?: string[];
    conditions?: Array<{
      property: string;
      operator: 'equals' | 'contains' | 'matches' | 'gt' | 'lt';
      value: unknown;
    }>;
  };

  /** Feature metadata */
  metadata?: Record<string, unknown>;

  /** Expiration date */
  expiresAt?: Date;
}

/**
 * Feature flags configuration.
 */
export interface FeatureFlagsConfig {
  /** Feature flags */
  flags: Record<string, FeatureFlag>;

  /** Default enabled state for unknown flags */
  defaultEnabled?: boolean;

  /** Remote feature flag provider */
  provider?: {
    type: 'launchdarkly' | 'split' | 'optimizely' | 'custom';
    config: Record<string, unknown>;
  };
}

/**
 * Environment-specific configuration.
 *
 * @template T - The configuration schema type
 */
export interface EnvironmentConfig<T extends ConfigSchema = ConfigSchema> {
  /** Environment name */
  environment: string;

  /** Configuration for this environment */
  config: T;

  /** Whether this is the default environment */
  isDefault?: boolean;

  /** Parent environment to inherit from */
  inherits?: string;
}

/**
 * Configuration loader interface.
 *
 * @template T - The configuration schema type
 */
export interface IConfigLoader<T extends ConfigSchema = ConfigSchema> {
  /**
   * Load configuration from all sources.
   */
  load(): Promise<T>;

  /**
   * Reload configuration.
   */
  reload(): Promise<T>;

  /**
   * Get current configuration.
   */
  getConfig(): T;

  /**
   * Watch for configuration changes.
   */
  watch(callback: (config: T) => void): () => void;
}

/**
 * Configuration provider interface.
 *
 * @template T - The configuration schema type
 */
export interface IConfigProvider<T extends ConfigSchema = ConfigSchema> {
  /**
   * Get configuration value by key.
   */
  get<K extends keyof T>(key: K): T[K];

  /**
   * Get nested configuration value by path.
   */
  getByPath<V = unknown>(path: string): V;

  /**
   * Set configuration value.
   */
  set<K extends keyof T>(key: K, value: T[K]): void;

  /**
   * Check if configuration key exists.
   */
  has(key: string): boolean;

  /**
   * Get all configuration.
   */
  getAll(): T;
}

/**
 * Type guard to check if a value is a ConfigSchema.
 */
export function isConfigSchema(value: unknown): value is ConfigSchema {
  return typeof value === 'object' && value !== null;
}

/**
 * Type guard to check if a value is a ConfigSource.
 */
export function isConfigSource<T extends ConfigSchema>(
  value: unknown
): value is ConfigSource<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof (value as ConfigSource).type === 'string'
  );
}

/**
 * Extract the configuration type from a loader.
 */
export type ConfigType<T> = T extends IConfigLoader<infer C> ? C : never;

/**
 * Make all properties of T optional recursively.
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Make all properties of T required recursively.
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * Extract paths from a configuration object as string literals.
 */
export type ConfigPath<T, Prefix extends string = ''> = {
  [K in keyof T]: T[K] extends object
    ? K extends string
      ? `${Prefix}${K}` | ConfigPath<T[K], `${Prefix}${K}.`>
      : never
    : K extends string
    ? `${Prefix}${K}`
    : never;
}[keyof T];
