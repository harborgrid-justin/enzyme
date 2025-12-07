/**
 * Client-Side Rate Limiter
 *
 * Implements client-side rate limiting to prevent overwhelming APIs
 * and respect rate limit headers from servers.
 *
 * @module api/advanced/rate-limiter
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Rate limit configuration.
 */
export interface RateLimitConfig {
  /** Maximum requests per window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Strategy for handling exceeded limits */
  strategy?: 'queue' | 'reject' | 'delay';
  /** Maximum queue size (for queue strategy) */
  maxQueueSize?: number;
  /** Maximum delay in milliseconds (for delay strategy) */
  maxDelay?: number;
  /** Key generator for per-endpoint limits */
  keyGenerator?: (endpoint: string) => string;
}

/**
 * Rate limit status.
 */
export interface RateLimitStatus {
  /** Number of requests remaining in current window */
  remaining: number;
  /** Total limit for the window */
  limit: number;
  /** Time until window resets (ms) */
  resetIn: number;
  /** Whether currently rate limited */
  isLimited: boolean;
  /** Current queue size */
  queueSize: number;
}

/**
 * Server rate limit headers.
 */
export interface RateLimitHeaders {
  /** Remaining requests */
  'x-ratelimit-remaining'?: string;
  /** Total limit */
  'x-ratelimit-limit'?: string;
  /** Reset timestamp */
  'x-ratelimit-reset'?: string;
  /** Retry after (seconds) */
  'retry-after'?: string;
}

/**
 * Queued request entry.
 */
interface QueuedRequest<T> {
  /** Execute function */
  execute: () => Promise<T>;
  /** Resolve callback */
  resolve: (value: T) => void;
  /** Reject callback */
  reject: (error: Error) => void;
  /** Request timestamp */
  timestamp: number;
  /** Request key */
  key: string;
}

// =============================================================================
// Rate Limiter Class
// =============================================================================

/**
 * Client-Side Rate Limiter.
 *
 * Implements multiple rate limiting strategies to prevent API abuse
 * and handle server-imposed rate limits gracefully.
 *
 * @example
 * ```typescript
 * const limiter = new RateLimiter({
 *   maxRequests: 100,
 *   windowMs: 60000, // 1 minute
 *   strategy: 'queue',
 * });
 *
 * // Wrap API calls
 * const result = await limiter.execute('/users', () =>
 *   fetch('/api/users')
 * );
 *
 * // Check status
 * const status = limiter.getStatus('/users');
 * console.log(`${status.remaining} requests remaining`);
 * ```
 */
export class RateLimiter {
  private config: Required<RateLimitConfig>;
  private windows: Map<string, { count: number; resetAt: number }>;
  private readonly queue: Map<string, QueuedRequest<unknown>[]>;
  private serverLimits: Map<string, { remaining: number; resetAt: number }>;
  private processing: Set<string>;

  /**
   * Create a new rate limiter.
   *
   * @param config - Rate limit configuration
   */
  constructor(config: RateLimitConfig) {
    this.config = {
      strategy: 'queue',
      maxQueueSize: 100,
      maxDelay: 30000,
      keyGenerator: (endpoint) => endpoint.split('?')[0] ?? endpoint,
      ...config,
    };

    this.windows = new Map();
    this.queue = new Map();
    this.serverLimits = new Map();
    this.processing = new Set();
  }

  // ===========================================================================
  // Main Execution
  // ===========================================================================

  /**
   * Execute a request with rate limiting.
   *
   * @param endpoint - Request endpoint
   * @param fn - Function to execute
   * @returns Promise resolving to function result
   */
  async execute<T>(endpoint: string, fn: () => Promise<T>): Promise<T> {
    const key = this.config.keyGenerator(endpoint);

    // Check server-imposed limits first
    if (this.isServerLimited(key)) {
      const serverLimit = this.serverLimits.get(key);
      if (serverLimit == null) {
        throw new Error('Server limit not found');
      }
      const waitTime = serverLimit.resetAt - Date.now();

      switch (this.config.strategy) {
        case 'reject':
          throw new RateLimitError('Server rate limit exceeded', waitTime, key);

        case 'delay':
          await this.delay(Math.min(waitTime, this.config.maxDelay));
          break;

        case 'queue':
        default:
          return this.enqueue(key, fn);
      }
    }

    // Check client-side limits
    const window = this.getOrCreateWindow(key);
    const now = Date.now();

    // Reset window if expired
    if (now >= window.resetAt) {
      window.count = 0;
      window.resetAt = now + this.config.windowMs;
    }

    // Check if limit exceeded
    if (window.count >= this.config.maxRequests) {
      const waitTime = window.resetAt - now;

      switch (this.config.strategy) {
        case 'reject':
          throw new RateLimitError('Rate limit exceeded', waitTime, key);

        case 'delay':
          await this.delay(Math.min(waitTime, this.config.maxDelay));
          // Reset window after delay
          window.count = 0;
          window.resetAt = Date.now() + this.config.windowMs;
          break;

        case 'queue':
        default:
          return this.enqueue(key, fn);
      }
    }

    // Execute request
    window.count++;

    try {
      return await fn();
    } catch (error) {
      // Rollback count on error
      window.count = Math.max(0, window.count - 1);
      throw error;
    }
  }

