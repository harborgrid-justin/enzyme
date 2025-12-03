/**
 * @fileoverview useLayoutAncestry Hook
 *
 * Provides access to the layout ancestry chain from DOM context.
 *
 * @module layouts/context-aware/hooks/useLayoutAncestry
 * @author Agent 4 - PhD Context Systems Expert
 * @version 1.0.0
 */

import { useCallback, useMemo } from 'react';

import type {
  LayoutAncestor,
  LayoutType,
  LayoutConstraints,
  UseLayoutAncestryReturn,
} from '../types';
import { useDOMContextValue } from '../DOMContextProvider';
import {
  findAncestorByType,
  findScrollContainerAncestor,
  findContainingBlockAncestor,
  computeInheritedConstraints,
  isWithinLayoutType,
  getLayoutDepth,
} from '../dom-context';

// ============================================================================
// useLayoutAncestry Hook
// ============================================================================

/**
 * Hook to access layout ancestry information.
 *
 * @remarks
 * This hook provides information about the parent layout chain,
 * making it easy to build layout-aware components.
 *
 * @returns Layout ancestry information and utility functions
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const {
 *     ancestors,
 *     findAncestor,
 *     isInLayout,
 *     constraints,
 *     depth,
 *   } = useLayoutAncestry();
 *
 *   const flexParent = findAncestor('flex');
 *   const isInGrid = isInLayout('grid');
 *
 *   return (
 *     <div>
 *       {flexParent && <span>In flex container</span>}
 *       {isInGrid && <span>In grid container</span>}
 *       {constraints && (
 *         <span>
 *           Max width: {constraints.width.max}px
 *         </span>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useLayoutAncestry(): UseLayoutAncestryReturn {
  const context = useDOMContextValue();
  const { ancestors } = context;

  /**
   * Finds the closest ancestor of a specific layout type.
   */
  const findAncestor = useCallback(
    (type: LayoutType): LayoutAncestor | undefined => {
      return findAncestorByType(ancestors as LayoutAncestor[], type);
    },
    [ancestors]
  );

  /**
   * Checks if the element is within a specific layout type.
   */
  const isInLayout = useCallback(
    (type: LayoutType): boolean => {
      return isWithinLayoutType(ancestors as LayoutAncestor[], type);
    },
    [ancestors]
  );

  /**
   * Gets the inherited constraints from ancestors.
   */
  const constraints = useMemo((): LayoutConstraints | null => {
    return computeInheritedConstraints(ancestors as LayoutAncestor[]);
  }, [ancestors]);

  /**
   * Gets the layout depth.
   */
  const depth = useMemo((): number => {
    return getLayoutDepth(ancestors as LayoutAncestor[]);
  }, [ancestors]);

  return {
    ancestors,
    findAncestor,
    isInLayout,
    constraints,
    depth,
  };
}

// ============================================================================
// Specialized Ancestry Hooks
// ============================================================================

/**
 * Hook to get the nearest flex container ancestor.
 *
 * @returns Flex ancestor or undefined
 *
 * @example
 * ```tsx
 * function FlexChild() {
 *   const flexParent = useFlexAncestor();
 *
 *   if (flexParent) {
 *     console.log('Flex direction:', flexParent.flexProperties?.direction);
 *   }
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function useFlexAncestor(): LayoutAncestor | undefined {
  const { findAncestor } = useLayoutAncestry();
  return useMemo(() => findAncestor('flex') ?? findAncestor('inline-flex'), [findAncestor]);
}

/**
 * Hook to get the nearest grid container ancestor.
 *
 * @returns Grid ancestor or undefined
 *
 * @example
 * ```tsx
 * function GridChild() {
 *   const gridParent = useGridAncestor();
 *
 *   if (gridParent) {
 *     console.log('Grid columns:', gridParent.gridProperties?.templateColumns);
 *   }
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function useGridAncestor(): LayoutAncestor | undefined {
  const { findAncestor } = useLayoutAncestry();
  return useMemo(() => findAncestor('grid') ?? findAncestor('inline-grid'), [findAncestor]);
}

/**
 * Hook to get the nearest scroll container ancestor.
 *
 * @returns Scroll container ancestor or undefined
 *
 * @example
 * ```tsx
 * function ScrollChild() {
 *   const scrollContainer = useScrollContainerAncestor();
 *
 *   if (scrollContainer) {
 *     console.log('Scroll container bounds:', scrollContainer.bounds);
 *   }
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function useScrollContainerAncestor(): LayoutAncestor | undefined {
  const context = useDOMContextValue();
  return useMemo(
    () => findScrollContainerAncestor(context.ancestors as LayoutAncestor[]),
    [context.ancestors]
  );
}

/**
 * Hook to get the nearest containing block ancestor.
 *
 * @returns Containing block ancestor or undefined
 *
 * @example
 * ```tsx
 * function AbsoluteChild() {
 *   const containingBlock = useContainingBlockAncestor();
 *
 *   if (containingBlock) {
 *     console.log('Containing block:', containingBlock.bounds);
 *   }
 *
 *   return <div style={{ position: 'absolute' }}>...</div>;
 * }
 * ```
 */
