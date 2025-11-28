/**
 * @missionfabric-js/enzyme - Enterprise React Framework
 *
 * A comprehensive React framework for building enterprise applications with:
 * - Advanced type-safe routing
 * - Zustand + React Query state management
 * - RBAC authentication & authorization
 * - Feature flags and A/B testing
 * - Performance monitoring (Core Web Vitals)
 * - Real-time data synchronization
 *
 * All exports are available directly from the main package:
 * ```typescript
 * import { useAuth, AuthProvider, useFeatureFlag, apiClient } from '@missionfabric-js/enzyme';
 * ```
 *
 * Or import from submodules for optimal tree-shaking:
 * ```typescript
 * import { useAuth, AuthProvider } from '@missionfabric-js/enzyme/auth';
 * import { useFeatureFlag } from '@missionfabric-js/enzyme/flags';
 * ```
 *
 * @module @missionfabric-js/enzyme
 * @version 1.0.3
 * @license MIT
 */

// =============================================================================
// Module Namespaces - Access all module exports via namespaces
// These provide conflict-free access to all functions in each module
// =============================================================================

export * as api from './lib/api';
export * as auth from './lib/auth';
export * as config from './lib/config';
export * as contexts from './lib/contexts';
export * as coordination from './lib/coordination';
export * as core from './lib/core';
export * as data from './lib/data';
export * as feature from './lib/feature';
export * as flags from './lib/flags';
export * as hooks from './lib/hooks';
export * as hydration from './lib/hydration';
export * as layouts from './lib/layouts';
export * as monitoring from './lib/monitoring';
export * as performance from './lib/performance';
export * as queries from './lib/queries';
export * as realtime from './lib/realtime';
export * as routing from './lib/routing';
export * as security from './lib/security';
export * as services from './lib/services';
export * as shared from './lib/shared';
export * as state from './lib/state';
export * as streaming from './lib/streaming';
export * as system from './lib/system';
export * as theme from './lib/theme';
export * as ui from './lib/ui';
export * as utils from './lib/utils';
export * as ux from './lib/ux';
export * as vdom from './lib/vdom';

// =============================================================================
// Direct Exports - Most commonly used exports available directly
// For less common exports, use the namespaced imports above
// =============================================================================

// -----------------------------------------------------------------------------
// API Module - HTTP client, type-safe API calls
// -----------------------------------------------------------------------------
export {
  // Client
  apiClient,
  ApiClient,
  createApiClient,
  // Request Builder
  RequestBuilder,
  get,
  post,
  put,
  patch,
  del,
  // Response Handler
  parseResponse,
  normalizeError,
  // Hooks
  useApiRequest,
  useApiMutation,
  useApiCache,
  useApiHealth,
  useApiClient,
  // Mock System
  mockServer,
  createMockServer,
  mockHandlers,
  mockData,
} from './lib/api';

export type {
  HttpMethod,
  ApiResponse,
  ApiError,
  ApiClientConfig,
  RequestConfig,
  UseApiRequestOptions,
  UseApiMutationOptions,
} from './lib/api';

// -----------------------------------------------------------------------------
// Auth Module - Authentication, authorization, RBAC
// -----------------------------------------------------------------------------
export {
  // Core Auth
  AuthProvider,
  useAuthContext,
  useAuth,
  useHasRole,
  useHasPermission,
  authService,
  // Route Protection
  routeMetadata,
  getRouteAuthConfig,
  canAccessRoute,
  RequireAuth,
  RequireRole,
  RequirePermission,
  // Active Directory
  ADProvider,
  useActiveDirectory,
  ADClient,
  createADClient,
  ADTokenHandler,
  createTokenHandler,
  SSOManager,
  createSSOManager,
  CrossDomainSSO,
  createCrossDomainSSO,
  ADGroupMapper,
  createGroupMapper,
  ADAttributeMapper,
  createAttributeMapper,
  // RBAC
  RBACProvider,
  useRBAC,
  usePermissions,
  useRoles,
  useResourceAccess,
  usePermissionGate,
  useRoleGate,
  RBACEngine,
  createRBACEngine,
  PermissionMatrixBuilder,
  createPermissionMatrixBuilder,
  RoleHierarchyManager,
  createRoleHierarchy,
  ResourcePermissionManager,
  createResourcePermissionManager,
  PolicyEvaluator,
  createPolicyEvaluator,
} from './lib/auth';

