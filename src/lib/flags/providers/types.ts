/**
 * @fileoverview Type definitions for feature flag providers.
 *
 * Defines the provider interface and related types for flag data sources.
 *
 * @module flags/providers/types
 */

import type { FeatureFlag, Segment, SegmentId, EvaluationContext } from '../advanced/types';

// ============================================================================
// Provider Interface
// ============================================================================

/**
 * Base interface for all flag providers.
 */
export interface FlagProvider {
  /** Provider name for identification */
  readonly name: string;

  /** Provider priority (lower = higher priority) */
  readonly priority: number;

  /**
   * Initialize the provider.
   */
  initialize(): Promise<void>;

  /**
   * Get all flags from this provider.
   */
  getFlags(): Promise<readonly FeatureFlag[]>;

  /**
   * Get a specific flag by key.
   */
  getFlag(key: string): Promise<FeatureFlag | null>;

  /**
   * Get all segments from this provider.
   */
  getSegments?(): Promise<readonly Segment[]>;

  /**
   * Get a specific segment by ID.
   */
  getSegment?(id: SegmentId): Promise<Segment | null>;

  /**
   * Check if the provider is ready.
   */
  isReady(): boolean;

  /**
   * Check if the provider is healthy.
   */
  isHealthy(): Promise<boolean>;

  /**
   * Shutdown the provider.
   */
  shutdown(): Promise<void>;

  /**
   * Subscribe to flag changes.
   */
  subscribe?(listener: FlagChangeListener): () => void;
}

/**
 * Writable flag provider that supports updates.
 */
export interface WritableFlagProvider extends FlagProvider {
  /**
   * Update a flag.
   */
  updateFlag(flag: FeatureFlag): Promise<void>;

  /**
   * Delete a flag.
   */
  deleteFlag(key: string): Promise<void>;

  /**
   * Update a segment.
   */
  updateSegment?(segment: Segment): Promise<void>;

  /**
   * Delete a segment.
   */
  deleteSegment?(id: SegmentId): Promise<void>;
}

// ============================================================================
// Provider Events
// ============================================================================

/**
 * Flag change event types.
 */
export type FlagChangeType = 'added' | 'updated' | 'deleted' | 'refreshed';

/**
 * Flag change event.
 */
export interface FlagChangeEvent {
  /** Type of change */
  readonly type: FlagChangeType;
  /** Affected flag key */
  readonly flagKey?: string;
  /** Previous flag state */
  readonly previousFlag?: FeatureFlag;
  /** New flag state */
  readonly newFlag?: FeatureFlag;
  /** Timestamp of change */
  readonly timestamp: Date;
  /** Source provider */
  readonly source: string;
}

/**
 * Listener for flag changes.
 */
export type FlagChangeListener = (event: FlagChangeEvent) => void;

// ============================================================================
// Provider Configuration
// ============================================================================

/**
 * Base configuration for providers.
 */
export interface BaseProviderConfig {
  /** Provider name */
  readonly name?: string;
  /** Provider priority */
  readonly priority?: number;
  /** Enable debug logging */
  readonly debug?: boolean;
}

/**
 * Configuration for local provider.
 */
export interface LocalProviderConfig extends BaseProviderConfig {
  /** Initial flags */
  readonly flags?: readonly FeatureFlag[];
  /** Initial segments */
  readonly segments?: readonly Segment[];
  /** Load flags from localStorage */
  readonly persistToStorage?: boolean;
  /** Storage key prefix */
  readonly storageKey?: string;
}

/**
 * Configuration for remote provider.
 */
export interface RemoteProviderConfig extends BaseProviderConfig {
  /** API endpoint URL */
  readonly endpoint: string;
  /** API key or token */
  readonly apiKey?: string;
  /** Request timeout in ms */
  readonly timeout?: number;
  /** Request headers */
  readonly headers?: Record<string, string>;
  /** Retry configuration */
  readonly retry?: RetryConfig;
  /** Transform response data */
  readonly transform?: (data: unknown) => FeatureFlag[];
  /** Context to include in requests */
  readonly context?: EvaluationContext;
}

/**
 * Configuration for cached provider.
 */
