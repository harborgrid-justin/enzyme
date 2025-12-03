/**
 * @file Comprehensive Formatting Extension
 * @description Enterprise-grade formatting utilities for runtime use
 *
 * Features:
 * - String case converters (camelCase, PascalCase, snake_case, kebab-case, SCREAMING_SNAKE)
 * - Template helpers for use in template strings
 * - Number formatting (currency, percentage, decimal precision)
 * - Date formatting (ISO, relative, localized)
 * - Pluralization with smart singular/plural handling
 * - Truncation with ellipsis and word-aware
 * - Sanitization (HTML escape, URL encode, SQL escape)
 * - Code formatting (JSON pretty print, code highlighting)
 * - i18n support with locale-aware formatting
 * - Extensible custom formatter registry
 *
 * @version 2.0.0
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface FormatOptions {
  locale?: string;
  timezone?: string;
  [key: string]: unknown;
}

export interface NumberFormatOptions extends Intl.NumberFormatOptions {
  locale?: string;
}

export interface CurrencyFormatOptions extends NumberFormatOptions {
  currency?: string;
  symbol?: boolean;
}

export interface DateFormatOptions extends Intl.DateTimeFormatOptions {
  locale?: string;
  relative?: boolean;
  format?: 'short' | 'medium' | 'long' | 'full' | 'iso' | 'custom';
}

export interface TruncateOptions {
  length: number;
  ellipsis?: string;
  wordBoundary?: boolean;
  preserveWords?: boolean;
}

export interface PluralizeOptions {
  count?: number;
  inclusive?: boolean;
  irregulars?: Record<string, string>;
}

export interface SanitizeOptions {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  stripAll?: boolean;
}

export type FormatterFunction<T = unknown, R = unknown> = (value: T, options?: FormatOptions) => R;

export interface FormatterRegistry {
  register<T = unknown, R = unknown>(name: string, formatter: FormatterFunction<T, R>): void;
  unregister(name: string): boolean;
  get<T = unknown, R = unknown>(name: string): FormatterFunction<T, R> | undefined;
  has(name: string): boolean;
  list(): string[];
  clear(): void;
}

// ============================================================================
// String Case Converters
// ============================================================================

/**
 * Convert string to camelCase
 * @example toCamelCase('hello-world') // 'helloWorld'
 */
export function toCamelCase(str: string): string {
  if (!str || typeof str !== 'string') return '';

  return str
    .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
    .replace(/^[A-Z]/, char => char.toLowerCase())
    .replace(/[^\w]/g, '');
}

/**
 * Convert string to PascalCase
 * @example toPascalCase('hello-world') // 'HelloWorld'
 */
export function toPascalCase(str: string): string {
  if (!str || typeof str !== 'string') return '';

  return str
    .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
    .replace(/^[a-z]/, char => char.toUpperCase())
    .replace(/[^\w]/g, '');
}

/**
 * Convert string to snake_case
 * @example toSnakeCase('helloWorld') // 'hello_world'
 */
export function toSnakeCase(str: string): string {
  if (!str || typeof str !== 'string') return '';

  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .replace(/[^\w_]/g, '')
    .toLowerCase();
}

/**
 * Convert string to kebab-case
 * @example toKebabCase('helloWorld') // 'hello-world'
 */
export function toKebabCase(str: string): string {
  if (!str || typeof str !== 'string') return '';

  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .replace(/[^\w-]/g, '')
    .toLowerCase();
}

/**
 * Convert string to SCREAMING_SNAKE_CASE
 * @example toScreamingSnakeCase('helloWorld') // 'HELLO_WORLD'
 */
export function toScreamingSnakeCase(str: string): string {
  if (!str || typeof str !== 'string') return '';

  return toSnakeCase(str).toUpperCase();
}

/**
 * Convert string to specific case type
 */
export function toCase(str: string, caseType: 'camel' | 'pascal' | 'snake' | 'kebab' | 'screaming'): string {
  const converters = {
    camel: toCamelCase,
    pascal: toPascalCase,
    snake: toSnakeCase,
    kebab: toKebabCase,
    screaming: toScreamingSnakeCase,
  };

  return converters[caseType]?.(str) ?? str;
}

