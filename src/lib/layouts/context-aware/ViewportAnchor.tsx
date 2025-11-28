/**
 * @fileoverview Viewport Anchor Component
 *
 * A component that tracks its position relative to the viewport
 * and provides visibility state information.
 *
 * Features:
 * - Tracks visibility in viewport
 * - Supports sticky positioning
 * - Emits position change events
 * - Configurable intersection thresholds
 *
 * @module layouts/context-aware/ViewportAnchor
 * @author Agent 4 - PhD Context Systems Expert
 * @version 1.0.0
 */

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
  forwardRef,
} from 'react';

import type {
  ViewportPosition,
  VisibilityState,
  ViewportAnchorProps,
} from './types';
import {
  getViewportTracker,
  type VisibilityChangeCallback,
} from './viewport-awareness';

// ============================================================================
// Types
// ============================================================================

/**
 * Extended viewport anchor props.
 */
export interface ExtendedViewportAnchorProps extends ViewportAnchorProps {
  /** Root margin for intersection observer */
  rootMargin?: string;
  /** Whether to track position continuously */
  trackContinuously?: boolean;
  /** Callback when element enters viewport */
  onEnterViewport?: () => void;
  /** Callback when element exits viewport */
  onExitViewport?: () => void;
  /** Whether to unobserve after first intersection */
  triggerOnce?: boolean;
}

/**
 * Anchor state for tracking visibility.
 */
interface AnchorState {
  position: ViewportPosition | null;
  visibility: VisibilityState;
  isSticky: boolean;
  hasEnteredViewport: boolean;
}

// ============================================================================
// ViewportAnchor Component
// ============================================================================

/**
 * A component that anchors to the viewport and tracks its position.
 *
 * @remarks
 * This component is useful for implementing lazy loading,
 * scroll animations, sticky headers, and other viewport-aware features.
 *
 * @example
 * ```tsx
 * // Basic visibility tracking
 * <ViewportAnchor
 *   onVisibilityChange={(visibility) => {
 *     console.log('Visibility:', visibility);
 *   }}
 * >
 *   <Content />
 * </ViewportAnchor>
 *
 * // With sticky behavior
 * <ViewportAnchor
 *   sticky={{ enabled: true, offset: 0, edge: 'top' }}
 *   onPositionChange={(position) => {
 *     console.log('Position:', position);
 *   }}
 * >
 *   <Header />
 * </ViewportAnchor>
 *
 * // Lazy loading trigger
 * <ViewportAnchor
 *   onEnterViewport={() => loadMoreContent()}
 *   triggerOnce
 * >
 *   <LoadingPlaceholder />
 * </ViewportAnchor>
 * ```
 */
export const ViewportAnchor = forwardRef<HTMLDivElement, ExtendedViewportAnchorProps>(
  (
    {
      children,
      className,
      style,
      anchor = 'top',
      sticky,
      onVisibilityChange,
      onPositionChange,
      intersectionThreshold = [0, 0.5, 1],
      rootMargin = '0px',
      trackContinuously = false,
      onEnterViewport,
      onExitViewport,
      triggerOnce = false,
      'data-testid': testId,
    },
    forwardedRef
  ) => {
    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const unobserveRef = useRef<(() => void) | null>(null);
    const hasTriggeredRef = useRef(false);

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
    const [state, setState] = useState<AnchorState>({
      position: null,
      visibility: 'unknown',
      isSticky: false,
      hasEnteredViewport: false,
    });

    // Track previous visibility for enter/exit callbacks
    const prevVisibilityRef = useRef<VisibilityState>('unknown');

    // Check SSR
    const isSSR = typeof window === 'undefined';

    /**
     * Handles visibility changes from the tracker.
     */
    const handleVisibilityChange = useCallback<VisibilityChangeCallback>(
      (_element, position) => {
        const prevVisibility = prevVisibilityRef.current;
        const newVisibility = position.visibility;

        // Update state
        setState((prev) => ({
          ...prev,
          position,
          visibility: newVisibility,
          hasEnteredViewport: prev.hasEnteredViewport || newVisibility !== 'hidden',
        }));

        // Call visibility change callback
        if (newVisibility !== prevVisibility) {
          onVisibilityChange?.(newVisibility);

          // Handle enter/exit viewport
          if (
            (prevVisibility === 'hidden' || prevVisibility === 'unknown') &&
            (newVisibility === 'visible' || newVisibility === 'partial')
          ) {
            if (!triggerOnce || !hasTriggeredRef.current) {
              onEnterViewport?.();
              hasTriggeredRef.current = true;
            }
          } else if (
            (prevVisibility === 'visible' || prevVisibility === 'partial') &&
            newVisibility === 'hidden'
          ) {
            if (!triggerOnce) {
              onExitViewport?.();
            }
          }

          prevVisibilityRef.current = newVisibility;
        }

        // Call position change callback
        onPositionChange?.(position);

        // Unobserve if triggerOnce and has entered
        if (triggerOnce && hasTriggeredRef.current && unobserveRef.current) {
          unobserveRef.current();
          unobserveRef.current = null;
        }
      },
      [onVisibilityChange, onPositionChange, onEnterViewport, onExitViewport, triggerOnce]
    );

    /**
     * Sets up sticky behavior.
     */
    const handleStickyBehavior = useCallback(() => {
      if (sticky?.enabled !== true || !containerRef.current || isSSR) {
        return;
      }

      const element = containerRef.current;
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const isSticky = !entry.isIntersecting;
            setState((prev) => ({ ...prev, isSticky }));
          });
        },
        {
          threshold: [1],
          rootMargin: `-${sticky.offset ?? 0}px 0px 0px 0px`,
        }
      );

      // Create sentinel element for sticky detection
      const sentinel = document.createElement('div');
      sentinel.style.cssText = 'position: absolute; top: 0; height: 1px; width: 100%; pointer-events: none;';
      element.parentElement?.insertBefore(sentinel, element);

      observer.observe(sentinel);

      return () => {
        observer.disconnect();
        sentinel.remove();
      };
    }, [sticky, isSSR]);

    // Set up visibility observation
    useEffect(() => {
      if (isSSR || !containerRef.current) {
        return;
      }

      const tracker = getViewportTracker();
      const unobserve = tracker.observeVisibility(
        containerRef.current,
        handleVisibilityChange,
        {
          thresholds: Array.isArray(intersectionThreshold)
            ? intersectionThreshold
            : [intersectionThreshold],
          rootMargin,
          trackPosition: trackContinuously,
        }
      );

      unobserveRef.current = unobserve;

      return () => {
        unobserve();
        unobserveRef.current = null;
      };
    }, [isSSR, handleVisibilityChange, intersectionThreshold, rootMargin, trackContinuously]);

    // Set up sticky behavior
    useEffect(() => {
      return handleStickyBehavior();
    }, [handleStickyBehavior]);

    /**
     * Computes container styles.
     */
    const containerStyle = useMemo((): React.CSSProperties => {
      const baseStyle: React.CSSProperties = { ...style };

      if (sticky?.enabled) {
        baseStyle.position = 'sticky';
        baseStyle[sticky.edge || 'top'] = sticky.offset || 0;

        if (state.isSticky && sticky.zIndex !== undefined) {
          baseStyle.zIndex = sticky.zIndex;
        }
      }

      return baseStyle;
    }, [style, sticky, state.isSticky]);

    /**
     * Computes data attributes.
     */
    const dataAttributes = useMemo((): Record<string, string> => {
      const attrs: Record<string, string> = {
        'data-viewport-anchor': 'true',
        'data-anchor-point': anchor,
        'data-visibility': state.visibility,
      };

      if (sticky?.enabled) {
        attrs['data-sticky'] = String(state.isSticky);
      }

      if (state.hasEnteredViewport) {
        attrs['data-has-entered-viewport'] = 'true';
      }

      return attrs;
    }, [anchor, state.visibility, state.isSticky, state.hasEnteredViewport, sticky]);

    return (
      <div
        ref={setRefs}
        className={className}
        style={containerStyle}
        data-testid={testId}
        {...dataAttributes}
      >
        {children}
      </div>
    );
  }
);

// ============================================================================
// Specialized Viewport Components
// ============================================================================

/**
 * Props for LazyLoad component.
 */
