/**
 * @file HTTP Client (Legacy)
 * @description Centralized HTTP client with interceptors and error handling
 *
 * @deprecated This module is deprecated in favor of the more feature-rich API client
 * from `@/lib/api`. The `@/lib/api` module provides:
 * - Automatic retry with exponential backoff
 * - Request deduplication
 * - Token refresh with request queuing
 * - Configurable token provider
 * - Request/response interceptor chains
 * - Comprehensive error normalization
 *
 * Migration guide:
 * ```typescript
 * // Before (deprecated)
 * import { httpClient } from '@/lib/services';
 * const response = await httpClient.get('/users');
 *
 * // After (recommended)
 * import { apiClient } from '@/lib/api';
 * const response = await apiClient.get<User[]>('/users');
 * ```
 *
 * @see {@link @/lib/api} for the recommended API client
 */

import { getEnvConfig, TIMING } from '@/config';

/**
 * HTTP request configuration
 */
export interface HttpRequestConfig {
  /** Request URL */
  url: string;
  
  /** HTTP method */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  
  /** Request headers */
  headers?: Record<string, string>;
  
  /** Query parameters */
  params?: Record<string, string | number | boolean | undefined>;
  
  /** Request body */
  body?: unknown;
  
  /** Request timeout (ms) */
  timeout?: number;
  
  /** Abort signal */
  signal?: AbortSignal;
  
  /** Skip authentication */
  skipAuth?: boolean;
  
  /** Skip error handling */
  skipErrorHandling?: boolean;
  
  /** Response type */
  responseType?: 'json' | 'text' | 'blob' | 'arrayBuffer';
  
  /** Custom metadata */
  meta?: Record<string, unknown>;
}

/**
 * HTTP response wrapper
 */
export interface HttpResponse<T = unknown> {
  /** Response data */
  data: T;
  
  /** HTTP status code */
  status: number;
  
  /** Status text */
  statusText: string;
  
  /** Response headers */
  headers: Headers;
  
  /** Original request config */
  config: HttpRequestConfig;
}

/**
 * Error category types (compatible with ApiError from @/lib/api)
 */
export type HttpErrorCategory =
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
 * Error severity levels (compatible with ApiError from @/lib/api)
 */
export type HttpErrorSeverity = 'critical' | 'error' | 'warning' | 'info';

/**
 * Map HTTP status to error category
 */
function getHttpErrorCategory(status: number): HttpErrorCategory {
  if (status === 0) return 'network';
  if (status === 401) return 'authentication';
  if (status === 403) return 'authorization';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 422 || status === 400) return 'validation';
  if (status === 429) return 'rate_limit';
  if (status === 408) return 'timeout';
  if (status >= 500) return 'server';
  return 'unknown';
}

/**
 * Map error category to severity
 */
function getHttpErrorSeverity(category: HttpErrorCategory): HttpErrorSeverity {
  switch (category) {
    case 'authentication':
    case 'authorization':
    case 'server':
      return 'error';
    case 'validation':
    case 'conflict':
    case 'not_found':
      return 'warning';
    case 'rate_limit':
    case 'timeout':
      return 'info';
    default:
      return 'error';
  }
}

/**
 * HTTP error
 *
 * @deprecated Use error handling from `@/lib/api` instead.
 * The `ApiError` type from `@/lib/api/types` provides more detailed
 * error information including category, severity, and field-level errors.
 *
 * This class implements partial compatibility with `ApiError` for migration purposes.
 * The following properties are compatible with `ApiError`:
 * - `status` - HTTP status code
 * - `code` - Error code (e.g., 'HTTP_404')
 * - `category` - Error category for classification
 * - `severity` - Error severity level
 * - `response` - Response data (alias for `data`)
 * - `timestamp` - Error creation timestamp
 * - `retryable` - Whether the error is retryable
 *
 * @see {@link ApiError} from `@/lib/api/types` for the recommended error type
 */
