/**
 * @file Hydration Scheduler
 * @description Core scheduler for the Auto-Prioritized Hydration System.
 *
 * The scheduler orchestrates hydration of React components using:
 * - Priority queue for ordering tasks by urgency
 * - IntersectionObserver for visibility-based hydration
 * - requestIdleCallback for background hydration
 * - Frame budgeting to prevent main thread blocking
 * - Interaction replay for seamless user experience
 *
 * Key Performance Optimizations:
 * - Never blocks main thread for more than 50ms per frame
 * - Yields to user input during hydration batches
 * - Uses passive observers where possible
 * - Pools common resources to reduce allocations
 *
 * @module hydration/hydration-scheduler
 */

import { HydrationPriorityQueue, type PriorityQueueStats } from './priority-queue';
import {
  type InteractionReplayManager,
  getInteractionReplayManager,
} from './interaction-replay';
import type {
  HydrationTask,
  HydrationPriority,
  HydrationStatus,
  HydrationSchedulerConfig,
  HydrationBoundaryId,
  HydrationMetric,
  HydrationMetricsSnapshot,
  HydrationEvent,
  HydrationEventListener,
  HydrationEventType,
} from './types';
import {
  DEFAULT_SCHEDULER_CONFIG,
  createInitialHydrationStatus,
  PRIORITY_WEIGHTS,
} from './types';

// ============================================================================
// Types
// ============================================================================

/**
 * Internal representation of a registered boundary.
 */
interface RegisteredBoundary {
  task: HydrationTask;
  status: HydrationStatus;
  visibilityUnsubscribe?: () => void;
  timeoutId?: ReturnType<typeof setTimeout>;
}

/**
 * Scheduler state for external observation.
 */
export interface SchedulerState {
  readonly isRunning: boolean;
  readonly isPaused: boolean;
  readonly isProcessing: boolean;
  readonly queueSize: number;
  readonly hydratedCount: number;
  readonly pendingCount: number;
  readonly failedCount: number;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Checks if requestIdleCallback is available.
 */
function hasIdleCallback(): boolean {
  return typeof window !== 'undefined' && 'requestIdleCallback' in window;
}

/**
 * Safe requestIdleCallback with fallback.
 */
function requestIdle(
  callback: (deadline: IdleDeadline) => void,
  options?: IdleRequestOptions
): number {
  if (hasIdleCallback()) {
    return window.requestIdleCallback(callback, options);
  }

  // Fallback using setTimeout with simulated deadline
  const timeoutId = window.setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining: () => 50,
    });
  }, options?.timeout ?? 100);
  return timeoutId;
}

/**
 * Safe cancelIdleCallback with fallback.
 */
function cancelIdle(handle: number): void {
  if (hasIdleCallback()) {
    window.cancelIdleCallback(handle);
  } else {
    window.clearTimeout(handle);
  }
}

/**
 * Type for the experimental Scheduler API on window
 */
interface WindowWithScheduler extends Window {
  scheduler: {
    yield: () => Promise<void>;
  };
}

/**
 * Type guard for checking if window has the scheduler.yield API
 */
function hasSchedulerYieldAPI(win: Window): win is WindowWithScheduler {
  return (
    'scheduler' in win &&
    typeof (win as WindowWithScheduler).scheduler === 'object' &&
    (win as WindowWithScheduler).scheduler !== null &&
    'yield' in (win as WindowWithScheduler).scheduler
  );
}

/**
 * Yields to the main thread.
 */
async function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    if (hasSchedulerYieldAPI(window)) {
      // Use scheduler.yield if available (modern browsers)
      void window.scheduler.yield().then(resolve);
    } else {
      // Fallback to setTimeout
      setTimeout(resolve, 0);
    }
  });
}

/**
 * Calculates percentile from sorted array.
 */
function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const index = Math.ceil((p / 100) * sortedValues.length) - 1;
  const clampedIndex = Math.max(0, Math.min(index, sortedValues.length - 1));
  return sortedValues[clampedIndex] ?? 0;
}

// ============================================================================
// Hydration Scheduler Class
// ============================================================================

