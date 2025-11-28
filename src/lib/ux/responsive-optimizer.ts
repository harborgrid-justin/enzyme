/**
 * @file Responsive Design Optimizer
 * @description Utilities for responsive design optimization including
 * breakpoint management, container queries, and adaptive loading.
 *
 * Features:
 * - Breakpoint management
 * - Container queries polyfill
 * - Responsive image handling
 * - Adaptive component loading
 * - Device capability detection
 * - Network-aware rendering
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Breakpoint definition
 */
export interface Breakpoint {
  name: string;
  minWidth: number;
  maxWidth?: number;
}

/**
 * Device capability info
 */
export interface DeviceCapabilities {
  touchScreen: boolean;
  highDPI: boolean;
  prefersReducedMotion: boolean;
  prefersColorScheme: 'light' | 'dark' | 'no-preference';
  saveData: boolean;
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
  deviceMemory: number | null;
  hardwareConcurrency: number | null;
}

/**
 * Viewport info
 */
export interface ViewportInfo {
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
  devicePixelRatio: number;
}

/**
 * Responsive configuration
 */
export interface ResponsiveConfig {
  /** Custom breakpoints */
  breakpoints?: Breakpoint[];
  /** Enable network-aware features */
  networkAware?: boolean;
  /** Enable device capability detection */
  detectCapabilities?: boolean;
  /** Debounce resize events (ms) */
  resizeDebounce?: number;
}

/**
 * Media query condition
 */
export type MediaQueryCondition = {
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  orientation?: 'portrait' | 'landscape';
  prefersColorScheme?: 'light' | 'dark';
  prefersReducedMotion?: 'reduce' | 'no-preference';
  hover?: 'hover' | 'none';
  pointer?: 'fine' | 'coarse' | 'none';
};

/**
 * Responsive callback
 */
export type ResponsiveCallback = (info: {
  breakpoint: string;
  viewport: ViewportInfo;
  capabilities: DeviceCapabilities;
}) => void;

// ============================================================================
// Constants
// ============================================================================

/**
 * Default breakpoints (similar to Tailwind CSS)
 */
export const DEFAULT_BREAKPOINTS: Breakpoint[] = [
  { name: 'xs', minWidth: 0, maxWidth: 639 },
  { name: 'sm', minWidth: 640, maxWidth: 767 },
  { name: 'md', minWidth: 768, maxWidth: 1023 },
  { name: 'lg', minWidth: 1024, maxWidth: 1279 },
  { name: 'xl', minWidth: 1280, maxWidth: 1535 },
  { name: '2xl', minWidth: 1536 },
];

// ============================================================================
// Responsive Manager
// ============================================================================

/**
 * Manages responsive behavior
 */
export class ResponsiveManager {
  private config: Required<ResponsiveConfig>;
  private breakpoints: Breakpoint[];
  private currentBreakpoint: string = '';
  private listeners: Set<ResponsiveCallback> = new Set();
  private resizeObserver: ResizeObserver | null = null;
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;
  private mediaQueryLists: Map<string, MediaQueryList> = new Map();

  constructor(config: ResponsiveConfig = {}) {
    this.config = {
      breakpoints: config.breakpoints ?? DEFAULT_BREAKPOINTS,
      networkAware: config.networkAware ?? true,
      detectCapabilities: config.detectCapabilities ?? true,
      resizeDebounce: config.resizeDebounce ?? 100,
    };
    this.breakpoints = this.config.breakpoints;
    this.init();
  }

  /**
   * Get current breakpoint name
   */
  getBreakpoint(): string {
    return this.currentBreakpoint;
  }

