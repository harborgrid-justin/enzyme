/**
 * @fileoverview Caching layer provider for feature flags.
 *
 * Provides caching functionality with:
 * - TTL-based expiration
 * - Stale-while-revalidate pattern
 * - Multiple storage backends
 * - Cache statistics
 *
 * @module flags/providers/cached-provider
 *
 * @example
 * ```typescript
 * const remoteProvider = new RemoteProvider({ endpoint: '...' });
 * const cachedProvider = new CachedProvider({
 *   provider: remoteProvider,
 *   ttl: 60000, // 1 minute
 *   staleWhileRevalidate: 300000, // 5 minutes
 * });
 *
 * await cachedProvider.initialize();
 * const flags = await cachedProvider.getFlags(); // Returns cached or fresh
 * ```
 */

import type { FeatureFlag, Segment, SegmentId } from '@/lib/flags';
import type {
  FlagProvider,
  CachedProviderConfig,
  FlagChangeListener,
  FlagChangeEvent,
  ProviderStats,
} from './types';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const DEFAULT_STALE_WHILE_REVALIDATE = 60 * 60 * 1000; // 1 hour
const DEFAULT_MAX_SIZE = 1000;

// ============================================================================
// Types
// ============================================================================

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  expiresAt: number;
  staleAt: number;
}

// ============================================================================
// Cached Provider
// ============================================================================

/**
 * Caching wrapper for flag providers.
 */
export class CachedProvider implements FlagProvider {
  readonly name: string;
  readonly priority: number;

  private provider: FlagProvider;
  private flagsCache: CacheEntry<FeatureFlag[]> | null = null;
  private flagCache = new Map<string, CacheEntry<FeatureFlag | null>>();
  private segmentsCache: CacheEntry<Segment[]> | null = null;
  private listeners = new Set<FlagChangeListener>();
  private ready = false;
  private config: Required<Omit<CachedProviderConfig, 'provider'>> & {
    provider: FlagProvider;
  };
  private cacheHits = 0;
  private cacheMisses = 0;
  private revalidating = false;
  private readonly storageKey: string;

