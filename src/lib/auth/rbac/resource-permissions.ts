/**
 * Resource Permissions
 *
 * Manages resource-level permissions and access control lists (ACLs).
 * Provides fine-grained access control at the individual resource level.
 *
 * @module auth/rbac/resource-permissions
 */

import type {
  ResourcePermission,
  ResourceACL,
  PermissionAction,

} from './types';

// =============================================================================
// Constants
// =============================================================================

/**
 * Permission levels from least to most permissive.
 */
export const PERMISSION_LEVELS = {
  none: 0,
  view: 1,
  edit: 2,
  manage: 3,
  owner: 4,
} as const;

/**
 * Actions allowed at each permission level.
 */
export const LEVEL_ACTIONS: Record<keyof typeof PERMISSION_LEVELS, PermissionAction[]> = {
  none: [],
  view: ['read', 'list'],
  edit: ['read', 'list', 'update'],
  manage: ['read', 'list', 'update', 'delete', 'create'],
  owner: ['read', 'list', 'update', 'delete', 'create', 'manage', '*'],
};

// =============================================================================
// Resource Permission Manager
// =============================================================================

/**
 * Resource Permission Manager for managing resource-level access control.
 *
 * Provides functionality for managing individual resource permissions,
 * including ACL management, permission inheritance, and access checking.
 *
 * @example
 * ```typescript
 * const manager = new ResourcePermissionManager();
 *
 * // Create an ACL for a document
 * manager.createACL('documents', 'doc-123', 'user-456');
 *
 * // Grant permission to another user
 * manager.grantPermission('documents', 'doc-123', {
 *   granteeType: 'user',
 *   granteeId: 'user-789',
 *   permissionLevel: 'edit',
 * });
 *
 * // Check permission
 * manager.checkAccess('documents', 'doc-123', 'user-789', 'update'); // true
 * ```
 */
export class ResourcePermissionManager {
  private acls: Map<string, ResourceACL>;
  private permissionsByGrantee: Map<string, ResourcePermission[]>;

  constructor() {
    this.acls = new Map();
    this.permissionsByGrantee = new Map();
  }

  // ===========================================================================
  // ACL Management
  // ===========================================================================

  /**
   * Create a new ACL for a resource.
   *
   * @param resourceType - Resource type
   * @param resourceId - Resource ID
   * @param owner - Owner user ID
   * @param options - Additional options
   * @returns Created ACL
   */
  createACL(
    resourceType: string,
    resourceId: string,
    owner: string,
    options?: {
      inheritParent?: boolean;
      parentResource?: { type: string; id: string };
    }
  ): ResourceACL {
    const aclKey = this.getACLKey(resourceType, resourceId);

    const acl: ResourceACL = {
      resourceType,
      resourceId,
      owner,
      entries: [
        // Owner always has full access
        {
          resourceType,
          resourceId,
          granteeType: 'user',
          granteeId: owner,
          permissionLevel: 'owner',
          grantedAt: new Date().toISOString(),
          grantedBy: owner,
        },
      ],
      inheritParent: options?.inheritParent ?? false,
      parentResource: options?.parentResource,
      version: 1,
      updatedAt: new Date().toISOString(),
    };

    this.acls.set(aclKey, acl);
    const firstEntry = acl.entries[0];
    if (firstEntry) this.indexPermission(firstEntry);

    return acl;
  }

  /**
   * Get ACL for a resource.
   *
   * @param resourceType - Resource type
   * @param resourceId - Resource ID
   * @returns ACL or undefined
   */
  getACL(resourceType: string, resourceId: string): ResourceACL | undefined {
    return this.acls.get(this.getACLKey(resourceType, resourceId));
  }

  /**
   * Delete ACL for a resource.
   *
   * @param resourceType - Resource type
   * @param resourceId - Resource ID
   */
  deleteACL(resourceType: string, resourceId: string): void {
    const aclKey = this.getACLKey(resourceType, resourceId);
    const acl = this.acls.get(aclKey);

    if (acl) {
      // Remove permission indexes
      for (const entry of acl.entries) {
        this.removePermissionIndex(entry);
      }
      this.acls.delete(aclKey);
    }
  }

