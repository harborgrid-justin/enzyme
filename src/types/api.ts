/**
 * @file API Types
 * @description Comprehensive API request/response types with full type safety
 * @module @/types/api
 *
 * This module provides:
 * - Standard API response wrappers
 * - Pagination and sorting types
 * - Error handling types
 * - HTTP status code types
 * - Cache control and rate limiting types
 *
 * @example
 * ```typescript
 * import type { ApiResponse, PaginatedResponse } from '@/types/api';
 *
 * async function fetchUsers(): Promise<PaginatedResponse<User>> {
 *   const response = await api.get('/users');
 *   return response.data;
 * }
 * ```
 */

// =============================================================================
// HTTP STATUS CODES
// =============================================================================

/**
 * Common HTTP status codes as a type-safe union
 *
 * Provides compile-time safety for HTTP status code handling
 *
 * @example
 * ```typescript
 * function handleStatus(status: HttpStatusCode): string {
 *   switch (status) {
 *     case 200: return 'OK';
 *     case 404: return 'Not Found';
 *     default: return 'Unknown';
 *   }
 * }
 * ```
 */
export type HttpStatusCode =
  // Success
  | 200 // OK
  | 201 // Created
  | 202 // Accepted
  | 204 // No Content
  // Redirection
  | 301 // Moved Permanently
  | 302 // Found
  | 304 // Not Modified
  | 307 // Temporary Redirect
  | 308 // Permanent Redirect
  // Client Errors
  | 400 // Bad Request
  | 401 // Unauthorized
  | 403 // Forbidden
  | 404 // Not Found
  | 405 // Method Not Allowed
  | 408 // Request Timeout
  | 409 // Conflict
  | 410 // Gone
  | 413 // Payload Too Large
  | 415 // Unsupported Media Type
  | 422 // Unprocessable Entity
  | 429 // Too Many Requests
  // Server Errors
  | 500 // Internal Server Error
  | 501 // Not Implemented
  | 502 // Bad Gateway
  | 503 // Service Unavailable
  | 504; // Gateway Timeout

/**
 * Informational status codes (1xx)
 */
export type InformationalStatusCode = 100 | 101 | 102 | 103;

/**
 * Success status codes (2xx)
 */
export type SuccessStatusCode = 200 | 201 | 202 | 203 | 204 | 205 | 206 | 207 | 208 | 226;

/**
 * Redirection status codes (3xx)
 */
export type RedirectionStatusCode = 300 | 301 | 302 | 303 | 304 | 305 | 306 | 307 | 308;

/**
 * Client error status codes (4xx)
 */
export type ClientErrorStatusCode =
  | 400 | 401 | 402 | 403 | 404 | 405 | 406 | 407 | 408 | 409
  | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 421
  | 422 | 423 | 424 | 425 | 426 | 428 | 429 | 431 | 451;

/**
 * Server error status codes (5xx)
 */
export type ServerErrorStatusCode = 500 | 501 | 502 | 503 | 504 | 505 | 506 | 507 | 508 | 510 | 511;

// =============================================================================
// RESPONSE METADATA
// =============================================================================

/**
 * API response metadata for debugging and tracking
 *
 * Contains request tracking information, timing data, and pagination details
 *
 * @example
 * ```typescript
 * const { meta } = await api.get('/users');
 * console.log(`Request ${meta.requestId} took ${meta.duration}ms`);
 * ```
 */
export interface ApiResponseMeta {
  /**
   * Unique identifier for request tracing
   * Format: UUID or custom tracking ID
   */
  readonly requestId?: string;

  /**
   * ISO 8601 timestamp of the response
   * @example "2024-01-15T10:30:00.000Z"
   */
  readonly timestamp?: string;

  /**
   * Request duration in milliseconds
   */
  readonly duration?: number;

  /**
   * Pagination details (present for list endpoints)
   */
  readonly pagination?: PaginationMeta;

  /**
   * API version that served the request
   * @example "v1.2.3"
   */
  readonly apiVersion?: string;

  /**
   * Server region/datacenter identifier
   */
  readonly region?: string;

