/**
 * @file Module Loader
 * @module vdom/module-loader
 * @description Dynamic module loading orchestration with priority queues,
 * prefetch hints, code splitting integration, and performance monitoring.
 * Implements intelligent loading strategies for optimal user experience.
 *
 * @author Agent 5 - PhD Virtual DOM Expert
 * @version 1.0.0
 */

import type { ComponentType } from 'react';
import {
  type ModuleId,
  type ModuleLoadOptions,
  type ModuleLoadingState,
  LoadingPriority,
} from './types';
import { getDefaultRegistry, type ModuleRegistry } from './module-registry';
import { DEFAULT_TIMEOUT, DEFAULT_RETRY_BASE_DELAY } from '@/lib/core/config/constants';

// ============================================================================
// Types
// ============================================================================

/**
 * Loading task in the queue.
 */
interface LoadingTask {
  /** Module ID */
  moduleId: ModuleId;
  /** Loading priority */
  priority: LoadingPriority;
  /** Loading options */
  options: ModuleLoadOptions;
  /** Task creation timestamp */
  createdAt: number;
  /** Number of retries attempted */
  retryCount: number;
  /** Resolve function for the promise */
  resolve: (component: ComponentType<unknown>) => void;
  /** Reject function for the promise */
  reject: (error: Error) => void;
}

/**
 * Prefetch hint configuration.
 */
export interface PrefetchHint {
  /** Module ID to prefetch */
  moduleId: ModuleId;
  /** Likelihood of being needed (0-1) */
  probability: number;
  /** When to trigger prefetch */
  trigger: 'immediate' | 'idle' | 'visible' | 'hover';
  /** Element to observe for visibility/hover */
  element?: Element;
}

/**
 * Loading performance metrics.
 */
export interface LoadingMetrics {
  /** Total modules loaded */
  totalLoaded: number;
  /** Total load time (ms) */
  totalLoadTime: number;
  /** Average load time (ms) */
  averageLoadTime: number;
  /** Failed loads */
  failedLoads: number;
  /** Cache hits */
  cacheHits: number;
  /** Prefetch hits */
  prefetchHits: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default loading options.
 */
const DEFAULT_LOAD_OPTIONS: Required<ModuleLoadOptions> = {
  priority: LoadingPriority.NORMAL,
  timeout: DEFAULT_TIMEOUT,
  retries: 3,
  retryDelay: DEFAULT_RETRY_BASE_DELAY,
  preloadDependencies: true,
  onProgress: () => {},
  onComplete: () => {},
  onError: () => {},
};

/**
 * Maximum concurrent loads.
 */
const MAX_CONCURRENT_LOADS = 6;

/**
 * Minimum probability for prefetch to trigger.
 */
const MIN_PREFETCH_PROBABILITY = 0.3;

// ============================================================================
// ModuleLoader Class
// ============================================================================

/**
 * Orchestrates module loading with intelligent strategies.
 * Supports priority-based loading, prefetching, and performance monitoring.
 *
 * @example
 * ```typescript
 * const loader = new ModuleLoader();
 *
 * // Load a module with high priority
 * const component = await loader.load(moduleId, {
 *   priority: LoadingPriority.HIGH,
 *   timeout: 5000,
 * });
 *
 * // Add prefetch hint
 * loader.addPrefetchHint({
 *   moduleId: otherModuleId,
 *   probability: 0.8,
 *   trigger: 'idle',
 * });
 * ```
 */
export class ModuleLoader {
  /** Module registry reference */
  private readonly registry: ModuleRegistry;

  /** Priority queues for loading tasks */
  private readonly queues: Map<LoadingPriority, LoadingTask[]> = new Map();

  /** Currently loading modules */
  private readonly loading: Set<ModuleId> = new Set();

  /** Loading states by module */
  private readonly loadingStates: Map<ModuleId, ModuleLoadingState> = new Map();

  /** Prefetch hints */
  private readonly prefetchHints: Map<ModuleId, PrefetchHint> = new Map();

