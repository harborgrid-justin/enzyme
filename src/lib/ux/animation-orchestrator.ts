/**
 * @file Animation Orchestrator
 * @description Performance-safe animation utilities with reduced motion support,
 * sequencing, and frame budget management.
 *
 * Features:
 * - Reduced motion support
 * - Animation sequencing
 * - Frame budget management
 * - CSS animation helpers
 * - Intersection-based animations
 * - Stagger animations
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Animation timing function
 */
export type TimingFunction =
  | 'linear'
  | 'ease'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'spring'
  | string;

/**
 * Animation state
 */
export type AnimationState = 'idle' | 'running' | 'paused' | 'finished' | 'cancelled';

/**
 * Animation options
 */
export interface AnimationOptions {
  /** Duration in ms */
  duration: number;
  /** Timing function */
  easing: TimingFunction;
  /** Delay before start in ms */
  delay?: number;
  /** Number of iterations */
  iterations?: number;
  /** Direction */
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  /** Fill mode */
  fill?: 'none' | 'forwards' | 'backwards' | 'both';
  /** Respect reduced motion preference */
  respectReducedMotion?: boolean;
  /** Reduced motion fallback duration */
  reducedMotionDuration?: number;
}

/**
 * Keyframe definition
 */
export interface AnimationKeyframe {
  offset?: number;
  opacity?: number;
  transform?: string;
  [property: string]: string | number | undefined;
}

/**
 * Animation sequence item
 */
export interface SequenceItem {
  element: HTMLElement | string;
  keyframes: AnimationKeyframe[] | PropertyIndexedKeyframes;
  options?: Partial<AnimationOptions>;
  offset?: number; // Start offset relative to sequence start
}

/**
 * Stagger options
 */
export interface StaggerOptions extends AnimationOptions {
  /** Delay between each item in ms */
  stagger: number;
  /** Direction of stagger */
  staggerDirection?: 'forward' | 'reverse' | 'center' | 'random';
  /** Starting index for stagger */
  startIndex?: number;
}

/**
 * Animation controller
 */
export interface AnimationController {
  play: () => void;
  pause: () => void;
  reverse: () => void;
  cancel: () => void;
  finish: () => void;
  getState: () => AnimationState;
  getCurrentTime: () => number;
  setCurrentTime: (time: number) => void;
  onFinish: (callback: () => void) => void;
  onCancel: (callback: () => void) => void;
}

/**
 * Intersection animation options
 */
