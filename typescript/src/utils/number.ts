/**
 * Number Utilities
 *
 * Provides type-safe number manipulation and formatting utilities
 * for common operations like clamping, rounding, and formatting.
 *
 * @module utils/number
 * @example
 * ```typescript
 * import { clamp, round, formatNumber } from '@missionfabric-js/enzyme-typescript/utils';
 *
 * const clamped = clamp(150, 0, 100); // 100
 * const rounded = round(3.14159, 2); // 3.14
 * ```
 */

/**
 * Clamps a number between a minimum and maximum value.
 *
 * @param value - The value to clamp
 * @param min - The minimum value
 * @param max - The maximum value
 * @returns The clamped value
 *
 * @example
 * ```typescript
 * clamp(150, 0, 100); // 100
 * clamp(-10, 0, 100); // 0
 * clamp(50, 0, 100); // 50
 * ```
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Rounds a number to a specified number of decimal places.
 *
 * @param value - The value to round
 * @param decimals - The number of decimal places
 * @returns The rounded value
 *
 * @example
 * ```typescript
 * round(3.14159, 2); // 3.14
 * round(3.14159, 0); // 3
 * round(3.5); // 4
 * ```
 */
export function round(value: number, decimals = 0): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Generates a random integer between min and max (inclusive).
 *
 * @param min - The minimum value
 * @param max - The maximum value
 * @returns A random integer
 *
 * @example
 * ```typescript
 * randomInt(1, 10); // Random integer between 1 and 10
 * randomInt(0, 100); // Random integer between 0 and 100
 * ```
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates a random float between min and max.
 *
 * @param min - The minimum value
 * @param max - The maximum value
 * @returns A random float
 *
 * @example
 * ```typescript
 * randomFloat(0, 1); // Random float between 0 and 1
 * randomFloat(10.5, 20.5); // Random float between 10.5 and 20.5
 * ```
 */
export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Checks if a number is between min and max (inclusive).
 *
 * @param value - The value to check
 * @param min - The minimum value
 * @param max - The maximum value
 * @returns True if value is in range
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
 * Formats a number with thousands separators.
 *
 * @param value - The number to format
 * @param locale - The locale (default: 'en-US')
 * @returns The formatted string
 *
 * @example
 * ```typescript
 * formatNumber(1234567); // '1,234,567'
 * formatNumber(1234567.89); // '1,234,567.89'
 * ```
 */
export function formatNumber(value: number, locale = 'en-US'): string {
  return value.toLocaleString(locale);
}

/**
 * Formats a number as currency.
 *
 * @param value - The value to format
 * @param currency - The currency code (default: 'USD')
 * @param locale - The locale (default: 'en-US')
 * @returns The formatted currency string
 *
 * @example
 * ```typescript
 * formatCurrency(1234.56); // '$1,234.56'
 * formatCurrency(1234.56, 'EUR', 'de-DE'); // '1.234,56 €'
 * ```
 */
export function formatCurrency(
  value: number,
  currency = 'USD',
  locale = 'en-US'
): string {
  return value.toLocaleString(locale, {
    style: 'currency',
    currency,
  });
}

/**
 * Formats a number as a percentage.
 *
 * @param value - The value to format (0-1)
 * @param decimals - Number of decimal places
 * @returns The formatted percentage string
 *
 * @example
 * ```typescript
 * formatPercentage(0.1234); // '12.34%'
 * formatPercentage(0.5, 0); // '50%'
 * ```
 */
