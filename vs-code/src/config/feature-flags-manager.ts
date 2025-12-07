/**
 * @file Feature Flags Manager
 * @description Manages feature flags for the Enzyme VS Code extension
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';

// =============================================================================
// Types
// =============================================================================

/**
 * Feature flag definition
 */
export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description?: string;
  rolloutPercentage?: number;
  variants?: Record<string, unknown>;
  override?: boolean;
}

/**
 * Feature flag context for evaluation
 */
export interface FlagContext {
  userId?: string;
  environment?: string;
  version?: string;
  custom?: Record<string, unknown>;
}

/**
 * Flag evaluation result
 */
export interface FlagEvaluationResult {
  enabled: boolean;
  variant?: string;
  source: 'config' | 'override' | 'remote' | 'default';
}

/**
 * Flag audit entry
 */
export interface FlagAuditEntry {
  timestamp: Date;
  flag: string;
  action: 'toggle' | 'override' | 'evaluate';
  value: boolean;
  context?: FlagContext;
  user?: string;
}

// =============================================================================
// Feature Flags Manager
// =============================================================================

/**
 * Feature flags manager
 */
export class FeatureFlagsManager {
  private flags: Map<string, FeatureFlag> = new Map();
  private overrides: Map<string, boolean> = new Map();
  private auditLog: FlagAuditEntry[] = [];
  private listeners: Array<(flags: Map<string, FeatureFlag>) => void> = [];
  private remoteUrl?: string;
  private pollInterval?: NodeJS.Timeout;

  constructor(private workspaceRoot: string) {}

  /**
   * Initialize feature flags
   */
  public async initialize(): Promise<void> {
    await this.loadFlags();
    await this.loadOverrides();
  }

