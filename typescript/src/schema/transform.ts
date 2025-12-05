/**
 * Schema transformation utilities for data coercion and preprocessing
 * @module @missionfabric-js/enzyme-typescript/schema/transform
 *
 * @example
 * ```typescript
 * import { coerceNumber, withDefault, trim } from '@missionfabric-js/enzyme-typescript/schema/transform';
 *
 * const schema = z.object({
 *   age: coerceNumber(),
 *   name: trim(),
 *   status: withDefault(z.string(), 'active'),
 * });
 * ```
 */

import { z } from 'zod';

/**
 * Coerce string input to number
 *
 * @param options - Coercion options
 * @returns Zod number schema with coercion
 *
 * @example
 * ```typescript
 * const schema = coerceNumber();
 * schema.parse('123'); // 123
 * schema.parse(123); // 123
 * schema.parse('invalid'); // Error
 *
 * // With min/max
 * const age = coerceNumber({ min: 0, max: 120 });
 * ```
 */
export function coerceNumber(options?: {
  min?: number;
  max?: number;
  int?: boolean;
  message?: string;
}): z.ZodNumber {
  let schema = z.coerce.number({
    invalid_type_error: options?.message || 'Must be a number',
  });

  if (options?.min !== undefined) {
    schema = schema.min(options.min);
  }

  if (options?.max !== undefined) {
    schema = schema.max(options.max);
  }

  if (options?.int) {
    schema = schema.int('Must be an integer');
  }

  return schema;
}

/**
 * Coerce string input to boolean
 *
 * @param options - Coercion options
 * @returns Zod boolean schema with coercion
 *
 * @example
 * ```typescript
 * const schema = coerceBoolean();
 * schema.parse('true'); // true
 * schema.parse('1'); // true
 * schema.parse('false'); // false
 * schema.parse('0'); // false
 *
 * // Strict mode (only 'true'/'false')
 * const strict = coerceBoolean({ strict: true });
 * ```
 */
export function coerceBoolean(options?: { strict?: boolean; message?: string }): z.ZodBoolean | z.ZodEffects<z.ZodString, boolean, string> {
  if (options?.strict) {
    return z.coerce.boolean({
      invalid_type_error: options?.message || 'Must be a boolean',
    });
  }

  // Accept 'true'/'false', '1'/'0', 'yes'/'no'
  return z.string().transform((val) => {
    const normalized = val.toLowerCase().trim();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
    throw new Error(options?.message || 'Must be a boolean value');
  });
}

/**
 * Coerce string input to Date
 *
 * @param options - Coercion options
 * @returns Zod date schema with coercion
 *
 * @example
 * ```typescript
 * const schema = coerceDate();
 * schema.parse('2024-03-15'); // Date object
 * schema.parse(1710460800000); // Date object from timestamp
 *
 * // With min/max dates
 * const recentDate = coerceDate({
 *   min: new Date('2020-01-01'),
 *   max: new Date(),
 * });
 * ```
 */
export function coerceDate(options?: { min?: Date; max?: Date; message?: string }): z.ZodDate {
  let schema = z.coerce.date({
    invalid_type_error: options?.message || 'Must be a valid date',
  });

  if (options?.min) {
    schema = schema.min(options.min);
  }

  if (options?.max) {
    schema = schema.max(options.max);
  }

  return schema;
}

/**
 * Add default value to a schema
 *
 * @param schema - Base schema
 * @param defaultValue - Default value to use
 * @returns Schema with default value
 *
 * @example
 * ```typescript
 * const schema = withDefault(z.string(), 'default');
 * schema.parse(undefined); // 'default'
 * schema.parse('custom'); // 'custom'
 *
 * // With function
 * const timestampSchema = withDefault(z.number(), () => Date.now());
 * ```
 */
export function withDefault<T extends z.ZodTypeAny>(
  schema: T,
  defaultValue: z.infer<T> | (() => z.infer<T>)
): z.ZodDefault<T> {
  return schema.default(defaultValue);
}

/**
 * Make all fields in a schema optional with defaults
 *
 * @param schema - Object schema
 * @param defaults - Default values for fields
 * @returns Schema with optional fields and defaults
 *
 * @example
 * ```typescript
 * const baseSchema = z.object({
 *   name: z.string(),
 *   age: z.number(),
 *   status: z.string(),
 * });
 *
 * const withDefaults = withDefaults(baseSchema, {
 *   status: 'active',
 *   age: 0,
 * });
 *
 * withDefaults.parse({ name: 'John' });
 * // { name: 'John', age: 0, status: 'active' }
 * ```
 */
