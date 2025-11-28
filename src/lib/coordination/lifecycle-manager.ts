/**
 * @file Lifecycle Manager
 * @module coordination/lifecycle-manager
 * @description PhD-level library lifecycle orchestration with dependency resolution.
 *
 * Implements sophisticated lifecycle management with:
 * - Phased initialization with configurable ordering
 * - Dependency graph resolution for startup sequencing
 * - Parallel execution within phases for performance
 * - Graceful shutdown with reverse teardown
 * - Suspend/resume for memory pressure handling
 * - Health check aggregation
 * - Error recovery with retries
 *
 * @author Agent 5 - PhD TypeScript Architect
 * @version 1.0.0
 */

import {
  type LibraryId,
  type PhaseId,
  type LibraryState,
  type LibraryRegistration,
  type LifecyclePhase,
  type LifecycleManager,
  type LifecycleManagerConfig,
  DEFAULT_LIFECYCLE_CONFIG,
  DEFAULT_LIFECYCLE_PHASES,
  createLibraryId,
  createPhaseId,
} from './types';
import { publishEvent } from './event-bus';

// ============================================================================
// Internal Types
// ============================================================================

/**
 * Internal library entry with runtime metadata.
 */
interface LibraryEntry extends LibraryRegistration {
  /** Initialization duration */
  initDuration?: number;
  /** Retry count */
  retryCount: number;
  /** Initialization promise for deduplication */
  initPromise?: Promise<void>;
}

/**
 * Dependency resolution result.
 */