  /**
   * Get viewport info
   */
  getViewport(): ViewportInfo {
    if (typeof window === 'undefined') {
      return {
        width: 1024,
        height: 768,
        orientation: 'landscape',
        devicePixelRatio: 1,
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;

    return {
      width,
      height,
      orientation: width > height ? 'landscape' : 'portrait',
      devicePixelRatio: window.devicePixelRatio || 1,
    };
  }

  /**
   * Get device capabilities
   */
  getCapabilities(): DeviceCapabilities {
    if (typeof window === 'undefined') {
      return {
        touchScreen: false,
        highDPI: false,
        prefersReducedMotion: false,
        prefersColorScheme: 'light',
        saveData: false,
        effectiveType: 'unknown',
        deviceMemory: null,
        hardwareConcurrency: null,
      };
    }

    const nav = navigator as Navigator & {
      connection?: {
        effectiveType?: string;
        saveData?: boolean;
      };
      deviceMemory?: number;
    };

    return {
      touchScreen: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      highDPI: window.devicePixelRatio > 1,
      prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      prefersColorScheme: this.getColorScheme(),
      saveData: nav.connection?.saveData ?? false,
      effectiveType: (nav.connection?.effectiveType as DeviceCapabilities['effectiveType']) ?? 'unknown',
      deviceMemory: nav.deviceMemory ?? null,
      hardwareConcurrency: navigator.hardwareConcurrency ?? null,
    };
  }

  /**
   * Get color scheme preference
   */
  private getColorScheme(): 'light' | 'dark' | 'no-preference' {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'no-preference';
  }

  /**
   * Check if current breakpoint matches
   */
  isBreakpoint(name: string): boolean {
    return this.currentBreakpoint === name;
  }

  /**
   * Check if current breakpoint is at least the given size
   */
  isBreakpointAtLeast(name: string): boolean {
    const currentIndex = this.breakpoints.findIndex(
      (b) => b.name === this.currentBreakpoint
    );
    const targetIndex = this.breakpoints.findIndex((b) => b.name === name);
    return currentIndex >= targetIndex;
  }

  /**
   * Check if current breakpoint is at most the given size
   */
  isBreakpointAtMost(name: string): boolean {
    const currentIndex = this.breakpoints.findIndex(
      (b) => b.name === this.currentBreakpoint
    );
    const targetIndex = this.breakpoints.findIndex((b) => b.name === name);
    return currentIndex <= targetIndex;
  }

  /**
   * Create a media query from conditions
   */
  createMediaQuery(conditions: MediaQueryCondition): string {
    const parts: string[] = [];

    if (conditions.minWidth !== undefined) {
      parts.push(`(min-width: ${conditions.minWidth}px)`);
    }
    if (conditions.maxWidth !== undefined) {
      parts.push(`(max-width: ${conditions.maxWidth}px)`);
    }
    if (conditions.minHeight !== undefined) {
      parts.push(`(min-height: ${conditions.minHeight}px)`);
    }
    if (conditions.maxHeight !== undefined) {
      parts.push(`(max-height: ${conditions.maxHeight}px)`);
    }
    if (conditions.orientation) {
      parts.push(`(orientation: ${conditions.orientation})`);
    }
    if (conditions.prefersColorScheme) {
      parts.push(`(prefers-color-scheme: ${conditions.prefersColorScheme})`);
    }
    if (conditions.prefersReducedMotion) {
      parts.push(`(prefers-reduced-motion: ${conditions.prefersReducedMotion})`);
    }
    if (conditions.hover) {
      parts.push(`(hover: ${conditions.hover})`);
    }
    if (conditions.pointer) {
      parts.push(`(pointer: ${conditions.pointer})`);
    }

    return parts.join(' and ');
  }

  /**
   * Match a media query
   */
  matchMedia(query: string | MediaQueryCondition): boolean {
    if (typeof window === 'undefined') return false;

    const queryString = typeof query === 'string' ? query : this.createMediaQuery(query);
    return window.matchMedia(queryString).matches;
  }

  /**
   * Subscribe to media query changes
   */
  onMediaChange(
    query: string | MediaQueryCondition,
    callback: (matches: boolean) => void
  ): () => void {
    if (typeof window === 'undefined') return () => {};

    const queryString = typeof query === 'string' ? query : this.createMediaQuery(query);

    let mql = this.mediaQueryLists.get(queryString);
    if (!mql) {
      mql = window.matchMedia(queryString);
      this.mediaQueryLists.set(queryString, mql);
    }

    const handler = (event: MediaQueryListEvent): void => {
      callback(event.matches);
    };

    mql.addEventListener('change', handler);

    // Initial call
    callback(mql.matches);

    return () => {
      mql?.removeEventListener('change', handler);
    };
  }

  /**
   * Subscribe to responsive changes
   */
  subscribe(callback: ResponsiveCallback): () => void {
    this.listeners.add(callback);

    // Initial call
    callback({
      breakpoint: this.currentBreakpoint,
      viewport: this.getViewport(),
      capabilities: this.getCapabilities(),
    });

    return () => this.listeners.delete(callback);
  }

  /**
   * Get responsive value based on breakpoint
   */
  getValue<T>(values: Partial<Record<string, T>>, defaultValue: T): T {
    // Check current breakpoint first
    if (this.currentBreakpoint in values) {
      const value = values[this.currentBreakpoint];
      if (value !== undefined) return value;
    }

    // Fall back to smaller breakpoints
    for (let i = this.breakpoints.length - 1; i >= 0; i--) {
      const bp = this.breakpoints[i];
      if (!bp) continue;
      if (bp.name in values) {
        const value = values[bp.name];
        if (value !== undefined) return value;
      }
    }

    return defaultValue;
  }

  /**
   * Destroy the manager
   */
  destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = null;
    }

    this.listeners.clear();
    this.mediaQueryLists.clear();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private init(): void {
    if (typeof window === 'undefined') return;

    // Set initial breakpoint
    this.updateBreakpoint();

    // Listen for resize
    window.addEventListener('resize', this.handleResize);

    // Listen for orientation change
    window.addEventListener('orientationchange', this.handleResize);
  }

  private handleResize = (): void => {
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
    }

    this.resizeTimer = setTimeout(() => {
      this.updateBreakpoint();
    }, this.config.resizeDebounce);
  };

