/**
 * @file Render Optimization Strategies
 * @description Advanced render optimization utilities including batching,
 * debouncing, priority scheduling, and render bailout mechanisms.
 * Designed for React 18+ concurrent features.
 *
 * Features:
 * - Render batching with priority
 * - State update coalescing
 * - Render bailout utilities
 * - Memoization helpers
 * - Virtual list optimization
 * - Component render tracking
 */

import { isProd } from '@/lib/core/config/env-helper';

// ============================================================================
// Types
// ============================================================================

/**
 * Render priority levels
 */
export type RenderPriority = 'immediate' | 'high' | 'normal' | 'low' | 'idle';

/**
 * Render batch configuration
 */
export interface RenderBatchConfig {
  /** Maximum items per batch */
  batchSize: number;
  /** Delay between batches in ms */
  batchDelay: number;
  /** Priority for scheduling */
  priority: RenderPriority;
  /** Enable time slicing */
  timeSlicing: boolean;
  /** Time budget per frame in ms */
  frameBudget: number;
}

/**
 * Render statistics
 */
export interface RenderStats {
  totalRenders: number;
  skippedRenders: number;
  batchedUpdates: number;
  averageRenderTime: number;
  lastRenderTime: number;
  renderTimes: number[];
}

/**
 * Equality comparator function
 */
export type EqualityFn<T> = (prev: T, next: T) => boolean;

/**
 * State update function
 */
export type StateUpdater<T> = (prev: T) => T;

/**
 * Batched update entry
 */
interface BatchedUpdate<T> {
  key: string;
  update: StateUpdater<T>;
  priority: RenderPriority;
  timestamp: number;
}

// ============================================================================
// Constants
// ============================================================================

const PRIORITY_VALUES: Record<RenderPriority, number> = {
  immediate: 0,
  high: 1,
  normal: 2,
  low: 3,
  idle: 4,
};

const DEFAULT_BATCH_CONFIG: RenderBatchConfig = {
  batchSize: 10,
  batchDelay: 16, // ~60fps
  priority: 'normal',
  timeSlicing: true,
  frameBudget: 10, // 10ms per frame budget
};

// ============================================================================
// Render Batch Manager
// ============================================================================

/**
 * Manages batched render updates with priority scheduling
 */
export class RenderBatchManager<T = unknown> {
  private config: RenderBatchConfig;
  private pendingUpdates: Map<string, BatchedUpdate<T>[]> = new Map();
  private subscribers: Map<string, Set<(value: T) => void>> = new Map();
  private currentValues: Map<string, T> = new Map();
  private batchTimer: ReturnType<typeof setTimeout> | null = null;
  private isProcessing = false;
  private stats: RenderStats = {
    totalRenders: 0,
    skippedRenders: 0,
    batchedUpdates: 0,
    averageRenderTime: 0,
    lastRenderTime: 0,
    renderTimes: [],
  };

  constructor(config: Partial<RenderBatchConfig> = {}) {
    this.config = { ...DEFAULT_BATCH_CONFIG, ...config };
  }

  /**
   * Schedule a state update
   */
  scheduleUpdate(
    key: string,
    update: StateUpdater<T>,
    priority: RenderPriority = this.config.priority
  ): void {
    const entry: BatchedUpdate<T> = {
      key,
      update,
      priority,
      timestamp: Date.now(),
    };

    const updates = this.pendingUpdates.get(key) ?? [];
    updates.push(entry);
    this.pendingUpdates.set(key, updates);
    this.stats.batchedUpdates++;

    this.scheduleBatchProcess();
  }

  /**
   * Set a value directly (bypasses batching for immediate updates)
   */
  setImmediate(key: string, value: T): void {
    this.currentValues.set(key, value);
    this.notifySubscribers(key, value);
    this.stats.totalRenders++;
  }

  /**
   * Get current value
   */
  getValue(key: string): T | undefined {
    return this.currentValues.get(key);
  }

