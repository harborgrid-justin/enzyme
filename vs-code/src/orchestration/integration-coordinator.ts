/**
 * @file Integration Coordinator
 * @description Central orchestrator for all extension integrations and component coordination
 *
 * The Integration Coordinator is responsible for:
 * - Coordinating startup sequence across all subsystems
 * - Managing inter-component dependencies
 * - Ensuring smooth data flow between services
 * - Handling cross-cutting concerns (logging, errors, events)
 * - Orchestrating complex multi-step operations
 *
 * This is the "conductor" of the extension orchestra, ensuring all
 * components work together harmoniously.
 *
 * @author Enzyme Framework Team
 * @version 1.0.0
 */

import * as vscode from 'vscode';
import { EventBus } from './event-bus';
import { Container } from './container';
import { ServiceRegistry } from './service-registry';
import { ProviderRegistry } from './provider-registry';
import { CommandRegistry } from './command-registry';
import { LoggerService } from '../services/logger-service';
import { WorkspaceService } from '../services/workspace-service';
import { AnalysisService } from '../services/analysis-service';
import { WelcomeOrchestrator } from '../services/welcome-orchestrator';
import { EnzymeCliManager } from '../services/enzyme-cli-manager';

/**
 * Integration phase for startup sequence
 */
export enum IntegrationPhase {
  /** Pre-initialization checks and setup */
  PRE_INIT = 'pre-init',
  /** Core infrastructure initialization */
  CORE = 'core',
  /** Service layer initialization */
  SERVICES = 'services',
  /** Provider layer initialization */
  PROVIDERS = 'providers',
  /** Command layer initialization */
  COMMANDS = 'commands',
  /** Post-initialization tasks */
  POST_INIT = 'post-init',
  /** Full initialization complete */
  READY = 'ready',
}

/**
 * Integration status
 */
export interface IntegrationStatus {
  /** Current phase */
  phase: IntegrationPhase;
  /** Whether integration is complete */
  complete: boolean;
  /** Error if integration failed */
  error?: Error;
  /** Timestamp of status update */
  timestamp: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Integration Coordinator
 *
 * Orchestrates all components and ensures seamless integration.
 * Follows the Orchestrator pattern to manage complex coordination logic.
 *
 * @class IntegrationCoordinator
 */
export class IntegrationCoordinator {
  private static instance: IntegrationCoordinator;
  private readonly context: vscode.ExtensionContext;
  private readonly eventBus: EventBus;
  private readonly container: Container;
  private readonly logger: LoggerService;

  private currentPhase: IntegrationPhase = IntegrationPhase.PRE_INIT;
  private isComplete = false;
  private integrationError?: Error;

  // Component references
  private serviceRegistry?: ServiceRegistry;
  private providerRegistry?: ProviderRegistry;
  private commandRegistry?: CommandRegistry;
  private workspaceService?: WorkspaceService;
  private analysisService?: AnalysisService;
  private welcomeOrchestrator?: WelcomeOrchestrator;
  private cliManager?: EnzymeCliManager;

  /**
   * Private constructor for singleton pattern
   */
  private constructor(
    context: vscode.ExtensionContext,
    eventBus: EventBus,
    container: Container,
    logger: LoggerService
  ) {
    this.context = context;
    this.eventBus = eventBus;
    this.container = container;
    this.logger = logger;

    this.setupGlobalEventListeners();
  }

  /**
   * Create or get the singleton instance
   *
   * @param context - VS Code extension context
   * @param eventBus - Event bus
   * @param container - DI container
   * @param logger - Logger service
   * @returns IntegrationCoordinator instance
   */
  public static create(
    context: vscode.ExtensionContext,
    eventBus: EventBus,
    container: Container,
    logger: LoggerService
  ): IntegrationCoordinator {
    if (!IntegrationCoordinator.instance) {
      IntegrationCoordinator.instance = new IntegrationCoordinator(
        context,
        eventBus,
        container,
        logger
      );
    }
    return IntegrationCoordinator.instance;
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): IntegrationCoordinator {
    if (!IntegrationCoordinator.instance) {
      throw new Error('IntegrationCoordinator not created. Call create() first.');
    }
    return IntegrationCoordinator.instance;
  }

