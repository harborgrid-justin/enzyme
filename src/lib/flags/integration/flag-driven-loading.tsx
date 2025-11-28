/**
 * @fileoverview Flag-driven module loading for conditional imports.
 *
 * This module provides mechanisms for conditionally loading modules based on
 * feature flag states. It supports lazy loading, Suspense integration, and
 * code splitting based on feature flags.
 *
 * @module flags/integration/flag-driven-loading
 *
 * @example
 * ```typescript
 * import {
 *   useFeatureFlaggedModule,
 *   createFlaggedComponent,
 *   FlaggedModuleLoader,
 * } from '@/lib/flags/integration/flag-driven-loading';
 *
 * // Use the hook
 * function Dashboard() {
 *   const { module: AnalyticsV2, isLoading, error } = useFeatureFlaggedModule({
 *     flagKey: 'analytics-v2',
 *     enabledModule: () => import('./AnalyticsV2'),
 *     fallbackModule: () => import('./AnalyticsV1'),
 *   });
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error error={error} />;
 *   return <AnalyticsV2 />;
 * }
 *
 * // Use the component
 * function App() {
 *   return (
 *     <FlaggedModuleLoader
 *       flagKey="new-feature"
 *       enabledModule={() => import('./NewFeature')}
 *       fallback={<OldFeature />}
 *       loadingFallback={<Spinner />}
 *     />
 *   );
 * }
 * ```
 */

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  lazy,
  Suspense,
  type ComponentType,
  type ReactNode,
  type LazyExoticComponent,
} from 'react';

// =============================================================================
// Types
// =============================================================================

/**
 * Module loader function type
 */
export type ModuleLoader<T = unknown> = () => Promise<{ default: T } | T>;

/**
 * Component module loader
 */
export type ComponentLoader<P = unknown> = () => Promise<{
  default: ComponentType<P>;
}>;

/**
 * Module load result
 */
export interface ModuleLoadResult<T> {
  /** Loaded module or component */
  readonly module: T | null;
  /** Whether module is loading */
  readonly isLoading: boolean;
  /** Load error if any */
  readonly error: Error | null;
  /** Whether the flag-enabled module was loaded */
  readonly isEnabledVariant: boolean;
  /** Reload the module */
  reload(): void;
}

/**
 * Flagged module configuration
 */
export interface FlaggedModuleConfig<T> {
  /** Feature flag key */
  readonly flagKey: string;
  /** Module to load when flag is enabled */
  readonly enabledModule: ModuleLoader<T>;
  /** Module to load when flag is disabled (optional) */
  readonly fallbackModule?: ModuleLoader<T>;
  /** Default value if no fallback */
  readonly defaultValue?: T;
  /** Timeout for module loading (ms) */
  readonly timeout?: number;
  /** Retry configuration */
  readonly retry?: {
    attempts: number;
    delay: number;
  };
  /** Flag value getter */
  readonly getFlag?: (flagKey: string) => boolean;
  /** Preload on mount even if flag is disabled */
  readonly preload?: boolean;
  /** Cache loaded modules */
  readonly cache?: boolean;
}

/**
 * Flagged component props
 */
export interface FlaggedComponentProps<P = Record<string, unknown>> {
  /** Feature flag key */
  readonly flagKey: string;
  /** Component to load when flag is enabled */
  readonly enabledComponent: ComponentLoader<P>;
  /** Component to render when flag is disabled */
  readonly fallbackComponent?: ComponentType<P>;
  /** Props to pass to the component */
  readonly componentProps?: P;
  /** Loading fallback */
  readonly loadingFallback?: ReactNode;
  /** Error fallback */
  readonly errorFallback?: ReactNode | ((error: Error) => ReactNode);
  /** Flag value getter */
  readonly getFlag?: (flagKey: string) => boolean;
}

/**
 * Module preload configuration
 */
export interface ModulePreloadConfig {
  /** Module to preload */
  readonly module: ModuleLoader;
  /** Associated flag key */
  readonly flagKey?: string;
  /** Preload priority */
  readonly priority?: 'high' | 'low' | 'idle';
  /** Delay before preloading (ms) */
  readonly delay?: number;
}

/**
 * Module cache entry
 */
interface ModuleCacheEntry<T> {
  module: T;
  loadedAt: number;
  flagEnabled: boolean;
}

// =============================================================================
// Module Cache
// =============================================================================

