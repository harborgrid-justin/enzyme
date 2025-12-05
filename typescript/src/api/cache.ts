/**
 * API Response Caching Utilities
 *
 * @module @missionfabric-js/enzyme-typescript/api/cache
 * @description Type-safe response caching with TTL and invalidation
 *
 * @example
 * ```typescript
 * import { createCache, withCache } from '@missionfabric-js/enzyme-typescript/api';
 *
 * const cache = createCache({ ttl: 60000 });
 * const data = await withCache('users', () => fetchUsers(), cache);
 * ```
 */

/**
 * Cache entry
 */
interface CacheEntry<T> {
  /** Cached value */
  value: T;
  /** Timestamp when cached */
  timestamp: number;
  /** Expiration timestamp */
  expiresAt: number;
  /** Cache hits count */
  hits: number;
  /** Entry tags for invalidation */
  tags?: string[];
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Time to live in milliseconds */
  ttl?: number;
  /** Maximum cache size (number of entries) */
  maxSize?: number;
  /** Storage backend */
  storage?: CacheStorage;
  /** Cache key prefix */
  keyPrefix?: string;
  /** Enable cache statistics */
  enableStats?: boolean;
}

/**
 * Cache storage interface
 */
export interface CacheStorage {
  get<T>(key: string): Promise<T | undefined> | T | undefined;
  set<T>(key: string, value: T): Promise<void> | void;
  delete(key: string): Promise<boolean> | boolean;
  clear(): Promise<void> | void;
  has(key: string): Promise<boolean> | boolean;
  keys(): Promise<string[]> | string[];
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Total number of cache hits */
  hits: number;
  /** Total number of cache misses */
  misses: number;
  /** Hit rate (0-1) */
  hitRate: number;
  /** Current cache size */
  size: number;
  /** Total requests */
  requests: number;
}

/**
 * In-memory cache storage
 */
class MemoryStorage implements CacheStorage {
  private store = new Map<string, unknown>();

  get<T>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }

  set<T>(key: string, value: T): void {
    this.store.set(key, value);
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  keys(): string[] {
    return Array.from(this.store.keys());
  }
}

/**
 * Response cache
 */
export class ResponseCache {
  private config: Required<CacheConfig>;
  private storage: CacheStorage;
  private stats: CacheStats;

  constructor(config: CacheConfig = {}) {
    this.config = {
      ttl: config.ttl ?? 300000, // 5 minutes default
      maxSize: config.maxSize ?? 100,
      storage: config.storage ?? new MemoryStorage(),
      keyPrefix: config.keyPrefix ?? 'api:',
      enableStats: config.enableStats ?? true,
    };

    this.storage = this.config.storage;
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      size: 0,
      requests: 0,
    };
  }

  /**
   * Get cache key with prefix
   */
  private getCacheKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  /**
   * Update statistics
   */
  private updateStats(hit: boolean): void {
    if (!this.config.enableStats) return;

    this.stats.requests++;
    if (hit) {
      this.stats.hits++;
    } else {
      this.stats.misses++;
    }
    this.stats.hitRate = this.stats.hits / this.stats.requests;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | undefined> {
    const cacheKey = this.getCacheKey(key);
    const entry = await this.storage.get<CacheEntry<T>>(cacheKey);

    if (!entry) {
      this.updateStats(false);
      return undefined;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      await this.storage.delete(cacheKey);
      this.updateStats(false);
      return undefined;
    }

    // Update hit count
    entry.hits++;
    await this.storage.set(cacheKey, entry);

    this.updateStats(true);
    return entry.value;
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, options?: { ttl?: number; tags?: string[] }): Promise<void> {
    const cacheKey = this.getCacheKey(key);
    const ttl = options?.ttl ?? this.config.ttl;

    // Check max size
    const keys = await this.storage.keys();
    if (keys.length >= this.config.maxSize && !(await this.storage.has(cacheKey))) {
      await this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
      hits: 0,
      tags: options?.tags,
    };

    await this.storage.set(cacheKey, entry);
    this.stats.size = (await this.storage.keys()).length;
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    const cacheKey = this.getCacheKey(key);
    const result = await this.storage.delete(cacheKey);
    this.stats.size = (await this.storage.keys()).length;
    return result;
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== undefined;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    await this.storage.clear();
    this.stats.size = 0;
  }

  /**
   * Invalidate cache entries by tag
   */
  async invalidateByTag(tag: string): Promise<number> {
    const keys = await this.storage.keys();
    let count = 0;

    for (const key of keys) {
      const entry = await this.storage.get<CacheEntry<unknown>>(key);
      if (entry?.tags?.includes(tag)) {
        await this.storage.delete(key);
        count++;
      }
    }

    this.stats.size = (await this.storage.keys()).length;
    return count;
  }

  /**
   * Invalidate cache entries by pattern
   */
  async invalidateByPattern(pattern: string | RegExp): Promise<number> {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    const keys = await this.storage.keys();
    let count = 0;

    for (const key of keys) {
      if (regex.test(key)) {
        await this.storage.delete(key);
        count++;
      }
    }

    this.stats.size = (await this.storage.keys()).length;
    return count;
  }

  /**
   * Evict least recently used entry
   */
  private async evictLRU(): Promise<void> {
    const keys = await this.storage.keys();
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const key of keys) {
      const entry = await this.storage.get<CacheEntry<unknown>>(key);
      if (entry && entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      await this.storage.delete(oldestKey);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      size: this.stats.size,
      requests: 0,
    };
  }

  /**
   * Get all cache keys
   */
  async keys(): Promise<string[]> {
    const allKeys = await this.storage.keys();
    const prefix = this.config.keyPrefix;
    return allKeys
      .filter((key) => key.startsWith(prefix))
      .map((key) => key.slice(prefix.length));
  }

  /**
   * Get cache entry metadata
   */
  async getMetadata(key: string): Promise<Omit<CacheEntry<unknown>, 'value'> | undefined> {
    const cacheKey = this.getCacheKey(key);
    const entry = await this.storage.get<CacheEntry<unknown>>(cacheKey);

    if (!entry) return undefined;

    const { value, ...metadata } = entry;
    return metadata;
  }
}

