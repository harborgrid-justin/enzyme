#!/usr/bin/env node

/**
 * @missionfabric-js/enzyme Multi-Agent Build System
 * CLI Entry Point - Main executable for the build system
 *
 * Usage:
 *   npx tsx scripts/build-agents/cli.ts [options]
 *
 * Options:
 *   --publish         Publish to npm after build
 *   --dry-run         Simulate publish without actually publishing
 *   --verbose         Enable verbose output
 *   --no-parallel     Disable parallel execution
 *   --fail-fast       Stop on first failure
 *   --npm-token       NPM authentication token
 *   --interactive     Enable interactive dashboard (default: auto)
 *   --help            Show help
 */

import { resolve, join } from 'path';
import { existsSync, readFileSync } from 'fs';
import type { BuildConfig, BuildTarget } from './types.js';
import { BuildOrchestrator } from './orchestrator.js';
import { BuildDashboard, SimpleProgressLogger } from './dashboard.js';
import { colors, icons } from './base-agent.js';

// ============================================================================
// CLI Argument Parsing
// ============================================================================

interface CLIOptions {
  publish: boolean;
  dryRun: boolean;
  verbose: boolean;
  parallel: boolean;
  failFast: boolean;
  npmToken: string | null;
  interactive: boolean;
  help: boolean;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);

  const options: CLIOptions = {
    publish: false,
    dryRun: false,
    verbose: false,
    parallel: true,
    failFast: false,
    npmToken: null,
    interactive: process.stdout.isTTY ?? false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--publish':
        options.publish = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--no-parallel':
        options.parallel = false;
        break;
      case '--fail-fast':
        options.failFast = true;
        break;
      case '--npm-token':
        options.npmToken = args[++i] || null;
        break;
      case '--interactive':
        options.interactive = true;
        break;
      case '--no-interactive':
        options.interactive = false;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  // Check environment variable for npm token
  if (!options.npmToken) {
    options.npmToken = process.env.NPM_TOKEN || null;
  }

  return options;
}

function printHelp(): void {
  console.log(`
${colors.cyan}${colors.bold}ENZYME MULTI-AGENT BUILD SYSTEM${colors.reset}
${colors.dim}Enterprise-grade parallel build orchestration with 10 engineer agents${colors.reset}

${colors.bold}USAGE:${colors.reset}
  npx tsx scripts/build-agents/cli.ts [options]

${colors.bold}OPTIONS:${colors.reset}
  --publish         Publish packages to npm after successful build
  --dry-run         Simulate publish without actually publishing
  --verbose         Enable verbose output from all agents
  --no-parallel     Disable parallel execution (run sequentially)
  --fail-fast       Stop build immediately on first failure
  --npm-token <token>  NPM authentication token (or set NPM_TOKEN env)
  --interactive     Force interactive dashboard mode
  --no-interactive  Disable interactive dashboard
  --help, -h        Show this help message

${colors.bold}ENGINEER AGENTS:${colors.reset}
  ${icons.typecheck} TypeCheck Engineer  - TypeScript compilation validation
  ${icons.lint} Lint Engineer       - ESLint code style checking
  ${icons.test} Test Engineer       - Unit/integration test execution
  ${icons.security} Security Engineer   - Dependency vulnerability scanning
  ${icons.quality} Quality Engineer    - Code quality metrics analysis
  ${icons.docs} Docs Engineer       - Documentation validation
  ${icons.build} Build Engineer      - Vite build (ESM + CJS)
  ${icons.bundle} Bundle Engineer     - Bundle optimization analysis
  ${icons.performance} Perf Engineer       - Build performance metrics
  ${icons.publish} Publish Engineer    - NPM package publishing

${colors.bold}EXAMPLES:${colors.reset}
  # Basic build
  npx tsx scripts/build-agents/cli.ts

  # Build and publish
  npx tsx scripts/build-agents/cli.ts --publish --npm-token YOUR_TOKEN

  # Dry run publish
  npx tsx scripts/build-agents/cli.ts --publish --dry-run

  # Verbose sequential build
  npx tsx scripts/build-agents/cli.ts --verbose --no-parallel

${colors.bold}ENVIRONMENT:${colors.reset}
  NPM_TOKEN         NPM authentication token for publishing
`);
}

