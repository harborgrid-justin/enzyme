/**
 * @file Enterprise Configuration Hub
 * @description Unified configuration exports for the entire application.
 *
 * This is the SINGLE entry point for all configuration. Always import from
 * '@/config' to access application constants, settings, and configuration.
 *
 * =============================================================================
 * USAGE EXAMPLES
 * =============================================================================
 *
 * ```typescript
 * import {
 *   // Environment & Validation
 *   env,
 *   validateConfig,
 *
 *   // Routes & Navigation
 *   ROUTES,
 *   buildRoute,
 *   buildRouteWithQuery,
 *
 *   // API & Queries
 *   API_CONFIG,
 *   API_ENDPOINTS,
 *   QUERY_KEYS,
 *
 *   // Timing & Constants
 *   TIMING,
 *   QUERY_STALE_TIMES,
 *
 *   // Storage
 *   STORAGE_KEYS,
 *   getStorageItem,
 *   setStorageItem,
 *
 *   // Design Tokens
 *   COLORS,
 *   SPACING,
 *   STATUS_BADGES,
 *   combineTokens,
 *
 *   // Feature Flags
 *   FEATURES,
 *   featureFlagConfig,
 *
 *   // Auth
 *   authConfig,
 *   hasPermission,
 * } from '@/config';
 * ```
 *
 * =============================================================================
 * ARCHITECTURE
 * =============================================================================
 *
 * The configuration system is organized into these domains:
 *
 * 1. ENVIRONMENT (env.ts, env.schema.ts)
 *    - Runtime environment detection
 *    - Zod schema validation
 *    - Environment variable access
 *
 * 2. ROUTES (routes.registry.ts)
 *    - Type-safe route definitions
 *    - Route building utilities
 *    - Route metadata & breadcrumbs
 *
 * 3. TIMING (timing.constants.ts)
 *    - Query stale/gc times
 *    - API timeouts
 *    - UI debounce/animation
 *    - Polling intervals
 *
 * 4. API (api.config.ts)
 *    - Endpoint definitions
 *    - Query key factories
 *    - Request configuration
 *
 * 5. STORAGE (storage.config.ts)
 *    - LocalStorage keys
 *    - Type-safe storage utilities
 *    - Cache management
 *
 * 6. DESIGN TOKENS (design-tokens.ts)
 *    - Colors, typography, spacing
 *    - Component variants
 *    - Animation utilities
 *
 * 7. APP CONFIG (app.config.ts)
 *    - App metadata
 *    - Feature flags
 *    - Navigation structure
 *
 * 8. AUTH CONFIG (authConfig.ts)
 *    - Roles & permissions
 *    - Auth settings
 *
 * 9. FEATURE FLAGS (featureFlagConfig.ts)
 *    - Remote feature flag integration
 *    - Default values
 *
 * IMPORTANT: Always import from '@/config', never from individual files.
 * This ensures consistent access patterns and enables easier refactoring.
 */

// =============================================================================
// Environment Configuration
// =============================================================================

export {
  env,
  getEnvConfig,
  isEnv,
  inEnv,
  inDev,
  inProd,
  type EnvConfig,
  type Environment,
  type FeatureFlagSource,
  type LogLevel,
} from './env';

export {
  envSchema,
  parseEnv,
  parseEnvOrThrow,
  generateEnvDocs,
  formatEnvErrors,
  isDevelopment,
  isProduction,
  isStaging,
  isDebugMode,
  type RawEnvVars,
  type ValidatedEnvConfig,
  type EnvValidationResult,
} from './env.schema';

// =============================================================================
// Route Configuration
// =============================================================================

export {
  ROUTES,
  ROUTE_METADATA,
  buildRoute,
  buildRouteWithQuery,
  buildFullRoute,
  parseRouteQuery,
  matchesRoute,
  extractParams,
  getRouteMetadata,
  getNavItems,
  buildBreadcrumbs,
  isDynamicRoute,
  isStaticRoute,
  type RoutePath,
  type StaticRoute,
  type DynamicRoute,
  type RouteParams,
  type RouteQueryParams,
  type RouteMetadata,
  type RouteAuthRequirement,
} from './routes.registry';

// =============================================================================
// Timing Configuration
// =============================================================================

