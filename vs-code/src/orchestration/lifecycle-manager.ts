/**
 * LifecycleManager - Manages extension activation, initialization, and shutdown
 */

import * as vscode from 'vscode';
import { Container } from './container';
import { EventBus } from './event-bus';
import { LoggerService } from '../services/logger-service';
import { WorkspaceService } from '../services/workspace-service';

/**
 * Lifecycle phase
 */
export enum LifecyclePhase {
  INITIALIZING = 'initializing',
  DETECTING_WORKSPACE = 'detecting_workspace',
  LOADING_CONFIG = 'loading_config',
  INDEXING = 'indexing',
  REGISTERING_PROVIDERS = 'registering_providers',
  STARTING_WATCHERS = 'starting_watchers',
  INITIALIZING_DEBUG = 'initializing_debug',
  READY = 'ready',
  DEACTIVATING = 'deactivating',
  DEACTIVATED = 'deactivated',
}

/**
 * Lifecycle status
 */
export interface LifecycleStatus {
  phase: LifecyclePhase;
  timestamp: number;
  error?: Error;
}

/**
 * LifecycleManager - Manages the extension lifecycle
 */
export class LifecycleManager {
  private static instance: LifecycleManager;
  private container: Container;
  private eventBus: EventBus;
  private logger: LoggerService;
  private currentPhase: LifecyclePhase = LifecyclePhase.INITIALIZING;
  private phaseHistory: LifecycleStatus[] = [];
  private disposables: vscode.Disposable[] = [];
  private isReady: boolean = false;
  private healthCheckInterval?: NodeJS.Timeout;

  private constructor(container: Container) {
    this.container = container;
    this.eventBus = container.resolve<EventBus>('EventBus');
    this.logger = container.resolve<LoggerService>('LoggerService');
  }

  /**
   * Create a new lifecycle manager
   */
  public static create(container: Container): LifecycleManager {
    if (!LifecycleManager.instance) {
      LifecycleManager.instance = new LifecycleManager(container);
    }
    return LifecycleManager.instance;
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): LifecycleManager {
    if (!LifecycleManager.instance) {
      throw new Error('LifecycleManager not created. Call create() first.');
    }
    return LifecycleManager.instance;
  }

  /**
   * Activate the extension
   */
  public async activate(context: vscode.ExtensionContext): Promise<void> {
    this.logger.info('Starting extension activation...');
    const startTime = Date.now();

    try {
      // Phase 1: Initialize container
      await this.runPhase(LifecyclePhase.INITIALIZING, async () => {
        this.container.initialize(context);
        this.logger.info('Container initialized');
      });

      // Phase 2: Detect workspace
      await this.runPhase(LifecyclePhase.DETECTING_WORKSPACE, async () => {
        const workspaceService = this.container.resolve<WorkspaceService>('WorkspaceService');
        const workspace = await workspaceService.analyzeWorkspace();

        this.eventBus.emit({
          type: 'workspace:detected',
          payload: { isEnzymeProject: workspace.isEnzymeProject },
        });

        this.logger.info('Workspace detected', {
          isEnzymeProject: workspace.isEnzymeProject,
          features: workspace.features.length,
        });
      });

      // Phase 3: Load configuration
      await this.runPhase(LifecyclePhase.LOADING_CONFIG, async () => {
        this.logger.info('Configuration loaded');
      });

      // Phase 4: Start indexing
      await this.runPhase(LifecyclePhase.INDEXING, async () => {
        this.eventBus.emit({ type: 'indexing:started' });
        // Indexing will be handled by IndexingCoordinator
        this.logger.info('Indexing started');
      });

      // Phase 5: Register providers
      await this.runPhase(LifecyclePhase.REGISTERING_PROVIDERS, async () => {
        // Providers will be registered by ProviderRegistry
        this.logger.info('Providers registered');
      });

      // Phase 6: Start file watchers
      await this.runPhase(LifecyclePhase.STARTING_WATCHERS, async () => {
        // File watchers will be started by FileWatcherCoordinator
        this.logger.info('File watchers started');
      });

      // Phase 7: Initialize debugging
      await this.runPhase(LifecyclePhase.INITIALIZING_DEBUG, async () => {
        this.logger.info('Debugging initialized');
      });

      // Phase 8: Ready
      await this.runPhase(LifecyclePhase.READY, async () => {
        this.isReady = true;
        const duration = Date.now() - startTime;
        this.logger.success(`Extension activated in ${duration}ms`);

        this.eventBus.emit({ type: 'extension:activated' });

        // Start health checks
        this.startHealthChecks();
      });

      // Show welcome message on first activation
      const isFirstActivation = context.globalState.get('enzyme.firstActivation', true);
      if (isFirstActivation) {
        await this.showWelcomeMessage();
        await context.globalState.update('enzyme.firstActivation', false);
      }

    } catch (error) {
      this.logger.error('Extension activation failed', error);
      this.recordPhaseError(error as Error);
      throw error;
    }
  }

