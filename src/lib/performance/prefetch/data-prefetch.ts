/**
 * @file Data Prefetching
 * @description API and data prefetching utilities with caching, deduplication,
 * and stale-while-revalidate patterns.
 *
 * Features:
 * - API response prefetching
 * - GraphQL query prefetching
 * - Stale-while-revalidate
 * - Request deduplication
 * - Cache management
 * - Prefetch on interaction
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Data prefetch configuration
 */
export interface DataPrefetchConfig {
  /** Enable data prefetching */
  enabled: boolean;
  /** Default cache TTL in ms */
  defaultTTL: number;
  /** Enable stale-while-revalidate */
  staleWhileRevalidate: boolean;
  /** Stale time before revalidation in ms */
  staleTime: number;
  /** Enable request deduplication */
  deduplicate: boolean;
  /** Deduplication window in ms */
  dedupeWindow: number;
  /** Maximum cache entries */
  maxCacheEntries: number;
  /** Include credentials */
  credentials: RequestCredentials;
  /** Default headers */
  defaultHeaders: Record<string, string>;
  /** Retry configuration */
  retry: {
    attempts: number;
    delay: number;
    backoff: 'linear' | 'exponential';
  };
  /** Debug mode */
  debug: boolean;
}

/**
 * Prefetch request options
 */
export interface PrefetchRequestOptions {
  /** HTTP method */
  method?: 'GET' | 'POST';
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body (for POST) */
  body?: unknown;
  /** Cache TTL in ms */
  ttl?: number;
  /** Cache key (defaults to URL) */
  cacheKey?: string;
  /** Priority */
  priority?: 'high' | 'normal' | 'low';
  /** Skip cache and force fetch */
  force?: boolean;
  /** Tags for cache invalidation */
  tags?: string[];
}

/**
 * Cache entry
 */
interface CacheEntry<T = unknown> {
  data: T;
  fetchedAt: number;
  expiresAt: number;
  staleAt: number;
  tags: string[];
  isRevalidating: boolean;
}

/**
 * Prefetch result
 */
export interface PrefetchResult<T = unknown> {
  data: T | null;
  error: Error | null;
  fromCache: boolean;
  stale: boolean;
  fetchedAt: number;
}

/**
 * Pending request
 */
interface PendingRequest<T = unknown> {
  promise: Promise<T>;
  timestamp: number;
}

/**
 * GraphQL query options
 */
export interface GraphQLPrefetchOptions {
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string;
  ttl?: number;
  tags?: string[];
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: DataPrefetchConfig = {
  enabled: true,
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  staleWhileRevalidate: true,
  staleTime: 60 * 1000, // 1 minute
  deduplicate: true,
  dedupeWindow: 100, // 100ms
  maxCacheEntries: 500,
  credentials: 'same-origin',
  defaultHeaders: {
    'Content-Type': 'application/json',
  },
  retry: {
    attempts: 2,
    delay: 1000,
    backoff: 'exponential',
  },
  debug: false,
};

// ============================================================================
// Data Prefetch Manager
// ============================================================================

/**
 * Manages data prefetching with caching
 */
export class DataPrefetchManager {
  private readonly config: DataPrefetchConfig;
  private cache: Map<string, CacheEntry> = new Map();
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();

  constructor(config: Partial<DataPrefetchConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Prefetch data from a URL
   */
  async prefetch<T = unknown>(
    url: string,
    options: PrefetchRequestOptions = {}
  ): Promise<PrefetchResult<T>> {
    if (!this.config.enabled) {
      return {
        data: null,
        error: new Error('Data prefetch disabled'),
        fromCache: false,
        stale: false,
        fetchedAt: 0,
      };
    }

    const cacheKey = options.cacheKey ?? this.generateCacheKey(url, options);
    const now = Date.now();

    // Check cache first (unless force)
    if (options.force !== true) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        // Return fresh data immediately
        if (cached.expiresAt > now) {
          this.log(`Cache hit (fresh): ${cacheKey}`);
          return {
            data: cached.data as T,
            error: null,
            fromCache: true,
            stale: false,
            fetchedAt: cached.fetchedAt,
          };
        }

        // Return stale data and revalidate in background
        if (this.config.staleWhileRevalidate && cached.staleAt > now && !cached.isRevalidating) {
          this.log(`Cache hit (stale): ${cacheKey}`);
          void this.revalidate(url, cacheKey, options);
          return {
            data: cached.data as T,
            error: null,
            fromCache: true,
            stale: true,
            fetchedAt: cached.fetchedAt,
          };
        }
      }
    }

    // Check for pending request (deduplication)
    if (this.config.deduplicate) {
      const pending = this.pendingRequests.get(cacheKey);
      if (pending && now - pending.timestamp < this.config.dedupeWindow) {
        this.log(`Request deduplicated: ${cacheKey}`);
        try {
          const data = await pending.promise;
          return {
            data: data as T,
            error: null,
            fromCache: false,
            stale: false,
            fetchedAt: now,
          };
        } catch (error) {
          return {
            data: null,
            error: error instanceof Error ? error : new Error(String(error)),
            fromCache: false,
            stale: false,
            fetchedAt: now,
          };
        }
      }
    }

