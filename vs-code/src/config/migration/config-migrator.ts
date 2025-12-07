/**
 * @file Configuration Migrator
 * @description Handles configuration migrations between versions
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import type { EnzymeConfigSchema } from '../config-schema';

// =============================================================================
// Types
// =============================================================================

/**
 * Migration function
 */
export type MigrationFn = (config: any) => any;

/**
 * Migration definition
 */
export interface Migration {
  version: string;
  description: string;
  migrate: MigrationFn;
  rollback?: MigrationFn;
}

/**
 * Migration result
 */
export interface MigrationResult {
  success: boolean;
  fromVersion: string;
  toVersion: string;
  appliedMigrations: string[];
  backupPath?: string;
  errors?: string[];
}

// =============================================================================
// Migrations Registry
// =============================================================================

/**
 * Available migrations
 */
const MIGRATIONS: Migration[] = [
  {
    version: '1.0.0',
    description: 'Initial version',
    migrate: (config) => config,
  },
  {
    version: '1.1.0',
    description: 'Add devServer configuration',
    migrate: (config) => ({
      ...config,
      devServer: config.devServer || {
        port: 3000,
        host: 'localhost',
        open: true,
      },
    }),
    rollback: (config) => {
      const { devServer, ...rest } = config;
      return rest;
    },
  },
  {
    version: '1.2.0',
    description: 'Restructure auth configuration',
    migrate: (config) => {
      if (!config.auth) {
        return config;
      }

      return {
        ...config,
        auth: {
          ...config.auth,
          tokenKey: config.auth.tokenKey || 'auth_token',
          refreshKey: config.auth.refreshKey || 'refresh_token',
        },
      };
    },
  },
  {
    version: '2.0.0',
    description: 'Move to new API configuration format',
    migrate: (config) => {
      if (!config.api) {
        return config;
      }

      // Convert old format to new
      return {
        ...config,
        api: {
          baseUrl: config.api.baseUrl || config.api.url,
          timeout: config.api.timeout || 30000,
          retryCount: config.api.retry || 3,
          retryDelay: config.api.retryDelay || 1000,
          headers: config.api.headers || {},
        },
      };
    },
  },
  {
    version: '2.1.0',
    description: 'Add feature flags configuration',
    migrate: (config) => ({
      ...config,
      features: config.features || {
        enabled: true,
        source: 'local',
        flags: [],
      },
    }),
  },
];

// =============================================================================
// Config Migrator
// =============================================================================

/**
 * Configuration migrator
 */
export class ConfigMigrator {
  private workspaceRoot: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Detect configuration version
   */
  public async detectVersion(config: any): Promise<string> {
    // Check for explicit version field
    if (config.version) {
      return config.version;
    }

    // Heuristic detection based on structure
    if (config.features) {
      return '2.1.0';
    }

    if (config.api?.baseUrl && !config.api.url) {
      return '2.0.0';
    }

    if (config.auth?.tokenKey) {
      return '1.2.0';
    }

    if (config.devServer) {
      return '1.1.0';
    }

    return '1.0.0';
  }

  /**
   * Get required migrations
   */
  private getRequiredMigrations(fromVersion: string, toVersion?: string): Migration[] {
    const targetVersion = toVersion || MIGRATIONS[MIGRATIONS.length - 1].version;

    const fromIndex = MIGRATIONS.findIndex((m) => m.version === fromVersion);
    const toIndex = MIGRATIONS.findIndex((m) => m.version === targetVersion);

    if (fromIndex === -1 || toIndex === -1) {
      throw new Error(`Invalid version range: ${fromVersion} to ${targetVersion}`);
    }

    return MIGRATIONS.slice(fromIndex + 1, toIndex + 1);
  }

