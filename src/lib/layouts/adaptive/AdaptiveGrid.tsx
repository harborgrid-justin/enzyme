/**
 * @fileoverview AdaptiveGrid Component
 *
 * A self-organizing grid layout component that automatically adjusts columns,
 * gaps, and item sizes based on content and available space. Supports masonry
 * layout for variable height items.
 *
 * @module layouts/adaptive/AdaptiveGrid
 * @version 1.0.0
 */

import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { AdaptiveGridProps } from './types.ts';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Golden ratio for aesthetically pleasing layouts.
 */
// // const _PHI = 1.618033988749895; // Golden ratio for future use

/**
 * Default minimum column width.
 */
const DEFAULT_MIN_COLUMN_WIDTH = 200;

/**
 * Default gap between items.
 */
const DEFAULT_GAP = 16;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculates optimal column count based on container width and minimum column width.
 */
function calculateOptimalColumns(
  containerWidth: number,
  minColumnWidth: number,
  maxColumns: number,
  gap: number
): number {
  if (containerWidth <= 0) return 1;

  // Calculate how many columns can fit
  const availableWidth = containerWidth + gap;
  const columnWithGap = minColumnWidth + gap;
  const possibleColumns = Math.floor(availableWidth / columnWithGap);

  return Math.max(1, Math.min(possibleColumns, maxColumns));
}

/**
 * Generates a unique item ID.
 */
function generateItemId(index: number): string {
  return `grid-item-${index}`;
}

// =============================================================================
// MASONRY LAYOUT CALCULATION
// =============================================================================

interface MasonryPosition {
  column: number;
  top: number;
}

/**
 * Calculates masonry layout positions for items.
 */
function calculateMasonryPositions(
  itemHeights: number[],
  columns: number,
  _columnWidth: number,
  gap: number
): Map<number, MasonryPosition> {
  const positions = new Map<number, MasonryPosition>();
  const columnHeights: number[] = new Array<number>(columns).fill(0);

  for (let i = 0; i < itemHeights.length; i++) {
    // Find shortest column
    let shortestColumn = 0;
    let shortestHeight = columnHeights[0] ?? 0;

    for (let col = 1; col < columns; col++) {
      const colHeight = columnHeights[col];
      if (colHeight !== undefined && colHeight < shortestHeight) {
        shortestColumn = col;
        shortestHeight = colHeight;
      }
    }

    positions.set(i, {
      column: shortestColumn,
      top: shortestHeight,
    });

    // Update column height
    const itemHeight = itemHeights[i] ?? 0;
    columnHeights[shortestColumn] = shortestHeight + itemHeight + gap;
  }

  return positions;
}

// =============================================================================
// ADAPTIVE GRID COMPONENT
// =============================================================================

/**
 * AdaptiveGrid is a self-organizing grid component that automatically adjusts
 * its layout based on content and available space.
 *
 * @example
 * ```tsx
 * <AdaptiveGrid
 *   minColumnWidth={250}
 *   maxColumns={4}
 *   gap={20}
 *   masonry
 * >
 *   {items.map(item => (
 *     <Card key={item.id}>{item.content}</Card>
 *   ))}
 * </AdaptiveGrid>
 * ```
 */
