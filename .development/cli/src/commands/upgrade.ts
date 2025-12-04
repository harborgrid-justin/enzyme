/**
 * Upgrade Command
 *
 * Upgrade Enzyme framework to the latest version with compatibility checks
 * and automatic migrations.
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { migrate } from '../migrate/index.js';

export interface UpgradeOptions {
  cwd?: string;
  to?: string;
  dryRun?: boolean;
  force?: boolean;
  skipMigrations?: boolean;
  skipTests?: boolean;
}

export interface CompatibilityCheck {
  compatible: boolean;
  issues: CompatibilityIssue[];
  warnings: string[];
}

export interface CompatibilityIssue {
  severity: 'error' | 'warning';
  message: string;
  fix?: string;
}

export interface UpgradeResult {
  success: boolean;
  fromVersion: string;
  toVersion: string;
  migrationsRun: number;
  warnings: string[];
  errors: string[];
}

/**
 * Upgrade Enzyme to latest version
 */
export async function upgrade(options: UpgradeOptions = {}): Promise<UpgradeResult> {
  const cwd = options.cwd || process.cwd();
  const dryRun = options.dryRun || false;

  console.log('🔄 Enzyme Upgrade\n');

  // 1. Detect current version
  const currentVersion = detectCurrentVersion(cwd);
  console.log(`Current version: ${currentVersion}`);

  // 2. Get target version
  const targetVersion = options.to || getLatestVersion();
  console.log(`Target version: ${targetVersion}`);

  if (currentVersion === targetVersion) {
    console.log('\n✅ Already on the latest version!');
    return {
      success: true,
      fromVersion: currentVersion,
      toVersion: targetVersion,
      migrationsRun: 0,
      warnings: [],
      errors: [],
    };
  }

  // 3. Check compatibility
  console.log('\nChecking compatibility...');
  const compatibility = await checkCompatibility(cwd, currentVersion, targetVersion);

  if (!compatibility.compatible && !options.force) {
    console.error('\n❌ Compatibility check failed:\n');
    for (const issue of compatibility.issues) {
      const icon = issue.severity === 'error' ? '❌' : '⚠️';
      console.error(`${icon} ${issue.message}`);
      if (issue.fix) {
        console.error(`   💡 ${issue.fix}`);
      }
    }
    console.error('\nUse --force to proceed anyway');
    process.exit(1);
  }

  if (compatibility.warnings.length > 0) {
    console.warn('\n⚠️  Warnings:');
    compatibility.warnings.forEach((warning) => console.warn(`  - ${warning}`));
  }

  // 4. Run migrations
  let migrationsRun = 0;
  const warnings: string[] = [...compatibility.warnings];
  const errors: string[] = [];

  if (!options.skipMigrations) {
    console.log('\nRunning migrations...');

    try {
      const migrationResult = await migrate({
        cwd,
        to: targetVersion,
        dryRun,
        backup: true,
      });

      if (!migrationResult.success) {
        errors.push(...migrationResult.errors);
        return {
          success: false,
          fromVersion: currentVersion,
          toVersion: targetVersion,
          migrationsRun,
          warnings,
          errors,
        };
      }

      migrationsRun = migrationResult.filesChanged.length;
      warnings.push(...migrationResult.warnings);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Migration failed');
      return {
        success: false,
        fromVersion: currentVersion,
        toVersion: targetVersion,
        migrationsRun: 0,
        warnings,
        errors,
      };
    }
  }

  // 5. Upgrade package
  if (!dryRun) {
    console.log('\nUpgrading package...');

    try {
      execSync(
        `npm install @missionfabric-js/enzyme@${targetVersion}`,
        { cwd, stdio: 'inherit' }
      );
      console.log('✓ Package upgraded');
    } catch {
      errors.push('Failed to upgrade package');
      return {
        success: false,
        fromVersion: currentVersion,
        toVersion: targetVersion,
        migrationsRun,
        warnings,
        errors,
      };
    }
  }

  // 6. Update peer dependencies
  if (!dryRun) {
    console.log('\nUpdating peer dependencies...');
    await updatePeerDependencies(cwd, targetVersion);
  }

  // 7. Run tests
  if (!options.skipTests && !dryRun) {
    console.log('\nRunning tests...');

    try {
      execSync('npm test', { cwd, stdio: 'inherit' });
      console.log('✓ Tests passed');
    } catch {
      warnings.push('Tests failed after upgrade. Please review and fix.');
    }
  }

  console.log('\n✅ Upgrade completed successfully!');

  return {
    success: true,
    fromVersion: currentVersion,
    toVersion: targetVersion,
    migrationsRun,
    warnings,
    errors,
  };
}

/**
 * Detect current Enzyme version
 */
function detectCurrentVersion(cwd: string): string {
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
  return enzymeVersion.replace(/^[\^~>=<]/, '');
}

/**
 * Get latest Enzyme version from npm
 */
