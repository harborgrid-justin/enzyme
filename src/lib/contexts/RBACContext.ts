/**
 * @file RBAC Context
 * @description Context for role-based access control (Fast Refresh compliant).
 */

import { createContext } from 'react';

/**
 * Resource type
 */
export type Resource = string;

/**
 * Action type
 */
export type Action = 'create' | 'read' | 'update' | 'delete' | string;

/**
 * Permission
 */
export interface Permission {
  resource: Resource;
  actions: Action[];
}

/**
 * Role
 */
export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

/**
 * RBAC context value
 */
export interface RBACContextValue {
  roles: Role[];
  currentRole: Role | null;
  hasPermission: (resource: Resource, action: Action) => boolean;
  hasAnyPermission: (resource: Resource, actions: Action[]) => boolean;
  hasAllPermissions: (resource: Resource, actions: Action[]) => boolean;
  canAccess: (resource: Resource) => boolean;
  getEffectivePermissions: () => Permission[];
  getRoleDefinitions: () => Role[];
  refreshPermissions: () => Promise<void>;
  clearCache: () => void;
  checkResourcePermission: (resourceType: string, resourceId: string, action: Action) => boolean;
}

/**
 * RBAC context - extracted for Fast Refresh compliance
 */
export const RBACContext = createContext<RBACContextValue | null>(null);

RBACContext.displayName = 'RBACContext';
