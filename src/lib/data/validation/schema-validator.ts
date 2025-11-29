/**
 * @file Schema Validator
 * @description Production-grade schema validation library with Zod-style API,
 * full TypeScript inference, composable validators, and async support.
 *
 * Features:
 * - Type-safe schema definitions with TypeScript inference
 * - Chainable API for schema composition
 * - Custom error messages with path tracking
 * - Async validation support
 * - Schema coercion and transformation
 * - Tree-shakeable exports
 *
 * @example
 * ```typescript
 * import { v, infer as Infer } from '@/lib/data/validation';
 *
 * const UserSchema = v.object({
 *   id: v.string().uuid(),
 *   email: v.string().email(),
 *   age: v.number().min(0).optional(),
 * });
 *
 * type User = Infer<typeof UserSchema>;
 *
 * const result = UserSchema.safeParse(data);
 * ```
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Validation issue structure
 */
export interface ValidationIssue {
  /** Error code for programmatic handling */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Path to the invalid field */
  path: (string | number)[];
  /** Expected value/type */
  expected?: string;
  /** Received value/type */
  received?: string;
  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Validation result for safeParse
 */
export type ValidationResult<T> =
  | { success: true; data: T; issues: never[] }
  | { success: false; data: undefined; issues: ValidationIssue[] };

/**
 * Async validation result
 */
export type AsyncValidationResult<T> = Promise<ValidationResult<T>>;

/**
 * Schema parse options
 */
export interface ParseOptions {
  /** Path prefix for error messages */
  path?: (string | number)[];
  /** Enable coercion (string to number, etc.) */
  coerce?: boolean;
  /** Collect all errors instead of failing fast */
  abortEarly?: boolean;
  /** Custom context passed to validators */
  context?: Record<string, unknown>;
}

/**
 * Base schema type for inference
 */
export type SchemaOutput<T extends BaseSchema<unknown>> = T['_output'];

/**
 * Infer TypeScript type from schema
 */
export type Infer<T extends BaseSchema<unknown>> = SchemaOutput<T>;

// =============================================================================
// BASE SCHEMA
// =============================================================================

/**
 * Abstract base class for all schema types
 */
export abstract class BaseSchema<TOutput> {
  /** Type marker for inference */
  readonly _output!: TOutput;

  /** Whether the schema is optional */
  protected _optional = false;

  /** Whether the schema is nullable */
  protected _nullable = false;

  /** Default value when undefined */
  protected _default?: TOutput;

  /** Transform function applied after validation */
  protected _transform?: (value: TOutput) => TOutput;

  /** Custom error message */
  protected _message?: string;

  /** Schema description for documentation */
  protected _description?: string;

  /**
   * Core validation logic to be implemented by subclasses
   */
  protected abstract _validate(
    value: unknown,
    options: ParseOptions
  ): ValidationResult<TOutput>;

  /**
   * Parse and validate input, throwing on error
   */
  parse(value: unknown, options?: ParseOptions): TOutput {
    const result = this.safeParse(value, options);
    if (!result.success) {
      throw new SchemaValidationError(result.issues);
    }
    return result.data;
  }

  /**
   * Parse and validate input, returning result object
   */
  safeParse(value: unknown, options: ParseOptions = {}): ValidationResult<TOutput> {
    const opts = { path: [], coerce: false, abortEarly: true, ...options };

    // Handle undefined
    if (value === undefined) {
      if (this._default !== undefined) {
        return { success: true, data: this._default, issues: [] };
      }
      if (this._optional) {
        return { success: true, data: undefined as TOutput, issues: [] };
      }
      return {
        success: false,
        data: undefined,
        issues: [this._createIssue('required', 'Required field is missing', opts.path)],
      };
    }

    // Handle null
    if (value === null) {
      if (this._nullable) {
        return { success: true, data: null as TOutput, issues: [] };
      }
      return {
        success: false,
        data: undefined,
        issues: [this._createIssue('invalid_type', 'Expected non-null value', opts.path)],
      };
    }

    // Run core validation
    const result = this._validate(value, opts);

    // Apply transform if validation succeeded
    if (result.success && this._transform) {
      try {
        const transformed = this._transform(result.data);
        return { success: true, data: transformed, issues: [] };
      } catch (error) {
        return {
          success: false,
          data: undefined,
          issues: [
            this._createIssue(
              'transform_error',
              error instanceof Error ? error.message : 'Transform failed',
              opts.path
            ),
          ],
        };
      }
    }

    return result;
  }