// ============================================================================
// Build Target Discovery
// ============================================================================

function discoverTargets(rootDir: string): BuildTarget[] {
  const targets: BuildTarget[] = [];

  // Main enzyme package
  const mainPkgPath = join(rootDir, 'package.json');
  if (existsSync(mainPkgPath)) {
    const pkg = JSON.parse(readFileSync(mainPkgPath, 'utf-8'));
    targets.push({
      name: pkg.name || '@missionfabric-js/enzyme',
      path: rootDir,
      version: pkg.version || '1.0.0',
      type: 'main',
    });
  }

  // TypeScript utilities package
  const tsPkgPath = join(rootDir, 'typescript', 'package.json');
  if (existsSync(tsPkgPath)) {
    const pkg = JSON.parse(readFileSync(tsPkgPath, 'utf-8'));
    targets.push({
      name: pkg.name || '@missionfabric-js/enzyme-typescript',
      path: join(rootDir, 'typescript'),
      version: pkg.version || '1.0.0',
      type: 'typescript',
    });
  }

  return targets;
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main(): Promise<void> {
  const options = parseArgs();

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  const rootDir = resolve(process.cwd());
  const targets = discoverTargets(rootDir);

  if (targets.length === 0) {
    console.error(`${colors.red}${icons.failure} No build targets found.${colors.reset}`);
    console.error('Make sure you are in the enzyme project root directory.');
    process.exit(1);
  }

  // Create build configuration
  const config: BuildConfig = {
    targets,
    outputDir: 'dist',
    sourceMap: true,
    minify: true,
    parallel: options.parallel,
    maxConcurrency: options.parallel ? 4 : 1,
    failFast: options.failFast,
    verbose: options.verbose,
    dryRun: options.dryRun,
    publishToNpm: options.publish,
    npmToken: options.npmToken || undefined,
  };

  // Validate npm token if publishing
  if (config.publishToNpm && !config.npmToken && !config.dryRun) {
    console.error(`${colors.red}${icons.failure} NPM token required for publishing.${colors.reset}`);
    console.error('Use --npm-token <token> or set NPM_TOKEN environment variable.');
    console.error('Or use --dry-run to simulate publishing.');
    process.exit(1);
  }

  // Create orchestrator
  const orchestrator = new BuildOrchestrator(config);

  // Set up event handling
  if (options.interactive && process.stdout.isTTY) {
    const dashboard = new BuildDashboard(true);
    orchestrator.onEvent((event) => dashboard.handleEvent(event));
    dashboard.start();

    // Handle SIGINT
    process.on('SIGINT', () => {
      dashboard.stop();
      console.log(`\n${colors.yellow}${icons.warning} Build cancelled by user.${colors.reset}`);
      process.exit(130);
    });

    try {
      const report = await orchestrator.run();
      dashboard.stop();
      dashboard.printFinalReport(report);
      process.exit(report.success ? 0 : 1);
    } catch (error) {
      dashboard.stop();
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`${colors.red}${icons.failure} Build failed: ${err.message}${colors.reset}`);
      process.exit(1);
    }
  } else {
    // Simple progress logging
    const logger = new SimpleProgressLogger();
    orchestrator.onEvent((event) => logger.handleEvent(event));

    try {
      const report = await orchestrator.run();
      process.exit(report.success ? 0 : 1);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`${colors.red}${icons.failure} Build failed: ${err.message}${colors.reset}`);
      process.exit(1);
    }
  }
}

// Run
main().catch((error) => {
  console.error(`${colors.red}${icons.failure} Unexpected error: ${error.message}${colors.reset}`);
  process.exit(1);
});
