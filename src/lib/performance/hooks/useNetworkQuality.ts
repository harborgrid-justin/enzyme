/**
 * @file useNetworkQuality Hook
 * @description React hook for monitoring network quality and adapting behavior.
 *
 * Provides components with real-time network quality information, enabling
 * adaptive loading strategies based on connection speed and type.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const {
 *     quality,
 *     isSlowConnection,
 *     loadingStrategy,
 *     shouldPrefetch
 *   } = useNetworkQuality();
 *
 *   // Adapt image loading based on network
 *   const imageQuality = loadingStrategy.imageQuality;
 *
 *   return (
 *     <Image
 *       src={getImageUrl(imageQuality)}
 *       loading={isSlowConnection ? 'lazy' : 'eager'}
 *     />
 *   );
 * }
 * ```
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getNetworkAnalyzer,
  type NetworkPerformanceAnalyzer,
  type NetworkQuality,
  type RequestTiming,
  type NetworkStats,
  type EffectiveConnectionType,
  type ConnectionType,
} from '../network-performance';
import { type NetworkTierConfig } from '../../../config/performance.config';

// ============================================================================
// Types
// ============================================================================

/**
 * Adaptive loading strategy
 */
export interface AdaptiveLoadingStrategy {
  /** Recommended image quality */
  readonly imageQuality: 'high' | 'medium' | 'low' | 'placeholder';
  /** Prefetch strategy */
  readonly prefetchStrategy: 'aggressive' | 'moderate' | 'conservative' | 'none';
  /** Should reduce motion/animations */
  readonly shouldReduceMotion: boolean;
  /** Should defer non-critical resources */
  readonly shouldDeferNonCritical: boolean;
  /** Maximum concurrent requests */
  readonly maxConcurrentRequests: number;
}

/**
 * Hook options
 */
export interface UseNetworkQualityOptions {
  /** Callback on quality change */
  readonly onQualityChange?: (quality: NetworkQuality) => void;
  /** Callback on slow request */
  readonly onSlowRequest?: (request: RequestTiming) => void;
  /** Slow connection threshold (score 0-100) */
  readonly slowConnectionThreshold?: number;
  /** Enable debug logging */
  readonly debug?: boolean;
}

/**
 * Hook return value
 */
