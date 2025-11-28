/**
 * @file Form Validator
 * @description Production-grade form validation with field-level tracking,
 * async validation, validation modes, and React integration.
 *
 * Features:
 * - Field-level validation with error tracking
 * - Multiple validation modes (onChange, onBlur, onSubmit)
 * - Async validation with debouncing
 * - Cross-field validation (dependent fields)
 * - Touch and dirty state tracking
 * - Schema integration
 *
 * @example
 * ```typescript
 * import { createFormValidator, useFormValidation } from '@/lib/data/validation';
 *
 * const validator = createFormValidator({
 *   email: [required(), email()],
 *   password: [required(), minLength(8)],
 *   confirmPassword: [required(), matches('password')],
 * });
 *
 * // In component
 * const { validate, errors, isValid } = useFormValidation(validator);
 * ```
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import type { BaseSchema, Infer } from './schema-validator';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Field validation rule function
 */
export type FieldRule<T = unknown> = (
  value: T,
  formData: Record<string, unknown>,
  fieldName: string
) => string | undefined | Promise<string | undefined>;

/**
 * Field validation configuration
 */
export interface FieldConfig<T = unknown> {
  /** Validation rules */
  rules: FieldRule<T>[];
  /** Async validation debounce delay (ms) */
  debounce?: number;
  /** Dependencies for cross-field validation */
  dependsOn?: string[];
  /** Custom transform before validation */
  transform?: (value: unknown) => T;
  /** When to validate */
  validateOn?: ('change' | 'blur' | 'submit')[];
}

/**
 * Form validation configuration
 */
export type FormConfig<T extends Record<string, unknown>> = {
  [K in keyof T]?: FieldRule<T[K]>[] | FieldConfig<T[K]>;
};

/**
 * Field error state
 */
export interface FieldError {
  message: string;
  rule?: string;
}

/**
 * Field state
 */
export interface FieldState {
  /** Current value */
  value: unknown;
  /** Field errors */
  errors: FieldError[];
  /** Field has been touched (focused then blurred) */
  touched: boolean;
  /** Field value has changed from initial */
  dirty: boolean;
  /** Field is currently being validated */
  validating: boolean;
  /** Field is valid (no errors and has been validated) */
  valid: boolean;
}

/**
 * Form state
 */
export interface FormState<T extends Record<string, unknown>> {
  /** Field states */
  fields: { [K in keyof T]: FieldState };
  /** Form-level errors */
  errors: FieldError[];
  /** Any async validation in progress */
  validating: boolean;
  /** Form has been touched */
  touched: boolean;
  /** Form values have changed */
  dirty: boolean;
  /** Form is valid */
  valid: boolean;
  /** Form has been submitted */
  submitted: boolean;
  /** Submit attempt count */
  submitCount: number;
}

/**
 * Validation mode
 */
export type ValidationMode = 'onChange' | 'onBlur' | 'onSubmit' | 'all';

/**
 * Form validator options
 */
export interface FormValidatorOptions {
  /** Primary validation mode */
  mode?: ValidationMode;
  /** Revalidate mode after first submit */
  revalidateMode?: 'onChange' | 'onBlur';
  /** Validate all fields on mount */
  validateOnMount?: boolean;
  /** Show errors only after first submit */
  showErrorsAfterSubmit?: boolean;
  /** Debounce time for async validation */
  debounceMs?: number;
  /** Abort validation on unmount */
  abortOnUnmount?: boolean;
}

/**
 * Form validator instance
 */
export interface FormValidator<T extends Record<string, unknown>> {
  /** Validate a single field */
  validateField: (field: keyof T, value: unknown, formData: T) => Promise<FieldError[]>;
  /** Validate all fields */
  validateAll: (formData: T) => Promise<{ valid: boolean; errors: Record<keyof T, FieldError[]> }>;
  /** Get field configuration */
  getFieldConfig: (field: keyof T) => FieldConfig<T[keyof T]> | undefined;
  /** Check if field has async rules */
  hasAsyncRules: (field: keyof T) => boolean;
}

// =============================================================================
// VALIDATION RULES
// =============================================================================

/**
 * Create a required field rule
 */
export function required(message = 'This field is required'): FieldRule {
  return (value) => {
    if (value === undefined || value === null || value === '') {
      return message;
    }
    if (Array.isArray(value) && value.length === 0) {
      return message;
    }
    return undefined;
  };
}

/**
 * Create a minimum length rule
 */