  /**
   * Transfer ownership of a resource.
   *
   * @param resourceType - Resource type
   * @param resourceId - Resource ID
   * @param newOwner - New owner user ID
   * @param grantor - User performing the transfer
   */
  transferOwnership(
    resourceType: string,
    resourceId: string,
    newOwner: string,
    grantor: string
  ): void {
    const acl = this.getACL(resourceType, resourceId);
    if (!acl) {
      throw new Error(`ACL not found for ${resourceType}/${resourceId}`);
    }

    // Update owner
    const oldOwner = acl.owner;
    acl.owner = newOwner;

    // Update owner's permission entry
    const ownerEntry = acl.entries.find(
      e => e.granteeType === 'user' && e.granteeId === oldOwner && e.permissionLevel === 'owner'
    );
    if (ownerEntry) {
      ownerEntry.granteeId = newOwner;
      ownerEntry.grantedBy = grantor;
      ownerEntry.grantedAt = new Date().toISOString();
    }

    // Demote old owner to manager
    this.grantPermission(resourceType, resourceId, {
      granteeType: 'user',
      granteeId: oldOwner,
      permissionLevel: 'manage',
    }, grantor);

    acl.version++;
    acl.updatedAt = new Date().toISOString();
  }

  // ===========================================================================
  // Permission Granting
  // ===========================================================================

  /**
   * Grant permission on a resource.
   *
   * @param resourceType - Resource type
   * @param resourceId - Resource ID
   * @param grant - Permission grant details
   * @param grantor - User granting the permission
   */
  grantPermission(
    resourceType: string,
    resourceId: string,
    grant: {
      granteeType: ResourcePermission['granteeType'];
      granteeId?: string;
      permissionLevel: ResourcePermission['permissionLevel'];
      actions?: PermissionAction[];
      expiresAt?: string;
    },
    grantor?: string
  ): void {
    const acl = this.getOrCreateACL(resourceType, resourceId, grantor);

    // Remove existing permission for this grantee
    this.revokePermission(resourceType, resourceId, grant.granteeType, grant.granteeId);

    const permission: ResourcePermission = {
      resourceType,
      resourceId,
      granteeType: grant.granteeType,
      granteeId: grant.granteeId,
      permissionLevel: grant.permissionLevel,
      actions: grant.actions,
      grantedAt: new Date().toISOString(),
      grantedBy: grantor,
      expiresAt: grant.expiresAt,
    };

    acl.entries.push(permission);
    this.indexPermission(permission);

    acl.version++;
    acl.updatedAt = new Date().toISOString();
  }

  /**
   * Revoke permission on a resource.
   *
   * @param resourceType - Resource type
   * @param resourceId - Resource ID
   * @param granteeType - Grantee type
   * @param granteeId - Grantee ID (optional for 'everyone')
   */
  revokePermission(
    resourceType: string,
    resourceId: string,
    granteeType: ResourcePermission['granteeType'],
    granteeId?: string
  ): void {
    const acl = this.getACL(resourceType, resourceId);
    if (!acl) return;

    const index = acl.entries.findIndex(
      e =>
        e.granteeType === granteeType &&
        (granteeType === 'everyone' || e.granteeId === granteeId)
    );

    if (index !== -1) {
      const removed = acl.entries.splice(index, 1)[0];
      if (removed) this.removePermissionIndex(removed);
      acl.version++;
      acl.updatedAt = new Date().toISOString();
    }
  }

  /**
   * Grant permission to everyone.
   *
   * @param resourceType - Resource type
   * @param resourceId - Resource ID
   * @param permissionLevel - Permission level
   * @param grantor - User granting
   */
  grantPublicAccess(
    resourceType: string,
    resourceId: string,
    permissionLevel: 'view' | 'edit' = 'view',
    grantor?: string
  ): void {
    this.grantPermission(
      resourceType,
      resourceId,
      {
        granteeType: 'everyone',
        permissionLevel,
      },
      grantor
    );
  }

  /**
   * Revoke public access.
   *
   * @param resourceType - Resource type
   * @param resourceId - Resource ID
   */
  revokePublicAccess(resourceType: string, resourceId: string): void {
    this.revokePermission(resourceType, resourceId, 'everyone');
  }

  // ===========================================================================
  // Access Checking
  // ===========================================================================

