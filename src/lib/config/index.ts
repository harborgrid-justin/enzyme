/**
 * @fileoverview Configuration management module exports.
 *
 * This module provides comprehensive configuration management:
 * - Multi-source configuration loading
 * - Schema-based validation
 * - Environment-specific overrides
 * - Runtime configuration updates
 * - React integration with hooks and providers
 *
 * @module config
 *
 * @example
 * ```tsx
 * import {
 *   ConfigProvider,
 *   useConfig,
 *   useConfigValue,
 *   createSchema,
 * } from '@/lib/config';
 *
 * // Define configuration schema
 * const schema = createSchema()
 *   .string('apiUrl', { required: true })
 *   .number('timeout', { default: 10000, min: 1000 })
 *   .boolean('debug', { default: false })
 *   .build();
 *
 * // Provide configuration
 * function App() {
 *   return (
 *     <ConfigProvider config={defaultConfig} schema={schema}>
 *       <MyApp />
 *     </ConfigProvider>
 *   );
 * }
 *
 * // Use configuration
 * function MyComponent() {
 *   const apiUrl = useConfigValue('apiUrl');
 *   const timeout = useConfigValue('timeout', 10000);
 *   return <div>API: {apiUrl}, Timeout: {timeout}</div>;
 * }
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export type {
  // Base Types
  ConfigPrimitive,
  ConfigValue,
  ConfigRecord,
  DeepPartial,

  // Schema Types
  ValidationRuleType,
  ValidationRule,
  ConfigFieldSchema,
  ConfigSchema,

  // Validation Types
  ValidationError,
  ValidationResult,

  // Source Types
  ConfigSourceType,
  ConfigSource,

  // Environment Types
  Environment,
  EnvironmentConfig,

  // Runtime Types
  ConfigChange,
  ConfigEventType,
  ConfigEvent,
  ConfigEventListener,

  // Loader Types
  ConfigLoaderOptions,
  RemoteConfigOptions,

  // Merge Types
  MergeStrategy,
  MergeOptions,

  // Application Types
  AppConfig,

  // Context Types
  ConfigContextValue,
} from './types';

// ============================================================================
// Validation
// ============================================================================

export {
  ConfigValidator,
  SchemaBuilder,
  createSchema,
  validateConfig,
  CommonSchemas,
} from './config-validator';

export type { CustomValidator, ValidatorOptions } from './config-validator';

// ============================================================================
// Merging
// ============================================================================

export {
  ConfigMerger,
  deepMerge,
  shallowMerge,
  replaceMerge,
  getValueAtPath,
  setValueAtPath,
  deleteValueAtPath,
  hasPath,
  getAllPaths,
  diffConfigs,
  flattenConfig,
  unflattenConfig,
} from './config-merger';

export type { ConfigDiff } from './config-merger';

// ============================================================================
// Loading
// ============================================================================

export { ConfigLoader, createConfigLoader, loadConfig } from './config-loader';

// ============================================================================
// Environment
// ============================================================================

export {
  detectEnvironment,
  isDevelopment,
  isProduction,
  isStaging,
  isTest,
  isBrowser,
  isServer,
  EnvironmentConfigManager,
  getEnvironmentDefaults,
  environmentDefaults,
  getEnvVar,
  requireEnvVar,
  getEnvVarAsNumber,
  getEnvVarAsBoolean,
  getEnvVarAsJson,
  getEnvVarAsArray,
  getEnvironmentConfig,
  resetEnvironmentConfig,
} from './environment-config';

// ============================================================================
// Runtime
// ============================================================================

export {
  RuntimeConfig,
  createRuntimeConfig,
  getRuntimeConfig,
  initRuntimeConfig,
  resetRuntimeConfig,
} from './runtime-config';

export type { RuntimeConfigOptions } from './runtime-config';

// ============================================================================
// React Integration
// ============================================================================

export {
  ConfigProvider,
  ConfigContext,
  useConfigContext,
  useOptionalConfigContext,
  withConfig,
} from './ConfigProvider';

export type { ConfigProviderProps } from './ConfigProvider';

// ============================================================================
// React Hooks
// ============================================================================

export {
  // Basic hooks
  useConfig,
  useConfigValue,
  useHasConfig,
  useConfigLoading,
  useConfigError,

  // Mutation hooks
  useSetConfig,
  useResetConfig,
  useReloadConfig,
  useConfigState,

  // Subscription hooks
  useConfigChange,
  useWatchConfig,

  // Feature flag integration
  useFeatureConfig,
  useFeatureSettings,

  // Environment hooks
  useEnvironment,
  useIsDevelopment,
  useIsProduction,

  // Selector hooks
  useConfigSelector,
  useConfigDerived,

  // Type-safe hooks
  createTypedConfigHook,
  createTypedValueHook,

  // Debug hooks
  useConfigPaths,
  useConfigStats,
} from './useConfig';
