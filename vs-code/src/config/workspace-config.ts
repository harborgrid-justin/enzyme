/**
 * @file Workspace Configuration Manager
 * @description Manages workspace-specific settings and multi-root workspaces
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';

// =============================================================================
// Types
// =============================================================================

/**
 * Workspace settings
 */
export interface WorkspaceSettings {
  'enzyme.enabled': boolean;
  'enzyme.configPath': string;
  'enzyme.excludePaths': string[];
  'enzyme.includePaths': string[];
  'enzyme.features': Record<string, boolean>;
}

/**
 * Recommended settings
 */
export interface RecommendedSettings {
  category: string;
  settings: Record<string, unknown>;
  description: string;
}

// =============================================================================
// Recommended Settings
// =============================================================================

const RECOMMENDED_SETTINGS: RecommendedSettings[] = [
  {
    category: 'TypeScript',
    description: 'Recommended TypeScript settings for Enzyme projects',
    settings: {
      'typescript.tsdk': 'node_modules/typescript/lib',
      'typescript.enablePromptUseWorkspaceTsdk': true,
      'typescript.preferences.importModuleSpecifier': 'non-relative',
    },
  },
  {
    category: 'Editor',
    description: 'Recommended editor settings for Enzyme development',
    settings: {
      'editor.formatOnSave': true,
      'editor.codeActionsOnSave': {
        'source.fixAll.eslint': 'explicit',
        'source.organizeImports': 'never',
      },
      'editor.defaultFormatter': 'esbenp.prettier-vscode',
    },
  },
  {
    category: 'Files',
    description: 'File handling settings for Enzyme projects',
    settings: {
      'files.exclude': {
        '**/.git': true,
        '**/node_modules': true,
        '**/dist': true,
        '**/.enzyme-cache': true,
      },
      'files.watcherExclude': {
        '**/node_modules/**': true,
        '**/dist/**': true,
      },
    },
  },
  {
    category: 'Enzyme',
    description: 'Recommended Enzyme extension settings',
    settings: {
      'enzyme.diagnostics.enabled': true,
      'enzyme.codeLens.enabled': true,
      'enzyme.formatting.onSave': false,
      'enzyme.analysis.autoRun': true,
    },
  },
];

// =============================================================================
// Workspace Config Manager
// =============================================================================

/**
 * Workspace configuration manager
 */
export class WorkspaceConfig {
  private settingsPath: string;
  private watcher: vscode.FileSystemWatcher | null = null;

  constructor(private workspaceFolder: vscode.WorkspaceFolder) {
    this.settingsPath = path.join(
      workspaceFolder.uri.fsPath,
      '.vscode',
      'settings.json'
    );
  }

  /**
   * Initialize workspace config
   */
  public async initialize(): Promise<void> {
    await this.ensureSettingsFile();
    this.watchSettings();
  }

  /**
   * Ensure .vscode/settings.json exists
   */
  private async ensureSettingsFile(): Promise<void> {
    try {
      await fs.access(this.settingsPath);
    } catch {
      // Create directory and file
      const vscodePath = path.dirname(this.settingsPath);
      await fs.mkdir(vscodePath, { recursive: true });
      await fs.writeFile(this.settingsPath, '{}', 'utf-8');
    }
  }

