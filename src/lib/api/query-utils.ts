import type { QueryParams, QueryParamValue } from './types';

/**
 * Query parameter serialization options
 */
export interface QuerySerializationOptions {
  /** Array serialization format */
  arrayFormat: 'brackets' | 'indices' | 'repeat' | 'comma';
  /** Encode keys */
  encodeKeys: boolean;
  /** Encode values */
  encodeValues: boolean;
  /** Skip null values */
  skipNull: boolean;
  /** Skip undefined values */
  skipUndefined: boolean;
  /** Allow dots in keys for nested objects */
  allowDots: boolean;
  /** Custom serializer for complex types */
  serialize?: (key: string, value: unknown) => string | null;
}

/**
 * Default serialization options
 */
export const DEFAULT_SERIALIZATION_OPTIONS: QuerySerializationOptions = {
  arrayFormat: 'brackets',
  encodeKeys: true,
  encodeValues: true,
  skipNull: true,
  skipUndefined: true,
  allowDots: false,
};

/**
 * Serialize query parameters to URL search string
 *
 * @example
 * ```typescript
 * serializeQueryParams({ page: 1, tags: ['a', 'b'] })
 * // Returns: 'page=1&tags[]=a&tags[]=b'
 *
 * serializeQueryParams({ page: 1, tags: ['a', 'b'] }, { arrayFormat: 'comma' })
 * // Returns: 'page=1&tags=a,b'
 * ```
 */
export function serializeQueryParams(
  params: QueryParams,
  options: Partial<QuerySerializationOptions> = {}
): string {
  const opts = { ...DEFAULT_SERIALIZATION_OPTIONS, ...options };
  const parts: string[] = [];

  for (const [key, value] of Object.entries(params)) {
    if (value === null && opts.skipNull) continue;
    if (value === undefined && opts.skipUndefined) continue;

    const serializedParts = serializeValue(key, value, opts);
    parts.push(...serializedParts);
  }

  return parts.join('&');
}

/**
 * Serialize a single value (handles arrays and objects)
 */
function serializeValue(
  key: string,
  value: QueryParamValue,
  options: QuerySerializationOptions
): string[] {
  // Custom serializer
  if (options.serialize) {
    const result = options.serialize(key, value);
    if (result !== null) {
      return [result];
    }
  }

  // Handle null/undefined
  if (value === null || value === undefined) {
    return [];
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return serializeArray(key, value, options);
  }

  // Handle primitives
  const encodedKey = options.encodeKeys ? encodeURIComponent(key) : key;
  const encodedValue = options.encodeValues ? encodeURIComponent(String(value)) : String(value);

  return [`${encodedKey}=${encodedValue}`];
}

/**
 * Serialize an array value based on format option
 */
function serializeArray(
  key: string,
  values: (string | number)[],
  options: QuerySerializationOptions
): string[] {
  const encodedKey = options.encodeKeys ? encodeURIComponent(key) : key;

  switch (options.arrayFormat) {
    case 'brackets':
      return values.map((v) => {
        const encodedValue = options.encodeValues ? encodeURIComponent(String(v)) : String(v);
        return `${encodedKey}[]=${encodedValue}`;
      });

    case 'indices':
      return values.map((v, i) => {
        const encodedValue = options.encodeValues ? encodeURIComponent(String(v)) : String(v);
        return `${encodedKey}[${i}]=${encodedValue}`;
      });

    case 'repeat':
      return values.map((v) => {
        const encodedValue = options.encodeValues ? encodeURIComponent(String(v)) : String(v);
        return `${encodedKey}=${encodedValue}`;
      });

    case 'comma': {
      const encodedValues = values.map((v) =>
        options.encodeValues ? encodeURIComponent(String(v)) : String(v)
      );
      return [`${encodedKey}=${encodedValues.join(',')}`];
    }

    default:
      return [];
  }
}

/**
 * Parse query string to parameters object
 *
 * @example
 * ```typescript
 * parseQueryParams('page=1&tags[]=a&tags[]=b')
 * // Returns: { page: '1', tags: ['a', 'b'] }
 * ```
 */
export function parseQueryParams(queryString: string): QueryParams {
  const params: QueryParams = {};
  const searchParams = new URLSearchParams(queryString);

  for (const [key, value] of searchParams.entries()) {
    // Handle array notation
    if (key.endsWith('[]')) {
      const arrayKey = key.slice(0, -2);
      params[arrayKey] ??= [];
      (params[arrayKey] as string[]).push(value);
    }
    // Handle indexed notation
    else if (/\[\d+\]$/.test(key)) {
      const arrayKey = key.replace(/\[\d+\]$/, '');
      params[arrayKey] ??= [];
      (params[arrayKey] as string[]).push(value);
    }
    // Handle comma-separated values (if only key exists)
    else if (value.includes(',') && params[key] === undefined) {
      params[key] = value.split(',');
    }
    // Handle repeated keys
    else if (params[key] !== undefined) {
      if (!Array.isArray(params[key])) {
        params[key] = [params[key] as string];
      }
      (params[key] as string[]).push(value);
    }
    // Simple key-value
    else {
      params[key] = value;
    }
  }

  return params;
}
