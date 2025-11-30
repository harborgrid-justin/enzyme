# Routing Module

> Type-safe file-system routing with automatic route discovery, guards, prefetching, and React Router integration

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Architecture](#architecture)
4. [Exports](#exports)
5. [Quick Start](#quick-start)
6. [File-Based Routing Conventions](#file-based-routing-conventions)
7. [React Router Integration](#react-router-integration)
8. [Common Patterns](#common-patterns)
9. [Core Concepts](#core-concepts)
10. [Configuration](#configuration)
11. [Performance Considerations](#performance-considerations)
12. [Troubleshooting](#troubleshooting)
13. [Best Practices](#best-practices)
14. [Migration Guide](#migration-guide)
15. [Testing](#testing)
16. [Examples](#examples)
17. [Related Documentation](#related-documentation)

## Overview

The `@missionfabric-js/enzyme` routing module provides a Next.js-style file-system routing experience for React Router applications with full TypeScript support. It automatically discovers routes from your file structure, generates type-safe navigation helpers, detects conflicts, and provides powerful guard mechanisms for authorization and feature gating.

This module transforms React Router from a manual routing configuration into an automated, type-safe system that catches routing errors at compile time, prevents route conflicts before deployment, and provides enterprise-grade features like route guards, middleware, parallel routes, and intelligent prefetching.

Perfect for large applications with many routes, this module eliminates boilerplate, prevents routing bugs, and provides a superior developer experience through autocomplete, type checking, and automatic route generation.

## Key Features

- **Auto Route Discovery**: File-system based routing with automatic route scanning
- **Type Safety**: Full TypeScript support with compile-time parameter extraction
- **Route Guards**: Authentication, authorization, and feature flag protection
- **Data Loaders**: Integrated data fetching with React Router loaders
- **Advanced Patterns**: Parallel routes, intercepting routes, catch-all, and route groups
- **Conflict Detection**: Build-time validation and route conflict detection
- **Prefetching**: Intelligent route and data prefetching
- **Navigation Utilities**: Type-safe navigation hooks and components
- **Route Middleware**: Pipeline-based middleware execution
- **Route Analytics**: Navigation tracking and metrics
- **SEO Metadata**: Per-route metadata and title management
- **Automatic Code Splitting**: Per-route lazy loading

## Architecture

The routing module follows a discovery → validation → generation pipeline:

```
File System
     ↓
Auto Scanner (watches for changes)
     ↓
Discovery Engine (parse segments)
     ↓
Conflict Detector (find duplicates)
     ↓
Route Transformer (apply middleware)
     ↓
Route Builder (generate React Router config)
     ↓
Router (with type-safe navigation)
```

### Module Organization

The routing module is organized into several layers:

```
routing/
├── core/              # Framework-agnostic utilities
│   ├── path-utils.ts      # Path building & matching
│   ├── segment-parser.ts  # File-based routing conventions
│   ├── conflict-detector.ts # Route validation
│   └── types.ts           # Type utilities
├── guards/            # Route protection
├── loaders/           # Data fetching
├── discovery/         # Auto route scanning
├── advanced/          # Advanced patterns
├── createRouter.tsx   # Router factory
└── linking.tsx        # Navigation components
```

### Integration Points

The routing module integrates seamlessly with other Enzyme modules:

- **[Auth Module](../auth/README.md)**: Route guards use auth state for user authentication and permissions
- **[RBAC Module](../auth/RBAC.md)**: Role-based and permission-based route guards
- **[Flags Module](../flags/README.md)**: Feature flag gates for conditional route access
- **[Performance Module](../performance/README.md)**: Route-based code splitting and prefetching
- **[Analytics Module](../analytics/README.md)**: Navigation tracking and route metrics

## Exports

### Router Creation

- `createRouter()` - Create React Router from file system with enhanced features
- `createSimpleRouter()` - Create router with minimal configuration
- `createRouteBuilder()` - Build routes programmatically with type safety
- `createRouteDefinition()` - Define single route with metadata

### Type-Safe Navigation

- `AppLink` - Type-safe link component with prefetching (see [NAVIGATION.md](./NAVIGATION.md))
- `useTypedNavigate()` - Type-safe navigation hook with parameter validation
- `useRouteNavigate()` - Alternative navigation hook with route metadata
- `usePrefetchHandlers()` - Prefetch route on hover/focus
- `useRouteMetadata()` - Access route metadata (title, description, etc.)
- `useNavigationAnalytics()` - Track navigation events
- `useBreadcrumbs()` - Automatic breadcrumb generation
- `useActiveRoute()` - Detect if a route is currently active

### Route Discovery

- `scanRouteFiles()` - Scan file system for routes with glob patterns
- `AutoScanner` - Automatic route scanner with watch mode
- `DiscoveryEngine` - Route discovery orchestrator
- `WatchMode` - Hot reload for route changes in development
- `RouteTransformer` - Transform discovered routes with middleware

### Conflict Detection

- `detectRouteConflicts()` - Find route conflicts (duplicates, shadows)
- `detectConflicts()` - Comprehensive conflict analysis with report
- `sortRoutesBySpecificity()` - Order routes by priority
- `generateConflictReport()` - Human-readable conflict report

### Route Guards

- `RequireAuth` - Authentication guard component
- `RequireRole` - Role-based guard component
- `RequirePermission` - Permission-based guard component
- `createAuthGuard()` - Custom auth guard factory
- `createRoleGuard()` - Custom role guard factory
- `createPermissionGuard()` - Custom permission guard factory
- `createFeatureGuard()` - Feature flag guard factory
- `GuardResolver` - Guard evaluation engine

### Advanced Routing

- `ParallelRoutes` - Multiple routes in slots for complex layouts
- `InterceptingRouteManager` - Modal routes and overlays
- `CatchAllRouteManager` - Wildcard routes for dynamic content
- `OptionalSegmentManager` - Optional path segments
- `RouteGroupManager` - Route organization without URL impact
- `MiddlewareChain` - Route middleware pipeline

### Route Building

- `buildPath()` - Build path with parameters and query strings
- `buildRoutePath()` - Generate route path from segments
- `buildRouteTree()` - Build route hierarchy for nested routes
- `matchRoute()` - Match path against pattern
- `extractRouteParams()` - Parse params from path

### Data Loaders

See [LOADERS.md](./LOADERS.md) for complete loader documentation.

### Utilities

- `routeRegistry` - Global route registry for route management
- `validateRoute()` - Validate route definition
- `generateRouteTypeDefinitions()` - Generate TypeScript types
- `buildUrl()` - Construct URLs with query params
- `parseQueryString()` - Parse query parameters

### Types

See [TYPES.md](./TYPES.md) for complete type reference. Key types:

- `RouteDefinition` - Route configuration object
- `RouteParams` - Path parameter types
- `RouteMetadata` - Route metadata (title, description, etc.)
- `RouteGuardResult` - Guard evaluation result
- `DiscoveredRoute` - Auto-discovered route
- `RouteConflict` - Conflict detection result
- `TypedNavigate` - Type-safe navigate function

## Quick Start

### Basic Router Setup

```typescript
import { createRouter } from '@/lib/routing';

const routes = [
  {
    path: '/',
    importFn: () => import('./routes/home'),
  },
  {
    path: '/users/:id',
    importFn: () => import('./routes/users/[id]'),
  }
];

const router = createRouter(routes, {
  errorElement: <ErrorPage />,
  loadingFallback: <LoadingSpinner />,
  prefetchOnHover: true,
});

// In your app
<RouterProvider router={router} />
```

### Type-Safe Navigation

```typescript
import { AppLink, useTypedNavigate } from '@/lib/routing';

// Type-safe link component
<AppLink to="/users/:id" params={{ id: '123' }}>
  View User
</AppLink>

// Type-safe navigation hook
function MyComponent() {
  const { navigateTo } = useTypedNavigate();

  const handleClick = () => {
    navigateTo('/users/:id', { id: '123' }, { replace: true });
  };
}
```

### Route Auto-Discovery

```typescript
import { scanRouteFiles, buildRouteTree } from '@/lib/routing';

// Scan routes from file system (build time)
const routes = await scanRouteFiles(process.cwd(), {
  scanPaths: ['src/routes'],
  extensions: ['.tsx', '.ts'],
  ignorePatterns: ['**/*.test.tsx'],
});

// Build route tree
const routeTree = buildRouteTree(routes, importMap);
const router = createRouter(routeTree);
```

## File-Based Routing Conventions

The module supports Next.js-style file-based routing with comprehensive conventions:

| File/Folder | Route Pattern | Description |
|-------------|---------------|-------------|
| `index.tsx` | `/` | Index route |
| `about.tsx` | `/about` | Static route |
| `[id].tsx` | `/:id` | Dynamic segment |
| `[[id]].tsx` | `/:id?` | Optional segment |
| `[...slug].tsx` | `/*` | Catch-all route (required) |
| `[[...slug]].tsx` | `/*` (optional) | Optional catch-all route |
| `(auth)/login.tsx` | `/login` | Route group (ignored in path) |
| `_layout.tsx` | Layout wrapper | Layout component |
| `@modal/photo.tsx` | Parallel slot | Modal/sidebar slot |
| `(..)photo/[id].tsx` | Intercepting route | Modal intercept from parent |

### File System Example

```
src/pages/
├── index.tsx           → /
├── about.tsx           → /about
├── users/
│   ├── index.tsx       → /users
│   ├── [id].tsx        → /users/:id
│   └── [id]/
│       └── edit.tsx    → /users/:id/edit
├── (auth)/             → Route group (no path segment)
│   ├── login.tsx       → /login
│   └── register.tsx    → /register
├── blog/
│   └── [...slug].tsx   → /blog/* (catch-all)
├── dashboard/
│   ├── @analytics/     → Parallel slot
│   │   └── index.tsx
│   └── [[tab]].tsx     → /dashboard/:tab? (optional)
└── photos/
    └── (..)modal.tsx   → Intercepting route
```

## React Router Integration

Built on React Router v6 with enhanced features:

```typescript
// Standard React Router features
export interface RouteModule {
  default: ComponentType;      // Route component
  loader?: LoaderFunction;     // Data loader
  action?: ActionFunction;     // Form action
  ErrorBoundary?: ComponentType; // Error boundary
  handle?: Record<string, unknown>; // Route metadata
}

// Enhanced features
const router = createRouter(routes, {
  prefetchOnHover: true,      // Automatic prefetching
  prefetchOnFocus: true,      // Focus-based prefetching
  prefetchDelay: 100,         // Delay before prefetch
});
```

## Common Patterns

### Pattern 1: File-System Routes with Type Safety

Automatic route discovery with full type checking:

```typescript
// src/pages/users/[id].tsx
export default function UserProfile() {
  const params = useParams<{ id: string }>();
  return <div>User {params.id}</div>;
}

// Navigate with type checking
function UserList() {
  const navigate = useTypedNavigate();

  return (
    <div>
      <button onClick={() => navigate('/users/:id', {
        params: { id: '123' } // ✅ Type-checked
      })}>
        View User
      </button>
    </div>
  );
}
```

### Pattern 2: Protected Routes with Guards

Declarative route protection with authentication and authorization:

```typescript
// src/pages/admin/dashboard.tsx
import { RequireRole } from '@/lib/routing';

export default function AdminDashboard() {
  return (
    <RequireRole role="admin" fallback={<Unauthorized />}>
      <DashboardContent />
    </RequireRole>
  );
}

// Or use route metadata
export const metadata = {
  auth: {
    required: true,
    roles: ['admin'],
  },
};
```

### Pattern 3: Route Groups for Organization

Organize routes without affecting URLs:

```typescript
// File structure:
// src/pages/(marketing)/
//   ├── index.tsx         → /
//   ├── about.tsx         → /about
//   └── contact.tsx       → /contact
// src/pages/(app)/
//   ├── dashboard.tsx     → /dashboard
//   └── settings.tsx      → /settings

// Groups organize routes without affecting URLs
// Both groups can have their own layouts
```

### Pattern 4: Parallel Routes (Slots)

Render multiple independent routes simultaneously:

```typescript
// src/pages/dashboard/@analytics/index.tsx
export default function Analytics() {
  return <AnalyticsPanel />;
}

// src/pages/dashboard/@activity/index.tsx
export default function Activity() {
  return <ActivityFeed />;
}

// src/pages/dashboard/layout.tsx
export default function DashboardLayout({ analytics, activity }) {
  return (
    <div className="dashboard">
      <div className="sidebar">{activity}</div>
      <div className="main">{analytics}</div>
    </div>
  );
}
```

### Pattern 5: Intercepting Routes (Modals)

Show modal views when navigating from specific locations:

```typescript
// src/pages/photos/[id].tsx
// Full page photo view
export default function PhotoPage() {
  return <PhotoDetailPage />;
}

// src/pages/(.)photos/[id].tsx
// Modal photo view when navigating from gallery
export default function PhotoModal() {
  return (
    <Modal>
      <PhotoDetailPage />
    </Modal>
  );
}

// Interception levels:
// (.) intercepts from same level
// (..) intercepts from parent level
// (...) intercepts from root
```

### Pattern 6: Intelligent Prefetching

Pre-load routes for instant navigation:

```typescript
import { usePrefetchHandlers } from '@/lib/routing';

function Navigation() {
  const { onMouseEnter, onFocus } = usePrefetchHandlers('/dashboard');

  return (
    <Link
      to="/dashboard"
      onMouseEnter={onMouseEnter}
      onFocus={onFocus}
    >
      Dashboard
    </Link>
  );
}

// Or use automatic prefetching
import { setupPrefetching } from '@/lib/routing';

setupPrefetching({
  strategy: 'viewport', // Prefetch when link enters viewport
  delay: 200, // Debounce hover events
});
```

### Pattern 7: Data Loading with Loaders

Pre-fetch data before route renders:

```typescript
// In your route file
export async function loader({ params }) {
  const data = await fetchUser(params.id);
  return { user: data };
}

export default function UserPage() {
  const { user } = useLoaderData();
  return <div>{user.name}</div>;
}
```

### Pattern 8: Lazy Loading with Code Splitting

Automatic code splitting per route:

```typescript
import { lazy } from 'react';
import { createLazyRoute } from '@/lib/routing';

const UserPage = createLazyRoute(() => import('./routes/users/[id]'));

// With preload capability
UserPage.preload(); // Manually trigger preload
```

## Core Concepts

### Path Building

Type-safe path construction with parameter validation:

```typescript
import { buildPath } from '@/lib/routing/core';

// Build paths with parameters
buildPath('/users/:id', { id: '123' }); // '/users/123'
buildPath('/users/:id?', {}); // '/users'
buildPath('/search', {}, { q: 'react' }); // '/search?q=react'
```

### Route Registry

Central registry for route management:

```typescript
import { routeRegistry } from '@/lib/routing';

// Register routes
routeRegistry.register({
  path: '/users/:id',
  displayName: 'User Detail',
  sourceFile: 'src/routes/users/[id].tsx',
  paramNames: ['id'],
  component: UserComponent,
  preload: () => import('./routes/users/[id]'),
});

// Query routes
const route = routeRegistry.getByPath('/users/:id');
const publicRoutes = routeRegistry.getPublicRoutes();

// Prefetch routes
await routeRegistry.prefetchByPath('/users/:id');
```

### Conflict Detection

Build-time route validation:

```typescript
import { detectConflicts } from '@/lib/routing/core';

const result = detectConflicts(routes);

if (result.hasErrors) {
  console.error(result.report);
  // Example conflicts:
  // - Duplicate routes: /users/:id vs /users/:userId
  // - Shadow routes: /users/new shadowed by /users/:id
  // - Ambiguous routes: multiple catch-all at same level
}
```

## Module Documentation

Detailed documentation for each subsystem:

- [**CORE.md**](./CORE.md) - Core routing utilities and type system
- [**GUARDS.md**](./GUARDS.md) - Route guards and authorization
- [**LOADERS.md**](./LOADERS.md) - Data loaders and fetching patterns
- [**ADVANCED.md**](./ADVANCED.md) - Advanced routing patterns
- [**DISCOVERY.md**](./DISCOVERY.md) - Auto route discovery system
- [**NAVIGATION.md**](./NAVIGATION.md) - Navigation components and hooks
- [**TYPES.md**](./TYPES.md) - Type definitions reference

## Configuration

### Router Configuration

Comprehensive router configuration with all available options:

```typescript
import { createRouter } from '@/lib/routing';

const router = createRouter({
  // Route discovery
  routes: './src/pages',
  include: ['**/*.tsx', '**/*.jsx'],
  exclude: ['**/*.test.tsx', '**/_*.tsx'],

  // Guards
  guards: {
    auth: true, // Enable auth guards
    permissions: true, // Enable permission checks
    features: true, // Enable feature flag gates
  },

  // Performance
  prefetch: {
    enabled: true,
    strategy: 'hover', // 'hover' | 'viewport' | 'intent'
  },

  // Code splitting
  lazy: true, // Lazy load all routes

  // Fallbacks
  loading: <PageLoader />,
  error: <ErrorPage />,
  notFound: <NotFoundPage />,

  // Watch mode (dev only)
  watch: import.meta.env.DEV,
});
```

### Route Metadata

Per-route metadata for SEO, auth, and analytics:

```typescript
// In route file
export const metadata = {
  title: 'User Profile',
  description: 'View and edit user profile',

  // SEO
  meta: {
    robots: 'index,follow',
    keywords: ['profile', 'user'],
  },

  // Auth
  auth: {
    required: true,
    roles: ['user'],
    permissions: ['users:read'],
  },

  // Feature flags
  features: {
    required: ['new-profiles'],
    any: ['beta-access', 'early-access'],
  },

  // Analytics
  analytics: {
    pageType: 'profile',
    category: 'user',
  },

  // Prefetch
  prefetch: {
    enabled: true,
    priority: 'high',
  },
};
```

## Performance Considerations

1. **Code Splitting**: Each route automatically split into separate chunk
2. **Prefetching**: Routes prefetched on hover/viewport for instant navigation
3. **Bundle Size**: Core ~18KB, discovery ~8KB, guards ~6KB gzipped
4. **Tree Shaking**: Unused route guards and features tree-shaken
5. **Route Caching**: Discovered routes cached to avoid re-scanning
6. **Watch Mode**: Efficient file watching with debouncing

### Optimization Tips

```typescript
// Enable prefetching for critical routes
<AppLink to="/dashboard" prefetch={true} prefetchDelay={100}>
  Dashboard
</AppLink>

// Preload routes on app initialization
useEffect(() => {
  prefetchRoute('/dashboard');
  prefetchRoute('/profile');
}, []);

// Use parallel loading for independent data
export async function loader({ params }) {
  const [user, posts, comments] = await Promise.all([
    fetchUser(params.id),
    fetchUserPosts(params.id),
    fetchUserComments(params.id),
  ]);
  return { user, posts, comments };
}
```

## Troubleshooting

### Issue: Route Not Found After Adding File

**Solution:** Ensure file matches naming convention and restart dev server:

```bash
# File must export default component
export default function MyPage() { ... }

# Or restart with watch mode
npm run dev
```

### Issue: Type Errors on Navigation

**Solution:** Regenerate route types:

```bash
npm run routes:generate
```

### Issue: Route Conflict Errors

**Solution:** Use conflict detector to identify issues:

```typescript
import { detectRouteConflicts, generateConflictReport } from '@/lib/routing';

const conflicts = detectRouteConflicts(routes);
console.log(generateConflictReport(conflicts));
```

### Issue: Guard Not Working

**Solution:** Ensure guard is registered and providers are present:

```typescript
<AuthProvider>
  <RBACProvider>
    <RouterProvider router={router} />
  </RBACProvider>
</AuthProvider>
```

### Issue: Prefetching Not Working

**Solution:** Check prefetch configuration and ensure routes are registered:

```typescript
// Enable prefetching in router
const router = createRouter(routes, {
  prefetchOnHover: true,
  prefetchDelay: 100,
});

// Or enable per-link
<AppLink to="/dashboard" prefetch={true}>Dashboard</AppLink>
```

## Best Practices

### Route Organization

```
src/routes/
├── _layout.tsx              # Root layout
├── index.tsx                # Home page
├── (auth)/                  # Auth group (path ignored)
│   ├── login.tsx           # /login
│   └── register.tsx        # /register
├── users/
│   ├── _layout.tsx         # Users layout
│   ├── index.tsx           # /users
│   ├── [id].tsx            # /users/:id
│   └── [id]/
│       └── edit.tsx        # /users/:id/edit
└── admin/
    └── [[...slug]].tsx     # /admin/* (catch-all)
```

### Type Safety

```typescript
// Define route paths as const
const routes = {
  home: '/',
  userDetail: '/users/:id',
  userEdit: '/users/:id/edit',
} as const;

// Create type-safe builders
const builders = createRouteBuilders(routes);

// Type-safe navigation
builders.userDetail({ id: '123' }); // '/users/123'
builders.home(); // '/'
```

### Performance

```typescript
// Enable prefetching for better UX
const router = createRouter(routes, {
  prefetchOnHover: true,
  prefetchDelay: 100,
});

// Lazy load routes
export const UserRoutes = lazy(() => import('./routes/users'));

// Preload critical routes
import('./routes/dashboard').then(() => {
  console.log('Dashboard preloaded');
});
```

### Error Handling

```typescript
// Route-level error boundary
export function ErrorBoundary({ error }) {
  return (
    <div>
      <h1>Oops! Something went wrong</h1>
      <pre>{error.message}</pre>
    </div>
  );
}

// Global error element
const router = createRouter(routes, {
  errorElement: <GlobalErrorPage />,
});
```

## Migration Guide

### From React Router

The module is built on React Router, so migration is straightforward:

```typescript
// Before (React Router)
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  }
]);

// After (Enzyme Routing)
import { createRouter } from '@/lib/routing';

const router = createRouter([
  {
    path: '/',
    importFn: () => import('./routes/home'),
  }
], {
  prefetchOnHover: true,
});
```

### Adding Type Safety

```typescript
// 1. Use type-safe builders
import { createRouteBuilder } from '@/lib/routing';

const userRoute = createRouteBuilder('/users/:id');
const path = userRoute({ id: '123' }); // Type-safe!

// 2. Use AppLink for navigation
import { AppLink } from '@/lib/routing';

<AppLink to="/users/:id" params={{ id: '123' }}>
  View User
</AppLink>
```

## Testing

### Testing Routes

```typescript
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { render, screen } from '@testing-library/react';

describe('UserProfile', () => {
  it('renders user profile', () => {
    const router = createMemoryRouter(
      [
        {
          path: '/users/:id',
          element: <UserProfile />,
        },
      ],
      {
        initialEntries: ['/users/123'],
      }
    );

    render(<RouterProvider router={router} />);
    expect(screen.getByText(/user 123/i)).toBeInTheDocument();
  });
});
```

### Testing Guards

```typescript
import { RequireRole } from '@/lib/routing';

describe('AdminDashboard', () => {
  it('shows dashboard for admin', () => {
    render(
      <AuthProvider value={{ user: { role: 'admin' } }}>
        <RequireRole role="admin">
          <AdminDashboard />
        </RequireRole>
      </AuthProvider>
    );

    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
  });

  it('redirects non-admin users', () => {
    render(
      <AuthProvider value={{ user: { role: 'user' } }}>
        <RequireRole role="admin">
          <AdminDashboard />
        </RequireRole>
      </AuthProvider>
    );

    expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
  });
});
```

## Examples

See the [examples](../../examples/routing) directory for complete examples:

- Basic routing setup
- Protected routes with guards
- Data loading patterns
- Advanced routing features
- Breadcrumb navigation
- Route analytics

## API Reference

See the [Type Definitions](./TYPES.md) for complete API documentation.

## Related Documentation

### Core Routing Documentation
- [CORE.md](./CORE.md) - Core routing utilities and type system
- [GUARDS.md](./GUARDS.md) - Route guards and authorization
- [LOADERS.md](./LOADERS.md) - Data loaders and fetching patterns
- [ADVANCED.md](./ADVANCED.md) - Advanced routing patterns
- [DISCOVERY.md](./DISCOVERY.md) - Auto route discovery system
- [NAVIGATION.md](./NAVIGATION.md) - Navigation components and hooks
- [TYPES.md](./TYPES.md) - Type definitions reference

### Authentication & Authorization
- [Auth System](../auth/README.md) - Authentication and authorization
- [Auth Guards](../auth/GUARDS.md) - Authentication route guards
- [Auth Patterns](../auth/PATTERNS.md) - Auth integration patterns
- [RBAC](../auth/RBAC.md) - Role-based access control

### State Management
- [State System](../state/README.md) - State management with routing
- [State Stores](../state/STORES.md) - Route-aware state stores
- [State Hooks](../state/HOOKS.md) - State hooks for routing

### Integration & Data
- [API Integration](../api/README.md) - API calls and loaders
- [API Hooks](../api/HOOKS.md) - Data fetching with routing
- [Feature Flags](../flags/README.md) - Feature flags and gates
- [Routing Integration](../integration/ROUTING_STATE_GUARDS.md) - Routing with state and guards

### Performance & Advanced
- [Performance](../performance/README.md) - Code splitting and optimization
- [Lazy Loading](../performance/LAZY_LOADING.md) - Route lazy loading
