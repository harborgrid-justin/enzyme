/**
 * @file Welcome Orchestrator Service
 * @description Manages the incredible first-run experience and onboarding flow
 *
 * This service orchestrates:
 * - First-run detection and welcome screens
 * - Enzyme CLI auto-detection and installation
 * - Project initialization wizard
 * - Feature discovery and guided tours
 * - Progressive disclosure of advanced features
 *
 * @author Enzyme Framework Team
 * @version 1.0.0
 */

import * as vscode from 'vscode';
import type { EnzymeCliManager } from './enzyme-cli-manager';
import type { LoggerService } from './logger-service';
import type { WorkspaceService } from './workspace-service';
import type { EventBus } from '../orchestration/event-bus';

/**
 * Onboarding state for tracking user progress
 */
export interface OnboardingState {
  /** Has user completed welcome wizard */
  welcomeCompleted: boolean;
  /** Has Enzyme CLI been installed */
  cliInstalled: boolean;
  /** Has user initialized a project */
  projectInitialized: boolean;
  /** Has user generated first component */
  firstComponentGenerated: boolean;
  /** Has user viewed feature dashboard */
  featureDashboardViewed: boolean;
  /** Has user explored documentation */
  documentationExplored: boolean;
  /** Onboarding version (for migration) */
  version: string;
  /** Timestamp of first run */
  firstRunTimestamp: number;
  /** Timestamp of last interaction */
  lastInteractionTimestamp: number;
}

/**
 * Welcome flow step definition
 */
export interface WelcomeStep {
  /** Step identifier */
  id: string;
  /** Step title */
  title: string;
  /** Step description */
  description: string;
  /** Icon for the step */
  icon: string;
  /** Command to execute */
  command?: string;
  /** Condition for showing this step */
  condition?: () => Promise<boolean>;
  /** Weight for step ordering (higher = later) */
  weight: number;
}

/**
 * WelcomeOrchestrator Service
 *
 * Manages the first-run experience and progressive onboarding.
 * Uses behavioral psychology principles for optimal user engagement:
 * - Progressive disclosure
 * - Immediate value demonstration
 * - Optional vs required paths
 * - Celebration of milestones
 *
 * @class WelcomeOrchestrator
 */
export class WelcomeOrchestrator {
  private static instance: WelcomeOrchestrator;
  private readonly context: vscode.ExtensionContext;
  private readonly logger: LoggerService;
  private readonly workspaceService: WorkspaceService;
  private readonly cliManager: EnzymeCliManager;
  private readonly eventBus: EventBus;
  private readonly stateKey = 'enzyme.onboarding.state';

  /**
   * Private constructor for singleton pattern
   * @param context
   * @param logger
   * @param workspaceService
   * @param cliManager
   * @param eventBus
   */
  private constructor(
    context: vscode.ExtensionContext,
    logger: LoggerService,
    workspaceService: WorkspaceService,
    cliManager: EnzymeCliManager,
    eventBus: EventBus
  ) {
    this.context = context;
    this.logger = logger;
    this.workspaceService = workspaceService;
    this.cliManager = cliManager;
    this.eventBus = eventBus;

    this.setupEventListeners();
  }

  /**
   * Create or get the singleton instance
   *
   * @param context - VS Code extension context
   * @param logger - Logger service
   * @param workspaceService - Workspace service
   * @param cliManager - CLI manager service
   * @param eventBus - Event bus
   * @returns WelcomeOrchestrator instance
   */
  public static create(
    context: vscode.ExtensionContext,
    logger: LoggerService,
    workspaceService: WorkspaceService,
    cliManager: EnzymeCliManager,
    eventBus: EventBus
  ): WelcomeOrchestrator {
     
    WelcomeOrchestrator.instance ??= new WelcomeOrchestrator(
      context,
      logger,
      workspaceService,
      cliManager,
      eventBus
    );
    return WelcomeOrchestrator.instance;
  }

  /**
   * Get singleton instance (must be created first)
   * @returns WelcomeOrchestrator instance
   */
  public static getInstance(): WelcomeOrchestrator {
     
    if (WelcomeOrchestrator.instance === undefined) {
      throw new Error('WelcomeOrchestrator not created. Call create() first.');
    }
    return WelcomeOrchestrator.instance;
  }

  /**
   * Check if this is the first run
   *
   * @returns True if first run
   */
  public isFirstRun(): boolean {
    const state = this.getOnboardingState();
    return !state.welcomeCompleted;
  }

  /**
   * Get onboarding state from storage
   *
   * @returns Promise resolving to onboarding state
   */
  public getOnboardingState(): OnboardingState {
    const defaultState: OnboardingState = {
      welcomeCompleted: false,
      cliInstalled: false,
      projectInitialized: false,
      firstComponentGenerated: false,
      featureDashboardViewed: false,
      documentationExplored: false,
      version: '1.0.0',
      firstRunTimestamp: Date.now(),
      lastInteractionTimestamp: Date.now(),
    };

    return this.context.globalState.get<OnboardingState>(
      this.stateKey,
      defaultState
    );
  }

