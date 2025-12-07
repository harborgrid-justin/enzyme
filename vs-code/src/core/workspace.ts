/**
 * Workspace Utilities for Enzyme VS Code Extension
 * Provides functions to detect, analyze, and monitor Enzyme projects
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { logger } from './logger';
import { FILE_PATTERNS, TIMEOUTS } from './constants';
import {
  EnzymeWorkspace,
  EnzymeConfig,
  PackageJson,
  EnzymeFeature,
  EnzymeRoute,
  EnzymeComponent,
  EnzymeStore,
  EnzymeApiClient,
  FileWatcherEvent,
} from '../types';

/**
 * PERFORMANCE: Detect if the workspace contains an Enzyme project (async)
 * Uses VS Code's workspace.fs API instead of Node.js fs for better performance
 */
export async function detectEnzymeProject(): Promise<boolean> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    logger.debug('No workspace folder found');
    return false;
  }

  const rootUri = workspaceFolder.uri;

  try {
    // PERFORMANCE: Check for package.json with Enzyme dependencies
    const packageJsonUri = vscode.Uri.joinPath(rootUri, 'package.json');
    try {
      const packageJsonContent = await vscode.workspace.fs.readFile(packageJsonUri);
      const packageJson = JSON.parse(Buffer.from(packageJsonContent).toString('utf-8')) as PackageJson;
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      // Check for any Enzyme packages
      const hasEnzyme = Object.keys(allDeps).some(dep =>
        dep.startsWith('@enzyme/') ||
        dep.startsWith('@missionfabric-js/enzyme') ||
        dep === 'enzyme'
      );

      if (hasEnzyme) {
        logger.info('Enzyme project detected via package.json');
        return true;
      }
    } catch (error) {
      // package.json doesn't exist or failed to parse
      logger.debug('No package.json or parse error');
    }

    // PERFORMANCE: Check for enzyme.config.ts or enzyme.config.js
    const configFiles = ['enzyme.config.ts', 'enzyme.config.js'];
    for (const configFile of configFiles) {
      const configUri = vscode.Uri.joinPath(rootUri, configFile);
      try {
        await vscode.workspace.fs.stat(configUri);
        logger.info(`Enzyme project detected via ${configFile}`);
        return true;
      } catch {
        // File doesn't exist, continue
      }
    }

    // PERFORMANCE: Check for .enzyme directory
    const enzymeDirUri = vscode.Uri.joinPath(rootUri, '.enzyme');
    try {
      const stat = await vscode.workspace.fs.stat(enzymeDirUri);
      if (stat.type === vscode.FileType.Directory) {
        logger.info('Enzyme project detected via .enzyme directory');
        return true;
      }
    } catch {
      // Directory doesn't exist
    }

    logger.debug('No Enzyme project detected');
    return false;
  } catch (error) {
    logger.error('Error detecting Enzyme project', error);
    return false;
  }
}

/**
 * PERFORMANCE: Get Enzyme version from package.json (async)
 */
export async function getEnzymeVersion(rootPath: string): Promise<string | undefined> {
  try {
    const packageJsonUri = vscode.Uri.file(path.join(rootPath, 'package.json'));
    const packageJsonContent = await vscode.workspace.fs.readFile(packageJsonUri);
    const packageJson = JSON.parse(Buffer.from(packageJsonContent).toString('utf-8')) as PackageJson;

    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    // Look for main enzyme package
    const enzymePackages = [
      '@missionfabric-js/enzyme',
      '@enzyme/core',
      'enzyme',
    ];

    for (const pkg of enzymePackages) {
      if (allDeps[pkg]) {
        return allDeps[pkg];
      }
    }

    // Look for any enzyme package and extract version
    const enzymePackage = Object.entries(allDeps).find(([name]) =>
      name.startsWith('@enzyme/') || name.startsWith('@missionfabric-js/enzyme')
    );

    return enzymePackage?.[1];
  } catch (error) {
    logger.error('Failed to get Enzyme version', error);
    return undefined;
  }
}

/**
 * PERFORMANCE: Find Enzyme configuration file (async)
 */
