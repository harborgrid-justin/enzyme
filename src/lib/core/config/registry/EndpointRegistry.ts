/**
 * @fileoverview REST API Endpoint Registry with dynamic discovery and health tracking.
 *
 * The EndpointRegistry provides:
 * - Centralized endpoint registration and lookup
 * - Dynamic endpoint discovery at runtime
 * - Endpoint health tracking
 * - URL building with path params and query strings
 * - Change subscription for endpoint updates
 *
 * @module core/config/registry/EndpointRegistry
 */

import { z } from 'zod';

import type {
  EndpointDefinition,
  EndpointHealth,
  EndpointHealthStatus,
  EndpointChangeEvent,
  EndpointChangeListener,
  Unsubscribe,
  IEndpointRegistry,
  Milliseconds,
  HttpMethod,
} from '../types';

import { DEFAULT_TIMEOUT, DEFAULT_MAX_RETRY_ATTEMPTS } from '../constants';

// =============================================================================
// Zod Schemas for JSON Validation
// =============================================================================

/**
 * Zod schema for HTTP method validation
 */
const HttpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

/**
 * Zod schema for cache strategy validation
 */
const CacheStrategySchema = z.enum(['no-cache', 'cache-first', 'network-first', 'stale-while-revalidate']);

/**
 * Zod schema for endpoint cache configuration
 */
const EndpointCacheConfigSchema = z.object({
  strategy: CacheStrategySchema,
  ttl: z.number().positive(),
  tags: z.array(z.string()).optional(),
  varyByUser: z.boolean().optional(),
}).strict();

/**
 * Zod schema for endpoint rate limit configuration
 */
const EndpointRateLimitSchema = z.object({
  requests: z.number().positive().int(),
  window: z.number().positive(),
  scope: z.enum(['user', 'global']),
}).strict();

/**
 * Zod schema for endpoint definition validation.
 * Validates imported JSON before processing.
 */
const EndpointDefinitionSchema = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
  method: HttpMethodSchema,
  description: z.string().optional(),
  version: z.string().optional(),
  auth: z.boolean(),
  timeout: z.number().positive().optional(),
  retries: z.number().int().min(0).optional(),
  cache: EndpointCacheConfigSchema.optional(),
  rateLimit: EndpointRateLimitSchema.optional(),
  tags: z.array(z.string()).optional(),
  baseUrl: z.string().url().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  requestSchema: z.unknown().optional(),
  responseSchema: z.unknown().optional(),
  deprecated: z.boolean().optional(),
  deprecationMessage: z.string().optional(),
  replacedBy: z.string().optional(),
}).strict();

/**
 * Zod schema for endpoint health status
 */
const EndpointHealthStatusSchema = z.enum(['healthy', 'degraded', 'unhealthy', 'unknown']);

/**
 * Zod schema for endpoint health validation
 */
const EndpointHealthSchema = z.object({
  status: EndpointHealthStatusSchema,
  lastSuccess: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
  lastFailure: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
  failureCount: z.number().int().min(0),
  avgResponseTime: z.number().positive().optional(),
  errorMessage: z.string().optional(),
}).strict();

/**
 * Zod schema for the complete JSON import structure
 */
const EndpointRegistryImportSchema = z.object({
  endpoints: z.array(EndpointDefinitionSchema),
  health: z.record(z.string(), EndpointHealthSchema).optional(),
}).strict();

// =============================================================================
// Default Endpoint Configuration
// =============================================================================

const DEFAULT_ENDPOINT_HEALTH: EndpointHealth = {
  status: 'unknown',
  failureCount: 0,
};

const UNHEALTHY_THRESHOLD = 5;        // Failures before marking unhealthy
const DEGRADED_THRESHOLD = 2;         // Failures before marking degraded
const HEALTH_RECOVERY_THRESHOLD = 3;  // Successes to recover from unhealthy

// =============================================================================
// EndpointRegistry Implementation
// =============================================================================

/**
 * Centralized registry for REST API endpoints.
 *
 * Provides comprehensive endpoint management including:
 * - Registration and lookup
 * - Health tracking
 * - Dynamic URL building
 * - Change subscriptions
 *
 * @example
 * ```typescript
 * const registry = EndpointRegistry.getInstance();
 *
 * // Register an endpoint
 * registry.register({
 *   name: 'users.list',
 *   path: '/users',
 *   method: 'GET',
 *   auth: true,
 *   cache: { strategy: 'cache-first', ttl: 300000 },
 * });
 *
 * // Build URL with params
 * const url = registry.buildUrl('users.detail', { id: '123' });
 * // Result: '/users/123'
 *
 * // Track health
 * registry.markHealthy('users.list', 150); // 150ms response time
 * registry.markUnhealthy('users.list', 'Connection timeout');
 * ```
 */
