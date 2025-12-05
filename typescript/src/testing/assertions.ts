/**
 * Custom Assertion Utilities
 *
 * Framework-agnostic assertion utilities for testing. Provides type-safe
 * assertions with helpful error messages.
 *
 * @module @missionfabric-js/enzyme-typescript/testing/assertions
 * @example
 * ```typescript
 * import { assert, assertEquals, assertThrows } from '@missionfabric-js/enzyme-typescript/testing/assertions';
 *
 * assert(value !== null, 'Value should not be null');
 * assertEquals(result, expected);
 * assertThrows(() => dangerousFunction());
 * ```
 */

import type { AssertionResult } from './types';

/**
 * Assertion error class
 */
export class AssertionError extends Error {
  constructor(message: string, public expected?: any, public actual?: any) {
    super(message);
    this.name = 'AssertionError';
  }
}

/**
 * Basic assertion
 *
 * @param condition Condition to assert
 * @param message Error message
 * @throws {AssertionError} If condition is false
 *
 * @example
 * ```typescript
 * assert(user !== null, 'User should exist');
 * assert(count > 0, 'Count should be positive');
 * ```
 */
export function assert(condition: boolean, message: string = 'Assertion failed'): asserts condition {
  if (!condition) {
    throw new AssertionError(message);
  }
}

/**
 * Assert strict equality (===)
 *
 * @template T Value type
 * @param actual Actual value
 * @param expected Expected value
 * @param message Custom error message
 * @throws {AssertionError} If values are not equal
 *
 * @example
 * ```typescript
 * assertEquals(result, 42);
 * assertEquals(user.name, 'John Doe');
 * ```
 */
export function assertEquals<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    const msg =
      message ||
      `Expected ${formatValue(expected)} but got ${formatValue(actual)}`;
    throw new AssertionError(msg, expected, actual);
  }
}

/**
 * Assert deep equality
 *
 * @template T Value type
 * @param actual Actual value
 * @param expected Expected value
 * @param message Custom error message
 * @throws {AssertionError} If values are not deeply equal
 *
 * @example
 * ```typescript
 * assertDeepEquals({ a: 1, b: 2 }, { a: 1, b: 2 });
 * assertDeepEquals([1, 2, 3], [1, 2, 3]);
 * ```
 */
export function assertDeepEquals<T>(actual: T, expected: T, message?: string): void {
  if (!deepEquals(actual, expected)) {
    const msg =
      message ||
      `Expected ${formatValue(expected)} but got ${formatValue(actual)}`;
    throw new AssertionError(msg, expected, actual);
  }
}

/**
 * Assert not equal
 *
 * @template T Value type
 * @param actual Actual value
 * @param expected Value that should not match
 * @param message Custom error message
 * @throws {AssertionError} If values are equal
 *
 * @example
 * ```typescript
 * assertNotEquals(result, null);
 * assertNotEquals(status, 'error');
 * ```
 */
export function assertNotEquals<T>(actual: T, expected: T, message?: string): void {
  if (actual === expected) {
    const msg = message || `Expected values to be different but both are ${formatValue(actual)}`;
    throw new AssertionError(msg, expected, actual);
  }
}

/**
 * Assert value is truthy
 *
 * @param actual Value to check
 * @param message Custom error message
 * @throws {AssertionError} If value is falsy
 *
 * @example
 * ```typescript
 * assertTruthy(user);
 * assertTruthy(result.success);
 * ```
 */
export function assertTruthy(actual: any, message?: string): void {
  if (!actual) {
    const msg = message || `Expected truthy value but got ${formatValue(actual)}`;
    throw new AssertionError(msg, 'truthy', actual);
  }
}

/**
 * Assert value is falsy
 *
 * @param actual Value to check
 * @param message Custom error message
 * @throws {AssertionError} If value is truthy
 *
 * @example
 * ```typescript
 * assertFalsy(error);
 * assertFalsy(result.failed);
 * ```
 */
export function assertFalsy(actual: any, message?: string): void {
  if (actual) {
    const msg = message || `Expected falsy value but got ${formatValue(actual)}`;
    throw new AssertionError(msg, 'falsy', actual);
  }
}

/**
 * Assert value is null
 *
 * @param actual Value to check
 * @param message Custom error message
 * @throws {AssertionError} If value is not null
 *
 * @example
 * ```typescript
 * assertNull(result);
 * ```
 */
export function assertNull(actual: any, message?: string): void {
  if (actual !== null) {
    const msg = message || `Expected null but got ${formatValue(actual)}`;
    throw new AssertionError(msg, null, actual);
  }
}

/**
 * Assert value is not null
 *
 * @param actual Value to check
 * @param message Custom error message
 * @throws {AssertionError} If value is null
 *
 * @example
 * ```typescript
 * assertNotNull(user);
 * ```
 */
