/**
 * @file Memory Optimization Utilities
 * @description Memory leak prevention, garbage collection optimization,
 * and memory pressure handling for React applications.
 *
 * Features:
 * - Memory leak detection
 * - Weak reference management
 * - Object pool management
 * - Cache eviction strategies
 * - Memory pressure monitoring
 * - Cleanup orchestration
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Memory pressure level
 */
export type MemoryPressureLevel = 'none' | 'moderate' | 'critical';

/**
 * Memory statistics
 */
export interface MemoryStats {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usagePercent: number;
  pressureLevel: MemoryPressureLevel;
  timestamp: number;
}

/**
 * Memory leak suspect
 */
export interface MemoryLeakSuspect {
  type: string;
  count: number;
  estimatedSize: number;
  growthRate: number;
  firstSeen: number;
  lastSeen: number;
  stackTrace?: string;
}

/**
 * Object pool configuration
 */
export interface ObjectPoolConfig<T> {
  /** Factory function to create new objects */
  create: () => T;
  /** Reset function to clear object state */
  reset: (obj: T) => void;
  /** Maximum pool size */
  maxSize: number;
  /** Minimum objects to keep in pool */
  minSize: number;
  /** Auto-shrink pool when idle */
  autoShrink: boolean;
  /** Shrink interval in ms */
  shrinkInterval: number;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Maximum number of entries */
  maxEntries: number;
  /** Maximum memory size in bytes */
  maxMemorySize: number;
  /** Time-to-live in ms */
  ttl: number;
  /** Eviction policy */
  evictionPolicy: 'lru' | 'lfu' | 'fifo';
  /** Enable memory pressure response */
  memoryPressureAware: boolean;
}

/**
 * Cache entry
 */
interface CacheEntry<T> {
  value: T;
  size: number;
  accessCount: number;
  lastAccess: number;
  createdAt: number;
  expiresAt: number;
}

/**
 * Cleanup callback
 */
export type CleanupCallback = () => void | Promise<void>;

/**
 * Memory pressure callback
 */
export type MemoryPressureCallback = (level: MemoryPressureLevel) => void;

// ============================================================================
// Constants
// ============================================================================

const MEMORY_PRESSURE_THRESHOLDS = {
  moderate: 70, // 70% of heap limit
  critical: 90, // 90% of heap limit
};

// ============================================================================
// Memory Monitor
// ============================================================================

/**
 * Memory monitoring and pressure detection
 */
export class MemoryMonitor {
  private pressureCallbacks: Set<MemoryPressureCallback> = new Set();
  private lastPressureLevel: MemoryPressureLevel = 'none';
  private monitorInterval: ReturnType<typeof setInterval> | null = null;
  private history: MemoryStats[] = [];
  private maxHistorySize = 100;

  /**
   * Start monitoring memory
   */
  start(intervalMs: number = 5000): void {
    if (this.monitorInterval !== null) {
      return;
    }

    this.monitorInterval = setInterval(() => {
      this.checkMemory();
    }, intervalMs);

    // Initial check
    this.checkMemory();
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  /**
   * Get current memory stats
   */
  getStats(): MemoryStats | null {
    const memory = this.getMemoryInfo();
    if (memory === null) {
      return null;
    }

    const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usagePercent,
      pressureLevel: this.calculatePressureLevel(usagePercent),
      timestamp: Date.now(),
    };
  }

  /**
   * Get memory history
   */
  getHistory(): MemoryStats[] {
    return [...this.history];
  }

  /**
   * Subscribe to memory pressure changes
   */
  onPressureChange(callback: MemoryPressureCallback): () => void {
    this.pressureCallbacks.add(callback);
    return () => this.pressureCallbacks.delete(callback);
  }

