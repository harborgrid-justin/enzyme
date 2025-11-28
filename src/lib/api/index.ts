/**
 * @file API Module Index
 * @description Comprehensive API infrastructure providing type-safe HTTP clients,
 * request building, response handling, React Query integration, and mock capabilities.
 *
 * This module serves as the central export point for all API-related functionality:
 *
 * - **API Client**: Enterprise-grade HTTP client with retry, interceptors, and deduplication
 * - **Request Builder**: Fluent API for constructing type-safe requests
 * - **Response Handler**: Typed parsing, error normalization, and streaming support
 * - **Hooks Factory**: Generate typed query/mutation hooks from endpoint definitions
 * - **Mock System**: Development mock server with delay and error simulation
 * - **React Hooks**: useApiClient, useApiRequest, useApiMutation, useApiCache, useApiHealth
 *
 * @example Quick Start
 * ```typescript
 * import {
 *   // Client
 *   apiClient,
 *   createApiClient,
 *
 *   // Request building
 *   RequestBuilder,
 *   get,
 *   post,
 *
 *   // Response handling
 *   parseResponse,
 *   normalizeError,
 *
 *   // Hooks
 *   useApiRequest,
 *   useApiMutation,
 *   useApiHealth,
 *
 *   // Mock
 *   mockServer,
 *   createMockServer,
 * } from '@/lib/api';
 *
 * // Make a typed request
 * const users = await apiClient.get<User[]>('/users');
 *
 * // Use hooks in components
 * const { data, isLoading } = useApiRequest<User>({
 *   url: '/users/123',
 *   queryKey: ['users', '123'],
 * });
 *
 * // Build complex requests
 * const config = get<SearchResults>('/search')
 *   .query({ q: 'term', page: 1 })
 *   .timeout(5000)
 *   .build();
 * ```
 *
 * @example Mock Server Setup
 * ```typescript
 * import { mockServer, mockHandlers, mockData } from '@/lib/api';
 *
 * // Register mock routes
 * mockServer.get('/users', mockHandlers.success([
 *   { id: mockData.uuid(), name: mockData.name() },
 * ]));
 *
 * // Enable mocking
 * mockServer.start();
 * ```
 *
 * @module @/lib/api
 */

// =============================================================================
// TYPES
// =============================================================================

export type {
  // HTTP Types
  HttpMethod,
  HttpMethodWithBody,
  HttpMethodWithoutBody,
  ContentType,
  ResponseType,

  // Request Types
  PathParams,
  QueryParamValue,
  QueryParams,
  RequestHeaders,
  RequestConfig,
  RequestPriority,
  RequestMeta,
  RetryConfig,

  // Response Types
  ResponseHeaders,
  ApiResponse,
  ResponseTiming,
  CacheInfo,

  // Pagination Types
  CursorPaginationParams,
  OffsetPaginationParams,
  PaginationParams,
  PaginationMeta,
  PaginatedResponse,

  // Error Types
  ErrorSeverity,
  ErrorCategory,
  FieldError,
  ApiError,
  ServerErrorResponse,

  // Endpoint Types
  ApiEndpoint,
  EndpointCacheConfig,
  ApiContract,
  InferEndpointRequest,
  InferEndpointResponse,
  InferEndpointPathParams,
  InferEndpointQueryParams,

  // Client Types
  TokenProvider,
  ApiClientConfig,
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,

  // Hook Types
  UseApiRequestOptions,
  UseApiMutationOptions,
  ApiRequestResult,
  ApiMutationResult,

  // Mock Types
  MockHandler,
  MockRequest,
  MockResponse,
  MockRoute,
  MockServerConfig,

  // Health Types
  HealthStatus,
  HealthCheckResult,
  HealthMonitorConfig,

  // Cache Types
  CacheEntry,
  CacheStats,
  CacheConfig,

  // Streaming Types
  StreamEventType,
  StreamEvent,
  StreamController,
  StreamOptions,

  // Utility Types
  DeepPartial,
  RequiredFields,
  NonNullableFields,
  Merge,
  Brand,
  RequestId,
  CorrelationId,
} from './types';

