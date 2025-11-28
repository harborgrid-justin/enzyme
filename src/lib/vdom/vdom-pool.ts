/**
 * @file VDOM Pool Implementation
 * @module vdom/vdom-pool
 * @description Memory-efficient virtual node pooling system with automatic
 * garbage collection, pool size management, and memory pressure detection.
 * Implements the Object Pool pattern for optimal VDOM performance.
 *
 * @author Agent 5 - PhD Virtual DOM Expert
 * @version 1.0.0
 */

import type { ComponentType } from 'react';
import {
  type VirtualNode,
  type VNodeId,
  type VNodeProps,
  type VNodeCreateOptions,
  type VDOMPoolConfig,
  type VDOMPoolStats,
  type ModuleId,
  VNodeType,
  HydrationState,
  DEFAULT_POOL_CONFIG,
  createVNodeId,
} from './types';

// ============================================================================
// Constants
// ============================================================================

/**
 * Estimated bytes per virtual node (rough approximation).
 */
const ESTIMATED_BYTES_PER_NODE = 256;

/**
 * Counter for generating unique node IDs.
 */
let nodeIdCounter = 0;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generates a unique node ID.
 * @returns Unique VNodeId
 */
function generateNodeId(): VNodeId {
  nodeIdCounter += 1;
  return createVNodeId(`vnode_${Date.now().toString(36)}_${nodeIdCounter.toString(36)}`);
}

/**
 * Creates an empty virtual node for pooling.
 * @param generation - Pool generation number
 * @returns Empty VirtualNode
 */
function createEmptyNode(generation: number): VirtualNode {
  return {
    id: generateNodeId(),
    type: VNodeType.ELEMENT,
    tag: 'div',
    props: {},
    children: [],
    parent: null,
    element: null,
    moduleId: null,
    hydrationState: HydrationState.DEHYDRATED,
    poolGeneration: generation,
    isPooled: true,
    lastUpdated: 0,
  };
}

/**
 * Resets a virtual node to its initial state.
 * @param node - Node to reset
 * @param generation - Current pool generation
 */
function resetNode(node: VirtualNode, generation: number): void {
  // Use type assertion since we're modifying a readonly type during reset
  const mutableNode = node as {
    -readonly [K in keyof VirtualNode]: VirtualNode[K];
  };

  mutableNode.id = generateNodeId();
  mutableNode.type = VNodeType.ELEMENT;
  mutableNode.tag = 'div';
  mutableNode.props = {};
  mutableNode.children = [];
  mutableNode.parent = null;
  mutableNode.element = null;
  mutableNode.moduleId = null;
  mutableNode.hydrationState = HydrationState.DEHYDRATED;
  mutableNode.poolGeneration = generation;
  mutableNode.isPooled = true;
  mutableNode.lastUpdated = 0;
}

// ============================================================================
// MemoryPressureDetector Class
// ============================================================================

/**
 * Detects memory pressure using Performance API.
 */
class MemoryPressureDetector {
  private readonly threshold: number;
  private lastCheck: number = 0;
  private readonly checkInterval: number = 1000; // 1 second

  constructor(threshold: number) {
    this.threshold = threshold;
  }

