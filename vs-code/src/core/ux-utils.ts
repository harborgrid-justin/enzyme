/**
 * @file UX Utilities
 * @description Centralized utilities for user experience enhancements
 *
 * This module provides:
 * - First-run detection and onboarding flow
 * - Progress indicators and loading states
 * - Actionable error messages with guidance
 * - User feedback helpers
 * - Contextual help utilities
 */

import * as vscode from 'vscode';
import { EnzymeExtensionContext } from './context';
import { logger } from './logger';
import { URLS } from './constants';

/**
 * Progress options for long-running operations
 */
export interface ProgressOptions {
  /** Title shown in the progress indicator */
  title: string;
  /** Location where progress should be shown */
  location?: vscode.ProgressLocation;
  /** Whether the operation can be cancelled */
  cancellable?: boolean;
  /** Initial message */
  initialMessage?: string;
}

/**
 * Error action - provides actionable buttons for error messages
 */
export interface ErrorAction {
  /** Label for the action button */
  label: string;
  /** Command to execute or callback */
  action: string | (() => Promise<void>);
  /** Whether this action is the primary/recommended action */
  primary?: boolean;
}

/**
 * Actionable error details
 */
export interface ActionableError {
  /** Error message */
  message: string;
  /** Detailed description */
  details?: string;
  /** Actions user can take */
  actions?: ErrorAction[];
  /** Link to documentation */
  docsUrl?: string;
  /** Whether to log to output channel */
  logToOutput?: boolean;
}

/**
 * First-run experience manager
 *
 * Handles detection and orchestration of first-time user onboarding.
 * This includes showing welcome screens, setup wizards, and collecting
 * initial preferences.
 *
 * @example
 * ```typescript
 * const uxUtils = new UXUtils(enzymeContext);
 * await uxUtils.handleFirstRun();
 * ```
 */
export class FirstRunExperience {
  constructor(private context: EnzymeExtensionContext) {}

  /**
   * Check if this is the first time the extension has been activated
   *
   * Uses global state to track activation history. Returns true only
   * on the very first activation across all workspaces.
   *
   * @returns True if this is the first activation ever
   */
  public async isFirstRun(): Promise<boolean> {
    return await this.context.isFirstActivation();
  }

  /**
   * Check if this is the first time opening this specific workspace
   *
   * Uses workspace state to track workspace-specific activation.
   * Returns true only on first activation in current workspace.
   *
   * @returns True if this is the first time opening this workspace
   */
  public async isFirstRunInWorkspace(): Promise<boolean> {
    const workspaceState = this.context.getWorkspaceState();
    const hasRun = workspaceState.get<boolean>('enzyme.hasRunInWorkspace', false);

    if (!hasRun) {
      await workspaceState.update('enzyme.hasRunInWorkspace', true);
    }

    return !hasRun;
  }

  /**
   * Show the welcome experience for first-time users
   *
   * Orchestrates the first-run experience by:
   * 1. Showing welcome notification with quick actions
   * 2. Optionally showing welcome panel with detailed info
   * 3. Offering to run setup wizard for Enzyme projects
   *
   * @param showWelcomePanel - Whether to automatically show welcome panel
   */
  public async showWelcomeExperience(showWelcomePanel: boolean = true): Promise<void> {
    logger.info('Starting first-run welcome experience');

    // Show welcome notification with actions
    const selection = await vscode.window.showInformationMessage(
      '🧪 Welcome to Enzyme! Let\'s get you started.',
      { modal: false },
      'Quick Tour',
      'Setup Wizard',
      'View Documentation',
      'Dismiss'
    );

    switch (selection) {
      case 'Quick Tour':
        // Show welcome panel with quick tour
        await vscode.commands.executeCommand('enzyme.panel.showWelcome');
        logger.info('User selected Quick Tour');
        break;

      case 'Setup Wizard':
        // Show setup wizard for project configuration
        await vscode.commands.executeCommand('enzyme.panel.showSetupWizard');
        logger.info('User selected Setup Wizard');
        break;

      case 'View Documentation':
        // Open documentation in browser
        await vscode.env.openExternal(vscode.Uri.parse(URLS.DOCUMENTATION));
        logger.info('User selected View Documentation');
        break;

      case 'Dismiss':
        logger.info('User dismissed welcome experience');
        break;
    }

    // Additionally show welcome panel if requested and not already shown
    if (showWelcomePanel && selection !== 'Quick Tour') {
      // Small delay to avoid overwhelming user
      setTimeout(() => {
        vscode.commands.executeCommand('enzyme.panel.showWelcome');
      }, 2000);
    }
  }

