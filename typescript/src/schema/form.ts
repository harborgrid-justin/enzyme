/**
 * Form validation schema utilities with error mapping
 * @module @missionfabric-js/enzyme-typescript/schema/form
 *
 * @example
 * ```typescript
 * import { createFormSchema, useFormValidation } from '@missionfabric-js/enzyme-typescript/schema/form';
 *
 * const loginForm = createFormSchema({
 *   email: z.string().email(),
 *   password: z.string().min(8),
 * });
 * ```
 */

import { z } from 'zod';

/**
 * Form field error structure
 */
export interface FieldError {
  /** Field name */
  field: string;
  /** Error message */
  message: string;
  /** Error type */
  type: string;
}

/**
 * Form validation result
 */
export interface FormValidationResult<T> {
  /** Whether validation succeeded */
  success: boolean;
  /** Validated data if successful */
  data?: T;
  /** Field errors if validation failed */
  errors?: Record<string, string>;
  /** All error details */
  fieldErrors?: FieldError[];
}

/**
 * Form field metadata
 */
export interface FieldMeta {
  /** Whether field has been touched */
  touched: boolean;
  /** Whether field is currently being validated */
  validating: boolean;
  /** Field error message */
  error?: string;
  /** Field value */
  value: unknown;
}

/**
 * Create a form validation schema
 *
 * @param shape - Form schema shape
 * @returns Form schema validator
 *
 * @example
 * ```typescript
 * const formSchema = createFormSchema({
 *   username: z.string().min(3).max(20),
 *   email: z.string().email(),
 *   password: z.string().min(8),
 *   confirmPassword: z.string(),
 * });
 *
 * // Add custom validation
 * const refinedSchema = formSchema.refine(
 *   (data) => data.password === data.confirmPassword,
 *   {
 *     message: "Passwords don't match",
 *     path: ['confirmPassword'],
 *   }
 * );
 * ```
 */
export function createFormSchema<T extends z.ZodRawShape>(
  shape: T
): z.ZodObject<T> {
  return z.object(shape);
}

/**
 * Validate form data
 *
 * @param schema - Form schema
 * @param data - Form data to validate
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const schema = createFormSchema({
 *   email: z.string().email(),
 *   password: z.string().min(8),
 * });
 *
 * const result = validateForm(schema, {
 *   email: 'user@example.com',
 *   password: 'short',
 * });
 *
 * if (!result.success) {
 *   console.log(result.errors);
 *   // { password: 'String must contain at least 8 character(s)' }
 * }
 * ```
 */
export function validateForm<T extends z.ZodObject<any>>(
  schema: T,
  data: unknown
): FormValidationResult<z.infer<T>> {
  const result = schema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  const errors: Record<string, string> = {};
  const fieldErrors: FieldError[] = [];

  result.error.issues.forEach((issue) => {
    const field = issue.path.join('.');
    if (!errors[field]) {
      errors[field] = issue.message;
      fieldErrors.push({
        field,
        message: issue.message,
        type: issue.code,
      });
    }
  });

  return {
    success: false,
    errors,
    fieldErrors,
  };
}

/**
 * Validate a single form field
 *
 * @param schema - Form schema
 * @param fieldName - Field name to validate
 * @param value - Field value
 * @returns Field validation result
 *
 * @example
 * ```typescript
 * const schema = createFormSchema({
 *   email: z.string().email(),
 *   password: z.string().min(8),
 * });
 *
 * const emailError = validateField(schema, 'email', 'invalid');
 * // 'Invalid email'
 *
 * const validEmail = validateField(schema, 'email', 'user@example.com');
 * // undefined (no error)
 * ```
 */
export function validateField<T extends z.ZodObject<any>>(
  schema: T,
  fieldName: string,
  value: unknown
): string | undefined {
  const shape = schema.shape;
  const fieldSchema = shape[fieldName];

  if (!fieldSchema) {
    return undefined;
  }

  const result = fieldSchema.safeParse(value);

  if (result.success) {
    return undefined;
  }

  return result.error.issues[0]?.message;
}

/**
 * Create async field validator
 *
 * @param validator - Async validation function
 * @param debounceMs - Debounce delay in milliseconds
 * @returns Async field validator
 *
 * @example
 * ```typescript
 * const checkUsernameAvailable = createAsyncValidator(
 *   async (username: string) => {
 *     const response = await fetch(`/api/check-username?username=${username}`);
 *     const { available } = await response.json();
 *     return available ? undefined : 'Username is already taken';
 *   },
 *   500 // 500ms debounce
 * );
 *
 * const error = await checkUsernameAvailable('john_doe');
 * ```
 */
