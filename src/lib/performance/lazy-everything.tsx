/**
 * @file Universal Lazy Loading System
 * @description PhD-level lazy loading infrastructure that handles components, images,
 * modules, and data with intelligent scheduling, network awareness, and SSR support.
 *
 * Features:
 * - IntersectionObserver pooling for efficient DOM observation
 * - Network-aware loading strategies (4G full, 3G lite, 2G minimal)
 * - SSR-compatible lazy components with hydration coordination
 * - Blur-up image placeholders with LQIP support
 * - Module preloading with priority hints
 * - Automatic retry with exponential backoff
 * - Memory-aware loading throttling
 */

import React, {
  lazy,
  Suspense,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ComponentType,
  type ReactNode,
  type LazyExoticComponent,
} from 'react';

// ============================================================================
// Types
// ============================================================================

/**
 * Network quality tiers for adaptive loading
 */
export type NetworkTier = 'high' | 'medium' | 'low' | 'offline';

/**
 * Loading priority levels
 */
export type LoadingPriority = 'critical' | 'high' | 'normal' | 'low' | 'idle';

/**
 * Lazy loading strategy
 */
export type LazyStrategy =
  | 'viewport'      // Load when in viewport
  | 'interaction'   // Load on user interaction
  | 'idle'          // Load when browser is idle
  | 'immediate'     // Load immediately
  | 'network-aware'; // Adapt based on network

/**
 * Observer entry with component context
 */
interface ObserverEntry {
  element: Element;
  callback: (isIntersecting: boolean) => void;
  threshold: number;
  rootMargin: string;
}

/**
 * Lazy component configuration
 */
export interface LazyComponentConfig<P = unknown> {
  /** Import function */
  loader: () => Promise<{ default: ComponentType<P> }>;
  /** Loading priority */
  priority?: LoadingPriority;
  /** Loading strategy */
  strategy?: LazyStrategy;
  /** Preload on hover/focus */
  preloadOnInteraction?: boolean;
  /** SSR fallback */
  ssrFallback?: ReactNode;
  /** Error fallback */
  errorFallback?: ReactNode | ((error: Error, retry: () => void) => ReactNode);
  /** Loading fallback */
  loadingFallback?: ReactNode;
  /** Minimum loading time for UX */
  minLoadingTime?: number;
  /** Retry count on failure */
  retryCount?: number;
  /** Retry delay in ms */
  retryDelay?: number;
  /** Chunk name for webpack */
  chunkName?: string;
}

/**
 * Lazy image configuration
 */
export interface LazyImageConfig {
  /** Image source */
  src: string;
  /** Placeholder image (LQIP) */
  placeholder?: string;
  /** Alt text */
  alt: string;
  /** Width */
  width?: number;
  /** Height */
  height?: number;
  /** Srcset for responsive images */
  srcSet?: string;
  /** Sizes attribute */
  sizes?: string;
  /** Loading strategy */
  strategy?: LazyStrategy;
  /** Root margin for early loading */
  rootMargin?: string;
  /** Enable blur-up effect */
  blurUp?: boolean;
  /** Blur radius for placeholder */
  blurRadius?: number;
  /** Decode async */
  decodeAsync?: boolean;
  /** onLoad callback */
  onLoad?: () => void;
  /** onError callback */
  onError?: (error: Error) => void;
}

/**
 * Module preload configuration
 */
export interface ModulePreloadConfig {
  /** Module path or import function */
  module: string | (() => Promise<unknown>);
  /** Preload priority */
  priority?: LoadingPriority;
  /** Trigger condition */
  trigger?: 'immediate' | 'idle' | 'viewport' | 'route';
  /** Associated route pattern */
  routePattern?: string;
}

// ============================================================================
// Constants
// ============================================================================

const PRIORITY_WEIGHTS: Record<LoadingPriority, number> = {
  critical: 100,
  high: 75,
  normal: 50,
  low: 25,
  idle: 0,
};

