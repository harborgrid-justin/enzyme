/**
 * @file Worker Utilities
 * @description Web Worker management utilities including worker pooling,
 * task distribution, and typed worker communication
 */

import { logger } from './logging';
import { defer, type Deferred } from './asyncUtils';

// ============================================================================
// Types
// ============================================================================

/**
 * Worker message types
 */
export interface WorkerMessage<T = unknown> {
  id: string;
  type: string;
  payload: T;
  timestamp: number;
}

/**
 * Worker response types
 */
export interface WorkerResponse<T = unknown> {
  id: string;
  type: 'success' | 'error' | 'progress';
  payload: T;
  error?: string;
  progress?: number;
  timestamp: number;
}

/**
 * Worker task definition
 */
export interface WorkerTask<TInput = unknown, TOutput = unknown> {
  id: string;
  type: string;
  input: TInput;
  priority?: number;
  timeout?: number;
  transferables?: Transferable[];
  onProgress?: (progress: number) => void;
  resolve: (value: TOutput) => void;
  reject: (error: Error) => void;
}

/**
 * Worker pool configuration
 */
export interface WorkerPoolConfig {
  /** Maximum number of workers in pool */
  maxWorkers?: number;
  /** Idle timeout before terminating worker (ms) */
  idleTimeout?: number;
  /** Task timeout (ms) */
  taskTimeout?: number;
  /** Enable warm-up workers on creation */
  warmUp?: boolean;
}

/**
 * Worker status
 */
export type WorkerStatus = 'idle' | 'busy' | 'terminated';

/**
 * Worker info
 */
export interface WorkerInfo {
  id: string;
  status: WorkerStatus;
  currentTask: string | null;
  tasksCompleted: number;
  errorCount: number;
  createdAt: number;
  lastActiveAt: number;
}

// ============================================================================
// Typed Worker Wrapper
// ============================================================================

/**
 * Type-safe worker wrapper with promise-based communication
 */
export class TypedWorker<TInput, TOutput> {
  private worker: Worker;
  private pendingTasks = new Map<string, Deferred<TOutput>>();
  private progressCallbacks = new Map<string, (progress: number) => void>();
  private messageCounter = 0;
  private terminated = false;

  constructor(workerUrl: string | URL, options: WorkerOptions = {}) {
    this.worker = new Worker(workerUrl, options);
    this.setupListeners();
  }

  /**
   * Post task to worker
   */
  async postTask(
    type: string,
    payload: TInput,
    options: {
      timeout?: number;
      transferables?: Transferable[];
      onProgress?: (progress: number) => void;
    } = {}
  ): Promise<TOutput> {
    if (this.terminated) {
      throw new Error('Worker has been terminated');
    }

    const id = `${Date.now()}-${++this.messageCounter}`;
    const deferred = defer<TOutput>();

    this.pendingTasks.set(id, deferred);
    if (options.onProgress) {
      this.progressCallbacks.set(id, options.onProgress);
    }

    const message: WorkerMessage<TInput> = {
      id,
      type,
      payload,
      timestamp: Date.now(),
    };

    if (options.transferables) {
      this.worker.postMessage(message, options.transferables);
    } else {
      this.worker.postMessage(message);
    }

    // Setup timeout
    if (options.timeout !== undefined && options.timeout > 0) {
      setTimeout(() => {
        if (this.pendingTasks.has(id)) {
          this.pendingTasks.delete(id);
          this.progressCallbacks.delete(id);
          deferred.reject(new Error('Worker task timeout'));
        }
      }, options.timeout);
    }

    return deferred.promise;
  }

  /**
   * Terminate worker
   */
  terminate(): void {
    if (this.terminated) return;

    this.terminated = true;
    this.worker.terminate();

    // Reject all pending tasks
    for (const [id, deferred] of this.pendingTasks) {
      deferred.reject(new Error('Worker terminated'));
      this.pendingTasks.delete(id);
    }
    this.progressCallbacks.clear();

    logger.debug('[Worker] Terminated');
  }

  /**
   * Check if worker is terminated
   */
  isTerminated(): boolean {
    return this.terminated;
  }

  /**
   * Get pending task count
   */
  getPendingCount(): number {
    return this.pendingTasks.size;
  }

