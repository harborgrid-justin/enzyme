/**
 * @file Virtual Module System
 * @module vdom/virtual-module
 * @description Core virtual module management system providing module boundary
 * definition, lifecycle management, dependency tracking, and lazy mounting.
 * Implements a finite state machine for module lifecycle transitions.
 *
 * @author Agent 5 - PhD Virtual DOM Expert
 * @version 1.0.0
 */

import type { ErrorInfo, ReactNode } from 'react';
import {
  type ModuleId,
  type VirtualModule,
  type VirtualNode,
  type ModuleBoundaryConfig,
  type ModuleBoundaryState,
  type ModuleDependency,
  type ModuleLifecycleHooks,
  type ModulePerformanceMetrics,
  ModuleLifecycleState,
  ModuleLifecycleEvent,
  HydrationState,
  createModuleId,
} from './types';

// ============================================================================
// Constants
// ============================================================================

/**
 * Valid lifecycle state transitions.
 * Maps current state to allowed next states.
 */
const VALID_TRANSITIONS: Record<ModuleLifecycleState, ModuleLifecycleState[]> = {
  [ModuleLifecycleState.REGISTERED]: [
    ModuleLifecycleState.INITIALIZING,
    ModuleLifecycleState.DISPOSED,
  ],
  [ModuleLifecycleState.INITIALIZING]: [
    ModuleLifecycleState.INITIALIZED,
    ModuleLifecycleState.ERROR,
  ],
  [ModuleLifecycleState.INITIALIZED]: [
    ModuleLifecycleState.MOUNTING,
    ModuleLifecycleState.SUSPENDED,
    ModuleLifecycleState.DISPOSED,
  ],
  [ModuleLifecycleState.MOUNTING]: [
    ModuleLifecycleState.MOUNTED,
    ModuleLifecycleState.ERROR,
  ],
  [ModuleLifecycleState.MOUNTED]: [
    ModuleLifecycleState.UNMOUNTING,
    ModuleLifecycleState.SUSPENDED,
    ModuleLifecycleState.ERROR,
  ],
  [ModuleLifecycleState.SUSPENDED]: [
    ModuleLifecycleState.MOUNTING,
    ModuleLifecycleState.UNMOUNTING,
    ModuleLifecycleState.DISPOSED,
  ],
  [ModuleLifecycleState.UNMOUNTING]: [
    ModuleLifecycleState.UNMOUNTED,
    ModuleLifecycleState.ERROR,
  ],
  [ModuleLifecycleState.UNMOUNTED]: [
    ModuleLifecycleState.MOUNTING,
    ModuleLifecycleState.DISPOSED,
  ],
  [ModuleLifecycleState.ERROR]: [
    ModuleLifecycleState.INITIALIZING,
    ModuleLifecycleState.MOUNTING,
    ModuleLifecycleState.DISPOSED,
  ],
  [ModuleLifecycleState.DISPOSED]: [],
};

// ============================================================================
// Module State Factory
// ============================================================================

/**
 * Creates initial module boundary state.
 * @returns Fresh module boundary state
 */
function createInitialState(): ModuleBoundaryState {
  return {
    lifecycleState: ModuleLifecycleState.REGISTERED,
    hydrationState: HydrationState.DEHYDRATED,
    isVisible: false,
    isActive: false,
    error: null,
    errorInfo: null,
    slots: new Map(),
    moduleState: new Map(),
    metrics: createInitialMetrics(),
  };
}

/**
 * Creates initial performance metrics.
 * @returns Fresh performance metrics object
 */
function createInitialMetrics(): ModulePerformanceMetrics {
  return {
    initTime: 0,
    mountTime: 0,
    hydrationTime: 0,
    renderCount: 0,
    totalRenderTime: 0,
    avgRenderTime: 0,
    peakRenderTime: 0,
    updateCount: 0,
    memoryEstimate: 0,
    vNodeCount: 0,
    domNodeCount: 0,
    lastMeasuredAt: 0,
  };
}

