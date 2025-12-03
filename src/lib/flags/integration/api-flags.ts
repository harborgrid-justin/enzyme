/**
 * @fileoverview API feature flags for controlling API behavior.
 *
 * This module provides feature flag integration for the API layer, enabling
 * dynamic control over endpoints, caching, rate limiting, and mock data.
 *
 * @module flags/integration/api-flags
 *
 * @example
 * ```typescript
 * import {
 *   apiFlags,
 *   useApiFlagConfig,
 *   createFlaggedApiClient,
 * } from '@/lib/flags/integration/api-flags';
 *
 * // Check API feature flags
 * if (apiFlags.isRetryEnabled()) {
 *   // Use retry logic
 * }
 *
 * // Use in component
 * function DataFetcher() {
 *   const config = useApiFlagConfig();
 *   // config.cacheEnabled, config.retryEnabled, etc.
 * }
 * ```
 */

import { useCallback, useMemo } from 'react';
import {
  createLibraryIntegration,
  integrationRegistry,
  type LibraryIntegration,
  useLibraryFlags,
} from './library-integration';
import { apiClient } from '../../api/api-client';

// =============================================================================
// Types
// =============================================================================

/**
 * API flag keys
 */
export const API_FLAG_KEYS = {
  /** Enable API retry logic */
  API_RETRY_ENABLED: 'api-retry-enabled',
  /** Enable API response caching */
  API_CACHE_ENABLED: 'api-cache-enabled',
  /** Enable request deduplication */
  API_DEDUPE_ENABLED: 'api-dedupe-enabled',
  /** Enable rate limiting */
  API_RATE_LIMIT_ENABLED: 'api-rate-limit-enabled',
  /** Use mock API responses */
  API_MOCK_ENABLED: 'api-mock-enabled',
  /** Enable API metrics collection */
  API_METRICS_ENABLED: 'api-metrics-enabled',
  /** Enable API request logging */
  API_LOGGING_ENABLED: 'api-logging-enabled',
  /** Enable optimistic updates */
  API_OPTIMISTIC_ENABLED: 'api-optimistic-enabled',
  /** Enable API versioning */
  API_VERSIONING_ENABLED: 'api-versioning-enabled',
  /** Enable streaming responses */
  API_STREAMING_ENABLED: 'api-streaming-enabled',
  /** Use new API gateway */
  API_GATEWAY_V2: 'api-gateway-v2',
  /** Enable batch requests */
  API_BATCH_ENABLED: 'api-batch-enabled',
  /** Enable GraphQL mode */
  API_GRAPHQL_ENABLED: 'api-graphql-enabled',
  /** Enable offline support */
  API_OFFLINE_ENABLED: 'api-offline-enabled',
} as const;

export type ApiFlagKey = (typeof API_FLAG_KEYS)[keyof typeof API_FLAG_KEYS];

/**
 * API flag configuration
 */
export interface ApiFlagConfig {
  /** Enable retry logic */
  readonly retryEnabled: boolean;
  /** Enable response caching */
  readonly cacheEnabled: boolean;
  /** Enable request deduplication */
  readonly dedupeEnabled: boolean;
  /** Enable rate limiting */
  readonly rateLimitEnabled: boolean;
  /** Use mock responses */
  readonly mockEnabled: boolean;
  /** Enable metrics collection */
  readonly metricsEnabled: boolean;
  /** Enable request logging */
  readonly loggingEnabled: boolean;
  /** Enable optimistic updates */
  readonly optimisticEnabled: boolean;
  /** Enable API versioning */
  readonly versioningEnabled: boolean;
  /** Enable streaming responses */
  readonly streamingEnabled: boolean;
  /** Use new gateway */
  readonly gatewayV2: boolean;
  /** Enable batch requests */
  readonly batchEnabled: boolean;
  /** Enable GraphQL */
  readonly graphqlEnabled: boolean;
  /** Enable offline support */
  readonly offlineEnabled: boolean;
  /** Index signature for Record<string, unknown> compatibility */
  [key: string]: unknown;
}

/**
 * API endpoint flag configuration
 */
export interface EndpointFlagConfig {
  /** Endpoint path pattern */
  readonly path: string;
  /** Feature flag key */
  readonly flagKey: string;
  /** Enabled endpoint URL */
  readonly enabledUrl: string;
  /** Fallback endpoint URL */
  readonly fallbackUrl: string;
  /** Mock data when mocking is enabled */
  readonly mockData?: unknown;
}

/**
 * Flagged request options
 */
export interface FlaggedRequestOptions {
  /** Override retry setting */
  readonly forceRetry?: boolean;
  /** Override cache setting */
  readonly forceCache?: boolean;
  /** Override mock setting */
  readonly forceMock?: boolean;
  /** Additional flag context */
  readonly flagContext?: Record<string, unknown>;
}