function getLatestVersion(): string {
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
 * Check compatibility between versions
 */
async function checkCompatibility(
  cwd: string,
  fromVersion: string,
  toVersion: string
): Promise<CompatibilityCheck> {
  const issues: CompatibilityIssue[] = [];
  const warnings: string[] = [];

  // Check Node.js version
  const nodeVersion = process.version.slice(1); // Remove 'v' prefix
  const requiredNodeVersion = '20.0.0';

  if (compareVersions(nodeVersion, requiredNodeVersion) < 0) {
    issues.push({
      severity: 'error',
      message: `Node.js ${requiredNodeVersion} or higher is required (current: ${nodeVersion})`,
      fix: 'Update Node.js to the latest LTS version',
    });
  }

  // Check for breaking changes
  const breakingChanges = getBreakingChanges(fromVersion, toVersion);

  for (const change of breakingChanges) {
    warnings.push(change);
  }

  // Check TypeScript version
  const packageJsonPath = resolve(cwd, 'package.json');
  if (existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const tsVersion = packageJson.devDependencies?.typescript;

    if (tsVersion) {
      const version = tsVersion.replace(/^[\^~>=<]/, '');
      if (compareVersions(version, '5.0.0') < 0) {
        warnings.push('TypeScript 5.0+ recommended for best experience');
      }
    }
  }

  // Check React version
  const packageJsonPath2 = resolve(cwd, 'package.json');
  if (existsSync(packageJsonPath2)) {
    const packageJson = JSON.parse(readFileSync(packageJsonPath2, 'utf-8'));
    const reactVersion =
      packageJson.dependencies?.react ||
      packageJson.peerDependencies?.react;

    if (reactVersion) {
      const version = reactVersion.replace(/^[\^~>=<]/, '');
      if (compareVersions(version, '18.0.0') < 0) {
        issues.push({
          severity: 'error',
          message: 'React 18.0+ is required',
          fix: 'Upgrade React to version 18 or higher',
        });
      }
    }
  }

  const compatible = !issues.some((issue) => issue.severity === 'error');

  return {
    compatible,
    issues,
    warnings,
  };
}

/**
 * Get breaking changes between versions
 */
function getBreakingChanges(fromVersion: string, toVersion: string): string[] {
  const changes: string[] = [];

  // Define breaking changes by version
  const breakingChangesByVersion: Record<string, string[]> = {
    '2.0.0': [
      'LegacyProvider renamed to EnzymeProvider',
      'useOldRouter hook removed, use useRouter instead',
      'Auth configuration structure changed',
    ],
    '3.0.0': [
      'Minimum React version increased to 18.0',
      'Default export changed for routing module',
      'Theme configuration API updated',
    ],
  };

  // Collect all breaking changes in range
  for (const [version, versionChanges] of Object.entries(breakingChangesByVersion)) {
    if (
      compareVersions(version, fromVersion) > 0 &&
      compareVersions(version, toVersion) <= 0
    ) {
      changes.push(...versionChanges);
    }
  }

  return changes;
}

/**
 * Update peer dependencies
 */
async function updatePeerDependencies(cwd: string, _targetVersion: string): Promise<void> {
  const packageJsonPath = resolve(cwd, 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

  const peerDeps = [
    'react',
    'react-dom',
    'react-router-dom',
    '@tanstack/react-query',
  ];

  const outdated: string[] = [];

  for (const dep of peerDeps) {
    if (packageJson.dependencies?.[dep]) {
      const currentVersion = packageJson.dependencies[dep].replace(/^[\^~>=<]/, '');
      const latestVersion = getPackageLatestVersion(dep);

      if (latestVersion && compareVersions(currentVersion, latestVersion) < 0) {
        outdated.push(`${dep}@${latestVersion}`);
      }
    }
  }

  if (outdated.length > 0) {
    console.log('Updating peer dependencies:');
    outdated.forEach((dep) => console.log(`  - ${dep}`));

    try {
      execSync(`npm install ${outdated.join(' ')}`, {
        cwd,
        stdio: 'inherit',
      });
      console.log('✓ Peer dependencies updated');
    } catch {
      console.warn('⚠️  Failed to update some peer dependencies');
    }
  } else {
    console.log('✓ Peer dependencies are up to date');
  }
}

/**
 * Get latest version of a package
 */
function getPackageLatestVersion(packageName: string): string | null {
  try {
    const result = execSync(`npm view ${packageName} version`, {
      encoding: 'utf-8',
    });
    return result.trim();
  } catch {
    return null;
  }
}

/**
 * Compare semantic versions
 */
function compareVersions(a: string, b: string): number {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const aVal = aParts[i] || 0;
    const bVal = bParts[i] || 0;

    if (aVal > bVal) return 1;
    if (aVal < bVal) return -1;
  }

  return 0;
}

/**
 * Check for available upgrades
 */
export async function checkUpgrade(cwd?: string): Promise<{
  current: string;
  latest: string;
  updateAvailable: boolean;
  breaking: boolean;
}> {
  const current = detectCurrentVersion(cwd || process.cwd());
  const latest = getLatestVersion();
  const updateAvailable = compareVersions(current, latest) < 0;

  // Check if it's a breaking change (major version bump)
  const currentMajor = parseInt(current.split('.')[0], 10);
  const latestMajor = parseInt(latest.split('.')[0], 10);
  const breaking = latestMajor > currentMajor;

  return {
    current,
    latest,
    updateAvailable,
    breaking,
  };
}

/**
 * Print upgrade info
 */
export async function printUpgradeInfo(cwd?: string): Promise<void> {
  const info = await checkUpgrade(cwd);

  console.log('Enzyme Version Info:\n');
  console.log(`Current: ${info.current}`);
  console.log(`Latest: ${info.latest}`);

  if (info.updateAvailable) {
    if (info.breaking) {
      console.log('\n⚠️  Major version update available (breaking changes)');
      console.log('   Run "enzyme upgrade --dry-run" to preview changes');
    } else {
      console.log('\n✨ Update available!');
      console.log('   Run "enzyme upgrade" to update');
    }
  } else {
    console.log('\n✅ You are on the latest version!');
  }
}
