/**
 * API request/response schema utilities
 * @module @missionfabric-js/enzyme-typescript/schema/api
 *
 * @example
 * ```typescript
 * import { createApiSchema, paginatedResponse } from '@missionfabric-js/enzyme-typescript/schema/api';
 *
 * const getUserApi = createApiSchema({
 *   request: { id: z.string() },
 *   response: { id: z.string(), name: z.string() },
 * });
 * ```
 */

import { z } from 'zod';

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  /** Response data */
  data: T;
  /** Success status */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Response metadata */
  meta?: Record<string, unknown>;
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T> {
  /** Array of items */
  items: T[];
  /** Total number of items */
  total: number;
  /** Current page number */
  page: number;
  /** Page size */
  pageSize: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there's a next page */
  hasNext: boolean;
  /** Whether there's a previous page */
  hasPrevious: boolean;
}

/**
 * API error structure
 */
export interface ApiError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Error details */
  details?: Record<string, unknown>;
  /** Validation errors if any */
  validationErrors?: Record<string, string>;
}

/**
 * Create a standard API response schema
 *
 * @param dataSchema - Schema for response data
 * @returns API response schema
 *
 * @example
 * ```typescript
 * const userSchema = z.object({
 *   id: z.string(),
 *   name: z.string(),
 *   email: z.string().email(),
 * });
 *
 * const responseSchema = apiResponse(userSchema);
 *
 * responseSchema.parse({
 *   success: true,
 *   data: { id: '1', name: 'John', email: 'john@example.com' },
 * });
 * ```
 */
export function apiResponse<T extends z.ZodTypeAny>(
  dataSchema: T
): z.ZodObject<{
  data: T;
  success: z.ZodBoolean;
  error: z.ZodOptional<z.ZodString>;
  meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}> {
  return z.object({
    data: dataSchema,
    success: z.boolean(),
    error: z.string().optional(),
    meta: z.record(z.string(), z.unknown()).optional(),
  });
}

/**
 * Create a paginated response schema
 *
 * @param itemSchema - Schema for individual items
 * @returns Paginated response schema
 *
 * @example
 * ```typescript
 * const userSchema = z.object({
 *   id: z.string(),
 *   name: z.string(),
 * });
 *
 * const paginatedUsers = paginatedResponse(userSchema);
 *
 * paginatedUsers.parse({
 *   items: [{ id: '1', name: 'John' }],
 *   total: 100,
 *   page: 1,
 *   pageSize: 10,
 *   totalPages: 10,
 *   hasNext: true,
 *   hasPrevious: false,
 * });
 * ```
 */
export function paginatedResponse<T extends z.ZodTypeAny>(
  itemSchema: T
): z.ZodObject<{
  items: z.ZodArray<T>;
  total: z.ZodNumber;
  page: z.ZodNumber;
  pageSize: z.ZodNumber;
  totalPages: z.ZodNumber;
  hasNext: z.ZodBoolean;
  hasPrevious: z.ZodBoolean;
}> {
  return z.object({
    items: z.array(itemSchema),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrevious: z.boolean(),
  });
}

/**
 * Create an API error schema
 *
 * @returns API error schema
 *
 * @example
 * ```typescript
 * const errorSchema = apiError();
 *
 * errorSchema.parse({
 *   code: 'VALIDATION_ERROR',
 *   message: 'Invalid input',
 *   validationErrors: {
 *     email: 'Invalid email address',
 *   },
 * });
 * ```
 */
export function apiError(): z.ZodObject<{
  code: z.ZodString;
  message: z.ZodString;
  details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
  validationErrors: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}> {
  return z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
    validationErrors: z.record(z.string(), z.string()).optional(),
  });
}

/**
 * Create pagination query parameters schema
 *
 * @param options - Pagination options
 * @returns Pagination query schema
 *
 * @example
 * ```typescript
 * const querySchema = paginationQuery({ defaultPageSize: 20, maxPageSize: 100 });
 *
 * querySchema.parse({ page: 2, pageSize: 50 });
 * // { page: 2, pageSize: 50 }
 *
 * querySchema.parse({});
 * // { page: 1, pageSize: 20 }
 * ```
 */
export function paginationQuery(options?: {
  defaultPage?: number;
  defaultPageSize?: number;
  maxPageSize?: number;
}): z.ZodObject<{
  page: z.ZodDefault<z.ZodNumber>;
  pageSize: z.ZodDefault<z.ZodNumber>;
}> {
  const defaultPage = options?.defaultPage || 1;
  const defaultPageSize = options?.defaultPageSize || 10;
  const maxPageSize = options?.maxPageSize || 100;

  return z.object({
    page: z.coerce.number().min(1).default(defaultPage),
    pageSize: z.coerce.number().min(1).max(maxPageSize).default(defaultPageSize),
  });
}

