/**
 * Role Hierarchy
 *
 * Manages hierarchical role structures with inheritance support.
 * Allows roles to inherit permissions from parent roles.
 *
 * @module auth/rbac/role-hierarchy
 */

import type { RoleDefinition, RoleHierarchy, Permission } from './types';

// =============================================================================
// Role Hierarchy Manager
// =============================================================================

/**
 * Role Hierarchy Manager for managing role inheritance.
 *
 * Provides utilities for building and querying hierarchical role structures
 * where roles can inherit permissions from parent roles.
 *
 * @example
 * ```typescript
 * const hierarchy = new RoleHierarchyManager();
 *
 * // Define roles
 * hierarchy.addRole({ id: 'admin', name: 'Admin', permissions: ['*'], priority: 100 });
 * hierarchy.addRole({
 *   id: 'manager',
 *   name: 'Manager',
 *   permissions: ['reports:*', 'team:*'],
 *   inherits: ['user'],
 *   priority: 50,
 * });
 * hierarchy.addRole({
 *   id: 'user',
 *   name: 'User',
 *   permissions: ['profile:*', 'documents:read'],
 *   priority: 10,
 * });
 *
 * // Get all permissions for a role (including inherited)
 * const managerPerms = hierarchy.getEffectivePermissions('manager');
 * // ['reports:*', 'team:*', 'profile:*', 'documents:read']
 *
 * // Check if role inherits from another
 * hierarchy.inheritsFrom('manager', 'user'); // true
 * ```
 */
export class RoleHierarchyManager {
  private roles: Map<string, RoleDefinition>;
  private hierarchyMap: Map<string, RoleHierarchy>;
  private permissionCache: Map<string, Set<Permission>>;
  private ancestorCache: Map<string, Set<string>>;

  constructor() {
    this.roles = new Map();
    this.hierarchyMap = new Map();
    this.permissionCache = new Map();
    this.ancestorCache = new Map();
  }

  // ===========================================================================
  // Role Management
  // ===========================================================================

  /**
   * Add a role to the hierarchy.
   *
   * @param role - Role definition to add
   */
  addRole(role: RoleDefinition): void {
    this.roles.set(role.id, role);
    this.rebuildHierarchy();
    this.clearCaches();
  }

  /**
   * Add multiple roles at once.
   *
   * @param roles - Role definitions to add
   */
  addRoles(roles: RoleDefinition[]): void {
    for (const role of roles) {
      this.roles.set(role.id, role);
    }
    this.rebuildHierarchy();
    this.clearCaches();
  }

  /**
   * Remove a role from the hierarchy.
   *
   * @param roleId - Role ID to remove
   */
  removeRole(roleId: string): void {
    this.roles.delete(roleId);
    this.rebuildHierarchy();
    this.clearCaches();
  }

  /**
   * Update a role definition.
   *
   * @param roleId - Role ID to update
   * @param updates - Partial updates to apply
   */
  updateRole(roleId: string, updates: Partial<RoleDefinition>): void {
    const existing = this.roles.get(roleId);
    if (existing) {
      this.roles.set(roleId, { ...existing, ...updates });
      this.rebuildHierarchy();
      this.clearCaches();
    }
  }

  /**
   * Get a role definition by ID.
   *
   * @param roleId - Role ID
   * @returns Role definition or undefined
   */
  getRole(roleId: string): RoleDefinition | undefined {
    return this.roles.get(roleId);
  }

  /**
   * Get all role definitions.
   *
   * @returns Array of all role definitions
   */
  getAllRoles(): RoleDefinition[] {
    return Array.from(this.roles.values());
  }

  /**
   * Check if a role exists.
   *
   * @param roleId - Role ID to check
   * @returns Whether role exists
   */
  hasRole(roleId: string): boolean {
    return this.roles.has(roleId);
  }

  // ===========================================================================
  // Hierarchy Queries
  // ===========================================================================

  /**
   * Get hierarchy information for a role.
   *
   * @param roleId - Role ID
   * @returns Role hierarchy or undefined
   */
  getHierarchy(roleId: string): RoleHierarchy | undefined {
    return this.hierarchyMap.get(roleId);
  }

  /**
   * Check if a role inherits from another role.
   *
   * @param roleId - Role to check
   * @param ancestorId - Potential ancestor role
   * @returns Whether roleId inherits from ancestorId
   */
  inheritsFrom(roleId: string, ancestorId: string): boolean {
    const ancestors = this.getAncestors(roleId);
    return ancestors.has(ancestorId);
  }