export function createAsyncValidator<T>(
  validator: (value: T) => Promise<string | undefined>,
  debounceMs = 300
): (value: T) => Promise<string | undefined> {
  let timeoutId: NodeJS.Timeout | null = null;

  return (value: T): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(async () => {
        const error = await validator(value);
        resolve(error);
      }, debounceMs);
    });
  };
}

/**
 * Create dependent field validator
 *
 * @param schema - Form schema
 * @param dependencies - Field dependencies
 * @returns Dependent field validator
 *
 * @example
 * ```typescript
 * const schema = createFormSchema({
 *   password: z.string().min(8),
 *   confirmPassword: z.string(),
 * });
 *
 * const validator = createDependentValidator(schema, {
 *   confirmPassword: ['password'],
 * });
 *
 * // Validates confirmPassword whenever password changes
 * ```
 */
export function createDependentValidator<T extends z.ZodObject<any>>(
  schema: T,
  dependencies: Record<string, string[]>
): {
  validate: (data: Partial<z.infer<T>>, changedField: string) => Record<string, string | undefined>;
  getDependents: (field: string) => string[];
} {
  // Build reverse dependency map
  const dependents: Record<string, string[]> = {};

  for (const [field, deps] of Object.entries(dependencies)) {
    deps.forEach((dep) => {
      if (!dependents[dep]) {
        dependents[dep] = [];
      }
      dependents[dep].push(field);
    });
  }

  return {
    validate(data, changedField) {
      const errors: Record<string, string | undefined> = {};
      const fieldsToValidate = [changedField, ...(dependents[changedField] || [])];

      fieldsToValidate.forEach((field) => {
        errors[field] = validateField(schema, field, (data as any)[field]);
      });

      return errors;
    },

    getDependents(field) {
      return dependents[field] || [];
    },
  };
}

/**
 * Create form state manager
 *
 * @param schema - Form schema
 * @param initialValues - Initial form values
 * @returns Form state manager
 *
 * @example
 * ```typescript
 * const schema = createFormSchema({
 *   name: z.string().min(2),
 *   email: z.string().email(),
 * });
 *
 * const form = createFormState(schema, {
 *   name: '',
 *   email: '',
 * });
 *
 * form.setValue('name', 'John');
 * form.setValue('email', 'john@example.com');
 *
 * const result = form.validate();
 * if (result.success) {
 *   console.log(result.data);
 * }
 * ```
 */
export function createFormState<T extends z.ZodObject<any>>(
  schema: T,
  initialValues: Partial<z.infer<T>> = {}
): {
  values: Partial<z.infer<T>>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  setValue: (field: keyof z.infer<T>, value: unknown) => void;
  setValues: (values: Partial<z.infer<T>>) => void;
  setTouched: (field: keyof z.infer<T>, touched: boolean) => void;
  setError: (field: keyof z.infer<T>, error: string | undefined) => void;
  validate: () => FormValidationResult<z.infer<T>>;
  validateField: (field: keyof z.infer<T>) => string | undefined;
  reset: () => void;
  getFieldMeta: (field: keyof z.infer<T>) => FieldMeta;
} {
  let values = { ...initialValues };
  const errors: Record<string, string> = {};
  const touched: Record<string, boolean> = {};

  return {
    values,
    errors,
    touched,

    setValue(field, value) {
      values = { ...values, [field]: value };
      touched[field as string] = true;

      // Validate field
      const error = validateField(schema, field as string, value);
      if (error) {
        errors[field as string] = error;
      } else {
        delete errors[field as string];
      }
    },

    setValues(newValues) {
      values = { ...values, ...newValues };
    },

    setTouched(field, isTouched) {
      touched[field as string] = isTouched;
    },

    setError(field, error) {
      if (error) {
        errors[field as string] = error;
      } else {
        delete errors[field as string];
      }
    },

    validate() {
      const result = validateForm(schema, values);

      if (!result.success && result.errors) {
        Object.entries(result.errors).forEach(([field, error]) => {
          errors[field] = error;
        });
      }

      return result;
    },

    validateField(field) {
      const error = validateField(schema, field as string, (values as any)[field]);
      if (error) {
        errors[field as string] = error;
      } else {
        delete errors[field as string];
      }
      return error;
    },

    reset() {
      values = { ...initialValues };
      Object.keys(errors).forEach((key) => delete errors[key]);
      Object.keys(touched).forEach((key) => delete touched[key]);
    },

    getFieldMeta(field) {
      return {
        touched: touched[field as string] || false,
        validating: false,
        error: errors[field as string],
        value: (values as any)[field],
      };
    },
  };
}

