/**
 * @file Route Groups Support
 * @description Implements route grouping patterns for logical organization without URL impact.
 * Enables organizing routes by feature, access level, or any other logical boundary.
 *
 * @module @/lib/routing/advanced/route-groups
 *
 * This module provides:
 * - Route group definitions
 * - Group-based layout sharing
 * - Group metadata propagation
 * - Access control groups
 * - Feature-based grouping
 *
 * @example
 * ```typescript
 * import { RouteGroupManager, createRouteGroup } from '@/lib/routing/advanced/route-groups';
 *
 * const authGroup = createRouteGroup({
 *   name: 'auth',
 *   layout: AuthLayout,
 *   guards: [authGuard],
 *   meta: { requiresAuth: true },
 * });
 *
 * const manager = new RouteGroupManager();
 * manager.registerGroup(authGroup);
 * ```
 */

import type { ComponentType, ReactNode } from 'react';
import { splitPath } from '../core/path-utils';

// =============================================================================
// Types
// =============================================================================

/**
 * Route group configuration
 */
export interface RouteGroupConfig {
  /** Unique group name (used in file system as (name)) */
  readonly name: string;
  /** Display name for UI/debugging */
  readonly displayName?: string;
  /** Group description */
  readonly description?: string;
  /** Layout component for all routes in group */
  readonly layout?: ComponentType<{ children: ReactNode }>;
  /** Guards applied to all routes in group */
  readonly guards?: readonly RouteGroupGuard[];
  /** Middleware applied to all routes in group */
  readonly middleware?: readonly RouteGroupMiddleware[];
  /** Metadata inherited by all routes in group */
  readonly meta?: RouteGroupMeta;
  /** Parent group (for nested groups) */
  readonly parent?: string;
  /** Child groups */
  readonly children?: readonly string[];
  /** Feature flag for this group */
  readonly featureFlag?: string;
  /** Whether group is enabled */
  readonly enabled?: boolean;
}

/**
 * Route group guard function
 */
export type RouteGroupGuard = (context: RouteGroupContext) => boolean | Promise<boolean>;

/**
 * Route group middleware function
 */
export type RouteGroupMiddleware = (
  context: RouteGroupContext,
  next: () => void | Promise<void>
) => void | Promise<void>;

/**
 * Context passed to group guards and middleware
 */
export interface RouteGroupContext {
  /** Current group */
  readonly group: RouteGroup;
  /** Current route path */
  readonly path: string;
  /** Route parameters */
  readonly params: Record<string, string>;
  /** Query parameters */
  readonly query: Record<string, string>;
  /** User context (if available) */
  readonly user?: RouteGroupUser;
  /** Feature flags */
  readonly features?: Record<string, boolean>;
}

/**
 * User context for group access control
 */
export interface RouteGroupUser {
  /** User ID */
  readonly id: string;
  /** User roles */
  readonly roles: readonly string[];
  /** User permissions */
  readonly permissions: readonly string[];
  /** Additional user data */
  readonly data?: Record<string, unknown>;
}

/**
 * Route group metadata
 */
export interface RouteGroupMeta {
  /** Whether routes require authentication */
  readonly requiresAuth?: boolean;
  /** Required roles for access */
  readonly roles?: readonly string[];
  /** Required permissions for access */
  readonly permissions?: readonly string[];
  /** Analytics category */
  readonly analyticsCategory?: string;
  /** SEO configuration */
  readonly seo?: RouteGroupSEO;
  /** Custom metadata */
  readonly custom?: Record<string, unknown>;
}

/**
 * SEO configuration for route group
 */
export interface RouteGroupSEO {
  /** Title template (can include {route} placeholder) */
  readonly titleTemplate?: string;
  /** Default description */
  readonly description?: string;
  /** robots directive */
  readonly robots?: string;
}

/**
 * Registered route group
 */
export interface RouteGroup extends RouteGroupConfig {
  /** Full path to this group (including parents) */
  readonly fullPath: string;
  /** Computed guards (including inherited) */
  readonly computedGuards: readonly RouteGroupGuard[];
  /** Computed middleware (including inherited) */
  readonly computedMiddleware: readonly RouteGroupMiddleware[];
  /** Computed metadata (including inherited) */
  readonly computedMeta: RouteGroupMeta;
  /** Registration timestamp */
  readonly registeredAt: number;
}

/**
 * Route assignment to group
 */
export interface GroupedRoute {
  /** Route path */
  readonly path: string;
  /** Group this route belongs to */
  readonly group: string;
  /** Route-specific metadata (merged with group meta) */
  readonly meta?: RouteGroupMeta;
  /** Route-specific guards (added to group guards) */
  readonly guards?: readonly RouteGroupGuard[];
}

