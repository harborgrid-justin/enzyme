/**
 * Bootstrap - Alternative Enterprise-Grade Architecture for Enzyme VS Code Extension
 *
 * ⚠️ NOTE: This file implements a full DI-based architecture with orchestration patterns.
 * It is currently NOT USED as the main entry point (see extension.ts instead).
 *
 * This bootstrap module provides:
 * - Full Dependency Injection Container
 * - Event Bus for cross-component communication
 * - Lifecycle Management with phased initialization
 * - Service Registry and Provider Registry
 * - Health Monitoring and Cache Management
 * - Indexing Coordinator for workspace analysis
 * - File Watcher Coordinator for file system events
 * - View Orchestrator for UI components
 *
 * ARCHITECTURAL DECISION:
 * We maintain TWO architectures in this codebase:
 * 1. extension.ts - Simple, lightweight architecture (CURRENTLY ACTIVE)
 * 2. bootstrap.ts - Enterprise-grade DI architecture (FOR FUTURE MIGRATION)
 *
 * The simple architecture (extension.ts) is currently used for:
 * - Faster activation time
 * - Simpler debugging and maintenance
 * - Gradual feature development
 *
 * The bootstrap architecture can be adopted when:
 * - The extension grows to need more sophisticated dependency management
 * - Multiple complex subsystems need to coordinate
 * - Enterprise features require orchestration
 *
 * To switch to this architecture, simply change package.json main entry to use
 * this file's activate/deactivate exports instead of extension.ts.
 */

import * as vscode from 'vscode';
import { CacheManager } from './orchestration/cache-manager';
import { CommandRegistry } from './orchestration/command-registry';
import { Container } from './orchestration/container';
import { FileWatcherCoordinator } from './orchestration/file-watcher-coordinator';
import { HealthMonitor } from './orchestration/health-monitor';
import { IndexingCoordinator } from './orchestration/indexing-coordinator';
import { LifecycleManager } from './orchestration/lifecycle-manager';
import { ProviderRegistry } from './orchestration/provider-registry';
import { ServiceRegistry } from './orchestration/service-registry';
import { TelemetryService } from './orchestration/telemetry-service';
import { ViewOrchestrator } from './orchestration/view-orchestrator';
import { WorkspaceAnalyzer } from './orchestration/workspace-analyzer';
import type { EventBus } from './orchestration/event-bus';
import type { AnalysisService } from './services/analysis-service';
import type { LoggerService } from './services/logger-service';
import type { WorkspaceService } from './services/workspace-service';

/**
 * Public API exposed by the Enzyme VS Code extension
 *
 * This interface defines the public API that can be accessed by other extensions
 * or programmatic consumers of the Enzyme extension.
 *
 * @description
 * This API is returned from the activate() function and provides access to:
 * - Core services (container, event bus, logger, workspace, analysis)
 * - Lifecycle management
 * - Extension metadata (version, ready state)
 *
 * @example
 * ```typescript
 * const enzymeExt = vscode.extensions.getExtension('missionfabric.enzyme-vscode');
 * const api = await enzymeExt.activate() as EnzymeExtensionAPI;
 * console.log('Enzyme version:', api.getVersion());
 * ```
 */
export interface EnzymeExtensionAPI {
  container: Container;
  eventBus: EventBus;
  logger: LoggerService;
  workspaceService: WorkspaceService;
  analysisService: AnalysisService;
  lifecycleManager: LifecycleManager;
  getVersion(): string;
  isReady(): boolean;
}

/**
 * Bootstraps the extension using enterprise-grade DI architecture
 *
 * This function implements a comprehensive dependency injection and orchestration
 * pattern for the extension. It initializes and coordinates:
 * - Dependency injection container
 * - Event bus for cross-component communication
 * - Service registry for core services
 * - Provider registry for TreeView/WebView providers
 * - Command registry
 * - Indexing coordinator for workspace analysis
 * - File watcher coordinator
 * - View orchestrator
 * - Telemetry service
 * - Health monitoring
 * - Cache management
 *
 * @param context - The VS Code extension context
 * @returns A promise that resolves to the extension's public API
 *
 * @description
 * This is an alternative architecture to the simpler extension.ts implementation.
 * It provides:
 * - Full dependency injection with Container pattern
 * - Phased lifecycle management
 * - Advanced health monitoring
 * - State persistence and restoration
 * - Coordinated file watching and indexing
 *
 * To use this architecture, change package.json "main" to point to this file.
 *
 * @see {@link EnzymeExtensionAPI} for the returned API interface
 */
