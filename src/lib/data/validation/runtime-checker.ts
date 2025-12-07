/**
 * @file Runtime Type Checker
 * @description Production-grade runtime type checking with type guards,
 * assertion functions, branded types, and narrowing utilities.
 *
 * Features:
 * - Type guard functions for runtime verification
 * - Assertion functions with detailed error messages
 * - Branded types for nominal typing
 * - Type narrowing utilities
 * - Composable checkers
 *
 * @example
 * ```typescript
 * import { is, assert, brand } from '@/lib/data/validation';
 *
 * // Type guards
 * if (is.string(value)) {
 *   value.toUpperCase(); // TypeScript knows it's a string
 * }
 *
 * // Assertions
 * assert.string(value, 'Expected string');
 * value.toUpperCase(); // TypeScript knows it's a string
 *
 * // Branded types
 * type UserId = Brand<string, 'UserId'>;
 * const userId = brand<UserId>(id);
 * ```
 */

// =============================================================================
// BRANDED TYPES
// =============================================================================

/**
 * Brand type for nominal typing
 * Prevents accidental assignment between structurally identical types
 */
declare const BRAND: unique symbol;

export type Brand<T, B extends string> = T & { [BRAND]: B };

/**
 * Create a branded value
 */
export function brand<T extends Brand<unknown, string>>(
  value: T extends Brand<infer U, string> ? U : never
): T {
  return value as T;
}

/**
 * Extract the base type from a branded type
 */
export type Unbrand<T> = T extends Brand<infer U, string> ? U : T;

// =============================================================================
// TYPE GUARD TYPES
// =============================================================================

/**
 * Type guard function signature
 */
export type TypeGuard<T> = (value: unknown) => value is T;

/**
 * Type assertion function signature
 */
export type TypeAssertion<T> = (value: unknown, message?: string) => asserts value is T;

/**
 * Runtime check result
 */
export interface CheckResult<T> {
  success: boolean;
  value: T | undefined;
  error?: string;
}

// =============================================================================
// PRIMITIVE TYPE GUARDS
// =============================================================================

/**
 * Check if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Check if value is a number (excludes NaN)
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

/**
 * Check if value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Check if value is a bigint
 */
export function isBigInt(value: unknown): value is bigint {
  return typeof value === 'bigint';
}

/**
 * Check if value is a symbol
 */
export function isSymbol(value: unknown): value is symbol {
  return typeof value === 'symbol';
}

/**
 * Check if value is undefined
 */
export function isUndefined(value: unknown): value is undefined {
  return value === undefined;
}

/**
 * Check if value is null
 */
export function isNull(value: unknown): value is null {
  return value === null;
}

/**
 * Check if value is null or undefined
 */
export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Check if value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Check if value is a function
 */
export function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === 'function';
}

// =============================================================================
// OBJECT TYPE GUARDS
// =============================================================================

/**
 * Check if value is an object (excludes null and arrays)
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check if value is a plain object (not a class instance)
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!isObject(value)) return false;
  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === null || prototype === Object.prototype;
}

/**
 * Check if value is an array
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Check if value is an array of specific type
 */
export function isArrayOf<T>(value: unknown, guard: TypeGuard<T>): value is T[] {
  return Array.isArray(value) && value.every(guard);
}

/**
 * Check if value is a Date
 */
export function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Check if value is a RegExp
 */
export function isRegExp(value: unknown): value is RegExp {
  return value instanceof RegExp;
}

/**
 * Check if value is a Map
 */
export function isMap<K = unknown, V = unknown>(value: unknown): value is Map<K, V> {
  return value instanceof Map;
}

/**
 * Check if value is a Set
 */
export function isSet<T = unknown>(value: unknown): value is Set<T> {
  return value instanceof Set;
}

/**
 * Check if value is a Promise
 */
export function isPromise<T = unknown>(value: unknown): value is Promise<T> {
  return (
    value instanceof Promise || (isObject(value) && isFunction((value as { then?: unknown }).then))
  );
}

/**
 * Check if value is an Error
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

// =============================================================================
// NUMBER REFINEMENT GUARDS
// =============================================================================

/**
 * Check if value is an integer
 */
export function isInteger(value: unknown): value is number {
  return isNumber(value) && Number.isInteger(value);
}

/**
 * Check if value is a positive number
 */
export function isPositive(value: unknown): value is number {
  return isNumber(value) && value > 0;
}

