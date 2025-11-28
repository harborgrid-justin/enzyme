/**
 * Active Directory Group Mapping - Utilities
 *
 * Factory functions and utility helpers for group mapping.
 *
 * @module auth/active-directory/utils
 */

import type { ADGroupRoleMapping, ADGroupMappingConfig } from '../types';
import type { Role, Permission } from '../../types';
import { DEFAULT_GROUP_MAPPING_CONFIG } from '../ad-config';
import { ADGroupMapper } from '../core/mapper';
import { GROUP_MAPPING_PRESETS } from '../presets';

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

  if (!Array.isArray(config.mappings)) {
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