import type { Role, Permission } from '@/lib/auth/types';

/**
 * Centralized role definitions, permission mapping, and route guard metadata.
 */

/**
 * Available roles in the application
 */
export const roles = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
  GUEST: 'guest',
} as const;

/**
 * Available permissions in the application
 */
export const permissions = {
  // Dashboard
  VIEW_DASHBOARD: 'view:dashboard',
  EDIT_DASHBOARD: 'edit:dashboard',

  // Reports
  VIEW_REPORTS: 'view:reports',
  CREATE_REPORTS: 'create:reports',
  EXPORT_REPORTS: 'export:reports',
  DELETE_REPORTS: 'delete:reports',

  // Users
  VIEW_USERS: 'view:users',
  CREATE_USERS: 'create:users',
  EDIT_USERS: 'edit:users',
  DELETE_USERS: 'delete:users',

  // Settings
  VIEW_SETTINGS: 'view:settings',
  EDIT_SETTINGS: 'edit:settings',

  // Admin
  ADMIN_ACCESS: 'admin:access',
} as const;

/**
 * Role to permissions mapping
 */
export const rolePermissions: Record<Role, Permission[]> = {
  admin: [
    permissions.VIEW_DASHBOARD,
    permissions.EDIT_DASHBOARD,
    permissions.VIEW_REPORTS,
    permissions.CREATE_REPORTS,
    permissions.EXPORT_REPORTS,
    permissions.DELETE_REPORTS,
    permissions.VIEW_USERS,
    permissions.CREATE_USERS,
    permissions.EDIT_USERS,
    permissions.DELETE_USERS,
    permissions.VIEW_SETTINGS,
    permissions.EDIT_SETTINGS,
    permissions.ADMIN_ACCESS,
  ],
  manager: [
    permissions.VIEW_DASHBOARD,
    permissions.EDIT_DASHBOARD,
    permissions.VIEW_REPORTS,
    permissions.CREATE_REPORTS,
    permissions.EXPORT_REPORTS,
    permissions.VIEW_USERS,
    permissions.VIEW_SETTINGS,
  ],
  user: [
    permissions.VIEW_DASHBOARD,
    permissions.VIEW_REPORTS,
    permissions.VIEW_SETTINGS,
  ],
  guest: [
    permissions.VIEW_DASHBOARD,
  ],
};

/**
 * Role hierarchy (higher index = higher privilege)
 */
export const roleHierarchy: Role[] = ['guest', 'user', 'manager', 'admin'];

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

/**
 * Check if roleA is at least as privileged as roleB
 */
export function hasMinimumRole(currentRole: Role, requiredRole: Role): boolean {
  const currentIndex = roleHierarchy.indexOf(currentRole);
  const requiredIndex = roleHierarchy.indexOf(requiredRole);
  return currentIndex >= requiredIndex;
}

/**
 * Get all permissions for a role (including inherited from lower roles)
 */
export function getAllPermissions(role: Role): Permission[] {
  const roleIndex = roleHierarchy.indexOf(role);
  const applicableRoles = roleHierarchy.slice(0, roleIndex + 1);
  
  const allPermissions = new Set<Permission>();
  applicableRoles.forEach((r) => {
    rolePermissions[r]?.forEach((p) => allPermissions.add(p));
  });
  
  return Array.from(allPermissions);
}

/**
 * Auth configuration constants
 */
export const authConfig = {
  /** Token storage key */
  tokenKey: 'auth_token',
  /** Refresh token storage key */
  refreshTokenKey: 'refresh_token',
  /** Token expiry buffer in milliseconds (refresh 5 min before expiry) */
  tokenExpiryBuffer: 5 * 60 * 1000,
  /** Session timeout in milliseconds (30 minutes of inactivity) */
  sessionTimeout: 30 * 60 * 1000,
  /** Maximum failed login attempts before lockout */
  maxLoginAttempts: 5,
  /** Lockout duration in milliseconds (15 minutes) */
  lockoutDuration: 15 * 60 * 1000,
};
