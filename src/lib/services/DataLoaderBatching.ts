/**
 * @file DataLoader Batching
 * @description DataLoader-inspired request batching with automatic coalescing,
 * caching, deduplication, and GraphQL batch query support.
 * Optimized for microservices with N+1 query prevention.
 */

import { defer, type Deferred } from '../shared/async-utils';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Batch function that processes multiple keys at once
 */
export type BatchFunction<K, V> = (keys: K[]) => Promise<Map<K, V> | V[] | (V | Error)[]>;

/**
 * Cache key serializer
 */
export type KeySerializer<K> = (key: K) => string;

/**
 * DataLoader configuration
 */
export interface DataLoaderConfig<K, V> {
  /** Maximum items per batch */
  maxBatchSize?: number;
  /** Maximum wait time before executing batch (ms) */
  batchInterval?: number;
  /** Batch execution function */
  batchFn: BatchFunction<K, V>;
  /** Enable caching */
  cache?: boolean;
  /** Cache TTL (ms) */
  cacheTtl?: number;
  /** Key serializer for cache */
  keySerializer?: KeySerializer<K>;
  /** Handle batch errors */
  onBatchError?: (error: Error, keys: K[]) => void;
  /** Handle individual item errors */
  onItemError?: (error: Error, key: K) => void;
  /** Enable coalescing of identical requests */
  coalesce?: boolean;
  /** Schedule batch on next tick */
  batchScheduler?: (callback: () => void) => ReturnType<typeof setTimeout>;
}

/**
 * Cache entry
 */
interface CacheEntry<V> {
  value: V;
  expiresAt: number;
}

/**
 * Pending request entry
 */
interface PendingRequest<K, V> {
  key: K;
  deferred: Deferred<V>;
}

/**
 * DataLoader statistics
 */
export interface DataLoaderStats {
  /** Total loads requested */
  totalLoads: number;
  /** Cache hits */
  cacheHits: number;
  /** Cache misses */
  cacheMisses: number;
  /** Batches executed */
  batchesExecuted: number;
  /** Average batch size */
  avgBatchSize: number;
  /** Coalesced requests */
  coalescedRequests: number;
  /** Current cache size */
  cacheSize: number;
}

// =============================================================================
// DATALOADER IMPLEMENTATION
// =============================================================================

/**
 * DataLoader for batching and caching requests
 * Inspired by Facebook's DataLoader pattern
 */
export class DataLoader<K, V> {
  private config: Required<DataLoaderConfig<K, V>>;
  private batch: Map<string, PendingRequest<K, V>> = new Map();
  private cache: Map<string, CacheEntry<V>> = new Map();
  private batchTimer: ReturnType<typeof setTimeout> | null = null;
  private cacheCleanupTimer: ReturnType<typeof setInterval> | null = null;
  private stats: DataLoaderStats = {
    totalLoads: 0,
    cacheHits: 0,
    cacheMisses: 0,
    batchesExecuted: 0,
    avgBatchSize: 0,
    coalescedRequests: 0,
    cacheSize: 0,
  };

  constructor(config: DataLoaderConfig<K, V>) {
    this.config = {
      maxBatchSize: config.maxBatchSize ?? 50,
      batchInterval: config.batchInterval ?? 16, // ~1 frame
      batchFn: config.batchFn,
      cache: config.cache ?? true,
      cacheTtl: config.cacheTtl ?? 60000, // 1 minute
      keySerializer: config.keySerializer ?? ((k) => JSON.stringify(k)),
      onBatchError: config.onBatchError ?? console.error,
      onItemError: config.onItemError ?? console.error,
      coalesce: config.coalesce ?? true,
      batchScheduler: config.batchScheduler ?? ((cb) => setTimeout(cb, this.config.batchInterval)),
    };

    // Schedule automatic cache cleanup when caching is enabled
    if (this.config.cache) {
      this.cacheCleanupTimer = setInterval(() => this.clearExpired(), 30000);
    }
  }

  /**
   * Dispose of the loader and clean up resources
   */
  dispose(): void {
    if (this.batchTimer !== null) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    if (this.cacheCleanupTimer !== null) {
      clearInterval(this.cacheCleanupTimer);
      this.cacheCleanupTimer = null;
    }
    this.clearAll();
    this.batch.clear();
  }

