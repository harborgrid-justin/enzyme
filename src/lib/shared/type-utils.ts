/**
 * @file Unified Type Utilities
 * @description Centralized type guards, type utilities, and type narrowing functions.
 *
 * This module consolidates type guards from:
 * - utils/guardUtils.ts
 * - Various inline implementations across the codebase
 *
 * @module shared/type-utils
 */

// =============================================================================
// Primitive Type Guards
// =============================================================================

/**
 * Check if value is defined (not null or undefined).
 *
 * @example
 * ```ts
 * const items = [1, null, 2, undefined, 3];
 * const defined = items.filter(isDefined); // [1, 2, 3]
 * ```
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Check if value is null or undefined.
 */
export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Check if value is a string.
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Check if value is a non-empty string (after trimming whitespace).
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Check if value is a number (not NaN).
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Check if value is a finite number.
 */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && isFinite(value);
}

/**
 * Check if value is a positive number.
 */
export function isPositiveNumber(value: unknown): value is number {
  return isNumber(value) && value > 0;
}

/**
 * Check if value is a non-negative number (>= 0).
 */
export function isNonNegativeNumber(value: unknown): value is number {
  return isNumber(value) && value >= 0;
}

/**
 * Check if value is an integer.
 */
export function isInteger(value: unknown): value is number {
  return isNumber(value) && Number.isInteger(value);
}

/**
 * Check if value is a boolean.
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Check if value is a symbol.
 */
export function isSymbol(value: unknown): value is symbol {
  return typeof value === 'symbol';
}

/**
 * Check if value is a bigint.
 */
export function isBigInt(value: unknown): value is bigint {
  return typeof value === 'bigint';
}

// =============================================================================
// Complex Type Guards
// =============================================================================

/**
 * Check if value is a function.
 */
export function isFunction(
  value: unknown
): value is (...args: unknown[]) => unknown {
  return typeof value === 'function';
}

/**
 * Check if value is a plain object (not null, not array).
 *
 * @example
 * ```ts
 * isObject({}) // true
 * isObject([]) // false
 * isObject(null) // false
 * ```
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check if value is a plain object (stricter - checks prototype).
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!isObject(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

/**
 * Check if value is an array.
 */
export function isArray<T = unknown>(value: unknown): value is T[] {
  return Array.isArray(value);
}

/**
 * Check if value is a non-empty array.
 */
