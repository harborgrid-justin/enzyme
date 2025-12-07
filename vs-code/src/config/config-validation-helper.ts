/**
 * @file Configuration Validation Helper
 * @description Runtime validation for extension settings with detailed error messages
 */

import * as vscode from 'vscode';
import type { ExtensionSettingKey, EnzymeExtensionSettings } from './extension-config';

// =============================================================================
// Types
// =============================================================================

/**
 * Validation error
 */
export interface ConfigValidationError {
  key: ExtensionSettingKey;
  value: unknown;
  expected: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Validation result
 */
export interface ConfigValidationResult {
  valid: boolean;
  errors: ConfigValidationError[];
  warnings: ConfigValidationError[];
}

// =============================================================================
// Validators
// =============================================================================

/**
 * Validate port number
 * @param value
 * @param key
 */
function validatePort(value: unknown, key: ExtensionSettingKey): ConfigValidationError | null {
  if (typeof value !== 'number') {
    return {
      key,
      value,
      expected: 'number between 1024-65535',
      message: `${key} must be a number`,
      severity: 'error',
    };
  }

  if (value < 1024 || value > 65535) {
    return {
      key,
      value,
      expected: 'number between 1024-65535',
      message: `${key} must be between 1024 and 65535 (got ${value})`,
      severity: 'error',
    };
  }

  return null;
}

/**
 * Validate enum value
 * @param value
 * @param key
 * @param validValues
 */
function validateEnum(
  value: unknown,
  key: ExtensionSettingKey,
  validValues: readonly string[]
): ConfigValidationError | null {
  if (typeof value !== 'string') {
    return {
      key,
      value,
      expected: validValues.join(' | '),
      message: `${key} must be a string`,
      severity: 'error',
    };
  }

  if (!validValues.includes(value)) {
    return {
      key,
      value,
      expected: validValues.join(' | '),
      message: `${key} must be one of: ${validValues.join(', ')} (got "${value}")`,
      severity: 'error',
    };
  }

  return null;
}

/**
 * Validate number range
 * @param value
 * @param key
 * @param min
 * @param max
 */
function validateNumberRange(
  value: unknown,
  key: ExtensionSettingKey,
  min: number,
  max: number
): ConfigValidationError | null {
  if (typeof value !== 'number') {
    return {
      key,
      value,
      expected: `number between ${min}-${max}`,
      message: `${key} must be a number`,
      severity: 'error',
    };
  }

  if (value < min || value > max) {
    return {
      key,
      value,
      expected: `number between ${min}-${max}`,
      message: `${key} must be between ${min} and ${max} (got ${value})`,
      severity: 'error',
    };
  }

  return null;
}

/**
 * Validate boolean
 * @param value
 * @param key
 */
function validateBoolean(value: unknown, key: ExtensionSettingKey): ConfigValidationError | null {
  if (typeof value !== 'boolean') {
    return {
      key,
      value,
      expected: 'boolean',
      message: `${key} must be a boolean (true or false)`,
      severity: 'error',
    };
  }

  return null;
}

/**
 * Validate string
 * @param value
 * @param key
 */
function validateString(value: unknown, key: ExtensionSettingKey): ConfigValidationError | null {
  if (typeof value !== 'string') {
    return {
      key,
      value,
      expected: 'string',
      message: `${key} must be a string`,
      severity: 'error',
    };
  }

  return null;
}

/**
 * Validate string array
 * @param value
 * @param key
 */
function validateStringArray(value: unknown, key: ExtensionSettingKey): ConfigValidationError | null {
  if (!Array.isArray(value)) {
    return {
      key,
      value,
      expected: 'string[]',
      message: `${key} must be an array`,
      severity: 'error',
    };
  }

  if (!value.every((item) => typeof item === 'string')) {
    return {
      key,
      value,
      expected: 'string[]',
      message: `${key} must be an array of strings`,
      severity: 'error',
    };
  }

  return null;
}

// =============================================================================
// Validation Rules
// =============================================================================

/**
 * Setting-specific validation rules
 */
const VALIDATION_RULES: Partial<
  Record<ExtensionSettingKey, (value: unknown) => ConfigValidationError | null>
> = {
  'enzyme.telemetry.enabled': (value) => validateBoolean(value, 'enzyme.telemetry.enabled'),
  'enzyme.logging.level': (value) =>
    validateEnum(value, 'enzyme.logging.level', ['debug', 'info', 'warn', 'error']),

  'enzyme.cli.path': (value) => validateString(value, 'enzyme.cli.path'),
  'enzyme.cli.autoInstall': (value) => validateBoolean(value, 'enzyme.cli.autoInstall'),

  'enzyme.generator.componentStyle': (value) =>
    validateEnum(value, 'enzyme.generator.componentStyle', ['function', 'arrow']),
  'enzyme.generator.testFramework': (value) =>
    validateEnum(value, 'enzyme.generator.testFramework', ['vitest', 'jest']),
  'enzyme.generator.cssFramework': (value) =>
    validateEnum(value, 'enzyme.generator.cssFramework', [
      'tailwind',
      'css-modules',
      'styled-components',
      'emotion',
    ]),

  'enzyme.validation.onSave': (value) => validateBoolean(value, 'enzyme.validation.onSave'),
  'enzyme.validation.strict': (value) => validateBoolean(value, 'enzyme.validation.strict'),

  'enzyme.analysis.autoRun': (value) => validateBoolean(value, 'enzyme.analysis.autoRun'),
  'enzyme.analysis.onSave': (value) => validateBoolean(value, 'enzyme.analysis.onSave'),
  'enzyme.analysis.debounceMs': (value) =>
    validateNumberRange(value, 'enzyme.analysis.debounceMs', 0, 5000),

  'enzyme.diagnostics.enabled': (value) => validateBoolean(value, 'enzyme.diagnostics.enabled'),
  'enzyme.diagnostics.severity': (value) =>
    validateEnum(value, 'enzyme.diagnostics.severity', ['error', 'warning', 'info', 'hint']),
  'enzyme.diagnostics.showInline': (value) =>
    validateBoolean(value, 'enzyme.diagnostics.showInline'),

  'enzyme.codeLens.enabled': (value) => validateBoolean(value, 'enzyme.codeLens.enabled'),
  'enzyme.codeLens.showReferences': (value) =>
    validateBoolean(value, 'enzyme.codeLens.showReferences'),
  'enzyme.codeLens.showImplementations': (value) =>
    validateBoolean(value, 'enzyme.codeLens.showImplementations'),

  'enzyme.inlayHints.enabled': (value) => validateBoolean(value, 'enzyme.inlayHints.enabled'),
  'enzyme.inlayHints.showTypes': (value) => validateBoolean(value, 'enzyme.inlayHints.showTypes'),
  'enzyme.inlayHints.showParameters': (value) =>
    validateBoolean(value, 'enzyme.inlayHints.showParameters'),

  'enzyme.formatting.enabled': (value) => validateBoolean(value, 'enzyme.formatting.enabled'),
  'enzyme.formatting.onSave': (value) => validateBoolean(value, 'enzyme.formatting.onSave'),
  'enzyme.formatting.prettier': (value) => validateBoolean(value, 'enzyme.formatting.prettier'),

  'enzyme.completion.enabled': (value) => validateBoolean(value, 'enzyme.completion.enabled'),
  'enzyme.completion.autoImport': (value) =>
    validateBoolean(value, 'enzyme.completion.autoImport'),
  'enzyme.completion.snippets': (value) => validateBoolean(value, 'enzyme.completion.snippets'),

  'enzyme.devServer.port': (value) => validatePort(value, 'enzyme.devServer.port'),
  'enzyme.devServer.host': (value) => validateString(value, 'enzyme.devServer.host'),
  'enzyme.devServer.autoStart': (value) => validateBoolean(value, 'enzyme.devServer.autoStart'),

  'enzyme.debug.enabled': (value) => validateBoolean(value, 'enzyme.debug.enabled'),
  'enzyme.debug.connectAutomatically': (value) =>
    validateBoolean(value, 'enzyme.debug.connectAutomatically'),
  'enzyme.debug.port': (value) => validatePort(value, 'enzyme.debug.port'),

  'enzyme.performance.monitoring.enabled': (value) =>
    validateBoolean(value, 'enzyme.performance.monitoring.enabled'),
  'enzyme.performance.caching': (value) => validateBoolean(value, 'enzyme.performance.caching'),
  'enzyme.performance.maxCacheSize': (value) =>
    validateNumberRange(value, 'enzyme.performance.maxCacheSize', 1, 1000),

  'enzyme.security.scanning.enabled': (value) =>
    validateBoolean(value, 'enzyme.security.scanning.enabled'),

  'enzyme.imports.autoOptimize': (value) =>
    validateBoolean(value, 'enzyme.imports.autoOptimize'),

  'enzyme.snippets.enabled': (value) => validateBoolean(value, 'enzyme.snippets.enabled'),

  'enzyme.codeActions.enabled': (value) => validateBoolean(value, 'enzyme.codeActions.enabled'),

  'enzyme.explorer.autoRefresh': (value) =>
    validateBoolean(value, 'enzyme.explorer.autoRefresh'),

  'enzyme.format.onSave': (value) => validateBoolean(value, 'enzyme.format.onSave'),

  'enzyme.experimental.features': (value) =>
    validateStringArray(value, 'enzyme.experimental.features'),
};

// =============================================================================
// Config Validator
// =============================================================================

/**
 * Configuration validator
 */
export class ConfigValidationHelper {
  /**
   * Validate a single setting
   * @param key
   * @param value
   */
  public static validateSetting(
    key: ExtensionSettingKey,
    value: unknown
  ): ConfigValidationError | null {
    const validator = VALIDATION_RULES[key];
    if (!validator) {
      return null;
    }

    return validator(value);
  }

