# Data Display Components

> High-performance components for displaying tabular data

## Overview

The data display components provide powerful, flexible, and performant solutions for displaying structured data. Both components are fully typed, accessible, and optimized for production use.

---

## DataTable

A feature-rich data table component with sorting, pagination, selection, and custom rendering capabilities.

### Location

```
/home/user/enzyme/src/lib/ui/data/DataTable.tsx
```

### Features

- Sortable columns with custom sort functions
- Client-side and server-side pagination
- Row selection (single and multi-select)
- Custom cell renderers
- Loading and empty states
- Sticky header support
- Keyboard accessible
- Fully typed with generics

### Props

```typescript
interface DataTableProps<T> {
  // Required
  data: T[];                          // Table data
  columns: Column<T>[];               // Column definitions
  rowKey: keyof T | ((row: T) => string); // Unique row key accessor

  // Optional
  isLoading?: boolean;                // Loading state
  emptyState?: ReactNode;             // Custom empty state
  sort?: SortConfig;                  // Current sort configuration
  onSortChange?: (sort: SortConfig | undefined) => void;
  pagination?: PaginationConfig;      // Pagination config
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onRowClick?: (row: T) => void;      // Row click handler
  selectedKeys?: string[];            // Selected row keys
  onSelectionChange?: (keys: string[]) => void;
  selectable?: boolean;               // Enable row selection
  stickyHeader?: boolean;             // Sticky table header
  className?: string;                 // Custom class name
  caption?: string;                   // Table caption for accessibility
}
```

### Column Definition

```typescript
interface Column<T> {
  key: string;                        // Unique column key
  header: string | ReactNode;         // Column header
  accessor: keyof T | ((row: T) => ReactNode); // Data accessor
  width?: string | number;            // Column width
  minWidth?: string | number;         // Min width
  sortable?: boolean;                 // Enable sorting
  sortFn?: (a: T, b: T) => number;   // Custom sort function
  align?: 'left' | 'center' | 'right'; // Cell alignment
  cell?: (value: unknown, row: T, index: number) => ReactNode; // Custom renderer
  hidden?: boolean;                   // Hide column
}
```

### Basic Usage

```typescript
import { DataTable } from '@missionfabric-js/enzyme';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
}

function UserTable() {
  const [users, setUsers] = useState<User[]>([]);

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'Name',
      accessor: 'name',
      sortable: true,
    },
    {
      key: 'email',
      header: 'Email',
      accessor: 'email',
    },
    {
      key: 'role',
      header: 'Role',
      accessor: 'role',
    },
    {
      key: 'status',
      header: 'Status',
      accessor: 'status',
      cell: (value) => (
        <span className={value === 'active' ? 'text-green-600' : 'text-gray-400'}>
          {value}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      data={users}
      columns={columns}
      rowKey="id"
      caption="User list"
    />
  );
}
```

### With Sorting

```typescript
function SortableTable() {
  const [sort, setSort] = useState<SortConfig | undefined>();

  const handleSortChange = (newSort: SortConfig | undefined) => {
    setSort(newSort);
    // Fetch sorted data or sort client-side
  };

  return (
    <DataTable
      data={data}
      columns={columns}
      rowKey="id"
      sort={sort}
      onSortChange={handleSortChange}
    />
  );
}
```

### With Pagination

```typescript
function PaginatedTable() {
  const [pagination, setPagination] = useState({
    page: 0,
    pageSize: 10,
    total: 100,
  });

  const handlePageChange = (page: number) => {
    setPagination({ ...pagination, page });
    // Fetch new page
  };

  const handlePageSizeChange = (pageSize: number) => {
    setPagination({ ...pagination, pageSize, page: 0 });
    // Fetch with new page size
  };

  return (
    <DataTable
      data={data}
      columns={columns}
      rowKey="id"
      pagination={pagination}
      onPageChange={handlePageChange}
      onPageSizeChange={handlePageSizeChange}
    />
  );
}
```

### With Row Selection

```typescript
function SelectableTable() {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  return (
    <DataTable
      data={data}
      columns={columns}
      rowKey="id"
      selectable
      selectedKeys={selectedKeys}
      onSelectionChange={setSelectedKeys}
    />
  );
}
```

### Custom Cell Rendering

```typescript
const columns: Column<User>[] = [
  {
    key: 'avatar',
    header: 'Avatar',
    accessor: 'avatarUrl',
    cell: (value, row) => (
      <img
        src={value as string}
        alt={row.name}
        className="h-8 w-8 rounded-full"
      />
    ),
  },
  {
    key: 'name',
    header: 'Full Name',
    accessor: (row) => `${row.firstName} ${row.lastName}`,
  },
  {
    key: 'actions',
    header: 'Actions',
    accessor: 'id',
    cell: (value, row) => (
      <div className="flex gap-2">
        <button onClick={() => editUser(row)}>Edit</button>
        <button onClick={() => deleteUser(row.id)}>Delete</button>
      </div>
    ),
  },
];
```

### Accessibility

The DataTable includes:
- Proper `<table>` semantic structure
- ARIA `role="status"` for loading state
- ARIA `aria-sort` for sortable columns
- Keyboard navigation for sortable headers
- Screen reader announcements for actions
- Table caption support

---

## VirtualizedDataTable

A high-performance virtualized table for rendering large datasets (100+ rows) efficiently using windowed rendering.

### Location

```
/home/user/enzyme/src/lib/ui/data/VirtualizedDataTable.tsx
```

