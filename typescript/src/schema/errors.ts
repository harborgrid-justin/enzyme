/**
 * Enhanced error formatting and localization for Zod schemas
 * @module @missionfabric-js/enzyme-typescript/schema/errors
 *
 * @example
 * ```typescript
 * import { formatZodError, createErrorMap } from '@missionfabric-js/enzyme-typescript/schema/errors';
 * import { z } from 'zod';
 *
 * // Custom error map
 * const errorMap = createErrorMap({
 *   required_error: 'This field is required',
 *   invalid_type_error: 'Invalid type provided',
 * });
 *
 * const schema = z.object({
 *   email: z.string().email(),
 * });
 *
 * const result = schema.safeParse({ email: 'invalid' });
 * if (!result.success) {
 *   const formatted = formatZodError(result.error);
 *   console.log(formatted);
 * }
 * ```
 */

import { z } from 'zod';

/**
 * Formatted error structure for better error handling
 */
export interface FormattedError {
  /** Field path (e.g., 'user.email') */
  field: string;
  /** Error message */
  message: string;
  /** Error code from Zod */
  code: string;
  /** Additional error context */
  context?: Record<string, unknown>;
}

/**
 * Error map configuration for custom error messages
 */
export interface ErrorMapConfig {
  /** Message for required fields */
  required_error?: string;
  /** Message for invalid types */
  invalid_type_error?: string;
  /** Message for too small values */
  too_small?: string;
  /** Message for too big values */
  too_big?: string;
  /** Message for invalid strings */
  invalid_string?: string;
  /** Custom messages by error code */
  custom?: Record<string, string>;
}

/**
 * Localization messages for error formatting
 */
export interface LocalizationMessages {
  /** Language code (e.g., 'en', 'es', 'fr') */
  locale: string;
  /** Error messages by code */
  messages: Record<string, string | ((context: Record<string, unknown>) => string)>;
}

/**
 * Format a Zod error into a more readable structure
 *
 * @param error - Zod validation error
 * @returns Array of formatted errors
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   email: z.string().email(),
 *   age: z.number().min(18),
 * });
 *
 * const result = schema.safeParse({ email: 'invalid', age: 15 });
 * if (!result.success) {
 *   const errors = formatZodError(result.error);
 *   // [
 *   //   { field: 'email', message: 'Invalid email', code: 'invalid_string' },
 *   //   { field: 'age', message: 'Number must be greater than or equal to 18', code: 'too_small' }
 *   // ]
 * }
 * ```
 */
export function formatZodError(error: z.ZodError): FormattedError[] {
  return error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
    context: {
      ...issue,
      path: issue.path,
    },
  }));
}

/**
 * Convert Zod error to a flat object mapping field names to error messages
 *
 * @param error - Zod validation error
 * @returns Object mapping field paths to error messages
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   user: z.object({
 *     email: z.string().email(),
 *     name: z.string().min(2),
 *   }),
 * });
 *
 * const result = schema.safeParse({
 *   user: { email: 'invalid', name: 'a' }
 * });
 *
 * if (!result.success) {
 *   const errors = zodErrorToFieldErrors(result.error);
 *   // {
 *   //   'user.email': 'Invalid email',
 *   //   'user.name': 'String must contain at least 2 character(s)'
 *   // }
 * }
 * ```
 */
export function zodErrorToFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  error.issues.forEach((issue) => {
    const path = issue.path.join('.');
    if (!fieldErrors[path]) {
      fieldErrors[path] = issue.message;
    }
  });

  return fieldErrors;
}

/**
 * Convert Zod error to a nested object structure
 *
 * @param error - Zod validation error
 * @returns Nested error object matching the schema structure
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   user: z.object({
 *     email: z.string().email(),
 *     profile: z.object({
 *       bio: z.string().min(10),
 *     }),
 *   }),
 * });
 *
 * const result = schema.safeParse({
 *   user: { email: 'invalid', profile: { bio: 'short' } }
 * });
 *
 * if (!result.success) {
 *   const errors = zodErrorToNestedErrors(result.error);
 *   // {
 *   //   user: {
 *   //     email: 'Invalid email',
 *   //     profile: {
 *   //       bio: 'String must contain at least 10 character(s)'
 *   //     }
 *   //   }
 *   // }
 * }
 * ```
 */
export function zodErrorToNestedErrors(error: z.ZodError): Record<string, unknown> {
  const nestedErrors: Record<string, unknown> = {};

  error.issues.forEach((issue) => {
    let current = nestedErrors;
    const path = issue.path;

    for (let i = 0; i < path.length; i++) {
      const key = String(path[i]);

      if (i === path.length - 1) {
        current[key] = issue.message;
      } else {
        if (!current[key] || typeof current[key] !== 'object') {
          current[key] = {};
        }
        current = current[key] as Record<string, unknown>;
      }
    }
  });

  return nestedErrors;
}

/**
 * Create a custom error map for Zod schemas
 *
 * @param config - Error map configuration
 * @returns Zod error map function
 *
 * @example
 * ```typescript
 * const errorMap = createErrorMap({
 *   required_error: 'This field is required',
 *   invalid_type_error: 'Please provide a valid value',
 *   too_small: 'Value is too small',
 *   custom: {
 *     invalid_email: 'Please enter a valid email address',
 *   },
 * });
 *
 * z.setErrorMap(errorMap);
 *
 * const schema = z.string().email();
 * schema.parse('invalid'); // Throws with custom message
 * ```
 */
