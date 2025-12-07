/**
 * @fileoverview React hooks for the centralized library configuration system.
 *
 * These hooks provide easy access to library configuration with:
 * - Automatic re-rendering on configuration changes
 * - Type-safe configuration access
 * - Memoization for performance
 *
 * @module core/config/hooks
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  AuthConfig,
  CacheConfig,
  ConfigChangeEvent,
  ConfigPath,
  DeepReadonly,
  FeatureFlagsConfig,
  LayoutsConfig,
  LibraryConfig,
  MonitoringConfig,
  NetworkConfig,
  UIConfig,
  VDOMConfig,
} from '../types';

import {
  getConfigRegistry,
  getLibConfig,
  getLibConfigValue,
  setLibConfigValue,
  subscribeToLibConfig,
} from '../registry/ConfigRegistry';

import { getRuntimeConfigManager } from '../runtime/RuntimeConfigManager';

// =============================================================================
// Core Configuration Hook
// =============================================================================

/**
 * Hook to access the complete library configuration.
 *
 * Re-renders when any configuration value changes.
 *
 * @returns The complete library configuration object
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const config = useLibConfig();
 *   return <div>Timeout: {config.network.defaultTimeout}ms</div>;
 * }
 * ```
 */
export function useLibConfig(): DeepReadonly<LibraryConfig> {
  const [config, setConfig] = useState(() => getLibConfig());

  useEffect(() => {


    return subscribeToLibConfig(() => {
      setConfig(getLibConfig());
    });
  }, []);

  return config;
}

// =============================================================================
// Typed Domain Hooks
// =============================================================================

/**
 * Hook to access network configuration.
 */
export function useNetworkConfig(): DeepReadonly<NetworkConfig> {
  const config = useLibConfig();
  return config.network;
}

/**
 * Hook to access cache configuration.
 */
export function useCacheConfig(): DeepReadonly<CacheConfig> {
  const config = useLibConfig();
  return config.cache;
}

/**
 * Hook to access feature flags configuration.
 */
export function useFlagsConfig(): DeepReadonly<FeatureFlagsConfig> {
  const config = useLibConfig();
  return config.flags;
}

/**
 * Hook to access authentication configuration.
 */
export function useAuthConfig(): DeepReadonly<AuthConfig> {
  const config = useLibConfig();
  return config.auth;
}

/**
 * Hook to access layouts configuration.
 */
export function useLayoutsConfig(): DeepReadonly<LayoutsConfig> {
  const config = useLibConfig();
  return config.layouts;
}

/**
 * Hook to access VDOM configuration.
 */
export function useVDOMConfig(): DeepReadonly<VDOMConfig> {
  const config = useLibConfig();
  return config.vdom;
}

/**
 * Hook to access UI configuration.
 */
export function useUIConfig(): DeepReadonly<UIConfig> {
  const config = useLibConfig();
  return config.ui;
}

/**
 * Hook to access monitoring configuration.
 */
export function useMonitoringConfig(): DeepReadonly<MonitoringConfig> {
  const config = useLibConfig();
  return config.monitoring;
}

// =============================================================================
// Path-Based Hooks
// =============================================================================

/**
 * Hook to access a specific configuration value by path.
 *
 * Only re-renders when the specific path changes.
 *
 * @param path - Dot-notation path to the config value
 * @param defaultValue - Default value if path doesn't exist
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const timeout = useLibConfigValue('network.defaultTimeout', 30000);
 *   return <div>Timeout: {timeout}ms</div>;
 * }
 * ```
 */
export function useLibConfigValue<T>(path: ConfigPath, defaultValue?: T): T {
  const [value, setValue] = useState(() => getLibConfigValue(path, defaultValue));

  useEffect(() => {
    const registry = getConfigRegistry();


    return registry.subscribeToPath(path, () => {
      setValue(getLibConfigValue(path, defaultValue));
    });
  }, [path, defaultValue]);

  return value;
}

/**
 * Hook to access and set a configuration value.
 *
 * Returns a tuple of [value, setValue].
 *
 * @param path - Dot-notation path to the config value
 * @param defaultValue - Default value if path doesn't exist
 *
 * @example
 * ```tsx
 * function SettingsPanel() {
 *   const [timeout, setTimeout] = useLibConfigState('network.defaultTimeout', 30000);
 *
 *   return (
 *     <input
 *       type="number"
 *       value={timeout}
 *       onChange={(e) => setTimeout(Number(e.target.value))}
 *     />
 *   );
 * }
 * ```
 */
export function useLibConfigState<T>(path: ConfigPath, defaultValue?: T): [T, (value: T) => void] {
  const value = useLibConfigValue(path, defaultValue);

  const setValue = useCallback(
    (newValue: T) => {
      setLibConfigValue(path, newValue);
    },
    [path]
  );

  return [value, setValue];
}

