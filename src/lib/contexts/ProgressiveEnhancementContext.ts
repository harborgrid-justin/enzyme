/**
 * @file Progressive Enhancement Context
 * @description Context for progressive enhancement system (Fast Refresh compliant).
 */

import { createContext } from 'react';

/**
 * Feature capability levels
 */
export type CapabilityLevel = 'full' | 'partial' | 'fallback' | 'none';

/**
 * Browser feature capabilities
 */
export interface BrowserCapabilities {
  esModules: boolean;
  asyncAwait: boolean;
  webGL: boolean;
  webGL2: boolean;
  webP: boolean;
  avif: boolean;
  serviceWorker: boolean;
  webWorker: boolean;
  sharedArrayBuffer: boolean;
  intersectionObserver: boolean;
  resizeObserver: boolean;
  cssGrid: boolean;
  containerQueries: boolean;
  cssHas: boolean;
  viewTransitions: boolean;
  navigationAPI: boolean;
  popoverAPI: boolean;
  webAnimations: boolean;
  idleCallback: boolean;
  intl: boolean;
}

/**
 * Feature status
 */
export interface FeatureStatus {
  id: string;
  level: CapabilityLevel;
  loaded: boolean;
  loading: boolean;
  error: Error | null;
  module: unknown;
}

/**
 * Feature definition
 */
export interface FeatureDefinition {
  id: string;
  name: string;
  requires: Array<keyof BrowserCapabilities>;
  enhancedBy?: Array<keyof BrowserCapabilities>;
  loader: () => Promise<unknown>;
  fallbackLoader?: () => Promise<unknown>;
  polyfills?: Array<() => Promise<void>>;
  priority?: number;
}

/**
 * Progressive enhancement context value
 */
export interface ProgressiveEnhancementContextValue {
  capabilities: BrowserCapabilities;
  features: Map<string, FeatureStatus>;
  hasCapability: (capability: keyof BrowserCapabilities) => boolean;
  getFeatureLevel: (featureId: string) => CapabilityLevel;
  loadFeature: (featureId: string) => Promise<unknown>;
  registerFeature: (definition: FeatureDefinition) => void;
}

/**
 * Progressive enhancement context - extracted for Fast Refresh compliance
 */
export const ProgressiveEnhancementContext = createContext<ProgressiveEnhancementContextValue | null>(null);
