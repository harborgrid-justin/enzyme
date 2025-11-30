/**
 * Configuration Commands
 *
 * Commands for managing Enzyme CLI configuration:
 * - init: Create config file interactively
 * - get: Get config value
 * - set: Set config value
 * - list: List all config
 * - validate: Validate config file
 */

import { writeFileSync, existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { ConfigManager } from '../config/manager.js';
import {
  EnzymeConfig,
  DEFAULT_CONFIG,
  validateConfig,
  CONFIG_FILE_NAMES,
} from '../config/schema.js';

export interface ConfigInitOptions {
  cwd?: string;
  format?: 'json' | 'yaml' | 'js';
  interactive?: boolean;
  force?: boolean;
}

export interface ConfigGetOptions {
  cwd?: string;
  format?: 'json' | 'value';
}

export interface ConfigSetOptions {
  cwd?: string;
  create?: boolean;
}

export interface ConfigListOptions {
  cwd?: string;
  format?: 'json' | 'table' | 'tree';
  source?: boolean;
}

export interface ConfigValidateOptions {
  cwd?: string;
  fix?: boolean;
}

/**
 * Initialize configuration file
 */
export async function configInit(options: ConfigInitOptions = {}): Promise<void> {
  const cwd = options.cwd || process.cwd();
  const format = options.format || 'json';
  const interactive = options.interactive !== false;

  // Check if config already exists
  const existingConfig = ConfigManager.findConfigFile(cwd);

  if (existingConfig && !options.force) {
    throw new Error(
      `Configuration file already exists at ${existingConfig}\nUse --force to overwrite`
    );
  }

  let config: Partial<EnzymeConfig> = { ...DEFAULT_CONFIG };

  if (interactive) {
    console.log('Creating Enzyme configuration...\n');

    // In a real implementation, this would use a prompting library like inquirer
    // For now, we'll use the default config
    console.log('Using default configuration. Extend with --interactive for custom setup.');
  }

  // Determine file name
  const fileName =
    format === 'json'
      ? '.enzymerc.json'
      : format === 'yaml'
      ? '.enzymerc.yaml'
      : 'enzyme.config.js';

  const filePath = resolve(cwd, fileName);

  // Generate content
  let content: string;

  switch (format) {
    case 'json':
      content = JSON.stringify(config, null, 2);
      break;

    case 'yaml':
      // In production, use yaml.stringify
      content = JSON.stringify(config, null, 2);
      break;

    case 'js':
      content = `/**
 * Enzyme Configuration
 * @type {import('@missionfabric-js/enzyme-cli').EnzymeConfig}
 */
export default ${JSON.stringify(config, null, 2)};
`;
      break;

    default:
      throw new Error(`Unsupported format: ${format}`);
  }

  writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ Configuration created at ${filePath}`);
}

/**
 * Get configuration value
 */
export async function configGet(
  key?: string,
  options: ConfigGetOptions = {}
): Promise<void> {
  const cwd = options.cwd || process.cwd();
  const format = options.format || 'value';

  const manager = new ConfigManager(cwd);
  await manager.load();

  if (!key) {
    throw new Error('Key is required. Use "enzyme config list" to see all values.');
  }

  const value = manager.get(key);

  if (value === undefined) {
    throw new Error(`Configuration key not found: ${key}`);
  }

  if (format === 'json') {
    console.log(JSON.stringify(value, null, 2));
  } else {
    if (typeof value === 'object') {
      console.log(JSON.stringify(value, null, 2));
    } else {
      console.log(value);
    }
  }
}

/**
 * Set configuration value
 */
export async function configSet(
  key: string,
  value: string,
  options: ConfigSetOptions = {}
): Promise<void> {
  const cwd = options.cwd || process.cwd();

  const manager = new ConfigManager(cwd);
  await manager.load();

  // Parse value
  let parsedValue: any;
  try {
    parsedValue = JSON.parse(value);
  } catch {
    parsedValue = value;
  }

  // Set value
  try {
    manager.set(key, parsedValue);
  } catch (error) {
    throw new Error(
      `Failed to set configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  // Save to file
  let configFile = ConfigManager.findConfigFile(cwd);

  if (!configFile) {
    if (!options.create) {
      throw new Error(
        'No configuration file found. Use --create to create one.'
      );
    }
    configFile = resolve(cwd, '.enzymerc.json');
  }

  await manager.save(configFile);

  console.log(`✅ Set ${key} = ${JSON.stringify(parsedValue)}`);
  console.log(`   Saved to ${configFile}`);
}

/**
 * List all configuration
 */
export async function configList(options: ConfigListOptions = {}): Promise<void> {
  const cwd = options.cwd || process.cwd();
  const format = options.format || 'tree';
  const showSource = options.source !== false;

  const manager = new ConfigManager(cwd);
  const result = await manager.load();

  if (format === 'json') {
    console.log(JSON.stringify(result.config, null, 2));
    return;
  }

  console.log('Enzyme Configuration:\n');

  if (showSource) {
    console.log('Sources (in order of precedence):');
    result.sources.forEach((source, index) => {
      const icon = ['🔧', '📦', '📄', '🌍', '⌨️'][index] || '•';
      console.log(`  ${icon} ${source.type}${source.path ? `: ${source.path}` : ''}`);
    });
    console.log('');
  }

  if (format === 'table') {
    printConfigTable(result.config);
  } else {
    printConfigTree(result.config);
  }

  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    result.warnings.forEach((warning) => console.log(`  - ${warning}`));
  }
}

