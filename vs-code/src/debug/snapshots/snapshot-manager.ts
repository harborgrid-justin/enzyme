/**
 * @file Snapshot Manager
 * @description Manage state snapshots with save/restore capabilities
 */

import { StateDiff, type DiffNode } from '../state-diff';

// ============================================================================
// Types
// ============================================================================

/**
 *
 */
export interface Snapshot {
  id: string;
  name: string;
  timestamp: number;
  state: unknown;
  storeName?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 *
 */
export interface SnapshotComparison {
  snapshot1: Snapshot;
  snapshot2: Snapshot;
  diff: DiffNode;
  summary: {
    added: number;
    removed: number;
    modified: number;
  };
}

/**
 *
 */
export interface SnapshotOptions {
  /** Maximum snapshots to keep */
  maxSnapshots?: number;
  /** Auto-save interval (ms) */
  autoSaveInterval?: number;
  /** Storage key for persistence */
  storageKey?: string;
}

// ============================================================================
// Snapshot Manager
// ============================================================================

/**
 *
 */
export class SnapshotManager {
  private readonly options: Required<SnapshotOptions>;
  private snapshots: Snapshot[] = [];
  private snapshotIdCounter = 0;
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private readonly differ: StateDiff;

  /**
   *
   * @param options
   */
  constructor(options: SnapshotOptions = {}) {
    this.options = {
      maxSnapshots: options.maxSnapshots ?? 50,
      autoSaveInterval: options.autoSaveInterval ?? 0,
      storageKey: options.storageKey ?? 'enzyme-snapshots',
    };

    this.differ = new StateDiff({
      ignorePaths: ['_hasHydrated', '_timestamp'],
    });

    // Load from storage if available
    this.loadFromStorage();

    // Start auto-save if configured
    if (this.options.autoSaveInterval > 0) {
      this.startAutoSave();
    }
  }

  /**
   * Save a snapshot
   * @param state
   * @param name
   * @param storeName
   * @param tags
   */
  save(state: unknown, name: string, storeName?: string, tags?: string[]): Snapshot {
    const snapshot: Snapshot = {
      id: this.generateSnapshotId(),
      name,
      timestamp: Date.now(),
      state: this.deepClone(state),
      ...(storeName !== undefined && { storeName }),
      ...(tags !== undefined && { tags }),
    };

    this.snapshots.push(snapshot);

    // Enforce max snapshots
    if (this.snapshots.length > this.options.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.options.maxSnapshots);
    }

    // Save to storage
    this.saveToStorage();

    return snapshot;
  }

  /**
   * Get snapshot by ID
   * @param id
   */
  get(id: string): Snapshot | undefined {
    return this.snapshots.find((s) => s.id === id);
  }

  /**
   * Get all snapshots
   * @param filter
   * @param filter.storeName
   * @param filter.tags
   * @param filter.fromTime
   * @param filter.toTime
   */
  getAll(filter?: {
    storeName?: string;
    tags?: string[];
    fromTime?: number;
    toTime?: number;
  }): Snapshot[] {
    let filtered = [...this.snapshots];

    if (filter?.storeName) {
      filtered = filtered.filter((s) => s.storeName === filter.storeName);
    }

    if (filter?.tags && filter.tags.length > 0) {
      filtered = filtered.filter((s) => {
        return filter.tags!.some((tag) => s.tags?.includes(tag));
      });
    }

    if (filter?.fromTime) {
      filtered = filtered.filter((s) => s.timestamp >= filter.fromTime!);
    }

    if (filter?.toTime) {
      filtered = filtered.filter((s) => s.timestamp <= filter.toTime!);
    }

    return filtered;
  }

  /**
   * Get latest snapshot
   * @param storeName
   */
  getLatest(storeName?: string): Snapshot | undefined {
    const filtered = storeName
      ? this.snapshots.filter((s) => s.storeName === storeName)
      : this.snapshots;

    return filtered[filtered.length - 1];
  }

  /**
   * Restore snapshot (returns the state)
   * @param id
   */
  restore(id: string): unknown | undefined {
    const snapshot = this.get(id);
    if (!snapshot) {
      return undefined;
    }

    return this.deepClone(snapshot.state);
  }

  /**
   * Delete snapshot
   * @param id
   */
  delete(id: string): boolean {
    const index = this.snapshots.findIndex((s) => s.id === id);
    if (index === -1) {
      return false;
    }

    this.snapshots.splice(index, 1);
    this.saveToStorage();
    return true;
  }

  /**
   * Clear all snapshots
   * @param storeName
   */
  clear(storeName?: string): void {
    this.snapshots = storeName ? this.snapshots.filter((s) => s.storeName !== storeName) : [];

    this.saveToStorage();
  }