  /**
   * Async parse and validate
   */
  async parseAsync(value: unknown, options?: ParseOptions): Promise<TOutput> {
    return Promise.resolve(this.parse(value, options));
  }

  /**
   * Async safeParse
   */
  async safeParseAsync(
    value: unknown,
    options?: ParseOptions
  ): AsyncValidationResult<TOutput> {
    return Promise.resolve(this.safeParse(value, options));
  }

  /**
   * Mark schema as optional
   */
  optional(): BaseSchema<TOutput | undefined> {
    const clone = this._clone();
    clone._optional = true;
    return clone as unknown as BaseSchema<TOutput | undefined>;
  }

  /**
   * Mark schema as nullable
   */
  nullable(): BaseSchema<TOutput | null> {
    const clone = this._clone();
    clone._nullable = true;
    return clone as unknown as BaseSchema<TOutput | null>;
  }

  /**
   * Set default value
   */
  default(value: TOutput): BaseSchema<TOutput> {
    const clone = this._clone();
    clone._default = value;
    return clone;
  }

  /**
   * Add transform function
   */
  transform<TNew>(fn: (value: TOutput) => TNew): BaseSchema<TNew> {
    const clone = this._clone();
    clone._transform = fn as unknown as (value: TOutput) => TOutput;
    return clone as unknown as BaseSchema<TNew>;
  }

  /**
   * Add description
   */
  describe(description: string): this {
    const clone = this._clone();
    clone._description = description;
    return clone;
  }

  /**
   * Create a validation issue
   */
  protected _createIssue(
    code: string,
    message: string,
    path: (string | number)[],
    context?: Record<string, unknown>
  ): ValidationIssue {
    return {
      code,
      message: this._message ?? message,
      path,
      ...context,
    };
  }

  /**
   * Clone the schema for immutable modifications
   */
  protected abstract _clone(): this;
}

// =============================================================================
// STRING SCHEMA
// =============================================================================

/**
 * String validation schema
 */
export class StringSchema extends BaseSchema<string> {
  private _minLength?: number;
  private _maxLength?: number;
  private _pattern?: RegExp;
  private _format?: 'email' | 'url' | 'uuid' | 'date' | 'datetime' | 'iso8601';
  private _trim = false;
  private _lowercase = false;
  private _uppercase = false;

  protected _validate(value: unknown, options: ParseOptions): ValidationResult<string> {
    // Coercion
    let str = value;
    if (options.coerce === true && typeof value !== 'string') {
      str = String(value);
    }

    if (typeof str !== 'string') {
      return {
        success: false,
        data: undefined,
        issues: [
          this._createIssue('invalid_type', `Expected string, received ${typeof value}`, options.path ?? [], {
            expected: 'string',
            received: typeof value,
          }),
        ],
      };
    }

    // Apply string transformations
    let result = str;
    if (this._trim) result = result.trim();
    if (this._lowercase) result = result.toLowerCase();
    if (this._uppercase) result = result.toUpperCase();

    const issues: ValidationIssue[] = [];

    // Length checks
    if (this._minLength !== undefined && result.length < this._minLength) {
      issues.push(
        this._createIssue(
          'too_small',
          `String must be at least ${this._minLength} characters`,
          options.path ?? [],
          { minimum: this._minLength, actual: result.length }
        )
      );
    }

    if (this._maxLength !== undefined && result.length > this._maxLength) {
      issues.push(
        this._createIssue(
          'too_big',
          `String must be at most ${this._maxLength} characters`,
          options.path ?? [],
          { maximum: this._maxLength, actual: result.length }
        )
      );
    }

    // Pattern check
    if (this._pattern && !this._pattern.test(result)) {
      issues.push(
        this._createIssue('invalid_pattern', 'String does not match required pattern', options.path ?? [], {
          pattern: this._pattern.toString(),
        })
      );
    }

    // Format checks
    if (this._format && issues.length === 0) {
      const formatIssue = this._validateFormat(result, this._format, options.path ?? []);
      if (formatIssue) issues.push(formatIssue);
    }

    if (issues.length > 0) {
      return { success: false, data: undefined, issues };
    }

    return { success: true, data: result, issues: [] };
  }

