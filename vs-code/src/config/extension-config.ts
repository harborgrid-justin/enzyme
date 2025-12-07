/**
 * @file Extension Configuration Manager
 * @description Manages VS Code extension settings for Enzyme
 */

import * as vscode from 'vscode';

// =============================================================================
// Extension Settings Interface
// =============================================================================

/**
 * Complete Enzyme extension settings
 */
export interface EnzymeExtensionSettings {
  // Telemetry
  'enzyme.telemetry.enabled': boolean;

  // Logging
  'enzyme.logging.level': 'debug' | 'info' | 'warn' | 'error';

  // CLI Configuration
  'enzyme.cli.path': string;
  'enzyme.cli.autoInstall': boolean;

  // Generator
  'enzyme.generator.componentStyle': 'function' | 'arrow';
  'enzyme.generator.testFramework': 'vitest' | 'jest';
  'enzyme.generator.cssFramework': 'tailwind' | 'css-modules' | 'styled-components' | 'emotion';

  // Validation
  'enzyme.validation.onSave': boolean;
  'enzyme.validation.strict': boolean;

  // Analysis
  'enzyme.analysis.autoRun': boolean;
  'enzyme.analysis.onSave': boolean;
  'enzyme.analysis.debounceMs': number;

  // Diagnostics
  'enzyme.diagnostics.enabled': boolean;
  'enzyme.diagnostics.severity': 'error' | 'warning' | 'info' | 'hint';
  'enzyme.diagnostics.showInline': boolean;

  // CodeLens
  'enzyme.codeLens.enabled': boolean;
  'enzyme.codeLens.showReferences': boolean;
  'enzyme.codeLens.showImplementations': boolean;

  // Inlay Hints
  'enzyme.inlayHints.enabled': boolean;
  'enzyme.inlayHints.showTypes': boolean;
  'enzyme.inlayHints.showParameters': boolean;

  // Formatting
  'enzyme.formatting.enabled': boolean;
  'enzyme.formatting.onSave': boolean;
  'enzyme.formatting.prettier': boolean;

  // Completion
  'enzyme.completion.enabled': boolean;
  'enzyme.completion.autoImport': boolean;
  'enzyme.completion.snippets': boolean;

  // Dev Server
  'enzyme.devServer.port': number;
  'enzyme.devServer.host': string;
  'enzyme.devServer.autoStart': boolean;

  // Debug
  'enzyme.debug.enabled': boolean;
  'enzyme.debug.connectAutomatically': boolean;
  'enzyme.debug.port': number;

  // Performance
  'enzyme.performance.monitoring.enabled': boolean;
  'enzyme.performance.caching': boolean;
  'enzyme.performance.maxCacheSize': number;

  // Security
  'enzyme.security.scanning.enabled': boolean;

  // Imports
  'enzyme.imports.autoOptimize': boolean;

  // Snippets
  'enzyme.snippets.enabled': boolean;

  // Code Actions
  'enzyme.codeActions.enabled': boolean;

  // Explorer
  'enzyme.explorer.autoRefresh': boolean;

  // Format
  'enzyme.format.onSave': boolean;

  // Experimental
  'enzyme.experimental.features': string[];
}

/**
 * Extension setting key
 */
export type ExtensionSettingKey = keyof EnzymeExtensionSettings;

// =============================================================================
// Default Settings
// =============================================================================

/**
 * Default extension settings
 */
