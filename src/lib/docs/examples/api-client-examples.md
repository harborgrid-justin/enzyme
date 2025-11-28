# API Client Examples

> **Module**: `@/lib/api`
> **Key Exports**: `apiClient`, `useApiRequest`, `useApiMutation`, `createQueryKeyFactory`

This guide provides comprehensive examples for using the API client and related utilities.

---

## Table of Contents

- [Basic Requests](#basic-requests)
- [Request Configuration](#request-configuration)
- [Error Handling](#error-handling)
- [Interceptors](#interceptors)
- [Rate Limiting](#rate-limiting)
- [Request Cancellation](#request-cancellation)
- [React Query Integration](#react-query-integration)
- [Type-Safe Endpoints](#type-safe-endpoints)

---

## Basic Requests

### GET Request

```tsx
import { apiClient } from '@/lib/api';

// Simple GET
const users = await apiClient.get<User[]>('/users');
console.log(users.data);

// GET with query parameters
const filteredUsers = await apiClient.get<User[]>('/users', {
  params: {
    role: 'admin',
    active: true,
    limit: 10,
  },
});
```

### POST Request

```tsx
// Create a new user
const newUser = await apiClient.post<User>('/users', {
  body: {
    name: 'John Doe',
    email: 'john@example.com',
    role: 'user',
  },
});
```

### PUT/PATCH Request

```tsx
// Full update
await apiClient.put<User>(`/users/${userId}`, {
  body: {
    name: 'Jane Doe',
    email: 'jane@example.com',
    role: 'admin',
  },
});

// Partial update
await apiClient.patch<User>(`/users/${userId}`, {
  body: {
    role: 'admin',
  },
});
```

### DELETE Request

```tsx
await apiClient.delete(`/users/${userId}`);
```

---

## Request Configuration

### Custom Headers

```tsx
const response = await apiClient.get<Data>('/protected', {
  headers: {
    'X-Custom-Header': 'value',
    'Accept-Language': 'en-US',
  },
});
```

### Timeout

```tsx
const response = await apiClient.get<Data>('/slow-endpoint', {
  timeout: 30000, // 30 seconds
});
```

### Path Parameters

```tsx
// Using path params
const user = await apiClient.get<User>('/users/:id', {
  pathParams: { id: '123' },
});
// Results in: GET /users/123
```

### Retry Configuration

```tsx
const response = await apiClient.get<Data>('/flaky-endpoint', {
  retry: {
    attempts: 3,
    delay: 1000, // 1 second base delay
    backoffFactor: 2, // Exponential backoff
  },
});
```

---

## Error Handling

### Using Type Guards

```tsx
import {
  isApiError,
  isAuthenticationError,
  isValidationError,
  isRateLimitError,
  isServerError,
} from '@/lib/api/types';

async function fetchUser(id: string) {
  try {
    const response = await apiClient.get<User>(`/users/${id}`);
    return response.data;
  } catch (error) {
    if (isAuthenticationError(error)) {
      // Redirect to login
      redirectToLogin();
    } else if (isValidationError(error)) {
      // Show field errors
      showFieldErrors(error.fieldErrors);
    } else if (isRateLimitError(error)) {
      // Show retry message
      const retryAfter = error.retryAfter || 60;
      showMessage(`Too many requests. Try again in ${retryAfter}s`);
    } else if (isServerError(error)) {
      // Show generic error
      showMessage('Server error. Please try again later.');
    }
    throw error;
  }
}
```

### Error Boundary Integration

```tsx
function UserProfile({ userId }) {
  const { data, error, isLoading } = useApiRequest<User>({
    url: `/users/${userId}`,
  });

  if (isLoading) return <Spinner />;

  if (error) {
    if (isAuthenticationError(error)) {
      throw error; // Let error boundary handle
    }
    return <ErrorMessage message={error.message} />;
  }

  return <UserCard user={data} />;
}
```

---

## Interceptors

### Adding Request Interceptor

```tsx
// Add auth token to all requests
apiClient.addRequestInterceptor(async (config) => {
  const token = await getAuthToken();
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }
  return config;
});
```

### Adding Response Interceptor

```tsx
// Transform response data
apiClient.addResponseInterceptor(async (response) => {
  // Log all successful responses
  console.log(`[API] ${response.config.method} ${response.config.url}`, response.status);
  return response;
});
```

### Adding Error Interceptor

```tsx
// Handle token refresh on 401
apiClient.addErrorInterceptor(async (error) => {
  if (error.status === 401 && !error.config._retry) {
    error.config._retry = true;

    try {
      await refreshAuthToken();
      return apiClient.request(error.config); // Retry original request
    } catch (refreshError) {
      // Refresh failed, logout user
      logout();
    }
  }
  throw error;
});
```

### CSRF Interceptor

```tsx
import { createCsrfInterceptor, DEFAULT_CSRF_INTERCEPTOR } from '@/lib/api/interceptors';

// Use default CSRF protection
apiClient.addRequestInterceptor(DEFAULT_CSRF_INTERCEPTOR);

// Or create custom one
const csrfInterceptor = createCsrfInterceptor({
  cookieName: 'csrf_token',
  headerName: 'X-CSRF-Token',
  methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
});
apiClient.addRequestInterceptor(csrfInterceptor);
```

---

## Rate Limiting

### Basic Rate Limiting

```tsx
import { apiClient } from '@/lib/api';

// Check if request would be rate limited
const wouldLimit = apiClient.wouldBeRateLimited('GET', '/users');

if (wouldLimit) {
  showMessage('Please wait before making another request');
} else {
  await apiClient.get('/users');
}
```

### Custom Rate Limits

```tsx
// Set custom rate limit for endpoint
apiClient.setRateLimit('/api/search', {
  requestsPerMinute: 30,
  requestsPerSecond: 2,
});
```

### Handling 429 Responses

```tsx
try {
  const response = await apiClient.get('/search', { params: { q: query } });
  return response.data;
} catch (error) {
  if (isRateLimitError(error)) {
    const retryAfter = error.retryAfter || 60;

    // Show countdown
    setRateLimitCountdown(retryAfter);

    // Optionally retry after delay
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    return apiClient.get('/search', { params: { q: query } });
  }
  throw error;
}
```

---

## Request Cancellation

### Cancel by Request ID

```tsx
function SearchComponent() {
  const handleSearch = async (query: string) => {
    // Cancel previous search
    apiClient.cancelRequest('search-request');

    const response = await apiClient.get('/search', {
      params: { q: query },
      requestId: 'search-request',
    });

    return response.data;
  };

  return <input onChange={(e) => handleSearch(e.target.value)} />;
}
```

### Cancel on Unmount

```tsx
function UserDetails({ userId }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const requestId = `user-${userId}`;

    apiClient.get<User>(`/users/${userId}`, { requestId })
      .then(response => setUser(response.data))
      .catch(error => {
        if (!isCancelledError(error)) {
          console.error(error);
        }
      });

    return () => {
      apiClient.cancelRequest(requestId);
    };
  }, [userId]);

  return user ? <UserCard user={user} /> : <Spinner />;
}
```

### Cancel All Requests

```tsx
function Navigation() {
  const handleNavigate = (path: string) => {
    // Cancel all pending requests before navigation
    apiClient.cancelAllRequests();
    navigate(path);
  };

  return <nav>{/* navigation items */}</nav>;
}
```

---

## React Query Integration

### useApiRequest Hook

```tsx
import { useApiRequest } from '@/lib/api/hooks';

function UserList() {
  const { data, isLoading, error, refetch } = useApiRequest<User[]>({
    url: '/users',
    params: { active: true },
    queryKey: ['users', 'active'],
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      <button onClick={() => refetch()}>Refresh</button>
      <ul>
        {data?.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### useApiMutation Hook

```tsx
import { useApiMutation } from '@/lib/api/hooks';

function CreateUserForm() {
  const { mutate, isLoading, error } = useApiMutation<User, CreateUserDTO>({
    url: '/users',
    method: 'POST',
    onSuccess: (data) => {
      showToast(`User ${data.name} created!`);
      queryClient.invalidateQueries(['users']);
    },
    onError: (error) => {
      showToast(`Error: ${error.message}`);
    },
  });

  const handleSubmit = (data: CreateUserDTO) => {
    mutate(data);
  };

  return <form onSubmit={handleSubmit}>{/* form fields */}</form>;
}
```

### Query Key Factory

```tsx
import { createQueryKeyFactory } from '@/lib/queries';

const userKeys = createQueryKeyFactory('users');

// Usage
const allUsersKey = userKeys.all; // ['users']
const userListKey = userKeys.list({ role: 'admin' }); // ['users', 'list', { role: 'admin' }]
const userDetailKey = userKeys.detail('123'); // ['users', 'detail', '123']

// In component
function UserList({ role }) {
  const { data } = useQuery({
    queryKey: userKeys.list({ role }),
    queryFn: () => apiClient.get('/users', { params: { role } }),
  });
}
```

### Optimistic Updates

```tsx
import { useOptimisticMutation } from '@/lib/api/hooks';

function TodoItem({ todo }) {
  const { mutate } = useOptimisticMutation({
    mutationFn: (completed: boolean) =>
      apiClient.patch(`/todos/${todo.id}`, { body: { completed } }),

    // Optimistically update cache before request completes
    onMutate: async (completed) => {
      await queryClient.cancelQueries(['todos']);

      const previous = queryClient.getQueryData(['todos']);

      queryClient.setQueryData(['todos'], (old: Todo[]) =>
        old.map(t => t.id === todo.id ? { ...t, completed } : t)
      );

      return { previous };
    },

    // Rollback on error
    onError: (err, _, context) => {
      queryClient.setQueryData(['todos'], context?.previous);
    },
  });

  return (
    <input
      type="checkbox"
      checked={todo.completed}
      onChange={(e) => mutate(e.target.checked)}
    />
  );
}
```

---

## Type-Safe Endpoints

### Using Endpoint Registry

```tsx
import { registerEndpoint, buildEndpointUrl, useEndpoint } from '@/lib/core/config';

// Register endpoints
registerEndpoint({
  name: 'users.list',
  path: '/users',
  method: 'GET',
  auth: true,
  cache: { strategy: 'cache-first', ttl: 300000 },
});

registerEndpoint({
  name: 'users.detail',
  path: '/users/:id',
  method: 'GET',
  auth: true,
});

// Use in component
function UserList() {
  const endpoint = useEndpoint('users.list');

  const { data } = useApiRequest<User[]>({
    url: endpoint?.path || '/users',
    enabled: !!endpoint,
  });

  return <div>{/* content */}</div>;
}

// Build URL with params
const userUrl = buildEndpointUrl('users.detail', { id: '123' });
// Result: '/users/123'
```

### Type-Safe API Functions

```tsx
// Define typed API functions
async function getUsers(params?: { role?: string; active?: boolean }) {
  const response = await apiClient.get<User[]>('/users', { params });
  return response.data;
}

async function getUser(id: string) {
  const response = await apiClient.get<User>(`/users/${id}`);
  return response.data;
}

async function createUser(data: CreateUserDTO) {
  const response = await apiClient.post<User>('/users', { body: data });
  return response.data;
}

async function updateUser(id: string, data: Partial<User>) {
  const response = await apiClient.patch<User>(`/users/${id}`, { body: data });
  return response.data;
}

async function deleteUser(id: string) {
  await apiClient.delete(`/users/${id}`);
}

// Export as service
export const userService = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
};
```

---

## See Also

- [Authentication Examples](./auth-examples.md)
- [Error Handling Examples](./error-handling-examples.md)
- [State Management Examples](./state-examples.md)
