# API Type Definitions

Complete TypeScript type reference for the API module.

## Table of Contents

- [Core Types](#core-types)
- [Request Types](#request-types)
- [Response Types](#response-types)
- [Error Types](#error-types)
- [Configuration Types](#configuration-types)
- [Hook Types](#hook-types)
- [Advanced Types](#advanced-types)

## Core Types

### ApiClient

The main API client class.

```typescript
class ApiClient {
  constructor(config: ApiClientConfig);

  get<T>(url: string, options?: Partial<RequestConfig>): Promise<ApiResponse<T>>;
  post<T, B = unknown>(url: string, body?: B, options?: Partial<RequestConfig>): Promise<ApiResponse<T>>;
  put<T, B = unknown>(url: string, body?: B, options?: Partial<RequestConfig>): Promise<ApiResponse<T>>;
  patch<T, B = unknown>(url: string, body?: B, options?: Partial<RequestConfig>): Promise<ApiResponse<T>>;
  delete<T>(url: string, options?: Partial<RequestConfig>): Promise<ApiResponse<T>>;
  head(url: string, options?: Partial<RequestConfig>): Promise<ApiResponse<void>>;
  request<T>(config: RequestConfig): Promise<ApiResponse<T>>;

  addRequestInterceptor(interceptor: RequestInterceptor): () => void;
  addResponseInterceptor(interceptor: ResponseInterceptor): () => void;
  addErrorInterceptor(interceptor: ErrorInterceptor): () => void;

  setTokenRefresh(fn: () => Promise<string>): void;
  cancelRequest(requestId: string): void;
  cancelAllRequests(): void;

  readonly config: Required<ApiClientConfig>;
}
```

### HttpMethod

Supported HTTP methods.

```typescript
type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'HEAD'
  | 'OPTIONS';
```

### ContentType

Content type options for requests.

```typescript
type ContentType =
  | 'application/json'
  | 'application/x-www-form-urlencoded'
  | 'multipart/form-data'
  | 'text/plain'
  | 'application/octet-stream';
```

## Request Types

### RequestConfig

Configuration for a single request.

```typescript
interface RequestConfig {
  /** Request URL (relative to baseUrl) */
  url: string;

  /** HTTP method */
  method?: HttpMethod;

  /** Request body */
  body?: unknown;

  /** Query parameters */
  params?: QueryParams;

  /** Path parameters (e.g., { id: '123' } for /users/:id) */
  pathParams?: Record<string, string | number>;

  /** Request headers */
  headers?: RequestHeaders;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Content-Type header */
  contentType?: ContentType;

  /** AbortSignal for request cancellation */
  signal?: AbortSignal;

  /** Retry configuration */
  retry?: Partial<RetryConfig>;

  /** Request metadata (not sent to server) */
  meta?: RequestMetadata;

  /** Credentials mode */
  credentials?: RequestCredentials;

  /** Response type */
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
}
```

### QueryParams

Query parameters object.

```typescript
type QueryParams = Record<string, string | number | boolean | null | undefined | Array<string | number>>;
```

### RequestHeaders

Request headers object.

```typescript
type RequestHeaders = Record<string, string>;
```

### RequestMetadata

Metadata attached to requests (not sent to server).

```typescript
interface RequestMetadata {
  /** Unique request ID */
  requestId?: string;

  /** Correlation ID for distributed tracing */
  correlationId?: string;

  /** Request timestamp */
  timestamp?: number;

  /** Skip authentication for this request */
  skipAuth?: boolean;

  /** Skip retry logic */
  skipRetry?: boolean;

  /** Custom metadata */
  [key: string]: unknown;
}
```

### RetryConfig

Retry configuration for failed requests.

```typescript
interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;

  /** Base delay between retries in milliseconds */
  baseDelay: number;

  /** Maximum delay between retries */
  maxDelay: number;

  /** Backoff factor (delay multiplier) */
  backoffFactor: number;

  /** HTTP status codes to retry */
  retryableStatusCodes: number[];

  /** Retry on network errors */
  retryOnNetworkError: boolean;

  /** Custom retry condition */
  shouldRetry?: (error: ApiError, attempt: number) => boolean;

  /** Callback on retry */
  onRetry?: (error: ApiError, attempt: number) => void;
}
```

### RequestInterceptor

Function to intercept and modify requests.

```typescript
type RequestInterceptor = (
  config: RequestConfig
) => RequestConfig | Promise<RequestConfig>;
```

## Response Types

### ApiResponse

Successful API response.

```typescript
interface ApiResponse<T = unknown> {
  /** Response data */
  data: T;

  /** HTTP status code */
  status: number;

  /** HTTP status text */
  statusText: string;

  /** Response headers */
  headers: ResponseHeaders;

  /** Original request configuration */
  request: RequestConfig;

  /** Response timing information */
  timing: ResponseTiming;

  /** Response metadata */
  meta?: ResponseMetadata;
}
```

### ResponseHeaders

Response headers object.

```typescript
type ResponseHeaders = Record<string, string>;
```

### ResponseTiming

Timing information for the response.

```typescript
interface ResponseTiming {
  /** Request start timestamp */
  startTime: number;

  /** Response end timestamp */
  endTime: number;

  /** Total duration in milliseconds */
  duration: number;

  /** DNS lookup time */
  dnsTime?: number;

  /** TCP connection time */
  connectTime?: number;

  /** TLS handshake time */
  tlsTime?: number;

  /** Time to first byte */
  ttfb?: number;
}
```

### ResponseMetadata

Metadata from the response.

```typescript
interface ResponseMetadata {
  /** Request ID (from request or response header) */
  requestId?: string;

  /** Correlation ID */
  correlationId?: string;

  /** Server timestamp */
  serverTime?: number;

  /** Cache status */
  cacheStatus?: 'hit' | 'miss' | 'stale';

  /** Custom metadata */
  [key: string]: unknown;
}
```

### ResponseInterceptor

Function to intercept and modify responses.

```typescript
type ResponseInterceptor<T = unknown> = (
  response: ApiResponse<T>
) => ApiResponse<T> | Promise<ApiResponse<T>>;
```

## Error Types

### ApiError

Error thrown by API requests.

```typescript
interface ApiError extends Error {
  /** Error name (always 'ApiError') */
  name: 'ApiError';

  /** HTTP status code */
  status: number;

  /** Error code */
  code: string;

  /** Error message */
  message: string;

  /** Error category */
  category: ErrorCategory;

  /** Error severity */
  severity: ErrorSeverity;

  /** Field-level errors (for validation errors) */
  fieldErrors?: FieldError[];

  /** Original request configuration */
  request?: RequestConfig;

  /** Response body (if available) */
  response?: unknown;

  /** Request ID */
  requestId?: string;

  /** Correlation ID */
  correlationId?: string;

  /** Retry information */
  retryInfo?: RetryInfo;

  /** Error timestamp */
  timestamp: number;

  /** Original error (if wrapped) */
  cause?: Error;

  /** Whether error is retryable */
  retryable: boolean;

  /** Stack trace */
  stack?: string;
}
```

### ErrorCategory

Error category classification.

```typescript
type ErrorCategory =
  | 'network'         // Network connectivity issues
  | 'authentication'  // 401 errors
  | 'authorization'   // 403 errors
  | 'validation'      // 400/422 errors
  | 'not_found'       // 404 errors
  | 'conflict'        // 409 errors
  | 'rate_limit'      // 429 errors
  | 'server'          // 5xx errors
  | 'timeout'         // Request timeout
  | 'cancelled'       // Request cancelled
  | 'unknown';        // Other errors
```

### ErrorSeverity

Error severity level.

```typescript
type ErrorSeverity =
  | 'low'      // Minor issues, recoverable
  | 'medium'   // Moderate issues, may affect user
  | 'high'     // Serious issues, requires attention
  | 'critical'; // Critical issues, requires immediate action
```

### FieldError

Field-level validation error.

```typescript
interface FieldError {
  /** Field name */
  field: string;

  /** Error message */
  message: string;

  /** Error code */
  code?: string;

  /** Field value that caused error */
  value?: unknown;

  /** Additional error details */
  details?: Record<string, unknown>;
}
```

### RetryInfo

Information about retry attempts.

```typescript
interface RetryInfo {
  /** Current attempt number */
  attempt: number;

  /** Maximum attempts allowed */
  maxAttempts: number;

  /** Next retry timestamp */
  nextRetryAt?: number;

  /** Whether another retry will be attempted */
  willRetry: boolean;
}
```

### ErrorInterceptor

Function to intercept and handle errors.

```typescript
type ErrorInterceptor = (
  error: ApiError
) => ApiError | Promise<never>;
```

## Configuration Types

### ApiClientConfig

Configuration for the API client.

```typescript
interface ApiClientConfig {
  /** Base URL for all requests */
  baseUrl: string;

  /** Default timeout in milliseconds */
  timeout?: number;

  /** Default headers for all requests */
  headers?: RequestHeaders;

  /** Default retry configuration */
  retry?: Partial<RetryConfig>;

  /** Enable request deduplication */
  deduplicate?: boolean;

  /** Auto-refresh expired tokens */
  autoRefreshToken?: boolean;

  /** Time before token expiry to refresh (ms) */
  tokenRefreshThreshold?: number;

  /** Token storage provider */
  tokenProvider?: TokenProvider;

  /** Request interceptors */
  requestInterceptors?: RequestInterceptor[];

  /** Response interceptors */
  responseInterceptors?: ResponseInterceptor[];

  /** Error interceptors */
  errorInterceptors?: ErrorInterceptor[];

  /** Global error handler */
  onError?: (error: ApiError) => void;

  /** Request start callback */
  onRequestStart?: (config: RequestConfig) => void;

  /** Request end callback */
  onRequestEnd?: (response: ApiResponse | ApiError) => void;

  /** Credentials mode */
  credentials?: RequestCredentials;

  /** Custom fetch implementation */
  fetch?: typeof fetch;

  /** Rate limiting configuration */
  rateLimit?: RateLimitConfig | RateLimitPreset;
}
```

### TokenProvider

Interface for token storage providers.

```typescript
interface TokenProvider {
  /** Get access token */
  getAccessToken: () => string | null | Promise<string | null>;

  /** Get refresh token */
  getRefreshToken: () => string | null | Promise<string | null>;

  /** Set access token */
  setAccessToken: (token: string) => void | Promise<void>;

  /** Set refresh token */
  setRefreshToken: (token: string) => void | Promise<void>;

  /** Clear all tokens */
  clearTokens: () => void | Promise<void>;
}
```

### RateLimitConfig

Rate limiting configuration.

```typescript
interface RateLimitConfig {
  /** Maximum requests per window */
  maxRequests: number;

  /** Time window in milliseconds */
  windowMs: number;

  /** Strategy for handling exceeded limits */
  strategy?: 'queue' | 'reject' | 'delay';

  /** Maximum queue size (for queue strategy) */
  maxQueueSize?: number;

  /** Maximum delay (for delay strategy) */
  maxDelay?: number;

  /** Key generator for per-endpoint limits */
  keyGenerator?: (endpoint: string) => string;
}
```

### RateLimitPreset

Pre-configured rate limit presets.

```typescript
type RateLimitPreset =
  | 'conservative' // 60 requests/minute
  | 'standard'     // 100 requests/minute
  | 'aggressive'   // 300 requests/minute
  | 'burst';       // 30 requests/second
```

## Hook Types

### UseApiRequestOptions

Options for `useApiRequest` hook.

```typescript
interface UseApiRequestOptions<TResponse> {
  /** Request URL */
  url: string;

  /** Query key for caching */
  queryKey: QueryKey;

  /** Path parameters */
  pathParams?: Record<string, string | number>;

  /** Query parameters */
  params?: QueryParams;

  /** Additional request options */
  requestOptions?: Partial<RequestConfig>;

  /** Enable/disable query */
  enabled?: boolean;

  /** Stale time in milliseconds */
  staleTime?: number;

  /** Cache time in milliseconds */
  gcTime?: number;

  /** Refetch on window focus */
  refetchOnWindowFocus?: boolean;

  /** Refetch on mount */
  refetchOnMount?: boolean | 'always';

  /** Refetch on reconnect */
  refetchOnReconnect?: boolean;

  /** Polling interval */
  refetchInterval?: number | false;

  /** Retry configuration */
  retry?: number | boolean | ((attempt: number, error: ApiError) => boolean);

  /** Transform response data */
  select?: (data: TResponse) => unknown;

  /** Success callback */
  onSuccess?: (data: TResponse) => void;

  /** Error callback */
  onError?: (error: ApiError) => void;
}
```

### UseApiRequestResult

Return type for `useApiRequest` hook.

```typescript
interface UseApiRequestResult<TResponse> {
  /** Response data */
  data: TResponse | undefined;

  /** Initial loading state */
  isLoading: boolean;

  /** Success state */
  isSuccess: boolean;

  /** Error state */
  isError: boolean;

  /** Error object */
  error: ApiError | null;

  /** Fetching state (including background) */
  isFetching: boolean;

  /** Background refetch state */
  isRefetching: boolean;

  /** Manual refetch function */
  refetch: () => Promise<void>;

  /** Invalidate and refetch */
  invalidate: () => Promise<void>;

  /** Update cached data */
  setData: (updater: TResponse | ((old: TResponse | undefined) => TResponse)) => void;

  /** Get current cached data */
  getCachedData: () => TResponse | undefined;

  /** Whether data exists */
  hasData: boolean;
}
```

### UseApiMutationConfig

Configuration for `useApiMutation` hook.

```typescript
interface UseApiMutationConfig<TResponse, TBody, TContext = unknown> {
  /** HTTP method */
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';

  /** Request URL */
  url: string;

  /** Additional request options */
  requestOptions?: Partial<RequestConfig>;

  /** Queries to invalidate on success */
  invalidateQueries?: QueryKey[];

  /** Queries to refetch on success */
  refetchQueries?: QueryKey[];

  /** Query key for optimistic updates */
  optimisticQueryKey?: QueryKey;

  /** Optimistic update function */
  optimisticUpdate?: (variables: MutationVariables<TBody>, old: unknown) => unknown;

  /** Pre-mutation callback */
  onMutate?: (variables: MutationVariables<TBody>) => TContext | Promise<TContext>;

  /** Success callback */
  onSuccess?: (data: TResponse, variables: MutationVariables<TBody>, context: TContext) => void;

  /** Error callback */
  onError?: (error: ApiError, variables: MutationVariables<TBody>, context: TContext | undefined) => void;

  /** Settled callback (success or error) */
  onSettled?: (data: TResponse | undefined, error: ApiError | null, variables: MutationVariables<TBody>, context: TContext | undefined) => void;

  /** Retry configuration */
  retry?: number | boolean;
}
```

### UseApiMutationResult

Return type for `useApiMutation` hook.

```typescript
interface UseApiMutationResult<TResponse, TBody> {
  /** Execute mutation */
  mutate: (variables: MutationVariables<TBody>) => void;

  /** Execute mutation (returns Promise) */
  mutateAsync: (variables: MutationVariables<TBody>) => Promise<TResponse>;

  /** Simplified mutate with just body */
  mutateWithBody: (body: TBody) => void;

  /** Simplified async mutate with body */
  mutateAsyncWithBody: (body: TBody) => Promise<TResponse>;

  /** Mutation response data */
  data: TResponse | undefined;

  /** Mutation error */
  error: ApiError | null;

  /** Loading state */
  isLoading: boolean;

  /** Success state */
  isSuccess: boolean;

  /** Error state */
  isError: boolean;

  /** Reset mutation state */
  reset: () => void;
}
```

### MutationVariables

Variables for mutations.

```typescript
interface MutationVariables<TBody> {
  /** Request body */
  body?: TBody;

  /** Path parameters */
  pathParams?: Record<string, string | number>;

  /** Query parameters */
  params?: QueryParams;

  /** Additional headers */
  headers?: RequestHeaders;
}
```

### QueryKey

React Query key type.

```typescript
type QueryKey = readonly unknown[];
```

## Advanced Types

### GatewayRequest

Request configuration for API Gateway.

```typescript
interface GatewayRequest<TBody = unknown> {
  /** API endpoint path */
  path: string;

  /** HTTP method */
  method: HttpMethod;

  /** Request body */
  body?: TBody;

  /** Query parameters */
  params?: Record<string, string | number | boolean | undefined>;

  /** Request headers */
  headers?: Record<string, string>;

  /** Request timeout */
  timeout?: number;

  /** Skip authentication */
  skipAuth?: boolean;

  /** API version */
  apiVersion?: string;

  /** Retry configuration */
  retry?: RetryConfig;

  /** Cache configuration */
  cache?: CacheConfig;

  /** Request metadata */
  metadata?: Record<string, unknown>;

  /** Abort signal */
  signal?: AbortSignal;
}
```

### GatewayResponse

Response from API Gateway.

```typescript
interface GatewayResponse<TData = unknown> {
  /** Response data */
  data: TData;

  /** HTTP status code */
  status: number;

  /** Status text */
  statusText: string;

  /** Response headers */
  headers: Record<string, string>;

  /** Request duration */
  duration: number;

  /** From cache */
  fromCache?: boolean;

  /** Request metadata */
  metadata?: Record<string, unknown>;
}
```

### HealthStatus

API health status.

```typescript
type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
```

### HealthCheckResult

Result of a health check.

```typescript
interface HealthCheckResult {
  /** Health status */
  status: HealthStatus;

  /** Check timestamp */
  timestamp: number;

  /** Latency in milliseconds */
  latency: number;

  /** Individual checks */
  checks?: Record<string, {
    status: HealthStatus;
    message?: string;
    latency?: number;
  }>;

  /** Error message (if unhealthy) */
  error?: string;
}
```

## Type Guards

Type guard functions for runtime type checking.

### isApiError()

```typescript
function isApiError(error: unknown): error is ApiError
```

### isNetworkError()

```typescript
function isNetworkError(error: unknown): error is ApiError
```

### isAuthenticationError()

```typescript
function isAuthenticationError(error: unknown): error is ApiError
```

### isAuthorizationError()

```typescript
function isAuthorizationError(error: unknown): error is ApiError
```

### isValidationError()

```typescript
function isValidationError(error: unknown): error is ApiError
```

### isRateLimitError()

```typescript
function isRateLimitError(error: unknown): error is ApiError
```

### isServerError()

```typescript
function isServerError(error: unknown): error is ApiError
```

### isTimeoutError()

```typescript
function isTimeoutError(error: unknown): error is ApiError
```

### isCancelledError()

```typescript
function isCancelledError(error: unknown): error is ApiError
```

## Utility Types

### DeepPartial

Make all properties optional recursively.

```typescript
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
```

### DeepReadonly

Make all properties readonly recursively.

```typescript
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};
```

### Nullable

Make type nullable.

```typescript
type Nullable<T> = T | null;
```

### Optional

Make type optional.

```typescript
type Optional<T> = T | undefined;
```

## Related Documentation

### API Documentation
- **[API Module Overview](./README.md)** - Complete API module guide
- **[API Client](./API_CLIENT.md)** - HTTP client and configuration
- **[Hooks](./HOOKS.md)** - React hooks for data fetching
- **[Interceptors](./INTERCEPTORS.md)** - Request/response interceptors
- **[Advanced Features](./ADVANCED.md)** - Enterprise-grade features

### Type Documentation
- **[Types Module](../types/README.md)** - DOM extensions and browser API types
- **[Shared Utilities](../shared/README.md)** - Shared type utilities

### Reference
- **[TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)** - TypeScript reference
- **[Fetch API Types](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)** - Standard web types