  /**
   * Load flags from project config
   */
  private async loadFlags(): Promise<void> {
    try {
      const configPath = path.join(this.workspaceRoot, 'enzyme.config.ts');
      const content = await fs.readFile(configPath, 'utf-8');

      // Parse flags from config (simplified)
      const flagsMatch = content.match(/features:\s*{[\s\S]*?flags:\s*\[([\s\S]*?)\]/);
      if (flagsMatch) {
        // In production, use proper TS parser
        const flagsStr = flagsMatch[1];
        const flags = this.parseFlagsString(flagsStr);
        flags.forEach((flag) => this.flags.set(flag.key, flag));
      }

      this.notifyListeners();
    } catch (error) {
      console.error('Failed to load feature flags:', error);
    }
  }

  /**
   * Parse flags string (simplified parser)
   */
  private parseFlagsString(str: string): FeatureFlag[] {
    const flags: FeatureFlag[] = [];

    // Very simple parsing - in production use proper parser
    const flagMatches = str.matchAll(/{\s*key:\s*['"]([^'"]+)['"]\s*,\s*enabled:\s*(true|false)/g);

    for (const match of flagMatches) {
      flags.push({
        key: match[1],
        enabled: match[2] === 'true',
      });
    }

    return flags;
  }

  /**
   * Load overrides from workspace state
   */
  private async loadOverrides(): Promise<void> {
    try {
      const overridesPath = path.join(this.workspaceRoot, '.vscode', 'enzyme-flags.json');
      const content = await fs.readFile(overridesPath, 'utf-8');
      const overrides = JSON.parse(content) as Record<string, boolean>;

      this.overrides.clear();
      Object.entries(overrides).forEach(([key, value]) => {
        this.overrides.set(key, value);
      });
    } catch {
      // No overrides file, that's OK
    }
  }

  /**
   * Save overrides to workspace
   */
  private async saveOverrides(): Promise<void> {
    try {
      const vscodePath = path.join(this.workspaceRoot, '.vscode');
      await fs.mkdir(vscodePath, { recursive: true });

      const overridesPath = path.join(vscodePath, 'enzyme-flags.json');
      const overrides = Object.fromEntries(this.overrides);

      await fs.writeFile(overridesPath, JSON.stringify(overrides, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save flag overrides:', error);
    }
  }

  /**
   * Get all flags
   */
  public getFlags(): Map<string, FeatureFlag> {
    return new Map(this.flags);
  }

  /**
   * Get flag by key
   */
  public getFlag(key: string): FeatureFlag | undefined {
    return this.flags.get(key);
  }

  /**
   * Evaluate flag with context
   */
  public evaluateFlag(key: string, context?: FlagContext): FlagEvaluationResult {
    // Check override first
    if (this.overrides.has(key)) {
      this.addAuditEntry({
        timestamp: new Date(),
        flag: key,
        action: 'evaluate',
        value: this.overrides.get(key)!,
        context,
      });

      return {
        enabled: this.overrides.get(key)!,
        source: 'override',
      };
    }

    // Check config
    const flag = this.flags.get(key);
    if (flag) {
      let enabled = flag.enabled;

      // Apply rollout percentage
      if (flag.rolloutPercentage !== undefined && context?.userId) {
        const hash = this.hashString(context.userId + key);
        enabled = (hash % 100) < flag.rolloutPercentage;
      }

      this.addAuditEntry({
        timestamp: new Date(),
        flag: key,
        action: 'evaluate',
        value: enabled,
        context,
      });

      return {
        enabled,
        source: 'config',
      };
    }

    // Default to false
    return {
      enabled: false,
      source: 'default',
    };
  }

  /**
   * Check if flag is enabled
   */
  public isEnabled(key: string, context?: FlagContext): boolean {
    return this.evaluateFlag(key, context).enabled;
  }

  /**
   * Toggle flag override
   */
  public async toggleOverride(key: string): Promise<void> {
    const currentValue = this.overrides.get(key);
    const newValue = currentValue === undefined
      ? !(this.flags.get(key)?.enabled ?? false)
      : !currentValue;

    this.overrides.set(key, newValue);

    await this.saveOverrides();
    this.notifyListeners();

    this.addAuditEntry({
      timestamp: new Date(),
      flag: key,
      action: 'toggle',
      value: newValue,
    });
  }

  /**
   * Set flag override
   */
  public async setOverride(key: string, value: boolean): Promise<void> {
    this.overrides.set(key, value);

    await this.saveOverrides();
    this.notifyListeners();

    this.addAuditEntry({
      timestamp: new Date(),
      flag: key,
      action: 'override',
      value,
    });
  }

  /**
   * Clear flag override
   */
  public async clearOverride(key: string): Promise<void> {
    this.overrides.delete(key);

    await this.saveOverrides();
    this.notifyListeners();
  }

  /**
   * Clear all overrides
   */
  public async clearAllOverrides(): Promise<void> {
    this.overrides.clear();

    await this.saveOverrides();
    this.notifyListeners();
  }

  /**
   * Get all overrides
   */
  public getOverrides(): Map<string, boolean> {
    return new Map(this.overrides);
  }

  /**
   * Enable preview mode (override all flags to true)
   */
  public async enablePreviewMode(): Promise<void> {
    for (const key of this.flags.keys()) {
      this.overrides.set(key, true);
    }

    await this.saveOverrides();
    this.notifyListeners();
  }

  /**
   * Disable preview mode (clear all overrides)
   */
  public async disablePreviewMode(): Promise<void> {
    await this.clearAllOverrides();
  }

  /**
   * Sync with remote flag service
   */
  public async syncWithRemote(url: string): Promise<void> {
    this.remoteUrl = url;

    try {
      // In production, make actual HTTP request
      // For now, just a placeholder
      console.log('Syncing flags with:', url);

      // Example: const response = await fetch(url);
      // const remoteFlags = await response.json();
      // Update local flags with remote data

      this.notifyListeners();
    } catch (error) {
      console.error('Failed to sync with remote:', error);
      throw error;
    }
  }

  /**
   * Start polling remote service
   */
  public startRemotePolling(url: string, intervalMs: number = 60000): void {
    this.stopRemotePolling();

    this.pollInterval = setInterval(async () => {
      try {
        await this.syncWithRemote(url);
      } catch (error) {
        console.error('Remote polling error:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop polling remote service
   */
  public stopRemotePolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = undefined;
    }
  }

  /**
   * Get audit log
   */
  public getAuditLog(limit?: number): FlagAuditEntry[] {
    const log = [...this.auditLog].reverse();
    return limit ? log.slice(0, limit) : log;
  }

  /**
   * Clear audit log
   */
  public clearAuditLog(): void {
    this.auditLog = [];
  }

  /**
   * Export audit log
   */
  public async exportAuditLog(filePath: string): Promise<void> {
    const content = JSON.stringify(this.auditLog, null, 2);
    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Add audit entry
   */
  private addAuditEntry(entry: FlagAuditEntry): void {
    this.auditLog.push(entry);

    // Keep only last 1000 entries
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }
  }

  /**
   * Hash string for consistent rollout
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Subscribe to flag changes
   */
  public onChange(callback: (flags: Map<string, FeatureFlag>) => void): vscode.Disposable {
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
        listener(this.getFlags());
      } catch (error) {
        console.error('Error in flag change listener:', error);
      }
    });
  }

  /**
   * Dispose manager
   */
  public dispose(): void {
    this.stopRemotePolling();
    this.listeners = [];
    this.flags.clear();
    this.overrides.clear();
  }
}

// =============================================================================
// Workspace Feature Flags Manager
// =============================================================================

/**
 * Manages feature flags for multiple workspace folders
 */
export class WorkspaceFeatureFlagsManager {
  private managers: Map<string, FeatureFlagsManager> = new Map();

  /**
   * Get or create manager for workspace folder
   */
  public async getManager(workspaceFolder: vscode.WorkspaceFolder): Promise<FeatureFlagsManager> {
    const key = workspaceFolder.uri.fsPath;

    if (!this.managers.has(key)) {
      const manager = new FeatureFlagsManager(workspaceFolder.uri.fsPath);
      await manager.initialize();
      this.managers.set(key, manager);
    }

    return this.managers.get(key)!;
  }

  /**
   * Get manager for active document
   */
  public async getActiveManager(): Promise<FeatureFlagsManager | null> {
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

let workspaceFlagsManager: WorkspaceFeatureFlagsManager | null = null;

/**
 * Get workspace feature flags manager
 */
export function getWorkspaceFeatureFlagsManager(): WorkspaceFeatureFlagsManager {
  if (!workspaceFlagsManager) {
    workspaceFlagsManager = new WorkspaceFeatureFlagsManager();
  }
  return workspaceFlagsManager;
}
