/**
 * @file Request Cache
 * @description Request deduplication and caching utilities
 */

/**
 * Cache entry
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * Pending request entry
 */
interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Default TTL in milliseconds */
  defaultTtl?: number;
  
  /** Maximum cache entries */
  maxEntries?: number;
  
  /** Enable request deduplication */
  deduplication?: boolean;
  
  /** Deduplication window (ms) */
  deduplicationWindow?: number;
}

/**
 * Request cache class
 */
export class RequestCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private pending: Map<string, PendingRequest<unknown>> = new Map();
  private config: Required<CacheConfig>;
  private gcIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor(config: CacheConfig = {}) {
    this.config = {
      defaultTtl: config.defaultTtl ?? 5 * 60 * 1000, // 5 minutes
      maxEntries: config.maxEntries ?? 100,
      deduplication: config.deduplication ?? true,
      deduplicationWindow: config.deduplicationWindow ?? 100, // 100ms
    };

    // Start periodic garbage collection to prevent unbounded cache growth
    this.gcIntervalId = setInterval(() => this.clearExpired(), 60000);
  }

  /**
   * Dispose of the cache and clean up resources
   */
  dispose(): void {
    if (this.gcIntervalId !== null) {
      clearInterval(this.gcIntervalId);
      this.gcIntervalId = null;
    }
    this.clear();
  }
  
  /**
   * Generate cache key
   */
  generateKey(
    url: string,
    params?: Record<string, unknown>,
    body?: unknown
  ): string {
    const parts = [url];
    
    if (params !== undefined) {
      parts.push(JSON.stringify(params));
    }
    
    if (body !== undefined) {
      parts.push(JSON.stringify(body));
    }
    
    return parts.join('::');
  }
  
  /**
   * Get cached value
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (entry === undefined) {
      return undefined;
    }
    
    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.data;
  }
  
  /**
   * Set cached value
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // Enforce max entries
    if (this.cache.size >= this.config.maxEntries) {
      this.evictOldest();
    }
    
    const timestamp = Date.now();
    this.cache.set(key, {
      data,
      timestamp,
      expiresAt: timestamp + (ttl ?? this.config.defaultTtl),
    });
  }
  
  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }
  
  /**
   * Delete cached value
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  /**
   * Clear all cached values
   */
  clear(): void {
    this.cache.clear();
    this.pending.clear();
  }
  
  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * Evict oldest entry
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey !== null && oldestKey !== '') {
      this.cache.delete(oldestKey);
    }
  }
  
  /**
   * Execute with deduplication
   */
  async dedupe<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: { ttl?: number }
  ): Promise<T> {
    // Check cache first
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }
    
    // Check for pending request
    if (this.config.deduplication === true) {
      const pending = this.pending.get(key) as PendingRequest<T> | undefined;
      
      if (pending !== undefined) {
        const timeSincePending = Date.now() - pending.timestamp;
        if (timeSincePending < this.config.deduplicationWindow) {
          return pending.promise;
        }
      }
    }
    
    // Execute fetcher
    const promise = fetcher();
    
    // Store pending request
    if (this.config.deduplication === true) {
      this.pending.set(key, {
        promise,
        timestamp: Date.now(),
      });
    }
    
    try {
      const data = await promise;
      
      // Cache result
      this.set(key, data, options?.ttl);
      
      return data;
    } finally {
      // Clean up pending
      this.pending.delete(key);
    }
  }
  
  /**
   * Invalidate cache entries by pattern
   */
  invalidatePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxEntries: number;
    pendingRequests: number;
  } {
    return {
      size: this.cache.size,
      maxEntries: this.config.maxEntries,
      pendingRequests: this.pending.size,
    };
  }
}

/**
 * Default request cache instance
 */
export const requestCache = new RequestCache();

/**
 * Create a cached fetcher
 */
export function createCachedFetcher<T>(
  fetcher: () => Promise<T>,
  key: string,
  options?: { ttl?: number; cache?: RequestCache }
): () => Promise<T> {
  const cache = options?.cache ?? requestCache;
  
  return async () => cache.dedupe(key, fetcher, options);
}

/**
 * HOF for caching function results
 */
export function withCache<Args extends unknown[], Result>(
  fn: (...args: Args) => Promise<Result>,
  keyGenerator: (...args: Args) => string,
  options?: { ttl?: number; cache?: RequestCache }
): (...args: Args) => Promise<Result> {
  const cache = options?.cache ?? requestCache;

  return async (...args: Args) => {
    const key = keyGenerator(...args);
    return cache.dedupe(key, async () => fn(...args), options);
  };
}

// ============================================================================
// HMR Support
// ============================================================================

/**
 * HMR disposal handler to prevent memory leaks during hot module replacement.
 *
 * During development, when this module is hot-reloaded, the previous instance's
 * GC interval would continue running, causing memory leaks and unexpected behavior.
 * This handler ensures proper cleanup.
 */
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    // Clean up the default cache instance to prevent memory leaks
    requestCache.dispose();
  });
}
