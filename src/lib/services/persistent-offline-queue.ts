/**
 * @file Persistent Offline Queue
 * @description IndexedDB-backed queue for offline request persistence
 *
 * This module provides a robust offline queue that persists requests to
 * IndexedDB, ensuring they survive page refreshes and are automatically
 * processed when the network becomes available.
 */

import { networkMonitor } from '../utils/networkStatus';
import { ErrorReporter } from '../monitoring/ErrorReporter';
import { globalEventBus } from '../shared/event-utils';

// ============================================================================
// Types
// ============================================================================

/**
 * Queue item status
 */
export type QueueItemStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired';

/**
 * Serialized request for storage
 */
export interface QueuedRequest {
  /** Unique request ID */
  id: string;
  /** Request URL */
  url: string;
  /** HTTP method */
  method: string;
  /** Request headers */
  headers: Record<string, string>;
  /** Request body (serialized) */
  body: string | null;
  /** Creation timestamp */
  createdAt: number;
  /** Expiration timestamp */
  expiresAt: number;
  /** Request priority (higher = more important) */
  priority: number;
  /** Current retry count */
  retryCount: number;
  /** Maximum retries allowed */
  maxRetries: number;
  /** Current status */
  status: QueueItemStatus;
  /** Last error message if failed */
  lastError?: string | undefined;
  /** Additional metadata */
  metadata?: Record<string, unknown> | undefined;
}

/**
 * Queue options
 */
export interface OfflineQueueOptions {
  /** Database name */
  dbName?: string;
  /** Store name */
  storeName?: string;
  /** Default expiration time in ms (default: 24 hours) */
  defaultExpiration?: number;
  /** Maximum queue size */
  maxQueueSize?: number;
  /** Maximum retries per request */
  maxRetries?: number;
  /** Base retry delay in ms */
  retryDelayBase?: number;
  /** Number of requests to process at once */
  batchSize?: number;
  /** Automatically process queue when online */
  autoProcess?: boolean;
}

/**
 * Enqueue options
 */
export interface EnqueueOptions {
  /** Request priority (default: 0) */
  priority?: number;
  /** Custom expiration time in ms */
  expiration?: number;
  /** Custom max retries */
  maxRetries?: number;
  /** Additional metadata to store */
  metadata?: Record<string, unknown>;
}

/**
 * Queue statistics
 */
export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}

/**
 * Queue events for the event bus
 */
export interface OfflineQueueEvents {
  'offlineQueue:enqueued': { id: string; url: string };
  'offlineQueue:completed': { id: string; url: string };
  'offlineQueue:failed': { id: string; url: string; error: string; retriesExhausted?: boolean };
  'offlineQueue:expired': { id: string; url: string };
  'offlineQueue:processing': { count: number };
}

// Extend global events
// declare module '../utils/eventEmitter' {
//   // eslint-disable-next-line @typescript-eslint/no-empty-object-type
//   interface GlobalEvents extends OfflineQueueEvents {}
// }

// ============================================================================
// IndexedDB Wrapper
// ============================================================================

/**
 * Simple IndexedDB wrapper for the offline queue
 */
class QueueDatabase {
  private readonly dbName: string;
  private readonly storeName: string;
  private db: IDBDatabase | null = null;
  private dbVersion = 1;

  constructor(dbName: string, storeName: string) {
    this.dbName = dbName;
    this.storeName = storeName;
  }

