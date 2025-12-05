/**
 * File watcher for hot configuration reloading.
 *
 * @module config/watch
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { ConfigSchema } from './types.js';

/**
 * Watch options configuration.
 */
export interface WatchOptions {
  /** Paths to watch */
  paths?: string[];
  /** Debounce interval in milliseconds */
  debounce?: number;
  /** Watch recursively */
  recursive?: boolean;
  /** Patterns to ignore */
  ignore?: string[];
}

/**
 * File change event.
 */
export interface FileChangeEvent {
  /** File path that changed */
  path: string;
  /** Change type */
  type: 'added' | 'modified' | 'deleted';
  /** Timestamp of the change */
  timestamp: Date;
  /** File stats (if available) */
  stats?: {
    size: number;
    mtime: Date;
  };
}

/**
 * Configuration watcher class.
 *
 * Watches configuration files for changes and emits events when they are modified.
 */
export class ConfigWatcher {
  private watchers: AbortController[] = [];
  private isWatching = false;
  private abortController?: AbortController;
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private fileStates = new Map<string, { mtime: Date; size: number }>();
  private callbacks: Array<(event: FileChangeEvent) => void | Promise<void>> = [];
  private readonly options: Required<WatchOptions>;

  constructor(options: WatchOptions = {}) {
    this.options = {
      paths: options.paths ?? ['.'],
      debounce: options.debounce ?? 300,
      recursive: options.recursive ?? false,
      ignore: options.ignore ?? ['**/node_modules/**', '**/.git/**'],
    };
  }

  /**
   * Start watching for file changes.
   */
  async start(): Promise<void> {
    if (this.isWatching) {
      throw new Error('Watcher is already running');
    }

    this.isWatching = true;
    this.abortController = new AbortController();

    for (const watchPath of this.options.paths) {
      try {
        const resolvedPath = path.resolve(watchPath);
        const stats = await fs.stat(resolvedPath);

        if (stats.isDirectory()) {
          await this.watchDirectory(resolvedPath);
        } else {
          await this.watchFile(resolvedPath);
        }
      } catch (error) {
        console.warn('Failed to watch path:', watchPath, error);
      }
    }
  }

  /**
   * Stop watching for file changes.
   */
  async stop(): Promise<void> {
    if (!this.isWatching) {
      return;
    }

    this.abortController?.abort();
    this.isWatching = false;

    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }

  /**
   * Register a callback for file changes.
   */
  onChange(callback: (event: FileChangeEvent) => void | Promise<void>): () => void {
    this.callbacks.push(callback);

    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index !== -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Alias for onChange.
   */
  on(_event: 'change', callback: (event: FileChangeEvent) => void | Promise<void>): () => void {
    return this.onChange(callback);
  }

  private async watchDirectory(dirPath: string): Promise<void> {
    try {
      const watcher = fs.watch(dirPath, {
        recursive: this.options.recursive,
        signal: this.abortController?.signal,
      });

      for await (const event of watcher) {
        if (event.filename) {
          const fullPath = path.join(dirPath, event.filename);
          this.handleFileChange(fullPath, event.eventType as 'rename' | 'change');
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).name !== 'AbortError') {
        console.error('Watch error:', error);
      }
    }
  }

  private async watchFile(filePath: string): Promise<void> {
    try {
      const watcher = fs.watch(filePath, {
        signal: this.abortController?.signal,
      });

      for await (const event of watcher) {
        this.handleFileChange(filePath, event.eventType as 'rename' | 'change');
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).name !== 'AbortError') {
        console.error('Watch error:', error);
      }
    }
  }

  private handleFileChange(filePath: string, eventType: 'rename' | 'change'): void {
    // Check if path should be ignored
    if (this.shouldIgnore(filePath)) {
      return;
    }

    // Debounce the change
    const existingTimer = this.debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(async () => {
      this.debounceTimers.delete(filePath);
      await this.emitChange(filePath, eventType);
    }, this.options.debounce);

    this.debounceTimers.set(filePath, timer);
  }

  private shouldIgnore(filePath: string): boolean {
    for (const pattern of this.options.ignore) {
      if (this.matchPattern(filePath, pattern)) {
        return true;
      }
    }
    return false;
  }

  private matchPattern(filePath: string, pattern: string): boolean {
    // Simple glob matching
    const regexPattern = pattern
      .replace(/\*\*/g, '{{DOUBLE_STAR}}')
      .replace(/\*/g, '[^/]*')
      .replace(/{{DOUBLE_STAR}}/g, '.*');

    const regex = new RegExp(regexPattern);
    return regex.test(filePath);
  }

  private async emitChange(filePath: string, eventType: 'rename' | 'change'): Promise<void> {
    let changeType: FileChangeEvent['type'] = 'modified';
    let stats: FileChangeEvent['stats'];

    try {
      const fileStats = await fs.stat(filePath);
      stats = {
        size: fileStats.size,
        mtime: fileStats.mtime,
      };

      const previousState = this.fileStates.get(filePath);
      if (!previousState) {
        changeType = 'added';
      }

      this.fileStates.set(filePath, stats);
    } catch {
      // File was deleted
      changeType = 'deleted';
      this.fileStates.delete(filePath);
    }

    const event: FileChangeEvent = {
      path: filePath,
      type: changeType,
      timestamp: new Date(),
      stats,
    };

    for (const callback of this.callbacks) {
      try {
        await callback(event);
      } catch (error) {
        console.error('Callback error:', error);
      }
    }
  }
}