export interface LazyLoadProps {
  /** Content to load when visible */
  children: React.ReactNode;
  /** Placeholder while not visible */
  placeholder?: React.ReactNode;
  /** Root margin for early loading */
  rootMargin?: string;
  /** Whether content has been loaded */
  onLoad?: () => void;
  /** Minimum height to prevent layout shift */
  minHeight?: number | string;
  /** Optional className */
  className?: string;
  /** Optional style */
  style?: React.CSSProperties;
}

/**
 * Lazy loading component using viewport detection.
 *
 * @example
 * ```tsx
 * <LazyLoad
 *   placeholder={<Skeleton />}
 *   rootMargin="200px"
 *   onLoad={() => console.log('Loaded!')}
 * >
 *   <HeavyComponent />
 * </LazyLoad>
 * ```
 */
export function LazyLoad({
  children,
  placeholder = null,
  rootMargin = '100px',
  onLoad,
  minHeight,
  className,
  style,
}: LazyLoadProps): React.JSX.Element {
  const [isLoaded, setIsLoaded] = useState(false);

  const handleEnterViewport = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const containerStyle: React.CSSProperties = {
    ...style,
    minHeight: minHeight !== undefined
      ? typeof minHeight === 'number' ? `${minHeight}px` : minHeight
      : undefined,
  };

  return (
    <ViewportAnchor
      className={className}
      style={containerStyle}
      onEnterViewport={handleEnterViewport}
      rootMargin={rootMargin}
      triggerOnce
    >
      {isLoaded ? children : placeholder}
    </ViewportAnchor>
  );
}

/**
 * Props for StickyHeader component.
 */
export interface StickyHeaderProps {
  children: React.ReactNode;
  /** Offset from top when sticky */
  offset?: number;
  /** Z-index when sticky */
  zIndex?: number;
  /** Callback when sticky state changes */
  onStickyChange?: (isSticky: boolean) => void;
  /** Optional className */
  className?: string;
  /** Optional style */
  style?: React.CSSProperties;
}

/**
 * Sticky header component with state tracking.
 *
 * @example
 * ```tsx
 * <StickyHeader
 *   offset={0}
 *   zIndex={100}
 *   onStickyChange={(sticky) => console.log('Sticky:', sticky)}
 * >
 *   <Header />
 * </StickyHeader>
 * ```
 */
export function StickyHeader({
  children,
  offset = 0,
  zIndex = 100,
  onStickyChange,
  className,
  style,
}: StickyHeaderProps): React.JSX.Element {
  const handleVisibilityChange = useCallback(
    (visibility: VisibilityState) => {
      // Sticky when partially visible (top is outside viewport)
      const isSticky = visibility === 'partial';
      onStickyChange?.(isSticky);
    },
    [onStickyChange]
  );

  return (
    <ViewportAnchor
      className={className}
      style={style}
      sticky={{
        enabled: true,
        offset,
        edge: 'top',
        zIndex,
      }}
      onVisibilityChange={handleVisibilityChange}
    >
      {children}
    </ViewportAnchor>
  );
}

/**
 * Props for ScrollTrigger component.
 */
export interface ScrollTriggerProps {
  /** Callback when triggered */
  onTrigger: () => void;
  /** Threshold for triggering (0-1) */
  threshold?: number;
  /** Root margin */
  rootMargin?: string;
  /** Whether to trigger only once */
  triggerOnce?: boolean;
  /** Visual indicator (optional) */
  indicator?: React.ReactNode;
  /** Optional className */
  className?: string;
}

/**
 * Scroll trigger component for infinite scroll or animations.
 *
 * @example
 * ```tsx
 * // Infinite scroll
 * <ScrollTrigger
 *   onTrigger={loadMoreItems}
 *   rootMargin="200px"
 * />
 *
 * // Animation trigger
 * <ScrollTrigger
 *   onTrigger={() => setAnimate(true)}
 *   threshold={0.5}
 *   triggerOnce
 * />
 * ```
 */
export function ScrollTrigger({
  onTrigger,
  threshold = 0,
  rootMargin = '0px',
  triggerOnce = false,
  indicator,
  className,
}: ScrollTriggerProps): React.JSX.Element {
  return (
    <ViewportAnchor
      className={className}
      style={{ height: 1 }}
      intersectionThreshold={threshold}
      rootMargin={rootMargin}
      onEnterViewport={onTrigger}
      triggerOnce={triggerOnce}
    >
    {indicator}
  </ViewportAnchor>
);
}