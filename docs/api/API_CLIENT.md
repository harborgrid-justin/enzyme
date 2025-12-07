# API Client Documentation

The API Client provides a comprehensive, type-safe HTTP client with retry logic, interceptors, automatic token refresh, and request deduplication.

## Table of Contents

- [Overview](#overview)
- [ApiClient Class](#apiclient-class)
- [Configuration](#configuration)
- [HTTP Methods](#http-methods)
- [Interceptors](#interceptors)
- [Token Management](#token-management)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Utilities](#utilities)

## Overview

The API client is the foundation of the API module, providing enterprise-grade HTTP communication with built-in resilience and security features.

### Basic Usage

```typescript
import { apiClient, createApiClient } from '@/lib/api';

// Use singleton instance
const response = await apiClient.get<User[]>('/users');

// Create custom instance
const customClient = createApiClient({
  baseUrl: 'https://api.example.com',
  timeout: 30000,
});
```

## ApiClient Class

### Constructor

```typescript
class ApiClient {
  constructor(config: ApiClientConfig)
}
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| config | ApiClientConfig | Yes | Client configuration |

**Example:**

```typescript
const client = new ApiClient({
  baseUrl: 'https://api.example.com',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  retry: {
    maxAttempts: 3,
    baseDelay: 1000,
  },
});
```

### Properties

#### config

The current client configuration.

```typescript
readonly config: Required<ApiClientConfig>
```

## Configuration

### ApiClientConfig

Complete configuration interface for the API client.

```typescript
interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  headers?: RequestHeaders;
  retry?: Partial<RetryConfig>;
  deduplicate?: boolean;
  autoRefreshToken?: boolean;
  tokenRefreshThreshold?: number;
  tokenProvider?: TokenProvider;
  requestInterceptors?: RequestInterceptor[];
  responseInterceptors?: ResponseInterceptor[];
  errorInterceptors?: ErrorInterceptor[];
  onError?: (error: ApiError) => void;
  onRequestStart?: (config: RequestConfig) => void;
  onRequestEnd?: (response: ApiResponse | ApiError) => void;
  credentials?: RequestCredentials;
  fetch?: typeof fetch;
  rateLimit?: RateLimitConfig | keyof typeof RATE_LIMIT_PRESETS;
}
```

### Configuration Options

#### baseUrl

**Type:** `string`
**Required:** Yes

Base URL for all API requests.

```typescript
const client = createApiClient({
  baseUrl: 'https://api.example.com',
});

// Requests are made to: https://api.example.com/users
await client.get('/users');
```

#### timeout

**Type:** `number`
**Default:** `30000` (30 seconds)

Request timeout in milliseconds.

```typescript
const client = createApiClient({
  baseUrl: 'https://api.example.com',
  timeout: 60000, // 60 seconds
});
```

#### headers

**Type:** `RequestHeaders`
**Default:** `{ 'Content-Type': 'application/json', 'Accept': 'application/json' }`

Default headers for all requests.

```typescript
const client = createApiClient({
  baseUrl: 'https://api.example.com',
  headers: {
    'X-API-Key': process.env.API_KEY,
    'X-Client-Version': '1.0.0',
  },
});
```

#### retry

**Type:** `Partial<RetryConfig>`
**Default:** See [RetryConfig](#retryconfig)

Retry configuration for failed requests.

```typescript
const client = createApiClient({
  baseUrl: 'https://api.example.com',
  retry: {
    maxAttempts: 5,
    baseDelay: 2000,
    maxDelay: 30000,
    backoffFactor: 2,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
    retryOnNetworkError: true,
  },
});
```

#### deduplicate

**Type:** `boolean`
**Default:** `true`

Enable automatic request deduplication for concurrent identical GET requests.

```typescript
const client = createApiClient({
  baseUrl: 'https://api.example.com',
  deduplicate: true,
});

// Only one HTTP request is made
const [r1, r2, r3] = await Promise.all([
  client.get('/users'),
  client.get('/users'),
  client.get('/users'),
]);
```

#### autoRefreshToken

**Type:** `boolean`
**Default:** `true`

Automatically refresh expired tokens.

```typescript
const client = createApiClient({
  baseUrl: 'https://api.example.com',
  autoRefreshToken: true,
  tokenRefreshThreshold: 300000, // 5 minutes
});
```

#### tokenProvider

**Type:** `TokenProvider`
**Default:** Secure localStorage-based provider

Custom token storage provider.

```typescript
const client = createApiClient({
  baseUrl: 'https://api.example.com',
  tokenProvider: {
    getAccessToken: () => authService.getToken(),
    getRefreshToken: () => authService.getRefreshToken(),
    setAccessToken: (token) => authService.setToken(token),
    setRefreshToken: (token) => authService.setRefreshToken(token),
    clearTokens: () => authService.logout(),
  },
});
```

#### rateLimit

**Type:** `RateLimitConfig | 'conservative' | 'standard' | 'aggressive' | 'burst'`

Enable client-side rate limiting.

```typescript
// Use preset
const client = createApiClient({
  baseUrl: 'https://api.example.com',
  rateLimit: 'standard', // 100 requests/minute
});

// Custom configuration
const client = createApiClient({
  baseUrl: 'https://api.example.com',
  rateLimit: {
    maxRequests: 50,
    windowMs: 60000,
    strategy: 'queue',
  },
});
```

### RetryConfig

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

**Default Configuration:**

```typescript
{
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  retryOnNetworkError: true,
}
```

**Example with Custom Retry Logic:**

```typescript
const client = createApiClient({
  baseUrl: 'https://api.example.com',
  retry: {
    maxAttempts: 5,
    shouldRetry: (error, attempt) => {
      // Custom retry logic
      if (error.status === 503) {
        return attempt < 3; // Only retry 503 errors 3 times
      }
      return error.retryable;
    },
    onRetry: (error, attempt) => {
      console.log(`Retrying request (attempt ${attempt + 1}): ${error.message}`);
    },
  },
});
```

## HTTP Methods

### get()

Make a GET request.

**Signature:**

```typescript
async get<TResponse>(
  url: string,
  options?: Partial<RequestConfig>
): Promise<ApiResponse<TResponse>>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| url | string | Yes | Request URL (relative to baseUrl) |
| options | Partial<RequestConfig> | No | Additional request options |

**Returns:** `Promise<ApiResponse<TResponse>>`

**Example:**

```typescript
// Basic GET
const response = await client.get<User[]>('/users');

// With query parameters
const response = await client.get<User[]>('/users', {
  params: { page: 1, limit: 20 },
});

// With path parameters
const response = await client.get<User>('/users/:id', {
  pathParams: { id: '123' },
});

// With custom headers
const response = await client.get<User[]>('/users', {
  headers: { 'X-Custom-Header': 'value' },
});
```

### post()

Make a POST request.

**Signature:**

```typescript
async post<TResponse, TBody = unknown>(
  url: string,
  body?: TBody,
  options?: Partial<RequestConfig>
): Promise<ApiResponse<TResponse>>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| url | string | Yes | Request URL |
| body | TBody | No | Request body |
| options | Partial<RequestConfig> | No | Additional options |

**Returns:** `Promise<ApiResponse<TResponse>>`

**Example:**

```typescript
// Create user
const response = await client.post<User, CreateUserDto>('/users', {
  name: 'John Doe',
  email: 'john@example.com',
});

// With custom content type
const response = await client.post<UploadResult>('/upload', formData, {
  contentType: 'multipart/form-data',
});
```

### put()

Make a PUT request (full replacement).

**Signature:**

```typescript
async put<TResponse, TBody = unknown>(
  url: string,
  body?: TBody,
  options?: Partial<RequestConfig>
): Promise<ApiResponse<TResponse>>
```

**Example:**

```typescript
const response = await client.put<User, User>('/users/:id', updatedUser, {
  pathParams: { id: '123' },
});
```

### patch()

Make a PATCH request (partial update).

**Signature:**

```typescript
async patch<TResponse, TBody = unknown>(
  url: string,
  body?: TBody,
  options?: Partial<RequestConfig>
): Promise<ApiResponse<TResponse>>
```

**Example:**

```typescript
const response = await client.patch<User, Partial<User>>('/users/:id', {
  name: 'Updated Name',
}, {
  pathParams: { id: '123' },
});
```

### delete()

Make a DELETE request.

**Signature:**

```typescript
async delete<TResponse>(
  url: string,
  options?: Partial<RequestConfig>
): Promise<ApiResponse<TResponse>>
```

**Example:**

```typescript
await client.delete<void>('/users/:id', {
  pathParams: { id: '123' },
});
```

### head()

Make a HEAD request.

**Signature:**

```typescript
async head(
  url: string,
  options?: Partial<RequestConfig>
): Promise<ApiResponse<void>>
```

**Example:**

```typescript
const response = await client.head('/users/:id', {
  pathParams: { id: '123' },
});
// Check if resource exists from status code
const exists = response.status === 200;
```

### request()

Make a generic request with full control.

**Signature:**

```typescript
async request<TResponse>(
  config: RequestConfig
): Promise<ApiResponse<TResponse>>
```

**Example:**

```typescript
const response = await client.request<User>({
  method: 'GET',
  url: '/users/:id',
  pathParams: { id: '123' },
  params: { include: 'posts' },
  timeout: 5000,
  retry: { maxAttempts: 1 },
});
```

## Interceptors

Interceptors allow you to modify requests, responses, or handle errors globally.

### Request Interceptors

Modify requests before they are sent.

**Signature:**

```typescript
addRequestInterceptor(
  interceptor: RequestInterceptor
): () => void
```

**Example:**

```typescript
// Add authentication header
const removeInterceptor = client.addRequestInterceptor((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }
  return config;
});

// Remove interceptor
removeInterceptor();
```

**Common Use Cases:**

```typescript
// Add request ID
client.addRequestInterceptor((config) => {
  config.meta = {
    ...config.meta,
    requestId: crypto.randomUUID(),
  };
  return config;
});

// Add timestamp
client.addRequestInterceptor((config) => {
  config.meta = {
    ...config.meta,
    timestamp: Date.now(),
  };
  return config;
});

// Modify URL based on environment
client.addRequestInterceptor((config) => {
  if (process.env.NODE_ENV === 'development') {
    config.url = `/dev${config.url}`;
  }
  return config;
});
```

### Response Interceptors

Modify responses before they are returned.

**Signature:**

```typescript
addResponseInterceptor(
  interceptor: ResponseInterceptor
): () => void
```

**Example:**

```typescript
// Log response times
client.addResponseInterceptor((response) => {
  console.log(`Request to ${response.request.url} took ${response.timing.duration}ms`);
  return response;
});

// Transform response data
client.addResponseInterceptor((response) => {
  // Unwrap data envelope
  if (response.data && 'data' in response.data) {
    response.data = response.data.data;
  }
  return response;
});

// Cache responses
client.addResponseInterceptor((response) => {
  if (response.request.method === 'GET') {
    localStorage.setItem(
      `cache:${response.request.url}`,
      JSON.stringify(response.data)
    );
  }
  return response;
});
```

### Error Interceptors

Handle or transform errors.

**Signature:**

```typescript
addErrorInterceptor(
  interceptor: ErrorInterceptor
): () => void
```

**Example:**

```typescript
// Global error handling
client.addErrorInterceptor((error) => {
  if (error.status === 401) {
    // Redirect to login
    window.location.href = '/login';
  }
  return error;
});

// Error reporting
client.addErrorInterceptor((error) => {
  // Send to error tracking service
  errorTracker.captureException(error, {
    tags: {
      url: error.request?.url,
      method: error.request?.method,
      status: error.status,
    },
  });
  return error;
});

// Transform errors
client.addErrorInterceptor((error) => {
  // Add user-friendly message
  if (error.status === 500) {
    error.message = 'An unexpected error occurred. Please try again later.';
  }
  return error;
});
```

## Token Management

### Default Token Provider

The API client uses secure, encrypted localStorage by default for token storage.

**Security Features:**

- AES-GCM encryption
- Unique session keys
- Secure random key generation
- Automatic cleanup on logout

### Custom Token Provider

Provide your own token storage implementation.

**Interface:**

```typescript
interface TokenProvider {
  getAccessToken: () => string | null | Promise<string | null>;
  getRefreshToken: () => string | null | Promise<string | null>;
  setAccessToken: (token: string) => void | Promise<void>;
  setRefreshToken: (token: string) => void | Promise<void>;
  clearTokens: () => void | Promise<void>;
}
```

**Example:**

```typescript
// Cookie-based storage
const cookieTokenProvider: TokenProvider = {
  getAccessToken: () => Cookies.get('access_token') || null,
  getRefreshToken: () => Cookies.get('refresh_token') || null,
  setAccessToken: (token) => {
    Cookies.set('access_token', token, {
      secure: true,
      sameSite: 'strict',
    });
  },
  setRefreshToken: (token) => {
    Cookies.set('refresh_token', token, {
      secure: true,
      sameSite: 'strict',
    });
  },
  clearTokens: () => {
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
  },
};

const client = createApiClient({
  baseUrl: 'https://api.example.com',
  tokenProvider: cookieTokenProvider,
});
```

### Token Refresh

**Automatic Refresh:**

```typescript
const client = createApiClient({
  baseUrl: 'https://api.example.com',
  autoRefreshToken: true,
  tokenRefreshThreshold: 300000, // Refresh 5 minutes before expiry
});
```

**Custom Refresh Function:**

```typescript
client.setTokenRefresh(async () => {
  const response = await fetch('/auth/refresh', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${refreshToken}`,
    },
  });
  const { accessToken } = await response.json();
  return accessToken;
});
```

### Get/Set Token Provider

```typescript
// Get current provider
const provider = client.getTokenProvider();

// Set new provider
client.setTokenProvider(customProvider);
```

## Rate Limiting

### Enable Rate Limiting

```typescript
const client = createApiClient({
  baseUrl: 'https://api.example.com',
  rateLimit: 'standard', // 100 requests/minute
});
```

### Rate Limit Presets

| Preset | Max Requests | Window | Strategy |
|--------|--------------|--------|----------|
| `conservative` | 60 | 1 minute | queue |
| `standard` | 100 | 1 minute | queue |
| `aggressive` | 300 | 1 minute | delay |
| `burst` | 30 | 1 second | queue |

### Custom Rate Limiting

```typescript
const client = createApiClient({
  baseUrl: 'https://api.example.com',
  rateLimit: {
    maxRequests: 50,
    windowMs: 60000,
    strategy: 'queue', // 'queue' | 'reject' | 'delay'
    maxQueueSize: 100,
  },
});
```

### Rate Limiter Methods

```typescript
// Get rate limiter
const limiter = client.getRateLimiter();

// Check if would be limited
if (client.wouldBeRateLimited('/api/users')) {
  console.log('Request would be rate limited');
}

// Get status
const status = limiter?.getStatus('/api/users');
console.log(`${status.remaining} requests remaining`);

// Update rate limit
client.setRateLimit({
  maxRequests: 200,
  windowMs: 60000,
});

// Disable rate limiting
client.disableRateLimit();
```

## Error Handling

### Error Types

The API client normalizes all errors into a consistent `ApiError` structure.

```typescript
interface ApiError {
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
  correlationId?: string;
  retryInfo?: {
    attempt: number;
    maxAttempts: number;
    nextRetryAt?: number;
  };
  timestamp: number;
  cause?: Error;
  retryable: boolean;
  stack?: string;
}
```

### Error Categories

- `network` - Network connectivity issues
- `authentication` - 401 errors
- `authorization` - 403 errors
- `validation` - 400/422 errors with field errors
- `not_found` - 404 errors
- `conflict` - 409 errors
- `rate_limit` - 429 errors
- `server` - 5xx errors
- `timeout` - Request timeout
- `cancelled` - Request cancelled
- `unknown` - Other errors

### Type Guards

```typescript
import {
  isApiError,
  isNetworkError,
  isAuthenticationError,
  isAuthorizationError,
  isValidationError,
  isRateLimitError,
  isServerError,
  isTimeoutError,
  isCancelledError,
} from '@/lib/api/types';

try {
  await client.get('/users');
} catch (error) {
  if (isApiError(error)) {
    if (isAuthenticationError(error)) {
      // Redirect to login
      router.push('/login');
    } else if (isValidationError(error)) {
      // Show field errors
      error.fieldErrors?.forEach(fe => {
        setFieldError(fe.field, fe.message);
      });
    } else if (isNetworkError(error)) {
      // Show offline message
      showOfflineMessage();
    }
  }
}
```

### Creating Errors

```typescript
import { createApiError } from '@/lib/api';

const error = createApiError(400, 'Validation failed', {
  code: 'VALIDATION_ERROR',
  fieldErrors: [
    { field: 'email', message: 'Invalid email format' },
    { field: 'password', message: 'Password too short' },
  ],
});
```

## Utilities

### Request Cancellation

```typescript
// Cancel by request ID
client.cancelRequest('req_123456');

// Cancel all pending requests
client.cancelAllRequests();

// Use AbortController
const controller = new AbortController();

const promise = client.get('/users', {
  signal: controller.signal,
});

// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000);

try {
  await promise;
} catch (error) {
  if (isCancelledError(error)) {
    console.log('Request was cancelled');
  }
}
```

### Singleton vs. Instance

**Singleton (Recommended for most cases):**

```typescript
import { apiClient } from '@/lib/api';

// Configured with application defaults
const users = await apiClient.get<User[]>('/users');
```

**Custom Instance:**

```typescript
import { createApiClient } from '@/lib/api';

// Create separate instance for external API
const externalClient = createApiClient({
  baseUrl: 'https://external-api.com',
  headers: {
    'X-API-Key': process.env.EXTERNAL_API_KEY,
  },
});

const data = await externalClient.get('/data');
```

### Factory Function

```typescript
import { createApiClient } from '@/lib/api';

/**
 * Create API client with custom configuration
 */
export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}
```

## Related Documentation

### API Documentation
- **[API Module Overview](./README.md)** - Complete API module guide
- **[Hooks](./HOOKS.md)** - React hooks for data fetching and mutations
- **[Types](./TYPES.md)** - TypeScript type reference
- **[Interceptors](./INTERCEPTORS.md)** - Request/response interceptors
- **[Advanced Features](./ADVANCED.md)** - API Gateway, rate limiting, metrics
- **[Auto Generation](./AUTO_GENERATION.md)** - Auto-generate REST APIs

### Integration Guides
- **[Queries Module](../queries/README.md)** - React Query integration
- **[State Management](../state/README.md)** - Global state integration
- **[Shared Utilities](../shared/README.md)** - Event bus and storage utilities
- **[Configuration](../config/README.md)** - API configuration options

### Reference
- **[Hooks Reference](../HOOKS_REFERENCE.md)** - Complete hooks API reference
- **[Performance Guide](../performance/README.md)** - API performance optimization
