/**
 * @file Unified Route Registry
 * @description Centralized route management with type-safe navigation, prefetching, and analytics
 */

import type { ComponentType, LazyExoticComponent } from 'react';
import type {
  DiscoveredRoute,
  RouteMetadata,
  RouteAccessConfig,
  RoutePrefetchConfig,
  RouteAnalyticsEvent,
  TypedNavigationOptions,
  NavigationResult,
  RouteParams,
} from './types';
import { generateRouteId, extractParamNames } from './scanner';
import { buildRoutePath } from './route-builder';
import { parsePathParams as coreParsePathParams } from './core/path-utils';

// =============================================================================
// Registry Types
// =============================================================================

/**
 * Registered route entry with all metadata
 */
export interface RegisteredRoute<TPath extends string = string> {
  /** Unique route ID */
  readonly id: string;
  /** URL path pattern */
  readonly path: TPath;
  /** Display name for UI */
  readonly displayName: string;
  /** Source file path */
  readonly sourceFile: string;
  /** Route metadata */
  readonly meta: RouteMetadata;
  /** Access control */
  readonly access: RouteAccessConfig;
  /** Prefetch configuration */
  readonly prefetch: RoutePrefetchConfig;
  /** Parameter names */
  readonly paramNames: readonly string[];
  /** Lazy component */
  readonly component?: LazyExoticComponent<ComponentType<unknown>>;
  /** Preload function */
  readonly preload?: () => Promise<unknown>;
  /** Data loader keys for prefetching */
  readonly dataLoaderKeys?: readonly unknown[][];
}

/**
 * Route registry state
 */
interface RegistryState {
  routes: Map<string, RegisteredRoute>;
  routesByPath: Map<string, RegisteredRoute>;
  prefetchQueue: Set<string>;
  prefetchedRoutes: Set<string>;
  analytics: RouteAnalyticsEvent[];
  listeners: Set<RegistryListener>;
}

/**
 * Registry listener for route changes
 */
export type RegistryListener = (event: RegistryEvent) => void;

/**
 * Registry event types
 */
export type RegistryEvent =
  | { type: 'route_registered'; route: RegisteredRoute }
  | { type: 'route_unregistered'; routeId: string }
  | { type: 'prefetch_started'; routeId: string }
  | { type: 'prefetch_completed'; routeId: string }
  | { type: 'navigation'; path: string; params?: Record<string, string> };

// =============================================================================
// Route Registry Class
// =============================================================================

/**
 * Unified route registry for the application
 */
class RouteRegistry {
  private state: RegistryState = {
    routes: new Map(),
    routesByPath: new Map(),
    prefetchQueue: new Set(),
    prefetchedRoutes: new Set(),
    analytics: [],
    listeners: new Set(),
  };

  // =========================================================================
  // Registration
  // =========================================================================

  /**
   * Register a route in the registry
   */
  register<TPath extends string>(
    route: Omit<RegisteredRoute<TPath>, 'id' | 'prefetch'> & { id?: string; prefetch?: RoutePrefetchConfig }
  ): RegisteredRoute<TPath> {
    const id = route.id ?? this.generateId(route.path);

    const registeredRoute: RegisteredRoute<TPath> = {
      ...route,
      id,
      prefetch: route.prefetch ?? {
        strategy: 'hover',
        priority: 'medium',
        delay: 100,
        includeData: false,
        networkConditions: {
          minQuality: '3g',
          respectDataSaver: true,
        },
      },
    };

    this.state.routes.set(id, registeredRoute as RegisteredRoute);
    this.state.routesByPath.set(route.path, registeredRoute as RegisteredRoute);

    this.emit({ type: 'route_registered', route: registeredRoute as RegisteredRoute });

    return registeredRoute;
  }