/**
 * Check if value is a negative number
 */
export function isNegative(value: unknown): value is number {
  return isNumber(value) && value < 0;
}

/**
 * Check if value is a non-negative number
 */
export function isNonNegative(value: unknown): value is number {
  return isNumber(value) && value >= 0;
}

/**
 * Check if value is a finite number
 */
export function isFinite(value: unknown): value is number {
  return isNumber(value) && Number.isFinite(value);
}

/**
 * Check if number is within range (inclusive)
 */
export function isInRange(value: unknown, min: number, max: number): value is number {
  return isNumber(value) && value >= min && value <= max;
}

// =============================================================================
// STRING REFINEMENT GUARDS
// =============================================================================

/**
 * Check if value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.length > 0;
}

/**
 * Check if string matches pattern
 */
export function isStringMatching(value: unknown, pattern: RegExp): value is string {
  return isString(value) && pattern.test(value);
}

/**
 * Check if value is a valid email
 */
export function isEmail(value: unknown): value is string {
  return isString(value) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Check if value is a valid URL
 */
export function isURL(value: unknown): value is string {
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
export function isUUID(value: unknown): value is string {
  return (
    isString(value) &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

/**
 * Check if value is a valid ISO date string
 */
export function isISODateString(value: unknown): value is string {
  if (!isString(value)) return false;
  const date = new Date(value);
  return !isNaN(date.getTime()) && value.includes('-');
}

/**
 * Check if value is a valid JSON string
 */
export function isJSONString(value: unknown): value is string {
  if (!isString(value)) return false;
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// OBJECT SHAPE GUARDS
// =============================================================================

/**
 * Check if object has a specific key
 */
export function hasKey<K extends string>(value: unknown, key: K): value is Record<K, unknown> {
  return isObject(value) && key in value;
}

/**
 * Check if object has specific keys
 */
export function hasKeys<K extends string>(value: unknown, keys: K[]): value is Record<K, unknown> {
  return isObject(value) && keys.every((key) => key in value);
}

/**
 * Check if object has key with specific type
 */
export function hasKeyOfType<K extends string, T>(
  value: unknown,
  key: K,
  guard: TypeGuard<T>
): value is Record<K, T> {
  return hasKey(value, key) && guard(value[key]);
}

/**
 * Create a shape guard for objects
 */
export function isShapeOf<T extends Record<string, TypeGuard<unknown>>>(
  shape: T
): TypeGuard<{ [K in keyof T]: T[K] extends TypeGuard<infer U> ? U : never }> {
  return (
    value: unknown
  ): value is { [K in keyof T]: T[K] extends TypeGuard<infer U> ? U : never } => {
    if (!isObject(value)) return false;
    for (const [key, guard] of Object.entries(shape)) {
      if (!guard(value[key])) return false;
    }
    return true;
  };
}

// =============================================================================
// UNION AND LITERAL GUARDS
// =============================================================================

/**
 * Check if value is one of the specified values
 */
export function isOneOf<T extends readonly unknown[]>(
  value: unknown,
  values: T
): value is T[number] {
  return values.includes(value);
}

/**
 * Check if value is a specific literal
 */
export function isLiteral<T extends string | number | boolean>(
  value: unknown,
  literal: T
): value is T {
  return value === literal;
}

/**
 * Create a union type guard
 */
export function isUnion<T extends TypeGuard<unknown>[]>(
  ...guards: T
): TypeGuard<T[number] extends TypeGuard<infer U> ? U : never> {
  return (value: unknown): value is T[number] extends TypeGuard<infer U> ? U : never => {
    return guards.some((guard) => guard(value));
  };
}

/**
 * Create an intersection type guard
 */
export function isIntersection<T extends TypeGuard<unknown>[]>(
  ...guards: T
): TypeGuard<T extends TypeGuard<infer U>[] ? U : never> {
  return (value: unknown): value is T extends TypeGuard<infer U>[] ? U : never => {
    return guards.every((guard) => guard(value));
  };
}

// =============================================================================
// ASSERTION FUNCTIONS
// =============================================================================

/**
 * Assertion error class
 */
export class AssertionError extends Error {
  readonly received: unknown;
  readonly expected?: string;

  constructor(message: string, received: unknown, expected?: string) {
    super(message);
    this.name = 'AssertionError';
    this.received = received;
    this.expected = expected;
  }
}

/**
 * Create an assertion function from a type guard
 */
export function createAssertion<T>(guard: TypeGuard<T>, defaultMessage: string): TypeAssertion<T> {
  return (value: unknown, message?: string): asserts value is T => {
    if (!guard(value)) {
      throw new AssertionError(message ?? defaultMessage, value);
    }
  };
}

/**
 * Assert that value is a string
 */
export function assertString(value: unknown, message?: string): asserts value is string {
  if (!isString(value)) {
    throw new AssertionError(
      message ?? `Expected string, received ${typeof value}`,
      value,
      'string'
    );
  }
}

/**
 * Assert that value is a number
 */
export function assertNumber(value: unknown, message?: string): asserts value is number {
  if (!isNumber(value)) {
    throw new AssertionError(
      message ?? `Expected number, received ${typeof value}`,
      value,
      'number'
    );
  }
}

/**
 * Assert that value is a boolean
 */
export function assertBoolean(value: unknown, message?: string): asserts value is boolean {
  if (!isBoolean(value)) {
    throw new AssertionError(
      message ?? `Expected boolean, received ${typeof value}`,
      value,
      'boolean'
    );
  }
}

/**
 * Assert that value is an object
 */
export function assertObject(
  value: unknown,
  message?: string
): asserts value is Record<string, unknown> {
  if (!isObject(value)) {
    throw new AssertionError(
      message ?? `Expected object, received ${typeof value}`,
      value,
      'object'
    );
  }
}

/**
 * Assert that value is an array
 */
export function assertArray(value: unknown, message?: string): asserts value is unknown[] {
  if (!isArray(value)) {
    throw new AssertionError(message ?? `Expected array, received ${typeof value}`, value, 'array');
  }
}

/**
 * Assert that value is defined (not null or undefined)
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message?: string
): asserts value is T {
  if (!isDefined(value)) {
    throw new AssertionError(message ?? 'Expected defined value', value, 'defined');
  }
}

/**
 * Assert that value matches a type guard
 */
export function assertType<T>(
  value: unknown,
  guard: TypeGuard<T>,
  message?: string
): asserts value is T {
  if (!guard(value)) {
    throw new AssertionError(message ?? 'Type assertion failed', value);
  }
}

/**
 * Assert condition is truthy
 */
export function assert(condition: unknown, message?: string): asserts condition {
  if (
    condition === false ||
    condition === null ||
    condition === undefined ||
    condition === '' ||
    condition === 0
  ) {
    throw new AssertionError(message ?? 'Assertion failed', condition);
  }
}

// =============================================================================
// NARROWING UTILITIES
// =============================================================================

/**
 * Narrow value to type if guard passes, otherwise return undefined
 */
export function narrow<T>(value: unknown, guard: TypeGuard<T>): T | undefined {
  return guard(value) ? value : undefined;
}

/**
 * Narrow value to type if guard passes, otherwise return default
 */
export function narrowOrDefault<T>(value: unknown, guard: TypeGuard<T>, defaultValue: T): T {
  return guard(value) ? value : defaultValue;
}

/**
 * Narrow value with transform
 */
export function narrowAndTransform<T, U>(
  value: unknown,
  guard: TypeGuard<T>,
  transform: (value: T) => U
): U | undefined {
  return guard(value) ? transform(value) : undefined;
}

/**
 * Create a safe accessor for object properties
 */
export function safeGet<T>(obj: unknown, key: string, guard: TypeGuard<T>): T | undefined {
  if (!isObject(obj)) return undefined;
  const value = obj[key];
  return guard(value) ? value : undefined;
}

/**
 * Create a deep safe accessor
 */
export function safeGetPath<T>(obj: unknown, path: string[], guard: TypeGuard<T>): T | undefined {
  let current: unknown = obj;

  for (const key of path) {
    if (!isObject(current)) return undefined;
    current = current[key];
  }

  return guard(current) ? current : undefined;
}

// =============================================================================
// RUNTIME CHECK UTILITIES
// =============================================================================

/**
 * Check value and return result object
 */
export function check<T>(value: unknown, guard: TypeGuard<T>): CheckResult<T> {
  if (guard(value)) {
    return { success: true, value };
  }
  return { success: false, value: undefined, error: 'Type check failed' };
}

/**
 * Check value with custom error message
 */
export function checkWithError<T>(
  value: unknown,
  guard: TypeGuard<T>,
  errorMessage: string
): CheckResult<T> {
  if (guard(value)) {
    return { success: true, value };
  }
  return { success: false, value: undefined, error: errorMessage };
}

/**
 * Chain multiple checks
 */
export function checkAll<T extends Record<string, [unknown, TypeGuard<unknown>]>>(
  checks: T
): {
  success: boolean;
  values: { [K in keyof T]: T[K][1] extends TypeGuard<infer U> ? U | undefined : never };
  errors: string[];
} {
  const values: Record<string, unknown> = {};
  const errors: string[] = [];

  for (const [key, [value, guard]] of Object.entries(checks)) {
    if (guard(value)) {
      values[key] = value;
    } else {
      errors.push(`${key}: Type check failed`);
    }
  }

  return {
    success: errors.length === 0,
    values: values as {
      [K in keyof T]: T[K][1] extends TypeGuard<infer U> ? U | undefined : never;
    },
    errors,
  };
}

// =============================================================================
// COMPOSABLE GUARD FACTORY
// =============================================================================

/**
 * Create a composable type guard
 */
export function createGuard<T>(checker: (value: unknown) => boolean): TypeGuard<T> {
  return checker as TypeGuard<T>;
}

/**
 * Create a refinement guard
 */
export function refine<T, U extends T>(
  guard: TypeGuard<T>,
  refinement: (value: T) => value is U
): TypeGuard<U> {
  return (value: unknown): value is U => guard(value) && refinement(value);
}

/**
 * Create an optional guard
 */
export function optional<T>(guard: TypeGuard<T>): TypeGuard<T | undefined> {
  return (value: unknown): value is T | undefined => value === undefined || guard(value);
}

/**
 * Create a nullable guard
 */
export function nullable<T>(guard: TypeGuard<T>): TypeGuard<T | null> {
  return (value: unknown): value is T | null => value === null || guard(value);
}

/**
 * Create a record guard
 */
export function record<T>(valueGuard: TypeGuard<T>): TypeGuard<Record<string, T>> {
  return (value: unknown): value is Record<string, T> => {
    if (!isObject(value)) return false;
    return Object.values(value).every(valueGuard);
  };
}

/**
 * Create a tuple guard
 */
export function tuple<T extends TypeGuard<unknown>[]>(
  ...guards: T
): TypeGuard<{ [K in keyof T]: T[K] extends TypeGuard<infer U> ? U : never }> {
  return (
    value: unknown
  ): value is { [K in keyof T]: T[K] extends TypeGuard<infer U> ? U : never } => {
    if (!isArray(value)) return false;
    if (value.length !== guards.length) return false;
    return guards.every((guard, index) => guard(value[index]));
  };
}

// =============================================================================
// NAMESPACE EXPORTS (is, assert)
// =============================================================================

/**
 * Type guard namespace
 */
export const is = {
  // Primitives
  string: isString,
  number: isNumber,
  boolean: isBoolean,
  bigint: isBigInt,
  symbol: isSymbol,
  undefined: isUndefined,
  null: isNull,
  nullish: isNullish,
  defined: isDefined,
  function: isFunction,

  // Objects
  object: isObject,
  plainObject: isPlainObject,
  array: isArray,
  arrayOf: isArrayOf,
  date: isDate,
  regExp: isRegExp,
  map: isMap,
  set: isSet,
  promise: isPromise,
  error: isError,

  // Number refinements
  integer: isInteger,
  positive: isPositive,
  negative: isNegative,
  nonNegative: isNonNegative,
  finite: isFinite,
  inRange: isInRange,

  // String refinements
  nonEmptyString: isNonEmptyString,
  stringMatching: isStringMatching,
  email: isEmail,
  url: isURL,
  uuid: isUUID,
  isoDateString: isISODateString,
  jsonString: isJSONString,

  // Object shape
  hasKey,
  hasKeys,
  hasKeyOfType,
  shapeOf: isShapeOf,

  // Union and literal
  oneOf: isOneOf,
  literal: isLiteral,
  union: isUnion,
  intersection: isIntersection,
} as const;

/**
 * Assertion namespace
 */
export const assertIs = {
  string: assertString,
  number: assertNumber,
  boolean: assertBoolean,
  object: assertObject,
  array: assertArray,
  defined: assertDefined,
  type: assertType,
  that: assert,
} as const;
