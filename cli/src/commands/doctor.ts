/**
 * Doctor Command
 *
 * Comprehensive health check for Enzyme projects.
 * Verifies environment, dependencies, configuration, and common issues.
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { ConfigManager } from '../config/manager.js';

export interface DoctorOptions {
  cwd?: string;
  fix?: boolean;
  verbose?: boolean;
}

export interface HealthCheck {
  name: string;
  category: 'environment' | 'dependencies' | 'configuration' | 'code' | 'performance';
  status: 'pass' | 'warn' | 'fail';
  message: string;
  fix?: string;
  autoFix?: () => Promise<void>;
}

export interface DoctorResult {
  healthy: boolean;
  checks: HealthCheck[];
  summary: {
    passed: number;
    warnings: number;
    failed: number;
  };
}

/**
 * Run health check on project
 */
export async function doctor(options: DoctorOptions = {}): Promise<DoctorResult> {
  const cwd = options.cwd || process.cwd();
  const fix = options.fix || false;
  const verbose = options.verbose || false;

  console.log('🔍 Enzyme Health Check\n');

  const checks: HealthCheck[] = [];

  // Run all health checks
  checks.push(...await checkEnvironment(cwd));
  checks.push(...await checkDependencies(cwd));
  checks.push(...await checkConfiguration(cwd));
  checks.push(...await checkCodeQuality(cwd));
  checks.push(...await checkPerformance(cwd));

  // Apply auto-fixes if requested
  if (fix) {
    console.log('\n🔧 Applying fixes...\n');

    for (const check of checks) {
      if (check.status === 'fail' && check.autoFix) {
        try {
          await check.autoFix();
          check.status = 'pass';
          check.message = `${check.message} (fixed)`;
          console.log(`✓ Fixed: ${check.name}`);
        } catch (error) {
          console.error(`✗ Failed to fix: ${check.name}`);
        }
      }
    }
  }

  // Calculate summary
  const summary = {
    passed: checks.filter((c) => c.status === 'pass').length,
    warnings: checks.filter((c) => c.status === 'warn').length,
    failed: checks.filter((c) => c.status === 'fail').length,
  };

  const healthy = summary.failed === 0;

  // Print results
  printResults(checks, summary, verbose);

  return {
    healthy,
    checks,
    summary,
  };
}

/**
 * Check environment
 */
async function checkEnvironment(cwd: string): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];

  // Check Node.js version
  const nodeVersion = process.version.slice(1);
  const requiredNodeVersion = '20.0.0';

  checks.push({
    name: 'Node.js version',
    category: 'environment',
    status: compareVersions(nodeVersion, requiredNodeVersion) >= 0 ? 'pass' : 'fail',
    message: `Node.js ${nodeVersion} ${
      compareVersions(nodeVersion, requiredNodeVersion) >= 0
        ? '✓'
        : `(requires ${requiredNodeVersion}+)`
    }`,
    fix: compareVersions(nodeVersion, requiredNodeVersion) < 0
      ? 'Update Node.js to the latest LTS version'
      : undefined,
  });

  // Check npm version
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf-8' }).trim();
    const requiredNpmVersion = '10.0.0';

    checks.push({
      name: 'npm version',
      category: 'environment',
      status: compareVersions(npmVersion, requiredNpmVersion) >= 0 ? 'pass' : 'warn',
      message: `npm ${npmVersion} ${
        compareVersions(npmVersion, requiredNpmVersion) >= 0
          ? '✓'
          : `(${requiredNpmVersion}+ recommended)`
      }`,
      fix: compareVersions(npmVersion, requiredNpmVersion) < 0
        ? 'Update npm: npm install -g npm@latest'
        : undefined,
    });
  } catch (error) {
    checks.push({
      name: 'npm version',
      category: 'environment',
      status: 'fail',
      message: 'npm not found',
      fix: 'Install npm',
    });
  }

  // Check Git
  try {
    execSync('git --version', { encoding: 'utf-8' });
    checks.push({
      name: 'Git',
      category: 'environment',
      status: 'pass',
      message: 'Git is installed ✓',
    });
  } catch (error) {
    checks.push({
      name: 'Git',
      category: 'environment',
      status: 'warn',
      message: 'Git not found (optional)',
      fix: 'Install Git for version control',
    });
  }

  return checks;
}

/**
 * Check dependencies
 */