/**
 * Group resolution result
 */
export interface GroupResolution {
  /** Resolved group chain (from root to leaf) */
  readonly groups: readonly RouteGroup[];
  /** Combined guards */
  readonly guards: readonly RouteGroupGuard[];
  /** Combined middleware */
  readonly middleware: readonly RouteGroupMiddleware[];
  /** Combined metadata */
  readonly meta: RouteGroupMeta;
  /** Layout components (outer to inner) */
  readonly layouts: readonly ComponentType<{ children: ReactNode }>[];
}

// =============================================================================
// RouteGroupManager Class
// =============================================================================

/**
 * Manages route group registration and resolution
 *
 * @example
 * ```typescript
 * const manager = new RouteGroupManager();
 *
 * // Register groups
 * manager.registerGroup(createRouteGroup({ name: 'marketing' }));
 * manager.registerGroup(createRouteGroup({ name: 'dashboard', parent: 'auth' }));
 *
 * // Resolve groups for a route
 * const resolution = manager.resolveGroups('/dashboard/settings');
 * ```
 */
export class RouteGroupManager {
  private groups: Map<string, RouteGroup> = new Map();
  private routeAssignments: Map<string, GroupedRoute> = new Map();

  /**
   * Register a route group
   *
   * @param config - Group configuration
   * @returns Registered group
   */
  registerGroup(config: RouteGroupConfig): RouteGroup {
    // Compute full path
    let fullPath = `(${config.name})`;
    if (config.parent) {
      const parent = this.groups.get(config.parent);
      if (parent) {
        fullPath = `${parent.fullPath}/(${config.name})`;
      }
    }

    // Compute inherited guards, middleware, and meta
    const { guards, middleware, meta } = this.computeInheritedProperties(config);

    const group: RouteGroup = {
      ...config,
      fullPath,
      computedGuards: guards,
      computedMiddleware: middleware,
      computedMeta: meta,
      registeredAt: Date.now(),
      enabled: config.enabled ?? true,
    };

    this.groups.set(config.name, group);

    // Update parent's children
    if (config.parent) {
      const parent = this.groups.get(config.parent);
      if (parent) {
        const updatedParent: RouteGroup = {
          ...parent,
          children: [...(parent.children ?? []), config.name],
        };
        this.groups.set(config.parent, updatedParent);
      }
    }

    return group;
  }

  /**
   * Compute inherited properties from parent groups
   */
  private computeInheritedProperties(config: RouteGroupConfig): {
    guards: readonly RouteGroupGuard[];
    middleware: readonly RouteGroupMiddleware[];
    meta: RouteGroupMeta;
  } {
    const guards: RouteGroupGuard[] = [];
    const middleware: RouteGroupMiddleware[] = [];
    let meta: RouteGroupMeta = {};

    // Walk up the parent chain
    const parentChain = this.getParentChain(config.parent);

    for (const parent of parentChain) {
      guards.push(...(parent.guards ?? []));
      middleware.push(...(parent.middleware ?? []));
      meta = this.mergeMeta(meta, parent.meta ?? {});
    }

    // Add own guards, middleware, and meta
    guards.push(...(config.guards ?? []));
    middleware.push(...(config.middleware ?? []));
    meta = this.mergeMeta(meta, config.meta ?? {});

    return { guards, middleware, meta };
  }

  /**
   * Get parent group chain (from root to immediate parent)
   */
  private getParentChain(parentName: string | undefined): RouteGroup[] {
    const chain: RouteGroup[] = [];
    let current = parentName;

    while (current) {
      const group = this.groups.get(current);
      if (!group) break;
      chain.unshift(group); // Add to beginning
      current = group.parent;
    }

    return chain;
  }

  /**
   * Merge metadata objects
   */
  private mergeMeta(base: RouteGroupMeta, override: RouteGroupMeta): RouteGroupMeta {
    return {
      ...base,
      ...override,
      roles: [...(base.roles ?? []), ...(override.roles ?? [])],
      permissions: [...(base.permissions ?? []), ...(override.permissions ?? [])],
      seo: { ...base.seo, ...override.seo },
      custom: { ...base.custom, ...override.custom },
    };
  }

