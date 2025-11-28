/**
 * @fileoverview FLIP-Based Morph Transition System
 *
 * Implements a high-performance animation system using the FLIP (First, Last,
 * Invert, Play) technique for smooth layout morphing between states. The system
 * uses only GPU-accelerated properties (transform, opacity) to achieve 60fps
 * animations.
 *
 * Key Features:
 * - FLIP animation technique
 * - GPU-accelerated transforms only
 * - Interruptible transitions
 * - Configurable easing and timing
 * - Staggered animations for multiple elements
 * - Spring physics easing
 *
 * @module layouts/adaptive/morph-transition
 * @version 1.0.0
 */

import type {
  AnimationContext,
  EasingFunction,
  FLIPSnapshot,
  LayoutRect,
  MorphControllerInterface,
  MorphTransitionConfig,
  Transform3D,
} from './types.ts';
import { DEFAULT_MORPH_TRANSITION_CONFIG } from './types.ts';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default transform state.
 */
const IDENTITY_TRANSFORM: Transform3D = {
  translateX: 0,
  translateY: 0,
  translateZ: 0,
  scaleX: 1,
  scaleY: 1,
  scaleZ: 1,
  rotateX: 0,
  rotateY: 0,
  rotateZ: 0,
} as const;

/**
 * Spring physics constants for spring easing.
 */
const SPRING_CONSTANTS = {
  stiffness: 100,
  damping: 10,
  mass: 1,
} as const;

// =============================================================================
// EASING FUNCTIONS
// =============================================================================

/**
 * Collection of easing functions.
 */
const EASING_FUNCTIONS: Record<string, (t: number) => number> = {
  linear: (t) => t,
  ease: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  'ease-in': (t) => t * t * t,
  'ease-out': (t) => (--t) * t * t + 1,
  'ease-in-out': (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  spring: createSpringEasing(SPRING_CONSTANTS.stiffness, SPRING_CONSTANTS.damping, SPRING_CONSTANTS.mass),
  bounce: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;

    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  },
};

/**
 * Creates a spring easing function.
 */
function createSpringEasing(stiffness: number, damping: number, mass: number): (t: number) => number {
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));

  if (zeta < 1) {
    // Underdamped
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    return (t: number) => {
      return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + (zeta * w0 / wd) * Math.sin(wd * t));
    };
  } else {
    // Critically damped or overdamped
    return (t: number) => {
      return 1 - (1 + w0 * t) * Math.exp(-w0 * t);
    };
  }
}

/**
 * Parses a cubic-bezier string and returns an easing function.
 */
function parseCubicBezier(bezierStr: string): (t: number) => number {
  const match = bezierStr.match(/cubic-bezier\(([^)]+)\)/);
  if (!match?.[1]) return EASING_FUNCTIONS.ease as (t: number) => number;

  const [p1x, p1y, p2x, p2y] = match[1].split(',').map((s) => parseFloat(s.trim()));
  if (p1x === undefined || p1y === undefined || p2x === undefined || p2y === undefined) {
    return EASING_FUNCTIONS.ease as (t: number) => number;
  }

  // Approximate cubic bezier using de Casteljau's algorithm
  return (t: number) => {
    const cx = 3 * p1x;
    const bx = 3 * (p2x - p1x) - cx;
    const ax = 1 - cx - bx;

    const cy = 3 * p1y;
    const by = 3 * (p2y - p1y) - cy;
    const ay = 1 - cy - by;

    // Solve for t given x using Newton-Raphson
    let x = t;
    for (let i = 0; i < 8; i++) {
      const currentX = ((ax * x + bx) * x + cx) * x;
      const currentSlope = (3 * ax * x + 2 * bx) * x + cx;
      if (Math.abs(currentSlope) < 1e-6) break;
      x -= (currentX - t) / currentSlope;
    }

    return ((ay * x + by) * x + cy) * x;
  };
}

/**
 * Gets an easing function by name or cubic-bezier string.
 */
