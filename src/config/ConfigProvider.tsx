/**
 * @file Configuration Provider
 * @description React context provider for configuration access and subscriptions.
 *
 * This module provides:
 * - React context provider for configuration
 * - Configuration change subscriptions
 * - Type-safe configuration access
 * - Dynamic configuration state
 *
 * @module config/ConfigProvider
 */

import React, {
  useEffect,
  useMemo,
  useCallback,
  useState,
  useRef,
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
import { getConfigRegistry } from './config-registry';
import {
  getDynamicConfig,
  initializeDynamicConfig,
} from './dynamic-config';
import { initializeConfigDiscovery } from './config-discovery';
import { env } from './env';
import { ConfigContext, type ConfigContextValue } from './config-context';

// Re-export from separate modules for convenience
export { ConfigReady, FeatureFlag, ABTest } from './config-components';
export { withConfig } from './with-config';
export { useConfigContext } from './use-config-context';
export type { ConfigContextValue } from './config-context';

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

  // Get singleton instances
  const registry = useMemo(() => getConfigRegistry(), []);
  const dynamicConfig = useMemo(() => getDynamicConfig(), []);

  // Initialize dynamic state from config once
  const initialDynamicState = useMemo(() => dynamicConfig.getState(), [dynamicConfig]);
  const [dynamicState, setDynamicState] = useState<DynamicConfigState>(initialDynamicState);

  // Initialize configuration system
  useEffect(() => {
    if (skipInitialization) {
      return;
    }

    let mounted = true;

    const initialize = async (): Promise<void> => {
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

    void initialize();

    return () => {
      mounted = false;
    };
  }, [skipInitialization, initialConfig, registry, onInitialized, onError]);

  // Subscribe to dynamic config state changes
  useEffect(() => {
    const unsubscribe = dynamicConfig.subscribeToState((state) => {
      setDynamicState(state);
    });

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
    <T extends ConfigRecord>(namespace: ConfigNamespace): T => {
      return registry.getNamespaceConfig<T>(namespace) as T;
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
  if (!isInitialized && loadingComponent != null) {
    return <>{loadingComponent}</>;
  }

  return (
    <ConfigContext.Provider value={contextValue}>
      {children}
    </ConfigContext.Provider>
  );
}

ConfigProvider.displayName = 'ConfigProvider';

// =============================================================================
// Exports
// =============================================================================

export type { ConfigValidationStatus };

