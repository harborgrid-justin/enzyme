# Hooks Quick Reference

Complete reference for all React hooks in @missionfabric-js/enzyme.

## Table of Contents

- [Authentication](#authentication)
- [API & Data Fetching](#api--data-fetching)
- [State Management](#state-management)
- [Feature Flags](#feature-flags)
- [Configuration](#configuration)
- [Routing & Navigation](#routing--navigation)
- [Performance](#performance)
- [Real-time & Streaming](#real-time--streaming)
- [Data Validation & Sync](#data-validation--sync)
- [Error Handling](#error-handling)
- [UI & Layout](#ui--layout)
- [Resource Cleanup](#resource-cleanup)
- [Network](#network)
- [Analytics](#analytics)
- [Coordination](#coordination)
- [Hydration](#hydration)
- [Theme](#theme)
- [Security](#security)
- [Utilities](#utilities)

---

## Authentication

### `useAuth`
```typescript
function useAuth(): {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
}
```
**Module:** `/auth`
**Description:** Main authentication hook with login/logout functionality
**Use Case:** User authentication, session management

### `useAuthContext`
```typescript
function useAuthContext(): AuthContextValue
```
**Module:** `/auth`
**Description:** Access authentication context directly
**Use Case:** Low-level auth state access

### `useHasRole`
```typescript
function useHasRole(role: string | string[]): boolean
```
**Module:** `/auth`
**Description:** Check if user has specific role(s)
**Use Case:** Role-based UI rendering

### `useHasPermission`
```typescript
function useHasPermission(permission: string): boolean
```
**Module:** `/auth`
**Description:** Check if user has specific permission
**Use Case:** Permission-based feature access

### `useActiveDirectory`
```typescript
function useActiveDirectory(): ADContextValue
```
**Module:** `/auth`
**Description:** Active Directory integration hook
**Use Case:** Enterprise AD authentication

### `useRBAC`
```typescript
function useRBAC(): {
  can: (action: string, resource: string) => boolean;
  canAny: (permissions: string[]) => boolean;
  hasRole: (role: string) => boolean;
}
```
**Module:** `/auth`
**Description:** Role-Based Access Control operations
**Use Case:** Fine-grained access control

### `usePermissions`
```typescript
function usePermissions(): Permission[]
```
**Module:** `/auth`
**Description:** Get all user permissions
**Use Case:** Permission listing, UI customization

### `useRoles`
```typescript
function useRoles(): Role[]
```
**Module:** `/auth`
**Description:** Get all user roles
**Use Case:** Role listing, conditional rendering

### `useResourceAccess`
```typescript
function useResourceAccess(resourceId: string): {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
}
```
**Module:** `/auth`
**Description:** Check access permissions for specific resource
**Use Case:** Resource-level authorization

### `usePermissionGate`
```typescript
function usePermissionGate(permission: string): {
  isAllowed: boolean;
  isLoading: boolean;
}
```
**Module:** `/auth`
**Description:** Permission gate with loading state
**Use Case:** Progressive permission checking

### `useRoleGate`
```typescript
function useRoleGate(role: string): {
  isAllowed: boolean;
  isLoading: boolean;
}
```
**Module:** `/auth`
**Description:** Role gate with loading state
**Use Case:** Progressive role checking

---

## API & Data Fetching

### `useApiRequest`
```typescript
function useApiRequest<TData>(options: UseApiRequestOptions): {
  data: TData | undefined;
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  refetch: () => void;
}
```
**Module:** `/api`
**Description:** Fetch data from API with React Query
**Use Case:** GET requests, data fetching

### `useApiMutation`
```typescript
function useApiMutation<TData, TVariables>(options: UseApiMutationOptions): {
  mutate: (variables: TVariables) => Promise<TData>;
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
}
```
**Module:** `/api`
**Description:** API mutations (POST, PUT, DELETE)
**Use Case:** Creating, updating, deleting data

### `useApiCache`
```typescript
function useApiCache(): {
  clear: () => void;
  invalidate: (key: string[]) => void;
  getStats: () => CacheStats;
}
```
**Module:** `/api`
**Description:** Manage API cache
**Use Case:** Cache invalidation, clearing

### `useApiHealth`
```typescript
function useApiHealth(config?: UseApiHealthConfig): {
  isHealthy: boolean;
  status: HealthStatus;
  lastCheck: Date;
}
```
**Module:** `/api`
**Description:** Monitor API health
**Use Case:** API availability monitoring

### `useApiClient`
```typescript
function useApiClient(): ApiClient
```
**Module:** `/api`
**Description:** Access API client instance
**Use Case:** Direct API client access

### `usePrefetch`
```typescript
function usePrefetch(): {
  prefetch: (queryKey: string[], fn: () => Promise<any>) => void;
}
```
**Module:** `/queries`
**Description:** Prefetch queries
**Use Case:** Optimistic data loading

### `useInvalidateQueries`
```typescript
function useInvalidateQueries(): {
  invalidate: (queryKey: string[]) => Promise<void>;
}
```
**Module:** `/queries`
**Description:** Invalidate React Query cache
**Use Case:** Cache invalidation

### `useQueryState`
```typescript
function useQueryState<TData>(queryKey: string[]): {
  data: TData | undefined;
  status: QueryStatus;
}
```
**Module:** `/queries`
**Description:** Access query state without subscribing
**Use Case:** Query state inspection

### `useOptimisticUpdate`
```typescript
function useOptimisticUpdate<TData>(): {
  update: (key: string[], updater: (old: TData) => TData) => void;
}
```
**Module:** `/queries`
**Description:** Optimistic updates for mutations
**Use Case:** Immediate UI updates

### `useBatchQueryUpdates`
```typescript
function useBatchQueryUpdates(): {
  batch: (updates: Array<() => void>) => void;
}
```
**Module:** `/queries`
**Description:** Batch multiple query updates
**Use Case:** Performance optimization

---

## State Management

### `useStore`
```typescript
function useStore<T>(selector?: (state: AppState) => T): T
```
**Module:** `/state`
**Description:** Access Zustand store with selector
**Use Case:** Global state management

### `useGlobalStore`
```typescript
function useGlobalStore<T>(selector: (state: GlobalState) => T): T
```
**Module:** `/hooks`
**Description:** Access global store slice
**Use Case:** Global app state

### `useGlobalStoreActions`
```typescript
function useGlobalStoreActions(): GlobalActions
```
**Module:** `/hooks`
**Description:** Access global store actions
**Use Case:** Dispatching global actions

### `useStoreHydrated`
```typescript
function useStoreHydrated(): boolean
```
**Module:** `/hooks`
**Description:** Check if store has hydrated from persistence
**Use Case:** Preventing flash of incorrect state

---

## Feature Flags

### `useFeatureFlag`
```typescript
function useFeatureFlag(key: FlagKey): boolean
```
**Module:** `/flags`
**Description:** Check if feature flag is enabled
**Use Case:** Conditional feature rendering

### `useFeatureFlags`
```typescript
function useFeatureFlags(keys: FlagKey[]): Record<FlagKey, boolean>
```
**Module:** `/flags`
**Description:** Check multiple feature flags
**Use Case:** Multiple flag checks

### `useFeatureVisibility`
```typescript
function useFeatureVisibility(featureId: string): {
  isVisible: boolean;
  isAccessible: boolean;
}
```
**Module:** `/feature`
**Description:** Check feature visibility and access
**Use Case:** Feature module visibility

---

## Configuration

### `useConfig`
```typescript
function useConfig<T = AppConfig>(): T
```
**Module:** `/config`
**Description:** Access full configuration
**Use Case:** Configuration access

### `useConfigValue`
```typescript
function useConfigValue<T>(key: string, defaultValue?: T): T
```
**Module:** `/config`
**Description:** Access single config value
**Use Case:** Specific config value

### `useConfigContext`
```typescript
function useConfigContext(): ConfigContextValue
```
**Module:** `/config`
**Description:** Access config context
**Use Case:** Low-level config access

### `useEnvironment`
```typescript
function useEnvironment(): Environment
```
**Module:** `/config`
**Description:** Get current environment
**Use Case:** Environment-specific logic

### `useIsDevelopment`
```typescript
function useIsDevelopment(): boolean
```
**Module:** `/config`
**Description:** Check if development environment
**Use Case:** Dev-only features

### `useIsProduction`
```typescript
function useIsProduction(): boolean
```
**Module:** `/config`
**Description:** Check if production environment
**Use Case:** Production-only features

---

## Routing & Navigation

### `useRouteNavigate`
```typescript
function useRouteNavigate(): {
  navigate: (to: string, options?: NavigateOptions) => void;
}
```
**Module:** `/routing`
**Description:** Type-safe navigation
**Use Case:** Programmatic navigation

### `useRouteInfo`
```typescript
function useRouteInfo(): {
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
}
```
**Module:** `/routing`
**Description:** Current route information
**Use Case:** Route inspection

### `useQueryParams`
```typescript
function useQueryParams(): URLSearchParams
```
**Module:** `/routing`
**Description:** Access query parameters
**Use Case:** Query param reading

### `useQueryParam`
```typescript
function useQueryParam(key: string): string | null
```
**Module:** `/routing`
**Description:** Access single query parameter
**Use Case:** Single query param

### `useTabParam`
```typescript
function useTabParam(): [string | null, (tab: string) => void]
```
**Module:** `/routing`
**Description:** Tab parameter state
**Use Case:** Tab navigation

### `usePrefetchRoute`
```typescript
function usePrefetchRoute(): {
  prefetch: (path: string) => void;
}
```
**Module:** `/hooks`
**Description:** Prefetch route data
**Use Case:** Route preloading

### `usePrefetchOnHover`
```typescript
function usePrefetchOnHover(path: string): {
  onMouseEnter: () => void;
}
```
**Module:** `/hooks`
**Description:** Prefetch on hover
**Use Case:** Link hover preloading

---

## Performance

### `usePerformanceObservatory`
```typescript
function usePerformanceObservatory(): {
  vitals: VitalsSnapshot;
  violations: BudgetViolation[];
}
```
**Module:** `/performance`
**Description:** Access performance metrics
**Use Case:** Performance monitoring

### `usePerformanceBudget`
```typescript
function usePerformanceBudget(): {
  isViolating: boolean;
  violations: BudgetViolation[];
}
```
**Module:** `/performance`
**Description:** Monitor performance budget
**Use Case:** Performance budget tracking

### `useRenderMetrics`
```typescript
function useRenderMetrics(componentName: string): void
```
**Module:** `/performance`
**Description:** Track component render metrics
**Use Case:** Render performance analysis

### `useLongTaskDetector`
```typescript
function useLongTaskDetector(threshold?: number): {
  longTasks: number;
  lastLongTask: number | null;
}
```
**Module:** `/performance`
**Description:** Detect long tasks
**Use Case:** Performance issue detection

### `useMemoryPressure`
```typescript
function useMemoryPressure(): {
  pressure: 'low' | 'medium' | 'high';
  usedMemory: number;
}
```
**Module:** `/performance`
**Description:** Monitor memory pressure
**Use Case:** Memory management

---

## Real-time & Streaming

### `useRealtimeStream`
```typescript
function useRealtimeStream<TData>(channel: string): {
  data: TData | null;
  isConnected: boolean;
  error: Error | null;
}
```
**Module:** `/realtime`
**Description:** Subscribe to realtime stream
**Use Case:** WebSocket/SSE subscriptions

### `useRealtimeConnection`
```typescript
function useRealtimeConnection(): {
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}
```
**Module:** `/realtime`
**Description:** Manage realtime connection
**Use Case:** Connection management

### `useRealtimeContext`
```typescript
function useRealtimeContext(): RealtimeContextValue
```
**Module:** `/realtime`
**Description:** Access realtime context
**Use Case:** Low-level realtime access

### `useMultiRealtimeStream`
```typescript
function useMultiRealtimeStream<TData>(channels: string[]): {
  data: Record<string, TData>;
  isConnected: boolean;
}
```
**Module:** `/realtime`
**Description:** Subscribe to multiple streams
**Use Case:** Multi-channel subscriptions

### `useBufferedRealtimeStream`
```typescript
function useBufferedRealtimeStream<TData>(channel: string, bufferSize: number): {
  buffer: TData[];
  flush: () => void;
}
```
**Module:** `/realtime`
**Description:** Buffered realtime stream
**Use Case:** Batched stream processing

### `useRealtimePresence`
```typescript
function useRealtimePresence(channel: string): {
  users: User[];
  join: () => void;
  leave: () => void;
}
```
**Module:** `/realtime`
**Description:** User presence tracking
**Use Case:** Collaborative features

### `useStreamContext`
```typescript
function useStreamContext(): StreamContextValue
```
**Module:** `/streaming`
**Description:** Access streaming context
**Use Case:** SSR streaming state

### `useStreamingAvailable`
```typescript
function useStreamingAvailable(): boolean
```
**Module:** `/streaming`
**Description:** Check if streaming is available
**Use Case:** Streaming capability detection

### `useIsSSR`
```typescript
function useIsSSR(): boolean
```
**Module:** `/streaming`
**Description:** Check if server-side rendering
**Use Case:** SSR/CSR conditional logic

### `useStreamMetrics`
```typescript
function useStreamMetrics(): {
  bytesReceived: number;
  chunksReceived: number;
}
```
**Module:** `/streaming`
**Description:** Streaming metrics
**Use Case:** Stream performance monitoring

### `useStreamEvents`
```typescript
function useStreamEvents(): {
  onChunk: (callback: (chunk: string) => void) => void;
}
```
**Module:** `/streaming`
**Description:** Stream event handlers
**Use Case:** Stream event handling

---

## Data Validation & Sync

### `useDataValidation`
```typescript
function useDataValidation<TData>(schema: Schema<TData>): {
  validate: (data: TData) => ValidationResult;
  errors: ValidationError[];
}
```
**Module:** `/data`
**Description:** Data validation with schema
**Use Case:** Form/data validation

### `useFormValidation`
```typescript
function useFormValidation<TForm>(config: FormValidator<TForm>): {
  errors: Record<keyof TForm, string>;
  validate: () => boolean;
  register: (field: keyof TForm) => RegisterOptions;
}
```
**Module:** `/data`
**Description:** Form validation
**Use Case:** Form handling

### `useDataSync`
```typescript
function useDataSync<TData>(options: UseDataSyncOptions): {
  data: TData;
  sync: () => Promise<void>;
  conflicts: SyncConflict[];
}
```
**Module:** `/data`
**Description:** Multi-source data synchronization
**Use Case:** Offline-first apps

### `useOptimisticSync`
```typescript
function useOptimisticSync<TData>(config: OptimisticSyncConfig): {
  data: TData;
  pending: PendingChange[];
  sync: () => Promise<void>;
}
```
**Module:** `/data`
**Description:** Optimistic data synchronization
**Use Case:** Optimistic updates

### `useDataIntegrity`
```typescript
function useDataIntegrity<TData>(checker: IntegrityChecker): {
  violations: IntegrityViolation[];
  check: () => void;
  repair: () => Promise<void>;
}
```
**Module:** `/data`
**Description:** Data integrity checking
**Use Case:** Data consistency

### `useNormalizedData`
```typescript
function useNormalizedData<TData>(schema: EntitySchema): {
  entities: NormalizedEntities;
  result: string[];
}
```
**Module:** `/data`
**Description:** Entity normalization
**Use Case:** Normalized state

---

## Error Handling

### `useErrorBoundary`
```typescript
function useErrorBoundary(): {
  error: Error | null;
  reset: () => void;
}
```
**Module:** `/monitoring`
**Description:** Access error boundary state
**Use Case:** Error handling

### `useAsyncWithRecovery`
```typescript
function useAsyncWithRecovery<TData>(fn: () => Promise<TData>): {
  data: TData | null;
  error: Error | null;
  retry: () => void;
}
```
**Module:** `/hooks`
**Description:** Async operations with automatic recovery
**Use Case:** Resilient async operations

### `useSafeCallback`
```typescript
function useSafeCallback<T extends (...args: any[]) => any>(callback: T): T
```
**Module:** `/hooks`
**Description:** Callback with error boundary
**Use Case:** Safe event handlers

### `useErrorToast`
```typescript
function useErrorToast(): {
  showError: (error: Error) => void;
}
```
**Module:** `/hooks`
**Description:** Error toast notifications
**Use Case:** User-friendly error display

---

## UI & Layout

### `useAdaptiveLayout`
```typescript
function useAdaptiveLayout(): {
  layout: 'mobile' | 'tablet' | 'desktop';
  breakpoint: number;
}
```
**Module:** `/layouts`
**Description:** Adaptive layout detection
**Use Case:** Responsive layouts

### `useContainerQuery`
```typescript
function useContainerQuery(element: HTMLElement): {
  width: number;
  height: number;
}
```
**Module:** `/layouts`
**Description:** Container query hook
**Use Case:** Container-based responsive design

### `useViewportPosition`
```typescript
function useViewportPosition(element: HTMLElement): {
  isVisible: boolean;
  position: { top: number; left: number };
}
```
**Module:** `/layouts`
**Description:** Element viewport position
**Use Case:** Scroll-based animations

### `useLoading`
```typescript
function useLoading(): {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
}
```
**Module:** `/ux`
**Description:** Loading state management
**Use Case:** Loading indicators

### `useLoadingState`
```typescript
function useLoadingState(key: string): boolean
```
**Module:** `/ux`
**Description:** Named loading state
**Use Case:** Multiple loading states

### `useFocusTrap`
```typescript
function useFocusTrap(enabled: boolean): {
  ref: RefObject<HTMLElement>;
}
```
**Module:** `/ux`
**Description:** Focus trap for accessibility
**Use Case:** Modal focus management

---

## Resource Cleanup

### `useDisposable`
```typescript
function useDisposable<T>(factory: () => T, dispose: (resource: T) => void): T
```
**Module:** `/hooks`
**Description:** Resource lifecycle management
**Use Case:** Resource cleanup

### `useAbortController`
```typescript
function useAbortController(): AbortController
```
**Module:** `/hooks`
**Description:** AbortController lifecycle
**Use Case:** Cancelling fetch requests

### `useTimeout`
```typescript
function useTimeout(callback: () => void, delay: number): void
```
**Module:** `/hooks`
**Description:** Timeout with cleanup
**Use Case:** Delayed operations

### `useInterval`
```typescript
function useInterval(callback: () => void, delay: number): void
```
**Module:** `/hooks`
**Description:** Interval with cleanup
**Use Case:** Periodic operations

### `useMounted`
```typescript
function useMounted(): boolean
```
**Module:** `/hooks`
**Description:** Component mounted state
**Use Case:** Preventing state updates after unmount

### `useSafeState`
```typescript
function useSafeState<T>(initial: T): [T, (value: T) => void]
```
**Module:** `/hooks`
**Description:** State with mounted check
**Use Case:** Safe state updates

---

## Network

### `useOnlineStatus`
```typescript
function useOnlineStatus(): boolean
```
**Module:** `/hooks`
**Description:** Online/offline status
**Use Case:** Network status detection

### `useNetworkStatus`
```typescript
function useNetworkStatus(): {
  isOnline: boolean;
  effectiveType: string;
  downlink: number;
}
```
**Module:** `/hooks`
**Description:** Detailed network information
**Use Case:** Network quality detection

### `useNetworkQuality`
```typescript
function useNetworkQuality(): {
  quality: 'slow' | 'medium' | 'fast';
  shouldPrefetch: boolean;
}
```
**Module:** `/hooks`
**Description:** Network quality assessment
**Use Case:** Adaptive loading strategies

---

## Analytics

### `usePageView`
```typescript
function usePageView(page: string): void
```
**Module:** `/hooks`
**Description:** Track page views
**Use Case:** Analytics page tracking

### `useTrackEvent`
```typescript
function useTrackEvent(): {
  track: (event: string, properties?: Record<string, any>) => void;
}
```
**Module:** `/hooks`
**Description:** Track custom events
**Use Case:** Event analytics

### `useTrackFeature`
```typescript
function useTrackFeature(featureId: string): void
```
**Module:** `/hooks`
**Description:** Track feature usage
**Use Case:** Feature analytics

---

## Coordination

### `useCoordination`
```typescript
function useCoordination(): CoordinationContextValue
```
**Module:** `/coordination`
**Description:** Access coordination system
**Use Case:** Cross-module coordination

### `useCoordinationEvent`
```typescript
function useCoordinationEvent(eventType: string, handler: EventHandler): void
```
**Module:** `/coordination`
**Description:** Subscribe to coordination events
**Use Case:** Event-driven architecture

### `useCoordinationPublish`
```typescript
function useCoordinationPublish(): {
  publish: (event: CoordinationEvent) => void;
}
```
**Module:** `/coordination`
**Description:** Publish coordination events
**Use Case:** Event publishing

### `useCoordinationService`
```typescript
function useCoordinationService<T>(contract: ServiceContract<T>): T
```
**Module:** `/coordination`
**Description:** Resolve DI service
**Use Case:** Dependency injection

### `useComposedHooks`
```typescript
function useComposedHooks<T>(hooks: HookDef[]): T
```
**Module:** `/coordination`
**Description:** Compose multiple hooks
**Use Case:** Hook composition

### `useBridgedContext`
```typescript
function useBridgedContext<T>(context: Context<T>): T
```
**Module:** `/coordination`
**Description:** Access bridged context
**Use Case:** Cross-boundary context

---

## Hydration

### `useHydration`
```typescript
function useHydration(): {
  isHydrated: boolean;
  priority: HydrationPriority;
}
```
**Module:** `/hydration`
**Description:** Hydration status
**Use Case:** Progressive hydration

### `useHydrationMetrics`
```typescript
function useHydrationMetrics(): {
  totalTime: number;
  componentCount: number;
}
```
**Module:** `/hydration`
**Description:** Hydration performance metrics
**Use Case:** Hydration monitoring

### `useHydrationStatus`
```typescript
function useHydrationStatus(componentId: string): boolean
```
**Module:** `/hydration`
**Description:** Component hydration status
**Use Case:** Component-level hydration

---

## Theme

### `useTheme`
```typescript
function useTheme(): UseThemeReturn
```
**Module:** `/hooks`
**Description:** Theme management
**Use Case:** Theme switching

### `useThemeContext`
```typescript
function useThemeContext(): ThemeContextValue
```
**Module:** `/theme`
**Description:** Access theme context
**Use Case:** Theme state access

### `useSystemThemePreference`
```typescript
function useSystemThemePreference(): 'light' | 'dark'
```
**Module:** `/hooks`
**Description:** System theme preference
**Use Case:** Auto theme detection

---

## Security

### `useCSRFToken`
```typescript
function useCSRFToken(): string | null
```
**Module:** `/security`
**Description:** Get CSRF token
**Use Case:** CSRF protection

### `useSecureStorage`
```typescript
function useSecureStorage(key: string): {
  value: string | null;
  set: (value: string) => void;
  remove: () => void;
}
```
**Module:** `/security`
**Description:** Encrypted storage
**Use Case:** Sensitive data storage

---

## Utilities

### `useDebouncedValue`
```typescript
function useDebouncedValue<T>(value: T, delay: number): T
```
**Module:** `/hooks`
**Description:** Debounced value
**Use Case:** Search inputs, API calls

### `useDebouncedCallback`
```typescript
function useDebouncedCallback<T extends (...args: any[]) => any>(callback: T, delay: number): T
```
**Module:** `/hooks`
**Description:** Debounced callback
**Use Case:** Event handlers

### `useThrottledValue`
```typescript
function useThrottledValue<T>(value: T, delay: number): T
```
**Module:** `/hooks`
**Description:** Throttled value
**Use Case:** Scroll handlers

### `useModule`
```typescript
function useModule(moduleId: string): any
```
**Module:** `/vdom`
**Description:** Access virtual DOM module
**Use Case:** Module system

### `useModuleState`
```typescript
function useModuleState<T>(moduleId: string): T
```
**Module:** `/vdom`
**Description:** Module state access
**Use Case:** Module state management

### `useModuleEmit`
```typescript
function useModuleEmit(moduleId: string): {
  emit: (event: string, data: any) => void;
}
```
**Module:** `/vdom`
**Description:** Emit module events
**Use Case:** Module communication

### `useModuleHierarchy`
```typescript
function useModuleHierarchy(): {
  parent: string | null;
  children: string[];
}
```
**Module:** `/vdom`
**Description:** Module hierarchy
**Use Case:** Module tree navigation

---

**Total Hooks:** 100+
**Last Updated:** 2025-11-29
**Version:** 1.0.5
