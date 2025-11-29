/**
 * @fileoverview Polling provider for periodic flag updates.
 *
 * Wraps another provider and polls for updates at configurable intervals.
 * Features:
 * - Configurable polling interval
 * - Visibility-aware polling (pause when hidden)
 * - Jitter to prevent thundering herd
 * - Automatic failure handling
 *
 * @module flags/providers/polling-provider
 *
 * @example
 * ```typescript
 * const remoteProvider = new RemoteProvider({ endpoint: '...' });
 * const pollingProvider = new PollingProvider({
 *   provider: remoteProvider,
 *   interval: 30000, // 30 seconds
 *   pauseWhenHidden: true,
 *   jitter: 0.1, // 10% jitter
 * });
 *
 * await pollingProvider.initialize();
 * pollingProvider.startPolling();
 * ```
 */

import type {
  FeatureFlag,
  Segment,
  SegmentId,
} from '../advanced/types';
import type {
  FlagProvider,
  PollingProviderConfig,
  FlagChangeListener,
  FlagChangeEvent,
  ProviderStats,
} from './types';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_INTERVAL = 60000; // 1 minute
const DEFAULT_MAX_FAILURES = 5;
const DEFAULT_JITTER = 0.1; // 10%

// ============================================================================
// Polling Provider
// ============================================================================

/**
 * Polling wrapper that periodically refreshes flags from an underlying provider.
 */
export class PollingProvider implements FlagProvider {
  readonly name: string;
  readonly priority: number;

  private provider: FlagProvider;
  private listeners = new Set<FlagChangeListener>();
  private ready = false;
  private config: Required<Omit<PollingProviderConfig, 'provider'>> & {
    provider: FlagProvider;
  };
  private pollingTimer: ReturnType<typeof setTimeout> | null = null;
  private isPolling = false;
  private consecutiveFailures = 0;
  private lastPollTime: Date | null = null;
  private cachedFlags: FeatureFlag[] = [];
  private cachedSegments: Segment[] = [];
  private visibilityHandler: (() => void) | null = null;
  private isPaused = false;

  constructor(config: PollingProviderConfig) {
    this.name = config.name ?? `polling-${config.provider.name}`;
    this.priority = config.priority ?? config.provider.priority;

    this.config = {
      name: this.name,
      priority: this.priority,
      debug: config.debug ?? false,
      provider: config.provider,
      interval: config.interval ?? DEFAULT_INTERVAL,
      pauseWhenHidden: config.pauseWhenHidden ?? true,
      jitter: config.jitter ?? DEFAULT_JITTER,
      maxFailures: config.maxFailures ?? DEFAULT_MAX_FAILURES,
    };

    this.provider = config.provider;
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initialize the provider.
   */
  async initialize(): Promise<void> {
    this.log('Initializing polling provider');

    // Initialize underlying provider
    await this.provider.initialize();

    // Initial fetch
    await this.poll();

    // Setup visibility handling
    if (this.config.pauseWhenHidden && typeof document !== 'undefined') {
      this.setupVisibilityHandler();
    }

    this.ready = true;
    this.log('Polling provider initialized');
  }

  // ==========================================================================
  // Polling Control
  // ==========================================================================

  /**
   * Start polling for updates.
   */
  startPolling(): void {
    if (this.isPolling) {
      return;
    }

    this.isPolling = true;
    this.scheduleNextPoll();
    this.log('Polling started');
  }

  /**
   * Stop polling.
   */
  stopPolling(): void {
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }
    this.isPolling = false;
    this.log('Polling stopped');
  }

  /**
   * Pause polling (e.g., when page is hidden).
   */
  pausePolling(): void {
    if (!this.isPaused) {
      this.isPaused = true;
      if (this.pollingTimer) {
        clearTimeout(this.pollingTimer);
        this.pollingTimer = null;
      }
      this.log('Polling paused');
    }
  }

  /**
   * Resume polling.
   */
  resumePolling(): void {
    if (this.isPaused && this.isPolling) {
      this.isPaused = false;
      this.scheduleNextPoll();
      this.log('Polling resumed');
    }
  }

  /**
   * Trigger an immediate poll.
   */
  async pollNow(): Promise<void> {
    await this.poll();
  }

  private scheduleNextPoll(): void {
    if (!this.isPolling || this.isPaused) {
      return;
    }

    // Apply jitter to prevent thundering herd
    const jitter = this.config.jitter * (Math.random() * 2 - 1);
    const interval = this.config.interval * (1 + jitter);

    this.pollingTimer = setTimeout(() => {
      void this.poll().finally(() => {
        this.scheduleNextPoll();
      });
    }, interval);
  }

