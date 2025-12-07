/**
 * @file Environment Manager
 * @description Manages .env files and environment variables
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';

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
export interface EnvironmentVariable {
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
export interface EnvironmentFileInfo {
  path: string;
  type: EnvFileType;
  exists: boolean;
  variables: EnvironmentVariable[];
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
  private readonly variables = new Map<string, EnvironmentVariable>();
  private watchers: vscode.FileSystemWatcher[] = [];
  private listeners: Array<(variables: Map<string, EnvironmentVariable>) => void> = [];

  /**
   *
   * @param workspaceRoot
   */
  constructor(private readonly workspaceRoot: string) {}

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
   * @param filePath
   * @param fileType
   */
  private async parseEnvFile(filePath: string, fileType: EnvFileType): Promise<EnvironmentVariable[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const variables: EnvironmentVariable[] = [];

    for (let i = 0; i < lines.length; i++) {
      const currentLine = lines[i];
      if (!currentLine) {
        continue;
      }
      const line = currentLine.trim();

      // Skip comments and empty lines
      if (!line || line.startsWith('#')) {
        continue;
      }

      // Parse key=value
      const match = /^([A-Z_][\dA-Z_]*)\s*=\s*(.*)$/.exec(line);
      if (match && match[1]) {
        const key = match[1];
        let value = match[2];

        // Remove quotes
        if (value) {
          value = value.replace(/^["'](.*)["']$/, '$1');
        } else {
          value = '';
        }

        const variable: EnvironmentVariable = {
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
   * @param key
   */
  private isSecretVariable(key: string): boolean {
    return SECRET_PATTERNS.some((pattern) => pattern.test(key));
  }

  /**
   * Get all variables
   */
  public getVariables(): Map<string, EnvironmentVariable> {
    return new Map(this.variables);
  }

  /**
   * Get variable by key
   * @param key
   */
  public getVariable(key: string): EnvironmentVariable | undefined {
    return this.variables.get(key);
  }

  /**
   * Get variables from specific file
   * @param fileType
   */
  public getVariablesFromFile(fileType: EnvFileType): EnvironmentVariable[] {
    return [...this.variables.values()].filter((v) => v.file === fileType);
  }

  /**
   * Get all secret variables
   */
  public getSecretVariables(): EnvironmentVariable[] {
    return [...this.variables.values()].filter((v) => v.isSecret);
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
   * @param value
   */
  public resolveReferences(value: string): string {
    return value.replace(/\${([A-Z_][\dA-Z_]*)}/g, (match, key) => {
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
   * @param variables
   */
  private groupVariables(variables: EnvironmentVariable[]): Record<string, EnvironmentVariable[]> {
    const groups: Record<string, EnvironmentVariable[]> = {
      App: [],
      API: [],
      Auth: [],
      Database: [],
      Monitoring: [],
      Other: [],
    };

    for (const variable of variables) {
      const {key} = variable;

      if (key.startsWith('VITE_APP_') || key.startsWith('APP_')) {
        groups['App']?.push(variable);
      } else if (key.startsWith('VITE_API_') || key.startsWith('API_')) {
        groups['API']?.push(variable);
      } else if (key.startsWith('VITE_AUTH_') || key.startsWith('AUTH_')) {
        groups['Auth']?.push(variable);
      } else if (key.startsWith('DB_') || key.startsWith('DATABASE_')) {
        groups['Database']?.push(variable);
      } else if (key.startsWith('SENTRY_') || key.startsWith('ANALYTICS_')) {
        groups['Monitoring']?.push(variable);
      } else {
        groups['Other']?.push(variable);
      }
    }

    // Remove empty groups
    return Object.fromEntries(
      Object.entries(groups).filter(([_, variables_]) => variables_.length > 0)
    );
  }

  /**
   * Add or update variable
   * @param key
   * @param value
   * @param fileType
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
      const currentLine = lines[i];
      if (currentLine !== undefined) {
        const match = /^([A-Z_][\dA-Z_]*)\s*=/.exec(currentLine);
        if (match?.[1] === key) {
          lines[i] = `${key}=${value}`;
          found = true;
          break;
        }
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
   * @param key
   * @param fileType
   */
  public async removeVariable(key: string, fileType: EnvFileType): Promise<void> {
    const filePath = path.join(this.workspaceRoot, fileType);

    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    const filtered = lines.filter((line) => {
      const match = /^([A-Z_][\dA-Z_]*)\s*=/.exec(line);
      return match?.[1] !== key;
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

    watcher.onDidChange(async () => this.loadAllEnvFiles());
    watcher.onDidCreate(async () => this.loadAllEnvFiles());
    watcher.onDidDelete(async () => this.loadAllEnvFiles());

    this.watchers.push(watcher);
  }

  /**
   * Subscribe to variable changes
   * @param callback
   */
  public onChange(callback: (variables: Map<string, EnvironmentVariable>) => void): vscode.Disposable {
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
  private readonly managers = new Map<string, EnvManager>();

  /**
   * Get or create manager for workspace folder
   * @param workspaceFolder
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

let workspaceEnvironmentManager: WorkspaceEnvManager | null = null;

/**
 * Get workspace env manager
 */
export function getWorkspaceEnvManager(): WorkspaceEnvManager {
  if (!workspaceEnvironmentManager) {
    workspaceEnvironmentManager = new WorkspaceEnvManager();
  }
  return workspaceEnvironmentManager;
}