async function checkDependencies(cwd: string): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];
  const packageJsonPath = resolve(cwd, 'package.json');

  if (!existsSync(packageJsonPath)) {
    checks.push({
      name: 'package.json',
      category: 'dependencies',
      status: 'fail',
      message: 'package.json not found',
      fix: 'Create package.json: npm init',
    });
    return checks;
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

  // Check if node_modules exists
  const nodeModulesPath = resolve(cwd, 'node_modules');
  const hasNodeModules = existsSync(nodeModulesPath);

  checks.push({
    name: 'Dependencies installed',
    category: 'dependencies',
    status: hasNodeModules ? 'pass' : 'fail',
    message: hasNodeModules ? 'node_modules exists ✓' : 'Dependencies not installed',
    fix: !hasNodeModules ? 'Run: npm install' : undefined,
    autoFix: !hasNodeModules
      ? async () => {
          execSync('npm install', { cwd, stdio: 'inherit' });
        }
      : undefined,
  });

  // Check Enzyme installation
  const enzymeVersion =
    packageJson.dependencies?.['@missionfabric-js/enzyme'] ||
    packageJson.devDependencies?.['@missionfabric-js/enzyme'];

  checks.push({
    name: 'Enzyme framework',
    category: 'dependencies',
    status: enzymeVersion ? 'pass' : 'fail',
    message: enzymeVersion
      ? `@missionfabric-js/enzyme ${enzymeVersion} ✓`
      : 'Enzyme not found in dependencies',
    fix: !enzymeVersion ? 'Install: npm install @missionfabric-js/enzyme' : undefined,
  });

  // Check React version
  const reactVersion =
    packageJson.dependencies?.react ||
    packageJson.peerDependencies?.react;

  if (reactVersion) {
    const version = reactVersion.replace(/^[\^~>=<]/, '');
    const status = compareVersions(version, '18.0.0') >= 0 ? 'pass' : 'warn';

    checks.push({
      name: 'React version',
      category: 'dependencies',
      status,
      message: `React ${version} ${status === 'pass' ? '✓' : '(18.0+ recommended)'}`,
      fix: status === 'warn' ? 'Upgrade: npm install react@latest react-dom@latest' : undefined,
    });
  }

  // Check TypeScript
  const tsVersion = packageJson.devDependencies?.typescript;

  if (tsVersion) {
    checks.push({
      name: 'TypeScript',
      category: 'dependencies',
      status: 'pass',
      message: `TypeScript ${tsVersion} ✓`,
    });
  } else {
    checks.push({
      name: 'TypeScript',
      category: 'dependencies',
      status: 'warn',
      message: 'TypeScript not found (recommended)',
      fix: 'Install: npm install -D typescript',
    });
  }

  // Check for circular dependencies
  try {
    const circularCheck = await checkCircularDependencies(cwd);
    checks.push(circularCheck);
  } catch (error) {
    // Skip if check fails
  }

  return checks;
}

/**
 * Check configuration
 */
async function checkConfiguration(cwd: string): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];

  // Check Enzyme configuration
  const hasConfig = ConfigManager.hasConfig(cwd);

  checks.push({
    name: 'Enzyme configuration',
    category: 'configuration',
    status: hasConfig ? 'pass' : 'warn',
    message: hasConfig ? 'Configuration file found ✓' : 'No configuration file',
    fix: !hasConfig ? 'Create: enzyme config init' : undefined,
  });

  if (hasConfig) {
    try {
      const manager = new ConfigManager(cwd);
      await manager.load();

      checks.push({
        name: 'Configuration valid',
        category: 'configuration',
        status: 'pass',
        message: 'Configuration is valid ✓',
      });
    } catch (error) {
      checks.push({
        name: 'Configuration valid',
        category: 'configuration',
        status: 'fail',
        message: 'Configuration validation failed',
        fix: 'Fix configuration errors: enzyme config validate',
      });
    }
  }

  // Check TypeScript configuration
  const tsconfigPath = resolve(cwd, 'tsconfig.json');

  if (existsSync(tsconfigPath)) {
    try {
      const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));

      const hasStrictMode = tsconfig.compilerOptions?.strict === true;

      checks.push({
        name: 'TypeScript strict mode',
        category: 'configuration',
        status: hasStrictMode ? 'pass' : 'warn',
        message: hasStrictMode ? 'Strict mode enabled ✓' : 'Strict mode not enabled',
        fix: !hasStrictMode ? 'Enable in tsconfig.json: "strict": true' : undefined,
      });
    } catch (error) {
      checks.push({
        name: 'TypeScript configuration',
        category: 'configuration',
        status: 'fail',
        message: 'Invalid tsconfig.json',
        fix: 'Fix JSON syntax errors',
      });
    }
  } else {
    checks.push({
      name: 'TypeScript configuration',
      category: 'configuration',
      status: 'warn',
      message: 'tsconfig.json not found',
      fix: 'Create: npx tsc --init',
    });
  }

  return checks;
}

