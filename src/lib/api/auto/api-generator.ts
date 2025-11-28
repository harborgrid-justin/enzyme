/**
 * @file REST API Endpoint Generator
 * @description Generates REST endpoints from scanned file system routes with
 * automatic handler binding, schema inference, and middleware integration.
 *
 * @module @/lib/api/auto/api-generator
 *
 * This module transforms scanned API routes into fully configured endpoints
 * with type-safe handlers, request/response schemas, and computed access control.
 *
 * @example
 * ```typescript
 * import { generateApiEndpoints, ApiGenerator } from '@/lib/api/auto/api-generator';
 * import { scanApiRoutes } from './route-scanner';
 *
 * const routes = await scanApiRoutes('/src/api');
 * const endpoints = await generateApiEndpoints(routes, {
 *   handlerResolver: async (filePath) => import(filePath),
 * });
 *
 * for (const endpoint of endpoints) {
 *   console.log(endpoint.method, endpoint.path, endpoint.access);
 * }
 * ```
 */

import type { HttpMethod, ContentType } from '../types';
import type {
  ScannedApiRoute,
  ApiFileType,
} from './route-scanner';

// =============================================================================
// Types
// =============================================================================

/**
 * Generated endpoint with full configuration
 */
export interface GeneratedEndpoint {
  /** Unique endpoint identifier */
  readonly id: string;
  /** HTTP method */
  readonly method: HttpMethod;
  /** URL path pattern (with :params) */
  readonly path: string;
  /** Display name for documentation */
  readonly displayName: string;
  /** Endpoint description */
  readonly description: string;
  /** Source file path */
  readonly sourceFile: string;
  /** Handler configuration */
  readonly handler: EndpointHandler;
  /** Computed access control */
  readonly access: ComputedAccess;
  /** Request schema (if available) */
  readonly requestSchema?: EndpointSchema;
  /** Response schema (if available) */
  readonly responseSchema?: EndpointSchema;
  /** Path parameters */
  readonly pathParams: readonly PathParameter[];
  /** Query parameters (if defined) */
  readonly queryParams?: readonly QueryParameter[];
  /** Middleware chain */
  readonly middleware: readonly MiddlewareConfig[];
  /** Rate limiting configuration */
  readonly rateLimit?: RateLimitConfig;
  /** Caching configuration */
  readonly cache?: EndpointCacheConfig;
  /** Tags for documentation grouping */
  readonly tags: readonly string[];
  /** Deprecation info */
  readonly deprecated?: DeprecationInfo;
  /** OpenAPI operation ID */
  readonly operationId: string;
}

/**
 * Endpoint handler configuration
 */
export interface EndpointHandler {
  /** Source file path */
  readonly file: string;
  /** Export name in the file */
  readonly exportName: string;
  /** Handler function (resolved) */
  readonly fn?: EndpointHandlerFn;
  /** Loader for lazy loading */
  readonly loader?: () => Promise<EndpointHandlerFn>;
  /** Whether handler is async */
  readonly isAsync: boolean;
}

/**
 * Endpoint handler function signature
 */
export type EndpointHandlerFn = (
  context: EndpointContext
) => unknown | Promise<unknown>;

/**
 * Context passed to endpoint handlers
 */
export interface EndpointContext {
  /** HTTP request */
  readonly request: EndpointRequest;
  /** Path parameters */
  readonly params: Record<string, string>;
  /** Query parameters */
  readonly query: Record<string, string | string[]>;
  /** Request body */
  readonly body: unknown;
  /** Request headers */
  readonly headers: Record<string, string>;
  /** User context (from auth) */
  readonly user?: UserContext;
  /** Request metadata */
  readonly meta: RequestMetadata;
}

/**
 * Endpoint request abstraction
 */
export interface EndpointRequest {
  /** HTTP method */
  readonly method: HttpMethod;
  /** Request URL */
  readonly url: string;
  /** URL path */
  readonly path: string;
  /** Content type */
  readonly contentType?: ContentType;
  /** Accept header */
  readonly accept?: string;
}

/**
 * User context from authentication
 */
