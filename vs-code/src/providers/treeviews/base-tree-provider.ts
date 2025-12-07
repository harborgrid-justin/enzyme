/**
 * @file Base TreeView Provider
 * @description Abstract base class for all Enzyme TreeView providers with caching, debouncing, and error handling
 */

import * as vscode from 'vscode';

/**
 * Configuration options for tree providers
 */
export interface TreeProviderOptions {
  /** Debounce delay for refresh operations (ms) */
  refreshDebounceMs?: number;
  /** Enable caching */
  enableCache?: boolean;
  /** Cache TTL in milliseconds */
  cacheTtlMs?: number;
  /** Auto-refresh on file changes */
  autoRefresh?: boolean;
}

/**
 * Cache entry for tree items
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Abstract base class for Enzyme TreeView providers
 * Provides common functionality for tree refresh, caching, and error handling
 */
export abstract class BaseTreeProvider<T extends vscode.TreeItem>
  implements vscode.TreeDataProvider<T> {

  private _onDidChangeTreeData = new vscode.EventEmitter<T | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private cache = new Map<string, CacheEntry<T[]>>();
  private refreshDebounceTimer: NodeJS.Timeout | undefined;
  private fileWatcher: vscode.FileSystemWatcher | undefined;
  private disposables: vscode.Disposable[] = [];
  private parentMap = new Map<T, T | undefined>();

  protected readonly options: Required<TreeProviderOptions>;

  constructor(
    protected readonly context: vscode.ExtensionContext,
    options: TreeProviderOptions = {}
  ) {
    this.options = {
      refreshDebounceMs: options.refreshDebounceMs ?? 300,
      enableCache: options.enableCache ?? true,
      cacheTtlMs: options.cacheTtlMs ?? 5000,
      autoRefresh: options.autoRefresh ?? true,
    };

    this.disposables.push(this._onDidChangeTreeData);

    if (this.options.autoRefresh) {
      this.setupFileWatcher();
    }
  }

  /**
   * Get tree item representation for VS Code
   */
  getTreeItem(element: T): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }

  /**
   * Get children of a tree item
   */
  async getChildren(element?: T): Promise<T[]> {
    try {
      if (!element) {
        // Root items
        return await this.getRootItems();
      } else {
        // Child items
        return await this.getChildItems(element);
      }
    } catch (error) {
      this.handleError(error as Error, 'getChildren');
      return [];
    }
  }

  /**
   * Get parent of a tree item (for reveal operations)
   */
  getParent?(element: T): vscode.ProviderResult<T> {
    return this.parentMap.get(element);
  }

  /**
   * Track parent-child relationships for reveal operations
   */
  protected trackParent(child: T, parent?: T): void {
    this.parentMap.set(child, parent);
  }

  /**
   * Resolve additional information for a tree item
   */
  resolveTreeItem?(item: T, element: T, token: vscode.CancellationToken): vscode.ProviderResult<T> {
    return element;
  }

  /**
   * Refresh the entire tree with debouncing
   */
  refresh(debounce: boolean = true): void {
    if (debounce && this.options.refreshDebounceMs > 0) {
      if (this.refreshDebounceTimer) {
        clearTimeout(this.refreshDebounceTimer);
      }
      this.refreshDebounceTimer = setTimeout(() => {
        this.clearCache();
        this._onDidChangeTreeData.fire();
      }, this.options.refreshDebounceMs);
    } else {
      this.clearCache();
      this._onDidChangeTreeData.fire();
    }
  }

  /**
   * Refresh a specific tree item
   */
  refreshItem(item: T): void {
    this.invalidateCacheForItem(item);
    this._onDidChangeTreeData.fire(item);
  }

  /**
   * Get cached items or fetch new ones
   */
  protected async getCachedOrFetch<K>(
    cacheKey: string,
    fetchFn: () => Promise<K[]>
  ): Promise<K[]> {
    if (!this.options.enableCache) {
      return fetchFn();
    }

    const cached = this.cache.get(cacheKey) as CacheEntry<K[]> | undefined;
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.options.cacheTtlMs) {
      return cached.data;
    }

    const data = await fetchFn();
    this.cache.set(cacheKey, { data: data as unknown as T[], timestamp: now });
    return data;
  }

  /**
   * Clear all cached data
   */
  protected clearCache(): void {
    this.cache.clear();
    this.parentMap.clear();
  }

  /**
   * Invalidate cache for a specific item
   */
  protected invalidateCacheForItem(item: T): void {
    const key = this.getCacheKeyForItem(item);
    if (key) {
      this.cache.delete(key);
    }
  }

  /**
   * Get cache key for an item
   */
  protected getCacheKeyForItem(item: T): string | undefined {
    return item.label?.toString();
  }

  /**
   * Setup file system watcher for auto-refresh
   */
  protected setupFileWatcher(): void {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return;
    }

    const patterns = this.getWatchPatterns();
    if (!patterns.length) {
      return;
    }

    for (const pattern of patterns) {
      const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(workspaceFolder, pattern)
      );

      watcher.onDidCreate(() => this.refresh());
      watcher.onDidChange(() => this.refresh());
      watcher.onDidDelete(() => this.refresh());

      this.disposables.push(watcher);
    }
  }

  /**
   * Get file patterns to watch for changes
   * Override in subclasses to specify which files to watch
   */
  protected getWatchPatterns(): string[] {
    return [];
  }

  /**
   * Handle errors with logging and user notification
   */
  protected handleError(error: Error, operation: string): void {
    console.error(`[${this.constructor.name}] Error in ${operation}:`, error);

    const message = `Enzyme: Error in ${operation}: ${error.message}`;
    vscode.window.showErrorMessage(message);
  }

  /**
   * Show information message
   */
  protected showInfo(message: string): void {
    vscode.window.showInformationMessage(`Enzyme: ${message}`);
  }

  /**
   * Show warning message
   */
  protected showWarning(message: string): void {
    vscode.window.showWarningMessage(`Enzyme: ${message}`);
  }

  /**
   * Get workspace root path
   */
  protected getWorkspaceRoot(): string | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  }

  /**
   * Check if a file exists
   */
  protected async fileExists(path: string): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(path));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read file content
   */
  protected async readFile(path: string): Promise<string> {
    const uri = vscode.Uri.file(path);
    const content = await vscode.workspace.fs.readFile(uri);
    return Buffer.from(content).toString('utf-8');
  }

  /**
   * Get all files matching a glob pattern
   */
  protected async findFiles(pattern: string, exclude?: string): Promise<vscode.Uri[]> {
    return vscode.workspace.findFiles(pattern, exclude);
  }

  /**
   * Open a file in the editor
   */
  protected async openFile(path: string, line?: number): Promise<void> {
    const uri = vscode.Uri.file(path);
    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document);

    if (line !== undefined) {
      const position = new vscode.Position(line, 0);
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(new vscode.Range(position, position));
    }
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    if (this.refreshDebounceTimer) {
      clearTimeout(this.refreshDebounceTimer);
    }
    this.disposables.forEach(d => d.dispose());
    this.cache.clear();
  }

  /**
   * Abstract method: Get root tree items
   * Must be implemented by subclasses
   */
  protected abstract getRootItems(): Promise<T[]>;

  /**
   * Abstract method: Get child items for a tree item
   * Must be implemented by subclasses
   */
  protected abstract getChildItems(element: T): Promise<T[]>;
}
