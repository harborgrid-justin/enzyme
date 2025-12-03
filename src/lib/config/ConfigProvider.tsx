/**
 * @fileoverview React configuration provider component.
 *
 * Provides configuration context to the React component tree with:
 * - Async configuration loading
 * - Error handling
 * - Hot reload support
 * - SSR compatibility
 *
 * @module config/ConfigProvider
 *
 * @example
 * ```tsx
 * <ConfigProvider
 *   config={defaultConfig}
 *   schema={configSchema}
 *   envPrefix="REACT_APP_"
 * >
 *   <App />
 * </ConfigProvider>
 * ```
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type { ConfigRecord, ConfigValue, ConfigSchema } from './types';
import { ConfigLoader } from './config-loader';
import { RuntimeConfig } from './runtime-config';
import { getValueAtPath, hasPath } from './config-merger';

// ============================================================================
// Context
// ============================================================================

/**
 * Config context value type
 */
export interface ConfigContextValue<T extends ConfigRecord = ConfigRecord> {
  config: T;
  get: <V = ConfigValue>(path: string, defaultValue?: V) => V;
  set: (path: string, value: ConfigValue) => void;
  has: (path: string) => boolean;
  reset: () => void;
  reload: () => Promise<void>;
  subscribe: (
    listener: (event: import('../contexts/ConfigContext').ConfigChangeEvent) => void
  ) => () => void;
  isLoading: boolean;
  error: Error | null;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

// ============================================================================
// Provider Props
// ============================================================================

/**
 * Props for ConfigProvider component.
 */
export interface ConfigProviderProps<T extends ConfigRecord = ConfigRecord> {
  /** Child components */
  children: ReactNode;
  /** Default configuration values */
  config: T;
  /** Configuration schema for validation */
  schema?: ConfigSchema;
  /** Environment variable prefix */
  envPrefix?: string;
  /** Remote configuration URL */
  remoteUrl?: string;
  /** Loading component */
  loadingComponent?: ReactNode;
  /** Error component */
  errorComponent?: (error: Error) => ReactNode;
  /** Enable debug logging */
  debug?: boolean;
  /** Called when configuration is loaded */
  onLoad?: (config: T) => void;
  /** Called when configuration changes */
  onChange?: (config: T) => void;
  /** Called on configuration error */
  onError?: (error: Error) => void;
}

// ============================================================================
// Provider Component
// ============================================================================

/**
 * Configuration provider component.
 */
export function ConfigProvider<T extends ConfigRecord = ConfigRecord>({
  children,
  config: defaultConfig,
  schema,
  envPrefix,
  remoteUrl,
  loadingComponent,
  errorComponent,
  debug = false,
  onLoad,
  onChange,
  onError,
}: ConfigProviderProps<T>): React.JSX.Element {
  const [config, setConfig] = useState<T>(defaultConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Create runtime config for dynamic updates
  const runtimeConfig = useMemo(
    () => new RuntimeConfig(defaultConfig, { debug }),
    [defaultConfig, debug]
  );

  // Load configuration
  useEffect(() => {
    const loadConfig = async (): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const loader = new ConfigLoader({
          envPrefix,
          remoteUrl,
          debug,
        });

        loader.addDefaultSource(defaultConfig);

        if (envPrefix != null && envPrefix !== '') {
          loader.addEnvSource();
        }

        if (remoteUrl != null && remoteUrl !== '') {
          await loader.addRemoteSource({ url: remoteUrl });
        }

        if (schema) {
          loader.setSchema(schema);
        }

        const loadedConfig = await loader.load();
        setConfig(loadedConfig as T);
        runtimeConfig.reset(loadedConfig as T);
        onLoad?.(loadedConfig as T);

        if (debug === true) {
          console.info('[ConfigProvider] Configuration loaded:', loadedConfig);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);

        if (debug) {
          console.error('[ConfigProvider] Failed to load configuration:', error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    void loadConfig();
  }, [defaultConfig, envPrefix, remoteUrl, schema, debug, onLoad, onError, runtimeConfig]);

  // Subscribe to runtime config changes
  useEffect(() => {
    return runtimeConfig.subscribe((event) => {
      if (event.type === 'change' || event.type === 'reload') {
        const newConfig = runtimeConfig.getConfig();
        setConfig(newConfig);
        onChange?.(newConfig);
      }
    });
  }, [runtimeConfig, onChange]);

  // Get value at path
  const get = useCallback(
    <V = ConfigValue,>(path: string, defaultValue?: V): V => {
      return getValueAtPath<V>(config, path, defaultValue);
    },
    [config]
  );

  // Check if path exists
  const has = useCallback(
    (path: string): boolean => {
      return hasPath(config, path);
    },
    [config]
  );

  // Set value at path
  const set = useCallback(
    (path: string, value: ConfigValue): void => {
      runtimeConfig.set(path, value);
    },
    [runtimeConfig]
  );

  // Reset to defaults
  const reset = useCallback(() => {
    runtimeConfig.reset(defaultConfig);
  }, [runtimeConfig, defaultConfig]);

  // Reload configuration
  const reload = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const loader = new ConfigLoader({ envPrefix, remoteUrl, debug });
      loader.addDefaultSource(defaultConfig);

      if (envPrefix != null && envPrefix !== '') {
        loader.addEnvSource();
      }

      if (remoteUrl != null && remoteUrl !== '') {
        await loader.addRemoteSource({ url: remoteUrl });
      }

      if (schema) {
        loader.setSchema(schema);
      }

      const loadedConfig = await loader.load();
      setConfig(loadedConfig as T);
      runtimeConfig.reset(loadedConfig as T);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [defaultConfig, envPrefix, remoteUrl, schema, debug, onError, runtimeConfig]);

  // Subscribe to changes
  const subscribe = useCallback(
    (
      listener: (event: import('../contexts/ConfigContext').ConfigChangeEvent) => void
    ): (() => void) => {
      return runtimeConfig.subscribe((event) => {
        // Convert ConfigEvent to ConfigChangeEvent
        // Map event types: 'error' events are not exposed to the context listener
        if (event.type === 'change' || event.type === 'reload') {
          const mappedChanges =
            event.type === 'change' && event.changes
              ? event.changes.map((c) => ({
                  path: c.path,
                  oldValue: c.previousValue ?? null,
                  newValue: c.newValue,
                }))
              : undefined;
          listener({
            type: event.type === 'reload' ? 'reload' : 'change',
            changes: mappedChanges,
          });
        }
      });
    },
    [runtimeConfig]
  );

  // Context value
  const value: ConfigContextValue<T> = useMemo(
    () => ({
      config,
      isLoading,
      error,
      get,
      has,
      set,
      reset,
      reload,
      subscribe,
    }),
    [config, isLoading, error, get, has, set, reset, reload, subscribe]
  );

  // Render loading state
  if (isLoading && loadingComponent != null) {
    return <>{loadingComponent}</>;
  }

  // Render error state
  if (error != null && errorComponent != null) {
    return <>{errorComponent(error)}</>;
  }

  return (
    <ConfigContext.Provider value={value as ConfigContextValue}>{children}</ConfigContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access the configuration context.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useConfigContext<T extends ConfigRecord = ConfigRecord>(): ConfigContextValue<T> {
  const context = useContext(ConfigContext);
  if (context == null) {
    throw new Error('useConfigContext must be used within a ConfigProvider');
  }
  return context as ConfigContextValue<T>;
}

/**
 * Hook to access configuration context optionally.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useOptionalConfigContext<
  T extends ConfigRecord = ConfigRecord,
>(): ConfigContextValue<T> | null {
  return useContext(ConfigContext) as ConfigContextValue<T> | null;
}

// ============================================================================
// HOC
// ============================================================================

/**
 * HOC to inject configuration as props.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function withConfig<P extends object, T extends ConfigRecord = ConfigRecord>(
  Component: React.ComponentType<P & { config: ConfigContextValue<T> }>
): React.FC<P> {
  return function WithConfig(props: P) {
    const config = useConfigContext<T>();
    return <Component {...props} config={config} />;
  };
}

// ============================================================================
// Exports
// ============================================================================

export { ConfigContext };
