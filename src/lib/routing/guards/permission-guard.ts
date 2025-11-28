/**
 * @file Permission-Based Guard
 * @description Route guard for fine-grained permission-based access control.
 * Checks if the user has the required permissions to access a route.
 *
 * @module @/lib/routing/guards/permission-guard
 *
 * This module provides:
 * - Permission requirement definitions
 * - Resource-based permissions
 * - Action-based permissions
 * - Permission combination strategies
 * - Dynamic permission evaluation
 *
 * @example
 * ```typescript
 * import { createPermissionGuard, PermissionGuard } from '@/lib/routing/guards/permission-guard';
 *
 * const editGuard = createPermissionGuard({
 *   requiredPermissions: ['posts:edit'],
 *   matchStrategy: 'any',
 * });
 *
 * const adminGuard = createPermissionGuard({
 *   requiredPermissions: ['users:read', 'users:write', 'users:delete'],
 *   matchStrategy: 'all',
 * });
 * ```
 */

import {
  BaseRouteGuard,
  GuardResult,
  type GuardContext,
  type GuardResultObject,
} from './route-guard';

// =============================================================================
// Types
// =============================================================================

/**
 * Permission matching strategy
 */
export type PermissionMatchStrategy =
  | 'any'   // User must have at least one permission
  | 'all'   // User must have all permissions
  | 'none'; // User must not have any permissions (blacklist)

/**
 * Permission format: resource:action or custom format
 */
export type Permission = string;

/**
 * Structured permission with resource and action
 */
export interface StructuredPermission {
  /** Resource identifier (e.g., 'posts', 'users') */
  readonly resource: string;
  /** Action identifier (e.g., 'read', 'write', 'delete') */
  readonly action: string;
  /** Optional resource instance ID */
  readonly resourceId?: string;
}

/**
 * Permission guard configuration
 */
export interface PermissionGuardConfig {
  /** Guard name */
  readonly name?: string;
  /** Required permissions */
  readonly requiredPermissions: readonly Permission[];
  /** How to match permissions */
  readonly matchStrategy?: PermissionMatchStrategy;
  /** Path to redirect unauthorized users */
  readonly unauthorizedPath?: string;
  /** Custom unauthorized message */
  readonly unauthorizedMessage?: string;
  /** Get user permissions from context */
  readonly getUserPermissions?: (context: GuardContext) => readonly Permission[];
  /** Custom permission check function */
  readonly checkPermission?: (
    userPermissions: readonly Permission[],
    required: Permission,
    context: GuardContext
  ) => boolean | Promise<boolean>;
  /** Permission aliases (permission -> expanded permissions) */
  readonly aliases?: Record<string, readonly Permission[]>;
  /** Wildcard permission that grants all access */
  readonly wildcardPermission?: Permission;
  /** Separator for resource:action format */
  readonly separator?: string;
  /** Routes this guard applies to */
  readonly routes?: readonly string[];
  /** Routes to exclude */
  readonly exclude?: readonly string[];
  /** Guard priority */
  readonly priority?: number;
  /** Feature flag */
  readonly featureFlag?: string;
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  /** Whether user has required permissions */
  readonly hasAccess: boolean;
  /** User's permissions */
  readonly userPermissions: readonly Permission[];
  /** Required permissions */
  readonly requiredPermissions: readonly Permission[];
  /** Missing permissions */
  readonly missingPermissions: readonly Permission[];
  /** Matched permissions */
  readonly matchedPermissions: readonly Permission[];
  /** Strategy used */
  readonly strategy: PermissionMatchStrategy;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Default permission guard configuration
 */
export const DEFAULT_PERMISSION_CONFIG: Partial<PermissionGuardConfig> = {
  name: 'permission',
  matchStrategy: 'any',
  unauthorizedPath: '/forbidden',
  unauthorizedMessage: 'You do not have permission to access this page',
  separator: ':',
  wildcardPermission: '*',
  priority: 25,
};

/**
 * Common permission actions
 */
export const PermissionActions = {
  READ: 'read',
  WRITE: 'write',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  MANAGE: 'manage',
  ADMIN: 'admin',
} as const;

// =============================================================================
// PermissionGuard Class
// =============================================================================

/**
 * Permission-based route guard
 *
 * @example
 * ```typescript
 * const guard = new PermissionGuard({
 *   requiredPermissions: ['posts:edit', 'posts:delete'],
 *   matchStrategy: 'any',
 *   aliases: {
 *     'posts:manage': ['posts:read', 'posts:write', 'posts:delete'],
 *   },
 * });
 *
 * const result = await guard.execute('canActivate', context);
 * ```
 */
export class PermissionGuard extends BaseRouteGuard {
  private readonly permConfig: PermissionGuardConfig;