  /**
   * Get all ancestor roles (direct and indirect parents).
   *
   * @param roleId - Role ID
   * @returns Set of ancestor role IDs
   */
  getAncestors(roleId: string): Set<string> {
    // Check cache
    if (this.ancestorCache.has(roleId)) {
      const cachedAncestors = this.ancestorCache.get(roleId);
      if (cachedAncestors != null) {
        return cachedAncestors;
      }
    }

    const ancestors = new Set<string>();
    this.collectAncestors(roleId, ancestors, new Set());

    this.ancestorCache.set(roleId, ancestors);
    return ancestors;
  }

  /**
   * Get direct parent roles.
   *
   * @param roleId - Role ID
   * @returns Array of parent role IDs
   */
  getParents(roleId: string): string[] {
    const hierarchy = this.hierarchyMap.get(roleId);
    return hierarchy?.parents ?? [];
  }

  /**
   * Get direct child roles.
   *
   * @param roleId - Role ID
   * @returns Array of child role IDs
   */
  getChildren(roleId: string): string[] {
    const hierarchy = this.hierarchyMap.get(roleId);
    return hierarchy?.children ?? [];
  }

  /**
   * Get all descendant roles (direct and indirect children).
   *
   * @param roleId - Role ID
   * @returns Set of descendant role IDs
   */
  getDescendants(roleId: string): Set<string> {
    const descendants = new Set<string>();
    this.collectDescendants(roleId, descendants, new Set());
    return descendants;
  }

  /**
   * Get the hierarchy level of a role (0 = root).
   *
   * @param roleId - Role ID
   * @returns Hierarchy level
   */
  getLevel(roleId: string): number {
    const hierarchy = this.hierarchyMap.get(roleId);
    return hierarchy?.level ?? 0;
  }

  /**
   * Get root roles (roles with no parents).
   *
   * @returns Array of root role IDs
   */
  getRootRoles(): string[] {
    return Array.from(this.hierarchyMap.values())
      .filter((h) => h.parents.length === 0)
      .map((h) => h.roleId);
  }

  /**
   * Get leaf roles (roles with no children).
   *
   * @returns Array of leaf role IDs
   */
  getLeafRoles(): string[] {
    return Array.from(this.hierarchyMap.values())
      .filter((h) => h.children.length === 0)
      .map((h) => h.roleId);
  }

  // ===========================================================================
  // Permission Resolution
  // ===========================================================================

  /**
   * Get effective permissions for a role including inherited permissions.
   *
   * @param roleId - Role ID
   * @returns Set of all effective permissions
   */
  getEffectivePermissions(roleId: string): Set<Permission> {
    // Check cache
    if (this.permissionCache.has(roleId)) {
      const cachedPermissions = this.permissionCache.get(roleId);
      if (cachedPermissions != null) {
        return cachedPermissions;
      }
    }

    const permissions = new Set<Permission>();
    this.collectPermissions(roleId, permissions, new Set());

    this.permissionCache.set(roleId, permissions);
    return permissions;
  }

  /**
   * Get effective permissions for multiple roles.
   *
   * @param roleIds - Array of role IDs
   * @returns Combined set of permissions
   */
  getEffectivePermissionsForRoles(roleIds: string[]): Set<Permission> {
    const permissions = new Set<Permission>();

    for (const roleId of roleIds) {
      const rolePerms = this.getEffectivePermissions(roleId);
      rolePerms.forEach((p) => permissions.add(p));
    }

    return permissions;
  }

  /**
   * Check if a role (including inherited) has a permission.
   *
   * @param roleId - Role ID
   * @param permission - Permission to check
   * @returns Whether role has the permission
   */
  hasPermission(roleId: string, permission: Permission): boolean {
    const permissions = this.getEffectivePermissions(roleId);

    if (permissions.has(permission)) {
      return true;
    }

    // Check wildcard patterns
    if (permissions.has('*')) {
      return true;
    }

    const parts = permission.split(':');
    if (parts.length >= 2) {
      // Check resource:* pattern
      if (permissions.has(`${parts[0]}:*`)) {
        return true;
      }
      // Check *:action pattern
      if (permissions.has(`*:${parts[1]}`)) {
        return true;
      }
    }

    return false;
  }

  // ===========================================================================
  // Comparison Operations
  // ===========================================================================

  /**
   * Compare two roles by priority.
   *
   * @param roleA - First role ID
   * @param roleB - Second role ID
   * @returns Positive if A > B, negative if A < B, 0 if equal
   */
  compareRoles(roleA: string, roleB: string): number {
    const a = this.roles.get(roleA);
    const b = this.roles.get(roleB);

    if (!a || !b) return 0;

    return (a.priority ?? 0) - (b.priority ?? 0);
  }

