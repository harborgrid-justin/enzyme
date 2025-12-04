#!/usr/bin/env node

/**
 * @file Enzyme CLI - Enterprise scaffolding tool
 * @module cli
 *
 * Main entry point for the Enzyme CLI. Provides powerful commands for:
 * - Project creation and scaffolding
 * - Code generation (components, pages, hooks, services)
 * - Feature management
 * - Configuration management
 * - Project analysis
 * - Documentation generation
 * - Version migrations
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Command imports
import { newCommand } from './commands/new.js';
import { configInit, configGet, configSet, configList, configValidate } from './commands/config.js';
import { addFeature, listFeatures, type FeatureType } from './commands/add.js';
import { createGenerateCommand } from './commands/generate.js';
import { createMigrateCommand } from './commands/migrate.js';
import { createAnalyzeCommand } from './commands/analyze.js';
import { createDocsCommand } from './commands/docs.js';

// Core imports
import { ConfigManager } from './config/manager.js';
import { createLogger } from './utils/logger.js';
import { createPluginManager } from './plugins/loader.js';
import { getBuiltInPlugins } from './plugins/built-in/index.js';
import { CommandContext, GlobalOptions } from './types/index.js';

// Optional imports for additional commands
let removeFeature: any, upgrade: any, printUpgradeInfo: any, doctor: any;
let validateFiles: any, formatValidationResults: any;

// Try to import optional commands
try {
  const removeModule = await import('./commands/remove.js');
  removeFeature = removeModule.removeFeature;
} catch { /* Optional module */ }

try {
  const upgradeModule = await import('./commands/upgrade.js');
  upgrade = upgradeModule.upgrade;
  printUpgradeInfo = upgradeModule.printUpgradeInfo;
} catch { /* Optional module */ }

try {
  const doctorModule = await import('./commands/doctor.js');
  doctor = doctorModule.doctor;
} catch { /* Optional module */ }

try {
  const validationModule = await import('./validation/index.js');
  validateFiles = validationModule.validateFiles;
  formatValidationResults = validationModule.formatValidationResults;
} catch { /* Optional module */ }

// Get package.json for version
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let pkg: any;
try {
  pkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8'));
} catch {
  pkg = { version: '1.0.0' };
}

/**
 * Create command context with logger, config, and plugins
 */
