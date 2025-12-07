/**
 * @file Orchestration Module - Central Coordination Layer
 * @module orchestration
 *
 * @description
 * The orchestration module provides enterprise-grade coordination patterns for the
 * Enzyme VS Code extension. It implements a comprehensive dependency injection and
 * service management system that enables:
 *
 * ## Architecture Patterns
 *
 * ### 1. Dependency Injection Container
 * The Container pattern provides centralized service registration and resolution,
 * enabling loose coupling and testability throughout the extension.
 *
 * ### 2. Event Bus
 * Implements publish-subscribe pattern for cross-component communication without
 * tight coupling. All extension components can communicate via typed events.
 *
 * ### 3. Lifecycle Management
 * Orchestrates phased initialization and shutdown sequences, ensuring proper
 * resource management and graceful degradation.
 *
 * ### 4. Service Registry
 * Manages core services with health monitoring, metrics collection, and
 * automatic dependency resolution.
 *
 * ### 5. Provider Registry
 * Coordinates all VS Code providers (TreeView, WebView, Language, CodeLens, etc.)
 * with unified lifecycle management and error handling.
 *
 * ### 6. Command Registry
 * Centralizes command registration with execution context, error handling,
 * and performance tracking.
 *
 * ## Integration Points
 *
 * This orchestration layer integrates with:
 * - **bootstrap.ts** - Alternative DI-based entry point (NOT currently active)
 * - **extension.ts** - Main entry point (CURRENTLY ACTIVE)
 * - **providers/** - All provider implementations
 * - **services/** - Core service implementations
 * - **commands/** - Command implementations
 *
 * ## Usage
 *
 * The extension currently uses extension.ts for a simpler activation model.
 * To switch to the full orchestration architecture, change package.json to use
 * bootstrap.ts as the main entry point.
 *
 * @example Basic Container Usage
 * ```typescript
 * const container = Container.getInstance();
 * container.initialize(context);
 * const logger = container.resolve<LoggerService>('LoggerService');
 * ```
 *
 * @example Event Bus Usage
 * ```typescript
 * const eventBus = EventBus.getInstance();
 * eventBus.on('workspace:loaded', (data) => {
 *   console.log('Workspace loaded:', data);
 * });
 * eventBus.emit('workspace:loaded', { path: '/workspace' });
 * ```
 *
 * @see {@link bootstrap.ts} for the full orchestration-based activation
 * @see {@link extension.ts} for the current simple activation
 */

// ============================================================================
// Core Orchestration
// ============================================================================

/**
 * Dependency Injection Container
 * Manages service registration, resolution, and lifecycle
 */
export { Container, inject, getContainer } from './container';
export type { ServiceFactory, ServiceDescriptor } from './container';

/**
 * Event Bus for publish-subscribe pattern
 * Enables loose coupling between components
 */
export { EventBus } from './event-bus';
export type { ExtensionEvent } from './event-bus';

/**
 * Lifecycle Manager
 * Orchestrates phased initialization and shutdown
 */
export { LifecycleManager, LifecyclePhase } from './lifecycle-manager';
export type { LifecycleStatus } from './lifecycle-manager';

// ============================================================================
// Registries
// ============================================================================

/**
 * Service Registry
 * Manages core services with health monitoring and metrics
 */
export {
  ServiceRegistry,
  ServiceHealth,
  ServiceState,
} from './service-registry';
export type {
  ServiceMetadata,
  ServiceMetrics,
  IService,
  ServiceRegistration,
} from './service-registry';

/**
 * Provider Registry
 * Coordinates all VS Code providers (TreeView, WebView, Language, etc.)
 */
export {
  ProviderRegistry,
  ProviderType,
  ProviderStatus,
} from './provider-registry';
export type {
  ProviderMetadata,
  ProviderRegistration,
} from './provider-registry';

/**
 * Command Registry
 * Centralizes command registration with execution tracking
 */
export {
  CommandRegistry,
} from './command-registry';
export type {
  CommandMetadata,
  CommandExecutionContext,
  CommandRegistration,
} from './command-registry';

// ============================================================================
// Coordinators
// ============================================================================

/**
 * Integration Coordinator
 * Manages integration between different subsystems
 */
export {
  IntegrationCoordinator,
  IntegrationPhase,
} from './integration-coordinator';
export type {
  IntegrationStatus,
} from './integration-coordinator';

/**
 * Indexing Coordinator
 * Manages workspace indexing for fast lookups
 */
export {
  IndexingCoordinator,
} from './indexing-coordinator';
export type {
  IndexEntry,
  IndexingTask,
} from './indexing-coordinator';

/**
 * File Watcher Coordinator
 * Coordinates file system watching across the extension
 */
export {
  FileWatcherCoordinator,
} from './file-watcher-coordinator';
export type {
  FileChangeEvent,
  WatchPatternRegistration,
} from './file-watcher-coordinator';

/**
 * View Orchestrator
 * Coordinates TreeView and WebView lifecycle and state
 */
export {
  ViewOrchestrator,
  ViewType,
} from './view-orchestrator';
export type {
  ViewState,
  TreeViewRegistration,
  WebViewRegistration,
} from './view-orchestrator';

// ============================================================================
// Support Services
// ============================================================================

/**
 * Telemetry Service
 * Manages opt-in anonymous telemetry
 */
export {
  TelemetryService,
} from './telemetry-service';
export type {
  TelemetryEvent,
} from './telemetry-service';

/**
 * Health Monitor
 * Monitors extension health and performance
 */
export {
  HealthMonitor,
} from './health-monitor';
export type {
  HealthCheckResult,
  HealthMetrics,
} from './health-monitor';

/**
 * Cache Manager
 * Manages workspace analysis caching
 */
export {
  CacheManager,
} from './cache-manager';
export type {
  CacheEntry,
  CacheStatistics,
} from './cache-manager';

/**
 * Workspace Analyzer
 * Analyzes workspace structure and configuration
 */
export {
  WorkspaceAnalyzer,
  ProjectType,
} from './workspace-analyzer';
export type {
  ConfigurationIssue,
  AnalysisReport,
} from './workspace-analyzer';

// ============================================================================
// Testing Utilities
// ============================================================================

/**
 * Testing utilities for orchestration components
 * Provides mocks and test helpers
 */
export {
  MockContainer,
  MockEventBus,
  MockLoggerService,
  TestUtilities,
  IntegrationConfig,
} from './integration-tests-config';
