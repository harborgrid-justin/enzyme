/**
 * @fileoverview Flag dependency resolution and management.
 *
 * Provides comprehensive dependency handling:
 * - Prerequisite flags (requires)
 * - Conflicting flags (conflicts)
 * - Implied flags (implies)
 * - Flag supersession (supersedes)
 * - Circular dependency detection
 * - Dependency graph visualization
 *
 * @module flags/advanced/flag-dependencies
 *
 * @example
 * ```typescript
 * const resolver = new DependencyResolver();
 *
 * const dependencies: FlagDependency[] = [
 *   { sourceFlag: 'advanced-search', targetFlag: 'search', type: 'requires' },
 *   { sourceFlag: 'new-ui', targetFlag: 'old-ui', type: 'conflicts' },
 *   { sourceFlag: 'premium', targetFlag: 'analytics', type: 'implies' },
 * ];
 *
 * resolver.buildGraph(dependencies);
 *
 * const result = resolver.resolveDependencies('advanced-search', flagEvaluator);
 * if (result.satisfied) {
 *   // Enable the flag
 * }
 * ```
 */

import type {
  FlagDependency,
  FlagId,
  VariantId,
  DependencyType,
  JsonValue,
} from './types';

// ============================================================================
// Types
// ============================================================================

/**
 * Result of dependency resolution.
 */
export interface DependencyResolutionResult {
  /** Whether all dependencies are satisfied */
  readonly satisfied: boolean;
  /** Unsatisfied dependencies */
  readonly unsatisfied: readonly UnsatisfiedDependency[];
  /** Order in which flags should be evaluated */
  readonly evaluationOrder: readonly FlagId[];
  /** Detected circular dependencies */
  readonly circularDependencies: readonly FlagId[][];
  /** Implied flags to enable */
  readonly implied: readonly FlagId[];
  /** Conflicting flags that are currently enabled */
  readonly conflicts: readonly FlagId[];
}

/**
 * Details of an unsatisfied dependency.
 */
export interface UnsatisfiedDependency {
  /** The flag with the unsatisfied dependency */
  readonly sourceFlag: FlagId;
  /** The target flag that failed */
  readonly targetFlag: FlagId;
  /** Type of dependency */
  readonly type: DependencyType;
  /** Reason for failure */
  readonly reason: string;
  /** Required variant (if applicable) */
  readonly requiredVariant?: VariantId;
  /** Actual variant (if applicable) */
  readonly actualVariant?: VariantId;
}

/**
 * Node in the dependency graph.
 */
interface DependencyNode {
  readonly flagId: FlagId;
  readonly dependencies: Map<FlagId, FlagDependency>;
  readonly dependents: Set<FlagId>;
}

/**
 * Function type for evaluating a flag's state.
 */
export type FlagEvaluator = (
  flagId: FlagId
) => { enabled: boolean; variantId?: VariantId; value?: JsonValue };

// ============================================================================
// Dependency Resolver
// ============================================================================

/**
 * Resolves and validates flag dependencies.
 */
export class DependencyResolver {
  private graph = new Map<FlagId, DependencyNode>();
  private dependencies: FlagDependency[] = [];

  /**
   * Build the dependency graph from a list of dependencies.
   */
  buildGraph(dependencies: readonly FlagDependency[]): void {
    this.dependencies = [...dependencies];
    this.graph.clear();

    // Create nodes for all flags
    for (const dep of dependencies) {
      this.ensureNode(dep.sourceFlag);
      this.ensureNode(dep.targetFlag);
    }

    // Add dependencies to nodes
    for (const dep of dependencies) {
      const sourceNode = this.graph.get(dep.sourceFlag)!;
      sourceNode.dependencies.set(dep.targetFlag, dep);

      const targetNode = this.graph.get(dep.targetFlag)!;
      targetNode.dependents.add(dep.sourceFlag);
    }
  }

  private ensureNode(flagId: FlagId): DependencyNode {
    if (!this.graph.has(flagId)) {
      this.graph.set(flagId, {
        flagId,
        dependencies: new Map(),
        dependents: new Set(),
      });
    }
    return this.graph.get(flagId)!;
  }

