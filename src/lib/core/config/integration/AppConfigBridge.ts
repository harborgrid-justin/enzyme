/**
 * @fileoverview Bridge between library configuration and application configuration.
 *
 * This module provides integration between the lib/core/config system and
 * the application-level @/config system, ensuring consistency and allowing
 * the library to inherit application-wide settings.
 *
 * @module core/config/integration/AppConfigBridge
 */

import type {
  LibraryConfig,
  DeepPartial,
  NetworkConfig,
  CacheConfig,
} from '../types';

import { getConfigRegistry } from '../registry/ConfigRegistry';
import { getEndpointRegistry } from '../registry/EndpointRegistry';

// =============================================================================
// App Config Types (from @/config)
// =============================================================================

/**
 * Expected shape of app-level environment config.
 *
 * This mirrors the EnvConfig from @/config/env.ts
 */
interface AppEnvConfig {
  apiBaseUrl: string;
  apiTimeout: number;
  apiRetryCount: number;
  apiRetryDelay: number;
  wsUrl: string;
  sseUrl: string;
  wsReconnectInterval: number;
  wsMaxReconnectAttempts: number;
  isDev: boolean;
  isProd: boolean;
  isTest: boolean;
  appEnv: string;
}

/**
 * Expected shape of app-level timing config.
 *
 * This mirrors TIMING from @/config/timing.constants.ts
 */
interface AppTimingConfig {
  API: {
    TIMEOUT: number;
    TIMEOUT_LONG: number;
    TIMEOUT_SHORT: number;
    TIMEOUT_HEALTH: number;
    RETRY_BASE_DELAY: number;
    RETRY_MAX_DELAY: number;
  };
  QUERY: {
    STALE: {
      REALTIME: number;
      SHORT: number;
      MEDIUM: number;
      LONG: number;
      EXTENDED: number;
      STATIC: number;
    };
    GC: {
      SHORT: number;
      MEDIUM: number;
      LONG: number;
    };
  };
  UI: {
    DEBOUNCE: {
      FAST: number;
      INPUT: number;
      FORM: number;
      RESIZE: number;
      SCROLL: number;
    };
    ANIMATION: {
      FAST: number;
      STANDARD: number;
      SLOW: number;
    };
    TOAST: {
      SHORT: number;
      STANDARD: number;
      LONG: number;
    };
    LOADING: {
      SPINNER_DELAY: number;
      MIN_DISPLAY: number;
    };
  };
  RETRY: {
    DEFAULT_ATTEMPTS: number;
    API_ATTEMPTS: number;
    AUTH_ATTEMPTS: number;
  };
}

/**
 * Expected shape of app-level API config.
 *
 * This mirrors API_CONFIG from @/config/api.config.ts
 */
interface AppApiConfig {
  BASE_URL: string;
  TIMEOUT: {
    DEFAULT: number;
    LONG: number;
    SHORT: number;
    HEALTH: number;
  };
  RETRY: {
    ATTEMPTS: number;
    BASE_DELAY: number;
    MAX_DELAY: number;
  };
  PAGINATION: {
    DEFAULT_PAGE: number;
    DEFAULT_PAGE_SIZE: number;
    MAX_PAGE_SIZE: number;
  };
}

// =============================================================================
// Bridge Configuration
// =============================================================================

interface BridgeConfig {
  /** Whether to auto-sync on changes */
  autoSync: boolean;

  /** Whether to override lib defaults with app config */
  overrideDefaults: boolean;

  /** Log sync operations in development */
  debug: boolean;
}

const DEFAULT_BRIDGE_CONFIG: BridgeConfig = {
  autoSync: true,
  overrideDefaults: true,
  debug: false,
};

// =============================================================================
// AppConfigBridge Implementation
// =============================================================================

/**
 * Bridge between library configuration and application configuration.
 *
 * This class synchronizes settings from @/config to the lib/core/config system,
 * ensuring the library uses the same timeouts, base URLs, and settings as the
 * application.
 *
 * @example
 * ```typescript
 * import { env, TIMING, API_CONFIG } from '@/config';
 *
 * // Initialize bridge with app config
 * const bridge = AppConfigBridge.getInstance();
 * bridge.syncFromAppConfig({ env, TIMING, API_CONFIG });
 *
 * // Now library modules use app-level settings
 * ```
 */
export class AppConfigBridge {
  private static instance: AppConfigBridge | null = null;

  private config: BridgeConfig;
  private initialized = false;

  private constructor(config: Partial<BridgeConfig> = {}) {
    this.config = { ...DEFAULT_BRIDGE_CONFIG, ...config };
  }