  /**
   * Force garbage collection (if available)
   */
  forceGC(): boolean {
    const globalWithGC = globalThis as typeof globalThis & { gc?: () => void };
    if (typeof globalWithGC.gc === 'function') {
      globalWithGC.gc();
      return true;
    }
    return false;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private getMemoryInfo(): {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  } | null {
    const perf = performance as Performance & {
      memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    };

    return perf.memory ?? null;
  }

  private checkMemory(): void {
    const stats = this.getStats();
    if (stats === null) {
      return;
    }

    // Add to history
    this.history.push(stats);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    // Check for pressure level change
    if (stats.pressureLevel !== this.lastPressureLevel) {
      this.lastPressureLevel = stats.pressureLevel;
      this.notifyPressureChange(stats.pressureLevel);
    }
  }

  private calculatePressureLevel(usagePercent: number): MemoryPressureLevel {
    if (usagePercent >= MEMORY_PRESSURE_THRESHOLDS.critical) {
      return 'critical';
    }
    if (usagePercent >= MEMORY_PRESSURE_THRESHOLDS.moderate) {
      return 'moderate';
    }
    return 'none';
  }

  private notifyPressureChange(level: MemoryPressureLevel): void {
    this.pressureCallbacks.forEach((callback) => callback(level));
  }
}

// ============================================================================
// Object Pool
// ============================================================================

/**
 * Generic object pool for reducing GC pressure
 */
export class ObjectPool<T> {
  private config: ObjectPoolConfig<T>;
  private pool: T[] = [];
  private activeCount = 0;
  private shrinkTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: ObjectPoolConfig<T>) {
    this.config = config;

    // Pre-populate pool
    for (let i = 0; i < config.minSize; i++) {
      this.pool.push(config.create());
    }

    if (config.autoShrink) {
      this.startAutoShrink();
    }
  }

  /**
   * Acquire an object from the pool
   */
  acquire(): T {
    this.activeCount++;

    if (this.pool.length > 0) {
      const obj = this.pool.pop();
      if (obj !== undefined) {
        return obj;
      }
    }

    return this.config.create();
  }

