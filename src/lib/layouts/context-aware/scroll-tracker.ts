/**
 * @fileoverview Scroll Container Tracking System
 *
 * This module provides comprehensive scroll container detection and tracking:
 * - Automatic scroll container detection
 * - Scroll position and velocity tracking
 * - Scroll direction detection
 * - Sticky element coordination
 * - Scroll event batching for performance
 *
 * @module layouts/context-aware/scroll-tracker
 * @author Agent 4 - PhD Context Systems Expert
 * @version 1.0.0
 */

import type {
  ScrollContainer,
  ScrollDirection,
  StickyState,
  OverflowType,
  ContextTrackingConfig,
} from './types';
import { DEFAULT_TRACKING_CONFIG, isScrollContainer } from './types';

// ============================================================================
// Types
// ============================================================================

/**
 * Callback for scroll events.
 */
export type ScrollCallback = (container: ScrollContainer) => void;

/**
 * Callback for scroll edge events.
 */
export type ScrollEdgeCallback = (edge: 'top' | 'right' | 'bottom' | 'left') => void;

/**
 * Callback for sticky state changes.
 */
export type StickyCallback = (state: StickyState) => void;

/**
 * Options for scroll tracking.
 */
export interface ScrollTrackingOptions {
  /** Throttle interval for scroll events (ms) */
  throttleMs?: number;
  /** Whether to track velocity */
  trackVelocity?: boolean;
  /** Whether to track direction */
  trackDirection?: boolean;
  /** Edge detection threshold (px) */
  edgeThreshold?: number;
}

/**
 * Internal state for velocity calculation.
 */
interface VelocityState {
  lastX: number;
  lastY: number;
  lastTime: number;
  velocityX: number;
  velocityY: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_EDGE_THRESHOLD = 5;
const VELOCITY_SAMPLE_INTERVAL = 50; // ms

// ============================================================================
// ScrollTracker Class
// ============================================================================

/**
 * Tracks scroll containers and their state.
 *
 * @remarks
 * Manages scroll tracking for individual containers, providing
 * scroll position, velocity, direction, and edge detection.
 *
 * @example
 * ```typescript
 * const tracker = new ScrollTracker(scrollElement);
 *
 * tracker.onScroll((container) => {
 *   console.log('Scroll position:', container.scrollPosition);
 * });
 *
 * tracker.onEdge((edge) => {
 *   console.log('Reached edge:', edge);
 * });
 * ```
 */
export class ScrollTracker {
  /** ID counter for trackers */
  private static idCounter = 0;
  /** The scroll container element */
  private readonly element: Element;
  /** Unique identifier for this tracker */
  private readonly id: string;
  /** Configuration */
  private readonly config: ContextTrackingConfig;
  /** Options */
  private readonly options: Required<ScrollTrackingOptions>;
  /** Current scroll container state */
  private state: ScrollContainer;
  /** Velocity tracking state */
  private velocityState: VelocityState;
  /** Last known scroll direction */
  private lastDirection: ScrollDirection = 'none';
  /** Scroll event callbacks */
  private readonly scrollCallbacks: Set<ScrollCallback> = new Set();
  /** Edge event callbacks */
  private readonly edgeCallbacks: Set<ScrollEdgeCallback> = new Set();
  /** Sticky element callbacks */
  private readonly stickyCallbacks: Map<Element, StickyCallback> = new Map();
  /** Sticky element states */
  private readonly stickyStates: Map<Element, StickyState> = new Map();
  /** Throttle timer */
  private throttleTimer: number | null = null;
  /** Last throttle time */
  private lastThrottleTime = 0;
  /** Animation frame handle */
  private rafHandle: number | null = null;
  /** Whether scrolling is in progress */
  private isScrolling = false;
  /** Scroll end detection timer */
  private scrollEndTimer: number | null = null;
  /** Whether we're in SSR mode */
  private readonly isSSR: boolean;

