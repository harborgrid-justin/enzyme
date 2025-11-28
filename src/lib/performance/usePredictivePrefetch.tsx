/**
 * @file Predictive Prefetch React Hook
 * @description React hook for integrating predictive prefetching with react-router.
 * Automatically tracks navigation and triggers predictive prefetching.
 *
 * FEATURE 3: Predictive Navigation Prefetching
 */

import { useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  getPredictivePrefetchEngine,
  type PredictivePrefetchConfig,
  type RoutePrediction,
  type PrefetchableRoute,
} from './PredictivePrefetch';

// ============================================================================
// Types
// ============================================================================

/**
 * Options for the predictive prefetch hook
 */
export interface UsePredictivePrefetchOptions {
  /** Enable automatic prefetching after navigation */
  autoPrefetch?: boolean;
  /** Delay before prefetching predicted routes (ms) */
  prefetchDelay?: number;
  /** Enable navigation tracking for learning */
  enableTracking?: boolean;
  /** Engine configuration */
  config?: PredictivePrefetchConfig;
}

/**
 * Return value from usePredictivePrefetch
 */
export interface UsePredictivePrefetchReturn {
  /** Current route predictions */
  predictions: RoutePrediction[];
  /** Manually trigger prefetch for predicted routes */
  prefetchPredicted: () => Promise<void>;
  /** Prefetch a specific route */
  prefetchRoute: (path: string) => Promise<void>;
  /** Register additional prefetchable routes */
  registerRoutes: (routes: PrefetchableRoute[]) => void;
  /** Get analytics about learned patterns */
  getAnalytics: () => {
    totalTransitions: number;
    uniqueRoutes: number;
    timePatterns: number;
    topRoutes: Array<{ route: string; visits: number }>;
  };
  /** Navigate with optimistic prefetching */
  navigateWithPrefetch: (to: string) => void;
  /** Clear all learned patterns */
  clearPatterns: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for predictive prefetching with react-router integration.
 *
 * Automatically tracks navigation patterns and prefetches likely next routes.
 *
 * @example
 * ```tsx
 * function App() {
 *   const { predictions, navigateWithPrefetch } = usePredictivePrefetch();
 *
 *   return (
 *     <nav>
 *       <button onClick={() => navigateWithPrefetch('/dashboard')}>
 *         Dashboard
 *       </button>
 *       {predictions.length > 0 && (
 *         <span>Predicted next: {predictions[0].route}</span>
 *       )}
 *     </nav>
 *   );
 * }
 * ```
 */
export function usePredictivePrefetch(
  options: UsePredictivePrefetchOptions = {}
): UsePredictivePrefetchReturn {
  const {
    autoPrefetch = true,
    prefetchDelay = 500,
    enableTracking = true,
    config,
  } = options;

  const location = useLocation();
  const navigate = useNavigate();
  const prevPathRef = useRef<string>('');
  const prefetchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Get the singleton engine instance
  const engine = useMemo(
    () => getPredictivePrefetchEngine(config),
    [config]
  );

  // Track navigation changes
  useEffect(() => {
    const currentPath = location.pathname;
    const prevPath = prevPathRef.current;

    if (enableTracking && prevPath && prevPath !== currentPath) {
      // Record the navigation for learning
      engine.recordNavigation(prevPath, currentPath);
    }

    // Update previous path
    prevPathRef.current = currentPath;

    // Clear any pending prefetch
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
    }

    // Trigger prefetch after delay
    if (autoPrefetch) {
      prefetchTimeoutRef.current = setTimeout(() => {
        engine.prefetchPredictedRoutes(currentPath);
      }, prefetchDelay);
    }

    // Cleanup timeout on unmount or path change
    return () => {
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
      }
    };
  }, [location.pathname, enableTracking, autoPrefetch, prefetchDelay, engine]);

  // Get current predictions
  const predictions = useMemo(
    () => engine.getPredictions(location.pathname),
    [engine, location.pathname]
  );

  // Manually trigger prefetch
  const prefetchPredicted = useCallback(async () => {
    await engine.prefetchPredictedRoutes(location.pathname);
  }, [engine, location.pathname]);

  // Prefetch a specific route
  const prefetchRoute = useCallback(
    async (path: string) => {
      await engine.prefetchRoute(path);
    },
    [engine]
  );

  // Register additional routes
  const registerRoutes = useCallback(
    (routes: PrefetchableRoute[]) => {
      engine.registerRoutes(routes);
    },
    [engine]
  );

  // Get analytics
  const getAnalytics = useCallback(() => {
    return engine.getAnalytics();
  }, [engine]);

  // Navigate with optimistic prefetching
  const navigateWithPrefetch = useCallback(
    (to: string) => {
      // Start prefetching immediately
      engine.prefetchRoute(to);
      // Navigate
      navigate(to);
    },
    [engine, navigate]
  );

  // Clear patterns
  const clearPatterns = useCallback(() => {
    engine.clearPatterns();
  }, [engine]);

  return {
    predictions,
    prefetchPredicted,
    prefetchRoute,
    registerRoutes,
    getAnalytics,
    navigateWithPrefetch,
    clearPatterns,
  };
}

