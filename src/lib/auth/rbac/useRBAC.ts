/**
 * RBAC React Hook
 *
 * Comprehensive hook for Role-Based Access Control in React components.
 * Provides permission checking, role validation, and access control utilities.
 *
 * @module auth/rbac/useRBAC
 */

import { useContext, useCallback, useMemo } from 'react';
import { RBACContext } from './rbac-context';
import type {
  Permission,
  PermissionAction,
  RoleDefinition,
  AccessRequest,
  EvaluationResult,
} from './types';

// =============================================================================
// Types
// =============================================================================

/**
 * Return type for the useRBAC hook.
 */
export interface UseRBACReturn {
  // State
  /** Whether RBAC is initialized */
  initialized: boolean;
  /** Whether RBAC is loading */
  loading: boolean;
  /** Current user's role IDs */
  userRoles: string[];
  /** Current user's direct permissions */
  userPermissions: Permission[];
  /** Any initialization error */
  error: string | null;

  // Permission Checking
  /** Check if user has a permission */
  hasPermission: (permission: Permission) => boolean;
  /** Check if user has any of the permissions */
  hasAnyPermission: (permissions: Permission[]) => boolean;
  /** Check if user has all permissions */
  hasAllPermissions: (permissions: Permission[]) => boolean;

  // Role Checking
  /** Check if user has a role */
  hasRole: (role: string) => boolean;
  /** Check if user has any of the roles */
  hasAnyRole: (roles: string[]) => boolean;
  /** Check if user has all roles */
  hasAllRoles: (roles: string[]) => boolean;

  // Resource Access
  /** Check if user can access resource with action */
  canAccess: (resource: string, action: PermissionAction, resourceId?: string) => boolean;
  /** Check resource-level permission */
  checkResourcePermission: (
    resourceType: string,
    resourceId: string,
    action: PermissionAction
  ) => boolean;
  /** Full access evaluation */
  evaluate: (request: AccessRequest) => EvaluationResult;

  // Utilities
  /** Get all effective permissions */
  getEffectivePermissions: () => Permission[];
  /** Get user's role definitions */
  getRoleDefinitions: () => RoleDefinition[];
  /** Refresh permissions from server */
  refreshPermissions: () => Promise<void>;
  /** Clear evaluation cache */
  clearCache: () => void;

  // Shorthand helpers
  /** Check create permission for resource */
  canCreate: (resource: string) => boolean;
  /** Check read permission for resource */
  canRead: (resource: string) => boolean;
  /** Check update permission for resource */
  canUpdate: (resource: string) => boolean;
  /** Check delete permission for resource */
  canDelete: (resource: string) => boolean;
  /** Check manage permission for resource */
  canManage: (resource: string) => boolean;
  /** Check if user is admin */
  isAdmin: boolean;
  /** Check if user is manager */
  isManager: boolean;
}

// =============================================================================
// Main Hook
// =============================================================================

/**
 * Main RBAC hook for permission and role checking.
 *
 * @example
 * ```tsx
 * function DocumentsPage() {
 *   const {
 *     canCreate,
 *     canRead,
 *     canDelete,
 *     hasPermission,
 *     isAdmin,
 *   } = useRBAC();
 *
 *   return (
 *     <div>
 *       <h1>Documents</h1>
 *       {canRead('documents') && <DocumentList />}
 *       {canCreate('documents') && <CreateDocumentButton />}
 *       {hasPermission('documents:export') && <ExportButton />}
 *       {isAdmin && <AdminPanel />}
 *     </div>
 *   );
 * }
 * ```
 *
 * @returns RBAC utilities and state
 * @throws Error if used outside RBACProvider
 */
export function useRBAC(): UseRBACReturn {
  const context = useContext(RBACContext);

  if (!context) {
    throw new Error('useRBAC must be used within an RBACProvider');
  }

  const {
    initialized,
    loading,
    userRoles,
    userPermissions,
    error,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    canAccess,
    evaluate,
    getEffectivePermissions,
    getRoleDefinitions,
    refreshPermissions,
    clearCache,
    checkResourcePermission,
  } = context;

  // ===========================================================================
  // Shorthand Helpers
  // ===========================================================================

  const canCreate = useCallback(
    (resource: string) => canAccess(resource, 'create'),
    [canAccess]
  );

  const canRead = useCallback(
    (resource: string) => canAccess(resource, 'read'),
    [canAccess]
  );

  const canUpdate = useCallback(
    (resource: string) => canAccess(resource, 'update'),
    [canAccess]
  );

  const canDelete = useCallback(
    (resource: string) => canAccess(resource, 'delete'),
    [canAccess]
  );

  const canManage = useCallback(
    (resource: string) => canAccess(resource, 'manage'),
    [canAccess]
  );

  const isAdmin = useMemo(
    () => hasAnyRole(['admin', 'super_admin', 'system_admin']),
    [hasAnyRole]
  );

  const isManager = useMemo(
    () => hasAnyRole(['manager', 'admin', 'super_admin']),
    [hasAnyRole]
  );

  return {
    // State
    initialized,
    loading,
    userRoles,
    userPermissions,
    error,

    // Permission checking
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,

    // Role checking
    hasRole,
    hasAnyRole,
    hasAllRoles,

    // Resource access
    canAccess,
    checkResourcePermission,
    evaluate,

    // Utilities
    getEffectivePermissions,
    getRoleDefinitions,
    refreshPermissions,
    clearCache,

    // Shorthand helpers
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    canManage,
    isAdmin,
    isManager,
  };
}

// =============================================================================
// Specialized Hooks
// =============================================================================

