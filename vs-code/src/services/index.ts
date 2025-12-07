/**
 * @file Services Index
 * @description Export all services for the Enzyme VS Code Extension
 *
 * Services are singleton instances that provide core functionality:
 * - LoggerService: Centralized logging with levels and output channel
 * - WorkspaceService: Workspace analysis and project structure management
 * - AnalysisService: Code analysis and diagnostics
 * - WelcomeOrchestrator: First-run experience and onboarding
 * - EnzymeCliManager: CLI detection, installation, and execution
 *
 * All services follow dependency injection patterns and can be
 * resolved through the Container.
 */

export { LoggerService } from './logger-service';
export { WorkspaceService } from './workspace-service';
export { AnalysisService } from './analysis-service';
export { WelcomeOrchestrator } from './welcome-orchestrator';
export { EnzymeCliManager } from './enzyme-cli-manager';