  /**
   * Unregister a route group
   *
   * @param name - Group name
   * @returns True if group was found and removed
   */
  unregisterGroup(name: string): boolean {
    const group = this.groups.get(name);
    if (!group) return false;

    // Remove children recursively
    for (const childName of group.children ?? []) {
      this.unregisterGroup(childName);
    }

    // Remove from parent's children
    if (group.parent) {
      const parent = this.groups.get(group.parent);
      if (parent) {
        const updatedParent: RouteGroup = {
          ...parent,
          children: parent.children?.filter(c => c !== name) ?? [],
        };
        this.groups.set(group.parent, updatedParent);
      }
    }

    // Remove route assignments
    for (const [path, assignment] of this.routeAssignments) {
      if (assignment.group === name) {
        this.routeAssignments.delete(path);
      }
    }

    return this.groups.delete(name);
  }

  /**
   * Assign a route to a group
   *
   * @param route - Grouped route configuration
   */
  assignRoute(route: GroupedRoute): void {
    this.routeAssignments.set(route.path, route);
  }

  /**
   * Remove route assignment
   *
   * @param path - Route path
   * @returns True if assignment was found and removed
   */
  unassignRoute(path: string): boolean {
    return this.routeAssignments.delete(path);
  }

  /**
   * Get group for a route
   *
   * @param path - Route path
   * @returns Group name or null
   */
  getRouteGroup(path: string): string | null {
    const assignment = this.routeAssignments.get(path);
    return assignment?.group ?? null;
  }

  /**
   * Get a registered group
   *
   * @param name - Group name
   * @returns Group or undefined
   */
  getGroup(name: string): RouteGroup | undefined {
    return this.groups.get(name);
  }

  /**
   * Get all registered groups
   */
  getAllGroups(): readonly RouteGroup[] {
    return Array.from(this.groups.values());
  }

  /**
   * Resolve groups for a route path
   *
   * @param path - Route path
   * @returns Group resolution result
   */
  resolveGroups(path: string): GroupResolution {
    const assignment = this.routeAssignments.get(path);

    if (!assignment) {
      return {
        groups: [],
        guards: [],
        middleware: [],
        meta: {},
        layouts: [],
      };
    }

    const group = this.groups.get(assignment.group);
    if (!group) {
      return {
        groups: [],
        guards: [],
        middleware: [],
        meta: {},
        layouts: [],
      };
    }

    // Build group chain
    const groupChain = [...this.getParentChain(group.parent), group];

    // Collect layouts
    const layouts: ComponentType<{ children: ReactNode }>[] = [];
    for (const g of groupChain) {
      if (g.layout) {
        layouts.push(g.layout);
      }
    }

    // Merge route-specific guards and meta
    const allGuards = [
      ...group.computedGuards,
      ...(assignment.guards ?? []),
    ];

    const allMeta = this.mergeMeta(group.computedMeta, assignment.meta ?? {});

    return {
      groups: groupChain,
      guards: allGuards,
      middleware: group.computedMiddleware,
      meta: allMeta,
      layouts,
    };
  }

  /**
   * Check if a user can access routes in a group
   *
   * @param groupName - Group name
   * @param user - User context
   * @returns True if user can access
   */
  canAccess(groupName: string, user: RouteGroupUser | undefined): boolean {
    const group = this.groups.get(groupName);
    if (!group || !group.enabled) return false;

    const meta = group.computedMeta;

    // Check auth requirement
    if (meta.requiresAuth && !user) {
      return false;
    }

    // Check roles
    if (meta.roles && meta.roles.length > 0) {
      if (!user || !meta.roles.some(role => user.roles.includes(role))) {
        return false;
      }
    }

    // Check permissions
    if (meta.permissions && meta.permissions.length > 0) {
      if (!user || !meta.permissions.some(perm => user.permissions.includes(perm))) {
        return false;
      }
    }

    return true;
  }

  /**
   * Run guards for a group
   *
   * @param groupName - Group name
   * @param context - Guard context
   * @returns True if all guards pass
   */
  async runGuards(groupName: string, context: Omit<RouteGroupContext, 'group'>): Promise<boolean> {
    const group = this.groups.get(groupName);
    if (!group) return false;

    const fullContext: RouteGroupContext = {
      ...context,
      group,
    };

    for (const guard of group.computedGuards) {
      const result = await guard(fullContext);
      if (!result) return false;
    }

    return true;
  }

  /**
   * Run middleware chain for a group
   *
   * @param groupName - Group name
   * @param context - Middleware context
   * @returns Promise that resolves when chain completes
   */
  async runMiddleware(
    groupName: string,
    context: Omit<RouteGroupContext, 'group'>
  ): Promise<void> {
    const group = this.groups.get(groupName);
    if (!group) return;

    const fullContext: RouteGroupContext = {
      ...context,
      group,
    };

    const middleware = [...group.computedMiddleware];

    let index = 0;
    const runNext = async (): Promise<void> => {
      if (index < middleware.length) {
        const currentMiddleware = middleware[index++];
        await currentMiddleware?.(fullContext, runNext);
      }
    };

    await runNext();
  }

