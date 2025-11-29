/**
 * @fileoverview Local/static flag provider for client-side flag management.
 *
 * Provides in-memory flag storage with optional localStorage persistence.
 * Ideal for:
 * - Development and testing
 * - Offline-first applications
 * - Static flag configurations
 * - Feature flag overrides
 *
 * @module flags/providers/local-provider
 *
 * @example
 * ```typescript
 * const provider = new LocalProvider({
 *   flags: initialFlags,
 *   persistToStorage: true,
 *   storageKey: 'my-app-flags',
 * });
 *
 * await provider.initialize();
 * const flags = await provider.getFlags();
 * ```
 */

import type {
  FeatureFlag,
  Segment,
  SegmentId,
} from '../advanced/types';
import type {
  WritableFlagProvider,
  LocalProviderConfig,
  FlagChangeListener,
  FlagChangeEvent,
  ProviderHealth,
  ProviderStats,
} from './types';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_STORAGE_KEY = 'feature-flags';
// Unused constant removed: DEFAULT_SEGMENTS_STORAGE_KEY

// ============================================================================
// Local Provider
// ============================================================================

/**
 * Local/in-memory flag provider with optional persistence.
 */
export class LocalProvider implements WritableFlagProvider {
  readonly name: string;
  readonly priority: number;

  private flags = new Map<string, FeatureFlag>();
  private segments = new Map<SegmentId, Segment>();
  private listeners = new Set<FlagChangeListener>();
  private ready = false;
  private config: Required<LocalProviderConfig>;
  private stats: ProviderStats = {
    flagCount: 0,
    segmentCount: 0,
    requestCount: 0,
    errorCount: 0,
  };

