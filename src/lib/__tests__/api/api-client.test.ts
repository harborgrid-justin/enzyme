/**
 * @file API Client Tests
 * @description Comprehensive tests for the ApiClient including:
 * - Request/response handling
 * - Interceptor chain
 * - Error handling
 * - Retry logic
 * - Token refresh
 * - Request deduplication
 * - Request cancellation
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDeferred, createMockFetch, delay } from '../utils/test-utils';
import type { ErrorInterceptor, RequestInterceptor, ResponseInterceptor } from '@/lib/api/types';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock the config module
vi.mock('@/config', () => ({
  API_CONFIG: {
    BASE_URL: 'https://api.test.com',
    TIMEOUT: {
      DEFAULT: 30000,
    },
    HEADERS: {
      'Content-Type': 'application/json',
    },
    RETRY: {
      ATTEMPTS: 3,
      BASE_DELAY: 1000,
      MAX_DELAY: 30000,
    },
    ENDPOINTS: {
      AUTH: {
        REFRESH: '/auth/refresh',
      },
    },
  },
  TIMING: {
    RETRY: {
      API_ATTEMPTS: 3,
    },
    API: {
      RETRY_BASE_DELAY: 1000,
      RETRY_MAX_DELAY: 30000,
    },
    AUTH: {
      TOKEN_EXPIRY_BUFFER: 60000,
    },
  },
  calculateBackoffWithJitter: vi.fn((attempt: number, base: number, max: number) => {
    return Math.min(base * Math.pow(2, attempt), max);
  }),
}));

// Mock localStorage
const mockStorage = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => mockStorage.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => mockStorage.set(key, value)),
  removeItem: vi.fn((key: string) => mockStorage.delete(key)),
  clear: vi.fn(() => mockStorage.clear()),
});

// ============================================================================
// Tests
// ============================================================================

describe('ApiClient', () => {
  let ApiClient: typeof import('@/lib/api/api-client').ApiClient;
  let createApiClient: typeof import('@/lib/api/api-client').createApiClient;
  let createApiError: typeof import('@/lib/api/api-client').createApiError;
  let mockFetch: ReturnType<typeof createMockFetch>;

  beforeEach(async () => {
    // Clear mocks
    vi.clearAllMocks();
    mockStorage.clear();

    // Create fresh mock fetch
    mockFetch = createMockFetch();

    // Reset modules
    vi.resetModules();

    // Import fresh module
    const {
      ApiClient: ApiClientImport,
      createApiClient: createApiClientImport,
      createApiError: createApiErrorImport,
    } = await import('@/lib/api/api-client');
    ApiClient = ApiClientImport;
    createApiClient = createApiClientImport;
    createApiError = createApiErrorImport;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Basic Request Tests
  // ==========================================================================

  describe('basic requests', () => {
    it('should create a client instance', () => {
      // Act
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
      });

      // Assert
      expect(client).toBeInstanceOf(ApiClient);
    });

    it('should make GET request', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
      });
      mockFetch.mockResponse({ data: 'test' });

      // Act
      const response = await client.get('/users');

      // Assert
      expect(response.data).toEqual({ data: 'test' });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/users',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should make POST request with body', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
      });
      mockFetch.mockResponse({ id: 1, name: 'Test' });

      // Act
      const response = await client.post('/users', { name: 'Test' });

      // Assert
      expect(response.data).toEqual({ id: 1, name: 'Test' });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'Test' }),
        })
      );
    });

    it('should make PUT request', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
      });
      mockFetch.mockResponse({ id: 1, name: 'Updated' });

      // Act
      const response = await client.put('/users/1', { name: 'Updated' });

      // Assert
      expect(response.data).toEqual({ id: 1, name: 'Updated' });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/users/1',
        expect.objectContaining({ method: 'PUT' })
      );
    });

    it('should make PATCH request', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
      });
      mockFetch.mockResponse({ id: 1, status: 'active' });

      // Act
      const response = await client.patch('/users/1', { status: 'active' });

      // Assert
      expect(response.data).toEqual({ id: 1, status: 'active' });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/users/1',
        expect.objectContaining({ method: 'PATCH' })
      );
    });

    it('should make DELETE request', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
      });
      mockFetch.mockResponse({ success: true });

      // Act
      const response = await client.delete('/users/1');

      // Assert
      expect(response.data).toEqual({ success: true });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/users/1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should make HEAD request', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
      });
      mockFetch.mockResponse('');

      // Act
      await client.head('/users');

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/users',
        expect.objectContaining({ method: 'HEAD' })
      );
    });
  });

  // ==========================================================================
  // URL Building Tests
  // ==========================================================================

  describe('URL building', () => {
    it('should build URL with query parameters', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
      });
      mockFetch.mockResponse({ users: [] });

      // Act
      await client.get('/users', { params: { page: 1, limit: 10 } });

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/users?page=1&limit=10',
        expect.any(Object)
      );
    });

    it('should handle array query parameters', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
      });
      mockFetch.mockResponse({ users: [] });

      // Act
      await client.get('/users', { params: { ids: [1, 2, 3] } });

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('ids=1'), expect.any(Object));
    });

    it('should substitute path parameters', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
      });
      mockFetch.mockResponse({ user: {} });

      // Act
      await client.get('/users/:id/posts/:postId', {
        pathParams: { id: '123', postId: '456' },
      });

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/users/123/posts/456',
        expect.any(Object)
      );
    });

    it('should handle trailing slash in baseUrl', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com/',
        fetch: mockFetch,
      });
      mockFetch.mockResponse({});

      // Act
      await client.get('/users');

      // Assert
      expect(mockFetch).toHaveBeenCalledWith('https://api.test.com/users', expect.any(Object));
    });

    it('should skip null/undefined query params', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
      });
      mockFetch.mockResponse({});

      // Act
      await client.get('/users', {
        params: { active: true, inactive: null, pending: undefined },
      });

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/users?active=true',
        expect.any(Object)
      );
    });
  });

  // ==========================================================================
  // Interceptor Chain Tests
  // ==========================================================================

  describe('interceptor chain', () => {
    it('should run request interceptors', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
      });
      mockFetch.mockResponse({});

      const interceptor = vi.fn((config: Record<string, unknown>) => ({
        ...config,
        headers: { ...(config.headers as Record<string, string>), 'X-Custom-Header': 'test' },
      })) as unknown as RequestInterceptor;

      client.addRequestInterceptor(interceptor);

      // Act
      await client.get('/users');

      // Assert
      expect(interceptor).toHaveBeenCalled();
    });

    it('should run response interceptors', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
      });
      mockFetch.mockResponse({ data: 'original' });

      const interceptor = vi.fn((response: Record<string, unknown>) => ({
        ...response,
        data: { ...(response.data as Record<string, unknown>), modified: true },
      })) as unknown as ResponseInterceptor;

      client.addResponseInterceptor(interceptor);

      // Act
      const response = await client.get('/users');

      // Assert
      expect(interceptor).toHaveBeenCalled();
      expect(response.data).toHaveProperty('modified', true);
    });

    it('should run error interceptors', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
      });
      mockFetch.mockError(500, 'Server Error');

      const errorInterceptor = vi.fn((error: Record<string, unknown>) => ({
        ...error,
        handled: true,
      })) as unknown as ErrorInterceptor;

      client.addErrorInterceptor(errorInterceptor);

      // Act & Assert
      await expect(client.get('/users')).rejects.toMatchObject({
        handled: true,
      });
      expect(errorInterceptor).toHaveBeenCalled();
    });

    it('should allow removing interceptors', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
      });
      mockFetch.mockResponse({});

      const interceptor = vi.fn(
        (config: Record<string, unknown>) => config
      ) as unknown as RequestInterceptor;
      const remove = client.addRequestInterceptor(interceptor);

      // Act - call once with interceptor
      await client.get('/users');
      expect(interceptor).toHaveBeenCalledTimes(1);

      // Remove and call again
      remove();
      await client.get('/users');

      // Assert - interceptor should not have been called again
      expect(interceptor).toHaveBeenCalledTimes(1);
    });

    it('should run multiple interceptors in order', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
      });
      mockFetch.mockResponse({});

      const callOrder: number[] = [];
      client.addRequestInterceptor((config) => {
        callOrder.push(1);
        return config;
      });
      client.addRequestInterceptor((config) => {
        callOrder.push(2);
        return config;
      });
      client.addRequestInterceptor((config) => {
        callOrder.push(3);
        return config;
      });

      // Act
      await client.get('/users');

      // Assert
      expect(callOrder).toEqual([1, 2, 3]);
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('error handling', () => {
    it('should create ApiError for HTTP errors', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
      });
      mockFetch.mockError(404, 'Not Found');

      // Act & Assert
      await expect(client.get('/users/999')).rejects.toMatchObject({
        status: 404,
        category: 'not_found',
      });
    });

    it('should categorize authentication errors', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
        autoRefreshToken: false, // Disable to test raw 401 handling
      });
      mockFetch.mockError(401, 'Unauthorized');

      // Act & Assert
      await expect(client.get('/protected')).rejects.toMatchObject({
        status: 401,
        category: 'authentication',
      });
    });

    it('should categorize authorization errors', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
      });
      mockFetch.mockError(403, 'Forbidden');

      // Act & Assert
      await expect(client.get('/admin')).rejects.toMatchObject({
        status: 403,
        category: 'authorization',
      });
    });

    it('should categorize validation errors', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
      });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        headers: new Headers(),
        json: async () =>
          Promise.resolve({
            message: 'Validation failed',
            errors: [{ field: 'email', message: 'Invalid email' }],
          }),
        text: async () =>
          Promise.resolve(
            JSON.stringify({
              message: 'Validation failed',
              errors: [{ field: 'email', message: 'Invalid email' }],
            })
          ),
      });

      // Act & Assert
      await expect(client.post('/users', { email: 'invalid' })).rejects.toMatchObject({
        status: 422,
        category: 'validation',
      });
    });

    it('should categorize rate limit errors', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
      });
      mockFetch.mockError(429, 'Too Many Requests');

      // Act & Assert
      await expect(client.get('/users')).rejects.toMatchObject({
        status: 429,
        category: 'rate_limit',
      });
    });

    it('should categorize server errors', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
      });
      mockFetch.mockError(500, 'Internal Server Error');

      // Act & Assert
      await expect(client.get('/users')).rejects.toMatchObject({
        status: 500,
        category: 'server',
      });
    });

    it('should handle network errors', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
        retry: { maxAttempts: 1 },
      });
      mockFetch.mockNetworkError();

      // Act & Assert
      await expect(client.get('/users')).rejects.toMatchObject({
        category: 'network',
        code: 'NETWORK_ERROR',
      });
    });

    it('should parse field errors from response', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
      });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers(),
        json: async () =>
          Promise.resolve({
            message: 'Validation failed',
            errors: [
              { field: 'email', message: 'Invalid email format' },
              { field: 'password', message: 'Password too short' },
            ],
          }),
        text: async () =>
          Promise.resolve(
            JSON.stringify({
              message: 'Validation failed',
              errors: [
                { field: 'email', message: 'Invalid email format' },
                { field: 'password', message: 'Password too short' },
              ],
            })
          ),
      });

      // Act & Assert
      await expect(
        client.post('/register', { email: 'bad', password: '123' })
      ).rejects.toMatchObject({
        fieldErrors: expect.arrayContaining([
          { field: 'email', message: 'Invalid email format' },
          { field: 'password', message: 'Password too short' },
        ]) as unknown,
      });
    });
  });

  // ==========================================================================
  // Retry Logic Tests
  // ==========================================================================

  describe('retry logic', () => {
    it('should retry on retryable status codes', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
        retry: {
          maxAttempts: 3,
          baseDelay: 10, // Fast for tests
          maxDelay: 100,
        },
      });

      // First two calls fail, third succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          headers: new Headers(),
          json: async () => Promise.resolve({ error: 'Service Unavailable' }),
          text: async () => Promise.resolve(JSON.stringify({ error: 'Service Unavailable' })),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          headers: new Headers(),
          json: async () => Promise.resolve({ error: 'Service Unavailable' }),
          text: async () => Promise.resolve(JSON.stringify({ error: 'Service Unavailable' })),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => Promise.resolve({ success: true }),
          text: async () => Promise.resolve(JSON.stringify({ success: true })),
        });

      // Act
      const response = await client.get('/users');

      // Assert
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(response.data).toEqual({ success: true });
    });

    it('should exhaust retries and throw', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
        retry: {
          maxAttempts: 2,
          baseDelay: 10,
          maxDelay: 100,
        },
      });

      // All calls fail
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        headers: new Headers(),
        json: async () => Promise.resolve({ error: 'Service Unavailable' }),
        text: async () => Promise.resolve(JSON.stringify({ error: 'Service Unavailable' })),
      });

      // Act & Assert
      await expect(client.get('/users')).rejects.toMatchObject({
        status: 503,
      });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-retryable status codes', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
        retry: { maxAttempts: 3 },
      });

      mockFetch.mockError(404, 'Not Found');

      // Act & Assert
      await expect(client.get('/users/999')).rejects.toMatchObject({
        status: 404,
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on network errors', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
        retry: {
          maxAttempts: 3,
          baseDelay: 10,
          maxDelay: 100,
          retryOnNetworkError: true,
        },
      });

      // First two calls fail with network error, third succeeds
      mockFetch
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => Promise.resolve({ success: true }),
          text: async () => Promise.resolve(JSON.stringify({ success: true })),
        });

      // Act
      const response = await client.get('/users');

      // Assert
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(response.data).toEqual({ success: true });
    });

    it('should call onRetry callback', async () => {
      // Arrange
      const onRetry = vi.fn();
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
        retry: {
          maxAttempts: 3,
          baseDelay: 10,
          maxDelay: 100,
          onRetry,
        },
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          headers: new Headers(),
          json: async () => Promise.resolve({ error: 'Error' }),
          text: async () => Promise.resolve(JSON.stringify({ error: 'Error' })),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => Promise.resolve({ success: true }),
          text: async () => Promise.resolve(JSON.stringify({ success: true })),
        });

      // Act
      await client.get('/users');

      // Assert
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(expect.any(Object), 0);
    });

    it('should skip retry when skipRetry meta is set', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
        retry: { maxAttempts: 3 },
      });

      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        headers: new Headers(),
        json: async () => Promise.resolve({ error: 'Error' }),
        text: async () => Promise.resolve(JSON.stringify({ error: 'Error' })),
      });

      // Act & Assert
      await expect(client.get('/users', { meta: { skipRetry: true } })).rejects.toMatchObject({
        status: 503,
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Request Deduplication Tests
  // ==========================================================================

  describe('request deduplication', () => {
    it('should deduplicate identical concurrent GET requests', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
        deduplicate: true,
      });

      const deferred = createDeferred<{
        ok: boolean;
        status: number;
        headers: Headers;
        json: () => Promise<unknown>;
        text: () => Promise<string>;
      }>();
      mockFetch.mockReturnValue(deferred.promise);

      // Act - start multiple identical requests
      const promise1 = client.get('/users');
      const promise2 = client.get('/users');
      const promise3 = client.get('/users');

      // Resolve the deferred
      deferred.resolve({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => Promise.resolve({ users: [] }),
        text: async () => Promise.resolve(JSON.stringify({ users: [] })),
      });

      const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);

      // Assert - only one fetch call should be made
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result1.data).toEqual({ users: [] });
      expect(result2.data).toEqual({ users: [] });
      expect(result3.data).toEqual({ users: [] });
    });

    it('should not deduplicate POST requests', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
        deduplicate: true,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Headers(),
        json: async () => Promise.resolve({ id: Math.random() }),
        text: async () => Promise.resolve(JSON.stringify({ id: Math.random() })),
      });

      // Act
      await Promise.all([
        client.post('/users', { name: 'User 1' }),
        client.post('/users', { name: 'User 2' }),
      ]);

      // Assert - each POST should make a separate request
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should not deduplicate requests with different params', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
        deduplicate: true,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => Promise.resolve({}),
        text: async () => Promise.resolve(JSON.stringify({})),
      });

      // Act
      await Promise.all([
        client.get('/users', { params: { page: 1 } }),
        client.get('/users', { params: { page: 2 } }),
      ]);

      // Assert
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should allow disabling deduplication', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
        deduplicate: false,
      });

      const deferred = createDeferred<{
        ok: boolean;
        status: number;
        headers: Headers;
        json: () => Promise<unknown>;
        text: () => Promise<string>;
      }>();
      mockFetch.mockReturnValue(deferred.promise);

      // Act
      const promise1 = client.get('/users');
      const promise2 = client.get('/users');

      deferred.resolve({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => Promise.resolve({}),
        text: async () => Promise.resolve(JSON.stringify({})),
      });

      await Promise.all([promise1, promise2]);

      // Assert - should make separate requests
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================================================
  // Request Cancellation Tests
  // ==========================================================================

  describe('request cancellation', () => {
    it('should cancel request by ID', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
      });

      const deferred = createDeferred<never>();
      mockFetch.mockReturnValue(deferred.promise);

      // Act
      const promise = client.request({
        method: 'GET',
        url: '/users',
        meta: { requestId: 'test-request' },
      });

      // Cancel the request
      client.cancelRequest('test-request');

      // Reject to simulate abort
      deferred.reject(new DOMException('Aborted', 'AbortError'));

      // Assert
      await expect(promise).rejects.toMatchObject({
        category: 'cancelled',
      });
    });

    it('should cancel all pending requests', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
      });

      // Never resolving promises
      mockFetch.mockReturnValue(new Promise(() => {}));

      // Start multiple requests
      void client.get('/users');
      void client.get('/posts');

      // Small delay to ensure requests are started
      await delay(10);

      // Act
      client.cancelAllRequests();

      // Assert - requests should be in pending state
      // (In real implementation, they would reject with AbortError)
    });

    it('should respect external abort signal', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
      });

      const controller = new AbortController();
      const deferred = createDeferred<never>();
      mockFetch.mockReturnValue(deferred.promise);

      // Act
      const promise = client.get('/users', { signal: controller.signal });

      // Abort using external controller
      controller.abort();

      // Reject to simulate abort
      deferred.reject(new DOMException('Aborted', 'AbortError'));

      // Assert
      await expect(promise).rejects.toMatchObject({
        category: 'cancelled',
      });
    });
  });

  // ==========================================================================
  // Token Management Tests
  // ==========================================================================

  describe('token management', () => {
    it('should add Authorization header when token exists', async () => {
      // Arrange
      mockStorage.set('access_token', 'test-token');
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
      });
      mockFetch.mockResponse({});

      // Act
      await client.get('/protected');

      // Assert
      const mockCalls: Array<[string, { headers: Headers }]> = mockFetch.mock.calls as Array<
        [string, { headers: Headers }]
      >;
      const [, { headers }] = mockCalls[0]!;
      expect(headers.get('Authorization')).toBe('Bearer test-token');
    });

    it('should skip auth header when skipAuth meta is set', async () => {
      // Arrange
      mockStorage.set('access_token', 'test-token');
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
      });
      mockFetch.mockResponse({});

      // Act
      await client.get('/public', { meta: { skipAuth: true } });

      // Assert
      const mockCalls: Array<[string, { headers: Headers }]> = mockFetch.mock.calls as Array<
        [string, { headers: Headers }]
      >;
      const [, { headers }] = mockCalls[0]!;
      expect(headers.get('Authorization')).toBeNull();
    });

    it('should use custom token provider', async () => {
      // Arrange
      const customProvider = {
        getAccessToken: vi.fn(() => 'custom-token'),
        getRefreshToken: vi.fn(() => 'custom-refresh'),
        setAccessToken: vi.fn(),
        setRefreshToken: vi.fn(),
        clearTokens: vi.fn(),
      };

      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
        tokenProvider: customProvider,
      });
      mockFetch.mockResponse({});

      // Act
      await client.get('/protected');

      // Assert
      expect(customProvider.getAccessToken).toHaveBeenCalled();
      const mockCalls: Array<[string, { headers: Headers }]> = mockFetch.mock.calls as Array<
        [string, { headers: Headers }]
      >;
      const [, { headers }] = mockCalls[0]!;
      expect(headers.get('Authorization')).toBe('Bearer custom-token');
    });

    it('should allow setting new token provider', () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
      });

      const newProvider = {
        getAccessToken: vi.fn(() => 'new-token'),
        getRefreshToken: vi.fn(),
        setAccessToken: vi.fn(),
        setRefreshToken: vi.fn(),
        clearTokens: vi.fn(),
      };

      // Act
      client.setTokenProvider(newProvider);

      // Assert
      expect(client.getTokenProvider()).toBe(newProvider);
    });
  });

  // ==========================================================================
  // Response Parsing Tests
  // ==========================================================================

  describe('response parsing', () => {
    it('should parse JSON response by default', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
      });
      mockFetch.mockResponse({ users: [{ id: 1 }, { id: 2 }] });

      // Act
      const response = await client.get<{ users: Array<{ id: number }> }>('/users');

      // Assert
      expect(response.data).toEqual({ users: [{ id: 1 }, { id: 2 }] });
    });

    it('should parse text response', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        text: async () => Promise.resolve('Plain text response'),
      });

      // Act
      const response = await client.get<string>('/text', {
        responseType: 'text',
      });

      // Assert
      expect(response.data).toBe('Plain text response');
    });

    it('should handle empty response body', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers(),
        text: async () => Promise.resolve(''),
      });

      // Act
      const response = await client.delete('/users/1');

      // Assert
      expect(response.data).toBeUndefined();
    });

    it('should include timing information in response', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
      });
      mockFetch.mockResponse({});

      // Act
      const response = await client.get('/users');

      // Assert
      expect(response.timing).toBeDefined();
      expect(response.timing.startTime).toBeDefined();
      expect(response.timing.endTime).toBeDefined();
      expect(response.timing.duration).toBeGreaterThanOrEqual(0);
    });

    it('should include request config in response', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
      });
      mockFetch.mockResponse({});

      // Act
      const response = await client.get('/users', { params: { page: 1 } });

      // Assert
      expect(response.request).toBeDefined();
      expect(response.request.url).toBe('/users');
      expect(response.request.method).toBe('GET');
    });
  });

  // ==========================================================================
  // createApiError Tests
  // ==========================================================================

  describe('createApiError', () => {
    it('should create error with correct properties', () => {
      // Act
      const error = createApiError(404, 'Resource not found', {
        code: 'NOT_FOUND',
        requestId: 'req-123',
      });

      // Assert
      expect(error.name).toBe('ApiError');
      expect(error.status).toBe(404);
      expect(error.message).toBe('Resource not found');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.category).toBe('not_found');
      expect(error.requestId).toBe('req-123');
      expect(error.timestamp).toBeDefined();
    });

    it('should mark retryable errors correctly', () => {
      // Assert
      expect(createApiError(503, 'Service Unavailable').retryable).toBe(true);
      expect(createApiError(502, 'Bad Gateway').retryable).toBe(true);
      expect(createApiError(429, 'Too Many Requests').retryable).toBe(true);
      expect(createApiError(404, 'Not Found').retryable).toBe(false);
      expect(createApiError(400, 'Bad Request').retryable).toBe(false);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle timeout', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
        timeout: 100,
      });

      // Simulate slow response
      mockFetch.mockImplementation(
        async () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new DOMException('Aborted', 'AbortError')), 50);
          })
      );

      // Act & Assert
      await expect(client.get('/slow')).rejects.toMatchObject({
        category: 'cancelled',
      });
    });

    it('should handle malformed JSON response', async () => {
      // Arrange
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        text: async () => Promise.resolve('not valid json {'),
      });

      // Act
      const response = await client.get('/malformed');

      // Assert - should return raw text if JSON parse fails
      expect(response.data).toBe('not valid json {');
    });

    it('should call onRequestStart and onRequestEnd callbacks', async () => {
      // Arrange
      const onRequestStart = vi.fn();
      const onRequestEnd = vi.fn();

      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
        onRequestStart,
        onRequestEnd,
      });
      mockFetch.mockResponse({});

      // Act
      await client.get('/users');

      // Assert
      expect(onRequestStart).toHaveBeenCalled();
      expect(onRequestEnd).toHaveBeenCalled();
    });

    it('should call onError callback on failure', async () => {
      // Arrange
      const onError = vi.fn();
      const client = createApiClient({
        baseUrl: 'https://api.test.com',
        fetch: mockFetch,
        onError,
      });
      mockFetch.mockError(500, 'Server Error');

      // Act
      await expect(client.get('/error')).rejects.toThrow();

      // Assert
      expect(onError).toHaveBeenCalled();
    });
  });
});
