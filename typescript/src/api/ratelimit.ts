/**
 * Rate Limiting Utilities
 *
 * @module @missionfabric-js/enzyme-typescript/api/ratelimit
 * @description Rate limiting and throttling utilities for API requests
 *
 * @example
 * ```typescript
 * import { createRateLimiter, withRateLimit } from '@missionfabric-js/enzyme-typescript/api';
 *
 * const limiter = createRateLimiter({ maxRequests: 10, window: 1000 });
 *
 * await withRateLimit(limiter, async () => {
 *   return fetch('/api/data');
 * });
 * ```
 */

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Maximum number of requests */
  maxRequests: number;
  /** Time window in milliseconds */
  window: number;
  /** Strategy for handling limit exceeded */
  strategy?: 'reject' | 'queue' | 'throttle';
  /** Queue size limit (for queue strategy) */
  queueSize?: number;
}

/**
 * Rate limit state
 */
export interface RateLimitState {
  /** Number of requests made in current window */
  count: number;
  /** Window start timestamp */
  windowStart: number;
  /** Remaining requests */
  remaining: number;
  /** Time until reset (ms) */
  resetIn: number;
  /** Whether rate limit is exceeded */
  exceeded: boolean;
}

/**
 * Rate limit error
 */
export class RateLimitError extends Error {
  public readonly retryAfter: number;
  public readonly state: RateLimitState;

  constructor(message: string, retryAfter: number, state: RateLimitState) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    this.state = state;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RateLimitError);
    }

    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Rate limiter class
 */
export class RateLimiter {
  private config: Required<RateLimitConfig>;
  private count: number = 0;
  private windowStart: number = Date.now();
  private queue: Array<() => void> = [];

  constructor(config: RateLimitConfig) {
    this.config = {
      strategy: config.strategy ?? 'reject',
      queueSize: config.queueSize ?? 100,
      maxRequests: config.maxRequests,
      window: config.window,
    };
  }

  /**
   * Check if window has expired and reset if needed
   */
  private checkWindow(): void {
    const now = Date.now();
    const elapsed = now - this.windowStart;

    if (elapsed >= this.config.window) {
      this.count = 0;
      this.windowStart = now;
      this.processQueue();
    }
  }

  /**
   * Process queued requests
   */
  private processQueue(): void {
    while (this.queue.length > 0 && this.count < this.config.maxRequests) {
      const next = this.queue.shift();
      if (next) {
        this.count++;
        next();
      }
    }
  }

  /**
   * Get current rate limit state
   */
  getState(): RateLimitState {
    this.checkWindow();

    const now = Date.now();
    const elapsed = now - this.windowStart;
    const remaining = Math.max(0, this.config.maxRequests - this.count);
    const resetIn = Math.max(0, this.config.window - elapsed);

    return {
      count: this.count,
      windowStart: this.windowStart,
      remaining,
      resetIn,
      exceeded: this.count >= this.config.maxRequests,
    };
  }

  /**
   * Acquire a request slot
   */
  async acquire(): Promise<void> {
    this.checkWindow();

    const state = this.getState();

    if (!state.exceeded) {
      this.count++;
      return;
    }

    switch (this.config.strategy) {
      case 'reject':
        throw new RateLimitError(
          `Rate limit exceeded. Try again in ${state.resetIn}ms`,
          state.resetIn,
          state
        );

      case 'queue':
        if (this.queue.length >= this.config.queueSize) {
          throw new RateLimitError(
            'Rate limit queue full',
            state.resetIn,
            state
          );
        }

        return new Promise<void>((resolve) => {
          this.queue.push(resolve);

          // Set timeout to process queue when window resets
          setTimeout(() => {
            this.checkWindow();
          }, state.resetIn);
        });

      case 'throttle':
        await this.sleep(state.resetIn);
        return this.acquire();
    }
  }

  /**
   * Execute function with rate limiting
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    return fn();
  }

  /**
   * Reset rate limiter
   */
  reset(): void {
    this.count = 0;
    this.windowStart = Date.now();
    this.queue = [];
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create rate limiter
 *
 * @example
 * ```typescript
 * const limiter = createRateLimiter({
 *   maxRequests: 10,
 *   window: 1000,
 *   strategy: 'queue'
 * });
 * ```
 */
export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  return new RateLimiter(config);
}

/**
 * Execute function with rate limiting
 *
 * @example
 * ```typescript
 * const limiter = createRateLimiter({ maxRequests: 10, window: 1000 });
 *
 * const data = await withRateLimit(limiter, async () => {
 *   const response = await fetch('/api/data');
 *   return response.json();
 * });
 * ```
 */
export async function withRateLimit<T>(
  limiter: RateLimiter,
  fn: () => Promise<T>
): Promise<T> {
  return limiter.execute(fn);
}

/**
 * Token bucket rate limiter
 */
export class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillRate: number;