  /**
   * Get all routes in a group
   *
   * @param groupName - Group name
   * @param includeChildren - Include routes in child groups
   * @returns Array of route paths
   */
  getRoutesInGroup(groupName: string, includeChildren = true): string[] {
    const routes: string[] = [];
    const groups = includeChildren
      ? this.getGroupWithDescendants(groupName)
      : [groupName];

    for (const [path, assignment] of this.routeAssignments) {
      if (groups.includes(assignment.group)) {
        routes.push(path);
      }
    }

    return routes;
  }

  /**
   * Get group and all its descendants
   */
  private getGroupWithDescendants(groupName: string): string[] {
    const result: string[] = [groupName];
    const group = this.groups.get(groupName);

    if (group?.children) {
      for (const childName of group.children) {
        result.push(...this.getGroupWithDescendants(childName));
      }
    }

    return result;
  }

  /**
   * Clear all groups and assignments
   */
  clearAll(): void {
    this.groups.clear();
    this.routeAssignments.clear();
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a route group configuration
 *
 * @param config - Group configuration
 * @returns Validated configuration
 */
export function createRouteGroup(config: RouteGroupConfig): RouteGroupConfig {
  return {
    ...config,
    enabled: config.enabled ?? true,
    guards: config.guards ?? [],
    middleware: config.middleware ?? [],
    meta: config.meta ?? {},
    children: config.children ?? [],
  };
}

/**
 * Create a grouped route assignment
 *
 * @param path - Route path
 * @param group - Group name
 * @param options - Additional options
 * @returns Grouped route configuration
 */
export function createGroupedRoute(
  path: string,
  group: string,
  options: Partial<Omit<GroupedRoute, 'path' | 'group'>> = {}
): GroupedRoute {
  return {
    path,
    group,
    ...options,
  };
}

// =============================================================================
// Singleton Instance
// =============================================================================

let defaultManager: RouteGroupManager | null = null;

/**
 * Get the default route group manager
 */
export function getRouteGroupManager(): RouteGroupManager {
  if (!defaultManager) {
    defaultManager = new RouteGroupManager();
  }
  return defaultManager;
}

/**
 * Reset the default route group manager
 */
export function resetRouteGroupManager(): void {
  defaultManager?.clearAll();
  defaultManager = null;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if a path segment is a group marker
 *
 * @param segment - Path segment
 * @returns True if segment is a group marker
 */
export function isGroupSegment(segment: string): boolean {
  return /^\([a-zA-Z][a-zA-Z0-9_-]*\)$/.test(segment);
}

/**
 * Extract group name from segment
 *
 * @param segment - Group segment (e.g., '(auth)')
 * @returns Group name (e.g., 'auth')
 */
export function extractGroupName(segment: string): string | null {
  const match = segment.match(/^\(([a-zA-Z][a-zA-Z0-9_-]*)\)$/);
  return match ? match[1]! : null;
}

/**
 * Create a group segment from name
 *
 * @param name - Group name
 * @returns Group segment (e.g., '(auth)')
 */
export function createGroupSegment(name: string): string {
  return `(${name})`;
}

/**
 * Extract all groups from a path
 *
 * @param path - File path with group markers
 * @returns Array of group names
 */
export function extractGroupsFromPath(path: string): string[] {
  const segments = splitPath(path);
  const groups: string[] = [];

  for (const segment of segments) {
    const groupName = extractGroupName(segment);
    if (groupName) {
      groups.push(groupName);
    }
  }

  return groups;
}

/**
 * Remove group segments from a path
 *
 * @param path - Path with group markers
 * @returns Clean URL path
 */
export function stripGroupsFromPath(path: string): string {
  const segments = splitPath(path);
  const cleanSegments = segments.filter(s => !isGroupSegment(s));
  return '/' + cleanSegments.join('/');
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard for RouteGroup
 */
export function isRouteGroup(value: unknown): value is RouteGroup {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    'fullPath' in value &&
    'computedGuards' in value
  );
}

/**
 * Type guard for GroupedRoute
 */
export function isGroupedRoute(value: unknown): value is GroupedRoute {
  return (
    typeof value === 'object' &&
    value !== null &&
    'path' in value &&
    'group' in value
  );
}
