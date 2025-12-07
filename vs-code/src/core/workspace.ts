/**
 * Workspace Utilities for Enzyme VS Code Extension
 * Provides functions to detect, analyze, and monitor Enzyme projects
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
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
 * Detect if the workspace contains an Enzyme project
 */
export async function detectEnzymeProject(): Promise<boolean> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    logger.debug('No workspace folder found');
    return false;
  }

  const rootPath = workspaceFolder.uri.fsPath;

  // Check for package.json with Enzyme dependencies
  const packageJsonPath = path.join(rootPath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as PackageJson;
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
      logger.error('Failed to parse package.json', error);
    }
  }

  // Check for enzyme.config.ts or enzyme.config.js
  const configPaths = [
    path.join(rootPath, 'enzyme.config.ts'),
    path.join(rootPath, 'enzyme.config.js'),
  ];

  for (const configPath of configPaths) {
    if (fs.existsSync(configPath)) {
      logger.info(`Enzyme project detected via ${path.basename(configPath)}`);
      return true;
    }
  }

  // Check for .enzyme directory
  const enzymeDirPath = path.join(rootPath, '.enzyme');
  if (fs.existsSync(enzymeDirPath) && fs.statSync(enzymeDirPath).isDirectory()) {
    logger.info('Enzyme project detected via .enzyme directory');
    return true;
  }

  logger.debug('No Enzyme project detected');
  return false;
}

/**
 * Get Enzyme version from package.json
 */
export function getEnzymeVersion(rootPath: string): string | undefined {
  const packageJsonPath = path.join(rootPath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return undefined;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as PackageJson;
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
 * Find Enzyme configuration file
 */
export async function findEnzymeConfig(rootPath: string): Promise<EnzymeConfig | undefined> {
  const configPaths = [
    path.join(rootPath, 'enzyme.config.ts'),
    path.join(rootPath, 'enzyme.config.js'),
  ];

  for (const configPath of configPaths) {
    if (fs.existsSync(configPath)) {
      try {
        // For now, just return a placeholder
        // In a real implementation, we would parse the TypeScript/JavaScript file
        logger.info(`Found Enzyme config at ${configPath}`);
        return {
          version: '1.0.0',
          features: [],
          routes: [],
        };
      } catch (error) {
        logger.error(`Failed to parse config at ${configPath}`, error);
      }
    }
  }

  return undefined;
}

/**
 * Get package.json
 */
export function getPackageJson(rootPath: string): PackageJson | undefined {
  const packageJsonPath = path.join(rootPath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return undefined;
  }

  try {
    return JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as PackageJson;
  } catch (error) {
    logger.error('Failed to parse package.json', error);
    return undefined;
  }
}

/**
 * Analyze project structure and return workspace information
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
  const isEnzymeProject = await detectEnzymeProject();
  const packageJson = getPackageJson(rootPath);
  const enzymeConfig = await findEnzymeConfig(rootPath);
  const enzymeVersion = getEnzymeVersion(rootPath);

  // Scan for features, routes, components, etc.
  const features = await scanFeatures(rootPath);
  const routes = await scanRoutes(rootPath);
  const components = await scanComponents(rootPath);
  const stores = await scanStores(rootPath);
  const apiClients = await scanApiClients(rootPath);

  logger.info('Project structure analyzed', {
    isEnzymeProject,
    enzymeVersion,
    featuresCount: features.length,
    routesCount: routes.length,
    componentsCount: components.length,
    storesCount: stores.length,
    apiClientsCount: apiClients.length,
  });

  return {
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
}

/**
 * Scan for Enzyme features
 */
async function scanFeatures(rootPath: string): Promise<EnzymeFeature[]> {
  const features: EnzymeFeature[] = [];
  const featuresPath = path.join(rootPath, 'src', 'features');

  if (!fs.existsSync(featuresPath)) {
    return features;
  }

  try {
    const featureDirs = fs.readdirSync(featuresPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory());

    for (const featureDir of featureDirs) {
      const featurePath = path.join(featuresPath, featureDir.name);
      const feature = await analyzeFeature(featurePath, featureDir.name);
      if (feature) {
        features.push(feature);
      }
    }
  } catch (error) {
    logger.error('Failed to scan features', error);
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
 * Scan for routes
 */
async function scanRoutes(rootPath: string): Promise<EnzymeRoute[]> {
  const routes: EnzymeRoute[] = [];
  const routesPath = path.join(rootPath, 'src', 'routes');

  if (!fs.existsSync(routesPath)) {
    return routes;
  }

  // Placeholder implementation
  return routes;
}

/**
 * Scan for components
 */
async function scanComponents(rootPath: string): Promise<EnzymeComponent[]> {
  const components: EnzymeComponent[] = [];
  const componentsPath = path.join(rootPath, 'src', 'components');

  if (!fs.existsSync(componentsPath)) {
    return components;
  }

  // Placeholder implementation
  return components;
}

/**
 * Scan for stores
 */
async function scanStores(rootPath: string): Promise<EnzymeStore[]> {
  const stores: EnzymeStore[] = [];
  const storesPath = path.join(rootPath, 'src', 'stores');

  if (!fs.existsSync(storesPath)) {
    return stores;
  }

  // Placeholder implementation
  return stores;
}

/**
 * Scan for API clients
 */
async function scanApiClients(rootPath: string): Promise<EnzymeApiClient[]> {
  const apiClients: EnzymeApiClient[] = [];
  const apiPath = path.join(rootPath, 'src', 'api');

  if (!fs.existsSync(apiPath)) {
    return apiClients;
  }

  // Placeholder implementation
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