export function minLength(length: number, message?: string): FieldRule<string> {
  return (value) => {
    if (typeof value !== 'string') return undefined;
    if (value.length < length) {
      return message || `Must be at least ${length} characters`;
    }
    return undefined;
  };
}

/**
 * Create a maximum length rule
 */
export function maxLength(length: number, message?: string): FieldRule<string> {
  return (value) => {
    if (typeof value !== 'string') return undefined;
    if (value.length > length) {
      return message || `Must be at most ${length} characters`;
    }
    return undefined;
  };
}

/**
 * Create a minimum value rule
 */
export function min(minValue: number, message?: string): FieldRule<number> {
  return (value) => {
    if (typeof value !== 'number') return undefined;
    if (value < minValue) {
      return message || `Must be at least ${minValue}`;
    }
    return undefined;
  };
}

/**
 * Create a maximum value rule
 */
export function max(maxValue: number, message?: string): FieldRule<number> {
  return (value) => {
    if (typeof value !== 'number') return undefined;
    if (value > maxValue) {
      return message || `Must be at most ${maxValue}`;
    }
    return undefined;
  };
}

/**
 * Create a pattern matching rule
 */
export function pattern(regex: RegExp, message = 'Invalid format'): FieldRule<string> {
  return (value) => {
    if (typeof value !== 'string' || value === '') return undefined;
    if (!regex.test(value)) {
      return message;
    }
    return undefined;
  };
}

/**
 * Create an email validation rule
 */
export function email(message = 'Invalid email address'): FieldRule<string> {
  return pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, message);
}

/**
 * Create a URL validation rule
 */
export function url(message = 'Invalid URL'): FieldRule<string> {
  return (value) => {
    if (typeof value !== 'string' || value === '') return undefined;
    try {
      new URL(value);
      return undefined;
    } catch {
      return message;
    }
  };
}

/**
 * Create a matches (confirm) rule
 */
export function matches(fieldName: string, message?: string): FieldRule {
  return (value, formData) => {
    if (value !== formData[fieldName]) {
      return message || `Must match ${fieldName}`;
    }
    return undefined;
  };
}

/**
 * Create a custom validation rule
 */
export function custom<T>(
  validator: (value: T, formData: Record<string, unknown>) => boolean | string,
  message = 'Validation failed'
): FieldRule<T> {
  return (value, formData) => {
    const result = validator(value, formData);
    if (result === false) {
      return message;
    }
    if (typeof result === 'string') {
      return result;
    }
    return undefined;
  };
}

/**
 * Create an async validation rule
 */
export function asyncRule<T>(
  validator: (value: T, formData: Record<string, unknown>) => Promise<string | undefined>,
  options?: { debounce?: number }
): FieldRule<T> & { _async: true; _debounce?: number } {
  const rule = validator as unknown as FieldRule<T> & { _async: true; _debounce?: number };
  rule._async = true;
  rule._debounce = options?.debounce;
  return rule;
}

/**
 * Create a schema validation rule
 */
export function schema<T extends BaseSchema<unknown>>(
  schemaInstance: T,
  message?: string
): FieldRule<Infer<T>> {
  return (value) => {
    const result = schemaInstance.safeParse(value);
    if (!result.success) {
      return message || result.issues[0]?.message || 'Validation failed';
    }
    return undefined;
  };
}

/**
 * Create a conditional rule
 */
export function when<T>(
  condition: (formData: Record<string, unknown>) => boolean,
  rules: FieldRule<T>[]
): FieldRule<T> {
  return async (value, formData, fieldName) => {
    if (!condition(formData)) {
      return undefined;
    }
    for (const rule of rules) {
      const error = await rule(value, formData, fieldName);
      if (error) return error;
    }
    return undefined;
  };
}

// =============================================================================
// FORM VALIDATOR FACTORY
// =============================================================================

/**
 * Normalize field configuration
 */
function normalizeFieldConfig<T>(
  config: FieldRule<T>[] | FieldConfig<T>
): FieldConfig<T> {
  if (Array.isArray(config)) {
    return { rules: config };
  }
  return config;
}

/**
 * Check if rule is async
 */
function isAsyncRule(rule: FieldRule): boolean {
  return '_async' in rule && rule._async === true;
}

/**
 * Create a form validator
 */
