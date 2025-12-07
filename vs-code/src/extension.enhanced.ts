/**
 * @file Enzyme VS Code Extension - Enhanced Enterprise Architecture
 * @description Main entry point with full dependency injection and orchestration
 *
 * This enhanced architecture combines:
 * - Lightweight, fast activation (< 10ms)
 * - Full dependency injection container
 * - Comprehensive service registry
 * - Event-driven communication
 * - Proper command wiring
 * - Incredible welcome/onboarding experience
 *
 * @author Enzyme Framework Team
 * @version 2.0.0
 */

import * as vscode from 'vscode';

// Core Infrastructure
import { EnzymeExtensionContext } from './core/context';
import { logger } from './core/logger';
import { EXTENSION_NAME, COMMANDS, URLS } from './core/constants';
import { performanceMonitor } from './core/performance-monitor';

// Orchestration Layer
import { Container } from './orchestration/container';
import { EventBus } from './orchestration/event-bus';
import { ServiceRegistry } from './orchestration/service-registry';
import { ProviderRegistry } from './orchestration/provider-registry';
import { CommandRegistry } from './orchestration/command-registry';
import { LifecycleManager } from './orchestration/lifecycle-manager';
import { TelemetryService } from './orchestration/telemetry-service';
import { HealthMonitor } from './orchestration/health-monitor';
import { CacheManager } from './orchestration/cache-manager';

// Services
import { LoggerService } from './services/logger-service';
import { WorkspaceService } from './services/workspace-service';
import { AnalysisService } from './services/analysis-service';

// Command Registration
import { registerAllCommands } from './commands';

// Provider Registration
import { registerTreeViewProviders } from './providers/treeviews/register-treeviews';
import { registerWebViewProviders } from './providers/webviews/register-webviews';

// Workspace Detection
import {
  detectEnzymeProject,
  getProjectStructure,
  createEnzymeFileWatchers,
} from './core/workspace';

/**
 * Extension API exposed to other extensions
 *
 * @interface EnzymeExtensionAPI
 * @public
 */
export interface EnzymeExtensionAPI {
  /** Dependency injection container */
  container: Container;
  /** Event bus for cross-component communication */
  eventBus: EventBus;
  /** Logger service */
  logger: LoggerService;
  /** Workspace service */
  workspaceService: WorkspaceService;
  /** Analysis service */
  analysisService: AnalysisService;
  /** Lifecycle manager */
  lifecycleManager: LifecycleManager;
  /** Get extension version */
  getVersion(): string;
  /** Check if extension is ready */
  isReady(): boolean;
  /** Get extension context */
  getContext(): vscode.ExtensionContext;
}

/**
 * Global container instance for extension lifecycle
 */
let containerInstance: Container | null = null;

/**
 * Activate the Enzyme VS Code Extension
 *
 * This function is called when the extension is first activated.
 * It performs the following:
 * 1. Security checks (workspace trust)
 * 2. Container initialization
 * 3. Service registration
 * 4. Command registration
 * 5. Provider registration
 * 6. Welcome experience (first-time users)
 *
 * @param context - VS Code extension context
 * @returns Promise resolving to the public API
 *
 * @performance Target activation time: < 50ms
 * @security Respects workspace trust settings
 */