export interface UserContext {
  /** User ID */
  readonly id: string;
  /** Is authenticated */
  readonly isAuthenticated: boolean;
  /** User roles */
  readonly roles: readonly string[];
  /** User permissions */
  readonly permissions: readonly string[];
  /** Additional user attributes */
  readonly attributes?: Record<string, unknown>;
}

/**
 * Request metadata
 */
export interface RequestMetadata {
  /** Request ID */
  readonly requestId: string;
  /** Correlation ID */
  readonly correlationId?: string;
  /** Request timestamp */
  readonly timestamp: number;
  /** Client IP */
  readonly clientIp?: string;
  /** User agent */
  readonly userAgent?: string;
}

/**
 * Computed access control for endpoint
 */
export interface ComputedAccess {
  /** Is publicly accessible */
  readonly isPublic: boolean;
  /** Requires authentication */
  readonly requiresAuth: boolean;
  /** Required roles */
  readonly requiredRoles: readonly string[];
  /** Required permissions */
  readonly requiredPermissions: readonly string[];
  /** Permission match strategy */
  readonly permissionStrategy: 'any' | 'all';
  /** Role match strategy */
  readonly roleStrategy: 'any' | 'all';
  /** Permission scope */
  readonly scope?: PermissionScope;
  /** Resource ownership check */
  readonly ownershipCheck?: ResourceOwnershipCheck;
  /** Inherited access from parent groups */
  readonly inheritedFrom: readonly string[];
  /** Explicit overrides applied */
  readonly overrides: readonly AccessOverride[];
}

/**
 * Permission scope levels
 */
export type PermissionScope = 'own' | 'team' | 'org' | 'global';

/**
 * Resource ownership check configuration
 */
export interface ResourceOwnershipCheck {
  /** Resource type */
  readonly resourceType: string;
  /** Field containing owner ID */
  readonly ownerField: string;
  /** Path parameter for resource ID */
  readonly resourceIdParam: string;
  /** Field to compare against user ID */
  readonly userIdField?: string;
}

/**
 * Access control override
 */
export interface AccessOverride {
  /** Override source */
  readonly source: 'file' | 'directory' | 'config';
  /** Override path */
  readonly path: string;
  /** Overridden fields */
  readonly fields: Partial<Omit<ComputedAccess, 'inheritedFrom' | 'overrides'>>;
}

/**
 * Endpoint schema definition
 */
export interface EndpointSchema {
  /** JSON Schema */
  readonly schema: JSONSchemaLike;
  /** Content type */
  readonly contentType: ContentType;
  /** Example value */
  readonly example?: unknown;
  /** Multiple examples */
  readonly examples?: Record<string, unknown>;
}

/**
 * Simplified JSON Schema type
 */
export interface JSONSchemaLike {
  readonly type?: string;
  readonly properties?: Record<string, JSONSchemaLike>;
  readonly items?: JSONSchemaLike;
  readonly required?: readonly string[];
  readonly [key: string]: unknown;
}

/**
 * Path parameter definition
 */
export interface PathParameter {
  /** Parameter name */
  readonly name: string;
  /** Parameter description */
  readonly description?: string;
  /** Parameter schema */
  readonly schema: JSONSchemaLike;
  /** Is required */
  readonly required: boolean;
  /** Example value */
  readonly example?: string;
}

/**
 * Query parameter definition
 */
export interface QueryParameter {
  /** Parameter name */
  readonly name: string;
  /** Parameter description */
  readonly description?: string;
  /** Parameter schema */
  readonly schema: JSONSchemaLike;
  /** Is required */
  readonly required: boolean;
  /** Allow multiple values */
  readonly allowMultiple: boolean;
  /** Default value */
  readonly defaultValue?: unknown;
  /** Example value */
  readonly example?: unknown;
}

/**
 * Middleware configuration
 */
export interface MiddlewareConfig {
  /** Middleware name */
  readonly name: string;
  /** Middleware function */
  readonly fn?: MiddlewareFn;
  /** Middleware loader */
  readonly loader?: () => Promise<MiddlewareFn>;
  /** Priority (lower runs first) */
  readonly priority: number;
  /** Middleware options */
  readonly options?: Record<string, unknown>;
}

