/**
 * @fileoverview Routing feature flags for controlling route behavior.
 *
 * This module provides feature flag integration for the routing layer, enabling
 * dynamic control over routes, layouts, navigation, and prefetching.
 *
 * @module flags/integration/routing-flags
 *
 * @example
 * ```typescript
 * import {
 *   routingFlags,
 *   useRoutingFlagConfig,
 *   createFlaggedRoute,
 * } from '@/lib/flags/integration/routing-flags';
 *
 * // Check routing feature flags
 * if (routingFlags.isPrefetchEnabled()) {
 *   // Enable route prefetching
 * }
 *
 * // Use in component
 * function Navigation() {
 *   const config = useRoutingFlagConfig();
 *   // config.prefetchEnabled, config.lazyLoadEnabled, etc.
 * }
 * ```
 */

import { useMemo, type ComponentType, type ReactNode } from 'react';
import {
  createLibraryIntegration,
  useLibraryFlags,
  integrationRegistry,
  type LibraryIntegration,
} from './library-integration';

// =============================================================================
// Types
// =============================================================================

/**
 * Routing flag keys
 */
export const ROUTING_FLAG_KEYS = {
  /** Enable route prefetching */
  ROUTING_PREFETCH_ENABLED: 'routing-prefetch-enabled',
  /** Enable lazy loading of routes */
  ROUTING_LAZY_LOAD_ENABLED: 'routing-lazy-load-enabled',
  /** Enable predictive navigation */
  ROUTING_PREDICTIVE_ENABLED: 'routing-predictive-enabled',
  /** Enable parallel routes */
  ROUTING_PARALLEL_ENABLED: 'routing-parallel-enabled',
  /** Enable route interception */
  ROUTING_INTERCEPT_ENABLED: 'routing-intercept-enabled',
  /** Enable route analytics */
  ROUTING_ANALYTICS_ENABLED: 'routing-analytics-enabled',
  /** Enable route guards */
  ROUTING_GUARDS_ENABLED: 'routing-guards-enabled',
  /** Enable route transitions */
  ROUTING_TRANSITIONS_ENABLED: 'routing-transitions-enabled',
  /** Enable scroll restoration */
  ROUTING_SCROLL_RESTORE_ENABLED: 'routing-scroll-restore-enabled',
  /** Enable breadcrumbs */
  ROUTING_BREADCRUMBS_ENABLED: 'routing-breadcrumbs-enabled',
  /** Use new router implementation */
  ROUTING_ROUTER_V2: 'routing-router-v2',
  /** Enable route caching */
  ROUTING_CACHE_ENABLED: 'routing-cache-enabled',
  /** Enable error boundaries per route */
  ROUTING_ERROR_BOUNDARIES_ENABLED: 'routing-error-boundaries-enabled',
  /** Enable loading states per route */
  ROUTING_LOADING_STATES_ENABLED: 'routing-loading-states-enabled',
} as const;

export type RoutingFlagKey = (typeof ROUTING_FLAG_KEYS)[keyof typeof ROUTING_FLAG_KEYS];

/**
 * Routing flag configuration
 */
export interface RoutingFlagConfig {
  /** Enable prefetching */
  readonly prefetchEnabled: boolean;
  /** Enable lazy loading */
  readonly lazyLoadEnabled: boolean;
  /** Enable predictive navigation */
  readonly predictiveEnabled: boolean;
  /** Enable parallel routes */
  readonly parallelEnabled: boolean;
  /** Enable route interception */
  readonly interceptEnabled: boolean;
  /** Enable route analytics */
  readonly analyticsEnabled: boolean;
  /** Enable route guards */
  readonly guardsEnabled: boolean;
  /** Enable route transitions */
  readonly transitionsEnabled: boolean;
  /** Enable scroll restoration */
  readonly scrollRestoreEnabled: boolean;
  /** Enable breadcrumbs */
  readonly breadcrumbsEnabled: boolean;
  /** Use router v2 */
  readonly routerV2: boolean;
  /** Enable route caching */
  readonly cacheEnabled: boolean;
  /** Enable error boundaries */
  readonly errorBoundariesEnabled: boolean;
  /** Enable loading states */
  readonly loadingStatesEnabled: boolean;
  /** Index signature for Record<string, unknown> compatibility */
  [key: string]: unknown;
}

/**
 * Flagged route configuration
 */
export interface FlaggedRouteConfig {
  /** Route path */
  readonly path: string;
  /** Feature flag key */
  readonly flagKey: string;
  /** Component when flag is enabled */
  readonly enabledComponent: ComponentType;
  /** Component when flag is disabled */
  readonly fallbackComponent?: ComponentType;
  /** Redirect path when flag is disabled */
  readonly fallbackRedirect?: string;
  /** Layout when flag is enabled */
  readonly enabledLayout?: ComponentType<{ children: ReactNode }>;
  /** Layout when flag is disabled */
  readonly fallbackLayout?: ComponentType<{ children: ReactNode }>;
}

