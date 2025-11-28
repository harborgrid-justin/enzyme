/**
 * Active Directory Group Mapping
 *
 * Maps AD groups to application roles and permissions using configurable
 * mapping rules. Supports pattern matching, hierarchical roles, and
 * dynamic conditions.
 *
 * @module auth/active-directory
 */

// Core functionality
export { ADGroupMapper, type GroupMappingResult } from './core/mapper';

// Presets
export { GROUP_MAPPING_PRESETS } from './presets';

// Utilities
export { createGroupMapper, mergeGroupMappings, validateGroupMapping } from './utils';

// Types are exported from the types module
export * from './types';
