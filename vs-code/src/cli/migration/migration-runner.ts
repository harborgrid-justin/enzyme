import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { CLIRunner } from '../cli-runner';

/**
 *
 */
export interface Migration {
  version: string;
  name: string;
  description: string;
  breaking: boolean;
}

/**
 *
 */
export interface MigrationResult {
  success: boolean;
  version: string;
  changes: string[];
  errors: string[];
}

/**
 *
 */
export class MigrationRunner {
  /**
   *
   * @param cliRunner
   */
  constructor(private readonly cliRunner: CLIRunner) {}

  /**
   * Detect current Enzyme version
   */
  async detectCurrentVersion(): Promise<string | null> {
    const workspaceRoot = this.getWorkspaceRoot();
    if (!workspaceRoot) {
      return null;
    }

    try {
      const packageJsonPath = path.join(workspaceRoot, 'package.json');
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(content);

      return (
        packageJson.dependencies?.['@enzyme/core'] ||
        packageJson.devDependencies?.['@enzyme/core'] ||
        null
      );
    } catch {
      return null;
    }
  }

  /**
   * Get available migrations
   */
  async getAvailableMigrations(): Promise<Migration[]> {
    try {
      const result = await this.cliRunner.runJSON<{ migrations: Migration[] }>({
        args: ['migrate', '--list'],
        timeout: 10000,
      });

      return result.migrations || [];
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to fetch migrations: ${error}`);
      return [];
    }
  }

  /**
   * Run migration to specific version
   * @param targetVersion
   * @param options
   * @param options.dryRun
   * @param options.force
   */
  async migrate(
    targetVersion?: string,
    options: {
      dryRun?: boolean;
      force?: boolean;
    } = {}
  ): Promise<MigrationResult | null> {
    const currentVersion = await this.detectCurrentVersion();
    if (!currentVersion) {
      vscode.window.showErrorMessage('Could not detect current Enzyme version');
      return null;
    }

    // Get available migrations
    const migrations = await this.getAvailableMigrations();
    if (migrations.length === 0) {
      vscode.window.showInformationMessage('No migrations available');
      return null;
    }

    // If no target version specified, show picker
    if (!targetVersion) {
      const choice = await vscode.window.showQuickPick(
        migrations.map((m) => ({
          label: m.version,
          description: m.name,
          detail: m.description + (m.breaking ? ' (BREAKING)' : ''),
          migration: m,
        })),
        { placeHolder: 'Select target version' }
      );

      if (!choice) {
        return null;
      }

      targetVersion = choice.migration.version;
    }

    // Show warning for breaking changes
    const targetMigration = migrations.find((m) => m.version === targetVersion);
    if (targetMigration?.breaking) {
      const confirm = await vscode.window.showWarningMessage(
        `Migration to ${targetVersion} contains BREAKING CHANGES. Continue?`,
        { modal: true },
        'Yes',
        'No'
      );

      if (confirm !== 'Yes') {
        return null;
      }
    }

    // Run migration with progress
    return await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Migrating to Enzyme ${targetVersion}`,
        cancellable: false,
      },
      async (progress) => {
        progress.report({ message: 'Starting migration...', increment: 10 });

        const args = ['migrate'];

        if (targetVersion) {
          args.push('--to', targetVersion);
        }

        if (options.dryRun) {
          args.push('--dry-run');
        }

        if (options.force) {
          args.push('--force');
        }

        try {
          progress.report({ message: 'Running migration...', increment: 40 });

          const result = await this.cliRunner.runJSON<MigrationResult>({
            args,
            timeout: 300000, // 5 minutes
          });

          progress.report({ message: 'Migration complete', increment: 50 });

          // Show results
          if (result.success) {
            vscode.window.showInformationMessage(
              `Successfully migrated to ${result.version}`
            );

            // Show changes
            if (result.changes.length > 0) {
              this.showChanges(result.changes);
            }
          } else {
            vscode.window.showErrorMessage(
              `Migration failed: ${result.errors.join(', ')}`
            );
          }

          return result;
        } catch (error) {
          vscode.window.showErrorMessage(`Migration failed: ${error}`);
          return {
            success: false,
            version: targetVersion || 'unknown',
            changes: [],
            errors: [String(error)],
          };
        }
      }
    );
  }

  /**
   * Rollback migration
   */
  async rollback(): Promise<MigrationResult | null> {
    const confirm = await vscode.window.showWarningMessage(
      'Are you sure you want to rollback the last migration?',
      { modal: true },
      'Yes',
      'No'
    );

    if (confirm !== 'Yes') {
      return null;
    }

    return await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Rolling back migration',
        cancellable: false,
      },
      async (progress) => {
        progress.report({ message: 'Rolling back...', increment: 50 });

        try {
          const result = await this.cliRunner.runJSON<MigrationResult>({
            args: ['migrate', '--rollback'],
            timeout: 300000,
          });

          progress.report({ message: 'Rollback complete', increment: 50 });

          if (result.success) {
            vscode.window.showInformationMessage('Migration rolled back successfully');
          } else {
            vscode.window.showErrorMessage(`Rollback failed: ${result.errors.join(', ')}`);
          }

          return result;
        } catch (error) {
          vscode.window.showErrorMessage(`Rollback failed: ${error}`);
          return {
            success: false,
            version: 'unknown',
            changes: [],
            errors: [String(error)],
          };
        }
      }
    );
  }

  /**
   * Dry run migration
   * @param targetVersion
   */
  async dryRun(targetVersion?: string): Promise<MigrationResult | null> {
    return this.migrate(targetVersion, { dryRun: true });
  }

  /**
   * Show migration changes in output channel
   * @param changes
   */
  private showChanges(changes: string[]): void {
    const channel = vscode.window.createOutputChannel('Enzyme Migration');
    channel.show();

    channel.appendLine('Migration Changes:');
    channel.appendLine('='.repeat(50));
    changes.forEach((change) => {
      channel.appendLine(`  ${change}`);
    });
    channel.appendLine('='.repeat(50));
  }

  /**
   * Get workspace root
   */
  private getWorkspaceRoot(): string | null {
    const folders = vscode.workspace.workspaceFolders;
    const firstFolder = folders?.[0];
    return firstFolder ? firstFolder.uri.fsPath : null;
  }
}
