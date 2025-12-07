/**
 * @file Dependency Graph
 * @description Visualize store dependencies and component subscriptions
 */

// ============================================================================
// Types
// ============================================================================

export enum NodeKind {
  STORE = 'store',
  COMPONENT = 'component',
  SLICE = 'slice',
  HOOK = 'hook',
}

export interface GraphNode {
  id: string;
  label: string;
  kind: NodeKind;
  x?: number;
  y?: number;
  metadata?: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  weight?: number;
  metadata?: Record<string, unknown>;
}

export interface Graph {
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge>;
}

export interface LayoutOptions {
  width?: number;
  height?: number;
  nodeSpacing?: number;
  levelSpacing?: number;
}

export interface CircularDependency {
  nodes: GraphNode[];
  path: string[];
}

// ============================================================================
// Dependency Graph
// ============================================================================

export class DependencyGraph {
  private graph: Graph;
  private nodeIdCounter = 0;
  private edgeIdCounter = 0;

  constructor() {
    this.graph = {
      nodes: new Map(),
      edges: new Map(),
    };
  }

  /**
   * Add a node
   */
  addNode(label: string, kind: NodeKind, metadata?: Record<string, unknown>): GraphNode {
    const node: GraphNode = {
      id: this.generateNodeId(),
      label,
      kind,
      metadata,
    };

    this.graph.nodes.set(node.id, node);
    return node;
  }

  /**
   * Remove a node
   */
  removeNode(id: string): boolean {
    // Remove all edges connected to this node
    for (const [edgeId, edge] of this.graph.edges) {
      if (edge.source === id || edge.target === id) {
        this.graph.edges.delete(edgeId);
      }
    }

    return this.graph.nodes.delete(id);
  }

  /**
   * Add an edge
   */
  addEdge(
    sourceId: string,
    targetId: string,
    label?: string,
    weight = 1,
    metadata?: Record<string, unknown>
  ): GraphEdge | null {
    const source = this.graph.nodes.get(sourceId);
    const target = this.graph.nodes.get(targetId);

    if (!source || !target) {
      return null;
    }

    const edge: GraphEdge = {
      id: this.generateEdgeId(),
      source: sourceId,
      target: targetId,
      label,
      weight,
      metadata,
    };

    this.graph.edges.set(edge.id, edge);
    return edge;
  }

  /**
   * Remove an edge
   */
  removeEdge(id: string): boolean {
    return this.graph.edges.delete(id);
  }

  /**
   * Get node by ID
   */
  getNode(id: string): GraphNode | undefined {
    return this.graph.nodes.get(id);
  }

  /**
   * Find nodes by label
   */
  findNodes(label: string): GraphNode[] {
    return Array.from(this.graph.nodes.values()).filter((node) => node.label === label);
  }

  /**
   * Find nodes by kind
   */
  getNodesByKind(kind: NodeKind): GraphNode[] {
    return Array.from(this.graph.nodes.values()).filter((node) => node.kind === kind);
  }

  /**
   * Get all nodes
   */
  getAllNodes(): GraphNode[] {
    return Array.from(this.graph.nodes.values());
  }

  /**
   * Get all edges
   */
  getAllEdges(): GraphEdge[] {
    return Array.from(this.graph.edges.values());
  }

  /**
   * Get edges from node
   */
  getOutgoingEdges(nodeId: string): GraphEdge[] {
    return Array.from(this.graph.edges.values()).filter((edge) => edge.source === nodeId);
  }

  /**
   * Get edges to node
   */
  getIncomingEdges(nodeId: string): GraphEdge[] {
    return Array.from(this.graph.edges.values()).filter((edge) => edge.target === nodeId);
  }

  /**
   * Get dependencies of node (nodes it depends on)
   */
  getDependencies(nodeId: string): GraphNode[] {
    const edges = this.getOutgoingEdges(nodeId);
    return edges
      .map((edge) => this.graph.nodes.get(edge.target))
      .filter((node): node is GraphNode => node !== undefined);
  }

  /**
   * Get dependents of node (nodes that depend on it)
   */
  getDependents(nodeId: string): GraphNode[] {
    const edges = this.getIncomingEdges(nodeId);
    return edges
      .map((edge) => this.graph.nodes.get(edge.source))
      .filter((node): node is GraphNode => node !== undefined);
  }