  private updateBreakpoint(): void {
    const viewport = this.getViewport();
    const newBreakpoint = this.getBreakpointForWidth(viewport.width);

    if (newBreakpoint !== this.currentBreakpoint) {
      this.currentBreakpoint = newBreakpoint;
      this.notifyListeners();
    }
  }

  private getBreakpointForWidth(width: number): string {
    for (const bp of this.breakpoints) {
      if (bp.maxWidth !== undefined) {
        if (width >= bp.minWidth && width <= bp.maxWidth) {
          return bp.name;
        }
      } else {
        if (width >= bp.minWidth) {
          return bp.name;
        }
      }
    }
    return this.breakpoints[0]?.name ?? 'unknown';
  }

  private notifyListeners(): void {
    const info = {
      breakpoint: this.currentBreakpoint,
      viewport: this.getViewport(),
      capabilities: this.getCapabilities(),
    };

    this.listeners.forEach((callback) => callback(info));
  }
}

// ============================================================================
// Container Query Utilities
// ============================================================================

/**
 * Container query condition
 */
export interface ContainerQueryCondition {
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
}

/**
 * Create container query observer
 */
export function createContainerQueryObserver(
  container: HTMLElement,
  queries: Array<{
    condition: ContainerQueryCondition;
    className: string;
  }>,
  callback?: (matches: Map<string, boolean>) => void
): { observe: () => void; disconnect: () => void } {
  let resizeObserver: ResizeObserver | null = null;

  const checkQueries = (): Map<string, boolean> => {
    const rect = container.getBoundingClientRect();
    const matches = new Map<string, boolean>();

    for (const query of queries) {
      const { condition, className } = query;
      let match = true;

      if (condition.minWidth !== undefined && rect.width < condition.minWidth) {
        match = false;
      }
      if (condition.maxWidth !== undefined && rect.width > condition.maxWidth) {
        match = false;
      }
      if (condition.minHeight !== undefined && rect.height < condition.minHeight) {
        match = false;
      }
      if (condition.maxHeight !== undefined && rect.height > condition.maxHeight) {
        match = false;
      }

      matches.set(className, match);

      if (match) {
        container.classList.add(className);
      } else {
        container.classList.remove(className);
      }
    }

    return matches;
  };

  const observe = (): void => {
    resizeObserver = new ResizeObserver(() => {
      const matches = checkQueries();
      callback?.(matches);
    });

    resizeObserver.observe(container);

    // Initial check
    const matches = checkQueries();
    callback?.(matches);
  };

  const disconnect = (): void => {
    resizeObserver?.disconnect();
    resizeObserver = null;

    // Remove all query classes
    for (const query of queries) {
      container.classList.remove(query.className);
    }
  };

  return { observe, disconnect };
}

// ============================================================================
// Responsive Image Utilities
// ============================================================================

/**
 * Generate srcset for responsive images
 */
export function generateSrcSet(
  baseUrl: string,
  widths: number[],
  format?: string
): string {
  return widths
    .map((width) => {
      const url = baseUrl.replace('{w}', String(width)).replace('{width}', String(width));
      const finalUrl = (format !== null && format !== undefined && format !== '') ? url.replace(/\.[^.]+$/, `.${format}`) : url;
      return `${finalUrl} ${width}w`;
    })
    .join(', ');
}

/**
 * Generate sizes attribute for responsive images
 */
