/**
 * @file Route Prefetching
 * @description Route-based prefetching for React Router and similar routers.
 * Prefetches route components, data, and assets ahead of navigation.
 *
 * Features:
 * - Route component prefetching
 * - Route data prefetching
 * - Link hover prefetching
 * - Viewport-based route prefetching
 * - Route priority configuration
 * - Navigation prediction
 */

import {
  getIntelligentPrefetchEngine,
  type IntelligentPrefetchEngine,
} from './intelligent-prefetch';
import {
  getPrefetchQueue,
  type PrefetchQueue,
  type PrefetchPriority,
} from './prefetch-queue';

// ============================================================================
// Types
// ============================================================================

/**
 * Route definition for prefetching
 */
export interface PrefetchableRoute {
  path: string;
  component?: () => Promise<unknown>;
  dataLoader?: () => Promise<unknown>;
  assets?: string[];
  priority?: PrefetchPriority;
  prefetchOn?: ('viewport' | 'hover' | 'idle' | 'immediate')[];
  minProbability?: number;
}

/**
 * Route prefetch configuration
 */
export interface RoutePrefetchConfig {
  /** Enable route prefetching */
  enabled: boolean;
  /** Default prefetch triggers */
  defaultTriggers: ('viewport' | 'hover' | 'idle' | 'immediate')[];
  /** Hover delay before prefetch (ms) */
  hoverDelay: number;
  /** Viewport root margin */
  viewportMargin: string;
  /** Enable intelligent prediction */
  intelligentPrefetch: boolean;
  /** Minimum prediction probability */
  minProbability: number;
  /** Maximum concurrent route prefetches */
  maxConcurrent: number;
  /** Cache prefetched components */
  cacheComponents: boolean;
  /** Component cache TTL in ms */
  cacheTTL: number;
  /** Debug mode */
  debug: boolean;
}

/**
 * Route prefetch result
 */
export interface RoutePrefetchResult {
  path: string;
  component: boolean;
  data: boolean;
  assets: string[];
  duration: number;
  cached: boolean;
}

/**
 * Link prefetch handlers
 */
export interface LinkPrefetchHandlers {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onFocus: () => void;
  onBlur: () => void;
  onTouchStart: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: RoutePrefetchConfig = {
  enabled: true,
  defaultTriggers: ['hover', 'viewport'],
  hoverDelay: 100,
  viewportMargin: '200px',
  intelligentPrefetch: true,
  minProbability: 0.5,
  maxConcurrent: 3,
  cacheComponents: true,
  cacheTTL: 5 * 60 * 1000, // 5 minutes
  debug: false,
};

// ============================================================================
// Route Prefetch Manager
// ============================================================================

/**
 * Manages route-based prefetching
 */
export class RoutePrefetchManager {
  private config: RoutePrefetchConfig;
  private routes: Map<string, PrefetchableRoute> = new Map();
  private componentCache: Map<string, { module: unknown; timestamp: number }> = new Map();
  private dataCache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private prefetchedRoutes: Set<string> = new Set();
  private hoverTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private viewportObserver: IntersectionObserver | null = null;
  private observedLinks: Map<Element, string> = new Map();
  private engine: IntelligentPrefetchEngine | null = null;
  private queue: PrefetchQueue;
  private currentPath: string = '';

  constructor(config: Partial<RoutePrefetchConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.queue = getPrefetchQueue({ maxConcurrent: this.config.maxConcurrent });

    if (this.config.intelligentPrefetch) {
      this.engine = getIntelligentPrefetchEngine();
    }

    this.initViewportObserver();
  }

  /**
   * Register routes for prefetching
   */
  registerRoutes(routes: PrefetchableRoute[]): void {
    for (const route of routes) {
      this.routes.set(route.path, {
        ...route,
        prefetchOn: route.prefetchOn || this.config.defaultTriggers,
      });
    }
    this.log(`Registered ${routes.length} routes`);
  }

  /**
   * Register a single route
   */
  registerRoute(route: PrefetchableRoute): void {
    this.routes.set(route.path, {
      ...route,
      prefetchOn: route.prefetchOn || this.config.defaultTriggers,
    });
  }

  /**
   * Unregister a route
   */
  unregisterRoute(path: string): boolean {
    return this.routes.delete(path);
  }

  /**
   * Set current path (for prediction)
   */
  setCurrentPath(path: string): void {
    const previousPath = this.currentPath;
    this.currentPath = path;

    if (this.engine && previousPath) {
      this.engine.recordNavigation({
        from: previousPath,
        to: path,
        duration: 0,
        interactionType: 'programmatic',
      });
    }

    // Trigger prediction-based prefetch
    if (this.config.intelligentPrefetch) {
      this.prefetchPredicted();
    }
  }

