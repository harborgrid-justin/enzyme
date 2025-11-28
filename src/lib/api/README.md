# API Module

> **Purpose:** Enterprise-grade HTTP client infrastructure with type-safe requests, React Query integration, and comprehensive error handling.

## Overview

The API module provides a complete solution for managing HTTP communications in React applications. Built on top of modern web standards, it offers a robust client with automatic retries, request deduplication, response normalization, and seamless React integration through hooks.

This module bridges the gap between raw fetch API and application needs by providing type-safe request building, intelligent caching, mock server capabilities for development, and advanced features like API versioning, rate limiting, and metrics collection.

Whether you're building a simple CRUD application or a complex enterprise system with multiple API versions, this module provides the tools and patterns to handle it elegantly.

## Key Features

- Type-safe API client with automatic request/response typing
- React Query integration with generated hooks
- Fluent request builder API with method chaining
- Automatic retry logic with exponential backoff
- Request deduplication to prevent duplicate calls
- Response normalization and error handling
- Mock server for development and testing
- API versioning and migration support
- Rate limiting and request throttling
- Comprehensive metrics and monitoring
- CSRF and authentication token management
- Streaming response support
- Pagination helpers (offset and cursor-based)

## Quick Start

```tsx
import { apiClient, useApiRequest } from '@/lib/api';

// Direct API calls
const users = await apiClient.get<User[]>('/users');
const newUser = await apiClient.post<User>('/users', { name: 'John' });

// React Query integration
function UserList() {
  const { data, isLoading, error } = useApiRequest<User[]>({
    url: '/users',
    queryKey: ['users'],
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {data.map(user => <li key={user.id}>{user.name}</li>)}
    </ul>
  );
}
```

## Exports

### Components
- `ApiClientProvider` - Context provider for API client configuration

### Hooks
- `useApiClient` - Access API client instance from context
- `useApiRequest` - Fetch data with React Query (GET requests)
- `useApiMutation` - Mutate data with React Query (POST/PUT/PATCH/DELETE)
- `useApiCache` - Manage React Query cache entries
- `useApiHealth` - Monitor API health and connectivity
- `useGet` - Shorthand for GET requests
- `useGetById` - Fetch single resource by ID
- `useGetList` - Fetch paginated lists
- `usePost` / `usePut` / `usePatch` / `useDelete` - HTTP method shortcuts
- `useParallelRequests` - Execute multiple requests in parallel
- `useDependentRequest` - Chain dependent requests
- `usePolling` - Auto-refresh data at intervals
- `usePrefetch` - Prefetch data before navigation
- `useLazyQuery` - Manually triggered queries

### Classes
- `ApiClient` - Core HTTP client class
- `RequestBuilder` - Fluent API for building requests
- `MockServer` - Development mock server

### Utilities
- `createApiClient()` - Factory for creating client instances
- `createRequest()` - Initialize request builder
- `get()` / `post()` / `put()` / `patch()` / `del()` - Request builder shortcuts
- `parseResponse()` - Parse and validate responses
- `normalizeError()` - Standardize error objects
- `createApiHooks()` - Generate typed hooks from endpoint definitions
- `buildUrl()` - Construct URLs with path params
- `serializeQueryParams()` - Convert objects to query strings
- `createMockServer()` - Factory for mock server

### Advanced Features
- `APIGateway` - Centralized gateway with middleware
- `RequestOrchestrator` - Batch, chain, and waterfall requests
- `ResponseNormalizer` - Transform responses to standard formats
- `VersionManager` - Handle multiple API versions
- `RateLimiter` - Client-side rate limiting
- `RequestDeduplicator` - Prevent duplicate in-flight requests
- `APIMetricsCollector` - Collect performance metrics

### Types
- `ApiResponse<T>` - Standard response wrapper
- `ApiError` - Normalized error object
- `RequestConfig` - Request configuration options
- `PaginatedResponse<T>` - Paginated data wrapper
- `ApiEndpoint` - Endpoint definition type
- `UseApiRequestOptions` - Hook configuration
- `UseApiMutationOptions` - Mutation hook configuration

## Architecture

The API module follows a layered architecture:

```
Application Components
        ↓
React Hooks (useApiRequest, useApiMutation)
        ↓
Request Builder (fluent API)
        ↓
API Client (retry, interceptors)
        ↓
Response Handler (parsing, normalization)
        ↓
HTTP Transport (fetch API)
```

### Integration Points

- **Auth Module**: Automatic token injection via interceptors
- **Performance Module**: Request timing and monitoring
- **Security Module**: CSRF token management
- **Routing Module**: API route generation
- **State Module**: Optional state sync for mutations

## Common Patterns

### Pattern 1: Basic CRUD Operations
```tsx
import { useApiRequest, usePost, usePut, useDelete } from '@/lib/api';

function UserManagement() {
  // Fetch list
  const { data: users } = useApiRequest<User[]>({
    url: '/users',
    queryKey: ['users'],
  });

  // Create
  const createUser = usePost<User>('/users', {
    onSuccess: () => queryClient.invalidateQueries(['users']),
  });

  // Update
  const updateUser = usePut<User>('/users/:id', {
    onSuccess: () => queryClient.invalidateQueries(['users']),
  });

  // Delete
  const deleteUser = useDelete('/users/:id', {
    onSuccess: () => queryClient.invalidateQueries(['users']),
  });

  return (
    <div>
      <button onClick={() => createUser.mutate({ name: 'John' })}>
        Add User
      </button>
      {users?.map(user => (
        <div key={user.id}>
          {user.name}
          <button onClick={() => deleteUser.mutate({ id: user.id })}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
```