export function assertNotNull<T>(actual: T, message?: string): asserts actual is NonNullable<T> {
  if (actual === null) {
    const msg = message || 'Expected value to not be null';
    throw new AssertionError(msg, 'not null', null);
  }
}

/**
 * Assert value is undefined
 *
 * @param actual Value to check
 * @param message Custom error message
 * @throws {AssertionError} If value is not undefined
 *
 * @example
 * ```typescript
 * assertUndefined(result);
 * ```
 */
export function assertUndefined(actual: any, message?: string): void {
  if (actual !== undefined) {
    const msg = message || `Expected undefined but got ${formatValue(actual)}`;
    throw new AssertionError(msg, undefined, actual);
  }
}

/**
 * Assert value is not undefined
 *
 * @param actual Value to check
 * @param message Custom error message
 * @throws {AssertionError} If value is undefined
 *
 * @example
 * ```typescript
 * assertDefined(user.email);
 * ```
 */
export function assertDefined<T>(actual: T, message?: string): asserts actual is NonNullable<T> {
  if (actual === undefined) {
    const msg = message || 'Expected value to be defined';
    throw new AssertionError(msg, 'defined', undefined);
  }
}

/**
 * Assert value is an instance of a class
 *
 * @template T Class type
 * @param actual Value to check
 * @param constructor Expected class constructor
 * @param message Custom error message
 * @throws {AssertionError} If value is not an instance
 *
 * @example
 * ```typescript
 * assertInstanceOf(error, Error);
 * assertInstanceOf(date, Date);
 * ```
 */
export function assertInstanceOf<T>(
  actual: any,
  constructor: new (...args: any[]) => T,
  message?: string
): asserts actual is T {
  if (!(actual instanceof constructor)) {
    const msg =
      message ||
      `Expected instance of ${constructor.name} but got ${typeof actual}`;
    throw new AssertionError(msg, constructor.name, typeof actual);
  }
}

/**
 * Assert function throws an error
 *
 * @param fn Function that should throw
 * @param message Custom error message
 * @returns The thrown error
 * @throws {AssertionError} If function doesn't throw
 *
 * @example
 * ```typescript
 * assertThrows(() => {
 *   throw new Error('test');
 * });
 * ```
 */
export function assertThrows(fn: () => void, message?: string): Error {
  try {
    fn();
    const msg = message || 'Expected function to throw an error';
    throw new AssertionError(msg);
  } catch (error) {
    if (error instanceof AssertionError && !message) {
      throw error;
    }
    return error as Error;
  }
}

/**
 * Assert async function throws an error
 *
 * @param fn Async function that should throw
 * @param message Custom error message
 * @returns The thrown error
 * @throws {AssertionError} If function doesn't throw
 *
 * @example
 * ```typescript
 * await assertThrowsAsync(async () => {
 *   throw new Error('test');
 * });
 * ```
 */
export async function assertThrowsAsync(
  fn: () => Promise<void>,
  message?: string
): Promise<Error> {
  try {
    await fn();
    const msg = message || 'Expected async function to throw an error';
    throw new AssertionError(msg);
  } catch (error) {
    if (error instanceof AssertionError && !message) {
      throw error;
    }
    return error as Error;
  }
}

/**
 * Assert array contains a value
 *
 * @template T Element type
 * @param array Array to search
 * @param value Value to find
 * @param message Custom error message
 * @throws {AssertionError} If array doesn't contain value
 *
 * @example
 * ```typescript
 * assertContains([1, 2, 3], 2);
 * assertContains(users, targetUser);
 * ```
 */
export function assertContains<T>(array: T[], value: T, message?: string): void {
  if (!array.includes(value)) {
    const msg =
      message ||
      `Expected array to contain ${formatValue(value)}`;
    throw new AssertionError(msg, value, array);
  }
}

/**
 * Assert array does not contain a value
 *
 * @template T Element type
 * @param array Array to search
 * @param value Value that should not be present
 * @param message Custom error message
 * @throws {AssertionError} If array contains value
 *
 * @example
 * ```typescript
 * assertNotContains([1, 2, 3], 4);
 * ```
 */
export function assertNotContains<T>(array: T[], value: T, message?: string): void {
  if (array.includes(value)) {
    const msg =
      message ||
      `Expected array to not contain ${formatValue(value)}`;
    throw new AssertionError(msg, 'not present', value);
  }
}

/**
 * Assert array has specific length
 *
 * @param array Array to check
 * @param length Expected length
 * @param message Custom error message
 * @throws {AssertionError} If array has different length
 *
 * @example
 * ```typescript
 * assertLength(results, 5);
 * assertLength(errors, 0);
 * ```
 */