  /**
   * Subscribe to value changes
   */
  subscribe(key: string, callback: (value: T) => void): () => void {
    const subs = this.subscribers.get(key) ?? new Set();
    subs.add(callback);
    this.subscribers.set(key, subs);

    // Immediately notify with current value if exists
    const currentValue = this.currentValues.get(key);
    if (currentValue !== undefined) {
      callback(currentValue);
    }

    return () => {
      subs.delete(callback);
      if (subs.size === 0) {
        this.subscribers.delete(key);
      }
    };
  }

  /**
   * Get render statistics
   */
  getStats(): RenderStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalRenders: 0,
      skippedRenders: 0,
      batchedUpdates: 0,
      averageRenderTime: 0,
      lastRenderTime: 0,
      renderTimes: [],
    };
  }

  /**
   * Flush all pending updates immediately
   */
  flush(): void {
    if (this.batchTimer !== null) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    this.processBatch();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private scheduleBatchProcess(): void {
    if (this.batchTimer !== null || this.isProcessing) {
      return;
    }

    // Get highest priority among pending updates
    const highestPriority = this.getHighestPriority();

    if (highestPriority === 'immediate') {
      this.processBatch();
      return;
    }

    const delay = this.getDelayForPriority(highestPriority);
    this.batchTimer = setTimeout(() => {
      this.batchTimer = null;
      this.processBatch();
    }, delay);
  }

  private getHighestPriority(): RenderPriority {
    let highest: RenderPriority = 'idle';

    for (const updates of this.pendingUpdates.values()) {
      for (const update of updates) {
        if (PRIORITY_VALUES[update.priority] < PRIORITY_VALUES[highest]) {
          highest = update.priority;
        }
      }
    }

    return highest;
  }

  private getDelayForPriority(priority: RenderPriority): number {
    switch (priority) {
      case 'immediate':
        return 0;
      case 'high':
        return 4;
      case 'normal':
        return this.config.batchDelay;
      case 'low':
        return this.config.batchDelay * 2;
      case 'idle':
        return this.config.batchDelay * 4;
    }
  }

  private processBatch(): void {
    if (this.isProcessing || this.pendingUpdates.size === 0) {
      return;
    }

    this.isProcessing = true;
    const startTime = performance.now();

    try {
      if (this.config.timeSlicing) {
        this.processWithTimeSlicing();
      } else {
        this.processAllUpdates();
      }
    } finally {
      this.isProcessing = false;
      const renderTime = performance.now() - startTime;
      this.updateRenderStats(renderTime);

      // Continue processing if there are more updates
      if (this.pendingUpdates.size > 0) {
        this.scheduleBatchProcess();
      }
    }
  }

  private processWithTimeSlicing(): void {
    const deadline = performance.now() + this.config.frameBudget;
    let processed = 0;

    for (const [key, updates] of this.pendingUpdates.entries()) {
      if (performance.now() >= deadline) {
        break;
      }

      this.processKeyUpdates(key, updates);
      this.pendingUpdates.delete(key);
      processed++;

      if (processed >= this.config.batchSize) {
        break;
      }
    }
  }

  private processAllUpdates(): void {
    for (const [key, updates] of this.pendingUpdates.entries()) {
      this.processKeyUpdates(key, updates);
    }
    this.pendingUpdates.clear();
  }

  private processKeyUpdates(key: string, updates: BatchedUpdate<T>[]): void {
    if (updates.length === 0) {
      return;
    }

    // Sort by priority and timestamp
    updates.sort((a, b) => {
      const priorityDiff = PRIORITY_VALUES[a.priority] - PRIORITY_VALUES[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp - b.timestamp;
    });

    // Coalesce updates
    let currentValue = this.currentValues.get(key);
    for (const update of updates) {
      currentValue = update.update(currentValue as T);
    }

    // Update and notify
    this.currentValues.set(key, currentValue as T);
    this.notifySubscribers(key, currentValue as T);
    this.stats.totalRenders++;
  }

  private notifySubscribers(key: string, value: T): void {
    const subs = this.subscribers.get(key);
    if (subs !== undefined) {
      subs.forEach((callback) => callback(value));
    }
  }

  private updateRenderStats(renderTime: number): void {
    this.stats.lastRenderTime = renderTime;
    this.stats.renderTimes.push(renderTime);

    // Keep last 100 render times
    if (this.stats.renderTimes.length > 100) {
      this.stats.renderTimes.shift();
    }

    this.stats.averageRenderTime =
      this.stats.renderTimes.reduce((a, b) => a + b, 0) /
      this.stats.renderTimes.length;
  }
}

// ============================================================================
// Render Bailout Utilities
// ============================================================================

/**
 * Create a shallow equality comparator
 */
export function shallowEqual<T extends object>(objA: T, objB: T): boolean {
  if (Object.is(objA, objB)) {
    return true;
  }

  if (
    typeof objA !== 'object' ||
    objA === null ||
    typeof objB !== 'object' ||
    objB === null
  ) {
    return false;
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  for (const key of keysA) {
    if (
      !Object.prototype.hasOwnProperty.call(objB, key) ||
      !Object.is((objA as Record<string, unknown>)[key], (objB as Record<string, unknown>)[key])
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Create a deep equality comparator
 */
export function deepEqual<T>(objA: T, objB: T): boolean {
  if (Object.is(objA, objB)) {
    return true;
  }

  if (
    typeof objA !== 'object' ||
    objA === null ||
    typeof objB !== 'object' ||
    objB === null
  ) {
    return false;
  }

  if (Array.isArray(objA) && Array.isArray(objB)) {
    if (objA.length !== objB.length) {
      return false;
    }
    return objA.every((item, index) => deepEqual(item, objB[index]));
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  for (const key of keysA) {
    if (
      !Object.prototype.hasOwnProperty.call(objB, key) ||
      !deepEqual(
        (objA as Record<string, unknown>)[key],
        (objB as Record<string, unknown>)[key]
      )
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Create a memoized selector with custom equality
 */
export function createSelector<TInput, TOutput>(
  selector: (input: TInput) => TOutput,
  equalityFn: EqualityFn<TOutput> = Object.is
): (input: TInput) => TOutput {
  let lastInput: TInput | undefined;
  let lastOutput: TOutput | undefined;
  let isInitialized = false;

  return (input: TInput): TOutput => {
    if (isInitialized === false || !Object.is(input, lastInput)) {
      const newOutput = selector(input);

      if (isInitialized === false || lastOutput === undefined || !equalityFn(lastOutput, newOutput)) {
        lastOutput = newOutput;
      }

      lastInput = input;
      isInitialized = true;
    }

    return lastOutput as TOutput;
  };
}

/**
 * Create a memoized function with LRU cache
 */
export function memoizeWithLRU<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => TResult,
  maxSize: number = 100,
  keyFn: (...args: TArgs) => string = (...args) => JSON.stringify(args)
): (...args: TArgs) => TResult {
  const cache = new Map<string, { value: TResult; timestamp: number }>();

  return (...args: TArgs): TResult => {
    const key = keyFn(...args);
    const cached = cache.get(key);

    if (cached !== undefined) {
      // Update timestamp for LRU
      cached.timestamp = Date.now();
      return cached.value;
    }

    const result = fn(...args);

    // Evict oldest if at capacity
    if (cache.size >= maxSize) {
      let oldestKey = '';
      let oldestTime = Infinity;

      for (const [k, v] of cache.entries()) {
        if (v.timestamp < oldestTime) {
          oldestKey = k;
          oldestTime = v.timestamp;
        }
      }

      cache.delete(oldestKey);
    }

    cache.set(key, { value: result, timestamp: Date.now() });
    return result;
  };
}

// ============================================================================
// Virtual List Optimization
// ============================================================================

/**
 * Virtual list configuration
 */
export interface VirtualListConfig {
  /** Total number of items */
  itemCount: number;
  /** Height of each item in pixels */
  itemHeight: number;
  /** Container height in pixels */
  containerHeight: number;
  /** Number of items to render above/below visible area */
  overscan: number;
}

/**
 * Virtual list range
 */
export interface VirtualListRange {
  startIndex: number;
  endIndex: number;
  offsetTop: number;
  visibleCount: number;
}

/**
 * Calculate visible range for virtual list
 */
export function calculateVirtualListRange(
  scrollTop: number,
  config: VirtualListConfig
): VirtualListRange {
  const { itemCount, itemHeight, containerHeight, overscan } = config;

  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    itemCount - 1,
    startIndex + visibleCount + overscan * 2
  );
  const offsetTop = startIndex * itemHeight;

  return {
    startIndex,
    endIndex,
    offsetTop,
    visibleCount,
  };
}

/**
 * Create a stable item key generator
 */
export function createStableKeyGenerator<T>(
  getKey: (item: T, index: number) => string
): (items: T[]) => Map<string, number> {
  const keyCache = new Map<string, number>();

  return (items: T[]): Map<string, number> => {
    const newKeys = new Map<string, number>();

    items.forEach((item, index) => {
      const key = getKey(item, index);
      newKeys.set(key, index);
    });

    // Update cache
    keyCache.clear();
    newKeys.forEach((value, key) => keyCache.set(key, value));

    return newKeys;
  };
}

// ============================================================================
// Component Render Tracking
// ============================================================================

/**
 * Render tracking configuration
 */
export interface RenderTrackingConfig {
  /** Enable tracking */
  enabled: boolean;
  /** Log to console */
  logToConsole: boolean;
  /** Threshold for slow render warning in ms */
  slowRenderThreshold: number;
}

/**
 * Component render info
 */
export interface ComponentRenderInfo {
  componentName: string;
  renderCount: number;
  totalRenderTime: number;
  averageRenderTime: number;
  lastRenderTime: number;
  lastRenderReason: string | null;
}

const renderTrackingConfig: RenderTrackingConfig = {
  enabled: !isProd(),
  logToConsole: false,
  slowRenderThreshold: 16, // 1 frame at 60fps
};

const renderTracking = new Map<string, ComponentRenderInfo>();

/**
 * Configure render tracking
 */
export function configureRenderTracking(
  config: Partial<RenderTrackingConfig>
): void {
  Object.assign(renderTrackingConfig, config);
}

/**
 * Track a component render
 */
export function trackRender(
  componentName: string,
  renderTime: number,
  reason?: string
): void {
  if (!renderTrackingConfig.enabled) {
    return;
  }

  let info = renderTracking.get(componentName);

  if (info === undefined) {
    info = {
      componentName,
      renderCount: 0,
      totalRenderTime: 0,
      averageRenderTime: 0,
      lastRenderTime: 0,
      lastRenderReason: null,
    };
    renderTracking.set(componentName, info);
  }

  info.renderCount++;
  info.totalRenderTime += renderTime;
  info.averageRenderTime = info.totalRenderTime / info.renderCount;
  info.lastRenderTime = renderTime;
  info.lastRenderReason = reason ?? null;

  if (renderTrackingConfig.logToConsole) {
    const isSlowRender = renderTime > renderTrackingConfig.slowRenderThreshold;
    const logFn = isSlowRender ? console.warn : console.log; // eslint-disable-line no-console
    logFn(
      `[RenderTracker] ${componentName} rendered in ${renderTime.toFixed(2)}ms`,
      reason !== undefined ? `(reason: ${reason})` : ''
    );
  }
}

/**
 * Get render tracking info for a component
 */
export function getRenderInfo(componentName: string): ComponentRenderInfo | undefined {
  return renderTracking.get(componentName);
}

/**
 * Get all render tracking info
 */
export function getAllRenderInfo(): Map<string, ComponentRenderInfo> {
  return new Map(renderTracking);
}

/**
 * Clear render tracking data
 */
export function clearRenderTracking(): void {
  renderTracking.clear();
}

/**
 * Get top slow-rendering components
 */
export function getSlowComponents(count: number = 10): ComponentRenderInfo[] {
  return Array.from(renderTracking.values())
    .sort((a, b) => b.averageRenderTime - a.averageRenderTime)
    .slice(0, count);
}

// ============================================================================
// Exports
// ============================================================================

export { DEFAULT_BATCH_CONFIG, PRIORITY_VALUES };
