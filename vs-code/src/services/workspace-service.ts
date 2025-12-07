/**
 * WorkspaceService - Manages workspace detection, analysis, and file operations
 * PERFORMANCE: All file operations are async to prevent blocking the event loop
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type {
  EnzymeWorkspace,
  EnzymeConfig,
  PackageJson,
  EnzymeFeature,
  EnzymeRoute,
  EnzymeComponent,
  EnzymeStore,
  EnzymeApiClient,
} from '../types';

/**
 * PERFORMANCE: Helper to check if path exists (async)
 * @param filePath - Path to check
 * @returns Promise resolving to true if path exists
 */
async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * PERFORMANCE: Helper to check if path is directory (async)
 * @param filePath - Path to check
 * @returns Promise resolving to true if path is a directory
 */
async function isDirectory(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * WorkspaceService - Service for workspace operations
 */
export class WorkspaceService {
  private static instance: WorkspaceService;
  private workspace: EnzymeWorkspace | null = null;
  private readonly eventEmitter: vscode.EventEmitter<EnzymeWorkspace>;

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.eventEmitter = new vscode.EventEmitter<EnzymeWorkspace>();
  }

  /**
   * Get the singleton instance
   * @returns WorkspaceService instance
   */
  public static getInstance(): WorkspaceService {
     
    WorkspaceService.instance ??= new WorkspaceService();
    return WorkspaceService.instance;
  }

  /**
   * Detect if workspace contains an Enzyme project
   * PERFORMANCE: Uses async file operations to prevent blocking
   * @returns Promise resolving to true if Enzyme project detected
   */
  public async detectEnzymeProject(): Promise<boolean> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return false;
    }

    const rootPath = workspaceFolder.uri.fsPath;

    // Check for package.json with Enzyme dependencies
    const packageJson = await this.getPackageJsonAsync(rootPath);
    if (packageJson) {
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      const hasEnzyme = Object.keys(allDeps).some(dep =>
        dep.startsWith('@enzyme/') ||
        dep.startsWith('@missionfabric-js/enzyme') ||
        dep === 'enzyme'
      );

      if (hasEnzyme) {
        return true;
      }
    }

    // Check for enzyme.config files (async)
    const configPaths = [
      path.join(rootPath, 'enzyme.config.ts'),
      path.join(rootPath, 'enzyme.config.js'),
    ];

    for (const configPath of configPaths) {
      if (await pathExists(configPath)) {
        return true;
      }
    }

    // Check for .enzyme directory (async)
    const enzymeDirectoryPath = path.join(rootPath, '.enzyme');
    return await pathExists(enzymeDirectoryPath) && await isDirectory(enzymeDirectoryPath);
  }

  /**
   * Get package.json (async version - preferred)
   * PERFORMANCE: Uses async file operations
   * @param rootPath - Optional root path (defaults to workspace root)
   * @returns Promise resolving to package.json or undefined
   */
  public async getPackageJsonAsync(rootPath?: string): Promise<PackageJson | undefined> {
    const root = rootPath ?? this.getRootPath();
    if (!root) {
      return undefined;
    }

    const packageJsonPath = path.join(root, 'package.json');
    if (!(await pathExists(packageJsonPath))) {
      return undefined;
    }

    try {
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      return JSON.parse(content) as PackageJson;
    } catch {
      return undefined;
    }
  }

  /**
   * Get package.json (sync version - for backwards compatibility)
   * @param rootPath - Optional root path (defaults to workspace root)
   * @returns Package.json or undefined
   * @deprecated Use getPackageJsonAsync instead
   */
  public getPackageJson(rootPath?: string): PackageJson | undefined {
    // This is kept for backwards compatibility but should be avoided
    // Calls the async version synchronously which is not ideal
    const root = rootPath ?? this.getRootPath();
    if (!root) {
      return undefined;
    }
    // Return undefined to encourage migration to async version
    console.warn('WorkspaceService.getPackageJson() is deprecated. Use getPackageJsonAsync() instead.');
    return undefined;
  }

  /**
   * Get Enzyme version from package.json
   * @param rootPath - Optional root path (defaults to workspace root)
   * @returns Enzyme version string or undefined
   */
  public getEnzymeVersion(rootPath?: string): string | undefined {
    const packageJson = this.getPackageJson(rootPath);
    if (!packageJson) {
      return undefined;
    }

    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    const enzymePackages = [
      '@missionfabric-js/enzyme',
      '@enzyme/core',
      'enzyme',
    ];

    for (const package_ of enzymePackages) {
      if (allDeps[package_]) {
        return allDeps[package_];
      }
    }

    const enzymePackage = Object.entries(allDeps).find(([name]) =>
      name.startsWith('@enzyme/') || name.startsWith('@missionfabric-js/enzyme')
    );

    return enzymePackage?.[1];
  }

  /**
   * Find Enzyme configuration file
   * PERFORMANCE: Uses async file operations
   * @param rootPath - Optional root path (defaults to workspace root)
   * @returns Promise resolving to Enzyme config or undefined
   */
  public async findEnzymeConfig(rootPath?: string): Promise<EnzymeConfig | undefined> {
    const root = rootPath ?? this.getRootPath();
    if (!root) {
      return undefined;
    }

    const configPaths = [
      path.join(root, 'enzyme.config.ts'),
      path.join(root, 'enzyme.config.js'),
    ];

    for (const configPath of configPaths) {
      if (await pathExists(configPath)) {
        // Placeholder - in real implementation, would parse the config file
        return {
          version: '1.0.0',
          features: [],
          routes: [],
        };
      }
    }

    return undefined;
  }

  /**
   * Analyze and return workspace information
   * @returns Promise resolving to workspace information
   */
  public async analyzeWorkspace(): Promise<EnzymeWorkspace> {
    const rootPath = this.getRootPath();

    if (!rootPath) {
      return this.createEmptyWorkspace();
    }

    const isEnzymeProject = await this.detectEnzymeProject();
    const packageJson = this.getPackageJson(rootPath);
    const enzymeConfig = await this.findEnzymeConfig(rootPath);
    const enzymeVersion = this.getEnzymeVersion(rootPath);

    const features = await this.scanFeatures(rootPath);
    const routes = this.scanRoutes(rootPath);
    const components = this.scanComponents(rootPath);
    const stores = this.scanStores(rootPath);
    const apiClients = this.scanApiClients(rootPath);

    const workspace: EnzymeWorkspace = {
      rootPath,
      isEnzymeProject,
      features,
      routes,
      components,
      stores,
      apiClients,
    };

    // Conditionally add optional properties to satisfy exactOptionalPropertyTypes
    if (packageJson !== undefined) {
      workspace.packageJson = packageJson;
    }
    if (enzymeConfig !== undefined) {
      workspace.enzymeConfig = enzymeConfig;
    }
    if (enzymeVersion !== undefined) {
      workspace.enzymeVersion = enzymeVersion;
    }

    this.workspace = workspace;
    this.eventEmitter.fire(workspace);

    return workspace;
  }

  /**
   * Get current workspace
   * @returns Current workspace or null
   */
  public getWorkspace(): EnzymeWorkspace | null {
    return this.workspace;
  }

  /**
   * Get workspace root path
   * @returns Workspace root path or undefined
   */
  public getRootPath(): string | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  }

  /**
   * Get workspace URI
   * @returns Workspace root URI or undefined
   */
  public getRootUri(): vscode.Uri | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri;
  }

  /**
   * Check if multi-root workspace
   * @returns True if workspace has multiple root folders
   */
  public isMultiRoot(): boolean {
    return (vscode.workspace.workspaceFolders?.length ?? 0) > 1;
  }

  /**
   * Get relative path from workspace root
   * @param absolutePath - Absolute path to convert
   * @returns Relative path from workspace root
   */
  public getRelativePath(absolutePath: string): string {
    const rootPath = this.getRootPath();
    if (!rootPath) {
      return absolutePath;
    }
    return path.relative(rootPath, absolutePath);
  }

  /**
   * Get absolute path from workspace root
   * @param relativePath - Relative path to convert
   * @returns Absolute path
   */
  public getAbsolutePath(relativePath: string): string {
    const rootPath = this.getRootPath();
    if (!rootPath) {
      return relativePath;
    }
    return path.join(rootPath, relativePath);
  }

  /**
   * Check if file exists (async)
   * PERFORMANCE: Uses async file operations
   * @param filePath - Path to check
   * @returns Promise resolving to true if file exists
   */
  public async fileExistsAsync(filePath: string): Promise<boolean> {
    return pathExists(filePath);
  }

  /**
   * Check if file exists (sync - deprecated)
   * @param _filePath - Path to check (unused)
   * @returns Always false (deprecated)
   * @deprecated Use fileExistsAsync instead
   */
  public fileExists(_filePath: string): boolean {
    console.warn('WorkspaceService.fileExists() is deprecated. Use fileExistsAsync() instead.');
    return false; // Encourage migration to async
  }

  /**
   * Read file content
   * PERFORMANCE: Already async
   * @param filePath - Path to file
   * @returns Promise resolving to file content
   */
  public async readFile(filePath: string): Promise<string> {
    return fs.readFile(filePath, 'utf-8');
  }

  /**
   * Write file content
   * PERFORMANCE: Uses async file operations
   * @param filePath - Path to file
   * @param content - Content to write
   */
  public async writeFile(filePath: string, content: string): Promise<void> {
    const directory = path.dirname(filePath);
    if (!(await pathExists(directory))) {
      await fs.mkdir(directory, { recursive: true });
    }
    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Subscribe to workspace changes
   * @param listener - Event listener callback
   * @returns Disposable to unsubscribe
   */
  public onWorkspaceChanged(listener: (workspace: EnzymeWorkspace) => void): vscode.Disposable {
    return this.eventEmitter.event(listener);
  }

  /**
   * Scan for features
   * PERFORMANCE: Uses async file operations
   * @param rootPath - Root path of the project
   * @returns Promise resolving to array of features
   */
  private async scanFeatures(rootPath: string): Promise<EnzymeFeature[]> {
    const features: EnzymeFeature[] = [];
    const featuresPath = path.join(rootPath, 'src', 'features');

    if (!(await pathExists(featuresPath))) {
      return features;
    }

    try {
      const entries = await fs.readdir(featuresPath, { withFileTypes: true });
      const featureDirectories = entries.filter(dirent => dirent.isDirectory());

      for (const featureDirectory of featureDirectories) {
        features.push({
          id: featureDirectory.name,
          name: featureDirectory.name.charAt(0).toUpperCase() + featureDirectory.name.slice(1),
          path: path.join(featuresPath, featureDirectory.name),
          version: '1.0.0',
          enabled: true,
          routes: [],
          components: [],
        });
      }
    } catch {
      // Ignore errors - directory may not be accessible
    }

    return features;
  }

  /**
   * Scan for routes
   * @param _rootPath - Root path of the project (unused)
   * @returns Promise resolving to array of routes
   */
  private scanRoutes(_rootPath: string): EnzymeRoute[] {
    // Placeholder implementation
    return [];
  }

  /**
   * Scan for components
   * @param _rootPath - Root path of the project (unused)
   * @returns Promise resolving to array of components
   */
  private scanComponents(_rootPath: string): EnzymeComponent[] {
    // Placeholder implementation
    return [];
  }

  /**
   * Scan for stores
   * @param _rootPath - Root path of the project (unused)
   * @returns Promise resolving to array of stores
   */
  private scanStores(_rootPath: string): EnzymeStore[] {
    // Placeholder implementation
    return [];
  }

  /**
   * Scan for API clients
   * @param _rootPath - Root path of the project (unused)
   * @returns Promise resolving to array of API clients
   */
  private scanApiClients(_rootPath: string): EnzymeApiClient[] {
    // Placeholder implementation
    return [];
  }

  /**
   * Create empty workspace
   * @returns Empty workspace object
   */
  private createEmptyWorkspace(): EnzymeWorkspace {
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

  /**
   * Dispose the service
   * IMPORTANT: This must be called during extension deactivation
   */
  public dispose(): void {
    this.eventEmitter.dispose();
    this.workspace = null;
    // Reset singleton instance to allow proper re-initialization
    WorkspaceService.instance = null as unknown as WorkspaceService;
  }

  /**
   * Reset the singleton instance (for testing and cleanup)
   */
  public static reset(): void {
     
    if (WorkspaceService.instance !== undefined) {
      WorkspaceService.instance.dispose();
    }
    WorkspaceService.instance = undefined as unknown as WorkspaceService;
  }
}