export function useContainingBlockAncestor(): LayoutAncestor | undefined {
  const context = useDOMContextValue();
  return useMemo(
    () => findContainingBlockAncestor(context.ancestors as LayoutAncestor[]),
    [context.ancestors]
  );
}

// ============================================================================
// Layout Type Detection Hooks
// ============================================================================

/**
 * Hook to check if element is in a flex context.
 *
 * @returns Whether in flex context
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isInFlex = useIsInFlex();
 *
 *   return (
 *     <div style={isInFlex ? { flexGrow: 1 } : { width: '100%' }}>
 *       Content
 *     </div>
 *   );
 * }
 * ```
 */
export function useIsInFlex(): boolean {
  const { isInLayout } = useLayoutAncestry();
  return useMemo(() => isInLayout('flex') || isInLayout('inline-flex'), [isInLayout]);
}

/**
 * Hook to check if element is in a grid context.
 *
 * @returns Whether in grid context
 */
export function useIsInGrid(): boolean {
  const { isInLayout } = useLayoutAncestry();
  return useMemo(() => isInLayout('grid') || isInLayout('inline-grid'), [isInLayout]);
}

/**
 * Hook to check if element is in an inline context.
 *
 * @returns Whether in inline context
 */
export function useIsInInline(): boolean {
  const { isInLayout } = useLayoutAncestry();
  return useMemo(
    () =>
      isInLayout('inline') ||
      isInLayout('inline-block') ||
      isInLayout('inline-flex') ||
      isInLayout('inline-grid'),
    [isInLayout]
  );
}

// ============================================================================
// Constraint Hooks
// ============================================================================

/**
 * Hook to get available width from constraints.
 *
 * @returns Available width in pixels or null
 *
 * @example
 * ```tsx
 * function ResponsiveComponent() {
 *   const availableWidth = useAvailableWidth();
 *
 *   if (availableWidth !== null && availableWidth < 300) {
 *     return <CompactView />;
 *   }
 *
 *   return <NormalView />;
 * }
 * ```
 */
export function useAvailableWidth(): number | null {
  const { constraints, ancestors } = useLayoutAncestry();

  return useMemo(() => {
    if (constraints) {
      return constraints.width.current;
    }
    if (ancestors.length > 0) {
      return ancestors[0]?.bounds.contentBox.width ?? 0;
    }
    return null;
  }, [constraints, ancestors]);
}

/**
 * Hook to get available height from constraints.
 *
 * @returns Available height in pixels or null
 */
export function useAvailableHeight(): number | null {
  const { constraints, ancestors } = useLayoutAncestry();

  return useMemo(() => {
    if (constraints) {
      return constraints.height.current;
    }
    if (ancestors.length > 0) {
      return ancestors[0]?.bounds.contentBox.height ?? 0;
    }
    return null;
  }, [constraints, ancestors]);
}

/**
 * Hook to get the parent aspect ratio constraint.
 *
 * @returns Aspect ratio or null
 */
export function useParentAspectRatio(): number | null {
  const { constraints, ancestors } = useLayoutAncestry();

  return useMemo(() => {
    if (constraints?.aspectRatio != null) {
      return constraints.aspectRatio;
    }
    if (ancestors.length > 0) {
      const { width, height } = ancestors[0]?.bounds.contentBox ?? { width: 0, height: 0 };
      if (height > 0) {
        return width / height;
      }
    }
    return null;
  }, [constraints, ancestors]);
}
