# Routing Module

> **Purpose:** Type-safe file-system routing with automatic route discovery, guards, prefetching, and React Router
> integration.

## Overview

The Routing module provides a Next.js-style file-system routing experience for React Router applications with full
TypeScript support. It automatically discovers routes from your file structure, generates type-safe navigation helpers,
detects conflicts, and provides powerful guard mechanisms for authorization and feature gating.

This module transforms React Router from a manual routing configuration into an automated, type-safe system that catches
routing errors at compile time, prevents route conflicts before deployment, and provides enterprise-grade features like
route guards, middleware, parallel routes, and intelligent prefetching.

Perfect for large applications with many routes, this module eliminates boilerplate, prevents routing bugs, and provides
a superior developer experience through autocomplete, type checking, and automatic route generation.

## Key Features

- Automatic route discovery from file system
- Type-safe route building with autocomplete
- Compile-time path parameter validation
- Route conflict detection and resolution
- Authentication and role-based route guards
- Permission-based access control
- Feature flag route gates
- Route middleware pipeline
- Parallel routes (slots)
- Intercepting routes (modals)
- Catch-all and optional segments
- Route groups for organization
- Automatic code splitting per route
- Intelligent route prefetching
- Watch mode for hot reload
- Route analytics and metrics
- SEO metadata per route
- Route validation and auto-fix

## Quick Start

```tsx
import { createRouter, useTypedNavigate } from '@/lib/routing';

// 1. Create router from file system
const router = createRouter({
  routes: './src/pages',
  fallback: <NotFound />,
});

function App() {
  return <RouterProvider router={router} />;
}

// 2. Type-safe navigation
function Navigation() {
  const navigate = useTypedNavigate();

  return (
    <div>
      {/* TypeScript ensures these paths exist and params are correct */}
      <button onClick={() => navigate('/dashboard')}>
        Dashboard
      </button>

      <button onClick={() => navigate('/users/:id', { params: { id: '123' } })}>
        User Profile
      </button>

      {/* Compile error if route doesn't exist */}
      <button onClick={() => navigate('/nonexistent')}>
        {/* ❌ Type error */}
      </button>
    </div>
  );
}
```

## Exports

### Router Creation

- `createRouter()` - Create React Router from file system
- `createSimpleRouter()` - Create router with minimal config
- `createRouteBuilder()` - Build routes programmatically
- `createRouteDefinition()` - Define single route

### Type-Safe Navigation

- `useTypedNavigate()` - Type-safe navigation hook
- `usePrefetchHandlers()` - Prefetch route on hover
- `useRouteMetadata()` - Access route metadata
- `useNavigationAnalytics()` - Track navigation events

### Route Discovery

- `scanRouteFiles()` - Scan file system for routes
- `AutoScanner` - Automatic route scanner
- `DiscoveryEngine` - Route discovery orchestrator
- `WatchMode` - Hot reload for route changes
- `RouteTransformer` - Transform discovered routes

### Conflict Detection

- `detectRouteConflicts()` - Find route conflicts
- `detectConflicts()` - Comprehensive conflict analysis
- `sortRoutesBySpecificity()` - Order routes by priority
- `generateConflictReport()` - Human-readable conflict report

### Route Guards

- `RequireAuth` - Authentication guard component
- `RequireRole` - Role-based guard
- `RequirePermission` - Permission-based guard
- `createRoleGuard()` - Custom role guard factory
- `createPermissionGuard()` - Custom permission guard
- `createFeatureGuard()` - Feature flag guard
- `GuardResolver` - Guard evaluation engine

### Advanced Routing

- `ParallelRoutes` - Multiple routes in slots
- `InterceptingRouteManager` - Modal routes
- `CatchAllRouteManager` - Wildcard routes
- `OptionalSegmentManager` - Optional path segments
- `RouteGroupManager` - Route organization

### Route Building

- `buildPath()` - Build path with params
- `buildRoutePath()` - Generate route path
- `buildRouteTree()` - Build route hierarchy
- `matchRoute()` - Match path against pattern
- `extractRouteParams()` - Parse params from path

### Utilities

- `routeRegistry` - Global route registry
- `validateRoute()` - Validate route definition
- `generateRouteTypeDefinitions()` - Generate TypeScript types
- `buildUrl()` - Construct URLs with query params
- `parseQueryString()` - Parse query parameters

### Types

- `RouteDefinition` - Route configuration object
- `RouteParams` - Path parameter types
- `RouteMetadata` - Route metadata (title, description, etc.)
- `RouteGuardResult` - Guard evaluation result
- `DiscoveredRoute` - Auto-discovered route
- `RouteConflict` - Conflict detection result
- `TypedNavigate` - Type-safe navigate function

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

### File System Convention

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
└── dashboard/
    └── [[tab]].tsx     → /dashboard/:tab? (optional)
```

### Integration Points

- **Auth Module**: Route guards and user permissions
- **Flags Module**: Feature-gated routes
- **Performance**: Route-based code splitting and prefetching
- **Analytics**: Navigation tracking

## Common Patterns

### Pattern 1: File-System Routes with Type Safety

```tsx
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

```tsx
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

```tsx
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

```tsx
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

```tsx
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

// (.) intercepts from same level
// (..) intercepts from parent level
// (...) intercepts from root
```

### Pattern 6: Intelligent Prefetching

```tsx
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

## Configuration

### Router Configuration

```tsx
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

```tsx
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

## Testing

### Testing Routes

```tsx
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

```tsx
import { RequireRole } from '@/lib/routing';

describe('AdminDashboard', () => {
  it('shows dashboard for admin', () => {
    const { container } = render(
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

## Performance Considerations

1. **Code Splitting**: Each route automatically split into separate chunk
2. **Prefetching**: Routes prefetched on hover/viewport for instant navigation
3. **Bundle Size**: Core ~18KB, discovery ~8KB, guards ~6KB gzipped
4. **Tree Shaking**: Unused route guards and features tree-shaken
5. **Route Caching**: Discovered routes cached to avoid re-scanning
6. **Watch Mode**: Efficient file watching with debouncing

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

```tsx
import { detectRouteConflicts, generateConflictReport } from '@/lib/routing';

const conflicts = detectRouteConflicts(routes);
console.log(generateConflictReport(conflicts));
```

### Issue: Guard Not Working

**Solution:** Ensure guard is registered and providers are present:

```tsx
<AuthProvider>
  <RBACProvider>
    <RouterProvider router={router} />
  </RBACProvider>
</AuthProvider>
```

## See Also

- [Route Discovery](./discovery/README.md)
- [Route Guards](./guards/README.md)
- [Advanced Routing](./advanced/README.md)
- [React Router Documentation](https://reactrouter.com/)
- [Auth Module](../auth/README.md) - Route guards
- [Flags Module](../flags/README.md) - Feature gates
- [Performance Module](../performance/README.md) - Route prefetching

---

**Version:** 3.0.0
**Last Updated:** 2025-11-27
