/**
 * Object Manipulation Utilities
 *
 * Provides type-safe object transformation and manipulation functions
 * for deep cloning, merging, filtering, and property access.
 *
 * @module utils/object
 * @example
 * ```typescript
 * import { deepClone, merge, pick, omit } from '@missionfabric-js/enzyme-typescript/utils';
 *
 * const obj = { a: 1, b: { c: 2 } };
 * const cloned = deepClone(obj);
 * const merged = merge({ a: 1 }, { b: 2 });
 * ```
 */

/**
 * Creates a deep clone of an object.
 *
 * @param obj - The object to clone
 * @returns A deep clone of the object
 *
 * @example
 * ```typescript
 * const original = { a: 1, b: { c: 2 } };
 * const cloned = deepClone(original);
 * cloned.b.c = 3;
 * console.log(original.b.c); // 2
 * ```
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }

  if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item)) as T;
  }

  const clonedObj = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clonedObj[key] = deepClone(obj[key]);
    }
  }

  return clonedObj;
}

/**
 * Deeply merges multiple objects.
 *
 * @param target - The target object
 * @param sources - The source objects to merge
 * @returns The merged object
 *
 * @example
 * ```typescript
 * merge({ a: 1 }, { b: 2 }); // { a: 1, b: 2 }
 * merge({ a: { b: 1 } }, { a: { c: 2 } }); // { a: { b: 1, c: 2 } }
 * ```
 */
export function merge<T extends Record<string, any>>(
  target: T,
  ...sources: Partial<T>[]
): T {
  if (!sources.length) return target;

  const result = deepClone(target);

  for (const source of sources) {
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const sourceValue = source[key];
        const targetValue = result[key];

        if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
          result[key] = merge(targetValue as any, sourceValue as any);
        } else {
          result[key] = deepClone(sourceValue) as any;
        }
      }
    }
  }

  return result;
}

/**
 * Picks specified properties from an object.
 *
 * @param obj - The source object
 * @param keys - The keys to pick
 * @returns A new object with only the picked properties
 *
 * @example
 * ```typescript
 * pick({ a: 1, b: 2, c: 3 }, ['a', 'c']); // { a: 1, c: 3 }
 * ```
 */
export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Omits specified properties from an object.
 *
 * @param obj - The source object
 * @param keys - The keys to omit
 * @returns A new object without the omitted properties
 *
 * @example
 * ```typescript
 * omit({ a: 1, b: 2, c: 3 }, ['b']); // { a: 1, c: 3 }
 * ```
 */
export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

/**
 * Gets a nested property value from an object using a path string.
 *
 * @param obj - The source object
 * @param path - The path to the property (e.g., 'a.b.c' or 'a[0].b')
 * @param defaultValue - The default value if the property doesn't exist
 * @returns The property value or default value
 *
 * @example
 * ```typescript
 * const obj = { a: { b: { c: 42 } } };
 * get(obj, 'a.b.c'); // 42
 * get(obj, 'a.b.d', 'default'); // 'default'
 * ```
 */
export function get<T = any>(
  obj: any,
  path: string,
  defaultValue?: T
): T | undefined {
  const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let result = obj;

  for (const key of keys) {
    if (result == null) {
      return defaultValue;
    }
    result = result[key];
  }

  return result !== undefined ? result : defaultValue;
}

/**
 * Sets a nested property value in an object using a path string.
 *
 * @param obj - The target object
 * @param path - The path to the property (e.g., 'a.b.c')
 * @param value - The value to set
 * @returns The modified object
 *
 * @example
 * ```typescript
 * const obj = {};
 * set(obj, 'a.b.c', 42); // { a: { b: { c: 42 } } }
 * ```
 */
export function set<T extends object>(obj: T, path: string, value: any): T {
  const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let current: any = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
  return obj;
}

/**
 * Checks if an object has a nested property using a path string.
 *
 * @param obj - The source object
 * @param path - The path to check (e.g., 'a.b.c')
 * @returns True if the property exists
 *
 * @example
 * ```typescript
 * const obj = { a: { b: { c: 42 } } };
 * has(obj, 'a.b.c'); // true
 * has(obj, 'a.b.d'); // false
 * ```
 */
export function has(obj: any, path: string): boolean {
  const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let current = obj;

  for (const key of keys) {
    if (current == null || !(key in current)) {
      return false;
    }
    current = current[key];
  }

  return true;
}

/**
 * Checks if a value is a plain object.
 *
 * @param value - The value to check
 * @returns True if the value is a plain object
 *
 * @example
 * ```typescript
 * isPlainObject({}); // true
 * isPlainObject({ a: 1 }); // true
 * isPlainObject([]); // false
 * isPlainObject(null); // false
 * ```
 */
