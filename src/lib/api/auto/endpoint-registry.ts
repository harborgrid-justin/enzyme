/**
 * @file Centralized API Endpoint Registry
 * @description Central registry for all auto-generated API endpoints with lookup,
 * access control, schema access, and OpenAPI specification generation.
 *
 * @module @/lib/api/auto/endpoint-registry
 *
 * This module provides:
 * - Centralized endpoint registration and lookup
 * - Path-based routing with parameter extraction
 * - Access control integration
 * - OpenAPI specification generation
 * - Event-driven architecture for endpoint changes
 * - Hot reload support for development
 *
 * @example
 * ```typescript
 * import { EndpointRegistry, createEndpointRegistry } from '@/lib/api/auto/endpoint-registry';
 * import { generateApiEndpoints } from './api-generator';
 * import { scanApiRoutes } from './route-scanner';
 *
 * // Create registry
 * const registry = createEndpointRegistry({
 *   rbacIntegration: rbac,
 * });
 *
 * // Scan and register endpoints
 * const routes = await scanApiRoutes('/src/api');
 * const endpoints = await generateApiEndpoints(routes);
 * registry.registerBatch(endpoints);
 *
 * // Lookup endpoint
 * const endpoint = registry.getByPath('/api/users/123', 'GET');
 *
 * // Generate OpenAPI spec
 * const spec = registry.generateOpenAPISpec({
 *   title: 'My API',
 *   version: '1.0.0',
 * });
 * ```
 */

import type { HttpMethod } from '../types';
import type {
  GeneratedEndpoint,
  ComputedAccess,
  UserContext,
  OpenAPIDocument,
  OpenAPIInfo,
  OpenAPIServer,
  JSONSchemaLike,
} from './api-generator';
import { generateOpenAPISpec } from './api-generator';
import type {
  RBACIntegration,
  RBACCheckResult,
  PermissionCheckContext,
} from './rbac-integration';

// =============================================================================
// Types
// =============================================================================

/**
 * Registry event types
 */
export type RegistryEventType =
  | 'endpoint_registered'
  | 'endpoint_unregistered'
  | 'endpoint_updated'
  | 'batch_registered'
  | 'registry_cleared'
  | 'access_checked';

/**
 * Registry event
 */
export interface RegistryEvent {
  /** Event type */
  readonly type: RegistryEventType;
  /** Event timestamp */
  readonly timestamp: number;
  /** Event payload */
  readonly payload: RegistryEventPayload;
}

/**
 * Registry event payload
 */
export type RegistryEventPayload =
  | { endpoint: GeneratedEndpoint }
  | { endpointId: string }
  | { endpoints: GeneratedEndpoint[] }
  | { endpointId: string; userId: string; result: RBACCheckResult }
  | Record<string, never>;

/**
 * Registry event listener
 */
export type RegistryListener = (event: RegistryEvent) => void;

/**
 * Path matcher for URL routing
 */
export interface PathMatcher {
  /** Original path pattern */
  readonly pattern: string;
  /** Compiled regex */
  readonly regex: RegExp;
  /** Parameter names in order */
  readonly paramNames: readonly string[];
  /** Static prefix for fast filtering */
  readonly staticPrefix: string;
  /** Number of segments */
  readonly segmentCount: number;
}

/**
 * Path match result
 */
export interface PathMatchResult {
  /** Whether path matched */
  readonly matched: boolean;
  /** Extracted parameters */
  readonly params: Record<string, string>;
  /** Match score (higher = better match) */
  readonly score: number;
}

/**
 * Endpoint lookup result
 */
export interface EndpointLookupResult {
  /** Found endpoint */
  readonly endpoint: GeneratedEndpoint;
  /** Extracted path parameters */
  readonly params: Record<string, string>;
  /** Match score */
  readonly score: number;
}

/**
 * Registry configuration
 */
