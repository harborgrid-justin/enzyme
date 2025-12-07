/**
 * @file Configuration Module Exports
 * @description Configuration management for Enzyme CLI
 */

// Schema and validation
export {
  enzymeConfigSchema,
  validateConfig,
  validateConfigOrThrow,
  validateField,
  type EnzymeConfig,
  type PartialEnzymeConfig,
  type ValidationResult,
  type ValidationError,
} from './validation.js';

// Merging utilities
export {
  mergeConfig,
  mergeWithEnv,
  type MergeStrategy,
  type MergeOptions,
} from './validation.js';

// Defaults and helpers
export {
  DEFAULT_CONFIG,
  createConfig,
  getGeneratorPath,
  isFeatureEnabled,
  getEnabledFeatures,
  CONFIG_FILE_NAMES,
  getConfigFilePriority,
} from './validation.js';

// Config manager
export { ConfigManager } from './manager.js';

// Schema
export { configSchema as legacyConfigSchema } from './schema.js';