  /**
   * Open the database
   */
  async open(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('priority', 'priority', { unique: false });
          store.createIndex('expiresAt', 'expiresAt', { unique: false });
        }
      };
    });
  }

  /**
   * Close the database
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Add an item
   */
  async add(item: QueuedRequest): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore('readwrite');
      const request = store.add(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(request.error?.message ?? 'Failed to add item'));
    });
  }

  /**
   * Update an item
   */
  async put(item: QueuedRequest): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore('readwrite');
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(request.error?.message ?? 'Failed to put item'));
    });
  }

  /**
   * Get an item by ID
   */
  async get(id: string): Promise<QueuedRequest | undefined> {
    return new Promise((resolve, reject) => {
      const store = this.getStore('readonly');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result as QueuedRequest | undefined);
      request.onerror = () => reject(new Error(request.error?.message ?? 'Failed to get item'));
    });
  }

  /**
   * Delete an item
   */
  async delete(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore('readwrite');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(request.error?.message ?? 'Failed to delete item'));
    });
  }

  /**
   * Get all items
   */
  async getAll(): Promise<QueuedRequest[]> {
    return new Promise((resolve, reject) => {
      const store = this.getStore('readonly');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as QueuedRequest[]);
      request.onerror = () => reject(new Error(request.error?.message ?? 'Failed to get all items'));
    });
  }

  /**
   * Get items by status
   */
  async getByStatus(status: QueueItemStatus, limit?: number): Promise<QueuedRequest[]> {
    return new Promise((resolve, reject) => {
      const store = this.getStore('readonly');
      const index = store.index('status');
      const request = index.getAll(status, limit);
      request.onsuccess = () => resolve(request.result as QueuedRequest[]);
      request.onerror = () => reject(new Error(request.error?.message ?? 'Failed to get by status'));
    });
  }

  /**
   * Count items by status
   */
  async countByStatus(status: QueueItemStatus): Promise<number> {
    return new Promise((resolve, reject) => {
      const store = this.getStore('readonly');
      const index = store.index('status');
      const request = index.count(status);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(request.error?.message ?? 'Failed to count by status'));
    });
  }

  /**
   * Count all items
   */
  async count(): Promise<number> {
    return new Promise((resolve, reject) => {
      const store = this.getStore('readonly');
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(request.error?.message ?? 'Failed to count'));
    });
  }

  /**
   * Clear all items
   */
  async clear(): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore('readwrite');
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(request.error?.message ?? 'Failed to clear'));
    });
  }

  /**
   * Delete expired items
   */
  async deleteExpired(now: number): Promise<number> {
    const items = await this.getAll();
    const expired = items.filter((item) => item.expiresAt < now);

    for (const item of expired) {
      await this.delete(item.id);
      globalEventBus.emitSync('offlineQueue:expired', {
        id: item.id,
        url: item.url,
      });
    }

    return expired.length;
  }

  /**
   * Get transaction store
   */
  private getStore(mode: IDBTransactionMode): IDBObjectStore {
    if (!this.db) {
      throw new Error('Database not open');
    }
    const transaction = this.db.transaction(this.storeName, mode);
    return transaction.objectStore(this.storeName);
  }
}

// ============================================================================
// Persistent Offline Queue
// ============================================================================

const DEFAULT_OPTIONS: Required<OfflineQueueOptions> = {
  dbName: 'offline-queue',
  storeName: 'requests',
  defaultExpiration: 24 * 60 * 60 * 1000, // 24 hours
  maxQueueSize: 1000,
  maxRetries: 5,
  retryDelayBase: 1000,
  batchSize: 10,
  autoProcess: true,
};

/**
 * Persistent offline queue backed by IndexedDB
 *
 * @example
 * ```tsx
 * const queue = new PersistentOfflineQueue();
 * await queue.init();
 *
 * // Enqueue a request when offline
 * const request = new Request('/api/data', {
 *   method: 'POST',
 *   body: JSON.stringify(data)
 * });
 * await queue.enqueue(request, { priority: 1 });
 *
 * // Queue is automatically processed when online
 * ```
 */
export class PersistentOfflineQueue {
  private options: Required<OfflineQueueOptions>;
  private db: QueueDatabase | null = null;
  private isProcessing = false;
  private unsubscribe: (() => void) | null = null;
  private initialized = false;

  constructor(options: OfflineQueueOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Initialize the queue (must be called before use)
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    this.db = new QueueDatabase(this.options.dbName, this.options.storeName);
    await this.db.open();
    this.initialized = true;

    // Listen for online events if autoProcess is enabled
    if (this.options.autoProcess) {
      this.unsubscribe = networkMonitor.onStatusChange((status) => {
        if (status.online) {
          void this.processQueue();
        }
      });
    }

    // Clean expired items on init
    await this.cleanExpired();

    // Process queue if we're online
    if (networkMonitor.isOnline() && this.options.autoProcess) {
      void this.processQueue();
    }
  }

