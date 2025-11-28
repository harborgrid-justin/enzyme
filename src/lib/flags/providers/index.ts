/**
 * @fileoverview Feature flag provider module exports.
 *
 * This module provides multiple flag data source implementations:
 * - Local/static provider for offline-first
 * - Remote provider for API-based flags
 * - Cached provider for performance
 * - Composite provider for combining sources
 * - Polling provider for periodic updates
 * - WebSocket provider for real-time updates
 *
 * @module flags/providers
 *
 * @example
 * ```typescript
 * import {
 *   LocalProvider,
 *   RemoteProvider,
 *   CachedProvider,
 *   CompositeProvider,
 * } from '@/lib/flags/providers';
 *
 * // Create a robust provider setup
 * const localProvider = new LocalProvider({
 *   flags: defaultFlags,
 *   persistToStorage: true,
 * });
 *
 * const remoteProvider = new RemoteProvider({
 *   endpoint: 'https://api.example.com/flags',
 *   apiKey: process.env.FLAG_API_KEY,
 * });
 *
 * const cachedRemote = new CachedProvider({
 *   provider: remoteProvider,
 *   ttl: 60000,
 * });
 *
 * const composite = new CompositeProvider({
 *   providers: [localProvider, cachedRemote],
 *   strategy: 'priority',
 * });
 *
 * await composite.initialize();
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export type {
  // Provider Interfaces
  FlagProvider,
  WritableFlagProvider,

  // Events
  FlagChangeType,
  FlagChangeEvent,
  FlagChangeListener,

  // Configuration
  BaseProviderConfig,
  LocalProviderConfig,
  RemoteProviderConfig,
  CachedProviderConfig,
  CompositeProviderConfig,
  PollingProviderConfig,
  WebSocketProviderConfig,
  RetryConfig,
  ReconnectConfig,

  // Status
  ProviderHealth,
  ProviderStats,

  // Factory
  ProviderFactory,
  ProviderRegistryEntry,
} from './types';

// ============================================================================
// Local Provider
// ============================================================================

export {
  LocalProvider,
  createLocalProvider,
} from './local-provider';

// ============================================================================
// Remote Provider
// ============================================================================

export {
  RemoteProvider,
  createRemoteProvider,
} from './remote-provider';

// ============================================================================
// Cached Provider
// ============================================================================

export {
  CachedProvider,
  createCachedProvider,
} from './cached-provider';

// ============================================================================
// Composite Provider
// ============================================================================

export {
  CompositeProvider,
  createCompositeProvider,
} from './composite-provider';

// ============================================================================
// Polling Provider
// ============================================================================

export {
  PollingProvider,
  createPollingProvider,
} from './polling-provider';

// ============================================================================
// WebSocket Provider
// ============================================================================

export {
  WebSocketProvider,
  createWebSocketProvider,
} from './websocket-provider';

// ============================================================================
// Provider Factory Utilities
// ============================================================================

import type { FlagProvider, BaseProviderConfig } from './types';
import { LocalProvider } from './local-provider';
import { RemoteProvider } from './remote-provider';
import { CachedProvider } from './cached-provider';
import { CompositeProvider } from './composite-provider';
import { PollingProvider } from './polling-provider';
import { WebSocketProvider } from './websocket-provider';

/**
 * Provider type names.
 */
export type ProviderType =
  | 'local'
  | 'remote'
  | 'cached'
  | 'composite'
  | 'polling'
  | 'websocket';

/**
 * Create a provider by type.
 */
export function createProvider(
  type: ProviderType,
  config: BaseProviderConfig & Record<string, unknown>
): FlagProvider {
  switch (type) {
    case 'local':
      return new LocalProvider(config);
    case 'remote':
      if (!('endpoint' in config)) {
        throw new Error('Remote provider requires endpoint');
      }
      return new RemoteProvider(config as unknown as ConstructorParameters<typeof RemoteProvider>[0]);
    case 'cached':
      if (!('provider' in config)) {
        throw new Error('Cached provider requires wrapped provider');
      }
      return new CachedProvider(config as unknown as ConstructorParameters<typeof CachedProvider>[0]);
    case 'composite':
      if (!('providers' in config)) {
        throw new Error('Composite provider requires providers array');
      }
      return new CompositeProvider(config as unknown as ConstructorParameters<typeof CompositeProvider>[0]);
    case 'polling':
      if (!('provider' in config)) {
        throw new Error('Polling provider requires wrapped provider');
      }
      return new PollingProvider(config as unknown as ConstructorParameters<typeof PollingProvider>[0]);
    case 'websocket':
      if (!('url' in config)) {
        throw new Error('WebSocket provider requires url');
      }
      return new WebSocketProvider(config as unknown as ConstructorParameters<typeof WebSocketProvider>[0]);
    default:
      throw new Error(`Unknown provider type: ${type}`);
  }
}

/**
 * Create a provider chain with caching and fallback.
 */
export function createProviderChain(options: {
  remote: {
    endpoint: string;
    apiKey?: string;
    timeout?: number;
  };
  local?: {
    flags?: readonly import('../advanced/types').FeatureFlag[];
    persistToStorage?: boolean;
  };
  cache?: {
    ttl?: number;
    staleWhileRevalidate?: number;
  };
  polling?: {
    interval?: number;
    pauseWhenHidden?: boolean;
  };
  debug?: boolean;
}): FlagProvider {
  const { remote, local, cache, polling, debug } = options;

  // Create remote provider
  const remoteProvider = new RemoteProvider({
    ...remote,
    debug,
  });

  // Wrap with cache if configured
  let provider: FlagProvider = cache
    ? new CachedProvider({
        provider: remoteProvider,
        ...cache,
        debug,
      })
    : remoteProvider;

  // Wrap with polling if configured
  if (polling) {
    provider = new PollingProvider({
      provider,
      ...polling,
      debug,
    });
  }

  // Add local fallback if configured
  if (local) {
    const localProvider = new LocalProvider({
      ...local,
      debug,
    });

    provider = new CompositeProvider({
      providers: [provider, localProvider],
      strategy: 'priority',
      fallback: 'first-available',
      debug,
    });
  }

  return provider;
}