  /**
   * Add a dependency to the graph.
   */
  addDependency(dependency: FlagDependency): void {
    this.dependencies.push(dependency);

    const sourceNode = this.ensureNode(dependency.sourceFlag);
    sourceNode.dependencies.set(dependency.targetFlag, dependency);

    const targetNode = this.ensureNode(dependency.targetFlag);
    targetNode.dependents.add(dependency.sourceFlag);
  }

  /**
   * Remove a dependency from the graph.
   */
  removeDependency(sourceFlag: FlagId, targetFlag: FlagId): void {
    const sourceNode = this.graph.get(sourceFlag);
    if (sourceNode) {
      sourceNode.dependencies.delete(targetFlag);
    }

    const targetNode = this.graph.get(targetFlag);
    if (targetNode) {
      targetNode.dependents.delete(sourceFlag);
    }

    this.dependencies = this.dependencies.filter(
      (d) => !(d.sourceFlag === sourceFlag && d.targetFlag === targetFlag)
    );
  }

  /**
   * Resolve all dependencies for a flag.
   */
  resolveDependencies(
    flagId: FlagId,
    evaluator: FlagEvaluator
  ): DependencyResolutionResult {
    const unsatisfied: UnsatisfiedDependency[] = [];
    const implied: FlagId[] = [];
    const conflicts: FlagId[] = [];

    // Check for circular dependencies
    const circularDependencies = this.detectCircularDependencies();
    if (circularDependencies.some((cycle) => cycle.includes(flagId))) {
      return {
        satisfied: false,
        unsatisfied: [
          {
            sourceFlag: flagId,
            targetFlag: flagId,
            type: 'requires',
            reason: 'Circular dependency detected',
          },
        ],
        evaluationOrder: [],
        circularDependencies,
        implied: [],
        conflicts: [],
      };
    }

    // Get evaluation order
    const evaluationOrder = this.getEvaluationOrder(flagId);

    // Check dependencies
    const node = this.graph.get(flagId);
    if (node) {
      for (const [targetId, dep] of node.dependencies) {
        const result = this.checkDependency(dep, evaluator);
        if (!result.satisfied) {
          unsatisfied.push(result.unsatisfied!);
        }
        if (result.implied) {
          implied.push(targetId);
        }
        if (result.conflict) {
          conflicts.push(targetId);
        }
      }
    }

    return {
      satisfied: unsatisfied.length === 0 && conflicts.length === 0,
      unsatisfied,
      evaluationOrder,
      circularDependencies,
      implied,
      conflicts,
    };
  }

  private checkDependency(
    dep: FlagDependency,
    evaluator: FlagEvaluator
  ): {
    satisfied: boolean;
    unsatisfied?: UnsatisfiedDependency;
    implied?: boolean;
    conflict?: boolean;
  } {
    const targetState = evaluator(dep.targetFlag);

    switch (dep.type) {
      case 'requires':
        // Target flag must be enabled
        if (!targetState.enabled) {
          return {
            satisfied: false,
            unsatisfied: {
              sourceFlag: dep.sourceFlag,
              targetFlag: dep.targetFlag,
              type: dep.type,
              reason: `Required flag '${dep.targetFlag}' is not enabled`,
              requiredVariant: dep.requiredVariant,
            },
          };
        }
        // Check variant if specified
        if (
          dep.requiredVariant &&
          targetState.variantId !== dep.requiredVariant
        ) {
          return {
            satisfied: false,
            unsatisfied: {
              sourceFlag: dep.sourceFlag,
              targetFlag: dep.targetFlag,
              type: dep.type,
              reason: `Required variant '${dep.requiredVariant}' not matched`,
              requiredVariant: dep.requiredVariant,
              actualVariant: targetState.variantId,
            },
          };
        }
        return { satisfied: true };

      case 'conflicts':
        // Target flag must NOT be enabled
        if (targetState.enabled) {
          return {
            satisfied: false,
            conflict: true,
            unsatisfied: {
              sourceFlag: dep.sourceFlag,
              targetFlag: dep.targetFlag,
              type: dep.type,
              reason: `Conflicting flag '${dep.targetFlag}' is enabled`,
            },
          };
        }
        return { satisfied: true };

      case 'implies':
        // Target flag should be enabled (but not a hard requirement)
        if (!targetState.enabled) {
          return { satisfied: true, implied: true };
        }
        return { satisfied: true };

      case 'supersedes':
        // This flag takes precedence over the target
        // No validation needed, just informational
        return { satisfied: true };

      default:
        return { satisfied: true };
    }
  }

