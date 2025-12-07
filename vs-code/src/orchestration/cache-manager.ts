/**
 * CacheManager - LRU cache with TTL support and persistence
 */

import type { LoggerService } from '../services/logger-service';
import type * as vscode from 'vscode';

/**
 * Cache entry
 */
export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl?: number;
  accessCount: number;
  lastAccess: number;
}

/**
 * Cache statistics
 */
export interface CacheStatistics {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
}

/**
 * CacheManager - Manages in-memory and persistent caching
 */
export class CacheManager {
  private static instance: CacheManager;
  private readonly logger: LoggerService;
  private readonly memoryCache = new Map<string, CacheEntry<unknown>>();
  private maxSize = 1000;
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes
  private hits = 0;
  private misses = 0;
  private evictions = 0;
  private cleanupInterval?: NodeJS.Timeout;
  private context?: vscode.ExtensionContext;

  /**
   *
   * @param logger
   */
  private constructor(logger: LoggerService) {
    this.logger = logger;
  }

  /**
   * Create the cache manager
   * @param logger
   */
  public static create(logger: LoggerService): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager(logger);
    }
    return CacheManager.instance;
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      throw new Error('CacheManager not created. Call create() first.');
    }
    return CacheManager.instance;
  }

  /**
   * Initialize with VS Code context
   * @param context
   */
  public initialize(context: vscode.ExtensionContext): void {
    this.context = context;
    this.startCleanup();
  }

  /**
   * Set a value in cache
   * @param key
   * @param value
   * @param ttl
   */
  public set<T>(key: string, value: T, ttl?: number): void {
    // Check cache size and evict if necessary
    if (this.memoryCache.size >= this.maxSize) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      accessCount: 0,
      lastAccess: Date.now(),
    };

    this.memoryCache.set(key, entry as CacheEntry<unknown>);
    this.logger.debug(`Cache set: ${key}`, { ttl: entry.ttl });
  }

  /**
   * Get a value from cache
   * @param key
   */
  public get<T>(key: string): T | undefined {
    const entry = this.memoryCache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      this.misses++;
      this.logger.debug(`Cache miss: ${key}`);
      return undefined;
    }

    // Check if expired
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.memoryCache.delete(key);
      this.misses++;
      this.logger.debug(`Cache expired: ${key}`);
      return undefined;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccess = Date.now();
    this.hits++;

    this.logger.debug(`Cache hit: ${key}`, { accessCount: entry.accessCount });
    return entry.value;
  }

  /**
   * Check if key exists in cache
   * @param key
   */
  public has(key: string): boolean {
    const entry = this.memoryCache.get(key);
    if (!entry) {
      return false;
    }

    // Check if expired
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.memoryCache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a value from cache
   * @param key
   */
  public delete(key: string): boolean {
    const deleted = this.memoryCache.delete(key);
    if (deleted) {
      this.logger.debug(`Cache deleted: ${key}`);
    }
    return deleted;
  }

  /**
   * Clear all cache
   */
  public clear(): void {
    this.memoryCache.clear();
    this.logger.info('Cache cleared');
  }

  /**
   * Clear by prefix
   * @param prefix
   */
  public clearByPrefix(prefix: string): void {
    let count = 0;
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.memoryCache.delete(key);
        count++;
      }
    }
    this.logger.info(`Cleared ${count} cache entries with prefix: ${prefix}`);
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | undefined;
    let lruAccess = Number.MAX_SAFE_INTEGER;

    for (const [key, entry] of this.memoryCache) {
      if (entry.lastAccess < lruAccess) {
        lruAccess = entry.lastAccess;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.memoryCache.delete(lruKey);
      this.evictions++;
      this.logger.debug(`Evicted LRU entry: ${lruKey}`);
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Every minute
  }

  /**
   * Stop cleanup interval
   */
  private stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      delete this.cleanupInterval;
    }
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.memoryCache) {
      if (entry.ttl && now - entry.timestamp > entry.ttl) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired cache entries`);
    }
  }

  /**
   * Get statistics
   */
  public getStatistics(): CacheStatistics {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? this.hits / total : 0;

    return {
      size: this.memoryCache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate,
      evictions: this.evictions,
    };
  }

  /**
   * Set value in persistent cache
   * @param key
   * @param value
   */
  public async setPersistent<T>(key: string, value: T): Promise<void> {
    if (!this.context) {
      this.logger.warn('Cannot set persistent cache: context not initialized');
      return;
    }

    await this.context.globalState.update(key, value);
    this.logger.debug(`Persistent cache set: ${key}`);
  }

  /**
   * Get value from persistent cache
   * @param key
   * @param defaultValue
   */
  public getPersistent<T>(key: string, defaultValue: T): T;
  public getPersistent<T>(key: string): T | undefined;
  public getPersistent<T>(key: string, defaultValue?: T): T | undefined {
    if (!this.context) {
      this.logger.warn('Cannot get persistent cache: context not initialized');
      return defaultValue;
    }

    return defaultValue !== undefined
      ? this.context.globalState.get<T>(key, defaultValue)
      : this.context.globalState.get<T>(key);
  }

  /**
   * Delete from persistent cache
   * @param key
   */
  public async deletePersistent(key: string): Promise<void> {
    if (!this.context) {
      return;
    }

    await this.context.globalState.update(key, undefined);
    this.logger.debug(`Persistent cache deleted: ${key}`);
  }

  /**
   * Get all cache keys
   */
  public getKeys(): string[] {
    return [...this.memoryCache.keys()];
  }

  /**
   * Get cache entry info
   * @param key
   */
  public getEntryInfo(key: string): {
    exists: boolean;
    age?: number;
    ttl?: number;
    accessCount?: number;
    lastAccess?: number;
  } {
    const entry = this.memoryCache.get(key);
    if (!entry) {
      return { exists: false };
    }

    return {
      exists: true,
      age: Date.now() - entry.timestamp,
      ...(entry.ttl !== undefined ? { ttl: entry.ttl } : {}),
      ...(entry.accessCount !== undefined ? { accessCount: entry.accessCount } : {}),
      ...(entry.lastAccess !== undefined ? { lastAccess: entry.lastAccess } : {}),
    };
  }

  /**
   * Set max cache size
   * @param size
   */
  public setMaxSize(size: number): void {
    this.maxSize = size;
    this.logger.info(`Cache max size set to: ${size}`);

    // Evict if necessary
    while (this.memoryCache.size > this.maxSize) {
      this.evictLRU();
    }
  }

  /**
   * Set default TTL
   * @param ttl
   */
  public setDefaultTTL(ttl: number): void {
    this.defaultTTL = ttl;
    this.logger.info(`Cache default TTL set to: ${ttl}ms`);
  }

  /**
   * Dispose the cache manager
   * PERFORMANCE: Properly cleans up all resources to prevent memory leaks
   */
  public dispose(): void {
    this.stopCleanup();
    this.clear();

    // Reset singleton instance to prevent memory leaks
    if (CacheManager.instance === this) {
      CacheManager.instance = null as any;
    }
  }
}
