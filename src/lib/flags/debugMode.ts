/**
 * @file Debug Mode Utility
 * @description Provides debug mode checking for non-React contexts
 *
 * This utility allows checking the debug-mode feature flag in non-React
 * files like ErrorReporter, system initialization, and other services.
 *
 * The utility checks:
 * 1. Runtime flag state from the feature flag provider (if initialized)
 * 2. Default flag value from configuration
 * 3. Falls back to NODE_ENV check
 */

import { getDefaultFlagValue } from '@/config/featureFlagConfig';
import { flagKeys } from './flagKeys';

/**
 * Internal state to track feature flag provider initialization
 * This is set when the FeatureFlagProvider mounts
 */
let flagProviderInitialized = false;
let runtimeFlags: Record<string, boolean> = {};

/**
 * Called by FeatureFlagProvider when it initializes
 * @internal
 */
export function _setFlagProviderInitialized(flags: Record<string, boolean>): void {
  flagProviderInitialized = true;
  runtimeFlags = flags;
}

/**
 * Called by FeatureFlagProvider when flags are updated
 * @internal
 */
export function _updateRuntimeFlags(flags: Record<string, boolean>): void {
  runtimeFlags = flags;
}

/**
 * Called by FeatureFlagProvider when it unmounts (for testing)
 * @internal
 */
export function _resetFlagProvider(): void {
  flagProviderInitialized = false;
  runtimeFlags = {};
}

/**
 * Check if debug mode is enabled.
 *
 * This function can be safely called from anywhere, including:
 * - Service initialization
 * - Error reporters
 * - Store configuration
 * - Utility functions
 *
 * Resolution order:
 * 1. Runtime flags (if provider is initialized)
 * 2. Default flag configuration value
 * 3. NODE_ENV === 'development' (ultimate fallback)
 *
 * @returns True if debug mode is enabled
 *
 * @example
 * ```typescript
 * import { isDebugModeEnabled } from '@/lib/flags/debugMode';
 *
 * if (isDebugModeEnabled()) {
 *   console.debug('[Debug]', detailedInfo);
 * }
 * ```
 */
export function isDebugModeEnabled(): boolean {
  // First, check runtime flags if provider is initialized
  if (flagProviderInitialized && flagKeys.DEBUG_MODE in runtimeFlags) {
    return runtimeFlags[flagKeys.DEBUG_MODE] ?? false;
  }

  // Fall back to default flag configuration
  const defaultValue = getDefaultFlagValue(flagKeys.DEBUG_MODE);

  // If no default is set, use environment check
  // This ensures debug mode works during bootstrap before providers mount
  if (defaultValue === false) {
    return process.env['NODE_ENV'] === 'development';
  }

  return defaultValue;
}

/**
 * Check if a specific feature flag is enabled (non-React utility).
 *
 * For most cases, prefer using the `useFeatureFlag` hook in React components.
 * This utility is for service-level code that runs outside React.
 *
 * @param flagKey - The feature flag key to check
 * @returns True if the flag is enabled
 *
 * @example
 * ```typescript
 * import { isFlagEnabled } from '@/lib/flags/debugMode';
 *
 * if (isFlagEnabled('analytics-v2')) {
 *   sendToNewAnalytics(event);
 * }
 * ```
 */
export function isFlagEnabled(flagKey: string): boolean {
  // First, check runtime flags if provider is initialized
  if (flagProviderInitialized && flagKey in runtimeFlags) {
    return runtimeFlags[flagKey] ?? false;
  }

  // Fall back to default flag configuration
  return getDefaultFlagValue(flagKey);
}

/**
 * Check if development mode (based on NODE_ENV only).
 *
 * Use this for build-time decisions that shouldn't be controlled by flags.
 * For runtime debug toggling, use `isDebugModeEnabled()` instead.
 *
 * @returns True if NODE_ENV is 'development'
 */
export function isDevelopmentEnv(): boolean {
  return process.env['NODE_ENV'] === 'development';
}