  /**
   * Setup message listeners
   */
  private setupListeners(): void {
    this.worker.onmessage = (event: MessageEvent<WorkerResponse<TOutput>>) => {
      const response = event.data;
      const deferred = this.pendingTasks.get(response.id);

      if (!deferred) {
        logger.warn('[Worker] Received response for unknown task', { id: response.id });
        return;
      }

      if (response.type === 'progress') {
        const callback = this.progressCallbacks.get(response.id);
        if (callback && response.progress !== undefined) {
          callback(response.progress);
        }
        return;
      }

      this.pendingTasks.delete(response.id);
      this.progressCallbacks.delete(response.id);

      if (response.type === 'error') {
        deferred.reject(new Error(response.error ?? 'Worker error'));
      } else {
        deferred.resolve(response.payload);
      }
    };

    this.worker.onerror = (event: ErrorEvent) => {
      logger.error('[Worker] Error', { message: event.message });

      // Reject all pending tasks
      for (const [id, deferred] of this.pendingTasks) {
        deferred.reject(new Error(`Worker error: ${event.message}`));
        this.pendingTasks.delete(id);
        this.progressCallbacks.delete(id);
      }
    };

    this.worker.onmessageerror = (event: MessageEvent) => {
      logger.error('[Worker] Message error', { event });
    };
  }
}

// ============================================================================
// Worker Pool
// ============================================================================

/**
 * Pool worker entry
 */
interface PoolWorker {
  id: string;
  worker: Worker;
  status: WorkerStatus;
  currentTaskId: string | null;
  tasksCompleted: number;
  errorCount: number;
  createdAt: number;
  lastActiveAt: number;
  idleTimeoutId: ReturnType<typeof setTimeout> | null;
}

/**
 * Worker pool for distributing tasks across multiple workers
 */
export class WorkerPool<TInput = unknown, TOutput = unknown> {
  private config: Required<WorkerPoolConfig>;
  private readonly workerUrl: string | URL;
  private readonly workerOptions: WorkerOptions;
  private workers = new Map<string, PoolWorker>();
  private taskQueue: WorkerTask<TInput, TOutput>[] = [];
  private pendingResponses = new Map<string, Deferred<TOutput>>();
  private progressCallbacks = new Map<string, (progress: number) => void>();
  private workerCounter = 0;
  private disposed = false;

  constructor(
    workerUrl: string | URL,
    config: WorkerPoolConfig = {},
    workerOptions: WorkerOptions = {}
  ) {
    this.workerUrl = workerUrl;
    this.workerOptions = workerOptions;
    this.config = {
      maxWorkers: config.maxWorkers ?? Math.max(2, navigator.hardwareConcurrency - 1),
      idleTimeout: config.idleTimeout ?? 30000,
      taskTimeout: config.taskTimeout ?? 60000,
      warmUp: config.warmUp ?? false,
    };

    if (this.config.warmUp) {
      this.warmUp();
    }
  }

  /**
   * Execute a task
   */
  async execute(
    type: string,
    input: TInput,
    options: {
      priority?: number;
      timeout?: number;
      transferables?: Transferable[];
      onProgress?: (progress: number) => void;
    } = {}
  ): Promise<TOutput> {
    if (this.disposed) {
      throw new Error('Worker pool has been disposed');
    }

    return new Promise((resolve, reject) => {
      const task: WorkerTask<TInput, TOutput> = {
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        input,
        priority: options.priority ?? 0,
        timeout: options.timeout,
        transferables: options.transferables,
        onProgress: options.onProgress,
        resolve,
        reject,
      };

      this.taskQueue.push(task);
      this.processQueue();
    });
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    totalWorkers: number;
    idleWorkers: number;
    busyWorkers: number;
    queuedTasks: number;
    totalTasksCompleted: number;
    totalErrors: number;
  } {
    let idleWorkers = 0;
    let busyWorkers = 0;
    let totalTasksCompleted = 0;
    let totalErrors = 0;

    for (const worker of this.workers.values()) {
      if (worker.status === 'idle') idleWorkers++;
      if (worker.status === 'busy') busyWorkers++;
      totalTasksCompleted += worker.tasksCompleted;
      totalErrors += worker.errorCount;
    }

    return {
      totalWorkers: this.workers.size,
      idleWorkers,
      busyWorkers,
      queuedTasks: this.taskQueue.length,
      totalTasksCompleted,
      totalErrors,
    };
  }

  /**
   * Get worker info
   */
  getWorkerInfo(): WorkerInfo[] {
    return Array.from(this.workers.values()).map((w) => ({
      id: w.id,
      status: w.status,
      currentTask: w.currentTaskId,
      tasksCompleted: w.tasksCompleted,
      errorCount: w.errorCount,
      createdAt: w.createdAt,
      lastActiveAt: w.lastActiveAt,
    }));
  }

