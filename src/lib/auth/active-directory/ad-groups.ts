/**
 * Active Directory Group Mapping
 *
 * Maps AD groups to application roles and permissions using configurable
 * mapping rules. Supports pattern matching, hierarchical roles, and
 * dynamic conditions.
 *
 * @module auth/active-directory/ad-groups
 */

import type {
  ADGroup,
  ADUser,
  ADGroupRoleMapping,
  ADGroupMappingConfig,
} from './types';
import type { Role, Permission } from '../types';
import { DEFAULT_GROUP_MAPPING_CONFIG } from './ad-config';

// =============================================================================
// Group Mapping Engine
// =============================================================================

/**
 * AD Group Mapper for role and permission resolution.
 *
 * Evaluates user group memberships against configured mapping rules
 * to determine appropriate application roles and permissions.
 *
 * @example
 * ```typescript
 * const mapper = new ADGroupMapper({
 *   mappings: [
 *     {
 *       groupIdentifier: 'sg-app-admins',
 *       matchType: 'exact',
 *       role: 'admin',
 *       additionalPermissions: ['manage:users', 'manage:settings'],
 *       priority: 100,
 *     },
 *     {
 *       groupIdentifier: 'sg-app-*',
 *       matchType: 'pattern',
 *       role: 'user',
 *       priority: 10,
 *     },
 *   ],
 *   defaultRole: 'guest',
 *   defaultPermissions: ['read:public'],
 * });
 *
 * const { role, permissions } = mapper.mapUserGroups(user.adGroups);
 * ```
 */
export class ADGroupMapper {
  private config: ADGroupMappingConfig;
  private cache: Map<string, GroupMappingResult>;
  private cacheExpiry: number;

  /**
   * Create a new group mapper.
   *
   * @param config - Group mapping configuration
   */
  constructor(config: Partial<ADGroupMappingConfig> = {}) {
    this.config = {
      ...DEFAULT_GROUP_MAPPING_CONFIG,
      ...config,
      mappings: config.mappings ?? DEFAULT_GROUP_MAPPING_CONFIG.mappings,
    };
    this.cache = new Map();
    this.cacheExpiry = 0;
  }

  /**
   * Map user's AD groups to application roles and permissions.
   *
   * @param groups - User's AD group memberships
   * @param user - Optional user for condition evaluation
   * @returns Mapped role and permissions
   */
  mapUserGroups(groups: ADGroup[], user?: ADUser): GroupMappingResult {
    const cacheKey = this.getCacheKey(groups);

    // Check cache
    if (this.config.cacheDuration && this.cache.has(cacheKey)) {
      if (Date.now() < this.cacheExpiry) {
        return this.cache.get(cacheKey)!;
      }
    }

    const result = this.evaluateMappings(groups, user);

    // Update cache
    if (this.config.cacheDuration) {
      this.cache.set(cacheKey, result);
      this.cacheExpiry = Date.now() + this.config.cacheDuration;
    }

    return result;
  }

  /**
   * Get the highest-priority role for a user based on their groups.
   *
   * @param groups - User's AD group memberships
   * @param user - Optional user for condition evaluation
   * @returns Mapped role
   */
  getRole(groups: ADGroup[], user?: ADUser): Role {
    const result = this.mapUserGroups(groups, user);
    return result.role;
  }

  /**
   * Get all permissions for a user based on their groups.
   *
   * @param groups - User's AD group memberships
   * @param user - Optional user for condition evaluation
   * @returns Array of permissions
   */
  getPermissions(groups: ADGroup[], user?: ADUser): Permission[] {
    const result = this.mapUserGroups(groups, user);
    return result.permissions;
  }

  /**
   * Check if any of the user's groups match a specific mapping.
   *
   * @param groups - User's AD group memberships
   * @param groupIdentifier - Group identifier to check
   * @param matchType - How to match the identifier
   * @returns Whether any group matches
   */
  hasMatchingGroup(
    groups: ADGroup[],
    groupIdentifier: string,
    matchType: ADGroupRoleMapping['matchType'] = 'exact'
  ): boolean {
    return groups.some(group =>
      this.matchesGroup(group, groupIdentifier, matchType)
    );
  }