const moduleCache = new Map<string, ModuleCacheEntry<unknown>>();

/**
 * Get cached module
 */
function getCachedModule<T>(key: string): T | undefined {
  const entry = moduleCache.get(key);
  return entry?.module as T | undefined;
}

/**
 * Set cached module
 */
function setCachedModule<T>(key: string, module: T, flagEnabled: boolean): void {
  moduleCache.set(key, {
    module,
    loadedAt: Date.now(),
    flagEnabled,
  });
}

/**
 * Clear module cache
 */
export function clearModuleCache(): void {
  moduleCache.clear();
}

/**
 * Get module cache stats
 */
export function getModuleCacheStats(): {
  size: number;
  entries: { key: string; loadedAt: number; flagEnabled: boolean }[];
} {
  const entries: { key: string; loadedAt: number; flagEnabled: boolean }[] = [];

  moduleCache.forEach((entry, key) => {
    entries.push({
      key,
      loadedAt: entry.loadedAt,
      flagEnabled: entry.flagEnabled,
    });
  });

  return {
    size: moduleCache.size,
    entries,
  };
}

// =============================================================================
// Core Implementation
// =============================================================================

/**
 * Load a module with retry logic
 */
async function loadModuleWithRetry<T>(
  loader: ModuleLoader<T>,
  options: { attempts: number; delay: number; timeout?: number }
): Promise<T> {
  const { attempts, delay, timeout } = options;
  let lastError: Error | null = null;

  for (let i = 0; i < attempts; i++) {
    try {
      const loadPromise = loader();

      const result = timeout
        ? await Promise.race([
            loadPromise,
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Module load timeout')), timeout)
            ),
          ])
        : await loadPromise;

      // Handle both { default: T } and T
      if (result && typeof result === 'object' && 'default' in result) {
        return (result as { default: T }).default;
      }
      return result as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }

  throw lastError ?? new Error('Failed to load module');
}

/**
 * Create a cache key for a flagged module
 */
function createCacheKey(flagKey: string, isEnabled: boolean): string {
  return `${flagKey}:${isEnabled ? 'enabled' : 'disabled'}`;
}

// =============================================================================
// React Hooks
// =============================================================================

/**
 * Hook to load a module based on feature flag state
 *
 * @example
 * ```typescript
 * const { module: Chart, isLoading } = useFeatureFlaggedModule({
 *   flagKey: 'new-charts',
 *   enabledModule: () => import('./charts/NewChart'),
 *   fallbackModule: () => import('./charts/OldChart'),
 * });
 * ```
 */