async function createContext(options: GlobalOptions): Promise<CommandContext> {
  const logger = createLogger({
    verbose: options.verbose,
    noColor: options.noColor,
  });

  const cwd = process.cwd();

  // Load configuration
  const configManager = new ConfigManager(cwd);
  const { config } = await configManager.load();

  // Create plugin manager
  const pluginManager = createPluginManager();

  const context: CommandContext = {
    options,
    logger,
    cwd,
    config,
    pluginManager,
  };

  // Set plugin manager context
  pluginManager.setContext(context);

  // Load built-in plugins
  const builtInPlugins = getBuiltInPlugins();
  for (const plugin of builtInPlugins) {
    pluginManager.register(plugin);
  }

  // Load custom plugins from config
  if (config.plugins && config.plugins.length > 0) {
    try {
      await pluginManager.load(config.plugins);
    } catch (error) {
      logger.warn(`Failed to load custom plugins: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return context;
}

/**
 * Main CLI program
 */
const program = new Command();

program
  .name('enzyme')
  .description('Enterprise CLI scaffolding tool for the Enzyme React framework')
  .version(pkg.version, '-v, --version', 'Output the current version')
  .option('--verbose', 'Enable verbose logging')
  .option('--dry-run', 'Perform a dry run without making actual changes')
  .option('--force', 'Force operation without confirmation prompts')
  .option('--no-color', 'Disable colored output')
  .option('--config <path>', 'Path to custom configuration file')
  .helpOption('-h, --help', 'Display help for command');

// enzyme new command
program
  .command('new')
  .alias('create')
  .description('Create a new enzyme project')
  .argument('<project-name>', 'Project name')
  .option('-t, --template <name>', 'Template to use (minimal, standard, enterprise, full)', 'standard')
  .option('-pm, --package-manager <manager>', 'Package manager (npm, yarn, pnpm, bun)', 'npm')
  .option('--git', 'Initialize git repository', true)
  .option('--no-git', 'Skip git initialization')
  .option('--install', 'Install dependencies after generation', true)
  .option('--no-install', 'Skip dependency installation')
  .option('--typescript', 'Use TypeScript (always true for enzyme)', true)
  .option('-f, --features <features>', 'Comma-separated list of features (auth,state,routing,realtime,monitoring,theme)')
  .option('-o, --output <dir>', 'Output directory (defaults to current directory)')
  .action(newCommand);

// enzyme generate command - Enhanced with context
const generateCmd = program
  .command('generate')
  .alias('g')
  .description('Generate code artifacts (components, pages, hooks, services)')
  .option('-n, --name <name>', 'Artifact name')
  .option('-d, --dir <dir>', 'Output directory')
  .option('-t, --template <template>', 'Template to use')
  .option('--no-tests', 'Skip test generation')
  .option('--no-styles', 'Skip style generation')
  .option('--story', 'Include Storybook story');

// Add subcommands
generateCmd
  .command('component [name]')
  .alias('c')
  .description('Generate a React component')
  .action(async (name) => {
    const context = await createContext(program.opts());
    const cmd = createGenerateCommand(context);
    await cmd.parseAsync(['component', name], { from: 'user' });
  });

generateCmd
  .command('page [name]')
  .alias('p')
  .description('Generate a page component')
  .action(async (name) => {
    const context = await createContext(program.opts());
    const cmd = createGenerateCommand(context);
    await cmd.parseAsync(['page', name], { from: 'user' });
  });

generateCmd
  .command('hook [name]')
  .alias('h')
  .description('Generate a custom React hook')
  .action(async (name) => {
    const context = await createContext(program.opts());
    const cmd = createGenerateCommand(context);
    await cmd.parseAsync(['hook', name], { from: 'user' });
  });

generateCmd
  .command('service [name]')
  .alias('s')
  .description('Generate a service')
  .action(async (name) => {
    const context = await createContext(program.opts());
    const cmd = createGenerateCommand(context);
    await cmd.parseAsync(['service', name], { from: 'user' });
  });

// enzyme config commands
const configCmd = program
  .command('config')
  .description('Manage Enzyme configuration');

configCmd
  .command('init')
  .description('Initialize Enzyme configuration file')
  .option('-f, --format <format>', 'Config format (json, yaml, js)', 'json')
  .option('--force', 'Overwrite existing configuration')
  .option('--interactive', 'Interactive configuration setup', true)
  .action(async (options) => {
    await configInit(options);
  });

configCmd
  .command('get')
  .description('Get configuration value')
  .argument('<key>', 'Configuration key')
  .option('--format <format>', 'Output format (json, value)', 'value')
  .action(async (key, options) => {
    await configGet(key, options);
  });

configCmd
  .command('set')
  .description('Set configuration value')
  .argument('<key>', 'Configuration key')
  .argument('<value>', 'Configuration value')
  .option('--create', 'Create config file if not exists')
  .action(async (key, value, options) => {
    await configSet(key, value, options);
  });

configCmd
  .command('list')
  .description('List all configuration')
  .option('--format <format>', 'Output format (json, table, tree)', 'tree')
  .option('--no-source', 'Hide configuration sources')
  .action(async (options) => {
    await configList(options);
  });

configCmd
  .command('validate')
  .description('Validate configuration file')
  .option('--fix', 'Auto-fix issues')
  .action(async (options) => {
    await configValidate(options);
  });

// enzyme add command
program
  .command('add')
  .description('Add a feature to the project')
  .argument('<feature>', 'Feature to add (auth, state, routing, realtime, monitoring, theme, flags)')
  .option('--dry-run', 'Preview changes without applying')
  .option('--skip-install', 'Skip dependency installation')
  .option('--skip-config', 'Skip configuration update')
  .action(async (feature: FeatureType, options) => {
    await addFeature(feature, options);
  });

program
  .command('add:list')
  .description('List available features')
  .action(() => {
    listFeatures();
  });

// enzyme remove command
program
  .command('remove')
  .description('Remove a feature from the project')
  .argument('<feature>', 'Feature to remove')
  .option('--dry-run', 'Preview changes without applying')
  .option('--force', 'Force removal without confirmation')
  .option('--skip-uninstall', 'Skip dependency uninstallation')
  .option('--keep-files', 'Keep generated files')
  .action(async (feature: FeatureType, options) => {
    await removeFeature(feature, options);
  });

// enzyme analyze command - Enhanced with context
const analyzeCmd = program
  .command('analyze')
  .description('Analyze project structure and dependencies')
  .option('--json', 'Output as JSON')
  .option('--verbose', 'Show detailed analysis');

analyzeCmd.action(async (_options) => {
  const context = await createContext(program.opts());
  const cmd = createAnalyzeCommand(context);
  await cmd.parseAsync([], { from: 'user' });
});

analyzeCmd
  .command('dependencies')
  .alias('deps')
  .description('Analyze project dependencies')
  .action(async () => {
    const context = await createContext(program.opts());
    const cmd = createAnalyzeCommand(context);
    await cmd.parseAsync(['dependencies'], { from: 'user' });
  });

analyzeCmd
  .command('components')
  .alias('comps')
  .description('Analyze project components')
  .action(async () => {
    const context = await createContext(program.opts());
    const cmd = createAnalyzeCommand(context);
    await cmd.parseAsync(['components'], { from: 'user' });
  });

// enzyme migrate command - Enhanced with context
const migrateCmd = program
  .command('migrate')
  .description('Run migrations to update project structure')
  .option('--to <version>', 'Target version')
  .option('--dry-run', 'Show what would be migrated without making changes');

migrateCmd.action(async (_options) => {
  const context = await createContext(program.opts());
  const cmd = createMigrateCommand(context);
  await cmd.parseAsync([], { from: 'user' });
});

migrateCmd
  .command('list')
  .description('List available migrations')
  .action(async () => {
    const context = await createContext(program.opts());
    const cmd = createMigrateCommand(context);
    await cmd.parseAsync(['list'], { from: 'user' });
  });

migrateCmd
  .command('status')
  .description('Show migration status')
  .action(async () => {
    const context = await createContext(program.opts());
    const cmd = createMigrateCommand(context);
    await cmd.parseAsync(['status'], { from: 'user' });
  });

// enzyme docs command - New command for documentation
const docsCmd = program
  .command('docs')
  .description('Generate and manage project documentation')
  .option('--output <dir>', 'Output directory', 'docs');

docsCmd.action(async (_options) => {
  const context = await createContext(program.opts());
  const cmd = createDocsCommand(context);
  await cmd.parseAsync([], { from: 'user' });
});

docsCmd
  .command('init')
  .description('Initialize documentation structure')
  .option('--template <template>', 'Documentation template (basic, comprehensive)', 'basic')
  .action(async (options) => {
    const context = await createContext(program.opts());
    const cmd = createDocsCommand(context);
    await cmd.parseAsync(['init', `--template=${options.template}`], { from: 'user' });
  });

docsCmd
  .command('component <name>')
  .description('Generate component documentation')
  .action(async (name) => {
    const context = await createContext(program.opts());
    const cmd = createDocsCommand(context);
    await cmd.parseAsync(['component', name], { from: 'user' });
  });

docsCmd
  .command('api')
  .description('Generate API documentation')
  .action(async () => {
    const context = await createContext(program.opts());
    const cmd = createDocsCommand(context);
    await cmd.parseAsync(['api'], { from: 'user' });
  });

// enzyme upgrade command
program
  .command('upgrade')
  .description('Upgrade Enzyme to latest version')
  .option('--to <version>', 'Target version')
  .option('--dry-run', 'Preview upgrade without applying')
  .option('--force', 'Force upgrade even with compatibility issues')
  .option('--skip-migrations', 'Skip running migrations')
  .option('--skip-tests', 'Skip running tests after upgrade')
  .action(async (options) => {
    await upgrade(options);
  });

program
  .command('upgrade:check')
  .description('Check for available upgrades')
  .action(async () => {
    await printUpgradeInfo();
  });

// enzyme validate command
program
  .command('validate')
  .description('Validate generated code')
  .argument('[files...]', 'Files to validate (glob patterns supported)')
  .option('--fix', 'Auto-fix issues where possible')
  .option('--rules <rules>', 'Comma-separated list of rules to check')
  .action(async (files: string[], options) => {
    const rulesToCheck = options.rules ? options.rules.split(',') : undefined;
    const results = validateFiles(files, {
      fix: options.fix,
      rules: rulesToCheck,
    });

    console.log(formatValidationResults(results));

    const hasErrors = results.some((r: { valid: boolean }) => !r.valid);
    if (hasErrors) {
      process.exit(1);
    }
  });

// enzyme doctor command
program
  .command('doctor')
  .description('Check project health')
  .option('--fix', 'Auto-fix issues where possible')
  .option('--verbose', 'Verbose output')
  .action(async (options) => {
    const result = await doctor(options);

    if (!result.healthy) {
      process.exit(1);
    }
  });

// enzyme info command - Display environment information
program
  .command('info')
  .description('Display Enzyme CLI and environment information')
  .action(async () => {
    const context = await createContext(program.opts());

    context.logger.header('Environment Information');
    context.logger.newLine();

    context.logger.info(`Enzyme CLI Version: ${pkg.version}`);
    context.logger.info(`Node Version: ${process.version}`);
    context.logger.info(`Platform: ${process.platform}`);
    context.logger.info(`Architecture: ${process.arch}`);
    context.logger.info(`Working Directory: ${process.cwd()}`);

    context.logger.newLine();
    context.logger.info('Configuration:');
    context.logger.info(`  Project: ${context.config.projectName || 'Not configured'}`);
    context.logger.info(`  TypeScript: ${context.config.typescript ? 'Enabled' : 'Disabled'}`);

    const enabledFeatures = Object.entries(context.config.features || {})
      .filter(([_, enabled]) => enabled)
      .map(([name]) => name);

    context.logger.info(`  Features: ${enabledFeatures.length > 0 ? enabledFeatures.join(', ') : 'None'}`);
    context.logger.info(`  Plugins: ${context.pluginManager.count}`);

    context.logger.newLine();
  });

// Error handling
program.exitOverride();

try {
  await program.parseAsync(process.argv);
} catch (error: any) {
  // Handle help and version display
  if (error.code === 'commander.help' || error.code === 'commander.helpDisplayed') {
    process.exit(0);
  }

  if (error.code === 'commander.version') {
    process.exit(0);
  }

  // Handle other errors
  const logger = createLogger({ verbose: program.opts().verbose });

  logger.error(`\n${error.message || 'Unknown error'}`);

  if (program.opts().verbose && error.stack) {
    logger.newLine();
    logger.error('Stack trace:');
    logger.error(error.stack);
  }

  logger.newLine();
  logger.info('Run with --verbose for more details');
  logger.info('Run with --help for usage information');

  process.exit(1);
}