  /**
   * Check if request would be rate limited.
   *
   * @param endpoint - Request endpoint
   * @returns Whether request would be limited
   */
  wouldBeLimited(endpoint: string): boolean {
    const key = this.config.keyGenerator(endpoint);

    // Check server limits
    if (this.isServerLimited(key)) {
      return true;
    }

    // Check client limits
    const window = this.windows.get(key);
    if (!window) return false;

    const now = Date.now();
    if (now >= window.resetAt) return false;

    return window.count >= this.config.maxRequests;
  }

  // ===========================================================================
  // Queue Management
  // ===========================================================================

  /**
   * Update rate limits from server response headers.
   *
   * @param endpoint - Request endpoint
   * @param headers - Response headers
   */
  updateFromHeaders(endpoint: string, headers: RateLimitHeaders): void {
    const key = this.config.keyGenerator(endpoint);

    const remaining = headers['x-ratelimit-remaining'];
    const reset = headers['x-ratelimit-reset'];
    const retryAfter = headers['retry-after'];

    if (remaining !== undefined || reset !== undefined) {
      let resetAt: number;

      if (retryAfter != null && retryAfter !== '') {
        // Retry-After can be seconds or HTTP date
        const seconds = parseInt(retryAfter, 10);
        if (!isNaN(seconds)) {
          resetAt = Date.now() + seconds * 1000;
        } else {
          resetAt = new Date(retryAfter).getTime();
        }
      } else if (reset != null && reset !== '') {
        // Reset can be Unix timestamp (seconds) or milliseconds
        const resetValue = parseInt(reset, 10);
        resetAt = resetValue > 1e12 ? resetValue : resetValue * 1000;
      } else {
        resetAt = Date.now() + this.config.windowMs;
      }

      this.serverLimits.set(key, {
        remaining: (remaining != null && remaining !== '') ? parseInt(remaining, 10) : 0,
        resetAt,
      });
    }
  }

  /**
   * Handle 429 Too Many Requests response.
   *
   * @param endpoint - Request endpoint
   * @param retryAfter - Retry-After header value
   */
  handle429(endpoint: string, retryAfter?: string): void {
    const key = this.config.keyGenerator(endpoint);

    let resetAt: number;

    if (retryAfter != null && retryAfter !== '') {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) {
        resetAt = Date.now() + seconds * 1000;
      } else {
        resetAt = new Date(retryAfter).getTime();
      }
    } else {
      // Default to 60 seconds
      resetAt = Date.now() + 60000;
    }

