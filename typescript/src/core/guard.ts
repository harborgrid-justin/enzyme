/**
 * Type guard utilities and type narrowing helpers.
 *
 * Provides a comprehensive set of type guards for runtime type checking
 * and type narrowing in TypeScript.
 *
 * @example
 * ```typescript
 * const value: unknown = { name: 'John' };
 *
 * if (isObject(value) && hasProperty(value, 'name') && isString(value.name)) {
 *   console.log(value.name.toUpperCase()); // Type-safe!
 * }
 * ```
 *
 * @module core/guard
 */

/**
 * Type guard for checking if a value is defined (not null or undefined).
 *
 * @param value - The value to check
 * @returns True if the value is defined
 *
 * @example
 * ```typescript
 * const value: string | null | undefined = getValue();
 * if (isDefined(value)) {
 *   console.log(value.toUpperCase()); // value is string
 * }
 * ```
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type guard for checking if a value is null or undefined.
 *
 * @param value - The value to check
 * @returns True if the value is null or undefined
 *
 * @example
 * ```typescript
 * const value: string | null = getValue();
 * if (isNullish(value)) {
 *   console.log('No value');
 * }
 * ```
 */
export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Type guard for checking if a value is null.
 *
 * @param value - The value to check
 * @returns True if the value is null
 */
export function isNull(value: unknown): value is null {
  return value === null;
}

/**
 * Type guard for checking if a value is undefined.
 *
 * @param value - The value to check
 * @returns True if the value is undefined
 */
export function isUndefined(value: unknown): value is undefined {
  return value === undefined;
}

/**
 * Type guard for checking if a value is a string.
 *
 * @param value - The value to check
 * @returns True if the value is a string
 *
 * @example
 * ```typescript
 * const value: unknown = 'hello';
 * if (isString(value)) {
 *   console.log(value.toUpperCase()); // value is string
 * }
 * ```
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Type guard for checking if a value is a number.
 *
 * @param value - The value to check
 * @returns True if the value is a number (excluding NaN)
 *
 * @example
 * ```typescript
 * const value: unknown = 42;
 * if (isNumber(value)) {
 *   console.log(value.toFixed(2)); // value is number
 * }
 * ```
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

/**
 * Type guard for checking if a value is a boolean.
 *
 * @param value - The value to check
 * @returns True if the value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Type guard for checking if a value is a symbol.
 *
 * @param value - The value to check
 * @returns True if the value is a symbol
 */
export function isSymbol(value: unknown): value is symbol {
  return typeof value === 'symbol';
}

/**
 * Type guard for checking if a value is a bigint.
 *
 * @param value - The value to check
 * @returns True if the value is a bigint
 */
export function isBigInt(value: unknown): value is bigint {
  return typeof value === 'bigint';
}

/**
 * Type guard for checking if a value is a function.
 *
 * @param value - The value to check
 * @returns True if the value is a function
 *
 * @example
 * ```typescript
 * const value: unknown = () => 42;
 * if (isFunction(value)) {
 *   console.log(value()); // value is function
 * }
 * ```
 */
export function isFunction(value: unknown): value is Function {
  return typeof value === 'function';
}

/**
 * Type guard for checking if a value is an object (excluding null).
 *
 * @param value - The value to check
 * @returns True if the value is an object
 *
 * @example
 * ```typescript
 * const value: unknown = { name: 'John' };
 * if (isObject(value)) {
 *   console.log(Object.keys(value)); // value is object
 * }
 * ```
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard for checking if a value is a plain object (not a class instance).
 *
 * @param value - The value to check
 * @returns True if the value is a plain object
 *
 * @example
 * ```typescript
 * const value: unknown = { name: 'John' };
 * if (isPlainObject(value)) {
 *   console.log('Plain object');
 * }
 * ```
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!isObject(value)) {
    return false;
  }

  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

/**
 * Type guard for checking if a value is an array.
 *
 * @param value - The value to check
 * @returns True if the value is an array
 *
 * @example
 * ```typescript
 * const value: unknown = [1, 2, 3];
 * if (isArray(value)) {
 *   console.log(value.length); // value is array
 * }
 * ```
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Type guard for checking if a value is an array of a specific type.
 *
 * @param value - The value to check
 * @param itemGuard - Type guard for array items
 * @returns True if the value is an array of the specified type
 *
 * @example
 * ```typescript
 * const value: unknown = [1, 2, 3];
 * if (isArrayOf(value, isNumber)) {
 *   console.log(value[0].toFixed(2)); // value is number[]
 * }
 * ```
 */
