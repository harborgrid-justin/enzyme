/**
 * @fileoverview Composite provider that combines multiple flag providers.
 *
 * Supports various merge strategies:
 * - Priority-based (highest priority provider wins)
 * - Merge (combine flags from all providers)
 * - Override (later providers override earlier)
 *
 * @module flags/providers/composite-provider
 *
 * @example
 * ```typescript
 * const composite = new CompositeProvider({
 *   providers: [
 *     localProvider,  // Fallback
 *     remoteProvider, // Primary
 *   ],
 *   strategy: 'priority',
 *   fallback: 'first-available',
 * });
 *
 * await composite.initialize();
 * const flags = await composite.getFlags();
 * ```
 */

import type {
  FeatureFlag,
  Segment,
  SegmentId,
} from '../advanced/types';
import type {
  FlagProvider,
  CompositeProviderConfig,
  FlagChangeListener,
  FlagChangeEvent,
  ProviderStats,
} from './types';

// ============================================================================
// Composite Provider
// ============================================================================

/**
 * Composite provider that combines multiple flag providers.
 */
export class CompositeProvider implements FlagProvider {
  readonly name: string;
  readonly priority: number;

  private readonly providers: FlagProvider[];
  private listeners = new Set<FlagChangeListener>();
  private ready = false;
  private config: Required<CompositeProviderConfig>;
  private unsubscribes: Array<() => void> = [];