export interface UseNetworkQualityReturn {
  /** Current network quality */
  readonly quality: NetworkQuality | null;
  /** Effective connection type */
  readonly effectiveType: EffectiveConnectionType;
  /** Connection type */
  readonly connectionType: ConnectionType;
  /** Estimated downlink speed (Mbps) */
  readonly downlink: number;
  /** Round-trip time (ms) */
  readonly rtt: number;
  /** Data saver enabled */
  readonly saveData: boolean;
  /** Overall quality score (0-100) */
  readonly score: number;
  /** Network tier configuration */
  readonly tier: NetworkTierConfig | null;
  /** Whether on slow connection */
  readonly isSlowConnection: boolean;
  /** Whether connection is metered */
  readonly isMetered: boolean;
  /** Whether offline */
  readonly isOffline: boolean;
  /** Adaptive loading strategy */
  readonly loadingStrategy: AdaptiveLoadingStrategy;
  /** Whether should prefetch */
  readonly shouldPrefetch: boolean;
  /** Network statistics */
  readonly stats: NetworkStats | null;
  /** Estimated bandwidth (bytes/sec) */
  readonly estimatedBandwidth: number;
  /** Force refresh quality */
  readonly refresh: () => void;
  /** Get priority recommendation for a resource */
  readonly getPriority: (url: string, type: string, options?: {
    isAboveFold?: boolean;
    isLCP?: boolean;
    isInteractive?: boolean;
  }) => 'highest' | 'high' | 'normal' | 'low' | 'lowest';
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for network quality monitoring
 */
export function useNetworkQuality(
  options: UseNetworkQualityOptions = {}
): UseNetworkQualityReturn {
  const {
    onQualityChange,
    onSlowRequest,
    slowConnectionThreshold = 50,
    debug = false,
  } = options;

  // State
  const [quality, setQuality] = useState<NetworkQuality | null>(null);

  // Get analyzer instance (lazy initialization)
  const [analyzer] = useState<NetworkPerformanceAnalyzer>(() => getNetworkAnalyzer({
    debug,
    onQualityChange: (quality) => {
      setQuality(quality);
      onQualityChange?.(quality);
    },
    onSlowRequest: (request) => {
      onSlowRequest?.(request);
    },
  }));
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [stats, setStats] = useState<NetworkStats | null>(null);

  // Initialize quality
  useEffect(() => {
    const initialQuality = analyzer.getQuality();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuality(initialQuality);
    setStats(analyzer.getStats());

    // Poll for stats updates
    const intervalId = setInterval(() => {
      setQuality(analyzer.getQuality());
      setStats(analyzer.getStats());
    }, 5000);

    return () => clearInterval(intervalId);
  }, [analyzer]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = (): void => {
      setIsOffline(false);
      if (debug) {
        console.info('[useNetworkQuality] Connection restored');
      }
    };

    const handleOffline = (): void => {
      setIsOffline(true);
      if (debug) {
        console.info('[useNetworkQuality] Connection lost');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [debug]);

  // Refresh quality
  const refresh = useCallback(() => {
    const newQuality = analyzer.getQuality();
    setQuality(newQuality);
    setStats(analyzer.getStats());
  }, [analyzer]);

  // Get loading strategy
  const loadingStrategy = useMemo<AdaptiveLoadingStrategy>(() => {
    return analyzer.getLoadingStrategy();
  }, [analyzer]); // Re-compute when analyzer changes

  // Get priority recommendation
  const getPriority = useCallback(
    (
      url: string,
      type: string,
      options?: {
        isAboveFold?: boolean;
        isLCP?: boolean;
        isInteractive?: boolean;
      }
    ) => {
      const recommendation = analyzer.getPriorityRecommendation(url, type, options);
      return recommendation.recommendedPriority;
    },
    [analyzer]
  );

  // Derived values
  const effectiveType: EffectiveConnectionType = quality?.effectiveType ?? '4g';
  const connectionType: ConnectionType = quality?.type ?? 'unknown';
  const downlink = quality?.downlink ?? 10;
  const rtt = quality?.rtt ?? 50;
  const saveData = quality?.saveData ?? false;
  const score = quality?.score ?? 100;
  const tier = quality?.tier ?? null;
  const isSlowConnection = score < slowConnectionThreshold || effectiveType === 'slow-2g' || effectiveType === '2g';
  const isMetered = quality?.isMetered ?? false;
  const shouldPrefetch = loadingStrategy.prefetchStrategy !== 'none' && !isOffline && !saveData;
  const estimatedBandwidth = analyzer.getEstimatedBandwidth();

  return {
    quality,
    effectiveType,
    connectionType,
    downlink,
    rtt,
    saveData,
    score,
    tier,
    isSlowConnection,
    isMetered,
    isOffline,
    loadingStrategy,
    shouldPrefetch,
    stats,
    estimatedBandwidth,
    refresh,
    getPriority,
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook that returns image quality based on network
 */
export function useAdaptiveImageQuality(): 'high' | 'medium' | 'low' | 'placeholder' {
  const { loadingStrategy } = useNetworkQuality();
  return loadingStrategy.imageQuality;
}

/**
 * Hook that conditionally loads based on network
 */
export function useNetworkConditional<T>(
  fullValue: T,
  reducedValue: T,
  placeholderValue: T
): T {
  const { loadingStrategy, isOffline } = useNetworkQuality();

  if (isOffline) {
    return placeholderValue;
  }

  switch (loadingStrategy.imageQuality) {
    case 'high':
    case 'medium':
      return fullValue;
    case 'low':
      return reducedValue;
    case 'placeholder':
      return placeholderValue;
    default:
      return fullValue;
  }
}

/**
 * Hook for network-aware lazy loading
 */
export function useNetworkAwareLazyLoad(): {
  shouldLazyLoad: boolean;
  intersectionThreshold: number;
  rootMargin: string;
} {
  const { isSlowConnection, loadingStrategy } = useNetworkQuality();

  return useMemo(() => {
    if (isSlowConnection) {
      return {
        shouldLazyLoad: true,
        intersectionThreshold: 0,
        rootMargin: '50px', // Start loading earlier on slow connections
      };
    }

    if (loadingStrategy.prefetchStrategy === 'aggressive') {
      return {
        shouldLazyLoad: false,
        intersectionThreshold: 0,
        rootMargin: '200px',
      };
    }

    return {
      shouldLazyLoad: true,
      intersectionThreshold: 0.1,
      rootMargin: '100px',
    };
  }, [isSlowConnection, loadingStrategy]);
}

/**
 * Hook for tracking request performance
 */
export function useRequestPerformance(url: string): {
  timing: RequestTiming | null;
  isLoading: boolean;
  error: Error | null;
} {
  const [timing, setTiming] = useState<RequestTiming | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const analyzer = getNetworkAnalyzer();

  useEffect(() => {
    queueMicrotask(() => {
      setIsLoading(true);
      setError(null);
    });

    // Wait for the request to complete and then analyze it
    const checkForTiming = (): void => {
      const requestTiming = analyzer.analyzeRequest(url);
      if (requestTiming) {
        setTiming(requestTiming);
        setIsLoading(false);
      }
    };

    // Check periodically for the request timing
    const intervalId = setInterval(checkForTiming, 100);
    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      setIsLoading(false);
      const currentTiming = timing;
      if (currentTiming === null) {
        setError(new Error('Request timing not found'));
      }
    }, 10000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [url, analyzer, timing]);

  return { timing, isLoading, error };
}

/**
 * Hook that provides network status indicator data
 */
export function useNetworkStatusIndicator(): {
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
  label: string;
  color: string;
  icon: string;
} {
  const { score, isOffline } = useNetworkQuality();

  return useMemo(() => {
    if (isOffline) {
      return {
        status: 'offline' as const,
        label: 'Offline',
        color: '#6b7280', // gray
        icon: 'wifi-off',
      };
    }

    if (score >= 80) {
      return {
        status: 'excellent' as const,
        label: 'Excellent',
        color: '#22c55e', // green
        icon: 'wifi',
      };
    }

    if (score >= 60) {
      return {
        status: 'good' as const,
        label: 'Good',
        color: '#84cc16', // lime
        icon: 'wifi',
      };
    }

    if (score >= 40) {
      return {
        status: 'fair' as const,
        label: 'Fair',
        color: '#f59e0b', // amber
        icon: 'wifi-low',
      };
    }

    return {
      status: 'poor' as const,
      label: 'Poor',
      color: '#ef4444', // red
      icon: 'wifi-low',
    };
  }, [score, isOffline]);
}

/**
 * Hook for preconnect management
 */
export function usePreconnect(origins: string[]): void {
  const { shouldPrefetch } = useNetworkQuality();

  useEffect(() => {
    if (!shouldPrefetch) return;

    const links: HTMLLinkElement[] = [];

    origins.forEach((origin) => {
      // Check if preconnect already exists
      const existing = document.querySelector(`link[rel="preconnect"][href="${origin}"]`);
      if (existing) return;

      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = origin;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
      links.push(link);
    });

    return () => {
      links.forEach((link) => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      });
    };
  }, [origins, shouldPrefetch]);
}

// ============================================================================
// Exports
// ============================================================================

// Types are already exported at their declaration sites
