/**
 * @file Unified Validation Utilities
 * @description Standardized validation patterns for common data types,
 * schema validation, and input sanitization.
 *
 * @module shared/validation-utils
 */

import {
  isString,
  isArray,
  isObject,
  isNonEmptyString,
  isFiniteNumber,
} from './type-utils';

// =============================================================================
// Types
// =============================================================================

/**
 * Validation result.
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Field validation result.
 */
export interface FieldValidationResult {
  valid: boolean;
  field: string;
  errors: string[];
}

/**
 * Schema validation result with all field errors.
 */
export interface SchemaValidationResult {
  valid: boolean;
  errors: Record<string, string[]>;
}

/**
 * Validator function type.
 */
export type Validator<T> = (value: T) => ValidationResult;

/**
 * Async validator function type.
 */
export type AsyncValidator<T> = (value: T) => Promise<ValidationResult>;

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Create a successful validation result.
 */
export function validResult(): ValidationResult {
  return { valid: true, errors: [] };
}

/**
 * Create a failed validation result.
 */
export function invalidResult(...errors: string[]): ValidationResult {
  return { valid: false, errors };
}

/**
 * Combine multiple validation results.
 */
export function combineResults(...results: ValidationResult[]): ValidationResult {
  const errors = results.flatMap((r) => r.errors);
  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// String Validators
// =============================================================================

/**
 * Validate string is not empty.
 */
export function validateRequired(value: unknown, fieldName = 'Field'): ValidationResult {
  if (!isNonEmptyString(value)) {
    return invalidResult(`${fieldName} is required`);
  }
  return validResult();
}

/**
 * Validate string minimum length.
 */
export function validateMinLength(
  value: string,
  minLength: number,
  fieldName = 'Field'
): ValidationResult {
  if (value.length < minLength) {
    return invalidResult(`${fieldName} must be at least ${minLength} characters`);
  }
  return validResult();
}

/**
 * Validate string maximum length.
 */
export function validateMaxLength(
  value: string,
  maxLength: number,
  fieldName = 'Field'
): ValidationResult {
  if (value.length > maxLength) {
    return invalidResult(`${fieldName} must be at most ${maxLength} characters`);
  }
  return validResult();
}

/**
 * Validate string length range.
 */
export function validateLength(
  value: string,
  min: number,
  max: number,
  fieldName = 'Field'
): ValidationResult {
  return combineResults(
    validateMinLength(value, min, fieldName),
    validateMaxLength(value, max, fieldName)
  );
}

/**
 * Validate string matches pattern.
 */
export function validatePattern(
  value: string,
  pattern: RegExp,
  message: string
): ValidationResult {
  if (!pattern.test(value)) {
    return invalidResult(message);
  }
  return validResult();
}

/**
 * Validate email format.
 */
export function validateEmail(
  value: string,
  fieldName = 'Email'
): ValidationResult {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(value)) {
    return invalidResult(`${fieldName} must be a valid email address`);
  }
  return validResult();
}

/**
 * Validate URL format.
 */
export function validateUrl(
  value: string,
  fieldName = 'URL'
): ValidationResult {
  try {
    new URL(value);
    return validResult();
  } catch {
    return invalidResult(`${fieldName} must be a valid URL`);
  }
}

/**
 * Validate phone number format (basic).
 */
export function validatePhone(
  value: string,
  fieldName = 'Phone'
): ValidationResult {
  const phonePattern = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/;
  if (!phonePattern.test(value) || value.replace(/\D/g, '').length < 7) {
    return invalidResult(`${fieldName} must be a valid phone number`);
  }
  return validResult();
}

/**
 * Validate UUID format.
 */
export function validateUuid(
  value: string,
  fieldName = 'ID'
): ValidationResult {
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(value)) {
    return invalidResult(`${fieldName} must be a valid UUID`);
  }
  return validResult();
}

/**
 * Validate slug format (lowercase letters, numbers, hyphens).
 */
export function validateSlug(
  value: string,
  fieldName = 'Slug'
): ValidationResult {
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!slugPattern.test(value)) {
    return invalidResult(
      `${fieldName} must contain only lowercase letters, numbers, and hyphens`
    );
  }
  return validResult();
}

/**
 * Validate alphanumeric string.
 */
export function validateAlphanumeric(
  value: string,
  fieldName = 'Field'
): ValidationResult {
  const pattern = /^[a-zA-Z0-9]+$/;
  if (!pattern.test(value)) {
    return invalidResult(`${fieldName} must contain only letters and numbers`);
  }
  return validResult();
}

// =============================================================================
// Number Validators
// =============================================================================

/**
 * Validate number is in range.
 */
export function validateNumberRange(
  value: number,
  min: number,
  max: number,
  fieldName = 'Value'
): ValidationResult {
  if (value < min || value > max) {
    return invalidResult(`${fieldName} must be between ${min} and ${max}`);
  }
  return validResult();
}

