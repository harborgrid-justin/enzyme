# Route Guards

Route guards are React components that protect routes based on authentication status, user roles, and permissions.

## Overview

The auth module provides several guard components:

- `<RequireAuth>` - Requires authentication
- `<RequireRole>` - Requires specific role(s)
- `<RequirePermission>` - Requires specific permission(s)
- `<AuthGuardLoading>` - Customizable loading component

## RequireAuth

Protects routes by requiring authentication. Redirects unauthenticated users to the login page.

### Import

```tsx
import { RequireAuth } from '@/lib/auth/authGuards';
```

### Props

```tsx
interface RequireAuthProps {
  children: ReactNode;
  redirectTo?: string;
  loadingComponent?: ReactNode;
  fallback?: ReactNode;
}
```

- `children` - Protected content to render
- `redirectTo` - URL to redirect to if not authenticated (default: `/login`)
- `loadingComponent` - Component to show while checking authentication
- `fallback` - Component to show for unauthenticated users (instead of redirecting)

### Basic Usage

```tsx
import { RequireAuth } from '@/lib/auth/authGuards';

function App() {
  return (
    <Routes>
      <Route path="/dashboard" element={
        <RequireAuth>
          <Dashboard />
        </RequireAuth>
      } />
    </Routes>
  );
}
```

### Custom Redirect

```tsx
<RequireAuth redirectTo="/signin">
  <ProtectedPage />
</RequireAuth>
```

### Custom Loading

```tsx
<RequireAuth loadingComponent={<Spinner />}>
  <ProtectedPage />
</RequireAuth>
```

### Fallback Instead of Redirect

```tsx
<RequireAuth fallback={<LoginPrompt />}>
  <ProtectedContent />
</RequireAuth>
```

## RequireRole

Protects routes by requiring specific user roles. Supports single role, multiple roles (any), or all roles.

### Import

```tsx
import { RequireRole } from '@/lib/auth/authGuards';
```

### Props

```tsx
interface RequireRoleProps {
  children: ReactNode;
  roles: Role | Role[];
  requireAll?: boolean;
  redirectTo?: string;
  fallback?: ReactNode;
  loadingComponent?: ReactNode;
}
```

- `children` - Protected content to render
- `roles` - Required role(s)
- `requireAll` - If true, user must have ALL specified roles (default: false)
- `redirectTo` - URL to redirect to if unauthorized (default: `/unauthorized`)
- `fallback` - Component to show for unauthorized users
- `loadingComponent` - Component to show while checking roles

### Basic Usage

```tsx
<RequireRole roles="admin">
  <AdminPanel />
</RequireRole>
```

### Multiple Roles (Any)

```tsx
<RequireRole roles={['admin', 'moderator']}>
  <ModeratorPanel />
</RequireRole>
```

### Multiple Roles (All)

```tsx
<RequireRole roles={['admin', 'superuser']} requireAll>
  <SuperAdminPanel />
</RequireRole>
```

### Custom Fallback

```tsx
<RequireRole
  roles="admin"
  fallback={<AccessDenied message="Admin access required" />}
>
  <AdminSettings />
</RequireRole>
```

## RequirePermission

Protects routes by requiring specific permissions. Supports single permission, multiple permissions (any), or all permissions.

### Import

```tsx
import { RequirePermission } from '@/lib/auth/authGuards';
```

### Props

```tsx
interface RequirePermissionProps {
  children: ReactNode;
  permissions: Permission | Permission[];
  requireAll?: boolean;
  redirectTo?: string;
  fallback?: ReactNode;
  loadingComponent?: ReactNode;
}
```

- `children` - Protected content to render
- `permissions` - Required permission(s)
- `requireAll` - If true, user must have ALL specified permissions (default: false)
- `redirectTo` - URL to redirect to if unauthorized
- `fallback` - Component to show for unauthorized users
- `loadingComponent` - Component to show while checking permissions

### Basic Usage

```tsx
<RequirePermission permissions="documents:create">
  <CreateDocumentButton />
</RequirePermission>
```

