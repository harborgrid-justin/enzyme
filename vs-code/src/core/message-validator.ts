/**
 * @file Message Validator
 * @description Validates messages between extension and webviews
 *
 * SECURITY: Prevents injection attacks and malicious data from webviews.
 * All webview messages should be validated before processing.
 *
 * OWASP Compliance:
 * - A03:2021 - Injection: Input validation prevents injection attacks
 * - A04:2021 - Insecure Design: Centralized validation ensures consistent security
 * - A08:2021 - Software and Data Integrity Failures: Message validation ensures data integrity
 */

import { logger } from './logger';
import { sanitizeInput, sanitizePath, escapeHtml } from './security-utils';

// =============================================================================
// Types
// =============================================================================

/**
 * Message validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitizedData?: unknown;
}

/**
 * Message schema definition
 */
export interface MessageSchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'enum';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: readonly string[];
  items?: MessageSchema;
  properties?: Record<string, MessageSchema>;
  allowedKeys?: string[];
  sanitize?: boolean;
}

/**
 * Base message interface that all webview messages should extend
 */
export interface BaseMessage {
  type: string;
  payload?: unknown;
  timestamp?: number;
}

// =============================================================================
// Message Validator
// =============================================================================

/**
 * SECURITY: Validates messages from webviews
 *
 * This class provides comprehensive validation for all messages received from
 * webviews to prevent injection attacks, XSS, and data integrity issues.
 *
 * @example
 * ```typescript
 * const validator = new MessageValidator();
 *
 * // Define schema
 * const schema: MessageSchema = {
 *   type: 'object',
 *   required: true,
 *   properties: {
 *     type: { type: 'enum', enum: ['save', 'load'], required: true },
 *     payload: { type: 'string', required: true, maxLength: 1000, sanitize: true }
 *   }
 * };
 *
 * // Validate message
 * const result = validator.validate(message, schema);
 * if (!result.valid) {
 *   console.error('Invalid message:', result.errors);
 * }
 * ```
 */
export class MessageValidator {
  private trustedOrigins: Set<string> = new Set();

  constructor() {
    logger.debug('MessageValidator initialized');
  }

  /**
   * SECURITY: Add trusted origin for webview messages
   *
   * @param origin - Trusted origin URL
   */
  public addTrustedOrigin(origin: string): void {
    this.trustedOrigins.add(origin);
  }

  /**
   * SECURITY: Validate a message against a schema
   *
   * @param message - Message to validate
   * @param schema - Schema to validate against
   * @returns Validation result with sanitized data
   */
  public validate(message: unknown, schema: MessageSchema): ValidationResult {
    const errors: string[] = [];

    // SECURITY: Basic type checking
    if (message === null || message === undefined) {
      if (schema.required) {
        errors.push('Message is required but is null or undefined');
      }
      return { valid: errors.length === 0, errors };
    }

    // Validate based on schema type
    let sanitizedData: unknown = message;

    switch (schema.type) {
      case 'string':
        sanitizedData = this.validateString(message, schema, errors);
        break;

      case 'number':
        this.validateNumber(message, schema, errors);
        sanitizedData = message;
        break;

      case 'boolean':
        this.validateBoolean(message, schema, errors);
        sanitizedData = message;
        break;

      case 'array':
        sanitizedData = this.validateArray(message, schema, errors);
        break;

      case 'object':
        sanitizedData = this.validateObject(message, schema, errors);
        break;

      case 'enum':
        this.validateEnum(message, schema, errors);
        sanitizedData = message;
        break;

      default:
        errors.push(`Unknown schema type: ${schema.type}`);
    }

    const result: ValidationResult = {
      valid: errors.length === 0,
      errors,
    };

    if (result.valid) {
      result.sanitizedData = sanitizedData;
    }

    // Log validation failures for security monitoring
    if (!result.valid) {
      logger.warn('Message validation failed', { errors });
    }

    return result;
  }