export function createFormValidator<T extends Record<string, unknown>>(
  config: FormConfig<T>
): FormValidator<T> {
  const fieldConfigs = new Map<keyof T, FieldConfig<T[keyof T]>>();

  // Normalize all field configs
  for (const [field, fieldConfig] of Object.entries(config)) {
    if (fieldConfig) {
      fieldConfigs.set(
        field as keyof T,
        normalizeFieldConfig(fieldConfig as FieldRule<T[keyof T]>[] | FieldConfig<T[keyof T]>)
      );
    }
  }

  return {
    validateField: async (field, value, formData) => {
      const fieldConfig = fieldConfigs.get(field);
      if (!fieldConfig) return [];

      const errors: FieldError[] = [];
      const transformedValue = fieldConfig.transform ? fieldConfig.transform(value) : value;

      for (const rule of fieldConfig.rules) {
        try {
          const error = await rule(
            transformedValue as T[keyof T],
            formData as Record<string, unknown>,
            String(field)
          );
          if (error) {
            errors.push({ message: error });
            // Stop on first error for field
            break;
          }
        } catch (err) {
          errors.push({
            message: err instanceof Error ? err.message : 'Validation error',
          });
        }
      }

      return errors;
    },

    validateAll: async (formData) => {
      const errors: Record<keyof T, FieldError[]> = {} as Record<keyof T, FieldError[]>;
      let valid = true;

      const validationPromises = Array.from(fieldConfigs.keys()).map(async (field) => {
        const fieldErrors = await validateField(field, formData[field], formData);
        errors[field] = fieldErrors;
        if (fieldErrors.length > 0) valid = false;
      });

      await Promise.all(validationPromises);

      return { valid, errors };

      async function validateField(
        field: keyof T,
        value: unknown,
        data: T
      ): Promise<FieldError[]> {
        const fieldConfig = fieldConfigs.get(field);
        if (!fieldConfig) return [];

        const errs: FieldError[] = [];
        const transformedValue = fieldConfig.transform ? fieldConfig.transform(value) : value;

        for (const rule of fieldConfig.rules) {
          try {
            const error = await rule(
              transformedValue as T[keyof T],
              data as Record<string, unknown>,
              String(field)
            );
            if (error) {
              errs.push({ message: error });
              break;
            }
          } catch (err) {
            errs.push({
              message: err instanceof Error ? err.message : 'Validation error',
            });
          }
        }

        return errs;
      }
    },

    getFieldConfig: (field) => fieldConfigs.get(field),

    hasAsyncRules: (field) => {
      const fieldConfig = fieldConfigs.get(field);
      if (!fieldConfig) return false;
      return fieldConfig.rules.some((rule) => isAsyncRule(rule));
    },
  };
}

// =============================================================================
// REACT HOOK
// =============================================================================

/**
 * Initial field state
 */
function createInitialFieldState(value: unknown): FieldState {
  return {
    value,
    errors: [],
    touched: false,
    dirty: false,
    validating: false,
    valid: true,
  };
}

/**
 * Form validation React hook
 */
