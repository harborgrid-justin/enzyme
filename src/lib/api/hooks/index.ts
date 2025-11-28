/**
 * @file API Hooks Index
 * @description Barrel export for all API hooks providing type-safe data fetching,
 * mutations, caching, and health monitoring capabilities.
 *
 * @example
 * ```typescript
 * import {
 *   useApiClient,
 *   useApiRequest,
 *   useApiMutation,
 *   useApiCache,
 *   useApiHealth,
 * } from '@/lib/api/hooks';
 * ```
 */

// =============================================================================
// API CLIENT HOOK
// =============================================================================

export {
  // Hook
  useApiClient,
  useApiClientInstance,
  useApiClientStatus,
  useApiInterceptors,
  // Provider
  ApiClientProvider,
  // Types
  type ApiClientContextValue,
  type ApiClientProviderProps,
} from './useApiClient';

// =============================================================================
// API REQUEST HOOKS
// =============================================================================

export {
  // Main hook
  useApiRequest,
  // Convenience hooks
  useGet,
  useGetById,
  useGetList,
  // Advanced hooks
  useParallelRequests,
  useDependentRequest,
  usePolling,
  usePrefetch,
  useLazyQuery,
  // Types
  type ApiRequestConfig,
  type ApiRequestOptions,
  type UseApiRequestResult,
} from './useApiRequest';

// =============================================================================
// API MUTATION HOOKS
// =============================================================================

export {
  // Main hook
  useApiMutation,
  // Convenience hooks
  usePost,
  usePut,
  usePatch,
  useDelete,
  // Batch hook
  useBatchMutation,
  // Optimistic update helpers
  createOptimisticAdd,
  createOptimisticUpdate,
  createOptimisticRemove,
  // Types
  type MutationVariables,
  type ApiMutationConfig,
  type UseApiMutationResult,
} from './useApiMutation';

// =============================================================================
// API CACHE HOOKS
// =============================================================================

export {
  // Main hook
  useApiCache,
  // Specialized hooks
  useCacheMonitor,
  useCacheEntry,
  useBulkCacheOperations,
  // Types
  type CacheFilterOptions,
  type CacheEntryInfo,
  type UseApiCacheResult,
} from './useApiCache';

// =============================================================================
// API HEALTH HOOKS
// =============================================================================

export {
  // Main hook
  useApiHealth,
  // Specialized hooks
  useApiConnectivity,
  useNetworkAware,
  useMultiApiHealth,
  // Types
  type UseApiHealthConfig,
  type UseApiHealthResult,
} from './useApiHealth';
