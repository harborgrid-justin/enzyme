/**
 * @file Asset Prefetching
 * @description Static asset prefetching for images, fonts, scripts, and stylesheets.
 * Optimizes loading of critical and non-critical assets.
 *
 * Features:
 * - Image prefetching with responsive support
 * - Font prefetching with display strategies
 * - Script and stylesheet prefetching
 * - Asset prioritization
 * - Responsive image prefetching
 * - Network-aware asset loading
 */

import {
  getPrefetchQueue,
  type PrefetchQueue,
  type PrefetchPriority,
} from './prefetch-queue';

// ============================================================================
// Types
// ============================================================================

/**
 * Asset type
 */
export type AssetType = 'image' | 'font' | 'script' | 'style' | 'video' | 'audio' | 'document';

/**
 * Asset definition
 */
export interface Asset {
  url: string;
  type: AssetType;
  priority?: PrefetchPriority;
  crossOrigin?: 'anonymous' | 'use-credentials';
  as?: string;
  media?: string;
  sizes?: string;
  srcset?: string;
}

/**
 * Image asset with responsive support
 */
export interface ResponsiveImage {
  src: string;
  srcset?: Array<{ url: string; width: number }>;
  sizes?: string;
  alt?: string;
  priority?: PrefetchPriority;
}

/**
 * Font asset configuration
 */
export interface FontAsset {
  url: string;
  family: string;
  weight?: string | number;
  style?: 'normal' | 'italic';
  display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
  unicodeRange?: string;
  priority?: PrefetchPriority;
}

/**
 * Asset prefetch configuration
 */
export interface AssetPrefetchConfig {
  /** Enable asset prefetching */
  enabled: boolean;
  /** Network quality awareness */
  networkAware: boolean;
  /** Minimum network quality for prefetch */
  minNetworkQuality: '4g' | '3g' | '2g' | 'slow-2g';
  /** Maximum concurrent prefetches */
  maxConcurrent: number;
  /** Prefetch images by default */
  prefetchImages: boolean;
  /** Prefetch fonts by default */
  prefetchFonts: boolean;
  /** Use responsive image prefetching */
  responsiveImages: boolean;
  /** Default image priority */
  defaultImagePriority: PrefetchPriority;
  /** Default font priority */
  defaultFontPriority: PrefetchPriority;
  /** Debug mode */
  debug: boolean;
}

/**
 * Prefetch result
 */
export interface AssetPrefetchResult {
  url: string;
  type: AssetType;
  success: boolean;
  duration: number;
  size?: number;
  error?: Error;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: AssetPrefetchConfig = {
  enabled: true,
  networkAware: true,
  minNetworkQuality: '3g',
  maxConcurrent: 4,
  prefetchImages: true,
  prefetchFonts: true,
  responsiveImages: true,
  defaultImagePriority: 'normal',
  defaultFontPriority: 'high',
  debug: false,
};

const NETWORK_QUALITY_ORDER: Record<string, number> = {
  '4g': 4,
  '3g': 3,
  '2g': 2,
  'slow-2g': 1,
};

// ============================================================================
// Asset Prefetch Manager
// ============================================================================

/**
 * Manages asset prefetching
 */
export class AssetPrefetchManager {
  private config: AssetPrefetchConfig;
  private queue: PrefetchQueue;
  private prefetchedAssets: Set<string> = new Set();
  private loadedFonts: Set<string> = new Set();

  constructor(config: Partial<AssetPrefetchConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.queue = getPrefetchQueue({ maxConcurrent: this.config.maxConcurrent });
  }