  /**
   * Load a single value by key
   */
  async load(key: K): Promise<V> {
    const serializedKey = this.config.keySerializer(key);
    this.stats.totalLoads++;

    // Check cache first
    if (this.config.cache) {
      const cached = this.cache.get(serializedKey);
      if (cached && cached.expiresAt > Date.now()) {
        this.stats.cacheHits++;
        return cached.value;
      }
      this.stats.cacheMisses++;
    }

    // Check if already in current batch (coalescing)
    if (this.config.coalesce) {
      const existing = this.batch.get(serializedKey);
      if (existing) {
        this.stats.coalescedRequests++;
        return existing.deferred.promise;
      }
    }

    // Add to batch
    const deferred = defer<V>();
    this.batch.set(serializedKey, { key, deferred });

    // Schedule batch execution
    this.scheduleBatch();

    // Check if batch is full
    if (this.batch.size >= this.config.maxBatchSize) {
      void this.executeBatch();
    }

    return deferred.promise;
  }

  /**
   * Load multiple values by keys
   */
  async loadMany(keys: K[]): Promise<(V | Error)[]> {
    return Promise.all(keys.map(async (key) => this.load(key).catch((error: Error) => error)));
  }

  /**
   * Prime the cache with a value
   */
  prime(key: K, value: V): this {
    const serializedKey = this.config.keySerializer(key);
    this.cache.set(serializedKey, {
      value,
      expiresAt: Date.now() + this.config.cacheTtl,
    });
    this.stats.cacheSize = this.cache.size;
    return this;
  }

  /**
   * Prime multiple values
   */
  primeMany(entries: Array<[K, V]>): this {
    for (const [key, value] of entries) {
      this.prime(key, value);
    }
    return this;
  }

  /**
   * Clear a specific key from cache
   */
  clear(key: K): this {
    const serializedKey = this.config.keySerializer(key);
    this.cache.delete(serializedKey);
    this.stats.cacheSize = this.cache.size;
    return this;
  }

  /**
   * Clear multiple keys from cache
   */
  clearMany(keys: K[]): this {
    for (const key of keys) {
      this.clear(key);
    }
    return this;
  }

  /**
   * Clear all cached values
   */
  clearAll(): this {
    this.cache.clear();
    this.stats.cacheSize = 0;
    return this;
  }

  /**
   * Clear expired cache entries
   */
  clearExpired(): this {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
    this.stats.cacheSize = this.cache.size;
    return this;
  }

  /**
   * Get loader statistics
   */
  getStats(): DataLoaderStats {
    return {
      ...this.stats,
      cacheSize: this.cache.size,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): this {
    this.stats = {
      totalLoads: 0,
      cacheHits: 0,
      cacheMisses: 0,
      batchesExecuted: 0,
      avgBatchSize: 0,
      coalescedRequests: 0,
      cacheSize: this.cache.size,
    };
    return this;
  }

  /**
   * Schedule batch execution
   */
  private scheduleBatch(): void {
    if (this.batchTimer !== null) return;

    this.batchTimer = this.config.batchScheduler(() => {
      this.batchTimer = null;
      void this.executeBatch();
    });
  }

  /**
   * Execute the current batch
   */
  private async executeBatch(): Promise<void> {
    // Clear timer
    if (this.batchTimer !== null) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.batch.size === 0) return;

    // Capture current batch
    const currentBatch = new Map(this.batch);
    this.batch.clear();

    const entries = Array.from(currentBatch.values());
    const keys = entries.map(({ key }) => key);

    // Update stats
    this.stats.batchesExecuted++;
    this.stats.avgBatchSize =
      (this.stats.avgBatchSize * (this.stats.batchesExecuted - 1) + keys.length) / this.stats.batchesExecuted;

    try {
      const results = await this.config.batchFn(keys);

      // Process results
      if (results instanceof Map) {
        this.processMapResults(currentBatch, results);
      } else if (Array.isArray(results)) {
        this.processArrayResults(currentBatch, keys, results);
      }
    } catch (error) {
      this.config.onBatchError(error as Error, keys);

      // Reject all pending requests
      for (const [, { deferred }] of currentBatch) {
        deferred.reject(error as Error);
      }
    }
  }

  /**
   * Process Map results from batch function
   */
  private processMapResults(batch: Map<string, PendingRequest<K, V>>, results: Map<K, V>): void {
    for (const [serializedKey, { key, deferred }] of batch) {
      const value = results.get(key);
      if (value !== undefined) {
        // Cache the result
        if (this.config.cache) {
          this.cache.set(serializedKey, {
            value,
            expiresAt: Date.now() + this.config.cacheTtl,
          });
        }
        deferred.resolve(value);
      } else {
        const error = new Error(`No result for key: ${serializedKey}`);
        this.config.onItemError(error, key);
        deferred.reject(error);
      }
    }
    this.stats.cacheSize = this.cache.size;
  }