  /**
   * Show workspace-specific onboarding for Enzyme projects
   *
   * Detects project type and offers appropriate setup assistance.
   * For Enzyme projects, offers setup wizard. For non-Enzyme projects,
   * offers migration or initialization options.
   *
   * @param isEnzymeProject - Whether current workspace is an Enzyme project
   */
  public async showWorkspaceOnboarding(isEnzymeProject: boolean): Promise<void> {
    logger.info(`Showing workspace onboarding (Enzyme project: ${isEnzymeProject})`);

    if (isEnzymeProject) {
      // Existing Enzyme project - offer project overview
      const selection = await vscode.window.showInformationMessage(
        '🧪 Enzyme project detected! Would you like a quick overview?',
        'Show Overview',
        'Open State Inspector',
        'No Thanks'
      );

      switch (selection) {
        case 'Show Overview':
          await vscode.commands.executeCommand('enzyme.panel.showFeatureDashboard');
          break;
        case 'Open State Inspector':
          await vscode.commands.executeCommand('enzyme.panel.showStateInspector');
          break;
      }
    } else {
      // Not an Enzyme project - offer initialization
      const selection = await vscode.window.showInformationMessage(
        'Initialize this project as an Enzyme application?',
        'Initialize Project',
        'Learn More',
        'Skip'
      );

      switch (selection) {
        case 'Initialize Project':
          await vscode.commands.executeCommand('enzyme.init');
          break;
        case 'Learn More':
          await vscode.env.openExternal(vscode.Uri.parse(URLS.DOCUMENTATION));
          break;
      }
    }
  }

  /**
   * Track that a feature has been used
   *
   * Used for analytics and to customize future onboarding experiences
   * based on which features users actually use.
   *
   * @param featureName - Name of the feature that was used
   */
  public async markFeatureUsed(featureName: string): Promise<void> {
    const usedFeatures = this.context.getGlobalState().get<string[]>('enzyme.usedFeatures', []);

    if (!usedFeatures.includes(featureName)) {
      usedFeatures.push(featureName);
      await this.context.getGlobalState().update('enzyme.usedFeatures', usedFeatures);
      logger.info(`Feature marked as used: ${featureName}`);
    }
  }
}

/**
 * Progress indicator utilities for long-running operations
 *
 * Provides consistent progress indicators across the extension with
 * proper error handling, cancellation support, and user feedback.
 *
 * @example
 * ```typescript
 * const progressUtils = new ProgressUtils(enzymeContext);
 * await progressUtils.withProgress(
 *   { title: 'Analyzing project...' },
 *   async (progress) => {
 *     progress.report({ message: 'Loading files...', increment: 25 });
 *     await doWork();
 *     progress.report({ message: 'Complete', increment: 100 });
 *   }
 * );
 * ```
 */
export class ProgressUtils {
  constructor(private context: EnzymeExtensionContext) {}

  /**
   * Execute a task with progress indicator
   *
   * Shows a progress notification to the user while the task runs.
   * Handles errors gracefully and provides feedback on completion.
   *
   * @param options - Progress display options
   * @param task - Async task to execute with progress reporting
   * @returns Result of the task
   *
   * @example
   * ```typescript
   * const result = await withProgress(
   *   { title: 'Processing...' },
   *   async (progress, token) => {
   *     for (let i = 0; i < 100; i++) {
   *       if (token.isCancellationRequested) {
   *         throw new Error('Cancelled');
   *       }
   *       progress.report({ increment: 1 });
   *       await doWork(i);
   *     }
   *     return 'success';
   *   }
   * );
   * ```
   */
  public async withProgress<T>(
    options: ProgressOptions,
    task: (
      progress: vscode.Progress<{ message?: string; increment?: number }>,
      token: vscode.CancellationToken
    ) => Promise<T>
  ): Promise<T> {
    const {
      title,
      location = vscode.ProgressLocation.Notification,
      cancellable = true,
      initialMessage
    } = options;

    logger.info(`Starting progress task: ${title}`);

    try {
      return await vscode.window.withProgress(
        {
          location,
          title,
          cancellable
        },
        async (progress, token) => {
          // Report initial message if provided
          if (initialMessage) {
            progress.report({ message: initialMessage, increment: 0 });
          }

          // Execute task
          const result = await task(progress, token);

          logger.info(`Progress task completed: ${title}`);
          return result;
        }
      );
    } catch (error) {
      logger.error(`Progress task failed: ${title}`, error);
      throw error;
    }
  }