  /**
   * Validate all settings
   * @param scope
   */
  public static validateAllSettings(
    scope?: vscode.ConfigurationScope
  ): ConfigValidationResult {
    const config = vscode.workspace.getConfiguration('enzyme', scope);
    const errors: ConfigValidationError[] = [];
    const warnings: ConfigValidationError[] = [];

    for (const [key, validator] of Object.entries(VALIDATION_RULES)) {
      const settingKey = key.replace('enzyme.', '');
      const value = config.get(settingKey);

      if (value === undefined) {
        continue;
      }

      const error = validator(value);
      if (error) {
        if (error.severity === 'error') {
          errors.push(error);
        } else {
          warnings.push(error);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Display validation errors to user
   * @param result
   */
  public static async showValidationErrors(result: ConfigValidationResult): Promise<void> {
    if (result.valid && result.warnings.length === 0) {
      vscode.window.showInformationMessage('All Enzyme settings are valid!');
      return;
    }

    if (result.errors.length > 0) {
      const errorMessages = result.errors.map((err) => `- ${err.message}`).join('\n');
      const action = await vscode.window.showErrorMessage(
        `Enzyme configuration has ${result.errors.length} error(s):\n${errorMessages}`,
        'Open Settings'
      );

      if (action === 'Open Settings') {
        vscode.commands.executeCommand('workbench.action.openSettings', '@ext:missionfabric.enzyme-vscode');
      }
    }

    if (result.warnings.length > 0) {
      const warningMessages = result.warnings.map((warn) => `- ${warn.message}`).join('\n');
      vscode.window.showWarningMessage(
        `Enzyme configuration has ${result.warnings.length} warning(s):\n${warningMessages}`
      );
    }
  }

  /**
   * Get safe configuration value with validation
   * @param key
   * @param defaultValue
   * @param scope
   */
  public static getSafeSetting<K extends ExtensionSettingKey>(
    key: K,
    defaultValue: EnzymeExtensionSettings[K],
    scope?: vscode.ConfigurationScope
  ): EnzymeExtensionSettings[K] {
    const config = vscode.workspace.getConfiguration('enzyme', scope);
    const settingKey = key.replace('enzyme.', '');
    const value = config.get(settingKey);

    if (value === undefined) {
      return defaultValue;
    }

    const error = this.validateSetting(key, value);
    if (error) {
      console.warn(`Invalid config value for ${key}:`, error.message);
      return defaultValue;
    }

    return value as EnzymeExtensionSettings[K];
  }
}

/**
 * Create a command to validate all settings
 * @param context
 */
export function registerValidationCommand(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('enzyme.validateSettings', async () => {
      const result = ConfigValidationHelper.validateAllSettings();
      await ConfigValidationHelper.showValidationErrors(result);
    })
  );
}
