/**
 * @file Data Table Component
 * @description Generic data table component for any domain
 * Performance optimized: static styles extracted, dynamic styles memoized
 * Uses theme tokens for consistent styling
 */

import { useMemo, useCallback, memo, type ReactNode, type CSSProperties } from 'react';
import { colorTokens } from '../../theme/tokens';

/**
 * Column definition
 */
export interface Column<T> {
  /** Unique column key */
  key: string;

  /** Column header */
  header: string | ReactNode;

  /** Data accessor */
  accessor: keyof T | ((row: T) => ReactNode);

  /** Column width */
  width?: string | number;

  /** Min width */
  minWidth?: string | number;

  /** Whether column is sortable */
  sortable?: boolean;

  /** Custom sort function */
  sortFn?: (a: T, b: T) => number;

  /** Cell alignment */
  align?: 'left' | 'center' | 'right';

  /** Custom cell renderer */
  cell?: (value: unknown, row: T, index: number) => ReactNode;

  /** Whether column is hidden */
  hidden?: boolean;
}

/**
 * Sort configuration
 */
export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

/**
 * Pagination configuration
 */
export interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
}

/**
 * Data table props
 */
export interface DataTableProps<T> {
  /** Table data */
  data: T[];

  /** Column definitions */
  columns: Column<T>[];

  /** Unique row key accessor */
  rowKey: keyof T | ((row: T) => string);

  /** Loading state */
  isLoading?: boolean;

  /** Empty state message or component */
  emptyState?: ReactNode;

  /** Sort configuration */
  sort?: SortConfig;

  /** Sort change handler */
  onSortChange?: (sort: SortConfig | undefined) => void;

  /** Pagination configuration */
  pagination?: PaginationConfig;

  /** Page change handler */
  onPageChange?: (page: number) => void;

  /** Page size change handler */
  onPageSizeChange?: (pageSize: number) => void;

  /** Row click handler */
  onRowClick?: (row: T) => void;

  /** Selected row keys */
  selectedKeys?: string[];

  /** Selection change handler */
  onSelectionChange?: (keys: string[]) => void;

  /** Enable row selection */
  selectable?: boolean;

  /** Sticky header */
  stickyHeader?: boolean;

  /** Custom class name */
  className?: string;

  /** Table caption for accessibility */
  caption?: string;
}

// ============================================================================
// STATIC STYLES - Extracted outside component to prevent re-creation
// ============================================================================

const tableContainerStyle: CSSProperties = {
  overflowX: 'auto',
};

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.875rem',
};

const captionStyle: CSSProperties = {
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

const headerRowStyle: CSSProperties = {
  backgroundColor: colorTokens.background.muted,
  borderBottom: `1px solid ${colorTokens.border.default}`,
};

const baseHeaderCellStyle: CSSProperties = {
  padding: '0.75rem 1rem',
  fontWeight: '500',
  color: colorTokens.text.secondary,
  backgroundColor: colorTokens.background.muted,
};

const sortIndicatorStyle: CSSProperties = {
  color: colorTokens.neutral[400],
};

const headerCellContentStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.25rem',
};

const loadingCellStyle: CSSProperties = {
  padding: '2rem',
  textAlign: 'center',
};

const emptyCellStyle: CSSProperties = {
  padding: '2rem',
  textAlign: 'center',
  color: colorTokens.text.muted,
};

const baseRowStyle: CSSProperties = {
  borderBottom: `1px solid ${colorTokens.border.default}`,
};

const selectionCellStyle: CSSProperties = {
  padding: '0.75rem 1rem',
  textAlign: 'center',
};

const baseCellStyle: CSSProperties = {
  padding: '0.75rem 1rem',
};

const paginationContainerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0.75rem 1rem',
  borderTop: `1px solid ${colorTokens.border.default}`,
  fontSize: '0.875rem',
};

const paginationLeftStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
};

const paginationRightStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
};

const paginationInfoStyle: CSSProperties = {
  color: colorTokens.text.muted,
};

const paginationButtonsStyle: CSSProperties = {
  display: 'flex',
  gap: '0.25rem',
};

const selectStyle: CSSProperties = {
  padding: '0.25rem 0.5rem',
  border: `1px solid ${colorTokens.border.emphasis}`,
  borderRadius: '0.25rem',
};

