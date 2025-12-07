/**
 * WorkspaceService - Manages workspace detection, analysis, and file operations
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {
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
 * WorkspaceService - Service for workspace operations
 */
export class WorkspaceService {
  private static instance: WorkspaceService;
  private workspace: EnzymeWorkspace | null = null;
  private eventEmitter: vscode.EventEmitter<EnzymeWorkspace>;

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
   */
  public async detectEnzymeProject(): Promise<boolean> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return false;
    }

    const rootPath = workspaceFolder.uri.fsPath;

    // Check for package.json with Enzyme dependencies
    const packageJson = this.getPackageJson(rootPath);
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

    // Check for enzyme.config files
    const configPaths = [
      path.join(rootPath, 'enzyme.config.ts'),
      path.join(rootPath, 'enzyme.config.js'),
    ];

    for (const configPath of configPaths) {
      if (fs.existsSync(configPath)) {
        return true;
      }
    }

    // Check for .enzyme directory
    const enzymeDirPath = path.join(rootPath, '.enzyme');
    if (fs.existsSync(enzymeDirPath) && fs.statSync(enzymeDirPath).isDirectory()) {
      return true;
    }

    return false;
  }

  /**
   * Get package.json
   */
  public getPackageJson(rootPath?: string): PackageJson | undefined {
    const root = rootPath || this.getRootPath();
    if (!root) {
      return undefined;
    }

    const packageJsonPath = path.join(root, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return undefined;
    }

    try {
      return JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as PackageJson;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Get Enzyme version from package.json
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

    for (const pkg of enzymePackages) {
      if (allDeps[pkg]) {
        return allDeps[pkg];
      }
    }

    const enzymePackage = Object.entries(allDeps).find(([name]) =>
      name.startsWith('@enzyme/') || name.startsWith('@missionfabric-js/enzyme')
    );

    return enzymePackage?.[1];
  }

  /**
   * Find Enzyme configuration file
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
      if (fs.existsSync(configPath)) {
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
   */
  public getAbsolutePath(relativePath: string): string {
    const rootPath = this.getRootPath();
    if (!rootPath) {
      return relativePath;
    }
    return path.join(rootPath, relativePath);
  }

  /**
   * Check if file exists
   */
  public fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  /**
   * Read file content
   */
  public async readFile(filePath: string): Promise<string> {
    return fs.promises.readFile(filePath, 'utf-8');
  }

  /**
   * Write file content
   */
  public async writeFile(filePath: string, content: string): Promise<void> {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
    await fs.promises.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Subscribe to workspace changes
   */
  public onWorkspaceChanged(listener: (workspace: EnzymeWorkspace) => void): vscode.Disposable {
    return this.eventEmitter.event(listener);
  }

  /**
   * Scan for features
   */
  private async scanFeatures(rootPath: string): Promise<EnzymeFeature[]> {
    const features: EnzymeFeature[] = [];
    const featuresPath = path.join(rootPath, 'src', 'features');

    if (!fs.existsSync(featuresPath)) {
      return features;
    }

    try {
      const featureDirs = fs.readdirSync(featuresPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory());

      for (const featureDir of featureDirs) {
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
    } catch (error) {
      // Ignore errors
    }

    return features;
  }

  /**
   * Scan for routes
   */
  private async scanRoutes(_rootPath: string): Promise<EnzymeRoute[]> {
    // Placeholder implementation
    return [];
  }

  /**
   * Scan for components
   */
  private async scanComponents(_rootPath: string): Promise<EnzymeComponent[]> {
    // Placeholder implementation
    return [];
  }

  /**
   * Scan for stores
   */
  private async scanStores(_rootPath: string): Promise<EnzymeStore[]> {
    // Placeholder implementation
    return [];
  }

  /**
   * Scan for API clients
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
   */
  public dispose(): void {
    this.eventEmitter.dispose();
  }
}