  /**
   * Add a request to the queue
   *
   * @param request - Request to queue
   * @param options - Enqueue options
   * @returns The queued request ID
   */
  async enqueue(request: Request, options?: EnqueueOptions): Promise<string> {
    const db = this.getDb();

    // Check queue size
    const count = await db.count();
    if (count >= this.options.maxQueueSize) {
      throw new Error('Offline queue is full');
    }

    const id = crypto.randomUUID();
    const now = Date.now();

    // Clone and serialize request
    const clonedRequest = request.clone();
    let body: string | null = null;

    if (request.body) {
      body = await clonedRequest.text();
    }

    const item: QueuedRequest = {
      id,
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body,
      createdAt: now,
      expiresAt: now + (options?.expiration ?? this.options.defaultExpiration),
      priority: options?.priority ?? 0,
      retryCount: 0,
      maxRetries: options?.maxRetries ?? this.options.maxRetries,
      status: 'pending',
      metadata: options?.metadata,
    };

    await db.add(item);

    globalEventBus.emitSync('offlineQueue:enqueued', { id, url: item.url });

    // Try processing if online
    if (networkMonitor.isOnline() && this.options.autoProcess) {
      void this.processQueue();
    }

    return id;
  }

  /**
   * Process pending requests in the queue
   */
  async processQueue(): Promise<void> {
    const db = this.getDb();

    if (this.isProcessing || !networkMonitor.isOnline()) {
      return;
    }

    this.isProcessing = true;

    try {
      // Clean expired first
      await this.cleanExpired();

      // Get pending items sorted by priority
      const pending = await db.getByStatus('pending', this.options.batchSize);

      // Sort by priority (higher first), then by creation time
      pending.sort((a, b) => {
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        return a.createdAt - b.createdAt;
      });

      if (pending.length > 0) {
        globalEventBus.emitSync('offlineQueue:processing', { count: pending.length });
      }

      for (const item of pending) {
        if (!networkMonitor.isOnline()) break;

        await this.processItem(item);
      }
    } finally {
      this.isProcessing = false;
    }

    // Check for more pending items
    const remaining = await this.getPendingCount();
    if (remaining > 0 && networkMonitor.isOnline()) {
      // Schedule next batch with a small delay
      setTimeout(() => void this.processQueue(), 100);
    }
  }

  /**
   * Get count of pending items
   */
  async getPendingCount(): Promise<number> {
    return this.getDb().countByStatus('pending');
  }