  private _validateFormat(
    value: string,
    format: string,
    path: (string | number)[]
  ): ValidationIssue | null {
    switch (format) {
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return this._createIssue('invalid_email', 'Invalid email address', path);
        }
        break;
      case 'url':
        try {
          new URL(value);
        } catch {
          return this._createIssue('invalid_url', 'Invalid URL', path);
        }
        break;
      case 'uuid':
        if (
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            value
          )
        ) {
          return this._createIssue('invalid_uuid', 'Invalid UUID', path);
        }
        break;
      case 'date':
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || isNaN(Date.parse(value))) {
          return this._createIssue('invalid_date', 'Invalid date format (YYYY-MM-DD)', path);
        }
        break;
      case 'datetime':
      case 'iso8601':
        if (isNaN(Date.parse(value))) {
          return this._createIssue('invalid_datetime', 'Invalid datetime format', path);
        }
        break;
    }
    return null;
  }

  min(length: number, message?: string): this {
    const clone = this._clone();
    clone._minLength = length;
    if (message != null && message !== '') clone._message = message;
    return clone;
  }

  max(length: number, message?: string): this {
    const clone = this._clone();
    clone._maxLength = length;
    if (message != null && message !== '') clone._message = message;
    return clone;
  }

  length(length: number, message?: string): this {
    return this.min(length, message).max(length, message);
  }

  regex(pattern: RegExp, message?: string): this {
    const clone = this._clone();
    clone._pattern = pattern;
    if (message !== undefined && message !== '') clone._message = message;
    return clone;
  }

  email(message?: string): this {
    const clone = this._clone();
    clone._format = 'email';
    if (message !== undefined && message !== '') clone._message = message;
    return clone;
  }

  url(message?: string): this {
    const clone = this._clone();
    clone._format = 'url';
    if (message !== undefined && message !== '') clone._message = message;
    return clone;
  }

  uuid(message?: string): this {
    const clone = this._clone();
    clone._format = 'uuid';
    if (message !== undefined && message !== '') clone._message = message;
    return clone;
  }

  datetime(message?: string): this {
    const clone = this._clone();
    clone._format = 'datetime';
    if (message !== undefined && message !== '') clone._message = message;
    return clone;
  }

  trim(): this {
    const clone = this._clone();
    clone._trim = true;
    return clone;
  }

  toLowerCase(): this {
    const clone = this._clone();
    clone._lowercase = true;
    return clone;
  }

  toUpperCase(): this {
    const clone = this._clone();
    clone._uppercase = true;
    return clone;
  }

  nonempty(message?: string): this {
    return this.min(1, message ?? 'String cannot be empty');
  }

  protected _clone(): this {
    const clone = new StringSchema() as this;
    clone._optional = this._optional;
    clone._nullable = this._nullable;
    clone._default = this._default as string;
    clone._transform = this._transform;
    clone._message = this._message;
    clone._minLength = this._minLength;
    clone._maxLength = this._maxLength;
    clone._pattern = this._pattern;
    clone._format = this._format;
    clone._trim = this._trim;
    clone._lowercase = this._lowercase;
    clone._uppercase = this._uppercase;
    return clone;
  }
}

// =============================================================================
// NUMBER SCHEMA
// =============================================================================

/**
 * Number validation schema
 */
export class NumberSchema extends BaseSchema<number> {
  private _min?: number;
  private _max?: number;
  private _integer = false;
  private _positive = false;
  private _negative = false;
  private _finite = true;

  protected _validate(value: unknown, options: ParseOptions): ValidationResult<number> {
    // Coercion
    let num = value;
    if (options.coerce === true && typeof value === 'string') {
      num = Number(value);
    }

    if (typeof num !== 'number' || isNaN(num)) {
      return {
        success: false,
        data: undefined,
        issues: [
          this._createIssue('invalid_type', `Expected number, received ${typeof value}`, options.path ?? [], {
            expected: 'number',
            received: typeof value,
          }),
        ],
      };
    }

    const issues: ValidationIssue[] = [];

    if (this._finite && !Number.isFinite(num)) {
      issues.push(this._createIssue('not_finite', 'Number must be finite', options.path ?? []));
    }

    if (this._integer && !Number.isInteger(num)) {
      issues.push(this._createIssue('not_integer', 'Number must be an integer', options.path ?? []));
    }

    if (this._positive && num <= 0) {
      issues.push(this._createIssue('not_positive', 'Number must be positive', options.path ?? []));
    }

    if (this._negative && num >= 0) {
      issues.push(this._createIssue('not_negative', 'Number must be negative', options.path ?? []));
    }

    if (this._min !== undefined && num < this._min) {
      issues.push(
        this._createIssue('too_small', `Number must be at least ${this._min}`, options.path ?? [], {
          minimum: this._min,
          actual: num,
        })
      );
    }

    if (this._max !== undefined && num > this._max) {
      issues.push(
        this._createIssue('too_big', `Number must be at most ${this._max}`, options.path ?? [], {
          maximum: this._max,
          actual: num,
        })
      );
    }

    if (issues.length > 0) {
      return { success: false, data: undefined, issues };
    }

    return { success: true, data: num, issues: [] };
  }