  /**
   * Get the singleton instance.
   */
  static getInstance(config?: Partial<BridgeConfig>): AppConfigBridge {
    AppConfigBridge.instance ??= new AppConfigBridge(config);
    return AppConfigBridge.instance;
  }

  /**
   * Reset the singleton instance (for testing).
   */
  static resetInstance(): void {
    AppConfigBridge.instance = null;
  }

  // ===========================================================================
  // Synchronization
  // ===========================================================================

  /**
   * Synchronize library configuration from application configuration.
   */
  syncFromAppConfig(appConfig: {
    env?: Partial<AppEnvConfig>;
    TIMING?: Partial<AppTimingConfig>;
    API_CONFIG?: Partial<AppApiConfig>;
  }): void {
    const { env, TIMING, API_CONFIG } = appConfig;
    const registry = getConfigRegistry();
    const endpointRegistry = getEndpointRegistry();

    const overlay: Partial<{
      network: unknown;
      cache: unknown;
      ui: unknown;
    }> = {};

    // Sync from env config
    if (env !== undefined && env !== null) {
      overlay.network = this.mapEnvToNetworkConfig(env);

      // Set endpoint registry base URL
      if (env.apiBaseUrl) {
        endpointRegistry.setBaseUrl(env.apiBaseUrl);
      }
    }

    // Sync from TIMING config
    if (TIMING !== undefined && TIMING !== null) {
      const networkFromTiming = this.mapTimingToNetworkConfig(TIMING);
      const cacheFromTiming = this.mapTimingToCacheConfig(TIMING);
      const uiFromTiming = this.mapTimingToUIConfig(TIMING);

      overlay.network = { ...(overlay.network as Record<string, unknown>), ...networkFromTiming };
      overlay.cache = cacheFromTiming;
      overlay.ui = uiFromTiming;
    }

    // Sync from API_CONFIG
    if (API_CONFIG !== undefined && API_CONFIG !== null) {
      const networkFromApi = this.mapApiConfigToNetworkConfig(API_CONFIG);
      overlay.network = { ...(overlay.network as Record<string, unknown>), ...networkFromApi };

      // Set endpoint registry base URL
      if (API_CONFIG.BASE_URL) {
        endpointRegistry.setBaseUrl(API_CONFIG.BASE_URL);
      }
    }

    // Apply overlay to registry
    if (Object.keys(overlay).length > 0) {
      registry.applyOverlay(overlay, 'environment');
    }

    this.initialized = true;

    if (this.config.debug) {
      console.log('[AppConfigBridge] Synced from app config:', overlay);
    }
  }

  /**
   * Synchronize a specific domain from app config.
   */
  syncDomain(domain: 'network' | 'cache' | 'ui', config: object): void {
    const registry = getConfigRegistry();
    const overlay: DeepPartial<LibraryConfig> = { [domain]: config };
    registry.applyOverlay(overlay, 'environment');
  }