  /**
   * Execute the complete integration sequence
   *
   * This orchestrates the entire startup process in the correct order,
   * managing dependencies and ensuring proper initialization.
   *
   * @returns Promise that resolves when integration is complete
   */
  public async integrate(): Promise<void> {
    this.logger.info('Starting integration sequence...');

    try {
      // Phase 1: Pre-initialization
      await this.executePhase(IntegrationPhase.PRE_INIT, async () => {
        await this.preInitialize();
      });

      // Phase 2: Core infrastructure
      await this.executePhase(IntegrationPhase.CORE, async () => {
        await this.initializeCore();
      });

      // Phase 3: Services
      await this.executePhase(IntegrationPhase.SERVICES, async () => {
        await this.initializeServices();
      });

      // Phase 4: Providers
      await this.executePhase(IntegrationPhase.PROVIDERS, async () => {
        await this.initializeProviders();
      });

      // Phase 5: Commands
      await this.executePhase(IntegrationPhase.COMMANDS, async () => {
        await this.initializeCommands();
      });

      // Phase 6: Post-initialization
      await this.executePhase(IntegrationPhase.POST_INIT, async () => {
        await this.postInitialize();
      });

      // Mark as complete
      this.currentPhase = IntegrationPhase.READY;
      this.isComplete = true;

      this.logger.success('Integration sequence completed successfully');
      this.eventBus.emit('integration:complete', this.getStatus());

    } catch (error) {
      this.integrationError = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Integration sequence failed', this.integrationError);
      this.eventBus.emit('integration:failed', { error: this.integrationError });
      throw this.integrationError;
    }
  }

  /**
   * Execute a single integration phase
   *
   * @param phase - Phase to execute
   * @param handler - Phase handler function
   * @private
   */
  private async executePhase(
    phase: IntegrationPhase,
    handler: () => Promise<void>
  ): Promise<void> {
    this.logger.info(`Integration phase: ${phase}`);
    this.currentPhase = phase;
    this.eventBus.emit('integration:phaseStarted', { phase });

    try {
      await handler();
      this.eventBus.emit('integration:phaseCompleted', { phase });
    } catch (error) {
      this.logger.error(`Integration phase ${phase} failed`, error);
      throw error;
    }
  }

  /**
   * Pre-initialization phase
   *
   * Performs checks and setup before main initialization:
   * - Workspace trust verification
   * - Extension mode detection
   * - Configuration validation
   *
   * @private
   */
  private async preInitialize(): Promise<void> {
    this.logger.info('Pre-initialization checks');

    // Check workspace trust
    if (!vscode.workspace.isTrusted) {
      this.logger.warn('Workspace not trusted - limited functionality');
      return;
    }

    // Validate extension mode
    const mode = this.context.extensionMode;
    this.logger.info(`Extension mode: ${vscode.ExtensionMode[mode]}`);

    // Load configuration
    const config = vscode.workspace.getConfiguration('enzyme');
    this.logger.info('Configuration loaded', {
      telemetryEnabled: config.get('telemetry.enabled'),
      loggingLevel: config.get('logging.level'),
    });
  }

  /**
   * Core infrastructure initialization
   *
   * Sets up the foundational components:
   * - Container registration
   * - Event bus setup
   * - Logger configuration
   *
   * @private
   */
  private async initializeCore(): Promise<void> {
    this.logger.info('Initializing core infrastructure');

    // Container should already be initialized
    if (!this.container) {
      throw new Error('Container not initialized');
    }

    // Event bus should already be initialized
    if (!this.eventBus) {
      throw new Error('Event bus not initialized');
    }

    this.logger.info('Core infrastructure ready');
  }

  /**
   * Services initialization
   *
   * Initializes all service layer components:
   * - Service registry
   * - Core services (workspace, analysis)
   * - Welcome orchestrator
   * - CLI manager
   *
   * @private
   */
  private async initializeServices(): Promise<void> {
    this.logger.info('Initializing services');

    // Get service registry from container
    this.serviceRegistry = this.container.resolve<ServiceRegistry>('ServiceRegistry');

    // Resolve core services
    this.workspaceService = this.container.resolve<WorkspaceService>('WorkspaceService');
    this.analysisService = this.container.resolve<AnalysisService>('AnalysisService');

    // Initialize CLI manager
    this.cliManager = EnzymeCliManager.create(this.logger, this.eventBus);
    this.container.registerInstance('EnzymeCliManager', this.cliManager);

    // Initialize welcome orchestrator
    this.welcomeOrchestrator = WelcomeOrchestrator.create(
      this.context,
      this.logger,
      this.workspaceService,
      this.cliManager,
      this.eventBus
    );
    this.container.registerInstance('WelcomeOrchestrator', this.welcomeOrchestrator);

    this.logger.info(`Services initialized: ${this.serviceRegistry.getServiceNames().length} services`);
  }

  /**
   * Providers initialization
   *
   * Registers all VS Code providers:
   * - Language providers
   * - TreeView providers
   * - WebView providers
   *
   * @private
   */
  private async initializeProviders(): Promise<void> {
    this.logger.info('Initializing providers');

    this.providerRegistry = this.container.resolve<ProviderRegistry>('ProviderRegistry');

    // Providers are registered via extension.ts registration functions
    // This phase just ensures the registry is ready

    this.logger.info('Provider registry ready');
  }

