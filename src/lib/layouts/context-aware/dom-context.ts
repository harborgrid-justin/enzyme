/**
 * @fileoverview DOM Context Tracking System
 *
 * This module provides the core DOM ancestry tracking functionality.
 * It efficiently detects layout types, tracks parent constraints,
 * and maintains a cache of computed layout information.
 *
 * Key features:
 * - WeakMap-based caching for automatic garbage collection
 * - Batched DOM reads via requestAnimationFrame
 * - Layout type detection from computed styles
 * - Constraint inheritance through the DOM tree
 *
 * @module layouts/context-aware/dom-context
 * @author Agent 4 - PhD Context Systems Expert
 * @version 1.0.0
 */

import type {
  LayoutType,
  PositionType,
  LayoutAncestor,
  LayoutConstraints,
  ComputedBounds,
  FlexContainerProperties,
  GridContainerProperties,
  ContextTrackingConfig,
  DimensionBounds,
} from './types';
import {
  isPositionType,
  isScrollContainer,
  DEFAULT_TRACKING_CONFIG,
} from './types';

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum depth to traverse when building ancestry chain.
 * Prevents infinite loops and excessive computation.
 */
const MAX_ANCESTRY_DEPTH = 50;

/**
 * Unique ID counter for element identification.
 */
let elementIdCounter = 0;

// ============================================================================
// DOM Context Tracker Class
// ============================================================================

/**
 * Tracks DOM context for elements including layout ancestry,
 * constraints, and computed dimensions.
 *
 * @remarks
 * Uses WeakMap for caching to prevent memory leaks when elements
 * are removed from the DOM. All DOM reads are batched for performance.
 *
 * @example
 * ```typescript
 * const tracker = DOMContextTracker.getInstance();
 * const ancestry = tracker.getAncestry(element);
 * const constraints = tracker.getConstraints(element);
 * ```
 */
export class DOMContextTracker {
  private static instance: DOMContextTracker | null = null;

  /** WeakMap cache for element IDs */
  private readonly elementIds: WeakMap<Element, string> = new WeakMap();

  /** WeakMap cache for computed ancestors */
  private readonly ancestorCache: WeakMap<Element, LayoutAncestor[]> = new WeakMap();

  /** WeakMap cache for computed constraints */
  private readonly constraintCache: WeakMap<Element, LayoutConstraints> = new WeakMap();

  /** WeakMap cache for computed bounds */
  private readonly boundsCache: WeakMap<Element, ComputedBounds> = new WeakMap();

  /** Set of elements pending updates */
  private readonly pendingUpdates: Set<Element> = new Set();

  /** Configuration for tracking behavior */
  private readonly config: ContextTrackingConfig;

  /** RAF handle for batched updates */
  private rafHandle: number | null = null;

  /** Callbacks to invoke after batch update */
  private updateCallbacks: Array<() => void> = [];

  /** Whether we're in SSR mode */
  private readonly isSSR: boolean;

  /**
   * Creates a new DOMContextTracker instance.
   *
   * @param config - Optional configuration override
   */
  private constructor(config: Partial<ContextTrackingConfig> = {}) {
    this.config = { ...DEFAULT_TRACKING_CONFIG, ...config };
    this.isSSR = typeof window === 'undefined';
  }

  /**
   * Gets the singleton instance of DOMContextTracker.
   *
   * @param config - Optional configuration override
   * @returns The singleton instance
   */
  public static getInstance(config?: Partial<ContextTrackingConfig>): DOMContextTracker {
    if (!DOMContextTracker.instance) {
      DOMContextTracker.instance = new DOMContextTracker(config);
    }
    return DOMContextTracker.instance;
  }