  /**
   * Register multiple routes from discovered routes
   */
  registerFromDiscovery(
    routes: DiscoveredRoute[],
    componentMap: Map<string, LazyExoticComponent<ComponentType<unknown>>>,
    preloadMap?: Map<string, () => Promise<unknown>>
  ): RegisteredRoute[] {
    const registered: RegisteredRoute[] = [];

    for (const route of routes) {
      if (route.isLayout) continue;

      const id = generateRouteId(route);
      const component = componentMap.get(route.filePath);
      const preload = preloadMap?.get(route.filePath);

      const registeredRoute = this.register({
        id,
        path: route.urlPath,
        displayName: this.generateDisplayName(route),
        sourceFile: route.filePath,
        meta: {},
        access: { isPublic: true },
        prefetch: {
          strategy: 'hover',
          priority: this.inferPriority(route),
          delay: 100,
          includeData: false,
        },
        paramNames: extractParamNames(route.urlPath),
        component,
        preload,
      });

      registered.push(registeredRoute);
    }

    return registered;
  }

  /**
   * Unregister a route
   */
  unregister(routeId: string): boolean {
    const route = this.state.routes.get(routeId);
    if (!route) return false;

    this.state.routes.delete(routeId);
    this.state.routesByPath.delete(route.path);
    this.state.prefetchQueue.delete(routeId);
    this.state.prefetchedRoutes.delete(routeId);

    this.emit({ type: 'route_unregistered', routeId });

    return true;
  }

  /**
   * Clear all registered routes
   */
  clear(): void {
    const routeIds = Array.from(this.state.routes.keys());
    for (const id of routeIds) {
      this.unregister(id);
    }
  }

  // =========================================================================
  // Lookup
  // =========================================================================

  /**
   * Get a route by ID
   */
  getById(routeId: string): RegisteredRoute | undefined {
    return this.state.routes.get(routeId);
  }

  /**
   * Get a route by path
   */
  getByPath(path: string): RegisteredRoute | undefined {
    return this.state.routesByPath.get(path);
  }

  /**
   * Get all registered routes
   */
  getAll(): RegisteredRoute[] {
    return Array.from(this.state.routes.values());
  }

  /**
   * Get routes matching a filter
   */
  filter(predicate: (route: RegisteredRoute) => boolean): RegisteredRoute[] {
    return this.getAll().filter(predicate);
  }

  /**
   * Find routes by feature
   */
  getByFeature(feature: string): RegisteredRoute[] {
    return this.filter((r) => r.sourceFile.includes(`features/${feature}`));
  }

  /**
   * Get public routes
   */
  getPublicRoutes(): RegisteredRoute[] {
    return this.filter((r) => r.access.isPublic);
  }

  /**
   * Get protected routes
   */
  getProtectedRoutes(): RegisteredRoute[] {
    return this.filter((r) => !r.access.isPublic);
  }

  // =========================================================================
  // Path Building
  // =========================================================================

  /**
   * Build a path with type-safe parameters
   *
   * Delegates to the canonical `buildRoutePath` from `./route-builder`
   * to ensure consistent path building across the application.
   */
  buildPath<TPath extends string>(
    path: TPath,
    params?: RouteParams<TPath>,
    query?: Record<string, string | undefined>
  ): string {
    return buildRoutePath(path, params as Record<string, string>, query);
  }

  /**
   * Match a path against registered routes
   */
  matchPath(pathname: string): {
    route: RegisteredRoute | null;
    params: Record<string, string>;
  } {
    for (const route of this.state.routes.values()) {
      const params = this.extractParams(route.path, pathname);
      if (params !== null) {
        return { route, params };
      }
    }
    return { route: null, params: {} };
  }

  // =========================================================================
  // Prefetching
  // =========================================================================

  /**
   * Queue a route for prefetching
   */
  queuePrefetch(routeId: string): void {
    if (this.state.prefetchedRoutes.has(routeId)) return;
    if (this.state.prefetchQueue.has(routeId)) return;

    this.state.prefetchQueue.add(routeId);
  }

  /**
   * Execute prefetch for a route
   */
  async prefetch(routeId: string): Promise<void> {
    const route = this.state.routes.get(routeId);
    if (!route) return;
    if (this.state.prefetchedRoutes.has(routeId)) return;

    this.emit({ type: 'prefetch_started', routeId });

    try {
      // Prefetch component code
      if (route.preload) {
        await route.preload();
      }

      this.state.prefetchedRoutes.add(routeId);
      this.state.prefetchQueue.delete(routeId);

      this.emit({ type: 'prefetch_completed', routeId });
    } catch (error) {
      console.info(`[RouteRegistry] Prefetch failed for ${routeId}:`, error);
    }
  }

