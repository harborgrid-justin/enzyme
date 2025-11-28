/**
 * @file Configurable Features Context
 * @description Context for configurable features system (Fast Refresh compliant).
 */

import { createContext, type ReactNode } from 'react';

/**
 * Feature configuration
 */
export interface FeatureConfig {
  enabled: boolean;
  config?: Record<string, unknown>;
}

/**
 * Feature definition
 */
export interface FeatureDefinition {
  id: string;
  name: string;
  description?: string;
  defaultConfig?: FeatureConfig;
}

/**
 * Configurable features context value
 */
export interface ConfigurableFeaturesContextValue {
  registerFeature: (definition: FeatureDefinition) => void;
  unregisterFeature: (id: string) => void;
  getFeature: (id: string) => FeatureDefinition | undefined;
  isFeatureEnabled: (id: string) => boolean;
  getFeatureConfig: <T = unknown>(id: string) => T | undefined;
  setFeatureConfig: (id: string, config: FeatureConfig) => void;
  renderFeature: (id: string, content: ReactNode) => ReactNode;
}

/**
 * Configurable features context - extracted for Fast Refresh compliance
 */
export const ConfigurableFeaturesContext = createContext<ConfigurableFeaturesContextValue | null>(null);

ConfigurableFeaturesContext.displayName = 'ConfigurableFeaturesContext';
