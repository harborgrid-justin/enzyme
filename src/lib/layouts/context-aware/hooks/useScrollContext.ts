/**
 * @fileoverview useScrollContext Hook
 *
 * Provides access to scroll container state and scroll control utilities.
 *
 * @module layouts/context-aware/hooks/useScrollContext
 * @author Agent 4 - PhD Context Systems Expert
 * @version 1.0.0
 */

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';

import type {
  ScrollContainer,
  ScrollDirection,
  UseScrollContextReturn,
} from '../types';
import { useDOMContextValue } from '../DOMContextProvider';
import {
  ScrollTracker,
  ScrollContainerRegistry,
  type ScrollCallback,
} from '../scroll-tracker';
import { useScrollContainerContext } from '../ScrollAwareContainer';

// ============================================================================
// useScrollContext Hook
// ============================================================================

/**
 * Hook to access scroll container context and utilities.
 *
 * @remarks
 * This hook provides information about the nearest scroll container
 * and utilities for programmatic scrolling.
 *
 * @returns Scroll container state and control functions
 *
 * @example
 * ```tsx
 * function ScrollableContent() {
 *   const {
 *     scrollContainer,
 *     isInScrollContainer,
 *     scrollTo,
 *     scrollBy,
 *     scrollDirection,
 *     scrollProgress,
 *   } = useScrollContext();
 *
 *   return (
 *     <div>
 *       {isInScrollContainer && (
 *         <>
 *           <p>Scroll progress: {(scrollProgress.y * 100).toFixed(0)}%</p>
 *           <button onClick={() => scrollTo({ y: 0, behavior: 'smooth' })}>
 *             Back to top
 *           </button>
 *         </>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useScrollContext(): UseScrollContextReturn {
  // Try to get context from ScrollAwareContainer first
  const containerContext = useScrollContainerContext();

  // Fall back to DOM context
  const domContext = useDOMContextValue();
  const scrollContainer = containerContext || domContext.scrollContainer;

  // Create scroll control functions
  const scrollTo = useCallback(
    (options: { x?: number; y?: number; behavior?: 'auto' | 'smooth' }) => {
      if (scrollContainer?.element) {
        scrollContainer.element.scrollTo({
          left: options.x,
          top: options.y,
          behavior: options.behavior,
        });
      }
    },
    [scrollContainer]
  );

  const scrollBy = useCallback(
    (options: { x?: number; y?: number; behavior?: 'auto' | 'smooth' }) => {
      if (scrollContainer?.element) {
        scrollContainer.element.scrollBy({
          left: options.x,
          top: options.y,
          behavior: options.behavior,
        });
      }
    },
    [scrollContainer]
  );

  return {
    scrollContainer,
    isInScrollContainer: scrollContainer !== null,
    scrollTo,
    scrollBy,
    scrollDirection: scrollContainer?.scrollDirection || 'none',
    scrollProgress: scrollContainer?.scrollProgress || { x: 0, y: 0 },
  };
}

// ============================================================================
// Specialized Scroll Hooks
// ============================================================================

/**
 * Hook to find and track a specific scroll container.
 *
 * @param containerRef - Ref to the scroll container element
 * @returns Scroll container state
 *
 * @example
 * ```tsx
 * function CustomScrollContainer() {
 *   const containerRef = useRef<HTMLDivElement>(null);
 *   const scrollState = useScrollContainer(containerRef);
 *
 *   return (
 *     <div ref={containerRef} style={{ overflow: 'auto' }}>
 *       <p>Position: {scrollState?.scrollPosition.y}px</p>
 *       {children}
 *     </div>
 *   );
 * }
 * ```
 */
export function useScrollContainer(
  containerRef: React.RefObject<HTMLElement>
): ScrollContainer | null {
  const [scrollState, setScrollState] = useState<ScrollContainer | null>(null);
  const trackerRef = useRef<ScrollTracker | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const registry = ScrollContainerRegistry.getInstance();
    const tracker = registry.getTracker(containerRef.current);
    trackerRef.current = tracker;

    const handleScroll: ScrollCallback = (state) => {
      setScrollState(state);
    };

    // Set initial state
    setScrollState(tracker.getState());

    // Subscribe to updates
    const unsubscribe = tracker.onScroll(handleScroll);

    return () => {
      unsubscribe();
    };
  }, [containerRef]);

  return scrollState;
}

/**
 * Hook to get scroll direction.
 *
 * @returns Current scroll direction
 *
 * @example
 * ```tsx
 * function DirectionalHeader() {
 *   const direction = useScrollDirection();
 *
 *   return (
 *     <header
 *       className={direction === 'down' ? 'hidden' : 'visible'}
 *     >
 *       Header content
 *     </header>
 *   );
 * }
 * ```
 */
export function useScrollDirection(): ScrollDirection {
  const { scrollDirection } = useScrollContext();
  return scrollDirection;
}

/**
 * Hook to get scroll progress (0-1).
 *
 * @returns Scroll progress for x and y axes
 *
 * @example
 * ```tsx
 * function ProgressIndicator() {
 *   const progress = useScrollProgress();
 *
 *   return (
 *     <div
 *       className="progress-bar"
 *       style={{ width: `${progress.y * 100}%` }}
 *     />
 *   );
 * }
 * ```
 */
export function useScrollProgress(): { x: number; y: number } {
  const { scrollProgress } = useScrollContext();
  return scrollProgress;
}

/**
 * Hook to detect if scrolling is currently happening.
 *
 * @returns Whether currently scrolling
 *
 * @example
 * ```tsx
 * function ScrollingIndicator() {
 *   const isScrolling = useIsScrolling();
 *
 *   return (
 *     <div className={isScrolling ? 'scrolling' : ''}>
 *       Content
 *     </div>
 *   );
 * }
 * ```
 */
