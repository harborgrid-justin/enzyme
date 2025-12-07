import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { spawn } from 'child_process';

/**
 * SECURITY: Execute command safely using spawn with shell: false
 * This prevents command injection attacks by not using shell interpolation
 */
async function execSafe(command: string, args: string[], timeout = 5000): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: false, // SECURITY: Never use shell: true to prevent injection
      timeout,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Command exited with code ${code}`));
      }
    });

    // Handle timeout
    setTimeout(() => {
      child.kill();
      reject(new Error('Command timed out'));
    }, timeout);
  });
}

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
   * SECURITY: Uses execSafe with shell: false to prevent command injection
   */
  private async detectGlobal(): Promise<CLIInfo | null> {
    try {
      // SECURITY: Use 'which' command with no shell interpolation
      const { stdout } = await execSafe('which', ['enzyme']);

      const globalPath = stdout.trim();
      if (!globalPath) {
        return null;
      }

      // SECURITY: Validate the path is a real file path before using
      if (!this.isValidExecutablePath(globalPath)) {
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
   * SECURITY: Validate that a path looks like a legitimate executable path
   * This prevents path traversal and injection attacks
   */
  private isValidExecutablePath(pathStr: string): boolean {
    // Must be an absolute path
    if (!path.isAbsolute(pathStr)) {
      return false;
    }

    // No shell metacharacters allowed
    const shellMetaChars = /[;&|`$(){}[\]<>!#*?~\\'"]/;
    if (shellMetaChars.test(pathStr)) {
      return false;
    }

    // No path traversal
    if (pathStr.includes('..')) {
      return false;
    }

    // Basic path format check
    if (!/^[/a-zA-Z0-9._-]+$/.test(pathStr)) {
      return false;
    }

    return true;
  }

  /**
   * Detect npx availability
   * SECURITY: Uses execSafe with shell: false to prevent command injection
   */
  private async detectNpx(): Promise<CLIInfo | null> {
    try {
      // SECURITY: Use npx command with arguments passed separately
      const { stdout } = await execSafe('npx', ['--version']);

      if (!stdout.trim()) {
        return null;
      }

      // npx can run @enzyme/cli without installation
      const version = await this.extractVersionNpx();
      const features = await this.detectFeaturesNpx();

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
   * Extract version using npx (separate method for security)
   */
  private async extractVersionNpx(): Promise<string> {
    try {
      const { stdout } = await execSafe('npx', ['@enzyme/cli', '--version']);
      return stdout.trim() || '0.0.0';
    } catch {
      return '0.0.0';
    }
  }

  /**
   * Detect features using npx (separate method for security)
   */
  private async detectFeaturesNpx(): Promise<Set<string>> {
    const features = new Set<string>();

    try {
      const { stdout } = await execSafe('npx', ['@enzyme/cli', '--help']);

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
      features.add('generate');
    }

    return features;
  }

  /**
   * Extract version from CLI
   * SECURITY: Uses validated path with execSafe to prevent command injection
   */
  private async extractVersion(cliPath: string): Promise<string> {
    try {
      // SECURITY: Validate the path before execution
      if (!this.isValidExecutablePath(cliPath)) {
        return '0.0.0';
      }

      // SECURITY: Pass arguments separately, never interpolate
      const { stdout } = await execSafe(cliPath, ['--version']);
      return stdout.trim() || '0.0.0';
    } catch {
      return '0.0.0';
    }
  }

  /**
   * Detect available features/commands
   * SECURITY: Uses validated path with execSafe to prevent command injection
   */
  private async detectFeatures(cliPath: string): Promise<Set<string>> {
    const features = new Set<string>();

    try {
      // SECURITY: Validate the path before execution
      if (!this.isValidExecutablePath(cliPath)) {
        features.add('generate');
        return features;
      }

      // SECURITY: Pass arguments separately, never interpolate
      const { stdout } = await execSafe(cliPath, ['--help']);

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