export async function activate(context: vscode.ExtensionContext): Promise<EnzymeExtensionAPI> {
  performanceMonitor.start('extension.activation');
  logger.header(`Activating ${EXTENSION_NAME} v2.0 (Enhanced Architecture)`);

  try {
    // SECURITY: Check workspace trust before performing any operations
    if (!vscode.workspace.isTrusted) {
      logger.warn('Workspace is not trusted. Running in restricted mode.');

      const trustDisposable = vscode.workspace.onDidGrantWorkspaceTrust(async () => {
        logger.info('Workspace trust granted. Enabling full functionality.');
        await initializeFullFunctionality(context);
      });
      context.subscriptions.push(trustDisposable);

      registerSafeCommands(context);
      logger.info(`${EXTENSION_NAME} activated in restricted mode (untrusted workspace)`);

      // Return limited API for untrusted workspaces
      return createLimitedAPI(context);
    }

    // Initialize full functionality for trusted workspaces
    const api = await initializeFullFunctionality(context);

    const activationTime = performanceMonitor.end('extension.activation');
    logger.success(`${EXTENSION_NAME} activated successfully in ${activationTime?.toFixed(2)}ms`);

    return api;

  } catch (error) {
    logger.error('Failed to activate extension', error);
    vscode.window.showErrorMessage(
      `Failed to activate ${EXTENSION_NAME}: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  }
}

/**
 * Initialize full extension functionality (for trusted workspaces)
 *
 * This is the main initialization sequence that sets up all services,
 * registers all providers and commands, and orchestrates the extension startup.
 *
 * @param context - VS Code extension context
 * @returns Promise resolving to the public API
 *
 * @internal
 */
async function initializeFullFunctionality(context: vscode.ExtensionContext): Promise<EnzymeExtensionAPI> {
  logger.info('Initializing full functionality...');

  // ============================================================================
  // PHASE 1: Core Infrastructure Setup
  // ============================================================================
  performanceMonitor.start('phase.1.infrastructure');

  // Initialize singleton context
  const enzymeContext = EnzymeExtensionContext.initialize(context);
  logger.info('✓ Extension context initialized');

  // Initialize DI Container
  const container = Container.getInstance();
  container.initialize(context);
  containerInstance = container;
  logger.info('✓ DI Container initialized');

  // Resolve core services
  const eventBus = container.resolve<EventBus>('EventBus');
  const loggerService = container.resolve<LoggerService>('LoggerService');
  const workspaceService = container.resolve<WorkspaceService>('WorkspaceService');
  const analysisService = container.resolve<AnalysisService>('AnalysisService');
  logger.info('✓ Core services resolved');

  performanceMonitor.end('phase.1.infrastructure');

  // ============================================================================
  // PHASE 2: Orchestration Layer Setup
  // ============================================================================
  performanceMonitor.start('phase.2.orchestration');

  // Create orchestration components
  const serviceRegistry = ServiceRegistry.create(eventBus);
  const providerRegistry = ProviderRegistry.create(eventBus, loggerService);
  const commandRegistry = CommandRegistry.create(eventBus, loggerService);
  const telemetryService = TelemetryService.create(loggerService);
  const healthMonitor = HealthMonitor.create(eventBus, loggerService);
  const cacheManager = CacheManager.create(loggerService);

  // Register orchestration components in container
  container.registerInstance('ServiceRegistry', serviceRegistry);
  container.registerInstance('ProviderRegistry', providerRegistry);
  container.registerInstance('CommandRegistry', commandRegistry);
  container.registerInstance('TelemetryService', telemetryService);
  container.registerInstance('HealthMonitor', healthMonitor);
  container.registerInstance('CacheManager', cacheManager);

  // Initialize orchestration components
  cacheManager.initialize(context);
  healthMonitor.setServiceRegistry(serviceRegistry);
  healthMonitor.setProviderRegistry(providerRegistry);

  logger.info('✓ Orchestration layer initialized');

  performanceMonitor.end('phase.2.orchestration');

  // ============================================================================
  // PHASE 3: Command Registration (Immediate - Lightweight)
  // ============================================================================
  performanceMonitor.start('phase.3.commands');

  // Register all commands using the actual implementations
  const commandDisposables = registerAllCommands(context);
  commandDisposables.forEach(d => enzymeContext.registerDisposable(d));
  logger.info(`✓ ${commandDisposables.length} commands registered`);

  performanceMonitor.end('phase.3.commands');

  // ============================================================================
  // PHASE 4: Provider Registration (Immediate - Lightweight)
  // ============================================================================
  performanceMonitor.start('phase.4.providers');

  // Register TreeView providers
  const treeViewDisposables = registerTreeViewProviders(enzymeContext);
  treeViewDisposables.forEach(d => enzymeContext.registerDisposable(d));
  logger.info(`✓ ${treeViewDisposables.length} TreeView providers registered`);

  // Register WebView providers
  const webViewDisposables = registerWebViewProviders(enzymeContext);
  webViewDisposables.forEach(d => enzymeContext.registerDisposable(d));
  logger.info(`✓ ${webViewDisposables.length} WebView providers registered`);

  performanceMonitor.end('phase.4.providers');

  // ============================================================================
  // PHASE 5: Lifecycle Manager
  // ============================================================================
  performanceMonitor.start('phase.5.lifecycle');

  const lifecycleManager = LifecycleManager.create(container);
  container.registerInstance('LifecycleManager', lifecycleManager);
  await lifecycleManager.activate(context);

  logger.info('✓ Lifecycle manager activated');

  performanceMonitor.end('phase.5.lifecycle');

  // ============================================================================
  // PHASE 6: Deferred Operations (Async - Non-blocking)
  // ============================================================================

  // Defer heavy operations to avoid blocking activation
  setImmediate(async () => {
    try {
      await initializeDeferredOperations(enzymeContext, context, healthMonitor);
    } catch (error) {
      logger.error('Failed to initialize deferred operations', error);
    }
  });

  // ============================================================================
  // PHASE 7: Telemetry & Health Monitoring
  // ============================================================================

  initializeTelemetry(enzymeContext, telemetryService);
  healthMonitor.start();
  logger.info('✓ Health monitoring started');

  // ============================================================================
  // PHASE 8: Disposal Handler
  // ============================================================================

  context.subscriptions.push({
    dispose: async () => {
      logger.info('Disposing Enzyme extension...');
      await lifecycleManager.deactivate();
      healthMonitor.dispose();
      cacheManager.dispose();
      providerRegistry.dispose();
      commandRegistry.dispose();
      await serviceRegistry.dispose();
      telemetryService.dispose();
      analysisService.dispose();
      workspaceService.dispose();
      loggerService.dispose();
      eventBus.dispose();
      container.dispose();
      await enzymeContext.dispose();
      containerInstance = null;
      logger.info('✓ Enzyme extension disposed');
    },
  });

  // ============================================================================
  // Return Public API
  // ============================================================================

  const api: EnzymeExtensionAPI = {
    container,
    eventBus,
    logger: loggerService,
    workspaceService,
    analysisService,
    lifecycleManager,
    getVersion: () => context.extension.packageJSON.version,
    isReady: () => lifecycleManager.isExtensionReady(),
    getContext: () => context,
  };

  logger.success('✓ Extension initialization complete');

  return api;
}

/**
 * Initialize deferred operations (heavy, non-blocking)
 *
 * These operations run after activation completes to avoid blocking
 * the extension host.
 *
 * @param enzymeContext - Extension context
 * @param context - VS Code context
 * @param healthMonitor - Health monitor service
 *
 * @internal
 */
async function initializeDeferredOperations(
  enzymeContext: EnzymeExtensionContext,
  context: vscode.ExtensionContext,
  healthMonitor: HealthMonitor
): Promise<void> {
  performanceMonitor.start('deferred.operations');
  logger.info('Initializing deferred operations...');

  // Detect Enzyme workspace
  const isEnzymeWorkspace = await detectEnzymeProject();
  logger.info(`Enzyme workspace detected: ${isEnzymeWorkspace}`);

  // Set context keys for command enablement
  await vscode.commands.executeCommand('setContext', 'enzyme:isEnzymeProject', isEnzymeWorkspace);

  if (isEnzymeWorkspace) {
    await enzymeContext.withProgress('Loading Enzyme project structure...', async (progress) => {
      progress.report({ message: 'Analyzing project...', increment: 25 });

      const workspace = await getProjectStructure();
      enzymeContext.setWorkspace(workspace);

      // Set additional context keys
      await vscode.commands.executeCommand('setContext', 'enzyme:hasFeatures', workspace.features.length > 0);
      await vscode.commands.executeCommand('setContext', 'enzyme:hasRoutes', workspace.routes.length > 0);
      await vscode.commands.executeCommand('setContext', 'enzyme:isTypeScript', true);

      progress.report({ message: 'Setting up file watchers...', increment: 50 });

      // Create and register file watchers
      const fileWatchers = createEnzymeFileWatchers();
      fileWatchers.forEach(watcher => {
        watcher.onEvent(async event => {
          try {
            logger.debug(`File ${event.type}: ${event.uri.fsPath}`);
            if (event.type === 'changed' || event.type === 'created') {
              await refreshWorkspace(enzymeContext);
            }
          } catch (error) {
            logger.error(`File watcher error for ${event.uri.fsPath}`, error);
          }
        });
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
  }

  // Check for first activation and show welcome
  const isFirstActivation = await enzymeContext.isFirstActivation();
  if (isFirstActivation) {
    logger.info('First activation detected');
    await showEnhancedWelcome(enzymeContext, isEnzymeWorkspace);
  } else if (isEnzymeWorkspace) {
    // Show brief activation notification for returning users
    showQuietActivationNotification(enzymeContext);
  }

  const deferredTime = performanceMonitor.end('deferred.operations');
  logger.info(`✓ Deferred operations completed in ${deferredTime?.toFixed(2)}ms`);
}

/**
 * Show enhanced welcome experience for first-time users
 *
 * This creates an incredible onboarding experience with:
 * - Welcome panel
 * - Auto-detect Enzyme CLI
 * - Installation wizard
 * - Quick setup guide
 *
 * @param enzymeContext - Extension context
 * @param isEnzymeWorkspace - Whether workspace is an Enzyme project
 *
 * @internal
 */
async function showEnhancedWelcome(
  enzymeContext: EnzymeExtensionContext,
  isEnzymeWorkspace: boolean
): Promise<void> {
  logger.info('Showing enhanced welcome experience');

  // Show welcome panel
  await vscode.commands.executeCommand('enzyme.panel.showWelcome');

  // Detect Enzyme CLI
  const cliDetected = await detectEnzymeCLI();

  if (!cliDetected) {
    const response = await vscode.window.showInformationMessage(
      '🧪 Welcome to Enzyme! Would you like to install the Enzyme CLI?',
      { modal: false },
      'Install Now',
      'Manual Setup',
      'Later'
    );

    if (response === 'Install Now') {
      await vscode.commands.executeCommand('enzyme.cli.install');
    } else if (response === 'Manual Setup') {
      await vscode.commands.executeCommand('enzyme.panel.showSetupWizard');
    }
  } else if (!isEnzymeWorkspace) {
    const response = await vscode.window.showInformationMessage(
      '🧪 Enzyme CLI detected! Would you like to initialize an Enzyme project?',
      'Initialize Project',
      'View Documentation',
      'Dismiss'
    );

    if (response === 'Initialize Project') {
      await vscode.commands.executeCommand('enzyme.init');
    } else if (response === 'View Documentation') {
      await vscode.env.openExternal(vscode.Uri.parse(URLS.DOCUMENTATION));
    }
  } else {
    // Enzyme workspace detected, show feature dashboard
    const response = await vscode.window.showInformationMessage(
      `🧪 Welcome to Enzyme! Your project is ready.`,
      'Feature Dashboard',
      'Generator Wizard',
      'Documentation'
    );

    if (response === 'Feature Dashboard') {
      await vscode.commands.executeCommand('enzyme.panel.showFeatureDashboard');
    } else if (response === 'Generator Wizard') {
      await vscode.commands.executeCommand('enzyme.panel.showGeneratorWizard');
    } else if (response === 'Documentation') {
      await vscode.env.openExternal(vscode.Uri.parse(URLS.DOCUMENTATION));
    }
  }
}

/**
 * Show quiet activation notification for returning users
 *
 * @param enzymeContext - Extension context
 * @internal
 */
function showQuietActivationNotification(enzymeContext: EnzymeExtensionContext): void {
  vscode.window.showInformationMessage(
    `${EXTENSION_NAME} is now active!`,
    'Show Commands',
    'Feature Dashboard'
  ).then(selection => {
    if (selection === 'Show Commands') {
      vscode.commands.executeCommand('workbench.action.showCommands');
    } else if (selection === 'Feature Dashboard') {
      vscode.commands.executeCommand('enzyme.panel.showFeatureDashboard');
    }
  }, error => {
    logger.error('Failed to show activation notification', error);
  });
}

/**
 * Detect Enzyme CLI installation
 *
 * @returns Promise resolving to true if CLI is detected
 * @internal
 */
async function detectEnzymeCLI(): Promise<boolean> {
  try {
    // This will be implemented by the CLI detector service
    await vscode.commands.executeCommand('enzyme.cli.detect');
    return true;
  } catch {
    return false;
  }
}

/**
 * Refresh workspace structure
 *
 * @param enzymeContext - Extension context
 * @internal
 */
async function refreshWorkspace(enzymeContext: EnzymeExtensionContext): Promise<void> {
  logger.info('Refreshing workspace structure');
  try {
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
 * Initialize telemetry service (opt-in)
 *
 * Respects VS Code's global telemetry setting per VS Code Extension Guidelines
 *
 * @param enzymeContext - Extension context
 * @param telemetryService - Telemetry service
 * @internal
 */
function initializeTelemetry(
  enzymeContext: EnzymeExtensionContext,
  telemetryService: TelemetryService
): void {
  const vscodeTelemetryEnabled = vscode.env.isTelemetryEnabled;
  const extensionTelemetryEnabled = enzymeContext.getConfig('enzyme.telemetry.enabled', false);
  const telemetryEnabled = vscodeTelemetryEnabled && extensionTelemetryEnabled;

  if (telemetryEnabled) {
    logger.info('Telemetry enabled');
    telemetryService.track('extension.activated', {
      version: enzymeContext.getContext().extension.packageJSON.version,
    });
  } else {
    logger.info(`Telemetry disabled (VS Code: ${vscodeTelemetryEnabled}, Extension: ${extensionTelemetryEnabled})`);
  }
}

/**
 * Register only safe commands for untrusted workspaces
 *
 * These commands don't execute code or access sensitive files
 *
 * @param context - VS Code extension context
 * @security Only documentation and info commands
 * @internal
 */
function registerSafeCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.DOCS_OPEN, async () => {
      await vscode.env.openExternal(vscode.Uri.parse(URLS.DOCUMENTATION));
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.DEBUG_SHOW_LOGS, async () => {
      logger.show();
    })
  );

  logger.info('Safe commands registered for untrusted workspace');
}

/**
 * Create limited API for untrusted workspaces
 *
 * @param context - VS Code extension context
 * @returns Limited API object
 * @internal
 */
function createLimitedAPI(context: vscode.ExtensionContext): EnzymeExtensionAPI {
  const container = Container.getInstance();
  const eventBus = EventBus.getInstance();
  const loggerService = LoggerService.getInstance();
  const workspaceService = WorkspaceService.getInstance();
  const analysisService = AnalysisService.getInstance();

  return {
    container,
    eventBus,
    logger: loggerService,
    workspaceService,
    analysisService,
    lifecycleManager: null as any, // Not available in restricted mode
    getVersion: () => context.extension.packageJSON.version,
    isReady: () => false, // Never ready in restricted mode
    getContext: () => context,
  };
}

/**
 * Deactivate the extension
 *
 * This is called when the extension is deactivated.
 * Cleanup is handled in the disposal registered in activate().
 *
 * @public
 */
export async function deactivate(): Promise<void> {
  logger.header(`Deactivating ${EXTENSION_NAME}`);
  // Cleanup is handled in the disposal handler
  logger.success(`${EXTENSION_NAME} deactivated successfully`);
}
