/**
 * @file Analyze command for project analysis
 * @module commands/analyze
 */

import { Command } from 'commander';
import { CommandContext, AnalysisResult, ProjectInfo } from '../types/index.js';
import { readJson, findFiles, readFile } from '../utils/fs.js';
import { resolve, basename } from 'path';

/**
 * Create analyze command
 */
export function createAnalyzeCommand(context: CommandContext): Command {
  const analyze = new Command('analyze')
    .description('Analyze project structure and dependencies')
    .option('--json', 'Output as JSON')
    .option('--verbose', 'Show detailed analysis')
    .action(async (options) => {
      await analyzeProject(context, options);
    });

  analyze
    .command('dependencies')
    .alias('deps')
    .description('Analyze project dependencies')
    .action(async () => {
      await analyzeDependencies(context);
    });

  analyze
    .command('components')
    .alias('comps')
    .description('Analyze project components')
    .action(async () => {
      await analyzeComponents(context);
    });

  analyze
    .command('routes')
    .description('Analyze project routes')
    .action(async () => {
      await analyzeRoutes(context);
    });

  return analyze;
}

/**
 * Analyze project
 */
async function analyzeProject(context: CommandContext, options: { json?: boolean; verbose?: boolean }): Promise<void> {
  if (!options.json) {
    context.logger.header('Project Analysis');
    context.logger.startSpinner('Analyzing project...');
  }

  try {
    const result = await performAnalysis(context);

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    context.logger.succeedSpinner('Analysis complete');
    displayAnalysisResult(context, result, options.verbose);
  } catch (error) {
    context.logger.failSpinner('Analysis failed');
    context.logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

/**
 * Perform analysis
 */
async function performAnalysis(context: CommandContext): Promise<AnalysisResult> {
  // Get project info
  const project = await getProjectInfo(context);

  // Count artifacts
  const componentFiles = await findFiles('**/*.{tsx,jsx}', resolve(context.cwd, 'src/components'));
  const pageFiles = await findFiles('**/*.{tsx,jsx}', resolve(context.cwd, 'src/pages'));
  const hookFiles = await findFiles('**/use*.{ts,tsx}', resolve(context.cwd, 'src/hooks'));

  // Read package.json
  const pkgPath = resolve(context.cwd, 'package.json');
  const pkg = await readJson(pkgPath);

  // Analyze issues
  const issues: AnalysisResult['issues'] = [];
  const recommendations: string[] = [];

  // Check for common issues
  if (!pkg.dependencies?.['react']) {
    issues.push({
      severity: 'error',
      message: 'React is not installed',
    });
  }

  if (!pkg.devDependencies?.['typescript']) {
    issues.push({
      severity: 'warning',
      message: 'TypeScript is not installed as a dev dependency',
    });
    recommendations.push('Consider adding TypeScript for better type safety');
  }

  if (componentFiles.length === 0) {
    issues.push({
      severity: 'info',
      message: 'No components found in src/components',
    });
  }

  // Check for enzyme framework
  if (!pkg.dependencies?.['@missionfabric-js/enzyme']) {
    issues.push({
      severity: 'warning',
      message: 'Enzyme framework is not installed',
    });
    recommendations.push('Install @missionfabric-js/enzyme to use framework features');
  }

  // Check for testing setup
  const hasJest = pkg.devDependencies?.['jest'] || pkg.dependencies?.['jest'];
  const hasVitest = pkg.devDependencies?.['vitest'] || pkg.dependencies?.['vitest'];
  const hasTestingLibrary = pkg.devDependencies?.['@testing-library/react'];

  if (!hasJest && !hasVitest) {
    issues.push({
      severity: 'warning',
      message: 'No testing framework found',
    });
    recommendations.push('Add Jest or Vitest for testing');
  }

  if (!hasTestingLibrary) {
    recommendations.push('Add @testing-library/react for component testing');
  }

  return {
    project,
    componentCount: componentFiles.length,
    pageCount: pageFiles.length,
    hookCount: hookFiles.length,
    dependencies: pkg.dependencies || {},
    devDependencies: pkg.devDependencies || {},
    issues,
    recommendations,
  };
}

/**
 * Get project info
 */
async function getProjectInfo(context: CommandContext): Promise<ProjectInfo> {
  const pkgPath = resolve(context.cwd, 'package.json');
  const pkg = await readJson(pkgPath);

  // Detect package manager
  let packageManager: 'npm' | 'yarn' | 'pnpm' = 'npm';
  try {
    await findFiles('pnpm-lock.yaml', context.cwd);
    packageManager = 'pnpm';
  } catch {
    try {
      await findFiles('yarn.lock', context.cwd);
      packageManager = 'yarn';
    } catch {
      packageManager = 'npm';
    }
  }

  // Check for TypeScript
  const isTypeScript = !!pkg.devDependencies?.['typescript'] || !!pkg.dependencies?.['typescript'];

  // Check for git
  const hasGit = (await findFiles('.git', context.cwd)).length > 0;

  return {
    name: pkg.name || basename(context.cwd),
    root: context.cwd,
    packageManager,
    isTypeScript,
    hasGit,
    framework: pkg.dependencies?.['@missionfabric-js/enzyme'] ? 'enzyme' : undefined,
    frameworkVersion: pkg.dependencies?.['@missionfabric-js/enzyme'] || undefined,
  };
}

/**
 * Display analysis result
 */
function displayAnalysisResult(context: CommandContext, result: AnalysisResult, verbose?: boolean): void {
  context.logger.newLine();

  // Project info
  context.logger.success('Project Information');
  context.logger.info(`  Name: ${result.project.name}`);
  context.logger.info(`  Path: ${result.project.root}`);
  context.logger.info(`  Package Manager: ${result.project.packageManager}`);
  context.logger.info(`  TypeScript: ${result.project.isTypeScript ? 'Yes' : 'No'}`);
  context.logger.info(`  Git: ${result.project.hasGit ? 'Yes' : 'No'}`);
  if (result.project.framework) {
    context.logger.info(`  Framework: ${result.project.framework} ${result.project.frameworkVersion || ''}`);
  }

  context.logger.newLine();

  // Artifact counts
  context.logger.success('Project Structure');
  context.logger.info(`  Components: ${result.componentCount}`);
  context.logger.info(`  Pages: ${result.pageCount}`);
  context.logger.info(`  Hooks: ${result.hookCount}`);
  context.logger.info(`  Dependencies: ${Object.keys(result.dependencies).length}`);
  context.logger.info(`  Dev Dependencies: ${Object.keys(result.devDependencies).length}`);

  // Issues
  if (result.issues.length > 0) {
    context.logger.newLine();
    context.logger.warn(`Issues Found (${result.issues.length})`);

    const errors = result.issues.filter((i) => i.severity === 'error');
    const warnings = result.issues.filter((i) => i.severity === 'warning');
    const infos = result.issues.filter((i) => i.severity === 'info');

    if (errors.length > 0) {
      context.logger.error('Errors:');
      errors.forEach((issue) => {
        context.logger.error(`  • ${issue.message}`);
      });
    }

    if (warnings.length > 0) {
      context.logger.warn('Warnings:');
      warnings.forEach((issue) => {
        context.logger.warn(`  • ${issue.message}`);
      });
    }

    if (infos.length > 0 && verbose) {
      context.logger.info('Info:');
      infos.forEach((issue) => {
        context.logger.info(`  • ${issue.message}`);
      });
    }
  }

  // Recommendations
  if (result.recommendations.length > 0) {
    context.logger.newLine();
    context.logger.info('Recommendations');
    result.recommendations.forEach((rec) => {
      context.logger.info(`  • ${rec}`);
    });
  }

  if (verbose) {
    context.logger.newLine();
    context.logger.info('Dependencies');
    Object.entries(result.dependencies).forEach(([name, version]) => {
      context.logger.info(`  ${name}@${version}`);
    });

    context.logger.newLine();
    context.logger.info('Dev Dependencies');
    Object.entries(result.devDependencies).forEach(([name, version]) => {
      context.logger.info(`  ${name}@${version}`);
    });
  }
}

/**
 * Analyze dependencies
 */
async function analyzeDependencies(context: CommandContext): Promise<void> {
  context.logger.header('Dependency Analysis');
  context.logger.startSpinner('Analyzing dependencies...');

  try {
    const pkgPath = resolve(context.cwd, 'package.json');
    const pkg = await readJson(pkgPath);

    const deps = Object.entries(pkg.dependencies || {});
    const devDeps = Object.entries(pkg.devDependencies || {});

    context.logger.succeedSpinner('Analysis complete');
    context.logger.newLine();

    context.logger.success(`Production Dependencies (${deps.length})`);
    deps.forEach(([name, version]) => {
      context.logger.info(`  ${name}@${version}`);
    });

    context.logger.newLine();
    context.logger.success(`Development Dependencies (${devDeps.length})`);
    devDeps.forEach(([name, version]) => {
      context.logger.info(`  ${name}@${version}`);
    });
  } catch (error) {
    context.logger.failSpinner('Analysis failed');
    context.logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Analyze components
 */
async function analyzeComponents(context: CommandContext): Promise<void> {
  context.logger.header('Component Analysis');
  context.logger.startSpinner('Finding components...');

  try {
    const componentFiles = await findFiles('**/*.{tsx,jsx}', resolve(context.cwd, 'src/components'));

    context.logger.succeedSpinner(`Found ${componentFiles.length} component(s)`);
    context.logger.newLine();

    if (componentFiles.length === 0) {
      context.logger.info('No components found');
      return;
    }

    for (const file of componentFiles) {
      const content = await readFile(file);
      const lines = content.split('\n').length;
      const hasTests = file.includes('.test.') || file.includes('.spec.');

      context.logger.info(`${basename(file)}`);
      context.logger.info(`  Lines: ${lines}`);
      context.logger.info(`  Tests: ${hasTests ? 'Yes' : 'No'}`);
    }
  } catch (error) {
    context.logger.failSpinner('Analysis failed');
    context.logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Analyze routes
 */
async function analyzeRoutes(context: CommandContext): Promise<void> {
  context.logger.header('Route Analysis');
  context.logger.info('Analyzing routes...');

  try {
    const routeFiles = await findFiles('**/routes/**/*.{ts,tsx,js,jsx}', resolve(context.cwd, 'src'));

    if (routeFiles.length === 0) {
      context.logger.info('No route files found');
      return;
    }

    context.logger.newLine();
    context.logger.success(`Found ${routeFiles.length} route file(s)`);

    routeFiles.forEach((file) => {
      context.logger.info(`  ${basename(file)}`);
    });
  } catch (error) {
    context.logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
