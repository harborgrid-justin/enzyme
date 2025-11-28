/**
 * @file Configuration Provider
 * @description React context provider for configuration access and subscriptions.
 *
 * This module provides:
 * - React context for configuration
 * - Configuration change subscriptions
 * - Type-safe configuration access
 * - Dynamic configuration state
 *
 * @module config/ConfigProvider
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useCallback,
  useState,
  type ReactNode,
} from 'react';
import type {
  ConfigNamespace,
  ConfigRecord,
  ConfigValue,
  ConfigChangeListener,
  ConfigUnsubscribe,
  DynamicConfigState,
  ConfigValidationStatus,
  ConfigValidationResult as _ConfigValidationResult,
} from './types';
import { getConfigRegistry, type ConfigRegistry } from './config-registry';
import {
  getDynamicConfig,
  initializeDynamicConfig,
  type DynamicConfigManager,
} from './dynamic-config';
import { initializeConfigDiscovery } from './config-discovery';
import { env } from './env';

// =============================================================================
// Context Types
// =============================================================================

/**
 * Configuration context value interface
 */
export interface ConfigContextValue {
  /** Get configuration value */
  get: <T extends ConfigValue>(namespace: ConfigNamespace, key: string) => T | undefined;
  /** Get entire namespace configuration */
  getNamespace: <T extends ConfigRecord>(namespace: ConfigNamespace) => Readonly<T>;
  /** Check if configuration exists */
  has: (namespace: ConfigNamespace, key: string) => boolean;
  /** Subscribe to configuration changes */
  subscribe: (
    namespace: ConfigNamespace,
    key: string,
    listener: ConfigChangeListener
  ) => ConfigUnsubscribe;
  /** Get validation status */
  getValidationStatus: () => ConfigValidationStatus;
  /** Dynamic configuration state */
  dynamicState: DynamicConfigState;
  /** Force refresh configuration from remote */
  refresh: () => Promise<void>;
  /** Check if configuration is initialized */
  isInitialized: boolean;
  /** Configuration registry instance (for advanced use) */
  registry: ConfigRegistry;
  /** Dynamic config manager instance (for advanced use) */
  dynamicConfig: DynamicConfigManager;
}

/**
 * Default context value (throws if used outside provider)
 */
const defaultContextValue: ConfigContextValue = {
  get: () => {
    throw new Error('ConfigProvider not found. Wrap your app with <ConfigProvider>.');
  },
  getNamespace: () => {
    throw new Error('ConfigProvider not found. Wrap your app with <ConfigProvider>.');
  },
  has: () => {
    throw new Error('ConfigProvider not found. Wrap your app with <ConfigProvider>.');
  },
  subscribe: () => {
    throw new Error('ConfigProvider not found. Wrap your app with <ConfigProvider>.');
  },
  getValidationStatus: () => {
    throw new Error('ConfigProvider not found. Wrap your app with <ConfigProvider>.');
  },
  dynamicState: {
    initialized: false,
    syncing: false,
    connectionStatus: 'disconnected',
  },
  refresh: async () => {
    throw new Error('ConfigProvider not found. Wrap your app with <ConfigProvider>.');
  },
  isInitialized: false,
  // Default values that throw when accessed - these are replaced by actual instances in the provider
  get registry(): ConfigRegistry {
    throw new Error('ConfigProvider not found. Cannot access registry.');
  },
  get dynamicConfig(): DynamicConfigManager {
    throw new Error('ConfigProvider not found. Cannot access dynamicConfig.');
  },
};

// =============================================================================
// Context Creation
// =============================================================================

/**
 * Configuration context
 */
export const ConfigContext = createContext<ConfigContextValue>(defaultContextValue);

/**
 * Display name for React DevTools
 */
ConfigContext.displayName = 'ConfigContext';

// =============================================================================
// Provider Props
// =============================================================================

/**
 * Configuration provider props
 */
export interface ConfigProviderProps {
  /** Child components */
  children: ReactNode;
  /** Initial configuration to load */
  initialConfig?: Record<string, ConfigRecord>;
  /** Skip initialization (for testing) */
  skipInitialization?: boolean;
  /** Loading component to show during initialization */
  loadingComponent?: ReactNode;
  /** Error component to show on initialization failure */
  errorComponent?: (error: Error) => ReactNode;
  /** Callback when initialization completes */
  onInitialized?: () => void;
  /** Callback on initialization error */
  onError?: (error: Error) => void;
}

