/**
 * @file Module System Hooks
 * @description Hooks for accessing module system context and utilities
 */

import { useContext } from 'react';
import type { ModuleId } from '../types';
import type { ModuleSystemContextValue } from '../ModuleProviderContext';
import { ModuleSystemContext, ModuleHierarchyContext } from '../ModuleProviderContext';
import type { VDOMPool } from '../vdom-pool';
import type { ModuleRegistry } from '../module-registry';
import type { ModuleLoader } from '../module-loader';
import type { ModuleEventBus } from '../event-bus';

// ============================================================================
// Context Hooks
// ============================================================================

/**
 * Hook to access the module system context.
 * @throws Error if used outside of ModuleProvider
 * @returns Module system context value
 */
export function useModuleSystem(): ModuleSystemContextValue {
  const context = useContext<ModuleSystemContextValue | null>(ModuleSystemContext);
  if (context === null || context === undefined) {
    throw new Error('useModuleSystem must be used within a ModuleProvider');
  }
  return context;
}

/**
 * Hook to access the module hierarchy context.
 * @returns Module hierarchy context value
 */
export function useModuleHierarchy(): {
  moduleId: ModuleId | null;
  depth: number;
  path: readonly ModuleId[];
} {
  return useContext<{
    moduleId: ModuleId | null;
    depth: number;
    path: readonly ModuleId[];
  }>(ModuleHierarchyContext);
}

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
