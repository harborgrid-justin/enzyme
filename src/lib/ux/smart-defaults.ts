/**
 * @file Smart Defaults System
 * @description PhD-level intelligent default configuration that adapts to device
 * capabilities, network conditions, and user preferences for optimal out-of-box experience.
 *
 * Features:
 * - Device-aware configurations
 * - Network-adaptive settings
 * - User preference detection
 * - Progressive capability enhancement
 * - Memory and CPU-aware defaults
 */

import { useEffect, useMemo, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

/**
 * Device tier for capability-based defaults
 */
export type DeviceTier = 'high' | 'medium' | 'low';

/**
 * Network tier for bandwidth-based defaults
 */
export type NetworkTier = 'fast' | 'moderate' | 'slow' | 'offline';

/**
 * User preference categories
 */
export interface UserPreferences {
  /** Prefers reduced motion */
  reducedMotion: boolean;
  /** Prefers dark mode */
  darkMode: boolean;
  /** Prefers high contrast */
  highContrast: boolean;
  /** Data saver enabled */
  dataSaver: boolean;
  /** Prefers reduced transparency */
  reducedTransparency: boolean;
  /** Language preference */
  language: string;
}

/**
 * Animation defaults
 */
export interface AnimationDefaults {
  /** Duration multiplier */
  durationMultiplier: number;
  /** Enable animations */
  enabled: boolean;
  /** Easing function */
  easing: string;
  /** Max concurrent animations */
  maxConcurrent: number;
  /** Use GPU acceleration */
  useGPU: boolean;
}

/**
 * Image loading defaults
 */
export interface ImageDefaults {
  /** Enable lazy loading */
  lazyLoad: boolean;
  /** Image quality (0-100) */
  quality: number;
  /** Enable blur-up placeholders */
  blurUp: boolean;
  /** Enable WebP format */
  webp: boolean;
  /** Enable AVIF format */
  avif: boolean;
  /** Max width */
  maxWidth: number;
}

/**
 * Data fetching defaults
 */
export interface FetchDefaults {
  /** Stale time in ms */
  staleTime: number;
  /** Cache time in ms */
  cacheTime: number;
  /** Retry count */
  retryCount: number;
  /** Retry delay in ms */
  retryDelay: number;
  /** Enable background refetch */
  backgroundRefetch: boolean;
  /** Request timeout in ms */
  timeout: number;
}

/**
 * Performance defaults
 */
export interface PerformanceDefaults {
  /** Enable performance monitoring */
  monitoring: boolean;
  /** Enable prefetching */
  prefetch: boolean;
  /** Prefetch distance (routes ahead) */
  prefetchDistance: number;
  /** Enable code splitting */
  codeSplitting: boolean;
  /** Virtual list threshold */
  virtualListThreshold: number;
  /** Debounce delay in ms */
  debounceDelay: number;
  /** Throttle delay in ms */
  throttleDelay: number;
}

/**
 * Rendering defaults
 */
export interface RenderDefaults {
  /** Batch updates */
  batchUpdates: boolean;
  /** Defer non-critical renders */
  deferNonCritical: boolean;
  /** Use concurrent mode features */
  concurrent: boolean;
  /** Suspense timeout in ms */
  suspenseTimeout: number;
  /** Enable render tracking */
  trackRenders: boolean;
}

/**
 * Complete smart defaults
 */
export interface SmartDefaults {
  /** Device tier */
  deviceTier: DeviceTier;
  /** Network tier */
  networkTier: NetworkTier;
  /** User preferences */
  preferences: UserPreferences;
  /** Animation defaults */
  animation: AnimationDefaults;
  /** Image defaults */
  image: ImageDefaults;
  /** Fetch defaults */
  fetch: FetchDefaults;
  /** Performance defaults */
  performance: PerformanceDefaults;
  /** Render defaults */
  render: RenderDefaults;
}

/**
 * Override configuration
 */
export interface SmartDefaultsOverrides {
  animation?: Partial<AnimationDefaults>;
  image?: Partial<ImageDefaults>;
  fetch?: Partial<FetchDefaults>;
  performance?: Partial<PerformanceDefaults>;
  render?: Partial<RenderDefaults>;
}

// ============================================================================
// Detection Functions
// ============================================================================

/**
 * Detect device tier based on hardware capabilities
 */
export function detectDeviceTier(): DeviceTier {
  if (typeof navigator === 'undefined') return 'medium';

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    hardwareConcurrency?: number;
  };

  const cores = nav.hardwareConcurrency || 2;
  const memory = nav.deviceMemory || 4;

  // High-end: 8+ cores or 8+ GB memory
  if (cores >= 8 || memory >= 8) return 'high';

  // Low-end: 2 or fewer cores or less than 4 GB memory
  if (cores <= 2 || memory < 4) return 'low';

  return 'medium';
}

