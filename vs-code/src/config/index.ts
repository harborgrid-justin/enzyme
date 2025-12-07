/**
 * @file Configuration & Settings Management
 * @description Main entry point for Enzyme VS Code extension configuration system
 */

import * as vscode from 'vscode';

// =============================================================================
// Extension Configuration
// =============================================================================

export {
  ExtensionConfig,
  getExtensionConfig,
  getSetting,
  setSetting,
  onSettingChange,
  DEFAULT_SETTINGS,
  type EnzymeExtensionSettings,
  type ExtensionSettingKey,
  type ConfigChangeEvent,
} from './extension-config';

// =============================================================================
// Project Configuration
// =============================================================================

export {
  ProjectConfig,
  WorkspaceConfigManager,
  getWorkspaceConfigManager,
  getActiveProjectConfig,
  type ConfigFileType,
  type ConfigFileInfo,
  type ProjectConfigChangeEvent,
} from './project-config';

// =============================================================================
// Configuration Schemas
// =============================================================================

export {
  enzymeConfigSchema,
  routeConfigSchema,
  authConfigSchema,
  apiConfigSchema,
  featureFlagsConfigSchema,
  performanceConfigSchema,
  devServerConfigSchema,
  buildConfigSchema,
  monitoringConfigSchema,
  validateEnzymeConfig,
  parseEnzymeConfig,
  getDefaultEnzymeConfig,
  validatePartialConfig,
  schemaRegistry,
  getSchema,
  validateWithSchema,
  type EnzymeConfigSchema,
  type RouteConfig,
  type RoutesConfig,
  type AuthConfig,
  type ApiConfig,
  type FeatureConfig,
  type FeatureFlagsConfig,
  type PerformanceConfig,
  type DevServerConfig,
  type BuildConfig,
  type MonitoringConfig,
  type SchemaKey,
} from './config-schema';

// =============================================================================
// Configuration Validation
// =============================================================================

export {
  ConfigValidator,
  ConfigValidatorProvider,
  getValidatorProvider,
  getValidator,
} from './config-validator';
export type { ValidationError, ValidationResult } from './config-validator';

// =============================================================================
// Configuration Providers
// =============================================================================

export {
  ConfigCompletionProvider,
  registerConfigCompletionProvider,
} from './config-completion-provider';

export {
  ConfigHoverProvider,
  registerConfigHoverProvider,
} from './config-hover-provider';

// =============================================================================
// Environment Management
// =============================================================================

export {
  EnvManager,
  WorkspaceEnvManager,
  getWorkspaceEnvManager,
  type EnvFileType,
  type EnvVariable,
  type EnvFileInfo,
  type SecurityWarning as Env} from './env-manager';

// =============================================================================
// Feature Flags
// =============================================================================

export {
  FeatureFlagsManager,
  WorkspaceFeatureFlagsManager,
  getWorkspaceFeatureFlagsManager,
  type FeatureFlag,
  type FlagContext,
  type FlagEvaluationResult,
  type FlagAuditEntry,
} from './feature-flags-manager';

// =============================================================================
// Workspace Configuration
// =============================================================================

export {
  WorkspaceConfig,
  MultiRootWorkspaceManager,
  getMultiRootWorkspaceManager,
  getActiveWorkspaceConfig,
  applyRecommendedSettingsToWorkspace,
  type WorkspaceSettings,
  type RecommendedSettings,
} from './workspace-config';

// =============================================================================
// Settings UI
// =============================================================================

export {
  SettingsWebView,
  registerSettingsWebView,
} from './settings-ui/settings-webview';

export {
  generateSettingsHTML,
} from './settings-ui/settings-html';

// =============================================================================
// Configuration Migration
// =============================================================================

export {
  ConfigMigrator,
  promptMigration,
  type Migration,
  type MigrationFn,
  type MigrationResult,
} from './migration/config-migrator';

// =============================================================================
// Configuration Templates
// =============================================================================

