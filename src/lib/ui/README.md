# UI Module

> **Purpose:** Reusable React component library with layout, navigation, feedback, and data display components.

## Overview

The UI module provides a collection of production-ready React components that handle common UI patterns across your
application. These components are designed to be composable, accessible, themeable, and performant out of the box.

Built with consistency and developer experience in mind, each component follows established design patterns, includes
comprehensive TypeScript types, and integrates seamlessly with the theme system for dark mode support and custom
branding.

Whether you're building a dashboard, admin panel, or customer-facing application, this module provides the building
blocks for creating professional user interfaces without reinventing the wheel.

## Key Features

- Fully typed with TypeScript
- Accessible (ARIA attributes, keyboard navigation)
- Themeable with CSS variables
- Dark mode support via theme module
- Responsive and mobile-friendly
- Composable component architecture
- Minimal dependencies
- Performance optimized (lazy loading, virtualization)
- SSR compatible
- Comprehensive documentation

## Quick Start

```tsx
import {
  Page,
  TopNav,
  Sidebar,
  DataTable,
  Spinner,
  useToast,
} from '@/lib/ui';

function Dashboard() {
  const toast = useToast();

  return (
    <Page>
      <TopNav
        items={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Reports', path: '/reports' },
        ]}
        user={{
          name: 'John Doe',
          email: 'john@example.com',
        }}
      />

      <div className="layout">
        <Sidebar
          items={[
            { id: 'home', label: 'Home', icon: 'home', path: '/' },
            { id: 'users', label: 'Users', icon: 'users', path: '/users' },
          ]}
        />

        <main>
          <DataTable
            data={users}
            columns={[
              { key: 'name', label: 'Name', sortable: true },
              { key: 'email', label: 'Email', sortable: true },
            ]}
            onRowClick={(user) => toast.success(`Selected ${user.name}`)}
          />
        </main>
      </div>
    </Page>
  );
}
```

## Exports

### Layout Components

- `Page` - Root page wrapper with consistent structure
- `Sidebar` - Collapsible navigation sidebar
- `TopNav` - Top navigation bar with user menu

### Navigation Components

- `MainNav` - Primary navigation menu
- `Breadcrumbs` - Breadcrumb navigation trail

### Feedback Components

- `Spinner` - Loading spinner with variants
- `SpinnerWithText` - Spinner with loading message
- `LoadingOverlay` - Full-page loading overlay
- `ToastProvider` - Toast notification provider
- `useToast` - Hook for showing toast notifications

### Data Components

- `DataTable` - Sortable, paginated data table
- `VirtualizedDataTable` - Virtualized table for large datasets

### Types

- `PageProps` - Page component props
- `SidebarProps` - Sidebar configuration
- `SidebarItem` - Sidebar menu item
- `TopNavProps` - Top nav configuration
- `NavItem` - Navigation item
- `Column` - Table column definition
- `SortConfig` - Table sorting configuration
- `Toast` - Toast notification object
- `ToastType` - Toast type (success, error, warning, info)

## Architecture

The UI module is organized by component type:

```
/ui/
├── layout/        # Page structure components
│   ├── Page.tsx
│   ├── Sidebar.tsx
│   └── TopNav.tsx
├── navigation/    # Navigation components
│   ├── MainNav.tsx
│   └── Breadcrumbs.tsx
├── feedback/      # User feedback components
│   ├── Spinner.tsx
│   └── Toasts.tsx
└── data/          # Data display components
    ├── DataTable.tsx
    └── VirtualizedDataTable.tsx
```

### Integration Points

- **Theme Module**: Components use theme tokens for styling
- **Routing Module**: Navigation components use type-safe routing
- **Auth Module**: TopNav shows user menu based on auth state
- **State Module**: Toast notifications can update global state

## Common Patterns

### Pattern 1: Application Layout

```tsx
import { Page, TopNav, Sidebar } from '@/lib/ui';

function AppLayout({ children }) {
  return (
    <Page>
      <TopNav
        items={[
          { label: 'Home', path: '/' },
          { label: 'About', path: '/about' },
        ]}
        user={{
          name: user.name,
          avatar: user.avatar,
          menuItems: [
            { label: 'Profile', onClick: () => navigate('/profile') },
            { label: 'Settings', onClick: () => navigate('/settings') },
            { label: 'Logout', onClick: logout },
          ],
        }}
      />

      <div className="layout">
        <Sidebar
          items={sidebarItems}
          collapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        <main className="content">
          {children}
        </main>
      </div>
    </Page>
  );
}
```

### Pattern 2: Data Tables

```tsx
import { DataTable } from '@/lib/ui';

function UserList() {
  const [users, setUsers] = useState([]);
  const [sort, setSort] = useState({ key: 'name', direction: 'asc' });

  const columns = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (user) => (
        <div className="user-cell">
          <img src={user.avatar} alt="" />
          {user.name}
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      render: (user) => (
        <span className={`badge ${user.role}`}>
          {user.role}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (user) => (
        <button onClick={() => editUser(user)}>Edit</button>
      ),
    },
  ];

  return (
    <DataTable
      data={users}
      columns={columns}
      sortConfig={sort}
      onSort={setSort}
      pagination={{
        pageSize: 20,
        currentPage: 1,
        total: users.length,
      }}
      onPageChange={(page) => fetchUsers(page)}
    />
  );
}
```

