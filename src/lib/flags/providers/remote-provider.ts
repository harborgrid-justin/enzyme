/**
 * @fileoverview Remote flag provider for fetching flags from an API.
 *
 * Provides flag fetching from remote servers with:
 * - Configurable endpoints
 * - Authentication support
 * - Retry logic with exponential backoff
 * - Context-aware requests
 * - Response transformation
 *
 * @module flags/providers/remote-provider
 *
 * @example
 * ```typescript
 * const provider = new RemoteProvider({
 *   endpoint: 'https://api.example.com/flags',
 *   apiKey: 'your-api-key',
 *   retry: {
 *     maxAttempts: 3,
 *     baseDelay: 1000,
 *   },
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
  EvaluationContext,
} from '../advanced/types';
import type {
  FlagProvider,
  RemoteProviderConfig,
  FlagChangeListener,
  FlagChangeEvent,
  ProviderHealth,
  ProviderStats,
  RetryConfig,
} from './types';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_TIMEOUT = 10000; // 10 seconds
const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryStatusCodes: [408, 429, 500, 502, 503, 504],
};

// ============================================================================
// Remote Provider
// ============================================================================

/**
 * Remote flag provider that fetches flags from an API endpoint.
 */
export class RemoteProvider implements FlagProvider {
  readonly name: string;
  readonly priority: number;

  private flags = new Map<string, FeatureFlag>();
  private segments = new Map<SegmentId, Segment>();
  private listeners = new Set<FlagChangeListener>();
  private ready = false;
  private config: Required<Omit<RemoteProviderConfig, 'transform' | 'context'>> & {
    transform?: RemoteProviderConfig['transform'];
    context?: RemoteProviderConfig['context'];
  };
  private health: ProviderHealth = {
    healthy: false,
    consecutiveFailures: 0,
  };
  private stats: ProviderStats = {
    flagCount: 0,
    segmentCount: 0,
    requestCount: 0,
    errorCount: 0,
  };
  private abortController: AbortController | null = null;

  constructor(config: RemoteProviderConfig) {
    this.name = config.name ?? 'remote';
    this.priority = config.priority ?? 50;

    this.config = {
      name: this.name,
      priority: this.priority,
      debug: config.debug ?? false,
      endpoint: config.endpoint,
      apiKey: config.apiKey ?? '',
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
      headers: config.headers ?? {},
      retry: { ...DEFAULT_RETRY_CONFIG, ...config.retry },
      transform: config.transform,
      context: config.context,
    };
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initialize the provider by fetching initial flags.
   */
  async initialize(): Promise<void> {
    this.log('Initializing remote provider');

    try {
      await this.fetchFlags();
      this.ready = true;
      this.log(`Initialized with ${this.flags.size} flags`);
    } catch (error) {
      this.log('Failed to initialize:', error);
      // Don't throw - allow graceful degradation
      this.ready = true;
    }
  }

  // ==========================================================================
  // Flag Operations
  // ==========================================================================

  /**
   * Get all flags.
   */
  async getFlags(): Promise<readonly FeatureFlag[]> {
    return Array.from(this.flags.values());
  }

  /**
   * Get a flag by key.
   */
  async getFlag(key: string): Promise<FeatureFlag | null> {
    // Try local cache first
    const cached = this.flags.get(key);
    if (cached) {
      return cached;
    }

    // Optionally fetch single flag from API
    try {
      const flag = await this.fetchSingleFlag(key);
      if (flag) {
        this.flags.set(key, flag);
        this.updateStats();
      }
      return flag;
    } catch {
      return null;
    }
  }

  /**
   * Refresh flags from the remote server.
   */
  async refresh(): Promise<void> {
    const previousFlags = new Map(this.flags);
    await this.fetchFlags();

    // Detect changes
    const changes: FlagChangeEvent[] = [];
    for (const [key, flag] of this.flags) {
      const previous = previousFlags.get(key);
      if (!previous) {
        changes.push({
          type: 'added',
          flagKey: key,
          newFlag: flag,
          timestamp: new Date(),
          source: this.name,
        });
      } else if (JSON.stringify(previous) !== JSON.stringify(flag)) {
        changes.push({
          type: 'updated',
          flagKey: key,
          previousFlag: previous,
          newFlag: flag,
          timestamp: new Date(),
          source: this.name,
        });
      }
    }

    for (const [key, previous] of previousFlags) {
      if (!this.flags.has(key)) {
        changes.push({
          type: 'deleted',
          flagKey: key,
          previousFlag: previous,
          timestamp: new Date(),
          source: this.name,
        });
      }
    }

    // Emit changes
    for (const event of changes) {
      this.emitChange(event);
    }

    if (changes.length > 0) {
      this.log(`Detected ${changes.length} flag changes`);
    }
  }

  // ==========================================================================
  // Segment Operations
  // ==========================================================================

  /**
   * Get all segments.
   */
  async getSegments(): Promise<readonly Segment[]> {
    return Array.from(this.segments.values());
  }

  /**
   * Get a segment by ID.
   */
  async getSegment(id: SegmentId): Promise<Segment | null> {
    return this.segments.get(id) ?? null;
  }

  // ==========================================================================
  // HTTP Operations
  // ==========================================================================

  private async fetchFlags(): Promise<void> {
    const url = this.buildUrl('/flags');
    const data = await this.request<unknown>(url);

    let flags: FeatureFlag[];
    if (this.config.transform) {
      flags = this.config.transform(data);
    } else if (Array.isArray(data)) {
      flags = data as FeatureFlag[];
    } else if (data && typeof data === 'object' && 'flags' in data) {
      flags = (data as { flags: FeatureFlag[] }).flags;
    } else {
      throw new Error('Invalid response format');
    }

    this.flags.clear();
    for (const flag of flags) {
      this.flags.set(flag.key, this.deserializeFlag(flag));
    }

    // Also fetch segments if available
    try {
      await this.fetchSegments();
    } catch {
      // Segments are optional
    }

    this.updateStats();
  }

  private async fetchSingleFlag(key: string): Promise<FeatureFlag | null> {
    try {
      const url = this.buildUrl(`/flags/${encodeURIComponent(key)}`);
      const data = await this.request<FeatureFlag>(url);
      return this.deserializeFlag(data);
    } catch {
      return null;
    }
  }

  private async fetchSegments(): Promise<void> {
    const url = this.buildUrl('/segments');
    const data = await this.request<Segment[] | { segments: Segment[] }>(url);

    const segments = Array.isArray(data) ? data : data.segments;

    this.segments.clear();
    for (const segment of segments) {
      this.segments.set(segment.id, this.deserializeSegment(segment));
    }
  }

  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    const { retry } = this.config;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < (retry.maxAttempts ?? 3); attempt++) {
      try {
        this.abortController = new AbortController();
        const timeoutId = setTimeout(
          () => this.abortController?.abort(),
          this.config.timeout
        );

        const response = await fetch(url, {
          ...options,
          headers: this.buildHeaders(),
          signal: this.abortController.signal,
        });

        clearTimeout(timeoutId);
        this.stats = { ...this.stats, requestCount: this.stats.requestCount + 1 };

        if (!response.ok) {
          if (retry.retryStatusCodes?.includes(response.status)) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        this.recordSuccess();
        return data as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.recordFailure(lastError.message);

        if (attempt < (retry.maxAttempts ?? 3) - 1) {
          const delay = Math.min(
            (retry.baseDelay ?? 1000) * Math.pow(retry.backoffMultiplier ?? 2, attempt),
            retry.maxDelay ?? 30000
          );
          this.log(`Retry ${attempt + 1}/${retry.maxAttempts} in ${delay}ms`);
          await this.sleep(delay);
        }
      }
    }

    throw lastError ?? new Error('Request failed');
  }