/**
 * Detect network tier based on connection
 */
export function detectNetworkTier(): NetworkTier {
  if (typeof navigator === 'undefined') return 'moderate';

  if (!navigator.onLine) return 'offline';

  const connection = (navigator as Navigator & {
    connection?: {
      effectiveType?: string;
      downlink?: number;
      saveData?: boolean;
    };
  }).connection;

  if (!connection) return 'moderate';

  // Respect data saver
  if (connection.saveData) return 'slow';

  const effectiveType = connection.effectiveType;
  if (effectiveType === '4g' && (connection.downlink || 0) > 5) return 'fast';
  if (effectiveType === '4g' || effectiveType === '3g') return 'moderate';
  return 'slow';
}

/**
 * Detect user preferences
 */
export function detectUserPreferences(): UserPreferences {
  if (typeof window === 'undefined') {
    return {
      reducedMotion: false,
      darkMode: false,
      highContrast: false,
      dataSaver: false,
      reducedTransparency: false,
      language: 'en',
    };
  }

  return {
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
    highContrast: window.matchMedia('(prefers-contrast: more)').matches,
    dataSaver: (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData ?? false,
    reducedTransparency: window.matchMedia('(prefers-reduced-transparency: reduce)').matches,
    language: navigator.language || 'en',
  };
}

// ============================================================================
// Default Calculations
// ============================================================================

/**
 * Calculate animation defaults
 */
function calculateAnimationDefaults(
  deviceTier: DeviceTier,
  preferences: UserPreferences
): AnimationDefaults {
  // Disable animations if user prefers reduced motion
  if (preferences.reducedMotion) {
    return {
      durationMultiplier: 0,
      enabled: false,
      easing: 'linear',
      maxConcurrent: 0,
      useGPU: false,
    };
  }

  const tierConfig: Record<DeviceTier, AnimationDefaults> = {
    high: {
      durationMultiplier: 1,
      enabled: true,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      maxConcurrent: 10,
      useGPU: true,
    },
    medium: {
      durationMultiplier: 0.8,
      enabled: true,
      easing: 'ease-out',
      maxConcurrent: 5,
      useGPU: true,
    },
    low: {
      durationMultiplier: 0.5,
      enabled: true,
      easing: 'ease',
      maxConcurrent: 2,
      useGPU: false,
    },
  };

  return tierConfig[deviceTier];
}

/**
 * Calculate image defaults
 */
function calculateImageDefaults(
  deviceTier: DeviceTier,
  networkTier: NetworkTier,
  preferences: UserPreferences
): ImageDefaults {
  // Base quality on network and data saver
  let quality = 80;
  if (preferences.dataSaver || networkTier === 'slow') {
    quality = 60;
  } else if (networkTier === 'fast' && deviceTier === 'high') {
    quality = 90;
  }

  // Max width based on device and network
  let maxWidth = 1920;
  if (deviceTier === 'low' || networkTier === 'slow') {
    maxWidth = 1280;
  } else if (preferences.dataSaver) {
    maxWidth = 1024;
  }

  return {
    lazyLoad: true,
    quality,
    blurUp: networkTier !== 'fast' && deviceTier !== 'low',
    webp: true,
    avif: deviceTier === 'high' && networkTier === 'fast',
    maxWidth,
  };
}

/**
 * Calculate fetch defaults
 */
function calculateFetchDefaults(
  networkTier: NetworkTier,
  preferences: UserPreferences
): FetchDefaults {
  const tierConfig: Record<NetworkTier, FetchDefaults> = {
    fast: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 30 * 60 * 1000, // 30 minutes
      retryCount: 3,
      retryDelay: 1000,
      backgroundRefetch: true,
      timeout: 10000,
    },
    moderate: {
      staleTime: 10 * 60 * 1000, // 10 minutes
      cacheTime: 60 * 60 * 1000, // 1 hour
      retryCount: 3,
      retryDelay: 2000,
      backgroundRefetch: true,
      timeout: 20000,
    },
    slow: {
      staleTime: 30 * 60 * 1000, // 30 minutes
      cacheTime: 2 * 60 * 60 * 1000, // 2 hours
      retryCount: 5,
      retryDelay: 3000,
      backgroundRefetch: false,
      timeout: 30000,
    },
    offline: {
      staleTime: Infinity,
      cacheTime: Infinity,
      retryCount: 0,
      retryDelay: 0,
      backgroundRefetch: false,
      timeout: 0,
    },
  };

  const defaults = tierConfig[networkTier];

  // Adjust for data saver
  if (preferences.dataSaver) {
    defaults.backgroundRefetch = false;
    defaults.staleTime *= 2;
  }

  return defaults;
}