export {
  configTemplates,
  minimalTemplate,
  standardTemplate,
  fullTemplate,
  authTemplate,
  apiTemplate,
  featureFlagsTemplate,
  developmentTemplate,
  productionTemplate,
  stagingTemplate,
  getTemplate,
  getTemplatesByCategory,
  generateConfigFromTemplate,
  mergeTemplate,
  type ConfigTemplate,
} from './templates/config-templates';

// Imports for internal use
import { registerConfigCompletionProvider } from './config-completion-provider';
import { registerConfigHoverProvider } from './config-hover-provider';
import { getValidatorProvider, getValidator } from './config-validator';
import { getWorkspaceEnvManager } from './env-manager';
import { getWorkspaceFeatureFlagsManager } from './feature-flags-manager';
import { getWorkspaceConfigManager } from './project-config';

// =============================================================================
// Configuration Features Registration
// =============================================================================

/**
 * Register all configuration features
 */
export function registerConfigFeatures(context: vscode.ExtensionContext): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [];

  // Register completion provider
  try {
    const completionProvider = registerConfigCompletionProvider();
    if (completionProvider) {
      disposables.push(completionProvider);
    }
  } catch { /* Provider not available */ }

  // Register hover provider
  try {
    const hoverProvider = registerConfigHoverProvider();
    if (hoverProvider) {
      disposables.push(hoverProvider);
    }
  } catch { /* Provider not available */ }

  // Register settings webview
  // disposables.push(registerSettingsWebView(context));

  // Register commands
  disposables.push(registerConfigCommands(context));

  // Initialize validator provider
  try {
    const validatorProvider = getValidatorProvider();
    if (validatorProvider) {
      disposables.push(validatorProvider);
    }
  } catch { /* Provider not available */ }

  // Initialize workspace config manager
  try {
    const workspaceManager = getWorkspaceConfigManager();
    if (workspaceManager) {
      disposables.push(workspaceManager);
    }
  } catch { /* Manager not available */ }

  return disposables;
}

/**
 * Register configuration commands
 */
function registerConfigCommands(context: vscode.ExtensionContext): vscode.Disposable {
  const disposables: vscode.Disposable[] = [];

  // Open settings UI
  disposables.push(
    vscode.commands.registerCommand('enzyme.openSettings', () => {
      const webview = new (require('./settings-ui/settings-webview').SettingsWebView)(context);
      webview.show();
    })
  );

  // Create config file
  disposables.push(
    vscode.commands.registerCommand('enzyme.createConfig', async () => {
      await createConfigFile();
    })
  );

  // Create config from template
  disposables.push(
    vscode.commands.registerCommand('enzyme.createConfigFromTemplate', async () => {
      await createConfigFromTemplate();
    })
  );

  // Validate config
  disposables.push(
    vscode.commands.registerCommand('enzyme.validateConfig', async () => {
      await validateConfig();
    })
  );

  // Generate .env.example
  disposables.push(
    vscode.commands.registerCommand('enzyme.generateEnvExample', async () => {
      await generateEnvExample();
    })
  );

  // Toggle feature flag
  disposables.push(
    vscode.commands.registerCommand('enzyme.toggleFeatureFlag', async () => {
      await toggleFeatureFlag();
    })
  );

  // Apply recommended settings
  // disposables.push(
  //   vscode.commands.registerCommand('enzyme.applyRecommendedSettings', async () => {
  //     await applyRecommendedSettingsToWorkspace();
  //   })
  // );

  // Migrate config
  disposables.push(
    vscode.commands.registerCommand('enzyme.migrateConfig', async () => {
      await migrateConfig();
    })
  );

  return new vscode.Disposable(() => {
    disposables.forEach((d) => d.dispose());
  });
}

// =============================================================================
// Command Implementations
// =============================================================================

/**
 * Create config file
 */