// =============================================================================
// Default Configuration
// =============================================================================

/**
 * Default API flag configuration
 */
export const DEFAULT_API_FLAG_CONFIG: ApiFlagConfig = {
  retryEnabled: true,
  cacheEnabled: true,
  dedupeEnabled: true,
  rateLimitEnabled: false,
  mockEnabled: false,
  metricsEnabled: true,
  loggingEnabled: false,
  optimisticEnabled: false,
  versioningEnabled: false,
  streamingEnabled: false,
  gatewayV2: false,
  batchEnabled: false,
  graphqlEnabled: false,
  offlineEnabled: false,
};

// =============================================================================
// Library Integration
// =============================================================================

/**
 * Create API flag integration
 */
export function createApiFlagIntegration(): LibraryIntegration<ApiFlagConfig> {
  return createLibraryIntegration<ApiFlagConfig>({
    libraryId: 'api',
    defaultConfig: DEFAULT_API_FLAG_CONFIG,
    flagMappings: {
      [API_FLAG_KEYS.API_RETRY_ENABLED]: 'retryEnabled',
      [API_FLAG_KEYS.API_CACHE_ENABLED]: 'cacheEnabled',
      [API_FLAG_KEYS.API_DEDUPE_ENABLED]: 'dedupeEnabled',
      [API_FLAG_KEYS.API_RATE_LIMIT_ENABLED]: 'rateLimitEnabled',
      [API_FLAG_KEYS.API_MOCK_ENABLED]: 'mockEnabled',
      [API_FLAG_KEYS.API_METRICS_ENABLED]: 'metricsEnabled',
      [API_FLAG_KEYS.API_LOGGING_ENABLED]: 'loggingEnabled',
      [API_FLAG_KEYS.API_OPTIMISTIC_ENABLED]: 'optimisticEnabled',
      [API_FLAG_KEYS.API_VERSIONING_ENABLED]: 'versioningEnabled',
      [API_FLAG_KEYS.API_STREAMING_ENABLED]: 'streamingEnabled',
      [API_FLAG_KEYS.API_GATEWAY_V2]: 'gatewayV2',
      [API_FLAG_KEYS.API_BATCH_ENABLED]: 'batchEnabled',
      [API_FLAG_KEYS.API_GRAPHQL_ENABLED]: 'graphqlEnabled',
      [API_FLAG_KEYS.API_OFFLINE_ENABLED]: 'offlineEnabled',
    },
    onConfigChange: (config, changedFlags) => {
      console.info('[API Flags] Config changed:', changedFlags, config);
    },
  });
}

// Initialize and register the API integration
const apiIntegration = createApiFlagIntegration();
integrationRegistry.register(apiIntegration);

// =============================================================================
// API Flag Helpers
// =============================================================================

/**
 * API flags helper object for direct flag checking
 */
class ApiFlagsHelper {
  /**
   * Set the flag getter function
   */
  setFlagGetter(getter: (flagKey: string) => boolean): void {
    this.getFlag = getter;
  }

  /**
   * Check if retry is enabled
   */
  isRetryEnabled(): boolean {
    return this.getFlag(API_FLAG_KEYS.API_RETRY_ENABLED);
  }

  /**
   * Check if caching is enabled
   */
  isCacheEnabled(): boolean {
    return this.getFlag(API_FLAG_KEYS.API_CACHE_ENABLED);
  }

  /**
   * Check if deduplication is enabled
   */
  isDedupeEnabled(): boolean {
    return this.getFlag(API_FLAG_KEYS.API_DEDUPE_ENABLED);
  }

  /**
   * Check if rate limiting is enabled
   */
  isRateLimitEnabled(): boolean {
    return this.getFlag(API_FLAG_KEYS.API_RATE_LIMIT_ENABLED);
  }

  /**
   * Check if mock mode is enabled
   */
  isMockEnabled(): boolean {
    return this.getFlag(API_FLAG_KEYS.API_MOCK_ENABLED);
  }

  /**
   * Check if metrics are enabled
   */
  isMetricsEnabled(): boolean {
    return this.getFlag(API_FLAG_KEYS.API_METRICS_ENABLED);
  }

  /**
   * Check if logging is enabled
   */
  isLoggingEnabled(): boolean {
    return this.getFlag(API_FLAG_KEYS.API_LOGGING_ENABLED);
  }

  /**
   * Check if optimistic updates are enabled
   */
  isOptimisticEnabled(): boolean {
    return this.getFlag(API_FLAG_KEYS.API_OPTIMISTIC_ENABLED);
  }