/**
 * Validate configuration
 */
export async function configValidate(
  options: ConfigValidateOptions = {}
): Promise<void> {
  const cwd = options.cwd || process.cwd();

  const manager = new ConfigManager(cwd);

  try {
    const result = await manager.load();

    console.log('✅ Configuration is valid!\n');

    console.log('Configuration file:');
    const configFile = result.sources.find((s) => s.type === 'file');
    if (configFile) {
      console.log(`  ${configFile.path}`);
    } else {
      console.log('  No configuration file found (using defaults)');
    }

    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach((warning) => console.log(`  - ${warning}`));
    }

    console.log('\nProject name:', result.config.projectName);
    console.log('Version:', result.config.version);

    const enabledFeatures = Object.entries(result.config.features)
      .filter(([_, enabled]) => enabled)
      .map(([name]) => name);

    console.log('Features:', enabledFeatures.join(', ') || 'none');
  } catch (error) {
    console.error('❌ Configuration validation failed:\n');
    console.error(error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

/**
 * Print configuration as tree
 */
function printConfigTree(config: EnzymeConfig, prefix: string = ''): void {
  const entries = Object.entries(config);

  entries.forEach(([key, value], index) => {
    const isLast = index === entries.length - 1;
    const connector = isLast ? '└─' : '├─';
    const childPrefix = isLast ? '  ' : '│ ';

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      console.log(`${prefix}${connector} ${key}:`);
      printConfigTree(value as any, prefix + childPrefix);
    } else {
      const displayValue =
        Array.isArray(value)
          ? `[${value.join(', ')}]`
          : typeof value === 'string'
          ? `"${value}"`
          : value;

      console.log(`${prefix}${connector} ${key}: ${displayValue}`);
    }
  });
}

/**
 * Print configuration as table
 */
function printConfigTable(config: EnzymeConfig, prefix: string = ''): void {
  const entries = Object.entries(config);

  for (const [key, value] of entries) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      printConfigTable(value as any, fullKey);
    } else {
      const displayValue =
        Array.isArray(value)
          ? `[${value.join(', ')}]`
          : typeof value === 'string'
          ? `"${value}"`
          : value;

      console.log(`  ${fullKey.padEnd(40)} ${displayValue}`);
    }
  }
}

/**
 * Interactive prompt helper
 */
async function prompt(question: string, defaultValue?: string): Promise<string> {
  // In production, this would use readline or inquirer
  // For now, return default value
  return defaultValue || '';
}

/**
 * Confirm prompt helper
 */
async function confirm(question: string, defaultValue: boolean = true): Promise<boolean> {
  // In production, this would use readline or inquirer
  // For now, return default value
  return defaultValue;
}

/**
 * Select prompt helper
 */
async function select(
  question: string,
  choices: string[],
  defaultValue?: string
): Promise<string> {
  // In production, this would use readline or inquirer
  // For now, return default value or first choice
  return defaultValue || choices[0];
}

/**
 * Multi-select prompt helper
 */
async function multiSelect(
  question: string,
  choices: string[],
  defaultValues?: string[]
): Promise<string[]> {
  // In production, this would use readline or inquirer
  // For now, return default values or empty array
  return defaultValues || [];
}
