/**
 * @file Feature Code Splitting
 * @description Advanced code splitting utilities for features with preloading support
 */

import React, {
  Suspense,
  type ComponentType,
  lazy,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { FeatureRegistryEntry } from './types';

// ============================================================================
// Types
// ============================================================================

/**
 * Preload priority levels
 */
export type PreloadPriority = 'critical' | 'high' | 'medium' | 'low' | 'idle';

/**
 * Preload trigger types
 */
export type PreloadTrigger = 'immediate' | 'hover' | 'visible' | 'idle' | 'route';

/**
 * Preload configuration for a feature
 */
export interface PreloadConfig {
  featureId: string;
  priority: PreloadPriority;
  trigger: PreloadTrigger;
  /** Delay in ms before preloading (for debouncing) */
  delay?: number;
}

/**
 * Feature chunk metadata
 */
export interface FeatureChunkInfo {
  featureId: string;
  isLoaded: boolean;
  isLoading: boolean;
  loadTime?: number;
  error?: Error;
}

/**
 * Lazy component with preload support
 */
export type PreloadableLazyComponent<T extends ComponentType<unknown>> =
  React.LazyExoticComponent<T> & {
    preload: () => Promise<void>;
  };

// ============================================================================
// Lazy Component Factory
// ============================================================================

/**
 * Create a lazy-loaded feature component with preloading support
 */
export function createLazyFeatureComponent<T extends ComponentType<unknown>>(
  _featureId: string,
  importFn: () => Promise<{ default: T }>
): PreloadableLazyComponent<T> {
  let loadPromise: Promise<{ default: T }> | null = null;
  let hasLoaded = false;

  const load = async (): Promise<{ default: T }> => {
    loadPromise ??= importFn().then((module) => {
      hasLoaded = true;
      return module;
    });
    return loadPromise;
  };

  const LazyComponent = lazy(load) as PreloadableLazyComponent<T>;

  // Add preload method
  LazyComponent.preload = async (): Promise<void> => {
    if (hasLoaded) return;
    await load();
  };

  return LazyComponent;
}

/**
 * Create a lazy feature component with automatic retry on failure
 */
export function createResilientLazyComponent<T extends ComponentType<unknown>>(
  featureId: string,
  importFn: () => Promise<{ default: T }>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    onError?: (error: Error, retryCount: number) => void;
  } = {}
): PreloadableLazyComponent<T> {
  const { maxRetries = 3, retryDelay = 1000, onError } = options;

  const loadWithRetry = async (): Promise<{ default: T }> => {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await importFn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        onError?.(lastError, attempt);

        if (attempt < maxRetries) {
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelay * Math.pow(2, attempt))
          );
        }
      }
    }

    throw lastError;
  };

  return createLazyFeatureComponent(featureId, loadWithRetry);
}

// ============================================================================
// Feature Chunk Manager
// ============================================================================

/**
 * Feature chunk manager for coordinated loading
 */
export class FeatureChunkManager {
  private loadedFeatures = new Set<string>();
  private loadingFeatures = new Map<string, Promise<void>>();
  private featureLoaders = new Map<string, () => Promise<void>>();
  private loadTimes = new Map<string, number>();
  private errors = new Map<string, Error>();
  private preloadConfigs = new Map<string, PreloadConfig>();

  /**
   * Register a feature loader
   */
  registerLoader(featureId: string, loader: () => Promise<void>): void {
    this.featureLoaders.set(featureId, loader);
  }

  /**
   * Register preload configuration for a feature
   */
  configurePreload(config: PreloadConfig): void {
    this.preloadConfigs.set(config.featureId, config);
  }

