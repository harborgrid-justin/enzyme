/**
 * API Mocking Utilities for Testing
 *
 * @module @missionfabric-js/enzyme-typescript/api/mock
 * @description Type-safe API mocking for testing and development
 *
 * @example
 * ```typescript
 * import { createMockClient, mockResponse } from '@missionfabric-js/enzyme-typescript/api';
 *
 * const mock = createMockClient();
 * mock.onGet('/api/users').reply(200, [{ id: 1, name: 'John' }]);
 *
 * const response = await fetch('/api/users');
 * const users = await response.json();
 * ```
 */

import { ApiError } from './error';

/**
 * HTTP method for mocking
 */
export type MockMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | '*';

/**
 * Mock response configuration
 */
export interface MockResponseConfig {
  /** HTTP status code */
  status?: number;
  /** Response headers */
  headers?: Record<string, string>;
  /** Response delay in milliseconds */
  delay?: number;
  /** Simulate network error */
  networkError?: boolean;
  /** Simulate timeout */
  timeout?: boolean;
}

/**
 * Mock matcher function
 */
export type MockMatcher = (url: string, init?: RequestInit) => boolean;

/**
 * Mock response handler
 */
export type MockHandler = (url: string, init?: RequestInit) => MockResponse | Promise<MockResponse>;

/**
 * Mock response
 */
export interface MockResponse {
  status: number;
  statusText?: string;
  headers?: Record<string, string>;
  body?: unknown;
  delay?: number;
  networkError?: boolean;
  timeout?: boolean;
}

/**
 * Mock rule
 */
interface MockRule {
  method: MockMethod;
  matcher: MockMatcher;
  handler: MockHandler;
  times?: number;
  called: number;
}

/**
 * Request matcher options
 */
export interface RequestMatcherOptions {
  /** Match URL exactly */
  exact?: boolean;
  /** Match URL pattern (string includes or RegExp) */
  pattern?: string | RegExp;
  /** Match query parameters */
  query?: Record<string, string>;
  /** Match headers */
  headers?: Record<string, string>;
  /** Match body */
  body?: unknown;
}

/**
 * Mock client for intercepting fetch requests
 */
export class MockClient {
  private rules: MockRule[] = [];
  private originalFetch: typeof fetch;
  private enabled: boolean = false;
  private history: Array<{ url: string; init?: RequestInit; response: Response }> = [];

  constructor() {
    this.originalFetch = globalThis.fetch;
  }

  /**
   * Enable mock interceptor
   */
  enable(): void {
    if (this.enabled) return;

    this.enabled = true;
    const self = this;

    globalThis.fetch = async function (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> {
      const url = input instanceof Request ? input.url : input.toString();
      const request = input instanceof Request ? input : undefined;
      const method = (init?.method || request?.method || 'GET').toUpperCase();

      // Find matching rule
      const rule = self.findMatchingRule(url, method, init);

      if (rule) {
        rule.called++;

        // Check if rule has reached call limit
        if (rule.times !== undefined && rule.called > rule.times) {
          return self.originalFetch(input, init);
        }

        const mockResponse = await rule.handler(url, init);
        const response = self.createResponse(mockResponse);

        self.history.push({ url, init, response: response.clone() });
        return response;
      }

      // No mock found, use original fetch
      return self.originalFetch(input, init);
    };
  }

  /**
   * Disable mock interceptor
   */
  disable(): void {
    if (!this.enabled) return;

    globalThis.fetch = this.originalFetch;
    this.enabled = false;
  }

  /**
   * Reset all mocks
   */
  reset(): void {
    this.rules = [];
    this.history = [];
  }

  /**
   * Clear call history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Find matching rule
   */
  private findMatchingRule(url: string, method: string, init?: RequestInit): MockRule | undefined {
    return this.rules.find((rule) => {
      const methodMatches = rule.method === '*' || rule.method === method;
      return methodMatches && rule.matcher(url, init);
    });
  }

  /**
   * Create Response from mock response
   */
  private createResponse(mock: MockResponse): Response {
    const { status = 200, statusText, headers = {}, body, delay } = mock;

    // Simulate delay
    if (delay && delay > 0) {
      // Note: This won't actually delay in synchronous context
      // In real implementation, delay would be handled before calling createResponse
    }

    // Simulate network error
    if (mock.networkError) {
      throw new TypeError('Network request failed');
    }

    // Simulate timeout
    if (mock.timeout) {
      throw new Error('Request timeout');
    }

    const responseBody = typeof body === 'string' ? body : JSON.stringify(body);

    return new Response(responseBody, {
      status,
      statusText: statusText || this.getStatusText(status),
      headers: new Headers(headers),
    });
  }

  /**
   * Get standard status text
   */
  private getStatusText(status: number): string {
    const statusTexts: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      204: 'No Content',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      500: 'Internal Server Error',
      503: 'Service Unavailable',
    };
    return statusTexts[status] || '';
  }