  /**
   * Resize pool
   */
  resize(maxWorkers: number): void {
    this.config.maxWorkers = maxWorkers;

    // Terminate excess idle workers
    while (this.workers.size > maxWorkers) {
      const idleWorker = this.getAvailableWorker();
      if (idleWorker) {
        this.terminateWorker(idleWorker.id);
      } else {
        break;
      }
    }
  }

  /**
   * Dispose pool
   */
  dispose(): void {
    if (this.disposed) return;

    this.disposed = true;

    // Reject all queued tasks
    for (const task of this.taskQueue) {
      task.reject(new Error('Worker pool disposed'));
    }
    this.taskQueue = [];

    // Reject all pending responses
    for (const [_id, deferred] of this.pendingResponses) {
      deferred.reject(new Error('Worker pool disposed'));
    }
    this.pendingResponses.clear();
    this.progressCallbacks.clear();

    // Terminate all workers
    for (const workerId of this.workers.keys()) {
      this.terminateWorker(workerId);
    }

    logger.info('[WorkerPool] Disposed');
  }

  /**
   * Warm up pool by creating minimum workers
   */
  private warmUp(): void {
    const warmUpCount = Math.min(2, this.config.maxWorkers);
    for (let i = 0; i < warmUpCount; i++) {
      this.createWorker();
    }
  }

  /**
   * Create a new worker
   */
  private createWorker(): PoolWorker | null {
    if (this.workers.size >= this.config.maxWorkers) {
      return null;
    }

    const id = `worker-${++this.workerCounter}`;
    const worker = new Worker(this.workerUrl, this.workerOptions);

    const poolWorker: PoolWorker = {
      id,
      worker,
      status: 'idle',
      currentTaskId: null,
      tasksCompleted: 0,
      errorCount: 0,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      idleTimeoutId: null,
    };

    this.setupWorkerListeners(poolWorker);
    this.workers.set(id, poolWorker);
    this.scheduleIdleTimeout(poolWorker);

    logger.debug('[WorkerPool] Created worker', { id, total: this.workers.size });

    return poolWorker;
  }

  /**
   * Setup worker event listeners
   */
  private setupWorkerListeners(poolWorker: PoolWorker): void {
    poolWorker.worker.onmessage = (event: MessageEvent<WorkerResponse<TOutput>>) => {
      const response = event.data;

      if (response.type === 'progress') {
        const callback = this.progressCallbacks.get(response.id);
        if (callback !== undefined && response.progress !== undefined) {
          callback(response.progress);
        }
        return;
      }

      const deferred = this.pendingResponses.get(response.id);
      if (!deferred) return;

      this.pendingResponses.delete(response.id);
      this.progressCallbacks.delete(response.id);

      if (response.type === 'error') {
        poolWorker.errorCount++;
        deferred.reject(new Error(response.error ?? 'Worker error'));
      } else {
        poolWorker.tasksCompleted++;
        deferred.resolve(response.payload);
      }

      // Mark worker as idle and process queue
      poolWorker.status = 'idle';
      poolWorker.currentTaskId = null;
      poolWorker.lastActiveAt = Date.now();

      this.scheduleIdleTimeout(poolWorker);
      this.processQueue();
    };

    poolWorker.worker.onerror = (event: ErrorEvent) => {
      logger.error('[WorkerPool] Worker error', {
        workerId: poolWorker.id,
        message: event.message,
      });

      poolWorker.errorCount++;

      // If worker has current task, reject it
      if (poolWorker.currentTaskId !== null && poolWorker.currentTaskId !== undefined) {
        const deferred = this.pendingResponses.get(poolWorker.currentTaskId);
        if (deferred !== undefined) {
          this.pendingResponses.delete(poolWorker.currentTaskId);
          this.progressCallbacks.delete(poolWorker.currentTaskId);
          deferred.reject(new Error(`Worker error: ${event.message}`));
        }
      }

      // Terminate and recreate worker if too many errors
      if (poolWorker.errorCount > 3) {
        this.terminateWorker(poolWorker.id);
        if (this.taskQueue.length > 0) {
          this.createWorker();
        }
      } else {
        poolWorker.status = 'idle';
        poolWorker.currentTaskId = null;
        this.processQueue();
      }
    };
  }

  /**
   * Schedule idle timeout for worker
   */
  private scheduleIdleTimeout(poolWorker: PoolWorker): void {
    if (poolWorker.idleTimeoutId) {
      clearTimeout(poolWorker.idleTimeoutId);
    }

    // Keep at least one worker alive
    if (this.workers.size <= 1) return;

    poolWorker.idleTimeoutId = setTimeout(() => {
      if (poolWorker.status === 'idle' && this.workers.size > 1) {
        this.terminateWorker(poolWorker.id);
      }
    }, this.config.idleTimeout);
  }

