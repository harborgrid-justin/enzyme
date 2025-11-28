/**
 * @file useModuleBoundary Hook
 * @module vdom/hooks/useModuleBoundary
 * @description Hook for accessing module boundary information including
 * slots, dimensions, visibility, and parent boundary context.
 *
 * @author Agent 5 - PhD Virtual DOM Expert
 * @version 1.0.0
 */

import {
  useRef,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import {
  type ReactNode,
} from 'react';
import {
  type UseModuleBoundaryReturn,
  type ModuleSlotDefinition,
} from '../types';
import { useModuleContext, useOptionalModuleContext } from '../ModuleBoundary';
import { useModuleHierarchy } from '../ModuleProvider';

/**
 * Hook for accessing module boundary information and slot management.
 * Provides boundary element reference, slot operations, and visibility tracking.
 *
 * @returns Module boundary information and utilities
 * @throws Error if used outside a ModuleBoundary
 *
 * @example
 * ```tsx
 * function ModuleContent() {
 *   const {
 *     boundaryRef,
 *     slots,
 *     getSlot,
 *     fillSlot,
 *     dimensions,
 *     isVisible,
 *   } = useModuleBoundary();
 *
 *   useEffect(() => {
 *     // Fill a slot programmatically
 *     fillSlot('actions', <ActionButtons />);
 *
 *     return () => clearSlot('actions');
 *   }, [fillSlot, clearSlot]);
 *
 *   return (
 *     <div>
 *       <p>Module is {isVisible ? 'visible' : 'hidden'}</p>
 *       {dimensions && (
 *         <p>Size: {dimensions.width}x{dimensions.height}</p>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useModuleBoundary(): UseModuleBoundaryReturn {
  const context = useModuleContext();
  // Get module hierarchy context (call but don't store)
  useModuleHierarchy();

  // Boundary element ref
  const boundaryRef = useRef<HTMLElement>(null);

  // Dimensions state
  const [dimensions, setDimensions] = useState<DOMRect | null>(null);

  // Visibility state (tracked separately for responsiveness)
  const [isVisible, setIsVisible] = useState(context.state.isVisible);

  // Get slots from config
  const slots = useMemo<ReadonlyArray<ModuleSlotDefinition>>(
    () => context.config.slots ?? [],
    [context.config.slots]
  );

  // Slot getter
  const getSlot = useCallback(
    (name: string): ReactNode | null => {
      return context.getSlot(name);
    },
    [context]
  );

  // Slot filler
  const fillSlot = useCallback(
    (name: string, content: ReactNode): void => {
      context.setSlot(name, content);
    },
    [context]
  );

  // Slot clearer
  const clearSlot = useCallback(
    (name: string): void => {
      context.setSlot(name, null);
    },
    [context]
  );

  // Get parent boundary info
  const parentBoundary = useMemo<UseModuleBoundaryReturn | null>(() => {
    if (!context.parent) {
      return null;
    }

    // Create a simplified parent boundary interface
    return {
      boundaryRef: { current: null } as React.RefObject<HTMLElement | null>,
      slots: context.parent.config.slots ?? [],
      getSlot: context.parent.getSlot,
      fillSlot: context.parent.setSlot,
      clearSlot: (name: string) => context.parent!.setSlot(name, null),
      dimensions: null,
      isVisible: context.parent.state.isVisible,
      parentBoundary: null, // Don't recurse infinitely
    };
  }, [context.parent]);

  // Track dimensions with ResizeObserver
  useEffect(() => {
    const element = boundaryRef.current;
    if (!element) {
      return;
    }

    const updateDimensions = () => {
      setDimensions(element.getBoundingClientRect());
    };

    // Initial measurement
    updateDimensions();

    // Set up resize observer
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    resizeObserver.observe(element);

    // Also update on window resize/scroll
    const handleViewportChange = () => {
      updateDimensions();
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, { passive: true });

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange);
    };
  }, []);

  // Track visibility with IntersectionObserver
  useEffect(() => {
    const element = boundaryRef.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setIsVisible(entry.isIntersecting);
        }
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Sync visibility with context
  useEffect(() => {
    context.dispatch({ type: 'SET_VISIBILITY', isVisible });
  }, [context, isVisible]);

  // Return memoized object
  return useMemo<UseModuleBoundaryReturn>(
    () => ({
      boundaryRef,
      slots,
      getSlot,
      fillSlot,
      clearSlot,
      dimensions,
      isVisible,
      parentBoundary,
    }),
    [slots, getSlot, fillSlot, clearSlot, dimensions, isVisible, parentBoundary]
  );
}

/**
 * Hook to get the boundary element dimensions.
 * @returns Current dimensions or null if not measured
 *
 * @example
 * ```tsx
 * const dimensions = useBoundaryDimensions();
 *
 * if (dimensions && dimensions.width < 600) {
 *   return <MobileLayout />;
 * }
 * return <DesktopLayout />;
 * ```
 */
export function useBoundaryDimensions(): DOMRect | null {
  const { dimensions } = useModuleBoundary();
  return dimensions;
}

/**
 * Hook to check if the module boundary is visible in viewport.
 * @returns Whether boundary is visible
 */
export function useBoundaryVisibility(): boolean {
  const { isVisible } = useModuleBoundary();
  return isVisible;
}

/**
 * Hook to get the module hierarchy depth.
 * @returns Nesting depth (0 for root modules)
 */
export function useModuleDepth(): number {
  const hierarchy = useModuleHierarchy();
  return hierarchy.depth;
}

/**
 * Hook to get the full module path from root.
 * @returns Array of module IDs from root to current
 */
export function useModulePath(): string[] {
  const hierarchy = useModuleHierarchy();
  return hierarchy.path;
}

/**
 * Hook to check if current module is nested within another.
 * @returns Whether module has a parent
 */
export function useIsNestedModule(): boolean {
  const hierarchy = useModuleHierarchy();
  return hierarchy.depth > 1;
}

/**
 * Hook to get the parent module ID.
 * @returns Parent module ID or null if root
 */
export function useParentModuleId(): string | null {
  const context = useOptionalModuleContext();
  return context?.parent?.moduleId ?? null;
}

/**
 * Hook for slot-specific operations.
 * @param slotName - Name of the slot
 * @returns Slot content and operations
 *
 * @example
 * ```tsx
 * const { content, fill, clear, isFilled } = useSlot('sidebar');
 *
 * if (!isFilled) {
 *   return <DefaultSidebar />;
 * }
 * return content;
 * ```
 */
export function useSlot(slotName: string): {
  content: ReactNode | null;
  fill: (content: ReactNode) => void;
  clear: () => void;
  isFilled: boolean;
} {
  const { getSlot, fillSlot, clearSlot } = useModuleBoundary();

  const content = getSlot(slotName);
  const isFilled = content !== null && content !== undefined;

  const fill = useCallback(
    (newContent: ReactNode) => {
      fillSlot(slotName, newContent);
    },
    [fillSlot, slotName]
  );

  const clear = useCallback(() => {
    clearSlot(slotName);
  }, [clearSlot, slotName]);

  return useMemo(
    () => ({
      content,
      fill,
      clear,
      isFilled,
    }),
    [content, fill, clear, isFilled]
  );
}

/**
 * Hook to manage multiple slots at once.
 * @param slotNames - Array of slot names
 * @returns Map of slot operations by name
 */
export function useSlots(slotNames: string[]): Map<
  string,
  {
    content: ReactNode | null;
    fill: (content: ReactNode) => void;
    clear: () => void;
    isFilled: boolean;
  }
> {
  const { getSlot, fillSlot, clearSlot } = useModuleBoundary();

  return useMemo(() => {
    const map = new Map<
      string,
      {
        content: ReactNode | null;
        fill: (content: ReactNode) => void;
        clear: () => void;
        isFilled: boolean;
      }
    >();

    for (const name of slotNames) {
      const content = getSlot(name);
      map.set(name, {
        content,
        fill: (newContent: ReactNode) => fillSlot(name, newContent),
        clear: () => clearSlot(name),
        isFilled: content !== null && content !== undefined,
      });
    }

    return map;
  }, [slotNames, getSlot, fillSlot, clearSlot]);
}

export default useModuleBoundary;