    this.serverLimits.set(key, {
      remaining: 0,
      resetAt,
    });
  }

  /**
   * Get rate limit status for an endpoint.
   *
   * @param endpoint - Request endpoint
   * @returns Rate limit status
   */
  getStatus(endpoint: string): RateLimitStatus {
    const key = this.config.keyGenerator(endpoint);
    const window = this.windows.get(key);
    const serverLimit = this.serverLimits.get(key);
    const keyQueue = this.queue.get(key);

    const now = Date.now();

    // Check server limits first
    if (serverLimit && now < serverLimit.resetAt) {
      return {
        remaining: serverLimit.remaining,
        limit: this.config.maxRequests,
        resetIn: serverLimit.resetAt - now,
        isLimited: serverLimit.remaining <= 0,
        queueSize: keyQueue?.length ?? 0,
      };
    }

    // Check client limits
    if (window && now < window.resetAt) {
      return {
        remaining: Math.max(0, this.config.maxRequests - window.count),
        limit: this.config.maxRequests,
        resetIn: window.resetAt - now,
        isLimited: window.count >= this.config.maxRequests,
        queueSize: keyQueue?.length ?? 0,
      };
    }

    return {
      remaining: this.config.maxRequests,
      limit: this.config.maxRequests,
      resetIn: 0,
      isLimited: false,
      queueSize: keyQueue?.length ?? 0,
    };
  }

  // ===========================================================================
  // Server Rate Limit Handling
  // ===========================================================================

  /**
   * Clear rate limit tracking for an endpoint.
   *
   * @param endpoint - Request endpoint
   */
  clear(endpoint: string): void {
    const key = this.config.keyGenerator(endpoint);
    this.windows.delete(key);
    this.serverLimits.delete(key);

    // Reject queued requests
    const keyQueue = this.queue.get(key);
    if (keyQueue) {
      for (const entry of keyQueue) {
        entry.reject(new Error('Rate limiter cleared'));
      }
      this.queue.delete(key);
    }
  }

  /**
   * Clear all rate limit tracking.
   */
  clearAll(): void {
    // Reject all queued requests
    for (const [, keyQueue] of this.queue) {
      for (const entry of keyQueue) {
        entry.reject(new Error('Rate limiter cleared'));
      }
    }

    this.windows.clear();
    this.serverLimits.clear();
    this.queue.clear();
  }

  /**
   * Get all tracked endpoints.
   */
  getTrackedEndpoints(): string[] {
    return Array.from(
      new Set([
        ...this.windows.keys(),
        ...this.serverLimits.keys(),
        ...this.queue.keys(),
      ])
    );
  }

  // ===========================================================================
  // Status & Management
  // ===========================================================================

  /**
   * Enqueue a request for later execution.
   */
  private async enqueue<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const keyQueue = this.queue.get(key) ?? [];

    if (keyQueue.length >= this.config.maxQueueSize) {
      throw new RateLimitError(
        'Rate limit queue full',
        this.getWaitTime(key),
        key
      );
    }

    return new Promise<T>((resolve, reject) => {
      const entry: QueuedRequest<T> = {
        execute: fn,
        resolve: resolve as (value: unknown) => void,
        reject,
        timestamp: Date.now(),
        key,
      };

      keyQueue.push(entry as QueuedRequest<unknown>);
      this.queue.set(key, keyQueue);

      // Start processing queue
      void this.processQueue(key);
    });
  }

  /**
   * Process queued requests.
   */
  private async processQueue(key: string): Promise<void> {
    // Prevent concurrent processing
    if (this.processing.has(key)) {
      return;
    }

    this.processing.add(key);

    try {
      const keyQueue = this.queue.get(key);
      if (!keyQueue || keyQueue.length === 0) {
        return;
      }

      while (keyQueue.length > 0) {
        // Wait until we can make a request
        const waitTime = this.getWaitTime(key);
        if (waitTime > 0) {
          await this.delay(Math.min(waitTime, 1000)); // Check every second
          continue;
        }

        const entry = keyQueue.shift();
        if (entry == null) break;

        const window = this.getOrCreateWindow(key);
        window.count++;

        try {
          const result = await entry.execute();
          entry.resolve(result);
        } catch (error) {
          window.count = Math.max(0, window.count - 1);
          entry.reject(error as Error);
        }
      }
    } finally {
      this.processing.delete(key);
    }
  }

  /**
   * Get wait time until next request can be made.
   */
  private getWaitTime(key: string): number {
    // Check server limits
    const serverLimit = this.serverLimits.get(key);
    if (serverLimit && serverLimit.remaining <= 0) {
      return Math.max(0, serverLimit.resetAt - Date.now());
    }

    // Check client limits
    const window = this.windows.get(key);
    if (!window) return 0;

    const now = Date.now();
    if (now >= window.resetAt) return 0;
    if (window.count < this.config.maxRequests) return 0;

    return window.resetAt - now;
  }

  /**
   * Check if server has imposed rate limit.
   */
  private isServerLimited(key: string): boolean {
    const limit = this.serverLimits.get(key);
    if (!limit) return false;

    const now = Date.now();

    // Clear expired limits
    if (now >= limit.resetAt) {
      this.serverLimits.delete(key);
      return false;
    }

    return limit.remaining <= 0;
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Get or create window for key.
   */
  private getOrCreateWindow(key: string): { count: number; resetAt: number } {
    let window = this.windows.get(key);

    if (!window) {
      window = {
        count: 0,
        resetAt: Date.now() + this.config.windowMs,
      };
      this.windows.set(key, window);
    }

    return window;
  }

  /**
   * Delay execution.
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// =============================================================================
// Rate Limit Error
// =============================================================================

/**
 * Error thrown when rate limit is exceeded.
 */
export class RateLimitError extends Error {
  /** Time until rate limit resets (ms) */
  readonly retryAfter: number;
  /** Endpoint that was rate limited */
  readonly endpoint: string;

  constructor(message: string, retryAfter: number, endpoint: string) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    this.endpoint = endpoint;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new rate limiter.
 *
 * @param config - Rate limit configuration
 * @returns RateLimiter instance
 */
export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  return new RateLimiter(config);
}

// =============================================================================
// Preset Configurations
// =============================================================================

/**
 * Common rate limit presets.
 */
export const RATE_LIMIT_PRESETS = {
  /** Conservative: 60 requests/minute */
  conservative: {
    maxRequests: 60,
    windowMs: 60000,
    strategy: 'queue' as const,
  },
  /** Standard: 100 requests/minute */
  standard: {
    maxRequests: 100,
    windowMs: 60000,
    strategy: 'queue' as const,
  },
  /** Aggressive: 300 requests/minute */
  aggressive: {
    maxRequests: 300,
    windowMs: 60000,
    strategy: 'delay' as const,
  },
  /** Burst: 30 requests/second */
  burst: {
    maxRequests: 30,
    windowMs: 1000,
    strategy: 'queue' as const,
    maxQueueSize: 50,
  },
};
