# Data Loaders

> Type-safe data fetching patterns for React Router loaders

## Overview

Data loaders integrate with React Router's loader API to provide type-safe data fetching for routes. This module provides patterns, utilities, and best practices for loading data before route components render.

## Features

- **Type-Safe Loaders**: Full TypeScript support for loader data
- **Error Handling**: Standardized error handling and reporting
- **Loading States**: Integration with route-level loading UI
- **Data Prefetching**: Pre-load data on link hover/focus
- **Caching**: Built-in caching strategies
- **Parallel Loading**: Load multiple data sources concurrently

## React Router Loader API

Loaders run before route components render, enabling fast page transitions with pre-loaded data.

### Basic Loader

```typescript
// In your route file: routes/users/[id].tsx
import { LoaderFunction } from 'react-router-dom';

interface UserData {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export const loader: LoaderFunction = async ({ params }) => {
  const response = await fetch(`/api/users/${params.id}`);

  if (!response.ok) {
    throw new Response('User not found', { status: 404 });
  }

  const user = await response.json();
  return { user };
};

export default function UserPage() {
  const { user } = useLoaderData() as UserData;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

### Type-Safe Loaders

```typescript
import { LoaderFunctionArgs, useLoaderData } from 'react-router-dom';

// Define loader data type
interface DashboardLoaderData {
  stats: {
    totalUsers: number;
    totalPosts: number;
    totalComments: number;
  };
  recentActivity: Activity[];
  userProfile: UserProfile;
}

// Type-safe loader
export async function loader({ request, params }: LoaderFunctionArgs): Promise<DashboardLoaderData> {
  const [stats, activity, profile] = await Promise.all([
    fetchStats(),
    fetchRecentActivity(),
    fetchUserProfile(),
  ]);

  return {
    stats,
    recentActivity: activity,
    userProfile: profile,
  };
}

// Type-safe data access
export default function DashboardPage() {
  const data = useLoaderData() as DashboardLoaderData;

  return (
    <div>
      <h1>Dashboard</h1>
      <Stats data={data.stats} />
      <Activity items={data.recentActivity} />
    </div>
  );
}
```

## Loader Patterns

### Parallel Data Loading

Load multiple data sources concurrently for better performance.

```typescript
export async function loader({ params }: LoaderFunctionArgs) {
  // Load all data in parallel
  const [user, posts, comments] = await Promise.all([
    fetchUser(params.id),
    fetchUserPosts(params.id),
    fetchUserComments(params.id),
  ]);

  return { user, posts, comments };
}
```

### Sequential Data Loading

When one request depends on another:

```typescript
export async function loader({ params }: LoaderFunctionArgs) {
  // Load user first
  const user = await fetchUser(params.id);

  // Then load data that depends on user
  const [posts, settings] = await Promise.all([
    fetchUserPosts(user.id),
    fetchUserSettings(user.preferences),
  ]);

  return { user, posts, settings };
}
```

### Error Handling

```typescript
export async function loader({ params }: LoaderFunctionArgs) {
  try {
    const user = await fetchUser(params.id);

    if (!user) {
      throw new Response('User not found', {
        status: 404,
        statusText: 'Not Found',
      });
    }

    return { user };
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }

    // Log and re-throw as 500
    console.error('Failed to load user:', error);
    throw new Response('Internal Server Error', { status: 500 });
  }
}

// Error boundary in route
export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div>
        <h1>{error.status} {error.statusText}</h1>
        <p>{error.data}</p>
      </div>
    );
  }

  return <div>An unexpected error occurred</div>;
}
```

### Abort on Navigation

Cancel pending requests when user navigates away:

```typescript
export async function loader({ request }: LoaderFunctionArgs) {
  const response = await fetch('/api/users', {
    signal: request.signal, // Abort on navigation
  });

  return await response.json();
}
```

### Query Parameters

Access and validate query parameters:

```typescript
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') ?? '1', 10);
  const limit = parseInt(url.searchParams.get('limit') ?? '10', 10);
  const sort = url.searchParams.get('sort') ?? 'createdAt';

  const users = await fetchUsers({
    page,
    limit,
    sort,
  });

  return { users, page, limit, sort };
}
```

### Authentication

Protect loader data with authentication:

```typescript
export async function loader({ request }: LoaderFunctionArgs) {
  const token = getAuthToken();

  if (!token) {
    throw redirect('/login?returnUrl=' + encodeURIComponent(request.url));
  }

  try {
    const response = await fetch('/api/protected-data', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: request.signal,
    });

    if (response.status === 401) {
      throw redirect('/login');
    }

    return await response.json();
  } catch (error) {
    throw redirect('/login');
  }
}
```

## Data Prefetching

Prefetch route data before navigation for instant transitions.

### Route Registry Integration

```typescript
import { routeRegistry } from '@/lib/routing';

