/**
 * @file Resource API Clients
 * @description Domain-specific resource client factories for CRUD operations.
 *
 * **IMPORTANT**: This module provides `createResourceClient` for building domain-specific
 * API clients with caching. For the core HTTP client infrastructure, use `createApiClient`
 * from `@/lib/api` instead.
 *
 * **MIGRATION NOTICE**: This module currently uses the deprecated `httpClient` from './http'.
 * A future version will migrate to use `apiClient` from `@/lib/api` for consistency.
 * New code should prefer using `apiClient` directly or the hooks from `@/lib/api/hooks`.
 *
 * @example
 * ```typescript
 * import { createResourceClient } from '@/lib/services';
 *
 * interface User {
 *   id: string;
 *   name: string;
 *   email: string;
 * }
 *
 * const userClient = createResourceClient<User>({
 *   basePath: '/api/users',
 *   cacheTtl: 5 * 60 * 1000,
 * });
 *
 * // CRUD operations
 * const users = await userClient.getAll({ page: 1 });
 * const user = await userClient.getById('123');
 * ```
 *
 * @see {@link @/lib/api} for the recommended API client
 */

/**
 * @deprecated Use `apiClient` from `@/lib/api` instead.
 * This import is maintained for backward compatibility with existing resource clients.
 */
import { type HttpRequestConfig } from './http';
import { requestCache, type RequestCache } from './cache';
import { apiClient } from '@/lib/api';

/**
 * Resource API response wrapper
 */
export interface ResourceApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
    [key: string]: unknown;
  };
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * List query parameters
 */
export interface ListQueryParams {
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  filter?: Record<string, unknown>;
}

/**
 * Resource client configuration
 *
 * **Note**: This is distinct from `ApiClientConfig` in `@/lib/api/types.ts` which
 * configures the core HTTP client. This interface configures domain-specific
 * resource clients with caching capabilities.
 */
export interface ResourceClientConfig {
  /** Base path for all endpoints */
  basePath: string;

  /** Request cache instance */
  cache?: RequestCache;

  /** Default cache TTL */
  cacheTtl?: number;

  /** Enable caching by default */
  enableCache?: boolean;
}

/**
 * Resource client interface returned by createResourceClient
 *
 * Provides CRUD operations for a specific resource type with built-in caching.
 *
 * **Note**: This is distinct from `ApiClient` class in `@/lib/api` which is the
 * core HTTP client. This interface represents a domain-specific resource client.
 */
export interface ResourceClient<T extends { id: string | number }> {
  getAll(params?: ListQueryParams, options?: { cache?: boolean }): Promise<PaginatedResponse<T>>;
  getById(id: string | number, options?: { cache?: boolean }): Promise<T>;
  create(data: Omit<T, 'id'>): Promise<T>;
  update(id: string | number, data: Partial<T>): Promise<T>;
  replace(id: string | number, data: Omit<T, 'id'>): Promise<T>;
  delete(id: string | number): Promise<void>;
  batchDelete(ids: (string | number)[]): Promise<void>;
  customGet<R>(path: string, params?: Record<string, string | number | boolean | undefined>, options?: { cache?: boolean }): Promise<R>;
  customPost<R>(path: string, body?: unknown, config?: Partial<HttpRequestConfig>): Promise<R>;
  invalidateCache(): void;
}

/**
 * @deprecated Use `createResourceClient` instead. The name `createApiClient` conflicts
 * with `@/lib/api/api-client.ts`. This alias will be removed in a future version.
 */
export const createApiClient = createResourceClient;