export interface IntersectionAnimationOptions extends AnimationOptions {
  /** Root element for intersection */
  root?: Element | null;
  /** Root margin */
  rootMargin?: string;
  /** Intersection threshold */
  threshold?: number | number[];
  /** Animate only once */
  once?: boolean;
  /** Animate on exit as well */
  animateOnExit?: boolean;
  /** Exit keyframes */
  exitKeyframes?: AnimationKeyframe[];
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_OPTIONS: AnimationOptions = {
  duration: 300,
  easing: 'ease-out',
  delay: 0,
  iterations: 1,
  direction: 'normal',
  fill: 'forwards',
  respectReducedMotion: true,
  reducedMotionDuration: 0,
};

/**
 * Common easing functions
 */
export const EASING = {
  linear: 'linear',
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
  // Custom cubic beziers
  easeInQuad: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
  easeOutQuad: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  easeInOutQuad: 'cubic-bezier(0.455, 0.03, 0.515, 0.955)',
  easeInCubic: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
  easeOutCubic: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
  easeInOutCubic: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
  easeInQuart: 'cubic-bezier(0.895, 0.03, 0.685, 0.22)',
  easeOutQuart: 'cubic-bezier(0.165, 0.84, 0.44, 1)',
  easeInOutQuart: 'cubic-bezier(0.77, 0, 0.175, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
};

/**
 * Common animation presets
 */
export const PRESETS = {
  fadeIn: [{ opacity: 0 }, { opacity: 1 }],
  fadeOut: [{ opacity: 1 }, { opacity: 0 }],
  slideUp: [
    { transform: 'translateY(20px)', opacity: 0 },
    { transform: 'translateY(0)', opacity: 1 },
  ],
  slideDown: [
    { transform: 'translateY(-20px)', opacity: 0 },
    { transform: 'translateY(0)', opacity: 1 },
  ],
  slideLeft: [
    { transform: 'translateX(20px)', opacity: 0 },
    { transform: 'translateX(0)', opacity: 1 },
  ],
  slideRight: [
    { transform: 'translateX(-20px)', opacity: 0 },
    { transform: 'translateX(0)', opacity: 1 },
  ],
  scaleIn: [
    { transform: 'scale(0.9)', opacity: 0 },
    { transform: 'scale(1)', opacity: 1 },
  ],
  scaleOut: [
    { transform: 'scale(1)', opacity: 1 },
    { transform: 'scale(0.9)', opacity: 0 },
  ],
  rotate: [
    { transform: 'rotate(0deg)' },
    { transform: 'rotate(360deg)' },
  ],
  shake: [
    { transform: 'translateX(0)' },
    { transform: 'translateX(-10px)' },
    { transform: 'translateX(10px)' },
    { transform: 'translateX(-10px)' },
    { transform: 'translateX(10px)' },
    { transform: 'translateX(0)' },
  ],
  pulse: [
    { transform: 'scale(1)' },
    { transform: 'scale(1.05)' },
    { transform: 'scale(1)' },
  ],
};

// ============================================================================
// Animation Orchestrator
// ============================================================================

/**
 * Animation orchestrator for coordinating animations
 */
export class AnimationOrchestrator {
  private animations: Map<string, Animation> = new Map();
  private reducedMotion: boolean;
  private frameCallbacks: Array<(timestamp: number) => boolean> = [];
  private rafId: number | null = null;

  constructor() {
    this.reducedMotion = this.checkReducedMotion();
    this.setupReducedMotionListener();
  }

  /**
   * Animate an element with keyframes
   */
  animate(
    element: HTMLElement | string,
    keyframes: AnimationKeyframe[] | PropertyIndexedKeyframes,
    options: Partial<AnimationOptions> = {}
  ): AnimationController {
    const el = typeof element === 'string' ? document.querySelector<HTMLElement>(element) : element;
    if (!el) {
      return this.createNoopController();
    }

    const fullOptions = { ...DEFAULT_OPTIONS, ...options };

    // Respect reduced motion
    if (fullOptions.respectReducedMotion && this.reducedMotion) {
      return this.animateReduced(el, keyframes, fullOptions);
    }

    const webAnimationOptions: KeyframeAnimationOptions = {
      duration: fullOptions.duration,
      easing: this.resolveEasing(fullOptions.easing),
      delay: fullOptions.delay,
      iterations: fullOptions.iterations,
      direction: fullOptions.direction,
      fill: fullOptions.fill,
    };

    const animation = el.animate(keyframes, webAnimationOptions);
    const id = this.generateId();
    this.animations.set(id, animation);

    return this.createController(animation, id);
  }

  /**
   * Run animation sequence
   */
  sequence(items: SequenceItem[]): AnimationController {
    const controllers: AnimationController[] = [];
    let maxDuration = 0;

    for (const item of items) {
      const offset = item.offset || 0;
      const delay = (item.options?.delay || 0) + offset;
      const duration = (item.options?.duration || DEFAULT_OPTIONS.duration) + delay;
      maxDuration = Math.max(maxDuration, duration);

      const controller = this.animate(item.element, item.keyframes, {
        ...item.options,
        delay,
      });

      controllers.push(controller);
    }

    return this.createGroupController(controllers);
  }