// ============================================================================
// Number Formatting
// ============================================================================

/**
 * Format number with locale-aware formatting
 * @example formatNumber(1234.56, { locale: 'en-US', maximumFractionDigits: 2 }) // '1,234.56'
 */
export function formatNumber(value: number, options: NumberFormatOptions = {}): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return String(value);
  }

  const { locale = 'en-US', ...intlOptions } = options;

  try {
    return new Intl.NumberFormat(locale, intlOptions).format(value);
  } catch {
    return String(value);
  }
}

/**
 * Format number as currency
 * @example formatCurrency(1234.56, { currency: 'USD' }) // '$1,234.56'
 */
export function formatCurrency(
  value: number,
  options: CurrencyFormatOptions = {}
): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return String(value);
  }

  const {
    locale = 'en-US',
    currency = 'USD',
    symbol = true,
    ...intlOptions
  } = options;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: symbol ? 'symbol' : 'code',
      ...intlOptions,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

/**
 * Format number as percentage
 * @example formatPercentage(0.1234) // '12.34%'
 */
export function formatPercentage(
  value: number,
  options: NumberFormatOptions = {}
): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return String(value);
  }

  const { locale = 'en-US', minimumFractionDigits = 0, maximumFractionDigits = 2, ...intlOptions } = options;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits,
      maximumFractionDigits,
      ...intlOptions,
    }).format(value);
  } catch {
    return `${(value * 100).toFixed(2)}%`;
  }
}

/**
 * Format number with decimal precision
 * @example formatDecimal(1234.5678, 2) // '1234.57'
 */
export function formatDecimal(value: number, precision: number = 2): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return String(value);
  }

  return value.toFixed(precision);
}

/**
 * Format bytes to human-readable size
 * @example formatBytes(1024) // '1.00 KB'
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  if (typeof bytes !== 'number' || !Number.isFinite(bytes)) {
    return String(bytes);
  }

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// ============================================================================
// Date Formatting
// ============================================================================

/**
 * Format date with locale-aware formatting
 * @example formatDate(new Date(), { format: 'medium', locale: 'en-US' })
 */
export function formatDate(
  date: Date | string | number,
  options: DateFormatOptions = {}
): string {
  const dateObj = date instanceof Date ? date : new Date(date);

  if (isNaN(dateObj.getTime())) {
    return String(date);
  }

  const {
    locale = 'en-US',
    relative = false,
    format = 'medium',
    ...intlOptions
  } = options;

  // Relative time formatting
  if (relative) {
    return formatRelativeTime(dateObj, locale);
  }

  // ISO format
  if (format === 'iso') {
    return dateObj.toISOString();
  }

  // Custom format using Intl
  try {
    const formatOptions: Intl.DateTimeFormatOptions = format === 'custom'
      ? intlOptions
      : getDateFormatPreset(format);

    return new Intl.DateTimeFormat(locale, formatOptions).format(dateObj);
  } catch {
    return dateObj.toLocaleDateString();
  }
}

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(date: Date | string | number, locale: string = 'en-US'): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);
  const diffWeek = Math.round(diffDay / 7);
  const diffMonth = Math.round(diffDay / 30);
  const diffYear = Math.round(diffDay / 365);

  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    if (Math.abs(diffSec) < 60) return rtf.format(diffSec, 'second');
    if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
    if (Math.abs(diffHour) < 24) return rtf.format(diffHour, 'hour');
    if (Math.abs(diffDay) < 7) return rtf.format(diffDay, 'day');
    if (Math.abs(diffWeek) < 4) return rtf.format(diffWeek, 'week');
    if (Math.abs(diffMonth) < 12) return rtf.format(diffMonth, 'month');
    return rtf.format(diffYear, 'year');
  } catch {
    // Fallback for environments without RelativeTimeFormat
    const absDiff = Math.abs(diffDay);
    const suffix = diffMs > 0 ? 'from now' : 'ago';

    if (absDiff === 0) return 'today';
    if (absDiff === 1) return diffMs > 0 ? 'tomorrow' : 'yesterday';
    if (absDiff < 7) return `${absDiff} days ${suffix}`;
    if (absDiff < 30) return `${Math.round(absDiff / 7)} weeks ${suffix}`;
    if (absDiff < 365) return `${Math.round(absDiff / 30)} months ${suffix}`;
    return `${Math.round(absDiff / 365)} years ${suffix}`;
  }
}