  /**
   * Get an available worker
   */
  private getAvailableWorker(): PoolWorker | null {
    for (const worker of this.workers.values()) {
      if (worker.status === 'idle') {
        return worker;
      }
    }
    return null;
  }

  /**
   * Process task queue
   */
  private processQueue(): void {
    if (this.disposed || this.taskQueue.length === 0) return;

    // Get available worker or create new one
    let worker = this.getAvailableWorker();
    worker ??= this.createWorker();

    if (!worker) return;

    // Get highest priority task
    this.taskQueue.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    const task = this.taskQueue.shift();

    if (!task) return;

    // Clear idle timeout
    if (worker.idleTimeoutId) {
      clearTimeout(worker.idleTimeoutId);
      worker.idleTimeoutId = null;
    }

    // Execute task
    worker.status = 'busy';
    worker.currentTaskId = task.id;

    const message: WorkerMessage<TInput> = {
      id: task.id,
      type: task.type,
      payload: task.input,
      timestamp: Date.now(),
    };

    const deferred = defer<TOutput>();
    deferred.promise.then(task.resolve, task.reject);

    this.pendingResponses.set(task.id, deferred);
    if (task.onProgress) {
      this.progressCallbacks.set(task.id, task.onProgress);
    }

    // Setup task timeout
    const timeout = task.timeout ?? this.config.taskTimeout;
    setTimeout(() => {
      if (this.pendingResponses.has(task.id)) {
        this.pendingResponses.delete(task.id);
        this.progressCallbacks.delete(task.id);
        task.reject(new Error('Task timeout'));

        // Reset worker
        if (worker !== undefined) {
          worker.status = 'idle';
          worker.currentTaskId = null;
          this.processQueue();
        }
      }
    }, timeout);

    if (task.transferables) {
      worker.worker.postMessage(message, task.transferables);
    } else {
      worker.worker.postMessage(message);
    }

    logger.debug('[WorkerPool] Task dispatched', {
      taskId: task.id,
      workerId: worker.id,
      type: task.type,
    });

    // Process more tasks if there are available workers
    if (this.taskQueue.length > 0) {
      this.processQueue();
    }
  }

  /**
   * Terminate a specific worker
   */
  private terminateWorker(workerId: string): void {
    const worker = this.workers.get(workerId);
    if (!worker) return;

    if (worker.idleTimeoutId) {
      clearTimeout(worker.idleTimeoutId);
    }

    worker.worker.terminate();
    worker.status = 'terminated';
    this.workers.delete(workerId);

    logger.debug('[WorkerPool] Worker terminated', {
      workerId,
      remaining: this.workers.size,
    });
  }
}

// ============================================================================
// Inline Worker
// ============================================================================

/**
 * Create an inline worker from a function
 */
export function createInlineWorker<TInput, TOutput>(
  handler: (message: WorkerMessage<TInput>) => TOutput | Promise<TOutput>
): TypedWorker<TInput, TOutput> {
  const workerCode = `
    const handler = ${handler.toString()};
    
    self.onmessage = async (event) => {
      const message = event.data;
      try {
        const result = await handler(message);
        self.postMessage({
          id: message.id,
          type: 'success',
          payload: result,
          timestamp: Date.now()
        });
      } catch (error) {
        self.postMessage({
          id: message.id,
          type: 'error',
          error: error.message,
          timestamp: Date.now()
        });
      }
    };
  `;

  const blob = new Blob([workerCode], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);

  const worker = new TypedWorker<TInput, TOutput>(url);

  // Clean up blob URL when worker is terminated
  const originalTerminate = worker.terminate.bind(worker);
  worker.terminate = () => {
    URL.revokeObjectURL(url);
    originalTerminate();
  };

  return worker;
}

// ============================================================================
// Transfer Utilities
// ============================================================================

/**
 * Check if value is transferable
 */
export function isTransferable(value: unknown): value is Transferable {
  return (
    value instanceof ArrayBuffer ||
    value instanceof MessagePort ||
    (typeof ImageBitmap !== 'undefined' && value instanceof ImageBitmap) ||
    (typeof OffscreenCanvas !== 'undefined' && value instanceof OffscreenCanvas) ||
    (typeof ReadableStream !== 'undefined' && value instanceof ReadableStream) ||
    (typeof WritableStream !== 'undefined' && value instanceof WritableStream) ||
    (typeof TransformStream !== 'undefined' && value instanceof TransformStream)
  );
}

