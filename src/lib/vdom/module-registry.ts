/**
 * @file Module Registry
 * @module vdom/module-registry
 * @description Central module registration and dependency resolution system.
 * Provides module loading orchestration, HMR support, and module versioning.
 * Implements a directed acyclic graph for dependency management.
 *
 * @author Agent 5 - PhD Virtual DOM Expert
 * @version 1.0.0
 */

import type { ComponentType } from 'react';
import {
  type ModuleId,
  type ModuleBoundaryConfig,
  type ModuleRegistryEntry,
  type ModuleQueryOptions,
  type ModuleDependency,
  type ModuleSecurityConfig,
  type HydrationConfig,
  createModuleId,
} from './types';

// ============================================================================
// Types
// ============================================================================

/**
 * HMR update handler type.
 */
export type HMRUpdateHandler = (
  moduleId: ModuleId,
  newComponent: ComponentType<unknown>
) => void;

/**
 * Module registration options.
 */
export interface ModuleRegistrationOptions {
  /** Dynamic import function for lazy loading */
  loader?: () => Promise<{ default: ComponentType<unknown> }>;
  /** Component if already loaded */
  component?: ComponentType<unknown>;
  /** Enable HMR support */
  hmrEnabled?: boolean;
  /** Module priority for loading */
  priority?: number;
  /** Prefetch hint */
  prefetch?: boolean;
}

/**
 * Dependency resolution result.
 */
export interface DependencyResolutionResult {
  /** Resolved modules in topological order */
  resolved: ModuleId[];
  /** Modules that failed to resolve */
  failed: Array<{ moduleId: ModuleId; reason: string }>;
  /** Circular dependency chains detected */
  circularDependencies: ModuleId[][];
}

// ============================================================================
// ModuleRegistry Class
// ============================================================================

/**
 * Central registry for module management.
 * Handles registration, dependency resolution, and HMR.
 *
 * @example
 * ```typescript
 * const registry = new ModuleRegistry();
 *
 * // Register a module
 * registry.register({
 *   id: createModuleId('my-module'),
 *   name: 'My Module',
 * }, {
 *   loader: () => import('./MyModule'),
 * });
 *
 * // Get module component
 * const component = await registry.getComponent(createModuleId('my-module'));
 * ```
 */
export class ModuleRegistry {
  /** Registered modules */
  private readonly modules: Map<ModuleId, ModuleRegistryEntry> = new Map();

  /** HMR update handlers */
  private readonly hmrHandlers: Set<HMRUpdateHandler> = new Set();

  /** Dependency graph (moduleId -> dependsOn) */
  private readonly dependencyGraph: Map<ModuleId, Set<ModuleId>> = new Map();

  /** Reverse dependency graph (moduleId -> dependedOnBy) */
  private readonly reverseDependencyGraph: Map<ModuleId, Set<ModuleId>> = new Map();

  /** Module load promises for deduplication */
  private readonly loadPromises: Map<ModuleId, Promise<ComponentType<unknown>>> =
    new Map();

  /** Module versions (for HMR) */
  private readonly moduleVersions: Map<ModuleId, number> = new Map();

  // ==========================================================================
  // Registration
  // ==========================================================================

  /**
   * Registers a module with the registry.
   * @param config - Module configuration
   * @param options - Registration options
   * @returns Whether registration was successful
   */
  register(
    config: ModuleBoundaryConfig,
    options: ModuleRegistrationOptions = {}
  ): boolean {
    if (this.modules.has(config.id)) {
      console.warn(`Module already registered: ${config.id}`);
      return false;
    }

    const entry: ModuleRegistryEntry = {
      config,
      loader: options.loader
        ? async () => {
            if (!options.loader) {
              throw new Error('Loader became undefined');
            }
            const module = await options.loader();
            return module.default;
          }
        : undefined,
      component: options.component ?? null,
      loadingState: options.component ? 'loaded' : 'idle',
      loadingError: null,
      registeredAt: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 0,
      hmrEnabled: options.hmrEnabled ?? false,
    };

    this.modules.set(config.id, entry);
    this.moduleVersions.set(config.id, 1);

    // Build dependency graph
    this.updateDependencyGraph(config);

    return true;
  }

  /**
   * Unregisters a module from the registry.
   * @param moduleId - Module to unregister
   * @returns Whether unregistration was successful
   */
  unregister(moduleId: ModuleId): boolean {
    const entry = this.modules.get(moduleId);
    if (!entry) {
      return false;
    }

    // Remove from dependency graphs
    this.dependencyGraph.delete(moduleId);
    this.reverseDependencyGraph.delete(moduleId);

    // Remove this module from other modules' dependency lists
    for (const [, deps] of this.dependencyGraph) {
      deps.delete(moduleId);
    }
    for (const [, deps] of this.reverseDependencyGraph) {
      deps.delete(moduleId);
    }

    // Remove module
    this.modules.delete(moduleId);
    this.moduleVersions.delete(moduleId);
    this.loadPromises.delete(moduleId);

    return true;
  }

