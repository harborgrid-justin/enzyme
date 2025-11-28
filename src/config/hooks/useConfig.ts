/**
 * @file useConfig Hook
 * @description Hook for accessing configuration from a namespace with subscription support.
 *
 * @module config/hooks/useConfig
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import type {
  ConfigNamespace,
  ConfigRecord,
  ConfigChangeEvent,
  DeepReadonly,
} from '../types';
import { useConfigContext } from '../ConfigProvider';

/**
 * Options for the useConfig hook
 */
export interface UseConfigOptions {
  /** Whether to subscribe to changes (default: true) */
  subscribe?: boolean;
  /** Selector function to extract specific values */
  selector?: <T extends ConfigRecord>(config: T) => Partial<T>;
  /** Comparison function for determining re-renders */
  isEqual?: <T>(prev: T, next: T) => boolean;
}

/**
 * Return type for useConfig hook
 */
export interface UseConfigResult<T extends ConfigRecord> {
  /** Current configuration */
  config: DeepReadonly<T>;
  /** Whether config is loading */
  isLoading: boolean;
  /** Last update timestamp */
  lastUpdated: string | null;
  /** Force refresh the config */
  refresh: () => void;
}

/**
 * Default shallow equality check
 */
function shallowEqual<T extends ConfigRecord>(prev: T, next: T): boolean {
  const prevKeys = Object.keys(prev);
  const nextKeys = Object.keys(next);

  if (prevKeys.length !== nextKeys.length) {
    return false;
  }

  for (const key of prevKeys) {
    if (prev[key] !== next[key]) {
      return false;
    }
  }

  return true;
}

/**
 * Hook for accessing configuration from a namespace
 *
 * Provides reactive access to configuration with automatic
 * subscription to changes.
 *
 * @param namespace - Configuration namespace
 * @param options - Hook options
 * @returns Configuration result
 *
 * @example
 * ```tsx
 * function StreamingSettings() {
 *   const { config, isLoading } = useConfig<StreamingConfig>(
 *     CONFIG_NAMESPACES.STREAMING
 *   );
 *
 *   if (isLoading) return <LoadingSpinner />;
 *
 *   return (
 *     <div>
 *       <p>Buffer Size: {config.buffer?.initialSize}</p>
 *       <p>Enabled: {config.enabled ? 'Yes' : 'No'}</p>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With selector for optimized re-renders
 * function BufferSizeDisplay() {
 *   const { config } = useConfig<StreamingConfig>(
 *     CONFIG_NAMESPACES.STREAMING,
 *     {
 *       selector: (c) => ({ bufferSize: c.buffer?.initialSize }),
 *     }
 *   );
 *
 *   return <span>Buffer: {config.bufferSize}</span>;
 * }
 * ```
 */
export function useConfig<T extends ConfigRecord>(
  namespace: ConfigNamespace,
  options: UseConfigOptions = {}
): UseConfigResult<T> {
  const { subscribe: shouldSubscribe = true, selector, isEqual = shallowEqual } = options;
  const { getNamespace, subscribe, isInitialized } = useConfigContext();

  // Track previous config for equality check
  const prevConfigRef = useRef<DeepReadonly<T> | null>(null);

  // Get initial config
  const getConfig = useCallback((): DeepReadonly<T> => {
    const fullConfig = getNamespace<T>(namespace);
    if (selector !== undefined && selector !== null) {
      return selector(fullConfig) as DeepReadonly<T>;
    }
    return fullConfig;
  }, [getNamespace, namespace, selector]);

  const [config, setConfig] = useState<DeepReadonly<T>>(getConfig);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Subscribe to changes
  useEffect(() => {
    if (!shouldSubscribe) {
      return;
    }

    const handleChange = (event: ConfigChangeEvent): void => {
      const newConfig = getConfig();

      // Only update if config actually changed
      if (!prevConfigRef.current || !isEqual(prevConfigRef.current, newConfig)) {
        prevConfigRef.current = newConfig;
        setConfig(newConfig);
        setLastUpdated(event.timestamp);
      }
    };

    // Subscribe to all changes in the namespace
    const unsubscribe = subscribe(namespace, '*', handleChange);

    return unsubscribe;
  }, [namespace, subscribe, shouldSubscribe, getConfig, isEqual]);

  // Sync with context when initialized
  const initializedRef = useRef(false);
  useEffect(() => {
    if (isInitialized && !initializedRef.current) {
      initializedRef.current = true;
      const newConfig = getConfig();
      prevConfigRef.current = newConfig;
      setConfig(newConfig);
    }
  }, [isInitialized, getConfig]);

  // Refresh function
  const refresh = useCallback(() => {
    const newConfig = getConfig();
    prevConfigRef.current = newConfig;
    setConfig(newConfig);
    setLastUpdated(new Date().toISOString());
  }, [getConfig]);

  return {
    config,
    isLoading: !isInitialized,
    lastUpdated,
    refresh,
  };
}

/**
 * Hook for accessing configuration with automatic type inference
 *
 * @param namespace - Configuration namespace
 * @returns Configuration object
 *
 * @example
 * ```tsx
 * const streaming = useConfigNamespace<StreamingConfig>(CONFIG_NAMESPACES.STREAMING);
 * console.log(streaming.enabled);
 * ```
 */
export function useConfigNamespace<T extends ConfigRecord>(
  namespace: ConfigNamespace
): DeepReadonly<T> {
  const { config } = useConfig<T>(namespace);
  return config;
}

export default useConfig;
