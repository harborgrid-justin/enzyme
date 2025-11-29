/**
 * @file Prefetch Strategies
 * @description Multiple prefetch strategies for different use cases including
 * viewport-based, interaction-based, and time-based prefetching.
 *
 * Features:
 * - Viewport intersection prefetching
 * - Hover/focus prefetching
 * - Idle time prefetching
 * - Sequential prefetching
 * - Conditional prefetching
 * - Strategy composition
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Prefetch strategy type
 */
export type PrefetchStrategyType =
  | 'viewport'
  | 'hover'
  | 'focus'
  | 'idle'
  | 'sequential'
  | 'immediate'
  | 'conditional';

/**
 * Prefetch target
 */
export interface PrefetchTarget {
  url: string;
  type: 'document' | 'script' | 'style' | 'image' | 'font' | 'fetch';
  as?: string;
  crossOrigin?: 'anonymous' | 'use-credentials';
  importance?: 'high' | 'low' | 'auto';
}

/**
 * Strategy execution context
 */
export interface StrategyContext {
  networkQuality: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
  dataSaver: boolean;
  viewportWidth: number;
  viewportHeight: number;
  isVisible: boolean;
  isIdle: boolean;
  memoryPressure: 'none' | 'moderate' | 'critical';
}

/**
 * Strategy result
 */
export interface StrategyResult {
  shouldPrefetch: boolean;
  targets: PrefetchTarget[];
  delay?: number;
  reason: string;
}

/**
 * Base strategy configuration
 */
export interface BaseStrategyConfig {
  /** Enable the strategy */
  enabled: boolean;
  /** Respect data saver preference */
  respectDataSaver: boolean;
  /** Minimum network quality required */
  minNetworkQuality: '4g' | '3g' | '2g' | 'slow-2g';
  /** Maximum memory pressure to allow prefetch */
  maxMemoryPressure: 'none' | 'moderate' | 'critical';
}

/**
 * Viewport strategy configuration
 */
export interface ViewportStrategyConfig extends BaseStrategyConfig {
  /** Root margin for intersection observer */
  rootMargin: string;
  /** Intersection threshold */
  threshold: number;
  /** Delay after intersection before prefetch */
  delay: number;
}

/**
 * Hover strategy configuration
 */
export interface HoverStrategyConfig extends BaseStrategyConfig {
  /** Delay after hover before prefetch */
  delay: number;
  /** Cancel if unhover before delay */
  cancelOnUnhover: boolean;
  /** Enable touch device support */
  touchSupport: boolean;
}

/**
 * Idle strategy configuration
 */
export interface IdleStrategyConfig extends BaseStrategyConfig {
  /** Timeout for idle callback */
  timeout: number;
  /** Minimum idle time required */
  minIdleTime: number;
}

/**
 * Sequential strategy configuration
 */
export interface SequentialStrategyConfig extends BaseStrategyConfig {
  /** Delay between sequential prefetches */
  intervalDelay: number;
  /** Maximum items to prefetch */
  maxItems: number;
  /** Prioritize by */
  prioritizeBy: 'order' | 'size' | 'importance';
}

/**
 * Conditional strategy configuration
 */
export interface ConditionalStrategyConfig extends BaseStrategyConfig {
  /** Condition function */
  condition: (context: StrategyContext) => boolean;
  /** Re-evaluate interval */
  reevaluateInterval: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_BASE_CONFIG: BaseStrategyConfig = {
  enabled: true,
  respectDataSaver: true,
  minNetworkQuality: '3g',
  maxMemoryPressure: 'moderate',
};

const NETWORK_QUALITY_SCORES: Record<string, number> = {
  '4g': 4,
  '3g': 3,
  '2g': 2,
  'slow-2g': 1,
  unknown: 3,
};

// ============================================================================
// Base Strategy
// ============================================================================

/**
 * Abstract base class for prefetch strategies
 */
export abstract class PrefetchStrategy {
  protected config: BaseStrategyConfig;
  protected targets: PrefetchTarget[] = [];