/**
 * Hook for checking permissions only.
 *
 * @example
 * ```tsx
 * function SettingsPage() {
 *   const { hasPermission, hasAnyPermission } = usePermissions();
 *
 *   return (
 *     <div>
 *       {hasPermission('settings:view') && <GeneralSettings />}
 *       {hasAnyPermission(['settings:admin', 'settings:manage']) && (
 *         <AdvancedSettings />
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function usePermissions() {
  const {
    userPermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getEffectivePermissions,
  } = useRBAC();

  return {
    permissions: userPermissions,
    effectivePermissions: getEffectivePermissions(),
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
}

/**
 * Hook for checking roles only.
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const { hasRole, isAdmin, isManager } = useRoles();
 *
 *   return (
 *     <div>
 *       {isAdmin && <AdminDashboard />}
 *       {isManager && !isAdmin && <ManagerDashboard />}
 *       {!isManager && <UserDashboard />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useRoles() {
  const {
    userRoles,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    getRoleDefinitions,
    isAdmin,
    isManager,
  } = useRBAC();

  return {
    roles: userRoles,
    roleDefinitions: getRoleDefinitions(),
    hasRole,
    hasAnyRole,
    hasAllRoles,
    isAdmin,
    isManager,
  };
}

/**
 * Hook for resource-level access control.
 *
 * @example
 * ```tsx
 * function DocumentViewer({ documentId }) {
 *   const { canAccess, checkResource } = useResourceAccess('documents');
 *
 *   const canView = checkResource(documentId, 'read');
 *   const canEdit = checkResource(documentId, 'update');
 *   const canDelete = checkResource(documentId, 'delete');
 *
 *   return (
 *     <div>
 *       {canView && <DocumentContent />}
 *       {canEdit && <EditButton />}
 *       {canDelete && <DeleteButton />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useResourceAccess(resourceType: string) {
  const { canAccess, checkResourcePermission, evaluate } = useRBAC();

  const checkResource = useCallback(
    (resourceId: string, action: PermissionAction) =>
      checkResourcePermission(resourceType, resourceId, action),
    [checkResourcePermission, resourceType]
  );

  const canPerformAction = useCallback(
    (action: PermissionAction) => canAccess(resourceType, action),
    [canAccess, resourceType]
  );

  const evaluateAccess = useCallback(
    (resourceId: string, action: string, context?: Record<string, unknown>) =>
      evaluate({
        subject: {
          id: 'current-user', // Will be resolved by engine
          type: 'user',
        },
        resource: {
          type: resourceType,
          id: resourceId,
          attributes: context,
        },
        action,
      }),
    [evaluate, resourceType]
  );

  return {
    resourceType,
    canAccess: canPerformAction,
    checkResource,
    evaluateAccess,
    canCreate: () => canPerformAction('create'),
    canRead: () => canPerformAction('read'),
    canUpdate: () => canPerformAction('update'),
    canDelete: () => canPerformAction('delete'),
    canManage: () => canPerformAction('manage'),
  };
}

/**
 * Hook for conditional rendering based on permission.
 *
 * @example
 * ```tsx
 * function AdminPanel() {
 *   const { allowed, loading } = usePermissionGate('admin:access');
 *
 *   if (loading) return <Spinner />;
 *   if (!allowed) return <AccessDenied />;
 *
 *   return <AdminContent />;
 * }
 * ```
 */
export function usePermissionGate(permission: Permission) {
  const { loading, hasPermission } = useRBAC();

  const allowed = useMemo(
    () => hasPermission(permission),
    [hasPermission, permission]
  );

  return { allowed, loading };
}

/**
 * Hook for conditional rendering based on role.
 *
 * @example
 * ```tsx
 * function ManagerFeature() {
 *   const { allowed, loading } = useRoleGate(['manager', 'admin']);
 *
 *   if (loading) return <Spinner />;
 *   if (!allowed) return null;
 *
 *   return <ManagerContent />;
 * }
 * ```
 */
export function useRoleGate(roles: string | string[]) {
  const { loading, hasRole, hasAnyRole } = useRBAC();

  const allowed = useMemo(() => {
    if (Array.isArray(roles)) {
      return hasAnyRole(roles);
    }
    return hasRole(roles);
  }, [hasRole, hasAnyRole, roles]);

  return { allowed, loading };
}

/**
 * Hook for checking multiple permissions/roles at once.
 *
 * @example
 * ```tsx
 * function FeatureComponent() {
 *   const checks = useAccessChecks({
 *     canViewReports: { permission: 'reports:view' },
 *     canExport: { permission: 'reports:export' },
 *     isAdmin: { role: 'admin' },
 *     canManageUsers: { resource: 'users', action: 'manage' },
 *   });
 *
 *   return (
 *     <div>
 *       {checks.canViewReports && <ReportViewer />}
 *       {checks.canExport && <ExportButton />}
 *       {checks.isAdmin && <AdminSection />}
 *       {checks.canManageUsers && <UserManager />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAccessChecks<
  T extends Record<
    string,
    | { permission: Permission }
    | { role: string }
    | { roles: string[] }
    | { resource: string; action: PermissionAction }
  >
>(checks: T): Record<keyof T, boolean> {
  const { hasPermission, hasRole, hasAnyRole, canAccess } = useRBAC();

  return useMemo(() => {
    const results: Record<string, boolean> = {};

    for (const [key, check] of Object.entries(checks)) {
      if ('permission' in check) {
        results[key] = hasPermission(check.permission);
      } else if ('roles' in check) {
        results[key] = hasAnyRole(check.roles);
      } else if ('role' in check) {
        results[key] = hasRole(check.role);
      } else if ('resource' in check) {
        results[key] = canAccess(check.resource, check.action);
      }
    }


  return results as Record<keyof T, boolean>;
}, [checks, hasPermission, hasRole, hasAnyRole, canAccess]);
}