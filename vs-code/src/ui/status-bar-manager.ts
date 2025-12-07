/**
 * @file StatusBar Manager
 * @description Centralized manager for all Enzyme status bar items
 *
 * This manager follows VS Code UX Guidelines for status bar items:
 * - Use icons from Codicon library
 * - Provide tooltips for all items
 * - Keep text concise
 * - Use color sparingly (only for critical states)
 * - Respond to theme changes
 */

import * as vscode from 'vscode';
import { EnzymeExtensionContext } from '../core/context';
import { logger } from '../core/logger';

/**
 * Status bar item identifiers
 */
export enum StatusBarItemId {
  ENZYME_STATUS = 'enzyme-status',
  BUILD_STATUS = 'enzyme-build',
  DEV_SERVER = 'enzyme-dev-server',
  CLI_VERSION = 'enzyme-cli-version',
  PROJECT_INFO = 'enzyme-project-info',
  PERFORMANCE = 'enzyme-performance',
}

/**
 * Status bar item states
 */
export enum StatusBarState {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  INFO = 'info',
}

/**
 * Configuration for a status bar item
 */
export interface StatusBarItemConfiguration {
  /** Unique identifier for the item */
  id: StatusBarItemId;
  /** Display text (can include icons using $(icon-name) syntax) */
  text: string;
  /** Tooltip text (can be string or markdown) */
  tooltip?: string | vscode.MarkdownString;
  /** Command to execute when clicked */
  command?: string;
  /** Alignment (left or right) */
  alignment?: vscode.StatusBarAlignment;
  /** Priority (higher numbers = further left in alignment group) */
  priority?: number;
  /** Current state */
  state?: StatusBarState;
  /** Background color (use sparingly, only for critical states) */
  backgroundColor?: vscode.ThemeColor;
  /** Whether to show by default */
  visible?: boolean;
}

/**
 * Manages all status bar items for the Enzyme extension
 *
 * @example
 * ```typescript
 * const manager = new StatusBarManager(enzymeContext);
 *
 * // Create main status item
 * manager.createItem({
 *   id: StatusBarItemId.ENZYME_STATUS,
 *   text: '$(beaker) Enzyme',
 *   tooltip: 'Enzyme Framework',
 *   command: 'enzyme.docs.open',
 *   state: StatusBarState.SUCCESS
 * });
 *
 * // Update state
 * manager.updateState(StatusBarItemId.ENZYME_STATUS, StatusBarState.WARNING);
 * ```
 */
export class StatusBarManager {
  private items: Map<StatusBarItemId, vscode.StatusBarItem> = new Map();
  private context: EnzymeExtensionContext;
  private stateIcons: Map<StatusBarState, string> = new Map([
    [StatusBarState.IDLE, '$(circle-outline)'],
    [StatusBarState.LOADING, '$(loading~spin)'],
    [StatusBarState.SUCCESS, '$(pass)'],
    [StatusBarState.WARNING, '$(warning)'],
    [StatusBarState.ERROR, '$(error)'],
    [StatusBarState.INFO, '$(info)'],
  ]);

  /**
   * Create a new StatusBarManager
   * @param context - The Enzyme extension context
   */
  constructor(context: EnzymeExtensionContext) {
    this.context = context;
    logger.info('StatusBarManager initialized');
  }

  /**
   * Create a new status bar item
   *
   * @param config - Configuration for the status bar item
   * @returns The created status bar item
   *
   * @example
   * ```typescript
   * manager.createItem({
   *   id: StatusBarItemId.DEV_SERVER,
   *   text: '$(server) Dev Server',
   *   tooltip: 'Click to start/stop dev server',
   *   command: 'enzyme.devServer.toggle',
   *   state: StatusBarState.IDLE
   * });
   * ```
   */
  public createItem(config: StatusBarItemConfiguration): vscode.StatusBarItem {
    // Check if item already exists
    if (this.items.has(config.id)) {
      logger.warn(`Status bar item ${config.id} already exists`);
      return this.items.get(config.id)!;
    }

    // Create the item using the context's helper
    const item = this.context.getStatusBarItem(config.id, {
      alignment: config.alignment,
      priority: config.priority,
      text: config.text,
      tooltip: config.tooltip,
      command: config.command,
    });

    // Apply state if provided
    if (config.state) {
      this.applyState(item, config.state);
    }

    // Apply background color if provided
    if (config.backgroundColor) {
      item.backgroundColor = config.backgroundColor;
    }

    // Show or hide based on configuration
    if (config.visible !== false) {
      item.show();
    }

    // Store the item
    this.items.set(config.id, item);

    logger.debug(`Created status bar item: ${config.id}`);
    return item;
  }

  /**
   * Get an existing status bar item
   *
   * @param id - The identifier of the item
   * @returns The status bar item, or undefined if not found
   */
  public getItem(id: StatusBarItemId): vscode.StatusBarItem | undefined {
    return this.items.get(id);
  }

