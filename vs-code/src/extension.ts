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

// File watchers
let fileWatchers: FileWatcher[] = [];

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

    // Check if this is the first activation
    const isFirstActivation = await enzymeContext.isFirstActivation();
    if (isFirstActivation) {
      logger.info('First activation detected');
      await showWelcomeMessage(enzymeContext);
    }

    // Detect Enzyme workspace
    const isEnzymeWorkspace = await detectEnzymeProject();
    logger.info(`Enzyme workspace detected: ${isEnzymeWorkspace}`);

    if (isEnzymeWorkspace) {
      // Analyze project structure
      const workspace = await getProjectStructure();
      enzymeContext.setWorkspace(workspace);

      // Create file watchers
      fileWatchers = createEnzymeFileWatchers();

      // Register file watcher event handlers
      fileWatchers.forEach(watcher => {
        watcher.onEvent(async event => {
          logger.debug(`File ${event.type}: ${event.uri.fsPath}`);

          // Refresh workspace structure on config changes
          if (event.type === 'changed' || event.type === 'created') {
            await refreshWorkspace(enzymeContext);
          }
        });
      });

      // Show status bar item
      const statusBarItem = enzymeContext.getStatusBarItem('enzyme-status', {
        text: '$(beaker) Enzyme',
        tooltip: `Enzyme Framework v${workspace.enzymeVersion || 'unknown'}`,
        command: COMMANDS.DOCS_OPEN,
      });
      statusBarItem.show();
    }

    // Register all commands
    registerCommands(enzymeContext);

    // Register providers (placeholder - will be implemented in future)
    // registerTreeViewProviders(enzymeContext);
    // registerLanguageProviders(enzymeContext);
    // registerWebViewProviders(enzymeContext);

    // Initialize telemetry (opt-in)
    initializeTelemetry(enzymeContext);

    logger.success(`${EXTENSION_NAME} activated successfully`);

    // Show activation notification for Enzyme workspaces
    if (isEnzymeWorkspace) {
      vscode.window.showInformationMessage(
        `${EXTENSION_NAME} is now active! 🧪`,
        'Show Commands',
        'Open Docs'
      ).then(selection => {
        if (selection === 'Show Commands') {
          vscode.commands.executeCommand('workbench.action.showCommands');
        } else if (selection === 'Open Docs') {
          vscode.commands.executeCommand(COMMANDS.DOCS_OPEN);
        }
      });
    }

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
 */
export function deactivate(): void {
  logger.header(`Deactivating ${EXTENSION_NAME}`);

  try {
    // Stop file watchers
    fileWatchers.forEach(watcher => watcher.dispose());
    fileWatchers = [];

    // Dispose extension context
    const enzymeContext = EnzymeExtensionContext.getInstance();
    enzymeContext.dispose();

    logger.success(`${EXTENSION_NAME} deactivated successfully`);
  } catch (error) {
    logger.error('Error during deactivation', error);
  }
}

/**
 * Register all extension commands
 */
function registerCommands(enzymeContext: EnzymeExtensionContext): void {
  logger.info('Registering commands');

  // Initialization
  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.INIT, async () => {
      await handleInitCommand(enzymeContext);
    })
  );

  // Generation Commands
  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.GENERATE_COMPONENT, async () => {
      await enzymeContext.showInfo('Generate Component - Coming Soon!');
    })
  );

  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.GENERATE_FEATURE, async () => {
      await enzymeContext.showInfo('Generate Feature - Coming Soon!');
    })
  );

  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.GENERATE_ROUTE, async () => {
      await enzymeContext.showInfo('Generate Route - Coming Soon!');
    })
  );

  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.GENERATE_STORE, async () => {
      await enzymeContext.showInfo('Generate Store - Coming Soon!');
    })
  );

  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.GENERATE_HOOK, async () => {
      await enzymeContext.showInfo('Generate Hook - Coming Soon!');
    })
  );

  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.GENERATE_API_CLIENT, async () => {
      await enzymeContext.showInfo('Generate API Client - Coming Soon!');
    })
  );

  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.GENERATE_TEST, async () => {
      await enzymeContext.showInfo('Generate Test - Coming Soon!');
    })
  );

  // Analysis Commands
  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.ANALYZE_PERFORMANCE, async () => {
      await enzymeContext.showInfo('Analyze Performance - Coming Soon!');
    })
  );

  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.ANALYZE_SECURITY, async () => {
      await enzymeContext.showInfo('Analyze Security - Coming Soon!');
    })
  );

  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.ANALYZE_DEPENDENCIES, async () => {
      await enzymeContext.showInfo('Analyze Dependencies - Coming Soon!');
    })
  );

  // Refactoring Commands
  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.REFACTOR_CONVERT_TO_ENZYME, async () => {
      await enzymeContext.showInfo('Convert to Enzyme - Coming Soon!');
    })
  );

  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.REFACTOR_OPTIMIZE_IMPORTS, async () => {
      await enzymeContext.showInfo('Optimize Imports - Coming Soon!');
    })
  );

  // Validation Commands
  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.VALIDATE_CONFIG, async () => {
      await enzymeContext.showInfo('Validate Config - Coming Soon!');
    })
  );

  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.VALIDATE_ROUTES, async () => {
      await enzymeContext.showInfo('Validate Routes - Coming Soon!');
    })
  );

  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.VALIDATE_FEATURES, async () => {
      await enzymeContext.showInfo('Validate Features - Coming Soon!');
    })
  );

  // Explorer Commands
  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.EXPLORER_REFRESH, async () => {
      await refreshWorkspace(enzymeContext);
      await enzymeContext.showInfo('Explorer refreshed');
    })
  );

  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.EXPLORER_OPEN_FILE, async (uri: vscode.Uri) => {
      if (uri) {
        await vscode.window.showTextDocument(uri);
      }
    })
  );

  // Documentation Commands
  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.DOCS_OPEN, async () => {
      await vscode.env.openExternal(vscode.Uri.parse(URLS.DOCUMENTATION));
    })
  );

  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.SNIPPETS_SHOW, async () => {
      await enzymeContext.showInfo('Code Snippets - Coming Soon!');
    })
  );

  // Migration Commands
  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.MIGRATION_ANALYZE, async () => {
      await enzymeContext.showInfo('Migration Analysis - Coming Soon!');
    })
  );

  // Debug & Utility Commands
  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.TELEMETRY_TOGGLE, async () => {
      await toggleTelemetry(enzymeContext);
    })
  );

  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.DEBUG_SHOW_LOGS, () => {
      logger.show();
    })
  );

  enzymeContext.registerDisposable(
    vscode.commands.registerCommand(COMMANDS.WORKSPACE_DETECT, async () => {
      const isEnzyme = await detectEnzymeProject();
      const message = isEnzyme
        ? 'This is an Enzyme project! 🧪'
        : 'No Enzyme project detected in this workspace.';
      await enzymeContext.showInfo(message);
    })
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
 * Refresh workspace structure
 */
async function refreshWorkspace(enzymeContext: EnzymeExtensionContext): Promise<void> {
  logger.info('Refreshing workspace structure');

  try {
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
 */
function initializeTelemetry(enzymeContext: EnzymeExtensionContext): void {
  const telemetryEnabled = enzymeContext.getConfig('enzyme.telemetry.enabled', false);

  if (telemetryEnabled) {
    logger.info('Telemetry enabled');
    // TODO: Initialize actual telemetry provider
  } else {
    logger.info('Telemetry disabled');
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
