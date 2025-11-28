/**
 * @file Mock API System
 * @description Comprehensive mock API server for development and testing with
 * request/response mocking, configurable delays, error simulation, and route matching.
 *
 * This module provides:
 * - Mock server that intercepts fetch requests
 * - Route definition with path parameter support
 * - Configurable response delays for realistic testing
 * - Error simulation with probability controls
 * - Persistent mock data storage
 * - Request logging for debugging
 * - Factory functions for common mock data patterns
 *
 * @example
 * ```typescript
 * import { MockServer, createMockServer, mockHandlers } from '@/lib/api';
 *
 * // Create mock server
 * const server = createMockServer({
 *   logging: true,
 *   defaultDelay: [100, 300],
 * });
 *
 * // Register routes
 * server.get('/users', () => ({
 *   status: 200,
 *   data: [{ id: '1', name: 'John' }],
 * }));
 *
 * server.get('/users/:id', (req) => ({
 *   status: 200,
 *   data: { id: req.pathParams.id, name: 'John' },
 * }));
 *
 * // Enable mocking
 * server.start();
 *
 * // Later: disable
 * server.stop();
 * ```
 */

import type {
  HttpMethod,
  MockHandler,
  MockRequest,
  MockResponse,
  MockRoute,
  MockServerConfig,
  QueryParams,
} from './types';
import { isDev } from '@/lib/core/config/env-helper';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Route matcher result
 */
interface RouteMatch<TRequest = unknown, TResponse = unknown> {
  route: MockRoute<TRequest, TResponse>;
  pathParams: Record<string, string>;
}

/**
 * Request log entry
 */
export interface MockRequestLog {
  timestamp: number;
  method: HttpMethod;
  url: string;
  pathParams: Record<string, string>;
  queryParams: QueryParams;
  body: unknown;
  response: MockResponse;
  duration: number;
}

/**
 * Mock data store entry
 */
interface DataStoreEntry<T = unknown> {
  data: T;
  createdAt: number;
  updatedAt: number;
}

// =============================================================================
// MOCK SERVER CLASS
// =============================================================================

/**
 * Mock API server for intercepting and handling fetch requests
 */
export class MockServer {
  private routes: MockRoute[] = [];
  private config: Required<MockServerConfig>;
  private originalFetch: typeof fetch | null = null;
  private isActive = false;
  private requestLog: MockRequestLog[] = [];
  private dataStore: Map<string, DataStoreEntry> = new Map();