  /**
   * Deprecation warning for sunset endpoints
   */
  readonly deprecation?: {
    readonly message: string;
    readonly sunsetDate: string;
    readonly replacement?: string;
  };
}

/**
 * Cache control metadata for response caching
 *
 * Used by the API client to determine caching behavior
 */
export interface CacheControl {
  /**
   * Whether the response can be cached
   */
  readonly cacheable: boolean;

  /**
   * Time-to-live in seconds
   */
  readonly ttl?: number;

  /**
   * Cache key for invalidation
   */
  readonly cacheKey?: string;

  /**
   * Cache tags for bulk invalidation
   */
  readonly tags?: readonly string[];

  /**
   * ETag for conditional requests
   */
  readonly etag?: string;

  /**
   * Last-Modified timestamp
   */
  readonly lastModified?: string;
}

/**
 * Rate limit information returned by the API
 *
 * Helps clients implement backoff strategies and user feedback
 */
export interface RateLimitInfo {
  /**
   * Maximum requests allowed in the window
   */
  readonly limit: number;

  /**
   * Remaining requests in current window
   */
  readonly remaining: number;

  /**
   * Unix timestamp when the rate limit resets
   */
  readonly reset: number;

  /**
   * Rate limit policy identifier
   */
  readonly policy?: string;

  /**
   * Retry-After in seconds (when rate limited)
   */
  readonly retryAfter?: number;
}

// =============================================================================
// PAGINATION
// =============================================================================

/**
 * Pagination metadata for paginated responses
 *
 * Provides complete pagination state for UI components
 *
 * @example
 * ```typescript
 * const { meta: { pagination } } = await api.getUsers({ page: 1 });
 * if (pagination.hasNext) {
 *   await api.getUsers({ page: pagination.page + 1 });
 * }
 * ```
 */
export interface PaginationMeta {
  /**
   * Current page number (1-indexed)
   */
  readonly page: number;

  /**
   * Number of items per page
   */
  readonly pageSize: number;

  /**
   * Total number of items across all pages
   */
  readonly total: number;

  /**
   * Total number of pages
   */
  readonly totalPages: number;

  /**
   * Whether there is a next page
   */
  readonly hasNext: boolean;

  /**
   * Whether there is a previous page
   */
  readonly hasPrev: boolean;

  /**
   * Offset from start (for offset-based pagination)
   */
  readonly offset?: number;

  /**
   * Cursor for next page (for cursor-based pagination)
   */
  readonly nextCursor?: string;

  /**
   * Cursor for previous page (for cursor-based pagination)
   */
  readonly prevCursor?: string;
}

/**
 * Pagination query parameters
 *
 * Standard parameters for paginated list endpoints
 */
export interface PaginationParams {
  /**
   * Page number (1-indexed)
   * @default 1
   */
  readonly page?: number;

  /**
   * Number of items per page
   * @default 20
   */
  readonly pageSize?: number;

  /**
   * Maximum items to return (alias for pageSize)
   */
  readonly limit?: number;

  /**
   * Number of items to skip (for offset pagination)
   */
  readonly offset?: number;

  /**
   * Cursor for cursor-based pagination
   */
  readonly cursor?: string;
}

/**
 * Sort query parameters
 *
 * Standard parameters for sorted list endpoints
 */
export interface SortParams {
  /**
   * Field to sort by
   * @example "createdAt"
   */
  readonly sortBy?: string;

  /**
   * Sort direction
   * @default "asc"
   */
  readonly sortOrder?: 'asc' | 'desc';
}

/**
 * Filter query parameters
 *
 * Standard parameters for filtered list endpoints
 */
export interface FilterParams {
  /**
   * Full-text search query
   */
  readonly search?: string;

  /**
   * Field-specific filters
   * @example { status: 'active', role: 'admin' }
   */
  readonly filter?: Readonly<Record<string, unknown>>;

  /**
   * Date range filter - start date (ISO 8601)
   */
  readonly fromDate?: string;

  /**
   * Date range filter - end date (ISO 8601)
   */
  readonly toDate?: string;

  /**
   * Include soft-deleted items
   * @default false
   */
  readonly includeDeleted?: boolean;
}

