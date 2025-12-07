/**
 * Request Deduplication
 *
 * Prevents duplicate concurrent API requests by caching in-flight
 * requests and returning the same promise for identical requests.
 *
 * @module api/advanced/request-deduplication
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Deduplication configuration.
 */
export interface DeduplicationConfig {
  /** How to generate cache keys */
  keyGenerator?: (request: DeduplicationRequest) => string;
  /** Time-to-live for cached promises (ms) */
  ttl?: number;
  /** Maximum number of cached entries */
  maxSize?: number;
  /** Whether to dedupe mutations (POST/PUT/PATCH/DELETE) */
  dedupeMutations?: boolean;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Request to potentially deduplicate.
 */
export interface DeduplicationRequest {
  /** Request URL */
  url: string;
  /** HTTP method */
  method: string;
  /** Request body */
  body?: unknown;
  /** Request headers */
  headers?: Record<string, string>;
}

/**
 * Cached request entry.
 */
interface CachedEntry<T> {
  /** The promise for this request */
  promise: Promise<T>;
  /** When this entry was created */
  createdAt: number;
  /** Number of subscribers */
  subscribers: number;
  /** Request key */
  key: string;
}

/**
 * Deduplication statistics.
 */
export interface DeduplicationStats {
  /** Total requests processed */
  totalRequests: number;
  /** Requests that were deduplicated */
  deduplicatedRequests: number;
  /** Current cache size */
  cacheSize: number;
  /** Cache hit rate */
  hitRate: number;
  /** Average subscribers per deduplicated request */
  avgSubscribers: number;
}

// =============================================================================
// Request Deduplicator Class
// =============================================================================

/**
 * Request Deduplicator for preventing duplicate concurrent requests.
 *
 * @example
 * ```typescript
 * const dedup = new RequestDeduplicator({
 *   ttl: 5000,
 *   maxSize: 100,
 * });
 *
 * // Multiple calls with same request will share one actual fetch
 * const [result1, result2, result3] = await Promise.all([
 *   dedup.dedupe({ url: '/users', method: 'GET' }, () => fetch('/api/users')),
 *   dedup.dedupe({ url: '/users', method: 'GET' }, () => fetch('/api/users')),
 *   dedup.dedupe({ url: '/users', method: 'GET' }, () => fetch('/api/users')),
 * ]);
 * // Only one fetch was actually made!
 * ```
 */
export class RequestDeduplicator {
  private config: Required<DeduplicationConfig>;
  private cache: Map<string, CachedEntry<unknown>>;
  private stats: {
    totalRequests: number;
    deduplicatedRequests: number;
    totalSubscribers: number;
  };

  /**
   * Create a new request deduplicator.
   *
   * @param config - Deduplication configuration
   */
  constructor(config: DeduplicationConfig = {}) {
    this.config = {
      keyGenerator: this.defaultKeyGenerator.bind(this),
      ttl: 5000,
      maxSize: 1000,
      dedupeMutations: false,
      debug: false,
      ...config,
    };

    this.cache = new Map();
    this.stats = {
      totalRequests: 0,
      deduplicatedRequests: 0,
      totalSubscribers: 0,
    };
  }

  // ===========================================================================
  // Main Methods
  // ===========================================================================

  /**
   * Deduplicate a request.
   *
   * @param request - Request to potentially deduplicate
   * @param executor - Function to execute if not deduplicated
   * @returns Promise resolving to the result
   */
  async dedupe<T>(request: DeduplicationRequest, executor: () => Promise<T>): Promise<T> {
    this.stats.totalRequests++;

    // Check if we should dedupe this request
    if (!this.shouldDedupe(request)) {
      return executor();
    }

    const key = this.config.keyGenerator(request);

    // Check for existing in-flight request
    const existing = this.cache.get(key) as CachedEntry<T> | undefined;

    if (existing && this.isValid(existing)) {
      this.stats.deduplicatedRequests++;
      this.stats.totalSubscribers++;
      existing.subscribers++;
      this.log(`Deduped request: ${key} (${existing.subscribers} subscribers)`);
      return existing.promise;
    }

    // Create new entry
    const promise = this.executeAndCleanup<T>(key, executor);

    const entry: CachedEntry<T> = {
      promise,
      createdAt: Date.now(),
      subscribers: 1,
      key,
    };

    // Enforce max size
    this.enforceMaxSize();

    this.cache.set(key, entry as CachedEntry<unknown>);
    this.log(`New request: ${key}`);

    return promise;
  }

  /**
   * Check if a request is currently in flight.
   *
   * @param request - Request to check
   * @returns Whether request is in flight
   */
  isInFlight(request: DeduplicationRequest): boolean {
    const key = this.config.keyGenerator(request);
    const entry = this.cache.get(key);
    return entry !== undefined && this.isValid(entry);
  }

  /**
   * Cancel a pending request.
   *
   * @param request - Request to cancel
   * @returns Whether request was found and cancelled
   */
  cancel(request: DeduplicationRequest): boolean {
    const key = this.config.keyGenerator(request);
    return this.cache.delete(key);
  }

  /**
   * Clear all cached requests.
   */
  clear(): void {
    this.cache.clear();
    this.log('Cache cleared');
  }