  constructor(config: MockServerConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || '',
      defaultDelay: config.defaultDelay || [50, 200],
      defaultErrorRate: config.defaultErrorRate || 0,
      logging: config.logging ?? isDev(),
      notFoundHandler:
        config.notFoundHandler ||
        (() => ({
          status: 404,
          data: { error: 'Not Found', message: 'No mock handler registered for this route' },
        })),
    };
  }

  // ===========================================================================
  // ROUTE REGISTRATION
  // ===========================================================================

  /**
   * Register a GET route
   */
  get<TResponse = unknown>(
    path: string,
    handler: MockHandler<never, TResponse>,
    options?: Partial<MockRoute>
  ): this {
    return this.route('GET', path, handler, options);
  }

  /**
   * Register a POST route
   */
  post<TRequest = unknown, TResponse = unknown>(
    path: string,
    handler: MockHandler<TRequest, TResponse>,
    options?: Partial<MockRoute>
  ): this {
    return this.route('POST', path, handler, options);
  }

  /**
   * Register a PUT route
   */
  put<TRequest = unknown, TResponse = unknown>(
    path: string,
    handler: MockHandler<TRequest, TResponse>,
    options?: Partial<MockRoute>
  ): this {
    return this.route('PUT', path, handler, options);
  }

  /**
   * Register a PATCH route
   */
  patch<TRequest = unknown, TResponse = unknown>(
    path: string,
    handler: MockHandler<TRequest, TResponse>,
    options?: Partial<MockRoute>
  ): this {
    return this.route('PATCH', path, handler, options);
  }

  /**
   * Register a DELETE route
   */
  delete<TResponse = unknown>(
    path: string,
    handler: MockHandler<never, TResponse>,
    options?: Partial<MockRoute>
  ): this {
    return this.route('DELETE', path, handler, options);
  }

  /**
   * Register a route with any method
   */
  route<TRequest = unknown, TResponse = unknown>(
    method: HttpMethod,
    path: string,
    handler: MockHandler<TRequest, TResponse>,
    options: Partial<MockRoute> = {}
  ): this {
    this.routes.push({
      method,
      path,
      handler: handler as MockHandler,
      delay: options.delay,
      errorRate: options.errorRate,
    });
    return this;
  }

  /**
   * Register multiple routes at once
   */
  register(routes: MockRoute[]): this {
    this.routes.push(...routes);
    return this;
  }

  /**
   * Remove a route
   */
  removeRoute(method: HttpMethod, path: string): this {
    this.routes = this.routes.filter((r) => !(r.method === method && r.path === path));
    return this;
  }

  /**
   * Clear all routes
   */
  clearRoutes(): this {
    this.routes = [];
    return this;
  }

  // ===========================================================================
  // SERVER CONTROL
  // ===========================================================================

  /**
   * Start the mock server (intercept fetch)
   */
  start(): this {
    if (this.isActive) {
      console.warn('[MockServer] Server is already running');
      return this;
    }

    this.originalFetch = globalThis.fetch;
    globalThis.fetch = this.interceptFetch.bind(this);
    this.isActive = true;

    if (this.config.logging) {
      console.log('[MockServer] Started - intercepting fetch requests');
    }

    return this;
  }

  /**
   * Stop the mock server (restore fetch)
   */
  stop(): this {
    if (!this.isActive || !this.originalFetch) {
      console.warn('[MockServer] Server is not running');
      return this;
    }

    globalThis.fetch = this.originalFetch;
    this.originalFetch = null;
    this.isActive = false;

    if (this.config.logging) {
      console.log('[MockServer] Stopped - fetch restored');
    }

    return this;
  }

  /**
   * Check if server is active
   */
  isRunning(): boolean {
    return this.isActive;
  }

  // ===========================================================================
  // DATA STORE
  // ===========================================================================

  /**
   * Set data in the mock store
   */
  setData<T>(key: string, data: T): this {
    const now = Date.now();
    const existing = this.dataStore.get(key);

    this.dataStore.set(key, {
      data,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    });

    return this;
  }

  /**
   * Get data from the mock store
   */
  getData<T>(key: string): T | undefined {
    return this.dataStore.get(key)?.data as T | undefined;
  }

  /**
   * Delete data from the mock store
   */
  deleteData(key: string): boolean {
    return this.dataStore.delete(key);
  }

  /**
   * Clear all data from the mock store
   */
  clearData(): this {
    this.dataStore.clear();
    return this;
  }

  /**
   * Initialize data store with seed data
   */
  seedData(data: Record<string, unknown>): this {
    for (const [key, value] of Object.entries(data)) {
      this.setData(key, value);
    }
    return this;
  }

  // ===========================================================================
  // REQUEST LOG
  // ===========================================================================

  /**
   * Get request log
   */
  getRequestLog(): MockRequestLog[] {
    return [...this.requestLog];
  }

  /**
   * Clear request log
   */
  clearRequestLog(): this {
    this.requestLog = [];
    return this;
  }

  /**
   * Get last request
   */
  getLastRequest(): MockRequestLog | undefined {
    return this.requestLog[this.requestLog.length - 1];
  }

  /**
   * Get requests by method
   */
  getRequestsByMethod(method: HttpMethod): MockRequestLog[] {
    return this.requestLog.filter((r) => r.method === method);
  }

  /**
   * Get requests by path pattern
   */
  getRequestsByPath(pathPattern: string | RegExp): MockRequestLog[] {
    return this.requestLog.filter((r) => {
      if (typeof pathPattern === 'string') {
        return r.url.includes(pathPattern);
      }
      return pathPattern.test(r.url);
    });
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  /**
   * Intercept and handle fetch requests
   */
  private async interceptFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const startTime = Date.now();

    // Parse request
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = ((init?.method || 'GET') as HttpMethod).toUpperCase() as HttpMethod;

    // Check if URL should be mocked
    if (!this.shouldMock(url)) {
      return this.originalFetch!(input, init);
    }

    // Parse URL
    const parsedUrl = new URL(url, 'http://localhost');
    const path = parsedUrl.pathname;
    const queryParams = Object.fromEntries(parsedUrl.searchParams);

    // Parse body
    let body: unknown;
    if (init?.body) {
      try {
        body =
          typeof init.body === 'string'
            ? JSON.parse(init.body)
            : init.body;
      } catch {
        body = init.body;
      }
    }

    // Find matching route
    const match = this.matchRoute(method, path);

    if (!match) {
      if (this.config.logging) {
        console.warn(`[MockServer] No handler for ${method} ${path}`);
      }

      // Use 404 handler
      const notFoundResponse = await this.config.notFoundHandler({
        method,
        url,
        path,
        pathParams: {},
        queryParams,
        headers: this.parseHeaders(init?.headers),
        body,
      });

      return this.createResponse(notFoundResponse);
    }

    const { route, pathParams } = match;

    // Build mock request
    const mockRequest: MockRequest = {
      method,
      url,
      path,
      pathParams,
      queryParams,
      headers: this.parseHeaders(init?.headers),
      body,
    };

    // Check for simulated error
    const errorRate = route.errorRate ?? this.config.defaultErrorRate;
    if (errorRate > 0 && Math.random() < errorRate) {
      const errorResponse: MockResponse = {
        status: 500,
        data: { error: 'Internal Server Error', message: 'Simulated error' },
      };

      this.logRequest(mockRequest, errorResponse, startTime);
      return this.createResponse(errorResponse);
    }

    // Execute handler
    try {
      const response = await route.handler(mockRequest);

      // Apply delay
      const delay = this.calculateDelay(route.delay);
      if (delay > 0) {
        await this.sleep(delay);
      }

      // Handle timeout simulation
      if (response.timeout) {
        throw new DOMException('The operation was aborted.', 'AbortError');
      }

      // Handle network error simulation
      if (response.networkError) {
        throw new TypeError('Failed to fetch');
      }

      this.logRequest(mockRequest, response, startTime);
      return this.createResponse(response);
    } catch (error) {
      if (this.config.logging) {
        console.error(`[MockServer] Handler error for ${method} ${path}:`, error);
      }
      throw error;
    }
  }

  /**
   * Check if URL should be mocked
   */
  private shouldMock(url: string): boolean {
    if (!this.config.baseUrl) return true;
    return url.startsWith(this.config.baseUrl);
  }

  /**
   * Match a route by method and path
   */
  private matchRoute(method: HttpMethod, path: string): RouteMatch | null {
    for (const route of this.routes) {
      if (route.method !== method) continue;

      const pathParams = this.matchPath(route.path, path);
      if (pathParams !== null) {
        return { route, pathParams };
      }
    }
    return null;
  }

  /**
   * Match path pattern and extract params
   */
  private matchPath(pattern: string, path: string): Record<string, string> | null {
    const patternParts = pattern.split('/').filter(Boolean);
    const pathParts = path.split('/').filter(Boolean);

    if (patternParts.length !== pathParts.length) {
      return null;
    }

    const params: Record<string, string> = {};

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];

      if (!patternPart) continue;

      if (patternPart.startsWith(':')) {
        // Parameter match
        const paramName = patternPart.slice(1);
        if (paramName) {
          params[paramName] = decodeURIComponent(pathPart || '');
        }
      } else if (patternPart === '*') {
        // Wildcard match
        continue;
      } else if (patternPart !== pathPart) {
        // Exact match failed
        return null;
      }
    }

    return params;
  }

  /**
   * Parse request headers
   */
  private parseHeaders(headers?: HeadersInit): Record<string, string> {
    const result: Record<string, string> = {};

    if (!headers) return result;

    if (headers instanceof Headers) {
      headers.forEach((value, key) => {
        result[key] = value;
      });
    } else if (Array.isArray(headers)) {
      for (const [key, value] of headers) {
        result[key] = value;
      }
    } else {
      Object.assign(result, headers);
    }

    return result;
  }

  /**
   * Calculate delay from range
   */
  private calculateDelay(range?: [number, number]): number {
    const [min, max] = range || this.config.defaultDelay;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Create Response object from mock response
   */
  private createResponse(mockResponse: MockResponse): Response {
    const { status = 200, statusText, headers = {}, data } = mockResponse;

    const responseBody = data !== undefined ? JSON.stringify(data) : null;

    const responseHeaders = new Headers({
      'Content-Type': 'application/json',
      ...headers,
    });

    return new Response(responseBody, {
      status,
      statusText: statusText || this.getStatusText(status),
      headers: responseHeaders,
    });
  }

  /**
   * Get default status text for status code
   */
  private getStatusText(status: number): string {
    const texts: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      204: 'No Content',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
    };
    return texts[status] || 'Unknown';
  }

  /**
   * Log request to history
   */
  private logRequest(
    request: MockRequest,
    response: MockResponse,
    startTime: number
  ): void {
    const duration = Date.now() - startTime;

    const logEntry: MockRequestLog = {
      timestamp: startTime,
      method: request.method,
      url: request.url,
      pathParams: request.pathParams,
      queryParams: request.queryParams,
      body: request.body,
      response,
      duration,
    };

    this.requestLog.push(logEntry);

    if (this.config.logging) {
      console.log(
        `[MockServer] ${request.method} ${request.path} -> ${response.status} (${duration}ms)`
      );
    }
  }

  /**
   * Sleep utility
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create a new mock server instance
 *
 * @example
 * ```typescript
 * const server = createMockServer({
 *   baseUrl: 'http://localhost:3000/api',
 *   logging: true,
 *   defaultDelay: [50, 150],
 * });
 * ```
 */