### Pattern 2: Request Builder with Complex Parameters
```tsx
import { get, apiClient } from '@/lib/api';

// Build a complex search request
const request = get<SearchResults>('/search')
  .query({
    q: 'react',
    category: 'libraries',
    page: 1,
    limit: 20,
  })
  .headers({
    'X-Custom-Header': 'value',
  })
  .timeout(5000)
  .retry({
    maxAttempts: 3,
    backoff: 'exponential',
  })
  .build();

const results = await apiClient.execute(request);
```

### Pattern 3: Optimistic Updates
```tsx
import { useApiMutation, createOptimisticUpdate } from '@/lib/api';

function TodoList() {
  const toggleTodo = useApiMutation<Todo>({
    url: '/todos/:id',
    method: 'PATCH',
    onMutate: createOptimisticUpdate(['todos'], (old, variables) => {
      return old.map(todo =>
        todo.id === variables.id
          ? { ...todo, completed: !todo.completed }
          : todo
      );
    }),
  });

  return <div>...</div>;
}
```

### Pattern 4: Pagination
```tsx
import { useGetList } from '@/lib/api';

function UserList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useGetList<User>({
    url: '/users',
    queryKey: ['users'],
    pagination: {
      type: 'cursor',
      pageSize: 20,
    },
  });

  return (
    <div>
      {data?.pages.map(page =>
        page.items.map(user => <UserCard key={user.id} user={user} />)
      )}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          Load More
        </button>
      )}
    </div>
  );
}
```

### Pattern 5: Mock Development Server
```tsx
import { mockServer, mockHandlers, mockData } from '@/lib/api';

// Setup mocks for development
if (import.meta.env.DEV) {
  mockServer.get('/users', mockHandlers.success([
    { id: mockData.uuid(), name: mockData.name() },
    { id: mockData.uuid(), name: mockData.name() },
  ]));

  mockServer.post('/users', mockHandlers.create((req) => ({
    id: mockData.uuid(),
    ...req.body,
  })));

  mockServer.start({ delay: 300 });
}
```

## Configuration

### API Client Configuration
```tsx
import { createApiClient } from '@/lib/api';

const client = createApiClient({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  retry: {
    maxAttempts: 3,
    retryDelay: 1000,
    retryableStatuses: [408, 429, 500, 502, 503, 504],
  },
  // Token provider for auth
  tokenProvider: async () => {
    const token = await getAuthToken();
    return { authorization: `Bearer ${token}` };
  },
  // Request interceptors
  onRequest: (config) => {
    console.log('Request:', config);
    return config;
  },
  // Response interceptors
  onResponse: (response) => {
    console.log('Response:', response);
    return response;
  },
  // Error interceptors
  onError: (error) => {
    console.error('Error:', error);
    throw error;
  },
});
```

### Provider Setup
```tsx
import { ApiClientProvider } from '@/lib/api';

function App() {
  return (
    <ApiClientProvider config={{ baseURL: '/api' }}>
      <YourApp />
    </ApiClientProvider>
  );
}
```

## Testing

### Testing with Mock Server
```tsx
import { mockServer, mockHandlers } from '@/lib/api';
import { render, screen, waitFor } from '@testing-library/react';

describe('UserList', () => {
  beforeAll(() => {
    mockServer.start();
  });

  afterAll(() => {
    mockServer.stop();
  });

  it('displays users', async () => {
    mockServer.get('/users', mockHandlers.success([
      { id: '1', name: 'John' },
      { id: '2', name: 'Jane' },
    ]));

    render(<UserList />);

    await waitFor(() => {
      expect(screen.getByText('John')).toBeInTheDocument();
      expect(screen.getByText('Jane')).toBeInTheDocument();
    });
  });
});
```

## Performance Considerations

1. **Request Deduplication**: Identical in-flight requests are automatically deduplicated
2. **Response Caching**: React Query handles caching with configurable TTL
3. **Pagination**: Use cursor-based pagination for large datasets
4. **Prefetching**: Prefetch data on hover or route change for instant navigation
5. **Bundle Size**: Core client is ~15KB gzipped, hooks add ~5KB
6. **Memory**: Request cache is bounded and automatically cleaned up

## Troubleshooting

### Issue: 401 Unauthorized Errors
**Solution:** Ensure token provider is configured and returns valid tokens:
```tsx
createApiClient({
  tokenProvider: async () => {
    const token = await refreshTokenIfNeeded();
    return { authorization: `Bearer ${token}` };
  },
});
```

### Issue: CORS Errors in Development
**Solution:** Configure proxy in vite.config.ts:
```tsx
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
```

### Issue: Request Timeout
**Solution:** Increase timeout for slow endpoints:
```tsx
const data = await apiClient.get('/slow-endpoint', {
  timeout: 60000, // 60 seconds
});
```

### Issue: Stale Data After Mutation
**Solution:** Invalidate queries after mutations:
```tsx
const mutation = useApiMutation({
  onSuccess: () => {
    queryClient.invalidateQueries(['users']);
  },
});
```

## See Also

- [API Configuration](/reuse/templates/react/src/config/api.config.ts)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Auth Module](../auth/README.md) - Authentication integration
- [Performance Module](../performance/README.md) - Request monitoring
- [Security Module](../security/README.md) - CSRF protection

---

**Version:** 3.0.0
**Last Updated:** 2025-11-27