  constructor(config: Partial<BaseStrategyConfig> = {}) {
    this.config = { ...DEFAULT_BASE_CONFIG, ...config };
  }

  /**
   * Execute the strategy
   */
  abstract execute(context: StrategyContext): StrategyResult;

  /**
   * Add prefetch target
   */
  addTarget(target: PrefetchTarget): void {
    this.targets.push(target);
  }

  /**
   * Add multiple targets
   */
  addTargets(targets: PrefetchTarget[]): void {
    this.targets.push(...targets);
  }

  /**
   * Clear targets
   */
  clearTargets(): void {
    this.targets = [];
  }

  /**
   * Get current targets
   */
  getTargets(): PrefetchTarget[] {
    return [...this.targets];
  }

  /**
   * Check if prefetching should be allowed based on context
   */
  protected shouldAllowPrefetch(context: StrategyContext): {
    allowed: boolean;
    reason: string;
  } {
    if (!this.config.enabled) {
      return { allowed: false, reason: 'Strategy disabled' };
    }

    if (this.config.respectDataSaver && context.dataSaver) {
      return { allowed: false, reason: 'Data saver enabled' };
    }

    const currentQuality = NETWORK_QUALITY_SCORES[context.networkQuality] ?? 3;
    const minQuality = NETWORK_QUALITY_SCORES[this.config.minNetworkQuality] ?? 3;

    if (currentQuality < minQuality) {
      return { allowed: false, reason: `Network quality ${context.networkQuality} below minimum` };
    }

    const pressureLevels = ['none', 'moderate', 'critical'];
    const currentPressure = pressureLevels.indexOf(context.memoryPressure);
    const maxPressure = pressureLevels.indexOf(this.config.maxMemoryPressure);

    if (currentPressure > maxPressure) {
      return { allowed: false, reason: `Memory pressure ${context.memoryPressure} too high` };
    }

    return { allowed: true, reason: 'Conditions met' };
  }
}

// ============================================================================
// Viewport Strategy
// ============================================================================

/**
 * Prefetch when elements enter the viewport
 */
export class ViewportPrefetchStrategy extends PrefetchStrategy {
  private viewportConfig: ViewportStrategyConfig;
  private observer: IntersectionObserver | null = null;
  private observedElements: Map<Element, PrefetchTarget> = new Map();
  private prefetchedUrls: Set<string> = new Set();
  private onPrefetch: ((target: PrefetchTarget) => void) | null = null;

  constructor(config: Partial<ViewportStrategyConfig> = {}) {
    super(config);
    this.viewportConfig = {
      ...DEFAULT_BASE_CONFIG,
      rootMargin: '200px',
      threshold: 0,
      delay: 0,
      ...config,
    };
  }

  execute(context: StrategyContext): StrategyResult {
    const check = this.shouldAllowPrefetch(context);
    if (!check.allowed) {
      return { shouldPrefetch: false, targets: [], reason: check.reason };
    }

    // Return targets that are visible
    const visibleTargets = this.targets.filter((t) => !this.prefetchedUrls.has(t.url));

    return {
      shouldPrefetch: visibleTargets.length > 0,
      targets: visibleTargets,
      delay: this.viewportConfig.delay,
      reason: 'Elements in viewport',
    };
  }

  /**
   * Start observing an element
   */
  observe(element: Element, target: PrefetchTarget): void {
    if (!this.observer) {
      this.initObserver();
    }

    this.observedElements.set(element, target);
    this.observer?.observe(element);
  }

  /**
   * Stop observing an element
   */
  unobserve(element: Element): void {
    this.observedElements.delete(element);
    this.observer?.unobserve(element);
  }

  /**
   * Set prefetch callback
   */
  setOnPrefetch(callback: (target: PrefetchTarget) => void): void {
    this.onPrefetch = callback;
  }