  /**
   * Process Array results from batch function
   */
  private processArrayResults(
    batch: Map<string, PendingRequest<K, V>>,
    _keys: K[],
    results: V[] | (V | Error)[]
  ): void {
    let i = 0;
    for (const [serializedKey, { key, deferred }] of batch) {
      if (i < results.length) {
        const result = results[i];

        if (result instanceof Error) {
          this.config.onItemError(result, key);
          deferred.reject(result);
        } else if (result !== undefined) {
          // Cache the result
          if (this.config.cache) {
            this.cache.set(serializedKey, {
              value: result,
              expiresAt: Date.now() + this.config.cacheTtl,
            });
          }
          deferred.resolve(result);
        } else {
          const error = new Error(`Result at index ${i} is undefined`);
          this.config.onItemError(error, key);
          deferred.reject(error);
        }
      } else {
        const error = new Error('Result array too short');
        this.config.onItemError(error, key);
        deferred.reject(error);
      }
      i++;
    }
    this.stats.cacheSize = this.cache.size;
  }
}

// =============================================================================
// REQUEST DEDUPLICATOR
// =============================================================================

/**
 * Request deduplication configuration
 */
export interface DeduplicatorConfig {
  /** Deduplication window (ms) */
  window?: number;
  /** Key generator for requests */
  getKey?: (url: string, options?: RequestInit) => string;
}

/**
 * In-flight request entry
 */
interface InFlightRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

/**
 * Request deduplicator for preventing duplicate concurrent requests
 */
export class RequestDeduplicator {
  private inFlight: Map<string, InFlightRequest<unknown>> = new Map();
  private config: Required<DeduplicatorConfig>;

  constructor(config: DeduplicatorConfig = {}) {
    this.config = {
      window: config.window ?? 100,
      getKey: config.getKey ?? ((url, options) => {
        const method = (options?.method !== null && options?.method !== undefined && options?.method !== '') ? options.method : 'GET';
        const body = (options?.body !== null && options?.body !== undefined) ? JSON.stringify(options.body) : '';
        return `${method}:${url}:${body}`;
      }),
    };
  }

  /**
   * Execute request with deduplication
   */
  async execute<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    const existing = this.inFlight.get(key);

    if (existing) {
      const age = Date.now() - existing.timestamp;
      if (age < this.config.window) {
        return existing.promise as Promise<T>;
      }
    }

    const promise = requestFn();
    this.inFlight.set(key, {
      promise,
      timestamp: Date.now(),
    });

    try {
      const result = await promise;
      return result;
    } finally {
      // Clean up after request completes (with slight delay for coalescing)
      setTimeout(() => {
        this.inFlight.delete(key);
      }, this.config.window);
    }
  }

  /**
   * Execute fetch with deduplication
   *
   * Note: This method intentionally uses raw fetch() rather than apiClient because:
   * 1. This is a low-level utility that wraps the fetch API for deduplication
   * 2. Users may want to use this with non-API endpoints
   * 3. The apiClient already has its own deduplication built-in
   *
   * For API calls, prefer using apiClient directly which provides retry,
   * authentication, and error handling out of the box.
   *
   * @see {@link @/lib/api/api-client} for the recommended API client
   */
  async fetch<T>(url: string, options?: RequestInit): Promise<T> {
    const key = this.config.getKey(url, options);
    return this.execute(key, async () => {
      // Raw fetch is intentional here - this is a generic deduplication wrapper
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      return response.json() as T;
    });
  }

  /**
   * Clear all in-flight requests
   */
  clear(): void {
    this.inFlight.clear();
  }

  /**
   * Get deduplication statistics
   */
  getStats(): { inFlight: number } {
    return { inFlight: this.inFlight.size };
  }
}

// =============================================================================
// GRAPHQL BATCHER
// =============================================================================

/**
 * GraphQL operation
 */
export interface GraphQLOperation {
  id: string;
  query: string;
  variables?: Record<string, unknown> | undefined;
  operationName?: string | undefined;
}

/**
 * GraphQL batch response
 */
export interface GraphQLBatchResponse {
  id: string;
  data?: unknown;
  errors?: Array<{ message: string; path?: Array<string | number> }>;
}

/**
 * GraphQL batcher configuration
 */
export interface GraphQLBatcherConfig {
  /** GraphQL endpoint */
  endpoint: string;
  /** Maximum batch size */
  maxBatchSize?: number;
  /** Batch interval (ms) */
  batchInterval?: number;
  /** Request headers */
  headers?: Record<string, string>;
  /** Fetch function */
  fetchFn?: typeof fetch;
}

/**
 * GraphQL request batcher
 */
export class GraphQLBatcher {
  private queries: Array<{
    operation: GraphQLOperation;
    deferred: Deferred<unknown>;
  }> = [];
  private batchTimer: ReturnType<typeof setTimeout> | null = null;
  private config: Required<GraphQLBatcherConfig>;