export type {
  User,
  Role,
  Permission,
  AuthTokens,
  LoginCredentials,
  RegisterCredentials,
  AuthState,
  AuthContextValue,
  RouteAuthConfig,
  RBACConfig,
  RBACState,
  RBACContextValue,
} from './lib/auth';

// -----------------------------------------------------------------------------
// Config Module - Configuration management
// -----------------------------------------------------------------------------
export {
  // Validation
  ConfigValidator,
  SchemaBuilder,
  createSchema,
  validateConfig,
  CommonSchemas,
  // Merging
  ConfigMerger,
  deepMerge,
  shallowMerge,
  flattenConfig,
  unflattenConfig,
  // Loading
  ConfigLoader,
  createConfigLoader,
  loadConfig,
  // Environment
  detectEnvironment,
  isDevelopment,
  isProduction,
  isStaging,
  isTest,
  isBrowser,
  isServer,
  getEnvVar,
  requireEnvVar,
  // Runtime
  RuntimeConfig,
  createRuntimeConfig,
  getRuntimeConfig,
  initRuntimeConfig,
  // React Integration
  ConfigProvider,
  useConfig,
  useConfigValue,
  useConfigContext,
  useEnvironment,
  useIsDevelopment,
  useIsProduction,
} from './lib/config';

export type {
  AppConfig,
  ConfigSchema,
  ValidationError,
  ValidationResult,
  Environment,
  EnvironmentConfig,
} from './lib/config';

// -----------------------------------------------------------------------------
// Contexts Module - React contexts
// -----------------------------------------------------------------------------
export {
  LoadingContext,
  ThemeContext,
  SecurityContext,
  StreamContext,
  RealtimeContext,
  PerformanceObservatoryContext,
  ScrollContainerContext,
  AdaptiveLayoutContext,
  ContainerContext,
  ErrorBoundaryContext,
  HydrationContext,
  DIContext,
  FeatureFlagContext,
  AuthContext,
  ToastContext,
  RBACContext,
  ConfigContext,
  ADContext,
  ApiClientContext,
  ModuleSystemContext,
  ModuleBoundaryContext,
} from './lib/contexts';

// -----------------------------------------------------------------------------
// Coordination Module - Cross-module coordination
// -----------------------------------------------------------------------------
export {
  // Event Bus
  getCoordinationEventBus,
  setCoordinationEventBus,
  resetCoordinationEventBus,
  publishEvent,
  subscribeToEvent,
  // Dependency Injection
  DependencyInjectorImpl,
  createServiceContract,
  getGlobalContainer,
  setGlobalContainer,
  resetGlobalContainer,
  registerService,
  resolveService,
  tryResolveService,
  LoggerContract,
  ConfigContract,
  TelemetryContract,
  // Lifecycle Management
  LifecycleManagerImpl,
  getLifecycleManager,
  setLifecycleManager,
  resetLifecycleManager,
  registerLibrary,
  initializeLibraries,
  shutdownLibraries,
  LIBRARY_IDS,
  PHASE_IDS,
  // State Coordination
  StateCoordinatorImpl,
  getStateCoordinator,
  setStateCoordinator,
  resetStateCoordinator,
  registerStateSlice,
  SLICE_IDS,
  // Feature Bridge
  FeatureBridgeImpl,
  createFeatureId,
  getFeatureBridge,
  setFeatureBridge,
  resetFeatureBridge,
  registerFeature as registerFeatureCoordination,
  invokeCapability,
  invokeAnyCapability,
  // Hook Composer
  useComposedHooks,
  useSelectiveHooks,
  useConditionalHook,
  useMemoizedComposition,
  useParallelHooks,
  useHookSequence,
  defineHook,
  defineAsyncHook,
  // Provider Orchestrator
  ProviderOrchestratorImpl,
  OrchestratedProviders,
  getProviderOrchestrator,
  setProviderOrchestrator,
  resetProviderOrchestrator,
  registerProvider,
  getGlobalProviderTree,
  DefaultLoadingFallback,
  DefaultErrorFallback,
  // Context Bridge
  ContextBridgeImpl,
  ContextBridgeProvider,
  useBridgeManager,
  useBridgedContext,
  BridgeSource,
  BridgeConsumer,
  createComposedContext,
  useMultiContextSelector,
  withBridgedContext,
  getContextBridgeManager,
  setContextBridgeManager,
  resetContextBridgeManager,
  // React Provider & Hooks
  CoordinationProvider,
  useCoordination,
  useOptionalCoordination,
  useCoordinationEvent,
  useCoordinationPublish,
  useIsCoordinationReady,
  useLibraryState,
  useService as useCoordinationService,
  useTryService,
  withCoordination,
  initCoordination,
  getCoordinationVersion,
  // Enums
  EventPriority,
} from './lib/coordination';