  /**
   * Prefetch a specific route
   */
  async prefetchRoute(path: string): Promise<RoutePrefetchResult> {
    const startTime = performance.now();
    const route = this.routes.get(path);

    if (!route) {
      return {
        path,
        component: false,
        data: false,
        assets: [],
        duration: 0,
        cached: false,
      };
    }

    // Check if already prefetched
    if (this.prefetchedRoutes.has(path)) {
      return {
        path,
        component: true,
        data: true,
        assets: route.assets || [],
        duration: 0,
        cached: true,
      };
    }

    this.log(`Prefetching route: ${path}`);

    const results = await Promise.allSettled([
      route.component ? this.prefetchComponent(path, route.component) : null,
      route.dataLoader ? this.prefetchData(path, route.dataLoader) : null,
      route.assets ? this.prefetchAssets(route.assets) : null,
    ]);

    const componentSuccess = results[0]?.status === 'fulfilled';
    const dataSuccess = results[1]?.status === 'fulfilled';
    const assetsPrefetched = route.assets || [];

    this.prefetchedRoutes.add(path);

    const duration = performance.now() - startTime;
    this.log(`Route prefetched: ${path} in ${duration.toFixed(2)}ms`);

    return {
      path,
      component: componentSuccess,
      data: dataSuccess,
      assets: assetsPrefetched,
      duration,
      cached: false,
    };
  }

  /**
   * Get cached component for a route
   */
  getCachedComponent(path: string): unknown | null {
    const cached = this.componentCache.get(path);
    if (!cached) return null;

    // Check TTL
    if (Date.now() - cached.timestamp > this.config.cacheTTL) {
      this.componentCache.delete(path);
      return null;
    }

    return cached.module;
  }

  /**
   * Get cached data for a route
   */
  getCachedData(path: string): unknown | null {
    const cached = this.dataCache.get(path);
    if (!cached) return null;

    // Check TTL
    if (Date.now() - cached.timestamp > this.config.cacheTTL) {
      this.dataCache.delete(path);
      return null;
    }

    return cached.data;
  }

  /**
   * Create prefetch handlers for a link
   */
  createLinkHandlers(path: string): LinkPrefetchHandlers {
    const route = this.routes.get(path);
    const triggers = route?.prefetchOn || this.config.defaultTriggers;

    const shouldPrefetchOnHover = triggers.includes('hover');

    return {
      onMouseEnter: () => {
        if (shouldPrefetchOnHover) {
          this.handleHoverStart(path);
        }
        // Record hover for prediction
        this.engine?.recordHover(path);
      },
      onMouseLeave: () => {
        if (shouldPrefetchOnHover) {
          this.handleHoverEnd(path);
        }
      },
      onFocus: () => {
        if (shouldPrefetchOnHover) {
          this.handleHoverStart(path);
        }
      },
      onBlur: () => {
        if (shouldPrefetchOnHover) {
          this.handleHoverEnd(path);
        }
      },
      onTouchStart: () => {
        if (shouldPrefetchOnHover) {
          // Prefetch immediately on touch
          this.prefetchRoute(path);
        }
      },
    };
  }

  /**
   * Observe a link element for viewport-based prefetching
   */
  observeLink(element: Element, path: string): () => void {
    const route = this.routes.get(path);
    const triggers = route?.prefetchOn || this.config.defaultTriggers;

    if (!triggers.includes('viewport')) {
      return () => {};
    }

    this.observedLinks.set(element, path);
    this.viewportObserver?.observe(element);

    return () => {
      this.observedLinks.delete(element);
      this.viewportObserver?.unobserve(element);
    };
  }

  /**
   * Prefetch all immediate routes
   */
  prefetchImmediateRoutes(): void {
    for (const [path, route] of this.routes.entries()) {
      if (route.prefetchOn?.includes('immediate')) {
        this.prefetchRoute(path);
      }
    }
  }

  /**
   * Prefetch predicted routes
   */
  prefetchPredicted(): void {
    if (!this.engine || !this.currentPath) {
      return;
    }

    const availablePaths = Array.from(this.routes.keys()).filter(
      (path) => path !== this.currentPath && !this.prefetchedRoutes.has(path)
    );

    const prediction = this.engine.predict(this.currentPath, availablePaths);

    for (const candidate of prediction.candidates) {
      const route = this.routes.get(candidate.url);
      const minProbability = route?.minProbability || this.config.minProbability;

      if (candidate.probability >= minProbability) {
        this.log(
          `Predicted route: ${candidate.url} (probability: ${(candidate.probability * 100).toFixed(1)}%)`
        );
        this.prefetchRoute(candidate.url);
      }
    }
  }

