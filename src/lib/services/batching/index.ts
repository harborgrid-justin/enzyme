/**
 * @file Services Batching Module
 * @description Request batching, DataLoader, and queue exports.
 *
 * @example
 * ```typescript
 * import {
 *   DataLoader,
 *   RequestDeduplicator,
 *   GraphQLBatcher,
 *   RequestQueue,
 * } from '@/lib/services/batching';
 * ```
 */

// DataLoader Batching
export {
  DataLoader,
  RequestDeduplicator,
  globalDeduplicator,
  deduplicatedFetch,
  GraphQLBatcher,
  createResourceLoader,
  createKeyedLoader,
  type BatchFunction,
  type KeySerializer,
  type DataLoaderConfig,
  type DataLoaderStats,
  type DeduplicatorConfig,
  type GraphQLOperation,
  type GraphQLBatchResponse,
  type GraphQLBatcherConfig,
} from '../DataLoaderBatching';

// Request Queue and Rate Limiting
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
} from '../requestQueue';
