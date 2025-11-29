/**
 * @file RBAC Integration for Auto-Generated APIs
 * @description Automatic Role-Based Access Control integration for generated API endpoints.
 * Derives permissions from route patterns and enforces access control at runtime.
 *
 * @module @/lib/api/auto/rbac-integration
 *
 * This module provides:
 * - Permission derivation from URL paths and HTTP methods
 * - Integration with existing RBAC engine
 * - Runtime access control enforcement
 * - Audit logging for access decisions
 * - Permission caching for performance
 *
 * @example
 * ```typescript
 * import { createRBACIntegration, derivePermissions } from '@/lib/api/auto/rbac-integration';
 *
 * // Derive permissions from endpoint
 * const permissions = derivePermissions('/api/users/:id', 'PUT');
 * // Result: ['users:update']
 *
 * // Create RBAC integration
 * const rbac = createRBACIntegration({
 *   checkPermission: (user, permission) => user.permissions.includes(permission),
 *   checkRole: (user, role) => user.roles.includes(role),
 * });
 *
 * // Check access
 * const allowed = await rbac.checkAccess(endpoint, userContext);
 * ```
 */

import type { HttpMethod } from '../types';
import type {
  GeneratedEndpoint,
  ComputedAccess,
  UserContext,
  PermissionScope,
  ResourceOwnershipCheck,
} from './api-generator';

// =============================================================================
// Types
// =============================================================================

/**
 * Permission derivation rule
 */
export interface PermissionRule {
  /** Rule name */
  readonly name: string;
  /** URL pattern to match */
  readonly pattern: string | RegExp;
  /** HTTP methods this rule applies to */
  readonly methods?: readonly HttpMethod[];
  /** Derived permission template */
  readonly permission: string | PermissionTemplate;
  /** Rule priority (higher = evaluated first) */
  readonly priority: number;
  /** Whether this rule overrides auto-derivation */
  readonly override: boolean;
}

/**
 * Permission template with placeholders
 */
export interface PermissionTemplate {
  /** Resource name (or placeholder like {resource}) */
  readonly resource: string;
  /** Action name (or placeholder like {action}) */
  readonly action: string;
  /** Scope (optional) */
  readonly scope?: PermissionScope;
}

/**
 * Derived permission result
 */
export interface DerivedPermission {
  /** Full permission string (e.g., users:read) */
  readonly permission: string;
  /** Resource part */
  readonly resource: string;
  /** Action part */
  readonly action: string;
  /** Scope if applicable */
  readonly scope?: PermissionScope;
  /** Source of derivation */
  readonly source: 'path' | 'method' | 'rule' | 'override';
  /** Confidence level */
  readonly confidence: 'high' | 'medium' | 'low';
}

/**
 * RBAC check result
 */
export interface RBACCheckResult {
  /** Whether access is allowed */
  readonly allowed: boolean;
  /** Decision type */
  readonly decision: 'allow' | 'deny' | 'requires_auth' | 'requires_role' | 'requires_permission';
  /** Reason for decision */
  readonly reason: string;
  /** Missing roles (if denied) */
  readonly missingRoles?: readonly string[];
  /** Missing permissions (if denied) */
  readonly missingPermissions?: readonly string[];
  /** Matched roles */
  readonly matchedRoles?: readonly string[];
  /** Matched permissions */
  readonly matchedPermissions?: readonly string[];
  /** Evaluation time (ms) */
  readonly evaluationTimeMs: number;
  /** Cache hit */
  readonly cacheHit: boolean;
}

/**
 * RBAC audit event
 */
export interface RBACAuditEvent {
  /** Event ID */
  readonly id: string;
  /** Event timestamp */
  readonly timestamp: number;
  /** Event type */
  readonly type: 'access_check';
  /** Endpoint ID */
  readonly endpointId: string;
  /** HTTP method */
  readonly method: HttpMethod;
  /** Request path */
  readonly path: string;
  /** User ID (if authenticated) */
  readonly userId?: string;
  /** User roles */
  readonly userRoles?: readonly string[];
  /** Required permissions */
  readonly requiredPermissions: readonly string[];
  /** Check result */
  readonly result: RBACCheckResult;
  /** Request metadata */
  readonly metadata?: Record<string, unknown>;
}