  constructor(config: PermissionGuardConfig) {
    const mergedConfig = { ...DEFAULT_PERMISSION_CONFIG, ...config };

    super({
      name: mergedConfig.name ?? 'permission',
      description: `Permission guard - requires: ${config.requiredPermissions.join(', ')}`,
      priority: mergedConfig.priority,
      routes: mergedConfig.routes,
      exclude: mergedConfig.exclude,
      featureFlag: mergedConfig.featureFlag,
      canActivate: async (context) => this.checkPermissionAccess(context),
      canLoad: async (context) => this.checkPermissionAccess(context),
    });

    this.permConfig = mergedConfig;
  }

  /**
   * Expand permissions with aliases
   */
  private expandPermissionsWithAliases(
    permissions: readonly Permission[],
    aliases: Record<string, readonly Permission[]>
  ): ReadonlySet<Permission> {
    const expanded = new Set<Permission>();

    const expand = (perm: Permission, visited: Set<string>): void => {
      if (visited.has(perm)) return;
      visited.add(perm);

      expanded.add(perm);

      // Check if this permission is an alias
      const aliasedPerms = aliases[perm];
      if (aliasedPerms) {
        for (const aliased of aliasedPerms) {
          expand(aliased, visited);
        }
      }
    };

    for (const perm of permissions) {
      expand(perm, new Set());
    }

    return expanded;
  }

  /**
   * Check if user has required permission access
   */
  private async checkPermissionAccess(context: GuardContext): Promise<GuardResultObject> {
    // Get user permissions
    const userPermissions = this.getUserPermissions(context);

    // Check if user has wildcard permission
    const wildcard = this.permConfig.wildcardPermission;
    if (wildcard && userPermissions.includes(wildcard)) {
      return GuardResult.allow({ hasWildcard: true });
    }

    // Check permission access
    const checkResult = await this.performPermissionCheck(userPermissions, context);

    if (!checkResult.hasAccess) {
      return this.handleUnauthorized(context, checkResult);
    }

    return GuardResult.allow({ permissionCheck: checkResult });
  }

  /**
   * Get user permissions from context
   */
  private getUserPermissions(context: GuardContext): readonly Permission[] {
    if (this.permConfig.getUserPermissions) {
      return this.permConfig.getUserPermissions(context);
    }

    return context.user?.permissions ?? [];
  }

  /**
   * Perform permission check based on strategy
   */
  private async performPermissionCheck(
    userPermissions: readonly Permission[],
    context: GuardContext
  ): Promise<PermissionCheckResult> {
    const strategy = this.permConfig.matchStrategy ?? 'any';
    const requiredPermissions = this.permConfig.requiredPermissions;

    // Expand user permissions with aliases
    const expandedUserPerms = this.expandPermissionsWithAliases(
      userPermissions,
      this.permConfig.aliases ?? {}
    );

    const missingPermissions: Permission[] = [];
    const matchedPermissions: Permission[] = [];

    for (const required of requiredPermissions) {
      const hasPermission = await this.checkSinglePermission(
        expandedUserPerms,
        required,
        context
      );

      if (hasPermission) {
        matchedPermissions.push(required);
      } else {
        missingPermissions.push(required);
      }
    }

    let hasAccess = false;
    switch (strategy) {
      case 'any':
        hasAccess = matchedPermissions.length > 0;
        break;
      case 'all':
        hasAccess = missingPermissions.length === 0;
        break;
      case 'none':
        hasAccess = matchedPermissions.length === 0;
        break;
    }

    return {
      hasAccess,
      userPermissions,
      requiredPermissions,
      missingPermissions,
      matchedPermissions,
      strategy,
    };
  }

