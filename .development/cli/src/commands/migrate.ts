/**
 * @file Migrate command for version migrations
 * @module commands/migrate
 */

import { Command } from 'commander';
import { CommandContext, Migration } from '../types/index.js';
import { readJson, writeJson } from '../utils/fs.js';
import { resolve } from 'path';
import semver from 'semver';

/**
 * Migration registry
 */
const migrations: Migration[] = [];

/**
 * Create migrate command
 */
export function createMigrateCommand(context: CommandContext): Command {
  const migrate = new Command('migrate')
    .description('Run migrations to update project structure')
    .option('--to <version>', 'Target version')
    .option('--dry-run', 'Show what would be migrated without making changes')
    .action(async (options) => {
      await runMigrations(context, options);
    });

  migrate
    .command('list')
    .description('List available migrations')
    .action(() => {
      listMigrations(context);
    });

  migrate
    .command('status')
    .description('Show migration status')
    .action(async () => {
      await showMigrationStatus(context);
    });

  return migrate;
}

/**
 * Run migrations
 */
async function runMigrations(
  context: CommandContext,
  options: { to?: string; dryRun?: boolean }
): Promise<void> {
  context.logger.header('Run Migrations');

  try {
    // Read package.json to get current version
    const pkgPath = resolve(context.cwd, 'package.json');
    const pkg = await readJson(pkgPath);
    const currentVersion = pkg.version || '0.0.0';

    context.logger.info(`Current version: ${currentVersion}`);

    // Determine target version
    const targetVersion = options.to || getLatestMigrationVersion();

    if (!targetVersion) {
      context.logger.info('No migrations available');
      return;
    }

    context.logger.info(`Target version: ${targetVersion}`);

    // Get pending migrations
    const pending = getPendingMigrations(currentVersion, targetVersion);

    if (pending.length === 0) {
      context.logger.success('No pending migrations');
      return;
    }

    context.logger.newLine();
    context.logger.info(`Found ${pending.length} pending migration(s):`);
    pending.forEach((m, i) => {
      context.logger.info(`  ${i + 1}. ${m.name} (${m.version})`);
    });

    if (options.dryRun) {
      context.logger.newLine();
      context.logger.info('Dry run mode - no changes will be made');
      return;
    }

    // Run migrations
    context.logger.newLine();
    for (const migration of pending) {
      context.logger.startSpinner(`Running migration: ${migration.name}`);

      try {
        await migration.up(context);
        context.logger.succeedSpinner(`Completed: ${migration.name}`);
      } catch (error) {
        context.logger.failSpinner(`Failed: ${migration.name}`);
        throw error;
      }
    }

    context.logger.newLine();
    context.logger.success('All migrations completed successfully');
  } catch (error) {
    context.logger.error(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

/**
 * List available migrations
 */
function listMigrations(context: CommandContext): void {
  context.logger.header('Available Migrations');

  if (migrations.length === 0) {
    context.logger.info('No migrations registered');
    return;
  }

  migrations.forEach((migration, index) => {
    context.logger.info(`${index + 1}. ${migration.name}`);
    context.logger.info(`   Version: ${migration.version}`);
    context.logger.info(`   Description: ${migration.description}`);
    context.logger.newLine();
  });
}

/**
 * Show migration status
 */
async function showMigrationStatus(context: CommandContext): Promise<void> {
  context.logger.header('Migration Status');

  try {
    const pkgPath = resolve(context.cwd, 'package.json');
    const pkg = await readJson(pkgPath);
    const currentVersion = pkg.version || '0.0.0';

    context.logger.info(`Current version: ${currentVersion}`);

    const latest = getLatestMigrationVersion();
    if (latest) {
      context.logger.info(`Latest migration: ${latest}`);

      const pending = getPendingMigrations(currentVersion, latest);
      if (pending.length > 0) {
        context.logger.warn(`Pending migrations: ${pending.length}`);
      } else {
        context.logger.success('Up to date');
      }
    } else {
      context.logger.info('No migrations available');
    }
  } catch (error) {
    context.logger.error(`Failed to get status: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get latest migration version
 */
function getLatestMigrationVersion(): string | null {
  if (migrations.length === 0) {
    return null;
  }

  return migrations.reduce((latest, migration) => {
    return semver.gt(migration.version, latest) ? migration.version : latest;
  }, migrations[0].version);
}

/**
 * Get pending migrations
 */
function getPendingMigrations(currentVersion: string, targetVersion: string): Migration[] {
  return migrations.filter((migration) => {
    return semver.gt(migration.version, currentVersion) && semver.lte(migration.version, targetVersion);
  }).sort((a, b) => semver.compare(a.version, b.version));
}

/**
 * Register a migration
 */
export function registerMigration(migration: Migration): void {
  migrations.push(migration);
}

/**
 * Example migrations
 */

// Register example migration
registerMigration({
  name: 'Update to v2.0.0',
  version: '2.0.0',
  description: 'Migrate to Enzyme v2.0.0 structure',
  async up(context) {
    context.logger.info('Updating project structure...');

    // Example: Update package.json dependencies
    const pkgPath = resolve(context.cwd, 'package.json');
    const pkg = await readJson(pkgPath);

    // Update enzyme dependency
    if (pkg.dependencies?.['@missionfabric-js/enzyme']) {
      pkg.dependencies['@missionfabric-js/enzyme'] = '^2.0.0';
    }

    await writeJson(pkgPath, pkg);
    context.logger.success('Updated package.json');
  },
  async down(context) {
    // Rollback logic
    context.logger.info('Rolling back v2.0.0 migration...');
  },
});
