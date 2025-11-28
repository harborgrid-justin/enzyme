/**
 * @file Auto REST-API Generation Module
 * @description Enterprise-grade automatic REST API generation from folder/file structures
 * with integrated RBAC (Role-Based Access Control).
 *
 * @module @/lib/api/auto
 *
 * This module provides a complete system for automatically generating REST API endpoints
 * from file system conventions, with automatic:
 * - Route scanning and endpoint discovery
 * - HTTP method inference from file patterns
 * - Permission derivation from path structure
 * - RBAC integration for access control
 * - OpenAPI schema generation
 * - Hot reload support for development
 *
 * ## Folder Conventions
 *
 * | Pattern | Type | Example |
 * |---------|------|---------|
 * | `index.ts` | Collection | GET /api/users (list), POST /api/users (create) |
 * | `[param].ts` | Resource | GET/PUT/PATCH/DELETE /api/users/:id |
 * | `create.ts` | Action | POST only |
 * | `(group)/` | Grouping | RBAC inheritance, no path impact |
 * | `_schema.ts` | Schema | OpenAPI schema definition |
 * | `_middleware.ts` | Middleware | Route middleware |
 * | `_access.ts` | Access | Access control override |
 *
 * ## Group Modifiers
 *
 * | Group | Effect |
 * |-------|--------|
 * | `(public)` | No authentication required |
 * | `(auth)` | Requires authentication |
 * | `(admin)` | Requires admin role |
 * | `(owner)` | Requires resource ownership |
 *
 * @example Basic Usage
 * ```typescript
 * import {
 *   scanApiRoutes,
 *   generateApiEndpoints,
 *   createEndpointRegistry,
 *   createRBACIntegration,
 * } from '@/lib/api/auto';
 *
 * // 1. Scan file system for API routes
 * const routes = await scanApiRoutes('/src/api');
 *
 * // 2. Generate endpoints from routes
 * const endpoints = await generateApiEndpoints(routes);
 *
 * // 3. Create RBAC integration
 * const rbac = createRBACIntegration({
 *   checkPermission: (user, perm) => user.permissions.includes(perm),
 *   checkRole: (user, role) => user.roles.includes(role),
 * });
 *
 * // 4. Create registry with RBAC
 * const registry = createEndpointRegistry({ rbacIntegration: rbac });
 * registry.registerBatch(endpoints);
 *
 * // 5. Use in application
 * const lookup = registry.getByPath('/api/users/123', 'GET');
 * if (lookup) {
 *   const access = await registry.checkAccess(lookup.endpoint.id, userContext);
 *   if (access.allowed) {
 *     // Handle request
 *   }
 * }
 * ```
 *
 * @example OpenAPI Generation
 * ```typescript
 * const spec = registry.generateOpenAPISpec({
 *   title: 'My API',
 *   version: '1.0.0',
 *   description: 'Auto-generated API documentation',
 * });
 *
 * // Serve spec at /api/docs
 * app.get('/api/docs/openapi.json', (req, res) => {
 *   res.json(spec);
 * });
 * ```
 *
 * @example Permission Derivation
 * ```typescript
 * import { derivePermissions } from '@/lib/api/auto';
 *
 * // Derive permissions from path and method
 * const perms = derivePermissions('/api/users/:id', 'PUT');
 * // Result: [{ permission: 'users:update', resource: 'users', action: 'update', ... }]
 *
 * // Nested resources include parent permissions
 * const nestedPerms = derivePermissions('/api/orgs/:orgId/teams/:teamId', 'GET');
 * // Result: [
 * //   { permission: 'teams:read', ... },
 * //   { permission: 'orgs:read', ... },
 * // ]
 * ```
 */

// =============================================================================
// Route Scanner
// =============================================================================

