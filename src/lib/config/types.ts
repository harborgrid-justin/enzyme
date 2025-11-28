/**
 * @fileoverview Type definitions for the configuration management system.
 *
 * Provides comprehensive types for:
 * - Configuration schemas
 * - Validation rules
 * - Environment-specific configuration
 * - Runtime configuration
 *
 * @module config/types
 */

// ============================================================================
// Base Types
// ============================================================================

/**
 * Primitive configuration value types.
 */
export type ConfigPrimitive = string | number | boolean | null;

/**
 * Configuration value that can be any JSON-compatible type.
 */
export type ConfigValue =
  | ConfigPrimitive
  | ConfigValue[]
  | { [key: string]: ConfigValue };

/**
 * Configuration record.
 */
export type ConfigRecord = Record<string, ConfigValue>;

// ============================================================================
// Configuration Schema
// ============================================================================

/**
 * Validation rule types.
 */
export type ValidationRuleType =
  | 'required'
  | 'string'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object'
  | 'enum'
  | 'pattern'
  | 'min'
  | 'max'
  | 'minLength'
  | 'maxLength'
  | 'email'
  | 'url'
  | 'custom';

/**
 * A validation rule for a configuration field.
 */
export interface ValidationRule {
  /** Rule type */
  readonly type: ValidationRuleType;
  /** Rule parameters */
  readonly params?: unknown;
  /** Error message when validation fails */
  readonly message?: string;
}

/**
 * Schema definition for a configuration field.
 */
export interface ConfigFieldSchema {
  /** Field description */
  readonly description?: string;
  /** Default value */
  readonly default?: ConfigValue;
  /** Validation rules */
  readonly rules?: readonly ValidationRule[];
  /** Whether the field is secret (should be masked in logs) */
  readonly secret?: boolean;
  /** Environment variable to read from */
  readonly envVar?: string;
  /** Nested schema for objects */
  readonly properties?: ConfigSchema;
  /** Schema for array items */
  readonly items?: ConfigFieldSchema;
  /** Whether field is deprecated */
  readonly deprecated?: boolean;
  /** Deprecation message */
  readonly deprecationMessage?: string;
}

/**
 * Full configuration schema.
 */
export type ConfigSchema = Record<string, ConfigFieldSchema>;

// ============================================================================
// Validation Results
// ============================================================================

/**
 * A validation error.
 */
export interface ValidationError {
  /** Path to the field that failed validation */
  readonly path: string;
  /** Error message */
  readonly message: string;
  /** Rule that failed */
  readonly rule: ValidationRuleType;
  /** Actual value that failed */
  readonly value?: unknown;
}

/**
 * Result of configuration validation.
 */
export interface ValidationResult {
  /** Whether validation passed */
  readonly valid: boolean;
  /** Validation errors */
  readonly errors: readonly ValidationError[];
  /** Warnings (e.g., deprecated fields) */
  readonly warnings: readonly string[];
}

// ============================================================================
// Configuration Sources
// ============================================================================

/**
 * Configuration source types.
 */
export type ConfigSourceType =
  | 'default'
  | 'file'
  | 'environment'
  | 'remote'
  | 'runtime';

/**
 * Configuration source priority (lower = higher priority).
 */
export interface ConfigSource {
  /** Source type */
  readonly type: ConfigSourceType;
  /** Source name for identification */
  readonly name: string;
  /** Priority (lower = higher priority) */
  readonly priority: number;
  /** Source data */
  readonly data: ConfigRecord;
}

// ============================================================================
// Environment Configuration
// ============================================================================

/**
 * Application environments.
 */
export type Environment = 'development' | 'staging' | 'production' | 'test';

/**
 * Deep partial type
 */
export type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

/**
 * Environment-specific configuration overrides.
 */
export type EnvironmentConfig<T extends ConfigRecord = ConfigRecord> = {
  [K in Environment]?: DeepPartial<T>;
};

// ============================================================================
// Runtime Configuration
// ============================================================================

/**
 * Runtime configuration change.
 */
export interface ConfigChange {
  /** Path to changed value */
  readonly path: string;
  /** Previous value */
  readonly previousValue: ConfigValue | undefined;
  /** New value */
  readonly newValue: ConfigValue;
  /** Source of change */
  readonly source: ConfigSourceType;
  /** Timestamp */
  readonly timestamp: Date;
}

/**
 * Runtime configuration event types.
 */
export type ConfigEventType = 'change' | 'reload' | 'error';