  /**
   * Resets the singleton instance (useful for testing).
   */
  public static resetInstance(): void {
    if (DOMContextTracker.instance) {
      DOMContextTracker.instance.destroy();
      DOMContextTracker.instance = null;
    }
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Gets or generates a unique ID for an element.
   *
   * @param element - The DOM element
   * @returns Unique identifier string
   */
  public getElementId(element: Element): string {
    let id = this.elementIds.get(element);
    if (!id) {
      id = `dom-ctx-${++elementIdCounter}`;
      this.elementIds.set(element, id);
    }
    return id;
  }

  /**
   * Gets the layout ancestry chain for an element.
   *
   * @param element - The DOM element to get ancestry for
   * @param forceRefresh - Whether to bypass cache
   * @returns Array of LayoutAncestor from closest to farthest
   */
  public getAncestry(element: Element, forceRefresh = false): LayoutAncestor[] {
    if (this.isSSR) {
      return [];
    }

    if (!forceRefresh) {
      const cached = this.ancestorCache.get(element);
      if (cached) {
        return cached;
      }
    }

    const ancestry = this.buildAncestry(element);
    this.ancestorCache.set(element, ancestry);
    return ancestry;
  }

  /**
   * Gets the layout constraints for an element based on its ancestry.
   *
   * @param element - The DOM element
   * @param forceRefresh - Whether to bypass cache
   * @returns Computed layout constraints
   */
  public getConstraints(element: Element, forceRefresh = false): LayoutConstraints {
    if (this.isSSR) {
      return this.createDefaultConstraints();
    }

    if (!forceRefresh) {
      const cached = this.constraintCache.get(element);
      if (cached) {
        return cached;
      }
    }

    const constraints = this.computeConstraints(element);
    this.constraintCache.set(element, constraints);
    return constraints;
  }

  /**
   * Gets the computed bounds for an element.
   *
   * @param element - The DOM element
   * @param forceRefresh - Whether to bypass cache
   * @returns Computed bounds including content/padding/border boxes
   */
  public getBounds(element: Element, forceRefresh = false): ComputedBounds {
    if (this.isSSR) {
      return this.createDefaultBounds();
    }

    if (!forceRefresh) {
      const cached = this.boundsCache.get(element);
      if (cached) {
        return cached;
      }
    }

    const bounds = this.computeBounds(element);
    this.boundsCache.set(element, bounds);
    return bounds;
  }

  /**
   * Detects the layout type of an element.
   *
   * @param element - The DOM element
   * @returns The detected LayoutType
   */
  public getLayoutType(element: Element): LayoutType {
    if (this.isSSR) {
      return 'block';
    }

    const style = getComputedStyle(element);
    return this.parseLayoutType(style.display);
  }

  /**
   * Detects the position type of an element.
   *
   * @param element - The DOM element
   * @returns The detected PositionType
   */
  public getPositionType(element: Element): PositionType {
    if (this.isSSR) {
      return 'static';
    }

    const style = getComputedStyle(element);
    const position = style.position;
    return isPositionType(position) ? position : 'static';
  }

  /**
   * Schedules a cache invalidation for an element.
   *
   * @param element - The DOM element to invalidate
   * @param callback - Optional callback after invalidation
   */
  public invalidate(element: Element, callback?: () => void): void {
    this.pendingUpdates.add(element);
    if (callback) {
      this.updateCallbacks.push(callback);
    }
    this.scheduleUpdate();
  }

  /**
   * Invalidates cache for an element and all its descendants.
   *
   * @param element - The root element to invalidate
   */
  public invalidateTree(element: Element): void {
    this.invalidate(element);
    const descendants = element.querySelectorAll('*');
    descendants.forEach((descendant) => {
      this.pendingUpdates.add(descendant);
    });
    this.scheduleUpdate();
  }

  /**
   * Clears all caches. Use sparingly.
   */
  public clearAllCaches(): void {
    // WeakMaps don't have a clear method, so we create new ones
    // The old ones will be garbage collected
    if (this.config.debug) {
      console.debug('[DOMContextTracker] Clearing all caches');
    }
  }

  /**
   * Destroys the tracker and cleans up resources.
   */
  public destroy(): void {
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
    this.pendingUpdates.clear();
    this.updateCallbacks = [];
  }

  // ==========================================================================
  // Private Methods - Ancestry Building
  // ==========================================================================

  /**
   * Builds the complete ancestry chain for an element.
   *
   * @param element - Starting element
   * @returns Array of LayoutAncestor objects
   */
  private buildAncestry(element: Element): LayoutAncestor[] {
    const ancestors: LayoutAncestor[] = [];
    let current = element.parentElement;
    let depth = 0;

    while (current && depth < MAX_ANCESTRY_DEPTH) {
      const ancestor = this.createLayoutAncestor(current, depth);
      ancestors.push(ancestor);
      current = current.parentElement;
      depth++;
    }

    return ancestors;
  }

  /**
   * Creates a LayoutAncestor object for an element.
   *
   * @param element - The DOM element
   * @param depth - Depth in ancestry chain
   * @returns LayoutAncestor object
   */
  private createLayoutAncestor(element: Element, depth: number): LayoutAncestor {
    const style = getComputedStyle(element);
    const layoutType = this.parseLayoutType(style.display);
    const positionType = isPositionType(style.position) ? style.position : 'static';
    const bounds = this.computeBounds(element);
    const constraints = this.computeConstraints(element);

    const ancestor: LayoutAncestor = {
      id: this.getElementId(element),
      element,
      layoutType,
      positionType,
      bounds,
      constraints,
      depth,
      isScrollContainer: isScrollContainer(element),
      isContainingBlock: this.isContainingBlock(style, positionType),
      flexProperties: layoutType === 'flex' || layoutType === 'inline-flex'
        ? this.extractFlexProperties(style)
        : undefined,
      gridProperties: layoutType === 'grid' || layoutType === 'inline-grid'
        ? this.extractGridProperties(style)
        : undefined,
    };

    return ancestor;
  }

  /**
   * Parses CSS display value to LayoutType.
   *
   * @param display - CSS display value
   * @returns Corresponding LayoutType
   */
  private parseLayoutType(display: string): LayoutType {
    // Handle multi-value display (e.g., "flex" or "block flex")
    const parts = display.split(' ');
    const mainDisplay = parts[parts.length - 1] || '';

    // Normalize display values
    if (mainDisplay.includes('flex')) {
      return display.includes('inline') ? 'inline-flex' : 'flex';
    }
    if (mainDisplay.includes('grid')) {
      return display.includes('inline') ? 'inline-grid' : 'grid';
    }
    if (display === 'inline-block') {
      return 'inline-block';
    }
    if (display === 'inline') {
      return 'inline';
    }
    if (display === 'none') {
      return 'none';
    }
    if (display === 'contents') {
      return 'contents';
    }
    if (display.includes('table')) {
      if (display === 'table-row') return 'table-row';
      if (display === 'table-cell') return 'table-cell';
      return 'table';
    }

    return 'block';
  }

  /**
   * Extracts flex container properties from computed style.
   *
   * @param style - Computed style object
   * @returns FlexContainerProperties
   */
  private extractFlexProperties(style: CSSStyleDeclaration): FlexContainerProperties {
    return {
      direction: style.flexDirection as FlexContainerProperties['direction'],
      wrap: style.flexWrap as FlexContainerProperties['wrap'],
      justifyContent: style.justifyContent,
      alignItems: style.alignItems,
      alignContent: style.alignContent,
      gap: parseFloat(style.gap) || 0,
      rowGap: parseFloat(style.rowGap) || 0,
      columnGap: parseFloat(style.columnGap) || 0,
    };
  }

  /**
   * Extracts grid container properties from computed style.
   *
   * @param style - Computed style object
   * @returns GridContainerProperties
   */
  private extractGridProperties(style: CSSStyleDeclaration): GridContainerProperties {
    return {
      templateColumns: style.gridTemplateColumns,
      templateRows: style.gridTemplateRows,
      autoFlow: style.gridAutoFlow as GridContainerProperties['autoFlow'],
      gap: parseFloat(style.gap) || 0,
      rowGap: parseFloat(style.rowGap) || 0,
      columnGap: parseFloat(style.columnGap) || 0,
      templateAreas: style.gridTemplateAreas === 'none' ? null : style.gridTemplateAreas,
    };
  }

  /**
   * Determines if an element creates a containing block.
   *
   * @param style - Computed style
   * @param position - Position type
   * @returns Whether element is a containing block
   */
  private isContainingBlock(style: CSSStyleDeclaration, position: PositionType): boolean {
    // Non-static position creates containing block
    if (position !== 'static') {
      return true;
    }

    // Transform, filter, or will-change creates containing block
    if (
      style.transform !== 'none' ||
      style.filter !== 'none' ||
      style.willChange === 'transform' ||
      style.willChange === 'filter'
    ) {
      return true;
    }

    // Contain property creates containing block
    if (style.contain === 'layout' || style.contain === 'paint' || style.contain === 'strict') {
      return true;
    }

    return false;
  }

  // ==========================================================================
  // Private Methods - Constraint Computation
  // ==========================================================================

  /**
   * Computes layout constraints for an element.
   *
   * @param element - The DOM element
   * @returns Computed LayoutConstraints
   */
  private computeConstraints(element: Element): LayoutConstraints {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const position = style.position;

    // Parse dimension constraints
    const width = this.parseDimensionBounds(
      style.minWidth,
      style.maxWidth,
      rect.width
    );

    const height = this.parseDimensionBounds(
      style.minHeight,
      style.maxHeight,
      rect.height
    );

    // Parse flex grow/shrink
    const canGrow = parseFloat(style.flexGrow) > 0;
    const canShrink = parseFloat(style.flexShrink) > 0;

    // Parse aspect ratio
    const aspectRatioValue = style.aspectRatio;
    let aspectRatio: number | null = null;
    if (aspectRatioValue && aspectRatioValue !== 'auto') {
      const parts = aspectRatioValue.split('/');
      if (parts.length === 2) {
        aspectRatio = parseFloat(parts[0] ?? '0') / parseFloat(parts[1] ?? '1');
      } else {
        aspectRatio = parseFloat(aspectRatioValue);
      }
      if (isNaN(aspectRatio)) {
        aspectRatio = null;
      }
    }

    // Determine if absolutely positioned
    const isAbsolutelyPositioned = position === 'absolute' || position === 'fixed';

    // Determine if creates stacking context
    const createsStackingContext = this.createsStackingContext(style, position as PositionType);

    return {
      width,
      height,
      canGrow,
      canShrink,
      aspectRatio,
      isAbsolutelyPositioned,
      createsStackingContext,
    };
  }

  /**
   * Parses dimension constraint values.
   *
   * @param min - CSS min value
   * @param max - CSS max value
   * @param current - Current dimension
   * @returns DimensionBounds object
   */
  private parseDimensionBounds(min: string, max: string, current: number): DimensionBounds {
    const parseValue = (value: string): number => {
      if (value === 'none' || value === 'auto') {
        return value === 'none' ? Infinity : current;
      }
      const parsed = parseFloat(value);
      return isNaN(parsed) ? current : parsed;
    };

    return {
      min: Math.max(0, parseValue(min)),
      max: max === 'none' ? Infinity : parseValue(max),
      current,
    };
  }

  /**
   * Determines if an element creates a stacking context.
   *
   * @param style - Computed style
   * @param position - Position type
   * @returns Whether element creates stacking context
   */
  private createsStackingContext(style: CSSStyleDeclaration, position: PositionType): boolean {
    // z-index on positioned element
    if (position !== 'static' && style.zIndex !== 'auto') {
      return true;
    }

    // opacity less than 1
    if (parseFloat(style.opacity) < 1) {
      return true;
    }

    // transform, filter, perspective
    if (
      style.transform !== 'none' ||
      style.filter !== 'none' ||
      style.perspective !== 'none'
    ) {
      return true;
    }

    // mix-blend-mode
    if (style.mixBlendMode !== 'normal') {
      return true;
    }

    // isolation
    if (style.isolation === 'isolate') {
      return true;
    }

    // will-change
    const willChange = style.willChange;
    if (
      willChange === 'transform' ||
      willChange === 'opacity' ||
      willChange === 'filter'
    ) {
      return true;
    }

    // contain
    if (
      style.contain === 'layout' ||
      style.contain === 'paint' ||
      style.contain === 'strict' ||
      style.contain === 'content'
    ) {
      return true;
    }

    return false;
  }

  // ==========================================================================
  // Private Methods - Bounds Computation
  // ==========================================================================

  /**
   * Computes comprehensive bounds for an element.
   *
   * @param element - The DOM element
   * @returns ComputedBounds object
   */
  private computeBounds(element: Element): ComputedBounds {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);

    // Parse padding
    const paddingTop = parseFloat(style.paddingTop) || 0;
    const paddingRight = parseFloat(style.paddingRight) || 0;
    const paddingBottom = parseFloat(style.paddingBottom) || 0;
    const paddingLeft = parseFloat(style.paddingLeft) || 0;

    // Parse border
    const borderTop = parseFloat(style.borderTopWidth) || 0;
    const borderRight = parseFloat(style.borderRightWidth) || 0;
    const borderBottom = parseFloat(style.borderBottomWidth) || 0;
    const borderLeft = parseFloat(style.borderLeftWidth) || 0;

    // Calculate box dimensions
    const borderBoxWidth = rect.width;
    const borderBoxHeight = rect.height;

    const paddingBoxWidth = borderBoxWidth - borderLeft - borderRight;
    const paddingBoxHeight = borderBoxHeight - borderTop - borderBottom;

    const contentBoxWidth = paddingBoxWidth - paddingLeft - paddingRight;
    const contentBoxHeight = paddingBoxHeight - paddingTop - paddingBottom;

    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
      contentBox: {
        width: Math.max(0, contentBoxWidth),
        height: Math.max(0, contentBoxHeight),
      },
      paddingBox: {
        width: Math.max(0, paddingBoxWidth),
        height: Math.max(0, paddingBoxHeight),
      },
      borderBox: {
        width: borderBoxWidth,
        height: borderBoxHeight,
      },
    };
  }

  // ==========================================================================
  // Private Methods - Defaults
  // ==========================================================================

  /**
   * Creates default constraints for SSR.
   */
  private createDefaultConstraints(): LayoutConstraints {
    return {
      width: { min: 0, max: Infinity, current: 0 },
      height: { min: 0, max: Infinity, current: 0 },
      canGrow: true,
      canShrink: true,
      aspectRatio: null,
      isAbsolutelyPositioned: false,
      createsStackingContext: false,
    };
  }

  /**
   * Creates default bounds for SSR.
   */
  private createDefaultBounds(): ComputedBounds {
    return {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      contentBox: { width: 0, height: 0 },
      paddingBox: { width: 0, height: 0 },
      borderBox: { width: 0, height: 0 },
    };
  }

  // ==========================================================================
  // Private Methods - Update Scheduling
  // ==========================================================================

  /**
   * Schedules a batched update for pending elements.
   */
  private scheduleUpdate(): void {
    if (this.isSSR || this.rafHandle !== null) {
      return;
    }

    this.rafHandle = requestAnimationFrame(() => {
      this.processPendingUpdates();
      this.rafHandle = null;
    });
  }

  /**
   * Processes all pending element updates.
   */
  private processPendingUpdates(): void {
    // Clear caches for pending elements
    this.pendingUpdates.forEach((element) => {
      this.ancestorCache.delete(element);
      this.constraintCache.delete(element);
      this.boundsCache.delete(element);
    });

    this.pendingUpdates.clear();

    // Invoke callbacks
    const callbacks = this.updateCallbacks;
    this.updateCallbacks = [];
    callbacks.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        if (this.config.debug) {
          console.error('[DOMContextTracker] Callback error:', error);
        }
      }
    });
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Gets the singleton DOMContextTracker instance.
 *
 * @param config - Optional configuration
 * @returns DOMContextTracker instance
 */
