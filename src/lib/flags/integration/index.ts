/**
 * @fileoverview Feature flag integration module exports.
 *
 * This module provides comprehensive integration between the feature flag system
 * and all library modules. It enables runtime configuration, conditional loading,
 * analytics bridging, and domain-specific flag controls.
 *
 * @module flags/integration
 *
 * @example
 * ```typescript
 * import {
 *   // Library Integration
 *   LibraryIntegrationProvider,
 *   useLibraryFlags,
 *   createLibraryIntegration,
 *
 *   // Configurable Features
 *   ConfigurableFeaturesProvider,
 *   useConfigurableFeature,
 *   defineFeature,
 *
 *   // Flag-Driven Loading
 *   useFeatureFlaggedModule,
 *   FlaggedModuleLoader,
 *   createFlaggedComponent,
 *
 *   // Analytics Bridge
 *   FlagAnalyticsProvider,
 *   useFlagAnalytics,
 *
 *   // Domain Flags
 *   apiFlags,
 *   routingFlags,
 *   uiFlags,
 *   performanceFlags,
 *
 *   // Universal Wrapper
 *   FlagConfigurable,
 * } from '@/lib/flags/integration';
 *
 * // Use in app
 * function App() {
 *   return (
 *     <LibraryIntegrationProvider getFlag={useFeatureFlag}>
 *       <FlagConfigurable flagKey="new-feature">
 *         <NewFeature />
 *       </FlagConfigurable>
 *     </LibraryIntegrationProvider>
 *   );
 * }
 * ```
 */

// =============================================================================
// Library Integration
// =============================================================================

export {
  // Types
  type LibraryId,
  type FlagMapping,
  type FlagTransformer,
  type LibraryIntegrationConfig,
  type LibraryIntegration,
  type IntegrationMetadata,
  type IntegrationRegistry,
  type LibraryIntegrationContextValue,
  type LibraryIntegrationProviderProps,

  // Factory
  createLibraryIntegration,
  createSimpleIntegration,
  registerIntegrations,
  createFlagImpactReport,

  // Registry
  integrationRegistry,
  getIntegrationRegistry,

  // React Components
  LibraryIntegrationProvider,

  // React Hooks
  useLibraryIntegrationContext,
  useLibraryFlags,
  useLibraryFeature,
  useMultiLibraryFlags,
} from './library-integration';

// =============================================================================
// Configurable Features
// =============================================================================

export {
  // Types
  type FeatureCategory,
  type FeatureStage,
  type FeatureVisibility,
  type FeatureRollout,
  type FeatureDependency,
  type FeatureOverride,
  type FeatureDefinition,
  type FeatureState,
  type ConfigurableFeature,
  type FeatureRegistryInterface,
  type FeatureExport,
  type ConfigurableFeaturesContextValue,
  type ConfigurableFeaturesProviderProps,

  // Registry
  featureRegistry,
  getFeatureRegistry,

  // Factory Functions
  defineFeature,
  registerFeature,
  registerFeatures,
  createOverride,
  featuresFromFlagKeys,
  validateFeatures,

  // React Components
  ConfigurableFeaturesProvider,

  // React Hooks
  useConfigurableFeatures,
  useConfigurableFeature,
  useFeaturesByCategory,
  useFeatureStats,
} from './configurable-features';

// =============================================================================
// Flag-Driven Loading
// =============================================================================

export {
  // Types
  type ModuleLoader,
  type ComponentLoader,
  type ModuleLoadResult,
  type FlaggedModuleConfig,
  type FlaggedComponentProps,
  type ModulePreloadConfig,
  type FlaggedRouteModuleConfig,

  // React Hooks
  useFeatureFlaggedModule,
  useFlaggedLazyComponent,

  // React Components
  FlaggedModuleLoader,
  SuspenseFlaggedLoader,

  // Factory Functions
  createFlaggedComponent,
  createFlaggedComponents,
  createFlaggedRouteLoaders,

  // Preloading
  preloadModule,
  preloadModules,
  createModulePreloadLink,

  // Cache Management
  clearModuleCache,
  getModuleCacheStats,
} from './flag-driven-loading';

// =============================================================================
// Flag Analytics Bridge
// =============================================================================

export {
  // Types
  type FlagExposureEvent,
  type FlagEvaluationEvent,
  type CorrelatedMetric,
  type CorrelatedError,
  type FeatureImpactMetric,
  type AnalyticsDestination,
  type FlagAnalyticsBridgeConfig,
  type FlagAnalyticsBridge,
  type FlagAnalyticsContextValue,
  type FlagAnalyticsProviderProps,

  // Factory
  createAnalyticsBridge,

  // Global Bridge
  getAnalyticsBridge,
  initAnalyticsBridge,
  resetAnalyticsBridge,

  // React Components
  FlagAnalyticsProvider,

  // React Hooks
  useFlagAnalytics,
  useTrackedFeatureFlag,

  // Pre-built Destinations
  createConsoleDestination,
  createLocalStorageDestination,
  createHttpDestination,
} from './flag-analytics-bridge';

// =============================================================================
// API Flags
// =============================================================================

export {
  // Types
  API_FLAG_KEYS,
  type ApiFlagKey,
  type ApiFlagConfig,
  type EndpointFlagConfig,
  type FlaggedRequestOptions,

  // Defaults
  DEFAULT_API_FLAG_CONFIG,

  // Integration
  apiIntegration,
  createApiFlagIntegration,

  // Helpers
  apiFlags,

  // React Hooks
  useApiFlagConfig,
  useApiFlag,
  useFlaggedApiRequest,

  // Endpoint Management
  registerFlaggedEndpoint,
  getFlaggedEndpointUrl,
  getFlaggedEndpointMockData,
  clearFlaggedEndpoints,

  // Client Factory
  createFlaggedFetch,
} from './api-flags';

