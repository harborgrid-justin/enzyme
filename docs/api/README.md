# API Module Overview

**Enterprise-grade API infrastructure for @missionfabric-js/enzyme**

The API module provides a comprehensive, type-safe HTTP client infrastructure with built-in retry logic, request/response interception, automatic deduplication, React Query integration, and enterprise features like rate limiting, request orchestration, and auto-generation.

## Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Core Features](#core-features)
- [Module Structure](#module-structure)
- [Documentation](#documentation)
- [Examples](#examples)

## Quick Start

### Basic API Request

```typescript
import { apiClient } from '@/lib/api';

// Make a simple GET request
const response = await apiClient.get<User[]>('/users');
console.log(response.data);

// POST request with body
const newUser = await apiClient.post<User, CreateUserDto>('/users', {
  name: 'John Doe',
  email: 'john@example.com',
});
```

### React Hooks

```typescript
import { useApiRequest, useApiMutation } from '@/lib/api';

function UserProfile({ userId }: { userId: string }) {
  // Fetch data with automatic caching
  const { data, isLoading, error } = useApiRequest<User>({
    url: `/users/${userId}`,
    queryKey: ['users', userId],
  });

  // Mutation with optimistic updates
  const updateUser = useApiMutation<User, UpdateUserDto>({
    method: 'PATCH',
    url: `/users/${userId}`,
    invalidateQueries: [['users', userId]],
  });

  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;

  return <UserCard user={data} onUpdate={updateUser.mutate} />;
}
```

### Custom API Client

```typescript
import { createApiClient } from '@/lib/api';

const client = createApiClient({
  baseUrl: 'https://api.example.com',
  timeout: 30000,
  headers: {
    'X-API-Key': process.env.API_KEY,
  },
  retry: {
    maxAttempts: 5,
    baseDelay: 2000,
  },
  rateLimit: 'standard', // Built-in rate limiting
});
```

## Architecture

The API module follows a layered architecture:

```
┌─────────────────────────────────────────────────────────┐
│                    React Components                      │
├─────────────────────────────────────────────────────────┤
│                      API Hooks                           │
│  useApiRequest | useApiMutation | useApiCache | ...     │
├─────────────────────────────────────────────────────────┤
│                   React Query Layer                      │
│        (Caching, Deduplication, Synchronization)        │
├─────────────────────────────────────────────────────────┤
│                    API Client Core                       │
│  Request Builder | Response Handler | Interceptors      │
├─────────────────────────────────────────────────────────┤
│                  Advanced Features                       │
│  Rate Limiter | Orchestrator | Gateway | Metrics        │
├─────────────────────────────────────────────────────────┤
│                      HTTP Layer                          │
│              (Fetch API with enhancements)               │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

```
Component
    ↓ (uses hook)
API Hook
    ↓ (wraps with React Query)
React Query
    ↓ (manages caching)
API Client
    ↓ (applies interceptors)
Request Interceptors
    ↓ (builds request)
HTTP Request
    ↓ (sends to server)
Server
    ↓ (returns response)
Response Interceptors
    ↓ (processes response)
API Client
    ↓ (updates cache)
React Query
    ↓ (triggers re-render)
Component
```

## Core Features

### 🚀 Type-Safe Requests

- Full TypeScript support with generics
- Automatic type inference
- Request/response validation
- Compile-time error checking

### ⚡ Performance Optimized

- Automatic request deduplication
- Built-in caching with React Query
- Optimistic updates
- Request batching and parallelization

### 🔄 Retry & Resilience

- Exponential backoff with jitter
- Configurable retry strategies
- Circuit breaker patterns
- Timeout management

### 🔐 Security

- Automatic token refresh
- CSRF protection
- Secure token storage with encryption
- Configurable token providers

### 📊 Monitoring & Metrics

- Request/response logging
- Performance metrics collection
- Health monitoring
- Rate limit tracking

### 🎯 Developer Experience

- Fluent API design
- Comprehensive error handling
- Mock server for testing
- Auto-generated API endpoints from file structure

## Module Structure

```
src/lib/api/
├── index.ts                    # Main exports
├── types.ts                    # TypeScript type definitions
├── api-client.ts              # Core HTTP client
├── api-client-config.ts       # Client configuration
├── request-builder.ts         # Fluent request builder
├── response-handler.ts        # Response processing
├── api-hooks-factory.ts       # Hook generation
├── mock-api.ts                # Mock server
│
├── hooks/                     # React hooks
│   ├── useApiRequest.ts      # Data fetching
│   ├── useApiMutation.ts     # Data mutations
│   ├── useApiCache.ts        # Cache management
│   ├── useApiHealth.ts       # Health monitoring
│   └── useApiClient.tsx      # Client context
│
├── advanced/                  # Enterprise features
│   ├── api-gateway.ts        # API Gateway pattern
│   ├── rate-limiter.ts       # Rate limiting
│   ├── request-orchestrator.ts # Request coordination
│   ├── response-normalizer.ts  # Response normalization
│   ├── api-versioning.ts     # API versioning
│   ├── request-deduplication.ts # Deduplication
│   └── api-metrics.ts        # Metrics collection
│
├── auto/                      # Auto-generation
│   ├── api-generator.ts      # Endpoint generation
│   ├── endpoint-registry.ts  # Endpoint management
│   ├── route-scanner.ts      # File system scanner
│   └── rbac-integration.ts   # Access control
│
└── interceptors/              # Request/response interceptors
    └── csrf-interceptor.ts   # CSRF protection
```

## Documentation

### Core Documentation

- **[API Client](./API_CLIENT.md)** - HTTP client, configuration, and utilities
- **[Hooks](./HOOKS.md)** - React hooks for data fetching and mutations
- **[Types](./TYPES.md)** - Complete TypeScript type reference

### Advanced Features

- **[Advanced Features](./ADVANCED.md)** - Gateway, orchestration, metrics, etc.
- **[Auto Generation](./AUTO_GENERATION.md)** - Auto-generate REST APIs from file structure
- **[Interceptors](./INTERCEPTORS.md)** - Request/response interceptors

## Examples

### Complete CRUD Operations

```typescript
import { useApiRequest, useApiMutation } from '@/lib/api';

function UserManagement() {
  // List users
  const { data: users } = useGetList<User>('/users', {
    page: 1,
    pageSize: 20,
    filters: { status: 'active' },
  });

  // Create user
  const createUser = usePost<User, CreateUserDto>('/users', {
    invalidateQueries: [['users', 'list']],
    onSuccess: (user) => toast.success(`Created ${user.name}`),
  });

  // Update user
  const updateUser = usePatch<User, UpdateUserDto>('/users/:id', {
    invalidateQueries: [['users', 'list']],
  });

  // Delete user
  const deleteUser = useDelete<void>('/users/:id', {
    invalidateQueries: [['users', 'list']],
    onSuccess: () => toast.success('User deleted'),
  });

  return (
    <div>
      <button onClick={() => createUser.mutate({
        body: { name: 'New User', email: 'new@example.com' }
      })}>
        Create User
      </button>
      {users?.map(user => (
        <UserCard
          key={user.id}
          user={user}
          onUpdate={(updates) => updateUser.mutate({
            pathParams: { id: user.id },
            body: updates,
          })}
          onDelete={() => deleteUser.mutate({
            pathParams: { id: user.id }
          })}
        />
      ))}
    </div>
  );
}
```

### Advanced Request Orchestration

```typescript
import { RequestOrchestrator, createAPIGateway } from '@/lib/api/advanced';

// Create gateway
const gateway = createAPIGateway({
  baseUrl: 'https://api.example.com',
  defaultApiVersion: 'v1',
});

// Create orchestrator
const orchestrator = new RequestOrchestrator(gateway.request.bind(gateway));

// Execute dependent requests
const result = await orchestrator.orchestrate([
  {
    id: 'user',
    request: { path: '/users/me', method: 'GET' },
  },
  {
    id: 'preferences',
    request: { path: '/users/me/preferences', method: 'GET' },
    dependsOn: ['user'],
  },
  {
    id: 'notifications',
    request: { path: '/notifications', method: 'GET' },
    dependsOn: ['user'],
    transform: (data) => data.items,
  },
]);

console.log('User:', result.results.user);
console.log('Preferences:', result.results.preferences);
console.log('Notifications:', result.results.notifications);
```

### Rate Limiting

```typescript
import { createApiClient } from '@/lib/api';

const client = createApiClient({
  baseUrl: 'https://api.example.com',
  // Use preset rate limit configuration
  rateLimit: 'standard', // 100 requests/minute
});

// Or custom configuration
const customClient = createApiClient({
  baseUrl: 'https://api.example.com',
  rateLimit: {
    maxRequests: 50,
    windowMs: 60000,
    strategy: 'queue',
  },
});

// Check if request would be rate limited
if (client.wouldBeRateLimited('/api/users')) {
  console.log('Request would be rate limited');
}

// Get rate limiter status
const limiter = client.getRateLimiter();
if (limiter) {
  const status = limiter.getStatus('/api/users');
  console.log(`${status.remaining} requests remaining`);
}
```

### Auto-Generated API

```typescript
import { initializeAutoApi } from '@/lib/api/auto';

// Initialize auto API from file structure
const api = await initializeAutoApi({
  rootDir: '/src/api',
  rbac: {
    checkPermission: (user, perm) => user.permissions.includes(perm),
    checkRole: (user, role) => user.roles.includes(role),
  },
});

// Use generated endpoints
const lookup = api.registry.getByPath('/api/users', 'GET');
if (lookup) {
  const access = await api.registry.checkAccess(
    lookup.endpoint.id,
    { user: currentUser }
  );

  if (access.allowed) {
    // Handle request
    const response = await fetch('/api/users');
  }
}

// Generate OpenAPI documentation
const spec = api.registry.generateOpenAPISpec({
  title: 'My API',
  version: '1.0.0',
});
```

### Health Monitoring

```typescript
import { useApiHealth } from '@/lib/api';

function ApiStatusIndicator() {
  const {
    status,
    isHealthy,
    latency,
    checkNow,
  } = useApiHealth({
    endpoint: '/health',
    interval: 30000, // Check every 30 seconds
    onStatusChange: (newStatus, oldStatus) => {
      if (newStatus === 'unhealthy') {
        showErrorToast('API is currently unavailable');
      }
    },
  });

  return (
    <div>
      <StatusBadge status={status} />
      <span>Latency: {latency}ms</span>
      <button onClick={checkNow}>Check Now</button>
    </div>
  );
}
```

## Best Practices

### 1. Use TypeScript Types

Always provide type parameters for requests and responses:

```typescript
// ✅ Good
const users = await apiClient.get<User[]>('/users');

// ❌ Bad
const users = await apiClient.get('/users');
```

### 2. Leverage React Query

Use the hook ecosystem for automatic caching and state management:

```typescript
// ✅ Good - automatic caching, deduplication, background refetch
const { data } = useApiRequest<User>({
  url: '/users/123',
  queryKey: ['users', '123'],
});

// ❌ Bad - manual state management, no caching
const [data, setData] = useState(null);
useEffect(() => {
  apiClient.get('/users/123').then(res => setData(res.data));
}, []);
```

### 3. Handle Errors Gracefully

```typescript
const { mutate } = useApiMutation({
  method: 'POST',
  url: '/users',
  onError: (error) => {
    if (isValidationError(error)) {
      // Show field-specific errors
      error.fieldErrors?.forEach(fe => {
        setFieldError(fe.field, fe.message);
      });
    } else {
      // Show general error
      toast.error(error.message);
    }
  },
});
```

### 4. Use Optimistic Updates

```typescript
const updateUser = useApiMutation({
  method: 'PATCH',
  url: '/users/:id',
  ...createOptimisticUpdate<User>(['users', 'list'], (u) => u.id),
});
```

### 5. Configure Retry Appropriately

```typescript
// For critical operations
const client = createApiClient({
  retry: {
    maxAttempts: 5,
    baseDelay: 2000,
    retryOnNetworkError: true,
  },
});

// For real-time operations
const realtimeClient = createApiClient({
  retry: {
    maxAttempts: 0, // No retry
  },
});
```

## Performance Considerations

### Request Deduplication

The API client automatically deduplicates concurrent identical requests:

```typescript
// Only one actual HTTP request is made
const [result1, result2, result3] = await Promise.all([
  apiClient.get('/users'),
  apiClient.get('/users'),
  apiClient.get('/users'),
]);
```

### Caching Strategy

Configure appropriate stale times for different data types:

```typescript
// Frequently changing data
useApiRequest({
  url: '/realtime-stats',
  queryKey: ['stats'],
  staleTime: 5000, // 5 seconds
});

// Rarely changing data
useApiRequest({
  url: '/config',
  queryKey: ['config'],
  staleTime: 300000, // 5 minutes
});
```

### Parallel Requests

Use `useParallelRequests` for independent data:

```typescript
const results = useParallelRequests([
  { url: '/users', queryKey: ['users'] },
  { url: '/posts', queryKey: ['posts'] },
  { url: '/comments', queryKey: ['comments'] },
]);
```

## Testing

### Mock Server

```typescript
import { mockServer, mockHandlers, mockData } from '@/lib/api';

// Set up mock endpoints
mockServer.get('/users', mockHandlers.success([
  { id: mockData.uuid(), name: mockData.name() },
  { id: mockData.uuid(), name: mockData.name() },
]));

// Enable mocking
mockServer.start();

// Make requests (will use mock)
const users = await apiClient.get('/users');

// Disable mocking
mockServer.stop();
```

### Testing Hooks

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

test('fetches user data', async () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  const { result } = renderHook(
    () => useApiRequest({ url: '/users/123', queryKey: ['users', '123'] }),
    { wrapper }
  );

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual(mockUser);
});
```

## Migration Guide

### From Fetch

```typescript
// Before
const response = await fetch('https://api.example.com/users');
const data = await response.json();

// After
import { apiClient } from '@/lib/api';
const response = await apiClient.get<User[]>('/users');
const data = response.data;
```

### From Axios

```typescript
// Before
import axios from 'axios';
const { data } = await axios.get('/users');

// After
import { apiClient } from '@/lib/api';
const { data } = await apiClient.get<User[]>('/users');
```

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/enzyme/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/enzyme/discussions)
- **Documentation**: [Full Documentation](../../README.md)

## License

MIT License - see LICENSE file for details