/**
 * Create sorting query parameters schema
 *
 * @param allowedFields - Array of allowed sort fields
 * @returns Sort query schema
 *
 * @example
 * ```typescript
 * const sortSchema = sortQuery(['name', 'createdAt', 'email']);
 *
 * sortSchema.parse({ sortBy: 'name', sortOrder: 'asc' });
 * // { sortBy: 'name', sortOrder: 'asc' }
 * ```
 */
export function sortQuery<T extends [string, ...string[]]>(
  allowedFields: T
): z.ZodObject<{
  sortBy: z.ZodOptional<z.ZodEnum<T>>;
  sortOrder: z.ZodDefault<z.ZodEnum<['asc', 'desc']>>;
}> {
  return z.object({
    sortBy: z.enum(allowedFields).optional(),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  });
}

/**
 * Create filtering query parameters schema
 *
 * @param filterSchema - Schema for filter fields
 * @returns Filter query schema
 *
 * @example
 * ```typescript
 * const filterSchema = filterQuery(z.object({
 *   status: z.enum(['active', 'inactive']).optional(),
 *   search: z.string().optional(),
 *   minAge: z.coerce.number().optional(),
 * }));
 *
 * filterSchema.parse({ status: 'active', search: 'john' });
 * ```
 */
export function filterQuery<T extends z.ZodRawShape>(
  filterSchema: z.ZodObject<T>
): z.ZodObject<T> {
  return filterSchema;
}

/**
 * Create a complete query parameters schema with pagination, sorting, and filtering
 *
 * @param options - Query options
 * @returns Complete query schema
 *
 * @example
 * ```typescript
 * const querySchema = queryParams({
 *   pagination: { defaultPageSize: 20 },
 *   sort: { allowedFields: ['name', 'createdAt'] },
 *   filter: z.object({
 *     status: z.enum(['active', 'inactive']).optional(),
 *     search: z.string().optional(),
 *   }),
 * });
 *
 * querySchema.parse({
 *   page: 2,
 *   pageSize: 20,
 *   sortBy: 'name',
 *   sortOrder: 'desc',
 *   status: 'active',
 * });
 * ```
 */
export function queryParams<T extends z.ZodRawShape>(options: {
  pagination?: { defaultPage?: number; defaultPageSize?: number; maxPageSize?: number };
  sort?: { allowedFields: [string, ...string[]] };
  filter?: z.ZodObject<T>;
}): z.ZodObject<any> {
  let schema: Record<string, z.ZodTypeAny> = {};

  if (options.pagination) {
    const paginationSchema = paginationQuery(options.pagination);
    schema = { ...schema, ...paginationSchema.shape };
  }

  if (options.sort) {
    const sortSchema = sortQuery(options.sort.allowedFields);
    schema = { ...schema, ...sortSchema.shape };
  }

  if (options.filter) {
    schema = { ...schema, ...options.filter.shape };
  }

  return z.object(schema);
}

/**
 * Create API endpoint schema with request and response validation
 *
 * @param config - Endpoint configuration
 * @returns API endpoint schema
 *
 * @example
 * ```typescript
 * const getUserEndpoint = createApiSchema({
 *   method: 'GET',
 *   path: '/users/:id',
 *   request: {
 *     params: z.object({ id: z.string() }),
 *     query: z.object({ include: z.string().optional() }),
 *   },
 *   response: z.object({
 *     id: z.string(),
 *     name: z.string(),
 *     email: z.string().email(),
 *   }),
 * });
 *
 * // Validate request
 * const validatedRequest = getUserEndpoint.validateRequest({
 *   params: { id: '123' },
 *   query: { include: 'profile' },
 * });
 *
 * // Validate response
 * const validatedResponse = getUserEndpoint.validateResponse(userData);
 * ```
 */
export function createApiSchema<
  TParams extends z.ZodTypeAny = z.ZodUndefined,
  TQuery extends z.ZodTypeAny = z.ZodUndefined,
  TBody extends z.ZodTypeAny = z.ZodUndefined,
  TResponse extends z.ZodTypeAny = z.ZodUnknown
