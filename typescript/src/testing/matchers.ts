/**
 * Custom Matcher Utilities
 *
 * Custom matchers for test frameworks like Jest and Vitest. Provides
 * type-safe, reusable matchers with helpful error messages.
 *
 * @module @missionfabric-js/enzyme-typescript/testing/matchers
 * @example
 * ```typescript
 * import { toBeWithinRange, toHaveBeenCalledWithMatch } from '@missionfabric-js/enzyme-typescript/testing/matchers';
 *
 * // Extend your test framework
 * expect.extend({
 *   toBeWithinRange,
 *   toHaveBeenCalledWithMatch
 * });
 *
 * // Use in tests
 * expect(score).toBeWithinRange(0, 100);
 * ```
 */

import type { MatcherFunction, AssertionResult } from './types';

/**
 * Check if value is within a numeric range
 *
 * @param actual Actual value
 * @param min Minimum value (inclusive)
 * @param max Maximum value (inclusive)
 * @returns Assertion result
 *
 * @example
 * ```typescript
 * expect.extend({ toBeWithinRange });
 * expect(score).toBeWithinRange(0, 100);
 * ```
 */
export function toBeWithinRange(actual: number, min: number, max: number): AssertionResult {
  const pass = actual >= min && actual <= max;

  return {
    pass,
    message: pass
      ? `Expected ${actual} not to be within range [${min}, ${max}]`
      : `Expected ${actual} to be within range [${min}, ${max}]`,
    expected: `${min} <= x <= ${max}`,
    actual,
  };
}

/**
 * Check if date is before another date
 *
 * @param actual Actual date
 * @param expected Expected date to be before
 * @returns Assertion result
 *
 * @example
 * ```typescript
 * expect.extend({ toBeBefore });
 * expect(startDate).toBeBefore(endDate);
 * ```
 */
export function toBeBefore(actual: Date, expected: Date): AssertionResult {
  const pass = actual < expected;

  return {
    pass,
    message: pass
      ? `Expected ${actual.toISOString()} not to be before ${expected.toISOString()}`
      : `Expected ${actual.toISOString()} to be before ${expected.toISOString()}`,
    expected: expected.toISOString(),
    actual: actual.toISOString(),
  };
}

/**
 * Check if date is after another date
 *
 * @param actual Actual date
 * @param expected Expected date to be after
 * @returns Assertion result
 *
 * @example
 * ```typescript
 * expect.extend({ toBeAfter });
 * expect(endDate).toBeAfter(startDate);
 * ```
 */
export function toBeAfter(actual: Date, expected: Date): AssertionResult {
  const pass = actual > expected;

  return {
    pass,
    message: pass
      ? `Expected ${actual.toISOString()} not to be after ${expected.toISOString()}`
      : `Expected ${actual.toISOString()} to be after ${expected.toISOString()}`,
    expected: expected.toISOString(),
    actual: actual.toISOString(),
  };
}

/**
 * Check if array contains exactly the expected items (order doesn't matter)
 *
 * @param actual Actual array
 * @param expected Expected items
 * @returns Assertion result
 *
 * @example
 * ```typescript
 * expect.extend({ toContainExactly });
 * expect([1, 2, 3]).toContainExactly([3, 2, 1]);
 * ```
 */
export function toContainExactly<T>(actual: T[], expected: T[]): AssertionResult {
  if (actual.length !== expected.length) {
    return {
      pass: false,
      message: `Expected array to have exactly ${expected.length} items, but got ${actual.length}`,
      expected,
      actual,
    };
  }

  const actualSorted = [...actual].sort();
  const expectedSorted = [...expected].sort();

  const pass = actualSorted.every((item, index) => item === expectedSorted[index]);

  return {
    pass,
    message: pass
      ? `Expected array not to contain exactly ${JSON.stringify(expected)}`
      : `Expected array to contain exactly ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`,
    expected,
    actual,
  };
}