  /**
   * Update onboarding state
   *
   * @param updates - Partial state updates
   */
  public async updateOnboardingState(updates: Partial<OnboardingState>): Promise<void> {
    const currentState = this.getOnboardingState();
    const newState: OnboardingState = {
      ...currentState,
      ...updates,
      lastInteractionTimestamp: Date.now(),
    };

    await this.context.globalState.update(this.stateKey, newState);
    this.logger.info('Onboarding state updated', updates);

    // Emit event for tracking
    this.eventBus.emit({ type: 'onboarding:stateChanged', payload: newState });
  }

  /**
   * Run the incredible welcome experience
   *
   * This is the main entry point for first-time users.
   * It orchestrates the entire onboarding flow.
   *
   * @returns Promise that resolves when welcome is complete
   */
  public async runWelcomeExperience(): Promise<void> {
    this.logger.info('Starting welcome experience');

    try {
      // Step 1: Show welcome panel
      await vscode.commands.executeCommand('enzyme.panel.showWelcome');

      // Step 2: Determine user's situation and provide contextual guidance
      const steps = await this.getContextualWelcomeSteps();

      // Step 3: Execute welcome flow
      await this.executeWelcomeFlow(steps);

      // Step 4: Mark welcome as completed
      await this.updateOnboardingState({ welcomeCompleted: true });

      this.logger.info('Welcome experience completed');
      this.eventBus.emit({ type: 'onboarding:completed' });

    } catch (error) {
      this.logger.error('Error during welcome experience', error);
      // Don't throw - allow extension to continue even if welcome fails
    }
  }

  /**
   * Get contextual welcome steps based on user's environment
   *
   * @returns Promise resolving to array of welcome steps
   * @private
   */
  private async getContextualWelcomeSteps(): Promise<WelcomeStep[]> {
    const steps: WelcomeStep[] = [];
    const cliDetected = await this.cliManager.isInstalled();
    const isEnzymeWorkspace = await this.workspaceService.detectEnzymeProject();

    // Step: CLI Installation (if not detected)
    if (!cliDetected) {
      steps.push({
        id: 'install-cli',
        title: '📦 Install Enzyme CLI',
        description: 'The Enzyme CLI provides powerful code generation and project scaffolding',
        icon: '$(cloud-download)',
        command: 'enzyme.cli.install',
        weight: 1,
      });
    }

    // Step: Project Initialization (if CLI detected but no project)
    if (cliDetected && !isEnzymeWorkspace) {
      steps.push({
        id: 'init-project',
        title: '🚀 Initialize Enzyme Project',
        description: 'Set up a new Enzyme project with best practices and modern tooling',
        icon: '$(rocket)',
        command: 'enzyme.init',
        weight: 2,
      });
    }

    // Step: Feature Dashboard (if project exists)
    if (isEnzymeWorkspace) {
      steps.push({
        id: 'feature-dashboard',
        title: '🎯 Explore Feature Dashboard',
        description: 'Visualize your application architecture and manage features',
        icon: '$(extensions)',
        command: 'enzyme.panel.showFeatureDashboard',
        weight: 3,
      });
    }

    // Step: Generator Wizard (if project exists)
    if (isEnzymeWorkspace) {
      steps.push({
        id: 'generator-wizard',
        title: '✨ Try the Generator Wizard',
        description: 'Generate components, features, and more with interactive wizards',
        icon: '$(wand)',
        command: 'enzyme.panel.showGeneratorWizard',
        weight: 4,
      });
    }

    // Step: Documentation (always available)
    steps.push({
      id: 'documentation',
      title: '📚 Browse Documentation',
      description: 'Learn best practices, patterns, and advanced features',
      icon: '$(book)',
      command: 'enzyme.docs.open',
      weight: 5,
    });

    // Sort by weight
    return steps.sort((a, b) => a.weight - b.weight);
  }

  /**
   * Execute the welcome flow with user interaction
   *
   * @param steps - Welcome steps to execute
   * @private
   */
  private async executeWelcomeFlow(steps: WelcomeStep[]): Promise<void> {
    if (steps.length === 0) {
      // No steps needed, show success message
      await vscode.window.showInformationMessage(
        '🧪 Welcome to Enzyme! Everything is set up and ready to go!',
        'Open Feature Dashboard'
      ).then(selection => {
        if (selection === 'Open Feature Dashboard') {
          vscode.commands.executeCommand('enzyme.panel.showFeatureDashboard');
        }
      });
      return;
    }

    // Show primary action (first step)
    const primaryStep = steps[0];
    if (!primaryStep) {
      return;
    }
    const otherSteps = steps.slice(1);

    const actions = [
      primaryStep.title,
      ...otherSteps.slice(0, 2).map(s => s.title), // Show max 3 options
      'Later',
    ];

    const selection = await vscode.window.showInformationMessage(
      `🧪 Welcome to Enzyme! Let's get started:`,
      { modal: false },
      ...actions
    );

    if (!selection || selection === 'Later') {
      // User dismissed or chose later
      return;
    }

    // Find and execute selected step
    const selectedStep = steps.find(s => s.title === selection);
    if (selectedStep?.command) {
      await vscode.commands.executeCommand(selectedStep.command);

      // Track completion
      await this.trackStepCompletion(selectedStep.id);
    }
  }

