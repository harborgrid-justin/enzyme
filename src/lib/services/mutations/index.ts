/**
 * @file Services Mutations Module
 * @description Optimistic mutations and type-safe API client exports.
 *
 * @example
 * ```typescript
 * import {
 *   useOptimisticMutation,
 *   useMutationQueue,
 *   createTypedApiClient,
 * } from '@/lib/services/mutations';
 * ```
 */

// Optimistic Mutations
export {
  useOptimisticMutation,
  useMutationQueue,
  createListOptimisticUpdates,
  OptimisticMutationQueue,
  globalMutationQueue,
  deepClone,
  deepMerge,
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
} from '../optimistic-mutations';

// Type-Safe API Client
export {
  createTypedApiClient,
  defineEndpoint,
  defineGet,
  definePost,
  definePut,
  definePatch,
  defineDelete,
  paginationSchema,
  createPaginatedResponseSchema,
  idParamSchema,
  errorResponseSchema,
  successResponseSchema,
  userSchema,
  userApiContract,
  createUserApiClient,
  ApiValidationError,
  ApiContractError,
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
} from '../type-safe-api-client';
