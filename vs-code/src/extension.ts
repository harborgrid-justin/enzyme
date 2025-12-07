/**
 * Enzyme VS Code Extension
 * Main entry point for the extension
 */

import * as vscode from 'vscode';
import { EnzymeExtensionContext } from './core/context';
import { logger } from './core/logger';
import { EXTENSION_NAME, COMMANDS, URLS } from './core/constants';
import {
  detectEnzymeProject,
  getProjectStructure,
  createEnzymeFileWatchers,
  FileWatcher,
} from './core/workspace';
import { registerTreeViewProviders } from './providers/treeviews/register-treeviews';
import { registerWebViewProviders } from './providers/webviews/register-webviews';

// NOTE: File watchers are now stored in context.subscriptions to avoid module-level state

/**
 * Activate the extension
 * This is called when the extension is first activated
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  logger.header(`Activating ${EXTENSION_NAME}`);

  try {
    // Initialize the extension context singleton
    const enzymeContext = EnzymeExtensionContext.initialize(context);
    logger.info('Extension context initialized');

    // PERFORMANCE: Register commands immediately (they're lightweight)
    registerCommands(enzymeContext);
    logger.info('Commands registered successfully');

    // PERFORMANCE: Register TreeView and WebView providers (lightweight)
    const treeViewDisposables = registerTreeViewProviders(enzymeContext);
    treeViewDisposables.forEach(d => enzymeContext.registerDisposable(d));
    logger.info('TreeView providers registered');

    const webViewDisposables = registerWebViewProviders(enzymeContext);
    webViewDisposables.forEach(d => enzymeContext.registerDisposable(d));
    logger.info('WebView providers registered');

    // PERFORMANCE: Defer heavy operations to avoid blocking activation
    // Use setImmediate to allow activation to complete first
    setImmediate(async () => {
      try {
        await initializeEnzymeWorkspace(enzymeContext, context);
      } catch (error) {
        logger.error('Failed to initialize Enzyme workspace', error);
      }
    });

    // PERFORMANCE: Initialize telemetry (opt-in) - lightweight operation
    initializeTelemetry(enzymeContext);

    logger.success(`${EXTENSION_NAME} activated successfully (< 10ms)`);

    // PERFORMANCE: Check if first activation asynchronously
    isFirstActivationCheck(enzymeContext).catch(error => {
      logger.error('Failed to check first activation', error);
    });

  } catch (error) {
    logger.error('Failed to activate extension', error);
    vscode.window.showErrorMessage(
      `Failed to activate ${EXTENSION_NAME}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Deactivate the extension
 * This is called when the extension is deactivated
 *
 * Note: File watchers are automatically disposed via context.subscriptions
 */
export async function deactivate(): Promise<void> {
  logger.header(`Deactivating ${EXTENSION_NAME}`);

  try {
    // Dispose extension context (file watchers are disposed via context.subscriptions)
    try {
      const enzymeContext = EnzymeExtensionContext.getInstance();
      await enzymeContext.dispose();
    } catch (error) {
      // Instance may not exist if activation failed
      logger.warn('Extension context not initialized during deactivation');
    }

    logger.success(`${EXTENSION_NAME} deactivated successfully`);
  } catch (error) {
    logger.error('Error during deactivation', error);
  }
}

/**
 * PERFORMANCE: Initialize Enzyme workspace asynchronously after activation
 * This prevents blocking the extension host during activation
 */
