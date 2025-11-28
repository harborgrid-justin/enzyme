/**
 * @file Prefetch Queue
 * @description Priority-based prefetch queue with rate limiting, deduplication,
 * and network-aware throttling.
 *
 * Features:
 * - Priority-based scheduling
 * - Rate limiting
 * - Deduplication
 * - Network-aware throttling
 * - Progress tracking
 * - Cancellation support
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Prefetch priority levels
 */
export type PrefetchPriority = 'critical' | 'high' | 'normal' | 'low' | 'idle';

/**
 * Prefetch item status
 */
export type PrefetchStatus =
  | 'pending'
  | 'loading'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Prefetch item
 */
export interface PrefetchItem {
  id: string;
  url: string;
  type: 'document' | 'script' | 'style' | 'image' | 'font' | 'fetch';
  priority: PrefetchPriority;
  status: PrefetchStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  size?: number;
  error?: Error;
  retryCount: number;
  metadata?: Record<string, unknown>;
}

/**
 * Queue configuration
 */
export interface PrefetchQueueConfig {
  /** Maximum concurrent prefetches */
  maxConcurrent: number;
  /** Maximum queue size */
  maxQueueSize: number;
  /** Maximum retry attempts */
  maxRetries: number;
  /** Retry delay in ms */
  retryDelay: number;
  /** Enable network-aware throttling */
  networkAware: boolean;
  /** Concurrent limits by network type */
  concurrentByNetwork: Record<string, number>;
  /** Enable deduplication */
  deduplicate: boolean;
  /** Time-to-live for completed items in ms */
  completedTTL: number;
  /** Enable priority boosting for aged items */
  priorityBoost: boolean;
  /** Age threshold for priority boost in ms */
  boostAgeThreshold: number;
  /** Debug mode */
  debug: boolean;
}

/**
 * Queue statistics
 */
export interface QueueStats {
  pending: number;
  loading: number;
  completed: number;
  failed: number;
  cancelled: number;
  totalSize: number;
  averageLoadTime: number;
}

/**
 * Queue event types
 */
export type QueueEventType =
  | 'enqueue'
  | 'start'
  | 'complete'
  | 'fail'
  | 'cancel'
  | 'drain';

/**
 * Queue event listener
 */
export type QueueEventListener = (
  type: QueueEventType,
  item: PrefetchItem
) => void;

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: PrefetchQueueConfig = {
  maxConcurrent: 4,
  maxQueueSize: 100,
  maxRetries: 2,
  retryDelay: 1000,
  networkAware: true,
  concurrentByNetwork: {
    '4g': 4,
    '3g': 2,
    '2g': 1,
    'slow-2g': 1,
  },
  deduplicate: true,
  completedTTL: 60000, // 1 minute
  priorityBoost: true,
  boostAgeThreshold: 5000, // 5 seconds
  debug: false,
};

const PRIORITY_VALUES: Record<PrefetchPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
  idle: 4,
};

// ============================================================================
// Prefetch Queue
// ============================================================================

/**
 * Priority-based prefetch queue
 */
export class PrefetchQueue {
  private config: PrefetchQueueConfig;
  private items: Map<string, PrefetchItem> = new Map();
  private activeCount = 0;
  private listeners: Set<QueueEventListener> = new Set();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private idCounter = 0;
  private paused = false;

  constructor(config: Partial<PrefetchQueueConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanup();
  }

  /**
   * Enqueue a prefetch item
   */
  enqueue(
    url: string,
    options: {
      type?: PrefetchItem['type'];
      priority?: PrefetchPriority;
      metadata?: Record<string, unknown>;
    } = {}
  ): string | null {
    // Check deduplication
    if (this.config.deduplicate) {
      const existing = this.findByUrl(url);
      if (existing && existing.status !== 'failed') {
        this.log(`Skipping duplicate URL: ${url}`);
        return existing.id;
      }
    }

    // Check queue size
    if (this.getPendingCount() >= this.config.maxQueueSize) {
      this.log(`Queue full, dropping: ${url}`);
      return null;
    }

    const id = this.generateId();
    const item: PrefetchItem = {
      id,
      url,
      type: options.type || 'document',
      priority: options.priority || 'normal',
      status: 'pending',
      createdAt: Date.now(),
      retryCount: 0,
      metadata: options.metadata,
    };

    this.items.set(id, item);
    this.log(`Enqueued: ${url} (priority: ${item.priority})`);
    this.notifyListeners('enqueue', item);

    // Process queue
    this.processQueue();

    return id;
  }

  /**
   * Enqueue multiple items
   */
  enqueueMany(
    items: Array<{
      url: string;
      type?: PrefetchItem['type'];
      priority?: PrefetchPriority;
      metadata?: Record<string, unknown>;
    }>
  ): string[] {
    const ids: string[] = [];

    for (const item of items) {
      const id = this.enqueue(item.url, item);
      if (id) {
        ids.push(id);
      }
    }

    return ids;
  }