  /**
   * Check if versioning is enabled
   */
  isVersioningEnabled(): boolean {
    return this.getFlag(API_FLAG_KEYS.API_VERSIONING_ENABLED);
  }

  /**
   * Check if streaming is enabled
   */
  isStreamingEnabled(): boolean {
    return this.getFlag(API_FLAG_KEYS.API_STREAMING_ENABLED);
  }

  /**
   * Check if gateway v2 is enabled
   */
  isGatewayV2Enabled(): boolean {
    return this.getFlag(API_FLAG_KEYS.API_GATEWAY_V2);
  }

  /**
   * Check if batch requests are enabled
   */
  isBatchEnabled(): boolean {
    return this.getFlag(API_FLAG_KEYS.API_BATCH_ENABLED);
  }

  /**
   * Check if GraphQL is enabled
   */
  isGraphQLEnabled(): boolean {
    return this.getFlag(API_FLAG_KEYS.API_GRAPHQL_ENABLED);
  }

  /**
   * Check if offline support is enabled
   */
  isOfflineEnabled(): boolean {
    return this.getFlag(API_FLAG_KEYS.API_OFFLINE_ENABLED);
  }

  /**
   * Get all flag states
   */
  getAllFlags(): Record<ApiFlagKey, boolean> {
    return {
      [API_FLAG_KEYS.API_RETRY_ENABLED]: this.isRetryEnabled(),
      [API_FLAG_KEYS.API_CACHE_ENABLED]: this.isCacheEnabled(),
      [API_FLAG_KEYS.API_DEDUPE_ENABLED]: this.isDedupeEnabled(),
      [API_FLAG_KEYS.API_RATE_LIMIT_ENABLED]: this.isRateLimitEnabled(),
      [API_FLAG_KEYS.API_MOCK_ENABLED]: this.isMockEnabled(),
      [API_FLAG_KEYS.API_METRICS_ENABLED]: this.isMetricsEnabled(),
      [API_FLAG_KEYS.API_LOGGING_ENABLED]: this.isLoggingEnabled(),
      [API_FLAG_KEYS.API_OPTIMISTIC_ENABLED]: this.isOptimisticEnabled(),
      [API_FLAG_KEYS.API_VERSIONING_ENABLED]: this.isVersioningEnabled(),
      [API_FLAG_KEYS.API_STREAMING_ENABLED]: this.isStreamingEnabled(),
      [API_FLAG_KEYS.API_GATEWAY_V2]: this.isGatewayV2Enabled(),
      [API_FLAG_KEYS.API_BATCH_ENABLED]: this.isBatchEnabled(),
      [API_FLAG_KEYS.API_GRAPHQL_ENABLED]: this.isGraphQLEnabled(),
      [API_FLAG_KEYS.API_OFFLINE_ENABLED]: this.isOfflineEnabled(),
    };
  }

  private getFlag: (flagKey: string) => boolean = () => false;
}

/**
 * Global API flags helper instance
 */
export const apiFlags = new ApiFlagsHelper();

// =============================================================================
// React Hooks
// =============================================================================

/**
 * Hook to get API flag configuration
 */
export function useApiFlagConfig(): ApiFlagConfig {
  const config = useLibraryFlags<ApiFlagConfig>('api');
  return config ?? DEFAULT_API_FLAG_CONFIG;
}

/**
 * Hook to check a specific API flag
 */
export function useApiFlag(flagKey: ApiFlagKey): boolean {
  const config = useApiFlagConfig();

  return useMemo(() => {
    switch (flagKey) {
      case API_FLAG_KEYS.API_RETRY_ENABLED:
        return config.retryEnabled;
      case API_FLAG_KEYS.API_CACHE_ENABLED:
        return config.cacheEnabled;
      case API_FLAG_KEYS.API_DEDUPE_ENABLED:
        return config.dedupeEnabled;
      case API_FLAG_KEYS.API_RATE_LIMIT_ENABLED:
        return config.rateLimitEnabled;
      case API_FLAG_KEYS.API_MOCK_ENABLED:
        return config.mockEnabled;
      case API_FLAG_KEYS.API_METRICS_ENABLED:
        return config.metricsEnabled;
      case API_FLAG_KEYS.API_LOGGING_ENABLED:
        return config.loggingEnabled;
      case API_FLAG_KEYS.API_OPTIMISTIC_ENABLED:
        return config.optimisticEnabled;
      case API_FLAG_KEYS.API_VERSIONING_ENABLED:
        return config.versioningEnabled;
      case API_FLAG_KEYS.API_STREAMING_ENABLED:
        return config.streamingEnabled;
      case API_FLAG_KEYS.API_GATEWAY_V2:
        return config.gatewayV2;
      case API_FLAG_KEYS.API_BATCH_ENABLED:
        return config.batchEnabled;
      case API_FLAG_KEYS.API_GRAPHQL_ENABLED:
        return config.graphqlEnabled;
      case API_FLAG_KEYS.API_OFFLINE_ENABLED:
        return config.offlineEnabled;
      default:
        return false;
    }
  }, [config, flagKey]);
}