export function useFormValidation<T extends Record<string, unknown>>(
  validator: FormValidator<T>,
  initialValues: T,
  options: FormValidatorOptions = {}
) {
  const {
    mode = 'onSubmit',
    revalidateMode = 'onChange',
    validateOnMount = false,
    showErrorsAfterSubmit = false,
    debounceMs = 300,
  } = options;

  // Initialize field states
  const initialFieldStates = useMemo(() => {
    const states: Record<string, FieldState> = {};
    for (const [key, value] of Object.entries(initialValues)) {
      states[key] = createInitialFieldState(value);
    }
    return states as { [K in keyof T]: FieldState };
  }, [initialValues]);

  // State
  const [fieldStates, setFieldStates] = useState(initialFieldStates);
  const [formErrors, setFormErrors] = useState<FieldError[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);
  const [isValidating, setIsValidating] = useState(false);

  // Refs for debouncing
  const debounceTimers = useRef<Map<keyof T, ReturnType<typeof setTimeout>>>(new Map());
  const abortControllers = useRef<Map<keyof T, AbortController>>(new Map());

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debounceTimers.current.forEach((timer) => clearTimeout(timer));
      abortControllers.current.forEach((controller) => controller.abort());
    };
  }, []);

  // Validate on mount if configured
  useEffect(() => {
    if (validateOnMount) {
      validateAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get current form values
  const getValues = useCallback((): T => {
    const values: Record<string, unknown> = {};
    for (const [key, state] of Object.entries(fieldStates)) {
      values[key] = state.value;
    }
    return values as T;
  }, [fieldStates]);

  // Validate a single field
  const validateField = useCallback(
    async (field: keyof T, value?: unknown): Promise<FieldError[]> => {
      const currentValue = value ?? fieldStates[field as string]?.value;
      const formData = getValues();

      // Cancel any pending validation
      const existingController = abortControllers.current.get(field);
      if (existingController) {
        existingController.abort();
      }

      const controller = new AbortController();
      abortControllers.current.set(field, controller);

      setFieldStates((prev) => ({
        ...prev,
        [field]: { ...prev[field as string], validating: true },
      }));

      try {
        const errors = await validator.validateField(field, currentValue, formData);

        if (controller.signal.aborted) return [];

        setFieldStates((prev) => ({
          ...prev,
          [field]: {
            ...prev[field as string],
            errors,
            validating: false,
            valid: errors.length === 0,
          },
        }));

        return errors;
      } finally {
        abortControllers.current.delete(field);
      }
    },
    [fieldStates, getValues, validator]
  );

  // Validate all fields
  const validateAll = useCallback(async (): Promise<boolean> => {
    setIsValidating(true);

    try {
      const { valid, errors } = await validator.validateAll(getValues());

      setFieldStates((prev) => {
        const newStates = { ...prev } as Record<string, FieldState>;
        for (const [field, fieldErrors] of Object.entries(errors)) {
          newStates[field] = {
            ...newStates[field],
            errors: fieldErrors as FieldError[],
            validating: false,
            valid: (fieldErrors as FieldError[]).length === 0,
          };
        }
        return newStates as { [K in keyof T]: FieldState };
      });

      return valid;
    } finally {
      setIsValidating(false);
    }
  }, [getValues, validator]);

  // Should validate based on mode
  const shouldValidate = useCallback(
    (trigger: 'change' | 'blur' | 'submit'): boolean => {
      if (mode === 'all') return true;
      if (mode === `on${trigger.charAt(0).toUpperCase()}${trigger.slice(1)}`) return true;
      if (isSubmitted && revalidateMode === `on${trigger.charAt(0).toUpperCase()}${trigger.slice(1)}`) {
        return true;
      }
      return false;
    },
    [mode, revalidateMode, isSubmitted]
  );

  // Set field value
  const setValue = useCallback(
    (field: keyof T, value: unknown, options?: { shouldValidate?: boolean }) => {
      setFieldStates((prev) => ({
        ...prev,
        [field]: {
          ...prev[field as string],
          value,
          dirty: true,
        },
      }));

      const shouldVal = options?.shouldValidate ?? shouldValidate('change');

      if (shouldVal) {
        // Clear existing debounce
        const existingTimer = debounceTimers.current.get(field);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }

        // Debounce validation
        if (validator.hasAsyncRules(field)) {
          const timer = setTimeout(() => {
            validateField(field, value);
          }, debounceMs);
          debounceTimers.current.set(field, timer);
        } else {
          validateField(field, value);
        }
      }
    },
    [shouldValidate, validator, validateField, debounceMs]
  );

  // Set multiple values
  const setValues = useCallback(
    (values: Partial<T>, options?: { shouldValidate?: boolean }) => {
      for (const [field, value] of Object.entries(values)) {
        setValue(field as keyof T, value, options);
      }
    },
    [setValue]
  );

  // Mark field as touched
  const setTouched = useCallback(
    (field: keyof T, touched = true, options?: { shouldValidate?: boolean }) => {
      setFieldStates((prev) => ({
        ...prev,
        [field]: { ...prev[field as string], touched },
      }));

      const shouldVal = options?.shouldValidate ?? shouldValidate('blur');
      if (shouldVal && touched) {
        validateField(field);
      }
    },
    [shouldValidate, validateField]
  );

  // Handle blur
  const handleBlur = useCallback(
    (field: keyof T) => {
      setTouched(field, true);
    },
    [setTouched]
  );

  // Reset form
  const reset = useCallback(
    (values?: Partial<T>) => {
      const resetValues = values ? { ...initialValues, ...values } : initialValues;

      setFieldStates(() => {
        const states: Record<string, FieldState> = {};
        for (const [key, value] of Object.entries(resetValues)) {
          states[key] = createInitialFieldState(value);
        }
        return states as { [K in keyof T]: FieldState };
      });

      setFormErrors([]);
      setIsSubmitted(false);
    },
    [initialValues]
  );

  // Handle submit
  const handleSubmit = useCallback(
    (onSubmit: (values: T) => void | Promise<void>) => {
      return async (e?: React.FormEvent) => {
        if (e) {
          e.preventDefault();
        }

        setIsSubmitted(true);
        setSubmitCount((c) => c + 1);

        const isValid = await validateAll();

        if (isValid) {
          try {
            await onSubmit(getValues());
          } catch (error) {
            setFormErrors([
              {
                message: error instanceof Error ? error.message : 'Submit failed',
              },
            ]);
          }
        }
      };
    },
    [validateAll, getValues]
  );

  // Compute derived state
  const isValid = useMemo(() => {
    return Object.values(fieldStates).every((state) => (state as FieldState).valid);
  }, [fieldStates]);

  const isDirty = useMemo(() => {
    return Object.values(fieldStates).some((state) => (state as FieldState).dirty);
  }, [fieldStates]);

  const isTouched = useMemo(() => {
    return Object.values(fieldStates).some((state) => (state as FieldState).touched);
  }, [fieldStates]);

  // Get field errors (respects showErrorsAfterSubmit)
  const getFieldError = useCallback(
    (field: keyof T): string | undefined => {
      if (showErrorsAfterSubmit && !isSubmitted) {
        return undefined;
      }
      const state = fieldStates[field as string];
      return state?.errors[0]?.message;
    },
    [fieldStates, showErrorsAfterSubmit, isSubmitted]
  );

  // Get all errors
  const getAllErrors = useCallback((): Record<keyof T, string | undefined> => {
    const errors: Record<string, string | undefined> = {};
    for (const [field] of Object.entries(fieldStates)) {
      errors[field] = getFieldError(field as keyof T);
    }
    return errors as Record<keyof T, string | undefined>;
  }, [fieldStates, getFieldError]);

  // Register field helpers
  const register = useCallback(
    (field: keyof T) => {
      return {
        name: field as string,
        value: fieldStates[field as string]?.value ?? '',
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
          const value = e.target.type === 'checkbox'
            ? (e.target as HTMLInputElement).checked
            : e.target.value;
          setValue(field, value);
        },
        onBlur: () => handleBlur(field),
      };
    },
    [fieldStates, setValue, handleBlur]
  );

  return {
    // State
    values: getValues(),
    errors: getAllErrors(),
    fieldStates,
    formErrors,
    isValid,
    isDirty,
    isTouched,
    isSubmitted,
    isValidating,
    submitCount,

    // Actions
    setValue,
    setValues,
    setTouched,
    validateField,
    validateAll,
    reset,
    handleSubmit,
    handleBlur,
    register,

    // Helpers
    getFieldError,
    getValues,
  };
}

