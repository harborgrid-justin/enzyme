/**
 * Type-Safe Request Builder with Fluent API
 *
 * @module @missionfabric-js/enzyme-typescript/api/request
 * @description Fluent API for building and executing HTTP requests
 *
 * @example
 * ```typescript
 * import { createRequest } from '@missionfabric-js/enzyme-typescript/api';
 *
 * const response = await createRequest('/api/users')
 *   .method('POST')
 *   .json({ name: 'John' })
 *   .header('Authorization', 'Bearer token')
 *   .send();
 * ```
 */

import { ApiError } from './error';
import { parseResponse, type ApiResponse, type ResponseParserOptions } from './response';

/**
 * HTTP method types
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * Request body types
 */
export type RequestBody =
  | string
  | Blob
  | ArrayBuffer
  | FormData
  | URLSearchParams
  | ReadableStream
  | Record<string, unknown>;

/**
 * Query parameters
 */
export type QueryParams = Record<string, string | number | boolean | null | undefined>;

/**
 * Request configuration
 */
export interface RequestConfig extends Omit<RequestInit, 'body' | 'method'> {
  /** Base URL for requests */
  baseURL?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Query parameters */
  params?: QueryParams;
  /** Request interceptors */
  interceptors?: RequestInterceptor[];
  /** Automatic retry configuration */
  retry?: boolean | number;
  /** Include credentials */
  credentials?: RequestCredentials;
}

/**
 * Request interceptor function
 */
export type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;

/**
 * Request builder class
 */
export class RequestBuilder {
  private url: string;
  private config: RequestConfig = {};
  private requestBody?: RequestBody;
  private requestMethod: HttpMethod = 'GET';
  private requestHeaders: Record<string, string> = {};
  private queryParams: QueryParams = {};

  constructor(url: string, config?: RequestConfig) {
    this.url = url;
    if (config) {
      this.config = { ...config };
      this.queryParams = { ...config.params };
    }
  }

  /**
   * Set HTTP method
   */
  method(method: HttpMethod): this {
    this.requestMethod = method;
    return this;
  }

  /**
   * Set request header
   */
  header(name: string, value: string): this {
    this.requestHeaders[name] = value;
    return this;
  }

  /**
   * Set multiple headers
   */
  headers(headers: Record<string, string>): this {
    Object.assign(this.requestHeaders, headers);
    return this;
  }

  /**
   * Set authorization header
   */
  auth(token: string, type: string = 'Bearer'): this {
    this.requestHeaders['Authorization'] = `${type} ${token}`;
    return this;
  }

  /**
   * Set bearer token
   */
  bearer(token: string): this {
    return this.auth(token, 'Bearer');
  }

  /**
   * Set query parameter
   */
  query(name: string, value: string | number | boolean | null | undefined): this {
    this.queryParams[name] = value;
    return this;
  }

  /**
   * Set multiple query parameters
   */
  queries(params: QueryParams): this {
    Object.assign(this.queryParams, params);
    return this;
  }

  /**
   * Set request body
   */
  body(body: RequestBody): this {
    this.requestBody = body;
    return this;
  }

  /**
   * Set JSON body
   */
  json(data: unknown): this {
    this.requestHeaders['Content-Type'] = 'application/json';
    this.requestBody = JSON.stringify(data);
    return this;
  }

  /**
   * Set form data body
   */
  form(data: Record<string, string | Blob>): this {
    const formData = new FormData();
    for (const [key, value] of Object.entries(data)) {
      formData.append(key, value);
    }
    this.requestBody = formData;
    return this;
  }

