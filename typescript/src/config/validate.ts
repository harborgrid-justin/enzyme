/**
 * Configuration validation with detailed error messages.
 *
 * @module @missionfabric-js/enzyme-typescript/config/validate
 *
 * @example
 * ```typescript
 * import { validateConfig, createValidator } from '@missionfabric-js/enzyme-typescript/config';
 *
 * const schema = {
 *   database: {
 *     host: { type: 'required', expectedType: 'string' },
 *     port: { type: 'range', min: 1, max: 65535 }
 *   }
 * };
 *
 * const result = await validateConfig(config, schema);
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 */

import type {
  ConfigSchema,
  ValidationSchema,
  ValidationRule,
  ValidationError,
  ValidationResult,
} from './types';

/**
 * Validate a configuration object against a schema.
 *
 * @template T - The configuration schema type
 * @param config - The configuration object to validate
 * @param schema - The validation schema
 * @param path - Current path (used internally for recursion)
 * @returns Validation result with any errors
 *
 * @example
 * ```typescript
 * const config = { api: { timeout: 5000, url: 'https://api.example.com' } };
 * const schema = {
 *   api: {
 *     timeout: { type: 'range', min: 0, max: 30000 },
 *     url: { type: 'pattern', pattern: /^https:\/\// }
 *   }
 * };
 *
 * const result = await validateConfig(config, schema);
 * console.log(result.valid); // true
 * ```
 */