export interface EndpointRegistryConfig {
  /** RBAC integration for access control */
  readonly rbacIntegration?: RBACIntegration;
  /** Enable path matching cache */
  readonly enablePathCache: boolean;
  /** Path cache TTL in milliseconds */
  readonly pathCacheTtl: number;
  /** Maximum cache size */
  readonly maxCacheSize: number;
  /** Enable event emission */
  readonly enableEvents: boolean;
  /** Case sensitive path matching */
  readonly caseSensitive: boolean;
  /** Strict trailing slash matching */
  readonly strictTrailingSlash: boolean;
}

/**
 * Default registry configuration
 */
export const DEFAULT_REGISTRY_CONFIG: EndpointRegistryConfig = {
  enablePathCache: true,
  pathCacheTtl: 60000, // 1 minute
  maxCacheSize: 1000,
  enableEvents: true,
  caseSensitive: true,
  strictTrailingSlash: false,
};

/**
 * Registry statistics
 */
export interface RegistryStats {
  /** Total registered endpoints */
  readonly totalEndpoints: number;
  /** Endpoints by HTTP method */
  readonly byMethod: Record<HttpMethod, number>;
  /** Endpoints by tag */
  readonly byTag: Record<string, number>;
  /** Public endpoints */
  readonly publicEndpoints: number;
  /** Protected endpoints */
  readonly protectedEndpoints: number;
  /** Path cache size */
  readonly pathCacheSize: number;
  /** Last update timestamp */
  readonly lastUpdated: number | null;
}

// =============================================================================
// Path Matching
// =============================================================================

/**
 * Compile path pattern to regex
 */
export function compilePath(pattern: string): PathMatcher {
  const paramNames: string[] = [];
  let staticPrefix = '';
  let foundParam = false;

  // Build regex pattern
  const regexParts: string[] = [];
  const segments = pattern.split('/').filter(Boolean);

  for (const segment of segments) {
    // Dynamic parameter :param
    if (segment.startsWith(':')) {
      const paramName = segment.slice(1).replace('?', '');
      paramNames.push(paramName);
      foundParam = true;

      if (segment.endsWith('?')) {
        // Optional parameter
        regexParts.push('(?:\\/([^/]+))?');
      } else {
        regexParts.push('\\/([^/]+)');
      }
    }
    // Catch-all *
    else if (segment === '*') {
      paramNames.push('*');
      foundParam = true;
      regexParts.push('(?:\\/(.*))?');
    }
    // Static segment
    else {
      regexParts.push(`\\/${escapeRegex(segment)}`);
      if (!foundParam) {
        staticPrefix += `/${segment}`;
      }
    }
  }

  const regexStr = `^${regexParts.join('')}\\/?$`;

  return {
    pattern,
    regex: new RegExp(regexStr),
    paramNames,
    staticPrefix: staticPrefix || '/',
    segmentCount: segments.length,
  };
}

/**
 * Match path against pattern
 */