  /**
   * Disconnect observer
   */
  disconnect(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.observedElements.clear();
  }

  private initObserver(): void {
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = this.observedElements.get(entry.target);
            if (target && !this.prefetchedUrls.has(target.url)) {
              this.handleIntersection(entry.target, target);
            }
          }
        });
      },
      {
        rootMargin: this.viewportConfig.rootMargin,
        threshold: this.viewportConfig.threshold,
      }
    );
  }

  private handleIntersection(element: Element, target: PrefetchTarget): void {
    const execute = (): void => {
      this.prefetchedUrls.add(target.url);
      this.onPrefetch?.(target);
      this.unobserve(element);
    };

    if (this.viewportConfig.delay > 0) {
      setTimeout(execute, this.viewportConfig.delay);
    } else {
      execute();
    }
  }
}

// ============================================================================
// Hover Strategy
// ============================================================================

/**
 * Prefetch on hover/focus
 */
export class HoverPrefetchStrategy extends PrefetchStrategy {
  private hoverConfig: HoverStrategyConfig;
  private hoverTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private prefetchedUrls: Set<string> = new Set();
  private onPrefetch: ((target: PrefetchTarget) => void) | null = null;

  constructor(config: Partial<HoverStrategyConfig> = {}) {
    super(config);
    this.hoverConfig = {
      ...DEFAULT_BASE_CONFIG,
      delay: 100,
      cancelOnUnhover: true,
      touchSupport: true,
      ...config,
    };
  }

  execute(context: StrategyContext): StrategyResult {
    const check = this.shouldAllowPrefetch(context);
    if (!check.allowed) {
      return { shouldPrefetch: false, targets: [], reason: check.reason };
    }

    return {
      shouldPrefetch: true,
      targets: this.targets.filter((t) => !this.prefetchedUrls.has(t.url)),
      delay: this.hoverConfig.delay,
      reason: 'Hover/focus detected',
    };
  }

  /**
   * Handle hover start
   */
  handleHoverStart(target: PrefetchTarget): void {
    if (this.prefetchedUrls.has(target.url)) {
      return;
    }

    const timer = setTimeout(() => {
      this.prefetchedUrls.add(target.url);
      this.onPrefetch?.(target);
      this.hoverTimers.delete(target.url);
    }, this.hoverConfig.delay);

    this.hoverTimers.set(target.url, timer);
  }

  /**
   * Handle hover end
   */
  handleHoverEnd(target: PrefetchTarget): void {
    if (this.hoverConfig.cancelOnUnhover) {
      const timer = this.hoverTimers.get(target.url);
      if (timer) {
        clearTimeout(timer);
        this.hoverTimers.delete(target.url);
      }
    }
  }

  /**
   * Set prefetch callback
   */
  setOnPrefetch(callback: (target: PrefetchTarget) => void): void {
    this.onPrefetch = callback;
  }

  /**
   * Create event handlers for an element
   */
  createHandlers(target: PrefetchTarget): {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onFocus: () => void;
    onBlur: () => void;
    onTouchStart?: () => void;
  } {
    const handlers = {
      onMouseEnter: () => this.handleHoverStart(target),
      onMouseLeave: () => this.handleHoverEnd(target),
      onFocus: () => this.handleHoverStart(target),
      onBlur: () => this.handleHoverEnd(target),
    };

    if (this.hoverConfig.touchSupport) {
      return {
        ...handlers,
        onTouchStart: () => this.handleHoverStart(target),
      };
    }

    return handlers;
  }

  /**
   * Cleanup all pending hovers
   */
  cleanup(): void {
    for (const timer of this.hoverTimers.values()) {
      clearTimeout(timer);
    }
    this.hoverTimers.clear();
  }
}

// ============================================================================
// Idle Strategy
// ============================================================================

/**
 * Prefetch during browser idle time
 */
