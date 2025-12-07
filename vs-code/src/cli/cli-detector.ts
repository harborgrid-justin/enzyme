import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface CLIInfo {
  path: string;
  version: string;
  type: 'global' | 'local' | 'npx';
  features: Set<string>;
}

export class CLIDetector {
  private cache: CLIInfo | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 60000; // 1 minute

  /**
   * Detect the Enzyme CLI installation
   */
  async detect(forceRefresh = false): Promise<CLIInfo | null> {
    if (!forceRefresh && this.isCacheValid()) {
      return this.cache;
    }

    const workspaceRoot = this.getWorkspaceRoot();

    // Try detection strategies in order
    const strategies = [
      () => this.detectLocal(workspaceRoot),
      () => this.detectGlobal(),
      () => this.detectNpx(),
    ];

    for (const strategy of strategies) {
      try {
        const info = await strategy();
        if (info) {
          this.cache = info;
          this.cacheTimestamp = Date.now();
          return info;
        }
      } catch (error) {
        // Continue to next strategy
      }
    }

    this.cache = null;
    return null;
  }

  /**
   * Get the CLI executable path
   */
  async getExecutablePath(): Promise<string | null> {
    const info = await this.detect();
    return info?.path ?? null;
  }

  /**
   * Get the CLI version
   */
  async getVersion(): Promise<string | null> {
    const info = await this.detect();
    return info?.version ?? null;
  }

  /**
   * Check if a specific feature is supported
   */
  async supportsFeature(feature: string): Promise<boolean> {
    const info = await this.detect();
    return info?.features.has(feature) ?? false;
  }

  /**
   * Clear the detection cache
   */
  clearCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Detect local installation in node_modules
   */
  private async detectLocal(workspaceRoot: string | null): Promise<CLIInfo | null> {
    if (!workspaceRoot) {
      return null;
    }

    const localPath = path.join(workspaceRoot, 'node_modules', '.bin', 'enzyme');

    try {
      await fs.access(localPath, fs.constants.X_OK);
      const version = await this.extractVersion(localPath);
      const features = await this.detectFeatures(localPath);

      return {
        path: localPath,
        version,
        type: 'local',
        features,
      };
    } catch {
      return null;
    }
  }

  /**
   * Detect global installation
   */
  private async detectGlobal(): Promise<CLIInfo | null> {
    try {
      const { stdout } = await execAsync('which enzyme', {
        timeout: 5000,
      });

      const globalPath = stdout.trim();
      if (!globalPath) {
        return null;
      }

      const version = await this.extractVersion(globalPath);
      const features = await this.detectFeatures(globalPath);

      return {
        path: globalPath,
        version,
        type: 'global',
        features,
      };
    } catch {
      return null;
    }
  }

  /**
   * Detect npx availability
   */
  private async detectNpx(): Promise<CLIInfo | null> {
    try {
      const { stdout } = await execAsync('npx --version', {
        timeout: 5000,
      });

      if (!stdout.trim()) {
        return null;
      }

      // npx can run @enzyme/cli without installation
      const version = await this.extractVersion('npx @enzyme/cli');
      const features = await this.detectFeatures('npx @enzyme/cli');

      return {
        path: 'npx @enzyme/cli',
        version,
        type: 'npx',
        features,
      };
    } catch {
      return null;
    }
  }

  /**
   * Extract version from CLI
   */
  private async extractVersion(cliPath: string): Promise<string> {
    try {
      const { stdout } = await execAsync(`${cliPath} --version`, {
        timeout: 5000,
      });
      return stdout.trim() || '0.0.0';
    } catch {
      return '0.0.0';
    }
  }

  /**
   * Detect available features/commands
   */
  private async detectFeatures(cliPath: string): Promise<Set<string>> {
    const features = new Set<string>();

    try {
      const { stdout } = await execAsync(`${cliPath} --help`, {
        timeout: 5000,
      });

      // Parse help output for available commands
      const lines = stdout.split('\n');
      for (const line of lines) {
        const match = line.match(/^\s+(generate|add|remove|new|analyze|migrate|upgrade|docs|config|doctor)\s/);
        if (match) {
          features.add(match[1]);
        }
      }

      // Default features if parsing fails
      if (features.size === 0) {
        features.add('generate');
        features.add('add');
        features.add('remove');
        features.add('new');
      }
    } catch {
      // Assume basic features
      features.add('generate');
    }

    return features;
  }

  /**
   * Get the workspace root directory
   */
  private getWorkspaceRoot(): string | null {
    const folders = vscode.workspace.workspaceFolders;
    return folders && folders.length > 0 ? folders[0].uri.fsPath : null;
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    if (!this.cache) {
      return false;
    }
    return Date.now() - this.cacheTimestamp < this.CACHE_TTL;
  }
}