/**
 * Create a domain-specific resource client with CRUD operations and caching
 *
 * This factory creates clients for specific API resources (users, posts, etc.)
 * with built-in caching, pagination support, and standard CRUD methods.
 *
 * For the core HTTP client with interceptors, retry logic, and token refresh,
 * use `createApiClient` from `@/lib/api` instead.
 *
 * @param config - Resource client configuration
 * @returns Configured resource client with CRUD operations
 *
 * @example
 * ```typescript
 * const userClient = createResourceClient<User>({
 *   basePath: '/api/users',
 *   cacheTtl: 5 * 60 * 1000, // 5 minutes
 *   enableCache: true,
 * });
 *
 * // Fetch all users with pagination
 * const { items, total, hasMore } = await userClient.getAll({ page: 1, pageSize: 20 });
 *
 * // Fetch single user
 * const user = await userClient.getById('123');
 *
 * // Create new user
 * const newUser = await userClient.create({ name: 'John', email: 'john@example.com' });
 * ```
 */
export function createResourceClient<T extends { id: string | number }>(
  config: ResourceClientConfig
): ResourceClient<T> {
  const {
    basePath,
    cache = requestCache,
    cacheTtl = 5 * 60 * 1000,
    enableCache = true,
  } = config;
  
  /**
   * Build full URL
   */
  function buildUrl(path: string = ''): string {
    return `${basePath}${path}`;
  }
  
  /**
   * Build cache key
   */
  function buildCacheKey(path: string, params?: unknown): string {
    return cache.generateKey(buildUrl(path), params as Record<string, unknown>);
  }
  
  return {
    /**
     * Get all items using apiClient
     * @throws {ApiError} When the request fails
     */
    async getAll(
      params?: ListQueryParams,
      options?: { cache?: boolean }
    ): Promise<PaginatedResponse<T>> {
      const useCache = options?.cache ?? enableCache;
      const cacheKey = buildCacheKey('', params);

      if (useCache === true) {
        const cached = cache.get<PaginatedResponse<T>>(cacheKey);
        if (cached !== null && cached !== undefined) return cached;
      }

      const response = await apiClient.get<ResourceApiResponse<T[]>>(buildUrl(), {
        params: params as Record<string, string | number | boolean | undefined>,
      });

      const result: PaginatedResponse<T> = {
        items: response.data.data,
        total: response.data.meta?.total ?? response.data.data.length,
        page: response.data.meta?.page ?? params?.page ?? 1,
        pageSize: response.data.meta?.pageSize ?? params?.pageSize ?? 20,
        hasMore:
          response.data.meta?.total != null &&
          (params?.page ?? 1) * (params?.pageSize ?? 20) <
            response.data.meta.total,
      };

      if (useCache === true) {
        cache.set(cacheKey, result, cacheTtl);
      }

      return result;
    },
    
    /**
     * Get single item by ID using apiClient
     * @throws {ApiError} When the request fails
     */
    async getById(
      id: string | number,
      options?: { cache?: boolean }
    ): Promise<T> {
      const useCache = options?.cache ?? enableCache;
      const cacheKey = buildCacheKey(`/${id}`);

      if (useCache === true) {
        const cached = cache.get<T>(cacheKey);
        if (cached !== null && cached !== undefined) return cached;
      }

      const response = await apiClient.get<ResourceApiResponse<T>>(buildUrl(`/${id}`));
      const {data} = response.data;

      if (useCache === true) {
        cache.set(cacheKey, data, cacheTtl);
      }

      return data;
    },
    
    /**
     * Create new item using apiClient
     * @throws {ApiError} When the request fails
     */
    async create(data: Omit<T, 'id'>): Promise<T> {
      const response = await apiClient.post<ResourceApiResponse<T>>(buildUrl(), data);

      // Invalidate list cache
      cache.invalidatePattern(new RegExp(`^${basePath}$`));

      return response.data.data;
    },
    
    /**
     * Update existing item using apiClient
     * @throws {ApiError} When the request fails
     */
    async update(id: string | number, data: Partial<T>): Promise<T> {
      const response = await apiClient.patch<ResourceApiResponse<T>>(
        buildUrl(`/${id}`),
        data
      );

      // Invalidate caches
      cache.delete(buildCacheKey(`/${id}`));
      cache.invalidatePattern(new RegExp(`^${basePath}$`));

      return response.data.data;
    },
    
    /**
     * Replace existing item using apiClient
     * @throws {ApiError} When the request fails
     */
    async replace(id: string | number, data: Omit<T, 'id'>): Promise<T> {
      const response = await apiClient.put<ResourceApiResponse<T>>(
        buildUrl(`/${id}`),
        data
      );

      // Invalidate caches
      cache.delete(buildCacheKey(`/${id}`));
      cache.invalidatePattern(new RegExp(`^${basePath}$`));

      return response.data.data;
    },
    
    /**
     * Delete item using apiClient
     * @throws {ApiError} When the request fails
     */
    async delete(id: string | number): Promise<void> {
      await apiClient.delete(buildUrl(`/${id}`));

      // Invalidate caches
      cache.delete(buildCacheKey(`/${id}`));
      cache.invalidatePattern(new RegExp(`^${basePath}$`));
    },
    
    /**
     * Batch delete items using apiClient
     * @throws {ApiError} When any delete request fails
     */
    async batchDelete(ids: (string | number)[]): Promise<void> {
      await Promise.all(ids.map(async id => apiClient.delete(buildUrl(`/${id}`))));

      // Invalidate caches
      ids.forEach(id => cache.delete(buildCacheKey(`/${id}`)));
      cache.invalidatePattern(new RegExp(`^${basePath}$`));
    },
    
    /**
     * Custom GET request using apiClient
     * @throws {ApiError} When the request fails
     */
    async customGet<R>(
      path: string,
      params?: Record<string, string | number | boolean | undefined>,
      options?: { cache?: boolean }
    ): Promise<R> {
      const useCache = options?.cache ?? enableCache;
      const cacheKey = buildCacheKey(path, params);

      if (useCache === true) {
        const cached = cache.get<R>(cacheKey);
        if (cached !== null && cached !== undefined) return cached;
      }

      const response = await apiClient.get<ResourceApiResponse<R>>(buildUrl(path), {
        params,
      });
      const {data} = response.data;

      if (useCache === true) {
        cache.set(cacheKey, data, cacheTtl);
      }

      return data;
    },
    
    /**
     * Custom POST request using apiClient
     * @throws {ApiError} When the request fails
     */
    async customPost<R>(
      path: string,
      body?: unknown,
      _config?: Partial<HttpRequestConfig>
    ): Promise<R> {
      const response = await apiClient.post<ResourceApiResponse<R>>(
        buildUrl(path),
        body
      );
      return response.data.data;
    },
    
    /**
     * Invalidate all caches for this client
     */
    invalidateCache(): void {
      cache.invalidatePattern(new RegExp(`^${basePath}`));
    },
  };
}

/**
 * Pre-configured resource clients for common domains
 */
export const resourceClients = {
  users: createResourceClient<{ id: string; email: string; name: string }>({
    basePath: '/api/users',
  }),

  reports: createResourceClient<{ id: string; title: string; type: string }>({
    basePath: '/api/reports',
  }),

  settings: createResourceClient<{ id: string; key: string; value: unknown }>({
    basePath: '/api/settings',
    cacheTtl: 10 * 60 * 1000, // 10 minutes
  }),
};

/**
 * @deprecated Use `resourceClients` instead. This alias will be removed in a future version.
 */
export const apiClients = resourceClients;

// =============================================================================
// BACKWARD COMPATIBILITY TYPE ALIASES
// =============================================================================

/**
 * @deprecated Use `ResourceApiResponse` instead.
 */
export type ApiResponse<T> = ResourceApiResponse<T>;

/**
 * @deprecated Use `ResourceClientConfig` instead.
 */
export type ApiClientConfig = ResourceClientConfig;

/**
 * @deprecated Use `ResourceClient` instead.
 */
export type ApiClient<T extends { id: string | number }> = ResourceClient<T>;
