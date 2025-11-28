/**
 * @file Runtime Bundle Optimizer
 * @description PhD-level runtime bundle optimization with device capability detection,
 * network-aware chunk loading, and dynamic import prioritization.
 *
 * Features:
 * - Device capability detection (CPU cores, memory, GPU)
 * - Network-aware chunk sizes
 * - Conditional polyfill loading
 * - Dynamic import prioritization
 * - Module replacement for lighter alternatives
 * - Resource timing analysis
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

/**
 * Device capability tier
 */
export type DeviceTier = 'high-end' | 'mid-range' | 'low-end';

/**
 * Device capabilities
 */
export interface DeviceCapabilities {
  /** Number of logical CPU cores */
  cpuCores: number;
  /** Device memory in GB (if available) */
  deviceMemory: number | null;
  /** Hardware concurrency level */
  hardwareConcurrency: number;
  /** GPU info (if available) */
  gpu: string | null;
  /** Is touch device */
  isTouch: boolean;
  /** Max texture size (WebGL) */
  maxTextureSize: number | null;
  /** Supports WebGL */
  supportsWebGL: boolean;
  /** Supports WebGL2 */
  supportsWebGL2: boolean;
  /** Device tier classification */
  tier: DeviceTier;
}

/**
 * Network conditions
 */
export interface NetworkConditions {
  /** Effective connection type */
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
  /** Downlink speed in Mbps */
  downlink: number | null;
  /** Round-trip time in ms */
  rtt: number | null;
  /** Data saver enabled */
  saveData: boolean;
  /** Online status */
  online: boolean;
}

/**
 * Bundle loading strategy
 */
export interface LoadingStrategy {
  /** Maximum chunk size in bytes */
  maxChunkSize: number;
  /** Enable preloading */
  preload: boolean;
  /** Preload distance (number of routes ahead) */
  preloadDistance: number;
  /** Enable compression hints */
  useCompression: boolean;
  /** Priority boost for critical chunks */
  priorityBoost: boolean;
  /** Defer non-critical chunks */
  deferNonCritical: boolean;
  /** Use service worker caching */
  useServiceWorker: boolean;
}

/**
 * Polyfill configuration
 */
export interface PolyfillConfig {
  /** Feature name */
  feature: string;
  /** Detection function */
  detect: () => boolean;
  /** Polyfill loader */
  load: () => Promise<void>;
  /** Size in bytes */
  size: number;
}

/**
 * Module alternative
 */
export interface ModuleAlternative {
  /** Original module name */
  original: string;
  /** Lightweight alternative */
  alternative: string;
  /** Condition for using alternative */
  useAlternativeWhen: (capabilities: DeviceCapabilities, network: NetworkConditions) => boolean;
  /** Size difference (positive = savings) */
  sizeDifference: number;
}

/**
 * Bundle optimizer configuration
 */
export interface BundleOptimizerConfig {
  /** Enable device detection */
  detectDevice?: boolean;
  /** Enable network monitoring */
  monitorNetwork?: boolean;
  /** Custom polyfills */
  polyfills?: PolyfillConfig[];
  /** Module alternatives */
  alternatives?: ModuleAlternative[];
  /** Enable debug logging */
  debug?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const CHUNK_SIZE_LIMITS: Record<DeviceTier, Record<NetworkConditions['effectiveType'], number>> = {
  'high-end': {
    '4g': 500 * 1024,      // 500KB
    '3g': 200 * 1024,      // 200KB
    '2g': 100 * 1024,      // 100KB
    'slow-2g': 50 * 1024,  // 50KB
    'unknown': 200 * 1024, // 200KB default
  },
  'mid-range': {
    '4g': 300 * 1024,
    '3g': 150 * 1024,
    '2g': 75 * 1024,
    'slow-2g': 30 * 1024,
    'unknown': 150 * 1024,
  },
  'low-end': {
    '4g': 150 * 1024,
    '3g': 75 * 1024,
    '2g': 50 * 1024,
    'slow-2g': 25 * 1024,
    'unknown': 75 * 1024,
  },
};

// Common polyfills
const COMMON_POLYFILLS: PolyfillConfig[] = [
  {
    feature: 'IntersectionObserver',
    detect: () => 'IntersectionObserver' in window,
    load: async () => Promise.resolve().then(() => {}), // Polyfill loaded via script
    size: 7 * 1024,
  },
  // NOTE: ResizeObserver polyfill commented out - module not available
  // {
  //   feature: 'ResizeObserver',
  //   detect: () => 'ResizeObserver' in window,
  //   load: () => import('@juggle/resize-observer').then((m) => {
  //     if (!('ResizeObserver' in window)) {
  //       (window as Window & { ResizeObserver: typeof ResizeObserver }).ResizeObserver = m.ResizeObserver;
  //     }
  //   }),
  //   size: 3 * 1024,
  // },
  {
    feature: 'requestIdleCallback',
    detect: () => 'requestIdleCallback' in window,
    load: async () => Promise.resolve().then(() => {
      if (!('requestIdleCallback' in window)) {
        (window as Window & { requestIdleCallback: typeof requestIdleCallback }).requestIdleCallback = (cb) =>
          setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 50 }), 1) as unknown as number;
        (window as Window & { cancelIdleCallback: typeof cancelIdleCallback }).cancelIdleCallback = clearTimeout;
      }
    }),
    size: 500,
  },
];