// ============================================================================
// Convenience Components
// ============================================================================

/**
 * Props for PredictiveLink component
 */
export interface PredictiveLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Target route */
  to: string;
  /** Prefetch strategy */
  prefetchStrategy?: 'hover' | 'viewport' | 'immediate' | 'none';
  /** Custom loader for code splitting */
  loader?: () => Promise<unknown>;
  /** Children */
  children: React.ReactNode;
}

/**
 * Get current network quality for adaptive prefetching
 */
function shouldPrefetch(): boolean {
  const nav = navigator as Navigator & {
    connection?: { effectiveType?: string; saveData?: boolean };
  };

  // Don't prefetch on slow connections or data saver mode
  if (nav.connection?.saveData) return false;
  if (nav.connection?.effectiveType === 'slow-2g') return false;
  if (nav.connection?.effectiveType === '2g') return false;

  return true;
}

/**
 * Link component with predictive prefetching.
 * Prefetches the route on hover, focus, or when entering viewport.
 *
 * @example
 * ```tsx
 * <PredictiveLink to="/dashboard" prefetchStrategy="hover">
 *   Go to Dashboard
 * </PredictiveLink>
 * ```
 */
export function PredictiveLink({
  to,
  prefetchStrategy = 'hover',
  loader,
  children,
  ...props
}: PredictiveLinkProps): JSX.Element {
  const navigate = useNavigate();
  const engine = useMemo(() => getPredictivePrefetchEngine(), []);
  const elementRef = useRef<HTMLAnchorElement>(null);
  const hasPrefetchedRef = useRef(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Trigger prefetch
  const triggerPrefetch = useCallback(() => {
    if (hasPrefetchedRef.current || !shouldPrefetch()) return;
    hasPrefetchedRef.current = true;

    // Prefetch module if provided
    if (loader) {
      loader().catch(() => {});
    }

    // Prefetch via engine
    engine.prefetchRoute(to);
  }, [to, loader, engine]);

  // Handle click
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      props.onClick?.(e);
      navigate(to);
    },
    [to, navigate, props]
  );

  // Hover handlers
  const handleMouseEnter = useCallback(() => {
    if (prefetchStrategy === 'hover') {
      // Small delay to avoid prefetching on accidental hovers
      hoverTimeoutRef.current = setTimeout(triggerPrefetch, 100);
    }
  }, [prefetchStrategy, triggerPrefetch]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  }, []);

  // Focus handler
  const handleFocus = useCallback(() => {
    if (prefetchStrategy === 'hover') {
      triggerPrefetch();
    }
  }, [prefetchStrategy, triggerPrefetch]);

  // Immediate prefetch
  useEffect(() => {
    if (prefetchStrategy === 'immediate') {
      triggerPrefetch();
    }
  }, [prefetchStrategy, triggerPrefetch]);

  // Viewport-based prefetch
  useEffect(() => {
    if (prefetchStrategy !== 'viewport' || !elementRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          triggerPrefetch();
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    observer.observe(elementRef.current);

    return () => observer.disconnect();
  }, [prefetchStrategy, triggerPrefetch]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return (
    <a
      ref={elementRef}
      href={to}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      {...props}
    >
      {children}
    </a>
  );
}

export default usePredictivePrefetch;