export function createMockServer(config?: MockServerConfig): MockServer {
  return new MockServer(config);
}

// =============================================================================
// MOCK HANDLER FACTORIES
// =============================================================================

/**
 * Create a success response handler
 *
 * @example
 * ```typescript
 * server.get('/users', mockHandlers.success([
 *   { id: '1', name: 'John' },
 *   { id: '2', name: 'Jane' },
 * ]));
 * ```
 */
export const mockHandlers = {
  /**
   * Create success response
   */
  success: <T>(data: T, options: { status?: number; headers?: Record<string, string> } = {}) => {
    return (): MockResponse<T> => ({
      status: options.status || 200,
      data,
      headers: options.headers,
    });
  },

  /**
   * Create created response (201)
   */
  created: <T>(data: T) => {
    return (): MockResponse<T> => ({
      status: 201,
      data,
    });
  },

  /**
   * Create no content response (204)
   */
  noContent: () => {
    return (): MockResponse<void> => ({
      status: 204,
    });
  },

  /**
   * Create error response
   */
  error: (
    status: number,
    message: string,
    options: { code?: string; details?: unknown } = {}
  ) => {
    return (): MockResponse => ({
      status,
      data: {
        error: options.code || `HTTP_${status}`,
        message,
        details: options.details,
      },
    });
  },

  /**
   * Create validation error response
   */
  validationError: (errors: Array<{ field: string; message: string }>) => {
    return (): MockResponse => ({
      status: 422,
      data: {
        error: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors,
      },
    });
  },

  /**
   * Create not found response
   */
  notFound: (message = 'Resource not found') => {
    return (): MockResponse => ({
      status: 404,
      data: {
        error: 'NOT_FOUND',
        message,
      },
    });
  },

  /**
   * Create unauthorized response
   */
  unauthorized: (message = 'Unauthorized') => {
    return (): MockResponse => ({
      status: 401,
      data: {
        error: 'UNAUTHORIZED',
        message,
      },
    });
  },

  /**
   * Create forbidden response
   */
  forbidden: (message = 'Forbidden') => {
    return (): MockResponse => ({
      status: 403,
      data: {
        error: 'FORBIDDEN',
        message,
      },
    });
  },

  /**
   * Create rate limited response
   */
  rateLimited: (retryAfter = 60) => {
    return (): MockResponse => ({
      status: 429,
      data: {
        error: 'RATE_LIMITED',
        message: 'Too many requests',
        retryAfter,
      },
      headers: {
        'Retry-After': String(retryAfter),
      },
    });
  },

  /**
   * Create network error simulation
   */
  networkError: () => {
    return (): MockResponse => ({
      status: 0,
      networkError: true,
    });
  },

  /**
   * Create timeout simulation
   */
  timeout: () => {
    return (): MockResponse => ({
      status: 0,
      timeout: true,
    });
  },

  /**
   * Create delayed response
   */
  delayed: <T>(data: T, delayMs: number) => {
    return (): MockResponse<T> => ({
      status: 200,
      data,
      delay: delayMs,
    });
  },

  /**
   * Create paginated response
   */
  paginated: <T>(
    items: T[],
    meta: { page: number; pageSize: number; total: number }
  ) => {
    return (): MockResponse => ({
      status: 200,
      data: {
        items,
        pagination: {
          page: meta.page,
          pageSize: meta.pageSize,
          total: meta.total,
          totalPages: Math.ceil(meta.total / meta.pageSize),
          hasMore: meta.page * meta.pageSize < meta.total,
        },
      },
    });
  },

  /**
   * Create conditional response based on request
   */
  conditional: <TRequest = unknown, TResponse = unknown>(
    conditions: Array<{
      when: (req: MockRequest<TRequest>) => boolean;
      then: MockResponse<TResponse>;
    }>,
    defaultResponse: MockResponse<TResponse>
  ) => {
    return (req: MockRequest<TRequest>): MockResponse<TResponse> => {
      for (const condition of conditions) {
        if (condition.when(req)) {
          return condition.then;
        }
      }
      return defaultResponse;
    };
  },
};