// Register route with loader
routeRegistry.register({
  path: '/users/:id',
  component: UserPage,
  preload: () => import('./routes/users/[id]'),
  dataLoaderKeys: [
    ['user', userId], // Query key for prefetching
  ],
});

// Prefetch on hover
const handleMouseEnter = () => {
  routeRegistry.prefetchByPath('/users/:id');
};
```

### Link Prefetching

```typescript
import { AppLink } from '@/lib/routing';

// Automatic prefetch on hover
<AppLink
  to="/users/:id"
  params={{ id: '123' }}
  prefetch={true}
>
  View User
</AppLink>
```

### Manual Prefetching

```typescript
import { usePrefetchHandlers } from '@/lib/routing';

function UserListItem({ userId }: { userId: string }) {
  const prefetchHandlers = usePrefetchHandlers(`/users/${userId}`);

  return (
    <div {...prefetchHandlers}>
      <Link to={`/users/${userId}`}>
        View User
      </Link>
    </div>
  );
}
```

## Example Loaders

### Dashboard Loader

```typescript
// loaders/dashboardLoader.ts
import { LoaderFunctionArgs } from 'react-router-dom';

export interface DashboardData {
  stats: {
    totalUsers: number;
    activeUsers: number;
    totalRevenue: number;
    growth: number;
  };
  recentActivity: Activity[];
  alerts: Alert[];
}

export async function dashboardLoader({ request }: LoaderFunctionArgs): Promise<DashboardData> {
  const [stats, activity, alerts] = await Promise.all([
    fetch('/api/dashboard/stats', { signal: request.signal }).then(r => r.json()),
    fetch('/api/dashboard/activity', { signal: request.signal }).then(r => r.json()),
    fetch('/api/dashboard/alerts', { signal: request.signal }).then(r => r.json()),
  ]);

  return {
    stats,
    recentActivity: activity.slice(0, 10),
    alerts: alerts.filter((a: Alert) => !a.dismissed),
  };
}
```

### Users List Loader

```typescript
// loaders/usersLoader.ts
import { LoaderFunctionArgs } from 'react-router-dom';

export interface UsersData {
  users: User[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export async function usersLoader({ request }: LoaderFunctionArgs): Promise<UsersData> {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') ?? '1', 10);
  const limit = parseInt(url.searchParams.get('limit') ?? '20', 10);
  const search = url.searchParams.get('search') ?? '';
  const role = url.searchParams.get('role');

  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(search && { search }),
    ...(role && { role }),
  });

  const response = await fetch(`/api/users?${params}`, {
    signal: request.signal,
  });

  if (!response.ok) {
    throw new Response('Failed to load users', { status: response.status });
  }

  const data = await response.json();

  return {
    users: data.users,
    total: data.total,
    page,
    limit,
    hasMore: data.total > page * limit,
  };
}
```

### Report Detail Loader

```typescript
// loaders/reportsLoader.ts
import { LoaderFunctionArgs, redirect } from 'react-router-dom';

export interface ReportData {
  report: Report;
  data: ReportDataPoint[];
  canEdit: boolean;
  canDelete: boolean;
}