async function createConfigFile(): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder open');
    return;
  }

  const type = await vscode.window.showQuickPick(
    [
      { label: 'TypeScript', value: 'typescript' as const },
      { label: 'JavaScript', value: 'javascript' as const },
      { label: 'JSON', value: 'json' as const },
    ],
    { placeHolder: 'Select config file type' }
  );

  if (!type) {
    return;
  }

  try {
    const filePath = vscode.Uri.joinPath(workspaceFolder.uri, `enzyme.config.${type.value === 'typescript' ? 'ts' : type.value === 'javascript' ? 'js' : 'json'}`);
    const defaultContent = type.value === 'json' ? '{}' : 'export default {};';
    await vscode.workspace.fs.writeFile(filePath, Buffer.from(defaultContent, 'utf-8'));
    vscode.window.showInformationMessage(`Created ${filePath.fsPath}`);

    const doc = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(doc);
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to create config: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Create config from template
 */
async function createConfigFromTemplate(): Promise<void> {
  const { configTemplates, generateConfigFromTemplate } = require('./templates/config-templates');

  const items = configTemplates.map((t: any) => ({
    label: t.name,
    description: t.category,
    detail: t.description,
    template: t,
  }));

  const selected = await vscode.window.showQuickPick(items, { placeHolder: 'Select a configuration template' });

  if (!selected) {
    return;
  }

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder open');
    return;
  }

  const content = generateConfigFromTemplate((selected as any).template);
  const filePath = vscode.Uri.joinPath(workspaceFolder.uri, 'enzyme.config.ts');

  try {
    await vscode.workspace.fs.writeFile(filePath, Buffer.from(content, 'utf-8'));
    vscode.window.showInformationMessage(`Created config from ${(selected as any).label} template`);

    const doc = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(doc);
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to create config: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Validate current config
 */
async function validateConfig(): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder open');
    return;
  }

  try {
    const validator = getValidator();
    const configPath = vscode.Uri.joinPath(workspaceFolder.uri, 'enzyme.config.ts');
    const doc = await vscode.workspace.openTextDocument(configPath);
    const result = await validator.validateDocument(doc);

    if (result.valid) {
      vscode.window.showInformationMessage('Configuration is valid');
    } else {
      vscode.window.showErrorMessage(
        `Configuration has ${result.errors.length} error(s)`
      );
    }
  } catch (error) {
    vscode.window.showErrorMessage('No Enzyme project config found');
  }
}

/**
 * Generate .env.example
 */
async function generateEnvExample(): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder open');
    return;
  }

  try {
    const envManager = getWorkspaceEnvManager();
    const manager = await envManager.getManager(workspaceFolder);
    const examplePath = await manager.generateEnvExample();
    vscode.window.showInformationMessage(`Generated ${examplePath}`);
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to generate .env.example: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Toggle feature flag
 */
async function toggleFeatureFlag(): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder open');
    return;
  }

  try {
    const flagsManager = getWorkspaceFeatureFlagsManager();
    const manager = await flagsManager.getManager(workspaceFolder);

    const flags = Array.from(manager.getFlags().values());
    if (flags.length === 0) {
      vscode.window.showInformationMessage('No feature flags configured');
      return;
    }

    const items = flags.map((flag: any) => ({
      label: flag.key,
      description: flag.enabled ? 'Enabled' : 'Disabled',
      detail: flag.description,
      flag,
    }));

    const selected = await vscode.window.showQuickPick(items, { placeHolder: 'Select a feature flag to toggle' });

    if (!selected) {
      return;
    }

    await manager.toggleOverride((selected as any).flag.key);
    vscode.window.showInformationMessage(`Toggled ${(selected as any).flag.key}`);
  } catch (error) {
    vscode.window.showErrorMessage('Feature flags manager not available');
  }
}

/**
 * Migrate config
 */
async function migrateConfig(): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder open');
    return;
  }

  try {
    const { promptMigration } = require('./migration/config-migrator');
    await promptMigration(workspaceFolder, {});
  } catch (error) {
    vscode.window.showErrorMessage('No Enzyme project config found');
  }
}
