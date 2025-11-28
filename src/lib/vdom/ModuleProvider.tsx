/**
 * @file Module Provider Component
 * @module vdom/ModuleProvider
 * @description Root provider component for the Virtual Modular DOM system.
 * Provides context, configuration, and services to all module boundaries.
 * Manages global state, security, and performance monitoring.
 *
 * @author Agent 5 - PhD Virtual DOM Expert
 * @version 1.0.0
 */

import {
  createContext,
  useContext,
  useRef,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
  type FC,
} from 'react';
import {
  type ModuleId,
  type ModuleProviderConfig,
  type ModulePerformanceMetrics,
  type PerformanceBudget,
  type ModuleSecurityConfig,
  type VDOMPoolConfig,
  DEFAULT_POOL_CONFIG,
  DEFAULT_HYDRATION_CONFIG,
} from './types';
import { VDOMPool, setDefaultPool } from './vdom-pool';
import {
  ModuleRegistry,
  setDefaultRegistry,
} from './module-registry';
import { ModuleLoader, setDefaultLoader } from './module-loader';
import {
  ModuleEventBus,
  setDefaultEventBus,
} from './event-bus';
import {
  SecuritySandbox,
  createSecuritySandbox,
  createStrictSecurityConfig,
  createRelaxedSecurityConfig,
} from './security-sandbox';
import { isDev } from '@/lib/core/config/env-helper';

// ============================================================================
// Types
// ============================================================================

/**
 * Module system context value.
 */
export interface ModuleSystemContextValue {
  /** Configuration */
  readonly config: ModuleProviderConfig;
  /** VDOM pool instance */
  readonly pool: VDOMPool;
  /** Module registry instance */
  readonly registry: ModuleRegistry;
  /** Module loader instance */
  readonly loader: ModuleLoader;
  /** Event bus instance */
  readonly eventBus: ModuleEventBus;
  /** Global security sandbox */
  readonly security: SecuritySandbox;
  /** Whether system is initialized */
  readonly isInitialized: boolean;
  /** Report performance metrics */
  readonly reportMetrics: (moduleId: ModuleId, metrics: ModulePerformanceMetrics) => void;
  /** Check performance budget */
  readonly checkBudget: (moduleId: ModuleId, metrics: ModulePerformanceMetrics) => void;
}

/**
 * Module provider props.
 */
export interface ModuleProviderProps {
  /** Child components */
  children: ReactNode;
  /** Provider configuration */
  config?: Partial<ModuleProviderConfig>;
  /** Custom VDOM pool (optional) */
  pool?: VDOMPool;
  /** Custom registry (optional) */
  registry?: ModuleRegistry;
  /** Custom loader (optional) */
  loader?: ModuleLoader;
  /** Custom event bus (optional) */
  eventBus?: ModuleEventBus;
  /** Callback when system is ready */
  onReady?: () => void;
  /** Callback on system error */
  onError?: (error: Error) => void;
}

// ============================================================================
// Context
// ============================================================================

/**
 * Module system context.
 */
const ModuleSystemContext = createContext<ModuleSystemContextValue | null>(null);

/**
 * Internal module hierarchy context for tracking module nesting.
 */
const ModuleHierarchyContext = createContext<{
  moduleId: ModuleId | null;
  depth: number;
  path: ModuleId[];
}>({
  moduleId: null,
  depth: 0,
  path: [],
});

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Creates default provider configuration.
 * @param isDev - Whether in development mode
 * @returns Default configuration
 */
function createDefaultConfig(isDev: boolean): ModuleProviderConfig {
  return {
    devMode: isDev,
    strictMode: !isDev,
    security: isDev ? createRelaxedSecurityConfig() : createStrictSecurityConfig(),
    hydration: DEFAULT_HYDRATION_CONFIG,
    performanceBudget: {
      maxInitTime: 100,
      maxMountTime: 50,
      maxRenderTime: 16, // 60fps
      maxHydrationTime: 200,
      maxVNodes: 10000,
      maxMemory: 50 * 1024 * 1024, // 50MB
    },
    poolConfig: DEFAULT_POOL_CONFIG,
    enableTelemetry: isDev,
  };
}

// ============================================================================
// ModuleProvider Component
// ============================================================================