  /**
   * Detect circular dependencies in the graph.
   */
  detectCircularDependencies(): FlagId[][] {
    const cycles: FlagId[][] = [];
    const visited = new Set<FlagId>();
    const recursionStack = new Set<FlagId>();
    const currentPath: FlagId[] = [];

    const dfs = (nodeId: FlagId): void => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      currentPath.push(nodeId);

      const node = this.graph.get(nodeId);
      if (node) {
        for (const targetId of node.dependencies.keys()) {
          if (!visited.has(targetId)) {
            dfs(targetId);
          } else if (recursionStack.has(targetId)) {
            // Found a cycle
            const cycleStart = currentPath.indexOf(targetId);
            if (cycleStart !== -1) {
              cycles.push([...currentPath.slice(cycleStart), targetId]);
            }
          }
        }
      }

      currentPath.pop();
      recursionStack.delete(nodeId);
    };

    for (const nodeId of this.graph.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId);
      }
    }

    return cycles;
  }

  /**
   * Get the evaluation order for a flag (topological sort).
   */
  getEvaluationOrder(flagId: FlagId): FlagId[] {
    const order: FlagId[] = [];
    const visited = new Set<FlagId>();

    const visit = (nodeId: FlagId): void => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = this.graph.get(nodeId);
      if (node) {
        for (const depId of node.dependencies.keys()) {
          visit(depId);
        }
      }

      order.push(nodeId);
    };

    visit(flagId);
    return order;
  }

  /**
   * Get all flags that depend on a given flag.
   */
  getDependents(flagId: FlagId): FlagId[] {
    const node = this.graph.get(flagId);
    return node ? Array.from(node.dependents) : [];
  }

  /**
   * Get all dependencies of a flag.
   */
  getDependencies(flagId: FlagId): FlagDependency[] {
    const node = this.graph.get(flagId);
    return node ? Array.from(node.dependencies.values()) : [];
  }

  /**
   * Get all flags in the graph.
   */
  getAllFlags(): FlagId[] {
    return Array.from(this.graph.keys());
  }

  /**
   * Check if a flag has any dependencies.
   */
  hasDependencies(flagId: FlagId): boolean {
    const node = this.graph.get(flagId);
    return node ? node.dependencies.size > 0 : false;
  }

  /**
   * Check if a flag has any dependents.
   */
  hasDependents(flagId: FlagId): boolean {
    const node = this.graph.get(flagId);
    return node ? node.dependents.size > 0 : false;
  }

  /**
   * Export the graph for visualization.
   */
  exportGraph(): {
    nodes: Array<{ id: FlagId; dependencyCount: number; dependentCount: number }>;
    edges: Array<{ source: FlagId; target: FlagId; type: DependencyType }>;
  } {
    const nodes = Array.from(this.graph.values()).map((node) => ({
      id: node.flagId,
      dependencyCount: node.dependencies.size,
      dependentCount: node.dependents.size,
    }));

    const edges = this.dependencies.map((dep) => ({
      source: dep.sourceFlag,
      target: dep.targetFlag,
      type: dep.type,
    }));

    return { nodes, edges };
  }

  /**
   * Clear the dependency graph.
   */
  clear(): void {
    this.graph.clear();
    this.dependencies = [];
  }
}

// ============================================================================
// Dependency Builder
// ============================================================================

/**
 * Fluent builder for creating flag dependencies.
 */
export class DependencyBuilder {
  private sourceFlag: FlagId;
  private dependencies: FlagDependency[] = [];

  constructor(sourceFlag: FlagId) {
    this.sourceFlag = sourceFlag;
  }

  /**
   * Add a "requires" dependency.
   */
  requires(
    targetFlag: FlagId,
    options?: { variant?: VariantId; description?: string }
  ): this {
    this.dependencies.push({
      sourceFlag: this.sourceFlag,
      targetFlag,
      type: 'requires',
      requiredVariant: options?.variant,
      description: options?.description,
    });
    return this;
  }