  constructor(config: GraphQLBatcherConfig) {
    this.config = {
      endpoint: config.endpoint,
      maxBatchSize: config.maxBatchSize ?? 10,
      batchInterval: config.batchInterval ?? 10,
      headers: config.headers ?? {},
      fetchFn: config.fetchFn ?? fetch.bind(window),
    };
  }

  /**
   * Execute a GraphQL query
   */
  async query<T>(query: string, variables?: Record<string, unknown>, operationName?: string): Promise<T> {
    const operation: GraphQLOperation = {
      id: crypto.randomUUID(),
      query,
      variables,
      operationName,
    };

    const deferred = defer<T>();
    this.queries.push({
      operation,
      deferred: deferred as Deferred<unknown>,
    });

    this.scheduleBatch();

    if (this.queries.length >= this.config.maxBatchSize) {
      void this.executeBatch();
    }

    return deferred.promise;
  }

  /**
   * Execute a GraphQL mutation (not batched by default)
   */
  async mutate<T>(mutation: string, variables?: Record<string, unknown>, operationName?: string): Promise<T> {
    const response = await this.config.fetchFn(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers,
      },
      body: JSON.stringify({
        query: mutation,
        variables,
        operationName,
      }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL mutation failed: ${response.status}`);
    }

    const result = await response.json() as { data?: T; errors?: Array<{ message: string }> };

    if (result.errors !== null && result.errors !== undefined && result.errors.length > 0) {
      throw new Error(result.errors.map((e: { message: string }) => e.message).join(', '));
    }

    return result.data as T;
  }

  /**
   * Schedule batch execution
   */
  private scheduleBatch(): void {
    if (this.batchTimer !== null) return;

    this.batchTimer = setTimeout(() => {
      this.batchTimer = null;
      void this.executeBatch();
    }, this.config.batchInterval);
  }

  /**
   * Execute batched queries
   */
  private async executeBatch(): Promise<void> {
    if (this.batchTimer !== null) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.queries.length === 0) return;

    const currentBatch = [...this.queries];
    this.queries = [];

    // Build batched query
    const batchedQueries = currentBatch.map(({ operation }) => ({
      id: operation.id,
      query: operation.query,
      variables: operation.variables,
      operationName: operation.operationName,
    }));

    try {
      const response = await this.config.fetchFn(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
        },
        body: JSON.stringify(batchedQueries),
      });

      if (!response.ok) {
        throw new Error(`GraphQL batch request failed: ${response.status}`);
      }

      const results = await response.json() as GraphQLBatchResponse[];

      // Resolve individual queries
      for (const result of results) {
        const query = currentBatch.find((q) => q.operation.id === result.id);
        if (query !== null && query !== undefined) {
          if (result.errors !== null && result.errors !== undefined && result.errors.length > 0) {
            query.deferred.reject(new Error(result.errors.map((e) => e.message).join(', ')));
          } else {
            query.deferred.resolve(result.data);
          }
        }
      }
    } catch (error) {
      // Reject all queries in batch
      for (const { deferred } of currentBatch) {
        deferred.reject(error as Error);
      }
    }
  }

  /**
   * Flush pending queries immediately
   */
  async flush(): Promise<void> {
    await this.executeBatch();
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create a DataLoader for fetching resources by ID
 */
export function createResourceLoader<T extends { id: string }>(
  fetchMany: (ids: string[]) => Promise<T[]>,
  config?: Partial<DataLoaderConfig<string, T>>
): DataLoader<string, T> {
  return new DataLoader<string, T>({
    maxBatchSize: config?.maxBatchSize ?? 100,
    batchInterval: config?.batchInterval ?? 16,
    cache: config?.cache ?? true,
    cacheTtl: config?.cacheTtl ?? 60000,
    batchFn: async (ids) => {
      const resources = await fetchMany(ids);
      return new Map(resources.map((r) => [r.id, r]));
    },
    ...config,
  });
}

/**
 * Create a DataLoader with automatic key serialization
 */
export function createKeyedLoader<K extends Record<string, unknown>, V>(
  batchFn: (keys: K[]) => Promise<Map<K, V> | V[]>,
  config?: Partial<DataLoaderConfig<K, V>>
): DataLoader<K, V> {
  return new DataLoader<K, V>({
    batchFn,
    keySerializer: (key) => JSON.stringify(key),
    ...config,
  });
}

// =============================================================================
// GLOBAL INSTANCES
// =============================================================================

/**
 * Global request deduplicator
 */
export const globalDeduplicator = new RequestDeduplicator();

/**
 * Deduplicated fetch function
 */
export async function deduplicatedFetch<T>(url: string, options?: RequestInit): Promise<T> {
  return globalDeduplicator.fetch<T>(url, options);
}