export {
  TIMING,
  QUERY_STALE_TIMES,
  QUERY_GC_TIMES,
  API_TIMING,
  AUTH_TIMING,
  UI_TIMING,
  BACKGROUND_TIMING,
  RETRY_CONFIG,
  RATE_LIMIT,
  formatDuration,
  calculateBackoff,
  calculateBackoffWithJitter,
  type QueryStaleTime,
  type QueryGcTime,
  type ApiTimeout,
  type ToastDuration,
  type DebounceDuration,
  type AnimationDuration,
  type PollingInterval,
  type RetryAttempts,
} from './timing.constants';

// =============================================================================
// API Configuration
// =============================================================================

export {
  API_CONFIG,
  API_ENDPOINTS,
  QUERY_KEYS,
  buildApiUrl,
  buildApiUrlWithParams,
  isRetryableStatus,
  isNetworkError,
  type ApiEndpoints,
  type ApiConfig,
  type QueryKeyFactory,
} from './api.config';

// =============================================================================
// Storage Configuration
// =============================================================================

export {
  STORAGE_KEYS,
  getStorageItem,
  setStorageItem,
  removeStorageItem,
  hasStorageItem,
  clearAppStorage,
  clearPrefixedStorage,
  clearAuthStorage,
  clearPreferenceStorage,
  getPrefixedItem,
  setPrefixedItem,
  removePrefixedItem,
  getAllPrefixedItems,
  estimateStorageSize,
  isStorageNearCapacity,
  formatStorageSize,
  type StorageKey,
  type StorageValueMap,
} from './storage.config';

// =============================================================================
// Application Metadata
// =============================================================================

export {
  APP_CONFIG,
  NAV_ITEMS,
  ADMIN_NAV_ITEMS,
  FEATURES,
  type NavItem,
  type FeatureKey,
  type AppConfigType,
} from './app.config';

// =============================================================================
// Feature Flags
// =============================================================================

export {
  featureFlagConfig,
  getDefaultFlagValue,
  getDefaultFlags,
  type FeatureFlagDefinition,
} from './featureFlagConfig';

// =============================================================================
// Auth Configuration
// =============================================================================

export {
  roles,
  permissions,
  rolePermissions,
  roleHierarchy,
  authConfig,
  hasPermission,
  hasMinimumRole,
  getAllPermissions,
} from './authConfig';

// =============================================================================
// Design Tokens
// =============================================================================

export {
  // Color System
  COLORS,
  STATUS_BADGES,
  ICON_CONTAINERS,

  // Layout & Spacing
  SPACING,
  LAYOUTS,
  CONTAINER_WIDTHS,
  ASPECT_RATIOS,

  // Components
  CARDS,
  INPUT_STATES,
  BUTTON_VARIANTS,
  BUTTON_SIZES,

  // Typography
  TYPOGRAPHY,

  // Visual Effects
  ANIMATIONS,
  SHADOWS,
  GRADIENTS,
  OPACITY,
  RADIUS,

  // Layering & Structure
  Z_INDEX,
  BREAKPOINTS,
  RESPONSIVE,

  // UI Patterns
  SKELETON,
  DIVIDERS,
  SCROLLBAR,
  TRUNCATE,

  // States & Accessibility
  A11Y,
  FOCUS_RING,
  STATES,
  PRINT,

  // Utilities
  combineTokens,
  conditionalToken,
  getStatusBadge,
} from './design-tokens';

// =============================================================================
// Runtime Configuration Validation
// =============================================================================

import { env } from './env';
import { parseEnvOrThrow } from './env.schema';

/**
 * Configuration validation status
 */
export interface ConfigValidationResult {
  valid: boolean;
  environment: string;
  version: string;
  errors: string[];
  warnings: string[];
  timestamp: string;
}

/**
 * Validate all configuration at application startup
 *
 * Call this function early in your application bootstrap (e.g., main.tsx)
 * to catch configuration errors before the app renders.
 *
 * @throws Error if critical configuration is invalid
 * @returns Validation result with status and any warnings
 *
 * @example
 * ```typescript
 * // In main.tsx
 * import { validateConfig } from '@/config';
 *
 * const configStatus = validateConfig();
 * if (!configStatus.valid) {
 *   console.error('Configuration errors:', configStatus.errors);
 * }
 * ```
 */
