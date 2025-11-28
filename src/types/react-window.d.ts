declare module 'react-window' {
  import type { ComponentType, CSSProperties, PureComponent, Ref } from 'react';

  export interface ListChildComponentProps {
    index: number;
    style: CSSProperties;
    data: unknown;
    isScrolling?: boolean;
  }

  export interface FixedSizeListProps {
    children: ComponentType<ListChildComponentProps>;
    className?: string;
    direction?: 'ltr' | 'rtl' | 'horizontal' | 'vertical';
    height: number | string;
    initialScrollOffset?: number;
    innerElementType?: string | ComponentType<unknown>;
    innerRef?: Ref<unknown>;
    innerTagName?: string; // deprecated
    itemCount: number;
    itemData?: unknown;
    itemKey?: (index: number, data: unknown) => string | number;
    itemSize: number;
    layout?: 'vertical' | 'horizontal';
    onItemsRendered?: (props: {
      overscanStartIndex: number;
      overscanStopIndex: number;
      visibleStartIndex: number;
      visibleStopIndex: number;
    }) => void;
    onScroll?: (props: {
      scrollDirection: 'forward' | 'backward';
      scrollOffset: number;
      scrollUpdateWasRequested: boolean;
    }) => void;
    outerElementType?: string | ComponentType<unknown>;
    outerRef?: Ref<unknown>;
    outerTagName?: string; // deprecated
    overscanCount?: number;
    style?: CSSProperties;
    useIsScrolling?: boolean;
    width: number | string;
  }

  export class FixedSizeList extends PureComponent<FixedSizeListProps> {
    scrollTo(scrollOffset: number): void;
    scrollToItem(index: number, align?: 'auto' | 'smart' | 'center' | 'end' | 'start'): void;
  }
}