export async function reportsLoader({ params, request }: LoaderFunctionArgs): Promise<ReportData> {
  const { id } = params;

  if (!id) {
    throw new Response('Report ID is required', { status: 400 });
  }

  try {
    const [report, data, permissions] = await Promise.all([
      fetch(`/api/reports/${id}`, { signal: request.signal }).then(r => {
        if (!r.ok) throw new Response('Report not found', { status: 404 });
        return r.json();
      }),
      fetch(`/api/reports/${id}/data`, { signal: request.signal }).then(r => r.json()),
      fetch(`/api/reports/${id}/permissions`, { signal: request.signal }).then(r => r.json()),
    ]);

    // Check if user has access
    if (!permissions.canView) {
      throw redirect('/reports?error=unauthorized');
    }

    return {
      report,
      data,
      canEdit: permissions.canEdit,
      canDelete: permissions.canDelete,
    };
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    console.error('Failed to load report:', error);
    throw new Response('Failed to load report', { status: 500 });
  }
}
```

## Caching Strategies

### Simple In-Memory Cache

```typescript
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function cachedLoader({ params }: LoaderFunctionArgs) {
  const cacheKey = `user:${params.id}`;
  const cached = cache.get(cacheKey);

  // Return cached data if fresh
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Fetch fresh data
  const data = await fetchUser(params.id);
  cache.set(cacheKey, { data, timestamp: Date.now() });

  return data;
}
```

### React Query Integration

```typescript
import { QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient();

export async function loader({ params }: LoaderFunctionArgs) {
  const queryKey = ['user', params.id];

  // Fetch data using React Query
  const data = await queryClient.fetchQuery({
    queryKey,
    queryFn: () => fetchUser(params.id),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return { user: data };
}

// Prefetch on hover
function prefetchUser(userId: string) {
  queryClient.prefetchQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });
}
```

## Best Practices

### Loader Organization

```typescript
// Create reusable loader functions
export async function loadUser(userId: string, signal?: AbortSignal) {
  const response = await fetch(`/api/users/${userId}`, { signal });
  if (!response.ok) throw new Response('User not found', { status: 404 });
  return response.json();
}

export async function loadUserPosts(userId: string, signal?: AbortSignal) {
  const response = await fetch(`/api/users/${userId}/posts`, { signal });
  return response.json();
}

// Compose in route loaders
export async function userDetailLoader({ params, request }: LoaderFunctionArgs) {
  const [user, posts] = await Promise.all([
    loadUser(params.id!, request.signal),
    loadUserPosts(params.id!, request.signal),
  ]);

  return { user, posts };
}
```

### Error Boundaries

```typescript
// Specific error for each route
export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    switch (error.status) {
      case 404:
        return <NotFoundPage />;
      case 401:
        return <UnauthorizedPage />;
      case 500:
        return <ServerErrorPage />;
      default:
        return <GenericErrorPage status={error.status} />;
    }
  }

  return <UnexpectedErrorPage />;
}
```

### Loading UI

```typescript
// Global loading fallback
const router = createRouter(routes, {
  loadingFallback: <PageLoader />,
});

// Route-specific pending UI
export function PendingComponent() {
  return <Skeleton />;
}
```

### Type Safety

```typescript
// Create typed loader hook
function createTypedLoaderData<T>() {
  return () => useLoaderData() as T;
}

// Use in route
const useUserData = createTypedLoaderData<UserLoaderData>();

export default function UserPage() {
  const { user, posts } = useUserData();
  // Type-safe access to loader data
}
```

### Testing Loaders

```typescript
import { loader } from './routes/users/[id]';

describe('User Loader', () => {
  it('loads user data', async () => {
    const data = await loader({
      params: { id: '123' },
      request: new Request('http://localhost/users/123'),
    });

    expect(data).toHaveProperty('user');
    expect(data.user.id).toBe('123');
  });

  it('throws 404 for missing user', async () => {
    await expect(
      loader({
        params: { id: 'nonexistent' },
        request: new Request('http://localhost/users/nonexistent'),
      })
    ).rejects.toThrow();
  });
});
```

## Performance Optimization

### Streaming Responses

```typescript
export async function loader({ params }: LoaderFunctionArgs) {
  // Load critical data first
  const user = await fetchUser(params.id);

  // Defer non-critical data
  const deferredData = defer({
    user,
    posts: fetchUserPosts(params.id),
    comments: fetchUserComments(params.id),
  });

  return deferredData;
}

// Use in component
export default function UserPage() {
  const { user, posts, comments } = useLoaderData();

  return (
    <div>
      <UserHeader user={user} />

      <Suspense fallback={<PostsSkeleton />}>
        <Await resolve={posts}>
          {(posts) => <PostsList posts={posts} />}
        </Await>
      </Suspense>

      <Suspense fallback={<CommentsSkeleton />}>
        <Await resolve={comments}>
          {(comments) => <CommentsList comments={comments} />}
        </Await>
      </Suspense>
    </div>
  );
}
```

### Progressive Loading

```typescript
export async function loader({ params, request }: LoaderFunctionArgs) {
  // Load essential data immediately
  const user = await fetchUser(params.id);

  // Return early with partial data
  return defer({
    user, // Resolved immediately
    posts: fetchUserPosts(params.id), // Loads in background
    analytics: fetchUserAnalytics(params.id), // Loads in background
  });
}
```

## Related Documentation

### Routing System
- [README.md](./README.md) - Routing overview
- [CORE.md](./CORE.md) - Core routing utilities
- [GUARDS.md](./GUARDS.md) - Route guards
- [NAVIGATION.md](./NAVIGATION.md) - Navigation components
- [ADVANCED.md](./ADVANCED.md) - Advanced patterns
- [TYPES.md](./TYPES.md) - Type definitions

### State & API
- [State System](../state/README.md) - State with data loading
- [State Stores](../state/STORES.md) - Data stores
- [API Client](../api/README.md) - API integration
- [API Hooks](../api/HOOKS.md) - Data fetching hooks

### Authentication & Integration
- [Auth Guards](../auth/GUARDS.md) - Loader with auth
- [Routing Integration](../integration/ROUTING_STATE_GUARDS.md) - Complete integration guide