  /**
   * Preload a feature
   */
  async preload(featureId: string): Promise<void> {
    if (this.loadedFeatures.has(featureId)) {
      return;
    }

    if (this.loadingFeatures.has(featureId)) {
      return this.loadingFeatures.get(featureId);
    }

    const loader = this.featureLoaders.get(featureId);
    if (!loader) {
      console.warn(`[FeatureChunkManager] No loader registered for: ${featureId}`);
      return;
    }

    const startTime = performance.now();

    const loadPromise = loader()
      .then(() => {
        this.loadedFeatures.add(featureId);
        this.loadTimes.set(featureId, performance.now() - startTime);
        this.loadingFeatures.delete(featureId);
        this.errors.delete(featureId);
      })
      .catch((error) => {
        this.errors.set(
          featureId,
          error instanceof Error ? error : new Error(String(error))
        );
        this.loadingFeatures.delete(featureId);
        throw error;
      });

    this.loadingFeatures.set(featureId, loadPromise);
    return loadPromise;
  }

  /**
   * Preload multiple features
   */
  async preloadAll(featureIds: string[]): Promise<void> {
    await Promise.all(featureIds.map(async (id) => this.preload(id)));
  }

  /**
   * Preload features by priority
   */
  async preloadByPriority(priority: PreloadPriority): Promise<void> {
    const configs = Array.from(this.preloadConfigs.values()).filter(
      (config) => config.priority === priority
    );
    await this.preloadAll(configs.map((c) => c.featureId));
  }

  /**
   * Check if a feature is loaded
   */
  isLoaded(featureId: string): boolean {
    return this.loadedFeatures.has(featureId);
  }

  /**
   * Check if a feature is loading
   */
  isLoading(featureId: string): boolean {
    return this.loadingFeatures.has(featureId);
  }

  /**
   * Get feature chunk info
   */
  getChunkInfo(featureId: string): FeatureChunkInfo {
    return {
      featureId,
      isLoaded: this.loadedFeatures.has(featureId),
      isLoading: this.loadingFeatures.has(featureId),
      loadTime: this.loadTimes.get(featureId),
      error: this.errors.get(featureId),
    };
  }

  /**
   * Get all chunk info
   */
  getAllChunkInfo(): FeatureChunkInfo[] {
    const allFeatureIds = new Set([
      ...this.featureLoaders.keys(),
      ...this.loadedFeatures,
      ...this.loadingFeatures.keys(),
    ]);

    return Array.from(allFeatureIds).map((id) => this.getChunkInfo(id));
  }

  /**
   * Preload features during idle time
   */
  preloadOnIdle(featureIds: string[]): void {
    if ('requestIdleCallback' in window) {
      (window as Window & { requestIdleCallback: (cb: IdleRequestCallback) => number }).requestIdleCallback(
        () => {
          this.preloadAll(featureIds);
        },
        { timeout: 5000 }
      );
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        this.preloadAll(featureIds);
      }, 1000);
    }
  }

  /**
   * Preload features with idle priority
   */
  preloadIdlePriorityFeatures(): void {
    const idleFeatures = Array.from(this.preloadConfigs.values())
      .filter((config) => config.trigger === 'idle' || config.priority === 'idle')
      .map((config) => config.featureId);

    this.preloadOnIdle(idleFeatures);
  }

  /**
   * Clear loaded state (useful for testing)
   */
  reset(): void {
    this.loadedFeatures.clear();
    this.loadingFeatures.clear();
    this.loadTimes.clear();
    this.errors.clear();
  }
}

/**
 * Global chunk manager instance
 */
export const featureChunkManager = new FeatureChunkManager();

// ============================================================================
// React Hooks
// ============================================================================

/**
 * Hook for feature preloading on hover/focus
 */
export function useFeaturePreload(featureId: string): {
  onMouseEnter: () => void;
  onFocus: () => void;
  preload: () => void;
} {
  const preload = useCallback(() => {
    featureChunkManager.preload(featureId);
  }, [featureId]);

  return {
    onMouseEnter: preload,
    onFocus: preload,
    preload,
  };
}

/**
 * Hook to get feature chunk status
 */