export class EndpointRegistry implements IEndpointRegistry {
  private static instance: EndpointRegistry | null = null;

  private endpoints: Map<string, EndpointDefinition> = new Map();
  private health: Map<string, EndpointHealth> = new Map();
  private successCounts: Map<string, number> = new Map();
  private responseTimes: Map<string, number[]> = new Map();
  private listeners: Set<EndpointChangeListener> = new Set();
  private baseUrl = '';

  private constructor() {}

  /**
   * Get the singleton instance.
   */
  static getInstance(): EndpointRegistry {
    if (!EndpointRegistry.instance) {
      EndpointRegistry.instance = new EndpointRegistry();
    }
    return EndpointRegistry.instance;
  }

  /**
   * Reset the singleton instance (for testing).
   */
  static resetInstance(): void {
    EndpointRegistry.instance = null;
  }

  // ===========================================================================
  // Configuration
  // ===========================================================================

  /**
   * Set the base URL for all endpoints.
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Get the current base URL.
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  // ===========================================================================
  // Registration
  // ===========================================================================

  /**
   * Register a new endpoint.
   */
  register(definition: EndpointDefinition): void {
    const existing = this.endpoints.get(definition.name);

    // Apply defaults
    const endpoint: EndpointDefinition = {
      ...definition,
      timeout: definition.timeout ?? DEFAULT_TIMEOUT,
      retries: definition.retries ?? DEFAULT_MAX_RETRY_ATTEMPTS,
      auth: definition.auth ?? true,
    };

    this.endpoints.set(definition.name, endpoint);
    this.health.set(definition.name, { ...DEFAULT_ENDPOINT_HEALTH });

    this.emitEvent({
      type: existing ? 'updated' : 'registered',
      name: definition.name,
      endpoint,
      timestamp: new Date(),
    });

    // Log deprecation warning
    if (definition.deprecated) {
      console.warn(
        `[EndpointRegistry] Endpoint "${definition.name}" is deprecated.`,
        definition.deprecationMessage ?? '',
        definition.replacedBy ? `Use "${definition.replacedBy}" instead.` : ''
      );
    }
  }

  /**
   * Register multiple endpoints at once.
   */
  registerBatch(definitions: readonly EndpointDefinition[]): void {
    for (const definition of definitions) {
      this.register(definition);
    }
  }

  /**
   * Register endpoints from an object (for easy migration from existing patterns).
   */
  registerFromObject(
    obj: Record<string, string | ((id: string) => string)>,
    options: {
      method?: HttpMethod;
      auth?: boolean;
      prefix?: string;
      tags?: string[];
    } = {}
  ): void {
    const { method = 'GET', auth = true, prefix = '', tags = [] } = options;

    for (const [name, pathOrFn] of Object.entries(obj)) {
      const isFunction = typeof pathOrFn === 'function';
      const path = isFunction ? pathOrFn(':id') : pathOrFn;

      this.register({
        name: prefix ? `${prefix}.${name}` : name,
        path,
        method,
        auth,
        tags,
      });
    }
  }

  // ===========================================================================
  // Lookup
  // ===========================================================================

  /**
   * Get an endpoint by name.
   */
  get(name: string): EndpointDefinition | undefined {
    return this.endpoints.get(name);
  }

  /**
   * Get all endpoints matching a tag.
   */
  getByTag(tag: string): readonly EndpointDefinition[] {
    return Array.from(this.endpoints.values()).filter(
      (endpoint) => endpoint.tags?.includes(tag)
    );
  }

  /**
   * Get all endpoints matching a path pattern.
   */
  getByPath(pathPattern: string): readonly EndpointDefinition[] {
    const regex = new RegExp(pathPattern.replace(/:[^/]+/g, '[^/]+'));
    return Array.from(this.endpoints.values()).filter((endpoint) =>
      regex.test(endpoint.path)
    );
  }

  /**
   * Get all registered endpoints.
   */
  getAll(): readonly EndpointDefinition[] {
    return Array.from(this.endpoints.values());
  }

  /**
   * Check if an endpoint exists.
   */
  has(name: string): boolean {
    return this.endpoints.has(name);
  }

  // ===========================================================================
  // Modification
  // ===========================================================================

  /**
   * Update an existing endpoint.
   */
  update(name: string, updates: Partial<EndpointDefinition>): void {
    const existing = this.endpoints.get(name);
    if (!existing) {
      console.warn(`[EndpointRegistry] Endpoint "${name}" not found`);
      return;
    }

    const updated: EndpointDefinition = {
      ...existing,
      ...updates,
      name: existing.name, // Name cannot be changed
    };

    this.endpoints.set(name, updated);

    this.emitEvent({
      type: 'updated',
      name,
      endpoint: updated,
      timestamp: new Date(),
    });
  }

