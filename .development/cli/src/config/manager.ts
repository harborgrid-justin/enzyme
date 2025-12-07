/**
 * Configuration Manager
 *
 * Manages loading, validating, and accessing Enzyme CLI configuration
 * from multiple sources with proper precedence.
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import {
  EnzymeConfig,
  DEFAULT_CONFIG,
  CONFIG_FILE_NAMES,
  ENV_PREFIX,
  mergeConfigs,
  validateConfig,
} from './schema.js';

export interface ConfigSource {
  type: 'cli' | 'env' | 'file' | 'package' | 'default';
  path?: string;
  config: Partial<EnzymeConfig>;
}

export interface ConfigLoadResult {
  config: EnzymeConfig;
  sources: ConfigSource[];
  warnings: string[];
}

/**
 * Configuration Manager
 */
export class ConfigManager {
  private config: EnzymeConfig;
  private sources: ConfigSource[] = [];
  private warnings: string[] = [];
  private cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
    this.config = DEFAULT_CONFIG;
  }

  /**
   * Load configuration from all sources
   */
  async load(cliArgs?: Partial<EnzymeConfig>): Promise<ConfigLoadResult> {
    this.sources = [];
    this.warnings = [];

    // 1. Default configuration
    this.sources.push({
      type: 'default',
      config: DEFAULT_CONFIG,
    });

    // 2. Package.json "enzyme" field
    const packageConfig = this.loadFromPackageJson();
    if (packageConfig) {
      this.sources.push({
        type: 'package',
        path: resolve(this.cwd, 'package.json'),
        config: packageConfig,
      });
    }

    // 3. Configuration file
    const fileConfig = await this.loadFromFile();
    if (fileConfig) {
      this.sources.push(fileConfig);
    }

    // 4. Environment variables
    const envConfig = this.loadFromEnv();
    if (Object.keys(envConfig).length > 0) {
      this.sources.push({
        type: 'env',
        config: envConfig,
      });
    }

    // 5. CLI arguments (highest precedence)
    if (cliArgs && Object.keys(cliArgs).length > 0) {
      this.sources.push({
        type: 'cli',
        config: cliArgs,
      });
    }

    // Merge all configurations
    const mergedConfig = mergeConfigs(
      ...this.sources.map((s) => s.config)
    );

    // Validate merged configuration
    const validation = validateConfig(mergedConfig);
    if (!validation.success) {
      throw new Error(validation.error);
    }

    this.config = validation.data;

    return {
      config: this.config,
      sources: this.sources,
      warnings: this.warnings,
    };
  }

  /**
   * Load configuration from package.json
   */
  private loadFromPackageJson(): Partial<EnzymeConfig> | null {
    const packagePath = resolve(this.cwd, 'package.json');

    if (!existsSync(packagePath)) {
      return null;
    }

    try {
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));

      if (packageJson.enzyme) {
        return packageJson.enzyme;
      }
    } catch (error) {
      this.warnings.push(
        `Failed to parse package.json: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    return null;
  }

  /**
   * Load configuration from file
   */
  private async loadFromFile(): Promise<ConfigSource | null> {
    for (const fileName of CONFIG_FILE_NAMES) {
      const filePath = resolve(this.cwd, fileName);

      if (existsSync(filePath)) {
        try {
          const config = await this.parseConfigFile(filePath);
          return {
            type: 'file',
            path: filePath,
            config,
          };
        } catch (error) {
          this.warnings.push(
            `Failed to parse ${fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    }

    return null;
  }

  /**
   * Parse configuration file
   */
  private async parseConfigFile(filePath: string): Promise<Partial<EnzymeConfig>> {
    const ext = filePath.split('.').pop();

    switch (ext) {
      case 'json': {
        const content = readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
      }

      case 'yaml':
      case 'yml': {
        const content = readFileSync(filePath, 'utf-8');
        return parseYaml(content);
      }

      case 'js':
      case 'mjs':
      case 'cjs': {
        const module = await import(filePath);
        return module.default || module;
      }

      default:
        throw new Error(`Unsupported config file format: ${ext}`);
    }
  }

  /**
   * Load configuration from environment variables
   */
  private loadFromEnv(): Partial<EnzymeConfig> {
    const config: any = {};

    // Parse environment variables with ENZYME_ prefix
    for (const [key, value] of Object.entries(process.env)) {
      if (!key.startsWith(ENV_PREFIX)) {
        continue;
      }

      const configKey = key
        .slice(ENV_PREFIX.length)
        .toLowerCase()
        .replace(/_([a-z])/g, (_, char) => char.toUpperCase());

      // Try to parse value
      try {
        config[configKey] = JSON.parse(value!);
      } catch {
        config[configKey] = value;
      }
    }

    return config;
  }

  /**
   * Get current configuration
   */
  getConfig(): EnzymeConfig {
    return this.config;
  }

  /**
   * Get configuration value by path
   */
  get<T = any>(path: string): T | undefined {
    const keys = path.split('.');
    let value: any = this.config;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return value as T;
  }

  /**
   * Set configuration value by path
   */
  set(path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    let target: any = this.config;

    for (const key of keys) {
      if (!(key in target)) {
        target[key] = {};
      }
      target = target[key];
    }

    target[lastKey] = value;

    // Validate after update
    const validation = validateConfig(this.config);
    if (!validation.success) {
      throw new Error(validation.error);
    }

    this.config = validation.data;
  }

  /**
   * Update configuration
   */
  update(updates: Partial<EnzymeConfig>): void {
    this.config = mergeConfigs(this.config, updates);

    // Validate after update
    const validation = validateConfig(this.config);
    if (!validation.success) {
      throw new Error(validation.error);
    }

    this.config = validation.data;
  }

  /**
   * Save configuration to file
   */
  async save(filePath?: string): Promise<void> {
    // Find existing config file or use default
    let targetPath = filePath;

    if (!targetPath) {
      const existingSource = this.sources.find((s) => s.type === 'file');
      targetPath = existingSource?.path || resolve(this.cwd, '.enzymerc.json');
    }

    const resolvedPath = resolve(this.cwd, targetPath);
    const ext = resolvedPath.split('.').pop();

    let content: string;

    switch (ext) {
      case 'json':
        content = JSON.stringify(this.config, null, 2);
        break;

      case 'yaml':
      case 'yml':
        content = stringifyYaml(this.config);
        break;

      default:
        throw new Error(`Unsupported config file format: ${ext}`);
    }

    writeFileSync(resolvedPath, content, 'utf-8');
  }

  /**
   * Get configuration diff
   */
  diff(other: Partial<EnzymeConfig>): {
    added: Record<string, any>;
    modified: Record<string, any>;
    removed: Record<string, any>;
  } {
    const added: Record<string, any> = {};
    const modified: Record<string, any> = {};
    const removed: Record<string, any> = {};

    // Find added and modified
    this.diffRecursive('', other, this.config, added, modified);

    // Find removed
    this.diffRecursive('', this.config, other, removed, {});

    return { added, modified, removed };
  }

  /**
   * Recursive diff helper
   */
  private diffRecursive(
    prefix: string,
    newObj: any,
    oldObj: any,
    added: Record<string, any>,
    modified: Record<string, any>
  ): void {
    for (const [key, newValue] of Object.entries(newObj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      const oldValue = oldObj?.[key];

      if (!(key in oldObj)) {
        added[path] = newValue;
      } else if (
        typeof newValue === 'object' &&
        !Array.isArray(newValue) &&
        newValue !== null &&
        typeof oldValue === 'object' &&
        !Array.isArray(oldValue) &&
        oldValue !== null
      ) {
        this.diffRecursive(path, newValue, oldValue, added, modified);
      } else if (JSON.stringify(newValue) !== JSON.stringify(oldValue)) {
        modified[path] = { old: oldValue, new: newValue };
      }
    }
  }

  /**
   * Get configuration sources
   */
  getSources(): ConfigSource[] {
    return this.sources;
  }

  /**
   * Get warnings
   */
  getWarnings(): string[] {
    return this.warnings;
  }

  /**
   * Find config file path
   */
  static findConfigFile(cwd: string = process.cwd()): string | null {
    for (const fileName of CONFIG_FILE_NAMES) {
      const filePath = resolve(cwd, fileName);
      if (existsSync(filePath)) {
        return filePath;
      }
    }

    return null;
  }

  /**
   * Check if project has config
   */
  static hasConfig(cwd: string = process.cwd()): boolean {
    return this.findConfigFile(cwd) !== null;
  }
}

/**
 * Create and load configuration manager
 */
export async function loadConfig(
  cwd?: string,
  cliArgs?: Partial<EnzymeConfig>
): Promise<ConfigLoadResult> {
  const manager = new ConfigManager(cwd);
  return manager.load(cliArgs);
}

/**
 * Get configuration value
 */
export function getConfigValue<T = any>(path: string, cwd?: string): T | undefined {
  const manager = new ConfigManager(cwd);
  return manager.get<T>(path);
}