export function matchPath(
  path: string,
  matcher: PathMatcher,
  caseSensitive: boolean = true
): PathMatchResult {
  const testPath = caseSensitive ? path : path.toLowerCase();
  const testPattern = caseSensitive ? matcher.pattern : matcher.pattern.toLowerCase();

  // Quick check: static prefix
  if (matcher.staticPrefix && !testPath.startsWith(caseSensitive ? matcher.staticPrefix : matcher.staticPrefix.toLowerCase())) {
    return { matched: false, params: {}, score: 0 };
  }

  // Regex match
  const match = testPath.match(caseSensitive ? matcher.regex : new RegExp(matcher.regex.source, 'i'));
  if (!match) {
    return { matched: false, params: {}, score: 0 };
  }

  // Extract parameters
  const params: Record<string, string> = {};
  for (let i = 0; i < matcher.paramNames.length; i++) {
    const name = matcher.paramNames[i];
    const value = match[i + 1];
    if (name && value !== undefined) {
      params[name] = decodeURIComponent(value);
    }
  }

  // Calculate match score
  // Higher score = better match (more specific)
  // Static segments score higher than dynamic
  const staticSegments = matcher.pattern.split('/').filter((s) => s && !s.startsWith(':') && s !== '*').length;
  const dynamicSegments = matcher.paramNames.length;
  const score = staticSegments * 10 + dynamicSegments;

  return { matched: true, params, score };
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// =============================================================================
// Endpoint Registry Class
// =============================================================================

/**
 * Centralized API endpoint registry
 */
export class EndpointRegistry {
  private readonly config: EndpointRegistryConfig;
  private readonly endpoints: Map<string, GeneratedEndpoint>;
  private readonly pathMatchers: Map<string, PathMatcher>;
  private readonly pathCache: Map<string, EndpointLookupResult | null>;
  private readonly listeners: Set<RegistryListener>;
  private lastUpdated: number | null = null;

  constructor(config: Partial<EndpointRegistryConfig> = {}) {
    this.config = { ...DEFAULT_REGISTRY_CONFIG, ...config };
    this.endpoints = new Map();
    this.pathMatchers = new Map();
    this.pathCache = new Map();
    this.listeners = new Set();
  }

  // =========================================================================
  // Registration
  // =========================================================================

  /**
   * Register an endpoint
   */
  register(endpoint: GeneratedEndpoint): void {
    const key = this.getEndpointKey(endpoint);

    // Store endpoint
    this.endpoints.set(endpoint.id, endpoint);

    // Compile path matcher
    const matcher = compilePath(endpoint.path);
    this.pathMatchers.set(key, matcher);

    // Invalidate path cache for this path pattern
    this.invalidatePathCache(endpoint.path);

    // Update timestamp
    this.lastUpdated = Date.now();

    // Emit event
    this.emit('endpoint_registered', { endpoint });
  }

  /**
   * Register multiple endpoints
   */
  registerBatch(endpoints: GeneratedEndpoint[]): void {
    for (const endpoint of endpoints) {
      const key = this.getEndpointKey(endpoint);
      this.endpoints.set(endpoint.id, endpoint);
      this.pathMatchers.set(key, compilePath(endpoint.path));
    }

    // Clear path cache
    this.pathCache.clear();

    // Update timestamp
    this.lastUpdated = Date.now();

    // Emit event
    this.emit('batch_registered', { endpoints });
  }

  /**
   * Unregister an endpoint
   */
  unregister(endpointId: string): boolean {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) return false;

    const key = this.getEndpointKey(endpoint);

    this.endpoints.delete(endpointId);
    this.pathMatchers.delete(key);
    this.invalidatePathCache(endpoint.path);

    this.lastUpdated = Date.now();
    this.emit('endpoint_unregistered', { endpointId });

    return true;
  }

  /**
   * Update an endpoint
   */
  update(endpoint: GeneratedEndpoint): boolean {
    if (!this.endpoints.has(endpoint.id)) {
      return false;
    }

    // Remove old matcher if path changed
    const existing = this.endpoints.get(endpoint.id);
    if (existing && existing.path !== endpoint.path) {
      const oldKey = this.getEndpointKey(existing);
      this.pathMatchers.delete(oldKey);
    }

    // Register updated endpoint
    const key = this.getEndpointKey(endpoint);
    this.endpoints.set(endpoint.id, endpoint);
    this.pathMatchers.set(key, compilePath(endpoint.path));
    this.invalidatePathCache(endpoint.path);

    this.lastUpdated = Date.now();
    this.emit('endpoint_updated', { endpoint });

    return true;
  }

  /**
   * Clear all endpoints
   */
  clear(): void {
    this.endpoints.clear();
    this.pathMatchers.clear();
    this.pathCache.clear();
    this.lastUpdated = Date.now();

    this.emit('registry_cleared', {});
  }

  // =========================================================================
  // Lookup
  // =========================================================================

  /**
   * Get endpoint by ID
   */
  getById(id: string): GeneratedEndpoint | undefined {
    return this.endpoints.get(id);
  }

  /**
   * Get endpoint by path and method
   */
  getByPath(path: string, method: HttpMethod): EndpointLookupResult | undefined {
    // Check cache
    const cacheKey = `${method}:${path}`;
    if (this.config.enablePathCache) {
      const cached = this.pathCache.get(cacheKey);
      if (cached !== undefined) {
        return cached ?? undefined;
      }
    }

    // Normalize path
    let normalizedPath = path;
    if (!this.config.strictTrailingSlash) {
      normalizedPath = path.replace(/\/+$/, '') || '/';
    }

    // Find matching endpoint
    let bestMatch: EndpointLookupResult | undefined;

    for (const endpoint of this.endpoints.values()) {
      if (endpoint.method !== method) continue;

      const key = this.getEndpointKey(endpoint);
      const matcher = this.pathMatchers.get(key);
      if (!matcher) continue;

      const result = matchPath(normalizedPath, matcher, this.config.caseSensitive);
      if (result.matched) {
        if (!bestMatch || result.score > bestMatch.score) {
          bestMatch = {
            endpoint,
            params: result.params,
            score: result.score,
          };
        }
      }
    }

    // Cache result
    if (this.config.enablePathCache) {
      this.pathCache.set(cacheKey, bestMatch ?? null);
      this.pruneCache();
    }

    return bestMatch;
  }

  /**
   * Get all endpoints for a path (all methods)
   */
  getByPathAllMethods(path: string): EndpointLookupResult[] {
    const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
    const results: EndpointLookupResult[] = [];

    for (const method of methods) {
      const result = this.getByPath(path, method);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Get endpoints by resource name
   */
  getByResource(resource: string): GeneratedEndpoint[] {
    return Array.from(this.endpoints.values()).filter(
      (e) => e.tags.includes(resource)
    );
  }

  /**
   * Get endpoints by tag
   */
  getByTag(tag: string): GeneratedEndpoint[] {
    return Array.from(this.endpoints.values()).filter(
      (e) => e.tags.includes(tag)
    );
  }

  /**
   * Get all endpoints
   */
  getAll(): GeneratedEndpoint[] {
    return Array.from(this.endpoints.values());
  }

  /**
   * Get all endpoint IDs
   */
  getAllIds(): string[] {
    return Array.from(this.endpoints.keys());
  }

  /**
   * Check if endpoint exists
   */
  has(id: string): boolean {
    return this.endpoints.has(id);
  }

  /**
   * Get endpoint count
   */
  get size(): number {
    return this.endpoints.size;
  }

  // =========================================================================
  // Access Control
  // =========================================================================

  /**
   * Check access to endpoint
   */
  async checkAccess(
    endpointId: string,
    user: UserContext | undefined,
    context?: PermissionCheckContext
  ): Promise<RBACCheckResult> {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) {
      return {
        allowed: false,
        decision: 'deny',
        reason: 'Endpoint not found',
        evaluationTimeMs: 0,
        cacheHit: false,
      };
    }

    if (!this.config.rbacIntegration) {
      // No RBAC integration, allow by default
      return {
        allowed: !endpoint.access.requiresAuth || (user?.isAuthenticated ?? false),
        decision: endpoint.access.requiresAuth && !user?.isAuthenticated ? 'requires_auth' : 'allow',
        reason: 'No RBAC integration configured',
        evaluationTimeMs: 0,
        cacheHit: false,
      };
    }

    const result = await this.config.rbacIntegration.checkAccess(endpoint, user, context);

    // Emit event
    if (user) {
      this.emit('access_checked', {
        endpointId,
        userId: user.id,
        result,
      });
    }

    return result;
  }

  /**
   * Check access by path and method
   */
  async checkAccessByPath(
    path: string,
    method: HttpMethod,
    user: UserContext | undefined
  ): Promise<RBACCheckResult & { endpoint?: GeneratedEndpoint; params?: Record<string, string> }> {
    const lookup = this.getByPath(path, method);
    if (!lookup) {
      return {
        allowed: false,
        decision: 'deny',
        reason: 'Endpoint not found',
        evaluationTimeMs: 0,
        cacheHit: false,
      };
    }

    const result = await this.checkAccess(lookup.endpoint.id, user, { params: lookup.params });

    return {
      ...result,
      endpoint: lookup.endpoint,
      params: lookup.params,
    };
  }

  /**
   * Get required permissions for endpoint
   */
  getRequiredPermissions(endpointId: string): readonly string[] {
    const endpoint = this.endpoints.get(endpointId);
    return endpoint?.access.requiredPermissions ?? [];
  }

  /**
   * Get required roles for endpoint
   */
  getRequiredRoles(endpointId: string): readonly string[] {
    const endpoint = this.endpoints.get(endpointId);
    return endpoint?.access.requiredRoles ?? [];
  }

  // =========================================================================
  // OpenAPI Generation
  // =========================================================================

  /**
   * Generate OpenAPI specification
   */
  generateOpenAPISpec(
    info: OpenAPIInfo,
    servers?: readonly OpenAPIServer[]
  ): OpenAPIDocument {
    const endpoints = Array.from(this.endpoints.values());
    return generateOpenAPISpec(endpoints, info, servers);
  }

  /**
   * Get schema for endpoint
   */
  getSchemaForEndpoint(endpointId: string): {
    request?: JSONSchemaLike;
    response?: JSONSchemaLike;
  } | undefined {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) return undefined;

    return {
      request: endpoint.requestSchema?.schema,
      response: endpoint.responseSchema?.schema,
    };
  }

  // =========================================================================
  // Event System
  // =========================================================================

  /**
   * Subscribe to registry events
   */
  subscribe(listener: RegistryListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit registry event
   */
  private emit(type: RegistryEventType, payload: RegistryEventPayload): void {
    if (!this.config.enableEvents) return;

    const event: RegistryEvent = {
      type,
      timestamp: Date.now(),
      payload,
    };

    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Registry listener error:', error);
      }
    }
  }

  // =========================================================================
  // Statistics
  // =========================================================================

  /**
   * Get registry statistics
   */
  getStats(): RegistryStats {
    const byMethod: Record<HttpMethod, number> = {
      GET: 0,
      POST: 0,
      PUT: 0,
      PATCH: 0,
      DELETE: 0,
      HEAD: 0,
      OPTIONS: 0,
    };

    const byTag: Record<string, number> = {};
    let publicEndpoints = 0;
    let protectedEndpoints = 0;

    for (const endpoint of this.endpoints.values()) {
      byMethod[endpoint.method]++;

      for (const tag of endpoint.tags) {
        byTag[tag] = (byTag[tag] ?? 0) + 1;
      }

      if (endpoint.access.isPublic) {
        publicEndpoints++;
      } else {
        protectedEndpoints++;
      }
    }

    return {
      totalEndpoints: this.endpoints.size,
      byMethod,
      byTag,
      publicEndpoints,
      protectedEndpoints,
      pathCacheSize: this.pathCache.size,
      lastUpdated: this.lastUpdated,
    };
  }

  // =========================================================================
  // Helper Methods
  // =========================================================================

  /**
   * Get endpoint key for path matcher storage
   */
  private getEndpointKey(endpoint: GeneratedEndpoint): string {
    return `${endpoint.method}:${endpoint.path}`;
  }

  /**
   * Invalidate path cache entries matching pattern
   */
  private invalidatePathCache(pathPattern: string): void {
    for (const key of this.pathCache.keys()) {
      const [, path] = key.split(':');
      if (path && this.pathMightMatch(path, pathPattern)) {
        this.pathCache.delete(key);
      }
    }
  }

  /**
   * Quick check if path might match pattern
   */
  private pathMightMatch(path: string, pattern: string): boolean {
    const pathPrefix = path.split('/').slice(0, 3).join('/');
    const patternPrefix = pattern.split('/').slice(0, 3).join('/').replace(/:[^/]+/g, '');
    return path.includes(patternPrefix) || pathPrefix.startsWith(patternPrefix);
  }

  /**
   * Prune cache if it exceeds max size
   */
  private pruneCache(): void {
    if (this.pathCache.size <= this.config.maxCacheSize) return;

    // Remove oldest entries (simple FIFO)
    const entries = Array.from(this.pathCache.keys());
    const toRemove = entries.slice(0, entries.length - this.config.maxCacheSize);
    for (const key of toRemove) {
      this.pathCache.delete(key);
    }
  }

  // =========================================================================
  // Iteration
  // =========================================================================

  /**
   * Iterate over endpoints
   */
  *[Symbol.iterator](): Iterator<GeneratedEndpoint> {
    yield* this.endpoints.values();
  }

  /**
   * Iterate over endpoint entries
   */
  *entries(): IterableIterator<[string, GeneratedEndpoint]> {
    yield* this.endpoints.entries();
  }

  /**
   * Iterate over endpoint IDs
   */
  *keys(): IterableIterator<string> {
    yield* this.endpoints.keys();
  }

  /**
   * Iterate over endpoints
   */
  *values(): IterableIterator<GeneratedEndpoint> {
    yield* this.endpoints.values();
  }

  /**
   * ForEach over endpoints
   */
  forEach(callback: (endpoint: GeneratedEndpoint, id: string) => void): void {
    this.endpoints.forEach(callback);
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create endpoint registry instance
 */
export function createEndpointRegistry(
  config?: Partial<EndpointRegistryConfig>
): EndpointRegistry {
  return new EndpointRegistry(config);
}

/**
 * Create global endpoint registry singleton
 */
let globalRegistry: EndpointRegistry | null = null;

export function getGlobalRegistry(): EndpointRegistry {
  if (!globalRegistry) {
    globalRegistry = createEndpointRegistry();
  }
  return globalRegistry;
}

export function setGlobalRegistry(registry: EndpointRegistry): void {
  globalRegistry = registry;
}

export function clearGlobalRegistry(): void {
  globalRegistry = null;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Filter endpoints by predicate
 */
export function filterEndpoints(
  registry: EndpointRegistry,
  predicate: (endpoint: GeneratedEndpoint) => boolean
): GeneratedEndpoint[] {
  return Array.from(registry).filter(predicate);
}

/**
 * Find endpoint by predicate
 */
export function findEndpoint(
  registry: EndpointRegistry,
  predicate: (endpoint: GeneratedEndpoint) => boolean
): GeneratedEndpoint | undefined {
  for (const endpoint of registry) {
    if (predicate(endpoint)) {
      return endpoint;
    }
  }
  return undefined;
}

/**
 * Group endpoints by custom key
 */
export function groupEndpointsBy<K extends string>(
  registry: EndpointRegistry,
  keyFn: (endpoint: GeneratedEndpoint) => K
): Record<K, GeneratedEndpoint[]> {
  const groups: Record<string, GeneratedEndpoint[]> = {};

  for (const endpoint of registry) {
    const key = keyFn(endpoint);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(endpoint);
  }

  return groups as Record<K, GeneratedEndpoint[]>;
}

/**
 * Sort endpoints by custom comparator
 */
export function sortEndpoints(
  registry: EndpointRegistry,
  compareFn: (a: GeneratedEndpoint, b: GeneratedEndpoint) => number
): GeneratedEndpoint[] {
  return Array.from(registry).sort(compareFn);
}

/**
 * Get allowed methods for path
 */
export function getAllowedMethods(registry: EndpointRegistry, path: string): HttpMethod[] {
  const results = registry.getByPathAllMethods(path);
  return results.map((r) => r.endpoint.method);
}

/**
 * Check if path exists in registry
 */
export function pathExists(registry: EndpointRegistry, path: string): boolean {
  const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  return methods.some((method) => registry.getByPath(path, method) !== undefined);
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard for EndpointLookupResult
 */
export function isEndpointLookupResult(value: unknown): value is EndpointLookupResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'endpoint' in value &&
    'params' in value &&
    'score' in value
  );
}

/**
 * Type guard for PathMatcher
 */
export function isPathMatcher(value: unknown): value is PathMatcher {
  return (
    typeof value === 'object' &&
    value !== null &&
    'pattern' in value &&
    'regex' in value &&
    'paramNames' in value
  );
}

/**
 * Type guard for RegistryEvent
 */
export function isRegistryEvent(value: unknown): value is RegistryEvent {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    'timestamp' in value &&
    'payload' in value
  );
}