  /**
   * Get prefetch statistics
   */
  getStats(): {
    registeredRoutes: number;
    prefetchedRoutes: number;
    cachedComponents: number;
    cachedData: number;
  } {
    return {
      registeredRoutes: this.routes.size,
      prefetchedRoutes: this.prefetchedRoutes.size,
      cachedComponents: this.componentCache.size,
      cachedData: this.dataCache.size,
    };
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.componentCache.clear();
    this.dataCache.clear();
    this.prefetchedRoutes.clear();
    this.log('Caches cleared');
  }

  /**
   * Destroy the manager
   */
  destroy(): void {
    this.clearCache();
    this.viewportObserver?.disconnect();
    this.viewportObserver = null;
    this.observedLinks.clear();

    for (const timer of this.hoverTimers.values()) {
      clearTimeout(timer);
    }
    this.hoverTimers.clear();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async prefetchComponent(
    path: string,
    loader: () => Promise<unknown>
  ): Promise<unknown> {
    // Check cache first
    const cached = this.getCachedComponent(path);
    if (cached) {
      return cached;
    }

    const module = await loader();

    if (this.config.cacheComponents) {
      this.componentCache.set(path, {
        module,
        timestamp: Date.now(),
      });
    }

    return module;
  }

  private async prefetchData(
    path: string,
    loader: () => Promise<unknown>
  ): Promise<unknown> {
    // Check cache first
    const cached = this.getCachedData(path);
    if (cached) {
      return cached;
    }

    const data = await loader();

    this.dataCache.set(path, {
      data,
      timestamp: Date.now(),
    });

    return data;
  }

  private async prefetchAssets(assets: string[]): Promise<void> {
    for (const asset of assets) {
      const type = this.inferAssetType(asset);
      this.queue.enqueue(asset, { type, priority: 'low' });
    }
  }

  private inferAssetType(url: string): 'script' | 'style' | 'image' | 'font' | 'fetch' {
    if (url.match(/\.js(\?|$)/)) return 'script';
    if (url.match(/\.css(\?|$)/)) return 'style';
    if (url.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)(\?|$)/)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|otf|eot)(\?|$)/)) return 'font';
    return 'fetch';
  }

  private handleHoverStart(path: string): void {
    if (this.prefetchedRoutes.has(path)) {
      return;
    }

    // Cancel any existing timer
    const existingTimer = this.hoverTimers.get(path);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.prefetchRoute(path);
      this.hoverTimers.delete(path);
    }, this.config.hoverDelay);

    this.hoverTimers.set(path, timer);
  }

  private handleHoverEnd(path: string): void {
    const timer = this.hoverTimers.get(path);
    if (timer) {
      clearTimeout(timer);
      this.hoverTimers.delete(path);
    }
  }

  private initViewportObserver(): void {
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

    this.viewportObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const path = this.observedLinks.get(entry.target);
            if (path && !this.prefetchedRoutes.has(path)) {
              this.prefetchRoute(path);
            }
          }
        });
      },
      {
        rootMargin: this.config.viewportMargin,
      }
    );
  }

  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      console.log(`[RoutePrefetch] ${message}`, ...args);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let managerInstance: RoutePrefetchManager | null = null;

/**
 * Get or create the global route prefetch manager
 */
export function getRoutePrefetchManager(
  config?: Partial<RoutePrefetchConfig>
): RoutePrefetchManager {
  if (!managerInstance) {
    managerInstance = new RoutePrefetchManager(config);
  }
  return managerInstance;
}

/**
 * Reset the manager instance
 */
export function resetRoutePrefetchManager(): void {
  if (managerInstance) {
    managerInstance.destroy();
    managerInstance = null;
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Prefetch a route by path
 */
export function prefetchRoute(path: string): Promise<RoutePrefetchResult> {
  return getRoutePrefetchManager().prefetchRoute(path);
}

/**
 * Register routes for prefetching
 */
export function registerPrefetchRoutes(routes: PrefetchableRoute[]): void {
  getRoutePrefetchManager().registerRoutes(routes);
}

/**
 * Create link prefetch handlers
 */
export function createRouteLinkHandlers(path: string): LinkPrefetchHandlers {
  return getRoutePrefetchManager().createLinkHandlers(path);
}