  constructor(config: CachedProviderConfig) {
    this.name = config.name ?? `cached-${config.provider.name}`;
    this.priority = config.priority ?? config.provider.priority;

    this.config = {
      name: this.name,
      priority: this.priority,
      debug: config.debug ?? false,
      provider: config.provider,
      ttl: config.ttl ?? DEFAULT_TTL,
      staleWhileRevalidate: config.staleWhileRevalidate ?? DEFAULT_STALE_WHILE_REVALIDATE,
      maxSize: config.maxSize ?? DEFAULT_MAX_SIZE,
      storage: config.storage ?? 'memory',
    };

    this.provider = config.provider;
    this.storageKey = `flag-cache-${this.name}`;

    // Subscribe to underlying provider changes
    if (this.provider.subscribe) {
      this.provider.subscribe(this.handleProviderChange.bind(this));
    }
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initialize the provider.
   */
  async initialize(): Promise<void> {
    this.log('Initializing cached provider');

    // Load from persistent storage if configured
    if (this.config.storage !== 'memory') {
      this.loadFromStorage();
    }

    // Initialize underlying provider
    await this.provider.initialize();
    this.ready = true;

    // Pre-warm cache
    try {
      await this.getFlags();
    } catch (error) {
      this.log('Failed to pre-warm cache:', error);
    }

    this.log('Cached provider initialized');
  }

  // ==========================================================================
  // Flag Operations
  // ==========================================================================

  /**
   * Get all flags with caching.
   */
  async getFlags(): Promise<readonly FeatureFlag[]> {
    const now = Date.now();

    // Check cache
    if (this.flagsCache) {
      const { value, expiresAt, staleAt } = this.flagsCache;

      // Fresh cache hit
      if (now < expiresAt) {
        this.cacheHits++;
        this.log('Cache hit (fresh)');
        return value;
      }

      // Stale-while-revalidate
      if (now < staleAt) {
        this.cacheHits++;
        this.log('Cache hit (stale, revalidating in background)');
        void this.revalidateInBackground('flags');
        return value;
      }
    }

    // Cache miss - fetch fresh data
    this.cacheMisses++;
    this.log('Cache miss');
    return this.fetchAndCacheFlags(now);
  }

  /**
   * Get a specific flag with caching.
   */
  async getFlag(key: string): Promise<FeatureFlag | null> {
    const now = Date.now();

    // Check individual flag cache
    const cached = this.flagCache.get(key);
    if (cached) {
      const { value, expiresAt, staleAt } = cached;

      if (now < expiresAt) {
        this.cacheHits++;
        return value;
      }

      if (now < staleAt) {
        this.cacheHits++;
        void this.revalidateInBackground('flag', key);
        return value;
      }
    }

    // Check flags cache
    if (this.flagsCache && now < this.flagsCache.staleAt) {
      const flag = this.flagsCache.value.find((f) => f.key === key) ?? null;
      this.cacheFlag(key, flag, now);
      this.cacheHits++;
      return flag;
    }

    // Cache miss
    this.cacheMisses++;
    const flag = await this.provider.getFlag(key);
    this.cacheFlag(key, flag, now);
    return flag;
  }

  /**
   * Get all segments with caching.
   */
  async getSegments(): Promise<readonly Segment[]> {
    if (!this.provider.getSegments) {
      return [];
    }

    const now = Date.now();

    if (this.segmentsCache) {
      const { value, expiresAt, staleAt } = this.segmentsCache;

      if (now < expiresAt) {
        this.cacheHits++;
        return value;
      }

      if (now < staleAt) {
        this.cacheHits++;
        void this.revalidateInBackground('segments');
        return value;
      }
    }

    this.cacheMisses++;
    const segments = await this.provider.getSegments();
    const segmentArray = [...segments];

    this.segmentsCache = {
      value: segmentArray,
      timestamp: now,
      expiresAt: now + this.config.ttl,
      staleAt: now + this.config.staleWhileRevalidate,
    };

    return segmentArray;
  }

  /**
   * Get a segment by ID.
   */
  async getSegment(id: SegmentId): Promise<Segment | null> {
    if (!this.provider.getSegment) {
      return null;
    }

    // Check segments cache
    if (this.segmentsCache && Date.now() < this.segmentsCache.staleAt) {
      return this.segmentsCache.value.find((s) => s.id === id) ?? null;
    }

    return this.provider.getSegment(id);
  }

  /**
   * Invalidate all cached data.
   */
  invalidate(): void {
    this.flagsCache = null;
    this.flagCache.clear();
    this.segmentsCache = null;
    this.log('Cache invalidated');
  }

  // ==========================================================================
  // Segment Operations
  // ==========================================================================

  /**
   * Invalidate a specific flag.
   */
  invalidateFlag(key: string): void {
    this.flagCache.delete(key);
    this.flagsCache = null; // Also invalidate the full list
    this.log(`Cache invalidated for flag: ${key}`);
  }

  /**
   * Force refresh the cache.
   */
  async refresh(): Promise<void> {
    this.invalidate();
    await this.getFlags();
    this.log('Cache refreshed');
  }

  // ==========================================================================
  // Background Revalidation
  // ==========================================================================

  /**
   * Check if the provider is ready.
   */
  isReady(): boolean {
    return this.ready && this.provider.isReady();
  }

  // ==========================================================================
  // Storage Operations
  // ==========================================================================

  /**
   * Check if the provider is healthy.
   */
  async isHealthy(): Promise<boolean> {
    return this.provider.isHealthy();
  }

  /**
   * Get cache statistics.
   */
  getCacheStats(): {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
    flagsCached: boolean;
    segmentsCached: boolean;
  } {
    const total = this.cacheHits + this.cacheMisses;
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: total > 0 ? this.cacheHits / total : 0,
      size: this.flagCache.size,
      flagsCached: this.flagsCache !== null,
      segmentsCached: this.segmentsCache !== null,
    };
  }

  /**
   * Get provider statistics.
   */
  getStats(): ProviderStats {
    const cacheStats = this.getCacheStats();
    return {
      flagCount: this.flagsCache?.value.length ?? 0,
      segmentCount: this.segmentsCache?.value.length ?? 0,
      requestCount: this.cacheHits + this.cacheMisses,
      errorCount: 0,
      cacheHitRate: cacheStats.hitRate,
      lastRefresh: this.flagsCache ? new Date(this.flagsCache.timestamp) : undefined,
    };
  }

  // ==========================================================================
  // Cache Management
  // ==========================================================================

