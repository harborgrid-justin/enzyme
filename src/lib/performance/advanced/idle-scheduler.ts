/**
 * @file Idle Scheduler
 * @description Orchestrates non-critical work during browser idle periods using
 * requestIdleCallback with fallback support. Enables priority-based task scheduling.
 *
 * Features:
 * - requestIdleCallback orchestration
 * - Priority-based task queue
 * - Time-sliced execution
 * - Deadline-aware scheduling
 * - Task cancellation
 * - Progress tracking
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Task priority
 */
export type IdleTaskPriority = 'critical' | 'high' | 'normal' | 'low';

/**
 * Task status
 */
export type IdleTaskStatus = 'pending' | 'running' | 'completed' | 'cancelled' | 'failed';

/**
 * Idle task definition
 */
export interface IdleTask<T = unknown> {
  id: string;
  name: string;
  priority: IdleTaskPriority;
  work: (deadline: IdleDeadline) => T | Promise<T>;
  timeout?: number;
  onComplete?: (result: T) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
}

/**
 * Task entry with metadata
 */
interface TaskEntry<T = unknown> {
  task: IdleTask<T>;
  status: IdleTaskStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  result?: T;
  error?: Error;
}

/**
 * Scheduler configuration
 */
export interface IdleSchedulerConfig {
  /** Maximum tasks to process per idle callback */
  maxTasksPerIdle: number;
  /** Default task timeout in ms */
  defaultTimeout: number;
  /** Minimum remaining time to start a task (ms) */
  minRemainingTime: number;
  /** Enable fallback for browsers without requestIdleCallback */
  enableFallback: boolean;
  /** Fallback check interval in ms */
  fallbackInterval: number;
  /** Debug mode */
  debug: boolean;
}

/**
 * Scheduler statistics
 */
export interface SchedulerStats {
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
  failedTasks: number;
  cancelledTasks: number;
  averageWaitTime: number;
  averageExecutionTime: number;
}

/**
 * IdleDeadline interface (for browsers without native support)
 */
export interface IdleDeadline {
  didTimeout: boolean;
  timeRemaining(): number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: IdleSchedulerConfig = {
  maxTasksPerIdle: 5,
  defaultTimeout: 2000,
  minRemainingTime: 2,
  enableFallback: true,
  fallbackInterval: 100,
  debug: false,
};

const PRIORITY_WEIGHTS: Record<IdleTaskPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

// ============================================================================
// Idle Scheduler
// ============================================================================

/**
 * Manages idle-time task execution
 */
export class IdleScheduler {
  private config: IdleSchedulerConfig;
  private taskQueue: Map<string, TaskEntry> = new Map();
  private idleCallbackId: number | null = null;
  private fallbackTimer: ReturnType<typeof setTimeout> | null = null;
  private isRunning = false;
  private taskIdCounter = 0;
  private completionCallbacks: Map<string, Array<(result: unknown) => void>> = new Map();

  constructor(config: Partial<IdleSchedulerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Schedule a task to run during idle time
   */
  schedule<T>(
    work: (deadline: IdleDeadline) => T | Promise<T>,
    options: Partial<Omit<IdleTask<T>, 'id' | 'work'>> = {}
  ): string {
    const id = this.generateTaskId();

    const task: IdleTask<T> = {
      id,
      name: options.name ?? `task-${id}`,
      priority: options.priority ?? 'normal',
      work,
      timeout: options.timeout ?? this.config.defaultTimeout,
      onComplete: options.onComplete,
      onError: options.onError,
      onProgress: options.onProgress,
    };

    const entry: TaskEntry<T> = {
      task,
      status: 'pending',
      createdAt: Date.now(),
    };

    this.taskQueue.set(id, entry as TaskEntry);
    this.log(`Task scheduled: ${task.name} (priority: ${task.priority})`);

    this.ensureSchedulerRunning();

    return id;
  }

  /**
   * Schedule a task and return a promise for its completion
   */
  async scheduleAsync<T>(
    work: (deadline: IdleDeadline) => T | Promise<T>,
    options: Partial<Omit<IdleTask<T>, 'id' | 'work'>> = {}
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = this.schedule(work, {
        ...options,
        onComplete: (result) => {
          options.onComplete?.(result);
          resolve(result);
        },
        onError: (error) => {
          options.onError?.(error);
          reject(error);
        },
      });

      // Store callback for potential cancellation
      const callbacks = this.completionCallbacks.get(id) ?? [];
      callbacks.push(resolve as (result: unknown) => void);
      this.completionCallbacks.set(id, callbacks);
    });
  }

  /**
   * Cancel a scheduled task
   */
  cancel(taskId: string): boolean {
    const entry = this.taskQueue.get(taskId);

    if (entry?.status !== 'pending') {
      return false;
    }

    entry.status = 'cancelled';
    this.log(`Task cancelled: ${entry.task.name}`);

    // Notify callbacks
    const callbacks = this.completionCallbacks.get(taskId);
    if (callbacks !== undefined) {
      // Don't reject, just remove
      this.completionCallbacks.delete(taskId);
    }

    return true;
  }

