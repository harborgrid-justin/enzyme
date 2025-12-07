/**
 * @file Validation Extension
 * @description Comprehensive validation extension for Enzyme using Zod
 *
 * Features:
 * - Schema Registry for reusable validation schemas
 * - Input Validation with Zod schemas
 * - State Validation for state management
 * - API Response Validation
 * - Config Validation
 * - Form Validation with React Hook Form integration
 * - Custom Validator system
 * - Validation Caching for performance
 * - Error Formatting for UI display
 * - Async Validation support
 *
 * @module extensions/built-in/validation
 *
 * @example
 * ```typescript
 * import { validationExtension } from '@/lib/extensions/built-in/validation';
 * import { z } from 'zod';
 *
 * // Register schemas
 * validationExtension.client.$registerSchema('user', z.object({
 *   id: z.string().uuid(),
 *   email: z.string().email(),
 *   age: z.number().min(0).optional(),
 * }));
 *
 * // Validate data
 * const result = await validationExtension.client.$validate('user', data);
 *
 * // Use in React component
 * const { values, errors, handleSubmit } = useFormValidation(userSchema);
 * ```
 */

import { z, type ZodSchema, type ZodError, type ZodType } from 'zod';
import { useState, useCallback, useRef, useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

/**
 * Validation result structure
 */
export interface ValidationResult<T = unknown> {
  success: boolean;
  data?: T;
  errors?: FormattedValidationError[];
}

/**
 * Formatted validation error for UI display
 */
export interface FormattedValidationError {
  path: string;
  message: string;
  code: string;
  params?: Record<string, unknown>;
}

/**
 * Custom validator function
 */
export type CustomValidator<T = unknown> = (
  value: T,
  context?: ValidationContext
) => Promise<ValidationResult<T>> | ValidationResult<T>;

/**
 * Validation context for custom validators
 */
export interface ValidationContext {
  path: string[];
  data: Record<string, unknown>;
  abortSignal?: AbortSignal;
}

/**
 * Cache entry for validation results
 */
interface CacheEntry<T> {
  result: ValidationResult<T>;
  timestamp: number;
  hash: string;
}

/**
 * Form field state
 */
export interface FieldState<T = unknown> {
  value: T;
  error?: string;
  touched: boolean;
  dirty: boolean;
  validating: boolean;
}

/**
 * Form validation options
 */
export interface FormValidationOptions {
  mode?: 'onChange' | 'onBlur' | 'onSubmit';
  revalidateMode?: 'onChange' | 'onBlur';
  shouldFocusError?: boolean;
  criteriaMode?: 'firstError' | 'all';
}

/**
 * State validation configuration
 */
export interface StateValidationConfig {
  schema: ZodSchema;
  onError?: (errors: FormattedValidationError[]) => void;
  strict?: boolean;
}

// ============================================================================
// Schema Registry
// ============================================================================

/**
 * Global schema registry for reusable validation schemas
 */
class SchemaRegistry {
  private schemas = new Map<string, ZodSchema>();
  private metadata = new Map<string, { description?: string; version?: string }>();

  /**
   * Register a named schema
   */
  register(name: string, schema: ZodSchema, metadata?: { description?: string; version?: string }): void {
    if (this.schemas.has(name)) {
      console.warn(`[Validation] Overwriting existing schema: ${name}`);
    }
    this.schemas.set(name, schema);
    if (metadata) {
      this.metadata.set(name, metadata);
    }
  }

  /**
   * Get schema by name
   */
  get(name: string): ZodSchema | undefined {
    return this.schemas.get(name);
  }

  /**
   * Check if schema exists
   */
  has(name: string): boolean {
    return this.schemas.has(name);
  }

  /**
   * Remove schema
   */
  unregister(name: string): boolean {
    this.metadata.delete(name);
    return this.schemas.delete(name);
  }

  /**
   * Get all registered schema names
   */
  list(): string[] {
    return Array.from(this.schemas.keys());
  }

  /**
   * Get schema metadata
   */
  getMetadata(name: string): { description?: string; version?: string } | undefined {
    return this.metadata.get(name);
  }

  /**
   * Clear all schemas
   */
  clear(): void {
    this.schemas.clear();
    this.metadata.clear();
  }
}

const schemaRegistry = new SchemaRegistry();

// ============================================================================
// Custom Validator Registry
// ============================================================================

/**
 * Registry for custom validators
 */
class CustomValidatorRegistry {
  private validators = new Map<string, CustomValidator>();

  /**
   * Register a custom validator
   */
  register<T = unknown>(name: string, validator: CustomValidator<T>): void {
    if (this.validators.has(name)) {
      console.warn(`[Validation] Overwriting existing validator: ${name}`);
    }
    this.validators.set(name, validator as CustomValidator);
  }

  /**
   * Get validator by name
   */
  get(name: string): CustomValidator | undefined {
    return this.validators.get(name);
  }

  /**
   * Execute validator
   */
  async execute<T>(name: string, value: T, context?: ValidationContext): Promise<ValidationResult<T>> {
    const validator = this.validators.get(name);
    if (!validator) {
      return {
        success: false,
        errors: [{ path: '', message: `Validator "${name}" not found`, code: 'validator_not_found' }],
      };
    }

    try {
      return await validator(value, context) as ValidationResult<T>;
    } catch (error) {
      return {
        success: false,
        errors: [{
          path: '',
          message: error instanceof Error ? error.message : 'Validation failed',
          code: 'validator_error',
        }],
      };
    }
  }

  /**
   * Remove validator
   */
  unregister(name: string): boolean {
    return this.validators.delete(name);
  }

  /**
   * List all validators
   */
  list(): string[] {
    return Array.from(this.validators.keys());
  }
}

const customValidatorRegistry = new CustomValidatorRegistry();

// ============================================================================
// Validation Cache
// ============================================================================

/**
 * LRU cache for validation results
 */
class ValidationCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private maxSize = 100;
  private ttl = 5 * 60 * 1000; // 5 minutes

  /**
   * Generate cache key from schema name and data
   */
  private generateKey(schemaName: string, data: unknown): string {
    return `${schemaName}:${this.hash(data)}`;
  }

  /**
   * Simple hash function for data
   */
  private hash(data: unknown): string {
    return JSON.stringify(data);
  }

  /**
   * Get cached result
   */
  get<T>(schemaName: string, data: unknown): ValidationResult<T> | null {
    const key = this.generateKey(schemaName, data);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if entry is expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.result as ValidationResult<T>;
  }

  /**
   * Set cache entry
   */
  set<T>(schemaName: string, data: unknown, result: ValidationResult<T>): void {
    const key = this.generateKey(schemaName, data);

    // Implement LRU eviction
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      hash: this.hash(data),
    });
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Configure cache
   */
  configure(options: { maxSize?: number; ttl?: number }): void {
    if (options.maxSize !== undefined) this.maxSize = options.maxSize;
    if (options.ttl !== undefined) this.ttl = options.ttl;
  }
}