  /**
   * Subscribe to flag changes.
   */
  subscribe(listener: FlagChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Shutdown the provider.
   */
  async shutdown(): Promise<void> {
    await this.provider.shutdown();
    this.ready = false;
    this.listeners.clear();
    this.log('Cached provider shutdown');
  }

  private async fetchAndCacheFlags(now: number): Promise<FeatureFlag[]> {
    const flags = await this.provider.getFlags();
    const flagArray = [...flags];

    this.flagsCache = {
      value: flagArray,
      timestamp: now,
      expiresAt: now + this.config.ttl,
      staleAt: now + this.config.staleWhileRevalidate,
    };

    // Update individual flag cache
    for (const flag of flagArray) {
      this.cacheFlag(flag.key, flag, now);
    }

    // Persist to storage
    if (this.config.storage !== 'memory') {
      this.saveToStorage();
    }

    return flagArray;
  }

  // ==========================================================================
  // Provider Change Handling
  // ==========================================================================

  private cacheFlag(key: string, flag: FeatureFlag | null, now: number): void {
    // Enforce max size
    if (this.flagCache.size >= this.config.maxSize) {
      const oldest = this.findOldestEntry();
      if (oldest != null && oldest !== '') {
        this.flagCache.delete(oldest);
      }
    }

    this.flagCache.set(key, {
      value: flag,
      timestamp: now,
      expiresAt: now + this.config.ttl,
      staleAt: now + this.config.staleWhileRevalidate,
    });
  }

  // ==========================================================================
  // Status and Health
  // ==========================================================================

  private findOldestEntry(): string | null {
    let oldest: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.flagCache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldest = key;
      }
    }

    return oldest;
  }

  private async revalidateInBackground(
    type: 'flags' | 'segments' | 'flag',
    key?: string
  ): Promise<void> {
    if (this.revalidating) {
      return;
    }

    this.revalidating = true;
    this.log(
      `Background revalidation: ${type}${key !== null && key !== undefined ? ` (${key})` : ''}`
    );

    try {
      const now = Date.now();

      switch (type) {
        case 'flags':
          await this.fetchAndCacheFlags(now);
          break;
        case 'segments':
          if (this.provider.getSegments) {
            const segments = await this.provider.getSegments();
            this.segmentsCache = {
              value: [...segments],
              timestamp: now,
              expiresAt: now + this.config.ttl,
              staleAt: now + this.config.staleWhileRevalidate,
            };
          }
          break;
        case 'flag':
          if (key !== null && key !== undefined) {
            const flag = await this.provider.getFlag(key);
            this.cacheFlag(key, flag, now);
          }
          break;
      }

      this.log('Background revalidation complete');
    } catch (error) {
      this.log('Background revalidation failed:', error);
    } finally {
      this.revalidating = false;
    }
  }

  private getStorage(): Storage | null {
    if (typeof window === 'undefined') {
      return null;
    }

    switch (this.config.storage) {
      case 'localStorage':
        return window.localStorage;
      case 'sessionStorage':
        return window.sessionStorage;
      default:
        return null;
    }
  }

  private loadFromStorage(): void {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }

    try {
      const data = storage.getItem(this.storageKey);
      if (data !== null && data !== '') {
        const parsed = JSON.parse(data) as Record<string, unknown>;
        if (
          parsed.flags !== null &&
          parsed.flags !== undefined &&
          typeof parsed.flags === 'object'
        ) {
          const flags = parsed.flags as Record<string, unknown>;
          this.flagsCache = {
            ...flags,
            timestamp: new Date(flags.timestamp as string | number | Date).getTime(),
            expiresAt: new Date(flags.expiresAt as string | number | Date).getTime(),
            staleAt: new Date(flags.staleAt as string | number | Date).getTime(),
          } as CacheEntry<FeatureFlag[]>;
        }
        this.log('Loaded cache from storage');
      }
    } catch (error) {
      this.log('Failed to load from storage:', error);
    }
  }

  // ==========================================================================
  // Subscription
  // ==========================================================================

  private saveToStorage(): void {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }

    try {
      const data = {
        flags: this.flagsCache,
        segments: this.segmentsCache,
      };
      storage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      this.log('Failed to save to storage:', error);
    }
  }

  private handleProviderChange(event: FlagChangeEvent): void {
    // Invalidate affected cache entries
    if (event.flagKey !== null && event.flagKey !== undefined) {
      this.invalidateFlag(event.flagKey);
    } else {
      this.invalidate();
    }

    // Forward the event
    this.emitChange(event);
  }

  // ==========================================================================
  // Shutdown
  // ==========================================================================

  private emitChange(event: FlagChangeEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        this.log('Error in change listener:', error);
      }
    }
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      // eslint-disable-next-line no-console
      console.log(`[CachedProvider] ${message}`, ...args);
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a cached provider instance.
 */
export function createCachedProvider(config: CachedProviderConfig): CachedProvider {
  return new CachedProvider(config);
}
