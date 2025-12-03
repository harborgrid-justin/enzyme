/**
 * @fileoverview React hooks for configuration access.
 *
 * Provides convenient hooks for:
 * - Accessing configuration values
 * - Subscribing to changes
 * - Type-safe configuration access
 *
 * @module config/useConfig
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   // Get entire config
 *   const config = useConfig();
 *
 *   // Get specific value
 *   const apiUrl = useConfigValue('api.baseUrl');
 *
 *   // Get with default
 *   const timeout = useConfigValue('api.timeout', 10000);
 *
 *   // Subscribe to changes
 *   useConfigChange('feature.enabled', (value) => {
 *     console.log('Feature enabled changed:', value);
 *   });
 * }
 * ```
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ConfigRecord, ConfigValue } from './types';
import type { ConfigChangeEvent, ConfigChange } from '../contexts/ConfigContext';
import { useConfigContext } from './ConfigProvider';

// ============================================================================
// Basic Hooks
// ============================================================================

/**
 * Hook to get the entire configuration.
 */
export function useConfig<T extends ConfigRecord = ConfigRecord>(): T {
  const { config } = useConfigContext<T>();
  return config;
}

/**
 * Hook to get a specific configuration value.
 */
export function useConfigValue<T = ConfigValue>(path: string, defaultValue?: T): T {
  const { get } = useConfigContext();
  return useMemo(() => get<T>(path, defaultValue), [get, path, defaultValue]);
}

/**
 * Hook to check if a configuration path exists.
 */
export function useHasConfig(path: string): boolean {
  const { has } = useConfigContext();
  return useMemo(() => has(path), [has, path]);
}

/**
 * Hook to get configuration loading state.
 */
export function useConfigLoading(): boolean {
  const { isLoading } = useConfigContext();
  return isLoading;
}

/**
 * Hook to get configuration error.
 */
