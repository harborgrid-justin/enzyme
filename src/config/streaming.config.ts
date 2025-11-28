/**
 * @file Streaming Configuration
 * @description Configuration for the Dynamic HTML Streaming Engine.
 *
 * This module configures the streaming behavior including:
 * - Buffer management
 * - Stream priorities
 * - Error handling
 * - Performance optimizations
 *
 * @module config/streaming.config
 *
 * @see {@link ../lib/streaming} for streaming implementation
 */

import type { StreamingConfig } from './config-validation';
import { streamingConfigSchema, STREAMING_CONFIG_SCHEMA } from './config-validation';
import { CONFIG_NAMESPACES } from './types';
import { autoRegister, createEnvConfig } from './config-discovery';
import { getConfigRegistry, createTypedNamespace } from './config-registry';

// =============================================================================
// Streaming Configuration
// =============================================================================

/**
 * Default streaming configuration
 */
const defaultStreamingConfig: StreamingConfig = streamingConfigSchema.parse({});

/**
 * Environment-specific streaming configuration
 */
export const streamingConfig = createEnvConfig<StreamingConfig>({
  base: defaultStreamingConfig,

  development: {
    timing: {
      flushInterval: 100,
      maxFlushDelay: 500,
      shellTimeout: 5000,
      contentTimeout: 60000,
    },
    errorHandling: {
      fallbackToSSR: true,
      retryFailedChunks: true,
      maxRetries: 3,
      showErrorBoundary: true,
    },
    performance: {
      compression: false,
      compressionLevel: 6,
      caching: false,
      cacheTTL: 0,
    },
  },

  production: {
    timing: {
      flushInterval: 50,
      maxFlushDelay: 200,
      shellTimeout: 3000,
      contentTimeout: 30000,
    },
    errorHandling: {
      fallbackToSSR: true,
      retryFailedChunks: true,
      maxRetries: 2,
      showErrorBoundary: false,
    },
    performance: {
      compression: true,
      compressionLevel: 6,
      caching: true,
      cacheTTL: 300000,
    },
  },

  staging: {
    performance: {
      compression: true,
      compressionLevel: 4,
      caching: true,
      cacheTTL: 60000,
    },
  },
});

// =============================================================================
// Auto-Registration
// =============================================================================

/**
 * Register streaming configuration for auto-discovery
 */
autoRegister(CONFIG_NAMESPACES.STREAMING, streamingConfig, {
  priority: 10,
});

// =============================================================================
// Type-Safe Accessor
// =============================================================================

/**
 * Type-safe accessor for streaming configuration
 *
 * @example
 * ```typescript
 * const bufferSize = streaming.get('buffer')?.initialSize;
 * streaming.set('enabled', false);
 * ```
 */
export const streaming = createTypedNamespace<StreamingConfig>(CONFIG_NAMESPACES.STREAMING);

// =============================================================================
// Configuration Utilities
// =============================================================================

/**
 * Stream priority levels
 */
export const STREAM_PRIORITIES = {
  CRITICAL: 'critical',
  HIGH: 'high',
  NORMAL: 'normal',
  LOW: 'low',
} as const;

export type StreamPriority = (typeof STREAM_PRIORITIES)[keyof typeof STREAM_PRIORITIES];

/**
 * Get effective stream configuration based on priority
 *
 * @param priority - Stream priority level
 * @returns Timing configuration for the priority
 */
export function getStreamTimingByPriority(priority: StreamPriority): {
  flushInterval: number;
  maxFlushDelay: number;
} {
  const config = streaming.getAll();
  const baseTiming = config.timing || streamingConfig.timing;

  const multipliers: Record<StreamPriority, number> = {
    critical: 0.5,
    high: 0.75,
    normal: 1,
    low: 1.5,
  };

  const multiplier = multipliers[priority];

  return {
    flushInterval: Math.round((baseTiming?.flushInterval ?? 50) * multiplier),
    maxFlushDelay: Math.round((baseTiming?.maxFlushDelay ?? 200) * multiplier),
  };
}

/**
 * Check if streaming is enabled
 */
export function isStreamingEnabled(): boolean {
  return streaming.getOrDefault('enabled', true);
}

/**
 * Get buffer configuration
 */
export function getBufferConfig(): StreamingConfig['buffer'] {
  return streaming.get('buffer') ?? streamingConfig.buffer;
}

/**
 * Get error handling configuration
 */
export function getErrorHandlingConfig(): StreamingConfig['errorHandling'] {
  return streaming.get('errorHandling') ?? streamingConfig.errorHandling;
}

// =============================================================================
// Initialization
// =============================================================================

/**
 * Initialize streaming configuration in the registry
 */
export function initializeStreamingConfig(): void {
  const registry = getConfigRegistry();

  // Register all streaming config values
  Object.entries(streamingConfig).forEach(([key, value]) => {
    registry.set(CONFIG_NAMESPACES.STREAMING, key, value as import('./types').ConfigValue, {
      source: 'default',
      schema: STREAMING_CONFIG_SCHEMA,
    });
  });
}

// =============================================================================
// Exports
// =============================================================================

export { streamingConfigSchema, STREAMING_CONFIG_SCHEMA };
export type { StreamingConfig };