export function AdaptiveGrid({
  children,
  minColumnWidth = DEFAULT_MIN_COLUMN_WIDTH,
  maxColumns = 6,
  gap = DEFAULT_GAP,
  autoRows = true,
  autoFlow = 'row',
  masonry = false,
  className,
  style,
}: AdaptiveGridProps): ReactNode {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLElement>>(new Map());

  // State
  const [containerWidth, setContainerWidth] = useState(0);
  const [columns, setColumns] = useState(1);
  const [itemHeights, setItemHeights] = useState<number[]>([]);
  const [masonryPositions, setMasonryPositions] = useState<Map<number, MasonryPosition>>(new Map());

  // Calculate column width
  const columnWidth = useMemo(() => {
    if (containerWidth <= 0) return minColumnWidth;
    const totalGaps = (columns - 1) * gap;
    return (containerWidth - totalGaps) / columns;
  }, [containerWidth, columns, gap, minColumnWidth]);

  // Observe container size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const [entry] = entries;
      if (entry !== undefined) {
        const { width } = entry.contentRect;
        setContainerWidth(width);
        setColumns(calculateOptimalColumns(width, minColumnWidth, maxColumns, gap));
      }
    });

    observer.observe(container);

    return () => observer.disconnect();
  }, [minColumnWidth, maxColumns, gap]);

  // Measure item heights for masonry
  const measureItems = useCallback(() => {
    if (!masonry) return;

    const heights: number[] = [];
    for (let i = 0; i < itemRefs.current.size; i++) {
      const element = itemRefs.current.get(i);
      if (element) {
        heights.push(element.getBoundingClientRect().height);
      }
    }

    setItemHeights(heights);
  }, [masonry]);

  // Calculate masonry positions when heights change
  useEffect(() => {
    if (masonry && itemHeights.length > 0 && columns > 0) {
      const positions = calculateMasonryPositions(itemHeights, columns, columnWidth, gap);
      setMasonryPositions(positions);
    }
  }, [masonry, itemHeights, columns, columnWidth, gap]);

  // Measure items after mount and on children change
  useEffect(() => {
    if (masonry) {
      // Use requestAnimationFrame to ensure DOM has updated
      const frameId = requestAnimationFrame(measureItems);
      return () => cancelAnimationFrame(frameId);
    }
    return undefined;
  }, [masonry, measureItems, children]);

  // Register item ref - use a stable callback that doesn't access refs during render
  const registerItem = useCallback((index: number, element: HTMLElement | null) => {
    // This callback will be called by React after render, not during render
    if (element !== null) {
      itemRefs.current.set(index, element);
    } else {
      itemRefs.current.delete(index);
    }
  }, []);

  // Container styles
  const containerStyles = useMemo<CSSProperties>(() => {
    if (masonry) {
      // Calculate total height for masonry container
      let maxHeight = 0;
      for (const [index, position] of masonryPositions) {
        const height = itemHeights[index] ?? 0;
        const bottom = position.top + height;
        if (bottom > maxHeight) {
          maxHeight = bottom;
        }
      }

      return {
        position: 'relative',
        width: '100%',
        minHeight: maxHeight > 0 ? `${maxHeight}px` : undefined,
        ...style,
      };
    }

    return {
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gridAutoRows: autoRows ? 'auto' : undefined,
      gridAutoFlow: autoFlow === 'dense' ? 'row dense' : autoFlow,
      gap: `${gap}px`,
      width: '100%',
      ...style,
    };
  }, [masonry, masonryPositions, itemHeights, columns, autoRows, autoFlow, gap, style]);

  // Render children with adaptive positioning

  const renderedChildren = useMemo(() => {
    const childArray = Children.toArray(children);

    return childArray.map(async (child, index) => {
      if (!isValidElement(child)) return child;

      const itemId = generateItemId(index);

      if (masonry) {
        const position = masonryPositions.get(index);
        const itemStyle: CSSProperties = position
          ? {
              position: 'absolute',
              left: `${position.column * (columnWidth + gap)}px`,
              top: `${position.top}px`,
              width: `${columnWidth}px`,
            }
          : {
              position: 'absolute',
              visibility: 'hidden',
              width: `${columnWidth}px`,
            };

        return cloneElement(
          child as ReactElement<{
            style?: CSSProperties;
            ref?: (el: HTMLElement | null) => void;
            'data-layout-id'?: string;
          }>,
          {
            key: itemId,
            'data-layout-id': itemId,
            style: { ...(child.props as { style?: CSSProperties }).style, ...itemStyle },
            ref: (el: HTMLElement | null) => registerItem(index, el),
          }
        );
      }

      return cloneElement(child as ReactElement<{ 'data-layout-id'?: string }>, {
        key: itemId,
        'data-layout-id': itemId,
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children, masonry, masonryPositions, columnWidth, gap]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={containerStyles}
      data-adaptive-grid
      data-columns={columns}
      data-masonry={masonry}
    >
      {renderedChildren}
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { AdaptiveGridProps };
