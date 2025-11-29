# Complete Export Reference

Alphabetical list of ALL exports from @missionfabric-js/enzyme with import paths, types, and descriptions.

## Table of Contents

- [A](#a) | [B](#b) | [C](#c) | [D](#d) | [E](#e) | [F](#f) | [G](#g) | [H](#h) | [I](#i) | [J](#j) | [K](#k) | [L](#l) | [M](#m)
- [N](#n) | [O](#o) | [P](#p) | [Q](#q) | [R](#r) | [S](#s) | [T](#t) | [U](#u) | [V](#v) | [W](#w) | [X](#x) | [Y](#y) | [Z](#z)

---

## A

| Export | Module | Type | Description |
|--------|--------|------|-------------|
| `ADAttributeMapper` | `/auth` | Class | Maps Active Directory user attributes to application user model |
| `ADClient` | `/auth` | Class | Active Directory authentication client |
| `ADContext` | `/auth` | Context | React context for Active Directory state |
| `ADGroupMapper` | `/auth` | Class | Maps AD groups to application roles |
| `ADProvider` | `/auth` | Component | Provider for Active Directory integration |
| `ADTokenHandler` | `/auth` | Class | Handles AD token acquisition and refresh |
| `AdaptiveGrid` | `/layouts` | Component | Responsive grid that adapts to container size |
| `AdaptiveLayout` | `/layouts` | Component | Layout that adapts based on viewport and container |
| `AdaptiveLayoutContext` | `/contexts` | Context | Context for adaptive layout state |
| `APIGateway` | `/api` | Class | HTTP request gateway with middleware support |
| `APIMetricsCollector` | `/api` | Class | Collects and reports API performance metrics |
| `ApiClient` | `/api` | Class | Enterprise HTTP client with retry and interceptors |
| `ApiClientContext` | `/contexts` | Context | Context for API client instance |
| `ApiClientProvider` | `/api` | Component | Provider for API client context |
| `AppLink` | `/routing` | Component | Type-safe navigation link component |
| `AppNavLink` | `/routing` | Component | Navigation link with active state styling |
| `AuthContext` | `/contexts` | Context | React context for authentication state |
| `AuthProvider` | `/auth` | Component | Provider for authentication and user state |
| `apiClient` | `/api` | Instance | Singleton instance of ApiClient |
| `appRoutes` | `/routing` | Object | Type-safe route definitions |
| `authService` | `/auth` | Service | Authentication service singleton |

## B

| Export | Module | Type | Description |
|--------|--------|------|-------------|
| `BaseSchema` | `/data` | Class | Base validation schema class |
| `BooleanSchema` | `/data` | Class | Boolean value validation schema |
| `BridgeConsumer` | `/coordination` | Component | Consumes bridged context values |
| `BridgeSource` | `/coordination` | Component | Sources context values for bridging |
| `buildApiUrl` | `/api` | Function | Builds API URL from endpoint and params |
| `buildApiUrlWithParams` | `/api` | Function | Builds API URL with path and query params |
| `buildListParams` | `/api` | Function | Builds standardized list request params |
| `buildPath` | `/routing` | Function | Builds path from route and params |
| `buildPathWithQuery` | `/routing` | Function | Builds path with query parameters |
| `buildUrl` | `/api` | Function | Constructs URL from base and path |
| `buildVersionedUrl` | `/api` | Function | Builds URL with API version |

## C

| Export | Module | Type | Description |
|--------|--------|------|-------------|
| `CSPManager` | `/security` | Class | Content Security Policy manager |
| `CSRFProtection` | `/security` | Component | CSRF protection wrapper component |
| `ConfigContext` | `/contexts` | Context | React context for configuration |
| `ConfigLoader` | `/config` | Class | Loads configuration from multiple sources |
| `ConfigMerger` | `/config` | Class | Merges configurations with strategies |
| `ConfigProvider` | `/config` | Component | Provides configuration to React tree |
| `ConfigValidator` | `/config` | Class | Validates configuration against schema |
| `CommonSchemas` | `/config` | Object | Common configuration schemas |
| `ComponentErrorBoundary` | `/monitoring` | Component | Error boundary for individual components |
| `ContextAwareBox` | `/layouts` | Component | Box component aware of DOM context |
| `ContextBridgeImpl` | `/coordination` | Class | Implementation of context bridging |
| `ContextBridgeProvider` | `/coordination` | Component | Provider for context bridge |
| `ContainerContext` | `/contexts` | Context | Context for container queries |
| `CoordinationProvider` | `/coordination` | Component | Provider for cross-module coordination |
| `CriticalErrorBoundary` | `/monitoring` | Component | Error boundary for critical errors |
| `CriticalStreamBoundary` | `/streaming` | Component | Stream boundary for critical content |
| `CrossDomainSSO` | `/auth` | Class | Cross-domain single sign-on manager |
| `canAccessRoute` | `/auth` | Function | Checks if user can access a route |
| `clearErrorContext` | `/monitoring` | Function | Clears error reporter context |
| `clearPersistedStore` | `/state` | Function | Clears persisted state storage |
| `combineSlices` | `/state` | Function | Combines multiple state slices |
| `createADClient` | `/auth` | Function | Factory for AD client |
| `createApiClient` | `/api` | Function | Factory for API client |
| `createApiError` | `/api` | Function | Creates standardized API error |
| `createApiHooks` | `/api` | Function | Generates typed query/mutation hooks |
| `createAppStore` | `/state` | Function | Creates application Zustand store |
| `createAttributeMapper` | `/auth` | Function | Creates AD attribute mapper |
| `createCachedFetcher` | `/services` | Function | Creates cached fetch function |
| `createConfigLoader` | `/config` | Function | Factory for config loader |
| `createConflictResolver` | `/data` | Function | Creates data sync conflict resolver |
| `createConsistencyMonitor` | `/data` | Function | Creates data consistency monitor |
| `createCrossDomainSSO` | `/auth` | Function | Factory for cross-domain SSO |
| `createFeaturePage` | `/feature` | Function | Creates feature page with metadata |
| `createFormValidator` | `/data` | Function | Creates form validation handler |
| `createGroupMapper` | `/auth` | Function | Factory for AD group mapper |
| `createIntegrityChecker` | `/data` | Function | Creates data integrity checker |
| `createLazyFeaturePage` | `/feature` | Function | Creates code-split feature page |
| `createMockServer` | `/api` | Function | Creates mock API server |
| `createOptimisticManager` | `/ux` | Function | Creates optimistic UI manager |
| `createPermissionMatrixBuilder` | `/auth` | Function | Creates RBAC permission matrix builder |
| `createPolicyEvaluator` | `/auth` | Function | Creates RBAC policy evaluator |
| `createQueryClient` | `/queries` | Function | Creates React Query client |
| `createQueryKeyFactory` | `/api` | Function | Creates typed query key factory |
| `createRBACEngine` | `/auth` | Function | Creates RBAC authorization engine |
| `createRequest` | `/api` | Function | Creates HTTP request builder |
| `createResourcePermissionManager` | `/auth` | Function | Creates resource permission manager |
| `createRoleHierarchy` | `/auth` | Function | Creates role hierarchy manager |
| `createRouter` | `/routing` | Function | Creates type-safe router |
| `createRuntimeConfig` | `/config` | Function | Creates runtime configuration manager |
| `createSchema` | `/config` | Function | Creates configuration schema |
| `createSecureLocalStorage` | `/security` | Function | Creates encrypted local storage |
| `createSecureSessionStorage` | `/security` | Function | Creates encrypted session storage |
| `createServiceContract` | `/coordination` | Function | Creates DI service contract |
| `createSimpleStore` | `/state` | Function | Creates simple Zustand store |
| `createSlice` | `/state` | Function | Creates state slice |
| `createSSEClient` | `/realtime` | Function | Creates Server-Sent Events client |
| `createSSOManager` | `/auth` | Function | Factory for SSO manager |
| `createStreamCacheUpdater` | `/realtime` | Function | Creates stream-to-cache updater |
| `createSyncEngine` | `/data` | Function | Creates data synchronization engine |
| `createTokenHandler` | `/auth` | Function | Factory for AD token handler |
| `createWebSocketClient` | `/realtime` | Function | Creates WebSocket client |

## D

| Export | Module | Type | Description |
|--------|--------|------|-------------|
| `DIContext` | `/contexts` | Context | Dependency injection context |
| `DOMContextProvider` | `/layouts` | Component | Provides DOM context for layouts |
| `DateSchema` | `/data` | Class | Date validation schema |
| `DefaultErrorFallback` | `/coordination` | Component | Default error fallback UI |
| `DefaultLoadingFallback` | `/coordination` | Component | Default loading fallback UI |
| `DeferredStreamBoundary` | `/streaming` | Component | Deferred content stream boundary |
| `DependencyInjectorImpl` | `/coordination` | Class | Dependency injection container |
| `darkPalette` | `/theme` | Object | Dark theme color palette |
| `debounce` | `/shared` | Function | Debounces function calls |
| `deepMerge` | `/config` | Function | Deep merges configuration objects |
| `del` | `/api` | Function | Creates DELETE request builder |
| `denormalize` | `/data` | Function | Denormalizes entity data |
| `detectEnvironment` | `/config` | Function | Detects current environment |
| `disposeServiceLayer` | `/services` | Function | Disposes service layer resources |

## E

| Export | Module | Type | Description |
|--------|--------|------|-------------|
| `EnumSchema` | `/data` | Class | Enum validation schema |
| `ErrorBoundary` | `/monitoring` | Component | React error boundary component |
| `ErrorBoundaryContext` | `/contexts` | Context | Error boundary state context |
| `ErrorReporter` | `/monitoring` | Class | Error reporting and tracking service |
| `EventPriority` | `/coordination` | Enum | Event bus priority levels |
| `err` | `/utils` | Function | Creates error Result type |
| `extractFeatureFlags` | `/feature` | Function | Extracts flags from feature config |

## F

| Export | Module | Type | Description |
|--------|--------|------|-------------|
| `FeatureBridgeImpl` | `/coordination` | Class | Feature capability bridge implementation |
| `FeatureDIContainer` | `/feature` | Class | DI container for features |
| `FeatureDIProvider` | `/feature` | Component | Provider for feature DI |
| `FeatureErrorBoundary` | `/monitoring` | Component | Error boundary for feature modules |
| `FeatureFlagContext` | `/contexts` | Context | Feature flag context |
| `FeatureFlagProvider` | `/flags` | Component | Provider for feature flags |
| `FilterPanel` | `/feature` | Component | Generic filter panel component |
| `FlagGate` | `/flags` | Component | Conditionally renders based on flag |
| `FlagGateAll` | `/flags` | Component | Renders if all flags are enabled |
| `FlagGateAny` | `/flags` | Component | Renders if any flag is enabled |
| `flattenConfig` | `/config` | Function | Flattens nested configuration |

## G

| Export | Module | Type | Description |
|--------|--------|------|-------------|
| `GenericDetail` | `/feature` | Component | Generic detail view component |
| `GenericList` | `/feature` | Component | Generic list view component |
| `GlobalErrorBoundary` | `/monitoring` | Component | Top-level error boundary |
| `get` | `/api` | Function | Creates GET request builder |
| `getAllFeatures` | `/feature` | Function | Gets all registered features |
| `getCoordinationEventBus` | `/coordination` | Function | Gets event bus instance |
| `getCoordinationVersion` | `/coordination` | Function | Gets coordination system version |
| `getContainer` | `/feature` | Function | Gets feature DI container |
| `getContextBridgeManager` | `/coordination` | Function | Gets context bridge manager |
| `getEnvVar` | `/config` | Function | Gets environment variable |
| `getEnvironmentApiConfig` | `/api` | Function | Gets environment-specific API config |
| `getFeature` | `/feature` | Function | Gets registered feature by ID |
| `getFeatureBridge` | `/coordination` | Function | Gets feature bridge instance |
| `getFeatureCount` | `/feature` | Function | Gets count of registered features |
| `getFeatureIds` | `/feature` | Function | Gets all feature IDs |
| `getFeatureNavItems` | `/feature` | Function | Gets navigation items from features |
| `getFeatureRoutes` | `/feature` | Function | Gets routes from all features |
| `getFeatureStore` | `/state` | Function | Gets feature-specific store |
| `getFeatureStoreNames` | `/state` | Function | Gets all feature store names |
| `getGlobalContainer` | `/coordination` | Function | Gets global DI container |
| `getGlobalProviderTree` | `/coordination` | Function | Gets global provider tree |
| `getGlobalRegistry` | `/data` | Function | Gets global schema registry |
| `getLifecycleManager` | `/coordination` | Function | Gets lifecycle manager |
| `getProviderOrchestrator` | `/coordination` | Function | Gets provider orchestrator |
| `getRouteAuthConfig` | `/auth` | Function | Gets route auth configuration |
| `getRuntimeConfig` | `/config` | Function | Gets runtime configuration |
| `getServiceLayerStatus` | `/services` | Function | Gets service layer status |
| `getStateCoordinator` | `/coordination` | Function | Gets state coordinator |
| `getStoreState` | `/state` | Function | Gets current store state |
| `getStructuredErrorMessage` | `/monitoring` | Function | Gets structured error message |
| `getSystemStatus` | `/system` | Function | Gets system status |
| `getToastMessage` | `/monitoring` | Function | Gets toast error message |
| `getToastNotification` | `/monitoring` | Function | Gets toast notification |
| `getVersionedApiUrl` | `/api` | Function | Gets versioned API URL |
| `getVitalsCollector` | `/performance` | Function | Gets web vitals collector |

## H

| Export | Module | Type | Description |
|--------|--------|------|-------------|
| `HierarchicalErrorBoundary` | `/monitoring` | Component | Hierarchical error boundary |
| `HttpClient` | `/services` | Class | HTTP client service |
| `HydrationBoundary` | `/hydration` | Component | Progressive hydration boundary |
| `HydrationContext` | `/contexts` | Context | Hydration state context |
| `HydrationProvider` | `/hydration` | Component | Provider for hydration system |
| `hasStoreHydrated` | `/state` | Function | Checks if store has hydrated |
| `httpClient` | `/services` | Instance | HTTP client singleton |

## I

| Export | Module | Type | Description |
|--------|--------|------|-------------|
| `initCoordination` | `/coordination` | Function | Initializes coordination system |
| `initErrorReporter` | `/monitoring` | Function | Initializes error reporter |
| `initPerformanceMonitoring` | `/performance` | Function | Initializes performance monitoring |
| `initRuntimeConfig` | `/config` | Function | Initializes runtime config |
| `initializeFeatureRegistry` | `/feature` | Function | Initializes feature registry |
| `initializeFeatures` | `/feature` | Function | Initializes all features |
| `initializeLibraries` | `/coordination` | Function | Initializes library lifecycle |
| `initializeServiceLayer` | `/services` | Function | Initializes service layer |
| `initializeSystem` | `/system` | Function | Initializes application system |
| `invokeAnyCapability` | `/coordination` | Function | Invokes any matching capability |
| `invokeCapability` | `/coordination` | Function | Invokes feature capability |
| `is` | `/data` | Object | Runtime type checking utilities |
| `isArray` | `/utils` | Function | Type guard for arrays |
| `isBoolean` | `/utils` | Function | Type guard for booleans |
| `isBrowser` | `/config` | Function | Checks if running in browser |
| `isDefined` | `/utils` | Function | Type guard for defined values |
| `isDevelopment` | `/config` | Function | Checks if development environment |
| `isErr` | `/utils` | Function | Type guard for error Result |
| `isFeatureRegistered` | `/feature` | Function | Checks if feature is registered |
| `isFeatureRegistryInitialized` | `/feature` | Function | Checks if registry is initialized |
| `isFunction` | `/utils` | Function | Type guard for functions |
| `isNumber` | `/utils` | Function | Type guard for numbers |
| `isObject` | `/utils` | Function | Type guard for objects |
| `isOk` | `/utils` | Function | Type guard for success Result |
| `isProduction` | `/config` | Function | Checks if production environment |
| `isPromise` | `/utils` | Function | Type guard for promises |
| `isServer` | `/config` | Function | Checks if running on server |
| `isStaging` | `/config` | Function | Checks if staging environment |
| `isString` | `/utils` | Function | Type guard for strings |
| `isTest` | `/config` | Function | Checks if test environment |

## J

| Export | Module | Type | Description |
|--------|--------|------|-------------|
| `joinPath` | `/routing` | Function | Joins path segments |

## K

No exports starting with K.

## L

| Export | Module | Type | Description |
|--------|--------|------|-------------|
| `LIBRARY_IDS` | `/coordination` | Constant | Library identifier constants |
| `LiteralSchema` | `/data` | Class | Literal value validation schema |
| `LoadingContext` | `/contexts` | Context | Loading state context |
| `LoadingIndicator` | `/ux` | Component | Loading indicator component |
| `LoadingProvider` | `/ux` | Component | Provider for loading state |
| `LoggerContract` | `/coordination` | Contract | Logger service contract |
| `lightPalette` | `/theme` | Object | Light theme color palette |
| `loadConfig` | `/config` | Function | Loads configuration |

## M

| Export | Module | Type | Description |
|--------|--------|------|-------------|
| `ModuleBoundary` | `/vdom` | Component | Module isolation boundary |
| `ModuleBoundaryContext` | `/contexts` | Context | Module boundary context |
| `ModuleLoader` | `/vdom` | Class | Dynamic module loader |
| `ModuleProvider` | `/vdom` | Component | Virtual DOM module provider |
| `ModuleRegistry` | `/vdom` | Class | Module registry |
| `ModuleSlot` | `/vdom` | Component | Slot for dynamic modules |
| `ModuleSystemContext` | `/contexts` | Context | Module system context |
| `MorphTransition` | `/layouts` | Component | Morphing layout transition |
| `MockServer` | `/api` | Class | Mock API server |
| `matchPathPattern` | `/routing` | Function | Matches path against pattern |
| `mockData` | `/api` | Object | Mock data generators |
| `mockHandlers` | `/api` | Object | Mock request handlers |
| `mockServer` | `/api` | Instance | Mock server singleton |

## N

| Export | Module | Type | Description |
|--------|--------|------|-------------|
| `NetworkPerformanceAnalyzer` | `/performance` | Class | Network performance analyzer |
| `NumberSchema` | `/data` | Class | Number validation schema |
| `normalize` | `/data` | Function | Normalizes entity data |
| `normalizeError` | `/api` | Function | Normalizes API errors |
| `normalizePath` | `/routing` | Function | Normalizes URL path |

## O

| Export | Module | Type | Description |
|--------|--------|------|-------------|
| `ObjectSchema` | `/data` | Class | Object validation schema |
| `OrchestratedProviders` | `/coordination` | Component | Orchestrated provider tree |
| `OptimisticUpdateManager` | `/ux` | Class | Optimistic UI update manager |
| `ok` | `/utils` | Function | Creates success Result type |

## P

| Export | Module | Type | Description |
|--------|--------|------|-------------|
| `PHASE_IDS` | `/coordination` | Constant | Lifecycle phase IDs |
| `Pagination` | `/feature` | Component | Generic pagination component |
| `PerformanceBudgetManager` | `/performance` | Class | Performance budget manager |
| `PerformanceMonitor` | `/performance` | Class | Performance monitoring service |
| `PerformanceObservatory` | `/performance` | Class | Performance observatory |
| `PerformanceObservatoryContext` | `/contexts` | Context | Performance context |
| `PerformanceProvider` | `/performance` | Component | Performance monitoring provider |
| `PermissionMatrixBuilder` | `/auth` | Class | RBAC permission matrix builder |
| `PolicyEvaluator` | `/auth` | Class | RBAC policy evaluator |
| `ProviderOrchestratorImpl` | `/coordination` | Class | Provider orchestration implementation |
| `parseQuery` | `/routing` | Function | Parses query string |
| `parseResponse` | `/api` | Function | Parses API response |
| `patch` | `/api` | Function | Creates PATCH request builder |
| `post` | `/api` | Function | Creates POST request builder |
| `publishEvent` | `/coordination` | Function | Publishes coordination event |
| `put` | `/api` | Function | Creates PUT request builder |

## Q

| Export | Module | Type | Description |
|--------|--------|------|-------------|
| `queryClient` | `/queries` | Instance | React Query client singleton |
| `queryKeys` | `/queries` | Object | Query key factory |

## R

| Export | Module | Type | Description |
|--------|--------|------|-------------|
| `RBACContext` | `/contexts` | Context | RBAC context |
| `RBACEngine` | `/auth` | Class | RBAC authorization engine |
| `RBACProvider` | `/auth` | Component | Provider for RBAC |
| `RealtimeContext` | `/contexts` | Context | Realtime connection context |
| `RealtimeProvider` | `/realtime` | Component | Provider for realtime features |
| `RecordSchema` | `/data` | Class | Record validation schema |
| `RenderTracker` | `/performance` | Class | Component render tracker |
| `RequestBuilder` | `/api` | Class | Fluent request builder |
| `RequestCache` | `/services` | Class | Request caching service |
| `RequestOrchestrator` | `/api` | Class | Request orchestration |
| `RequireAuth` | `/auth` | Component | Route guard requiring auth |
| `RequirePermission` | `/auth` | Component | Route guard requiring permission |
| `RequireRole` | `/auth` | Component | Route guard requiring role |
| `ResourcePermissionManager` | `/auth` | Class | Resource permission manager |
| `ResponseNormalizer` | `/api` | Class | Response normalization |
| `RoleHierarchyManager` | `/auth` | Class | Role hierarchy manager |
| `RouteRegistry` | `/routing` | Class | Route registry |
| `RuntimeConfig` | `/config` | Class | Runtime configuration manager |
| `registerFeature` | `/feature` | Function | Registers a feature |
| `registerFeatureCoordination` | `/coordination` | Function | Registers feature with coordination |
| `registerFeatureStore` | `/state` | Function | Registers feature store |
| `registerLibrary` | `/coordination` | Function | Registers library lifecycle |
| `registerProvider` | `/coordination` | Function | Registers provider |
| `registerService` | `/coordination` | Function | Registers DI service |
| `registerStateSlice` | `/coordination` | Function | Registers state slice |
| `reportError` | `/monitoring` | Function | Reports error to monitoring |
| `reportInfo` | `/monitoring` | Function | Reports info to monitoring |
| `reportWarning` | `/monitoring` | Function | Reports warning to monitoring |
| `requestCache` | `/services` | Instance | Request cache singleton |
| `requireEnvVar` | `/config` | Function | Requires environment variable |
| `resetAllFeatureStores` | `/state` | Function | Resets all feature stores |
| `resetCoordinationEventBus` | `/coordination` | Function | Resets event bus |
| `resetContextBridgeManager` | `/coordination` | Function | Resets context bridge |
| `resetFeatureBridge` | `/coordination` | Function | Resets feature bridge |
| `resetFeatureRegistry` | `/feature` | Function | Resets feature registry |
| `resetGlobalContainer` | `/coordination` | Function | Resets global DI container |
| `resetGlobalRegistry` | `/data` | Function | Resets schema registry |
| `resetLifecycleManager` | `/coordination` | Function | Resets lifecycle manager |
| `resetProviderOrchestrator` | `/coordination` | Function | Resets provider orchestrator |
| `resetRuntimeConfig` | `/config` | Function | Resets runtime config |
| `resetStateCoordinator` | `/coordination` | Function | Resets state coordinator |
| `resetStore` | `/state` | Function | Resets store state |
| `resolveService` | `/coordination` | Function | Resolves DI service |
| `routes` | `/routing` | Object | Legacy route definitions |
| `routeMetadata` | `/auth` | Object | Route metadata registry |
| `rules` | `/data` | Object | Form validation rules |

## S

| Export | Module | Type | Description |
|--------|--------|------|-------------|
| `SLICE_IDS` | `/coordination` | Constant | State slice IDs |
| `SSEClient` | `/realtime` | Class | Server-Sent Events client |
| `SSOManager` | `/auth` | Class | Single sign-on manager |
| `SchemaBuilder` | `/config` | Class | Configuration schema builder |
| `ScrollContainerContext` | `/contexts` | Context | Scroll container context |
| `SearchInput` | `/feature` | Component | Generic search input |
| `SecureStorage` | `/security` | Class | Encrypted storage |
| `SecurityContext` | `/contexts` | Context | Security context |
| `SkeletonFactory` | `/ux` | Class | Skeleton screen factory |
| `StatsCard` | `/feature` | Component | Generic stats card |
| `StateCoordinatorImpl` | `/coordination` | Class | State coordination implementation |
| `StreamBoundary` | `/streaming` | Component | Streaming content boundary |
| `StreamContext` | `/contexts` | Context | Streaming context |
| `StreamProvider` | `/streaming` | Component | Provider for streaming |
| `StreamQueryCacheUpdater` | `/realtime` | Class | Stream to query cache updater |
| `StreamingEngine` | `/streaming` | Class | Streaming engine |
| `StringSchema` | `/data` | Class | String validation schema |
| `sanitizeHTML` | `/security` | Function | Sanitizes HTML content |
| `schema` | `/data` | Object | Entity schema definitions |
| `serviceLayer` | `/services` | Instance | Service layer singleton |
| `setCoordinationEventBus` | `/coordination` | Function | Sets event bus instance |
| `setContextBridgeManager` | `/coordination` | Function | Sets context bridge manager |
| `setErrorContext` | `/monitoring` | Function | Sets error context |
| `setFeatureBridge` | `/coordination` | Function | Sets feature bridge |
| `setGlobalContainer` | `/coordination` | Function | Sets global DI container |
| `setLifecycleManager` | `/coordination` | Function | Sets lifecycle manager |
| `setProviderOrchestrator` | `/coordination` | Function | Sets provider orchestrator |
| `setStateCoordinator` | `/coordination` | Function | Sets state coordinator |
| `setUserContext` | `/monitoring` | Function | Sets user context for errors |
| `shallowMerge` | `/config` | Function | Shallow merges objects |
| `shutdownLibraries` | `/coordination` | Function | Shuts down libraries |
| `shutdownSystem` | `/system` | Function | Shuts down application |
| `splitPath` | `/routing` | Function | Splits path into segments |
| `startPerformanceMonitoring` | `/performance` | Function | Starts performance monitoring |
| `subscribeToEvent` | `/coordination` | Function | Subscribes to event |
| `subscribeToStore` | `/state` | Function | Subscribes to store changes |
| `systemManager` | `/system` | Instance | System manager singleton |

## T

| Export | Module | Type | Description |
|--------|--------|------|-------------|
| `TelemetryContract` | `/coordination` | Contract | Telemetry service contract |
| `ThemeContext` | `/contexts` | Context | Theme context |
| `ThemeProvider` | `/theme` | Component | Provider for theming |
| `ToastContext` | `/contexts` | Context | Toast notification context |
| `throttle` | `/shared` | Function | Throttles function calls |
| `tokens` | `/theme` | Object | Design system tokens |
| `tryResolveService` | `/coordination` | Function | Tries to resolve service |

## U

| Export | Module | Type | Description |
|--------|--------|------|-------------|
| `UnionSchema` | `/data` | Class | Union type validation schema |
| `UnknownSchema` | `/data` | Class | Unknown type validation schema |
| `unflattenConfig` | `/config` | Function | Unflattens configuration |
| `unregisterFeature` | `/feature` | Function | Unregisters feature |
| `unregisterFeatureStore` | `/state` | Function | Unregisters feature store |
| `useAbortController` | `/hooks` | Hook | Manages AbortController lifecycle |
| `useActiveDirectory` | `/auth` | Hook | Active Directory integration hook |
| `useAdaptiveLayout` | `/layouts` | Hook | Adaptive layout hook |
| `useApiCache` | `/api` | Hook | API cache management hook |
| `useApiClient` | `/api` | Hook | API client hook |
| `useApiHealth` | `/api` | Hook | API health monitoring hook |
| `useApiMutation` | `/api` | Hook | API mutation hook |
| `useApiRequest` | `/api` | Hook | API request hook |
| `useAsyncWithRecovery` | `/hooks` | Hook | Async operations with error recovery |
| `useAuth` | `/auth` | Hook | Authentication hook |
| `useAuthContext` | `/auth` | Hook | Auth context hook |
| `useBatchQueryUpdates` | `/queries` | Hook | Batches query updates |
| `useBridgeManager` | `/coordination` | Hook | Context bridge manager hook |
| `useBridgedContext` | `/coordination` | Hook | Bridged context hook |
| `useBufferedRealtimeStream` | `/realtime` | Hook | Buffered realtime stream hook |
| `useCSRFToken` | `/security` | Hook | CSRF token hook |
| `useComposedHooks` | `/coordination` | Hook | Composes multiple hooks |
| `useConditionalHook` | `/coordination` | Hook | Conditionally runs hook |
| `useConfig` | `/config` | Hook | Configuration hook |
| `useConfigContext` | `/config` | Hook | Config context hook |
| `useConfigValue` | `/config` | Hook | Gets single config value |
| `useContainerQuery` | `/layouts` | Hook | Container query hook |
| `useCoordination` | `/coordination` | Hook | Coordination system hook |
| `useCoordinationEvent` | `/coordination` | Hook | Coordination event hook |
| `useCoordinationPublish` | `/coordination` | Hook | Publishes coordination events |
| `useCoordinationService` | `/coordination` | Hook | DI service hook |
| `useDataIntegrity` | `/data` | Hook | Data integrity monitoring hook |
| `useDataSync` | `/data` | Hook | Data synchronization hook |
| `useDataValidation` | `/data` | Hook | Data validation hook |
| `useDebouncedCallback` | `/hooks` | Hook | Debounced callback hook |
| `useDebouncedValue` | `/hooks` | Hook | Debounced value hook |
| `useDisposable` | `/hooks` | Hook | Resource disposal hook |
| `useEnvironment` | `/config` | Hook | Environment detection hook |
| `useErrorBoundary` | `/monitoring` | Hook | Error boundary hook |
| `useErrorToast` | `/hooks` | Hook | Error toast notifications |
| `useFeatureFlag` | `/flags` | Hook | Feature flag hook |
| `useFeatureFlags` | `/flags` | Hook | Multiple feature flags hook |
| `useFeatureVisibility` | `/feature` | Hook | Feature visibility hook |
| `useFocusTrap` | `/ux` | Hook | Focus trap for accessibility |
| `useFormValidation` | `/data` | Hook | Form validation hook |
| `useGlobalStore` | `/hooks` | Hook | Global store hook |
| `useGlobalStoreActions` | `/hooks` | Hook | Global store actions hook |
| `useHasPermission` | `/auth` | Hook | Permission check hook |
| `useHasRole` | `/auth` | Hook | Role check hook |
| `useHookSequence` | `/coordination` | Hook | Sequential hook execution |
| `useHydration` | `/hydration` | Hook | Hydration status hook |
| `useHydrationMetrics` | `/hydration` | Hook | Hydration metrics hook |
| `useHydrationStatus` | `/hydration` | Hook | Hydration status hook |
| `useInterval` | `/hooks` | Hook | Interval timer hook |
| `useInvalidateQueries` | `/queries` | Hook | Invalidates queries |
| `useIsCoordinationReady` | `/coordination` | Hook | Coordination ready status |
| `useDevelopment` | `/config` | Hook | Development mode check |
| `useIsProduction` | `/config` | Hook | Production mode check |
| `useIsSSR` | `/streaming` | Hook | Server-side rendering check |
| `useLibraryState` | `/coordination` | Hook | Library lifecycle state |
| `useLoading` | `/ux` | Hook | Loading state hook |
| `useLoadingState` | `/ux` | Hook | Loading state management |
| `useLongTaskDetector` | `/performance` | Hook | Long task detection |
| `useMemoryPressure` | `/performance` | Hook | Memory pressure detection |
| `useMemoizedComposition` | `/coordination` | Hook | Memoized hook composition |
| `useModule` | `/vdom` | Hook | Virtual DOM module hook |
| `useModuleEmit` | `/vdom` | Hook | Module event emission |
| `useModuleHierarchy` | `/vdom` | Hook | Module hierarchy hook |
| `useModuleState` | `/vdom` | Hook | Module state hook |
| `useMounted` | `/hooks` | Hook | Component mounted state |
| `useMultiRealtimeStream` | `/realtime` | Hook | Multiple realtime streams |
| `useNetworkQuality` | `/hooks` | Hook | Network quality detection |
| `useNetworkStatus` | `/hooks` | Hook | Network status hook |
| `useNormalizedData` | `/data` | Hook | Normalized data hook |
| `useOnlineStatus` | `/hooks` | Hook | Online/offline status |
| `useOptimisticSync` | `/data` | Hook | Optimistic data sync |
| `useOptimisticUpdate` | `/queries` | Hook | Optimistic updates |
| `useOptionalCoordination` | `/coordination` | Hook | Optional coordination hook |
| `usePageView` | `/hooks` | Hook | Page view tracking |
| `useParallelHooks` | `/coordination` | Hook | Parallel hook execution |
| `usePerformanceBudget` | `/performance` | Hook | Performance budget monitoring |
| `usePerformanceObservatory` | `/performance` | Hook | Performance observatory hook |
| `usePrefetch` | `/queries` | Hook | Query prefetch hook |
| `usePrefetchOnHover` | `/hooks` | Hook | Prefetch on hover |
| `usePrefetchRoute` | `/hooks` | Hook | Route prefetch hook |
| `usePermissionGate` | `/auth` | Hook | Permission gate hook |
| `usePermissions` | `/auth` | Hook | User permissions hook |
| `useQueryParam` | `/routing` | Hook | Single query param hook |
| `useQueryParams` | `/routing` | Hook | Query params hook |
| `useQueryState` | `/queries` | Hook | Query state hook |
| `useRBAC` | `/auth` | Hook | RBAC hook |
| `useRealtimeConnection` | `/realtime` | Hook | Realtime connection hook |
| `useRealtimeContext` | `/realtime` | Hook | Realtime context hook |
| `useRealtimePresence` | `/realtime` | Hook | Realtime presence hook |
| `useRealtimeStream` | `/realtime` | Hook | Realtime stream hook |
| `useRenderMetrics` | `/performance` | Hook | Render performance metrics |
| `useResourceAccess` | `/auth` | Hook | Resource access check hook |
| `useRoleGate` | `/auth` | Hook | Role gate hook |
| `useRoles` | `/auth` | Hook | User roles hook |
| `useRouteInfo` | `/routing` | Hook | Route information hook |
| `useRouteNavigate` | `/routing` | Hook | Type-safe navigation hook |
| `useSafeCallback` | `/hooks` | Hook | Safe callback with error handling |
| `useSafeState` | `/hooks` | Hook | Safe state for unmounted components |
| `useSecureStorage` | `/security` | Hook | Secure storage hook |
| `useSelectiveHooks` | `/coordination` | Hook | Selective hook execution |
| `useService` | `/coordination` | Hook | DI service resolution hook |
| `useStore` | `/state` | Hook | Zustand store hook |
| `useStoreHydrated` | `/hooks` | Hook | Store hydration status |
| `useStreamContext` | `/streaming` | Hook | Stream context hook |
| `useStreamEvents` | `/streaming` | Hook | Stream events hook |
| `useStreamMetrics` | `/streaming` | Hook | Stream metrics hook |
| `useStreamingAvailable` | `/streaming` | Hook | Streaming availability check |
| `useSystemThemePreference` | `/hooks` | Hook | System theme preference |
| `useTabParam` | `/routing` | Hook | Tab parameter hook |
| `useTheme` | `/hooks` | Hook | Theme hook |
| `useThemeContext` | `/theme` | Hook | Theme context hook |
| `useThrottledValue` | `/hooks` | Hook | Throttled value hook |
| `useTimeout` | `/hooks` | Hook | Timeout timer hook |
| `useTrackEvent` | `/hooks` | Hook | Event tracking hook |
| `useTrackFeature` | `/hooks` | Hook | Feature usage tracking |
| `useTryService` | `/coordination` | Hook | Try resolve service hook |
| `useViewportPosition` | `/layouts` | Hook | Viewport position hook |

## V

| Export | Module | Type | Description |
|--------|--------|------|-------------|
| `VDOMPool` | `/vdom` | Class | Virtual DOM component pool |
| `VersionManager` | `/api` | Class | API version manager |
| `VitalsCollector` | `/performance` | Class | Web vitals collector |
| `v` | `/data` | Object | Validation schema builder |
| `validateConfig` | `/config` | Function | Validates configuration |

## W

| Export | Module | Type | Description |
|--------|--------|------|-------------|
| `WebSocketClient` | `/realtime` | Class | WebSocket client |
| `WidgetErrorBoundary` | `/monitoring` | Component | Error boundary for widgets |
| `waitForFeatureRegistry` | `/feature` | Function | Waits for registry initialization |
| `waitForHydration` | `/state` | Function | Waits for store hydration |
| `withBridgedContext` | `/coordination` | HOC | HOC for bridged context |
| `withCache` | `/services` | HOC | HOC for caching |
| `withCoordination` | `/coordination` | HOC | HOC for coordination |
| `withErrorBoundary` | `/monitoring` | HOC | HOC for error boundary |
| `withHierarchicalErrorBoundary` | `/monitoring` | HOC | HOC for hierarchical error boundary |

## X

No exports starting with X.

## Y

No exports starting with Y.

## Z

No exports starting with Z.

---

## Import Path Reference

### Main Package
```typescript
import { ... } from '@missionfabric-js/enzyme';
```

### Submodules (Optimized Tree-Shaking)
```typescript
import { ... } from '@missionfabric-js/enzyme/api';
import { ... } from '@missionfabric-js/enzyme/auth';
import { ... } from '@missionfabric-js/enzyme/config';
import { ... } from '@missionfabric-js/enzyme/coordination';
import { ... } from '@missionfabric-js/enzyme/data';
import { ... } from '@missionfabric-js/enzyme/feature';
import { ... } from '@missionfabric-js/enzyme/flags';
import { ... } from '@missionfabric-js/enzyme/hooks';
import { ... } from '@missionfabric-js/enzyme/hydration';
import { ... } from '@missionfabric-js/enzyme/layouts';
import { ... } from '@missionfabric-js/enzyme/monitoring';
import { ... } from '@missionfabric-js/enzyme/performance';
import { ... } from '@missionfabric-js/enzyme/queries';
import { ... } from '@missionfabric-js/enzyme/realtime';
import { ... } from '@missionfabric-js/enzyme/routing';
import { ... } from '@missionfabric-js/enzyme/security';
import { ... } from '@missionfabric-js/enzyme/state';
import { ... } from '@missionfabric-js/enzyme/streaming';
import { ... } from '@missionfabric-js/enzyme/theme';
import { ... } from '@missionfabric-js/enzyme/ui';
import { ... } from '@missionfabric-js/enzyme/utils';
import { ... } from '@missionfabric-js/enzyme/ux';
import { ... } from '@missionfabric-js/enzyme/vdom';
```

---

**Total Exports:** 400+
**Last Updated:** 2025-11-29
**Version:** 1.0.5
