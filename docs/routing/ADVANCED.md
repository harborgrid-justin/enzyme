# Advanced Routing

> Advanced routing patterns including parallel routes, intercepting routes, catch-all, and route groups

## Overview

The advanced routing module provides enterprise-grade patterns inspired by Next.js App Router, Remix, and Angular. These patterns enable complex application structures with sophisticated routing requirements.

## Features

- **Parallel Routes**: Render multiple routes simultaneously in slots
- **Intercepting Routes**: Show modal/overlay views for specific navigations
- **Route Groups**: Organize routes without affecting URL structure
- **Catch-All Routes**: Handle dynamic path segments
- **Optional Segments**: Routes with optional path parameters
- **Route Middleware**: Execute code before route rendering

## Installation

```typescript
import {
  ParallelRoutes,
  InterceptingRouteManager,
  RouteGroupManager,
  CatchAllRouteManager,
  OptionalSegmentManager,
  MiddlewareChain,
} from '@/lib/routing/advanced';
```

## Parallel Routes

Render multiple routes simultaneously in named slots.

### Basic Usage

```typescript
import { ParallelRoutes, createParallelRoutes } from '@/lib/routing/advanced';

const parallelRoutes = createParallelRoutes({
  slots: {
    '@modal': {
      name: '@modal',
      component: ModalSlot,
      loading: ModalLoading,
      default: null,
    },
    '@sidebar': {
      name: '@sidebar',
      component: SidebarSlot,
      loading: SidebarLoading,
      default: DefaultSidebar,
    },
  },
  layout: MainLayout,
});
```

### File-System Convention

```
app/
├── @modal/              # Modal slot
│   └── photo/
│       └── [id].tsx    # /photo/:id in modal slot
├── @sidebar/           # Sidebar slot
│   └── profile.tsx    # /profile in sidebar slot
└── page.tsx           # Main content
```

### Usage in Components

```typescript
function Dashboard() {
  return (
    <div className="dashboard">
      {/* Main content */}
      <main>
        <Outlet />
      </main>

      {/* Modal slot */}
      <ParallelSlot name="@modal" />

      {/* Sidebar slot */}
      <ParallelSlot name="@sidebar" />
    </div>
  );
}
```

### Examples

```typescript
// Photo gallery with modal
const photoRoutes = createParallelRoutes({
  slots: {
    '@modal': {
      name: '@modal',
      component: PhotoModal,
    },
  },
});

// Navigate to show photo in modal
navigate('/photos/123'); // Shows photo in modal slot

// Dashboard with multiple panels
const dashboardRoutes = createParallelRoutes({
  slots: {
    '@analytics': AnalyticsPanel,
    '@activity': ActivityPanel,
    '@notifications': NotificationsPanel,
  },
  layout: DashboardLayout,
});
```

## Intercepting Routes

Show modal or overlay views when navigating from specific locations.

### Basic Usage

```typescript
import { createInterceptingRoute, InterceptionLevel } from '@/lib/routing/advanced';

const photoInterceptor = createInterceptingRoute({
  pattern: '/photos/:id',
  level: InterceptionLevel.SAME_LEVEL,
  interceptComponent: PhotoModal,
  fullComponent: PhotoPage,
  allowedOrigins: ['/feed', '/gallery'],
});
```

### Interception Levels

```typescript
enum InterceptionLevel {
  CURRENT = '.',      // Intercept from same directory
  PARENT = '..',      // Intercept from parent
  GRANDPARENT = '...', // Intercept from grandparent
  ROOT = '....',      // Intercept from root
}
```

### File-System Convention

```
app/
├── feed/
│   └── (..)photo/         # Intercept /photo from feed
│       └── [id].tsx       # Modal view
└── photo/
    └── [id].tsx           # Full page view
```

### Examples

```typescript
// Photo modal from feed
// File: app/feed/(..)photo/[id].tsx
export default function PhotoModal({ params }: { params: { id: string } }) {
  return (
    <Modal>
      <Photo id={params.id} />
    </Modal>
  );
}

// Full photo page
// File: app/photo/[id].tsx
export default function PhotoPage({ params }: { params: { id: string } }) {
  return (
    <div className="photo-page">
      <Photo id={params.id} />
    </div>
  );
}
```