/**
 * Runtime configuration event.
 */
export interface ConfigEvent {
  readonly type: ConfigEventType;
  readonly changes?: readonly ConfigChange[];
  readonly error?: Error;
  readonly timestamp: Date;
}

/**
 * Configuration event listener.
 */
export type ConfigEventListener = (event: ConfigEvent) => void;

// ============================================================================
// Loader Configuration
// ============================================================================

/**
 * Configuration loader options.
 */
export interface ConfigLoaderOptions {
  /** Base configuration file path */
  readonly basePath?: string;
  /** Environment variable prefix */
  readonly envPrefix?: string;
  /** Remote configuration URL */
  readonly remoteUrl?: string;
  /** Whether to watch for changes */
  readonly watch?: boolean;
  /** Enable debug logging */
  readonly debug?: boolean;
  /** Custom environment detection */
  readonly detectEnvironment?: () => Environment;
}

/**
 * Remote configuration options.
 */
export interface RemoteConfigOptions {
  /** Configuration endpoint URL */
  readonly url: string;
  /** API key or token */
  readonly apiKey?: string;
  /** Request timeout in ms */
  readonly timeout?: number;
  /** Polling interval in ms */
  readonly pollInterval?: number;
  /** Request headers */
  readonly headers?: Record<string, string>;
}

// ============================================================================
// Merge Strategy
// ============================================================================

/**
 * Merge strategy for combining configuration sources.
 */
export type MergeStrategy = 'replace' | 'deep' | 'shallow';

/**
 * Merge options.
 */
export interface MergeOptions {
  /** Merge strategy */
  readonly strategy?: MergeStrategy;
  /** How to handle arrays */
  readonly arrayMerge?: 'replace' | 'concat' | 'unique';
  /** How to handle null values */
  readonly nullHandling?: 'keep' | 'remove' | 'replace';
}

// ============================================================================
// Application Configuration Types
// ============================================================================

/**
 * Standard application configuration structure.
 */
export interface AppConfig {
  /** Application metadata */
  readonly app: {
    readonly name: string;
    readonly version: string;
    readonly environment: Environment;
    readonly debug: boolean;
  };

  /** Server configuration */
  readonly server?: {
    readonly host: string;
    readonly port: number;
    readonly basePath: string;
  };

  /** API configuration */
  readonly api: {
    readonly baseUrl: string;
    readonly timeout: number;
    readonly retries: number;
  };

  /** Authentication configuration */
  readonly auth?: {
    readonly provider: string;
    readonly clientId?: string;
    readonly domain?: string;
    readonly audience?: string;
    readonly redirectUri?: string;
  };

  /** Feature flags configuration */
  readonly features: {
    readonly enabled: boolean;
    readonly source: 'local' | 'remote';
    readonly endpoint?: string;
    readonly pollInterval?: number;
  };

  /** Logging configuration */
  readonly logging: {
    readonly level: 'debug' | 'info' | 'warn' | 'error';
    readonly format: 'json' | 'text';
    readonly destination: 'console' | 'remote';
    readonly remoteUrl?: string;
  };

  /** Analytics configuration */
  readonly analytics?: {
    readonly enabled: boolean;
    readonly provider: string;
    readonly trackingId?: string;
    readonly sampleRate?: number;
  };

  /** Cache configuration */
  readonly cache?: {
    readonly enabled: boolean;
    readonly ttl: number;
    readonly maxSize: number;
    readonly storage: 'memory' | 'localStorage' | 'indexedDB';
  };

  /** Additional custom configuration */
  readonly custom?: ConfigRecord;
}

// ============================================================================
// Context Types
// ============================================================================

/**
 * Configuration context value.
 */
export interface ConfigContextValue<T extends ConfigRecord = ConfigRecord> {
  /** Current configuration */
  readonly config: T;
  /** Whether configuration is loading */
  readonly isLoading: boolean;
  /** Configuration error if any */
  readonly error: Error | null;
  /** Get a specific config value */
  readonly get: <V = ConfigValue>(path: string, defaultValue?: V) => V;
  /** Check if a path exists */
  readonly has: (path: string) => boolean;
  /** Set a runtime config value */
  readonly set: (path: string, value: ConfigValue) => void;
  /** Reset to defaults */
  readonly reset: () => void;
  /** Reload configuration */
  readonly reload: () => Promise<void>;
  /** Subscribe to changes */
  readonly subscribe: (listener: ConfigEventListener) => () => void;
}
