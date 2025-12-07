/**
 * Migration System
 *
 * Handles version migrations, codemods, and breaking changes
 * for Enzyme framework upgrades.
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync, readdirSync, statSync, mkdirSync } from 'fs';
import { resolve, join, relative } from 'path';
import { execSync } from 'child_process';

export interface Migration {
  version: string;
  name: string;
  description: string;
  breaking: boolean;
  transform: (context: MigrationContext) => Promise<MigrationResult>;
}

export interface MigrationContext {
  cwd: string;
  fromVersion: string;
  toVersion: string;
  files: string[];
  dryRun: boolean;
  backup: boolean;
}

export interface MigrationResult {
  success: boolean;
  filesChanged: string[];
  warnings: string[];
  errors: string[];
  rollback?: () => Promise<void>;
}

export interface MigrateOptions {
  cwd?: string;
  to?: string;
  dryRun?: boolean;
  backup?: boolean;
  force?: boolean;
}

/**
 * Migration Manager
 */
export class MigrationManager {
  private cwd: string;
  private migrations: Migration[] = [];
  private backupDir: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
    this.backupDir = resolve(cwd, '.enzyme-backup');
  }

  /**
   * Register migration
   */
  register(migration: Migration): void {
    this.migrations.push(migration);
    // Sort by version
    this.migrations.sort((a, b) => this.compareVersions(a.version, b.version));
  }

  /**
   * Get applicable migrations
   */
  getApplicableMigrations(fromVersion: string, toVersion: string): Migration[] {
    return this.migrations.filter((m) => {
      return (
        this.compareVersions(m.version, fromVersion) > 0 &&
        this.compareVersions(m.version, toVersion) <= 0
      );
    });
  }

  /**
   * Run migrations
   */
  async migrate(options: MigrateOptions = {}): Promise<MigrationResult> {
    const cwd = options.cwd || this.cwd;
    const dryRun = options.dryRun || false;
    const backup = options.backup !== false; // Default to true

    // Detect current version
    const currentVersion = this.detectVersion(cwd);
    const targetVersion = options.to || this.getLatestVersion();

    console.log(`Migrating from ${currentVersion} to ${targetVersion}`);

    // Get applicable migrations
    const applicable = this.getApplicableMigrations(currentVersion, targetVersion);

    if (applicable.length === 0) {
      return {
        success: true,
        filesChanged: [],
        warnings: ['No migrations needed'],
        errors: [],
      };
    }

    console.log(`Found ${applicable.length} migration(s) to apply:`);
    for (const migration of applicable) {
      console.log(`  - ${migration.version}: ${migration.name}`);
      if (migration.breaking) {
        console.log(`    ⚠️  BREAKING CHANGE`);
      }
    }

    // Create backup if requested
    if (backup && !dryRun) {
      await this.createBackup();
    }

    // Scan project files
    const files = this.scanProjectFiles(cwd);

    // Run migrations
    const allResults: MigrationResult[] = [];
    const rollbacks: (() => Promise<void>)[] = [];

    for (const migration of applicable) {
      console.log(`\nRunning migration: ${migration.name}...`);

      const context: MigrationContext = {
        cwd,
        fromVersion: currentVersion,
        toVersion: targetVersion,
        files,
        dryRun,
        backup,
      };

      try {
        const result = await migration.transform(context);
        allResults.push(result);

        if (result.rollback) {
          rollbacks.unshift(result.rollback);
        }

        if (!result.success) {
          console.error(`Migration failed: ${migration.name}`);
          console.error(result.errors.join('\n'));

          // Rollback if not dry run
          if (!dryRun && rollbacks.length > 0) {
            console.log('Rolling back changes...');
            for (const rollback of rollbacks) {
              await rollback();
            }
          }

          return result;
        }

        console.log(`✓ ${result.filesChanged.length} file(s) updated`);

        if (result.warnings.length > 0) {
          console.warn('Warnings:');
          result.warnings.forEach((w) => console.warn(`  - ${w}`));
        }
      } catch (error) {
        return {
          success: false,
          filesChanged: [],
          warnings: [],
          errors: [error instanceof Error ? error.message : 'Unknown error'],
        };
      }
    }

    // Combine results
    const combinedResult: MigrationResult = {
      success: true,
      filesChanged: allResults.flatMap((r) => r.filesChanged),
      warnings: allResults.flatMap((r) => r.warnings),
      errors: allResults.flatMap((r) => r.errors),
    };

    if (dryRun) {
      console.log('\nDry run completed. No files were modified.');
    } else {
      console.log('\nMigration completed successfully!');

      // Update package.json version
      await this.updatePackageVersion(targetVersion);
    }

    return combinedResult;
  }

  /**
   * Rollback to backup
   */
  async rollback(): Promise<void> {
    if (!existsSync(this.backupDir)) {
      throw new Error('No backup found to rollback to');
    }

    console.log('Rolling back to backup...');

    // Restore files from backup
    const backupFiles = this.scanProjectFiles(this.backupDir);

    for (const backupFile of backupFiles) {
      const relativePath = relative(this.backupDir, backupFile);
      const targetFile = resolve(this.cwd, relativePath);

      copyFileSync(backupFile, targetFile);
    }

    console.log('Rollback completed');
  }

  /**
   * Create backup
   */
  private async createBackup(): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${this.backupDir}-${timestamp}`;

    console.log(`Creating backup at ${backupPath}...`);

    // Copy important files
    const filesToBackup = [
      'package.json',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      'tsconfig.json',
      '.enzymerc.json',
      'enzyme.config.js',
    ];

    for (const file of filesToBackup) {
      const source = resolve(this.cwd, file);
      if (existsSync(source)) {
        const dest = resolve(backupPath, file);
        copyFileSync(source, dest);
      }
    }

    // Copy src directory
    const srcDir = resolve(this.cwd, 'src');
    if (existsSync(srcDir)) {
      this.copyDirectory(srcDir, resolve(backupPath, 'src'));
    }

    console.log('Backup created');
  }

  /**
   * Copy directory recursively
   */
  private copyDirectory(src: string, dest: string): void {
    if (!existsSync(dest)) {
      mkdirSync(dest, { recursive: true });
    }

    const entries = readdirSync(src);

    for (const entry of entries) {
      const srcPath = join(src, entry);
      const destPath = join(dest, entry);
      const stat = statSync(srcPath);

      if (stat.isDirectory()) {
        this.copyDirectory(srcPath, destPath);
      } else {
        copyFileSync(srcPath, destPath);
      }
    }
  }

  /**
   * Detect current Enzyme version
   */
  private detectVersion(cwd: string): string {
    const packageJsonPath = resolve(cwd, 'package.json');

    if (!existsSync(packageJsonPath)) {
      throw new Error('package.json not found');
    }

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const enzymeVersion =
      packageJson.dependencies?.['@missionfabric-js/enzyme'] ||
      packageJson.devDependencies?.['@missionfabric-js/enzyme'];

    if (!enzymeVersion) {
      throw new Error('@missionfabric-js/enzyme not found in dependencies');
    }

    // Remove version prefix (^, ~, etc.)
    return enzymeVersion.replace(/^[\^~]/, '');
  }

  /**
   * Get latest Enzyme version
   */
  private getLatestVersion(): string {
    try {
      const result = execSync(
        'npm view @missionfabric-js/enzyme version',
        { encoding: 'utf-8' }
      );
      return result.trim();
    } catch {
      return '1.0.0'; // Fallback
    }
  }

  /**
   * Update package.json version
   */
  private async updatePackageVersion(version: string): Promise<void> {
    const packageJsonPath = resolve(this.cwd, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    if (packageJson.dependencies?.['@missionfabric-js/enzyme']) {
      packageJson.dependencies['@missionfabric-js/enzyme'] = `^${version}`;
    }

    if (packageJson.devDependencies?.['@missionfabric-js/enzyme']) {
      packageJson.devDependencies['@missionfabric-js/enzyme'] = `^${version}`;
    }

    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');
  }

  /**
   * Compare semantic versions
   */
  private compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      if (aParts[i] > bParts[i]) return 1;
      if (aParts[i] < bParts[i]) return -1;
    }

    return 0;
  }

  /**
   * Scan project files
   */
  private scanProjectFiles(dir: string): string[] {
    const files: string[] = [];

    if (!existsSync(dir)) {
      return files;
    }

    const scan = (currentDir: string) => {
      const entries = readdirSync(currentDir);

      for (const entry of entries) {
        const fullPath = join(currentDir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          if (
            entry !== 'node_modules' &&
            entry !== 'dist' &&
            entry !== 'build' &&
            !entry.startsWith('.')
          ) {
            scan(fullPath);
          }
        } else if (
          entry.endsWith('.ts') ||
          entry.endsWith('.tsx') ||
          entry.endsWith('.js') ||
          entry.endsWith('.jsx')
        ) {
          files.push(fullPath);
        }
      }
    };

    scan(dir);
    return files;
  }
}

/**
 * Codemod utilities
 */
export class CodemodUtils {
  /**
   * Replace import statement
   */
  static replaceImport(
    content: string,
    oldImport: string,
    newImport: string
  ): string {
    const pattern = new RegExp(
      `from\\s+['"]${oldImport.replace(/\//g, '\\/')}['"]`,
      'g'
    );
    return content.replace(pattern, `from '${newImport}'`);
  }

  /**
   * Replace identifier
   */
  static replaceIdentifier(
    content: string,
    oldName: string,
    newName: string
  ): string {
    const pattern = new RegExp(`\\b${oldName}\\b`, 'g');
    return content.replace(pattern, newName);
  }

  /**
   * Add import if not exists
   */
  static addImport(
    content: string,
    importStatement: string
  ): string {
    if (content.includes(importStatement)) {
      return content;
    }

    // Add after last import or at top
    const lines = content.split('\n');
    let lastImportIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ')) {
        lastImportIndex = i;
      }
    }

    if (lastImportIndex >= 0) {
      lines.splice(lastImportIndex + 1, 0, importStatement);
    } else {
      lines.unshift(importStatement);
    }

    return lines.join('\n');
  }

  /**
   * Remove import
   */
  static removeImport(
    content: string,
    packageName: string
  ): string {
    const pattern = new RegExp(
      `import\\s+.*?\\s+from\\s+['"]${packageName.replace(/\//g, '\\/')}['"];?\\n?`,
      'g'
    );
    return content.replace(pattern, '');
  }

  /**
   * Wrap component with HOC
   */
  static wrapWithProvider(
    content: string,
    providerName: string,
    importPath: string
  ): string {
    // Add import
    content = CodemodUtils.addImport(
      content,
      `import { ${providerName} } from '${importPath}';`
    );

    // Find component export
    const exportPattern = /export\s+default\s+(\w+)/;
    const match = exportPattern.exec(content);

    if (match) {
      const componentName = match[1];
      content = content.replace(
        exportPattern,
        `export default function Wrapped() {
  return (
    <${providerName}>
      <${componentName} />
    </${providerName}>
  );
}`
      );
    }

    return content;
  }
}