  /**
   * Checks if a module is registered.
   * @param moduleId - Module ID to check
   */
  has(moduleId: ModuleId): boolean {
    return this.modules.has(moduleId);
  }

  /**
   * Gets a module entry.
   * @param moduleId - Module ID
   * @returns Module entry or null
   */
  get(moduleId: ModuleId): ModuleRegistryEntry | null {
    const entry = this.modules.get(moduleId);
    if (entry) {
      entry.lastAccessedAt = Date.now();
      entry.accessCount++;
    }
    return entry ?? null;
  }

  /**
   * Gets module configuration.
   * @param moduleId - Module ID
   * @returns Module configuration or null
   */
  getConfig(moduleId: ModuleId): ModuleBoundaryConfig | null {
    return this.get(moduleId)?.config ?? null;
  }

  // ==========================================================================
  // Component Loading
  // ==========================================================================

  /**
   * Gets or loads a module's component.
   * @param moduleId - Module ID
   * @returns Component or null if not found
   */
  async getComponent(
    moduleId: ModuleId
  ): Promise<ComponentType<unknown> | null> {
    const entry = this.get(moduleId);
    if (!entry) {
      return null;
    }

    // Already loaded
    if (entry.component) {
      return entry.component;
    }

    // No loader
    if (!entry.loader) {
      return null;
    }

    // Check for existing load promise (deduplication)
    const existingPromise = this.loadPromises.get(moduleId);
    if (existingPromise) {
      return existingPromise;
    }

    // Start loading
    entry.loadingState = 'loading';

    const loadPromise = (async () => {
      try {
        if (!entry.loader) {
          throw new Error(`No loader available for module: ${moduleId}`);
        }
        const component = await entry.loader();
        entry.component = component;
        entry.loadingState = 'loaded';
        entry.loadingError = null;
        return component;
      } catch (error) {
        entry.loadingState = 'error';
        entry.loadingError =
          error instanceof Error ? error : new Error(String(error));
        throw entry.loadingError;
      } finally {
        this.loadPromises.delete(moduleId);
      }
    })();

    this.loadPromises.set(moduleId, loadPromise);
    return loadPromise;
  }

  /**
   * Preloads a module's component.
   * @param moduleId - Module ID
   */
  async preload(moduleId: ModuleId): Promise<void> {
    await this.getComponent(moduleId);
  }

  /**
   * Preloads multiple modules.
   * @param moduleIds - Module IDs to preload
   */
  async preloadMany(moduleIds: ModuleId[]): Promise<void> {
    await Promise.all(moduleIds.map(async (id) => await this.preload(id)));
  }

  // ==========================================================================
  // Dependency Resolution
  // ==========================================================================

  /**
   * Updates the dependency graph for a module.
   * @param config - Module configuration
   */
  private updateDependencyGraph(config: ModuleBoundaryConfig): void {
    const dependencies = new Set<ModuleId>();

    if (config.dependencies) {
      for (const dep of config.dependencies) {
        dependencies.add(dep.moduleId);

        // Update reverse graph
        if (!this.reverseDependencyGraph.has(dep.moduleId)) {
          this.reverseDependencyGraph.set(dep.moduleId, new Set());
        }
        const reverseSet = this.reverseDependencyGraph.get(dep.moduleId);
        if (reverseSet) {
          reverseSet.add(config.id);
        }
      }
    }

    this.dependencyGraph.set(config.id, dependencies);
  }

