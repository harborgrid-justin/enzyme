/**
 * FileWatcherCoordinator - Coordinates all file watchers with debouncing and deduplication
 */

import * as vscode from 'vscode';
import { EventBus } from './event-bus';
import { LoggerService } from '../services/logger-service';
import { TIMEOUTS } from '../core/constants';

/**
 * File change event
 */
export interface FileChangeEvent {
  type: 'created' | 'changed' | 'deleted';
  uri: vscode.Uri;
  pattern: string;
  timestamp: number;
}

/**
 * Watch pattern registration
 */
export interface WatchPatternRegistration {
  id: string;
  pattern: string;
  handler: (event: FileChangeEvent) => void | Promise<void>;
  debounceDelay: number;
  watcher: vscode.FileSystemWatcher;
}

/**
 * FileWatcherCoordinator - Manages file watching with smart batching
 */
export class FileWatcherCoordinator {
  private static instance: FileWatcherCoordinator;
  private eventBus: EventBus;
  private logger: LoggerService;
  private watchers: Map<string, WatchPatternRegistration> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private eventQueue: Map<string, FileChangeEvent[]> = new Map();
  private maxWatchers: number = 50;

  private constructor(eventBus: EventBus, logger: LoggerService) {
    this.eventBus = eventBus;
    this.logger = logger;
  }

  /**
   * Create the file watcher coordinator
   */
  public static create(eventBus: EventBus, logger: LoggerService): FileWatcherCoordinator {
    if (!FileWatcherCoordinator.instance) {
      FileWatcherCoordinator.instance = new FileWatcherCoordinator(eventBus, logger);
    }
    return FileWatcherCoordinator.instance;
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): FileWatcherCoordinator {
    if (!FileWatcherCoordinator.instance) {
      throw new Error('FileWatcherCoordinator not created. Call create() first.');
    }
    return FileWatcherCoordinator.instance;
  }

  /**
   * Register a file watcher
   */
  public registerWatcher(
    id: string,
    pattern: string,
    handler: (event: FileChangeEvent) => void | Promise<void>,
    debounceDelay: number = TIMEOUTS.FILE_WATCHER_DEBOUNCE
  ): void {
    if (this.watchers.size >= this.maxWatchers) {
      this.logger.warn(`Maximum watcher count (${this.maxWatchers}) reached`);
      return;
    }

    if (this.watchers.has(id)) {
      this.logger.warn(`Watcher already registered: ${id}`);
      return;
    }

    const watcher = vscode.workspace.createFileSystemWatcher(pattern);

    // Handle created
    watcher.onDidCreate(uri => {
      this.handleFileEvent(id, pattern, 'created', uri, handler, debounceDelay);
    });

    // Handle changed
    watcher.onDidChange(uri => {
      this.handleFileEvent(id, pattern, 'changed', uri, handler, debounceDelay);
    });

    // Handle deleted
    watcher.onDidDelete(uri => {
      this.handleFileEvent(id, pattern, 'deleted', uri, handler, debounceDelay);
    });

    const registration: WatchPatternRegistration = {
      id,
      pattern,
      handler,
      debounceDelay,
      watcher,
    };

    this.watchers.set(id, registration);
    this.logger.info(`File watcher registered: ${id} (${pattern})`);
  }

  /**
   * Unregister a file watcher
   */
  public unregisterWatcher(id: string): void {
    const registration = this.watchers.get(id);
    if (!registration) {
      return;
    }

    registration.watcher.dispose();
    this.watchers.delete(id);

    // Clear debounce timer
    const timer = this.debounceTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(id);
    }

    // Clear event queue
    this.eventQueue.delete(id);

