/**
 * @fileoverview Configuration validation with schema support.
 *
 * Provides comprehensive validation:
 * - Type checking
 * - Required field validation
 * - Pattern matching
 * - Range validation
 * - Custom validators
 *
 * @module config/config-validator
 *
 * @example
 * ```typescript
 * const validator = new ConfigValidator(schema);
 * const result = validator.validate(config);
 *
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 */

import type {
  ConfigSchema,
  ConfigFieldSchema,
  ConfigRecord,
  ValidationResult,
  ValidationError,
  ValidationRule,
  ValidationRuleType,
} from './types';

// ============================================================================
// Types
// ============================================================================

/**
 * Custom validator function.
 */
export type CustomValidator = (
  value: unknown,
  path: string,
  config: ConfigRecord
) => string | null;

/**
 * Validator options.
 */
export interface ValidatorOptions {
  /** Custom validators */
  readonly customValidators?: Record<string, CustomValidator>;
  /** Whether to stop on first error */
  readonly stopOnFirstError?: boolean;
  /** Whether to coerce types */
  readonly coerceTypes?: boolean;
}

// ============================================================================
// Config Validator
// ============================================================================

/**
 * Configuration validator with schema support.
 */
export class ConfigValidator {
  private schema: ConfigSchema;
  private customValidators: Record<string, CustomValidator>;
  private options: ValidatorOptions;

  constructor(schema: ConfigSchema, options: ValidatorOptions = {}) {
    this.schema = schema;
    this.customValidators = options.customValidators ?? {};
    this.options = options;
  }