  min(value: number, message?: string): this {
    const clone = this._clone();
    clone._min = value;
    if (message !== undefined && message !== '') clone._message = message;
    return clone;
  }

  max(value: number, message?: string): this {
    const clone = this._clone();
    clone._max = value;
    if (message !== undefined && message !== '') clone._message = message;
    return clone;
  }

  int(message?: string): this {
    const clone = this._clone();
    clone._integer = true;
    if (message !== undefined && message !== '') clone._message = message;
    return clone;
  }

  positive(message?: string): this {
    const clone = this._clone();
    clone._positive = true;
    if (message !== undefined && message !== '') clone._message = message;
    return clone;
  }

  negative(message?: string): this {
    const clone = this._clone();
    clone._negative = true;
    if (message !== undefined && message !== '') clone._message = message;
    return clone;
  }

  nonnegative(message?: string): this {
    return this.min(0, message ?? 'Number must be non-negative');
  }

  finite(message?: string): this {
    const clone = this._clone();
    clone._finite = true;
    if (message !== undefined && message !== '') clone._message = message;
    return clone;
  }

  protected _clone(): this {
    const clone = new NumberSchema() as this;
    clone._optional = this._optional;
    clone._nullable = this._nullable;
    clone._default = this._default as number;
    clone._transform = this._transform;
    clone._message = this._message;
    clone._min = this._min;
    clone._max = this._max;
    clone._integer = this._integer;
    clone._positive = this._positive;
    clone._negative = this._negative;
    clone._finite = this._finite;
    return clone;
  }
}

// =============================================================================
// BOOLEAN SCHEMA
// =============================================================================

/**
 * Boolean validation schema
 */
export class BooleanSchema extends BaseSchema<boolean> {
  protected _validate(value: unknown, options: ParseOptions): ValidationResult<boolean> {
    // Coercion
    let bool = value;
    if (options.coerce === true) {
      if (value === 'true' || value === '1' || value === 1) bool = true;
      else if (value === 'false' || value === '0' || value === 0) bool = false;
    }

    if (typeof bool !== 'boolean') {
      return {
        success: false,
        data: undefined,
        issues: [
          this._createIssue('invalid_type', `Expected boolean, received ${typeof value}`, options.path ?? [], {
            expected: 'boolean',
            received: typeof value,
          }),
        ],
      };
    }

    return { success: true, data: bool, issues: [] };
  }

  protected _clone(): this {
    const clone = new BooleanSchema() as this;
    clone._optional = this._optional;
    clone._nullable = this._nullable;
    clone._default = this._default as boolean;
    clone._transform = this._transform;
    clone._message = this._message;
    return clone;
  }
}

// =============================================================================
// DATE SCHEMA
// =============================================================================

/**
 * Date validation schema
 */
export class DateSchema extends BaseSchema<Date> {
  private _min?: Date;
  private _max?: Date;

  protected _validate(value: unknown, options: ParseOptions): ValidationResult<Date> {
    // Coercion
    let date: Date;
    if (value instanceof Date) {
      date = value;
    } else if (options.coerce === true && (typeof value === 'string' || typeof value === 'number')) {
      date = new Date(value);
    } else {
      return {
        success: false,
        data: undefined,
        issues: [
          this._createIssue('invalid_type', `Expected Date, received ${typeof value}`, options.path ?? [], {
            expected: 'Date',
            received: typeof value,
          }),
        ],
      };
    }

    if (isNaN(date.getTime())) {
      return {
        success: false,
        data: undefined,
        issues: [this._createIssue('invalid_date', 'Invalid date value', options.path ?? [])],
      };
    }

    const issues: ValidationIssue[] = [];

    if (this._min && date < this._min) {
      issues.push(
        this._createIssue('too_small', `Date must be after ${this._min.toISOString()}`, options.path ?? [])
      );
    }

    if (this._max && date > this._max) {
      issues.push(
        this._createIssue('too_big', `Date must be before ${this._max.toISOString()}`, options.path ?? [])
      );
    }

    if (issues.length > 0) {
      return { success: false, data: undefined, issues };
    }

    return { success: true, data: date, issues: [] };
  }

