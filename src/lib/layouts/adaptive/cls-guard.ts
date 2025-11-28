/**
 * @fileoverview CLS (Cumulative Layout Shift) Guard System
 *
 * This module provides a comprehensive system for preventing and monitoring
 * Cumulative Layout Shift. It implements layout reservations, skeleton placeholders,
 * and real-time CLS measurement using the Performance Observer API.
 *
 * Key Features:
 * - Zero-CLS layout reservations
 * - Multiple reservation strategies (skeleton, dimensions, aspect-ratio)
 * - Real-time CLS monitoring
 * - Threshold-based alerts
 * - Performance Observer integration
 *
 * @module layouts/adaptive/cls-guard
 * @version 1.0.0
 */

import type {
  CLSGuardConfig,
  CLSGuardInterface,
  CLSMeasurement,
  Dimensions,
  LayoutReservation,
  LayoutShiftEntry,
  ReservationStrategy,
} from './types';
import { DEFAULT_CLS_GUARD_CONFIG } from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * CLS score thresholds based on Core Web Vitals.
 */
// const CLS_THRESHOLDS = {
//   good: 0.1,
//   needsImprovement: 0.25,
//   poor: 0.5,
// } as const;

/**
 * Maximum age for layout shift entries to consider (5 seconds).
 */
// const MAX_ENTRY_AGE_MS = 5000;

/**
 * Session window gap for CLS calculation (1 second).
 */
const SESSION_WINDOW_GAP_MS = 1000;

/**
 * Maximum session window duration (5 seconds).
 */
const MAX_SESSION_WINDOW_MS = 5000;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generates a unique reservation ID.
 */
// function _generateReservationId(): string {
//   return `rsv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
// }

/**
 * Creates CSS for skeleton placeholder.
 */
function createSkeletonStyles(dimensions: Dimensions): string {
  return `
    width: ${dimensions.width}px;
    height: ${dimensions.height}px;
    background: linear-gradient(
      90deg,
      var(--skeleton-base, #e0e0e0) 25%,
      var(--skeleton-shine, #f0f0f0) 50%,
      var(--skeleton-base, #e0e0e0) 75%
    );
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s ease-in-out infinite;
    border-radius: 4px;
  `;
}

/**
 * Injects skeleton animation CSS if not already present.
 */
function ensureSkeletonAnimation(): void {
  if (typeof document === 'undefined') return;

  const styleId = 'cls-guard-skeleton-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes skeleton-shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `;
  document.head.appendChild(style);
}

// =============================================================================
// CLS GUARD IMPLEMENTATION
// =============================================================================

/**
 * CLS Guard implementation that prevents layout shifts through
 * reservations and monitors actual CLS scores.
 *
 * @example
 * ```typescript
 * const guard = createCLSGuard({ maxCLS: 0.05 });
 *
 * // Reserve space for an image
 * const reservation = guard.createReservation('hero-image', {
 *   width: 1200,
 *   height: 600
 * }, 'skeleton');
 *
 * // Monitor CLS
 * const unsubscribe = guard.observeCLS((measurement) => {
 *   if (measurement.thresholdExceeded) {
 *     console.warn('CLS threshold exceeded:', measurement.score);
 *   }
 * });
 * ```
 */
export class CLSGuard implements CLSGuardInterface {
  private _config: CLSGuardConfig;
  private readonly _reservations: Map<string, LayoutReservation>;
  private readonly _reservationElements: Map<string, HTMLElement>;
  private readonly _measurements: CLSMeasurement[];
  private readonly _callbacks: Set<(measurement: CLSMeasurement) => void>;
  private _observer: PerformanceObserver | null = null;
  private _currentScore: number = 0;
  private _sessionEntries: LayoutShiftEntry[] = [];
  private _sessionStart: number = 0;
  private _destroyed: boolean = false;

