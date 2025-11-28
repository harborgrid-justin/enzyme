/**
 * @file Priority Queue Implementation
 * @description High-performance priority queue optimized for the hydration scheduler.
 *
 * This implementation uses a binary min-heap for O(log n) insertion and extraction,
 * with additional features for the hydration use case:
 * - Priority updates without re-insertion
 * - Bulk operations for efficiency
 * - Iteration support
 * - Capacity limits with overflow handling
 *
 * Time Complexity:
 * - insert: O(log n)
 * - extractMin: O(log n)
 * - peek: O(1)
 * - updatePriority: O(n) for lookup + O(log n) for heapify
 * - remove: O(n) for lookup + O(log n) for heapify
 *
 * @module hydration/priority-queue
 */

import type { HydrationTask, HydrationPriority, HydrationBoundaryId } from './types';
import { PRIORITY_WEIGHTS } from './types';

// ============================================================================
// Types
// ============================================================================

/**
 * Comparison result for queue ordering.
 * Negative = a comes before b, Positive = b comes before a, Zero = equal
 */
type CompareResult = -1 | 0 | 1;

/**
 * Comparator function for priority queue ordering.
 */
type TaskComparator = (a: HydrationTask, b: HydrationTask) => CompareResult;

/**
 * Filter predicate for queue operations.
 */
type TaskPredicate = (task: HydrationTask) => boolean;

/**
 * Configuration for the priority queue.
 */
export interface PriorityQueueConfig {
  /** Maximum queue capacity (0 = unlimited) */
  readonly maxSize: number;
  /** Custom comparator (default: by priority weight then enqueue time) */
  readonly comparator?: TaskComparator;
  /** Callback when queue overflows */
  readonly onOverflow?: (droppedTask: HydrationTask) => void;
}

/**
 * Default queue configuration.
 */
const DEFAULT_QUEUE_CONFIG: Required<PriorityQueueConfig> = {
  maxSize: 1000,
  comparator: defaultComparator,
  onOverflow: () => {},
};

// ============================================================================
// Comparator
// ============================================================================

/**
 * Default task comparator.
 * Orders by:
 * 1. Priority weight (lower = higher priority)
 * 2. Enqueue time (earlier = higher priority)
 *
 * @param a - First task
 * @param b - Second task
 * @returns Comparison result
 */
function defaultComparator(a: HydrationTask, b: HydrationTask): CompareResult {
  const priorityDiff = PRIORITY_WEIGHTS[a.priority] - PRIORITY_WEIGHTS[b.priority];

  if (priorityDiff < 0) return -1;
  if (priorityDiff > 0) return 1;

  // Same priority: order by enqueue time (FIFO within priority)
  if (a.enqueuedAt < b.enqueuedAt) return -1;
  if (a.enqueuedAt > b.enqueuedAt) return 1;

  return 0;
}

// ============================================================================
// Priority Queue Class
// ============================================================================

/**
 * Binary min-heap priority queue for hydration tasks.
 *
 * @example
 * ```typescript
 * const queue = new HydrationPriorityQueue({ maxSize: 100 });
 *
 * queue.insert(task1);
 * queue.insert(task2);
 *
 * while (!queue.isEmpty()) {
 *   const task = queue.extractMin();
 *   await task.hydrate();
 * }
 * ```
 */
export class HydrationPriorityQueue {
  /** The heap array */
  private heap: HydrationTask[] = [];

  /** Index lookup for O(1) task finding */
  private indexMap: Map<HydrationBoundaryId, number> = new Map();

  /** Queue configuration */
  private readonly config: Required<PriorityQueueConfig>;

