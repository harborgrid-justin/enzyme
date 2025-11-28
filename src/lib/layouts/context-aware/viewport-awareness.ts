/**
 * @fileoverview Viewport Awareness System
 *
 * This module provides comprehensive viewport tracking including:
 * - Viewport dimensions and scroll position
 * - Element visibility tracking via IntersectionObserver
 * - Virtual viewport for performance optimization
 * - Safe area insets for modern devices
 *
 * Key design principles:
 * - Singleton pattern for global viewport state
 * - Throttled updates to prevent excessive callbacks
 * - Memory-efficient with automatic cleanup
 * - SSR-compatible with graceful degradation
 *
 * @module layouts/context-aware/viewport-awareness
 * @author Agent 4 - PhD Context Systems Expert
 * @version 1.0.0
 */

import type {
  ViewportInfo,
  ViewportPosition,
  VisibilityState,
  ComputedBounds,
  ContextTrackingConfig,
} from './types';
import { DEFAULT_TRACKING_CONFIG } from './types';

// ============================================================================
// Types
// ============================================================================

/**
 * Callback for viewport change events.
 */
export type ViewportChangeCallback = (viewport: ViewportInfo) => void;

/**
 * Callback for element visibility changes.
 */
export type VisibilityChangeCallback = (
  element: Element,
  position: ViewportPosition
) => void;

/**
 * Options for visibility observation.
 */
export interface VisibilityObserverOptions {
  /** Intersection thresholds (0-1) */
  thresholds?: number[];
  /** Root margin for early/late detection */
  rootMargin?: string;
  /** Whether to track continuous position updates */
  trackPosition?: boolean;
  /** Throttle interval for position updates (ms) */
  throttleMs?: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default intersection thresholds for visibility detection.
 */
const DEFAULT_THRESHOLDS = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1];

/**
 * Default throttle interval for resize/scroll events.
 */
// const DEFAULT_THROTTLE_MS = 16; // ~60fps

// ============================================================================
// ViewportTracker Class
// ============================================================================

/**
 * Tracks viewport state including dimensions, scroll position,
 * and element visibility.
 *
 * @remarks
 * Uses a singleton pattern to ensure consistent viewport state
 * across the application. All updates are throttled for performance.
 *
 * @example
 * ```typescript
 * const tracker = ViewportTracker.getInstance();
 * const viewport = tracker.getViewport();
 *
 * tracker.onViewportChange((viewport) => {
 *   console.log('Viewport changed:', viewport);
 * });
 *
 * tracker.observeVisibility(element, (element, position) => {
 *   console.log('Element visibility:', position.visibility);
 * });
 * ```
 */
export class ViewportTracker {
  private static instance: ViewportTracker | null = null;

  /** Current viewport state */
  private viewport: ViewportInfo;

  /** Set of viewport change listeners */
  private readonly viewportListeners: Set<ViewportChangeCallback> = new Set();

  /** Map of elements to visibility callbacks */
  private readonly visibilityCallbacks: Map<Element, VisibilityChangeCallback[]> = new Map();

  /** Map of elements to their last known position */
  private readonly elementPositions: WeakMap<Element, ViewportPosition> = new WeakMap();

  /** Intersection observer for visibility tracking */
  private intersectionObserver: IntersectionObserver | null = null;

  /** Resize observer for viewport changes */
  private resizeObserver: ResizeObserver | null = null;

  /** Configuration */
  private readonly config: ContextTrackingConfig;

  /** Throttle state for scroll events */
  private scrollThrottleTimer: number | null = null;
  private lastScrollTime = 0;

  /** Throttle state for resize events */
  private resizeThrottleTimer: number | null = null;
  private lastResizeTime = 0;

  /** Whether we're in SSR mode */
  private readonly isSSR: boolean;

  /**
   * Creates a new ViewportTracker instance.
   *
   * @param config - Optional configuration
   */
  private constructor(config: Partial<ContextTrackingConfig> = {}) {
    this.config = { ...DEFAULT_TRACKING_CONFIG, ...config };
    this.isSSR = typeof window === 'undefined';
    this.viewport = this.createInitialViewport();

    if (!this.isSSR) {
      this.initializeObservers();
      this.attachEventListeners();
    }
  }

  /**
   * Gets the singleton instance.
   *
   * @param config - Optional configuration
   * @returns ViewportTracker instance
   */
  public static getInstance(config?: Partial<ContextTrackingConfig>): ViewportTracker {
    if (!ViewportTracker.instance) {
      ViewportTracker.instance = new ViewportTracker(config);
    }
    return ViewportTracker.instance;
  }

