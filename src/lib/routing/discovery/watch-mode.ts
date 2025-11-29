/**
 * @file Watch Mode for Route Discovery
 * @description Provides hot-reloading route discovery for development environments.
 * Monitors file system changes and triggers incremental route updates.
 *
 * @module @/lib/routing/discovery/watch-mode
 *
 * This module provides:
 * - File system watching for route changes
 * - Debounced change processing
 * - Incremental route updates
 * - HMR integration hooks
 * - Development server integration
 *
 * @example
 * ```typescript
 * import { WatchMode, createWatchMode } from '@/lib/routing/discovery/watch-mode';
 *
 * const watcher = createWatchMode({
 *   rootDir: process.cwd(),
 *   onRoutesChanged: (routes) => {
 *     console.log('Routes updated:', routes.length);
 *   },
 * });
 *
 * await watcher.start();
 * // ... later
 * await watcher.stop();
 * ```
 */

import {
  DiscoveryEngine,
  type DiscoveryResult,
  type DiscoveryEngineConfig,
} from './discovery-engine';
import type { TransformedRoute } from './route-transformer';
import { isProd } from '@/lib/core/config/env-helper';

// =============================================================================
// Types
// =============================================================================

/**
 * Watch mode configuration
 */
export interface WatchModeConfig {
  /** Root directory to watch */
  readonly rootDir: string;
  /** Directories to watch (relative to rootDir) */
  readonly watchPaths?: readonly string[];
  /** File extensions to watch */
  readonly extensions?: readonly string[];
  /** Patterns to ignore */
  readonly ignorePatterns?: readonly string[];
  /** Debounce delay in milliseconds */
  readonly debounceMs?: number;
  /** Enable verbose logging */
  readonly verbose?: boolean;
  /** Discovery engine configuration */
  readonly discovery?: Partial<DiscoveryEngineConfig>;
  /** Called when routes change */
  readonly onRoutesChanged?: (routes: readonly TransformedRoute[], result: DiscoveryResult) => void;
  /** Called when a file is added */
  readonly onFileAdded?: (filePath: string) => void;
  /** Called when a file is removed */
  readonly onFileRemoved?: (filePath: string) => void;
  /** Called when a file is changed */
  readonly onFileChanged?: (filePath: string) => void;
  /** Called when an error occurs */
  readonly onError?: (error: Error) => void;
  /** Feature flag for watch mode */
  readonly featureFlag?: string;
}

/**
 * File change event
 */
export interface FileChangeEvent {
  /** Change type */
  readonly type: 'add' | 'change' | 'unlink';
  /** Absolute file path */
  readonly path: string;
  /** Relative path from root */
  readonly relativePath: string;
  /** Timestamp of change */
  readonly timestamp: number;
}

/**
 * Watch mode state
 */
export type WatchModeState = 'stopped' | 'starting' | 'running' | 'stopping' | 'error';

/**
 * Watch mode statistics
 */
export interface WatchModeStats {
  /** Total files watched */
  readonly filesWatched: number;
  /** Directories watched */
  readonly directoriesWatched: number;
  /** Total changes processed */
  readonly changesProcessed: number;
  /** Total rediscoveries performed */
  readonly rediscoveries: number;
  /** Average rediscovery time (ms) */
  readonly avgRediscoveryMs: number;
  /** Watch mode uptime (ms) */
  readonly uptimeMs: number;
  /** Last change timestamp */
  readonly lastChangeAt: number | null;
  /** Last rediscovery timestamp */
  readonly lastRediscoveryAt: number | null;
}

/**
 * Watcher interface (abstraction over fs.watch/chokidar)
 */
