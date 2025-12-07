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

import { useState, useCallback, useMemo, useEffect, type FC } from 'react';
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
import { ModuleRegistry, setDefaultRegistry } from './module-registry';
import { ModuleLoader, setDefaultLoader } from './module-loader';
import { ModuleEventBus, setDefaultEventBus } from './event-bus';
import {
  type SecuritySandbox,
  createSecuritySandbox,
  createStrictSecurityConfig,
  createRelaxedSecurityConfig,
} from './security-sandbox';
import { isDev, devWarn } from '@/lib/core/config/env-helper';
import {
  ModuleSystemContext,
  ModuleHierarchyContext,
  type ModuleSystemContextValue,
  type ModuleProviderProps,
} from './ModuleProviderContext';

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
  onError: _onError,
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

  // Initialize services with useState
  const [pool] = useState<VDOMPool>(() => {
    const instance = userPool ?? new VDOMPool(config.poolConfig as VDOMPoolConfig);
    setDefaultPool(instance);
    return instance;
  });

  const [registry] = useState<ModuleRegistry>(() => {
    const instance = userRegistry ?? new ModuleRegistry();
    setDefaultRegistry(instance);
    return instance;
  });

  const [loader] = useState<ModuleLoader>(() => {
    const instance = userLoader ?? new ModuleLoader(registry);
    setDefaultLoader(instance);
    return instance;
  });

  const [eventBus] = useState<ModuleEventBus>(() => {
    const instance =
      userEventBus ??
      new ModuleEventBus({
        enableSecurity: true,
      });
    setDefaultEventBus(instance);
    return instance;
  });

  const [security] = useState<SecuritySandbox>(() =>
    createSecuritySandbox('__root__' as ModuleId, config.security as ModuleSecurityConfig)
  );

  // Services are initialized synchronously in useState, so we're always initialized
  const isInitialized = true;

  // Callback to report metrics
  const reportMetrics = useCallback(
    (moduleId: ModuleId, metrics: ModulePerformanceMetrics) => {
      if (config.enableTelemetry === true && config.telemetryReporter !== undefined) {
        config.telemetryReporter(metrics);
      }

      if (config.devMode === true) {
        devWarn(`[Module ${moduleId}] Metrics:`, metrics);
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

      if (
        budget.maxInitTime !== undefined &&
        budget.maxInitTime !== null &&
        metrics.initTime > budget.maxInitTime
      ) {
        violations.push({
          metric: 'maxInitTime',
          value: metrics.initTime,
          budget: budget.maxInitTime,
        });
      }

      if (
        budget.maxMountTime !== undefined &&
        budget.maxMountTime !== null &&
        metrics.mountTime > budget.maxMountTime
      ) {
        violations.push({
          metric: 'maxMountTime',
          value: metrics.mountTime,
          budget: budget.maxMountTime,
        });
      }

      if (
        budget.maxRenderTime !== undefined &&
        budget.maxRenderTime !== null &&
        metrics.avgRenderTime > budget.maxRenderTime
      ) {
        violations.push({
          metric: 'maxRenderTime',
          value: metrics.avgRenderTime,
          budget: budget.maxRenderTime,
        });
      }

      if (
        budget.maxHydrationTime !== undefined &&
        budget.maxHydrationTime !== null &&
        metrics.hydrationTime > budget.maxHydrationTime
      ) {
        violations.push({
          metric: 'maxHydrationTime',
          value: metrics.hydrationTime,
          budget: budget.maxHydrationTime,
        });
      }

      if (
        budget.maxVNodes !== undefined &&
        budget.maxVNodes !== null &&
        metrics.vNodeCount > budget.maxVNodes
      ) {
        violations.push({
          metric: 'maxVNodes',
          value: metrics.vNodeCount,
          budget: budget.maxVNodes,
        });
      }

      if (
        budget.maxMemory !== undefined &&
        budget.maxMemory !== null &&
        metrics.memoryEstimate > budget.maxMemory
      ) {
        violations.push({
          metric: 'maxMemory',
          value: metrics.memoryEstimate,
          budget: budget.maxMemory,
        });
      }

      // Report violations
      for (const violation of violations) {
        if (config.devMode === true) {
          console.warn(`[Module ${moduleId}] Performance budget exceeded:`, violation);
        }

        budget.onBudgetExceeded?.(violation.metric, violation.value, violation.budget);
      }
    },
    [config]
  );

  // Context value
  const contextValue = useMemo<ModuleSystemContextValue>(
    () => ({
      config,
      pool,
      registry,
      loader,
      eventBus,
      security,
      isInitialized,
      reportMetrics,
      checkBudget,
    }),
    [config, pool, registry, loader, eventBus, security, isInitialized, reportMetrics, checkBudget]
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

  // Call onReady after mount (services are initialized)
  useEffect(() => {
    onReady?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only call once on mount

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup is handled by the individual service instances
      // Don't dispose shared instances as they may be used elsewhere
    };
  }, []);

  return (
    <ModuleSystemContext.Provider value={contextValue}>
      <ModuleHierarchyContext.Provider value={hierarchyValue}>
        {children}
      </ModuleHierarchyContext.Provider>
    </ModuleSystemContext.Provider>
  );
};

ModuleProvider.displayName = 'ModuleProvider';
