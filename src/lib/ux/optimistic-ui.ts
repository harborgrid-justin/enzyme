/**
 * @file Optimistic UI Updates
 * @description Optimistic update utilities for React applications.
 * Provides patterns for immediate UI feedback with automatic rollback.
 *
 * Features:
 * - Optimistic state management
 * - Automatic rollback on error
 * - Pending state tracking
 * - Conflict resolution
 * - Retry mechanisms
 * - Undo support
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Optimistic update status
 */
export type OptimisticStatus = 'pending' | 'confirmed' | 'failed' | 'rolled-back';

/**
 * Optimistic update entry
 */
export interface OptimisticUpdate<T = unknown> {
  id: string;
  previousValue: T;
  optimisticValue: T;
  status: OptimisticStatus;
  timestamp: number;
  retryCount: number;
  error?: Error;
}

/**
 * Optimistic update result
 */
export interface OptimisticResult<T> {
  value: T;
  pending: boolean;
  error: Error | null;
  retry: () => Promise<void>;
  rollback: () => void;
}

/**
 * Optimistic manager configuration
 */
export interface OptimisticConfig {
  /** Maximum retry attempts */
  maxRetries: number;
  /** Retry delay in ms */
  retryDelay: number;
  /** Retry backoff multiplier */
  retryBackoff: number;
  /** Enable automatic retry on failure */
  autoRetry: boolean;
  /** Timeout for optimistic updates in ms */
  timeout: number;
  /** Keep history for undo */
  keepHistory: boolean;
  /** Maximum history size */
  maxHistorySize: number;
  /** Debug mode */
  debug: boolean;
}

/**
 * Mutation function type
 */
export type MutationFn<T, TArgs extends unknown[] = unknown[]> = (
  ...args: TArgs
) => Promise<T>;

/**
 * Optimistic value updater
 */
export type OptimisticUpdater<T> = (currentValue: T) => T;

/**
 * Conflict resolver
 */
export type ConflictResolver<T> = (
  localValue: T,
  serverValue: T,
  baseValue: T
) => T;

/**
 * Update listener
 */
export type UpdateListener<T> = (update: OptimisticUpdate<T>) => void;

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: OptimisticConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  retryBackoff: 2,
  autoRetry: true,
  timeout: 30000,
  keepHistory: true,
  maxHistorySize: 50,
  debug: false,
};

// ============================================================================
// Optimistic Update Manager
// ============================================================================

/**
 * Manages optimistic updates with rollback support
 */
export class OptimisticUpdateManager<T> {
  private config: OptimisticConfig;
  private currentValue: T;
  private updates: Map<string, OptimisticUpdate<T>> = new Map();
  private history: Array<{ id: string; value: T }> = [];
  private listeners: Set<UpdateListener<T>> = new Set();
  private idCounter = 0;

  constructor(initialValue: T, config: Partial<OptimisticConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentValue = initialValue;
  }

  /**
   * Get the current value (with pending optimistic updates applied)
   */
  getValue(): T {
    return this.currentValue;
  }

  /**
   * Get the confirmed value (without pending updates)
   */
  getConfirmedValue(): T {
    let value = this.currentValue;

    // Roll back pending updates to get confirmed value
    const pendingUpdates = Array.from(this.updates.values())
      .filter((u) => u.status === 'pending')
      .reverse();

    for (const update of pendingUpdates) {
      value = update.previousValue;
    }

    return value;
  }

