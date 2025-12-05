/**
 * Runtime Validation Utilities
 *
 * Provides type-safe runtime validation utilities for
 * validating data types, formats, and constraints.
 *
 * @module utils/validation
 * @example
 * ```typescript
 * import { isEmail, isURL, isNumber } from '@missionfabric-js/enzyme-typescript/utils';
 *
 * isEmail('user@example.com'); // true
 * isURL('https://example.com'); // true
 * ```
 */

/**
 * Checks if a value is a valid email address.
 *
 * @param value - The value to check
 * @returns True if valid email
 *
 * @example
 * ```typescript
 * isEmail('user@example.com'); // true
 * isEmail('invalid'); // false
 * ```
 */
export function isEmail(value: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * Checks if a value is a valid URL.
 *
 * @param value - The value to check
 * @returns True if valid URL
 *
 * @example
 * ```typescript
 * isURL('https://example.com'); // true
 * isURL('not a url'); // false
 * ```
 */
export function isURL(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a value is a valid UUID.
 *
 * @param value - The value to check
 * @returns True if valid UUID
 *
 * @example
 * ```typescript
 * isUUID('550e8400-e29b-41d4-a716-446655440000'); // true
 * isUUID('invalid'); // false
 * ```
 */
export function isUUID(value: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Checks if a value is a valid phone number (US format).
 *
 * @param value - The value to check
 * @returns True if valid phone number
 *
 * @example
 * ```typescript
 * isPhoneNumber('(555) 123-4567'); // true
 * isPhoneNumber('555-123-4567'); // true
 * isPhoneNumber('invalid'); // false
 * ```
 */
export function isPhoneNumber(value: string): boolean {
  const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
  return phoneRegex.test(value);
}

/**
 * Checks if a value is a valid credit card number (using Luhn algorithm).
 *
 * @param value - The value to check
 * @returns True if valid credit card number
 *
 * @example
 * ```typescript
 * isCreditCard('4532015112830366'); // true
 * isCreditCard('1234567890123456'); // false
 * ```
 */
export function isCreditCard(value: string): boolean {
  const sanitized = value.replace(/\D/g, '');
  if (sanitized.length < 13 || sanitized.length > 19) return false;

  let sum = 0;
  let isEven = false;

  for (let i = sanitized.length - 1; i >= 0; i--) {
    let digit = parseInt(sanitized[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Checks if a value is a valid IP address (v4 or v6).
 *
 * @param value - The value to check
 * @returns True if valid IP address
 *
 * @example
 * ```typescript
 * isIPAddress('192.168.1.1'); // true
 * isIPAddress('2001:0db8:85a3:0000:0000:8a2e:0370:7334'); // true
 * isIPAddress('invalid'); // false
 * ```
 */
export function isIPAddress(value: string): boolean {
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}$/i;

  return ipv4Regex.test(value) || ipv6Regex.test(value);
}

/**
 * Checks if a value is a valid hex color.
 *
 * @param value - The value to check
 * @returns True if valid hex color
 *
 * @example
 * ```typescript
 * isHexColor('#FF5733'); // true
 * isHexColor('#F57'); // true
 * isHexColor('invalid'); // false
 * ```
 */
export function isHexColor(value: string): boolean {
  const hexColorRegex = /^#?([A-F0-9]{6}|[A-F0-9]{3})$/i;
  return hexColorRegex.test(value);
}

/**
 * Checks if a value is a valid date string.
 *
 * @param value - The value to check
 * @returns True if valid date string
 *
 * @example
 * ```typescript
 * isDateString('2024-03-15'); // true
 * isDateString('invalid'); // false
 * ```
 */
export function isDateString(value: string): boolean {
  const date = new Date(value);
  return !isNaN(date.getTime());
}

/**
 * Checks if a value is a number.
 *
 * @param value - The value to check
 * @returns True if number
 *
 * @example
 * ```typescript
 * isNumber(123); // true
 * isNumber('123'); // false
 * isNumber(NaN); // false
 * ```
 */
export function isNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Checks if a value is a string.
 *
 * @param value - The value to check
 * @returns True if string
 *
 * @example
 * ```typescript
 * isString('hello'); // true
 * isString(123); // false
 * ```
 */
export function isString(value: any): value is string {
  return typeof value === 'string';
}

/**
 * Checks if a value is a boolean.
 *
 * @param value - The value to check
 * @returns True if boolean
 *
 * @example
 * ```typescript
 * isBoolean(true); // true
 * isBoolean(1); // false
 * ```
 */
export function isBoolean(value: any): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Checks if a value is an object.
 *
 * @param value - The value to check
 * @returns True if object
 *
 * @example
 * ```typescript
 * isObject({}); // true
 * isObject([]); // false
 * isObject(null); // false
 * ```
 */
export function isObject(value: any): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Checks if a value is an array.
 *
 * @param value - The value to check
 * @returns True if array
 *
 * @example
 * ```typescript
 * isArray([]); // true
 * isArray({}); // false
 * ```
 */
export function isArray(value: any): value is any[] {
  return Array.isArray(value);
}

/**
 * Checks if a value is a function.
 *
 * @param value - The value to check
 * @returns True if function
 *
 * @example
 * ```typescript
 * isFunction(() => {}); // true
 * isFunction({}); // false
 * ```
 */
export function isFunction(value: any): value is Function {
  return typeof value === 'function';
}

/**
 * Checks if a value is null.
 *
 * @param value - The value to check
 * @returns True if null
 *
 * @example
 * ```typescript
 * isNull(null); // true
 * isNull(undefined); // false
 * ```
 */
export function isNull(value: any): value is null {
  return value === null;
}

/**
 * Checks if a value is undefined.
 *
 * @param value - The value to check
 * @returns True if undefined
 *
 * @example
 * ```typescript
 * isUndefined(undefined); // true
 * isUndefined(null); // false
 * ```
 */
export function isUndefined(value: any): value is undefined {
  return value === undefined;
}

/**
 * Checks if a value is null or undefined.
 *
 * @param value - The value to check
 * @returns True if null or undefined
 *
 * @example
 * ```typescript
 * isNullOrUndefined(null); // true
 * isNullOrUndefined(undefined); // true
 * isNullOrUndefined(0); // false
 * ```
 */
export function isNullOrUndefined(value: any): value is null | undefined {
  return value == null;
}

/**
 * Checks if a value is empty (null, undefined, empty string, empty array, empty object).
 *
 * @param value - The value to check
 * @returns True if empty
 *
 * @example
 * ```typescript
 * isEmpty(''); // true
 * isEmpty([]); // true
 * isEmpty({}); // true
 * isEmpty(null); // true
 * isEmpty('hello'); // false
 * ```
 */
export function isEmpty(value: any): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Checks if a string matches a minimum length.
 *
 * @param value - The string to check
 * @param length - The minimum length
 * @returns True if meets minimum length
 *
 * @example
 * ```typescript
 * minLength('hello', 3); // true
 * minLength('hi', 3); // false
 * ```
 */
export function minLength(value: string, length: number): boolean {
  return value.length >= length;
}

/**
 * Checks if a string matches a maximum length.
 *
 * @param value - The string to check
 * @param length - The maximum length
 * @returns True if meets maximum length
 *
 * @example
 * ```typescript
 * maxLength('hello', 10); // true
 * maxLength('hello world', 5); // false
 * ```
 */
export function maxLength(value: string, length: number): boolean {
  return value.length <= length;
}

/**
 * Checks if a number is within a range.
 *
 * @param value - The number to check
 * @param min - The minimum value
 * @param max - The maximum value
 * @returns True if in range
 *
 * @example
 * ```typescript
 * inRange(5, 0, 10); // true
 * inRange(15, 0, 10); // false
 * ```
 */
export function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Checks if a value matches a pattern.
 *
 * @param value - The value to check
 * @param pattern - The regex pattern
 * @returns True if matches pattern
 *
 * @example
 * ```typescript
 * matches('hello123', /^[a-z]+\d+$/); // true
 * matches('hello', /^\d+$/); // false
 * ```
 */
export function matches(value: string, pattern: RegExp): boolean {
  return pattern.test(value);
}

/**
 * Validation schema type.
 */
export type ValidationSchema<T> = {
  [K in keyof T]: (value: T[K]) => boolean;
};

/**
 * Validates an object against a schema.
 *
 * @param obj - The object to validate
 * @param schema - The validation schema
 * @returns Validation result with errors
 *
 * @example
 * ```typescript
 * const user = { email: 'test@example.com', age: 25 };
 * const schema = {
 *   email: isEmail,
 *   age: (v: number) => v >= 18
 * };
 * const result = validate(user, schema);
 * // { valid: true, errors: {} }
 * ```
 */
export function validate<T extends Record<string, any>>(
  obj: T,
  schema: ValidationSchema<T>
): { valid: boolean; errors: Partial<Record<keyof T, string>> } {
  const errors: Partial<Record<keyof T, string>> = {};

  for (const key in schema) {
    if (Object.prototype.hasOwnProperty.call(schema, key)) {
      const validator = schema[key];
      const value = obj[key];

      if (!validator(value)) {
        errors[key] = `Validation failed for ${String(key)}`;
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Assertion error thrown when validation fails.
 */
export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertionError';
  }
}

/**
 * Asserts that a condition is true, throws otherwise.
 *
 * @param condition - The condition to check
 * @param message - The error message
 * @throws {AssertionError} If condition is false
 *
 * @example
 * ```typescript
 * assert(isEmail('test@example.com'), 'Invalid email');
 * assert(age >= 18, 'Must be 18 or older');
 * ```
 */
export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new AssertionError(message);
  }
}

/**
 * Asserts that a value is defined (not null or undefined).
 *
 * @param value - The value to check
 * @param message - The error message
 * @throws {AssertionError} If value is null or undefined
 *
 * @example
 * ```typescript
 * assertDefined(user, 'User not found');
 * assertDefined(config.apiKey, 'API key is required');
 * ```
 */
export function assertDefined<T>(
  value: T,
  message = 'Value is null or undefined'
): asserts value is NonNullable<T> {
  if (value == null) {
    throw new AssertionError(message);
  }
}

/**
 * Type guard for non-null values.
 *
 * @param value - The value to check
 * @returns True if not null or undefined
 *
 * @example
 * ```typescript
 * const values = [1, null, 2, undefined, 3];
 * const filtered = values.filter(isDefined); // [1, 2, 3]
 * ```
 */
export function isDefined<T>(value: T): value is NonNullable<T> {
  return value != null;
}
