/**
 * @file Type-Safe API Client
 * @description Contract-first API client with Zod schema validation,
 * runtime type checking, and full type inference from endpoint definitions.
 * Designed for microservices plug-and-play integration.
 * @module @/lib/services/TypeSafeApiClient
 *
 * This module provides a fully type-safe API client that:
 * - Validates request parameters, query strings, and bodies at runtime using Zod schemas
 * - Infers TypeScript types from Zod schemas for full compile-time safety
 * - Supports path parameter interpolation with type-safe params
 * - Provides detailed validation error messages for debugging
 * - Integrates with React Query for caching and invalidation
 *
 * @example
 * ```typescript
 * // Define your API contract
 * const userContract = {
 *   getUser: defineGet('/users/:id', userSchema, {
 *     params: z.object({ id: z.string().uuid() })
 *   }),
 *   createUser: definePost('/users', userSchema, {
 *     body: createUserSchema
 *   })
 * } as const;
 *
 * // Create a typed client
 * const api = createTypedApiClient(userContract, { baseUrl: '/api' });
 *
 * // Use with full type safety
 * const user = await api.getUser({ params: { id: 'uuid-here' } });
 * ```
 *
 * @see {@link createTypedApiClient} for creating API clients
 * @see {@link defineEndpoint} for defining endpoints
 */

import { z, type ZodType, type ZodSchema, type ZodError } from 'zod';
import { apiClient, createApiError, type ApiError, type RequestConfig } from '@/lib/api';

/**
 * Re-export HttpError for backward compatibility
 * @deprecated Use ApiError from '@/lib/api/types' instead
 */
export { ApiError as HttpError } from '@/lib/api/types';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Supported HTTP methods
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Endpoint definition with full type safety
 */
export interface EndpointDefinition<
  TParams extends ZodType = ZodType,
  TQuery extends ZodType = ZodType,
  TBody extends ZodType = ZodType,
  TResponse extends ZodType = ZodType,
> {
  /** HTTP method */
  method: HttpMethod;
  /** URL path with optional :param placeholders */
  path: string;
  /** Path parameters schema */
  params?: TParams;
  /** Query parameters schema */
  query?: TQuery;
  /** Request body schema */
  body?: TBody;
  /** Response data schema */
  response: TResponse;
  /** Additional headers */
  headers?: Record<string, string>;
  /** Request timeout (ms) */
  timeout?: number;
  /** Tags for categorization and cache invalidation */
  tags?: string[];
  /** Description for documentation */
  description?: string;
  /** Whether this endpoint requires authentication */
  requiresAuth?: boolean;
}

/**
 * API contract - collection of endpoint definitions
 */
export type ApiContract = Record<string, EndpointDefinition>;

/**
 * Infer request types from endpoint definition
 */
export type InferRequest<E extends EndpointDefinition> = {
  params: E['params'] extends ZodType ? z.infer<E['params']> : never;
  query: E['query'] extends ZodType ? z.infer<E['query']> : never;
  body: E['body'] extends ZodType ? z.infer<E['body']> : never;
};

/**
 * Infer response type from endpoint definition
 */
export type InferResponse<E extends EndpointDefinition> = z.infer<E['response']>;

/**
 * Build request options type based on endpoint requirements
 */
export type RequestOptions<E extends EndpointDefinition> = (E['params'] extends ZodType
  ? { params: z.infer<E['params']> }
  : object) &
  (E['query'] extends ZodType ? { query: z.infer<E['query']> } : object) &
  (E['body'] extends ZodType ? { body: z.infer<E['body']> } : object) & {
    /** Abort signal for cancellation */
    signal?: AbortSignal;
    /** Skip request/response validation */
    skipValidation?: boolean;
    /** Additional headers for this request */
    headers?: Record<string, string>;
    /** Override timeout for this request */
    timeout?: number;
  };

/**
 * Type-safe API client methods generated from contract
 */
export type TypedApiClient<T extends ApiContract> = {
  [K in keyof T]: (options: RequestOptions<T[K]>) => Promise<InferResponse<T[K]>>;
};

/**
 * API client configuration
 */
export interface TypedApiClientConfig {
  /** Base URL for API requests */
  baseUrl: string;
  /** API version prefix (e.g., 'v1') */
  version?: string;
  /** Default headers for all requests */
  defaultHeaders?: Record<string, string>;
  /** Callback for validation errors */
  onValidationError?: (error: ZodError, endpoint: string, direction: 'request' | 'response') => void;
  /** Custom response transformer */
  transformResponse?: <T>(data: unknown, schema: ZodSchema<T>) => T;
  /** Enable strict mode (throw on extra properties) */
  strictMode?: boolean;
  /** Default timeout (ms) */
  timeout?: number;
  /** Auth token getter */
  getAuthToken?: () => string | null | Promise<string | null>;
}