/**
 * Run migrations
 */
export async function migrate(options: MigrateOptions = {}): Promise<MigrationResult> {
  const manager = new MigrationManager(options.cwd);

  // Register built-in migrations
  registerBuiltInMigrations(manager);

  return manager.migrate(options);
}

/**
 * Register built-in migrations
 */
function registerBuiltInMigrations(manager: MigrationManager): void {
  // Example migration: v1.0.0 to v1.1.0
  manager.register({
    version: '1.1.0',
    name: 'Update router imports',
    description: 'Replace old router imports with new routing module',
    breaking: false,
    transform: async (context) => {
      const filesChanged: string[] = [];
      const warnings: string[] = [];

      for (const file of context.files) {
        let content = readFileSync(file, 'utf-8');
        const originalContent = content;

        // Replace imports
        content = CodemodUtils.replaceImport(
          content,
          'react-router-dom',
          '@missionfabric-js/enzyme/routing'
        );

        if (content !== originalContent) {
          if (!context.dryRun) {
            writeFileSync(file, content, 'utf-8');
          }
          filesChanged.push(relative(context.cwd, file));
        }
      }

      return {
        success: true,
        filesChanged,
        warnings,
        errors: [],
      };
    },
  });

  // Example migration: v1.1.0 to v2.0.0 (breaking)
  manager.register({
    version: '2.0.0',
    name: 'Update to new provider API',
    description: 'Replace LegacyProvider with EnzymeProvider',
    breaking: true,
    transform: async (context) => {
      const filesChanged: string[] = [];
      const warnings: string[] = [];

      for (const file of context.files) {
        let content = readFileSync(file, 'utf-8');
        const originalContent = content;

        // Replace provider
        content = CodemodUtils.replaceIdentifier(
          content,
          'LegacyProvider',
          'EnzymeProvider'
        );

        content = CodemodUtils.replaceImport(
          content,
          '@missionfabric-js/enzyme/legacy',
          '@missionfabric-js/enzyme'
        );

        if (content !== originalContent) {
          if (!context.dryRun) {
            writeFileSync(file, content, 'utf-8');
          }
          filesChanged.push(relative(context.cwd, file));
        }
      }

      if (filesChanged.length > 0) {
        warnings.push(
          'Please review provider configuration changes'
        );
      }

      return {
        success: true,
        filesChanged,
        warnings,
        errors: [],
      };
    },
  });
}