/**
 * Create multi-step form validator
 *
 * @param steps - Array of step schemas
 * @returns Multi-step form validator
 *
 * @example
 * ```typescript
 * const multiStepForm = createMultiStepForm([
 *   z.object({ email: z.string().email() }),
 *   z.object({ name: z.string(), phone: z.string() }),
 *   z.object({ address: z.string(), city: z.string() }),
 * ]);
 *
 * // Validate step
 * const step1Result = multiStepForm.validateStep(0, { email: 'user@example.com' });
 *
 * // Validate all steps
 * const finalResult = multiStepForm.validateAll([
 *   { email: 'user@example.com' },
 *   { name: 'John', phone: '555-1234' },
 *   { address: '123 Main St', city: 'Boston' },
 * ]);
 * ```
 */
export function createMultiStepForm<T extends z.ZodObject<any>[]>(
  steps: T
): {
  steps: T;
  validateStep: (stepIndex: number, data: unknown) => FormValidationResult<z.infer<T[number]>>;
  validateAll: (data: unknown[]) => FormValidationResult<{ [K in keyof T]: z.infer<T[K]> }>;
  getCurrentStep: () => number;
  setCurrentStep: (step: number) => void;
  canProceed: (stepIndex: number, data: unknown) => boolean;
} {
  let currentStep = 0;

  return {
    steps,

    validateStep(stepIndex, data) {
      if (stepIndex < 0 || stepIndex >= steps.length) {
        return {
          success: false,
          errors: { _form: 'Invalid step index' },
        };
      }

      const schema = steps[stepIndex];
      return validateForm(schema, data);
    },

    validateAll(data) {
      if (data.length !== steps.length) {
        return {
          success: false,
          errors: { _form: 'Invalid number of steps' },
        };
      }

      const results = data.map((stepData, index) => {
        return this.validateStep(index, stepData);
      });

      const allSuccess = results.every((r) => r.success);

      if (allSuccess) {
        return {
          success: true,
          data: results.map((r) => r.data) as any,
        };
      }

      const errors = results.reduce((acc, result, index) => {
        if (!result.success && result.errors) {
          Object.entries(result.errors).forEach(([field, error]) => {
            acc[`step${index}.${field}`] = error;
          });
        }
        return acc;
      }, {} as Record<string, string>);

      return {
        success: false,
        errors,
      };
    },

    getCurrentStep() {
      return currentStep;
    },

    setCurrentStep(step) {
      currentStep = Math.max(0, Math.min(step, steps.length - 1));
    },

    canProceed(stepIndex, data) {
      const result = this.validateStep(stepIndex, data);
      return result.success;
    },
  };
}

/**
 * Create conditional field schema
 *
 * @param condition - Condition function
 * @param schemaWhenTrue - Schema when condition is true
 * @param schemaWhenFalse - Schema when condition is false
 * @returns Conditional schema
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   hasCompany: z.boolean(),
 *   companyName: conditionalField(
 *     (data) => data.hasCompany === true,
 *     z.string().min(1),
 *     z.string().optional()
 *   ),
 * });
 *
 * // When hasCompany is true, companyName is required
 * // When hasCompany is false, companyName is optional
 * ```
 */
export function conditionalField<T extends z.ZodTypeAny, F extends z.ZodTypeAny>(
  condition: (data: unknown) => boolean,
  schemaWhenTrue: T,
  schemaWhenFalse: F
): z.ZodEffects<z.ZodUnknown, z.infer<T> | z.infer<F>, unknown> {
  return z.unknown().transform((val, ctx) => {
    const schema = condition(ctx) ? schemaWhenTrue : schemaWhenFalse;
    const result = schema.safeParse(val);

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        ctx.addIssue(issue);
      });
      return z.NEVER;
    }

    return result.data;
  });
}

/**
 * Create form with custom validators
 *
 * @param schema - Base form schema
 * @param validators - Custom validator functions
 * @returns Form with validators
 *
 * @example
 * ```typescript
 * const form = createFormWithValidators(
 *   z.object({
 *     password: z.string(),
 *     confirmPassword: z.string(),
 *   }),
 *   [
 *     (data) => {
 *       if (data.password !== data.confirmPassword) {
 *         return { confirmPassword: "Passwords don't match" };
 *       }
 *     },
 *   ]
 * );
 * ```
 */
export function createFormWithValidators<T extends z.ZodObject<any>>(
  schema: T,
  validators: Array<(data: z.infer<T>) => Record<string, string> | undefined>
): {
  validate: (data: unknown) => FormValidationResult<z.infer<T>>;
  schema: T;
} {
  return {
    schema,
    validate(data) {
      // First validate with schema
      const schemaResult = validateForm(schema, data);

      if (!schemaResult.success) {
        return schemaResult;
      }

      // Then run custom validators
      const customErrors: Record<string, string> = {};

      validators.forEach((validator) => {
        const errors = validator(schemaResult.data!);
        if (errors) {
          Object.assign(customErrors, errors);
        }
      });

      if (Object.keys(customErrors).length > 0) {
        return {
          success: false,
          errors: customErrors,
        };
      }

      return schemaResult;
    },
  };
}
