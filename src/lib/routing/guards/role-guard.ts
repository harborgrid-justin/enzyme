/**
 * @file Role-Based Guard
 * @description Route guard for role-based access control. Checks if the user
 * has the required roles to access a route.
 *
 * @module @/lib/routing/guards/role-guard
 *
 * This module provides:
 * - Role requirement definitions
 * - Multiple role matching strategies
 * - Role hierarchy support
 * - Role inheritance
 * - Denial handling
 *
 * @example
 * ```typescript
 * import { createRoleGuard, RoleGuard } from '@/lib/routing/guards/role-guard';
 *
 * const adminGuard = createRoleGuard({
 *   requiredRoles: ['admin'],
 *   matchStrategy: 'any',
 *   unauthorizedPath: '/unauthorized',
 * });
 *
 * const managerGuard = createRoleGuard({
 *   requiredRoles: ['admin', 'manager'],
 *   matchStrategy: 'any',
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
 * Role matching strategy
 */
export type RoleMatchStrategy =
  | 'any'   // User must have at least one of the required roles
  | 'all'   // User must have all required roles
  | 'none'; // User must not have any of the specified roles

/**
 * Role guard configuration
 */
export interface RoleGuardConfig {
  /** Guard name */
  readonly name?: string;
  /** Required roles */
  readonly requiredRoles: readonly string[];
  /** How to match roles */
  readonly matchStrategy?: RoleMatchStrategy;
  /** Path to redirect unauthorized users */
  readonly unauthorizedPath?: string;
  /** Custom unauthorized message */
  readonly unauthorizedMessage?: string;
  /** Role hierarchy (role -> parent roles) */
  readonly roleHierarchy?: Record<string, readonly string[]>;
  /** Custom role check function */
  readonly checkRoles?: (
    userRoles: readonly string[],
    requiredRoles: readonly string[],
    strategy: RoleMatchStrategy
  ) => boolean;
  /** Get user roles from context */
  readonly getUserRoles?: (context: GuardContext) => readonly string[];
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
 * Role check result
 */
export interface RoleCheckResult {
  /** Whether user has required roles */
  readonly hasAccess: boolean;
  /** User's roles */
  readonly userRoles: readonly string[];
  /** Required roles */
  readonly requiredRoles: readonly string[];
  /** Missing roles (for 'all' strategy) */
  readonly missingRoles: readonly string[];
  /** Matched roles (for 'any' strategy) */
  readonly matchedRoles: readonly string[];
  /** Strategy used */
  readonly strategy: RoleMatchStrategy;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Default role guard configuration
 */
export const DEFAULT_ROLE_CONFIG: Partial<RoleGuardConfig> = {
  name: 'role',
  matchStrategy: 'any',
  unauthorizedPath: '/unauthorized',
  unauthorizedMessage: 'You do not have the required role to access this page',
  priority: 20,
};

// =============================================================================
// RoleGuard Class
// =============================================================================

/**
 * Role-based route guard
 *
 * @example
 * ```typescript
 * const guard = new RoleGuard({
 *   requiredRoles: ['admin', 'super-admin'],
 *   matchStrategy: 'any',
 *   roleHierarchy: {
 *     'super-admin': ['admin'],
 *   },
 * });
 *
 * const result = await guard.execute('canActivate', context);
 * ```
 */
export class RoleGuard extends BaseRouteGuard {
  private readonly roleConfig: RoleGuardConfig;
  private readonly _expandedRoles: ReadonlySet<string>;

  constructor(config: RoleGuardConfig) {
    const mergedConfig = { ...DEFAULT_ROLE_CONFIG, ...config };

    super({
      name: mergedConfig.name ?? 'role',
      description: `Role guard - requires: ${config.requiredRoles.join(', ')}`,
      priority: mergedConfig.priority,
      routes: mergedConfig.routes,
      exclude: mergedConfig.exclude,
      featureFlag: mergedConfig.featureFlag,
      canActivate: async (context) => this.checkRoleAccess(context),
      canLoad: async (context) => this.checkRoleAccess(context),
    });

    this.roleConfig = mergedConfig;

    // Pre-expand roles with hierarchy
    this._expandedRoles = this.expandRolesWithHierarchy(
      config.requiredRoles,
      config.roleHierarchy ?? {}
    );
  }

  /**
   * Expand roles with hierarchy (include parent roles)
   */
  private expandRolesWithHierarchy(
    roles: readonly string[],
    hierarchy: Record<string, readonly string[]>
  ): ReadonlySet<string> {
    const expanded = new Set<string>(roles);

    // For each role, add its parents recursively
    const addParents = (role: string, visited: Set<string>): void => {
      if (visited.has(role)) return; // Prevent cycles
      visited.add(role);

      const parents = hierarchy[role];
      if (parents) {
        for (const parent of parents) {
          expanded.add(parent);
          addParents(parent, visited);
        }
      }
    };

    for (const role of roles) {
      addParents(role, new Set());
    }

    return expanded;
  }