/**
 * Hook for flagged API request configuration
 */
export function useFlaggedApiRequest<T>(
  endpoint: string,
  options: FlaggedRequestOptions = {}
): {
  shouldRetry: boolean;
  shouldCache: boolean;
  shouldMock: boolean;
  shouldLog: boolean;
  makeRequest: () => Promise<T>;
} {
  const config = useApiFlagConfig();

  const shouldRetry = options.forceRetry ?? config.retryEnabled;
  const shouldCache = options.forceCache ?? config.cacheEnabled;
  const shouldMock = options.forceMock ?? config.mockEnabled;
  const shouldLog = config.loggingEnabled;

  const makeRequest = useCallback(async (): Promise<T> => {
    if (shouldLog) {
      console.info(`[API] Request to ${endpoint}`, { shouldRetry, shouldCache, shouldMock });
    }

    // Use the centralized apiClient for consistent error handling, retry logic, and auth
    const response = await apiClient.get<T>(endpoint, {
      meta: {
        // Skip retry if disabled by feature flag
        skipRetry: !shouldRetry,
      },
    });
    return response.data;
  }, [endpoint, shouldLog, shouldRetry, shouldCache, shouldMock]);

  return {
    shouldRetry,
    shouldCache,
    shouldMock,
    shouldLog,
    makeRequest,
  };
}

// =============================================================================
// Endpoint Flag Management
// =============================================================================

const endpointFlags = new Map<string, EndpointFlagConfig>();

/**
 * Register a flagged endpoint
 */
export function registerFlaggedEndpoint(config: EndpointFlagConfig): void {
  endpointFlags.set(config.path, config);
}

/**
 * Get endpoint URL based on flag state
 */
export function getFlaggedEndpointUrl(
  path: string,
  getFlag: (flagKey: string) => boolean
): string {
  const config = endpointFlags.get(path);
  if (!config) return path;

  const isEnabled = getFlag(config.flagKey);
  return isEnabled ? config.enabledUrl : config.fallbackUrl;
}

/**
 * Get mock data for endpoint if mocking is enabled
 */
export function getFlaggedEndpointMockData(
  path: string,
  isMockEnabled: boolean
): unknown | undefined {
  if (!isMockEnabled) return undefined;

  const config = endpointFlags.get(path);
  return config?.mockData;
}

/**
 * Clear all registered endpoint flags
 */
export function clearFlaggedEndpoints(): void {
  endpointFlags.clear();
}

// =============================================================================
// API Client Factory
// =============================================================================

/**
 * Create a flag-aware fetch wrapper
 *
 * Note: This function intentionally returns a raw fetch wrapper because:
 * 1. It provides a drop-in replacement for the native fetch API
 * 2. Users may need to use this with existing code that expects fetch
 * 3. The wrapper applies feature flag logic on top of fetch
 *
 * For new API calls, prefer using apiClient from @/lib/api directly,
 * which provides retry, authentication, and error handling out of the box.
 *
 * @see {@link @/lib/api/api-client} for the recommended API client
 */
export function createFlaggedFetch(
  getFlag: (flagKey: string) => boolean
): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const config = apiIntegration.getConfig(
      Object.fromEntries(
        Object.values(API_FLAG_KEYS).map((key) => [key, getFlag(key)])
      )
    );

    let url: string;
    if (typeof input === 'string') {
      url = input;
    } else if (input instanceof URL) {
      url = input.toString();
    } else if (input instanceof Request) {
      ({ url } = input);
    } else {
      url = String(input);
    }

    // Check for mock mode
    if (config.mockEnabled) {
      const mockData = getFlaggedEndpointMockData(url, true);
      if (mockData !== undefined) {
        return new Response(JSON.stringify(mockData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Get flagged URL
    const flaggedUrl = getFlaggedEndpointUrl(url, getFlag);

    // Log if enabled
    if (config.loggingEnabled) {
      console.info(`[FlaggedFetch] ${flaggedUrl}`, { config });
    }

    // Make request with retry if enabled
    // Raw fetch is intentional here - this IS the fetch wrapper that applies flags
    let lastError: Error | null = null;
    const maxRetries = config.retryEnabled ? 3 : 1;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Raw fetch is intentional - this wrapper implements flag-based behavior

        return await fetch(flaggedUrl, init);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    throw lastError ?? new Error('Fetch failed with no error details');
  };
}

// =============================================================================
// Exports
// =============================================================================

export { apiIntegration };