export type {
  // Coordination types
  CoordinationContextValue,
  CoordinationEvent,
  EventHandler,
  EventSubscription,
  ServiceContract,
  LifecyclePhase,
  LibraryState,
  FeatureCapability,
  HookDef,
  ProviderDefinition,
} from './lib/coordination';

// -----------------------------------------------------------------------------
// Core Module - Core configuration system
// -----------------------------------------------------------------------------
// Re-export everything from core/config
export * from './lib/core/config';

// -----------------------------------------------------------------------------
// Data Module - Data validation, normalization, sync
// -----------------------------------------------------------------------------
// Export commonly used data utilities
export {
  // Validation
  v,
  is,
  rules,
  // Normalization
  normalize,
  denormalize,
  schema,
  // Sync
  createSyncEngine,
  createConflictResolver,
  // Integrity
  createIntegrityChecker,
  createConsistencyMonitor,
  // React hooks
  useDataValidation,
  useFormValidation,
  useDataSync,
  useOptimisticSync,
  useDataIntegrity,
  useNormalizedData,
} from './lib/data';

// -----------------------------------------------------------------------------
// Feature Module - Feature module system
// -----------------------------------------------------------------------------
export {
  // Factory
  createFeaturePage,
  createLazyFeaturePage,
  // Registry
  registerFeature,
  unregisterFeature,
  getFeature,
  getAllFeatures,
  getFeatureIds,
  isFeatureRegistered,
  getFeatureRoutes,
  getFeatureNavItems,
  initializeFeatures,
  clearFeatureRegistry,
  getFeatureCount,
  // Auto-registration
  autoRegisterFeatures,
  registerFeaturesSync,
  initializeFeatureRegistry,
  isFeatureRegistryInitialized,
  resetFeatureRegistry,
  waitForFeatureRegistry,
  // Feature flags integration
  extractFeatureFlags,
  generateFeatureFlagManifest,
  useFeatureVisibility,
} from './lib/feature';

export type {
  FeatureMetadata,
  FeatureConfig,
  FeatureModule,
  FeatureRegistry,
  FeatureDiscoveryResult,
} from './lib/feature';

// -----------------------------------------------------------------------------
// Flags Module - Feature flags
// -----------------------------------------------------------------------------
export {
  FeatureFlagProvider,
  useFeatureFlag,
  useFeatureFlags,
  FlagGate,
  FlagGateAll,
  FlagGateAny,
} from './lib/flags';

// -----------------------------------------------------------------------------
// Hooks Module - Custom React hooks
// -----------------------------------------------------------------------------
export {
  // Theme
  useTheme,
  useSystemThemePreference,
  // Network
  useOnlineStatus,
  useNetworkStatus,
  useNetworkQuality,
  // Debounce
  useDebouncedValue,
  useDebouncedCallback,
  useThrottledValue,
  // Resource cleanup
  useDisposable,
  useAbortController,
  useTimeout,
  useInterval,
  useMounted,
  useSafeState,
  // Global store
  useGlobalStore,
  useGlobalStoreActions,
  useStoreHydrated,
  // Prefetch
  usePrefetchRoute,
  usePrefetchOnHover,
  // Analytics
  usePageView,
  useTrackEvent,
  useTrackFeature,
  // Error recovery
  useAsyncWithRecovery,
  useSafeCallback,
  useErrorToast,
} from './lib/hooks';