export async function findEnzymeConfig(rootPath: string): Promise<EnzymeConfig | undefined> {
  const configFiles = ['enzyme.config.ts', 'enzyme.config.js'];
  const rootUri = vscode.Uri.file(rootPath);

  for (const configFile of configFiles) {
    const configUri = vscode.Uri.joinPath(rootUri, configFile);
    try {
      await vscode.workspace.fs.stat(configUri);
      // For now, just return a placeholder
      // In a real implementation, we would parse the TypeScript/JavaScript file
      logger.info(`Found Enzyme config at ${configFile}`);
      return {
        version: '1.0.0',
        features: [],
        routes: [],
      };
    } catch {
      // File doesn't exist, continue
    }
  }

  return undefined;
}

/**
 * PERFORMANCE: Get package.json (async)
 */
export async function getPackageJson(rootPath: string): Promise<PackageJson | undefined> {
  try {
    const packageJsonUri = vscode.Uri.file(path.join(rootPath, 'package.json'));
    const packageJsonContent = await vscode.workspace.fs.readFile(packageJsonUri);
    return JSON.parse(Buffer.from(packageJsonContent).toString('utf-8')) as PackageJson;
  } catch (error) {
    logger.error('Failed to parse package.json', error);
    return undefined;
  }
}

/**
 * PERFORMANCE: Analyze project structure with caching
 * Caches workspace structure to avoid expensive rescanning
 */
export async function getProjectStructure(): Promise<EnzymeWorkspace> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

  if (!workspaceFolder) {
    return {
      rootPath: '',
      isEnzymeProject: false,
      features: [],
      routes: [],
      components: [],
      stores: [],
      apiClients: [],
    };
  }

  const rootPath = workspaceFolder.uri.fsPath;

  // PERFORMANCE: Try to load cached workspace structure
  const cachedWorkspace = await loadCachedWorkspaceStructure(rootPath);
  if (cachedWorkspace) {
    logger.info('Using cached workspace structure');
    return cachedWorkspace;
  }

  // Not cached or cache expired, perform full scan
  logger.info('Scanning workspace structure (no cache)');

  const isEnzymeProject = await detectEnzymeProject();
  const packageJson = await getPackageJson(rootPath);
  const enzymeConfig = await findEnzymeConfig(rootPath);
  const enzymeVersion = await getEnzymeVersion(rootPath);

  // PERFORMANCE: Scan for features, routes, components, etc. in parallel
  const [features, routes, components, stores, apiClients] = await Promise.all([
    scanFeatures(rootPath),
    scanRoutes(rootPath),
    scanComponents(rootPath),
    scanStores(rootPath),
    scanApiClients(rootPath),
  ]);

  logger.info('Project structure analyzed', {
    isEnzymeProject,
    enzymeVersion,
    featuresCount: features.length,
    routesCount: routes.length,
    componentsCount: components.length,
    storesCount: stores.length,
    apiClientsCount: apiClients.length,
  });

  const workspace: EnzymeWorkspace = {
    rootPath,
    packageJson,
    enzymeConfig,
    isEnzymeProject,
    enzymeVersion,
    features,
    routes,
    components,
    stores,
    apiClients,
  };

  // PERFORMANCE: Cache the workspace structure
  await cacheWorkspaceStructure(rootPath, workspace);

  return workspace;
}

/**
 * PERFORMANCE: Load cached workspace structure if valid
 */
async function loadCachedWorkspaceStructure(rootPath: string): Promise<EnzymeWorkspace | null> {
  try {
    const context = vscode.extensions.getExtension('missionfabric.enzyme-vscode')?.exports?.context;
    if (!context) {
      return null;
    }

    const cacheKey = `workspace:${rootPath}`;
    const cached = context.workspaceState.get(cacheKey) as {
      data: EnzymeWorkspace;
      timestamp: number;
    } | undefined;

    if (!cached) {
      return null;
    }

    // PERFORMANCE: Cache TTL of 5 minutes
    const CACHE_TTL = 5 * 60 * 1000;
    const now = Date.now();

    if (now - cached.timestamp > CACHE_TTL) {
      logger.debug('Workspace cache expired');
      return null;
    }

    return cached.data;
  } catch (error) {
    logger.error('Failed to load cached workspace', error);
    return null;
  }
}

/**
 * PERFORMANCE: Cache workspace structure
 */
async function cacheWorkspaceStructure(rootPath: string, workspace: EnzymeWorkspace): Promise<void> {
  try {
    const context = vscode.extensions.getExtension('missionfabric.enzyme-vscode')?.exports?.context;
    if (!context) {
      return;
    }

    const cacheKey = `workspace:${rootPath}`;
    await context.workspaceState.update(cacheKey, {
      data: workspace,
      timestamp: Date.now(),
    });

    logger.debug('Workspace structure cached');
  } catch (error) {
    logger.error('Failed to cache workspace structure', error);
  }
}

