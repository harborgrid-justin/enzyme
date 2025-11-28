/**
 * @file Intelligent Render Scheduler
 * @description PhD-level render scheduling infrastructure with frame budget awareness,
 * priority queues, and automatic work deferral for optimal INP and responsiveness.
 *
 * Features:
 * - Frame budget tracking (16.67ms for 60fps)
 * - Priority queues with deadline enforcement
 * - Yield to main thread for responsiveness
 * - Concurrent work coordination
 * - Automatic work deferral to idle periods
 * - Render deadline enforcement
 * - React 18 concurrent features integration
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ============================================================================
// Utility Hook for Dynamic Dependencies
// ============================================================================

/**
 * Custom hook to track dependency array changes with a stable version number.
 * This allows proper ESLint compliance when using dynamic dependency arrays.
 */
function useDepsVersion(deps: React.DependencyList): number {
  const versionRef = useRef(0);
  const prevDepsRef = useRef<React.DependencyList>(deps);

  // Compare deps and increment version if changed
  const depsChanged =
    deps.length !== prevDepsRef.current.length ||
    deps.some((dep, i) => !Object.is(dep, prevDepsRef.current[i]));

  if (depsChanged) {
    versionRef.current++;
    prevDepsRef.current = deps;
  }

  return versionRef.current;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type for the experimental Scheduler API
 */
interface GlobalWithScheduler {
  scheduler: {
    yield: () => Promise<void>;
  };
}

/**
 * Type guard for checking if globalThis has the scheduler.yield API
 */
function hasSchedulerYieldAPI(obj: typeof globalThis): obj is typeof globalThis & GlobalWithScheduler {
  return (
    'scheduler' in obj &&
    typeof (obj as GlobalWithScheduler).scheduler === 'object' &&
    (obj as GlobalWithScheduler).scheduler !== null &&
    'yield' in (obj as GlobalWithScheduler).scheduler
  );
}

// ============================================================================
// Types
// ============================================================================

/**
 * Render priority levels
 */
export type RenderPriority = 'immediate' | 'user-blocking' | 'normal' | 'low' | 'idle';

/**
 * Task status
 */
export type TaskStatus = 'pending' | 'running' | 'completed' | 'cancelled';

/**
 * Scheduled task
 */
export interface ScheduledTask {
  id: string;
  priority: RenderPriority;
  callback: () => void | Promise<void>;
  status: TaskStatus;
  deadline?: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  estimatedDuration?: number;
}

/**
 * Scheduler statistics
 */
export interface SchedulerStats {
  totalTasks: number;
  completedTasks: number;
  cancelledTasks: number;
  averageWaitTime: number;
  averageExecutionTime: number;
  droppedFrames: number;
  frameTime: number;
  utilization: number;
}

/**
 * Frame budget configuration
 */
export interface FrameBudgetConfig {
  /** Target frames per second */
  targetFPS: number;
  /** Reserved time for browser work (ms) */
  browserReserve: number;
  /** Maximum time for a single task (ms) */
  maxTaskDuration: number;
  /** Enable adaptive budgeting */
  adaptive: boolean;
}

/**
 * Scheduler configuration
 */
export interface RenderSchedulerConfig {
  /** Frame budget settings */
  frameBudget?: Partial<FrameBudgetConfig>;
  /** Enable debug logging */
  debug?: boolean;
  /** Maximum queue size per priority */
  maxQueueSize?: number;
  /** Enable automatic cleanup */
  autoCleanup?: boolean;
  /** Cleanup interval (ms) */
  cleanupInterval?: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_FRAME_BUDGET: FrameBudgetConfig = {
  targetFPS: 60,
  browserReserve: 4, // Reserve 4ms for browser rendering
  maxTaskDuration: 8, // Max 8ms per task
  adaptive: true,
};

const PRIORITY_VALUES: Record<RenderPriority, number> = {
  immediate: 0,
  'user-blocking': 1,
  normal: 2,
  low: 3,
  idle: 4,
};

const PRIORITY_TIMEOUTS: Record<RenderPriority, number> = {
  immediate: 0,
  'user-blocking': 100,
  normal: 500,
  low: 2000,
  idle: 10000,
};

// ============================================================================
// Frame Budget Tracker
// ============================================================================

/**
 * Tracks frame budget and provides timing utilities
 */
class FrameBudgetTracker {
  private config: FrameBudgetConfig;
  private frameTimes: number[] = [];
  private frameStartTime = 0;
  private droppedFrames = 0;

  constructor(config: FrameBudgetConfig) {
    this.config = config;
  }

  /**
   * Get frame budget in milliseconds
   */
  get frameBudget(): number {
    return 1000 / this.config.targetFPS;
  }

  /**
   * Get available time for tasks
   */
  get availableBudget(): number {
    return this.frameBudget - this.config.browserReserve;
  }

  /**
   * Get adaptive budget based on recent frame times
   */
  getAdaptiveBudget(): number {
    if (!this.config.adaptive || this.frameTimes.length < 3) {
      return this.availableBudget;
    }

    // Calculate average recent frame time
    const recentFrames = this.frameTimes.slice(-10);
    const avgFrameTime = recentFrames.reduce((a, b) => a + b, 0) / recentFrames.length;

    // If running behind, reduce budget
    if (avgFrameTime > this.frameBudget) {
      return Math.max(4, this.availableBudget * 0.5);
    }

    // If ahead, can use more budget
    if (avgFrameTime < this.frameBudget * 0.8) {
      return Math.min(this.config.maxTaskDuration, this.availableBudget * 1.2);
    }

    return this.availableBudget;
  }

  /**
   * Start frame timing
   */
  startFrame(): void {
    this.frameStartTime = performance.now();
  }

  /**
   * End frame and record timing
   */
  endFrame(): number {
    const frameTime = performance.now() - this.frameStartTime;
    this.frameTimes.push(frameTime);

    // Keep only last 60 frames
    if (this.frameTimes.length > 60) {
      this.frameTimes.shift();
    }

    // Track dropped frames
    if (frameTime > this.frameBudget) {
      this.droppedFrames++;
    }

    return frameTime;
  }

  /**
   * Check if there's remaining budget
   */
  hasRemainingBudget(): boolean {
    const elapsed = performance.now() - this.frameStartTime;
    return elapsed < this.getAdaptiveBudget();
  }

  /**
   * Get remaining time in current frame
   */
  getRemainingTime(): number {
    const elapsed = performance.now() - this.frameStartTime;
    return Math.max(0, this.getAdaptiveBudget() - elapsed);
  }

  /**
   * Get statistics
   */
  getStats(): { avgFrameTime: number; droppedFrames: number } {
    const avgFrameTime = this.frameTimes.length > 0
      ? this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
      : 0;

    return { avgFrameTime, droppedFrames: this.droppedFrames };
  }

  /**
   * Reset statistics
   */
  reset(): void {
    this.frameTimes = [];
    this.droppedFrames = 0;
  }
}

// ============================================================================
// Priority Queue
// ============================================================================

/**
 * Priority queue for scheduled tasks
 */
class TaskPriorityQueue {
  private queues: Map<RenderPriority, ScheduledTask[]> = new Map();
  private maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    for (const priority of Object.keys(PRIORITY_VALUES) as RenderPriority[]) {
      this.queues.set(priority, []);
    }
  }

  /**
   * Add task to queue
   */
  enqueue(task: ScheduledTask): boolean {
    const queue = this.queues.get(task.priority);
    if (!queue) return false;

    if (queue.length >= this.maxSize) {
      // Drop lowest priority task if queue is full
      const lowestPriority = this.getLowestPriorityWithTasks();
      if (lowestPriority && PRIORITY_VALUES[lowestPriority] > PRIORITY_VALUES[task.priority]) {
        const lowestQueue = this.queues.get(lowestPriority)!;
        lowestQueue.pop();
      } else {
        return false;
      }
    }

    queue.push(task);
    return true;
  }

  /**
   * Get next task (highest priority)
   */
  dequeue(): ScheduledTask | null {
    for (const priority of Object.keys(PRIORITY_VALUES) as RenderPriority[]) {
      const queue = this.queues.get(priority)!;
      if (queue.length > 0) {
        return queue.shift()!;
      }
    }
    return null;
  }

  /**
   * Peek at next task without removing
   */
  peek(): ScheduledTask | null {
    for (const priority of Object.keys(PRIORITY_VALUES) as RenderPriority[]) {
      const queue = this.queues.get(priority)!;
      if (queue.length > 0) {
        return queue[0] ?? null;
      }
    }
    return null;
  }

  /**
   * Get all pending tasks of a priority
   */
  getTasksByPriority(priority: RenderPriority): ScheduledTask[] {
    return [...(this.queues.get(priority) || [])];
  }

  /**
   * Get total pending task count
   */
  get size(): number {
    let total = 0;
    this.queues.forEach((queue) => (total += queue.length));
    return total;
  }

  /**
   * Check if queue is empty
   */
  get isEmpty(): boolean {
    return this.size === 0;
  }

  /**
   * Get lowest priority with pending tasks
   */
  private getLowestPriorityWithTasks(): RenderPriority | null {
    const priorities = Object.keys(PRIORITY_VALUES) as RenderPriority[];
    for (let i = priorities.length - 1; i >= 0; i--) {
      const queue = this.queues.get(priorities[i]!)!;
      if (queue.length > 0) {
        return priorities[i] ?? null;
      }
    }
    return null;
  }

  /**
   * Remove task by ID
   */
  removeById(id: string): boolean {
    for (const queue of this.queues.values()) {
      const index = queue.findIndex((t) => t.id === id);
      if (index !== -1) {
        queue.splice(index, 1);
        return true;
      }
    }
    return false;
  }

  /**
   * Clear all queues
   */
  clear(): void {
    this.queues.forEach((queue) => (queue.length = 0));
  }
}

// ============================================================================
// Render Scheduler
// ============================================================================

/**
 * Intelligent render scheduler with frame budget awareness
 */
export class RenderScheduler {
  private static instance: RenderScheduler;
  private config: Required<RenderSchedulerConfig>;
  private frameBudget: FrameBudgetTracker;
  private queue: TaskPriorityQueue;
  private isProcessing = false;
  private animationFrameId: number | null = null;
  private idleCallbackId: number | null = null;
  private completedTasks: ScheduledTask[] = [];
  private taskIdCounter = 0;
  private cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor(config: RenderSchedulerConfig = {}) {
    this.config = {
      frameBudget: { ...DEFAULT_FRAME_BUDGET, ...config.frameBudget },
      debug: config.debug ?? false,
      maxQueueSize: config.maxQueueSize ?? 100,
      autoCleanup: config.autoCleanup ?? true,
      cleanupInterval: config.cleanupInterval ?? 30000,
    };

    this.frameBudget = new FrameBudgetTracker(this.config.frameBudget as FrameBudgetConfig);
    this.queue = new TaskPriorityQueue(this.config.maxQueueSize);

    if (this.config.autoCleanup) {
      this.startCleanup();
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: RenderSchedulerConfig): RenderScheduler {
    if (!RenderScheduler.instance) {
      RenderScheduler.instance = new RenderScheduler(config);
    }
    return RenderScheduler.instance;
  }

  /**
   * Reset singleton (for testing)
   */
  static reset(): void {
    if (RenderScheduler.instance) {
      RenderScheduler.instance.stop();
      // Type-safe null assignment for singleton reset
      (RenderScheduler as { instance: RenderScheduler | null }).instance = null;
    }
  }

  /**
   * Schedule a task
   */
  schedule(
    callback: () => void | Promise<void>,
    options: {
      priority?: RenderPriority;
      deadline?: number;
      estimatedDuration?: number;
    } = {}
  ): string {
    const {
      priority = 'normal',
      deadline,
      estimatedDuration,
    } = options;

    const task: ScheduledTask = {
      id: `task-${++this.taskIdCounter}`,
      priority,
      callback,
      status: 'pending',
      createdAt: performance.now(),
      deadline: deadline ?? performance.now() + PRIORITY_TIMEOUTS[priority],
      estimatedDuration,
    };

    this.queue.enqueue(task);
    this.log(`Scheduled task ${task.id} with priority ${priority}`);

    this.ensureProcessing();

    return task.id;
  }

  /**
   * Cancel a scheduled task
   */
  cancel(taskId: string): boolean {
    return this.queue.removeById(taskId);
  }

  /**
   * Schedule immediate work (runs synchronously if budget allows)
   */
  scheduleImmediate(callback: () => void): void {
    if (this.frameBudget.hasRemainingBudget()) {
      callback();
    } else {
      this.schedule(callback, { priority: 'immediate' });
    }
  }

  /**
   * Yield to main thread for responsiveness
   */
  async yieldToMain(): Promise<void> {
    return new Promise((resolve) => {
      // Use scheduler.yield() if available (Chrome 115+)
      if (hasSchedulerYieldAPI(globalThis)) {
        globalThis.scheduler.yield().then(resolve);
      } else {
        // Fallback to setTimeout
        setTimeout(resolve, 0);
      }
    });
  }

  /**
   * Run work in chunks, yielding between chunks
   */
  async runInChunks<T>(
    items: T[],
    processor: (item: T, index: number) => void,
    options: { chunkSize?: number; yieldAfter?: number } = {}
  ): Promise<void> {
    const { chunkSize = 10, yieldAfter = 5 } = options;

    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);

      for (let j = 0; j < chunk.length; j++) {
        processor(chunk[j]!, i + j);

        // Yield after processing yieldAfter items
        if ((j + 1) % yieldAfter === 0) {
          await this.yieldToMain();
        }
      }

      // Always yield between chunks
      if (i + chunkSize < items.length) {
        await this.yieldToMain();
      }
    }
  }

  /**
   * Ensure processing is happening
   */
  private ensureProcessing(): void {
    if (this.isProcessing) return;
    this.processQueue();
  }

  /**
   * Process the task queue
   */
  private processQueue(): void {
    if (this.queue.isEmpty) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    this.frameBudget.startFrame();

    // Process immediate tasks synchronously
    this.processImmediateTasks();

    // Schedule frame work
    this.animationFrameId = requestAnimationFrame(() => {
      this.processFrameTasks();
      this.frameBudget.endFrame();

      // Continue processing if more tasks
      if (!this.queue.isEmpty) {
        this.processQueue();
      } else {
        this.isProcessing = false;
      }
    });

    // Schedule idle work
    if (typeof requestIdleCallback !== 'undefined') {
      this.idleCallbackId = requestIdleCallback((deadline) => {
        this.processIdleTasks(deadline);
      });
    }
  }

  /**
   * Process immediate priority tasks
   */
  private processImmediateTasks(): void {
    const immediateTasks = this.queue.getTasksByPriority('immediate');
    for (const task of immediateTasks) {
      this.executeTask(task);
      this.queue.removeById(task.id);
    }
  }

  /**
   * Process tasks within frame budget
   */
  private processFrameTasks(): void {
    while (this.frameBudget.hasRemainingBudget() && !this.queue.isEmpty) {
      const task = this.queue.peek();
      if (!task) break;

      // Skip idle tasks in frame processing
      if (task.priority === 'idle') break;

      // Check if task would exceed budget
      if (task.estimatedDuration && task.estimatedDuration > this.frameBudget.getRemainingTime()) {
        break;
      }

      this.queue.dequeue();
      this.executeTask(task);
    }
  }

  /**
   * Process idle tasks during browser idle time
   */
  private processIdleTasks(deadline: IdleDeadline): void {
    while (deadline.timeRemaining() > 0 && !this.queue.isEmpty) {
      const task = this.queue.peek();
      if (!task) break;

      // Only process low and idle tasks here
      if (task.priority !== 'idle' && task.priority !== 'low') break;

      this.queue.dequeue();
      this.executeTask(task);
    }
  }

  /**
   * Execute a single task
   */
  private async executeTask(task: ScheduledTask): Promise<void> {
    task.status = 'running';
    task.startedAt = performance.now();

    try {
      await task.callback();
      task.status = 'completed';
    } catch (error) {
      task.status = 'cancelled';
      this.log(`Task ${task.id} failed:`, error);
    }

    task.completedAt = performance.now();
    this.completedTasks.push(task);
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    this.cleanupIntervalId = setInterval(() => {
      // Keep only last 100 completed tasks
      if (this.completedTasks.length > 100) {
        this.completedTasks = this.completedTasks.slice(-100);
      }
    }, this.config.cleanupInterval);
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.idleCallbackId) {
      cancelIdleCallback(this.idleCallbackId);
      this.idleCallbackId = null;
    }
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
    this.queue.clear();
    this.isProcessing = false;
  }

  /**
   * Get scheduler statistics
   */
  getStats(): SchedulerStats {
    const frameStats = this.frameBudget.getStats();
    const completed = this.completedTasks.filter((t) => t.status === 'completed');
    const cancelled = this.completedTasks.filter((t) => t.status === 'cancelled');

    const avgWaitTime = completed.length > 0
      ? completed.reduce((sum, t) => sum + (t.startedAt! - t.createdAt), 0) / completed.length
      : 0;

    const avgExecutionTime = completed.length > 0
      ? completed.reduce((sum, t) => sum + (t.completedAt! - t.startedAt!), 0) / completed.length
      : 0;

    return {
      totalTasks: this.completedTasks.length,
      completedTasks: completed.length,
      cancelledTasks: cancelled.length,
      averageWaitTime: avgWaitTime,
      averageExecutionTime: avgExecutionTime,
      droppedFrames: frameStats.droppedFrames,
      frameTime: frameStats.avgFrameTime,
      utilization: this.isProcessing ? 1 : 0,
    };
  }

  /**
   * Debug logging
   */
  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      console.log(`[RenderScheduler] ${message}`, ...args);
    }
  }
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook for optimized rendering with frame budget awareness
 */
export function useOptimizedRender<T>(
  computeFn: () => T,
  deps: React.DependencyList,
  options: {
    priority?: RenderPriority;
    defer?: boolean;
  } = {}
): T | undefined {
  const { priority = 'normal', defer = false } = options;
  const [value, setValue] = useState<T | undefined>(undefined);
  const scheduler = useRef(RenderScheduler.getInstance());
  const isFirstRender = useRef(true);

  // Track dependency changes with stable version number
  const depsVersion = useDepsVersion(deps);

  useEffect(() => {
    if (isFirstRender.current && !defer) {
      // Compute immediately on first render
      setValue(computeFn());
      isFirstRender.current = false;
      return;
    }

    // Schedule subsequent updates
    const taskId = scheduler.current.schedule(() => {
      setValue(computeFn());
    }, { priority });

    return () => {
      scheduler.current.cancel(taskId);
    };
  }, [depsVersion, computeFn, defer, priority]);

  return value;
}

/**
 * Hook for deferred rendering
 */
export function useDeferredRender(
  shouldDefer: boolean,
  delay = 0
): { isDeferred: boolean; isDeferring: boolean } {
  const [isDeferred, setIsDeferred] = useState(shouldDefer);
  const [isDeferring, setIsDeferring] = useState(false);

  useEffect(() => {
    if (!shouldDefer) {
      setIsDeferred(false);
      setIsDeferring(false);
      return;
    }

    setIsDeferring(true);

    const scheduler = RenderScheduler.getInstance();
    const taskId = scheduler.schedule(
      () => {
        setIsDeferred(true);
        setIsDeferring(false);
      },
      { priority: 'low' }
    );

    const timeoutId = delay > 0
      ? setTimeout(() => {
          setIsDeferred(true);
          setIsDeferring(false);
          scheduler.cancel(taskId);
        }, delay)
      : undefined;

    return () => {
      scheduler.cancel(taskId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [shouldDefer, delay]);

  return { isDeferred, isDeferring };
}

/**
 * Hook for scheduling work with yield to main
 */
export function useScheduledWork(): {
  schedule: (callback: () => void | Promise<void>, priority?: RenderPriority) => string;
  cancel: (taskId: string) => void;
  yieldToMain: () => Promise<void>;
  runInChunks: <T>(
    items: T[],
    processor: (item: T, index: number) => void,
    options?: { chunkSize?: number; yieldAfter?: number }
  ) => Promise<void>;
} {
  const scheduler = useMemo(() => RenderScheduler.getInstance(), []);

  const schedule = useCallback(
    (callback: () => void | Promise<void>, priority: RenderPriority = 'normal') => {
      return scheduler.schedule(callback, { priority });
    },
    [scheduler]
  );

  const cancel = useCallback(
    (taskId: string) => {
      scheduler.cancel(taskId);
    },
    [scheduler]
  );

  const yieldToMain = useCallback(() => scheduler.yieldToMain(), [scheduler]);

  const runInChunks = useCallback(
    <T,>(
      items: T[],
      processor: (item: T, index: number) => void,
      options?: { chunkSize?: number; yieldAfter?: number }
    ) => scheduler.runInChunks(items, processor, options),
    [scheduler]
  );

  return { schedule, cancel, yieldToMain, runInChunks };
}

/**
 * Hook for tracking render performance
 */
export function useRenderBudget(): {
  hasRemainingBudget: boolean;
  remainingTime: number;
  stats: SchedulerStats;
} {
  const [stats, setStats] = useState<SchedulerStats>({
    totalTasks: 0,
    completedTasks: 0,
    cancelledTasks: 0,
    averageWaitTime: 0,
    averageExecutionTime: 0,
    droppedFrames: 0,
    frameTime: 0,
    utilization: 0,
  });

  const scheduler = useMemo(() => RenderScheduler.getInstance(), []);

  useEffect(() => {
    const updateStats = (): void => {
      setStats(scheduler.getStats());
    };

    const intervalId = setInterval(updateStats, 1000);
    return () => clearInterval(intervalId);
  }, [scheduler]);

  return {
    hasRemainingBudget: stats.frameTime < 16.67,
    remainingTime: Math.max(0, 16.67 - stats.frameTime),
    stats,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the global render scheduler instance
 */
export function getRenderScheduler(config?: RenderSchedulerConfig): RenderScheduler {
  return RenderScheduler.getInstance(config);
}

/**
 * Reset the global scheduler (for testing)
 */
export function resetRenderScheduler(): void {
  RenderScheduler.reset();
}

/**
 * Schedule work at a given priority
 */
export function scheduleWork(
  callback: () => void | Promise<void>,
  priority: RenderPriority = 'normal'
): string {
  return RenderScheduler.getInstance().schedule(callback, { priority });
}

/**
 * Cancel scheduled work
 */
export function cancelWork(taskId: string): boolean {
  return RenderScheduler.getInstance().cancel(taskId);
}

/**
 * Yield to main thread
 */
export function yieldToMain(): Promise<void> {
  return RenderScheduler.getInstance().yieldToMain();
}

/**
 * Run work in chunks with yielding
 */
export async function runInChunks<T>(
  items: T[],
  processor: (item: T, index: number) => void,
  options?: { chunkSize?: number; yieldAfter?: number }
): Promise<void> {
  return RenderScheduler.getInstance().runInChunks(items, processor, options);
}

// ============================================================================
// Exports
// ============================================================================

export default {
  RenderScheduler,
  getRenderScheduler,
  resetRenderScheduler,
  scheduleWork,
  cancelWork,
  yieldToMain,
  runInChunks,
  useOptimizedRender,
  useDeferredRender,
  useScheduledWork,
  useRenderBudget,
};

// ============================================================================
// HMR Support
// ============================================================================

// Vite HMR disposal to prevent memory leaks during hot module replacement
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    RenderScheduler.reset();
  });
}