/**
 * Configuration hot reloader.
 *
 * Automatically reloads configuration when files change.
 */
export class ConfigHotReloader<T extends ConfigSchema> {
  private watcher: ConfigWatcher;
  private currentConfig: T | null = null;
  private reloadCallbacks: Array<(config: T, previous: T | null) => void | Promise<void>> = [];
  private errorCallbacks: Array<(error: Error) => void> = [];
  private isRunning = false;

  constructor(
    private readonly loader: () => Promise<T>,
    options: WatchOptions = {}
  ) {
    this.watcher = new ConfigWatcher(options);
  }

  /**
   * Start the hot reloader.
   */
  async start(): Promise<T> {
    if (this.isRunning) {
      throw new Error('Hot reloader is already running');
    }

    this.isRunning = true;

    // Load initial config
    this.currentConfig = await this.loader();

    // Watch for changes
    this.watcher.onChange(async () => {
      await this.reload();
    });

    await this.watcher.start();

    return this.currentConfig;
  }

  /**
   * Stop the hot reloader.
   */
  async stop(): Promise<void> {
    await this.watcher.stop();
    this.isRunning = false;
  }

  /**
   * Manually trigger a reload.
   */
  async reload(): Promise<T> {
    const previous = this.currentConfig;

    try {
      this.currentConfig = await this.loader();

      for (const callback of this.reloadCallbacks) {
        try {
          await callback(this.currentConfig, previous);
        } catch (error) {
          console.error('Reload callback error:', error);
        }
      }

      return this.currentConfig;
    } catch (error) {
      for (const callback of this.errorCallbacks) {
        callback(error as Error);
      }
      throw error;
    }
  }

  /**
   * Get the current configuration.
   */
  getConfig(): T | null {
    return this.currentConfig;
  }

  /**
   * Register a callback for configuration reloads.
   */
  onReload(callback: (config: T, previous: T | null) => void | Promise<void>): () => void {
    this.reloadCallbacks.push(callback);

    return () => {
      const index = this.reloadCallbacks.indexOf(callback);
      if (index !== -1) {
        this.reloadCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Register a callback for reload errors.
   */
  onError(callback: (error: Error) => void): () => void {
    this.errorCallbacks.push(callback);

    return () => {
      const index = this.errorCallbacks.indexOf(callback);
      if (index !== -1) {
        this.errorCallbacks.splice(index, 1);
      }
    };
  }
}

/**
 * Create a configuration watcher with a fluent API.
 */
export function watch(paths: string[]): {
  debounce: (ms: number) => ReturnType<typeof watch>;
  recursive: (value?: boolean) => ReturnType<typeof watch>;
  ignore: (patterns: string[]) => ReturnType<typeof watch>;
  onChange: (callback: (event: FileChangeEvent) => void | Promise<void>) => ReturnType<typeof watch>;
  start: () => Promise<ConfigWatcher>;
} {
  const options: WatchOptions = { paths };
  const callbacks: Array<(event: FileChangeEvent) => void | Promise<void>> = [];

  const builder = {
    debounce(ms: number) {
      options.debounce = ms;
      return builder;
    },

    recursive(value = true) {
      options.recursive = value;
      return builder;
    },

    ignore(patterns: string[]) {
      options.ignore = patterns;
      return builder;
    },

    onChange(callback: (event: FileChangeEvent) => void | Promise<void>) {
      callbacks.push(callback);
      return builder;
    },

    async start(): Promise<ConfigWatcher> {
      const watcher = new ConfigWatcher(options);

      for (const callback of callbacks) {
        watcher.onChange(callback);
      }

      await watcher.start();
      return watcher;
    },
  };

  return builder;
}

/**
 * Create a hot reloader with a fluent API.
 */
export function hotReload<T extends ConfigSchema>(loader: () => Promise<T>): {
  watch: (paths: string[]) => ReturnType<typeof hotReload<T>>;
  debounce: (ms: number) => ReturnType<typeof hotReload<T>>;
  onReload: (callback: (config: T, previous: T | null) => void | Promise<void>) => ReturnType<typeof hotReload<T>>;
  onError: (callback: (error: Error) => void) => ReturnType<typeof hotReload<T>>;
  build: () => ConfigHotReloader<T>;
  start: () => Promise<T>;
} {
  const options: WatchOptions = { paths: [] };
  let onReloadCallback: ((config: T, previous: T | null) => void | Promise<void>) | undefined;
  let onErrorCallback: ((error: Error) => void) | undefined;

  const builder = {
    watch(paths: string[]) {
      options.paths = paths;
      return builder;
    },

    debounce(ms: number) {
      options.debounce = ms;
      return builder;
    },

    onReload(callback: (config: T, previous: T | null) => void | Promise<void>) {
      onReloadCallback = callback;
      return builder;
    },

    onError(callback: (error: Error) => void) {
      onErrorCallback = callback;
      return builder;
    },

    build(): ConfigHotReloader<T> {
      const reloader = new ConfigHotReloader(loader, options);

      if (onReloadCallback) {
        reloader.onReload(onReloadCallback);
      }

      if (onErrorCallback) {
        reloader.onError(onErrorCallback);
      }

      return reloader;
    },

    async start(): Promise<T> {
      const reloader = builder.build();
      return reloader.start();
    },
  };

  return builder;
}
