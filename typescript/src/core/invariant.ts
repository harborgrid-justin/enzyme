/**
 * Runtime invariant checks and assertions.
 *
 * Provides utilities for runtime validation and error handling,
 * particularly useful for enforcing preconditions and postconditions.
 *
 * @example
 * ```typescript
 * function divide(a: number, b: number): number {
 *   invariant(b !== 0, 'Division by zero');
 *   return a / b;
 * }
 *
 * function processUser(user: User | null): void {
 *   invariant(user, 'User must be defined');
 *   console.log(user.name); // user is definitely User
 * }
 * ```
 *
 * @module core/invariant
 */

/**
 * Custom error class for invariant violations.
 */
export class InvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvariantError';
    Object.setPrototypeOf(this, InvariantError.prototype);
  }
}

/**
 * Asserts that a condition is true, throws InvariantError if false.
 *
 * @param condition - The condition to check
 * @param message - Error message or message factory
 * @throws InvariantError if condition is false
 *
 * @example
 * ```typescript
 * function withdraw(amount: number, balance: number): number {
 *   invariant(amount > 0, 'Amount must be positive');
 *   invariant(amount <= balance, () => `Insufficient funds: ${balance}`);
 *   return balance - amount;
 * }
 * ```
 */
export function invariant(
  condition: boolean,
  message: string | (() => string)
): asserts condition {
  if (!condition) {
    const errorMessage = typeof message === 'function' ? message() : message;
    throw new InvariantError(errorMessage);
  }
}

/**
 * Asserts that a value is truthy.
 *
 * @param value - The value to check
 * @param message - Error message
 * @throws InvariantError if value is falsy
 *
 * @example
 * ```typescript
 * const user = getUser();
 * invariantTruthy(user, 'User not found');
 * console.log(user.name); // user is truthy
 * ```
 */
export function invariantTruthy<T>(
  value: T,
  message: string | (() => string)
): asserts value is NonNullable<T> {
  invariant(Boolean(value), message);
}

/**
 * Asserts that a value is defined (not null or undefined).
 *
 * @param value - The value to check
 * @param message - Error message
 * @throws InvariantError if value is null or undefined
 *
 * @example
 * ```typescript
 * function processConfig(config: Config | null): void {
 *   invariantDefined(config, 'Config must be provided');
 *   console.log(config.apiKey); // config is Config
 * }
 * ```
 */
export function invariantDefined<T>(
  value: T,
  message: string | (() => string)
): asserts value is NonNullable<T> {
  invariant(value !== null && value !== undefined, message);
}

/**
 * Asserts that a value is not null.
 *
 * @param value - The value to check
 * @param message - Error message
 * @throws InvariantError if value is null
 */
export function invariantNotNull<T>(
  value: T,
  message: string | (() => string)
): asserts value is Exclude<T, null> {
  invariant(value !== null, message);
}

/**
 * Asserts that a value is not undefined.
 *
 * @param value - The value to check
 * @param message - Error message
 * @throws InvariantError if value is undefined
 */
export function invariantNotUndefined<T>(
  value: T,
  message: string | (() => string)
): asserts value is Exclude<T, undefined> {
  invariant(value !== undefined, message);
}

/**
 * Asserts that a value is a string.
 *
 * @param value - The value to check
 * @param message - Error message
 * @throws InvariantError if value is not a string
 */
export function invariantString(
  value: unknown,
  message: string | (() => string) = 'Value must be a string'
): asserts value is string {
  invariant(typeof value === 'string', message);
}

/**
 * Asserts that a value is a number.
 *
 * @param value - The value to check
 * @param message - Error message
 * @throws InvariantError if value is not a number
 */
export function invariantNumber(
  value: unknown,
  message: string | (() => string) = 'Value must be a number'
): asserts value is number {
  invariant(typeof value === 'number' && !Number.isNaN(value), message);
}

/**
 * Asserts that a value is a boolean.
 *
 * @param value - The value to check
 * @param message - Error message
 * @throws InvariantError if value is not a boolean
 */
export function invariantBoolean(
  value: unknown,
  message: string | (() => string) = 'Value must be a boolean'
): asserts value is boolean {
  invariant(typeof value === 'boolean', message);
}

