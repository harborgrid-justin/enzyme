/**
 * @file Progressive Enhancement Hooks
 * @description React hooks for progressive enhancement functionality
 */

import { useContext, useCallback, useMemo } from 'react';
import {
  ProgressiveEnhancementContext,
  type ProgressiveEnhancementContextValue,
} from '../contexts/ProgressiveEnhancementContext';
import type { BrowserCapabilities, CapabilityLevel } from './progressive-enhancement';

/**
 * Use progressive enhancement context
 */
export function useProgressiveEnhancement(): ProgressiveEnhancementContextValue {
  const context = useContext(ProgressiveEnhancementContext);
  if (!context) {
    throw new Error(
      'useProgressiveEnhancement must be used within a ProgressiveEnhancementProvider'
    );
  }
  return context;
}

/**
 * Use feature with progressive loading
 */
export function useProgressiveFeature<T = unknown>(
  featureId: string,
  options: {
    autoLoad?: boolean;
    fallback?: T;
  } = {}
): {
  module: T | null;
  level: CapabilityLevel;
  loading: boolean;
  error: Error | null;
  load: () => Promise<T>;
} {
  const { autoLoad = true, fallback } = options;
  const { features, loadFeature, getFeatureLevel } = useProgressiveEnhancement();

  const status = features.get(featureId);

  const load = useCallback(async (): Promise<T> => {
    try {
      const result = await loadFeature(featureId);
      return (result as T) ?? (fallback as T);
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  }, [featureId, loadFeature, fallback]);

  // Auto-load if enabled and not loaded
  useMemo(() => {
    if (autoLoad && status?.loaded !== true && status?.loading !== true) {
      void load();
    }
  }, [autoLoad, status, load]);

  return {
    module: (status?.module as T) ?? null,
    level: getFeatureLevel(featureId),
    loading: status?.loading ?? false,
    error: status?.error ?? null,
    load,
  };
}

/**
 * Use capability check
 */
export function useCapability(capability: keyof BrowserCapabilities): boolean {
  const { hasCapability } = useProgressiveEnhancement();
  return hasCapability(capability);
}

/**
 * Use multiple capabilities
 */
export function useCapabilities(
  capabilities: Array<keyof BrowserCapabilities>
): Record<string, boolean> {
  const { hasCapability } = useProgressiveEnhancement();
  return useMemo(() => {
    const result: Record<string, boolean> = {};
    capabilities.forEach((cap) => {
      result[cap] = hasCapability(cap);
    });
    return result;
  }, [capabilities, hasCapability]);
}

/**
 * Use capability conditional
 */
export function useCapabilityConditional<T>(
  capability: keyof BrowserCapabilities,
  trueValue: T,
  falseValue: T
): T {
  const hasCapability = useCapability(capability);
  return hasCapability ? trueValue : falseValue;
}
