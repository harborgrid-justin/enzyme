/**
 * @file Shared Feature Components
 * @description Reusable component patterns for feature development
 * Performance optimized: static styles extracted to module-level constants
 */

import React, {
  type ReactNode,
  useState,
  useCallback,
  useMemo,
  memo,
  type CSSProperties,
} from 'react';

// ============================================================================
// STATIC STYLES - Extracted outside components to prevent re-creation
// ============================================================================

// Stats Card styles
const statsCardHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const statsCardLabelStyle: CSSProperties = {
  fontSize: '0.875rem',
  color: 'var(--color-text-muted, #6b7280)',
};

const statsCardValueStyle: CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: '700',
  margin: '0.25rem 0',
  color: 'var(--color-text-primary, #111827)',
};

// Filter Panel styles
const filterToggleButtonStyle: CSSProperties = {
  padding: '0.5rem 1rem',
  backgroundColor: '#f3f4f6',
  border: 'none',
  borderRadius: '0.375rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
};

const filterBadgeStyle: CSSProperties = {
  backgroundColor: '#3b82f6',
  color: '#fff',
  borderRadius: '9999px',
  padding: '0.125rem 0.5rem',
  fontSize: '0.75rem',
};

const filterPanelHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '1rem',
};

const filterTitleStyle: CSSProperties = {
  fontWeight: 500,
};

const filterActiveCountStyle: CSSProperties = {
  marginLeft: '0.5rem',
  color: 'var(--color-text-muted, #6b7280)',
};

const filterActionsStyle: CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
};

const clearButtonStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#3b82f6',
  cursor: 'pointer',
  fontSize: '0.875rem',
};

const closeButtonStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '0.875rem',
};

// Pagination styles
const paginationContainerBaseStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '1rem 0',
};

const paginationInfoStyle: CSSProperties = {
  fontSize: '0.875rem',
  color: '#6b7280',
};

const paginationControlsStyle: CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'center',
};

const selectStyle: CSSProperties = {
  padding: '0.25rem 0.5rem',
  borderRadius: '0.25rem',
  border: '1px solid #d1d5db',
};

const paginationButtonsContainerStyle: CSSProperties = {
  display: 'flex',
  gap: '0.25rem',
};

const ellipsisStyle: CSSProperties = {
  padding: '0 0.5rem',
};

// Default state styles
const loadingContainerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '2rem',
};

const spinnerStyle: CSSProperties = {
  width: 24,
  height: 24,
  border: '3px solid #e5e7eb',
  borderTopColor: '#3b82f6',
  borderRadius: '50%',
  animation: 'spin 0.75s linear infinite',
};

const emptyStateStyle: CSSProperties = {
  textAlign: 'center',
  padding: '2rem',
  color: '#6b7280',
};

const errorStateStyle: CSSProperties = {
  textAlign: 'center',
  padding: '2rem',
  color: '#ef4444',
  backgroundColor: '#fef2f2',
  borderRadius: '0.5rem',
};

const errorTitleStyle: CSSProperties = {
  fontWeight: 500,
};

const errorMessageStyle: CSSProperties = {
  fontSize: '0.875rem',
};

// Search input style
const searchInputBaseStyle: CSSProperties = {
  padding: '0.5rem 1rem',
  borderRadius: '0.375rem',
  border: '1px solid #d1d5db',
  width: '100%',
  fontSize: '0.875rem',
};

// Action toolbar loading indicator style
const loadingIndicatorStyle: CSSProperties = {
  width: 16,
  height: 16,
};

// ============================================================================
// Generic List Component
// ============================================================================

/**
 * Generic list item type constraint
 */
export interface ListItemBase {
  id: string;
}

/**
 * Generic list props
 */
export interface GenericListProps<T extends ListItemBase> {
  items: T[];
  renderItem: (item: T, isSelected: boolean, index: number) => ReactNode;
  keyExtractor?: (item: T) => string;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  emptyState?: ReactNode;
  className?: string;
  style?: CSSProperties;
  gap?: string | number;
  virtualized?: boolean;
}

