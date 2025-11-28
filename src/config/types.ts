/**
 * @file Configuration Type Definitions
 * @description Comprehensive type system for the configuration infrastructure.
 *
 * This module provides the foundational types for:
 * - Configuration namespaces and values
 * - Validation schemas and results
 * - Registry operations and subscriptions
 * - Dynamic configuration and feature flags
 * - Migration and versioning
 *
 * @module config/types
 */

import type { z } from 'zod';

// =============================================================================
// Core Configuration Types
// =============================================================================

/**
 * Configuration value types supported by the system.
 * These are the primitive and complex types that can be stored in configuration.
 */
export type ConfigPrimitive = string | number | boolean | null | undefined;

/**
 * Configuration array type with recursive support
 */
export type ConfigArray = ConfigValue[];

/**
 * Configuration object type with string keys
 */
export type ConfigObject = { [key: string]: ConfigValue };

/**
 * Union of all valid configuration value types
 */
export type ConfigValue = ConfigPrimitive | ConfigArray | ConfigObject;

/**
 * Generic configuration record type
 */
export type ConfigRecord<T extends ConfigValue = ConfigValue> = Record<string, T>;

// =============================================================================
// Configuration Namespace Types
// =============================================================================

/**
 * Configuration namespace identifier.
 * Namespaces provide isolation and organization for related configurations.
 *
 * @example
 * ```typescript
 * const namespace: ConfigNamespace = 'streaming';
 * const pluginNamespace: ConfigNamespace = 'plugin:analytics';
 * ```
 */
export type ConfigNamespace = string & { readonly __brand: unique symbol };

/**
 * Create a typed configuration namespace
 */
export function createNamespace(name: string): ConfigNamespace {
  return name as ConfigNamespace;
}

/**
 * Well-known configuration namespaces
 */
export const CONFIG_NAMESPACES = {
  /** Core application configuration */
  APP: createNamespace('app'),
  /** API configuration */
  API: createNamespace('api'),
  /** Authentication configuration */
  AUTH: createNamespace('auth'),
  /** Feature flags */
  FEATURES: createNamespace('features'),
  /** UI/Design configuration */
  UI: createNamespace('ui'),
  /** Performance settings */
  PERFORMANCE: createNamespace('performance'),
  /** Security settings */
  SECURITY: createNamespace('security'),
  /** Streaming engine configuration */
  STREAMING: createNamespace('streaming'),
  /** Hydration configuration */
  HYDRATION: createNamespace('hydration'),
  /** Layout system configuration */
  LAYOUTS: createNamespace('layouts'),
  /** Virtual DOM configuration */
  VDOM: createNamespace('vdom'),
  /** Plugin configuration prefix */
  PLUGIN: createNamespace('plugin'),
} as const;

/**
 * Built-in namespace type
 */
export type BuiltInNamespace = (typeof CONFIG_NAMESPACES)[keyof typeof CONFIG_NAMESPACES];

// =============================================================================
// Configuration Schema Types
// =============================================================================

/**
 * Configuration schema definition using Zod
 */
export interface ConfigSchema<T extends z.ZodTypeAny = z.ZodTypeAny> {
  /** The Zod schema for validation */
  readonly schema: T;
  /** Schema version for migrations */
  readonly version: number;
  /** Human-readable description */
  readonly description?: string;
  /** Default values */
  readonly defaults?: z.infer<T>;
}

/**
 * Infer the TypeScript type from a ConfigSchema
 */
export type InferConfigType<S extends ConfigSchema> = S extends ConfigSchema<infer T>
  ? z.infer<T>
  : never;

/**
 * Configuration validation result
 */
export interface ConfigValidationResult<T = unknown> {
  /** Whether validation succeeded */
  readonly success: boolean;
  /** Validated and transformed data (if successful) */
  readonly data?: T;
  /** Validation errors (if failed) */
  readonly errors?: ConfigValidationError[];
  /** Validation warnings (non-blocking issues) */
  readonly warnings?: ConfigValidationWarning[];
  /** Validation metadata */
  readonly meta: {
    readonly namespace: string;
    readonly version: number;
    readonly validatedAt: string;
    readonly durationMs: number;
  };
}

/**
 * Configuration validation error
 */
export interface ConfigValidationError {
  /** Error path (e.g., "streaming.bufferSize") */
  readonly path: string;
  /** Error message */
  readonly message: string;
  /** Error code for programmatic handling */
  readonly code: ConfigErrorCode;
  /** Expected type or value */
  readonly expected?: string;
  /** Received value (sanitized) */
  readonly received?: string;
}

/**
 * Configuration validation warning
 */
export interface ConfigValidationWarning {
  /** Warning path */
  readonly path: string;
  /** Warning message */
  readonly message: string;
  /** Warning code */
  readonly code: ConfigWarningCode;
  /** Suggested fix */
  readonly suggestion?: string;
}