/**
 * Calculate performance defaults
 */
function calculatePerformanceDefaults(
  deviceTier: DeviceTier,
  networkTier: NetworkTier
): PerformanceDefaults {
  return {
    monitoring: true,
    prefetch: networkTier !== 'offline' && networkTier !== 'slow',
    prefetchDistance: deviceTier === 'high' ? 3 : deviceTier === 'medium' ? 2 : 1,
    codeSplitting: true,
    virtualListThreshold: deviceTier === 'high' ? 100 : deviceTier === 'medium' ? 50 : 20,
    debounceDelay: deviceTier === 'high' ? 150 : deviceTier === 'medium' ? 200 : 300,
    throttleDelay: deviceTier === 'high' ? 100 : deviceTier === 'medium' ? 150 : 200,
  };
}

/**
 * Calculate render defaults
 */
function calculateRenderDefaults(deviceTier: DeviceTier): RenderDefaults {
  return {
    batchUpdates: true,
    deferNonCritical: deviceTier !== 'high',
    concurrent: deviceTier !== 'low',
    suspenseTimeout: deviceTier === 'high' ? 3000 : deviceTier === 'medium' ? 5000 : 10000,
    trackRenders: deviceTier !== 'low',
  };
}

// ============================================================================
// Smart Defaults Manager
// ============================================================================

/**
 * Manages smart defaults
 */
export class SmartDefaultsManager {
  private static instance: SmartDefaultsManager;
  private defaults: SmartDefaults;
  private overrides: SmartDefaultsOverrides = {};
  private updateCallbacks: Set<(defaults: SmartDefaults) => void> = new Set();

  constructor() {
    this.defaults = this.calculateDefaults();
    this.setupListeners();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): SmartDefaultsManager {
    if (!SmartDefaultsManager.instance) {
      SmartDefaultsManager.instance = new SmartDefaultsManager();
    }
    return SmartDefaultsManager.instance;
  }

  /**
   * Reset singleton
   */
  static reset(): void {
    // Type-safe null assignment for singleton reset
    (SmartDefaultsManager as { instance: SmartDefaultsManager | null }).instance = null;
  }

  /**
   * Calculate all defaults
   */
  private calculateDefaults(): SmartDefaults {
    const deviceTier = detectDeviceTier();
    const networkTier = detectNetworkTier();
    const preferences = detectUserPreferences();

    return {
      deviceTier,
      networkTier,
      preferences,
      animation: calculateAnimationDefaults(deviceTier, preferences),
      image: calculateImageDefaults(deviceTier, networkTier, preferences),
      fetch: calculateFetchDefaults(networkTier, preferences),
      performance: calculatePerformanceDefaults(deviceTier, networkTier),
      render: calculateRenderDefaults(deviceTier),
    };
  }