  /**
   * Get all items in the queue
   */
  async getAll(): Promise<QueuedRequest[]> {
    return this.getDb().getAll();
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<QueueStats> {
    const db = this.getDb();

    const [pending, processing, completed, failed] = await Promise.all([
      db.countByStatus('pending'),
      db.countByStatus('processing'),
      db.countByStatus('completed'),
      db.countByStatus('failed'),
    ]);

    return {
      pending,
      processing,
      completed,
      failed,
      total: pending + processing + completed + failed,
    };
  }

  /**
   * Remove an item from the queue
   */
  async remove(id: string): Promise<void> {
    await this.getDb().delete(id);
  }

  /**
   * Clear all items from the queue
   */
  async clear(): Promise<void> {
    await this.getDb().clear();
  }

  /**
   * Retry a failed item
   */
  async retryFailed(id: string): Promise<void> {
    const db = this.getDb();

    const item = await db.get(id);
    if (item?.status === 'failed') {
      await db.put({
        ...item,
        status: 'pending',
        retryCount: 0,
        expiresAt: Date.now() + this.options.defaultExpiration,
      });

      if (networkMonitor.isOnline()) {
        void this.processQueue();
      }
    }
  }

  /**
   * Retry all failed items
   */
  async retryAllFailed(): Promise<number> {
    const db = this.getDb();

    const failed = await db.getByStatus('failed');
    const now = Date.now();

    for (const item of failed) {
      await db.put({
        ...item,
        status: 'pending',
        retryCount: 0,
        expiresAt: now + this.options.defaultExpiration,
      });
    }

    if (networkMonitor.isOnline() && failed.length > 0) {
      void this.processQueue();
    }

    return failed.length;
  }

  /**
   * Check if the queue is empty
   */
  async isEmpty(): Promise<boolean> {
    const count = await this.getDb().count();
    return count === 0;
  }

  /**
   * Check if queue is currently processing
   */
  isQueueProcessing(): boolean {
    return this.isProcessing;
  }

  /**
   * Force process the queue (even if already processing)
   */
  async forceProcess(): Promise<void> {
    this.isProcessing = false;
    await this.processQueue();
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.unsubscribe?.();
    this.db?.close();
    this.db = null;
    this.initialized = false;
  }

  /**
   * Ensure the queue is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.db) {
      throw new Error('Queue not initialized. Call init() first.');
    }
  }

  /**
   * Get the database instance (throws if not initialized)
   */
  private getDb(): QueueDatabase {
    this.ensureInitialized();
    return this.db as QueueDatabase;
  }

  /**
   * Process a single queue item
   *
   * Note: This method intentionally uses raw fetch() rather than apiClient because:
   * 1. Queued requests store their own headers/method/body from the original request
   * 2. The offline queue replays exact requests that were made when offline
   * 3. Using apiClient would re-apply interceptors/auth that may have changed
   *
   * @see {@link @/lib/api/api-client} for making new API calls
   */
  private async processItem(item: QueuedRequest): Promise<void> {
    this.ensureInitialized();

    // Mark as processing
    await this.updateStatus(item.id, 'processing');

    try {
      // Raw fetch is intentional - replay exact request stored in queue
      const response = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body ?? null,
      });

      if (response.ok) {
        await this.updateStatus(item.id, 'completed');
        globalEventBus.emitSync('offlineQueue:completed', {
          id: item.id,
          url: item.url,
          response: response.status,
        });
      } else if (response.status >= 400 && response.status < 500) {
        // Client error - don't retry
        await this.updateStatus(item.id, 'failed', `HTTP ${response.status}`);
        globalEventBus.emitSync('offlineQueue:failed', {
          id: item.id,
          url: item.url,
          error: new Error(`HTTP ${response.status}`),
        });
      } else {
        // Server error - retry
        await this.handleRetry(item, `HTTP ${response.status}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.handleRetry(item, errorMessage);
    }
  }

  /**
   * Handle retry logic for failed requests
   */
  private async handleRetry(item: QueuedRequest, error: string): Promise<void> {
    this.ensureInitialized();

    const newRetryCount = item.retryCount + 1;

    if (newRetryCount >= item.maxRetries) {
      await this.updateStatus(item.id, 'failed', error);

      globalEventBus.emitSync('offlineQueue:failed', {
        id: item.id,
        url: item.url,
        error: new Error(error),
        // retriesExhausted: true,
      });

      // Report to error monitoring
      ErrorReporter.reportError(new Error(`Offline request failed: ${error}`), {
        action: 'offline_queue_failed',
        metadata: {
          id: item.id,
          url: item.url,
          method: item.method,
          retryCount: item.retryCount,
          createdAt: new Date(item.createdAt).toISOString(),
        },
      });
    } else {
      // Update retry count and reset to pending
      const updatedItem: QueuedRequest = {
        ...item,
        retryCount: newRetryCount,
        status: 'pending',
        lastError: error,
      };
      await this.getDb().put(updatedItem);

      // Schedule retry with exponential backoff
      const delay = this.options.retryDelayBase * Math.pow(2, newRetryCount);
      setTimeout(() => void this.processQueue(), delay);
    }
  }

  /**
   * Update item status
   */
  private async updateStatus(
    id: string,
    status: QueueItemStatus,
    error?: string
  ): Promise<void> {
    const db = this.getDb();

    const item = await db.get(id);
    if (item) {
      await db.put({
        ...item,
        status,
        ...(error !== undefined && { lastError: error }),
      });
    }
  }

  /**
   * Clean expired items
   */
  private async cleanExpired(): Promise<void> {
    await this.getDb().deleteExpired(Date.now());
  }
}

/**
 * Global offline queue instance
 */
export const offlineQueue = new PersistentOfflineQueue();
