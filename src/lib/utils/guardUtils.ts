/**
 * @file Guard Utilities
 * @description Type guards and validation utilities
 */

/**
 * Check if value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Check if value is null or undefined
 */
export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Check if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Check if value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Check if value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Check if value is a finite number
 */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && isFinite(value);
}

/**
 * Check if value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Check if value is a function
 */
export function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === 'function';
}

/**
 * Check if value is an object (not null, not array)
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check if value is an array
 */
export function isArray<T = unknown>(value: unknown): value is T[] {
  return Array.isArray(value);
}

/**
 * Check if value is a non-empty array
 */
export function isNonEmptyArray<T = unknown>(value: unknown): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Check if value is a Date
 */
export function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Check if value is a valid date string
 */
export function isDateString(value: unknown): value is string {
  if (!isString(value)) return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

/**
 * Check if value is a Promise
 */
export function isPromise<T = unknown>(value: unknown): value is Promise<T> {
  return value instanceof Promise || (
    isObject(value) &&
    isFunction((value).then) &&
    isFunction((value).catch)
  );
}

/**
 * Check if value matches a type guard
 */
export function assert<T>(
  value: unknown,
  guard: (value: unknown) => value is T,
  message?: string
): asserts value is T {
  if (!guard(value)) {
    throw new TypeError(message ?? 'Type assertion failed');
  }
}

/**
 * Check if value is one of allowed values
 */
export function isOneOf<T>(value: unknown, allowedValues: readonly T[]): value is T {
  return allowedValues.includes(value as T);
}

/**
 * Check if object has key
 */
export function hasKey<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
  return isObject(obj) && key in obj;
}

/**
 * Check if object has all required keys
 */
export function hasKeys<K extends string>(
  obj: unknown,
  keys: readonly K[]
): obj is Record<K, unknown> {
  return isObject(obj) && keys.every((key) => key in obj);
}

/**
 * Check if value is an Error
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Check if value is a valid email
 */
export function isEmail(value: unknown): value is string {
  if (!isString(value)) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * Check if value is a valid URL
 */
export function isUrl(value: unknown): value is string {
  if (!isString(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if value is a valid UUID
 */
export function isUuid(value: unknown): value is string {
  if (!isString(value)) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Narrow type or return undefined
 */
export function narrow<T>(
  value: unknown,
  guard: (value: unknown) => value is T
): T | undefined {
  return guard(value) ? value : undefined;
}

/**
 * Narrow type or return default
 */
export function narrowOr<T>(
  value: unknown,
  guard: (value: unknown) => value is T,
  defaultValue: T
): T {
  return guard(value) ? value : defaultValue;
}

/**
 * Create a type guard for object shape
 */
export function createShapeGuard<T extends Record<string, unknown>>(
  shape: { [K in keyof T]: (value: unknown) => value is T[K] }
): (value: unknown) => value is T {
  return (value: unknown): value is T => {
    if (!isObject(value)) return false;
    
    for (const key of Object.keys(shape) as (keyof T)[]) {
      if (!(key in value) || !shape[key]((value)[key as string])) {
        return false;
      }
    }
    
    return true;
  };
}

/**
 * Safe JSON parse with type guard
 */
export function safeJsonParse<T>(
  json: string,
  guard: (value: unknown) => value is T
): T | undefined {
  try {
    const parsed: unknown = JSON.parse(json);
    return guard(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}