/**
 * PERFORMANCE: Invalidate workspace cache (call when files change)
 */
export async function invalidateWorkspaceCache(): Promise<void> {
  try {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return;
    }

    const context = vscode.extensions.getExtension('missionfabric.enzyme-vscode')?.exports?.context;
    if (!context) {
      return;
    }

    const rootPath = workspaceFolder.uri.fsPath;
    const cacheKey = `workspace:${rootPath}`;
    await context.workspaceState.update(cacheKey, undefined);

    logger.debug('Workspace cache invalidated');
  } catch (error) {
    logger.error('Failed to invalidate workspace cache', error);
  }
}

/**
 * PERFORMANCE: Scan for Enzyme features (async with limit)
 * Uses workspace.findFiles with max results to prevent blocking
 */
async function scanFeatures(rootPath: string): Promise<EnzymeFeature[]> {
  const features: EnzymeFeature[] = [];
  const rootUri = vscode.Uri.file(rootPath);
  const featuresUri = vscode.Uri.joinPath(rootUri, 'src', 'features');

  try {
    // Check if features directory exists
    await vscode.workspace.fs.stat(featuresUri);

    // PERFORMANCE: Use workspace.findFiles to get all feature index files (limited to 100)
    const featureIndexFiles = await vscode.workspace.findFiles(
      new vscode.RelativePattern(featuresUri, '*/index.{ts,tsx}'),
      '**/node_modules/**',
      100 // PERFORMANCE: Limit to prevent blocking
    );

    // PERFORMANCE: Process features in parallel (but limit concurrency)
    const featurePromises = featureIndexFiles.map(async (fileUri) => {
      const featureName = path.basename(path.dirname(fileUri.fsPath));
      return await analyzeFeature(fileUri.fsPath, featureName);
    });

    const featureResults = await Promise.all(featurePromises);
    features.push(...featureResults.filter((f): f is EnzymeFeature => f !== null));
  } catch (error) {
    // Features directory doesn't exist or error scanning
    logger.debug('No features directory or scan error');
  }

  return features;
}

/**
 * Analyze a single feature directory
 */
async function analyzeFeature(featurePath: string, featureId: string): Promise<EnzymeFeature | null> {
  try {
    return {
      id: featureId,
      name: featureId.charAt(0).toUpperCase() + featureId.slice(1),
      path: featurePath,
      version: '1.0.0',
      enabled: true,
      routes: [],
      components: [],
    };
  } catch (error) {
    logger.error(`Failed to analyze feature ${featureId}`, error);
    return null;
  }
}

/**
 * PERFORMANCE: Scan for routes (async with limit)
 */
async function scanRoutes(rootPath: string): Promise<EnzymeRoute[]> {
  const routes: EnzymeRoute[] = [];
  const rootUri = vscode.Uri.file(rootPath);

  try {
    // PERFORMANCE: Use workspace.findFiles with limit
    const routeFiles = await vscode.workspace.findFiles(
      new vscode.RelativePattern(rootUri, 'src/routes/**/*.{ts,tsx}'),
      '**/node_modules/**',
      100 // PERFORMANCE: Limit to prevent blocking
    );

    // Placeholder: would parse route files here
    logger.debug(`Found ${routeFiles.length} route files`);
  } catch {
    // Routes directory doesn't exist
    logger.debug('No routes directory');
  }

  return routes;
}

/**
 * PERFORMANCE: Scan for components (async with limit)
 */
async function scanComponents(rootPath: string): Promise<EnzymeComponent[]> {
  const components: EnzymeComponent[] = [];
  const rootUri = vscode.Uri.file(rootPath);

  try {
    // PERFORMANCE: Use workspace.findFiles with limit
    const componentFiles = await vscode.workspace.findFiles(
      new vscode.RelativePattern(rootUri, 'src/components/**/*.{ts,tsx}'),
      '**/node_modules/**',
      100 // PERFORMANCE: Limit to prevent blocking
    );

    // Placeholder: would parse component files here
    logger.debug(`Found ${componentFiles.length} component files`);
  } catch {
    // Components directory doesn't exist
    logger.debug('No components directory');
  }

  return components;
}

/**
 * PERFORMANCE: Scan for stores (async with limit)
 */