export function useConfigError(): Error | null {
  const { error } = useConfigContext();
  return error;
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Hook to get a function to update configuration.
 */
export function useSetConfig(): (path: string, value: ConfigValue) => void {
  const { set } = useConfigContext();
  return set;
}

/**
 * Hook to get a function to reset configuration.
 */
export function useResetConfig(): () => void {
  const { reset } = useConfigContext();
  return reset;
}

/**
 * Hook to get a function to reload configuration.
 */
export function useReloadConfig(): () => Promise<void> {
  const { reload } = useConfigContext();
  return reload;
}

/**
 * Hook to get a config value with setter.
 */
export function useConfigState<T = ConfigValue>(
  path: string,
  defaultValue?: T
): [T, (value: T) => void] {
  const { get, set } = useConfigContext();

  const value = useMemo(() => get<T>(path, defaultValue), [get, path, defaultValue]);

  const setValue = useCallback(
    (newValue: T) => {
      set(path, newValue as ConfigValue);
    },
    [set, path]
  );

  return [value, setValue];
}

// ============================================================================
// Subscription Hooks
// ============================================================================

/**
 * Hook to subscribe to configuration changes.
 */
export function useConfigChange(
  path: string,
  callback: (value: ConfigValue, change: ConfigChange) => void
): void {
  const { subscribe, get } = useConfigContext();

  useEffect(() => {
    return subscribe((event: ConfigChangeEvent) => {
      if (event.type !== 'change' || !event.changes) {
        return;
      }

      for (const change of event.changes) {
        if (change.path === path || change.path.startsWith(`${path}.`)) {
          callback(get(path), change);
        }
      }
    });
  }, [subscribe, get, path, callback]);
}

/**
 * Hook to watch a config value and re-render on change.
 */
export function useWatchConfig<T = ConfigValue>(path: string, defaultValue?: T): T {
  const { get, subscribe } = useConfigContext();
  const [value, setValue] = useState<T>(() => get<T>(path, defaultValue));

  useEffect(() => {
    // Update initial value
    queueMicrotask(() => {
      setValue(get<T>(path, defaultValue));
    });

    // Subscribe to changes
    return subscribe((event: ConfigChangeEvent) => {
      if (event.type !== 'change' || !event.changes) {
        return;
      }

      for (const change of event.changes) {
        if (change.path === path || change.path.startsWith(`${path}.`)) {
          setValue(get<T>(path, defaultValue));
          break;
        }
      }
    });
  }, [subscribe, get, path, defaultValue]);

  return value;
}

// ============================================================================
// Feature Flag Integration Hooks
// ============================================================================

/**
 * Hook to check if a feature is enabled via config.
 */
export function useFeatureConfig(featureName: string): boolean {
  return useConfigValue<boolean>(`features.${featureName}`, false);
}

/**
 * Hook to get feature-specific configuration.
 */
export function useFeatureSettings<T = ConfigRecord>(featureName: string, defaultSettings?: T): T {
  return useConfigValue<T>(`features.${featureName}.settings`, defaultSettings as T);
}

// ============================================================================
// Environment Hooks
// ============================================================================

/**
 * Hook to get the current environment.
 */
export function useEnvironment(): string {
  return useConfigValue<string>('app.environment', 'development');
}

/**
 * Hook to check if running in development.
 */
export function useIsDevelopment(): boolean {
  const env = useEnvironment();
  return env === 'development';
}

/**
 * Hook to check if running in production.
 */
export function useIsProduction(): boolean {
  const env = useEnvironment();
  return env === 'production';
}

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Hook to select multiple config values.
 */
export function useConfigSelector<T extends Record<string, ConfigValue>>(
  selector: (config: ConfigRecord) => T
): T {
  const { config } = useConfigContext();
  return useMemo(() => selector(config), [config, selector]);
}

/**
 * Hook to create a derived config value.
 */
export function useConfigDerived<T>(paths: string[], derive: (...values: ConfigValue[]) => T): T {
  const { get } = useConfigContext();

  return useMemo(() => {
    const values = paths.map((path) => get(path));
    return derive(...values);
  }, [get, paths, derive]);
}

// ============================================================================
// Type-Safe Hooks
// ============================================================================

/**
 * Create a typed config hook for a specific section.
 */
export function createTypedConfigHook<T extends ConfigRecord>(basePath: string): () => T {
  return function useTypedConfig(): T {
    const { get } = useConfigContext();
    return get<T>(basePath, {} as T);
  };
}

/**
 * Create a typed config value hook for a specific section.
 */
export function createTypedValueHook<T>(path: string, defaultValue: T): () => T {
  return function useTypedValue(): T {
    return useConfigValue<T>(path, defaultValue);
  };
}

// ============================================================================
// Debug Hooks
// ============================================================================

/**
 * Hook to get all configuration paths.
 */
export function useConfigPaths(): string[] {
  const { config } = useConfigContext();

  return useMemo(() => {
    const paths: string[] = [];

    const traverse = (obj: ConfigRecord, prefix = ''): void => {
      for (const [key, value] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${key}` : key;
        paths.push(path);

        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
          traverse(value as ConfigRecord, path);
        }
      }
    };

    traverse(config);
    return paths;
  }, [config]);
}

/**
 * Hook to get configuration statistics.
 */
export function useConfigStats(): {
  totalPaths: number;
  sections: string[];
  isLoading: boolean;
  hasError: boolean;
} {
  const { config, isLoading, error } = useConfigContext();

  return useMemo(() => {
    const sections = Object.keys(config);
    let totalPaths = 0;

    const countPaths = (obj: ConfigRecord): void => {
      for (const value of Object.values(obj)) {
        totalPaths++;
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
          countPaths(value as ConfigRecord);
        }
      }
    };

    countPaths(config);

    return {
      totalPaths,
      sections,
      isLoading,
      hasError: error !== null,
    };
  }, [config, isLoading, error]);
}