/**
 * Configuration error codes
 */
export type ConfigErrorCode =
  | 'INVALID_TYPE'
  | 'REQUIRED_FIELD'
  | 'INVALID_FORMAT'
  | 'OUT_OF_RANGE'
  | 'INVALID_ENUM'
  | 'SCHEMA_MISMATCH'
  | 'MIGRATION_FAILED'
  | 'NAMESPACE_NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'CIRCULAR_REFERENCE';

/**
 * Configuration warning codes
 */
export type ConfigWarningCode =
  | 'DEPRECATED_FIELD'
  | 'DEPRECATED_VALUE'
  | 'PERFORMANCE_CONCERN'
  | 'SECURITY_CONCERN'
  | 'EXPERIMENTAL_FEATURE'
  | 'DEFAULT_USED'
  | 'OVERRIDE_ACTIVE';

// =============================================================================
// Configuration Registry Types
// =============================================================================

/**
 * Configuration entry in the registry
 */
export interface ConfigEntry<T extends ConfigValue = ConfigValue> {
  /** Configuration namespace */
  readonly namespace: ConfigNamespace;
  /** Configuration key within namespace */
  readonly key: string;
  /** Current value */
  readonly value: T;
  /** Schema for validation */
  readonly schema?: ConfigSchema;
  /** Configuration metadata */
  readonly meta: ConfigEntryMeta;
}

/**
 * Configuration entry metadata
 */
export interface ConfigEntryMeta {
  /** When the config was registered */
  readonly registeredAt: string;
  /** When the config was last updated */
  readonly updatedAt: string;
  /** Source of the configuration */
  readonly source: ConfigSource;
  /** Whether the config is frozen (immutable) */
  readonly frozen: boolean;
  /** Configuration version */
  readonly version: number;
  /** Tags for categorization */
  readonly tags?: readonly string[];
  /** Environment restrictions */
  readonly environments?: readonly ConfigEnvironment[];
}

/**
 * Configuration source types
 */
export type ConfigSource =
  | 'default'
  | 'environment'
  | 'file'
  | 'remote'
  | 'runtime'
  | 'plugin'
  | 'override';

/**
 * Configuration environment types
 */
export type ConfigEnvironment = 'development' | 'staging' | 'production' | 'test';

/**
 * Configuration registry operations
 */
export interface ConfigRegistryOperations<T extends ConfigValue = ConfigValue> {
  /** Get a configuration value */
  get<K extends string>(namespace: ConfigNamespace, key: K): T | undefined;

  /** Get all configurations in a namespace */
  getNamespace(namespace: ConfigNamespace): Record<string, T>;

  /** Set a configuration value */
  set<K extends string>(
    namespace: ConfigNamespace,
    key: K,
    value: T,
    options?: ConfigSetOptions
  ): void;

  /** Check if a configuration exists */
  has(namespace: ConfigNamespace, key: string): boolean;

  /** Delete a configuration */
  delete(namespace: ConfigNamespace, key: string): boolean;

  /** Clear all configurations in a namespace */
  clearNamespace(namespace: ConfigNamespace): void;

  /** Subscribe to configuration changes */
  subscribe(
    namespace: ConfigNamespace,
    key: string | '*',
    listener: ConfigChangeListener<T>
  ): ConfigUnsubscribe;

  /** Get configuration metadata */
  getMeta(namespace: ConfigNamespace, key: string): ConfigEntryMeta | undefined;
}

/**
 * Options for setting configuration values
 */
export interface ConfigSetOptions {
  /** Source of the configuration change */
  source?: ConfigSource;
  /** Whether to freeze the value (make immutable) */
  freeze?: boolean;
  /** Schema for validation */
  schema?: ConfigSchema;
  /** Tags for categorization */
  tags?: string[];
  /** Environment restrictions */
  environments?: ConfigEnvironment[];
  /** Whether to skip validation */
  skipValidation?: boolean;
  /** Whether to emit change events */
  silent?: boolean;
}

/**
 * Configuration change listener
 */
export type ConfigChangeListener<T = unknown> = (event: ConfigChangeEvent<T>) => void;

/**
 * Configuration change event
 */
export interface ConfigChangeEvent<T = unknown> {
  /** Event type */
  readonly type: 'set' | 'delete' | 'clear';
  /** Configuration namespace */
  readonly namespace: ConfigNamespace;
  /** Configuration key */
  readonly key: string;
  /** Previous value */
  readonly previousValue?: T;
  /** New value */
  readonly newValue?: T;
  /** Change source */
  readonly source: ConfigSource;
  /** Event timestamp */
  readonly timestamp: string;
}

/**
 * Unsubscribe function type
 */
export type ConfigUnsubscribe = () => void;

