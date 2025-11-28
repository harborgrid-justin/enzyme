/**
 * @file Flag Configurable Context
 * @description Context for configurable feature flags (Fast Refresh compliant).
 */

import { createContext, type ReactNode } from 'react';

/**
 * Configuration value
 */
export type ConfigurableValue = string | number | boolean | null | ConfigurableValue[] | { [key: string]: ConfigurableValue };

/**
 * Flag configuration
 */
export interface FlagConfiguration {
  flagKey: string;
  value: ConfigurableValue;
  metadata?: Record<string, unknown>;
}

/**
 * Flag configurable context value
 */
export interface FlagConfigurableContextValue {
  getConfig: (flagKey: string) => ConfigurableValue | undefined;
  setConfig: (flagKey: string, value: ConfigurableValue) => void;
  hasConfig: (flagKey: string) => boolean;
  getAllConfigs: () => FlagConfiguration[];
  renderVariant: (flagKey: string, variants: Record<string, ReactNode>) => ReactNode;
}

/**
 * Flag configurable context - extracted for Fast Refresh compliance
 */
export const FlagConfigurableContext = createContext<FlagConfigurableContextValue>({
  getConfig: () => undefined,
  setConfig: () => {},
  hasConfig: () => false,
  getAllConfigs: () => [],
  renderVariant: () => null,
});

FlagConfigurableContext.displayName = 'FlagConfigurableContext';