/**
 * Core scheduler for auto-prioritized hydration.
 *
 * @example
 * ```typescript
 * const scheduler = new HydrationScheduler({ debug: true });
 *
 * scheduler.register({
 *   id: 'hero-section',
 *   priority: 'critical',
 *   trigger: 'immediate',
 *   hydrate: async () => { ... },
 * });
 *
 * scheduler.start();
 * ```
 */
export class HydrationScheduler {
  /** Configuration */
  private readonly config: HydrationSchedulerConfig;

  /** Priority queue for pending tasks */
  private readonly queue: HydrationPriorityQueue;

  /** Registered boundaries */
  private readonly boundaries = new Map<HydrationBoundaryId, RegisteredBoundary>();

  /** Visibility observer */
  private visibilityObserver: IntersectionObserver | null = null;

  /** Media query listeners */
  private readonly mediaListeners = new Map<string, MediaQueryList>();

  /** Interaction replay manager */
  private readonly replayManager: InteractionReplayManager;

  /** Event listeners */
  private readonly eventListeners = new Map<HydrationEventType, Set<HydrationEventListener>>();

  /** Metrics storage */
  private readonly metrics: HydrationMetric[] = [];

  /** State */
  private isRunning = false;
  private isPaused = false;
  private isProcessing = false;
  private idleCallbackHandle: number | null = null;
  private animationFrameHandle: number | null = null;
  private startTime: number | null = null;
  private aboveFoldHydrationTime: number | null = null;
  private fullHydrationTime: number | null = null;

  /**
   * Creates a new HydrationScheduler.
   *
   * @param config - Scheduler configuration
   */
  constructor(config: Partial<HydrationSchedulerConfig> = {}) {
    this.config = {
      ...DEFAULT_SCHEDULER_CONFIG,
      ...config,
      budget: {
        ...DEFAULT_SCHEDULER_CONFIG.budget,
        ...config.budget,
      },
      visibility: {
        ...DEFAULT_SCHEDULER_CONFIG.visibility,
        ...config.visibility,
      },
    };

    this.queue = new HydrationPriorityQueue({
      maxSize: this.config.maxQueueSize,
      onOverflow: (task) => {
        this.emitEvent('queue:overflow', task.id, { task });
        this.log(`Queue overflow, dropped task: ${task.id}`, 'warn');
      },
    });

    this.replayManager = getInteractionReplayManager(
      undefined,
      this.config.debug
    );

    this.initializeVisibilityObserver();
  }

  // ==========================================================================
  // Lifecycle API
  // ==========================================================================

  /**
   * Starts the hydration scheduler.
   * Begins processing queued tasks according to their priority and triggers.
   */
  start(): void {
    if (this.isRunning) {
      this.log('Scheduler already running');
      return;
    }

    this.isRunning = true;
    this.startTime = performance.now();

    this.log('Scheduler started');
    this.scheduleProcessing();
  }

  /**
   * Stops the hydration scheduler.
   * Pending tasks remain in queue but processing stops.
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.cancelScheduledProcessing();

    this.log('Scheduler stopped');
  }

  /**
   * Pauses the scheduler without clearing the queue.
   */
  pause(): void {
    if (this.isPaused) {
      return;
    }

    this.isPaused = true;
    this.cancelScheduledProcessing();
    this.emitEvent('scheduler:paused');

    this.log('Scheduler paused');
  }

  /**
   * Resumes a paused scheduler.
   */
  resume(): void {
    if (!this.isPaused) {
      return;
    }

    this.isPaused = false;
    this.emitEvent('scheduler:resumed');

    if (this.isRunning) {
      this.scheduleProcessing();
    }

    this.log('Scheduler resumed');
  }

  /**
   * Disposes of all resources.
   * Call when unmounting the hydration system.
   */
  dispose(): void {
    this.stop();

    // Clean up boundaries
    for (const [id, boundary] of this.boundaries) {
      boundary.visibilityUnsubscribe?.();
      if (boundary.timeoutId) {
        clearTimeout(boundary.timeoutId);
      }
      this.replayManager.clearCaptured(id);
    }
    this.boundaries.clear();

    // Clean up observer
    this.visibilityObserver?.disconnect();
    this.visibilityObserver = null;

    // Clean up media listeners
    // Clear the map - the MediaQueryList will be garbage collected
    this.mediaListeners.clear();

    // Clear event listeners
    this.eventListeners.clear();

    // Clear queue
    this.queue.clear();

    this.log('Scheduler disposed');
  }

