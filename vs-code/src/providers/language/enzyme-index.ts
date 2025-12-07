import * as vscode from 'vscode';
import {
  getParser
} from './parser';
import type {
  EnzymeParser,
  RouteDefinition,
  ComponentDefinition,
  StoreDefinition,
  ApiDefinition} from './parser';

/**
 * Route metadata for indexing
 */
export interface RouteMetadata extends RouteDefinition {
  description?: string;
  meta?: Record<string, any>;
}

/**
 * Component metadata for indexing
 */
export interface ComponentMetadata extends ComponentDefinition {
  description?: string;
  examples?: string[];
  tags?: string[];
}

/**
 * Hook metadata for indexing
 */
export interface HookMetadata {
  name: string;
  signature: string;
  description?: string;
  parameters?: Array<{ name: string; type: string; description?: string }>;
  returnType?: string;
  examples?: string[];
  file?: string;
  position?: vscode.Position;
  range?: vscode.Range;
}

/**
 * Store metadata for indexing
 */
export interface StoreMetadata extends StoreDefinition {
  description?: string;
}

/**
 * API endpoint metadata for indexing
 */
export interface ApiMetadata extends ApiDefinition {
  description?: string;
  tags?: string[];
}

/**
 * EnzymeIndex - Background indexing system for all Enzyme entities
 * Maintains a searchable index of routes, components, hooks, stores, and APIs
 */
export class EnzymeIndex {
  private readonly parser: EnzymeParser;
  private readonly routes = new Map<string, RouteMetadata>();
  private readonly components = new Map<string, ComponentMetadata>();
  private readonly hooks = new Map<string, HookMetadata>();
  private readonly stores = new Map<string, StoreMetadata>();
  private readonly apis = new Map<string, ApiMetadata>();
  private fileWatcher?: vscode.FileSystemWatcher;
  private indexingInProgress = false;
  private readonly onDidChangeEmitter = new vscode.EventEmitter<void>();
  public readonly onDidChange = this.onDidChangeEmitter.event;

  /**
   *
   * @param workspaceRoot
   */
  constructor(private readonly workspaceRoot: string) {
    this.parser = getParser();
    this.initializeBuiltInHooks();
  }

  /**
   * Initialize index with built-in Enzyme hooks
   */
  private initializeBuiltInHooks(): void {
    const builtInHooks: HookMetadata[] = [
      {
        name: 'useAuth',
        signature: 'useAuth(): AuthState',
        description: 'Access authentication state and methods',
        returnType: 'AuthState',
        examples: [
          'const { user, isAuthenticated, login, logout } = useAuth();',
        ],
      },
      {
        name: 'useStore',
        signature: 'useStore<T>(selector: (state: RootState) => T): T',
        description: 'Select data from the global store',
        parameters: [
          { name: 'selector', type: '(state: RootState) => T', description: 'State selector function' },
        ],
        returnType: 'T',
        examples: [
          'const user = useStore(state => state.auth.user);',
          'const { count } = useStore(state => ({ count: state.counter.value }));',
        ],
      },
      {
        name: 'useFeatureFlag',
        signature: 'useFeatureFlag(flagName: string): boolean',
        description: 'Check if a feature flag is enabled',
        parameters: [
          { name: 'flagName', type: 'string', description: 'Name of the feature flag' },
        ],
        returnType: 'boolean',
        examples: [
          'const isDarkModeEnabled = useFeatureFlag("dark-mode");',
        ],
      },
      {
        name: 'useApiRequest',
        signature: 'useApiRequest<T>(request: ApiRequest): ApiResponse<T>',
        description: 'Make API requests with loading and error states',
        parameters: [
          { name: 'request', type: 'ApiRequest', description: 'API request configuration' },
        ],
        returnType: 'ApiResponse<T>',
        examples: [
          'const { data, loading, error } = useApiRequest({ url: "/api/users" });',
        ],
      },
      {
        name: 'useRouter',
        signature: 'useRouter(): Router',
        description: 'Access routing functionality',
        returnType: 'Router',
        examples: [
          'const router = useRouter();',
          'router.push(routes.home);',
        ],
      },
      {
        name: 'useRouteParams',
        signature: 'useRouteParams<T>(): T',
        description: 'Access current route parameters',
        returnType: 'T',
        examples: [
          'const { id } = useRouteParams<{ id: string }>();',
        ],
      },
      {
        name: 'useQuery',
        signature: 'useQuery<T>(key: string, fetcher: () => Promise<T>): QueryResult<T>',
        description: 'Fetch and cache data with automatic refetching',
        parameters: [
          { name: 'key', type: 'string', description: 'Query cache key' },
          { name: 'fetcher', type: '() => Promise<T>', description: 'Data fetching function' },
        ],
        returnType: 'QueryResult<T>',
        examples: [
          'const { data, isLoading } = useQuery("users", () => fetchUsers());',
        ],
      },
      {
        name: 'useMutation',
        signature: 'useMutation<T>(mutationFn: (variables: any) => Promise<T>): MutationResult<T>',
        description: 'Execute mutations with loading and error states',
        parameters: [
          { name: 'mutationFn', type: '(variables: any) => Promise<T>', description: 'Mutation function' },
        ],
        returnType: 'MutationResult<T>',
        examples: [
          'const { mutate, isLoading } = useMutation(createUser);',
        ],
      },
    ];

    builtInHooks.forEach(hook => {
      this.hooks.set(hook.name, hook);
    });
  }