export function createErrorMap(config: ErrorMapConfig): z.ZodErrorMap {
  return (issue, ctx) => {
    // Check custom messages first
    if (config.custom && config.custom[issue.code]) {
      return { message: config.custom[issue.code] };
    }

    // Handle specific error types
    switch (issue.code) {
      case z.ZodIssueCode.invalid_type:
        if (issue.received === 'undefined') {
          return { message: config.required_error || 'Required' };
        }
        return { message: config.invalid_type_error || ctx.defaultError };

      case z.ZodIssueCode.too_small:
        return { message: config.too_small || ctx.defaultError };

      case z.ZodIssueCode.too_big:
        return { message: config.too_big || ctx.defaultError };

      case z.ZodIssueCode.invalid_string:
        return { message: config.invalid_string || ctx.defaultError };

      default:
        return { message: ctx.defaultError };
    }
  };
}

/**
 * Create a localized error map for international applications
 *
 * @param messages - Localization messages
 * @returns Zod error map function
 *
 * @example
 * ```typescript
 * const spanishMessages: LocalizationMessages = {
 *   locale: 'es',
 *   messages: {
 *     'invalid_type': 'Tipo inválido',
 *     'too_small': (ctx) => `Debe tener al menos ${ctx.minimum} caracteres`,
 *     'invalid_email': 'Correo electrónico inválido',
 *   },
 * };
 *
 * const errorMap = createLocalizedErrorMap(spanishMessages);
 * z.setErrorMap(errorMap);
 * ```
 */
export function createLocalizedErrorMap(messages: LocalizationMessages): z.ZodErrorMap {
  return (issue, ctx) => {
    const messageKey = issue.code;
    const customMessage = messages.messages[messageKey];

    if (customMessage) {
      if (typeof customMessage === 'function') {
        return { message: customMessage(issue as Record<string, unknown>) };
      }
      return { message: customMessage };
    }

    // Handle string validation types
    if (issue.code === z.ZodIssueCode.invalid_string && 'validation' in issue) {
      const validation = (issue as z.ZodInvalidStringIssue).validation;
      const validationKey = typeof validation === 'string' ? validation : validation.toString();
      const validationMessage = messages.messages[`invalid_${validationKey}`];

      if (validationMessage) {
        if (typeof validationMessage === 'function') {
          return { message: validationMessage(issue as Record<string, unknown>) };
        }
        return { message: validationMessage };
      }
    }

    return { message: ctx.defaultError };
  };
}

/**
 * Get the first error message from a Zod error
 *
 * @param error - Zod validation error
 * @returns First error message or undefined
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   email: z.string().email(),
 *   password: z.string().min(8),
 * });
 *
 * const result = schema.safeParse({ email: 'invalid', password: '123' });
 * if (!result.success) {
 *   const firstError = getFirstError(result.error);
 *   console.log(firstError); // 'Invalid email'
 * }
 * ```
 */
export function getFirstError(error: z.ZodError): string | undefined {
  return error.issues[0]?.message;
}

/**
 * Check if a Zod error has errors for a specific field
 *
 * @param error - Zod validation error
 * @param fieldPath - Field path to check (e.g., 'user.email')
 * @returns True if field has errors
 *
 * @example
 * ```typescript
 * const result = schema.safeParse(data);
 * if (!result.success) {
 *   if (hasFieldError(result.error, 'user.email')) {
 *     console.log('Email field has an error');
 *   }
 * }
 * ```
 */
export function hasFieldError(error: z.ZodError, fieldPath: string): boolean {
  const pathParts = fieldPath.split('.');
  return error.issues.some((issue) => {
    const issuePath = issue.path.map(String);
    return issuePath.join('.') === fieldPath;
  });
}

/**
 * Get error message for a specific field
 *
 * @param error - Zod validation error
 * @param fieldPath - Field path (e.g., 'user.email')
 * @returns Error message or undefined
 *
 * @example
 * ```typescript
 * const result = schema.safeParse(data);
 * if (!result.success) {
 *   const emailError = getFieldError(result.error, 'user.email');
 *   console.log(emailError); // 'Invalid email'
 * }
 * ```
 */
export function getFieldError(error: z.ZodError, fieldPath: string): string | undefined {
  const pathParts = fieldPath.split('.');
  const issue = error.issues.find((issue) => {
    const issuePath = issue.path.map(String);
    return issuePath.join('.') === fieldPath;
  });

  return issue?.message;
}

/**
 * Merge multiple Zod errors into one
 *
 * @param errors - Array of Zod errors
 * @returns Merged Zod error
 *
 * @example
 * ```typescript
 * const error1 = schema1.safeParse(data1).error;
 * const error2 = schema2.safeParse(data2).error;
 *
 * if (error1 && error2) {
 *   const merged = mergeZodErrors([error1, error2]);
 *   console.log(formatZodError(merged));
 * }
 * ```
 */
export function mergeZodErrors(errors: z.ZodError[]): z.ZodError {
  const allIssues = errors.flatMap((error) => error.issues);
  return new z.ZodError(allIssues);
}