const validationCache = new ValidationCache();

// ============================================================================
// Error Formatting
// ============================================================================

/**
 * Format Zod errors for UI display
 */
export function formatZodErrors(error: ZodError): FormattedValidationError[] {
  return error.issues.map((err) => ({
    path: err.path.join('.'),
    message: err.message,
    code: err.code,
    params: err as unknown as Record<string, unknown>,
  }));
}

/**
 * Format errors for React Hook Form
 */
export function formatErrorsForForm(errors: FormattedValidationError[]): Record<string, { message: string }> {
  const formatted: Record<string, { message: string }> = {};

  for (const error of errors) {
    const path = error.path || '_root';
    formatted[path] = { message: error.message };
  }

  return formatted;
}

/**
 * Get first error message for a field
 */
export function getFieldError(errors: FormattedValidationError[], fieldPath: string): string | undefined {
  const error = errors.find((e) => e.path === fieldPath);
  return error?.message;
}

/**
 * Group errors by field path
 */
export function groupErrorsByField(errors: FormattedValidationError[]): Record<string, FormattedValidationError[]> {
  const grouped: Record<string, FormattedValidationError[]> = {};

  for (const error of errors) {
    const path = error.path || '_root';
    if (!grouped[path]) {
      grouped[path] = [];
    }
    grouped[path].push(error);
  }

  return grouped;
}