// =============================================================================
// Runtime Configuration Hooks
// =============================================================================

/**
 * Hook to access runtime configuration manager.
 *
 * @example
 * ```tsx
 * function ConfigManager() {
 *   const runtime = useRuntimeConfig();
 *
 *   const handleRollback = () => {
 *     runtime.rollback();
 *   };
 *
 *   return <button onClick={handleRollback}>Rollback</button>;
 * }
 * ```
 */
export function useRuntimeConfig(): {
  manager: ReturnType<typeof getRuntimeConfigManager>;
  set: (path: ConfigPath, value: unknown) => void;
  rollback: () => boolean;
  createSnapshot: (reason?: string) => void;
  enablePersistence: (storageKey?: string) => void;
  disablePersistence: () => void;
} {
  const manager = useMemo(() => getRuntimeConfigManager(), []);

  const set = useCallback(
    (path: ConfigPath, value: unknown) => {
      manager.set(path, value);
    },
    [manager]
  );

  const rollback = useCallback(() => {
    return manager.rollback();
  }, [manager]);

  const createSnapshot = useCallback(
    (reason?: string) => {
      manager.createSnapshot(reason);
    },
    [manager]
  );

  const enablePersistence = useCallback(
    (storageKey?: string) => {
      manager.enablePersistence(storageKey);
    },
    [manager]
  );

  const disablePersistence = useCallback(() => {
    manager.disablePersistence();
  }, [manager]);

  return {
    manager,
    set,
    rollback,
    createSnapshot,
    enablePersistence,
    disablePersistence,
  };
}

// =============================================================================
// Change Tracking Hooks
// =============================================================================

/**
 * Hook to track configuration changes.
 *
 * @param onChangeCallback - Callback to invoke when config changes
 *
 * @example
 * ```tsx
 * function ConfigWatcher() {
 *   useConfigChangeTracking((event) => {
 *     console.log(`${event.path} changed from ${event.previousValue} to ${event.newValue}`);
 *   });
 *
 *   return null;
 * }
 * ```
 */
export function useConfigChangeTracking(
  onChangeCallback: (event: ConfigChangeEvent) => void
): void {
  useEffect(() => {

    return subscribeToLibConfig(onChangeCallback);
  }, [onChangeCallback]);
}

/**
 * Hook to get the last configuration change.
 */
export function useLastConfigChange(): ConfigChangeEvent | null {
  const [lastChange, setLastChange] = useState<ConfigChangeEvent | null>(null);

  useEffect(() => {


    return subscribeToLibConfig((event) => {
      setLastChange(event);
    });
  }, []);

  return lastChange;
}

// =============================================================================
// Selector Hooks
// =============================================================================

/**
 * Hook to select and transform configuration values.
 *
 * @param selector - Function to select/transform config
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const timeouts = useLibConfigSelector((config) => ({
 *     default: config.network.defaultTimeout,
 *     long: config.network.longTimeout,
 *     short: config.network.shortTimeout,
 *   }));
 *
 *   return <div>Default timeout: {timeouts.default}ms</div>;
 * }
 * ```
 */
export function useLibConfigSelector<T>(selector: (config: DeepReadonly<LibraryConfig>) => T): T {
  const config = useLibConfig();
  return useMemo(() => selector(config), [config, selector]);
}

// =============================================================================
// Utility Hooks
// =============================================================================

/**
 * Hook to check if a configuration path exists.
 */
export function useLibConfigExists(path: ConfigPath): boolean {
  const [exists, setExists] = useState(() => getConfigRegistry().has(path));

  useEffect(() => {


    return subscribeToLibConfig(() => {
      setExists(getConfigRegistry().has(path));
    });
  }, [path]);

  return exists;
}

/**
 * Hook to get all configuration paths.
 */
export function useLibConfigPaths(): string[] {
  const [paths, setPaths] = useState<string[]>(() => getConfigRegistry().getAllPaths());

  useEffect(() => {


    return subscribeToLibConfig(() => {
      setPaths(getConfigRegistry().getAllPaths());
    });
  }, []);

  return paths;
}

/**
 * Hook to get the configuration environment.
 */
export function useLibConfigEnvironment(): string {
  const [env, setEnv] = useState(() => getConfigRegistry().getEnvironment());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) {
      queueMicrotask(() => {
        initializedRef.current = true;
        const currentEnv = getConfigRegistry().getEnvironment();
        if (currentEnv !== env) {
          setEnv(currentEnv);
        }
      });
    }
  }, [env]);

  return env;
}