  /**
   * Get deduplication statistics.
   */
  getStats(): DeduplicationStats {
    return {
      totalRequests: this.stats.totalRequests,
      deduplicatedRequests: this.stats.deduplicatedRequests,
      cacheSize: this.cache.size,
      hitRate:
        this.stats.totalRequests > 0
          ? this.stats.deduplicatedRequests / this.stats.totalRequests
          : 0,
      avgSubscribers:
        this.stats.deduplicatedRequests > 0
          ? this.stats.totalSubscribers / this.stats.deduplicatedRequests
          : 0,
    };
  }

  /**
   * Reset statistics.
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      deduplicatedRequests: 0,
      totalSubscribers: 0,
    };
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Check if request should be deduplicated.
   */
  private shouldDedupe(request: DeduplicationRequest): boolean {
    const method = request.method.toUpperCase();

    // Always dedupe GET and HEAD
    if (method === 'GET' || method === 'HEAD') {
      return true;
    }

    // Optionally dedupe mutations
    return this.config.dedupeMutations;
  }

  /**
   * Execute request and clean up cache.
   */
  private async executeAndCleanup<T>(key: string, executor: () => Promise<T>): Promise<T> {
    try {

      return await executor();
    } finally {
      // Remove from cache after completion
      // Use setTimeout to allow other subscribers to get the result
      setTimeout(() => {
        this.cache.delete(key);
        this.log(`Removed from cache: ${key}`);
      }, 0);
    }
  }

  /**
   * Check if cache entry is still valid.
   */
  private isValid(entry: CachedEntry<unknown>): boolean {
    return Date.now() - entry.createdAt < this.config.ttl;
  }

  /**
   * Enforce maximum cache size.
   */
  private enforceMaxSize(): void {
    if (this.cache.size >= this.config.maxSize) {
      // Remove oldest entries
      const entriesToRemove = Math.ceil(this.config.maxSize * 0.2); // Remove 20%
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].createdAt - b[1].createdAt)
        .slice(0, entriesToRemove);

      for (const [key] of entries) {
        this.cache.delete(key);
      }

      this.log(`Evicted ${entriesToRemove} entries`);
    }
  }

  /**
   * Default key generator.
   */
  private defaultKeyGenerator(request: DeduplicationRequest): string {
    const { url, method, body } = request;
    const bodyHash = body != null ? this.hashBody(body) : '';
    return `${method.toUpperCase()}:${url}:${bodyHash}`;
  }

  /**
   * Hash request body for cache key.
   */
  private hashBody(body: unknown): string {
    try {
      const str = JSON.stringify(body);
      // Simple hash function
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      return hash.toString(36);
    } catch {
      return '';
    }
  }

  /**
   * Log debug message.
   */
  private log(message: string): void {
    if (this.config.debug) {
      // eslint-disable-next-line no-console
      console.log(`[RequestDeduplicator] ${message}`);
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new request deduplicator.
 *
 * @param config - Deduplication configuration
 * @returns RequestDeduplicator instance
 */
export function createRequestDeduplicator(config?: DeduplicationConfig): RequestDeduplicator {
  return new RequestDeduplicator(config);
}

// =============================================================================
// Decorator / Wrapper
// =============================================================================

/**
 * Create a deduplicated fetch wrapper.
 *
 * @param config - Deduplication configuration
 * @returns Wrapped fetch function
 */
export function createDeduplicatedFetch(config?: DeduplicationConfig): typeof fetch {
  const dedup = new RequestDeduplicator(config);

  return async (input: RequestInfo | URL, init?: RequestInit) => {
    let url: string;
    if (typeof input === 'string') {
      url = input;
    } else if (input instanceof URL) {
      url = input.toString();
    } else {
      ({ url } = input);
    }

    const method = init?.method ?? 'GET';

    return dedup.dedupe(
      { url, method, body: init?.body, headers: init?.headers as Record<string, string> },
      async () => fetch(input, init)
    );
  };
}

/**
 * Higher-order function to deduplicate any async function.
 *
 * @param fn - Function to deduplicate
 * @param keyGenerator - Function to generate cache key from arguments
 * @param _config
 * @returns Deduplicated function
 */
export function deduplicateFunction<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  keyGenerator: (...args: TArgs) => string,

  _config?: Omit<DeduplicationConfig, 'keyGenerator'>
): (...args: TArgs) => Promise<TResult> {
  const cache = new Map<string, Promise<TResult>>();

  return async (...args: TArgs): Promise<TResult> => {
    const key = keyGenerator(...args);

    // Check existing
    const existing = cache.get(key);
    if (existing) {
      return existing;
    }

    // Create new
    const promise = fn(...args).finally(() => {
      cache.delete(key);
    });

    cache.set(key, promise);
    return promise;
  };
}

// =============================================================================
// React Hook Integration
// =============================================================================

/**
 * Request deduplication for React Query or SWR integration.
 */
export class ReactQueryDeduplicator extends RequestDeduplicator {
  /**
   * Create a query function with deduplication.
   */
  createQueryFn<T>(queryKey: unknown[], fetcher: () => Promise<T>): () => Promise<T> {
    const key = JSON.stringify(queryKey);

    return async () => this.dedupe({ url: key, method: 'GET' }, fetcher);
  }
}

/**
 * Create a React Query compatible deduplicator.
 */
export function createReactQueryDeduplicator(config?: DeduplicationConfig): ReactQueryDeduplicator {
  return new ReactQueryDeduplicator(config);
}
