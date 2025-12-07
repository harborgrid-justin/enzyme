/**
 * @file Config Context
 * @description Context for configuration management (Fast Refresh compliant).
 */

import { createContext } from 'react';

/**
 * Configuration value type
 */
export type ConfigValue =
  | string
  | number
  | boolean
  | null
  | ConfigValue[]
  | { [key: string]: ConfigValue };

/**
 * Configuration record
 */
export type ConfigRecord = Record<string, ConfigValue>;

/**
 * Config context value
 */
export interface ConfigContextValue<T extends ConfigRecord = ConfigRecord> {
  config: T;
  get: <V = ConfigValue>(path: string, defaultValue?: V) => V;
  set: (path: string, value: ConfigValue) => void;
  has: (path: string) => boolean;
  reset: () => void;
  reload: () => Promise<void>;
  subscribe: (callback: (event: ConfigChangeEvent) => void) => () => void;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Configuration change event
 */
export interface ConfigChangeEvent {
  type: 'change' | 'reset' | 'reload';
  changes?: ConfigChange[];
}

/**
 * Configuration change
 */
export interface ConfigChange {
  path: string;
  oldValue: ConfigValue;
  newValue: ConfigValue;
}

/**
 * Config context - extracted for Fast Refresh compliance
 */
export const ConfigContext = createContext<ConfigContextValue | null>(null);

ConfigContext.displayName = 'ConfigContext';