### Interception Context

```typescript
import { useInterceptionContext } from '@/lib/routing/advanced';

function PhotoView() {
  const context = useInterceptionContext();

  if (context.isIntercepted) {
    // Show modal view
    return <Modal onClose={context.goBack}>{/* Photo */}</Modal>;
  }

  // Show full page
  return <div className="full-page">{/* Photo */}</div>;
}
```

## Route Groups

Organize routes logically without affecting URL structure.

### Basic Usage

```typescript
import { createRouteGroup } from '@/lib/routing/advanced';

const authGroup = createRouteGroup({
  name: 'auth',
  layout: AuthLayout,
  guards: [authGuard],
  meta: {
    requiresAuth: true,
  },
});
```

### File-System Convention

```
app/
├── (auth)/              # Group: doesn't appear in URL
│   ├── login.tsx       # /login (not /auth/login)
│   └── register.tsx    # /register (not /auth/register)
├── (marketing)/        # Another group
│   ├── about.tsx       # /about
│   └── pricing.tsx     # /pricing
└── page.tsx           # /
```

### Examples

```typescript
// Authentication routes group
const authGroup = createRouteGroup({
  name: 'auth',
  layout: AuthLayout,  // Shared layout for login/register
  middleware: [logAnalytics],
  meta: {
    public: true,
    analytics: { section: 'auth' },
  },
});

// Admin routes group
const adminGroup = createRouteGroup({
  name: 'admin',
  layout: AdminLayout,
  guards: [requireRole('admin')],
  middleware: [logAdminAccess, checkPermissions],
  meta: {
    requiresAuth: true,
    section: 'admin',
  },
});

// Feature-based grouping
const experimentalGroup = createRouteGroup({
  name: 'experimental',
  guards: [requireFeature('experimental-features')],
  meta: {
    beta: true,
  },
});
```

### Nested Groups

```
app/
├── (marketing)/
│   ├── (home)/
│   │   └── page.tsx        # /
│   └── (about)/
│       └── page.tsx        # /about
└── (dashboard)/
    ├── (analytics)/
    │   └── page.tsx        # /analytics
    └── (settings)/
        └── page.tsx        # /settings
```

## Catch-All Routes

Handle dynamic path segments and create flexible routing.

### Basic Usage

```typescript
import { createCatchAllRoute } from '@/lib/routing/advanced';

const docsRoute = createCatchAllRoute({
  basePath: '/docs',
  paramName: 'slug',
  optional: false,
  component: DocsPage,
  maxSegments: 10,
  validateSegment: (segment) => /^[a-z0-9-]+$/.test(segment),
});
```

### File-System Convention

```
app/
├── docs/
│   └── [...slug].tsx      # Matches /docs/* (required)
├── blog/
│   └── [[...slug]].tsx    # Matches /blog/* (optional, also /blog)
└── api/
    └── [...path].tsx      # Matches /api/*
```

### Examples

```typescript
// Documentation with nested paths
// File: app/docs/[...slug].tsx
export default function DocsPage() {
  const { segments } = useCatchAllParams();

  // /docs/getting-started/installation
  // segments = ['getting-started', 'installation']

  return <DocsContent path={segments.join('/')} />;
}

// Blog with optional category
// File: app/blog/[[...slug]].tsx
export default function BlogPage() {
  const { segments, isBase } = useCatchAllParams();

  if (isBase) {
    // /blog (no segments)
    return <BlogHome />;
  }

  // /blog/category/post
  const [category, ...rest] = segments;
  return <BlogPost category={category} slug={rest.join('/')} />;
}

// API routes
// File: app/api/[...path].tsx
export async function loader({ params }: { params: { path: string[] } }) {
  const apiPath = params.path.join('/');

  const response = await fetch(`/api/${apiPath}`);
  return response.json();
}
```

### Catch-All Props

```typescript
interface CatchAllRouteComponentProps {
  segments: readonly string[];   // Captured segments
  joinedPath: string;            // Segments joined with /
  depth: number;                 // Number of segments
  isBase: boolean;               // True if no segments
}
```