  /**
   * Detect circular dependencies
   */
  detectCircularDependencies(): CircularDependency[] {
    const cycles: CircularDependency[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const pathStack: string[] = [];

    for (const node of this.graph.nodes.values()) {
      if (!visited.has(node.id)) {
        this.detectCyclesDFS(node.id, visited, recursionStack, pathStack, cycles);
      }
    }

    return cycles;
  }

  /**
   * Get transitive dependencies (all nodes reachable from node)
   */
  getTransitiveDependencies(nodeId: string): GraphNode[] {
    const visited = new Set<string>();
    const queue: string[] = [nodeId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;

      if (visited.has(currentId)) {
        continue;
      }

      visited.add(currentId);

      const dependencies = this.getDependencies(currentId);
      for (const dep of dependencies) {
        if (!visited.has(dep.id)) {
          queue.push(dep.id);
        }
      }
    }

    visited.delete(nodeId); // Remove the starting node

    return Array.from(visited)
      .map((id) => this.graph.nodes.get(id))
      .filter((node): node is GraphNode => node !== undefined);
  }

  /**
   * Calculate graph metrics
   */
  getMetrics(): {
    nodeCount: number;
    edgeCount: number;
    avgDependencies: number;
    maxDependencies: number;
    circularCount: number;
  } {
    const nodeCount = this.graph.nodes.size;
    const edgeCount = this.graph.edges.size;

    let totalDependencies = 0;
    let maxDependencies = 0;

    for (const node of this.graph.nodes.values()) {
      const depCount = this.getDependencies(node.id).length;
      totalDependencies += depCount;
      maxDependencies = Math.max(maxDependencies, depCount);
    }

    const avgDependencies = nodeCount > 0 ? totalDependencies / nodeCount : 0;
    const circularCount = this.detectCircularDependencies().length;

    return {
      nodeCount,
      edgeCount,
      avgDependencies,
      maxDependencies,
      circularCount,
    };
  }

  /**
   * Layout graph using hierarchical layout
   */
  layoutHierarchical(options: LayoutOptions = {}): void {
    const {
      width = 1000,
      height = 600,
      nodeSpacing = 100,
      levelSpacing = 150,
    } = options;

    // Calculate node levels using topological sort
    const levels = this.calculateLevels();

    // Position nodes
    for (const [level, nodeIds] of levels.entries()) {
      const y = level * levelSpacing;
      const nodeCount = nodeIds.length;
      const totalWidth = (nodeCount - 1) * nodeSpacing;
      const startX = (width - totalWidth) / 2;

      for (let i = 0; i < nodeIds.length; i++) {
        const node = this.graph.nodes.get(nodeIds[i]);
        if (node) {
          node.x = startX + i * nodeSpacing;
          node.y = y;
        }
      }
    }
  }

  /**
   * Layout graph using force-directed layout
   */
  layoutForceDirected(iterations = 100, options: LayoutOptions = {}): void {
    const {
      width = 1000,
      height = 600,
    } = options;

    // Initialize random positions
    for (const node of this.graph.nodes.values()) {
      node.x = Math.random() * width;
      node.y = Math.random() * height;
    }

    const k = Math.sqrt((width * height) / this.graph.nodes.size);

    for (let iteration = 0; iteration < iterations; iteration++) {
      const displacement = new Map<string, { dx: number; dy: number }>();

      // Initialize displacement
      for (const node of this.graph.nodes.values()) {
        displacement.set(node.id, { dx: 0, dy: 0 });
      }

      // Repulsive forces between all pairs
      const nodes = Array.from(this.graph.nodes.values());
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const n1 = nodes[i];
          const n2 = nodes[j];

          const dx = (n2.x ?? 0) - (n1.x ?? 0);
          const dy = (n2.y ?? 0) - (n1.y ?? 0);
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;

          const force = (k * k) / distance;

          const d1 = displacement.get(n1.id)!;
          const d2 = displacement.get(n2.id)!;

          d1.dx -= (dx / distance) * force;
          d1.dy -= (dy / distance) * force;
          d2.dx += (dx / distance) * force;
          d2.dy += (dy / distance) * force;
        }
      }

      // Attractive forces for edges
      for (const edge of this.graph.edges.values()) {
        const source = this.graph.nodes.get(edge.source);
        const target = this.graph.nodes.get(edge.target);

        if (!source || !target) continue;

        const dx = (target.x ?? 0) - (source.x ?? 0);
        const dy = (target.y ?? 0) - (source.y ?? 0);
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;

        const force = (distance * distance) / k;

        const d1 = displacement.get(source.id)!;
        const d2 = displacement.get(target.id)!;

        d1.dx += (dx / distance) * force;
        d1.dy += (dy / distance) * force;
        d2.dx -= (dx / distance) * force;
        d2.dy -= (dy / distance) * force;
      }

      // Apply displacement with cooling
      const temp = width / 10 * (1 - iteration / iterations);

      for (const node of this.graph.nodes.values()) {
        const d = displacement.get(node.id)!;
        const magnitude = Math.sqrt(d.dx * d.dx + d.dy * d.dy) || 1;

        node.x = (node.x ?? 0) + (d.dx / magnitude) * Math.min(magnitude, temp);
        node.y = (node.y ?? 0) + (d.dy / magnitude) * Math.min(magnitude, temp);

        // Keep within bounds
        node.x = Math.max(50, Math.min(width - 50, node.x));
        node.y = Math.max(50, Math.min(height - 50, node.y));
      }
    }
  }

  /**
   * Clear graph
   */
  clear(): void {
    this.graph.nodes.clear();
    this.graph.edges.clear();
  }

  /**
   * Export graph as JSON
   */
  export(): string {
    return JSON.stringify(
      {
        nodes: Array.from(this.graph.nodes.values()),
        edges: Array.from(this.graph.edges.values()),
      },
      null,
      2
    );
  }

  /**
   * Import graph from JSON
   */
  import(json: string): void {
    try {
      const data = JSON.parse(json);

      this.graph.nodes.clear();
      this.graph.edges.clear();

      if (data.nodes && Array.isArray(data.nodes)) {
        for (const node of data.nodes) {
          this.graph.nodes.set(node.id, node);
        }
      }

      if (data.edges && Array.isArray(data.edges)) {
        for (const edge of data.edges) {
          this.graph.edges.set(edge.id, edge);
        }
      }
    } catch (error) {
      throw new Error(
        `Failed to import graph: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * DFS for cycle detection
   */
  private detectCyclesDFS(
    nodeId: string,
    visited: Set<string>,
    recursionStack: Set<string>,
    pathStack: string[],
    cycles: CircularDependency[]
  ): void {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    pathStack.push(nodeId);

    const dependencies = this.getDependencies(nodeId);

    for (const dep of dependencies) {
      if (!visited.has(dep.id)) {
        this.detectCyclesDFS(dep.id, visited, recursionStack, pathStack, cycles);
      } else if (recursionStack.has(dep.id)) {
        // Found a cycle
        const cycleStartIndex = pathStack.indexOf(dep.id);
        const cyclePath = pathStack.slice(cycleStartIndex);
        cyclePath.push(dep.id); // Complete the cycle

        const cycleNodes = cyclePath
          .map((id) => this.graph.nodes.get(id))
          .filter((node): node is GraphNode => node !== undefined);

        cycles.push({
          nodes: cycleNodes,
          path: cyclePath,
        });
      }
    }

    recursionStack.delete(nodeId);
    pathStack.pop();
  }

  /**
   * Calculate node levels for hierarchical layout
   */
  private calculateLevels(): Map<number, string[]> {
    const levels = new Map<number, string[]>();
    const nodeLevel = new Map<string, number>();

    // Find nodes with no incoming edges (roots)
    const roots: string[] = [];
    for (const node of this.graph.nodes.values()) {
      const incoming = this.getIncomingEdges(node.id);
      if (incoming.length === 0) {
        roots.push(node.id);
        nodeLevel.set(node.id, 0);
        if (!levels.has(0)) {
          levels.set(0, []);
        }
        levels.get(0)!.push(node.id);
      }
    }

    // BFS to assign levels
    const queue = [...roots];
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const level = nodeLevel.get(nodeId) ?? 0;

      const dependencies = this.getDependencies(nodeId);
      for (const dep of dependencies) {
        const newLevel = level + 1;
        const currentLevel = nodeLevel.get(dep.id) ?? -1;

        if (newLevel > currentLevel) {
          nodeLevel.set(dep.id, newLevel);

          if (!levels.has(newLevel)) {
            levels.set(newLevel, []);
          }

          // Remove from old level if exists
          if (currentLevel >= 0) {
            const oldLevelNodes = levels.get(currentLevel);
            if (oldLevelNodes) {
              const index = oldLevelNodes.indexOf(dep.id);
              if (index !== -1) {
                oldLevelNodes.splice(index, 1);
              }
            }
          }

          levels.get(newLevel)!.push(dep.id);
          queue.push(dep.id);
        }
      }
    }

    return levels;
  }

  /**
   * Generate node ID
   */
  private generateNodeId(): string {
    return `node_${this.nodeIdCounter++}`;
  }

  /**
   * Generate edge ID
   */
  private generateEdgeId(): string {
    return `edge_${this.edgeIdCounter++}`;
  }
}

// ============================================================================
// Global Graph Instance
// ============================================================================

let globalGraph: DependencyGraph | null = null;

/**
 * Get or create global graph instance
 */
export function getGlobalGraph(): DependencyGraph {
  if (!globalGraph) {
    globalGraph = new DependencyGraph();
  }
  return globalGraph;
}

/**
 * Reset global graph
 */
export function resetGlobalGraph(): void {
  globalGraph = null;
}
