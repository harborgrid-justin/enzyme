/**
 * @file Services Caching Module
 * @description Caching and resource client exports.
 *
 * @example
 * ```typescript
 * import {
 *   RequestCache,
 *   requestCache,
 *   createResourceClient,
 * } from '@/lib/services/caching';
 * ```
 */

// Request Cache
export {
  RequestCache,
  requestCache,
  createCachedFetcher,
  withCache,
  type CacheConfig,
} from '../cache';

// Resource Clients
export {
  createResourceClient,
  resourceClients,
  type ResourceApiResponse,
  type ResourceClientConfig,
  type ResourceClient,
  // Deprecated aliases
  createApiClient,
  apiClients,
  type ApiResponse,
  type ApiClientConfig,
  type ApiClient,
  type PaginatedResponse,
  type ListQueryParams,
} from '../apiClients';
