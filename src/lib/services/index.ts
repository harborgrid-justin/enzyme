/**
 * @file Services Module Index
 * @description Central export for all service utilities including
 * HTTP clients, interceptors, caching, batching, versioning, and optimistic updates.
 *
 * This module provides a complete enterprise-grade service layer for React applications:
 *
 * - **HTTP Client**: Centralized HTTP client with interceptor support
 * - **Type-Safe API**: Contract-first API clients with Zod validation
 * - **Circuit Breakers**: Fault tolerance and service health monitoring
 * - **Offline Support**: Persistent queue for offline-first applications
 * - **Request Batching**: DataLoader pattern for N+1 query prevention
 * - **API Versioning**: Multiple versioning strategies with migration support
 * - **Optimistic Updates**: Seamless UI with conflict resolution
 * - **Enhanced Interceptors**: Tracing, retry, and telemetry
 *
 * @example Quick Start
 * ```typescript
 * import { initializeServiceLayer, serviceLayer } from '@/lib/services';
 *
 * // Initialize during app bootstrap
 * await initializeServiceLayer({
 *   apiBaseUrl: 'https://api.example.com',
 *   enableOfflineQueue: true,
 *   enableCircuitBreakers: true,
 * });
 *
 * // Use the HTTP client
 * const response = await httpClient.get('/users');
 *
 * // Use typed API clients
 * const userApi = createUserApiClient();
 * const users = await userApi.getUsers({ query: { page: 1 } });
 * ```
 */

// =============================================================================
// SERVICE LAYER FACADE (PRIMARY ENTRY POINT)
// =============================================================================
export {
  // Facade class and instance
  serviceLayer,
  initializeServiceLayer,
  getServiceLayerStatus,
  disposeServiceLayer,
  // Types
  type ServiceLayerConfig,
  type ServiceLayerStatus,
  type TelemetryConfig,
  type ServiceMetric,
  type ServiceError,
} from './ServiceLayerFacade';

// =============================================================================
// HTTP CLIENT (Legacy - Use @/lib/api instead)
// =============================================================================
export {
  /** @deprecated Use `ApiClient` from `@/lib/api` instead */
  HttpClient,
  /** @deprecated Use `apiClient` from `@/lib/api` instead */
  httpClient,
  /** @deprecated Use `ApiError` from `@/lib/api/types` instead */
  HttpError,
  type HttpRequestConfig,
  type HttpResponse,
  type RequestInterceptor,
  type ResponseInterceptor,
  type ErrorInterceptor,
  type HttpClientConfig,
  // ApiError-compatible types
  type HttpErrorCategory,
  type HttpErrorSeverity,
} from './http';

// =============================================================================
// BASIC INTERCEPTORS
// =============================================================================
export {
  createAuthInterceptor,
  createRequestLoggerInterceptor,
  createResponseLoggerInterceptor,
  createErrorLoggerInterceptor,
  createRetryInterceptor,
  createTokenRefreshInterceptor,
  createCsrfInterceptor,
  createRequestIdInterceptor,
  createTimingInterceptor,
} from './interceptors';

// =============================================================================
// REQUEST CACHE
// =============================================================================
export {
  RequestCache,
  requestCache,
  createCachedFetcher,
  withCache,
  type CacheConfig,
} from './cache';

// =============================================================================
// RESOURCE CLIENTS (Domain-specific API clients with caching)
// =============================================================================
export {
  // New names (preferred)
  createResourceClient,
  resourceClients,
  type ResourceApiResponse,
  type ResourceClientConfig,
  type ResourceClient,

  // Deprecated aliases for backward compatibility
  /** @deprecated Use `createResourceClient` instead */
  createApiClient,
  /** @deprecated Use `resourceClients` instead */
  apiClients,
  /** @deprecated Use `ResourceApiResponse` instead */
  type ApiResponse,
  /** @deprecated Use `ResourceClientConfig` instead */
  type ApiClientConfig,
  /** @deprecated Use `ResourceClient` instead */
  type ApiClient,

  // Non-deprecated types
  type PaginatedResponse,
  type ListQueryParams,
} from './apiClients';

// =============================================================================
// REQUEST QUEUE AND RATE LIMITING
// =============================================================================
export {
  RequestQueue,
  RateLimiter,
  RateLimitError,
  RequestBatcher,
  globalRequestQueue,
  rateLimiters,
  type RequestPriority,
  type RequestQueueConfig,
  type RateLimiterConfig,
  type BatcherConfig,
} from './requestQueue';