  /**
   * Cancel all pending tasks
   */
  cancelAll(): number {
    let cancelled = 0;

    for (const [_id, entry] of this.taskQueue.entries()) {
      if (entry.status === 'pending') {
        entry.status = 'cancelled';
        cancelled++;
      }
    }

    this.completionCallbacks.clear();
    this.log(`Cancelled ${cancelled} tasks`);

    return cancelled;
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId: string): IdleTaskStatus | null {
    const entry = this.taskQueue.get(taskId);
    return entry?.status ?? null;
  }

  /**
   * Get scheduler statistics
   */
  getStats(): SchedulerStats {
    const entries = Array.from(this.taskQueue.values());

    const completed = entries.filter((e) => e.status === 'completed');
    const waitTimes = completed
      .filter((e) => e.startedAt != null)
      .map((e) => (e.startedAt as number) - e.createdAt);
    const execTimes = completed
      .filter((e) => e.completedAt != null && e.startedAt != null)
      .map((e) => (e.completedAt as number) - (e.startedAt as number));

    return {
      totalTasks: entries.length,
      pendingTasks: entries.filter((e) => e.status === 'pending').length,
      completedTasks: completed.length,
      failedTasks: entries.filter((e) => e.status === 'failed').length,
      cancelledTasks: entries.filter((e) => e.status === 'cancelled').length,
      averageWaitTime:
        waitTimes.length > 0 ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length : 0,
      averageExecutionTime:
        execTimes.length > 0 ? execTimes.reduce((a, b) => a + b, 0) / execTimes.length : 0,
    };
  }

