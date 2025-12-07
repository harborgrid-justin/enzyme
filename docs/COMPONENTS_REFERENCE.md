# Components Reference

> **Complete reference for UI components** - Authentication guards, layout components, and utility components.

---

## Table of Contents

1. [Authentication Components](#authentication-components)
2. [Layout Components](#layout-components)
3. [Feature Flag Components](#feature-flag-components)
4. [Error Handling Components](#error-handling-components)
5. [Performance Components](#performance-components)
6. [UI Components](#ui-components)
7. [Form Components](#form-components)

---

## Authentication Components

### RequireAuth

Protects routes that require authentication.

```tsx
import { RequireAuth } from '@/lib/auth';

// Basic usage
<RequireAuth>
  <ProtectedContent />
</RequireAuth>

// With custom fallback
<RequireAuth fallback={<Navigate to="/login" />}>
  <Dashboard />
</RequireAuth>

// With loading state
<RequireAuth
  fallback={<Navigate to="/login" />}
  loadingFallback={<LoadingSpinner />}
>
  <ProtectedContent />
</RequireAuth>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | required | Protected content |
| `fallback` | `ReactNode` | `null` | Shown when not authenticated |
| `loadingFallback` | `ReactNode` | `null` | Shown while checking auth |

### RequireRole

Restricts access based on user roles.

```tsx
import { RequireRole } from '@/lib/auth';

// Single role
<RequireRole roles={['admin']}>
  <AdminPanel />
</RequireRole>

// Multiple roles (any match)
<RequireRole roles={['admin', 'manager']}>
  <ManagementTools />
</RequireRole>

// With fallback
<RequireRole
  roles={['admin']}
  fallback={<AccessDenied message="Admin access required" />}
>
  <AdminSettings />
</RequireRole>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | required | Protected content |
| `roles` | `Role[]` | required | Allowed roles |
| `fallback` | `ReactNode` | `null` | Shown when role not matched |
| `requireAll` | `boolean` | `false` | Require all roles instead of any |

### RequirePermission

Restricts access based on permissions.

```tsx
import { RequirePermission } from '@/lib/auth';

// Single permission
<RequirePermission permissions={['users:create']}>
  <CreateUserButton />
</RequirePermission>

// Multiple permissions
<RequirePermission
  permissions={['reports:view', 'reports:export']}
  requireAll={true}
>
  <ExportButton />
</RequirePermission>

// Hide completely if no permission
<RequirePermission permissions={['admin:access']} fallback={null}>
  <AdminLink />
</RequirePermission>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | required | Protected content |
| `permissions` | `Permission[]` | required | Required permissions |
| `fallback` | `ReactNode` | `null` | Shown when permission denied |
| `requireAll` | `boolean` | `false` | Require all permissions |

### AuthProvider

Provides authentication context to the app.

```tsx
import { AuthProvider } from '@/lib/auth';

function App() {
  return (
    <AuthProvider
      onLogin={(user) => console.log('Logged in:', user)}
      onLogout={() => console.log('Logged out')}
      onError={(error) => captureError(error)}
    >
      <AppContent />
    </AuthProvider>
  );
}
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | required | App content |
| `onLogin` | `(user: User) => void` | - | Login callback |
| `onLogout` | `() => void` | - | Logout callback |
| `onError` | `(error: Error) => void` | - | Error callback |

---

## Layout Components

### AppShell

Main application layout wrapper.

```tsx
import { AppShell } from '@/app';

function App() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
```

### RootLayout

Root layout with sidebar and header.

```tsx
import { RootLayout } from '@/routes/root';

// In router
{
  path: '/',
  element: <RootLayout />,
  children: [
    { path: 'dashboard', element: <Dashboard /> },
    { path: 'products', element: <Products /> },
  ]
}
```

### Sidebar

Responsive sidebar navigation.

```tsx
import { Sidebar } from '@/lib/ui';

<Sidebar
  items={navItems}
  collapsed={isCollapsed}
  onToggle={() => setCollapsed(!isCollapsed)}
  footer={<UserMenu />}
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `NavItem[]` | required | Navigation items |
| `collapsed` | `boolean` | `false` | Collapsed state |
| `onToggle` | `() => void` | - | Toggle callback |
| `header` | `ReactNode` | - | Header content |
| `footer` | `ReactNode` | - | Footer content |

---

## Feature Flag Components

### FlagGate

Conditionally render based on feature flag.

```tsx
import { FlagGate } from '@/lib/flags';

// Basic usage
<FlagGate flag="new_dashboard">
  <NewDashboard />
</FlagGate>

// With fallback
<FlagGate flag="beta_features" fallback={<LegacyView />}>
  <BetaView />
</FlagGate>

// Inverted (show when flag is OFF)
<FlagGate flag="maintenance_mode" invert>
  <NormalContent />
</FlagGate>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `flag` | `string` | required | Feature flag key |
| `children` | `ReactNode` | required | Content when flag is on |
| `fallback` | `ReactNode` | `null` | Content when flag is off |
| `invert` | `boolean` | `false` | Invert flag logic |

### FeatureFlagProvider

Provides feature flag context.

```tsx
import { FeatureFlagProvider } from '@/lib/flags';

function App() {
  return (
    <FeatureFlagProvider
      defaultFlags={defaultFlags}
      source="remote"
      refreshInterval={5 * 60 * 1000}
    >
      <AppContent />
    </FeatureFlagProvider>
  );
}
```

### withFeatureFlag

HOC for feature flag control.

```tsx
import { withFeatureFlag } from '@/lib/flags';

const EnhancedComponent = withFeatureFlag('enhanced_mode', {
  fallback: StandardComponent,
})(EnhancedComponentImpl);

// Usage
<EnhancedComponent />
```

---

## Error Handling Components

### AppErrorBoundary

Top-level error boundary.

```tsx
import { AppErrorBoundary } from '@/app';

function App() {
  return (
    <AppErrorBoundary>
      <AppContent />
    </AppErrorBoundary>
  );
}
```

### ErrorBoundary

Reusable error boundary.

```tsx
import { ErrorBoundary } from '@/lib/ui';

<ErrorBoundary
  fallback={(error, reset) => (
    <ErrorState error={error} onRetry={reset} />
  )}
  onError={(error, info) => {
    captureException(error, info);
  }}
>
  <RiskyComponent />
</ErrorBoundary>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | required | Content to protect |
| `fallback` | `(error, reset) => ReactNode` | required | Error UI |
| `onError` | `(error, info) => void` | - | Error callback |
| `onReset` | `() => void` | - | Reset callback |

### AppSuspenseBoundary

Suspense boundary with loading state.

```tsx
import { AppSuspenseBoundary } from '@/app';

<AppSuspenseBoundary>
  <LazyComponent />
</AppSuspenseBoundary>

// With custom fallback
<AppSuspenseBoundary fallback={<CustomLoader />}>
  <LazyComponent />
</AppSuspenseBoundary>
```

---

## Performance Components

### PerformanceObservatory

Performance monitoring dashboard.

```tsx
import { PerformanceObservatory } from '@/lib/performance';

// Development only
{import.meta.env.DEV && (
  <PerformanceObservatory
    position="bottom-right"
    initiallyOpen={false}
    showResourceTiming
    showLongTasks
  />
)}
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `position` | `'bottom-right' \| 'bottom-left' \| 'top-right' \| 'top-left'` | `'bottom-right'` | Dashboard position |
| `initiallyOpen` | `boolean` | `false` | Start expanded |
| `showResourceTiming` | `boolean` | `true` | Show resource stats |
| `showLongTasks` | `boolean` | `true` | Show long tasks |

### PerformanceProvider

Performance monitoring context.

```tsx
import { PerformanceProvider } from '@/lib/performance';

function App() {
  return (
    <PerformanceProvider
      budgets={{
        LCP: 2500,
        INP: 200,
        CLS: 0.1,
      }}
      onBudgetViolation={(metric, value) => {
        console.warn(`${metric} budget exceeded: ${value}`);
      }}
    >
      <AppContent />
    </PerformanceProvider>
  );
}
```

### PredictiveLink

Link with predictive prefetching.

```tsx
import { PredictiveLink } from '@/lib/performance';

<PredictiveLink to="/products">Products</PredictiveLink>

<PredictiveLink
  to="/dashboard"
  prefetchData={() => queryClient.prefetchQuery(...)}
>
  Dashboard
</PredictiveLink>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `to` | `string` | required | Destination path |
| `children` | `ReactNode` | required | Link content |
| `prefetchData` | `() => void` | - | Custom prefetch function |
| `prefetchOnHover` | `boolean` | `true` | Prefetch on hover |
| `prefetchOnFocus` | `boolean` | `true` | Prefetch on focus |

---

## UI Components

### Button

Styled button component.

```tsx
import { Button } from '@/lib/ui';

<Button variant="primary" size="md" onClick={handleClick}>
  Click Me
</Button>

<Button variant="secondary" size="sm" disabled>
  Disabled
</Button>

<Button variant="danger" loading={isDeleting}>
  Delete
</Button>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'danger' \| 'ghost'` | `'primary'` | Button style |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Button size |
| `disabled` | `boolean` | `false` | Disabled state |
| `loading` | `boolean` | `false` | Loading state |
| `fullWidth` | `boolean` | `false` | Full width |

### Card

Container card component.

```tsx
import { Card } from '@/lib/ui';

<Card>
  <Card.Header>
    <Card.Title>Card Title</Card.Title>
  </Card.Header>
  <Card.Content>
    Card content goes here
  </Card.Content>
  <Card.Footer>
    <Button>Action</Button>
  </Card.Footer>
</Card>
```

### Modal

Modal dialog component.

```tsx
import { Modal } from '@/lib/ui';

<Modal
  open={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
>
  <Modal.Body>
    Are you sure you want to proceed?
  </Modal.Body>
  <Modal.Footer>
    <Button variant="ghost" onClick={() => setIsOpen(false)}>
      Cancel
    </Button>
    <Button onClick={handleConfirm}>
      Confirm
    </Button>
  </Modal.Footer>
</Modal>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | required | Open state |
| `onClose` | `() => void` | required | Close callback |
| `title` | `string` | - | Modal title |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Modal size |
| `closeOnOverlay` | `boolean` | `true` | Close on overlay click |
| `closeOnEscape` | `boolean` | `true` | Close on Escape key |

### Skeleton

Loading skeleton component.

```tsx
import { Skeleton } from '@/lib/ui';

// Text skeleton
<Skeleton variant="text" width="200px" />

// Circle skeleton (avatar)
<Skeleton variant="circular" width={40} height={40} />

// Rectangle skeleton
<Skeleton variant="rectangular" height={200} />

// Custom skeleton
<Skeleton className="h-48 w-full rounded-lg" />
```

### Toast

Toast notification system.

```tsx
import { useToast, Toaster } from '@/lib/ui';

// Add Toaster to app
function App() {
  return (
    <>
      <AppContent />
      <Toaster position="top-right" />
    </>
  );
}

// Use in components
function MyComponent() {
  const { toast } = useToast();

  const handleSuccess = () => {
    toast({
      title: 'Success!',
      description: 'Your changes have been saved.',
      variant: 'success',
    });
  };

  const handleError = () => {
    toast({
      title: 'Error',
      description: 'Something went wrong.',
      variant: 'error',
      duration: 5000,
    });
  };
}
```

---

## Form Components

### Input

Text input component.

```tsx
import { Input } from '@/lib/ui';

<Input
  label="Email"
  type="email"
  placeholder="Enter your email"
  error={errors.email?.message}
/>

<Input
  label="Password"
  type="password"
  {...register('password')}
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | - | Input label |
| `error` | `string` | - | Error message |
| `hint` | `string` | - | Hint text |
| `required` | `boolean` | `false` | Required indicator |

### Select

Select dropdown component.

```tsx
import { Select } from '@/lib/ui';

<Select
  label="Category"
  options={[
    { value: 'electronics', label: 'Electronics' },
    { value: 'clothing', label: 'Clothing' },
  ]}
  value={category}
  onChange={setCategory}
/>
```

### Checkbox

Checkbox component.

```tsx
import { Checkbox } from '@/lib/ui';

<Checkbox
  label="I agree to the terms"
  checked={agreed}
  onChange={(e) => setAgreed(e.target.checked)}
/>
```

### FormField

Form field wrapper with label and error.

```tsx
import { FormField } from '@/lib/ui';

<FormField
  label="Username"
  error={errors.username?.message}
  required
>
  <Input {...register('username')} />
</FormField>
```

---

## Component Composition Patterns

### Compound Components

```tsx
// Card compound component
<Card>
  <Card.Header>
    <Card.Title>Title</Card.Title>
    <Card.Description>Description</Card.Description>
  </Card.Header>
  <Card.Content>Content</Card.Content>
  <Card.Footer>Footer</Card.Footer>
</Card>

// Table compound component
<Table>
  <Table.Header>
    <Table.Row>
      <Table.Head>Name</Table.Head>
      <Table.Head>Email</Table.Head>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    {data.map((item) => (
      <Table.Row key={item.id}>
        <Table.Cell>{item.name}</Table.Cell>
        <Table.Cell>{item.email}</Table.Cell>
      </Table.Row>
    ))}
  </Table.Body>
</Table>
```

### Render Props

```tsx
// DataFetcher with render props
<DataFetcher
  queryKey={['products']}
  queryFn={fetchProducts}
>
  {({ data, isLoading, error }) => {
    if (isLoading) return <Skeleton />;
    if (error) return <ErrorState error={error} />;
    return <ProductList products={data} />;
  }}
</DataFetcher>
```

---

## Related Documentation

### Core Documentation
- [Getting Started](./GETTING_STARTED.md) - Setup and installation
- [Architecture Overview](./ARCHITECTURE.md) - System architecture
- [Design System](./DESIGN_SYSTEM.md) - Design tokens and patterns

### UI Components (Detailed)
- [UI Components](./ui/README.md) - Complete UI component library
- [Data Components](./ui/DATA_COMPONENTS.md) - Tables and data display
- [Layout Components](./ui/LAYOUT_COMPONENTS.md) - Page structure
- [Input Components](./ui/INPUT_COMPONENTS.md) - Forms and buttons
- [Feedback Components](./ui/FEEDBACK_COMPONENTS.md) - Loading and notifications
- [Navigation Components](./ui/NAVIGATION_COMPONENTS.md) - Navigation menus

### Theme & UX
- [Theme System](./theme/README.md) - Theme provider and configuration
- [Design Tokens](./theme/DESIGN_TOKENS.md) - Styling tokens
- [UX Utilities](./ux/README.md) - Loading states and accessibility
- [Accessibility](./ux/ACCESSIBILITY.md) - WCAG compliance

### Advanced Topics
- [Hooks Reference](./HOOKS_REFERENCE.md) - Custom hooks
- [Performance Guide](./PERFORMANCE.md) - Optimization
- [Features Guide](./FEATURES.md) - Feature flags
- [Testing Guide](./TESTING.md) - Testing components

---

<p align="center">
  <strong>Components Reference</strong><br>
  Building blocks for your application
</p>
