/**
 * @fileoverview Context-Aware Box Component
 *
 * A generic container component that is aware of its DOM context
 * and can optionally provide that context to its children.
 *
 * Features:
 * - Knows its position in the layout hierarchy
 * - Can respond to context changes
 * - Provides layout hints to children
 * - Supports polymorphic rendering (as prop)
 *
 * @module layouts/context-aware/ContextAwareBox
 * @author Agent 4 - PhD Context Systems Expert
 * @version 1.0.0
 */

import React, {
  useRef,
  useEffect,
  type ReactNode,
  useCallback,
  forwardRef,
  type ElementType,
  type ComponentPropsWithoutRef,
} from 'react';

import type {
  DOMContext,
  LayoutType,
  ContextAwareBoxProps,
} from './types';
import { useDOMContextValue } from './DOMContextProvider';
import { getDOMContextTracker } from './dom-context';
// import { getZIndexManager } from './z-index-manager';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for polymorphic ContextAwareBox.
 */
export type PolymorphicContextAwareBoxProps<E extends ElementType> =
  ContextAwareBoxProps & {
    as?: E;
  } & Omit<ComponentPropsWithoutRef<E>, keyof ContextAwareBoxProps>;

/**
 * Extended context information specific to the box.
 */
export interface BoxContext extends DOMContext {
  /** The box's own layout type */
  ownLayoutType: LayoutType;
  /** Whether this box is the nearest layout ancestor for children */
  isLayoutRoot: boolean;
  /** Depth in the context tree */
  contextDepth: number;
}

/**
 * Callback for context ready event.
 */
export type OnContextReadyCallback = (context: DOMContext, element: HTMLElement) => void;

// ============================================================================
// ContextAwareBox Component
// ============================================================================

/**
 * A context-aware container component.
 *
 * @remarks
 * This component is aware of its DOM context and can provide
 * useful layout information to its children. It's useful for
 * building responsive components that adapt to their container.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <ContextAwareBox>
 *   <MyContent />
 * </ContextAwareBox>
 *
 * // With context callback
 * <ContextAwareBox onContextReady={(ctx) => console.log(ctx)}>
 *   <MyContent />
 * </ContextAwareBox>
 *
 * // Polymorphic rendering
 * <ContextAwareBox as="section" className="my-section">
 *   <MyContent />
 * </ContextAwareBox>
 *
 * // With layout hint for children
 * <ContextAwareBox layoutHint="flex">
 *   <FlexChild />
 * </ContextAwareBox>
 * ```
 */
function ContextAwareBoxInner<E extends ElementType = 'div'>(
  {
    as,
    children,
    className,
    style,
    provideContext = false,
    onContextReady,
    layoutHint,
    'data-testid': testId,
    ...restProps
  }: PolymorphicContextAwareBoxProps<E>,
  forwardedRef: React.ForwardedRef<HTMLElement>
): JSX.Element {
  // Determine the component to render
  const Component = as || 'div';

  // Refs
  const internalRef = useRef<HTMLElement>(null);
  const contextReadyCalledRef = useRef(false);

  // Get DOM context
  const domContext = useDOMContextValue();
  // const _refreshContext = useDOMContextRefresh();

  // Resolve ref
  const resolvedRef = (forwardedRef || internalRef) as React.RefObject<HTMLElement>;

  /**
   * Computes box-specific context information.
   */
  const computeBoxContext = useCallback((): BoxContext | null => {
    if (!resolvedRef.current || !domContext.isInitialized) {
      return null;
    }

    const tracker = getDOMContextTracker();
    const element = resolvedRef.current;

    // Get this element's layout type
    const ownLayoutType = tracker.getLayoutType(element);

    // Determine if this is a layout root
    const isLayoutRoot = ownLayoutType === 'flex' ||
      ownLayoutType === 'grid' ||
      ownLayoutType === 'inline-flex' ||
      ownLayoutType === 'inline-grid';

    // Calculate context depth
    const contextDepth = domContext.ancestors.length;

    return {
      ...domContext,
      ownLayoutType,
      isLayoutRoot,
      contextDepth,
    };
  }, [domContext, resolvedRef]);

  // Call onContextReady when context is initialized
  useEffect(() => {
    if (
      domContext.isInitialized &&
      resolvedRef.current &&
      onContextReady &&
      !contextReadyCalledRef.current
    ) {
      contextReadyCalledRef.current = true;
      onContextReady(domContext);
    }
  }, [domContext.isInitialized, onContextReady, resolvedRef, domContext]);

  // Re-trigger context ready if element changes
  useEffect(() => {
    if (resolvedRef.current) {
      contextReadyCalledRef.current = false;
    }
  }, [resolvedRef]);

  // Compute style with layout hint
  const computedStyle = React.useMemo(() => {
    if (!layoutHint) {
      return style;
    }

    const layoutStyles: React.CSSProperties = {};

    switch (layoutHint) {
      case 'flex':
        layoutStyles.display = 'flex';
        break;
      case 'inline-flex':
        layoutStyles.display = 'inline-flex';
        break;
      case 'grid':
        layoutStyles.display = 'grid';
        break;
      case 'inline-grid':
        layoutStyles.display = 'inline-grid';
        break;
      case 'block':
        layoutStyles.display = 'block';
        break;
      case 'inline':
        layoutStyles.display = 'inline';
        break;
      case 'inline-block':
        layoutStyles.display = 'inline-block';
        break;
    }

    return { ...layoutStyles, ...style };
  }, [layoutHint, style]);

  // Build data attributes
  const dataAttributes: Record<string, string> = {
    'data-context-aware': 'true',
  };

  if (layoutHint) {
    dataAttributes['data-layout-hint'] = layoutHint;
  }

  if (domContext.isInitialized) {
    dataAttributes['data-context-initialized'] = 'true';
    dataAttributes['data-context-id'] = domContext.contextId;
  }

  const ElementComponent = Component as unknown as React.ComponentType<{
    ref: React.Ref<HTMLElement>;
    className?: string;
    style?: React.CSSProperties;
    'data-testid'?: string;
    children?: ReactNode;
    [key: string]: unknown;
  }>;

  return (
    <ElementComponent
      ref={resolvedRef as React.Ref<HTMLElement>}
      className={className}
      style={computedStyle}
      data-testid={testId}
      {...dataAttributes}
      {...(restProps as Record<string, unknown>)}
    >
      {children}
    </ElementComponent>
  );
}

