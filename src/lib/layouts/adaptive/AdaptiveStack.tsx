/**
 * @fileoverview AdaptiveStack Component
 *
 * A morphing stack layout component that automatically switches between
 * horizontal and vertical layouts based on available space or explicit
 * configuration. Supports smooth transitions between orientations.
 *
 * @module layouts/adaptive/AdaptiveStack
 * @version 1.0.0
 */

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { AdaptiveStackProps } from './types.ts';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default breakpoint for responsive direction switch (768px).
 */
const DEFAULT_BREAKPOINT = 768;

/**
 * Default gap between items.
 */
const DEFAULT_GAP = 16;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Maps justify prop values to CSS justify-content values.
 */
function mapJustify(justify: AdaptiveStackProps['justify']): string {
  switch (justify) {
    case 'start':
      return 'flex-start';
    case 'center':
      return 'center';
    case 'end':
      return 'flex-end';
    case 'between':
      return 'space-between';
    case 'around':
      return 'space-around';
    case 'evenly':
      return 'space-evenly';
    default:
      return 'flex-start';
  }
}

/**
 * Maps align prop values to CSS align-items values.
 */
function mapAlign(align: AdaptiveStackProps['align']): string {
  switch (align) {
    case 'start':
      return 'flex-start';
    case 'center':
      return 'center';
    case 'end':
      return 'flex-end';
    case 'stretch':
      return 'stretch';
    default:
      return 'stretch';
  }
}

/**
 * Generates a unique item ID.
 */
function generateItemId(index: number): string {
  return `stack-item-${index}`;
}

// =============================================================================
// ADAPTIVE STACK COMPONENT
// =============================================================================

/**
 * AdaptiveStack is a layout component that automatically manages stacking
 * direction based on available space or explicit configuration.
 *
 * @example
 * ```tsx
 * // Responsive stack that switches at 768px
 * <AdaptiveStack direction="responsive" gap={20}>
 *   <Card>Item 1</Card>
 *   <Card>Item 2</Card>
 *   <Card>Item 3</Card>
 * </AdaptiveStack>
 *
 * // Horizontal stack with space-between
 * <AdaptiveStack direction="horizontal" justify="between" align="center">
 *   <Logo />
 *   <Navigation />
 *   <Actions />
 * </AdaptiveStack>
 * ```
 */
export function AdaptiveStack({
  children,
  direction = 'vertical',
  breakpoint = DEFAULT_BREAKPOINT,
  gap = DEFAULT_GAP,
  align = 'stretch',
  justify = 'start',
  wrap = false,
  className,
  style,
}: AdaptiveStackProps): ReactNode {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);

  // State
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Calculate effective direction based on container width
  const effectiveDirection = useMemo(() => {
    if (direction !== 'responsive') return direction;
    return containerWidth >= breakpoint ? 'horizontal' : 'vertical';
  }, [direction, containerWidth, breakpoint]);

  // Track previous direction for transitions
  const previousDirectionRef = useRef(effectiveDirection);

  // Observe container size for responsive behavior
  useEffect(() => {
    if (direction !== 'responsive') return;

    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const [entry] = entries;
      if (entry !== undefined) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(container);

    return () => observer.disconnect();
  }, [direction]);

  // Handle direction transitions
  // Use layout effect to ensure state updates happen synchronously before paint
  useLayoutEffect(() => {
    if (effectiveDirection !== previousDirectionRef.current) {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      // Use requestAnimationFrame to defer state update after render
      const frameId = requestAnimationFrame(() => {
        setIsTransitioning(true);

        // Reset transition state after animation
        timeoutId = setTimeout(() => {
          setIsTransitioning(false);
          previousDirectionRef.current = effectiveDirection;
        }, 300); // Match transition duration
      });

      return () => {
        cancelAnimationFrame(frameId);
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
        }
      };
    }
    return undefined;
  }, [effectiveDirection]);

  // Container styles
  const containerStyles = useMemo<CSSProperties>(() => {
    const baseStyles: CSSProperties = {
      display: 'flex',
      flexDirection: effectiveDirection === 'horizontal' ? 'row' : 'column',
      justifyContent: mapJustify(justify),
      alignItems: mapAlign(align),
      gap: `${gap}px`,
      flexWrap: wrap ? 'wrap' : 'nowrap',
      width: '100%',
      // Smooth transition for direction changes
      transition: isTransitioning ? 'all 0.3s ease-out' : undefined,
      ...style,
    };

    return baseStyles;
  }, [effectiveDirection, justify, align, gap, wrap, isTransitioning, style]);

  // Render children with layout IDs
  const renderedChildren = useMemo(() => {
    return Children.map(children, (child, index): ReactNode => {
      if (!isValidElement(child)) return child;

      const itemId = generateItemId(index);

      return cloneElement(
        child as ReactElement<{ 'data-layout-id'?: string; style?: CSSProperties }>,
        {
          'data-layout-id': itemId,
          style: {
            ...(child.props as { style?: CSSProperties }).style,
            // Add transition for child items during direction change
            transition: isTransitioning ? 'all 0.3s ease-out' : undefined,
          },
        }
      );
    });
  }, [children, isTransitioning]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={containerStyles}
      data-adaptive-stack
      data-direction={effectiveDirection}
      data-transitioning={isTransitioning}
    >
      {renderedChildren}
    </div>
  );
}

// =============================================================================
// SPECIALIZED STACK VARIANTS
// =============================================================================

/**
 * HStack is a horizontal adaptive stack.
 */
export function HStack(props: Omit<AdaptiveStackProps, 'direction'>): ReactNode {
  return <AdaptiveStack {...props} direction="horizontal" />;
}

/**
 * VStack is a vertical adaptive stack.
 */
export function VStack(props: Omit<AdaptiveStackProps, 'direction'>): ReactNode {
  return <AdaptiveStack {...props} direction="vertical" />;
}

/**
 * ResponsiveStack automatically switches between horizontal and vertical.
 */
export function ResponsiveStack(props: Omit<AdaptiveStackProps, 'direction'>): ReactNode {
  return <AdaptiveStack {...props} direction="responsive" />;
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { AdaptiveStackProps };
