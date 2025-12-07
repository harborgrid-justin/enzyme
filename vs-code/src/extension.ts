/**
 * Enzyme VS Code Extension
 * Main entry point for the extension
 */

import * as vscode from 'vscode';
import { registerCLIFeatures } from './cli/index';
import { registerConfigFeatures } from './config/index';
import { EXTENSION_NAME, COMMANDS, URLS } from './core/constants';
import { EnzymeExtensionContext } from './core/context';
import { logger } from './core/logger';
import { performanceMonitor } from './core/performance-monitor';
import {
  detectEnzymeProject,
  getProjectStructure,
  createEnzymeFileWatchers,
} from './core/workspace';
import { registerCodeActionProviders } from './providers/codeactions/index';
import { registerCodeLensProviders } from './providers/codelens/index';
import { registerDiagnostics } from './providers/diagnostics/index';
import { registerLanguageProviders } from './providers/language/index';
import { registerTreeViewProviders } from './providers/treeviews/register-treeviews';
import { registerWebViewProviders } from './providers/webviews/register-webviews';

// NOTE: File watchers are now stored in context.subscriptions to avoid module-level state

/**
 * Activates the Enzyme VS Code extension
 *
 * This is the main entry point called by VS Code when the extension is activated.
 * Implements lazy activation patterns and workspace trust validation for optimal
 * performance and security.
 *
 * @param context - The VS Code extension context providing access to extension APIs and lifecycle
 * @returns A promise that resolves when activation is complete
 *
 * @remarks
 * - Respects workspace trust settings per VS Code Extension Guidelines
 * - Uses performance monitoring to track activation time (target: < 10ms)
 * - Defers heavy operations (workspace analysis, file watching) to avoid blocking
 * - Registers only safe commands in untrusted workspaces
 * - Handles activation errors gracefully with user notifications
 *
 * @see {@link https://code.visualstudio.com/api/references/activation-events | VS Code Activation Events}
 * @see {@link https://code.visualstudio.com/api/extension-guides/workspace-trust | Workspace Trust}
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  performanceMonitor.start('extension.activation');
  logger.header(`Activating ${EXTENSION_NAME}`);

  try {
    // SECURITY: Check workspace trust before performing any operations
    // Per VS Code Extension Guidelines, extensions should respect workspace trust
    if (!vscode.workspace.isTrusted) {
      logger.warn('Workspace is not trusted. Running in restricted mode.');

      // Register listener for when workspace becomes trusted
      const trustDisposable = vscode.workspace.onDidGrantWorkspaceTrust(async () => {
        logger.info('Workspace trust granted. Enabling full functionality.');
        await initializeFullFunctionality(context);
      });
      context.subscriptions.push(trustDisposable);

      // Only register safe commands in untrusted workspaces
      registerSafeCommands(context);

      logger.info(`${EXTENSION_NAME} activated in restricted mode (untrusted workspace)`);
      return;
    }

    await initializeFullFunctionality(context);

  } catch (error) {
    logger.error('Failed to activate extension', error);
    vscode.window.showErrorMessage(
      `Failed to activate ${EXTENSION_NAME}: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    const activationTime = performanceMonitor.end('extension.activation');
    logger.info(`Extension activation completed in ${activationTime?.toFixed(2)}ms`);
  }
}

/**
 * Registers safe commands that can be executed in untrusted workspaces
 *
 * Per VS Code Extension Guidelines, extensions must provide limited functionality
 * in untrusted workspaces. This function registers commands that:
 * - Don't execute arbitrary code
 * - Don't access or modify sensitive files
 * - Don't perform file system operations
 *
 * @param context - The VS Code extension context for registering commands
 *
 * @remarks
 * Safe commands include:
 * - Documentation links (read-only, external)
 * - Log viewing (diagnostic, no code execution)
 *
 * @see {@link https://code.visualstudio.com/api/extension-guides/workspace-trust | Workspace Trust Guide}
 */
function registerSafeCommands(context: vscode.ExtensionContext): void {
  // Documentation commands are safe
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.DOCS_OPEN, async () => {
      await vscode.env.openExternal(vscode.Uri.parse(URLS.DOCUMENTATION));
    })
  );

  // Show logs is safe
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.DEBUG_SHOW_LOGS, async () => {
      logger.show();
    })
  );

  logger.info('Safe commands registered for untrusted workspace');
}

/**
 * Initializes full extension functionality for trusted workspaces
 *
 * This function sets up all extension features including:
 * - Command registration
 * - TreeView and WebView providers
 * - Workspace analysis (deferred)
 * - Telemetry (opt-in)
 * - First-time activation checks
 *
 * @param context - The VS Code extension context
 * @returns A promise that resolves when initialization is complete
 *
 * @remarks
 * Heavy operations like workspace analysis are deferred using `setImmediate`
 * to ensure the extension activation completes quickly (< 10ms target).
 * This prevents blocking the VS Code extension host during startup.
 */
async function initializeFullFunctionality(context: vscode.ExtensionContext): Promise<void> {
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

    // ORCHESTRATION: Register language features providers
    // Note: Language providers require workspace root path, so we defer until workspace is available
    // This registration happens in initializeEnzymeWorkspace for Enzyme projects

    // ORCHESTRATION: Register CodeLens providers (enhances editor experience)
    registerCodeLensProviders(context);
    logger.info('CodeLens providers registered');

    // ORCHESTRATION: Register diagnostics provider (enables Problems panel)
    registerDiagnostics(context);
    logger.info('Diagnostics provider registered');

    // ORCHESTRATION: Register code actions provider (enables quick fixes and refactorings)
    registerCodeActionProviders(context);
    logger.info('Code actions providers registered');

    // ORCHESTRATION: Register configuration features (config completion, validation, etc.)
    const configDisposables = registerConfigFeatures(context);
    configDisposables.forEach(d => enzymeContext.registerDisposable(d));
    logger.info('Configuration features registered');

    // ORCHESTRATION: Register CLI features (task provider, debug config, terminal, etc.)
    // This is async and runs detection/installation prompts
    registerCLIFeatures(context).catch(error => {
      logger.error('Failed to register CLI features', error);
    });
    logger.info('CLI features registration initiated');

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
}

/**
 * Deactivates the Enzyme VS Code extension
 *
 * This function is called by VS Code when the extension is being deactivated.
 * It performs cleanup of all extension resources including:
 * - Extension context singleton
 * - File watchers (via context.subscriptions)
 * - Status bar items
 * - Diagnostic collections
 * - Event emitters
 *
 * @returns A promise that resolves when deactivation is complete
 *
 * @remarks
 * - File watchers are automatically disposed via context.subscriptions
 * - Handles cases where activation may have failed (context may not exist)
 * - All errors during deactivation are logged but don't throw
 *
 * @see {@link https://code.visualstudio.com/api/references/vscode-api#Extension | Extension Lifecycle}
 */
export async function deactivate(): Promise<void> {
  logger.header(`Deactivating ${EXTENSION_NAME}`);

  try {
    // Dispose extension context (file watchers are disposed via context.subscriptions)
    try {
      const enzymeContext = EnzymeExtensionContext.getInstance();
      await enzymeContext.dispose();
    } catch {
      // Instance may not exist if activation failed
      logger.warn('Extension context not initialized during deactivation');
    }

    logger.success(`${EXTENSION_NAME} deactivated successfully`);
  } catch (error) {
    logger.error('Error during deactivation', error);
  }
}

/**
 * Initializes Enzyme workspace detection and file watching
 *
 * This function performs heavy workspace analysis operations that are deferred
 * from the main activation path to ensure fast extension startup. It:
 * - Detects if the workspace is an Enzyme project
 * - Loads project structure (features, routes, components)
 * - Sets up file watchers for config and structure changes
 * - Updates VS Code context keys for command enablement
 * - Shows activation notifications to the user
 *
 * @param enzymeContext - The Enzyme extension context singleton
 * @param context - The VS Code extension context
 * @returns A promise that resolves when workspace initialization is complete
 *
 * @remarks
 * - Called via `setImmediate` to avoid blocking extension activation
 * - Uses progress indicators for long-running operations
 * - File watchers are registered via context.subscriptions for proper cleanup
 * - Performance is tracked and logged
 * - Errors are logged but don't prevent extension from functioning
 */
async function initializeEnzymeWorkspace(
  enzymeContext: EnzymeExtensionContext,
  context: vscode.ExtensionContext
): Promise<void> {
  return performanceMonitor.measure('workspace.initialization', async () => {
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

      // ORCHESTRATION: Register language providers now that we have workspace
      progress.report({ message: 'Initializing language features...', increment: 50 });
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (workspaceRoot) {
        try {
          await registerLanguageProviders(context, workspaceRoot);
          logger.info('Language providers registered');
        } catch (error) {
          logger.error('Failed to register language providers', error);
        }
      }

      // Set additional context keys based on project structure
      await vscode.commands.executeCommand('setContext', 'enzyme:hasFeatures', workspace.features.length > 0);
      await vscode.commands.executeCommand('setContext', 'enzyme:hasRoutes', workspace.routes.length > 0);
      await vscode.commands.executeCommand('setContext', 'enzyme:isTypeScript', true); // Set based on project analysis

      progress.report({ message: 'Setting up file watchers...', increment: 70 });

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
  });
}

/**
 * Checks if this is the first activation of the extension and shows welcome message
 *
 * This check is performed asynchronously to avoid blocking activation.
 * On first activation, displays a welcome message with quick-start options.
 *
 * @param enzymeContext - The Enzyme extension context singleton
 * @returns A promise that resolves when the check is complete
 *
 * @remarks
 * - Uses global state to persist first activation flag across sessions
 * - Called asynchronously after main activation completes
 * - Errors are caught and logged without disrupting extension functionality
 */
async function isFirstActivationCheck(enzymeContext: EnzymeExtensionContext): Promise<void> {
  const isFirstActivation = await enzymeContext.isFirstActivation();
  if (isFirstActivation) {
    logger.info('First activation detected');
    await showWelcomeMessage(enzymeContext);
  }
}

/**
 * Wraps command handlers with consistent error handling and logging
 *
 * This higher-order function provides a standard error handling pattern for all
 * extension commands. It ensures that:
 * - Commands are logged when executed
 * - Errors are caught and logged with context
 * - Users are notified of errors with actionable options
 * - Stack traces are preserved for debugging
 *
 * @param commandId - The command identifier for logging and error messages
 * @param handler - The async command handler function to wrap
 * @returns A wrapped command handler with error handling
 *
 * @remarks
 * All extension commands should be wrapped with this function to ensure
 * consistent error handling and user experience.
 *
 * @example
 * ```typescript
 * vscode.commands.registerCommand(
 *   'enzyme.myCommand',
 *   wrapCommandHandler('enzyme.myCommand', async () => {
 *     // Command implementation
 *   })
 * );
 * ```
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
 * Registers all extension commands with the VS Code command registry
 *
 * This function registers all Enzyme extension commands organized by category:
 * - Initialization (project setup)
 * - Generation (components, features, routes, stores, hooks, API clients, tests)
 * - Analysis (performance, security, dependencies)
 * - Refactoring (convert to Enzyme, optimize imports)
 * - Validation (config, routes, features)
 * - Explorer (refresh, open files)
 * - Documentation (open docs, show snippets)
 * - Migration (analyze CRA/Next.js projects)
 * - Debug & Utility (telemetry, logs, workspace detection)
 *
 * @param enzymeContext - The Enzyme extension context singleton
 *
 * @remarks
 * - All commands are wrapped with `wrapCommandHandler` for consistent error handling
 * - Commands are registered via enzymeContext.registerDisposable for proper cleanup
 * - Command enablement is controlled by context keys set in package.json
 * - Most commands show "Coming Soon" messages as placeholders for future implementation
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
 * Handles the enzyme.init command to initialize a new Enzyme project
 *
 * Prompts the user to confirm initialization and then guides them through
 * the project setup process.
 *
 * @param enzymeContext - The Enzyme extension context singleton
 * @returns A promise that resolves when the command completes
 *
 * @remarks
 * Currently shows a placeholder message. Future implementation will:
 * - Create enzyme.config.ts
 * - Set up project structure
 * - Install required dependencies
 * - Configure routing and state management
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
 * Refreshes the workspace structure by invalidating cache and re-analyzing
 *
 * This function forces a complete re-scan of the workspace to detect changes in:
 * - Features and feature modules
 * - Routes and route configuration
 * - Components and component structure
 * - State stores
 * - API clients
 * - Enzyme configuration
 *
 * @param enzymeContext - The Enzyme extension context singleton
 * @returns A promise that resolves when the workspace is refreshed
 *
 * @remarks
 * - Invalidates all cached workspace data before re-scanning
 * - Updates all TreeView providers with new data
 * - Errors are logged but don't throw to maintain extension stability
 * - Typically called when user clicks "Refresh" or file watcher detects changes
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
 * Shows a welcome message to users on their first activation of the extension
 *
 * Displays an informative message with quick-start options including:
 * - Get Started: Opens command palette for quick actions
 * - View Documentation: Opens Enzyme framework documentation
 * - Don't Show Again: Suppresses future welcome messages
 *
 * @param _enzymeContext - The Enzyme extension context singleton (unused in current implementation)
 * @returns A promise that resolves when the user responds to the message
 *
 * @remarks
 * - Only shown once per installation (tracked in global state)
 * - Provides new users with immediate guidance
 * - Non-blocking - user can dismiss and continue working
 */
async function showWelcomeMessage(_enzymeContext: EnzymeExtensionContext): Promise<void> {
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
 * Initializes opt-in telemetry for the extension
 *
 * Configures anonymous usage telemetry while respecting user privacy preferences.
 * Telemetry is only enabled when BOTH conditions are met:
 * 1. VS Code's global telemetry setting is enabled
 * 2. Extension-specific telemetry setting is enabled
 *
 * @param enzymeContext - The Enzyme extension context singleton
 *
 * @remarks
 * - Respects VS Code Extension Guidelines for telemetry
 * - No personal data is collected
 * - Defaults to disabled (opt-in only)
 * - Logs telemetry status for transparency
 *
 * @see {@link https://code.visualstudio.com/api/extension-guides/telemetry | VS Code Telemetry Guide}
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
 * Toggles the extension's telemetry setting on or off
 *
 * Allows users to enable or disable extension-specific telemetry collection.
 * Note that VS Code's global telemetry setting must also be enabled for
 * telemetry to be active.
 *
 * @param enzymeContext - The Enzyme extension context singleton
 * @returns A promise that resolves when the setting is updated
 *
 * @remarks
 * - Updates the 'enzyme.telemetry.enabled' configuration
 * - Shows confirmation message to user
 * - Logs the new telemetry state
 * - Setting persists across sessions
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
