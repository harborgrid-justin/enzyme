# @missionfabric-js/enzyme - Master Documentation Index

> **Complete navigation and reference guide for all 29 modules, functions, hooks, and components**

---

## Quick Links

| Category | Link |
|----------|------|
| **Main Documentation Hub** | [README.md](./README.md) |
| **Getting Started** | [Quick Start](./QUICKSTART.md) • [Full Guide](./GETTING_STARTED.md) |
| **API Reference** | [Complete API](./ENZYME_API_DOCUMENTATION.md) • [Modules](./MODULE_API_DOCUMENTATION.md) • [System & Types](./SYSTEM_AND_TYPES_API_DOCUMENTATION.md) |
| **Core Guides** | [Architecture](./ARCHITECTURE.md) • [Configuration](./CONFIGURATION.md) • [Security](./SECURITY.md) |
| **Support** | [FAQ](./FAQ.md) • [Troubleshooting](./TROUBLESHOOTING.md) • [Migration](./MIGRATION.md) |

---

## Table of Contents

1. [Complete Module Index](#complete-module-index) - All 29 modules
2. [Documentation by Category](#documentation-by-category)
3. [Alphabetical Function Index](#alphabetical-function-index)
4. [Alphabetical Hook Index](#alphabetical-hook-index)
5. [Alphabetical Component Index](#alphabetical-component-index)
6. [Quick Reference by Task](#quick-reference-by-task)

---

## Complete Module Index

### All 29 Modules

| # | Module | Import Path | Description | Docs |
|---|--------|-------------|-------------|------|
| 1 | **API** | `@missionfabric-js/enzyme/api` | HTTP client, type-safe API calls, request/response handling | [API Guide](./API.md) |
| 2 | **Auth** | `@missionfabric-js/enzyme/auth` | Authentication, authorization, RBAC, Active Directory integration | [Security Guide](./SECURITY.md) |
| 3 | **Config** | `@missionfabric-js/enzyme/config` | Configuration management, validation, environment detection | [Configuration](./CONFIGURATION.md) |
| 4 | **Contexts** | `@missionfabric-js/enzyme/contexts` | React context providers and consumers | [Components Ref](./COMPONENTS_REFERENCE.md) |
| 5 | **Coordination** | `@missionfabric-js/enzyme/coordination` | Cross-module coordination, event bus, dependency injection | [Architecture](./ARCHITECTURE.md) |
| 6 | **Core** | `@missionfabric-js/enzyme/core` | Core configuration system, runtime config | [Configuration](./CONFIGURATION.md) |
| 7 | **Data** | `@missionfabric-js/enzyme/data` | Data validation, normalization, synchronization, integrity | [API Guide](./API.md) |
| 8 | **Feature** | `@missionfabric-js/enzyme/feature` | Feature module system, registry, auto-registration | [Features Guide](./FEATURES.md) |
| 9 | **Flags** | `@missionfabric-js/enzyme/flags` | Feature flags, A/B testing, progressive rollouts | [Configuration](./CONFIGURATION.md#feature-flags) |
| 10 | **Hooks** | `@missionfabric-js/enzyme/hooks` | Custom React hooks for common patterns | [Hooks Guide](./hooks/README.md) • [Quick Ref](./hooks/QUICK_REFERENCE.md) |
| 11 | **Hydration** | `@missionfabric-js/enzyme/hydration` | Auto-prioritized hydration, selective hydration | [Hydration Guide](./HYDRATION.md) |
| 12 | **Layouts** | `@missionfabric-js/enzyme/layouts` | Adaptive layouts, context-aware components | [Layouts Guide](./layouts/README.md) |
| 13 | **Monitoring** | `@missionfabric-js/enzyme/monitoring` | Error tracking, logging, analytics, error boundaries | [Architecture](./ARCHITECTURE.md) |
| 14 | **Performance** | `@missionfabric-js/enzyme/performance` | Performance monitoring, Core Web Vitals, metrics | [Performance Guide](./PERFORMANCE.md) |
| 15 | **Queries** | `@missionfabric-js/enzyme/queries` | React Query utilities, query key factories | [API Guide](./API.md) |
| 16 | **Realtime** | `@missionfabric-js/enzyme/realtime` | WebSocket, SSE, real-time data synchronization | [Streaming Guide](./STREAMING.md) |
| 17 | **Routing** | `@missionfabric-js/enzyme/routing` | Type-safe routing, route guards, navigation | [Auto-Routes](./AUTO_ROUTES.md) |
| 18 | **Security** | `@missionfabric-js/enzyme/security` | CSP, CSRF protection, XSS prevention, secure storage | [Security Guide](./SECURITY.md) |
| 19 | **Services** | `@missionfabric-js/enzyme/services` | Service layer, HTTP client, request caching | [API Guide](./API.md) |
| 20 | **Shared** | `@missionfabric-js/enzyme/shared` | Event bus, storage, type utilities, validation | [Shared Guide](./shared/README.md) |
| 21 | **State** | `@missionfabric-js/enzyme/state` | Zustand-based state management, slices, persistence | [State Guide](./STATE.md) |
| 22 | **Streaming** | `@missionfabric-js/enzyme/streaming` | Progressive HTML streaming, chunked transfer | [Streaming Guide](./STREAMING.md) |
| 23 | **System** | `@missionfabric-js/enzyme/system` | Application lifecycle, system initialization | [Architecture](./ARCHITECTURE.md) |
| 24 | **Theme** | `@missionfabric-js/enzyme/theme` | Dark/light mode, design tokens, color palettes | [Design System](./DESIGN_SYSTEM.md) |
| 25 | **Types** | `@missionfabric-js/enzyme/types` | DOM extensions, browser API type definitions | [Types Guide](./types/README.md) |
| 26 | **UI** | `@missionfabric-js/enzyme/ui` | Component library (Button, Card, Modal, etc.) | [Components Ref](./COMPONENTS_REFERENCE.md) |
| 27 | **Utils** | `@missionfabric-js/enzyme/utils` | Type guards, utility functions, Result type | [API Documentation](./ENZYME_API_DOCUMENTATION.md) |
| 28 | **UX** | `@missionfabric-js/enzyme/ux` | Loading states, skeletons, optimistic UI, accessibility | [Components Ref](./COMPONENTS_REFERENCE.md) |
| 29 | **VDOM** | `@missionfabric-js/enzyme/vdom` | Virtual modular DOM system, module isolation | [VDOM Guide](./vdom/README.md) |

---

## Documentation by Category

### Getting Started & Learning

| Document | Type | Description | Time |
|----------|------|-------------|------|
| [README.md](./README.md) | Overview | Complete documentation hub with quick navigation | 10 min |
| [QUICKSTART.md](./QUICKSTART.md) | Tutorial | Get running in under 10 minutes | 10 min |
| [GETTING_STARTED.md](./GETTING_STARTED.md) | Tutorial | Comprehensive setup and first steps | 30 min |
| [FEATURES.md](./FEATURES.md) | Concepts | Feature-based architecture guide | 20 min |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Concepts | System architecture and design patterns | 30 min |

### API Reference

| Document | Coverage | Description |
|----------|----------|-------------|
| [ENZYME_API_DOCUMENTATION.md](./ENZYME_API_DOCUMENTATION.md) | Complete | All exports from main package with examples |
| [MODULE_API_DOCUMENTATION.md](./MODULE_API_DOCUMENTATION.md) | Modules | Individual module API references |
| [MODULES_API_DOCUMENTATION.md](./MODULES_API_DOCUMENTATION.md) | Modules | Alternative module API documentation |
| [SYSTEM_AND_TYPES_API_DOCUMENTATION.md](./SYSTEM_AND_TYPES_API_DOCUMENTATION.md) | System | System utilities and TypeScript types |
| [HOOKS_REFERENCE.md](./HOOKS_REFERENCE.md) | Hooks | All custom React hooks |
| [COMPONENTS_REFERENCE.md](./COMPONENTS_REFERENCE.md) | Components | UI component library reference |
| [CONFIG_REFERENCE.md](./CONFIG_REFERENCE.md) | Config | Complete configuration options |

### Development Guides

| Document | Focus | Description |
|----------|-------|-------------|
| [CONFIGURATION.md](./CONFIGURATION.md) | Setup | Configuration system and environment setup |
| [STATE.md](./STATE.md) | State | Zustand + React Query patterns |
| [AUTO_ROUTES.md](./AUTO_ROUTES.md) | Routing | File-system routing and navigation |
| [API.md](./API.md) | Data | HTTP client and data fetching patterns |
| [SECURITY.md](./SECURITY.md) | Security | Authentication, authorization, and security best practices |
| [PERFORMANCE.md](./PERFORMANCE.md) | Performance | Optimization strategies and monitoring |
| [TESTING.md](./TESTING.md) | Testing | Unit, integration, and E2E testing |
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | UI/UX | Design tokens, theming, and styling |
| [ENVIRONMENT.md](./ENVIRONMENT.md) | Setup | Environment variables and configuration |

### Advanced Topics

| Document | Topic | Description |
|----------|-------|-------------|
| [STREAMING.md](./STREAMING.md) | Rendering | Progressive HTML streaming and chunked transfer |
| [HYDRATION.md](./HYDRATION.md) | Rendering | Auto-prioritized hydration strategies |
| [VDOM.md](./VDOM.md) | Architecture | Virtual modular DOM and module isolation |
| [LAYOUTS.md](./LAYOUTS.md) | UI | Context-aware adaptive layouts |
| [MODULE_DOCUMENTATION.md](./MODULE_DOCUMENTATION.md) | Modules | Module system deep dive |

### Module Documentation

| Module | Guide | Description |
|--------|-------|-------------|
| [Hooks](./hooks/README.md) | [Quick Ref](./hooks/QUICK_REFERENCE.md) • [Migration](./hooks/MIGRATION_CHECKLIST.md) | Custom React hooks and utilities |
| [Shared](./shared/README.md) | Utilities | Event bus, storage, type utilities, validation |
| [Types](./types/README.md) | TypeScript | DOM extensions and browser API types |
| [VDOM](./vdom/README.md) | Architecture | Virtual modular DOM and module composition |
| [Layouts](./layouts/README.md) | UI | Adaptive and context-aware layouts |

### Support & Migration

| Document | Purpose | Description |
|----------|---------|-------------|
| [FAQ.md](./FAQ.md) | Support | Frequently asked questions |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Support | Common issues and solutions |
| [MIGRATION.md](./MIGRATION.md) | Migration | Migrate from Next.js, CRA, Vite, Gatsby |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Operations | Production deployment and hosting |
| [GLOSSARY.md](./GLOSSARY.md) | Reference | Terms and definitions |
| [NAVIGATION.md](./NAVIGATION.md) | Reference | Documentation navigation structure |

### Templates & Examples

| Document | Type | Description |
|----------|------|-------------|
| [MODULE_README_TEMPLATE.md](./MODULE_README_TEMPLATE.md) | Template | Template for creating module documentation |
| [integration/](./integration/) | Examples | Integration examples and code recipes |

---

## Alphabetical Function Index

Quick reference to find any function alphabetically:

### A

| Function | Module | Description |
|----------|--------|-------------|
| `addBreadcrumb` | monitoring | Add debugging breadcrumb |
| `apiClient` | api | Global API client instance |
| `autoRegisterFeatures` | feature | Auto-discover and register features |

### B

| Function | Module | Description |
|----------|--------|-------------|
| `buildPath` | routing | Build path from template and params |
| `buildPathWithQuery` | routing | Build path with query string |

### C

| Function | Module | Description |
|----------|--------|-------------|
| `canAccessRoute` | auth | Check if user can access route |
| `clearErrorContext` | monitoring | Clear error context |
| `clearFeatureRegistry` | feature | Clear all registered features |
| `clearPersistedStore` | state | Clear persisted state |
| `combineSlices` | state | Combine multiple state slices |
| `createAction` | state | Create state action |
| `createApiClient` | api | Create configured API client |
| `createAppStore` | state | Create main app store with all features |
| `createCachedFetcher` | services | Create cached fetch function |
| `createConflictResolver` | data | Create data conflict resolver |
| `createConsistencyMonitor` | data | Create data consistency monitor |
| `createFeaturePage` | feature | Create feature page component |
| `createIntegrityChecker` | data | Create data integrity checker |
| `createLazyFeaturePage` | feature | Create lazy-loaded feature page |
| `createMinimalStore` | state | Create minimal Zustand store |
| `createMockServer` | api | Create MSW mock server |
| `createOptimisticManager` | ux | Create optimistic update manager |
| `createQueryClient` | queries | Create React Query client |
| `createQueryKeyFactory` | queries | Create query key factory |
| `createRegistry` | routing | Create route registry |
| `createRouter` | routing | Create React Router instance |
| `createRuntimeConfig` | config | Create runtime configuration |
| `createSecureLocalStorage` | security | Create secure localStorage wrapper |
| `createSecureSessionStorage` | security | Create secure sessionStorage wrapper |
| `createSelector` | state | Create memoized selector |
| `createSimpleStore` | state | Create simple store without persistence |
| `createSlice` | state | Create state slice |
| `createSSEClient` | realtime | Create Server-Sent Events client |
| `createStreamCacheUpdater` | realtime | Create stream cache updater |
| `createSyncEngine` | data | Create data sync engine |
| `createWebSocketClient` | realtime | Create WebSocket client |

### D

| Function | Module | Description |
|----------|--------|-------------|
| `debounce` | shared | Debounce function calls |
| `deepMerge` | config | Deep merge configurations |
| `del` | api | HTTP DELETE request |
| `denormalize` | data | Denormalize data |
| `detectEnvironment` | config | Detect current environment |
| `disposeServiceLayer` | services | Dispose service layer |

### E

| Function | Module | Description |
|----------|--------|-------------|
| `err` | utils | Create error Result |
| `extractFeatureFlags` | feature | Extract feature flags from features |

### F

| Function | Module | Description |
|----------|--------|-------------|
| `flattenConfig` | config | Flatten configuration object |

### G

| Function | Module | Description |
|----------|--------|-------------|
| `generateFeatureFlagManifest` | feature | Generate feature flag manifest |
| `get` | api | HTTP GET request |
| `getAllFeatures` | feature | Get all registered features |
| `getCoordinationVersion` | coordination | Get coordination version |
| `getEnvVar` | config | Get environment variable |
| `getFeature` | feature | Get feature by ID |
| `getFeatureCount` | feature | Get feature count |
| `getFeatureIds` | feature | Get all feature IDs |
| `getFeatureNavItems` | feature | Get feature navigation items |
| `getFeatureRoutes` | feature | Get feature routes |
| `getFeatureStore` | state | Get feature-scoped store |
| `getFeatureStoreNames` | state | Get all feature store names |
| `getGlobalContainer` | coordination | Get global DI container |
| `getGlobalProviderTree` | coordination | Get provider tree |
| `getRuntimeConfig` | config | Get runtime configuration |
| `getRouteAuthConfig` | auth | Get route authentication config |
| `getServiceLayerStatus` | services | Get service layer status |
| `getStoreState` | state | Get current store state |
| `getStructuredErrorMessage` | monitoring | Get structured error message |
| `getSystemStatus` | system | Get system status |
| `getToastMessage` | monitoring | Get toast error message |
| `getToastNotification` | monitoring | Get toast notification |
| `getVitalsCollector` | performance | Get Core Web Vitals collector |

### H

| Function | Module | Description |
|----------|--------|-------------|
| `hasStoreHydrated` | state | Check if store has hydrated |
| `httpClient` | services | Global HTTP client |

### I

| Function | Module | Description |
|----------|--------|-------------|
| `initCoordination` | coordination | Initialize coordination system |
| `initErrorReporter` | monitoring | Initialize error reporter |
| `initializeFeatureRegistry` | feature | Initialize feature registry |
| `initializeFeatures` | feature | Initialize all features |
| `initializeLibraries` | coordination | Initialize libraries |
| `initializeServiceLayer` | services | Initialize service layer |
| `initializeSystem` | system | Initialize application system |
| `initPerformanceMonitoring` | performance | Initialize performance monitoring |
| `initRuntimeConfig` | config | Initialize runtime config |
| `invokeAnyCapability` | coordination | Invoke any feature capability |
| `invokeCapability` | coordination | Invoke feature capability |
| `isArray` | utils | Check if value is array |
| `isBoolean` | utils | Check if value is boolean |
| `isBrowser` | config | Check if running in browser |
| `isDefined` | utils | Check if value is defined |
| `isDevelopment` | config | Check if development environment |
| `isErr` | utils | Check if Result is error |
| `isFeatureRegistered` | feature | Check if feature is registered |
| `isFeatureRegistryInitialized` | feature | Check if registry is initialized |
| `isFunction` | utils | Check if value is function |
| `isNumber` | utils | Check if value is number |
| `isObject` | utils | Check if value is object |
| `isOk` | utils | Check if Result is ok |
| `isProduction` | config | Check if production environment |
| `isPromise` | utils | Check if value is promise |
| `isServer` | config | Check if running on server |
| `isStaging` | config | Check if staging environment |
| `isString` | utils | Check if value is string |
| `isTest` | config | Check if test environment |

### J

| Function | Module | Description |
|----------|--------|-------------|
| `joinPath` | routing | Join path segments |

### L

| Function | Module | Description |
|----------|--------|-------------|
| `loadConfig` | config | Load configuration |

### M

| Function | Module | Description |
|----------|--------|-------------|
| `matchPathPattern` | routing | Match path against pattern |
| `mockData` | api | Mock data utilities |
| `mockHandlers` | api | MSW request handlers |
| `mockServer` | api | MSW mock server instance |

### N

| Function | Module | Description |
|----------|--------|-------------|
| `normalize` | data | Normalize data |
| `normalizeError` | api | Normalize API error |
| `normalizePath` | routing | Normalize URL path |

### O

| Function | Module | Description |
|----------|--------|-------------|
| `ok` | utils | Create success Result |

### P

| Function | Module | Description |
|----------|--------|-------------|
| `parseQuery` | routing | Parse query string |
| `parseResponse` | api | Parse API response |
| `patch` | api | HTTP PATCH request |
| `post` | api | HTTP POST request |
| `publishEvent` | coordination | Publish coordination event |
| `put` | api | HTTP PUT request |

### R

| Function | Module | Description |
|----------|--------|-------------|
| `registerFeature` | feature | Register feature module |
| `registerFeatureStore` | state | Register feature-scoped store |
| `registerFeaturesSync` | feature | Register features synchronously |
| `registerLibrary` | coordination | Register library |
| `registerProvider` | coordination | Register provider |
| `registerService` | coordination | Register service |
| `registerStateSlice` | coordination | Register state slice |
| `reportError` | monitoring | Report error |
| `reportInfo` | monitoring | Report info message |
| `reportWarning` | monitoring | Report warning |
| `requestCache` | services | Request cache instance |
| `requireEnvVar` | config | Require environment variable |
| `resetAllFeatureStores` | state | Reset all feature stores |
| `resetContextBridgeManager` | coordination | Reset context bridge |
| `resetCoordinationEventBus` | coordination | Reset event bus |
| `resetFeatureRegistry` | feature | Reset feature registry |
| `resetGlobalContainer` | coordination | Reset DI container |
| `resetLifecycleManager` | coordination | Reset lifecycle manager |
| `resetProviderOrchestrator` | coordination | Reset provider orchestrator |
| `resetStateCoordinator` | coordination | Reset state coordinator |
| `resetStore` | state | Reset state store |
| `resolveService` | coordination | Resolve service from container |

### S

| Function | Module | Description |
|----------|--------|-------------|
| `sanitizeHTML` | security | Sanitize HTML to prevent XSS |
| `serviceLayer` | services | Service layer instance |
| `setErrorContext` | monitoring | Set error context |
| `setGlobalContainer` | coordination | Set global DI container |
| `setUserContext` | monitoring | Set user context for errors |
| `shallowMerge` | config | Shallow merge configurations |
| `shutdownLibraries` | coordination | Shutdown libraries |
| `shutdownSystem` | system | Shutdown system |
| `splitPath` | routing | Split path into segments |
| `startPerformanceMonitoring` | performance | Start performance monitoring |
| `subscribeToEvent` | coordination | Subscribe to event |
| `subscribeToStore` | state | Subscribe to store changes |
| `systemManager` | system | System manager instance |

### T

| Function | Module | Description |
|----------|--------|-------------|
| `throttle` | shared | Throttle function calls |
| `tryResolveService` | coordination | Try to resolve service |

### U

| Function | Module | Description |
|----------|--------|-------------|
| `unflattenConfig` | config | Unflatten configuration |
| `unregisterFeature` | feature | Unregister feature |
| `unregisterFeatureStore` | state | Unregister feature store |

### V

| Function | Module | Description |
|----------|--------|-------------|
| `validateConfig` | config | Validate configuration |

### W

| Function | Module | Description |
|----------|--------|-------------|
| `waitForFeatureRegistry` | feature | Wait for registry initialization |
| `waitForHydration` | state | Wait for store hydration |
| `withCache` | services | Add caching to function |
| `withCoordination` | coordination | HOC for coordination |
| `withErrorBoundary` | monitoring | HOC for error boundary |
| `withHierarchicalErrorBoundary` | monitoring | HOC for hierarchical error boundary |

---

## Alphabetical Hook Index

All custom React hooks organized alphabetically:

### A-D

| Hook | Module | Description |
|------|--------|-------------|
| `useAbortController` | hooks | Create and manage AbortController |
| `useActiveDirectory` | auth | Active Directory integration |
| `useAdaptiveLayout` | layouts | Adaptive layout configuration |
| `useApiCache` | api | API response caching |
| `useApiClient` | api | API client instance |
| `useApiHealth` | api | API health check |
| `useApiMutation` | api | API mutation |
| `useApiRequest` | api | API request with loading/error states |
| `useAsyncWithRecovery` | hooks | Async operation with error recovery |
| `useAuth` | auth | Authentication state and actions |
| `useAuthContext` | auth | Auth context |
| `useBatchQueryUpdates` | queries | Batch query updates |
| `useBridgedContext` | coordination | Bridged context |
| `useBridgeManager` | coordination | Context bridge manager |
| `useBufferedRealtimeStream` | realtime | Buffered real-time stream |
| `useComposedHooks` | coordination | Compose multiple hooks |
| `useConditionalHook` | coordination | Conditional hook execution |
| `useConfig` | config | Configuration value |
| `useConfigContext` | config | Config context |
| `useConfigValue` | config | Specific config value |
| `useContainerQuery` | layouts | Container query |
| `useCoordination` | coordination | Coordination context |
| `useCoordinationEvent` | coordination | Subscribe to coordination event |
| `useCoordinationPublish` | coordination | Publish coordination event |
| `useCoordinationService` | coordination | Resolve coordination service |
| `useCSRFToken` | security | CSRF token |
| `useDataIntegrity` | data | Data integrity checking |
| `useDataSync` | data | Data synchronization |
| `useDataValidation` | data | Data validation |
| `useDebouncedCallback` | hooks | Debounced callback |
| `useDebouncedValue` | hooks | Debounced value |
| `useDisposable` | hooks | Resource cleanup |

### E-I

| Hook | Module | Description |
|------|--------|-------------|
| `useEnvironment` | config | Current environment |
| `useErrorBoundary` | monitoring | Error boundary state |
| `useErrorToast` | hooks | Error toast notifications |
| `useFeatureFlag` | flags | Feature flag value |
| `useFeatureFlags` | flags | All feature flags |
| `useFeatureVisibility` | feature | Feature visibility |
| `useFocusTrap` | ux | Focus trap for modals |
| `useFormValidation` | data | Form validation |
| `useGlobalStore` | hooks | Global store state |
| `useGlobalStoreActions` | hooks | Global store actions |
| `useHasPermission` | auth | Check permission |
| `useHasRole` | auth | Check role |
| `useHookSequence` | coordination | Hook sequence |
| `useHydration` | hydration | Hydration state |
| `useHydrationMetrics` | hydration | Hydration metrics |
| `useHydrationStatus` | hydration | Hydration status |
| `useInterval` | hooks | Set interval |
| `useInvalidateQueries` | queries | Invalidate queries |
| `useIsCoordinationReady` | coordination | Check coordination ready |
| `useIsDevelopment` | config | Check if development |
| `useIsProduction` | config | Check if production |
| `useIsSSR` | streaming | Check if server-side rendering |

### L-P

| Hook | Module | Description |
|------|--------|-------------|
| `useLibraryState` | coordination | Library state |
| `useLoading` | ux | Loading state |
| `useLoadingState` | ux | Loading state management |
| `useLongTaskDetector` | performance | Detect long tasks |
| `useMemoizedComposition` | coordination | Memoized hook composition |
| `useMemoryPressure` | performance | Memory pressure detection |
| `useModule` | vdom | Virtual module |
| `useModuleEmit` | vdom | Emit module event |
| `useModuleHierarchy` | vdom | Module hierarchy |
| `useModuleState` | vdom | Module state |
| `useMounted` | hooks | Check if component mounted |
| `useMultiContextSelector` | coordination | Multi-context selector |
| `useMultiRealtimeStream` | realtime | Multiple real-time streams |
| `useNetworkQuality` | hooks | Network quality |
| `useNetworkStatus` | hooks | Network status |
| `useNormalizedData` | data | Normalized data |
| `useOnlineStatus` | hooks | Online/offline status |
| `useOptimisticSync` | data | Optimistic sync |
| `useOptimisticUpdate` | queries | Optimistic update |
| `useOptionalCoordination` | coordination | Optional coordination |
| `usePageView` | hooks | Track page view |
| `useParallelHooks` | coordination | Run hooks in parallel |
| `usePerformanceBudget` | performance | Performance budget |
| `usePerformanceObservatory` | performance | Performance observatory |
| `usePermissionGate` | auth | Permission gate |
| `usePermissions` | auth | User permissions |
| `usePrefetch` | queries | Prefetch query |
| `usePrefetchOnHover` | hooks | Prefetch on hover |
| `usePrefetchRoute` | hooks | Prefetch route |

### Q-Z

| Hook | Module | Description |
|------|--------|-------------|
| `useQueryParam` | routing | Single query parameter |
| `useQueryParams` | routing | Query parameters |
| `useQueryState` | queries | Query state |
| `useRBAC` | auth | RBAC state |
| `useRealtimeConnection` | realtime | Real-time connection |
| `useRealtimeContext` | realtime | Real-time context |
| `useRealtimePresence` | realtime | Real-time presence |
| `useRealtimeStream` | realtime | Real-time stream |
| `useRenderMetrics` | performance | Render metrics |
| `useResourceAccess` | auth | Resource access check |
| `useRoleGate` | auth | Role gate |
| `useRoles` | auth | User roles |
| `useRouteInfo` | routing | Route information |
| `useRouteNavigate` | routing | Route navigation |
| `useSafeCallback` | hooks | Safe callback |
| `useSafeState` | hooks | Safe state |
| `useSecureStorage` | security | Secure storage |
| `useSelectiveHooks` | coordination | Selective hook execution |
| `useService` | coordination | Resolve service |
| `useStore` | state | Zustand store |
| `useStoreHydrated` | hooks | Store hydration state |
| `useStreamContext` | streaming | Stream context |
| `useStreamEvents` | streaming | Stream events |
| `useStreamingAvailable` | streaming | Check streaming availability |
| `useStreamMetrics` | streaming | Stream metrics |
| `useSystemThemePreference` | hooks | System theme preference |
| `useTabParam` | routing | Tab parameter |
| `useTheme` | hooks/theme | Theme state and actions |
| `useThemeContext` | theme | Theme context |
| `useThrottledValue` | hooks | Throttled value |
| `useTimeout` | hooks | Set timeout |
| `useTrackEvent` | hooks | Track event |
| `useTrackFeature` | hooks | Track feature usage |
| `useTryService` | coordination | Try to resolve service |
| `useViewportPosition` | layouts | Viewport position |

---

## Alphabetical Component Index

All React components organized alphabetically:

### A-C

| Component | Module | Description |
|-----------|--------|-------------|
| `ADProvider` | auth | Active Directory provider |
| `AdaptiveGrid` | layouts | Adaptive grid layout |
| `AdaptiveLayout` | layouts | Adaptive layout component |
| `ApiClientContext` | contexts | API client context |
| `AppLink` | routing | Type-safe navigation link |
| `AppNavLink` | routing | Type-safe nav link with active state |
| `AuthContext` | contexts | Auth context |
| `AuthProvider` | auth | Authentication provider |
| `BridgeConsumer` | coordination | Context bridge consumer |
| `BridgeSource` | coordination | Context bridge source |
| `Button` | ui | Button component |
| `Card` | ui | Card component |
| `ComponentErrorBoundary` | monitoring | Component-level error boundary |
| `ConditionalStreamBoundary` | streaming | Conditional stream boundary |
| `ConfigContext` | contexts | Config context |
| `ConfigProvider` | config | Configuration provider |
| `ContainerContext` | contexts | Container context |
| `ContextAwareBox` | layouts | Context-aware box |
| `ContextBridgeProvider` | coordination | Context bridge provider |
| `CoordinationProvider` | coordination | Coordination provider |
| `CriticalErrorBoundary` | monitoring | Critical error boundary |
| `CriticalStreamBoundary` | streaming | Critical stream boundary |
| `CSPManager` | security | Content Security Policy manager |
| `CSRFProtection` | security | CSRF protection component |

### D-H

| Component | Module | Description |
|-----------|--------|-------------|
| `DefaultErrorFallback` | coordination | Default error fallback |
| `DefaultLoadingFallback` | coordination | Default loading fallback |
| `DeferredStreamBoundary` | streaming | Deferred stream boundary |
| `DIContext` | contexts | Dependency injection context |
| `DOMContextProvider` | layouts | DOM context provider |
| `ErrorBoundary` | monitoring | Error boundary |
| `ErrorBoundaryContext` | contexts | Error boundary context |
| `FeatureErrorBoundary` | monitoring | Feature-level error boundary |
| `FeatureFlagContext` | contexts | Feature flag context |
| `FeatureFlagProvider` | flags | Feature flag provider |
| `FlagGate` | flags | Feature flag gate |
| `FlagGateAll` | flags | All flags gate |
| `FlagGateAny` | flags | Any flags gate |
| `Form` | ui | Form component |
| `GlobalErrorBoundary` | monitoring | Global error boundary |
| `HierarchicalErrorBoundary` | monitoring | Hierarchical error boundary |
| `HydrationBoundary` | hydration | Hydration boundary |
| `HydrationContext` | contexts | Hydration context |
| `HydrationProvider` | hydration | Hydration provider |

### I-M

| Component | Module | Description |
|-----------|--------|-------------|
| `Input` | ui | Input component |
| `LoadingContext` | contexts | Loading context |
| `LoadingIndicator` | ux | Loading indicator |
| `LoadingProvider` | ux | Loading provider |
| `Modal` | ui | Modal dialog |
| `ModuleBoundary` | vdom | Module boundary |
| `ModuleBoundaryContext` | contexts | Module boundary context |
| `ModuleProvider` | vdom | Module provider |
| `ModuleSlot` | vdom | Module slot |
| `ModuleSystemContext` | contexts | Module system context |
| `MorphTransition` | layouts | Morph transition |

### O-R

| Component | Module | Description |
|-----------|--------|-------------|
| `OrchestratedProviders` | coordination | Orchestrated providers |
| `PerformanceObservatory` | performance | Performance monitoring dashboard |
| `PerformanceObservatoryContext` | contexts | Performance context |
| `PerformanceProvider` | performance | Performance provider |
| `RBACContext` | contexts | RBAC context |
| `RBACProvider` | auth | RBAC provider |
| `RealtimeContext` | contexts | Real-time context |
| `RealtimeProvider` | realtime | Real-time provider |
| `RequireAuth` | auth | Require authentication guard |
| `RequirePermission` | auth | Require permission guard |
| `RequireRole` | auth | Require role guard |

### S-Z

| Component | Module | Description |
|-----------|--------|-------------|
| `ScrollContainerContext` | contexts | Scroll container context |
| `SecurityContext` | contexts | Security context |
| `Select` | ui | Select dropdown |
| `StreamBoundary` | streaming | Stream boundary |
| `StreamContext` | contexts | Stream context |
| `StreamProvider` | streaming | Stream provider |
| `Table` | ui | Data table |
| `Tabs` | ui | Tab navigation |
| `ThemeContext` | contexts | Theme context |
| `ThemeProvider` | theme | Theme provider |
| `ToastContext` | contexts | Toast context |
| `WidgetErrorBoundary` | monitoring | Widget-level error boundary |

---

## Quick Reference by Task

### Authentication & Authorization

| Task | Module | Components/Hooks | Documentation |
|------|--------|------------------|---------------|
| Set up authentication | auth | `AuthProvider`, `useAuth` | [Security Guide](./SECURITY.md#authentication) |
| Protect routes | auth | `RequireAuth`, `RequireRole`, `RequirePermission` | [Security Guide](./SECURITY.md#route-guards) |
| Role-based access | auth | `RBACProvider`, `useRBAC`, `useHasRole` | [Security Guide](./SECURITY.md#rbac) |
| Active Directory SSO | auth | `ADProvider`, `useActiveDirectory` | [Security Guide](./SECURITY.md#active-directory) |
| Check permissions | auth | `useHasPermission`, `usePermissions` | [Security Guide](./SECURITY.md#permissions) |

### Routing & Navigation

| Task | Module | Components/Hooks | Documentation |
|------|--------|------------------|---------------|
| Set up routing | routing | `createRouter`, `RouterProvider` | [Auto-Routes](./AUTO_ROUTES.md#setup) |
| Navigate programmatically | routing | `useRouteNavigate` | [Auto-Routes](./AUTO_ROUTES.md#navigation) |
| Type-safe links | routing | `AppLink`, `AppNavLink` | [Auto-Routes](./AUTO_ROUTES.md#links) |
| Query parameters | routing | `useQueryParams`, `useQueryParam` | [Auto-Routes](./AUTO_ROUTES.md#query-params) |
| Route guards | routing, auth | `RequireAuth`, route metadata | [Security Guide](./SECURITY.md#route-guards) |
| Get route info | routing | `useRouteInfo` | [Auto-Routes](./AUTO_ROUTES.md#route-info) |

### State Management

| Task | Module | Components/Hooks | Documentation |
|------|--------|------------------|---------------|
| Create global store | state | `createAppStore`, `useStore` | [State Guide](./STATE.md#global-store) |
| Create feature store | state | `registerFeatureStore`, `getFeatureStore` | [State Guide](./STATE.md#feature-stores) |
| Create simple store | state | `createSimpleStore` | [State Guide](./STATE.md#simple-store) |
| Persist state | state | `createAppStore` (built-in) | [State Guide](./STATE.md#persistence) |
| Reset store | state | `resetStore`, `clearPersistedStore` | [State Guide](./STATE.md#reset) |
| Wait for hydration | state | `waitForHydration`, `hasStoreHydrated` | [State Guide](./STATE.md#hydration) |

### Data Fetching & APIs

| Task | Module | Components/Hooks | Documentation |
|------|--------|------------------|---------------|
| Create API client | api | `createApiClient`, `apiClient` | [API Guide](./API.md#client) |
| Fetch data | queries | `useQuery` (React Query) | [API Guide](./API.md#fetching) |
| Mutate data | queries | `useMutation` (React Query) | [API Guide](./API.md#mutations) |
| Prefetch queries | queries | `usePrefetch`, `useInvalidateQueries` | [API Guide](./API.md#prefetching) |
| Optimistic updates | queries | `useOptimisticUpdate` | [API Guide](./API.md#optimistic) |
| Query keys | queries | `queryKeys`, `createQueryKeyFactory` | [API Guide](./API.md#query-keys) |
| Validate data | data | `useDataValidation`, `v`, `is`, `rules` | [API Guide](./API.md#validation) |
| Normalize data | data | `normalize`, `denormalize`, `schema` | [API Guide](./API.md#normalization) |

### Performance Monitoring

| Task | Module | Components/Hooks | Documentation |
|------|--------|------------------|---------------|
| Monitor Core Web Vitals | performance | `PerformanceObservatory`, `usePerformanceObservatory` | [Performance](./PERFORMANCE.md#web-vitals) |
| Initialize monitoring | performance | `initPerformanceMonitoring` | [Performance](./PERFORMANCE.md#setup) |
| Track render metrics | performance | `useRenderMetrics` | [Performance](./PERFORMANCE.md#renders) |
| Set performance budget | performance | `usePerformanceBudget` | [Performance](./PERFORMANCE.md#budgets) |
| Detect long tasks | performance | `useLongTaskDetector` | [Performance](./PERFORMANCE.md#long-tasks) |
| Monitor memory | performance | `useMemoryPressure` | [Performance](./PERFORMANCE.md#memory) |

### Feature Flags

| Task | Module | Components/Hooks | Documentation |
|------|--------|------------------|---------------|
| Set up feature flags | flags | `FeatureFlagProvider` | [Configuration](./CONFIGURATION.md#feature-flags) |
| Use feature flag | flags | `useFeatureFlag`, `useFeatureFlags` | [Configuration](./CONFIGURATION.md#using-flags) |
| Conditional rendering | flags | `FlagGate`, `FlagGateAll`, `FlagGateAny` | [Configuration](./CONFIGURATION.md#flag-gates) |
| Feature visibility | feature | `useFeatureVisibility` | [Features](./FEATURES.md#visibility) |

### Real-time Features

| Task | Module | Components/Hooks | Documentation |
|------|--------|------------------|---------------|
| Set up real-time | realtime | `RealtimeProvider` | [Streaming](./STREAMING.md#realtime) |
| WebSocket connection | realtime | `createWebSocketClient`, `useRealtimeStream` | [Streaming](./STREAMING.md#websocket) |
| Server-Sent Events | realtime | `createSSEClient`, `useRealtimeStream` | [Streaming](./STREAMING.md#sse) |
| Real-time presence | realtime | `useRealtimePresence` | [Streaming](./STREAMING.md#presence) |
| Stream caching | realtime | `createStreamCacheUpdater` | [Streaming](./STREAMING.md#caching) |

### Error Handling

| Task | Module | Components/Hooks | Documentation |
|------|--------|------------------|---------------|
| Error boundaries | monitoring | `ErrorBoundary`, `GlobalErrorBoundary` | [Architecture](./ARCHITECTURE.md#errors) |
| Hierarchical errors | monitoring | `HierarchicalErrorBoundary` | [Architecture](./ARCHITECTURE.md#hierarchical-errors) |
| Report errors | monitoring | `reportError`, `reportWarning` | [Architecture](./ARCHITECTURE.md#error-reporting) |
| Error context | monitoring | `setErrorContext`, `setUserContext` | [Architecture](./ARCHITECTURE.md#context) |
| Error recovery | hooks | `useAsyncWithRecovery` | [Hooks Reference](./HOOKS_REFERENCE.md#recovery) |

### UI & Theming

| Task | Module | Components/Hooks | Documentation |
|------|--------|------------------|---------------|
| Set up theming | theme | `ThemeProvider`, `useTheme` | [Design System](./DESIGN_SYSTEM.md#theming) |
| Use UI components | ui | `Button`, `Card`, `Modal`, `Table`, etc. | [Components Ref](./COMPONENTS_REFERENCE.md) |
| Loading states | ux | `LoadingProvider`, `LoadingIndicator`, `useLoading` | [Components Ref](./COMPONENTS_REFERENCE.md#loading) |
| Adaptive layouts | layouts | `AdaptiveLayout`, `useAdaptiveLayout` | [Layouts Guide](./LAYOUTS.md) |

### Advanced Features

| Task | Module | Components/Hooks | Documentation |
|------|--------|------------------|---------------|
| Progressive hydration | hydration | `HydrationProvider`, `useHydration` | [Hydration](./HYDRATION.md) |
| HTML streaming | streaming | `StreamProvider`, `StreamBoundary` | [Streaming](./STREAMING.md) |
| Virtual modules | vdom | `ModuleProvider`, `ModuleBoundary`, `useModule` | [VDOM](./VDOM.md) |
| Cross-module coordination | coordination | `CoordinationProvider`, `useCoordination` | [Architecture](./ARCHITECTURE.md#coordination) |

---

## Module Dependencies

Understanding which modules depend on which:

### Core Dependencies (No Dependencies)

- **shared** - Pure utilities
- **utils** - Type guards and helpers
- **contexts** - React contexts only

### Foundation Layer (Minimal Dependencies)

- **config** - Depends on: utils
- **system** - Depends on: config, utils
- **monitoring** - Depends on: contexts, utils

### Infrastructure Layer

- **state** - Depends on: shared, utils, monitoring
- **routing** - Depends on: utils, contexts
- **api** - Depends on: utils, monitoring
- **services** - Depends on: api, monitoring

### Feature Layer

- **auth** - Depends on: contexts, routing, state, api
- **flags** - Depends on: contexts, config
- **queries** - Depends on: api, monitoring
- **data** - Depends on: utils, monitoring

### UI Layer

- **theme** - Depends on: contexts, config
- **ui** - Depends on: theme, contexts
- **ux** - Depends on: ui, contexts, monitoring

### Advanced Features

- **performance** - Depends on: monitoring, utils
- **hydration** - Depends on: contexts, performance
- **streaming** - Depends on: contexts, performance
- **vdom** - Depends on: contexts, monitoring
- **layouts** - Depends on: contexts, ui
- **realtime** - Depends on: contexts, api, queries

### Integration Layer

- **core** - Depends on: config, system
- **feature** - Depends on: routing, flags, contexts
- **coordination** - Depends on: contexts, utils, monitoring
- **security** - Depends on: contexts, utils
- **hooks** - Depends on: state, theme, monitoring, routing

---

## Documentation Maintenance

### When Adding New Documentation

1. Add entry to this INDEX.md in appropriate sections
2. Update [NAVIGATION.md](./NAVIGATION.md) with navigation structure
3. Update [README.md](./README.md) quick links if applicable
4. Add cross-references in related documentation
5. Update [GLOSSARY.md](./GLOSSARY.md) with new terms

### When Adding New Modules

1. Add to Complete Module Index table
2. Add exports to Alphabetical Function/Hook/Component Index
3. Update Module Dependencies section
4. Create or update module-specific documentation
5. Update API reference documents

### When Deprecating Features

1. Mark as deprecated in all relevant indexes
2. Add migration notes in [MIGRATION.md](./MIGRATION.md)
3. Update code examples to use new patterns
4. Add deprecation warnings in API documentation

---

<div align="center">

**Master Documentation Index for @missionfabric-js/enzyme**

[Documentation Hub](./README.md) • [Quick Start](./QUICKSTART.md) • [API Reference](./ENZYME_API_DOCUMENTATION.md) • [Support](./FAQ.md)

*Built with care by the HarborGrid Team*

</div>