// =============================================================================
// Hot Reload Support
// =============================================================================

/**
 * Hot reload handler for development
 */
export interface HotReloadHandler {
  /** Handle added endpoints */
  onAdded: (endpoints: GeneratedEndpoint[]) => void;
  /** Handle removed endpoints */
  onRemoved: (endpointIds: string[]) => void;
  /** Handle updated endpoints */
  onUpdated: (endpoints: GeneratedEndpoint[]) => void;
}

/**
 * Create hot reload integration
 */
export function createHotReloadIntegration(
  registry: EndpointRegistry,
  handler?: Partial<HotReloadHandler>
): () => void {
  return registry.subscribe((event) => {
    switch (event.type) {
      case 'endpoint_registered':
        if (handler?.onAdded && 'endpoint' in event.payload) {
          handler.onAdded([event.payload.endpoint]);
        }
        break;

      case 'batch_registered':
        if (handler?.onAdded && 'endpoints' in event.payload) {
          handler.onAdded(event.payload.endpoints);
        }
        break;

      case 'endpoint_unregistered':
        if (handler?.onRemoved && 'endpointId' in event.payload) {
          handler.onRemoved([event.payload.endpointId]);
        }
        break;

      case 'endpoint_updated':
        if (handler?.onUpdated && 'endpoint' in event.payload) {
          handler.onUpdated([event.payload.endpoint]);
        }
        break;
    }
  });
}

