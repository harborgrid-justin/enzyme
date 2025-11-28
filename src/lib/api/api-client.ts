/**
 * @file API Client Factory
 * @description Enterprise-grade API client with typed request generation, automatic retry
 * with exponential backoff, request/response interceptors, request deduplication,
 * and automatic token refresh capabilities.
 *
 * This module provides the core HTTP client infrastructure with:
 * - Full TypeScript support with generics
 * - Configurable retry strategies with exponential backoff and jitter
 * - Request/response/error interceptor chains
 * - Automatic request deduplication for concurrent identical requests
 * - Token refresh with request queuing
 * - Request prioritization and cancellation
 * - Comprehensive error normalization
 * - Configurable token provider for custom authentication storage
 *
 * @example Basic Usage
 * ```typescript
 * import { createApiClient, ApiClient } from '@/lib/api';
 *
 * // Create a typed client
 * const client = createApiClient({
 *   baseUrl: 'https://api.example.com',
 *   timeout: 30000,
 *   autoRefreshToken: true,
 * });
 *
 * // Make typed requests
 * const user = await client.get<User>('/users/123');
 * const created = await client.post<User>('/users', { name: 'John' });
 * ```
 *
 * @example Custom Token Provider
 * ```typescript
 * import { createApiClient, TokenProvider } from '@/lib/api';
 *
 * // Use custom token storage (e.g., secure storage, cookies, etc.)
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

import type {
  ApiClientConfig,
  ApiError,
  ApiResponse,
  ErrorCategory,
  ErrorSeverity,
  RequestConfig,
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
  RetryConfig,
  ResponseTiming,
  RequestMeta,
  ServerErrorResponse,
  QueryParams,
  TokenProvider,
} from './types';
import { API_CONFIG, TIMING, calculateBackoffWithJitter } from '@/config';
import {
  SecureStorage,
  createSecureLocalStorage,
  isSecureStorageAvailable,
} from '@/lib/security/secure-storage';
import {
  RateLimiter,
  RateLimitError,
  RATE_LIMIT_PRESETS,
  type RateLimitConfig,
} from './advanced/rate-limiter';

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: TIMING.RETRY.API_ATTEMPTS,
  baseDelay: TIMING.API.RETRY_BASE_DELAY,
  maxDelay: TIMING.API.RETRY_MAX_DELAY,
  backoffFactor: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  retryOnNetworkError: true,
};

/**
 * Default client configuration
 */
const DEFAULT_CLIENT_CONFIG: Partial<ApiClientConfig> = {
  timeout: API_CONFIG.TIMEOUT.DEFAULT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  deduplicate: true,
  autoRefreshToken: true,
  tokenRefreshThreshold: TIMING.AUTH.TOKEN_EXPIRY_BUFFER,
  credentials: 'include',
};

// =============================================================================
// REQUEST DEDUPLICATION
// =============================================================================

/**
 * In-flight request cache for deduplication
 */
const inflightRequests = new Map<string, Promise<ApiResponse>>();

/**
 * Generate a cache key for request deduplication
 */
function generateRequestKey(config: RequestConfig): string {
  const { method, url, params, body } = config;
  const paramsStr = params ? JSON.stringify(sortObject(params)) : '';
  const bodyStr = body ? JSON.stringify(body) : '';
  return `${method}:${url}:${paramsStr}:${bodyStr}`;
}

/**
 * Sort object keys for consistent cache key generation
 */
function sortObject<T extends Record<string, unknown>>(obj: T): T {
  const sorted = {} as T;
  const keys = Object.keys(obj).sort() as Array<keyof T>;
  for (const key of keys) {
    sorted[key] = obj[key];
  }
  return sorted;
}

// =============================================================================
// TOKEN REFRESH HANDLING
// =============================================================================

/**
 * Token refresh state management
 */
interface TokenRefreshState {
  isRefreshing: boolean;
  refreshPromise: Promise<string> | null;
  pendingRequests: Array<{
    resolve: (token: string) => void;
    reject: (error: Error) => void;
  }>;
}

const tokenRefreshState: TokenRefreshState = {
  isRefreshing: false,
  refreshPromise: null,
  pendingRequests: [],
};

/**
 * Secure token storage keys used by the default provider.
 *
 * SECURITY: These keys are used with SecureStorage for encrypted token persistence.
 */
const SECURE_API_TOKEN_KEYS = {
  ACCESS_TOKEN: 'api_access_token',
  REFRESH_TOKEN: 'api_refresh_token',
} as const;