  /**
   * Check if a user has access to perform an action on a resource.
   *
   * @param resourceType - Resource type
   * @param resourceId - Resource ID
   * @param userId - User ID
   * @param action - Action to check
   * @param context - Additional context
   * @returns Whether access is allowed
   */
  checkAccess(
    resourceType: string,
    resourceId: string,
    userId: string,
    action: PermissionAction,
    context?: {
      userRoles?: string[];
      userGroups?: string[];
    }
  ): boolean {
    const acl = this.getACL(resourceType, resourceId);
    if (!acl) return false;

    // Check user-specific permission
    const userPermission = this.findPermission(acl, 'user', userId);
    if (userPermission && this.actionAllowed(userPermission, action)) {
      return true;
    }

    // Check role-based permissions
    if (context?.userRoles) {
      for (const role of context.userRoles) {
        const rolePermission = this.findPermission(acl, 'role', role);
        if (rolePermission && this.actionAllowed(rolePermission, action)) {
          return true;
        }
      }
    }

    // Check group-based permissions
    if (context?.userGroups) {
      for (const group of context.userGroups) {
        const groupPermission = this.findPermission(acl, 'group', group);
        if (groupPermission && this.actionAllowed(groupPermission, action)) {
          return true;
        }
      }
    }

    // Check 'everyone' permission
    const everyonePermission = this.findPermission(acl, 'everyone');
    if (everyonePermission && this.actionAllowed(everyonePermission, action)) {
      return true;
    }

    // Check inherited permissions
    if (acl.inheritParent && acl.parentResource) {
      return this.checkAccess(
        acl.parentResource.type,
        acl.parentResource.id,
        userId,
        action,
        context
      );
    }

    return false;
  }

  /**
   * Get the effective permission level for a user on a resource.
   *
   * @param resourceType - Resource type
   * @param resourceId - Resource ID
   * @param userId - User ID
   * @param context - Additional context
   * @returns Effective permission level
   */
  getEffectivePermissionLevel(
    resourceType: string,
    resourceId: string,
    userId: string,
    context?: {
      userRoles?: string[];
      userGroups?: string[];
    }
  ): ResourcePermission['permissionLevel'] {
    const acl = this.getACL(resourceType, resourceId);
    if (!acl) return 'none';

    let highestLevel: ResourcePermission['permissionLevel'] = 'none';

    // Check user-specific permission
    const userPermission = this.findPermission(acl, 'user', userId);
    if (userPermission) {
      highestLevel = this.getHigherLevel(highestLevel, userPermission.permissionLevel);
    }

    // Check role-based permissions
    if (context?.userRoles) {
      for (const role of context.userRoles) {
        const rolePermission = this.findPermission(acl, 'role', role);
        if (rolePermission) {
          highestLevel = this.getHigherLevel(highestLevel, rolePermission.permissionLevel);
        }
      }
    }

    // Check group-based permissions
    if (context?.userGroups) {
      for (const group of context.userGroups) {
        const groupPermission = this.findPermission(acl, 'group', group);
        if (groupPermission) {
          highestLevel = this.getHigherLevel(highestLevel, groupPermission.permissionLevel);
        }
      }
    }

    // Check 'everyone' permission
    const everyonePermission = this.findPermission(acl, 'everyone');
    if (everyonePermission) {
      highestLevel = this.getHigherLevel(highestLevel, everyonePermission.permissionLevel);
    }

    return highestLevel;
  }

  /**
   * Get all resources a user has access to.
   *
   * @param userId - User ID
   * @param resourceType - Optional resource type filter
   * @returns Array of accessible resource IDs
   */
  getAccessibleResources(userId: string, resourceType?: string): string[] {
    const granteeKey = this.getGranteeKey('user', userId);
    const permissions = this.permissionsByGrantee.get(granteeKey) ?? [];

    return permissions
      .filter(p => !resourceType || p.resourceType === resourceType)
      .filter(p => !this.isExpired(p))
      .map(p => p.resourceId!);
  }