  /**
   * Set URL-encoded form body
   */
  urlEncoded(data: Record<string, string>): this {
    this.requestHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(data)) {
      params.append(key, value);
    }
    this.requestBody = params.toString();
    return this;
  }

  /**
   * Set timeout
   */
  timeout(ms: number): this {
    this.config.timeout = ms;
    return this;
  }

  /**
   * Set abort signal
   */
  signal(signal: AbortSignal): this {
    this.config.signal = signal;
    return this;
  }

  /**
   * Set credentials mode
   */
  credentials(mode: RequestCredentials): this {
    this.config.credentials = mode;
    return this;
  }

  /**
   * Set cache mode
   */
  cache(mode: RequestCache): this {
    this.config.cache = mode;
    return this;
  }

  /**
   * Set redirect mode
   */
  redirect(mode: RequestRedirect): this {
    this.config.redirect = mode;
    return this;
  }

  /**
   * Set referrer
   */
  referrer(referrer: string): this {
    this.config.referrer = referrer;
    return this;
  }

  /**
   * Set integrity
   */
  integrity(integrity: string): this {
    this.config.integrity = integrity;
    return this;
  }

  /**
   * Accept JSON responses
   */
  acceptJson(): this {
    this.requestHeaders['Accept'] = 'application/json';
    return this;
  }

  /**
   * Accept any response type
   */
  accept(contentType: string): this {
    this.requestHeaders['Accept'] = contentType;
    return this;
  }

  /**
   * Build request URL with query parameters
   */
  private buildURL(): string {
    const baseURL = this.config.baseURL || '';
    let url = this.url.startsWith('http') ? this.url : `${baseURL}${this.url}`;

    // Add query parameters
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(this.queryParams)) {
      if (value !== null && value !== undefined) {
        params.append(key, String(value));
      }
    }

    const queryString = params.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }

    return url;
  }

  /**
   * Build fetch request init
   */
  private async buildInit(): Promise<RequestInit> {
    // Apply interceptors
    let config = { ...this.config };
    if (config.interceptors) {
      for (const interceptor of config.interceptors) {
        config = await interceptor(config);
      }
    }

    // Merge headers
    const headers = new Headers(config.headers);
    for (const [key, value] of Object.entries(this.requestHeaders)) {
      headers.set(key, value);
    }

    return {
      ...config,
      method: this.requestMethod,
      headers,
      body: this.requestBody as BodyInit,
    };
  }

  /**
   * Execute request and return raw Response
   */
  async send(): Promise<Response> {
    const url = this.buildURL();
    const init = await this.buildInit();

    // Handle timeout
    if (this.config.timeout) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      try {
        const response = await fetch(url, {
          ...init,
          signal: init.signal || controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw ApiError.timeout(url, this.config.timeout);
        }
        throw error;
      }
    }

    try {
      return await fetch(url, init);
    } catch (error) {
      throw ApiError.network(url, error instanceof Error ? error : undefined);
    }
  }

  /**
   * Execute request and parse response
   */
  async execute<T>(options?: ResponseParserOptions<T>): Promise<ApiResponse<T>> {
    const startTime = Date.now();
    const response = await this.send();
    return parseResponse<T>(response, {
      ...options,
      startTime,
    });
  }

  /**
   * Execute request and return parsed data (throws on error)
   */
  async fetch<T>(options?: ResponseParserOptions<T>): Promise<T> {
    const result = await this.execute<T>(options);
    if (result.success) {
      return result.data;
    }
    throw result.error;
  }

  /**
   * Execute request and return JSON
   */
  async json<T = unknown>(): Promise<T> {
    return this.fetch<T>({ type: 'json' });
  }

  /**
   * Execute request and return text
   */
  async text(): Promise<string> {
    return this.fetch<string>({ type: 'text' });
  }

  /**
   * Execute request and return blob
   */
  async blob(): Promise<Blob> {
    return this.fetch<Blob>({ type: 'blob' });
  }

  /**
   * Execute request and return array buffer
   */
  async arrayBuffer(): Promise<ArrayBuffer> {
    return this.fetch<ArrayBuffer>({ type: 'arrayBuffer' });
  }

  /**
   * Execute request and return form data
   */
  async formData(): Promise<FormData> {
    return this.fetch<FormData>({ type: 'formData' });
  }

  /**
   * Clone request builder
   */
  clone(): RequestBuilder {
    const builder = new RequestBuilder(this.url, this.config);
    builder.requestMethod = this.requestMethod;
    builder.requestHeaders = { ...this.requestHeaders };
    builder.queryParams = { ...this.queryParams };
    builder.requestBody = this.requestBody;
    return builder;
  }
}

/**
 * Create request builder
 *
 * @example
 * ```typescript
 * const response = await createRequest('/api/users')
 *   .method('POST')
 *   .json({ name: 'John' })
 *   .execute();
 * ```
 */
export function createRequest(url: string, config?: RequestConfig): RequestBuilder {
  return new RequestBuilder(url, config);
}

/**
 * HTTP method shortcuts
 */
