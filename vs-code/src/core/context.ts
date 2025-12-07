/**
 * Enzyme Extension Context
 * Singleton class that manages the extension's context, state, and resources
 */

import * as vscode from 'vscode';
import {
  EXTENSION_ID,
  EXTENSION_NAME as _EXTENSION_NAME,
  OUTPUT_CHANNELS,
  CACHE_KEYS,
  CONTEXT_KEYS,
  STATUS_BAR_PRIORITY,
} from './constants';
import { logger } from './logger';
import type { Logger} from './logger';
import type { EnzymeConfig, EnzymeWorkspace, PackageJson, StatusBarItemConfig } from '../types';

/**
 * EnzymeExtensionContext - Singleton class managing extension state and resources
 */
export class EnzymeExtensionContext {
  private static instance: EnzymeExtensionContext | null = null;
  private readonly context: vscode.ExtensionContext;
  private readonly _logger: Logger;
  private readonly _outputChannel: vscode.OutputChannel;
  private readonly _statusBarItems: Map<string, vscode.StatusBarItem>;
  private readonly _diagnosticCollection: vscode.DiagnosticCollection;
  private readonly _eventEmitter: vscode.EventEmitter<string>;
  private _workspace: EnzymeWorkspace | null = null;
  private _disposables: vscode.Disposable[] = [];

  /**
   *
   * @param context
   */
  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this._logger = logger;
    this._outputChannel = vscode.window.createOutputChannel(OUTPUT_CHANNELS.MAIN);
    this._statusBarItems = new Map();
    this._diagnosticCollection = vscode.languages.createDiagnosticCollection(EXTENSION_ID);
    this._eventEmitter = new vscode.EventEmitter<string>();

    // Add to disposables
    this._disposables.push(this._outputChannel);
    this._disposables.push(this._diagnosticCollection);
    this._disposables.push(this._eventEmitter);