## Optional Segments

Routes with optional path parameters.

### Basic Usage

```typescript
import { createOptionalSegment } from '@/lib/routing/advanced';

const paginationSegment = createOptionalSegment({
  name: 'page',
  defaultValue: 1,
  validate: (value) => !isNaN(parseInt(value)),
  transform: (value) => parseInt(value),
  allowedValues: undefined,
});
```

### File-System Convention

```
app/
├── posts/
│   └── [[page]].tsx       # /posts or /posts/2
└── users/
    └── [id]/
        └── [[tab]].tsx    # /users/123 or /users/123/settings
```

### Examples

```typescript
// Pagination with optional page
// File: app/posts/[[page]].tsx
export default function PostsPage() {
  const { page = 1 } = useParams();

  return (
    <div>
      <PostList page={parseInt(page)} />
      <Pagination currentPage={parseInt(page)} />
    </div>
  );
}

// User profile with optional tab
// File: app/users/[id]/[[tab]].tsx
export default function UserProfile() {
  const { id, tab = 'overview' } = useParams();

  return (
    <div>
      <UserHeader userId={id} />
      <Tabs activeTab={tab}>
        <Tab name="overview">...</Tab>
        <Tab name="posts">...</Tab>
        <Tab name="settings">...</Tab>
      </Tabs>
    </div>
  );
}

// Category filter
// File: app/products/[[category]].tsx
export async function loader({ params }: { params: { category?: string } }) {
  const category = params.category || 'all';

  const products = await fetchProducts({ category });

  return { products, category };
}
```

### Builder Patterns

```typescript
import { createOptionalRoute } from '@/lib/routing/advanced';

const route = createOptionalRoute({
  basePath: '/products',
  segments: [
    {
      name: 'category',
      defaultValue: 'all',
      allowedValues: ['electronics', 'clothing', 'books'],
    },
    {
      name: 'sort',
      defaultValue: 'popular',
      allowedValues: ['popular', 'price', 'rating'],
    },
  ],
  component: ProductsPage,
});

// Generates paths:
// /products
// /products/electronics
// /products/electronics/price
```

## Route Middleware

Execute code before route rendering.

### Basic Usage

```typescript
import { createMiddleware, createMiddlewareChain } from '@/lib/routing/advanced';

const loggingMiddleware = createMiddleware({
  name: 'logging',
  handler: async (context, next) => {
    console.log(`Navigating to: ${context.path}`);
    await next();
    console.log(`Rendered: ${context.path}`);
  },
});

const authMiddleware = createMiddleware({
  name: 'auth',
  handler: async (context, next) => {
    if (!context.user?.isAuthenticated) {
      context.redirect('/login');
      return;
    }
    await next();
  },
});

// Create middleware chain
const chain = createMiddlewareChain([
  loggingMiddleware,
  authMiddleware,
]);
```

### Built-In Middleware

```typescript
import {
  createLoggingMiddleware,
  createAuthMiddleware,
  createRoleMiddleware,
  createRateLimitMiddleware,
  createAnalyticsMiddleware,
} from '@/lib/routing/advanced';

// Logging
const logger = createLoggingMiddleware({
  level: 'info',
  logNavigations: true,
});

// Authentication
const auth = createAuthMiddleware({
  loginPath: '/login',
  publicPaths: ['/login', '/register'],
});

// Role-based access
const roleCheck = createRoleMiddleware({
  requiredRoles: ['admin'],
  redirectTo: '/unauthorized',
});

// Rate limiting
const rateLimiter = createRateLimitMiddleware({
  maxRequests: 100,
  windowMs: 60000, // 1 minute
});

// Analytics
const analytics = createAnalyticsMiddleware({
  trackPageViews: true,
  trackClicks: true,
});
```

### Middleware Composition

```typescript
import { compose, parallel, conditional } from '@/lib/routing/advanced';

// Sequential execution
const sequential = compose([
  loggingMiddleware,
  authMiddleware,
  analyticsMiddleware,
]);

// Parallel execution
const parallel = parallel([
  analyticsMiddleware,
  metricsMiddleware,
]);

// Conditional execution
const conditional = conditional(
  (context) => context.path.startsWith('/admin'),
  adminMiddleware
);
```