  /**
   * SECURITY: Validate string value
   */
  private validateString(
    value: unknown,
    schema: MessageSchema,
    errors: string[]
  ): string {
    if (typeof value !== 'string') {
      errors.push(`Expected string but got ${typeof value}`);
      return '';
    }

    let sanitized = value;

    // Length validation
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`String length ${value.length} is less than minimum ${schema.minLength}`);
    }

    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(`String length ${value.length} exceeds maximum ${schema.maxLength}`);
    }

    // Pattern validation
    if (schema.pattern && !schema.pattern.test(value)) {
      errors.push(`String does not match required pattern: ${schema.pattern}`);
    }

    // SECURITY: Sanitize if requested
    if (schema.sanitize) {
      sanitized = sanitizeInput(value, schema.maxLength || 1000);
    }

    return sanitized;
  }

  /**
   * SECURITY: Validate number value
   */
  private validateNumber(
    value: unknown,
    schema: MessageSchema,
    errors: string[]
  ): void {
    if (typeof value !== 'number' || isNaN(value)) {
      errors.push(`Expected number but got ${typeof value}`);
      return;
    }

    // Range validation
    if (schema.min !== undefined && value < schema.min) {
      errors.push(`Number ${value} is less than minimum ${schema.min}`);
    }

    if (schema.max !== undefined && value > schema.max) {
      errors.push(`Number ${value} exceeds maximum ${schema.max}`);
    }
  }

  /**
   * SECURITY: Validate boolean value
   */
  private validateBoolean(
    value: unknown,
    schema: MessageSchema,
    errors: string[]
  ): void {
    if (typeof value !== 'boolean') {
      errors.push(`Expected boolean but got ${typeof value}`);
    }
  }

  /**
   * SECURITY: Validate array value
   */
  private validateArray(
    value: unknown,
    schema: MessageSchema,
    errors: string[]
  ): unknown[] {
    if (!Array.isArray(value)) {
      errors.push(`Expected array but got ${typeof value}`);
      return [];
    }

    const sanitized: unknown[] = [];

    // Validate array items if schema provided
    if (schema.items) {
      for (let i = 0; i < value.length; i++) {
        const itemErrors: string[] = [];
        const result = this.validate(value[i], schema.items);

        if (!result.valid) {
          errors.push(`Array item at index ${i}: ${result.errors.join(', ')}`);
        } else {
          sanitized.push(result.sanitizedData);
        }
      }
    } else {
      return value;
    }

    return sanitized;
  }

  /**
   * SECURITY: Validate object value
   */
  private validateObject(
    value: unknown,
    schema: MessageSchema,
    errors: string[]
  ): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      errors.push(`Expected object but got ${typeof value}`);
      return {};
    }

    const obj = value as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};

    // Validate object properties if schema provided
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        const propValue = obj[key];

        if (propValue === undefined && propSchema.required) {
          errors.push(`Required property "${key}" is missing`);
          continue;
        }

        if (propValue !== undefined) {
          const result = this.validate(propValue, propSchema);

          if (!result.valid) {
            errors.push(`Property "${key}": ${result.errors.join(', ')}`);
          } else {
            sanitized[key] = result.sanitizedData;
          }
        }
      }

      // SECURITY: Check for unexpected properties
      if (schema.allowedKeys) {
        for (const key of Object.keys(obj)) {
          if (!schema.allowedKeys.includes(key) && !schema.properties[key]) {
            logger.warn(`Unexpected property in message: ${key}`);
            // Don't add error, just log for security monitoring
          }
        }
      }
    } else {
      return obj;
    }

    return sanitized;
  }

  /**
   * SECURITY: Validate enum value
   */
  private validateEnum(
    value: unknown,
    schema: MessageSchema,
    errors: string[]
  ): void {
    if (!schema.enum) {
      errors.push('Enum schema must have enum values');
      return;
    }

    if (!schema.enum.includes(value as string)) {
      errors.push(`Value "${value}" is not in enum: ${schema.enum.join(', ')}`);
    }
  }

  /**
   * SECURITY: Validate base message structure
   *
   * All webview messages should have a type field
   *
   * @param message - Message to validate
   * @returns Validation result
   */
  public validateBaseMessage(message: unknown): ValidationResult {
    const schema: MessageSchema = {
      type: 'object',
      required: true,
      properties: {
        type: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 100,
          pattern: /^[a-zA-Z][a-zA-Z0-9:._-]*$/,
        },
        payload: {
          type: 'object',
          required: false,
        },
        timestamp: {
          type: 'number',
          required: false,
        },
      },
      allowedKeys: ['type', 'payload', 'timestamp'],
    };

    return this.validate(message, schema);
  }

  /**
   * SECURITY: Validate file path from webview
   *
   * @param path - Path to validate
   * @param allowedBase - Base directory that path must be within
   * @returns Validation result with sanitized path
   */
  public validatePath(path: unknown, allowedBase?: string): ValidationResult {
    const errors: string[] = [];

    if (typeof path !== 'string') {
      errors.push('Path must be a string');
      return { valid: false, errors };
    }

    // SECURITY: Sanitize path to prevent traversal attacks
    const sanitized = sanitizePath(path, allowedBase);

    if (sanitized === null) {
      errors.push('Path contains invalid characters or traversal sequences');
      return { valid: false, errors };
    }

    return {
      valid: true,
      errors: [],
      sanitizedData: sanitized,
    };
  }

  /**
   * SECURITY: Validate HTML content from webview
   *
   * @param html - HTML content to validate
   * @returns Validation result with escaped HTML
   */
  public validateHtml(html: unknown): ValidationResult {
    const errors: string[] = [];

    if (typeof html !== 'string') {
      errors.push('HTML must be a string');
      return { valid: false, errors };
    }

    // SECURITY: Escape HTML to prevent XSS
    const sanitized = escapeHtml(html);

    return {
      valid: true,
      errors: [],
      sanitizedData: sanitized,
    };
  }
}