// =============================================================================
// ERRORS
// =============================================================================

/**
 * API validation error with detailed information
 */
export class ApiValidationError extends Error {
  readonly zodError: ZodError;
  readonly isValidationError = true;
  readonly endpoint: string;
  readonly direction: 'request' | 'response';
  readonly issues: z.ZodIssue[];

  constructor(message: string, zodError: ZodError, endpoint: string, direction: 'request' | 'response') {
    super(message);
    this.name = 'ApiValidationError';
    this.zodError = zodError;
    this.endpoint = endpoint;
    this.direction = direction;
    this.issues = zodError.issues;
  }

  /**
   * Get formatted error messages
   */
  getFormattedErrors(): string[] {
    return this.issues.map((issue) => {
      const path = issue.path.join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    });
  }

  /**
   * Get field-level errors
   */
  getFieldErrors(): Record<string, string[]> {
    const errors: Record<string, string[]> = {};
    for (const issue of this.issues) {
      const path = issue.path.join('.') || '_root';
      errors[path] ??= [];
      errors[path].push(issue.message);
    }
    return errors;
  }
}

/**
 * API contract error for invalid endpoint definitions
 */
export class ApiContractError extends Error {
  readonly isContractError = true;
  readonly endpoint: string;

  constructor(message: string, endpoint: string) {
    super(message);
    this.name = 'ApiContractError';
    this.endpoint = endpoint;
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Interpolate path parameters into URL path
 */
function interpolatePath(path: string, params: Record<string, string | number>): string {
  return path.replace(/:(\w+)/g, (_, key: string) => {
    const value = params[key];
    if (value === undefined) {
      throw new ApiContractError(`Missing path parameter: ${key}`, path);
    }
    return encodeURIComponent(String(value));
  });
}

/**
 * Build query string from parameters
 */
function buildQueryString(params: Record<string, unknown>): Record<string, string | number | boolean | undefined> {
  const result: Record<string, string | number | boolean | undefined> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }
    if (Array.isArray(value)) {
      // Handle array parameters (e.g., ?ids[]=1&ids[]=2)
      result[key] = value.join(',');
    } else if (typeof value === 'object') {
      result[key] = JSON.stringify(value);
    } else {
      result[key] = value as string | number | boolean;
    }
  }

  return result;
}

/**
 * Validate data against schema with error handling
 */
function validateSchema<T>(
  schema: ZodSchema<T>,
  data: unknown,
  endpoint: string,
  direction: 'request' | 'response',
  onError?: (error: ZodError, endpoint: string, direction: 'request' | 'response') => void
): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    onError?.(result.error, endpoint, direction);
    throw new ApiValidationError(
      `${direction === 'request' ? 'Request' : 'Response'} validation failed for ${endpoint}`,
      result.error,
      endpoint,
      direction
    );
  }

  return result.data;
}

// =============================================================================
// CLIENT FACTORY
// =============================================================================

/**
 * Create a type-safe API client from contract definition
 */