  /**
   * Get the highest priority role from a list.
   *
   * @param roleIds - Array of role IDs
   * @returns Highest priority role ID or undefined
   */
  getHighestPriorityRole(roleIds: string[]): string | undefined {
    let highest: string | undefined;
    let highestPriority = -Infinity;

    for (const roleId of roleIds) {
      const role = this.roles.get(roleId);
      if (role && role.priority > highestPriority) {
        highestPriority = role.priority;
        highest = roleId;
      }
    }

    return highest;
  }

  /**
   * Sort roles by priority (highest first).
   *
   * @param roleIds - Array of role IDs
   * @returns Sorted array of role IDs
   */
  sortByPriority(roleIds: string[]): string[] {
    return [...roleIds].sort((a, b) => this.compareRoles(b, a));
  }

  // ===========================================================================
  // Validation
  // ===========================================================================

  /**
   * Check for circular inheritance.
   *
   * @returns Array of cycle descriptions if found
   */
  detectCycles(): string[] {
    const cycles: string[] = [];

    for (const roleId of this.roles.keys()) {
      const visited = new Set<string>();
      const path: string[] = [];

      if (this.hasCycle(roleId, visited, path)) {
        cycles.push(`Cycle detected: ${path.join(' -> ')}`);
      }
    }

    return cycles;
  }