// ============================================================================
// Core Validation Functions
// ============================================================================

/**
 * Validate data against a registered schema
 */
export async function validateWithSchema<T>(
  schemaName: string,
  data: unknown,
  options?: { useCache?: boolean; abortSignal?: AbortSignal }
): Promise<ValidationResult<T>> {
  const { useCache = true, abortSignal } = options ?? {};

  // Check cache
  if (useCache) {
    const cached = validationCache.get<T>(schemaName, data);
    if (cached) return cached;
  }

  // Get schema
  const schema = schemaRegistry.get(schemaName);
  if (!schema) {
    return {
      success: false,
      errors: [{
        path: '',
        message: `Schema "${schemaName}" not found`,
        code: 'schema_not_found',
      }],
    };
  }

  // Check abort signal
  if (abortSignal?.aborted) {
    return {
      success: false,
      errors: [{ path: '', message: 'Validation aborted', code: 'aborted' }],
    };
  }

  // Validate
  try {
    const result = await schema.parseAsync(data);
    const validationResult: ValidationResult<T> = {
      success: true,
      data: result as T,
    };

    // Cache result
    if (useCache) {
      validationCache.set(schemaName, data, validationResult);
    }

    return validationResult;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationResult: ValidationResult<T> = {
        success: false,
        errors: formatZodErrors(error),
      };

      // Cache result
      if (useCache) {
        validationCache.set(schemaName, data, validationResult);
      }

      return validationResult;
    }

    return {
      success: false,
      errors: [{
        path: '',
        message: error instanceof Error ? error.message : 'Validation failed',
        code: 'unknown_error',
      }],
    };
  }
}

/**
 * Validate data with direct schema
 */
export async function validate<T>(
  schema: ZodSchema<T>,
  data: unknown
): Promise<ValidationResult<T>> {
  try {
    const result = await schema.parseAsync(data);
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: formatZodErrors(error),
      };
    }

    return {
      success: false,
      errors: [{
        path: '',
        message: error instanceof Error ? error.message : 'Validation failed',
        code: 'unknown_error',
      }],
    };
  }
}

/**
 * Validate API response
 */
export async function validateApiResponse<T>(
  schema: ZodSchema<T>,
  response: unknown,
  options?: { strict?: boolean }
): Promise<ValidationResult<T>> {
  const { strict = false } = options ?? {};

  // In strict mode, fail on unknown fields
  const validationSchema = strict && schema instanceof z.ZodObject
    ? schema.strict()
    : schema;

  return validate(validationSchema as ZodSchema<T>, response);
}

/**
 * Validate state change
 */
export function validateStateChange<T>(
  currentState: T,
  updates: Partial<T>,
  schema: ZodSchema<T>
): ValidationResult<T> {
  const newState = { ...currentState, ...updates };
  const result = schema.safeParse(newState);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    errors: formatZodErrors(result.error),
  };
}

// ============================================================================
// React Hooks
// ============================================================================

/**
 * Form validation hook with comprehensive field management
 */