/**
 * Middleware function signature
 */
export type MiddlewareFn = (
  context: EndpointContext,
  next: () => Promise<unknown>
) => unknown | Promise<unknown>;

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Max requests per window */
  readonly maxRequests: number;
  /** Time window in milliseconds */
  readonly windowMs: number;
  /** Key generator (default: IP-based) */
  readonly keyGenerator?: 'ip' | 'user' | 'custom';
  /** Custom key generator function */
  readonly customKeyGenerator?: (context: EndpointContext) => string;
  /** Skip rate limiting for certain conditions */
  readonly skip?: (context: EndpointContext) => boolean;
}

/**
 * Endpoint cache configuration
 */
export interface EndpointCacheConfig {
  /** Cache TTL in milliseconds */
  readonly ttl: number;
  /** Cache strategy */
  readonly strategy: 'cache-first' | 'network-first' | 'stale-while-revalidate';
  /** Vary by headers */
  readonly varyBy?: readonly string[];
  /** Invalidation tags */
  readonly tags?: readonly string[];
}

/**
 * Deprecation information
 */
export interface DeprecationInfo {
  /** Is deprecated */
  readonly deprecated: boolean;
  /** Deprecation reason */
  readonly reason?: string;
  /** Replacement endpoint */
  readonly replacement?: string;
  /** Sunset date */
  readonly sunsetDate?: string;
}

/**
 * Generator configuration
 */
export interface ApiGeneratorConfig {
  /** Base URL for all endpoints */
  readonly baseUrl: string;
  /** Handler resolver function */
  readonly handlerResolver?: (
    filePath: string,
    exportName: string
  ) => Promise<EndpointHandlerFn | undefined>;
  /** Schema resolver function */
  readonly schemaResolver?: (
    filePath: string
  ) => Promise<EndpointSchemaDefinition | undefined>;
  /** Middleware resolver function */
  readonly middlewareResolver?: (
    filePath: string
  ) => Promise<MiddlewareFn[]>;
  /** Access resolver function (for _access.ts files) */
  readonly accessResolver?: (
    filePath: string
  ) => Promise<Partial<ComputedAccess> | undefined>;
  /** Default rate limit configuration */
  readonly defaultRateLimit?: RateLimitConfig;
  /** Default cache configuration */
  readonly defaultCache?: EndpointCacheConfig;
  /** Generate operation IDs */
  readonly generateOperationIds: boolean;
  /** Enable lazy loading of handlers */
  readonly lazyLoadHandlers: boolean;
}

/**
 * Schema definition from _schema.ts files
 */
export interface EndpointSchemaDefinition {
  readonly [method: string]: {
    readonly request?: JSONSchemaLike;
    readonly response?: JSONSchemaLike;
    readonly pathParams?: Record<string, JSONSchemaLike>;
    readonly queryParams?: Record<string, JSONSchemaLike>;
  };
}

/**
 * Default generator configuration
 */
export const DEFAULT_GENERATOR_CONFIG: ApiGeneratorConfig = {
  baseUrl: '/api',
  generateOperationIds: true,
  lazyLoadHandlers: true,
};

// =============================================================================
// Generator Implementation
// =============================================================================

/**
 * Generate endpoint ID from route and method
 */