  /**
   * Add a "conflicts" dependency.
   */
  conflicts(targetFlag: FlagId, description?: string): this {
    this.dependencies.push({
      sourceFlag: this.sourceFlag,
      targetFlag,
      type: 'conflicts',
      description,
    });
    return this;
  }

  /**
   * Add an "implies" dependency.
   */
  implies(targetFlag: FlagId, description?: string): this {
    this.dependencies.push({
      sourceFlag: this.sourceFlag,
      targetFlag,
      type: 'implies',
      description,
    });
    return this;
  }

  /**
   * Add a "supersedes" dependency.
   */
  supersedes(targetFlag: FlagId, description?: string): this {
    this.dependencies.push({
      sourceFlag: this.sourceFlag,
      targetFlag,
      type: 'supersedes',
      description,
    });
    return this;
  }

  /**
   * Build the dependencies.
   */
  build(): FlagDependency[] {
    return [...this.dependencies];
  }
}

/**
 * Create a dependency builder for a flag.
 */
export function createDependencies(sourceFlag: FlagId): DependencyBuilder {
  return new DependencyBuilder(sourceFlag);
}

// ============================================================================
// Dependency Validation Utilities
// ============================================================================

/**
 * Validate a set of dependencies.
 */
export function validateDependencies(
  dependencies: readonly FlagDependency[]
): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Build a temporary resolver for validation
  const resolver = new DependencyResolver();
  resolver.buildGraph(dependencies);

  // Check for circular dependencies
  const cycles = resolver.detectCircularDependencies();
  for (const cycle of cycles) {
    errors.push(`Circular dependency detected: ${cycle.join(' -> ')}`);
  }

  // Check for conflicting dependency types
  const dependencyMap = new Map<string, FlagDependency[]>();
  for (const dep of dependencies) {
    const key = `${dep.sourceFlag}:${dep.targetFlag}`;
    const existing = dependencyMap.get(key) ?? [];
    existing.push(dep);
    dependencyMap.set(key, existing);
  }

  for (const [key, deps] of dependencyMap) {
    if (deps.length > 1) {
      const types = deps.map((d) => d.type);
      if (types.includes('requires') && types.includes('conflicts')) {
        errors.push(
          `Flag ${key.split(':')[0]} both requires and conflicts with ${key.split(':')[1]}`
        );
      }
    }
  }

  // Check for superseded flags that are also required
  const supersededFlags = new Set(
    dependencies.filter((d) => d.type === 'supersedes').map((d) => d.targetFlag)
  );
  for (const dep of dependencies) {
    if (dep.type === 'requires' && supersededFlags.has(dep.targetFlag)) {
      warnings.push(
        `Flag '${dep.sourceFlag}' requires superseded flag '${dep.targetFlag}'`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Generate a DOT representation of the dependency graph for visualization.
 */
export function generateDependencyDOT(
  dependencies: readonly FlagDependency[]
): string {
  const lines = ['digraph FlagDependencies {'];
  lines.push('  rankdir=TB;');
  lines.push('  node [shape=box];');
  lines.push('');

  // Collect all nodes
  const nodes = new Set<string>();
  for (const dep of dependencies) {
    nodes.add(dep.sourceFlag);
    nodes.add(dep.targetFlag);
  }

  // Add nodes
  for (const node of nodes) {
    lines.push(`  "${node}";`);
  }
  lines.push('');

  // Add edges with styles based on type
  const edgeStyles: Record<DependencyType, string> = {
    requires: 'style=solid color=blue',
    conflicts: 'style=dashed color=red',
    implies: 'style=dotted color=green',
    supersedes: 'style=bold color=orange',
  };

  for (const dep of dependencies) {
    const style = edgeStyles[dep.type] ?? '';
    lines.push(`  "${dep.sourceFlag}" -> "${dep.targetFlag}" [${style} label="${dep.type}"];`);
  }

  lines.push('}');
  return lines.join('\n');
}

// ============================================================================
// Singleton Instance
// ============================================================================

let instance: DependencyResolver | null = null;

/**
 * Get the singleton dependency resolver instance.
 */
export function getDependencyResolver(): DependencyResolver {
  if (!instance) {
    instance = new DependencyResolver();
  }
  return instance;
}

/**
 * Reset the singleton instance.
 */
export function resetDependencyResolver(): void {
  if (instance) {
    instance.clear();
  }
  instance = null;
}