  /**
   * Resolves dependencies for a module using topological sort.
   * @param moduleId - Root module ID
   * @param options - Resolution options
   * @returns Resolution result
   */
  resolveDependencies(
    moduleId: ModuleId,
    options: { maxDepth?: number; includeOptional?: boolean } = {}
  ): DependencyResolutionResult {
    const { maxDepth = Infinity, includeOptional = true } = options;

    const resolved: ModuleId[] = [];
    const failed: Array<{ moduleId: ModuleId; reason: string }> = [];
    const circularDependencies: ModuleId[][] = [];

    const visited = new Set<ModuleId>();
    const inProgress = new Set<ModuleId>();
    const currentPath: ModuleId[] = [];

    const visit = (id: ModuleId, depth: number): boolean => {
      if (depth > maxDepth) {
        return true;
      }

      if (visited.has(id)) {
        return true;
      }

      if (inProgress.has(id)) {
        // Circular dependency detected
        const cycleStart = currentPath.indexOf(id);
        const cycle = [...currentPath.slice(cycleStart), id];
        circularDependencies.push(cycle);
        return false;
      }

      const entry = this.modules.get(id);
      if (!entry) {
        failed.push({ moduleId: id, reason: 'Module not registered' });
        return false;
      }

      inProgress.add(id);
      currentPath.push(id);

      // Visit dependencies
      const deps = this.dependencyGraph.get(id);
      if (deps) {
        for (const depId of deps) {
          const depConfig = entry.config.dependencies?.find(
            (d) => d.moduleId === depId
          );

          // Skip optional dependencies if not including them
          if (!includeOptional && depConfig && !depConfig.required) {
            continue;
          }

          if (visit(depId, depth + 1) === false) {
            // If required dependency failed, propagate failure
            if (depConfig?.required === true) {
              failed.push({
                moduleId: id,
                reason: `Required dependency failed: ${depId}`,
              });
            }
          }
        }
      }

      currentPath.pop();
      inProgress.delete(id);
      visited.add(id);
      resolved.push(id);

      return true;
    };

    visit(moduleId, 0);

    return { resolved, failed, circularDependencies };
  }

  /**
   * Gets modules that depend on a given module.
   * @param moduleId - Module ID
   * @returns Array of dependent module IDs
   */
  getDependents(moduleId: ModuleId): ModuleId[] {
    const dependents = this.reverseDependencyGraph.get(moduleId);
    return dependents ? Array.from(dependents) : [];
  }

  /**
   * Gets modules that a given module depends on.
   * @param moduleId - Module ID
   * @returns Array of dependency module IDs
   */
  getDependencies(moduleId: ModuleId): ModuleId[] {
    const dependencies = this.dependencyGraph.get(moduleId);
    return dependencies ? Array.from(dependencies) : [];
  }

  // ==========================================================================
  // Hot Module Replacement
  // ==========================================================================

  /**
   * Registers an HMR update handler.
   * @param handler - Update handler
   * @returns Unsubscribe function
   */
  onHMRUpdate(handler: HMRUpdateHandler): () => void {
    this.hmrHandlers.add(handler);
    return () => this.hmrHandlers.delete(handler);
  }

  /**
   * Handles an HMR update for a module.
   * @param moduleId - Module that was updated
   * @param newComponent - New component
   */
  handleHMRUpdate(
    moduleId: ModuleId,
    newComponent: ComponentType<unknown>
  ): void {
    const entry = this.modules.get(moduleId);
    if (entry?.hmrEnabled !== true) {
      return;
    }

    // Update component
    entry.component = newComponent;
    entry.lastAccessedAt = Date.now();

    // Increment version
    const currentVersion = this.moduleVersions.get(moduleId) ?? 1;
    this.moduleVersions.set(moduleId, currentVersion + 1);

    // Notify handlers
    for (const handler of this.hmrHandlers) {
      try {
        handler(moduleId, newComponent);
      } catch (error) {
        console.error('HMR update handler error:', error);
      }
    }

    // Notify dependent modules
    const dependents = this.getDependents(moduleId);
    for (const depId of dependents) {
      const depEntry = this.modules.get(depId);
      if (depEntry?.hmrEnabled === true) {
        // Trigger re-render of dependents
        const depVersion = this.moduleVersions.get(depId) ?? 1;
        this.moduleVersions.set(depId, depVersion + 1);
      }
    }
  }

  /**
   * Gets the current version of a module.
   * @param moduleId - Module ID
   * @returns Version number
   */
  getVersion(moduleId: ModuleId): number {
    return this.moduleVersions.get(moduleId) ?? 0;
  }

  // ==========================================================================
  // Query
  // ==========================================================================

  /**
   * Queries modules based on criteria.
   * @param options - Query options
   * @returns Matching module entries
   */
  query(options: ModuleQueryOptions = {}): ModuleRegistryEntry[] {
    const results: ModuleRegistryEntry[] = [];

    for (const entry of this.modules.values()) {
      let matches = true;

      // Filter by name pattern
      if (options.namePattern && !options.namePattern.test(entry.config.name)) {
        matches = false;
      }

      if (matches) {
        results.push(entry);
      }
    }

    return results;
  }

  /**
   * Gets all registered module IDs.
   * @returns Array of module IDs
   */
  getAllModuleIds(): ModuleId[] {
    return Array.from(this.modules.keys());
  }

