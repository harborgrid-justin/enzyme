/**
 * @file Environment Manager
 * @description Manages .env files and environment variables
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';

// =============================================================================
// Types
// =============================================================================

/**
 * Environment file type
 */
export type EnvFileType =
  | '.env'
  | '.env.local'
  | '.env.development'
  | '.env.development.local'
  | '.env.production'
  | '.env.production.local'
  | '.env.staging'
  | '.env.staging.local'
  | '.env.test'
  | '.env.test.local';

/**
 * Environment variable
 */
export interface EnvVariable {
  key: string;
  value: string;
  file: string;
  lineNumber: number;
  isSecret?: boolean;
  isReferenced?: boolean;
}

/**
 * Env file info
 */
export interface EnvFileInfo {
  path: string;
  type: EnvFileType;
  exists: boolean;
  variables: EnvVariable[];
}

/**
 * Security warning
 */
export interface SecurityWarning {
  variable: string;
  file: string;
  reason: string;
  severity: 'error' | 'warning';
  lineNumber: number;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Secret variable patterns
 */
const SECRET_PATTERNS = [
  /password/i,
  /secret/i,
  /key$/i,
  /^api_key/i,
  /token/i,
  /credential/i,
  /private/i,
  /dsn/i,
];

/**
 * Env file load order
 */
const ENV_FILE_ORDER: EnvFileType[] = [
  '.env',
  '.env.local',
  '.env.development',
  '.env.development.local',
  '.env.production',
  '.env.production.local',
  '.env.staging',
  '.env.staging.local',
  '.env.test',
  '.env.test.local',
];

// =============================================================================
// Env Manager
// =============================================================================

/**
 * Environment manager
 */
export class EnvManager {
  private variables: Map<string, EnvVariable> = new Map();
  private watchers: vscode.FileSystemWatcher[] = [];
  private listeners: Array<(variables: Map<string, EnvVariable>) => void> = [];

  constructor(private workspaceRoot: string) {}

  /**
   * Initialize and load all env files
   */
  public async initialize(): Promise<void> {
    await this.loadAllEnvFiles();
    this.watchEnvFiles();
  }

  /**
   * Load all environment files
   */
  public async loadAllEnvFiles(): Promise<void> {
    this.variables.clear();

    for (const fileType of ENV_FILE_ORDER) {
      const filePath = path.join(this.workspaceRoot, fileType);

      try {
        const variables = await this.parseEnvFile(filePath, fileType);
        variables.forEach((v) => {
          this.variables.set(v.key, v);
        });
      } catch {
        // File doesn't exist or can't be read
      }
    }

    this.notifyListeners();
  }

  /**
   * Parse environment file
   */
  private async parseEnvFile(filePath: string, fileType: EnvFileType): Promise<EnvVariable[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const variables: EnvVariable[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip comments and empty lines
      if (!line || line.startsWith('#')) {
        continue;
      }

      // Parse key=value
      const match = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (match) {
        const key = match[1];
        let value = match[2];

        // Remove quotes
        value = value.replace(/^["'](.*)["']$/, '$1');

        const variable: EnvVariable = {
          key,
          value,
          file: fileType,
          lineNumber: i + 1,
          isSecret: this.isSecretVariable(key),
          isReferenced: false,
        };

        variables.push(variable);
      }
    }

    return variables;
  }

  /**
   * Check if variable name suggests it's a secret
   */
  private isSecretVariable(key: string): boolean {
    return SECRET_PATTERNS.some((pattern) => pattern.test(key));
  }

  /**
   * Get all variables
   */
  public getVariables(): Map<string, EnvVariable> {
    return new Map(this.variables);
  }

  /**
   * Get variable by key
   */
  public getVariable(key: string): EnvVariable | undefined {
    return this.variables.get(key);
  }

  /**
   * Get variables from specific file
   */
  public getVariablesFromFile(fileType: EnvFileType): EnvVariable[] {
    return Array.from(this.variables.values()).filter((v) => v.file === fileType);
  }

  /**
   * Get all secret variables
   */
  public getSecretVariables(): EnvVariable[] {
    return Array.from(this.variables.values()).filter((v) => v.isSecret);
  }

  /**
   * Check for security warnings
   */
  public getSecurityWarnings(): SecurityWarning[] {
    const warnings: SecurityWarning[] = [];

    for (const variable of this.variables.values()) {
      // Check for exposed secrets in .env (should be in .env.local)
      if (variable.isSecret && variable.file === '.env') {
        warnings.push({
          variable: variable.key,
          file: variable.file,
          reason: 'Secret variable in .env file. Move to .env.local to avoid committing secrets',
          severity: 'error',
          lineNumber: variable.lineNumber,
        });
      }

      // Check for empty secret values
      if (variable.isSecret && !variable.value) {
        warnings.push({
          variable: variable.key,
          file: variable.file,
          reason: 'Secret variable has empty value',
          severity: 'warning',
          lineNumber: variable.lineNumber,
        });
      }

      // Check for placeholder values
      if (variable.value.includes('YOUR_') || variable.value.includes('REPLACE_')) {
        warnings.push({
          variable: variable.key,
          file: variable.file,
          reason: 'Variable appears to contain placeholder value',
          severity: 'warning',
          lineNumber: variable.lineNumber,
        });
      }
    }

    return warnings;
  }

  /**
   * Resolve variable references (e.g., ${VAR_NAME})
   */
  public resolveReferences(value: string): string {
    return value.replace(/\$\{([A-Z_][A-Z0-9_]*)\}/g, (match, key) => {
      const variable = this.variables.get(key);
      if (variable) {
        variable.isReferenced = true;
        return variable.value;
      }
      return match;
    });
  }

  /**
   * Generate .env.example file
   */
  public async generateEnvExample(): Promise<string> {
    const examplePath = path.join(this.workspaceRoot, '.env.example');
    const lines: string[] = [
      '# Environment Variables Example',
      '# Copy this file to .env.local and fill in your values',
      '',
    ];

    const baseVariables = this.getVariablesFromFile('.env');
    const grouped = this.groupVariables(baseVariables);

    for (const [group, variables] of Object.entries(grouped)) {
      lines.push(`# ${group}`);
      lines.push('');

      for (const variable of variables) {
        const value = variable.isSecret ? '' : variable.value;
        lines.push(`${variable.key}=${value}`);
      }

      lines.push('');
    }

    const content = lines.join('\n');
    await fs.writeFile(examplePath, content, 'utf-8');

    return examplePath;
  }

  /**
   * Group variables by prefix
   */
  private groupVariables(variables: EnvVariable[]): Record<string, EnvVariable[]> {
    const groups: Record<string, EnvVariable[]> = {
      App: [],
      API: [],
      Auth: [],
      Database: [],
      Monitoring: [],
      Other: [],
    };

    for (const variable of variables) {
      const key = variable.key;

      if (key.startsWith('VITE_APP_') || key.startsWith('APP_')) {
        groups['App'].push(variable);
      } else if (key.startsWith('VITE_API_') || key.startsWith('API_')) {
        groups['API'].push(variable);
      } else if (key.startsWith('VITE_AUTH_') || key.startsWith('AUTH_')) {
        groups['Auth'].push(variable);
      } else if (key.startsWith('DB_') || key.startsWith('DATABASE_')) {
        groups['Database'].push(variable);
      } else if (key.startsWith('SENTRY_') || key.startsWith('ANALYTICS_')) {
        groups['Monitoring'].push(variable);
      } else {
        groups['Other'].push(variable);
      }
    }

    // Remove empty groups
    return Object.fromEntries(
      Object.entries(groups).filter(([_, vars]) => vars.length > 0)
    );
  }

  /**
   * Add or update variable
   */
  public async setVariable(
    key: string,
    value: string,
    fileType: EnvFileType = '.env.local'
  ): Promise<void> {
    const filePath = path.join(this.workspaceRoot, fileType);

    // Read existing file or create new
    let content = '';
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch {
      content = '';
    }

    const lines = content.split('\n');
    let found = false;

    // Update existing variable
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^([A-Z_][A-Z0-9_]*)\s*=/);
      if (match && match[1] === key) {
        lines[i] = `${key}=${value}`;
        found = true;
        break;
      }
    }

    // Add new variable
    if (!found) {
      lines.push(`${key}=${value}`);
    }

    await fs.writeFile(filePath, lines.join('\n'), 'utf-8');
    await this.loadAllEnvFiles();
  }

