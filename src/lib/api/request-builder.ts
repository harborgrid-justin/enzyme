/**
 * @file Request Builder
 * @description Fluent, type-safe request builder for constructing API requests with
 * comprehensive support for URL parameters, query strings, multipart forms,
 * request timeout management, and header configuration.
 *
 * This module provides a builder pattern implementation that enables:
 * - Type-safe request construction with full IDE autocomplete
 * - Fluent API for chaining configuration methods
 * - Automatic URL parameter substitution and encoding
 * - Complex query string serialization including arrays and nested objects
 * - Multipart form data construction with file upload support
 * - Request timeout and cancellation management
 * - Header manipulation with type safety
 *
 * @example
 * ```typescript
 * import { RequestBuilder } from '@/lib/api';
 *
 * // Build a complex request fluently
 * const request = new RequestBuilder<UserResponse>()
 *   .get('/users/:userId/posts')
 *   .pathParam('userId', '123')
 *   .query({ page: 1, limit: 20, tags: ['featured', 'recent'] })
 *   .header('X-Custom-Header', 'value')
 *   .timeout(5000)
 *   .build();
 *
 * // Build a multipart form request
 * const uploadRequest = new RequestBuilder<UploadResponse>()
 *   .post('/files/upload')
 *   .formData()
 *   .field('title', 'My Document')
 *   .file('document', myFile)
 *   .build();
 * ```
 */

import type {
  HttpMethod,
  RequestConfig,
  RequestHeaders,
  QueryParams,
  QueryParamValue,
  ContentType,
  ResponseType,
  RetryConfig,
  RequestPriority,
  RequestMeta,
} from './types';
import { API_CONFIG, TIMING } from '@/config';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Builder state for tracking configured options
 */
interface BuilderState<TBody = unknown> {
  method: HttpMethod;
  url: string;
  body?: TBody;
  pathParams: Record<string, string | number>;
  queryParams: QueryParams;
  headers: RequestHeaders;
  timeout?: number;
  responseType: ResponseType;
  contentType?: ContentType;
  signal?: AbortSignal;
  credentials?: RequestCredentials;
  cache?: RequestCache;
  retry?: Partial<RetryConfig>;
  priority: RequestPriority;
  meta: RequestMeta;
  formData?: FormData;
  isFormData: boolean;
}

/**
 * Query parameter serialization options
 */
export interface QuerySerializationOptions {
  /** Array serialization format */
  arrayFormat: 'brackets' | 'indices' | 'repeat' | 'comma';
  /** Encode keys */
  encodeKeys: boolean;
  /** Encode values */
  encodeValues: boolean;
  /** Skip null values */
  skipNull: boolean;
  /** Skip undefined values */
  skipUndefined: boolean;
  /** Allow dots in keys for nested objects */
  allowDots: boolean;
  /** Custom serializer for complex types */
  serialize?: (key: string, value: unknown) => string | null;
}

/**
 * Default serialization options
 */
const DEFAULT_SERIALIZATION_OPTIONS: QuerySerializationOptions = {
  arrayFormat: 'brackets',
  encodeKeys: true,
  encodeValues: true,
  skipNull: true,
  skipUndefined: true,
  allowDots: false,
};

// =============================================================================
// REQUEST BUILDER CLASS
// =============================================================================

/**
 * Fluent request builder for constructing type-safe API requests
 *
 * @typeParam TResponse - Expected response type
 * @typeParam TBody - Request body type
 *
 * @example
 * ```typescript
 * // Simple GET request
 * const config = new RequestBuilder<User>()
 *   .get('/users/123')
 *   .timeout(5000)
 *   .build();
 *
 * // POST with JSON body
 * const config = new RequestBuilder<User, CreateUserDto>()
 *   .post('/users')
 *   .json({ name: 'John', email: 'john@example.com' })
 *   .build();
 *
 * // Complex query parameters
 * const config = new RequestBuilder<SearchResults>()
 *   .get('/search')
 *   .query({
 *     q: 'search term',
 *     filters: { status: 'active', type: ['a', 'b'] },
 *     page: 1,
 *   })
 *   .build();
 * ```
 */
export class RequestBuilder<TResponse = unknown, TBody = unknown> {
  private state: BuilderState<TBody>;
  private serializationOptions: QuerySerializationOptions;