/**
 * Combined list query parameters
 *
 * Combines pagination, sorting, and filtering for list endpoints
 */
export interface ListQueryParams extends PaginationParams, SortParams, FilterParams {
  /**
   * Fields to include in the response (sparse fieldsets)
   * @example ['id', 'name', 'email']
   */
  readonly fields?: readonly string[];

  /**
   * Related resources to include (eager loading)
   * @example ['profile', 'organization']
   */
  readonly include?: readonly string[];
}

// =============================================================================
// API RESPONSE WRAPPERS
// =============================================================================

/**
 * Standard API success response wrapper
 *
 * All successful API responses follow this structure for consistency
 *
 * @template T - The type of the response data
 *
 * @example
 * ```typescript
 * interface User { id: string; name: string }
 * const response: ApiResponse<User> = await api.get('/users/123');
 * console.log(response.data.name);
 * ```
 */
export interface ApiResponse<T> {
  /**
   * The response payload
   */
  readonly data: T;

  /**
   * Whether the request was successful
   */
  readonly success: true;

  /**
   * Optional success message
   */
  readonly message?: string;

  /**
   * Response metadata
   */
  readonly meta?: ApiResponseMeta;

  /**
   * Cache control information
   */
  readonly cache?: CacheControl;

  /**
   * Rate limit information
   */
  readonly rateLimit?: RateLimitInfo;
}

/**
 * API success response (alias for ApiResponse with explicit success)
 *
 * @template T - The type of the response data
 */
export interface ApiSuccessResponse<T> extends ApiResponse<T> {
  readonly success: true;
}

/**
 * API failure response (no data, has error)
 */
export interface ApiFailureResponse {
  readonly success: false;
  readonly error: ApiError;
  readonly meta?: ApiResponseMeta;
}

/**
 * Paginated API response
 *
 * Extends the standard response with pagination metadata
 *
 * @template T - The type of items in the list
 *
 * @example
 * ```typescript
 * const response: PaginatedResponse<User> = await api.get('/users');
 * console.log(`Page ${response.meta.pagination.page} of ${response.meta.pagination.totalPages}`);
 * response.data.forEach(user => console.log(user.name));
 * ```
 */
export interface PaginatedResponse<T> extends ApiResponse<readonly T[]> {
  /**
   * Array of items for the current page
   */
  readonly data: readonly T[];

  /**
   * Metadata including required pagination info
   */
  readonly meta: ApiResponseMeta & {
    readonly pagination: PaginationMeta;
  };
}

/**
 * Cursor-paginated response for infinite scroll
 *
 * @template T - The type of items in the list
 */
export interface CursorPaginatedResponse<T> extends ApiResponse<readonly T[]> {
  readonly data: readonly T[];
  readonly meta: ApiResponseMeta & {
    readonly pagination: {
      readonly hasMore: boolean;
      readonly nextCursor: string | null;
      readonly prevCursor: string | null;
      readonly total?: number;
    };
  };
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * Structured API error details
 *
 * Provides comprehensive error information for debugging and user feedback
 */
export interface ApiError {
  /**
   * Machine-readable error code for programmatic handling
   * @example "VALIDATION_ERROR", "NOT_FOUND", "UNAUTHORIZED"
   */
  readonly code: string;

  /**
   * Human-readable error message
   */
  readonly message: string;

  /**
   * Additional error details
   */
  readonly details?: Readonly<Record<string, unknown>>;

  /**
   * Stack trace (development only)
   */
  readonly stack?: string;

  /**
   * Request trace ID for support tickets
   */
  readonly traceId?: string;

  /**
   * Documentation link for the error
   */
  readonly helpUrl?: string;

  /**
   * Nested errors (for multi-error responses)
   */
  readonly errors?: readonly ApiError[];
}

/**
 * API error response structure
 *
 * Standard error response format for all API errors
 *
 * @example
 * ```typescript
 * try {
 *   await api.get('/users/invalid-id');
 * } catch (error) {
 *   if (isApiErrorResponse(error)) {
 *     console.error(`Error ${error.error.code}: ${error.error.message}`);
 *   }
 * }
 * ```
 */
export interface ApiErrorResponse {
  /**
   * Always false for error responses
   */
  readonly success: false;

