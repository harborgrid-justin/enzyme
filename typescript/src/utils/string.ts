/**
 * String Manipulation Utilities
 *
 * Provides type-safe string transformation and manipulation functions
 * for common use cases in the enzyme framework.
 *
 * @module utils/string
 * @example
 * ```typescript
 * import { camelCase, kebabCase, capitalize } from '@missionfabric-js/enzyme-typescript/utils';
 *
 * const text = camelCase('hello-world'); // 'helloWorld'
 * const slug = kebabCase('HelloWorld'); // 'hello-world'
 * ```
 */

/**
 * Converts a string to camelCase.
 *
 * @param str - The string to convert
 * @returns The camelCase version of the string
 *
 * @example
 * ```typescript
 * camelCase('hello-world'); // 'helloWorld'
 * camelCase('Hello World'); // 'helloWorld'
 * camelCase('hello_world'); // 'helloWorld'
 * ```
 */
export function camelCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase())
    .replace(/^[A-Z]/, (char) => char.toLowerCase());
}

/**
 * Converts a string to PascalCase.
 *
 * @param str - The string to convert
 * @returns The PascalCase version of the string
 *
 * @example
 * ```typescript
 * pascalCase('hello-world'); // 'HelloWorld'
 * pascalCase('hello world'); // 'HelloWorld'
 * pascalCase('hello_world'); // 'HelloWorld'
 * ```
 */
export function pascalCase(str: string): string {
  const camelCased = camelCase(str);
  return camelCased.charAt(0).toUpperCase() + camelCased.slice(1);
}

/**
 * Converts a string to kebab-case.
 *
 * @param str - The string to convert
 * @returns The kebab-case version of the string
 *
 * @example
 * ```typescript
 * kebabCase('helloWorld'); // 'hello-world'
 * kebabCase('HelloWorld'); // 'hello-world'
 * kebabCase('hello_world'); // 'hello-world'
 * ```
 */
export function kebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Converts a string to snake_case.
 *
 * @param str - The string to convert
 * @returns The snake_case version of the string
 *
 * @example
 * ```typescript
 * snakeCase('helloWorld'); // 'hello_world'
 * snakeCase('HelloWorld'); // 'hello_world'
 * snakeCase('hello-world'); // 'hello_world'
 * ```
 */
export function snakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

/**
 * Converts a string to CONSTANT_CASE.
 *
 * @param str - The string to convert
 * @returns The CONSTANT_CASE version of the string
 *
 * @example
 * ```typescript
 * constantCase('helloWorld'); // 'HELLO_WORLD'
 * constantCase('hello-world'); // 'HELLO_WORLD'
 * ```
 */
export function constantCase(str: string): string {
  return snakeCase(str).toUpperCase();
}

/**
 * Capitalizes the first letter of a string.
 *
 * @param str - The string to capitalize
 * @returns The capitalized string
 *
 * @example
 * ```typescript
 * capitalize('hello'); // 'Hello'
 * capitalize('HELLO'); // 'HELLO'
 * ```
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Uncapitalizes the first letter of a string.
 *
 * @param str - The string to uncapitalize
 * @returns The uncapitalized string
 *
 * @example
 * ```typescript
 * uncapitalize('Hello'); // 'hello'
 * uncapitalize('HELLO'); // 'hELLO'
 * ```
 */