/**
 * Check if array contains all expected items (may contain more)
 *
 * @param actual Actual array
 * @param expected Expected items
 * @returns Assertion result
 *
 * @example
 * ```typescript
 * expect.extend({ toContainAll });
 * expect([1, 2, 3, 4]).toContainAll([2, 4]);
 * ```
 */
export function toContainAll<T>(actual: T[], expected: T[]): AssertionResult {
  const missing = expected.filter((item) => !actual.includes(item));
  const pass = missing.length === 0;

  return {
    pass,
    message: pass
      ? `Expected array not to contain all of ${JSON.stringify(expected)}`
      : `Expected array to contain all of ${JSON.stringify(expected)}, but missing ${JSON.stringify(missing)}`,
    expected,
    actual,
  };
}

/**
 * Check if object matches a subset of properties
 *
 * @param actual Actual object
 * @param expected Expected subset
 * @returns Assertion result
 *
 * @example
 * ```typescript
 * expect.extend({ toMatchObject });
 * expect(user).toMatchObject({ name: 'John', role: 'admin' });
 * ```
 */
export function toMatchObject(actual: any, expected: any): AssertionResult {
  const pass = matchesObject(actual, expected);

  return {
    pass,
    message: pass
      ? `Expected object not to match ${JSON.stringify(expected)}`
      : `Expected object to match ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`,
    expected,
    actual,
  };
}

/**
 * Check if string matches a pattern
 *
 * @param actual Actual string
 * @param pattern Regex pattern or string
 * @returns Assertion result
 *
 * @example
 * ```typescript
 * expect.extend({ toMatchPattern });
 * expect(email).toMatchPattern(/^[\w-]+@[\w-]+\.[\w-]+$/);
 * ```
 */
export function toMatchPattern(actual: string, pattern: RegExp | string): AssertionResult {
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  const pass = regex.test(actual);

  return {
    pass,
    message: pass
      ? `Expected "${actual}" not to match pattern ${regex}`
      : `Expected "${actual}" to match pattern ${regex}`,
    expected: pattern,
    actual,
  };
}

/**
 * Check if array is sorted
 *
 * @param actual Actual array
 * @param compareFn Optional compare function
 * @returns Assertion result
 *
 * @example
 * ```typescript
 * expect.extend({ toBeSorted });
 * expect([1, 2, 3, 4]).toBeSorted();
 * expect(['a', 'b', 'c']).toBeSorted();
 * ```
 */
export function toBeSorted<T>(
  actual: T[],
  compareFn?: (a: T, b: T) => number
): AssertionResult {
  const sorted = [...actual].sort(compareFn);
  const pass = actual.every((item, index) => item === sorted[index]);

  return {
    pass,
    message: pass
      ? `Expected array not to be sorted`
      : `Expected array to be sorted, but got ${JSON.stringify(actual)}`,
    expected: sorted,
    actual,
  };
}

/**
 * Check if array is empty
 *
 * @param actual Actual array
 * @returns Assertion result
 *
 * @example
 * ```typescript
 * expect.extend({ toBeEmpty });
 * expect([]).toBeEmpty();
 * ```
 */
export function toBeEmpty(actual: any[] | string | object): AssertionResult {
  let isEmpty: boolean;

  if (Array.isArray(actual)) {
    isEmpty = actual.length === 0;
  } else if (typeof actual === 'string') {
    isEmpty = actual.length === 0;
  } else if (typeof actual === 'object') {
    isEmpty = Object.keys(actual).length === 0;
  } else {
    isEmpty = false;
  }

  return {
    pass: isEmpty,
    message: isEmpty
      ? `Expected value not to be empty`
      : `Expected value to be empty, but got ${JSON.stringify(actual)}`,
    expected: 'empty',
    actual,
  };
}