export class IdlePrefetchStrategy extends PrefetchStrategy {
  private idleConfig: IdleStrategyConfig;
  private idleCallbackId: number | null = null;
  private prefetchedUrls: Set<string> = new Set();
  private onPrefetch: ((target: PrefetchTarget) => void) | null = null;

  constructor(config: Partial<IdleStrategyConfig> = {}) {
    super(config);
    this.idleConfig = {
      ...DEFAULT_BASE_CONFIG,
      timeout: 2000,
      minIdleTime: 50,
      ...config,
    };
  }

  execute(context: StrategyContext): StrategyResult {
    const check = this.shouldAllowPrefetch(context);
    if (!check.allowed) {
      return { shouldPrefetch: false, targets: [], reason: check.reason };
    }

    if (!context.isIdle) {
      return { shouldPrefetch: false, targets: [], reason: 'Browser not idle' };
    }

    return {
      shouldPrefetch: true,
      targets: this.targets.filter((t) => !this.prefetchedUrls.has(t.url)),
      reason: 'Browser idle',
    };
  }

  /**
   * Schedule idle prefetch
   */
  scheduleIdlePrefetch(): void {
    if (typeof window === 'undefined') return;

    const hasIdleCallback = 'requestIdleCallback' in window;

    if (hasIdleCallback) {
      this.idleCallbackId = (window as Window & typeof globalThis & {
        requestIdleCallback: (
          callback: (deadline: IdleDeadline) => void,
          options?: { timeout?: number }
        ) => number;
      }).requestIdleCallback(
        (deadline) => this.handleIdleCallback(deadline),
        { timeout: this.idleConfig.timeout }
      );
    } else {
      // Fallback to setTimeout
      this.idleCallbackId = window.setTimeout(() => {
        this.handleFallbackIdle();
      }, this.idleConfig.timeout) as unknown as number;
    }
  }

  /**
   * Cancel scheduled prefetch
   */
  cancel(): void {
    if (this.idleCallbackId !== null) {
      if ('cancelIdleCallback' in window) {
        (window as Window & typeof globalThis & {
          cancelIdleCallback: (handle: number) => void;
        }).cancelIdleCallback(this.idleCallbackId);
      } else {
        clearTimeout(this.idleCallbackId);
      }
      this.idleCallbackId = null;
    }
  }

  /**
   * Set prefetch callback
   */
  setOnPrefetch(callback: (target: PrefetchTarget) => void): void {
    this.onPrefetch = callback;
  }

  private handleIdleCallback(deadline: IdleDeadline): void {
    while (
      deadline.timeRemaining() >= this.idleConfig.minIdleTime &&
      this.targets.length > 0
    ) {
      const target = this.targets.find((t) => !this.prefetchedUrls.has(t.url));
      if (!target) break;

      this.prefetchedUrls.add(target.url);
      this.onPrefetch?.(target);
    }

    // Schedule another callback if there are remaining targets
    if (this.targets.some((t) => !this.prefetchedUrls.has(t.url))) {
      this.scheduleIdlePrefetch();
    }
  }

  private handleFallbackIdle(): void {
    const target = this.targets.find((t) => !this.prefetchedUrls.has(t.url));
    if (target) {
      this.prefetchedUrls.add(target.url);
      this.onPrefetch?.(target);
    }

    // Schedule another if there are remaining targets
    if (this.targets.some((t) => !this.prefetchedUrls.has(t.url))) {
      this.scheduleIdlePrefetch();
    }
  }
}

// ============================================================================
// Sequential Strategy
// ============================================================================

/**
 * Prefetch resources sequentially with delays
 */
export class SequentialPrefetchStrategy extends PrefetchStrategy {
  private sequentialConfig: SequentialStrategyConfig;
  private prefetchedUrls: Set<string> = new Set();
  private currentIndex = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private onPrefetch: ((target: PrefetchTarget) => void) | null = null;

  constructor(config: Partial<SequentialStrategyConfig> = {}) {
    super(config);
    this.sequentialConfig = {
      ...DEFAULT_BASE_CONFIG,
      intervalDelay: 500,
      maxItems: 10,
      prioritizeBy: 'order',
      ...config,
    };
  }