// ============================================================================
// VirtualModuleManager Class
// ============================================================================

/**
 * Manager class for virtual module lifecycle and state.
 * Implements the Module Boundary pattern with full lifecycle management.
 */
export class VirtualModuleManager {
  /** Module configuration */
  private readonly config: ModuleBoundaryConfig;

  /** Current module state */
  private state: ModuleBoundaryState;

  /** Lifecycle hooks */
  private readonly hooks: ModuleLifecycleHooks;

  /** Event listeners for lifecycle events */
  private readonly listeners: Map<ModuleLifecycleEvent, Set<() => void>>;

  /** Child modules */
  private readonly children: Map<ModuleId, VirtualModuleManager>;

  /** Parent module reference */
  private parent: VirtualModuleManager | null = null;

  /** Virtual DOM nodes */
  private vdom: VirtualNode[] = [];

  /** Container element */
  private container: Element | null = null;

  /** Portal roots */
  private readonly portals: Map<string, Element> = new Map();

  /** Performance measurement marks */
  private readonly perfMarks: Map<string, number> = new Map();

  /** Dependency resolution cache */
  private resolvedDependencies: Map<ModuleId, VirtualModuleManager> | null = null;

  /**
   * Creates a new VirtualModuleManager.
   * @param config - Module boundary configuration
   */
  constructor(config: ModuleBoundaryConfig) {
    this.config = config;
    this.state = createInitialState();
    this.hooks = config.lifecycle ?? {};
    this.listeners = new Map();
    this.children = new Map();

    // Initialize listener sets for all lifecycle events
    Object.values(ModuleLifecycleEvent).forEach((event) => {
      this.listeners.set(event, new Set());
    });
  }

  // ==========================================================================
  // Getters
  // ==========================================================================

  /**
   * Gets the module ID.
   */
  get id(): ModuleId {
    return this.config.id;
  }

  /**
   * Gets the module name.
   */
  get name(): string {
    return this.config.name;
  }

  /**
   * Gets the current lifecycle state.
   */
  get lifecycleState(): ModuleLifecycleState {
    return this.state.lifecycleState;
  }

  /**
   * Gets the current hydration state.
   */
  get hydrationState(): HydrationState {
    return this.state.hydrationState;
  }

  /**
   * Gets whether the module is mounted.
   */
  get isMounted(): boolean {
    return this.state.lifecycleState === ModuleLifecycleState.MOUNTED;
  }

  /**
   * Gets whether the module is visible.
   */
  get isVisible(): boolean {
    return this.state.isVisible;
  }

  /**
   * Gets whether the module has an error.
   */
  get hasError(): boolean {
    return this.state.error !== null;
  }

  /**
   * Gets the current error.
   */
  get error(): Error | null {
    return this.state.error;
  }

  /**
   * Gets the performance metrics.
   */
  get metrics(): ModulePerformanceMetrics {
    return { ...this.state.metrics };
  }

  /**
   * Gets the module configuration.
   */
  getConfig(): ModuleBoundaryConfig {
    return this.config;
  }

  /**
   * Gets the current state (immutable snapshot).
   */
  getState(): Readonly<ModuleBoundaryState> {
    return this.state;
  }

  /**
   * Gets the virtual DOM nodes.
   */
  getVDOM(): ReadonlyArray<VirtualNode> {
    return this.vdom;
  }

  /**
   * Gets child modules.
   */
  getChildren(): ReadonlyMap<ModuleId, VirtualModuleManager> {
    return this.children;
  }

  /**
   * Gets the parent module.
   */
  getParent(): VirtualModuleManager | null {
    return this.parent;
  }

  // ==========================================================================
  // Lifecycle Management
  // ==========================================================================