  /**
   * Check if user has required role access
   */
  private async checkRoleAccess(context: GuardContext): Promise<GuardResultObject> {
    // Get user roles
    const userRoles = this.getUserRoles(context);

    // Check if user is authenticated
    if (userRoles.length === 0 && context.user?.isAuthenticated === false) {
      return Promise.resolve(GuardResult.redirect(this.roleConfig.unauthorizedPath ?? '/unauthorized', {
        state: { reason: 'Not authenticated' },
      }));
    }

    // Check role access
    const checkResult = this.performRoleCheck(userRoles);

    if (!checkResult.hasAccess) {
      return Promise.resolve(this.handleUnauthorized(context, checkResult));
    }

    return Promise.resolve(GuardResult.allow({ roleCheck: checkResult }));
  }

  /**
   * Get user roles from context
   */
  private getUserRoles(context: GuardContext): readonly string[] {
    if (this.roleConfig.getUserRoles) {
      return this.roleConfig.getUserRoles(context);
    }

    return context.user?.roles ?? [];
  }

  /**
   * Perform role check based on strategy
   */
  private performRoleCheck(userRoles: readonly string[]): RoleCheckResult {
    const strategy = this.roleConfig.matchStrategy ?? 'any';
    const {requiredRoles} = this.roleConfig;

    // Use custom check if provided
    if (this.roleConfig.checkRoles) {
      const hasAccess = this.roleConfig.checkRoles(userRoles, requiredRoles, strategy);
      return {
        hasAccess,
        userRoles,
        requiredRoles,
        missingRoles: hasAccess ? [] : requiredRoles.filter(r => !userRoles.includes(r)),
        matchedRoles: requiredRoles.filter(r => userRoles.includes(r)),
        strategy,
      };
    }

    // Expand user roles with hierarchy
    const expandedUserRoles = this.expandUserRolesWithHierarchy(userRoles);

    // Check based on strategy using pre-expanded required roles
    let hasAccess = false;
    const missingRoles: string[] = [];
    const matchedRoles: string[] = [];

    // Check if user has any of the required roles (or roles that satisfy them via hierarchy)
    for (const role of this._expandedRoles) {
      if (expandedUserRoles.has(role)) {
        matchedRoles.push(role);
      } else {
        missingRoles.push(role);
      }
    }

    switch (strategy) {
      case 'any':
        hasAccess = matchedRoles.length > 0;
        break;
      case 'all':
        hasAccess = missingRoles.length === 0;
        break;
      case 'none':
        hasAccess = matchedRoles.length === 0;
        break;
    }

    return {
      hasAccess,
      userRoles,
      requiredRoles,
      missingRoles,
      matchedRoles,
      strategy,
    };
  }

  /**
   * Expand user roles with hierarchy
   */
  private expandUserRolesWithHierarchy(userRoles: readonly string[]): Set<string> {
    const hierarchy = this.roleConfig.roleHierarchy ?? {};
    const expanded = new Set<string>(userRoles);

    // For hierarchy, a role includes its children's permissions
    // So if user has 'super-admin' and hierarchy says super-admin includes 'admin',
    // then user effectively has 'admin' role too
    const addChildren = (role: string, visited: Set<string>): void => {
      if (visited.has(role)) return;
      visited.add(role);

      // Check if this role is a parent of any other role
      for (const [childRole, parents] of Object.entries(hierarchy)) {
        if (parents.includes(role)) {
          expanded.add(childRole);
        }
      }

      // Also add explicit children
      const children = hierarchy[role];
      if (children) {
        for (const child of children) {
          expanded.add(child);
        }
      }
    };

    for (const role of userRoles) {
      addChildren(role, new Set());
    }

    return expanded;
  }

  /**
   * Handle unauthorized access
   */
  private handleUnauthorized(
    _context: GuardContext,
    checkResult: RoleCheckResult
  ): GuardResultObject {
    const unauthorizedPath = this.roleConfig.unauthorizedPath ?? '/unauthorized';
    const message = this.roleConfig.unauthorizedMessage ??
      'You do not have the required role to access this page';

    return GuardResult.redirect(unauthorizedPath, {
      state: {
        reason: message,
        requiredRoles: checkResult.requiredRoles,
        missingRoles: checkResult.missingRoles,
        strategy: checkResult.strategy,
      },
    });
  }

  /**
   * Get required roles
   */
  getRequiredRoles(): readonly string[] {
    return this.roleConfig.requiredRoles;
  }

  /**
   * Get match strategy
   */
  getMatchStrategy(): RoleMatchStrategy {
    return this.roleConfig.matchStrategy ?? 'any';
  }

