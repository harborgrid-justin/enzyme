/**
 * Type-Safe HTTP Client Factory with Interceptors
 *
 * @module @missionfabric-js/enzyme-typescript/api/client
 * @description Configurable HTTP client with request/response interceptors and middleware
 *
 * @example
 * ```typescript
 * import { createClient } from '@missionfabric-js/enzyme-typescript/api';
 *
 * const client = createClient({
 *   baseURL: 'https://api.example.com',
 *   headers: { 'X-API-Key': 'secret' }
 * });
 *
 * const users = await client.get('/users').json();
 * ```
 */

import { ApiError, handleApiError, type ErrorHandlerConfig } from './error';
import { createRequest, type RequestBuilder, type RequestConfig, type HttpMethod } from './request';
import { type ApiResponse, parseResponse } from './response';
import { withRetry, type RetryConfig } from './retry';
import { ResponseCache, withCache } from './cache';

/**
 * Request interceptor
 */
export type ClientRequestInterceptor = (
  config: RequestConfig,
  url: string,
  method: HttpMethod
) => RequestConfig | Promise<RequestConfig>;

/**
 * Response interceptor
 */
export type ClientResponseInterceptor = <T>(
  response: Response,
  config: RequestConfig
) => Response | Promise<Response>;

/**
 * Error interceptor
 */
export type ClientErrorInterceptor = (error: ApiError, config: RequestConfig) => never | Promise<never>;

/**
 * Client configuration
 */
export interface ClientConfig extends RequestConfig {
  /** Base URL for all requests */
  baseURL?: string;
  /** Default headers */
  headers?: Record<string, string>;
  /** Default timeout */
  timeout?: number;
  /** Enable automatic retries */
  retry?: RetryConfig | false;
  /** Response cache */
  cache?: ResponseCache | false;
  /** Error handlers */
  errorHandlers?: ErrorHandlerConfig;
  /** Request interceptors */
  requestInterceptors?: ClientRequestInterceptor[];
  /** Response interceptors */
  responseInterceptors?: ClientResponseInterceptor[];
  /** Error interceptors */
  errorInterceptors?: ClientErrorInterceptor[];
}

/**
 * HTTP client class
 */
export class HttpClient {
  private config: ClientConfig;
  private requestInterceptors: ClientRequestInterceptor[] = [];
  private responseInterceptors: ClientResponseInterceptor[] = [];
  private errorInterceptors: ClientErrorInterceptor[] = [];

  constructor(config: ClientConfig = {}) {
    this.config = config;

    if (config.requestInterceptors) {
      this.requestInterceptors = [...config.requestInterceptors];
    }
    if (config.responseInterceptors) {
      this.responseInterceptors = [...config.responseInterceptors];
    }
    if (config.errorInterceptors) {
      this.errorInterceptors = [...config.errorInterceptors];
    }
  }

  /**
   * Add request interceptor
   */
  addRequestInterceptor(interceptor: ClientRequestInterceptor): this {
    this.requestInterceptors.push(interceptor);
    return this;
  }

  /**
   * Add response interceptor
   */
  addResponseInterceptor(interceptor: ClientResponseInterceptor): this {
    this.responseInterceptors.push(interceptor);
    return this;
  }

  /**
   * Add error interceptor
   */
  addErrorInterceptor(interceptor: ClientErrorInterceptor): this {
    this.errorInterceptors.push(interceptor);
    return this;
  }

  /**
   * Create request builder with client config
   */
  private createRequestBuilder(url: string, method: HttpMethod, config?: RequestConfig): RequestBuilder {
    const mergedConfig: RequestConfig = {
      ...this.config,
      ...config,
      headers: {
        ...this.config.headers,
        ...config?.headers,
      },
    };

    const builder = createRequest(url, mergedConfig).method(method);

    // Apply default headers
    if (mergedConfig.headers) {
      builder.headers(mergedConfig.headers);
    }

    return builder;
  }

  /**
   * Apply request interceptors
   */
  private async applyRequestInterceptors(
    config: RequestConfig,
    url: string,
    method: HttpMethod
  ): Promise<RequestConfig> {
    let currentConfig = config;

    for (const interceptor of this.requestInterceptors) {
      currentConfig = await interceptor(currentConfig, url, method);
    }

    return currentConfig;
  }

  /**
   * Apply response interceptors
   */
  private async applyResponseInterceptors(
    response: Response,
    config: RequestConfig
  ): Promise<Response> {
    let currentResponse = response;

    for (const interceptor of this.responseInterceptors) {
      currentResponse = await interceptor(currentResponse, config);
    }

    return currentResponse;
  }

  /**
   * Apply error interceptors
   */
  private async applyErrorInterceptors(error: ApiError, config: RequestConfig): Promise<never> {
    for (const interceptor of this.errorInterceptors) {
      await interceptor(error, config);
    }
    throw error;
  }

