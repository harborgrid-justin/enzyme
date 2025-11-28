/**
 * @fileoverview Scroll-Aware Container Component
 *
 * A container component that provides scroll state awareness
 * and optional virtualization for performance.
 *
 * Features:
 * - Tracks scroll position and direction
 * - Emits scroll events and edge events
 * - Optional content virtualization
 * - Sticky element coordination
 * - Custom scrollbar styling support
 *
 * @module layouts/context-aware/ScrollAwareContainer
 * @author Agent 4 - PhD Context Systems Expert
 * @version 1.0.0
 */

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useContext,
  forwardRef,
} from 'react';
import { ScrollContainerContext } from '../../contexts/ScrollContainerContext';

import type {
  ScrollContainer,
  ScrollAwareContainerProps,
} from './types';
import {
  ScrollTracker,
  ScrollContainerRegistry,
  type ScrollCallback,
  type ScrollEdgeCallback,
} from './scroll-tracker';

// ============================================================================
// Context
// ============================================================================

/**
 * Hook to access scroll container context.
 */
export function useScrollContainerContext(): ScrollContainer | null {
  const context = useContext(ScrollContainerContext);
  return context as ScrollContainer | null;
}

// ============================================================================
// Types
// ============================================================================

/**
 * Extended props with additional scroll features.
 */
export interface ExtendedScrollAwareContainerProps extends ScrollAwareContainerProps {
  /** Maximum height before scroll */
  maxHeight?: number | string;
  /** Whether to show scroll indicators */
  showScrollIndicators?: boolean;
  /** Callback when scroll starts */
  onScrollStart?: () => void;
  /** Callback when scroll ends */
  onScrollEnd?: () => void;
  /** Scroll snap configuration */
  scrollSnap?: {
    type: 'mandatory' | 'proximity';
    align: 'start' | 'center' | 'end';
  };
}

/**
 * Scroll indicators visibility state.
 */
interface ScrollIndicators {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
}

// ============================================================================
// ScrollAwareContainer Component
// ============================================================================

/**
 * A scroll container that tracks and exposes scroll state.
 *
 * @remarks
 * This component wraps content in a scrollable container and
 * provides scroll state information to children and callbacks.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <ScrollAwareContainer>
 *   <LongContent />
 * </ScrollAwareContainer>
 *
 * // With scroll callbacks
 * <ScrollAwareContainer
 *   onScroll={(state) => console.log('Scroll:', state.scrollPosition)}
 *   onScrollEdge={(edge) => console.log('Reached:', edge)}
 * >
 *   <LongContent />
 * </ScrollAwareContainer>
 *
 * // With virtualization (for large lists)
 * <ScrollAwareContainer virtualize itemHeight={50}>
 *   {items.map((item) => <Item key={item.id} {...item} />)}
 * </ScrollAwareContainer>
 * ```
 */