export {
  // Main functions
  scanApiRoutes,
  scanApiRoutesCached,
  clearApiScannerCache,
  invalidateApiScannerCache,
  calculateApiScannerStats,

  // Segment parsing
  parseApiSegment,
  parseGroupModifier,
  classifyApiFile,
  getHttpMethods,
  parseDirectoryPath,
  segmentsToUrlPath,
  extractParamNames,
  extractResourceName,
  extractParentResources,
  extractGroupModifiers,

  // Type guards
  isScannedApiRoute,
  isGroupModifier,

  // Types
  type ApiSegmentType,
  type ParsedApiSegment,
  type GroupModifier,
  type GroupModifierType,
  type ApiFileType,
  type ScannedApiRoute,
  type ApiScannerConfig,
  type ApiScannerStats,

  // Constants
  DEFAULT_API_SCANNER_CONFIG,
} from './route-scanner';

// =============================================================================
// API Generator
// =============================================================================

export {
  // Main functions
  generateApiEndpoints,
  generateEndpoint,
  generateOpenAPISpec,

  // Generator utilities
  generateEndpointId,
  generateOperationId,
  generateDisplayName,
  generateDescription,
  computeAccess,
  generatePathParams,
  generateTags,
  createHandlerConfig,
  getExportNameForMethod,

  // Filtering utilities
  isGeneratedEndpoint,
  isComputedAccess,
  filterEndpointsByAccess,
  getPublicEndpoints,
  getAuthenticatedEndpoints,
  getEndpointsByRole,
  groupEndpointsByResource,

  // Types
  type GeneratedEndpoint,
  type EndpointHandler,
  type EndpointHandlerFn,
  type EndpointContext,
  type EndpointRequest,
  type UserContext,
  type RequestMetadata,
  type ComputedAccess,
  type PermissionScope,
  type ResourceOwnershipCheck,
  type AccessOverride,
  type EndpointSchema,
  type JSONSchemaLike,
  type PathParameter,
  type QueryParameter,
  type MiddlewareConfig,
  type MiddlewareFn,
  type RateLimitConfig,
  type EndpointCacheConfig,
  type DeprecationInfo,
  type ApiGeneratorConfig,
  type EndpointSchemaDefinition,

  // OpenAPI types
  type OpenAPIDocument,
  type OpenAPIInfo,
  type OpenAPIServer,
  type OpenAPIPathItem,
  type OpenAPIOperation,
  type OpenAPIParameter,
  type OpenAPIRequestBody,
  type OpenAPIMediaType,
  type OpenAPIResponse,
  type OpenAPIComponents,
  type OpenAPISecurityScheme,
  type OpenAPITag,

  // Constants
  DEFAULT_GENERATOR_CONFIG,
} from './api-generator';

// =============================================================================
// RBAC Integration
// =============================================================================

export {
  // Main class and factory
  RBACIntegration,
  createRBACIntegration,

  // Permission derivation
  derivePermissions,
  deriveEndpointPermissions,
  extractResourceFromPath,
  extractParentResourcesFromPath,
  getActionFromMethod,
  normalizeAction,

  // Simple checkers
  createSimplePermissionChecker,
  createSimpleRoleChecker,

  // Permission utilities
  buildPermission,
  parsePermission,
  permissionMatches,

  // Type guards
  isRBACCheckResult,
  isDerivedPermission,

  // Types
  type PermissionRule,
  type PermissionTemplate,
  type DerivedPermission,
  type RBACCheckResult,
  type RBACAuditEvent,
  type RBACIntegrationConfig,
  type PermissionCheckContext,

  // Constants
  DEFAULT_RBAC_CONFIG,
  COMMON_PERMISSION_RULES,
} from './rbac-integration';

// =============================================================================
// Endpoint Registry
// =============================================================================

export {
  // Main class and factory
  EndpointRegistry,
  createEndpointRegistry,

  // Global registry
  getGlobalRegistry,
  setGlobalRegistry,
  clearGlobalRegistry,

  // Path matching
  compilePath,
  matchPath,

  // Utility functions
  filterEndpoints,
  findEndpoint,
  groupEndpointsBy,
  sortEndpoints,
  getAllowedMethods,
  pathExists,

  // Hot reload support
  createHotReloadIntegration,
  diffEndpoints,
  applyEndpointDiff,

  // Type guards
  isEndpointLookupResult,
  isPathMatcher,
  isRegistryEvent,

  // Types
  type RegistryEventType,
  type RegistryEvent,
  type RegistryEventPayload,
  type RegistryListener,
  type PathMatcher,
  type PathMatchResult,
  type EndpointLookupResult,
  type EndpointRegistryConfig,
  type RegistryStats,
  type HotReloadHandler,

  // Constants
  DEFAULT_REGISTRY_CONFIG,
} from './endpoint-registry';

