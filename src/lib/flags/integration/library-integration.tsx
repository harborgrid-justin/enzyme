import React from 'react';
/**
 * @fileoverview Unified library integration layer for feature flags.
 *
 * This module provides a centralized system for connecting feature flags to all
 * library modules in the application. It enables runtime configuration changes,
 * flag-based behavior modification, and consistent integration patterns.
 *
 * @module flags/integration/library-integration
 *
 * @example
 * ```typescript
 * import {
 *   LibraryFlagIntegration,
 *   createLibraryIntegration,
 *   useLibraryFlags,
 * } from '@/lib/flags/integration/library-integration';
 *
 * // Create integration for a library
 * const apiIntegration = createLibraryIntegration({
 *   libraryId: 'api',
 *   defaultConfig: { retryEnabled: true, cacheEnabled: true },
 *   flagMappings: {
 *     'api-retry-enabled': 'retryEnabled',
 *     'api-cache-enabled': 'cacheEnabled',
 *   },
 * });
 *
 * // Use in component
 * function ApiConsumer() {
 *   const config = useLibraryFlags('api');
 *   // config updates automatically when flags change
 * }
 * ```
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';

// =============================================================================
// Types
// =============================================================================

/**
 * Library module identifier
 */
export type LibraryId =
  | 'api'
  | 'routing'
  | 'ui'
  | 'performance'
  | 'auth'
  | 'monitoring'
  | 'state'
  | 'realtime'
  | 'theme'
  | 'config'
  | 'hydration'
  | 'streaming'
  | 'vdom'
  | 'ux'
  | string;

/**
 * Flag-to-config field mapping
 */
export type FlagMapping<TConfig> = {
  [flagKey: string]: keyof TConfig | ((flagValue: boolean) => Partial<TConfig>);
};

/**
 * Flag value transformer
 */
export type FlagTransformer<T> = (flagValue: boolean, currentValue: T) => T;

/**
 * Library integration configuration
 */
export interface LibraryIntegrationConfig<TConfig extends Record<string, unknown>> {
  /** Unique library identifier */
  readonly libraryId: LibraryId;
  /** Default configuration when flags are not set */
  readonly defaultConfig: TConfig;
  /** Mapping from flag keys to config properties */
  readonly flagMappings: FlagMapping<TConfig>;
  /** Optional transformers for complex mappings */
  readonly transformers?: Readonly<Record<string, FlagTransformer<unknown>>>;
  /** Whether to cache configuration */
  readonly cacheEnabled?: boolean;
  /** Cache TTL in milliseconds */
  readonly cacheTTL?: number;
  /** Callback when config changes */
  readonly onConfigChange?: (config: TConfig, changedFlags: string[]) => void;
  /** Priority for evaluation order */
  readonly priority?: number;
}

/**
 * Library integration instance
 */
export interface LibraryIntegration<TConfig extends Record<string, unknown>> {
  /** Library identifier */
  readonly libraryId: LibraryId;
  /** Get current configuration based on flags */
  getConfig(flags: Record<string, boolean>): TConfig;
  /** Get specific config property */
  getConfigValue<K extends keyof TConfig>(key: K, flags: Record<string, boolean>): TConfig[K];
  /** Check if a flag affects this library */
  isAffectedByFlag(flagKey: string): boolean;
  /** Get all affecting flag keys */
  getAffectingFlags(): string[];
  /** Subscribe to config changes */
  subscribe(callback: (config: TConfig) => void): () => void;
  /** Update flags and notify subscribers */
  updateFlags(flags: Record<string, boolean>): void;
  /** Reset to default config */
  reset(): void;
  /** Get integration metadata */
  getMetadata(): IntegrationMetadata;
}

/**
 * Integration metadata
 */
export interface IntegrationMetadata {
  readonly libraryId: LibraryId;
  readonly flagCount: number;
  readonly priority: number;
  readonly lastUpdated: number;
  readonly cacheEnabled: boolean;
}