export function withDefaults<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  defaults: Partial<{ [K in keyof T]: z.infer<T[K]> | (() => z.infer<T[K]>) }>
): z.ZodObject<{
  [K in keyof T]: T[K] extends z.ZodTypeAny ? z.ZodDefault<T[K]> : T[K];
}> {
  const shape = schema.shape;
  const newShape = {} as {
    [K in keyof T]: T[K] extends z.ZodTypeAny ? z.ZodDefault<T[K]> : T[K];
  };

  for (const key in shape) {
    const field = shape[key];
    if (key in defaults) {
      newShape[key] = field.default(defaults[key]) as any;
    } else {
      newShape[key] = field as any;
    }
  }

  return z.object(newShape);
}

/**
 * Trim whitespace from string schema
 *
 * @param options - Trim options
 * @returns Zod string schema with trimming
 *
 * @example
 * ```typescript
 * const schema = trim();
 * schema.parse('  hello  '); // 'hello'
 *
 * const nameSchema = trim({ minLength: 2, maxLength: 50 });
 * ```
 */
export function trim(options?: { minLength?: number; maxLength?: number }): z.ZodEffects<z.ZodString, string, string> {
  let schema = z.string();

  if (options?.minLength) {
    schema = schema.min(options.minLength);
  }

  if (options?.maxLength) {
    schema = schema.max(options.maxLength);
  }

  return schema.transform((val) => val.trim());
}

/**
 * Convert string to lowercase
 *
 * @returns Zod string schema with lowercase transformation
 *
 * @example
 * ```typescript
 * const schema = lowercase();
 * schema.parse('HELLO'); // 'hello'
 * schema.parse('MiXeD'); // 'mixed'
 * ```
 */
export function lowercase(): z.ZodEffects<z.ZodString, string, string> {
  return z.string().transform((val) => val.toLowerCase());
}

/**
 * Convert string to uppercase
 *
 * @returns Zod string schema with uppercase transformation
 *
 * @example
 * ```typescript
 * const schema = uppercase();
 * schema.parse('hello'); // 'HELLO'
 * schema.parse('MiXeD'); // 'MIXED'
 * ```
 */
export function uppercase(): z.ZodEffects<z.ZodString, string, string> {
  return z.string().transform((val) => val.toUpperCase());
}

/**
 * Parse JSON string to object
 *
 * @param schema - Optional schema to validate parsed JSON
 * @returns Schema that parses JSON string
 *
 * @example
 * ```typescript
 * const schema = parseJson();
 * schema.parse('{"key": "value"}'); // { key: 'value' }
 *
 * // With validation
 * const userSchema = parseJson(z.object({
 *   name: z.string(),
 *   age: z.number(),
 * }));
 * ```
 */
export function parseJson<T extends z.ZodTypeAny = z.ZodUnknown>(
  schema?: T
): z.ZodEffects<z.ZodString, z.infer<T>, string> {
  const validateSchema = schema || z.unknown();

  return z.string().transform((val, ctx) => {
    try {
      const parsed = JSON.parse(val);
      const result = validateSchema.safeParse(parsed);

      if (!result.success) {
        result.error.issues.forEach((issue) => {
          ctx.addIssue(issue);
        });
        return z.NEVER;
      }

      return result.data;
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid JSON string',
      });
      return z.NEVER;
    }
  });
}

/**
 * Stringify value to JSON string
 *
 * @param options - Stringify options
 * @returns Schema that stringifies value
 *
 * @example
 * ```typescript
 * const schema = stringifyJson();
 * schema.parse({ key: 'value' }); // '{"key":"value"}'
 *
 * // With pretty printing
 * const pretty = stringifyJson({ pretty: true });
 * ```
 */
export function stringifyJson(options?: { pretty?: boolean }): z.ZodEffects<z.ZodUnknown, string, unknown> {
  return z.unknown().transform((val) => {
    return options?.pretty ? JSON.stringify(val, null, 2) : JSON.stringify(val);
  });
}

/**
 * Split string into array
 *
 * @param options - Split options
 * @returns Schema that splits string into array
 *
 * @example
 * ```typescript
 * const schema = split();
 * schema.parse('a,b,c'); // ['a', 'b', 'c']
 *
 * const customSeparator = split({ separator: '|' });
 * customSeparator.parse('a|b|c'); // ['a', 'b', 'c']
 *
 * // With item validation
 * const numberArray = split({
 *   separator: ',',
 *   itemSchema: z.coerce.number(),
 * });
 * numberArray.parse('1,2,3'); // [1, 2, 3]
 * ```
 */