  /**
   * Creates a new ScrollTracker.
   *
   * @param element - Scroll container element
   * @param config - Tracking configuration
   * @param options - Scroll tracking options
   */
  constructor(
    element: Element,
    config: Partial<ContextTrackingConfig> = {},
    options: ScrollTrackingOptions = {}
  ) {
    this.element = element;
    this.id = `scroll-${++ScrollTracker.idCounter}`;
    this.config = { ...DEFAULT_TRACKING_CONFIG, ...config };
    this.options = {
      throttleMs: options.throttleMs ?? 16,
      trackVelocity: options.trackVelocity ?? true,
      trackDirection: options.trackDirection ?? true,
      edgeThreshold: options.edgeThreshold ?? DEFAULT_EDGE_THRESHOLD,
    };

    this.isSSR = typeof window === 'undefined';

    this.velocityState = {
      lastX: 0,
      lastY: 0,
      lastTime: 0,
      velocityX: 0,
      velocityY: 0,
    };

    this.state = this.computeState();

    if (!this.isSSR) {
      this.attachListeners();
    }
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Gets the current scroll container state.
   *
   * @returns Current ScrollContainer state
   */
  public getState(): ScrollContainer {
    return this.state;
  }

  /**
   * Gets the tracker ID.
   *
   * @returns Unique identifier
   */
  public getId(): string {
    return this.id;
  }

  /**
   * Gets the scroll container element.
   *
   * @returns The scroll container element
   */
  public getElement(): Element {
    return this.element;
  }

  /**
   * Subscribes to scroll events.
   *
   * @param callback - Callback function
   * @returns Unsubscribe function
   */
  public onScroll(callback: ScrollCallback): () => void {
    this.scrollCallbacks.add(callback);
    return () => {
      this.scrollCallbacks.delete(callback);
    };
  }

  /**
   * Subscribes to edge events.
   *
   * @param callback - Callback function
   * @returns Unsubscribe function
   */
  public onEdge(callback: ScrollEdgeCallback): () => void {
    this.edgeCallbacks.add(callback);
    return () => {
      this.edgeCallbacks.delete(callback);
    };
  }

  /**
   * Registers a sticky element for tracking.
   *
   * @param element - Sticky element
   * @param callback - Callback for state changes
   * @returns Unregister function
   */
  public trackSticky(element: Element, callback: StickyCallback): () => void {
    this.stickyCallbacks.set(element, callback);
    this.updateStickyState(element);
    return () => {
      this.stickyCallbacks.delete(element);
      this.stickyStates.delete(element);
    };
  }

  /**
   * Scrolls to a specific position.
   *
   * @param options - Scroll options
   */
  public scrollTo(options: { x?: number; y?: number; behavior?: 'auto' | 'smooth' }): void {
    if (this.isSSR) {
      return;
    }

    const { x, y, behavior = 'auto' } = options;
    this.element.scrollTo({
      left: x,
      top: y,
      behavior,
    });
  }

  /**
   * Scrolls by a relative offset.
   *
   * @param options - Scroll options
   */
  public scrollBy(options: { x?: number; y?: number; behavior?: 'auto' | 'smooth' }): void {
    if (this.isSSR) {
      return;
    }

    const { x = 0, y = 0, behavior = 'auto' } = options;
    this.element.scrollBy({
      left: x,
      top: y,
      behavior,
    });
  }

  /**
   * Scrolls to top.
   *
   * @param behavior - Scroll behavior
   */
  public scrollToTop(behavior: 'auto' | 'smooth' = 'smooth'): void {
    this.scrollTo({ y: 0, behavior });
  }

  /**
   * Scrolls to bottom.
   *
   * @param behavior - Scroll behavior
   */
  public scrollToBottom(behavior: 'auto' | 'smooth' = 'smooth'): void {
    this.scrollTo({ y: this.state.scrollDimensions.height, behavior });
  }

  /**
   * Scrolls an element into view within this container.
   *
   * @param element - Element to scroll to
   * @param options - Scroll into view options
   */
  public scrollIntoView(
    element: Element,
    options: ScrollIntoViewOptions = { behavior: 'smooth', block: 'center' }
  ): void {
    if (this.isSSR) {
      return;
    }

    element.scrollIntoView(options);
  }

  /**
   * Forces a state refresh.
   */
  public refresh(): void {
    if (!this.isSSR) {
      this.updateState();
    }
  }

  /**
   * Destroys the tracker and cleans up resources.
   */
  public destroy(): void {
    if (this.isSSR) {
      return;
    }

    // Clear timers
    if (this.throttleTimer !== null) {
      window.clearTimeout(this.throttleTimer);
    }
    if (this.scrollEndTimer !== null) {
      window.clearTimeout(this.scrollEndTimer);
    }
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
    }

    // Remove listener
    this.element.removeEventListener('scroll', this.handleScroll);

    // Clear callbacks
    this.scrollCallbacks.clear();
    this.edgeCallbacks.clear();
    this.stickyCallbacks.clear();
    this.stickyStates.clear();
  }

