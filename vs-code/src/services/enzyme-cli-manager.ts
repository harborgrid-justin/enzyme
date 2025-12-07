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

import * as vscode from 'vscode';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { LoggerService } from './logger-service';
import { EventBus } from '../orchestration/event-bus';

const execAsync = promisify(exec);

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
      } else {
        return await this.executeInstall(packageManager, packageName, isGlobal);
      }
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
    const commands: Record<PackageManager, string> = {
      npm: `npm install ${isGlobal ? '-g' : '--save-dev'} ${packageName}`,
      yarn: `yarn ${isGlobal ? 'global add' : 'add -D'} ${packageName}`,
      pnpm: `pnpm ${isGlobal ? 'add -g' : 'add -D'} ${packageName}`,
      bun: `bun ${isGlobal ? 'add -g' : 'add -D'} ${packageName}`,
    };

    const command = commands[packageManager];
    this.logger.info(`Executing: ${command}`);

    if (progress) {
      progress.report({ message: `Using ${packageManager}...`, increment: 20 });
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.getWorkspacePath(),
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
        this.eventBus.emit('cli:installed', detection);

        await vscode.window.showInformationMessage(
          `🎉 Enzyme CLI v${detection.version} installed successfully!`,
          'Get Started'
        ).then(selection => {
          if (selection === 'Get Started') {
            vscode.commands.executeCommand('enzyme.panel.showSetupWizard');
          }
        });

        return true;
      } else {
        throw new Error('Installation completed but CLI not detected');
      }
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

    const cliCommand = this.buildCliCommand(detection);
    const command = `${cliCommand} ${args.join(' ')}`;

    this.logger.info(`Executing CLI command: ${command}`);

    try {
      const result = await execAsync(command, {
        cwd: cwd || this.getWorkspacePath(),
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
      const { stdout } = await execAsync(`"${localPath}" --version`, { cwd: workspacePath });
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
   *
   * @returns Promise resolving to detection result
   * @private
   */
  private async detectGlobal(): Promise<CLIDetectionResult> {
    try {
      const { stdout: versionOutput } = await execAsync('enzyme --version');
      const version = versionOutput.trim();

      const { stdout: pathOutput } = await execAsync(
        process.platform === 'win32' ? 'where enzyme' : 'which enzyme'
      );
      const cliPath = pathOutput.trim().split('\n')[0];

      this.logger.info(`Global CLI detected: v${version} at ${cliPath}`);

      return {
        installed: true,
        type: 'global',
        version,
        path: cliPath,
        packageManager: await this.detectPackageManager(),
      };
    } catch {
      return { installed: false };
    }
  }

  /**
   * Detect npx availability
   *
   * @returns Promise resolving to detection result
   * @private
   */
  private async detectNpx(): Promise<CLIDetectionResult> {
    try {
      await execAsync('npx --version');

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
        await execAsync(`${manager} --version`);
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
   * Build CLI command based on detection result
   *
   * @param detection - Detection result
   * @returns CLI command string
   * @private
   */
  private buildCliCommand(detection: CLIDetectionResult): string {
    if (detection.type === 'npx') {
      return 'npx @enzymejs/cli';
    }

    return detection.path || 'enzyme';
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