  constructor() {
    this.state = {
      method: 'GET',
      url: '',
      pathParams: {},
      queryParams: {},
      headers: {},
      responseType: 'json',
      priority: 'normal',
      meta: {},
      isFormData: false,
    };
    this.serializationOptions = { ...DEFAULT_SERIALIZATION_OPTIONS };
  }

  // ===========================================================================
  // HTTP METHOD SETTERS
  // ===========================================================================

  /**
   * Set HTTP method to GET
   */
  get(url: string): this {
    this.state.method = 'GET';
    this.state.url = url;
    return this;
  }

  /**
   * Set HTTP method to POST
   */
  post(url: string): this {
    this.state.method = 'POST';
    this.state.url = url;
    return this;
  }

  /**
   * Set HTTP method to PUT
   */
  put(url: string): this {
    this.state.method = 'PUT';
    this.state.url = url;
    return this;
  }

  /**
   * Set HTTP method to PATCH
   */
  patch(url: string): this {
    this.state.method = 'PATCH';
    this.state.url = url;
    return this;
  }

  /**
   * Set HTTP method to DELETE
   */
  delete(url: string): this {
    this.state.method = 'DELETE';
    this.state.url = url;
    return this;
  }

  /**
   * Set HTTP method to HEAD
   */
  head(url: string): this {
    this.state.method = 'HEAD';
    this.state.url = url;
    return this;
  }

  /**
   * Set HTTP method to OPTIONS
   */
  options(url: string): this {
    this.state.method = 'OPTIONS';
    this.state.url = url;
    return this;
  }

  /**
   * Set custom HTTP method and URL
   */
  method(method: HttpMethod, url: string): this {
    this.state.method = method;
    this.state.url = url;
    return this;
  }

  // ===========================================================================
  // PATH PARAMETERS
  // ===========================================================================

  /**
   * Set a single path parameter
   *
   * @example
   * ```typescript
   * builder.get('/users/:userId/posts/:postId')
   *   .pathParam('userId', '123')
   *   .pathParam('postId', '456')
   * ```
   */
  pathParam(key: string, value: string | number): this {
    this.state.pathParams[key] = value;
    return this;
  }

  /**
   * Set multiple path parameters at once
   *
   * @example
   * ```typescript
   * builder.get('/users/:userId/posts/:postId')
   *   .pathParams({ userId: '123', postId: '456' })
   * ```
   */
  pathParams(params: Record<string, string | number>): this {
    this.state.pathParams = { ...this.state.pathParams, ...params };
    return this;
  }

  // ===========================================================================
  // QUERY PARAMETERS
  // ===========================================================================

  /**
   * Set a single query parameter
   *
   * @example
   * ```typescript
   * builder.get('/users')
   *   .queryParam('page', 1)
   *   .queryParam('limit', 20)
   * ```
   */
  queryParam(key: string, value: QueryParamValue): this {
    this.state.queryParams[key] = value;
    return this;
  }

  /**
   * Set multiple query parameters at once
   *
   * @example
   * ```typescript
   * builder.get('/users')
   *   .query({ page: 1, limit: 20, status: 'active' })
   * ```
   */
  query(params: QueryParams): this {
    this.state.queryParams = { ...this.state.queryParams, ...params };
    return this;
  }

  /**
   * Configure query string serialization options
   *
   * @example
   * ```typescript
   * builder.get('/search')
   *   .queryOptions({ arrayFormat: 'comma' })
   *   .query({ tags: ['a', 'b', 'c'] })
   *   // Results in: /search?tags=a,b,c
   * ```
   */
  queryOptions(options: Partial<QuerySerializationOptions>): this {
    this.serializationOptions = { ...this.serializationOptions, ...options };
    return this;
  }

  // ===========================================================================
  // REQUEST BODY
  // ===========================================================================

  /**
   * Set JSON request body
   *
   * @example
   * ```typescript
   * builder.post('/users')
   *   .json({ name: 'John', email: 'john@example.com' })
   * ```
   */
  json(data: TBody): this {
    this.state.body = data;
    this.state.contentType = 'application/json';
    this.state.isFormData = false;
    return this;
  }

  /**
   * Set raw body with custom content type
   */
  body(data: TBody, contentType?: ContentType): this {
    this.state.body = data;
    if (contentType) {
      this.state.contentType = contentType;
    }
    this.state.isFormData = false;
    return this;
  }

