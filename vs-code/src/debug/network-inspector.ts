/**
 * @file Network Inspector
 * @description Intercept and analyze API requests
 */

// ============================================================================
// Types
// ============================================================================

/**
 *
 */
export interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
  timestamp: number;
  status?: number;
  statusText?: string;
  response?: unknown;
  responseHeaders?: Record<string, string>;
  duration?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 *
 */
export interface RequestTiming {
  start: number;
  dns?: number;
  tcp?: number;
  request?: number;
  response?: number;
  end?: number;
  total?: number;
}

/**
 *
 */
export interface RequestMock {
  pattern: RegExp | string;
  response: unknown;
  status?: number;
  delay?: number;
  errorRate?: number; // 0-1
}

/**
 *
 */
export interface InspectorOptions {
  /** Enable request interception */
  intercept?: boolean;
  /** Enable request mocking */
  enableMocking?: boolean;
  /** Maximum requests to keep */
  maxRequests?: number;
  /** Record request/response bodies */
  recordBodies?: boolean;
  /** URL patterns to ignore */
  ignorePatterns?: RegExp[];
  /** Sanitize sensitive data (default: true) */
  sanitizeSensitiveData?: boolean;
  /** Additional header names to sanitize */
  sensitiveHeaders?: string[];
  /** Additional body field names to sanitize */
  sensitiveBodyFields?: string[];
}

// SECURITY: Headers that may contain sensitive data
const DEFAULT_SENSITIVE_HEADERS = [
  'authorization',
  'x-api-key',
  'x-auth-token',
  'cookie',
  'set-cookie',
  'x-access-token',
  'x-refresh-token',
  'proxy-authorization',
  'www-authenticate',
  'x-csrf-token',
  'x-xsrf-token',
];

// SECURITY: Body fields that may contain sensitive data
const DEFAULT_SENSITIVE_FIELDS = [
  'password',
  'secret',
  'token',
  'apiKey',
  'api_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'credit_card',
  'creditCard',
  'ssn',
  'socialSecurityNumber',
  'social_security_number',
];

/**
 *
 */
export interface NetworkStats {
  total: number;
  successful: number;
  failed: number;
  avgDuration: number;
  totalSize: number;
  byStatus: Record<number, number>;
  byMethod: Record<string, number>;
}

// ============================================================================
// Network Inspector
// ============================================================================

/**
 *
 */
export class NetworkInspector {
  private readonly options: Required<InspectorOptions>;
  private requests: NetworkRequest[] = [];
  private readonly activeRequests = new Map<string, NetworkRequest>();
  private mocks: RequestMock[] = [];
  private requestIdCounter = 0;
  private isInspecting = false;
  private originalFetch: typeof fetch | null = null;
  private originalXHR: typeof XMLHttpRequest | null = null;
  private readonly sensitiveHeadersSet: Set<string>;
  private readonly sensitiveFieldsSet: Set<string>;

  /**
   *
   * @param options
   */
  constructor(options: InspectorOptions = {}) {
    this.options = {
      intercept: options.intercept ?? true,
      enableMocking: options.enableMocking ?? false,
      maxRequests: options.maxRequests ?? 1000,
      recordBodies: options.recordBodies ?? true,
      ignorePatterns: options.ignorePatterns ?? [],
      sanitizeSensitiveData: options.sanitizeSensitiveData ?? true,
      sensitiveHeaders: options.sensitiveHeaders ?? [],
      sensitiveBodyFields: options.sensitiveBodyFields ?? [],
    };

    // SECURITY: Build sets of sensitive header/field names for efficient lookup
    this.sensitiveHeadersSet = new Set([
      ...DEFAULT_SENSITIVE_HEADERS,
      ...this.options.sensitiveHeaders.map(h => h.toLowerCase()),
    ]);
    this.sensitiveFieldsSet = new Set([
      ...DEFAULT_SENSITIVE_FIELDS,
      ...this.options.sensitiveBodyFields,
    ]);
  }

  /**
   * SECURITY: Sanitize headers to redact sensitive values
   * @param headers
   */
  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    if (!this.options.sanitizeSensitiveData) {
      return headers;
    }