  /**
   * Check a single permission
   */
  private async checkSinglePermission(
    userPerms: ReadonlySet<Permission>,
    required: Permission,
    context: GuardContext
  ): Promise<boolean> {
    // Use custom check if provided
    if (this.permConfig.checkPermission) {
      return this.permConfig.checkPermission(
        Array.from(userPerms),
        required,
        context
      );
    }

    // Exact match
    if (userPerms.has(required)) {
      return true;
    }

    // Check for wildcard permissions (e.g., posts:* matches posts:read)
    const separator = this.permConfig.separator ?? ':';
    const [resource] = required.split(separator);
    if (resource && userPerms.has(`${resource}${separator}*`)) {
      return true;
    }

    // Check for resource-level wildcard
    if (userPerms.has(`*${separator}*`)) {
      return true;
    }

    return false;
  }

  /**
   * Handle unauthorized access
   */
  private handleUnauthorized(
    _context: GuardContext,
    checkResult: PermissionCheckResult
  ): GuardResultObject {
    const unauthorizedPath = this.permConfig.unauthorizedPath ?? '/forbidden';
    const message = this.permConfig.unauthorizedMessage ??
      'You do not have permission to access this page';

    return GuardResult.redirect(unauthorizedPath, {
      state: {
        reason: message,
        requiredPermissions: checkResult.requiredPermissions,
        missingPermissions: checkResult.missingPermissions,
        strategy: checkResult.strategy,
      },
    });
  }

  /**
   * Get required permissions
   */
  getRequiredPermissions(): readonly Permission[] {
    return this.permConfig.requiredPermissions;
  }

  /**
   * Get match strategy
   */
  getMatchStrategy(): PermissionMatchStrategy {
    return this.permConfig.matchStrategy ?? 'any';
  }