export async function bootstrap(context: vscode.ExtensionContext): Promise<EnzymeExtensionAPI> {
  // Create container
  const container = Container.getInstance();
  container.initialize(context);

  // Resolve core services
  const eventBus = container.resolve<EventBus>('EventBus');
  const logger = container.resolve<LoggerService>('LoggerService');
  const workspaceService = container.resolve<WorkspaceService>('WorkspaceService');
  const analysisService = container.resolve<AnalysisService>('AnalysisService');

  logger.info('Bootstrapping Enzyme extension...');

  // Create orchestration components
  const serviceRegistry = ServiceRegistry.create(eventBus);
  const providerRegistry = ProviderRegistry.create(eventBus, logger);
  const commandRegistry = CommandRegistry.create(eventBus, logger);
  const indexingCoordinator = IndexingCoordinator.create(eventBus, logger, workspaceService);
  const fileWatcherCoordinator = FileWatcherCoordinator.create(eventBus, logger);
  const viewOrchestrator = ViewOrchestrator.create(eventBus, logger);
  const telemetryService = TelemetryService.create(logger);
  const healthMonitor = HealthMonitor.create(eventBus, logger);
  const cacheManager = CacheManager.create(logger);
  const workspaceAnalyzer = WorkspaceAnalyzer.create(logger, workspaceService);

  // Register orchestration components in container
  container.registerInstance('ServiceRegistry', serviceRegistry);
  container.registerInstance('ProviderRegistry', providerRegistry);
  container.registerInstance('CommandRegistry', commandRegistry);
  container.registerInstance('IndexingCoordinator', indexingCoordinator);
  container.registerInstance('FileWatcherCoordinator', fileWatcherCoordinator);
  container.registerInstance('ViewOrchestrator', viewOrchestrator);
  container.registerInstance('TelemetryService', telemetryService);
  container.registerInstance('HealthMonitor', healthMonitor);
  container.registerInstance('CacheManager', cacheManager);
  container.registerInstance('WorkspaceAnalyzer', workspaceAnalyzer);

  // Initialize components
  cacheManager.initialize(context);
  healthMonitor.setServiceRegistry(serviceRegistry);
  healthMonitor.setProviderRegistry(providerRegistry);

  // Restore state
  await indexingCoordinator.restoreIndex(context);
  viewOrchestrator.restoreLayout(context);

  // Register standard file watchers
  fileWatcherCoordinator.registerStandardWatchers();

  // Create lifecycle manager
  const lifecycleManager = LifecycleManager.create(container);
  container.registerInstance('LifecycleManager', lifecycleManager);

  // Activate extension
  await lifecycleManager.activate(context);

  // Start health monitoring
  healthMonitor.start();

  // Register disposal
  context.subscriptions.push({
    dispose: async () => {
      logger.info('Disposing Enzyme extension...');

      // Save state
      await indexingCoordinator.persistIndex(context);
      viewOrchestrator.saveLayout(context);

      // Deactivate
      await lifecycleManager.deactivate();

      // Dispose components
      healthMonitor.dispose();
      cacheManager.dispose();
      fileWatcherCoordinator.dispose();
      viewOrchestrator.dispose();
      providerRegistry.dispose();
      commandRegistry.dispose();
      await serviceRegistry.dispose();
      // WorkspaceAnalyzer doesn't have a dispose method, no cleanup needed
      telemetryService.dispose();
      analysisService.dispose();
      workspaceService.dispose();
      logger.dispose();
      eventBus.dispose();
      container.dispose();

      logger.info('Enzyme extension disposed');
    },
  });

  logger.success('Enzyme extension bootstrapped successfully');

  // Return API
  return {
    container,
    eventBus,
    logger,
    workspaceService,
    analysisService,
    lifecycleManager,

    getVersion(): string {
      try {
         
        const {version} = context.extension.packageJSON;
        return typeof version === 'string' ? version : '0.0.0';
      } catch {
        return '0.0.0';
      }
    },

    isReady(): boolean {
      return lifecycleManager.isExtensionReady();
    },
  };
}

/**
 * Activates the Enzyme extension using the enterprise DI architecture
 *
 * This is the main entry point when using the bootstrap architecture.
 * It wraps the bootstrap function with error handling and provides
 * a clean interface for VS Code to activate the extension.
 *
 * @param context - The VS Code extension context
 * @returns A promise that resolves to the extension's public API
 * @throws Will show error message to user if activation fails
 *
 * @description
 * - This function is called by VS Code when the extension activates
 * - It delegates to the bootstrap() function for initialization
 * - Errors are caught, logged, and displayed to the user
 * - The error is re-thrown to signal activation failure to VS Code
 *
 * @see {@link bootstrap} for the actual initialization logic
 * @see {@link EnzymeExtensionAPI} for the returned API interface
 */
export async function activate(context: vscode.ExtensionContext): Promise<EnzymeExtensionAPI> {
  try {
    return await bootstrap(context);
  } catch (error) {
    console.error('Failed to activate Enzyme extension:', error);
    vscode.window.showErrorMessage(
      `Failed to activate Enzyme extension: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  }
}

/**
 * Deactivates the Enzyme extension
 *
 * This function is called by VS Code when the extension is being deactivated.
 * In the bootstrap architecture, all cleanup is handled by the disposable
 * registered in the bootstrap() function, so this is a no-op.
 *
 * @returns A promise that resolves when deactivation is complete
 *
 * @description
 * The actual cleanup logic is in the disposal handler registered with
 * context.subscriptions in the bootstrap() function. This ensures proper
 * cleanup of:
 * - Persisted state (index, view layout)
 * - Lifecycle manager
 * - Health monitoring
 * - All orchestration components
 * - All services
 * - Container
 *
 * @see {@link bootstrap} for the disposal registration
 */
export async function deactivate(): Promise<void> {
  // Cleanup is handled in the disposal registered in bootstrap
}
