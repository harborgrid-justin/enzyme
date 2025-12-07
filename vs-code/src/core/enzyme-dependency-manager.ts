/**
 * @file Enzyme Dependency Manager
 * @description Manages automatic installation and setup of Enzyme framework dependencies
 *
 * This module ensures proper Enzyme framework integration by:
 * - Auto-detecting missing Enzyme dependencies
 * - Installing @missionfabric-js/enzyme and related packages
 * - Validating dependency versions for compatibility
 * - Setting up required peer dependencies
 *
 * @module enzyme-dependency-manager
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { spawn } from 'child_process';
import { logger } from './logger';

/**
 * Enzyme package dependency information
 * Defines the Enzyme framework package and its required peer dependencies
 */
export interface EnzymeDependency {
  /** NPM package name */
  name: string;
  /** Minimum required version (semver format) */
  minVersion: string;
  /** Whether this is a peer dependency */
  isPeer: boolean;
  /** Whether to install as dev dependency */
  isDev: boolean;
  /** Human-readable description */
  description: string;
}

/**
 * Package manager detection result
 */
interface PackageManager {
  /** Type of package manager (npm, yarn, pnpm) */
  type: 'npm' | 'yarn' | 'pnpm';
  /** Lock file found */
  lockFile: string;
}

/**
 * Installation result
 */
export interface InstallationResult {
  /** Whether installation was successful */
  success: boolean;
  /** Packages that were installed */
  installed: string[];
  /** Packages that failed to install */
  failed: string[];
  /** Error messages */
  errors: string[];
}

/**
 * Required Enzyme framework dependencies
 * These packages are essential for Enzyme to function properly
 */
const ENZYME_DEPENDENCIES: EnzymeDependency[] = [
  {
    name: '@missionfabric-js/enzyme',
    minVersion: '^1.0.0',
    isPeer: false,
    isDev: false,
    description: 'Core Enzyme framework package',
  },
  {
    name: 'react',
    minVersion: '^18.3.1',
    isPeer: true,
    isDev: false,
    description: 'React library (Enzyme peer dependency)',
  },
  {
    name: 'react-dom',
    minVersion: '^18.3.1',
    isPeer: true,
    isDev: false,
    description: 'React DOM library (Enzyme peer dependency)',
  },
  {
    name: 'react-router-dom',
    minVersion: '^6.26.2',
    isPeer: true,
    isDev: false,
    description: 'React Router (Enzyme peer dependency)',
  },
  {
    name: '@tanstack/react-query',
    minVersion: '^5.0.0',
    isPeer: false,
    isDev: false,
    description: 'TanStack Query for data fetching',
  },
  {
    name: 'zustand',
    minVersion: '^4.5.0',
    isPeer: false,
    isDev: false,
    description: 'Zustand state management',
  },
  {
    name: 'typescript',
    minVersion: '^5.0.0',
    isPeer: false,
    isDev: true,
    description: 'TypeScript compiler',
  },
  {
    name: 'vite',
    minVersion: '^5.0.0',
    isPeer: false,
    isDev: true,
    description: 'Vite build tool',
  },
];

/**
 * Enzyme Dependency Manager
 *
 * Handles automatic detection and installation of Enzyme framework dependencies.
 * This ensures that projects using Enzyme have all required packages installed
 * and configured correctly.
 *
 * @example
 * ```typescript
 * const manager = new EnzymeDependencyManager();
 * const missing = await manager.detectMissingDependencies();
 * if (missing.length > 0) {
 *   const result = await manager.autoInstallDependencies(missing);
 *   console.log(`Installed: ${result.installed.join(', ')}`);
 * }
 * ```
 */
export class EnzymeDependencyManager {
  private workspaceRoot: string | null = null;