  // ==========================================================================
  // Registration API
  // ==========================================================================

  /**
   * Registers a hydration task.
   *
   * @param task - The hydration task to register
   */
  register(task: HydrationTask): void {
    // Check if already registered
    if (this.boundaries.has(task.id)) {
      this.log(`Boundary ${task.id} already registered, updating`);
      this.unregister(task.id);
    }

    // Create registered boundary
    const boundary: RegisteredBoundary = {
      task,
      status: createInitialHydrationStatus(),
    };

    this.boundaries.set(task.id, boundary);
    this.emitEvent('boundary:registered', task.id, { task });

    // Setup trigger-specific behavior
    this.setupTrigger(boundary);

    this.log(`Registered boundary: ${task.id} (${task.priority}/${task.trigger})`);
  }

  /**
   * Unregisters a hydration task.
   *
   * @param id - ID of the task to unregister
   */
  unregister(id: HydrationBoundaryId): void {
    const boundary = this.boundaries.get(id);

    if (!boundary) {
      return;
    }

    // Clean up trigger
    boundary.visibilityUnsubscribe?.();
    if (boundary.timeoutId) {
      clearTimeout(boundary.timeoutId);
    }

    // Remove from queue if pending
    this.queue.remove(id);

    // Clean up replay buffer
    this.replayManager.clearCaptured(id);

    this.boundaries.delete(id);
    this.emitEvent('boundary:unregistered', id);

    this.log(`Unregistered boundary: ${id}`);
  }

  // ==========================================================================
  // Control API
  // ==========================================================================

  /**
   * Updates the priority of a registered boundary.
   *
   * @param id - ID of the boundary
   * @param priority - New priority level
   */
  updatePriority(id: HydrationBoundaryId, priority: HydrationPriority): void {
    const boundary = this.boundaries.get(id);

    if (!boundary) {
      this.log(`Cannot update priority: boundary ${id} not found`, 'warn');
      return;
    }

    // Update task
    const updatedTask: HydrationTask = {
      ...boundary.task,
      priority,
    };
    boundary.task = updatedTask;

    // Update queue position if queued
    if (this.queue.has(id)) {
      this.queue.updatePriority(id, priority);
    }

    this.log(`Updated priority for ${id}: ${priority}`);
  }

  /**
   * Forces immediate hydration of a specific boundary.
   *
   * @param id - ID of the boundary to hydrate
   */
  async forceHydrate(id: HydrationBoundaryId): Promise<void> {
    const boundary = this.boundaries.get(id);

    if (!boundary) {
      throw new Error(`Boundary ${id} not found`);
    }

    if (boundary.status.state === 'hydrated') {
      return;
    }

    // Remove from queue to avoid double hydration
    this.queue.remove(id);

    await this.hydrateTask(boundary);
  }

  /**
   * Forces hydration of all registered boundaries.
   */
  async forceHydrateAll(): Promise<void> {
    const pending = Array.from(this.boundaries.values()).filter(
      (b) => b.status.state === 'pending'
    );

    // Sort by priority for predictable order
    pending.sort((a, b) =>
      PRIORITY_WEIGHTS[a.task.priority] - PRIORITY_WEIGHTS[b.task.priority]
    );

    for (const boundary of pending) {
      await this.forceHydrate(boundary.task.id);
    }
  }

  // ==========================================================================
  // Query API
  // ==========================================================================

  /**
   * Gets the status of a specific boundary.
   *
   * @param id - ID of the boundary
   * @returns The hydration status, or undefined if not found
   */
  getStatus(id: HydrationBoundaryId): HydrationStatus | undefined {
    return this.boundaries.get(id)?.status;
  }

