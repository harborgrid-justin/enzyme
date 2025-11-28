declare module 'react-window' {
  import { ComponentType, CSSProperties, PureComponent } from 'react';

  export interface ListChildComponentProps {
    index: number;
    style: CSSProperties;
    data: any;
    isScrolling?: boolean;
  }

  export interface FixedSizeListProps {
    children: ComponentType<ListChildComponentProps>;
    className?: string;
    direction?: 'ltr' | 'rtl' | 'horizontal' | 'vertical';
    height: number | string;
    initialScrollOffset?: number;
    innerElementType?: string | ComponentType<any>;
    innerRef?: React.Ref<any>;
    innerTagName?: string; // deprecated
    itemCount: number;
    itemData?: any;
    itemKey?: (index: number, data: any) => any;
    itemSize: number;
    layout?: 'vertical' | 'horizontal';
    onItemsRendered?: (props: {
      overscanStartIndex: number;
      overscanStopIndex: number;
      visibleStartIndex: number;
      visibleStopIndex: number;
    }) => any;
    onScroll?: (props: {
      scrollDirection: 'forward' | 'backward';
      scrollOffset: number;
      scrollUpdateWasRequested: boolean;
    }) => any;
    outerElementType?: string | ComponentType<any>;
    outerRef?: React.Ref<any>;
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