  constructor(config: Partial<CLSGuardConfig> = {}) {
    this._config = { ...DEFAULT_CLS_GUARD_CONFIG, ...config };
    this._reservations = new Map();
    this._reservationElements = new Map();
    this._measurements = [];
    this._callbacks = new Set();

    if (this._config.monitor && typeof window !== 'undefined') {
      this._initializeObserver();
    }

    ensureSkeletonAnimation();
  }

  /**
   * Current configuration.
   */
  get config(): CLSGuardConfig {
    return this._config;
  }

  /**
   * Current CLS score.
   */
  get currentScore(): number {
    return this._currentScore;
  }

  /**
   * Updates the guard configuration.
   */
  configure(config: Partial<CLSGuardConfig>): void {
    this._assertNotDestroyed();
    this._config = { ...this._config, ...config };

    // Start or stop observer based on config
    if (this._config.monitor && !this._observer) {
      this._initializeObserver();
    } else if (!this._config.monitor && this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
  }

  /**
   * Creates a layout reservation to prevent CLS.
   *
   * @param id - Unique identifier for the reservation
   * @param dimensions - Dimensions to reserve
   * @param strategy - Reservation strategy (defaults to config)
   * @returns The created reservation
   */
  createReservation(
    id: string,
    dimensions: Dimensions,
    strategy: ReservationStrategy = this._config.reservationStrategy
  ): LayoutReservation {
    this._assertNotDestroyed();

    // Release existing reservation if present
    if (this._reservations.has(id)) {
      this.releaseReservation(id);
    }

    const reservation: LayoutReservation = {
      id,
      dimensions,
      aspectRatio: dimensions.width / dimensions.height,
      active: true,
      createdAt: Date.now(),
    };

    this._reservations.set(id, reservation);

    // Create reservation element based on strategy
    if (strategy !== 'none' && typeof document !== 'undefined') {
      this._createReservationElement(id, dimensions, strategy);
    }

    return reservation;
  }

  /**
   * Releases a layout reservation.
   *
   * @param id - The reservation ID to release
   */
  releaseReservation(id: string): void {
    this._assertNotDestroyed();

    const reservation = this._reservations.get(id);
    if (reservation) {
      this._reservations.set(id, { ...reservation, active: false });
    }

    // Remove reservation element
    const element = this._reservationElements.get(id);
    if (element?.parentNode) {
      element.parentNode.removeChild(element);
    }
    this._reservationElements.delete(id);
  }

  /**
   * Measures the current CLS score.
   *
   * @returns CLS measurement result
   */
  measureCLS(): CLSMeasurement {
    this._assertNotDestroyed();

    const measurement: CLSMeasurement = {
      score: this._currentScore,
      entries: [...this._sessionEntries],
      thresholdExceeded: this._currentScore > this._config.maxCLS,
      timestamp: Date.now(),
    };

    this._measurements.push(measurement);

    return measurement;
  }

  /**
   * Subscribes to CLS updates.
   *
   * @param callback - Callback for CLS measurements
   * @returns Unsubscribe function
   */
  observeCLS(callback: (measurement: CLSMeasurement) => void): () => void {
    this._assertNotDestroyed();
    this._callbacks.add(callback);

    return () => {
      this._callbacks.delete(callback);
    };
  }

  /**
   * Cleans up all resources.
   */
  destroy(): void {
    if (this._destroyed) return;

    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }

    // Remove all reservation elements
    for (const element of this._reservationElements.values()) {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    }

    this._reservations.clear();
    this._reservationElements.clear();
    this._callbacks.clear();
    this._measurements.length = 0;
    this._destroyed = true;
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  /**
   * Initializes the Performance Observer for CLS tracking.
   */
  private _initializeObserver(): void {
    if (typeof PerformanceObserver === 'undefined') return;

    try {
      this._observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // Type assertion for LayoutShift entry
          const layoutShift = entry as PerformanceEntry & {
            hadRecentInput: boolean;
            value: number;
            sources?: Array<{ node?: Element }>;
          };

          // Ignore shifts caused by user input
          if (layoutShift.hadRecentInput) continue;

          this._processLayoutShift(layoutShift);
        }
      });