/**
 * Asserts that a value is an array.
 *
 * @param value - The value to check
 * @param message - Error message
 * @throws InvariantError if value is not an array
 */
export function invariantArray(
  value: unknown,
  message: string | (() => string) = 'Value must be an array'
): asserts value is unknown[] {
  invariant(Array.isArray(value), message);
}

/**
 * Asserts that a value is an object.
 *
 * @param value - The value to check
 * @param message - Error message
 * @throws InvariantError if value is not an object
 */
export function invariantObject(
  value: unknown,
  message: string | (() => string) = 'Value must be an object'
): asserts value is Record<string, unknown> {
  invariant(
    typeof value === 'object' && value !== null && !Array.isArray(value),
    message
  );
}

/**
 * Asserts that a value is a function.
 *
 * @param value - The value to check
 * @param message - Error message
 * @throws InvariantError if value is not a function
 */
export function invariantFunction(
  value: unknown,
  message: string | (() => string) = 'Value must be a function'
): asserts value is Function {
  invariant(typeof value === 'function', message);
}

/**
 * Asserts that a value is an instance of a class.
 *
 * @param value - The value to check
 * @param constructor - The constructor function
 * @param message - Error message
 * @throws InvariantError if value is not an instance
 *
 * @example
 * ```typescript
 * class User {
 *   constructor(public name: string) {}
 * }
 *
 * function processUser(value: unknown): void {
 *   invariantInstanceOf(value, User, 'Value must be a User instance');
 *   console.log(value.name); // value is User
 * }
 * ```
 */
export function invariantInstanceOf<T>(
  value: unknown,
  constructor: new (...args: unknown[]) => T,
  message?: string | (() => string)
): asserts value is T {
  const errorMessage =
    message ?? `Value must be an instance of ${constructor.name}`;
  invariant(value instanceof constructor, errorMessage);
}

/**
 * Asserts that a number is within a range.
 *
 * @param value - The number to check
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @param message - Error message
 * @throws InvariantError if value is out of range
 *
 * @example
 * ```typescript
 * function setVolume(level: number): void {
 *   invariantInRange(level, 0, 100, 'Volume must be between 0 and 100');
 *   // Set volume...
 * }
 * ```
 */
export function invariantInRange(
  value: number,
  min: number,
  max: number,
  message?: string | (() => string)
): void {
  const errorMessage =
    message ?? `Value must be between ${min} and ${max}, got ${value}`;
  invariant(value >= min && value <= max, errorMessage);
}

/**
 * Asserts that an array is not empty.
 *
 * @param value - The array to check
 * @param message - Error message
 * @throws InvariantError if array is empty
 *
 * @example
 * ```typescript
 * function processItems(items: string[]): void {
 *   invariantNonEmpty(items, 'Items array cannot be empty');
 *   console.log(items[0]); // Safe to access
 * }
 * ```
 */
export function invariantNonEmpty<T>(
  value: T[],
  message: string | (() => string) = 'Array cannot be empty'
): asserts value is [T, ...T[]] {
  invariant(value.length > 0, message);
}

/**
 * Asserts that a string is not empty.
 *
 * @param value - The string to check
 * @param message - Error message
 * @throws InvariantError if string is empty
 */
export function invariantNonEmptyString(
  value: string,
  message: string | (() => string) = 'String cannot be empty'
): void {
  invariant(value.length > 0, message);
}

/**
 * Asserts that an object has a specific property.
 *
 * @param obj - The object to check
 * @param key - The property key
 * @param message - Error message
 * @throws InvariantError if property does not exist
 *
 * @example
 * ```typescript
 * function getUserName(obj: unknown): string {
 *   invariantObject(obj, 'Value must be an object');
 *   invariantHasProperty(obj, 'name', 'Object must have a name property');
 *   invariantString(obj.name, 'Name must be a string');
 *   return obj.name;
 * }
 * ```
 */
export function invariantHasProperty<K extends PropertyKey>(
  obj: Record<string, unknown>,
  key: K,
  message?: string | (() => string)
): asserts obj is Record<K, unknown> {
  const errorMessage = message ?? `Object must have property '${String(key)}'`;
  invariant(key in obj, errorMessage);
}