export function isNonEmptyArray<T = unknown>(value: unknown): value is [T, ...T[]] {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Check if value is an array of a specific type.
 *
 * @example
 * ```ts
 * const maybeStrings: unknown = ['a', 'b', 'c'];
 * if (isArrayOf(maybeStrings, isString)) {
 *   // maybeStrings is string[]
 * }
 * ```
 */
export function isArrayOf<T>(
  value: unknown,
  guard: (item: unknown) => item is T
): value is T[] {
  return Array.isArray(value) && value.every(guard);
}

/**
 * Check if value is a Date object (and valid).
 */
export function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Check if value is a valid date string.
 */
export function isDateString(value: unknown): value is string {
  if (!isString(value)) return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

/**
 * Check if value is a Promise.
 */
export function isPromise<T = unknown>(value: unknown): value is Promise<T> {
  return (
    value instanceof Promise ||
    (isObject(value) &&
      isFunction((value as Record<string, unknown>).then) &&
      isFunction((value as Record<string, unknown>).catch))
  );
}

/**
 * Check if value is an Error.
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Check if value is a RegExp.
 */
export function isRegExp(value: unknown): value is RegExp {
  return value instanceof RegExp;
}

/**
 * Check if value is a Map.
 */
export function isMap<K = unknown, V = unknown>(
  value: unknown
): value is Map<K, V> {
  return value instanceof Map;
}

/**
 * Check if value is a Set.
 */
export function isSet<T = unknown>(value: unknown): value is Set<T> {
  return value instanceof Set;
}

/**
 * Check if value is a WeakMap.
 */
export function isWeakMap<K extends object = object, V = unknown>(
  value: unknown
): value is WeakMap<K, V> {
  return value instanceof WeakMap;
}

/**
 * Check if value is a WeakSet.
 */
export function isWeakSet<T extends object = object>(
  value: unknown
): value is WeakSet<T> {
  return value instanceof WeakSet;
}

// =============================================================================
// Format Validators
// =============================================================================

/**
 * Check if value is a valid email address.
 */
export function isEmail(value: unknown): value is string {
  if (!isString(value)) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * Check if value is a valid URL.
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
 * Check if value is a valid UUID (v1-v5).
 */
export function isUuid(value: unknown): value is string {
  if (!isString(value)) return false;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Check if value is a valid JSON string.
 */
export function isJsonString(value: unknown): value is string {
  if (!isString(value)) return false;
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if value is a valid ISO date string.
 */
export function isIsoDateString(value: unknown): value is string {
  if (!isString(value)) return false;
  const isoRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/;
  return isoRegex.test(value) && !isNaN(Date.parse(value));
}

// =============================================================================
// Object Property Guards
// =============================================================================

/**
 * Check if object has a specific key.
 *
 * @example
 * ```ts
 * const obj: unknown = { name: 'John' };
 * if (hasKey(obj, 'name')) {
 *   // obj.name is unknown but accessible
 * }
 * ```
 */
export function hasKey<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
  return isObject(obj) && key in obj;
}

/**
 * Check if object has all required keys.
 *
 * @example
 * ```ts
 * const obj: unknown = { name: 'John', age: 30 };
 * if (hasKeys(obj, ['name', 'age'])) {
 *   // obj has both name and age
 * }
 * ```
 */
export function hasKeys<K extends string>(
  obj: unknown,
  keys: readonly K[]
): obj is Record<K, unknown> {
  return isObject(obj) && keys.every((key) => key in obj);
}

/**
 * Check if object has a key with a specific type.
 *
 * @example
 * ```ts
 * const obj: unknown = { count: 42 };
 * if (hasTypedKey(obj, 'count', isNumber)) {
 *   // obj.count is number
 * }
 * ```
 */
export function hasTypedKey<K extends string, T>(
  obj: unknown,
  key: K,
  guard: (value: unknown) => value is T
): obj is Record<K, T> {
  return hasKey(obj, key) && guard(obj[key]);
}

// =============================================================================
// Type Narrowing Utilities
// =============================================================================

/**
 * Assert that a value matches a type guard, throwing if it doesn't.
 *
 * @example
 * ```ts
 * function processUser(data: unknown) {
 *   assert(data, isObject, 'Expected object');
 *   // data is Record<string, unknown>
 * }
 * ```
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
 * Check if value is one of allowed values.
 *
 * @example
 * ```ts
 * const status: unknown = 'active';
 * if (isOneOf(status, ['active', 'inactive', 'pending'] as const)) {
 *   // status is 'active' | 'inactive' | 'pending'
 * }
 * ```
 */
export function isOneOf<T>(
  value: unknown,
  allowedValues: readonly T[]
): value is T {
  return allowedValues.includes(value as T);
}

/**
 * Narrow type or return undefined.
 *
 * @example
 * ```ts
 * const maybeString = narrow(value, isString);
 * // maybeString is string | undefined
 * ```
 */
export function narrow<T>(
  value: unknown,
  guard: (value: unknown) => value is T
): T | undefined {
  return guard(value) ? value : undefined;
}

/**
 * Narrow type or return default value.
 *
 * @example
 * ```ts
 * const name = narrowOr(value, isString, 'Anonymous');
 * // name is string (never undefined)
 * ```
 */
export function narrowOr<T>(
  value: unknown,
  guard: (value: unknown) => value is T,
  defaultValue: T
): T {
  return guard(value) ? value : defaultValue;
}

// =============================================================================
// Type Guard Factories
// =============================================================================

/**
 * Create a type guard for object shape.
 *
 * @example
 * ```ts
 * interface User {
 *   name: string;
 *   age: number;
 * }
 *
 * const isUser = createShapeGuard<User>({
 *   name: isString,
 *   age: isNumber,
 * });
 *
 * if (isUser(data)) {
 *   // data is User
 * }
 * ```
 */
export function createShapeGuard<T extends Record<string, unknown>>(shape: {
  [K in keyof T]: (value: unknown) => value is T[K];
}): (value: unknown) => value is T {
  return (value: unknown): value is T => {
    if (!isObject(value)) return false;

    for (const key of Object.keys(shape) as (keyof T)[]) {
      if (
        !(key in value) ||
        !shape[key]((value as Record<string, unknown>)[key as string])
      ) {
        return false;
      }
    }

    return true;
  };
}

/**
 * Create a type guard for optional object shape (allows undefined values).
 */
export function createPartialShapeGuard<T extends Record<string, unknown>>(
  shape: {
    [K in keyof T]: (value: unknown) => value is T[K];
  }
): (value: unknown) => value is Partial<T> {
  return (value: unknown): value is Partial<T> => {
    if (!isObject(value)) return false;

    for (const key of Object.keys(shape) as (keyof T)[]) {
      const propValue = (value as Record<string, unknown>)[key as string];
      if (propValue !== undefined && !shape[key](propValue)) {
        return false;
      }
    }

    return true;
  };
}

/**
 * Create a type guard for union types.
 *
 * @example
 * ```ts
 * const isStringOrNumber = createUnionGuard(isString, isNumber);
 * ```
 */
export function createUnionGuard<T extends unknown[]>(
  ...guards: { [K in keyof T]: (value: unknown) => value is T[K] }
): (value: unknown) => value is T[number] {
  return (value: unknown): value is T[number] => {
    return guards.some((guard) => guard(value));
  };
}

// =============================================================================
// JSON Utilities
// =============================================================================

/**
 * Safe JSON parse with type guard.
 *
 * @example
 * ```ts
 * const user = safeJsonParse(jsonString, isUser);
 * if (user) {
 *   // user is User
 * }
 * ```
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

/**
 * Safe JSON parse returning result tuple.
 */
export function safeJsonParseResult<T>(
  json: string,
  guard: (value: unknown) => value is T
): [T, null] | [null, Error] {
  try {
    const parsed: unknown = JSON.parse(json);
    if (guard(parsed)) {
      return [parsed, null];
    }
    return [null, new TypeError('JSON does not match expected type')];
  } catch (error) {
    return [null, error instanceof Error ? error : new Error(String(error))];
  }
}

// =============================================================================
// Type Utility Types
// =============================================================================

/**
 * Extract keys of type T from object U
 */
export type KeysOfType<U, T> = {
  [K in keyof U]: U[K] extends T ? K : never;
}[keyof U];

/**
 * Make specific keys required
 */
export type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make specific keys optional
 */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

/**
 * Deep partial type
 */
export type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

/**
 * Deep readonly type
 */
export type DeepReadonly<T> = T extends object
  ? { readonly [P in keyof T]: DeepReadonly<T[P]> }
  : T;

/**
 * Non-nullable values of an array
 */
export type NonNullableArray<T> = T extends (infer U)[]
  ? NonNullable<U>[]
  : never;

/**
 * Awaited type (unwrap Promise)
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/**
 * Function return type
 */
export type ReturnTypeOf<T> = T extends (...args: unknown[]) => infer R
  ? R
  : never;

/**
 * Function parameters type
 */
export type ParametersOf<T> = T extends (...args: infer P) => unknown
  ? P
  : never;

// =============================================================================
// Branded Types - Compile-time safety for primitive values
// =============================================================================

/**
 * Unique symbol for branded types.
 * @internal
 */
declare const __brand: unique symbol;

/**
 * Creates a branded (nominal) type from a base type.
 *
 * Branded types provide compile-time safety by making structurally
 * identical types incompatible. This prevents accidental misuse of
 * values that represent different concepts (e.g., milliseconds vs seconds).
 *
 * @template T - The base type to brand
 * @template B - The brand identifier string
 *
 * @example
 * ```ts
 * type UserId = Brand<string, 'UserId'>;
 * type OrderId = Brand<string, 'OrderId'>;
 *
 * declare function getUser(id: UserId): User;
 *
 * const userId = 'user-123' as UserId;
 * const orderId = 'order-456' as OrderId;
 *
 * getUser(userId);  // OK
 * getUser(orderId); // Compile error - OrderId is not assignable to UserId
 * ```
 */
export type Brand<T, B extends string> = T & { readonly [__brand]: B };

/**
 * Time duration in milliseconds.
 *
 * Use for all timing values like timeouts, intervals, and durations.
 *
 * @example
 * ```ts
 * const timeout: Milliseconds = ms(5000);
 * const delay: Milliseconds = ms(100);
 * ```
 */
export type Milliseconds = Brand<number, 'Milliseconds'>;

/**
 * Time duration in seconds.
 *
 * Use for longer durations or when interacting with APIs that expect seconds.
 *
 * @example
 * ```ts
 * const tokenLifetime: Seconds = sec(3600); // 1 hour
 * ```
 */
export type Seconds = Brand<number, 'Seconds'>;

/**
 * Distance/size in pixels.
 *
 * Use for all pixel-based measurements in layouts and UI.
 *
 * @example
 * ```ts
 * const width: Pixels = px(320);
 * const margin: Pixels = px(16);
 * ```
 */
export type Pixels = Brand<number, 'Pixels'>;

/**
 * Percentage value (typically 0-100).
 *
 * Use for ratios, progress indicators, and percentage-based calculations.
 *
 * @example
 * ```ts
 * const progress: Percentage = pct(75);
 * const opacity: Percentage = pct(50);
 * ```
 */
export type Percentage = Brand<number, 'Percentage'>;

/**
 * Creates a Milliseconds branded value.
 *
 * @param value - The numeric value in milliseconds
 * @returns A branded Milliseconds value
 *
 * @example
 * ```ts
 * const timeout = ms(5000); // 5 seconds
 * const debounce = ms(300);
 * ```
 */
export const ms = (value: number): Milliseconds => value as Milliseconds;

/**
 * Creates a Seconds branded value.
 *
 * @param value - The numeric value in seconds
 * @returns A branded Seconds value
 *
 * @example
 * ```ts
 * const duration = sec(60); // 1 minute
 * const ttl = sec(3600);    // 1 hour
 * ```
 */
export const sec = (value: number): Seconds => value as Seconds;

/**
 * Creates a Pixels branded value.
 *
 * @param value - The numeric value in pixels
 * @returns A branded Pixels value
 *
 * @example
 * ```ts
 * const width = px(320);
 * const padding = px(16);
 * ```
 */
export const px = (value: number): Pixels => value as Pixels;

/**
 * Creates a Percentage branded value.
 *
 * @param value - The numeric value as a percentage (typically 0-100)
 * @returns A branded Percentage value
 *
 * @example
 * ```ts
 * const complete = pct(100);
 * const halfway = pct(50);
 * ```
 */
export const pct = (value: number): Percentage => value as Percentage;

/**
 * Converts Seconds to Milliseconds.
 *
 * @param seconds - Duration in seconds
 * @returns Equivalent duration in milliseconds
 *
 * @example
 * ```ts
 * const timeout = secondsToMs(sec(5)); // 5000ms
 * ```
 */
export const secondsToMs = (seconds: Seconds): Milliseconds =>
  ms((seconds as number) * 1000);

/**
 * Converts Milliseconds to Seconds.
 *
 * @param milliseconds - Duration in milliseconds
 * @returns Equivalent duration in seconds
 *
 * @example
 * ```ts
 * const duration = msToSeconds(ms(5000)); // 5s
 * ```
 */
export const msToSeconds = (milliseconds: Milliseconds): Seconds =>
  sec((milliseconds as number) / 1000);

// =============================================================================
// Result Type - Functional error handling
// =============================================================================

/**
 * Result type for operations that can fail.
 *
 * Provides a type-safe alternative to throwing exceptions, following the
 * functional programming Either pattern. Forces explicit handling of both
 * success and failure cases at compile time.
 *
 * @template T - The success value type
 * @template E - The error type (defaults to Error)
 *
 * @example
 * ```ts
 * function divide(a: number, b: number): Result<number, string> {
 *   if (b === 0) {
 *     return err('Division by zero');
 *   }
 *   return ok(a / b);
 * }
 *
 * const result = divide(10, 2);
 * if (isOk(result)) {
 *   console.log('Result:', result.value); // 5
 * } else {
 *   console.error('Error:', result.error);
 * }
 * ```
 */
export type Result<T, E = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/**
 * Creates a successful Result containing the given value.
 *
 * @template T - The value type
 * @param value - The success value
 * @returns A successful Result containing the value
 *
 * @example
 * ```ts
 * const result = ok(42);
 * // result.ok === true
 * // result.value === 42
 * ```
 */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/**
 * Creates a failed Result containing the given error.
 *
 * @template E - The error type
 * @param error - The error value
 * @returns A failed Result containing the error
 *
 * @example
 * ```ts
 * const result = err(new Error('Something went wrong'));
 * // result.ok === false
 * // result.error.message === 'Something went wrong'
 * ```
 */
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/**
 * Type guard to check if a Result is successful.
 *
 * @template T - The success value type
 * @template E - The error type
 * @param result - The Result to check
 * @returns True if the result is successful, narrowing the type
 *
 * @example
 * ```ts
 * const result: Result<User, ApiError> = await fetchUser(id);
 * if (isOk(result)) {
 *   // result.value is User here
 *   console.log(result.value.name);
 * }
 * ```
 */
export function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok;
}

/**
 * Type guard to check if a Result is a failure.
 *
 * @template T - The success value type
 * @template E - The error type
 * @param result - The Result to check
 * @returns True if the result is a failure, narrowing the type
 *
 * @example
 * ```ts
 * const result: Result<User, ApiError> = await fetchUser(id);
 * if (isErr(result)) {
 *   // result.error is ApiError here
 *   console.error(result.error.message);
 * }
 * ```
 */
export function isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
  return !result.ok;
}

/**
 * Maps a successful Result value using the provided function.
 *
 * If the Result is a failure, returns the failure unchanged.
 *
 * @template T - The original success type
 * @template U - The mapped success type
 * @template E - The error type
 * @param result - The Result to map
 * @param fn - The mapping function
 * @returns A new Result with the mapped value or the original error
 *
 * @example
 * ```ts
 * const numResult: Result<number, string> = ok(5);
 * const strResult = mapResult(numResult, n => n.toString());
 * // strResult is Result<string, string> with value "5"
 * ```
 */
export function mapResult<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> {
  return isOk(result) ? ok(fn(result.value)) : result;
}

/**
 * Maps a failed Result error using the provided function.
 *
 * If the Result is successful, returns it unchanged.
 *
 * @template T - The success type
 * @template E - The original error type
 * @template F - The mapped error type
 * @param result - The Result to map
 * @param fn - The error mapping function
 * @returns A new Result with the mapped error or the original value
 *
 * @example
 * ```ts
 * const result: Result<number, string> = err('failed');
 * const mapped = mapError(result, msg => new Error(msg));
 * // mapped is Result<number, Error>
 * ```
 */
export function mapError<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> {
  return isErr(result) ? err(fn(result.error)) : result;
}

/**
 * Chains Result-returning operations.
 *
 * If the Result is successful, applies the function to the value.
 * If the Result is a failure, returns the failure unchanged.
 *
 * @template T - The original success type
 * @template U - The chained success type
 * @template E - The error type
 * @param result - The Result to chain
 * @param fn - The chaining function that returns a new Result
 * @returns The Result from the chaining function or the original error
 *
 * @example
 * ```ts
 * const parseNumber = (s: string): Result<number, string> => {
 *   const n = parseInt(s, 10);
 *   return isNaN(n) ? err('Invalid number') : ok(n);
 * };
 *
 * const double = (n: number): Result<number, string> => ok(n * 2);
 *
 * const result = flatMapResult(parseNumber('5'), double);
 * // result is ok(10)
 * ```
 */
export function flatMapResult<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  return isOk(result) ? fn(result.value) : result;
}

/**
 * Unwraps a Result, returning the value if successful or throwing if failed.
 *
 * @template T - The success type
 * @template E - The error type
 * @param result - The Result to unwrap
 * @returns The success value
 * @throws The error if the Result is a failure
 *
 * @example
 * ```ts
 * const result = ok(42);
 * const value = unwrapResult(result); // 42
 *
 * const failed = err(new Error('oops'));
 * unwrapResult(failed); // throws Error('oops')
 * ```
 */
export function unwrapResult<T, E>(result: Result<T, E>): T {
  if (isOk(result)) {
    return result.value;
  }
  throw result.error;
}

/**
 * Unwraps a Result, returning the value if successful or a default value if failed.
 *
 * @template T - The success type
 * @template E - The error type
 * @param result - The Result to unwrap
 * @param defaultValue - The default value to return on failure
 * @returns The success value or the default value
 *
 * @example
 * ```ts
 * const success = ok(42);
 * unwrapOr(success, 0); // 42
 *
 * const failed = err(new Error('oops'));
 * unwrapOr(failed, 0); // 0
 * ```
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return isOk(result) ? result.value : defaultValue;
}
