# API Hooks Reference

React hooks for type-safe data fetching, mutations, caching, and health monitoring with TanStack Query integration.

## Table of Contents

- [Overview](#overview)
- [Data Fetching Hooks](#data-fetching-hooks)
- [Mutation Hooks](#mutation-hooks)
- [Cache Hooks](#cache-hooks)
- [Health Hooks](#health-hooks)
- [Client Hooks](#client-hooks)
- [Best Practices](#best-practices)

## Overview

The API module provides a comprehensive set of React hooks built on top of TanStack Query (React Query), offering automatic caching, request deduplication, background refetching, and optimistic updates.

### Quick Example

```typescript
import { useApiRequest, useApiMutation } from '@/lib/api';

function UserProfile({ userId }: { userId: string }) {
  // Fetch user data
  const { data: user, isLoading } = useApiRequest<User>({
    url: `/users/${userId}`,
    queryKey: ['users', userId],
  });

  // Update user mutation
  const updateUser = useApiMutation<User, UpdateUserDto>({
    method: 'PATCH',
    url: `/users/${userId}`,
    invalidateQueries: [['users', userId]],
  });

  if (isLoading) return <Spinner />;

  return (
    <div>
      <h1>{user?.name}</h1>
      <button onClick={() => updateUser.mutate({
        body: { name: 'New Name' }
      })}>
        Update Name
      </button>
    </div>
  );
}
```

## Data Fetching Hooks

### useApiRequest

The primary hook for fetching data with automatic caching and background refetching.

**Signature:**

```typescript
function useApiRequest<TResponse>(
  options: ApiRequestOptions<TResponse>
): UseApiRequestResult<TResponse>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| options.url | string | Yes | Request URL |
| options.queryKey | QueryKey | Yes | Unique key for caching |
| options.pathParams | Record<string, string \| number> | No | Path parameters |
| options.params | QueryParams | No | Query parameters |
| options.requestOptions | Partial<RequestConfig> | No | Additional request options |
| options.enabled | boolean | No | Enable/disable query |
| options.staleTime | number | No | Time before data is stale (ms) |
| options.gcTime | number | No | Garbage collection time (ms) |
| options.refetchOnWindowFocus | boolean | No | Refetch on window focus |
| options.refetchOnMount | boolean \| 'always' | No | Refetch on component mount |
| options.refetchOnReconnect | boolean | No | Refetch on reconnect |
| options.refetchInterval | number \| false | No | Polling interval (ms) |
| options.retry | number \| boolean \| function | No | Retry configuration |
| options.select | function | No | Transform response data |
| options.onSuccess | function | No | Success callback |
| options.onError | function | No | Error callback |

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| data | TResponse \| undefined | Response data |
| isLoading | boolean | Initial loading state |
| isSuccess | boolean | Success state |
| isError | boolean | Error state |
| error | ApiError \| null | Error object |
| isFetching | boolean | Fetching state (including background) |
| isRefetching | boolean | Background refetch state |
| refetch | function | Manual refetch function |
| invalidate | function | Invalidate and refetch |
| setData | function | Update cached data |
| getCachedData | function | Get current cached data |
| hasData | boolean | Whether data exists |

**Examples:**

```typescript
// Basic usage
const { data, isLoading } = useApiRequest<User>({
  url: '/users/123',
  queryKey: ['users', '123'],
});

// With query parameters
const { data } = useApiRequest<User[]>({
  url: '/users',
  queryKey: ['users', 'list', { status: 'active' }],
  params: { status: 'active', page: 1 },
});

// With path parameters
const { data } = useApiRequest<Post[]>({
  url: '/users/:userId/posts',
  queryKey: ['users', userId, 'posts'],
  pathParams: { userId },
});

// Conditional fetching
const { data } = useApiRequest<User>({
  url: `/users/${userId}`,
  queryKey: ['users', userId],
  enabled: !!userId, // Only fetch if userId exists
});

// With data transformation
const { data } = useApiRequest<User[]>({
  url: '/users',
  queryKey: ['users'],
  select: (users) => users.filter(u => u.active),
});

// With callbacks
const { data } = useApiRequest<User>({
  url: '/users/123',
  queryKey: ['users', '123'],
  onSuccess: (user) => {
    toast.success(`Loaded ${user.name}`);
  },
  onError: (error) => {
    toast.error(error.message);
  },
});
```

### useGet

Simplified hook for basic GET requests.

**Signature:**

```typescript
function useGet<TResponse>(
  url: string,
  queryKey: QueryKey,
  options?: Omit<ApiRequestOptions<TResponse>, 'url' | 'queryKey'>
): UseApiRequestResult<TResponse>
```

**Example:**

```typescript
const { data, isLoading } = useGet<User>('/users/123', ['users', '123']);
```

### useGetById

Fetch a resource by ID with automatic null checking.

**Signature:**

```typescript
function useGetById<TResponse>(
  baseUrl: string,
  id: string | undefined,
  options?: ApiRequestOptions<TResponse>
): UseApiRequestResult<TResponse>
```

**Example:**

```typescript
const { data: user } = useGetById<User>('/users', userId);
// Automatically disabled if userId is undefined
```

### useGetList

Fetch paginated list with filters and sorting.

**Signature:**

```typescript
function useGetList<TResponse>(
  url: string,
  params?: {
    page?: number;
    pageSize?: number;
    filters?: Record<string, unknown>;
    sort?: string;
    order?: 'asc' | 'desc';
  },
  options?: ApiRequestOptions<TResponse>
): UseApiRequestResult<TResponse>
```

**Example:**

```typescript
const { data: users } = useGetList<User[]>('/users', {
  page: 1,
  pageSize: 20,
  filters: { status: 'active' },
  sort: 'name',
  order: 'asc',
});
```

### useParallelRequests

Execute multiple requests in parallel.

**Signature:**

```typescript
function useParallelRequests<TResponses extends unknown[]>(
  requests: { [K in keyof TResponses]: ApiRequestOptions<TResponses[K]> }
): { [K in keyof TResponses]: ParallelRequestResult<TResponses[K]> }
```

**Example:**

```typescript
const [usersResult, postsResult, commentsResult] = useParallelRequests([
  { url: '/users', queryKey: ['users'] },
  { url: '/posts', queryKey: ['posts'] },
  { url: '/comments', queryKey: ['comments'] },
]);

if (usersResult.isLoading || postsResult.isLoading) {
  return <Spinner />;
}
```

### useDependentRequest

Execute requests sequentially where the second depends on the first.

**Signature:**

```typescript
function useDependentRequest<TFirst, TSecond>(
  firstRequest: ApiRequestOptions<TFirst>,
  secondRequestFn: (data: TFirst) => ApiRequestOptions<TSecond>
): {
  first: UseApiRequestResult<TFirst>;
  second: UseApiRequestResult<TSecond>;
  isLoading: boolean;
  error: ApiError | null;
}
```

**Example:**

```typescript
const { first, second } = useDependentRequest<User, Post[]>(
  { url: '/users/me', queryKey: ['currentUser'] },
  (user) => ({
    url: `/users/${user.id}/posts`,
    queryKey: ['users', user.id, 'posts'],
  })
);
```

### usePolling

Poll an endpoint at regular intervals.

**Signature:**

```typescript
function usePolling<TResponse>(
  options: ApiRequestOptions<TResponse> & {
    interval: number;
    stopCondition?: (data: TResponse) => boolean;
  }
): UseApiRequestResult<TResponse> & {
  isPolling: boolean;
  startPolling: () => void;
  stopPolling: () => void;
}
```

**Example:**

```typescript
const {
  data: jobStatus,
  isPolling,
  stopPolling,
} = usePolling<JobStatus>({
  url: `/jobs/${jobId}/status`,
  queryKey: ['jobs', jobId, 'status'],
  interval: 5000, // Poll every 5 seconds
  stopCondition: (data) => data.status === 'completed',
});

useEffect(() => {
  if (jobStatus?.status === 'completed') {
    toast.success('Job completed!');
  }
}, [jobStatus]);
```

### usePrefetch

Prefetch data for later use.

**Signature:**

```typescript
function usePrefetch<TResponse>(): (
  url: string,
  queryKey: QueryKey,
  options?: Partial<ApiRequestOptions<TResponse>>
) => Promise<void>
```

**Example:**

```typescript
const prefetch = usePrefetch<User>();

return (
  <Link
    to="/users/123"
    onMouseEnter={() => prefetch('/users/123', ['users', '123'])}
  >
    View User
  </Link>
);
```

### useLazyQuery

Execute queries manually instead of automatically.

**Signature:**

```typescript
function useLazyQuery<TResponse>(
  options: Omit<ApiRequestOptions<TResponse>, 'enabled'>
): UseApiRequestResult<TResponse> & {
  execute: (overrides?: Partial<ApiRequestOptions<TResponse>>) => Promise<TResponse>;
}
```

**Example:**

```typescript
const { execute, data, isLoading } = useLazyQuery<SearchResults>({
  url: '/search',
  queryKey: ['search'],
});

const handleSearch = async (query: string) => {
  const results = await execute({
    params: { q: query },
  });
  console.log('Search results:', results);
};
```

## Mutation Hooks

### useApiMutation

Execute data mutations (POST, PUT, PATCH, DELETE).

**Signature:**

```typescript
function useApiMutation<TResponse, TBody, TContext>(
  config: ApiMutationConfig<TResponse, TBody, TContext>
): UseApiMutationResult<TResponse, TBody>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| config.method | 'POST' \| 'PUT' \| 'PATCH' \| 'DELETE' | Yes | HTTP method |
| config.url | string | Yes | Request URL |
| config.requestOptions | Partial<RequestConfig> | No | Additional options |
| config.invalidateQueries | QueryKey[] | No | Queries to invalidate on success |
| config.refetchQueries | QueryKey[] | No | Queries to refetch on success |
| config.optimisticQueryKey | QueryKey | No | Query for optimistic updates |
| config.optimisticUpdate | function | No | Optimistic update function |
| config.onMutate | function | No | Pre-mutation callback |
| config.onSuccess | function | No | Success callback |
| config.onError | function | No | Error callback |
| config.onSettled | function | No | Settled callback |
| config.retry | number \| boolean | No | Retry configuration |

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| mutate | function | Execute mutation (fire and forget) |
| mutateAsync | function | Execute mutation (returns Promise) |
| mutateWithBody | function | Simplified mutate with just body |
| mutateAsyncWithBody | function | Simplified async mutate with body |
| data | TResponse \| undefined | Mutation response data |
| error | ApiError \| null | Mutation error |
| isLoading | boolean | Loading state |
| isSuccess | boolean | Success state |
| isError | boolean | Error state |
| reset | function | Reset mutation state |

**Examples:**

```typescript
// POST - Create user
const createUser = useApiMutation<User, CreateUserDto>({
  method: 'POST',
  url: '/users',
  invalidateQueries: [['users', 'list']],
  onSuccess: (user) => {
    toast.success(`Created user: ${user.name}`);
  },
});

// Execute mutation
createUser.mutate({
  body: { name: 'John', email: 'john@example.com' },
});

// Or with mutateWithBody
createUser.mutateWithBody({
  name: 'John',
  email: 'john@example.com',
});

// PATCH - Update user
const updateUser = useApiMutation<User, Partial<User>>({
  method: 'PATCH',
  url: '/users/:id',
  invalidateQueries: [['users', 'list']],
});

updateUser.mutate({
  pathParams: { id: '123' },
  body: { name: 'Updated Name' },
});

// DELETE - Delete user
const deleteUser = useApiMutation<void>({
  method: 'DELETE',
  url: '/users/:id',
  invalidateQueries: [['users', 'list']],
});

deleteUser.mutate({
  pathParams: { id: '123' },
});

// With async/await
try {
  const user = await createUser.mutateAsync({
    body: { name: 'John' },
  });
  console.log('Created:', user);
} catch (error) {
  console.error('Failed:', error);
}
```

### Optimistic Updates

```typescript
const updateUser = useApiMutation({
  method: 'PATCH',
  url: '/users/:id',
  ...createOptimisticUpdate<User>(['users', 'list'], (u) => u.id),
  onError: (error, variables, context) => {
    // context contains previousData for rollback
    toast.error('Update failed, changes reverted');
  },
});
```

### usePost

Shorthand for POST mutations.

**Signature:**

```typescript
function usePost<TResponse, TBody, TContext>(
  url: string,
  options?: Omit<ApiMutationConfig<TResponse, TBody, TContext>, 'method' | 'url'>
): UseApiMutationResult<TResponse, TBody>
```

**Example:**

```typescript
const createUser = usePost<User, CreateUserDto>('/users', {
  invalidateQueries: [['users', 'list']],
});
```

### usePut

Shorthand for PUT mutations.

**Example:**

```typescript
const replaceUser = usePut<User, User>('/users/:id', {
  invalidateQueries: [['users', 'list']],
});
```

### usePatch

Shorthand for PATCH mutations.

**Example:**

```typescript
const updateUser = usePatch<User, Partial<User>>('/users/:id', {
  invalidateQueries: [['users', 'list']],
});
```

### useDelete

Shorthand for DELETE mutations.

**Example:**

```typescript
const deleteUser = useDelete<void>('/users/:id', {
  invalidateQueries: [['users', 'list']],
  onSuccess: () => toast.success('User deleted'),
});

deleteUser.mutate({ pathParams: { id: '123' } });
```

### useBatchMutation

Execute multiple mutations sequentially.

**Signature:**

```typescript
function useBatchMutation<TResponse, TBody>(
  url: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  options?: Omit<ApiMutationConfig<TResponse[], TBody>, 'method' | 'url'>
): {
  mutate: (variables: MutationVariables<TBody>[]) => void;
  mutateAsync: (variables: MutationVariables<TBody>[]) => Promise<TResponse[]>;
  isPending: boolean;
  isError: boolean;
  error: ApiError | null;
  data: TResponse[] | undefined;
  reset: () => void;
}
```

**Example:**

```typescript
const batchUpdate = useBatchMutation<User, UpdateUserDto>('/users/:id', 'PATCH');

await batchUpdate.mutateAsync([
  { pathParams: { id: '1' }, body: { status: 'active' } },
  { pathParams: { id: '2' }, body: { status: 'active' } },
  { pathParams: { id: '3' }, body: { status: 'active' } },
]);
```

### Optimistic Update Helpers

#### createOptimisticAdd

Add item to list optimistically.

```typescript
const createUser = usePost<User, CreateUserDto>('/users', {
  ...createOptimisticAdd(['users', 'list'], (body) => ({
    id: 'temp-' + Date.now(),
    ...body,
    createdAt: new Date().toISOString(),
  })),
});
```

#### createOptimisticUpdate

Update item in list optimistically.

```typescript
const updateUser = usePatch<User, Partial<User>>('/users/:id', {
  ...createOptimisticUpdate<User>(['users', 'list'], (item) => item.id),
});
```

#### createOptimisticRemove

Remove item from list optimistically.

```typescript
const deleteUser = useDelete<void>('/users/:id', {
  ...createOptimisticRemove<User>(['users', 'list'], (item) => item.id),
});
```

## Cache Hooks

### useApiCache

Manage React Query cache directly.

**Signature:**

```typescript
function useApiCache(): UseApiCacheResult
```

**Returns:**

| Method | Description |
|--------|-------------|
| getData | Get cached data for a query key |
| setData | Set cached data for a query key |
| removeData | Remove cached data |
| invalidate | Invalidate queries |
| invalidateAll | Invalidate all queries |
| refetch | Refetch queries |
| cancel | Cancel in-flight queries |
| reset | Reset queries to initial state |
| prefetch | Prefetch a query |
| getStats | Get cache statistics |
| getEntry | Get cache entry info |
| getEntries | Get all cache entries |
| hasQuery | Check if query exists |
| isStale | Check if query is stale |
| isFetching | Check if query is fetching |
| clear | Clear entire cache |
| subscribe | Subscribe to cache changes |

**Examples:**

```typescript
const cache = useApiCache();

// Get cached data
const users = cache.getData<User[]>(['users', 'list']);

// Update cache
cache.setData(['users', '123'], (old) => ({
  ...old,
  name: 'Updated Name',
}));

// Invalidate queries
await cache.invalidate(['users']);

// Get cache stats
const stats = cache.getStats();
console.log(`Cache hit rate: ${stats.hitRate * 100}%`);

// Check query state
const isStale = cache.isStale(['users', '123']);
const isFetching = cache.isFetching(['users']);
```

### useCacheMonitor

Monitor cache statistics in real-time.

**Signature:**

```typescript
function useCacheMonitor(options?: {
  interval?: number;
  autoStart?: boolean;
}): {
  stats: CacheStats;
  isMonitoring: boolean;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  refresh: () => void;
}
```

**Example:**

```typescript
const { stats, isMonitoring } = useCacheMonitor({
  interval: 5000,
  autoStart: true,
});

return (
  <div>
    <p>Entries: {stats.entries}</p>
    <p>Hit Rate: {(stats.hitRate * 100).toFixed(1)}%</p>
    <p>Size: {(stats.size / 1024).toFixed(1)} KB</p>
  </div>
);
```

### useCacheEntry

Watch specific cache entry.

**Example:**

```typescript
const { entry, isLoaded, isStale } = useCacheEntry<User>(['users', userId]);

if (!isLoaded) return <p>Not in cache</p>;
if (isStale) return <p>Data is stale</p>;

return <p>User: {entry.data?.name}</p>;
```

### useBulkCacheOperations

Bulk cache operations.

**Example:**

```typescript
const { invalidateByTag, invalidateByPrefix } = useBulkCacheOperations();

// Invalidate all user-related queries
await invalidateByTag('user');

// Invalidate by prefix
await invalidateByPrefix('users');
```

## Health Hooks

### useApiHealth

Monitor API health and connectivity.

**Signature:**

```typescript
function useApiHealth(config?: UseApiHealthConfig): UseApiHealthResult
```

**Parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| endpoint | string | '/health' | Health check endpoint |
| interval | number | 30000 | Check interval (ms) |
| timeout | number | 5000 | Request timeout (ms) |
| failureThreshold | number | 3 | Failures before unhealthy |
| successThreshold | number | 1 | Successes before healthy |
| autoCheck | boolean | true | Auto health checks |
| onStatusChange | function | - | Status change callback |
| onCheck | function | - | Check complete callback |

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| status | HealthStatus | Current health status |
| isHealthy | boolean | Whether API is healthy |
| isDegraded | boolean | Whether API is degraded |
| isUnhealthy | boolean | Whether API is unhealthy |
| latency | number \| null | Last latency (ms) |
| averageLatency | number \| null | Average latency (ms) |
| lastCheck | number \| null | Last check timestamp |
| lastError | string \| null | Last error message |
| consecutiveFailures | number | Consecutive failure count |
| consecutiveSuccesses | number | Consecutive success count |
| isChecking | boolean | Currently checking |
| checkNow | function | Manual check |
| startMonitoring | function | Start auto checks |
| stopMonitoring | function | Stop auto checks |
| isMonitoring | boolean | Monitoring active |
| history | HealthCheckResult[] | Check history |
| reset | function | Reset state |

**Examples:**

```typescript
// Basic usage
const { status, isHealthy, latency } = useApiHealth();

// With configuration
const { status, checkNow } = useApiHealth({
  endpoint: '/api/health',
  interval: 60000,
  onStatusChange: (newStatus, oldStatus) => {
    if (newStatus === 'unhealthy') {
      toast.error('API is currently unavailable');
    } else if (newStatus === 'healthy' && oldStatus === 'unhealthy') {
      toast.success('API is back online');
    }
  },
});

// Manual checks only
const { checkNow, status } = useApiHealth({
  autoCheck: false,
});

return (
  <div>
    <StatusIndicator status={status} />
    <button onClick={checkNow}>Check Now</button>
  </div>
);
```

### useApiConnectivity

Simple connectivity check.

**Example:**

```typescript
const isOnline = useApiConnectivity();

if (!isOnline) {
  return <OfflineIndicator />;
}
```

### useNetworkAware

Network-aware operations with connectivity waiting.

**Example:**

```typescript
const { canMakeRequest, waitForConnectivity } = useNetworkAware();

const handleSubmit = async () => {
  if (!canMakeRequest) {
    await waitForConnectivity();
  }
  // Proceed with request
};
```

### useMultiApiHealth

Monitor multiple API endpoints.

**Example:**

```typescript
const services = useMultiApiHealth([
  { name: 'Main API', endpoint: '/health' },
  { name: 'Auth Service', endpoint: '/auth/health' },
  { name: 'File Service', endpoint: '/files/health' },
]);

return (
  <ul>
    {services.map(s => (
      <li key={s.name}>
        {s.name}: {s.status} ({s.latency}ms)
      </li>
    ))}
  </ul>
);
```

## Client Hooks

### useApiClient

Access API client and utilities.

**Signature:**

```typescript
function useApiClient(): ApiClientContextValue
```

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| client | ApiClient | API client instance |
| isConfigured | boolean | Whether client is configured |
| config | ApiClientConfig \| null | Current configuration |
| get | function | Make GET request |
| post | function | Make POST request |
| put | function | Make PUT request |
| patch | function | Make PATCH request |
| del | function | Make DELETE request |
| request | function | Make generic request |
| addRequestInterceptor | function | Add request interceptor |
| addResponseInterceptor | function | Add response interceptor |
| addErrorInterceptor | function | Add error interceptor |
| setTokenRefresh | function | Set token refresh function |
| cancelRequest | function | Cancel specific request |
| cancelAllRequests | function | Cancel all requests |
| configure | function | Reconfigure client |

**Example:**

```typescript
const { client, get, post } = useApiClient();

// Use client directly
const response = await client.get('/users');

// Use convenience methods
const users = await get<User[]>('/users');
const newUser = await post<User>('/users', { name: 'John' });
```

### useApiInterceptors

Add interceptors with automatic cleanup.

**Example:**

```typescript
useApiInterceptors({
  request: (config) => {
    config.headers['X-Custom-Header'] = 'value';
    return config;
  },
  response: (response) => {
    console.log('Response:', response.status);
    return response;
  },
  error: (error) => {
    console.error('Error:', error.message);
    return error;
  },
});
```

## Best Practices

### 1. Query Key Structure

Use consistent, hierarchical query keys:

```typescript
// ✅ Good - hierarchical structure
['users']                      // All users
['users', 'list']             // User list
['users', 'list', filters]    // Filtered users
['users', userId]             // Specific user
['users', userId, 'posts']    // User's posts

// ❌ Bad - flat structure
['allUsers']
['userList']
['user123']
```

### 2. Stale Time Configuration

Configure stale times based on data volatility:

```typescript
// Frequently changing data
useApiRequest({
  url: '/realtime-stats',
  queryKey: ['stats'],
  staleTime: 0, // Always stale
  refetchInterval: 5000, // Poll every 5s
});

// Rarely changing data
useApiRequest({
  url: '/config',
  queryKey: ['config'],
  staleTime: Infinity, // Never stale
});
```

### 3. Error Handling

Handle errors at appropriate levels:

```typescript
// Component-level
const { data, error } = useApiRequest({
  url: '/users',
  queryKey: ['users'],
  onError: (error) => {
    toast.error(error.message);
  },
});

// Global error handling via interceptor
useApiInterceptors({
  error: (error) => {
    if (isAuthenticationError(error)) {
      router.push('/login');
    }
    return error;
  },
});
```

### 4. Loading States

Distinguish between initial load and refetch:

```typescript
const { data, isLoading, isFetching } = useApiRequest({
  url: '/users',
  queryKey: ['users'],
});

if (isLoading) {
  return <FullPageSpinner />;
}

return (
  <div>
    {isFetching && <TopBarSpinner />}
    <UserList users={data} />
  </div>
);
```

### 5. Optimistic Updates

Use optimistic updates for better UX:

```typescript
const updateUser = usePatch('/users/:id', {
  ...createOptimisticUpdate<User>(['users', 'list'], (u) => u.id),
  onError: (error, variables, context) => {
    // Rollback happens automatically
    toast.error('Update failed');
  },
});
```

## Related Documentation

### API Documentation
- **[API Module Overview](./README.md)** - Complete API module guide
- **[API Client](./API_CLIENT.md)** - HTTP client, configuration, and utilities
- **[Types](./TYPES.md)** - TypeScript type reference
- **[Interceptors](./INTERCEPTORS.md)** - Request/response interceptors
- **[Advanced Features](./ADVANCED.md)** - API Gateway, rate limiting, metrics

### Integration Guides
- **[Queries Module](../queries/README.md)** - React Query integration and query key factories
- **[Hooks Module](../hooks/README.md)** - Additional custom hooks
- **[State Management](../state/README.md)** - Global state integration
- **[Realtime Module](../realtime/README.md)** - WebSocket and SSE integration

### Reference
- **[Hooks Reference](../HOOKS_REFERENCE.md)** - Complete hooks API reference
- **[Hooks Quick Reference](../hooks/QUICK_REFERENCE.md)** - Quick lookup for all hooks
- **[Performance Guide](../performance/README.md)** - Performance optimization tips