export const request = {
  /**
   * GET request
   */
  get: (url: string, config?: RequestConfig) => createRequest(url, config).method('GET'),

  /**
   * POST request
   */
  post: (url: string, config?: RequestConfig) => createRequest(url, config).method('POST'),

  /**
   * PUT request
   */
  put: (url: string, config?: RequestConfig) => createRequest(url, config).method('PUT'),

  /**
   * PATCH request
   */
  patch: (url: string, config?: RequestConfig) => createRequest(url, config).method('PATCH'),

  /**
   * DELETE request
   */
  delete: (url: string, config?: RequestConfig) => createRequest(url, config).method('DELETE'),

  /**
   * HEAD request
   */
  head: (url: string, config?: RequestConfig) => createRequest(url, config).method('HEAD'),

  /**
   * OPTIONS request
   */
  options: (url: string, config?: RequestConfig) => createRequest(url, config).method('OPTIONS'),
};

/**
 * Common request interceptors
 */
export const interceptors = {
  /**
   * Add bearer token to requests
   */
  bearerToken: (token: string): RequestInterceptor => {
    return (config) => {
      const headers = new Headers(config.headers);
      headers.set('Authorization', `Bearer ${token}`);
      return { ...config, headers };
    };
  },

  /**
   * Add custom header to requests
   */
  header: (name: string, value: string): RequestInterceptor => {
    return (config) => {
      const headers = new Headers(config.headers);
      headers.set(name, value);
      return { ...config, headers };
    };
  },

  /**
   * Add base URL to requests
   */
  baseURL: (baseURL: string): RequestInterceptor => {
    return (config) => ({ ...config, baseURL });
  },

  /**
   * Log requests
   */
  logger: (logger: (config: RequestConfig) => void = console.log): RequestInterceptor => {
    return (config) => {
      logger(config);
      return config;
    };
  },

  /**
   * Transform request before sending
   */
  transform: (transformer: (config: RequestConfig) => RequestConfig): RequestInterceptor => {
    return transformer;
  },
};

/**
 * Create batch request executor
 *
 * @example
 * ```typescript
 * const batch = createBatchRequest([
 *   request.get('/api/users'),
 *   request.get('/api/posts'),
 *   request.get('/api/comments')
 * ]);
 *
 * const results = await batch.executeAll();
 * ```
 */
export function createBatchRequest(requests: RequestBuilder[]) {
  return {
    /**
     * Execute all requests in parallel
     */
    async executeAll<T>(): Promise<Array<ApiResponse<T>>> {
      const promises = requests.map((req) => req.execute<T>());
      return Promise.all(promises);
    },

    /**
     * Execute all requests and wait for all to settle
     */
    async executeAllSettled<T>(): Promise<
      Array<{ status: 'fulfilled'; value: ApiResponse<T> } | { status: 'rejected'; reason: unknown }>
    > {
      const promises = requests.map((req) => req.execute<T>());
      return Promise.allSettled(promises);
    },

    /**
     * Execute requests sequentially
     */
    async executeSequential<T>(): Promise<Array<ApiResponse<T>>> {
      const results: Array<ApiResponse<T>> = [];
      for (const req of requests) {
        results.push(await req.execute<T>());
      }
      return results;
    },

    /**
     * Execute with concurrency limit
     */
    async executeWithLimit<T>(limit: number): Promise<Array<ApiResponse<T>>> {
      const results: Array<ApiResponse<T>> = [];
      const executing: Promise<void>[] = [];

      for (const req of requests) {
        const promise = req.execute<T>().then((result) => {
          results.push(result);
        });

        executing.push(promise);

        if (executing.length >= limit) {
          await Promise.race(executing);
          executing.splice(
            executing.findIndex((p) => p === promise),
            1
          );
        }
      }

      await Promise.all(executing);
      return results;
    },
  };
}

/**
 * Create request with defaults
 *
 * @example
 * ```typescript
 * const apiRequest = createRequestFactory({
 *   baseURL: 'https://api.example.com',
 *   headers: { 'X-API-Key': 'secret' }
 * });
 *
 * const users = await apiRequest('/users').json();
 * ```
 */
export function createRequestFactory(defaults: RequestConfig) {
  return (url: string, config?: RequestConfig): RequestBuilder => {
    return createRequest(url, { ...defaults, ...config });
  };
}
