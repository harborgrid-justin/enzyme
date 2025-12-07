/**
 * @file Project Configuration Manager
 * @description Reads and manages enzyme.config.ts files
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { EnzymeConfigSchema, validateEnzymeConfig, parseEnzymeConfig } from './config-schema';

// =============================================================================
// Types
// =============================================================================

/**
 * Config file type
 */
export type ConfigFileType = 'typescript' | 'javascript' | 'json';

/**
 * Config file info
 */
export interface ConfigFileInfo {
  path: string;
  type: ConfigFileType;
  exists: boolean;
  lastModified?: Date;
}

/**
 * Config change event
 */
export interface ProjectConfigChangeEvent {
  config: EnzymeConfigSchema;
  previousConfig?: EnzymeConfigSchema;
  path: string;
}

// =============================================================================
// Project Config Manager
// =============================================================================

/**
 * Project configuration manager
 */
export class ProjectConfig {
  private config: EnzymeConfigSchema | null = null;
  private configPath: string | null = null;
  private watcher: vscode.FileSystemWatcher | null = null;
  private listeners: Array<(event: ProjectConfigChangeEvent) => void> = [];
  private disposables: vscode.Disposable[] = [];

  constructor(private workspaceRoot: string) {}

  /**
   * Initialize and load configuration
   */
  public async initialize(): Promise<void> {
    await this.loadConfig();
    this.watchConfig();
  }

  /**
   * Load configuration from file
   */
  public async loadConfig(): Promise<EnzymeConfigSchema | null> {
    try {
      const configFile = await this.findConfigFile();

      if (!configFile || !configFile.exists) {
        this.config = null;
        this.configPath = null;
        return null;
      }

      const rawConfig = await this.readConfigFile(configFile);
      const parseResult = validateEnzymeConfig(rawConfig);

      if (!parseResult.success) {
        throw new Error(`Invalid configuration: ${parseResult.error.message}`);
      }

      const previousConfig = this.config;
      this.config = parseResult.data;
      this.configPath = configFile.path;

      // Notify listeners
      this.notifyListeners({
        config: this.config,
        previousConfig: previousConfig ?? undefined,
        path: configFile.path,
      });

      return this.config;
    } catch (error) {
      console.error('Failed to load enzyme config:', error);
      throw error;
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): EnzymeConfigSchema | null {
    return this.config;
  }

  /**
   * Get configuration file path
   */
  public getConfigPath(): string | null {
    return this.configPath;
  }

  /**
   * Check if configuration exists
   */
  public async hasConfig(): Promise<boolean> {
    const configFile = await this.findConfigFile();
    return configFile?.exists ?? false;
  }

  /**
   * Find configuration file
   */
  private async findConfigFile(): Promise<ConfigFileInfo | null> {
    const configFiles = [
      { name: 'enzyme.config.ts', type: 'typescript' as ConfigFileType },
      { name: 'enzyme.config.js', type: 'javascript' as ConfigFileType },
      { name: 'enzyme.config.mjs', type: 'javascript' as ConfigFileType },
      { name: 'enzyme.config.json', type: 'json' as ConfigFileType },
    ];

    for (const file of configFiles) {
      const filePath = path.join(this.workspaceRoot, file.name);

      try {
        const stat = await fs.stat(filePath);
        return {
          path: filePath,
          type: file.type,
          exists: true,
          lastModified: stat.mtime,
        };
      } catch {
        // File doesn't exist, continue
      }
    }

    return null;
  }

  /**
   * Read configuration file
   */
  private async readConfigFile(fileInfo: ConfigFileInfo): Promise<unknown> {
    const content = await fs.readFile(fileInfo.path, 'utf-8');

    if (fileInfo.type === 'json') {
      return JSON.parse(content);
    }

    // For TS/JS files, we need to parse them
    // In a real implementation, you'd use a TS parser or execute the config
    // For now, we'll use a simple regex-based extraction
    return this.parseTypeScriptConfig(content);
  }

  /**
   * Parse TypeScript/JavaScript config file
   * Note: This is a simplified parser. In production, use proper TS parsing.
   */
  private parseTypeScriptConfig(content: string): unknown {
    try {
      // Remove comments
      content = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');

      // Find export default
      const exportMatch = content.match(/export\s+default\s+({[\s\S]*?});?\s*$/m);
      if (exportMatch) {
        // Try to parse as JSON (with some cleanup)
        const configStr = exportMatch[1]
          .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Add quotes to keys
          .replace(/'/g, '"') // Replace single quotes
          .replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas

        return JSON.parse(configStr);
      }

      // If export default not found, try to find defineConfig
      const defineConfigMatch = content.match(/defineConfig\(([\s\S]*?)\)/);
      if (defineConfigMatch) {
        const configStr = defineConfigMatch[1]
          .replace(/([{,]\s*)(\w+):/g, '$1"$2":')
          .replace(/'/g, '"')
          .replace(/,(\s*[}\]])/g, '$1');

        return JSON.parse(configStr);
      }

      throw new Error('Could not parse config file');
    } catch (error) {
      throw new Error(`Failed to parse TypeScript config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Watch configuration file for changes
   */
  private watchConfig(): void {
    const pattern = new vscode.RelativePattern(
      this.workspaceRoot,
      'enzyme.config.{ts,js,mjs,json}'
    );

    this.watcher = vscode.workspace.createFileSystemWatcher(pattern);

    this.disposables.push(
      this.watcher.onDidChange(() => this.loadConfig()),
      this.watcher.onDidCreate(() => this.loadConfig()),
      this.watcher.onDidDelete(() => {
        this.config = null;
        this.configPath = null;
      })
    );
  }

  /**
   * Subscribe to configuration changes
   */
  public onChange(callback: (event: ProjectConfigChangeEvent) => void): vscode.Disposable {
    this.listeners.push(callback);

    return new vscode.Disposable(() => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    });
  }

  /**
   * Notify listeners of config changes
   */
  private notifyListeners(event: ProjectConfigChangeEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in config change listener:', error);
      }
    });
  }

  /**
   * Validate current configuration
   */
  public validate(): { valid: boolean; errors: string[] } {
    if (!this.config) {
      return { valid: false, errors: ['No configuration loaded'] };
    }

    const result = validateEnzymeConfig(this.config);

    if (!result.success) {
      return {
        valid: false,
        errors: result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`),
      };
    }

    return { valid: true, errors: [] };
  }

  /**
   * Get configuration value by path
   */
  public getValue<T = unknown>(path: string): T | undefined {
    if (!this.config) {
      return undefined;
    }

    const parts = path.split('.');
    let value: any = this.config;

    for (const part of parts) {
      if (value === undefined || value === null) {
        return undefined;
      }
      value = value[part];
    }

    return value as T;
  }

  /**
   * Create default configuration file
   */
  public async createDefaultConfig(type: ConfigFileType = 'typescript'): Promise<string> {
    const defaultConfig = parseEnzymeConfig({});
    const fileName = `enzyme.config.${type === 'typescript' ? 'ts' : type === 'javascript' ? 'js' : 'json'}`;
    const filePath = path.join(this.workspaceRoot, fileName);

    let content: string;

    if (type === 'json') {
      content = JSON.stringify(defaultConfig, null, 2);
    } else {
      content = this.generateTypeScriptConfig(defaultConfig);
    }

    await fs.writeFile(filePath, content, 'utf-8');
    await this.loadConfig();

    return filePath;
  }

  /**
   * Generate TypeScript config file content
   */
  private generateTypeScriptConfig(config: EnzymeConfigSchema): string {
    return `import { defineConfig } from '@missionfabric-js/enzyme';

export default defineConfig(${JSON.stringify(config, null, 2)});
`;
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    this.watcher?.dispose();
    this.disposables.forEach((d) => d.dispose());
    this.listeners = [];
  }
}

// =============================================================================
// Workspace Config Manager
// =============================================================================

/**
 * Manager for multiple workspace configurations
 */
export class WorkspaceConfigManager {
  private configs: Map<string, ProjectConfig> = new Map();