// =============================================================================
// Common Message Schemas
// =============================================================================

/**
 * SECURITY: Common message schemas for reuse
 */
export const CommonSchemas = {
  /**
   * State update message schema
   */
  stateUpdate: {
    type: 'object' as const,
    required: true,
    properties: {
      type: {
        type: 'enum' as const,
        enum: ['stateUpdate'] as const,
        required: true,
      },
      payload: {
        type: 'object' as const,
        required: true,
      },
    },
  },

  /**
   * Command message schema
   */
  command: {
    type: 'object' as const,
    required: true,
    properties: {
      type: {
        type: 'enum' as const,
        enum: ['command'] as const,
        required: true,
      },
      payload: {
        type: 'object' as const,
        required: true,
        properties: {
          command: {
            type: 'string' as const,
            required: true,
            pattern: /^[a-zA-Z][a-zA-Z0-9._-]*$/,
            maxLength: 100,
          },
          args: {
            type: 'array' as const,
            required: false,
          },
        },
      },
    },
  },

  /**
   * File operation message schema
   */
  fileOperation: {
    type: 'object' as const,
    required: true,
    properties: {
      type: {
        type: 'enum' as const,
        enum: ['fileOperation'] as const,
        required: true,
      },
      payload: {
        type: 'object' as const,
        required: true,
        properties: {
          operation: {
            type: 'enum' as const,
            enum: ['read', 'write', 'delete'] as const,
            required: true,
          },
          path: {
            type: 'string' as const,
            required: true,
            maxLength: 500,
          },
          content: {
            type: 'string' as const,
            required: false,
            maxLength: 1000000, // 1MB max
          },
        },
      },
    },
  },
};

// =============================================================================
// Singleton Instance
// =============================================================================

let validatorInstance: MessageValidator | null = null;

/**
 * SECURITY: Get or create singleton MessageValidator instance
 *
 * @returns MessageValidator instance
 */
export function getMessageValidator(): MessageValidator {
  if (!validatorInstance) {
    validatorInstance = new MessageValidator();
  }
  return validatorInstance;
}

/**
 * SECURITY: Reset message validator (for testing)
 */
export function resetMessageValidator(): void {
  validatorInstance = null;
}
