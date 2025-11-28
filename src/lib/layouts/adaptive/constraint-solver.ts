/**
 * @fileoverview Layout Constraint Solver
 *
 * Implements a sophisticated constraint-based layout solver that handles
 * complex layout requirements including min/max dimensions, aspect ratios,
 * spacing, ordering, and visibility constraints. Uses a priority-based
 * resolution system to handle conflicting constraints gracefully.
 *
 * The solver employs a relaxation algorithm that iteratively refines
 * positions and sizes until all required constraints are satisfied or
 * a stable state is reached.
 *
 * @module layouts/adaptive/constraint-solver
 * @version 1.0.0
 */

import type {
  AlignmentConstraintParams,
  AspectRatioConstraintParams,
  ConstraintPriority,
  ConstraintSolution,
  ConstraintSolverInterface,
  ConstraintViolation,
  ContainmentConstraintParams,
  Dimensions,
  LayoutConstraint,
  MinMaxConstraintParams,
  OrderConstraintParams,
  Point2D,
  SpacingConstraintParams,
  VisibilityConstraintParams,
} from './types.ts';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Maximum iterations for the relaxation algorithm.
 */
const MAX_ITERATIONS = 100;

/**
 * Convergence threshold for position/size changes.
 */
const CONVERGENCE_THRESHOLD = 0.01;

/**
 * Priority weights for constraint resolution.
 */
const PRIORITY_WEIGHTS: Record<ConstraintPriority, number> = {
  required: 1000,
  strong: 100,
  medium: 10,
  weak: 1,
} as const;

// =============================================================================
// HELPER TYPES
// =============================================================================

/**
 * Internal representation of an item being solved.
 */
interface SolverItem {
  id: string;
  position: Point2D;
  size: Dimensions;
  constraints: LayoutConstraint[];
  locked: boolean;
}

/**
 * Solution state during iteration.
 */
interface SolverState {
  items: Map<string, SolverItem>;
  containerDimensions: Dimensions;
  iteration: number;
  totalError: number;
  converged: boolean;
}

// =============================================================================
// CONSTRAINT SOLVER IMPLEMENTATION
// =============================================================================

/**
 * Layout constraint solver that handles complex layout requirements
 * using a priority-based relaxation algorithm.
 *
 * @example
 * ```typescript
 * const solver = new ConstraintSolver();
 * solver.addConstraint({
 *   id: 'min-width-card',
 *   type: 'min-width',
 *   priority: 'strong',
 *   params: { type: 'dimension', value: 200, unit: 'px' },
 *   active: true
 * });
 *
 * const solution = solver.solve(
 *   new Map([['card-1', { width: 150, height: 100 }]]),
 *   { width: 800, height: 600 }
 * );
 * ```
 */
export class ConstraintSolver implements ConstraintSolverInterface {
  private readonly _constraints: Map<string, LayoutConstraint>;
  private readonly _itemConstraints: Map<string, Set<string>>;

  constructor() {
    this._constraints = new Map();
    this._itemConstraints = new Map();
  }

  /**
   * Adds a new constraint to the solver.
   *
   * @param constraint - The constraint to add
   */
  addConstraint(constraint: LayoutConstraint): void {
    this._constraints.set(constraint.id, constraint);
  }

  /**
   * Removes a constraint from the solver.
   *
   * @param id - The constraint ID to remove
   */
  removeConstraint(id: string): void {
    this._constraints.delete(id);

    // Clean up item associations
    for (const itemConstraints of this._itemConstraints.values()) {
      itemConstraints.delete(id);
    }
  }

  /**
   * Updates an existing constraint.
   *
   * @param id - The constraint ID to update
   * @param updates - Partial constraint updates
   */
  updateConstraint(id: string, updates: Partial<LayoutConstraint>): void {
    const existing = this._constraints.get(id);
    if (existing) {
      this._constraints.set(id, { ...existing, ...updates } as LayoutConstraint);
    }
  }