/**
 * Check if value is a valid UUID
 *
 * @param actual Actual value
 * @returns Assertion result
 *
 * @example
 * ```typescript
 * expect.extend({ toBeValidUUID });
 * expect(id).toBeValidUUID();
 * ```
 */
export function toBeValidUUID(actual: string): AssertionResult {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const pass = uuidRegex.test(actual);

  return {
    pass,
    message: pass
      ? `Expected "${actual}" not to be a valid UUID`
      : `Expected "${actual}" to be a valid UUID`,
    expected: 'valid UUID',
    actual,
  };
}

/**
 * Check if value is a valid email
 *
 * @param actual Actual value
 * @returns Assertion result
 *
 * @example
 * ```typescript
 * expect.extend({ toBeValidEmail });
 * expect(email).toBeValidEmail();
 * ```
 */
export function toBeValidEmail(actual: string): AssertionResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const pass = emailRegex.test(actual);

  return {
    pass,
    message: pass
      ? `Expected "${actual}" not to be a valid email`
      : `Expected "${actual}" to be a valid email`,
    expected: 'valid email',
    actual,
  };
}

/**
 * Check if value is a valid URL
 *
 * @param actual Actual value
 * @returns Assertion result
 *
 * @example
 * ```typescript
 * expect.extend({ toBeValidURL });
 * expect(url).toBeValidURL();
 * ```
 */
export function toBeValidURL(actual: string): AssertionResult {
  try {
    new URL(actual);
    return {
      pass: true,
      message: `Expected "${actual}" not to be a valid URL`,
      expected: 'invalid URL',
      actual,
    };
  } catch {
    return {
      pass: false,
      message: `Expected "${actual}" to be a valid URL`,
      expected: 'valid URL',
      actual,
    };
  }
}

/**
 * Check if object has all specified keys
 *
 * @param actual Actual object
 * @param keys Expected keys
 * @returns Assertion result
 *
 * @example
 * ```typescript
 * expect.extend({ toHaveKeys });
 * expect(user).toHaveKeys(['id', 'name', 'email']);
 * ```
 */
export function toHaveKeys(actual: object, keys: string[]): AssertionResult {
  const actualKeys = Object.keys(actual);
  const missing = keys.filter((key) => !actualKeys.includes(key));
  const pass = missing.length === 0;

  return {
    pass,
    message: pass
      ? `Expected object not to have keys ${JSON.stringify(keys)}`
      : `Expected object to have keys ${JSON.stringify(keys)}, but missing ${JSON.stringify(missing)}`,
    expected: keys,
    actual: actualKeys,
  };
}

/**
 * Check if function was called with arguments matching a pattern
 *
 * @param mockFn Mock function
 * @param matcher Argument matcher
 * @returns Assertion result
 *
 * @example
 * ```typescript
 * expect.extend({ toHaveBeenCalledWithMatch });
 * expect(mockFn).toHaveBeenCalledWithMatch({ name: 'John' });
 * ```
 */
export function toHaveBeenCalledWithMatch(mockFn: any, matcher: any): AssertionResult {
  if (!mockFn.mock || !mockFn.mock.calls) {
    return {
      pass: false,
      message: 'Expected value to be a mock function',
      expected: 'mock function',
      actual: typeof mockFn,
    };
  }

  const pass = mockFn.mock.calls.some((call: any[]) => {
    return call.some((arg: any) => matchesObject(arg, matcher));
  });

  return {
    pass,
    message: pass
      ? `Expected mock not to have been called with arguments matching ${JSON.stringify(matcher)}`
      : `Expected mock to have been called with arguments matching ${JSON.stringify(matcher)}`,
    expected: matcher,
    actual: mockFn.mock.calls,
  };
}

/**
 * Check if promise resolves to a value
 *
 * @param actual Promise
 * @param expected Expected resolved value
 * @returns Assertion result
 *
 * @example
 * ```typescript
 * expect.extend({ toResolveWith });
 * await expect(promise).toResolveWith({ success: true });
 * ```
 */
