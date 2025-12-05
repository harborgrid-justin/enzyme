/**
 * Deep configuration merging with override strategies.
 *
 * @module @missionfabric-js/enzyme-typescript/config/merge
 *
 * @example
 * ```typescript
 * import { mergeConfigs, mergeWithStrategy } from '@missionfabric-js/enzyme-typescript/config';
 *
 * const base = {
 *   database: { host: 'localhost', port: 5432 },
 *   features: { beta: true }
 * };
 *
 * const override = {
 *   database: { port: 3306 },
 *   features: { alpha: true }
 * };
 *
 * const merged = mergeConfigs(base, override);
 * // Result: {
 * //   database: { host: 'localhost', port: 3306 },
 * //   features: { beta: true, alpha: true }
 * // }
 * ```
 */

import type {
  ConfigSchema,
  MergeOptions,
  MergeStrategy,
} from './types';

/**
 * Deep merge two configuration objects.
 *
 * @template T - The configuration schema type
 * @param target - The target configuration object
 * @param source - The source configuration object to merge
 * @param options - Merge options
 * @returns The merged configuration object
 *
 * @example
 * ```typescript
 * const config = mergeConfigs(
 *   { api: { timeout: 5000, retries: 3 } },
 *   { api: { timeout: 10000 } }
 * );
 * // Result: { api: { timeout: 10000, retries: 3 } }
 * ```
 */
export function mergeConfigs<T extends ConfigSchema>(
  target: T,
  source: Partial<T>,
  options: MergeOptions = {}
): T {
  const {
    strategy = 'deep',
    clone = true,
    mergeArrays = true,
    arrayStrategy = 'replace',
    excludeKeys = [],
    preserveUndefined = false,
    customMerge,
  } = options;

  // Clone target if requested
  const result = clone ? deepClone(target) : target;

  // Handle null or undefined source
  if (source == null) {
    return result;
  }

  // Iterate over source properties
  for (const key in source) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) {
      continue;
    }

    // Skip excluded keys
    if (excludeKeys.includes(key)) {
      continue;
    }

    const sourceValue = source[key];
    const targetValue = result[key];

    // Skip undefined values if not preserving
    if (!preserveUndefined && sourceValue === undefined) {
      continue;
    }

    // Use custom merge function if provided
    if (customMerge) {
      (result as any)[key] = customMerge(targetValue, sourceValue, key);
      continue;
    }

    // Apply merge strategy
    (result as any)[key] = mergeValue(
      targetValue,
      sourceValue,
      strategy,
      mergeArrays,
      arrayStrategy,
      options
    );
  }

  return result;
}

/**
 * Merge multiple configuration objects in order.
 *
 * @template T - The configuration schema type
 * @param configs - Configuration objects to merge
 * @param options - Merge options
 * @returns The merged configuration object
 *
 * @example
 * ```typescript
 * const config = mergeMultiple(
 *   { level: 'info', format: 'json' },
 *   { level: 'debug' },
 *   { format: 'text' }
 * );
 * // Result: { level: 'debug', format: 'text' }
 * ```
 */
export function mergeMultiple<T extends ConfigSchema>(
  ...configs: Array<Partial<T> | MergeOptions>
): T {
  const options = configs[configs.length - 1];
  const mergeOptions =
    typeof options === 'object' &&
    options !== null &&
    ('strategy' in options || 'clone' in options)
      ? (options as MergeOptions)
      : {};

  const configsToMerge =
    mergeOptions === options
      ? (configs.slice(0, -1) as Array<Partial<T>>)
      : (configs as Array<Partial<T>>);

  if (configsToMerge.length === 0) {
    return {} as T;
  }

  let result = configsToMerge[0] as T;

  for (let i = 1; i < configsToMerge.length; i++) {
    result = mergeConfigs(result, configsToMerge[i], mergeOptions);
  }

  return result;
}