  /**
   * Creates a new priority queue.
   *
   * @param config - Queue configuration
   */
  constructor(config: Partial<PriorityQueueConfig> = {}) {
    this.config = {
      ...DEFAULT_QUEUE_CONFIG,
      ...config,
    };
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Returns the number of tasks in the queue.
   */
  get size(): number {
    return this.heap.length;
  }

  /**
   * Returns whether the queue is empty.
   */
  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  /**
   * Returns whether the queue is full.
   */
  isFull(): boolean {
    return this.config.maxSize > 0 && this.heap.length >= this.config.maxSize;
  }

  /**
   * Inserts a task into the queue.
   * If queue is full, drops the lowest priority task.
   *
   * @param task - Task to insert
   * @returns true if inserted, false if dropped due to lower priority
   */
  insert(task: HydrationTask): boolean {
    // Check if task already exists
    if (this.indexMap.has(task.id)) {
      console.warn(`[PriorityQueue] Task ${task.id} already in queue, updating instead`);
      this.updatePriority(task.id, task.priority);
      return true;
    }

    // Handle queue overflow
    if (this.isFull()) {
      const lowestPriorityTask = this.peekLowestPriority();

      if (lowestPriorityTask && this.config.comparator(task, lowestPriorityTask) >= 0) {
        // New task is same or lower priority than lowest - drop new task
        this.config.onOverflow(task);
        return false;
      }

      // Remove lowest priority task to make room
      const dropped = this.extractLowestPriority();
      if (dropped) {
        this.config.onOverflow(dropped);
      }
    }

    // Insert into heap
    const index = this.heap.length;
    this.heap.push(task);
    this.indexMap.set(task.id, index);
    this.bubbleUp(index);

    return true;
  }

  /**
   * Inserts multiple tasks efficiently.
   *
   * @param tasks - Tasks to insert
   * @returns Number of tasks successfully inserted
   */
  insertMany(tasks: readonly HydrationTask[]): number {
    let inserted = 0;

    for (const task of tasks) {
      if (this.insert(task)) {
        inserted++;
      }
    }

    return inserted;
  }

  /**
   * Returns the highest priority task without removing it.
   *
   * @returns The highest priority task, or undefined if empty
   */
  peek(): HydrationTask | undefined {
    return this.heap[0];
  }

  /**
   * Removes and returns the highest priority task.
   *
   * @returns The highest priority task, or undefined if empty
   */
  extractMin(): HydrationTask | undefined {
    if (this.isEmpty()) {
      return undefined;
    }

    const min = this.heap[0];
    const last = this.heap.pop();

    if (this.heap.length > 0 && last) {
      this.heap[0] = last;
      this.indexMap.set(last.id, 0);
      this.bubbleDown(0);
    }

    if (min) {
      this.indexMap.delete(min.id);
    }
    return min;
  }

  /**
   * Extracts multiple high-priority tasks.
   *
   * @param count - Maximum number of tasks to extract
   * @returns Array of extracted tasks
   */
  extractMany(count: number): HydrationTask[] {
    const tasks: HydrationTask[] = [];

    for (let i = 0; i < count && !this.isEmpty(); i++) {
      const task = this.extractMin();
      if (task) {
        tasks.push(task);
      }
    }

    return tasks;
  }

  /**
   * Removes a specific task from the queue.
   *
   * @param id - ID of the task to remove
   * @returns The removed task, or undefined if not found
   */
  remove(id: HydrationBoundaryId): HydrationTask | undefined {
    const index = this.indexMap.get(id);

    if (index === undefined) {
      return undefined;
    }

    const task = this.heap[index];

    // Replace with last element
    const last = this.heap.pop();

    if (last && index < this.heap.length) {
      this.heap[index] = last;
      this.indexMap.set(last.id, index);

      // Re-heapify (might need to bubble up or down)
      const parent = Math.floor((index - 1) / 2);
      if (index > 0 && this.heap[index] && this.heap[parent] && this.config.comparator(this.heap[index], this.heap[parent]) < 0) {
        this.bubbleUp(index);
      } else {
        this.bubbleDown(index);
      }
    }

    this.indexMap.delete(id);
    return task;
  }

  /**
   * Updates the priority of a task.
   *
   * @param id - ID of the task to update
   * @param newPriority - New priority level
   * @returns true if updated, false if not found
   */
  updatePriority(id: HydrationBoundaryId, newPriority: HydrationPriority): boolean {
    const index = this.indexMap.get(id);

    if (index === undefined) {
      return false;
    }

    const task = this.heap[index];
    if (!task) {
      return false;
    }

    const oldPriority = task.priority;

    if (oldPriority === newPriority) {
      return true;
    }

    // Create updated task (immutable update)
    const updatedTask: HydrationTask = {
      ...task,
      priority: newPriority,
    };
    this.heap[index] = updatedTask;

    // Re-heapify based on priority change direction
    const oldWeight = PRIORITY_WEIGHTS[oldPriority];
    const newWeight = PRIORITY_WEIGHTS[newPriority];

    if (newWeight < oldWeight) {
      // Priority increased (lower weight = higher priority)
      this.bubbleUp(index);
    } else {
      // Priority decreased
      this.bubbleDown(index);
    }

    return true;
  }

  /**
   * Checks if a task exists in the queue.
   *
   * @param id - ID of the task to check
   * @returns true if task exists
   */
  has(id: HydrationBoundaryId): boolean {
    return this.indexMap.has(id);
  }

  /**
   * Gets a task by ID without removing it.
   *
   * @param id - ID of the task to get
   * @returns The task, or undefined if not found
   */
  get(id: HydrationBoundaryId): HydrationTask | undefined {
    const index = this.indexMap.get(id);
    return index !== undefined ? this.heap[index] : undefined;
  }

  /**
   * Removes all tasks matching a predicate.
   *
   * @param predicate - Filter function
   * @returns Array of removed tasks
   */
  removeWhere(predicate: TaskPredicate): HydrationTask[] {
    const toRemove: HydrationBoundaryId[] = [];

    for (const task of this.heap) {
      if (predicate(task)) {
        toRemove.push(task.id);
      }
    }

    return toRemove.map((id) => this.remove(id)).filter((t): t is HydrationTask => t !== undefined);
  }

  /**
   * Returns all tasks matching a predicate.
   *
   * @param predicate - Filter function
   * @returns Array of matching tasks (not removed)
   */
  filter(predicate: TaskPredicate): HydrationTask[] {
    return this.heap.filter(predicate);
  }

  /**
   * Returns tasks by priority level.
   *
   * @param priority - Priority to filter by
   * @returns Array of tasks with the specified priority
   */
  getByPriority(priority: HydrationPriority): HydrationTask[] {
    return this.heap.filter((task) => task.priority === priority);
  }

  /**
   * Clears all tasks from the queue.
   */
  clear(): void {
    this.heap = [];
    this.indexMap.clear();
  }

  /**
   * Returns an iterator over tasks in priority order.
   * Note: This is destructive - it extracts all tasks.
   */
  *drain(): Generator<HydrationTask, void, unknown> {
    while (!this.isEmpty()) {
      const task = this.extractMin();
      if (task) {
        yield task;
      }
    }
  }

  /**
   * Returns a non-destructive iterator over tasks.
   * Note: Order is not guaranteed to be priority order.
   */
  [Symbol.iterator](): Iterator<HydrationTask> {
    return this.heap[Symbol.iterator]();
  }

  /**
   * Converts to array (non-destructive).
   * Note: Order is not guaranteed to be priority order.
   */
  toArray(): HydrationTask[] {
    return [...this.heap];
  }

  /**
   * Returns a sorted array of all tasks.
   * Note: This is O(n log n) and creates a new array.
   */
  toSortedArray(): HydrationTask[] {
    return [...this.heap].sort(this.config.comparator);
  }

  /**
   * Returns queue statistics.
   */
  getStats(): PriorityQueueStats {
    const byPriority: Record<HydrationPriority, number> = {
      critical: 0,
      high: 0,
      normal: 0,
      low: 0,
      idle: 0,
    };

    let oldestEnqueueTime = Infinity;
    let newestEnqueueTime = 0;

    for (const task of this.heap) {
      byPriority[task.priority]++;
      if (task.enqueuedAt < oldestEnqueueTime) {
        oldestEnqueueTime = task.enqueuedAt;
      }
      if (task.enqueuedAt > newestEnqueueTime) {
        newestEnqueueTime = task.enqueuedAt;
      }
    }

    return {
      size: this.heap.length,
      maxSize: this.config.maxSize,
      byPriority,
      oldestEnqueueTime: this.heap.length > 0 ? oldestEnqueueTime : null,
      newestEnqueueTime: this.heap.length > 0 ? newestEnqueueTime : null,
    };
  }

  // ==========================================================================
  // Private Heap Operations
  // ==========================================================================

  /**
   * Bubbles up an element to maintain heap property.
   */
  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const currentTask = this.heap[index];
      const parentTask = this.heap[parentIndex];

      if (!currentTask || !parentTask) break;

      if (this.config.comparator(currentTask, parentTask) >= 0) {
        break;
      }

      this.swap(index, parentIndex);
      index = parentIndex;
    }
  }

  /**
   * Bubbles down an element to maintain heap property.
   */
  private bubbleDown(index: number): void {
    const {length} = this.heap;

    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let smallest = index;

      const currentTask = this.heap[index];
      const leftTask = leftChild < length ? this.heap[leftChild] : undefined;
      const rightTask = rightChild < length ? this.heap[rightChild] : undefined;
      const smallestTask = this.heap[smallest];

      if (!currentTask || !smallestTask) break;

      if (
        leftTask &&
        this.config.comparator(leftTask, smallestTask) < 0
      ) {
        smallest = leftChild;
      }

      if (
        rightTask &&
        this.config.comparator(rightTask, this.heap[smallest] ?? currentTask) < 0
      ) {
        smallest = rightChild;
      }

      if (smallest === index) {
        break;
      }

      this.swap(index, smallest);
      index = smallest;
    }
  }

  /**
   * Swaps two elements in the heap.
   */
  private swap(i: number, j: number): void {
    const temp = this.heap[i];
    const taskI = this.heap[j];
    const taskJ = temp;
    
    if (!taskI || !taskJ) return;
    
    this.heap[i] = taskI;
    this.heap[j] = taskJ;

    // Update index map
    this.indexMap.set(taskI.id, i);
    this.indexMap.set(taskJ.id, j);
  }

  /**
   * Peeks at the lowest priority task.
   * Note: This is O(n) as lowest priority can be any leaf.
   */
  private peekLowestPriority(): HydrationTask | undefined {
    if (this.isEmpty()) {
      return undefined;
    }

    let lowest = this.heap[0];

    for (const task of this.heap) {
      if (lowest && this.config.comparator(task, lowest) > 0) {
        lowest = task;
      }
    }

    return lowest;
  }

  /**
   * Extracts the lowest priority task.
   */
  private extractLowestPriority(): HydrationTask | undefined {
    const lowest = this.peekLowestPriority();
    return lowest ? this.remove(lowest.id) : undefined;
  }
}

// ============================================================================
// Statistics Types
// ============================================================================

/**
 * Statistics about the priority queue.
 */
export interface PriorityQueueStats {
  /** Current queue size */
  readonly size: number;
  /** Maximum queue size */
  readonly maxSize: number;
  /** Count by priority level */
  readonly byPriority: Record<HydrationPriority, number>;
  /** Oldest enqueue timestamp */
  readonly oldestEnqueueTime: number | null;
  /** Newest enqueue timestamp */
  readonly newestEnqueueTime: number | null;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a new priority queue with default configuration.
 *
 * @param maxSize - Maximum queue size (default: 1000)
 * @returns A new priority queue instance
 */
export function createPriorityQueue(maxSize = 1000): HydrationPriorityQueue {
  return new HydrationPriorityQueue({ maxSize });
}

/**
 * Creates a priority queue pre-populated with tasks.
 *
 * @param tasks - Initial tasks
 * @param config - Queue configuration
 * @returns A new priority queue with tasks inserted
 */
export function createPriorityQueueFrom(
  tasks: readonly HydrationTask[],
  config: Partial<PriorityQueueConfig> = {}
): HydrationPriorityQueue {
  const queue = new HydrationPriorityQueue(config);
  queue.insertMany(tasks);
  return queue;
}