export function assertLength(array: any[], length: number, message?: string): void {
  if (array.length !== length) {
    const msg =
      message ||
      `Expected array length ${length} but got ${array.length}`;
    throw new AssertionError(msg, length, array.length);
  }
}

/**
 * Assert string matches a regex pattern
 *
 * @param actual String to test
 * @param pattern Regex pattern
 * @param message Custom error message
 * @throws {AssertionError} If string doesn't match pattern
 *
 * @example
 * ```typescript
 * assertMatches(email, /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/);
 * assertMatches(url, /^https?:\/\//);
 * ```
 */
export function assertMatches(actual: string, pattern: RegExp, message?: string): void {
  if (!pattern.test(actual)) {
    const msg =
      message ||
      `Expected "${actual}" to match pattern ${pattern}`;
    throw new AssertionError(msg, pattern, actual);
  }
}

/**
 * Assert string contains substring
 *
 * @param actual String to search
 * @param substring Substring to find
 * @param message Custom error message
 * @throws {AssertionError} If string doesn't contain substring
 *
 * @example
 * ```typescript
 * assertStringContains(message, 'error');
 * assertStringContains(html, '<div>');
 * ```
 */
export function assertStringContains(actual: string, substring: string, message?: string): void {
  if (!actual.includes(substring)) {
    const msg =
      message ||
      `Expected "${actual}" to contain "${substring}"`;
    throw new AssertionError(msg, substring, actual);
  }
}

/**
 * Assert object has a property
 *
 * @param obj Object to check
 * @param property Property name
 * @param message Custom error message
 * @throws {AssertionError} If object doesn't have property
 *
 * @example
 * ```typescript
 * assertHasProperty(user, 'email');
 * assertHasProperty(config, 'apiKey');
 * ```
 */
export function assertHasProperty(obj: any, property: string, message?: string): void {
  if (!(property in obj)) {
    const msg =
      message ||
      `Expected object to have property "${property}"`;
    throw new AssertionError(msg, property, Object.keys(obj));
  }
}

/**
 * Assert number is greater than a value
 *
 * @param actual Actual value
 * @param min Minimum value (exclusive)
 * @param message Custom error message
 * @throws {AssertionError} If actual is not greater
 *
 * @example
 * ```typescript
 * assertGreaterThan(score, 0);
 * assertGreaterThan(age, 18);
 * ```
 */
export function assertGreaterThan(actual: number, min: number, message?: string): void {
  if (actual <= min) {
    const msg =
      message ||
      `Expected ${actual} to be greater than ${min}`;
    throw new AssertionError(msg, `> ${min}`, actual);
  }
}

/**
 * Assert number is less than a value
 *
 * @param actual Actual value
 * @param max Maximum value (exclusive)
 * @param message Custom error message
 * @throws {AssertionError} If actual is not less
 *
 * @example
 * ```typescript
 * assertLessThan(age, 100);
 * assertLessThan(price, 1000);
 * ```
 */
export function assertLessThan(actual: number, max: number, message?: string): void {
  if (actual >= max) {
    const msg =
      message ||
      `Expected ${actual} to be less than ${max}`;
    throw new AssertionError(msg, `< ${max}`, actual);
  }
}

/**
 * Assert number is in range
 *
 * @param actual Actual value
 * @param min Minimum value (inclusive)
 * @param max Maximum value (inclusive)
 * @param message Custom error message
 * @throws {AssertionError} If actual is out of range
 *
 * @example
 * ```typescript
 * assertInRange(score, 0, 100);
 * assertInRange(age, 18, 65);
 * ```
 */
export function assertInRange(actual: number, min: number, max: number, message?: string): void {
  if (actual < min || actual > max) {
    const msg =
      message ||
      `Expected ${actual} to be in range [${min}, ${max}]`;
    throw new AssertionError(msg, `${min} <= x <= ${max}`, actual);
  }
}

/**
 * Deep equality check
 */
function deepEquals(a: any, b: any): boolean {
  if (a === b) return true;

  if (a === null || b === null) return false;
  if (a === undefined || b === undefined) return false;

  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEquals(item, b[index]));
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    return keysA.every((key) => deepEquals(a[key], b[key]));
  }

  return false;
}

/**
 * Format a value for display in error messages
 */
function formatValue(value: any): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `[${value.map(formatValue).join(', ')}]`;
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Create a custom assertion result
 *
 * @param pass Whether assertion passed
 * @param message Assertion message
 * @param expected Expected value
 * @param actual Actual value
 * @returns Assertion result
 *
 * @example
 * ```typescript
 * const result = createAssertionResult(
 *   actual === expected,
 *   'Values should be equal',
 *   expected,
 *   actual
 * );
 * ```
 */
export function createAssertionResult(
  pass: boolean,
  message: string,
  expected?: any,
  actual?: any
): AssertionResult {
  return {
    pass,
    message,
    expected,
    actual,
  };
}
