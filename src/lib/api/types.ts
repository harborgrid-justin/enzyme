/**
 * @file API Type Definitions
 * @description Comprehensive type system for the API layer providing full type safety
 * across request building, response handling, caching, and error management.
 *
 * This module defines the foundational types that power the entire API infrastructure,
 * enabling compile-time verification of API contracts and runtime type safety.
 *
 * @example
 * ```typescript
 * import type {
 *   ApiEndpoint,
 *   ApiRequest,
 *   ApiResponse,
 *   ApiError,
 * } from '@/lib/api/types';
 *
 * // Define a typed endpoint
 * const userEndpoint: ApiEndpoint<UserRequest, UserResponse> = {
 *   method: 'GET',
 *   path: '/users/:id',
 *   responseType: 'json',
 * };
 * ```
 */

import type { QueryKey } from '@tanstack/react-query';

// =============================================================================
// HTTP METHOD TYPES
// =============================================================================

/**
 * Supported HTTP methods for API requests
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * HTTP methods that typically include a request body
 */
export type HttpMethodWithBody = 'POST' | 'PUT' | 'PATCH';

/**
 * HTTP methods that typically do not include a request body
 */
export type HttpMethodWithoutBody = 'GET' | 'DELETE' | 'HEAD' | 'OPTIONS';

// =============================================================================
// REQUEST TYPES
// =============================================================================

/**
 * Content types for request bodies
 */
export type ContentType =
  | 'application/json'
  | 'application/x-www-form-urlencoded'
  | 'multipart/form-data'
  | 'text/plain'
  | 'application/octet-stream';

/**
 * Response types expected from the server
 */
export type ResponseType = 'json' | 'text' | 'blob' | 'arraybuffer' | 'stream';

/**
 * URL path parameters extracted from path template
 *
 * @example
 * ```typescript
 * type Params = PathParams<'/users/:userId/posts/:postId'>;
 * // Results in: { userId: string; postId: string }
 * ```
 */
export type PathParams<Path extends string> = Path extends `${string}:${infer Param}/${infer Rest}`
  ? { [K in Param]: string } & PathParams<`/${Rest}`>
  : Path extends `${string}:${infer Param}`
    ? { [K in Param]: string }
    : Record<string, never>;

/**
 * Query parameter value types
 */
export type QueryParamValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | string[]
  | number[];

/**
 * Query parameters object
 */
export type QueryParams = Record<string, QueryParamValue>;

/**
 * Headers configuration for requests
 */
export interface RequestHeaders {
  'Content-Type'?: ContentType;
  'Accept'?: string;
  'Authorization'?: string;
  'X-Request-ID'?: string;
  'X-Correlation-ID'?: string;
  'X-Idempotency-Key'?: string;
  'Cache-Control'?: string;
  'If-None-Match'?: string;
  'If-Modified-Since'?: string;
  [key: string]: string | undefined;
}

/**
 * Request configuration options
 */
export interface RequestConfig<TBody = unknown> {
  /** HTTP method */
  method: HttpMethod;
  /** Request URL (relative to base URL) */
  url: string;
  /** Request body (for POST, PUT, PATCH) */
  body?: TBody;
  /** Query parameters */
  params?: QueryParams;
  /** Path parameters for URL substitution */
  pathParams?: Record<string, string | number>;
  /** Custom headers */
  headers?: RequestHeaders;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Expected response type */
  responseType?: ResponseType;
  /** Content type for request body */
  contentType?: ContentType;
  /** AbortController signal for cancellation */
  signal?: AbortSignal;
  /** Enable credentials (cookies) */
  credentials?: RequestCredentials;
  /** Cache mode */
  cache?: RequestCache;
  /** Retry configuration */
  retry?: RetryConfig;
  /** Request priority */
  priority?: RequestPriority;
  /** Custom metadata for interceptors */
  meta?: RequestMeta;
}

/**
 * Request priority levels for queue ordering
 */
export type RequestPriority = 'critical' | 'high' | 'normal' | 'low' | 'background';

/**
 * Custom metadata attached to requests for interceptor processing
 */