/**
 * Route visibility configuration
 */
export interface RouteVisibilityConfig {
  /** Route path */
  readonly path: string;
  /** Feature flags that control visibility */
  readonly flags: readonly {
    key: string;
    required: boolean;
  }[];
  /** Match strategy */
  readonly strategy: 'all' | 'any';
}

// =============================================================================
// Default Configuration
// =============================================================================

/**
 * Default routing flag configuration
 */
export const DEFAULT_ROUTING_FLAG_CONFIG: RoutingFlagConfig = {
  prefetchEnabled: true,
  lazyLoadEnabled: true,
  predictiveEnabled: false,
  parallelEnabled: false,
  interceptEnabled: false,
  analyticsEnabled: true,
  guardsEnabled: true,
  transitionsEnabled: false,
  scrollRestoreEnabled: true,
  breadcrumbsEnabled: true,
  routerV2: false,
  cacheEnabled: true,
  errorBoundariesEnabled: true,
  loadingStatesEnabled: true,
};

// =============================================================================
// Library Integration
// =============================================================================

/**
 * Create routing flag integration
 */
export function createRoutingFlagIntegration(): LibraryIntegration<RoutingFlagConfig> {
  return createLibraryIntegration<RoutingFlagConfig>({
    libraryId: 'routing',
    defaultConfig: DEFAULT_ROUTING_FLAG_CONFIG,
    flagMappings: {
      [ROUTING_FLAG_KEYS.ROUTING_PREFETCH_ENABLED]: 'prefetchEnabled',
      [ROUTING_FLAG_KEYS.ROUTING_LAZY_LOAD_ENABLED]: 'lazyLoadEnabled',
      [ROUTING_FLAG_KEYS.ROUTING_PREDICTIVE_ENABLED]: 'predictiveEnabled',
      [ROUTING_FLAG_KEYS.ROUTING_PARALLEL_ENABLED]: 'parallelEnabled',
      [ROUTING_FLAG_KEYS.ROUTING_INTERCEPT_ENABLED]: 'interceptEnabled',
      [ROUTING_FLAG_KEYS.ROUTING_ANALYTICS_ENABLED]: 'analyticsEnabled',
      [ROUTING_FLAG_KEYS.ROUTING_GUARDS_ENABLED]: 'guardsEnabled',
      [ROUTING_FLAG_KEYS.ROUTING_TRANSITIONS_ENABLED]: 'transitionsEnabled',
      [ROUTING_FLAG_KEYS.ROUTING_SCROLL_RESTORE_ENABLED]: 'scrollRestoreEnabled',
      [ROUTING_FLAG_KEYS.ROUTING_BREADCRUMBS_ENABLED]: 'breadcrumbsEnabled',
      [ROUTING_FLAG_KEYS.ROUTING_ROUTER_V2]: 'routerV2',
      [ROUTING_FLAG_KEYS.ROUTING_CACHE_ENABLED]: 'cacheEnabled',
      [ROUTING_FLAG_KEYS.ROUTING_ERROR_BOUNDARIES_ENABLED]: 'errorBoundariesEnabled',
      [ROUTING_FLAG_KEYS.ROUTING_LOADING_STATES_ENABLED]: 'loadingStatesEnabled',
    },
    onConfigChange: (config, changedFlags) => {
      console.info('[Routing Flags] Config changed:', changedFlags, config);
    },
  });
}

// Initialize and register the routing integration
const routingIntegration = createRoutingFlagIntegration();
integrationRegistry.register(routingIntegration);

// =============================================================================
// Routing Flag Helpers
// =============================================================================

/**
 * Routing flags helper class
 */
class RoutingFlagsHelper {
  private getFlag: (flagKey: string) => boolean = () => false;

  setFlagGetter(getter: (flagKey: string) => boolean): void {
    this.getFlag = getter;
  }

  isPrefetchEnabled(): boolean {
    return this.getFlag(ROUTING_FLAG_KEYS.ROUTING_PREFETCH_ENABLED);
  }

  isLazyLoadEnabled(): boolean {
    return this.getFlag(ROUTING_FLAG_KEYS.ROUTING_LAZY_LOAD_ENABLED);
  }

  isPredictiveEnabled(): boolean {
    return this.getFlag(ROUTING_FLAG_KEYS.ROUTING_PREDICTIVE_ENABLED);
  }

  isParallelEnabled(): boolean {
    return this.getFlag(ROUTING_FLAG_KEYS.ROUTING_PARALLEL_ENABLED);
  }

  isInterceptEnabled(): boolean {
    return this.getFlag(ROUTING_FLAG_KEYS.ROUTING_INTERCEPT_ENABLED);
  }