export function useFeatureFlaggedModule<T>(
  config: FlaggedModuleConfig<T>
): ModuleLoadResult<T> {
  const {
    flagKey,
    enabledModule,
    fallbackModule,
    defaultValue,
    timeout,
    retry = { attempts: 3, delay: 1000 },
    getFlag,
    preload = false,
    cache = true,
  } = config;

  const [module, setModule] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isEnabledVariant, setIsEnabledVariant] = useState(false);
  const [loadCount, setLoadCount] = useState(0);

  // Get flag value - try context first, then fallback to provided getter
  const flagEnabled = useMemo(() => {
    if (getFlag) {
      return getFlag(flagKey);
    }
    // Default to false if no getter provided
    return false;
  }, [flagKey, getFlag, loadCount]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const cacheKey = createCacheKey(flagKey, flagEnabled);

    // Check cache
    if (cache) {
      const cached = getCachedModule<T>(cacheKey);
      if (cached !== undefined) {
        setModule(cached);
        setIsEnabledVariant(flagEnabled);
        setIsLoading(false);
        return;
      }
    }

    // Determine which module to load
    const loader = flagEnabled
      ? enabledModule
      : fallbackModule ?? (defaultValue !== undefined ? (async () => Promise.resolve(defaultValue)) : null);

    if (!loader) {
      setModule(null);
      setIsLoading(false);
      return;
    }

    try {
      const loadedModule = await loadModuleWithRetry(loader, {
        attempts: retry.attempts,
        delay: retry.delay,
        timeout,
      });

      setModule(loadedModule);
      setIsEnabledVariant(flagEnabled);

      if (cache) {
        setCachedModule(cacheKey, loadedModule, flagEnabled);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setModule(defaultValue ?? null);
    } finally {
      setIsLoading(false);
    }
  }, [
    flagKey,
    flagEnabled,
    enabledModule,
    fallbackModule,
    defaultValue,
    timeout,
    retry,
    cache,
  ]);

  // Load on mount and flag change
  useEffect(() => {
    load();
  }, [load]);

  // Preload the other variant if configured
  useEffect(() => {
    if (!preload || !cache) return;

    const preloadLoader = flagEnabled ? fallbackModule : enabledModule;
    if (!preloadLoader) return;

    const preloadCacheKey = createCacheKey(flagKey, !flagEnabled);
    if (getCachedModule(preloadCacheKey) !== undefined) return;

    // Preload in idle time
    if ('requestIdleCallback' in window) {
      const id = (window as Window & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(() => {
        loadModuleWithRetry(preloadLoader, { attempts: 1, delay: 0 }).then((mod) => {
          setCachedModule(preloadCacheKey, mod, !flagEnabled);
        }).catch(() => {
          // Silently fail preload
        });
      });
      return () => (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(id);
    }

    return undefined;
  }, [flagKey, flagEnabled, enabledModule, fallbackModule, preload, cache]);

  const reload = useCallback(() => {
    setLoadCount((c) => c + 1);
  }, []);

  return {
    module,
    isLoading,
    error,
    isEnabledVariant,
    reload,
  };
}

/**
 * Hook to create a lazy component based on feature flag
 */
export function useFlaggedLazyComponent<P = Record<string, unknown>>(
  config: Omit<FlaggedModuleConfig<ComponentType<P>>, 'defaultValue'>
): {
  Component: LazyExoticComponent<ComponentType<P>> | null;
  isEnabledVariant: boolean;
} {
  const { flagKey, enabledModule, fallbackModule, getFlag } = config;

  const flagEnabled = useMemo(() => {
    return getFlag ? getFlag(flagKey) : false;
  }, [flagKey, getFlag]);

  const Component = useMemo(() => {
    const loader = flagEnabled ? enabledModule : fallbackModule;
    if (!loader) return null;

    // Normalize loader to always return { default: T } for React.lazy
    const normalizedLoader = async () => loader().then((mod) => {
      if (mod && typeof mod === 'object' && 'default' in mod) {
        return mod as { default: ComponentType<P> };
      }
      return { default: mod };
    });

    return lazy(normalizedLoader);
  }, [flagEnabled, enabledModule, fallbackModule]);

  return {
    Component,
    isEnabledVariant: flagEnabled,
  };
}

// =============================================================================
// React Components
// =============================================================================

/**
 * Component that loads and renders a flagged module
 */
export function FlaggedModuleLoader<P extends Record<string, unknown> = Record<string, unknown>>({
  flagKey,
  enabledComponent,
  fallbackComponent: FallbackComponent,
  componentProps,
  loadingFallback = null,
  errorFallback,
  getFlag,
}: FlaggedComponentProps<P>): React.JSX.Element | null {
  const {
    module: LoadedComponent,
    isLoading,
    error,
  } = useFeatureFlaggedModule<ComponentType<P>>({
    flagKey,
    enabledModule: enabledComponent,
    fallbackModule: FallbackComponent
      ? async () => Promise.resolve({ default: FallbackComponent })
      : undefined,
    getFlag,
  });

  if (isLoading) {
    return <>{loadingFallback}</>;
  }

  if (error) {
    if (typeof errorFallback === 'function') {
      return <>{errorFallback(error)}</>;
    }
    return <>{errorFallback ?? null}</>;
  }

  if (!LoadedComponent) {
    return null;
  }

  return <LoadedComponent {...(componentProps as P)} />;
}

/**
 * Suspense-enabled flagged component loader
 */
export function SuspenseFlaggedLoader<P extends Record<string, unknown> = Record<string, unknown>>({
  flagKey,
  enabledComponent,
  fallbackComponent,
  componentProps,
  loadingFallback = null,
  getFlag,
}: Omit<FlaggedComponentProps<P>, 'errorFallback'>): React.JSX.Element {
  const { Component } = useFlaggedLazyComponent<P>({
    flagKey,
    enabledModule: enabledComponent,
    fallbackModule: fallbackComponent
      ? async () => Promise.resolve({ default: fallbackComponent })
      : undefined,
    getFlag,
  });

  if (!Component) {
    return <>{loadingFallback}</>;
  }

  return (
    <Suspense fallback={loadingFallback}>
      <Component {...(componentProps as any)} />
    </Suspense>
  );
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a flagged component that auto-loads based on flag state
 */
export function createFlaggedComponent<P extends Record<string, unknown> = Record<string, unknown>>(config: {
  flagKey: string;
  enabledComponent: ComponentLoader<P>;
  fallbackComponent?: ComponentType<P>;
  loadingFallback?: ReactNode;
  getFlag?: (flagKey: string) => boolean;
}): ComponentType<P> {
  const { flagKey, enabledComponent, fallbackComponent, loadingFallback, getFlag } = config;

  function FlaggedComponent(props: P): React.JSX.Element {
    return (
      <FlaggedModuleLoader<P>
        flagKey={flagKey}
        enabledComponent={enabledComponent}
        fallbackComponent={fallbackComponent}
        componentProps={props}
        loadingFallback={loadingFallback}
        getFlag={getFlag}
      />
    );
  }

  FlaggedComponent.displayName = `FlaggedComponent(${flagKey})`;

  return FlaggedComponent;
}

/**
 * Create multiple flagged components from a configuration object
 */
export function createFlaggedComponents<
  TComponents extends Record<string, ComponentLoader>
>(config: {
  components: TComponents;
  fallbacks?: Partial<Record<keyof TComponents, ComponentType>>;
  loadingFallback?: ReactNode;
  getFlag?: (flagKey: string) => boolean;
}): {
  [K in keyof TComponents]: ComponentType;
} {
  const result: Record<string, ComponentType> = {};

  for (const [key, loader] of Object.entries(config.components)) {
    result[key] = createFlaggedComponent({
      flagKey: key,
      enabledComponent: loader,
      fallbackComponent: config.fallbacks?.[key as keyof typeof config.fallbacks] as unknown as ComponentType<unknown> | undefined,
      loadingFallback: config.loadingFallback,
      getFlag: config.getFlag,
    });
  }

  return result as { [K in keyof TComponents]: ComponentType };
}

// =============================================================================
// Preloading Utilities
// =============================================================================

/**
 * Preload a module in idle time
 */
export function preloadModule(config: ModulePreloadConfig): () => void {
  const { module, priority = 'idle', delay = 0 } = config;
  let cancelled = false;

  const doPreload = async () => {
    if (cancelled) return;

    try {
      await module();
    } catch {
      // Silently fail preload
    }
  };

  const schedulePreload = () => {
    if (priority === 'high') {
      setTimeout(doPreload, delay);
    } else if (priority === 'idle' && 'requestIdleCallback' in window) {
      setTimeout(() => {
        if (cancelled) return;
        (window as Window & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(doPreload);
      }, delay);
    } else {
      setTimeout(doPreload, delay + 100);
    }
  };

  schedulePreload();

  return () => {
    cancelled = true;
  };
}

/**
 * Preload multiple modules
 */
export function preloadModules(configs: ModulePreloadConfig[]): () => void {
  const cancellers = configs.map((config) => preloadModule(config));

  return () => {
    for (const cancel of cancellers) {
      cancel();
    }
  };
}

/**
 * Create a preload link for a module
 */
export function createModulePreloadLink(moduleUrl: string): HTMLLinkElement {
  const link = document.createElement('link');
  link.rel = 'modulepreload';
  link.href = moduleUrl;
  document.head.appendChild(link);
  return link;
}

// =============================================================================
// Route-Based Loading
// =============================================================================

/**
 * Configuration for route-based flagged loading
 */
export interface FlaggedRouteModuleConfig<T> {
  /** Route path pattern */
  readonly path: string;
  /** Feature flag key */
  readonly flagKey: string;
  /** Module to load when flag is enabled */
  readonly enabledModule: ModuleLoader<T>;
  /** Module to load when flag is disabled */
  readonly fallbackModule: ModuleLoader<T>;
}

/**
 * Create route loaders that respect feature flags
 */
export function createFlaggedRouteLoaders<T>(
  routes: FlaggedRouteModuleConfig<T>[],
  getFlag: (flagKey: string) => boolean
): Map<string, () => Promise<T>> {
  const loaders = new Map<string, () => Promise<T>>();

  for (const route of routes) {
    loaders.set(route.path, async () => {
      const flagEnabled = getFlag(route.flagKey);
      const loader = flagEnabled ? route.enabledModule : route.fallbackModule;

      const result = await loader();
      if (result && typeof result === 'object' && 'default' in result) {
        return (result as { default: T }).default;
      }
      return result as T;
    });
  }

  return loaders;
}