    this.logger.info(`File watcher unregistered: ${id}`);
  }

  /**
   * Handle file system event with debouncing
   */
  private handleFileEvent(
    id: string,
    pattern: string,
    type: 'created' | 'changed' | 'deleted',
    uri: vscode.Uri,
    handler: (event: FileChangeEvent) => void | Promise<void>,
    debounceDelay: number
  ): void {
    const event: FileChangeEvent = {
      type,
      uri,
      pattern,
      timestamp: Date.now(),
    };

    // Add to queue
    const queue = this.eventQueue.get(id) || [];
    queue.push(event);
    this.eventQueue.set(id, queue);

    // Clear existing timer
    const existingTimer = this.debounceTimers.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(async () => {
      await this.processEventQueue(id, handler);
    }, debounceDelay);

    this.debounceTimers.set(id, timer);
  }

  /**
   * Process event queue
   */
  private async processEventQueue(
    id: string,
    handler: (event: FileChangeEvent) => void | Promise<void>
  ): Promise<void> {
    const queue = this.eventQueue.get(id);
    if (!queue || queue.length === 0) {
      return;
    }

    // Deduplicate events
    const deduplicated = this.deduplicateEvents(queue);

    // Clear queue and timer
    this.eventQueue.delete(id);
    this.debounceTimers.delete(id);

    // Process events
    for (const event of deduplicated) {
      try {
        this.logger.debug(`File ${event.type}: ${event.uri.fsPath}`);
        await handler(event);
      } catch (error) {
        this.logger.error(`File watcher handler error: ${id}`, error);
      }
    }
  }

  /**
   * Deduplicate events - keep only the latest event per file
   */
  private deduplicateEvents(events: FileChangeEvent[]): FileChangeEvent[] {
    const eventMap = new Map<string, FileChangeEvent>();

    for (const event of events) {
      const key = `${event.uri.fsPath}:${event.type}`;
      const existing = eventMap.get(key);

      if (!existing || event.timestamp > existing.timestamp) {
        eventMap.set(key, event);
      }
    }

    return Array.from(eventMap.values());
  }

  /**
   * Register standard Enzyme watchers
   */
  public registerStandardWatchers(): void {
    // Watch TypeScript/TSX files
    this.registerWatcher(
      'typescript',
      '**/*.{ts,tsx}',
      async (event) => {
        this.logger.debug(`TypeScript file ${event.type}: ${event.uri.fsPath}`);
      }
    );

    // Watch enzyme.config files
    this.registerWatcher(
      'enzyme-config',
      '**/enzyme.config.{ts,js}',
      async (event) => {
        this.logger.info(`Enzyme config ${event.type}: ${event.uri.fsPath}`);
        this.eventBus.emit({
          type: 'config:changed',
          payload: { key: 'enzyme.config', value: event.uri.fsPath },
        });
      }
    );

    // Watch package.json
    this.registerWatcher(
      'package-json',
      '**/package.json',
      async (event) => {
        this.logger.info(`package.json ${event.type}: ${event.uri.fsPath}`);
        this.eventBus.emit({
          type: 'workspace:changed',
          payload: { rootPath: event.uri.fsPath },
        });
      }
    );

    // Watch environment files
    this.registerWatcher(
      'env-files',
      '**/.env*',
      async (event) => {
        this.logger.debug(`Environment file ${event.type}: ${event.uri.fsPath}`);
      }
    );

    // Watch feature directories
    this.registerWatcher(
      'features',
      '**/src/features/**/*',
      async (event) => {
        this.logger.debug(`Feature file ${event.type}: ${event.uri.fsPath}`);
      }
    );

    // Watch route directories
    this.registerWatcher(
      'routes',
      '**/src/routes/**/*',
      async (event) => {
        this.logger.debug(`Route file ${event.type}: ${event.uri.fsPath}`);
      }
    );

    this.logger.info('Standard file watchers registered');
  }

  /**
   * Get watcher statistics
   */
  public getStatistics(): {
    totalWatchers: number;
    activeWatchers: number;
    queuedEvents: number;
    patterns: string[];
  } {
    let queuedEvents = 0;
    for (const queue of this.eventQueue.values()) {
      queuedEvents += queue.length;
    }

    return {
      totalWatchers: this.watchers.size,
      activeWatchers: this.debounceTimers.size,
      queuedEvents,
      patterns: Array.from(this.watchers.values()).map(w => w.pattern),
    };
  }

  /**
   * Pause all watchers
   */
  public pauseAll(): void {
    for (const [id, timer] of this.debounceTimers) {
      clearTimeout(timer);
      this.debounceTimers.delete(id);
    }
    this.logger.info('All watchers paused');
  }

  /**
   * Resume all watchers
   */
  public resumeAll(): void {
    this.logger.info('All watchers resumed');
  }

  /**
   * Dispose all watchers
   */
  public dispose(): void {
    this.logger.info('Disposing all file watchers');

    for (const registration of this.watchers.values()) {
      registration.watcher.dispose();
    }

    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }

    this.watchers.clear();
    this.debounceTimers.clear();
    this.eventQueue.clear();
  }
}