export function useFeatureChunkStatus(featureId: string): FeatureChunkInfo {
  const [info, setInfo] = useState<FeatureChunkInfo>(() =>
    featureChunkManager.getChunkInfo(featureId)
  );

  useEffect(() => {
    // Update status when chunk manager changes
    const interval = setInterval(() => {
      const newInfo = featureChunkManager.getChunkInfo(featureId);
      if (
        newInfo.isLoaded !== info.isLoaded ||
        newInfo.isLoading !== info.isLoading
      ) {
        setInfo(newInfo);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [featureId, info.isLoaded, info.isLoading]);

  return info;
}

/**
 * Hook to preload features when component becomes visible
 */
export function usePreloadOnVisible(
  featureIds: string[],
  options: IntersectionObserverInit = {}
): React.RefObject<HTMLDivElement | null> {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [hasPreloaded, setHasPreloaded] = useState(false);

  useEffect(() => {
    if (hasPreloaded || !ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.isIntersecting && !hasPreloaded) {
          featureChunkManager.preloadAll(featureIds);
          setHasPreloaded(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, ...options }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [featureIds, hasPreloaded, options]);

  return ref;
}

// ============================================================================
// Higher-Order Components
// ============================================================================

/**
 * Props for the feature suspense wrapper
 */
interface FeatureSuspenseProps {
  fallback?: ReactNode;
  errorFallback?: ReactNode | ((error: Error) => ReactNode);
}

/**
 * HOC to wrap feature with Suspense and error handling
 */
export function withFeatureSuspense<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: FeatureSuspenseProps & { featureId: string }
): ComponentType<P> {
  const {
    fallback = <div>Loading...</div>,
    featureId,
  } = options;

  function FeatureWithSuspense(props: P) {
    return (
      <Suspense fallback={fallback}>
        <WrappedComponent {...props} />
      </Suspense>
    );
  }

  FeatureWithSuspense.displayName = `FeatureSuspense(${featureId})`;

  return FeatureWithSuspense;
}

// ============================================================================
// Route Integration
// ============================================================================

/**
 * Feature route configuration
 */
export interface FeatureRoute {
  path: string;
  featureId: string;
  preloadOn?: PreloadTrigger;
  preloadPriority?: PreloadPriority;
}

/**
 * Generate routes with automatic code splitting
 */
export function generateSplitRoutes(
  features: FeatureRegistryEntry[],
  options: {
    preloadStrategy?: 'eager' | 'lazy' | 'idle';
    fallback?: ReactNode;
  } = {}
): Array<{
  path: string;
  element: ReactNode;
  preload?: () => Promise<void>;
}> {
  const { preloadStrategy = 'lazy', fallback = null } = options;

  return features.map((feature) => {
    const { config, component: Component } = feature;
    const {preload} = (Component as unknown as { preload?: () => Promise<void> });

    // Register loader with chunk manager
    if (preload) {
      featureChunkManager.registerLoader(config.metadata.id, preload);

      // Configure preload based on strategy
      if (preloadStrategy !== 'lazy') {
        featureChunkManager.configurePreload({
          featureId: config.metadata.id,
          priority: preloadStrategy === 'eager' ? 'high' : 'idle',
          trigger: preloadStrategy === 'eager' ? 'immediate' : 'idle',
        });
      }
    }

    return {
      path: config.metadata.id,
      element: (
        <Suspense fallback={config.loadingFallback || fallback}>
          <Component />
        </Suspense>
      ),
      preload,
    };
  });
}

// ============================================================================
// Preload Initialization
// ============================================================================

/**
 * Initialize preloading based on configured priorities
 */
export function initializeFeaturePreloading(): void {
  // Preload critical features immediately
  featureChunkManager.preloadByPriority('critical');

  // Preload high priority features after initial render
  requestAnimationFrame(() => {
    featureChunkManager.preloadByPriority('high');
  });

  // Preload idle features during idle time
  featureChunkManager.preloadIdlePriorityFeatures();
}