// =============================================================================
// MOCK DATA GENERATORS
// =============================================================================

/**
 * Generate mock data utilities
 */
export const mockData = {
  /**
   * Generate a unique ID
   */
  id: (): string => {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  },

  /**
   * Generate a UUID v4
   */
  uuid: (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  },

  /**
   * Generate a random integer
   */
  int: (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /**
   * Generate a random boolean
   */
  bool: (probability = 0.5): boolean => {
    return Math.random() < probability;
  },

  /**
   * Pick a random item from array
   */
  pick: <T>(items: T[]): T => {
    const item = items[Math.floor(Math.random() * items.length)];
    if (item === undefined) {
      throw new Error('Cannot pick from empty array');
    }
    return item;
  },

  /**
   * Pick multiple random items from array
   */
  pickMany: <T>(items: T[], count: number): T[] => {
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  },

  /**
   * Generate a random date within range
   */
  date: (start: Date, end: Date): Date => {
    const startTime = start.getTime();
    const endTime = end.getTime();
    return new Date(startTime + Math.random() * (endTime - startTime));
  },

  /**
   * Generate a random email
   */
  email: (domain = 'example.com'): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let name = '';
    for (let i = 0; i < 8; i++) {
      name += chars[Math.floor(Math.random() * chars.length)];
    }
    return `${name}@${domain}`;
  },

  /**
   * Generate a random name
   */
  name: (): string => {
    const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'James', 'Emma'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Davis', 'Miller', 'Wilson'];
    return `${mockData.pick(firstNames)} ${mockData.pick(lastNames)}`;
  },

  /**
   * Generate array of items
   */
  array: <T>(generator: (index: number) => T, count: number): T[] => {
    return Array.from({ length: count }, (_, i) => generator(i));
  },

  /**
   * Generate ISO timestamp
   */
  timestamp: (): string => {
    return new Date().toISOString();
  },

  /**
   * Generate past timestamp
   */
  pastTimestamp: (daysAgo: number): string => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString();
  },
};