  /**
   * Solves the constraint system for the given items and container.
   *
   * @param items - Map of item IDs to their current dimensions
   * @param containerDimensions - Container dimensions
   * @returns The constraint solution
   */
  solve(
    items: ReadonlyMap<string, Dimensions>,
    containerDimensions: Dimensions
  ): ConstraintSolution {
    const startTime = performance.now();

    // Initialize solver state
    const state = this._initializeState(items, containerDimensions);

    // Run relaxation algorithm
    while (!state.converged && state.iteration < MAX_ITERATIONS) {
      this._iterate(state);
      state.iteration++;
    }

    // Extract solution
    const positions = new Map<string, Point2D>();
    const sizes = new Map<string, Dimensions>();

    for (const [id, item] of state.items) {
      positions.set(id, { ...item.position });
      sizes.set(id, { ...item.size });
    }

    // Validate and collect violations
    const violations = this.validate({
      feasible: true,
      positions,
      sizes,
      violations: [],
      solveTimeMs: 0,
    });

    const feasible = violations.every((v) => v.severity !== 'error');

    return {
      feasible,
      positions,
      sizes,
      violations,
      solveTimeMs: performance.now() - startTime,
    };
  }

  /**
   * Validates a solution against all active constraints.
   *
   * @param solution - The solution to validate
   * @returns Array of constraint violations
   */
  validate(solution: ConstraintSolution): readonly ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    for (const [_id, constraint] of this._constraints) {
      if (!constraint.active) continue;

      const violation = this._checkConstraint(constraint, solution);
      if (violation) {
        violations.push(violation);
      }
    }