  /**
   * Update the text of a status bar item
   *
   * @param id - The identifier of the item
   * @param text - The new text (can include icons using $(icon-name) syntax)
   *
   * @example
   * ```typescript
   * manager.updateText(StatusBarItemId.BUILD_STATUS, '$(check) Build Successful');
   * ```
   */
  public updateText(id: StatusBarItemId, text: string): void {
    const item = this.items.get(id);
    if (item) {
      item.text = text;
      logger.debug(`Updated text for ${id}: ${text}`);
    } else {
      logger.warn(`Cannot update text: Status bar item ${id} not found`);
    }
  }

  /**
   * Update the tooltip of a status bar item
   *
   * @param id - The identifier of the item
   * @param tooltip - The new tooltip (string or markdown)
   *
   * @example
   * ```typescript
   * const markdown = new vscode.MarkdownString();
   * markdown.appendMarkdown('**Enzyme Framework**\n\n');
   * markdown.appendMarkdown('- Features: 15\n');
   * markdown.appendMarkdown('- Routes: 8\n');
   * manager.updateTooltip(StatusBarItemId.ENZYME_STATUS, markdown);
   * ```
   */
  public updateTooltip(id: StatusBarItemId, tooltip: string | vscode.MarkdownString): void {
    const item = this.items.get(id);
    if (item) {
      item.tooltip = tooltip;
      logger.debug(`Updated tooltip for ${id}`);
    } else {
      logger.warn(`Cannot update tooltip: Status bar item ${id} not found`);
    }
  }

  /**
   * Update the state of a status bar item
   * This will update both the icon and potentially the color
   *
   * @param id - The identifier of the item
   * @param state - The new state
   *
   * @example
   * ```typescript
   * // Show loading state
   * manager.updateState(StatusBarItemId.BUILD_STATUS, StatusBarState.LOADING);
   *
   * // Show success state
   * manager.updateState(StatusBarItemId.BUILD_STATUS, StatusBarState.SUCCESS);
   * ```
   */
  public updateState(id: StatusBarItemId, state: StatusBarState): void {
    const item = this.items.get(id);
    if (item) {
      this.applyState(item, state);
      logger.debug(`Updated state for ${id}: ${state}`);
    } else {
      logger.warn(`Cannot update state: Status bar item ${id} not found`);
    }
  }

  /**
   * Update the command of a status bar item
   *
   * @param id - The identifier of the item
   * @param command - The new command identifier
   */
  public updateCommand(id: StatusBarItemId, command: string | undefined): void {
    const item = this.items.get(id);
    if (item) {
      item.command = command;
      logger.debug(`Updated command for ${id}: ${command}`);
    } else {
      logger.warn(`Cannot update command: Status bar item ${id} not found`);
    }
  }

  /**
   * Show a status bar item
   *
   * @param id - The identifier of the item
   */
  public show(id: StatusBarItemId): void {
    const item = this.items.get(id);
    if (item) {
      item.show();
      logger.debug(`Showing status bar item: ${id}`);
    } else {
      logger.warn(`Cannot show: Status bar item ${id} not found`);
    }
  }

  /**
   * Hide a status bar item
   *
   * @param id - The identifier of the item
   */
  public hide(id: StatusBarItemId): void {
    const item = this.items.get(id);
    if (item) {
      item.hide();
      logger.debug(`Hiding status bar item: ${id}`);
    } else {
      logger.warn(`Cannot hide: Status bar item ${id} not found`);
    }
  }

  /**
   * Remove and dispose a status bar item
   *
   * @param id - The identifier of the item
   */
  public removeItem(id: StatusBarItemId): void {
    const item = this.items.get(id);
    if (item) {
      item.dispose();
      this.items.delete(id);
      logger.debug(`Removed status bar item: ${id}`);
    } else {
      logger.warn(`Cannot remove: Status bar item ${id} not found`);
    }
  }

  /**
   * Show a temporary message in a status bar item
   * The message will be reverted after the specified duration
   *
   * @param id - The identifier of the item
   * @param message - The temporary message to show
   * @param duration - Duration in milliseconds (default: 3000)
   * @param state - Optional state to apply temporarily
   *
   * @example
   * ```typescript
   * manager.showTemporaryMessage(
   *   StatusBarItemId.ENZYME_STATUS,
   *   '$(check) Build successful!',
   *   3000,
   *   StatusBarState.SUCCESS
   * );
   * ```
   */
  public showTemporaryMessage(
    id: StatusBarItemId,
    message: string,
    duration: number = 3000,
    state?: StatusBarState
  ): void {
    const item = this.items.get(id);
    if (!item) {
      logger.warn(`Cannot show temporary message: Status bar item ${id} not found`);
      return;
    }

    // Store original values
    const originalText = item.text;
    const originalBackgroundColor = item.backgroundColor;

    // Set temporary message and state
    item.text = message;
    if (state) {
      this.applyState(item, state);
    }

    // Revert after duration
    setTimeout(() => {
      item.text = originalText;
      item.backgroundColor = originalBackgroundColor;
    }, duration);
  }

