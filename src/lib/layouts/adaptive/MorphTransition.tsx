/**
 * @fileoverview MorphTransition Component
 *
 * A wrapper component that enables FLIP-based morphing transitions for its
 * children. Tracks element positions across renders and animates between
 * states using GPU-accelerated transforms.
 *
 * @module layouts/adaptive/MorphTransition
 * @version 1.0.0
 */

import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { LayoutRect, MorphTransitionConfig, MorphTransitionProps } from './types';
import { DEFAULT_MORPH_TRANSITION_CONFIG } from './types';
// import { createMorphController } from './morph-transition';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default initial animation state.
 */
const DEFAULT_INITIAL: Partial<LayoutRect> = {
  opacity: 0,
  scaleX: 0.95,
  scaleY: 0.95,
};

/**
 * Default animate state.
 */
const DEFAULT_ANIMATE: Partial<LayoutRect> = {
  opacity: 1,
  scaleX: 1,
  scaleY: 1,
};

/**
 * Default exit animation state.
 */
const DEFAULT_EXIT: Partial<LayoutRect> = {
  opacity: 0,
  scaleX: 0.95,
  scaleY: 0.95,
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Applies a layout rect as CSS transform and opacity.
 */
function applyLayoutRect(element: HTMLElement, rect: Partial<LayoutRect>): void {
  const transforms: string[] = [];

  if (rect.x !== undefined || rect.y !== undefined) {
    transforms.push(`translate3d(${rect.x ?? 0}px, ${rect.y ?? 0}px, 0)`);
  }

  if (rect.scaleX !== undefined || rect.scaleY !== undefined) {
    transforms.push(`scale(${rect.scaleX ?? 1}, ${rect.scaleY ?? 1})`);
  }

  if (rect.rotation !== undefined) {
    transforms.push(`rotate(${rect.rotation}deg)`);
  }

  if (transforms.length > 0) {
    element.style.transform = transforms.join(' ');
  }

  if (rect.opacity !== undefined) {
    element.style.opacity = String(rect.opacity);
  }
}

/**
 * Interpolates between two layout rect values.
 */
function interpolateRect(
  from: Partial<LayoutRect>,
  to: Partial<LayoutRect>,
  progress: number
): Partial<LayoutRect> {
  const lerp = (a: number | undefined, b: number | undefined, t: number): number | undefined => {
    if (a === undefined && b === undefined) return undefined;
    return (a ?? 0) + ((b ?? 0) - (a ?? 0)) * t;
  };

  return {
    x: lerp(from.x, to.x, progress),
    y: lerp(from.y, to.y, progress),
    width: lerp(from.width, to.width, progress),
    height: lerp(from.height, to.height, progress),
    scaleX: lerp(from.scaleX, to.scaleX, progress),
    scaleY: lerp(from.scaleY, to.scaleY, progress),
    rotation: lerp(from.rotation, to.rotation, progress),
    opacity: lerp(from.opacity, to.opacity, progress),
  };
}

/**
 * Easing function for animations.
 */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// =============================================================================
// MORPH TRANSITION COMPONENT
// =============================================================================

/**
 * MorphTransition enables FLIP-based morphing transitions for its child element.
 * It tracks the element's position across renders and animates between states.
 *
 * @example
 * ```tsx
 * // Basic usage with layout ID
 * <MorphTransition layoutId="card-1">
 *   <Card>{content}</Card>
 * </MorphTransition>
 *
 * // With enter/exit animations
 * <MorphTransition
 *   layoutId="modal"
 *   initial={{ opacity: 0, scaleX: 0.9, scaleY: 0.9 }}
 *   animate={{ opacity: 1, scaleX: 1, scaleY: 1 }}
 *   exit={{ opacity: 0, scaleX: 0.9, scaleY: 0.9 }}
 *   config={{ duration: 300, easing: 'ease-out' }}
 * >
 *   <Modal>{children}</Modal>
 * </MorphTransition>
 * ```
 */
export function MorphTransition({
  children,
  layoutId,
  config = {},
  present = true,
  initial = DEFAULT_INITIAL,
  animate = DEFAULT_ANIMATE,
  exit = DEFAULT_EXIT,
  className,
  style,
}: MorphTransitionProps): ReactNode {
  // Refs
  const elementRef = useRef<HTMLElement | null>(null);
  const previousRectRef = useRef<DOMRect | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // State
  const [isAnimating, setIsAnimating] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isVisible, setIsVisible] = useState(present);

  // Merged configuration
  const mergedConfig = useMemo<MorphTransitionConfig>(
    () => ({ ...DEFAULT_MORPH_TRANSITION_CONFIG, ...config }),
    [config]
  );

  // Cancel any running animation
  const cancelAnimation = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Run an animation
  const runAnimation = useCallback(
    (from: Partial<LayoutRect>, to: Partial<LayoutRect>, onComplete?: () => void) => {
      cancelAnimation();
      setIsAnimating(true);

      const startTime = performance.now();
      const duration = mergedConfig.duration;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime - mergedConfig.delay;

        if (elapsed < 0) {
          animationFrameRef.current = requestAnimationFrame(animate);
          return;
        }

        const rawProgress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutCubic(rawProgress);

        if (elementRef.current) {
          const currentRect = interpolateRect(from, to, easedProgress);
          applyLayoutRect(elementRef.current, currentRect);
        }

        if (rawProgress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
          onComplete?.();
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    },
    [cancelAnimation, mergedConfig.duration, mergedConfig.delay]
  );

  // Handle presence changes
  useEffect(() => {
    if (present && !isVisible) {
      // Enter animation
      setIsVisible(true);
      setIsExiting(false);

      // Apply initial state immediately
      if (elementRef.current) {
        applyLayoutRect(elementRef.current, initial);
      }

      // Animate to final state
      requestAnimationFrame(() => {
        runAnimation(initial, animate);
      });
    } else if (!present && isVisible && !isExiting) {
      // Exit animation
      setIsExiting(true);

      runAnimation(animate, exit, () => {
        setIsVisible(false);
        setIsExiting(false);
      });
    }
  }, [present, isVisible, isExiting, initial, animate, exit, runAnimation]);

  // FLIP animation for layout changes
  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element || !isVisible || isExiting) return;

    const currentRect = element.getBoundingClientRect();

    if (previousRectRef.current) {
      const prevRect = previousRectRef.current;

      // Check if position/size changed
      const dx = prevRect.x - currentRect.x;
      const dy = prevRect.y - currentRect.y;
      const dw = prevRect.width / currentRect.width;
      const dh = prevRect.height / currentRect.height;

      const hasChanged = Math.abs(dx) > 1 || Math.abs(dy) > 1 ||
        Math.abs(dw - 1) > 0.01 || Math.abs(dh - 1) > 0.01;

      if (hasChanged && mergedConfig.interruptible) {
        // Apply inverted transform
        element.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${dw}, ${dh})`;
        element.style.transition = 'none';

        // Force reflow
        element.offsetHeight;

        // Animate to identity
        element.style.transition = `transform ${mergedConfig.duration}ms ${mergedConfig.easing}`;
        element.style.transform = 'translate3d(0, 0, 0) scale(1, 1)';

        // Clean up after animation
        const cleanup = () => {
          element.style.transform = '';
          element.style.transition = '';
        };

        element.addEventListener('transitionend', cleanup, { once: true });
      }
    }

    previousRectRef.current = currentRect;
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimation();
    };
  }, [cancelAnimation]);

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  // Clone child with ref and layout ID
  const child = Children.only(children);
  if (!isValidElement(child)) {
    return child;
  }

  return cloneElement(child as ReactElement<{
    ref?: (el: HTMLElement | null) => void;
    'data-layout-id'?: string;
    'data-morph-animating'?: boolean;
    'data-morph-exiting'?: boolean;
    className?: string;
    style?: CSSProperties;
  }>, {
    ref: (el: HTMLElement | null) => {
      elementRef.current = el;
      // Forward ref if child has one
      const childRef = (child as ReactElement<{ ref?: (el: HTMLElement | null) => void }>).props.ref;
      if (typeof childRef === 'function') {
        childRef(el);
      }
    },
    'data-layout-id': layoutId,
    'data-morph-animating': isAnimating,
    'data-morph-exiting': isExiting,
    className: className ? `${(child.props as { className?: string }).className ?? ''} ${className}`.trim() : (child.props as { className?: string }).className,
    style: {
      ...(child.props as { style?: CSSProperties }).style,
      ...style,
      // Ensure GPU acceleration
      willChange: isAnimating ? 'transform, opacity' : undefined,
    },
  });
}

// =============================================================================
// ANIMATED PRESENCE
// =============================================================================

/**
 * Props for AnimatedPresence component.
 */
interface AnimatedPresenceProps {
  /** Children to animate */
  children: ReactNode;
  /** Whether to wait for exit animations before removing */
  exitBeforeEnter?: boolean;
  /** Callback when all exits are complete */
  onExitComplete?: () => void;
}

/**
 * AnimatedPresence enables exit animations for children when they're removed.
 *
 * @example
 * ```tsx
 * <AnimatedPresence>
 *   {isVisible && (
 *     <MorphTransition layoutId="item" exit={{ opacity: 0 }}>
 *       <Item />
 *     </MorphTransition>
 *   )}
 * </AnimatedPresence>
 * ```
 */
export function AnimatedPresence({
  children,
  exitBeforeEnter = false,
  onExitComplete,
}: AnimatedPresenceProps): ReactNode {
  const [presentChildren, setPresentChildren] = useState<ReactNode>(children);
  const [_exitingKeys, setExitingKeys] = useState<Set<string>>(new Set());
  const previousChildrenRef = useRef<ReactNode>(children);

  useEffect(() => {
    const previousChildren = previousChildrenRef.current;
    previousChildrenRef.current = children;

    // Get keys from current and previous children
    const currentKeys = new Set<string>();
    const previousKeys = new Set<string>();

    Children.forEach(children, (child) => {
      if (isValidElement(child) && child.key !== null) {
        currentKeys.add(String(child.key));
      }
    });

    Children.forEach(previousChildren, (child) => {
      if (isValidElement(child) && child.key !== null) {
        previousKeys.add(String(child.key));
      }
    });

    // Find exiting children
    const newExitingKeys = new Set<string>();
    for (const key of previousKeys) {
      if (!currentKeys.has(key)) {
        newExitingKeys.add(key);
      }
    }

    if (newExitingKeys.size > 0) {
      setExitingKeys(newExitingKeys);

      // Keep exiting children in the render
      const exitingChildren: ReactNode[] = [];
      Children.forEach(previousChildren, (child) => {
        if (isValidElement(child) && child.key !== null && newExitingKeys.has(String(child.key))) {
          // Clone with present=false to trigger exit animation
          exitingChildren.push(
            cloneElement(child as ReactElement<{ present?: boolean; key: string }>, {
              present: false,
              key: `exiting-${child.key}`,
            })
          );
        }
      });

      setPresentChildren(
        <>
          {exitBeforeEnter ? null : children}
          {exitingChildren}
        </>
      );

      // Remove exiting children after animation
      const duration = 300; // Default duration
      setTimeout(() => {
        setExitingKeys(new Set());
        setPresentChildren(children);
        onExitComplete?.();
      }, duration + 50);
    } else {
      setPresentChildren(children);
    }
  }, [children, exitBeforeEnter, onExitComplete]);

  return presentChildren;
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { MorphTransitionProps, AnimatedPresenceProps };