export async function toResolveWith(actual: Promise<any>, expected: any): Promise<AssertionResult> {
  try {
    const result = await actual;
    const pass = deepEquals(result, expected);

    return {
      pass,
      message: pass
        ? `Expected promise not to resolve with ${JSON.stringify(expected)}`
        : `Expected promise to resolve with ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`,
      expected,
      actual: result,
    };
  } catch (error) {
    return {
      pass: false,
      message: `Expected promise to resolve with ${JSON.stringify(expected)}, but it rejected with ${error}`,
      expected,
      actual: error,
    };
  }
}

/**
 * Check if promise rejects with an error
 *
 * @param actual Promise
 * @param expectedError Expected error message or class
 * @returns Assertion result
 *
 * @example
 * ```typescript
 * expect.extend({ toRejectWith });
 * await expect(promise).toRejectWith('Invalid input');
 * await expect(promise).toRejectWith(ValidationError);
 * ```
 */
export async function toRejectWith(
  actual: Promise<any>,
  expectedError?: string | RegExp | (new (...args: any[]) => Error)
): Promise<AssertionResult> {
  try {
    const result = await actual;
    return {
      pass: false,
      message: `Expected promise to reject, but it resolved with ${JSON.stringify(result)}`,
      expected: 'rejection',
      actual: result,
    };
  } catch (error) {
    if (!expectedError) {
      return {
        pass: true,
        message: `Expected promise not to reject`,
        expected: 'no rejection',
        actual: error,
      };
    }

    let pass = false;
    if (typeof expectedError === 'string') {
      pass = (error as Error).message === expectedError;
    } else if (expectedError instanceof RegExp) {
      pass = expectedError.test((error as Error).message);
    } else if (typeof expectedError === 'function') {
      pass = error instanceof expectedError;
    }

    return {
      pass,
      message: pass
        ? `Expected promise not to reject with ${expectedError}`
        : `Expected promise to reject with ${expectedError}, but got ${error}`,
      expected: expectedError,
      actual: error,
    };
  }
}

/**
 * Check if number is close to expected value (within tolerance)
 *
 * @param actual Actual number
 * @param expected Expected number
 * @param tolerance Tolerance (default: 0.01)
 * @returns Assertion result
 *
 * @example
 * ```typescript
 * expect.extend({ toBeCloseTo });
 * expect(3.14159).toBeCloseTo(3.14, 0.01);
 * ```
 */
export function toBeCloseTo(actual: number, expected: number, tolerance: number = 0.01): AssertionResult {
  const pass = Math.abs(actual - expected) <= tolerance;

  return {
    pass,
    message: pass
      ? `Expected ${actual} not to be close to ${expected} (tolerance: ${tolerance})`
      : `Expected ${actual} to be close to ${expected} (tolerance: ${tolerance})`,
    expected,
    actual,
  };
}

/**
 * Deep equality check helper
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
 * Object matching helper
 */
function matchesObject(actual: any, expected: any): boolean {
  if (expected === null || expected === undefined) {
    return actual === expected;
  }

  if (typeof expected !== 'object') {
    return actual === expected;
  }

  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) return false;
    return expected.every((item, index) => matchesObject(actual[index], item));
  }

  for (const key in expected) {
    if (!(key in actual)) return false;
    if (!matchesObject(actual[key], expected[key])) return false;
  }

  return true;
}

/**
 * Export all matchers
 */
export const matchers = {
  toBeWithinRange,
  toBeBefore,
  toBeAfter,
  toContainExactly,
  toContainAll,
  toMatchObject,
  toMatchPattern,
  toBeSorted,
  toBeEmpty,
  toBeValidUUID,
  toBeValidEmail,
  toBeValidURL,
  toHaveKeys,
  toHaveBeenCalledWithMatch,
  toResolveWith,
  toRejectWith,
  toBeCloseTo,
};
