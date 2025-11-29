/**
 * @fileoverview useViewportPosition Hook
 *
 * Provides element position information relative to the viewport.
 *
 * @module layouts/context-aware/hooks/useViewportPosition
 * @author Agent 4 - PhD Context Systems Expert
 * @version 1.0.0
 */

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';

import type {
  ViewportPosition,
  VisibilityState,
  UseViewportPositionReturn,
  ViewportInfo,
} from '../types';
import { useDOMContextValue } from '../DOMContextProvider';
import {
  getViewportTracker,
  getDistanceFromViewportCenter,
  type VisibilityChangeCallback,
} from '../viewport-awareness';

// ============================================================================
// useViewportPosition Hook
// ============================================================================

/**
 * Hook to track an element's position relative to the viewport.
 *
 * @remarks
 * This hook provides comprehensive information about an element's
 * position in the viewport, including visibility state, intersection
 * ratio, and distance from viewport edges.
 *
 * @returns Viewport position information and utilities
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const {
 *     position,
 *     isVisible,
 *     isFullyVisible,
 *     visibility,
 *     ref,
 *     scrollIntoView,
 *   } = useViewportPosition();
 *
 *   return (
 *     <div ref={ref}>
 *       {isVisible && <span>I'm visible!</span>}
 *       {!isFullyVisible && (
 *         <button onClick={() => scrollIntoView()}>
 *           Scroll into view
 *         </button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useViewportPosition(): UseViewportPositionReturn {
  const elementRef = useRef<HTMLElement>(null);
  const unobserveRef = useRef<(() => void) | null>(null);

  const [position, setPosition] = useState<ViewportPosition | null>(null);

  const context = useDOMContextValue();
  const {isSSR} = context;

  /**
   * Handles visibility changes.
   */
  const handleVisibilityChange = useCallback<VisibilityChangeCallback>(
    (_element, newPosition) => {
      setPosition(newPosition);
    },
    []
  );

  // Set up visibility observation
  useEffect(() => {
    if ((isSSR === true) || !elementRef.current) {
      return;
    }

    const tracker = getViewportTracker();
    unobserveRef.current = tracker.observeVisibility(
      elementRef.current,
      handleVisibilityChange,
      {
        thresholds: [0, 0.25, 0.5, 0.75, 1],
        trackPosition: true,
      }
    );

    return () => {
      if (unobserveRef.current) {
        unobserveRef.current();
        unobserveRef.current = null;
      }
    };
  }, [isSSR, handleVisibilityChange]);

  /**
   * Scrolls the element into view.
   */
  const scrollIntoView = useCallback(
    (options?: ScrollIntoViewOptions) => {
      if (elementRef.current) {
        elementRef.current.scrollIntoView(
          options ?? { behavior: 'smooth', block: 'center' }
        );
      }
    },
    []
  );

  // Compute derived values
  const isVisible = (position?.visibility === 'visible') || (position?.visibility === 'partial');
  const isFullyVisible = position?.visibility === 'visible';
  const visibility = position?.visibility ?? 'unknown';

  return {
    position,
    isVisible,
    isFullyVisible,
    visibility,
    ref: elementRef,
    scrollIntoView,
  };
}

// ============================================================================
// Specialized Viewport Hooks
// ============================================================================

/**
 * Hook to track visibility state only (optimized for performance).
 *
 * @returns Visibility state
 *
 * @example
 * ```tsx
 * function LazyImage({ src }: { src: string }) {
 *   const { isVisible, ref } = useVisibility();
 *
 *   return (
 *     <div ref={ref}>
 *       {isVisible ? <img src={src} /> : <Placeholder />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useVisibility(): {
  isVisible: boolean;
  isFullyVisible: boolean;
  visibility: VisibilityState;
  ref: { readonly current: HTMLElement | null };
} {
  const { isVisible, isFullyVisible, visibility, ref } = useViewportPosition();
  return { isVisible, isFullyVisible, visibility, ref };
}

/**
 * Hook to get intersection ratio with the viewport.
 *
 * @returns Intersection ratio (0-1) and ref
 *
 * @example
 * ```tsx
 * function AnimatedElement() {
 *   const { ratio, ref } = useIntersectionRatio();
 *
 *   return (
 *     <div
 *       ref={ref}
 *       style={{ opacity: ratio, transform: `scale(${0.5 + ratio * 0.5})` }}
 *     >
 *       Animated content
 *     </div>
 *   );
 * }
 * ```
 */
export function useIntersectionRatio(): {
  ratio: number;
  ref: { readonly current: HTMLElement | null };
} {
  const { position, ref } = useViewportPosition();
  const ratio = position?.intersectionRatio ?? 0;
  return { ratio, ref };
}

/**
 * Hook to track distance from viewport edges.
 *
 * @returns Distance object and ref
 *
 * @example
 * ```tsx
 * function DistanceDisplay() {
 *   const { distance, ref } = useDistanceFromViewport();
 *
 *   return (
 *     <div ref={ref}>
 *       Top: {distance?.top}px, Bottom: {distance?.bottom}px
 *     </div>
 *   );
 * }
 * ```
 */
export function useDistanceFromViewport(): {
  distance: ViewportPosition['distanceFromViewport'] | null;
  ref: { readonly current: HTMLElement | null };
} {
  const { position, ref } = useViewportPosition();
  const distance = position?.distanceFromViewport ?? null;
  return { distance, ref };
}

/**
 * Hook to track distance from viewport center.
 *
 * @returns Distance from center and ref
 *
 * @example
 * ```tsx
 * function CenterFocusedElement() {
 *   const { distanceFromCenter, ref } = useDistanceFromCenter();
 *
 *   // Scale based on proximity to center
 *   const scale = Math.max(0.5, 1 - (distanceFromCenter / 500) * 0.5);
 *
 *   return (
 *     <div ref={ref} style={{ transform: `scale(${scale})` }}>
 *       Focus me!
 *     </div>
 *   );
 * }
 * ```
 */
export function useDistanceFromCenter(): {
  distanceFromCenter: number;
  ref: { readonly current: HTMLElement | null };
} {
  const elementRef = useRef<HTMLElement | null>(null);
  const context = useDOMContextValue();
  const [distanceFromCenter, setDistanceFromCenter] = useState(Infinity);

  useEffect(() => {
    if ((context.isSSR === true) || !elementRef.current) {
      return;
    }

    const updateDistance = (): void => {
      if (elementRef.current) {
        setDistanceFromCenter(getDistanceFromViewportCenter(elementRef.current));
      }
    };

    updateDistance();

    // Update on scroll/resize
    const tracker = getViewportTracker();
    const unsubscribe = tracker.onViewportChange(updateDistance);

    return unsubscribe;
  }, [context.isSSR, context.lastUpdated]);

  return { distanceFromCenter, ref: elementRef };
}

// ============================================================================
// Viewport Info Hooks
// ============================================================================

/**
 * Hook to get current viewport information.
 *
 * @returns Viewport info
 *
 * @example
 * ```tsx
 * function ViewportDisplay() {
 *   const viewport = useViewport();
 *
 *   return (
 *     <div>
 *       {viewport.width}x{viewport.height}
 *       {viewport.orientation === 'portrait' && ' (Portrait)'}
 *     </div>
 *   );
 * }
 * ```
 */
export function useViewport(): ViewportInfo {
  const context = useDOMContextValue();
  return context.viewport;
}

/**
 * Hook to get viewport dimensions.
 *
 * @returns Viewport width and height
 *
 * @example
 * ```tsx
 * function ResponsiveComponent() {
 *   const { width, height } = useViewportDimensions();
 *
 *   if (width < 768) {
 *     return <MobileLayout />;
 *   }
 *
 *   return <DesktopLayout />;
 * }
 * ```
 */
export function useViewportDimensions(): { width: number; height: number } {
  const viewport = useViewport();
  return useMemo(
    () => ({ width: viewport.width, height: viewport.height }),
    [viewport.width, viewport.height]
  );
}

/**
 * Hook to get viewport scroll position.
 *
 * @returns Scroll x and y positions
 *
 * @example
 * ```tsx
 * function ScrollProgress() {
 *   const { scrollY } = useViewportScroll();
 *   const viewport = useViewport();
 *
 *   const progress = scrollY / (viewport.scrollHeight - viewport.height);
 *
 *   return <ProgressBar value={progress} />;
 * }
 * ```
 */
export function useViewportScroll(): { scrollX: number; scrollY: number } {
  const viewport = useViewport();
  return useMemo(
    () => ({ scrollX: viewport.scrollX, scrollY: viewport.scrollY }),
    [viewport.scrollX, viewport.scrollY]
  );
}

/**
 * Hook to check if on a touch device.
 *
 * @returns Whether device supports touch
 *
 * @example
 * ```tsx
 * function InteractiveElement() {
 *   const isTouch = useIsTouch();
 *
 *   return (
 *     <div
 *       onMouseEnter={!isTouch ? handleHover : undefined}
 *       onTouchStart={isTouch ? handleTouch : undefined}
 *     >
 *       Interact with me
 *     </div>
 *   );
 * }
 * ```
 */
export function useIsTouch(): boolean {
  const viewport = useViewport();
  return viewport.isTouch;
}

/**
 * Hook to get device orientation.
 *
 * @returns Current orientation
 *
 * @example
 * ```tsx
 * function OrientationAware() {
 *   const orientation = useOrientation();
 *
 *   return (
 *     <div className={`layout-${orientation}`}>
 *       Current: {orientation}
 *     </div>
 *   );
 * }
 * ```
 */
export function useOrientation(): 'portrait' | 'landscape' {
  const viewport = useViewport();
  return viewport.orientation;
}

/**
 * Hook to get safe area insets.
 *
 * @returns Safe area insets
 *
 * @example
 * ```tsx
 * function SafeContainer({ children }) {
 *   const safeArea = useSafeAreaInsets();
 *
 *   return (
 *     <div
 *       style={{
 *         paddingTop: safeArea.top,
 *         paddingBottom: safeArea.bottom,
 *         paddingLeft: safeArea.left,
 *         paddingRight: safeArea.right,
 *       }}
 *     >
 *       {children}
 *     </div>
 *   );
 * }
 * ```
 */
export function useSafeAreaInsets(): ViewportInfo['safeAreaInsets'] {
const viewport = useViewport();
return viewport.safeAreaInsets;
}