export class HttpError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly data: unknown;
  readonly config: HttpRequestConfig;
  readonly isHttpError = true;

  // ApiError-compatible properties
  /** Error code compatible with ApiError */
  readonly code: string;
  /** Error category compatible with ApiError */
  readonly category: HttpErrorCategory;
  /** Error severity compatible with ApiError */
  readonly severity: HttpErrorSeverity;
  /** Response data alias (compatible with ApiError.response) */
  readonly response: unknown;
  /** Error creation timestamp (compatible with ApiError.timestamp) */
  readonly timestamp: number;
  /** Whether error is retryable (compatible with ApiError.retryable) */
  readonly retryable: boolean;

  constructor(
    message: string,
    status: number,
    statusText: string,
    data: unknown,
    config: HttpRequestConfig
  ) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.statusText = statusText;
    this.data = data;
    this.config = config;

    // ApiError-compatible properties
    this.code = `HTTP_${status}`;
    this.category = getHttpErrorCategory(status);
    this.severity = getHttpErrorSeverity(this.category);
    this.response = data;
    this.timestamp = Date.now();
    this.retryable = [408, 429, 500, 502, 503, 504].includes(status);
  }

  /**
   * Convert to a plain object compatible with ApiError structure
   *
   * @returns Object with properties matching ApiError interface
   */
  toApiError(): {
    name: string;
    status: number;
    code: string;
    message: string;
    category: HttpErrorCategory;
    severity: HttpErrorSeverity;
    response: unknown;
    timestamp: number;
    retryable: boolean;
  } {
    return {
      name: 'ApiError',
      status: this.status,
      code: this.code,
      message: this.message,
      category: this.category,
      severity: this.severity,
      response: this.response,
      timestamp: this.timestamp,
      retryable: this.retryable,
    };
  }
}

/**
 * Request interceptor
 */
export type RequestInterceptor = (
  config: HttpRequestConfig
) => HttpRequestConfig | Promise<HttpRequestConfig>;

/**
 * Response interceptor
 */
export type ResponseInterceptor<T = unknown> = (
  response: HttpResponse<T>
) => HttpResponse<T> | Promise<HttpResponse<T>>;

/**
 * Error interceptor
 */
export type ErrorInterceptor = (
  error: HttpError
) => HttpError | Promise<HttpError>;

/**
 * Error interceptor with recovery support
 *
 * This type allows error interceptors to recover from errors by retrying
 * the request and returning a successful response. The response is returned
 * as an HttpError for type compatibility with the interceptor chain, but
 * the HTTP client will extract the successful response when processing.
 *
 * @remarks
 * When an interceptor successfully recovers (e.g., retry succeeds, token refresh works),
 * it can return the HttpResponse. The type uses a discriminated approach where
 * HttpError has status >= 400 and HttpResponse has status < 400.
 */
export type RecoveryErrorInterceptor<T = unknown> = (
  error: HttpError
) => HttpError | HttpResponse<T> | Promise<HttpError | HttpResponse<T>>;

/**
 * HTTP client configuration
 */
export interface HttpClientConfig {
  /** Base URL for all requests */
  baseUrl?: string;
  
  /** Default timeout (ms) */
  timeout?: number;
  
  /** Default headers */
  headers?: Record<string, string>;
}

/**
 * HTTP client class
 *
 * @deprecated Use `ApiClient` from `@/lib/api` instead.
 * The `ApiClient` provides more features including retry logic,
 * request deduplication, and configurable token management.
 *
 * @example Migration
 * ```typescript
 * // Before
 * import { HttpClient } from '@/lib/services';
 * const client = new HttpClient({ baseUrl: 'https://api.example.com' });
 *
 * // After
 * import { createApiClient } from '@/lib/api';
 * const client = createApiClient({ baseUrl: 'https://api.example.com' });
 * ```
 */