  /**
   * Validate configuration against schema.
   */
  validate(config: ConfigRecord): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    this.validateObject(config, this.schema, '', errors, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate a single value against a field schema.
   */
  validateField(
    value: unknown,
    schema: ConfigFieldSchema,
    path: string
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (schema.rules) {
      for (const rule of schema.rules) {
        const error = this.validateRule(value, rule, path);
        if (error) {
          errors.push(error);
          if (this.options.stopOnFirstError === true) {
            break;
          }
        }
      }
    }

    return errors;
  }

  private validateObject(
    obj: ConfigRecord,
    schema: ConfigSchema,
    basePath: string,
    errors: ValidationError[],
    warnings: string[]
  ): void {
    // Check each field in schema
    for (const [key, fieldSchema] of Object.entries(schema)) {
      const path = basePath ? `${basePath}.${key}` : key;
      const value = obj[key];

      // Check for deprecated fields
      if (fieldSchema.deprecated === true && value !== undefined) {
        warnings.push(
          fieldSchema.deprecationMessage ??
            `Field '${path}' is deprecated`
        );
      }

      // Validate rules
      if (fieldSchema.rules) {
        for (const rule of fieldSchema.rules) {
          const error = this.validateRule(value, rule, path);
          if (error) {
            errors.push(error);
            if (this.options.stopOnFirstError) {
              return;
            }
          }
        }
      }

      // Validate nested object
      if (
        fieldSchema.properties &&
        value !== undefined &&
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value)
      ) {
        this.validateObject(
          value as ConfigRecord,
          fieldSchema.properties,
          path,
          errors,
          warnings
        );
      }

      // Validate array items
      if (fieldSchema.items && Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          const itemPath = `${path}[${i}]`;
          const itemErrors = this.validateField(
            value[i],
            fieldSchema.items,
            itemPath
          );
          errors.push(...itemErrors);
        }
      }
    }
  }

  private validateRule(
    value: unknown,
    rule: ValidationRule,
    path: string
  ): ValidationError | null {
    const { type, params, message } = rule;

    switch (type) {
      case 'required':
        if (value === undefined || value === null || value === '') {
          return this.createError(path, message ?? `${path} is required`, type, value);
        }
        break;

      case 'string':
        if (value !== undefined && value !== null && typeof value !== 'string') {
          return this.createError(
            path,
            message ?? `${path} must be a string`,
            type,
            value
          );
        }
        break;

      case 'number':
        if (value !== undefined && value !== null && typeof value !== 'number') {
          return this.createError(
            path,
            message ?? `${path} must be a number`,
            type,
            value
          );
        }
        break;

      case 'boolean':
        if (value !== undefined && value !== null && typeof value !== 'boolean') {
          return this.createError(
            path,
            message ?? `${path} must be a boolean`,
            type,
            value
          );
        }
        break;

      case 'array':
        if (value !== undefined && value !== null && !Array.isArray(value)) {
          return this.createError(
            path,
            message ?? `${path} must be an array`,
            type,
            value
          );
        }
        break;

      case 'object':
        if (
          value !== undefined &&
          value !== null &&
          (typeof value !== 'object' || Array.isArray(value))
        ) {
          return this.createError(
            path,
            message ?? `${path} must be an object`,
            type,
            value
          );
        }
        break;

      case 'enum':
        if (
          value !== undefined &&
          value !== null &&
          Array.isArray(params) &&
          !params.includes(value)
        ) {
          return this.createError(
            path,
            message ?? `${path} must be one of: ${params.join(', ')}`,
            type,
            value
          );
        }
        break;

      case 'pattern':
        if (
          typeof value === 'string' &&
          typeof params === 'string' &&
          !new RegExp(params).test(value)
        ) {
          return this.createError(
            path,
            message ?? `${path} does not match pattern`,
            type,
            value
          );
        }
        break;

      case 'min':
        if (typeof value === 'number' && typeof params === 'number' && value < params) {
          return this.createError(
            path,
            message ?? `${path} must be at least ${params}`,
            type,
            value
          );
        }
        break;

      case 'max':
        if (typeof value === 'number' && typeof params === 'number' && value > params) {
          return this.createError(
            path,
            message ?? `${path} must be at most ${params}`,
            type,
            value
          );
        }
        break;

      case 'minLength':
        if (
          typeof value === 'string' &&
          typeof params === 'number' &&
          value.length < params
        ) {
          return this.createError(
            path,
            message ?? `${path} must be at least ${params} characters`,
            type,
            value
          );
        }
        if (
          Array.isArray(value) &&
          typeof params === 'number' &&
          value.length < params
        ) {
          return this.createError(
            path,
            message ?? `${path} must have at least ${params} items`,
            type,
            value
          );
        }
        break;

      case 'maxLength':
        if (
          typeof value === 'string' &&
          typeof params === 'number' &&
          value.length > params
        ) {
          return this.createError(
            path,
            message ?? `${path} must be at most ${params} characters`,
            type,
            value
          );
        }
        if (
          Array.isArray(value) &&
          typeof params === 'number' &&
          value.length > params
        ) {
          return this.createError(
            path,
            message ?? `${path} must have at most ${params} items`,
            type,
            value
          );
        }
        break;

      case 'email':
        if (
          typeof value === 'string' &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        ) {
          return this.createError(
            path,
            message ?? `${path} must be a valid email address`,
            type,
            value
          );
        }
        break;

      case 'url':
        if (typeof value === 'string') {
          try {
            new URL(value);
          } catch {
            return this.createError(
              path,
              message ?? `${path} must be a valid URL`,
              type,
              value
            );
          }
        }
        break;

      case 'custom':
        if (typeof params === 'string' && this.customValidators[params]) {
          const customMessage = this.customValidators[params](value, path, {});
          if (customMessage) {
            return this.createError(path, customMessage, type, value);
          }
        }
        break;
    }

    return null;
  }

  private createError(
    path: string,
    message: string,
    rule: ValidationRuleType,
    value: unknown
  ): ValidationError {
    return { path, message, rule, value };
  }

  /**
   * Register a custom validator.
   */
  registerValidator(name: string, validator: CustomValidator): void {
    this.customValidators[name] = validator;
  }
}

// ============================================================================
// Schema Builder
// ============================================================================

/**
 * Fluent builder for configuration schemas.
 */
export class SchemaBuilder {
  private schema: ConfigSchema = {};

  /**
   * Add a string field.
   */
  string(
    name: string,
    options?: {
      required?: boolean;
      default?: string;
      pattern?: string;
      minLength?: number;
      maxLength?: number;
      enum?: string[];
      description?: string;
      secret?: boolean;
      envVar?: string;
    }
  ): this {
    const rules: ValidationRule[] = [{ type: 'string' }];

    if (options?.required) {
      rules.unshift({ type: 'required' });
    }
    if (options?.pattern) {
      rules.push({ type: 'pattern', params: options.pattern });
    }
    if (options?.minLength !== undefined) {
      rules.push({ type: 'minLength', params: options.minLength });
    }
    if (options?.maxLength !== undefined) {
      rules.push({ type: 'maxLength', params: options.maxLength });
    }
    if (options?.enum) {
      rules.push({ type: 'enum', params: options.enum });
    }

    this.schema[name] = {
      description: options?.description,
      default: options?.default,
      rules,
      secret: options?.secret,
      envVar: options?.envVar,
    };

    return this;
  }