  /**
   * Get or create config for workspace folder
   */
  public async getConfig(workspaceFolder: vscode.WorkspaceFolder): Promise<ProjectConfig> {
    const key = workspaceFolder.uri.fsPath;

    if (!this.configs.has(key)) {
      const config = new ProjectConfig(workspaceFolder.uri.fsPath);
      await config.initialize();
      this.configs.set(key, config);
    }

    return this.configs.get(key)!;
  }

  /**
   * Get config for active document
   */
  public async getActiveConfig(): Promise<ProjectConfig | null> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return null;
    }

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
    if (!workspaceFolder) {
      return null;
    }

    return this.getConfig(workspaceFolder);
  }

  /**
   * Get all configurations
   */
  public getAllConfigs(): ProjectConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * Dispose all configurations
   */
  public dispose(): void {
    this.configs.forEach((config) => config.dispose());
    this.configs.clear();
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

let workspaceConfigManager: WorkspaceConfigManager | null = null;

/**
 * Get workspace config manager
 */
export function getWorkspaceConfigManager(): WorkspaceConfigManager {
  if (!workspaceConfigManager) {
    workspaceConfigManager = new WorkspaceConfigManager();
  }
  return workspaceConfigManager;
}

/**
 * Get project config for active document
 */
export async function getActiveProjectConfig(): Promise<ProjectConfig | null> {
  return getWorkspaceConfigManager().getActiveConfig();
}