/**
 * Get date format preset options
 */
function getDateFormatPreset(format: 'short' | 'medium' | 'long' | 'full'): Intl.DateTimeFormatOptions {
  const presets: Record<string, Intl.DateTimeFormatOptions> = {
    short: { dateStyle: 'short' },
    medium: { dateStyle: 'medium' },
    long: { dateStyle: 'long' },
    full: { dateStyle: 'full' },
  };

  return presets[format] ?? presets.medium;
}

// ============================================================================
// Pluralization
// ============================================================================

/**
 * Common irregular plurals
 */
const IRREGULAR_PLURALS: Record<string, string> = {
  person: 'people',
  man: 'men',
  woman: 'women',
  child: 'children',
  tooth: 'teeth',
  foot: 'feet',
  mouse: 'mice',
  goose: 'geese',
  ox: 'oxen',
  datum: 'data',
  criterion: 'criteria',
  phenomenon: 'phenomena',
  index: 'indices',
  matrix: 'matrices',
  vertex: 'vertices',
  axis: 'axes',
  crisis: 'crises',
  analysis: 'analyses',
  thesis: 'theses',
};

/**
 * Common uncountable words
 */
const UNCOUNTABLE_WORDS = new Set([
  'equipment', 'information', 'rice', 'money', 'species', 'series',
  'fish', 'sheep', 'deer', 'moose', 'swine', 'buffalo', 'data',
  'advice', 'evidence', 'furniture', 'luggage', 'news', 'progress',
]);

/**
 * Pluralize a word based on count
 * @example pluralize('person', 1) // 'person'
 * @example pluralize('person', 2) // 'people'
 * @example pluralize('item', 5, true) // '5 items'
 */
export function pluralize(
  word: string,
  count: number = 2,
  options: PluralizeOptions = {}
): string {
  const { inclusive = false, irregulars = {} } = options;

  if (!word || typeof word !== 'string') return word;

  const lowerWord = word.toLowerCase();
  const prefix = inclusive ? `${count} ` : '';

  // If count is 1, return singular
  if (count === 1) {
    return prefix + word;
  }

  // Check uncountable
  if (UNCOUNTABLE_WORDS.has(lowerWord)) {
    return prefix + word;
  }

  // Check custom irregulars first
  if (irregulars[lowerWord]) {
    return prefix + matchCase(word, irregulars[lowerWord]);
  }

  // Check built-in irregulars
  if (IRREGULAR_PLURALS[lowerWord]) {
    return prefix + matchCase(word, IRREGULAR_PLURALS[lowerWord]);
  }

  // Apply pluralization rules
  const plural = applyPluralizationRules(word);
  return prefix + plural;
}

/**
 * Singularize a word
 * @example singularize('people') // 'person'
 */
export function singularize(word: string, options: PluralizeOptions = {}): string {
  if (!word || typeof word !== 'string') return word;

  const { irregulars = {} } = options;
  const lowerWord = word.toLowerCase();

  // Check uncountable
  if (UNCOUNTABLE_WORDS.has(lowerWord)) {
    return word;
  }

  // Check custom irregulars (reverse lookup)
  for (const [singular, plural] of Object.entries(irregulars)) {
    if (plural === lowerWord) {
      return matchCase(word, singular);
    }
  }

  // Check built-in irregulars (reverse lookup)
  for (const [singular, plural] of Object.entries(IRREGULAR_PLURALS)) {
    if (plural === lowerWord) {
      return matchCase(word, singular);
    }
  }

  // Apply singularization rules
  return applySingularizationRules(word);
}

