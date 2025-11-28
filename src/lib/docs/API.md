# Harbor React Library - API Guide

> **Scope**: This document covers the Harbor React Library's API system and data fetching utilities.
> For template-level API patterns, see [Template API Layer](../../../docs/API.md).

---

> Complete guide to API handling, HTTP clients, and data fetching patterns in the Harbor React Library.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [API Client](#api-client)
- [React Query Integration](#react-query-integration)
- [Request Building](#request-building)
- [Response Handling](#response-handling)
- [Error Handling](#error-handling)
- [Caching Strategies](#caching-strategies)
- [Optimistic Updates](#optimistic-updates)
- [Mock API System](#mock-api-system)
- [Advanced Patterns](#advanced-patterns)

---

## Overview

The API system provides:

- **Type-safe HTTP client** with automatic token handling
- **React Query integration** for data fetching and caching
- **Fluent request builder** for complex requests
- **Unified error handling** with user-friendly messages
- **Optimistic updates** for instant UI feedback
- **Mock server** for development and testing
- **Health monitoring** for API availability

---

## Quick Start

```tsx
import {
  apiClient,
  useApiRequest,
  useApiMutation,
} from '@/lib/api';

// 1. Simple data fetching
function UserList() {
  const { data: users, isLoading, error } = useApiRequest<User[]>({
    url: '/api/users',
    queryKey: ['users'],
  });

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}

// 2. Data mutation
function CreateUser() {
  const createUser = useApiMutation<User, CreateUserDto>({
    url: '/api/users',
    method: 'POST',
    invalidateKeys: [['users']],
    onSuccess: (user) => {
      toast.success(`Created ${user.name}`);
    },
  });

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      createUser.mutate(formData);
    }}>
      {/* form fields */}
      <button type="submit" disabled={createUser.isPending}>
        Create User
      </button>
    </form>
  );
}

// 3. Direct API calls
async function fetchData() {
  const users = await apiClient.get<User[]>('/api/users');
  const user = await apiClient.post<User>('/api/users', {
    name: 'John',
    email: 'john@example.com',
  });
}
```

---

## API Client

### Configuration

```tsx
import { createApiClient, ApiClient } from '@/lib/api';

const apiClient = createApiClient({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },

  // Automatic retry configuration
  retry: {
    maxAttempts: 3,
    backoff: 'exponential',
    retryableStatuses: [408, 429, 500, 502, 503, 504],
  },

  // Request deduplication
  deduplication: {
    enabled: true,
    ttl: 100, // ms to consider requests identical
  },

  // Token provider for auth
  tokenProvider: async () => {
    return getStoredAccessToken();
  },
});
```

### Basic Methods

```tsx
import { apiClient } from '@/lib/api';

// GET request
const users = await apiClient.get<User[]>('/users');
const user = await apiClient.get<User>('/users/123');

// GET with query parameters
const filteredUsers = await apiClient.get<User[]>('/users', {
  params: { role: 'admin', active: true },
});

// POST request
const newUser = await apiClient.post<User>('/users', {
  name: 'John Doe',
  email: 'john@example.com',
});

// PUT request (full replace)
const updatedUser = await apiClient.put<User>('/users/123', userData);

// PATCH request (partial update)
const patchedUser = await apiClient.patch<User>('/users/123', {
  name: 'Jane Doe',
});

// DELETE request
await apiClient.delete('/users/123');
```

### Interceptors

```tsx
import { apiClient } from '@/lib/api';

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add timestamp to all requests
    config.headers['X-Request-Time'] = Date.now().toString();
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Log response time
    console.log(`Request took ${Date.now() - response.config.startTime}ms`);
    return response;
  },
  (error) => {
    // Handle 401 globally
    if (error.response?.status === 401) {
      authService.logout();
      router.navigate('/login');
    }
    return Promise.reject(error);
  }
);
```

### Request Cancellation

```tsx
import { apiClient } from '@/lib/api';

function SearchComponent() {
  const [results, setResults] = useState([]);
  const abortControllerRef = useRef<AbortController>();

  const search = async (query: string) => {
    // Cancel previous request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    try {
      const results = await apiClient.get('/search', {
        params: { q: query },
        signal: abortControllerRef.current.signal,
      });
      setResults(results);
    } catch (error) {
      if (error.name !== 'AbortError') {
        throw error;
      }
    }
  };

  return <SearchInput onChange={debounce(search, 300)} />;
}
```

---

## React Query Integration

### useApiRequest Hook

```tsx
import { useApiRequest } from '@/lib/api';

// Basic usage
const { data, isLoading, error, refetch } = useApiRequest<User[]>({
  url: '/api/users',
  queryKey: ['users'],
});

// With configuration
const { data: user } = useApiRequest<User>({
  url: `/api/users/${userId}`,
  queryKey: ['users', userId],
  enabled: !!userId,           // Only fetch when userId exists
  staleTime: 5 * 60 * 1000,   // Consider fresh for 5 minutes
  gcTime: 30 * 60 * 1000,     // Keep in cache for 30 minutes
  refetchOnWindowFocus: true,
  retry: 3,
});

// With transform
const { data: userNames } = useApiRequest<User[], string[]>({
  url: '/api/users',
  queryKey: ['users'],
  select: (users) => users.map(u => u.name),
});
```

### useApiMutation Hook

```tsx
import { useApiMutation } from '@/lib/api';

// Basic mutation
const createUser = useApiMutation<User, CreateUserDto>({
  url: '/api/users',
  method: 'POST',
});

// With full configuration
const updateUser = useApiMutation<User, UpdateUserDto>({
  url: `/api/users/${userId}`,
  method: 'PATCH',

  // Invalidate queries on success
  invalidateKeys: [['users'], ['users', userId]],

  // Callbacks
  onSuccess: (data) => {
    toast.success('User updated');
  },
  onError: (error) => {
    toast.error(error.message);
  },
  onSettled: () => {
    setIsEditing(false);
  },

  // Retry configuration
  retry: 1,
});

// Usage
updateUser.mutate({ name: 'New Name' });
await updateUser.mutateAsync({ name: 'New Name' });
```

### Convenience Hooks

```tsx
import {
  useGet,
  useGetById,
  useGetList,
  usePost,
  usePut,
  usePatch,
  useDelete,
} from '@/lib/api';

// Simplified data fetching
const { data: users } = useGetList<User>('/api/users');
const { data: user } = useGetById<User>('/api/users', userId);
const { data: config } = useGet<Config>('/api/config');

// Simplified mutations
const create = usePost<User>('/api/users');
const update = usePut<User>(`/api/users/${id}`);
const patch = usePatch<User>(`/api/users/${id}`);
const remove = useDelete(`/api/users/${id}`);
```

### Parallel Requests

```tsx
import { useParallelRequests } from '@/lib/api';

function Dashboard() {
  const { data, isLoading, errors } = useParallelRequests([
    { url: '/api/users', queryKey: ['users'] },
    { url: '/api/posts', queryKey: ['posts'] },
    { url: '/api/stats', queryKey: ['stats'] },
  ]);

  const [users, posts, stats] = data;

  return (
    <div>
      <UserSection users={users} />
      <PostSection posts={posts} />
      <StatsSection stats={stats} />
    </div>
  );
}
```

### Dependent Requests

```tsx
import { useDependentRequest } from '@/lib/api';

function UserPosts() {
  // First fetch user
  const { data: user } = useApiRequest<User>({
    url: '/api/users/me',
    queryKey: ['me'],
  });

  // Then fetch user's posts (depends on user)
  const { data: posts } = useDependentRequest<Post[]>({
    url: `/api/users/${user?.id}/posts`,
    queryKey: ['posts', user?.id],
    enabled: !!user?.id, // Only runs when user is loaded
  });

  return (
    <div>
      <UserInfo user={user} />
      <PostList posts={posts} />
    </div>
  );
}
```

### Polling

```tsx
import { usePolling } from '@/lib/api';

function LiveData() {
  const { data, isPolling, startPolling, stopPolling } = usePolling<Stats>({
    url: '/api/stats',
    queryKey: ['stats'],
    interval: 5000,       // Poll every 5 seconds
    enabled: true,        // Start automatically
    pauseOnHidden: true,  // Pause when tab is hidden
  });

  return (
    <div>
      <Stats data={data} />
      <button onClick={isPolling ? stopPolling : startPolling}>
        {isPolling ? 'Stop' : 'Start'} Polling
      </button>
    </div>
  );
}
```

---

## Request Building

### RequestBuilder Class

```tsx
import { RequestBuilder, get, post, put, del } from '@/lib/api';

// Fluent request building
const request = get<User[]>('/users')
  .query({ role: 'admin', active: true })
  .header('X-Custom-Header', 'value')
  .timeout(10000)
  .build();

const users = await apiClient.execute(request);

// Complex POST request
const createRequest = post<User>('/users')
  .body({
    name: 'John',
    email: 'john@example.com',
  })
  .header('X-Idempotency-Key', generateId())
  .timeout(30000)
  .build();

// File upload
const uploadRequest = post('/upload')
  .formData()
  .append('file', fileBlob)
  .append('metadata', JSON.stringify({ name: 'doc.pdf' }))
  .build();
```

### URL Building

```tsx
import { buildUrl, joinUrl, buildApiUrl } from '@/lib/api';

// Build URL with params
const url = buildUrl('/users/:id/posts/:postId', {
  id: '123',
  postId: '456',
});
// "/users/123/posts/456"

// Build URL with query params
const searchUrl = buildUrl('/search', {}, {
  q: 'react',
  page: '1',
  filters: ['active', 'published'],
});
// "/search?q=react&page=1&filters=active&filters=published"

// Join URL parts
const apiUrl = joinUrl(baseUrl, 'api', 'v1', 'users');
// "https://example.com/api/v1/users"
```

---

## Response Handling

### Type-Safe Responses

```tsx
import { parseResponse, ApiResponse } from '@/lib/api';

// Standard API response format
interface ApiResponse<T> {
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
  links?: {
    self: string;
    next?: string;
    prev?: string;
  };
}

// Parse and extract data
const response = await apiClient.get<ApiResponse<User[]>>('/users');
const users = response.data;
const { page, total } = response.meta;
```

### Pagination Handling

```tsx
import { useGetList, usePagination } from '@/lib/api';

function PaginatedList() {
  const { page, limit, setPage, setLimit } = usePagination({
    initialPage: 1,
    initialLimit: 20,
  });

  const { data, isLoading } = useGetList<User>('/api/users', {
    params: { page, limit },
    queryKey: ['users', page, limit],
  });

  return (
    <div>
      <UserList users={data?.data} />
      <Pagination
        page={page}
        total={data?.meta?.total}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />
    </div>
  );
}
```

### Infinite Scrolling

```tsx
import { useInfiniteApiRequest } from '@/lib/api';

function InfiniteList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteApiRequest<User>({
    url: '/api/users',
    queryKey: ['users', 'infinite'],
    getNextPageParam: (lastPage) => lastPage.meta?.nextCursor,
  });

  const users = data?.pages.flatMap(page => page.data) ?? [];

  return (
    <div>
      <ul>
        {users.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          Load More
        </button>
      )}
    </div>
  );
}
```

---

## Error Handling

### Error Types

```typescript
interface ApiError {
  code: string;
  message: string;
  status: number;
  category: 'network' | 'auth' | 'validation' | 'server' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details?: Record<string, unknown>;
  field?: string; // For validation errors
  retryable: boolean;
}

// Common error codes
const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVER_ERROR: 'SERVER_ERROR',
};
```

### Error Handling Hook

```tsx
import { useApiRequest } from '@/lib/api';
import { getStructuredErrorMessage, getRecoveryActions } from '@/lib/monitoring';

function UserProfile({ userId }) {
  const { data, error, refetch } = useApiRequest<User>({
    url: `/api/users/${userId}`,
    queryKey: ['users', userId],
  });

  if (error) {
    const message = getStructuredErrorMessage(error);
    const actions = getRecoveryActions(error);

    return (
      <ErrorDisplay
        title={message.title}
        description={message.description}
        actions={actions.map(action => (
          <button key={action.label} onClick={action.handler}>
            {action.label}
          </button>
        ))}
      />
    );
  }

  return <UserCard user={data} />;
}
```

### Global Error Handling

```tsx
import { ApiClientProvider, useApiClient } from '@/lib/api';

function App() {
  return (
    <ApiClientProvider
      onError={(error) => {
        // Global error handling
        if (error.status === 401) {
          authService.logout();
        }

        // Show toast for non-validation errors
        if (error.category !== 'validation') {
          toast.error(error.message);
        }

        // Report to error tracking
        if (error.severity === 'critical') {
          reportError(error);
        }
      }}
    >
      <MainApp />
    </ApiClientProvider>
  );
}
```

### Form Validation Errors

```tsx
function CreateUserForm() {
  const createUser = useApiMutation<User, CreateUserDto>({
    url: '/api/users',
    method: 'POST',
  });

  const fieldErrors = useMemo(() => {
    if (createUser.error?.category !== 'validation') return {};

    return createUser.error.details?.fields || {};
  }, [createUser.error]);

  return (
    <form onSubmit={handleSubmit}>
      <Input
        name="email"
        error={fieldErrors.email}
      />
      <Input
        name="name"
        error={fieldErrors.name}
      />
      <button type="submit">Create</button>
    </form>
  );
}
```

---

## Caching Strategies

### Query Configuration

```tsx
import { useApiRequest } from '@/lib/api';

// Long cache for static data
const { data: config } = useApiRequest({
  url: '/api/config',
  queryKey: ['config'],
  staleTime: Infinity,        // Never stale
  gcTime: 24 * 60 * 60 * 1000, // Keep 24 hours
});

// Short cache for dynamic data
const { data: notifications } = useApiRequest({
  url: '/api/notifications',
  queryKey: ['notifications'],
  staleTime: 30 * 1000,       // 30 seconds
  refetchInterval: 60 * 1000, // Refetch every minute
});

// No cache for sensitive data
const { data: balance } = useApiRequest({
  url: '/api/balance',
  queryKey: ['balance'],
  staleTime: 0,               // Always stale
  gcTime: 0,                   // Don't cache
});
```

### Cache Invalidation

```tsx
import { useApiMutation, useApiCache } from '@/lib/api';

function UserActions() {
  const { invalidate, setData, getData } = useApiCache();

  const deleteUser = useApiMutation({
    url: '/api/users',
    method: 'DELETE',
    onSuccess: (_, userId) => {
      // Invalidate user list
      invalidate(['users']);

      // Or optimistically update cache
      setData(['users'], (old) =>
        old.filter(u => u.id !== userId)
      );
    },
  });

  return <button onClick={() => deleteUser.mutate(userId)}>Delete</button>;
}
```

### Prefetching

```tsx
import { usePrefetch } from '@/lib/api';

function UserListItem({ user }) {
  const prefetch = usePrefetch();

  return (
    <Link
      to={`/users/${user.id}`}
      onMouseEnter={() => {
        // Prefetch user details on hover
        prefetch({
          url: `/api/users/${user.id}`,
          queryKey: ['users', user.id],
        });
      }}
    >
      {user.name}
    </Link>
  );
}
```

---

## Optimistic Updates

### Basic Optimistic Update

```tsx
import { useApiMutation, createOptimisticUpdate } from '@/lib/api';

function TodoItem({ todo }) {
  const toggleTodo = useApiMutation({
    url: `/api/todos/${todo.id}`,
    method: 'PATCH',

    // Optimistic update configuration
    optimistic: {
      queryKey: ['todos'],
      update: (oldTodos, variables) =>
        oldTodos.map(t =>
          t.id === todo.id ? { ...t, ...variables } : t
        ),
    },
  });

  return (
    <Checkbox
      checked={todo.completed}
      onChange={() => toggleTodo.mutate({ completed: !todo.completed })}
    />
  );
}
```

### Optimistic Add/Remove

```tsx
import {
  createOptimisticAdd,
  createOptimisticRemove,
} from '@/lib/api';

function TodoList() {
  const addTodo = useApiMutation({
    url: '/api/todos',
    method: 'POST',
    optimistic: createOptimisticAdd({
      queryKey: ['todos'],
      tempId: () => `temp-${Date.now()}`,
    }),
  });

  const removeTodo = useApiMutation({
    url: '/api/todos',
    method: 'DELETE',
    optimistic: createOptimisticRemove({
      queryKey: ['todos'],
      getId: (variables) => variables.id,
    }),
  });

  return (
    <div>
      <button onClick={() => addTodo.mutate({ title: 'New Todo' })}>
        Add Todo
      </button>
      {todos.map(todo => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onDelete={() => removeTodo.mutate({ id: todo.id })}
        />
      ))}
    </div>
  );
}
```

---

## Mock API System

### Setup Mock Server

```tsx
import { mockServer, mockHandlers, mockData } from '@/lib/api';

// Register mock routes
mockServer.get('/api/users', mockHandlers.success([
  { id: mockData.uuid(), name: mockData.name(), email: mockData.email() },
  { id: mockData.uuid(), name: mockData.name(), email: mockData.email() },
]));

mockServer.get('/api/users/:id', (req) => {
  return mockHandlers.success({
    id: req.params.id,
    name: mockData.name(),
    email: mockData.email(),
  });
});

mockServer.post('/api/users', (req) => {
  return mockHandlers.success({
    id: mockData.uuid(),
    ...req.body,
    createdAt: new Date().toISOString(),
  });
});

// Simulate errors
mockServer.delete('/api/users/:id', mockHandlers.error(403, 'Forbidden'));

// Simulate delay
mockServer.get('/api/slow', mockHandlers.delay(2000, { data: 'slow' }));

// Enable mocking
if (import.meta.env.DEV) {
  mockServer.start();
}
```

### CRUD Handler Factory

```tsx
import { createCrudHandlers } from '@/lib/api';

// Generate all CRUD handlers for a resource
const userHandlers = createCrudHandlers<User>({
  basePath: '/api/users',
  generateId: () => mockData.uuid(),
  initialData: [
    { id: '1', name: 'John', email: 'john@example.com' },
    { id: '2', name: 'Jane', email: 'jane@example.com' },
  ],
});

// Registers: GET /api/users
//           GET /api/users/:id
//           POST /api/users
//           PUT /api/users/:id
//           PATCH /api/users/:id
//           DELETE /api/users/:id
mockServer.use(userHandlers);
```

---

## Advanced Patterns

### Request Queue

```tsx
import { RequestQueue } from '@/lib/services';

const queue = new RequestQueue({
  concurrency: 3,
  maxQueueSize: 100,
});

// Add requests to queue
queue.add({
  url: '/api/data',
  priority: 'high',
  onComplete: (result) => console.log(result),
});

// Batch operations
queue.addBatch([
  { url: '/api/item/1' },
  { url: '/api/item/2' },
  { url: '/api/item/3' },
]);
```

### API Health Monitoring

```tsx
import { useApiHealth } from '@/lib/api';

function ApiStatus() {
  const { isHealthy, latency, lastCheck, check } = useApiHealth({
    endpoint: '/api/health',
    interval: 30000,
  });

  return (
    <div className="api-status">
      <span className={isHealthy ? 'healthy' : 'unhealthy'}>
        {isHealthy ? 'API Online' : 'API Offline'}
      </span>
      <span>Latency: {latency}ms</span>
      <button onClick={check}>Check Now</button>
    </div>
  );
}
```

### Multi-API Client

```tsx
import { createApiClient } from '@/lib/api';

// Create clients for different APIs
const mainApi = createApiClient({
  baseURL: 'https://api.example.com',
});

const analyticsApi = createApiClient({
  baseURL: 'https://analytics.example.com',
});

const legacyApi = createApiClient({
  baseURL: 'https://legacy.example.com',
  headers: { 'X-Legacy-Version': '1' },
});

// Use appropriate client
const users = await mainApi.get('/users');
const events = await analyticsApi.post('/events', eventData);
```

---

## Type Definitions

```typescript
interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  retry?: RetryConfig;
  deduplication?: DeduplicationConfig;
  tokenProvider?: () => Promise<string>;
}

interface UseApiRequestOptions<T> {
  url: string;
  queryKey: unknown[];
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  params?: Record<string, unknown>;
  body?: unknown;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  retry?: number | boolean;
  refetchOnWindowFocus?: boolean;
  refetchInterval?: number;
  select?: (data: unknown) => T;
}

interface UseApiMutationOptions<TData, TVariables> {
  url: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  invalidateKeys?: unknown[][];
  optimistic?: OptimisticConfig;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: ApiError, variables: TVariables) => void;
  onSettled?: () => void;
  retry?: number;
}
```

---

## See Also

- [Documentation Index](./INDEX.md) - All documentation resources
- [Architecture Guide](./ARCHITECTURE.md) - System design and patterns
- [Performance Guide](./PERFORMANCE.md) - Caching optimization
- [Configuration Guide](./CONFIGURATION.md) - API configuration options