export function useIsScrolling(): boolean {
  const { scrollContainer } = useScrollContext();
  return scrollContainer?.isScrolling || false;
}

/**
 * Hook to detect if scroll has reached edges.
 *
 * @returns Edge states
 *
 * @example
 * ```tsx
 * function InfiniteScroll() {
 *   const { atBottom } = useScrollEdges();
 *
 *   useEffect(() => {
 *     if (atBottom) {
 *       loadMoreItems();
 *     }
 *   }, [atBottom]);
 *
 *   return <List items={items} />;
 * }
 * ```
 */
export function useScrollEdges(): {
  atTop: boolean;
  atBottom: boolean;
  atLeft: boolean;
  atRight: boolean;
} {
  const { scrollContainer } = useScrollContext();

  return useMemo(
    () => ({
      atTop: scrollContainer?.atEdge.top ?? true,
      atBottom: scrollContainer?.atEdge.bottom ?? true,
      atLeft: scrollContainer?.atEdge.left ?? true,
      atRight: scrollContainer?.atEdge.right ?? true,
    }),
    [scrollContainer?.atEdge]
  );
}

/**
 * Hook to get scroll position.
 *
 * @returns Scroll x and y positions
 *
 * @example
 * ```tsx
 * function ScrollDisplay() {
 *   const { x, y } = useScrollPosition();
 *
 *   return <span>Scroll: {x}, {y}</span>;
 * }
 * ```
 */
export function useScrollPosition(): { x: number; y: number } {
  const { scrollContainer } = useScrollContext();

  return useMemo(
    () => ({
      x: scrollContainer?.scrollPosition.x ?? 0,
      y: scrollContainer?.scrollPosition.y ?? 0,
    }),
    [scrollContainer?.scrollPosition]
  );
}

/**
 * Hook to get scroll velocity (for momentum detection).
 *
 * @returns Velocity in px/s for x and y axes
 *
 * @example
 * ```tsx
 * function MomentumIndicator() {
 *   const velocity = useScrollVelocity();
 *   const isFastScroll = Math.abs(velocity.y) > 1000;
 *
 *   return (
 *     <div className={isFastScroll ? 'fast-scroll' : ''}>
 *       Content
 *     </div>
 *   );
 * }
 * ```
 */
export function useScrollVelocity(): { x: number; y: number } {
  const { scrollContainer } = useScrollContext();

  return useMemo(
    () => ({
      x: scrollContainer?.scrollVelocity.x ?? 0,
      y: scrollContainer?.scrollVelocity.y ?? 0,
    }),
    [scrollContainer?.scrollVelocity]
  );
}

// ============================================================================
// Scroll Actions
// ============================================================================

/**
 * Hook to get scroll-to-top functionality.
 *
 * @returns Scroll to top function and whether at top
 *
 * @example
 * ```tsx
 * function BackToTop() {
 *   const { scrollToTop, isAtTop } = useScrollToTop();
 *
 *   if (isAtTop) return null;
 *
 *   return <button onClick={scrollToTop}>Back to top</button>;
 * }
 * ```
 */
export function useScrollToTop(): {
  scrollToTop: (behavior?: 'auto' | 'smooth') => void;
  isAtTop: boolean;
} {
  const { scrollTo, scrollContainer } = useScrollContext();

  const scrollToTop = useCallback(
    (behavior: 'auto' | 'smooth' = 'smooth') => {
      scrollTo({ y: 0, behavior });
    },
    [scrollTo]
  );

  const isAtTop = scrollContainer?.atEdge.top ?? true;

  return { scrollToTop, isAtTop };
}

/**
 * Hook to get scroll-to-bottom functionality.
 *
 * @returns Scroll to bottom function and whether at bottom
 *
 * @example
 * ```tsx
 * function ChatContainer() {
 *   const { scrollToBottom, isAtBottom } = useScrollToBottom();
 *
 *   // Auto-scroll on new messages if already at bottom
 *   useEffect(() => {
 *     if (isAtBottom) {
 *       scrollToBottom();
 *     }
 *   }, [messages]);
 *
 *   return <MessageList messages={messages} />;
 * }
 * ```
 */
export function useScrollToBottom(): {
  scrollToBottom: (behavior?: 'auto' | 'smooth') => void;
  isAtBottom: boolean;
} {
  const { scrollTo, scrollContainer } = useScrollContext();

  const scrollToBottom = useCallback(
    (behavior: 'auto' | 'smooth' = 'smooth') => {
      if (scrollContainer) {
        scrollTo({
          y: scrollContainer.scrollDimensions.height,
          behavior,
        });
      }
    },
    [scrollTo, scrollContainer]
  );

  const isAtBottom = scrollContainer?.atEdge.bottom ?? true;

  return { scrollToBottom, isAtBottom };
}

/**
 * Hook to scroll a specific element into view within the container.
 *
 * @returns Function to scroll element into view
 *
 * @example
 * ```tsx
 * function ListWithFocus() {
 *   const scrollIntoView = useScrollIntoView();
 *   const [activeId, setActiveId] = useState(null);
 *
 *   const handleSelect = (id) => {
 *     setActiveId(id);
 *     const element = document.getElementById(id);
 *     if (element) {
 *       scrollIntoView(element);
 *     }
 *   };
 *
 *   return <List onSelect={handleSelect} />;
 * }
 * ```
 */
export function useScrollIntoView(): (
  element: Element,
  options?: ScrollIntoViewOptions
) => void {
  return useCallback((element: Element, options?: ScrollIntoViewOptions) => {
    element.scrollIntoView(
      options || { behavior: 'smooth', block: 'center' }
    );
  }, []);
}

// ============================================================================
// Export
// ============================================================================

export default useScrollContext;