/**
 * Forwarded ref version of ContextAwareBox.
 */
export const ContextAwareBox = forwardRef(ContextAwareBoxInner) as <
  E extends ElementType = 'div'
>(
  props: PolymorphicContextAwareBoxProps<E> & {
    ref?: React.ForwardedRef<HTMLElement>;
  }
) => JSX.Element;

// ============================================================================
// Specialized Box Variants
// ============================================================================

/**
 * Props for FlexBox component.
 */
export interface FlexBoxProps extends Omit<ContextAwareBoxProps, 'layoutHint'> {
  /** Flex direction */
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  /** Justify content */
  justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly';
  /** Align items */
  align?: 'start' | 'end' | 'center' | 'stretch' | 'baseline';
  /** Flex wrap */
  wrap?: boolean | 'reverse';
  /** Gap between items */
  gap?: number | string;
}

/**
 * Context-aware flex container.
 *
 * @example
 * ```tsx
 * <FlexBox direction="column" justify="center" gap={16}>
 *   <Item />
 *   <Item />
 * </FlexBox>
 * ```
 */
export function FlexBox({
  direction = 'row',
  justify,
  align,
  wrap,
  gap,
  style,
  ...props
}: FlexBoxProps): JSX.Element {
  const flexStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: direction,
    justifyContent: justify ? mapJustify(justify) : undefined,
    alignItems: align ? mapAlign(align) : undefined,
    flexWrap: wrap === true ? 'wrap' : wrap === 'reverse' ? 'wrap-reverse' : undefined,
    gap: typeof gap === 'number' ? `${gap}px` : gap,
    ...style,
  };

  return <ContextAwareBox style={flexStyle} {...props} />;
}

/**
 * Props for GridBox component.
 */
export interface GridBoxProps extends Omit<ContextAwareBoxProps, 'layoutHint'> {
  /** Number of columns or template string */
  columns?: number | string;
  /** Number of rows or template string */
  rows?: number | string;
  /** Gap between items */
  gap?: number | string;
  /** Row gap */
  rowGap?: number | string;
  /** Column gap */
  columnGap?: number | string;
  /** Auto flow direction */
  autoFlow?: 'row' | 'column' | 'dense' | 'row dense' | 'column dense';
}

/**
 * Context-aware grid container.
 *
 * @example
 * ```tsx
 * <GridBox columns={3} gap={16}>
 *   <Item />
 *   <Item />
 *   <Item />
 * </GridBox>
 * ```
 */
export function GridBox({
  columns,
  rows,
  gap,
  rowGap,
  columnGap,
  autoFlow,
  style,
  ...props
}: GridBoxProps): JSX.Element {
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: typeof columns === 'number'
      ? `repeat(${columns}, 1fr)`
      : columns,
    gridTemplateRows: typeof rows === 'number'
      ? `repeat(${rows}, 1fr)`
      : rows,
    gap: typeof gap === 'number' ? `${gap}px` : gap,
    rowGap: typeof rowGap === 'number' ? `${rowGap}px` : rowGap,
    columnGap: typeof columnGap === 'number' ? `${columnGap}px` : columnGap,
    gridAutoFlow: autoFlow,
    ...style,
  };

  return <ContextAwareBox style={gridStyle} {...props} />;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Maps justify prop to CSS value.
 */
function mapJustify(
  justify: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly'
): string {
  const map: Record<typeof justify, string> = {
    start: 'flex-start',
    end: 'flex-end',
    center: 'center',
    between: 'space-between',
    around: 'space-around',
    evenly: 'space-evenly',
  };
  return map[justify];
}

/**
 * Maps align prop to CSS value.
 */
function mapAlign(
  align: 'start' | 'end' | 'center' | 'stretch' | 'baseline'
): string {
  const map: Record<typeof align, string> = {
    start: 'flex-start',
    end: 'flex-end',
    center: 'center',
    stretch: 'stretch',
    baseline: 'baseline',
  };
  return map[align];
}

// ============================================================================
// Export
// ============================================================================

export default ContextAwareBox;