  /**
   * Gets the current scheduler state.
   */
  getState(): SchedulerState {
    let hydratedCount = 0;
    let pendingCount = 0;
    let failedCount = 0;

    for (const boundary of this.boundaries.values()) {
      switch (boundary.status.state) {
        case 'hydrated':
          hydratedCount++;
          break;
        case 'pending':
        case 'hydrating':
          pendingCount++;
          break;
        case 'error':
          failedCount++;
          break;
      }
    }

    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      isProcessing: this.isProcessing,
      queueSize: this.queue.size,
      hydratedCount,
      pendingCount,
      failedCount,
    };
  }

  /**
   * Gets queue statistics.
   */
  getQueueStats(): PriorityQueueStats {
    return this.queue.getStats();
  }

  /**
   * Gets aggregated metrics snapshot.
   */
  getMetrics(): HydrationMetricsSnapshot {
    const state = this.getState();
    const durations = this.metrics
      .filter((m) => m.success)
      .map((m) => m.hydrationDuration)
      .sort((a, b) => a - b);

    const totalReplayed = this.metrics.reduce(
      (sum, m) => sum + m.replayedInteractions,
      0
    );

    return {
      totalBoundaries: this.boundaries.size,
      hydratedCount: state.hydratedCount,
      pendingCount: state.pendingCount,
      failedCount: state.failedCount,
      averageHydrationDuration:
        durations.length > 0
          ? durations.reduce((a, b) => a + b, 0) / durations.length
          : 0,
      p95HydrationDuration: percentile(durations, 95),
      totalReplayedInteractions: totalReplayed,
      timeToFullHydration: this.fullHydrationTime,
      timeToAboveFoldHydration: this.aboveFoldHydrationTime,
      queueSize: this.queue.size,
      timestamp: Date.now(),
    };
  }

  /**
   * Gets the scheduler configuration.
   */
  getConfig(): HydrationSchedulerConfig {
    return this.config;
  }

  // ==========================================================================
  // Event API
  // ==========================================================================

  /**
   * Adds an event listener.
   *
   * @param type - Event type to listen for
   * @param listener - Callback function
   * @returns Unsubscribe function
   */
  on(type: HydrationEventType, listener: HydrationEventListener): () => void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.add(listener);
    }

    return () => {
      this.eventListeners.get(type)?.delete(listener);
    };
  }

  /**
   * Removes an event listener.
   */
  off(type: HydrationEventType, listener: HydrationEventListener): void {
    this.eventListeners.get(type)?.delete(listener);
  }

  // ==========================================================================
  // Private: Trigger Setup
  // ==========================================================================

  /**
   * Sets up trigger-specific behavior for a boundary.
   */
  private setupTrigger(boundary: RegisteredBoundary): void {
    const { task } = boundary;

    switch (task.trigger) {
      case 'immediate':
        // Queue immediately with high priority
        this.enqueue(boundary);
        break;

      case 'visible':
        // Setup visibility observation
        this.observeVisibility(boundary);
        break;

      case 'interaction':
        // Start interaction capture and observe
        this.setupInteractionTrigger(boundary);
        break;

      case 'idle':
        // Queue with idle priority
        this.enqueue(boundary);
        break;

      case 'media':
        // Setup media query listener
        this.setupMediaTrigger(boundary);
        break;

      case 'manual':
        // Don't auto-queue, wait for explicit hydrate call
        break;
    }

    // Setup timeout if specified
    if (task.timeout && task.trigger !== 'immediate') {
      boundary.timeoutId = setTimeout(() => {
        if (boundary.status.state === 'pending') {
          this.log(`Timeout reached for ${task.id}, queueing`);
          this.enqueue(boundary);
        }
      }, task.timeout);
    }
  }

  /**
   * Observes visibility for a boundary.
   */
  private observeVisibility(boundary: RegisteredBoundary): void {
    const { task } = boundary;

    if (!task.element || !this.visibilityObserver) {
      // No element reference, queue immediately
      this.enqueue(boundary);
      return;
    }

    // Store unsubscribe function
    boundary.visibilityUnsubscribe = () => {
      if (task.element && this.visibilityObserver) {
        this.visibilityObserver.unobserve(task.element);
      }
    };

    // Start observing
    this.visibilityObserver.observe(task.element);
  }

  /**
   * Sets up interaction trigger for a boundary.
   */
  private setupInteractionTrigger(boundary: RegisteredBoundary): void {
    const { task } = boundary;

    if (!task.element) {
      // No element, fall back to visibility
      this.observeVisibility(boundary);
      return;
    }

    // Start capturing interactions
    this.replayManager.startCapture(task.id, task.element);

    // Also observe visibility as a fallback
    this.observeVisibility(boundary);

    // Setup interaction listeners for immediate hydration
    const interactionHandler = () => {
      if (boundary.status.state === 'pending') {
        this.log(`Interaction triggered hydration for ${task.id}`);
        // Boost priority and queue
        boundary.task = { ...boundary.task, priority: 'critical' };
        this.enqueue(boundary);
      }
    };

    const events = ['click', 'focus', 'touchstart'];
    for (const event of events) {
      task.element.addEventListener(event, interactionHandler, {
        once: true,
        capture: true,
        passive: true,
      });
    }

    // Update unsubscribe to include interaction cleanup
    const originalUnsubscribe = boundary.visibilityUnsubscribe;
    boundary.visibilityUnsubscribe = () => {
      originalUnsubscribe?.();
      for (const event of events) {
        task.element?.removeEventListener(event, interactionHandler, { capture: true });
      }
    };
  }

  /**
   * Sets up media query trigger for a boundary.
   */
  private setupMediaTrigger(boundary: RegisteredBoundary): void {
    const { task } = boundary;
    const mediaQuery = task.metadata?.routePath; // Using routePath as media query for now

    if (!mediaQuery || typeof window === 'undefined') {
      this.enqueue(boundary);
      return;
    }

    let mql = this.mediaListeners.get(mediaQuery);

    if (!mql) {
      mql = window.matchMedia(mediaQuery);
      this.mediaListeners.set(mediaQuery, mql);
    }

    const handler = (event: MediaQueryListEvent | MediaQueryList) => {
      if (event.matches && boundary.status.state === 'pending') {
        this.enqueue(boundary);
      }
    };

    // Check initial state
    if (mql.matches) {
      this.enqueue(boundary);
    } else {
      mql.addEventListener('change', handler as (e: MediaQueryListEvent) => void);

      boundary.visibilityUnsubscribe = () => {
        mql?.removeEventListener('change', handler as (e: MediaQueryListEvent) => void);
      };
    }
  }

  // ==========================================================================
  // Private: Processing
  // ==========================================================================

  /**
   * Enqueues a boundary for hydration.
   */
  private enqueue(boundary: RegisteredBoundary): void {
    if (boundary.status.state !== 'pending') {
      return;
    }

    // Cancel timeout if any
    if (boundary.timeoutId) {
      clearTimeout(boundary.timeoutId);
      boundary.timeoutId = undefined;
    }

    // Stop visibility observation
    boundary.visibilityUnsubscribe?.();
    boundary.visibilityUnsubscribe = undefined;

    // Add to queue
    this.queue.insert(boundary.task);

    // Ensure processing is scheduled
    if (this.isRunning && !this.isPaused) {
      this.scheduleProcessing();
    }
  }

  /**
   * Schedules processing using appropriate callback.
   */
  private scheduleProcessing(): void {
    if (this.isProcessing || this.isPaused || !this.isRunning) {
      return;
    }

    // Cancel any existing scheduled processing
    this.cancelScheduledProcessing();

    // Check if we have critical tasks
    const nextTask = this.queue.peek();

    if (nextTask?.priority === 'critical') {
      // Process critical tasks immediately in next frame
      this.animationFrameHandle = requestAnimationFrame(() => {
        this.processQueue();
      });
    } else if (nextTask?.priority === 'idle' && this.config.useIdleCallback) {
      // Process idle tasks in idle time
      this.idleCallbackHandle = requestIdle(
        async (deadline) => this.processQueueWithDeadline(deadline),
        { timeout: 5000 }
      );
    } else if (nextTask) {
      // Process normal tasks in next frame
      this.animationFrameHandle = requestAnimationFrame(() => {
        this.processQueue();
      });
    }
  }

  /**
   * Cancels any scheduled processing.
   */
  private cancelScheduledProcessing(): void {
    if (this.idleCallbackHandle !== null) {
      cancelIdle(this.idleCallbackHandle);
      this.idleCallbackHandle = null;
    }
    if (this.animationFrameHandle !== null) {
      cancelAnimationFrame(this.animationFrameHandle);
      this.animationFrameHandle = null;
    }
  }

  /**
   * Processes the queue with a deadline (for idle callback).
   */
  private async processQueueWithDeadline(deadline: IdleDeadline): Promise<void> {
    if (!this.isRunning || this.isPaused || this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      while (
        !this.queue.isEmpty() &&
        (deadline.timeRemaining() > 0 || deadline.didTimeout)
      ) {
        const task = this.queue.extractMin();
        if (task) {
          const boundary = this.boundaries.get(task.id);
          if (boundary?.status.state === 'pending') {
            await this.hydrateTask(boundary);
          }
        }

        // Check if we should yield
        if (
          deadline.timeRemaining() <= 0 &&
          !deadline.didTimeout &&
          !this.queue.isEmpty()
        ) {
          break;
        }
      }
    } finally {
      this.isProcessing = false;

      // Schedule more processing if needed
      if (!this.queue.isEmpty()) {
        this.scheduleProcessing();
      } else {
        this.checkFullHydration();
      }
    }
  }

  /**
   * Processes the queue with frame budget.
   */
  private async processQueue(): Promise<void> {
    if (!this.isRunning || this.isPaused || this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    const frameStart = performance.now();
    let tasksProcessed = 0;

    try {
      while (
        !this.queue.isEmpty() &&
        tasksProcessed < this.config.budget.maxTasksPerFrame
      ) {
        // Check frame budget
        const elapsed = performance.now() - frameStart;
        if (elapsed >= this.config.budget.frameTimeLimit) {
          break;
        }

        const task = this.queue.extractMin();
        if (task) {
          const boundary = this.boundaries.get(task.id);
          if (boundary?.status.state === 'pending') {
            await this.hydrateTask(boundary);
            tasksProcessed++;
          }
        }

        // Yield to main thread if configured
        if (this.config.budget.yieldToMain && tasksProcessed % 3 === 0) {
          await yieldToMain();
        }
      }
    } finally {
      this.isProcessing = false;

      // Schedule more processing if needed
      if (!this.queue.isEmpty()) {
        this.scheduleProcessing();
      } else {
        this.checkFullHydration();
      }
    }
  }

  /**
   * Hydrates a single task.
   */
  private async hydrateTask(boundary: RegisteredBoundary): Promise<void> {
    const { task } = boundary;
    const startTime = performance.now();

    // Update status to hydrating
    boundary.status = {
      ...boundary.status,
      state: 'hydrating',
      startedAt: startTime,
      attempts: boundary.status.attempts + 1,
    };

    this.emitEvent('hydration:start', task.id);
    this.log(`Hydrating: ${task.id}`);

    try {
      // Execute hydration
      await task.hydrate();

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Update status to hydrated
      boundary.status = {
        ...boundary.status,
        state: 'hydrated',
        completedAt: endTime,
        duration,
      };

      // Replay any captured interactions
      let replayedCount = 0;
      if (this.config.interactionStrategy === 'replay') {
        replayedCount = await this.replayManager.replayInteractions(task.id);
        if (replayedCount > 0) {
          boundary.status = {
            ...boundary.status,
            triggeredByReplay: true,
          };
        }
      }

      // Collect metrics
      if (this.config.collectMetrics && Math.random() <= this.config.metricsSampleRate) {
        this.recordMetric(boundary, duration, true, replayedCount);
      }

      // Track above-the-fold hydration
      if (task.metadata?.aboveTheFold && !this.aboveFoldHydrationTime && this.startTime) {
        this.aboveFoldHydrationTime = endTime - this.startTime;
      }

      // Callbacks
      task.onHydrated?.();

      this.emitEvent('hydration:complete', task.id, { duration, replayedCount });
      this.log(`Hydrated: ${task.id} (${duration.toFixed(2)}ms)`);
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      const err = error instanceof Error ? error : new Error(String(error));

      // Update status to error
      boundary.status = {
        ...boundary.status,
        state: 'error',
        completedAt: endTime,
        duration,
        error: err,
      };

      // Stop capturing interactions
      this.replayManager.clearCaptured(task.id);

      // Collect metrics
      if (this.config.collectMetrics) {
        this.recordMetric(boundary, duration, false, 0, err.message);
      }

      // Callbacks
      task.onError?.(err);

      this.emitEvent('hydration:error', task.id, { error: err, duration });
      this.log(`Hydration failed: ${task.id} - ${err.message}`, 'error');
    }
  }

  /**
   * Records a hydration metric.
   */
  private recordMetric(
    boundary: RegisteredBoundary,
    hydrationDuration: number,
    success: boolean,
    replayedInteractions: number,
    errorMessage?: string
  ): void {
    const { task, status } = boundary;
    const queueDuration = status.startedAt
      ? status.startedAt - task.enqueuedAt
      : 0;

    const metric: HydrationMetric = {
      boundaryId: task.id,
      componentName: task.metadata?.componentName,
      priority: task.priority,
      trigger: task.trigger,
      queueDuration,
      hydrationDuration,
      totalDuration: queueDuration + hydrationDuration,
      success,
      errorMessage,
      replayedInteractions,
      timestamp: Date.now(),
    };

    this.metrics.push(metric);

    // Keep metrics bounded
    while (this.metrics.length > 1000) {
      this.metrics.shift();
    }
  }

  /**
   * Checks if all boundaries are hydrated.
   */
  private checkFullHydration(): void {
    if (this.fullHydrationTime !== null) {
      return;
    }

    const allHydrated = Array.from(this.boundaries.values()).every(
      (b) => b.status.state === 'hydrated' || b.status.state === 'error' || b.status.state === 'skipped'
    );

    if (allHydrated && this.startTime) {
      this.fullHydrationTime = performance.now() - this.startTime;
      this.log(`Full hydration complete: ${this.fullHydrationTime.toFixed(2)}ms`);
    }
  }

  // ==========================================================================
  // Private: Visibility Observer
  // ==========================================================================

  /**
   * Initializes the IntersectionObserver for visibility-based hydration.
   */
  private initializeVisibilityObserver(): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    const thresholdValue = this.config.visibility.threshold;
    const threshold = (Array.isArray(thresholdValue)
      ? [...thresholdValue]
      : (thresholdValue ?? 0)) as number | number[];
    this.visibilityObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.handleVisibilityChange(entry.target as HTMLElement);
          }
        }
      },
      {
        root: this.config.visibility.root ?? null,
        rootMargin: this.config.visibility.rootMargin ?? '100px 0px',
        threshold,
      }
    );
  }

  /**
   * Handles visibility change for an element.
   */
  private handleVisibilityChange(element: HTMLElement): void {
    // Find the boundary for this element
    for (const [id, boundary] of this.boundaries) {
      if (boundary.task.element === element && boundary.status.state === 'pending') {
        this.log(`Visibility triggered hydration for ${id}`);
        this.enqueue(boundary);
        break;
      }
    }
  }

  // ==========================================================================
  // Private: Event Emission
  // ==========================================================================

  /**
   * Emits an event to all listeners.
   */
  private emitEvent(
    type: HydrationEventType,
    boundaryId?: HydrationBoundaryId,
    payload?: unknown
  ): void {
    const event: HydrationEvent = {
      type,
      timestamp: Date.now(),
      boundaryId,
      payload,
    };

    const listeners = this.eventListeners.get(type);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error) {
          console.error(`[HydrationScheduler] Event listener error:`, error);
        }
      }
    }
  }

  // ==========================================================================
  // Private: Logging
  // ==========================================================================

  /**
   * Debug logging helper.
   */
  private log(message: string, level: 'log' | 'warn' | 'error' = 'log'): void {
    if (this.config.debug) {
      console[level](`[HydrationScheduler] ${message}`);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let schedulerInstance: HydrationScheduler | null = null;

/**
 * Gets or creates the global HydrationScheduler instance.
 *
 * @param config - Scheduler configuration (only used if creating new instance)
 * @returns The global HydrationScheduler instance
 */
export function getHydrationScheduler(
  config?: Partial<HydrationSchedulerConfig>
): HydrationScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new HydrationScheduler(config);
  }
  return schedulerInstance;
}

/**
 * Resets the global HydrationScheduler instance.
 * Primarily useful for testing.
 */
export function resetHydrationScheduler(): void {
  if (schedulerInstance) {
    schedulerInstance.dispose();
    schedulerInstance = null;
  }
}

// ============================================================================
// HMR Support
// ============================================================================

// Vite HMR disposal to prevent memory leaks during hot module replacement
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    resetHydrationScheduler();
  });
}

// ============================================================================
// Exports
// ============================================================================

// SchedulerState is already exported inline above