// =============================================================================
// Convenience Functions
// =============================================================================

import { scanApiRoutes, type ScannedApiRoute, type ApiScannerConfig } from './route-scanner';
import { generateApiEndpoints, type GeneratedEndpoint, type ApiGeneratorConfig } from './api-generator';
import {
  EndpointRegistry,
  createEndpointRegistry,
  type EndpointRegistryConfig,
} from './endpoint-registry';
import {
  RBACIntegration,
  createRBACIntegration,
  type RBACIntegrationConfig,
} from './rbac-integration';

/**
 * Complete auto API initialization options
 */
export interface AutoApiOptions {
  /** Root directory to scan */
  readonly rootDir: string;
  /** Scanner configuration */
  readonly scanner?: Partial<ApiScannerConfig>;
  /** Generator configuration */
  readonly generator?: Partial<ApiGeneratorConfig>;
  /** Registry configuration */
  readonly registry?: Partial<EndpointRegistryConfig>;
  /** RBAC configuration */
  readonly rbac?: Partial<RBACIntegrationConfig> & Pick<RBACIntegrationConfig, 'checkPermission' | 'checkRole'>;
}

/**
 * Auto API initialization result
 */
export interface AutoApiResult {
  /** Scanned routes */
  readonly routes: ScannedApiRoute[];
  /** Generated endpoints */
  readonly endpoints: GeneratedEndpoint[];
  /** Endpoint registry */
  readonly registry: EndpointRegistry;
  /** RBAC integration (if configured) */
  readonly rbac?: RBACIntegration;
  /** Refresh function for hot reload */
  readonly refresh: () => Promise<void>;
}

/**
 * Initialize complete auto API system
 *
 * This is a convenience function that combines scanning, generation,
 * and registry setup into a single call.
 *
 * @example
 * ```typescript
 * const api = await initializeAutoApi({
 *   rootDir: '/src/api',
 *   rbac: {
 *     checkPermission: (user, perm) => user.permissions.includes(perm),
 *     checkRole: (user, role) => user.roles.includes(role),
 *   },
 * });
 *
 * // Use the registry
 * const lookup = api.registry.getByPath('/api/users', 'GET');
 *
 * // Refresh on file changes
 * await api.refresh();
 * ```
 */
export async function initializeAutoApi(options: AutoApiOptions): Promise<AutoApiResult> {
  // Create RBAC integration if configured
  const rbac = options.rbac
    ? createRBACIntegration(options.rbac)
    : undefined;

  // Create registry
  const registry = createEndpointRegistry({
    ...options.registry,
    rbacIntegration: rbac,
  });

  // Scan routes
  const routes = await scanApiRoutes(options.rootDir, options.scanner);

  // Generate endpoints
  const endpoints = await generateApiEndpoints(routes, options.generator);

  // Register endpoints
  registry.registerBatch(endpoints);

  // Create refresh function
  const refresh = async () => {
    const newRoutes = await scanApiRoutes(options.rootDir, options.scanner);
    const newEndpoints = await generateApiEndpoints(newRoutes, options.generator);

    // Clear and re-register
    registry.clear();
    registry.registerBatch(newEndpoints);
  };

  return {
    routes,
    endpoints,
    registry,
    rbac,
    refresh,
  };
}

/**
 * Quick setup for development with sensible defaults
 *
 * @example
 * ```typescript
 * // Simple setup with no RBAC
 * const api = await quickSetupAutoApi('/src/api');
 *
 * // Check what routes were discovered
 * console.log('Discovered endpoints:', api.registry.size);
 * ```
 */
export async function quickSetupAutoApi(rootDir: string): Promise<AutoApiResult> {
  return initializeAutoApi({ rootDir });
}