function getEasingFunction(easing: EasingFunction): (t: number) => number {
  if (easing.startsWith('cubic-bezier')) {
    return parseCubicBezier(easing);
  }
  return (EASING_FUNCTIONS[easing] ?? EASING_FUNCTIONS.ease) as (t: number) => number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generates a unique batch ID.
 */
function generateBatchId(): string {
  return `morph_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Gets the current layout rect of an element.
 */
function getLayoutRect(element: HTMLElement): LayoutRect {
  const rect = element.getBoundingClientRect();
  const style = getComputedStyle(element);

  // Parse current transform
  const transform = style.transform;
  let scaleX = 1;
  let scaleY = 1;
  let rotation = 0;

  if (transform && transform !== 'none') {
    const matrix = new DOMMatrix(transform);
    scaleX = Math.sqrt(matrix.a * matrix.a + matrix.b * matrix.b);
    scaleY = Math.sqrt(matrix.c * matrix.c + matrix.d * matrix.d);
    rotation = Math.atan2(matrix.b, matrix.a) * (180 / Math.PI);
  }

  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    scaleX,
    scaleY,
    rotation,
    opacity: parseFloat(style.opacity) || 1,
  };
}

/**
 * Calculates the invert transform from first to last position.
 */
function calculateInvert(first: LayoutRect, last: LayoutRect): Transform3D {
  return {
    translateX: first.x - last.x,
    translateY: first.y - last.y,
    translateZ: 0,
    scaleX: first.width / (last.width || 1),
    scaleY: first.height / (last.height || 1),
    scaleZ: 1,
    rotateX: 0,
    rotateY: 0,
    rotateZ: first.rotation - last.rotation,
  };
}

/**
 * Applies a transform to an element.
 */
function applyTransform(element: HTMLElement, transform: Transform3D, opacity: number): void {
  const { translateX, translateY, scaleX, scaleY, rotateZ } = transform;

  // Use transform3d to force GPU acceleration
  element.style.transform = `
    translate3d(${translateX}px, ${translateY}px, 0)
    scale(${scaleX}, ${scaleY})
    rotate(${rotateZ}deg)
  `.replace(/\s+/g, ' ').trim();

  element.style.opacity = String(opacity);
}

/**
 * Interpolates between two values.
 */
function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/**
 * Interpolates between two transforms.
 */
function lerpTransform(from: Transform3D, to: Transform3D, t: number): Transform3D {
  return {
    translateX: lerp(from.translateX, to.translateX, t),
    translateY: lerp(from.translateY, to.translateY, t),
    translateZ: lerp(from.translateZ, to.translateZ, t),
    scaleX: lerp(from.scaleX, to.scaleX, t),
    scaleY: lerp(from.scaleY, to.scaleY, t),
    scaleZ: lerp(from.scaleZ, to.scaleZ, t),
    rotateX: lerp(from.rotateX, to.rotateX, t),
    rotateY: lerp(from.rotateY, to.rotateY, t),
    rotateZ: lerp(from.rotateZ, to.rotateZ, t),
  };
}

// =============================================================================
// MORPH CONTROLLER IMPLEMENTATION
// =============================================================================

/**
 * Controls FLIP-based morph transitions between layout states.
 *
 * @example
 * ```typescript
 * const controller = createMorphController();
 *
 * // Capture first state
 * const first = controller.snapshotFirst(elements);
 *
 * // Apply layout changes...
 *
 * // Capture last state
 * const last = controller.snapshotLast(elements);
 *
 * // Create and play animation
 * const context = controller.createAnimation(first, last, elements);
 * await controller.play(context);
 * ```
 */
export class MorphController implements MorphControllerInterface {
  private _config: MorphTransitionConfig;
  private _activeContext: AnimationContext | null = null;
  private _animationFrameId: number | null = null;
  private _destroyed: boolean = false;

  constructor(config: Partial<MorphTransitionConfig> = {}) {
    this._config = { ...DEFAULT_MORPH_TRANSITION_CONFIG, ...config };
  }

  /**
   * Current configuration.
   */
  get config(): MorphTransitionConfig {
    return this._config;
  }

  /**
   * Whether a transition is currently running.
   */
  get isTransitioning(): boolean {
    return this._activeContext?.isRunning ?? false;
  }

  /**
   * Updates the controller configuration.
   */
  configure(config: Partial<MorphTransitionConfig>): void {
    this._assertNotDestroyed();
    this._config = { ...this._config, ...config };
  }

  /**
   * Captures the "First" state of elements (before layout change).
   *
   * @param elements - Map of element IDs to elements
   * @returns Map of element IDs to their layout rects
   */
  snapshotFirst(elements: Map<string, HTMLElement>): Map<string, LayoutRect> {
    this._assertNotDestroyed();
    const rects = new Map<string, LayoutRect>();

    for (const [id, element] of elements) {
      rects.set(id, getLayoutRect(element));
    }

    return rects;
  }

  /**
   * Captures the "Last" state of elements (after layout change).
   *
   * @param elements - Map of element IDs to elements
   * @returns Map of element IDs to their layout rects
   */
  snapshotLast(elements: Map<string, HTMLElement>): Map<string, LayoutRect> {
    this._assertNotDestroyed();
    return this.snapshotFirst(elements);
  }

  /**
   * Creates an animation context from first and last states.
   *
   * @param first - First (before) layout rects
   * @param last - Last (after) layout rects
   * @param elements - Map of element IDs to elements
   * @returns Animation context
   */
  createAnimation(
    first: Map<string, LayoutRect>,
    last: Map<string, LayoutRect>,
    elements: Map<string, HTMLElement>
  ): AnimationContext {
    this._assertNotDestroyed();

    const snapshots = new Map<string, FLIPSnapshot>();

    for (const [id, firstRect] of first) {
      const lastRect = last.get(id);
      if (!lastRect) continue;

      const invert = calculateInvert(firstRect, lastRect);

      snapshots.set(id, {
        id,
        first: firstRect,
        last: lastRect,
        invert,
        playState: 'pending',
      });
    }

    // Apply inverted transforms immediately
    for (const [id, snapshot] of snapshots) {
      const element = elements.get(id);
      if (element) {
        applyTransform(element, snapshot.invert, snapshot.first.opacity);
      }
    }

    // Force layout to ensure transforms are applied
    if (elements.size > 0) {
      elements.values().next().value?.offsetHeight;
    }

    const context: AnimationContext = {
      batchId: generateBatchId(),
      snapshots,
      progress: 0,
      isRunning: false,
      startTime: null,
      cancel: () => this.cancel(),
    };

    return context;
  }

  /**
   * Plays an animation context.
   *
   * @param context - The animation context to play
   * @returns Promise that resolves when animation completes
   */
  async play(context: AnimationContext): Promise<void> {
    this._assertNotDestroyed();

    // Cancel any existing animation
    if (this._activeContext?.isRunning) {
      if (this._config.interruptible) {
        this.cancel();
      } else {
        // Wait for current animation to complete
        return new Promise((resolve) => {
          const checkComplete = () => {
            if (!this._activeContext?.isRunning) {
              this.play(context).then(resolve);
            } else {
              requestAnimationFrame(checkComplete);
            }
          };
          requestAnimationFrame(checkComplete);
        });
      }
    }

    this._activeContext = {
      ...context,
      isRunning: true,
      startTime: null,
    };

    this._config.onStart?.();

    return new Promise((resolve) => {
      const elements = this._collectElements(context.snapshots);
      const easingFn = getEasingFunction(this._config.easing);

      const animate = (timestamp: number) => {
        if (!this._activeContext || !this._activeContext.isRunning) {
          resolve();
          return;
        }

        if (this._activeContext.startTime === null) {
          this._activeContext = {
            ...this._activeContext,
            startTime: timestamp + this._config.delay,
          };
        }

        const elapsed = timestamp - (this._activeContext.startTime ?? timestamp);

        if (elapsed < 0) {
          // Still in delay phase
          this._animationFrameId = requestAnimationFrame(animate);
          return;
        }

        const rawProgress = Math.min(elapsed / this._config.duration, 1);
        const easedProgress = easingFn(rawProgress);

        this._activeContext = {
          ...this._activeContext,
          progress: easedProgress,
        };

        this._config.onFrame?.(easedProgress);

        // Animate each element with stagger
        let index = 0;
        for (const [id, snapshot] of context.snapshots) {
          const element = elements.get(id);
          if (!element) continue;

          // Calculate staggered progress
          const staggerDelay = Math.min(
            index * this._config.staggerDelay,
            this._config.maxStaggerDelay
          );
          const staggerProgress = Math.max(
            0,
            Math.min(1, (elapsed - staggerDelay) / this._config.duration)
          );
          const staggeredEasedProgress = easingFn(staggerProgress);

          // Interpolate from inverted state to identity (no transform)
          const currentTransform = lerpTransform(
            snapshot.invert,
            IDENTITY_TRANSFORM,
            staggeredEasedProgress
          );

          const currentOpacity = lerp(snapshot.first.opacity, snapshot.last.opacity, staggeredEasedProgress);

          applyTransform(element, currentTransform, currentOpacity);

          index++;
        }

        if (rawProgress < 1) {
          this._animationFrameId = requestAnimationFrame(animate);
        } else {
          // Animation complete
          this._cleanupAnimation(elements);
          this._activeContext = {
            ...this._activeContext,
            isRunning: false,
            progress: 1,
          };
          this._config.onComplete?.();
          resolve();
        }
      };

      this._animationFrameId = requestAnimationFrame(animate);
    });
  }

  /**
   * Cancels the current animation.
   */
  cancel(): void {
    if (this._animationFrameId !== null) {
      cancelAnimationFrame(this._animationFrameId);
      this._animationFrameId = null;
    }

    if (this._activeContext?.isRunning) {
      const elements = this._collectElements(this._activeContext.snapshots);
      this._cleanupAnimation(elements);

      this._activeContext = {
        ...this._activeContext,
        isRunning: false,
      };

      for (const [_id, snapshot] of this._activeContext.snapshots) {
        (snapshot as { playState: string }).playState = 'interrupted';
      }

      this._config.onInterrupt?.();
    }
  }

  /**
   * Cleans up all resources.
   */
  destroy(): void {
    if (this._destroyed) return;

    this.cancel();
    this._destroyed = true;
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  /**
   * Collects elements from the DOM based on snapshot IDs.
   */
  private _collectElements(snapshots: ReadonlyMap<string, FLIPSnapshot>): Map<string, HTMLElement> {
    const elements = new Map<string, HTMLElement>();

    for (const [id] of snapshots) {
      const element = document.querySelector(`[data-layout-id="${id}"]`) as HTMLElement | null;
      if (element) {
        elements.set(id, element);
      }
    }

    return elements;
  }

  /**
   * Cleans up element styles after animation.
   */
  private _cleanupAnimation(elements: Map<string, HTMLElement>): void {
    for (const element of elements.values()) {
      element.style.transform = '';
      element.style.opacity = '';
    }
  }

  /**
   * Asserts that the controller has not been destroyed.
   */
  private _assertNotDestroyed(): void {
    if (this._destroyed) {
      throw new Error('MorphController has been destroyed and cannot be used.');
    }
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Creates a new MorphController instance.
 *
 * @param config - Optional configuration overrides
 * @returns A new MorphController instance
 */
export function createMorphController(config: Partial<MorphTransitionConfig> = {}): MorphControllerInterface {
  return new MorphController(config);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Creates a FLIP animation helper for a single element.
 *
 * @param element - Element to animate
 * @param config - Animation configuration
 * @returns FLIP animation controller
 */
export function createElementFLIP(
  element: HTMLElement,
  config: Partial<MorphTransitionConfig> = {}
): {
  first: () => LayoutRect;
  last: () => LayoutRect;
  invert: (first: LayoutRect, last: LayoutRect) => void;
  play: () => Promise<void>;
} {
  const controller = new MorphController(config);
  let firstRect: LayoutRect | null = null;
  let lastRect: LayoutRect | null = null;

  const id = element.getAttribute('data-layout-id') ??
    `flip_${Math.random().toString(36).substring(2, 9)}`;

  if (!element.hasAttribute('data-layout-id')) {
    element.setAttribute('data-layout-id', id);
  }

  return {
    first: () => {
      firstRect = getLayoutRect(element);
      return firstRect;
    },
    last: () => {
      lastRect = getLayoutRect(element);
      return lastRect;
    },
    invert: (first: LayoutRect, last: LayoutRect) => {
      const invert = calculateInvert(first, last);
      applyTransform(element, invert, first.opacity);
    },
    play: async () => {
      if (!firstRect || !lastRect) {
        throw new Error('Must call first() and last() before play()');
      }

      const elements = new Map([[id, element]]);
      const first = new Map([[id, firstRect]]);
      const last = new Map([[id, lastRect]]);

      const context = controller.createAnimation(first, last, elements);
      await controller.play(context);

      firstRect = null;
      lastRect = null;
    },
  };
}

/**
 * Performs a quick FLIP animation for layout changes.
 *
 * @param elements - Elements to animate
 * @param layoutChange - Function that performs the layout change
 * @param config - Animation configuration
 */
export async function performFLIP(
  elements: HTMLElement[],
  layoutChange: () => void | Promise<void>,
  config: Partial<MorphTransitionConfig> = {}
): Promise<void> {
  const controller = new MorphController(config);
  const elementMap = new Map<string, HTMLElement>();

  // Ensure all elements have layout IDs
  for (const element of elements) {
    let id = element.getAttribute('data-layout-id');
    if (!id) {
      id = `flip_${Math.random().toString(36).substring(2, 9)}`;
      element.setAttribute('data-layout-id', id);
    }
    elementMap.set(id, element);
  }

  // Capture first state
  const first = controller.snapshotFirst(elementMap);

  // Perform layout change
  await layoutChange();

  // Capture last state
  const last = controller.snapshotLast(elementMap);

  // Create and play animation
  const context = controller.createAnimation(first, last, elementMap);
  await controller.play(context);

  controller.destroy();
}