  /**
   * Execute request with client interceptors
   */
  async request<T>(
    url: string,
    method: HttpMethod,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    // Apply request interceptors
    const interceptedConfig = await this.applyRequestInterceptors(config || {}, url, method);

    // Create request builder
    const builder = this.createRequestBuilder(url, method, interceptedConfig);

    // Execute request
    const executeRequest = async (): Promise<Response> => {
      let response = await builder.send();
      response = await this.applyResponseInterceptors(response, interceptedConfig);
      return response;
    };

    try {
      // Apply retry if configured
      const response = this.config.retry
        ? await withRetry(executeRequest, this.config.retry)
        : await executeRequest();

      // Parse response
      const result = await parseResponse<T>(response);

      // Handle errors
      if (!result.success) {
        if (this.config.errorHandlers) {
          await handleApiError(result.error, this.config.errorHandlers);
        }
        await this.applyErrorInterceptors(result.error, interceptedConfig);
      }

      return result;
    } catch (error) {
      const apiError = error instanceof ApiError
        ? error
        : new ApiError('Request failed', {
            category: 'UNKNOWN' as any,
            cause: error instanceof Error ? error : undefined,
          });

      if (this.config.errorHandlers) {
        await handleApiError(apiError, this.config.errorHandlers);
      }

      await this.applyErrorInterceptors(apiError, interceptedConfig);
    }
  }

  /**
   * GET request
   */
  get(url: string, config?: RequestConfig): RequestBuilder {
    return this.createRequestBuilder(url, 'GET', config);
  }

  /**
   * POST request
   */
  post(url: string, config?: RequestConfig): RequestBuilder {
    return this.createRequestBuilder(url, 'POST', config);
  }

  /**
   * PUT request
   */
  put(url: string, config?: RequestConfig): RequestBuilder {
    return this.createRequestBuilder(url, 'PUT', config);
  }

  /**
   * PATCH request
   */
  patch(url: string, config?: RequestConfig): RequestBuilder {
    return this.createRequestBuilder(url, 'PATCH', config);
  }

  /**
   * DELETE request
   */
  delete(url: string, config?: RequestConfig): RequestBuilder {
    return this.createRequestBuilder(url, 'DELETE', config);
  }

  /**
   * HEAD request
   */
  head(url: string, config?: RequestConfig): RequestBuilder {
    return this.createRequestBuilder(url, 'HEAD', config);
  }

  /**
   * OPTIONS request
   */
  options(url: string, config?: RequestConfig): RequestBuilder {
    return this.createRequestBuilder(url, 'OPTIONS', config);
  }

  /**
   * Execute request with cache
   */
  async cached<T>(
    key: string,
    url: string,
    method: HttpMethod = 'GET',
    options?: { config?: RequestConfig; ttl?: number; tags?: string[] }
  ): Promise<T> {
    if (!this.config.cache) {
      throw new Error('Cache not configured');
    }

    return withCache(
      key,
      async () => {
        const result = await this.request<T>(url, method, options?.config);
        if (!result.success) {
          throw result.error;
        }
        return result.data;
      },
      this.config.cache,
      { ttl: options?.ttl, tags: options?.tags }
    );
  }

  /**
   * Clone client with additional configuration
   */
  extend(config: ClientConfig): HttpClient {
    return new HttpClient({
      ...this.config,
      ...config,
      headers: {
        ...this.config.headers,
        ...config.headers,
      },
      requestInterceptors: [
        ...this.requestInterceptors,
        ...(config.requestInterceptors || []),
      ],
      responseInterceptors: [
        ...this.responseInterceptors,
        ...(config.responseInterceptors || []),
      ],
      errorInterceptors: [
        ...this.errorInterceptors,
        ...(config.errorInterceptors || []),
      ],
    });
  }

  /**
   * Get client configuration
   */
  getConfig(): Readonly<ClientConfig> {
    return { ...this.config };
  }
}

/**
 * Create HTTP client
 *
 * @example
 * ```typescript
 * const client = createClient({
 *   baseURL: 'https://api.example.com',
 *   timeout: 5000,
 *   headers: {
 *     'X-API-Key': 'secret'
 *   },
 *   retry: {
 *     maxAttempts: 3,
 *     backoff: 'exponential'
 *   }
 * });
 *
 * const users = await client.get('/users').json();
 * ```
 */
export function createClient(config?: ClientConfig): HttpClient {
  return new HttpClient(config);
}

/**
 * Common client interceptors
 */