  /** Intersection observers for visibility-based prefetch */
  private readonly visibilityObservers: Map<ModuleId, IntersectionObserver> = new Map();

  /** Loading metrics */
  private metrics: LoadingMetrics = {
    totalLoaded: 0,
    totalLoadTime: 0,
    averageLoadTime: 0,
    failedLoads: 0,
    cacheHits: 0,
    prefetchHits: 0,
  };

  /** Whether loader is processing queue */
  private isProcessing: boolean = false;

  /** Idle callback ID */
  private idleCallbackId: number | null = null;

  /**
   * Creates a new ModuleLoader.
   * @param registry - Module registry (defaults to global)
   */
  constructor(registry?: ModuleRegistry) {
    this.registry = registry ?? getDefaultRegistry();

    // Initialize priority queues
    Object.values(LoadingPriority)
      .filter((_v): _v is LoadingPriority => true)
      .forEach((priority) => {
        this.queues.set(priority, []);
      });
  }

  // ==========================================================================
  // Loading API
  // ==========================================================================

  /**
   * Gets the number of pending loads.
   */
  get pendingCount(): number {
    let count = 0;
    for (const queue of this.queues.values()) {
      count += queue.length;
    }
    return count;
  }

  /**
   * Gets the number of currently loading modules.
   */
  get loadingCount(): number {
    return this.loading.size;
  }

  /**
   * Loads a module with the given options.
   * @param moduleId - Module to load
   * @param options - Loading options
   * @returns Loaded component
   */
  async load(moduleId: ModuleId, options: ModuleLoadOptions = {}): Promise<ComponentType<unknown>> {
    const opts = { ...DEFAULT_LOAD_OPTIONS, ...options };

    // Check if already loaded (cache hit)
    const entry = this.registry.get(moduleId);
    if (entry?.component) {
      this.metrics.cacheHits++;

      // Check if this was a prefetch hit
      if (this.prefetchHints.has(moduleId)) {
        this.metrics.prefetchHits++;
      }

      opts.onComplete();
      return entry.component;
    }

    // Check if module is registered
    if (!entry) {
      const error = new Error(`Module not registered: ${moduleId}`);
      opts.onError(error);
      throw error;
    }

    // Update loading state
    this.updateLoadingState(moduleId, {
      moduleId,
      state: 'queued',
      progress: 0,
      error: null,
      startedAt: null,
      completedAt: null,
      dependenciesLoaded: 0,
      dependenciesTotal: entry.config.dependencies?.length ?? 0,
    });

    // Create loading promise
    return new Promise<ComponentType<unknown>>((resolve, reject) => {
      const task: LoadingTask = {
        moduleId,
        priority: opts.priority,
        options: opts,
        createdAt: Date.now(),
        retryCount: 0,
        resolve,
        reject,
      };

      // Add to appropriate queue
      const queue = this.queues.get(opts.priority) ?? [];
      queue.push(task);
      this.queues.set(opts.priority, queue);

      // Process queue
      void this.processQueue();
    });
  }

  /**
   * Loads multiple modules in parallel.
   * @param moduleIds - Modules to load
   * @param options - Loading options
   * @returns Loaded components
   */
  async loadMany(
    moduleIds: ModuleId[],
    options: ModuleLoadOptions = {}
  ): Promise<Map<ModuleId, ComponentType<unknown>>> {
    const results = new Map<ModuleId, ComponentType<unknown>>();

    await Promise.all(
      moduleIds.map(async (id) => {
        try {
          const component = await this.load(id, options);
          results.set(id, component);
        } catch {
          // Individual failures don't stop others
        }
      })
    );

    return results;
  }

  // ==========================================================================
  // Prefetching
  // ==========================================================================

  /**
   * Gets the loading state of a module.
   * @param moduleId - Module ID
   * @returns Loading state or null
   */
  getLoadingState(moduleId: ModuleId): ModuleLoadingState | null {
    return this.loadingStates.get(moduleId) ?? null;
  }