// =============================================================================
// API CLIENT
// =============================================================================

export {
  // Client class
  ApiClient,
  // Factory function
  createApiClient,
  // Singleton instance
  apiClient,
  // Error utilities
  createApiError,
  isRetryable,
  getErrorCategory,
  getErrorSeverity,
} from './api-client';

// =============================================================================
// REQUEST BUILDER
// =============================================================================

export {
  // Builder class
  RequestBuilder,
  // Factory functions
  createRequest,
  get,
  post,
  put,
  patch,
  del,
  // Query utilities
  serializeQueryParams,
  parseQueryParams,
  buildUrl,
  joinUrl,
  // Types
  type QuerySerializationOptions,
} from './request-builder';

// =============================================================================
// RESPONSE HANDLER
// =============================================================================

export {
  // Parsing
  parseResponse,
  createResponseParser,
  type ResponseParserConfig,

  // Error normalization
  normalizeError,
  isApiError,
  type ErrorNormalizationConfig,

  // Cache hints
  extractCacheHints,
  buildCacheInfo,
  generateCacheControl,
  type CacheHints,

  // Streaming
  streamResponse,

  // Pagination
  extractPagination,
  createPaginatedResponse,
  mergePaginatedResponses,
  type PaginationConfig,

  // Transformers
  createTransformPipeline,
  transformers,
  type ResponseTransformer,
} from './response-handler';

// =============================================================================
// API HOOKS FACTORY
// =============================================================================

export {
  // Hook factory
  createApiHooks,
  createQueryKeyFactory,
  type HooksFactoryConfig,
  type ApiHooks,

  // Query hooks
  type QueryHookConfig,
  type QueryRequestParams,
  type GeneratedQueryHook,

  // Mutation hooks
  type MutationHookConfig,
  type MutationRequestParams,
  type GeneratedMutationHook,

  // Infinite query
  createInfiniteQueryHook,
  type InfiniteQueryHookConfig,

  // Optimistic updates
  createOptimisticMutation,
  createOptimisticListMutation,
  type OptimisticUpdateConfig,

  // Error handling
  createErrorHandler,
  type ErrorHandlerConfig,

  // Prefetch
  createPrefetch,

  // Utilities
  toHookName,
  extractPaginationFromResponse,
  mergeInfinitePages,
  useStableQueryKey,
  useMutationLoadingState,
  useCombinedMutationError,
} from './api-hooks-factory';

// =============================================================================
// MOCK API SYSTEM
// =============================================================================

export {
  // Mock server class
  MockServer,
  // Factory
  createMockServer,
  // Singleton
  mockServer,
  // Handler factories
  mockHandlers,
  // Data generators
  mockData,
  // CRUD factory
  createCrudHandlers,
  // Types
  type MockRequestLog,
} from './mock-api';

// =============================================================================
// REACT HOOKS
// =============================================================================

export {
  // API Client hook
  useApiClient,
  useApiClientInstance,
  useApiClientStatus,
  useApiInterceptors,
  ApiClientProvider,
  type ApiClientContextValue,
  type ApiClientProviderProps,

  // API Request hooks
  useApiRequest,
  useGet,
  useGetById,
  useGetList,
  useParallelRequests,
  useDependentRequest,
  usePolling,
  usePrefetch,
  useLazyQuery,
  type ApiRequestConfig,
  type ApiRequestOptions,
  type UseApiRequestResult,

  // API Mutation hooks
  useApiMutation,
  usePost,
  usePut,
  usePatch,
  useDelete,
  useBatchMutation,
  createOptimisticAdd,
  createOptimisticUpdate,
  createOptimisticRemove,
  type MutationVariables,
  type ApiMutationConfig,
  type UseApiMutationResult,

  // API Cache hooks
  useApiCache,
  useCacheMonitor,
  useCacheEntry,
  useBulkCacheOperations,
  type CacheFilterOptions,
  type CacheEntryInfo,
  type UseApiCacheResult,

  // API Health hooks
  useApiHealth,
  useApiConnectivity,
  useNetworkAware,
  useMultiApiHealth,
  type UseApiHealthConfig,
  type UseApiHealthResult,
} from './hooks';

