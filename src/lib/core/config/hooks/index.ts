/**
 * @fileoverview React hooks exports for the centralized configuration system.
 *
 * @module core/config/hooks
 */

// Configuration hooks
export {
  // Core config hook
  useLibConfig,

  // Domain-specific hooks
  useNetworkConfig,
  useCacheConfig,
  useFlagsConfig,
  useAuthConfig,
  useLayoutsConfig,
  useVDOMConfig,
  useUIConfig,
  useMonitoringConfig,

  // Path-based hooks
  useLibConfigValue,
  useLibConfigState,

  // Runtime config hooks
  useRuntimeConfig,

  // Change tracking
  useConfigChangeTracking,
  useLastConfigChange,

  // Selectors
  useLibConfigSelector,

  // Utilities
  useLibConfigExists,
  useLibConfigPaths,
  useLibConfigEnvironment,
} from './useLibConfig';

// Endpoint hooks
export {
  // Endpoint access
  useEndpoint,
  useAllEndpoints,
  useEndpointsByTag,

  // URL building
  useEndpointUrl,
  useEndpointUrlBuilder,

  // Health monitoring
  useEndpointHealth,
  useIsEndpointHealthy,
  useUnhealthyEndpoints,
  useDegradedEndpoints,

  // Statistics
  useEndpointStats,

  // Change tracking
  useEndpointChangeTracking,
  useLastEndpointChange,

  // Registration
  useRegisterEndpoint,
  useEndpointRegistry,
} from './useEndpoint';