### Examples

```typescript
// Request timing middleware
const timingMiddleware = createMiddleware({
  name: 'timing',
  handler: async (context, next) => {
    const start = Date.now();
    await next();
    const duration = Date.now() - start;
    console.log(`Route rendered in ${duration}ms`);
  },
});

// Error handling middleware
const errorMiddleware = createMiddleware({
  name: 'error-handler',
  handler: async (context, next) => {
    try {
      await next();
    } catch (error) {
      console.error('Route error:', error);
      context.redirect('/error');
    }
  },
});

// Feature flag middleware
const featureMiddleware = createMiddleware({
  name: 'feature-check',
  handler: async (context, next) => {
    const features = context.data.features as Record<string, boolean>;

    if (!features['new-ui']) {
      context.redirect('/old-ui');
      return;
    }

    await next();
  },
});
```

## Nested Routes

Combine advanced patterns for complex route structures.

### Example: Admin Dashboard

```
app/
├── (admin)/                    # Route group
│   ├── _layout.tsx            # Admin layout
│   ├── @sidebar/              # Parallel route (sidebar)
│   │   └── nav.tsx
│   ├── dashboard/
│   │   └── page.tsx           # /dashboard
│   ├── users/
│   │   ├── page.tsx           # /users
│   │   ├── [id]/
│   │   │   ├── page.tsx      # /users/:id
│   │   │   └── (..)modal.tsx  # Intercepting route
│   │   └── [[filter]].tsx     # /users or /users/:filter
│   └── docs/
│       └── [...slug].tsx      # /docs/*
```

## Dynamic Routes

Advanced dynamic segment handling.

### Nested Dynamic Segments

```
app/
├── [org]/
│   ├── [repo]/
│   │   ├── issues/
│   │   │   └── [number].tsx   # /:org/:repo/issues/:number
│   │   └── pulls/
│   │       └── [number].tsx   # /:org/:repo/pulls/:number
│   └── settings.tsx           # /:org/settings
```

### Mixed Segments

```
app/
├── blog/
│   ├── [year]/
│   │   ├── [month]/
│   │   │   └── [slug].tsx     # /blog/:year/:month/:slug
│   │   └── [[...rest]].tsx    # /blog/:year/*
│   └── category/
│       └── [name].tsx         # /blog/category/:name
```

## Route Transitions

Handle route transitions with animations.

```typescript
import { useRouteTransition } from '@/lib/routing/advanced';

function Page() {
  const { isTransitioning, direction } = useRouteTransition();

  return (
    <div
      className={cn(
        'page',
        isTransitioning && 'transitioning',
        direction && `direction-${direction}`
      )}
    >
      {/* Page content */}
    </div>
  );
}
```

## Best Practices

### Route Organization

```
app/
├── (marketing)/           # Public marketing pages
│   ├── _layout.tsx
│   ├── page.tsx          # /
│   ├── about.tsx         # /about
│   └── pricing.tsx       # /pricing
├── (app)/                # Main application
│   ├── _layout.tsx
│   ├── dashboard/
│   ├── projects/
│   └── settings/
└── (admin)/              # Admin panel
    ├── _layout.tsx
    └── users/
```

### Performance

```typescript
// Use parallel routes for independent content
<ParallelRoutes slots={{
  '@main': MainContent,
  '@sidebar': Sidebar,     // Loads independently
  '@analytics': Analytics, // Can defer loading
}} />

// Use intercepting routes for modals
// Prevents full page load for quick interactions

// Use optional segments for pagination
// Reduces route duplication
```

### Type Safety

```typescript
// Define route parameters
interface RouteParams {
  org: string;
  repo: string;
  number: string;
}

// Use in loaders
export async function loader({ params }: { params: RouteParams }) {
  const issue = await fetchIssue(
    params.org,
    params.repo,
    params.number
  );
  return { issue };
}
```

## Related Documentation

- [Core Routing](./CORE.md)
- [Route Guards](./GUARDS.md)
- [Route Discovery](./DISCOVERY.md)
- [Type Definitions](./TYPES.md)
