/**
 * @file useDataValidation Hook
 * @description Comprehensive React hook for data validation with support for
 * schema validation, runtime checks, and form validation.
 *
 * Features:
 * - Schema-based validation with Zod-style API
 * - Runtime type checking
 * - Form validation with field-level control
 * - Async validation support
 * - Validation caching and debouncing
 *
 * @example
 * ```typescript
 * import { useDataValidation, v } from '@/lib/data';
 *
 * const userSchema = v.object({
 *   name: v.string().min(1),
 *   email: v.string().email(),
 *   age: v.number().min(18).optional(),
 * });
 *
 * function UserForm() {
 *   const {
 *     validate,
 *     isValid,
 *     errors,
 *     fieldErrors,
 *     validateField,
 *   } = useDataValidation(userSchema);
 *
 *   const handleSubmit = (data) => {
 *     const result = validate(data);
 *     if (result.success) {
 *       // Submit data
 *     }
 *   };
 * }
 * ```
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { Schema, ValidationResult, ValidationIssue } from '../validation/schema-validator';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Validation mode
 */
export type ValidationMode = 'onChange' | 'onBlur' | 'onSubmit' | 'all';

/**
 * Field error state
 */
export interface FieldErrors {
  [field: string]: string[];
}

/**
 * Validation state
 */
export interface ValidationState<T> {
  /** Whether validation has been performed */
  isDirty: boolean;
  /** Whether validation is in progress */
  isValidating: boolean;
  /** Whether data is valid */
  isValid: boolean;
  /** Last validated data */
  lastValidatedData: T | null;
  /** Validation errors */
  errors: ValidationIssue[];
  /** Field-level errors */
  fieldErrors: FieldErrors;
  /** Timestamp of last validation */
  lastValidatedAt: number | null;
}

/**
 * Validation hook options
 */
export interface UseDataValidationOptions<T> {
  /** Initial data */
  initialData?: T;
  /** Validation mode */
  mode?: ValidationMode;
  /** Debounce delay in ms */
  debounceMs?: number;
  /** Custom field extraction */
  getFieldValue?: (data: T, field: string) => unknown;
  /** Transform before validation */
  transformBeforeValidation?: (data: T) => T;
  /** Callback on validation success */
  onValid?: (data: T) => void;
  /** Callback on validation failure */
  onInvalid?: (errors: ValidationIssue[]) => void;
}

/**
 * Validation hook return type
 */