  /**
   * Cancels a pending load.
   * @param moduleId - Module to cancel
   * @returns Whether cancellation was successful
   */
  cancel(moduleId: ModuleId): boolean {
    // Remove from queues
    for (const [priority, queue] of this.queues) {
      const index = queue.findIndex((t) => t.moduleId === moduleId);
      if (index !== -1) {
        const [task] = queue.splice(index, 1);
        task?.reject(new Error('Loading cancelled'));
        this.queues.set(priority, queue);
        this.loadingStates.delete(moduleId);
        return true;
      }
    }

    return false;
  }

  /**
   * Adds a prefetch hint for a module.
   * @param hint - Prefetch hint configuration
   */
  addPrefetchHint(hint: PrefetchHint): void {
    if (hint.probability < MIN_PREFETCH_PROBABILITY) {
      return; // Too unlikely to prefetch
    }

    this.prefetchHints.set(hint.moduleId, hint);

    switch (hint.trigger) {
      case 'immediate':
        this.triggerPrefetch(hint.moduleId);
        break;

      case 'idle':
        this.schedulePrefetchOnIdle(hint.moduleId);
        break;

      case 'visible':
        if (hint.element) {
          this.observeForVisibility(hint.moduleId, hint.element);
        }
        break;

      case 'hover':
        if (hint.element) {
          this.observeForHover(hint.moduleId, hint.element);
        }
        break;
    }
  }

  /**
   * Removes a prefetch hint.
   * @param moduleId - Module ID
   */
  removePrefetchHint(moduleId: ModuleId): void {
    this.prefetchHints.delete(moduleId);

    // Clean up observers
    const observer = this.visibilityObservers.get(moduleId);
    if (observer) {
      observer.disconnect();
      this.visibilityObservers.delete(moduleId);
    }
  }

  /**
   * Gets loading metrics.
   * @returns Loading metrics
   */
  getMetrics(): LoadingMetrics {
    return { ...this.metrics };
  }

  /**
   * Resets loading metrics.
   */
  resetMetrics(): void {
    this.metrics = {
      totalLoaded: 0,
      totalLoadTime: 0,
      averageLoadTime: 0,
      failedLoads: 0,
      cacheHits: 0,
      prefetchHits: 0,
    };
  }

  // ==========================================================================
  // Queue Processing
  // ==========================================================================

  /**
   * Clears all queues and cancels pending loads.
   */
  clearQueues(): void {
    for (const [priority, queue] of this.queues) {
      for (const task of queue) {
        task.reject(new Error('Queue cleared'));
      }
      this.queues.set(priority, []);
    }

    this.loadingStates.clear();
  }

  /**
   * Disposes the loader and cleans up resources.
   */
  dispose(): void {
    this.clearQueues();

    // Clean up observers
    for (const observer of this.visibilityObservers.values()) {
      observer.disconnect();
    }
    this.visibilityObservers.clear();

    // Cancel idle callback
    if (this.idleCallbackId !== null && 'cancelIdleCallback' in window) {
      window.cancelIdleCallback(this.idleCallbackId);
    }

    this.prefetchHints.clear();
  }

  /**
   * Triggers prefetch for a module.
   * @param moduleId - Module to prefetch
   */
  private triggerPrefetch(moduleId: ModuleId): void {
    this.load(moduleId, {
      priority: LoadingPriority.PREFETCH,
    }).catch(() => {
      // Prefetch failures are silent
    });
  }

  /**
   * Schedules prefetch for idle time.
   * @param moduleId - Module to prefetch
   */
  private schedulePrefetchOnIdle(moduleId: ModuleId): void {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(
        () => {
          this.triggerPrefetch(moduleId);
        },
        { timeout: 5000 }
      );
    } else {
      // Fallback to setTimeout
      setTimeout(() => {
        this.triggerPrefetch(moduleId);
      }, 100);
    }
  }