/**
 * RBAC integration configuration
 */
export interface RBACIntegrationConfig {
  /** Permission check function */
  readonly checkPermission: (
    user: UserContext,
    permission: string,
    context?: PermissionCheckContext
  ) => boolean | Promise<boolean>;
  /** Role check function */
  readonly checkRole: (
    user: UserContext,
    role: string
  ) => boolean | Promise<boolean>;
  /** Resource ownership check function */
  readonly checkOwnership?: (
    user: UserContext,
    resourceType: string,
    resourceId: string,
    ownerField: string
  ) => boolean | Promise<boolean>;
  /** Custom permission rules */
  readonly customRules?: readonly PermissionRule[];
  /** Enable permission caching */
  readonly enableCache: boolean;
  /** Cache TTL in milliseconds */
  readonly cacheTtl: number;
  /** Enable audit logging */
  readonly enableAudit: boolean;
  /** Audit event handler */
  readonly onAuditEvent?: (event: RBACAuditEvent) => void;
  /** Super admin roles (bypass all checks) */
  readonly superAdminRoles?: readonly string[];
  /** Default behavior when no rules match */
  readonly defaultDecision: 'allow' | 'deny';
  /** Permission separator */
  readonly separator: string;
}

/**
 * Context for permission checks
 */
export interface PermissionCheckContext {
  /** Path parameters */
  readonly params?: Record<string, string>;
  /** Resource being accessed */
  readonly resource?: {
    type: string;
    id?: string;
  };
  /** Request context */
  readonly request?: {
    path: string;
    method: HttpMethod;
  };
}

/**
 * Default RBAC configuration
 */
export const DEFAULT_RBAC_CONFIG: Partial<RBACIntegrationConfig> = {
  enableCache: true,
  cacheTtl: 60000, // 1 minute
  enableAudit: true,
  superAdminRoles: ['super-admin', 'superadmin'],
  defaultDecision: 'deny',
  separator: ':',
};

// =============================================================================
// Permission Derivation
// =============================================================================

/**
 * HTTP method to permission action mapping
 */
const METHOD_TO_ACTION: Record<HttpMethod, string> = {
  GET: 'read',
  POST: 'create',
  PUT: 'update',
  PATCH: 'update',
  DELETE: 'delete',
  HEAD: 'read',
  OPTIONS: 'read',
};

/**
 * Action aliases for common patterns
 */
const ACTION_ALIASES: Record<string, string> = {
  list: 'read',
  get: 'read',
  fetch: 'read',
  retrieve: 'read',
  add: 'create',
  new: 'create',
  edit: 'update',
  modify: 'update',
  change: 'update',
  remove: 'delete',
  destroy: 'delete',
};

/**
 * Extract resource name from URL path
 */
export function extractResourceFromPath(path: string): string {
  // Remove base path (/api) and parameters
  const cleanPath = path
    .replace(/^\/api\/?/, '')
    .replace(/:[^/]+/g, '')  // Remove :param
    .replace(/\{[^}]+\}/g, '') // Remove {param}
    .replace(/\/+/g, '/')    // Normalize slashes
    .replace(/^\/|\/$/g, ''); // Trim slashes

  // Get the last meaningful segment
  const segments = cleanPath.split('/').filter(Boolean);

  // Find the last non-empty segment
  for (let i = segments.length - 1; i >= 0; i--) {
    const segment = segments[i];
    if ((segment != null && segment !== '') && !segment.startsWith(':') && !segment.startsWith('{')) {
      return segment;
    }
  }

  return 'resource';
}

/**
 * Extract parent resources from URL path
 */