/**
 * Global integration registry
 */
export interface IntegrationRegistry {
  /** Register a library integration */
  register<TConfig extends Record<string, unknown>>(
    integration: LibraryIntegration<TConfig>
  ): void;
  /** Unregister a library integration */
  unregister(libraryId: LibraryId): void;
  /** Get integration by library ID */
  get<TConfig extends Record<string, unknown>>(
    libraryId: LibraryId
  ): LibraryIntegration<TConfig> | undefined;
  /** Get all registered integrations */
  getAll(): LibraryIntegration<Record<string, unknown>>[];
  /** Update flags across all integrations */
  updateFlags(flags: Record<string, boolean>): void;
  /** Get libraries affected by a flag */
  getAffectedLibraries(flagKey: string): LibraryId[];
  /** Clear all registrations */
  clear(): void;
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Create a library integration instance
 */
export function createLibraryIntegration<TConfig extends Record<string, unknown>>(
  config: LibraryIntegrationConfig<TConfig>
): LibraryIntegration<TConfig> {
  const {
    libraryId,
    defaultConfig,
    flagMappings,
    transformers = {},
    cacheEnabled = true,
    cacheTTL = 60000,
    onConfigChange,
    priority = 0,
  } = config;

  let cachedConfig: TConfig | null = null;
  let cachedFlags: Record<string, boolean> = {};
  let cacheTimestamp = 0;
  let lastFlags: Record<string, boolean> = {};
  const subscribers = new Set<(config: TConfig) => void>();

  const isCacheValid = (): boolean => {
    if (!cacheEnabled || !cachedConfig) return false;
    return Date.now() - cacheTimestamp < cacheTTL;
  };

  const flagsChanged = (newFlags: Record<string, boolean>): boolean => {
    const affectingFlags = Object.keys(flagMappings);
    for (const flagKey of affectingFlags) {
      if (newFlags[flagKey] !== cachedFlags[flagKey]) {
        return true;
      }
    }
    return false;
  };

  const computeConfig = (flags: Record<string, boolean>): TConfig => {
    const result = { ...defaultConfig };

    for (const [flagKey, mapping] of Object.entries(flagMappings)) {
      const flagValue = flags[flagKey] ?? false;

      if (typeof mapping === 'function') {
        // Complex mapping function
        const updates = mapping(flagValue);
        Object.assign(result, updates);
      } else {
        // Direct property mapping
        const configKey = mapping;
        const transformer = transformers[String(configKey)];

        if (transformer) {
          (result as Record<string, unknown>)[String(configKey)] = transformer(
            flagValue,
            result[configKey]
          );
        } else {
          (result as Record<string, unknown>)[String(configKey)] = flagValue;
        }
      }
    }

    return result;
  };

  const notifySubscribers = (config: TConfig): void => {
    for (const callback of subscribers) {
      try {
        callback(config);
      } catch (error) {
        console.error(`[LibraryIntegration:${libraryId}] Subscriber error:`, error);
      }
    }
  };

  return {
    libraryId,

    getConfig(flags: Record<string, boolean>): TConfig {
      if (isCacheValid() && !flagsChanged(flags)) {
        return cachedConfig as TConfig;
      }

      const newConfig = computeConfig(flags);
      cachedConfig = newConfig;
      cachedFlags = { ...flags };
      cacheTimestamp = Date.now();

      return newConfig;
    },

    getConfigValue<K extends keyof TConfig>(key: K, flags: Record<string, boolean>): TConfig[K] {
      const fullConfig = this.getConfig(flags);
      return fullConfig[key];
    },

    isAffectedByFlag(flagKey: string): boolean {
      return flagKey in flagMappings;
    },

    getAffectingFlags(): string[] {
      return Object.keys(flagMappings);
    },

    subscribe(callback: (config: TConfig) => void): () => void {
      subscribers.add(callback);
      return () => {
        subscribers.delete(callback);
      };
    },

    updateFlags(flags: Record<string, boolean>): void {
      const changedFlags: string[] = [];

      for (const flagKey of Object.keys(flagMappings)) {
        if (flags[flagKey] !== lastFlags[flagKey]) {
          changedFlags.push(flagKey);
        }
      }

      if (changedFlags.length === 0) return;

      lastFlags = { ...flags };
      const newConfig = computeConfig(flags);

      cachedConfig = newConfig;
      cachedFlags = { ...flags };
      cacheTimestamp = Date.now();

      onConfigChange?.(newConfig, changedFlags);
      notifySubscribers(newConfig);
    },

    reset(): void {
      cachedConfig = null;
      cachedFlags = {};
      cacheTimestamp = 0;
      lastFlags = {};
      notifySubscribers(defaultConfig);
    },

    getMetadata(): IntegrationMetadata {
      return {
        libraryId,
        flagCount: Object.keys(flagMappings).length,
        priority,
        lastUpdated: cacheTimestamp,
        cacheEnabled,
      };
    },
  };
}

// =============================================================================
// Global Registry
// =============================================================================

/**
 * Global integration registry singleton
 */
class GlobalIntegrationRegistry implements IntegrationRegistry {
  private integrations = new Map<LibraryId, LibraryIntegration<Record<string, unknown>>>();
  private currentFlags: Record<string, boolean> = {};