    return violations;
  }

  /**
   * Clears all constraints from the solver.
   */
  clear(): void {
    this._constraints.clear();
    this._itemConstraints.clear();
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  /**
   * Initializes the solver state from input items.
   */
  private _initializeState(
    items: ReadonlyMap<string, Dimensions>,
    containerDimensions: Dimensions
  ): SolverState {
    const solverItems = new Map<string, SolverItem>();
    let currentX = 0;
    let currentY = 0;

    // Initialize items with default positions
    for (const [id, dimensions] of items) {
      const itemConstraints = Array.from(this._constraints.values()).filter(
        (c) => c.active && this._constraintAppliesToItem(c, id)
      );

      solverItems.set(id, {
        id,
        position: { x: currentX, y: currentY },
        size: { ...dimensions },
        constraints: itemConstraints,
        locked: false,
      });

      // Simple row layout for initial positions
      currentX += dimensions.width + 16;
      if (currentX + dimensions.width > containerDimensions.width) {
        currentX = 0;
        currentY += dimensions.height + 16;
      }
    }

    return {
      items: solverItems,
      containerDimensions,
      iteration: 0,
      totalError: Infinity,
      converged: false,
    };
  }

  /**
   * Performs one iteration of the relaxation algorithm.
   */
  private _iterate(state: SolverState): void {
    let totalError = 0;
    let maxDelta = 0;

    for (const [_id, item] of state.items) {
      if (item.locked) continue;

      for (const constraint of item.constraints) {
        const delta = this._applyConstraint(item, constraint, state);
        maxDelta = Math.max(maxDelta, delta);
        totalError += delta * PRIORITY_WEIGHTS[constraint.priority];
      }
    }

    // Apply containment constraints
    for (const [_id2, item] of state.items) {
      const delta = this._applyContainment(item, state.containerDimensions);
      maxDelta = Math.max(maxDelta, delta);
    }

    state.totalError = totalError;
    state.converged = maxDelta < CONVERGENCE_THRESHOLD;
  }

  /**
   * Applies a single constraint to an item.
   */
  private _applyConstraint(
    item: SolverItem,
    constraint: LayoutConstraint,
    state: SolverState
  ): number {
    // const _weight = PRIORITY_WEIGHTS[constraint.priority];
    const params = constraint.params;

    switch (constraint.type) {
      case 'min-width':
        return this._applyMinWidth(item, params as MinMaxConstraintParams, state);
      case 'max-width':
        return this._applyMaxWidth(item, params as MinMaxConstraintParams, state);
      case 'min-height':
        return this._applyMinHeight(item, params as MinMaxConstraintParams, state);
      case 'max-height':
        return this._applyMaxHeight(item, params as MinMaxConstraintParams, state);
      case 'aspect-ratio':
        return this._applyAspectRatio(item, params as AspectRatioConstraintParams);
      case 'alignment':
        return this._applyAlignment(item, params as AlignmentConstraintParams, state);
      case 'spacing':
        return this._applySpacing(item, params as SpacingConstraintParams, state);
      case 'order':
        return this._applyOrder(item, params as OrderConstraintParams, state);
      case 'visibility':
        return this._applyVisibility(item, params as VisibilityConstraintParams, state);
      case 'containment':
        return this._applyContainmentConstraint(item, params as ContainmentConstraintParams, state);
      default:
        return 0;
    }
  }

  /**
   * Applies minimum width constraint.
   */
  private _applyMinWidth(
    item: SolverItem,
    params: MinMaxConstraintParams,
    state: SolverState
  ): number {
    const minWidth = this._resolveValue(params.value, params.unit, state.containerDimensions.width);
    if (item.size.width < minWidth) {
      const delta = minWidth - item.size.width;
      item.size = { ...item.size, width: minWidth };
      return delta;
    }
    return 0;
  }

  /**
   * Applies maximum width constraint.
   */
  private _applyMaxWidth(
    item: SolverItem,
    params: MinMaxConstraintParams,
    state: SolverState
  ): number {
    const maxWidth = this._resolveValue(params.value, params.unit, state.containerDimensions.width);
    if (item.size.width > maxWidth) {
      const delta = item.size.width - maxWidth;
      item.size = { ...item.size, width: maxWidth };
      return delta;
    }
    return 0;
  }

  /**
   * Applies minimum height constraint.
   */
  private _applyMinHeight(
    item: SolverItem,
    params: MinMaxConstraintParams,
    state: SolverState
  ): number {
    const minHeight = this._resolveValue(params.value, params.unit, state.containerDimensions.height);
    if (item.size.height < minHeight) {
      const delta = minHeight - item.size.height;
      item.size = { ...item.size, height: minHeight };
      return delta;
    }
    return 0;
  }

  /**
   * Applies maximum height constraint.
   */
  private _applyMaxHeight(
    item: SolverItem,
    params: MinMaxConstraintParams,
    state: SolverState
  ): number {
    const maxHeight = this._resolveValue(params.value, params.unit, state.containerDimensions.height);
    if (item.size.height > maxHeight) {
      const delta = item.size.height - maxHeight;
      item.size = { ...item.size, height: maxHeight };
      return delta;
    }
    return 0;
  }

  /**
   * Applies aspect ratio constraint.
   */
  private _applyAspectRatio(item: SolverItem, params: AspectRatioConstraintParams): number {
    const currentRatio = item.size.width / item.size.height;
    const diff = Math.abs(currentRatio - params.ratio);

    if (diff > params.tolerance) {
      // Adjust height to match desired ratio while preserving width
      const newHeight = item.size.width / params.ratio;
      const delta = Math.abs(newHeight - item.size.height);
      item.size = { ...item.size, height: newHeight };
      return delta;
    }
    return 0;
  }

  /**
   * Applies alignment constraint.
   */
  private _applyAlignment(
    item: SolverItem,
    params: AlignmentConstraintParams,
    state: SolverState
  ): number {
    let deltaX = 0;
    let deltaY = 0;

    // Horizontal alignment
    switch (params.horizontal) {
      case 'center':
        const centerX = (state.containerDimensions.width - item.size.width) / 2;
        deltaX = Math.abs(centerX - item.position.x);
        item.position = { ...item.position, x: centerX };
        break;
      case 'end':
        const endX = state.containerDimensions.width - item.size.width;
        deltaX = Math.abs(endX - item.position.x);
        item.position = { ...item.position, x: endX };
        break;
      case 'start':
        deltaX = Math.abs(item.position.x);
        item.position = { ...item.position, x: 0 };
        break;
      case 'stretch':
        deltaX = Math.abs(state.containerDimensions.width - item.size.width);
        item.size = { ...item.size, width: state.containerDimensions.width };
        item.position = { ...item.position, x: 0 };
        break;
    }

    // Vertical alignment
    switch (params.vertical) {
      case 'center':
        const centerY = (state.containerDimensions.height - item.size.height) / 2;
        deltaY = Math.abs(centerY - item.position.y);
        item.position = { ...item.position, y: centerY };
        break;
      case 'end':
        const endY = state.containerDimensions.height - item.size.height;
        deltaY = Math.abs(endY - item.position.y);
        item.position = { ...item.position, y: endY };
        break;
      case 'start':
        deltaY = Math.abs(item.position.y);
        item.position = { ...item.position, y: 0 };
        break;
      case 'stretch':
        deltaY = Math.abs(state.containerDimensions.height - item.size.height);
        item.size = { ...item.size, height: state.containerDimensions.height };
        item.position = { ...item.position, y: 0 };
        break;
    }

    return deltaX + deltaY;
  }

  /**
   * Applies spacing constraint between items.
   */
  private _applySpacing(
    item: SolverItem,
    params: SpacingConstraintParams,
    state: SolverState
  ): number {
    let totalDelta = 0;

    // Find nearest neighbors and adjust spacing
    for (const [otherId, other] of state.items) {
      if (otherId === item.id) continue;

      const dx = other.position.x - (item.position.x + item.size.width);
      const dy = other.position.y - (item.position.y + item.size.height);

      // Check horizontal spacing
      if (Math.abs(dy) < item.size.height) {
        if (dx > 0 && dx < params.min) {
          const adjustment = (params.min - dx) / 2;
          item.position = { ...item.position, x: item.position.x - adjustment };
          other.position = { ...other.position, x: other.position.x + adjustment };
          totalDelta += adjustment * 2;
        } else if (dx > params.max) {
          const adjustment = (dx - params.max) / 2;
          item.position = { ...item.position, x: item.position.x + adjustment };
          other.position = { ...other.position, x: other.position.x - adjustment };
          totalDelta += adjustment * 2;
        }
      }

      // Check vertical spacing
      if (Math.abs(dx) < item.size.width) {
        if (dy > 0 && dy < params.min) {
          const adjustment = (params.min - dy) / 2;
          item.position = { ...item.position, y: item.position.y - adjustment };
          other.position = { ...other.position, y: other.position.y + adjustment };
          totalDelta += adjustment * 2;
        } else if (dy > params.max) {
          const adjustment = (dy - params.max) / 2;
          item.position = { ...item.position, y: item.position.y + adjustment };
          other.position = { ...other.position, y: other.position.y - adjustment };
          totalDelta += adjustment * 2;
        }
      }
    }

    return totalDelta;
  }

  /**
   * Applies ordering constraint.
   */
  private _applyOrder(
    item: SolverItem,
    params: OrderConstraintParams,
    state: SolverState
  ): number {
    let totalDelta = 0;

    // Ensure item comes before specified items
    if (params.before) {
      for (const beforeId of params.before) {
        const beforeItem = state.items.get(beforeId);
        if (beforeItem && item.position.y >= beforeItem.position.y) {
          const delta = item.position.y - beforeItem.position.y + item.size.height + 16;
          beforeItem.position = { ...beforeItem.position, y: beforeItem.position.y + delta };
          totalDelta += delta;
        }
      }
    }

    // Ensure item comes after specified items
    if (params.after) {
      for (const afterId of params.after) {
        const afterItem = state.items.get(afterId);
        if (afterItem && item.position.y <= afterItem.position.y + afterItem.size.height) {
          const delta = afterItem.position.y + afterItem.size.height + 16 - item.position.y;
          item.position = { ...item.position, y: item.position.y + delta };
          totalDelta += delta;
        }
      }
    }

    return totalDelta;
  }

  /**
   * Applies visibility constraint.
   */
  private _applyVisibility(
    item: SolverItem,
    params: VisibilityConstraintParams,
    state: SolverState
  ): number {
    // For viewport visibility, ensure item is within container bounds
    if (params.condition === 'viewport' || params.condition === 'container') {
      return this._applyContainment(item, state.containerDimensions);
    }
    return 0;
  }

  /**
   * Applies containment constraint.
   */
  private _applyContainmentConstraint(
    item: SolverItem,
    params: ContainmentConstraintParams,
    state: SolverState
  ): number {
    if (!params.contain) return 0;
    return this._applyContainment(item, state.containerDimensions);
  }

  /**
   * Ensures item stays within container bounds.
   */
  private _applyContainment(item: SolverItem, containerDimensions: Dimensions): number {
    let delta = 0;

    // Left edge
    if (item.position.x < 0) {
      delta += Math.abs(item.position.x);
      item.position = { ...item.position, x: 0 };
    }

    // Top edge
    if (item.position.y < 0) {
      delta += Math.abs(item.position.y);
      item.position = { ...item.position, y: 0 };
    }

    // Right edge
    const rightOverflow = item.position.x + item.size.width - containerDimensions.width;
    if (rightOverflow > 0) {
      delta += rightOverflow;
      item.position = { ...item.position, x: containerDimensions.width - item.size.width };
    }

    // Bottom edge (only if container has fixed height)
    if (containerDimensions.height > 0) {
      const bottomOverflow = item.position.y + item.size.height - containerDimensions.height;
      if (bottomOverflow > 0) {
        delta += bottomOverflow;
        // For bottom overflow, we might need to reduce size or scroll
        // For now, just adjust position
        item.position = { ...item.position, y: Math.max(0, containerDimensions.height - item.size.height) };
      }
    }

    return delta;
  }

  /**
   * Resolves a value with unit to pixels.
   */
  private _resolveValue(value: number, unit: string, reference: number): number {
    switch (unit) {
      case '%':
        return (value / 100) * reference;
      case 'vw':
        return (value / 100) * (typeof window !== 'undefined' ? window.innerWidth : reference);
      case 'vh':
        return (value / 100) * (typeof window !== 'undefined' ? window.innerHeight : reference);
      case 'px':
      default:
        return value;
    }
  }

  /**
   * Checks if a constraint applies to a specific item.
   */
  private _constraintAppliesToItem(_constraint: LayoutConstraint, _itemId: string): boolean {
    // For simplicity, all constraints apply to all items
    // In a more sophisticated system, constraints would specify target items
    return true;
  }

  /**
   * Checks a single constraint and returns a violation if violated.
   */
  private _checkConstraint(
    constraint: LayoutConstraint,
    solution: ConstraintSolution
  ): ConstraintViolation | null {
    const affectedItems: string[] = [];
    let violated = false;
    let message = '';

    for (const [id, size] of solution.sizes) {
      const params = constraint.params;

      switch (constraint.type) {
        case 'min-width':
          if (params.type === 'dimension' && size.width < params.value) {
            violated = true;
            affectedItems.push(id);
            message = `Width ${size.width}px is less than minimum ${params.value}${params.unit}`;
          }
          break;
        case 'max-width':
          if (params.type === 'dimension' && size.width > params.value) {
            violated = true;
            affectedItems.push(id);
            message = `Width ${size.width}px exceeds maximum ${params.value}${params.unit}`;
          }
          break;
        case 'min-height':
          if (params.type === 'dimension' && size.height < params.value) {
            violated = true;
            affectedItems.push(id);
            message = `Height ${size.height}px is less than minimum ${params.value}${params.unit}`;
          }
          break;
        case 'max-height':
          if (params.type === 'dimension' && size.height > params.value) {
            violated = true;
            affectedItems.push(id);
            message = `Height ${size.height}px exceeds maximum ${params.value}${params.unit}`;
          }
          break;
        case 'aspect-ratio':
          if (params.type === 'aspect-ratio') {
            const ratio = size.width / size.height;
            if (Math.abs(ratio - params.ratio) > params.tolerance) {
              violated = true;
              affectedItems.push(id);
              message = `Aspect ratio ${ratio.toFixed(2)} differs from required ${params.ratio} by more than tolerance ${params.tolerance}`;
            }
          }
          break;
      }
    }

    if (violated) {
      return {
        constraintId: constraint.id,
        severity: constraint.priority === 'required' ? 'error' : 'warning',
        message,
        affectedItems,
      };
    }

    return null;
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Creates a new ConstraintSolver instance.
 *
 * @returns A new ConstraintSolver instance
 */
export function createConstraintSolver(): ConstraintSolverInterface {
  return new ConstraintSolver();
}