  /**
   * Set text body
   *
   * @remarks
   * Text body is stored as the generic TBody type. When using text(),
   * ensure TBody is compatible with string or use RequestBuilder<Response, string>.
   */
  text(data: string): RequestBuilder<TResponse, string> {
    const builder = this as unknown as RequestBuilder<TResponse, string>;
    builder.state.body = data;
    builder.state.contentType = 'text/plain';
    builder.state.isFormData = false;
    return builder;
  }

  /**
   * Initialize multipart form data mode
   *
   * @example
   * ```typescript
   * builder.post('/upload')
   *   .formData()
   *   .field('title', 'My File')
   *   .file('document', fileBlob)
   * ```
   */
  formData(): this {
    this.state.formData = new FormData();
    this.state.contentType = 'multipart/form-data';
    this.state.isFormData = true;
    return this;
  }

  /**
   * Add a field to form data
   */
  field(name: string, value: string | Blob): this {
    if (!this.state.formData) {
      this.formData();
    }
    this.state.formData!.append(name, value);
    return this;
  }

  /**
   * Add a file to form data
   *
   * @example
   * ```typescript
   * builder.post('/upload')
   *   .formData()
   *   .file('avatar', imageFile, 'profile.jpg')
   * ```
   */
  file(name: string, file: Blob, filename?: string): this {
    if (!this.state.formData) {
      this.formData();
    }
    if (filename) {
      this.state.formData!.append(name, file, filename);
    } else {
      this.state.formData!.append(name, file);
    }
    return this;
  }

  /**
   * Add multiple files to form data
   *
   * @example
   * ```typescript
   * builder.post('/upload')
   *   .formData()
   *   .files('attachments', fileList)
   * ```
   */
  files(name: string, files: File[] | FileList): this {
    if (!this.state.formData) {
      this.formData();
    }
    const fileArray = Array.from(files);
    for (const file of fileArray) {
      this.state.formData!.append(name, file, file.name);
    }
    return this;
  }

  /**
   * Set URL-encoded form body
   *
   * @remarks
   * URL-encoded data is stored as a Record<string, string>. This method
   * returns a builder typed with the appropriate body type.
   *
   * @example
   * ```typescript
   * builder.post('/form')
   *   .urlEncoded({ username: 'john', password: 'secret' })
   * ```
   */
  urlEncoded(data: Record<string, string>): RequestBuilder<TResponse, Record<string, string>> {
    const builder = this as unknown as RequestBuilder<TResponse, Record<string, string>>;
    builder.state.body = data;
    builder.state.contentType = 'application/x-www-form-urlencoded';
    builder.state.isFormData = false;
    return builder;
  }

  // ===========================================================================
  // HEADERS
  // ===========================================================================

  /**
   * Set a single header
   *
   * @example
   * ```typescript
   * builder.get('/api')
   *   .header('X-Custom-Header', 'value')
   *   .header('Accept-Language', 'en-US')
   * ```
   */
  header(key: string, value: string): this {
    this.state.headers[key] = value;
    return this;
  }

  /**
   * Set multiple headers at once
   *
   * @example
   * ```typescript
   * builder.get('/api')
   *   .headers({
   *     'X-Custom-Header': 'value',
   *     'Accept-Language': 'en-US',
   *   })
   * ```
   */
  headers(headers: RequestHeaders): this {
    this.state.headers = { ...this.state.headers, ...headers };
    return this;
  }

  /**
   * Set Accept header
   */
  accept(mimeType: string): this {
    this.state.headers['Accept'] = mimeType;
    return this;
  }

  /**
   * Set Content-Type header
   */
  contentType(type: ContentType): this {
    this.state.contentType = type;
    this.state.headers['Content-Type'] = type;
    return this;
  }

  /**
   * Set Authorization header with Bearer token
   *
   * @example
   * ```typescript
   * builder.get('/api')
   *   .bearer('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')
   * ```
   */
  bearer(token: string): this {
    this.state.headers['Authorization'] = `Bearer ${token}`;
    return this;
  }

  /**
   * Set Authorization header with Basic auth
   *
   * @example
   * ```typescript
   * builder.get('/api')
   *   .basicAuth('username', 'password')
   * ```
   */
  basicAuth(username: string, password: string): this {
    const credentials = btoa(`${username}:${password}`);
    this.state.headers['Authorization'] = `Basic ${credentials}`;
    return this;
  }

  /**
   * Set API key header
   *
   * @example
   * ```typescript
   * builder.get('/api')
   *   .apiKey('X-API-Key', 'your-api-key')
   * ```
   */
  apiKey(headerName: string, key: string): this {
    this.state.headers[headerName] = key;
    return this;
  }