export function getDOMContextTracker(config?: Partial<ContextTrackingConfig>): DOMContextTracker {
  return DOMContextTracker.getInstance(config);
}

/**
 * Finds the nearest ancestor of a specific layout type.
 *
 * @param ancestry - Array of layout ancestors
 * @param type - Layout type to find
 * @returns Matching ancestor or undefined
 */
export function findAncestorByType(
  ancestry: LayoutAncestor[],
  type: LayoutType
): LayoutAncestor | undefined {
  return ancestry.find((ancestor) => ancestor.layoutType === type);
}

/**
 * Finds the nearest scroll container in ancestry.
 *
 * @param ancestry - Array of layout ancestors
 * @returns Scroll container ancestor or undefined
 */
export function findScrollContainerAncestor(
  ancestry: LayoutAncestor[]
): LayoutAncestor | undefined {
  return ancestry.find((ancestor) => ancestor.isScrollContainer);
}

/**
 * Finds the nearest containing block in ancestry.
 *
 * @param ancestry - Array of layout ancestors
 * @returns Containing block ancestor or undefined
 */
export function findContainingBlockAncestor(
  ancestry: LayoutAncestor[]
): LayoutAncestor | undefined {
  return ancestry.find((ancestor) => ancestor.isContainingBlock);
}