  min(date: Date, message?: string): this {
    const clone = this._clone();
    clone._min = date;
    if (message !== undefined && message !== '') clone._message = message;
    return clone;
  }

  max(date: Date, message?: string): this {
    const clone = this._clone();
    clone._max = date;
    if (message !== undefined && message !== '') clone._message = message;
    return clone;
  }

  protected _clone(): this {
    const clone = new DateSchema() as this;
    clone._optional = this._optional;
    clone._nullable = this._nullable;
    clone._default = this._default as Date;
    clone._transform = this._transform;
    clone._message = this._message;
    clone._min = this._min;
    clone._max = this._max;
    return clone;
  }
}

// =============================================================================
// ARRAY SCHEMA
// =============================================================================

/**
 * Array validation schema
 */
export class ArraySchema<TElement extends BaseSchema<unknown>> extends BaseSchema<
  SchemaOutput<TElement>[]
> {
  private _element: TElement;
  private _minLength?: number;
  private _maxLength?: number;

  constructor(element: TElement) {
    super();
    this._element = element;
  }

  protected _validate(
    value: unknown,
    options: ParseOptions
  ): ValidationResult<SchemaOutput<TElement>[]> {
    if (!Array.isArray(value)) {
      return {
        success: false,
        data: undefined,
        issues: [
          this._createIssue('invalid_type', `Expected array, received ${typeof value}`, options.path ?? [], {
            expected: 'array',
            received: typeof value,
          }),
        ],
      };
    }

    const issues: ValidationIssue[] = [];
    const results: SchemaOutput<TElement>[] = [];

    // Length checks
    if (this._minLength !== undefined && value.length < this._minLength) {
      issues.push(
        this._createIssue('too_small', `Array must have at least ${this._minLength} items`, options.path ?? [])
      );
    }

    if (this._maxLength !== undefined && value.length > this._maxLength) {
      issues.push(
        this._createIssue('too_big', `Array must have at most ${this._maxLength} items`, options.path ?? [])
      );
    }

    // Validate each element
    for (let i = 0; i < value.length; i++) {
      const elementResult = this._element.safeParse(value[i], {
        ...options,
        path: [...(options.path ?? []), i],
      });

      if (!elementResult.success) {
        issues.push(...elementResult.issues);
        if (options.abortEarly === true) break;
      } else {
        results.push(elementResult.data);
      }
    }

    if (issues.length > 0) {
      return { success: false, data: undefined, issues };
    }

    return { success: true, data: results, issues: [] };
  }

  min(length: number, message?: string): this {
    const clone = this._clone();
    clone._minLength = length;
    if (message !== undefined && message !== '') clone._message = message;
    return clone;
  }

  max(length: number, message?: string): this {
    const clone = this._clone();
    clone._maxLength = length;
    if (message !== undefined && message !== '') clone._message = message;
    return clone;
  }

  length(length: number, message?: string): this {
    return this.min(length, message).max(length, message);
  }

  nonempty(message?: string): this {
    return this.min(1, message ?? 'Array cannot be empty');
  }

  protected _clone(): this {
    const clone = new ArraySchema(this._element) as this;
    clone._optional = this._optional;
    clone._nullable = this._nullable;
    clone._default = this._default;
    clone._transform = this._transform;
    clone._message = this._message;
    clone._minLength = this._minLength;
    clone._maxLength = this._maxLength;
    return clone;
  }
}

// =============================================================================
// OBJECT SCHEMA
// =============================================================================

/**
 * Type helper for object schema shape
 */
type ObjectShape = Record<string, BaseSchema<unknown>>;

/**
 * Infer object type from shape
 */
type InferObjectShape<T extends ObjectShape> = {
  [K in keyof T]: SchemaOutput<T[K]>;
};

/**
 * Object validation schema
 */
export class ObjectSchema<TShape extends ObjectShape> extends BaseSchema<
  InferObjectShape<TShape>