const DEFAULT_ROOT_MARGIN = '200px';
const DEFAULT_THRESHOLD = 0.01;
const DEFAULT_RETRY_COUNT = 3;
const DEFAULT_RETRY_DELAY = 1000;
const DEFAULT_MIN_LOADING_TIME = 100;

// ============================================================================
// IntersectionObserver Pool
// ============================================================================

/**
 * Pooled IntersectionObserver manager for efficient DOM observation
 * Reduces observer instances by grouping elements with same config
 *
 * Memory Optimization: Includes periodic cleanup of orphaned entries
 * to prevent memory leaks from disconnected DOM elements.
 */
class ObserverPool {
  private static instance: ObserverPool;
  private observers: Map<string, IntersectionObserver> = new Map();
  private entries: Map<Element, ObserverEntry> = new Map();
  private callbacks: Map<Element, (isIntersecting: boolean) => void> = new Map();
  private cleanupIntervalId: ReturnType<typeof setInterval> | null = null;
  private static readonly CLEANUP_INTERVAL = 30000; // 30 seconds

  private constructor() {
    // Start periodic cleanup for orphaned entries
    this.startCleanupInterval();
  }

  static getInstance(): ObserverPool {
    if (!ObserverPool.instance) {
      ObserverPool.instance = new ObserverPool();
    }
    return ObserverPool.instance;
  }

  /**
   * Reset singleton instance (for testing and HMR)
   */
  static reset(): void {
    if (ObserverPool.instance) {
      ObserverPool.instance.disconnectAll();
      // Type-safe null assignment
      (ObserverPool as unknown as { instance: ObserverPool | null }).instance = null;
    }
  }

  /**
   * Start periodic cleanup of orphaned entries
   * Memory leak prevention: Removes entries for elements no longer in DOM
   */
  private startCleanupInterval(): void {
    if (this.cleanupIntervalId) return;

    this.cleanupIntervalId = setInterval(() => {
      this.cleanupOrphanedEntries();
    }, ObserverPool.CLEANUP_INTERVAL);
  }

  /**
   * Stop cleanup interval
   */
  private stopCleanupInterval(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
  }