// ============================================================================
// Device Detection
// ============================================================================

/**
 * Detect device capabilities
 */
export function detectDeviceCapabilities(): DeviceCapabilities {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    hardwareConcurrency?: number;
  };

  const cpuCores = nav.hardwareConcurrency ?? 2;
  const deviceMemory = nav.deviceMemory ?? null;
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // WebGL detection
  let gpu: string | null = null;
  let maxTextureSize: number | null = null;
  let supportsWebGL = false;
  let supportsWebGL2 = false;

  try {
    const canvas = document.createElement('canvas');
    const gl2 = canvas.getContext('webgl2');
    const gl = gl2 ?? canvas.getContext('webgl');

    if (gl != null) {
      supportsWebGL = true;
      supportsWebGL2 = gl2 != null;

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo != null) {
        gpu = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string | null;
      }

      maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number | null;
    }
  } catch {
    // WebGL not available
  }

  // Determine tier
  let tier: DeviceTier = 'mid-range';

  if (cpuCores >= 8 && (deviceMemory === null || deviceMemory >= 8)) {
    tier = 'high-end';
  } else if (cpuCores <= 2 || (deviceMemory !== null && deviceMemory <= 2)) {
    tier = 'low-end';
  }

  return {
    cpuCores,
    deviceMemory,
    hardwareConcurrency: cpuCores,
    gpu,
    isTouch,
    maxTextureSize,
    supportsWebGL,
    supportsWebGL2,
    tier,
  };
}

/**
 * Detect network conditions
 */
export function detectNetworkConditions(): NetworkConditions {
  const {connection} = (navigator as Navigator & {
    connection?: {
      effectiveType?: string;
      downlink?: number;
      rtt?: number;
      saveData?: boolean;
    };
  });

  return {
    effectiveType: (connection?.effectiveType as NetworkConditions['effectiveType']) ?? 'unknown',
    downlink: connection?.downlink ?? null,
    rtt: connection?.rtt ?? null,
    saveData: connection?.saveData ?? false,
    online: navigator.onLine,
  };
}

// ============================================================================
// Bundle Optimizer Class
// ============================================================================

/**
 * Runtime bundle optimizer
 */
export class BundleOptimizer {
  private static instance: BundleOptimizer;
  private config: Required<BundleOptimizerConfig>;
  private deviceCapabilities: DeviceCapabilities;
  private networkConditions: NetworkConditions;
  private loadedPolyfills: Set<string> = new Set();
  private loadingStrategy: LoadingStrategy;
  private importQueue: Map<string, Promise<unknown>> = new Map();
  private networkChangeCallbacks: Set<(conditions: NetworkConditions) => void> = new Set();

