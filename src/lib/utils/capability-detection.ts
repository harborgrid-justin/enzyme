/**
 * @file Utility Functions for Capability Detection
 * @description Browser capability detection utilities (Fast Refresh compliant).
 */

/**
 * Detect browser capabilities
 */
export function detectCapabilities() {
  return {
    esModules: hasESModules(),
    asyncAwait: hasAsyncAwait(),
    webGL: hasWebGL(),
    webGL2: hasWebGL2(),
    webP: false, // Async detection required
    avif: false, // Async detection required
    serviceWorker: 'serviceWorker' in navigator,
    webWorker: typeof Worker !== 'undefined',
    sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
    intersectionObserver: 'IntersectionObserver' in window,
    resizeObserver: 'ResizeObserver' in window,
    cssGrid: CSS.supports('display', 'grid'),
    containerQueries: CSS.supports('container-type', 'inline-size'),
    cssHas: CSS.supports('selector(:has(*))'),
    viewTransitions: 'startViewTransition' in document,
    navigationAPI: 'navigation' in window,
    popoverAPI: HTMLElement.prototype.hasOwnProperty('popover'),
    webAnimations: 'animate' in Element.prototype,
    idleCallback: 'requestIdleCallback' in window,
    intl: typeof Intl !== 'undefined',
  };
}

/**
 * Check ES modules support
 */
export function hasESModules(): boolean {
  try {
    // Check if browser supports ES modules
    return 'noModule' in HTMLScriptElement.prototype;
  } catch {
    return false;
  }
}

/**
 * Check async/await support
 */
export function hasAsyncAwait(): boolean {
  try {
    // eslint-disable-next-line no-new-func
    new Function('async () => {}');
    return true;
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
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
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
 * Check WebP support asynchronously
 */
export function checkWebPSupport(): Promise<boolean> {
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
export function checkAVIFSupport(): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.width > 0 && img.height > 0);
    img.onerror = () => resolve(false);
    img.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKBzgADlAgIGkyCR/wAABAAACvcA==';
  });
}

/**
 * Detect if device is mobile
 */
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Detect if device is touch-enabled
 */
export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if user prefers dark mode
 */
export function prefersDarkMode(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Get device pixel ratio
 */
export function getDevicePixelRatio(): number {
  return window.devicePixelRatio || 1;
}

/**
 * Check if browser is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Get connection type
 */
export function getConnectionType(): string {
  const nav = navigator as import('../types/dom').NavigatorWithConnection;
  const connection = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
  return connection?.effectiveType ?? 'unknown';
}

/**
 * Check if browser supports given CSS property
 */
export function supportsCSSProperty(property: string, value: string): boolean {
  return CSS.supports(property, value);
}

/**
 * Check if browser supports given HTML feature
 */
export function supportsHTMLFeature(feature: string): boolean {
  const testElement = document.createElement('div');
  return feature in testElement;
}