/**
 * Generic List component - memoized inner implementation
 */
function GenericListInner<T extends ListItemBase>({
  items,
  renderItem,
  keyExtractor,
  selectedId,
  onSelect,
  emptyState,
  className,
  style,
  gap = '0.5rem',
}: GenericListProps<T>): React.ReactElement {
  const getKey = useCallback(
    (item: T) => (keyExtractor ? keyExtractor(item) : item.id),
    [keyExtractor]
  );

  // Memoize container style
  const containerStyle = useMemo<CSSProperties>(() => ({
    display: 'flex',
    flexDirection: 'column',
    gap: typeof gap === 'number' ? `${gap}px` : gap,
    ...style,
  }), [gap, style]);

  // Item wrapper style - memoized
  const itemWrapperStyle = useMemo<CSSProperties>(() => ({
    cursor: onSelect ? 'pointer' : 'default',
  }), [onSelect]);

  // Stable click handler using data-* attributes
  const handleItemClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const {itemId} = event.currentTarget.dataset;
    if (itemId != null && itemId.length > 0 && onSelect != null) {
      onSelect(selectedId === itemId ? null : itemId);
    }
  }, [onSelect, selectedId]);

  if (items.length === 0 && emptyState != null) {
    return <>{emptyState}</>;
  }

  return (
    <div className={className} style={containerStyle}>
      {items.map((item, index) => (
        <div
          key={getKey(item)}
          data-item-id={item.id}
          onClick={onSelect ? handleItemClick : undefined}
          style={itemWrapperStyle}
        >
          {renderItem(item, selectedId === item.id, index)}
        </div>
      ))}
    </div>
  );
}

/**
 * Memoized GenericList component with preserved generic signature
 */
export const GenericList = memo(GenericListInner) as <T extends ListItemBase>(
  props: GenericListProps<T>
) => React.ReactElement;

// ============================================================================
// Generic Detail View
// ============================================================================

/**
 * Generic detail view props
 */
export interface GenericDetailProps<T> {
  item: T | null | undefined;
  isLoading?: boolean;
  error?: Error | null;
  renderContent: (item: T) => ReactNode;
  renderLoading?: () => ReactNode;
  renderEmpty?: () => ReactNode;
  renderError?: (error: Error) => ReactNode;
}

/**
 * Generic Detail view component - inner implementation
 */
function GenericDetailInner<T>({
  item,
  isLoading,
  error,
  renderContent,
  renderLoading,
  renderEmpty,
  renderError,
}: GenericDetailProps<T>): React.ReactElement {
  if (isLoading === true) {
    return <>{renderLoading?.() || <DefaultLoadingState />}</>;
  }

  if (error != null) {
    return <>{renderError?.(error) || <DefaultErrorState error={error} />}</>;
  }

  if (!item) {
    return <>{renderEmpty?.() || <DefaultEmptyState message="No item selected" />}</>;
  }

  return <>{renderContent(item)}</>;
}

/**
 * Memoized GenericDetail component with preserved generic signature
 */
export const GenericDetail = memo(GenericDetailInner) as <T>(
  props: GenericDetailProps<T>
) => React.ReactElement;

// ============================================================================
// Stats Card Component
// ============================================================================

/**
 * Stats card props
 */
export interface StatsCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * Stats Card component - memoized for performance
 */
