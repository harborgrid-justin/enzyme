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

import {
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { 
  ProgressiveEnhancementContext,
  type ProgressiveEnhancementContextValue
} from '../contexts/ProgressiveEnhancementContext';

// ============================================================================
// Types
// ============================================================================

/**
 * Feature capability levels
 */
export type CapabilityLevel = 'full' | 'partial' | 'fallback' | 'none';

/**
 * Browser feature capabilities
 */
export interface BrowserCapabilities {
  /** Supports ES modules */
  esModules: boolean;
  /** Supports async/await */
  asyncAwait: boolean;
  /** Supports WebGL */
  webGL: boolean;
  /** Supports WebGL2 */
  webGL2: boolean;
  /** Supports WebP images */
  webP: boolean;
  /** Supports AVIF images */
  avif: boolean;
  /** Supports Service Workers */
  serviceWorker: boolean;
  /** Supports Web Workers */
  webWorker: boolean;
  /** Supports SharedArrayBuffer */
  sharedArrayBuffer: boolean;
  /** Supports IntersectionObserver */
  intersectionObserver: boolean;
  /** Supports ResizeObserver */
  resizeObserver: boolean;
  /** Supports CSS Grid */
  cssGrid: boolean;
  /** Supports CSS Container Queries */
  containerQueries: boolean;
  /** Supports CSS :has() */
  cssHas: boolean;
  /** Supports View Transitions API */
  viewTransitions: boolean;
  /** Supports Navigation API */
  navigationAPI: boolean;
  /** Supports Popover API */
  popoverAPI: boolean;
  /** Supports Web Animations API */
  webAnimations: boolean;
  /** Supports requestIdleCallback */
  idleCallback: boolean;
  /** Supports Intl API */
  intl: boolean;
}

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
// Capability Detection
// ============================================================================

/**
 * Detect browser capabilities
 */
export function detectCapabilities(): BrowserCapabilities {
  if (typeof window === 'undefined') {
    // SSR - assume modern browser
    return getDefaultCapabilities();
  }

  return {
    esModules: 'noModule' in HTMLScriptElement.prototype,
    asyncAwait: hasAsyncAwait(),
    webGL: hasWebGL(),
    webGL2: hasWebGL2(),
    webP: false, // Detected asynchronously
    avif: false, // Detected asynchronously
    serviceWorker: 'serviceWorker' in navigator,
    webWorker: 'Worker' in window,
    sharedArrayBuffer: 'SharedArrayBuffer' in window,
    intersectionObserver: 'IntersectionObserver' in window,
    resizeObserver: 'ResizeObserver' in window,
    cssGrid: CSS.supports('display', 'grid'),
    containerQueries: CSS.supports('container-type', 'inline-size'),
    cssHas: CSS.supports('selector(:has(*))'),
    viewTransitions: 'startViewTransition' in document,
    navigationAPI: 'navigation' in window,
    popoverAPI: 'popover' in HTMLElement.prototype,
    webAnimations: 'animate' in Element.prototype,
    idleCallback: 'requestIdleCallback' in window,
    intl: 'Intl' in window,
  };
}

/**
 * Get default capabilities for SSR
 */
function getDefaultCapabilities(): BrowserCapabilities {
  return {
    esModules: true,
    asyncAwait: true,
    webGL: true,
    webGL2: true,
    webP: true,
    avif: true,
    serviceWorker: true,
    webWorker: true,
    sharedArrayBuffer: true,
    intersectionObserver: true,
    resizeObserver: true,
    cssGrid: true,
    containerQueries: true,
    cssHas: true,
    viewTransitions: true,
    navigationAPI: true,
    popoverAPI: true,
    webAnimations: true,
    idleCallback: true,
    intl: true,
  };
}

/**
 * Check async/await support
 */
function hasAsyncAwait(): boolean {
  try {
     
    new Function('async () => {}');
    return true;
  } catch {
    return false;
  }
}

/**
 * Check WebGL support
 */
function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

/**
 * Check WebGL2 support
 */
function hasWebGL2(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!canvas.getContext('webgl2');
  } catch {
    return false;
  }
}

/**
 * Check WebP support asynchronously
 */
export async function checkWebPSupport(): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.width > 0 && img.height > 0);
    img.onerror = () => resolve(false);
    img.src = 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA';
  });
}

/**
 * Check AVIF support asynchronously
 */