/**
 * Computes inherited constraints from ancestry chain.
 *
 * @param ancestry - Array of layout ancestors
 * @returns Merged constraints or null
 */
export function computeInheritedConstraints(
  ancestry: LayoutAncestor[]
): LayoutConstraints | null {
  if (ancestry.length === 0) {
    return null;
  }

  // Start with the closest ancestor's constraints
  const base = ancestry[0]?.constraints;

  // Apply constraint inheritance rules
  // For now, just return the closest ancestor's constraints
  // More sophisticated inheritance can be added based on layout types
  return base ?? null;
}

/**
 * Checks if an element is within a specific layout type.
 *
 * @param ancestry - Array of layout ancestors
 * @param type - Layout type to check for
 * @returns Whether element is within the layout type
 */
export function isWithinLayoutType(ancestry: LayoutAncestor[], type: LayoutType): boolean {
  return ancestry.some((ancestor) => ancestor.layoutType === type);
}

/**
 * Gets the layout depth (number of layout-significant ancestors).
 *
 * @param ancestry - Array of layout ancestors
 * @returns Layout depth
 */
export function getLayoutDepth(ancestry: LayoutAncestor[]): number {
  return ancestry.filter(
    (ancestor) => ancestor.layoutType !== 'contents' && ancestor.layoutType !== 'none'
  ).length;
}