  // ===========================================================================
  // RESPONSE CONFIGURATION
  // ===========================================================================

  /**
   * Set expected response type
   *
   * @example
   * ```typescript
   * builder.get('/file')
   *   .responseAs('blob')
   * ```
   */
  responseAs(type: ResponseType): this {
    this.state.responseType = type;
    return this;
  }

  /**
   * Expect JSON response (default)
   */
  expectJson(): this {
    this.state.responseType = 'json';
    return this;
  }

  /**
   * Expect text response
   */
  expectText(): this {
    this.state.responseType = 'text';
    return this;
  }

  /**
   * Expect blob response
   */
  expectBlob(): this {
    this.state.responseType = 'blob';
    return this;
  }

  /**
   * Expect array buffer response
   */
  expectArrayBuffer(): this {
    this.state.responseType = 'arraybuffer';
    return this;
  }

  /**
   * Expect streaming response
   */
  expectStream(): this {
    this.state.responseType = 'stream';
    return this;
  }

  // ===========================================================================
  // TIMEOUT & CANCELLATION
  // ===========================================================================

  /**
   * Set request timeout in milliseconds
   *
   * @example
   * ```typescript
   * builder.get('/slow-endpoint')
   *   .timeout(60000) // 60 seconds
   * ```
   */
  timeout(ms: number): this {
    this.state.timeout = ms;
    return this;
  }

  /**
   * Use short timeout (10s)
   */
  shortTimeout(): this {
    this.state.timeout = API_CONFIG.TIMEOUT.SHORT;
    return this;
  }

  /**
   * Use long timeout (2min)
   */
  longTimeout(): this {
    this.state.timeout = API_CONFIG.TIMEOUT.LONG;
    return this;
  }

  /**
   * Set AbortController signal for cancellation
   *
   * @example
   * ```typescript
   * const controller = new AbortController();
   * builder.get('/api')
   *   .signal(controller.signal)
   *
   * // Later: controller.abort()
   * ```
   */
  signal(signal: AbortSignal): this {
    this.state.signal = signal;
    return this;
  }

  /**
   * Create and return a new AbortController, attaching its signal
   *
   * @example
   * ```typescript
   * const controller = builder.get('/api')
   *   .abortable()
   *   .build();
   * // Later: builder.getAbortController()?.abort()
   * ```
   */
  abortable(): this & { getAbortController: () => AbortController } {
    const controller = new AbortController();
    this.state.signal = controller.signal;
    (this as this & { getAbortController: () => AbortController }).getAbortController = () => controller;
    return this as this & { getAbortController: () => AbortController };
  }

  // ===========================================================================
  // CREDENTIALS & CACHE
  // ===========================================================================

  /**
   * Set credentials mode
   *
   * @example
   * ```typescript
   * builder.get('/api')
   *   .credentials('include') // Send cookies cross-origin
   * ```
   */
  credentials(mode: RequestCredentials): this {
    this.state.credentials = mode;
    return this;
  }

  /**
   * Include credentials (cookies)
   */
  withCredentials(): this {
    this.state.credentials = 'include';
    return this;
  }

  /**
   * Omit credentials
   */
  withoutCredentials(): this {
    this.state.credentials = 'omit';
    return this;
  }

  /**
   * Set cache mode
   *
   * @example
   * ```typescript
   * builder.get('/api')
   *   .cache('no-store') // Never cache
   * ```
   */
  cache(mode: RequestCache): this {
    this.state.cache = mode;
    return this;
  }

  /**
   * Disable caching
   */
  noCache(): this {
    this.state.cache = 'no-store';
    this.state.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    return this;
  }

  /**
   * Force fresh response (bypass cache)
   */
  forceRefresh(): this {
    this.state.cache = 'reload';
    return this;
  }

  // ===========================================================================
  // RETRY CONFIGURATION
  // ===========================================================================

  /**
   * Configure retry behavior
   *
   * @example
   * ```typescript
   * builder.get('/unreliable')
   *   .retry({
   *     maxAttempts: 5,
   *     baseDelay: 2000,
   *   })
   * ```
   */
  retry(config: Partial<RetryConfig>): this {
    this.state.retry = config;
    return this;
  }

  /**
   * Set maximum retry attempts
   */
  maxRetries(count: number): this {
    this.state.retry = { ...this.state.retry, maxAttempts: count };
    return this;
  }

