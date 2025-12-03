/**
 * @file Progressive Enhancement System
 * @description PhD-level progressive feature loading with capability detection,
 * graceful degradation, and feature negotiation for optimal user experience.
 *
 * Features:
 * - Capability-based feature loading
 * - Progressive feature availability
 * - Graceful degradation paths
 * - Feature negotiation system
 * - Polyfill coordination
 */

import React, { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import {
  ProgressiveEnhancementContext,
  type ProgressiveEnhancementContextValue,
} from '../contexts/ProgressiveEnhancementContext';
import {
  checkWebPSupport,
  checkAVIFSupport,
  detectCapabilities,
  createFeature as createFeatureUtil,
  type BrowserCapabilities,
} from './progressive-enhancement-utils';
import {
  useProgressiveEnhancement,
  useProgressiveFeature,
  useCapability,
  useCapabilities,
  useCapabilityConditional,
} from './progressive-enhancement-hooks';

// ============================================================================
// Types
// ============================================================================

/**
 * Feature capability levels
 */
export type CapabilityLevel = 'full' | 'partial' | 'fallback' | 'none';

// Re-export BrowserCapabilities from utils for convenience
export type { BrowserCapabilities } from './progressive-enhancement-utils';

/**
 * Feature definition
 */
export interface FeatureDefinition {
  /** Feature identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Required capabilities */
  requires: Array<keyof BrowserCapabilities>;
  /** Optional capabilities for enhanced experience */
  enhancedBy?: Array<keyof BrowserCapabilities>;
  /** Loader function */
  loader: () => Promise<unknown>;
  /** Fallback loader */
  fallbackLoader?: () => Promise<unknown>;
  /** Polyfills to load */
  polyfills?: Array<() => Promise<void>>;
  /** Priority (higher = load first) */
  priority?: number;
}

/**
 * Feature status
 */
export interface FeatureStatus {
  /** Feature ID */
  id: string;
  /** Capability level */
  level: CapabilityLevel;
  /** Is loaded */
  loaded: boolean;
  /** Is loading */
  loading: boolean;
  /** Load error */
  error: Error | null;
  /** Loaded module */
  module: unknown;
}

// ============================================================================
// Provider
// ============================================================================

export interface ProgressiveEnhancementProviderProps {
  children: ReactNode;
  /** Initial feature definitions */
  features?: FeatureDefinition[];
  /** On capability detection complete */
  onCapabilitiesDetected?: (capabilities: BrowserCapabilities) => void;
}

/**
 * Progressive enhancement provider
 */
export function ProgressiveEnhancementProvider({
  children,
  features: initialFeatures = [],
  onCapabilitiesDetected,
}: ProgressiveEnhancementProviderProps): React.ReactElement {
  const [capabilities, setCapabilities] = useState<BrowserCapabilities>(() => {
    return detectCapabilities();
  });
  const [featureDefinitions] = useState<Map<string, FeatureDefinition>>(
    () => new Map(initialFeatures.map((f) => [f.id, f]))
  );
  const [featureStatuses, setFeatureStatuses] = useState<Map<string, FeatureStatus>>(new Map());

  // Async capability detection
  useEffect(() => {
    async function detectAsyncCapabilities(): Promise<void> {
      const [webP, avif] = await Promise.all([checkWebPSupport(), checkAVIFSupport()]);

      setCapabilities((prev: BrowserCapabilities) => {
        const updated: BrowserCapabilities = { ...prev, webP, avif };
        onCapabilitiesDetected?.(updated);
        return updated;
      });
    }

    void detectAsyncCapabilities();
  }, [onCapabilitiesDetected]);

  /**
   * Check if has capability
   */
  const hasCapability = useCallback(
    (capability: keyof BrowserCapabilities): boolean => {
      return capabilities[capability];
    },
    [capabilities]
  );

  /**
   * Get feature capability level
   */
  const getFeatureLevel = useCallback(
    (id: string): CapabilityLevel => {
      const definition = featureDefinitions.get(id);
      if (!definition) return 'none';

      const hasRequired = definition.requires.every((cap) => capabilities[cap]);
      if (!hasRequired) {
        return definition.fallbackLoader ? 'fallback' : 'none';
      }

      const hasEnhanced = definition.enhancedBy?.every((cap) => capabilities[cap]) ?? true;
      return hasEnhanced ? 'full' : 'partial';
    },
    [featureDefinitions, capabilities]
  );

  /**
   * Load feature
   */
  const loadFeature = useCallback(
    async (id: string): Promise<unknown> => {
      const definition = featureDefinitions.get(id);
      if (!definition) {
        throw new Error(`Feature not found: ${id}`);
      }

      // Check existing status
      const existing = featureStatuses.get(id);
      if (existing?.loaded === true) {
        return existing.module;
      }

      // Update loading status
      setFeatureStatuses((prev) =>
        new Map(prev).set(id, {
          id,
          level: getFeatureLevel(id),
          loaded: false,
          loading: true,
          error: null,
          module: null,
        })
      );

      try {
        // Load polyfills first
        if (definition.polyfills) {
          await Promise.all(definition.polyfills.map(async (p) => p()));
        }

        // Determine which loader to use
        const level = getFeatureLevel(id);
        let module: unknown;

        if (level === 'fallback' && definition.fallbackLoader) {
          module = await definition.fallbackLoader();
        } else if (level !== 'none') {
          module = await definition.loader();
        } else {
          throw new Error(`Feature ${id} is not supported`);
        }

        // Update status
        setFeatureStatuses((prev) =>
          new Map(prev).set(id, {
            id,
            level,
            loaded: true,
            loading: false,
            error: null,
            module,
          })
        );

        return module;
      } catch (error) {
        setFeatureStatuses((prev) =>
          new Map(prev).set(id, {
            id,
            level: 'none',
            loaded: false,
            loading: false,
            error: error instanceof Error ? error : new Error(String(error)),
            module: null,
          })
        );
        throw error;
      }
    },
    [featureDefinitions, featureStatuses, getFeatureLevel]
  );

  /**
   * Register a feature
   */
  const registerFeature = useCallback(
    (definition: FeatureDefinition): void => {
      featureDefinitions.set(definition.id, definition);
    },
    [featureDefinitions]
  );

  const value = useMemo<ProgressiveEnhancementContextValue>(
    () => ({
      capabilities,
      features: featureStatuses,
      loadFeature,
      hasCapability,
      getFeatureLevel,
      registerFeature,
    }),
    [capabilities, featureStatuses, loadFeature, hasCapability, getFeatureLevel, registerFeature]
  );

  return (
    <ProgressiveEnhancementContext.Provider value={value}>
      {children}
    </ProgressiveEnhancementContext.Provider>
  );
}

// ============================================================================
// Components
// ============================================================================

interface CapabilityGateProps {
  capability: keyof BrowserCapabilities;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Render children only if capability is supported
 */
export function CapabilityGate({
  capability,
  children,
  fallback = null,
}: CapabilityGateProps): React.ReactElement {
  const hasCapability = useCapability(capability);
  return <>{hasCapability ? children : fallback}</>;
}

interface FeatureGateProps {
  featureId: string;
  children: ReactNode | ((module: unknown) => ReactNode);
  loading?: ReactNode;
  fallback?: ReactNode;
  errorFallback?: ReactNode | ((error: Error) => ReactNode);
}

/**
 * Render children when feature is loaded
 */
export function FeatureGate({
  featureId,
  children,
  loading: loadingFallback = null,
  fallback = null,
  errorFallback,
}: FeatureGateProps): React.ReactElement {
  const { module, level, loading, error } = useProgressiveFeature(featureId);

  if (loading) return <>{loadingFallback}</>;
  if (error != null) {
    if (errorFallback != null) {
      return <>{typeof errorFallback === 'function' ? errorFallback(error) : errorFallback}</>;
    }
    return <>{fallback}</>;
  }
  if (level === 'none') return <>{fallback}</>;
  if (module == null) return <>{fallback}</>;

  return <>{typeof children === 'function' ? children(module) : children}</>;
}

// ============================================================================
// Exports
// ============================================================================

export default {
  ProgressiveEnhancementProvider,
  useProgressiveEnhancement,
  useProgressiveFeature,
  useCapability,
  useCapabilities,
  useCapabilityConditional,
  CapabilityGate,
  FeatureGate,
  createFeature: createFeatureUtil,
  checkWebPSupport,
  checkAVIFSupport,
};