// =============================================================================
// Routing Flags
// =============================================================================

export {
  // Types
  ROUTING_FLAG_KEYS,
  type RoutingFlagKey,
  type RoutingFlagConfig,
  type FlaggedRouteConfig,
  type RouteVisibilityConfig,

  // Defaults
  DEFAULT_ROUTING_FLAG_CONFIG,

  // Integration
  routingIntegration,
  createRoutingFlagIntegration,

  // Helpers
  routingFlags,

  // React Hooks
  useRoutingFlagConfig,
  useRoutingFlag,
  useFlaggedNavigation,

  // Route Management
  registerFlaggedRoute,
  getFlaggedRouteComponent,
  getFlaggedRouteRedirect,
  registerRouteVisibility,
  isRouteVisible,
  getVisibleRoutes,
  clearFlaggedRoutes,

  // Navigation
  createFlaggedNavLinks,
} from './routing-flags';

// =============================================================================
// UI Flags
// =============================================================================

export {
  // Types
  UI_FLAG_KEYS,
  type UiFlagKey,
  type UiFlagConfig,
  type ComponentVariantConfig,
  type StyleVariantConfig,
  type FlaggedUIComponentProps,

  // Defaults
  DEFAULT_UI_FLAG_CONFIG,

  // Integration
  uiIntegration,
  createUiFlagIntegration,

  // Helpers
  uiFlags,

  // React Hooks
  useUiFlagConfig,
  useUiFlag,
  useAnimationSettings,
  useThemeSettings,
  useComponentVariant,
  useStyleVariant,
  useUiFlagClasses,

  // Component Variants
  registerComponentVariant,
  getComponentVariant,
  registerStyleVariant,
  getStyleVariant,

  // React Components
  FlaggedUIComponent,
  withUiFlag,

  // Utilities
  getUiFlagClasses,
  applyUiFlagsToDocument,
} from './ui-flags';

// =============================================================================
// Performance Flags
// =============================================================================

export {
  // Types
  PERFORMANCE_FLAG_KEYS,
  type PerformanceFlagKey,
  type PerformanceFlagConfig,
  type FlaggedMonitoringConfig,
  type FlaggedOptimizationConfig,
  type DegradationLevel,

  // Defaults
  DEFAULT_PERFORMANCE_FLAG_CONFIG,

  // Integration
  performanceIntegration,
  createPerformanceFlagIntegration,

  // Helpers
  performanceFlags,

  // React Hooks
  usePerformanceFlagConfig,
  usePerformanceFlag,
  useFlaggedMonitoringConfig,
  useFlaggedOptimizationConfig,
  usePerformanceDegradation,

  // Configuration Factories
  getFlaggedMonitoringConfig,
  getFlaggedOptimizationConfig,
  getDegradationConfig,
} from './performance-flags';

// =============================================================================
// FlagConfigurable Component
// =============================================================================

export {
  // Types
  type FlagMetadata,
  type FlagRenderProps,
  type FlagConfigurableProps,
  type FlagConfigurableContextValue,
  type WithFlagConfigurableOptions,
  type FlagConfigurableABProps,
  type FlagConfigurableMultiProps,
  type FlagConfigurableGatedProps,

  // Context
  useFlagConfigurableContext,

  // Components
  FlagConfigurable,
  FlagConfigurableAB,
  FlagConfigurableMulti,
  FlagConfigurableGated,
  FlagConfigurableDebug,
  FlagConfigurableList,

  // HOC
  withFlagConfigurable,
} from './FlagConfigurable';

// =============================================================================
// Unified Initialization
// =============================================================================

import { integrationRegistry } from './library-integration';
import { apiIntegration } from './api-flags';
import { routingIntegration } from './routing-flags';
import { uiIntegration } from './ui-flags';
import { performanceIntegration } from './performance-flags';
import { apiFlags } from './api-flags';
import { routingFlags } from './routing-flags';
import { uiFlags } from './ui-flags';
import { performanceFlags } from './performance-flags';

/**
 * Initialize all library flag integrations
 */
export function initFlagIntegrations(getFlag: (flagKey: string) => boolean): () => void {
  // Set flag getters for all domain helpers
  apiFlags.setFlagGetter(getFlag);
  routingFlags.setFlagGetter(getFlag);
  uiFlags.setFlagGetter(getFlag);
  performanceFlags.setFlagGetter(getFlag);

  // Ensure all integrations are registered
  if (!integrationRegistry.get('api')) {
    integrationRegistry.register(apiIntegration);
  }
  if (!integrationRegistry.get('routing')) {
    integrationRegistry.register(routingIntegration);
  }
  if (!integrationRegistry.get('ui')) {
    integrationRegistry.register(uiIntegration);
  }
  if (!integrationRegistry.get('performance')) {
    integrationRegistry.register(performanceIntegration);
  }

  // Return cleanup function
  return () => {
    integrationRegistry.clear();
  };
}

/**
 * Get all registered library integrations
 */
export function getAllIntegrations(): {
  api: typeof apiIntegration;
  routing: typeof routingIntegration;
  ui: typeof uiIntegration;
  performance: typeof performanceIntegration;
} {
  return {
    api: apiIntegration,
    routing: routingIntegration,
    ui: uiIntegration,
    performance: performanceIntegration,
  };
}

/**
 * Update flags across all integrations
 */
export function updateAllFlags(flags: Record<string, boolean>): void {
  integrationRegistry.updateFlags(flags);
}
