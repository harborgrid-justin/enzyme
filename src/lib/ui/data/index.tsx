/**
 * @file Data Components Index
 * @description Export all data display components with code splitting support
 */

import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';

// ============================================================================
// Direct Exports (for SSR and immediate use)
// ============================================================================

export {
  DataTable,
  type DataTableProps,
  type Column,
  type SortConfig,
  type PaginationConfig,
} from './DataTable';

// ============================================================================
// Lazy Exports (for code splitting - use with Suspense)
// ============================================================================

/**
 * Lazy-loaded DataTable component for code splitting
 * Use when the table is not immediately visible (e.g., below the fold, in tabs)
 *
 * @example
 * ```tsx
 * import { LazyDataTable, DataTableFallback } from '@/lib/ui/data';
 *
 * <Suspense fallback={<DataTableFallback />}>
 *   <LazyDataTable data={data} columns={columns} rowKey="id" />
 * </Suspense>
 * ```
 */
export const LazyDataTable = lazy(() =>
  import('./DataTable').then((module) => ({ default: module.DataTable as ComponentType<unknown> }))
);

// ============================================================================
// Fallback Components
// ============================================================================

/**
 * Default fallback component for lazy-loaded DataTable
 */
export function DataTableFallback({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}): ReactNode {
  return (
    <div
      className="data-table-skeleton"
      role="status"
      aria-label="Loading table..."
      style={{
        width: '100%',
        borderRadius: '0.25rem',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
      }}
    >
      {/* Header skeleton */}
      <div
        style={{
          display: 'flex',
          backgroundColor: '#f9fafb',
          borderBottom: '1px solid #e5e7eb',
          padding: '0.75rem 1rem',
          gap: '1rem',
        }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={`header-${i}`}
            style={{
              flex: 1,
              height: '1rem',
              backgroundColor: '#e5e7eb',
              borderRadius: '0.25rem',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />
        ))}
      </div>

      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          style={{
            display: 'flex',
            padding: '0.75rem 1rem',
            gap: '1rem',
            borderBottom: rowIndex < rows - 1 ? '1px solid #e5e7eb' : 'none',
          }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={`cell-${rowIndex}-${colIndex}`}
              style={{
                flex: 1,
                height: '1rem',
                backgroundColor: '#f3f4f6',
                borderRadius: '0.25rem',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                animationDelay: `${(rowIndex * columns + colIndex) * 50}ms`,
              }}
            />
          ))}
        </div>
      ))}

      {/* CSS for pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Wrapped Components with Suspense
// ============================================================================

/**
 * Pre-wrapped LazyDataTable with built-in Suspense boundary
 * Convenience component for simpler usage without explicit Suspense
 *
 * @example
 * ```tsx
 * import { SuspenseDataTable } from '@/lib/ui/data';
 *
 * <SuspenseDataTable
 *   data={data}
 *   columns={columns}
 *   rowKey="id"
 *   fallback={<CustomSkeleton />}
 * />
 * ```
 */
export function SuspenseDataTable<T>({
  fallback,
  ...props
}: {
  fallback?: ReactNode;
} & Parameters<typeof LazyDataTable>[0]): ReactNode {
  return (
    <Suspense fallback={fallback ?? <DataTableFallback />}>
      <LazyDataTable {...props} />
    </Suspense>
  );
}
