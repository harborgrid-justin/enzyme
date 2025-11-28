/**
 * @fileoverview AdaptiveContainer Component
 *
 * An intelligent container component that provides container query support,
 * content density detection, and adaptive spacing. Acts as a foundation for
 * building responsive layouts without viewport-based breakpoints.
 *
 * @module layouts/adaptive/AdaptiveContainer
 * @version 1.0.0
 */

import {
  Children,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { ContainerContext, type ContainerContextValue } from '../../contexts/ContainerContext.ts';
import type { AdaptiveContainerProps, BoxSpacing, ContainerBreakpoints, ContentDensity, Dimensions } from './types.ts';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default container breakpoints.
 */
const DEFAULT_BREAKPOINTS: ContainerBreakpoints = {
  xs: 320,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

/**
 * Default padding.
 */
const DEFAULT_PADDING = 16;

/**
 * Density thresholds (items per 10000 square pixels).
 */
const DENSITY_THRESHOLDS = {
  minimal: 0.5,
  low: 1,
  medium: 2,
  high: 4,
  extreme: 8,
} as const;

// =============================================================================
// CONTEXT
// =============================================================================

/**
 * Hook to access container context.
 */
export function useContainerContext() {
  return useContext(ContainerContext);
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Determines size category based on width and breakpoints.
 */
function getSizeCategory(width: number, breakpoints: ContainerBreakpoints): keyof ContainerBreakpoints {
  const { xs = 320, sm = 480, md = 768, lg = 1024, xl = 1280 } = breakpoints;

  if (width < xs) return 'xs';
  if (width < sm) return 'xs';
  if (width < md) return 'sm';
  if (width < lg) return 'md';
  if (width < xl) return 'lg';
  return 'xl';
}

/**
 * Calculates content density based on child count and container area.
 */
function calculateDensity(childCount: number, dimensions: Dimensions): ContentDensity {
  if (childCount === 0) return 'minimal';

  const area = dimensions.width * dimensions.height;
  if (area === 0) return 'minimal';

  // Calculate items per 10000 square pixels
  const densityRatio = (childCount / area) * 10000;

  if (densityRatio <= DENSITY_THRESHOLDS.minimal) return 'minimal';
  if (densityRatio <= DENSITY_THRESHOLDS.low) return 'low';
  if (densityRatio <= DENSITY_THRESHOLDS.medium) return 'medium';
  if (densityRatio <= DENSITY_THRESHOLDS.high) return 'high';
  return 'extreme';
}

/**
 * Normalizes padding to BoxSpacing format.
 */
function normalizePadding(padding: number | BoxSpacing): BoxSpacing {
  if (typeof padding === 'number') {
    return { top: padding, right: padding, bottom: padding, left: padding };
  }
  return padding;
}

/**
 * Generates CSS padding string from BoxSpacing.
 */
function paddingToCSS(spacing: BoxSpacing): string {
  return `${spacing.top}px ${spacing.right}px ${spacing.bottom}px ${spacing.left}px`;
}

// =============================================================================
// ADAPTIVE CONTAINER COMPONENT
// =============================================================================

/**
 * AdaptiveContainer is an intelligent container component that provides
 * container-based responsive behavior and content density detection.
 * Memoized for performance optimization.
 *
 * @example
 * ```tsx
 * <AdaptiveContainer
 *   breakpoints={{ sm: 400, md: 600, lg: 800 }}
 *   detectDensity
 *   padding={24}
 *   maxWidth={1200}
 *   centered
 * >
 *   {({ sizeCategory, density }) => (
 *     <div>
 *       Current size: {sizeCategory}, Density: {density}
 *     </div>
 *   )}
 * </AdaptiveContainer>
 * ```
 */
export const AdaptiveContainer = memo(function AdaptiveContainer({
  children,
  breakpoints = DEFAULT_BREAKPOINTS,
  detectDensity = true,
  padding = DEFAULT_PADDING,
  maxWidth,
  centered = false,
  className,
  style,
}: AdaptiveContainerProps): ReactNode {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);

  // State
  const [dimensions, setDimensions] = useState<Dimensions>({ width: 0, height: 0 });

  // Normalize padding
  const normalizedPadding = useMemo(() => normalizePadding(padding), [padding]);

  // Calculate derived values
  const sizeCategory = useMemo(
    () => getSizeCategory(dimensions.width, breakpoints),
    [dimensions.width, breakpoints]
  );

  const childCount = useMemo(() => Children.count(children), [children]);

  const density = useMemo(
    () => (detectDensity ? calculateDensity(childCount, dimensions) : 'medium'),
    [detectDensity, childCount, dimensions]
  );

  const isNarrow = sizeCategory === 'xs' || sizeCategory === 'sm';
  const isWide = sizeCategory === 'lg' || sizeCategory === 'xl';

  // Observe container size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  // Context value
  const contextValue = useMemo<ContainerContextValue>(
    () => ({
      containerWidth: dimensions.width,
      containerHeight: dimensions.height,
      breakpoints: {
        sm: breakpoints.sm ?? (DEFAULT_BREAKPOINTS.sm as number),
        md: breakpoints.md ?? (DEFAULT_BREAKPOINTS.md as number),
        lg: breakpoints.lg ?? (DEFAULT_BREAKPOINTS.lg as number),
        xl: breakpoints.xl ?? (DEFAULT_BREAKPOINTS.xl as number),
      },
      matchesQuery: (query: keyof ContainerBreakpoints | number) => {
        if (typeof query === 'number') {
          return dimensions.width >= query;
        }
        const breakpointValue = breakpoints[query];
        return breakpointValue !== undefined && dimensions.width >= breakpointValue;
      },
      isAbove: (query: keyof ContainerBreakpoints | number) => {
        if (typeof query === 'number') {
          return dimensions.width > query;
        }
        const breakpointValue = breakpoints[query];
        return breakpointValue !== undefined && dimensions.width > breakpointValue;
      },
      isBelow: (query: keyof ContainerBreakpoints | number) => {
        if (typeof query === 'number') {
          return dimensions.width < query;
        }
        const breakpointValue = breakpoints[query];
        return breakpointValue !== undefined && dimensions.width < breakpointValue;
      },
    }),
    [dimensions, breakpoints]
  );

  // Container styles
  const containerStyles = useMemo<CSSProperties>(() => {
    const baseStyles: CSSProperties = {
      width: '100%',
      padding: paddingToCSS(normalizedPadding),
      boxSizing: 'border-box',
      // Enable container queries via CSS containment
      containerType: 'inline-size',
      ...style,
    };

    if (maxWidth) {
      baseStyles.maxWidth = typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth;
    }

    if (centered) {
      baseStyles.marginLeft = 'auto';
      baseStyles.marginRight = 'auto';
    }

    // Adjust padding based on size category for better mobile experience
    if (isNarrow) {
      const reducedPadding = normalizePadding(Math.max(8, (typeof padding === 'number' ? padding : 16) / 2));
      baseStyles.padding = paddingToCSS(reducedPadding);
    }

    return baseStyles;
  }, [normalizedPadding, maxWidth, centered, isNarrow, padding, style]);

  // CSS custom properties for container queries
  const cssVariables = useMemo<Record<string, string>>(() => ({
    '--container-width': `${dimensions.width}px`,
    '--container-height': `${dimensions.height}px`,
    '--container-density': density,
    '--container-size': sizeCategory,
  }), [dimensions, density, sizeCategory]);

  return (
    <ContainerContext.Provider value={contextValue}>
      <div
        ref={containerRef}
        className={className}
        style={{ ...containerStyles, ...cssVariables } as CSSProperties}
        data-adaptive-container
        data-size={sizeCategory}
        data-density={density}
        data-narrow={isNarrow}
        data-wide={isWide}
      >
        {children}
      </div>
    </ContainerContext.Provider>
  );
});

AdaptiveContainer.displayName = 'AdaptiveContainer';

// =============================================================================
// CONTAINER QUERY HOOK
// =============================================================================

/**
 * Hook for container-based media query behavior.
 *
 * @param query - Size category or width threshold
 * @returns Whether the query matches
 *
 * @example
 * ```tsx
 * function ResponsiveComponent() {
 *   const isLarge = useContainerQuery('lg');
 *   const isWiderThan600 = useContainerQuery(600);
 *
 *   return isLarge ? <LargeLayout /> : <SmallLayout />;
 * }
 * ```
 */
export function useContainerQuery(query: keyof ContainerBreakpoints | number): boolean {
  const context = useContainerContext();

  if (!context) {
    // If not in a container context, fall back to viewport-based query
    if (typeof query === 'number') {
      return typeof window !== 'undefined' && window.innerWidth >= query;
    }
    return false;
  }

  if (typeof query === 'number') {
    return (context as any).dimensions?.width >= query;
  }

  const sizeOrder: (keyof ContainerBreakpoints)[] = ['xs', 'sm', 'md', 'lg', 'xl'];
  const queryIndex = sizeOrder.indexOf(query);
  const currentIndex = sizeOrder.indexOf(context.sizeCategory || 'md');

  return currentIndex >= queryIndex;
}

/**
 * Hook for getting responsive values based on container size.
 *
 * @param values - Object mapping size categories to values
 * @returns The value for the current container size
 *
 * @example
 * ```tsx
 * function ResponsiveComponent() {
 *   const columns = useContainerValue({
 *     xs: 1,
 *     sm: 2,
 *     md: 3,
 *     lg: 4,
 *     xl: 6,
 *   });
 *
 *   return <Grid columns={columns}>{children}</Grid>;
 * }
 * ```
 */
export function useContainerValue<T>(
  values: Partial<Record<keyof ContainerBreakpoints, T>>
): T | undefined {
  const context = useContainerContext();

  if (!context) {
    // Return the smallest defined value as fallback
    return values.xs ?? values.sm ?? values.md ?? values.lg ?? values.xl;
  }

  const sizeOrder: (keyof ContainerBreakpoints)[] = ['xs', 'sm', 'md', 'lg', 'xl'];
  const currentIndex = sizeOrder.indexOf(context.sizeCategory ?? 'md');

  // Find the closest defined value at or below current size
  for (let i = currentIndex; i >= 0; i--) {
    const size = sizeOrder[i];
    if (size && size in values) {
      return values[size];
    }
  }

  // Fall back to smallest defined value
  for (const size of sizeOrder) {
    if (size in values) {
      return values[size];
    }
  }

  return undefined;
}

// =============================================================================
// EXPORTS
// =============================================================================

export { ContainerContext };
export type { AdaptiveContainerProps, ContainerContextValue };