  constructor(config: BundleOptimizerConfig = {}) {
    this.config = {
      detectDevice: config.detectDevice ?? true,
      monitorNetwork: config.monitorNetwork ?? true,
      polyfills: [...COMMON_POLYFILLS, ...(config.polyfills ?? [])],
      alternatives: config.alternatives ?? [],
      debug: config.debug ?? false,
    };

    this.deviceCapabilities = this.config.detectDevice
      ? detectDeviceCapabilities()
      : this.getDefaultCapabilities();

    this.networkConditions = detectNetworkConditions();
    this.loadingStrategy = this.calculateLoadingStrategy();

    if (this.config.monitorNetwork) {
      this.startNetworkMonitoring();
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: BundleOptimizerConfig): BundleOptimizer {
    if (BundleOptimizer.instance == null) {
      BundleOptimizer.instance = new BundleOptimizer(config);
    }
    return BundleOptimizer.instance;
  }

  /**
   * Reset singleton (for testing)
   */
  static reset(): void {
    BundleOptimizer.instance = null as unknown as BundleOptimizer;
  }

  /**
   * Get default capabilities
   */
  private getDefaultCapabilities(): DeviceCapabilities {
    return {
      cpuCores: 4,
      deviceMemory: 4,
      hardwareConcurrency: 4,
      gpu: null,
      isTouch: false,
      maxTextureSize: 4096,
      supportsWebGL: true,
      supportsWebGL2: true,
      tier: 'mid-range',
    };
  }

  /**
   * Calculate optimal loading strategy
   */
  private calculateLoadingStrategy(): LoadingStrategy {
    const {tier} = this.deviceCapabilities;
    const {effectiveType} = this.networkConditions;

    const maxChunkSize = CHUNK_SIZE_LIMITS[tier][effectiveType];

    let preloadDistance = 1;
    if (tier === 'high-end') {
      preloadDistance = 3;
    } else if (tier === 'mid-range') {
      preloadDistance = 2;
    }

    return {
      maxChunkSize,
      preload: !this.networkConditions.saveData && effectiveType !== 'slow-2g',
      preloadDistance,
      useCompression: true,
      priorityBoost: tier !== 'low-end',
      deferNonCritical: tier === 'low-end' || effectiveType === '2g' || effectiveType === 'slow-2g',
      useServiceWorker: 'serviceWorker' in navigator,
    };
  }

  /**
   * Start network monitoring
   */
  private startNetworkMonitoring(): void {
    const {connection} = (navigator as Navigator & {
      connection?: EventTarget & { addEventListener: (type: string, handler: () => void) => void };
    });

    if (connection != null) {
      connection.addEventListener('change', () => {
        this.networkConditions = detectNetworkConditions();
        this.loadingStrategy = this.calculateLoadingStrategy();
        this.notifyNetworkChange();
      });
    }

    window.addEventListener('online', () => {
      this.networkConditions.online = true;
      this.notifyNetworkChange();
    });

    window.addEventListener('offline', () => {
      this.networkConditions.online = false;
      this.notifyNetworkChange();
    });
  }

  /**
   * Notify network change listeners
   */
  private notifyNetworkChange(): void {
    this.networkChangeCallbacks.forEach((cb) => cb(this.networkConditions));
  }

  /**
   * Subscribe to network changes
   */
  onNetworkChange(callback: (conditions: NetworkConditions) => void): () => void {
    this.networkChangeCallbacks.add(callback);
    return () => this.networkChangeCallbacks.delete(callback);
  }

  // ============================================================================
  // Polyfill Management
  // ============================================================================

  /**
   * Load required polyfills
   */
  async loadPolyfills(): Promise<void> {
    const neededPolyfills = this.config.polyfills.filter(
      (p) => !p.detect() && !this.loadedPolyfills.has(p.feature)
    );

    this.log(`Loading ${neededPolyfills.length} polyfills`);

    await Promise.all(
      neededPolyfills.map(async (polyfill) => {
        try {
          await polyfill.load();
          this.loadedPolyfills.add(polyfill.feature);
          this.log(`Loaded polyfill: ${polyfill.feature}`);
        } catch (error) {
          console.error(`Failed to load polyfill: ${polyfill.feature}`, error);
        }
      })
    );
  }

  /**
   * Check if polyfill is needed
   */
  needsPolyfill(feature: string): boolean {
    const polyfill = this.config.polyfills.find((p) => p.feature === feature);
    return polyfill ? !polyfill.detect() : false;
  }

  // ============================================================================
  // Module Management
  // ============================================================================

  /**
   * Get optimal module for current conditions
   */
  getOptimalModule(moduleName: string): string {
    const alternative = this.config.alternatives.find(
      (a) => a.original === moduleName &&
        a.useAlternativeWhen(this.deviceCapabilities, this.networkConditions)
    );

    if (alternative) {
      this.log(`Using alternative for ${moduleName}: ${alternative.alternative}`);
      return alternative.alternative;
    }

    return moduleName;
  }

  /**
   * Priority-based dynamic import
   */
  async importWithPriority<T>(
    importFn: () => Promise<T>,
    options: {
      priority?: 'critical' | 'high' | 'normal' | 'low';
      moduleId?: string;
      timeout?: number;
    } = {}
  ): Promise<T> {
    const { priority = 'normal', moduleId, timeout = 30000 } = options;

    // Check if already loading
    if (moduleId != null && moduleId !== '' && this.importQueue.has(moduleId)) {
      return this.importQueue.get(moduleId) as Promise<T>;
    }

    // Defer low priority imports on constrained connections
    if (priority === 'low' && this.loadingStrategy.deferNonCritical) {
      await new Promise((resolve) => {
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(() => resolve(undefined));
        } else {
          setTimeout(resolve, 100);
        }
      });
    }

    const importPromise = Promise.race([
      importFn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Import timeout')), timeout)
      ),
    ]);

    if (moduleId != null && moduleId !== '') {
      this.importQueue.set(moduleId, importPromise);
    }

    try {
      const result = await importPromise;
      return result;
    } finally {
      if (moduleId != null && moduleId !== '') {
        this.importQueue.delete(moduleId);
      }
    }
  }

  /**
   * Preload modules based on route prediction
   */
  preloadModules(modules: Array<() => Promise<unknown>>): void {
    if (!this.loadingStrategy.preload) {
      this.log('Preloading disabled due to network/device constraints');
      return;
    }

    const preloadCount = Math.min(modules.length, this.loadingStrategy.preloadDistance);

    for (let i = 0; i < preloadCount; i++) {
      // Use idle callback for preloading
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => {
          const moduleLoader = modules[i];
          if (moduleLoader) {
            moduleLoader().catch(() => {
              // Silently fail preloads
            });
          }
        });
      }
    }
  }

  // ============================================================================
  // Resource Analysis
  // ============================================================================

  /**
   * Analyze loaded resources
   */
  analyzeLoadedResources(): {
    totalSize: number;
    jsSize: number;
    cssSize: number;
    imageSize: number;
    largestResources: Array<{ name: string; size: number; type: string }>;
    slowestResources: Array<{ name: string; duration: number; type: string }>;
  } {
    const entries = performance.getEntriesByType('resource');

    let totalSize = 0;
    let jsSize = 0;
    let cssSize = 0;
    let imageSize = 0;
    const resources: Array<{ name: string; size: number; duration: number; type: string }> = [];

    entries.forEach((entry) => {
      const size = entry.transferSize || 0;
      totalSize += size;

      let type = 'other';
      if (entry.name.endsWith('.js') || entry.initiatorType === 'script') {
        type = 'js';
        jsSize += size;
      } else if (entry.name.endsWith('.css') || entry.initiatorType === 'css') {
        type = 'css';
        cssSize += size;
      } else if (entry.initiatorType === 'img' || /\.(jpg|jpeg|png|gif|webp|avif|svg)$/i.test(entry.name)) {
        type = 'image';
        imageSize += size;
      }

      resources.push({
        name: entry.name,
        size,
        duration: entry.duration,
        type,
      });
    });

    // Sort for largest and slowest
    const sortedBySize = [...resources].sort((a, b) => b.size - a.size);
    const sortedByDuration = [...resources].sort((a, b) => b.duration - a.duration);

    return {
      totalSize,
      jsSize,
      cssSize,
      imageSize,
      largestResources: sortedBySize.slice(0, 10).map(({ name, size, type }) => ({ name, size, type })),
      slowestResources: sortedByDuration.slice(0, 10).map(({ name, duration, type }) => ({ name, duration, type })),
    };
  }

  // ============================================================================
  // Getters
  // ============================================================================

  /**
   * Get device capabilities
   */
  getDeviceCapabilities(): DeviceCapabilities {
    return { ...this.deviceCapabilities };
  }

  /**
   * Get network conditions
   */
  getNetworkConditions(): NetworkConditions {
    return { ...this.networkConditions };
  }

  /**
   * Get loading strategy
   */
  getLoadingStrategy(): LoadingStrategy {
    return { ...this.loadingStrategy };
  }

  /**
   * Debug logging
   */
  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      // eslint-disable-next-line no-console
      console.log(`[BundleOptimizer] ${message}`, ...args);
    }
  }
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook for bundle optimization awareness
 */