### Multiple Permissions (Any)

```tsx
<RequirePermission permissions={['documents:edit', 'documents:delete']}>
  <DocumentActions />
</RequirePermission>
```

### Multiple Permissions (All)

```tsx
<RequirePermission
  permissions={['reports:view', 'reports:export']}
  requireAll
>
  <ExportButton />
</RequirePermission>
```

### Inline Fallback

```tsx
<RequirePermission
  permissions="admin:access"
  fallback={<p>You don't have permission to view this content.</p>}
>
  <AdminContent />
</RequirePermission>
```

## AuthGuardLoading

Customizable loading component for auth guards.

### Import

```tsx
import { AuthGuardLoading } from '@/lib/auth/authGuards';
```

### Props

```tsx
interface AuthGuardLoadingProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
}
```

### Usage

```tsx
<RequireAuth loadingComponent={<AuthGuardLoading message="Checking authentication..." />}>
  <Dashboard />
</RequireAuth>
```

## Composition Patterns

### Nested Guards

```tsx
<RequireAuth>
  <RequireRole roles="manager">
    <RequirePermission permissions="reports:view">
      <ManagerReports />
    </RequirePermission>
  </RequireRole>
</RequireAuth>
```

### Combined Guards Component

```tsx
function ProtectedRoute({ children, roles, permissions }) {
  return (
    <RequireAuth>
      {roles && (
        <RequireRole roles={roles}>
          {permissions ? (
            <RequirePermission permissions={permissions}>
              {children}
            </RequirePermission>
          ) : (
            children
          )}
        </RequireRole>
      )}
      {!roles && permissions && (
        <RequirePermission permissions={permissions}>
          {children}
        </RequirePermission>
      )}
      {!roles && !permissions && children}
    </RequireAuth>
  );
}

// Usage
<ProtectedRoute roles="admin" permissions="users:manage">
  <UserManagement />
</ProtectedRoute>
```

### Route-Level Guards

```tsx
import { Routes, Route } from 'react-router-dom';
import { RequireAuth, RequireRole, RequirePermission } from '@/lib/auth/authGuards';

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />

      {/* Auth required */}
      <Route path="/dashboard" element={
        <RequireAuth>
          <Dashboard />
        </RequireAuth>
      } />

      {/* Admin only */}
      <Route path="/admin/*" element={
        <RequireRole roles="admin">
          <AdminRoutes />
        </RequireRole>
      } />

      {/* Permission-based */}
      <Route path="/reports" element={
        <RequirePermission permissions="reports:view">
          <Reports />
        </RequirePermission>
      } />
    </Routes>
  );
}
```

## Integration with React Router

### React Router v6

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RequireAuth, RequireRole } from '@/lib/auth/authGuards';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/dashboard" element={
          <RequireAuth redirectTo="/login">
            <Dashboard />
          </RequireAuth>
        } />

        <Route path="/admin" element={
          <RequireAuth redirectTo="/login">
            <RequireRole roles="admin" redirectTo="/unauthorized">
              <AdminPanel />
            </RequireRole>
          </RequireAuth>
        } />
      </Routes>
    </BrowserRouter>
  );
}
```

### Outlet-Based Protection

```tsx
import { Outlet } from 'react-router-dom';
import { RequireAuth } from '@/lib/auth/authGuards';

function ProtectedLayout() {
  return (
    <RequireAuth>
      <div className="layout">
        <Sidebar />
        <main>
          <Outlet />
        </main>
      </div>
    </RequireAuth>
  );
}

// In routes
<Route element={<ProtectedLayout />}>
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/profile" element={<Profile />} />
</Route>
```

## Integration with Next.js

### Page-Level Protection

```tsx
// pages/dashboard.tsx
import { RequireAuth } from '@/lib/auth/authGuards';

export default function Dashboard() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}
```

### Layout-Based Protection

```tsx
// components/ProtectedLayout.tsx
import { RequireAuth } from '@/lib/auth/authGuards';