  /**
   * Prefetch by path
   */
  async prefetchByPath(path: string): Promise<void> {
    const route = this.state.routesByPath.get(path);
    if (route) {
      await this.prefetch(route.id);
    }
  }

  /**
   * Process prefetch queue
   */
  async processQueue(maxConcurrent: number = 2): Promise<void> {
    const queue = Array.from(this.state.prefetchQueue);
    const chunks = this.chunkArray(queue, maxConcurrent);

    for (const chunk of chunks) {
      await Promise.all(chunk.map(async (id) => this.prefetch(id)));
    }
  }

  /**
   * Get prefetch status for a route
   */
  isPrefetched(routeId: string): boolean {
    return this.state.prefetchedRoutes.has(routeId);
  }

  /**
   * Clear prefetch cache
   */
  clearPrefetchCache(): void {
    this.state.prefetchedRoutes.clear();
    this.state.prefetchQueue.clear();
  }

  // =========================================================================
  // Analytics
  // =========================================================================

  /**
   * Track a navigation event
   */
  trackNavigation(
    path: string,
    params?: Record<string, string>,
    metadata?: Record<string, unknown>
  ): void {
    const event: RouteAnalyticsEvent = {
      eventType: 'navigation',
      path,
      timestamp: Date.now(),
      metadata: { ...metadata, params },
    };

    this.state.analytics.push(event);
    this.emit({ type: 'navigation', path, params });

    // Trim analytics if too large
    if (this.state.analytics.length > 1000) {
      this.state.analytics = this.state.analytics.slice(-500);
    }
  }

  /**
   * Get navigation analytics
   */
  getAnalytics(): readonly RouteAnalyticsEvent[] {
    return this.state.analytics;
  }

  /**
   * Get navigation history
   */
  getNavigationHistory(limit: number = 50): readonly RouteAnalyticsEvent[] {
    return this.state.analytics
      .filter((e) => e.eventType === 'navigation')
      .slice(-limit);
  }