### Features

- Windowed rendering with react-window
- Only renders visible rows
- Full keyboard navigation
- Smooth scrolling
- Customizable row and header heights
- Accessibility support
- Performance optimized for 1000+ rows

### Props

```typescript
interface VirtualizedDataTableProps<T> {
  // Required
  data: T[];                          // Table data
  columns: VirtualizedColumn<T>[];    // Column definitions
  rowKey: keyof T | ((row: T) => string); // Unique row key accessor
  height: number;                     // Table height in pixels

  // Optional
  rowHeight?: number;                 // Row height (default: 48px)
  headerHeight?: number;              // Header height (default: 48px)
  isLoading?: boolean;                // Loading state
  emptyState?: ReactNode;             // Custom empty state
  onRowClick?: (row: T) => void;      // Row click handler
  className?: string;                 // Custom class name
  overscanCount?: number;             // Rows to render outside viewport (default: 5)
}
```

### Column Definition

```typescript
interface VirtualizedColumn<T> {
  key: string;                        // Unique column key
  header: string | ReactNode;         // Column header
  accessor: keyof T | ((row: T) => ReactNode); // Data accessor
  width?: string | number;            // Column width
  minWidth?: number;                  // Min width
  align?: 'left' | 'center' | 'right'; // Cell alignment
  cell?: (value: unknown, row: T, index: number) => ReactNode; // Custom renderer
}
```

### Basic Usage

```typescript
import { VirtualizedDataTable } from '@missionfabric-js/enzyme';

function LargeDataTable() {
  const [data, setData] = useState<Item[]>([]);

  const columns: VirtualizedColumn<Item>[] = [
    {
      key: 'id',
      header: 'ID',
      accessor: 'id',
      width: 100,
    },
    {
      key: 'name',
      header: 'Name',
      accessor: 'name',
      width: 200,
    },
    {
      key: 'description',
      header: 'Description',
      accessor: 'description',
      // Flexible width
    },
  ];

  return (
    <VirtualizedDataTable
      data={data}
      columns={columns}
      rowKey="id"
      height={600}
      rowHeight={50}
    />
  );
}
```

### When to Use VirtualizedDataTable

Use the `VirtualizedDataTable` when:
- Displaying 100+ rows
- Performance is critical
- Data doesn't require pagination
- Users need to scroll through large lists

Use the regular `DataTable` when:
- Less than 100 rows
- Pagination is preferred
- Features like selection and sorting are needed

### Helper Hook

```typescript
import { useVirtualizationRecommended } from '@missionfabric-js/enzyme';

function AdaptiveTable({ data }: { data: Item[] }) {
  const shouldVirtualize = useVirtualizationRecommended(data.length, 100);

  if (shouldVirtualize) {
    return (
      <VirtualizedDataTable
        data={data}
        columns={columns}
        rowKey="id"
        height={600}
      />
    );
  }

  return (
    <DataTable
      data={data}
      columns={columns}
      rowKey="id"
    />
  );
}
```

### Keyboard Navigation

The VirtualizedDataTable supports full keyboard navigation:
- **Arrow Up/Down**: Navigate between rows
- **Home**: Jump to first row
- **End**: Jump to last row
- **Enter/Space**: Activate row (if `onRowClick` is provided)

### Accessibility

The VirtualizedDataTable includes:
- Proper ARIA roles (`table`, `row`, `cell`, `columnheader`)
- Keyboard navigation with visible focus indicators
- Screen reader support with hidden help text
- Row index announcements for context

### Performance Tips

1. **Memoize Column Definitions**: Prevent unnecessary re-renders
   ```typescript
   const columns = useMemo(() => [...], []);
   ```

2. **Use Fixed Widths**: Improves rendering performance
   ```typescript
   { key: 'id', header: 'ID', accessor: 'id', width: 100 }
   ```

3. **Adjust Overscan**: Balance between smoothness and performance
   ```typescript
   <VirtualizedDataTable overscanCount={10} />
   ```

---

## Code Splitting

For optimal bundle size, use lazy loading:

```typescript
import { lazy, Suspense } from 'react';
import { DataTableFallback } from '@missionfabric-js/enzyme';

const LazyDataTable = lazy(() =>
  import('@missionfabric-js/enzyme').then(m => ({ default: m.DataTable }))
);

function MyComponent() {
  return (
    <Suspense fallback={<DataTableFallback />}>
      <LazyDataTable data={data} columns={columns} rowKey="id" />
    </Suspense>
  );
}
```

## Styling Customization

Both components use theme tokens and can be customized:

```typescript
import { tokens, colorTokens } from '@missionfabric-js/enzyme';

// Customize via className
<DataTable
  className="custom-table"
  data={data}
  columns={columns}
  rowKey="id"
/>

// Custom cell styling
{
  key: 'status',
  header: 'Status',
  accessor: 'status',
  cell: (value) => (
    <span style={{
      padding: tokens.spacing.xs,
      borderRadius: tokens.radius.md,
      backgroundColor: value === 'active'
        ? colorTokens.success.lighter
        : colorTokens.neutral[100],
    }}>
      {value}
    </span>
  ),
}
```

## See Also

- [Feedback Components](/home/user/enzyme/docs/ui/FEEDBACK_COMPONENTS.md) - For loading states
- [Theme Tokens](/home/user/enzyme/docs/theme/DESIGN_TOKENS.md) - For styling