// =============================================================================
// TYPE-SAFE API CLIENT (NEW)
// =============================================================================
export {
  // Client factory
  createTypedApiClient,
  // Endpoint definition helpers
  defineEndpoint,
  defineGet,
  definePost,
  definePut,
  definePatch,
  defineDelete,
  // Common schemas
  paginationSchema,
  createPaginatedResponseSchema,
  idParamSchema,
  errorResponseSchema,
  successResponseSchema,
  userSchema,
  // Example contract
  userApiContract,
  createUserApiClient,
  // Errors
  ApiValidationError,
  ApiContractError,
  // Types
  type HttpMethod,
  type EndpointDefinition,
  type ApiContract,
  type InferRequest,
  type InferResponse,
  type RequestOptions,
  type TypedApiClient,
  type TypedApiClientConfig,
  type User,
  type PaginationParams,
} from './TypeSafeApiClient';

// =============================================================================
// ENHANCED INTERCEPTORS (NEW)
// =============================================================================
export {
  // Interceptor chain
  InterceptorChain,
  enhancedInterceptorChain,
  createEnhancedInterceptorChain,
  // Priority levels
  InterceptorPriority,
  // Circuit breaker
  createCircuitBreakerInterceptor,
  CircuitBreakerError,
  // Distributed tracing
  createTracingInterceptors,
  // Correlation
  createCorrelationInterceptor,
  // Timing
  // Retry with backoff
  // Types
  type InterceptorContext,
  type ContextualRequestInterceptor,
  type ContextualResponseInterceptor,
  type ContextualErrorInterceptor,
  type CircuitBreakerState,
  type CircuitBreakerConfig,
  type TracingConfig,
  type TraceSpan,
  type TimingConfig,
  type TimingData,
  type RetryConfig,
} from './EnhancedInterceptors';

// =============================================================================
// OPTIMISTIC MUTATIONS (NEW)
// =============================================================================
export {
  // Hooks
  useOptimisticMutation,
  useMutationQueue,
  // List helpers
  createListOptimisticUpdates,
  // Mutation queue
  OptimisticMutationQueue,
  globalMutationQueue,
  // Utilities
  deepClone,
  deepMerge,
  // Types
  type QuerySnapshot,
  type OptimisticContext,
  type ConflictStrategy,
  type ConflictContext,
  type OptimisticUpdateConfig,
  type ListItem,
  type ListResponse,
  type QueuedMutation,
  type MutationQueueConfig,
  type QueueStatus,
} from './OptimisticMutations';

// =============================================================================
// DATALOADER BATCHING (NEW)
// =============================================================================
export {
  // DataLoader
  DataLoader,
  // Request deduplication
  RequestDeduplicator,
  globalDeduplicator,
  deduplicatedFetch,
  // GraphQL batching
  GraphQLBatcher,
  // Factory functions
  createResourceLoader,
  createKeyedLoader,
  // Types
  type BatchFunction,
  type KeySerializer,
  type DataLoaderConfig,
  type DataLoaderStats,
  type DeduplicatorConfig,
  type GraphQLOperation,
  type GraphQLBatchResponse,
  type GraphQLBatcherConfig,
} from './DataLoaderBatching';

// =============================================================================
// API VERSIONING (NEW)
// =============================================================================
export {
  // Versioned client
  VersionedApiClient,
  createVersionedApi,
  // Versioning strategies
  VersioningStrategy,
  // Version utilities
  parseVersion,
  versionToNumber,
  compareVersions,
  isVersionInRange,
  getLatestVersion,
  // Transformer helpers
  createFieldRenamingTransformer,
  createEndpointMappingTransformer,
  composeTransformers,
  // Errors
  VersionNotSupportedError,
  VersionDeprecatedError,
  // Example
  exampleVersionedApi,
  // Types
  type ApiVersion,
  type VersionDeprecation,
  type VersionTransformer,
  type VersionConfig,
  type VersionNegotiationResult,
  type VersionedApiClientConfig,
} from './ApiVersioning';

// =============================================================================
// SERVICE CIRCUIT BREAKER (NEW)
// =============================================================================
export {
  // Circuit breaker class
  ServiceCircuitBreaker,
  // Registry
  serviceRegistry,
  // Setup helpers
  setupDefaultServices,
  createServiceFetch,
  // Types
  type ServiceHealth,
  type ServiceConfig,
  type ServiceStatus,
  type ServiceStateChangeEvent,
} from './ServiceCircuitBreaker';

// =============================================================================
// PERSISTENT OFFLINE QUEUE (NEW)
// =============================================================================
export {
  // Queue class
  PersistentOfflineQueue,
  // Global instance
  offlineQueue,
  // Types
  type QueueItemStatus,
  type QueuedRequest,
  type OfflineQueueOptions,
  type EnqueueOptions,
  type QueueStats,
} from './PersistentOfflineQueue';