export function extractParentResourcesFromPath(path: string): readonly string[] {
  const cleanPath = path
    .replace(/^\/api\/?/, '')
    .replace(/:[^/]+/g, '')
    .replace(/\{[^}]+\}/g, '')
    .replace(/\/+/g, '/')
    .replace(/^\/|\/$/g, '');

  const segments = cleanPath.split('/').filter(Boolean);

  // All segments except the last are parents
  return segments.slice(0, -1);
}

/**
 * Get permission action from HTTP method
 */
export function getActionFromMethod(method: HttpMethod): string {
  return METHOD_TO_ACTION[method] ?? 'read';
}

/**
 * Normalize action name
 */
export function normalizeAction(action: string): string {
  const lower = action.toLowerCase();
  return ACTION_ALIASES[lower] ?? lower;
}

/**
 * Derive permissions from endpoint path and method
 */
export function derivePermissions(
  path: string,
  method: HttpMethod,
  config?: Partial<RBACIntegrationConfig>
): DerivedPermission[] {
  const separator = config?.separator ?? ':';
  const resource = extractResourceFromPath(path);
  const action = getActionFromMethod(method);
  const parents = extractParentResourcesFromPath(path);

  const permissions: DerivedPermission[] = [];

  // Primary permission: resource:action
  permissions.push({
    permission: `${resource}${separator}${action}`,
    resource,
    action,
    source: 'path',
    confidence: 'high',
  });

  // For nested resources, also require parent permissions
  // e.g., /api/orgs/:orgId/teams/:teamId -> orgs:read, teams:read
  for (const parent of parents) {
    permissions.push({
      permission: `${parent}${separator}read`,
      resource: parent,
      action: 'read',
      source: 'path',
      confidence: 'medium',
    });
  }

  // Apply custom rules if provided
  if (config?.customRules) {
    for (const rule of [...config.customRules].sort((a, b) => b.priority - a.priority)) {
      if (matchesRule(path, method, rule)) {
        const derived = applyRule(path, method, rule, separator);
        if (derived) {
          if (rule.override) {
            // Override removes auto-derived permissions
            return [derived];
          }
          permissions.unshift(derived);
        }
      }
    }
  }

  return permissions;
}

/**
 * Check if path and method match a rule
 */
function matchesRule(path: string, method: HttpMethod, rule: PermissionRule): boolean {
  // Check method
  if (rule.methods && !rule.methods.includes(method)) {
    return false;
  }

  // Check pattern
  if (typeof rule.pattern === 'string') {
    // Simple glob-like matching
    const regex = new RegExp(
      `^${  rule.pattern
        .replace(/\*/g, '.*')
        .replace(/:[^/]+/g, '[^/]+')
        .replace(/\{[^}]+\}/g, '[^/]+')  }$`
    );
    return regex.test(path);
  }

  return rule.pattern.test(path);
}

/**
 * Apply a permission rule to derive permission
 */
function applyRule(
  path: string,
  method: HttpMethod,
  rule: PermissionRule,
  separator: string
): DerivedPermission | null {
  if (typeof rule.permission === 'string') {
    const [resource, action] = rule.permission.split(separator);
    return {
      permission: rule.permission,
      resource: resource ?? 'resource',
      action: action ?? 'read',
      source: 'rule',
      confidence: 'high',
    };
  }

  // Template with placeholders
  const template = rule.permission;
  let {resource} = template;
  let {action} = template;

  // Replace placeholders
  if (resource === '{resource}') {
    resource = extractResourceFromPath(path);
  }
  if (action === '{action}') {
    action = getActionFromMethod(method);
  }

  return {
    permission: `${resource}${separator}${action}`,
    resource,
    action,
    scope: template.scope,
    source: 'rule',
    confidence: 'high',
  };
}

/**
 * Derive permissions from generated endpoint
 */