/**
 * Asserts that an object has multiple properties.
 *
 * @param obj - The object to check
 * @param keys - The property keys
 * @param message - Error message
 * @throws InvariantError if any property does not exist
 */
export function invariantHasProperties<K extends PropertyKey>(
  obj: Record<string, unknown>,
  keys: readonly K[],
  message?: string | (() => string)
): asserts obj is Record<K, unknown> {
  const errorMessage =
    message ?? `Object must have properties: ${keys.map(String).join(', ')}`;
  invariant(keys.every(key => key in obj), errorMessage);
}

/**
 * Asserts that a value is one of a set of literal values.
 *
 * @param value - The value to check
 * @param values - The set of valid values
 * @param message - Error message
 * @throws InvariantError if value is not in the set
 *
 * @example
 * ```typescript
 * type Status = 'pending' | 'active' | 'complete';
 *
 * function setStatus(status: string): void {
 *   invariantOneOf(status, ['pending', 'active', 'complete']);
 *   // status is now Status
 * }
 * ```
 */
export function invariantOneOf<T extends readonly unknown[]>(
  value: unknown,
  values: T,
  message?: string | (() => string)
): asserts value is T[number] {
  const errorMessage =
    message ??
    `Value must be one of: ${values.map(v => JSON.stringify(v)).join(', ')}`;
  invariant(values.includes(value), errorMessage);
}

/**
 * Asserts that code is unreachable (exhaustiveness check).
 *
 * @param value - The value that should never be reached
 * @param message - Error message
 * @throws InvariantError always
 *
 * @example
 * ```typescript
 * type Status = 'pending' | 'complete';
 *
 * function handleStatus(status: Status): string {
 *   switch (status) {
 *     case 'pending':
 *       return 'Pending...';
 *     case 'complete':
 *       return 'Complete!';
 *     default:
 *       return invariantUnreachable(status);
 *   }
 * }
 * ```
 */
export function invariantUnreachable(
  value: never,
  message?: string | (() => string)
): never {
  const errorMessage =
    typeof message === 'function'
      ? message()
      : message ?? `Unreachable code reached with value: ${JSON.stringify(value)}`;
  throw new InvariantError(errorMessage);
}

/**
 * Asserts that a condition passes a custom validator.
 *
 * @param value - The value to validate
 * @param validator - Validation function
 * @param message - Error message
 * @throws InvariantError if validation fails
 *
 * @example
 * ```typescript
 * function isEmail(value: string): boolean {
 *   return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
 * }
 *
 * function sendEmail(email: string): void {
 *   invariantValidate(email, isEmail, 'Invalid email address');
 *   // Send email...
 * }
 * ```
 */
export function invariantValidate<T>(
  value: T,
  validator: (value: T) => boolean,
  message: string | (() => string)
): void {
  invariant(validator(value), message);
}

/**
 * Development-only invariant (stripped in production builds).
 * Useful for checks that should only run during development.
 *
 * @param condition - The condition to check
 * @param message - Error message
 * @throws InvariantError if condition is false (only in development)
 *
 * @example
 * ```typescript
 * function processData(data: unknown[]): void {
 *   devInvariant(data.length < 1000, 'Large dataset detected in dev mode');
 *   // Process data...
 * }
 * ```
 */
export function devInvariant(
  condition: boolean,
  message: string | (() => string)
): asserts condition {
  if (process.env.NODE_ENV !== 'production') {
    invariant(condition, message);
  }
}

/**
 * Warning function that logs to console instead of throwing.
 * Useful for non-critical invariants.
 *
 * @param condition - The condition to check
 * @param message - Warning message
 *
 * @example
 * ```typescript
 * function deprecatedApi(param: string): void {
 *   warn(false, 'This API is deprecated, use newApi instead');
 *   // Continue execution...
 * }
 * ```
 */
export function warn(condition: boolean, message: string | (() => string)): void {
  if (!condition) {
    const warningMessage = typeof message === 'function' ? message() : message;
    console.warn(`Warning: ${warningMessage}`);
  }
}

/**
 * Development-only warning (stripped in production builds).
 *
 * @param condition - The condition to check
 * @param message - Warning message
 */
export function devWarn(condition: boolean, message: string | (() => string)): void {
  if (process.env.NODE_ENV !== 'production') {
    warn(condition, message);
  }
}