  isAnalyticsEnabled(): boolean {
    return this.getFlag(ROUTING_FLAG_KEYS.ROUTING_ANALYTICS_ENABLED);
  }

  isGuardsEnabled(): boolean {
    return this.getFlag(ROUTING_FLAG_KEYS.ROUTING_GUARDS_ENABLED);
  }

  isTransitionsEnabled(): boolean {
    return this.getFlag(ROUTING_FLAG_KEYS.ROUTING_TRANSITIONS_ENABLED);
  }

  isScrollRestoreEnabled(): boolean {
    return this.getFlag(ROUTING_FLAG_KEYS.ROUTING_SCROLL_RESTORE_ENABLED);
  }

  isBreadcrumbsEnabled(): boolean {
    return this.getFlag(ROUTING_FLAG_KEYS.ROUTING_BREADCRUMBS_ENABLED);
  }

  isRouterV2Enabled(): boolean {
    return this.getFlag(ROUTING_FLAG_KEYS.ROUTING_ROUTER_V2);
  }

  isCacheEnabled(): boolean {
    return this.getFlag(ROUTING_FLAG_KEYS.ROUTING_CACHE_ENABLED);
  }

  isErrorBoundariesEnabled(): boolean {
    return this.getFlag(ROUTING_FLAG_KEYS.ROUTING_ERROR_BOUNDARIES_ENABLED);
  }

  isLoadingStatesEnabled(): boolean {
    return this.getFlag(ROUTING_FLAG_KEYS.ROUTING_LOADING_STATES_ENABLED);
  }

  getAllFlags(): Record<RoutingFlagKey, boolean> {
    return {
      [ROUTING_FLAG_KEYS.ROUTING_PREFETCH_ENABLED]: this.isPrefetchEnabled(),
      [ROUTING_FLAG_KEYS.ROUTING_LAZY_LOAD_ENABLED]: this.isLazyLoadEnabled(),
      [ROUTING_FLAG_KEYS.ROUTING_PREDICTIVE_ENABLED]: this.isPredictiveEnabled(),
      [ROUTING_FLAG_KEYS.ROUTING_PARALLEL_ENABLED]: this.isParallelEnabled(),
      [ROUTING_FLAG_KEYS.ROUTING_INTERCEPT_ENABLED]: this.isInterceptEnabled(),
      [ROUTING_FLAG_KEYS.ROUTING_ANALYTICS_ENABLED]: this.isAnalyticsEnabled(),
      [ROUTING_FLAG_KEYS.ROUTING_GUARDS_ENABLED]: this.isGuardsEnabled(),
      [ROUTING_FLAG_KEYS.ROUTING_TRANSITIONS_ENABLED]: this.isTransitionsEnabled(),
      [ROUTING_FLAG_KEYS.ROUTING_SCROLL_RESTORE_ENABLED]: this.isScrollRestoreEnabled(),
      [ROUTING_FLAG_KEYS.ROUTING_BREADCRUMBS_ENABLED]: this.isBreadcrumbsEnabled(),
      [ROUTING_FLAG_KEYS.ROUTING_ROUTER_V2]: this.isRouterV2Enabled(),
      [ROUTING_FLAG_KEYS.ROUTING_CACHE_ENABLED]: this.isCacheEnabled(),
      [ROUTING_FLAG_KEYS.ROUTING_ERROR_BOUNDARIES_ENABLED]: this.isErrorBoundariesEnabled(),
      [ROUTING_FLAG_KEYS.ROUTING_LOADING_STATES_ENABLED]: this.isLoadingStatesEnabled(),
    };
  }
}

/**
 * Global routing flags helper instance
 */
export const routingFlags = new RoutingFlagsHelper();

// =============================================================================
// React Hooks
// =============================================================================

/**
 * Hook to get routing flag configuration
 */
export function useRoutingFlagConfig(): RoutingFlagConfig {
  const config = useLibraryFlags<RoutingFlagConfig>('routing');
  return config ?? DEFAULT_ROUTING_FLAG_CONFIG;
}

/**
 * Hook to check a specific routing flag
 */