  /**
   * Error details
   */
  readonly error: ApiError;

  /**
   * Response metadata (may include timing info)
   */
  readonly meta?: ApiResponseMeta;
}

/**
 * Single field validation error
 */
export interface ValidationError {
  /**
   * Field path (dot notation for nested fields)
   * @example "user.profile.email"
   */
  readonly field: string;

  /**
   * Validation error message
   */
  readonly message: string;

  /**
   * Validation rule that failed
   * @example "required", "email", "minLength"
   */
  readonly rule?: string;

  /**
   * Expected value or constraint
   */
  readonly expected?: unknown;

  /**
   * Actual value that failed validation
   */
  readonly actual?: unknown;
}

/**
 * Validation error response with field-level errors
 *
 * Used for form validation feedback
 */
export interface ValidationErrorResponse extends Omit<ApiErrorResponse, 'error'> {
  readonly success: false;
  readonly error: ApiError & {
    readonly code: 'VALIDATION_ERROR';
    readonly validationErrors: readonly ValidationError[];
  };
}

// =============================================================================
// ENTITY TYPES
// =============================================================================

/**
 * Standard timestamp fields
 *
 * Present on all persistent entities
 */
export interface Timestamps {
  /**
   * ISO 8601 creation timestamp
   */
  readonly createdAt: string;

  /**
   * ISO 8601 last update timestamp
   */
  readonly updatedAt: string;
}

/**
 * Soft delete fields
 *
 * For entities that support soft deletion
 */
export interface SoftDelete {
  /**
   * ISO 8601 deletion timestamp (null if not deleted)
   */
  readonly deletedAt?: string | null;

  /**
   * Whether the entity is soft-deleted
   */
  readonly isDeleted: boolean;
}

/**
 * Base entity interface
 *
 * All database entities extend this interface
 *
 * @example
 * ```typescript
 * interface User extends BaseEntity {
 *   name: string;
 *   email: string;
 * }
 * ```
 */
export interface BaseEntity extends Timestamps {
  /**
   * Unique identifier (UUID format)
   */
  readonly id: string;
}

/**
 * User reference for audit trails and assignments
 *
 * Lightweight user reference without sensitive data
 */
export interface UserRef {
  /**
   * User's unique identifier
   */
  readonly id: string;

  /**
   * User's display name
   */
  readonly name: string;

  /**
   * User's email (optional, may be hidden for privacy)
   */
  readonly email?: string;

  /**
   * URL to user's avatar image
   */
  readonly avatar?: string;
}

/**
 * Audit fields for tracking entity changes
 *
 * Records who created and last modified an entity
 */
export interface AuditFields {
  /**
   * User who created the entity
   */
  readonly createdBy: UserRef;

  /**
   * User who last modified the entity
   */
  readonly updatedBy?: UserRef;
}

/**
 * Full auditable entity combining all tracking fields
 */
export interface AuditableEntity extends BaseEntity, SoftDelete, AuditFields {}

// =============================================================================
// OPERATION RESPONSES
// =============================================================================

/**
 * File upload response
 *
 * Returned after successful file uploads
 */
export interface FileUploadResponse {
  /**
   * Unique file identifier
   */
  readonly id: string;

  /**
   * Generated filename (sanitized)
   */
  readonly filename: string;

  /**
   * Original uploaded filename
   */
  readonly originalName: string;

  /**
   * MIME type of the file
   */
  readonly mimeType: string;

  /**
   * File size in bytes
   */
  readonly size: number;

  /**
   * URL to access the file
   */
  readonly url: string;

  /**
   * URL to thumbnail (for images)
   */
  readonly thumbnailUrl?: string;

  /**
   * File hash for deduplication
   */
  readonly hash?: string;

  /**
   * Upload timestamp
   */
  readonly uploadedAt: string;

  /**
   * Expiration timestamp (for temporary files)
   */
  readonly expiresAt?: string;
}

/**
 * Batch operation response
 *
 * Result of bulk create/update/delete operations
 *
 * @example
 * ```typescript
 * const result: BatchOperationResponse = await api.post('/users/batch-delete', { ids });
 * if (result.failed > 0) {
 *   console.error(`Failed to delete ${result.failed} users`);
 *   result.errors?.forEach(e => console.error(`  ${e.id}: ${e.error}`));
 * }
 * ```
 */
export interface BatchOperationResponse {
  /**
   * Whether all operations succeeded
   */
  readonly success: boolean;