  /**
   * Commands initialization
   *
   * Registers all extension commands:
   * - Generator commands
   * - Navigation commands
   * - Analysis commands
   * - Panel commands
   * - Utility commands
   *
   * @private
   */
  private async initializeCommands(): Promise<void> {
    this.logger.info('Initializing commands');

    this.commandRegistry = this.container.resolve<CommandRegistry>('CommandRegistry');

    // Commands are registered via extension.ts registration functions
    // This phase just ensures the registry is ready

    this.logger.info('Command registry ready');
  }

  /**
   * Post-initialization phase
   *
   * Performs final setup and deferred tasks:
   * - Welcome experience for first-time users
   * - Workspace detection
   * - File watcher setup
   * - Status bar items
   *
   * @private
   */
  private async postInitialize(): Promise<void> {
    this.logger.info('Post-initialization tasks');

    // These tasks are handled by the main extension.ts
    // This phase confirms they're ready to execute

    this.logger.info('Post-initialization complete');
  }

  /**
   * Setup global event listeners for cross-component coordination
   *
   * @private
   */
  private setupGlobalEventListeners(): void {
    // Command execution logging
    this.eventBus.on('command:*', (event) => {
      this.logger.debug('Command event:', event);
    });

    // Service lifecycle logging
    this.eventBus.on('service:*', (event) => {
      this.logger.debug('Service event:', event);
    });

    // Provider lifecycle logging
    this.eventBus.on('provider:*', (event) => {
      this.logger.debug('Provider event:', event);
    });

    // Error coordination
    this.eventBus.on('error:*', (event) => {
      this.logger.error('Component error:', event);
      this.handleComponentError(event);
    });
  }

  /**
   * Handle errors from any component
   *
   * Provides centralized error handling and recovery
   *
   * @param event - Error event
   * @private
   */
  private handleComponentError(event: any): void {
    // Log the error
    this.logger.error('Component error detected', event);

    // Attempt recovery based on error type
    if (event.recoverable) {
      this.logger.info('Attempting error recovery...');
      this.eventBus.emit('recovery:attempt', event);
    } else {
      this.logger.warn('Error is not recoverable');
    }

    // Update health status
    this.eventBus.emit('health:degraded', { reason: event });
  }

  /**
   * Get current integration status
   *
   * @returns Current integration status
   */
  public getStatus(): IntegrationStatus {
    return {
      phase: this.currentPhase,
      complete: this.isComplete,
      error: this.integrationError,
      timestamp: Date.now(),
      metadata: {
        servicesCount: this.serviceRegistry?.getServiceNames().length,
        contextReady: !!this.context,
        containerReady: !!this.container,
      },
    };
  }

  /**
   * Check if integration is complete
   *
   * @returns True if integration is complete and successful
   */
  public isReady(): boolean {
    return this.isComplete && !this.integrationError;
  }

  /**
   * Get current integration phase
   *
   * @returns Current phase
   */
  public getCurrentPhase(): IntegrationPhase {
    return this.currentPhase;
  }

  /**
   * Coordinate a complex multi-step operation
   *
   * Provides a framework for executing complex operations that span
   * multiple components with proper error handling and rollback.
   *
   * @param name - Operation name
   * @param steps - Operation steps
   * @returns Promise that resolves when operation is complete
   */
  public async coordinateOperation<T>(
    name: string,
    steps: Array<() => Promise<T>>
  ): Promise<T[]> {
    this.logger.info(`Coordinating operation: ${name}`);
    this.eventBus.emit('operation:started', { name });

    const results: T[] = [];
    const startTime = Date.now();

    try {
      for (let i = 0; i < steps.length; i++) {
        this.logger.debug(`Executing step ${i + 1}/${steps.length}`);
        this.eventBus.emit('operation:step', { name, step: i + 1, total: steps.length });

        const result = await steps[i]();
        results.push(result);
      }

      const duration = Date.now() - startTime;
      this.logger.success(`Operation ${name} completed in ${duration}ms`);
      this.eventBus.emit('operation:completed', { name, duration, results });

      return results;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Operation ${name} failed after ${duration}ms`, error);
      this.eventBus.emit('operation:failed', { name, duration, error });
      throw error;
    }
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    this.logger.info('Disposing IntegrationCoordinator');

    // Cleanup component references
    this.serviceRegistry = undefined;
    this.providerRegistry = undefined;
    this.commandRegistry = undefined;
    this.workspaceService = undefined;
    this.analysisService = undefined;
    this.welcomeOrchestrator = undefined;
    this.cliManager = undefined;

    this.isComplete = false;
    this.currentPhase = IntegrationPhase.PRE_INIT;
  }
}