  /**
   * Disable retries for this request
   */
  noRetry(): this {
    this.state.meta.skipRetry = true;
    return this;
  }

  // ===========================================================================
  // REQUEST METADATA
  // ===========================================================================

  /**
   * Set request priority
   *
   * @example
   * ```typescript
   * builder.get('/critical-data')
   *   .priority('high')
   * ```
   */
  priority(level: RequestPriority): this {
    this.state.priority = level;
    return this;
  }

  /**
   * Mark request as critical priority
   */
  critical(): this {
    this.state.priority = 'critical';
    return this;
  }

  /**
   * Mark request as background priority
   */
  background(): this {
    this.state.priority = 'background';
    return this;
  }

  /**
   * Set custom metadata
   *
   * @example
   * ```typescript
   * builder.get('/api')
   *   .meta({ feature: 'user-profile', version: 2 })
   * ```
   */
  meta(metadata: Partial<RequestMeta>): this {
    this.state.meta = { ...this.state.meta, ...metadata };
    return this;
  }

  /**
   * Set request tags for categorization
   *
   * @example
   * ```typescript
   * builder.get('/api')
   *   .tags(['analytics', 'dashboard'])
   * ```
   */
  tags(tags: string[]): this {
    this.state.meta.tags = tags;
    return this;
  }

  /**
   * Set idempotency key for safe retries
   *
   * @example
   * ```typescript
   * builder.post('/orders')
   *   .idempotencyKey('order-123-create')
   *   .json(orderData)
   * ```
   */
  idempotencyKey(key: string): this {
    this.state.meta.idempotencyKey = key;
    return this;
  }

  /**
   * Set correlation ID for distributed tracing
   */
  correlationId(id: string): this {
    this.state.meta.correlationId = id;
    return this;
  }

  /**
   * Skip authentication for this request
   */
  skipAuth(): this {
    this.state.meta.skipAuth = true;
    return this;
  }

  /**
   * Enable request deduplication
   */
  deduplicate(enabled = true): this {
    this.state.meta.deduplicate = enabled;
    return this;
  }

  /**
   * Set cache key for response caching
   */
  cacheKey(key: string): this {
    this.state.meta.cacheKey = key;
    return this;
  }

  /**
   * Set cache TTL for response caching
   */
  cacheTtl(ttl: number): this {
    this.state.meta.cacheTtl = ttl;
    return this;
  }

  // ===========================================================================
  // BUILD
  // ===========================================================================

  /**
   * Build the final request configuration
   *
   * @returns Complete RequestConfig object ready for execution
   *
   * @example
   * ```typescript
   * const config = new RequestBuilder<User>()
   *   .get('/users/:id')
   *   .pathParam('id', '123')
   *   .header('Accept-Language', 'en')
   *   .timeout(5000)
   *   .build();
   *
   * // Use with API client
   * const response = await apiClient.request<User>(config);
   * ```
   */
  build(): RequestConfig<TBody> {
    const url = this.buildUrl();

    const config: RequestConfig<TBody> = {
      method: this.state.method,
      url,
      headers: this.state.headers,
      responseType: this.state.responseType,
      priority: this.state.priority,
      meta: this.state.meta,
    };

    // Add body (FormData or regular body)
    if (this.state.isFormData && this.state.formData) {
      // FormData is a special body type that overrides the generic TBody.
      // The RequestConfig type accepts FormData as a valid body via the type union.
      // This cast is safe because RequestConfig.body accepts FormData | TBody.
      config.body = this.state.formData as TBody;
      // Don't set Content-Type for FormData - browser will set it with boundary
      if (config.headers) {
        delete config.headers['Content-Type'];
      }
    } else if (this.state.body !== undefined) {
      config.body = this.state.body;
      if (this.state.contentType) {
        config.contentType = this.state.contentType;
      }
    }

    // Add query params to config (will be serialized by client)
    if (Object.keys(this.state.queryParams).length > 0) {
      config.params = this.state.queryParams;
    }

    // Add path params for substitution
    if (Object.keys(this.state.pathParams).length > 0) {
      config.pathParams = this.state.pathParams;
    }

    // Add optional configurations
    if (this.state.timeout !== undefined) {
      config.timeout = this.state.timeout;
    }

    if (this.state.signal) {
      config.signal = this.state.signal;
    }

    if (this.state.credentials) {
      config.credentials = this.state.credentials;
    }

    if (this.state.cache) {
      config.cache = this.state.cache;
    }

    if (this.state.retry) {
      config.retry = this.state.retry;
    }

    return config;
  }

