/**
 * @file Request Queue
 * @description Enterprise-grade request queue with batching, rate limiting,
 * priority queuing, and deduplication
 */

import { Semaphore, sleep, defer, type Deferred } from '../shared/async-utils';

// Ensure setTimeout is available in all environments
// Timeout function for cross-platform compatibility
// const timeoutFn = typeof setTimeout !== 'undefined' ? setTimeout : (globalThis as any).setTimeout;

/**
 * Request priority levels
 */
export type RequestPriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * Priority weights
 */
const PRIORITY_WEIGHTS: Record<RequestPriority, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
};

/**
 * Queue item
 */
interface QueueItem<T> {
  id: string;
  execute: () => Promise<T>;
  priority: RequestPriority;
  deferred: Deferred<T>;
  createdAt: number;
  retries: number;
  maxRetries: number;
  timeout?: number;
  dedupKey?: string;
}

/**
 * Request queue configuration
 */
export interface RequestQueueConfig {
  /** Maximum concurrent requests */
  concurrency?: number;
  /** Maximum queue size */
  maxQueueSize?: number;
  /** Default priority */
  defaultPriority?: RequestPriority;
  /** Default max retries */
  maxRetries?: number;
  /** Retry delay (ms) */
  retryDelay?: number;
  /** Request timeout (ms) */
  timeout?: number;
  /** Enable deduplication */
  deduplication?: boolean;
}

/**
 * Request queue for managing concurrent requests
 */
export class RequestQueue {
  private queue: QueueItem<unknown>[] = [];
  private processing = false;
  private semaphore: Semaphore;
  private config: Required<RequestQueueConfig>;
  private dedupMap: Map<string, Deferred<unknown>> = new Map();
  private paused = false;

  constructor(config: RequestQueueConfig = {}) {
    this.config = {
      concurrency: config.concurrency ?? 5,
      maxQueueSize: config.maxQueueSize ?? 100,
      defaultPriority: config.defaultPriority ?? 'normal',
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      timeout: config.timeout ?? 30000,
      deduplication: config.deduplication ?? true,
    };

    this.semaphore = new Semaphore(this.config.concurrency);
  }

  /**
   * Add request to queue
   */
  async enqueue<T>(
    execute: () => Promise<T>,
    options?: {
      priority?: RequestPriority;
      maxRetries?: number;
      timeout?: number;
      dedupKey?: string;
      id?: string;
    }
  ): Promise<T> {
    const dedupKey = options?.dedupKey;

    // Check for duplicate request
    if (this.config.deduplication && dedupKey !== undefined && dedupKey !== '') {
      const existing = this.dedupMap.get(dedupKey);
      if (existing !== undefined) {
        return existing.promise as Promise<T>;
      }
    }

    // Check queue size
    if (this.queue.length >= this.config.maxQueueSize) {
      return Promise.reject(new Error('Request queue is full'));
    }

    const deferred = defer<T>();
    const item: QueueItem<T> = {
      id: options?.id ?? crypto.randomUUID(),
      execute,
      priority: options?.priority ?? this.config.defaultPriority,
      deferred,
      createdAt: Date.now(),
      retries: 0,
      maxRetries: options?.maxRetries ?? this.config.maxRetries,
      timeout: options?.timeout ?? this.config.timeout,
      dedupKey,
    };

    // Add to dedup map
    if (dedupKey !== undefined && dedupKey !== null && dedupKey !== '') {
      this.dedupMap.set(dedupKey, deferred as Deferred<unknown>);
    }

    // Insert based on priority
    this.insertByPriority(item as QueueItem<unknown>);

    // Start processing if not already
    if (!this.processing && !this.paused) {
      void this.process();
    }

    return deferred.promise;
  }

  /**
   * Pause queue processing
   */
  pause(): void {
    this.paused = true;
  }

  /**
   * Resume queue processing
   */
  resume(): void {
    this.paused = false;
    if (this.queue.length > 0) {
      void this.process();
    }
  }

  /**
   * Clear queue
   */
  clear(error?: Error): void {
    const clearError = error ?? new Error('Queue cleared');
    for (const item of this.queue) {
      item.deferred.reject(clearError);
      if (item.dedupKey !== undefined && item.dedupKey !== '') {
        this.dedupMap.delete(item.dedupKey);
      }
    }
    this.queue = [];
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    queued: number;
    processing: number;
    maxConcurrency: number;
    paused: boolean;
  } {
    return {
      queued: this.queue.length,
      processing: this.config.concurrency - this.semaphore.availablePermits(),
      maxConcurrency: this.config.concurrency,
      paused: this.paused,
    };
  }