  /**
   * Number of successfully processed items
   */
  readonly processed: number;

  /**
   * Number of failed items
   */
  readonly failed: number;

  /**
   * Total items attempted
   */
  readonly total: number;

  /**
   * Per-item error details
   */
  readonly errors?: ReadonlyArray<{
    readonly index: number;
    readonly id?: string;
    readonly error: string;
    readonly code?: string;
  }>;

  /**
   * IDs of successfully processed items
   */
  readonly successIds?: readonly string[];
}

/**
 * Health check response
 *
 * Used for service health monitoring
 */
export interface HealthCheckResponse {
  /**
   * Overall service health status
   */
  readonly status: 'healthy' | 'degraded' | 'unhealthy';

  /**
   * Service version
   */
  readonly version: string;

  /**
   * Uptime in seconds
   */
  readonly uptime: number;

  /**
   * Current timestamp (ISO 8601)
   */
  readonly timestamp: string;

  /**
   * Individual service health statuses
   */
  readonly services: Readonly<Record<string, {
    readonly status: 'healthy' | 'unhealthy';
    readonly latency?: number;
    readonly message?: string;
    readonly lastCheck?: string;
  }>>;

  /**
   * System metrics
   */
  readonly metrics?: {
    readonly memoryUsage?: number;
    readonly cpuUsage?: number;
    readonly activeConnections?: number;
  };
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Type guard to check if a response is an error response
 *
 * @param response - The response to check
 * @returns True if the response is an error response
 *
 * @example
 * ```typescript
 * const response = await api.get('/users/123');
 * if (isApiErrorResponse(response)) {
 *   console.error(response.error.message);
 * } else {
 *   console.log(response.data);
 * }
 * ```
 */
export function isApiErrorResponse(
  response: unknown
): response is ApiErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    (response as { success: unknown }).success === false &&
    'error' in response
  );
}

/**
 * Type guard to check if a response is a success response
 *
 * @param response - The response to check
 * @returns True if the response is a success response
 */
export function isApiSuccessResponse<T>(
  response: ApiResponse<T> | ApiErrorResponse
): response is ApiResponse<T> {
  return response.success === true;
}

/**
 * Type guard to check if an error is a validation error
 *
 * @param error - The error response to check
 * @returns True if the error is a validation error
 */
export function isValidationErrorResponse(
  response: ApiErrorResponse
): response is ValidationErrorResponse {
  return response.error.code === 'VALIDATION_ERROR';
}

/**
 * Type guard to check if response is paginated
 *
 * @param response - The response to check
 * @returns True if the response has pagination metadata
 */
export function isPaginatedResponse<T>(
  response: ApiResponse<readonly T[]> | ApiResponse<T>
): response is PaginatedResponse<T> {
  return (
    response.meta?.pagination !== undefined &&
    Array.isArray((response as PaginatedResponse<T>).data)
  );
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Extract the data type from an API response
 *
 * @template T - An ApiResponse type
 *
 * @example
 * ```typescript
 * type UserResponse = ApiResponse<User>;
 * type UserData = ExtractApiData<UserResponse>; // User
 * ```
 */
export type ExtractApiData<T> = T extends ApiResponse<infer D> ? D : never;

/**
 * Create an API response type from a data type
 *
 * @template T - The data type
 */
export type WrapInApiResponse<T> = ApiResponse<T>;

/**
 * Create a paginated response type from an item type
 *
 * @template T - The item type
 */
export type WrapInPaginatedResponse<T> = PaginatedResponse<T>;

/**
 * Create a union of success and error response types
 *
 * @template T - The success data type
 */
export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;

/**
 * Unwrap a Promise containing an API response
 *
 * @template T - A Promise<ApiResponse<D>> type
 */
export type UnwrapApiPromise<T> = T extends Promise<ApiResponse<infer D>> ? D : never;
