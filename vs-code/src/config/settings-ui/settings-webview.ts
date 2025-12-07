/**
 * @file Settings WebView
 * @description Custom settings UI for Enzyme extension
 */

import * as vscode from 'vscode';
import { getExtensionConfig, DEFAULT_SETTINGS, type ExtensionSettingKey , ExtensionConfig} from '../extension-config';
import { generateSettingsHTML } from './settings-html';

// =============================================================================
// Settings WebView Panel
// =============================================================================

/**
 * Settings webview panel
 */
export class SettingsWebView {
  private panel: vscode.WebviewPanel | null = null;
  private disposables: vscode.Disposable[] = [];
  private readonly config: ExtensionConfig;

  /**
   *
   * @param context
   */
  constructor(private readonly context: vscode.ExtensionContext) {
    this.config = getExtensionConfig();
  }

  /**
   * Show settings panel
   */
  public show(): void {
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'enzymeSettings',
      'Enzyme Settings',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.context.extensionUri],
      }
    );

    this.panel.webview.html = this.getWebviewContent();
    this.setupMessageHandling();

    this.panel.onDidDispose(() => {
      this.panel = null;
      this.dispose();
    }, null, this.disposables);
  }

  /**
   * Get webview HTML content
   */
  private getWebviewContent(): string {
    const settings = this.config.getAll();
    const nonce = this.getNonce();

    return generateSettingsHTML({
      settings,
      defaultSettings: DEFAULT_SETTINGS,
      nonce,
      cspSource: this.panel!.webview.cspSource,
    });
  }

  /**
   * Setup message handling
   */
  private setupMessageHandling(): void {
    this.panel!.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.type) {
          case 'updateSetting':
            await this.handleUpdateSetting(message.key, message.value);
            break;

          case 'resetSetting':
            await this.handleResetSetting(message.key);
            break;

          case 'resetAll':
            await this.handleResetAll();
            break;

          case 'exportSettings':
            await this.handleExportSettings();
            break;

          case 'importSettings':
            await this.handleImportSettings();
            break;

          case 'validateSettings':
            await this.handleValidateSettings();
            break;
        }
      },
      null,
      this.disposables
    );
  }

  /**
   * Handle update setting
   * @param key
   * @param value
   */
  private async handleUpdateSetting(key: string, value: unknown): Promise<void> {
    try {
      await this.config.set(
        key as ExtensionSettingKey,
        value as any,
        vscode.ConfigurationTarget.Workspace
      );

      this.panel!.webview.postMessage({
        type: 'settingUpdated',
        key,
        value,
        success: true,
      });
    } catch (error) {
      this.panel!.webview.postMessage({
        type: 'settingUpdated',
        key,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Handle reset setting
   * @param key
   */
  private async handleResetSetting(key: string): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration('enzyme');
      const settingKey = key.replace('enzyme.', '');

      await config.update(
        settingKey,
        undefined,
        vscode.ConfigurationTarget.Workspace
      );

      this.panel!.webview.postMessage({
        type: 'settingReset',
        key,
        success: true,
      });
    } catch (error) {
      this.panel!.webview.postMessage({
        type: 'settingReset',
        key,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Handle reset all settings
   */
  private async handleResetAll(): Promise<void> {
    const result = await vscode.window.showWarningMessage(
      'Reset all Enzyme settings to defaults?',
      { modal: true },
      'Reset'
    );

    if (result !== 'Reset') {
      return;
    }

    try {
      await this.config.resetToDefaults();

      this.panel!.webview.postMessage({
        type: 'allSettingsReset',
        success: true,
      });

      vscode.window.showInformationMessage('All settings reset to defaults');
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to reset settings: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Handle export settings
   */
  private async handleExportSettings(): Promise<void> {
    const uri = await vscode.window.showSaveDialog({
      filters: { 'JSON': ['json'] },
      defaultUri: vscode.Uri.file('enzyme-settings.json'),
    });

    if (!uri) {
      return;
    }

    try {
      const json = this.config.exportSettings();
      await vscode.workspace.fs.writeFile(uri, Buffer.from(json, 'utf-8'));

      vscode.window.showInformationMessage('Settings exported successfully');
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to export settings: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Handle import settings
   */
  private async handleImportSettings(): Promise<void> {
    const uris = await vscode.window.showOpenDialog({
      filters: { 'JSON': ['json'] },
      canSelectMany: false,
    });

    if (!uris || uris.length === 0) {
      return;
    }

    try {
      const firstUri = uris[0];
      if (!firstUri) {
        return;
      }
      const content = await vscode.workspace.fs.readFile(firstUri);
      const json = Buffer.from(content).toString('utf-8');

      await this.config.importSettings(json);

      // Refresh webview
      this.panel!.webview.html = this.getWebviewContent();

      vscode.window.showInformationMessage('Settings imported successfully');
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to import settings: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Handle validate settings
   */
  private async handleValidateSettings(): Promise<void> {
    const result = this.config.validate();

    this.panel!.webview.postMessage({
      type: 'validationResult',
      valid: result.valid,
      errors: result.errors,
    });
  }

  /**
   * Generate nonce for CSP
   */
  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  /**
   * Dispose webview
   */
  public dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}

// =============================================================================
// Registration
// =============================================================================

/**
 * Register settings webview command
 * @param context
 */
export function registerSettingsWebView(context: vscode.ExtensionContext): vscode.Disposable {
  const webview = new SettingsWebView(context);

  return vscode.commands.registerCommand('enzyme.openSettings', () => {
    webview.show();
  });
}