export function useBundleOptimizer(): {
  deviceCapabilities: DeviceCapabilities;
  networkConditions: NetworkConditions;
  loadingStrategy: LoadingStrategy;
  shouldLoadFeature: (featureSize: number, priority?: 'critical' | 'high' | 'normal' | 'low') => boolean;
} {
  const optimizer = useMemo(() => BundleOptimizer.getInstance(), []);
  const [networkConditions, setNetworkConditions] = useState(optimizer.getNetworkConditions());

  useEffect(() => {
    return optimizer.onNetworkChange(setNetworkConditions);
  }, [optimizer]);

  const shouldLoadFeature = useCallback(
    (featureSize: number, priority: 'critical' | 'high' | 'normal' | 'low' = 'normal') => {
      if (priority === 'critical') return true;

      const strategy = optimizer.getLoadingStrategy();

      // Don't load large features on constrained connections
      if (featureSize > strategy.maxChunkSize) {
        return priority === 'high' && !networkConditions.saveData;
      }

      return true;
    },
    [optimizer, networkConditions.saveData]
  );

  return {
    deviceCapabilities: optimizer.getDeviceCapabilities(),
    networkConditions,
    loadingStrategy: optimizer.getLoadingStrategy(),
    shouldLoadFeature,
  };
}

/**
 * Hook for conditional feature loading
 */
export function useConditionalLoad<T>(
  loader: () => Promise<T>,
  options: {
    condition?: boolean;
    priority?: 'critical' | 'high' | 'normal' | 'low';
    fallback?: T;
    onError?: (error: Error) => void;
  } = {}
): { data: T | undefined; loading: boolean; error: Error | null } {
  const { condition = true, priority = 'normal', fallback, onError } = options;
  const optimizer = useRef(BundleOptimizer.getInstance());
  const [data, setData] = useState<T | undefined>(fallback);
  const [loading, setLoading] = useState(condition);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!condition) {
      return;
    }

    let cancelled = false;

    optimizer.current
      .importWithPriority(loader, { priority })
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const error = err instanceof Error ? err : new Error(String(err));
          setError(error);
          onError?.(error);
          if (fallback !== undefined) setData(fallback);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [condition, loader, priority, fallback, onError]);

  return { data, loading, error };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the global bundle optimizer instance
 */
export function getBundleOptimizer(config?: BundleOptimizerConfig): BundleOptimizer {
  return BundleOptimizer.getInstance(config);
}

/**
 * Reset the global optimizer (for testing)
 */
export function resetBundleOptimizer(): void {
  BundleOptimizer.reset();
}

/**
 * Load polyfills
 */
export async function loadPolyfills(): Promise<void> {
  return BundleOptimizer.getInstance().loadPolyfills();
}

/**
 * Get optimal module name
 */
export function getOptimalModule(moduleName: string): string {
  return BundleOptimizer.getInstance().getOptimalModule(moduleName);
}

/**
 * Format bytes helper
 */
export function formatBundleSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ============================================================================
// Exports
// ============================================================================

export default {
  BundleOptimizer,
  getBundleOptimizer,
  resetBundleOptimizer,
  detectDeviceCapabilities,
  detectNetworkConditions,
  loadPolyfills,
  getOptimalModule,
  formatBundleSize,
  useBundleOptimizer,
  useConditionalLoad,
};