export const DEFAULT_SETTINGS: EnzymeExtensionSettings = {
  // Telemetry - CRITICAL: Matches package.json (false by default for privacy)
  'enzyme.telemetry.enabled': false,

  // Logging
  'enzyme.logging.level': 'info',

  // CLI
  'enzyme.cli.path': 'enzyme',
  'enzyme.cli.autoInstall': true,

  // Generator
  'enzyme.generator.componentStyle': 'function',
  'enzyme.generator.testFramework': 'vitest',
  'enzyme.generator.cssFramework': 'tailwind',

  // Validation
  'enzyme.validation.onSave': true,
  'enzyme.validation.strict': false,

  // Analysis
  'enzyme.analysis.autoRun': true,
  'enzyme.analysis.onSave': true,
  'enzyme.analysis.debounceMs': 300,

  // Diagnostics
  'enzyme.diagnostics.enabled': true,
  'enzyme.diagnostics.severity': 'warning',
  'enzyme.diagnostics.showInline': true,

  // CodeLens
  'enzyme.codeLens.enabled': true,
  'enzyme.codeLens.showReferences': true,
  'enzyme.codeLens.showImplementations': true,

  // Inlay Hints
  'enzyme.inlayHints.enabled': true,
  'enzyme.inlayHints.showTypes': true,
  'enzyme.inlayHints.showParameters': false,

  // Formatting
  'enzyme.formatting.enabled': true,
  'enzyme.formatting.onSave': false,
  'enzyme.formatting.prettier': true,

  // Completion
  'enzyme.completion.enabled': true,
  'enzyme.completion.autoImport': true,
  'enzyme.completion.snippets': true,

  // Dev Server
  'enzyme.devServer.port': 3000,
  'enzyme.devServer.host': 'localhost',
  'enzyme.devServer.autoStart': false,

  // Debug
  'enzyme.debug.enabled': true,
  'enzyme.debug.connectAutomatically': true,
  'enzyme.debug.port': 9229,

  // Performance
  'enzyme.performance.monitoring.enabled': true,
  'enzyme.performance.caching': true,
  'enzyme.performance.maxCacheSize': 100,

  // Security
  'enzyme.security.scanning.enabled': true,

  // Imports
  'enzyme.imports.autoOptimize': true,

  // Snippets
  'enzyme.snippets.enabled': true,

  // Code Actions
  'enzyme.codeActions.enabled': true,

  // Explorer
  'enzyme.explorer.autoRefresh': true,

  // Format
  'enzyme.format.onSave': true,

  // Experimental
  'enzyme.experimental.features': [],
};

// =============================================================================
// Extension Config Manager
// =============================================================================

/**
 * Configuration scope
 */
export type ConfigScope = 'user' | 'workspace' | 'workspaceFolder';

/**
 * Configuration change event
 */
export interface ConfigChangeEvent {
  key: ExtensionSettingKey;
  newValue: unknown;
  oldValue: unknown;
  scope: ConfigScope;
}

/**
 * Extension configuration manager
 */
export class ExtensionConfig {
  private static instance: ExtensionConfig;
  private readonly listeners = new Map<string, Array<(event: ConfigChangeEvent) => void>>();
  private readonly disposables: vscode.Disposable[] = [];