/**
 * Root provider for the Virtual Modular DOM system.
 * Initializes and provides all core services to the module tree.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <ModuleProvider
 *       config={{
 *         devMode: process.env.NODE_ENV === 'development',
 *         enableTelemetry: true,
 *       }}
 *       onReady={() => console.log('Module system ready')}
 *     >
 *       <ModuleBoundary id="app" name="Application">
 *         <YourApp />
 *       </ModuleBoundary>
 *     </ModuleProvider>
 *   );
 * }
 * ```
 */
export const ModuleProvider: FC<ModuleProviderProps> = ({
  children,
  config: userConfig,
  pool: userPool,
  registry: userRegistry,
  loader: userLoader,
  eventBus: userEventBus,
  onReady,
  onError,
}) => {
  // Determine if development mode
  const isDevMode = userConfig?.devMode ?? isDev();

  // Merge configuration
  const config = useMemo<ModuleProviderConfig>(() => {
    const defaults = createDefaultConfig(isDevMode);
    return {
      ...defaults,
      ...userConfig,
      security: { ...defaults.security, ...userConfig?.security },
      hydration: { ...defaults.hydration, ...userConfig?.hydration },
      performanceBudget: {
        ...defaults.performanceBudget,
        ...userConfig?.performanceBudget,
      },
      poolConfig: { ...defaults.poolConfig, ...userConfig?.poolConfig },
    };
  }, [isDevMode, userConfig]);

  // Initialize services
  const poolRef = useRef<VDOMPool | null>(null);
  const registryRef = useRef<ModuleRegistry | null>(null);
  const loaderRef = useRef<ModuleLoader | null>(null);
  const eventBusRef = useRef<ModuleEventBus | null>(null);
  const securityRef = useRef<SecuritySandbox | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize on first render
  if (!isInitializedRef.current) {
    try {
      // Initialize pool
      poolRef.current =
        userPool ?? new VDOMPool(config.poolConfig as VDOMPoolConfig);
      setDefaultPool(poolRef.current);

      // Initialize registry
      registryRef.current = userRegistry ?? new ModuleRegistry();
      setDefaultRegistry(registryRef.current);

      // Initialize loader
      loaderRef.current =
        userLoader ?? new ModuleLoader(registryRef.current);
      setDefaultLoader(loaderRef.current);

      // Initialize event bus
      eventBusRef.current = userEventBus ?? new ModuleEventBus({
        enableSecurity: true,
      });
      setDefaultEventBus(eventBusRef.current);

      // Initialize security
      securityRef.current = createSecuritySandbox(
        '__root__' as ModuleId,
        config.security as ModuleSecurityConfig
      );

      isInitializedRef.current = true;
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  // Callback to report metrics
  const reportMetrics = useCallback(
    (moduleId: ModuleId, metrics: ModulePerformanceMetrics) => {
      if (config.enableTelemetry && config.telemetryReporter) {
        config.telemetryReporter(metrics);
      }

      if (config.devMode) {
        console.debug(`[Module ${moduleId}] Metrics:`, metrics);
      }
    },
    [config]
  );

  // Callback to check performance budget
  const checkBudget = useCallback(
    (moduleId: ModuleId, metrics: ModulePerformanceMetrics) => {
      const budget = config.performanceBudget;
      if (!budget) {
        return;
      }

      const violations: Array<{
        metric: keyof PerformanceBudget;
        value: number;
        budget: number;
      }> = [];

      if (budget.maxInitTime && metrics.initTime > budget.maxInitTime) {
        violations.push({
          metric: 'maxInitTime',
          value: metrics.initTime,
          budget: budget.maxInitTime,
        });
      }

      if (budget.maxMountTime && metrics.mountTime > budget.maxMountTime) {
        violations.push({
          metric: 'maxMountTime',
          value: metrics.mountTime,
          budget: budget.maxMountTime,
        });
      }

      if (budget.maxRenderTime && metrics.avgRenderTime > budget.maxRenderTime) {
        violations.push({
          metric: 'maxRenderTime',
          value: metrics.avgRenderTime,
          budget: budget.maxRenderTime,
        });
      }

      if (
        budget.maxHydrationTime &&
        metrics.hydrationTime > budget.maxHydrationTime
      ) {
        violations.push({
          metric: 'maxHydrationTime',
          value: metrics.hydrationTime,
          budget: budget.maxHydrationTime,
        });
      }

      if (budget.maxVNodes && metrics.vNodeCount > budget.maxVNodes) {
        violations.push({
          metric: 'maxVNodes',
          value: metrics.vNodeCount,
          budget: budget.maxVNodes,
        });
      }

      if (budget.maxMemory && metrics.memoryEstimate > budget.maxMemory) {
        violations.push({
          metric: 'maxMemory',
          value: metrics.memoryEstimate,
          budget: budget.maxMemory,
        });
      }

      // Report violations
      for (const violation of violations) {
        if (config.devMode) {
          console.warn(
            `[Module ${moduleId}] Performance budget exceeded:`,
            violation
          );
        }

        budget.onBudgetExceeded?.(
          violation.metric,
          violation.value,
          violation.budget
        );
      }
    },
    [config]
  );

  // Context value
  const contextValue = useMemo<ModuleSystemContextValue>(
    () => ({
      config,
      pool: poolRef.current!,
      registry: registryRef.current!,
      loader: loaderRef.current!,
      eventBus: eventBusRef.current!,
      security: securityRef.current!,
      isInitialized: isInitializedRef.current,
      reportMetrics,
      checkBudget,
    }),
    [config, reportMetrics, checkBudget]
  );

  // Hierarchy context for root
  const hierarchyValue = useMemo(
    () => ({
      moduleId: null,
      depth: 0,
      path: [] as ModuleId[],
    }),
    []
  );

  // Call onReady after initialization
  useEffect(() => {
    if (isInitializedRef.current) {
      onReady?.();
    }
  }, [onReady]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup is handled by the individual service instances
      // Don't dispose shared instances as they may be used elsewhere
    };
  }, []);

  if (!isInitializedRef.current) {
    return null; // Or render a loading state
  }

  return (
    <ModuleSystemContext.Provider value={contextValue}>
      <ModuleHierarchyContext.Provider value={hierarchyValue}>
        {children}
      </ModuleHierarchyContext.Provider>
    </ModuleSystemContext.Provider>
  );
};

