/**
 * IndexingCoordinator - Coordinates indexing across all providers
 */

import * as vscode from 'vscode';
import { EventBus } from './event-bus';
import { LoggerService } from '../services/logger-service';
import { WorkspaceService } from '../services/workspace-service';

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
  private eventBus: EventBus;
  private logger: LoggerService;
  private workspaceService: WorkspaceService;
  private index: Map<string, IndexEntry> = new Map();
  private taskQueue: IndexingTask[] = [];
  private isIndexing: boolean = false;
  private indexingPromise?: Promise<void>;
  private cache: Map<string, IndexEntry[]> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes

  private constructor(
    eventBus: EventBus,
    logger: LoggerService,
    workspaceService: WorkspaceService
  ) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.workspaceService = workspaceService;
  }

  /**
   * Create the indexing coordinator
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
      this.indexingPromise = undefined;
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
   */
  public getByType(type: IndexEntry['type']): IndexEntry[] {
    return Array.from(this.index.values()).filter(entry => entry.type === type);
  }

  /**
   * Get entry by ID
   */
  public getById(id: string): IndexEntry | undefined {
    return this.index.get(id);
  }

  /**
   * Search index
   */
  public search(query: string): IndexEntry[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.index.values()).filter(entry =>
      entry.name.toLowerCase().includes(lowerQuery) ||
      entry.filePath.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Update entry
   */
  public updateEntry(entry: IndexEntry): void {
    this.index.set(entry.id, {
      ...entry,
      timestamp: Date.now(),
    });
  }

  /**
   * Remove entry
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
    const stats = {
      total: this.index.size,
      byType: {} as Record<string, number>,
      oldestEntry: undefined as number | undefined,
      newestEntry: undefined as number | undefined,
    };

    let oldest = Number.MAX_SAFE_INTEGER;
    let newest = 0;

    for (const entry of this.index.values()) {
      stats.byType[entry.type] = (stats.byType[entry.type] || 0) + 1;

      if (entry.timestamp < oldest) {
        oldest = entry.timestamp;
      }
      if (entry.timestamp > newest) {
        newest = entry.timestamp;
      }
    }

    if (this.index.size > 0) {
      stats.oldestEntry = oldest;
      stats.newestEntry = newest;
    }

    return stats;
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
   */
  public async persistIndex(context: vscode.ExtensionContext): Promise<void> {
    const data = Array.from(this.index.values());
    await context.globalState.update('enzyme.index', data);
    this.logger.debug('Index persisted');
  }

  /**
   * Restore index
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
   */
  public dispose(): void {
    this.clearIndex();
    this.taskQueue = [];
  }
}