/**
 * Session encryption key for API token storage.
 *
 * SECURITY: The encryption key is generated using cryptographically secure
 * random bytes via the Web Crypto API. This key is:
 * - Generated fresh per session
 * - Stored only in memory (never persisted)
 * - Used for encrypting tokens at rest in localStorage
 */
let apiSessionEncryptionKey: string | null = null;

/**
 * Generates a cryptographically secure encryption key for API token storage.
 *
 * SECURITY: Uses crypto.getRandomValues() for true cryptographic randomness.
 *
 * @returns A base64-encoded 256-bit random key
 */
function generateApiSessionKey(): string {
  const keyBytes = new Uint8Array(32);
  crypto.getRandomValues(keyBytes);
  return btoa(String.fromCharCode(...keyBytes));
}

/**
 * Gets or creates the API session encryption key.
 */
function getApiSessionEncryptionKey(): string {
  if (!apiSessionEncryptionKey) {
    apiSessionEncryptionKey = generateApiSessionKey();
  }
  return apiSessionEncryptionKey;
}

/**
 * Lazily initialized secure storage for API tokens.
 */
let secureApiTokenStorage: SecureStorage | null = null;

/**
 * Gets the secure storage instance for API tokens.
 *
 * SECURITY: Uses session-generated encryption key for AES-GCM encryption.
 */
function getSecureApiStorage(): SecureStorage | null {
  if (!isSecureStorageAvailable()) {
    return null;
  }
  if (!secureApiTokenStorage) {
    secureApiTokenStorage = createSecureLocalStorage(getApiSessionEncryptionKey());
  }
  return secureApiTokenStorage;
}

/**
 * In-memory token cache for the default provider.
 *
 * SECURITY: This cache enables synchronous access while maintaining
 * encrypted persistence. Cache is cleared on page reload.
 */
const tokenCache: {
  accessToken: string | null;
  refreshToken: string | null;
} = {
  accessToken: null,
  refreshToken: null,
};

/**
 * Default secure token provider using encrypted localStorage.
 *
 * SECURITY: This provider uses SecureStorage for encrypted token persistence:
 * - Tokens are encrypted using AES-GCM before storage
 * - Session key is cryptographically random (32 bytes)
 * - Key derivation uses PBKDF2 with high iteration count
 * - Each encryption uses a unique IV
 *
 * Methods return Promises to support async encryption operations.
 * The API client handles Promise.resolve() wrapping for compatibility.
 *
 * For maximum security, applications should use the authService which
 * provides additional features like rate limiting and session management.
 */
const defaultTokenProvider: TokenProvider = {
  getAccessToken: async (): Promise<string | null> => {
    // Return cached value for sync-compatible fast path
    if (tokenCache.accessToken) {
      return tokenCache.accessToken;
    }

    const storage = getSecureApiStorage();
    if (!storage) {
      // Fallback: no secure storage available (SSR or unsupported browser)
      return null;
    }

    try {
      const result = await storage.getItem<string>(SECURE_API_TOKEN_KEYS.ACCESS_TOKEN);
      if (result.success && result.data) {
        tokenCache.accessToken = result.data;
        return result.data;
      }
    } catch {
      // Decryption failed - token may be corrupted or key changed
      console.warn('[API Client] Failed to decrypt access token from secure storage');
    }
    return null;
  },

  getRefreshToken: async (): Promise<string | null> => {
    // Return cached value for sync-compatible fast path
    if (tokenCache.refreshToken) {
      return tokenCache.refreshToken;
    }

    const storage = getSecureApiStorage();
    if (!storage) {
      return null;
    }

    try {
      const result = await storage.getItem<string>(SECURE_API_TOKEN_KEYS.REFRESH_TOKEN);
      if (result.success && result.data) {
        tokenCache.refreshToken = result.data;
        return result.data;
      }
    } catch {
      console.warn('[API Client] Failed to decrypt refresh token from secure storage');
    }
    return null;
  },

  setAccessToken: async (token: string): Promise<void> => {
    // Update cache immediately for sync access
    tokenCache.accessToken = token;

    const storage = getSecureApiStorage();
    if (!storage) {
      return;
    }

    try {
      const result = await storage.setItem(SECURE_API_TOKEN_KEYS.ACCESS_TOKEN, token);
      if (!result.success) {
        console.error('[API Client] Failed to store access token:', result.error);
      }
    } catch (error) {
      console.error('[API Client] Error encrypting access token:', error);
    }
  },

  setRefreshToken: async (token: string): Promise<void> => {
    // Update cache immediately for sync access
    tokenCache.refreshToken = token;

    const storage = getSecureApiStorage();
    if (!storage) {
      return;
    }

    try {
      const result = await storage.setItem(SECURE_API_TOKEN_KEYS.REFRESH_TOKEN, token);
      if (!result.success) {
        console.error('[API Client] Failed to store refresh token:', result.error);
      }
    } catch (error) {
      console.error('[API Client] Error encrypting refresh token:', error);
    }
  },

  clearTokens: async (): Promise<void> => {
    // Clear cache immediately
    tokenCache.accessToken = null;
    tokenCache.refreshToken = null;

    const storage = getSecureApiStorage();
    if (!storage) {
      return;
    }

    try {
      await Promise.all([
        storage.removeItem(SECURE_API_TOKEN_KEYS.ACCESS_TOKEN),
        storage.removeItem(SECURE_API_TOKEN_KEYS.REFRESH_TOKEN),
      ]);
    } catch (error) {
      console.error('[API Client] Error clearing tokens from secure storage:', error);
    }
  },
};

