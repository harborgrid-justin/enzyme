/**
 * @fileoverview useDOMContext Hook
 *
 * Provides access to the full DOM context from the DOMContextProvider.
 *
 * @module layouts/context-aware/hooks/useDOMContext
 * @author Agent 4 - PhD Context Systems Expert
 * @version 1.0.0
 */

import { useRef, useEffect, useCallback, useMemo, useState, type RefObject } from 'react';

import type {
  DOMContext,
  UseDOMContextReturn,
  LayoutAncestor,
} from '../types';
import {
  useDOMContextValue,
  useDOMContextRefresh,
} from '../DOMContextProvider';
import { getDOMContextTracker } from '../dom-context';

// ============================================================================
// useDOMContext Hook
// ============================================================================

/**
 * Hook to access the full DOM context.
 *
 * @remarks
 * This is the primary hook for accessing DOM context information.
 * It provides the complete context object along with utilities
 * for working with the context.
 *
 * @returns DOM context, loading state, ref, and refresh function
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { context, isLoading, ref, refresh } = useDOMContext();
 *
 *   if (isLoading) {
 *     return <Loading />;
 *   }
 *
 *   return (
 *     <div ref={ref}>
 *       Viewport: {context.viewport.width}x{context.viewport.height}
 *       <button onClick={refresh}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useDOMContext(): UseDOMContextReturn {
  const context = useDOMContextValue();
  const refreshFn = useDOMContextRefresh();
  const elementRef = useRef<HTMLElement>(null);

  // Compute loading state
  const isLoading = !context.isInitialized && !context.isSSR;

  // Create stable refresh function
  const refresh = useCallback(() => {
    if (refreshFn) {
      refreshFn();
    } else if (elementRef.current) {
      // Fallback: manually invalidate element cache
      const tracker = getDOMContextTracker();
      tracker.invalidate(elementRef.current);
    }
  }, [refreshFn]);

  return {
    context,
    isLoading,
    ref: elementRef,
    refresh,
  };
}

// ============================================================================
// useDOMContextWithElement Hook
// ============================================================================

/**
 * Hook to access DOM context for a specific element.
 *
 * @remarks
 * This hook is useful when you need to track a specific element
 * that may be different from the context provider's element.
 *
 * @param elementRef - Ref to the element to track
 * @returns DOM context for the element
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const myRef = useRef<HTMLDivElement>(null);
 *   const { ancestors, bounds } = useDOMContextWithElement(myRef);
 *
 *   return (
 *     <div ref={myRef}>
 *       {ancestors.length > 0 && (
 *         <span>Parent layout: {ancestors[0].layoutType}</span>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useDOMContextWithElement(
  elementRef: RefObject<HTMLElement>
): {
  ancestors: readonly LayoutAncestor[];
  bounds: ReturnType<typeof getDOMContextTracker.prototype.getBounds> | null;
  layoutType: ReturnType<typeof getDOMContextTracker.prototype.getLayoutType> | null;
  refresh: () => void;
} {
  const context = useDOMContextValue();
  const tracker = getDOMContextTracker();

  // Get element-specific information
  const [elementInfo, setElementInfo] = useState<{
    ancestors: readonly LayoutAncestor[];
    bounds: ReturnType<typeof tracker.getBounds> | null;
    layoutType: ReturnType<typeof tracker.getLayoutType> | null;
  }>({
    ancestors: [] as readonly LayoutAncestor[],
    bounds: null,
    layoutType: null,
  });

  useEffect(() => {
    const element = elementRef.current;
    if (!element || context.isSSR) {
      setElementInfo({
        ancestors: [] as readonly LayoutAncestor[],
        bounds: null,
        layoutType: null,
      });
      return;
    }

    setElementInfo({
      ancestors: tracker.getAncestry(element),
      bounds: tracker.getBounds(element),
      layoutType: tracker.getLayoutType(element),
    });
  }, [elementRef, context.isSSR, context.lastUpdated, tracker]);

  // Refresh function
  const refresh = useCallback(() => {
    if (elementRef.current) {
      tracker.invalidate(elementRef.current);
    }
  }, [elementRef, tracker]);

  return {
    ...elementInfo,
    refresh,
  };
}

// ============================================================================
// useContextSelector Hook
// ============================================================================

/**
 * Selector function type for DOM context.
 */
export type DOMContextSelector<T> = (context: DOMContext) => T;

/**
 * Hook to select specific parts of the DOM context.
 *
 * @remarks
 * This hook optimizes re-renders by only triggering updates
 * when the selected value changes.
 *
 * @param selector - Function to select part of context
 * @returns Selected value
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   // Only re-renders when viewport width changes
 *   const width = useContextSelector((ctx) => ctx.viewport.width);
 *
 *   return <div>Width: {width}</div>;
 * }
 * ```
 */
export function useContextSelector<T>(selector: DOMContextSelector<T>): T {
  const context = useDOMContextValue();
  return useMemo(() => selector(context), [context, selector]);
}

// ============================================================================
// useContextEffect Hook
// ============================================================================

/**
 * Hook to run effects when specific context values change.
 *
 * @remarks
 * This is similar to useEffect but with a selector for
 * DOM context changes.
 *
 * @param selector - Function to select trigger value
 * @param effect - Effect function to run
 * @param deps - Additional dependencies
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   useContextEffect(
 *     (ctx) => ctx.viewport.orientation,
 *     (orientation) => {
 *       console.log('Orientation changed:', orientation);
 *     }
 *   );
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function useContextEffect<T>(
  selector: DOMContextSelector<T>,
  effect: (value: T) => void | (() => void),
  deps: React.DependencyList = []
): void {
  const value = useContextSelector(selector);

useEffect(() => {
  return effect(value);
}, [value, ...deps]);
}