  constructor(config: LocalProviderConfig = {}) {
    this.name = config.name ?? 'local';
    this.priority = config.priority ?? 100;

    this.config = {
      name: this.name,
      priority: this.priority,
      debug: config.debug ?? false,
      flags: config.flags ?? [],
      segments: config.segments ?? [],
      persistToStorage: config.persistToStorage ?? false,
      storageKey: config.storageKey ?? DEFAULT_STORAGE_KEY,
    };
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initialize the provider.
   */
  async initialize(): Promise<void> {
    this.log('Initializing local provider');

    // Load from storage if enabled
    if (this.config.persistToStorage) {
      await this.loadFromStorage();
    }

    // Load initial flags (override storage)
    for (const flag of this.config.flags) {
      this.flags.set(flag.key, flag);
    }

    // Load initial segments
    for (const segment of this.config.segments) {
      this.segments.set(segment.id, segment);
    }

    this.updateStats();
    this.ready = true;
    this.log(`Initialized with ${this.flags.size} flags and ${this.segments.size} segments`);
  }

  // ==========================================================================
  // Flag Operations
  // ==========================================================================

  /**
   * Get all flags.
   */
  getFlags(): Promise<readonly FeatureFlag[]> {
    this.stats = { ...this.stats, requestCount: this.stats.requestCount + 1 };
    return Promise.resolve(Array.from(this.flags.values()));
  }

  /**
   * Get a flag by key.
   */
  getFlag(key: string): Promise<FeatureFlag | null> {
    this.stats = { ...this.stats, requestCount: this.stats.requestCount + 1 };
    return Promise.resolve(this.flags.get(key) ?? null);
  }

  /**
   * Update or add a flag.
   */
  async updateFlag(flag: FeatureFlag): Promise<void> {
    const existing = this.flags.get(flag.key);
    const isNew = !existing;

    this.flags.set(flag.key, flag);
    this.updateStats();

    if (this.config.persistToStorage) {
      await this.saveToStorage();
    }

    this.emitChange({
      type: isNew ? 'added' : 'updated',
      flagKey: flag.key,
      previousFlag: existing,
      newFlag: flag,
      timestamp: new Date(),
      source: this.name,
    });

    this.log(`Flag ${isNew ? 'added' : 'updated'}: ${flag.key}`);
  }

  /**
   * Delete a flag.
   */
  async deleteFlag(key: string): Promise<void> {
    const existing = this.flags.get(key);
    if (!existing) {
      return;
    }

    this.flags.delete(key);
    this.updateStats();

    if (this.config.persistToStorage) {
      await this.saveToStorage();
    }

    this.emitChange({
      type: 'deleted',
      flagKey: key,
      previousFlag: existing,
      timestamp: new Date(),
      source: this.name,
    });

    this.log(`Flag deleted: ${key}`);
  }

  /**
   * Set multiple flags at once.
   */
  async setFlags(flags: readonly FeatureFlag[]): Promise<void> {
    this.flags.clear();
    for (const flag of flags) {
      this.flags.set(flag.key, flag);
    }
    this.updateStats();

    if (this.config.persistToStorage) {
      await this.saveToStorage();
    }

    this.emitChange({
      type: 'refreshed',
      timestamp: new Date(),
      source: this.name,
    });

    this.log(`Set ${flags.length} flags`);
  }

  // ==========================================================================
  // Segment Operations
  // ==========================================================================

  /**
   * Get all segments.
   */
  getSegments(): Promise<readonly Segment[]> {
    return Promise.resolve(Array.from(this.segments.values()));
  }

  /**
   * Get a segment by ID.
   */
  getSegment(id: SegmentId): Promise<Segment | null> {
    return Promise.resolve(this.segments.get(id) ?? null);
  }

  /**
   * Update or add a segment.
   */
  async updateSegment(segment: Segment): Promise<void> {
    this.segments.set(segment.id, segment);
    this.updateStats();

    if (this.config.persistToStorage) {
      await this.saveSegmentsToStorage();
    }

    this.log(`Segment updated: ${segment.id}`);
  }

  /**
   * Delete a segment.
   */
  async deleteSegment(id: SegmentId): Promise<void> {
    this.segments.delete(id);
    this.updateStats();

    if (this.config.persistToStorage) {
      await this.saveSegmentsToStorage();
    }

    this.log(`Segment deleted: ${id}`);
  }

  // ==========================================================================
  // Storage Operations
  // ==========================================================================

  private loadFromStorage(): void {
    if (typeof window === 'undefined' || window.localStorage === null || window.localStorage === undefined) {
      return;
    }

    try {
      // Load flags
      const flagsJson = localStorage.getItem(this.config.storageKey);
      if (flagsJson !== null && flagsJson !== '') {
        const flags = JSON.parse(flagsJson) as FeatureFlag[];
        for (const flag of flags) {
          this.flags.set(flag.key, this.deserializeFlag(flag));
        }
        this.log(`Loaded ${flags.length} flags from storage`);
      }

      // Load segments
      const segmentsJson = localStorage.getItem(
        `${this.config.storageKey}-segments`
      );
      if (segmentsJson !== null && segmentsJson !== '') {
        const segments = JSON.parse(segmentsJson) as Segment[];
        for (const segment of segments) {
          this.segments.set(segment.id, this.deserializeSegment(segment));
        }
        this.log(`Loaded ${segments.length} segments from storage`);
      }
    } catch (error) {
      this.log('Error loading from storage:', error);
      this.stats = { ...this.stats, errorCount: this.stats.errorCount + 1 };
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined' || window.localStorage === null || window.localStorage === undefined) {
      return;
    }

    try {
      const flags = Array.from(this.flags.values());
      localStorage.setItem(this.config.storageKey, JSON.stringify(flags));
      this.log(`Saved ${flags.length} flags to storage`);
    } catch (error) {
      this.log('Error saving to storage:', error);
      this.stats = { ...this.stats, errorCount: this.stats.errorCount + 1 };
    }
  }

  private saveSegmentsToStorage(): void {
    if (typeof window === 'undefined' || window.localStorage === null || window.localStorage === undefined) {
      return;
    }

    try {
      const segments = Array.from(this.segments.values());
      localStorage.setItem(
        `${this.config.storageKey}-segments`,
        JSON.stringify(segments)
      );
    } catch (error) {
      this.log('Error saving segments to storage:', error);
    }
  }

  private deserializeFlag(flag: FeatureFlag): FeatureFlag {
    // Convert date strings back to Date objects
    return {
      ...flag,
      lifecycle: {
        ...flag.lifecycle,
        createdAt: new Date(flag.lifecycle.createdAt),
        updatedAt: new Date(flag.lifecycle.updatedAt),
        activatedAt: flag.lifecycle.activatedAt
          ? new Date(flag.lifecycle.activatedAt)
          : undefined,
        deprecationDate: flag.lifecycle.deprecationDate
          ? new Date(flag.lifecycle.deprecationDate)
          : undefined,
        removalDate: flag.lifecycle.removalDate
          ? new Date(flag.lifecycle.removalDate)
          : undefined,
        reviewDate: flag.lifecycle.reviewDate
          ? new Date(flag.lifecycle.reviewDate)
          : undefined,
      },
    };
  }

  private deserializeSegment(segment: Segment): Segment {
    return {
      ...segment,
      updatedAt: new Date(segment.updatedAt),
    };
  }

  // ==========================================================================
  // Status and Health
  // ==========================================================================

  /**
   * Check if the provider is ready.
   */
  isReady(): boolean {
    return this.ready;
  }

  /**
   * Check if the provider is healthy.
   */
  isHealthy(): Promise<boolean> {
    return Promise.resolve(this.ready);
  }

  /**
   * Get provider health status.
   */
  getHealth(): ProviderHealth {
    return {
      healthy: this.ready,
      consecutiveFailures: 0,
    };
  }

  /**
   * Get provider statistics.
   */
  getStats(): ProviderStats {
    return { ...this.stats };
  }

  // ==========================================================================
  // Subscription
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
  // Shutdown
  // ==========================================================================

  /**
   * Shutdown the provider.
   */
  shutdown(): Promise<void> {
    this.ready = false;
    this.listeners.clear();
    this.log('Provider shutdown');
    return Promise.resolve();
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  private updateStats(): void {
    this.stats = {
      ...this.stats,
      flagCount: this.flags.size,
      segmentCount: this.segments.size,
      lastRefresh: new Date(),
    };
  }

  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      // eslint-disable-next-line no-console
      console.log(`[LocalProvider] ${message}`, ...args);
    }
  }