  /**
   * Gets the count of registered modules.
   */
  get size(): number {
    return this.modules.size;
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  /**
   * Clears all registered modules.
   */
  clear(): void {
    this.modules.clear();
    this.dependencyGraph.clear();
    this.reverseDependencyGraph.clear();
    this.loadPromises.clear();
    this.moduleVersions.clear();
    this.hmrHandlers.clear();
  }

  /**
   * Exports registry state for debugging.
   * @returns Registry state object
   */
  exportState(): {
    modules: Array<{
      id: ModuleId;
      name: string;
      loadingState: string;
      accessCount: number;
    }>;
    dependencyGraph: Record<string, string[]>;
  } {
    const modules = Array.from(this.modules.entries()).map(([id, entry]) => ({
      id,
      name: entry.config.name,
      loadingState: entry.loadingState,
      accessCount: entry.accessCount,
    }));

    const dependencyGraph: Record<string, string[]> = {};
    for (const [id, deps] of this.dependencyGraph) {
      dependencyGraph[id] = Array.from(deps);
    }

    return { modules, dependencyGraph };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Default global module registry instance.
 */
let defaultRegistry: ModuleRegistry | null = null;

/**
 * Gets the default global module registry.
 * @returns Default ModuleRegistry instance
 */
export function getDefaultRegistry(): ModuleRegistry {
  defaultRegistry ??= new ModuleRegistry();
  return defaultRegistry;
}

/**
 * Sets the default global module registry.
 * @param registry - Registry to set as default
 */
export function setDefaultRegistry(registry: ModuleRegistry): void {
  defaultRegistry = registry;
}

/**
 * Resets the default global module registry.
 */
export function resetDefaultRegistry(): void {
  if (defaultRegistry) {
    defaultRegistry.clear();
    defaultRegistry = null;
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Registers a module with the default registry.
 * @param config - Module configuration
 * @param options - Registration options
 * @returns Whether registration was successful
 */
export function registerModule(
  config: ModuleBoundaryConfig,
  options?: ModuleRegistrationOptions
): boolean {
  return getDefaultRegistry().register(config, options);
}

/**
 * Gets a module component from the default registry.
 * @param moduleId - Module ID
 * @returns Component or null
 */
export async function getModuleComponent(
  moduleId: ModuleId
): Promise<ComponentType<unknown> | null> {
  return getDefaultRegistry().getComponent(moduleId);
}

/**
 * Creates a module registration helper with builder pattern.
 *
 * @example
 * ```typescript
 * const registration = createModuleRegistration('my-module', 'My Module')
 *   .withLoader(() => import('./MyModule'))
 *   .withDependency('other-module')
 *   .withHMR()
 *   .register();
 * ```
 */
type ModuleRegistrationBuilder = {
  withLoader: (loader: () => Promise<{ default: ComponentType<unknown> }>) => ModuleRegistrationBuilder;
  withComponent: (component: ComponentType<unknown>) => ModuleRegistrationBuilder;
  withDependency: (moduleId: ModuleId, required?: boolean) => ModuleRegistrationBuilder;
  withSecurity: (security: Partial<ModuleSecurityConfig>) => ModuleRegistrationBuilder;
  withHydration: (hydration: Partial<HydrationConfig>) => ModuleRegistrationBuilder;
  withHMR: (enabled?: boolean) => ModuleRegistrationBuilder;
  withVersion: (version: string) => ModuleRegistrationBuilder;
  register: (registry?: ModuleRegistry) => boolean;
};

export function createModuleRegistration(id: string, name: string): ModuleRegistrationBuilder {
  const moduleId = createModuleId(id);
  const config: ModuleBoundaryConfig = { id: moduleId, name };
  const options: ModuleRegistrationOptions = {};
  const dependencies: ModuleDependency[] = [];

  return {
    withLoader(loader: () => Promise<{ default: ComponentType<unknown> }>) {
      options.loader = loader;
      return this;
    },

    withComponent(component: ComponentType<unknown>) {
      options.component = component;
      return this;
    },

    withDependency(depId: string, required = true, lazy = false) {
      dependencies.push({
        moduleId: createModuleId(depId),
        required,
        lazy,
      });
      return this;
    },

    withHMR(enabled = true) {
      options.hmrEnabled = enabled;
      return this;
    },

    withVersion(version: string) {
      (config as { version: string }).version = version;
      return this;
    },

    register(registry?: ModuleRegistry) {
      const finalConfig = {
        ...config,
        dependencies: dependencies.length > 0 ? dependencies : undefined,
      };

      const reg = registry ?? getDefaultRegistry();
      return reg.register(finalConfig, options);
    },
  };
}