  /**
   * Apply an optimistic update
   */
  async applyUpdate<TArgs extends unknown[]>(
    updater: OptimisticUpdater<T>,
    mutation: MutationFn<T, TArgs>,
    ...args: TArgs
  ): Promise<OptimisticResult<T>> {
    const id = this.generateId();
    const previousValue = this.currentValue;
    const optimisticValue = updater(this.currentValue);

    // Apply optimistic update immediately
    this.currentValue = optimisticValue;

    const update: OptimisticUpdate<T> = {
      id,
      previousValue,
      optimisticValue,
      status: 'pending',
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.updates.set(id, update);
    this.notifyListeners(update);
    this.log(`Applied optimistic update: ${id}`);

    // Execute mutation
    const execute = async (): Promise<void> => {
      try {
        const serverValue = await this.executeWithTimeout(
          mutation(...args),
          this.config.timeout
        );

        // Confirm the update
        update.status = 'confirmed';
        this.currentValue = serverValue;
        this.addToHistory(id, serverValue);
        this.notifyListeners(update);
        this.log(`Confirmed update: ${id}`);
      } catch (error) {
        update.error = error instanceof Error ? error : new Error(String(error));
        update.status = 'failed';
        this.notifyListeners(update);
        this.log(`Update failed: ${id}`, update.error);

        // Auto retry
        if (this.config.autoRetry && update.retryCount < this.config.maxRetries) {
          await this.retryUpdate(id, mutation, ...args);
        } else {
          // Rollback
          this.rollbackUpdate(id);
        }
      }
    };

    await execute();

    return {
      value: this.currentValue,
      pending: true,
      error: null,
      retry: async () => this.retryUpdate(id, mutation, ...args),
      rollback: () => this.rollbackUpdate(id),
    };
  }

  /**
   * Retry a failed update
   */
  async retryUpdate<TArgs extends unknown[]>(
    id: string,
    mutation: MutationFn<T, TArgs>,
    ...args: TArgs
  ): Promise<void> {
    const update = this.updates.get(id);
    if (update?.status !== 'failed') {
      return;
    }

    update.retryCount++;
    update.status = 'pending';
    update.error = undefined;
    this.notifyListeners(update);

    const delay = this.calculateRetryDelay(update.retryCount);
    this.log(`Retrying update ${id} in ${delay}ms (attempt ${update.retryCount})`);

    await this.sleep(delay);

    try {
      const serverValue = await this.executeWithTimeout(
        mutation(...args),
        this.config.timeout
      );

      update.status = 'confirmed';
      this.currentValue = serverValue;
      this.addToHistory(id, serverValue);
      this.notifyListeners(update);
      this.log(`Retry successful: ${id}`);
    } catch (error) {
      update.error = error instanceof Error ? error : new Error(String(error));
      update.status = 'failed';
      this.notifyListeners(update);

      if (update.retryCount < this.config.maxRetries) {
        await this.retryUpdate(id, mutation, ...args);
      } else {
        this.rollbackUpdate(id);
      }
    }
  }

  /**
   * Rollback an update
   */
  rollbackUpdate(id: string): void {
    const update = this.updates.get(id);
    if (!update) {
      return;
    }

    update.status = 'rolled-back';
    this.currentValue = update.previousValue;
    this.notifyListeners(update);
    this.log(`Rolled back update: ${id}`);
  }

  /**
   * Get pending updates
   */
  getPendingUpdates(): OptimisticUpdate<T>[] {
    return Array.from(this.updates.values()).filter(
      (u) => u.status === 'pending'
    );
  }

  /**
   * Get failed updates
   */
  getFailedUpdates(): OptimisticUpdate<T>[] {
    return Array.from(this.updates.values()).filter(
      (u) => u.status === 'failed'
    );
  }

  /**
   * Check if there are pending updates
   */
  hasPendingUpdates(): boolean {
    return this.getPendingUpdates().length > 0;
  }

  /**
   * Undo the last confirmed update
   */
  undo(): T | null {
    if (this.history.length === 0) {
      return null;
    }

    const lastEntry = this.history.pop();
    if (!lastEntry) {
      return null;
    }

    this.currentValue = lastEntry.value;
    this.log(`Undid update: ${lastEntry.id}`);
    return this.currentValue;
  }

  /**
   * Subscribe to update changes
   */
  subscribe(listener: UpdateListener<T>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Clear all updates
   */
  clear(): void {
    this.updates.clear();
    this.history = [];
  }

  /**
   * Get update statistics
   */
  getStats(): {
    pending: number;
    confirmed: number;
    failed: number;
    rolledBack: number;
    historySize: number;
  } {
    const updates = Array.from(this.updates.values());
    return {
      pending: updates.filter((u) => u.status === 'pending').length,
      confirmed: updates.filter((u) => u.status === 'confirmed').length,
      failed: updates.filter((u) => u.status === 'failed').length,
      rolledBack: updates.filter((u) => u.status === 'rolled-back').length,
      historySize: this.history.length,
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async executeWithTimeout<TResult>(
    promise: Promise<TResult>,
    timeout: number
  ): Promise<TResult> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Operation timed out'));
      }, timeout);

      promise
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error: unknown) => {
          clearTimeout(timer);
          reject(error instanceof Error ? error : new Error(String(error)));
        });
    });
  }

  private calculateRetryDelay(retryCount: number): number {
    return this.config.retryDelay * Math.pow(this.config.retryBackoff, retryCount - 1);
  }

  private addToHistory(id: string, value: T): void {
    if (!this.config.keepHistory) {
      return;
    }

    this.history.push({ id, value });

    // Trim history
    while (this.history.length > this.config.maxHistorySize) {
      this.history.shift();
    }
  }

  private notifyListeners(update: OptimisticUpdate<T>): void {
    this.listeners.forEach((listener) => listener(update));
  }

  private generateId(): string {
    return `opt-${Date.now()}-${++this.idCounter}`;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      console.log(`[OptimisticUpdate] ${message}`, ...args);
    }
  }
}

// ============================================================================
// Optimistic List Manager
// ============================================================================

/**
 * Specialized manager for list operations
 */
export class OptimisticListManager<T extends { id: string }> {
  private manager: OptimisticUpdateManager<T[]>;

  constructor(initialItems: T[], config: Partial<OptimisticConfig> = {}) {
    this.manager = new OptimisticUpdateManager(initialItems, config);
  }

  /**
   * Get current items
   */
  getItems(): T[] {
    return this.manager.getValue();
  }

  /**
   * Optimistically add an item
   */
  async addItem(
    item: T,
    mutation: MutationFn<T[]>
  ): Promise<OptimisticResult<T[]>> {
    return this.manager.applyUpdate(
      (items) => [...items, item],
      mutation
    );
  }