// =============================================================================
// ADVANCED API MODULE
// =============================================================================

export * as advanced from './advanced';

export {
  // API Gateway
  APIGateway,
  createAPIGateway,
  loggingMiddleware,
  correlationIdMiddleware,
  type HttpMethod as GatewayHttpMethod,
  type GatewayRequest,
  type GatewayResponse,
  type GatewayError,
  type RetryConfig as GatewayRetryConfig,
  type CacheConfig as GatewayCacheConfig,
  type GatewayMiddleware,
  type RequestInterceptor as GatewayRequestInterceptor,
  type ResponseInterceptor as GatewayResponseInterceptor,
  type ErrorInterceptor as GatewayErrorInterceptor,
  type GatewayConfig,

  // Request Orchestrator
  RequestOrchestrator,
  createRequestOrchestrator,
  type OrchestratedRequest,
  type OrchestrationResult,
  type BatchConfig,
  type ChainConfig,
  type WaterfallStep,
  type WaterfallContext,

  // Response Normalizer
  ResponseNormalizer,
  createResponseNormalizer,
  normalizeResponse,
  normalizeErrors,
  type NormalizedResponse,
  type NormalizedPagination,
  type NormalizedLinks,
  type NormalizedError,
  type ResponseFormatConfig,
  type ResponseFormat,

  // API Versioning
  VersionManager,
  createVersionManager,
  parseSemver,
  formatVersion,
  type VersioningStrategy,
  type VersionFormat,
  type VersionStatus,
  type APIVersion,
  type VersionManagerConfig,
  type VersionTransform,
  type ResponseMigration,

  // Rate Limiter
  RateLimiter,
  RateLimitError,
  createRateLimiter,
  RATE_LIMIT_PRESETS,
  type RateLimitConfig,
  type RateLimitStatus,
  type RateLimitHeaders,

  // Request Deduplication
  RequestDeduplicator,
  createRequestDeduplicator,
  createDeduplicatedFetch,
  deduplicateFunction,
  ReactQueryDeduplicator,
  createReactQueryDeduplicator,
  type DeduplicationConfig,
  type DeduplicationRequest,
  type DeduplicationStats,

  // API Metrics
  APIMetricsCollector,
  createMetricsCollector,
  consoleReporter,
  createBatchedReporter,
  type RequestMetric,
  type EndpointMetrics,
  type OverallMetrics,
  type MetricsConfig,
  type MetricsReporter,
} from './advanced';

// =============================================================================
// RE-EXPORTS FROM CONFIG
// =============================================================================

// These are re-exported for convenience when importing from @/lib/api
export {
  API_CONFIG,
  API_ENDPOINTS,
  QUERY_KEYS,
  ENDPOINT_REGISTRY,
  buildApiUrl,
  buildApiUrlWithParams,
  isRetryableStatus,
  isNetworkError,
  getEnvironmentApiConfig,
  buildListParams,
  API_VERSION,
  SUPPORTED_API_VERSIONS,
  getVersionedApiUrl,
  buildVersionedUrl,
  type ApiEndpoints,
  type ApiConfig,
  type QueryKeyFactory,
  type EndpointDefinition,
  type EndpointRegistry,
  type EnvironmentApiConfig,
  type ApiSuccessResponse,
  type ApiErrorResponse,
  type ApiPaginatedResponse,
  type ListRequestParams,
  type ApiVersion,
} from '@/config/api.config';