  execute(context: StrategyContext): StrategyResult {
    const check = this.shouldAllowPrefetch(context);
    if (!check.allowed) {
      return { shouldPrefetch: false, targets: [], reason: check.reason };
    }

    const remaining = this.getOrderedTargets().filter(
      (t) => !this.prefetchedUrls.has(t.url)
    );

    return {
      shouldPrefetch: remaining.length > 0,
      targets: remaining.slice(0, this.sequentialConfig.maxItems),
      delay: this.sequentialConfig.intervalDelay,
      reason: 'Sequential prefetch',
    };
  }

  /**
   * Start sequential prefetching
   */
  start(): void {
    this.prefetchNext();
  }

  /**
   * Stop sequential prefetching
   */
  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * Reset to beginning
   */
  reset(): void {
    this.stop();
    this.currentIndex = 0;
    this.prefetchedUrls.clear();
  }

  /**
   * Set prefetch callback
   */
  setOnPrefetch(callback: (target: PrefetchTarget) => void): void {
    this.onPrefetch = callback;
  }

  private prefetchNext(): void {
    const ordered = this.getOrderedTargets();

    if (
      this.currentIndex >= ordered.length ||
      this.currentIndex >= this.sequentialConfig.maxItems
    ) {
      return;
    }

    const target = ordered[this.currentIndex];
    if (target && !this.prefetchedUrls.has(target.url)) {
      this.prefetchedUrls.add(target.url);
      this.onPrefetch?.(target);
    }

    this.currentIndex++;

    // Schedule next
    this.timer = setTimeout(() => {
      this.prefetchNext();
    }, this.sequentialConfig.intervalDelay);
  }

  private getOrderedTargets(): PrefetchTarget[] {
    const targets = [...this.targets];

    switch (this.sequentialConfig.prioritizeBy) {
      case 'importance':
        return targets.sort((a, b) => {
          const importanceOrder = { high: 0, auto: 1, low: 2 };
          return (
            (importanceOrder[a.importance ?? 'auto'] ?? 1) -
            (importanceOrder[b.importance ?? 'auto'] ?? 1)
          );
        });
      case 'size':
        // Smaller first (not available without fetch, so just return order)
        return targets;
      case 'order':
      default:
        return targets;
    }
  }
}

// ============================================================================
// Conditional Strategy
// ============================================================================

/**
 * Prefetch based on custom conditions
 */
export class ConditionalPrefetchStrategy extends PrefetchStrategy {
  private conditionalConfig: ConditionalStrategyConfig;
  private prefetchedUrls: Set<string> = new Set();
  private reevaluateTimer: ReturnType<typeof setInterval> | null = null;
  private onPrefetch: ((target: PrefetchTarget) => void) | null = null;


  constructor(config: Partial<ConditionalStrategyConfig> & { condition: (context: StrategyContext) => boolean }) {
    super(config);
    this.conditionalConfig = {
      ...DEFAULT_BASE_CONFIG,
      reevaluateInterval: config.reevaluateInterval ?? 1000,
      ...config,
    };
  }

  execute(context: StrategyContext): StrategyResult {

    const baseCheck = this.shouldAllowPrefetch(context);
    if (!baseCheck.allowed) {
      return { shouldPrefetch: false, targets: [], reason: baseCheck.reason };
    }

    const conditionMet = this.conditionalConfig.condition(context);
    if (!conditionMet) {
      return { shouldPrefetch: false, targets: [], reason: 'Condition not met' };
    }

    return {
      shouldPrefetch: true,
      targets: this.targets.filter((t) => !this.prefetchedUrls.has(t.url)),
      reason: 'Condition met',
    };
  }