export function useFormValidation<T extends Record<string, unknown>>(
  schema: ZodSchema<T>,
  options?: FormValidationOptions
) {
  const {
    mode = 'onSubmit',
    revalidateMode = 'onChange',
    shouldFocusError = true,
  } = options ?? {};

  const [values, setValues] = useState<Partial<T>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);

  const validationRef = useRef<AbortController | null>(null);
  const shouldValidate = useRef(mode === 'onChange');

  /**
   * Validate form data
   */
  const validateForm = useCallback(async (data: Partial<T>): Promise<boolean> => {
    // Cancel previous validation
    if (validationRef.current) {
      validationRef.current.abort();
    }

    validationRef.current = new AbortController();
    setIsValidating(true);

    try {
      await schema.parseAsync(data);
      setErrors({});
      setIsValidating(false);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = formatErrorsForForm(formatZodErrors(error));
        const errorMap: Record<string, string> = {};

        for (const [key, value] of Object.entries(formattedErrors)) {
          errorMap[key] = value.message;
        }

        setErrors(errorMap);

        // Focus first error field
        if (shouldFocusError && Object.keys(errorMap).length > 0) {
          const firstErrorField = Object.keys(errorMap)[0];
          const element = document.querySelector(`[name="${firstErrorField}"]`) as HTMLElement;
          element?.focus();
        }
      }

      setIsValidating(false);
      return false;
    }
  }, [schema, shouldFocusError]);

  /**
   * Validate single field
   */
  const validateField = useCallback(async (name: keyof T, value: unknown): Promise<boolean> => {
    try {
      const fieldSchema = schema instanceof z.ZodObject
        ? schema.shape[name as string]
        : null;

      if (!fieldSchema) return true;

      await (fieldSchema as ZodType).parseAsync(value);
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name as string];
        return newErrors;
      });
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors((prev) => ({
          ...prev,
          [name as string]: formatZodErrors(error)[0]?.message || 'Validation error',
        }));
      }
      return false;
    }
  }, [schema]);

  /**
   * Set field value
   */
  const setValue = useCallback((name: keyof T, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));

    if (shouldValidate.current || (submitCount > 0 && revalidateMode === 'onChange')) {
      void validateField(name, value);
    }
  }, [validateField, submitCount, revalidateMode]);

  /**
   * Set multiple values
   */
  const setFieldValues = useCallback((updates: Partial<T>) => {
    setValues((prev) => ({ ...prev, ...updates }));

    if (shouldValidate.current || (submitCount > 0 && revalidateMode === 'onChange')) {
      void validateForm({ ...values, ...updates });
    }
  }, [validateForm, values, submitCount, revalidateMode]);

  /**
   * Handle field blur
   */
  const handleBlur = useCallback((name: keyof T) => {
    setTouched((prev) => ({ ...prev, [name as string]: true }));

    if (mode === 'onBlur' || (submitCount > 0 && revalidateMode === 'onBlur')) {
      void validateField(name, values[name]);
    }
  }, [mode, validateField, values, submitCount, revalidateMode]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback((onSubmit: (data: T) => void | Promise<void>) => {
    return async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }

      setIsSubmitting(true);
      setSubmitCount((prev) => prev + 1);
      shouldValidate.current = true;

      const isValid = await validateForm(values);

      if (isValid) {
        try {
          await onSubmit(values as T);
        } catch (error) {
          console.error('[Validation] Submit error:', error);
        }
      }

      setIsSubmitting(false);
    };
  }, [validateForm, values]);

  /**
   * Reset form
   */
  const reset = useCallback((newValues?: Partial<T>) => {
    setValues(newValues ?? {});
    setErrors({});
    setTouched({});
    setSubmitCount(0);
    shouldValidate.current = mode === 'onChange';
  }, [mode]);

  /**
   * Register field
   */
  const register = useCallback((name: keyof T) => {
    return {
      name: name as string,
      value: values[name] ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(name, e.target.value);
      },
      onBlur: () => handleBlur(name),
      error: errors[name as string],
      touched: touched[name as string] ?? false,
    };
  }, [values, errors, touched, setValue, handleBlur]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (validationRef.current) {
        validationRef.current.abort();
      }
    };
  }, []);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValidating,
    submitCount,
    isValid: Object.keys(errors).length === 0,
    setValue,
    setFieldValues,
    handleBlur,
    handleSubmit,
    validateForm,
    validateField,
    reset,
    register,
  };
}