  /**
   * Sets up visibility observation for prefetch.
   * @param moduleId - Module ID
   * @param element - Element to observe
   */
  private observeForVisibility(moduleId: ModuleId, element: Element): void {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.triggerPrefetch(moduleId);
            observer.disconnect();
            this.visibilityObservers.delete(moduleId);
          }
        }
      },
      { rootMargin: '100px' }
    );

    observer.observe(element);
    this.visibilityObservers.set(moduleId, observer);
  }

  /**
   * Sets up hover observation for prefetch.
   * @param moduleId - Module ID
   * @param element - Element to observe
   */
  private observeForHover(moduleId: ModuleId, element: Element): void {
    const handler = (): void => {
      void this.triggerPrefetch(moduleId);
      element.removeEventListener('mouseenter', handler);
    };

    element.addEventListener('mouseenter', handler);
  }

  // ==========================================================================
  // Metrics & Management
  // ==========================================================================

  /**
   * Processes the loading queue.
   */
  private processQueue(): void {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.loading.size < MAX_CONCURRENT_LOADS) {
        const task = this.getNextTask();
        if (!task) {
          break;
        }

        // Don't await - allow concurrent processing
        void this.executeTask(task);
      }
    } finally {
      this.isProcessing = false;

      // Schedule next check if there are still items
      if (this.hasQueuedTasks()) {
        void Promise.resolve().then(() => this.processQueue());
      }
    }
  }

  /**
   * Checks if there are any tasks in queues.
   */
  private hasQueuedTasks(): boolean {
    for (const queue of this.queues.values()) {
      if (queue.length > 0) {
        return true;
      }
    }
    return false;
  }

  /**
   * Gets the next task from queues (highest priority first).
   * @returns Next task or null
   */
  private getNextTask(): LoadingTask | null {
    const priorities: readonly LoadingPriority[] = Object.values(LoadingPriority)
      .filter((_v): _v is LoadingPriority => true)
      .sort((a, b) => a - b);

    for (const priority of priorities) {
      const queue = this.queues.get(priority);
      if (queue !== undefined && queue.length > 0) {
        const task = queue.shift();
        if (task !== undefined) {
          return task;
        }
      }
    }

    return null;
  }

  /**
   * Executes a loading task.
   * @param task - Task to execute
   */
  private async executeTask(task: LoadingTask): Promise<void> {
    const { moduleId, options } = task;
    const startTime = Date.now();

    this.loading.add(moduleId);

    this.updateLoadingState(moduleId, {
      moduleId,
      state: 'loading',
      progress: 0.1,
      error: null,
      startedAt: startTime,
      completedAt: null,
      dependenciesLoaded: 0,
      dependenciesTotal: 0,
    });

    try {
      // Load dependencies first if configured
      if (options.preloadDependencies === true) {
        await this.loadDependencies(moduleId, options);
      }

      // Set up timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Loading timeout for module: ${moduleId}`));
        }, options.timeout);
      });

      // Load the component
      const loadPromise = this.registry.getComponent(moduleId);

      const component = await Promise.race([loadPromise, timeoutPromise]);

      if (!component) {
        throw new Error(`Failed to load component: ${moduleId}`);
      }

      // Update metrics
      const loadTime = Date.now() - startTime;
      this.metrics.totalLoaded++;
      this.metrics.totalLoadTime += loadTime;
      this.metrics.averageLoadTime = this.metrics.totalLoadTime / this.metrics.totalLoaded;

      // Update state
      this.updateLoadingState(moduleId, {
        moduleId,
        state: 'loaded',
        progress: 1,
        error: null,
        startedAt: startTime,
        completedAt: Date.now(),
        dependenciesLoaded: 0,
        dependenciesTotal: 0,
      });

      options.onProgress?.(1);
      options.onComplete?.();
      task.resolve(component);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Retry logic
      if (task.retryCount < (options.retries ?? 0)) {
        task.retryCount++;

        // Re-queue with delay
        setTimeout(() => {
          const queue = this.queues.get(task.priority) ?? [];
          queue.push(task);
          this.queues.set(task.priority, queue);
          void this.processQueue();
        }, options.retryDelay);

        return;
      }

      // Final failure
      this.metrics.failedLoads++;

      this.updateLoadingState(moduleId, {
        moduleId,
        state: 'error',
        progress: 0,
        error: err,
        startedAt: startTime,
        completedAt: Date.now(),
        dependenciesLoaded: 0,
        dependenciesTotal: 0,
      });

      options?.onError?.(err);
      task.reject(err);
    } finally {
      this.loading.delete(moduleId);
      void this.processQueue(); // Continue processing
    }
  }

  /**
   * Loads dependencies for a module.
   * @param moduleId - Module ID
   * @param options - Loading options
   */
  private async loadDependencies(moduleId: ModuleId, options: ModuleLoadOptions): Promise<void> {
    const config = this.registry.getConfig(moduleId);
    if (!config?.dependencies || config.dependencies.length === 0) {
      return;
    }

    const deps = config.dependencies.filter((d) => d.lazy !== true);
    let loaded = 0;

    await Promise.all(
      deps.map(async (dep) => {
        try {
          await this.load(dep.moduleId, {
            ...options,
            priority: LoadingPriority.HIGH,
          });
          loaded++;

          const state = this.loadingStates.get(moduleId);
          if (state) {
            this.updateLoadingState(moduleId, {
              ...state,
              dependenciesLoaded: loaded,
              dependenciesTotal: deps.length,
            });
          }
        } catch (error) {
          if (dep.required) {
            throw error;
          }
        }
      })
    );
  }

  /**
   * Updates loading state for a module.
   * @param moduleId - Module ID
   * @param state - New state
   */
  private updateLoadingState(moduleId: ModuleId, state: ModuleLoadingState): void {
    this.loadingStates.set(moduleId, state);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Default global module loader instance.
 */
let defaultLoader: ModuleLoader | null = null;

/**
 * Gets the default global module loader.
 * @returns Default ModuleLoader instance
 */
export function getDefaultLoader(): ModuleLoader {
  defaultLoader ??= new ModuleLoader();
  return defaultLoader;
}

/**
 * Sets the default global module loader.
 * @param loader - Loader to set as default
 */
export function setDefaultLoader(loader: ModuleLoader): void {
  if (defaultLoader) {
    defaultLoader.dispose();
  }
  defaultLoader = loader;
}

/**
 * Resets the default global module loader.
 */
export function resetDefaultLoader(): void {
  if (defaultLoader) {
    defaultLoader.dispose();
    defaultLoader = null;
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Loads a module using the default loader.
 * @param moduleId - Module to load
 * @param options - Loading options
 * @returns Loaded component
 */
export async function loadModule(
  moduleId: ModuleId,
  options?: ModuleLoadOptions
): Promise<ComponentType<unknown>> {
  return getDefaultLoader().load(moduleId, options);
}

/**
 * Prefetches a module using the default loader.
 * @param moduleId - Module to prefetch
 * @param probability - Likelihood of needing the module
 */
export function prefetchModule(moduleId: ModuleId, probability: number = 0.5): void {
  getDefaultLoader().addPrefetchHint({
    moduleId,
    probability,
    trigger: 'idle',
  });
}

/**
 * Creates a lazy loader wrapper for React.lazy() compatibility.
 *
 * @example
 * ```typescript
 * const LazyModule = createLazyLoader(moduleId);
 *
 * // Use in JSX
 * <Suspense fallback={<Loading />}>
 *   <LazyModule />
 * </Suspense>
 * ```
 */
export function createLazyLoader(
  moduleId: ModuleId,
  options?: ModuleLoadOptions
): () => Promise<{ default: ComponentType<unknown> }> {
  return async () => {
    const component = await loadModule(moduleId, options);
    return { default: component };
  };
}