  /**
   * Build URL with path parameter substitution
   */
  private buildUrl(): string {
    let url = this.state.url;

    // Substitute path parameters
    for (const [key, value] of Object.entries(this.state.pathParams)) {
      url = url.replace(`:${key}`, encodeURIComponent(String(value)));
    }

    return url;
  }

  /**
   * Clone the builder with current state
   */
  clone(): RequestBuilder<TResponse, TBody> {
    const cloned = new RequestBuilder<TResponse, TBody>();
    cloned.state = JSON.parse(JSON.stringify(this.state));
    cloned.serializationOptions = { ...this.serializationOptions };

    // Clone FormData if present
    if (this.state.formData) {
      cloned.state.formData = new FormData();
      this.state.formData.forEach((value, key) => {
        cloned.state.formData!.append(key, value);
      });
    }

    return cloned;
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create a new request builder
 *
 * @typeParam TResponse - Expected response type
 * @typeParam TBody - Request body type
 *
 * @example
 * ```typescript
 * const config = createRequest<User>()
 *   .get('/users/123')
 *   .build();
 * ```
 */
export function createRequest<TResponse = unknown, TBody = unknown>(): RequestBuilder<
  TResponse,
  TBody
> {
  return new RequestBuilder<TResponse, TBody>();
}

/**
 * Create a GET request builder
 *
 * @example
 * ```typescript
 * const config = get<User>('/users/123')
 *   .query({ include: 'posts' })
 *   .build();
 * ```
 */
export function get<TResponse = unknown>(
  url: string
): RequestBuilder<TResponse, never> {
  return new RequestBuilder<TResponse, never>().get(url);
}

/**
 * Create a POST request builder
 *
 * @example
 * ```typescript
 * const config = post<User, CreateUserDto>('/users')
 *   .json({ name: 'John' })
 *   .build();
 * ```
 */
export function post<TResponse = unknown, TBody = unknown>(
  url: string
): RequestBuilder<TResponse, TBody> {
  return new RequestBuilder<TResponse, TBody>().post(url);
}

/**
 * Create a PUT request builder
 */
export function put<TResponse = unknown, TBody = unknown>(
  url: string
): RequestBuilder<TResponse, TBody> {
  return new RequestBuilder<TResponse, TBody>().put(url);
}

/**
 * Create a PATCH request builder
 */
export function patch<TResponse = unknown, TBody = unknown>(
  url: string
): RequestBuilder<TResponse, TBody> {
  return new RequestBuilder<TResponse, TBody>().patch(url);
}

/**
 * Create a DELETE request builder
 */
export function del<TResponse = unknown>(
  url: string
): RequestBuilder<TResponse, never> {
  return new RequestBuilder<TResponse, never>().delete(url);
}

// =============================================================================
// QUERY STRING UTILITIES
// =============================================================================

/**
 * Serialize query parameters to URL search string
 *
 * @example
 * ```typescript
 * serializeQueryParams({ page: 1, tags: ['a', 'b'] })
 * // Returns: 'page=1&tags[]=a&tags[]=b'
 *
 * serializeQueryParams({ page: 1, tags: ['a', 'b'] }, { arrayFormat: 'comma' })
 * // Returns: 'page=1&tags=a,b'
 * ```
 */
export function serializeQueryParams(
  params: QueryParams,
  options: Partial<QuerySerializationOptions> = {}
): string {
  const opts = { ...DEFAULT_SERIALIZATION_OPTIONS, ...options };
  const parts: string[] = [];

  for (const [key, value] of Object.entries(params)) {
    if (value === null && opts.skipNull) continue;
    if (value === undefined && opts.skipUndefined) continue;

    const serializedParts = serializeValue(key, value, opts);
    parts.push(...serializedParts);
  }

  return parts.join('&');
}

/**
 * Serialize a single value (handles arrays and objects)
 */
function serializeValue(
  key: string,
  value: QueryParamValue,
  options: QuerySerializationOptions
): string[] {
  // Custom serializer
  if (options.serialize) {
    const result = options.serialize(key, value);
    if (result !== null) {
      return [result];
    }
  }

  // Handle null/undefined
  if (value === null || value === undefined) {
    return [];
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return serializeArray(key, value, options);
  }

  // Handle primitives
  const encodedKey = options.encodeKeys ? encodeURIComponent(key) : key;
  const encodedValue = options.encodeValues ? encodeURIComponent(String(value)) : String(value);

  return [`${encodedKey}=${encodedValue}`];
}

/**
 * Serialize an array value based on format option
 */
function serializeArray(
  key: string,
  values: (string | number)[],
  options: QuerySerializationOptions
): string[] {
  const encodedKey = options.encodeKeys ? encodeURIComponent(key) : key;

  switch (options.arrayFormat) {
    case 'brackets':
      return values.map((v) => {
        const encodedValue = options.encodeValues ? encodeURIComponent(String(v)) : String(v);
        return `${encodedKey}[]=${encodedValue}`;
      });

    case 'indices':
      return values.map((v, i) => {
        const encodedValue = options.encodeValues ? encodeURIComponent(String(v)) : String(v);
        return `${encodedKey}[${i}]=${encodedValue}`;
      });

    case 'repeat':
      return values.map((v) => {
        const encodedValue = options.encodeValues ? encodeURIComponent(String(v)) : String(v);
        return `${encodedKey}=${encodedValue}`;
      });

    case 'comma': {
      const encodedValues = values.map((v) =>
        options.encodeValues ? encodeURIComponent(String(v)) : String(v)
      );
      return [`${encodedKey}=${encodedValues.join(',')}`];
    }

    default:
      return [];
  }
}

/**
 * Parse query string to parameters object
 *
 * @example
 * ```typescript
 * parseQueryParams('page=1&tags[]=a&tags[]=b')
 * // Returns: { page: '1', tags: ['a', 'b'] }
 * ```
 */
export function parseQueryParams(queryString: string): QueryParams {
  const params: QueryParams = {};
  const searchParams = new URLSearchParams(queryString);

  for (const [key, value] of searchParams.entries()) {
    // Handle array notation
    if (key.endsWith('[]')) {
      const arrayKey = key.slice(0, -2);
      if (!params[arrayKey]) {
        params[arrayKey] = [];
      }
      (params[arrayKey] as string[]).push(value);
    }
    // Handle indexed notation
    else if (/\[\d+\]$/.test(key)) {
      const arrayKey = key.replace(/\[\d+\]$/, '');
      if (!params[arrayKey]) {
        params[arrayKey] = [];
      }
      (params[arrayKey] as string[]).push(value);
    }
    // Handle comma-separated values (if only key exists)
    else if (value.includes(',') && !params[key]) {
      params[key] = value.split(',');
    }
    // Handle repeated keys
    else if (params[key] !== undefined) {
      if (!Array.isArray(params[key])) {
        params[key] = [params[key] as string];
      }
      (params[key] as string[]).push(value);
    }
    // Simple key-value
    else {
      params[key] = value;
    }
  }

  return params;
}

// =============================================================================
// URL UTILITIES
// =============================================================================

/**
 * Build a complete URL with path parameters and query string
 *
 * @example
 * ```typescript
 * buildUrl('/users/:id/posts', { id: '123' }, { page: 1 })
 * // Returns: '/users/123/posts?page=1'
 * ```
 */
export function buildUrl(
  path: string,
  pathParams?: Record<string, string | number>,
  queryParams?: QueryParams,
  options?: Partial<QuerySerializationOptions>
): string {
  let url = path;

  // Substitute path parameters
  if (pathParams) {
    for (const [key, value] of Object.entries(pathParams)) {
      url = url.replace(`:${key}`, encodeURIComponent(String(value)));
    }
  }

  // Add query string
  if (queryParams && Object.keys(queryParams).length > 0) {
    const queryString = serializeQueryParams(queryParams, options);
    if (queryString) {
      url = `${url}?${queryString}`;
    }
  }

  return url;
}

/**
 * Join URL segments safely
 *
 * @example
 * ```typescript
 * joinUrl('https://api.example.com/', '/v1/', 'users')
 * // Returns: 'https://api.example.com/v1/users'
 * ```
 */
export function joinUrl(...segments: string[]): string {
  return segments
    .map((segment, index) => {
      // Remove trailing slashes except for first segment
      if (index > 0) {
        segment = segment.replace(/^\/+/, '');
      }
      // Remove leading slashes except for last segment
      if (index < segments.length - 1) {
        segment = segment.replace(/\/+$/, '');
      }
      return segment;
    })
    .filter(Boolean)
    .join('/');
}
