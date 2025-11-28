# @defendr/enzyme Framework - API Documentation

Version: 1.0.0
Last Updated: 2025-11-28

---

## Table of Contents

1. [Introduction](#introduction)
2. [API Module](#api-module)
   - [Types](#api-types)
   - [API Client](#api-client)
   - [Request Builder](#request-builder)
   - [Response Handler](#response-handler)
   - [Hooks](#api-hooks)
3. [Auth Module](#auth-module)
   - [Core Authentication](#core-authentication)
   - [RBAC (Role-Based Access Control)](#rbac)
   - [Active Directory Integration](#active-directory)
4. [Config Module](#config-module)
5. [Contexts Module](#contexts-module)

---

## Introduction

The **@defendr/enzyme** framework is an enterprise-grade React application framework providing comprehensive solutions for API communication, authentication, authorization, configuration management, and state management. This documentation covers all exported functions, hooks, classes, and types.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Application Layer                       │
│                    (React Components)                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
       ┌──────────────┼──────────────┐
       │              │              │
┌──────▼──────┐ ┌────▼─────┐ ┌─────▼──────┐
│  API Module │ │   Auth   │ │   Config   │
│             │ │  Module  │ │   Module   │
│ - Client    │ │          │ │            │
│ - Builder   │ │ - Core   │ │ - Env      │
│ - Handlers  │ │ - RBAC   │ │ - Routes   │
│ - Hooks     │ │ - AD     │ │ - Timing   │
└──────┬──────┘ └────┬─────┘ └─────┬──────┘
       │              │              │
       └──────────────┼──────────────┘
                      │
            ┌─────────▼─────────┐
            │  Contexts Module   │
            │  (React Context)   │
            └────────────────────┘
```

---

## API Module

The API module provides enterprise-grade HTTP client infrastructure with type safety, automatic retry logic, request/response interceptors, and React Query integration.

### Module Path
`@/lib/api` or `/home/user/enzyme/src/lib/api/`

### Data Flow

```
┌──────────────┐
│  Component   │
└──────┬───────┘
       │ useApiRequest({ url: '/users' })
       ▼
┌─────────────────┐
│  React Query    │
│  (TanStack)     │
└──────┬──────────┘
       │ queryFn
       ▼
┌─────────────────┐    ┌──────────────┐
│  API Client     │───>│ Interceptors │
│                 │    └──────────────┘
└──────┬──────────┘
       │ fetch()
       ▼
┌─────────────────┐
│  API Server     │
└──────┬──────────┘
       │ response
       ▼
┌─────────────────┐
│ Response Handler│
└──────┬──────────┘
       │ parsed data
       ▼
┌─────────────────┐
│  Component      │
│  (renders)      │
└─────────────────┘
```

---

### API Types

#### Core Types

##### `HttpMethod`
```typescript
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
```

Supported HTTP methods for API requests.

##### `ContentType`
```typescript
type ContentType =
  | 'application/json'
  | 'application/x-www-form-urlencoded'
  | 'multipart/form-data'
  | 'text/plain'
  | 'application/octet-stream';
```

Content types for request bodies.

##### `ResponseType`
```typescript
type ResponseType = 'json' | 'text' | 'blob' | 'arraybuffer' | 'stream';
```

Expected response formats.

#### Request Types

##### `RequestConfig<TBody>`
```typescript
interface RequestConfig<TBody = unknown> {
  method: HttpMethod;
  url: string;
  body?: TBody;
  params?: QueryParams;
  pathParams?: Record<string, string | number>;
  headers?: RequestHeaders;
  timeout?: number;
  responseType?: ResponseType;
  contentType?: ContentType;
  signal?: AbortSignal;
  credentials?: RequestCredentials;
  cache?: RequestCache;
  retry?: RetryConfig;
  priority?: RequestPriority;
  meta?: RequestMeta;
}
```

Complete configuration for an API request.

**Parameters:**
- `method`: HTTP method to use
- `url`: Request URL (relative to base URL)
- `body`: Request payload (for POST, PUT, PATCH)
- `params`: URL query parameters
- `pathParams`: Path parameter substitutions (e.g., `:id`)
- `headers`: Custom HTTP headers
- `timeout`: Request timeout in milliseconds
- `responseType`: Expected response format
- `signal`: AbortController signal for cancellation
- `retry`: Retry configuration

**Example:**
```typescript
const config: RequestConfig<CreateUserDto> = {
  method: 'POST',
  url: '/users',
  body: { name: 'John Doe', email: 'john@example.com' },
  headers: { 'X-Custom-Header': 'value' },
  timeout: 5000,
  retry: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
    retryOnNetworkError: true,
  },
};
```

##### `RetryConfig`
```typescript
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableStatusCodes: number[];
  retryOnNetworkError: boolean;
  shouldRetry?: (error: ApiError, attempt: number) => boolean;
  onRetry?: (error: ApiError, attempt: number) => void;
}
```

Configuration for automatic request retry with exponential backoff.

#### Response Types

##### `ApiResponse<TData>`
```typescript
interface ApiResponse<TData = unknown> {
  data: TData;
  status: number;
  statusText: string;
  headers: ResponseHeaders;
  request: RequestConfig;
  timing: ResponseTiming;
  cache?: CacheInfo;
}
```

API response wrapper providing metadata alongside data.

**Properties:**
- `data`: Response payload
- `status`: HTTP status code (200, 404, etc.)
- `statusText`: HTTP status text
- `headers`: Response headers
- `request`: Original request configuration
- `timing`: Performance timing information

##### `ApiError`
```typescript
interface ApiError extends Error {
  name: 'ApiError';
  status: number;
  code: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  fieldErrors?: FieldError[];
  request?: RequestConfig;
  response?: unknown;
  requestId?: string;
  retryable: boolean;
  timestamp: number;
}
```

Normalized API error structure.

**Type Guards:**
```typescript
function isApiError(value: unknown): value is ApiError;
function isNetworkError(error: ApiError): boolean;
function isAuthenticationError(error: ApiError): boolean;
function isValidationError(error: ApiError): boolean;
```

**Example:**
```typescript
try {
  await apiClient.get('/users');
} catch (error) {
  if (isApiError(error)) {
    console.error(`API Error ${error.status}: ${error.message}`);
    if (isValidationError(error)) {
      error.fieldErrors?.forEach(fe => {
        console.error(`${fe.field}: ${fe.message}`);
      });
    }
  }
}
```

##### `PaginatedResponse<TItem>`
```typescript
interface PaginatedResponse<TItem> {
  items: TItem[];
  pagination: PaginationMeta;
}

interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
  nextCursor?: string;
  prevCursor?: string;
}
```

Standardized pagination wrapper supporting both offset and cursor-based pagination.

---

### API Client

#### Class: `ApiClient`

Enterprise-grade HTTP client with retry logic, interceptors, and token management.

##### Constructor
```typescript
constructor(config: ApiClientConfig)
```

**Parameters:**
- `config`: Client configuration

##### Methods

###### `get<TResponse>(url, options?): Promise<ApiResponse<TResponse>>`

Performs a GET request.

**Parameters:**
- `url`: Request URL
- `options`: Request options (excluding method)

**Returns:** Promise resolving to typed API response

**Example:**
```typescript
const response = await client.get<User[]>('/users', {
  params: { page: 1, limit: 20 },
  timeout: 5000,
});
console.log(response.data); // User[]
```

###### `post<TResponse, TBody>(url, body?, options?): Promise<ApiResponse<TResponse>>`

Performs a POST request.

**Example:**
```typescript
const response = await client.post<User, CreateUserDto>(
  '/users',
  { name: 'John', email: 'john@example.com' },
  { timeout: 10000 }
);
```

###### `put<TResponse, TBody>(url, body?, options?): Promise<ApiResponse<TResponse>>`

Performs a PUT request.

###### `patch<TResponse, TBody>(url, body?, options?): Promise<ApiResponse<TResponse>>`

Performs a PATCH request.

###### `delete<TResponse>(url, options?): Promise<ApiResponse<TResponse>>`

Performs a DELETE request.

###### `addRequestInterceptor(interceptor): () => void`

Adds a request interceptor.

**Parameters:**
- `interceptor`: Function to modify request before execution

**Returns:** Unsubscribe function

**Example:**
```typescript
const unsubscribe = client.addRequestInterceptor((config) => {
  console.log(`[API] ${config.method} ${config.url}`);
  config.headers['X-Request-Time'] = Date.now().toString();
  return config;
});

// Later: remove interceptor
unsubscribe();
```

###### `addResponseInterceptor(interceptor): () => void`

Adds a response interceptor.

**Example:**
```typescript
client.addResponseInterceptor((response) => {
  console.log(`[API] Response ${response.status} in ${response.timing.duration}ms`);
  return response;
});
```

###### `addErrorInterceptor(interceptor): () => void`

Adds an error interceptor.

**Example:**
```typescript
client.addErrorInterceptor((error) => {
  if (error.status === 401) {
    // Redirect to login
    window.location.href = '/login';
  }
  return error;
});
```

###### `setRateLimit(config): void`

Enables or updates rate limiting.

**Parameters:**
- `config`: Rate limit configuration or preset name ('standard', 'strict', 'relaxed')

**Example:**
```typescript
// Use preset
client.setRateLimit('standard');

// Custom config
client.setRateLimit({
  maxRequests: 100,
  windowMs: 60000,
  strategy: 'queue',
});
```

###### `cancelRequest(requestId): void`

Cancels a specific request by ID.

###### `cancelAllRequests(): void`

Cancels all pending requests.

#### Factory Function: `createApiClient`

```typescript
function createApiClient(config: ApiClientConfig): ApiClient
```

Creates a new API client instance.

**Example:**
```typescript
const client = createApiClient({
  baseUrl: 'https://api.example.com',
  timeout: 30000,
  headers: {
    'X-API-Version': 'v1',
  },
  autoRefreshToken: true,
  deduplicate: true,
  retry: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
  },
});
```

#### Singleton Instance: `apiClient`

```typescript
const apiClient: ApiClient
```

Default pre-configured API client instance.

**Example:**
```typescript
import { apiClient } from '@/lib/api';

const users = await apiClient.get<User[]>('/users');
```

---

### Request Builder

#### Class: `RequestBuilder<TResponse, TBody>`

Fluent API for constructing type-safe HTTP requests.

##### Constructor
```typescript
new RequestBuilder<TResponse, TBody>()
```

##### HTTP Method Setters

###### `get(url): this`
Sets HTTP method to GET.

###### `post(url): this`
Sets HTTP method to POST.

###### `put(url): this`
Sets HTTP method to PUT.

###### `patch(url): this`
Sets HTTP method to PATCH.

###### `delete(url): this`
Sets HTTP method to DELETE.

##### Configuration Methods

###### `pathParam(key, value): this`

Sets a single path parameter.

**Example:**
```typescript
builder.get('/users/:userId/posts/:postId')
  .pathParam('userId', '123')
  .pathParam('postId', '456');
// Result: /users/123/posts/456
```

###### `pathParams(params): this`

Sets multiple path parameters.

**Example:**
```typescript
builder.get('/users/:userId/posts/:postId')
  .pathParams({ userId: '123', postId: '456' });
```

###### `query(params): this`

Sets query parameters.

**Example:**
```typescript
builder.get('/users')
  .query({ page: 1, limit: 20, status: 'active' });
// Result: /users?page=1&limit=20&status=active
```

###### `json(data): this`

Sets JSON request body.

**Example:**
```typescript
builder.post('/users')
  .json({ name: 'John', email: 'john@example.com' });
```

###### `formData(): this`

Initializes multipart form data mode.

**Example:**
```typescript
builder.post('/upload')
  .formData()
  .field('title', 'My File')
  .file('document', fileBlob, 'document.pdf');
```

###### `header(key, value): this`

Sets a single header.

###### `headers(headers): this`

Sets multiple headers.

###### `bearer(token): this`

Sets Authorization header with Bearer token.

**Example:**
```typescript
builder.get('/protected')
  .bearer('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
```

###### `timeout(ms): this`

Sets request timeout.

###### `retry(config): this`

Configures retry behavior.

###### `build(): RequestConfig<TBody>`

Builds the final request configuration.

**Complete Example:**
```typescript
import { RequestBuilder } from '@/lib/api';

const config = new RequestBuilder<SearchResults>()
  .get('/search')
  .query({ q: 'term', page: 1, tags: ['featured', 'recent'] })
  .header('X-Custom-Header', 'value')
  .timeout(5000)
  .retry({ maxAttempts: 3 })
  .build();

const response = await apiClient.request<SearchResults>(config);
```

#### Factory Functions

##### `get<TResponse>(url): RequestBuilder<TResponse>`
Creates a GET request builder.

##### `post<TResponse, TBody>(url): RequestBuilder<TResponse, TBody>`
Creates a POST request builder.

##### `put<TResponse, TBody>(url): RequestBuilder<TResponse, TBody>`
Creates a PUT request builder.

##### `patch<TResponse, TBody>(url): RequestBuilder<TResponse, TBody>`
Creates a PATCH request builder.

##### `del<TResponse>(url): RequestBuilder<TResponse>`
Creates a DELETE request builder.

**Example:**
```typescript
import { post } from '@/lib/api';

const config = post<User, CreateUserDto>('/users')
  .json({ name: 'John', email: 'john@example.com' })
  .timeout(10000)
  .build();
```

---

### Response Handler

#### Functions

##### `parseResponse<T>(response, config?): T`

Parses and validates an API response.

**Parameters:**
- `response`: Raw API response
- `config`: Parser configuration (optional)
  - `schema`: Zod/validation schema
  - `transform`: Transformation function
  - `defaultValue`: Default if empty
  - `throwOnValidationError`: Throw on validation failure

**Returns:** Parsed and validated data

**Example:**
```typescript
import { parseResponse } from '@/lib/api';
import { z } from 'zod';

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

const user = parseResponse<User>(response, {
  schema: userSchema,
  transform: (u) => ({ ...u, displayName: u.name.toUpperCase() }),
});
```

##### `normalizeError(error, config?): ApiError`

Normalizes various error formats into consistent `ApiError`.

**Parameters:**
- `error`: Error from API or network
- `config`: Normalization configuration

**Returns:** Normalized API error

**Example:**
```typescript
import { normalizeError } from '@/lib/api';

try {
  await fetch('/api/users');
} catch (error) {
  const normalized = normalizeError(error);
  console.log(normalized.category); // 'network', 'authentication', etc.
  console.log(normalized.severity); // 'error', 'warning', 'info'
}
```

##### `extractCacheHints(headers): CacheHints`

Extracts cache hints from response headers.

**Returns:** Parsed cache control directives

**Example:**
```typescript
const hints = extractCacheHints(response.headers);
if (hints.cacheable && hints.maxAge) {
  cache.set(key, data, hints.maxAge * 1000);
}
```

##### `streamResponse<T>(response, options?): StreamController<T>`

Creates a stream controller for handling streaming responses (SSE, NDJSON).

**Parameters:**
- `response`: Response with readable body stream
- `options`: Stream options
  - `sse`: Parse as Server-Sent Events
  - `ndjson`: Parse as newline-delimited JSON
  - `bufferSize`: Buffer size for accumulation

**Returns:** Stream controller

**Example:**
```typescript
// NDJSON streaming
const stream = streamResponse<Message>(response, { ndjson: true });

const unsubscribe = stream.subscribe((event) => {
  if (event.type === 'data') {
    console.log('Received:', event.data);
  } else if (event.type === 'error') {
    console.error('Stream error:', event.error);
  } else if (event.type === 'end') {
    console.log('Stream ended');
  }
});

// Cleanup
stream.abort();
unsubscribe();
```

##### `extractPagination<T>(response, config?): PaginatedResponse<T>`

Extracts pagination metadata from response.

**Example:**
```typescript
const paginated = extractPagination<User>(response);
console.log(paginated.pagination.total); // Total items
console.log(paginated.pagination.hasMore); // More pages available
console.log(paginated.items); // Current page items
```

##### `createTransformPipeline<T, U>(fn): TransformPipeline`

Creates a transformation pipeline for responses.

**Example:**
```typescript
const pipeline = createTransformPipeline<ApiUser[], User[]>()
  .pipe((data) => data.map(normalizeUser))
  .pipe((users) => users.filter(u => u.active))
  .pipe((users) => users.sort((a, b) => a.name.localeCompare(b.name)));

const users = pipeline.execute(response.data);
```

---

### API Hooks

React hooks for data fetching and mutations with React Query integration.

#### `useApiRequest<TResponse>(options): UseApiRequestResult<TResponse>`

Hook for making typed API GET requests with caching.

**Parameters:**
- `url`: Request URL
- `queryKey`: Query key for caching
- `params`: Query parameters (optional)
- `pathParams`: Path parameters (optional)
- `enabled`: Enable/disable query
- `staleTime`: Stale time in milliseconds
- `onSuccess`: Success callback
- `onError`: Error callback

**Returns:**
- `data`: Response data (undefined while loading)
- `isLoading`: Initial loading state
- `isFetching`: Fetching state (including background refetch)
- `error`: Error if request failed
- `refetch`: Manual refetch function
- `invalidate`: Invalidate and refetch
- `setData`: Update data in cache

**Example:**
```typescript
import { useApiRequest } from '@/lib/api';

function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading, error, refetch } = useApiRequest<User>({
    url: `/users/${userId}`,
    queryKey: ['users', userId],
    staleTime: 60000,
    enabled: !!userId,
    onSuccess: (user) => console.log('Loaded user:', user.name),
  });

  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  if (!data) return null;

  return (
    <div>
      <h1>{data.name}</h1>
      <button onClick={() => refetch()}>Refresh</button>
    </div>
  );
}
```

#### `useApiMutation<TResponse, TBody>(config): UseApiMutationResult<TResponse, TBody>`

Hook for making typed API mutations (POST, PUT, PATCH, DELETE).

**Parameters:**
- `method`: HTTP method
- `url`: Request URL
- `invalidateQueries`: Query keys to invalidate on success
- `optimisticUpdate`: Optimistic update function
- `onSuccess`: Success callback
- `onError`: Error callback

**Returns:**
- `mutate`: Execute mutation
- `mutateAsync`: Execute mutation (async)
- `mutateWithBody`: Execute with just body
- `isLoading`: Loading state
- `isSuccess`: Success state
- `error`: Error if mutation failed
- `data`: Response data
- `reset`: Reset mutation state

**Example:**
```typescript
import { useApiMutation } from '@/lib/api';

function CreateUserForm() {
  const { mutate, isLoading, error } = useApiMutation<User, CreateUserDto>({
    method: 'POST',
    url: '/users',
    invalidateQueries: [['users', 'list']],
    onSuccess: (user) => {
      toast.success(`Created user: ${user.name}`);
      navigate(`/users/${user.id}`);
    },
  });

  const handleSubmit = (data: CreateUserDto) => {
    mutate({ body: data });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create User'}
      </button>
      {error && <ErrorMessage>{error.message}</ErrorMessage>}
    </form>
  );
}
```

#### Specialized Request Hooks

##### `useGet<TResponse>(url, queryKey, options?)`
Simplified hook for GET requests.

##### `useGetById<TResponse>(baseUrl, id, options?)`
Hook for fetching resource by ID.

**Example:**
```typescript
const { data, isLoading } = useGetById<User>('/users', userId);
```

##### `useGetList<TResponse>(url, params?, options?)`
Hook for fetching lists with pagination.

**Example:**
```typescript
const { data, isLoading } = useGetList<User>('/users', {
  page: 1,
  pageSize: 20,
  filters: { status: 'active' },
  sort: 'createdAt',
  order: 'desc',
});
```

##### `useParallelRequests<TResponses>(requests)`
Hook for making multiple parallel requests.

**Example:**
```typescript
const [usersResult, postsResult] = useParallelRequests([
  { url: '/users', queryKey: ['users'] },
  { url: '/posts', queryKey: ['posts'] },
]);

if (usersResult.isLoading || postsResult.isLoading) {
  return <Spinner />;
}
```

##### `useDependentRequest<TFirst, TSecond>(firstRequest, secondRequestFn)`
Hook for sequential dependent requests.

**Example:**
```typescript
const { second } = useDependentRequest<User, Post[]>(
  { url: '/users/123', queryKey: ['users', '123'] },
  (user) => ({
    url: `/users/${user.id}/posts`,
    queryKey: ['users', user.id, 'posts'],
  })
);
```

##### `usePolling<TResponse>(options)`
Hook for polling an endpoint at intervals.

**Example:**
```typescript
const { data, stopPolling } = usePolling<JobStatus>({
  url: `/jobs/${jobId}/status`,
  queryKey: ['jobs', jobId, 'status'],
  interval: 5000,
  stopCondition: (data) => data.status === 'completed',
});

useEffect(() => {
  if (data?.status === 'completed') {
    toast.success('Job completed!');
  }
}, [data]);
```

##### `useLazyQuery<TResponse>(options)`
Hook for manual/lazy queries.

**Example:**
```typescript
const { execute, data, isLoading } = useLazyQuery<User>({
  url: '/users/:id',
  queryKey: ['users'],
});

const handleClick = async (userId: string) => {
  const user = await execute({ pathParams: { id: userId } });
  console.log(user);
};
```

#### Specialized Mutation Hooks

##### `usePost<TResponse, TBody>(url, options?)`
Hook for POST requests.

##### `usePut<TResponse, TBody>(url, options?)`
Hook for PUT requests.

##### `usePatch<TResponse, TBody>(url, options?)`
Hook for PATCH requests.

##### `useDelete<TResponse>(url, options?)`
Hook for DELETE requests.

**Example:**
```typescript
const deleteUser = useDelete<void>('/users/:id', {
  invalidateQueries: [['users', 'list']],
  onSuccess: () => toast.success('User deleted'),
});

deleteUser.mutate({ pathParams: { id: userId } });
```

#### Optimistic Update Helpers

##### `createOptimisticAdd<TItem>(queryKey, createTempItem)`
Creates optimistic update config for adding items.

**Example:**
```typescript
const createUser = usePost<User, CreateUserDto>('/users', {
  ...createOptimisticAdd<User>(['users', 'list'], (body) => ({
    ...(body as CreateUserDto),
    id: 'temp-id',
    createdAt: new Date().toISOString(),
  })),
});
```

##### `createOptimisticUpdate<TItem>(queryKey, getItemId)`
Creates optimistic update config for updating items.

##### `createOptimisticRemove<TItem>(queryKey, getItemId)`
Creates optimistic update config for removing items.

#### `useApiCache(): UseApiCacheResult`

Hook for managing API response cache.

**Returns:**
- `getData`: Get cached data
- `setData`: Set cached data
- `invalidate`: Invalidate queries
- `refetch`: Refetch queries
- `getStats`: Get cache statistics
- `clear`: Clear entire cache

**Example:**
```typescript
import { useApiCache } from '@/lib/api';

function CacheManager() {
  const { getData, setData, invalidate, getStats } = useApiCache();

  const users = getData<User[]>(['users', 'list']);

  const handleOptimisticUpdate = () => {
    setData<User[]>(['users', 'list'], (old) =>
      old?.map(u => u.id === userId ? { ...u, name: 'Updated' } : u) ?? []
    );
  };

  const stats = getStats();

  return (
    <div>
      <p>Cache entries: {stats.entries}</p>
      <p>Hit rate: {(stats.hitRate * 100).toFixed(1)}%</p>
      <button onClick={() => invalidate(['users'])}>
        Invalidate Users
      </button>
    </div>
  );
}
```

---

## Auth Module

The Auth module provides comprehensive authentication, authorization, and identity management including core auth, RBAC, and Active Directory integration.

### Module Path
`@/lib/auth` or `/home/user/enzyme/src/lib/auth/`

### Architecture

```
┌─────────────────────────────────────────┐
│          Auth Module                     │
├──────────┬──────────┬───────────────────┤
│   Core   │   RBAC   │  Active Directory │
│   Auth   │          │                    │
│          │          │                    │
│ - Login  │ - Roles  │  - Azure AD       │
│ - Logout │ - Perms  │  - ADFS           │
│ - Tokens │ - Matrix │  - On-Prem AD     │
│ - Guards │ - Policy │  - Groups         │
│          │          │  - SSO            │
└──────────┴──────────┴───────────────────┘
           │
           ▼
    ┌─────────────┐
    │ AuthContext │
    │ RBACContext │
    │  ADContext  │
    └─────────────┘
```

---

### Core Authentication

#### Types

##### `User`
```typescript
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  avatarUrl?: string;
  roles: Role[];
  permissions: Permission[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
```

##### `Role`
```typescript
type Role = 'admin' | 'manager' | 'user' | 'guest';
```

##### `AuthTokens`
```typescript
interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}
```

##### `LoginCredentials`
```typescript
interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}
```

#### Hook: `useAuth()`

Main authentication hook providing user state and auth actions.

**Returns:**
- `user`: Current user object
- `isAuthenticated`: Authentication status
- `isLoading`: Loading state
- `error`: Authentication error
- `roles`: User's roles
- `permissions`: User's permissions
- `login`: Login function
- `logout`: Logout function
- `register`: Registration function
- `hasRole`: Check if user has role
- `hasPermission`: Check if user has permission
- `displayName`: User's display name
- `email`: User's email
- `isAdmin`: Whether user is admin
- `isManager`: Whether user is manager/admin

**Example:**
```typescript
import { useAuth } from '@/lib/auth';

function UserMenu() {
  const {
    user,
    isAuthenticated,
    isAdmin,
    logout,
  } = useAuth();

  if (!isAuthenticated) {
    return <LoginButton />;
  }

  return (
    <div>
      <Avatar src={user?.avatarUrl} alt={user?.displayName} />
      <span>Welcome, {user?.displayName}</span>
      {isAdmin && <AdminLink />}
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

#### Provider: `AuthProvider`

Provides authentication context to the application.

**Example:**
```typescript
import { AuthProvider } from '@/lib/auth';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes />
      </Router>
    </AuthProvider>
  );
}
```

#### Service: `authService`

Singleton authentication service for direct API calls.

**Methods:**
- `login(credentials): Promise<AuthTokens>`
- `logout(): Promise<void>`
- `register(credentials): Promise<User>`
- `refreshToken(): Promise<AuthTokens>`
- `getCurrentUser(): Promise<User>`

**Example:**
```typescript
import { authService } from '@/lib/auth';

// Direct service usage
const tokens = await authService.login({
  email: 'user@example.com',
  password: 'password123',
});

const user = await authService.getCurrentUser();
```

---

### RBAC (Role-Based Access Control)

Comprehensive permission and role management system with policy-based access control.

#### Types

##### `PermissionAction`
```typescript
type PermissionAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'list'
  | 'execute'
  | 'manage'
  | 'approve'
  | 'export'
  | 'import'
  | '*';
```

##### `StructuredPermission`
```typescript
interface StructuredPermission {
  resource: string;        // e.g., 'users', 'documents'
  action: PermissionAction;
  scope?: PermissionScope;  // 'own' | 'team' | 'org' | 'global'
  conditions?: PermissionCondition[];
  deny?: boolean;
}
```

##### `RoleDefinition`
```typescript
interface RoleDefinition {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  structuredPermissions?: StructuredPermission[];
  inherits?: string[];
  priority: number;
  isSystem?: boolean;
  metadata?: Record<string, unknown>;
}
```

##### `AccessRequest`
```typescript
interface AccessRequest {
  subject: {
    id: string;
    type: 'user' | 'service' | 'system';
    roles?: string[];
    attributes?: Record<string, unknown>;
  };
  resource: {
    type: string;
    id?: string;
    attributes?: Record<string, unknown>;
  };
  action: string;
  context?: RequestContext;
}
```

##### `EvaluationResult`
```typescript
interface EvaluationResult {
  allowed: boolean;
  decision: PolicyResult;
  matchingPolicies?: string[];
  reason?: string;
  obligations?: Obligation[];
  evaluatedAt: number;
  evaluationTime?: number;
}
```

#### Hook: `useRBAC()`

Main RBAC hook for permission and role checking.

**Returns:**
- `initialized`: Whether RBAC is initialized
- `loading`: Loading state
- `userRoles`: User's role IDs
- `userPermissions`: User's permissions
- `hasPermission`: Check permission
- `hasRole`: Check role
- `canAccess`: Check resource access
- `canCreate`: Check create permission
- `canRead`: Check read permission
- `canUpdate`: Check update permission
- `canDelete`: Check delete permission
- `canManage`: Check manage permission
- `isAdmin`: Whether user is admin
- `isManager`: Whether user is manager
- `evaluate`: Full access evaluation

**Example:**
```typescript
import { useRBAC } from '@/lib/auth/rbac';

function DocumentsPage() {
  const {
    canCreate,
    canRead,
    canDelete,
    hasPermission,
    isAdmin,
  } = useRBAC();

  return (
    <div>
      <h1>Documents</h1>
      {canRead('documents') && <DocumentList />}
      {canCreate('documents') && (
        <button>Create Document</button>
      )}
      {hasPermission('documents:export') && (
        <ExportButton />
      )}
      {isAdmin && <AdminPanel />}
    </div>
  );
}
```

#### Hook: `usePermissions()`

Hook for checking permissions only.

**Example:**
```typescript
function SettingsPage() {
  const { hasPermission, hasAnyPermission } = usePermissions();

  return (
    <div>
      {hasPermission('settings:view') && <GeneralSettings />}
      {hasAnyPermission(['settings:admin', 'settings:manage']) && (
        <AdvancedSettings />
      )}
    </div>
  );
}
```

#### Hook: `useRoles()`

Hook for checking roles only.

**Example:**
```typescript
function Dashboard() {
  const { hasRole, isAdmin, isManager } = useRoles();

  return (
    <div>
      {isAdmin && <AdminDashboard />}
      {isManager && !isAdmin && <ManagerDashboard />}
      {!isManager && <UserDashboard />}
    </div>
  );
}
```

#### Hook: `useResourceAccess(resourceType)`

Hook for resource-level access control.

**Parameters:**
- `resourceType`: Type of resource (e.g., 'documents')

**Returns:**
- `canAccess`: Check action on resource type
- `checkResource`: Check action on specific resource
- `canCreate`: Check create permission
- `canRead`: Check read permission
- `canUpdate`: Check update permission
- `canDelete`: Check delete permission

**Example:**
```typescript
function DocumentViewer({ documentId }: { documentId: string }) {
  const { checkResource, canCreate } = useResourceAccess('documents');

  const canView = checkResource(documentId, 'read');
  const canEdit = checkResource(documentId, 'update');
  const canDelete = checkResource(documentId, 'delete');

  return (
    <div>
      {canView && <DocumentContent documentId={documentId} />}
      {canEdit && <EditButton />}
      {canDelete && <DeleteButton />}
      {canCreate() && <CreateNewButton />}
    </div>
  );
}
```

#### Hook: `usePermissionGate(permission)`

Hook for conditional rendering based on permission.

**Example:**
```typescript
function AdminPanel() {
  const { allowed, loading } = usePermissionGate('admin:access');

  if (loading) return <Spinner />;
  if (!allowed) return <AccessDenied />;

  return <AdminContent />;
}
```

#### Hook: `useRoleGate(roles)`

Hook for conditional rendering based on role.

**Example:**
```typescript
function ManagerFeature() {
  const { allowed, loading } = useRoleGate(['manager', 'admin']);

  if (loading) return <Spinner />;
  if (!allowed) return null;

  return <ManagerContent />;
}
```

#### Hook: `useAccessChecks(checks)`

Hook for checking multiple permissions/roles at once.

**Example:**
```typescript
function FeatureComponent() {
  const checks = useAccessChecks({
    canViewReports: { permission: 'reports:view' },
    canExport: { permission: 'reports:export' },
    isAdmin: { role: 'admin' },
    canManageUsers: { resource: 'users', action: 'manage' },
  });

  return (
    <div>
      {checks.canViewReports && <ReportViewer />}
      {checks.canExport && <ExportButton />}
      {checks.isAdmin && <AdminSection />}
      {checks.canManageUsers && <UserManager />}
    </div>
  );
}
```

#### Provider: `RBACProvider`

Provides RBAC context to the application.

**Example:**
```typescript
import { RBACProvider } from '@/lib/auth/rbac';

const rbacConfig = {
  roles: [
    {
      id: 'admin',
      name: 'Administrator',
      permissions: ['*'],
      priority: 100,
    },
    {
      id: 'user',
      name: 'User',
      permissions: ['read:own'],
      priority: 10,
    },
  ],
  defaultDecision: 'deny',
  enableCaching: true,
};

function App() {
  return (
    <RBACProvider config={rbacConfig}>
      <AuthProvider>
        <Router />
      </AuthProvider>
    </RBACProvider>
  );
}
```

---

### Active Directory Integration

Enterprise Active Directory integration supporting Azure AD, ADFS, and on-premises AD.

#### Types

##### `ADProviderType`
```typescript
type ADProviderType = 'azure-ad' | 'azure-b2c' | 'adfs' | 'on-premises';
```

##### `ADConfig`
```typescript
interface ADConfig {
  providerType: ADProviderType;
  azure?: AzureADConfig;
  azureB2C?: AzureADB2CConfig;
  adfs?: ADFSConfig;
  onPremises?: OnPremisesADConfig;
  sso?: SSOConfig;
  groupMapping?: ADGroupMappingConfig;
}
```

##### `ADUser`
```typescript
interface ADUser {
  id: string;
  upn: string;
  email: string;
  displayName: string;
  givenName?: string;
  surname?: string;
  groups: ADGroup[];
  roles: string[];
  attributes: Record<string, unknown>;
}
```

#### Hook: `useActiveDirectory()`

Main Active Directory hook.

**Returns:**
- `user`: AD user object
- `isAuthenticated`: Authentication status
- `login`: AD login function
- `logout`: AD logout function
- `acquireToken`: Token acquisition
- `groups`: User's AD groups
- `roles`: Mapped roles from groups

**Example:**
```typescript
import { useActiveDirectory } from '@/lib/auth/active-directory';

function ADLogin() {
  const { login, isAuthenticated, user } = useActiveDirectory();

  if (isAuthenticated) {
    return <div>Welcome, {user?.displayName}</div>;
  }

  return (
    <button onClick={() => login()}>
      Sign in with Microsoft
    </button>
  );
}
```

#### Provider: `ADProvider`

Provides Active Directory context.

**Example:**
```typescript
import { ADProvider } from '@/lib/auth/active-directory';

const adConfig = {
  providerType: 'azure-ad',
  azure: {
    clientId: process.env.AZURE_CLIENT_ID,
    tenantId: process.env.AZURE_TENANT_ID,
    redirectUri: window.location.origin + '/auth/callback',
  },
  sso: {
    enabled: true,
    domain: 'example.com',
  },
  groupMapping: {
    enabled: true,
    mappings: {
      'Group-Admins': 'admin',
      'Group-Users': 'user',
    },
  },
};

function App() {
  return (
    <ADProvider config={adConfig}>
      <MyApp />
    </ADProvider>
  );
}
```

---

## Config Module

The Config module provides centralized configuration management for environment variables, routes, timing constants, API endpoints, and more.

### Module Path
`@/config` or `/home/user/enzyme/src/config/`

### Key Exports

#### `env`
```typescript
const env: EnvConfig
```

Runtime environment configuration with validated environment variables.

**Properties:**
- `appEnv`: Environment name ('development', 'production', 'staging')
- `appVersion`: Application version
- `appName`: Application name
- `apiBaseUrl`: API base URL
- `apiTimeout`: Default API timeout
- `isDev`: Development mode flag
- `isProd`: Production mode flag
- `logLevel`: Logging level
- `featureFlagsEnabled`: Feature flags status
- `sentryDsn`: Sentry error tracking DSN

**Example:**
```typescript
import { env } from '@/config';

console.log(`Running in ${env.appEnv} mode`);
console.log(`API URL: ${env.apiBaseUrl}`);

if (env.isDev) {
  console.log('Debug mode enabled');
}
```

#### `ROUTES`
```typescript
const ROUTES: Record<string, string>
```

Type-safe route path definitions.

**Example:**
```typescript
import { ROUTES } from '@/config';

navigate(ROUTES.USERS_LIST);
navigate(ROUTES.USER_DETAIL.replace(':id', userId));
```

#### `API_CONFIG`
```typescript
const API_CONFIG: ApiConfig
```

API configuration including base URL, endpoints, and defaults.

**Example:**
```typescript
import { API_CONFIG } from '@/config';

const endpoint = API_CONFIG.ENDPOINTS.USERS.LIST;
const timeout = API_CONFIG.TIMEOUT.DEFAULT;
```

#### `TIMING`
```typescript
const TIMING: {
  QUERY: { STALE: {...}, GC: {...} };
  API: { TIMEOUT: {...}, RETRY: {...} };
  UI: { DEBOUNCE: {...}, TOAST: {...} };
}
```

Timing constants for queries, API calls, and UI interactions.

**Example:**
```typescript
import { TIMING } from '@/config';

const staleTime = TIMING.QUERY.STALE.MEDIUM; // 5 minutes
const debounce = TIMING.UI.DEBOUNCE.SEARCH; // 300ms
```

#### Utility Functions

##### `validateConfig(): ConfigValidationResult`
Validates all configuration at application startup.

##### `initializeConfig(): void`
Initializes configuration with validation (throws on errors).

##### `getConfigSummary(): Record<string, unknown>`
Gets diagnostic summary of current configuration.

**Example:**
```typescript
import { initializeConfig, getConfigSummary } from '@/config';

// In main.tsx
try {
  initializeConfig();
} catch (error) {
  console.error('Configuration error:', error);
}

// Debug
console.log(getConfigSummary());
```

---

## Contexts Module

The Contexts module provides React Context definitions for state management across the application.

### Module Path
`@/lib/contexts` or `/home/user/enzyme/src/lib/contexts/`

### Available Contexts

- `AuthContext`: Authentication state
- `RBACContext`: Role-based access control
- `ADContext`: Active Directory state
- `ApiClientContext`: API client instance
- `ConfigContext`: Configuration state
- `ThemeContext`: Theme and styling
- `LoadingContext`: Global loading state
- `FeatureFlagContext`: Feature flags
- `ErrorBoundaryContext`: Error handling
- `PerformanceObservatoryContext`: Performance monitoring
- `StreamContext`: Real-time streaming
- `RealtimeContext`: WebSocket/SSE connections
- `ToastContext`: Toast notifications

Each context is exported with its value type and provider component.

---

## Advanced Features

### Request Deduplication

Automatic deduplication of concurrent identical requests.

```typescript
// Multiple components requesting the same data
// Only one actual HTTP request is made
function Component1() {
  const { data } = useApiRequest({ url: '/users', queryKey: ['users'] });
}

function Component2() {
  const { data } = useApiRequest({ url: '/users', queryKey: ['users'] });
}
```

### Rate Limiting

Client-side rate limiting with configurable strategies.

```typescript
const client = createApiClient({
  baseUrl: 'https://api.example.com',
  rateLimit: {
    maxRequests: 100,
    windowMs: 60000,
    strategy: 'queue', // or 'reject', 'sliding-window'
  },
});
```

### Response Streaming

Support for Server-Sent Events (SSE) and NDJSON streaming.

```typescript
const stream = streamResponse<Message>(response, { sse: true });

stream.subscribe((event) => {
  if (event.type === 'data') {
    updateUI(event.data);
  }
});
```

### Optimistic Updates

Immediate UI updates before server confirmation.

```typescript
const updateUser = usePatch<User, Partial<User>>('/users/:id', {
  ...createOptimisticUpdate<User>(['users', 'list'], (item) => item.id),
  onError: (error, variables, context) => {
    // Rollback handled automatically
    toast.error('Update failed');
  },
});
```

---

## Best Practices

### 1. Use Typed Requests

Always specify response types for type safety:

```typescript
// Good
const { data } = useApiRequest<User>({ url: '/users/123', queryKey: ['users', '123'] });

// Bad
const { data } = useApiRequest({ url: '/users/123', queryKey: ['users', '123'] });
```

### 2. Consistent Query Keys

Use consistent query key patterns:

```typescript
// Good - Hierarchical
['users'] // All users
['users', 'list'] // User list
['users', userId] // Specific user
['users', userId, 'posts'] // User's posts

// Bad - Inconsistent
['userList']
['user-123']
['getUserPosts']
```

### 3. Handle Loading and Error States

Always handle all request states:

```typescript
const { data, isLoading, error } = useApiRequest<User>({
  url: '/users/123',
  queryKey: ['users', '123'],
});

if (isLoading) return <Spinner />;
if (error) return <ErrorDisplay error={error} />;
if (!data) return null;

return <UserProfile user={data} />;
```

### 4. Use Permission Gates

Protect features with permission checks:

```typescript
function AdminFeature() {
  const { isAdmin } = useRBAC();

  if (!isAdmin) return null;

  return <AdminPanel />;
}
```

### 5. Cache Invalidation

Invalidate related queries after mutations:

```typescript
const createUser = usePost<User, CreateUserDto>('/users', {
  invalidateQueries: [
    ['users', 'list'],
    ['users', 'count'],
    ['dashboard', 'stats'],
  ],
});
```

---

## Migration Guide

### From Axios to ApiClient

```typescript
// Before (Axios)
const response = await axios.get('/users', {
  params: { page: 1 },
  headers: { 'X-Custom': 'value' },
});
const users = response.data;

// After (ApiClient)
const response = await apiClient.get<User[]>('/users', {
  params: { page: 1 },
  headers: { 'X-Custom': 'value' },
});
const users = response.data; // Typed as User[]
```

### From useState to useApiRequest

```typescript
// Before
const [users, setUsers] = useState<User[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetch('/users')
    .then(res => res.json())
    .then(setUsers)
    .finally(() => setLoading(false));
}, []);

// After
const { data: users, isLoading: loading } = useApiRequest<User[]>({
  url: '/users',
  queryKey: ['users'],
});
```

---

## Troubleshooting

### Common Issues

#### 1. "useRBAC must be used within RBACProvider"

**Solution:** Wrap your app with RBACProvider:

```typescript
<RBACProvider config={rbacConfig}>
  <App />
</RBACProvider>
```

#### 2. Stale data showing in UI

**Solution:** Adjust staleTime or invalidate queries:

```typescript
const { data } = useApiRequest({
  url: '/users',
  queryKey: ['users'],
  staleTime: 0, // Always fetch fresh
});
```

#### 3. Rate limit errors

**Solution:** Configure rate limiting or increase limits:

```typescript
apiClient.setRateLimit({
  maxRequests: 200,
  windowMs: 60000,
});
```

---

## Performance Optimization

### 1. Query Key Stability

Use stable query keys to prevent unnecessary refetches:

```typescript
// Good - stable reference
const queryKey = useMemo(() => ['users', filters], [filters]);

// Bad - new array every render
const queryKey = ['users', filters];
```

### 2. Select Data Transformation

Transform data in select to memoize results:

```typescript
const { data } = useApiRequest<User[]>({
  url: '/users',
  queryKey: ['users'],
  select: (users) => users.filter(u => u.active),
});
```

### 3. Pagination

Use cursor-based pagination for large datasets:

```typescript
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ['users'],
  queryFn: ({ pageParam }) => fetchUsers({ cursor: pageParam }),
  getNextPageParam: (lastPage) => lastPage.pagination.nextCursor,
});
```

---

## Appendix

### HTTP Status Codes

| Code | Category | Retryable |
|------|----------|-----------|
| 200-299 | Success | No |
| 400 | Validation | No |
| 401 | Authentication | No |
| 403 | Authorization | No |
| 404 | Not Found | No |
| 408 | Timeout | Yes |
| 429 | Rate Limit | Yes |
| 500-504 | Server Error | Yes |

### Query Stale Times

| Type | Duration | Use Case |
|------|----------|----------|
| SHORT | 30s | Real-time data |
| MEDIUM | 5min | Standard data |
| LONG | 30min | Infrequent changes |
| INFINITY | Never | Static data |

---

## Support

For issues, questions, or contributions:

- GitHub: [defendr/enzyme](https://github.com/defendr/enzyme)
- Documentation: [docs.defendr.com/enzyme](https://docs.defendr.com/enzyme)
- Email: support@defendr.com

---

**Last Updated:** 2025-11-28
**Version:** 1.0.0
**License:** MIT
