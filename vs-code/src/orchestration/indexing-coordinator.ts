/**
 * IndexingCoordinator - Coordinates indexing across all providers
 */

import type { EventBus } from './event-bus';
import type { LoggerService } from '../services/logger-service';
import type { WorkspaceService } from '../services/workspace-service';
import type * as vscode from 'vscode';

/**
 * Index entry
 */
export interface IndexEntry {
  id: string;
  type: 'feature' | 'route' | 'component' | 'store' | 'api';
  filePath: string;
  name: string;
  metadata: Record<string, unknown>;
  timestamp: number;
}

/**
 * Indexing task
 */
export interface IndexingTask {
  id: string;
  type: string;
  priority: number;
  pattern: string;
  handler: () => Promise<IndexEntry[]>;
}

/**
 * IndexingCoordinator - Manages background indexing
 */
export class IndexingCoordinator {
  private static instance: IndexingCoordinator;
  private readonly eventBus: EventBus;
  private readonly logger: LoggerService;
  private readonly index = new Map<string, IndexEntry>();
  private taskQueue: IndexingTask[] = [];
  private isIndexing = false;
  private indexingPromise?: Promise<void>;
  private readonly cache = new Map<string, IndexEntry[]>();

  /**
   *
   * @param eventBus
   * @param logger
   * @param _workspaceService
   */
  private constructor(
    eventBus: EventBus,
    logger: LoggerService,
    _workspaceService: WorkspaceService
  ) {
    this.eventBus = eventBus;
    this.logger = logger;
  }

  /**
   * Create the indexing coordinator
   * @param eventBus
   * @param logger
   * @param workspaceService
   */
  public static create(
    eventBus: EventBus,
    logger: LoggerService,
    workspaceService: WorkspaceService
  ): IndexingCoordinator {
    if (!IndexingCoordinator.instance) {
      IndexingCoordinator.instance = new IndexingCoordinator(
        eventBus,
        logger,
        workspaceService
      );
    }
    return IndexingCoordinator.instance;
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): IndexingCoordinator {
    if (!IndexingCoordinator.instance) {
      throw new Error('IndexingCoordinator not created. Call create() first.');
    }
    return IndexingCoordinator.instance;
  }

  /**
   * Add indexing task
   * @param task
   */
  public addTask(task: IndexingTask): void {
    this.taskQueue.push(task);
    this.taskQueue.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Start indexing
   */
  public async startIndexing(): Promise<void> {
    if (this.isIndexing) {
      return this.indexingPromise;
    }

    this.isIndexing = true;
    this.eventBus.emit({ type: 'indexing:started' });
    this.logger.info('Starting indexing...');

    const startTime = Date.now();

    this.indexingPromise = this.processQueue();

    try {
      await this.indexingPromise;

      const duration = Date.now() - startTime;
      this.logger.success(`Indexing completed in ${duration}ms`, {
        entries: this.index.size,
      });

      this.eventBus.emit({
        type: 'indexing:completed',
        payload: { duration },
      });

    } catch (error) {
      this.logger.error('Indexing failed', error);
      throw error;
    } finally {
      this.isIndexing = false;
      delete this.indexingPromise;
    }
  }

  /**
   * Process task queue
   */
  private async processQueue(): Promise<void> {
    while (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift();
      if (!task) {
        continue;
      }

      try {
        this.logger.debug(`Processing indexing task: ${task.type}`);
        const entries = await task.handler();

        for (const entry of entries) {
          this.index.set(entry.id, entry);
        }

        this.cache.set(task.type, entries);

      } catch (error) {
        this.logger.error(`Indexing task failed: ${task.type}`, error);
      }
    }
  }

  /**
   * Get indexed entries by type
   * @param type
   */
  public getByType(type: IndexEntry['type']): IndexEntry[] {
    return [...this.index.values()].filter(entry => entry.type === type);
  }

  /**
   * Get entry by ID
   * @param id
   */
  public getById(id: string): IndexEntry | undefined {
    return this.index.get(id);
  }

  /**
   * Search index
   * @param query
   */
  public search(query: string): IndexEntry[] {
    const lowerQuery = query.toLowerCase();
    return [...this.index.values()].filter(entry =>
      entry.name.toLowerCase().includes(lowerQuery) ||
      entry.filePath.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Update entry
   * @param entry
   */
  public updateEntry(entry: IndexEntry): void {
    this.index.set(entry.id, {
      ...entry,
      timestamp: Date.now(),
    });
  }

  /**
   * Remove entry
   * @param id
   */
  public removeEntry(id: string): void {
    this.index.delete(id);
  }

  /**
   * Clear index
   */
  public clearIndex(): void {
    this.index.clear();
    this.cache.clear();
    this.logger.info('Index cleared');
  }

  /**
   * Rebuild index
   */
  public async rebuildIndex(): Promise<void> {
    this.clearIndex();
    await this.startIndexing();
  }

  /**
   * Get index statistics
   */
  public getStatistics(): {
    total: number;
    byType: Record<string, number>;
    oldestEntry?: number;
    newestEntry?: number;
  } {
    const baseStats = {
      total: this.index.size,
      byType: {} as Record<string, number>,
    };

    let oldest = Number.MAX_SAFE_INTEGER;
    let newest = 0;

    for (const entry of this.index.values()) {
      baseStats.byType[entry.type] = (baseStats.byType[entry.type] || 0) + 1;

      if (entry.timestamp < oldest) {
        oldest = entry.timestamp;
      }
      if (entry.timestamp > newest) {
        newest = entry.timestamp;
      }
    }

    if (this.index.size > 0) {
      return {
        ...baseStats,
        oldestEntry: oldest,
        newestEntry: newest,
      };
    }

    return baseStats;
  }

  /**
   * Get cache statistics
   */
  public getCacheStatistics(): {
    size: number;
    entries: number;
  } {
    let totalEntries = 0;
    for (const entries of this.cache.values()) {
      totalEntries += entries.length;
    }

    return {
      size: this.cache.size,
      entries: totalEntries,
    };
  }

  /**
   * Persist index
   * @param context
   */
  public async persistIndex(context: vscode.ExtensionContext): Promise<void> {
    const data = [...this.index.values()];
    await context.globalState.update('enzyme.index', data);
    this.logger.debug('Index persisted');
  }

  /**
   * Restore index
   * @param context
   */
  public async restoreIndex(context: vscode.ExtensionContext): Promise<void> {
    const data = context.globalState.get<IndexEntry[]>('enzyme.index', []);

    for (const entry of data) {
      this.index.set(entry.id, entry);
    }

    this.logger.info(`Index restored with ${data.length} entries`);
  }

  /**
   * Dispose the coordinator
   * PERFORMANCE: Properly cleans up all resources to prevent memory leaks
   */
  public dispose(): void {
    this.clearIndex();
    this.taskQueue = [];

    // Reset singleton instance to prevent memory leaks
    if (IndexingCoordinator.instance === this) {
      IndexingCoordinator.instance = null as any;
    }
  }
}