  register<TConfig extends Record<string, unknown>>(
    integration: LibraryIntegration<TConfig>
  ): void {
    this.integrations.set(
      integration.libraryId,
      integration as unknown as LibraryIntegration<Record<string, unknown>>
    );

    // Apply current flags to new integration
    if (Object.keys(this.currentFlags).length > 0) {
      integration.updateFlags(this.currentFlags);
    }
  }

  unregister(libraryId: LibraryId): void {
    const integration = this.integrations.get(libraryId);
    if (integration) {
      integration.reset();
      this.integrations.delete(libraryId);
    }
  }

  get<TConfig extends Record<string, unknown>>(
    libraryId: LibraryId
  ): LibraryIntegration<TConfig> | undefined {
    return this.integrations.get(libraryId) as LibraryIntegration<TConfig> | undefined;
  }

  getAll(): LibraryIntegration<Record<string, unknown>>[] {
    return Array.from(this.integrations.values()).sort(
      (a, b) => b.getMetadata().priority - a.getMetadata().priority
    );
  }

  updateFlags(flags: Record<string, boolean>): void {
    this.currentFlags = { ...flags };

    for (const integration of this.integrations.values()) {
      integration.updateFlags(flags);
    }
  }

  getAffectedLibraries(flagKey: string): LibraryId[] {
    const affected: LibraryId[] = [];

    for (const integration of this.integrations.values()) {
      if (integration.isAffectedByFlag(flagKey)) {
        affected.push(integration.libraryId);
      }
    }

    return affected;
  }