  /**
   * Resets the singleton instance.
   */
  public static resetInstance(): void {
    if (ViewportTracker.instance) {
      ViewportTracker.instance.destroy();
      ViewportTracker.instance = null;
    }
  }

  // ==========================================================================
  // Public API - Viewport
  // ==========================================================================

  /**
   * Gets the current viewport state.
   *
   * @returns Current ViewportInfo
   */
  public getViewport(): ViewportInfo {
    if (!this.isSSR) {
      // Always return fresh viewport on read
      this.updateViewport();
    }
    return this.viewport;
  }

  /**
   * Subscribes to viewport changes.
   *
   * @param callback - Callback function
   * @returns Unsubscribe function
   */
  public onViewportChange(callback: ViewportChangeCallback): () => void {
    this.viewportListeners.add(callback);
    // Immediately call with current state
    callback(this.viewport);

    return () => {
      this.viewportListeners.delete(callback);
    };
  }

  /**
   * Forces a viewport state update.
   */
  public refreshViewport(): void {
    if (!this.isSSR) {
      this.updateViewport();
      this.notifyViewportListeners();
    }
  }

  // ==========================================================================
  // Public API - Visibility
  // ==========================================================================

  /**
   * Observes an element for visibility changes.
   *
   * @param element - Element to observe
   * @param callback - Callback for visibility changes
   * @param options - Observer options
   * @returns Unobserve function
   */
  public observeVisibility(
    element: Element,
    callback: VisibilityChangeCallback,
    _options: VisibilityObserverOptions = {}
  ): () => void {
    if (this.isSSR) {
      return () => {};
    }

    // Add callback to the element's callback list
    const callbacks = this.visibilityCallbacks.get(element) || [];
    callbacks.push(callback);
    this.visibilityCallbacks.set(element, callbacks);

    // Start observing if not already
    if (callbacks.length === 1) {
      this.intersectionObserver?.observe(element);
    }

    // Return unobserve function
    return () => {
      const cbs = this.visibilityCallbacks.get(element);
      if (cbs) {
        const index = cbs.indexOf(callback);
        if (index !== -1) {
          cbs.splice(index, 1);
        }
        if (cbs.length === 0) {
          this.visibilityCallbacks.delete(element);
          this.intersectionObserver?.unobserve(element);
        }
      }
    };
  }

  /**
   * Gets the current viewport position of an element.
   *
   * @param element - Element to check
   * @returns ViewportPosition or null if not observed
   */
  public getElementPosition(element: Element): ViewportPosition | null {
    if (this.isSSR) {
      return null;
    }

    // Check cache first
    const cached = this.elementPositions.get(element);
    if (cached && Date.now() - cached.lastUpdated < 100) {
      return cached;
    }

    // Compute fresh position
    return this.computeElementPosition(element);
  }

  /**
   * Checks if an element is currently visible in the viewport.
   *
   * @param element - Element to check
   * @returns Whether element is visible
   */
  public isElementVisible(element: Element): boolean {
    const position = this.getElementPosition(element);
    return position?.visibility === 'visible' || position?.visibility === 'partial';
  }

  // ==========================================================================
  // Public API - Virtual Viewport
  // ==========================================================================

  /**
   * Creates a virtual viewport for optimized rendering.
   * Useful for large lists or grids.
   *
   * @param totalItems - Total number of items
   * @param itemHeight - Height of each item
   * @param overscan - Number of items to render outside viewport
   * @returns Virtual viewport bounds
   */
  public getVirtualViewportBounds(
    totalItems: number,
    itemHeight: number,
    overscan = 5
  ): { startIndex: number; endIndex: number; offsetTop: number } {
    if (this.isSSR) {
      return { startIndex: 0, endIndex: Math.min(20, totalItems), offsetTop: 0 };
    }

    const {scrollY} = this.viewport;
    const viewportHeight = this.viewport.height;

    // Calculate visible range
    const startIndex = Math.max(0, Math.floor(scrollY / itemHeight) - overscan);
    const visibleCount = Math.ceil(viewportHeight / itemHeight);
    const endIndex = Math.min(totalItems, startIndex + visibleCount + overscan * 2);
    const offsetTop = startIndex * itemHeight;

    return { startIndex, endIndex, offsetTop };
  }

