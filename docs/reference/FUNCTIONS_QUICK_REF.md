# Functions Quick Reference

Complete reference for all utility functions and services in @missionfabric-js/enzyme.

## Table of Contents

- [API Client](#api-client)
- [Authentication](#authentication)
- [Configuration](#configuration)
- [Data Validation](#data-validation)
- [Data Sync](#data-sync)
- [Data Normalization](#data-normalization)
- [Feature Management](#feature-management)
- [State Management](#state-management)
- [Routing](#routing)
- [Security](#security)
- [Performance](#performance)
- [Real-time](#real-time)
- [Error Handling](#error-handling)
- [Coordination](#coordination)
- [Type Guards](#type-guards)
- [Utilities](#utilities)

---

## API Client

### `apiClient`
```typescript
const apiClient: ApiClient
```
**Module:** `/api`
**Description:** Singleton API client instance
**Returns:** ApiClient
**Use Case:** Making HTTP requests

### `createApiClient`
```typescript
function createApiClient(config: ApiClientConfig): ApiClient
```
**Module:** `/api`
**Description:** Creates new API client instance
**Returns:** ApiClient
**Use Case:** Custom API client configuration

### `get`
```typescript
function get<T>(url: string): RequestBuilder<T>
```
**Module:** `/api`
**Description:** Creates GET request builder
**Returns:** RequestBuilder
**Use Case:** Building GET requests

### `post`
```typescript
function post<T>(url: string): RequestBuilder<T>
```
**Module:** `/api`
**Description:** Creates POST request builder
**Returns:** RequestBuilder
**Use Case:** Building POST requests

### `put`
```typescript
function put<T>(url: string): RequestBuilder<T>
```
**Module:** `/api`
**Description:** Creates PUT request builder
**Returns:** RequestBuilder
**Use Case:** Building PUT requests

### `patch`
```typescript
function patch<T>(url: string): RequestBuilder<T>
```
**Module:** `/api`
**Description:** Creates PATCH request builder
**Returns:** RequestBuilder
**Use Case:** Building PATCH requests

### `del`
```typescript
function del<T>(url: string): RequestBuilder<T>
```
**Module:** `/api`
**Description:** Creates DELETE request builder
**Returns:** RequestBuilder
**Use Case:** Building DELETE requests

### `parseResponse`
```typescript
function parseResponse<T>(response: Response): Promise<ApiResponse<T>>
```
**Module:** `/api`
**Description:** Parses HTTP response
**Returns:** Promise<ApiResponse>
**Use Case:** Response parsing

### `normalizeError`
```typescript
function normalizeError(error: unknown): ApiError
```
**Module:** `/api`
**Description:** Normalizes errors to ApiError
**Returns:** ApiError
**Use Case:** Error normalization

### `buildApiUrl`
```typescript
function buildApiUrl(endpoint: string, params?: PathParams): string
```
**Module:** `/api`
**Description:** Builds API URL from endpoint
**Returns:** string
**Use Case:** URL construction

### `buildApiUrlWithParams`
```typescript
function buildApiUrlWithParams(
  endpoint: string,
  pathParams?: PathParams,
  queryParams?: QueryParams
): string
```
**Module:** `/api`
**Description:** Builds URL with path and query params
**Returns:** string
**Use Case:** Complete URL building

### `createMockServer`
```typescript
function createMockServer(config?: MockServerConfig): MockServer
```
**Module:** `/api`
**Description:** Creates mock API server for development
**Returns:** MockServer
**Use Case:** API mocking

---

## Authentication

### `authService`
```typescript
const authService: AuthService
```
**Module:** `/auth`
**Description:** Authentication service singleton
**Returns:** AuthService
**Use Case:** Authentication operations

### `canAccessRoute`
```typescript
function canAccessRoute(
  route: string,
  user: User | null,
  config: RouteAuthConfig
): boolean
```
**Module:** `/auth`
**Description:** Checks if user can access route
**Returns:** boolean
**Use Case:** Route authorization

### `getRouteAuthConfig`
```typescript
function getRouteAuthConfig(route: string): RouteAuthConfig | undefined
```
**Module:** `/auth`
**Description:** Gets route authentication config
**Returns:** RouteAuthConfig | undefined
**Use Case:** Route config lookup

### `createADClient`
```typescript
function createADClient(config: ADConfig): ADClient
```
**Module:** `/auth`
**Description:** Creates Active Directory client
**Returns:** ADClient
**Use Case:** AD integration

### `createTokenHandler`
```typescript
function createTokenHandler(options: TokenHandlerOptions): ADTokenHandler
```
**Module:** `/auth`
**Description:** Creates AD token handler
**Returns:** ADTokenHandler
**Use Case:** Token management

### `createSSOManager`
```typescript
function createSSOManager(options: SSOManagerOptions): SSOManager
```
**Module:** `/auth`
**Description:** Creates SSO manager
**Returns:** SSOManager
**Use Case:** Single sign-on

### `createRBACEngine`
```typescript
function createRBACEngine(config: RBACConfig): RBACEngine
```
**Module:** `/auth`
**Description:** Creates RBAC authorization engine
**Returns:** RBACEngine
**Use Case:** Access control

### `createPermissionMatrixBuilder`
```typescript
function createPermissionMatrixBuilder(): PermissionMatrixBuilder
```
**Module:** `/auth`
**Description:** Creates permission matrix builder
**Returns:** PermissionMatrixBuilder
**Use Case:** Permission management

### `createPolicyEvaluator`
```typescript
function createPolicyEvaluator(policies: PolicySet): PolicyEvaluator
```
**Module:** `/auth`
**Description:** Creates policy evaluator
**Returns:** PolicyEvaluator
**Use Case:** Policy-based authorization

---

## Configuration

### `createConfigLoader`
```typescript
function createConfigLoader(options: ConfigLoaderOptions): ConfigLoader
```
**Module:** `/config`
**Description:** Creates configuration loader
**Returns:** ConfigLoader
**Use Case:** Multi-source config loading

### `loadConfig`
```typescript
function loadConfig(sources: ConfigSource[]): Promise<AppConfig>
```
**Module:** `/config`
**Description:** Loads configuration from sources
**Returns:** Promise<AppConfig>
**Use Case:** Configuration loading

### `validateConfig`
```typescript
function validateConfig(config: any, schema: ConfigSchema): ValidationResult
```
**Module:** `/config`
**Description:** Validates configuration against schema
**Returns:** ValidationResult
**Use Case:** Config validation

### `createSchema`
```typescript
function createSchema(): SchemaBuilder
```
**Module:** `/config`
**Description:** Creates configuration schema builder
**Returns:** SchemaBuilder
**Use Case:** Schema definition

### `deepMerge`
```typescript
function deepMerge<T>(...objects: Partial<T>[]): T
```
**Module:** `/config`
**Description:** Deep merges configuration objects
**Returns:** T
**Use Case:** Config merging

### `flattenConfig`
```typescript
function flattenConfig(config: ConfigRecord): Record<string, any>
```
**Module:** `/config`
**Description:** Flattens nested configuration
**Returns:** Record<string, any>
**Use Case:** Config flattening

### `unflattenConfig`
```typescript
function unflattenConfig(flat: Record<string, any>): ConfigRecord
```
**Module:** `/config`
**Description:** Unflattens configuration
**Returns:** ConfigRecord
**Use Case:** Config unflattening

### `detectEnvironment`
```typescript
function detectEnvironment(): Environment
```
**Module:** `/config`
**Description:** Detects current environment
**Returns:** Environment
**Use Case:** Environment detection

### `getEnvVar`
```typescript
function getEnvVar(key: string, defaultValue?: string): string | undefined
```
**Module:** `/config`
**Description:** Gets environment variable
**Returns:** string | undefined
**Use Case:** Environment variables

### `requireEnvVar`
```typescript
function requireEnvVar(key: string): string
```
**Module:** `/config`
**Description:** Requires environment variable (throws if missing)
**Returns:** string
**Use Case:** Required env vars

### `createRuntimeConfig`
```typescript
function createRuntimeConfig(initial: AppConfig): RuntimeConfig
```
**Module:** `/config`
**Description:** Creates runtime config manager
**Returns:** RuntimeConfig
**Use Case:** Runtime configuration

---

## Data Validation

### `v`
```typescript
const v: {
  string: () => StringSchema;
  number: () => NumberSchema;
  boolean: () => BooleanSchema;
  object: <T>(shape: T) => ObjectSchema<T>;
  array: <T>(schema: Schema<T>) => ArraySchema<T>;
  // ... more methods
}
```
**Module:** `/data`
**Description:** Validation schema builder (Zod-style)
**Returns:** Various schema types
**Use Case:** Data validation

### `is`
```typescript
const is: {
  string: (value: unknown) => value is string;
  number: (value: unknown) => value is number;
  boolean: (value: unknown) => value is boolean;
  // ... more type guards
}
```
**Module:** `/data`
**Description:** Runtime type checking utilities
**Returns:** Type guards
**Use Case:** Runtime type validation

### `rules`
```typescript
const rules: {
  required: (message?: string) => ValidationRule;
  email: (message?: string) => ValidationRule;
  min: (length: number, message?: string) => ValidationRule;
  max: (length: number, message?: string) => ValidationRule;
  // ... more rules
}
```
**Module:** `/data`
**Description:** Form validation rules
**Returns:** Validation rules
**Use Case:** Form validation

### `createFormValidator`
```typescript
function createFormValidator<T>(config: FormValidatorConfig<T>): FormValidator<T>
```
**Module:** `/data`
**Description:** Creates form validator
**Returns:** FormValidator
**Use Case:** Form handling

---

## Data Sync

### `createSyncEngine`
```typescript
function createSyncEngine(config: SyncEngineConfig): SyncEngine
```
**Module:** `/data`
**Description:** Creates data synchronization engine
**Returns:** SyncEngine
**Use Case:** Multi-source sync

### `createConflictResolver`
```typescript
function createConflictResolver(config: ConflictResolverConfig): ConflictResolver
```
**Module:** `/data`
**Description:** Creates conflict resolution handler
**Returns:** ConflictResolver
**Use Case:** Conflict resolution

---

## Data Normalization

### `normalize`
```typescript
function normalize<T>(data: T, schema: EntitySchema): NormalizationResult
```
**Module:** `/data`
**Description:** Normalizes entity data
**Returns:** NormalizationResult
**Use Case:** Entity normalization

### `denormalize`
```typescript
function denormalize<T>(
  result: any,
  schema: EntitySchema,
  entities: NormalizedEntities
): T
```
**Module:** `/data`
**Description:** Denormalizes entity data
**Returns:** T
**Use Case:** Entity denormalization

### `schema`
```typescript
const schema: {
  entity: (key: string, definition?: any) => EntitySchema;
  array: (schema: EntitySchema) => ArraySchema;
  // ... more methods
}
```
**Module:** `/data`
**Description:** Entity schema definitions
**Returns:** Entity schemas
**Use Case:** Schema definition

---

## Feature Management

### `registerFeature`
```typescript
function registerFeature(config: FeatureConfig): void
```
**Module:** `/feature`
**Description:** Registers a feature module
**Returns:** void
**Use Case:** Feature registration

### `getFeature`
```typescript
function getFeature(id: string): FeatureConfig | undefined
```
**Module:** `/feature`
**Description:** Gets registered feature by ID
**Returns:** FeatureConfig | undefined
**Use Case:** Feature lookup

### `getAllFeatures`
```typescript
function getAllFeatures(): FeatureConfig[]
```
**Module:** `/feature`
**Description:** Gets all registered features
**Returns:** FeatureConfig[]
**Use Case:** Feature enumeration

### `getFeatureRoutes`
```typescript
function getFeatureRoutes(): RouteConfig[]
```
**Module:** `/feature`
**Description:** Gets routes from all features
**Returns:** RouteConfig[]
**Use Case:** Route aggregation

### `createFeaturePage`
```typescript
function createFeaturePage<T>(options: CreateFeatureOptions<T>): FC<T>
```
**Module:** `/feature`
**Description:** Creates feature page component
**Returns:** React component
**Use Case:** Feature page creation

### `createLazyFeaturePage`
```typescript
function createLazyFeaturePage<T>(
  loader: () => Promise<any>,
  options: CreateFeatureOptions<T>
): LazyExoticComponent<FC<T>>
```
**Module:** `/feature`
**Description:** Creates code-split feature page
**Returns:** Lazy component
**Use Case:** Code splitting

### `autoRegisterFeatures`
```typescript
function autoRegisterFeatures(
  modules: Record<string, () => Promise<FeatureModule>>
): Promise<FeatureDiscoveryResult>
```
**Module:** `/feature`
**Description:** Auto-discovers and registers features
**Returns:** Promise<FeatureDiscoveryResult>
**Use Case:** Auto-registration

---

## State Management

### `createAppStore`
```typescript
function createAppStore<T>(initialState: T): Store<T>
```
**Module:** `/state`
**Description:** Creates Zustand application store
**Returns:** Store
**Use Case:** App state management

### `createSlice`
```typescript
function createSlice<T>(name: string, initialState: T): StateSlice<T>
```
**Module:** `/state`
**Description:** Creates state slice
**Returns:** StateSlice
**Use Case:** Modular state

### `getStoreState`
```typescript
function getStoreState<T>(): T
```
**Module:** `/state`
**Description:** Gets current store state
**Returns:** Current state
**Use Case:** State inspection

### `subscribeToStore`
```typescript
function subscribeToStore<T>(listener: (state: T) => void): () => void
```
**Module:** `/state`
**Description:** Subscribes to store changes
**Returns:** Unsubscribe function
**Use Case:** State subscription

### `resetStore`
```typescript
function resetStore(): void
```
**Module:** `/state`
**Description:** Resets store to initial state
**Returns:** void
**Use Case:** State reset

### `clearPersistedStore`
```typescript
function clearPersistedStore(): void
```
**Module:** `/state`
**Description:** Clears persisted storage
**Returns:** void
**Use Case:** Storage clearing

### `registerFeatureStore`
```typescript
function registerFeatureStore(name: string, store: any): void
```
**Module:** `/state`
**Description:** Registers feature-specific store
**Returns:** void
**Use Case:** Feature state isolation

---

## Routing

### `buildPath`
```typescript
function buildPath(route: string, params?: PathParams): string
```
**Module:** `/routing`
**Description:** Builds path from route and params
**Returns:** string
**Use Case:** URL building

### `buildPathWithQuery`
```typescript
function buildPathWithQuery(
  route: string,
  params?: PathParams,
  query?: QueryParams
): string
```
**Module:** `/routing`
**Description:** Builds path with query string
**Returns:** string
**Use Case:** Complete URL building

### `parseQuery`
```typescript
function parseQuery(search: string): Record<string, string>
```
**Module:** `/routing`
**Description:** Parses query string
**Returns:** Query params object
**Use Case:** Query parsing

### `normalizePath`
```typescript
function normalizePath(path: string): string
```
**Module:** `/routing`
**Description:** Normalizes URL path
**Returns:** string
**Use Case:** Path normalization

### `joinPath`
```typescript
function joinPath(...segments: string[]): string
```
**Module:** `/routing`
**Description:** Joins path segments
**Returns:** string
**Use Case:** Path joining

### `matchPathPattern`
```typescript
function matchPathPattern(pattern: string, path: string): boolean
```
**Module:** `/routing`
**Description:** Matches path against pattern
**Returns:** boolean
**Use Case:** Route matching

### `createRouter`
```typescript
function createRouter(routes: RouteConfig[]): Router
```
**Module:** `/routing`
**Description:** Creates type-safe router
**Returns:** Router
**Use Case:** Custom routing

---

## Security

### `sanitizeHTML`
```typescript
function sanitizeHTML(html: string): string
```
**Module:** `/security`
**Description:** Sanitizes HTML content
**Returns:** Sanitized HTML
**Use Case:** XSS prevention

### `createSecureLocalStorage`
```typescript
function createSecureLocalStorage(key: string): SecureStorage
```
**Module:** `/security`
**Description:** Creates encrypted local storage
**Returns:** SecureStorage
**Use Case:** Secure data storage

### `createSecureSessionStorage`
```typescript
function createSecureSessionStorage(key: string): SecureStorage
```
**Module:** `/security`
**Description:** Creates encrypted session storage
**Returns:** SecureStorage
**Use Case:** Secure session data

---

## Performance

### `initPerformanceMonitoring`
```typescript
function initPerformanceMonitoring(config?: PerformanceConfig): void
```
**Module:** `/performance`
**Description:** Initializes performance monitoring
**Returns:** void
**Use Case:** Performance setup

### `startPerformanceMonitoring`
```typescript
function startPerformanceMonitoring(): void
```
**Module:** `/performance`
**Description:** Starts performance tracking
**Returns:** void
**Use Case:** Performance tracking

### `getVitalsCollector`
```typescript
function getVitalsCollector(): VitalsCollector
```
**Module:** `/performance`
**Description:** Gets web vitals collector
**Returns:** VitalsCollector
**Use Case:** Vitals collection

---

## Real-time

### `createWebSocketClient`
```typescript
function createWebSocketClient(url: string, options?: WebSocketOptions): WebSocketClient
```
**Module:** `/realtime`
**Description:** Creates WebSocket client
**Returns:** WebSocketClient
**Use Case:** WebSocket connections

### `createSSEClient`
```typescript
function createSSEClient(url: string, options?: SSEOptions): SSEClient
```
**Module:** `/realtime`
**Description:** Creates Server-Sent Events client
**Returns:** SSEClient
**Use Case:** SSE connections

### `createStreamCacheUpdater`
```typescript
function createStreamCacheUpdater(config: StreamCacheConfig): StreamQueryCacheUpdater
```
**Module:** `/realtime`
**Description:** Creates stream-to-cache updater
**Returns:** StreamQueryCacheUpdater
**Use Case:** Real-time cache updates

---

## Error Handling

### `initErrorReporter`
```typescript
function initErrorReporter(config: ErrorReporterConfig): void
```
**Module:** `/monitoring`
**Description:** Initializes error reporting
**Returns:** void
**Use Case:** Error tracking setup

### `reportError`
```typescript
function reportError(error: Error, context?: ErrorContext): void
```
**Module:** `/monitoring`
**Description:** Reports error to monitoring
**Returns:** void
**Use Case:** Error reporting

### `reportWarning`
```typescript
function reportWarning(message: string, context?: ErrorContext): void
```
**Module:** `/monitoring`
**Description:** Reports warning
**Returns:** void
**Use Case:** Warning reporting

### `reportInfo`
```typescript
function reportInfo(message: string, context?: ErrorContext): void
```
**Module:** `/monitoring`
**Description:** Reports info message
**Returns:** void
**Use Case:** Info logging

### `addBreadcrumb`
```typescript
function addBreadcrumb(breadcrumb: string): void
```
**Module:** `/monitoring`
**Description:** Adds error breadcrumb
**Returns:** void
**Use Case:** Error context

### `setUserContext`
```typescript
function setUserContext(user: User): void
```
**Module:** `/monitoring`
**Description:** Sets user context for errors
**Returns:** void
**Use Case:** User tracking

### `setErrorContext`
```typescript
function setErrorContext(context: ErrorContext): void
```
**Module:** `/monitoring`
**Description:** Sets error context
**Returns:** void
**Use Case:** Error context

### `clearErrorContext`
```typescript
function clearErrorContext(): void
```
**Module:** `/monitoring`
**Description:** Clears error context
**Returns:** void
**Use Case:** Context cleanup

---

## Coordination

### `publishEvent`
```typescript
function publishEvent(event: CoordinationEvent): void
```
**Module:** `/coordination`
**Description:** Publishes coordination event
**Returns:** void
**Use Case:** Event publishing

### `subscribeToEvent`
```typescript
function subscribeToEvent(
  eventType: string,
  handler: EventHandler
): EventSubscription
```
**Module:** `/coordination`
**Description:** Subscribes to coordination events
**Returns:** EventSubscription
**Use Case:** Event subscription

### `registerService`
```typescript
function registerService<T>(contract: ServiceContract<T>, implementation: T): void
```
**Module:** `/coordination`
**Description:** Registers DI service
**Returns:** void
**Use Case:** Dependency injection

### `resolveService`
```typescript
function resolveService<T>(contract: ServiceContract<T>): T
```
**Module:** `/coordination`
**Description:** Resolves DI service
**Returns:** Service instance
**Use Case:** Service resolution

### `createServiceContract`
```typescript
function createServiceContract<T>(id: string): ServiceContract<T>
```
**Module:** `/coordination`
**Description:** Creates service contract
**Returns:** ServiceContract
**Use Case:** DI contract creation

### `initCoordination`
```typescript
function initCoordination(): void
```
**Module:** `/coordination`
**Description:** Initializes coordination system
**Returns:** void
**Use Case:** System initialization

---

## Type Guards

### `isString`
```typescript
function isString(value: unknown): value is string
```
**Module:** `/utils`
**Description:** Type guard for strings
**Returns:** boolean
**Use Case:** Type checking

### `isNumber`
```typescript
function isNumber(value: unknown): value is number
```
**Module:** `/utils`
**Description:** Type guard for numbers
**Returns:** boolean
**Use Case:** Type checking

### `isBoolean`
```typescript
function isBoolean(value: unknown): value is boolean
```
**Module:** `/utils`
**Description:** Type guard for booleans
**Returns:** boolean
**Use Case:** Type checking

### `isObject`
```typescript
function isObject(value: unknown): value is object
```
**Module:** `/utils`
**Description:** Type guard for objects
**Returns:** boolean
**Use Case:** Type checking

### `isArray`
```typescript
function isArray(value: unknown): value is any[]
```
**Module:** `/utils`
**Description:** Type guard for arrays
**Returns:** boolean
**Use Case:** Type checking

### `isFunction`
```typescript
function isFunction(value: unknown): value is Function
```
**Module:** `/utils`
**Description:** Type guard for functions
**Returns:** boolean
**Use Case:** Type checking

### `isDefined`
```typescript
function isDefined<T>(value: T | undefined | null): value is T
```
**Module:** `/utils`
**Description:** Type guard for defined values
**Returns:** boolean
**Use Case:** Null/undefined checking

### `isPromise`
```typescript
function isPromise(value: unknown): value is Promise<any>
```
**Module:** `/utils`
**Description:** Type guard for promises
**Returns:** boolean
**Use Case:** Promise detection

---

## Utilities

### `ok`
```typescript
function ok<T>(value: T): Result<T, never>
```
**Module:** `/utils`
**Description:** Creates success Result
**Returns:** Result
**Use Case:** Result type

### `err`
```typescript
function err<E>(error: E): Result<never, E>
```
**Module:** `/utils`
**Description:** Creates error Result
**Returns:** Result
**Use Case:** Result type

### `isOk`
```typescript
function isOk<T, E>(result: Result<T, E>): result is Ok<T>
```
**Module:** `/utils`
**Description:** Checks if Result is Ok
**Returns:** boolean
**Use Case:** Result checking

### `isErr`
```typescript
function isErr<T, E>(result: Result<T, E>): result is Err<E>
```
**Module:** `/utils`
**Description:** Checks if Result is Err
**Returns:** boolean
**Use Case:** Result checking

### `debounce`
```typescript
function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): DebouncedFunction<T>
```
**Module:** `/shared`
**Description:** Debounces function calls
**Returns:** Debounced function
**Use Case:** Rate limiting

### `throttle`
```typescript
function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ThrottledFunction<T>
```
**Module:** `/shared`
**Description:** Throttles function calls
**Returns:** Throttled function
**Use Case:** Rate limiting

### `initializeSystem`
```typescript
function initializeSystem(config: SystemConfig): Promise<void>
```
**Module:** `/system`
**Description:** Initializes application system
**Returns:** Promise<void>
**Use Case:** App initialization

### `shutdownSystem`
```typescript
function shutdownSystem(): Promise<void>
```
**Module:** `/system`
**Description:** Shuts down application gracefully
**Returns:** Promise<void>
**Use Case:** App shutdown

---

**Total Functions:** 150+
**Last Updated:** 2025-11-29
**Version:** 1.0.5