export function generateSizes(
  breakpointSizes: Array<{ breakpoint: number; size: string }>,
  defaultSize: string
): string {
  const parts = breakpointSizes
    .sort((a, b) => b.breakpoint - a.breakpoint)
    .map(({ breakpoint, size }) => `(min-width: ${breakpoint}px) ${size}`);

  return [...parts, defaultSize].join(', ');
}

/**
 * Get optimal image width for current viewport
 */
export function getOptimalImageWidth(
  containerWidth: number,
  devicePixelRatio: number = window.devicePixelRatio || 1,
  widths: number[] = [320, 640, 768, 1024, 1280, 1536, 1920]
): number {
  const targetWidth = containerWidth * devicePixelRatio;

  // Find the smallest width that's larger than target
  for (const width of widths.sort((a, b) => a - b)) {
    if (width >= targetWidth) {
      return width;
    }
  }

  // Return largest available
  const lastWidth = widths[widths.length - 1];
  if (lastWidth === undefined) {
    throw new Error('No widths available');
  }
  return lastWidth;
}

// ============================================================================
// Adaptive Loading
// ============================================================================

/**
 * Adaptive loading configuration
 */
export interface AdaptiveLoadingConfig {
  /** Load high quality on fast connections */
  highQualityOnFastConnection: boolean;
  /** Use lite mode on slow connections */
  liteModeOnSlowConnection: boolean;
  /** Defer non-critical on slow connections */
  deferOnSlowConnection: boolean;
  /** Reduce animations on low memory devices */
  reduceAnimationsOnLowMemory: boolean;
  /** Memory threshold for low memory (GB) */
  lowMemoryThreshold: number;
}

const DEFAULT_ADAPTIVE_CONFIG: AdaptiveLoadingConfig = {
  highQualityOnFastConnection: true,
  liteModeOnSlowConnection: true,
  deferOnSlowConnection: true,
  reduceAnimationsOnLowMemory: true,
  lowMemoryThreshold: 4,
};

/**
 * Get adaptive loading recommendations
 */
export function getAdaptiveLoadingRecommendations(
  capabilities: DeviceCapabilities,
  config: Partial<AdaptiveLoadingConfig> = {}
): {
  useHighQuality: boolean;
  useLiteMode: boolean;
  deferNonCritical: boolean;
  reduceAnimations: boolean;
} {
  const fullConfig = { ...DEFAULT_ADAPTIVE_CONFIG, ...config };

  const isFastConnection = capabilities.effectiveType === '4g';
  const isSlowConnection =
    capabilities.effectiveType === '2g' || capabilities.effectiveType === 'slow-2g';
  const isLowMemory =
    capabilities.deviceMemory !== null &&
    capabilities.deviceMemory < fullConfig.lowMemoryThreshold;

  return {
    useHighQuality: fullConfig.highQualityOnFastConnection && isFastConnection && !capabilities.saveData,
    useLiteMode:
      fullConfig.liteModeOnSlowConnection && (isSlowConnection || capabilities.saveData),
    deferNonCritical:
      fullConfig.deferOnSlowConnection && (isSlowConnection || capabilities.saveData),
    reduceAnimations:
      fullConfig.reduceAnimationsOnLowMemory &&
      (isLowMemory || capabilities.prefersReducedMotion),
  };
}

// ============================================================================
// Singleton Instance
// ============================================================================

let managerInstance: ResponsiveManager | null = null;

/**
 * Get or create the global responsive manager
 */
export function getResponsiveManager(config?: ResponsiveConfig): ResponsiveManager {
  managerInstance ??= new ResponsiveManager(config);
  return managerInstance;
}

/**
 * Reset the manager instance
 */
export function resetResponsiveManager(): void {
  if (managerInstance) {
    managerInstance.destroy();
    managerInstance = null;
  }
}

// ============================================================================
// CSS Export
// ============================================================================

export const responsiveStyles = `
  /* Container query support */
  .cq-container {
    container-type: inline-size;
  }

  /* Responsive utilities */
  .hide-on-mobile {
    display: none;
  }

  @media (min-width: 768px) {
    .hide-on-mobile {
      display: block;
    }
  }

  .hide-on-desktop {
    display: block;
  }

  @media (min-width: 768px) {
    .hide-on-desktop {
      display: none;
    }
  }

  /* Touch-friendly spacing */
  @media (pointer: coarse) {
    .touch-target {
      min-height: 44px;
      min-width: 44px;
    }
  }

  /* High DPI adjustments */
  @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
    .border-hairline {
      border-width: 0.5px;
    }
  }
`;