  /**
   * Release an object back to the pool
   */
  release(obj: T): void {
    this.activeCount = Math.max(0, this.activeCount - 1);

    if (this.pool.length < this.config.maxSize) {
      this.config.reset(obj);
      this.pool.push(obj);
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): { poolSize: number; activeCount: number; maxSize: number } {
    return {
      poolSize: this.pool.length,
      activeCount: this.activeCount,
      maxSize: this.config.maxSize,
    };
  }

  /**
   * Clear the pool
   */
  clear(): void {
    this.pool = [];
  }

  /**
   * Destroy the pool
   */
  destroy(): void {
    this.clear();
    if (this.shrinkTimer) {
      clearInterval(this.shrinkTimer);
      this.shrinkTimer = null;
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private startAutoShrink(): void {
    this.shrinkTimer = setInterval(() => {
      this.shrink();
    }, this.config.shrinkInterval);
  }

  private shrink(): void {
    const targetSize = Math.max(this.config.minSize, Math.ceil(this.activeCount * 1.5));

    while (this.pool.length > targetSize) {
      this.pool.pop();
    }
  }
}

// ============================================================================
// Memory-Aware Cache
// ============================================================================

/**
 * Cache with memory pressure awareness and multiple eviction strategies
 */
export class MemoryAwareCache<K, V> {
  private config: CacheConfig;
  private cache: Map<K, CacheEntry<V>> = new Map();
  private currentMemorySize = 0;
  private memoryMonitor: MemoryMonitor | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxEntries: config.maxEntries ?? 1000,
      maxMemorySize: config.maxMemorySize ?? 50 * 1024 * 1024, // 50MB
      ttl: config.ttl ?? 5 * 60 * 1000, // 5 minutes
      evictionPolicy: config.evictionPolicy ?? 'lru',
      memoryPressureAware: config.memoryPressureAware ?? true,
    };

    if (this.config.memoryPressureAware) {
      this.setupMemoryPressureResponse();
    }
  }

  /**
   * Get a value from cache
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);

    if (entry === undefined) {
      return undefined;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return undefined;
    }

    // Update access info
    entry.accessCount++;
    entry.lastAccess = Date.now();

    return entry.value;
  }

  /**
   * Set a value in cache
   */
  set(key: K, value: V, sizeEstimate?: number): void {
    const size = sizeEstimate ?? this.estimateSize(value);
    const now = Date.now();

    // Evict if necessary
    while (
      (this.cache.size >= this.config.maxEntries ||
        this.currentMemorySize + size > this.config.maxMemorySize) &&
      this.cache.size > 0
    ) {
      this.evictOne();
    }

    // Remove existing entry if present
    if (this.cache.has(key)) {
      this.delete(key);
    }

    const entry: CacheEntry<V> = {
      value,
      size,
      accessCount: 1,
      lastAccess: now,
      createdAt: now,
      expiresAt: now + this.config.ttl,
    };

    this.cache.set(key, entry);
    this.currentMemorySize += size;
  }

  /**
   * Delete a value from cache
   */
  delete(key: K): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentMemorySize -= entry.size;
      return this.cache.delete(key);
    }
    return false;
  }

  /**
   * Check if key exists
   */
  has(key: K): boolean {
    const entry = this.cache.get(key);
    if (entry === undefined) {
      return false;
    }
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
    this.currentMemorySize = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    memorySize: number;
    maxEntries: number;
    maxMemorySize: number;
  } {
    return {
      size: this.cache.size,
      memorySize: this.currentMemorySize,
      maxEntries: this.config.maxEntries,
      maxMemorySize: this.config.maxMemorySize,
    };
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Destroy the cache and cleanup resources
   */
  destroy(): void {
    this.clear();
    if (this.memoryMonitor) {
      this.memoryMonitor.stop();
      this.memoryMonitor = null;
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private setupMemoryPressureResponse(): void {
    this.memoryMonitor = new MemoryMonitor();
    this.memoryMonitor.onPressureChange((level) => {
      if (level === 'critical') {
        // Evict 50% of cache
        const targetSize = Math.floor(this.cache.size / 2);
        while (this.cache.size > targetSize) {
          this.evictOne();
        }
      } else if (level === 'moderate') {
        // Evict 25% of cache
        const targetSize = Math.floor(this.cache.size * 0.75);
        while (this.cache.size > targetSize) {
          this.evictOne();
        }
      }
    });
    this.memoryMonitor.start();
  }

  private evictOne(): void {
    const keyToEvict = this.selectEvictionCandidate();
    if (keyToEvict !== undefined) {
      this.delete(keyToEvict);
    }
  }

  private selectEvictionCandidate(): K | undefined {
    if (this.cache.size === 0) {
      return undefined;
    }

    switch (this.config.evictionPolicy) {
      case 'lru':
        return this.selectLRUCandidate();
      case 'lfu':
        return this.selectLFUCandidate();
      case 'fifo':
        return this.selectFIFOCandidate();
      default:
        return this.cache.keys().next().value;
    }
  }

  private selectLRUCandidate(): K | undefined {
    let oldestKey: K | undefined;
    let oldestAccess = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < oldestAccess) {
        oldestAccess = entry.lastAccess;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  private selectLFUCandidate(): K | undefined {
    let leastKey: K | undefined;
    let leastCount = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessCount < leastCount) {
        leastCount = entry.accessCount;
        leastKey = key;
      }
    }

    return leastKey;
  }

  private selectFIFOCandidate(): K | undefined {
    let oldestKey: K | undefined;
    let oldestCreated = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt < oldestCreated) {
        oldestCreated = entry.createdAt;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  private estimateSize(value: V): number {
    // Rough estimation based on JSON serialization
    try {
      return new Blob([JSON.stringify(value)]).size;
    } catch {
      return 1024; // Default estimate for non-serializable objects
    }
  }
}

// ============================================================================
// Cleanup Orchestrator
// ============================================================================

/**
 * Orchestrates cleanup across multiple resources
 */
export class CleanupOrchestrator {
  private cleanupCallbacks: Map<string, CleanupCallback> = new Map();
  private isDestroyed = false;

  /**
   * Register a cleanup callback
   */
  register(id: string, callback: CleanupCallback): () => void {
    if (this.isDestroyed) {
      console.warn('[CleanupOrchestrator] Cannot register after destruction');
      return () => {};
    }

    this.cleanupCallbacks.set(id, callback);
    return () => this.unregister(id);
  }

  /**
   * Unregister a cleanup callback
   */
  unregister(id: string): void {
    this.cleanupCallbacks.delete(id);
  }

  /**
   * Run a specific cleanup
   */
  async cleanup(id: string): Promise<void> {
    const callback = this.cleanupCallbacks.get(id);
    if (callback !== undefined) {
      await callback();
    }
  }

  /**
   * Run all cleanups
   */
  async cleanupAll(): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const callback of this.cleanupCallbacks.values()) {
      promises.push(Promise.resolve(callback()));
    }

    await Promise.all(promises);
  }

  /**
   * Destroy the orchestrator and run all cleanups
   */
  async destroy(): Promise<void> {
    if (this.isDestroyed) {
      return;
    }

    this.isDestroyed = true;
    await this.cleanupAll();
    this.cleanupCallbacks.clear();
  }
}

// ============================================================================
// WeakRef Manager
// ============================================================================

/**
 * Manages weak references with automatic cleanup
 */
export class WeakRefManager<T extends object> {
  private refs: Map<string, WeakRef<T>> = new Map();
  private finalizationRegistry: FinalizationRegistry<string>;
  private cleanupCallbacks: Map<string, () => void> = new Map();

  constructor() {
    this.finalizationRegistry = new FinalizationRegistry((key: string) => {
      this.refs.delete(key);
      const callback = this.cleanupCallbacks.get(key);
      if (callback !== undefined) {
        callback();
        this.cleanupCallbacks.delete(key);
      }
    });
  }