  private buildUrl(path: string): string {
    const base = this.config.endpoint.replace(/\/$/, '');
    const contextParams = this.buildContextParams();
    const url = new URL(`${base}${path}`);

    for (const [key, value] of Object.entries(contextParams)) {
      url.searchParams.set(key, value);
    }

    return url.toString();
  }

  private buildHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...this.config.headers,
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }

  private buildContextParams(): Record<string, string> {
    const params: Record<string, string> = {};
    const ctx = this.config.context;

    if (ctx?.user?.id) {
      params['userId'] = ctx.user.id;
    }
    if (ctx?.application?.environment) {
      params['environment'] = ctx.application.environment;
    }
    if (ctx?.application?.version) {
      params['version'] = ctx.application.version;
    }

    return params;
  }

  private deserializeFlag(flag: FeatureFlag): FeatureFlag {
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
  // Health Tracking
  // ==========================================================================

  private recordSuccess(): void {
    this.health = {
      healthy: true,
      lastSuccess: new Date(),
      consecutiveFailures: 0,
    };
  }

  private recordFailure(message: string): void {
    this.health = {
      healthy: false,
      lastError: new Date(),
      lastErrorMessage: message,
      consecutiveFailures: this.health.consecutiveFailures + 1,
      lastSuccess: this.health.lastSuccess,
    };
    this.stats = { ...this.stats, errorCount: this.stats.errorCount + 1 };
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
  async isHealthy(): Promise<boolean> {
    return this.health.healthy;
  }

  /**
   * Get provider health status.
   */
  getHealth(): ProviderHealth {
    return { ...this.health };
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
  async shutdown(): Promise<void> {
    this.abortController?.abort();
    this.ready = false;
    this.listeners.clear();
    this.log('Provider shutdown');
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

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      console.log(`[RemoteProvider] ${message}`, ...args);
    }
  }

  /**
   * Update the context for subsequent requests.
   */
  setContext(context: EvaluationContext): void {
    this.config.context = context;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a remote provider instance.
 */
export function createRemoteProvider(
  config: RemoteProviderConfig
): RemoteProvider {
  return new RemoteProvider(config);
}