// =============================================================================
// FIELD WRAPPER HOOK
// =============================================================================

/**
 * Hook for individual field validation
 */
export function useField<T>(
  name: string,
  rules: FieldRule<T>[],
  options?: {
    defaultValue?: T;
    validateOnChange?: boolean;
    validateOnBlur?: boolean;
    debounceMs?: number;
  }
) {
  const {
    defaultValue,
    validateOnChange = true,
    validateOnBlur = true,
    debounceMs = 300,
  } = options ?? {};

  const [value, setValueState] = useState<T | undefined>(defaultValue);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [touched, setTouched] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [validating, setValidating] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  const validate = useCallback(
    async (val: T | undefined): Promise<FieldError[]> => {
      setValidating(true);
      const fieldErrors: FieldError[] = [];

      for (const rule of rules) {
        try {
          const error = await rule(val as T, {}, name);
          if (error) {
            fieldErrors.push({ message: error });
            break;
          }
        } catch (err) {
          fieldErrors.push({
            message: err instanceof Error ? err.message : 'Validation error',
          });
        }
      }

      setErrors(fieldErrors);
      setValidating(false);
      return fieldErrors;
    },
    [rules, name]
  );

  const setValue = useCallback(
    (newValue: T) => {
      setValueState(newValue);
      setDirty(true);

      if (validateOnChange) {
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
        }
        debounceTimer.current = setTimeout(() => {
          validate(newValue);
        }, debounceMs);
      }
    },
    [validateOnChange, validate, debounceMs]
  );

  const handleBlur = useCallback(() => {
    setTouched(true);
    if (validateOnBlur) {
      validate(value);
    }
  }, [validateOnBlur, validate, value]);

  const reset = useCallback((newValue?: T) => {
    setValueState(newValue ?? defaultValue);
    setErrors([]);
    setTouched(false);
    setDirty(false);
  }, [defaultValue]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    value,
    setValue,
    errors,
    touched,
    dirty,
    validating,
    isValid: errors.length === 0,
    validate: () => validate(value),
    handleBlur,
    reset,
    inputProps: {
      name,
      value: value ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value as T);
      },
      onBlur: handleBlur,
    },
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export const rules = {
  required,
  minLength,
  maxLength,
  min,
  max,
  pattern,
  email,
  url,
  matches,
  custom,
  async: asyncRule,
  schema,
  when,
} as const;