    // Execute fetch
    return this.executeFetch<T>(url, cacheKey, options);
  }

  /**
   * Prefetch multiple URLs
   */
  async prefetchMany<T = unknown>(
    requests: Array<{ url: string; options?: PrefetchRequestOptions }>
  ): Promise<Map<string, PrefetchResult<T>>> {
    const results = new Map<string, PrefetchResult<T>>();

    const promises = requests.map(async ({ url, options }) => {
      const result = await this.prefetch<T>(url, options);
      results.set(options?.cacheKey ?? url, result);
    });

    await Promise.allSettled(promises);
    return results;
  }

  /**
   * Prefetch a GraphQL query
   */
  async prefetchGraphQL<T = unknown>(
    endpoint: string,
    options: GraphQLPrefetchOptions
  ): Promise<PrefetchResult<T>> {
    const cacheKey = this.generateGraphQLCacheKey(endpoint, options);

    return this.prefetch<T>(endpoint, {
      method: 'POST',
      body: {
        query: options.query,
        variables: options.variables,
        operationName: options.operationName,
      },
      cacheKey,
      ttl: options.ttl,
      tags: options.tags,
    });
  }

  /**
   * Get cached data without fetching
   */
  getCached<T = unknown>(cacheKey: string): T | null {
    const entry = this.cache.get(cacheKey);
    if (!entry) return null;

    if (entry.expiresAt > Date.now()) {
      return entry.data as T;
    }

    // Return stale if within stale window
    if (entry.staleAt > Date.now()) {
      return entry.data as T;
    }

    return null;
  }

  /**
   * Check if data is cached
   */
  isCached(cacheKey: string): boolean {
    const entry = this.cache.get(cacheKey);
    return entry !== undefined && entry.expiresAt > Date.now();
  }

  /**
   * Check if cached data is stale
   */
  isStale(cacheKey: string): boolean {
    const entry = this.cache.get(cacheKey);
    if (!entry) return true;

    const now = Date.now();
    return entry.expiresAt <= now && entry.staleAt > now;
  }

  /**
   * Invalidate cache by key
   */
  invalidate(cacheKey: string): boolean {
    return this.cache.delete(cacheKey);
  }