/**
 * Apply pluralization rules
 */
function applyPluralizationRules(word: string): string {
  // Words ending in y preceded by consonant
  if (/[^aeiou]y$/i.test(word)) {
    return word.slice(0, -1) + matchCase(word, 'ies');
  }

  // Words ending in s, ss, sh, ch, x, z
  if (/(s|ss|sh|ch|x|z)$/i.test(word)) {
    return word + matchCase(word, 'es');
  }

  // Words ending in f or fe
  if (/f$/i.test(word)) {
    return word.slice(0, -1) + matchCase(word, 'ves');
  }
  if (/fe$/i.test(word)) {
    return word.slice(0, -2) + matchCase(word, 'ves');
  }

  // Words ending in o preceded by consonant
  if (/[^aeiou]o$/i.test(word)) {
    return word + matchCase(word, 'es');
  }

  // Default: just add s
  return word + matchCase(word, 's');
}

/**
 * Apply singularization rules
 */
function applySingularizationRules(word: string): string {
  // Words ending in ies
  if (/ies$/i.test(word)) {
    return word.slice(0, -3) + matchCase(word, 'y');
  }

  // Words ending in ves
  if (/ves$/i.test(word)) {
    return word.slice(0, -3) + matchCase(word, 'f');
  }

  // Words ending in es
  if (/(s|sh|ch|x|z)es$/i.test(word)) {
    return word.slice(0, -2);
  }

  // Words ending in s
  if (/s$/i.test(word)) {
    return word.slice(0, -1);
  }

  return word;
}

/**
 * Match case of target word to source word
 */
function matchCase(source: string, target: string): string {
  if (source[0] === source[0].toUpperCase()) {
    return target[0].toUpperCase() + target.slice(1);
  }
  return target.toLowerCase();
}

// ============================================================================
// Truncation
// ============================================================================

/**
 * Truncate string to maximum length
 * @example truncate('Hello World', { length: 8 }) // 'Hello...'
 * @example truncate('Hello World', { length: 8, wordBoundary: true }) // 'Hello...'
 */
export function truncate(str: string, options: TruncateOptions): string {
  if (!str || typeof str !== 'string') return str;

  const {
    length,
    ellipsis = '...',
    wordBoundary = false,
    preserveWords = wordBoundary,
  } = options;

  if (str.length <= length) {
    return str;
  }

  let truncated = str.slice(0, length - ellipsis.length);

  if (preserveWords) {
    // Find the last space within the truncated string
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 0) {
      truncated = truncated.slice(0, lastSpace);
    }
  }

  return truncated + ellipsis;
}

/**
 * Truncate string to number of words
 * @example truncateWords('Hello beautiful world', 2) // 'Hello beautiful...'
 */
export function truncateWords(str: string, wordCount: number, ellipsis: string = '...'): string {
  if (!str || typeof str !== 'string') return str;

  const words = str.split(/\s+/);

  if (words.length <= wordCount) {
    return str;
  }

  return words.slice(0, wordCount).join(' ') + ellipsis;
}

// ============================================================================
// Sanitization
// ============================================================================

/**
 * HTML entity map
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Escape HTML entities
 * @example escapeHtml('<script>alert("XSS")</script>') // '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
 */