  /**
   * Apply a state to a status bar item
   *
   * @param item - The status bar item
   * @param state - The state to apply
   */
  private applyState(item: vscode.StatusBarItem, state: StatusBarState): void {
    // Apply background color based on state
    switch (state) {
      case StatusBarState.ERROR:
        item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        break;
      case StatusBarState.WARNING:
        item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        break;
      default:
        item.backgroundColor = undefined;
        break;
    }
  }

  /**
   * Get the icon for a state
   *
   * @param state - The state
   * @returns The icon string (using Codicon syntax)
   */
  public getStateIcon(state: StatusBarState): string {
    return this.stateIcons.get(state) || '$(circle-outline)';
  }

  /**
   * Dispose all status bar items
   */
  public dispose(): void {
    this.items.forEach((item, id) => {
      item.dispose();
      logger.debug(`Disposed status bar item: ${id}`);
    });
    this.items.clear();
    logger.info('StatusBarManager disposed');
  }

  /**
   * Initialize default Enzyme status bar items
   *
   * @param enzymeVersion - The version of Enzyme installed
   * @param hasDevServer - Whether a dev server is available
   */
  public initializeDefaultItems(enzymeVersion?: string, hasDevServer: boolean = false): void {
    // Main Enzyme status
    this.createItem({
      id: StatusBarItemId.ENZYME_STATUS,
      text: '$(beaker) Enzyme',
      tooltip: this.createEnzymeTooltip(enzymeVersion),
      command: 'enzyme.panel.showWelcome',
      alignment: vscode.StatusBarAlignment.Right,
      priority: 100,
      state: StatusBarState.SUCCESS,
      visible: true,
    });

    // CLI version (if available)
    if (enzymeVersion) {
      this.createItem({
        id: StatusBarItemId.CLI_VERSION,
        text: `$(package) v${enzymeVersion}`,
        tooltip: `Enzyme CLI v${enzymeVersion}`,
        command: 'enzyme.cli.version',
        alignment: vscode.StatusBarAlignment.Right,
        priority: 90,
        visible: false, // Hidden by default
      });
    }

    // Dev server status (if available)
    if (hasDevServer) {
      this.createItem({
        id: StatusBarItemId.DEV_SERVER,
        text: '$(server) Dev Server',
        tooltip: 'Click to start dev server',
        command: 'enzyme.devServer.toggle',
        alignment: vscode.StatusBarAlignment.Right,
        priority: 80,
        state: StatusBarState.IDLE,
        visible: true,
      });
    }

    logger.info('Default status bar items initialized');
  }

  /**
   * Create a rich tooltip for the main Enzyme status item
   *
   * @param version - The Enzyme version
   * @returns A MarkdownString tooltip
   */
  private createEnzymeTooltip(version?: string): vscode.MarkdownString {
    const tooltip = new vscode.MarkdownString();
    tooltip.isTrusted = true;
    tooltip.supportHtml = true;

    tooltip.appendMarkdown('### $(beaker) Enzyme Framework\n\n');

    if (version) {
      tooltip.appendMarkdown(`**Version:** ${version}\n\n`);
    }

    tooltip.appendMarkdown('---\n\n');
    tooltip.appendMarkdown('**Quick Actions:**\n\n');
    tooltip.appendMarkdown('- [$(home) Welcome](command:enzyme.panel.showWelcome)\n');
    tooltip.appendMarkdown('- [$(wand) Generator](command:enzyme.panel.showGeneratorWizard)\n');
    tooltip.appendMarkdown('- [$(book) Documentation](command:enzyme.docs.open)\n');
    tooltip.appendMarkdown('- [$(settings-gear) Settings](command:enzyme.openSettings)\n');

    return tooltip;
  }
}

/**
 * Global status bar manager instance
 */
let statusBarManagerInstance: StatusBarManager | undefined;

/**
 * Get or create the global StatusBarManager instance
 *
 * @param context - The Enzyme extension context
 * @returns The StatusBarManager instance
 */
export function getStatusBarManager(context: EnzymeExtensionContext): StatusBarManager {
  if (!statusBarManagerInstance) {
    statusBarManagerInstance = new StatusBarManager(context);
  }
  return statusBarManagerInstance;
}

/**
 * Dispose the global StatusBarManager instance
 */
export function disposeStatusBarManager(): void {
  if (statusBarManagerInstance) {
    statusBarManagerInstance.dispose();
    statusBarManagerInstance = undefined;
  }
}