  /**
   * Get all matched mappings for a set of groups.
   *
   * @param groups - User's AD group memberships
   * @param user - Optional user for condition evaluation
   * @returns Array of matched mappings with their matched groups
   */
  getMatchedMappings(
    groups: ADGroup[],
    user?: ADUser
  ): Array<{ mapping: ADGroupRoleMapping; matchedGroups: ADGroup[] }> {
    const matches: Array<{ mapping: ADGroupRoleMapping; matchedGroups: ADGroup[] }> = [];

    for (const mapping of this.config.mappings) {
      if (!mapping.enabled) continue;

      const matchedGroups = groups.filter(group => {
        const matches = this.matchesGroup(group, mapping.groupIdentifier, mapping.matchType);

        if (!matches) return false;

        // Evaluate condition if present
        if (mapping.condition && user) {
          return mapping.condition(user, group);
        }

        return true;
      });

      if (matchedGroups.length > 0) {
        matches.push({ mapping, matchedGroups });
      }
    }

    return matches.sort((a, b) =>
      (b.mapping.priority ?? 0) - (a.mapping.priority ?? 0)
    );
  }

  /**
   * Add a new mapping at runtime.
   *
   * @param mapping - Mapping to add
   */
  addMapping(mapping: ADGroupRoleMapping): void {
    this.config.mappings.push({
      ...mapping,
      enabled: mapping.enabled ?? true,
      priority: mapping.priority ?? 0,
    });
    this.clearCache();
  }

  /**
   * Remove a mapping by group identifier.
   *
   * @param groupIdentifier - Identifier of the mapping to remove
   */
  removeMapping(groupIdentifier: string): void {
    this.config.mappings = this.config.mappings.filter(
      m => m.groupIdentifier !== groupIdentifier
    );
    this.clearCache();
  }

  /**
   * Update an existing mapping.
   *
   * @param groupIdentifier - Identifier of the mapping to update
   * @param updates - Partial updates to apply
   */
  updateMapping(
    groupIdentifier: string,
    updates: Partial<ADGroupRoleMapping>
  ): void {
    const index = this.config.mappings.findIndex(
      m => m.groupIdentifier === groupIdentifier
    );

    if (index >= 0) {
      this.config.mappings[index] = {
        groupIdentifier: updates.groupIdentifier ?? this.config.mappings[index]?.groupIdentifier ?? '',
        matchType: updates.matchType ?? this.config.mappings[index]?.matchType ?? 'exact',
        ...this.config.mappings[index],
        ...updates,
      };
      this.clearCache();
    }
  }