export async function validateConfig<T extends ConfigSchema>(
  config: T,
  schema: ValidationSchema<T>,
  path = ''
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  for (const key in schema) {
    if (!Object.prototype.hasOwnProperty.call(schema, key)) {
      continue;
    }

    const currentPath = path ? `${path}.${key}` : key;
    const schemaValue = schema[key];
    const configValue = (config as any)[key];

    // Check if schema value is a nested schema
    if (isNestedSchema(schemaValue)) {
      // Recursively validate nested object
      if (typeof configValue === 'object' && configValue !== null) {
        const nestedResult = await validateConfig(
          configValue as ConfigSchema,
          schemaValue as ValidationSchema,
          currentPath
        );
        errors.push(...nestedResult.errors);
        if (nestedResult.warnings) {
          warnings.push(...nestedResult.warnings);
        }
      } else {
        errors.push({
          path: currentPath,
          message: `Expected object at path "${currentPath}"`,
          value: configValue,
          expected: 'object',
        });
      }
      continue;
    }

    // Validate against rule(s)
    const rules = Array.isArray(schemaValue) ? schemaValue : [schemaValue];

    for (const rule of rules) {
      const ruleErrors = await validateRule(
        configValue,
        rule as ValidationRule,
        currentPath
      );
      errors.push(...ruleErrors);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate a value against a single rule.
 *
 * @param value - The value to validate
 * @param rule - The validation rule
 * @param path - The configuration path
 * @returns Array of validation errors
 *
 * @example
 * ```typescript
 * const errors = await validateRule(
 *   'localhost',
 *   { type: 'pattern', pattern: /^[a-z0-9.-]+$/i },
 *   'database.host'
 * );
 * ```
 */
export async function validateRule(
  value: unknown,
  rule: ValidationRule,
  path: string
): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  switch (rule.type) {
    case 'required':
      if (value === undefined || value === null || value === '') {
        errors.push({
          path,
          message: rule.message || `Required field "${path}" is missing`,
          value,
          expected: 'non-empty value',
          rule,
        });
      }
      break;

    case 'type':
      if (rule.expectedType && !checkType(value, rule.expectedType)) {
        errors.push({
          path,
          message:
            rule.message ||
            `Expected type "${rule.expectedType}" at "${path}", got "${typeof value}"`,
          value,
          expected: rule.expectedType,
          rule,
        });
      }
      break;

    case 'range':
      if (typeof value === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          errors.push({
            path,
            message:
              rule.message ||
              `Value at "${path}" must be >= ${rule.min}, got ${value}`,
            value,
            expected: `>= ${rule.min}`,
            rule,
          });
        }
        if (rule.max !== undefined && value > rule.max) {
          errors.push({
            path,
            message:
              rule.message ||
              `Value at "${path}" must be <= ${rule.max}, got ${value}`,
            value,
            expected: `<= ${rule.max}`,
            rule,
          });
        }
      } else if (typeof value === 'string') {
        if (rule.min !== undefined && value.length < rule.min) {
          errors.push({
            path,
            message:
              rule.message ||
              `String length at "${path}" must be >= ${rule.min}, got ${value.length}`,
            value,
            expected: `length >= ${rule.min}`,
            rule,
          });
        }
        if (rule.max !== undefined && value.length > rule.max) {
          errors.push({
            path,
            message:
              rule.message ||
              `String length at "${path}" must be <= ${rule.max}, got ${value.length}`,
            value,
            expected: `length <= ${rule.max}`,
            rule,
          });
        }
      }
      break;

    case 'pattern':
      if (rule.pattern && typeof value === 'string') {
        if (!rule.pattern.test(value)) {
          errors.push({
            path,
            message:
              rule.message ||
              `Value at "${path}" does not match pattern ${rule.pattern}`,
            value,
            expected: rule.pattern.toString(),
            rule,
          });
        }
      }
      break;

    case 'enum':
      if (rule.allowedValues && !rule.allowedValues.includes(value)) {
        errors.push({
          path,
          message:
            rule.message ||
            `Value at "${path}" must be one of: ${rule.allowedValues.join(', ')}`,
          value,
          expected: rule.allowedValues,
          rule,
        });
      }
      break;

    case 'custom':
      if (rule.validator) {
        try {
          const isValid = await rule.validator(value);
          if (!isValid) {
            errors.push({
              path,
              message: rule.message || `Custom validation failed at "${path}"`,
              value,
              rule,
            });
          }
        } catch (error) {
          errors.push({
            path,
            message:
              rule.message ||
              `Custom validation error at "${path}": ${
                error instanceof Error ? error.message : String(error)
              }`,
            value,
            rule,
          });
        }
      }
      break;
  }

  return errors;
}

/**
 * Check if a value matches an expected type.
 *
 * @param value - The value to check
 * @param expectedType - The expected type
 * @returns True if the value matches the expected type
 */
function checkType(
  value: unknown,
  expectedType: 'string' | 'number' | 'boolean' | 'object' | 'array'
): boolean {
  switch (expectedType) {
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    default:
      return typeof value === expectedType;
  }
}

/**
 * Check if a schema value is a nested schema.
 *
 * @param value - The schema value to check
 * @returns True if the value is a nested schema
 */
function isNestedSchema(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  // If it has a 'type' property, it's a rule, not a nested schema
  if ('type' in value) {
    return false;
  }

  // Otherwise, assume it's a nested schema
  return true;
}

/**
 * Create a reusable validator function.
 *
 * @template T - The configuration schema type
 * @param schema - The validation schema
 * @returns A validator function
 *
 * @example
 * ```typescript
 * const validator = createValidator({
 *   port: { type: 'range', min: 1, max: 65535 },
 *   host: { type: 'required', expectedType: 'string' }
 * });
 *
 * const result = await validator({ port: 8080, host: 'localhost' });
 * console.log(result.valid); // true
 * ```
 */
export function createValidator<T extends ConfigSchema>(
  schema: ValidationSchema<T>
): (config: T) => Promise<ValidationResult> {
  return async (config: T) => validateConfig(config, schema);
}

/**
 * Validate and throw on error.
 *
 * @template T - The configuration schema type
 * @param config - The configuration object to validate
 * @param schema - The validation schema
 * @throws {ValidationError} If validation fails
 *
 * @example
 * ```typescript
 * try {
 *   await validateOrThrow(config, schema);
 *   console.log('Configuration is valid');
 * } catch (error) {
 *   console.error('Validation failed:', error);
 * }
 * ```
 */
export async function validateOrThrow<T extends ConfigSchema>(
  config: T,
  schema: ValidationSchema<T>
): Promise<void> {
  const result = await validateConfig(config, schema);

  if (!result.valid) {
    throw new ConfigValidationError(result.errors);
  }
}

/**
 * Configuration validation error.
 */
export class ConfigValidationError extends Error {
  constructor(public errors: ValidationError[]) {
    super(formatValidationErrors(errors));
    this.name = 'ConfigValidationError';
    Object.setPrototypeOf(this, ConfigValidationError.prototype);
  }

  /**
   * Get errors grouped by path.
   */
  getErrorsByPath(): Map<string, ValidationError[]> {
    const grouped = new Map<string, ValidationError[]>();

    for (const error of this.errors) {
      const existing = grouped.get(error.path) || [];
      existing.push(error);
      grouped.set(error.path, existing);
    }

    return grouped;
  }

  /**
   * Get all error paths.
   */
  getPaths(): string[] {
    return [...new Set(this.errors.map((e) => e.path))];
  }
}

/**
 * Format validation errors into a readable message.
 *
 * @param errors - The validation errors
 * @returns Formatted error message
 */
function formatValidationErrors(errors: ValidationError[]): string {
  const lines = ['Configuration validation failed:'];

  for (const error of errors) {
    lines.push(`  - ${error.path}: ${error.message}`);
  }

  return lines.join('\n');
}

/**
 * Common validation rules.
 */
export const commonRules = {
  /**
   * Required field rule.
   */
  required: (): ValidationRule => ({
    type: 'required',
  }),

  /**
   * String type rule.
   */
  string: (): ValidationRule => ({
    type: 'type',
    expectedType: 'string',
  }),

  /**
   * Number type rule.
   */
  number: (): ValidationRule => ({
    type: 'type',
    expectedType: 'number',
  }),

  /**
   * Boolean type rule.
   */
  boolean: (): ValidationRule => ({
    type: 'type',
    expectedType: 'boolean',
  }),

  /**
   * Object type rule.
   */
  object: (): ValidationRule => ({
    type: 'type',
    expectedType: 'object',
  }),

  /**
   * Array type rule.
   */
  array: (): ValidationRule => ({
    type: 'type',
    expectedType: 'array',
  }),

  /**
   * Numeric range rule.
   */
  range: (min?: number, max?: number): ValidationRule => ({
    type: 'range',
    min,
    max,
  }),

  /**
   * String pattern rule.
   */
  pattern: (pattern: RegExp, message?: string): ValidationRule => ({
    type: 'pattern',
    pattern,
    message,
  }),

  /**
   * Enum rule.
   */
  enum: <T>(allowedValues: T[], message?: string): ValidationRule<T> => ({
    type: 'enum',
    allowedValues,
    message,
  }),

  /**
   * Custom validator rule.
   */
  custom: <T>(
    validator: (value: T) => boolean | Promise<boolean>,
    message?: string
  ): ValidationRule<T> => ({
    type: 'custom',
    validator,
    message,
  }),

  /**
   * URL validation rule.
   */
  url: (): ValidationRule => ({
    type: 'pattern',
    pattern: /^https?:\/\/.+/,
    message: 'Must be a valid URL',
  }),

  /**
   * Email validation rule.
   */
  email: (): ValidationRule => ({
    type: 'pattern',
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Must be a valid email address',
  }),

  /**
   * Port number validation rule.
   */
  port: (): ValidationRule => ({
    type: 'range',
    min: 1,
    max: 65535,
    message: 'Must be a valid port number (1-65535)',
  }),

  /**
   * IP address validation rule.
   */
  ipAddress: (): ValidationRule => ({
    type: 'pattern',
    pattern: /^(\d{1,3}\.){3}\d{1,3}$/,
    message: 'Must be a valid IP address',
  }),

  /**
   * Non-empty string rule.
   */
  nonEmptyString: (): ValidationRule[] => [
    commonRules.string(),
    {
      type: 'range',
      min: 1,
      message: 'String must not be empty',
    },
  ],

  /**
   * Positive number rule.
   */
  positiveNumber: (): ValidationRule[] => [
    commonRules.number(),
    {
      type: 'range',
      min: 0,
      message: 'Number must be positive',
    },
  ],
};

/**
 * Create a schema builder for type-safe validation.
 *
 * @template T - The configuration schema type
 * @returns A schema builder
 *
 * @example
 * ```typescript
 * const schema = schemaBuilder<AppConfig>()
 *   .field('port', commonRules.port())
 *   .field('host', commonRules.required())
 *   .build();
 * ```
 */
export function schemaBuilder<T extends ConfigSchema>() {
  const schema: ValidationSchema<T> = {};

  return {
    field<K extends keyof T>(
      key: K,
      rules: ValidationRule | ValidationRule[]
    ) {
      schema[key as string] = rules;
      return this;
    },

    nested<K extends keyof T>(
      key: K,
      nestedSchema: ValidationSchema
    ) {
      schema[key as string] = nestedSchema;
      return this;
    },

    build(): ValidationSchema<T> {
      return schema;
    },
  };
}