  /**
   * Show a simple loading indicator in the status bar
   *
   * Useful for quick operations that don't need full progress reporting.
   * Returns a dispose function to hide the indicator.
   *
   * @param message - Message to show in status bar
   * @returns Dispose function to stop the loading indicator
   *
   * @example
   * ```typescript
   * const stopLoading = showStatusLoading('Loading...');
   * try {
   *   await doWork();
   * } finally {
   *   stopLoading();
   * }
   * ```
   */
  public showStatusLoading(message: string): () => void {
    const statusBar = this.context.getStatusBarItem('loading', {
      text: `$(sync~spin) ${message}`,
      tooltip: message
    });

    statusBar.show();
    logger.debug(`Showing status loading: ${message}`);

    return () => {
      statusBar.hide();
      statusBar.dispose();
      this.context.removeStatusBarItem('loading');
      logger.debug(`Hiding status loading: ${message}`);
    };
  }
}

/**
 * Enhanced error handling with actionable guidance
 *
 * Provides consistent error messaging across the extension with
 * actionable buttons, documentation links, and contextual help.
 *
 * @example
 * ```typescript
 * const errorHandler = new ErrorHandler(enzymeContext);
 * await errorHandler.showActionableError({
 *   message: 'Failed to generate component',
 *   details: 'TypeScript compiler not found',
 *   actions: [
 *     { label: 'Install TypeScript', action: 'enzyme.installTypeScript', primary: true },
 *     { label: 'View Docs', action: async () => { ... } }
 *   ],
 *   docsUrl: 'https://enzyme-framework.dev/troubleshooting'
 * });
 * ```
 */
export class ErrorHandler {
  constructor(private context: EnzymeExtensionContext) {}

  /**
   * Show an error message with actionable buttons and guidance
   *
   * Provides users with clear error information and specific actions
   * they can take to resolve the issue. Always includes option to
   * view logs for debugging.
   *
   * @param error - Error details with optional actions and documentation
   */
  public async showActionableError(error: ActionableError): Promise<void> {
    const { message, details, actions = [], docsUrl, logToOutput = true } = error;

    // Log error to output channel if requested
    if (logToOutput) {
      logger.error(message, details ? new Error(details) : undefined);
    }

    // Build button items
    const items: string[] = [];

    // Add custom actions
    const primaryAction = actions.find(a => a.primary);
    if (primaryAction) {
      items.push(primaryAction.label);
    }

    actions
      .filter(a => !a.primary)
      .forEach(a => items.push(a.label));

    // Add documentation link if provided
    if (docsUrl) {
      items.push('View Documentation');
    }

    // Always add option to view logs
    items.push('Show Logs');

    // Show error message
    const fullMessage = details ? `${message}\n\n${details}` : message;
    const selection = await vscode.window.showErrorMessage(
      fullMessage,
      { modal: false },
      ...items
    );

    // Handle selection
    if (selection === 'Show Logs') {
      logger.show();
    } else if (selection === 'View Documentation' && docsUrl) {
      await vscode.env.openExternal(vscode.Uri.parse(docsUrl));
    } else if (selection) {
      // Find and execute action
      const selectedAction = actions.find(a => a.label === selection);
      if (selectedAction) {
        if (typeof selectedAction.action === 'string') {
          await vscode.commands.executeCommand(selectedAction.action);
        } else {
          await selectedAction.action();
        }
      }
    }
  }

  /**
   * Show a warning with optional actions
   *
   * Similar to showActionableError but for non-critical warnings.
   * Uses warning message style instead of error.
   *
   * @param message - Warning message
   * @param actions - Optional action buttons
   */
  public async showWarningWithActions(
    message: string,
    actions: ErrorAction[] = []
  ): Promise<void> {
    const items = actions.map(a => a.label);
    const selection = await vscode.window.showWarningMessage(message, ...items);

    if (selection) {
      const selectedAction = actions.find(a => a.label === selection);
      if (selectedAction) {
        if (typeof selectedAction.action === 'string') {
          await vscode.commands.executeCommand(selectedAction.action);
        } else {
          await selectedAction.action();
        }
      }
    }
  }

  /**
   * Handle and display error from caught exception
   *
   * Converts generic errors into actionable error messages with
   * appropriate context and actions based on error type.
   *
   * @param error - Caught error or exception
   * @param context - Context about what operation failed
   */
  public async handleError(error: unknown, context: string): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error(`${context}: ${errorMessage}`, error instanceof Error ? error : undefined);

    // Determine appropriate actions based on error
    const actions: ErrorAction[] = [];
    let docsUrl: string | undefined;

    // Check for common error patterns and provide specific guidance
    if (errorMessage.includes('ENOENT') || errorMessage.includes('not found')) {
      actions.push({
        label: 'Create Missing Files',
        action: 'enzyme.init',
        primary: true
      });
      docsUrl = `${URLS.DOCUMENTATION}/troubleshooting#missing-files`;
    } else if (errorMessage.includes('permission') || errorMessage.includes('EACCES')) {
      actions.push({
        label: 'Check Permissions',
        action: async () => {
          await vscode.env.openExternal(vscode.Uri.parse(`${URLS.DOCUMENTATION}/troubleshooting#permissions`));
        },
        primary: true
      });
    } else if (errorMessage.includes('TypeScript') || errorMessage.includes('tsc')) {
      actions.push({
        label: 'Install TypeScript',
        action: async () => {
          const terminal = vscode.window.createTerminal('Enzyme');
          terminal.show();
          terminal.sendText('npm install --save-dev typescript');
        },
        primary: true
      });
    }