  /**
   * Add mock rule
   */
  on(method: MockMethod, matcher: string | RegExp | MockMatcher): MockRuleBuilder {
    return new MockRuleBuilder(this, method, matcher);
  }

  /**
   * Mock GET request
   */
  onGet(matcher: string | RegExp | MockMatcher): MockRuleBuilder {
    return this.on('GET', matcher);
  }

  /**
   * Mock POST request
   */
  onPost(matcher: string | RegExp | MockMatcher): MockRuleBuilder {
    return this.on('POST', matcher);
  }

  /**
   * Mock PUT request
   */
  onPut(matcher: string | RegExp | MockMatcher): MockRuleBuilder {
    return this.on('PUT', matcher);
  }

  /**
   * Mock PATCH request
   */
  onPatch(matcher: string | RegExp | MockMatcher): MockRuleBuilder {
    return this.on('PATCH', matcher);
  }

  /**
   * Mock DELETE request
   */
  onDelete(matcher: string | RegExp | MockMatcher): MockRuleBuilder {
    return this.on('DELETE', matcher);
  }

  /**
   * Mock any request
   */
  onAny(matcher: string | RegExp | MockMatcher): MockRuleBuilder {
    return this.on('*', matcher);
  }

  /**
   * Add rule internally
   */
  addRule(rule: MockRule): void {
    this.rules.push(rule);
  }

  /**
   * Get call history
   */
  getHistory(): ReadonlyArray<{ url: string; init?: RequestInit; response: Response }> {
    return [...this.history];
  }

  /**
   * Get calls matching URL
   */
  getCalls(matcher: string | RegExp): Array<{ url: string; init?: RequestInit }> {
    const pattern = typeof matcher === 'string' ? new RegExp(matcher) : matcher;
    return this.history
      .filter(({ url }) => pattern.test(url))
      .map(({ url, init }) => ({ url, init }));
  }
}

/**
 * Mock rule builder
 */
export class MockRuleBuilder {
  private client: MockClient;
  private method: MockMethod;
  private matcher: MockMatcher;
  private times?: number;

  constructor(client: MockClient, method: MockMethod, matcher: string | RegExp | MockMatcher) {
    this.client = client;
    this.method = method;
    this.matcher = this.createMatcher(matcher);
  }

  /**
   * Create matcher function
   */
  private createMatcher(matcher: string | RegExp | MockMatcher): MockMatcher {
    if (typeof matcher === 'function') {
      return matcher;
    }

    if (typeof matcher === 'string') {
      return (url) => url.includes(matcher);
    }

    return (url) => matcher.test(url);
  }

  /**
   * Limit number of times this mock will be used
   */
  once(): this {
    this.times = 1;
    return this;
  }

  /**
   * Limit number of times this mock will be used
   */
  times(count: number): this {
    this.times = count;
    return this;
  }

  /**
   * Reply with response
   */
  reply(status: number, body?: unknown, config?: MockResponseConfig): void {
    const handler: MockHandler = () => ({
      status,
      body,
      ...config,
    });

    this.client.addRule({
      method: this.method,
      matcher: this.matcher,
      handler,
      times: this.times,
      called: 0,
    });
  }

  /**
   * Reply with custom handler
   */
  replyWith(handler: MockHandler): void {
    this.client.addRule({
      method: this.method,
      matcher: this.matcher,
      handler,
      times: this.times,
      called: 0,
    });
  }

  /**
   * Reply with network error
   */
  networkError(): void {
    this.reply(0, undefined, { networkError: true });
  }

  /**
   * Reply with timeout
   */
  timeout(): void {
    this.reply(0, undefined, { timeout: true });
  }

  /**
   * Reply with delay
   */
  delay(ms: number): MockDelayBuilder {
    return new MockDelayBuilder(this, ms);
  }
}

/**
 * Mock delay builder
 */
export class MockDelayBuilder {
  constructor(private builder: MockRuleBuilder, private delayMs: number) {}

  /**
   * Reply with response after delay
   */
  reply(status: number, body?: unknown, config?: MockResponseConfig): void {
    this.builder.reply(status, body, { ...config, delay: this.delayMs });
  }
}

/**
 * Create mock client
 *
 * @example
 * ```typescript
 * const mock = createMockClient();
 * mock.enable();
 *
 * mock.onGet('/api/users').reply(200, [
 *   { id: 1, name: 'John' },
 *   { id: 2, name: 'Jane' }
 * ]);
 *
 * const response = await fetch('/api/users');
 * const users = await response.json();
 *
 * mock.disable();
 * ```
 */
export function createMockClient(): MockClient {
  return new MockClient();
}

/**
 * Create mock response
 *
 * @example
 * ```typescript
 * const response = mockResponse({ id: 1, name: 'John' });
 * const errorResponse = mockResponse({ error: 'Not found' }, { status: 404 });
 * ```
 */
export function mockResponse(body: unknown, config?: MockResponseConfig): Response {
  const { status = 200, headers = {} } = config || {};
  const responseBody = typeof body === 'string' ? body : JSON.stringify(body);

  return new Response(responseBody, {
    status,
    headers: new Headers(headers),
  });
}