export const clientInterceptors = {
  /**
   * Add authentication token
   */
  auth: (getToken: () => string | Promise<string>): ClientRequestInterceptor => {
    return async (config) => {
      const token = await getToken();
      const headers = new Headers(config.headers);
      headers.set('Authorization', `Bearer ${token}`);
      return { ...config, headers };
    };
  },

  /**
   * Add API key header
   */
  apiKey: (key: string, headerName: string = 'X-API-Key'): ClientRequestInterceptor => {
    return (config) => {
      const headers = new Headers(config.headers);
      headers.set(headerName, key);
      return { ...config, headers };
    };
  },

  /**
   * Add user agent
   */
  userAgent: (userAgent: string): ClientRequestInterceptor => {
    return (config) => {
      const headers = new Headers(config.headers);
      headers.set('User-Agent', userAgent);
      return { ...config, headers };
    };
  },

  /**
   * Log requests
   */
  logger: (options?: {
    logRequest?: boolean;
    logResponse?: boolean;
    logger?: typeof console.log;
  }): {
    request: ClientRequestInterceptor;
    response: ClientResponseInterceptor;
  } => {
    const { logRequest = true, logResponse = true, logger = console.log } = options || {};

    return {
      request: (config, url, method) => {
        if (logRequest) {
          logger(`→ ${method} ${url}`, config);
        }
        return config;
      },
      response: async (response, config) => {
        if (logResponse) {
          logger(`← ${response.status} ${response.url}`);
        }
        return response;
      },
    };
  },

  /**
   * Add timestamp to requests
   */
  timestamp: (headerName: string = 'X-Request-Time'): ClientRequestInterceptor => {
    return (config) => {
      const headers = new Headers(config.headers);
      headers.set(headerName, new Date().toISOString());
      return { ...config, headers };
    };
  },

  /**
   * Transform request
   */
  transform: (transformer: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>): ClientRequestInterceptor => {
    return async (config) => transformer(config);
  },

  /**
   * Retry on specific errors
   */
  retryOn: (predicate: (error: ApiError) => boolean): ClientErrorInterceptor => {
    return (error) => {
      if (predicate(error)) {
        throw error; // Will be caught by retry logic
      }
      throw error;
    };
  },
};

/**
 * Create REST API client with common methods
 *
 * @example
 * ```typescript
 * const api = createRestClient('https://api.example.com');
 *
 * const users = await api.list<User>('/users');
 * const user = await api.get<User>('/users/123');
 * const newUser = await api.create<User>('/users', { name: 'John' });
 * const updated = await api.update<User>('/users/123', { name: 'Jane' });
 * await api.delete('/users/123');
 * ```
 */
export function createRestClient(baseURL: string, config?: Omit<ClientConfig, 'baseURL'>) {
  const client = createClient({ ...config, baseURL });

  return {
    /**
     * GET list of resources
     */
    async list<T>(url: string, config?: RequestConfig): Promise<T[]> {
      return client.get(url, config).json<T[]>();
    },

    /**
     * GET single resource
     */
    async get<T>(url: string, config?: RequestConfig): Promise<T> {
      return client.get(url, config).json<T>();
    },

    /**
     * POST create resource
     */
    async create<T>(url: string, data: unknown, config?: RequestConfig): Promise<T> {
      return client.post(url, config).json(data).json<T>();
    },

    /**
     * PUT update resource
     */
    async update<T>(url: string, data: unknown, config?: RequestConfig): Promise<T> {
      return client.put(url, config).json(data).json<T>();
    },

    /**
     * PATCH partial update resource
     */
    async patch<T>(url: string, data: unknown, config?: RequestConfig): Promise<T> {
      return client.patch(url, config).json(data).json<T>();
    },

    /**
     * DELETE resource
     */
    async delete<T = void>(url: string, config?: RequestConfig): Promise<T> {
      const response = await client.delete(url, config).send();
      if (response.status === 204) {
        return undefined as T;
      }
      return response.json();
    },

    /**
     * Access underlying client
     */
    client,
  };
}

/**
 * Create GraphQL client
 *
 * @example
 * ```typescript
 * const gql = createGraphQLClient('https://api.example.com/graphql');
 *
 * const result = await gql.query<User[]>(`
 *   query {
 *     users {
 *       id
 *       name
 *       email
 *     }
 *   }
 * `);
 * ```
 */
export function createGraphQLClient(endpoint: string, config?: ClientConfig) {
  const client = createClient({ ...config, baseURL: endpoint });

  return {
    /**
     * Execute GraphQL query
     */
    async query<T>(
      query: string,
      variables?: Record<string, unknown>,
      options?: RequestConfig
    ): Promise<T> {
      const response = await client
        .post('', options)
        .json({ query, variables })
        .json<{ data: T; errors?: unknown[] }>();

      if (response.errors) {
        throw new ApiError('GraphQL query failed', {
          category: 'CLIENT' as any,
          data: response.errors,
        });
      }

      return response.data;
    },

    /**
     * Execute GraphQL mutation
     */
    async mutate<T>(
      mutation: string,
      variables?: Record<string, unknown>,
      options?: RequestConfig
    ): Promise<T> {
      return this.query<T>(mutation, variables, options);
    },

    /**
     * Access underlying client
     */
    client,
  };
}
