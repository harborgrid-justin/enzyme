# Routing Module

> Type-safe, auto-discovery routing system for React Router with enterprise-grade features

## Overview

The `@missionfabric-js/enzyme` routing module provides a comprehensive, type-safe routing solution built on React Router. It combines automatic route discovery, compile-time type checking, and enterprise features like guards, middleware, and advanced routing patterns.

## Key Features

- **Auto Route Discovery**: File-system based routing with automatic route scanning
- **Type Safety**: Full TypeScript support with compile-time parameter extraction
- **Route Guards**: Authentication, authorization, and feature flag protection
- **Data Loaders**: Integrated data fetching with React Router loaders
- **Advanced Patterns**: Parallel routes, intercepting routes, catch-all, and route groups
- **Conflict Detection**: Build-time validation and route conflict detection
- **Prefetching**: Intelligent route and data prefetching
- **Navigation Utilities**: Type-safe navigation hooks and components

## Architecture

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

The module supports Next.js-style file-based routing:

| File/Folder | Route Pattern | Description |
|-------------|---------------|-------------|
| `index.tsx` | `/` | Index route |
| `about.tsx` | `/about` | Static route |
| `[id].tsx` | `/:id` | Dynamic segment |
| `[[id]].tsx` | `/:id?` | Optional segment |
| `[...slug].tsx` | `/*` | Catch-all route |
| `(auth)/login.tsx` | `/login` | Route group (ignored in path) |
| `_layout.tsx` | Layout wrapper | Layout component |

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

## Route Patterns

### Protected Routes

```typescript
import { createAuthGuard, createRoleGuard } from '@/lib/routing/guards';

const authGuard = createAuthGuard({
  loginPath: '/login',
  returnUrlParam: 'returnUrl',
});

const adminGuard = createRoleGuard({
  requiredRoles: ['admin'],
  redirectTo: '/unauthorized',
});
```

### Data Loading

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

### Lazy Loading

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

## Contributing

When adding new routing features:

1. Keep core utilities framework-agnostic (in `core/`)
2. Add proper TypeScript types
3. Include conflict detection if needed
4. Add documentation and examples
5. Write tests for new functionality

## Related Documentation

- [State Management](../state/README.md)
- [Form Handling](../forms/README.md)
- [API Integration](../api/README.md)