export interface RequestMeta {
  /** Unique request identifier */
  requestId?: string;
  /** Correlation ID for distributed tracing */
  correlationId?: string;
  /** Idempotency key for safe retries */
  idempotencyKey?: string;
  /** Skip authentication header */
  skipAuth?: boolean;
  /** Skip retry logic */
  skipRetry?: boolean;
  /** Custom cache key */
  cacheKey?: string;
  /** Cache TTL in milliseconds */
  cacheTtl?: number;
  /** Deduplicate concurrent identical requests */
  deduplicate?: boolean;
  /** Request start timestamp */
  startTime?: number;
  /** Request tags for categorization */
  tags?: string[];
  /** Custom properties */
  [key: string]: unknown;
}

/**
 * Retry configuration for failed requests
 */
export interface RetryConfig {
  /** Maximum retry attempts */
  maxAttempts: number;
  /** Base delay between retries (ms) */
  baseDelay: number;
  /** Maximum delay between retries (ms) */
  maxDelay: number;
  /** Exponential backoff factor */
  backoffFactor: number;
  /** HTTP status codes that should trigger retry */
  retryableStatusCodes: number[];
  /** Whether to retry on network errors */
  retryOnNetworkError: boolean;
  /** Custom retry condition */
  shouldRetry?: (error: ApiError, attempt: number) => boolean;
  /** Callback before each retry */
  onRetry?: (error: ApiError, attempt: number) => void;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

/**
 * Response headers with common fields
 */
export interface ResponseHeaders {
  'content-type'?: string;
  'content-length'?: string;
  'cache-control'?: string;
  'etag'?: string;
  'last-modified'?: string;
  'x-request-id'?: string;
  'x-ratelimit-limit'?: string;
  'x-ratelimit-remaining'?: string;
  'x-ratelimit-reset'?: string;
  [key: string]: string | undefined;
}

/**
 * API response wrapper providing metadata alongside data
 */
export interface ApiResponse<TData = unknown> {
  /** Response data */
  data: TData;
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
  /** Cache information */
  cache?: CacheInfo;
}

/**
 * Response timing metrics
 */
export interface ResponseTiming {
  /** Request start timestamp */
  startTime: number;
  /** Request end timestamp */
  endTime: number;
  /** Total duration in milliseconds */
  duration: number;
  /** Time to first byte (TTFB) */
  ttfb?: number;
  /** DNS lookup time */
  dnsLookup?: number;
  /** TCP connection time */
  tcpConnection?: number;
  /** TLS handshake time */
  tlsHandshake?: number;
}

/**
 * Cache information for response
 */
export interface CacheInfo {
  /** Whether response was served from cache */
  fromCache: boolean;
  /** Cache hit type */
  hitType?: 'memory' | 'disk' | 'stale-while-revalidate';
  /** Cache entry age in milliseconds */
  age?: number;
  /** Cache expiration timestamp */
  expiresAt?: number;
  /** ETag for cache validation */
  etag?: string;
}

// =============================================================================
// PAGINATION TYPES
// =============================================================================

/**
 * Cursor-based pagination parameters
 */
export interface CursorPaginationParams {
  /** Cursor for the next page */
  cursor?: string;
  /** Number of items per page */
  limit?: number;
  /** Sort direction */
  direction?: 'forward' | 'backward';
}

/**
 * Offset-based pagination parameters
 */
export interface OffsetPaginationParams {
  /** Page number (1-indexed) */
  page?: number;
  /** Number of items per page */
  pageSize?: number;
  /** Offset from start */
  offset?: number;
  /** Maximum items to return */
  limit?: number;
}

/**
 * Unified pagination parameters supporting both strategies
 */
export type PaginationParams = CursorPaginationParams | OffsetPaginationParams;

/**
 * Pagination metadata in responses
 */
export interface PaginationMeta {
  /** Total number of items */
  total: number;
  /** Current page number */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there are more pages */
  hasMore: boolean;
  /** Cursor for next page (cursor pagination) */
  nextCursor?: string;
  /** Cursor for previous page (cursor pagination) */
  prevCursor?: string;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<TItem> {
  /** Array of items */
  items: TItem[];
  /** Pagination metadata */
  pagination: PaginationMeta;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Error severity levels
 */
export type ErrorSeverity = 'critical' | 'error' | 'warning' | 'info';

/**
 * Error categories for classification
 */
export type ErrorCategory =
  | 'network'
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'not_found'
  | 'conflict'
  | 'rate_limit'
  | 'server'
  | 'timeout'
  | 'cancelled'
  | 'unknown';

/**
 * Field-level validation error
 */
export interface FieldError {
  /** Field name or path */
  field: string;
  /** Error message */
  message: string;
  /** Error code */
  code?: string;
  /** Attempted value (sanitized) */
  value?: unknown;
}

/**
 * Normalized API error structure
 */
export interface ApiError extends Error {
  /** Error name (always 'ApiError') */
  name: 'ApiError';
  /** HTTP status code */
  status: number;
  /** Error code for programmatic handling */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Error category */
  category: ErrorCategory;
  /** Error severity */
  severity: ErrorSeverity;
  /** Field-level validation errors */
  fieldErrors?: FieldError[];
  /** Original request configuration */
  request?: RequestConfig;
  /** Response data (if any) */
  response?: unknown;
  /** Request ID for debugging */
  requestId?: string;
  /** Correlation ID for tracing */
  correlationId?: string;
  /** Retry information */
  retryInfo?: {
    attempt: number;
    maxAttempts: number;
    nextRetryAt?: number;
  };
  /** Timestamp of error occurrence */
  timestamp: number;
  /** Original error (if wrapped) */
  cause?: Error;
  /** Whether the error is retryable */
  retryable: boolean;
  /** Stack trace */
  stack?: string;
}

/**
 * Server error response format
 */
export interface ServerErrorResponse {
  /** Error code */
  code?: string;
  /** Error message */
  message?: string;
  /** Error details */
  error?: string | { message: string; code?: string };
  /** Validation errors */
  errors?: Array<{ field: string; message: string }>;
  /** Additional details */
  details?: unknown;
}

// =============================================================================
// ENDPOINT DEFINITION TYPES
// =============================================================================

/**
 * API endpoint definition for type-safe API client generation
 */
export interface ApiEndpoint<
  TRequest = unknown,
  TResponse = unknown,
  TPathParams extends Record<string, string | number> = Record<string, never>,
  TQueryParams extends QueryParams = QueryParams,
> {
  /** HTTP method */
  method: HttpMethod;
  /** URL path (can include :param placeholders) */
  path: string;
  /** Expected response type */
  responseType?: ResponseType;
  /** Request content type */
  contentType?: ContentType;
  /** Default timeout */
  timeout?: number;
  /** Default retry configuration */
  retry?: Partial<RetryConfig>;
  /** Whether endpoint requires authentication */
  auth?: boolean;
  /** Endpoint description for documentation */
  description?: string;
  /** Cache configuration */
  cache?: EndpointCacheConfig;
  /** Type markers (not used at runtime) */
  _types?: {
    request: TRequest;
    response: TResponse;
    pathParams: TPathParams;
    queryParams: TQueryParams;
  };
}

/**
 * Endpoint-specific cache configuration
 */
export interface EndpointCacheConfig {
  /** Cache TTL in milliseconds */
  ttl: number;
  /** Cache strategy */
  strategy: 'cache-first' | 'network-first' | 'stale-while-revalidate' | 'no-cache';
  /** Cache key generator */
  keyGenerator?: (request: RequestConfig) => string;
  /** Conditions for caching */
  cacheIf?: (response: ApiResponse) => boolean;
}

// =============================================================================
// API CONTRACT TYPES
// =============================================================================

/**
 * API contract defining all endpoints for a resource
 */
export type ApiContract = Record<string, ApiEndpoint>;

/**
 * Infer request type from endpoint definition
 */
export type InferEndpointRequest<T extends ApiEndpoint> = T extends ApiEndpoint<infer R>
  ? R
  : never;

/**
 * Infer response type from endpoint definition
 */
export type InferEndpointResponse<T extends ApiEndpoint> = T extends ApiEndpoint<
  unknown,
  infer R
>
  ? R
  : never;

/**
 * Infer path params from endpoint definition
 */
export type InferEndpointPathParams<T extends ApiEndpoint> = T extends ApiEndpoint<
  unknown,
  unknown,
  infer P
>
  ? P
  : Record<string, never>;

/**
 * Infer query params from endpoint definition
 */
export type InferEndpointQueryParams<T extends ApiEndpoint> = T extends ApiEndpoint<
  unknown,
  Record<string, string | number>,
  Record<string, string | number>,
  infer Q
>
  ? Q
  : QueryParams;

// =============================================================================
// CLIENT CONFIGURATION TYPES
// =============================================================================

/**
 * Token provider interface for configurable token access
 *
 * Allows applications to provide custom token storage/retrieval logic
 * instead of hardcoded localStorage access.
 *
 * @example
 * ```typescript
 * // Custom token provider using secure storage
 * const tokenProvider: TokenProvider = {
 *   getAccessToken: () => secureStorage.get('access_token'),
 *   getRefreshToken: () => secureStorage.get('refresh_token'),
 *   setAccessToken: (token) => secureStorage.set('access_token', token),
 *   setRefreshToken: (token) => secureStorage.set('refresh_token', token),
 *   clearTokens: () => secureStorage.clear(),
 * };
 * ```
 */
export interface TokenProvider {
  /** Get the current access token */
  getAccessToken: () => string | null | Promise<string | null>;
  /** Get the current refresh token */
  getRefreshToken: () => string | null | Promise<string | null>;
  /** Store a new access token */
  setAccessToken: (token: string) => void | Promise<void>;
  /** Store a new refresh token */
  setRefreshToken: (token: string) => void | Promise<void>;
  /** Clear all tokens (e.g., on logout) */
  clearTokens: () => void | Promise<void>;
}

/**
 * API client configuration
 */
export interface ApiClientConfig {
  /** Base URL for all requests */
  baseUrl: string;
  /** Default timeout in milliseconds */
  timeout?: number;
  /** Default headers */
  headers?: RequestHeaders;
  /** Default retry configuration */
  retry?: Partial<RetryConfig>;
  /** Enable request deduplication */
  deduplicate?: boolean;
  /** Enable automatic token refresh */
  autoRefreshToken?: boolean;
  /** Token refresh threshold (ms before expiry) */
  tokenRefreshThreshold?: number;
  /**
   * Custom token provider for configurable token storage
   *
   * If not provided, defaults to localStorage-based storage.
   * Use this to integrate with custom auth systems, secure storage,
   * or server-side rendering environments.
   *
   * @example
   * ```typescript
   * const client = createApiClient({
   *   baseUrl: 'https://api.example.com',
   *   tokenProvider: {
   *     getAccessToken: () => authService.getToken(),
   *     getRefreshToken: () => authService.getRefreshToken(),
   *     setAccessToken: (token) => authService.setToken(token),
   *     setRefreshToken: (token) => authService.setRefreshToken(token),
   *     clearTokens: () => authService.logout(),
   *   },
   * });
   * ```
   */
  tokenProvider?: TokenProvider;
  /** Request interceptors */
  requestInterceptors?: RequestInterceptor[];
  /** Response interceptors */
  responseInterceptors?: ResponseInterceptor[];
  /** Error interceptors */
  errorInterceptors?: ErrorInterceptor[];
  /** Global error handler */
  onError?: (error: ApiError) => void;
  /** Request started handler */
  onRequestStart?: (config: RequestConfig) => void;
  /** Request completed handler */
  onRequestEnd?: (response: ApiResponse | ApiError) => void;
  /** Credential handling */
  credentials?: RequestCredentials;
  /** Custom fetch implementation */
  fetch?: typeof fetch;
  /** Rate limiting configuration */
  rateLimit?: import('./advanced/rate-limiter').RateLimitConfig | keyof typeof import('./advanced/rate-limiter').RATE_LIMIT_PRESETS | string;
}

/**
 * Request interceptor function
 */
export type RequestInterceptor = (
  config: RequestConfig
) => RequestConfig | Promise<RequestConfig>;

/**
 * Response interceptor function
 */
export type ResponseInterceptor = <T>(
  response: ApiResponse<T>
) => ApiResponse<T> | Promise<ApiResponse<T>>;

/**
 * Error interceptor function
 */
export type ErrorInterceptor = (
  error: ApiError
) => ApiError | Promise<ApiError> | never;

// =============================================================================
// HOOK TYPES
// =============================================================================

/**
 * Options for useApiRequest hook
 */
export interface UseApiRequestOptions<TData, TError = ApiError> {
  /** Enable the query */
  enabled?: boolean;
  /** Stale time in milliseconds */
  staleTime?: number;
  /** Garbage collection time */
  gcTime?: number;
  /** Refetch on window focus */
  refetchOnWindowFocus?: boolean;
  /** Refetch on network reconnect */
  refetchOnReconnect?: boolean;
  /** Refetch on mount */
  refetchOnMount?: boolean | 'always';
  /** Refetch interval */
  refetchInterval?: number | false;
  /** Retry configuration */
  retry?: number | boolean | ((failureCount: number, error: TError) => boolean);
  /** Retry delay */
  retryDelay?: number | ((attemptIndex: number, error: TError) => number);
  /** Keep previous data while fetching */
  keepPreviousData?: boolean;
  /** Placeholder data */
  placeholderData?: TData | (() => TData | undefined);
  /** Select/transform response data */
  select?: (data: TData) => TData;
  /** On success callback */
  onSuccess?: (data: TData) => void;
  /** On error callback */
  onError?: (error: TError) => void;
  /** On settled callback */
  onSettled?: (data: TData | undefined, error: TError | null) => void;
  /** Meta information */
  meta?: Record<string, unknown>;
}

/**
 * Options for useApiMutation hook
 */
export interface UseApiMutationOptions<TData, TError = ApiError, TVariables = unknown, TContext = unknown> {
  /** On mutate callback (for optimistic updates) */
  onMutate?: (variables: TVariables) => TContext | Promise<TContext>;
  /** On success callback */
  onSuccess?: (data: TData, variables: TVariables, context: TContext | undefined) => void;
  /** On error callback */
  onError?: (error: TError, variables: TVariables, context: TContext | undefined) => void;
  /** On settled callback */
  onSettled?: (
    data: TData | undefined,
    error: TError | null,
    variables: TVariables,
    context: TContext | undefined
  ) => void;
  /** Retry configuration */
  retry?: number | boolean;
  /** Retry delay */
  retryDelay?: number;
  /** Query keys to invalidate on success */
  invalidateQueries?: QueryKey[];
  /** Query keys to update optimistically */
  optimisticUpdate?: {
    queryKey: QueryKey;
    updater: (oldData: unknown, variables: TVariables) => unknown;
  };
  /** Meta information */
  meta?: Record<string, unknown>;
}

/**
 * API request result with loading states
 */
export interface ApiRequestResult<TData, TError = ApiError> {
  /** Response data */
  data: TData | undefined;
  /** Error if request failed */
  error: TError | null;
  /** Whether request is currently loading */
  isLoading: boolean;
  /** Whether this is the initial load */
  isInitialLoading: boolean;
  /** Whether request was successful */
  isSuccess: boolean;
  /** Whether request failed */
  isError: boolean;
  /** Whether data is stale */
  isStale: boolean;
  /** Whether request is being refetched */
  isFetching: boolean;
  /** Whether refetch is in background */
  isRefetching: boolean;
  /** Refetch function */
  refetch: () => Promise<ApiRequestResult<TData, TError>>;
  /** Data updated timestamp */
  dataUpdatedAt: number | undefined;
  /** Error updated timestamp */
  errorUpdatedAt: number | undefined;
  /** Fetch status */
  fetchStatus: 'fetching' | 'paused' | 'idle';
  /** Request status */
  status: 'pending' | 'error' | 'success';
}

/**
 * API mutation result with mutation states
 */
export interface ApiMutationResult<TData, TError = ApiError, TVariables = unknown> {
  /** Response data */
  data: TData | undefined;
  /** Error if mutation failed */
  error: TError | null;
  /** Whether mutation is in progress */
  isLoading: boolean;
  /** Alias for isLoading */
  isPending: boolean;
  /** Whether mutation was successful */
  isSuccess: boolean;
  /** Whether mutation failed */
  isError: boolean;
  /** Whether mutation is idle */
  isIdle: boolean;
  /** Mutate function */
  mutate: (variables: TVariables) => void;
  /** Async mutate function */
  mutateAsync: (variables: TVariables) => Promise<TData>;
  /** Reset mutation state */
  reset: () => void;
  /** Mutation status */
  status: 'idle' | 'pending' | 'error' | 'success';
  /** Variables used in last mutation */
  variables: TVariables | undefined;
}

// =============================================================================
// MOCK TYPES
// =============================================================================

/**
 * Mock request handler
 */
export type MockHandler<TRequest = unknown, TResponse = unknown> = (
  request: MockRequest<TRequest>
) => MockResponse<TResponse> | Promise<MockResponse<TResponse>>;

/**
 * Mock request object
 */
export interface MockRequest<TBody = unknown> {
  /** HTTP method */
  method: HttpMethod;
  /** Request URL */
  url: string;
  /** Parsed URL path */
  path: string;
  /** Path parameters */
  pathParams: Record<string, string>;
  /** Query parameters */
  queryParams: QueryParams;
  /** Request headers */
  headers: RequestHeaders;
  /** Request body */
  body: TBody;
}

/**
 * Mock response object
 */
export interface MockResponse<TData = unknown> {
  /** Response status code */
  status: number;
  /** Response status text */
  statusText?: string;
  /** Response headers */
  headers?: Record<string, string>;
  /** Response data */
  data?: TData;
  /** Response delay in milliseconds */
  delay?: number;
  /** Simulate network error */
  networkError?: boolean;
  /** Simulate timeout */
  timeout?: boolean;
}

/**
 * Mock route definition
 */
export interface MockRoute<TRequest = unknown, TResponse = unknown> {
  /** HTTP method to match */
  method: HttpMethod;
  /** URL pattern to match (supports :param syntax) */
  path: string;
  /** Request handler */
  handler: MockHandler<TRequest, TResponse>;
  /** Response delay range [min, max] in ms */
  delay?: [number, number];
  /** Probability of error (0-1) */
  errorRate?: number;
}

/**
 * Mock server configuration
 */
export interface MockServerConfig {
  /** Base URL for mock server */
  baseUrl?: string;
  /** Default response delay range */
  defaultDelay?: [number, number];
  /** Default error rate */
  defaultErrorRate?: number;
  /** Enable request logging */
  logging?: boolean;
  /** Custom 404 handler */
  notFoundHandler?: MockHandler;
}

// =============================================================================
// HEALTH CHECK TYPES
// =============================================================================

/**
 * API health status
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

/**
 * Health check result
 */
export interface HealthCheckResult {
  /** Overall health status */
  status: HealthStatus;
  /** Last check timestamp */
  timestamp: number;
  /** Response latency in milliseconds */
  latency?: number;
  /** Detailed checks */
  checks?: Record<string, {
    status: HealthStatus;
    message?: string;
    latency?: number;
  }>;
  /** Error message if unhealthy */
  error?: string;
}

/**
 * Health monitor configuration
 */
export interface HealthMonitorConfig {
  /** Health check endpoint */
  endpoint: string;
  /** Check interval in milliseconds */
  interval: number;
  /** Timeout for health checks */
  timeout: number;
  /** Number of failures before unhealthy */
  failureThreshold: number;
  /** Number of successes before healthy */
  successThreshold: number;
  /** Callback on status change */
  onStatusChange?: (status: HealthStatus, previous: HealthStatus) => void;
}

// =============================================================================
// CACHE TYPES
// =============================================================================

/**
 * Cache entry structure
 */
export interface CacheEntry<TData = unknown> {
  /** Cached data */
  data: TData;
  /** Cache key */
  key: string;
  /** Creation timestamp */
  createdAt: number;
  /** Expiration timestamp */
  expiresAt: number;
  /** ETag for validation */
  etag?: string;
  /** Last modified timestamp */
  lastModified?: number;
  /** Number of times accessed */
  hits: number;
  /** Size in bytes (approximate) */
  size?: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Total number of entries */
  entries: number;
  /** Total cache size in bytes */
  size: number;
  /** Cache hit count */
  hits: number;
  /** Cache miss count */
  misses: number;
  /** Hit rate (0-1) */
  hitRate: number;
  /** Number of evictions */
  evictions: number;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Maximum cache size in bytes */
  maxSize?: number;
  /** Maximum number of entries */
  maxEntries?: number;
  /** Default TTL in milliseconds */
  defaultTtl?: number;
  /** Eviction policy */
  evictionPolicy?: 'lru' | 'lfu' | 'fifo';
  /** Enable stale-while-revalidate */
  staleWhileRevalidate?: boolean;
  /** Stale threshold in milliseconds */
  staleThreshold?: number;
}

// =============================================================================
// STREAMING TYPES
// =============================================================================

/**
 * Stream event types
 */
export type StreamEventType = 'data' | 'error' | 'end' | 'abort';

/**
 * Stream event
 */
export interface StreamEvent<TData = unknown> {
  /** Event type */
  type: StreamEventType;
  /** Event data */
  data?: TData;
  /** Error (if type is 'error') */
  error?: Error;
  /** Event timestamp */
  timestamp: number;
}

/**
 * Stream controller for managing streaming responses
 */
export interface StreamController<TData = unknown> {
  /** Subscribe to stream events */
  subscribe: (callback: (event: StreamEvent<TData>) => void) => () => void;
  /** Abort the stream */
  abort: () => void;
  /** Check if stream is active */
  isActive: () => boolean;
  /** Get accumulated data */
  getData: () => TData[];
}

/**
 * Streaming response options
 */
export interface StreamOptions {
  /** Parse as NDJSON */
  ndjson?: boolean;
  /** Parse as Server-Sent Events */
  sse?: boolean;
  /** Custom line parser */
  parser?: (line: string) => unknown;
  /** Buffer size for accumulation */
  bufferSize?: number;
  /** Timeout for stream inactivity */
  inactivityTimeout?: number;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Make all properties optional recursively.
 *
 * @deprecated Import from '../shared/type-utils' instead.
 * This re-export is provided for backward compatibility.
 */
export type { DeepPartial } from '../shared/type-utils';

/**
 * Make specific properties required
 */
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Extract non-undefined properties
 */
export type NonNullableFields<T> = {
  [P in keyof T]-?: NonNullable<T[P]>;
};

/**
 * Merge two types, with second type taking precedence
 */
export type Merge<T, U> = Omit<T, keyof U> & U;

/**
 * Create a branded type for nominal typing
 */
export type Brand<T, B> = T & { __brand: B };

/**
 * Request ID type (branded string)
 */
export type RequestId = Brand<string, 'RequestId'>;

/**
 * Correlation ID type (branded string)
 */
export type CorrelationId = Brand<string, 'CorrelationId'>;

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Type guard to check if a value is an ApiError.
 *
 * This is useful for narrowing error types in catch blocks or when
 * handling errors from API calls.
 *
 * @param value - The value to check
 * @returns True if the value is an ApiError, with type narrowing
 *
 * @example
 * ```typescript
 * try {
 *   await apiClient.get('/users');
 * } catch (error) {
 *   if (isApiError(error)) {
 *     // error is now typed as ApiError
 *     console.error(`API Error ${error.status}: ${error.message}`);
 *     if (error.fieldErrors) {
 *       error.fieldErrors.forEach(fe => console.error(fe.field, fe.message));
 *     }
 *   } else {
 *     throw error;
 *   }
 * }
 * ```
 */
export function isApiError(value: unknown): value is ApiError {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    candidate.name === 'ApiError' &&
    typeof candidate.status === 'number' &&
    typeof candidate.code === 'string' &&
    typeof candidate.message === 'string' &&
    typeof candidate.category === 'string' &&
    typeof candidate.severity === 'string' &&
    typeof candidate.timestamp === 'number' &&
    typeof candidate.retryable === 'boolean'
  );
}

/**
 * Type guard to check if a response is a PaginatedResponse.
 *
 * This is useful when handling API responses that may or may not be paginated.
 *
 * @param value - The value to check
 * @returns True if the value is a PaginatedResponse, with type narrowing
 *
 * @example
 * ```typescript
 * const response = await apiClient.get<UserList | PaginatedResponse<User>>('/users');
 *
 * if (isPaginatedResponse(response.data)) {
 *   // response.data is typed as PaginatedResponse<unknown>
 *   console.log(`Page ${response.data.pagination.page} of ${response.data.pagination.totalPages}`);
 *   response.data.items.forEach(item => console.log(item));
 * } else {
 *   // response.data is the other type
 *   console.log(response.data);
 * }
 * ```
 */
export function isPaginatedResponse<TItem = unknown>(
  value: unknown
): value is PaginatedResponse<TItem> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  // Check for items array
  if (!Array.isArray(candidate.items)) {
    return false;
  }

  // Check for pagination metadata
  const pagination = candidate.pagination;
  if (typeof pagination !== 'object' || pagination === null) {
    return false;
  }

  const meta = pagination as Record<string, unknown>;

  return (
    typeof meta.total === 'number' &&
    typeof meta.page === 'number' &&
    typeof meta.pageSize === 'number' &&
    typeof meta.totalPages === 'number' &&
    typeof meta.hasMore === 'boolean'
  );
}

/**
 * Type guard to check if a response is an ApiResponse wrapper.
 *
 * @param value - The value to check
 * @returns True if the value is an ApiResponse, with type narrowing
 *
 * @example
 * ```typescript
 * if (isApiResponse(result)) {
 *   console.log(`Status: ${result.status}`);
 *   console.log(`Duration: ${result.timing.duration}ms`);
 * }
 * ```
 */
export function isApiResponse<TData = unknown>(
  value: unknown
): value is ApiResponse<TData> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    'data' in candidate &&
    typeof candidate.status === 'number' &&
    typeof candidate.statusText === 'string' &&
    typeof candidate.headers === 'object' &&
    typeof candidate.request === 'object' &&
    typeof candidate.timing === 'object'
  );
}