export function validateConfig(): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate environment variables
  try {
    parseEnvOrThrow(import.meta.env);
  } catch (error) {
    if (error instanceof Error) {
      errors.push(error.message);
    }
  }

  // Check for common configuration issues
  if (!env.apiBaseUrl) {
    errors.push('API base URL is not configured');
  }

  // Warn about development-only settings in production
  if (env.isProd) {
    if (env.logLevel === 'debug') {
      warnings.push('Debug logging is enabled in production');
    }
  }

  // Warn about missing optional configs
  if (!env.sentryDsn && env.isProd) {
    warnings.push('Sentry DSN not configured - error reporting disabled');
  }

  return {
    valid: errors.length === 0,
    environment: env.appEnv,
    version: env.appVersion,
    errors,
    warnings,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Initialize configuration with validation
 *
 * Use this for strict validation that throws on any errors.
 * Ideal for production builds where misconfigurations should fail fast.
 *
 * @throws Error if configuration is invalid
 *
 * @example
 * ```typescript
 * // In main.tsx (before React renders)
 * import { initializeConfig } from '@/config';
 *
 * try {
 *   initializeConfig();
 * } catch (error) {
 *   // Show error UI or halt application
 *   document.body.innerHTML = `<pre>Config Error: ${error.message}</pre>`;
 *   throw error;
 * }
 * ```
 */
export function initializeConfig(): void {
  const result = validateConfig();

  if (!result.valid) {
    const errorMessage = [
      '='.repeat(60),
      'CONFIGURATION ERROR',
      '='.repeat(60),
      '',
      'The application failed to start due to configuration errors:',
      '',
      ...result.errors.map((e) => `  * ${e}`),
      '',
      'Please check your environment variables and .env files.',
      '',
      '='.repeat(60),
    ].join('\n');

    throw new Error(errorMessage);
  }

  // Log warnings in development
  if (env.isDev && result.warnings.length > 0) {
    console.group('[Config] Warnings');
    result.warnings.forEach((w) => console.warn(w));
    console.groupEnd();
  }

  // Log successful initialization in development
  if (env.isDev) {
    console.log(
      `[Config] Initialized successfully (${result.environment} v${result.version})`
    );
  }
}

/**
 * Get a diagnostic summary of current configuration
 *
 * Useful for debugging and support tickets.
 * Sensitive values are redacted.
 *
 * @returns Configuration summary object
 */
export function getConfigSummary(): Record<string, unknown> {
  return {
    app: {
      environment: env.appEnv,
      version: env.appVersion,
      name: env.appName,
      isDev: env.isDev,
      isProd: env.isProd,
    },
    api: {
      baseUrl: env.apiBaseUrl,
      timeout: env.apiTimeout,
      retryCount: env.apiRetryCount,
    },
    features: {
      featureFlagsEnabled: env.featureFlagsEnabled,
      featureFlagsSource: env.featureFlagsSource,
      errorReporting: env.enableErrorReporting,
      analytics: env.analyticsEnabled,
    },
    auth: {
      tokenKey: '[REDACTED]',
      refreshInterval: env.authRefreshInterval,
    },
    monitoring: {
      sentryEnabled: !!env.sentryDsn,
      logLevel: env.logLevel,
      performanceMonitoring: env.enablePerformanceMonitoring,
    },
    storage: {
      estimatedSize: typeof window !== 'undefined'
        ? formatStorageSize(estimateStorageSize())
        : 'N/A (SSR)',
    },
  };
}

// =============================================================================
// Security Configuration
// =============================================================================

export {
  securityConfig,
  cspConfig,
  csrfConfig,
  secureStorageConfig,
  SECURITY_TIMING,
  SECURITY_HEADERS,
  ALLOWED_HTML_TAGS,
  ALLOWED_HTML_ATTRIBUTES,
  ALLOWED_URL_SCHEMES,
  isAllowedUrlScheme,
  isAllowedOrigin,
  isCSRFExcludedPath,
  requiresCSRFProtection,
  getSecurityConfigSummary,
  type CSPPolicy,
  type CSPManagerConfig,
  type CSRFConfig,
  type SecureStorageConfig,
  type SecurityConfiguration,
} from './security.config';

// =============================================================================
// Performance Configuration
// =============================================================================

export {
  // Configuration getters
  performanceConfig,
  getPerformanceConfig,
  meetsVitalThreshold,
  getNetworkTier,
  calculateBudgetUsage,
  formatBytes,

  // Constants
  VITAL_THRESHOLDS,
  BUNDLE_BUDGET,
  RUNTIME_BUDGET,
  LONG_TASK_CONFIG,
  MEMORY_CONFIG,
  NETWORK_TIERS,
  RENDER_CONFIG,
  MONITORING_CONFIG,

  // Environment-specific configs
  DEV_PERFORMANCE_CONFIG,
  PROD_PERFORMANCE_CONFIG,
  STAGING_PERFORMANCE_CONFIG,

  // Types
  type PerformanceConfig,
  type VitalMetricThreshold,
  type BundleBudget,
  type RuntimeBudget,
  type LongTaskConfig,
  type MemoryConfig,
  type NetworkTierConfig,
  type RenderConfig,
  type MonitoringConfig,
} from './performance.config';

// =============================================================================
// Re-export Type Helpers
// =============================================================================

/**
 * @deprecated Use RoutePath from routes.registry instead
 */
export type { RoutePath as RouteKey } from './routes.registry';

// =============================================================================
// Module Verification (Development Only)
// =============================================================================

// Verify all modules loaded correctly in development
if (import.meta.env.DEV) {
  const requiredModules = [
    'env',
    'routes.registry',
    'timing.constants',
    'api.config',
    'storage.config',
    'app.config',
    'design-tokens',
    'authConfig',
    'featureFlagConfig',
    'security.config',
    'performance.config',
  ];

  // This is a compile-time check - modules that fail to import will throw
  // before this code runs
  console.debug(`[Config] All ${requiredModules.length} configuration modules loaded`);
}
/**
 * Estimate the total size of localStorage in bytes
 * 
 * Iterates through all localStorage keys and calculates the approximate
 * size of stored data. Used for storage quota monitoring.
 * 
 * @returns Total estimated size in bytes
 */
function estimateStorageSize(): number {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 0;
  }

  let totalSize = 0;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        // Calculate size: key + value in UTF-16 (2 bytes per character)
        totalSize += (key.length + (value?.length || 0)) * 2;
      }
    }
  } catch (error) {
    console.warn('[Storage] Failed to estimate storage size:', error);
    return 0;
  }

  return totalSize;
}