export const StatsCard = memo(({
  label,
  value,
  icon,
  trend,
  onClick,
  className,
  style,
}: StatsCardProps): React.ReactElement => {
  // Memoize container style based on props
  const containerStyle = useMemo<CSSProperties>(() => ({
    padding: '1rem',
    backgroundColor: 'var(--color-bg-primary, #fff)',
    borderRadius: 'var(--radius-md, 0.5rem)',
    border: '1px solid var(--color-border-default, #e5e7eb)',
    cursor: onClick ? 'pointer' : 'default',
    transition: 'box-shadow 0.2s, transform 0.2s',
    ...style,
  }), [onClick, style]);

  // Memoize trend style based on direction
  const trendStyle = useMemo<CSSProperties | undefined>(() => {
    if (!trend) return undefined;
    return {
      fontSize: '0.75rem',
      color:
        trend.direction === 'up'
          ? 'var(--color-success, #22c55e)'
          : trend.direction === 'down'
            ? 'var(--color-error, #ef4444)'
            : 'var(--color-text-muted, #6b7280)',
    };
  }, [trend]);

  return (
    <div onClick={onClick} className={className} style={containerStyle}>
      <div style={statsCardHeaderStyle}>
        <span style={statsCardLabelStyle}>{label}</span>
        {icon}
      </div>
      <p style={statsCardValueStyle}>{value}</p>
      {trend && (
        <span style={trendStyle}>
          {trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : ''}
          {Math.abs(trend.value)}%
        </span>
      )}
    </div>
  );
});

StatsCard.displayName = 'StatsCard';

// ============================================================================
// Action Toolbar Component
// ============================================================================

/**
 * Action configuration
 */
export interface ActionConfig {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
}

/**
 * Action toolbar props
 */
export interface ActionToolbarProps {
  actions: ActionConfig[];
  className?: string;
  style?: CSSProperties;
  size?: 'sm' | 'md' | 'lg';
  direction?: 'horizontal' | 'vertical';
}

// Size style constants
const sizeStyles: Record<string, CSSProperties> = {
  sm: { padding: '0.25rem 0.5rem', fontSize: '0.75rem' },
  md: { padding: '0.5rem 1rem', fontSize: '0.875rem' },
  lg: { padding: '0.75rem 1.5rem', fontSize: '1rem' },
};

// Variant style constants
const variantStyles: Record<string, CSSProperties> = {
  primary: { backgroundColor: '#3b82f6', color: '#fff' },
  secondary: { backgroundColor: '#f3f4f6', color: '#374151' },
  danger: { backgroundColor: '#ef4444', color: '#fff' },
  ghost: { backgroundColor: 'transparent', color: '#374151' },
};

/**
 * Action Toolbar component - memoized for performance
 */
export const ActionToolbar = memo(({
  actions,
  className,
  style,
  size = 'md',
  direction = 'horizontal',
}: ActionToolbarProps): React.ReactElement => {
  const getButtonStyle = useCallback(
    (variant: ActionConfig['variant'] = 'secondary', disabled?: boolean): CSSProperties => {
      const base: CSSProperties = {
        ...sizeStyles[size],
        borderRadius: '0.375rem',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontWeight: 500,
        transition: 'background-color 0.2s',
      };

      return { ...base, ...variantStyles[variant] };
    },
    [size]
  );

  // Memoize container style
  const containerStyle = useMemo<CSSProperties>(() => ({
    display: 'flex',
    flexDirection: direction === 'horizontal' ? 'row' : 'column',
    gap: '0.5rem',
    ...style,
  }), [direction, style]);

  // Stable click handler using data-* attributes
  const handleButtonClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    const {actionId} = event.currentTarget.dataset;
    if (actionId) {
      const action = actions.find((a) => a.id === actionId);
      action?.onClick();
    }
  }, [actions]);

  return (
    <div className={className} style={containerStyle}>
      {actions.map((action) => (
        <button
          key={action.id}
          data-action-id={action.id}
          onClick={handleButtonClick}
          disabled={action.disabled || action.loading}
          style={getButtonStyle(action.variant, action.disabled)}
        >
          {action.loading ? (
            <span style={loadingIndicatorStyle}>...</span>
          ) : (
            action.icon
          )}
          {action.label}
        </button>
      ))}
    </div>
  );
});

ActionToolbar.displayName = 'ActionToolbar';

// ============================================================================
// Filter Panel Component
// ============================================================================

/**
 * Filter panel props
 */