/**
 * Type guard to check if an error is a network error (offline, DNS failure, etc.).
 *
 * @param error - The error to check
 * @returns True if the error is a network-related error
 *
 * @example
 * ```typescript
 * try {
 *   await apiClient.get('/data');
 * } catch (error) {
 *   if (isApiError(error) && isNetworkError(error)) {
 *     showOfflineMessage();
 *   }
 * }
 * ```
 */
export function isNetworkError(error: ApiError): boolean {
  return error.category === 'network';
}

/**
 * Type guard to check if an error is an authentication error.
 *
 * @param error - The error to check
 * @returns True if the error is an authentication error (401)
 *
 * @example
 * ```typescript
 * if (isApiError(error) && isAuthenticationError(error)) {
 *   redirectToLogin();
 * }
 * ```
 */
export function isAuthenticationError(error: ApiError): boolean {
  return error.category === 'authentication' || error.status === 401;
}

/**
 * Type guard to check if an error is an authorization error.
 *
 * @param error - The error to check
 * @returns True if the error is an authorization error (403)
 *
 * @example
 * ```typescript
 * if (isApiError(error) && isAuthorizationError(error)) {
 *   showAccessDeniedMessage();
 * }
 * ```
 */
export function isAuthorizationError(error: ApiError): boolean {
  return error.category === 'authorization' || error.status === 403;
}