  /**
   * @param capacity - Maximum number of tokens
   * @param refillRate - Tokens added per second
   */
  constructor(capacity: number, refillRate: number) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Try to consume tokens
   */
  async consume(tokens: number = 1): Promise<boolean> {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    return false;
  }

  /**
   * Wait until tokens are available
   */
  async acquire(tokens: number = 1): Promise<void> {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return;
    }

    const needed = tokens - this.tokens;
    const waitTime = (needed / this.refillRate) * 1000;

    await new Promise((resolve) => setTimeout(resolve, waitTime));
    return this.acquire(tokens);
  }

  /**
   * Get available tokens
   */
  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Reset bucket
   */
  reset(): void {
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
  }
}

/**
 * Create token bucket rate limiter
 *
 * @example
 * ```typescript
 * const bucket = createTokenBucket(10, 2); // 10 capacity, 2 tokens/sec
 *
 * await bucket.acquire(); // consume 1 token
 * await bucket.acquire(5); // consume 5 tokens
 * ```
 */
export function createTokenBucket(capacity: number, refillRate: number): TokenBucket {
  return new TokenBucket(capacity, refillRate);
}

/**
 * Sliding window rate limiter
 */
export class SlidingWindowLimiter {
  private timestamps: number[] = [];
  private readonly maxRequests: number;
  private readonly window: number;

  constructor(maxRequests: number, window: number) {
    this.maxRequests = maxRequests;
    this.window = window;
  }

  /**
   * Remove expired timestamps
   */
  private cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.window;
    this.timestamps = this.timestamps.filter((ts) => ts > cutoff);
  }

  /**
   * Try to acquire a slot
   */
  async acquire(): Promise<boolean> {
    this.cleanup();

    if (this.timestamps.length < this.maxRequests) {
      this.timestamps.push(Date.now());
      return true;
    }

    return false;
  }

  /**
   * Wait and acquire a slot
   */
  async waitAndAcquire(): Promise<void> {
    this.cleanup();

    if (this.timestamps.length < this.maxRequests) {
      this.timestamps.push(Date.now());
      return;
    }

    const oldest = this.timestamps[0];
    const waitTime = oldest + this.window - Date.now();

    if (waitTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    return this.waitAndAcquire();
  }

  /**
   * Get current state
   */
  getState(): { count: number; remaining: number; oldest: number | null } {
    this.cleanup();

    return {
      count: this.timestamps.length,
      remaining: this.maxRequests - this.timestamps.length,
      oldest: this.timestamps[0] ?? null,
    };
  }

  /**
   * Reset limiter
   */
  reset(): void {
    this.timestamps = [];
  }
}

/**
 * Create sliding window rate limiter
 *
 * @example
 * ```typescript
 * const limiter = createSlidingWindowLimiter(100, 60000); // 100 req/min
 *
 * if (await limiter.acquire()) {
 *   await makeRequest();
 * }
 * ```
 */
export function createSlidingWindowLimiter(
  maxRequests: number,
  window: number
): SlidingWindowLimiter {
  return new SlidingWindowLimiter(maxRequests, window);
}

/**
 * Adaptive rate limiter that adjusts based on responses
 */
export class AdaptiveRateLimiter {
  private limiter: RateLimiter;
  private config: RateLimitConfig;
  private successCount: number = 0;
  private errorCount: number = 0;
  private adjustInterval: number;
  private minRequests: number;
  private maxRequests: number;

  constructor(
    config: RateLimitConfig & {
      adjustInterval?: number;
      minRequests?: number;
      maxRequests?: number;
    }
  ) {
    this.config = config;
    this.limiter = new RateLimiter(config);
    this.adjustInterval = config.adjustInterval ?? 10000; // 10 seconds
    this.minRequests = config.minRequests ?? Math.floor(config.maxRequests / 2);
    this.maxRequests = config.maxRequests ?? config.maxRequests * 2;

    this.startAdjustment();
  }

  /**
   * Start automatic adjustment
   */
  private startAdjustment(): void {
    setInterval(() => {
      this.adjust();
    }, this.adjustInterval);
  }