  constructor(config: CompositeProviderConfig) {
    this.name = config.name ?? 'composite';
    this.priority = config.priority ?? 0;

    this.config = {
      name: this.name,
      priority: this.priority,
      debug: config.debug ?? false,
      providers: config.providers,
      strategy: config.strategy ?? 'priority',
      fallback: config.fallback ?? 'first-available',
    };

    this.providers = [...config.providers].sort(
      (a, b) => a.priority - b.priority
    );
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initialize all providers.
   */
  async initialize(): Promise<void> {
    this.log('Initializing composite provider');

    if (this.config.fallback === 'all-must-succeed') {
      // All providers must initialize successfully
      await Promise.all(
        this.providers.map(async (p) => p.initialize())
      );
    } else {
      // At least one provider must succeed
      const results = await Promise.allSettled(
        this.providers.map(async (p) => p.initialize())
      );

      const hasSuccess = results.some((r) => r.status === 'fulfilled');
      if (!hasSuccess) {
        throw new Error('All providers failed to initialize');
      }
    }

    // Subscribe to all providers
    for (const provider of this.providers) {
      if (provider.subscribe) {
        const unsubscribe = provider.subscribe(
          this.handleProviderChange.bind(this)
        );
        this.unsubscribes.push(unsubscribe);
      }
    }

    this.ready = true;
    this.log(
      `Initialized with ${this.providers.length} providers`
    );
  }

  // ==========================================================================
  // Flag Operations
  // ==========================================================================

  /**
   * Get all flags from providers based on strategy.
   */
  async getFlags(): Promise<readonly FeatureFlag[]> {
    switch (this.config.strategy) {
      case 'priority':
        return this.getFlagsWithPriority();
      case 'merge':
        return this.getFlagsWithMerge();
      case 'override':
        return this.getFlagsWithOverride();
      default:
        return this.getFlagsWithPriority();
    }
  }

  /**
   * Get a specific flag.
   */
  async getFlag(key: string): Promise<FeatureFlag | null> {
    // Check providers in priority order
    for (const provider of this.providers) {
      if (!provider.isReady()) {
        continue;
      }

      try {
        const flag = await provider.getFlag(key);
        if (flag) {
          return flag;
        }
      } catch (error) {
        this.log(`Provider ${provider.name} failed for flag ${key}:`, error);
      }
    }

    return null;
  }

  /**
   * Get all segments from providers.
   */
  async getSegments(): Promise<readonly Segment[]> {
    const segmentMap = new Map<SegmentId, Segment>();

    for (const provider of this.providers) {
      if (!provider.isReady() || !provider.getSegments) {
        continue;
      }

      try {
        const segments = await provider.getSegments();
        for (const segment of segments) {
          if (!segmentMap.has(segment.id)) {
            segmentMap.set(segment.id, segment);
          }
        }
      } catch (error) {
        this.log(`Provider ${provider.name} failed for segments:`, error);
      }
    }

    return Array.from(segmentMap.values());
  }

  /**
   * Get a segment by ID.
   */
  async getSegment(id: SegmentId): Promise<Segment | null> {
    for (const provider of this.providers) {
      if (!provider.isReady() || !provider.getSegment) {
        continue;
      }

      try {
        const segment = await provider.getSegment(id);
        if (segment) {
          return segment;
        }
      } catch (error) {
        this.log(`Provider ${provider.name} failed for segment ${id}:`, error);
      }
    }

    return null;
  }

  /**
   * Add a provider.
   */
  addProvider(provider: FlagProvider): void {
    this.providers.push(provider);
    this.providers.sort((a, b) => a.priority - b.priority);

    if (provider.subscribe) {
      const unsubscribe = provider.subscribe(
        this.handleProviderChange.bind(this)
      );
      this.unsubscribes.push(unsubscribe);
    }

    this.log(`Added provider: ${provider.name}`);
  }

  // ==========================================================================
  // Segment Operations
  // ==========================================================================

  /**
   * Remove a provider.
   */
  removeProvider(name: string): void {
    const index = this.providers.findIndex((p) => p.name === name);
    if (index !== -1) {
      this.providers.splice(index, 1);
      this.log(`Removed provider: ${name}`);
    }
  }

  /**
   * Get all providers.
   */
  getProviders(): readonly FlagProvider[] {
    return [...this.providers];
  }

  // ==========================================================================
  // Provider Management
  // ==========================================================================

  /**
   * Get a provider by name.
   */
  getProvider(name: string): FlagProvider | undefined {
    return this.providers.find((p) => p.name === name);
  }

  /**
   * Check if the provider is ready.
   */
  isReady(): boolean {
    if (!this.ready) {
      return false;
    }

    if (this.config.fallback === 'all-must-succeed') {
      return this.providers.every((p) => p.isReady());
    }

    return this.providers.some((p) => p.isReady());
  }

  /**
   * Check if the provider is healthy.
   */
  async isHealthy(): Promise<boolean> {
    if (this.config.fallback === 'all-must-succeed') {
      const results = await Promise.all(
        this.providers.map(async (p) => p.isHealthy())
      );
      return results.every(Boolean);
    }

    const results = await Promise.all(
      this.providers.map(async (p) => p.isHealthy())
    );
    return results.some(Boolean);
  }

  /**
   * Get health status for all providers.
   */
  async getProviderHealths(): Promise<Map<string, boolean>> {
    const healths = new Map<string, boolean>();

    await Promise.all(
      this.providers.map(async (p) => {
        const healthy = await p.isHealthy();
        healths.set(p.name, healthy);
      })
    );

    return healths;
  }

  // ==========================================================================
  // Provider Change Handling
  // ==========================================================================

  /**
   * Get aggregate statistics.
   */
  getStats(): ProviderStats {
    let flagCount = 0;
    let segmentCount = 0;

    // Use stats from highest priority ready provider
    for (const provider of this.providers) {
      if (provider.isReady()) {
        // This is a simplified approach - in practice you might want
        // to aggregate or pick based on strategy
        flagCount = Math.max(flagCount, 0);
        segmentCount = Math.max(segmentCount, 0);
        break;
      }
    }

    return {
      flagCount,
      segmentCount,
      requestCount: 0,
      errorCount: 0,
    };
  }

  // ==========================================================================
  // Status and Health
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
   * Shutdown the provider and all child providers.
   */
  async shutdown(): Promise<void> {
    // Unsubscribe from all providers
    for (const unsubscribe of this.unsubscribes) {
      unsubscribe();
    }
    this.unsubscribes = [];

    // Shutdown all providers
    await Promise.all(
      this.providers.map(async (p) => p.shutdown())
    );

    this.ready = false;
    this.listeners.clear();
    this.log('Composite provider shutdown');
  }

  private async getFlagsWithPriority(): Promise<FeatureFlag[]> {
    // Return flags from the first available (highest priority) provider
    for (const provider of this.providers) {
      if (!provider.isReady()) {
        continue;
      }

      try {
        const flags = await provider.getFlags();
        if (flags.length > 0) {
          this.log(`Using flags from provider: ${provider.name}`);
          return [...flags];
        }
      } catch (error) {
        this.log(`Provider ${provider.name} failed:`, error);
      }
    }

    return [];
  }

  private async getFlagsWithMerge(): Promise<FeatureFlag[]> {
    // Combine flags from all providers (higher priority wins on conflicts)
    const flagMap = new Map<string, FeatureFlag>();

    // Process in reverse order so higher priority overwrites
    for (const provider of [...this.providers].reverse()) {
      if (!provider.isReady()) {
        continue;
      }

      try {
        const flags = await provider.getFlags();
        for (const flag of flags) {
          flagMap.set(flag.key, flag);
        }
      } catch (error) {
        this.log(`Provider ${provider.name} failed:`, error);
        if (this.config.fallback === 'all-must-succeed') {
          throw error;
        }
      }
    }

    return Array.from(flagMap.values());
  }

  // ==========================================================================
  // Subscription
  // ==========================================================================

  private async getFlagsWithOverride(): Promise<FeatureFlag[]> {
    // Start with empty, each provider overrides
    const flagMap = new Map<string, FeatureFlag>();

    for (const provider of this.providers) {
      if (!provider.isReady()) {
        continue;
      }

      try {
        const flags = await provider.getFlags();
        for (const flag of flags) {
          flagMap.set(flag.key, flag);
        }
      } catch (error) {
        this.log(`Provider ${provider.name} failed:`, error);
        if (this.config.fallback === 'all-must-succeed') {
          throw error;
        }
      }
    }

    return Array.from(flagMap.values());
  }

  private handleProviderChange(event: FlagChangeEvent): void {
    // Forward to listeners
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
      console.log(`[CompositeProvider] ${message}`, ...args);
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a composite provider instance.
 */
export function createCompositeProvider(
  config: CompositeProviderConfig
): CompositeProvider {
  return new CompositeProvider(config);
}
