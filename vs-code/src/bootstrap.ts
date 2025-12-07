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
import { Container } from './orchestration/container';
import { EventBus } from './orchestration/event-bus';
import { LifecycleManager } from './orchestration/lifecycle-manager';
import { ServiceRegistry } from './orchestration/service-registry';
import { ProviderRegistry } from './orchestration/provider-registry';
import { CommandRegistry } from './orchestration/command-registry';
import { IndexingCoordinator } from './orchestration/indexing-coordinator';
import { FileWatcherCoordinator } from './orchestration/file-watcher-coordinator';
import { ViewOrchestrator } from './orchestration/view-orchestrator';
import { TelemetryService } from './orchestration/telemetry-service';
import { HealthMonitor } from './orchestration/health-monitor';
import { CacheManager } from './orchestration/cache-manager';
import { WorkspaceAnalyzer } from './orchestration/workspace-analyzer';
import { LoggerService } from './services/logger-service';
import { WorkspaceService } from './services/workspace-service';
import { AnalysisService } from './services/analysis-service';

/**
 * Extension API
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
 * Bootstrap the extension
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
      // FIXED: Was a no-op statement, now properly disposes if dispose method exists
      if (workspaceAnalyzer && typeof (workspaceAnalyzer as any).dispose === 'function') {
        (workspaceAnalyzer as any).dispose();
      }
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
      return context.extension.packageJSON.version;
    },

    isReady(): boolean {
      return lifecycleManager.isExtensionReady();
    },
  };
}

/**
 * Activate the extension
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
 * Deactivate the extension
 */
export async function deactivate(): Promise<void> {
  // Cleanup is handled in the disposal registered in bootstrap
}