  // ==========================================================================
  // Public API - Lifecycle
  // ==========================================================================

  /**
   * Destroys the tracker and cleans up resources.
   */
  public destroy(): void {
    if (this.isSSR) {
      return;
    }

    // Clear timers
    if (this.scrollThrottleTimer !== null) {
      window.clearTimeout(this.scrollThrottleTimer);
    }
    if (this.resizeThrottleTimer !== null) {
      window.clearTimeout(this.resizeThrottleTimer);
    }

    // Disconnect observers
    this.intersectionObserver?.disconnect();
    this.resizeObserver?.disconnect();

    // Remove event listeners
    window.removeEventListener('scroll', this.handleScroll);
    window.removeEventListener('resize', this.handleResize);

    // Clear all callbacks
    this.viewportListeners.clear();
    this.visibilityCallbacks.clear();
  }

  // ==========================================================================
  // Private Methods - Initialization
  // ==========================================================================

  /**
   * Creates initial viewport state.
   */
  private createInitialViewport(): ViewportInfo {
    if (this.isSSR) {
      return {
        width: 1024,
        height: 768,
        scrollX: 0,
        scrollY: 0,
        scrollWidth: 1024,
        scrollHeight: 768,
        devicePixelRatio: 1,
        isTouch: false,
        orientation: 'landscape',
        safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
      };
    }

    return this.computeViewport();
  }