export const ScrollAwareContainer = forwardRef<HTMLDivElement, ExtendedScrollAwareContainerProps>(
  function ScrollAwareContainer(
    {
      children,
      className,
      style,
      virtualize = false,
      itemHeight,
      overscan = 5,
      onScroll,
      onScrollEdge,
      hideScrollbar = false,
      scrollBehavior = 'auto',
      maxHeight,
      showScrollIndicators = false,
      onScrollStart,
      onScrollEnd,
      scrollSnap,
      'data-testid': testId,
    },
    forwardedRef
  ) {
    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const trackerRef = useRef<ScrollTracker | null>(null);
    const isScrollingRef = useRef(false);
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Combine refs
    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        // Use Object.assign to update ref.current without type escape
        Object.assign(containerRef, { current: node });
        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      },
      [forwardedRef]
    );

    // State
    const [scrollState, setScrollState] = useState<ScrollContainer | null>(null);
    const [indicators, setIndicators] = useState<ScrollIndicators>({
      top: false,
      right: false,
      bottom: true,
      left: false,
    });

    // Check SSR
    const isSSR = typeof window === 'undefined';

    /**
     * Handles scroll state updates.
     */
    const handleScrollUpdate = useCallback<ScrollCallback>(
      (state) => {
        setScrollState(state);

        // Update indicators
        if (showScrollIndicators) {
          setIndicators({
            top: !state.atEdge.top,
            right: !state.atEdge.right,
            bottom: !state.atEdge.bottom,
            left: !state.atEdge.left,
          });
        }

        // Handle scroll start/end
        if (!isScrollingRef.current && state.isScrolling) {
          isScrollingRef.current = true;
          onScrollStart?.();
        }

        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }

        scrollTimeoutRef.current = setTimeout(() => {
          if (isScrollingRef.current) {
            isScrollingRef.current = false;
            onScrollEnd?.();
          }
        }, 150);

        // Call external callback
        onScroll?.(state);
      },
      [showScrollIndicators, onScroll, onScrollStart, onScrollEnd]
    );

    /**
     * Handles scroll edge events.
     */
    const handleEdge = useCallback<ScrollEdgeCallback>(
      (edge) => {
        onScrollEdge?.(edge);
      },
      [onScrollEdge]
    );

    // Initialize scroll tracker
    useEffect(() => {
      if (isSSR || !containerRef.current) {
        return;
      }

      const registry = ScrollContainerRegistry.getInstance();
      const tracker = registry.getTracker(containerRef.current, {
        throttleMs: 16,
        trackVelocity: true,
        trackDirection: true,
      });

      trackerRef.current = tracker;

      // Subscribe to scroll events
      const unsubScroll = tracker.onScroll(handleScrollUpdate);
      const unsubEdge = tracker.onEdge(handleEdge);

      // Set initial state
      setScrollState(tracker.getState());

      return () => {
        unsubScroll();
        unsubEdge();

        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }, [isSSR, handleScrollUpdate, handleEdge]);

    /**
     * Computes container styles.
     */
    const containerStyle = useMemo((): React.CSSProperties => {
      const baseStyle: React.CSSProperties = {
        overflow: 'auto',
        scrollBehavior,
        ...style,
      };

      if (maxHeight !== undefined) {
        baseStyle.maxHeight = typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight;
      }

      if (hideScrollbar) {
        baseStyle.scrollbarWidth = 'none';
        // Note: For WebKit, use CSS class
      }

      if (scrollSnap) {
        baseStyle.scrollSnapType = `y ${scrollSnap.type}`;
      }

      return baseStyle;
    }, [style, maxHeight, hideScrollbar, scrollBehavior, scrollSnap]);

    /**
     * Computes class name with scrollbar hiding.
     */
    const computedClassName = useMemo(() => {
      const classes = [className];

      if (hideScrollbar) {
        classes.push('hide-scrollbar');
      }

      return classes.filter(Boolean).join(' ');
    }, [className, hideScrollbar]);

    /**
     * Renders virtualized content.
     */
    const renderVirtualized = useCallback(() => {
      if (!virtualize || !itemHeight || !scrollState) {
        return children;
      }

      const childArray = React.Children.toArray(children);
      const totalItems = childArray.length;
      const scrollTop = scrollState.scrollPosition.y;
      const containerHeight = scrollState.visibleDimensions.height;

      // Calculate visible range
      const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
      const visibleCount = Math.ceil(containerHeight / itemHeight);
      const endIndex = Math.min(totalItems, startIndex + visibleCount + overscan * 2);

      // Calculate offsets
      const offsetTop = startIndex * itemHeight;
      const totalHeight = totalItems * itemHeight;

      return (
        <div
          style={{
            height: totalHeight,
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: offsetTop,
              left: 0,
              right: 0,
            }}
          >
            {childArray.slice(startIndex, endIndex).map((child, index) => (
              <div
                key={startIndex + index}
                style={{
                  height: itemHeight,
                  scrollSnapAlign: scrollSnap?.align,
                }}
              >
                {child}
              </div>
            ))}
          </div>
        </div>
      );
    }, [virtualize, itemHeight, scrollState, children, overscan, scrollSnap]);

    return (
      <ScrollContainerContext.Provider value={scrollState as any}>
        <div
          ref={setRefs}
          className={computedClassName}
          style={containerStyle}
          data-testid={testId}
          data-scroll-container="true"
          data-scroll-direction={scrollState?.scrollDirection || 'none'}
        >
          {/* Scroll indicators */}
          {showScrollIndicators && (
            <>
              {indicators.top && <ScrollIndicator position="top" />}
              {indicators.bottom && <ScrollIndicator position="bottom" />}
              {indicators.left && <ScrollIndicator position="left" />}
              {indicators.right && <ScrollIndicator position="right" />}
            </>
          )}

          {/* Content */}
          {virtualize ? renderVirtualized() : children}
        </div>

        {/* CSS for hiding scrollbar in WebKit */}
        {hideScrollbar && (
          <style>
            {`
              .hide-scrollbar::-webkit-scrollbar {
                display: none;
              }
            `}
          </style>
        )}
      </ScrollContainerContext.Provider>
    );
  }
);