export function deriveEndpointPermissions(
  endpoint: GeneratedEndpoint,
  config?: Partial<RBACIntegrationConfig>
): DerivedPermission[] {
  // If endpoint has explicit permissions, use those
  if (endpoint.access.requiredPermissions.length > 0) {
    const separator = config?.separator ?? ':';
    return endpoint.access.requiredPermissions.map((perm) => {
      const [resource, action] = perm.split(separator);
      return {
        permission: perm,
        resource: resource ?? 'resource',
        action: action ?? 'read',
        scope: endpoint.access.scope,
        source: 'override' as const,
        confidence: 'high' as const,
      };
    });
  }

  // Otherwise derive from path and method
  return derivePermissions(endpoint.path, endpoint.method, config);
}

// =============================================================================
// RBAC Integration Class
// =============================================================================

/**
 * RBAC integration for auto-generated APIs
 */
export class RBACIntegration {
  private readonly config: RBACIntegrationConfig;
  private readonly cache: Map<string, { result: boolean; expiresAt: number }>;
  private auditBuffer: RBACAuditEvent[] = [];

  constructor(config: Partial<RBACIntegrationConfig> & Pick<RBACIntegrationConfig, 'checkPermission' | 'checkRole'>) {
    this.config = {
      ...DEFAULT_RBAC_CONFIG,
      ...config,
    } as RBACIntegrationConfig;
    this.cache = new Map();
  }

  // =========================================================================
  // Access Checking
  // =========================================================================

  /**
   * Check if user has access to endpoint
   */
  async checkAccess(
    endpoint: GeneratedEndpoint,
    user: UserContext | undefined,
    context?: PermissionCheckContext
  ): Promise<RBACCheckResult> {
    const startTime = performance.now();
    const {access} = endpoint;

    // Public endpoints
    if (access.isPublic) {
      return this.createResult('allow', 'Public endpoint', startTime, false);
    }

    // Check authentication
    if (access.requiresAuth && !(user?.isAuthenticated === true)) {
      return this.createResult('requires_auth', 'Authentication required', startTime, false);
    }

    if (!user) {
      return this.createResult('deny', 'No user context', startTime, false);
    }

    // Check super admin bypass
    if (this.isSuperAdmin(user)) {
      return this.createResult('allow', 'Super admin access', startTime, false, {
        matchedRoles: this.config.superAdminRoles,
      });
    }

    // Check cache
    const cacheKey = this.getCacheKey(endpoint.id, user.id);
    if (this.config.enableCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        const result = this.createResult(
          cached.result ? 'allow' : 'deny',
          cached.result ? 'Cached allow' : 'Cached deny',
          startTime,
          true
        );
        this.emitAuditEvent(endpoint, user, result, context);
        return result;
      }
    }

    // Check roles
    if (access.requiredRoles.length > 0) {
      const roleResult = await this.checkRoles(user, access);
      if (!roleResult.allowed) {
        this.cacheResult(cacheKey, false);
        this.emitAuditEvent(endpoint, user, roleResult, context);
        return roleResult;
      }
    }

    // Check permissions
    const permissions = deriveEndpointPermissions(endpoint, this.config);
    const permResult = await this.checkPermissions(user, permissions, access, context);

    // Check ownership if required
    if (permResult.allowed && access.ownershipCheck && context?.params) {
      const ownershipResult = await this.checkResourceOwnership(
        user,
        access.ownershipCheck,
        context.params
      );
      if (!ownershipResult.allowed) {
        this.cacheResult(cacheKey, false);
        this.emitAuditEvent(endpoint, user, ownershipResult, context);
        return ownershipResult;
      }
    }

    // Cache and return result
    this.cacheResult(cacheKey, permResult.allowed);
    this.emitAuditEvent(endpoint, user, permResult, context);