/**
 * Diff two sets of endpoints for hot reload
 */
export function diffEndpoints(
  oldEndpoints: GeneratedEndpoint[],
  newEndpoints: GeneratedEndpoint[]
): {
  added: GeneratedEndpoint[];
  removed: GeneratedEndpoint[];
  updated: GeneratedEndpoint[];
} {
  const oldMap = new Map(oldEndpoints.map((e) => [e.id, e]));
  const newMap = new Map(newEndpoints.map((e) => [e.id, e]));

  const added: GeneratedEndpoint[] = [];
  const removed: GeneratedEndpoint[] = [];
  const updated: GeneratedEndpoint[] = [];

  // Find added and updated
  for (const [id, endpoint] of newMap) {
    const old = oldMap.get(id);
    if (!old) {
      added.push(endpoint);
    } else if (JSON.stringify(old) !== JSON.stringify(endpoint)) {
      updated.push(endpoint);
    }
  }

  // Find removed
  for (const [id, endpoint] of oldMap) {
    if (!newMap.has(id)) {
      removed.push(endpoint);
    }
  }

  return { added, removed, updated };
}

/**
 * Apply diff to registry
 */
export function applyEndpointDiff(
  registry: EndpointRegistry,
  diff: { added: GeneratedEndpoint[]; removed: GeneratedEndpoint[]; updated: GeneratedEndpoint[] }
): void {
  // Remove deleted endpoints
  for (const endpoint of diff.removed) {
    registry.unregister(endpoint.id);
  }

  // Add new endpoints
  for (const endpoint of diff.added) {
    registry.register(endpoint);
  }

  // Update changed endpoints
  for (const endpoint of diff.updated) {
    registry.update(endpoint);
  }
}