export class HttpClient {
  private config: HttpClientConfig;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];
  
  constructor(config: HttpClientConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl ?? getEnvConfig().apiBaseUrl,
      timeout: config.timeout ?? TIMING.API.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    };
  }
  
  /**
   * Add request interceptor
   */
  addRequestInterceptor(interceptor: RequestInterceptor): () => void {
    this.requestInterceptors.push(interceptor);
    return () => {
      const index = this.requestInterceptors.indexOf(interceptor);
      if (index !== -1) {
        this.requestInterceptors.splice(index, 1);
      }
    };
  }
  
  /**
   * Add response interceptor
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
    this.responseInterceptors.push(interceptor);
    return () => {
      const index = this.responseInterceptors.indexOf(interceptor);
      if (index !== -1) {
        this.responseInterceptors.splice(index, 1);
      }
    };
  }
  
  /**
   * Add error interceptor
   */
  addErrorInterceptor(interceptor: ErrorInterceptor): () => void {
    this.errorInterceptors.push(interceptor);
    return () => {
      const index = this.errorInterceptors.indexOf(interceptor);
      if (index !== -1) {
        this.errorInterceptors.splice(index, 1);
      }
    };
  }
  
  /**
   * Execute request
   */
  async request<T = unknown>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    // Apply request interceptors
    let processedConfig = { ...config };
    for (const interceptor of this.requestInterceptors) {
      processedConfig = await interceptor(processedConfig);
    }

    const {
      url,
      method = 'GET',
      headers,
      body,
      timeout = this.config.timeout,
      signal,
      responseType = 'json',
    } = processedConfig;

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = timeout !== undefined && timeout > 0
      ? setTimeout(() => controller.abort(), timeout)
      : null;

    try {
      const fetchUrl = this.buildUrl(url, processedConfig.params);

      const response = await fetch(fetchUrl, {
        method,
        headers: {
          ...this.config.headers,
          ...headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: signal ?? controller.signal,
      });

      // Parse response
      let data: T;
      switch (responseType) {
        case 'text':
          data = (await response.text()) as unknown as T;
          break;
        case 'blob':
          data = (await response.blob()) as unknown as T;
          break;
        case 'arrayBuffer':
          data = (await response.arrayBuffer()) as unknown as T;
          break;
        default:
          data = (await response.json()) as T;
      }

      // Handle error responses
      if (!response.ok) {


        // Apply error interceptors
        let processedError = new HttpError(
          `Request failed with status ${response.status}`,
          response.status,
          response.statusText,
          data,
          processedConfig
        );
        for (const interceptor of this.errorInterceptors) {
          processedError = await interceptor(processedError);
        }

        throw processedError;
      }

      // Build response
      let httpResponse: HttpResponse<T> = {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        config: processedConfig,
      };

      // Apply response interceptors
      for (const interceptor of this.responseInterceptors) {
        httpResponse = (await interceptor(httpResponse)) as HttpResponse<T>;
      }

      return httpResponse;
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }

      // Handle network errors


      // Apply error interceptors
      let processedError = new HttpError(
        error instanceof Error ? error.message : 'Network error',
        0,
        'Network Error',
        null,
        processedConfig
      );
      for (const interceptor of this.errorInterceptors) {
        processedError = await interceptor(processedError);
      }

      throw processedError;
    } finally {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    }
  }
  
  /**
   * GET request
   */
  async get<T = unknown>(
    url: string,
    config?: Omit<HttpRequestConfig, 'url' | 'method' | 'body'>
  ): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: 'GET' });
  }
  
  /**
   * POST request
   */
  async post<T = unknown>(
    url: string,
    body?: unknown,
    config?: Omit<HttpRequestConfig, 'url' | 'method' | 'body'>
  ): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: 'POST', body });
  }
  
  /**
   * PUT request
   */
  async put<T = unknown>(
    url: string,
    body?: unknown,
    config?: Omit<HttpRequestConfig, 'url' | 'method' | 'body'>
  ): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: 'PUT', body });
  }
  
  /**
   * PATCH request
   */
  async patch<T = unknown>(
    url: string,
    body?: unknown,
    config?: Omit<HttpRequestConfig, 'url' | 'method' | 'body'>
  ): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: 'PATCH', body });
  }
  
  /**
   * DELETE request
   */
  async delete<T = unknown>(
    url: string,
    config?: Omit<HttpRequestConfig, 'url' | 'method'>
  ): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: 'DELETE' });
  }
  
  /**
   * Build URL with query parameters
   */
  private buildUrl(url: string, params?: HttpRequestConfig['params']): string {
    const baseUrl = url.startsWith('http') ? '' : this.config.baseUrl;
    const fullUrl = new URL(url, baseUrl);

    if (params !== undefined) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          fullUrl.searchParams.append(key, String(value));
        }
      });
    }

    return fullUrl.toString();
  }
}

/**
 * Default HTTP client instance
 *
 * @deprecated Use `apiClient` from `@/lib/api` instead.
 *
 * @example Migration
 * ```typescript
 * // Before (deprecated)
 * import { httpClient } from '@/lib/services';
 * const response = await httpClient.get('/users');
 *
 * // After (recommended)
 * import { apiClient } from '@/lib/api';
 * const response = await apiClient.get<User[]>('/users');
 * ```
 */
export const httpClient = new HttpClient();