export interface UseDataValidationReturn<T> {
  /** Validate data */
  validate: (data: T) => ValidationResult<T>;
  /** Validate asynchronously */
  validateAsync: (data: T) => Promise<ValidationResult<T>>;
  /** Validate single field */
  validateField: (field: string, value: unknown) => ValidationResult<unknown>;
  /** Clear validation state */
  clearValidation: () => void;
  /** Reset to initial state */
  reset: () => void;
  /** Current validation state */
  state: ValidationState<T>;
  /** Whether data is valid */
  isValid: boolean;
  /** Whether validation is dirty */
  isDirty: boolean;
  /** Whether validating */
  isValidating: boolean;
  /** All errors */
  errors: ValidationIssue[];
  /** Field errors */
  fieldErrors: FieldErrors;
  /** Get errors for specific field */
  getFieldErrors: (field: string) => string[];
  /** Check if field has errors */
  hasFieldError: (field: string) => boolean;
  /** Touch a field (mark as dirty) */
  touchField: (field: string) => void;
  /** Touched fields */
  touchedFields: Set<string>;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook for data validation
 *
 * @param schema - Validation schema
 * @param options - Hook options
 * @returns Validation state and methods
 */
export function useDataValidation<T>(
  schema: Schema<T>,
  options: UseDataValidationOptions<T> = {}
): UseDataValidationReturn<T> {
  const {
    initialData,
    transformBeforeValidation,
    onValid,
    onInvalid,
  } = options;

  // State
  const [state, setState] = useState<ValidationState<T>>({
    isDirty: false,
    isValidating: false,
    isValid: true,
    lastValidatedData: null,
    errors: [],
    fieldErrors: {},
    lastValidatedAt: null,
  });

  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // Refs
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const schemaRef = useRef(schema);
  schemaRef.current = schema;

  // Extract field errors from validation issues
  const extractFieldErrors = useCallback((issues: ValidationIssue[]): FieldErrors => {
    const fieldErrors: FieldErrors = {};

    for (const issue of issues) {
      const path = issue.path.join('.');
      if (!fieldErrors[path]) {
        fieldErrors[path] = [];
      }
      fieldErrors[path].push(issue.message);
    }

    return fieldErrors;
  }, []);

  // Validate data
  const validate = useCallback((data: T): ValidationResult<T> => {
    const dataToValidate = transformBeforeValidation ? transformBeforeValidation(data) : data;
    const result = schemaRef.current.safeParse(dataToValidate);

    const fieldErrors = result.success ? {} : extractFieldErrors(result.issues);

    setState((prev) => ({
      ...prev,
      isDirty: true,
      isValidating: false,
      isValid: result.success,
      lastValidatedData: data,
      errors: result.success ? [] : result.issues,
      fieldErrors,
      lastValidatedAt: Date.now(),
    }));

    if (result.success) {
      onValid?.(result.data);
    } else {
      onInvalid?.(result.issues);
    }

    return result;
  }, [transformBeforeValidation, extractFieldErrors, onValid, onInvalid]);

  // Validate asynchronously
  const validateAsync = useCallback(async (data: T): Promise<ValidationResult<T>> => {
    setState((prev) => ({ ...prev, isValidating: true }));

    const dataToValidate = transformBeforeValidation ? transformBeforeValidation(data) : data;
    const result = await schemaRef.current.safeParseAsync(dataToValidate);

    const fieldErrors = result.success ? {} : extractFieldErrors(result.issues);

    setState((prev) => ({
      ...prev,
      isDirty: true,
      isValidating: false,
      isValid: result.success,
      lastValidatedData: data,
      errors: result.success ? [] : result.issues,
      fieldErrors,
      lastValidatedAt: Date.now(),
    }));

    if (result.success) {
      onValid?.(result.data);
    } else {
      onInvalid?.(result.issues);
    }

    return result;
  }, [transformBeforeValidation, extractFieldErrors, onValid, onInvalid]);

  // Validate single field
  const validateField = useCallback((field: string, value: unknown): ValidationResult<unknown> => {
    // Create a temporary object with just this field for validation
    const testData = { [field]: value } as T;
    const result = schemaRef.current.safeParse(testData);

    if (result.success) {
      setState((prev) => {
        const newFieldErrors = { ...prev.fieldErrors };
        delete newFieldErrors[field];
        return {
          ...prev,
          fieldErrors: newFieldErrors,
        };
      });
      return { success: true, data: value, issues: [] };
    }

    // Filter to only errors for this field
    const fieldIssues = result.issues.filter(
      (issue: { path: (string | number)[]; message: string }) => issue.path[0] === field || issue.path.join('.') === field
    );

    if (fieldIssues.length === 0) {
      setState((prev) => {
        const newFieldErrors = { ...prev.fieldErrors };
        delete newFieldErrors[field];
        return {
          ...prev,
          fieldErrors: newFieldErrors,
        };
      });
      return { success: true, data: value, issues: [] };
    }

    setState((prev) => ({
      ...prev,
      fieldErrors: {
        ...prev.fieldErrors,
        [field]: fieldIssues.map((i: { message: string }) => i.message),
      },
    }));

    return {
      success: false,
      data: undefined,
      issues: fieldIssues,
    };
  }, []);

  // Clear validation
  const clearValidation = useCallback(() => {
    setState({
      isDirty: false,
      isValidating: false,
      isValid: true,
      lastValidatedData: null,
      errors: [],
      fieldErrors: {},
      lastValidatedAt: null,
    });
    setTouchedFields(new Set());
  }, []);

  // Reset to initial state
  const reset = useCallback(() => {
    clearValidation();
    if (initialData) {
      validate(initialData);
    }
  }, [clearValidation, initialData, validate]);

  // Get field errors
  const getFieldErrors = useCallback(
    (field: string): string[] => {
      return state.fieldErrors[field] || [];
    },
    [state.fieldErrors]
  );

  // Check if field has errors
  const hasFieldError = useCallback(
    (field: string): boolean => {
      return (state.fieldErrors[field]?.length || 0) > 0;
    },
    [state.fieldErrors]
  );

  // Touch a field
  const touchField = useCallback((field: string) => {
    setTouchedFields((prev) => new Set(prev).add(field));
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    validate,
    validateAsync,
    validateField,
    clearValidation,
    reset,
    state,
    isValid: state.isValid,
    isDirty: state.isDirty,
    isValidating: state.isValidating,
    errors: state.errors,
    fieldErrors: state.fieldErrors,
    getFieldErrors,
    hasFieldError,
    touchField,
    touchedFields,
  };
}

// =============================================================================
// SPECIALIZED HOOKS
// =============================================================================

/**
 * Hook for validating data on change with debouncing
 *
 * @param schema - Validation schema
 * @param data - Data to validate
 * @param debounceMs - Debounce delay
 * @returns Validation state
 */
export function useValidateOnChange<T>(
  schema: Schema<T>,
  data: T,
  debounceMs: number = 300
): {
  isValid: boolean;
  errors: ValidationIssue[];
  isValidating: boolean;
} {
  const [result, setResult] = useState<{
    isValid: boolean;
    errors: ValidationIssue[];
    isValidating: boolean;
  }>({ isValid: true, errors: [], isValidating: false });

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setResult((prev) => ({ ...prev, isValidating: true }));

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const validationResult = schema.safeParse(data);
      setResult({
        isValid: validationResult.success,
        errors: validationResult.success ? [] : validationResult.issues,
        isValidating: false,
      });
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [schema, data, debounceMs]);

  return result;
}

/**
 * Hook for validating a single value
 *
 * @param schema - Validation schema
 * @param value - Value to validate
 * @returns Validation result
 */
export function useValidateValue<T>(
  schema: Schema<T>,
  value: T
): {
  isValid: boolean;
  error: string | null;
} {
  return useMemo(() => {
    const result = schema.safeParse(value);
    return {
      isValid: result.success,
      error: result.success ? null : result.issues[0]?.message || 'Invalid value',
    };
  }, [schema, value]);
}

/**
 * Hook for async validation
 *
 * @param validateFn - Async validation function
 * @param data - Data to validate
 * @param deps - Dependencies to trigger re-validation
 * @returns Validation state
 */
export function useAsyncValidation<T>(
  validateFn: (data: T) => Promise<ValidationResult<T>>,
  data: T,
  deps: unknown[] = []
): {
  isValid: boolean | null;
  isValidating: boolean;
  errors: ValidationIssue[];
  validate: () => Promise<ValidationResult<T>>;
} {
  const [state, setState] = useState<{
    isValid: boolean | null;
    isValidating: boolean;
    errors: ValidationIssue[];
  }>({
    isValid: null,
    isValidating: false,
    errors: [],
  });

  const dataRef = useRef(data);
  dataRef.current = data;

  const validate = useCallback(async () => {
    setState((prev) => ({ ...prev, isValidating: true }));

    const result = await validateFn(dataRef.current);

    setState({
      isValid: result.success,
      isValidating: false,
      errors: result.success ? [] : result.issues,
    });

    return result;
  }, [validateFn]);

  useEffect(() => {
    validate();
  }, [...deps, validate]);

  return {
    ...state,
    validate,
  };
}

export default useDataValidation;