/**
 * Validate minimum value.
 */
export function validateMin(
  value: number,
  min: number,
  fieldName = 'Value'
): ValidationResult {
  if (value < min) {
    return invalidResult(`${fieldName} must be at least ${min}`);
  }
  return validResult();
}

/**
 * Validate maximum value.
 */
export function validateMax(
  value: number,
  max: number,
  fieldName = 'Value'
): ValidationResult {
  if (value > max) {
    return invalidResult(`${fieldName} must be at most ${max}`);
  }
  return validResult();
}

/**
 * Validate positive number.
 */
export function validatePositive(
  value: number,
  fieldName = 'Value'
): ValidationResult {
  if (value <= 0) {
    return invalidResult(`${fieldName} must be positive`);
  }
  return validResult();
}

/**
 * Validate non-negative number.
 */
export function validateNonNegative(
  value: number,
  fieldName = 'Value'
): ValidationResult {
  if (value < 0) {
    return invalidResult(`${fieldName} must not be negative`);
  }
  return validResult();
}

/**
 * Validate integer.
 */
export function validateInteger(
  value: number,
  fieldName = 'Value'
): ValidationResult {
  if (!Number.isInteger(value)) {
    return invalidResult(`${fieldName} must be a whole number`);
  }
  return validResult();
}

// =============================================================================
// Array Validators
// =============================================================================

/**
 * Validate array is not empty.
 */
export function validateArrayNotEmpty(
  value: unknown[],
  fieldName = 'List'
): ValidationResult {
  if (value.length === 0) {
    return invalidResult(`${fieldName} must not be empty`);
  }
  return validResult();
}

/**
 * Validate array length.
 */
export function validateArrayLength(
  value: unknown[],
  min: number,
  max: number,
  fieldName = 'List'
): ValidationResult {
  if (value.length < min) {
    return invalidResult(`${fieldName} must have at least ${min} items`);
  }
  if (value.length > max) {
    return invalidResult(`${fieldName} must have at most ${max} items`);
  }
  return validResult();
}

/**
 * Validate all array items.
 */
export function validateArrayItems<T>(
  value: T[],
  itemValidator: (item: T, index: number) => ValidationResult,
  fieldName = 'List'
): ValidationResult {
  const errors: string[] = [];

  value.forEach((item, index) => {
    const result = itemValidator(item, index);
    if (!result.valid) {
      result.errors.forEach((error) => {
        errors.push(`${fieldName}[${index}]: ${error}`);
      });
    }
  });

  return errors.length === 0 ? validResult() : { valid: false, errors };
}

/**
 * Validate array contains unique items.
 */
export function validateUnique<T>(
  value: T[],
  keyFn: (item: T) => string | number = String,
  fieldName = 'List'
): ValidationResult {
  const seen = new Set<string | number>();
  const duplicates: (string | number)[] = [];

  for (const item of value) {
    const key = keyFn(item);
    if (seen.has(key)) {
      duplicates.push(key);
    }
    seen.add(key);
  }

  if (duplicates.length > 0) {
    return invalidResult(`${fieldName} contains duplicate values`);
  }
  return validResult();
}

// =============================================================================
// Date Validators
// =============================================================================

/**
 * Validate date is not in the past.
 */
export function validateFutureDate(
  value: Date,
  fieldName = 'Date'
): ValidationResult {
  if (value.getTime() <= Date.now()) {
    return invalidResult(`${fieldName} must be in the future`);
  }
  return validResult();
}

/**
 * Validate date is not in the future.
 */
export function validatePastDate(
  value: Date,
  fieldName = 'Date'
): ValidationResult {
  if (value.getTime() >= Date.now()) {
    return invalidResult(`${fieldName} must be in the past`);
  }
  return validResult();
}

/**
 * Validate date is within range.
 */
export function validateDateRange(
  value: Date,
  min: Date,
  max: Date,
  fieldName = 'Date'
): ValidationResult {
  if (value < min || value > max) {
    return invalidResult(
      `${fieldName} must be between ${min.toISOString()} and ${max.toISOString()}`
    );
  }
  return validResult();
}

/**
 * Validate age (from birth date).
 */
export function validateAge(
  birthDate: Date,
  minAge: number,
  maxAge?: number,
  fieldName = 'Age'
): ValidationResult {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  if (age < minAge) {
    return invalidResult(`${fieldName} must be at least ${minAge}`);
  }
  if (maxAge !== undefined && age > maxAge) {
    return invalidResult(`${fieldName} must be at most ${maxAge}`);
  }
  return validResult();
}

// =============================================================================
// Validator Builder
// =============================================================================