  /**
   * Adjust rate limit based on success/error ratio
   */
  private adjust(): void {
    const total = this.successCount + this.errorCount;
    if (total === 0) return;

    const errorRate = this.errorCount / total;

    if (errorRate > 0.1) {
      // More than 10% errors, decrease limit
      this.config.maxRequests = Math.max(
        this.minRequests,
        Math.floor(this.config.maxRequests * 0.8)
      );
    } else if (errorRate < 0.01) {
      // Less than 1% errors, increase limit
      this.config.maxRequests = Math.min(
        this.maxRequests,
        Math.floor(this.config.maxRequests * 1.2)
      );
    }

    // Reset counters
    this.successCount = 0;
    this.errorCount = 0;

    // Create new limiter with adjusted config
    this.limiter = new RateLimiter(this.config);
  }

  /**
   * Execute with adaptive rate limiting
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    try {
      const result = await this.limiter.execute(fn);
      this.successCount++;
      return result;
    } catch (error) {
      this.errorCount++;
      throw error;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<RateLimitConfig> {
    return { ...this.config };
  }

  /**
   * Get current state
   */
  getState(): RateLimitState & { errorRate: number } {
    const total = this.successCount + this.errorCount;
    const errorRate = total > 0 ? this.errorCount / total : 0;

    return {
      ...this.limiter.getState(),
      errorRate,
    };
  }
}

/**
 * Create adaptive rate limiter
 *
 * @example
 * ```typescript
 * const limiter = createAdaptiveRateLimiter({
 *   maxRequests: 100,
 *   window: 1000,
 *   minRequests: 50,
 *   maxRequests: 200
 * });
 * ```
 */
export function createAdaptiveRateLimiter(
  config: RateLimitConfig & {
    adjustInterval?: number;
    minRequests?: number;
    maxRequests?: number;
  }
): AdaptiveRateLimiter {
  return new AdaptiveRateLimiter(config);
}

/**
 * Parse rate limit from response headers
 *
 * @example
 * ```typescript
 * const headers = new Headers({
 *   'X-RateLimit-Limit': '100',
 *   'X-RateLimit-Remaining': '50',
 *   'X-RateLimit-Reset': '1640000000'
 * });
 *
 * const info = parseRateLimitHeaders(headers);
 * ```
 */
export interface RateLimitInfo {
  limit: number | null;
  remaining: number | null;
  reset: Date | null;
  retryAfter: number | null;
}

export function parseRateLimitHeaders(
  headers: Headers,
  prefix: string = 'X-RateLimit-'
): RateLimitInfo {
  const limit = headers.get(`${prefix}Limit`);
  const remaining = headers.get(`${prefix}Remaining`);
  const reset = headers.get(`${prefix}Reset`);
  const retryAfter = headers.get('Retry-After');

  return {
    limit: limit ? parseInt(limit, 10) : null,
    remaining: remaining ? parseInt(remaining, 10) : null,
    reset: reset ? new Date(parseInt(reset, 10) * 1000) : null,
    retryAfter: retryAfter ? parseInt(retryAfter, 10) * 1000 : null,
  };
}

/**
 * Throttle function calls
 *
 * @example
 * ```typescript
 * const throttled = throttle(
 *   async () => fetch('/api/search?q=' + query),
 *   1000
 * );
 *
 * throttled(); // executes immediately
 * throttled(); // ignored
 * throttled(); // ignored
 * // ... after 1000ms, next call will execute
 * ```
 */
export function throttle<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  wait: number
): T {
  let lastCall = 0;
  let timeout: NodeJS.Timeout | null = null;

  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall >= wait) {
      lastCall = now;
      return fn(...args);
    }

    if (timeout) {
      clearTimeout(timeout);
    }

    return new Promise((resolve) => {
      timeout = setTimeout(() => {
        lastCall = Date.now();
        resolve(fn(...args));
      }, wait - timeSinceLastCall);
    });
  }) as T;
}

/**
 * Debounce function calls
 *
 * @example
 * ```typescript
 * const debounced = debounce(
 *   async (query: string) => fetch('/api/search?q=' + query),
 *   500
 * );
 *
 * debounced('a'); // cancelled
 * debounced('ab'); // cancelled
 * debounced('abc'); // executes after 500ms
 * ```
 */
export function debounce<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  wait: number
): T {
  let timeout: NodeJS.Timeout | null = null;

  return ((...args: Parameters<T>): Promise<ReturnType<T>> => {
    if (timeout) {
      clearTimeout(timeout);
    }

    return new Promise((resolve) => {
      timeout = setTimeout(() => {
        resolve(fn(...args));
      }, wait);
    });
  }) as T;
}