  /**
   * Optimistically remove an item
   */
  async removeItem(
    id: string,
    mutation: MutationFn<T[]>
  ): Promise<OptimisticResult<T[]>> {
    return this.manager.applyUpdate(
      (items) => items.filter((item) => item.id !== id),
      mutation
    );
  }

  /**
   * Optimistically update an item
   */
  async updateItem(
    id: string,
    updates: Partial<T>,
    mutation: MutationFn<T[]>
  ): Promise<OptimisticResult<T[]>> {
    return this.manager.applyUpdate(
      (items) =>
        items.map((item) =>
          item.id === id ? { ...item, ...updates } : item
        ),
      mutation
    );
  }

  /**
   * Optimistically reorder items
   */
  async reorderItems(
    fromIndex: number,
    toIndex: number,
    mutation: MutationFn<T[]>
  ): Promise<OptimisticResult<T[]>> {
    return this.manager.applyUpdate(
      (items) => {
        const result = [...items];
        const removed = result.splice(fromIndex, 1)[0];
        if (removed !== undefined) {
          result.splice(toIndex, 0, removed);
        }
        return result;
      },
      mutation
    );
  }

  /**
   * Get pending items (items being added)
   */
  getPendingItems(): T[] {
    const pending = this.manager.getPendingUpdates();
    const pendingItems: T[] = [];

    for (const update of pending) {
      const newItems = update.optimisticValue.filter(
        (item) => !update.previousValue.find((prev) => prev.id === item.id)
      );
      pendingItems.push(...newItems);
    }

    return pendingItems;
  }

  /**
   * Check if an item has pending changes
   */
  hasItemPending(id: string): boolean {
    const pending = this.manager.getPendingUpdates();
    return pending.some((update) => {
      const prevItem = update.previousValue.find((item) => item.id === id);
      const optItem = update.optimisticValue.find((item) => item.id === id);
      return JSON.stringify(prevItem) !== JSON.stringify(optItem);
    });
  }

  /**
   * Subscribe to changes
   */
  subscribe(listener: UpdateListener<T[]>): () => void {
    return this.manager.subscribe(listener);
  }

  /**
   * Check if there are pending updates
   */
  hasPendingUpdates(): boolean {
    return this.manager.hasPendingUpdates();
  }

  /**
   * Undo last change
   */
  undo(): T[] | null {
    return this.manager.undo();
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create an optimistic update manager
 */
export function createOptimisticManager<T>(
  initialValue: T,
  config?: Partial<OptimisticConfig>
): OptimisticUpdateManager<T> {
  return new OptimisticUpdateManager(initialValue, config);
}

/**
 * Create an optimistic list manager
 */
export function createOptimisticListManager<T extends { id: string }>(
  initialItems: T[],
  config?: Partial<OptimisticConfig>
): OptimisticListManager<T> {
  return new OptimisticListManager(initialItems, config);
}

/**
 * Apply optimistic update to a value
 */
export async function applyOptimistic<T, TArgs extends unknown[]>(
  currentValue: T,
  updater: OptimisticUpdater<T>,
  mutation: MutationFn<T, TArgs>,
  ...args: TArgs
): Promise<{ value: T; confirmed: boolean; error: Error | null }> {
  // Apply optimistic update
  updater(currentValue);

  try {
    const serverValue = await mutation(...args);
    return { value: serverValue, confirmed: true, error: null };
  } catch (error) {
    return {
      value: currentValue, // Rollback to original
      confirmed: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Merge server and local values with conflict resolution
 */
export function mergeWithConflictResolution<T>(
  localValue: T,
  serverValue: T,
  baseValue: T,
  resolver: ConflictResolver<T>
): T {
  // Check if there's actually a conflict
  const localChanged = JSON.stringify(localValue) !== JSON.stringify(baseValue);
  const serverChanged = JSON.stringify(serverValue) !== JSON.stringify(baseValue);

  if (!localChanged) {
    // Local didn't change, use server value
    return serverValue;
  }

  if (!serverChanged) {
    // Server didn't change, use local value
    return localValue;
  }

  // Both changed, use resolver
  return resolver(localValue, serverValue, baseValue);
}

/**
 * Default conflict resolver (server wins)
 */
export function serverWinsResolver<T>(
  _localValue: T,
  serverValue: T,
  _baseValue: T
): T {
  return serverValue;
}

/**
 * Client wins conflict resolver
 */
export function clientWinsResolver<T>(
  localValue: T,
  _serverValue: T,
  _baseValue: T
): T {
  return localValue;
}

/**
 * Last write wins resolver (based on timestamp)
 */
export function lastWriteWinsResolver<T extends { updatedAt?: number | string }>(
  localValue: T,
  serverValue: T,
  _baseValue: T
): T {
  const localTime = new Date(localValue.updatedAt || 0).getTime();
  const serverTime = new Date(serverValue.updatedAt || 0).getTime();

  return localTime > serverTime ? localValue : serverValue;
}