export function formatPercentage(value: number, decimals = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Formats bytes as human-readable file size.
 *
 * @param bytes - The number of bytes
 * @param decimals - Number of decimal places
 * @returns The formatted file size string
 *
 * @example
 * ```typescript
 * formatBytes(1024); // '1 KB'
 * formatBytes(1234567); // '1.18 MB'
 * formatBytes(1234567890); // '1.15 GB'
 * ```
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Converts a number to an ordinal string.
 *
 * @param value - The number to convert
 * @returns The ordinal string
 *
 * @example
 * ```typescript
 * toOrdinal(1); // '1st'
 * toOrdinal(2); // '2nd'
 * toOrdinal(3); // '3rd'
 * toOrdinal(4); // '4th'
 * toOrdinal(21); // '21st'
 * ```
 */
export function toOrdinal(value: number): string {
  const suffix = ['th', 'st', 'nd', 'rd'];
  const v = value % 100;
  return value + (suffix[(v - 20) % 10] || suffix[v] || suffix[0]);
}

/**
 * Calculates the average of numbers.
 *
 * @param numbers - The numbers to average
 * @returns The average value
 *
 * @example
 * ```typescript
 * average(1, 2, 3, 4, 5); // 3
 * average(10, 20, 30); // 20
 * ```
 */
export function average(...numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

/**
 * Calculates the sum of numbers.
 *
 * @param numbers - The numbers to sum
 * @returns The sum
 *
 * @example
 * ```typescript
 * sum(1, 2, 3, 4, 5); // 15
 * sum(10, 20, 30); // 60
 * ```
 */
export function sum(...numbers: number[]): number {
  return numbers.reduce((total, n) => total + n, 0);
}

/**
 * Finds the minimum value.
 *
 * @param numbers - The numbers to compare
 * @returns The minimum value
 *
 * @example
 * ```typescript
 * min(5, 2, 8, 1, 9); // 1
 * ```
 */
export function min(...numbers: number[]): number {
  return Math.min(...numbers);
}

/**
 * Finds the maximum value.
 *
 * @param numbers - The numbers to compare
 * @returns The maximum value
 *
 * @example
 * ```typescript
 * max(5, 2, 8, 1, 9); // 9
 * ```
 */
export function max(...numbers: number[]): number {
  return Math.max(...numbers);
}

/**
 * Checks if a number is even.
 *
 * @param value - The number to check
 * @returns True if even
 *
 * @example
 * ```typescript
 * isEven(4); // true
 * isEven(5); // false
 * ```
 */
export function isEven(value: number): boolean {
  return value % 2 === 0;
}

/**
 * Checks if a number is odd.
 *
 * @param value - The number to check
 * @returns True if odd
 *
 * @example
 * ```typescript
 * isOdd(5); // true
 * isOdd(4); // false
 * ```
 */
export function isOdd(value: number): boolean {
  return value % 2 !== 0;
}

/**
 * Checks if a number is a prime number.
 *
 * @param value - The number to check
 * @returns True if prime
 *
 * @example
 * ```typescript
 * isPrime(7); // true
 * isPrime(8); // false
 * ```
 */
export function isPrime(value: number): boolean {
  if (value < 2) return false;
  if (value === 2) return true;
  if (value % 2 === 0) return false;

  const sqrt = Math.sqrt(value);
  for (let i = 3; i <= sqrt; i += 2) {
    if (value % i === 0) return false;
  }
  return true;
}

/**
 * Calculates the factorial of a number.
 *
 * @param value - The number
 * @returns The factorial
 *
 * @example
 * ```typescript
 * factorial(5); // 120
 * factorial(0); // 1
 * ```
 */
export function factorial(value: number): number {
  if (value < 0) throw new Error('Factorial of negative number is undefined');
  if (value === 0 || value === 1) return 1;
  return value * factorial(value - 1);
}

/**
 * Calculates the greatest common divisor.
 *
 * @param a - First number
 * @param b - Second number
 * @returns The GCD
 *
 * @example
 * ```typescript
 * gcd(48, 18); // 6
 * gcd(100, 50); // 50
 * ```
 */
export function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Calculates the least common multiple.
 *
 * @param a - First number
 * @param b - Second number
 * @returns The LCM
 *
 * @example
 * ```typescript
 * lcm(4, 6); // 12
 * lcm(21, 6); // 42
 * ```
 */
export function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}

/**
 * Linearly interpolates between two values.
 *
 * @param start - The start value
 * @param end - The end value
 * @param t - The interpolation factor (0-1)
 * @returns The interpolated value
 *
 * @example
 * ```typescript
 * lerp(0, 100, 0.5); // 50
 * lerp(10, 20, 0.25); // 12.5
 * ```
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/**
 * Normalizes a value from a range to 0-1.
 *
 * @param value - The value to normalize
 * @param min - The minimum of the range
 * @param max - The maximum of the range
 * @returns The normalized value (0-1)
 *
 * @example
 * ```typescript
 * normalize(50, 0, 100); // 0.5
 * normalize(25, 0, 100); // 0.25
 * ```
 */
export function normalize(value: number, min: number, max: number): number {
  return (value - min) / (max - min);
}

/**
 * Maps a value from one range to another.
 *
 * @param value - The value to map
 * @param inMin - Input range minimum
 * @param inMax - Input range maximum
 * @param outMin - Output range minimum
 * @param outMax - Output range maximum
 * @returns The mapped value
 *
 * @example
 * ```typescript
 * mapRange(5, 0, 10, 0, 100); // 50
 * mapRange(0.5, 0, 1, 0, 360); // 180
 * ```
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

/**
 * Converts degrees to radians.
 *
 * @param degrees - The angle in degrees
 * @returns The angle in radians
 *
 * @example
 * ```typescript
 * toRadians(180); // 3.14159...
 * toRadians(90); // 1.5708...
 * ```
 */
export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Converts radians to degrees.
 *
 * @param radians - The angle in radians
 * @returns The angle in degrees
 *
 * @example
 * ```typescript
 * toDegrees(Math.PI); // 180
 * toDegrees(Math.PI / 2); // 90
 * ```
 */
export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}
