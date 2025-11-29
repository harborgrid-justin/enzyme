/**
 * @file Progressive Enhancement Utilities
 * @description Utility functions and constants for progressive enhancement
 */

// ============================================================================
// Constants
// ============================================================================

/**
 * Default browser capabilities for SSR
 */
export const DEFAULT_CAPABILITIES = {
  esModules: true,
  asyncAwait: true,
  webGL: true,
  webGL2: true,
  webP: true,
  avif: true,
  serviceWorker: true,
  webWorker: true,
  sharedArrayBuffer: false,
  intersectionObserver: true,
  resizeObserver: true,
  cssGrid: true,
  containerQueries: true,
  cssHas: true,
  viewTransitions: true,
  navigationAPI: true,
  broadcastChannel: true,
  webLocks: true,
  storage: true,
  indexedDB: true,
  webAssembly: true,
  bigInt: true,
  proxy: true,
  weakMap: true,
  fetch: true,
  streams: true,
  modules: true,
  dynamicImport: true,
  topLevelAwait: true,
  popoverAPI: true,
  webAnimations: true,
  idleCallback: true,
  intl: true,
} as const;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get default capabilities
 */
export function getDefaultCapabilities(): typeof DEFAULT_CAPABILITIES {
  return DEFAULT_CAPABILITIES;
}

/**
 * Check WebP support asynchronously
 */
export async function checkWebPSupport(): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.width > 0 && img.height > 0);
    img.onerror = () => resolve(false);
    img.src = 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA';
  });
}

/**
 * Check AVIF support asynchronously
 */
export async function checkAVIFSupport(): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.width > 0 && img.height > 0);
    img.onerror = () => resolve(false);
    img.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKBzgADlAgIGkyCR/wAABAAACvcA==';
  });
}

/**
 * Check async/await support
 */
export function hasAsyncAwait(): boolean {
  try {
    // Check if async/await is supported by testing constructor
    return typeof (async function(){}).constructor === 'function';
  } catch {
    return false;
  }
}

/**
 * Check WebGL support
 */
export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

/**
 * Check WebGL2 support
 */
export function hasWebGL2(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!canvas.getContext('webgl2');
  } catch {
    return false;
  }
}

/**
 * Create a progressive feature definition
 */
export function createFeature(
  id: string,
  config: {
    loader: () => Promise<unknown>;
    dependencies?: string[];
    polyfill?: () => Promise<void>;
    requirements?: Array<keyof typeof DEFAULT_CAPABILITIES>;
    fallback?: () => Promise<unknown>;
    priority?: 'critical' | 'high' | 'normal' | 'low';
    preload?: boolean;
  }
): {
  id: string;
  loader: () => Promise<unknown>;
  dependencies?: string[];
  polyfill?: () => Promise<void>;
  requirements?: Array<keyof typeof DEFAULT_CAPABILITIES>;
  fallback?: () => Promise<unknown>;
  priority?: 'critical' | 'high' | 'normal' | 'low';
  preload?: boolean;
} {
  return { id, ...config };
}

// ============================================================================
// Browser Capability Detection
// ============================================================================

/**
 * Browser capabilities interface
 */
export interface BrowserCapabilities {
  /** Supports ES modules */
  esModules: boolean;
  /** Supports async/await */
  asyncAwait: boolean;
  /** Supports WebGL */
  webGL: boolean;
  /** Supports WebGL2 */
  webGL2: boolean;
  /** Supports WebP images */
  webP: boolean;
  /** Supports AVIF images */
  avif: boolean;
  /** Supports Service Workers */
  serviceWorker: boolean;
  /** Supports Web Workers */
  webWorker: boolean;
  /** Supports SharedArrayBuffer */
  sharedArrayBuffer: boolean;
  /** Supports IntersectionObserver */
  intersectionObserver: boolean;
  /** Supports ResizeObserver */
  resizeObserver: boolean;
  /** Supports CSS Grid */
  cssGrid: boolean;
  /** Supports CSS Container Queries */
  containerQueries: boolean;
  /** Supports CSS :has() */
  cssHas: boolean;
  /** Supports View Transitions API */
  viewTransitions: boolean;
  /** Supports Navigation API */
  navigationAPI: boolean;
  /** Supports Popover API */
  popoverAPI: boolean;
  /** Supports Web Animations API */
  webAnimations: boolean;
  /** Supports requestIdleCallback */
  idleCallback: boolean;
  /** Supports Intl API */
  intl: boolean;
}

/**
 * Detect browser capabilities
 */
export function detectCapabilities(): BrowserCapabilities {
  if (typeof window === 'undefined') {
    // SSR - assume modern browser
    return getDefaultCapabilities();
  }

  return {
    esModules: 'noModule' in HTMLScriptElement.prototype,
    asyncAwait: hasAsyncAwait(),
    webGL: hasWebGL(),
    webGL2: hasWebGL2(),
    webP: false, // Detected asynchronously
    avif: false, // Detected asynchronously
    serviceWorker: 'serviceWorker' in navigator,
    webWorker: 'Worker' in window,
    sharedArrayBuffer: 'SharedArrayBuffer' in window,
    intersectionObserver: 'IntersectionObserver' in window,
    resizeObserver: 'ResizeObserver' in window,
    cssGrid: CSS.supports('display', 'grid'),
    containerQueries: CSS.supports('container-type', 'inline-size'),
    cssHas: CSS.supports('selector(:has(*))'),
    viewTransitions: 'startViewTransition' in document,
    navigationAPI: 'navigation' in window,
    popoverAPI: 'popover' in HTMLElement.prototype,
    webAnimations: 'animate' in Element.prototype,
    idleCallback: 'requestIdleCallback' in window,
    intl: 'Intl' in window,
  };
}

/**
 * Get capabilities without React
 */
export function getCapabilities(): BrowserCapabilities {
  return detectCapabilities();
}