  /**
   * Migrate configuration
   */
  public async migrate(
    config: any,
    toVersion?: string
  ): Promise<MigrationResult> {
    try {
      const fromVersion = await this.detectVersion(config);
      const targetVersion = toVersion || MIGRATIONS[MIGRATIONS.length - 1].version;

      // Check if migration is needed
      if (fromVersion === targetVersion) {
        return {
          success: true,
          fromVersion,
          toVersion: targetVersion,
          appliedMigrations: [],
        };
      }

      // Backup current config
      const backupPath = await this.backupConfig(config, fromVersion);

      // Get required migrations
      const migrations = this.getRequiredMigrations(fromVersion, targetVersion);

      // Apply migrations
      let migratedConfig = { ...config };
      const appliedMigrations: string[] = [];

      for (const migration of migrations) {
        try {
          migratedConfig = migration.migrate(migratedConfig);
          appliedMigrations.push(migration.version);
        } catch (error) {
          throw new Error(
            `Migration to ${migration.version} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      // Update version
      migratedConfig.version = targetVersion;

      // Validate migrated config
      const validation = await this.validateConfig(migratedConfig);
      if (!validation.valid) {
        throw new Error(`Migrated config is invalid: ${validation.errors.join(', ')}`);
      }

      // Save migrated config
      await this.saveConfig(migratedConfig);

      return {
        success: true,
        fromVersion,
        toVersion: targetVersion,
        appliedMigrations,
        backupPath,
      };
    } catch (error) {
      return {
        success: false,
        fromVersion: await this.detectVersion(config),
        toVersion: toVersion || 'latest',
        appliedMigrations: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Rollback migration
   */
  public async rollback(backupPath: string): Promise<boolean> {
    try {
      const backupContent = await fs.readFile(backupPath, 'utf-8');
      const backupConfig = JSON.parse(backupContent);

      await this.saveConfig(backupConfig);

      return true;
    } catch (error) {
      console.error('Rollback failed:', error);
      return false;
    }
  }

  /**
   * Backup configuration
   */
  private async backupConfig(config: any, version: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(this.workspaceRoot, '.enzyme-backups');

    await fs.mkdir(backupDir, { recursive: true });

    const backupPath = path.join(backupDir, `enzyme.config.${version}.${timestamp}.json`);
    await fs.writeFile(backupPath, JSON.stringify(config, null, 2), 'utf-8');

    return backupPath;
  }

  /**
   * Save configuration
   */
  private async saveConfig(config: any): Promise<void> {
    const configPath = path.join(this.workspaceRoot, 'enzyme.config.ts');

    const content = `import { defineConfig } from '@missionfabric-js/enzyme';

export default defineConfig(${JSON.stringify(config, null, 2)});
`;

    await fs.writeFile(configPath, content, 'utf-8');
  }

  /**
   * Validate configuration
   */
  private async validateConfig(config: any): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Basic validation
    if (!config.name) {
      errors.push('Missing required field: name');
    }

    if (!config.version) {
      errors.push('Missing required field: version');
    }

    if (config.api && !config.api.baseUrl) {
      errors.push('API configuration requires baseUrl');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if migration is needed
   */
  public async needsMigration(config: any): Promise<boolean> {
    const currentVersion = await this.detectVersion(config);
    const latestVersion = MIGRATIONS[MIGRATIONS.length - 1].version;

    return this.compareVersions(currentVersion, latestVersion) < 0;
  }

  /**
   * Compare versions
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;

      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }

    return 0;
  }

  /**
   * Get migration guide
   */
  public getMigrationGuide(fromVersion: string, toVersion?: string): string {
    const targetVersion = toVersion || MIGRATIONS[MIGRATIONS.length - 1].version;
    const migrations = this.getRequiredMigrations(fromVersion, targetVersion);

    if (migrations.length === 0) {
      return 'No migrations needed.';
    }

    let guide = `Migration from ${fromVersion} to ${targetVersion}\n\n`;
    guide += 'The following migrations will be applied:\n\n';

    for (const migration of migrations) {
      guide += `- ${migration.version}: ${migration.description}\n`;
    }

    guide += '\nYour current configuration will be backed up before migration.';

    return guide;
  }
}

// =============================================================================
// Migration Commands
// =============================================================================

/**
 * Show migration prompt
 */
export async function promptMigration(
  workspaceFolder: vscode.WorkspaceFolder,
  config: any
): Promise<void> {
  const migrator = new ConfigMigrator(workspaceFolder.uri.fsPath);

  const needsMigration = await migrator.needsMigration(config);
  if (!needsMigration) {
    return;
  }

  const currentVersion = await migrator.detectVersion(config);
  const latestVersion = MIGRATIONS[MIGRATIONS.length - 1].version;

  const result = await vscode.window.showInformationMessage(
    `Your Enzyme configuration is version ${currentVersion}. Migrate to ${latestVersion}?`,
    { modal: true },
    'View Changes',
    'Migrate',
    'Later'
  );

  if (result === 'View Changes') {
    const guide = migrator.getMigrationGuide(currentVersion);
    const doc = await vscode.workspace.openTextDocument({
      content: guide,
      language: 'markdown',
    });
    await vscode.window.showTextDocument(doc);
  } else if (result === 'Migrate') {
    await executeMigration(migrator, config);
  }
}

/**
 * Execute migration with progress
 */
async function executeMigration(
  migrator: ConfigMigrator,
  config: any
): Promise<void> {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Migrating Enzyme configuration...',
      cancellable: false,
    },
    async (progress) => {
      progress.report({ increment: 0 });

      const result = await migrator.migrate(config);

      progress.report({ increment: 100 });

      if (result.success) {
        vscode.window.showInformationMessage(
          `Configuration migrated successfully to ${result.toVersion}. Applied ${result.appliedMigrations.length} migrations.`
        );

        if (result.backupPath) {
          vscode.window.showInformationMessage(
            `Backup saved to: ${result.backupPath}`
          );
        }
      } else {
        vscode.window.showErrorMessage(
          `Migration failed: ${result.errors?.join(', ')}`
        );
      }
    }
  );
}