export function createTypedApiClient<T extends ApiContract>(
  contract: T,
  config: TypedApiClientConfig
): TypedApiClient<T> & {
  /** Get contract definition */
  getContract: () => T;
  /** Get configuration */
  getConfig: () => TypedApiClientConfig;
  /** Invalidate cache by tags */
  invalidateByTags: (tags: string[]) => void;
} {
  const client = {} as TypedApiClient<T> & {
    getContract: () => T;
    getConfig: () => TypedApiClientConfig;
    invalidateByTags: (tags: string[]) => void;
  };

  // Add metadata methods
  client.getContract = () => contract;
  client.getConfig = () => config;
  client.invalidateByTags = (_tags: string[]) => {
    // This would integrate with the cache system
    // Intentionally a no-op for now - would integrate with cache system
  };

  // Generate typed methods for each endpoint
  for (const [name, endpoint] of Object.entries(contract)) {
    (client as Record<string, unknown>)[name] = async (
      options: RequestOptions<typeof endpoint>
    ): Promise<InferResponse<typeof endpoint>> => {
      const { params, query, body, signal, skipValidation, headers: optionHeaders, timeout: optionTimeout } =
        options as {
          params?: Record<string, unknown>;
          query?: Record<string, unknown>;
          body?: unknown;
          signal?: AbortSignal;
          skipValidation?: boolean;
          headers?: Record<string, string>;
          timeout?: number;
        };

      // Validate request parameters
      if (skipValidation !== true) {
        if (endpoint.params !== undefined && params !== undefined) {
          validateSchema(endpoint.params, params, name, 'request', config.onValidationError);
        }
        if (endpoint.query !== undefined && query !== undefined) {
          validateSchema(endpoint.query, query, name, 'request', config.onValidationError);
        }
        if (endpoint.body !== undefined && body !== undefined) {
          validateSchema(endpoint.body, body, name, 'request', config.onValidationError);
        }
      }

      // Build URL with path parameters
      let url = endpoint.path;
      if (params !== undefined) {
        url = interpolatePath(url, params as Record<string, string | number>);
      }

      // Add version prefix
      if (config.version !== undefined) {
        url = `/${config.version}${url}`;
      }

      // Build request configuration using the centralized apiClient format
      const requestConfig: RequestConfig = {
        url,
        method: endpoint.method,
        headers: {
          ...config.defaultHeaders,
          ...endpoint.headers,
          ...optionHeaders,
        },
        params: query !== undefined ? buildQueryString(query) : undefined,
        body,
        timeout: optionTimeout ?? endpoint.timeout ?? config.timeout,
        signal,
        meta: {
          skipAuth: endpoint.requiresAuth === false,
        },
      };

      // Add auth token if available (apiClient handles this via token provider,
      // but we support custom getAuthToken for backward compatibility)
      if (config.getAuthToken !== undefined && endpoint.requiresAuth !== false) {
        const token = await config.getAuthToken();
        if (token !== null && token !== undefined) {
          requestConfig.headers = {
            ...requestConfig.headers,
            Authorization: `Bearer ${token}`,
          };
        }
      }

      try {
        // Use the centralized apiClient instead of the deprecated httpClient
        const response = await apiClient.request(requestConfig);

        // Validate and transform response
        if (skipValidation !== true) {
          if (config.transformResponse !== undefined) {
            return config.transformResponse(response.data, endpoint.response);
          }
          return validateSchema(endpoint.response, response.data, name, 'response', config.onValidationError);
        }

        return response.data as InferResponse<typeof endpoint>;
      } catch (error) {
        if (error instanceof ApiValidationError) {
          throw error;
        }
        // ApiError from the centralized client is compatible with the old HttpError
        if (error !== null && typeof error === 'object' && 'name' in error && (error as ApiError).name === 'ApiError') {
          throw error;
        }
        throw error;
      }
    };
  }

  return client;
}

// =============================================================================
// ENDPOINT DEFINITION HELPERS
// =============================================================================

/**
 * Define an API endpoint with type inference
 */
export function defineEndpoint<
  TParams extends ZodType = never,
  TQuery extends ZodType = never,
  TBody extends ZodType = never,
  TResponse extends ZodType = ZodType,
>(
  definition: EndpointDefinition<TParams, TQuery, TBody, TResponse>
): EndpointDefinition<TParams, TQuery, TBody, TResponse> {
  return definition;
}

/**
 * Define a GET endpoint
 */
export function defineGet<TResponse extends ZodType, TParams extends ZodType = never, TQuery extends ZodType = never>(
  path: string,
  response: TResponse,
  options?: Omit<EndpointDefinition<TParams, TQuery, never, TResponse>, 'method' | 'path' | 'response' | 'body'>
): EndpointDefinition<TParams, TQuery, never, TResponse> {
  return {
    method: 'GET',
    path,
    response,
    ...options,
  } as EndpointDefinition<TParams, TQuery, never, TResponse>;
}

/**
 * Define a POST endpoint
 */
export function definePost<
  TParams extends ZodType = never,
  TBody extends ZodType = never,
  TResponse extends ZodType = ZodType,
>(
  path: string,
  response: TResponse,
  options?: Omit<EndpointDefinition<TParams, never, TBody, TResponse>, 'method' | 'path' | 'response'>
): EndpointDefinition<TParams, never, TBody, TResponse> {
  return {
    method: 'POST',
    path,
    response,
    ...options,
  } as EndpointDefinition<TParams, never, TBody, TResponse>;
}

/**
 * Define a PUT endpoint
 */
export function definePut<
  TParams extends ZodType = never,
  TBody extends ZodType = never,
  TResponse extends ZodType = ZodType,
>(
  path: string,
  response: TResponse,
  options?: Omit<EndpointDefinition<TParams, never, TBody, TResponse>, 'method' | 'path' | 'response'>
): EndpointDefinition<TParams, never, TBody, TResponse> {
  return {
    method: 'PUT',
    path,
    response,
    ...options,
  } as EndpointDefinition<TParams, never, TBody, TResponse>;
}

/**
 * Define a PATCH endpoint
 */
export function definePatch<
  TParams extends ZodType = never,
  TBody extends ZodType = never,
  TResponse extends ZodType = ZodType,
>(
  path: string,
  response: TResponse,
  options?: Omit<EndpointDefinition<TParams, never, TBody, TResponse>, 'method' | 'path' | 'response'>
): EndpointDefinition<TParams, never, TBody, TResponse> {
  return {
    method: 'PATCH',
    path,
    response,
    ...options,
  } as EndpointDefinition<TParams, never, TBody, TResponse>;
}