  /**
   * Clear the mapping cache.
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry = 0;
  }

  /**
   * Get the current configuration.
   */
  getConfig(): ADGroupMappingConfig {
    return { ...this.config };
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Evaluate all mappings against user groups.
   */
  private evaluateMappings(groups: ADGroup[], user?: ADUser): GroupMappingResult {
    const matchedMappings = this.getMatchedMappings(groups, user);

    if (matchedMappings.length === 0) {
      return {
        role: this.config.defaultRole,
        permissions: [...this.config.defaultPermissions],
        matchedGroups: [],
        appliedMappings: [],
      };
    }

    // Get highest priority role
    const highestPriorityMapping = matchedMappings[0];
    if (!highestPriorityMapping) {
      return {
        role: undefined,
        permissions: [],
        matchedGroups: [],
        appliedMappings: [],
      };
    }
    const role = highestPriorityMapping.mapping.role;

    // Collect all permissions from all matched mappings
    const permissionSet = new Set<Permission>();
    this.config.defaultPermissions.forEach(p => permissionSet.add(p));

    const appliedMappings: ADGroupRoleMapping[] = [];
    const allMatchedGroups: ADGroup[] = [];

    for (const { mapping, matchedGroups } of matchedMappings) {
      appliedMappings.push(mapping);
      allMatchedGroups.push(...matchedGroups);

      mapping.additionalPermissions?.forEach(p => permissionSet.add(p));
    }

    return {
      role,
      permissions: Array.from(permissionSet),
      matchedGroups: [...new Set(allMatchedGroups)],
      appliedMappings,
    };
  }

  /**
   * Check if a group matches the identifier based on match type.
   */
  private matchesGroup(
    group: ADGroup,
    identifier: string,
    matchType: ADGroupRoleMapping['matchType']
  ): boolean {
    const groupName = group.displayName.toLowerCase();
    const groupId = group.id.toLowerCase();
    const searchId = identifier.toLowerCase();

    switch (matchType) {
      case 'exact':
        return groupName === searchId || groupId === searchId;

      case 'prefix':
        return groupName.startsWith(searchId) || groupId.startsWith(searchId);

      case 'suffix':
        return groupName.endsWith(searchId) || groupId.endsWith(searchId);

      case 'pattern':
        return this.matchPattern(groupName, searchId) ||
               this.matchPattern(groupId, searchId);

      default:
        return false;
    }
  }

  /**
   * Match using glob-like pattern (* wildcard).
   */
  private matchPattern(value: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special chars
      .replace(/\*/g, '.*') // Convert * to .*
      .replace(/\?/g, '.'); // Convert ? to .

    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(value);
  }

  /**
   * Generate cache key from groups.
   */
  private getCacheKey(groups: ADGroup[]): string {
    return groups
      .map(g => g.id)
      .sort()
      .join('|');
  }
}

// =============================================================================
// Types
// =============================================================================

/**
 * Result of group mapping evaluation.
 */
export interface GroupMappingResult {
  /** Resolved role (highest priority) */
  role: Role;
  /** Combined permissions from all matched mappings */
  permissions: Permission[];
  /** Groups that matched mappings */
  matchedGroups: ADGroup[];
  /** Mappings that were applied */
  appliedMappings: ADGroupRoleMapping[];
}

// =============================================================================
// Predefined Group Mapping Presets
// =============================================================================

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

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a group mapper with a preset configuration.
 *
 * @param preset - Preset name or custom mappings
 * @param options - Additional configuration options
 * @returns Configured ADGroupMapper
 */
export function createGroupMapper(
  preset: keyof typeof GROUP_MAPPING_PRESETS | ADGroupRoleMapping[],
  options?: {
    appPrefix?: string;
    defaultRole?: Role;
    defaultPermissions?: Permission[];
    cacheDuration?: number;
  }
): ADGroupMapper {
  let mappings: ADGroupRoleMapping[];

  if (Array.isArray(preset)) {
    mappings = preset;
  } else {
    const presetFn = GROUP_MAPPING_PRESETS[preset];
    if (typeof presetFn === 'function') {
      mappings = (presetFn as (prefix: string) => ADGroupRoleMapping[])(
        options?.appPrefix ?? 'app'
      );
    } else {
      mappings = presetFn as ADGroupRoleMapping[];
    }
  }

  return new ADGroupMapper({
    mappings,
    defaultRole: options?.defaultRole ?? ('guest' as Role),
    defaultPermissions: options?.defaultPermissions ?? [],
    cacheDuration: options?.cacheDuration,
  });
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Merge multiple group mapping configurations.
 *
 * @param configs - Configurations to merge
 * @returns Merged configuration
 */
export function mergeGroupMappings(
  ...configs: Partial<ADGroupMappingConfig>[]
): ADGroupMappingConfig {
  const merged: ADGroupMappingConfig = {
    ...DEFAULT_GROUP_MAPPING_CONFIG,
    mappings: [],
    defaultPermissions: [],
  };

  for (const config of configs) {
    if (config.mappings) {
      merged.mappings.push(...config.mappings);
    }
    if (config.defaultPermissions) {
      merged.defaultPermissions.push(...config.defaultPermissions);
    }
    if (config.defaultRole) {
      merged.defaultRole = config.defaultRole;
    }
    if (config.resolveNestedGroups !== undefined) {
      merged.resolveNestedGroups = config.resolveNestedGroups;
    }
    if (config.cacheDuration !== undefined) {
      merged.cacheDuration = config.cacheDuration;
    }
    if (config.fallbackBehavior) {
      merged.fallbackBehavior = config.fallbackBehavior;
    }
  }

  // Deduplicate permissions
  merged.defaultPermissions = [...new Set(merged.defaultPermissions)];

  return merged;
}

/**
 * Validate a group mapping configuration.
 *
 * @param config - Configuration to validate
 * @returns Validation errors if any
 */
export function validateGroupMapping(config: ADGroupMappingConfig): string[] {
  const errors: string[] = [];

  if (!config.mappings || !Array.isArray(config.mappings)) {
    errors.push('mappings must be an array');
    return errors;
  }

  const identifiers = new Set<string>();

  for (const [index, mapping] of config.mappings.entries()) {
    if (!mapping.groupIdentifier) {
      errors.push(`Mapping at index ${index}: groupIdentifier is required`);
    }

    if (!mapping.matchType) {
      errors.push(`Mapping at index ${index}: matchType is required`);
    } else if (!['exact', 'pattern', 'prefix', 'suffix'].includes(mapping.matchType)) {
      errors.push(`Mapping at index ${index}: invalid matchType '${mapping.matchType}'`);
    }

    if (!mapping.role) {
      errors.push(`Mapping at index ${index}: role is required`);
    }

    if (identifiers.has(mapping.groupIdentifier)) {
      errors.push(`Mapping at index ${index}: duplicate groupIdentifier '${mapping.groupIdentifier}'`);
    }
    identifiers.add(mapping.groupIdentifier);
  }

  if (!config.defaultRole) {
    errors.push('defaultRole is required');
  }

  return errors;
}