// =============================================================================
// Dynamic Configuration Types
// =============================================================================

/**
 * Dynamic configuration options
 */
export interface DynamicConfigOptions {
  /** Polling interval for remote configs (ms) */
  readonly pollingInterval?: number;
  /** Enable WebSocket for real-time updates */
  readonly enableWebSocket?: boolean;
  /** Cache duration (ms) */
  readonly cacheDuration?: number;
  /** Retry configuration */
  readonly retry?: {
    readonly maxAttempts: number;
    readonly baseDelay: number;
    readonly maxDelay: number;
  };
  /** Fallback behavior on failure */
  readonly fallback?: 'cache' | 'default' | 'error';
}

/**
 * Dynamic configuration state
 */
export interface DynamicConfigState {
  /** Whether the dynamic config is initialized */
  readonly initialized: boolean;
  /** Whether currently syncing with remote */
  readonly syncing: boolean;
  /** Last successful sync timestamp */
  readonly lastSyncedAt?: string;
  /** Last sync error */
  readonly lastError?: ConfigSyncError;
  /** Connection status for WebSocket */
  readonly connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'error';
}

/**
 * Configuration sync error
 */
export interface ConfigSyncError {
  /** Error message */
  readonly message: string;
  /** Error code */
  readonly code: string;
  /** Error timestamp */
  readonly timestamp: string;
  /** Number of retry attempts */
  readonly retryCount: number;
}

// =============================================================================
// Configuration Migration Types
// =============================================================================

/**
 * Configuration migration definition
 */
export interface ConfigMigration<
  TFrom extends ConfigValue = ConfigValue,
  TTo extends ConfigValue = ConfigValue,
> {
  /** Source version */
  readonly fromVersion: number;
  /** Target version */
  readonly toVersion: number;
  /** Migration function */
  readonly migrate: (config: TFrom) => TTo;
  /** Rollback function (optional) */
  readonly rollback?: (config: TTo) => TFrom;
  /** Migration description */
  readonly description?: string;
}

/**
 * Migration result
 */
export interface MigrationResult<T = unknown> {
  /** Whether migration succeeded */
  readonly success: boolean;
  /** Migrated configuration */
  readonly data?: T;
  /** Migration path (versions traversed) */
  readonly path: number[];
  /** Any errors encountered */
  readonly errors?: string[];
  /** Duration in milliseconds */
  readonly durationMs: number;
}

// =============================================================================
// Feature Flag Types
// =============================================================================

/**
 * Feature flag configuration
 */
export interface FeatureFlagConfig {
  /** Flag key */
  readonly key: string;
  /** Default value */
  readonly defaultValue: boolean;
  /** Flag description */
  readonly description: string;
  /** Whether flag is experimental */
  readonly experimental?: boolean;
  /** Minimum role required */
  readonly minRole?: string;
  /** Rollout percentage (0-100) */
  readonly rolloutPercentage?: number;
  /** Target environments */
  readonly environments?: readonly ConfigEnvironment[];
  /** A/B test variant */
  readonly variant?: string;
  /** Expiration date */
  readonly expiresAt?: string;
}

/**
 * Feature flag evaluation context
 */
export interface FeatureFlagContext {
  /** User ID */
  readonly userId?: string;
  /** User role */
  readonly userRole?: string;
  /** Current environment */
  readonly environment: ConfigEnvironment;
  /** User attributes for targeting */
  readonly attributes?: Record<string, unknown>;
  /** Session ID */
  readonly sessionId?: string;
}

/**
 * Feature flag evaluation result
 */
export interface FeatureFlagResult {
  /** Flag key */
  readonly key: string;
  /** Evaluated value */
  readonly value: boolean;
  /** Evaluation reason */
  readonly reason: FeatureFlagReason;
  /** Variant (if applicable) */
  readonly variant?: string;
  /** Rule that matched (if applicable) */
  readonly ruleId?: string;
}

/**
 * Reasons for feature flag evaluation
 */
export type FeatureFlagReason =
  | 'DEFAULT'
  | 'TARGETING_MATCH'
  | 'ROLLOUT'
  | 'OVERRIDE'
  | 'DISABLED'
  | 'EXPIRED'
  | 'ERROR';

// =============================================================================
// A/B Testing Types
// =============================================================================

/**
 * A/B test configuration
 */
export interface ABTestConfig {
  /** Test identifier */
  readonly id: string;
  /** Test name */
  readonly name: string;
  /** Test description */
  readonly description?: string;
  /** Test variants */
  readonly variants: readonly ABTestVariant[];
  /** Traffic allocation (percentage per variant) */
  readonly allocation: Record<string, number>;
  /** Test status */
  readonly status: 'draft' | 'running' | 'paused' | 'completed';
  /** Start date */
  readonly startDate?: string;
  /** End date */
  readonly endDate?: string;
  /** Target audience */
  readonly targeting?: ABTestTargeting;
}