  /**
   * Cancel a prefetch item
   */
  cancel(id: string): boolean {
    const item = this.items.get(id);
    if (!item || item.status === 'completed' || item.status === 'cancelled') {
      return false;
    }

    item.status = 'cancelled';
    item.completedAt = Date.now();

    if (item.status === 'cancelled') {
      this.activeCount--;
    }

    this.log(`Cancelled: ${item.url}`);
    this.notifyListeners('cancel', item);

    return true;
  }

  /**
   * Cancel all pending items
   */
  cancelAll(): number {
    let cancelled = 0;

    for (const item of this.items.values()) {
      if (item.status === 'pending') {
        item.status = 'cancelled';
        item.completedAt = Date.now();
        cancelled++;
        this.notifyListeners('cancel', item);
      }
    }

    this.log(`Cancelled ${cancelled} items`);
    return cancelled;
  }

  /**
   * Pause the queue
   */
  pause(): void {
    this.paused = true;
    this.log('Queue paused');
  }

  /**
   * Resume the queue
   */
  resume(): void {
    this.paused = false;
    this.log('Queue resumed');
    this.processQueue();
  }

  /**
   * Check if paused
   */
  isPaused(): boolean {
    return this.paused;
  }

  /**
   * Get item by ID
   */
  getItem(id: string): PrefetchItem | undefined {
    return this.items.get(id);
  }

  /**
   * Get item by URL
   */
  findByUrl(url: string): PrefetchItem | undefined {
    for (const item of this.items.values()) {
      if (item.url === url) {
        return item;
      }
    }
    return undefined;
  }

  /**
   * Check if URL is queued or completed
   */
  has(url: string): boolean {
    const item = this.findByUrl(url);
    return item !== undefined && item.status !== 'cancelled';
  }

  /**
   * Check if URL was successfully prefetched
   */
  isPrefetched(url: string): boolean {
    const item = this.findByUrl(url);
    return item?.status === 'completed';
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    let pending = 0;
    let loading = 0;
    let completed = 0;
    let failed = 0;
    let cancelled = 0;
    let totalSize = 0;
    const loadTimes: number[] = [];

    for (const item of this.items.values()) {
      switch (item.status) {
        case 'pending':
          pending++;
          break;
        case 'loading':
          loading++;
          break;
        case 'completed':
          completed++;
          if (item.size) totalSize += item.size;
          if (item.startedAt && item.completedAt) {
            loadTimes.push(item.completedAt - item.startedAt);
          }
          break;
        case 'failed':
          failed++;
          break;
        case 'cancelled':
          cancelled++;
          break;
      }
    }

    return {
      pending,
      loading,
      completed,
      failed,
      cancelled,
      totalSize,
      averageLoadTime:
        loadTimes.length > 0
          ? loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length
          : 0,
    };
  }

  /**
   * Subscribe to queue events
   */
  subscribe(listener: QueueEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.cancelAll();
    this.items.clear();
    this.activeCount = 0;
    this.log('Queue cleared');
  }