interface DependencyResolution {
  /** Whether resolution succeeded */
  success: boolean;
  /** Ordered list of libraries to initialize */
  order: LibraryId[];
  /** Any circular dependencies detected */
  cycles: LibraryId[][];
  /** Missing dependencies */
  missing: Array<{ library: LibraryId; dependency: LibraryId }>;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Performs topological sort for dependency ordering.
 * @param libraries - Map of library entries
 * @returns Dependency resolution result
 */
function topologicalSort(
  libraries: Map<LibraryId, LibraryEntry>
): DependencyResolution {
  const result: DependencyResolution = {
    success: true,
    order: [],
    cycles: [],
    missing: [],
  };

  const visited = new Set<LibraryId>();
  const visiting = new Set<LibraryId>();
  const order: LibraryId[] = [];

  function visit(id: LibraryId, path: LibraryId[]): boolean {
    if (visited.has(id)) return true;
    if (visiting.has(id)) {
      // Cycle detected
      const cycleStart = path.indexOf(id);
      result.cycles.push(path.slice(cycleStart));
      result.success = false;
      return false;
    }

    const entry = libraries.get(id);
    if (!entry) {
      const lastPathElement = path[path.length - 1];
      result.missing.push({ library: createLibraryId(lastPathElement ?? ''), dependency: id });
      return true; // Continue despite missing dependency
    }

    visiting.add(id);

    for (const dep of entry.dependencies) {
      if (!visit(dep, [...path, dep])) {
        return false;
      }
    }

    visiting.delete(id);
    visited.add(id);
    order.push(id);
    return true;
  }

  for (const id of libraries.keys()) {
    if (!visited.has(id)) {
      visit(id, [id]);
    }
  }

  result.order = order;
  return result;
}

/**
 * Groups libraries by phase.
 * @param libraries - Map of library entries
 * @param phases - Phase definitions
 * @returns Map of phase ID to library IDs
 */
function groupByPhase(
  libraries: Map<LibraryId, LibraryEntry>,
  phases: LifecyclePhase[]
): Map<PhaseId, LibraryId[]> {
  const groups = new Map<PhaseId, LibraryId[]>();

  // Initialize groups
  for (const phase of phases) {
    groups.set(phase.id, []);
  }

  // Assign libraries to phases
  for (const [id, entry] of libraries) {
    const group = groups.get(entry.phase);
    if (group) {
      group.push(id);
    } else {
      // Default to 'feature' phase
      const featurePhase = phases.find((p) => p.name === 'Feature');
      if (featurePhase) {
        groups.get(featurePhase.id)?.push(id);
      }
    }
  }

  return groups;
}

/**
 * Executes functions with timeout.
 * @param fn - Function to execute
 * @param timeout - Timeout in milliseconds
 * @param label - Label for error messages
 */
async function withTimeout<T>(
  fn: () => Promise<T>,
  timeout: number,
  label: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Timeout (${timeout}ms) for: ${label}`));
    }, timeout);

    fn()
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error: unknown) => {
        clearTimeout(timeoutId);
        reject(error instanceof Error ? error : new Error(String(error)));
      });
  });
}

// ============================================================================
// LifecycleManagerImpl Class
// ============================================================================

/**
 * Implementation of the lifecycle manager.
 *
 * @example
 * ```typescript
 * const lifecycle = new LifecycleManagerImpl();
 *
 * // Register libraries
 * lifecycle.registerLibrary({
 *   id: createLibraryId('auth'),
 *   name: 'Authentication',
 *   version: '1.0.0',
 *   dependencies: [],
 *   phase: createPhaseId('core'),
 *   initialize: async () => {
 *     await authService.init();
 *   },
 *   cleanup: async () => {
 *     await authService.cleanup();
 *   },
 * });
 *
 * // Initialize all libraries
 * await lifecycle.initialize();
 * ```
 */
export class LifecycleManagerImpl implements LifecycleManager {
  /** Configuration */
  private readonly config: LifecycleManagerConfig;

  /** Registered libraries */
  private readonly libraries: Map<LibraryId, LibraryEntry> = new Map();

  /** Initialization order (computed after resolution) */
  private initializationOrder: LibraryId[] = [];

  /** Overall initialization state */
  private state: 'idle' | 'initializing' | 'initialized' | 'shutting-down' | 'shutdown' = 'idle';

  /** Initialization promise for deduplication */
  private initPromise: Promise<void> | null = null;

  /** Shutdown promise for deduplication */
  private shutdownPromise: Promise<void> | null = null;

  /**
   * Creates a new lifecycle manager.
   * @param config - Configuration options
   */
  constructor(config: Partial<LifecycleManagerConfig> = {}) {
    this.config = {
      ...DEFAULT_LIFECYCLE_CONFIG,
      ...config,
      phases: config.phases ?? [...DEFAULT_LIFECYCLE_PHASES],
    };
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Registers a library for lifecycle management.
   * @param registration - Library registration
   */
  registerLibrary(registration: Omit<LibraryRegistration, 'state'>): void {
    if (this.state !== 'idle') {
      throw new Error('Cannot register libraries after initialization has started');
    }

    const entry: LibraryEntry = {
      ...registration,
      state: 'uninitialized',
      retryCount: 0,
    };

    this.libraries.set(registration.id, entry);
  }

  /**
   * Unregisters a library.
   * @param id - Library ID
   */
  unregisterLibrary(id: LibraryId): void {
    if (this.state !== 'idle') {
      throw new Error('Cannot unregister libraries after initialization has started');
    }

    this.libraries.delete(id);
  }

  /**
   * Initializes all registered libraries.
   * @returns Promise that resolves when initialization completes
   */
  async initialize(): Promise<void> {
    // Deduplicate concurrent init calls
    if (this.initPromise) {
      return this.initPromise;
    }

    if (this.state === 'initialized') {
      return;
    }

    this.initPromise = this.doInitialize();
    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  /**
   * Shuts down all libraries in reverse order.
   * @returns Promise that resolves when shutdown completes
   */
  async shutdown(): Promise<void> {
    // Deduplicate concurrent shutdown calls
    if (this.shutdownPromise) {
      return this.shutdownPromise;
    }

    if (this.state === 'shutdown' || this.state === 'idle') {
      return;
    }

    this.shutdownPromise = this.doShutdown();
    try {
      await this.shutdownPromise;
    } finally {
      this.shutdownPromise = null;
    }
  }

  /**
   * Gets the state of a library.
   * @param id - Library ID
   * @returns Library state or undefined
   */
  getLibraryState(id: LibraryId): LibraryState | undefined {
    return this.libraries.get(id)?.state;
  }

  /**
   * Gets all library states.
   * @returns Map of library ID to state
   */
  getAllStates(): Map<LibraryId, LibraryState> {
    const states = new Map<LibraryId, LibraryState>();
    for (const [id, entry] of this.libraries) {
      states.set(id, entry.state);
    }
    return states;
  }

  /**
   * Checks if all libraries are initialized.
   * @returns True if all libraries are running
   */
  isFullyInitialized(): boolean {
    if (this.state !== 'initialized') return false;
    for (const entry of this.libraries.values()) {
      if (entry.state !== 'running') return false;
    }
    return true;
  }

  /**
   * Performs health check on all libraries.
   * @returns Map of library ID to health status
   */
  async healthCheck(): Promise<Map<LibraryId, boolean>> {
    const results = new Map<LibraryId, boolean>();

    const checks = Array.from(this.libraries.entries()).map(
      async ([id, entry]): Promise<[LibraryId, boolean]> => {
        if (!entry.healthCheck) {
          // No health check = assume healthy if running
          return [id, entry.state === 'running'];
        }

        try {
          const healthy = await Promise.resolve(entry.healthCheck());
          return [id, healthy];
        } catch {
          return [id, false];
        }
      }
    );

    const checkResults = await Promise.all(checks);
    for (const [id, healthy] of checkResults) {
      results.set(id, healthy);
    }

    return results;
  }

  /**
   * Suspends low-priority libraries (e.g., for memory pressure).
   * @returns Promise that resolves when suspension completes
   */
  async suspend(): Promise<void> {
    const suspendable = Array.from(this.libraries.values()).filter(
      (e) => e.suspend != null && e.state === 'running'
    );

    await Promise.all(
      suspendable.map(async (entry) => {
        try {
          entry.state = 'suspending';
          await entry.suspend?.();
          entry.state = 'suspended';
        } catch (error) {
          entry.state = 'error';
          entry.lastError = error instanceof Error ? error : new Error(String(error));
        }
      })
    );
  }

  /**
   * Resumes suspended libraries.
   * @returns Promise that resolves when resume completes
   */
  async resume(): Promise<void> {
    const suspended = Array.from(this.libraries.values()).filter(
      (e) => e.resume && e.state === 'suspended'
    );

    await Promise.all(
      suspended.map(async (entry) => {
        try {
          entry.state = 'resuming';
          await entry.resume?.();
          entry.state = 'running';
        } catch (error) {
          entry.state = 'error';
          entry.lastError = error instanceof Error ? error : new Error(String(error));
        }
      })
    );
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Performs the actual initialization.
   */
  private async doInitialize(): Promise<void> {
    this.state = 'initializing';
    const startTime = performance.now();

    try {
      // Resolve dependencies
      const resolution = topologicalSort(this.libraries);

      if (!resolution.success) {
        const cycleStr = resolution.cycles
          .map((c) => c.join(' -> '))
          .join('; ');
        throw new Error(`Circular dependencies detected: ${cycleStr}`);
      }

      if (resolution.missing.length > 0) {
        console.warn(
          '[Lifecycle] Missing dependencies:',
          resolution.missing.map((m) => `${m.library} -> ${m.dependency}`).join(', ')
        );
      }

      this.initializationOrder = resolution.order;

      // Group libraries by phase
      const phaseGroups = groupByPhase(this.libraries, this.config.phases);

      // Initialize phase by phase
      for (const phase of this.config.phases) {
        const phaseStartTime = performance.now();
        const libraryIds = phaseGroups.get(phase.id) ?? [];

        if (libraryIds.length === 0) continue;

        publishEvent('lifecycle:phase-started', {
          phaseId: phase.id,
          phaseName: phase.name,
          order: phase.order,
        });

        if (this.config.enableParallel && phase.parallel !== false) {
          // Parallel initialization within phase
          await this.initializeLibrariesParallel(libraryIds, phase.timeout);
        } else {
          // Sequential initialization
          await this.initializeLibrariesSequential(libraryIds, phase.timeout);
        }

        const phaseDuration = performance.now() - phaseStartTime;
        this.config.onPhaseComplete?.(phase, phaseDuration);

        publishEvent('lifecycle:phase-completed', {
          phaseId: phase.id,
          phaseName: phase.name,
          duration: phaseDuration,
        });
      }

      this.state = 'initialized';

      const totalDuration = performance.now() - startTime;
      publishEvent('lifecycle:all-initialized', {
        totalDuration,
        libraryCount: this.libraries.size,
      });
    } catch (error) {
      this.state = 'idle';
      throw error;
    }
  }

  /**
   * Initializes libraries in parallel.
   */
  private async initializeLibrariesParallel(
    ids: LibraryId[],
    timeout?: number
  ): Promise<void> {
    const promises = ids.map(async (id) => this.initializeLibrary(id, timeout));
    await Promise.all(promises);
  }

  /**
   * Initializes libraries sequentially.
   */
  private async initializeLibrariesSequential(
    ids: LibraryId[],
    timeout?: number
  ): Promise<void> {
    // Sort by dependency order
    const sorted = ids.sort((a, b) => {
      const aIndex = this.initializationOrder.indexOf(a);
      const bIndex = this.initializationOrder.indexOf(b);
      return aIndex - bIndex;
    });

    for (const id of sorted) {
      await this.initializeLibrary(id, timeout);
    }
  }

  /**
   * Initializes a single library.
   */
  private async initializeLibrary(id: LibraryId, timeout?: number): Promise<void> {
    const entry = this.libraries.get(id);
    if (!entry) return;

    // Skip if already initializing/initialized
    if (entry.state !== 'uninitialized') {
      if (entry.initPromise) {
        await entry.initPromise;
      }
      return;
    }

    const startTime = performance.now();
    entry.state = 'initializing';

    const doInit = async () => {
      try {
        await entry.initialize();
        entry.state = 'running';
        entry.initializedAt = Date.now();
        entry.initDuration = performance.now() - startTime;

        publishEvent('lifecycle:library-initialized', {
          libraryId: id,
          duration: entry.initDuration,
        });
      } catch (error) {
        entry.lastError = error instanceof Error ? error : new Error(String(error));

        // Handle retry
        const maxRetries = this.config.phases.find(
          (p) => p.id === entry.phase
        )?.retries ?? 0;

        if (entry.retryCount < maxRetries) {
          entry.retryCount++;
          entry.state = 'uninitialized';
          await this.initializeLibrary(id, timeout);
        } else {
          entry.state = 'error';
          this.config.onError?.(entry.lastError, entry);
          throw entry.lastError;
        }
      }
    };

    entry.initPromise = timeout
      ? withTimeout(doInit, timeout, `Initialize ${entry.name}`)
      : doInit();

    try {
      await entry.initPromise;
    } finally {
      entry.initPromise = undefined;
    }
  }

  /**
   * Performs the actual shutdown.
   */
  private async doShutdown(): Promise<void> {
    this.state = 'shutting-down';
    const startTime = performance.now();

    publishEvent('lifecycle:shutdown-started', {});

    // Shutdown in reverse initialization order
    const reverseOrder = [...this.initializationOrder].reverse();

    for (const id of reverseOrder) {
      const entry = this.libraries.get(id);
      if (!entry || entry.state === 'disposed') continue;

      entry.state = 'disposing';

      try {
        if (entry.cleanup) {
          await withTimeout(
            async () => entry.cleanup?.(),
            this.config.shutdownTimeout / reverseOrder.length,
            `Cleanup ${entry.name}`
          );
        }
        entry.state = 'disposed';
      } catch (error) {
        entry.state = 'error';
        entry.lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`[Lifecycle] Cleanup error for ${entry.name}:`, error);
      }
    }

    this.state = 'shutdown';

    const duration = performance.now() - startTime;
    publishEvent('lifecycle:shutdown-completed', { duration });
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Global lifecycle manager instance.
 */
let globalLifecycle: LifecycleManagerImpl | null = null;

/**
 * Gets the global lifecycle manager.
 * @param config - Optional configuration
 * @returns Global lifecycle manager instance
 */
export function getLifecycleManager(
  config?: Partial<LifecycleManagerConfig>
): LifecycleManagerImpl {
  if (!globalLifecycle) {
    globalLifecycle = new LifecycleManagerImpl(config);
  }
  return globalLifecycle;
}

/**
 * Sets the global lifecycle manager.
 * @param manager - Lifecycle manager instance
 */
export function setLifecycleManager(manager: LifecycleManagerImpl): void {
  globalLifecycle = manager;
}

/**
 * Resets the global lifecycle manager.
 */
export async function resetLifecycleManager(): Promise<void> {
  if (globalLifecycle) {
    await globalLifecycle.shutdown();
    globalLifecycle = null;
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Registers a library with the global lifecycle manager.
 */
export function registerLibrary(
  registration: Omit<LibraryRegistration, 'state'>
): void {
  getLifecycleManager().registerLibrary(registration);
}

/**
 * Initializes all libraries.
 */
export async function initializeLibraries(): Promise<void> {
  await getLifecycleManager().initialize();
}

/**
 * Shuts down all libraries.
 */
export async function shutdownLibraries(): Promise<void> {
  await getLifecycleManager().shutdown();
}

// ============================================================================
// Pre-defined Library IDs
// ============================================================================

export const LIBRARY_IDS = {
  coordination: createLibraryId('coordination'),
  auth: createLibraryId('auth'),
  rbac: createLibraryId('rbac'),
  theme: createLibraryId('theme'),
  featureFlags: createLibraryId('feature-flags'),
  hydration: createLibraryId('hydration'),
  streaming: createLibraryId('streaming'),
  realtime: createLibraryId('realtime'),
  vdom: createLibraryId('vdom'),
  state: createLibraryId('state'),
  security: createLibraryId('security'),
  performance: createLibraryId('performance'),
  ux: createLibraryId('ux'),
  system: createLibraryId('system'),
} as const;

export const PHASE_IDS = {
  bootstrap: createPhaseId('bootstrap'),
  core: createPhaseId('core'),
  feature: createPhaseId('feature'),
  ui: createPhaseId('ui'),
} as const;