    await this.showActionableError({
      message: `${context} failed`,
      details: errorMessage,
      actions,
      docsUrl
    });
  }
}

/**
 * Contextual help utilities
 *
 * Provides context-sensitive help and tooltips throughout the extension.
 *
 * @example
 * ```typescript
 * const helpUtils = new ContextualHelp(enzymeContext);
 * await helpUtils.showQuickTip('generation', 'Use Ctrl+Alt+E C to quickly generate components');
 * ```
 */
export class ContextualHelp {
  private shownTips: Set<string> = new Set();

  constructor(private context: EnzymeExtensionContext) {
    // Load previously shown tips
    const shown = context.getGlobalState().get<string[]>('enzyme.shownTips', []);
    this.shownTips = new Set(shown);
  }

  /**
   * Show a helpful tip to the user (only once per tip ID)
   *
   * Tips are shown only once to avoid annoying users with repeated
   * information. Use unique IDs for each distinct tip.
   *
   * @param tipId - Unique identifier for this tip
   * @param message - Tip message to show
   * @param actions - Optional action buttons
   */
  public async showQuickTip(
    tipId: string,
    message: string,
    actions: { label: string; action: () => Promise<void> }[] = []
  ): Promise<void> {
    // Skip if tip was already shown
    if (this.shownTips.has(tipId)) {
      return;
    }

    const items = ['Got it', ...actions.map(a => a.label)];
    const selection = await vscode.window.showInformationMessage(
      `💡 Tip: ${message}`,
      ...items
    );

    // Mark tip as shown
    this.shownTips.add(tipId);
    await this.context.getGlobalState().update(
      'enzyme.shownTips',
      Array.from(this.shownTips)
    );

    // Execute action if selected
    if (selection && selection !== 'Got it') {
      const action = actions.find(a => a.label === selection);
      if (action) {
        await action.action();
      }
    }
  }

  /**
   * Show contextual help for a specific feature
   *
   * Opens a webview panel with detailed help about a feature,
   * including usage examples and best practices.
   *
   * @param feature - Feature to show help for
   */
  public async showFeatureHelp(feature: string): Promise<void> {
    const helpUrl = `${URLS.DOCUMENTATION}/features/${feature}`;
    await vscode.env.openExternal(vscode.Uri.parse(helpUrl));
  }
}

/**
 * Unified UX utilities class
 *
 * Main entry point for all UX-related utilities. Provides convenient
 * access to first-run experience, progress indicators, error handling,
 * and contextual help.
 *
 * @example
 * ```typescript
 * const uxUtils = new UXUtils(enzymeContext);
 *
 * // Handle first run
 * if (await uxUtils.firstRun.isFirstRun()) {
 *   await uxUtils.firstRun.showWelcomeExperience();
 * }
 *
 * // Show progress
 * await uxUtils.progress.withProgress(
 *   { title: 'Processing...' },
 *   async (progress) => { ... }
 * );
 *
 * // Handle errors
 * await uxUtils.errors.handleError(error, 'Component generation');
 * ```
 */
export class UXUtils {
  /** First-run experience utilities */
  public readonly firstRun: FirstRunExperience;

  /** Progress indicator utilities */
  public readonly progress: ProgressUtils;

  /** Error handling utilities */
  public readonly errors: ErrorHandler;

  /** Contextual help utilities */
  public readonly help: ContextualHelp;

  constructor(context: EnzymeExtensionContext) {
    this.firstRun = new FirstRunExperience(context);
    this.progress = new ProgressUtils(context);
    this.errors = new ErrorHandler(context);
    this.help = new ContextualHelp(context);
  }

  /**
   * Initialize UX utilities and handle first-run if applicable
   *
   * Should be called during extension activation to set up UX
   * enhancements and show first-run experience if needed.
   *
   * @param isEnzymeProject - Whether current workspace is an Enzyme project
   */
  public async initialize(isEnzymeProject: boolean): Promise<void> {
    // Check for first run globally
    const isFirstRun = await this.firstRun.isFirstRun();
    if (isFirstRun) {
      await this.firstRun.showWelcomeExperience(true);
      return;
    }

    // Check for first run in this workspace
    const isFirstInWorkspace = await this.firstRun.isFirstRunInWorkspace();
    if (isFirstInWorkspace) {
      await this.firstRun.showWorkspaceOnboarding(isEnzymeProject);
    }
  }
}