  /**
   * Track completion of an onboarding step
   *
   * @param stepId - Step identifier
   * @private
   */
  private async trackStepCompletion(stepId: string): Promise<void> {
    const updates: Partial<OnboardingState> = {};

    switch (stepId) {
      case 'install-cli':
        updates.cliInstalled = true;
        break;
      case 'init-project':
        updates.projectInitialized = true;
        break;
      case 'feature-dashboard':
        updates.featureDashboardViewed = true;
        break;
      case 'documentation':
        updates.documentationExplored = true;
        break;
    }

    if (Object.keys(updates).length > 0) {
      await this.updateOnboardingState(updates);
    }
  }

  /**
   * Setup event listeners for onboarding events
   *
   * @private
   */
  private setupEventListeners(): void {
    // Listen for component generation
    this.eventBus.onType('cli:installed', () => {
      void this.handleFirstComponentGeneration();
    });

    // Listen for CLI installation
    this.eventBus.onType('cli:installed', () => {
      void this.updateOnboardingState({ cliInstalled: true });
    });

    // Listen for project initialization
    this.eventBus.onType('workspace:detected', () => {
      void this.updateOnboardingState({ projectInitialized: true });
    });
  }

  /**
   * Handle first component generation milestone
   * @private
   */
  private async handleFirstComponentGeneration(): Promise<void> {
    const state = this.getOnboardingState();
    if (!state.firstComponentGenerated) {
      await this.updateOnboardingState({ firstComponentGenerated: true });
      await this.celebrateMilestone('firstComponent');
    }
  }

  /**
   * Celebrate a user milestone with encouraging feedback
   *
   * @param milestone - Milestone identifier
   * @private
   */
  private async celebrateMilestone(milestone: string): Promise<void> {
    const celebrations: Record<string, { message: string; icon: string }> = {
      firstComponent: {
        message: '🎉 Awesome! You generated your first component!',
        icon: '$(sparkle)',
      },
      firstFeature: {
        message: '🚀 Great job! You created your first feature module!',
        icon: '$(rocket)',
      },
      firstTest: {
        message: '✅ Excellent! You generated your first test!',
        icon: '$(check)',
      },
    };

    const celebration = celebrations[milestone];
    if (celebration) {
      await vscode.window.showInformationMessage(celebration.message);
      this.eventBus.emit({ type: 'onboarding:milestone', payload: { milestone, timestamp: Date.now() } });
    }
  }

  /**
   * Show progressive feature hint based on user progress
   *
   * @param feature - Feature to hint about
   */
  public async showFeatureHint(feature: string): Promise<void> {
    const state = this.getOnboardingState();

    // Only show hints if user has completed basic onboarding
    if (!state.welcomeCompleted) {
      return;
    }

    // Rate limit hints to avoid overwhelming users
    const hoursSinceLastInteraction =
      (Date.now() - state.lastInteractionTimestamp) / (1000 * 60 * 60);

    if (hoursSinceLastInteraction < 24) {
      return; // Don't show hints more than once per day
    }

    // Feature-specific hints
    const hints: Record<string, { message: string; command: string }> = {
      stateInspector: {
        message: '💡 Tip: Use the State Inspector to debug your application state in real-time',
        command: 'enzyme.panel.showStateInspector',
      },
      performance: {
        message: '💡 Tip: Monitor your app\'s performance with the Performance Dashboard',
        command: 'enzyme.panel.showPerformance',
      },
      routeVisualizer: {
        message: '💡 Tip: Visualize your route structure with the Route Visualizer',
        command: 'enzyme.panel.showRouteVisualizer',
      },
    };

    const hint = hints[feature];
    if (hint) {
      const selection = await vscode.window.showInformationMessage(
        hint.message,
        'Show Me',
        'Dismiss'
      );

      if (selection === 'Show Me') {
        await vscode.commands.executeCommand(hint.command);
      }
    }
  }

  /**
   * Reset onboarding state (for testing or user request)
   */
  public async resetOnboarding(): Promise<void> {
    await this.context.globalState.update(this.stateKey, undefined);
    this.logger.info('Onboarding state reset');
  }

  /**
   * Get onboarding completion percentage
   *
   * @returns Completion percentage (0-100)
   */
  public getCompletionPercentage(): number {
    const state = this.getOnboardingState();
    const steps = [
      state.welcomeCompleted,
      state.cliInstalled,
      state.projectInitialized,
      state.firstComponentGenerated,
      state.featureDashboardViewed,
      state.documentationExplored,
    ];

    const completed = steps.filter(Boolean).length;
    return Math.round((completed / steps.length) * 100);
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    // Cleanup if needed
    this.logger.info('WelcomeOrchestrator disposed');
  }
}