  /**
   * Add a number field.
   */
  number(
    name: string,
    options?: {
      required?: boolean;
      default?: number;
      min?: number;
      max?: number;
      description?: string;
      envVar?: string;
    }
  ): this {
    const rules: ValidationRule[] = [{ type: 'number' }];

    if (options?.required) {
      rules.unshift({ type: 'required' });
    }
    if (options?.min !== undefined) {
      rules.push({ type: 'min', params: options.min });
    }
    if (options?.max !== undefined) {
      rules.push({ type: 'max', params: options.max });
    }

    this.schema[name] = {
      description: options?.description,
      default: options?.default,
      rules,
      envVar: options?.envVar,
    };

    return this;
  }

  /**
   * Add a boolean field.
   */
  boolean(
    name: string,
    options?: {
      required?: boolean;
      default?: boolean;
      description?: string;
      envVar?: string;
    }
  ): this {
    const rules: ValidationRule[] = [{ type: 'boolean' }];

    if (options?.required) {
      rules.unshift({ type: 'required' });
    }

    this.schema[name] = {
      description: options?.description,
      default: options?.default,
      rules,
      envVar: options?.envVar,
    };

    return this;
  }

  /**
   * Add an object field.
   */
  object(
    name: string,
    properties: ConfigSchema,
    options?: {
      required?: boolean;
      description?: string;
    }
  ): this {
    const rules: ValidationRule[] = [{ type: 'object' }];

    if (options?.required) {
      rules.unshift({ type: 'required' });
    }

    this.schema[name] = {
      description: options?.description,
      rules,
      properties,
    };

    return this;
  }

  /**
   * Add an array field.
   */
  array(
    name: string,
    items: ConfigFieldSchema,
    options?: {
      required?: boolean;
      minLength?: number;
      maxLength?: number;
      description?: string;
    }
  ): this {
    const rules: ValidationRule[] = [{ type: 'array' }];

    if (options?.required) {
      rules.unshift({ type: 'required' });
    }
    if (options?.minLength !== undefined) {
      rules.push({ type: 'minLength', params: options.minLength });
    }
    if (options?.maxLength !== undefined) {
      rules.push({ type: 'maxLength', params: options.maxLength });
    }

    this.schema[name] = {
      description: options?.description,
      rules,
      items,
    };

    return this;
  }

  /**
   * Build the schema.
   */
  build(): ConfigSchema {
    return { ...this.schema };
  }
}

/**
 * Create a new schema builder.
 */
export function createSchema(): SchemaBuilder {
  return new SchemaBuilder();
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validate configuration with a quick schema.
 */
export function validateConfig(
  config: ConfigRecord,
  schema: ConfigSchema,
  options?: ValidatorOptions
): ValidationResult {
  const validator = new ConfigValidator(schema, options);
  return validator.validate(config);
}

/**
 * Common validation schemas.
 */
export const CommonSchemas = {
  /**
   * URL field schema.
   */
  url: (required = false): ConfigFieldSchema => ({
    rules: [
      ...(required ? [{ type: 'required' as const }] : []),
      { type: 'string' as const },
      { type: 'url' as const },
    ],
  }),

  /**
   * Email field schema.
   */
  email: (required = false): ConfigFieldSchema => ({
    rules: [
      ...(required ? [{ type: 'required' as const }] : []),
      { type: 'string' as const },
      { type: 'email' as const },
    ],
  }),

  /**
   * Port number schema.
   */
  port: (required = false): ConfigFieldSchema => ({
    rules: [
      ...(required ? [{ type: 'required' as const }] : []),
      { type: 'number' as const },
      { type: 'min' as const, params: 1 },
      { type: 'max' as const, params: 65535 },
    ],
  }),

  /**
   * Positive number schema.
   */
  positiveNumber: (required = false): ConfigFieldSchema => ({
    rules: [
      ...(required ? [{ type: 'required' as const }] : []),
      { type: 'number' as const },
      { type: 'min' as const, params: 0 },
    ],
  }),

  /**
   * Percentage schema (0-100).
   */
  percentage: (required = false): ConfigFieldSchema => ({
    rules: [
      ...(required ? [{ type: 'required' as const }] : []),
      { type: 'number' as const },
      { type: 'min' as const, params: 0 },
      { type: 'max' as const, params: 100 },
    ],
  }),
};