  /**
   * Prefetch an asset
   */
  async prefetch(asset: Asset): Promise<AssetPrefetchResult> {
    const startTime = performance.now();

    if (!this.config.enabled) {
      return {
        url: asset.url,
        type: asset.type,
        success: false,
        duration: 0,
        error: new Error('Asset prefetch disabled'),
      };
    }

    if (this.prefetchedAssets.has(asset.url)) {
      return {
        url: asset.url,
        type: asset.type,
        success: true,
        duration: 0,
      };
    }

    if (!this.shouldPrefetch()) {
      return {
        url: asset.url,
        type: asset.type,
        success: false,
        duration: 0,
        error: new Error('Network conditions not suitable'),
      };
    }

    this.log(`Prefetching asset: ${asset.url}`);

    try {
      const size = await this.prefetchByType(asset);
      this.prefetchedAssets.add(asset.url);

      const duration = performance.now() - startTime;
      this.log(`Asset prefetched: ${asset.url} (${duration.toFixed(2)}ms)`);

      return {
        url: asset.url,
        type: asset.type,
        success: true,
        duration,
        size,
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      this.log(`Asset prefetch failed: ${asset.url}`, error);

      return {
        url: asset.url,
        type: asset.type,
        success: false,
        duration,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Prefetch multiple assets
   */
  async prefetchMany(assets: Asset[]): Promise<AssetPrefetchResult[]> {
    const results: AssetPrefetchResult[] = [];

    // Sort by priority
    const sorted = [...assets].sort((a, b) => {
      const priorityOrder: Record<PrefetchPriority, number> = {
        critical: 0,
        high: 1,
        normal: 2,
        low: 3,
        idle: 4,
      };
      const priorityA = priorityOrder[a.priority || 'normal'];
      const priorityB = priorityOrder[b.priority || 'normal'];
      return priorityA - priorityB;
    });

    for (const asset of sorted) {
      const result = await this.prefetch(asset);
      results.push(result);
    }

    return results;
  }

  /**
   * Prefetch an image with responsive support
   */
  async prefetchImage(image: ResponsiveImage): Promise<AssetPrefetchResult> {
    const url = this.config.responsiveImages && image.srcset
      ? this.selectResponsiveSource(image.srcset)
      : image.src;

    return this.prefetch({
      url,
      type: 'image',
      priority: image.priority || this.config.defaultImagePriority,
    });
  }

  /**
   * Prefetch multiple images
   */
  async prefetchImages(images: Array<string | ResponsiveImage>): Promise<AssetPrefetchResult[]> {
    const assets: Asset[] = images.map((img) => {
      if (typeof img === 'string') {
        return {
          url: img,
          type: 'image' as AssetType,
          priority: this.config.defaultImagePriority,
        };
      }

      const url = this.config.responsiveImages && img.srcset
        ? this.selectResponsiveSource(img.srcset)
        : img.src;

      return {
        url,
        type: 'image' as AssetType,
        priority: img.priority || this.config.defaultImagePriority,
      };
    });

    return this.prefetchMany(assets);
  }

  /**
   * Prefetch a font
   */
  async prefetchFont(font: FontAsset): Promise<AssetPrefetchResult> {
    const startTime = performance.now();

    if (this.loadedFonts.has(font.url)) {
      return {
        url: font.url,
        type: 'font',
        success: true,
        duration: 0,
      };
    }

    this.log(`Prefetching font: ${font.family}`);

    try {
      // Create preload link
      this.createPreloadLink(font.url, 'font', {
        crossOrigin: 'anonymous',
      });

      // Use CSS Font Loading API if available
      if ('FontFace' in window) {
        const fontFace = new FontFace(font.family, `url(${font.url})`, {
          weight: String(font.weight || 'normal'),
          style: font.style || 'normal',
          display: font.display || 'swap',
          unicodeRange: font.unicodeRange,
        });

        await fontFace.load();
        document.fonts.add(fontFace);
      }

      this.loadedFonts.add(font.url);
      this.prefetchedAssets.add(font.url);

      const duration = performance.now() - startTime;
      this.log(`Font prefetched: ${font.family} (${duration.toFixed(2)}ms)`);

      return {
        url: font.url,
        type: 'font',
        success: true,
        duration,
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      this.log(`Font prefetch failed: ${font.family}`, error);

      return {
        url: font.url,
        type: 'font',
        success: false,
        duration,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Prefetch multiple fonts
   */
  async prefetchFonts(fonts: FontAsset[]): Promise<AssetPrefetchResult[]> {
    const results: AssetPrefetchResult[] = [];

    for (const font of fonts) {
      const result = await this.prefetchFont(font);
      results.push(result);
    }

    return results;
  }

  /**
   * Prefetch a script
   */
  prefetchScript(url: string, priority?: PrefetchPriority): void {
    if (this.prefetchedAssets.has(url)) {
      return;
    }

    this.queue.enqueue(url, {
      type: 'script',
      priority: priority || 'normal',
    });

    this.prefetchedAssets.add(url);
  }

  /**
   * Prefetch a stylesheet
   */
  prefetchStyle(url: string, priority?: PrefetchPriority): void {
    if (this.prefetchedAssets.has(url)) {
      return;
    }

    this.queue.enqueue(url, {
      type: 'style',
      priority: priority || 'high',
    });

    this.prefetchedAssets.add(url);
  }

  /**
   * Preload a critical asset
   */
  preload(url: string, as: string, options: {
    crossOrigin?: 'anonymous' | 'use-credentials';
    type?: string;
    media?: string;
  } = {}): HTMLLinkElement {
    return this.createPreloadLink(url, as, options);
  }

  /**
   * Create DNS prefetch hint
   */
  dnsPrefetch(hostname: string): void {
    if (document.querySelector(`link[rel="dns-prefetch"][href="${hostname}"]`)) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = hostname;
    document.head.appendChild(link);

    this.log(`DNS prefetch: ${hostname}`);
  }

  /**
   * Create preconnect hint
   */
  preconnect(origin: string, crossOrigin?: boolean): void {
    if (document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    if (crossOrigin) {
      link.crossOrigin = 'anonymous';
    }
    document.head.appendChild(link);

    this.log(`Preconnect: ${origin}`);
  }

  /**
   * Check if asset was prefetched
   */
  isPrefetched(url: string): boolean {
    return this.prefetchedAssets.has(url);
  }

  /**
   * Get prefetch statistics
   */
  getStats(): {
    prefetchedAssets: number;
    loadedFonts: number;
    queueStats: ReturnType<PrefetchQueue['getStats']>;
  } {
    return {
      prefetchedAssets: this.prefetchedAssets.size,
      loadedFonts: this.loadedFonts.size,
      queueStats: this.queue.getStats(),
    };
  }

  /**
   * Clear prefetch tracking
   */
  clear(): void {
    this.prefetchedAssets.clear();
    this.loadedFonts.clear();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async prefetchByType(asset: Asset): Promise<number | undefined> {
    switch (asset.type) {
      case 'image':
        return this.prefetchImageUrl(asset.url);
      case 'font':
        this.createPreloadLink(asset.url, 'font', {
          crossOrigin: asset.crossOrigin || 'anonymous',
        });
        return undefined;
      case 'script':
        this.queue.enqueue(asset.url, {
          type: 'script',
          priority: asset.priority || 'normal',
        });
        return undefined;
      case 'style':
        this.queue.enqueue(asset.url, {
          type: 'style',
          priority: asset.priority || 'high',
        });
        return undefined;
      case 'video':
      case 'audio':
        this.createPreloadLink(asset.url, asset.type);
        return undefined;
      case 'document':
        this.queue.enqueue(asset.url, {
          type: 'document',
          priority: asset.priority || 'normal',
        });
        return undefined;
      default:
        this.createPrefetchLink(asset.url);
        return undefined;
    }
  }

  private async prefetchImageUrl(url: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Estimate size (rough calculation)
        const size = img.naturalWidth * img.naturalHeight * 4;
        resolve(size);
      };
      img.onerror = () => reject(new Error(`Failed to prefetch image: ${url}`));
      img.src = url;
    });
  }

  private selectResponsiveSource(srcset: Array<{ url: string; width: number }>): string {
    if (typeof window === 'undefined') {
      return srcset[0]?.url || '';
    }

    const dpr = window.devicePixelRatio || 1;
    const viewportWidth = window.innerWidth * dpr;

    // Find the best matching source
    const sorted = [...srcset].sort((a, b) => a.width - b.width);
    const best = sorted.find((s) => s.width >= viewportWidth) || sorted[sorted.length - 1];

    return best?.url || '';
  }

  private createPreloadLink(
    url: string,
    as: string,
    options: {
      crossOrigin?: 'anonymous' | 'use-credentials';
      type?: string;
      media?: string;
    } = {}
  ): HTMLLinkElement {
    // Check if already exists
    const existing = document.querySelector(`link[rel="preload"][href="${url}"]`);
    if (existing) {
      return existing as HTMLLinkElement;
    }

    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = as;

    if (options.crossOrigin) {
      link.crossOrigin = options.crossOrigin;
    }

    if (options.type) {
      link.type = options.type;
    }

    if (options.media) {
      link.media = options.media;
    }

    document.head.appendChild(link);
    return link;
  }

  private createPrefetchLink(url: string): HTMLLinkElement {
    // Check if already exists
    const existing = document.querySelector(`link[rel="prefetch"][href="${url}"]`);
    if (existing) {
      return existing as HTMLLinkElement;
    }

    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
    return link;
  }

  private shouldPrefetch(): boolean {
    if (!this.config.networkAware) {
      return true;
    }

    const connection = this.getNetworkInfo();
    if (!connection) {
      return true;
    }

    if (connection.saveData) {
      this.log('Skipping prefetch: Data saver enabled');
      return false;
    }

    if (connection.effectiveType) {
      const currentQuality = NETWORK_QUALITY_ORDER[connection.effectiveType] || 3;
      const minQuality = NETWORK_QUALITY_ORDER[this.config.minNetworkQuality] || 3;

      if (currentQuality < minQuality) {
        this.log(`Skipping prefetch: Network quality ${connection.effectiveType} below minimum`);
        return false;
      }
    }

    return true;
  }

  private getNetworkInfo(): {
    effectiveType?: string;
    saveData?: boolean;
  } | null {
    const nav = navigator as Navigator & {
      connection?: {
        effectiveType?: string;
        saveData?: boolean;
      };
    };
    return nav.connection || null;
  }

  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      console.log(`[AssetPrefetch] ${message}`, ...args);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let managerInstance: AssetPrefetchManager | null = null;

/**
 * Get or create the global asset prefetch manager
 */
export function getAssetPrefetchManager(
  config?: Partial<AssetPrefetchConfig>
): AssetPrefetchManager {
  if (!managerInstance) {
    managerInstance = new AssetPrefetchManager(config);
  }
  return managerInstance;
}

/**
 * Reset the manager instance
 */
export function resetAssetPrefetchManager(): void {
  if (managerInstance) {
    managerInstance.clear();
    managerInstance = null;
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Prefetch an image
 */
export async function prefetchImage(url: string, priority?: PrefetchPriority): Promise<AssetPrefetchResult> {
  return getAssetPrefetchManager().prefetch({
    url,
    type: 'image',
    priority,
  });
}

/**
 * Prefetch images
 */
export async function prefetchImages(urls: string[]): Promise<AssetPrefetchResult[]> {
  return getAssetPrefetchManager().prefetchImages(urls);
}

/**
 * Prefetch a font
 */
export async function prefetchFont(font: FontAsset): Promise<AssetPrefetchResult> {
  return getAssetPrefetchManager().prefetchFont(font);
}

/**
 * Create DNS prefetch hint
 */
export function dnsPrefetch(hostname: string): void {
  getAssetPrefetchManager().dnsPrefetch(hostname);
}

/**
 * Create preconnect hint
 */
export function preconnect(origin: string, crossOrigin?: boolean): void {
  getAssetPrefetchManager().preconnect(origin, crossOrigin);
}

/**
 * Preload a critical asset
 */
export function preloadAsset(
  url: string,
  as: string,
  options?: Parameters<AssetPrefetchManager['preload']>[2]
): HTMLLinkElement {
  return getAssetPrefetchManager().preload(url, as, options);
}