  /**
   * Validate the role hierarchy.
   *
   * @returns Validation errors if any
   */
  validate(): string[] {
    const errors: string[] = [];

    // Check for missing parent references
    for (const role of this.roles.values()) {
      if (role.inherits) {
        for (const parentId of role.inherits) {
          if (!this.roles.has(parentId)) {
            errors.push(`Role '${role.id}' references missing parent '${parentId}'`);
          }
        }
      }
    }

    // Check for cycles
    errors.push(...this.detectCycles());

    // Check for duplicate IDs
    const ids = new Set<string>();
    for (const role of this.roles.values()) {
      if (ids.has(role.id)) {
        errors.push(`Duplicate role ID: ${role.id}`);
      }
      ids.add(role.id);
    }

    return errors;
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Rebuild the hierarchy map from role definitions.
   */
  private rebuildHierarchy(): void {
    this.hierarchyMap.clear();

    // Initialize hierarchy entries
    for (const role of this.roles.values()) {
      this.hierarchyMap.set(role.id, {
        roleId: role.id,
        parents: role.inherits ?? [],
        children: [],
        level: 0,
      });
    }

    // Build children references
    for (const role of this.roles.values()) {
      if (role.inherits) {
        for (const parentId of role.inherits) {
          const parentHierarchy = this.hierarchyMap.get(parentId);
          if (parentHierarchy) {
            parentHierarchy.children.push(role.id);
          }
        }
      }
    }

    // Calculate levels
    this.calculateLevels();
  }

  /**
   * Calculate hierarchy levels for all roles.
   */
  private calculateLevels(): void {
    const calculated = new Set<string>();

    const calculateLevel = (roleId: string): number => {
      if (calculated.has(roleId)) {
        return this.hierarchyMap.get(roleId)?.level ?? 0;
      }

      const hierarchy = this.hierarchyMap.get(roleId);
      if (!hierarchy) return 0;

      if (hierarchy.parents.length === 0) {
        hierarchy.level = 0;
      } else {
        hierarchy.level = Math.max(...hierarchy.parents.map((p) => calculateLevel(p))) + 1;
      }

      calculated.add(roleId);
      return hierarchy.level;
    };

    for (const roleId of this.roles.keys()) {
      calculateLevel(roleId);
    }
  }

  /**
   * Recursively collect ancestor roles.
   */
  private collectAncestors(roleId: string, ancestors: Set<string>, visited: Set<string>): void {
    if (visited.has(roleId)) return;
    visited.add(roleId);

    const role = this.roles.get(roleId);
    if (!role?.inherits) return;

    for (const parentId of role.inherits) {
      ancestors.add(parentId);
      this.collectAncestors(parentId, ancestors, visited);
    }
  }

  /**
   * Recursively collect descendant roles.
   */
  private collectDescendants(roleId: string, descendants: Set<string>, visited: Set<string>): void {
    if (visited.has(roleId)) return;
    visited.add(roleId);

    const hierarchy = this.hierarchyMap.get(roleId);
    if (!hierarchy) return;

    for (const childId of hierarchy.children) {
      descendants.add(childId);
      this.collectDescendants(childId, descendants, visited);
    }
  }

  /**
   * Recursively collect permissions including inherited.
   */
  private collectPermissions(
    roleId: string,
    permissions: Set<Permission>,
    visited: Set<string>
  ): void {
    if (visited.has(roleId)) return;
    visited.add(roleId);

    const role = this.roles.get(roleId);
    if (!role) return;

    // Add role's own permissions
    for (const permission of role.permissions) {
      permissions.add(permission);
    }

    // Collect inherited permissions
    if (role.inherits) {
      for (const parentId of role.inherits) {
        this.collectPermissions(parentId, permissions, visited);
      }
    }
  }

  /**
   * Check for circular inheritance.
   */
  private hasCycle(roleId: string, visited: Set<string>, path: string[]): boolean {
    if (path.includes(roleId)) {
      path.push(roleId);
      return true;
    }

    if (visited.has(roleId)) {
      return false;
    }

    visited.add(roleId);
    path.push(roleId);

    const role = this.roles.get(roleId);
    if (role?.inherits) {
      for (const parentId of role.inherits) {
        if (this.hasCycle(parentId, visited, path)) {
          return true;
        }
      }
    }

    path.pop();
    return false;
  }

  /**
   * Clear all caches.
   */
  private clearCaches(): void {
    this.permissionCache.clear();
    this.ancestorCache.clear();
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new role hierarchy manager.
 *
 * @param roles - Initial role definitions
 * @returns Configured RoleHierarchyManager
 */
export function createRoleHierarchy(roles?: RoleDefinition[]): RoleHierarchyManager {
  const manager = new RoleHierarchyManager();

  if (roles) {
    manager.addRoles(roles);
  }

  return manager;
}

// =============================================================================
// Preset Role Hierarchies
// =============================================================================

/**
 * Standard 4-tier role hierarchy.
 */
export const STANDARD_ROLE_HIERARCHY: RoleDefinition[] = [
  {
    id: 'super_admin',
    name: 'Super Administrator',
    permissions: ['*'],
    priority: 1000,
    isSystem: true,
  },
  {
    id: 'admin',
    name: 'Administrator',
    permissions: ['admin:*', 'manage:*'],
    inherits: ['manager'],
    priority: 100,
  },
  {
    id: 'manager',
    name: 'Manager',
    permissions: ['team:*', 'reports:*', 'users:read'],
    inherits: ['user'],
    priority: 50,
  },
  {
    id: 'user',
    name: 'User',
    permissions: ['profile:*', 'documents:own:*'],
    inherits: ['guest'],
    priority: 10,
  },
  {
    id: 'guest',
    name: 'Guest',
    permissions: ['public:read'],
    priority: 1,
  },
];

/**
 * Healthcare-specific role hierarchy.
 */
export const HEALTHCARE_ROLE_HIERARCHY: RoleDefinition[] = [
  {
    id: 'system_admin',
    name: 'System Administrator',
    permissions: ['*'],
    priority: 1000,
    isSystem: true,
  },
  {
    id: 'medical_director',
    name: 'Medical Director',
    permissions: ['medical:*', 'staff:*', 'reports:*'],
    inherits: ['physician'],
    priority: 200,
  },
  {
    id: 'physician',
    name: 'Physician',
    permissions: ['patients:*', 'prescriptions:*', 'orders:*', 'diagnoses:*'],
    inherits: ['clinical_staff'],
    priority: 100,
  },
  {
    id: 'nurse_manager',
    name: 'Nurse Manager',
    permissions: ['nursing:manage', 'schedules:*', 'reports:nursing'],
    inherits: ['nurse'],
    priority: 80,
  },
  {
    id: 'nurse',
    name: 'Nurse',
    permissions: ['patients:read', 'vitals:*', 'medications:administer', 'notes:nursing'],
    inherits: ['clinical_staff'],
    priority: 60,
  },
  {
    id: 'clinical_staff',
    name: 'Clinical Staff',
    permissions: ['patients:read', 'schedules:view', 'messages:*'],
    priority: 40,
  },
  {
    id: 'front_desk',
    name: 'Front Desk',
    permissions: ['appointments:*', 'patients:register', 'insurance:verify'],
    priority: 30,
  },
  {
    id: 'billing',
    name: 'Billing Staff',
    permissions: ['billing:*', 'insurance:*', 'payments:*'],
    priority: 30,
  },
  {
    id: 'patient',
    name: 'Patient',
    permissions: ['appointments:own:*', 'records:own:read', 'messages:own:*', 'portal:access'],
    priority: 10,
  },
];