const baseButtonStyle: CSSProperties = {
  padding: '0.25rem 0.5rem',
  border: `1px solid ${colorTokens.border.emphasis}`,
  borderRadius: '0.25rem',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get cell value from row
 */
function getCellValue<T>(row: T, accessor: Column<T>['accessor']): unknown {
  if (typeof accessor === 'function') {
    return accessor(row);
  }
  return row[accessor];
}

/**
 * Get row key
 */
function getRowKey<T>(row: T, rowKey: DataTableProps<T>['rowKey']): string {
  if (typeof rowKey === 'function') {
    return rowKey(row);
  }
  return String(row[rowKey]);
}

// ============================================================================
// DATA TABLE COMPONENT
// ============================================================================

/**
 * Data table component - memoized for performance
 */
function DataTableInner<T>({
  data,
  columns,
  rowKey,
  isLoading = false,
  emptyState,
  sort,
  onSortChange,
  pagination,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  selectedKeys = [],
  onSelectionChange,
  selectable = false,
  stickyHeader = false,
  className,
  caption,
}: DataTableProps<T>): React.ReactElement {
  // Filter visible columns - memoized
  const visibleColumns = useMemo(
    () => columns.filter((col) => col.hidden !== true),
    [columns]
  );

  // Handle sort click - stable callback
  const handleSort = useCallback(
    (key: string) => {
      if (!onSortChange) return;

      if (sort?.key === key) {
        if (sort.direction === 'asc') {
          onSortChange({ key, direction: 'desc' });
        } else {
          onSortChange(undefined);
        }
      } else {
        onSortChange({ key, direction: 'asc' });
      }
    },
    [sort, onSortChange]
  );

  // Handle row selection - stable callback
  const handleSelectAll = useCallback(() => {
    if (!onSelectionChange) return;

    const allKeys = data.map((row) => getRowKey(row, rowKey));
    const allSelected = allKeys.every((key) => selectedKeys.includes(key));

    onSelectionChange(allSelected ? [] : allKeys);
  }, [data, rowKey, selectedKeys, onSelectionChange]);

  const handleSelectRow = useCallback(
    (key: string) => {
      if (!onSelectionChange) return;

      if (selectedKeys.includes(key)) {
        onSelectionChange(selectedKeys.filter((k) => k !== key));
      } else {
        onSelectionChange([...selectedKeys, key]);
      }
    },
    [selectedKeys, onSelectionChange]
  );

  // Check if all rows are selected - memoized
  const allSelected = useMemo(() => {
    if (data.length === 0) return false;
    return data.every((row) =>
      selectedKeys.includes(getRowKey(row, rowKey))
    );
  }, [data, rowKey, selectedKeys]);

  // Page size options - static
  const pageSizeOptions = useMemo(() => [10, 25, 50, 100], []);

  // Memoized sticky header style extension
  const stickyStyleExtension = useMemo((): Partial<CSSProperties> => ({
    position: stickyHeader ? 'sticky' : undefined,
    top: stickyHeader ? 0 : undefined,
    zIndex: stickyHeader ? 1 : undefined,
  }), [stickyHeader]);

  // Memoized selection header cell style
  const selectionHeaderStyle = useMemo((): CSSProperties => ({
    ...baseHeaderCellStyle,
    width: '3rem',
    textAlign: 'center',
    ...stickyStyleExtension,
  }), [stickyStyleExtension]);

  // Generate header cell styles based on column config - memoized per-column
  const getHeaderCellStyle = useCallback((column: Column<T>): CSSProperties => ({
    ...baseHeaderCellStyle,
    textAlign: column.align || 'left',
    width: column.width,
    minWidth: column.minWidth,
    cursor: column.sortable ? 'pointer' : 'default',
    userSelect: column.sortable ? 'none' : undefined,
    ...stickyStyleExtension,
  }), [stickyStyleExtension]);

  // Generate content justification based on alignment - memoized
  const getContentJustification = useCallback((align?: 'left' | 'center' | 'right'): CSSProperties => ({
    ...headerCellContentStyle,
    justifyContent:
      align === 'center'
        ? 'center'
        : align === 'right'
          ? 'flex-end'
          : 'flex-start',
  }), []);

  // Generate row style based on selection and click handler - memoized factory
  const getRowStyle = useCallback((isSelected: boolean, hasClickHandler: boolean): CSSProperties => ({
    ...baseRowStyle,
    cursor: hasClickHandler ? 'pointer' : 'default',
    backgroundColor: isSelected ? colorTokens.interactive.selected : undefined,
  }), []);

  // Generate cell style based on alignment - memoized
  const getCellStyle = useCallback((align?: 'left' | 'center' | 'right'): CSSProperties => ({
    ...baseCellStyle,
    textAlign: align ?? 'left',
  }), []);

  // Pre-computed button styles to avoid creating new objects on each call
  const enabledButtonStyle = useMemo((): CSSProperties => ({
    ...baseButtonStyle,
    cursor: 'pointer',
    opacity: 1,
  }), []);

  const disabledButtonStyle = useMemo((): CSSProperties => ({
    ...baseButtonStyle,
    cursor: 'not-allowed',
    opacity: 0.5,
  }), []);

  // Returns pre-computed style reference instead of creating new object
  const getButtonStyle = useCallback((disabled: boolean): CSSProperties => {
    return disabled ? disabledButtonStyle : enabledButtonStyle;
  }, [disabledButtonStyle, enabledButtonStyle]);

  // Calculate pagination state - memoized
  const paginationState = useMemo(() => {
    if (!pagination) return null;
    const isFirstPage = pagination.page === 0;
    const isLastPage = (pagination.page + 1) * pagination.pageSize >= pagination.total;
    const startItem = pagination.page * pagination.pageSize + 1;
    const endItem = Math.min((pagination.page + 1) * pagination.pageSize, pagination.total);
    return { isFirstPage, isLastPage, startItem, endItem };
  }, [pagination]);

  // Stable header click handler using data-* attributes
  const handleHeaderClick = useCallback((event: React.MouseEvent<HTMLTableCellElement>) => {
    const columnKey = event.currentTarget.dataset.columnKey;
    const isSortable = event.currentTarget.dataset.sortable === 'true';
    if (columnKey && isSortable) {
      handleSort(columnKey);
    }
  }, [handleSort]);

  // Stable header keydown handler using data-* attributes
  const handleHeaderKeyDown = useCallback((event: React.KeyboardEvent<HTMLTableCellElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      const columnKey = event.currentTarget.dataset.columnKey;
      const isSortable = event.currentTarget.dataset.sortable === 'true';
      if (columnKey && isSortable) {
        event.preventDefault();
        handleSort(columnKey);
      }
    }
  }, [handleSort]);

  // Stable row click handler using data-* attributes
  const handleRowClick = useCallback((event: React.MouseEvent<HTMLTableRowElement>) => {
    const rowIndex = event.currentTarget.dataset.rowIndex;
    if (rowIndex !== undefined && onRowClick) {
      const row = data[Number(rowIndex)];
      if (row) {
        onRowClick(row);
      }
    }
  }, [data, onRowClick]);

  // Stable selection change handler using data-* attributes
  const handleSelectionClick = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const rowKey = event.currentTarget.dataset.rowKey;
    if (rowKey) {
      handleSelectRow(rowKey);
    }
  }, [handleSelectRow]);

  // Stop propagation handler for selection cell - stable
  const stopPropagation = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
  }, []);

  // Stable page size change handler
  const handlePageSizeChangeEvent = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    onPageSizeChange?.(Number(event.target.value));
  }, [onPageSizeChange]);

  // Stable previous page handler
  const handlePrevPage = useCallback(() => {
    if (pagination) {
      onPageChange?.(pagination.page - 1);
    }
  }, [pagination, onPageChange]);

  // Stable next page handler
  const handleNextPage = useCallback(() => {
    if (pagination) {
      onPageChange?.(pagination.page + 1);
    }
  }, [pagination, onPageChange]);

  return (
    <div className={className}>
      {/* Table container */}
      <div style={tableContainerStyle}>
        <table style={tableStyle}>
          {caption && (
            <caption style={captionStyle}>
              {caption}
            </caption>
          )}

          {/* Header */}
          <thead>
            <tr style={headerRowStyle}>
              {/* Selection checkbox */}
              {selectable && (
                <th scope="col" style={selectionHeaderStyle}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
                    aria-label="Select all rows"
                  />
                </th>
              )}

              {/* Column headers */}
              {visibleColumns.map((column) => {
                const isSorted = sort?.key === column.key;
                const ariaSortValue = isSorted
                  ? (sort.direction === 'asc' ? 'ascending' : 'descending')
                  : undefined;

                return (
                  <th
                    key={column.key}
                    scope="col"
                    style={getHeaderCellStyle(column)}
                    tabIndex={column.sortable ? 0 : undefined}
                    role={column.sortable ? 'button' : undefined}
                    aria-sort={column.sortable ? ariaSortValue : undefined}
                    data-column-key={column.key}
                    data-sortable={column.sortable ? 'true' : 'false'}
                    onClick={handleHeaderClick}
                    onKeyDown={handleHeaderKeyDown}
                  >
                    <div style={getContentJustification(column.align)}>
                      {column.header}
                      {column.sortable === true && (
                        <span style={sortIndicatorStyle} aria-hidden="true">
                          {sort?.key === column.key
                            ? (sort.direction === 'asc' ? '↑' : '↓')
                            : '↕'
                          }
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Body */}
          <tbody aria-live="polite" aria-busy={isLoading}>
            {/* Loading state */}
            {isLoading && (
              <tr>
                <td
                  colSpan={visibleColumns.length + (selectable ? 1 : 0)}
                  style={loadingCellStyle}
                  role="status"
                >
                  <span aria-label="Loading table data">Loading...</span>
                </td>
              </tr>
            )}

            {/* Empty state */}
            {!isLoading && data.length === 0 && (
              <tr>
                <td
                  colSpan={visibleColumns.length + (selectable ? 1 : 0)}
                  style={emptyCellStyle}
                >
                  {emptyState || 'No data available'}
                </td>
              </tr>
            )}

            {/* Data rows */}
            {!isLoading &&
              data.map((row, rowIndex) => {
                const key = getRowKey(row, rowKey);
                const isSelected = selectedKeys.includes(key);

                return (
                  <tr
                    key={key}
                    data-row-index={rowIndex}
                    onClick={onRowClick ? handleRowClick : undefined}
                    style={getRowStyle(isSelected, onRowClick !== undefined)}
                  >
                    {/* Selection checkbox */}
                    {selectable && (
                      <td
                        style={selectionCellStyle}
                        onClick={stopPropagation}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          data-row-key={key}
                          onChange={handleSelectionClick}
                          aria-label={`Select row ${key}`}
                        />
                      </td>
                    )}

                    {/* Data cells */}
                    {visibleColumns.map((column) => {
                      const value = getCellValue(row, column.accessor);

                      return (
                        <td
                          key={column.key}
                          style={getCellStyle(column.align)}
                        >
                          {column.cell
                            ? column.cell(value, row, rowIndex)
                            : (value !== null && value !== undefined ? String(value) : '')}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && paginationState && (
        <div style={paginationContainerStyle}>
          <div style={paginationLeftStyle}>
            <label htmlFor="datatable-page-size">Rows per page:</label>
            <select
              id="datatable-page-size"
              aria-label="Select number of rows per page"
              value={pagination.pageSize}
              onChange={handlePageSizeChangeEvent}
              style={selectStyle}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <div style={paginationRightStyle}>
            <span style={paginationInfoStyle}>
              {paginationState.startItem}-{paginationState.endItem} of {pagination.total}
            </span>

            <div style={paginationButtonsStyle} role="group" aria-label="Pagination controls">
              <button
                onClick={handlePrevPage}
                disabled={paginationState.isFirstPage}
                aria-disabled={paginationState.isFirstPage}
                aria-label="Go to previous page"
                style={getButtonStyle(paginationState.isFirstPage)}
              >
                Previous
              </button>
              <button
                onClick={handleNextPage}
                disabled={paginationState.isLastPage}
                aria-disabled={paginationState.isLastPage}
                aria-label="Go to next page"
                style={getButtonStyle(paginationState.isLastPage)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

DataTableInner.displayName = 'DataTable';

/**
 * Memoized DataTable component with preserved generic signature
 */
export const DataTable = memo(DataTableInner) as <T>(props: DataTableProps<T>) => React.ReactElement;