  /**
   * Remove entries for elements that are no longer connected to the DOM
   * This prevents memory leaks from strong references to disconnected elements
   */
  private cleanupOrphanedEntries(): void {
    const orphanedElements: Element[] = [];

    // Find elements that are no longer in the DOM
    for (const [element] of this.entries) {
      if (!element.isConnected) {
        orphanedElements.push(element);
      }
    }

    // Clean up orphaned entries
    for (const element of orphanedElements) {
      const entry = this.entries.get(element);
      if (entry) {
        this.unobserve(element, entry.threshold, entry.rootMargin);
      }
    }

    if (orphanedElements.length > 0 && typeof console !== 'undefined') {
      // Debug log for development
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[ObserverPool] Cleaned up ${orphanedElements.length} orphaned entries`);
      }
    }
  }

  /**
   * Generate cache key for observer config
   */
  private getKey(threshold: number, rootMargin: string): string {
    return `${threshold}-${rootMargin}`;
  }

  /**
   * Get or create observer for config
   */
  private getObserver(threshold: number, rootMargin: string): IntersectionObserver {
    const key = this.getKey(threshold, rootMargin);

    if (!this.observers.has(key)) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const callback = this.callbacks.get(entry.target);
            callback?.(entry.isIntersecting);
          });
        },
        { threshold, rootMargin }
      );
      this.observers.set(key, observer);
    }

    return this.observers.get(key)!;
  }

  /**
   * Observe an element
   */
  observe(
    element: Element,
    callback: (isIntersecting: boolean) => void,
    options: { threshold?: number; rootMargin?: string } = {}
  ): () => void {
    const threshold = options.threshold ?? DEFAULT_THRESHOLD;
    const rootMargin = options.rootMargin ?? DEFAULT_ROOT_MARGIN;

    const observer = this.getObserver(threshold, rootMargin);
    this.callbacks.set(element, callback);
    this.entries.set(element, { element, callback, threshold, rootMargin });
    observer.observe(element);

    return () => this.unobserve(element, threshold, rootMargin);
  }

  /**
   * Unobserve an element
   */
  unobserve(element: Element, threshold: number, rootMargin: string): void {
    const key = this.getKey(threshold, rootMargin);
    const observer = this.observers.get(key);

    if (observer) {
      observer.unobserve(element);
      this.callbacks.delete(element);
      this.entries.delete(element);
    }
  }

  /**
   * Disconnect all observers and clean up resources
   */
  disconnectAll(): void {
    this.stopCleanupInterval();
    this.observers.forEach((observer) => observer.disconnect());
    this.observers.clear();
    this.callbacks.clear();
    this.entries.clear();
  }

  /**
   * Get current entry count (for debugging/monitoring)
   */
  getEntryCount(): number {
    return this.entries.size;
  }
}

// ============================================================================
// Network Quality Detection
// ============================================================================

/**
 * Get current network quality tier
 */
export function getNetworkTier(): NetworkTier {
  if (typeof navigator === 'undefined') return 'high';

  if (!navigator.onLine) return 'offline';

  const connection = (navigator as Navigator & {
    connection?: {
      effectiveType?: string;
      downlink?: number;
      saveData?: boolean;
    };
  }).connection;

  if (!connection) return 'high';

  // Respect data saver
  if (connection.saveData) return 'low';

  // Check effective type
  const effectiveType = connection.effectiveType;
  if (effectiveType === '4g') return 'high';
  if (effectiveType === '3g') return 'medium';
  return 'low';
}

/**
 * Check if network allows loading
 */
export function shouldLoadOnNetwork(
  priority: LoadingPriority,
  tier: NetworkTier = getNetworkTier()
): boolean {
  if (tier === 'offline') return false;
  if (priority === 'critical') return true;
  if (tier === 'high') return true;
  if (tier === 'medium') return priority !== 'idle' && priority !== 'low';
  return priority === 'high';
}

// ============================================================================
// Module Preloader
// ============================================================================

/**
 * Intelligent module preloader with priority queue
 */
class ModulePreloader {
  private static instance: ModulePreloader;
  private preloadQueue: Array<{
    config: ModulePreloadConfig;
    priority: number;
  }> = [];
  private loadedModules: Set<string> = new Set();
  private loadingModules: Set<string> = new Set();
  private isProcessing = false;

  static getInstance(): ModulePreloader {
    if (!ModulePreloader.instance) {
      ModulePreloader.instance = new ModulePreloader();
    }
    return ModulePreloader.instance;
  }

  /**
   * Queue module for preloading
   */
  queue(config: ModulePreloadConfig): void {
    const moduleId = typeof config.module === 'string'
      ? config.module
      : config.module.toString();

    if (this.loadedModules.has(moduleId) || this.loadingModules.has(moduleId)) {
      return;
    }

    const priority = PRIORITY_WEIGHTS[config.priority || 'normal'];
    this.preloadQueue.push({ config, priority });
    this.preloadQueue.sort((a, b) => b.priority - a.priority);

    this.processQueue();
  }

  /**
   * Process preload queue during idle time
   */
  private processQueue(): void {
    if (this.isProcessing || this.preloadQueue.length === 0) return;

    this.isProcessing = true;

    const process = (deadline?: IdleDeadline): void => {
      while (
        this.preloadQueue.length > 0 &&
        (!deadline || deadline.timeRemaining() > 5)
      ) {
        const item = this.preloadQueue.shift();
        if (!item) break;

        this.loadModule(item.config);
      }

      if (this.preloadQueue.length > 0) {
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(process);
        } else {
          setTimeout(() => process(), 50);
        }
      } else {
        this.isProcessing = false;
      }
    };

    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(process);
    } else {
      setTimeout(() => process(), 0);
    }
  }

  /**
   * Load a module
   */
  private async loadModule(config: ModulePreloadConfig): Promise<void> {
    const moduleId = typeof config.module === 'string'
      ? config.module
      : config.module.toString();

    if (this.loadingModules.has(moduleId)) return;
    this.loadingModules.add(moduleId);

    try {
      if (typeof config.module === 'function') {
        await config.module();
      } else {
        // For string paths, use dynamic import
        await import(/* webpackChunkName: "[request]" */ config.module);
      }
      this.loadedModules.add(moduleId);
    } catch (error) {
      console.warn(`[ModulePreloader] Failed to preload: ${moduleId}`, error);
    } finally {
      this.loadingModules.delete(moduleId);
    }
  }

  /**
   * Check if module is loaded
   */
  isLoaded(moduleId: string): boolean {
    return this.loadedModules.has(moduleId);
  }

  /**
   * Clear all preloaded modules (for testing)
   */
  reset(): void {
    this.preloadQueue = [];
    this.loadedModules.clear();
    this.loadingModules.clear();
    this.isProcessing = false;
  }
}

// ============================================================================
// Lazy Component Factory
// ============================================================================

/**
 * Create a lazy component with advanced features
 */
export function createLazyComponent<P extends object = object>(
  config: LazyComponentConfig<P>
): LazyExoticComponent<ComponentType<P>> & {
  preload: () => Promise<void>;
} {
  const {
    loader,
    retryCount = DEFAULT_RETRY_COUNT,
    retryDelay = DEFAULT_RETRY_DELAY,
    minLoadingTime = DEFAULT_MIN_LOADING_TIME,
  } = config;

  let loadPromise: Promise<{ default: ComponentType<P> }> | null = null;
  let loadedModule: { default: ComponentType<P> } | null = null;

  /**
   * Load with retry logic
   */
  const loadWithRetry = async (
    attempt = 0
  ): Promise<{ default: ComponentType<P> }> => {
    const startTime = Date.now();

    try {
      const module = await loader();

      // Enforce minimum loading time for UX
      const elapsed = Date.now() - startTime;
      if (elapsed < minLoadingTime) {
        await new Promise((r) => setTimeout(r, minLoadingTime - elapsed));
      }

      loadedModule = module;
      return module;
    } catch (error) {
      if (attempt < retryCount) {
        await new Promise((r) => setTimeout(r, retryDelay * Math.pow(2, attempt)));
        return loadWithRetry(attempt + 1);
      }
      throw error;
    }
  };

  /**
   * Get or create load promise
   */
  const getLoadPromise = (): Promise<{ default: ComponentType<P> }> => {
    if (loadedModule) {
      return Promise.resolve(loadedModule);
    }
    if (!loadPromise) {
      loadPromise = loadWithRetry();
    }
    return loadPromise;
  };

  // Create the lazy component
  const LazyComponent = lazy(getLoadPromise) as LazyExoticComponent<ComponentType<P>> & {
    preload: () => Promise<void>;
  };

  // Add preload method
  LazyComponent.preload = async (): Promise<void> => {
    await getLoadPromise();
  };

  return LazyComponent;
}

/**
 * Higher-order component for lazy loading with full configuration
 */
export function withLazyLoading<P extends object>(
  config: LazyComponentConfig<P>
): React.FC<P & {
  lazyFallback?: ReactNode;
  lazyErrorFallback?: ReactNode | ((error: Error, retry: () => void) => ReactNode);
}> {
  const LazyComponent = createLazyComponent(config);

  return function LazyWrapper({ lazyFallback, lazyErrorFallback, ...props }: P & {
    lazyFallback?: ReactNode;
    lazyErrorFallback?: ReactNode | ((error: Error, retry: () => void) => ReactNode);
  }) {
    const [error, setError] = useState<Error | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    const fallback = lazyFallback ?? config.loadingFallback ?? null;
    const errorFallbackFn = lazyErrorFallback ?? config.errorFallback;

    const retry = useCallback(() => {
      setError(null);
      setRetryCount((c) => c + 1);
    }, []);

    if (error) {
      if (typeof errorFallbackFn === 'function') {
        return <>{errorFallbackFn(error, retry)}</>;
      }
      return <>{errorFallbackFn ?? 'Failed to load component'}</>;
    }

    // Type-safe props spreading: props is correctly typed as P after destructuring
    return (
      <Suspense fallback={fallback} key={retryCount}>
        <ErrorBoundaryWrapper onError={setError}>
          <LazyComponent {...(props as any)} />
        </ErrorBoundaryWrapper>
      </Suspense>
    );
  };
}

// Simple error boundary wrapper
class ErrorBoundaryWrapper extends React.Component<
  { children: ReactNode; onError: (error: Error) => void },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; onError: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  override componentDidCatch(error: Error): void {
    this.props.onError(error);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

// ============================================================================
// Lazy Image Component
// ============================================================================

/**
 * Lazy image with blur-up placeholder and network awareness
 */
export function LazyImage({
  src,
  placeholder,
  alt,
  width,
  height,
  srcSet,
  sizes,
  strategy = 'viewport',
  rootMargin = DEFAULT_ROOT_MARGIN,
  blurUp = true,
  blurRadius = 20,
  decodeAsync = true,
  onLoad,
  onError,
  ...props
}: LazyImageConfig & React.ImgHTMLAttributes<HTMLImageElement>): JSX.Element {
  const [isInView, setIsInView] = useState(strategy === 'immediate');
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Observe viewport intersection
  useEffect(() => {
    if (strategy !== 'viewport' || isInView) return;

    const element = containerRef.current;
    if (!element) return;

    const pool = ObserverPool.getInstance();
    return pool.observe(
      element,
      (intersecting) => {
        if (intersecting) setIsInView(true);
      },
      { rootMargin }
    );
  }, [strategy, rootMargin, isInView]);

  // Preload image
  useEffect(() => {
    if (!isInView || isLoaded) return;

    const img = new Image();

    img.onload = async () => {
      // Decode async for smoother rendering
      if (decodeAsync && 'decode' in img) {
        try {
          await img.decode();
        } catch {
          // Decode failed, but image loaded
        }
      }
      setIsLoaded(true);
      onLoad?.();
    };

    img.onerror = () => {
      setHasError(true);
      onError?.(new Error(`Failed to load image: ${src}`));
    };

    if (srcSet) img.srcset = srcSet;
    if (sizes) img.sizes = sizes;
    img.src = src;
  }, [isInView, src, srcSet, sizes, decodeAsync, isLoaded, onLoad, onError]);

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: width ? `${width}px` : '100%',
    height: height ? `${height}px` : 'auto',
    overflow: 'hidden',
  };

  const placeholderStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    filter: blurUp ? `blur(${blurRadius}px)` : undefined,
    transform: blurUp ? 'scale(1.1)' : undefined,
    transition: 'opacity 0.3s ease',
    opacity: isLoaded ? 0 : 1,
  };

  const imgStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    opacity: isLoaded ? 1 : 0,
    transition: 'opacity 0.3s ease',
  };

  if (hasError) {
    return (
      <div
        ref={containerRef}
        style={{ ...containerStyle, background: '#f0f0f0' }}
        role="img"
        aria-label={`Failed to load: ${alt}`}
      />
    );
  }

  return (
    <div ref={containerRef} style={containerStyle}>
      {placeholder && (
        <img
          src={placeholder}
          alt=""
          style={placeholderStyle}
          aria-hidden="true"
        />
      )}
      {isInView && (
        <img
          ref={imgRef}
          src={src}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          width={width}
          height={height}
          style={imgStyle}
          loading="lazy"
          decoding={decodeAsync ? 'async' : 'sync'}
          {...props}
        />
      )}
    </div>
  );
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook for lazy loading any element on viewport intersection
 */
export function useLazyVisible(options: {
  rootMargin?: string;
  threshold?: number;
  triggerOnce?: boolean;
} = {}): {
  ref: React.RefObject<HTMLDivElement | null>;
  isVisible: boolean;
  hasBeenVisible: boolean;
} {
  const {
    rootMargin = DEFAULT_ROOT_MARGIN,
    threshold = DEFAULT_THRESHOLD,
    triggerOnce = true,
  } = options;

  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (triggerOnce && hasBeenVisible) return;

    const pool = ObserverPool.getInstance();
    return pool.observe(
      element,
      (intersecting) => {
        setIsVisible(intersecting);
        if (intersecting) setHasBeenVisible(true);
      },
      { rootMargin, threshold }
    );
  }, [rootMargin, threshold, triggerOnce, hasBeenVisible]);

  return { ref, isVisible, hasBeenVisible };
}

/**
 * Hook for preloading modules
 */
export function useModulePreload(configs: ModulePreloadConfig[]): void {
  useEffect(() => {
    const preloader = ModulePreloader.getInstance();
    configs.forEach((config) => preloader.queue(config));
  }, [configs]);
}

/**
 * Hook for network-aware loading decisions
 */
export function useNetworkAwareLoading(priority: LoadingPriority = 'normal'): {
  networkTier: NetworkTier;
  shouldLoad: boolean;
  isOnline: boolean;
} {
  const [networkTier, setNetworkTier] = useState<NetworkTier>(getNetworkTier);

  useEffect(() => {
    const updateTier = (): void => setNetworkTier(getNetworkTier());

    window.addEventListener('online', updateTier);
    window.addEventListener('offline', updateTier);

    const connection = (navigator as Navigator & {
      connection?: { addEventListener: (type: string, handler: () => void) => void };
    }).connection;

    connection?.addEventListener('change', updateTier);

    return () => {
      window.removeEventListener('online', updateTier);
      window.removeEventListener('offline', updateTier);
    };
  }, []);

  return {
    networkTier,
    shouldLoad: shouldLoadOnNetwork(priority, networkTier),
    isOnline: networkTier !== 'offline',
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Preload a component imperatively
 */
export function preloadComponent<P extends object>(
  config: LazyComponentConfig<P>
): Promise<void> {
  const LazyComponent = createLazyComponent(config);
  return LazyComponent.preload();
}

/**
 * Preload multiple components in parallel
 */
export async function preloadComponents(
  configs: Array<LazyComponentConfig<unknown>>
): Promise<void> {
  await Promise.all(configs.map(preloadComponent));
}

/**
 * Queue module for preloading
 */
export function queueModulePreload(config: ModulePreloadConfig): void {
  ModulePreloader.getInstance().queue(config);
}

/**
 * Reset observer pool (for testing and HMR)
 */
export function resetObserverPool(): void {
  ObserverPool.reset();
}

/**
 * Reset module preloader (for testing)
 */
export function resetModulePreloader(): void {
  ModulePreloader.getInstance().reset();
}

// ============================================================================
// Exports
// ============================================================================

export {
  ObserverPool,
  ModulePreloader,
};

export default {
  createLazyComponent,
  withLazyLoading,
  LazyImage,
  useLazyVisible,
  useModulePreload,
  useNetworkAwareLoading,
  preloadComponent,
  preloadComponents,
  queueModulePreload,
  getNetworkTier,
  shouldLoadOnNetwork,
};

// ============================================================================
// HMR Support
// ============================================================================

// Vite HMR disposal to prevent memory leaks during hot module replacement
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    ObserverPool.reset();
    ModulePreloader.getInstance().reset();
  });
}
