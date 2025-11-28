/**
 * Active Directory Group Mapping - Predefined Presets
 *
 * Common group naming conventions and their mappings.
 *
 * @module auth/active-directory/presets
 */

import type { ADGroupRoleMapping } from '../types';
import type { Role } from '../../types';

/**
 * Common group naming conventions and their mappings.
 */
export const GROUP_MAPPING_PRESETS = {
  /**
   * Azure AD standard security group naming convention.
   * Groups named like: sg-app-admins, sg-app-managers, sg-app-users
   */
  azureSecurityGroups: (appPrefix: string): ADGroupRoleMapping[] => [
    {
      groupIdentifier: `sg-${appPrefix}-admins`,
      matchType: 'exact',
      role: 'admin' as Role,
      additionalPermissions: ['admin:*', 'manage:*'],
      priority: 100,
      enabled: true,
    },
    {
      groupIdentifier: `sg-${appPrefix}-managers`,
      matchType: 'exact',
      role: 'manager' as Role,
      additionalPermissions: ['manage:team', 'reports:view'],
      priority: 50,
      enabled: true,
    },
    {
      groupIdentifier: `sg-${appPrefix}-users`,
      matchType: 'exact',
      role: 'user' as Role,
      additionalPermissions: ['app:access'],
      priority: 10,
      enabled: true,
    },
    {
      groupIdentifier: `sg-${appPrefix}-*`,
      matchType: 'pattern',
      role: 'guest' as Role,
      additionalPermissions: [],
      priority: 1,
      enabled: true,
    },
  ],

  /**
   * On-premises AD naming convention.
   * Groups named like: APP_AdminGroup, APP_UserGroup
   */
  onPremisesGroups: (appPrefix: string): ADGroupRoleMapping[] => [
    {
      groupIdentifier: `${appPrefix}_AdminGroup`,
      matchType: 'exact',
      role: 'admin' as Role,
      additionalPermissions: ['admin:*'],
      priority: 100,
      enabled: true,
    },
    {
      groupIdentifier: `${appPrefix}_ManagerGroup`,
      matchType: 'exact',
      role: 'manager' as Role,
      additionalPermissions: ['manage:*'],
      priority: 50,
      enabled: true,
    },
    {
      groupIdentifier: `${appPrefix}_UserGroup`,
      matchType: 'exact',
      role: 'user' as Role,
      additionalPermissions: [],
      priority: 10,
      enabled: true,
    },
  ],

  /**
   * Azure AD role-based groups (mapped from Azure AD roles).
   */
  azureDirectoryRoles: (): ADGroupRoleMapping[] => [
    {
      groupIdentifier: 'Global Administrator',
      matchType: 'exact',
      role: 'admin' as Role,
      additionalPermissions: ['*'],
      priority: 1000,
      enabled: true,
    },
    {
      groupIdentifier: 'Application Administrator',
      matchType: 'exact',
      role: 'admin' as Role,
      additionalPermissions: ['app:manage'],
      priority: 500,
      enabled: true,
    },
    {
      groupIdentifier: 'Cloud Application Administrator',
      matchType: 'exact',
      role: 'manager' as Role,
      additionalPermissions: ['app:configure'],
      priority: 400,
      enabled: true,
    },
  ],

  /**
   * Department-based access control.
   */
  departmentBasedAccess: (): ADGroupRoleMapping[] => [
    {
      groupIdentifier: 'Department-IT',
      matchType: 'prefix',
      role: 'admin' as Role,
      additionalPermissions: ['it:admin'],
      priority: 100,
      enabled: true,
    },
    {
      groupIdentifier: 'Department-HR',
      matchType: 'prefix',
      role: 'manager' as Role,
      additionalPermissions: ['hr:access'],
      priority: 50,
      enabled: true,
    },
    {
      groupIdentifier: 'Department-*',
      matchType: 'pattern',
      role: 'user' as Role,
      additionalPermissions: [],
      priority: 10,
      enabled: true,
    },
  ],
} as const;