  // ==========================================================================
  // Private Methods - Event Handling
  // ==========================================================================

  /**
   * Attaches scroll event listener.
   */
  private attachListeners(): void {
    this.element.addEventListener('scroll', this.handleScroll, { passive: true });
  }

  /**
   * Handles scroll events with throttling.
   */
  private handleScroll = (): void => {
    this.isScrolling = true;

    // Clear existing scroll end timer
    if (this.scrollEndTimer !== null) {
      window.clearTimeout(this.scrollEndTimer);
    }

    // Set scroll end detection
    this.scrollEndTimer = window.setTimeout(() => {
      this.isScrolling = false;
      this.velocityState.velocityX = 0;
      this.velocityState.velocityY = 0;
      this.updateState();
    }, 150);

    // Throttle the update
    const now = Date.now();
    const elapsed = now - this.lastThrottleTime;

    if (elapsed >= this.options.throttleMs) {
      this.lastThrottleTime = now;
      this.updateState();
    } else {
      this.throttleTimer ??= window.setTimeout(() => {
        this.throttleTimer = null;
        this.lastThrottleTime = Date.now();
        this.updateState();
      }, this.options.throttleMs - elapsed);
    }
  };

  // ==========================================================================
  // Private Methods - State Computation
  // ==========================================================================

  /**
   * Computes the current scroll container state.
   */
  private computeState(): ScrollContainer {
    if (this.isSSR) {
      return this.createDefaultState();
    }

    const {scrollLeft} = this.element;
    const {scrollTop} = this.element;
    const {scrollWidth} = this.element;
    const {scrollHeight} = this.element;
    const {clientWidth} = this.element;
    const {clientHeight} = this.element;

    // Calculate scroll progress
    const maxScrollX = Math.max(0, scrollWidth - clientWidth);
    const maxScrollY = Math.max(0, scrollHeight - clientHeight);
    const progressX = maxScrollX > 0 ? scrollLeft / maxScrollX : 0;
    const progressY = maxScrollY > 0 ? scrollTop / maxScrollY : 0;

    // Detect edges
    const threshold = this.options.edgeThreshold;
    const atEdge = {
      top: scrollTop <= threshold,
      right: scrollLeft >= maxScrollX - threshold,
      bottom: scrollTop >= maxScrollY - threshold,
      left: scrollLeft <= threshold,
    };

    // Get overflow values
    const style = getComputedStyle(this.element);
    const overflow = {
      x: style.overflowX as OverflowType,
      y: style.overflowY as OverflowType,
    };

    return {
      element: this.element,
      id: this.id,
      scrollPosition: { x: scrollLeft, y: scrollTop },
      scrollDimensions: { width: scrollWidth, height: scrollHeight },
      visibleDimensions: { width: clientWidth, height: clientHeight },
      overflow,
      isScrolling: this.isScrolling,
      scrollDirection: this.lastDirection,
      scrollVelocity: {
        x: this.velocityState.velocityX,
        y: this.velocityState.velocityY,
      },
      scrollProgress: { x: progressX, y: progressY },
      atEdge,
    };
  }

  /**
   * Creates default state for SSR.
   */
  private createDefaultState(): ScrollContainer {
    return {
      element: this.element,
      id: this.id,
      scrollPosition: { x: 0, y: 0 },
      scrollDimensions: { width: 0, height: 0 },
      visibleDimensions: { width: 0, height: 0 },
      overflow: { x: 'auto', y: 'auto' },
      isScrolling: false,
      scrollDirection: 'none',
      scrollVelocity: { x: 0, y: 0 },
      scrollProgress: { x: 0, y: 0 },
      atEdge: { top: true, right: true, bottom: true, left: true },
    };
  }

  /**
   * Updates state and notifies listeners.
   */
  private updateState(): void {
    const prevState = this.state;
    const newState = this.computeState();

    // Calculate velocity if tracking
    if (this.options.trackVelocity) {
      this.updateVelocity(newState);
    }

    // Calculate direction if tracking
    if (this.options.trackDirection) {
      this.updateDirection(prevState, newState);
    }

    // Update state
    this.state = {
      ...newState,
      scrollDirection: this.lastDirection,
      scrollVelocity: {
        x: this.velocityState.velocityX,
        y: this.velocityState.velocityY,
      },
    };

    // Notify scroll callbacks
    this.notifyScrollCallbacks();

    // Check for edge events
    this.checkEdgeEvents(prevState, this.state);

    // Update sticky elements
    this.updateAllStickyStates();
  }

  /**
   * Updates velocity tracking.
   */
  private updateVelocity(state: ScrollContainer): void {
    const now = Date.now();
    const deltaTime = now - this.velocityState.lastTime;

    if (deltaTime >= VELOCITY_SAMPLE_INTERVAL) {
      const deltaX = state.scrollPosition.x - this.velocityState.lastX;
      const deltaY = state.scrollPosition.y - this.velocityState.lastY;

      this.velocityState.velocityX = deltaX / deltaTime * 1000; // px/s
      this.velocityState.velocityY = deltaY / deltaTime * 1000; // px/s

      this.velocityState.lastX = state.scrollPosition.x;
      this.velocityState.lastY = state.scrollPosition.y;
      this.velocityState.lastTime = now;
    }
  }

  /**
   * Updates scroll direction.
   */
  private updateDirection(prevState: ScrollContainer, newState: ScrollContainer): void {
    const deltaX = newState.scrollPosition.x - prevState.scrollPosition.x;
    const deltaY = newState.scrollPosition.y - prevState.scrollPosition.y;

    // Prioritize vertical scrolling detection
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      if (deltaY > 0) {
        this.lastDirection = 'down';
      } else if (deltaY < 0) {
        this.lastDirection = 'up';
      } else {
        this.lastDirection = 'none';
      }
    } else if (deltaX !== 0) {
      this.lastDirection = deltaX > 0 ? 'right' : 'left';
    }
    // If no movement, keep last direction
  }

  /**
   * Notifies all scroll callbacks.
   */
  private notifyScrollCallbacks(): void {
    this.scrollCallbacks.forEach((callback) => {
      try {
        callback(this.state);
      } catch (error) {
        if (this.config.debug) {
          console.error('[ScrollTracker] Callback error:', error);
        }
      }
    });
  }

  /**
   * Checks and emits edge events.
   */
  private checkEdgeEvents(prevState: ScrollContainer, newState: ScrollContainer): void {
    if (this.edgeCallbacks.size === 0) {
      return;
    }

    // Check each edge for transition to at-edge state
    const edges: Array<'top' | 'right' | 'bottom' | 'left'> = ['top', 'right', 'bottom', 'left'];

    for (const edge of edges) {
      if (!prevState.atEdge[edge] && newState.atEdge[edge]) {
        this.edgeCallbacks.forEach((callback) => {
          try {
            callback(edge);
          } catch (error) {
            if (this.config.debug) {
              console.error('[ScrollTracker] Edge callback error:', error);
            }
          }
        });
      }
    }
  }

  /**
   * Updates all sticky element states.
   */
  private updateAllStickyStates(): void {
    this.stickyCallbacks.forEach((_, element) => {
      this.updateStickyState(element);
    });
  }

  /**
   * Updates sticky state for an element.
   */
  private updateStickyState(element: Element): void {
    if (this.isSSR) {
      return;
    }

    const callback = this.stickyCallbacks.get(element);
    if (!callback) {
      return;
    }

    const prevState = this.stickyStates.get(element);
    const newState = this.computeStickyState(element);

    this.stickyStates.set(element, newState);

    // Only notify if state changed
    if ((prevState === undefined) || (prevState.isStuck !== newState.isStuck)) {
      callback(newState);
    }
  }