async function scanStores(rootPath: string): Promise<EnzymeStore[]> {
  const stores: EnzymeStore[] = [];
  const rootUri = vscode.Uri.file(rootPath);

  try {
    // PERFORMANCE: Use workspace.findFiles with limit
    const storeFiles = await vscode.workspace.findFiles(
      new vscode.RelativePattern(rootUri, 'src/stores/**/*.{ts,tsx}'),
      '**/node_modules/**',
      100 // PERFORMANCE: Limit to prevent blocking
    );

    // Placeholder: would parse store files here
    logger.debug(`Found ${storeFiles.length} store files`);
  } catch {
    // Stores directory doesn't exist
    logger.debug('No stores directory');
  }

  return stores;
}

/**
 * PERFORMANCE: Scan for API clients (async with limit)
 */
async function scanApiClients(rootPath: string): Promise<EnzymeApiClient[]> {
  const apiClients: EnzymeApiClient[] = [];
  const rootUri = vscode.Uri.file(rootPath);

  try {
    // PERFORMANCE: Use workspace.findFiles with limit
    const apiFiles = await vscode.workspace.findFiles(
      new vscode.RelativePattern(rootUri, 'src/api/**/*.{ts,tsx}'),
      '**/node_modules/**',
      100 // PERFORMANCE: Limit to prevent blocking
    );

    // Placeholder: would parse API client files here
    logger.debug(`Found ${apiFiles.length} API client files`);
  } catch {
    // API directory doesn't exist
    logger.debug('No API directory');
  }

  return apiClients;
}

/**
 * File Watcher class for monitoring configuration changes
 */
export class FileWatcher {
  private watcher: vscode.FileSystemWatcher | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private eventEmitter: vscode.EventEmitter<FileWatcherEvent>;
  private disposables: vscode.Disposable[] = [];

  constructor(private pattern: string, private debounceDelay: number = TIMEOUTS.FILE_WATCHER_DEBOUNCE) {
    this.eventEmitter = new vscode.EventEmitter<FileWatcherEvent>();
    this.disposables.push(this.eventEmitter);
  }

  /**
   * Start watching files
   */
  public start(): void {
    if (this.watcher) {
      logger.warn('FileWatcher already started');
      return;
    }

    this.watcher = vscode.workspace.createFileSystemWatcher(this.pattern);

    this.watcher.onDidCreate(uri => {
      this.handleFileEvent('created', uri);
    });

    this.watcher.onDidChange(uri => {
      this.handleFileEvent('changed', uri);
    });

    this.watcher.onDidDelete(uri => {
      this.handleFileEvent('deleted', uri);
    });

    this.disposables.push(this.watcher);
    logger.info(`FileWatcher started for pattern: ${this.pattern}`);
  }

  /**
   * Stop watching files
   */
  public stop(): void {
    if (this.watcher) {
      this.watcher.dispose();
      this.watcher = null;
      logger.info(`FileWatcher stopped for pattern: ${this.pattern}`);
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Handle file system events with debouncing
   */
  private handleFileEvent(type: 'created' | 'changed' | 'deleted', uri: vscode.Uri): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      const event: FileWatcherEvent = {
        type,
        uri,
        timestamp: Date.now(),
      };

      logger.debug(`File ${type}: ${uri.fsPath}`);
      this.eventEmitter.fire(event);
    }, this.debounceDelay);
  }

  /**
   * Subscribe to file watcher events
   */
  public onEvent(listener: (event: FileWatcherEvent) => void): vscode.Disposable {
    return this.eventEmitter.event(listener);
  }

  /**
   * Dispose the file watcher
   */
  public dispose(): void {
    this.stop();
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }
}

/**
 * Create file watchers for Enzyme configuration files
 */
export function createEnzymeFileWatchers(): FileWatcher[] {
  const watchers: FileWatcher[] = [];

  // Watch Enzyme config files
  const configWatcher = new FileWatcher(FILE_PATTERNS.ENZYME_CONFIG);
  configWatcher.start();
  watchers.push(configWatcher);

  // Watch package.json
  const packageWatcher = new FileWatcher(FILE_PATTERNS.PACKAGE_JSON);
  packageWatcher.start();
  watchers.push(packageWatcher);

  // Watch feature configs
  const featureWatcher = new FileWatcher(FILE_PATTERNS.FEATURE_CONFIG);
  featureWatcher.start();
  watchers.push(featureWatcher);

  logger.info('File watchers created for Enzyme project files');
  return watchers;
}