  /**
   * Clear all flags and segments.
   */
  clear(): Promise<void> {
    this.flags.clear();
    this.segments.clear();
    this.updateStats();

    if (this.config.persistToStorage && typeof window !== 'undefined') {
      localStorage.removeItem(this.config.storageKey);
      localStorage.removeItem(`${this.config.storageKey}-segments`);
    }

    this.emitChange({
      type: 'refreshed',
      timestamp: new Date(),
      source: this.name,
    });

    this.log('All flags and segments cleared');
    return Promise.resolve();
  }

  /**
   * Export all data for backup.
   */
  export(): { flags: FeatureFlag[]; segments: Segment[] } {
    return {
      flags: Array.from(this.flags.values()),
      segments: Array.from(this.segments.values()),
    };
  }

  /**
   * Import data from backup.
   */
  async import(data: { flags?: FeatureFlag[]; segments?: Segment[] }): Promise<void> {
    if (data.flags) {
      for (const flag of data.flags) {
        this.flags.set(flag.key, flag);
      }
    }

    if (data.segments) {
      for (const segment of data.segments) {
        this.segments.set(segment.id, segment);
      }
    }

    this.updateStats();

    if (this.config.persistToStorage) {
      await this.saveToStorage();
      await this.saveSegmentsToStorage();
    }

    this.emitChange({
      type: 'refreshed',
      timestamp: new Date(),
      source: this.name,
    });

    this.log(`Imported ${data.flags?.length ?? 0} flags and ${data.segments?.length ?? 0} segments`);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a local provider instance.
 */
export function createLocalProvider(
  config?: LocalProviderConfig
): LocalProvider {
  return new LocalProvider(config);
}