  /**
   * Remove an endpoint.
   */
  remove(name: string): void {
    if (!this.endpoints.has(name)) {
      return;
    }

    this.endpoints.delete(name);
    this.health.delete(name);
    this.responseTimes.delete(name);
    this.successCounts.delete(name);

    this.emitEvent({
      type: 'removed',
      name,
      timestamp: new Date(),
    });
  }

  /**
   * Clear all endpoints.
   */
  clear(): void {
    this.endpoints.clear();
    this.health.clear();
    this.responseTimes.clear();
    this.successCounts.clear();
  }

  // ===========================================================================
  // Health Tracking
  // ===========================================================================

  /**
   * Mark an endpoint as healthy after a successful request.
   */
  markHealthy(name: string, responseTime?: Milliseconds): void {
    const currentHealth = this.health.get(name) ?? { ...DEFAULT_ENDPOINT_HEALTH };
    const successCount = (this.successCounts.get(name) ?? 0) + 1;
    this.successCounts.set(name, successCount);

    // Track response time
    if (responseTime !== undefined) {
      const times = this.responseTimes.get(name) ?? [];
      times.push(responseTime);
      // Keep last 100 response times
      if (times.length > 100) {
        times.shift();
      }
      this.responseTimes.set(name, times);
    }

    // Calculate new health status
    let newStatus: EndpointHealthStatus = 'healthy';

    if (currentHealth.status === 'unhealthy' && successCount < HEALTH_RECOVERY_THRESHOLD) {
      newStatus = 'degraded';
    } else if (currentHealth.status === 'degraded' && successCount >= HEALTH_RECOVERY_THRESHOLD) {
      newStatus = 'healthy';
      this.successCounts.set(name, 0); // Reset counter
    }

    const newHealth: EndpointHealth = {
      status: newStatus,
      lastSuccess: new Date(),
      lastFailure: currentHealth.lastFailure,
      failureCount: 0,
      avgResponseTime: this.calculateAvgResponseTime(name),
    };

    this.health.set(name, newHealth);

    if (currentHealth.status !== newStatus) {
      this.emitEvent({
        type: 'health-changed',
        name,
        previousHealth: currentHealth,
        newHealth,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Mark an endpoint as unhealthy after a failed request.
   */
  markUnhealthy(name: string, reason: string): void {
    const currentHealth = this.health.get(name) ?? { ...DEFAULT_ENDPOINT_HEALTH };
    const failureCount = currentHealth.failureCount + 1;
    this.successCounts.set(name, 0); // Reset success counter

    // Determine new status based on failure count
    let newStatus: EndpointHealthStatus = currentHealth.status;
    if (failureCount >= UNHEALTHY_THRESHOLD) {
      newStatus = 'unhealthy';
    } else if (failureCount >= DEGRADED_THRESHOLD) {
      newStatus = 'degraded';
    }

    const newHealth: EndpointHealth = {
      status: newStatus,
      lastSuccess: currentHealth.lastSuccess,
      lastFailure: new Date(),
      failureCount,
      avgResponseTime: currentHealth.avgResponseTime,
      errorMessage: reason,
    };

    this.health.set(name, newHealth);

    if (currentHealth.status !== newStatus) {
      this.emitEvent({
        type: 'health-changed',
        name,
        previousHealth: currentHealth,
        newHealth,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Get health status for an endpoint.
   */
  getHealth(name: string): EndpointHealth | undefined {
    return this.health.get(name);
  }

  /**
   * Get all unhealthy endpoints.
   */
  getUnhealthyEndpoints(): readonly string[] {
    return Array.from(this.health.entries())
      .filter(([, health]) => health.status === 'unhealthy')
      .map(([name]) => name);
  }

  /**
   * Get all degraded endpoints.
   */
  getDegradedEndpoints(): readonly string[] {
    return Array.from(this.health.entries())
      .filter(([, health]) => health.status === 'degraded')
      .map(([name]) => name);
  }

  /**
   * Get all healthy endpoints.
   */
  getHealthyEndpoints(): readonly string[] {
    return Array.from(this.health.entries())
      .filter(([, health]) => health.status === 'healthy')
      .map(([name]) => name);
  }

  /**
   * Calculate average response time for an endpoint.
   */
  private calculateAvgResponseTime(name: string): Milliseconds | undefined {
    const times = this.responseTimes.get(name);
    if (!times || times.length === 0) {
      return undefined;
    }
    return Math.round(times.reduce((a, b) => a + b, 0) / times.length) as Milliseconds;
  }

  // ===========================================================================
  // URL Building
  // ===========================================================================

  /**
   * Build a full URL for an endpoint.
   */
  buildUrl(name: string, params?: Record<string, string | number>): string {
    const endpoint = this.endpoints.get(name);
    if (!endpoint) {
      throw new Error(`[EndpointRegistry] Endpoint "${name}" not found`);
    }

    let url = endpoint.path;

    // Substitute path parameters
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url = url.replace(`:${key}`, encodeURIComponent(String(value)));
      }
    }

    // Use endpoint-specific base URL or global base URL
    const base = endpoint.baseUrl ?? this.baseUrl;
    const fullUrl = base ? `${base}${url.startsWith('/') ? url : `/${url}`}` : url;

    return fullUrl;
  }

  /**
   * Build a URL with query parameters.
   */
  buildUrlWithQuery(
    name: string,
    params?: Record<string, string | number>,
    query?: Record<string, string | number | boolean>
  ): string {
    const url = this.buildUrl(name, params);

    if (!query || Object.keys(query).length === 0) {
      return url;
    }

    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        searchParams.set(key, String(value));
      }
    }

    const queryString = searchParams.toString();
    return queryString ? `${url}?${queryString}` : url;
  }

  // ===========================================================================
  // Subscriptions
  // ===========================================================================

  /**
   * Subscribe to endpoint changes.
   */
  subscribe(listener: EndpointChangeListener): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emitEvent(event: EndpointChangeEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('[EndpointRegistry] Error in change listener:', error);
      }
    }
  }

  // ===========================================================================
  // Serialization
  // ===========================================================================

  /**
   * Export all endpoints as JSON.
   */
  toJSON(): string {
    const data = {
      endpoints: Array.from(this.endpoints.values()),
      health: Object.fromEntries(this.health),
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import endpoints from JSON with schema validation.
   *
   * Validates the imported JSON against a strict Zod schema before processing
   * to prevent injection of malformed or malicious data.
   *
   * @param json - JSON string to import
   * @throws {z.ZodError} If validation fails
   * @throws {SyntaxError} If JSON parsing fails
   */
  fromJSON(json: string): void {
    // Step 1: Parse JSON (may throw SyntaxError)
    let rawData: unknown;
    try {
      rawData = JSON.parse(json);
    } catch (parseError) {
      console.error('[EndpointRegistry] Failed to parse JSON:', parseError);
      throw parseError;
    }

    // Step 2: Validate against Zod schema (may throw ZodError)
    const validationResult = EndpointRegistryImportSchema.safeParse(rawData);

    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join('; ');
      console.error('[EndpointRegistry] JSON validation failed:', errorMessage);
      throw new Error(`[EndpointRegistry] Invalid JSON structure: ${errorMessage}`);
    }

    // Step 3: Process validated data
    const data = validationResult.data;

    this.registerBatch(data.endpoints as EndpointDefinition[]);

    if (data.health) {
      for (const [name, health] of Object.entries(data.health)) {
        this.health.set(name, health as EndpointHealth);
      }
    }
  }

  // ===========================================================================
  // Statistics
  // ===========================================================================

  /**
   * Get registry statistics.
   */
  getStats(): {
    totalEndpoints: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    unknown: number;
    avgResponseTime: Milliseconds | undefined;
  } {
    const healthCounts = {
      healthy: 0,
      degraded: 0,
      unhealthy: 0,
      unknown: 0,
    };

    for (const health of this.health.values()) {
      healthCounts[health.status]++;
    }

    // Calculate overall average response time
    let totalTime = 0;
    let count = 0;
    for (const times of this.responseTimes.values()) {
      for (const time of times) {
        totalTime += time;
        count++;
      }
    }

    return {
      totalEndpoints: this.endpoints.size,
      ...healthCounts,
      avgResponseTime: count > 0 ? (Math.round(totalTime / count) as Milliseconds) : undefined,
    };
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Get the EndpointRegistry singleton instance.
 */
export function getEndpointRegistry(): EndpointRegistry {
  return EndpointRegistry.getInstance();
}

/**
 * Register an endpoint.
 */
export function registerEndpoint(definition: EndpointDefinition): void {
  getEndpointRegistry().register(definition);
}

/**
 * Get an endpoint by name.
 */
export function getEndpoint(name: string): EndpointDefinition | undefined {
  return getEndpointRegistry().get(name);
}

/**
 * Build a URL for an endpoint.
 */
export function buildEndpointUrl(
  name: string,
  params?: Record<string, string | number>,
  query?: Record<string, string | number | boolean>
): string {
  const registry = getEndpointRegistry();
  return query
    ? registry.buildUrlWithQuery(name, params, query)
    : registry.buildUrl(name, params);
}

/**
 * Check endpoint health.
 */
export function isEndpointHealthy(name: string): boolean {
  const health = getEndpointRegistry().getHealth(name);
  return health?.status === 'healthy';
}