  /**
   * Start background indexing
   */
  public async startIndexing(): Promise<void> {
    if (this.indexingInProgress) {
      return;
    }

    this.indexingInProgress = true;

    try {
      // Initialize parser
      await this.parser.initialize(this.workspaceRoot);

      // Index all TypeScript/TSX files
      await this.indexWorkspace();

      // Set up file watchers
      this.setupFileWatchers();

      this.onDidChangeEmitter.fire();
    } finally {
      this.indexingInProgress = false;
    }
  }

  /**
   * PERFORMANCE: Index workspace in batches to avoid blocking
   * Uses progressive indexing with batching to prevent UI freezing
   */
  private async indexWorkspace(): Promise<void> {
    const files = await vscode.workspace.findFiles(
      '**/*.{ts,tsx,js,jsx}',
      '**/node_modules/**',
      1000 // PERFORMANCE: Reduced from 10000 to 1000 to prevent excessive indexing
    );

    // PERFORMANCE: Batch index files to prevent blocking (50 files at a time)
    const BATCH_SIZE = 50;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async file => this.indexFile(file)));

      // PERFORMANCE: Yield control to event loop between batches
      await new Promise(resolve => setImmediate(resolve));
    }
  }

  /**
   * PERFORMANCE: Index a single file without loading into editor
   * Reads file content directly to avoid unnecessary document loading
   * @param uri
   */
  private async indexFile(uri: vscode.Uri): Promise<void> {
    try {
      // PERFORMANCE: Check if document is already open to avoid redundant loading
      const openDocument = vscode.workspace.textDocuments.find(document_ => document_.uri.toString() === uri.toString());
      const document = openDocument || await vscode.workspace.openTextDocument(uri);
      const result = this.parser.parseDocument(document);

      // Index routes
      result.routes.forEach(route => {
        this.routes.set(`${route.file}:${route.name}`, {
          ...route,
          description: `Route: ${route.path}`,
        });
      });

      // Index components
      result.components.forEach(component => {
        if (component.isExported) {
          this.components.set(`${component.file}:${component.name}`, {
            ...component,
            description: `Component: ${component.name}`,
          });
        }
      });

      // Index stores
      result.stores.forEach(store => {
        this.stores.set(`${store.file}:${store.name}`, {
          ...store,
          description: `Store: ${store.name}`,
        });
      });

      // Index APIs
      result.apis.forEach(api => {
        this.apis.set(`${api.file}:${api.name}`, {
          ...api,
          description: `API: ${api.method} ${api.endpoint}`,
        });
      });
    } catch (error) {
      console.error(`Error indexing file ${uri.fsPath}:`, error);
    }
  }

  /**
   * PERFORMANCE: Set up file system watchers with debouncing
   * File changes are batched and processed together to avoid excessive re-indexing
   */
  private setupFileWatchers(): void {
    this.fileWatcher = vscode.workspace.createFileSystemWatcher(
      '**/*.{ts,tsx,js,jsx}'
    );

    // PERFORMANCE: Debounce file watcher events to batch updates
    let changeDebounceTimer: NodeJS.Timeout | undefined;
    const DEBOUNCE_DELAY = 500; // ms
    const pendingChanges = new Set<string>();

    const processChanges = async () => {
      const changes = [...pendingChanges];
      pendingChanges.clear();

      // PERFORMANCE: Process changes in batches
      const BATCH_SIZE = 20;
      for (let i = 0; i < changes.length; i += BATCH_SIZE) {
        const batch = changes.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async uri => this.updateFileIndex(vscode.Uri.file(uri))));
        await new Promise(resolve => setImmediate(resolve));
      }

      this.onDidChangeEmitter.fire();
    };

    // Handle file changes with debouncing
    this.fileWatcher.onDidChange(uri => {
      pendingChanges.add(uri.fsPath);
      if (changeDebounceTimer) {
        clearTimeout(changeDebounceTimer);
      }
      changeDebounceTimer = setTimeout(processChanges, DEBOUNCE_DELAY);
    });

    // Handle file creation with debouncing
    this.fileWatcher.onDidCreate(uri => {
      pendingChanges.add(uri.fsPath);
      if (changeDebounceTimer) {
        clearTimeout(changeDebounceTimer);
      }
      changeDebounceTimer = setTimeout(processChanges, DEBOUNCE_DELAY);
    });

    // Handle file deletion immediately (no need to batch)
    this.fileWatcher.onDidDelete(uri => {
      this.removeFileFromIndex(uri.fsPath);
      this.onDidChangeEmitter.fire();
    });
  }

  /**
   * Update index for a changed file
   * @param uri
   */
  private async updateFileIndex(uri: vscode.Uri): Promise<void> {
    // Remove old entries
    this.removeFileFromIndex(uri.fsPath);

    // Re-index file
    await this.indexFile(uri);
  }

  /**
   * Remove all entries for a file from index
   * @param filePath
   */
  private removeFileFromIndex(filePath: string): void {
    // Remove routes
    for (const [key, route] of this.routes.entries()) {
      if (route.file === filePath) {
        this.routes.delete(key);
      }
    }

    // Remove components
    for (const [key, component] of this.components.entries()) {
      if (component.file === filePath) {
        this.components.delete(key);
      }
    }

    // Remove stores
    for (const [key, store] of this.stores.entries()) {
      if (store.file === filePath) {
        this.stores.delete(key);
      }
    }

    // Remove APIs
    for (const [key, api] of this.apis.entries()) {
      if (api.file === filePath) {
        this.apis.delete(key);
      }
    }

    // Clear parser cache
    this.parser.clearCache(filePath);
  }

  /**
   * Get all routes
   */
  public getAllRoutes(): RouteMetadata[] {
    return [...this.routes.values()];
  }

  /**
   * Get route by name
   * @param name
   */
  public getRoute(name: string): RouteMetadata | undefined {
    for (const route of this.routes.values()) {
      if (route.name === name) {
        return route;
      }
    }
    return undefined;
  }

  /**
   * Search routes by query
   * @param query
   */
  public searchRoutes(query: string): RouteMetadata[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllRoutes().filter(route =>
      route.name.toLowerCase().includes(lowerQuery) ||
      route.path.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get all components
   */
  public getAllComponents(): ComponentMetadata[] {
    return [...this.components.values()];
  }

  /**
   * Get component by name
   * @param name
   */
  public getComponent(name: string): ComponentMetadata | undefined {
    for (const component of this.components.values()) {
      if (component.name === name) {
        return component;
      }
    }
    return undefined;
  }

  /**
   * Search components by query
   * @param query
   */
  public searchComponents(query: string): ComponentMetadata[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllComponents().filter(component =>
      component.name.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get all hooks
   */
  public getAllHooks(): HookMetadata[] {
    return [...this.hooks.values()];
  }

  /**
   * Get hook by name
   * @param name
   */
  public getHook(name: string): HookMetadata | undefined {
    return this.hooks.get(name);
  }

  /**
   * Search hooks by query
   * @param query
   */
  public searchHooks(query: string): HookMetadata[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllHooks().filter(hook =>
      hook.name.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get all stores
   */
  public getAllStores(): StoreMetadata[] {
    return [...this.stores.values()];
  }

  /**
   * Get store by name
   * @param name
   */
  public getStore(name: string): StoreMetadata | undefined {
    for (const store of this.stores.values()) {
      if (store.name === name || store.sliceName === name) {
        return store;
      }
    }
    return undefined;
  }

  /**
   * Search stores by query
   * @param query
   */
  public searchStores(query: string): StoreMetadata[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllStores().filter(store =>
      store.name.toLowerCase().includes(lowerQuery) ||
      (store.sliceName?.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get all APIs
   */
  public getAllApis(): ApiMetadata[] {
    return [...this.apis.values()];
  }

  /**
   * Search APIs by query
   * @param query
   */
  public searchApis(query: string): ApiMetadata[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllApis().filter(api =>
      api.endpoint.toLowerCase().includes(lowerQuery) ||
      api.method.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get all entities in a file
   * @param filePath
   */
  public getEntitiesInFile(filePath: string): {
    routes: RouteMetadata[];
    components: ComponentMetadata[];
    stores: StoreMetadata[];
    apis: ApiMetadata[];
  } {
    return {
      routes: this.getAllRoutes().filter(r => r.file === filePath),
      components: this.getAllComponents().filter(c => c.file === filePath),
      stores: this.getAllStores().filter(s => s.file === filePath),
      apis: this.getAllApis().filter(a => a.file === filePath),
    };
  }

  /**
   * Find entity at position
   * @param document
   * @param position
   */
  public findEntityAtPosition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): RouteMetadata | ComponentMetadata | StoreMetadata | ApiMetadata | undefined {
    const filePath = document.uri.fsPath;
    const entities = this.getEntitiesInFile(filePath);

    // Check routes
    for (const route of entities.routes) {
      if (route.range.contains(position)) {
        return route;
      }
    }

    // Check components
    for (const component of entities.components) {
      if (component.range.contains(position)) {
        return component;
      }
    }

    // Check stores
    for (const store of entities.stores) {
      if (store.range.contains(position)) {
        return store;
      }
    }

    // Check APIs
    for (const api of entities.apis) {
      if (api.range.contains(position)) {
        return api;
      }
    }

    return undefined;
  }

  /**
   * Get index statistics
   */
  public getStats(): {
    routes: number;
    components: number;
    hooks: number;
    stores: number;
    apis: number;
    totalFiles: number;
  } {
    const files = new Set<string>();

    this.routes.forEach(r => files.add(r.file));
    this.components.forEach(c => files.add(c.file));
    this.stores.forEach(s => files.add(s.file));
    this.apis.forEach(a => files.add(a.file));

    return {
      routes: this.routes.size,
      components: this.components.size,
      hooks: this.hooks.size,
      stores: this.stores.size,
      apis: this.apis.size,
      totalFiles: files.size,
    };
  }

  /**
   * Refresh entire index
   */
  public async refresh(): Promise<void> {
    this.routes.clear();
    this.components.clear();
    this.stores.clear();
    this.apis.clear();

    // Re-initialize built-in hooks
    this.initializeBuiltInHooks();

    // Re-index workspace
    await this.indexWorkspace();

    this.onDidChangeEmitter.fire();
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    this.fileWatcher?.dispose();
    this.onDidChangeEmitter.dispose();
    this.routes.clear();
    this.components.clear();
    this.hooks.clear();
    this.stores.clear();
    this.apis.clear();
  }
}

/**
 * Singleton index instance
 */
let indexInstance: EnzymeIndex | undefined;

/**
 * Get or create index instance
 * @param workspaceRoot
 */
export function getIndex(workspaceRoot?: string): EnzymeIndex {
  if (!indexInstance && workspaceRoot) {
    indexInstance = new EnzymeIndex(workspaceRoot);
  }
  if (!indexInstance) {
    throw new Error('EnzymeIndex not initialized. Call with workspaceRoot first.');
  }
  return indexInstance;
}

/**
 * Reset index instance (useful for testing)
 */
export function resetIndex(): void {
  indexInstance?.dispose();
  indexInstance = undefined;
}
