/**
 * @file useDynamicConfig Hook
 * @description Hook for accessing dynamic configuration, feature flags, and A/B tests.
 *
 * @module config/hooks/useDynamicConfig
 */

import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import type {
  DynamicConfigState,
  FeatureFlagResult,
  FeatureFlagContext,
  ABTestVariant,
  ConfigRecord,
  ConfigEnvironment,
} from '../types';
import { useConfigContext } from '../ConfigProvider';
import { env } from '../env';

// =============================================================================
// useDynamicConfig Hook
// =============================================================================

/**
 * Return type for useDynamicConfig hook
 */
export interface UseDynamicConfigResult {
  /** Dynamic config state */
  state: DynamicConfigState;
  /** Whether dynamic config is initialized */
  isInitialized: boolean;
  /** Whether currently syncing */
  isSyncing: boolean;
  /** Connection status */
  connectionStatus: DynamicConfigState['connectionStatus'];
  /** Force refresh from remote */
  refresh: () => Promise<void>;
  /** Last sync error */
  error: DynamicConfigState['lastError'];
}

/**
 * Hook for accessing dynamic configuration state
 *
 * Provides access to the dynamic configuration manager state
 * including sync status and error information.
 *
 * @returns Dynamic configuration state and controls
 *
 * @example
 * ```tsx
 * function ConfigStatus() {
 *   const { state, isSyncing, refresh, error } = useDynamicConfig();
 *
 *   return (
 *     <div>
 *       <p>Status: {state.connectionStatus}</p>
 *       {isSyncing && <LoadingSpinner />}
 *       {error && <ErrorMessage message={error.message} />}
 *       <button onClick={refresh}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useDynamicConfig(): UseDynamicConfigResult {
  const { dynamicState, refresh } = useConfigContext();

  return {
    state: dynamicState,
    isInitialized: dynamicState.initialized,
    isSyncing: dynamicState.syncing,
    connectionStatus: dynamicState.connectionStatus,
    refresh,
    error: dynamicState.lastError,
  };
}

// =============================================================================
// useFeatureFlag Hook
// =============================================================================

/**
 * Options for useFeatureFlag hook
 */
export interface UseFeatureFlagOptions {
  /** User ID for targeting */
  userId?: string;
  /** User role for role-based flags */
  userRole?: string;
  /** Custom attributes for targeting */
  attributes?: Record<string, unknown>;
  /** Default value if flag doesn't exist */
  defaultValue?: boolean;
}

/**
 * Return type for useFeatureFlag hook
 */
export interface UseFeatureFlagResult {
  /** Whether flag is enabled */
  isEnabled: boolean;
  /** Full evaluation result */
  result: FeatureFlagResult;
  /** Whether flag is loading */
  isLoading: boolean;
}

/**
 * Hook for evaluating a feature flag
 *
 * Evaluates a feature flag in the current context and
 * subscribes to changes.
 *
 * @param flagKey - Feature flag key
 * @param options - Evaluation options
 * @returns Feature flag evaluation result
 *
 * @example
 * ```tsx
 * function NewDashboard() {
 *   const { isEnabled, isLoading } = useFeatureFlag('new-dashboard', {
 *     userId: currentUser.id,
 *   });
 *
 *   if (isLoading) return <LoadingSpinner />;
 *
 *   return isEnabled ? <NewDashboardV2 /> : <LegacyDashboard />;
 * }
 * ```
 */
export function useFeatureFlag(
  flagKey: string,
  options: UseFeatureFlagOptions = {}
): UseFeatureFlagResult {
  const { dynamicConfig, isInitialized } = useConfigContext();
  const { userId, userRole, attributes, defaultValue = false } = options;

  // Build evaluation context
  const context: FeatureFlagContext = useMemo(
    () => ({
      userId,
      userRole,
      environment: (env.appEnv as ConfigEnvironment) ?? 'development',
      attributes,
      sessionId: typeof window !== 'undefined' ? (sessionStorage.getItem('session_id') !== null && sessionStorage.getItem('session_id') !== '' ? sessionStorage.getItem('session_id') : undefined) : undefined,
    }),
    [userId, userRole, attributes]
  );

  // Evaluate flag
  const result = useMemo<FeatureFlagResult>(() => {
    if (!isInitialized) {
      return {
        key: flagKey,
        value: defaultValue,
        reason: 'DEFAULT',
      };
    }
    return dynamicConfig.evaluateFlag(flagKey, context);
  }, [dynamicConfig, flagKey, context, isInitialized, defaultValue]);

  // Subscribe to dynamic state changes to re-evaluate
  const { isSyncing } = useDynamicConfig();

  return {
    isEnabled: result.value,
    result,
    isLoading: !isInitialized || isSyncing,
  };
}