  /**
   * Check roles without full guard execution
   */
  checkRoles(userRoles: readonly string[]): RoleCheckResult {
    return this.performRoleCheck(userRoles);
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a role guard
 *
 * @param config - Guard configuration
 * @returns RoleGuard instance
 */
export function createRoleGuard(config: RoleGuardConfig): RoleGuard {
  return new RoleGuard(config);
}

/**
 * Create a guard requiring a single role
 *
 * @param role - Required role
 * @param options - Additional options
 * @returns RoleGuard instance
 */
export function requireRole(
  role: string,
  options: Partial<Omit<RoleGuardConfig, 'requiredRoles'>> = {}
): RoleGuard {
  return new RoleGuard({
    ...options,
    requiredRoles: [role],
    matchStrategy: 'any',
  });
}

/**
 * Create a guard requiring any of the specified roles
 *
 * @param roles - Roles (any one required)
 * @param options - Additional options
 * @returns RoleGuard instance
 */
export function requireAnyRole(
  roles: readonly string[],
  options: Partial<Omit<RoleGuardConfig, 'requiredRoles' | 'matchStrategy'>> = {}
): RoleGuard {
  return new RoleGuard({
    ...options,
    requiredRoles: roles,
    matchStrategy: 'any',
  });
}

/**
 * Create a guard requiring all specified roles
 *
 * @param roles - Roles (all required)
 * @param options - Additional options
 * @returns RoleGuard instance
 */
export function requireAllRoles(
  roles: readonly string[],
  options: Partial<Omit<RoleGuardConfig, 'requiredRoles' | 'matchStrategy'>> = {}
): RoleGuard {
  return new RoleGuard({
    ...options,
    requiredRoles: roles,
    matchStrategy: 'all',
  });
}

/**
 * Create a guard excluding users with specified roles
 *
 * @param roles - Roles to exclude
 * @param options - Additional options
 * @returns RoleGuard instance
 */
export function excludeRoles(
  roles: readonly string[],
  options: Partial<Omit<RoleGuardConfig, 'requiredRoles' | 'matchStrategy'>> = {}
): RoleGuard {
  return new RoleGuard({
    ...options,
    requiredRoles: roles,
    matchStrategy: 'none',
    unauthorizedMessage: 'Access denied for your role',
  });
}

/**
 * Create an admin guard
 *
 * @param options - Additional options
 * @returns RoleGuard for admin access
 */
export function createAdminGuard(
  options: Partial<Omit<RoleGuardConfig, 'requiredRoles'>> = {}
): RoleGuard {
  return new RoleGuard({
    name: 'admin',
    requiredRoles: ['admin', 'super-admin'],
    matchStrategy: 'any',
    roleHierarchy: {
      'super-admin': ['admin'],
    },
    unauthorizedMessage: 'Admin access required',
    ...options,
  });
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if user has a specific role
 *
 * @param userRoles - User's roles
 * @param role - Role to check
 * @param hierarchy - Optional role hierarchy
 * @returns True if user has role
 */
export function hasRole(
  userRoles: readonly string[],
  role: string,
  hierarchy?: Record<string, readonly string[]>
): boolean {
  if (userRoles.includes(role)) {
    return true;
  }

  if (hierarchy !== null && hierarchy !== undefined) {
    // Check if user has a parent role
    for (const userRole of userRoles) {
      const parents = hierarchy[role];
      if (parents?.includes(userRole) === true) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if user has any of the specified roles
 *
 * @param userRoles - User's roles
 * @param roles - Roles to check
 * @param hierarchy - Optional role hierarchy
 * @returns True if user has any role
 */
export function hasAnyRole(
  userRoles: readonly string[],
  roles: readonly string[],
  hierarchy?: Record<string, readonly string[]>
): boolean {
  return roles.some(role => hasRole(userRoles, role, hierarchy));
}

/**
 * Check if user has all specified roles
 *
 * @param userRoles - User's roles
 * @param roles - Roles to check
 * @param hierarchy - Optional role hierarchy
 * @returns True if user has all roles
 */
export function hasAllRoles(
  userRoles: readonly string[],
  roles: readonly string[],
  hierarchy?: Record<string, readonly string[]>
): boolean {
  return roles.every(role => hasRole(userRoles, role, hierarchy));
}

/**
 * Get missing roles for a user
 *
 * @param userRoles - User's roles
 * @param requiredRoles - Required roles
 * @param hierarchy - Optional role hierarchy
 * @returns Array of missing roles
 */
export function getMissingRoles(
  userRoles: readonly string[],
  requiredRoles: readonly string[],
  hierarchy?: Record<string, readonly string[]>
): string[] {
  return requiredRoles.filter(role => !hasRole(userRoles, role, hierarchy));
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard for RoleGuard
 */
export function isRoleGuard(value: unknown): value is RoleGuard {
  return value instanceof RoleGuard;
}

/**
 * Type guard for RoleCheckResult
 */
export function isRoleCheckResult(value: unknown): value is RoleCheckResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'hasAccess' in value &&
    'userRoles' in value &&
    'requiredRoles' in value &&
    'strategy' in value
  );
}