/**
 * Type guard to check if an error is a validation error.
 *
 * @param error - The error to check
 * @returns True if the error is a validation error (400 with field errors)
 *
 * @example
 * ```typescript
 * if (isApiError(error) && isValidationError(error)) {
 *   // Display field-level errors
 *   error.fieldErrors?.forEach(fe => {
 *     setFieldError(fe.field, fe.message);
 *   });
 * }
 * ```
 */
export function isValidationError(error: ApiError): boolean {
  return (
    error.category === 'validation' ||
    (error.status === 400 && Array.isArray(error.fieldErrors) && error.fieldErrors.length > 0)
  );
}

/**
 * Type guard to check if an error is a rate limit error.
 *
 * @param error - The error to check
 * @returns True if the error is a rate limit error (429)
 *
 * @example
 * ```typescript
 * if (isApiError(error) && isRateLimitError(error)) {
 *   const retryAfter = error.retryInfo?.nextRetryAt;
 *   showRateLimitMessage(retryAfter);
 * }
 * ```
 */
export function isRateLimitError(error: ApiError): boolean {
  return error.category === 'rate_limit' || error.status === 429;
}

/**
 * Type guard to check if an error is a server error (5xx).
 *
 * @param error - The error to check
 * @returns True if the error is a server error
 *
 * @example
 * ```typescript
 * if (isApiError(error) && isServerError(error)) {
 *   // Server errors are typically retryable
 *   if (error.retryable) {
 *     await retry(fetchData);
 *   }
 * }
 * ```
 */
export function isServerError(error: ApiError): boolean {
  return error.category === 'server' || (error.status >= 500 && error.status < 600);
}

/**
 * Type guard to check if an error is a timeout error.
 *
 * @param error - The error to check
 * @returns True if the error is a timeout error
 *
 * @example
 * ```typescript
 * if (isApiError(error) && isTimeoutError(error)) {
 *   showTimeoutMessage();
 * }
 * ```
 */
export function isTimeoutError(error: ApiError): boolean {
  return error.category === 'timeout';
}

/**
 * Type guard to check if an error was caused by request cancellation.
 *
 * @param error - The error to check
 * @returns True if the error is due to request cancellation
 *
 * @example
 * ```typescript
 * if (isApiError(error) && isCancelledError(error)) {
 *   // Request was cancelled, no need to show error
 *   return;
 * }
 * ```
 */
export function isCancelledError(error: ApiError): boolean {
  return error.category === 'cancelled';
}