/**
 * Create token refresh function using the provided token provider
 */
function createTokenRefreshFn(tokenProvider: TokenProvider): () => Promise<string> {
  return async function tokenRefresh(): Promise<string> {
    const refreshToken = await Promise.resolve(tokenProvider.getRefreshToken());
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.REFRESH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    await Promise.resolve(tokenProvider.setAccessToken(data.accessToken));
    if (data.refreshToken) {
      await Promise.resolve(tokenProvider.setRefreshToken(data.refreshToken));
    }

    return data.accessToken;
  };
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * Map HTTP status codes to error categories
 */
function getErrorCategory(status: number): ErrorCategory {
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
 * Map error categories to severity levels
 */
function getErrorSeverity(category: ErrorCategory): ErrorSeverity {
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
 * Check if an error is retryable
 */
function isRetryable(status: number, retryConfig: RetryConfig): boolean {
  return retryConfig.retryableStatusCodes.includes(status);
}

/**
 * Create a normalized API error from various error sources
 */
function createApiError(
  status: number,
  message: string,
  options: {
    code?: string;
    response?: unknown;
    request?: RequestConfig;
    requestId?: string;
    correlationId?: string;
    cause?: Error;
    fieldErrors?: Array<{ field: string; message: string }>;
  } = {}
): ApiError {
  const category = getErrorCategory(status);
  const severity = getErrorSeverity(category);
  const retryConfig = DEFAULT_RETRY_CONFIG;

  const error = new Error(message) as ApiError;
  error.name = 'ApiError';
  error.status = status;
  error.code = options.code || `HTTP_${status}`;
  error.message = message;
  error.category = category;
  error.severity = severity;
  error.fieldErrors = options.fieldErrors;
  error.request = options.request;
  error.response = options.response;
  error.requestId = options.requestId;
  error.correlationId = options.correlationId;
  error.timestamp = Date.now();
  error.cause = options.cause;
  error.retryable = isRetryable(status, retryConfig);

  return error;
}

/**
 * Parse server error response into normalized format
 */
function parseServerError(response: ServerErrorResponse, _status: number): Partial<ApiError> {
  let message = 'An unexpected error occurred';
  let code: string | undefined;
  const fieldErrors: Array<{ field: string; message: string }> = [];

  if (typeof response.message === 'string') {
    message = response.message;
  } else if (typeof response.error === 'string') {
    message = response.error;
  } else if (response.error && typeof response.error.message === 'string') {
    message = response.error.message;
    code = response.error.code;
  }

  if (response.code) {
    code = response.code;
  }

  if (Array.isArray(response.errors)) {
    for (const err of response.errors) {
      fieldErrors.push({ field: err.field, message: err.message });
    }
  }

  return { message, code, fieldErrors: fieldErrors.length > 0 ? fieldErrors : undefined };
}

// =============================================================================
// API CLIENT CLASS
// =============================================================================

/**
 * Enterprise API Client with comprehensive features
 */
export class ApiClient {
  private config: Required<ApiClientConfig>;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];
  private tokenRefreshFn: () => Promise<string>;
  private tokenProvider: TokenProvider;
  private abortControllers = new Map<string, AbortController>();

  /**
   * Rate limiter instance for client-side rate limiting.
   * Null if rate limiting is disabled.
   */
  private rateLimiter: RateLimiter | null = null;

  constructor(config: ApiClientConfig) {
    // Store token provider (use default if not provided)
    this.tokenProvider = config.tokenProvider || defaultTokenProvider;

    this.config = {
      ...DEFAULT_CLIENT_CONFIG,
      ...config,
      retry: { ...DEFAULT_RETRY_CONFIG, ...config.retry },
      headers: { ...DEFAULT_CLIENT_CONFIG.headers, ...config.headers },
      requestInterceptors: config.requestInterceptors || [],
      responseInterceptors: config.responseInterceptors || [],
      errorInterceptors: config.errorInterceptors || [],
      onError: config.onError || (() => {}),
      onRequestStart: config.onRequestStart || (() => {}),
      onRequestEnd: config.onRequestEnd || (() => {}),
      fetch: config.fetch || fetch.bind(globalThis),
      tokenProvider: this.tokenProvider,
    } as Required<ApiClientConfig>;

    // Initialize interceptors
    this.requestInterceptors = [...this.config.requestInterceptors];
    this.responseInterceptors = [...this.config.responseInterceptors];
    this.errorInterceptors = [...this.config.errorInterceptors];

    // Create token refresh function using the token provider
    this.tokenRefreshFn = createTokenRefreshFn(this.tokenProvider);

    // Initialize rate limiter if configured
    if (config.rateLimit) {
      const rateLimitConfig: RateLimitConfig =
        typeof config.rateLimit === 'string'
          ? RATE_LIMIT_PRESETS[config.rateLimit as keyof typeof RATE_LIMIT_PRESETS]
          : config.rateLimit;
      this.rateLimiter = new RateLimiter(rateLimitConfig);
    }
  }

  // ===========================================================================
  // PUBLIC API METHODS
  // ===========================================================================

  /**
   * Perform a GET request
   */
  async get<TResponse>(
    url: string,
    options: Omit<RequestConfig, 'method' | 'url' | 'body'> = {}
  ): Promise<ApiResponse<TResponse>> {
    return this.request<TResponse>({ ...options, method: 'GET', url });
  }

  /**
   * Perform a POST request
   */
  async post<TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    options: Omit<RequestConfig, 'method' | 'url' | 'body'> = {}
  ): Promise<ApiResponse<TResponse>> {
    return this.request<TResponse>({ ...options, method: 'POST', url, body });
  }

  /**
   * Perform a PUT request
   */
  async put<TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    options: Omit<RequestConfig, 'method' | 'url' | 'body'> = {}
  ): Promise<ApiResponse<TResponse>> {
    return this.request<TResponse>({ ...options, method: 'PUT', url, body });
  }

  /**
   * Perform a PATCH request
   */
  async patch<TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    options: Omit<RequestConfig, 'method' | 'url' | 'body'> = {}
  ): Promise<ApiResponse<TResponse>> {
    return this.request<TResponse>({ ...options, method: 'PATCH', url, body });
  }

  /**
   * Perform a DELETE request
   */
  async delete<TResponse>(
    url: string,
    options: Omit<RequestConfig, 'method' | 'url'> = {}
  ): Promise<ApiResponse<TResponse>> {
    return this.request<TResponse>({ ...options, method: 'DELETE', url });
  }

  /**
   * Perform a HEAD request
   */
  async head(
    url: string,
    options: Omit<RequestConfig, 'method' | 'url' | 'body'> = {}
  ): Promise<ApiResponse<void>> {
    return this.request<void>({ ...options, method: 'HEAD', url });
  }

  /**
   * Generic request method
   */
  async request<TResponse>(config: RequestConfig): Promise<ApiResponse<TResponse>> {
    const requestId = this.generateRequestId();
    const meta: RequestMeta = {
      ...config.meta,
      requestId,
      startTime: Date.now(),
    };

    let processedConfig: RequestConfig<unknown> & { meta: RequestMeta } = { ...config, meta };

    // Run request interceptors
    processedConfig = await this.runRequestInterceptors(processedConfig) as typeof processedConfig;

    // Build URL for rate limiting key
    const url = this.buildUrl(processedConfig);

    // Apply rate limiting if enabled
    if (this.rateLimiter && !config.meta?.skipRateLimit) {
      try {
        return await this.rateLimiter.execute(url, async () => {
          return this.executeRequestWithDedup<TResponse>(processedConfig, requestId);
        });
      } catch (error) {
        if (error instanceof RateLimitError) {
          // Convert RateLimitError to ApiError
          const apiError = createApiError(429, error.message, {
            code: 'RATE_LIMITED',
            request: processedConfig,
            requestId,
          });
          apiError.retryable = true;
          throw apiError;
        }
        throw error;
      }
    }

    return this.executeRequestWithDedup<TResponse>(processedConfig, requestId);
  }

  /**
   * Execute request with deduplication logic
   */
  private async executeRequestWithDedup<TResponse>(
    config: RequestConfig,
    requestId: string
  ): Promise<ApiResponse<TResponse>> {
    // Check for deduplication
    if (this.config.deduplicate && config.method === 'GET' && !config.meta?.skipAuth) {
      const cacheKey = generateRequestKey(config);
      const inflight = inflightRequests.get(cacheKey);
      if (inflight) {
        return inflight as Promise<ApiResponse<TResponse>>;
      }

      const promise = this.executeRequest<TResponse>(config, requestId);
      inflightRequests.set(cacheKey, promise as Promise<ApiResponse>);

      try {
        const result = await promise;
        return result;
      } finally {
        inflightRequests.delete(cacheKey);
      }
    }

    return this.executeRequest<TResponse>(config, requestId);
  }

  // ===========================================================================
  // INTERCEPTOR MANAGEMENT
  // ===========================================================================

  /**
   * Add a request interceptor
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
   * Add a response interceptor
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
   * Add an error interceptor
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

  // ===========================================================================
  // TOKEN REFRESH
  // ===========================================================================

  /**
   * Set custom token refresh function
   */
  setTokenRefresh(fn: () => Promise<string>): void {
    this.tokenRefreshFn = fn;
  }

  /**
   * Get the current token provider
   */
  getTokenProvider(): TokenProvider {
    return this.tokenProvider;
  }

  /**
   * Set a new token provider
   *
   * This also updates the token refresh function to use the new provider.
   */
  setTokenProvider(provider: TokenProvider): void {
    this.tokenProvider = provider;
    this.tokenRefreshFn = createTokenRefreshFn(provider);
  }

  /**
   * Perform token refresh with request queuing
   */
  private async refreshToken(): Promise<string> {
    if (tokenRefreshState.isRefreshing && tokenRefreshState.refreshPromise) {
      return tokenRefreshState.refreshPromise;
    }

    tokenRefreshState.isRefreshing = true;
    tokenRefreshState.refreshPromise = this.tokenRefreshFn();

    try {
      const token = await tokenRefreshState.refreshPromise;

      // Resolve all pending requests
      for (const { resolve } of tokenRefreshState.pendingRequests) {
        resolve(token);
      }
      tokenRefreshState.pendingRequests = [];

      return token;
    } catch (error) {
      // Reject all pending requests
      for (const { reject } of tokenRefreshState.pendingRequests) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
      tokenRefreshState.pendingRequests = [];

      throw error;
    } finally {
      tokenRefreshState.isRefreshing = false;
      tokenRefreshState.refreshPromise = null;
    }
  }

  // ===========================================================================
  // RATE LIMITING
  // ===========================================================================

  /**
   * Get the rate limiter instance.
   * Returns null if rate limiting is not enabled.
   */
  getRateLimiter(): RateLimiter | null {
    return this.rateLimiter;
  }

  /**
   * Enable or update rate limiting.
   *
   * @param config - Rate limit configuration or preset name
   *
   * @example
   * ```typescript
   * // Use a preset
   * client.setRateLimit('standard');
   *
   * // Use custom config
   * client.setRateLimit({
   *   maxRequests: 100,
   *   windowMs: 60000,
   *   strategy: 'queue',
   * });
   * ```
   */
  setRateLimit(config: RateLimitConfig | keyof typeof RATE_LIMIT_PRESETS): void {
    const rateLimitConfig: RateLimitConfig =
      typeof config === 'string'
        ? RATE_LIMIT_PRESETS[config]
        : config;
    this.rateLimiter = new RateLimiter(rateLimitConfig);
  }

  /**
   * Disable rate limiting.
   */
  disableRateLimit(): void {
    this.rateLimiter = null;
  }

  /**
   * Check if a request would be rate limited.
   *
   * @param endpoint - Endpoint URL to check
   * @returns Whether the request would be limited
   */
  wouldBeRateLimited(endpoint: string): boolean {
    return this.rateLimiter?.wouldBeLimited(endpoint) ?? false;
  }

  // ===========================================================================
  // REQUEST CANCELLATION
  // ===========================================================================

  /**
   * Cancel a specific request by ID
   */
  cancelRequest(requestId: string): void {
    const controller = this.abortControllers.get(requestId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(requestId);
    }
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests(): void {
    for (const controller of this.abortControllers.values()) {
      controller.abort();
    }
    this.abortControllers.clear();
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  /**
   * Execute the actual HTTP request with retry logic
   */
  private async executeRequest<TResponse>(
    config: RequestConfig,
    requestId: string,
    attempt = 0
  ): Promise<ApiResponse<TResponse>> {
    const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...this.config.retry, ...config.retry };
    const abortController = new AbortController();
    this.abortControllers.set(requestId, abortController);

    // Merge signals if one was provided
    if (config.signal) {
      config.signal.addEventListener('abort', () => abortController.abort());
    }

    const startTime = Date.now();
    this.config.onRequestStart(config);

    try {
      // Build the full URL
      const url = this.buildUrl(config);

      // Build headers
      const headers = await this.buildHeaders(config);

      // Build request options
      const requestInit: RequestInit = {
        method: config.method,
        headers,
        signal: abortController.signal,
        credentials: config.credentials || this.config.credentials,
        cache: config.cache,
      };

      // Add body for methods that support it
      if (config.body !== undefined && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
        requestInit.body = this.serializeBody(config);
      }

      // Set up timeout
      const timeout = config.timeout || this.config.timeout;
      const timeoutId = setTimeout(() => abortController.abort(), timeout);

      try {
        const response = await this.config.fetch(url, requestInit);
        clearTimeout(timeoutId);

        const endTime = Date.now();
        const timing: ResponseTiming = {
          startTime,
          endTime,
          duration: endTime - startTime,
        };

        // Update rate limiter from response headers
        if (this.rateLimiter) {
          const rateLimitHeaders = {
            'x-ratelimit-remaining': response.headers.get('x-ratelimit-remaining') || undefined,
            'x-ratelimit-limit': response.headers.get('x-ratelimit-limit') || undefined,
            'x-ratelimit-reset': response.headers.get('x-ratelimit-reset') || undefined,
            'retry-after': response.headers.get('retry-after') || undefined,
          };
          this.rateLimiter.updateFromHeaders(url, rateLimitHeaders);
        }

        // Handle non-OK responses
        if (!response.ok) {
          const errorResponse = await this.parseErrorResponse(response);
          const apiError = createApiError(
            response.status,
            errorResponse.message || `HTTP ${response.status}`,
            {
              code: errorResponse.code,
              response: errorResponse,
              request: config,
              requestId,
              fieldErrors: errorResponse.fieldErrors,
            }
          );

          // Handle 429 rate limit response
          if (response.status === 429 && this.rateLimiter) {
            const retryAfter = response.headers.get('retry-after') || undefined;
            this.rateLimiter.handle429(url, retryAfter);
          }

          // Handle 401 with token refresh
          if (response.status === 401 && this.config.autoRefreshToken && !config.meta?.skipAuth) {
            try {
              await this.refreshToken();
              // Retry the request with new token
              return this.executeRequest<TResponse>(config, requestId, attempt);
            } catch {
              // Token refresh failed, propagate original error
            }
          }

          // Check if we should retry
          if (
            apiError.retryable &&
            attempt < retryConfig.maxAttempts - 1 &&
            !config.meta?.skipRetry
          ) {
            const shouldRetry = retryConfig.shouldRetry
              ? retryConfig.shouldRetry(apiError, attempt)
              : true;

            if (shouldRetry) {
              retryConfig.onRetry?.(apiError, attempt);
              const delay = calculateBackoffWithJitter(
                attempt,
                retryConfig.baseDelay,
                retryConfig.maxDelay
              );
              await this.delay(delay);
              return this.executeRequest<TResponse>(config, requestId, attempt + 1);
            }
          }

          throw apiError;
        }

        // Parse successful response
        const data = await this.parseResponse<TResponse>(response, config);

        // Build response object
        let apiResponse: ApiResponse<TResponse> = {
          data,
          status: response.status,
          statusText: response.statusText,
          headers: this.parseHeaders(response.headers),
          request: config,
          timing,
        };

        // Run response interceptors
        apiResponse = await this.runResponseInterceptors(apiResponse);

        this.config.onRequestEnd(apiResponse);

        return apiResponse;
      } finally {
        clearTimeout(timeoutId);
        this.abortControllers.delete(requestId);
      }
    } catch (error) {
      this.abortControllers.delete(requestId);

      // Handle abort errors
      if (error instanceof DOMException && error.name === 'AbortError') {
        const apiError = createApiError(0, 'Request was cancelled', {
          code: 'REQUEST_CANCELLED',
          request: config,
          requestId,
        });
        apiError.category = 'cancelled';
        apiError.retryable = false;
        throw apiError;
      }

      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const apiError = createApiError(0, 'Network error occurred', {
          code: 'NETWORK_ERROR',
          request: config,
          requestId,
          cause: error,
        });
        apiError.category = 'network';

        // Retry network errors
        if (
          retryConfig.retryOnNetworkError &&
          attempt < retryConfig.maxAttempts - 1 &&
          !config.meta?.skipRetry
        ) {
          retryConfig.onRetry?.(apiError, attempt);
          const delay = calculateBackoffWithJitter(
            attempt,
            retryConfig.baseDelay,
            retryConfig.maxDelay
          );
          await this.delay(delay);
          return this.executeRequest<TResponse>(config, requestId, attempt + 1);
        }

        throw apiError;
      }

      // Re-throw API errors
      if (this.isApiError(error)) {
        // Run error interceptors
        const processedError = await this.runErrorInterceptors(error);
        this.config.onError(processedError);
        this.config.onRequestEnd(processedError);
        throw processedError;
      }

      // Wrap unknown errors
      const apiError = createApiError(0, 'An unexpected error occurred', {
        code: 'UNKNOWN_ERROR',
        request: config,
        requestId,
        cause: error instanceof Error ? error : new Error(String(error)),
      });

      const processedError = await this.runErrorInterceptors(apiError);
      this.config.onError(processedError);
      this.config.onRequestEnd(processedError);
      throw processedError;
    }
  }

  /**
   * Build the full URL with path params and query string
   */
  private buildUrl(config: RequestConfig): string {
    let url = config.url;

    // Substitute path parameters
    if (config.pathParams) {
      for (const [key, value] of Object.entries(config.pathParams)) {
        url = url.replace(`:${key}`, encodeURIComponent(String(value)));
      }
    }

    // Build full URL
    const baseUrl = this.config.baseUrl.replace(/\/$/, '');
    const path = url.startsWith('/') ? url : `/${url}`;
    let fullUrl = `${baseUrl}${path}`;

    // Add query parameters
    if (config.params && Object.keys(config.params).length > 0) {
      const searchParams = this.buildQueryString(config.params);
      fullUrl = `${fullUrl}?${searchParams}`;
    }

    return fullUrl;
  }

  /**
   * Build query string from params object
   */
  private buildQueryString(params: QueryParams): string {
    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) {
        continue;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          searchParams.append(key, String(item));
        }
      } else {
        searchParams.set(key, String(value));
      }
    }

    return searchParams.toString();
  }

  /**
   * Build request headers
   */
  private async buildHeaders(config: RequestConfig): Promise<Headers> {
    const headers = new Headers();

    // Add default headers
    for (const [key, value] of Object.entries(this.config.headers)) {
      if (value) {
        headers.set(key, value);
      }
    }

    // Add config-specific headers
    if (config.headers) {
      for (const [key, value] of Object.entries(config.headers)) {
        if (value) {
          headers.set(key, value);
        }
      }
    }

    // Add content type if body exists
    if (config.body !== undefined && config.contentType) {
      headers.set('Content-Type', config.contentType);
    }

    // Add authorization header using token provider
    if (!config.meta?.skipAuth) {
      const token = await Promise.resolve(this.tokenProvider.getAccessToken());
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    // Add request ID
    if (config.meta?.requestId) {
      headers.set('X-Request-ID', config.meta.requestId);
    }

    // Add correlation ID
    if (config.meta?.correlationId) {
      headers.set('X-Correlation-ID', config.meta.correlationId);
    }

    // Add idempotency key
    if (config.meta?.idempotencyKey) {
      headers.set('X-Idempotency-Key', config.meta.idempotencyKey);
    }

    return headers;
  }

  /**
   * Serialize request body based on content type
   */
  private serializeBody(config: RequestConfig): BodyInit | undefined {
    const { body, contentType } = config;

    if (body === undefined) {
      return undefined;
    }

    // Handle FormData directly
    if (body instanceof FormData) {
      return body;
    }

    // Handle Blob directly
    if (body instanceof Blob) {
      return body;
    }

    // Handle ArrayBuffer directly
    if (body instanceof ArrayBuffer) {
      return body;
    }

    // Handle streams
    if (body instanceof ReadableStream) {
      return body;
    }

    // Handle based on content type
    switch (contentType) {
      case 'application/x-www-form-urlencoded':
        return new URLSearchParams(body as Record<string, string>).toString();

      case 'multipart/form-data': {
        const formData = new FormData();
        for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
          if (value instanceof Blob) {
            formData.append(key, value);
          } else {
            formData.append(key, String(value));
          }
        }
        return formData;
      }

      case 'text/plain':
        return String(body);

      case 'application/json':
      default:
        return JSON.stringify(body);
    }
  }

  /**
   * Parse response based on content type and config
   */
  private async parseResponse<T>(response: Response, config: RequestConfig): Promise<T> {
    const responseType = config.responseType || 'json';

    switch (responseType) {
      case 'json': {
        const text = await response.text();
        if (!text) {
          return undefined as T;
        }
        try {
          return JSON.parse(text);
        } catch {
          return text as T;
        }
      }

      case 'text':
        return (await response.text()) as T;

      case 'blob':
        return (await response.blob()) as T;

      case 'arraybuffer':
        return (await response.arrayBuffer()) as T;

      case 'stream':
        return response.body as T;

      default:
        return (await response.json()) as T;
    }
  }

  /**
   * Parse error response body
   */
  private async parseErrorResponse(response: Response): Promise<Partial<ApiError>> {
    try {
      const text = await response.text();
      if (!text) {
        return { message: `HTTP ${response.status}` };
      }

      try {
        const json = JSON.parse(text) as ServerErrorResponse;
        return parseServerError(json, response.status);
      } catch {
        return { message: text };
      }
    } catch {
      return { message: `HTTP ${response.status}` };
    }
  }

  /**
   * Parse response headers into a plain object
   */
  private parseHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key.toLowerCase()] = value;
    });
    return result;
  }

  /**
   * Run request interceptors in sequence
   */
  private async runRequestInterceptors(config: RequestConfig): Promise<RequestConfig> {
    let result = config;
    for (const interceptor of this.requestInterceptors) {
      result = await interceptor(result);
    }
    return result;
  }

  /**
   * Run response interceptors in sequence
   */
  private async runResponseInterceptors<T>(
    response: ApiResponse<T>
  ): Promise<ApiResponse<T>> {
    let result = response;
    for (const interceptor of this.responseInterceptors) {
      result = await interceptor(result);
    }
    return result;
  }

  /**
   * Run error interceptors in sequence
   */
  private async runErrorInterceptors(error: ApiError): Promise<ApiError> {
    let result = error;
    for (const interceptor of this.errorInterceptors) {
      result = await interceptor(result);
    }
    return result;
  }

  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Type guard for API errors
   */
  private isApiError(error: unknown): error is ApiError {
    return (
      error !== null &&
      typeof error === 'object' &&
      'name' in error &&
      (error as ApiError).name === 'ApiError'
    );
  }

  /**
   * Promise-based delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a new API client instance
 *
 * @param config - Client configuration
 * @returns Configured ApiClient instance
 *
 * @example
 * ```typescript
 * const client = createApiClient({
 *   baseUrl: 'https://api.example.com',
 *   timeout: 30000,
 *   autoRefreshToken: true,
 * });
 *
 * // Add global request logging
 * client.addRequestInterceptor((config) => {
 *   console.log(`[API] ${config.method} ${config.url}`);
 *   return config;
 * });
 *
 * // Make requests
 * const users = await client.get<User[]>('/users');
 * ```
 */
export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/**
 * Default API client instance configured with application defaults
 */
export const apiClient = createApiClient({
  baseUrl: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT.DEFAULT,
  headers: API_CONFIG.HEADERS,
  retry: {
    maxAttempts: API_CONFIG.RETRY.ATTEMPTS,
    baseDelay: API_CONFIG.RETRY.BASE_DELAY,
    maxDelay: API_CONFIG.RETRY.MAX_DELAY,
  },
});

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

export { createApiError, isRetryable, getErrorCategory, getErrorSeverity };

// Re-export rate limiter for convenience
export { RateLimiter, RateLimitError, RATE_LIMIT_PRESETS, type RateLimitConfig };