/**
 * Create cache instance
 *
 * @example
 * ```typescript
 * const cache = createCache({
 *   ttl: 60000,
 *   maxSize: 50
 * });
 * ```
 */
export function createCache(config?: CacheConfig): ResponseCache {
  return new ResponseCache(config);
}

/**
 * Execute function with caching
 *
 * @example
 * ```typescript
 * const cache = createCache();
 * const users = await withCache(
 *   'users-list',
 *   () => fetch('/api/users').then(r => r.json()),
 *   cache,
 *   { ttl: 30000, tags: ['users'] }
 * );
 * ```
 */
export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  cache: ResponseCache,
  options?: { ttl?: number; tags?: string[]; force?: boolean }
): Promise<T> {
  // Force refresh
  if (options?.force) {
    const value = await fn();
    await cache.set(key, value, options);
    return value;
  }

  // Try cache first
  const cached = await cache.get<T>(key);
  if (cached !== undefined) {
    return cached;
  }

  // Execute and cache
  const value = await fn();
  await cache.set(key, value, options);
  return value;
}

/**
 * Cache key builder
 */
export class CacheKeyBuilder {
  private parts: string[] = [];

  /**
   * Add key part
   */
  add(part: string | number | boolean): this {
    this.parts.push(String(part));
    return this;
  }

  /**
   * Add object as key part
   */
  addObject(obj: Record<string, unknown>): this {
    const sorted = Object.keys(obj).sort();
    for (const key of sorted) {
      this.parts.push(`${key}:${String(obj[key])}`);
    }
    return this;
  }

  /**
   * Add array as key part
   */
  addArray(arr: unknown[]): this {
    this.parts.push(arr.map(String).join(','));
    return this;
  }

  /**
   * Build cache key
   */
  build(): string {
    return this.parts.join(':');
  }

  /**
   * Build and hash cache key
   */
  buildHash(): string {
    const key = this.build();
    return hashString(key);
  }
}

/**
 * Create cache key builder
 *
 * @example
 * ```typescript
 * const key = cacheKey()
 *   .add('users')
 *   .add('page', 1)
 *   .addObject({ sort: 'name', order: 'asc' })
 *   .build(); // 'users:page:1:order:asc:sort:name'
 * ```
 */
export function cacheKey(): CacheKeyBuilder {
  return new CacheKeyBuilder();
}

/**
 * Simple string hash function
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Stale-while-revalidate cache strategy
 *
 * @example
 * ```typescript
 * const data = await staleWhileRevalidate(
 *   'users',
 *   () => fetchUsers(),
 *   cache,
 *   { staleTime: 30000, ttl: 60000 }
 * );
 * ```
 */
export async function staleWhileRevalidate<T>(
  key: string,
  fn: () => Promise<T>,
  cache: ResponseCache,
  options: { staleTime: number; ttl?: number; tags?: string[] }
): Promise<T> {
  const cached = await cache.get<T>(key);
  const metadata = await cache.getMetadata(key);

  // Return cached value if fresh
  if (cached !== undefined && metadata) {
    const age = Date.now() - metadata.timestamp;

    if (age < options.staleTime) {
      return cached;
    }

    // Return stale value and revalidate in background
    fn()
      .then((value) => cache.set(key, value, options))
      .catch(() => {
        // Ignore revalidation errors
      });

    return cached;
  }

  // No cached value, fetch new
  const value = await fn();
  await cache.set(key, value, options);
  return value;
}

/**
 * Cache-first strategy
 *
 * @example
 * ```typescript
 * const data = await cacheFirst(
 *   'config',
 *   () => fetchConfig(),
 *   cache
 * );
 * ```
 */
export async function cacheFirst<T>(
  key: string,
  fn: () => Promise<T>,
  cache: ResponseCache,
  options?: { ttl?: number; tags?: string[] }
): Promise<T> {
  return withCache(key, fn, cache, options);
}

/**
 * Network-first strategy (cache fallback)
 *
 * @example
 * ```typescript
 * const data = await networkFirst(
 *   'users',
 *   () => fetchUsers(),
 *   cache
 * );
 * ```
 */
export async function networkFirst<T>(
  key: string,
  fn: () => Promise<T>,
  cache: ResponseCache,
  options?: { ttl?: number; tags?: string[] }
): Promise<T> {
  try {
    const value = await fn();
    await cache.set(key, value, options);
    return value;
  } catch (error) {
    const cached = await cache.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }
    throw error;
  }
}

/**
 * Create cache decorator for functions
 *
 * @example
 * ```typescript
 * const cache = createCache();
 * const cachedFetch = cached(
 *   (id: number) => fetch(`/api/users/${id}`).then(r => r.json()),
 *   cache,
 *   { keyFn: (id) => `user:${id}`, ttl: 60000 }
 * );
 *
 * const user = await cachedFetch(123); // cached
 * ```
 */
export function cached<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  cache: ResponseCache,
  options: {
    keyFn: (...args: TArgs) => string;
    ttl?: number;
    tags?: string[] | ((...args: TArgs) => string[]);
  }
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    const key = options.keyFn(...args);
    const tags = typeof options.tags === 'function' ? options.tags(...args) : options.tags;

    return withCache(key, () => fn(...args), cache, {
      ttl: options.ttl,
      tags,
    });
  };
}