    return {
      ...permResult,
      evaluationTimeMs: performance.now() - startTime,
    };
  }

  /**
   * Check role requirements
   */
  private async checkRoles(
    user: UserContext,
    access: ComputedAccess
  ): Promise<RBACCheckResult> {
    const startTime = performance.now();
    const matchedRoles: string[] = [];
    const missingRoles: string[] = [];

    for (const role of access.requiredRoles) {
      const hasRole = await this.config.checkRole(user, role);
      if (hasRole) {
        matchedRoles.push(role);
      } else {
        missingRoles.push(role);
      }
    }

    const allowed = access.roleStrategy === 'any'
      ? matchedRoles.length > 0
      : missingRoles.length === 0;

    return this.createResult(
      allowed ? 'allow' : 'requires_role',
      allowed
        ? `Role check passed (${access.roleStrategy}: ${matchedRoles.join(', ')})`
        : `Missing roles: ${missingRoles.join(', ')}`,
      startTime,
      false,
      { matchedRoles, missingRoles }
    );
  }

  /**
   * Check permission requirements
   */
  private async checkPermissions(
    user: UserContext,
    permissions: DerivedPermission[],
    access: ComputedAccess,
    context?: PermissionCheckContext
  ): Promise<RBACCheckResult> {
    const startTime = performance.now();
    const matchedPermissions: string[] = [];
    const missingPermissions: string[] = [];

    const checkContext: PermissionCheckContext = {
      ...context,
      resource: permissions[0] ? {
        type: permissions[0].resource,
        id: context?.params?.[`${permissions[0].resource}Id`] ?? context?.params?.['id'],
      } : undefined,
    };

    for (const perm of permissions) {
      const hasPerm = await this.config.checkPermission(user, perm.permission, checkContext);
      if (hasPerm) {
        matchedPermissions.push(perm.permission);
      } else {
        missingPermissions.push(perm.permission);
      }
    }

    const allowed = access.permissionStrategy === 'any'
      ? matchedPermissions.length > 0 || permissions.length === 0
      : missingPermissions.length === 0;

    return this.createResult(
      allowed ? 'allow' : 'requires_permission',
      allowed
        ? `Permission check passed (${access.permissionStrategy}: ${matchedPermissions.join(', ')})`
        : `Missing permissions: ${missingPermissions.join(', ')}`,
      startTime,
      false,
      { matchedPermissions, missingPermissions }
    );
  }

  /**
   * Check resource ownership
   */
  private async checkResourceOwnership(
    user: UserContext,
    check: ResourceOwnershipCheck,
    params: Record<string, string>
  ): Promise<RBACCheckResult> {
    const startTime = performance.now();
    const resourceId = params[check.resourceIdParam];

    if (resourceId == null || resourceId === '') {
      return this.createResult('deny', 'Resource ID not found in params', startTime, false);
    }

    if (!this.config.checkOwnership) {
      // No ownership checker configured, skip check
      return this.createResult('allow', 'Ownership check skipped (no checker)', startTime, false);
    }

    const isOwner = await this.config.checkOwnership(
      user,
      check.resourceType,
      resourceId,
      check.ownerField
    );

    return this.createResult(
      isOwner ? 'allow' : 'deny',
      isOwner ? 'User is resource owner' : 'User is not resource owner',
      startTime,
      false
    );
  }

  // =========================================================================
  // Helper Methods
  // =========================================================================

  /**
   * Check if user is super admin
   */
  private isSuperAdmin(user: UserContext): boolean {
    const superRoles = this.config.superAdminRoles ?? [];
    return user.roles.some((role) => superRoles.includes(role));
  }

  /**
   * Create RBAC check result
   */
  private createResult(
    decision: RBACCheckResult['decision'],
    reason: string,
    startTime: number,
    cacheHit: boolean,
    extras?: Partial<RBACCheckResult>
  ): RBACCheckResult {
    return {
      allowed: decision === 'allow',
      decision,
      reason,
      evaluationTimeMs: performance.now() - startTime,
      cacheHit,
      ...extras,
    };
  }

  /**
   * Get cache key for permission check
   */
  private getCacheKey(endpointId: string, userId: string): string {
    return `${endpointId}:${userId}`;
  }

  /**
   * Cache permission check result
   */
  private cacheResult(key: string, result: boolean): void {
    if (!this.config.enableCache) return;

    this.cache.set(key, {
      result,
      expiresAt: Date.now() + this.config.cacheTtl,
    });
  }

  /**
   * Emit audit event
   */
  private emitAuditEvent(
    endpoint: GeneratedEndpoint,
    user: UserContext | undefined,
    result: RBACCheckResult,
    context?: PermissionCheckContext
  ): void {
    if (!this.config.enableAudit) return;

    const event: RBACAuditEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: 'access_check',
      endpointId: endpoint.id,
      method: endpoint.method,
      path: endpoint.path,
      userId: user?.id,
      userRoles: user?.roles,
      requiredPermissions: deriveEndpointPermissions(endpoint, this.config).map((p) => p.permission),
      result,
      metadata: context ? { params: context.params } : undefined,
    };

    if (this.config.onAuditEvent) {
      this.config.onAuditEvent(event);
    }

    this.auditBuffer.push(event);

    // Keep buffer size manageable
    if (this.auditBuffer.length > 1000) {
      this.auditBuffer = this.auditBuffer.slice(-500);
    }
  }

  // =========================================================================
  // Cache Management
  // =========================================================================

  /**
   * Clear permission cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear cache for specific user
   */
  clearUserCache(userId: string): void {
    for (const key of this.cache.keys()) {
      if (key.endsWith(`:${userId}`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear cache for specific endpoint
   */
  clearEndpointCache(endpointId: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${endpointId}:`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses
    };
  }

  // =========================================================================
  // Audit Log Access
  // =========================================================================

  /**
   * Get recent audit events
   */
  getAuditEvents(limit: number = 100): RBACAuditEvent[] {
    return this.auditBuffer.slice(-limit);
  }

  /**
   * Get audit events for specific user
   */
  getUserAuditEvents(userId: string, limit: number = 100): RBACAuditEvent[] {
    return this.auditBuffer
      .filter((e) => e.userId === userId)
      .slice(-limit);
  }

  /**
   * Get audit events for specific endpoint
   */
  getEndpointAuditEvents(endpointId: string, limit: number = 100): RBACAuditEvent[] {
    return this.auditBuffer
      .filter((e) => e.endpointId === endpointId)
      .slice(-limit);
  }

  /**
   * Clear audit buffer
   */
  clearAuditBuffer(): void {
    this.auditBuffer = [];
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create RBAC integration instance
 */
export function createRBACIntegration(
  config: Partial<RBACIntegrationConfig> & Pick<RBACIntegrationConfig, 'checkPermission' | 'checkRole'>
): RBACIntegration {
  return new RBACIntegration(config);
}

/**
 * Create simple permission checker from permission list
 */
export function createSimplePermissionChecker(
  getUserPermissions: (userId: string) => readonly string[] | Promise<readonly string[]>
): RBACIntegrationConfig['checkPermission'] {
  return async (user, permission) => {
    const userPerms = await getUserPermissions(user.id);

    // Check exact match
    if (userPerms.includes(permission)) {
      return true;
    }

    // Check wildcard
    if (userPerms.includes('*')) {
      return true;
    }

    // Check resource wildcard (e.g., users:* matches users:read)
    const [resource] = permission.split(':');
    if (resource !== undefined && resource !== null && resource !== '' && userPerms.includes(`${resource}:*`)) {
      return true;
    }

    return false;
  };
}

/**
 * Create simple role checker from role list
 */
export function createSimpleRoleChecker(
  getUserRoles: (userId: string) => readonly string[] | Promise<readonly string[]>,
  roleHierarchy?: Record<string, readonly string[]>
): RBACIntegrationConfig['checkRole'] {
  return async (user, role) => {
    const userRoles = await getUserRoles(user.id);

    // Check exact match
    if (userRoles.includes(role)) {
      return true;
    }

    // Check hierarchy
    if (roleHierarchy !== undefined && roleHierarchy !== null) {
      for (const userRole of userRoles) {
        const childRoles = roleHierarchy[userRole];
        if (childRoles?.includes(role) === true) {
          return true;
        }
      }
    }

    return false;
  };
}

// =============================================================================
// Permission Rules
// =============================================================================

/**
 * Common permission rules for typical REST APIs
 */
export const COMMON_PERMISSION_RULES: readonly PermissionRule[] = [
  // Admin endpoints
  {
    name: 'admin-all',
    pattern: /^\/api\/admin\/.*/,
    permission: { resource: 'admin', action: '{action}' },
    priority: 100,
    override: false,
  },

  // Health check / status endpoints (public)
  {
    name: 'health-public',
    pattern: /^\/api\/(health|status|ping)$/,
    permission: 'public:read',
    priority: 90,
    override: true,
  },

  // Authentication endpoints (public)
  {
    name: 'auth-public',
    pattern: /^\/api\/auth\/(login|register|forgot-password)$/,
    methods: ['POST'],
    permission: 'public:auth',
    priority: 90,
    override: true,
  },

  // Search endpoints
  {
    name: 'search',
    pattern: /^\/api\/.*\/search$/,
    methods: ['GET', 'POST'],
    permission: { resource: '{resource}', action: 'read' },
    priority: 50,
    override: false,
  },

  // Export endpoints
  {
    name: 'export',
    pattern: /^\/api\/.*\/export$/,
    methods: ['GET', 'POST'],
    permission: { resource: '{resource}', action: 'export' },
    priority: 50,
    override: false,
  },

  // Import endpoints
  {
    name: 'import',
    pattern: /^\/api\/.*\/import$/,
    methods: ['POST'],
    permission: { resource: '{resource}', action: 'import' },
    priority: 50,
    override: false,
  },

  // Batch/bulk operations
  {
    name: 'batch',
    pattern: /^\/api\/.*\/(batch|bulk)$/,
    methods: ['POST'],
    permission: { resource: '{resource}', action: 'manage' },
    priority: 50,
    override: false,
  },
];

// =============================================================================
// Utilities
// =============================================================================

/**
 * Build permission string from parts
 */
export function buildPermission(
  resource: string,
  action: string,
  scope?: PermissionScope,
  separator: string = ':'
): string {
  let permission = `${resource}${separator}${action}`;
  if (scope) {
    permission += `${separator}${scope}`;
  }
  return permission;
}

/**
 * Parse permission string into parts
 */
export function parsePermission(
  permission: string,
  separator: string = ':'
): { resource: string; action: string; scope?: PermissionScope } {
  const parts = permission.split(separator);
  return {
    resource: parts[0] ?? 'resource',
    action: parts[1] ?? 'read',
    scope: parts[2] as PermissionScope | undefined,
  };
}

/**
 * Check if permission matches pattern
 */
export function permissionMatches(
  userPermission: string,
  requiredPermission: string,
  separator: string = ':'
): boolean {
  // Exact match
  if (userPermission === requiredPermission) {
    return true;
  }

  // Wildcard match
  if (userPermission === '*') {
    return true;
  }

  const userParts = userPermission.split(separator);
  const reqParts = requiredPermission.split(separator);

  // Resource wildcard (e.g., users:* matches users:read)
  if (userParts[0] === reqParts[0] && userParts[1] === '*') {
    return true;
  }

  // Action wildcard (e.g., *:read matches users:read)
  if (userParts[0] === '*' && userParts[1] === reqParts[1]) {
    return true;
  }

  return false;
}

/**
 * Type guard for RBACCheckResult
 */
export function isRBACCheckResult(value: unknown): value is RBACCheckResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'allowed' in value &&
    'decision' in value &&
    'reason' in value
  );
}

/**
 * Type guard for DerivedPermission
 */
export function isDerivedPermission(value: unknown): value is DerivedPermission {
  return (
    typeof value === 'object' &&
    value !== null &&
    'permission' in value &&
    'resource' in value &&
    'action' in value &&
    'source' in value
  );
}