/**
 * Merge configurations with a specific strategy.
 *
 * @template T - The configuration schema type
 * @param target - The target configuration object
 * @param source - The source configuration object
 * @param strategy - The merge strategy to use
 * @returns The merged configuration object
 *
 * @example
 * ```typescript
 * // Override strategy - always use source value
 * const config = mergeWithStrategy(
 *   { items: [1, 2, 3] },
 *   { items: [4, 5] },
 *   'override'
 * );
 * // Result: { items: [4, 5] }
 *
 * // Preserve strategy - keep target value
 * const config2 = mergeWithStrategy(
 *   { items: [1, 2, 3] },
 *   { items: [4, 5] },
 *   'preserve'
 * );
 * // Result: { items: [1, 2, 3] }
 * ```
 */
export function mergeWithStrategy<T extends ConfigSchema>(
  target: T,
  source: Partial<T>,
  strategy: MergeStrategy
): T {
  return mergeConfigs(target, source, { strategy });
}

/**
 * Deep clone an object.
 *
 * @template T - The object type
 * @param obj - The object to clone
 * @returns The cloned object
 *
 * @example
 * ```typescript
 * const original = { nested: { value: 42 } };
 * const cloned = deepClone(original);
 * cloned.nested.value = 100;
 * console.log(original.nested.value); // 42
 * ```
 */
export function deepClone<T>(obj: T): T {
  // Handle primitive types and null
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Handle Date
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }

  // Handle RegExp
  if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags) as T;
  }

  // Handle Array
  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item)) as T;
  }

  // Handle Map
  if (obj instanceof Map) {
    const cloned = new Map();
    obj.forEach((value, key) => {
      cloned.set(deepClone(key), deepClone(value));
    });
    return cloned as T;
  }

  // Handle Set
  if (obj instanceof Set) {
    const cloned = new Set();
    obj.forEach((value) => {
      cloned.add(deepClone(value));
    });
    return cloned as T;
  }

  // Handle Object
  const cloned = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      (cloned as any)[key] = deepClone(obj[key]);
    }
  }

  return cloned;
}

/**
 * Merge a single value based on strategy.
 *
 * @param targetValue - The target value
 * @param sourceValue - The source value
 * @param strategy - The merge strategy
 * @param mergeArrays - Whether to merge arrays
 * @param arrayStrategy - The array merge strategy
 * @param options - Additional merge options
 * @returns The merged value
 */
function mergeValue(
  targetValue: unknown,
  sourceValue: unknown,
  strategy: MergeStrategy,
  mergeArrays: boolean,
  arrayStrategy: 'replace' | 'concat' | 'unique',
  options: MergeOptions
): unknown {
  // Handle preserve strategy
  if (strategy === 'preserve' && targetValue !== undefined) {
    return targetValue;
  }

  // Handle override strategy
  if (strategy === 'override') {
    return sourceValue;
  }

  // Handle shallow merge
  if (strategy === 'shallow') {
    return sourceValue !== undefined ? sourceValue : targetValue;
  }

  // Handle append strategy for arrays
  if (strategy === 'append' && Array.isArray(targetValue) && Array.isArray(sourceValue)) {
    return [...targetValue, ...sourceValue];
  }

  // Handle arrays
  if (Array.isArray(sourceValue)) {
    if (!mergeArrays || !Array.isArray(targetValue)) {
      return sourceValue;
    }

    switch (arrayStrategy) {
      case 'concat':
        return [...targetValue, ...sourceValue];
      case 'unique':
        return [...new Set([...targetValue, ...sourceValue])];
      case 'replace':
      default:
        return sourceValue;
    }
  }

  // Handle objects (deep merge)
  if (
    strategy === 'deep' &&
    isPlainObject(targetValue) &&
    isPlainObject(sourceValue)
  ) {
    return mergeConfigs(
      targetValue as ConfigSchema,
      sourceValue as ConfigSchema,
      options
    );
  }

  // Default: use source value if defined, otherwise target
  return sourceValue !== undefined ? sourceValue : targetValue;
}

/**
 * Check if a value is a plain object.
 *
 * @param value - The value to check
 * @returns True if the value is a plain object
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Diff two configuration objects.
 *
 * @template T - The configuration schema type
 * @param original - The original configuration
 * @param updated - The updated configuration
 * @param path - Current path (used internally for recursion)
 * @returns Array of changes
 *
 * @example
 * ```typescript
 * const changes = diffConfigs(
 *   { api: { timeout: 5000 } },
 *   { api: { timeout: 10000, retries: 3 } }
 * );
 * // Result: [
 * //   { path: 'api.timeout', oldValue: 5000, newValue: 10000, type: 'modified' },
 * //   { path: 'api.retries', oldValue: undefined, newValue: 3, type: 'added' }
 * // ]
 * ```
 */