/**
 * Hook for simple boolean feature flag check
 *
 * @param flagKey - Feature flag key
 * @param defaultValue - Default value if flag doesn't exist
 * @returns Whether flag is enabled
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isDarkModeEnabled = useFlag('dark-mode', true);
 *   return <div className={isDarkModeEnabled ? 'dark' : 'light'}>...</div>;
 * }
 * ```
 */
export function useFlag(flagKey: string, defaultValue: boolean = false): boolean {
  const { isEnabled } = useFeatureFlag(flagKey, { defaultValue });
  return isEnabled;
}

/**
 * Hook for multiple feature flags
 *
 * @param flagKeys - Array of flag keys
 * @param options - Evaluation options
 * @returns Record of flag values
 *
 * @example
 * ```tsx
 * function FeatureMatrix() {
 *   const flags = useFeatureFlags(['dark-mode', 'new-dashboard', 'beta-features']);
 *
 *   return (
 *     <ul>
 *       {Object.entries(flags).map(([key, enabled]) => (
 *         <li key={key}>{key}: {enabled ? 'ON' : 'OFF'}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useFeatureFlags(
  flagKeys: string[],
  options: UseFeatureFlagOptions = {}
): Record<string, boolean> {
  const { dynamicConfig, isInitialized } = useConfigContext();
  const { userId, userRole, attributes, defaultValue = false } = options;

  const context: FeatureFlagContext = useMemo(
    () => ({
      userId,
      userRole,
      environment: (env.appEnv as ConfigEnvironment) || 'development',
      attributes,
    }),
    [userId, userRole, attributes]
  );

  return useMemo(() => {
    const result: Record<string, boolean> = {};
    for (const key of flagKeys) {
      if (!isInitialized) {
        result[key] = defaultValue;
      } else {
        result[key] = dynamicConfig.evaluateFlag(key, context).value;
      }
    }
    return result;
  }, [dynamicConfig, flagKeys, context, isInitialized, defaultValue]);
}

// =============================================================================
// useABTest Hook
// =============================================================================

/**
 * Options for useABTest hook
 */
export interface UseABTestOptions {
  /** User ID for consistent assignment */
  userId?: string;
}

/**
 * Return type for useABTest hook
 */
export interface UseABTestResult<T extends ConfigRecord = ConfigRecord> {
  /** Assigned variant */
  variant: ABTestVariant | undefined;
  /** Variant ID */
  variantId: string | undefined;
  /** Whether user is in control group */
  isControl: boolean;
  /** Variant configuration */
  config: T | undefined;
  /** Whether test is loading */
  isLoading: boolean;
}

/**
 * Hook for A/B test assignment
 *
 * Gets the user's assigned variant for an A/B test.
 *
 * @param testId - A/B test identifier
 * @param options - Assignment options
 * @returns A/B test assignment result
 *
 * @example
 * ```tsx
 * function CheckoutPage() {
 *   const { variant, config, isControl } = useABTest<CheckoutConfig>(
 *     'checkout-flow-v2',
 *     { userId: currentUser.id }
 *   );
 *
 *   if (!variant) return <DefaultCheckout />;
 *
 *   return isControl ? (
 *     <ControlCheckout />
 *   ) : (
 *     <NewCheckout config={config} />
 *   );
 * }
 * ```
 */