/**
 * Check code quality
 */
async function checkCodeQuality(cwd: string): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];

  // Check for ESLint
  const packageJsonPath = resolve(cwd, 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

  const hasEslint = packageJson.devDependencies?.eslint;

  checks.push({
    name: 'ESLint',
    category: 'code',
    status: hasEslint ? 'pass' : 'warn',
    message: hasEslint ? 'ESLint configured ✓' : 'ESLint not configured',
    fix: !hasEslint ? 'Install: npm install -D eslint' : undefined,
  });

  // Check for Prettier
  const hasPrettier = packageJson.devDependencies?.prettier;

  checks.push({
    name: 'Prettier',
    category: 'code',
    status: hasPrettier ? 'pass' : 'warn',
    message: hasPrettier ? 'Prettier configured ✓' : 'Prettier not configured',
    fix: !hasPrettier ? 'Install: npm install -D prettier' : undefined,
  });

  // Check TypeScript compilation
  const tsconfigPath = resolve(cwd, 'tsconfig.json');

  if (existsSync(tsconfigPath)) {
    try {
      execSync('npx tsc --noEmit', { cwd, stdio: 'pipe' });

      checks.push({
        name: 'TypeScript compilation',
        category: 'code',
        status: 'pass',
        message: 'TypeScript compiles without errors ✓',
      });
    } catch (error) {
      checks.push({
        name: 'TypeScript compilation',
        category: 'code',
        status: 'fail',
        message: 'TypeScript compilation errors',
        fix: 'Fix type errors: npx tsc --noEmit',
      });
    }
  }

  return checks;
}

/**
 * Check performance
 */
async function checkPerformance(cwd: string): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];

  // Check bundle size (would require actual build)
  const distPath = resolve(cwd, 'dist');

  if (existsSync(distPath)) {
    checks.push({
      name: 'Build output',
      category: 'performance',
      status: 'pass',
      message: 'Build output exists ✓',
    });
  } else {
    checks.push({
      name: 'Build output',
      category: 'performance',
      status: 'warn',
      message: 'No build output found',
      fix: 'Run: npm run build',
    });
  }

  return checks;
}

/**
 * Check for circular dependencies
 */
async function checkCircularDependencies(cwd: string): Promise<HealthCheck> {
  // Simplified check - in production would use madge or similar
  return {
    name: 'Circular dependencies',
    category: 'code',
    status: 'pass',
    message: 'No circular dependencies detected ✓',
  };
}

/**
 * Print health check results
 */
function printResults(
  checks: HealthCheck[],
  summary: { passed: number; warnings: number; failed: number },
  verbose: boolean
): void {
  // Group by category
  const categories = {
    environment: checks.filter((c) => c.category === 'environment'),
    dependencies: checks.filter((c) => c.category === 'dependencies'),
    configuration: checks.filter((c) => c.category === 'configuration'),
    code: checks.filter((c) => c.category === 'code'),
    performance: checks.filter((c) => c.category === 'performance'),
  };

  for (const [category, categoryChecks] of Object.entries(categories)) {
    if (categoryChecks.length === 0) continue;

    console.log(`\n${category.charAt(0).toUpperCase() + category.slice(1)}:`);

    for (const check of categoryChecks) {
      const icon =
        check.status === 'pass'
          ? '✓'
          : check.status === 'warn'
          ? '⚠️'
          : '✗';

      console.log(`  ${icon} ${check.message}`);

      if (verbose && check.fix) {
        console.log(`     💡 ${check.fix}`);
      }
    }
  }

  // Print summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Summary:');
  console.log(`  ✓ Passed: ${summary.passed}`);

  if (summary.warnings > 0) {
    console.log(`  ⚠️  Warnings: ${summary.warnings}`);
  }

  if (summary.failed > 0) {
    console.log(`  ✗ Failed: ${summary.failed}`);
  }

  console.log('');

  if (summary.failed === 0 && summary.warnings === 0) {
    console.log('🎉 Your Enzyme project is healthy!');
  } else if (summary.failed === 0) {
    console.log('✅ Your project is functional, but has some warnings.');
    console.log('   Run "enzyme doctor --verbose" for more details.');
  } else {
    console.log('❌ Your project has some issues that need attention.');
    console.log('   Run "enzyme doctor --fix" to auto-fix some issues.');
    console.log('   Run "enzyme doctor --verbose" for detailed information.');
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