export function generateEndpointId(route: ScannedApiRoute, method: HttpMethod): string {
  const pathPart = route.urlPath
    .replace(/^\/api\/?/, '')
    .replace(/[/:]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  return `${method.toLowerCase()}_${pathPart || 'root'}`;
}

/**
 * Generate operation ID for OpenAPI
 */
export function generateOperationId(route: ScannedApiRoute, method: HttpMethod): string {
  const resource = route.resourceName;
  const methodMap: Record<HttpMethod, string> = {
    GET: route.fileType === 'collection' ? 'list' : 'get',
    POST: 'create',
    PUT: 'update',
    PATCH: 'patch',
    DELETE: 'delete',
    HEAD: 'head',
    OPTIONS: 'options',
  };

  const action = methodMap[method] ?? method.toLowerCase();

  if (route.parentResources.length > 0) {
    const parents = route.parentResources.join('_');
    return `${action}_${parents}_${resource}`;
  }

  return `${action}_${resource}`;
}

/**
 * Generate display name for endpoint
 */
export function generateDisplayName(route: ScannedApiRoute, method: HttpMethod): string {
  const resource = capitalize(route.resourceName);
  const methodNames: Record<HttpMethod, string> = {
    GET: route.fileType === 'collection' ? 'List' : 'Get',
    POST: 'Create',
    PUT: 'Update',
    PATCH: 'Patch',
    DELETE: 'Delete',
    HEAD: 'Head',
    OPTIONS: 'Options',
  };

  return `${methodNames[method]} ${resource}`;
}

/**
 * Generate description for endpoint
 */
export function generateDescription(route: ScannedApiRoute, method: HttpMethod): string {
  const resource = route.resourceName;
  const descriptions: Record<HttpMethod, (r: string, isCollection: boolean) => string> = {
    GET: (r, c) => c ? `Retrieve a list of ${r}` : `Retrieve a single ${r} by ID`,
    POST: (r) => `Create a new ${r}`,
    PUT: (r) => `Update an existing ${r}`,
    PATCH: (r) => `Partially update an existing ${r}`,
    DELETE: (r) => `Delete a ${r}`,
    HEAD: (r) => `Check if ${r} exists`,
    OPTIONS: (r) => `Get allowed methods for ${r}`,
  };

  const isCollection = route.fileType === 'collection';
  return descriptions[method](resource, isCollection);
}

/**
 * Compute access control from route
 */
export function computeAccess(
  route: ScannedApiRoute,
  _method: HttpMethod,
  accessOverride?: Partial<ComputedAccess>
): ComputedAccess {
  const modifiers = route.groupModifiers;
  const inheritedFrom: string[] = [];

  // Start with defaults
  let isPublic = false;
  let requiresAuth = true;
  const requiredRoles: string[] = [];
  const requiredPermissions: string[] = [];
  let scope: PermissionScope | undefined;

  // Process group modifiers
  for (const modifier of modifiers) {
    inheritedFrom.push(`(${modifier.name})`);

    switch (modifier.type) {
      case 'public':
        isPublic = true;
        requiresAuth = false;
        break;

      case 'auth':
        requiresAuth = true;
        break;

      case 'role':
        if (modifier.value != null && modifier.value !== '') {
          requiredRoles.push(modifier.value);
        }
        break;

      case 'permission':
        if (modifier.value != null && modifier.value !== '') {
          requiredPermissions.push(modifier.value);
        }
        break;

      case 'scope':
        if (modifier.value != null && modifier.value !== '') {
          scope = modifier.value as PermissionScope;
        }
        break;
    }
  }

  // Build overrides list
  const overrides: AccessOverride[] = [];

  // Apply access override if provided
  if (accessOverride) {
    overrides.push({
      source: 'file',
      path: route.filePath,
      fields: accessOverride,
    });
  }

  // Merge with override
  const base: ComputedAccess = {
    isPublic: accessOverride?.isPublic ?? isPublic,
    requiresAuth: accessOverride?.requiresAuth ?? requiresAuth,
    requiredRoles: accessOverride?.requiredRoles ?? requiredRoles,
    requiredPermissions: accessOverride?.requiredPermissions ?? requiredPermissions,
    permissionStrategy: accessOverride?.permissionStrategy ?? 'any',
    roleStrategy: accessOverride?.roleStrategy ?? 'any',
    scope: accessOverride?.scope ?? scope,
    ownershipCheck: accessOverride?.ownershipCheck,
    inheritedFrom,
    overrides,
  };

  return base;
}

/**
 * Generate path parameters from route
 */
export function generatePathParams(route: ScannedApiRoute): readonly PathParameter[] {
  return route.paramNames.map((name) => ({
    name,
    description: `${capitalize(name)} identifier`,
    schema: { type: 'string' },
    required: true,
    example: name === 'id' ? '123' : `example-${name}`,
  }));
}

/**
 * Generate tags from route
 */
export function generateTags(route: ScannedApiRoute): readonly string[] {
  const tags: string[] = [route.resourceName];

  if (route.parentResources.length > 0) {
    tags.unshift(...route.parentResources);
  }

  // Add modifier-based tags
  for (const modifier of route.groupModifiers) {
    if (modifier.type === 'role') {
      tags.push(`role:${modifier.value}`);
    }
  }

  return tags;
}

/**
 * Create endpoint handler configuration
 */
export function createHandlerConfig(
  route: ScannedApiRoute,
  method: HttpMethod,
  config: ApiGeneratorConfig
): EndpointHandler {
  const exportName = getExportNameForMethod(route.fileType, method);

  return {
    file: route.filePath,
    exportName,
    isAsync: true,
    loader: config.lazyLoadHandlers
      ? async () => {
          if (config.handlerResolver) {
            const handler = await config.handlerResolver(route.filePath, exportName);
            if (!handler) {
              throw new Error(`Handler not found for ${route.filePath}`);
            }
            return handler;
          }
          throw new Error('Handler resolver not configured');
        }
      : undefined,
  };
}

/**
 * Get export name for HTTP method
 */
export function getExportNameForMethod(_fileType: ApiFileType, method: HttpMethod): string {
  // Common pattern: export named handlers for each method
  const methodExports: Record<HttpMethod, string> = {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    PATCH: 'PATCH',
    DELETE: 'DELETE',
    HEAD: 'HEAD',
    OPTIONS: 'OPTIONS',
  };

  return methodExports[method];
}

/**
 * Generate a single endpoint from route and method
 */
export async function generateEndpoint(
  route: ScannedApiRoute,
  method: HttpMethod,
  config: ApiGeneratorConfig
): Promise<GeneratedEndpoint> {
  // Resolve access override if _access.ts exists
  let accessOverride: Partial<ComputedAccess> | undefined;
  if (route.hasAccessOverride && config.accessResolver) {
    const accessPath = route.filePath.replace(/[^/\\]+$/, '_access.ts');
    accessOverride = await config.accessResolver(accessPath);
  }

  // Resolve schema if _schema.ts exists
  let requestSchema: EndpointSchema | undefined;
  let responseSchema: EndpointSchema | undefined;
  let queryParams: readonly QueryParameter[] | undefined;

  if (route.hasSchema && config.schemaResolver) {
    const schemaPath = route.filePath.replace(/[^/\\]+$/, '_schema.ts');
    const schemaDef = await config.schemaResolver(schemaPath);
    const methodSchema = schemaDef?.[method.toLowerCase()];

    if (methodSchema) {
      if (methodSchema.request) {
        requestSchema = {
          schema: methodSchema.request,
          contentType: 'application/json',
        };
      }
      if (methodSchema.response) {
        responseSchema = {
          schema: methodSchema.response,
          contentType: 'application/json',
        };
      }
      if (methodSchema.queryParams) {
        queryParams = Object.entries(methodSchema.queryParams).map(([name, schema]) => ({
          name,
          schema,
          required: false,
          allowMultiple: schema.type === 'array',
        }));
      }
    }
  }

  // Resolve middleware if _middleware.ts exists
  const middleware: MiddlewareConfig[] = [];
  if (route.hasMiddleware && config.middlewareResolver) {
    const middlewarePath = route.filePath.replace(/[^/\\]+$/, '_middleware.ts');
    const middlewareFns = await config.middlewareResolver(middlewarePath);
    middleware.push(...middlewareFns.map((fn, i) => ({
      name: `middleware_${i}`,
      fn,
      priority: i,
    })));
  }

  const id = generateEndpointId(route, method);
  const operationId = config.generateOperationIds
    ? generateOperationId(route, method)
    : id;

  return {
    id,
    method,
    path: route.urlPath,
    displayName: generateDisplayName(route, method),
    description: generateDescription(route, method),
    sourceFile: route.filePath,
    handler: createHandlerConfig(route, method, config),
    access: computeAccess(route, method, accessOverride),
    requestSchema,
    responseSchema,
    pathParams: generatePathParams(route),
    queryParams,
    middleware,
    rateLimit: config.defaultRateLimit,
    cache: method === 'GET' ? config.defaultCache : undefined,
    tags: generateTags(route),
    operationId,
  };
}

/**
 * Generate all endpoints from scanned routes
 */
export async function generateApiEndpoints(
  routes: ScannedApiRoute[],
  config: Partial<ApiGeneratorConfig> = {}
): Promise<GeneratedEndpoint[]> {
  const mergedConfig: ApiGeneratorConfig = {
    ...DEFAULT_GENERATOR_CONFIG,
    ...config,
  };

  const endpoints: GeneratedEndpoint[] = [];

  for (const route of routes) {
    for (const method of route.httpMethods) {
      const endpoint = await generateEndpoint(route, method, mergedConfig);
      endpoints.push(endpoint);
    }
  }

  return endpoints;
}

// =============================================================================
// OpenAPI Generation
// =============================================================================

/**
 * OpenAPI document structure (simplified)
 */
export interface OpenAPIDocument {
  readonly openapi: string;
  readonly info: OpenAPIInfo;
  readonly servers?: readonly OpenAPIServer[];
  readonly paths: Record<string, OpenAPIPathItem>;
  readonly components?: OpenAPIComponents;
  readonly tags?: readonly OpenAPITag[];
}

/**
 * OpenAPI info object
 */
export interface OpenAPIInfo {
  readonly title: string;
  readonly version: string;
  readonly description?: string;
}

/**
 * OpenAPI server object
 */
export interface OpenAPIServer {
  readonly url: string;
  readonly description?: string;
}

/**
 * OpenAPI path item
 */
export interface OpenAPIPathItem {
  readonly get?: OpenAPIOperation;
  readonly post?: OpenAPIOperation;
  readonly put?: OpenAPIOperation;
  readonly patch?: OpenAPIOperation;
  readonly delete?: OpenAPIOperation;
  readonly head?: OpenAPIOperation;
  readonly options?: OpenAPIOperation;
}

/**
 * OpenAPI operation object
 */
export interface OpenAPIOperation {
  readonly operationId: string;
  readonly summary: string;
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly parameters?: readonly OpenAPIParameter[];
  readonly requestBody?: OpenAPIRequestBody;
  readonly responses: Record<string, OpenAPIResponse>;
  readonly security?: readonly Record<string, readonly string[]>[];
  readonly deprecated?: boolean;
}

/**
 * OpenAPI parameter
 */
export interface OpenAPIParameter {
  readonly name: string;
  readonly in: 'path' | 'query' | 'header' | 'cookie';
  readonly required?: boolean;
  readonly description?: string;
  readonly schema: JSONSchemaLike;
}

/**
 * OpenAPI request body
 */
export interface OpenAPIRequestBody {
  readonly required?: boolean;
  readonly content: Record<string, OpenAPIMediaType>;
}

/**
 * OpenAPI media type
 */
export interface OpenAPIMediaType {
  readonly schema: JSONSchemaLike;
  readonly example?: unknown;
}

/**
 * OpenAPI response
 */
export interface OpenAPIResponse {
  readonly description: string;
  readonly content?: Record<string, OpenAPIMediaType>;
}

/**
 * OpenAPI components
 */
export interface OpenAPIComponents {
  readonly schemas?: Record<string, JSONSchemaLike>;
  readonly securitySchemes?: Record<string, OpenAPISecurityScheme>;
}

/**
 * OpenAPI security scheme
 */
export interface OpenAPISecurityScheme {
  readonly type: string;
  readonly scheme?: string;
  readonly bearerFormat?: string;
  readonly name?: string;
  readonly in?: string;
}

/**
 * OpenAPI tag
 */
export interface OpenAPITag {
  readonly name: string;
  readonly description?: string;
}

/**
 * Generate OpenAPI document from endpoints
 */
export function generateOpenAPISpec(
  endpoints: GeneratedEndpoint[],
  info: OpenAPIInfo,
  servers?: readonly OpenAPIServer[]
): OpenAPIDocument {
  const paths: Record<string, OpenAPIPathItem> = {};
  const tags = new Set<string>();

  for (const endpoint of endpoints) {
    // Collect tags
    endpoint.tags.forEach((tag) => tags.add(tag));

    // Convert path to OpenAPI format
    const openApiPath = endpoint.path.replace(/:([^/]+)/g, '{$1}');

    // Initialize path item if needed
    if (!paths[openApiPath]) {
      paths[openApiPath] = {};
    }

    // Build operation
    const operation: OpenAPIOperation = {
      operationId: endpoint.operationId,
      summary: endpoint.displayName,
      description: endpoint.description,
      tags: [...endpoint.tags],
      parameters: [
        ...endpoint.pathParams.map((p) => ({
          name: p.name,
          in: 'path' as const,
          required: p.required,
          description: p.description,
          schema: p.schema,
        })),
        ...(endpoint.queryParams ?? []).map((p) => ({
          name: p.name,
          in: 'query' as const,
          required: p.required,
          description: p.description,
          schema: p.schema,
        })),
      ],
      requestBody: endpoint.requestSchema
        ? {
            required: true,
            content: {
              [endpoint.requestSchema.contentType]: {
                schema: endpoint.requestSchema.schema,
                example: endpoint.requestSchema.example,
              },
            },
          }
        : undefined,
      responses: {
        '200': {
          description: 'Successful response',
          content: endpoint.responseSchema
            ? {
                [endpoint.responseSchema.contentType]: {
                  schema: endpoint.responseSchema.schema,
                  example: endpoint.responseSchema.example,
                },
              }
            : undefined,
        },
        '401': {
          description: 'Unauthorized',
        },
        '403': {
          description: 'Forbidden',
        },
        '404': {
          description: 'Not found',
        },
        '500': {
          description: 'Internal server error',
        },
      },
      security: endpoint.access.requiresAuth
        ? [{ bearerAuth: [] }]
        : undefined,
      deprecated: endpoint.deprecated?.deprecated,
    };

    // Add to path item
    const method = endpoint.method.toLowerCase() as keyof OpenAPIPathItem;
    (paths[openApiPath] as Record<string, OpenAPIOperation>)[method] = operation;
  }

  return {
    openapi: '3.0.3',
    info,
    servers,
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    tags: Array.from(tags).map((name) => ({ name })),
  };
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Type guard for GeneratedEndpoint
 */
export function isGeneratedEndpoint(value: unknown): value is GeneratedEndpoint {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'method' in value &&
    'path' in value &&
    'handler' in value &&
    'access' in value
  );
}

/**
 * Type guard for ComputedAccess
 */
export function isComputedAccess(value: unknown): value is ComputedAccess {
  return (
    typeof value === 'object' &&
    value !== null &&
    'isPublic' in value &&
    'requiresAuth' in value &&
    'requiredRoles' in value &&
    'requiredPermissions' in value
  );
}

/**
 * Filter endpoints by access requirements
 */
export function filterEndpointsByAccess(
  endpoints: GeneratedEndpoint[],
  predicate: (access: ComputedAccess) => boolean
): GeneratedEndpoint[] {
  return endpoints.filter((e) => predicate(e.access));
}

/**
 * Get public endpoints
 */
export function getPublicEndpoints(endpoints: GeneratedEndpoint[]): GeneratedEndpoint[] {
  return filterEndpointsByAccess(endpoints, (a) => a.isPublic);
}

/**
 * Get endpoints requiring authentication
 */
export function getAuthenticatedEndpoints(endpoints: GeneratedEndpoint[]): GeneratedEndpoint[] {
  return filterEndpointsByAccess(endpoints, (a) => a.requiresAuth && !a.isPublic);
}

/**
 * Get endpoints requiring specific role
 */
export function getEndpointsByRole(
  endpoints: GeneratedEndpoint[],
  role: string
): GeneratedEndpoint[] {
  return filterEndpointsByAccess(endpoints, (a) => a.requiredRoles.includes(role));
}

/**
 * Group endpoints by resource
 */
export function groupEndpointsByResource(
  endpoints: GeneratedEndpoint[]
): Record<string, GeneratedEndpoint[]> {
  const groups: Record<string, GeneratedEndpoint[]> = {};

  for (const endpoint of endpoints) {
    const resource = endpoint.tags[0] ?? 'other';
    if (!groups[resource]) {
      groups[resource] = [];
    }
    groups[resource].push(endpoint);
  }

  return groups;
}