export function escapeHtml(str: string): string {
  if (!str || typeof str !== 'string') return str;

  return str.replace(/[&<>"'`=\/]/g, char => HTML_ENTITIES[char] || char);
}

/**
 * Unescape HTML entities
 */
export function unescapeHtml(str: string): string {
  if (!str || typeof str !== 'string') return str;

  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#x2F;': '/',
    '&#x60;': '`',
    '&#x3D;': '=',
  };

  return str.replace(/&[#\w]+;/g, entity => entities[entity] || entity);
}

/**
 * Strip HTML tags
 * @example stripHtml('<p>Hello <strong>World</strong></p>') // 'Hello World'
 */
export function stripHtml(str: string, options: SanitizeOptions = {}): string {
  if (!str || typeof str !== 'string') return str;

  const { allowedTags = [], stripAll = !allowedTags.length } = options;

  if (stripAll) {
    return str.replace(/<[^>]*>/g, '');
  }

  // Build regex for allowed tags
  const allowedPattern = allowedTags.join('|');
  const regex = new RegExp(`<(?!\\/?(${allowedPattern})\\b)[^>]*>`, 'gi');

  return str.replace(regex, '');
}

/**
 * URL encode string
 * @example encodeUrl('hello world') // 'hello%20world'
 */
export function encodeUrl(str: string): string {
  if (!str || typeof str !== 'string') return str;

  try {
    return encodeURIComponent(str);
  } catch {
    return str;
  }
}

/**
 * URL decode string
 */
export function decodeUrl(str: string): string {
  if (!str || typeof str !== 'string') return str;

  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

/**
 * Escape SQL string (basic protection, use parameterized queries in production)
 * @example escapeSql("'; DROP TABLE users--") // "''DROP TABLE users--"
 */
export function escapeSql(str: string): string {
  if (!str || typeof str !== 'string') return str;

  return str
    .replace(/'/g, "''")
    .replace(/;/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '');
}

/**
 * Escape RegExp special characters
 * @example escapeRegex('hello.world') // 'hello\\.world'
 */
export function escapeRegex(str: string): string {
  if (!str || typeof str !== 'string') return str;

  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// Code Formatting
// ============================================================================

/**
 * Pretty print JSON
 * @example formatJson({ name: 'John', age: 30 }) // '{\n  "name": "John",\n  "age": 30\n}'
 */
export function formatJson(value: unknown, indent: number = 2): string {
  try {
    return JSON.stringify(value, null, indent);
  } catch {
    return String(value);
  }
}

/**
 * Compact JSON (remove whitespace)
 * @example compactJson('{\n  "name": "John"\n}') // '{"name":"John"}'
 */
export function compactJson(json: string): string {
  try {
    return JSON.stringify(JSON.parse(json));
  } catch {
    return json;
  }
}

/**
 * Format code with syntax highlighting (returns ANSI colored string for terminal)
 * Note: For web use, consider using a library like highlight.js or prism.js
 */
export function highlightCode(code: string, language: string = 'javascript'): string {
  // Basic syntax highlighting using ANSI colors
  // This is a simple implementation - for production, use a proper syntax highlighter

  if (!code || typeof code !== 'string') return code;

  const colors = {
    keyword: '\x1b[35m', // Magenta
    string: '\x1b[32m',  // Green
    number: '\x1b[33m',  // Yellow
    comment: '\x1b[90m', // Gray
    reset: '\x1b[0m',
  };

  let highlighted = code;

  // Keywords
  const keywords = [
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
    'switch', 'case', 'break', 'continue', 'import', 'export', 'default',
    'class', 'extends', 'interface', 'type', 'async', 'await', 'new', 'this',
  ];

  keywords.forEach(keyword => {
    const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
    highlighted = highlighted.replace(regex, `${colors.keyword}$1${colors.reset}`);
  });

  // Strings
  highlighted = highlighted.replace(/(["'`])(?:(?=(\\?))\2.)*?\1/g, `${colors.string}$&${colors.reset}`);

  // Numbers
  highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, `${colors.number}$1${colors.reset}`);

  // Comments
  highlighted = highlighted.replace(/\/\/.*/g, `${colors.comment}$&${colors.reset}`);
  highlighted = highlighted.replace(/\/\*[\s\S]*?\*\//g, `${colors.comment}$&${colors.reset}`);

  return highlighted;
}

// ============================================================================
// i18n Support
// ============================================================================

/**
 * Global locale configuration
 */
let defaultLocale = 'en-US';
let defaultTimezone: string | undefined;

/**
 * Set default locale for all formatting operations
 */
export function setDefaultLocale(locale: string): void {
  defaultLocale = locale;
}

/**
 * Get current default locale
 */
export function getDefaultLocale(): string {
  return defaultLocale;
}

/**
 * Set default timezone
 */
export function setDefaultTimezone(timezone: string): void {
  defaultTimezone = timezone;
}

/**
 * Get current default timezone
 */
export function getDefaultTimezone(): string | undefined {
  return defaultTimezone;
}

/**
 * Format value using locale-specific formatter
 */
export function formatLocalized<T>(
  value: T,
  formatter: (value: T, locale: string) => string,
  locale?: string
): string {
  return formatter(value, locale ?? defaultLocale);
}

// ============================================================================
// Formatter Registry
// ============================================================================

/**
 * Custom formatter registry for extensibility
 */
class FormatterRegistryImpl implements FormatterRegistry {
  private formatters: Map<string, FormatterFunction> = new Map();

  /**
   * Register a custom formatter
   */
  register<T = unknown, R = unknown>(name: string, formatter: FormatterFunction<T, R>): void {
    if (this.formatters.has(name)) {
      console.warn(`Formatter "${name}" is already registered. Overwriting...`);
    }
    this.formatters.set(name, formatter as FormatterFunction);
  }

  /**
   * Unregister a formatter
   */
  unregister(name: string): boolean {
    return this.formatters.delete(name);
  }

  /**
   * Get a formatter by name
   */
  get<T = unknown, R = unknown>(name: string): FormatterFunction<T, R> | undefined {
    return this.formatters.get(name) as FormatterFunction<T, R> | undefined;
  }

  /**
   * Check if formatter exists
   */
  has(name: string): boolean {
    return this.formatters.has(name);
  }

  /**
   * List all registered formatters
   */
  list(): string[] {
    return Array.from(this.formatters.keys());
  }

  /**
   * Clear all formatters
   */
  clear(): void {
    this.formatters.clear();
  }
}

/**
 * Global formatter registry instance
 */
export const formatterRegistry: FormatterRegistry = new FormatterRegistryImpl();

/**
 * Generic format function that uses the registry
 */
export function format<T = unknown>(
  type: string,
  value: T,
  options?: FormatOptions
): unknown {
  const formatter = formatterRegistry.get(type);

  if (!formatter) {
    console.warn(`Formatter "${type}" not found`);
    return value;
  }

  return formatter(value, options);
}

// ============================================================================
// Template Helpers (for use in template strings)
// ============================================================================

/**
 * Template helpers that can be used in template literals
 */
export const fmt = {
  // String case
  camel: toCamelCase,
  pascal: toPascalCase,
  snake: toSnakeCase,
  kebab: toKebabCase,
  screaming: toScreamingSnakeCase,

  // Numbers
  number: (value: number, options?: NumberFormatOptions) => formatNumber(value, options),
  currency: (value: number, currency: string = 'USD', locale?: string) =>
    formatCurrency(value, { currency, locale }),
  percent: (value: number, options?: NumberFormatOptions) => formatPercentage(value, options),
  bytes: formatBytes,

  // Dates
  date: (date: Date | string | number, format?: DateFormatOptions) => formatDate(date, format),
  relative: (date: Date | string | number, locale?: string) => formatRelativeTime(date, locale),
  iso: (date: Date | string | number) => formatDate(date, { format: 'iso' }),

  // Text
  truncate: (str: string, length: number, ellipsis?: string) =>
    truncate(str, { length, ellipsis }),
  truncateWords: truncateWords,
  plural: pluralize,
  singular: singularize,

  // Sanitization
  escape: escapeHtml,
  stripTags: stripHtml,
  urlEncode: encodeUrl,

  // Code
  json: formatJson,
  highlight: highlightCode,
};

// ============================================================================
// Extension Interface
// ============================================================================

/**
 * Extension interface matching the enzyme extension system
 * This would need to be adjusted based on the actual enzyme extension types
 */
export interface EnzymeExtension {
  name: string;
  version?: string;
  description?: string;
  client?: Record<string, (...args: unknown[]) => unknown>;
  template?: {
    helpers?: Record<string, (...args: unknown[]) => unknown>;
    filters?: Record<string, (value: unknown, ...args: unknown[]) => unknown>;
  };
}

/**
 * Comprehensive formatting extension for Enzyme
 */
export const formattingExtension: EnzymeExtension = {
  name: 'enzyme:formatting',
  version: '2.0.0',
  description: 'Enterprise-grade formatting utilities with i18n support',

  // Client methods accessible via enzyme client
  client: {
    // Generic formatter
    $format: format,

    // Case conversion
    $toCase: toCase,
    $toCamelCase: toCamelCase,
    $toPascalCase: toPascalCase,
    $toSnakeCase: toSnakeCase,
    $toKebabCase: toKebabCase,
    $toScreamingSnakeCase: toScreamingSnakeCase,

    // Number formatting
    $formatNumber: formatNumber,
    $formatCurrency: formatCurrency,
    $formatPercentage: formatPercentage,
    $formatDecimal: formatDecimal,
    $formatBytes: formatBytes,

    // Date formatting
    $formatDate: formatDate,
    $formatRelativeTime: formatRelativeTime,

    // Text manipulation
    $pluralize: pluralize,
    $singularize: singularize,
    $truncate: truncate,
    $truncateWords: truncateWords,

    // Sanitization
    $escapeHtml: escapeHtml,
    $unescapeHtml: unescapeHtml,
    $stripHtml: stripHtml,
    $encodeUrl: encodeUrl,
    $decodeUrl: decodeUrl,
    $escapeSql: escapeSql,
    $escapeRegex: escapeRegex,

    // Code formatting
    $formatJson: formatJson,
    $compactJson: compactJson,
    $highlightCode: highlightCode,

    // i18n
    $setLocale: setDefaultLocale,
    $getLocale: getDefaultLocale,
    $setTimezone: setDefaultTimezone,
    $getTimezone: getDefaultTimezone,

    // Formatter registry
    $registerFormatter: formatterRegistry.register.bind(formatterRegistry),
    $unregisterFormatter: formatterRegistry.unregister.bind(formatterRegistry),
    $getFormatter: formatterRegistry.get.bind(formatterRegistry),
    $listFormatters: formatterRegistry.list.bind(formatterRegistry),
  },

  // Template helpers
  template: {
    helpers: {
      camelCase: toCamelCase,
      pascalCase: toPascalCase,
      kebabCase: toKebabCase,
      snakeCase: toSnakeCase,
      screamingSnakeCase: toScreamingSnakeCase,
      formatNumber,
      formatCurrency,
      formatPercentage,
      formatDate,
      formatRelativeTime,
      pluralize,
      singularize,
      truncate: (str: string, length: number) => truncate(str, { length }),
      escapeHtml,
      stripHtml,
      formatJson,
    },

    filters: {
      camel: toCamelCase,
      pascal: toPascalCase,
      kebab: toKebabCase,
      snake: toSnakeCase,
      screaming: toScreamingSnakeCase,
      currency: (value: unknown, currency: string = 'USD') =>
        typeof value === 'number' ? formatCurrency(value, { currency }) : String(value),
      percent: (value: unknown) =>
        typeof value === 'number' ? formatPercentage(value) : String(value),
      date: (value: unknown, format: DateFormatOptions = {}) =>
        formatDate(value as Date | string | number, format),
      relative: (value: unknown) =>
        formatRelativeTime(value as Date | string | number),
      plural: (value: unknown, count: number = 2) =>
        typeof value === 'string' ? pluralize(value, count) : String(value),
      singular: (value: unknown) =>
        typeof value === 'string' ? singularize(value) : String(value),
      truncate: (value: unknown, length: number = 50) =>
        typeof value === 'string' ? truncate(value, { length }) : String(value),
      escape: (value: unknown) =>
        typeof value === 'string' ? escapeHtml(value) : String(value),
      json: (value: unknown, indent: number = 2) => formatJson(value, indent),
    },
  },
};

// ============================================================================
// Default Export
// ============================================================================

export default formattingExtension;
