/**
 * Advanced API Module
 *
 * Enterprise-grade API utilities including gateway patterns,
 * request orchestration, and performance monitoring.
 *
 * @module api/advanced
 *
 * @example
 * ```typescript
 * // Create an API gateway
 * import {
 *   createAPIGateway,
 *   createRequestOrchestrator,
 *   createRateLimiter,
 *   createMetricsCollector,
 * } from '@/lib/api/advanced';
 *
 * const gateway = createAPIGateway({
 *   baseUrl: 'https://api.example.com',
 *   defaultApiVersion: 'v1',
 *   getAuthToken: () => localStorage.getItem('token'),
 * });
 *
 * // Add rate limiting
 * const rateLimiter = createRateLimiter({
 *   maxRequests: 100,
 *   windowMs: 60000,
 * });
 *
 * // Add metrics collection
 * const metrics = createMetricsCollector({
 *   reporter: consoleReporter,
 * });
 *
 * // Make requests
 * const users = await gateway.get('/users');
 * ```
 */

// =============================================================================
// API Gateway
// =============================================================================

export {
  APIGateway,
  createAPIGateway,
  loggingMiddleware,
  correlationIdMiddleware,
} from './api-gateway';
export type {
  HttpMethod,
  GatewayRequest,
  GatewayResponse,
  GatewayError,
  RetryConfig,
  CacheConfig,
  GatewayMiddleware,
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
  GatewayConfig,
} from './api-gateway';

// =============================================================================
// Request Orchestrator
// =============================================================================

export { RequestOrchestrator, createRequestOrchestrator } from './request-orchestrator';
export type {
  OrchestratedRequest,
  OrchestrationResult,
  BatchConfig,
  ChainConfig,
  WaterfallStep,
  WaterfallContext,
} from './request-orchestrator';

// =============================================================================
// Response Normalizer
// =============================================================================

export {
  ResponseNormalizer,
  createResponseNormalizer,
  normalizeResponse,
  normalizeErrors,
} from './response-normalizer';
export type {
  NormalizedResponse,
  NormalizedPagination,
  NormalizedLinks,
  NormalizedError,
  ResponseFormatConfig,
  ResponseFormat,
} from './response-normalizer';

// =============================================================================
// API Versioning
// =============================================================================

export { VersionManager, createVersionManager, parseSemver, formatVersion } from './api-versioning';
export type {
  VersioningStrategy,
  VersionFormat,
  VersionStatus,
  APIVersion,
  VersionManagerConfig,
  VersionTransform,
  ResponseMigration,
} from './api-versioning';

// =============================================================================
// Rate Limiter
// =============================================================================

export { RateLimiter, RateLimitError, createRateLimiter, RATE_LIMIT_PRESETS } from './rate-limiter';
export type { RateLimitConfig, RateLimitStatus, RateLimitHeaders } from './rate-limiter';

// =============================================================================
// Request Deduplication
// =============================================================================

export {
  RequestDeduplicator,
  createRequestDeduplicator,
  createDeduplicatedFetch,
  deduplicateFunction,
  ReactQueryDeduplicator,
  createReactQueryDeduplicator,
} from './request-deduplication';
export type {
  DeduplicationConfig,
  DeduplicationRequest,
  DeduplicationStats,
} from './request-deduplication';

// =============================================================================
// API Metrics
// =============================================================================

export {
  APIMetricsCollector,
  createMetricsCollector,
  consoleReporter,
  createBatchedReporter,
} from './api-metrics';
export type {
  RequestMetric,
  EndpointMetrics,
  OverallMetrics,
  MetricsConfig,
  MetricsReporter,
} from './api-metrics';