  /**
   * Start the scheduler (called automatically when tasks are added)
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.scheduleIdleCallback();
    this.log('Scheduler started');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.idleCallbackId !== null) {
      this.cancelIdleCallback(this.idleCallbackId);
      this.idleCallbackId = null;
    }

    if (this.fallbackTimer !== null) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }

    this.log('Scheduler stopped');
  }

  /**
   * Clear all tasks and statistics
   */
  clear(): void {
    this.cancelAll();
    this.taskQueue.clear();
    this.log('Scheduler cleared');
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private ensureSchedulerRunning(): void {
    if (!this.isRunning) {
      this.start();
    } else if (this.idleCallbackId === null && this.fallbackTimer === null) {
      this.scheduleIdleCallback();
    }
  }

  private scheduleIdleCallback(): void {
    if (!this.isRunning) {
      return;
    }

    if (this.hasIdleCallback()) {
      this.idleCallbackId = (
        window as Window &
          typeof globalThis & {
            requestIdleCallback: (
              callback: (deadline: IdleDeadline) => void,
              options?: { timeout?: number }
            ) => number;
          }
      ).requestIdleCallback((deadline) => this.processIdleCallback(deadline), {
        timeout: this.getMinTaskTimeout(),
      });
    } else if (this.config.enableFallback) {
      this.fallbackTimer = setTimeout(() => {
        this.processFallback();
      }, this.config.fallbackInterval);
    }
  }

  private processIdleCallback(deadline: IdleDeadline): void {
    this.idleCallbackId = null;

    const pendingTasks = this.getPendingTasksSorted();
    let processed = 0;

    for (const entry of pendingTasks) {
      // Check if we have enough time
      if (!deadline.didTimeout && deadline.timeRemaining() < this.config.minRemainingTime) {
        break;
      }

      // Check if we've processed enough tasks
      if (processed >= this.config.maxTasksPerIdle) {
        break;
      }

      void this.executeTask(entry, deadline);
      processed++;
    }

    // Schedule next callback if there are more pending tasks
    if (this.hasPendingTasks()) {
      this.scheduleIdleCallback();
    }
  }

  private processFallback(): void {
    this.fallbackTimer = null;

    // Create synthetic deadline
    const startTime = performance.now();
    const deadline: IdleDeadline = {
      didTimeout: false,
      timeRemaining: () => Math.max(0, 50 - (performance.now() - startTime)),
    };

    const pendingTasks = this.getPendingTasksSorted();
    let processed = 0;

    for (const entry of pendingTasks) {
      if (deadline.timeRemaining() < this.config.minRemainingTime) {
        break;
      }

      if (processed >= this.config.maxTasksPerIdle) {
        break;
      }

      void this.executeTask(entry, deadline);
      processed++;
    }

    if (this.hasPendingTasks()) {
      this.scheduleIdleCallback();
    }
  }

  private async executeTask(entry: TaskEntry, deadline: IdleDeadline): Promise<void> {
    const { task } = entry;

    entry.status = 'running';
    entry.startedAt = Date.now();

    this.log(`Executing task: ${task.name}`);

    try {
      const result = await task.work(deadline);
      entry.status = 'completed';
      entry.completedAt = Date.now();
      entry.result = result;

      this.log(`Task completed: ${task.name} (${entry.completedAt - (entry.startedAt ?? 0)}ms)`);

      task.onComplete?.(result);
    } catch (error) {
      entry.status = 'failed';
      entry.completedAt = Date.now();
      entry.error = error instanceof Error ? error : new Error(String(error));

      this.log(`Task failed: ${task.name}`, entry.error);

      task.onError?.(entry.error);
    }
  }

  private getPendingTasksSorted(): TaskEntry[] {
    return Array.from(this.taskQueue.values())
      .filter((entry) => entry.status === 'pending')
      .sort((a, b) => {
        // Sort by priority first, then by creation time
        const priorityDiff = PRIORITY_WEIGHTS[a.task.priority] - PRIORITY_WEIGHTS[b.task.priority];
        if (priorityDiff !== 0) {
          return priorityDiff;
        }
        return a.createdAt - b.createdAt;
      });
  }

  private hasPendingTasks(): boolean {
    for (const entry of this.taskQueue.values()) {
      if (entry.status === 'pending') {
        return true;
      }
    }
    return false;
  }

  private getMinTaskTimeout(): number {
    let minTimeout = this.config.defaultTimeout;

    for (const entry of this.taskQueue.values()) {
      if (entry.status === 'pending' && entry.task.timeout !== undefined) {
        minTimeout = Math.min(minTimeout, entry.task.timeout);
      }
    }

    return minTimeout;
  }

  private hasIdleCallback(): boolean {
    return typeof window !== 'undefined' && 'requestIdleCallback' in window;
  }

  private cancelIdleCallback(id: number): void {
    if (this.hasIdleCallback()) {
      (
        window as Window &
          typeof globalThis & {
            cancelIdleCallback: (handle: number) => void;
          }
      ).cancelIdleCallback(id);
    }
  }

  private generateTaskId(): string {
    return `idle-${Date.now()}-${++this.taskIdCounter}`;
  }

  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      // eslint-disable-next-line no-console
      console.log(`[IdleScheduler] ${message}`, ...args);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let schedulerInstance: IdleScheduler | null = null;

/**
 * Get or create the global idle scheduler instance
 */
export function getIdleScheduler(config?: Partial<IdleSchedulerConfig>): IdleScheduler {
  schedulerInstance ??= new IdleScheduler(config);
  return schedulerInstance;
}

/**
 * Reset the scheduler instance
 */
export function resetIdleScheduler(): void {
  if (schedulerInstance !== null) {
    schedulerInstance.stop();
    schedulerInstance = null;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Execute work during idle time (convenience function)
 */
export async function runWhenIdle<T>(
  work: (deadline: IdleDeadline) => T | Promise<T>,
  options?: Partial<Omit<IdleTask<T>, 'id' | 'work'>>
): Promise<T> {
  return getIdleScheduler().scheduleAsync(work, options);
}

/**
 * Defer work to idle time without waiting for result
 */
export function deferToIdle<T>(
  work: (deadline: IdleDeadline) => T | Promise<T>,
  options?: Partial<Omit<IdleTask<T>, 'id' | 'work'>>
): string {
  return getIdleScheduler().schedule(work, options);
}

/**
 * Create a yielding iterator for large workloads
 */
export function* createYieldingIterator<T>(
  items: T[],
  processItem: (item: T) => void,
  deadline: IdleDeadline
): Generator<number, void, unknown> {
  for (let i = 0; i < items.length; i++) {
    if (items[i] !== undefined) processItem(items[i] as T);
    yield i + 1;

    // Yield control if deadline is approaching
    if (!deadline.didTimeout && deadline.timeRemaining() < 2) {
      return;
    }
  }
}

/**
 * Process items in chunks during idle time
 */
export async function processInIdleChunks<T>(
  items: T[],
  processItem: (item: T) => void | Promise<void>,
  chunkSize: number = 10
): Promise<void> {
  const scheduler = getIdleScheduler();
  let processed = 0;

  while (processed < items.length) {
    await scheduler.scheduleAsync(async (deadline) => {
      const end = Math.min(processed + chunkSize, items.length);

      while (processed < end) {
        if (!deadline.didTimeout && deadline.timeRemaining() < 2) {
          break;
        }
        const item = items[processed];
        if (item !== undefined) await processItem(item as T);
        processed++;
      }
    });
  }
}

/**
 * Debounce to idle time
 */
export function debounceToIdle<T extends (...args: unknown[]) => void>(
  fn: T,
  options?: Partial<Omit<IdleTask, 'id' | 'work'>>
): (...args: Parameters<T>) => void {
  let taskId: string | null = null;
  const scheduler = getIdleScheduler();

  return (...args: Parameters<T>) => {
    if (taskId !== null) {
      scheduler.cancel(taskId);
    }

    taskId = scheduler.schedule(() => {
      fn(...args);
      taskId = null;
    }, options);
  };
}
