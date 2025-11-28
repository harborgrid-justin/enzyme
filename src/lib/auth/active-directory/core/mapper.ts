/**
 * Active Directory Group Mapping - Core Mapper
 *
 * Maps AD groups to application roles and permissions using configurable
 * mapping rules. Supports pattern matching, hierarchical roles, and
 * dynamic conditions.
 *
 * @module auth/active-directory/core
 */

import type {
  ADGroup,
  ADUser,
  ADGroupRoleMapping,
  ADGroupMappingConfig,
} from '../types';
import type { Role, Permission } from '../../types';
import { DEFAULT_GROUP_MAPPING_CONFIG } from '../ad-config';

// =============================================================================
// Types
// =============================================================================

/**
 * Result of group mapping evaluation.
 */
export interface GroupMappingResult {
  /** Resolved role (highest priority) */
  role: Role | undefined;
  /** Combined permissions from all matched mappings */
  permissions: Permission[];
  /** Groups that matched mappings */
  matchedGroups: ADGroup[];
  /** Mappings that were applied */
  appliedMappings: ADGroupRoleMapping[];
}

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
    if ((this.config.cacheDuration != null && this.config.cacheDuration > 0) && this.cache.has(cacheKey)) {
      if (Date.now() < this.cacheExpiry) {
        const cachedResult = this.cache.get(cacheKey);
        if (cachedResult != null) {
          return cachedResult;
        }
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
   * @returns Mapped role (or default role if none matched)
   */
  getRole(groups: ADGroup[], user?: ADUser): Role {
    const result = this.mapUserGroups(groups, user);
    return result.role ?? this.config.defaultRole;
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
      const existing = this.config.mappings[index]!;
      this.config.mappings[index] = {
        ...existing,
        ...updates,
        groupIdentifier: updates.groupIdentifier ?? existing.groupIdentifier,
        matchType: updates.matchType ?? existing.matchType,
        role: updates.role ?? existing.role,
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
        role: this.config.defaultRole,
        permissions: [...this.config.defaultPermissions],
        matchedGroups: [],
        appliedMappings: [],
      };
    }
    const {role} = highestPriorityMapping.mapping;

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