  /**
   * Validates if a state transition is allowed.
   * @param from - Current state
   * @param to - Target state
   * @returns Whether the transition is valid
   */
  private isValidTransition(
    from: ModuleLifecycleState,
    to: ModuleLifecycleState
  ): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
  }

  /**
   * Transitions to a new lifecycle state.
   * @param to - Target state
   * @throws Error if transition is invalid
   */
  private async transitionTo(to: ModuleLifecycleState): Promise<void> {
    const from = this.state.lifecycleState;

    if (!this.isValidTransition(from, to)) {
      throw new Error(
        `Invalid lifecycle transition: ${from} -> ${to} for module ${this.config.name}`
      );
    }

    this.state = {
      ...this.state,
      lifecycleState: to,
    };

    // Emit corresponding lifecycle event
    const eventMap: Partial<Record<ModuleLifecycleState, ModuleLifecycleEvent>> = {
      [ModuleLifecycleState.INITIALIZED]: ModuleLifecycleEvent.AFTER_INIT,
      [ModuleLifecycleState.MOUNTED]: ModuleLifecycleEvent.AFTER_MOUNT,
      [ModuleLifecycleState.UNMOUNTED]: ModuleLifecycleEvent.AFTER_UNMOUNT,
      [ModuleLifecycleState.ERROR]: ModuleLifecycleEvent.ERROR,
      [ModuleLifecycleState.DISPOSED]: ModuleLifecycleEvent.DISPOSE,
    };

    const event = eventMap[to];
    if (event) {
      await this.emitLifecycleEvent(event);
    }
  }

  /**
   * Initializes the module.
   * @throws Error if initialization fails
   */
  async initialize(): Promise<void> {
    if (this.state.lifecycleState !== ModuleLifecycleState.REGISTERED) {
      throw new Error(
        `Cannot initialize module in state: ${this.state.lifecycleState}`
      );
    }

    this.markPerf('init:start');

    try {
      await this.transitionTo(ModuleLifecycleState.INITIALIZING);
      await this.emitLifecycleEvent(ModuleLifecycleEvent.BEFORE_INIT);

      // Execute initialization hook
      if (this.hooks.onBeforeInit) {
        await this.hooks.onBeforeInit();
      }

      // Resolve dependencies
      await this.resolveDependencies();

      // Execute after init hook
      if (this.hooks.onAfterInit) {
        await this.hooks.onAfterInit();
      }

      await this.transitionTo(ModuleLifecycleState.INITIALIZED);
    } catch (error) {
      await this.handleError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      this.markPerf('init:end');
      this.updateMetric('initTime', this.measurePerf('init:start', 'init:end'));
    }
  }

  /**
   * Mounts the module to a container element.
   * @param container - DOM container element
   */
  async mount(container: Element): Promise<void> {
    const validStates = [
      ModuleLifecycleState.INITIALIZED,
      ModuleLifecycleState.SUSPENDED,
      ModuleLifecycleState.UNMOUNTED,
    ] as const;

    if (!validStates.includes(this.state.lifecycleState as typeof validStates[number])) {
      throw new Error(
        `Cannot mount module in state: ${this.state.lifecycleState}`
      );
    }

    this.markPerf('mount:start');

    try {
      await this.transitionTo(ModuleLifecycleState.MOUNTING);
      await this.emitLifecycleEvent(ModuleLifecycleEvent.BEFORE_MOUNT);

      if (this.hooks.onBeforeMount) {
        await this.hooks.onBeforeMount();
      }

      this.container = container;

      // Mount child modules
      for (const child of this.children.values()) {
        if (child.lifecycleState !== ModuleLifecycleState.MOUNTED) {
          const childContainer = this.findChildContainer(child.id);
          if (childContainer) {
            await child.mount(childContainer);
          }
        }
      }

      if (this.hooks.onAfterMount) {
        await this.hooks.onAfterMount();
      }

      this.state = {
        ...this.state,
        isActive: true,
      };

      await this.transitionTo(ModuleLifecycleState.MOUNTED);
    } catch (error) {
      await this.handleError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      this.markPerf('mount:end');
      this.updateMetric('mountTime', this.measurePerf('mount:start', 'mount:end'));
    }
  }

  /**
   * Unmounts the module.
   */
  async unmount(): Promise<void> {
    if (this.state.lifecycleState !== ModuleLifecycleState.MOUNTED) {
      return; // Already unmounted or not mounted
    }

    try {
      await this.transitionTo(ModuleLifecycleState.UNMOUNTING);
      await this.emitLifecycleEvent(ModuleLifecycleEvent.BEFORE_UNMOUNT);

      if (this.hooks.onBeforeUnmount) {
        await this.hooks.onBeforeUnmount();
      }

      // Unmount child modules first
      for (const child of this.children.values()) {
        await child.unmount();
      }

      // Clear container reference
      this.container = null;

      // Clear portals
      this.portals.clear();

      if (this.hooks.onAfterUnmount) {
        await this.hooks.onAfterUnmount();
      }

      this.state = {
        ...this.state,
        isActive: false,
      };

      await this.transitionTo(ModuleLifecycleState.UNMOUNTED);
    } catch (error) {
      await this.handleError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Suspends the module (lazy state).
   */
  async suspend(): Promise<void> {
    const validStates = [
      ModuleLifecycleState.INITIALIZED,
      ModuleLifecycleState.MOUNTED,
    ] as const;

    if (!validStates.includes(this.state.lifecycleState as typeof validStates[number])) {
      return;
    }

    // Unmount if currently mounted
    if (this.state.lifecycleState === ModuleLifecycleState.MOUNTED) {
      await this.unmount();
    }

    await this.transitionTo(ModuleLifecycleState.SUSPENDED);
  }

  /**
   * Disposes the module and releases resources.
   */
  async dispose(): Promise<void> {
    if (this.state.lifecycleState === ModuleLifecycleState.DISPOSED) {
      return;
    }

    try {
      // Unmount if mounted
      if (this.state.lifecycleState === ModuleLifecycleState.MOUNTED) {
        await this.unmount();
      }

      await this.emitLifecycleEvent(ModuleLifecycleEvent.DISPOSE);

      if (this.hooks.onDispose) {
        await this.hooks.onDispose();
      }

      // Dispose child modules
      for (const child of this.children.values()) {
        await child.dispose();
      }

      // Clear all data
      this.children.clear();
      this.listeners.forEach((set) => set.clear());
      this.listeners.clear();
      this.vdom = [];
      this.resolvedDependencies = null;
      this.parent = null;

      await this.transitionTo(ModuleLifecycleState.DISPOSED);
    } catch {
      // Even if disposal fails, mark as disposed
      this.state = {
        ...this.state,
        lifecycleState: ModuleLifecycleState.DISPOSED,
      };
    }
  }

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  /**
   * Handles an error in the module.
   * @param error - The error that occurred
   * @param errorInfo - React error info (optional)
   */
  async handleError(error: Error, errorInfo?: ErrorInfo): Promise<void> {
    this.state = {
      ...this.state,
      error,
      errorInfo: errorInfo ?? null,
    };

    // Call error hook
    if (this.hooks.onError) {
      this.hooks.onError(error, errorInfo);
    }

    // Emit error event
    await this.emitLifecycleEvent(ModuleLifecycleEvent.ERROR);

    // Transition to error state if not already
    if (this.state.lifecycleState !== ModuleLifecycleState.ERROR) {
      try {
        await this.transitionTo(ModuleLifecycleState.ERROR);
      } catch {
        // Force error state even if transition fails
        this.state = {
          ...this.state,
          lifecycleState: ModuleLifecycleState.ERROR,
        };
      }
    }
  }

  /**
   * Clears the error state and allows recovery.
   */
  clearError(): void {
    this.state = {
      ...this.state,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Attempts to recover from error state.
   */
  async recover(): Promise<void> {
    if (this.state.lifecycleState !== ModuleLifecycleState.ERROR) {
      return;
    }

    this.clearError();

    // Try to reinitialize
    this.state = {
      ...this.state,
      lifecycleState: ModuleLifecycleState.REGISTERED,
    };

    await this.initialize();
  }

  // ==========================================================================
  // Dependency Management
  // ==========================================================================

  /**
   * Resolves module dependencies using topological sort.
   */
  private async resolveDependencies(): Promise<void> {
    if (this.config.dependencies == null || this.config.dependencies.length === 0) {
      this.resolvedDependencies = new Map();
      return;
    }

    // Build dependency graph
    const { dependencies } = this.config;
    const resolved = new Map<ModuleId, VirtualModuleManager>();
    const visited = new Set<ModuleId>();
    const inProgress = new Set<ModuleId>();

    const resolve = async (dep: ModuleDependency): Promise<void> => {
      if (visited.has(dep.moduleId)) {
        return;
      }

      if (inProgress.has(dep.moduleId)) {
        throw new Error(
          `Circular dependency detected: ${dep.moduleId} in module ${this.config.name}`
        );
      }

      inProgress.add(dep.moduleId);

      // Get dependency module manager (would be from registry in real implementation)
      const manager = this.findDependency(dep.moduleId);

      if (!manager && dep.required) {
        throw new Error(
          `Required dependency not found: ${dep.moduleId} for module ${this.config.name}`
        );
      }

      if (manager) {
        // Resolve transitive dependencies
        if (manager.config.dependencies) {
          for (const transDep of manager.config.dependencies) {
            await resolve(transDep);
          }
        }

        resolved.set(dep.moduleId, manager);
      }

      inProgress.delete(dep.moduleId);
      visited.add(dep.moduleId);
    };

    for (const dep of dependencies) {
      await resolve(dep);
    }

    this.resolvedDependencies = resolved;
  }

  /**
   * Finds a dependency module.
   * @param moduleId - ID of the dependency
   * @returns Module manager or null
   */
  private findDependency(moduleId: ModuleId): VirtualModuleManager | null {
    // Check parent chain
    let current: VirtualModuleManager | null = this.parent;
    while (current) {
      if (current.id === moduleId) {
        return current;
      }
      const child = current.children.get(moduleId);
      if (child) {
        return child;
      }
      current = current.parent;
    }
    return null;
  }

  /**
   * Gets resolved dependencies.
   */
  getDependencies(): ReadonlyMap<ModuleId, VirtualModuleManager> {
    return this.resolvedDependencies ?? new Map();
  }

  // ==========================================================================
  // Child Module Management
  // ==========================================================================

  /**
   * Registers a child module.
   * @param child - Child module manager
   */
  registerChild(child: VirtualModuleManager): void {
    if (this.children.has(child.id)) {
      throw new Error(
        `Child module already registered: ${child.id} in ${this.config.name}`
      );
    }

    child.parent = this;
    this.children.set(child.id, child);
  }

  /**
   * Unregisters a child module.
   * @param moduleId - ID of child module
   */
  async unregisterChild(moduleId: ModuleId): Promise<void> {
    const child = this.children.get(moduleId);
    if (!child) {
      return;
    }

    await child.dispose();
    this.children.delete(moduleId);
  }

  /**
   * Gets a child module by ID.
   * @param moduleId - Child module ID
   */
  getChild(moduleId: ModuleId): VirtualModuleManager | null {
    return this.children.get(moduleId) ?? null;
  }

  /**
   * Finds container element for a child module.
   * @param moduleId - Child module ID
   */
  private findChildContainer(moduleId: ModuleId): Element | null {
    if (!this.container) {
      return null;
    }

    // Look for slot with module ID
    return this.container.querySelector(`[data-module-slot="${moduleId}"]`);
  }

  // ==========================================================================
  // Slot Management
  // ==========================================================================

  /**
   * Sets content for a named slot.
   * @param name - Slot name
   * @param content - React content
   */
  setSlot(name: string, content: ReactNode): void {
    const slotDef = this.config.slots?.find((s) => s.name === name);

    if (slotDef?.accepts && content !== null) {
      // Validate slot content type would happen here
    }

    const newSlots = new Map(this.state.slots);
    newSlots.set(name, content);

    this.state = {
      ...this.state,
      slots: newSlots,
    };
  }

  /**
   * Gets content from a named slot.
   * @param name - Slot name
   */
  getSlot(name: string): ReactNode | null {
    return this.state.slots.get(name) ?? null;
  }

  /**
   * Clears a named slot.
   * @param name - Slot name
   */
  clearSlot(name: string): void {
    const newSlots = new Map(this.state.slots);
    newSlots.delete(name);

    this.state = {
      ...this.state,
      slots: newSlots,
    };
  }

  // ==========================================================================
  // Module State Management
  // ==========================================================================

  /**
   * Sets a module-scoped state value.
   * @param key - State key
   * @param value - State value
   */
  setModuleState<T>(key: string, value: T): void {
    const newState = new Map(this.state.moduleState);
    newState.set(key, value);

    this.state = {
      ...this.state,
      moduleState: newState,
    };
  }

  /**
   * Gets a module-scoped state value.
   * @param key - State key
   */
  getModuleState<T>(key: string): T | undefined {
    return this.state.moduleState.get(key) as T | undefined;
  }

  /**
   * Clears all module-scoped state.
   */
  clearModuleState(): void {
    this.state = {
      ...this.state,
      moduleState: new Map(),
    };
  }

  // ==========================================================================
  // Visibility Management
  // ==========================================================================

  /**
   * Updates visibility state.
   * @param isVisible - Whether module is visible
   */
  setVisibility(isVisible: boolean): void {
    if (this.state.isVisible === isVisible) {
      return;
    }

    this.state = {
      ...this.state,
      isVisible,
    };
  }

  // ==========================================================================
  // VDOM Management
  // ==========================================================================

  /**
   * Sets the virtual DOM nodes.
   * @param nodes - Virtual DOM nodes
   */
  setVDOM(nodes: VirtualNode[]): void {
    this.vdom = nodes;
    this.updateMetric('vNodeCount', this.countVNodes(nodes));
  }

  /**
   * Counts total virtual nodes recursively.
   */
  private countVNodes(nodes: VirtualNode[]): number {
    let count = nodes.length;
    for (const node of nodes) {
      if (Array.isArray(node.children)) {
        const childNodes = node.children.filter(
          (c): c is VirtualNode => typeof c !== 'string'
        );
        count += this.countVNodes(childNodes);
      }
    }
    return count;
  }

  // ==========================================================================
  // Portal Management
  // ==========================================================================

  /**
   * Registers a portal root.
   * @param name - Portal name
   * @param element - Portal container element
   */
  registerPortal(name: string, element: Element): void {
    this.portals.set(name, element);
  }

  /**
   * Gets a portal root.
   * @param name - Portal name
   */
  getPortal(name: string): Element | null {
    return this.portals.get(name) ?? null;
  }

  /**
   * Unregisters a portal.
   * @param name - Portal name
   */
  unregisterPortal(name: string): void {
    this.portals.delete(name);
  }

  // ==========================================================================
  // Event Management
  // ==========================================================================

  /**
   * Subscribes to a lifecycle event.
   * @param event - Lifecycle event type
   * @param handler - Event handler
   * @returns Unsubscribe function
   */
  subscribe(event: ModuleLifecycleEvent, handler: () => void): () => void {
    const listeners = this.listeners.get(event);
    if (!listeners) {
      return () => {};
    }

    listeners.add(handler);

    return () => {
      listeners.delete(handler);
    };
  }

  /**
   * Emits a lifecycle event.
   * @param event - Lifecycle event type
   */
  private emitLifecycleEvent(event: ModuleLifecycleEvent): void {
    const listeners = this.listeners.get(event);
    if (!listeners) {
      return;
    }

    for (const listener of listeners) {
      try {
        listener();
      } catch (error) {
        console.error(`Error in lifecycle event handler for ${event}:`, error);
      }
    }
  }

  // ==========================================================================
  // Performance Measurement
  // ==========================================================================

  /**
   * Marks a performance timestamp.
   * @param name - Mark name
   */
  private markPerf(name: string): void {
    this.perfMarks.set(name, performance.now());
  }

  /**
   * Measures time between two marks.
   * @param startMark - Start mark name
   * @param endMark - End mark name
   */
  private measurePerf(startMark: string, endMark: string): number {
    const start = this.perfMarks.get(startMark);
    const end = this.perfMarks.get(endMark);

    if (start === undefined || end === undefined) {
      return 0;
    }

    return end - start;
  }

  /**
   * Updates a performance metric.
   * @param metric - Metric name
   * @param value - Metric value
   */
  private updateMetric<K extends keyof ModulePerformanceMetrics>(
    metric: K,
    value: ModulePerformanceMetrics[K]
  ): void {
    this.state = {
      ...this.state,
      metrics: {
        ...this.state.metrics,
        [metric]: value,
        lastMeasuredAt: Date.now(),
      },
    };
  }

  /**
   * Records a render.
   * @param renderTime - Time taken to render (ms)
   */
  recordRender(renderTime: number): void {
    const { renderCount, totalRenderTime, peakRenderTime } = this.state.metrics;

    const newRenderCount = renderCount + 1;
    const newTotalRenderTime = totalRenderTime + renderTime;
    const newPeakRenderTime = Math.max(peakRenderTime, renderTime);
    const newAvgRenderTime = newTotalRenderTime / newRenderCount;

    this.state = {
      ...this.state,
      metrics: {
        ...this.state.metrics,
        renderCount: newRenderCount,
        totalRenderTime: newTotalRenderTime,
        avgRenderTime: newAvgRenderTime,
        peakRenderTime: newPeakRenderTime,
        lastMeasuredAt: Date.now(),
      },
    };
  }

  // ==========================================================================
  // Serialization
  // ==========================================================================

  /**
   * Exports the module to a VirtualModule interface.
   */
  toVirtualModule(): VirtualModule {
    return {
      config: this.config,
      state: this.state,
      vdom: this.vdom,
      container: this.container,
      portals: this.portals,
      children: new Map(
        Array.from(this.children.entries()).map(([id, manager]) => [
          id,
          manager.toVirtualModule(),
        ])
      ),
      parent: this.parent?.toVirtualModule() ?? null,
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a new virtual module manager.
 * @param config - Module configuration
 * @returns New VirtualModuleManager instance
 *
 * @example
 * ```typescript
 * const module = createVirtualModule({
 *   id: createModuleId('my-module'),
 *   name: 'My Module',
 *   version: '1.0.0',
 *   lifecycle: {
 *     onAfterMount: () => console.log('Module mounted'),
 *   },
 * });
 * ```
 */
export function createVirtualModule(
  config: ModuleBoundaryConfig
): VirtualModuleManager {
  return new VirtualModuleManager(config);
}

/**
 * Creates a module ID with validation.
 * @param id - Raw ID string
 * @returns Branded ModuleId
 *
 * @example
 * ```typescript
 * const moduleId = createValidatedModuleId('feature-dashboard');
 * ```
 */
export function createValidatedModuleId(id: string): ModuleId {
  if (!id || typeof id !== 'string') {
    throw new Error('Module ID must be a non-empty string');
  }

  // Validate format (alphanumeric, hyphens, underscores)
  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id)) {
    throw new Error(
      'Module ID must start with a letter and contain only alphanumeric characters, hyphens, and underscores'
    );
  }

  return createModuleId(id);
}

/**
 * Creates a minimal module configuration.
 * @param id - Module ID
 * @param name - Module name
 * @returns Minimal module configuration
 */
export function createMinimalConfig(
  id: string,
  name: string
): ModuleBoundaryConfig {
  return {
    id: createValidatedModuleId(id),
    name,
  };
}