  /**
   * Check permissions without full guard execution
   */
  async checkPermissions(
    userPermissions: readonly Permission[],
    context: GuardContext
  ): Promise<PermissionCheckResult> {
    return this.performPermissionCheck(userPermissions, context);
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a permission guard
 *
 * @param config - Guard configuration
 * @returns PermissionGuard instance
 */
export function createPermissionGuard(config: PermissionGuardConfig): PermissionGuard {
  return new PermissionGuard(config);
}

/**
 * Create a guard requiring a single permission
 *
 * @param permission - Required permission
 * @param options - Additional options
 * @returns PermissionGuard instance
 */
export function requirePermission(
  permission: Permission,
  options: Partial<Omit<PermissionGuardConfig, 'requiredPermissions'>> = {}
): PermissionGuard {
  return new PermissionGuard({
    ...options,
    requiredPermissions: [permission],
    matchStrategy: 'any',
  });
}

/**
 * Create a guard requiring any of the specified permissions
 *
 * @param permissions - Permissions (any one required)
 * @param options - Additional options
 * @returns PermissionGuard instance
 */
export function requireAnyPermission(
  permissions: readonly Permission[],
  options: Partial<Omit<PermissionGuardConfig, 'requiredPermissions' | 'matchStrategy'>> = {}
): PermissionGuard {
  return new PermissionGuard({
    ...options,
    requiredPermissions: permissions,
    matchStrategy: 'any',
  });
}

/**
 * Create a guard requiring all specified permissions
 *
 * @param permissions - Permissions (all required)
 * @param options - Additional options
 * @returns PermissionGuard instance
 */
export function requireAllPermissions(
  permissions: readonly Permission[],
  options: Partial<Omit<PermissionGuardConfig, 'requiredPermissions' | 'matchStrategy'>> = {}
): PermissionGuard {
  return new PermissionGuard({
    ...options,
    requiredPermissions: permissions,
    matchStrategy: 'all',
  });
}

/**
 * Create a resource-action permission guard
 *
 * @param resource - Resource name
 * @param action - Action name
 * @param options - Additional options
 * @returns PermissionGuard instance
 */
export function requireResourcePermission(
  resource: string,
  action: string,
  options: Partial<Omit<PermissionGuardConfig, 'requiredPermissions'>> = {}
): PermissionGuard {
  const separator = options.separator ?? ':';
  return new PermissionGuard({
    ...options,
    requiredPermissions: [`${resource}${separator}${action}`],
    matchStrategy: 'any',
  });
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Parse a permission string into structured format
 *
 * @param permission - Permission string (e.g., 'posts:edit')
 * @param separator - Separator character
 * @returns Structured permission
 */
export function parsePermission(
  permission: Permission,
  separator = ':'
): StructuredPermission {
  const parts = permission.split(separator);
  return {
    resource: parts[0] ?? '',
    action: parts[1] ?? '',
    resourceId: parts[2],
  };
}

/**
 * Build a permission string from structured format
 *
 * @param structured - Structured permission
 * @param separator - Separator character
 * @returns Permission string
 */
export function buildPermission(
  structured: StructuredPermission,
  separator = ':'
): Permission {
  let perm = `${structured.resource}${separator}${structured.action}`;
  if (structured.resourceId) {
    perm += `${separator}${structured.resourceId}`;
  }
  return perm;
}

/**
 * Check if user has a specific permission
 *
 * @param userPermissions - User's permissions
 * @param permission - Permission to check
 * @param separator - Separator for wildcard matching
 * @returns True if user has permission
 */
export function hasPermission(
  userPermissions: readonly Permission[],
  permission: Permission,
  separator = ':'
): boolean {
  // Exact match
  if (userPermissions.includes(permission)) {
    return true;
  }

  // Wildcard match
  if (userPermissions.includes('*')) {
    return true;
  }

  // Resource wildcard (e.g., posts:* matches posts:read)
  const [resource] = permission.split(separator);
  if (resource && userPermissions.includes(`${resource}${separator}*`)) {
    return true;
  }

  return false;
}

/**
 * Check if user has any of the specified permissions
 *
 * @param userPermissions - User's permissions
 * @param permissions - Permissions to check
 * @param separator - Separator for wildcard matching
 * @returns True if user has any permission
 */
export function hasAnyPermission(
  userPermissions: readonly Permission[],
  permissions: readonly Permission[],
  separator = ':'
): boolean {
  return permissions.some(p => hasPermission(userPermissions, p, separator));
}

/**
 * Check if user has all specified permissions
 *
 * @param userPermissions - User's permissions
 * @param permissions - Permissions to check
 * @param separator - Separator for wildcard matching
 * @returns True if user has all permissions
 */
export function hasAllPermissions(
  userPermissions: readonly Permission[],
  permissions: readonly Permission[],
  separator = ':'
): boolean {
  return permissions.every(p => hasPermission(userPermissions, p, separator));
}

/**
 * Get missing permissions for a user
 *
 * @param userPermissions - User's permissions
 * @param requiredPermissions - Required permissions
 * @param separator - Separator for wildcard matching
 * @returns Array of missing permissions
 */
export function getMissingPermissions(
  userPermissions: readonly Permission[],
  requiredPermissions: readonly Permission[],
  separator = ':'
): Permission[] {
  return requiredPermissions.filter(p => !hasPermission(userPermissions, p, separator));
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard for PermissionGuard
 */
export function isPermissionGuard(value: unknown): value is PermissionGuard {
  return value instanceof PermissionGuard;
}

/**
 * Type guard for PermissionCheckResult
 */
export function isPermissionCheckResult(value: unknown): value is PermissionCheckResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'hasAccess' in value &&
    'userPermissions' in value &&
    'requiredPermissions' in value &&
    'strategy' in value
  );
}

/**
 * Type guard for StructuredPermission
 */
export function isStructuredPermission(value: unknown): value is StructuredPermission {
  return (
    typeof value === 'object' &&
    value !== null &&
    'resource' in value &&
    'action' in value
  );
}