  /**
   * Checks if memory pressure is detected.
   * @returns Whether memory pressure is above threshold
   */
  isUnderPressure(): boolean {
    const now = Date.now();
    if (now - this.lastCheck < this.checkInterval) {
      return false; // Throttle checks
    }

    this.lastCheck = now;

    // Use Performance.memory if available (Chrome only)
    const performance = globalThis.performance as Performance & {
      memory?: {
        usedJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    };

    if (performance.memory) {
      const { usedJSHeapSize, jsHeapSizeLimit } = performance.memory;
      const usage = usedJSHeapSize / jsHeapSizeLimit;
      return usage > this.threshold;
    }

    return false;
  }

  /**
   * Gets current memory usage ratio.
   * @returns Memory usage ratio (0-1) or null if unavailable
   */
  getMemoryUsage(): number | null {
    const performance = globalThis.performance as Performance & {
      memory?: {
        usedJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    };

    if (performance.memory) {
      return performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
    }

    return null;
  }
}

// ============================================================================
// VDOMPool Class
// ============================================================================

/**
 * Memory-efficient virtual node pool with automatic garbage collection.
 * Implements the Object Pool pattern for optimal performance.
 *
 * @example
 * ```typescript
 * const pool = new VDOMPool({ initialSize: 100, maxSize: 1000 });
 *
 * // Acquire a node
 * const node = pool.acquire({
 *   type: VNodeType.ELEMENT,
 *   tag: 'div',
 *   props: { className: 'container' },
 * });
 *
 * // Use the node...
 *
 * // Release back to pool
 * pool.release(node);
 * ```
 */
export class VDOMPool {
  /** Pool configuration */
  private readonly config: VDOMPoolConfig;

  /** Available (free) nodes */
  private readonly freeNodes: VirtualNode[] = [];

  /** In-use nodes (weak reference to allow GC) */
  private readonly inUseNodes: Set<VNodeId> = new Set();

  /** All nodes in pool (for GC) */
  private readonly allNodes: Map<VNodeId, VirtualNode> = new Map();

  /** Current pool generation (increments on GC) */
  private generation: number = 0;

  /** Statistics tracking */
  private stats: VDOMPoolStats;

  /** Memory pressure detector */
  private readonly memoryDetector: MemoryPressureDetector;

  /** GC interval handle */
  private gcIntervalId: ReturnType<typeof setInterval> | null = null;

  /** Whether pool is disposed */
  private isDisposed: boolean = false;

  /**
   * Creates a new VDOM Pool.
   * @param config - Pool configuration (partial)
   */
  constructor(config: Partial<VDOMPoolConfig> = {}) {
    this.config = { ...DEFAULT_POOL_CONFIG, ...config };

    this.stats = {
      totalNodes: 0,
      inUseNodes: 0,
      freeNodes: 0,
      acquireCount: 0,
      releaseCount: 0,
      expansionCount: 0,
      gcCount: 0,
      gcCollectedCount: 0,
      generation: 0,
      estimatedMemoryBytes: 0,
      lastGcTimestamp: 0,
      utilization: 0,
    };

    this.memoryDetector = new MemoryPressureDetector(
      this.config.memoryPressureThreshold
    );

    // Initialize pool with initial size
    this.expand(this.config.initialSize);

    // Start GC interval
    this.startGCInterval();
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Acquires a virtual node from the pool.
   * @param options - Node creation options
   * @returns Virtual node instance
   */
  acquire(options: {
    type?: VNodeType;
    tag?: string | ComponentType<unknown>;
    props?: VNodeProps;
    children?: (VirtualNode | string)[];
    moduleId?: ModuleId;
    hydrationState?: HydrationState;
  } = {}): VirtualNode {
    if (this.isDisposed) {
      throw new Error('Cannot acquire from disposed pool');
    }

    // Check if expansion needed
    if (this.freeNodes.length < this.config.minFreeNodes) {
      this.maybeExpand();
    }

    // Get node from pool or create new
    let node: VirtualNode;

    if (this.freeNodes.length > 0) {
      node = this.freeNodes.pop()!;
    } else {
      node = createEmptyNode(this.generation);
      this.allNodes.set(node.id, node);
    }

    // Configure node
    const mutableNode = node as {
      -readonly [K in keyof VirtualNode]: VirtualNode[K];
    };

    mutableNode.type = options.type ?? VNodeType.ELEMENT;
    mutableNode.tag = options.tag ?? 'div';
    mutableNode.props = options.props ?? {};
    mutableNode.children = options.children ?? [];
    mutableNode.moduleId = options.moduleId ?? null;
    mutableNode.hydrationState = options.hydrationState ?? HydrationState.DEHYDRATED;
    mutableNode.isPooled = false;
    mutableNode.lastUpdated = Date.now();

    // Track in-use
    this.inUseNodes.add(node.id);

    // Update stats
    this.updateStats({
      acquireCount: this.stats.acquireCount + 1,
    });

    return node;
  }

  /**
   * Releases a virtual node back to the pool.
   * @param node - Node to release
   */
  release(node: VirtualNode): void {
    if (this.isDisposed) {
      return;
    }

    if (!this.allNodes.has(node.id)) {
      // Node not from this pool, ignore
      return;
    }

    if (node.isPooled) {
      // Already released
      return;
    }

    // Release children recursively
    for (const child of node.children) {
      if (typeof child !== 'string' && !child.isPooled) {
        this.release(child);
      }
    }

    // Reset node
    resetNode(node, this.generation);

    // Remove from in-use tracking
    this.inUseNodes.delete(node.id);

    // Add back to free pool
    this.freeNodes.push(node);

    // Update stats
    this.updateStats({
      releaseCount: this.stats.releaseCount + 1,
    });
  }

  /**
   * Releases multiple nodes at once.
   * @param nodes - Nodes to release
   */
  releaseMany(nodes: VirtualNode[]): void {
    for (const node of nodes) {
      this.release(node);
    }
  }

  /**
   * Forces garbage collection of old nodes.
   */
  gc(): void {
    if (this.isDisposed) {
      return;
    }

    const now = Date.now();
    const nodeTtl = this.config.nodeTtlMs;
    let collectedCount = 0;

    // Collect old free nodes
    const nodesToKeep: VirtualNode[] = [];
    const nodesToRemove: VNodeId[] = [];

    for (const node of this.freeNodes) {
      const age = now - node.lastUpdated;
      const isOld = age > nodeTtl;
      const exceedsShrinkThreshold =
        this.freeNodes.length > this.config.maxSize * this.config.shrinkThreshold;

      if (isOld && exceedsShrinkThreshold) {
        nodesToRemove.push(node.id);
        collectedCount++;
      } else {
        nodesToKeep.push(node);
      }
    }

    // Remove collected nodes
    for (const nodeId of nodesToRemove) {
      this.allNodes.delete(nodeId);
    }

    // Update free nodes array
    this.freeNodes.length = 0;
    this.freeNodes.push(...nodesToKeep);

    // Increment generation
    this.generation++;

    // Update stats
    this.updateStats({
      gcCount: this.stats.gcCount + 1,
      gcCollectedCount: this.stats.gcCollectedCount + collectedCount,
      lastGcTimestamp: now,
      generation: this.generation,
    });
  }

  /**
   * Gets current pool statistics.
   * @returns Pool statistics
   */
  getStats(): VDOMPoolStats {
    this.recalculateStats();
    return { ...this.stats };
  }

  /**
   * Clears all nodes from the pool.
   */
  clear(): void {
    this.freeNodes.length = 0;
    this.inUseNodes.clear();
    this.allNodes.clear();
    this.generation++;

    this.updateStats({
      totalNodes: 0,
      inUseNodes: 0,
      freeNodes: 0,
      generation: this.generation,
    });
  }

  /**
   * Disposes the pool and releases all resources.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    this.stopGCInterval();
    this.clear();
    this.isDisposed = true;
  }

  /**
   * Checks if pool is disposed.
   */
  get disposed(): boolean {
    return this.isDisposed;
  }

  /**
   * Gets the current generation number.
   */
  get currentGeneration(): number {
    return this.generation;
  }

  // ==========================================================================
  // Node Creation Helpers
  // ==========================================================================

  /**
   * Creates an element node.
   * @param tag - HTML tag name
   * @param props - Node properties
   * @param children - Child nodes
   * @param options - Additional options
   * @returns Element virtual node
   */
  createElement(
    tag: string,
    props: VNodeProps = {},
    children: (VirtualNode | string)[] = [],
    options: VNodeCreateOptions = {}
  ): VirtualNode {
    return this.acquire({
      type: VNodeType.ELEMENT,
      tag,
      props,
      children,
      moduleId: options.moduleId,
      hydrationState: options.hydrationState,
    });
  }

  /**
   * Creates a text node.
   * @param text - Text content
   * @param options - Additional options
   * @returns Text virtual node
   */
  createText(text: string, options: VNodeCreateOptions = {}): VirtualNode {
    return this.acquire({
      type: VNodeType.TEXT,
      tag: '#text',
      props: {},
      children: [text],
      moduleId: options.moduleId,
      hydrationState: options.hydrationState,
    });
  }

  /**
   * Creates a fragment node.
   * @param children - Child nodes
   * @param options - Additional options
   * @returns Fragment virtual node
   */
  createFragment(
    children: (VirtualNode | string)[] = [],
    options: VNodeCreateOptions = {}
  ): VirtualNode {
    return this.acquire({
      type: VNodeType.FRAGMENT,
      tag: '#fragment',
      props: {},
      children,
      moduleId: options.moduleId,
      hydrationState: options.hydrationState,
    });
  }

  /**
   * Creates a component node.
   * @param component - React component
   * @param props - Component props
   * @param children - Child nodes
   * @param options - Additional options
   * @returns Component virtual node
   */
  createComponent(
    component: ComponentType<unknown>,
    props: VNodeProps = {},
    children: (VirtualNode | string)[] = [],
    options: VNodeCreateOptions = {}
  ): VirtualNode {
    return this.acquire({
      type: VNodeType.COMPONENT,
      tag: component,
      props,
      children,
      moduleId: options.moduleId,
      hydrationState: options.hydrationState,
    });
  }

  /**
   * Creates a module boundary node.
   * @param moduleId - Module ID
   * @param children - Child nodes
   * @param options - Additional options
   * @returns Module boundary virtual node
   */
  createModuleBoundary(
    moduleId: ModuleId,
    children: (VirtualNode | string)[] = [],
    options: Omit<VNodeCreateOptions, 'moduleId'> = {}
  ): VirtualNode {
    return this.acquire({
      type: VNodeType.MODULE_BOUNDARY,
      tag: '#module-boundary',
      props: { attributes: { 'data-module-id': moduleId } },
      children,
      moduleId,
      hydrationState: options.hydrationState,
    });
  }

  // ==========================================================================
  // Tree Operations
  // ==========================================================================

  /**
   * Clones a virtual node tree.
   * @param node - Node to clone
   * @param deep - Whether to clone children
   * @returns Cloned node
   */
  clone(node: VirtualNode, deep: boolean = true): VirtualNode {
    const clonedChildren: (VirtualNode | string)[] = deep
      ? node.children.map((child) =>
          typeof child === 'string' ? child : this.clone(child, true)
        )
      : [...node.children];

    const cloned = this.acquire({
      type: node.type,
      tag: node.tag,
      props: { ...node.props },
      children: clonedChildren,
      moduleId: node.moduleId ?? undefined,
      hydrationState: node.hydrationState,
    });

    // Update parent references
    if (deep) {
      for (const child of clonedChildren) {
        if (typeof child !== 'string') {
          child.parent = cloned;
        }
      }
    }

    return cloned;
  }

  /**
   * Appends a child to a node.
   * @param parent - Parent node
   * @param child - Child to append
   */
  appendChild(parent: VirtualNode, child: VirtualNode | string): void {
    const mutableParent = parent as {
      -readonly [K in keyof VirtualNode]: VirtualNode[K];
    };
    mutableParent.children = [...parent.children, child];

    if (typeof child !== 'string') {
      child.parent = parent;
    }
  }

  /**
   * Removes a child from a node.
   * @param parent - Parent node
   * @param child - Child to remove
   */
  removeChild(parent: VirtualNode, child: VirtualNode): void {
    const mutableParent = parent as {
      -readonly [K in keyof VirtualNode]: VirtualNode[K];
    };
    mutableParent.children = parent.children.filter((c) => c !== child);
    child.parent = null;
  }

  /**
   * Replaces a child node.
   * @param parent - Parent node
   * @param oldChild - Child to replace
   * @param newChild - New child
   */
  replaceChild(
    parent: VirtualNode,
    oldChild: VirtualNode,
    newChild: VirtualNode | string
  ): void {
    const mutableParent = parent as {
      -readonly [K in keyof VirtualNode]: VirtualNode[K];
    };
    const index = parent.children.indexOf(oldChild);

    if (index !== -1) {
      const newChildren = [...parent.children];
      newChildren[index] = newChild;
      mutableParent.children = newChildren;

      oldChild.parent = null;
      if (typeof newChild !== 'string') {
        newChild.parent = parent;
      }
    }
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Expands the pool by creating new nodes.
   * @param count - Number of nodes to create
   */
  private expand(count: number): void {
    const actualCount = Math.min(
      count,
      this.config.maxSize - this.allNodes.size
    );

    if (actualCount <= 0) {
      return;
    }

    for (let i = 0; i < actualCount; i++) {
      const node = createEmptyNode(this.generation);
      this.allNodes.set(node.id, node);
      this.freeNodes.push(node);
    }

    this.updateStats({
      expansionCount: this.stats.expansionCount + 1,
    });
  }

  /**
   * Expands the pool if needed.
   */
  private maybeExpand(): void {
    // Check memory pressure first
    if (
      this.config.enableMemoryPressure &&
      this.memoryDetector.isUnderPressure()
    ) {
      // Under pressure, run GC instead of expanding
      this.gc();
      return;
    }

    // Check if we can expand
    if (this.allNodes.size >= this.config.maxSize) {
      return;
    }

    // Calculate expansion size
    const currentFree = this.freeNodes.length;
    const targetFree = this.config.minFreeNodes * this.config.growthFactor;
    const neededNodes = Math.ceil(targetFree - currentFree);

    if (neededNodes > 0) {
      this.expand(neededNodes);
    }
  }

  /**
   * Recalculates pool statistics.
   */
  private recalculateStats(): void {
    const totalNodes = this.allNodes.size;
    const inUseNodes = this.inUseNodes.size;
    const freeNodes = this.freeNodes.length;
    const utilization = totalNodes > 0 ? inUseNodes / totalNodes : 0;
    const estimatedMemoryBytes = totalNodes * ESTIMATED_BYTES_PER_NODE;

    this.stats = {
      ...this.stats,
      totalNodes,
      inUseNodes,
      freeNodes,
      utilization,
      estimatedMemoryBytes,
    };
  }

  /**
   * Updates specific stats.
   * @param updates - Partial stats to update
   */
  private updateStats(updates: Partial<VDOMPoolStats>): void {
    this.stats = { ...this.stats, ...updates };
  }

  /**
   * Starts the GC interval.
   */
  private startGCInterval(): void {
    if (this.config.gcIntervalMs > 0) {
      this.gcIntervalId = setInterval(() => {
        this.gc();
      }, this.config.gcIntervalMs);
    }
  }

  /**
   * Stops the GC interval.
   */
  private stopGCInterval(): void {
    if (this.gcIntervalId !== null) {
      clearInterval(this.gcIntervalId);
      this.gcIntervalId = null;
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Default global VDOM pool instance.
 */
let defaultPool: VDOMPool | null = null;

/**
 * Gets the default global VDOM pool.
 * @returns Default VDOMPool instance
 */
export function getDefaultPool(): VDOMPool {
  if (!defaultPool || defaultPool.disposed) {
    defaultPool = new VDOMPool();
  }
  return defaultPool;
}

/**
 * Sets the default global VDOM pool.
 * @param pool - Pool to set as default
 */
export function setDefaultPool(pool: VDOMPool): void {
  if (defaultPool && !defaultPool.disposed) {
    defaultPool.dispose();
  }
  defaultPool = pool;
}

/**
 * Resets the default global VDOM pool.
 */
export function resetDefaultPool(): void {
  if (defaultPool) {
    defaultPool.dispose();
    defaultPool = null;
  }
}

// ============================================================================
// Convenience Factory Functions
// ============================================================================

/**
 * Creates a new VDOM pool with custom configuration.
 * @param config - Pool configuration
 * @returns New VDOMPool instance
 *
 * @example
 * ```typescript
 * const pool = createVDOMPool({
 *   initialSize: 200,
 *   maxSize: 5000,
 *   gcIntervalMs: 15000,
 * });
 * ```
 */
export function createVDOMPool(config: Partial<VDOMPoolConfig> = {}): VDOMPool {
  return new VDOMPool(config);
}

/**
 * Acquires a node from the default pool.
 * @param options - Node options
 * @returns Virtual node
 */
export function acquireNode(
  options: Parameters<VDOMPool['acquire']>[0] = {}
): VirtualNode {
  return getDefaultPool().acquire(options);
}

/**
 * Releases a node to the default pool.
 * @param node - Node to release
 */
export function releaseNode(node: VirtualNode): void {
  getDefaultPool().release(node);
}