// -----------------------------------------------------------------------------
// Hydration Module - Progressive hydration
// -----------------------------------------------------------------------------
export {
  HydrationProvider,
  useHydration,
  HydrationBoundary,
  useHydrationMetrics,
  useHydrationStatus,
} from './lib/hydration';

// -----------------------------------------------------------------------------
// Layouts Module - Adaptive layouts
// -----------------------------------------------------------------------------
export {
  AdaptiveLayout,
  useAdaptiveLayout,
  useContainerQuery,
  AdaptiveGrid,
  MorphTransition,
  DOMContextProvider,
  ContextAwareBox,
  useViewportPosition,
} from './lib/layouts';

// -----------------------------------------------------------------------------
// Monitoring Module - Error tracking
// -----------------------------------------------------------------------------
export {
  ErrorBoundary,
  GlobalErrorBoundary,
  withErrorBoundary,
  useErrorBoundary,
  ErrorReporter,
  initErrorReporter,
  setUserContext,
  setErrorContext,
  clearErrorContext,
  reportError,
  reportWarning,
  reportInfo,
  addBreadcrumb,
  HierarchicalErrorBoundary,
  CriticalErrorBoundary,
  FeatureErrorBoundary,
  ComponentErrorBoundary,
  WidgetErrorBoundary,
  withHierarchicalErrorBoundary,
  getStructuredErrorMessage,
  getToastMessage,
  getToastNotification,
} from './lib/monitoring';

export type {
  AppError,
  ErrorSeverity,
  ErrorCategory,
  ErrorContext,
  ErrorReport,
  ErrorReporterConfig,
} from './lib/monitoring';

// -----------------------------------------------------------------------------
// Performance Module - Web Vitals, performance monitoring
// -----------------------------------------------------------------------------
export {
  PerformanceProvider,
  usePerformanceObservatory,
  PerformanceObservatory,
  initPerformanceMonitoring,
  startPerformanceMonitoring,
  usePerformanceBudget,
  useRenderMetrics,
  useLongTaskDetector,
  useMemoryPressure,
  VitalsCollector,
  getVitalsCollector,
  PerformanceMonitor,
  PerformanceBudgetManager,
  RenderTracker,
  NetworkPerformanceAnalyzer,
} from './lib/performance';

export type {
  VitalMetricName,
  PerformanceRating,
  PerformanceBudget,
  VitalsSnapshot,
  BudgetViolation,
} from './lib/performance';

// -----------------------------------------------------------------------------
// Queries Module - React Query utilities
// -----------------------------------------------------------------------------
export {
  queryClient,
  createQueryClient,
  queryKeys,
  createQueryKeyFactory,
  usePrefetch,
  useInvalidateQueries,
  useQueryState,
  useOptimisticUpdate,
  useBatchQueryUpdates,
} from './lib/queries';

// -----------------------------------------------------------------------------
// Realtime Module - WebSocket, SSE
// -----------------------------------------------------------------------------
export {
  RealtimeProvider,
  useRealtimeContext,
  useRealtimeStream,
  useMultiRealtimeStream,
  useRealtimeConnection,
  useBufferedRealtimeStream,
  useRealtimePresence,
  WebSocketClient,
  createWebSocketClient,
  SSEClient,
  createSSEClient,
  StreamQueryCacheUpdater,
  createStreamCacheUpdater,
  createCacheStrategy,
} from './lib/realtime';

// -----------------------------------------------------------------------------
// Routing Module - Type-safe routing
// -----------------------------------------------------------------------------
export {
  // Legacy routes
  routes,
  buildPath,
  buildPathWithQuery,
  parseQuery,
  // Linking
  AppLink,
  AppNavLink,
  appRoutes,
  // Hooks
  useTabParam,
  useRouteInfo,
  useRouteNavigate,
  useQueryParams,
  useQueryParam,
  // Router factory
  createRouter,
  // Route registry
  RouteRegistry,
  createRegistry,
  // Core utilities
  normalizePath,
  joinPath,
  splitPath,
  matchPathPattern,
} from './lib/routing';