/**
 * Single field validation hook
 */
export function useFieldValidation<T>(
  _name: string,
  schema: ZodType<T>,
  options?: {
    defaultValue?: T;
    validateOn?: 'change' | 'blur' | 'both';
    debounceMs?: number;
  }
) {
  const { defaultValue, validateOn = 'both', debounceMs = 300 } = options ?? {};

  const [value, setValue] = useState<T | undefined>(defaultValue);
  const [error, setError] = useState<string>();
  const [touched, setTouched] = useState(false);
  const [validating, setValidating] = useState(false);

  const debounceTimer = useRef<NodeJS.Timeout>(undefined);
  const abortController = useRef<AbortController>(undefined);

  const validateValue = useCallback(async (val: T | undefined) => {
    // Cancel previous validation
    if (abortController.current) {
      abortController.current.abort();
    }

    abortController.current = new AbortController();
    setValidating(true);

    try {
      await schema.parseAsync(val);
      setError(undefined);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(formatZodErrors(err)[0]?.message);
      }
    } finally {
      setValidating(false);
    }
  }, [schema]);

  const handleChange = useCallback((newValue: T) => {
    setValue(newValue);
    setTouched(true);

    if (validateOn === 'change' || validateOn === 'both') {
      // Debounce validation
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      debounceTimer.current = setTimeout(() => {
        void validateValue(newValue);
      }, debounceMs);
    }
  }, [validateValue, validateOn, debounceMs]);

  const handleBlur = useCallback(() => {
    setTouched(true);

    if (validateOn === 'blur' || validateOn === 'both') {
      void validateValue(value);
    }
  }, [validateValue, validateOn, value]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  return {
    value,
    error,
    touched,
    validating,
    setValue: handleChange,
    onBlur: handleBlur,
    reset: () => {
      setValue(defaultValue);
      setError(undefined);
      setTouched(false);
    },
  };
}

// ============================================================================
// Async Validation Utilities
// ============================================================================

/**
 * Create async validator with debouncing
 */
export function createAsyncValidator<T>(
  validatorFn: (value: T) => Promise<boolean | string>,
  options?: { debounceMs?: number; cacheResults?: boolean }
) {
  const { debounceMs = 300, cacheResults = true } = options ?? {};
  const cache = new Map<string, boolean | string>();
  let timer: NodeJS.Timeout;

  return async (value: T): Promise<ValidationResult<T>> => {
    return new Promise((resolve) => {
      clearTimeout(timer);

      timer = setTimeout(async () => {
        const cacheKey = JSON.stringify(value);

        // Check cache
        if (cacheResults && cache.has(cacheKey)) {
          const cached = cache.get(cacheKey);
          if (cached === true) {
            resolve({ success: true, data: value });
          } else {
            resolve({
              success: false,
              errors: [{ path: '', message: cached as string, code: 'async_validation_failed' }],
            });
          }
          return;
        }

        // Execute validator
        try {
          const result = await validatorFn(value);

          if (cacheResults) {
            cache.set(cacheKey, result);
          }

          if (result === true) {
            resolve({ success: true, data: value });
          } else {
            resolve({
              success: false,
              errors: [{ path: '', message: typeof result === 'string' ? result : 'Validation failed', code: 'async_validation_failed' }],
            });
          }
        } catch (error) {
          resolve({
            success: false,
            errors: [{
              path: '',
              message: error instanceof Error ? error.message : 'Validation failed',
              code: 'async_validation_error',
            }],
          });
        }
      }, debounceMs);
    });
  };
}

/**
 * Check uniqueness (e.g., email, username)
 */