/**
 * Mock data generator
 */
export const mockData = {
  /**
   * Generate array of mock data
   */
  array: <T>(generator: (index: number) => T, count: number): T[] => {
    return Array.from({ length: count }, (_, i) => generator(i));
  },

  /**
   * Generate paginated mock data
   */
  paginated: <T>(
    data: T[],
    page: number,
    pageSize: number
  ): { data: T[]; meta: { page: number; pageSize: number; total: number; totalPages: number } } => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return {
      data: data.slice(start, end),
      meta: {
        page,
        pageSize,
        total: data.length,
        totalPages: Math.ceil(data.length / pageSize),
      },
    };
  },

  /**
   * Generate random user
   */
  user: (id: number): { id: number; name: string; email: string } => ({
    id,
    name: `User ${id}`,
    email: `user${id}@example.com`,
  }),

  /**
   * Generate random post
   */
  post: (id: number): { id: number; title: string; content: string } => ({
    id,
    title: `Post ${id}`,
    content: `This is the content of post ${id}`,
  }),

  /**
   * Generate error response
   */
  error: (message: string, code?: string): { error: string; code?: string } => ({
    error: message,
    ...(code && { code }),
  }),
};

/**
 * Setup common mock scenarios
 */
export const mockScenarios = {
  /**
   * Mock successful CRUD operations
   */
  crud: <T extends { id: number | string }>(
    mock: MockClient,
    endpoint: string,
    data: T[]
  ): void => {
    let items = [...data];
    let nextId = Math.max(...items.map((item) => Number(item.id))) + 1;

    // List
    mock.onGet(endpoint).replyWith(() => ({
      status: 200,
      body: items,
    }));

    // Get by ID
    mock.onGet(new RegExp(`${endpoint}/\\d+`)).replyWith((url) => {
      const id = url.split('/').pop();
      const item = items.find((i) => String(i.id) === id);
      return item ? { status: 200, body: item } : { status: 404, body: { error: 'Not found' } };
    });

    // Create
    mock.onPost(endpoint).replyWith(async (url, init) => {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      const newItem = { ...body, id: nextId++ } as T;
      items.push(newItem);
      return { status: 201, body: newItem };
    });

    // Update
    mock.onPut(new RegExp(`${endpoint}/\\d+`)).replyWith(async (url, init) => {
      const id = url.split('/').pop();
      const index = items.findIndex((i) => String(i.id) === id);

      if (index === -1) {
        return { status: 404, body: { error: 'Not found' } };
      }

      const body = init?.body ? JSON.parse(init.body as string) : {};
      items[index] = { ...items[index], ...body };
      return { status: 200, body: items[index] };
    });

    // Delete
    mock.onDelete(new RegExp(`${endpoint}/\\d+`)).replyWith((url) => {
      const id = url.split('/').pop();
      const index = items.findIndex((i) => String(i.id) === id);

      if (index === -1) {
        return { status: 404, body: { error: 'Not found' } };
      }

      items.splice(index, 1);
      return { status: 204 };
    });
  },

  /**
   * Mock authentication flow
   */
  auth: (mock: MockClient, credentials: { username: string; password: string }): void => {
    let token: string | null = null;

    // Login
    mock.onPost('/auth/login').replyWith(async (url, init) => {
      const body = init?.body ? JSON.parse(init.body as string) : {};

      if (body.username === credentials.username && body.password === credentials.password) {
        token = 'mock-token-' + Date.now();
        return {
          status: 200,
          body: { token, user: { id: 1, username: credentials.username } },
        };
      }

      return { status: 401, body: { error: 'Invalid credentials' } };
    });

    // Logout
    mock.onPost('/auth/logout').replyWith(() => {
      token = null;
      return { status: 200, body: { message: 'Logged out' } };
    });

    // Verify
    mock.onGet('/auth/verify').replyWith((url, init) => {
      const authHeader = init?.headers && (init.headers as Record<string, string>)['Authorization'];
      const providedToken = authHeader?.replace('Bearer ', '');

      if (providedToken === token) {
        return { status: 200, body: { valid: true } };
      }

      return { status: 401, body: { error: 'Invalid token' } };
    });
  },

  /**
   * Mock rate limiting
   */
  rateLimit: (mock: MockClient, endpoint: string, limit: number, window: number): void => {
    let requests = 0;
    let windowStart = Date.now();

    mock.onAny(endpoint).replyWith(() => {
      const now = Date.now();

      if (now - windowStart > window) {
        requests = 0;
        windowStart = now;
      }

      requests++;

      if (requests > limit) {
        return {
          status: 429,
          body: { error: 'Rate limit exceeded' },
          headers: {
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': '0',
            'Retry-After': String(Math.ceil((window - (now - windowStart)) / 1000)),
          },
        };
      }

      return {
        status: 200,
        body: { success: true },
        headers: {
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(limit - requests),
        },
      };
    });
  },
};