  /**
   * Get most visited routes
   */
  getMostVisited(limit: number = 10): Array<{ path: string; count: number }> {
    const counts = new Map<string, number>();

    for (const event of this.state.analytics) {
      if (event.eventType === 'navigation') {
        counts.set(event.path, (counts.get(event.path) ?? 0) + 1);
      }
    }

    return Array.from(counts.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  // =========================================================================
  // Event System
  // =========================================================================

  /**
   * Subscribe to registry events
   */
  subscribe(listener: RegistryListener): () => void {
    this.state.listeners.add(listener);
    return () => this.state.listeners.delete(listener);
  }

  /**
   * Emit an event to all listeners
   */
  private emit(event: RegistryEvent): void {
    for (const listener of this.state.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('[RouteRegistry] Listener error:', error);
      }
    }
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  /**
   * Generate a route ID from path
   */
  private generateId(path: string): string {
    if (path === '/') return 'INDEX';

    return path
      .replace(/^\//, '')
      .replace(/\//g, '_')
      .replace(/:/g, 'BY_')
      .replace(/\?/g, '_OPT')
      .replace(/\*/g, 'CATCH_ALL')
      .toUpperCase();
  }

  /**
   * Generate display name from route
   */
  private generateDisplayName(route: DiscoveredRoute): string {
    const lastSegment = route.segments[route.segments.length - 1];

    if (!lastSegment) return 'Unknown';

    if (lastSegment.type === 'index') {
      const parentSegment = route.segments[route.segments.length - 2];
      if (parentSegment) {
        return this.capitalize(parentSegment.name || 'Home');
      }
      return 'Home';
    }

    if (lastSegment.type === 'dynamic') {
      return `${this.capitalize(lastSegment.paramName ?? 'Detail')} Detail`;
    }

    if (lastSegment.type === 'catchAll') {
      return 'Catch All';
    }

    return this.capitalize(lastSegment.name);
  }

  /**
   * Infer prefetch priority from route
   */
  private inferPriority(route: DiscoveredRoute): 'low' | 'medium' | 'high' {
    // Shallow routes are higher priority
    if (route.depth <= 2) return 'high';
    if (route.depth <= 4) return 'medium';
    return 'low';
  }

  /**
   * Capitalize a string
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ');
  }

  /**
   * Extract params from pathname
   *
   * Delegates to core path utilities.
   */
  private extractParams(
    pattern: string,
    pathname: string
  ): Record<string, string> | null {
    // Delegate to core path utilities
    return coreParsePathParams(pattern, pathname);
  }

  /**
   * Chunk array for batch processing
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

/**
 * Global route registry instance
 */
export const routeRegistry = new RouteRegistry();

// =============================================================================
// React Integration Hooks
// =============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Hook for accessing the route registry
 */
export function useRouteRegistry(): RouteRegistry {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    return routeRegistry.subscribe(() => forceUpdate({}));
  }, []);

  return routeRegistry;
}

/**
 * Hook for type-safe navigation with prefetching
 */
export function useTypedNavigate(): {
  navigateTo: <TPath extends string>(
    path: TPath,
    params?: RouteParams<TPath>,
    options?: TypedNavigationOptions & { query?: Record<string, string | undefined> }
  ) => NavigationResult;
  prefetchRoute: (path: string) => void;
  currentPath: string;
  isActive: (path: string) => boolean;
  isActivePrefix: (prefix: string) => boolean;
} {
  const navigate = useNavigate();
  const location = useLocation();

  const navigateTo = useCallback(
    <TPath extends string>(
      path: TPath,
      params?: RouteParams<TPath>,
      options?: TypedNavigationOptions & { query?: Record<string, string | undefined> }
    ): NavigationResult => {
      try {
        const fullPath = routeRegistry.buildPath(path, params, options?.query);

        navigate(fullPath, {
          replace: options?.replace,
          state: options?.state,
          preventScrollReset: options?.preventScrollReset,
        });

        routeRegistry.trackNavigation(fullPath, params as Record<string, string>);

        return { success: true, path: fullPath };
      } catch (error) {
        return {
          success: false,
          path,
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    },
    [navigate]
  );

  const prefetchRoute = useCallback(
    (path: string): void => {
      void routeRegistry.prefetchByPath(path);
    },
    []
  );

  return {
    navigateTo,
    prefetchRoute,
    currentPath: location.pathname,
    isActive: (path: string) => location.pathname === path,
    isActivePrefix: (prefix: string) => location.pathname.startsWith(prefix),
  };
}

/**
 * Hook for prefetching routes on hover/focus
 */
export function usePrefetchHandlers(path: string): {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onFocus: () => void;
} {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlers = useMemo(
    () => ({
      onMouseEnter: () => {
        timeoutRef.current = setTimeout(() => {
          void routeRegistry.prefetchByPath(path);
        }, 100);
      },
      onMouseLeave: () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      },
      onFocus: () => {
        void routeRegistry.prefetchByPath(path);
      },
    }),
    [path]
  );

  return handlers;
}

/**
 * Hook for getting route metadata
 */
export function useRouteMetadata(path: string): RouteMetadata | undefined {
  const registry = useRouteRegistry();
  const route = registry.getByPath(path);
  return route?.meta;
}

/**
 * Hook for getting navigation analytics
 */
export function useNavigationAnalytics(): {
  history: readonly RouteAnalyticsEvent[];
  mostVisited: Array<{ path: string; count: number }>;
  allEvents: readonly RouteAnalyticsEvent[];
} {
  const registry = useRouteRegistry();

  return {
    history: registry.getNavigationHistory(),
    mostVisited: registry.getMostVisited(),
    allEvents: registry.getAnalytics(),
  };
}

// =============================================================================
// Exports
// =============================================================================

export { RouteRegistry };
// Exports moved to avoid conflicts within routing module
