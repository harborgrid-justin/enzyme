/**
 * @file usePrefetchRoute Hook
 * @description Hook for prefetching route data and components
 */

import { useCallback, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Prefetch options
 */
export interface PrefetchOptions {
  /** Delay before prefetching (ms) */
  delay?: number;
  
  /** Only prefetch on hover */
  onHover?: boolean;
  
  /** Stale time for prefetched data (ms) */
  staleTime?: number;
}

/**
 * Route data loader function
 */
export type RouteDataLoader = () => Promise<unknown>;

/**
 * Route prefetch configuration
 */
export interface RoutePrefetchConfig {
  /** Query key for the route data */
  queryKey: readonly unknown[];
  
  /** Data loader function */
  loader: RouteDataLoader;
  
  /** Stale time override */
  staleTime?: number;
}

/**
 * Hook for prefetching route data
 */
export function usePrefetchRoute() {
  const queryClient = useQueryClient();
  const prefetchedRoutes = useRef<Set<string>>(new Set());
  // Track all active timeouts for cleanup on unmount
  const activeTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  // Cleanup all timeouts on unmount
  useEffect(() => {
    const timeouts = activeTimeoutsRef.current;
    return () => {
      timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
      timeouts.clear();
    };
  }, []);

  /**
   * Prefetch route data
   */
  const prefetch = useCallback(
    async (config: RoutePrefetchConfig, options: PrefetchOptions = {}) => {
      const { delay = 0, staleTime = 5 * 60 * 1000 } = options;
      const routeKey = JSON.stringify(config.queryKey);

      // Skip if already prefetched recently
      if (prefetchedRoutes.current.has(routeKey)) {
        return;
      }

      const doPrefetch = async () => {
        try {
          await queryClient.prefetchQuery({
            queryKey: config.queryKey,
            queryFn: config.loader,
            staleTime: config.staleTime ?? staleTime,
          });

          // Mark as prefetched
          prefetchedRoutes.current.add(routeKey);

          // Clear prefetched marker after stale time
          const staleTimeoutId = setTimeout(() => {
            prefetchedRoutes.current.delete(routeKey);
            // Remove from active timeouts after completion
            activeTimeoutsRef.current.delete(staleTimeoutId);
          }, staleTime);
          // Track timeout for cleanup
          activeTimeoutsRef.current.add(staleTimeoutId);
        } catch (error) {
          // Silently fail prefetch - not critical
          console.debug('Route prefetch failed:', error);
        }
      };

      if (delay > 0) {
        const delayTimeoutId = setTimeout(() => {
          doPrefetch();
          // Remove from active timeouts after completion
          activeTimeoutsRef.current.delete(delayTimeoutId);
        }, delay);
        // Track timeout for cleanup
        activeTimeoutsRef.current.add(delayTimeoutId);
      } else {
        await doPrefetch();
      }
    },
    [queryClient]
  );
  
  /**
   * Prefetch multiple routes
   */
  const prefetchMany = useCallback(
    async (configs: RoutePrefetchConfig[], options: PrefetchOptions = {}) => {
      await Promise.all(
        configs.map(async (config) => prefetch(config, options))
      );
    },
    [prefetch]
  );
  
  /**
   * Create hover prefetch handlers
   */
  const createHoverHandlers = useCallback(
    (config: RoutePrefetchConfig, options: PrefetchOptions = {}) => {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      
      return {
        onMouseEnter: () => {
          const delay = options.delay ?? 100;
          timeoutId = setTimeout(() => {
            prefetch(config, { ...options, delay: 0 });
          }, delay);
        },
        onMouseLeave: () => {
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
        },
        onFocus: () => {
          prefetch(config, { ...options, delay: 0 });
        },
      };
    },
    [prefetch]
  );
  
  /**
   * Clear prefetch cache for a route
   */
  const clearPrefetch = useCallback(
    (queryKey: readonly unknown[]) => {
      const routeKey = JSON.stringify(queryKey);
      prefetchedRoutes.current.delete(routeKey);
    },
    []
  );
  
  /**
   * Clear all prefetch cache
   */
  const clearAllPrefetch = useCallback(() => {
    prefetchedRoutes.current.clear();
  }, []);
  
  return {
    prefetch,
    prefetchMany,
    createHoverHandlers,
    clearPrefetch,
    clearAllPrefetch,
  };
}

/**
 * Hook for prefetching on link hover
 */
export function usePrefetchOnHover(
  config: RoutePrefetchConfig,
  options: PrefetchOptions = {}
) {
  const { createHoverHandlers } = usePrefetchRoute();
  return createHoverHandlers(config, options);
}