export function useABTest<T extends ConfigRecord = ConfigRecord>(
  testId: string,
  options: UseABTestOptions = {}
): UseABTestResult<T> {
  const { dynamicConfig, isInitialized } = useConfigContext();
  const { userId } = options;

  const variant = useMemo(() => {
    if (!isInitialized) return undefined;
    return dynamicConfig.getVariant(testId, userId);
  }, [dynamicConfig, testId, userId, isInitialized]);

  const config = useMemo(() => {
    if (!isInitialized) return undefined;
    return dynamicConfig.getVariantConfig<T>(testId, userId);
  }, [dynamicConfig, testId, userId, isInitialized]);

  return {
    variant,
    variantId: variant?.id,
    isControl: variant?.isControl ?? false,
    config,
    isLoading: !isInitialized,
  };
}

// =============================================================================
// useFeatureFlagOverride Hook
// =============================================================================

/**
 * Return type for useFeatureFlagOverride hook
 */
export interface UseFeatureFlagOverrideResult {
  /** Current overrides */
  overrides: Record<string, boolean>;
  /** Set an override */
  setOverride: (key: string, value: boolean) => void;
  /** Remove an override */
  removeOverride: (key: string) => void;
  /** Clear all overrides */
  clearOverrides: () => void;
  /** Check if a flag has an override */
  hasOverride: (key: string) => boolean;
}

/**
 * Hook for managing feature flag overrides (development only)
 *
 * Provides controls for overriding feature flags during development.
 *
 * @returns Override management functions
 *
 * @example
 * ```tsx
 * function DevFlagPanel() {
 *   const { overrides, setOverride, clearOverrides } = useFeatureFlagOverride();
 *
 *   return (
 *     <div>
 *       <h3>Flag Overrides</h3>
 *       <button onClick={() => setOverride('new-dashboard', true)}>
 *         Enable New Dashboard
 *       </button>
 *       <button onClick={clearOverrides}>Clear All</button>
 *       <pre>{JSON.stringify(overrides, null, 2)}</pre>
 *     </div>
 *   );
 * }
 * ```
 */
export function useFeatureFlagOverride(): UseFeatureFlagOverrideResult {
  const { dynamicConfig } = useConfigContext();
  const [overrides, setOverrides] = useState<Record<string, boolean>>(() =>
    dynamicConfig.getOverrides()
  );

  const setOverride = useCallback(
    (key: string, value: boolean) => {
      dynamicConfig.setOverride(key, value);
      setOverrides(dynamicConfig.getOverrides());
    },
    [dynamicConfig]
  );

  const removeOverride = useCallback(
    (key: string) => {
      dynamicConfig.removeOverride(key);
      setOverrides(dynamicConfig.getOverrides());
    },
    [dynamicConfig]
  );

  const clearOverrides = useCallback(() => {
    dynamicConfig.clearOverrides();
    setOverrides({});
  }, [dynamicConfig]);

  const hasOverride = useCallback(
    (key: string) => {
      return key in overrides;
    },
    [overrides]
  );

  return {
    overrides,
    setOverride,
    removeOverride,
    clearOverrides,
    hasOverride,
  };
}

// =============================================================================
// useRemoteConfig Hook
// =============================================================================

/**
 * Hook for accessing remote configuration values
 *
 * @param key - Configuration key
 * @param defaultValue - Default value
 * @returns Configuration value
 *
 * @example
 * ```tsx
 * function Banner() {
 *   const bannerText = useRemoteConfig('banner_text', 'Welcome!');
 *   const bannerColor = useRemoteConfig('banner_color', 'blue');
 *
 *   return (
 *     <div style={{ backgroundColor: bannerColor }}>
 *       {bannerText}
 *     </div>
 *   );
 * }
 * ```
 */
export function useRemoteConfig<T extends import('../types').ConfigValue>(key: string, defaultValue: T): T {
  const { dynamicConfig, isInitialized } = useConfigContext();
  const [value, setValue] = useState<T>(defaultValue);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (isInitialized && !initializedRef.current) {
      initializedRef.current = true;
      const config = dynamicConfig.getRuntimeConfig<T>(
        'features' as unknown as import('../types').ConfigNamespace,
        key
      );
      setValue(config ?? defaultValue);
    }
  }, [dynamicConfig, key, defaultValue, isInitialized]);

  return value;
}

export default useDynamicConfig;