export function diffConfigs<T extends ConfigSchema>(
  original: T,
  updated: T,
  path = ''
): Array<{
  path: string;
  oldValue: unknown;
  newValue: unknown;
  type: 'added' | 'modified' | 'deleted';
}> {
  const changes: Array<{
    path: string;
    oldValue: unknown;
    newValue: unknown;
    type: 'added' | 'modified' | 'deleted';
  }> = [];

  // Check for modified and deleted keys
  for (const key in original) {
    if (!Object.prototype.hasOwnProperty.call(original, key)) {
      continue;
    }

    const currentPath = path ? `${path}.${key}` : key;
    const originalValue = original[key];
    const updatedValue = updated[key];

    if (!(key in updated)) {
      // Key was deleted
      changes.push({
        path: currentPath,
        oldValue: originalValue,
        newValue: undefined,
        type: 'deleted',
      });
    } else if (isPlainObject(originalValue) && isPlainObject(updatedValue)) {
      // Recursively diff nested objects
      changes.push(
        ...diffConfigs(
          originalValue as ConfigSchema,
          updatedValue as ConfigSchema,
          currentPath
        )
      );
    } else if (!deepEqual(originalValue, updatedValue)) {
      // Value was modified
      changes.push({
        path: currentPath,
        oldValue: originalValue,
        newValue: updatedValue,
        type: 'modified',
      });
    }
  }

  // Check for added keys
  for (const key in updated) {
    if (!Object.prototype.hasOwnProperty.call(updated, key)) {
      continue;
    }

    if (!(key in original)) {
      const currentPath = path ? `${path}.${key}` : key;
      changes.push({
        path: currentPath,
        oldValue: undefined,
        newValue: updated[key],
        type: 'added',
      });
    }
  }

  return changes;
}

/**
 * Deep equality check.
 *
 * @param a - First value
 * @param b - Second value
 * @returns True if values are deeply equal
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }

  if (a == null || b == null) {
    return a === b;
  }

  if (typeof a !== typeof b) {
    return false;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const aKeys = Object.keys(a as object);
    const bKeys = Object.keys(b as object);

    if (aKeys.length !== bKeys.length) {
      return false;
    }

    return aKeys.every((key) =>
      deepEqual((a as any)[key], (b as any)[key])
    );
  }

  return false;
}

/**
 * Freeze configuration object deeply (make immutable).
 *
 * @template T - The configuration schema type
 * @param config - The configuration object to freeze
 * @returns The frozen configuration object
 *
 * @example
 * ```typescript
 * const config = freezeConfig({ api: { timeout: 5000 } });
 * config.api.timeout = 10000; // Throws error in strict mode
 * ```
 */
export function freezeConfig<T extends ConfigSchema>(config: T): Readonly<T> {
  if (Object.isFrozen(config)) {
    return config;
  }

  // Freeze nested objects
  for (const key in config) {
    if (Object.prototype.hasOwnProperty.call(config, key)) {
      const value = config[key];
      if (typeof value === 'object' && value !== null) {
        freezeConfig(value as ConfigSchema);
      }
    }
  }

  return Object.freeze(config);
}

/**
 * Create a proxy to make configuration object immutable without freezing.
 *
 * @template T - The configuration schema type
 * @param config - The configuration object
 * @returns An immutable proxy of the configuration
 *
 * @example
 * ```typescript
 * const config = makeImmutable({ api: { timeout: 5000 } });
 * config.api.timeout = 10000; // Throws error
 * ```
 */
export function makeImmutable<T extends ConfigSchema>(config: T): Readonly<T> {
  return new Proxy(config, {
    set: () => {
      throw new Error('Configuration is immutable');
    },
    deleteProperty: () => {
      throw new Error('Configuration is immutable');
    },
    get: (target, prop) => {
      const value = target[prop as keyof T];
      if (typeof value === 'object' && value !== null) {
        return makeImmutable(value as ConfigSchema);
      }
      return value;
    },
  }) as Readonly<T>;
}