export function isArrayOf<T>(
  value: unknown,
  itemGuard: (item: unknown) => item is T
): value is T[] {
  return isArray(value) && value.every(itemGuard);
}

/**
 * Type guard for checking if a value is a Date.
 *
 * @param value - The value to check
 * @returns True if the value is a Date
 *
 * @example
 * ```typescript
 * const value: unknown = new Date();
 * if (isDate(value)) {
 *   console.log(value.toISOString()); // value is Date
 * }
 * ```
 */
export function isDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

/**
 * Type guard for checking if a value is a RegExp.
 *
 * @param value - The value to check
 * @returns True if the value is a RegExp
 */
export function isRegExp(value: unknown): value is RegExp {
  return value instanceof RegExp;
}

/**
 * Type guard for checking if a value is a Promise.
 *
 * @param value - The value to check
 * @returns True if the value is a Promise
 */
export function isPromise<T = unknown>(value: unknown): value is Promise<T> {
  return (
    value instanceof Promise ||
    (isObject(value) && isFunction((value as Record<string, unknown>).then))
  );
}

/**
 * Type guard for checking if a value is an Error.
 *
 * @param value - The value to check
 * @returns True if the value is an Error
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Type guard for checking if a value is a Map.
 *
 * @param value - The value to check
 * @returns True if the value is a Map
 */
export function isMap<K = unknown, V = unknown>(value: unknown): value is Map<K, V> {
  return value instanceof Map;
}

/**
 * Type guard for checking if a value is a Set.
 *
 * @param value - The value to check
 * @returns True if the value is a Set
 */
export function isSet<T = unknown>(value: unknown): value is Set<T> {
  return value instanceof Set;
}

/**
 * Type guard for checking if a value is a WeakMap.
 *
 * @param value - The value to check
 * @returns True if the value is a WeakMap
 */
export function isWeakMap<K extends object = object, V = unknown>(
  value: unknown
): value is WeakMap<K, V> {
  return value instanceof WeakMap;
}

/**
 * Type guard for checking if a value is a WeakSet.
 *
 * @param value - The value to check
 * @returns True if the value is a WeakSet
 */
export function isWeakSet<T extends object = object>(value: unknown): value is WeakSet<T> {
  return value instanceof WeakSet;
}

/**
 * Type guard for checking if an object has a specific property.
 *
 * @param obj - The object to check
 * @param key - The property key
 * @returns True if the object has the property
 *
 * @example
 * ```typescript
 * const obj: unknown = { name: 'John', age: 30 };
 * if (isObject(obj) && hasProperty(obj, 'name')) {
 *   console.log(obj.name); // TypeScript knows obj has 'name'
 * }
 * ```
 */
export function hasProperty<K extends PropertyKey>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
  return isObject(obj) && key in obj;
}

/**
 * Type guard for checking if an object has multiple properties.
 *
 * @param obj - The object to check
 * @param keys - The property keys
 * @returns True if the object has all properties
 *
 * @example
 * ```typescript
 * const obj: unknown = { name: 'John', age: 30 };
 * if (hasProperties(obj, ['name', 'age'])) {
 *   console.log(obj.name, obj.age); // TypeScript knows both exist
 * }
 * ```
 */
export function hasProperties<K extends PropertyKey>(
  obj: unknown,
  keys: readonly K[]
): obj is Record<K, unknown> {
  return isObject(obj) && keys.every(key => key in obj);
}

/**
 * Type guard for checking if a value is an instance of a class.
 *
 * @param value - The value to check
 * @param constructor - The constructor function
 * @returns True if the value is an instance of the class
 *
 * @example
 * ```typescript
 * class User {
 *   constructor(public name: string) {}
 * }
 *
 * const value: unknown = new User('John');
 * if (isInstanceOf(value, User)) {
 *   console.log(value.name); // value is User
 * }
 * ```
 */
export function isInstanceOf<T>(
  value: unknown,
  constructor: new (...args: unknown[]) => T
): value is T {
  return value instanceof constructor;
}

/**
 * Type guard for checking if a value is one of a set of literal values.
 *
 * @param value - The value to check
 * @param values - The set of valid values
 * @returns True if the value is one of the valid values
 *
 * @example
 * ```typescript
 * const value: unknown = 'red';
 * if (isOneOf(value, ['red', 'green', 'blue'])) {
 *   console.log(value); // value is 'red' | 'green' | 'blue'
 * }
 * ```
 */
