/**
 * @fileoverview Configuration merging utilities.
 *
 * Provides flexible merging strategies:
 * - Deep merge for nested objects
 * - Shallow merge for top-level properties
 * - Replace strategy for complete override
 * - Array handling options
 *
 * @module config/config-merger
 *
 * @example
 * ```typescript
 * const merger = new ConfigMerger({ strategy: 'deep' });
 * const merged = merger.merge(baseConfig, overrides);
 * ```
 */

import type {
  ConfigRecord,
  ConfigValue,
  MergeOptions,
  MergeStrategy,
} from './types';

// ============================================================================
// Config Merger
// ============================================================================

/**
 * Configuration merger with multiple strategies.
 */
export class ConfigMerger {
  private options: Required<MergeOptions>;

  constructor(options: MergeOptions = {}) {
    this.options = {
      strategy: options.strategy ?? 'deep',
      arrayMerge: options.arrayMerge ?? 'replace',
      nullHandling: options.nullHandling ?? 'keep',
    };
  }

  /**
   * Merge multiple configurations.
   */
  merge(...configs: ConfigRecord[]): ConfigRecord {
    if (configs.length === 0) {
      return {};
    }

    if (configs.length === 1) {
      return { ...configs[0] };
    }

    return configs.reduce((acc, config) => this.mergeTwo(acc, config), {});
  }

  /**
   * Merge two configurations.
   */
  mergeTwo(target: ConfigRecord, source: ConfigRecord): ConfigRecord {
    switch (this.options.strategy) {
      case 'replace':
        return { ...source };
      case 'shallow':
        return this.shallowMerge(target, source);
      case 'deep':
      default:
        return this.deepMerge(target, source);
    }
  }

  private shallowMerge(target: ConfigRecord, source: ConfigRecord): ConfigRecord {
    const result = { ...target };

    for (const [key, value] of Object.entries(source)) {
      if (this.shouldIncludeValue(value)) {
        result[key] = value;
      }
    }

    return result;
  }

  private deepMerge(target: ConfigRecord, source: ConfigRecord): ConfigRecord {
    const result = { ...target };

    for (const [key, sourceValue] of Object.entries(source)) {
      if (!this.shouldIncludeValue(sourceValue)) {
        continue;
      }

      const targetValue = result[key];

      // Handle arrays
      if (Array.isArray(sourceValue)) {
        result[key] = this.mergeArrays(
          Array.isArray(targetValue) ? targetValue : [],
          sourceValue
        );
        continue;
      }

      // Handle objects
      if (this.isPlainObject(sourceValue) && this.isPlainObject(targetValue)) {
        result[key] = this.deepMerge(
          targetValue as ConfigRecord,
          sourceValue as ConfigRecord
        );
        continue;
      }

      // Simple value replacement
      result[key] = sourceValue;
    }

    return result;
  }

  private mergeArrays(target: ConfigValue[], source: ConfigValue[]): ConfigValue[] {
    switch (this.options.arrayMerge) {
      case 'concat':
        return [...target, ...source];
      case 'unique':
        return [...new Set([...target, ...source])];
      case 'replace':
      default:
        return [...source];
    }
  }

  private shouldIncludeValue(value: unknown): boolean {
    if (value === null) {
      return this.options.nullHandling !== 'remove';
    }
    return true;
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) === Object.prototype
    );
  }
}

// ============================================================================
// Merge Functions
// ============================================================================

/**
 * Deep merge configurations.
 */
export function deepMerge(...configs: ConfigRecord[]): ConfigRecord {
  const merger = new ConfigMerger({ strategy: 'deep' });
  return merger.merge(...configs);
}

/**
 * Shallow merge configurations.
 */
export function shallowMerge(...configs: ConfigRecord[]): ConfigRecord {
  const merger = new ConfigMerger({ strategy: 'shallow' });
  return merger.merge(...configs);
}

/**
 * Replace merge (last config wins).
 */
export function replaceMerge(...configs: ConfigRecord[]): ConfigRecord {
  const merger = new ConfigMerger({ strategy: 'replace' });
  return merger.merge(...configs);
}

// ============================================================================
// Path-based Operations
// ============================================================================

/**
 * Get a value at a path.
 */
export function getValueAtPath<T = ConfigValue>(
  config: ConfigRecord,
  path: string,
  defaultValue?: T
): T {
  const parts = path.split('.');
  let current: unknown = config;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return defaultValue as T;
    }

    if (typeof current !== 'object') {
      return defaultValue as T;
    }

    // Handle array indexing
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, key, index] = arrayMatch;
      const obj = current as Record<string, unknown>;
      const arr = obj[key];
      if (!Array.isArray(arr)) {
        return defaultValue as T;
      }
      current = arr[parseInt(index, 10)];
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }

  return (current as T) ?? defaultValue as T;
}

/**
 * Set a value at a path.
 */