  /**
   * Setup listeners for changes
   */
  private setupListeners(): void {
    if (typeof window === 'undefined') return;

    // Network changes
    const connection = (navigator as Navigator & {
      connection?: EventTarget;
    }).connection;

    if (connection) {
      connection.addEventListener('change', () => this.recalculate());
    }

    // Online/offline
    window.addEventListener('online', () => this.recalculate());
    window.addEventListener('offline', () => this.recalculate());

    // Preference changes
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => this.recalculate());
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => this.recalculate());
    window.matchMedia('(prefers-contrast: more)').addEventListener('change', () => this.recalculate());
  }

  /**
   * Recalculate defaults
   */
  recalculate(): void {
    this.defaults = this.calculateDefaults();
    this.notifyUpdate();
  }

  /**
   * Get current defaults with overrides
   */
  getDefaults(): SmartDefaults {
    return {
      ...this.defaults,
      animation: { ...this.defaults.animation, ...this.overrides.animation },
      image: { ...this.defaults.image, ...this.overrides.image },
      fetch: { ...this.defaults.fetch, ...this.overrides.fetch },
      performance: { ...this.defaults.performance, ...this.overrides.performance },
      render: { ...this.defaults.render, ...this.overrides.render },
    };
  }

  /**
   * Set overrides
   */
  setOverrides(overrides: SmartDefaultsOverrides): void {
    this.overrides = { ...this.overrides, ...overrides };
    this.notifyUpdate();
  }

  /**
   * Clear overrides
   */
  clearOverrides(): void {
    this.overrides = {};
    this.notifyUpdate();
  }

  /**
   * Subscribe to updates
   */
  subscribe(callback: (defaults: SmartDefaults) => void): () => void {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  }

  /**
   * Notify subscribers
   */
  private notifyUpdate(): void {
    const defaults = this.getDefaults();
    this.updateCallbacks.forEach((cb) => cb(defaults));
  }
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for accessing smart defaults
 */
export function useSmartDefaults(overrides?: SmartDefaultsOverrides): SmartDefaults {
  const manager = useMemo(() => SmartDefaultsManager.getInstance(), []);
  const [defaults, setDefaults] = useState(() => manager.getDefaults());

  useEffect(() => {
    if (overrides) {
      manager.setOverrides(overrides);
    }

    return manager.subscribe(setDefaults);
  }, [manager, overrides]);

  return defaults;
}

/**
 * Hook for specific default category
 */
export function useAnimationDefaults(): AnimationDefaults {
  const { animation } = useSmartDefaults();
  return animation;
}

export function useImageDefaults(): ImageDefaults {
  const { image } = useSmartDefaults();
  return image;
}

export function useFetchDefaults(): FetchDefaults {
  const { fetch } = useSmartDefaults();
  return fetch;
}

export function usePerformanceDefaults(): PerformanceDefaults {
  const { performance } = useSmartDefaults();
  return performance;
}

export function useRenderDefaults(): RenderDefaults {
  const { render } = useSmartDefaults();
  return render;
}

/**
 * Hook for conditional feature based on defaults
 */
export function useConditionalFeature(
  featureCheck: (defaults: SmartDefaults) => boolean
): boolean {
  const defaults = useSmartDefaults();
  return useMemo(() => featureCheck(defaults), [defaults, featureCheck]);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get smart defaults manager
 */
export function getSmartDefaults(): SmartDefaults {
  return SmartDefaultsManager.getInstance().getDefaults();
}

/**
 * Set smart defaults overrides
 */
export function setSmartDefaultsOverrides(overrides: SmartDefaultsOverrides): void {
  SmartDefaultsManager.getInstance().setOverrides(overrides);
}

/**
 * Reset smart defaults
 */
export function resetSmartDefaults(): void {
  SmartDefaultsManager.reset();
}

// ============================================================================
// Exports
// ============================================================================

export default {
  SmartDefaultsManager,
  detectDeviceTier,
  detectNetworkTier,
  detectUserPreferences,
  getSmartDefaults,
  setSmartDefaultsOverrides,
  resetSmartDefaults,
  useSmartDefaults,
  useAnimationDefaults,
  useImageDefaults,
  useFetchDefaults,
  usePerformanceDefaults,
  useRenderDefaults,
  useConditionalFeature,
};