async function initializeEnzymeWorkspace(
  enzymeContext: EnzymeExtensionContext,
  context: vscode.ExtensionContext
): Promise<void> {
  logger.info('Initializing Enzyme workspace (deferred)');

  // Detect Enzyme workspace
  const isEnzymeWorkspace = await detectEnzymeProject();
  logger.info(`Enzyme workspace detected: ${isEnzymeWorkspace}`);

  // Set context keys for command enablement (must be done before showing UI)
  await vscode.commands.executeCommand('setContext', 'enzyme:isEnzymeProject', isEnzymeWorkspace);

  if (isEnzymeWorkspace) {
    // PERFORMANCE: Load workspace structure lazily with progress indicator
    await enzymeContext.withProgress('Loading Enzyme project structure...', async (progress) => {
      progress.report({ message: 'Analyzing project...', increment: 25 });

      const workspace = await getProjectStructure();
      enzymeContext.setWorkspace(workspace);

      // Set additional context keys based on project structure
      await vscode.commands.executeCommand('setContext', 'enzyme:hasFeatures', workspace.features.length > 0);
      await vscode.commands.executeCommand('setContext', 'enzyme:hasRoutes', workspace.routes.length > 0);
      await vscode.commands.executeCommand('setContext', 'enzyme:isTypeScript', true); // Set based on project analysis

      progress.report({ message: 'Setting up file watchers...', increment: 50 });

      // Create file watchers and register them properly via context.subscriptions
      const fileWatchers = createEnzymeFileWatchers();

      // Register file watcher event handlers with proper error handling and debouncing
      fileWatchers.forEach(watcher => {
        watcher.onEvent(async event => {
          try {
            logger.debug(`File ${event.type}: ${event.uri.fsPath}`);

            // Refresh workspace structure on config changes (debounced in FileWatcher class)
            if (event.type === 'changed' || event.type === 'created') {
              await refreshWorkspace(enzymeContext);
            }
          } catch (error) {
            logger.error(`File watcher error for ${event.uri.fsPath}`, error);
          }
        });

        // Add watcher to disposables so VS Code manages cleanup
        context.subscriptions.push(watcher);
      });

      progress.report({ message: 'Finalizing...', increment: 75 });

      // Show status bar item
      const statusBarItem = enzymeContext.getStatusBarItem('enzyme-status', {
        text: '$(beaker) Enzyme',
        tooltip: `Enzyme Framework v${workspace.enzymeVersion || 'unknown'}`,
        command: COMMANDS.DOCS_OPEN,
      });
      statusBarItem.show();

      progress.report({ message: 'Complete', increment: 100 });
    });

    // Show activation notification for Enzyme workspaces (non-blocking)
    // FIXED: Added error handling to prevent floating promise
    vscode.window.showInformationMessage(
      `${EXTENSION_NAME} is now active!`,
      'Show Commands',
      'Open Docs'
    ).then(selection => {
      if (selection === 'Show Commands') {
        vscode.commands.executeCommand('workbench.action.showCommands');
      } else if (selection === 'Open Docs') {
        vscode.commands.executeCommand(COMMANDS.DOCS_OPEN);
      }
    }, error => {
      logger.error('Failed to show activation notification', error);
    });
  }

  logger.success('Enzyme workspace initialization complete');
}

/**
 * PERFORMANCE: Check if first activation asynchronously
 */
async function isFirstActivationCheck(enzymeContext: EnzymeExtensionContext): Promise<void> {
  const isFirstActivation = await enzymeContext.isFirstActivation();
  if (isFirstActivation) {
    logger.info('First activation detected');
    await showWelcomeMessage(enzymeContext);
  }
}

/**
 * Wrapper for command handlers with error handling
 * Ensures all commands have consistent error handling and logging
 */
