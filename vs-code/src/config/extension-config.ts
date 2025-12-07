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
  private listeners: Map<string, Array<(event: ConfigChangeEvent) => void>> = new Map();
  private disposables: vscode.Disposable[] = [];

  private constructor() {
    // Listen for configuration changes
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        this.handleConfigChange(e);
      })
    );
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ExtensionConfig {
    if (!ExtensionConfig.instance) {
      ExtensionConfig.instance = new ExtensionConfig();
    }
    return ExtensionConfig.instance;
  }

  /**
   * Get configuration value
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
   * Get all settings
   */
  public getAll(scope?: vscode.ConfigurationScope): Partial<EnzymeExtensionSettings> {
    const config = vscode.workspace.getConfiguration('enzyme', scope);
    const settings: Partial<EnzymeExtensionSettings> = {};

    for (const key of Object.keys(DEFAULT_SETTINGS) as ExtensionSettingKey[]) {
      const settingKey = key.replace('enzyme.', '');
      const value = config.get(settingKey);
      if (value !== undefined) {
        settings[key] = value as any;
      }
    }

    return settings;
  }

  /**
   * Reset to default settings
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
   * Check if setting exists
   */
  public has(key: ExtensionSettingKey, scope?: vscode.ConfigurationScope): boolean {
    const config = vscode.workspace.getConfiguration('enzyme', scope);
    const settingKey = key.replace('enzyme.', '');
    return config.has(settingKey);
  }

  /**
   * Inspect setting across all scopes
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
   * Export settings as JSON
   */
  public exportSettings(scope?: vscode.ConfigurationScope): string {
    const settings = this.getAll(scope);
    return JSON.stringify(settings, null, 2);
  }

  /**
   * Import settings from JSON
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
   * Validate settings
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
   * Dispose resources
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
 */
export function getSetting<K extends ExtensionSettingKey>(
  key: K,
  scope?: vscode.ConfigurationScope
): EnzymeExtensionSettings[K] {
  return getExtensionConfig().get(key, scope);
}

/**
 * Set extension setting value
 */
export function setSetting<K extends ExtensionSettingKey>(
  key: K,
  value: EnzymeExtensionSettings[K],
  target?: vscode.ConfigurationTarget
): Promise<void> {
  return getExtensionConfig().set(key, value, target);
}

/**
 * Subscribe to setting changes
 */
export function onSettingChange(
  key: ExtensionSettingKey | '*',
  callback: (event: ConfigChangeEvent) => void
): vscode.Disposable {
  return getExtensionConfig().onChange(key, callback);
}