export interface FilterPanelProps<TFilters extends Record<string, unknown>> {
  filters: TFilters;
  onChange: (filters: Partial<TFilters>) => void;
  onClear: () => void;
  renderFilters: (
    filters: TFilters,
    onChange: <K extends keyof TFilters>(key: K, value: TFilters[K]) => void
  ) => ReactNode;
  isOpen?: boolean;
  onToggle?: () => void;
  title?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Filter Panel component - inner implementation
 */
function FilterPanelInner<TFilters extends Record<string, unknown>>({
  filters,
  onChange,
  onClear,
  renderFilters,
  isOpen = true,
  onToggle,
  title = 'Filters',
  className,
  style,
}: FilterPanelProps<TFilters>): React.ReactElement | null {
  const handleChange = useCallback(
    <K extends keyof TFilters>(key: K, value: TFilters[K]) => {
      onChange({ [key]: value } as unknown as Partial<TFilters>);
    },
    [onChange]
  );

  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter(
      (v) => v !== undefined && v !== null && v !== ''
    ).length;
  }, [filters]);

  // Memoize panel container style
  const panelContainerStyle = useMemo<CSSProperties>(() => ({
    padding: '1rem',
    backgroundColor: 'var(--color-bg-secondary, #f9fafb)',
    borderRadius: 'var(--radius-md, 0.5rem)',
    marginBottom: '1rem',
    ...style,
  }), [style]);

  if (!isOpen) {
    return onToggle ? (
      <button onClick={onToggle} style={filterToggleButtonStyle}>
        {title}
        {activeFilterCount > 0 && (
          <span style={filterBadgeStyle}>{activeFilterCount}</span>
        )}
      </button>
    ) : null;
  }

  return (
    <div className={className} style={panelContainerStyle}>
      <div style={filterPanelHeaderStyle}>
        <span style={filterTitleStyle}>
          {title}
          {activeFilterCount > 0 && (
            <span style={filterActiveCountStyle}>
              ({activeFilterCount} active)
            </span>
          )}
        </span>
        <div style={filterActionsStyle}>
          <button onClick={onClear} style={clearButtonStyle}>
            Clear all
          </button>
          {onToggle && (
            <button onClick={onToggle} style={closeButtonStyle}>
              Close
            </button>
          )}
        </div>
      </div>
      {renderFilters(filters, handleChange)}
    </div>
  );
}

/**
 * Memoized FilterPanel component with preserved generic signature
 */
export const FilterPanel = memo(FilterPanelInner) as <TFilters extends Record<string, unknown>>(
  props: FilterPanelProps<TFilters>
) => React.ReactElement | null;

// ============================================================================
// Pagination Component
// ============================================================================

/**
 * Pagination props
 */
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  showPageSizeSelector?: boolean;
  showItemCount?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Pagination component - memoized for performance
 */