> {
  private _shape: TShape;
  private _strict = false;
  private _catchall?: BaseSchema<unknown>;
  private _passthrough = false;

  constructor(shape: TShape) {
    super();
    this._shape = shape;
  }

  protected _validate(
    value: unknown,
    options: ParseOptions
  ): ValidationResult<InferObjectShape<TShape>> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return {
        success: false,
        data: undefined,
        issues: [
          this._createIssue('invalid_type', `Expected object, received ${typeof value}`, options.path ?? [], {
            expected: 'object',
            received: Array.isArray(value) ? 'array' : typeof value,
          }),
        ],
      };
    }

    const obj = value as Record<string, unknown>;
    const issues: ValidationIssue[] = [];
    const result: Record<string, unknown> = {};

    // Validate defined shape
    for (const [key, schema] of Object.entries(this._shape)) {
      const fieldResult = schema.safeParse(obj[key], {
        ...options,
        path: [...(options.path ?? []), key],
      });

      if (!fieldResult.success) {
        issues.push(...fieldResult.issues);
        if (options.abortEarly === true) break;
      } else {
        result[key] = fieldResult.data;
      }
    }

    // Handle unknown keys
    const knownKeys = new Set(Object.keys(this._shape));
    for (const key of Object.keys(obj)) {
      if (!knownKeys.has(key)) {
        if (this._strict) {
          issues.push(
            this._createIssue('unrecognized_key', `Unrecognized key: ${key}`, [...(options.path ?? []), key])
          );
        } else if (this._catchall) {
          const catchResult = this._catchall.safeParse(obj[key], {
            ...options,
            path: [...(options.path ?? []), key],
          });
          if (!catchResult.success) {
            issues.push(...catchResult.issues);
          } else {
            result[key] = catchResult.data;
          }
        } else if (this._passthrough) {
          result[key] = obj[key];
        }
        // Default: strip unknown keys
      }
    }

    if (issues.length > 0) {
      return { success: false, data: undefined, issues };
    }

    return { success: true, data: result as InferObjectShape<TShape>, issues: [] };
  }

  /**
   * Reject unknown keys
   */
  strict(): this {
    const clone = this._clone();
    clone._strict = true;
    return clone;
  }

  /**
   * Pass through unknown keys
   */
  passthrough(): this {
    const clone = this._clone();
    clone._passthrough = true;
    return clone;
  }

  /**
   * Validate unknown keys with a schema
   */
  catchall<T extends BaseSchema<unknown>>(schema: T): this {
    const clone = this._clone();
    clone._catchall = schema;
    return clone;
  }

  /**
   * Pick specific keys
   */
  pick<K extends keyof TShape>(keys: K[]): ObjectSchema<Pick<TShape, K>> {
    const newShape = {} as Pick<TShape, K>;
    for (const key of keys) {
      newShape[key] = this._shape[key];
    }
    return new ObjectSchema(newShape);
  }

  /**
   * Omit specific keys
   */
  omit<K extends keyof TShape>(keys: K[]): ObjectSchema<Omit<TShape, K>> {
    const newShape = { ...this._shape };
    for (const key of keys) {
      delete newShape[key];
    }
    return new ObjectSchema(newShape as Omit<TShape, K>);
  }

  /**
   * Extend with additional fields
   */
  extend<TExtension extends ObjectShape>(
    extension: TExtension
  ): ObjectSchema<TShape & TExtension> {
    return new ObjectSchema({ ...this._shape, ...extension });
  }

  /**
   * Merge with another object schema
   */
  merge<TOther extends ObjectShape>(
    other: ObjectSchema<TOther>
  ): ObjectSchema<TShape & TOther> {
    return this.extend(other._shape);
  }

  /**
   * Make all fields partial
   */
  partial(): ObjectSchema<{ [K in keyof TShape]: ReturnType<TShape[K]['optional']> }> {
    const newShape = {} as Record<string, BaseSchema<unknown>>;
    for (const [key, schema] of Object.entries(this._shape)) {
      newShape[key] = schema.optional();
    }
    return new ObjectSchema(newShape) as ObjectSchema<{
      [K in keyof TShape]: ReturnType<TShape[K]['optional']>;
    }>;
  }

  /**
   * Get the shape
   */
  get shape(): TShape {
    return this._shape;
  }

  protected _clone(): this {
    const clone = new ObjectSchema(this._shape) as this;
    clone._optional = this._optional;
    clone._nullable = this._nullable;
    clone._default = this._default;
    clone._transform = this._transform;
    clone._message = this._message;
    clone._strict = this._strict;
    clone._catchall = this._catchall;
    clone._passthrough = this._passthrough;
    return clone;
  }
}

// =============================================================================
// ENUM SCHEMA
// =============================================================================

/**
 * Enum validation schema
 */
export class EnumSchema<T extends readonly [string, ...string[]]> extends BaseSchema<
  T[number]