  /**
   * Stagger animations across elements
   */
  stagger(
    elements: HTMLElement[] | NodeListOf<HTMLElement> | string,
    keyframes: AnimationKeyframe[] | PropertyIndexedKeyframes,
    options: Partial<StaggerOptions> = {}
  ): AnimationController {
    const els =
      typeof elements === 'string'
        ? Array.from(document.querySelectorAll<HTMLElement>(elements))
        : Array.from(elements);

    if (els.length === 0) {
      return this.createNoopController();
    }

    const fullOptions: StaggerOptions = {
      ...DEFAULT_OPTIONS,
      stagger: 50,
      staggerDirection: 'forward',
      startIndex: 0,
      ...options,
    };

    const controllers: AnimationController[] = [];
    const delays = this.calculateStaggerDelays(els.length, fullOptions);

    els.forEach((el, index) => {
      const controller = this.animate(el, keyframes, {
        ...fullOptions,
        delay: (fullOptions.delay || 0) + (delays[index] ?? 0),
      });
      controllers.push(controller);
    });

    return this.createGroupController(controllers);
  }

  /**
   * Create intersection-triggered animation
   */
  onIntersect(
    element: HTMLElement | string,
    keyframes: AnimationKeyframe[] | PropertyIndexedKeyframes,
    options: Partial<IntersectionAnimationOptions> = {}
  ): { observe: () => void; disconnect: () => void } {
    const el = typeof element === 'string' ? document.querySelector<HTMLElement>(element) : element;
    if (!el) {
      return { observe: () => {}, disconnect: () => {} };
    }

    const fullOptions: IntersectionAnimationOptions = {
      ...DEFAULT_OPTIONS,
      root: options.root ?? null,
      rootMargin: options.rootMargin ?? '0px',
      threshold: options.threshold ?? 0.1,
      once: options.once ?? true,
      animateOnExit: options.animateOnExit ?? false,
      ...options,
    };

    let hasAnimated = false;
    let observer: IntersectionObserver | null = null;

    const observe = (): void => {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              if (!hasAnimated || !fullOptions.once) {
                this.animate(el, keyframes, fullOptions);
                hasAnimated = true;
              }
            } else if (fullOptions.animateOnExit && fullOptions.exitKeyframes) {
              this.animate(el, fullOptions.exitKeyframes, fullOptions);
            }
          });
        },
        {
          root: fullOptions.root,
          rootMargin: fullOptions.rootMargin,
          threshold: fullOptions.threshold,
        }
      );

      observer.observe(el);
    };

    const disconnect = (): void => {
      observer?.disconnect();
      observer = null;
    };

    return { observe, disconnect };
  }

  /**
   * Animate with spring physics
   */
  spring(
    element: HTMLElement | string,
    from: Record<string, number>,
    to: Record<string, number>,
    options: {
      stiffness?: number;
      damping?: number;
      mass?: number;
      velocity?: number;
      respectReducedMotion?: boolean;
    } = {}
  ): AnimationController {
    const el = typeof element === 'string' ? document.querySelector<HTMLElement>(element) : element;
    if (!el) {
      return this.createNoopController();
    }

    const {
      stiffness = 170,
      damping = 26,
      mass = 1,
      velocity = 0,
      respectReducedMotion = true,
    } = options;

    // Use simple animation for reduced motion
    if (respectReducedMotion && this.reducedMotion) {
      // Convert Record<string, number> to AnimationKeyframe format
      const keyframes: AnimationKeyframe[] = [
        Object.fromEntries(Object.entries(from).map(([k, v]) => [k, v])),
        Object.fromEntries(Object.entries(to).map(([k, v]) => [k, v])),
      ];
      return this.animate(el, keyframes, {
        duration: 0,
        respectReducedMotion: false,
      });
    }

    let currentVelocity = velocity;
    const state: Record<string, number> = { ...from };
    let finished = false;
    let cancelled = false;
    const finishCallbacks: Array<() => void> = [];
    const cancelCallbacks: Array<() => void> = [];

    const update = (_timestamp: number): boolean => {
      if (finished || cancelled) return false;

      const dt = Math.min(1 / 60, 0.016); // Cap at 60fps
      let allSettled = true;

      for (const key in to) {
        const target = to[key];
        const current = state[key];
        if (target === undefined || current === undefined) continue;
        const diff = target - current;

        // Spring physics
        const springForce = stiffness * diff;
        const dampingForce = damping * currentVelocity;
        const acceleration = (springForce - dampingForce) / mass;

        currentVelocity += acceleration * dt;
        state[key] = current + currentVelocity * dt;

        // Check if settled
        if (Math.abs(diff) > 0.01 || Math.abs(currentVelocity) > 0.01) {
          allSettled = false;
        }
      }

      // Apply to element
      this.applyState(el, state);

      if (allSettled) {
        finished = true;
        this.applyState(el, to);
        finishCallbacks.forEach((cb) => cb());
        return false;
      }

      return true;
    };

    this.addFrameCallback(update);

    return {
      play: () => {},
      pause: () => {},
      reverse: () => {},
      cancel: () => {
        cancelled = true;
        cancelCallbacks.forEach((cb) => cb());
      },
      finish: () => {
        finished = true;
        this.applyState(el, to);
        finishCallbacks.forEach((cb) => cb());
      },
      getState: () => (finished ? 'finished' : cancelled ? 'cancelled' : 'running'),
      getCurrentTime: () => 0,
      setCurrentTime: () => {},
      onFinish: (cb) => finishCallbacks.push(cb),
      onCancel: (cb) => cancelCallbacks.push(cb),
    };
  }

  /**
   * Cancel all running animations
   */
  cancelAll(): void {
    this.animations.forEach((animation) => {
      animation.cancel();
    });
    this.animations.clear();
  }

  /**
   * Get reduced motion preference
   */
  isReducedMotion(): boolean {
    return this.reducedMotion;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private checkReducedMotion(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private setupReducedMotionListener(): void {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    mediaQuery.addEventListener('change', (e) => {
      this.reducedMotion = e.matches;
    });
  }

  private animateReduced(
    element: HTMLElement,
    keyframes: AnimationKeyframe[] | PropertyIndexedKeyframes,
    options: AnimationOptions
  ): AnimationController {
    const duration = options.reducedMotionDuration || 0;

    if (duration === 0) {
      // Apply final state immediately
      const finalKeyframe = Array.isArray(keyframes)
        ? keyframes[keyframes.length - 1]
        : keyframes;

      if (!finalKeyframe) {
        return this.createNoopController('finished');
      }

      Object.entries(finalKeyframe).forEach(([key, value]) => {
        if (key !== 'offset' && value !== undefined) {
          element.style.setProperty(key, String(value));
        }
      });

      return this.createNoopController('finished');
    }

    return this.animate(element, keyframes, {
      ...options,
      duration,
      respectReducedMotion: false,
    });
  }

  private resolveEasing(easing: TimingFunction): string {
    return easing in EASING ? EASING[easing as keyof typeof EASING] : easing;
  }

  private calculateStaggerDelays(count: number, options: StaggerOptions): number[] {
    const delays: number[] = [];
    const { stagger, staggerDirection, startIndex = 0 } = options;

    for (let i = 0; i < count; i++) {
      let delay: number;

      switch (staggerDirection) {
        case 'reverse':
          delay = (count - 1 - i) * stagger;
          break;
        case 'center':
          const center = count / 2;
          delay = Math.abs(i - center) * stagger;
          break;
        case 'random':
          delay = Math.random() * count * stagger;
          break;
        case 'forward':
        default:
          delay = (i - startIndex) * stagger;
          if (delay < 0) delay = 0;
      }

      delays.push(delay);
    }

    return delays;
  }

  private applyState(element: HTMLElement, state: Record<string, number>): void {
    const transforms: string[] = [];

    for (const [key, value] of Object.entries(state)) {
      if (key === 'x') {
        transforms.push(`translateX(${value}px)`);
      } else if (key === 'y') {
        transforms.push(`translateY(${value}px)`);
      } else if (key === 'scale') {
        transforms.push(`scale(${value})`);
      } else if (key === 'rotate') {
        transforms.push(`rotate(${value}deg)`);
      } else if (key === 'opacity') {
        element.style.opacity = String(value);
      } else {
        element.style.setProperty(key, String(value));
      }
    }

    if (transforms.length > 0) {
      element.style.transform = transforms.join(' ');
    }
  }

  private addFrameCallback(callback: (timestamp: number) => boolean): void {
    this.frameCallbacks.push(callback);
    this.startFrameLoop();
  }

  private startFrameLoop(): void {
    if (this.rafId !== null) return;

    const loop = (timestamp: number): void => {
      this.frameCallbacks = this.frameCallbacks.filter((cb) => cb(timestamp));

      if (this.frameCallbacks.length > 0) {
        this.rafId = requestAnimationFrame(loop);
      } else {
        this.rafId = null;
      }
    };

    this.rafId = requestAnimationFrame(loop);
  }

  private createController(animation: Animation, id: string): AnimationController {
    return {
      play: () => animation.play(),
      pause: () => animation.pause(),
      reverse: () => animation.reverse(),
      cancel: () => {
        animation.cancel();
        this.animations.delete(id);
      },
      finish: () => animation.finish(),
      getState: () => animation.playState as AnimationState,
      getCurrentTime: () => (animation.currentTime as number) || 0,
      setCurrentTime: (time) => {
        animation.currentTime = time;
      },
      onFinish: (callback) => {
        animation.addEventListener('finish', callback);
      },
      onCancel: (callback) => {
        animation.addEventListener('cancel', callback);
      },
    };
  }

  private createGroupController(controllers: AnimationController[]): AnimationController {
    return {
      play: () => controllers.forEach((c) => c.play()),
      pause: () => controllers.forEach((c) => c.pause()),
      reverse: () => controllers.forEach((c) => c.reverse()),
      cancel: () => controllers.forEach((c) => c.cancel()),
      finish: () => controllers.forEach((c) => c.finish()),
      getState: () => {
        const states = controllers.map((c) => c.getState());
        if (states.every((s) => s === 'finished')) return 'finished';
        if (states.every((s) => s === 'idle')) return 'idle';
        if (states.some((s) => s === 'running')) return 'running';
        if (states.some((s) => s === 'paused')) return 'paused';
        return 'cancelled';
      },
      getCurrentTime: () => Math.max(...controllers.map((c) => c.getCurrentTime())),
      setCurrentTime: (time) => controllers.forEach((c) => c.setCurrentTime(time)),
      onFinish: (callback) => {
        let finishedCount = 0;
        controllers.forEach((c) => {
          c.onFinish(() => {
            finishedCount++;
            if (finishedCount === controllers.length) {
              callback();
            }
          });
        });
      },
      onCancel: (callback) => controllers.forEach((c) => c.onCancel(callback)),
    };
  }

  private createNoopController(initialState: AnimationState = 'idle'): AnimationController {
    return {
      play: () => {},
      pause: () => {},
      reverse: () => {},
      cancel: () => {},
      finish: () => {},
      getState: () => initialState,
      getCurrentTime: () => 0,
      setCurrentTime: () => {},
      onFinish: () => {},
      onCancel: () => {},
    };
  }

  private generateId(): string {
    return `anim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let orchestratorInstance: AnimationOrchestrator | null = null;

/**
 * Get or create the global animation orchestrator
 */
export function getAnimationOrchestrator(): AnimationOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new AnimationOrchestrator();
  }
  return orchestratorInstance;
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Animate an element
 */
export function animate(
  element: HTMLElement | string,
  keyframes: AnimationKeyframe[] | PropertyIndexedKeyframes,
  options?: Partial<AnimationOptions>
): AnimationController {
  return getAnimationOrchestrator().animate(element, keyframes, options);
}

/**
 * Run animation sequence
 */
export function animateSequence(items: SequenceItem[]): AnimationController {
  return getAnimationOrchestrator().sequence(items);
}

/**
 * Stagger animations
 */
export function animateStagger(
  elements: HTMLElement[] | NodeListOf<HTMLElement> | string,
  keyframes: AnimationKeyframe[] | PropertyIndexedKeyframes,
  options?: Partial<StaggerOptions>
): AnimationController {
  return getAnimationOrchestrator().stagger(elements, keyframes, options);
}

/**
 * Spring animation
 */
export function animateSpring(
  element: HTMLElement | string,
  from: Record<string, number>,
  to: Record<string, number>,
  options?: Parameters<AnimationOrchestrator['spring']>[3]
): AnimationController {
  return getAnimationOrchestrator().spring(element, from, to, options);
}