export function useRoutingFlag(flagKey: RoutingFlagKey): boolean {
  const config = useRoutingFlagConfig();

  return useMemo(() => {
    switch (flagKey) {
      case ROUTING_FLAG_KEYS.ROUTING_PREFETCH_ENABLED:
        return config.prefetchEnabled;
      case ROUTING_FLAG_KEYS.ROUTING_LAZY_LOAD_ENABLED:
        return config.lazyLoadEnabled;
      case ROUTING_FLAG_KEYS.ROUTING_PREDICTIVE_ENABLED:
        return config.predictiveEnabled;
      case ROUTING_FLAG_KEYS.ROUTING_PARALLEL_ENABLED:
        return config.parallelEnabled;
      case ROUTING_FLAG_KEYS.ROUTING_INTERCEPT_ENABLED:
        return config.interceptEnabled;
      case ROUTING_FLAG_KEYS.ROUTING_ANALYTICS_ENABLED:
        return config.analyticsEnabled;
      case ROUTING_FLAG_KEYS.ROUTING_GUARDS_ENABLED:
        return config.guardsEnabled;
      case ROUTING_FLAG_KEYS.ROUTING_TRANSITIONS_ENABLED:
        return config.transitionsEnabled;
      case ROUTING_FLAG_KEYS.ROUTING_SCROLL_RESTORE_ENABLED:
        return config.scrollRestoreEnabled;
      case ROUTING_FLAG_KEYS.ROUTING_BREADCRUMBS_ENABLED:
        return config.breadcrumbsEnabled;
      case ROUTING_FLAG_KEYS.ROUTING_ROUTER_V2:
        return config.routerV2;
      case ROUTING_FLAG_KEYS.ROUTING_CACHE_ENABLED:
        return config.cacheEnabled;
      case ROUTING_FLAG_KEYS.ROUTING_ERROR_BOUNDARIES_ENABLED:
        return config.errorBoundariesEnabled;
      case ROUTING_FLAG_KEYS.ROUTING_LOADING_STATES_ENABLED:
        return config.loadingStatesEnabled;
      default:
        return false;
    }
  }, [config, flagKey]);
}

// =============================================================================
// Route Management
// =============================================================================

const flaggedRoutes = new Map<string, FlaggedRouteConfig>();
const routeVisibility = new Map<string, RouteVisibilityConfig>();

/**
 * Register a flagged route
 */
export function registerFlaggedRoute(config: FlaggedRouteConfig): void {
  flaggedRoutes.set(config.path, config);
}

/**
 * Get component for a flagged route
 */
export function getFlaggedRouteComponent(
  path: string,
  getFlag: (flagKey: string) => boolean
): ComponentType | null {
  const config = flaggedRoutes.get(path);
  if (!config) return null;

  const isEnabled = getFlag(config.flagKey);
  return isEnabled ? config.enabledComponent : (config.fallbackComponent ?? null);
}

/**
 * Get redirect for a flagged route
 */
export function getFlaggedRouteRedirect(
  path: string,
  getFlag: (flagKey: string) => boolean
): string | null {
  const config = flaggedRoutes.get(path);
  if (!config) return null;

  const isEnabled = getFlag(config.flagKey);
  return !isEnabled ? (config.fallbackRedirect ?? null) : null;
}

/**
 * Register route visibility configuration
 */
export function registerRouteVisibility(config: RouteVisibilityConfig): void {
  routeVisibility.set(config.path, config);
}

/**
 * Check if a route is visible based on flags
 */
export function isRouteVisible(
  path: string,
  getFlag: (flagKey: string) => boolean
): boolean {
  const config = routeVisibility.get(path);
  if (!config) return true;

  if (config.strategy === 'all') {
    return config.flags.every((f) => {
      const flagValue = getFlag(f.key);
      return f.required ? flagValue : true;
    });
  } else {
    return config.flags.some((f) => {
      const flagValue = getFlag(f.key);
      return f.required ? flagValue : true;
    });
  }
}

/**
 * Get all visible routes
 */
export function getVisibleRoutes(
  routes: string[],
  getFlag: (flagKey: string) => boolean
): string[] {
  return routes.filter((path) => isRouteVisible(path, getFlag));
}

/**
 * Clear all registered flagged routes
 */
export function clearFlaggedRoutes(): void {
  flaggedRoutes.clear();
  routeVisibility.clear();
}

// =============================================================================
// Navigation Flag Utilities
// =============================================================================

/**
 * Create flagged navigation links
 */
export function createFlaggedNavLinks(
  links: Array<{
    path: string;
    label: string;
    icon?: ReactNode;
    flagKey?: string;
  }>,
  getFlag: (flagKey: string) => boolean
): Array<{
  path: string;
  label: string;
  icon?: ReactNode;
  visible: boolean;
}> {
  return links.map((link) => ({
    ...link,
    visible: link.flagKey != null && link.flagKey !== '' ? getFlag(link.flagKey) : true,
  }));
}

/**
 * Hook for flagged navigation
 */
export function useFlaggedNavigation(
  links: Array<{
    path: string;
    label: string;
    icon?: ReactNode;
    flagKey?: string;
  }>,
  getFlag: (flagKey: string) => boolean
): Array<{
  path: string;
  label: string;
  icon?: ReactNode;
}> {
  return useMemo(() => {
    return links
      .filter((link) => link.flagKey == null || link.flagKey === '' || getFlag(link.flagKey))
      .map(({ path, label, icon }) => ({ path, label, icon }));
  }, [links, getFlag]);
}

// =============================================================================
// Exports
// =============================================================================

export { routingIntegration };