interface FileWatcher {
  on(event: 'add', handler: (path: string) => void): this;
  on(event: 'change', handler: (path: string) => void): this;
  on(event: 'unlink', handler: (path: string) => void): this;
  on(event: 'error', handler: (error: Error) => void): this;
  on(event: 'ready', handler: () => void): this;
  close(): Promise<void>;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Default watch mode configuration
 */
export const DEFAULT_WATCH_MODE_CONFIG: Partial<WatchModeConfig> = {
  watchPaths: ['src/routes', 'src/pages', 'src/app'],
  extensions: ['.tsx', '.ts', '.jsx', '.js'],
  ignorePatterns: [
    '**/node_modules/**',
    '**/.git/**',
    '**/*.test.*',
    '**/*.spec.*',
    '**/__tests__/**',
  ],
  debounceMs: 100,
  verbose: false,
};

// =============================================================================
// WatchMode Class
// =============================================================================

/**
 * Watch mode for hot-reloading route discovery
 *
 * @example
 * ```typescript
 * const watcher = new WatchMode({
 *   rootDir: '/project',
 *   onRoutesChanged: (routes) => {
 *     // Update your router with new routes
 *     router.replaceRoutes(routes);
 *   },
 * });
 *
 * await watcher.start();
 * ```
 */
export class WatchMode {
  private readonly config: WatchModeConfig;
  private readonly engine: DiscoveryEngine;
  private watcher: FileWatcher | null = null;
  private state: WatchModeState = 'stopped';
  private pendingChanges: FileChangeEvent[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private startedAt: number | null = null;
  private stats: {
    changesProcessed: number;
    rediscoveries: number;
    totalRediscoveryMs: number;
    lastChangeAt: number | null;
    lastRediscoveryAt: number | null;
  } = {
    changesProcessed: 0,
    rediscoveries: 0,
    totalRediscoveryMs: 0,
    lastChangeAt: null,
    lastRediscoveryAt: null,
  };

  constructor(config: WatchModeConfig) {
    this.config = {
      ...DEFAULT_WATCH_MODE_CONFIG,
      ...config,
    };

    this.engine = new DiscoveryEngine({
      rootDir: config.rootDir,
      ...config.discovery,
    });
  }

  /**
   * Get current watch mode state
   */
  getState(): WatchModeState {
    return this.state;
  }

  /**
   * Get watch mode statistics
   */
  getStats(): WatchModeStats {
    return {
      filesWatched: 0, // Would be populated by actual watcher
      directoriesWatched: this.config.watchPaths?.length ?? 0,
      changesProcessed: this.stats.changesProcessed,
      rediscoveries: this.stats.rediscoveries,
      avgRediscoveryMs: (this.stats.rediscoveries !== null && this.stats.rediscoveries !== undefined && this.stats.rediscoveries > 0)
        ? this.stats.totalRediscoveryMs / this.stats.rediscoveries
        : 0,
      uptimeMs: (this.startedAt != null && this.startedAt !== 0) ? Date.now() - this.startedAt : 0,
      lastChangeAt: this.stats.lastChangeAt,
      lastRediscoveryAt: this.stats.lastRediscoveryAt,
    };
  }

  /**
   * Start watching for file changes
   *
   * @returns Initial discovery result
   */
  async start(): Promise<DiscoveryResult> {
    if (this.state !== 'stopped') {
      throw new Error(`Cannot start watch mode in state: ${this.state}`);
    }

    this.state = 'starting';
    this.startedAt = Date.now();

    try {
      // Perform initial discovery
      const initialResult = await this.engine.discover();

      // Start file watcher
      await this.startWatcher();

      this.state = 'running';
      this.log('Watch mode started');

      return initialResult;
    } catch (error) {
      this.state = 'error';
      this.config.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Stop watching for file changes
   */
  async stop(): Promise<void> {
    if (this.state !== 'running') {
      return;
    }

    this.state = 'stopping';

    // Clear debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    // Stop watcher
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }

    this.state = 'stopped';
    this.startedAt = null;
    this.log('Watch mode stopped');
  }

  /**
   * Trigger an immediate rediscovery
   *
   * @param forceRefresh - Skip cache
   * @returns Discovery result
   */
  async rediscover(forceRefresh = true): Promise<DiscoveryResult> {
    return this.performRediscovery(forceRefresh);
  }

  /**
   * Start the file system watcher
   */
  private async startWatcher(): Promise<void> {
    // Dynamic import for Node.js fs module
    const path = await import('path');
    const { watch } = await import('fs');

    // Build watch paths
    const watchPaths = (this.config.watchPaths ?? []).map(p =>
      path.resolve(this.config.rootDir, p)
    );

    // Create a simple watcher wrapper
    // In production, you'd use chokidar for better cross-platform support
    const watchers: ReturnType<typeof watch>[] = [];

    const wrapperWatcher: FileWatcher = {
      on(event: 'add' | 'change' | 'unlink' | 'error' | 'ready', handler: ((path: string) => void) | ((error: Error) => void) | (() => void)): FileWatcher {
        // Store handlers for manual dispatch
        if (event === 'ready') {
          // Immediately ready with fs.watch
          setTimeout(() => (handler as () => void)(), 0);
        }
        return this;
      },
      close: async () => {
        for (const w of watchers) {
          w.close();
        }
        return Promise.resolve();
      },
    };

    // Watch each path
    for (const watchPath of watchPaths) {
      try {
        const fsWatcher = watch(
          watchPath,
          { recursive: true },
          (eventType: string, filename: string | null) => {
            if (filename === null || filename === undefined || filename === '') return;

            const fullPath = path.join(watchPath, filename);
            const relativePath = path.relative(this.config.rootDir, fullPath);

            // Check extension
            const ext = path.extname(filename);
            if (this.config.extensions?.includes(ext) !== true) {
              return;
            }

            // Check ignore patterns
            if (this.shouldIgnore(relativePath)) {
              return;
            }

            // Map event type
            const changeType = eventType === 'rename' ? 'add' : 'change';

            this.handleFileChange({
              type: changeType,
              path: fullPath,
              relativePath,
              timestamp: Date.now(),
            });
          }
        );

        watchers.push(fsWatcher);
      } catch (error) {
        this.log(`Failed to watch ${watchPath}: ${(error as Error).message}`);
      }
    }

    this.watcher = wrapperWatcher;
  }

  /**
   * Check if a path should be ignored
   */
  private shouldIgnore(relativePath: string): boolean {
    const patterns = this.config.ignorePatterns ?? [];

    for (const pattern of patterns) {
      // Simple glob matching
      const regexStr = pattern
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '.');

      const regex = new RegExp(regexStr);
      if (regex.test(relativePath)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Handle a file change event
   */
  private handleFileChange(event: FileChangeEvent): void {
    this.stats.changesProcessed++;
    this.stats.lastChangeAt = event.timestamp;

    this.pendingChanges.push(event);
    this.log(`File ${event.type}: ${event.relativePath}`);

    // Notify handlers
    switch (event.type) {
      case 'add':
        this.config.onFileAdded?.(event.path);
        break;
      case 'change':
        this.config.onFileChanged?.(event.path);
        break;
      case 'unlink':
        this.config.onFileRemoved?.(event.path);
        break;
    }

    // Debounce rediscovery
    this.scheduleRediscovery();
  }

  /**
   * Schedule a debounced rediscovery
   */
  private scheduleRediscovery(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.performRediscovery().catch((error) => {
        this.config.onError?.(error as Error);
      });
    }, this.config.debounceMs);
  }

  /**
   * Perform route rediscovery
   */
  private async performRediscovery(forceRefresh = true): Promise<DiscoveryResult> {
    const startTime = Date.now();

    try {
      this.engine.clearCache();
      const result = await this.engine.discover(forceRefresh);

      const duration = Date.now() - startTime;
      this.stats.rediscoveries++;
      this.stats.totalRediscoveryMs += duration;
      this.stats.lastRediscoveryAt = Date.now();

      this.log(`Rediscovery completed in ${duration}ms (${result.routes.length} routes)`);

      // Clear pending changes
      this.pendingChanges = [];

      // Notify handler
      this.config.onRoutesChanged?.(result.routes, result);

      return result;
    } catch (error) {
      this.log(`Rediscovery failed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Log a message if verbose mode is enabled
   */
  private log(message: string): void {
    if (this.config.verbose === true) {
      console.info(`[WatchMode] ${message}`);
    }
  }

  /**
   * Get the underlying discovery engine
   */
  getEngine(): DiscoveryEngine {
    return this.engine;
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a new WatchMode instance
 *
 * @param config - Watch mode configuration
 * @returns Configured WatchMode instance
 */
export function createWatchMode(config: WatchModeConfig): WatchMode {
  return new WatchMode(config);
}

// =============================================================================
// HMR Integration
// =============================================================================

/**
 * HMR update handler type
 */
export type HMRUpdateHandler = (routes: readonly TransformedRoute[]) => void;

/**
 * Create an HMR-compatible route updater
 *
 * @param updateHandler - Function to call when routes update
 * @returns Object with HMR lifecycle methods
 *
 * @example
 * ```typescript
 * const hmr = createHMRUpdater((routes) => {
 *   // Update your router
 *   router.replaceRoutes(routes);
 * });
 *
 * // In your Vite plugin or webpack config
 * if (import.meta.hot) {
 *   import.meta.hot.accept('./routes', hmr.accept);
 *   import.meta.hot.dispose(hmr.dispose);
 * }
 * ```
 */
export function createHMRUpdater(updateHandler: HMRUpdateHandler): {
  accept: (newModule: { routes: readonly TransformedRoute[] }) => void;
  dispose: () => void;
  prune: () => void;
} {
  return {
    accept: (newModule) => {
      if (newModule?.routes !== undefined && newModule.routes !== null) {
        updateHandler(newModule.routes);
      }
    },
    dispose: () => {
      // Cleanup if needed
    },
    prune: () => {
      // Cleanup stale modules if needed
    },
  };
}

// =============================================================================
// Development Server Integration
// =============================================================================

/**
 * Vite plugin configuration for route discovery watch mode
 */
export interface VitePluginConfig {
  /** Root directory */
  readonly rootDir?: string;
  /** Watch mode configuration */
  readonly watchMode?: Partial<WatchModeConfig>;
  /** Enable in production (not recommended) */
  readonly enableInProduction?: boolean;
}

/**
 * Create a Vite plugin configuration for watch mode
 *
 * @param config - Plugin configuration
 * @returns Vite plugin object
 *
 * @example
 * ```typescript
 * // vite.config.ts
 * import { createVitePlugin } from '@/lib/routing/discovery/watch-mode';
 *
 * export default defineConfig({
 *   plugins: [
 *     createVitePlugin({
 *       rootDir: process.cwd(),
 *     }),
 *   ],
 * });
 * ```
 */
export function createVitePlugin(config: VitePluginConfig = {}): {
  name: string;
  configureServer?: (server: unknown) => void;
} {
  return {
    name: 'route-discovery-watch',
    configureServer: (_server: unknown) => {
      // In a real implementation, this would integrate with Vite's dev server
      // to provide HMR updates when routes change

      if (config.enableInProduction === false && isProd()) {
        return;
      }

      // Initialize watch mode
      const watcher = new WatchMode({
        rootDir: config.rootDir ?? process.cwd(),
        ...config.watchMode,
        onRoutesChanged: (_routes, _result) => {
          // In real implementation, trigger HMR update
          // server.ws.send({ type: 'custom', event: 'routes-updated', data: routes });
        },
      });

      // Start watching
      watcher.start().catch(console.error);
    },
  };
}

// =============================================================================
// Singleton Instance
// =============================================================================

let defaultWatcher: WatchMode | null = null;

/**
 * Get or create the default watch mode instance
 *
 * @param config - Configuration (required on first call)
 * @returns WatchMode instance
 */
export function getWatchMode(config?: WatchModeConfig): WatchMode {
  if (!defaultWatcher && config) {
    defaultWatcher = new WatchMode(config);
  }
  if (!defaultWatcher) {
    throw new Error('Watch mode not initialized. Call with config first.');
  }
  return defaultWatcher;
}

/**
 * Initialize the default watch mode
 *
 * @param config - Watch mode configuration
 */
export function initWatchMode(config: WatchModeConfig): void {
  defaultWatcher = new WatchMode(config);
}

/**
 * Reset the default watch mode
 */
export async function resetWatchMode(): Promise<void> {
  if (defaultWatcher) {
    await defaultWatcher.stop();
    defaultWatcher = null;
  }
}
