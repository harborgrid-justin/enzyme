/**
 * API Gateway
 *
 * Enterprise-grade API gateway pattern implementation.
 * Provides a unified interface for API communication with
 * middleware support, request/response interception, and routing.
 *
 * @module api/advanced/api-gateway
 */

// =============================================================================
// Types
// =============================================================================

/**
 * HTTP methods supported by the gateway.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * Request configuration for the gateway.
 */
export interface GatewayRequest<TBody = unknown> {
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
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Whether to skip authentication */
  skipAuth?: boolean;
  /** API version to use */
  apiVersion?: string;
  /** Retry configuration */
  retry?: RetryConfig;
  /** Cache configuration */
  cache?: CacheConfig;
  /** Request metadata for middleware */
  metadata?: Record<string, unknown>;
  /** Abort signal for request cancellation */
  signal?: AbortSignal;
}

/**
 * Response from the gateway.
 */
export interface GatewayResponse<TData = unknown> {
  /** Response data */
  data: TData;
  /** HTTP status code */
  status: number;
  /** Status text */
  statusText: string;
  /** Response headers */
  headers: Record<string, string>;
  /** Request duration in milliseconds */
  duration: number;
  /** Whether response was from cache */
  fromCache?: boolean;
  /** Request metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Gateway error structure.
 */
export interface GatewayError extends Error {
  /** Error code */
  code: string;
  /** HTTP status code */
  status?: number;
  /** Original response */
  response?: GatewayResponse;
  /** Whether error is retryable */
  retryable: boolean;
  /** Request that caused the error */
  request?: GatewayRequest;
}

/**
 * Retry configuration.
 */
export interface RetryConfig {
  /** Maximum number of retries */
  maxRetries: number;
  /** Initial delay in milliseconds */
  initialDelay?: number;
  /** Maximum delay in milliseconds */
  maxDelay?: number;
  /** Backoff multiplier */
  backoffMultiplier?: number;
  /** Status codes to retry on */
  retryStatusCodes?: number[];
  /** Custom retry condition */
  shouldRetry?: (error: GatewayError, attempt: number) => boolean;
}

/**
 * Cache configuration.
 */
export interface CacheConfig {
  /** Cache key (auto-generated if not provided) */
  key?: string;
  /** Time-to-live in milliseconds */
  ttl?: number;
  /** Whether to use stale-while-revalidate */
  staleWhileRevalidate?: boolean;
  /** Cache storage type */
  storage?: 'memory' | 'session' | 'local';
}

/**
 * Middleware function type.
 */
export type GatewayMiddleware = (
  request: GatewayRequest,
  next: () => Promise<GatewayResponse>
) => Promise<GatewayResponse>;

/**
 * Request interceptor.
 */
export type RequestInterceptor = (
  request: GatewayRequest
) => GatewayRequest | Promise<GatewayRequest>;

/**
 * Response interceptor.
 */
export type ResponseInterceptor<T = unknown> = (
  response: GatewayResponse<T>,
  request: GatewayRequest
) => GatewayResponse<T> | Promise<GatewayResponse<T>>;

/**
 * Error interceptor.
 */
export type ErrorInterceptor = (
  error: GatewayError,
  request: GatewayRequest
) => GatewayError | Promise<never>;

/**
 * Gateway configuration.
 */
export interface GatewayConfig {
  /** Base URL for all requests */
  baseUrl: string;
  /** Default timeout in milliseconds */
  timeout?: number;
  /** Default headers for all requests */
  defaultHeaders?: Record<string, string>;
  /** Default API version */
  defaultApiVersion?: string;
  /** Authentication token getter */
  getAuthToken?: () => string | null | Promise<string | null>;
  /** Default retry configuration */
  defaultRetry?: RetryConfig;
  /** Request interceptors */
  requestInterceptors?: RequestInterceptor[];
  /** Response interceptors */
  responseInterceptors?: ResponseInterceptor[];
  /** Error interceptors */
  errorInterceptors?: ErrorInterceptor[];
  /** Middleware stack */
  middleware?: GatewayMiddleware[];
  /** Enable debug logging */
  debug?: boolean;
}

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryStatusCodes: [408, 429, 500, 502, 503, 504],
};