  /**
   * Remove item from queue by id
   */
  remove(id: string): boolean {
    const index = this.queue.findIndex((item) => item.id === id);
    if (index !== -1) {
      const item = this.queue[index];
      if (item !== undefined) {
        item.deferred.reject(new Error('Request removed from queue'));
        if (item.dedupKey !== undefined && item.dedupKey !== '') {
          this.dedupMap.delete(item.dedupKey);
        }
      }
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Insert item by priority
   */
  private insertByPriority(item: QueueItem<unknown>): void {
    const weight = PRIORITY_WEIGHTS[item.priority];
    let inserted = false;

    for (let i = 0; i < this.queue.length; i++) {
      const queueItem = this.queue[i];
      if (queueItem && PRIORITY_WEIGHTS[queueItem.priority] < weight) {
        this.queue.splice(i, 0, item);
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      this.queue.push(item);
    }
  }

  /**
   * Process queue
   */
  private process(): void {
    if (this.processing || this.paused) return;
    this.processing = true;

    while (this.queue.length > 0 && !this.paused) {
      const item = this.queue.shift();
      if (item === undefined) continue;

      // Process item with semaphore
      void this.processItem(item);
    }

    this.processing = false;
  }

  /**
   * Process single item
   */
  private async processItem(item: QueueItem<unknown>): Promise<void> {
    const release = await this.semaphore.acquire();

    try {
      const result = await this.executeWithTimeout(item);
      item.deferred.resolve(result);
    } catch (error) {
      // Retry logic
      if (item.retries < item.maxRetries) {
        item.retries++;
        await sleep(this.config.retryDelay * item.retries);
        this.insertByPriority(item);
      } else {
        item.deferred.reject(error);
      }
    } finally {
      release();

      // Clean up dedup map
      if (item.dedupKey !== undefined && item.dedupKey !== null && item.dedupKey !== '') {
        this.dedupMap.delete(item.dedupKey);
      }

      // Continue processing
      if (!this.paused && this.queue.length > 0 && !this.processing) {
        void this.process();
      }
    }
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(item: QueueItem<T>): Promise<T> {
    return Promise.race([
      item.execute(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), item.timeout)
      ),
    ]);
  }
}

/**
 * Rate limiter configuration
 */
export interface RateLimiterConfig {
  /** Maximum requests per window */
  maxRequests: number;
  /** Window duration (ms) */
  windowMs: number;
  /** Strategy when limit reached */
  strategy?: 'queue' | 'reject' | 'delay';
  /** Maximum queue size (for queue strategy) */
  maxQueueSize?: number;
}

/**
 * Rate limiter for controlling request rate
 */
export class RateLimiter {
  private requests: number[] = [];
  private config: Required<RateLimiterConfig>;
  private queue: Array<{
    execute: () => void;
    reject: (error: Error) => void;
  }> = [];

  constructor(config: RateLimiterConfig) {
    this.config = {
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
      strategy: config.strategy ?? 'delay',
      maxQueueSize: config.maxQueueSize ?? 100,
    };
  }

  /**
   * Acquire rate limit slot
   */
  async acquire(): Promise<() => void> {
    if (this.isAllowed()) {
      const timestamp = Date.now();
      this.requests.push(timestamp);
      return () => {
        const index = this.requests.indexOf(timestamp);
        if (index !== -1) {
          this.requests.splice(index, 1);
        }
        this.processQueue();
      };
    }

    switch (this.config.strategy) {
      case 'reject':
        throw new RateLimitError('Rate limit exceeded', this.getWaitTime());

      case 'queue': {
        if (this.queue.length >= this.config.maxQueueSize) {
          throw new RateLimitError('Rate limit queue full', this.getWaitTime());
        }

        return new Promise((resolve, reject) => {
          this.queue.push({
            execute: () => {
              const timestamp = Date.now();
              this.requests.push(timestamp);
              resolve(() => {
                const index = this.requests.indexOf(timestamp);
                if (index !== -1) {
                  this.requests.splice(index, 1);
                }
                this.processQueue();
              });
            },
            reject,
          });
        });
      }

      case 'delay':
      default: {
        const waitTime = this.getWaitTime();
        await sleep(waitTime);
        return this.acquire();
      }
    }
  }

  /**
   * Execute with rate limiting
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const release = await this.acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  }

  /**
   * Get rate limit status
   */
  getStatus(): {
    remaining: number;
    limit: number;
    resetMs: number;
    queued: number;
  } {
    this.cleanOldRequests();
    const oldestRequest = this.requests.length > 0 ? Math.min(...this.requests) : 0;

    return {
      remaining: Math.max(0, this.config.maxRequests - this.requests.length),
      limit: this.config.maxRequests,
      resetMs: oldestRequest ? oldestRequest + this.config.windowMs - Date.now() : 0,
      queued: this.queue.length,
    };
  }

  /**
   * Clear rate limit
   */
  clear(): void {
    this.requests = [];
    const error = new Error('Rate limiter cleared');
    for (const item of this.queue) {
      item.reject(error);
    }
    this.queue = [];
  }

  /**
   * Check if request is allowed
   */
  private isAllowed(): boolean {
    this.cleanOldRequests();
    return this.requests.length < this.config.maxRequests;
  }

  /**
   * Clean requests outside window
   */
  private cleanOldRequests(): void {
    const cutoff = Date.now() - this.config.windowMs;
    this.requests = this.requests.filter((time) => time > cutoff);
  }

  /**
   * Get time until next available slot
   */
  private getWaitTime(): number {
    if (this.isAllowed()) return 0;

    this.cleanOldRequests();
    if (this.requests.length === 0) return 0;

    const oldestRequest = Math.min(...this.requests);
    return Math.max(0, oldestRequest + this.config.windowMs - Date.now());
  }

  /**
   * Process queued requests
   */
  private processQueue(): void {
    if (this.queue.length === 0) return;

    const waitTime = this.getWaitTime();
    if (waitTime > 0) {
      // Schedule check for next available slot
      setTimeout(() => this.processQueue(), waitTime);
    }
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends Error {
  readonly isRateLimitError = true;
  readonly retryAfterMs: number;

  constructor(message: string, retryAfterMs: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Request batcher configuration
 */
export interface BatcherConfig<K, V> {
  /** Maximum batch size */
  maxBatchSize?: number;
  /** Maximum wait time (ms) */
  maxWaitMs?: number;
  /** Batch executor */
  batchFn: (keys: K[]) => Promise<Map<K, V> | V[]>;
}

/**
 * Request batcher for combining multiple requests
 */
export class RequestBatcher<K, V> {
  private batch: Map<K, Deferred<V>> = new Map();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private config: Required<Omit<BatcherConfig<K, V>, 'batchFn'>> & Pick<BatcherConfig<K, V>, 'batchFn'>;

  constructor(config: BatcherConfig<K, V>) {
    this.config = {
      maxBatchSize: config.maxBatchSize ?? 50,
      maxWaitMs: config.maxWaitMs ?? 10,
      batchFn: config.batchFn,
    };
  }

  /**
   * Load a single item
   */
  async load(key: K): Promise<V> {
    // Check for existing request
    const existing = this.batch.get(key);
    if (existing) {
      return existing.promise;
    }

    // Create new deferred
    const deferred = defer<V>();
    this.batch.set(key, deferred);

    // Schedule batch execution
    this.scheduleBatch();

    // Check if batch is full
    if (this.batch.size >= this.config.maxBatchSize) {
      void this.executeBatch();
    }

    return deferred.promise;
  }

  /**
   * Load multiple items
   */
  async loadMany(keys: K[]): Promise<(V | Error)[]> {
    return Promise.all(
      keys.map(async (key) =>
        this.load(key).catch((error) => error as Error)
      )
    );
  }

  /**
   * Clear pending batch
   */
  clear(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const error = new Error('Batcher cleared');
    for (const [, deferred] of this.batch) {
      deferred.reject(error);
    }
    this.batch.clear();
  }

  /**
   * Get pending count
   */
  getPendingCount(): number {
    return this.batch.size;
  }

  /**
   * Schedule batch execution
   */
  private scheduleBatch(): void {
    if (this.timer) return;

    this.timer = setTimeout(() => {
      void this.executeBatch();
    }, this.config.maxWaitMs);
  }

  /**
   * Execute batch
   */
  private async executeBatch(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.batch.size === 0) return;

    // Get current batch
    const currentBatch = new Map(this.batch);
    this.batch.clear();

    const keys = Array.from(currentBatch.keys());

    try {
      const result = await this.config.batchFn(keys);

      // Handle Map or Array result
      if (result instanceof Map) {
        for (const [key, deferred] of currentBatch) {
          const value = result.get(key);
          if (value !== undefined) {
            deferred.resolve(value);
          } else {
            deferred.reject(new Error(`No result for key: ${String(key)}`));
          }
        }
      } else {
        // Array result - assume same order as keys
        let i = 0;
        for (const [, deferred] of currentBatch) {
          const resultValue = result[i];
          if (i < result.length && resultValue !== undefined) {
            deferred.resolve(resultValue);
          } else {
            deferred.reject(new Error('Result array too short'));
          }
          i++;
        }
      }
    } catch (error) {
      // Reject all pending requests
      for (const [, deferred] of currentBatch) {
        deferred.reject(error as Error);
      }
    }
  }
}

/**
 * Create a global request queue instance
 */
export const globalRequestQueue = new RequestQueue();

/**
 * Create a rate limiter with common presets
 */
export const rateLimiters = {
  /** Standard API rate limiter (100 req/min) */
  standard: (): RateLimiter => new RateLimiter({ maxRequests: 100, windowMs: 60000 }),

  /** Burst rate limiter (10 req/sec) */
  burst: (): RateLimiter => new RateLimiter({ maxRequests: 10, windowMs: 1000 }),

  /** Strict rate limiter (1 req/sec) */
  strict: (): RateLimiter => new RateLimiter({ maxRequests: 1, windowMs: 1000 }),

  /** Custom rate limiter */
  custom: (maxRequests: number, windowMs: number, strategy?: RateLimiterConfig['strategy']): RateLimiter =>
    new RateLimiter({ maxRequests, windowMs, strategy }),
};