  clear(): void {
    for (const integration of this.integrations.values()) {
      integration.reset();
    }
    this.integrations.clear();
    this.currentFlags = {};
  }
}

/**
 * Global integration registry instance
 */
export const integrationRegistry = new GlobalIntegrationRegistry();

/**
 * Get the global integration registry
 */
export function getIntegrationRegistry(): IntegrationRegistry {
  return integrationRegistry;
}

// =============================================================================
// React Integration
// =============================================================================

/**
 * Library integration context value
 */
export interface LibraryIntegrationContextValue {
  /** Current flags */
  readonly flags: Record<string, boolean>;
  /** Get config for a library */
  getLibraryConfig<TConfig extends Record<string, unknown>>(libraryId: LibraryId): TConfig | null;
  /** Check if a library is flag-enabled */
  isLibraryEnabled(libraryId: LibraryId): boolean;
  /** Get all registered library IDs */
  getRegisteredLibraries(): LibraryId[];
  /** Subscribe to library config changes */
  subscribeToLibrary<TConfig extends Record<string, unknown>>(
    libraryId: LibraryId,
    callback: (config: TConfig) => void
  ): () => void;
}

const LibraryIntegrationContext = createContext<LibraryIntegrationContextValue | null>(null);

/**
 * Props for LibraryIntegrationProvider
 */
export interface LibraryIntegrationProviderProps {
  readonly children: ReactNode;
  /** Flag provider function */
  readonly getFlag: (flagKey: string) => boolean;
  /** All current flags */
  readonly flags?: Record<string, boolean>;
  /** Auto-sync with flag changes */
  readonly autoSync?: boolean;
  /** Sync interval in ms */
  readonly syncInterval?: number;
}

/**
 * Provider component for library integration
 */
export function LibraryIntegrationProvider({
  children,
  getFlag,
  flags: externalFlags = {},
  autoSync = true,
  syncInterval = 5000,
}: LibraryIntegrationProviderProps): React.JSX.Element {
  const [flags, setFlags] = useState<Record<string, boolean>>(externalFlags);

  // Sync flags from external source
  useEffect(() => {
    setFlags(externalFlags);
    integrationRegistry.updateFlags(externalFlags);
  }, [externalFlags]);

  // Auto-sync with flag provider
  useEffect(() => {
    if (!autoSync) return;

    const syncFlags = (): void => {
      const allIntegrations = integrationRegistry.getAll();
      const allFlagKeys = new Set<string>();

      for (const integration of allIntegrations) {
        for (const flagKey of integration.getAffectingFlags()) {
          allFlagKeys.add(flagKey);
        }
      }

      const updatedFlags: Record<string, boolean> = {};
      for (const flagKey of allFlagKeys) {
        updatedFlags[flagKey] = getFlag(flagKey);
      }

      setFlags(updatedFlags);
      integrationRegistry.updateFlags(updatedFlags);
    };

    const interval = setInterval(syncFlags, syncInterval);
    syncFlags(); // Initial sync

    return () => clearInterval(interval);
  }, [autoSync, syncInterval, getFlag]);

  const contextValue = useMemo<LibraryIntegrationContextValue>(
    () => ({
      flags,

      getLibraryConfig<TConfig extends Record<string, unknown>>(
        libraryId: LibraryId
      ): TConfig | null {
        const integration = integrationRegistry.get<TConfig>(libraryId);
        if (!integration) return null;
        return integration.getConfig(flags);
      },

      isLibraryEnabled(libraryId: LibraryId): boolean {
        const integration = integrationRegistry.get(libraryId);
        if (!integration) return true; // Default to enabled if not registered
        const config = integration.getConfig(flags);
        return (config as { enabled?: boolean }).enabled !== false;
      },

      getRegisteredLibraries(): LibraryId[] {
        return integrationRegistry.getAll().map((i) => i.libraryId);
      },

      subscribeToLibrary<TConfig extends Record<string, unknown>>(
        libraryId: LibraryId,
        callback: (config: TConfig) => void
      ): () => void {
        const integration = integrationRegistry.get<TConfig>(libraryId);
        if (!integration) return () => {};
        return integration.subscribe(callback);
      },
    }),
    [flags]
  );

  return (
    <LibraryIntegrationContext.Provider value={contextValue}>
      {children}
    </LibraryIntegrationContext.Provider>
  );
}

/**
 * Hook to access library integration context
 */
export function useLibraryIntegrationContext(): LibraryIntegrationContextValue {
  const context = useContext(LibraryIntegrationContext);
  if (!context) {
    throw new Error(
      'useLibraryIntegrationContext must be used within a LibraryIntegrationProvider'
    );
  }
  return context;
}

/**
 * Hook to get configuration for a specific library
 */
export function useLibraryFlags<TConfig extends Record<string, unknown>>(
  libraryId: LibraryId
): TConfig | null {
  const context = useContext(LibraryIntegrationContext);
  const [config, setConfig] = useState<TConfig | null>(null);

  useEffect(() => {
    if (!context) return;

    // Get initial config
    setConfig((context).getLibraryConfig<TConfig>(libraryId));

    // Subscribe to updates
    return (context).subscribeToLibrary<TConfig>(libraryId, (newConfig: TConfig) => {
      setConfig(newConfig);
    });
  }, [context, libraryId]);

  return config;
}

/**
 * Hook to check if a library feature is enabled
 */
export function useLibraryFeature(libraryId: LibraryId, featureKey: string): boolean {
  const config = useLibraryFlags<Record<string, unknown>>(libraryId);
  return config ? Boolean(config[featureKey]) : false;
}

/**
 * Hook to subscribe to multiple library configs
 */
export function useMultiLibraryFlags<
  TConfigs extends Record<LibraryId, Record<string, unknown>>
>(
  libraryIds: (keyof TConfigs)[]
): Partial<TConfigs> {
  const context = useContext(LibraryIntegrationContext);
  const [configs, setConfigs] = useState<Partial<TConfigs>>({});

  useEffect(() => {
    if (!context) return;

    // Get initial configs
    const initialConfigs: Partial<TConfigs> = {};
    for (const id of libraryIds) {
      const config = context.getLibraryConfig(id as LibraryId);
      if (config) {
        initialConfigs[id] = config as TConfigs[typeof id];
      }
    }
    setConfigs(initialConfigs);

    // Subscribe to all
    const unsubscribers = libraryIds.map((id) =>
      context.subscribeToLibrary(id as LibraryId, (newConfig) => {
        setConfigs((prev) => ({
          ...prev,
          [id]: newConfig,
        }));
      })
    );

    return () => {
      for (const unsub of unsubscribers) {
        unsub();
      }
    };
  }, [context, libraryIds]);

  return configs;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a simple flag-to-boolean config integration
 */
export function createSimpleIntegration(
  libraryId: LibraryId,
  flagKeys: string[]
): LibraryIntegration<Record<string, boolean>> {
  const defaultConfig: Record<string, boolean> = {};
  const flagMappings: FlagMapping<Record<string, boolean>> = {};

  for (const flagKey of flagKeys) {
    // Convert flag key to config key (e.g., 'api-retry-enabled' -> 'retryEnabled')
    const configKey = flagKey
      .split('-')
      .filter((_, i) => i > 0) // Remove library prefix
      .map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
      .join('');

    defaultConfig[configKey || flagKey] = false;
    (flagMappings as Record<string, string>)[flagKey] = configKey || flagKey;
  }

  return createLibraryIntegration({
    libraryId,
    defaultConfig,
    flagMappings,
  });
}

/**
 * Batch register multiple integrations
 */
export function registerIntegrations(
  integrations: LibraryIntegration<Record<string, unknown>>[]
): () => void {
  for (const integration of integrations) {
    integrationRegistry.register(integration);
  }

  return () => {
    for (const integration of integrations) {
      integrationRegistry.unregister(integration.libraryId);
    }
  };
}

/**
 * Create a flag impact report across all libraries
 */
export function createFlagImpactReport(flagKey: string): {
  affectedLibraries: LibraryId[];
  configChanges: Record<LibraryId, Record<string, unknown>>;
} {
  const affectedLibraries = integrationRegistry.getAffectedLibraries(flagKey);
  const configChanges: Record<LibraryId, Record<string, unknown>> = {};

  for (const libraryId of affectedLibraries) {
    const integration = integrationRegistry.get(libraryId);
    if (integration) {
      const withFlag = integration.getConfig({ [flagKey]: true });
      const withoutFlag = integration.getConfig({ [flagKey]: false });

      const changes: Record<string, unknown> = {};
      for (const key of Object.keys(withFlag)) {
        if (withFlag[key] !== withoutFlag[key]) {
          changes[key] = { from: withoutFlag[key], to: withFlag[key] };
        }
      }

      if (Object.keys(changes).length > 0) {
        configChanges[libraryId] = changes;
      }
    }
  }

  return { affectedLibraries, configChanges };
}