  /**
   * Add a weak reference
   */
  set(key: string, value: T, onCleanup?: () => void): void {
    const existingRef = this.refs.get(key);
    if (existingRef !== undefined) {
      // Cannot unregister from FinalizationRegistry, so we just overwrite
    }

    this.refs.set(key, new WeakRef(value));
    this.finalizationRegistry.register(value, key);

    if (onCleanup !== undefined) {
      this.cleanupCallbacks.set(key, onCleanup);
    }
  }

  /**
   * Get a weak reference (may return undefined if collected)
   */
  get(key: string): T | undefined {
    const ref = this.refs.get(key);
    return ref?.deref();
  }

  /**
   * Check if reference exists and is alive
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Delete a reference
   */
  delete(key: string): boolean {
    this.cleanupCallbacks.delete(key);
    return this.refs.delete(key);
  }

  /**
   * Get all live references
   */
  getLive(): Map<string, T> {
    const live = new Map<string, T>();

    for (const [key, ref] of this.refs.entries()) {
      const value = ref.deref();
      if (value !== undefined) {
        live.set(key, value);
      }
    }

    return live;
  }

  /**
   * Clean up dead references
   */
  prune(): number {
    let pruned = 0;

    for (const [key, ref] of this.refs.entries()) {
      if (ref.deref() === undefined) {
        this.refs.delete(key);
        this.cleanupCallbacks.delete(key);
        pruned++;
      }
    }

    return pruned;
  }
}

// ============================================================================
// Memory Leak Detector
// ============================================================================

/**
 * Detects potential memory leaks by tracking object allocations
 */
export class MemoryLeakDetector {
  private tracking: Map<
    string,
    { count: number; firstSeen: number; lastSeen: number; samples: number[] }
  > = new Map();
  private interval: ReturnType<typeof setInterval> | null = null;
  private growthThreshold = 1.5; // 50% growth indicates potential leak

  /**
   * Start tracking a category of objects
   */
  track(category: string, count: number): void {
    const now = Date.now();
    const existing = this.tracking.get(category);

    if (existing) {
      existing.count = count;
      existing.lastSeen = now;
      existing.samples.push(count);

      // Keep last 20 samples
      if (existing.samples.length > 20) {
        existing.samples.shift();
      }
    } else {
      this.tracking.set(category, {
        count,
        firstSeen: now,
        lastSeen: now,
        samples: [count],
      });
    }
  }

  /**
   * Get potential memory leak suspects
   */
  getSuspects(): MemoryLeakSuspect[] {
    const suspects: MemoryLeakSuspect[] = [];

    for (const [type, data] of this.tracking.entries()) {
      if (data.samples.length < 5) {
        continue;
      }

      const firstSamples = data.samples.slice(0, 5);
      const lastSamples = data.samples.slice(-5);

      const avgFirst = firstSamples.reduce((a, b) => a + b, 0) / firstSamples.length;
      const avgLast = lastSamples.reduce((a, b) => a + b, 0) / lastSamples.length;

      const growthRate = avgLast / avgFirst;

      if (growthRate >= this.growthThreshold) {
        suspects.push({
          type,
          count: data.count,
          estimatedSize: data.count * 100, // Rough estimate
          growthRate,
          firstSeen: data.firstSeen,
          lastSeen: data.lastSeen,
        });
      }
    }

    return suspects.sort((a, b) => b.growthRate - a.growthRate);
  }

  /**
   * Clear tracking data
   */
  clear(): void {
    this.tracking.clear();
  }

  /**
   * Start automatic detection
   */
  startAutoDetection(intervalMs: number = 10000): void {
    if (this.interval) {
      return;
    }

    this.interval = setInterval(() => {
      const suspects = this.getSuspects();
      if (suspects.length > 0) {
        console.warn('[MemoryLeakDetector] Potential memory leaks detected:', suspects);
      }
    }, intervalMs);
  }

  /**
   * Stop automatic detection
   */
  stopAutoDetection(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

// ============================================================================
// Singleton Instances
// ============================================================================

let memoryMonitorInstance: MemoryMonitor | null = null;
let cleanupOrchestratorInstance: CleanupOrchestrator | null = null;

/**
 * Get the global memory monitor instance
 */
export function getMemoryMonitor(): MemoryMonitor {
  memoryMonitorInstance ??= new MemoryMonitor();
  return memoryMonitorInstance;
}

/**
 * Get the global cleanup orchestrator instance
 */
export function getCleanupOrchestrator(): CleanupOrchestrator {
  cleanupOrchestratorInstance ??= new CleanupOrchestrator();
  return cleanupOrchestratorInstance;
}