/**
 * A/B test variant
 */
export interface ABTestVariant {
  /** Variant identifier */
  readonly id: string;
  /** Variant name */
  readonly name: string;
  /** Whether this is the control variant */
  readonly isControl?: boolean;
  /** Variant configuration */
  readonly config: ConfigRecord;
}

/**
 * A/B test targeting rules
 */
export interface ABTestTargeting {
  /** Include users matching these conditions */
  readonly include?: ABTestCondition[];
  /** Exclude users matching these conditions */
  readonly exclude?: ABTestCondition[];
}

/**
 * A/B test targeting condition
 */
export interface ABTestCondition {
  /** Attribute to match */
  readonly attribute: string;
  /** Operator */
  readonly operator: 'equals' | 'contains' | 'matches' | 'in' | 'gt' | 'lt' | 'gte' | 'lte';
  /** Value to match */
  readonly value: unknown;
}

// =============================================================================
// Configuration Provider Types (React)
// =============================================================================

/**
 * Configuration context value
 */
export interface ConfigContextValue {
  /** Get configuration value */
  readonly get: <T extends ConfigValue>(namespace: ConfigNamespace, key: string) => T | undefined;
  /** Get entire namespace */
  readonly getNamespace: <T extends ConfigRecord>(namespace: ConfigNamespace) => T;
  /** Check if config exists */
  readonly has: (namespace: ConfigNamespace, key: string) => boolean;
  /** Get validation status */
  readonly getValidationStatus: () => ConfigValidationStatus;
  /** Subscribe to changes */
  readonly subscribe: (
    namespace: ConfigNamespace,
    key: string,
    listener: ConfigChangeListener
  ) => ConfigUnsubscribe;
  /** Dynamic config state */
  readonly dynamicState: DynamicConfigState;
  /** Force refresh from remote */
  readonly refresh: () => Promise<void>;
}

/**
 * Configuration validation status
 */
export interface ConfigValidationStatus {
  /** Overall validation status */
  readonly valid: boolean;
  /** Number of errors */
  readonly errorCount: number;
  /** Number of warnings */
  readonly warningCount: number;
  /** Per-namespace status */
  readonly namespaces: Record<
    string,
    {
      valid: boolean;
      errors: ConfigValidationError[];
      warnings: ConfigValidationWarning[];
    }
  >;
  /** Last validation timestamp */
  readonly validatedAt: string;
}

// =============================================================================
// Configuration Discovery Types
// =============================================================================

/**
 * Configuration discovery options
 */
export interface ConfigDiscoveryOptions {
  /** Directories to scan */
  readonly directories?: string[];
  /** File patterns to match */
  readonly patterns?: string[];
  /** File patterns to exclude */
  readonly exclude?: string[];
  /** Whether to watch for changes */
  readonly watch?: boolean;
  /** Debounce interval for watch (ms) */
  readonly watchDebounce?: number;
}

/**
 * Discovered configuration file
 */
export interface DiscoveredConfigFile {
  /** File path */
  readonly path: string;
  /** Inferred namespace */
  readonly namespace: ConfigNamespace;
  /** File type */
  readonly type: 'ts' | 'js' | 'json' | 'yaml';
  /** Last modified timestamp */
  readonly modifiedAt: string;
  /** File hash for change detection */
  readonly hash: string;
}

/**
 * Configuration discovery result
 */
export interface ConfigDiscoveryResult {
  /** Discovered files */
  readonly files: DiscoveredConfigFile[];
  /** Any errors during discovery */
  readonly errors: Array<{ path: string; error: string }>;
  /** Discovery duration */
  readonly durationMs: number;
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Deep partial type for configuration objects
 */
export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

/**
 * Deep readonly type for immutable configurations
 */
export type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

/**
 * Make all properties required and non-nullable
 */
export type DeepRequired<T> = T extends object
  ? {
      [P in keyof T]-?: DeepRequired<NonNullable<T[P]>>;
    }
  : T;

/**
 * Extract configuration keys as a union type
 */
export type ConfigKeys<T extends ConfigRecord> = keyof T & string;

/**
 * Path type for nested configuration access
 */
export type ConfigPath<T, K extends keyof T = keyof T> = K extends string
  ? T[K] extends ConfigRecord
    ? K | `${K}.${ConfigPath<T[K]>}`
    : K
  : never;

/**
 * Get type at a nested path
 */
export type ConfigPathValue<T, P extends string> = P extends `${infer K}.${infer R}`
  ? K extends keyof T
    ? T[K] extends ConfigRecord
      ? ConfigPathValue<T[K], R>
      : never
    : never
  : P extends keyof T
    ? T[P]
    : never;