/**
 * Format storage size in human-readable format
 *
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "1.5 MB", "512 KB")
 */
function formatStorageSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`;
}

// =============================================================================
// Configuration Infrastructure (NEW)
// =============================================================================

// Configuration Types
export {
  CONFIG_NAMESPACES,
  createNamespace,
  type ConfigValue,
  type ConfigRecord,
  type ConfigNamespace,
  type ConfigEntry,
  type ConfigEntryMeta,
  type ConfigSource,
  type ConfigEnvironment,
  type ConfigSchema,
  type ConfigChangeEvent,
  type ConfigChangeListener,
  type ConfigUnsubscribe,
  type ConfigSetOptions,
  type ConfigMigration,
  type MigrationResult,
  type DynamicConfigOptions,
  type DynamicConfigState,
  type FeatureFlagConfig,
  type FeatureFlagContext,
  type FeatureFlagResult,
  type ABTestConfig,
  type ABTestVariant,
  type DeepPartial,
  type DeepReadonly,
  type DeepRequired,
} from './types';

// Configuration Registry
export {
  ConfigRegistry,
  getConfigRegistry,
  registerConfig,
  getConfig,
  subscribeToConfig,
  createTypedNamespace,
  type TypedNamespaceAccessor,
} from './config-registry';

// Configuration Validation
export {
  // Schemas
  streamingConfigSchema,
  hydrationConfigSchema,
  layoutsConfigSchema,
  vdomConfigSchema,
  performanceConfigSchema as performanceValidationSchema,
  securityConfigSchema as securityValidationSchema,
  masterConfigSchema,
  // Pre-configured schemas
  STREAMING_CONFIG_SCHEMA,
  HYDRATION_CONFIG_SCHEMA,
  LAYOUTS_CONFIG_SCHEMA,
  VDOM_CONFIG_SCHEMA,
  PERFORMANCE_CONFIG_SCHEMA,
  SECURITY_CONFIG_SCHEMA,
  MASTER_CONFIG_SCHEMA,
  // Utilities
  createConfigSchema,
  validateConfig as validateConfigSchema,
  validateConfigOrThrow,
  formatValidationErrors,
  formatValidationWarnings,
  generateSchemaDocumentation,
  // Types
  type StreamingConfig,
  type HydrationConfig,
  type LayoutsConfig,
  type VDOMConfig,
  type MasterConfig,
  type PriorityLevel,
  type HydrationTrigger,
  type LayoutMode,
} from './config-validation';

// Configuration Discovery
export {
  ConfigDiscovery,
  getConfigDiscovery,
  initializeConfigDiscovery,
  resetConfigDiscovery,
  // Module registration
  registerConfigModule,
  getRegisteredModules,
  clearRegisteredModules,
  // Plugin configuration
  registerPluginConfig,
  getPluginConfig,
  getAllPlugins,
  type PluginConfig,
  // Feature configuration
  registerFeatureConfig,
  getFeatureConfig,
  getAllFeatures,
  isFeatureEnabled,
  type FeatureConfig,
  // Environment config utilities
  loadEnvironmentConfig,
  createEnvConfig,
  autoRegister,
  mergeConfigLayers,
  // Constants
  DEFAULT_CONFIG_PATTERNS,
  DEFAULT_EXCLUDE_PATTERNS,
  ENV_SUFFIXES,
} from './config-discovery';

// Dynamic Configuration
export {
  DynamicConfigManager,
  getDynamicConfig,
  initializeDynamicConfig,
  evaluateFeatureFlag,
  getABTestVariant,
  resetDynamicConfig,
} from './dynamic-config';

// Configuration Provider (React)
export {
  ConfigProvider,
  ConfigContext,
  useConfigContext,
  ConfigReady,
  FeatureFlag,
  ABTest,
  withConfig,
  type ConfigContextValue,
  type ConfigProviderProps,
} from './ConfigProvider';

// Configuration Hooks
export {
  // useConfig
  useConfig,
  useConfigNamespace,
  type UseConfigOptions,
  type UseConfigResult,
  // useConfigValue
  useConfigValue,
  useConfigBoolean,
  useConfigNumber,
  useConfigString,
  useConfigEnum,
  type UseConfigValueOptions,
  type UseConfigValueResult,
  // useDynamicConfig
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
  // useConfigValidation
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
} from './hooks';

// =============================================================================
// Domain Configurations (NEW)
// =============================================================================

// Streaming Configuration
export {
  streamingConfig,
  streaming,
  initializeStreamingConfig,
  STREAM_PRIORITIES,
  getStreamTimingByPriority,
  isStreamingEnabled,
  getBufferConfig,
  getErrorHandlingConfig,
  type StreamPriority,
} from './streaming.config';

// Hydration Configuration
export {
  hydrationConfig,
  hydration,
  initializeHydrationConfig,
  HYDRATION_PRESETS,
  isHydrationEnabled,
  getSchedulerConfig,
  getVisibilityConfig,
  getInteractionConfig,
  getMetricsConfig,
  getOptimalBatchSize,
  getHydrationPreset,
  type HydrationPreset,
} from './hydration.config';

// Layouts Configuration
export {
  layoutsConfig,
  layouts,
  initializeLayoutsConfig,
  getCurrentBreakpoint,
  matchesBreakpoint,
  MORPH_PRESETS,
  getMorphPreset,
  LAYOUT_MODES,
  isAdaptiveEnabled,
  isMorphingEnabled,
  isCLSGuardEnabled,
  isContextEnabled,
  getResizeDebounce,
  getDefaultAspectRatio,
  getMorphTransition,
  shouldRespectReducedMotion,
  prefersReducedMotion,
  getEffectiveAnimationDuration,
  type Breakpoint,
  type MorphPreset,
} from './layouts.config';

// VDOM Configuration
export {
  vdomConfig,
  vdom,
  initializeVDOMConfig,
  DIFF_ALGORITHMS,
  getDiffAlgorithm,
  BOUNDARY_STRATEGIES,
  isVDOMEnabled,
  isPoolingEnabled,
  getPoolSize,
  getGCInterval,
  getMemoryLimit,
  getMaxModuleSize,
  isBatchingEnabled,
  getMaxBatchSize,
  isSandboxEnabled,
  isCSPIntegrationEnabled,
  isXSSPreventionEnabled,
  MEMORY_PRESSURE,
  getMemoryPressure,
  getAdjustedPoolSize,
  shouldTriggerGC,
  getOptimalBatchConfig,
  type DiffAlgorithm,
  type BoundaryStrategy,
  type MemoryPressure,
} from './vdom.config';