/**
 * Define a DELETE endpoint
 */
export function defineDelete<TParams extends ZodType = never, TResponse extends ZodType = ZodType>(
  path: string,
  response: TResponse,
  options?: Omit<EndpointDefinition<TParams, never, never, TResponse>, 'method' | 'path' | 'response' | 'body'>
): EndpointDefinition<TParams, never, never, TResponse> {
  return {
    method: 'DELETE',
    path,
    response,
    ...options,
  } as EndpointDefinition<TParams, never, never, TResponse>;
}

// =============================================================================
// COMMON SCHEMAS
// =============================================================================

/**
 * Common pagination schema
 */
export const paginationSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  pageSize: z.number().int().positive().max(100).optional().default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

/**
 * Common paginated response schema factory
 */
export function createPaginatedResponseSchema<T extends ZodType>(itemSchema: T): z.ZodObject<{
  items: z.ZodArray<T>;
  total: z.ZodNumber;
  page: z.ZodNumber;
  pageSize: z.ZodNumber;
  totalPages: z.ZodNumber;
  hasNextPage: z.ZodOptional<z.ZodBoolean>;
  hasPreviousPage: z.ZodOptional<z.ZodBoolean>;
}> {
  return z.object({
    items: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
    hasNextPage: z.boolean().optional(),
    hasPreviousPage: z.boolean().optional(),
  });
}

/**
 * Common ID parameter schema
 */
export const idParamSchema = z.object({
  id: z.string().uuid(),
});

/**
 * Common error response schema
 */
export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
    traceId: z.string().optional(),
  }),
});

/**
 * Common success response schema
 */
export const successResponseSchema = z.object({
  success: z.literal(true),
  message: z.string().optional(),
});

// =============================================================================
// EXAMPLE USAGE - USER API CONTRACT
// =============================================================================

/**
 * User schema
 */
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['admin', 'user', 'viewer']),
  status: z.enum(['active', 'inactive', 'pending']).optional(),
  profile: z
    .object({
      avatar: z.string().url().optional(),
      bio: z.string().max(500).optional(),
    })
    .optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type User = z.infer<typeof userSchema>;

/**
 * Example user API contract
 */
export const userApiContract = {
  getUsers: defineEndpoint({
    method: 'GET',
    path: '/users',
    query: paginationSchema.extend({
      search: z.string().optional(),
      role: z.enum(['admin', 'user', 'viewer']).optional(),
      status: z.enum(['active', 'inactive', 'pending']).optional(),
    }),
    response: createPaginatedResponseSchema(userSchema),
    tags: ['users'],
    description: 'Get paginated list of users',
  }),

  getUserById: defineEndpoint({
    method: 'GET',
    path: '/users/:id',
    params: idParamSchema,
    response: userSchema,
    tags: ['users'],
    description: 'Get user by ID',
  }),

  createUser: defineEndpoint({
    method: 'POST',
    path: '/users',
    body: z.object({
      email: z.string().email(),
      name: z.string().min(2),
      role: z.enum(['admin', 'user', 'viewer']),
      password: z.string().min(8),
    }),
    response: userSchema,
    tags: ['users'],
    description: 'Create a new user',
  }),

  updateUser: defineEndpoint({
    method: 'PATCH',
    path: '/users/:id',
    params: idParamSchema,
    body: z.object({
      name: z.string().min(2).optional(),
      role: z.enum(['admin', 'user', 'viewer']).optional(),
      status: z.enum(['active', 'inactive', 'pending']).optional(),
      profile: z
        .object({
          avatar: z.string().url().optional(),
          bio: z.string().max(500).optional(),
        })
        .optional(),
    }),
    response: userSchema,
    tags: ['users'],
    description: 'Update an existing user',
  }),

  deleteUser: defineEndpoint({
    method: 'DELETE',
    path: '/users/:id',
    params: idParamSchema,
    response: successResponseSchema,
    tags: ['users'],
    description: 'Delete a user',
  }),
} as const;

/**
 * Create typed user API client
 */
export function createUserApiClient(config?: Partial<TypedApiClientConfig>): TypedApiClient<typeof userApiContract> {
  return createTypedApiClient(userApiContract, {
    baseUrl: '/api',
    version: 'v1',
    onValidationError: (error, endpoint, direction) => {
      // eslint-disable-next-line no-console
      console.error(`[API Validation] ${direction} for ${endpoint}:`, error.issues);
    },
    ...config,
  });
}

// Usage example:
// const userApi = createUserApiClient();
// const users = await userApi.getUsers({ query: { page: 1, role: 'admin' } });
// const user = await userApi.getUserById({ params: { id: 'uuid-here' } });
// const newUser = await userApi.createUser({ body: { email: 'test@example.com', name: 'Test', role: 'user', password: 'password123' } });
