/**
 * @file Virtualized Data Table Component
 * @description High-performance data table with windowed rendering for large datasets
 * Uses react-window for virtualization - only renders visible rows
 *
 * @example
 * // For tables with 100+ rows, use VirtualizedDataTable instead of DataTable
 * <VirtualizedDataTable
 *   data={largeDataset}
 *   columns={columns}
 *   rowKey="id"
 *   height={600}
 *   rowHeight={50}
 * />
 */

import React, {
  memo,
  useMemo,
  useCallback,
  useId,
  useState,
  useRef,
  useEffect,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  FixedSizeList as List,
  type ListChildComponentProps,
  type FixedSizeList,
} from 'react-window';

/**
 * Column definition for virtualized table
 */
export interface VirtualizedColumn<T> {
  /** Unique column key */
  key: string;

  /** Column header */
  header: string | ReactNode;

  /** Data accessor */
  accessor: keyof T | ((row: T) => ReactNode);

  /** Column width as percentage or fixed px */
  width?: string | number;

  /** Min width */
  minWidth?: number;

  /** Cell alignment */
  align?: 'left' | 'center' | 'right';

  /** Custom cell renderer */
  cell?: (value: unknown, row: T, index: number) => ReactNode;
}

/**
 * VirtualizedDataTable props
 */
export interface VirtualizedDataTableProps<T> {
  /** Table data */
  data: T[];

  /** Column definitions */
  columns: VirtualizedColumn<T>[];

  /** Unique row key accessor */
  rowKey: keyof T | ((row: T) => string);

  /** Table height in pixels */
  height: number;

  /** Row height in pixels */
  rowHeight?: number;

  /** Header height in pixels */
  headerHeight?: number;

  /** Loading state */
  isLoading?: boolean;

  /** Empty state message */
  emptyState?: ReactNode;

  /** Row click handler */
  onRowClick?: (row: T) => void;

  /** Custom class name */
  className?: string;

  /** Overscan count - rows to render above/below viewport */
  overscanCount?: number;
}

// ============================================================================
// STATIC STYLES
// ============================================================================

const containerStyle: CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: '0.5rem',
  overflow: 'hidden',
};

const headerContainerStyle: CSSProperties = {
  display: 'flex',
  backgroundColor: '#f9fafb',
  borderBottom: '1px solid #e5e7eb',
  fontWeight: '500',
  fontSize: '0.875rem',
  color: '#374151',
};

const headerCellStyle: CSSProperties = {
  padding: '0.75rem 1rem',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const rowStyle: CSSProperties = {
  display: 'flex',
  borderBottom: '1px solid #e5e7eb',
  fontSize: '0.875rem',
  alignItems: 'center',
};

const cellStyle: CSSProperties = {
  padding: '0.75rem 1rem',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const loadingContainerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#6b7280',
};

const emptyContainerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#6b7280',
  padding: '2rem',
};

// Screen reader only style for keyboard help text
const srOnlyStyle: CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

// Focus indicator styles for keyboard navigation
// const focusRowStyle: CSSProperties = {
//   outline: '2px solid #3b82f6',
//   outlineOffset: '-2px',
//   backgroundColor: '#eff6ff',
// };

// CSS for keyboard focus styles
const keyboardFocusStyles = `
  .virtualized-row:focus {
    outline: 2px solid #3b82f6;
    outline-offset: -2px;
    background-color: #eff6ff;
  }

  .virtualized-row:focus:not(:focus-visible) {
    outline: none;
    background-color: inherit;
  }

  .virtualized-row:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: -2px;
    background-color: #eff6ff;
  }
`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get cell value from row
 */
function getCellValue<T>(row: T, accessor: VirtualizedColumn<T>['accessor']): unknown {
  if (typeof accessor === 'function') {
    return accessor(row);
  }
  return row[accessor];
}

/**
 * Get row key
 */
function getRowKey<T>(row: T, rowKey: VirtualizedDataTableProps<T>['rowKey']): string {
  if (typeof rowKey === 'function') {
    return rowKey(row);
  }
  return String(row[rowKey]);
}

// ============================================================================
// ROW RENDERER
// ============================================================================