export interface CachedProviderConfig extends BaseProviderConfig {
  /** Wrapped provider */
  readonly provider: FlagProvider;
  /** Cache TTL in ms */
  readonly ttl?: number;
  /** Stale-while-revalidate duration in ms */
  readonly staleWhileRevalidate?: number;
  /** Maximum cache size */
  readonly maxSize?: number;
  /** Storage backend */
  readonly storage?: 'memory' | 'localStorage' | 'sessionStorage';
}

/**
 * Configuration for composite provider.
 */
export interface CompositeProviderConfig extends BaseProviderConfig {
  /** Child providers */
  readonly providers: readonly FlagProvider[];
  /** Merge strategy */
  readonly strategy?: 'priority' | 'merge' | 'override';
  /** Fallback behavior */
  readonly fallback?: 'first-available' | 'all-must-succeed';
}

/**
 * Configuration for polling provider.
 */
export interface PollingProviderConfig extends BaseProviderConfig {
  /** Wrapped provider */
  readonly provider: FlagProvider;
  /** Polling interval in ms */
  readonly interval?: number;
  /** Only poll when document is visible */
  readonly pauseWhenHidden?: boolean;
  /** Jitter percentage for interval */
  readonly jitter?: number;
  /** Maximum consecutive failures before stopping */
  readonly maxFailures?: number;
}

/**
 * Configuration for WebSocket provider.
 */
export interface WebSocketProviderConfig extends BaseProviderConfig {
  /** WebSocket URL */
  readonly url: string;
  /** Initial flags (for offline start) */
  readonly initialFlags?: readonly FeatureFlag[];
  /** Reconnection configuration */
  readonly reconnect?: ReconnectConfig;
  /** Ping interval in ms */
  readonly pingInterval?: number;
  /** Authentication token */
  readonly authToken?: string;
  /** Channel/room to subscribe to */
  readonly channel?: string;
}

// ============================================================================
// Retry and Reconnect Configuration
// ============================================================================

/**
 * Retry configuration for HTTP requests.
 */
export interface RetryConfig {
  /** Maximum retry attempts */
  readonly maxAttempts?: number;
  /** Base delay in ms */
  readonly baseDelay?: number;
  /** Maximum delay in ms */
  readonly maxDelay?: number;
  /** Backoff multiplier */
  readonly backoffMultiplier?: number;
  /** HTTP status codes to retry */
  readonly retryStatusCodes?: readonly number[];
}

/**
 * Reconnection configuration for WebSocket.
 */
export interface ReconnectConfig {
  /** Enable reconnection */
  readonly enabled?: boolean;
  /** Maximum reconnection attempts */
  readonly maxAttempts?: number;
  /** Base delay in ms */
  readonly baseDelay?: number;
  /** Maximum delay in ms */
  readonly maxDelay?: number;
  /** Backoff multiplier */
  readonly backoffMultiplier?: number;
}

// ============================================================================
// Provider State
// ============================================================================

/**
 * Provider health status.
 */
export interface ProviderHealth {
  /** Whether provider is healthy */
  readonly healthy: boolean;
  /** Last successful fetch timestamp */
  readonly lastSuccess?: Date;
  /** Last error timestamp */
  readonly lastError?: Date;
  /** Last error message */
  readonly lastErrorMessage?: string;
  /** Number of consecutive failures */
  readonly consecutiveFailures: number;
  /** Average response time in ms */
  readonly avgResponseTime?: number;
}

/**
 * Provider statistics.
 */
export interface ProviderStats {
  /** Total flags loaded */
  readonly flagCount: number;
  /** Total segments loaded */
  readonly segmentCount: number;
  /** Total requests made */
  readonly requestCount: number;
  /** Total errors */
  readonly errorCount: number;
  /** Cache hit rate */
  readonly cacheHitRate?: number;
  /** Last refresh timestamp */
  readonly lastRefresh?: Date;
}

// ============================================================================
// Provider Factory
// ============================================================================

/**
 * Factory function for creating providers.
 */
export type ProviderFactory<C extends BaseProviderConfig, P extends FlagProvider> = (
  config: C
) => P;

/**
 * Provider registry entry.
 */
export interface ProviderRegistryEntry {
  readonly type: string;
  readonly factory: ProviderFactory<BaseProviderConfig, FlagProvider>;
  readonly schema?: Record<string, unknown>;
}
