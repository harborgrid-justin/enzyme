/**
 * @file Plugin loader and manager
 * @module plugins/loader
 */

import { resolve } from 'path';
import { pathToFileURL } from 'url';
import {
  Plugin,
  PluginManager as IPluginManager,
  PluginHooks,
  GenerationContext,
  CommandContext,
  ValidationResult,
  GenerationResult,
} from '../types/index.js';
import { exists, isFile } from '../utils/fs.js';

/**
 * Plugin manager implementation
 */
export class PluginManager implements IPluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private context?: CommandContext;

  constructor(context?: CommandContext) {
    this.context = context;
  }

  /**
   * Set command context
   */
  setContext(context: CommandContext): void {
    this.context = context;
  }

  /**
   * Load plugins from paths
   * @param pluginPaths - Array of plugin paths or package names
   */
  async load(pluginPaths: string[]): Promise<void> {
    for (const pluginPath of pluginPaths) {
      try {
        await this.loadPlugin(pluginPath);
      } catch (error) {
        this.context?.logger.warn(
          `Failed to load plugin ${pluginPath}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  }

  /**
   * Load a single plugin
   * @param pluginPath - Plugin path or package name
   */
  private async loadPlugin(pluginPath: string): Promise<void> {
    let plugin: Plugin;

    // Check if it's a file path
    const resolvedPath = resolve(process.cwd(), pluginPath);
    const isFilePath = await exists(resolvedPath);

    if (isFilePath && (await isFile(resolvedPath))) {
      // Load from file
      plugin = await this.loadPluginFromFile(resolvedPath);
    } else {
      // Try to load as package
      plugin = await this.loadPluginFromPackage(pluginPath);
    }

    this.register(plugin);
  }

  /**
   * Load plugin from file
   * @param filePath - Plugin file path
   */
  private async loadPluginFromFile(filePath: string): Promise<Plugin> {
    try {
      const fileUrl = pathToFileURL(filePath).href;
      const module = await import(fileUrl);
      const plugin = module.default || module;

      if (!this.isValidPlugin(plugin)) {
        throw new Error('Invalid plugin structure');
      }

      return plugin;
    } catch (error) {
      throw new Error(`Failed to load plugin from file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load plugin from package
   * @param packageName - Package name
   */
  private async loadPluginFromPackage(packageName: string): Promise<Plugin> {
    try {
      const module = await import(packageName);
      const plugin = module.default || module;

      if (!this.isValidPlugin(plugin)) {
        throw new Error('Invalid plugin structure');
      }

      return plugin;
    } catch (error) {
      throw new Error(
        `Failed to load plugin from package: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validate plugin structure
   * @param plugin - Plugin to validate
   */
  private isValidPlugin(plugin: any): plugin is Plugin {
    return (
      typeof plugin === 'object' &&
      plugin !== null &&
      typeof plugin.name === 'string' &&
      typeof plugin.version === 'string' &&
      typeof plugin.hooks === 'object'
    );
  }

  /**
   * Register a plugin
   * @param plugin - Plugin to register
   */
  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.name)) {
      this.context?.logger.warn(`Plugin ${plugin.name} is already registered. Overwriting...`);
    }

    this.plugins.set(plugin.name, plugin);
    this.context?.logger.debug(`Registered plugin: ${plugin.name}@${plugin.version}`);

    // Execute init hook if available
    if (plugin.hooks.init && this.context) {
      this.executePluginHook(plugin, 'init', this.context).catch((error) => {
        this.context?.logger.warn(
          `Plugin ${plugin.name} init hook failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      });
    }
  }

  /**
   * Unregister a plugin
   * @param name - Plugin name
   */
  unregister(name: string): boolean {
    const plugin = this.plugins.get(name);

    if (!plugin) {
      return false;
    }

    // Execute cleanup hook if available
    if (plugin.hooks.cleanup && this.context) {
      this.executePluginHook(plugin, 'cleanup', this.context).catch((error) => {
        this.context?.logger.warn(
          `Plugin ${plugin.name} cleanup hook failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      });
    }

    this.plugins.delete(name);
    return true;
  }

  /**
   * Get all registered plugins
   */
  getPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugin by name
   * @param name - Plugin name
   */
  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Check if plugin is registered
   * @param name - Plugin name
   */
  hasPlugin(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * Execute hook across all plugins
   */
  async executeHook<T extends keyof PluginHooks>(
    hookName: T,
    ...args: Parameters<NonNullable<PluginHooks[T]>>
  ): Promise<void> {
    const plugins = this.getPlugins();

    for (const plugin of plugins) {
      await this.executePluginHook(plugin, hookName, ...args);
    }
  }

  /**
   * Execute hook for a specific plugin
   */
  private async executePluginHook<T extends keyof PluginHooks>(
    plugin: Plugin,
    hookName: T,
    ...args: Parameters<NonNullable<PluginHooks[T]>>
  ): Promise<void> {
    const hook = plugin.hooks[hookName] as any;

    if (typeof hook !== 'function') {
      return;
    }

    try {
      this.context?.logger.debug(`Executing ${hookName} hook for plugin: ${plugin.name}`);
      await hook(...args);
    } catch (error) {
      this.context?.logger.error(
        `Plugin ${plugin.name} ${hookName} hook failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  /**
   * Execute beforeGenerate hooks
   */
  async beforeGenerate(context: GenerationContext): Promise<void> {
    await this.executeHook('beforeGenerate', context);
  }

  /**
   * Execute afterGenerate hooks
   */
  async afterGenerate(context: GenerationContext, result: GenerationResult): Promise<void> {
    await this.executeHook('afterGenerate', context, result);
  }

  /**
   * Execute validate hooks and collect results
   */
  async validate(context: GenerationContext): Promise<ValidationResult> {
    const plugins = this.getPlugins();
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const plugin of plugins) {
      if (!plugin.hooks.validate) {
        continue;
      }

      try {
        const result = await plugin.hooks.validate(context);

        if (!result.valid) {
          errors.push(...result.errors);
        }

        warnings.push(...result.warnings);
      } catch (error) {
        errors.push(
          `Plugin ${plugin.name} validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Clear all plugins
   */
  clear(): void {
    // Execute cleanup hooks
    if (this.context) {
      for (const plugin of this.plugins.values()) {
        if (plugin.hooks.cleanup) {
          this.executePluginHook(plugin, 'cleanup', this.context).catch((error) => {
            this.context?.logger.warn(
              `Plugin ${plugin.name} cleanup hook failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          });
        }
      }
    }

    this.plugins.clear();
  }

  /**
   * Get plugin count
   */
  get count(): number {
    return this.plugins.size;
  }

  /**
   * List all plugin names
   */
  list(): string[] {
    return Array.from(this.plugins.keys());
  }
}

/**
 * Create a new plugin manager
 */
export function createPluginManager(context?: CommandContext): PluginManager {
  return new PluginManager(context);
}
