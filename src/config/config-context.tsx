/**
 * @file Configuration Context
 * @description React context for configuration access (separated for Fast Refresh).
 *
 * @module config/config-context
 */

import { createContext } from 'react';
import type {
  ConfigNamespace,
  ConfigRecord,
  ConfigValue,
  ConfigChangeListener,
  ConfigUnsubscribe,
  DynamicConfigState,
  ConfigValidationStatus,
} from './types';
import type { ConfigRegistry } from './config-registry';
import type { DynamicConfigManager } from './dynamic-config';

// =============================================================================
// Context Types
// =============================================================================

/**
 * Configuration context value interface
 */
export interface ConfigContextValue {
  /** Get configuration value */
  get: <T extends ConfigValue>(namespace: ConfigNamespace, key: string) => T | undefined;

  /** Get all configuration for a namespace */
  getNamespace: <T extends ConfigRecord>(namespace: ConfigNamespace) => T;

  /** Check if configuration key exists */
  has: (namespace: ConfigNamespace, key: string) => boolean;

  /** Subscribe to configuration changes */
  subscribe: (
    namespace: ConfigNamespace,
    key: string,
    listener: ConfigChangeListener
  ) => ConfigUnsubscribe;

  /** Get validation status for all configurations */
  getValidationStatus: () => ConfigValidationStatus;

  /** Dynamic configuration state */
  dynamicState: DynamicConfigState;

  /** Refresh dynamic configuration */
  refresh: () => Promise<void>;

  /** Configuration initialized state */
  isInitialized: boolean;

  /** Configuration registry instance (for advanced use) */
  registry: ConfigRegistry;

  /** Dynamic configuration manager */
  dynamicConfig: DynamicConfigManager;
}

/**
 * Default context value (throws if used outside provider)
 */
export const defaultContextValue: ConfigContextValue = {
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
  refresh: () => {
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

/**
 * Configuration context instance
 */
export const ConfigContext = createContext<ConfigContextValue>(defaultContextValue);

ConfigContext.displayName = 'ConfigContext';