/**
 * Check if value is an ArrayBufferView
 */
function isArrayBufferView(value: unknown): value is ArrayBufferView {
  return ArrayBuffer.isView(value);
}

/**
 * Extract transferables from an object
 */
export function extractTransferables(obj: unknown): Transferable[] {
  const transferables: Transferable[] = [];

  function traverse(value: unknown): void {
    if (Array.isArray(value)) {
      value.forEach(traverse);
      return;
    }

    // Check ArrayBufferView first since its buffer is transferable
    if (isArrayBufferView(value)) {
      transferables.push(value.buffer);
      return;
    }

    if (isTransferable(value)) {
      transferables.push(value);
      return;
    }

    if (value !== null && typeof value === 'object') {
      Object.values(value).forEach(traverse);
    }
  }

  traverse(obj);
  return transferables;
}

// ============================================================================
// SharedWorker Wrapper (if supported)
// ============================================================================

/**
 * Shared worker wrapper
 */
export class TypedSharedWorker<TInput, TOutput> {
  private readonly worker: SharedWorker | null = null;
  private pendingTasks = new Map<string, Deferred<TOutput>>();
  private messageCounter = 0;

  constructor(workerUrl: string | URL) {
    if (typeof SharedWorker === 'undefined') {
      logger.warn('[SharedWorker] SharedWorker not supported');
      return;
    }

    this.worker = new SharedWorker(workerUrl);
    this.setupListeners();
  }

  /**
   * Check if shared worker is supported
   */
  isSupported(): boolean {
    return this.worker !== null;
  }

  /**
   * Post task
   */
  async postTask(type: string, payload: TInput): Promise<TOutput> {
    if (!this.worker) {
      throw new Error('SharedWorker not supported');
    }

    const id = `${Date.now()}-${++this.messageCounter}`;
    const deferred = defer<TOutput>();

    this.pendingTasks.set(id, deferred);

    const message: WorkerMessage<TInput> = {
      id,
      type,
      payload,
      timestamp: Date.now(),
    };

    this.worker.port.postMessage(message);

    return deferred.promise;
  }

  /**
   * Setup listeners
   */
  private setupListeners(): void {
    if (!this.worker) return;

    this.worker.port.onmessage = (event: MessageEvent<WorkerResponse<TOutput>>) => {
      const response = event.data;
      const deferred = this.pendingTasks.get(response.id);

      if (!deferred) return;

      this.pendingTasks.delete(response.id);

      if (response.type === 'error') {
        deferred.reject(new Error(response.error ?? 'Worker error'));
      } else {
        deferred.resolve(response.payload);
      }
    };

    this.worker.port.start();
  }
}

// ============================================================================
// Worker Registry
// ============================================================================

/**
 * Registry for managing multiple worker pools
 */
class WorkerRegistry {
  private pools = new Map<string, WorkerPool>();

  /**
   * Register a worker pool
   */
  register<TInput, TOutput>(
    name: string,
    workerUrl: string | URL,
    config?: WorkerPoolConfig
  ): WorkerPool<TInput, TOutput> {
    if (this.pools.has(name)) {
      throw new Error(`Worker pool "${name}" already registered`);
    }

    const pool = new WorkerPool<TInput, TOutput>(workerUrl, config);
    this.pools.set(name, pool as unknown as WorkerPool);
    return pool;
  }

  /**
   * Get a worker pool
   */
  get<TInput, TOutput>(name: string): WorkerPool<TInput, TOutput> | undefined {
    const pool = this.pools.get(name);
    return pool !== undefined ? (pool as WorkerPool<TInput, TOutput>) : undefined;
  }

  /**
   * Unregister a worker pool
   */
  unregister(name: string): void {
    const pool = this.pools.get(name);
    if (pool) {
      pool.dispose();
      this.pools.delete(name);
    }
  }

  /**
   * Dispose all pools
   */
  disposeAll(): void {
    for (const pool of this.pools.values()) {
      pool.dispose();
    }
    this.pools.clear();
  }

  /**
   * Get all pool stats
   */
  getAllStats(): Record<string, ReturnType<WorkerPool['getStats']>> {
    const stats: Record<string, ReturnType<WorkerPool['getStats']>> = {};
    for (const [name, pool] of this.pools) {
      stats[name] = pool.getStats();
    }
    return stats;
  }
}

/**
 * Global worker registry
 */
export const workerRegistry = new WorkerRegistry();