### Pattern 3: Toast Notifications

```tsx
import { ToastProvider, useToast } from '@/lib/ui';

function App() {
  return (
    <ToastProvider position="top-right" maxToasts={3}>
      <YourApp />
    </ToastProvider>
  );
}

function SaveButton() {
  const toast = useToast();

  const handleSave = async () => {
    try {
      await saveData();
      toast.success('Saved successfully!');
    } catch (error) {
      toast.error('Failed to save', {
        description: error.message,
        duration: 5000,
      });
    }
  };

  return <button onClick={handleSave}>Save</button>;
}
```

### Pattern 4: Loading States

```tsx
import { Spinner, LoadingOverlay } from '@/lib/ui';

// Inline spinner
function ComponentLoading() {
  return (
    <div className="container">
      <Spinner size="lg" />
    </div>
  );
}

// Spinner with text
function DataLoading() {
  return (
    <div className="container">
      <SpinnerWithText text="Loading data..." />
    </div>
  );
}

// Full-page overlay
function PageLoading() {
  const { isLoading } = useApiRequest();

  return (
    <div>
      {isLoading && <LoadingOverlay />}
      <PageContent />
    </div>
  );
}
```

### Pattern 5: Breadcrumb Navigation

```tsx
import { Breadcrumbs } from '@/lib/ui';

function UserProfile({ user }) {
  const breadcrumbs = [
    { label: 'Home', path: '/' },
    { label: 'Users', path: '/users' },
    { label: user.name, path: `/users/${user.id}` },
  ];

  return (
    <div>
      <Breadcrumbs items={breadcrumbs} />
      <h1>{user.name}</h1>
      <ProfileContent />
    </div>
  );
}
```

### Pattern 6: Virtualized Tables (Large Datasets)

```tsx
import { VirtualizedDataTable } from '@/lib/ui';

function LargeDataset() {
  const [data, setData] = useState([]); // 10,000+ rows

  return (
    <VirtualizedDataTable
      data={data}
      columns={columns}
      rowHeight={48}
      height={600} // Container height
      overscan={5} // Rows to render outside viewport
    />
  );
}
```

## Configuration

### Theme Customization

```tsx
// Components use CSS variables from theme module
import { ThemeProvider } from '@/lib/theme';

<ThemeProvider
  theme={{
    colors: {
      primary: '#007bff',
      success: '#28a745',
      error: '#dc3545',
      warning: '#ffc107',
    },
    spacing: {
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
    },
  }}
>
  <App />
</ThemeProvider>
```

### Component Defaults

```tsx
// Configure default props
import { DataTable } from '@/lib/ui';

const DefaultDataTable = (props) => (
  <DataTable
    pagination={{ pageSize: 25 }}
    striped
    hoverable
    {...props}
  />
);
```

## Testing

### Testing UI Components

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable } from '@/lib/ui';

describe('DataTable', () => {
  it('renders data', () => {
    const data = [
      { id: 1, name: 'John' },
      { id: 2, name: 'Jane' },
    ];

    render(
      <DataTable
        data={data}
        columns={[
          { key: 'name', label: 'Name' },
        ]}
      />
    );

    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('Jane')).toBeInTheDocument();
  });

  it('handles sorting', () => {
    const onSort = jest.fn();

    render(
      <DataTable
        data={data}
        columns={[
          { key: 'name', label: 'Name', sortable: true },
        ]}
        onSort={onSort}
      />
    );

    fireEvent.click(screen.getByText('Name'));
    expect(onSort).toHaveBeenCalledWith({
      key: 'name',
      direction: 'asc',
    });
  });
});
```

## Performance Considerations

1. **Virtual Scrolling**: Use VirtualizedDataTable for 1000+ rows
2. **Lazy Loading**: Components code-split automatically
3. **Memoization**: Components use React.memo where beneficial
4. **Bundle Size**: Core ~15KB, data table ~8KB, toasts ~3KB gzipped
5. **Rendering**: Tables only render visible rows

## Troubleshooting

### Issue: Styles Not Applied

**Solution:** Ensure ThemeProvider wraps your app:

```tsx
<ThemeProvider>
  <App />
</ThemeProvider>
```

### Issue: Toast Not Showing

**Solution:** Ensure ToastProvider is rendered:

```tsx
<ToastProvider>
  <App />
</ToastProvider>
```

### Issue: Table Performance with Large Data

**Solution:** Use VirtualizedDataTable:

```tsx
<VirtualizedDataTable data={largeDataset} columns={columns} />
```

### Issue: Sidebar Overlapping Content

**Solution:** Add proper layout structure:

```tsx
<div className="layout" style={{ display: 'flex' }}>
  <Sidebar />
  <main style={{ flex: 1 }}>{children}</main>
</div>
```

## See Also

- [Theme Module](../theme/README.md) - Theming and styling
- [Routing Module](../routing/README.md) - Navigation integration
- [Storybook](https://storybook.js.org/) - Component documentation
- [React Aria](https://react-spectrum.adobe.com/react-aria/) - Accessibility patterns

---

**Version:** 3.0.0
**Last Updated:** 2025-11-27