  /**
   * Get workspace settings
   */
  public async getSettings(): Promise<Record<string, unknown>> {
    try {
      const content = await fs.readFile(this.settingsPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  /**
   * Set workspace setting
   */
  public async setSetting(key: string, value: unknown): Promise<void> {
    const settings = await this.getSettings();
    settings[key] = value;

    await this.saveSettings(settings);
  }

  /**
   * Remove workspace setting
   */
  public async removeSetting(key: string): Promise<void> {
    const settings = await this.getSettings();
    delete settings[key];

    await this.saveSettings(settings);
  }

  /**
   * Save settings to file
   */
  private async saveSettings(settings: Record<string, unknown>): Promise<void> {
    const content = JSON.stringify(settings, null, 2);
    await fs.writeFile(this.settingsPath, content, 'utf-8');
  }

  /**
   * Apply recommended settings
   */
  public async applyRecommendedSettings(
    categories?: string[]
  ): Promise<void> {
    const settings = await this.getSettings();
    const settingsToApply = categories
      ? RECOMMENDED_SETTINGS.filter((r) => categories.includes(r.category))
      : RECOMMENDED_SETTINGS;

    for (const recommended of settingsToApply) {
      Object.assign(settings, recommended.settings);
    }

    await this.saveSettings(settings);

    vscode.window.showInformationMessage(
      'Recommended Enzyme settings have been applied to workspace'
    );
  }

  /**
   * Get recommended settings
   */
  public getRecommendedSettings(): RecommendedSettings[] {
    return RECOMMENDED_SETTINGS;
  }

  /**
   * Check for missing recommended settings
   */
  public async getMissingRecommendedSettings(): Promise<RecommendedSettings[]> {
    const currentSettings = await this.getSettings();
    const missing: RecommendedSettings[] = [];

    for (const recommended of RECOMMENDED_SETTINGS) {
      const settingKeys = Object.keys(recommended.settings);
      const hasSome = settingKeys.some((key) => key in currentSettings);

      if (!hasSome) {
        missing.push(recommended);
      }
    }

    return missing;
  }

  /**
   * Prompt to apply recommended settings
   */
  public async promptRecommendedSettings(): Promise<void> {
    const missing = await this.getMissingRecommendedSettings();

    if (missing.length === 0) {
      return;
    }

    const result = await vscode.window.showInformationMessage(
      `Apply recommended settings for Enzyme projects? (${missing.length} categories)`,
      'Apply All',
      'Choose Categories',
      'Not Now'
    );

    if (result === 'Apply All') {
      await this.applyRecommendedSettings();
    } else if (result === 'Choose Categories') {
      const selected = await vscode.window.showQuickPick(
        missing.map((r) => ({
          label: r.category,
          description: r.description,
          picked: true,
        })),
        {
          canPickMany: true,
          placeHolder: 'Select categories to apply',
        }
      );

      if (selected && selected.length > 0) {
        await this.applyRecommendedSettings(selected.map((s) => s.label));
      }
    }
  }

  /**
   * Sync settings with user settings
   */
  public async syncWithUserSettings(keys: string[]): Promise<void> {
    const userConfig = vscode.workspace.getConfiguration();
    const workspaceSettings = await this.getSettings();

    for (const key of keys) {
      const value = userConfig.get(key);
      if (value !== undefined) {
        workspaceSettings[key] = value;
      }
    }

    await this.saveSettings(workspaceSettings);
  }

  /**
   * Export settings
   */
  public async exportSettings(filePath: string): Promise<void> {
    const settings = await this.getSettings();
    const content = JSON.stringify(settings, null, 2);
    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Import settings
   */
  public async importSettings(filePath: string): Promise<void> {
    const content = await fs.readFile(filePath, 'utf-8');
    const settings = JSON.parse(content);

    const current = await this.getSettings();
    Object.assign(current, settings);

    await this.saveSettings(current);
  }

  /**
   * Watch settings file
   */
  private watchSettings(): void {
    const pattern = new vscode.RelativePattern(
      this.workspaceFolder,
      '.vscode/settings.json'
    );

    this.watcher = vscode.workspace.createFileSystemWatcher(pattern);

    this.watcher.onDidChange(() => {
      // Settings changed externally
      console.log('Workspace settings changed');
    });
  }

  /**
   * Dispose workspace config
   */
  public dispose(): void {
    this.watcher?.dispose();
  }
}

// =============================================================================
// Multi-Root Workspace Manager
// =============================================================================

/**
 * Manages configurations for multi-root workspaces
 */
export class MultiRootWorkspaceManager {
  private configs: Map<string, WorkspaceConfig> = new Map();
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.initializeWorkspaces();
    this.watchWorkspaceChanges();
  }

  /**
   * Initialize all workspace folders
   */
  private async initializeWorkspaces(): Promise<void> {
    const folders = vscode.workspace.workspaceFolders || [];

    for (const folder of folders) {
      await this.addWorkspace(folder);
    }
  }

  /**
   * Add workspace folder
   */
  private async addWorkspace(folder: vscode.WorkspaceFolder): Promise<void> {
    const config = new WorkspaceConfig(folder);
    await config.initialize();
    this.configs.set(folder.uri.fsPath, config);
  }

  /**
   * Remove workspace folder
   */
  private removeWorkspace(folder: vscode.WorkspaceFolder): void {
    const config = this.configs.get(folder.uri.fsPath);
    if (config) {
      config.dispose();
      this.configs.delete(folder.uri.fsPath);
    }
  }

  /**
   * Watch for workspace changes
   */
  private watchWorkspaceChanges(): void {
    this.disposables.push(
      vscode.workspace.onDidChangeWorkspaceFolders((event) => {
        event.added.forEach((folder) => this.addWorkspace(folder));
        event.removed.forEach((folder) => this.removeWorkspace(folder));
      })
    );
  }

  /**
   * Get config for workspace folder
   */
  public getConfig(folder: vscode.WorkspaceFolder): WorkspaceConfig | undefined {
    return this.configs.get(folder.uri.fsPath);
  }

  /**
   * Get config for active editor
   */
  public getActiveConfig(): WorkspaceConfig | undefined {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return undefined;
    }

    const folder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
    if (!folder) {
      return undefined;
    }

    return this.getConfig(folder);
  }

  /**
   * Get all configs
   */
  public getAllConfigs(): WorkspaceConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * Apply settings to all workspaces
   */
  public async applyToAll(
    callback: (config: WorkspaceConfig) => Promise<void>
  ): Promise<void> {
    const promises = Array.from(this.configs.values()).map(callback);
    await Promise.all(promises);
  }

  /**
   * Dispose manager
   */
  public dispose(): void {
    this.configs.forEach((config) => config.dispose());
    this.configs.clear();
    this.disposables.forEach((d) => d.dispose());
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

let multiRootManager: MultiRootWorkspaceManager | null = null;

/**
 * Get multi-root workspace manager
 */
export function getMultiRootWorkspaceManager(): MultiRootWorkspaceManager {
  if (!multiRootManager) {
    multiRootManager = new MultiRootWorkspaceManager();
  }
  return multiRootManager;
}

/**
 * Get workspace config for active editor
 */
export function getActiveWorkspaceConfig(): WorkspaceConfig | undefined {
  return getMultiRootWorkspaceManager().getActiveConfig();
}

/**
 * Apply recommended settings to current workspace
 */
export async function applyRecommendedSettingsToWorkspace(): Promise<void> {
  const config = getActiveWorkspaceConfig();
  if (config) {
    await config.promptRecommendedSettings();
  }
}