  /**
   * Deactivate the extension
   * FIXED: Now properly stops health checks and resets singleton
   */
  public async deactivate(): Promise<void> {
    this.logger.info('Starting extension deactivation...');

    try {
      await this.runPhase(LifecyclePhase.DEACTIVATING, async () => {
        // Stop health checks - CRITICAL for preventing memory leaks
        this.stopHealthChecks();

        // Dispose all disposables
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];

        // Dispose container
        this.container.dispose();

        this.logger.info('Extension deactivated');
      });

      this.currentPhase = LifecyclePhase.DEACTIVATED;
      this.eventBus.emit({ type: 'extension:deactivated' });

      // Reset singleton instance to prevent memory leaks
      if (LifecycleManager.instance === this) {
        LifecycleManager.instance = null as any;
      }

    } catch (error) {
      this.logger.error('Extension deactivation failed', error);
      throw error;
    }
  }

  /**
   * Run a lifecycle phase
   */
  private async runPhase(phase: LifecyclePhase, action: () => Promise<void>): Promise<void> {
    this.currentPhase = phase;
    this.recordPhase(phase);

    this.logger.debug(`Entering phase: ${phase}`);

    try {
      await action();
    } catch (error) {
      this.recordPhaseError(error as Error);
      throw error;
    }
  }

  /**
   * Record a phase in history
   */
  private recordPhase(phase: LifecyclePhase): void {
    this.phaseHistory.push({
      phase,
      timestamp: Date.now(),
    });
  }

  /**
   * Record a phase error
   */
  private recordPhaseError(error: Error): void {
    const lastPhase = this.phaseHistory[this.phaseHistory.length - 1];
    if (lastPhase) {
      lastPhase.error = error;
    }
  }

  /**
   * Get current phase
   */
  public getCurrentPhase(): LifecyclePhase {
    return this.currentPhase;
  }

  /**
   * Get phase history
   */
  public getPhaseHistory(): LifecycleStatus[] {
    return [...this.phaseHistory];
  }

  /**
   * Check if extension is ready
   */
  public isExtensionReady(): boolean {
    return this.isReady;
  }

  /**
   * Register a disposable
   */
  public registerDisposable(disposable: vscode.Disposable): void {
    this.disposables.push(disposable);
  }

  /**
   * Start health checks
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 60000); // Every minute
  }

  /**
   * Stop health checks
   */
  private stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  /**
   * Perform a health check
   */
  private performHealthCheck(): void {
    this.logger.debug('Performing health check');
    // Health check logic will be implemented by HealthMonitor
  }

  /**
   * Restart the extension
   */
  public async restart(): Promise<void> {
    this.logger.info('Restarting extension...');

    const context = this.container.getContext();
    await this.deactivate();

    // Reset instance
    LifecycleManager.instance = new LifecycleManager(this.container);

    await LifecycleManager.instance.activate(context);
  }

  /**
   * Recover from error
   */
  public async recoverFromError(error: Error): Promise<void> {
    this.logger.error('Attempting error recovery', error);

    try {
      // Attempt to restart
      await this.restart();
      this.logger.success('Recovery successful');
    } catch (recoveryError) {
      this.logger.error('Recovery failed', recoveryError);
      // FIXED: Added error handling to prevent floating promise
      vscode.window.showErrorMessage(
        'Enzyme extension failed to recover. Please reload VS Code.',
        'Reload'
      ).then(action => {
        if (action === 'Reload') {
          vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
      }, error => {
        this.logger.error('Failed to show reload prompt', error);
      });
    }
  }

  /**
   * Show welcome message
   */
  private async showWelcomeMessage(): Promise<void> {
    const action = await vscode.window.showInformationMessage(
      'Welcome to Enzyme! Would you like to view the documentation?',
      'View Docs',
      'Dismiss'
    );

    if (action === 'View Docs') {
      vscode.env.openExternal(vscode.Uri.parse('https://enzyme-framework.dev'));
    }
  }
}
