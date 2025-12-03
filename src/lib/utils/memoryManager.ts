/**
 * @file Memory Manager
 * @description Enterprise-grade memory management utilities with resource pooling,
 * WeakMap caching, garbage collection hints, and automatic cleanup
 */

/**
 * Resource pool entry with metadata
 */
interface PoolEntry<T> {
  resource: T;
  createdAt: number;
  lastUsed: number;
  useCount: number;
  isAcquired: boolean;
}

/**
 * Resource pool configuration
 */
export interface ResourcePoolConfig<T> {
  /** Factory function to create new resources */
  factory: () => T;
  /** Maximum pool size */
  maxSize?: number;
  /** Minimum pool size (pre-allocated) */
  minSize?: number;
  /** Time-to-live for idle resources (ms) */
  idleTTL?: number;
  /** Validation function before reuse */
  validate?: (resource: T) => boolean;
  /** Cleanup function when resource is disposed */
  dispose?: (resource: T) => void;
  /** Reset function before reuse */
  reset?: (resource: T) => void;
}

/**
 * Generic resource pool for expensive objects
 * Implements object pooling pattern to reduce GC pressure
 */
export class ResourcePool<T> {
  private pool: Map<symbol, PoolEntry<T>> = new Map();
  private config: Required<ResourcePoolConfig<T>>;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: ResourcePoolConfig<T>) {
    this.config = {
      factory: config.factory,
      maxSize: config.maxSize ?? 20,
      minSize: config.minSize ?? 2,
      idleTTL: config.idleTTL ?? 5 * 60 * 1000, // 5 minutes
      validate: config.validate ?? (() => true),
      dispose: config.dispose ?? (() => {}),
      reset: config.reset ?? (() => {}),
    };

    // Pre-allocate minimum resources
    this.preallocate();

    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Acquire a resource from the pool
   */
  acquire(): { resource: T; release: () => void } {
    // Find available resource
    for (const [id, entry] of this.pool.entries()) {
      if (!entry.isAcquired && this.config.validate(entry.resource)) {
        entry.isAcquired = true;
        entry.lastUsed = Date.now();
        entry.useCount++;
        this.config.reset(entry.resource);

        return {
          resource: entry.resource,
          release: () => this.release(id),
        };
      }
    }

    // Create new resource if pool not at max
    if (this.pool.size < this.config.maxSize) {
      const id = this.createEntry();
      const entry = this.pool.get(id);
      if (entry === undefined) {
        throw new Error('Failed to create pool entry');
      }
      entry.isAcquired = true;
      entry.useCount++;

      return {
        resource: entry.resource,
        release: () => this.release(id),
      };
    }

    // Pool exhausted - create temporary resource
    const tempResource = this.config.factory();
    return {
      resource: tempResource,
      release: () => this.config.dispose(tempResource),
    };
  }

  /**
   * Cleanup idle resources beyond minimum
   */
  cleanup(): void {
    const now = Date.now();
    const toRemove: symbol[] = [];

    for (const [id, entry] of this.pool.entries()) {
      if (
        !entry.isAcquired &&
        this.pool.size > this.config.minSize &&
        now - entry.lastUsed > this.config.idleTTL
      ) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      const entry = this.pool.get(id);
      if (entry) {
        this.config.dispose(entry.resource);
        this.pool.delete(id);
      }
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    total: number;
    acquired: number;
    available: number;
    maxSize: number;
  } {
    let acquired = 0;
    for (const entry of this.pool.values()) {
      if (entry.isAcquired) acquired++;
    }

    return {
      total: this.pool.size,
      acquired,
      available: this.pool.size - acquired,
      maxSize: this.config.maxSize,
    };
  }

  /**
   * Dispose all resources and stop cleanup
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    for (const entry of this.pool.values()) {
      this.config.dispose(entry.resource);
    }

    this.pool.clear();
  }

  /**
   * Pre-allocate minimum pool resources
   */
  private preallocate(): void {
    for (let i = 0; i < this.config.minSize; i++) {
      this.createEntry();
    }
  }

  /**
   * Create a new pool entry
   */
  private createEntry(): symbol {
    const id = Symbol('pool-entry');
    const now = Date.now();

    this.pool.set(id, {
      resource: this.config.factory(),
      createdAt: now,
      lastUsed: now,
      useCount: 0,
      isAcquired: false,
    });

    return id;
  }

  /**
   * Release a resource back to the pool
   */
  private release(id: symbol): void {
    const entry = this.pool.get(id);
    if (entry) {
      entry.isAcquired = false;
      entry.lastUsed = Date.now();
    }
  }

  /**
   * Start periodic cleanup of idle resources
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.config.idleTTL / 2);
  }
}

/**
 * WeakMap-based cache with TTL support
 * Uses WeakRef for automatic garbage collection
 */
export class WeakCache<K extends object, V> {
  private cache: Map<K, { ref: WeakRef<V extends object ? V : never>; expires: number }> =
    new Map();
  private registry: FinalizationRegistry<K>;
  private readonly defaultTTL: number;

  constructor(options: { defaultTTL?: number } = {}) {
    this.defaultTTL = options.defaultTTL ?? 5 * 60 * 1000; // 5 minutes

    // Use FinalizationRegistry for automatic cleanup
    this.registry = new FinalizationRegistry((key: K) => {
      this.cache.delete(key);
    });
  }

  /**
   * Get cached value
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check expiration
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.ref.deref() as V | undefined;
  }

  /**
   * Set cached value
   */
  set(key: K, value: V, ttl?: number): void {
    if (typeof value === 'object' && value !== null) {
      const ref = new WeakRef(value);
      this.cache.set(key, {
        ref: ref as WeakRef<V extends object ? V : never>,
        expires: Date.now() + (ttl ?? this.defaultTTL),
      });
      this.registry.register(value, key);
    }
  }

  /**
   * Check if key exists
   */
  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Delete cached value
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cached values
   */
  clear(): void {
    this.cache.clear();
  }
}

/**
 * Memory pressure levels
 */
export type MemoryPressure = 'none' | 'moderate' | 'critical';

/**
 * Memory pressure callback
 */
export type MemoryPressureCallback = (pressure: MemoryPressure) => void;

/**
 * Memory monitor configuration
 */
export interface MemoryMonitorConfig {
  /** Moderate pressure threshold (0-1) */
  moderateThreshold?: number;
  /** Critical pressure threshold (0-1) */
  criticalThreshold?: number;
  /** Check interval (ms) */
  checkInterval?: number;
}

/**
 * Memory monitor for tracking heap usage and pressure
 */
export class MemoryMonitor {
  private callbacks: Set<MemoryPressureCallback> = new Set();
  private config: Required<MemoryMonitorConfig>;
  private interval: ReturnType<typeof setInterval> | null = null;
  private currentPressure: MemoryPressure = 'none';

  constructor(config: MemoryMonitorConfig = {}) {
    this.config = {
      moderateThreshold: config.moderateThreshold ?? 0.7,
      criticalThreshold: config.criticalThreshold ?? 0.9,
      checkInterval: config.checkInterval ?? 30000, // 30 seconds
    };
  }

  /**
   * Start monitoring memory pressure
   */
  start(): void {
    if (this.interval) return;

    this.interval = setInterval(() => {
      this.check();
    }, this.config.checkInterval);

    // Initial check
    this.check();
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  /**
   * Check current memory pressure
   */
  check(): MemoryPressure {
    const usage = this.getUsageRatio();
    let pressure: MemoryPressure = 'none';

    if (usage >= this.config.criticalThreshold) {
      pressure = 'critical';
    } else if (usage >= this.config.moderateThreshold) {
      pressure = 'moderate';
    }

    // Notify if pressure changed
    if (pressure !== this.currentPressure) {
      this.currentPressure = pressure;
      this.notifyCallbacks(pressure);
    }

    return pressure;
  }

  /**
   * Get detailed memory info
   */
  getMemoryInfo(): {
    usedHeap: number;
    totalHeap: number;
    heapLimit: number;
    usageRatio: number;
    pressure: MemoryPressure;
  } | null {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const { memory } = performance as Performance & {
        memory?: {
          usedJSHeapSize: number;
          totalJSHeapSize: number;
          jsHeapSizeLimit: number;
        };
      };
      if (memory) {
        return {
          usedHeap: memory.usedJSHeapSize,
          totalHeap: memory.totalJSHeapSize,
          heapLimit: memory.jsHeapSizeLimit,
          usageRatio: memory.usedJSHeapSize / memory.jsHeapSizeLimit,
          pressure: this.currentPressure,
        };
      }
    }
    return null;
  }

  /**
   * Subscribe to pressure changes
   */
  onPressureChange(callback: MemoryPressureCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Suggest garbage collection (hint only)
   */
  suggestGC(): void {
    // Try to encourage GC by nullifying references
    if (typeof globalThis !== 'undefined' && 'gc' in globalThis) {
      const globalWithGC = globalThis as typeof globalThis & { gc: () => void };
      globalWithGC.gc();
    }
  }

  /**
   * Get memory usage ratio (0-1)
   */
  private getUsageRatio(): number {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const { memory } = performance as Performance & {
        memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
      };
      if (memory) {
        return memory.usedJSHeapSize / memory.jsHeapSizeLimit;
      }
    }
    return 0;
  }

  /**
   * Notify callbacks of pressure change
   */
  private notifyCallbacks(pressure: MemoryPressure): void {
    for (const callback of this.callbacks) {
      try {
        callback(pressure);
      } catch (error) {
        console.error('[MemoryMonitor] Callback error:', error);
      }
    }
  }
}

/**
 * Disposable interface for cleanup
 */
export interface Disposable {
  dispose(): void;
}

/**
 * Disposable registry for tracking resources
 */
export class DisposableRegistry {
  private disposables: Set<Disposable> = new Set();
  private isDisposed = false;

  /**
   * Get registration count
   */
  get count(): number {
    return this.disposables.size;
  }

  /**
   * Register a disposable resource
   */
  register<T extends Disposable>(disposable: T): T {
    if (this.isDisposed) {
      disposable.dispose();
      throw new Error('Registry is already disposed');
    }
    this.disposables.add(disposable);
    return disposable;
  }

  /**
   * Unregister a disposable
   */
  unregister(disposable: Disposable): boolean {
    return this.disposables.delete(disposable);
  }

  /**
   * Dispose all registered resources
   */
  dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;

    for (const disposable of this.disposables) {
      try {
        disposable.dispose();
      } catch (error) {
        console.error('[DisposableRegistry] Disposal error:', error);
      }
    }

    this.disposables.clear();
  }
}

/**
 * Create a disposable from a cleanup function
 */
export function createDisposable(cleanup: () => void): Disposable {
  let disposed = false;
  return {
    dispose: () => {
      if (!disposed) {
        disposed = true;
        cleanup();
      }
    },
  };
}

/**
 * LRU (Least Recently Used) Cache with size limits
 */
export class LRUCache<K, V> {
  private cache: Map<K, V> = new Map();
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get value and mark as recently used
   */
  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  /**
   * Set value
   */
  set(key: K, value: V): void {
    // Delete existing to update order
    this.cache.delete(key);

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) {
        this.cache.delete(oldest);
      }
    }

    this.cache.set(key, value);
  }

  /**
   * Check if key exists
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * Delete key
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get all entries
   */
  entries(): IterableIterator<[K, V]> {
    return this.cache.entries();
  }
}

/**
 * Global memory manager singleton
 */
export const memoryManager = {
  monitor: new MemoryMonitor(),
  registry: new DisposableRegistry(),

  /**
   * Create a resource pool
   */
  createPool<T>(config: ResourcePoolConfig<T>): ResourcePool<T> {
    const pool = new ResourcePool(config);
    this.registry.register({
      dispose: () => pool.dispose(),
    });
    return pool;
  },

  /**
   * Create an LRU cache
   */
  createLRUCache<K, V>(maxSize: number): LRUCache<K, V> {
    return new LRUCache<K, V>(maxSize);
  },

  /**
   * Start memory monitoring
   */
  startMonitoring(): void {
    this.monitor.start();
  },

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): void {
    this.monitor.stop();
  },

  /**
   * Dispose all managed resources
   */
  dispose(): void {
    this.monitor.stop();
    this.registry.dispose();
  },
};
