# Routing Guide

> Complete guide to the Harbor React routing system including type-safe navigation, auto-discovery, guards, and advanced patterns.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Route Configuration](#route-configuration)
- [Type-Safe Navigation](#type-safe-navigation)
- [Route Guards](#route-guards)
- [Route Discovery](#route-discovery)
- [Route Registry](#route-registry)
- [Prefetching](#prefetching)
- [Lazy Loading](#lazy-loading)
- [Conflict Detection](#conflict-detection)
- [Advanced Patterns](#advanced-patterns)

---

## Overview

The routing system provides:

- **Type-safe route definitions** with automatic parameter inference
- **File-based route discovery** similar to Next.js
- **Built-in guards** for authentication and authorization
- **Predictive prefetching** for faster navigation
- **Runtime route registry** for dynamic route management
- **Conflict detection** to catch issues early

---

## Quick Start

### Basic Router Setup

```tsx
import { createRouter } from '@/lib/routing';
import { RouterProvider } from 'react-router-dom';

// Define routes
const routes = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'users', element: <Users /> },
      { path: 'users/:id', element: <UserDetail /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
];

// Create router with configuration
const router = createRouter({
  routes,
  defaultMeta: {
    requireAuth: true,
  },
});

// Use in app
function App() {
  return <RouterProvider router={router} />;
}
```

### Type-Safe Route Building

```tsx
import { createRouteBuilder } from '@/lib/routing';

// Define route builders with type inference
const routes = {
  home: createRouteBuilder('/'),
  users: createRouteBuilder('/users'),
  userDetail: createRouteBuilder('/users/:id'),
  userPosts: createRouteBuilder('/users/:userId/posts/:postId'),
  search: createRouteBuilder('/search'),
};

// Usage - TypeScript enforces correct parameters
routes.home.build();                          // "/"
routes.userDetail.build({ id: '123' });       // "/users/123"
routes.userPosts.build({
  userId: '1',
  postId: '42'
});                                            // "/users/1/posts/42"

// With query parameters
routes.search.build({}, { q: 'react', page: '1' });
// "/search?q=react&page=1"
```

---

## Route Configuration

### Route Definition Structure

```typescript
interface RouteDefinition {
  path: string;
  element?: React.ReactNode;
  Component?: React.ComponentType;
  lazy?: () => Promise<{ default: React.ComponentType }>;
  children?: RouteDefinition[];
  index?: boolean;
  meta?: RouteMetadata;
  loader?: LoaderFunction;
  action?: ActionFunction;
  errorElement?: React.ReactNode;
  handle?: RouteHandle;
}

interface RouteMetadata {
  // Authentication
  requireAuth?: boolean;
  redirectTo?: string;

  // Authorization
  roles?: Role[];
  permissions?: Permission[];

  // UI
  title?: string;
  icon?: string;
  showInNav?: boolean;

  // Analytics
  analyticsId?: string;
  trackPageView?: boolean;
}
```

### Route Configuration Examples

```tsx
const routes: RouteDefinition[] = [
  // Public route
  {
    path: '/login',
    element: <Login />,
    meta: {
      requireAuth: false,
      title: 'Login',
    },
  },

  // Protected route with role requirement
  {
    path: '/admin',
    element: <AdminLayout />,
    meta: {
      requireAuth: true,
      roles: ['admin'],
      title: 'Admin Dashboard',
    },
    children: [
      {
        index: true,
        element: <AdminHome />,
      },
      {
        path: 'users',
        element: <AdminUsers />,
        meta: {
          permissions: ['users:manage'],
          title: 'User Management',
        },
      },
    ],
  },

  // Lazy loaded route
  {
    path: '/reports',
    lazy: () => import('./pages/Reports'),
    meta: {
      requireAuth: true,
      permissions: ['reports:view'],
    },
  },

  // Route with data loader
  {
    path: '/users/:id',
    element: <UserDetail />,
    loader: async ({ params }) => {
      return fetch(`/api/users/${params.id}`);
    },
    meta: {
      requireAuth: true,
    },
  },
];
```

---

## Type-Safe Navigation

### Using useTypedNavigate

```tsx
import { useTypedNavigate } from '@/lib/routing';

function UserList() {
  const navigate = useTypedNavigate();

  const handleUserClick = (userId: string) => {
    // Type-safe navigation with parameter validation
    navigate('/users/:id', { params: { id: userId } });
  };

  const handleSearch = (query: string) => {
    // With query parameters
    navigate('/search', { query: { q: query, page: '1' } });
  };

  const handleBack = () => {
    // Navigation options
    navigate('/dashboard', { replace: true });
  };

  return (
    <ul>
      {users.map(user => (
        <li key={user.id} onClick={() => handleUserClick(user.id)}>
          {user.name}
        </li>
      ))}
    </ul>
  );
}
```

### AppLink Component

```tsx
import { AppLink, AppNavLink } from '@/lib/routing';

function Navigation() {
  return (
    <nav>
      {/* Basic link */}
      <AppLink to="/dashboard">Dashboard</AppLink>

      {/* Link with parameters */}
      <AppLink
        to="/users/:id"
        params={{ id: '123' }}
      >
        User Profile
      </AppLink>

      {/* NavLink with active state */}
      <AppNavLink
        to="/settings"
        className={({ isActive }) =>
          isActive ? 'nav-link active' : 'nav-link'
        }
      >
        Settings
      </AppNavLink>

      {/* Link with prefetch on hover */}
      <AppLink
        to="/reports"
        prefetch="intent"
      >
        Reports
      </AppLink>
    </nav>
  );
}
```

### Route Parameters Hook

```tsx
import { useRouteInfo } from '@/lib/routing';

function UserDetail() {
  // Get all route information
  const { params, query, pathname, meta } = useRouteInfo();

  // params: { id: '123' }
  // query: { tab: 'profile' }
  // pathname: '/users/123'
  // meta: { requireAuth: true, ... }

  return (
    <div>
      <h1>User {params.id}</h1>
      <Tabs activeTab={query.tab || 'profile'} />
    </div>
  );
}
```

---

## Route Guards

### Authentication Guard

```tsx
import { RequireAuth } from '@/lib/auth';

// Wrap protected content
function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* All nested routes require authentication */}
      <Route element={<RequireAuth />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

// Or wrap individual components
function ProtectedPage() {
  return (
    <RequireAuth fallback={<LoginPrompt />}>
      <SensitiveContent />
    </RequireAuth>
  );
}
```

### Role Guard

```tsx
import { RequireRole } from '@/lib/auth';

function AdminPanel() {
  return (
    <RequireRole
      roles={['admin', 'super_admin']}
      fallback={<AccessDenied />}
    >
      <AdminDashboard />
    </RequireRole>
  );
}

// Route-level role guard
<Route
  path="/admin"
  element={
    <RequireRole roles={['admin']}>
      <AdminLayout />
    </RequireRole>
  }
/>
```

### Permission Guard

```tsx
import { RequirePermission } from '@/lib/auth';

function UserManagement() {
  return (
    <div>
      <h1>Users</h1>
      <UserList />

      {/* Only show if user has write permission */}
      <RequirePermission permissions={['users:create']}>
        <CreateUserButton />
      </RequirePermission>

      {/* Require multiple permissions */}
      <RequirePermission
        permissions={['users:delete', 'users:manage']}
        requireAll={true}
      >
        <BulkDeleteButton />
      </RequirePermission>
    </div>
  );
}
```

### Custom Guard

```tsx
import { canAccessRoute, RouteAuthConfig } from '@/lib/auth';

function CustomGuard({ config, children, fallback }) {
  const { user, isAuthenticated } = useAuth();

  const canAccess = canAccessRoute(config, {
    isAuthenticated,
    roles: user?.roles || [],
    permissions: user?.permissions || [],
  });

  if (!canAccess) {
    return fallback || <Navigate to="/unauthorized" />;
  }

  return children;
}

// Usage
<CustomGuard
  config={{
    requireAuth: true,
    minRole: 'manager',
    requiredPermissions: ['reports:view'],
  }}
>
  <ReportsPage />
</CustomGuard>
```

---

## Route Discovery

### File-Based Route Discovery

The routing system supports automatic route discovery based on file structure:

```
src/
+-- routes/
    +-- index.tsx           -> /
    +-- about.tsx           -> /about
    +-- users/
    |   +-- index.tsx       -> /users
    |   +-- [id].tsx        -> /users/:id
    |   +-- [id]/
    |       +-- posts.tsx   -> /users/:id/posts
    +-- blog/
    |   +-- index.tsx       -> /blog
    |   +-- [...slug].tsx   -> /blog/*
    +-- (admin)/
        +-- dashboard.tsx   -> /admin/dashboard
        +-- settings.tsx    -> /admin/settings
```

### Route Naming Conventions

| Pattern | Description | Example |
|---------|-------------|---------|
| `index.tsx` | Index route | `/users/index.tsx` -> `/users` |
| `[param].tsx` | Dynamic segment | `/users/[id].tsx` -> `/users/:id` |
| `[...param].tsx` | Catch-all | `/blog/[...slug].tsx` -> `/blog/*` |
| `[[param]].tsx` | Optional param | `/users/[[id]].tsx` -> `/users/:id?` |
| `(group)/` | Route group | `/(admin)/` -> routes share layout |
| `_layout.tsx` | Layout wrapper | Wraps sibling routes |
| `_error.tsx` | Error boundary | Error UI for sibling routes |

### Using Auto-Discovery

```tsx
import { scanRouteFiles, buildRouteTree } from '@/lib/routing';

// Scan for route files
const discoveredRoutes = await scanRouteFiles({
  directory: './src/routes',
  extensions: ['.tsx', '.ts'],
  ignore: ['_*', '*.test.*'],
});

// Build route configuration
const routeTree = buildRouteTree(discoveredRoutes);

// Create router
const router = createRouter({
  routes: routeTree,
});
```

### Route File Structure

```tsx
// src/routes/users/[id].tsx
import { RouteDefinition } from '@/lib/routing';

// Export route metadata
export const route: RouteDefinition = {
  meta: {
    requireAuth: true,
    title: 'User Details',
  },
  loader: async ({ params }) => {
    return fetchUser(params.id);
  },
};

// Export component as default
export default function UserDetail() {
  const user = useLoaderData<User>();
  return <UserProfile user={user} />;
}
```

---

## Route Registry

### Runtime Route Management

```tsx
import { RouteRegistry, routeRegistry } from '@/lib/routing';

// Register routes dynamically
routeRegistry.register({
  id: 'user-detail',
  path: '/users/:id',
  component: UserDetail,
  meta: { requireAuth: true },
});

// Get registered route
const route = routeRegistry.get('user-detail');

// Build path with parameters
const path = routeRegistry.buildPath('user-detail', { id: '123' });
// "/users/123"

// Check if route exists
if (routeRegistry.has('admin-panel')) {
  // ...
}

// Get all routes
const allRoutes = routeRegistry.getAll();

// Listen to registry changes
routeRegistry.subscribe((event) => {
  console.log('Route event:', event.type, event.route);
});
```

### Using Route Registry Hook

```tsx
import { useRouteRegistry, useRouteMetadata } from '@/lib/routing';

function DynamicNavigation() {
  const registry = useRouteRegistry();

  // Get all navigable routes
  const navRoutes = registry.getAll().filter(
    route => route.meta?.showInNav
  );

  return (
    <nav>
      {navRoutes.map(route => (
        <AppLink key={route.id} to={route.path}>
          {route.meta?.title || route.id}
        </AppLink>
      ))}
    </nav>
  );
}

function CurrentPageInfo() {
  const meta = useRouteMetadata();

  return (
    <header>
      <h1>{meta?.title || 'Page'}</h1>
      {meta?.description && <p>{meta.description}</p>}
    </header>
  );
}
```

---

## Prefetching

### Hover Prefetching

```tsx
import { usePrefetchHandlers, usePrefetchRoute } from '@/lib/routing';

function NavLink({ to, children }) {
  const prefetchHandlers = usePrefetchHandlers(to);

  return (
    <Link to={to} {...prefetchHandlers}>
      {children}
    </Link>
  );
}

// Or use the hook directly
function UserCard({ userId }) {
  const prefetch = usePrefetchRoute();

  return (
    <div
      onMouseEnter={() => prefetch(`/users/${userId}`)}
      onClick={() => navigate(`/users/${userId}`)}
    >
      {/* ... */}
    </div>
  );
}
```

### Predictive Prefetching

```tsx
import { usePredictivePrefetch, PredictiveLink } from '@/lib/performance';

// Use the predictive link component
function Navigation() {
  return (
    <nav>
      <PredictiveLink to="/dashboard">Dashboard</PredictiveLink>
      <PredictiveLink to="/users">Users</PredictiveLink>
      <PredictiveLink to="/settings">Settings</PredictiveLink>
    </nav>
  );
}

// Or use the hook for custom behavior
function SmartNavigation() {
  const { predictNextRoute, prefetchPredicted } = usePredictivePrefetch();

  useEffect(() => {
    // Prefetch most likely next route
    const predicted = predictNextRoute(currentPath);
    if (predicted && predicted.confidence > 0.7) {
      prefetchPredicted(predicted.path);
    }
  }, [currentPath]);

  return <nav>{/* ... */}</nav>;
}
```

### Prefetch Strategies

```tsx
import { setupPrefetching } from '@/lib/routing';

// Configure prefetching behavior
setupPrefetching({
  // Prefetch on hover after delay
  onHover: {
    enabled: true,
    delay: 100,
  },
  // Prefetch on focus (keyboard navigation)
  onFocus: {
    enabled: true,
  },
  // Prefetch visible links
  onVisible: {
    enabled: true,
    threshold: 0.5,
    rootMargin: '100px',
  },
  // Network-aware prefetching
  networkAware: {
    enabled: true,
    minConnectionQuality: '3g',
    respectDataSaver: true,
  },
});
```

---

## Lazy Loading

### Code Splitting Routes

```tsx
import { createLazyRoute, withSuspense } from '@/lib/routing';

// Define lazy routes
const routes = [
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        path: 'dashboard',
        ...createLazyRoute(() => import('./pages/Dashboard')),
      },
      {
        path: 'users',
        ...createLazyRoute(
          () => import('./pages/Users'),
          { preload: true } // Preload on app start
        ),
      },
      {
        path: 'reports',
        ...createLazyRoute(
          () => import('./pages/Reports'),
          {
            loading: <ReportsSkeleton />,
            error: <ReportsError />,
          }
        ),
      },
    ],
  },
];

// Or wrap existing components
const LazySettings = withSuspense(
  lazy(() => import('./pages/Settings')),
  { fallback: <SettingsSkeleton /> }
);
```

### Route-Level Code Splitting

```tsx
// Using React Router's lazy
const routes = [
  {
    path: '/admin',
    lazy: async () => {
      const { AdminLayout } = await import('./pages/Admin');
      return { Component: AdminLayout };
    },
    children: [
      {
        path: 'users',
        lazy: async () => {
          const { AdminUsers } = await import('./pages/Admin/Users');
          return { Component: AdminUsers };
        },
      },
    ],
  },
];
```

---

## Conflict Detection

### Validating Routes

```tsx
import {
  detectRouteConflicts,
  validateRoutes,
  areRoutesValid,
} from '@/lib/routing';

// Check for conflicts
const conflicts = detectRouteConflicts(routes);

if (conflicts.length > 0) {
  console.error('Route conflicts detected:');
  conflicts.forEach(conflict => {
    console.error(`  ${conflict.type}: ${conflict.message}`);
    console.error(`    Routes: ${conflict.routes.join(', ')}`);
  });
}

// Full validation with warnings
const validation = validateRoutes(routes);

if (!validation.valid) {
  validation.errors.forEach(error => {
    console.error(`ERROR: ${error.message}`);
  });
}

validation.warnings.forEach(warning => {
  console.warn(`WARNING: ${warning.message}`);
});

// Quick validity check
if (!areRoutesValid(routes)) {
  throw new Error('Invalid route configuration');
}
```

### Conflict Types

| Type | Description | Example |
|------|-------------|---------|
| `duplicate` | Same path defined twice | `/users` and `/users` |
| `shadow` | Static shadows dynamic | `/users/new` before `/users/:id` |
| `ambiguous` | Multiple dynamic matches | `/users/:id` and `/users/:userId` |
| `nested-dynamic` | Multiple dynamic in path | `/users/:id/posts/:postId` (OK but warned) |
| `catch-all` | Catch-all before siblings | `/*` before `/about` |

### Auto-Fix Suggestions

```tsx
import { generateFixSuggestions } from '@/lib/routing';

const suggestions = generateFixSuggestions(conflicts);

suggestions.forEach(suggestion => {
  console.log(`Fix for ${suggestion.conflict}:`);
  console.log(`  ${suggestion.description}`);
  console.log(`  Before: ${suggestion.before}`);
  console.log(`  After: ${suggestion.after}`);
});
```

---

## Advanced Patterns

### Nested Layouts

```tsx
const routes = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        path: 'dashboard',
        element: <DashboardLayout />,
        children: [
          { index: true, element: <DashboardHome /> },
          { path: 'analytics', element: <Analytics /> },
          { path: 'reports', element: <Reports /> },
        ],
      },
      {
        path: 'settings',
        element: <SettingsLayout />,
        children: [
          { index: true, element: <GeneralSettings /> },
          { path: 'profile', element: <ProfileSettings /> },
          { path: 'security', element: <SecuritySettings /> },
        ],
      },
    ],
  },
];
```

### Tab-Based Navigation

```tsx
import { useTabParam } from '@/lib/routing';

function UserProfile() {
  const [activeTab, setActiveTab] = useTabParam('info');
  // URL: /users/123?tab=posts

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="info">Info</TabsTrigger>
        <TabsTrigger value="posts">Posts</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="info"><UserInfo /></TabsContent>
      <TabsContent value="posts"><UserPosts /></TabsContent>
      <TabsContent value="settings"><UserSettings /></TabsContent>
    </Tabs>
  );
}
```

### Modal Routes

```tsx
const routes = [
  {
    path: '/users',
    element: <UsersLayout />,
    children: [
      { index: true, element: <UserList /> },
      {
        path: ':id',
        element: <UserModal />,
      },
    ],
  },
];

function UsersLayout() {
  const location = useLocation();
  const background = location.state?.background;

  return (
    <>
      <Routes location={background || location}>
        <Route index element={<UserList />} />
        <Route path=":id" element={<UserDetail />} />
      </Routes>

      {/* Show modal if navigated with background state */}
      {background && (
        <Routes>
          <Route path=":id" element={<UserModal />} />
        </Routes>
      )}
    </>
  );
}

// Link that opens modal
<Link
  to={`/users/${user.id}`}
  state={{ background: location }}
>
  {user.name}
</Link>
```

### Route Animations

```tsx
import { AnimatePresence, motion } from 'framer-motion';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2 }}
      >
        <Routes location={location}>
          {/* routes */}
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}
```

### Breadcrumbs

```tsx
import { useMatches } from 'react-router-dom';

function Breadcrumbs() {
  const matches = useMatches();

  const crumbs = matches
    .filter(match => match.handle?.crumb)
    .map(match => ({
      path: match.pathname,
      label: match.handle.crumb(match.data),
    }));

  return (
    <nav aria-label="Breadcrumb">
      <ol>
        {crumbs.map((crumb, index) => (
          <li key={crumb.path}>
            {index < crumbs.length - 1 ? (
              <Link to={crumb.path}>{crumb.label}</Link>
            ) : (
              <span>{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// Route configuration with breadcrumb handle
const routes = [
  {
    path: '/users',
    handle: { crumb: () => 'Users' },
    element: <Users />,
    children: [
      {
        path: ':id',
        handle: { crumb: (data) => data?.user?.name || 'User' },
        element: <UserDetail />,
        loader: userLoader,
      },
    ],
  },
];
```

---

## API Reference

### createRouter

```typescript
function createRouter(options: CreateRouterOptions): Router;

interface CreateRouterOptions {
  routes: RouteDefinition[];
  defaultMeta?: RouteMetadata;
  basename?: string;
  future?: RouterFutureConfig;
}
```

### createRouteBuilder

```typescript
function createRouteBuilder<T extends string>(
  path: T
): RouteBuilder<ExtractParams<T>>;

interface RouteBuilder<P> {
  build(params?: P, query?: Record<string, string>): string;
  match(pathname: string): P | null;
  path: string;
}
```

### RouteRegistry

```typescript
class RouteRegistry {
  register(route: RegisteredRoute): void;
  unregister(id: string): void;
  get(id: string): RegisteredRoute | undefined;
  getAll(): RegisteredRoute[];
  has(id: string): boolean;
  buildPath(id: string, params?: Record<string, string>): string;
  subscribe(listener: RegistryListener): () => void;
}
```

---

## See Also

### Core Routing
- [Routing Examples](./examples/routing-examples.md) - 25+ practical routing examples
- [Auto-Routes Guide](../../docs/AUTO_ROUTES.md) - File-system based routing
- [Layouts Guide](../../docs/LAYOUTS.md) - Layout and route composition

### Integration
- [Authentication Guide](./AUTHENTICATION.md) - Route guards and protected routes
- [API Documentation](../../docs/API.md) - Route-based data fetching
- [State Management](../../docs/STATE.md) - Route state synchronization

### Optimization
- [Performance Guide](../../docs/PERFORMANCE.md) - Route prefetching and code splitting
- [Configuration Guide](../../docs/CONFIGURATION.md) - Route configuration options
- [Architecture Overview](../../docs/ARCHITECTURE.md) - Routing architecture

### Reference
- [Hooks Reference](../../docs/HOOKS_REFERENCE.md) - Routing hooks
- [Documentation Index](./INDEX.md) - All library documentation
- [Template Index](../../docs/INDEX.md) - Template documentation