      this._observer.observe({ type: 'layout-shift', buffered: true });
    } catch (error) {
      // Performance Observer not supported or layout-shift not available
      console.warn('[CLSGuard] Layout shift observation not available:', error);
    }
  }

  /**
   * Processes a layout shift entry.
   */
  private _processLayoutShift(entry: PerformanceEntry & { value: number; sources?: Array<{ node?: Element }> }): void {
    const now = performance.now();

    // Create our layout shift entry
    const shiftEntry: LayoutShiftEntry = {
      elementId: this._extractElementId(entry.sources),
      value: entry.value,
      hadRecentInput: false,
      startTime: entry.startTime,
    };

    // Session window logic for CLS calculation
    // https://web.dev/cls/#what-is-a-good-cls-score
    const lastEntry = this._sessionEntries[this._sessionEntries.length - 1];

    if (
      this._sessionStart === 0 ||
      now - this._sessionStart > MAX_SESSION_WINDOW_MS ||
      (this._sessionEntries.length > 0 &&
        lastEntry != null &&
        now - lastEntry.startTime > SESSION_WINDOW_GAP_MS)
    ) {
      // Start new session
      this._sessionStart = now;
      this._sessionEntries = [shiftEntry];
    } else {
      // Continue current session
      this._sessionEntries.push(shiftEntry);
    }

    // Calculate session score
    const sessionScore = this._sessionEntries.reduce((sum, e) => sum + e.value, 0);

    // Update current score if this session is worse
    if (sessionScore > this._currentScore) {
      this._currentScore = sessionScore;
    }

    // Check threshold and notify
    if (this._currentScore > this._config.maxCLS) {
      const measurement = this.measureCLS();

      // Notify callbacks
      for (const callback of this._callbacks) {
        try {
          callback(measurement);
        } catch (error) {
          console.error('[CLSGuard] Callback error:', error);
        }
      }

      // Trigger threshold exceeded callback
      this._config.onThresholdExceeded?.(this._currentScore);
    }
  }

  /**
   * Extracts element ID from layout shift sources.
   */
  private _extractElementId(sources?: Array<{ node?: Element }>): string | null {
    if (sources == null || sources.length === 0) return null;

    const [firstSource] = sources;
    if (firstSource?.node == null) return null;

    const { node: element } = firstSource;
    const elementId = element.id;
    const dataLayoutId = element.getAttribute('data-layout-id');
    return (elementId != null && elementId !== '') ? elementId : dataLayoutId ?? null;
  }

  /**
   * Creates a reservation element in the DOM.
   */
  private _createReservationElement(
    id: string,
    dimensions: Dimensions,
    strategy: ReservationStrategy
  ): void {
    const element = document.createElement('div');
    element.setAttribute('data-cls-reservation', id);
    element.setAttribute('aria-hidden', 'true');

    switch (strategy) {
      case 'skeleton':
        element.style.cssText = createSkeletonStyles(dimensions);
        break;

      case 'dimensions':
        element.style.cssText = `
          width: ${dimensions.width}px;
          height: ${dimensions.height}px;
          visibility: hidden;
        `;
        break;

      case 'aspect-ratio': {
        const aspectRatio = dimensions.width / dimensions.height;
        element.style.cssText = `
          width: 100%;
          aspect-ratio: ${aspectRatio};
          max-width: ${dimensions.width}px;
          visibility: hidden;
        `;
        break;
      }

      case 'minimum':
        element.style.cssText = `
          min-width: ${dimensions.width}px;
          min-height: ${dimensions.height}px;
          visibility: hidden;
        `;
        break;
    }

    this._reservationElements.set(id, element);
  }

  /**
   * Gets the reservation element for a given ID.
   *
   * @param id - Reservation ID
   * @returns The reservation element or undefined
   */
  getReservationElement(id: string): HTMLElement | undefined {
    return this._reservationElements.get(id);
  }

  /**
   * Inserts a reservation element at a specific location.
   *
   * @param id - Reservation ID
   * @param container - Container element to insert into
   * @param position - Insert position
   */
  insertReservationElement(
    id: string,
    container: HTMLElement,
    position: 'prepend' | 'append' | 'before' | 'after' = 'append'
  ): void {
    const element = this._reservationElements.get(id);
    if (!element) return;

    switch (position) {
      case 'prepend':
        container.prepend(element);
        break;
      case 'append':
        container.appendChild(element);
        break;
      case 'before':
        container.parentNode?.insertBefore(element, container);
        break;
      case 'after':
        container.parentNode?.insertBefore(element, container.nextSibling);
        break;
    }
  }

  /**
   * Asserts that the guard has not been destroyed.
   */
  private _assertNotDestroyed(): void {
    if (this._destroyed) {
      throw new Error('CLSGuard has been destroyed and cannot be used.');
    }
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Creates a new CLSGuard instance.
 *
 * @param config - Optional configuration overrides
 * @returns A new CLSGuard instance
 */
export function createCLSGuard(config: Partial<CLSGuardConfig> = {}): CLSGuardInterface {
  return new CLSGuard(config);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculates the predicted CLS impact of a layout change.
 *
 * @param beforeRects - Element positions before change
 * @param afterRects - Element positions after change
 * @param viewportDimensions - Viewport dimensions
 * @returns Predicted CLS score
 */
export function predictCLSImpact(
  beforeRects: ReadonlyMap<string, DOMRect>,
  afterRects: ReadonlyMap<string, DOMRect>,
  viewportDimensions: Dimensions
): number {
  let totalImpact = 0;
  const viewportArea = viewportDimensions.width * viewportDimensions.height;

  for (const [id, beforeRect] of beforeRects) {
    const afterRect = afterRects.get(id);
    if (!afterRect) continue;

    // Calculate distance fraction
    const dx = Math.abs(afterRect.x - beforeRect.x);
    const dy = Math.abs(afterRect.y - beforeRect.y);
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDimension = Math.max(viewportDimensions.width, viewportDimensions.height);
    const distanceFraction = distance / maxDimension;

    // Calculate impact fraction (area of element relative to viewport)
    const elementArea = beforeRect.width * beforeRect.height;
    const impactFraction = elementArea / viewportArea;

    // CLS = impact fraction * distance fraction
    totalImpact += impactFraction * distanceFraction;
  }

  return totalImpact;
}

/**
 * Creates optimized dimension reservations based on content hints.
 *
 * @param contentHints - Array of content hints with expected dimensions
 * @returns Array of optimized reservations
 */
export function createOptimizedReservations(
  contentHints: Array<{
    id: string;
    type: 'image' | 'video' | 'text' | 'custom';
    expectedDimensions?: Dimensions;
    aspectRatio?: number;
  }>
): Array<{ id: string; dimensions: Dimensions; strategy: ReservationStrategy }> {
  return contentHints.map((hint) => {
    let dimensions: Dimensions;
    let strategy: ReservationStrategy;

    if (hint.expectedDimensions != null) {
      dimensions = hint.expectedDimensions;
      strategy = 'dimensions';
    } else if (hint.aspectRatio != null) {
      // Use aspect ratio with reasonable default width
      const defaultWidth = hint.type === 'video' ? 640 : 400;
      dimensions = {
        width: defaultWidth,
        height: defaultWidth / hint.aspectRatio,
      };
      strategy = 'aspect-ratio';
    } else {
      // Use type-based defaults
      switch (hint.type) {
        case 'image':
          dimensions = { width: 400, height: 300 };
          strategy = 'skeleton';
          break;
        case 'video':
          dimensions = { width: 640, height: 360 };
          strategy = 'aspect-ratio';
          break;
        case 'text':
          dimensions = { width: 600, height: 100 };
          strategy = 'minimum';
          break;
        default:
          dimensions = { width: 200, height: 150 };
          strategy = 'skeleton';
      }
    }

    return { id: hint.id, dimensions, strategy };
  });
}