// =============================================================================
// CRUD HANDLER FACTORY
// =============================================================================

/**
 * Create a complete CRUD handler set for a resource
 *
 * @example
 * ```typescript
 * const { routes, data } = createCrudHandlers<User>({
 *   basePath: '/users',
 *   initialData: [
 *     { id: '1', name: 'John', email: 'john@example.com' },
 *   ],
 *   generateId: () => mockData.uuid(),
 *   validate: (user) => {
 *     if (!user.name) return { field: 'name', message: 'Name is required' };
 *     return null;
 *   },
 * });
 *
 * server.register(routes);
 * ```
 */
export function createCrudHandlers<T extends { id: string }>(config: {
  basePath: string;
  initialData?: T[];
  generateId?: () => string;
  validate?: (data: Partial<T>) => { field: string; message: string } | null;
  searchFields?: (keyof T)[];
}): {
  routes: MockRoute[];
  getData: () => T[];
  setData: (data: T[]) => void;
  findById: (id: string) => T | undefined;
} {
  const {
    basePath,
    initialData = [],
    generateId = mockData.uuid,
    validate,
    searchFields = [],
  } = config;

  let data: T[] = [...initialData];

  const routes: MockRoute[] = [
    // List
    {
      method: 'GET',
      path: basePath,
      handler: (req) => {
        let filtered = [...data];

        // Search
        const search = req.queryParams.search as string | undefined;
        if (search && searchFields.length > 0) {
          const searchLower = search.toLowerCase();
          filtered = filtered.filter((item) =>
            searchFields.some((field) => {
              const value = item[field];
              return String(value).toLowerCase().includes(searchLower);
            })
          );
        }

        // Pagination
        const page = parseInt(req.queryParams.page as string, 10) || 1;
        const pageSize = parseInt(req.queryParams.pageSize as string, 10) || 20;
        const start = (page - 1) * pageSize;
        const items = filtered.slice(start, start + pageSize);

        return {
          status: 200,
          data: {
            items,
            pagination: {
              page,
              pageSize,
              total: filtered.length,
              totalPages: Math.ceil(filtered.length / pageSize),
              hasMore: start + pageSize < filtered.length,
            },
          },
        };
      },
    },

    // Get by ID
    {
      method: 'GET',
      path: `${basePath}/:id`,
      handler: (req) => {
        const item = data.find((d) => d.id === req.pathParams.id);
        if (!item) {
          return {
            status: 404,
            data: { error: 'NOT_FOUND', message: 'Resource not found' },
          };
        }
        return { status: 200, data: item };
      },
    },

    // Create
    {
      method: 'POST',
      path: basePath,
      handler: (req) => {
        const body = req.body as Partial<T>;

        // Validate
        if (validate) {
          const error = validate(body);
          if (error) {
            return {
              status: 422,
              data: { error: 'VALIDATION_ERROR', message: 'Validation failed', errors: [error] },
            };
          }
        }

        const newItem = { ...body, id: generateId() } as T;
        data.push(newItem);

        return { status: 201, data: newItem };
      },
    },

    // Update
    {
      method: 'PATCH',
      path: `${basePath}/:id`,
      handler: (req) => {
        const index = data.findIndex((d) => d.id === req.pathParams.id);
        if (index === -1) {
          return {
            status: 404,
            data: { error: 'NOT_FOUND', message: 'Resource not found' },
          };
        }

        const body = req.body as Partial<T>;

        // Validate
        if (validate) {
          const error = validate(body);
          if (error) {
            return {
              status: 422,
              data: { error: 'VALIDATION_ERROR', message: 'Validation failed', errors: [error] },
            };
          }
        }

        const updated = { ...data[index], ...body };
        data[index] = updated as T;

        return { status: 200, data: updated };
      },
    },

    // Delete
    {
      method: 'DELETE',
      path: `${basePath}/:id`,
      handler: (req) => {
        const index = data.findIndex((d) => d.id === req.pathParams.id);
        if (index === -1) {
          return {
            status: 404,
            data: { error: 'NOT_FOUND', message: 'Resource not found' },
          };
        }

        data.splice(index, 1);
        return { status: 204 };
      },
    },
  ];

  return {
    routes,
    getData: () => [...data],
    setData: (newData: T[]) => {
      data = [...newData];
    },
    findById: (id: string) => data.find((d) => d.id === id),
  };
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/**
 * Default mock server instance
 */
export const mockServer = new MockServer();
