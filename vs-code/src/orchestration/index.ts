/**
 * Orchestration - Export all orchestration components
 */

// Core orchestration
export { Container, inject, getContainer } from './container';
export type { ServiceFactory, ServiceDescriptor } from './container';
export { EventBus } from './event-bus';
export type { ExtensionEvent } from './event-bus';
export { LifecycleManager, LifecyclePhase } from './lifecycle-manager';
export type { LifecycleStatus } from './lifecycle-manager';

// Registries
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

export {
  ProviderRegistry,
  ProviderType,
  ProviderStatus,
} from './provider-registry';
export type {
  ProviderMetadata,
  ProviderRegistration,
} from './provider-registry';

export {
  CommandRegistry,
} from './command-registry';
export type {
  CommandMetadata,
  CommandExecutionContext,
  CommandRegistration,
} from './command-registry';

// Coordinators
export {
  IntegrationCoordinator,
  IntegrationPhase,
} from './integration-coordinator';
export type {
  IntegrationStatus,
} from './integration-coordinator';

export {
  IndexingCoordinator,
} from './indexing-coordinator';
export type {
  IndexEntry,
  IndexingTask,
} from './indexing-coordinator';

export {
  FileWatcherCoordinator,
} from './file-watcher-coordinator';
export type {
  FileChangeEvent,
  WatchPatternRegistration,
} from './file-watcher-coordinator';

export {
  ViewOrchestrator,
  ViewType,
} from './view-orchestrator';
export type {
  ViewState,
  TreeViewRegistration,
  WebViewRegistration,
} from './view-orchestrator';

// Support services
export {
  TelemetryService,
} from './telemetry-service';
export type {
  TelemetryEvent,
} from './telemetry-service';

export {
  HealthMonitor,
} from './health-monitor';
export type {
  HealthCheckResult,
  HealthMetrics,
} from './health-monitor';

export {
  CacheManager,
} from './cache-manager';
export type {
  CacheEntry,
  CacheStatistics,
} from './cache-manager';

export {
  WorkspaceAnalyzer,
  ProjectType,
} from './workspace-analyzer';
export type {
  ConfigurationIssue,
  AnalysisReport,
} from './workspace-analyzer';

// Testing utilities
export {
  MockContainer,
  MockEventBus,
  MockLoggerService,
  TestUtilities,
  IntegrationConfig,
} from './integration-tests-config';