> {
  private _values: T;

  constructor(values: T) {
    super();
    this._values = values;
  }

  protected _validate(value: unknown, options: ParseOptions): ValidationResult<T[number]> {
    if (!this._values.includes(value as string)) {
      return {
        success: false,
        data: undefined,
        issues: [
          this._createIssue(
            'invalid_enum_value',
            `Expected one of: ${this._values.join(', ')}`,
            options.path ?? [],
            {
              expected: this._values.join(' | '),
              received: String(value),
            }
          ),
        ],
      };
    }

    return { success: true, data: value as T[number], issues: [] };
  }

  get values(): T {
    return this._values;
  }

  protected _clone(): this {
    const clone = new EnumSchema(this._values) as this;
    clone._optional = this._optional;
    clone._nullable = this._nullable;
    clone._default = this._default;
    clone._transform = this._transform;
    clone._message = this._message;
    return clone;
  }
}

// =============================================================================
// LITERAL SCHEMA
// =============================================================================

/**
 * Literal validation schema
 */
export class LiteralSchema<T extends string | number | boolean> extends BaseSchema<T> {
  private _value: T;

  constructor(value: T) {
    super();
    this._value = value;
  }

  protected _validate(value: unknown, options: ParseOptions): ValidationResult<T> {
    if (value !== this._value) {
      return {
        success: false,
        data: undefined,
        issues: [
          this._createIssue(
            'invalid_literal',
            `Expected ${JSON.stringify(this._value)}, received ${JSON.stringify(value)}`,
            options.path ?? []
          ),
        ],
      };
    }

    return { success: true, data: value as T, issues: [] };
  }

  get value(): T {
    return this._value;
  }

  protected _clone(): this {
    const clone = new LiteralSchema(this._value) as this;
    clone._optional = this._optional;
    clone._nullable = this._nullable;
    clone._default = this._default;
    clone._transform = this._transform;
    clone._message = this._message;
    return clone;
  }
}

// =============================================================================
// UNION SCHEMA
// =============================================================================

/**
 * Union validation schema
 */
export class UnionSchema<T extends BaseSchema<unknown>[]> extends BaseSchema<
  SchemaOutput<T[number]>
> {
  private _schemas: T;

  constructor(schemas: T) {
    super();
    this._schemas = schemas;
  }

  protected _validate(
    value: unknown,
    options: ParseOptions
  ): ValidationResult<SchemaOutput<T[number]>> {
    const allIssues: ValidationIssue[] = [];

    for (const schema of this._schemas) {
      const result = schema.safeParse(value, options);
      if (result.success) {
        return { success: true, data: result.data as SchemaOutput<T[number]>, issues: [] };
      }
      allIssues.push(...result.issues);
    }

    return {
      success: false,
      data: undefined,
      issues: [
        this._createIssue(
          'invalid_union',
          'Input does not match any schema in the union',
          options.path ?? [],
          { unionErrors: allIssues }
        ),
      ],
    };
  }

  protected _clone(): this {
    const clone = new UnionSchema(this._schemas) as this;
    clone._optional = this._optional;
    clone._nullable = this._nullable;
    clone._default = this._default;
    clone._transform = this._transform;
    clone._message = this._message;
    return clone;
  }
}

// =============================================================================
// RECORD SCHEMA
// =============================================================================

/**
 * Record validation schema
 */
export class RecordSchema<
  TKey extends BaseSchema<string>,
  TValue extends BaseSchema<unknown>,
> extends BaseSchema<Record<string, SchemaOutput<TValue>>> {
  private _keySchema: TKey;
  private _valueSchema: TValue;

  constructor(keySchema: TKey, valueSchema: TValue) {
    super();
    this._keySchema = keySchema;
    this._valueSchema = valueSchema;
  }

  protected _validate(
    value: unknown,
    options: ParseOptions
  ): ValidationResult<Record<string, SchemaOutput<TValue>>> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return {
        success: false,
        data: undefined,
        issues: [
          this._createIssue('invalid_type', `Expected object, received ${typeof value}`, options.path ?? []),
        ],
      };
    }

    const obj = value as Record<string, unknown>;
    const issues: ValidationIssue[] = [];
    const result: Record<string, SchemaOutput<TValue>> = {};

    for (const [key, val] of Object.entries(obj)) {
      const keyResult = this._keySchema.safeParse(key, {
        ...options,
        path: [...(options.path ?? []), key],
      });

      if (!keyResult.success) {
        issues.push(...keyResult.issues);
        if (options.abortEarly === true) break;
        continue;
      }

      const valueResult = this._valueSchema.safeParse(val, {
        ...options,
        path: [...(options.path ?? []), key],
      });

      if (!valueResult.success) {
        issues.push(...valueResult.issues);
        if (options.abortEarly === true) break;
      } else {
        result[key] = valueResult.data as SchemaOutput<TValue>;
      }
    }

    if (issues.length > 0) {
      return { success: false, data: undefined, issues };
    }

    return { success: true, data: result, issues: [] };
  }

  protected _clone(): this {
    const clone = new RecordSchema(this._keySchema, this._valueSchema) as this;
    clone._optional = this._optional;
    clone._nullable = this._nullable;
    clone._default = this._default;
    clone._transform = this._transform;
    clone._message = this._message;
    return clone;
  }
}