  /**
   * Check if bridge has been initialized.
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  // ===========================================================================
  // Mapping Functions
  // ===========================================================================

  private mapEnvToNetworkConfig(env: Partial<AppEnvConfig>): Partial<NetworkConfig> {
    const config: any = {};

    if (env.apiTimeout !== undefined) {
      config.defaultTimeout = env.apiTimeout;
    }

    if (env.apiRetryCount !== undefined) {
      config.maxRetryAttempts = env.apiRetryCount;
    }

    if (env.apiRetryDelay !== undefined) {
      config.retryBaseDelay = env.apiRetryDelay;
    }

    if (env.wsReconnectInterval !== undefined) {
      config.websocketReconnectDelay = env.wsReconnectInterval;
    }

    if (env.wsMaxReconnectAttempts !== undefined) {
      config.websocketMaxReconnectAttempts = env.wsMaxReconnectAttempts;
    }

    return config;
  }

  private mapTimingToNetworkConfig(timing: Partial<AppTimingConfig>): Partial<NetworkConfig> {
    const config: any = {};
    const api = timing.API;

    if (api) {
      if (api.TIMEOUT !== undefined) config.defaultTimeout = api.TIMEOUT;
      if (api.TIMEOUT_LONG !== undefined) config.longTimeout = api.TIMEOUT_LONG;
      if (api.TIMEOUT_SHORT !== undefined) config.shortTimeout = api.TIMEOUT_SHORT;
      if (api.TIMEOUT_HEALTH !== undefined) config.healthCheckTimeout = api.TIMEOUT_HEALTH;
      if (api.RETRY_BASE_DELAY !== undefined) config.retryBaseDelay = api.RETRY_BASE_DELAY;
      if (api.RETRY_MAX_DELAY !== undefined) config.retryMaxDelay = api.RETRY_MAX_DELAY;
    }

    if (timing.RETRY?.API_ATTEMPTS !== undefined) {
      config.maxRetryAttempts = timing.RETRY.API_ATTEMPTS;
    }

    return config;
  }

  private mapTimingToCacheConfig(timing: Partial<AppTimingConfig>): Partial<CacheConfig> {
    const config: Partial<CacheConfig> = {};
    const stale = timing.QUERY?.STALE;
    const gc = timing.QUERY?.GC;

    if (stale) {
      if (stale.SHORT !== undefined) (config as any).shortTTL = stale.SHORT;
      if (stale.MEDIUM !== undefined) (config as any).defaultTTL = stale.MEDIUM;
      if (stale.LONG !== undefined) (config as any).longTTL = stale.LONG;
      if (stale.EXTENDED !== undefined) (config as any).extendedTTL = stale.EXTENDED;
    }

    if (gc) {
      if (gc.MEDIUM !== undefined) (config as any).gcInterval = gc.MEDIUM;
    }

    return config;
  }

  private mapTimingToUIConfig(timing: Partial<AppTimingConfig>) {
    const config: Record<string, number | undefined> = {};
    const debounce = timing.UI?.DEBOUNCE;
    const animation = timing.UI?.ANIMATION;
    const toast = timing.UI?.TOAST;
    const loading = timing.UI?.LOADING;

    if (debounce) {
      if (debounce.INPUT !== undefined) config.inputDebounce = debounce.INPUT;
      if (debounce.FORM !== undefined) config.formDebounce = debounce.FORM;
      if (debounce.RESIZE !== undefined) config.resizeDebounce = debounce.RESIZE;
      if (debounce.SCROLL !== undefined) config.scrollThrottle = debounce.SCROLL;
    }

    if (animation) {
      if (animation.FAST !== undefined) config.animationFast = animation.FAST;
      if (animation.STANDARD !== undefined) config.animationStandard = animation.STANDARD;
      if (animation.SLOW !== undefined) config.animationSlow = animation.SLOW;
    }

    if (toast?.STANDARD !== undefined) {
      config.toastDuration = toast.STANDARD;
    }

    if (loading) {
      if (loading.SPINNER_DELAY !== undefined) config.spinnerDelay = loading.SPINNER_DELAY;
      if (loading.MIN_DISPLAY !== undefined) config.skeletonMinDisplay = loading.MIN_DISPLAY;
    }

    return config;
  }

  private mapApiConfigToNetworkConfig(apiConfig: Partial<AppApiConfig>): Partial<NetworkConfig> {
    const config: Partial<NetworkConfig> = {};

    if (apiConfig.TIMEOUT) {
      if (apiConfig.TIMEOUT.DEFAULT !== undefined) (config as any).defaultTimeout = apiConfig.TIMEOUT.DEFAULT;
      if (apiConfig.TIMEOUT.LONG !== undefined) (config as any).longTimeout = apiConfig.TIMEOUT.LONG;
      if (apiConfig.TIMEOUT.SHORT !== undefined) (config as any).shortTimeout = apiConfig.TIMEOUT.SHORT;
      if (apiConfig.TIMEOUT.HEALTH !== undefined) (config as any).healthCheckTimeout = apiConfig.TIMEOUT.HEALTH;
    }

    if (apiConfig.RETRY) {
      if (apiConfig.RETRY.ATTEMPTS !== undefined) (config as any).maxRetryAttempts = apiConfig.RETRY.ATTEMPTS;
      if (apiConfig.RETRY.BASE_DELAY !== undefined) (config as any).retryBaseDelay = apiConfig.RETRY.BASE_DELAY;
      if (apiConfig.RETRY.MAX_DELAY !== undefined) (config as any).retryMaxDelay = apiConfig.RETRY.MAX_DELAY;
    }

    return config;
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Get the AppConfigBridge singleton instance.
 */
export function getAppConfigBridge(): AppConfigBridge {
  return AppConfigBridge.getInstance();
}

/**
 * Initialize the library config from app config.
 *
 * This is the main entry point for bridging app config to library config.
 *
 * @example
 * ```typescript
 * // In your app initialization
 * import { env, TIMING, API_CONFIG } from '@/config';
 * import { initLibConfigFromApp } from '@/lib/core/config';
 *
 * initLibConfigFromApp({ env, TIMING, API_CONFIG });
 * ```
 */
export function initLibConfigFromApp(appConfig: {
  env?: Partial<AppEnvConfig>;
  TIMING?: Partial<AppTimingConfig>;
  API_CONFIG?: Partial<AppApiConfig>;
}): void {
  getAppConfigBridge().syncFromAppConfig(appConfig);
}