  /**
   * Compare two snapshots
   * @param id1
   * @param id2
   */
  compare(id1: string, id2: string): SnapshotComparison | null {
    const snapshot1 = this.get(id1);
    const snapshot2 = this.get(id2);

    if (!snapshot1 || !snapshot2) {
      return null;
    }

    const diff = this.differ.diff(snapshot1.state, snapshot2.state);
    const summary = this.differ.getSummary(diff);

    return {
      snapshot1,
      snapshot2,
      diff,
      summary: {
        added: summary.added,
        removed: summary.removed,
        modified: summary.modified,
      },
    };
  }

  /**
   * Export snapshots as JSON
   * @param ids
   */
  export(ids?: string[]): string {
    const snapshots = ids
      ? this.snapshots.filter((s) => ids.includes(s.id))
      : this.snapshots;

    return JSON.stringify(
      {
        version: '1.0.0',
        exportTime: Date.now(),
        snapshots,
      },
      null,
      2
    );
  }

  /**
   * Import snapshots from JSON
   * @param json
   * @param merge
   */
  import(json: string, merge = false): void {
    try {
      const data = JSON.parse(json);

      if (!data.snapshots || !Array.isArray(data.snapshots)) {
        throw new Error('Invalid snapshot data');
      }

      if (merge) {
        this.snapshots.push(...data.snapshots);
      } else {
        this.snapshots = data.snapshots;
      }

      // Enforce max snapshots
      if (this.snapshots.length > this.options.maxSnapshots) {
        this.snapshots = this.snapshots.slice(-this.options.maxSnapshots);
      }

      this.saveToStorage();
    } catch (error) {
      throw new Error(
        `Failed to import snapshots: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Update snapshot metadata
   * @param id
   * @param metadata
   */
  updateMetadata(id: string, metadata: Record<string, unknown>): boolean {
    const snapshot = this.get(id);
    if (!snapshot) {
      return false;
    }

    snapshot.metadata = {
      ...snapshot.metadata,
      ...metadata,
    };

    this.saveToStorage();
    return true;
  }

  /**
   * Add tags to snapshot
   * @param id
   * @param tags
   */
  addTags(id: string, tags: string[]): boolean {
    const snapshot = this.get(id);
    if (!snapshot) {
      return false;
    }

    snapshot.tags = [...new Set([...(snapshot.tags ?? []), ...tags])];
    this.saveToStorage();
    return true;
  }

  /**
   * Remove tags from snapshot
   * @param id
   * @param tags
   */
  removeTags(id: string, tags: string[]): boolean {
    const snapshot = this.get(id);
    if (!snapshot) {
      return false;
    }

    if (snapshot.tags !== undefined) {
      snapshot.tags = snapshot.tags.filter((t) => !tags.includes(t));
    }
    this.saveToStorage();
    return true;
  }

  /**
   * Get snapshot history for a store
   * @param storeName
   */
  getHistory(storeName: string): Snapshot[] {
    return this.snapshots
      .filter((s) => s.storeName === storeName)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Start auto-save
   */
  private startAutoSave(): void {
    if (this.autoSaveTimer) {
      return;
    }

    this.autoSaveTimer = setInterval(() => {
      this.saveToStorage();
    }, this.options.autoSaveInterval);
  }

  /**
   * Stop auto-save
   */
  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * Save to storage
   */
  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      const data = JSON.stringify({
        version: '1.0.0',
        snapshots: this.snapshots,
      });

      localStorage.setItem(this.options.storageKey, data);
    } catch (error) {
      console.error('Failed to save snapshots to storage:', error);
    }
  }

  /**
   * Load from storage
   */
  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      const data = localStorage.getItem(this.options.storageKey);
      if (!data) {
        return;
      }

      const parsed = JSON.parse(data);
      if (parsed.snapshots && Array.isArray(parsed.snapshots)) {
        this.snapshots = parsed.snapshots;
      }
    } catch (error) {
      console.error('Failed to load snapshots from storage:', error);
    }
  }

  /**
   * Deep clone value
   * @param value
   */
  private deepClone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
  }

  /**
   * Generate snapshot ID
   */
  private generateSnapshotId(): string {
    return `snapshot_${Date.now()}_${this.snapshotIdCounter++}`;
  }

  /**
   * Dispose manager
   */
  dispose(): void {
    this.stopAutoSave();
    this.saveToStorage();
  }
}

// ============================================================================
// Global Manager Instance
// ============================================================================

let globalManager: SnapshotManager | null = null;

/**
 * Get or create global manager instance
 * @param options
 */
export function getGlobalSnapshotManager(options?: SnapshotOptions): SnapshotManager {
  if (!globalManager) {
    globalManager = new SnapshotManager(options);
  }
  return globalManager;
}

/**
 * Reset global manager
 */
export function resetGlobalSnapshotManager(): void {
  if (globalManager) {
    globalManager.dispose();
  }
  globalManager = null;
}