  /**
   *
   */
  private constructor() {
    // Listen for configuration changes
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
        this.handleConfigChange(e);
      })
    );
  }

  /**
   * Get singleton instance of ExtensionConfig
   *
   * @returns The singleton ExtensionConfig instance
   *
   * @example
   * ```typescript
   * const config = ExtensionConfig.getInstance();
   * const level = config.get('enzyme.logging.level');
   * ```
   */
  public static getInstance(): ExtensionConfig {
    if (!ExtensionConfig.instance) {
      ExtensionConfig.instance = new ExtensionConfig();
    }
    return ExtensionConfig.instance;
  }

  /**
   * Get configuration value with type safety
   *
   * @template K - The extension setting key type
   * @param key - The configuration key to retrieve (e.g., 'enzyme.logging.level')
   * @param scope - Optional configuration scope (resource, workspace, or global)
   * @returns The configuration value with proper type, or default if not set
   *
   * @example
   * ```typescript
   * const config = ExtensionConfig.getInstance();
   * const level = config.get('enzyme.logging.level'); // Returns 'debug' | 'info' | 'warn' | 'error'
   * const port = config.get('enzyme.devServer.port', document.uri); // Resource-scoped
   * ```
   */
  public get<K extends ExtensionSettingKey>(
    key: K,
    scope?: vscode.ConfigurationScope
  ): EnzymeExtensionSettings[K] {
    const config = vscode.workspace.getConfiguration('enzyme', scope);
    const settingKey = key.replace('enzyme.', '');
    const value = config.get<EnzymeExtensionSettings[K]>(settingKey);
    return value !== undefined ? value : DEFAULT_SETTINGS[key];
  }

  /**
   * Set configuration value
   *
   * @template K - The extension setting key type
   * @param key - The configuration key to set (e.g., 'enzyme.logging.level')
   * @param value - The value to set (type-checked against the key)
   * @param configTarget - Where to save: Global, Workspace, or WorkspaceFolder
   * @returns Promise that resolves when the setting is saved
   *
   * @example
   * ```typescript
   * const config = ExtensionConfig.getInstance();
   * await config.set('enzyme.logging.level', 'debug'); // Set to debug
   * await config.set('enzyme.devServer.port', 3000, vscode.ConfigurationTarget.Global);
   * ```
   */
  public async set<K extends ExtensionSettingKey>(
    key: K,
    value: EnzymeExtensionSettings[K],
    configTarget: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Workspace
  ): Promise<void> {
    const config = vscode.workspace.getConfiguration('enzyme');
    const settingKey = key.replace('enzyme.', '');
    await config.update(settingKey, value, configTarget);
  }

  /**
   * Get all current extension settings
   *
   * @param scope - Optional configuration scope to read from
   * @returns Partial settings object containing only defined values
   *
   * @example
   * ```typescript
   * const config = ExtensionConfig.getInstance();
   * const allSettings = config.getAll();
   * console.log(allSettings['enzyme.logging.level']); // 'info'
   * ```
   */
  public getAll(scope?: vscode.ConfigurationScope): Partial<EnzymeExtensionSettings> {
    const config = vscode.workspace.getConfiguration('enzyme', scope);
    const settings: Record<string, any> = {};

    for (const key of Object.keys(DEFAULT_SETTINGS) as ExtensionSettingKey[]) {
      const settingKey = key.replace('enzyme.', '');
      const value = config.get(settingKey);
      if (value !== undefined) {
        settings[key] = value;
      }
    }

    return settings as Partial<EnzymeExtensionSettings>;
  }

  /**
   * Reset all settings to their default values
   *
   * @param configTarget - Where to reset: Global, Workspace, or WorkspaceFolder
   * @returns Promise that resolves when all settings are reset
   *
   * @example
   * ```typescript
   * const config = ExtensionConfig.getInstance();
   * await config.resetToDefaults(); // Reset workspace settings
   * await config.resetToDefaults(vscode.ConfigurationTarget.Global); // Reset global settings
   * ```
   */
  public async resetToDefaults(
    configTarget: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Workspace
  ): Promise<void> {
    const config = vscode.workspace.getConfiguration('enzyme');

    for (const key of Object.keys(DEFAULT_SETTINGS) as ExtensionSettingKey[]) {
      const settingKey = key.replace('enzyme.', '');
      await config.update(settingKey, undefined, configTarget);
    }
  }

  /**
   * Check if a setting has been explicitly configured
   *
   * @param key - The setting key to check
   * @param scope - Optional configuration scope
   * @returns True if the setting exists in configuration
   *
   * @example
   * ```typescript
   * const config = ExtensionConfig.getInstance();
   * if (config.has('enzyme.logging.level')) {
   *   console.log('Logging level has been configured');
   * }
   * ```
   */
  public has(key: ExtensionSettingKey, scope?: vscode.ConfigurationScope): boolean {
    const config = vscode.workspace.getConfiguration('enzyme', scope);
    const settingKey = key.replace('enzyme.', '');
    return config.has(settingKey);
  }

  /**
   * Inspect a setting across all configuration scopes
   * Returns default, global, workspace, and workspaceFolder values
   *
   * @template K - The extension setting key type
   * @param key - The setting key to inspect
   * @returns Inspection result showing values across all scopes
   *
   * @example
   * ```typescript
   * const config = ExtensionConfig.getInstance();
   * const inspection = config.inspect('enzyme.logging.level');
   * console.log('Default:', inspection?.defaultValue);
   * console.log('Global:', inspection?.globalValue);
   * console.log('Workspace:', inspection?.workspaceValue);
   * ```
   */
  public inspect<K extends ExtensionSettingKey>(
    key: K
  ): vscode.WorkspaceConfiguration['inspect'] extends (...args: any[]) => infer R ? R : never {
    const config = vscode.workspace.getConfiguration('enzyme');
    const settingKey = key.replace('enzyme.', '');
    return config.inspect(settingKey) as any;
  }

  /**
   * Subscribe to configuration changes
   *
   * @param key - Setting key to watch, or '*' for all settings
   * @param callback - Function called when the setting changes
   * @returns Disposable to unsubscribe from changes
   *
   * @example
   * ```typescript
   * const config = ExtensionConfig.getInstance();
   * const disposable = config.onChange('enzyme.logging.level', (event) => {
   *   console.log('Log level changed to:', event.newValue);
   * });
   * // Later: disposable.dispose();
   * ```
   */
  public onChange(
    key: ExtensionSettingKey | '*',
    callback: (event: ConfigChangeEvent) => void
  ): vscode.Disposable {
    const listeners = this.listeners.get(key) || [];
    listeners.push(callback);
    this.listeners.set(key, listeners);

    return new vscode.Disposable(() => {
      const currentListeners = this.listeners.get(key) || [];
      const index = currentListeners.indexOf(callback);
      if (index > -1) {
        currentListeners.splice(index, 1);
      }
    });
  }

  /**
   * Handle configuration change events
   * @param e
   */
  private handleConfigChange(e: vscode.ConfigurationChangeEvent): void {
    if (!e.affectsConfiguration('enzyme')) {
      return;
    }

    for (const key of Object.keys(DEFAULT_SETTINGS) as ExtensionSettingKey[]) {
      if (e.affectsConfiguration(key)) {
        const newValue = this.get(key);
        const event: ConfigChangeEvent = {
          key,
          newValue,
          oldValue: undefined, // VS Code doesn't provide old value
          scope: 'workspace',
        };

        // Notify specific listeners
        const specificListeners = this.listeners.get(key) || [];
        specificListeners.forEach((listener) => listener(event));

        // Notify wildcard listeners
        const wildcardListeners = this.listeners.get('*') || [];
        wildcardListeners.forEach((listener) => listener(event));
      }
    }
  }

  /**
   * Export all settings as JSON string
   *
   * @param scope - Optional configuration scope to export from
   * @returns JSON string containing all current settings
   *
   * @example
   * ```typescript
   * const config = ExtensionConfig.getInstance();
   * const json = config.exportSettings();
   * await fs.writeFile('enzyme-settings.json', json);
   * ```
   */
  public exportSettings(scope?: vscode.ConfigurationScope): string {
    const settings = this.getAll(scope);
    return JSON.stringify(settings, null, 2);
  }

  /**
   * Import settings from JSON string
   *
   * @param json - JSON string containing settings to import
   * @param configTarget - Where to save: Global, Workspace, or WorkspaceFolder
   * @returns Promise that resolves when all settings are imported
   * @throws Error if JSON is invalid or import fails
   *
   * @example
   * ```typescript
   * const config = ExtensionConfig.getInstance();
   * const json = await fs.readFile('enzyme-settings.json', 'utf-8');
   * await config.importSettings(json);
   * ```
   */
  public async importSettings(
    json: string,
    configTarget: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Workspace
  ): Promise<void> {
    try {
      const settings = JSON.parse(json) as Partial<EnzymeExtensionSettings>;

      for (const [key, value] of Object.entries(settings)) {
        if (key in DEFAULT_SETTINGS) {
          await this.set(key as ExtensionSettingKey, value as any, configTarget);
        }
      }
    } catch (error) {
      throw new Error(`Failed to import settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate all current settings
   *
   * @returns Validation result with errors array
   *
   * @example
   * ```typescript
   * const config = ExtensionConfig.getInstance();
   * const result = config.validate();
   * if (!result.valid) {
   *   console.error('Invalid settings:', result.errors);
   * }
   * ```
   */
  public validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const settings = this.getAll();

    // Validate port numbers
    const ports = [
      'enzyme.devServer.port',
      'enzyme.debug.port',
    ] as const;

    for (const portKey of ports) {
      const port = settings[portKey];
      if (port !== undefined && (port < 1024 || port > 65535)) {
        errors.push(`${portKey} must be between 1024 and 65535`);
      }
    }

    // Validate debounce
    const debounce = settings['enzyme.analysis.debounceMs'];
    if (debounce !== undefined && debounce < 0) {
      errors.push('enzyme.analysis.debounceMs must be positive');
    }

    // Validate cache size
    const cacheSize = settings['enzyme.performance.maxCacheSize'];
    if (cacheSize !== undefined && cacheSize < 1) {
      errors.push('enzyme.performance.maxCacheSize must be at least 1');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Dispose all resources and clean up listeners
   * Should be called when extension is deactivated
   *
   * @example
   * ```typescript
   * export function deactivate() {
   *   ExtensionConfig.getInstance().dispose();
   * }
   * ```
   */
  public dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.listeners.clear();
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Get global extension config instance
 */
export function getExtensionConfig(): ExtensionConfig {
  return ExtensionConfig.getInstance();
}

/**
 * Get extension setting value
 * @param key
 * @param scope
 */
export function getSetting<K extends ExtensionSettingKey>(
  key: K,
  scope?: vscode.ConfigurationScope
): EnzymeExtensionSettings[K] {
  return getExtensionConfig().get(key, scope);
}

/**
 * Set extension setting value
 * @param key
 * @param value
 * @param target
 */
export async function setSetting<K extends ExtensionSettingKey>(
  key: K,
  value: EnzymeExtensionSettings[K],
  target?: vscode.ConfigurationTarget
): Promise<void> {
  return getExtensionConfig().set(key, value, target);
}

/**
 * Subscribe to setting changes
 * @param key
 * @param callback
 */
export function onSettingChange(
  key: ExtensionSettingKey | '*',
  callback: (event: ConfigChangeEvent) => void
): vscode.Disposable {
  return getExtensionConfig().onChange(key, callback);
}