  private async poll(): Promise<void> {
    this.log('Polling for updates...');

    try {
      const previousFlags = [...this.cachedFlags];
      const newFlags = await this.provider.getFlags();
      this.cachedFlags = [...newFlags];

      // Also fetch segments if available
      if (this.provider.getSegments) {
        const segments = await this.provider.getSegments();
        this.cachedSegments = [...segments];
      }

      this.lastPollTime = new Date();
      this.consecutiveFailures = 0;

      // Detect and emit changes
      this.detectChanges(previousFlags, this.cachedFlags);

      this.log(`Poll complete: ${this.cachedFlags.length} flags`);
    } catch (error) {
      this.consecutiveFailures++;
      this.log(`Poll failed (${this.consecutiveFailures}/${this.config.maxFailures}):`, error);

      // Stop polling after too many failures
      if (this.consecutiveFailures >= this.config.maxFailures) {
        this.log('Max failures reached, stopping polling');
        this.stopPolling();
      }
    }
  }

  private detectChanges(
    previousFlags: FeatureFlag[],
    newFlags: FeatureFlag[]
  ): void {
    const previousMap = new Map(previousFlags.map((f) => [f.key, f]));
    const newMap = new Map(newFlags.map((f) => [f.key, f]));

    // Detect additions and updates
    for (const [key, flag] of newMap) {
      const previous = previousMap.get(key);
      if (!previous) {
        this.emitChange({
          type: 'added',
          flagKey: key,
          newFlag: flag,
          timestamp: new Date(),
          source: this.name,
        });
      } else if (JSON.stringify(previous) !== JSON.stringify(flag)) {
        this.emitChange({
          type: 'updated',
          flagKey: key,
          previousFlag: previous,
          newFlag: flag,
          timestamp: new Date(),
          source: this.name,
        });
      }
    }

    // Detect deletions
    for (const [key, previous] of previousMap) {
      if (!newMap.has(key)) {
        this.emitChange({
          type: 'deleted',
          flagKey: key,
          previousFlag: previous,
          timestamp: new Date(),
          source: this.name,
        });
      }
    }
  }

  // ==========================================================================
  // Visibility Handling
  // ==========================================================================

  private setupVisibilityHandler(): void {
    this.visibilityHandler = (): void => {
      if (document.hidden) {
        this.pausePolling();
      } else {
        this.resumePolling();
      }
    };

    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  private removeVisibilityHandler(): void {
    if (this.visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }

  // ==========================================================================
  // Flag Operations
  // ==========================================================================

  /**
   * Get all flags.
   */
  async getFlags(): Promise<readonly FeatureFlag[]> {
    return Promise.resolve(this.cachedFlags);
  }

  /**
   * Get a flag by key.
   */
  async getFlag(key: string): Promise<FeatureFlag | null> {
    return Promise.resolve(this.cachedFlags.find((f) => f.key === key) ?? null);
  }

  // ==========================================================================
  // Segment Operations
  // ==========================================================================

  /**
   * Get all segments.
   */
  async getSegments(): Promise<readonly Segment[]> {
    return Promise.resolve(this.cachedSegments);
  }

  /**
   * Get a segment by ID.
   */
  getSegment(id: SegmentId): Promise<Segment | null> {
    return Promise.resolve(this.cachedSegments.find((s) => s.id === id) ?? null);
  }

  // ==========================================================================
  // Status and Health
  // ==========================================================================

  /**
   * Check if the provider is ready.
   */
  isReady(): boolean {
    return this.ready && this.provider.isReady();
  }

  /**
   * Check if the provider is healthy.
   */
  async isHealthy(): boolean {
    return (
      this.consecutiveFailures < this.config.maxFailures &&
      (await this.provider.isHealthy())
    );
  }

  /**
   * Get polling status.
   */
  getPollingStatus(): {
    isPolling: boolean;
    isPaused: boolean;
    lastPollTime: Date | null;
    consecutiveFailures: number;
    interval: number;
  } {
    return {
      isPolling: this.isPolling,
      isPaused: this.isPaused,
      lastPollTime: this.lastPollTime,
      consecutiveFailures: this.consecutiveFailures,
      interval: this.config.interval,
    };
  }

  /**
   * Get provider statistics.
   */
  getStats(): ProviderStats {
    return {
      flagCount: this.cachedFlags.length,
      segmentCount: this.cachedSegments.length,
      requestCount: 0,
      errorCount: this.consecutiveFailures,
      lastRefresh: this.lastPollTime ?? undefined,
    };
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
  async shutdown(): Promise<void> {
    this.stopPolling();
    this.removeVisibilityHandler();
    await this.provider.shutdown();
    this.ready = false;
    this.listeners.clear();
    this.log('Polling provider shutdown');
  }

  // ==========================================================================
  // Configuration
  // ==========================================================================

  /**
   * Update the polling interval.
   */
  setInterval(interval: number): void {
    // Update config immutably
    this.config = { ...this.config, interval };
    if (this.isPolling) {
      this.stopPolling();
      this.startPolling();
    }
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      // eslint-disable-next-line no-console
      console.log(`[PollingProvider] ${message}`, ...args);
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a polling provider instance.
 */
export function createPollingProvider(
  config: PollingProviderConfig
): PollingProvider {
  return new PollingProvider(config);
}
