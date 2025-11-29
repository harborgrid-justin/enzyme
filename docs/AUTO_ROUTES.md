# Auto-Route Configuration System

> **Define routes once, use everywhere** - The Auto-Route Configuration eliminates route duplication with type-safe, file-system based routing that auto-generates router config, route constants, and navigation items.

---

## Table of Contents

1. [Overview](#overview)
2. [Problem Solved](#problem-solved)
3. [How It Works](#how-it-works)
4. [Route Configuration Schema](#route-configuration-schema)
5. [Adding New Routes](#adding-new-routes)
6. [Advanced Features](#advanced-features)
7. [Benefits](#benefits)
8. [Migration Guide](#migration-guide)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)
11. [Related Documentation](#related-documentation)

---

## Overview

The **Auto-Route Configuration** eliminates the need to define routes in multiple places. Define routes **once** in `route-config.ts`, and they automatically populate everywhere:

- ✅ Router configuration (`router.tsx`)
- ✅ Route constants (`ROUTES` in `app.config.ts`)
- ✅ Navigation menus
- ✅ Type-safe route builders

## Problem Solved

### Before (Manual Route Definition)

Routes were defined in **3+ places**:

```tsx
// ❌ File 1: src/routes/router.tsx
{
  path: '/entities/:id',
  element: <LazyPage><EntityDetailPage /></LazyPage>
}

// ❌ File 2: src/config/app.config.ts
ROUTES: {
  ENTITIES: {
    DETAIL: (id: string) => `/entities/${id}`
  }
}

// ❌ File 3: Manual lazy imports
const EntityDetailPage = lazy(() => import('@/pages/entities/EntityDetailPage'));
```

**Problems**:
- Typos in paths (`/entitie/:id` vs `/entities/:id`)
- Forgotten route constants
- Inconsistent parameter names
- Manual maintenance of 3+ files per route

### After (Auto-Generated)

Routes defined **once**:

```tsx
// ✅ Single source of truth: src/config/route-config.ts
ENTITIES_DETAIL: {
  path: '/entities/:id',
  component: '@/pages/entities/EntityDetailPage',
  layout: 'dashboard',
  isProtected: true,
}
```

Everything else auto-generates:
- ✅ Router paths
- ✅ Route constants (`ROUTES.ENTITIES.DETAIL`)
- ✅ Lazy component imports
- ✅ Type-safe parameter builders

## How It Works

### 1. Define Routes Once

Edit `src/config/route-config.ts`:

```typescript
export const ROUTE_DEFINITIONS: Record<string, RouteConfig> = {
  // Add new route
  PRODUCTS_LIST: {
    path: '/products',
    component: '@/pages/products/ProductListPage',
    layout: 'dashboard',
    isProtected: true,
  },
  
  // Route with parameters
  PRODUCTS_DETAIL: {
    path: '/products/:id',
    component: '@/pages/products/ProductDetailPage',
    layout: 'dashboard',
    isProtected: true,
  },
}
```

### 2. Routes Auto-Populate Everywhere

**Router Configuration** (`router.tsx`):
```tsx
// Auto-generates from route-config.ts
const dashboardRoutes = getRoutesByLayout('dashboard');
// Includes your new PRODUCTS_LIST and PRODUCTS_DETAIL routes
```

**Route Constants** (`ROUTES`):
```tsx
// Auto-available in ROUTES
import { ROUTES } from '@/config';

<Link to={ROUTES.PRODUCTS_LIST}>Products</Link>
<Link to={ROUTES.PRODUCTS_DETAIL('123')}>Product 123</Link>
```

**Component Loading**:
```tsx
// Auto-lazy-loads component from path
const Component = loadComponent('@/pages/products/ProductListPage');
```

## Route Configuration Schema

```typescript
interface RouteConfig {
  path: string;           // Route path (e.g., '/products/:id')
  component: string;      // Component path (e.g., '@/pages/products/ProductDetailPage')
  layout?: 'auth' | 'dashboard' | 'none';  // Which layout wraps this route
  isProtected?: boolean;  // Requires authentication?
  exact?: boolean;        // Exact path match (future use)
}
```

### Path Parameters

Routes with `:param` automatically create type-safe builders:

```typescript
// route-config.ts
PRODUCT_DETAIL: {
  path: '/products/:id',
  // ...
}

// Auto-generates:
ROUTES.PRODUCT_DETAIL('123')  // Returns: '/products/123'
```

### Layouts

Three layout types:

- **`'auth'`**: Uses `AuthLayout` (centered forms, no sidebar)
- **`'dashboard'`**: Uses `DashboardLayout` (sidebar, header, protected)
- **`'none'`**: No layout wrapper (error pages, landing pages)

### Protected Routes

Set `isProtected: true` for routes requiring authentication:

```typescript
DASHBOARD: {
  path: '/dashboard',
  component: '@/pages/DashboardPage',
  layout: 'dashboard',
  isProtected: true,  // ✅ Requires login
}
```

## Adding New Routes

### Example: Add Products Feature

**Step 1**: Add route definitions to `route-config.ts`:

```typescript
export const ROUTE_DEFINITIONS: Record<string, RouteConfig> = {
  // ... existing routes ...
  
  // Products routes
  PRODUCTS_LIST: {
    path: '/products',
    component: '@/pages/products/ProductListPage',
    layout: 'dashboard',
    isProtected: true,
  },
  PRODUCTS_NEW: {
    path: '/products/new',
    component: '@/pages/products/ProductFormPage',
    layout: 'dashboard',
    isProtected: true,
  },
  PRODUCTS_DETAIL: {
    path: '/products/:id',
    component: '@/pages/products/ProductDetailPage',
    layout: 'dashboard',
    isProtected: true,
  },
  PRODUCTS_EDIT: {
    path: '/products/:id/edit',
    component: '@/pages/products/ProductFormPage',
    layout: 'dashboard',
    isProtected: true,
  },
}
```

**Step 2**: Add component imports to `loadComponent` map:

```typescript
export const loadComponent = (componentPath: string): PageComponent => {
  const importPath = componentPath.replace('@/', '../');
  
  const componentMap: Record<string, PageComponent> = {
    // ... existing imports ...
    
    // Add new imports
    '../pages/products/ProductListPage': lazy(() => import('@/pages/products/ProductListPage')),
    '../pages/products/ProductDetailPage': lazy(() => import('@/pages/products/ProductDetailPage')),
    '../pages/products/ProductFormPage': lazy(() => import('@/pages/products/ProductFormPage')),
  };

  return componentMap[importPath] || lazy(() => import('@/pages/NotFoundPage'));
};
```

**Step 3**: Update `app.config.ts` to expose routes (optional):

```typescript
export const ROUTES = {
  // Auto-generated routes
  PRODUCTS_LIST: AUTO_ROUTES.PRODUCTS_LIST as string,
  PRODUCTS_NEW: AUTO_ROUTES.PRODUCTS_NEW as string,
  PRODUCTS_DETAIL: AUTO_ROUTES.PRODUCTS_DETAIL as (id: string) => string,
  PRODUCTS_EDIT: AUTO_ROUTES.PRODUCTS_EDIT as (id: string) => string,
  
  // Or use nested format
  PRODUCTS: {
    LIST: AUTO_ROUTES.PRODUCTS_LIST as string,
    NEW: AUTO_ROUTES.PRODUCTS_NEW as string,
    DETAIL: AUTO_ROUTES.PRODUCTS_DETAIL as (id: string) => string,
    EDIT: AUTO_ROUTES.PRODUCTS_EDIT as (id: string) => string,
  },
}
```

**Step 4**: Use routes anywhere:

```tsx
import { ROUTES } from '@/config';

// In navigation
<Link to={ROUTES.PRODUCTS_LIST}>Products</Link>

// With parameters
<Link to={ROUTES.PRODUCTS.DETAIL('product-123')}>View Product</Link>

// In navigation
navigate(ROUTES.PRODUCTS.EDIT(product.id));
```

**That's it!** No need to touch `router.tsx` - it auto-picks up the new routes.

## Advanced Features

### Helper Functions

```typescript
import { 
  getRoutesByLayout,
  getProtectedRoutes,
  getPublicRoutes
} from '@/config/route-config';

// Get all dashboard routes
const dashboardRoutes = getRoutesByLayout('dashboard');

// Get all protected routes
const protectedRoutes = getProtectedRoutes();

// Get all public routes
const publicRoutes = getPublicRoutes();
```

### Dynamic Component Loading

```typescript
import { loadComponent } from '@/config/route-config';

// Lazy-load any component by path
const ProductPage = loadComponent('@/pages/products/ProductListPage');
```

### Auto-Generated Route Constants

```typescript
import { AUTO_ROUTES } from '@/config/route-config';

// Access raw auto-generated routes
console.log(AUTO_ROUTES.PRODUCTS_LIST);        // '/products'
console.log(AUTO_ROUTES.PRODUCTS_DETAIL('123')); // '/products/123'
```

## Benefits

### 1. Single Source of Truth
- ✅ Define routes once in `route-config.ts`
- ✅ Auto-populates everywhere
- ✅ No duplication or inconsistencies

### 2. Type Safety
- ✅ TypeScript validates all route paths
- ✅ Parameter builders are type-safe
- ✅ Component paths validated at compile-time

### 3. Reduced Errors
- ✅ No typos in route paths
- ✅ No forgotten route constants
- ✅ No mismatched parameter names

### 4. Developer Experience
- ✅ Add routes in one place
- ✅ Autocomplete for all routes
- ✅ Refactor-safe (rename once, updates everywhere)

### 5. Maintainability
- ✅ Clear route organization
- ✅ Easy to see all app routes
- ✅ Consistent naming conventions

## Migration Guide

### From Manual Routes

**Before:**
```tsx
// routes/router.tsx
{
  path: '/users/:id',
  element: <LazyPage><UserDetailPage /></LazyPage>
}

// config/app.config.ts
USERS: {
  DETAIL: (id: string) => `/users/${id}`
}
```

**After:**
```tsx
// config/route-config.ts
USER_DETAIL: {
  path: '/users/:id',
  component: '@/pages/users/UserDetailPage',
  layout: 'dashboard',
  isProtected: true,
}
```

That's it! Everything else auto-generates.

## Best Practices

### 1. Route Naming Convention

Use `FEATURE_ACTION` format:

```typescript
// Good
PRODUCTS_LIST
PRODUCTS_DETAIL
PRODUCTS_EDIT
USER_PROFILE
USER_SETTINGS

// Avoid
PRODUCT_PAGE
LIST_PRODUCTS
EDIT_USER_PAGE
```

### 2. Component Path Consistency

Match route names to component names:

```typescript
PRODUCTS_LIST: {
  path: '/products',
  component: '@/pages/products/ProductListPage',  // ✅ Consistent
}

// Avoid
PRODUCTS_LIST: {
  path: '/products',
  component: '@/pages/products/Index',  // ❌ Unclear
}
```

### 3. Layout Assignment

- Auth pages → `layout: 'auth'`
- App pages → `layout: 'dashboard'`
- Error/landing → `layout: 'none'`

### 4. Protected Routes

Always set `isProtected` explicitly:

```typescript
// Good
LOGIN: {
  path: '/login',
  component: '@/pages/auth/LoginPage',
  layout: 'auth',
  isProtected: false,  // ✅ Explicit
}

DASHBOARD: {
  path: '/dashboard',
  component: '@/pages/DashboardPage',
  layout: 'dashboard',
  isProtected: true,  // ✅ Explicit
}
```

## Troubleshooting

### Route Not Appearing

1. **Check route definition** in `route-config.ts`
2. **Add component import** to `loadComponent` map
3. **Expose route** in `app.config.ts` ROUTES constant
4. **Rebuild** the app (`npm run build`)

### TypeScript Errors

If you see `Property 'X' does not exist on type 'ROUTES'`:

1. Add route to `AUTO_ROUTES` in `app.config.ts`:
```typescript
PRODUCTS_LIST: AUTO_ROUTES.PRODUCTS_LIST as string,
```

2. Ensure proper type casting for parameterized routes:
```typescript
PRODUCTS_DETAIL: AUTO_ROUTES.PRODUCTS_DETAIL as (id: string) => string,
```

### Component Not Loading

If component shows 404 instead of loading:

1. Check component path in `route-config.ts` matches actual file
2. Add import to `loadComponent` map in `route-config.ts`
3. Verify component exports default or named export correctly

## Related Patterns

This auto-route system works seamlessly with:

- **Centralized Config** (`app.config.ts`) - For non-route constants
- **Design Tokens** (`design-tokens.ts`) - For styling constants
- **Feature Flags** (`FEATURES`) - For route-level feature toggling

Together, they provide complete centralization across the app.

## Future Enhancements

Potential improvements:

- [ ] Auto-generate `loadComponent` map from route definitions
- [ ] Route-level permissions (beyond boolean `isProtected`)
- [ ] Route metadata (page titles, breadcrumbs)
- [ ] Automatic sitemap generation from routes
- [ ] Route-based code splitting optimizations

---

## Comparison: Auto-Routes vs File-System Routing

The Enzyme package provides two complementary routing approaches:

### Config-Based Auto-Routes (This Document)

- **Source**: `route-config.ts` - Single configuration file
- **Approach**: Define routes once, auto-generate everywhere
- **Best For**: Traditional applications with explicit route definitions
- **Benefits**: Centralized control, easy to see all routes, simple migration from manual routes
- **Example**: `PRODUCTS_LIST: { path: '/products', component: '@/pages/products/ProductListPage' }`

### File-System Based Routing (Routing Module)

- **Source**: File system - Routes discovered from file structure
- **Approach**: Next.js-style file-based routing with auto-discovery
- **Best For**: Large applications with many routes, Next.js-like developer experience
- **Benefits**: Zero configuration, automatic route generation, visual route structure
- **Example**: `src/pages/products/index.tsx` → `/products`

**See [Routing Module](./routing/README.md) for file-system based routing documentation.**

### Which Approach to Use?

- **Use Config-Based Auto-Routes** if you prefer centralized control and explicit route definitions
- **Use File-System Routing** if you want automatic route discovery and Next.js-style conventions
- **Use Both**: They can coexist - use file-system routing for main app, config-based for specific areas

## Related Documentation

### Routing System

- [**Routing Module**](./routing/README.md) - File-system based routing (alternative approach)
- [**Route Guards**](./routing/GUARDS.md) - Authentication and authorization guards
- [**Route Discovery**](./routing/DISCOVERY.md) - Auto route discovery from file system
- [**Navigation**](./routing/NAVIGATION.md) - Type-safe navigation components
- [**Advanced Routing**](./routing/ADVANCED.md) - Parallel routes, intercepting routes, etc.

### Core Concepts
- [Architecture Overview](./ARCHITECTURE.md) - System design and routing architecture
- [Configuration Guide](./CONFIGURATION.md) - Configuration system overview
- [Config Reference](./CONFIG_REFERENCE.md) - ROUTES constant reference

### Features & Security
- [Feature Architecture](./FEATURES.md) - Feature-based routing
- [Security Guide](./SECURITY.md) - Protected routes and authorization
- [Auth Module](./auth/README.md) - Authentication system
- [RBAC Module](./auth/RBAC.md) - Role-based access control

### Performance
- [Performance Guide](./PERFORMANCE.md) - Route prefetching strategies
- [Layouts Guide](./LAYOUTS.md) - Layout system integration

### Migration
- [Migration Guide](./MIGRATION.md) - Routing migration from other frameworks

---

**The Auto-Route Configuration is the third incredible centralization implementation**, completing the trilogy:

1. Centralized Config (app constants)
2. Design Tokens (styling constants)
3. Auto-Route Config (routing constants)

All three eliminate duplication and reduce errors through a **single source of truth** philosophy.

---

<p align="center">
  <strong>Auto-Route Configuration</strong><br>
  Type-safe, zero-duplication routing
</p>