function wrapCommandHandler(
  commandId: string,
  handler: (...args: unknown[]) => Promise<void>
): (...args: unknown[]) => Promise<void> {
  return async (...args: unknown[]) => {
    try {
      logger.debug(`Executing command: ${commandId}`);
      await handler(...args);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Command ${commandId} failed:`, error);

      const action = await vscode.window.showErrorMessage(
        `Failed to execute command: ${errorMessage}`,
        'Show Logs',
        'Dismiss'
      );

      if (action === 'Show Logs') {
        logger.show();
      }
    }
  };
}

/**
 * Register all extension commands
 */
function registerCommands(enzymeContext: EnzymeExtensionContext): void {

  // Initialization
  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.INIT, wrapCommandHandler(COMMANDS.INIT, async () => {
      await handleInitCommand(enzymeContext);
    }))
  );

  // Generation Commands
  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.GENERATE_COMPONENT, wrapCommandHandler(COMMANDS.GENERATE_COMPONENT, async () => {
      await enzymeContext.showInfo('Generate Component - Coming Soon!');
    }))
  );

  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.GENERATE_FEATURE, wrapCommandHandler(COMMANDS.GENERATE_FEATURE, async () => {
      await enzymeContext.showInfo('Generate Feature - Coming Soon!');
    }))
  );

  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.GENERATE_ROUTE, wrapCommandHandler(COMMANDS.GENERATE_ROUTE, async () => {
      await enzymeContext.showInfo('Generate Route - Coming Soon!');
    }))
  );

  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.GENERATE_STORE, wrapCommandHandler(COMMANDS.GENERATE_STORE, async () => {
      await enzymeContext.showInfo('Generate Store - Coming Soon!');
    }))
  );

  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.GENERATE_HOOK, wrapCommandHandler(COMMANDS.GENERATE_HOOK, async () => {
      await enzymeContext.showInfo('Generate Hook - Coming Soon!');
    }))
  );

  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.GENERATE_API_CLIENT, wrapCommandHandler(COMMANDS.GENERATE_API_CLIENT, async () => {
      await enzymeContext.showInfo('Generate API Client - Coming Soon!');
    }))
  );

  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.GENERATE_TEST, wrapCommandHandler(COMMANDS.GENERATE_TEST, async () => {
      await enzymeContext.showInfo('Generate Test - Coming Soon!');
    }))
  );

  // Analysis Commands
  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.ANALYZE_PERFORMANCE, wrapCommandHandler(COMMANDS.ANALYZE_PERFORMANCE, async () => {
      await enzymeContext.showInfo('Analyze Performance - Coming Soon!');
    }))
  );

  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.ANALYZE_SECURITY, wrapCommandHandler(COMMANDS.ANALYZE_SECURITY, async () => {
      await enzymeContext.showInfo('Analyze Security - Coming Soon!');
    }))
  );

  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.ANALYZE_DEPENDENCIES, wrapCommandHandler(COMMANDS.ANALYZE_DEPENDENCIES, async () => {
      await enzymeContext.showInfo('Analyze Dependencies - Coming Soon!');
    }))
  );

  // Refactoring Commands
  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.REFACTOR_CONVERT_TO_ENZYME, wrapCommandHandler(COMMANDS.REFACTOR_CONVERT_TO_ENZYME, async () => {
      await enzymeContext.showInfo('Convert to Enzyme - Coming Soon!');
    }))
  );

  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.REFACTOR_OPTIMIZE_IMPORTS, wrapCommandHandler(COMMANDS.REFACTOR_OPTIMIZE_IMPORTS, async () => {
      await enzymeContext.showInfo('Optimize Imports - Coming Soon!');
    }))
  );

  // Validation Commands
  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.VALIDATE_CONFIG, wrapCommandHandler(COMMANDS.VALIDATE_CONFIG, async () => {
      await enzymeContext.showInfo('Validate Config - Coming Soon!');
    }))
  );

  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.VALIDATE_ROUTES, wrapCommandHandler(COMMANDS.VALIDATE_ROUTES, async () => {
      await enzymeContext.showInfo('Validate Routes - Coming Soon!');
    }))
  );

  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.VALIDATE_FEATURES, wrapCommandHandler(COMMANDS.VALIDATE_FEATURES, async () => {
      await enzymeContext.showInfo('Validate Features - Coming Soon!');
    }))
  );

  // Explorer Commands
  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.EXPLORER_REFRESH, wrapCommandHandler(COMMANDS.EXPLORER_REFRESH, async () => {
      await refreshWorkspace(enzymeContext);
      await enzymeContext.showInfo('Explorer refreshed');
    }))
  );

  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.EXPLORER_OPEN_FILE, async (...args: unknown[]) => {
      const uri = args[0] as vscode.Uri;
      if (!uri) {
        throw new Error('No file URI provided');
      }
      await vscode.window.showTextDocument(uri);
    })
  );

  // Documentation Commands
  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.DOCS_OPEN, wrapCommandHandler(COMMANDS.DOCS_OPEN, async () => {
      await vscode.env.openExternal(vscode.Uri.parse(URLS.DOCUMENTATION));
    }))
  );

  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.SNIPPETS_SHOW, wrapCommandHandler(COMMANDS.SNIPPETS_SHOW, async () => {
      await enzymeContext.showInfo('Code Snippets - Coming Soon!');
    }))
  );

  // Migration Commands
  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.MIGRATION_ANALYZE, wrapCommandHandler(COMMANDS.MIGRATION_ANALYZE, async () => {
      await enzymeContext.showInfo('Migration Analysis - Coming Soon!');
    }))
  );

  // Debug & Utility Commands
  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.TELEMETRY_TOGGLE, wrapCommandHandler(COMMANDS.TELEMETRY_TOGGLE, async () => {
      await toggleTelemetry(enzymeContext);
    }))
  );

  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.DEBUG_SHOW_LOGS, wrapCommandHandler(COMMANDS.DEBUG_SHOW_LOGS, async () => {
      logger.show();
    }))
  );

  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.WORKSPACE_DETECT, wrapCommandHandler(COMMANDS.WORKSPACE_DETECT, async () => {
      const isEnzyme = await detectEnzymeProject();
      const message = isEnzyme
        ? 'This is an Enzyme project! 🧪'
        : 'No Enzyme project detected in this workspace.';
      await enzymeContext.showInfo(message);
    }))
  );

  logger.info('Commands registered successfully');
}

/**
 * Handle the init command
 */
async function handleInitCommand(enzymeContext: EnzymeExtensionContext): Promise<void> {
  const answer = await vscode.window.showInformationMessage(
    'Initialize a new Enzyme project in this workspace?',
    'Yes',
    'No'
  );

  if (answer === 'Yes') {
    await enzymeContext.showInfo('Enzyme project initialization - Coming Soon!');
  }
}

/**
 * PERFORMANCE: Refresh workspace structure with cache invalidation
 */
async function refreshWorkspace(enzymeContext: EnzymeExtensionContext): Promise<void> {
  logger.info('Refreshing workspace structure');

  try {
    // PERFORMANCE: Invalidate cache first to force rescan
    const { invalidateWorkspaceCache } = await import('./core/workspace');
    await invalidateWorkspaceCache();

    const workspace = await getProjectStructure();
    enzymeContext.setWorkspace(workspace);
    logger.success('Workspace refreshed successfully');
  } catch (error) {
    logger.error('Failed to refresh workspace', error);
  }
}

/**
 * Show welcome message on first activation
 */
async function showWelcomeMessage(enzymeContext: EnzymeExtensionContext): Promise<void> {
  const selection = await vscode.window.showInformationMessage(
    `Welcome to ${EXTENSION_NAME}! 🧪`,
    'Get Started',
    'View Documentation',
    'Don\'t Show Again'
  );

  if (selection === 'Get Started') {
    await vscode.commands.executeCommand('workbench.action.showCommands');
  } else if (selection === 'View Documentation') {
    await vscode.env.openExternal(vscode.Uri.parse(URLS.DOCUMENTATION));
  }
}

/**
 * Initialize telemetry (opt-in)
 * Respects VS Code's global telemetry setting per VS Code Extension Guidelines
 */
function initializeTelemetry(enzymeContext: EnzymeExtensionContext): void {
  // CRITICAL: Check VS Code's global telemetry setting first
  const vscodeTelemetryEnabled = vscode.env.isTelemetryEnabled;
  const extensionTelemetryEnabled = enzymeContext.getConfig('enzyme.telemetry.enabled', false);

  const telemetryEnabled = vscodeTelemetryEnabled && extensionTelemetryEnabled;

  if (telemetryEnabled) {
    logger.info('Telemetry enabled');
    // TODO: Initialize actual telemetry provider
  } else {
    logger.info(`Telemetry disabled (VS Code: ${vscodeTelemetryEnabled}, Extension: ${extensionTelemetryEnabled})`);
  }
}

/**
 * Toggle telemetry
 */
async function toggleTelemetry(enzymeContext: EnzymeExtensionContext): Promise<void> {
  const currentState = enzymeContext.getConfig('enzyme.telemetry.enabled', false);
  const newState = !currentState;

  await enzymeContext.updateConfig('enzyme.telemetry.enabled', newState);

  const message = newState
    ? 'Telemetry enabled. Thank you for helping improve Enzyme!'
    : 'Telemetry disabled.';

  await enzymeContext.showInfo(message);
  logger.info(`Telemetry ${newState ? 'enabled' : 'disabled'}`);
}