  /**
   * Start periodic reevaluation
   */
  startReevaluation(getContext: () => StrategyContext): void {
    if (this.reevaluateTimer) {
      return;
    }

    this.reevaluateTimer = setInterval(() => {
      const context = getContext();
      const result = this.execute(context);

      if (result.shouldPrefetch) {
        result.targets.forEach((target) => {
          this.prefetchedUrls.add(target.url);
          this.onPrefetch?.(target);
        });
      }
    }, this.conditionalConfig.reevaluateInterval);
  }

  /**
   * Stop periodic reevaluation
   */
  stopReevaluation(): void {
    if (this.reevaluateTimer) {
      clearInterval(this.reevaluateTimer);
      this.reevaluateTimer = null;
    }
  }

  /**
   * Set prefetch callback
   */
  setOnPrefetch(callback: (target: PrefetchTarget) => void): void {
    this.onPrefetch = callback;
  }
}

// ============================================================================
// Strategy Composer
// ============================================================================

/**
 * Compose multiple strategies
 */
export class StrategyComposer {
  private strategies: Map<string, PrefetchStrategy> = new Map();
  private mode: 'any' | 'all' = 'any';

  constructor(mode: 'any' | 'all' = 'any') {
    this.mode = mode;
  }

  /**
   * Add a strategy
   */
  add(name: string, strategy: PrefetchStrategy): this {
    this.strategies.set(name, strategy);
    return this;
  }

  /**
   * Remove a strategy
   */
  remove(name: string): boolean {
    return this.strategies.delete(name);
  }

  /**
   * Execute all strategies
   */
  execute(context: StrategyContext): StrategyResult {
    const results = Array.from(this.strategies.values()).map((s) =>
      s.execute(context)
    );

    if (this.mode === 'all') {
      // All strategies must agree
      const allShouldPrefetch = results.every((r) => r.shouldPrefetch);
      const targets = this.mergeTargets(results);

      return {
        shouldPrefetch: allShouldPrefetch,
        targets,
        reason: allShouldPrefetch
          ? 'All strategies agree'
          : 'Not all strategies agree',
      };
    }

    // Any strategy can trigger
    const anyShouldPrefetch = results.some((r) => r.shouldPrefetch);
    const targets = this.mergeTargets(results.filter((r) => r.shouldPrefetch));

    return {
      shouldPrefetch: anyShouldPrefetch,
      targets,
      reason: anyShouldPrefetch
        ? 'At least one strategy approved'
        : 'No strategy approved',
    };
  }

  private mergeTargets(results: StrategyResult[]): PrefetchTarget[] {
    const seen = new Set<string>();
    const merged: PrefetchTarget[] = [];

    for (const result of results) {
      for (const target of result.targets) {
        if (!seen.has(target.url)) {
          seen.add(target.url);
          merged.push(target);
        }
      }
    }

    return merged;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a viewport-based prefetch strategy
 */
export function createViewportStrategy(
  config?: Partial<ViewportStrategyConfig>
): ViewportPrefetchStrategy {
  return new ViewportPrefetchStrategy(config);
}

/**
 * Create a hover-based prefetch strategy
 */
export function createHoverStrategy(
  config?: Partial<HoverStrategyConfig>
): HoverPrefetchStrategy {
  return new HoverPrefetchStrategy(config);
}

/**
 * Create an idle-based prefetch strategy
 */
export function createIdleStrategy(
  config?: Partial<IdleStrategyConfig>
): IdlePrefetchStrategy {
  return new IdlePrefetchStrategy(config);
}

/**
 * Create a sequential prefetch strategy
 */
export function createSequentialStrategy(
  config?: Partial<SequentialStrategyConfig>
): SequentialPrefetchStrategy {
  return new SequentialPrefetchStrategy(config);
}

/**
 * Create a conditional prefetch strategy
 */
export function createConditionalStrategy(
  config: Partial<ConditionalStrategyConfig> & { condition: (context: StrategyContext) => boolean }
): ConditionalPrefetchStrategy {
  return new ConditionalPrefetchStrategy(config);
}