  /**
   * Computes sticky state for an element.
   */
  private computeStickyState(element: Element): StickyState {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const containerRect = this.element.getBoundingClientRect();

    const stickyTop = parseFloat(style.top) ?? 0;
    const stickyBottom = parseFloat(style.bottom) ?? 0;

    // Determine if stuck
    let isStuck = false;
    let stuckTo: StickyState['stuckTo'] = null;

    if (style.position === 'sticky') {
      // Check if stuck to top
      if (rect.top <= containerRect.top + stickyTop + 1) {
        isStuck = true;
        stuckTo = 'top';
      }
      // Check if stuck to bottom
      else if (rect.bottom >= containerRect.bottom - stickyBottom - 1) {
        isStuck = true;
        stuckTo = 'bottom';
      }
    }

    // Get sibling stickies
    const siblingStickies: Array<{ id: string; isStuck: boolean; offset: number }> = [];
    this.stickyStates.forEach((state, el) => {
      if (el !== element) {
        siblingStickies.push({
          id: el.id ?? 'unknown',
          isStuck: state.isStuck,
          offset: state.offset,
        });
      }
    });

    let offset = 0;
    if (isStuck) {
      offset = stuckTo === 'top' ? stickyTop : stickyBottom;
    }

    return {
      isStuck,
      stuckTo,
      originalPosition: {
        top: rect.top - containerRect.top + this.state.scrollPosition.y,
        left: rect.left - containerRect.left + this.state.scrollPosition.x,
      },
      offset,
      siblingStickies,
    };
  }
}

// ============================================================================
// ScrollContainerRegistry
// ============================================================================

/**
 * Registry for managing multiple scroll trackers.
 */
export class ScrollContainerRegistry {
  private static instance: ScrollContainerRegistry | null = null;

  /** Map of elements to their trackers */
  private readonly trackers: WeakMap<Element, ScrollTracker> = new WeakMap();

  /** Set of all active trackers */
  private readonly activeTrackers: Set<ScrollTracker> = new Set();

  private constructor() {}

  /**
   * Gets the singleton instance.
   */
  public static getInstance(): ScrollContainerRegistry {
    ScrollContainerRegistry.instance ??= new ScrollContainerRegistry();
    return ScrollContainerRegistry.instance;
  }

  /**
   * Gets or creates a tracker for an element.
   *
   * @param element - Scroll container element
   * @param options - Tracking options
   * @returns ScrollTracker instance
   */
  public getTracker(element: Element, options?: ScrollTrackingOptions): ScrollTracker {
    let tracker = this.trackers.get(element);

    if (!tracker) {
      tracker = new ScrollTracker(element, {}, options);
      this.trackers.set(element, tracker);
      this.activeTrackers.add(tracker);
    }

    return tracker;
  }

  /**
   * Removes a tracker.
   *
   * @param element - Scroll container element
   */
  public removeTracker(element: Element): void {
    const tracker = this.trackers.get(element);
    if (tracker) {
      tracker.destroy();
      this.trackers.delete(element);
      this.activeTrackers.delete(tracker);
    }
  }

  /**
   * Finds the nearest scroll container for an element.
   *
   * @param element - Element to check
   * @returns Scroll container tracker or null
   */
  public findScrollContainer(element: Element): ScrollTracker | null {
    let current: Element | null = element.parentElement;

    while (current) {
      if (isScrollContainer(current)) {
        return this.getTracker(current);
      }
      current = current.parentElement;
    }

    // Check if document is scrollable
    if (isScrollContainer(document.documentElement)) {
      return this.getTracker(document.documentElement);
    }

    return null;
  }

  /**
   * Gets all active trackers.
   */
  public getAllTrackers(): ScrollTracker[] {
    return Array.from(this.activeTrackers);
  }

  /**
   * Destroys all trackers.
   */
  public destroyAll(): void {
    this.activeTrackers.forEach((tracker) => {
      tracker.destroy();
    });
    this.activeTrackers.clear();
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Gets the scroll container registry instance.
 */
export function getScrollContainerRegistry(): ScrollContainerRegistry {
  return ScrollContainerRegistry.getInstance();
}

/**
 * Finds the nearest scroll container for an element.
 *
 * @param element - Element to check
 * @returns ScrollTracker or null
 */
export function findScrollContainer(element: Element): ScrollTracker | null {
  return getScrollContainerRegistry().findScrollContainer(element);
}

/**
 * Creates a scroll tracker for an element.
 *
 * @param element - Scroll container element
 * @param options - Tracking options
 * @returns ScrollTracker instance
 */
export function createScrollTracker(
  element: Element,
  options?: ScrollTrackingOptions
): ScrollTracker {
  return getScrollContainerRegistry().getTracker(element, options);
}