export function split<T extends z.ZodTypeAny = z.ZodString>(options?: {
  separator?: string | RegExp;
  itemSchema?: T;
  trim?: boolean;
}): z.ZodEffects<z.ZodString, z.infer<T>[], string> {
  const separator = options?.separator || ',';
  const itemSchema = (options?.itemSchema || z.string()) as T;
  const shouldTrim = options?.trim ?? true;

  return z.string().transform((val, ctx) => {
    const parts = val.split(separator);
    const items = shouldTrim ? parts.map((p) => p.trim()) : parts;

    const results: z.infer<T>[] = [];

    for (let i = 0; i < items.length; i++) {
      const result = itemSchema.safeParse(items[i]);

      if (!result.success) {
        result.error.issues.forEach((issue) => {
          ctx.addIssue({
            ...issue,
            path: [i, ...issue.path],
          });
        });
        return z.NEVER;
      }

      results.push(result.data);
    }

    return results;
  });
}

/**
 * Join array into string
 *
 * @param options - Join options
 * @returns Schema that joins array into string
 *
 * @example
 * ```typescript
 * const schema = join();
 * schema.parse(['a', 'b', 'c']); // 'a,b,c'
 *
 * const customSeparator = join({ separator: ' | ' });
 * customSeparator.parse(['a', 'b', 'c']); // 'a | b | c'
 * ```
 */
export function join(options?: { separator?: string }): z.ZodEffects<z.ZodArray<z.ZodString>, string, string[]> {
  const separator = options?.separator || ',';
  return z.array(z.string()).transform((val) => val.join(separator));
}

/**
 * Preprocess value before validation
 *
 * @param preprocessor - Preprocessing function
 * @param schema - Schema to validate after preprocessing
 * @returns Schema with preprocessing
 *
 * @example
 * ```typescript
 * // Normalize email before validation
 * const emailSchema = preprocess(
 *   (val) => typeof val === 'string' ? val.toLowerCase().trim() : val,
 *   z.string().email()
 * );
 *
 * emailSchema.parse('  USER@EXAMPLE.COM  '); // 'user@example.com'
 * ```
 */
export function preprocess<T extends z.ZodTypeAny>(
  preprocessor: (val: unknown) => unknown,
  schema: T
): z.ZodEffects<z.ZodTypeAny, z.infer<T>, unknown> {
  return z.preprocess(preprocessor, schema);
}

/**
 * Nullable schema that converts null to undefined
 *
 * @param schema - Base schema
 * @returns Nullable schema with null-to-undefined conversion
 *
 * @example
 * ```typescript
 * const schema = nullToUndefined(z.string());
 * schema.parse(null); // undefined
 * schema.parse('hello'); // 'hello'
 * ```
 */
export function nullToUndefined<T extends z.ZodTypeAny>(
  schema: T
): z.ZodEffects<z.ZodNullable<T>, z.infer<T> | undefined, z.infer<T> | null> {
  return schema.nullable().transform((val) => val ?? undefined);
}

/**
 * Remove empty strings and convert to undefined
 *
 * @param schema - String schema
 * @returns Schema that converts empty strings to undefined
 *
 * @example
 * ```typescript
 * const schema = emptyToUndefined(z.string());
 * schema.parse(''); // undefined
 * schema.parse('  '); // undefined (after trim)
 * schema.parse('hello'); // 'hello'
 * ```
 */
export function emptyToUndefined(
  schema: z.ZodString
): z.ZodEffects<z.ZodString, string | undefined, string> {
  return schema.transform((val) => {
    const trimmed = val.trim();
    return trimmed === '' ? undefined : trimmed;
  });
}

/**
 * Clamp number to min/max range
 *
 * @param options - Clamp options
 * @returns Schema that clamps number to range
 *
 * @example
 * ```typescript
 * const schema = clamp({ min: 0, max: 100 });
 * schema.parse(-10); // 0
 * schema.parse(150); // 100
 * schema.parse(50); // 50
 * ```
 */
export function clamp(options: { min: number; max: number }): z.ZodEffects<z.ZodNumber, number, number> {
  return z.number().transform((val) => {
    return Math.min(Math.max(val, options.min), options.max);
  });
}

/**
 * Round number to specified precision
 *
 * @param options - Rounding options
 * @returns Schema that rounds number
 *
 * @example
 * ```typescript
 * const schema = round({ precision: 2 });
 * schema.parse(3.14159); // 3.14
 *
 * const intSchema = round({ precision: 0 });
 * intSchema.parse(3.7); // 4
 * ```
 */
export function round(options?: { precision?: number }): z.ZodEffects<z.ZodNumber, number, number> {
  const precision = options?.precision ?? 0;
  const multiplier = Math.pow(10, precision);

  return z.number().transform((val) => {
    return Math.round(val * multiplier) / multiplier;
  });
}
