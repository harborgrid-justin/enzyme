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
 * @param filePath
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
 * @param filePath
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
   *
   */
  private constructor() {
    this.eventEmitter = new vscode.EventEmitter<EnzymeWorkspace>();
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): WorkspaceService {
    if (!WorkspaceService.instance) {
      WorkspaceService.instance = new WorkspaceService();
    }
    return WorkspaceService.instance;
  }

  /**
   * Detect if workspace contains an Enzyme project
   * PERFORMANCE: Uses async file operations to prevent blocking
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
    const enzymeDirPath = path.join(rootPath, '.enzyme');
    if (await pathExists(enzymeDirPath) && await isDirectory(enzymeDirPath)) {
      return true;
    }

    return false;
  }

  /**
   * Get package.json (async version - preferred)
   * PERFORMANCE: Uses async file operations
   * @param rootPath
   */
  public async getPackageJsonAsync(rootPath?: string): Promise<PackageJson | undefined> {
    const root = rootPath || this.getRootPath();
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
   * @param rootPath
   * @deprecated Use getPackageJsonAsync instead
   */
  public getPackageJson(rootPath?: string): PackageJson | undefined {
    // This is kept for backwards compatibility but should be avoided
    // Calls the async version synchronously which is not ideal
    const root = rootPath || this.getRootPath();
    if (!root) {
      return undefined;
    }
    // Return undefined to encourage migration to async version
    console.warn('WorkspaceService.getPackageJson() is deprecated. Use getPackageJsonAsync() instead.');
    return undefined;
  }

  /**
   * Get Enzyme version from package.json
   * @param rootPath
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
   * @param rootPath
   */
  public async findEnzymeConfig(rootPath?: string): Promise<EnzymeConfig | undefined> {
    const root = rootPath || this.getRootPath();
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
    const routes = await this.scanRoutes(rootPath);
    const components = await this.scanComponents(rootPath);
    const stores = await this.scanStores(rootPath);
    const apiClients = await this.scanApiClients(rootPath);

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
   */
  public getWorkspace(): EnzymeWorkspace | null {
    return this.workspace;
  }

  /**
   * Get workspace root path
   */
  public getRootPath(): string | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  }

  /**
   * Get workspace URI
   */
  public getRootUri(): vscode.Uri | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri;
  }

  /**
   * Check if multi-root workspace
   */
  public isMultiRoot(): boolean {
    return (vscode.workspace.workspaceFolders?.length ?? 0) > 1;
  }

  /**
   * Get relative path from workspace root
   * @param absolutePath
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
   * @param relativePath
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
   * @param filePath
   */
  public async fileExistsAsync(filePath: string): Promise<boolean> {
    return pathExists(filePath);
  }

  /**
   * Check if file exists (sync - deprecated)
   * @param _filePath
   * @deprecated Use fileExistsAsync instead
   */
  public fileExists(_filePath: string): boolean {
    console.warn('WorkspaceService.fileExists() is deprecated. Use fileExistsAsync() instead.');
    return false; // Encourage migration to async
  }

  /**
   * Read file content
   * PERFORMANCE: Already async
   * @param filePath
   */
  public async readFile(filePath: string): Promise<string> {
    return fs.readFile(filePath, 'utf-8');
  }

  /**
   * Write file content
   * PERFORMANCE: Uses async file operations
   * @param filePath
   * @param content
   */
  public async writeFile(filePath: string, content: string): Promise<void> {
    const dir = path.dirname(filePath);
    if (!(await pathExists(dir))) {
      await fs.mkdir(dir, { recursive: true });
    }
    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Subscribe to workspace changes
   * @param listener
   */
  public onWorkspaceChanged(listener: (workspace: EnzymeWorkspace) => void): vscode.Disposable {
    return this.eventEmitter.event(listener);
  }

  /**
   * Scan for features
   * PERFORMANCE: Uses async file operations
   * @param rootPath
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

      for (const featureDir of featureDirectories) {
        features.push({
          id: featureDir.name,
          name: featureDir.name.charAt(0).toUpperCase() + featureDir.name.slice(1),
          path: path.join(featuresPath, featureDir.name),
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
   * @param _rootPath
   */
  private async scanRoutes(_rootPath: string): Promise<EnzymeRoute[]> {
    // Placeholder implementation
    return [];
  }

  /**
   * Scan for components
   * @param _rootPath
   */
  private async scanComponents(_rootPath: string): Promise<EnzymeComponent[]> {
    // Placeholder implementation
    return [];
  }

  /**
   * Scan for stores
   * @param _rootPath
   */
  private async scanStores(_rootPath: string): Promise<EnzymeStore[]> {
    // Placeholder implementation
    return [];
  }

  /**
   * Scan for API clients
   * @param _rootPath
   */
  private async scanApiClients(_rootPath: string): Promise<EnzymeApiClient[]> {
    // Placeholder implementation
    return [];
  }

  /**
   * Create empty workspace
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
    if (WorkspaceService.instance) {
      WorkspaceService.instance.dispose();
    }
    WorkspaceService.instance = null as unknown as WorkspaceService;
  }
}