  /**
   * Get all users with access to a resource.
   *
   * @param resourceType - Resource type
   * @param resourceId - Resource ID
   * @returns Array of user permissions
   */
  getResourcePermissions(
    resourceType: string,
    resourceId: string
  ): ResourcePermission[] {
    const acl = this.getACL(resourceType, resourceId);
    if (!acl) return [];

    return acl.entries.filter(e => !this.isExpired(e));
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Get ACL key from resource type and ID.
   */
  private getACLKey(resourceType: string, resourceId: string): string {
    return `${resourceType}:${resourceId}`;
  }

  /**
   * Get grantee key for indexing.
   */
  private getGranteeKey(
    granteeType: ResourcePermission['granteeType'],
    granteeId?: string
  ): string {
    return granteeType === 'everyone'
      ? 'everyone'
      : `${granteeType}:${granteeId}`;
  }

  /**
   * Get or create ACL for a resource.
   */
  private getOrCreateACL(
    resourceType: string,
    resourceId: string,
    owner?: string
  ): ResourceACL {
    let acl = this.getACL(resourceType, resourceId);
    if (!acl) {
      acl = this.createACL(resourceType, resourceId, owner ?? 'system');
    }
    return acl;
  }

  /**
   * Find permission in ACL entries.
   */
  private findPermission(
    acl: ResourceACL,
    granteeType: ResourcePermission['granteeType'],
    granteeId?: string
  ): ResourcePermission | undefined {
    return acl.entries.find(
      e =>
        e.granteeType === granteeType &&
        (granteeType === 'everyone' || e.granteeId === granteeId) &&
        !this.isExpired(e)
    );
  }

  /**
   * Check if an action is allowed by a permission.
   */
  private actionAllowed(
    permission: ResourcePermission,
    action: PermissionAction
  ): boolean {
    // Check specific actions if defined
    if (permission.actions?.length) {
      return permission.actions.includes(action) || permission.actions.includes('*');
    }

    // Check against level-based actions
    const levelActions = LEVEL_ACTIONS[permission.permissionLevel];
    return levelActions.includes(action) || levelActions.includes('*');
  }

  /**
   * Get the higher of two permission levels.
   */
  private getHigherLevel(
    a: ResourcePermission['permissionLevel'],
    b: ResourcePermission['permissionLevel']
  ): ResourcePermission['permissionLevel'] {
    return PERMISSION_LEVELS[a] >= PERMISSION_LEVELS[b] ? a : b;
  }

  /**
   * Check if a permission has expired.
   */
  private isExpired(permission: ResourcePermission): boolean {
    if (!permission.expiresAt) return false;
    return new Date(permission.expiresAt) < new Date();
  }

  /**
   * Index a permission for quick lookup by grantee.
   */
  private indexPermission(permission: ResourcePermission): void {
    const granteeKey = this.getGranteeKey(
      permission.granteeType,
      permission.granteeId
    );

    if (!this.permissionsByGrantee.has(granteeKey)) {
      this.permissionsByGrantee.set(granteeKey, []);
    }

    this.permissionsByGrantee.get(granteeKey)!.push(permission);
  }

  /**
   * Remove a permission from the index.
   */
  private removePermissionIndex(permission: ResourcePermission): void {
    const granteeKey = this.getGranteeKey(
      permission.granteeType,
      permission.granteeId
    );

    const permissions = this.permissionsByGrantee.get(granteeKey);
    if (permissions) {
      const index = permissions.findIndex(
        p =>
          p.resourceType === permission.resourceType &&
          p.resourceId === permission.resourceId
      );
      if (index !== -1) {
        permissions.splice(index, 1);
      }
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new resource permission manager.
 *
 * @returns ResourcePermissionManager instance
 */
export function createResourcePermissionManager(): ResourcePermissionManager {
  return new ResourcePermissionManager();
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if a permission level grants a specific action.
 *
 * @param level - Permission level
 * @param action - Action to check
 * @returns Whether action is granted
 */
export function levelGrantsAction(
  level: keyof typeof PERMISSION_LEVELS,
  action: PermissionAction
): boolean {
  const levelActions = LEVEL_ACTIONS[level];
  return levelActions.includes(action) || levelActions.includes('*');
}

/**
 * Get the minimum permission level required for an action.
 *
 * @param action - Action to check
 * @returns Minimum required level
 */
export function getMinimumLevelForAction(
  action: PermissionAction
): keyof typeof PERMISSION_LEVELS {
  for (const [level, actions] of Object.entries(LEVEL_ACTIONS)) {
    if (actions.includes(action) || actions.includes('*')) {
      return level as keyof typeof PERMISSION_LEVELS;
    }
  }
  return 'owner';
}

/**
 * Compare two permission levels.
 *
 * @param a - First level
 * @param b - Second level
 * @returns Positive if a > b, negative if a < b, 0 if equal
 */
export function comparePermissionLevels(
  a: keyof typeof PERMISSION_LEVELS,
  b: keyof typeof PERMISSION_LEVELS
): number {
  return PERMISSION_LEVELS[a] - PERMISSION_LEVELS[b];
}