// -----------------------------------------------------------------------------
// Security Module - Security utilities
// -----------------------------------------------------------------------------
export {
  // CSP
  CSPManager,
  // CSRF
  CSRFProtection,
  useCSRFToken,
  // XSS
  sanitizeHTML,
  // Secure Storage
  SecureStorage,
  createSecureLocalStorage,
  createSecureSessionStorage,
  useSecureStorage,
} from './lib/security';

// -----------------------------------------------------------------------------
// Services Module - Service layer
// -----------------------------------------------------------------------------
export {
  serviceLayer,
  initializeServiceLayer,
  getServiceLayerStatus,
  disposeServiceLayer,
  HttpClient,
  httpClient,
  RequestCache,
  requestCache,
  createCachedFetcher,
  withCache,
} from './lib/services';

// -----------------------------------------------------------------------------
// Shared Module - Shared utilities
// -----------------------------------------------------------------------------
export {
  debounce,
  throttle,
} from './lib/shared';

// -----------------------------------------------------------------------------
// State Module - State management
// -----------------------------------------------------------------------------
export {
  // Store
  useStore,
  getStoreState,
  subscribeToStore,
  resetStore,
  clearPersistedStore,
  hasStoreHydrated,
  waitForHydration,
  // Feature stores
  registerFeatureStore,
  unregisterFeatureStore,
  getFeatureStore,
  getFeatureStoreNames,
  resetAllFeatureStores,
  // Factories
  createAppStore,
  createSimpleStore,
  createMinimalStore,
  createSlice,
  createAction,
  combineSlices,
  createSelector,
} from './lib/state';

// -----------------------------------------------------------------------------
// Streaming Module - Streaming HTML/data
// -----------------------------------------------------------------------------
export {
  StreamProvider,
  useStreamContext,
  useStreamingAvailable,
  useIsSSR,
  useStreamMetrics,
  useStreamEvents,
  StreamBoundary,
  CriticalStreamBoundary,
  DeferredStreamBoundary,
  ConditionalStreamBoundary,
  StreamingEngine,
} from './lib/streaming';

// -----------------------------------------------------------------------------
// System Module - Application lifecycle
// -----------------------------------------------------------------------------
export {
  systemManager,
  initializeSystem,
  getSystemStatus,
  shutdownSystem,
} from './lib/system';

export type {
  SystemConfig,
  SystemStatus,
} from './lib/system';

// -----------------------------------------------------------------------------
// Theme Module - Theming
// -----------------------------------------------------------------------------
export {
  ThemeProvider,
  useThemeContext,
  tokens,
  colorTokens,
  lightPalette,
  darkPalette,
} from './lib/theme';

export type {
  ThemeMode,
  ResolvedTheme,
  ThemeConfig,
  ColorPalette,
  DesignTokens,
} from './lib/theme';

// -----------------------------------------------------------------------------
// UI Module - UI components
// -----------------------------------------------------------------------------
export * from './lib/ui';

// -----------------------------------------------------------------------------
// Utils Module - Utility functions
// -----------------------------------------------------------------------------
export {
  // Type guards
  isString,
  isNumber,
  isBoolean,
  isObject,
  isArray,
  isFunction,
  isDefined,
  isPromise,
  // Result type
  ok,
  err,
  isOk,
  isErr,
} from './lib/utils';

export type {
  DeepRequired,
  DeepReadonly,
  Nullable,
  Maybe,
  Result,
} from './lib/utils';

// -----------------------------------------------------------------------------
// UX Module - Loading states, skeletons, accessibility
// -----------------------------------------------------------------------------
export {
  // Loading
  LoadingProvider,
  LoadingIndicator,
  useLoading,
  useLoadingState,
  // Skeletons
  SkeletonFactory,
  createTextSkeleton,
  createCardSkeleton,
  // Optimistic UI
  OptimisticUpdateManager,
  createOptimisticManager,
  // Accessibility
  useFocusTrap,
} from './lib/ux';

// -----------------------------------------------------------------------------
// VDOM Module - Virtual Modular DOM system
// -----------------------------------------------------------------------------
export {
  ModuleProvider,
  ModuleBoundary,
  ModuleSlot,
  useModule,
  useModuleState,
  useModuleHierarchy,
  useModuleEmit,
  VDOMPool,
  ModuleRegistry,
  ModuleLoader,
} from './lib/vdom';