export function isOneOf<T extends readonly unknown[]>(
  value: unknown,
  values: T
): value is T[number] {
  return values.includes(value);
}

/**
 * Type guard for checking if a value is a non-empty string.
 *
 * @param value - The value to check
 * @returns True if the value is a non-empty string
 *
 * @example
 * ```typescript
 * const value: unknown = 'hello';
 * if (isNonEmptyString(value)) {
 *   console.log(value.charAt(0)); // value is string with length > 0
 * }
 * ```
 */
export function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.length > 0;
}

/**
 * Type guard for checking if a value is a non-empty array.
 *
 * @param value - The value to check
 * @returns True if the value is a non-empty array
 *
 * @example
 * ```typescript
 * const value: unknown = [1, 2, 3];
 * if (isNonEmptyArray(value)) {
 *   console.log(value[0]); // TypeScript knows array has at least one element
 * }
 * ```
 */
export function isNonEmptyArray<T>(value: unknown): value is [T, ...T[]] {
  return isArray(value) && value.length > 0;
}

/**
 * Type guard for checking if a value is a record with string keys.
 *
 * @param value - The value to check
 * @returns True if the value is a record
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return isObject(value);
}

/**
 * Type guard for checking if a value is a record with values of a specific type.
 *
 * @param value - The value to check
 * @param valueGuard - Type guard for record values
 * @returns True if the value is a record with values of the specified type
 *
 * @example
 * ```typescript
 * const value: unknown = { a: 1, b: 2, c: 3 };
 * if (isRecordOf(value, isNumber)) {
 *   console.log(value.a.toFixed(2)); // value is Record<string, number>
 * }
 * ```
 */
export function isRecordOf<T>(
  value: unknown,
  valueGuard: (item: unknown) => item is T
): value is Record<string, T> {
  return isRecord(value) && Object.values(value).every(valueGuard);
}

/**
 * Type guard for checking if a value satisfies a predicate.
 *
 * @param value - The value to check
 * @param predicate - The predicate function
 * @returns True if the predicate returns true
 *
 * @example
 * ```typescript
 * const value: number = 5;
 * if (satisfies(value, x => x > 0)) {
 *   console.log('Positive number');
 * }
 * ```
 */
export function satisfies<T>(
  value: T,
  predicate: (value: T) => boolean
): value is T {
  return predicate(value);
}

/**
 * Asserts that a value is defined (throws if not).
 *
 * @param value - The value to assert
 * @param message - Optional error message
 * @throws Error if value is null or undefined
 *
 * @example
 * ```typescript
 * const value: string | null = getValue();
 * assertDefined(value, 'Value must be defined');
 * console.log(value.toUpperCase()); // value is string
 * ```
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message?: string
): asserts value is T {
  if (!isDefined(value)) {
    throw new Error(message ?? 'Value is null or undefined');
  }
}

/**
 * Asserts that a condition is true (throws if not).
 *
 * @param condition - The condition to assert
 * @param message - Optional error message
 * @throws Error if condition is false
 *
 * @example
 * ```typescript
 * const value: number = getValue();
 * assert(value > 0, 'Value must be positive');
 * console.log(value); // TypeScript knows value > 0
 * ```
 */
export function assert(condition: boolean, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message ?? 'Assertion failed');
  }
}

/**
 * Asserts that a value has a specific type.
 *
 * @param value - The value to assert
 * @param guard - Type guard function
 * @param message - Optional error message
 * @throws Error if guard returns false
 *
 * @example
 * ```typescript
 * const value: unknown = getValue();
 * assertType(value, isString, 'Value must be a string');
 * console.log(value.toUpperCase()); // value is string
 * ```
 */
export function assertType<T>(
  value: unknown,
  guard: (value: unknown) => value is T,
  message?: string
): asserts value is T {
  if (!guard(value)) {
    throw new Error(message ?? 'Type assertion failed');
  }
}

/**
 * Creates a type guard that checks if a value is never (unreachable code).
 *
 * @param value - The value that should never be reached
 * @param message - Optional error message
 * @throws Error always
 *
 * @example
 * ```typescript
 * type Status = 'pending' | 'complete';
 *
 * function handleStatus(status: Status) {
 *   switch (status) {
 *     case 'pending':
 *       return 'Pending...';
 *     case 'complete':
 *       return 'Complete!';
 *     default:
 *       return assertNever(status); // Ensures all cases are handled
 *   }
 * }
 * ```
 */
export function assertNever(value: never, message?: string): never {
  throw new Error(
    message ?? `Unexpected value: ${JSON.stringify(value)}`
  );
}