    this._logger.info('EnzymeExtensionContext initialized');
  }

  /**
   * Initialize the singleton instance
   * @param context
   */
  public static initialize(context: vscode.ExtensionContext): EnzymeExtensionContext {
    if (EnzymeExtensionContext.instance) {
      throw new Error('EnzymeExtensionContext already initialized');
    }
    EnzymeExtensionContext.instance = new EnzymeExtensionContext(context);
    return EnzymeExtensionContext.instance;
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): EnzymeExtensionContext {
    if (!EnzymeExtensionContext.instance) {
      throw new Error('EnzymeExtensionContext not initialized. Call initialize() first.');
    }
    return EnzymeExtensionContext.instance;
  }

  /**
   * Get the VS Code ExtensionContext
   */
  public getContext(): vscode.ExtensionContext {
    return this.context;
  }

  /**
   * Get the logger instance
   */
  public getLogger(): Logger {
    return this._logger;
  }

  /**
   * Get the output channel
   */
  public getOutputChannel(): vscode.OutputChannel {
    return this._outputChannel;
  }

  /**
   * Get the diagnostic collection
   */
  public getDiagnosticCollection(): vscode.DiagnosticCollection {
    return this._diagnosticCollection;
  }

  /**
   * Get workspace state
   */
  public getWorkspaceState(): vscode.Memento {
    return this.context.workspaceState;
  }

  /**
   * Get global state
   */
  public getGlobalState(): vscode.Memento & {
    setKeysForSync(keys: readonly string[]): void;
  } {
    return this.context.globalState;
  }

  /**
   * Get secrets storage
   */
  public getSecrets(): vscode.SecretStorage {
    return this.context.secrets;
  }

  /**
   * Get extension path
   */
  public getExtensionPath(): string {
    return this.context.extensionPath;
  }

  /**
   * Get extension URI
   */
  public getExtensionUri(): vscode.Uri {
    return this.context.extensionUri;
  }

  /**
   * Get storage path
   */
  public getStoragePath(): string | undefined {
    return this.context.storagePath;
  }

  /**
   * Get global storage path
   */
  public getGlobalStoragePath(): string {
    return this.context.globalStorageUri.fsPath;
  }

  /**
   * Get log path
   */
  public getLogPath(): string {
    return this.context.logUri.fsPath;
  }

  /**
   * Get extension mode
   */
  public getExtensionMode(): vscode.ExtensionMode {
    return this.context.extensionMode;
  }

  /**
   * Check if this is the first activation
   */
  public async isFirstActivation(): Promise<boolean> {
    const firstActivation = this.getGlobalState().get<boolean>(
      CACHE_KEYS.FIRST_ACTIVATION,
      true
    );
    if (firstActivation) {
      await this.getGlobalState().update(CACHE_KEYS.FIRST_ACTIVATION, false);
    }
    return firstActivation;
  }

  /**
   * Get or create a status bar item
   * @param id
   * @param config
   */
  public getStatusBarItem(
    id: string,
    config?: StatusBarItemConfig
  ): vscode.StatusBarItem {
    let item = this._statusBarItems.get(id);

    if (!item) {
      const alignment = config?.alignment ?? vscode.StatusBarAlignment.Right;
      const priority = config?.priority ?? STATUS_BAR_PRIORITY.MEDIUM;

      item = vscode.window.createStatusBarItem(alignment, priority);

      if (config?.text) {
        item.text = config.text;
      }
      if (config?.tooltip) {
        item.tooltip = config.tooltip;
      }
      if (config?.command) {
        item.command = config.command;
      }

      this._statusBarItems.set(id, item);
      this._disposables.push(item);
    }

    return item;
  }

  /**
   * Remove a status bar item
   * @param id
   */
  public removeStatusBarItem(id: string): void {
    const item = this._statusBarItems.get(id);
    if (item) {
      item.dispose();
      this._statusBarItems.delete(id);
    }
  }

  /**
   * Set context value (for when clauses)
   * @param key
   * @param value
   */
  public async setContextValue(key: string, value: unknown): Promise<void> {
    await vscode.commands.executeCommand('setContext', key, value);
  }

  /**
   * Set Enzyme workspace
   * @param workspace
   */
  public setWorkspace(workspace: EnzymeWorkspace): void {
    this._workspace = workspace;
    this._logger.info('Workspace set', {
      isEnzymeProject: workspace.isEnzymeProject,
      features: workspace.features.length,
      routes: workspace.routes.length
    });

    // Update context values for when clauses
    this.setContextValue(CONTEXT_KEYS.IS_ENZYME_PROJECT, workspace.isEnzymeProject);
    this.setContextValue(CONTEXT_KEYS.HAS_FEATURES, workspace.features.length > 0);
    this.setContextValue(CONTEXT_KEYS.HAS_ROUTES, workspace.routes.length > 0);

    // Emit event
    this._eventEmitter.fire('workspace:changed');
  }

  /**
   * Get Enzyme workspace
   */
  public getWorkspace(): EnzymeWorkspace | null {
    return this._workspace;
  }

  /**
   * Check if current workspace is an Enzyme project
   */
  public isEnzymeWorkspace(): boolean {
    return this._workspace?.isEnzymeProject ?? false;
  }

  /**
   * Get Enzyme configuration
   */
  public getEnzymeConfig(): EnzymeConfig | undefined {
    return this._workspace?.enzymeConfig;
  }

  /**
   * Get package.json
   */
  public getPackageJson(): PackageJson | undefined {
    return this._workspace?.packageJson;
  }

  /**
   * Get Enzyme version
   */
  public getEnzymeVersion(): string | undefined {
    return this._workspace?.enzymeVersion;
  }

  /**
   * Subscribe to extension events
   * @param listener
   */
  public onEvent(listener: (event: string) => void): vscode.Disposable {
    return this._eventEmitter.event(listener);
  }

  /**
   * Emit an event
   * @param event
   */
  public emitEvent(event: string): void {
    this._eventEmitter.fire(event);
  }

  /**
   * Register a disposable
   * @param disposable
   */
  public registerDisposable(disposable: vscode.Disposable): void {
    this.context.subscriptions.push(disposable);
  }

  /**
   * Register multiple disposables
   * @param {...any} disposables
   */
  public registerDisposables(...disposables: vscode.Disposable[]): void {
    this.context.subscriptions.push(...disposables);
  }

  /**
   * Get workspace folder path
   */
  public getWorkspacePath(): string | undefined {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    return workspaceFolder?.uri.fsPath;
  }

  /**
   * Get workspace folder URI
   */
  public getWorkspaceUri(): vscode.Uri | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri;
  }

  /**
   * Show information message
   * @param message
   * @param {...any} items
   */
  public async showInfo(message: string, ...items: string[]): Promise<string | undefined> {
    return await vscode.window.showInformationMessage(message, ...items);
  }

  /**
   * Show warning message
   * @param message
   * @param {...any} items
   */
  public async showWarning(message: string, ...items: string[]): Promise<string | undefined> {
    return await vscode.window.showWarningMessage(message, ...items);
  }

  /**
   * Show error message
   * @param message
   * @param {...any} items
   */
  public async showError(message: string, ...items: string[]): Promise<string | undefined> {
    return await vscode.window.showErrorMessage(message, ...items);
  }

  /**
   * Show progress
   * @param title
   * @param task
   */
  public async withProgress<R>(
    title: string,
    task: (progress: vscode.Progress<{ message?: string; increment?: number }>, token: vscode.CancellationToken) => Promise<R>
  ): Promise<R> {
    return await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title,
        cancellable: true,
      },
      task
    );
  }

  /**
   * Clear all diagnostics
   */
  public clearDiagnostics(): void {
    this._diagnosticCollection.clear();
  }

  /**
   * Set diagnostics for a file
   * @param uri
   * @param diagnostics
   */
  public setDiagnostics(uri: vscode.Uri, diagnostics: vscode.Diagnostic[]): void {
    this._diagnosticCollection.set(uri, diagnostics);
  }

  /**
   * Get configuration value
   * @param key
   * @param defaultValue
   */
  public getConfig<T>(key: string, defaultValue: T): T {
    return vscode.workspace.getConfiguration().get<T>(key, defaultValue);
  }

  /**
   * Update configuration value
   * @param key
   * @param value
   * @param target
   */
  public async updateConfig(
    key: string,
    value: unknown,
    target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global
  ): Promise<void> {
    await vscode.workspace.getConfiguration().update(key, value, target);
  }

  /**
   * Dispose all resources
   */
  public dispose(): void {
    this._logger.info('Disposing EnzymeExtensionContext');

    // Dispose all status bar items
    this._statusBarItems.forEach(item => item.dispose());
    this._statusBarItems.clear();

    // Dispose all registered disposables
    this._disposables.forEach(d => d.dispose());
    this._disposables = [];

    EnzymeExtensionContext.instance = null;
  }
}