    const sanitized: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      sanitized[key] = this.sensitiveHeadersSet.has(key.toLowerCase()) ? '[REDACTED]' : value;
    }
    return sanitized;
  }

  /**
   * SECURITY: Sanitize body to redact sensitive fields
   * @param body
   */
  private sanitizeBody(body: unknown): unknown {
    if (!this.options.sanitizeSensitiveData || body === null || body === undefined) {
      return body;
    }

    if (typeof body === 'string') {
      // Try to parse as JSON and sanitize
      try {
        const parsed = JSON.parse(body);
        return JSON.stringify(this.sanitizeObject(parsed));
      } catch {
        // Not JSON, return as-is
        return body;
      }
    }

    if (typeof body === 'object') {
      return this.sanitizeObject(body as Record<string, unknown>);
    }

    return body;
  }

  /**
   * SECURITY: Recursively sanitize object fields
   * @param obj
   * @param object
   */
  private sanitizeObject(object: Record<string, unknown> | unknown[]): unknown {
    if (Array.isArray(object)) {
      return object.map(item => {
        if (typeof item === 'object' && item !== null) {
          return this.sanitizeObject(item as Record<string, unknown>);
        }
        return item;
      });
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(object)) {
      if (this.sensitiveFieldsSet.has(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * Start inspecting network requests
   */
  start(): void {
    if (this.isInspecting) {
      return;
    }

    this.isInspecting = true;

    if (this.options.intercept) {
      this.interceptFetch();
      this.interceptXHR();
    }
  }

  /**
   * Stop inspecting network requests
   */
  stop(): void {
    if (!this.isInspecting) {
      return;
    }

    this.isInspecting = false;
    this.restoreFetch();
    this.restoreXHR();
  }

  /**
   * Record a network request
   * SECURITY: Automatically sanitizes sensitive headers and body fields
   * @param url
   * @param method
   * @param headers
   * @param body
   */
  recordRequest(
    url: string,
    method: string,
    headers?: Record<string, string>,
    body?: unknown
  ): string {
    if (!this.isInspecting || this.shouldIgnore(url)) {
      return '';
    }

    const requestId = this.generateRequestId();

    // SECURITY: Sanitize headers and body before storing
    const sanitizedHeaders = headers ? this.sanitizeHeaders(headers) : {};
    const sanitizedBody = this.options.recordBodies ? this.sanitizeBody(body) : undefined;

    const request: NetworkRequest = {
      id: requestId,
      url,
      method: method.toUpperCase(),
      headers: sanitizedHeaders,
      body: sanitizedBody,
      timestamp: Date.now(),
    };

    this.activeRequests.set(requestId, request);
    return requestId;
  }

  /**
   * Record request response
   * SECURITY: Automatically sanitizes sensitive headers and body fields
   * @param requestId
   * @param status
   * @param statusText
   * @param headers
   * @param response
   */
  recordResponse(
    requestId: string,
    status: number,
    statusText: string,
    headers?: Record<string, string>,
    response?: unknown
  ): void {
    const request = this.activeRequests.get(requestId);
    if (!request) {
      return;
    }

    request.status = status;
    request.statusText = statusText;

    // SECURITY: Sanitize response headers and body before storing
    if (headers) {
      request.responseHeaders = this.sanitizeHeaders(headers);
    }
    if (this.options.recordBodies) {
      request.response = this.sanitizeBody(response);
    }
    request.duration = Date.now() - request.timestamp;

    this.requests.push(request);
    this.activeRequests.delete(requestId);

    // Enforce max requests
    if (this.requests.length > this.options.maxRequests) {
      this.requests = this.requests.slice(-this.options.maxRequests);
    }
  }

  /**
   * Record request error
   * @param requestId
   * @param error
   */
  recordError(requestId: string, error: string): void {
    const request = this.activeRequests.get(requestId);
    if (!request) {
      return;
    }

    request.error = error;
    request.duration = Date.now() - request.timestamp;

    this.requests.push(request);
    this.activeRequests.delete(requestId);
  }

  /**
   * Get all requests
   * @param filter
   * @param filter.method
   * @param filter.status
   * @param filter.url
   */
  getRequests(filter?: {
    method?: string;
    status?: number;
    url?: string;
  }): NetworkRequest[] {
    let filtered = [...this.requests];

    if (filter?.method) {
      const {method} = filter;
      filtered = filtered.filter((r) => r.method === method.toUpperCase());
    }

    if (filter?.status) {
      filtered = filtered.filter((r) => r.status === filter.status);
    }

    if (filter?.url) {
      const {url} = filter;
      filtered = filtered.filter((r) => r.url.includes(url));
    }

    return filtered;
  }

  /**
   * Get request by ID
   * @param id
   */
  getRequest(id: string): NetworkRequest | undefined {
    return this.requests.find((r) => r.id === id);
  }

  /**
   * Get failed requests
   */
  getFailedRequests(): NetworkRequest[] {
    return this.requests.filter((r) => r.error || (r.status && r.status >= 400));
  }

  /**
   * Get slow requests
   * @param thresholdMs
   */
  getSlowRequests(thresholdMs = 1000): NetworkRequest[] {
    return this.requests
      .filter((r) => r.duration && r.duration > thresholdMs)
      .sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0));
  }

  /**
   * Get network statistics
   */
  getStats(): NetworkStats {
    const stats: NetworkStats = {
      total: this.requests.length,
      successful: 0,
      failed: 0,
      avgDuration: 0,
      totalSize: 0,
      byStatus: {},
      byMethod: {},
    };

    let totalDuration = 0;

    for (const request of this.requests) {
      // Status
      if (request.status) {
        stats.byStatus[request.status] = (stats.byStatus[request.status] ?? 0) + 1;

        if (request.status >= 200 && request.status < 300) {
          stats.successful++;
        } else if (request.status >= 400) {
          stats.failed++;
        }
      }

      if (request.error) {
        stats.failed++;
      }

      // Method
      stats.byMethod[request.method] = (stats.byMethod[request.method] ?? 0) + 1;

      // Duration
      if (request.duration) {
        totalDuration += request.duration;
      }

      // Size estimation
      if (request.response) {
        stats.totalSize += JSON.stringify(request.response).length;
      }
    }

    if (stats.total > 0) {
      stats.avgDuration = totalDuration / stats.total;
    }

    return stats;
  }

  /**
   * Add request mock
   * @param mock
   */
  addMock(mock: RequestMock): void {
    this.mocks.push(mock);
  }

  /**
   * Remove request mock
   * @param pattern
   */
  removeMock(pattern: RegExp | string): boolean {
    const index = this.mocks.findIndex((m) => {
      if (typeof pattern === 'string' && typeof m.pattern === 'string') {
        return m.pattern === pattern;
      }
      if (pattern instanceof RegExp && m.pattern instanceof RegExp) {
        return m.pattern.source === pattern.source;
      }
      return false;
    });

    if (index !== -1) {
      this.mocks.splice(index, 1);
      return true;
    }

    return false;
  }

  /**
   * Clear all mocks
   */
  clearMocks(): void {
    this.mocks = [];
  }

  /**
   * Find matching mock
   * @param url
   */
  findMock(url: string): RequestMock | undefined {
    return this.mocks.find((mock) => {
      if (typeof mock.pattern === 'string') {
        return url.includes(mock.pattern);
      }
      return mock.pattern.test(url);
    });
  }

  /**
   * Clear all requests
   */
  clear(): void {
    this.requests = [];
    this.activeRequests.clear();
  }

  /**
   * Export request data
   */
  export(): string {
    return JSON.stringify(
      {
        version: '1.0.0',
        exportTime: Date.now(),
        requests: this.requests,
        stats: this.getStats(),
      },
      null,
      2
    );
  }

  /**
   * Intercept fetch API
   */
  private interceptFetch(): void {
    if (typeof window === 'undefined' || !window.fetch) {
      return;
    }

    this.originalFetch = window.fetch;
    const self = this;

    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const method = init?.method ?? 'GET';
      const headers: Record<string, string> = {};

      if (init?.headers) {
        if (init.headers instanceof Headers) {
          init.headers.forEach((value, key) => {
            headers[key] = value;
          });
        } else if (Array.isArray(init.headers)) {
          for (const [key, value] of init.headers) {
            headers[key] = value;
          }
        } else {
          Object.assign(headers, init.headers);
        }
      }

      // Check for mock
      if (self.options.enableMocking) {
        const mock = self.findMock(url);
        if (mock) {
          return self.handleMockResponse(url, method, mock);
        }
      }

      const requestId = self.recordRequest(url, method, headers, init?.body);

      try {
        const response = await self.originalFetch!(input, init);
        const clonedResponse = response.clone();

        // Record response
        const responseHeaders: Record<string, string> = {};
        clonedResponse.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        let responseBody: unknown;
        try {
          responseBody = await clonedResponse.json();
        } catch {
          responseBody = await clonedResponse.text();
        }

        self.recordResponse(
          requestId,
          response.status,
          response.statusText,
          responseHeaders,
          responseBody
        );

        return response;
      } catch (error) {
        self.recordError(requestId, error instanceof Error ? error.message : String(error));
        throw error;
      }
    };
  }

  /**
   * Restore original fetch
   */
  private restoreFetch(): void {
    if (typeof window !== 'undefined' && this.originalFetch) {
      window.fetch = this.originalFetch;
      this.originalFetch = null;
    }
  }

  /**
   * Intercept XMLHttpRequest
   */
  private interceptXHR(): void {
    if (typeof window === 'undefined' || !window.XMLHttpRequest) {
      return;
    }

    this.originalXHR = window.XMLHttpRequest;
    const self = this;

    window.XMLHttpRequest = class extends self.originalXHR! {
      private requestId = '';

      /**
       *
       * @param method
       * @param url
       * @param {...any} args
       */
      override open(method: string, url: string | URL, ...args: unknown[]): void {
        this.requestId = self.recordRequest(url.toString(), method);
        const async = args[0] !== undefined ? Boolean(args[0]) : true;
        const username = args[1] !== undefined ? String(args[1]) : undefined;
        const password = args[2] !== undefined ? String(args[2]) : undefined;
        super.open(method, url as string, async, username, password);
      }

      /**
       *
       * @param body
       */
      override send(body?: Document | XMLHttpRequestBodyInit | null): void {
        this.addEventListener('load', () => {
          const responseHeaders: Record<string, string> = {};
          const headersString = this.getAllResponseHeaders();
          if (headersString) {
            for (const line of headersString.split('\r\n')) {
              const [key, value] = line.split(': ');
              if (key && value) {
                responseHeaders[key] = value;
              }
            }
          }

          let response: unknown;
          try {
            response = JSON.parse(this.responseText);
          } catch {
            response = this.responseText;
          }

          self.recordResponse(
            this.requestId,
            this.status,
            this.statusText,
            responseHeaders,
            response
          );
        });

        this.addEventListener('error', () => {
          self.recordError(this.requestId, 'Network error');
        });

        super.send(body);
      }
    };
  }

  /**
   * Restore original XMLHttpRequest
   */
  private restoreXHR(): void {
    if (typeof window !== 'undefined' && this.originalXHR) {
      window.XMLHttpRequest = this.originalXHR;
      this.originalXHR = null;
    }
  }

  /**
   * Handle mock response
   * @param url
   * @param method
   * @param mock
   */
  private async handleMockResponse(
    url: string,
    method: string,
    mock: RequestMock
  ): Promise<Response> {
    // Simulate error rate
    if (mock.errorRate && Math.random() < mock.errorRate) {
      const requestId = this.recordRequest(url, method);
      this.recordError(requestId, 'Simulated error');
      throw new Error('Simulated network error');
    }

    // Simulate delay
    if (mock.delay) {
      await new Promise((resolve) => setTimeout(resolve, mock.delay));
    }

    const status = mock.status ?? 200;
    const response = new Response(JSON.stringify(mock.response), {
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      headers: { 'Content-Type': 'application/json' },
    });

    const requestId = this.recordRequest(url, method);
    this.recordResponse(requestId, status, response.statusText, {}, mock.response);

    return response;
  }

  /**
   * Check if URL should be ignored
   * @param url
   */
  private shouldIgnore(url: string): boolean {
    return this.options.ignorePatterns.some((pattern) => pattern.test(url));
  }

  /**
   * Generate request ID
   */
  private generateRequestId(): string {
    return `request_${Date.now()}_${this.requestIdCounter++}`;
  }
}

// ============================================================================
// Global Inspector Instance
// ============================================================================

let globalInspector: NetworkInspector | null = null;

/**
 * Get or create global inspector instance
 * @param options
 */
export function getGlobalInspector(options?: InspectorOptions): NetworkInspector {
  if (!globalInspector) {
    globalInspector = new NetworkInspector(options);
  }
  return globalInspector;
}

/**
 * Reset global inspector
 */
export function resetGlobalInspector(): void {
  if (globalInspector) {
    globalInspector.stop();
  }
  globalInspector = null;
}