  /**
   * Detect missing Enzyme dependencies in the current workspace
   *
   * @returns Array of missing dependencies
   */
  async detectMissingDependencies(): Promise<EnzymeDependency[]> {
    this.workspaceRoot = this.getWorkspaceRoot();
    if (!this.workspaceRoot) {
      logger.warn('No workspace folder found');
      return [];
    }

    try {
      const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(content);

      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies,
      };

      // Filter dependencies that are missing or don't meet minimum version
      const missing = ENZYME_DEPENDENCIES.filter(dep => {
        const installedVersion = allDeps[dep.name];
        return !installedVersion || !this.satisfiesVersion(installedVersion, dep.minVersion);
      });

      logger.info(`Found ${missing.length} missing Enzyme dependencies`);
      return missing;
    } catch (error) {
      logger.error('Failed to detect missing dependencies', error);
      return [];
    }
  }

  /**
   * Auto-install missing Enzyme dependencies
   *
   * Prompts the user and installs missing dependencies using the detected package manager.
   *
   * @param dependencies - Dependencies to install
   * @param interactive - Whether to prompt user before installing
   * @returns Installation result
   */
  async autoInstallDependencies(
    dependencies: EnzymeDependency[],
    interactive = true
  ): Promise<InstallationResult> {
    if (dependencies.length === 0) {
      return {
        success: true,
        installed: [],
        failed: [],
        errors: [],
      };
    }

    // Prompt user if interactive mode
    if (interactive) {
      const depList = dependencies.map(d => `  - ${d.name} (${d.description})`).join('\n');
      const choice = await vscode.window.showInformationMessage(
        `The following Enzyme dependencies are missing:\n\n${depList}\n\nWould you like to install them now?`,
        'Install',
        'Skip'
      );

      if (choice !== 'Install') {
        logger.info('User skipped dependency installation');
        return {
          success: false,
          installed: [],
          failed: [],
          errors: ['User cancelled installation'],
        };
      }
    }

    // Detect package manager
    const packageManager = await this.detectPackageManager();
    logger.info(`Using package manager: ${packageManager.type}`);

    // Separate into production and dev dependencies
    const prodDeps = dependencies.filter(d => !d.isDev);
    const devDeps = dependencies.filter(d => d.isDev);

    const result: InstallationResult = {
      success: true,
      installed: [],
      failed: [],
      errors: [],
    };

    // Install production dependencies
    if (prodDeps.length > 0) {
      const prodResult = await this.installDependenciesWithProgress(
        prodDeps,
        packageManager.type,
        false
      );
      result.installed.push(...prodResult.installed);
      result.failed.push(...prodResult.failed);
      result.errors.push(...prodResult.errors);
    }

    // Install dev dependencies
    if (devDeps.length > 0) {
      const devResult = await this.installDependenciesWithProgress(
        devDeps,
        packageManager.type,
        true
      );
      result.installed.push(...devResult.installed);
      result.failed.push(...devResult.failed);
      result.errors.push(...devResult.errors);
    }

    result.success = result.failed.length === 0;

    // Show completion notification
    if (result.success) {
      vscode.window.showInformationMessage(
        `✓ Successfully installed ${result.installed.length} Enzyme dependencies`
      );
    } else {
      vscode.window.showErrorMessage(
        `Failed to install some dependencies. Check output for details.`
      );
    }

    return result;
  }

  /**
   * Install dependencies with progress indicator
   *
   * @param dependencies - Dependencies to install
   * @param packageManager - Package manager to use
   * @param isDev - Whether to install as dev dependencies
   * @returns Installation result
   */
  private async installDependenciesWithProgress(
    dependencies: EnzymeDependency[],
    packageManager: 'npm' | 'yarn' | 'pnpm',
    isDev: boolean
  ): Promise<InstallationResult> {
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Installing ${isDev ? 'dev ' : ''}dependencies`,
        cancellable: false,
      },
      async (progress) => {
        const result: InstallationResult = {
          success: true,
          installed: [],
          failed: [],
          errors: [],
        };

        for (let i = 0; i < dependencies.length; i++) {
          const dep = dependencies[i];
          progress.report({
            message: `${dep.name}...`,
            increment: (100 / dependencies.length),
          });

          try {
            await this.installSingleDependency(dep, packageManager, isDev);
            result.installed.push(dep.name);
            logger.info(`Installed: ${dep.name}`);
          } catch (error) {
            result.failed.push(dep.name);
            result.errors.push(`${dep.name}: ${error}`);
            logger.error(`Failed to install ${dep.name}`, error);
          }
        }

        result.success = result.failed.length === 0;
        return result;
      }
    );
  }

  /**
   * Install a single dependency using the package manager
   *
   * SECURITY: Uses spawn with shell: false to prevent command injection
   *
   * @param dependency - Dependency to install
   * @param packageManager - Package manager to use
   * @param isDev - Whether to install as dev dependency
   */
  private async installSingleDependency(
    dependency: EnzymeDependency,
    packageManager: 'npm' | 'yarn' | 'pnpm',
    isDev: boolean
  ): Promise<void> {
    if (!this.workspaceRoot) {
      throw new Error('No workspace root found');
    }

    const packageSpec = `${dependency.name}@${dependency.minVersion}`;

    return new Promise((resolve, reject) => {
      const args = this.getInstallArgs(packageManager, packageSpec, isDev);

      // SECURITY: Use shell: false to prevent command injection
      const child = spawn(packageManager, args, {
        cwd: this.workspaceRoot!,
        shell: false,
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
          resolve();
        } else {
          reject(new Error(`Installation failed with code ${code}: ${stderr}`));
        }
      });
    });
  }

  /**
   * Get installation arguments for the package manager
   *
   * @param packageManager - Package manager type
   * @param packageSpec - Package specification (name@version)
   * @param isDev - Whether to install as dev dependency
   * @returns Array of command arguments
   */
  private getInstallArgs(
    packageManager: 'npm' | 'yarn' | 'pnpm',
    packageSpec: string,
    isDev: boolean
  ): string[] {
    switch (packageManager) {
      case 'npm':
        return ['install', isDev ? '--save-dev' : '--save', packageSpec];
      case 'yarn':
        return ['add', isDev ? '--dev' : '', packageSpec].filter(Boolean);
      case 'pnpm':
        return ['add', isDev ? '--save-dev' : '--save-prod', packageSpec];
    }
  }

  /**
   * Detect package manager used in the workspace
   *
   * Checks for lock files to determine which package manager is being used.
   * Priority: pnpm > yarn > npm
   *
   * @returns Package manager information
   */
  private async detectPackageManager(): Promise<PackageManager> {
    if (!this.workspaceRoot) {
      return { type: 'npm', lockFile: 'package-lock.json' };
    }

    // Check for pnpm-lock.yaml
    try {
      await fs.access(path.join(this.workspaceRoot, 'pnpm-lock.yaml'));
      return { type: 'pnpm', lockFile: 'pnpm-lock.yaml' };
    } catch {}

    // Check for yarn.lock
    try {
      await fs.access(path.join(this.workspaceRoot, 'yarn.lock'));
      return { type: 'yarn', lockFile: 'yarn.lock' };
    } catch {}

    // Default to npm
    return { type: 'npm', lockFile: 'package-lock.json' };
  }

  /**
   * Check if installed version satisfies minimum version requirement
   *
   * This is a simplified version check. For production, consider using semver package.
   *
   * @param installed - Installed version string
   * @param required - Required version string
   * @returns Whether version is satisfied
   */
  private satisfiesVersion(installed: string, required: string): boolean {
    // Remove semver prefixes (^, ~, >, <, etc.)
    const cleanInstalled = installed.replace(/^[\^~>=<]+/, '');
    const cleanRequired = required.replace(/^[\^~>=<]+/, '');

    // Simple major.minor.patch comparison
    const installedParts = cleanInstalled.split('.').map(Number);
    const requiredParts = cleanRequired.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      const installedPart = installedParts[i] || 0;
      const requiredPart = requiredParts[i] || 0;

      if (installedPart > requiredPart) {
        return true;
      }
      if (installedPart < requiredPart) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get workspace root directory
   *
   * @returns Workspace root path or null if not found
   */
  private getWorkspaceRoot(): string | null {
    const folders = vscode.workspace.workspaceFolders;
    return folders && folders.length > 0 ? folders[0].uri.fsPath : null;
  }

  /**
   * Validate Enzyme installation
   *
   * Checks that all required Enzyme dependencies are installed and meet version requirements.
   *
   * @returns Validation result with missing dependencies
   */
  async validateEnzymeInstallation(): Promise<{
    isValid: boolean;
    missing: EnzymeDependency[];
    issues: string[];
  }> {
    const missing = await this.detectMissingDependencies();
    const issues: string[] = [];

    if (missing.length > 0) {
      issues.push(`Missing ${missing.length} required dependencies`);
      missing.forEach(dep => {
        issues.push(`  - ${dep.name}: ${dep.description}`);
      });
    }

    return {
      isValid: missing.length === 0,
      missing,
      issues,
    };
  }
}