export function ProtectedLayout({ children }) {
  return (
    <RequireAuth loadingComponent={<PageLoader />}>
      <div className="layout">
        <Navbar />
        {children}
        <Footer />
      </div>
    </RequireAuth>
  );
}

// pages/dashboard.tsx
import { ProtectedLayout } from '@/components/ProtectedLayout';

export default function Dashboard() {
  return (
    <ProtectedLayout>
      <DashboardContent />
    </ProtectedLayout>
  );
}
```

### Middleware-Based Protection (Next.js 12+)

```tsx
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token');

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
```

## Error Handling

### Custom Error Boundaries

```tsx
function ErrorBoundary({ children }) {
  return (
    <ErrorBoundary
      fallback={<ErrorScreen />}
      onError={(error) => console.error('Guard error:', error)}
    >
      <RequireAuth fallback={<AccessDenied />}>
        {children}
      </RequireAuth>
    </ErrorBoundary>
  );
}
```

### Graceful Degradation

```tsx
<RequirePermission
  permissions="premium:features"
  fallback={
    <div>
      <h2>Premium Feature</h2>
      <p>Upgrade to access this feature</p>
      <UpgradeButton />
    </div>
  }
>
  <PremiumContent />
</RequirePermission>
```

## Testing

### Testing Protected Components

```tsx
import { render } from '@testing-library/react';
import { RequireAuth } from '@/lib/auth/authGuards';
import { AuthProvider } from '@/lib/auth';

describe('RequireAuth', () => {
  it('renders children for authenticated users', () => {
    const { getByText } = render(
      <AuthProvider initialState={{ isAuthenticated: true }}>
        <RequireAuth>
          <div>Protected Content</div>
        </RequireAuth>
      </AuthProvider>
    );

    expect(getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects unauthenticated users', () => {
    const { queryByText } = render(
      <AuthProvider initialState={{ isAuthenticated: false }}>
        <RequireAuth>
          <div>Protected Content</div>
        </RequireAuth>
      </AuthProvider>
    );

    expect(queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
```

## Best Practices

1. **Place guards as close to protected content as possible**:

   ```tsx
   // Good
   <Route path="/admin" element={
     <RequireRole roles="admin">
       <AdminPanel />
     </RequireRole>
   } />

   // Avoid wrapping entire app
   <RequireAuth>
     <Routes>
       {/* All routes protected */}
     </Routes>
   </RequireAuth>
   ```

2. **Use appropriate guard for the use case**:

   ```tsx
   // Authentication check
   <RequireAuth><Dashboard /></RequireAuth>

   // Role check
   <RequireRole roles="admin"><AdminPanel /></RequireRole>

   // Permission check (more granular)
   <RequirePermission permissions="users:delete"><DeleteButton /></RequirePermission>
   ```

3. **Provide user-friendly fallbacks**:

   ```tsx
   <RequirePermission
     permissions="premium:access"
     fallback={<UpgradePrompt />}
   >
     <PremiumFeature />
   </RequirePermission>
   ```

4. **Handle loading states**:

   ```tsx
   <RequireAuth loadingComponent={<Skeleton />}>
     <Dashboard />
   </RequireAuth>
   ```

## Related Documentation

### Authentication Module
- [Authentication Module](./README.md) - Main authentication documentation
- [Auth Overview](./OVERVIEW.md) - Architecture and guard design
- [Auth Provider](./AUTH_PROVIDER.md) - Provider that powers guards
- [Auth Hooks](./HOOKS.md) - Hooks for programmatic checks
- [RBAC System](./RBAC.md) - Role and permission system
- [Common Patterns](./PATTERNS.md) - Guard usage patterns
- [Type Definitions](./TYPES.md) - Guard prop types
- [Troubleshooting](./TROUBLESHOOTING.md) - Guard-related issues

### Related Systems
- [Routing Module](../routing/README.md) - Route metadata and navigation
- [Security Best Practices](../SECURITY.md) - Access control guidelines
- [State Management](../state/README.md) - Auth state in routes