export function isPlainObject(value: any): value is Record<string, any> {
  return (
    value !== null &&
    typeof value === 'object' &&
    value.constructor === Object &&
    Object.prototype.toString.call(value) === '[object Object]'
  );
}

/**
 * Checks if two objects are deeply equal.
 *
 * @param obj1 - The first object
 * @param obj2 - The second object
 * @returns True if the objects are deeply equal
 *
 * @example
 * ```typescript
 * deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 }); // true
 * deepEqual({ a: { b: 1 } }, { a: { b: 1 } }); // true
 * deepEqual({ a: 1 }, { a: 2 }); // false
 * ```
 */
export function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;

  if (
    typeof obj1 !== 'object' ||
    typeof obj2 !== 'object' ||
    obj1 == null ||
    obj2 == null
  ) {
    return false;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) {
      return false;
    }
  }

  return true;
}

/**
 * Flattens a nested object into a single-level object with dot-notation keys.
 *
 * @param obj - The object to flatten
 * @param prefix - The prefix for keys (used internally)
 * @returns The flattened object
 *
 * @example
 * ```typescript
 * flatten({ a: { b: { c: 1 } } }); // { 'a.b.c': 1 }
 * flatten({ a: [1, 2], b: 3 }); // { 'a.0': 1, 'a.1': 2, b: 3 }
 * ```
 */
export function flatten(
  obj: Record<string, any>,
  prefix = ''
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];

      if (isPlainObject(value) || Array.isArray(value)) {
        Object.assign(result, flatten(value, newKey));
      } else {
        result[newKey] = value;
      }
    }
  }

  return result;
}

/**
 * Unflattens a dot-notation object into a nested object.
 *
 * @param obj - The object to unflatten
 * @returns The unflattened object
 *
 * @example
 * ```typescript
 * unflatten({ 'a.b.c': 1 }); // { a: { b: { c: 1 } } }
 * unflatten({ 'a.0': 1, 'a.1': 2 }); // { a: [1, 2] }
 * ```
 */
export function unflatten(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      set(result, key, obj[key]);
    }
  }

  return result;
}

/**
 * Filters an object's properties based on a predicate function.
 *
 * @param obj - The source object
 * @param predicate - The predicate function
 * @returns A new object with filtered properties
 *
 * @example
 * ```typescript
 * filterObject({ a: 1, b: 2, c: 3 }, (value) => value > 1); // { b: 2, c: 3 }
 * filterObject({ a: 1, b: 'two' }, (_, key) => key === 'a'); // { a: 1 }
 * ```
 */
export function filterObject<T extends Record<string, any>>(
  obj: T,
  predicate: (value: T[keyof T], key: keyof T) => boolean
): Partial<T> {
  const result: Partial<T> = {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (predicate(obj[key], key)) {
        result[key] = obj[key];
      }
    }
  }

  return result;
}

/**
 * Maps an object's values using a transform function.
 *
 * @param obj - The source object
 * @param mapper - The mapper function
 * @returns A new object with mapped values
 *
 * @example
 * ```typescript
 * mapObject({ a: 1, b: 2 }, (value) => value * 2); // { a: 2, b: 4 }
 * mapObject({ a: 1, b: 2 }, (value, key) => `${key}:${value}`); // { a: 'a:1', b: 'b:2' }
 * ```
 */
export function mapObject<T extends Record<string, any>, R>(
  obj: T,
  mapper: (value: T[keyof T], key: keyof T) => R
): Record<keyof T, R> {
  const result: any = {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = mapper(obj[key], key);
    }
  }

  return result;
}

/**
 * Inverts an object's keys and values.
 *
 * @param obj - The object to invert
 * @returns The inverted object
 *
 * @example
 * ```typescript
 * invert({ a: '1', b: '2' }); // { '1': 'a', '2': 'b' }
 * ```
 */
export function invert<K extends string | number, V extends string | number>(
  obj: Record<K, V>
): Record<V, K> {
  const result: any = {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[obj[key]] = key;
    }
  }

  return result;
}

/**
 * Gets all keys of an object including nested keys with dot notation.
 *
 * @param obj - The source object
 * @param prefix - The prefix for keys (used internally)
 * @returns An array of all keys
 *
 * @example
 * ```typescript
 * getAllKeys({ a: { b: 1 }, c: 2 }); // ['a', 'a.b', 'c']
 * ```
 */
export function getAllKeys(obj: Record<string, any>, prefix = ''): string[] {
  const keys: string[] = [];

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      keys.push(newKey);

      if (isPlainObject(obj[key])) {
        keys.push(...getAllKeys(obj[key], newKey));
      }
    }
  }

  return keys;
}
