/**
 * Bootstrap - Initializes and bootstraps the Enzyme VS Code Extension
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
      workspaceAnalyzer;
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
