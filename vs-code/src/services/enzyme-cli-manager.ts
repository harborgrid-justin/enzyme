/**
 * @file Enzyme CLI Manager Service
 * @description Manages Enzyme CLI detection, installation, and version management
 *
 * This service provides:
 * - Automatic CLI detection (global, local, npx)
 * - One-click installation with progress tracking
 * - Version checking and update notifications
 * - CLI command execution with proper error handling
 * - Installation method preferences (npm, yarn, pnpm, bun)
 *
 * @author Enzyme Framework Team
 * @version 1.0.0
 */

import { spawn } from 'node:child_process';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { LoggerService } from './logger-service';
import type { EventBus } from '../orchestration/event-bus';

/**
 * SECURITY: Execute command safely using spawn with shell: false
 * This prevents command injection attacks by not using shell interpolation
 * @param command - Command to execute
 * @param args - Command arguments (passed separately for security)
 * @param options - Spawn options
 * @param options.cwd
 * @param options.timeout
 * @returns Promise resolving to stdout and stderr
 */
async function execSafe(
  command: string,
  args: string[],
  options?: { cwd?: string; timeout?: number }
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: false, // SECURITY: Never use shell to prevent injection
      cwd: options?.cwd,
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Command exited with code ${code}: ${stderr || stdout}`));
      }
    });

    // Handle timeout
    if (options?.timeout) {
      setTimeout(() => {
        child.kill();
        reject(new Error('Command timed out'));
      }, options.timeout);
    }
  });
}

/**
 * CLI installation method
 */
export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun';

/**
 * CLI detection result
 */
export interface CLIDetectionResult {
  /** Whether CLI is installed */
  installed: boolean;
  /** Installation type (global, local, npx) */
  type?: 'global' | 'local' | 'npx';
  /** Version string */
  version?: string;
  /** Path to CLI executable */
  path?: string;
  /** Package manager detected */
  packageManager?: PackageManager;
}

/**
 * CLI installation options
 */
export interface CLIInstallOptions {
  /** Package manager to use */
  packageManager?: PackageManager;
  /** Install globally vs locally */
  global?: boolean;
  /** Show progress notification */
  showProgress?: boolean;
  /** Specific version to install */
  version?: string;
}

/**
 * Enzyme CLI Manager Service
 *
 * Manages all interactions with the Enzyme CLI including:
 * - Detection and verification
 * - Installation and updates
 * - Command execution
 * - Version management
 *
 * @class EnzymeCliManager
 */
export class EnzymeCliManager {
  private static instance: EnzymeCliManager;
  private readonly logger: LoggerService;
  private readonly eventBus: EventBus;
  private detectionCache: CLIDetectionResult | null = null;
  private cacheTimestamp = 0;
  private readonly cacheTimeout = 60000; // 1 minute

  /**
   * Private constructor for singleton pattern
   * @param logger
   * @param eventBus
   */
  private constructor(logger: LoggerService, eventBus: EventBus) {
    this.logger = logger;
    this.eventBus = eventBus;
  }

  /**
   * Create or get the singleton instance
   *
   * @param logger - Logger service
   * @param eventBus - Event bus
   * @returns EnzymeCliManager instance
   */
  public static create(logger: LoggerService, eventBus: EventBus): EnzymeCliManager {
    if (!EnzymeCliManager.instance) {
      EnzymeCliManager.instance = new EnzymeCliManager(logger, eventBus);
    }
    return EnzymeCliManager.instance;
  }

  /**
   * Get singleton instance (must be created first)
   */
  public static getInstance(): EnzymeCliManager {
    if (!EnzymeCliManager.instance) {
      throw new Error('EnzymeCliManager not created. Call create() first.');
    }
    return EnzymeCliManager.instance;
  }

  /**
   * Detect Enzyme CLI installation
   *
   * Checks for CLI in the following order:
   * 1. Local installation (node_modules/.bin)
   * 2. Global installation
   * 3. npx availability
   *
   * @param forceRefresh - Force cache refresh
   * @returns Promise resolving to detection result
   */
  public async detect(forceRefresh = false): Promise<CLIDetectionResult> {
    // Check cache
    if (!forceRefresh && this.detectionCache && Date.now() - this.cacheTimestamp < this.cacheTimeout) {
      return this.detectionCache;
    }

    this.logger.info('Detecting Enzyme CLI...');

    try {
      // Try local installation first
      const localResult = await this.detectLocal();
      if (localResult.installed) {
        this.updateCache(localResult);
        return localResult;
      }

      // Try global installation
      const globalResult = await this.detectGlobal();
      if (globalResult.installed) {
        this.updateCache(globalResult);
        return globalResult;
      }

      // Check if npx is available
      const npxResult = await this.detectNpx();
      this.updateCache(npxResult);
      return npxResult;

    } catch (error) {
      this.logger.error('Error detecting Enzyme CLI', error);
      const notFoundResult: CLIDetectionResult = { installed: false };
      this.updateCache(notFoundResult);
      return notFoundResult;
    }
  }

  /**
   * Check if CLI is installed
   *
   * @returns Promise resolving to true if installed
   */
  public async isInstalled(): Promise<boolean> {
    const result = await this.detect();
    return result.installed;
  }

  /**
   * Get CLI version
   *
   * @returns Promise resolving to version string or undefined
   */
  public async getVersion(): Promise<string | undefined> {
    const result = await this.detect();
    return result.version;
  }

  /**
   * Install Enzyme CLI
   *
   * @param options - Installation options
   * @returns Promise resolving to success status
   */
  public async install(options: CLIInstallOptions = {}): Promise<boolean> {
    this.logger.info('Installing Enzyme CLI', options);

    const packageManager = options.packageManager || await this.detectPackageManager();
    const isGlobal = options.global ?? true; // Default to global
    const packageName = options.version ? `@enzymejs/cli@${options.version}` : '@enzymejs/cli';

    try {
      if (options.showProgress !== false) {
        return await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Installing Enzyme CLI',
            cancellable: false,
          },
          async (progress) => {
            progress.report({ message: 'Downloading and installing...', increment: 0 });

            const success = await this.executeInstall(packageManager, packageName, isGlobal, progress);

            if (success) {
              progress.report({ message: 'Complete!', increment: 100 });
            }

            return success;
          }
        );
      } 
        return await this.executeInstall(packageManager, packageName, isGlobal);
      
    } catch (error) {
      this.logger.error('Error installing Enzyme CLI', error);
      await vscode.window.showErrorMessage(
        `Failed to install Enzyme CLI: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  /**
   * Execute the actual installation
   *
   * @param packageManager - Package manager to use
   * @param packageName - Package name with optional version
   * @param isGlobal - Install globally
   * @param progress - Optional progress reporter
   * @returns Promise resolving to success status
   * @private
   */
  private async executeInstall(
    packageManager: PackageManager,
    packageName: string,
    isGlobal: boolean,
    progress?: vscode.Progress<{ message?: string; increment?: number }>
  ): Promise<boolean> {
    // SECURITY: Build command and args separately to prevent injection
    const commandArgs: Record<PackageManager, { cmd: string; args: string[] }> = {
      npm: {
        cmd: 'npm',
        args: ['install', isGlobal ? '-g' : '--save-dev', packageName],
      },
      yarn: {
        cmd: 'yarn',
        args: isGlobal ? ['global', 'add', packageName] : ['add', '-D', packageName],
      },
      pnpm: {
        cmd: 'pnpm',
        args: isGlobal ? ['add', '-g', packageName] : ['add', '-D', packageName],
      },
      bun: {
        cmd: 'bun',
        args: isGlobal ? ['add', '-g', packageName] : ['add', '-D', packageName],
      },
    };

    const { cmd, args } = commandArgs[packageManager];
    this.logger.info(`Executing: ${cmd} ${args.join(' ')}`);

    if (progress) {
      progress.report({ message: `Using ${packageManager}...`, increment: 20 });
    }

    try {
      const workspacePath = this.getWorkspacePath();
      const { stdout, stderr } = await execSafe(cmd, args, {
        ...(workspacePath ? { cwd: workspacePath } : {}),
      });

      if (progress) {
        progress.report({ message: 'Verifying installation...', increment: 80 });
      }

      this.logger.info('CLI installation output:', stdout);
      if (stderr) {
        this.logger.warn('CLI installation warnings:', stderr);
      }

      // Verify installation
      this.detectionCache = null; // Clear cache
      const detection = await this.detect(true);

      if (detection.installed) {
        this.logger.success(`Enzyme CLI installed successfully (version ${detection.version})`);
        this.eventBus.emit({ type: 'cli:installed', payload: detection });

        await vscode.window.showInformationMessage(
          `🎉 Enzyme CLI v${detection.version} installed successfully!`,
          'Get Started'
        ).then(selection => {
          if (selection === 'Get Started') {
            vscode.commands.executeCommand('enzyme.panel.showSetupWizard');
          }
        });

        return true;
      } 
        throw new Error('Installation completed but CLI not detected');
      
    } catch (error) {
      this.logger.error('Installation failed', error);
      throw error;
    }
  }

  /**
   * Update Enzyme CLI to latest version
   *
   * @returns Promise resolving to success status
   */
  public async update(): Promise<boolean> {
    this.logger.info('Updating Enzyme CLI');

    const detection = await this.detect();
    if (!detection.installed) {
      await vscode.window.showErrorMessage('Enzyme CLI is not installed');
      return false;
    }

    const packageManager = detection.packageManager || await this.detectPackageManager();
    const isGlobal = detection.type === 'global';

    return await this.install({
      packageManager,
      global: isGlobal,
      showProgress: true,
    });
  }

  /**
   * Execute a CLI command
   * SECURITY: Uses spawn with shell: false to prevent command injection
   *
   * @param args - Command arguments
   * @param cwd - Working directory
   * @returns Promise resolving to command output
   */
  public async execute(args: string[], cwd?: string): Promise<{ stdout: string; stderr: string }> {
    const detection = await this.detect();

    if (!detection.installed) {
      throw new Error('Enzyme CLI is not installed');
    }

    // SECURITY: Build command and args separately
    const { cmd, cmdArgs } = this.buildCliCommandArgs(detection);
    const allArgs = [...cmdArgs, ...args];

    this.logger.info(`Executing CLI command: ${cmd} ${allArgs.join(' ')}`);

    try {
      const workDir = cwd || this.getWorkspacePath();
      const result = await execSafe(cmd, allArgs, {
        ...(workDir ? { cwd: workDir } : {}),
      });

      this.logger.info('CLI command output:', result.stdout);
      if (result.stderr) {
        this.logger.warn('CLI command errors:', result.stderr);
      }

      return result;
    } catch (error) {
      this.logger.error('CLI command failed', error);
      throw error;
    }
  }

  /**
   * Show CLI version information
   */
  public async showVersion(): Promise<void> {
    const detection = await this.detect();

    if (!detection.installed) {
      await vscode.window.showInformationMessage(
        'Enzyme CLI is not installed',
        'Install Now'
      ).then(selection => {
        if (selection === 'Install Now') {
          this.install({ showProgress: true });
        }
      });
      return;
    }

    const message = `
Enzyme CLI Information:
- Version: ${detection.version || 'unknown'}
- Type: ${detection.type || 'unknown'}
- Path: ${detection.path || 'not found'}
- Package Manager: ${detection.packageManager || 'unknown'}
    `.trim();

    await vscode.window.showInformationMessage(message, 'Update', 'Dismiss');
  }

  /**
   * Detect local CLI installation
   * SECURITY: Uses spawn with shell: false to prevent command injection
   *
   * @returns Promise resolving to detection result
   * @private
   */
  private async detectLocal(): Promise<CLIDetectionResult> {
    const workspacePath = this.getWorkspacePath();
    if (!workspacePath) {
      return { installed: false };
    }

    const localPath = path.join(workspacePath, 'node_modules', '.bin', 'enzyme');

    try {
      // SECURITY: Pass path and args separately
      const { stdout } = await execSafe(localPath, ['--version'], {
        cwd: workspacePath,
        timeout: 5000,
      });
      const version = stdout.trim();

      this.logger.info(`Local CLI detected: v${version}`);

      return {
        installed: true,
        type: 'local',
        version,
        path: localPath,
        packageManager: await this.detectPackageManager(),
      };
    } catch {
      return { installed: false };
    }
  }

  /**
   * Detect global CLI installation
   * SECURITY: Uses spawn with shell: false to prevent command injection
   *
   * @returns Promise resolving to detection result
   * @private
   */
  private async detectGlobal(): Promise<CLIDetectionResult> {
    try {
      // SECURITY: Pass command and args separately
      const { stdout: versionOutput } = await execSafe('enzyme', ['--version'], {
        timeout: 5000,
      });
      const version = versionOutput.trim();

      // SECURITY: Use platform-specific command with separate args
      const whichCmd = process.platform === 'win32' ? 'where' : 'which';
      const { stdout: pathOutput } = await execSafe(whichCmd, ['enzyme'], {
        timeout: 5000,
      });
      const cliPath = pathOutput.trim().split('\n')[0];

      this.logger.info(`Global CLI detected: v${version} at ${cliPath ?? 'unknown'}`);

      const result: CLIDetectionResult = {
        installed: true,
        type: 'global',
        version,
        packageManager: await this.detectPackageManager(),
      };

      if (cliPath) {
        result.path = cliPath;
      }

      return result;
    } catch {
      return { installed: false };
    }
  }

  /**
   * Detect npx availability
   * SECURITY: Uses spawn with shell: false to prevent command injection
   *
   * @returns Promise resolving to detection result
   * @private
   */
  private async detectNpx(): Promise<CLIDetectionResult> {
    try {
      // SECURITY: Pass command and args separately
      await execSafe('npx', ['--version'], { timeout: 5000 });

      this.logger.info('npx detected, Enzyme CLI can be run via npx');

      return {
        installed: true,
        type: 'npx',
        version: 'latest',
        packageManager: 'npm',
      };
    } catch {
      return { installed: false };
    }
  }

  /**
   * Detect available package manager
   * SECURITY: Uses spawn with shell: false to prevent command injection
   *
   * Checks in order: bun, pnpm, yarn, npm
   *
   * @returns Promise resolving to package manager
   * @private
   */
  private async detectPackageManager(): Promise<PackageManager> {
    const managers: PackageManager[] = ['bun', 'pnpm', 'yarn', 'npm'];

    for (const manager of managers) {
      try {
        // SECURITY: Pass command and args separately
        await execSafe(manager, ['--version'], { timeout: 5000 });
        this.logger.info(`Package manager detected: ${manager}`);
        return manager;
      } catch {
        // Try next
      }
    }

    // Default to npm
    return 'npm';
  }

  /**
   * Build CLI command and args separately for secure execution
   * SECURITY: Returns command and args separately to prevent shell injection
   *
   * @param detection - Detection result
   * @returns Object with cmd and args array
   * @private
   */
  private buildCliCommandArgs(detection: CLIDetectionResult): { cmd: string; cmdArgs: string[] } {
    if (detection.type === 'npx') {
      return {
        cmd: 'npx',
        cmdArgs: ['@enzymejs/cli'],
      };
    }

    return {
      cmd: detection.path || 'enzyme',
      cmdArgs: [],
    };
  }

  /**
   * Get workspace path
   *
   * @returns Workspace path or undefined
   * @private
   */
  private getWorkspacePath(): string | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  }

  /**
   * Update detection cache
   *
   * @param result - Detection result
   * @private
   */
  private updateCache(result: CLIDetectionResult): void {
    this.detectionCache = result;
    this.cacheTimestamp = Date.now();
  }

  /**
   * Clear detection cache
   */
  public clearCache(): void {
    this.detectionCache = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    this.clearCache();
    this.logger.info('EnzymeCliManager disposed');
  }
}