  /**
   * Destroy the queue
   */
  destroy(): void {
    this.clear();
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private processQueue(): void {
    if (this.paused) {
      return;
    }

    const maxConcurrent = this.getMaxConcurrent();

    while (this.activeCount < maxConcurrent) {
      const next = this.getNextItem();
      if (!next) {
        break;
      }

      this.executeItem(next);
    }

    // Check if queue is empty
    if (this.getPendingCount() === 0 && this.activeCount === 0) {
      const dummyItem: PrefetchItem = {
        id: 'drain',
        url: '',
        type: 'document',
        priority: 'normal',
        status: 'completed',
        createdAt: Date.now(),
        retryCount: 0,
      };
      this.notifyListeners('drain', dummyItem);
    }
  }

  private getNextItem(): PrefetchItem | null {
    const pending = Array.from(this.items.values())
      .filter((item) => item.status === 'pending')
      .sort((a, b) => this.compareItems(a, b));

    return pending[0] || null;
  }

  private compareItems(a: PrefetchItem, b: PrefetchItem): number {
    // Apply priority boost for aged items
    let priorityA = PRIORITY_VALUES[a.priority];
    let priorityB = PRIORITY_VALUES[b.priority];

    if (this.config.priorityBoost) {
      const now = Date.now();
      if (now - a.createdAt > this.config.boostAgeThreshold) {
        priorityA = Math.max(0, priorityA - 1);
      }
      if (now - b.createdAt > this.config.boostAgeThreshold) {
        priorityB = Math.max(0, priorityB - 1);
      }
    }

    // Compare by boosted priority
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // Then by creation time (older first)
    return a.createdAt - b.createdAt;
  }

  private async executeItem(item: PrefetchItem): Promise<void> {
    item.status = 'loading';
    item.startedAt = Date.now();
    this.activeCount++;

    this.log(`Starting prefetch: ${item.url}`);
    this.notifyListeners('start', item);

    try {
      await this.prefetch(item);

      item.status = 'completed';
      item.completedAt = Date.now();

      this.log(
        `Completed prefetch: ${item.url} (${item.completedAt - (item.startedAt || 0)}ms)`
      );
      this.notifyListeners('complete', item);
    } catch (error) {
      item.error = error instanceof Error ? error : new Error(String(error));
      item.retryCount++;

      if (item.retryCount <= this.config.maxRetries) {
        this.log(`Retrying prefetch: ${item.url} (attempt ${item.retryCount})`);
        item.status = 'pending';

        // Schedule retry
        setTimeout(() => {
          this.processQueue();
        }, this.config.retryDelay * item.retryCount);
      } else {
        item.status = 'failed';
        item.completedAt = Date.now();

        this.log(`Failed prefetch: ${item.url}`, item.error);
        this.notifyListeners('fail', item);
      }
    } finally {
      this.activeCount--;
      this.processQueue();
    }
  }

  private async prefetch(item: PrefetchItem): Promise<void> {
    switch (item.type) {
      case 'document':
        await this.prefetchDocument(item);
        break;
      case 'script':
        await this.prefetchScript(item);
        break;
      case 'style':
        await this.prefetchStyle(item);
        break;
      case 'image':
        await this.prefetchImage(item);
        break;
      case 'font':
        await this.prefetchFont(item);
        break;
      case 'fetch':
        await this.prefetchFetch(item);
        break;
    }
  }

  private prefetchDocument(item: PrefetchItem): Promise<void> {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = item.url;
      link.as = 'document';

      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Failed to prefetch: ${item.url}`));

      document.head.appendChild(link);
    });
  }

  private prefetchScript(item: PrefetchItem): Promise<void> {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = item.url;
      link.as = 'script';

      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Failed to prefetch: ${item.url}`));

      document.head.appendChild(link);
    });
  }

  private prefetchStyle(item: PrefetchItem): Promise<void> {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = item.url;
      link.as = 'style';

      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Failed to prefetch: ${item.url}`));

      document.head.appendChild(link);
    });
  }

  private prefetchImage(item: PrefetchItem): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        item.size = img.naturalWidth * img.naturalHeight * 4; // Rough estimate
        resolve();
      };
      img.onerror = () => reject(new Error(`Failed to prefetch: ${item.url}`));
      img.src = item.url;
    });
  }

  private prefetchFont(item: PrefetchItem): Promise<void> {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = item.url;
      link.as = 'font';
      link.crossOrigin = 'anonymous';

      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Failed to prefetch: ${item.url}`));

      document.head.appendChild(link);
    });
  }

  private async prefetchFetch(item: PrefetchItem): Promise<void> {
    const response = await fetch(item.url, {
      method: 'GET',
      credentials: 'same-origin',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // Read body to trigger caching
    const blob = await response.blob();
    item.size = blob.size;
  }

  private getMaxConcurrent(): number {
    if (!this.config.networkAware) {
      return this.config.maxConcurrent;
    }

    const connection = this.getNetworkInfo();
    if (!connection?.effectiveType) {
      return this.config.maxConcurrent;
    }

    return (
      this.config.concurrentByNetwork[connection.effectiveType] ||
      this.config.maxConcurrent
    );
  }

  private getNetworkInfo(): { effectiveType?: string } | null {
    const nav = navigator as Navigator & {
      connection?: { effectiveType?: string };
    };
    return nav.connection || null;
  }

  private getPendingCount(): number {
    let count = 0;
    for (const item of this.items.values()) {
      if (item.status === 'pending') {
        count++;
      }
    }
    return count;
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.completedTTL);
  }

  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [id, item] of this.items.entries()) {
      if (
        (item.status === 'completed' || item.status === 'cancelled') &&
        item.completedAt &&
        now - item.completedAt > this.config.completedTTL
      ) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      this.items.delete(id);
    }

    if (toDelete.length > 0) {
      this.log(`Cleaned up ${toDelete.length} old items`);
    }
  }

  private notifyListeners(type: QueueEventType, item: PrefetchItem): void {
    this.listeners.forEach((listener) => listener(type, item));
  }

  private generateId(): string {
    return `prefetch-${Date.now()}-${++this.idCounter}`;
  }

  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      console.log(`[PrefetchQueue] ${message}`, ...args);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let queueInstance: PrefetchQueue | null = null;

/**
 * Get or create the global prefetch queue
 */
export function getPrefetchQueue(
  config?: Partial<PrefetchQueueConfig>
): PrefetchQueue {
  if (!queueInstance) {
    queueInstance = new PrefetchQueue(config);
  }
  return queueInstance;
}

/**
 * Reset the queue instance
 */
export function resetPrefetchQueue(): void {
  if (queueInstance) {
    queueInstance.destroy();
    queueInstance = null;
  }
}