>(config: {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path?: string;
  request?: {
    params?: TParams;
    query?: TQuery;
    body?: TBody;
  };
  response: TResponse;
}): {
  method: string | undefined;
  path: string | undefined;
  schemas: {
    params: TParams | undefined;
    query: TQuery | undefined;
    body: TBody | undefined;
    response: TResponse;
  };
  validateRequest: (req: {
    params?: unknown;
    query?: unknown;
    body?: unknown;
  }) => {
    params?: z.infer<TParams>;
    query?: z.infer<TQuery>;
    body?: z.infer<TBody>;
  };
  validateResponse: (data: unknown) => z.infer<TResponse>;
} {
  return {
    method: config.method,
    path: config.path,
    schemas: {
      params: config.request?.params,
      query: config.request?.query,
      body: config.request?.body,
      response: config.response,
    },
    validateRequest(req) {
      const result: any = {};

      if (config.request?.params && req.params) {
        result.params = config.request.params.parse(req.params);
      }

      if (config.request?.query && req.query) {
        result.query = config.request.query.parse(req.query);
      }

      if (config.request?.body && req.body) {
        result.body = config.request.body.parse(req.body);
      }

      return result;
    },
    validateResponse(data) {
      return config.response.parse(data);
    },
  };
}

/**
 * Create a typed fetch wrapper with request/response validation
 *
 * @param baseUrl - Base API URL
 * @param schema - API schema
 * @returns Typed fetch function
 *
 * @example
 * ```typescript
 * const api = createApiSchema({
 *   method: 'POST',
 *   request: {
 *     body: z.object({ name: z.string(), email: z.string().email() }),
 *   },
 *   response: z.object({ id: z.string(), name: z.string() }),
 * });
 *
 * const fetcher = createTypedFetch('https://api.example.com', api);
 *
 * const user = await fetcher('/users', {
 *   body: { name: 'John', email: 'john@example.com' },
 * });
 * // user is typed as { id: string; name: string }
 * ```
 */
export function createTypedFetch<
  TParams extends z.ZodTypeAny = z.ZodUndefined,
  TQuery extends z.ZodTypeAny = z.ZodUndefined,
  TBody extends z.ZodTypeAny = z.ZodUndefined,
  TResponse extends z.ZodTypeAny = z.ZodUnknown
>(
  baseUrl: string,
  schema: ReturnType<typeof createApiSchema<TParams, TQuery, TBody, TResponse>>
): (
  path: string,
  options?: {
    params?: z.infer<TParams>;
    query?: z.infer<TQuery>;
    body?: z.infer<TBody>;
    headers?: Record<string, string>;
  }
) => Promise<z.infer<TResponse>> {
  return async (path, options = {}) => {
    // Validate request
    const validated = schema.validateRequest({
      params: options.params,
      query: options.query,
      body: options.body,
    });

    // Build URL with query params
    let url = `${baseUrl}${path}`;
    if (validated.query) {
      const queryString = new URLSearchParams(
        Object.entries(validated.query).reduce((acc, [key, value]) => {
          if (value !== undefined) {
            acc[key] = String(value);
          }
          return acc;
        }, {} as Record<string, string>)
      ).toString();

      if (queryString) {
        url += `?${queryString}`;
      }
    }

    // Make request
    const response = await fetch(url, {
      method: schema.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: validated.body ? JSON.stringify(validated.body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();

    // Validate response
    return schema.validateResponse(data);
  };
}

/**
 * Create batch API request schema
 *
 * @param itemSchema - Schema for individual request items
 * @returns Batch request schema
 *
 * @example
 * ```typescript
 * const batchSchema = batchRequest(z.object({
 *   id: z.string(),
 *   action: z.enum(['update', 'delete']),
 * }));
 *
 * batchSchema.parse({
 *   items: [
 *     { id: '1', action: 'update' },
 *     { id: '2', action: 'delete' },
 *   ],
 * });
 * ```
 */
export function batchRequest<T extends z.ZodTypeAny>(
  itemSchema: T
): z.ZodObject<{
  items: z.ZodArray<T>;
}> {
  return z.object({
    items: z.array(itemSchema),
  });
}

/**
 * Create batch API response schema
 *
 * @param itemSchema - Schema for individual response items
 * @returns Batch response schema
 *
 * @example
 * ```typescript
 * const batchResponseSchema = batchResponse(z.object({
 *   id: z.string(),
 *   success: z.boolean(),
 *   error: z.string().optional(),
 * }));
 * ```
 */
export function batchResponse<T extends z.ZodTypeAny>(
  itemSchema: T
): z.ZodObject<{
  results: z.ZodArray<T>;
  successCount: z.ZodNumber;
  failureCount: z.ZodNumber;
}> {
  return z.object({
    results: z.array(itemSchema),
    successCount: z.number(),
    failureCount: z.number(),
  });
}