export function setValueAtPath(
  config: ConfigRecord,
  path: string,
  value: ConfigValue
): ConfigRecord {
  const parts = path.split('.');
  const result = { ...config };
  let current: Record<string, unknown> = result;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];

    // Handle array indexing
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, key, index] = arrayMatch;
      if (!Array.isArray(current[key])) {
        current[key] = [];
      }
      const arr = [...(current[key] as unknown[])];
      current[key] = arr;
      if (typeof arr[parseInt(index, 10)] !== 'object') {
        arr[parseInt(index, 10)] = {};
      }
      current = arr[parseInt(index, 10)] as Record<string, unknown>;
    } else {
      if (typeof current[part] !== 'object' || current[part] === null) {
        current[part] = {};
      } else {
        current[part] = { ...(current[part] as object) };
      }
      current = current[part] as Record<string, unknown>;
    }
  }

  const lastPart = parts[parts.length - 1];
  const arrayMatch = lastPart.match(/^(\w+)\[(\d+)\]$/);
  if (arrayMatch) {
    const [, key, index] = arrayMatch;
    if (!Array.isArray(current[key])) {
      current[key] = [];
    }
    const arr = [...(current[key] as unknown[])];
    arr[parseInt(index, 10)] = value;
    current[key] = arr;
  } else {
    current[lastPart] = value;
  }

  return result;
}

/**
 * Delete a value at a path.
 */
export function deleteValueAtPath(
  config: ConfigRecord,
  path: string
): ConfigRecord {
  const parts = path.split('.');
  const result = { ...config };

  if (parts.length === 1) {
    delete result[parts[0]];
    return result;
  }

  let current: Record<string, unknown> = result;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (typeof current[part] !== 'object' || current[part] === null) {
      return result; // Path doesn't exist
    }
    current[part] = { ...(current[part] as object) };
    current = current[part] as Record<string, unknown>;
  }

  delete current[parts[parts.length - 1]];
  return result;
}

/**
 * Check if a path exists.
 */
export function hasPath(config: ConfigRecord, path: string): boolean {
  const parts = path.split('.');
  let current: unknown = config;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return false;
    }

    if (typeof current !== 'object') {
      return false;
    }

    if (!(part in (current as Record<string, unknown>))) {
      return false;
    }

    current = (current as Record<string, unknown>)[part];
  }

  return true;
}

/**
 * Get all paths in a configuration.
 */
export function getAllPaths(config: ConfigRecord, prefix = ''): string[] {
  const paths: string[] = [];

  for (const [key, value] of Object.entries(config)) {
    const path = prefix ? `${prefix}.${key}` : key;
    paths.push(path);

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      paths.push(...getAllPaths(value as ConfigRecord, path));
    }
  }

  return paths;
}

// ============================================================================
// Diff Operations
// ============================================================================

/**
 * Configuration difference.
 */
export interface ConfigDiff {
  readonly added: Record<string, ConfigValue>;
  readonly removed: string[];
  readonly changed: Array<{
    path: string;
    oldValue: ConfigValue;
    newValue: ConfigValue;
  }>;
}

/**
 * Calculate the difference between two configurations.
 */
export function diffConfigs(
  oldConfig: ConfigRecord,
  newConfig: ConfigRecord
): ConfigDiff {
  const added: Record<string, ConfigValue> = {};
  const removed: string[] = [];
  const changed: Array<{
    path: string;
    oldValue: ConfigValue;
    newValue: ConfigValue;
  }> = [];

  const oldPaths = new Set(getAllPaths(oldConfig));
  const newPaths = new Set(getAllPaths(newConfig));

  // Find added paths
  for (const path of newPaths) {
    if (!oldPaths.has(path)) {
      added[path] = getValueAtPath(newConfig, path);
    }
  }

  // Find removed paths
  for (const path of oldPaths) {
    if (!newPaths.has(path)) {
      removed.push(path);
    }
  }

  // Find changed values
  for (const path of oldPaths) {
    if (newPaths.has(path)) {
      const oldValue = getValueAtPath(oldConfig, path);
      const newValue = getValueAtPath(newConfig, path);

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changed.push({ path, oldValue, newValue });
      }
    }
  }

  return { added, removed, changed };
}

// ============================================================================
// Flatten/Unflatten
// ============================================================================

/**
 * Flatten a nested configuration to dot-notation paths.
 */
export function flattenConfig(
  config: ConfigRecord,
  prefix = ''
): Record<string, ConfigValue> {
  const result: Record<string, ConfigValue> = {};

  for (const [key, value] of Object.entries(config)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      Object.assign(result, flattenConfig(value as ConfigRecord, path));
    } else {
      result[path] = value;
    }
  }

  return result;
}

/**
 * Unflatten a dot-notation configuration to nested structure.
 */
export function unflattenConfig(
  flat: Record<string, ConfigValue>
): ConfigRecord {
  let result: ConfigRecord = {};

  for (const [path, value] of Object.entries(flat)) {
    result = setValueAtPath(result, path, value);
  }

  return result;
}
