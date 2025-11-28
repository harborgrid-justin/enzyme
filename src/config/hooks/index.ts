/**
 * @file Configuration Hooks Index
 * @description Exports all configuration hooks for convenient importing.
 *
 * @module config/hooks
 *
 * @example
 * ```tsx
 * import {
 *   useConfig,
 *   useConfigValue,
 *   useFeatureFlag,
 *   useConfigValidation,
 * } from '@/config/hooks';
 * ```
 */

// =============================================================================
// useConfig Hook
// =============================================================================

export {
  useConfig,
  useConfigNamespace,
  type UseConfigOptions,
  type UseConfigResult,
} from './useConfig';

// =============================================================================
// useConfigValue Hook
// =============================================================================

export {
  useConfigValue,
  useConfigBoolean,
  useConfigNumber,
  useConfigString,
  useConfigEnum,
  type UseConfigValueOptions,
  type UseConfigValueResult,
} from './useConfigValue';

// =============================================================================
// useDynamicConfig Hook
// =============================================================================

export {
  useDynamicConfig,
  useFeatureFlag,
  useFlag,
  useFeatureFlags,
  useABTest,
  useFeatureFlagOverride,
  useRemoteConfig,
  type UseDynamicConfigResult,
  type UseFeatureFlagOptions,
  type UseFeatureFlagResult,
  type UseABTestOptions,
  type UseABTestResult,
  type UseFeatureFlagOverrideResult,
} from './useDynamicConfig';

// =============================================================================
// useConfigValidation Hook
// =============================================================================

export {
  useConfigValidation,
  useNamespaceValidation,
  useValidationErrors,
  useValidationWarnings,
  useConfigHealthCheck,
  type UseConfigValidationResult,
  type UseNamespaceValidationResult,
  type UseConfigHealthCheckResult,
  type ValidationSummary,
  type HealthStatus,
} from './useConfigValidation';

// =============================================================================
// Default Export
// =============================================================================

// Re-export common hooks as named exports for tree-shaking
export { useConfig as default } from './useConfig';