export async function checkAVIFSupport(): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.width > 0 && img.height > 0);
    img.onerror = () => resolve(false);
    img.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKBzgADlAgIGkyCR/wAABAAACvcA==';
  });
}

// ============================================================================
// Context
// ============================================================================

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
  const [capabilities, setCapabilities] = useState<BrowserCapabilities>(detectCapabilities);
  const [featureDefinitions] = useState<Map<string, FeatureDefinition>>(
    () => new Map(initialFeatures.map((f) => [f.id, f]))
  );
  const [featureStatuses, setFeatureStatuses] = useState<Map<string, FeatureStatus>>(new Map());

  // Async capability detection
  useEffect(() => {
    async function detectAsyncCapabilities(): Promise<void> {
      const [webP, avif] = await Promise.all([
        checkWebPSupport(),
        checkAVIFSupport(),
      ]);

      setCapabilities((prev) => {
        const updated = { ...prev, webP, avif };
        onCapabilitiesDetected?.(updated);
        return updated;
      });
    }

    detectAsyncCapabilities();
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
      if (existing?.loaded) {
        return existing.module;
      }

      // Update loading status
      setFeatureStatuses((prev) => new Map(prev).set(id, {
        id,
        level: getFeatureLevel(id),
        loaded: false,
        loading: true,
        error: null,
        module: null,
      }));

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
        setFeatureStatuses((prev) => new Map(prev).set(id, {
          id,
          level,
          loaded: true,
          loading: false,
          error: null,
          module,
        }));

        return module;
      } catch (error) {
        setFeatureStatuses((prev) => new Map(prev).set(id, {
          id,
          level: 'none',
          loaded: false,
          loading: false,
          error: error instanceof Error ? error : new Error(String(error)),
          module: null,
        }));
        throw error;
      }
    },
    [featureDefinitions, featureStatuses, getFeatureLevel]
  );

  /**
   * Register a feature
   */
  const registerFeature = useCallback((definition: FeatureDefinition): void => {
    featureDefinitions.set(definition.id, definition);
  }, [featureDefinitions]);

  const value = useMemo<ProgressiveEnhancementContextValue>(() => ({
    capabilities,
    features: featureStatuses,
    loadFeature,
    hasCapability,
    getFeatureLevel,
    registerFeature,
  }), [capabilities, featureStatuses, loadFeature, hasCapability, getFeatureLevel, registerFeature]);

  return (
    <ProgressiveEnhancementContext.Provider value={value}>
      {children}
    </ProgressiveEnhancementContext.Provider>
  );
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Use progressive enhancement context
 */
export function useProgressiveEnhancement(): ProgressiveEnhancementContextValue {
  const context = useContext(ProgressiveEnhancementContext);
  if (!context) {
    throw new Error('useProgressiveEnhancement must be used within a ProgressiveEnhancementProvider');
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

  const status = features.get(featureId) ?? null;
  const level = getFeatureLevel(featureId);

  useEffect(() => {
    if (autoLoad && status && !status.loaded && !status.loading && level !== 'none') {
      loadFeature(featureId).catch(() => {
        // Error handled in state
      });
    }
  }, [autoLoad, featureId, level, loadFeature, status]);

  const load = useCallback(async (): Promise<T> => {
    return loadFeature(featureId) as Promise<T>;
  }, [featureId, loadFeature]);

  return {
    module: (status?.module as T) ?? fallback ?? null,
    level,
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
 * Use conditional render based on capability
 */
export function useCapabilityConditional<T>(
  capability: keyof BrowserCapabilities,
  enhanced: T,
  fallback: T
): T {
  const hasCapability = useCapability(capability);
  return hasCapability ? enhanced : fallback;
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
  if (error) {
    if (errorFallback) {
      return <>{typeof errorFallback === 'function' ? errorFallback(error) : errorFallback}</>;
    }
    return <>{fallback}</>;
  }
  if (level === 'none') return <>{fallback}</>;
  if (!module) return <>{fallback}</>;

  return <>{typeof children === 'function' ? children(module) : children}</>;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a progressive feature definition
 */
export function createFeature(
  id: string,
  config: Omit<FeatureDefinition, 'id'>
): FeatureDefinition {
  return { id, ...config };
}

/**
 * Get capabilities without React
 */
export function getCapabilities(): BrowserCapabilities {
  return detectCapabilities();
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
  createFeature,
  detectCapabilities,
  getCapabilities,
  checkWebPSupport,
  checkAVIFSupport,
};