export const Pagination = memo(({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  showPageSizeSelector = true,
  showItemCount = true,
  className,
  style,
}: PaginationProps): React.ReactElement => {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const pageNumbers = useMemo(() => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);

      if (currentPage > 3) pages.push('ellipsis');

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) pages.push(i);

      if (currentPage < totalPages - 2) pages.push('ellipsis');

      pages.push(totalPages);
    }

    return pages;
  }, [currentPage, totalPages]);

  // Memoize container style
  const containerStyle = useMemo<CSSProperties>(() => ({
    ...paginationContainerBaseStyle,
    ...style,
  }), [style]);

  // Navigation button styles - memoized
  const prevButtonStyle = useMemo<CSSProperties>(() => ({
    padding: '0.25rem 0.75rem',
    borderRadius: '0.25rem',
    border: '1px solid #d1d5db',
    cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
    opacity: currentPage <= 1 ? 0.5 : 1,
    backgroundColor: '#fff',
  }), [currentPage]);

  const nextButtonStyle = useMemo<CSSProperties>(() => ({
    padding: '0.25rem 0.75rem',
    borderRadius: '0.25rem',
    border: '1px solid #d1d5db',
    cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
    opacity: currentPage >= totalPages ? 0.5 : 1,
    backgroundColor: '#fff',
  }), [currentPage, totalPages]);

  // Page button style generator - memoized
  const getPageButtonStyle = useCallback((page: number): CSSProperties => ({
    padding: '0.25rem 0.5rem',
    borderRadius: '0.25rem',
    border: '1px solid',
    borderColor: page === currentPage ? '#3b82f6' : '#d1d5db',
    backgroundColor: page === currentPage ? '#3b82f6' : '#fff',
    color: page === currentPage ? '#fff' : '#374151',
    cursor: 'pointer',
    minWidth: '2rem',
  }), [currentPage]);

  // Stable page change handlers
  const handlePrevClick = useCallback(() => {
    onPageChange(currentPage - 1);
  }, [onPageChange, currentPage]);

  const handleNextClick = useCallback(() => {
    onPageChange(currentPage + 1);
  }, [onPageChange, currentPage]);

  // Stable page number click handler using data-* attributes
  const handlePageClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    const {page} = event.currentTarget.dataset;
    if (page) {
      onPageChange(Number(page));
    }
  }, [onPageChange]);

  // Stable page size change handler
  const handlePageSizeChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    onPageSizeChange?.(Number(event.target.value));
  }, [onPageSizeChange]);

  return (
    <div className={className} style={containerStyle}>
      {showItemCount && (
        <span style={paginationInfoStyle}>
          Showing {startItem}-{endItem} of {totalItems}
        </span>
      )}

      <div style={paginationControlsStyle}>
        {showPageSizeSelector && onPageSizeChange && (
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            style={selectStyle}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} per page
              </option>
            ))}
          </select>
        )}

        <button
          onClick={handlePrevClick}
          disabled={currentPage <= 1}
          style={prevButtonStyle}
        >
          Previous
        </button>

        <div style={paginationButtonsContainerStyle}>
          {pageNumbers.map((page, index) =>
            page === 'ellipsis' ? (
              <span key={`ellipsis-${index}`} style={ellipsisStyle}>
                ...
              </span>
            ) : (
              <button
                key={page}
                data-page={page}
                onClick={handlePageClick}
                style={getPageButtonStyle(page)}
              >
                {page}
              </button>
            )
          )}
        </div>

        <button
          onClick={handleNextClick}
          disabled={currentPage >= totalPages}
          style={nextButtonStyle}
        >
          Next
        </button>
      </div>
    </div>
  );
});

Pagination.displayName = 'Pagination';

// ============================================================================
// Default State Components
// ============================================================================

const DefaultLoadingState = memo((): React.ReactElement => {
  return (
    <div style={loadingContainerStyle}>
      <div style={spinnerStyle} />
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
});

DefaultLoadingState.displayName = 'DefaultLoadingState';

const DefaultEmptyState = memo(({
  message,
}: {
  message: string;
}): React.ReactElement => {
  return (
    <div style={emptyStateStyle}>
      <p>{message}</p>
    </div>
  );
});

DefaultEmptyState.displayName = 'DefaultEmptyState';

const DefaultErrorState = memo(({ error }: { error: Error }): React.ReactElement => {
  return (
    <div style={errorStateStyle}>
      <p style={errorTitleStyle}>Error</p>
      <p style={errorMessageStyle}>{error.message}</p>
    </div>
  );
});

DefaultErrorState.displayName = 'DefaultErrorState';

// ============================================================================
// Search Input Component
// ============================================================================

/**
 * Search input props
 */
export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Search Input component with debouncing - memoized for performance
 */
export const SearchInput = memo(({
  value,
  onChange,
  placeholder = 'Search...',
  debounceMs = 300,
  className,
  style,
}: SearchInputProps): React.ReactElement => {
  const [localValue, setLocalValue] = useState(value);

  // Memoize input style
  const inputStyle = useMemo<CSSProperties>(() => ({
    ...searchInputBaseStyle,
    ...style,
  }), [style]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, debounceMs, onChange, value]);

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Stable change handler
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  }, []);

  return (
    <input
      type="text"
      value={localValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      style={inputStyle}
    />
  );
});

SearchInput.displayName = 'SearchInput';