export function createUniquenessValidator<T>(
  checkFn: (value: T) => Promise<boolean>,
  message = 'This value is already taken'
): CustomValidator<T> {
  return createAsyncValidator(async (value: T) => {
    const isUnique = await checkFn(value);
    return isUnique || message;
  }, { debounceMs: 500, cacheResults: true });
}

// ============================================================================
// Common Schema Presets
// ============================================================================

/**
 * Common validation schemas
 */
export const commonSchemas = {
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  url: z.string().url('Invalid URL'),
  uuid: z.string().uuid('Invalid UUID'),
  phone: z.string().regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/, 'Invalid phone number'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format'),
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, 'Invalid username'),
  positiveNumber: z.number().positive('Must be a positive number'),
  percentage: z.number().min(0).max(100, 'Must be between 0 and 100'),
  dateString: z.string().datetime('Invalid date format'),
};

// ============================================================================
// Extension Definition
// ============================================================================

/**
 * Enzyme Validation Extension
 */
export const validationExtension = {
  name: 'enzyme:validation',
  version: '2.0.0',
  description: 'Comprehensive validation system using Zod with caching, async support, and React hooks',

  client: {
    /**
     * Register a named schema
     */
    $registerSchema(name: string, schema: ZodSchema, metadata?: { description?: string; version?: string }): void {
      schemaRegistry.register(name, schema, metadata);
    },

    /**
     * Validate data against registered schema
     */
    async $validate<T>(schemaName: string, data: unknown, options?: { useCache?: boolean }): Promise<ValidationResult<T>> {
      return validateWithSchema<T>(schemaName, data, options);
    },

    /**
     * Validate with direct schema
     */
    async $validateAsync<T>(schema: ZodSchema<T>, data: unknown): Promise<ValidationResult<T>> {
      return validate(schema, data);
    },

    /**
     * Get validation errors formatted for display
     */
    $getValidationErrors(result: ValidationResult): FormattedValidationError[] {
      return result.errors ?? [];
    },

    /**
     * Format errors for form display
     */
    $formatErrorsForForm(errors: FormattedValidationError[]): Record<string, { message: string }> {
      return formatErrorsForForm(errors);
    },

    /**
     * Create form validator
     */
    $createFormValidator<T extends Record<string, unknown>>(schema: ZodSchema<T>, options?: FormValidationOptions) {
      return {
        schema,
        options,
        validate: (data: Partial<T>) => validate(schema, data),
      };
    },

    /**
     * Add custom validator
     */
    $addCustomValidator<T = unknown>(name: string, validator: CustomValidator<T>): void {
      customValidatorRegistry.register(name, validator);
    },

    /**
     * Execute custom validator
     */
    async $executeValidator<T>(name: string, value: T, context?: ValidationContext): Promise<ValidationResult<T>> {
      return customValidatorRegistry.execute(name, value, context);
    },

    /**
     * Validate API response
     */
    async $validateApiResponse<T>(schema: ZodSchema<T>, response: unknown, options?: { strict?: boolean }): Promise<ValidationResult<T>> {
      return validateApiResponse(schema, response, options);
    },

    /**
     * Validate state change
     */
    $validateStateChange<T>(currentState: T, updates: Partial<T>, schema: ZodSchema<T>): ValidationResult<T> {
      return validateStateChange(currentState, updates, schema);
    },

    /**
     * Configure validation cache
     */
    $configureCache(options: { maxSize?: number; ttl?: number }): void {
      validationCache.configure(options);
    },

    /**
     * Clear validation cache
     */
    $clearCache(): void {
      validationCache.clear();
    },

    /**
     * Get registered schemas
     */
    $listSchemas(): string[] {
      return schemaRegistry.list();
    },

    /**
     * Get schema by name
     */
    $getSchema(name: string): ZodSchema | undefined {
      return schemaRegistry.get(name);
    },

    /**
     * Common validation schemas
     */
    $commonSchemas: commonSchemas,
  },
};

// Default export
export default validationExtension;