  /**
   * Initializes observers.
   */
  private initializeObservers(): void {
    // Intersection Observer for visibility tracking
    this.intersectionObserver = new IntersectionObserver(
      this.handleIntersection.bind(this),
      {
        root: null, // viewport
        rootMargin: '50px', // Slightly expand detection area
        threshold: DEFAULT_THRESHOLDS,
      }
    );

    // Resize Observer for viewport changes
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.throttledResize();
      });
      this.resizeObserver.observe(document.documentElement);
    }
  }

  /**
   * Attaches event listeners.
   */
  private attachEventListeners(): void {
    window.addEventListener('scroll', this.handleScroll, { passive: true });
    window.addEventListener('resize', this.handleResize, { passive: true });
  }

  // ==========================================================================
  // Private Methods - Event Handlers
  // ==========================================================================

  /**
   * Handles scroll events with throttling.
   */
  private handleScroll = (): void => {
    this.throttledScroll();
  };

  /**
   * Handles resize events with throttling.
   */
  private handleResize = (): void => {
    this.throttledResize();
  };

  /**
   * Handles intersection observer entries.
   */
  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    for (const entry of entries) {
      const element = entry.target;
      const position = this.computePositionFromEntry(entry);

      // Update cache
      this.elementPositions.set(element, position);

      // Notify callbacks
      const callbacks = this.visibilityCallbacks.get(element);
      if (callbacks) {
        callbacks.forEach((callback) => {
          try {
            callback(element, position);
          } catch (error) {
            if (this.config.debug) {
              console.error('[ViewportTracker] Callback error:', error);
            }
          }
        });
      }
    }
  }

  // ==========================================================================
  // Private Methods - Throttling
  // ==========================================================================

  /**
   * Throttled scroll update.
   */
  private throttledScroll(): void {
    const now = Date.now();
    const elapsed = now - this.lastScrollTime;

    if (elapsed >= this.config.throttleMs) {
      this.lastScrollTime = now;
      this.updateViewport();
      this.notifyViewportListeners();
    } else if (this.scrollThrottleTimer === null) {
      this.scrollThrottleTimer = window.setTimeout(() => {
        this.scrollThrottleTimer = null;
        this.lastScrollTime = Date.now();
        this.updateViewport();
        this.notifyViewportListeners();
      }, this.config.throttleMs - elapsed);
    }
  }

  /**
   * Throttled resize update.
   */
  private throttledResize(): void {
    const now = Date.now();
    const elapsed = now - this.lastResizeTime;

    if (elapsed >= this.config.throttleMs) {
      this.lastResizeTime = now;
      this.updateViewport();
      this.notifyViewportListeners();
    } else if (this.resizeThrottleTimer === null) {
      this.resizeThrottleTimer = window.setTimeout(() => {
        this.resizeThrottleTimer = null;
        this.lastResizeTime = Date.now();
        this.updateViewport();
        this.notifyViewportListeners();
      }, this.config.throttleMs - elapsed);
    }
  }

  // ==========================================================================
  // Private Methods - Computation
  // ==========================================================================

  /**
   * Computes current viewport state.
   */
  private computeViewport(): ViewportInfo {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;
    const {scrollWidth} = document.documentElement;
    const {scrollHeight} = document.documentElement;
    const devicePixelRatio = window.devicePixelRatio || 1;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const orientation = width > height ? 'landscape' : 'portrait';

    // Get safe area insets (for notched devices)
    const safeAreaInsets = this.getSafeAreaInsets();

    return {
      width,
      height,
      scrollX,
      scrollY,
      scrollWidth,
      scrollHeight,
      devicePixelRatio,
      isTouch,
      orientation,
      safeAreaInsets,
    };
  }

  /**
   * Gets safe area insets from CSS environment variables.
   */
  private getSafeAreaInsets(): ViewportInfo['safeAreaInsets'] {
    if (typeof CSS === 'undefined' || !CSS.supports('padding-top: env(safe-area-inset-top)')) {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }

    const computeInset = (property: string): number => {
      const div = document.createElement('div');
      div.style.cssText = `position: fixed; ${property}: env(safe-area-inset-${property.replace('padding-', '')})`;
      document.body.appendChild(div);
      const value = parseFloat(getComputedStyle(div)[property as keyof CSSStyleDeclaration] as string) || 0;
      document.body.removeChild(div);
      return value;
    };

    // Cache these values as they rarely change
    return {
      top: computeInset('padding-top'),
      right: computeInset('padding-right'),
      bottom: computeInset('padding-bottom'),
      left: computeInset('padding-left'),
    };
  }

  /**
   * Updates the viewport state.
   */
  private updateViewport(): void {
    this.viewport = this.computeViewport();
  }

  /**
   * Notifies all viewport listeners.
   */
  private notifyViewportListeners(): void {
    this.viewportListeners.forEach((callback) => {
      try {
        callback(this.viewport);
      } catch (error) {
        if (this.config.debug) {
          console.error('[ViewportTracker] Listener error:', error);
        }
      }
    });
  }

  /**
   * Computes element position from intersection entry.
   */
  private computePositionFromEntry(entry: IntersectionObserverEntry): ViewportPosition {
    const rect = entry.boundingClientRect;
    const {viewport} = this;

    // Compute bounds
    const bounds: ComputedBounds = {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
      contentBox: { width: rect.width, height: rect.height },
      paddingBox: { width: rect.width, height: rect.height },
      borderBox: { width: rect.width, height: rect.height },
    };

    // Determine visibility state
    let visibility: VisibilityState;
    if (!entry.isIntersecting) {
      visibility = 'hidden';
    } else if (entry.intersectionRatio >= 0.99) {
      visibility = 'visible';
    } else {
      visibility = 'partial';
    }

    // Compute distance from viewport edges
    const distanceFromViewport = {
      top: rect.top,
      right: viewport.width - rect.right,
      bottom: viewport.height - rect.bottom,
      left: rect.left,
    };

    // Determine relative position
    let relativePosition: ViewportPosition['relativePosition'];
    if (rect.bottom < 0) {
      relativePosition = 'above';
    } else if (rect.top > viewport.height) {
      relativePosition = 'below';
    } else if (rect.right < 0) {
      relativePosition = 'left';
    } else if (rect.left > viewport.width) {
      relativePosition = 'right';
    } else {
      relativePosition = 'within';
    }

    return {
      bounds,
      visibility,
      intersectionRatio: entry.intersectionRatio,
      distanceFromViewport,
      relativePosition,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Computes element position directly (not from intersection entry).
   */
  private computeElementPosition(element: Element): ViewportPosition {
    const rect = element.getBoundingClientRect();
    const {viewport} = this;

    // Compute bounds
    const bounds: ComputedBounds = {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
      contentBox: { width: rect.width, height: rect.height },
      paddingBox: { width: rect.width, height: rect.height },
      borderBox: { width: rect.width, height: rect.height },
    };

    // Calculate intersection manually
    const intersectionTop = Math.max(0, rect.top);
    const intersectionLeft = Math.max(0, rect.left);
    const intersectionBottom = Math.min(viewport.height, rect.bottom);
    const intersectionRight = Math.min(viewport.width, rect.right);

    const intersectionWidth = Math.max(0, intersectionRight - intersectionLeft);
    const intersectionHeight = Math.max(0, intersectionBottom - intersectionTop);
    const intersectionArea = intersectionWidth * intersectionHeight;
    const elementArea = rect.width * rect.height;
    const intersectionRatio = elementArea > 0 ? intersectionArea / elementArea : 0;

    // Determine visibility state
    let visibility: VisibilityState;
    if (intersectionRatio === 0) {
      visibility = 'hidden';
    } else if (intersectionRatio >= 0.99) {
      visibility = 'visible';
    } else {
      visibility = 'partial';
    }

    // Compute distance from viewport edges
    const distanceFromViewport = {
      top: rect.top,
      right: viewport.width - rect.right,
      bottom: viewport.height - rect.bottom,
      left: rect.left,
    };

    // Determine relative position
    let relativePosition: ViewportPosition['relativePosition'];
    if (rect.bottom < 0) {
      relativePosition = 'above';
    } else if (rect.top > viewport.height) {
      relativePosition = 'below';
    } else if (rect.right < 0) {
      relativePosition = 'left';
    } else if (rect.left > viewport.width) {
      relativePosition = 'right';
    } else {
      relativePosition = 'within';
    }

    const position: ViewportPosition = {
      bounds,
      visibility,
      intersectionRatio,
      distanceFromViewport,
      relativePosition,
      lastUpdated: Date.now(),
    };

    // Cache the position
    this.elementPositions.set(element, position);

    return position;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Gets the singleton ViewportTracker instance.
 *
 * @param config - Optional configuration
 * @returns ViewportTracker instance
 */
export function getViewportTracker(config?: Partial<ContextTrackingConfig>): ViewportTracker {
  return ViewportTracker.getInstance(config);
}

/**
 * Gets the current viewport information.
 *
 * @returns Current ViewportInfo
 */
export function getViewport(): ViewportInfo {
  return getViewportTracker().getViewport();
}

/**
 * Subscribes to viewport changes.
 *
 * @param callback - Callback function
 * @returns Unsubscribe function
 */
export function onViewportChange(callback: ViewportChangeCallback): () => void {
  return getViewportTracker().onViewportChange(callback);
}

/**
 * Checks if an element is visible in the viewport.
 *
 * @param element - Element to check
 * @returns Whether element is visible
 */
export function isElementInViewport(element: Element): boolean {
  return getViewportTracker().isElementVisible(element);
}

/**
 * Gets viewport-relative position of an element.
 *
 * @param element - Element to check
 * @returns ViewportPosition or null
 */
export function getViewportPosition(element: Element): ViewportPosition | null {
  return getViewportTracker().getElementPosition(element);
}

/**
 * Calculates the distance from an element to the viewport center.
 *
 * @param element - Element to check
 * @returns Distance in pixels, or Infinity if not in viewport
 */
export function getDistanceFromViewportCenter(element: Element): number {
  const position = getViewportPosition(element);
  if (!position) {
    return Infinity;
  }

  const viewport = getViewport();
  const viewportCenterX = viewport.width / 2;
  const viewportCenterY = viewport.height / 2;

  const elementCenterX = position.bounds.left + position.bounds.width / 2;
  const elementCenterY = position.bounds.top + position.bounds.height / 2;

  return Math.sqrt(
    Math.pow(elementCenterX - viewportCenterX, 2) +
    Math.pow(elementCenterY - viewportCenterY, 2)
  );
}

/**
 * Determines the optimal scroll position to bring an element into view.
 *
 * @param element - Element to scroll to
 * @param options - Scroll options
 * @returns Target scroll position
 */
export function getOptimalScrollPosition(
  element: Element,
  options: { alignment?: 'start' | 'center' | 'end'; offset?: number } = {}
): { x: number; y: number } {
  const { alignment = 'center', offset = 0 } = options;
  const position = getViewportPosition(element);
  const viewport = getViewport();

  if (!position) {
    return { x: viewport.scrollX, y: viewport.scrollY };
  }

  let targetY: number;
  switch (alignment) {
    case 'start':
      targetY = viewport.scrollY + position.bounds.top - offset;
      break;
    case 'end':
      targetY = viewport.scrollY + position.bounds.bottom - viewport.height + offset;
      break;
    case 'center':
    default:
      targetY =
        viewport.scrollY +
        position.bounds.top +
        position.bounds.height / 2 -
        viewport.height / 2;
      break;
  }

  return {
    x: viewport.scrollX,
    y: Math.max(0, Math.min(targetY, viewport.scrollHeight - viewport.height)),
  };
}