// =============================================================================
// UNKNOWN / ANY SCHEMA
// =============================================================================

/**
 * Unknown validation schema (accepts anything)
 */
export class UnknownSchema extends BaseSchema<unknown> {
  protected _validate(value: unknown, _options: ParseOptions): ValidationResult<unknown> {
    return { success: true, data: value, issues: [] };
  }

  protected _clone(): this {
    const clone = new UnknownSchema() as this;
    clone._optional = this._optional;
    clone._nullable = this._nullable;
    clone._default = this._default;
    clone._transform = this._transform;
    clone._message = this._message;
    return clone;
  }
}

// =============================================================================
// VALIDATION ERROR
// =============================================================================

/**
 * Schema validation error
 */
export class SchemaValidationError extends Error {
  readonly issues: ValidationIssue[];

  constructor(issues: ValidationIssue[]) {
    const message = issues
      .map((i) => `${i.path.length > 0 ? `${i.path.join('.')}: ` : ''}${i.message}`)
      .join('; ');
    super(message);
    this.name = 'SchemaValidationError';
    this.issues = issues;
  }

  /**
   * Get flat error map
   */
  flatten(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const issue of this.issues) {
      const path = issue.path.join('.') || '_root';
      result[path] ??= [];
      result[path].push(issue.message);
    }
    return result;
  }

  /**
   * Format errors for display
   */
  format(): Record<string, { _errors: string[] }> {
    const result: Record<string, { _errors: string[] }> = {};
    for (const issue of this.issues) {
      const path = issue.path.join('.') || '_root';
      result[path] ??= { _errors: [] };
      result[path]._errors.push(issue.message);
    }
    return result;
  }
}

// =============================================================================
// SCHEMA FACTORY (v namespace)
// =============================================================================

/**
 * Schema factory functions
 */
export const v = {
  string: (): StringSchema => new StringSchema(),
  number: (): NumberSchema => new NumberSchema(),
  boolean: (): BooleanSchema => new BooleanSchema(),
  date: (): DateSchema => new DateSchema(),
  array: <T extends BaseSchema<unknown>>(element: T): ArraySchema<T> => new ArraySchema(element),
  object: <T extends ObjectShape>(shape: T): ObjectSchema<T> => new ObjectSchema(shape),
  enum: <T extends readonly [string, ...string[]]>(values: T): EnumSchema<T> => new EnumSchema(values),
  literal: <T extends string | number | boolean>(value: T): LiteralSchema<T> => new LiteralSchema(value),
  union: <T extends BaseSchema<unknown>[]>(...schemas: T): UnionSchema<T> => new UnionSchema(schemas),
  record: <TKey extends BaseSchema<string>, TValue extends BaseSchema<unknown>>(
    keySchema: TKey,
    valueSchema: TValue
  ): RecordSchema<TKey, TValue> => new RecordSchema(keySchema, valueSchema),
  unknown: (): UnknownSchema => new UnknownSchema(),
  any: (): UnknownSchema => new UnknownSchema(),

  // Convenience methods
  optional: <T extends BaseSchema<unknown>>(schema: T): T => schema.optional(),
  nullable: <T extends BaseSchema<unknown>>(schema: T): T => schema.nullable(),
};

// =============================================================================
// UTILITY TYPES EXPORT
// =============================================================================

export { type InferObjectShape as InferObject };

export type Schema<T = unknown> = BaseSchema<T>;

export class ValidationError extends Error {
  constructor(public issues: ValidationIssue[]) {
    super(issues[0]?.message ?? 'Validation failed');
    this.name = 'ValidationError';
  }
}