// ============================================================================
// Scroll Indicator Component
// ============================================================================

/**
 * Props for ScrollIndicator.
 */
interface ScrollIndicatorProps {
  position: 'top' | 'right' | 'bottom' | 'left';
}

/**
 * Visual indicator showing scroll direction availability.
 */
function ScrollIndicator({ position }: ScrollIndicatorProps): React.JSX.Element {
  const style: React.CSSProperties = {
    position: 'absolute',
    pointerEvents: 'none',
    zIndex: 1,
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.1), transparent)',
    ...(position === 'top' && {
      top: 0,
      left: 0,
      right: 0,
      height: '20px',
      background: 'linear-gradient(to bottom, rgba(0,0,0,0.1), transparent)',
    }),
    ...(position === 'bottom' && {
      bottom: 0,
      left: 0,
      right: 0,
      height: '20px',
      background: 'linear-gradient(to top, rgba(0,0,0,0.1), transparent)',
    }),
    ...(position === 'left' && {
      top: 0,
      bottom: 0,
      left: 0,
      width: '20px',
      background: 'linear-gradient(to right, rgba(0,0,0,0.1), transparent)',
    }),
    ...(position === 'right' && {
      top: 0,
      bottom: 0,
      right: 0,
      width: '20px',
      background: 'linear-gradient(to left, rgba(0,0,0,0.1), transparent)',
    }),
  };

  return <div style={style} data-scroll-indicator={position} />;
}

// ============================================================================
// Imperative Handle Hook
// ============================================================================

/**
 * Hook to get imperative scroll control methods.
 */
export function useScrollControl() {
  const scrollState = useScrollContainerContext();

  const scrollTo = useCallback(
    (options: { x?: number; y?: number; behavior?: 'auto' | 'smooth' }) => {
      if (scrollState?.element) {
        scrollState.element.scrollTo({
          left: options.x,
          top: options.y,
          behavior: options.behavior,
        });
      }
    },
    [scrollState]
  );

  const scrollBy = useCallback(
    (options: { x?: number; y?: number; behavior?: 'auto' | 'smooth' }) => {
      if (scrollState?.element) {
        scrollState.element.scrollBy({
          left: options.x,
          top: options.y,
          behavior: options.behavior,
        });
      }
    },
    [scrollState]
  );

  const scrollToTop = useCallback(
    (behavior: 'auto' | 'smooth' = 'smooth') => {
      scrollTo({ y: 0, behavior });
    },
    [scrollTo]
  );

  const scrollToBottom = useCallback(
    (behavior: 'auto' | 'smooth' = 'smooth') => {
      if (scrollState) {
        scrollTo({
          y: scrollState.scrollDimensions.height,
          behavior,
        });
      }
    },
    [scrollTo, scrollState]
  );

  return {
    scrollState,
    scrollTo,
    scrollBy,
    scrollToTop,
    scrollToBottom,
    isScrolling: scrollState?.isScrolling ?? false,
  scrollDirection: scrollState?.scrollDirection ?? 'none',
  scrollProgress: scrollState?.scrollProgress ?? { x: 0, y: 0 },
};
}