/**
 * Chain multiple validators together.
 *
 * @example
 * ```ts
 * const validateUsername = createValidator<string>()
 *   .add((v) => validateRequired(v, 'Username'))
 *   .add((v) => validateMinLength(v, 3, 'Username'))
 *   .add((v) => validateMaxLength(v, 20, 'Username'))
 *   .add((v) => validateAlphanumeric(v, 'Username'))
 *   .build();
 *
 * const result = validateUsername('john123');
 * ```
 */
export function createValidator<T>(): ValidatorBuilder<T> {
  return new ValidatorBuilder<T>();
}

class ValidatorBuilder<T> {
  private validators: Validator<T>[] = [];

  /**
   * Add a validator to the chain.
   */
  add(validator: Validator<T>): ValidatorBuilder<T> {
    this.validators.push(validator);
    return this;
  }

  /**
   * Add a conditional validator.
   */
  when(
    condition: (value: T) => boolean,
    validator: Validator<T>
  ): ValidatorBuilder<T> {
    this.validators.push((value) => {
      if (condition(value)) {
        return validator(value);
      }
      return validResult();
    });
    return this;
  }

  /**
   * Build the final validator function.
   */
  build(): Validator<T> {
    return (value: T) => {
      const results = this.validators.map((v) => v(value));
      return combineResults(...results);
    };
  }
}

// =============================================================================
// Schema Validation
// =============================================================================

/**
 * Field schema definition.
 */
export interface FieldSchema<T = unknown> {
  /** Field is required */
  required?: boolean;
  /** Field type */
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date';
  /** Custom validators */
  validators?: Validator<T>[];
  /** Nested schema for objects */
  schema?: Record<string, FieldSchema>;
  /** Item schema for arrays */
  items?: FieldSchema;
}

/**
 * Validate an object against a schema.
 *
 * @example
 * ```ts
 * const schema: Record<string, FieldSchema> = {
 *   name: { required: true, type: 'string' },
 *   email: { required: true, type: 'string', validators: [(v) => validateEmail(v as string)] },
 *   age: { type: 'number', validators: [(v) => validateMin(v as number, 0)] },
 * };
 *
 * const result = validateSchema({ name: 'John', email: 'invalid' }, schema);
 * ```
 */
export function validateSchema(
  data: Record<string, unknown>,
  schema: Record<string, FieldSchema>
): SchemaValidationResult {
  const errors: Record<string, string[]> = {};

  for (const [field, fieldSchema] of Object.entries(schema)) {
    const value = data[field];
    const fieldErrors: string[] = [];

    // Required check
    if (fieldSchema.required === true && (value === undefined || value === null || value === '')) {
      fieldErrors.push(`${field} is required`);
      errors[field] = fieldErrors;
      continue;
    }

    // Skip further validation if not required and not provided
    if (value === undefined || value === null) {
      continue;
    }

    // Type check
    if (fieldSchema.type) {
      const typeValid = checkType(value, fieldSchema.type);
      if (!typeValid) {
        fieldErrors.push(`${field} must be of type ${fieldSchema.type}`);
      }
    }

    // Custom validators
    if (fieldSchema.validators) {
      for (const validator of fieldSchema.validators) {
        const result = validator(value);
        if (!result.valid) {
          fieldErrors.push(...result.errors);
        }
      }
    }

    // Nested object schema
    if (fieldSchema.schema && isObject(value)) {
      const nestedResult = validateSchema(
        value,
        fieldSchema.schema
      );
      if (!nestedResult.valid) {
        for (const [nestedField, nestedErrors] of Object.entries(nestedResult.errors)) {
          errors[`${field}.${nestedField}`] = nestedErrors;
        }
      }
    }

    // Array item schema
    if (fieldSchema.items !== undefined && isArray(value)) {
      (value).forEach((item, index) => {
        if (fieldSchema.items?.type !== undefined && !checkType(item, fieldSchema.items.type)) {
          const key = `${field}[${index}]`;
          errors[key] = errors[key] ?? [];
          if (fieldSchema.items?.type !== undefined) {
            errors[key].push(`Item must be of type ${fieldSchema.items.type}`);
          }
        }
      });
    }

    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Check if value matches expected type.
 */
function checkType(value: unknown, type: string): boolean {
  switch (type) {
    case 'string':
      return isString(value);
    case 'number':
      return isFiniteNumber(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return isArray(value);
    case 'object':
      return isObject(value);
    case 'date':
      return value instanceof Date && !isNaN(value.getTime());
    default:
      return true;
  }
}

// =============================================================================
// Input Sanitization
// =============================================================================

/**
 * Trim and normalize whitespace in string.
 */
export function sanitizeString(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/**
 * Remove HTML tags from string.
 */
export function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '');
}

/**
 * Escape HTML entities.
 */
export function escapeHtml(value: string): string {
  const entities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return value.replace(/[&<>"']/g, (char) => entities[char] ?? char);
}

/**
 * Normalize email to lowercase.
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Normalize phone number to digits only.
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Create a URL-safe slug from string.
 */
export function createSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