const DEFAULT_TIMEOUT = 30000;

// =============================================================================
// API Gateway Class
// =============================================================================

/**
 * API Gateway for centralized API communication.
 *
 * Provides a unified interface for making API requests with support for
 * middleware, interceptors, retries, caching, and versioning.
 *
 * @example
 * ```typescript
 * const gateway = new APIGateway({
 *   baseUrl: 'https://api.example.com',
 *   defaultApiVersion: 'v1',
 *   getAuthToken: () => localStorage.getItem('token'),
 * });
 *
 * // Add middleware
 * gateway.use(loggingMiddleware);
 * gateway.use(metricsMiddleware);
 *
 * // Make requests
 * const users = await gateway.get('/users');
 * const user = await gateway.post('/users', { name: 'John' });
 * ```
 */
export class APIGateway {
  private config: GatewayConfig;
  private middleware: GatewayMiddleware[] = [];
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];
  private cache: Map<string, { data: GatewayResponse; expiresAt: number }>;

  /**
   * Create a new API Gateway instance.
   *
   * @param config - Gateway configuration
   */
  constructor(config: GatewayConfig) {
    this.config = config;
    this.cache = new Map();

    // Initialize interceptors from config
    if (config.requestInterceptors) {
      this.requestInterceptors.push(...config.requestInterceptors);
    }
    if (config.responseInterceptors) {
      this.responseInterceptors.push(...config.responseInterceptors);
    }
    if (config.errorInterceptors) {
      this.errorInterceptors.push(...config.errorInterceptors);
    }
    if (config.middleware) {
      this.middleware.push(...config.middleware);
    }
  }

  // ===========================================================================
  // HTTP Methods
  // ===========================================================================

  /**
   * Make a GET request.
   */
  async get<T = unknown>(
    path: string,
    options?: Partial<Omit<GatewayRequest, 'path' | 'method' | 'body'>>
  ): Promise<GatewayResponse<T>> {
    return this.request<T>({ ...options, path, method: 'GET' });
  }

  /**
   * Make a POST request.
   */
  async post<T = unknown, B = unknown>(
    path: string,
    body?: B,
    options?: Partial<Omit<GatewayRequest<B>, 'path' | 'method' | 'body'>>
  ): Promise<GatewayResponse<T>> {
    return this.request<T>({ ...options, path, method: 'POST', body });
  }

  /**
   * Make a PUT request.
   */
  async put<T = unknown, B = unknown>(
    path: string,
    body?: B,
    options?: Partial<Omit<GatewayRequest<B>, 'path' | 'method' | 'body'>>
  ): Promise<GatewayResponse<T>> {
    return this.request<T>({ ...options, path, method: 'PUT', body });
  }

  /**
   * Make a PATCH request.
   */
  async patch<T = unknown, B = unknown>(
    path: string,
    body?: B,
    options?: Partial<Omit<GatewayRequest<B>, 'path' | 'method' | 'body'>>
  ): Promise<GatewayResponse<T>> {
    return this.request<T>({ ...options, path, method: 'PATCH', body });
  }

  /**
   * Make a DELETE request.
   */
  async delete<T = unknown>(
    path: string,
    options?: Partial<Omit<GatewayRequest, 'path' | 'method'>>
  ): Promise<GatewayResponse<T>> {
    return this.request<T>({ ...options, path, method: 'DELETE' });
  }

  // ===========================================================================
  // Core Request Method
  // ===========================================================================

  /**
   * Make an API request.
   */
  async request<T = unknown>(request: GatewayRequest): Promise<GatewayResponse<T>> {
    const startTime = Date.now();

    // Apply request interceptors
    let processedRequest = request;
    for (const interceptor of this.requestInterceptors) {
      processedRequest = await interceptor(processedRequest);
    }

    // Check cache for GET requests
    if (processedRequest.method === 'GET' && processedRequest.cache) {
      const cached = this.getCachedResponse<T>(processedRequest);
      if (cached) {
        return cached;
      }
    }

    try {
      // Build middleware chain
      const executeRequest = () => this.executeRequest<T>(processedRequest, startTime);
      const chain = this.buildMiddlewareChain(processedRequest, executeRequest);

      // Execute request through middleware
      let response = await chain();

      // Apply response interceptors
      for (const interceptor of this.responseInterceptors) {
        response = await interceptor(response, processedRequest);
      }

      // Cache response if configured
      if (processedRequest.method === 'GET' && processedRequest.cache) {
        this.cacheResponse(processedRequest, response);
      }

      return response as GatewayResponse<T>;
    } catch (error) {
      const gatewayError = this.normalizeError(error, processedRequest);

      // Apply error interceptors
      for (const interceptor of this.errorInterceptors) {
        await interceptor(gatewayError, processedRequest);
      }

      throw gatewayError;
    }
  }

  /**
   * Execute the actual HTTP request.
   */
  private async executeRequest<T>(
    request: GatewayRequest,
    startTime: number
  ): Promise<GatewayResponse<T>> {
    const url = this.buildUrl(request);
    const headers = await this.buildHeaders(request);
    const timeout = request.timeout ?? this.config.timeout ?? DEFAULT_TIMEOUT;

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Merge abort signals
    const signal = request.signal
      ? this.mergeAbortSignals(request.signal, controller.signal)
      : controller.signal;

    try {
      const fetchOptions: RequestInit = {
        method: request.method,
        headers,
        signal,
        body: request.body ? JSON.stringify(request.body) : undefined,
      };

      const response = await this.fetchWithRetry<T>(url, fetchOptions, request);
      const duration = Date.now() - startTime;

      return {
        ...response,
        duration,
        metadata: request.metadata,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Fetch with retry logic.
   *
   * Note: This method intentionally uses raw fetch() because:
   * 1. The API Gateway IS the low-level HTTP layer that apiClient builds upon
   * 2. This provides the foundation for retry, routing, and error handling
   * 3. Using apiClient here would create circular dependencies
   *
   * Applications should use apiClient or this gateway, not raw fetch.
   * @see {@link @/lib/api/api-client} for the high-level API client
   */
  private async fetchWithRetry<T>(
    url: string,
    options: RequestInit,
    request: GatewayRequest
  ): Promise<GatewayResponse<T>> {
    const retryConfig = request.retry ?? this.config.defaultRetry ?? DEFAULT_RETRY_CONFIG;
    let lastError: GatewayError | null = null;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        // Raw fetch is intentional - this IS the gateway implementation layer
        const response = await fetch(url, options);
        const responseHeaders = this.parseHeaders(response.headers);

        if (!response.ok) {
          const error = await this.createErrorFromResponse(response, request);

          // Check if should retry
          if (
            attempt < retryConfig.maxRetries &&
            this.shouldRetry(error, attempt, retryConfig)
          ) {
            lastError = error;
            await this.delay(this.calculateDelay(attempt, retryConfig));
            continue;
          }

          throw error;
        }

        const data = await this.parseResponse<T>(response);

        return {
          data,
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          duration: 0, // Will be set by caller
        };
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw this.createError('REQUEST_TIMEOUT', 'Request timed out', request, false);
        }

        const gatewayError = this.normalizeError(error, request);

        if (
          attempt < retryConfig.maxRetries &&
          this.shouldRetry(gatewayError, attempt, retryConfig)
        ) {
          lastError = gatewayError;
          await this.delay(this.calculateDelay(attempt, retryConfig));
          continue;
        }

        throw gatewayError;
      }
    }

    throw lastError ?? this.createError('MAX_RETRIES', 'Max retries exceeded', request, false);
  }

  // ===========================================================================
  // Middleware & Interceptors
  // ===========================================================================

  /**
   * Add middleware to the gateway.
   */
  use(middleware: GatewayMiddleware): this {
    this.middleware.push(middleware);
    return this;
  }

  /**
   * Add a request interceptor.
   */
  addRequestInterceptor(interceptor: RequestInterceptor): () => void {
    this.requestInterceptors.push(interceptor);
    return () => {
      const index = this.requestInterceptors.indexOf(interceptor);
      if (index > -1) this.requestInterceptors.splice(index, 1);
    };
  }

  /**
   * Add a response interceptor.
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
    this.responseInterceptors.push(interceptor);
    return () => {
      const index = this.responseInterceptors.indexOf(interceptor);
      if (index > -1) this.responseInterceptors.splice(index, 1);
    };
  }

  /**
   * Add an error interceptor.
   */
  addErrorInterceptor(interceptor: ErrorInterceptor): () => void {
    this.errorInterceptors.push(interceptor);
    return () => {
      const index = this.errorInterceptors.indexOf(interceptor);
      if (index > -1) this.errorInterceptors.splice(index, 1);
    };
  }

  /**
   * Build middleware chain.
   */
  private buildMiddlewareChain(
    request: GatewayRequest,
    execute: () => Promise<GatewayResponse>
  ): () => Promise<GatewayResponse> {
    const middleware = [...this.middleware];

    const chain = middleware.reduceRight<() => Promise<GatewayResponse>>(
      (next, mw) => () => mw(request, next),
      execute
    );

    return chain;
  }

  // ===========================================================================
  // URL & Header Building
  // ===========================================================================

  /**
   * Build the full request URL.
   */
  private buildUrl(request: GatewayRequest): string {
    const version = request.apiVersion ?? this.config.defaultApiVersion ?? '';
    const versionPrefix = version ? `/${version}` : '';
    const path = request.path.startsWith('/') ? request.path : `/${request.path}`;
    let url = `${this.config.baseUrl}${versionPrefix}${path}`;

    // Add query parameters
    if (request.params) {
      const searchParams = new URLSearchParams();
      Object.entries(request.params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return url;
  }

  /**
   * Build request headers.
   */
  private async buildHeaders(request: GatewayRequest): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.defaultHeaders,
      ...request.headers,
    };

    // Add authentication header
    if (!request.skipAuth && this.config.getAuthToken) {
      const token = await this.config.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  // ===========================================================================
  // Cache Management
  // ===========================================================================

  /**
   * Get cached response.
   */
  private getCachedResponse<T>(request: GatewayRequest): GatewayResponse<T> | null {
    const cacheKey = this.getCacheKey(request);
    const cached = this.cache.get(cacheKey);

    if (!cached) return null;

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      // Stale-while-revalidate
      if (request.cache?.staleWhileRevalidate) {
        // Return stale data and trigger revalidation in background
        this.revalidateCache(request);
        return { ...cached.data, fromCache: true } as GatewayResponse<T>;
      }
      this.cache.delete(cacheKey);
      return null;
    }

    return { ...cached.data, fromCache: true } as GatewayResponse<T>;
  }

  /**
   * Cache a response.
   */
  private cacheResponse(request: GatewayRequest, response: GatewayResponse): void {
    const cacheKey = this.getCacheKey(request);
    const ttl = request.cache?.ttl ?? 300000; // 5 minutes default

    this.cache.set(cacheKey, {
      data: response,
      expiresAt: Date.now() + ttl,
    });
  }

  /**
   * Revalidate cached data in background.
   */
  private async revalidateCache(request: GatewayRequest): Promise<void> {
    try {
      const response = await this.executeRequest(request, Date.now());
      this.cacheResponse(request, response);
    } catch {
      // Silent fail for background revalidation
    }
  }

  /**
   * Get cache key for a request.
   */
  private getCacheKey(request: GatewayRequest): string {
    if (request.cache?.key) return request.cache.key;

    const params = request.params
      ? JSON.stringify(Object.entries(request.params).sort())
      : '';
    return `${request.method}:${request.path}:${params}`;
  }

  /**
   * Clear the cache.
   */
  clearCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Parse response based on content type.
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      return response.json();
    }

    if (contentType.includes('text/')) {
      return response.text() as unknown as T;
    }

    return response.blob() as unknown as T;
  }

  /**
   * Parse response headers to plain object.
   */
  private parseHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Normalize errors to GatewayError.
   */
  private normalizeError(error: unknown, request: GatewayRequest): GatewayError {
    if (this.isGatewayError(error)) {
      return error;
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    return this.createError('UNKNOWN_ERROR', message, request, true);
  }

  /**
   * Create error from response.
   */
  private async createErrorFromResponse(
    response: Response,
    request: GatewayRequest
  ): Promise<GatewayError> {
    let message = response.statusText;
    let code = `HTTP_${response.status}`;

    try {
      const body = await response.json();
      message = body.message ?? body.error ?? message;
      code = body.code ?? code;
    } catch {
      // Use default message
    }

    const retryable = (request.retry?.retryStatusCodes ?? DEFAULT_RETRY_CONFIG.retryStatusCodes ?? [])
      .includes(response.status);

    return this.createError(code, message, request, retryable, response.status);
  }

  /**
   * Create a GatewayError.
   */
  private createError(
    code: string,
    message: string,
    request: GatewayRequest,
    retryable: boolean,
    status?: number
  ): GatewayError {
    const error = new Error(message) as GatewayError;
    error.code = code;
    error.status = status;
    error.retryable = retryable;
    error.request = request;
    return error;
  }

  /**
   * Check if error is a GatewayError.
   */
  private isGatewayError(error: unknown): error is GatewayError {
    return error instanceof Error && 'code' in error && 'retryable' in error;
  }

  /**
   * Check if request should be retried.
   */
  private shouldRetry(
    error: GatewayError,
    attempt: number,
    config: RetryConfig
  ): boolean {
    if (config.shouldRetry) {
      return config.shouldRetry(error, attempt);
    }

    if (!error.retryable) return false;

    if (error.status && config.retryStatusCodes) {
      return config.retryStatusCodes.includes(error.status);
    }

    return true;
  }

  /**
   * Calculate retry delay with exponential backoff.
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    const initialDelay = config.initialDelay ?? 1000;
    const maxDelay = config.maxDelay ?? 10000;
    const multiplier = config.backoffMultiplier ?? 2;

    const delay = initialDelay * Math.pow(multiplier, attempt);
    return Math.min(delay, maxDelay);
  }

  /**
   * Delay helper.
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Merge multiple abort signals.
   */
  private mergeAbortSignals(...signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();

    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort();
        break;
      }
      signal.addEventListener('abort', () => controller.abort());
    }

    return controller.signal;
  }

  /**
   * Log debug message.
   */
  private _log(_message: string, ..._args: unknown[]): void {
    if (this.config.debug) {
      console.log(`[APIGateway] ${_message}`, ..._args);
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new API Gateway instance.
 *
 * @param config - Gateway configuration
 * @returns Configured APIGateway
 */
export function createAPIGateway(config: GatewayConfig): APIGateway {
  return new APIGateway(config);
}

// =============================================================================
// Built-in Middleware
// =============================================================================

/**
 * Logging middleware for debugging.
 */
export const loggingMiddleware: GatewayMiddleware = async (request, next) => {
  const startTime = Date.now();
  console.log(`[Request] ${request.method} ${request.path}`);

  try {
    const response = await next();
    console.log(
      `[Response] ${request.method} ${request.path} - ${response.status} (${Date.now() - startTime}ms)`
    );
    return response;
  } catch (error) {
    console.error(`[Error] ${request.method} ${request.path}`, error);
    throw error;
  }
};

/**
 * Correlation ID middleware.
 */
export const correlationIdMiddleware: GatewayMiddleware = async (request, next) => {
  const correlationId = crypto.randomUUID();

  request.headers = {
    ...request.headers,
    'X-Correlation-ID': correlationId,
  };

  request.metadata = {
    ...request.metadata,
    correlationId,
  };

  return next();
};