  /**
   * Remove variable
   */
  public async removeVariable(key: string, fileType: EnvFileType): Promise<void> {
    const filePath = path.join(this.workspaceRoot, fileType);

    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    const filtered = lines.filter((line) => {
      const match = line.match(/^([A-Z_][A-Z0-9_]*)\s*=/);
      return !match || match[1] !== key;
    });

    await fs.writeFile(filePath, filtered.join('\n'), 'utf-8');
    await this.loadAllEnvFiles();
  }

  /**
   * Watch env files for changes
   */
  private watchEnvFiles(): void {
    const pattern = new vscode.RelativePattern(
      this.workspaceRoot,
      '.env*'
    );

    const watcher = vscode.workspace.createFileSystemWatcher(pattern);

    watcher.onDidChange(() => this.loadAllEnvFiles());
    watcher.onDidCreate(() => this.loadAllEnvFiles());
    watcher.onDidDelete(() => this.loadAllEnvFiles());

    this.watchers.push(watcher);
  }

  /**
   * Subscribe to variable changes
   */
  public onChange(callback: (variables: Map<string, EnvVariable>) => void): vscode.Disposable {
    this.listeners.push(callback);

    return new vscode.Disposable(() => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    });
  }

  /**
   * Notify listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.getVariables());
      } catch (error) {
        console.error('Error in env change listener:', error);
      }
    });
  }

  /**
   * Dispose manager
   */
  public dispose(): void {
    this.watchers.forEach((w) => w.dispose());
    this.watchers = [];
    this.listeners = [];
    this.variables.clear();
  }
}

// =============================================================================
// Workspace Env Manager
// =============================================================================

/**
 * Manages env for multiple workspace folders
 */
export class WorkspaceEnvManager {
  private managers: Map<string, EnvManager> = new Map();

  /**
   * Get or create manager for workspace folder
   */
  public async getManager(workspaceFolder: vscode.WorkspaceFolder): Promise<EnvManager> {
    const key = workspaceFolder.uri.fsPath;

    if (!this.managers.has(key)) {
      const manager = new EnvManager(workspaceFolder.uri.fsPath);
      await manager.initialize();
      this.managers.set(key, manager);
    }

    return this.managers.get(key)!;
  }

  /**
   * Get manager for active document
   */
  public async getActiveManager(): Promise<EnvManager | null> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return null;
    }

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
    if (!workspaceFolder) {
      return null;
    }

    return this.getManager(workspaceFolder);
  }

  /**
   * Dispose all managers
   */
  public dispose(): void {
    this.managers.forEach((m) => m.dispose());
    this.managers.clear();
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

let workspaceEnvManager: WorkspaceEnvManager | null = null;

/**
 * Get workspace env manager
 */
export function getWorkspaceEnvManager(): WorkspaceEnvManager {
  if (!workspaceEnvManager) {
    workspaceEnvManager = new WorkspaceEnvManager();
  }
  return workspaceEnvManager;
}