export function uncapitalize(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * Truncates a string to a specified length and adds an ellipsis.
 *
 * @param str - The string to truncate
 * @param length - The maximum length
 * @param ellipsis - The ellipsis string (default: '...')
 * @returns The truncated string
 *
 * @example
 * ```typescript
 * truncate('Hello World', 8); // 'Hello...'
 * truncate('Hello World', 8, '…'); // 'Hello W…'
 * truncate('Hello', 10); // 'Hello'
 * ```
 */
export function truncate(str: string, length: number, ellipsis = '...'): string {
  if (str.length <= length) return str;
  return str.slice(0, length - ellipsis.length) + ellipsis;
}

/**
 * Removes whitespace from both ends of a string and reduces internal whitespace to single spaces.
 *
 * @param str - The string to trim
 * @returns The trimmed string
 *
 * @example
 * ```typescript
 * trimAll('  hello   world  '); // 'hello world'
 * trimAll('hello\n\nworld'); // 'hello world'
 * ```
 */
export function trimAll(str: string): string {
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Slugifies a string for use in URLs.
 *
 * @param str - The string to slugify
 * @returns The slugified string
 *
 * @example
 * ```typescript
 * slugify('Hello World!'); // 'hello-world'
 * slugify('TypeScript & React'); // 'typescript-react'
 * ```
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Checks if a string is empty or contains only whitespace.
 *
 * @param str - The string to check
 * @returns True if the string is blank
 *
 * @example
 * ```typescript
 * isBlank(''); // true
 * isBlank('   '); // true
 * isBlank('hello'); // false
 * ```
 */
export function isBlank(str: string): boolean {
  return str.trim().length === 0;
}

/**
 * Reverses a string.
 *
 * @param str - The string to reverse
 * @returns The reversed string
 *
 * @example
 * ```typescript
 * reverse('hello'); // 'olleh'
 * reverse('TypeScript'); // 'tpircSepyT'
 * ```
 */
export function reverse(str: string): string {
  return str.split('').reverse().join('');
}

/**
 * Counts the number of words in a string.
 *
 * @param str - The string to count words in
 * @returns The number of words
 *
 * @example
 * ```typescript
 * wordCount('Hello world'); // 2
 * wordCount('Hello   world  !'); // 3
 * ```
 */
export function wordCount(str: string): number {
  return str.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Escapes HTML special characters in a string.
 *
 * @param str - The string to escape
 * @returns The escaped string
 *
 * @example
 * ```typescript
 * escapeHtml('<div>Hello</div>'); // '&lt;div&gt;Hello&lt;/div&gt;'
 * escapeHtml('Tom & Jerry'); // 'Tom &amp; Jerry'
 * ```
 */
export function escapeHtml(str: string): string {
  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, (char) => htmlEscapeMap[char]);
}

/**
 * Unescapes HTML special characters in a string.
 *
 * @param str - The string to unescape
 * @returns The unescaped string
 *
 * @example
 * ```typescript
 * unescapeHtml('&lt;div&gt;Hello&lt;/div&gt;'); // '<div>Hello</div>'
 * unescapeHtml('Tom &amp; Jerry'); // 'Tom & Jerry'
 * ```
 */
export function unescapeHtml(str: string): string {
  const htmlUnescapeMap: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
  };
  return str.replace(/&(?:amp|lt|gt|quot|#39);/g, (entity) => htmlUnescapeMap[entity]);
}

/**
 * Pads a string on the left with a specified character.
 *
 * @param str - The string to pad
 * @param length - The target length
 * @param char - The character to pad with (default: ' ')
 * @returns The padded string
 *
 * @example
 * ```typescript
 * padLeft('5', 3, '0'); // '005'
 * padLeft('hello', 10); // '     hello'
 * ```
 */
export function padLeft(str: string, length: number, char = ' '): string {
  return str.padStart(length, char);
}

/**
 * Pads a string on the right with a specified character.
 *
 * @param str - The string to pad
 * @param length - The target length
 * @param char - The character to pad with (default: ' ')
 * @returns The padded string
 *
 * @example
 * ```typescript
 * padRight('5', 3, '0'); // '500'
 * padRight('hello', 10); // 'hello     '
 * ```
 */
export function padRight(str: string, length: number, char = ' '): string {
  return str.padEnd(length, char);
}

/**
 * Replaces all occurrences of a substring in a string.
 *
 * @param str - The string to search in
 * @param search - The substring to search for
 * @param replace - The replacement string
 * @returns The string with replacements
 *
 * @example
 * ```typescript
 * replaceAll('hello world', 'o', '0'); // 'hell0 w0rld'
 * replaceAll('foo bar foo', 'foo', 'baz'); // 'baz bar baz'
 * ```
 */
export function replaceAll(str: string, search: string, replace: string): string {
  return str.split(search).join(replace);
}

/**
 * Checks if a string starts with any of the given prefixes.
 *
 * @param str - The string to check
 * @param prefixes - The prefixes to check for
 * @returns True if the string starts with any prefix
 *
 * @example
 * ```typescript
 * startsWithAny('hello', ['he', 'hi']); // true
 * startsWithAny('world', ['he', 'hi']); // false
 * ```
 */
export function startsWithAny(str: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => str.startsWith(prefix));
}

/**
 * Checks if a string ends with any of the given suffixes.
 *
 * @param str - The string to check
 * @param suffixes - The suffixes to check for
 * @returns True if the string ends with any suffix
 *
 * @example
 * ```typescript
 * endsWithAny('hello', ['lo', 'la']); // true
 * endsWithAny('world', ['lo', 'la']); // false
 * ```
 */
export function endsWithAny(str: string, suffixes: string[]): boolean {
  return suffixes.some((suffix) => str.endsWith(suffix));
}