interface RowData<T> {
  data: T[];
  columns: VirtualizedColumn<T>[];
  rowKey: VirtualizedDataTableProps<T>['rowKey'];
  onRowClick?: (row: T) => void;
  focusedIndex: number;
  onRowFocus: (index: number) => void;
  onKeyDown: (event: React.KeyboardEvent, index: number) => void;
}

/**
 * Virtualized row component with keyboard navigation - inner implementation
 */
function VirtualizedRowInner<T>({
  index,
  style,
  data: rowData,
}: ListChildComponentProps): React.ReactElement {
  const { data, columns, rowKey, onRowClick, focusedIndex, onRowFocus, onKeyDown } =
    rowData as RowData<T>;
  const row = data[index];

  // Hooks must be called unconditionally
  const rowRef = useRef<HTMLDivElement | null>(null);
  const isFocused = focusedIndex === index;

  // Focus this row when it becomes the focused index
  useEffect(() => {
    if (isFocused && rowRef.current !== null) {
      rowRef.current.focus();
    }
  }, [isFocused]);

  // Calculate row style with hover effect
  const computedRowStyle = useMemo(
    (): CSSProperties => ({
      ...style,
      ...rowStyle,
      cursor: onRowClick !== undefined ? 'pointer' : 'default',
    }),
    [style, onRowClick]
  );

  // Handle row click
  const handleClick = useCallback(() => {
    if (row !== undefined) {
      onRowClick?.(row);
    }
  }, [onRowClick, row]);

  // Handle focus
  const handleFocus = useCallback(() => {
    onRowFocus(index);
  }, [onRowFocus, index]);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      onKeyDown(event, index);

      // Handle Enter/Space for row activation
      if ((event.key === 'Enter' || event.key === ' ') && onRowClick !== undefined && row !== undefined) {
        event.preventDefault();
        onRowClick(row);
      }
    },
    [onKeyDown, index, onRowClick, row]
  );

  // Guard against undefined row (should not happen in normal virtualized list usage)
  if (row === undefined) {
    return <div style={style} />;
  }

  const key = getRowKey(row, rowKey);

  return (
    <div
      ref={rowRef}
      key={key}
      className="virtualized-row"
      style={computedRowStyle}
      onClick={handleClick}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      role="row"
      tabIndex={isFocused ? 0 : -1}
      aria-rowindex={index + 2} // +2 for header row and 1-based index
    >
      {columns.map((column: VirtualizedColumn<T>) => {
        const value = getCellValue(row, column.accessor);
        let cellContent: ReactNode;
        if (column.cell !== undefined) {
          cellContent = column.cell(value, row, index);
        } else if (value !== null && value !== undefined) {
          // Safe stringification: only convert primitives
          if (
            typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'boolean'
          ) {
            cellContent = String(value);
          } else {
            cellContent = '';
          }
        } else {
          cellContent = '';
        }

        return (
          <div
            key={column.key}
            role="cell"
            style={{
              ...cellStyle,
              width: column.width,
              minWidth: column.minWidth,
              textAlign: column.align ?? 'left',
              flex: column.width !== undefined && column.width !== null ? 'none' : 1,
            }}
          >
            {cellContent}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Memoized virtualized row component for performance optimization.
 * Prevents unnecessary re-renders when parent re-renders but row data hasn't changed.
 */
const VirtualizedRow = memo(VirtualizedRowInner) as typeof VirtualizedRowInner;

// Add displayName for debugging
(VirtualizedRow as React.FC).displayName = 'VirtualizedRow';

// ============================================================================
// VIRTUALIZED DATA TABLE
// ============================================================================

/**
 * VirtualizedDataTable component
 * Uses windowed rendering for optimal performance with large datasets
 */
function VirtualizedDataTableInner<T>({
  data,
  columns,
  rowKey,
  height,
  rowHeight = 48,
  headerHeight = 48,
  isLoading = false,
  emptyState,
  onRowClick,
  className,
  overscanCount = 5,
}: VirtualizedDataTableProps<T>): React.ReactElement {
  // State for keyboard navigation - track which row is focused
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const listRef = useRef<FixedSizeList | null>(null);

  // Handler for keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, currentIndex: number) => {
      let newIndex = currentIndex;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          newIndex = Math.min(currentIndex + 1, data.length - 1);
          break;
        case 'ArrowUp':
          event.preventDefault();
          newIndex = Math.max(currentIndex - 1, 0);
          break;
        case 'Home':
          event.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          event.preventDefault();
          newIndex = data.length - 1;
          break;
        default:
          return;
      }

      if (newIndex !== currentIndex) {
        setFocusedIndex(newIndex);
        // Scroll the row into view
        listRef.current?.scrollToItem(newIndex, 'smart');
      }
    },
    [data.length]
  );

  // Handler for row focus
  const handleRowFocus = useCallback((index: number) => {
    setFocusedIndex(index);
  }, []);

  // Memoize item data to prevent unnecessary re-renders
  const itemData = useMemo(
    (): RowData<T> => ({
      data,
      columns,
      rowKey,
      onRowClick,
      focusedIndex,
      onRowFocus: handleRowFocus,
      onKeyDown: handleKeyDown,
    }),
    [data, columns, rowKey, onRowClick, focusedIndex, handleRowFocus, handleKeyDown]
  );

  // Memoize computed heights
  const listHeight = useMemo(() => height - headerHeight, [height, headerHeight]);

  // Memoize loading/empty container styles with dynamic height
  const loadingStyle = useMemo(
    (): CSSProperties => ({
      ...loadingContainerStyle,
      height: listHeight,
    }),
    [listHeight]
  );

  const emptyStyle = useMemo(
    (): CSSProperties => ({
      ...emptyContainerStyle,
      height: listHeight,
    }),
    [listHeight]
  );

  // Generate unique ID for keyboard help - use React 18's useId() for SSR-safe IDs
  const reactId = useId();
  const keyboardHelpId = `table-keyboard-help${reactId}`;

  return (
    <div
      className={className}
      style={containerStyle}
      role="table"
      aria-rowcount={data.length + 1}
      aria-describedby={keyboardHelpId}
    >
      {/* Keyboard focus styles */}
      <style>{keyboardFocusStyles}</style>

      {/* Screen reader keyboard help */}
      <div id={keyboardHelpId} style={srOnlyStyle}>
        Data table with {data.length} rows and {columns.length} columns.
        {onRowClick && ' Press Enter or Space to activate a row.'}
        Use arrow keys to navigate between rows. Press Home for first row, End for last row.
      </div>

      {/* Header */}
      <div style={{ ...headerContainerStyle, height: headerHeight }} role="row" aria-rowindex={1}>
        {columns.map((column) => (
          <div
            key={column.key}
            role="columnheader"
            style={{
              ...headerCellStyle,
              width: column.width,
              minWidth: column.minWidth,
              textAlign: column.align ?? 'left',
              flex: column.width !== undefined && column.width !== null ? 'none' : 1,
            }}
          >
            {column.header}
          </div>
        ))}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div style={loadingStyle} role="status" aria-label="Loading table data">
          Loading...
        </div>
      )}

      {/* Empty state */}
      {!isLoading && data.length === 0 && (
        <div style={emptyStyle}>{emptyState ?? 'No data available'}</div>
      )}

      {/* Virtualized rows */}
      {!isLoading && data.length > 0 && (
        <List
          ref={listRef}
          height={listHeight}
          itemCount={data.length}
          itemSize={rowHeight}
          itemData={itemData}
          overscanCount={overscanCount}
          width="100%"
        >
          {VirtualizedRow}
        </List>
      )}
    </div>
  );
}

// Export memoized component
export const VirtualizedDataTable = memo(
  VirtualizedDataTableInner
) as typeof VirtualizedDataTableInner;

/**
 * Hook to determine if virtualization should be used
 * @param dataLength - Length of the data array
 * @param threshold - Threshold above which virtualization is recommended
 * @returns Whether virtualization should be used
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useVirtualizationRecommended(dataLength: number, threshold: number = 100): boolean {
  return useMemo(() => dataLength > threshold, [dataLength, threshold]);
}
