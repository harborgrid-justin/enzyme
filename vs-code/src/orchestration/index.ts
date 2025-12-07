/**
 * Orchestration - Export all orchestration components
 */

// Core orchestration
export { Container, ServiceFactory, ServiceDescriptor, inject, getContainer } from './container';
export { EventBus, ExtensionEvent } from './event-bus';
export { LifecycleManager, LifecyclePhase, LifecycleStatus } from './lifecycle-manager';

// Registries
export {
  ServiceRegistry,
  ServiceHealth,
  ServiceState,
  ServiceMetadata,
  ServiceMetrics,
  IService,
  ServiceRegistration,
} from './service-registry';

export {
  ProviderRegistry,
  ProviderType,
  ProviderStatus,
  ProviderMetadata,
  ProviderRegistration,
} from './provider-registry';

export {
  CommandRegistry,
  CommandMetadata,
  CommandExecutionContext,
  CommandRegistration,
} from './command-registry';

// Coordinators
export {
  IndexingCoordinator,
  IndexEntry,
  IndexingTask,
} from './indexing-coordinator';

export {
  FileWatcherCoordinator,
  FileChangeEvent,
  WatchPatternRegistration,
} from './file-watcher-coordinator';

export {
  ViewOrchestrator,
  ViewType,
  ViewState,
  TreeViewRegistration,
  WebViewRegistration,
} from './view-orchestrator';

// Support services
export {
  TelemetryService,
  TelemetryEvent,
} from './telemetry-service';

export {
  HealthMonitor,
  HealthCheckResult,
  HealthMetrics,
} from './health-monitor';

export {
  CacheManager,
  CacheEntry,
  CacheStatistics,
} from './cache-manager';

export {
  WorkspaceAnalyzer,
  ProjectType,
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