// =============================================================================
// Provider Component
// =============================================================================

/**
 * Configuration Provider Component
 *
 * Provides configuration context to the entire application.
 * Handles initialization of the configuration system including:
 * - Configuration registry
 * - Dynamic configuration
 * - Configuration discovery
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <ConfigProvider
 *       loadingComponent={<LoadingSpinner />}
 *       onInitialized={() => console.log('Config ready')}
 *     >
 *       <MyApp />
 *     </ConfigProvider>
 *   );
 * }
 * ```
 */
export function ConfigProvider({
  children,
  initialConfig,
  skipInitialization = false,
  loadingComponent,
  errorComponent,
  onInitialized,
  onError,
}: ConfigProviderProps): React.ReactElement {
  const [isInitialized, setIsInitialized] = useState(skipInitialization);
  const [initError, setInitError] = useState<Error | null>(null);
  const [dynamicState, setDynamicState] = useState<DynamicConfigState>({
    initialized: false,
    syncing: false,
    connectionStatus: 'disconnected',
  });

  // Get singleton instances
  const registry = useMemo(() => getConfigRegistry(), []);
  const dynamicConfig = useMemo(() => getDynamicConfig(), []);

  // Initialize configuration system
  useEffect(() => {
    if (skipInitialization) {
      return;
    }

    let mounted = true;

    const initialize = async () => {
      try {
        // Load initial config if provided
        if (initialConfig) {
          registry.import(initialConfig, { source: 'default' });
        }

        // Initialize configuration discovery
        await initializeConfigDiscovery();

        // Initialize dynamic configuration
        await initializeDynamicConfig();

        if (mounted) {
          setIsInitialized(true);
          onInitialized?.();
        }
      } catch (error) {
        if (mounted) {
          const err = error instanceof Error ? error : new Error(String(error));
          setInitError(err);
          onError?.(err);
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [skipInitialization, initialConfig, registry, onInitialized, onError]);

  // Subscribe to dynamic config state changes
  useEffect(() => {
    const unsubscribe = dynamicConfig.subscribeToState((state) => {
      setDynamicState(state);
    });

    // Get initial state
    setDynamicState(dynamicConfig.getState());

    return unsubscribe;
  }, [dynamicConfig]);

  // Context value callbacks
  const get = useCallback(
    <T extends ConfigValue>(namespace: ConfigNamespace, key: string): T | undefined => {
      return registry.get<T>(namespace, key);
    },
    [registry]
  );

  const getNamespace = useCallback(
    <T extends ConfigRecord>(namespace: ConfigNamespace): Readonly<T> => {
      return registry.getNamespaceConfig<T>(namespace) as Readonly<T>;
    },
    [registry]
  );

  const has = useCallback(
    (namespace: ConfigNamespace, key: string): boolean => {
      return registry.has(namespace, key);
    },
    [registry]
  );

  const subscribe = useCallback(
    (
      namespace: ConfigNamespace,
      key: string,
      listener: ConfigChangeListener
    ): ConfigUnsubscribe => {
      return registry.subscribe(namespace, key, listener);
    },
    [registry]
  );

  const getValidationStatus = useCallback((): ConfigValidationStatus => {
    const allResults = registry.validateAll();
    let errorCount = 0;
    let warningCount = 0;
    const namespaces: ConfigValidationStatus['namespaces'] = {};

    allResults.forEach((results, namespace) => {
      const nsErrors = results.flatMap((r) => r.errors ?? []);
      const nsWarnings = results.flatMap((r) => r.warnings ?? []);

      errorCount += nsErrors.length;
      warningCount += nsWarnings.length;

      namespaces[namespace as string] = {
        valid: nsErrors.length === 0,
        errors: nsErrors,
        warnings: nsWarnings,
      };
    });

    return {
      valid: errorCount === 0,
      errorCount,
      warningCount,
      namespaces,
      validatedAt: new Date().toISOString(),
    };
  }, [registry]);

  const refresh = useCallback(async (): Promise<void> => {
    await dynamicConfig.forceRefresh();
  }, [dynamicConfig]);

  // Memoize context value
  const contextValue = useMemo<ConfigContextValue>(
    () => ({
      get,
      getNamespace,
      has,
      subscribe,
      getValidationStatus,
      dynamicState,
      refresh,
      isInitialized,
      registry,
      dynamicConfig,
    }),
    [
      get,
      getNamespace,
      has,
      subscribe,
      getValidationStatus,
      dynamicState,
      refresh,
      isInitialized,
      registry,
      dynamicConfig,
    ]
  );

  // Handle initialization error
  if (initError) {
    if (errorComponent) {
      return <>{errorComponent(initError)}</>;
    }
    // Re-throw in development for debugging
    if (env.isDev) {
      throw initError;
    }
    // Silent fail in production
    return <>{children}</>;
  }

  // Show loading state
  if (!isInitialized && loadingComponent) {
    return <>{loadingComponent}</>;
  }

  return (
    <ConfigContext.Provider value={contextValue}>
      {children}
    </ConfigContext.Provider>
  );
}

// =============================================================================
// Context Hook
// =============================================================================

/**
 * Hook to access the configuration context
 *
 * @returns Configuration context value
 * @throws Error if used outside ConfigProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const config = useConfigContext();
 *   const value = config.get(CONFIG_NAMESPACES.STREAMING, 'bufferSize');
 *   return <div>Buffer size: {value}</div>;
 * }
 * ```
 */
export function useConfigContext(): ConfigContextValue {
  const context = useContext(ConfigContext);

  if (context === defaultContextValue) {
    throw new Error(
      'useConfigContext must be used within a ConfigProvider. ' +
        'Make sure to wrap your app with <ConfigProvider>.'
    );
  }

  return context;
}

// =============================================================================
// Utility Components
// =============================================================================

/**
 * Component that renders only when configuration is initialized
 */
export function ConfigReady({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}): React.ReactElement | null {
  const { isInitialized } = useConfigContext();

  if (!isInitialized) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

/**
 * Component that conditionally renders based on feature flag
 */
export function FeatureFlag({
  flag,
  children,
  fallback,
}: {
  flag: string;
  children: ReactNode;
  fallback?: ReactNode;
}): React.ReactElement | null {
  const { dynamicConfig } = useConfigContext();
  const isEnabled = dynamicConfig.isFlagEnabled(flag);

  if (!isEnabled) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

/**
 * Component that renders based on A/B test variant
 */
export function ABTest({
  testId,
  userId,
  variants,
  fallback,
}: {
  testId: string;
  userId?: string;
  variants: Record<string, ReactNode>;
  fallback?: ReactNode;
}): React.ReactElement | null {
  const { dynamicConfig } = useConfigContext();
  const variant = dynamicConfig.getVariant(testId, userId);

  if (!variant) {
    return fallback ? <>{fallback}</> : null;
  }

  const content = variants[variant.id];
  if (!content) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{content}</>;
}

// =============================================================================
// HOC for Configuration Access
// =============================================================================

/**
 * Higher-order component for injecting configuration props
 *
 * @param WrappedComponent - Component to wrap
 * @param namespace - Configuration namespace
 * @returns Wrapped component with config props
 *
 * @example
 * ```tsx
 * interface MyComponentProps {
 *   config: StreamingConfig;
 * }
 *
 * function MyComponent({ config }: MyComponentProps) {
 *   return <div>Buffer: {config.buffer.initialSize}</div>;
 * }
 *
 * export default withConfig(MyComponent, CONFIG_NAMESPACES.STREAMING);
 * ```
 */
export function withConfig<P extends { config: ConfigRecord }, T extends ConfigRecord>(
  WrappedComponent: React.ComponentType<P>,
  namespace: ConfigNamespace
): React.ComponentType<Omit<P, 'config'>> {
  function WithConfigComponent(props: Omit<P, 'config'>): React.ReactElement {
    const { getNamespace } = useConfigContext();
    const config = getNamespace<T>(namespace);

    return <WrappedComponent {...(props as P)} config={config} />;
  }

  WithConfigComponent.displayName = `withConfig(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithConfigComponent;
}

// =============================================================================
// Exports
// =============================================================================

export type { ConfigValidationStatus };