  /**
   * Invalidate cache by tag
   */
  invalidateByTag(tag: string): number {
    let invalidated = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key);
        invalidated++;
      }
    }

    this.log(`Invalidated ${invalidated} entries with tag: ${tag}`);
    return invalidated;
  }

  /**
   * Subscribe to cache updates
   */
  subscribe(cacheKey: string, callback: (data: unknown) => void): () => void {
    const subs = this.listeners.get(cacheKey) ?? new Set();
    subs.add(callback);
    this.listeners.set(cacheKey, subs);

    // Emit current value if cached
    const cached = this.getCached(cacheKey);
    if (cached !== null) {
      callback(cached);
    }

    return () => {
      subs.delete(callback);
      if (subs.size === 0) {
        this.listeners.delete(cacheKey);
      }
    };
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
    this.log('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    entries: number;
    size: number;
    pendingRequests: number;
  } {
    let size = 0;
    for (const entry of this.cache.values()) {
      size += this.estimateSize(entry.data);
    }

    return {
      entries: this.cache.size,
      size,
      pendingRequests: this.pendingRequests.size,
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async executeFetch<T>(
    url: string,
    cacheKey: string,
    options: PrefetchRequestOptions
  ): Promise<PrefetchResult<T>> {
    const fetchPromise = this.fetchWithRetry<T>(url, options);

    // Store pending request for deduplication
    this.pendingRequests.set(cacheKey, {
      promise: fetchPromise as Promise<unknown>,
      timestamp: Date.now(),
    });

    try {
      const data = await fetchPromise;
      const now = Date.now();
      const ttl = options.ttl ?? this.config.defaultTTL;

      // Cache the result
      this.setCache(cacheKey, data, ttl, options.tags);

      // Clean up pending request
      this.pendingRequests.delete(cacheKey);

      this.log(`Fetched and cached: ${cacheKey}`);

      return {
        data,
        error: null,
        fromCache: false,
        stale: false,
        fetchedAt: now,
      };
    } catch (error) {
      this.pendingRequests.delete(cacheKey);

      // Return stale data on error if available
      const stale = this.cache.get(cacheKey);
      if (stale) {
        this.log(`Fetch failed, returning stale: ${cacheKey}`);
        return {
          data: stale.data as T,
          error: error instanceof Error ? error : new Error(String(error)),
          fromCache: true,
          stale: true,
          fetchedAt: stale.fetchedAt,
        };
      }

      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
        fromCache: false,
        stale: false,
        fetchedAt: Date.now(),
      };
    }
  }

  private async fetchWithRetry<T>(url: string, options: PrefetchRequestOptions): Promise<T> {
    const { retry } = this.config;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retry.attempts; attempt++) {
      try {
        const response = await fetch(url, {
          method: options.method ?? 'GET',
          headers: {
            ...this.config.defaultHeaders,
            ...options.headers,
          },
          body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
          credentials: this.config.credentials,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return (await response.json()) as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < retry.attempts) {
          const delay =
            retry.backoff === 'exponential'
              ? retry.delay * Math.pow(2, attempt)
              : retry.delay * (attempt + 1);

          this.log(`Retry ${attempt + 1}/${retry.attempts} for ${url} in ${delay}ms`);
          await this.sleep(delay);
        }
      }
    }

    throw lastError ?? new Error('Unknown error occurred');
  }

  private async revalidate(
    url: string,
    cacheKey: string,
    options: PrefetchRequestOptions
  ): Promise<void> {
    const entry = this.cache.get(cacheKey);
    if (entry == null || entry.isRevalidating) {
      return;
    }

    entry.isRevalidating = true;
    this.log(`Revalidating: ${cacheKey}`);

    try {
      const data = await this.fetchWithRetry(url, options);
      const ttl = options.ttl ?? this.config.defaultTTL;
      this.setCache(cacheKey, data, ttl, options.tags);

      // Notify subscribers
      this.notifySubscribers(cacheKey, data);
    } catch (error) {
      this.log(`Revalidation failed: ${cacheKey}`, error);
    } finally {
      const currentEntry = this.cache.get(cacheKey);
      if (currentEntry) {
        currentEntry.isRevalidating = false;
      }
    }
  }

  private setCache(cacheKey: string, data: unknown, ttl: number, tags?: string[]): void {
    const now = Date.now();

    // Evict if at capacity
    if (this.cache.size >= this.config.maxCacheEntries) {
      this.evictOldest();
    }

    this.cache.set(cacheKey, {
      data,
      fetchedAt: now,
      expiresAt: now + ttl,
      staleAt: now + ttl + this.config.staleTime,
      tags: tags ?? [],
      isRevalidating: false,
    });
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.fetchedAt < oldestTime) {
        oldestTime = entry.fetchedAt;
        oldestKey = key;
      }
    }

    if (oldestKey !== null) {
      this.cache.delete(oldestKey);
      this.log(`Evicted oldest: ${oldestKey}`);
    }
  }

  private notifySubscribers(cacheKey: string, data: unknown): void {
    const subs = this.listeners.get(cacheKey);
    if (subs !== undefined) {
      subs.forEach((callback) => callback(data));
    }
  }

  private generateCacheKey(url: string, options: PrefetchRequestOptions): string {
    const parts = [url, options.method ?? 'GET'];

    if (options.body !== undefined) {
      parts.push(JSON.stringify(options.body));
    }

    return parts.join(':');
  }

  private generateGraphQLCacheKey(endpoint: string, options: GraphQLPrefetchOptions): string {
    const parts = [
      endpoint,
      options.operationName ?? 'anonymous',
      JSON.stringify(options.variables ?? {}),
    ];
    return `graphql:${parts.join(':')}`;
  }

  private estimateSize(data: unknown): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return 0;
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      console.info(`[DataPrefetch] ${message}`, ...args);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let managerInstance: DataPrefetchManager | null = null;

/**
 * Get or create the global data prefetch manager
 */
export function getDataPrefetchManager(config?: Partial<DataPrefetchConfig>): DataPrefetchManager {
  managerInstance ??= new DataPrefetchManager(config);
  return managerInstance;
}

/**
 * Reset the manager instance
 */
export function resetDataPrefetchManager(): void {
  if (managerInstance !== null) {
    managerInstance.clearCache();
    managerInstance = null;
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Prefetch data from a URL
 */
export async function prefetchData<T = unknown>(
  url: string,
  options?: PrefetchRequestOptions
): Promise<PrefetchResult<T>> {
  return getDataPrefetchManager().prefetch<T>(url, options);
}

/**
 * Prefetch a GraphQL query
 */
export async function prefetchGraphQL<T = unknown>(
  endpoint: string,
  options: GraphQLPrefetchOptions
): Promise<PrefetchResult<T>> {
  return getDataPrefetchManager().prefetchGraphQL<T>(endpoint, options);
}

/**
 * Get cached data
 */
export function getCachedData<T = unknown>(cacheKey: string): T | null {
  return getDataPrefetchManager().getCached<T>(cacheKey);
}

/**
 * Invalidate cache by key
 */
export function invalidateData(cacheKey: string): boolean {
  return getDataPrefetchManager().invalidate(cacheKey);
}

/**
 * Invalidate cache by tag
 */
export function invalidateDataByTag(tag: string): number {
  return getDataPrefetchManager().invalidateByTag(tag);
}