ModuleProvider.displayName = 'ModuleProvider';

// ============================================================================
// Context Hooks
// ============================================================================

/**
 * Hook to access the module system context.
 * @throws Error if used outside ModuleProvider
 * @returns Module system context value
 */
export function useModuleSystem(): ModuleSystemContextValue {
  const context = useContext(ModuleSystemContext);
  if (!context) {
    throw new Error('useModuleSystem must be used within a ModuleProvider');
  }
  return context;
}

/**
 * Hook to access the module hierarchy context.
 * @returns Module hierarchy context value
 */
export function useModuleHierarchy() {
  return useContext(ModuleHierarchyContext);
}

/**
 * Internal provider for module hierarchy tracking.
 * Used by ModuleBoundary to establish parent-child relationships.
 */
export const ModuleHierarchyProvider: FC<{
  moduleId: ModuleId;
  children: ReactNode;
}> = ({ moduleId, children }) => {
  const parent = useModuleHierarchy();

  const value = useMemo(
    () => ({
      moduleId,
      depth: parent.depth + 1,
      path: [...parent.path, moduleId],
    }),
    [moduleId, parent.depth, parent.path]
  );

  return (
    <ModuleHierarchyContext.Provider value={value}>
      {children}
    </ModuleHierarchyContext.Provider>
  );
};

ModuleHierarchyProvider.displayName = 'ModuleHierarchyProvider';

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to get the VDOM pool.
 * @returns VDOM pool instance
 */
export function useVDOMPool(): VDOMPool {
  const { pool } = useModuleSystem();
  return pool;
}

/**
 * Hook to get the module registry.
 * @returns Module registry instance
 */
export function useModuleRegistry(): ModuleRegistry {
  const { registry } = useModuleSystem();
  return registry;
}

/**
 * Hook to get the module loader.
 * @returns Module loader instance
 */
export function useModuleLoader(): ModuleLoader {
  const { loader } = useModuleSystem();
  return loader;
}

/**
 * Hook to get the event bus.
 * @returns Event bus instance
 */
export function useEventBus(): ModuleEventBus {
  const { eventBus } = useModuleSystem();
  return eventBus;
}

/**
 * Hook to check if in development mode.
 * @returns Whether in development mode
 */
export function useDevMode(): boolean {
  const { config } = useModuleSystem();
  return config.devMode ?? false;
}
