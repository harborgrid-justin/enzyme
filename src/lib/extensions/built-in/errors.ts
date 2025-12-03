/**
 * @file Enterprise Error Handling Extension
 * @description Comprehensive structured error handling system for the enzyme library
 *
 * Implements patterns from PR #16 recommendations:
 * - Prisma: Structured error codes with documentation
 * - axios: Rich error context and recovery mechanisms
 * - socket.io: Error hierarchy and retry logic
 * - DX research: Developer-friendly messages with remediation hints
 *
 * Features:
 * 1. Error Code System - DOMAIN_CATEGORY_NUMBER format
 * 2. Error Registry - centralized error definitions
 * 3. Error Hierarchy - EnzymeError base class with subtypes
 * 4. Rich Context - detailed error metadata
 * 5. Remediation Hints - actionable suggestions
 * 6. Fuzzy Matching - Levenshtein-based typo recovery
 * 7. Error Serialization - JSON serialization for transport
 * 8. Error Recovery - retry and fallback mechanisms
 * 9. Error Aggregation - collect multiple errors
 * 10. i18n Support - localized error messages
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Error severity levels
 */
export type ErrorSeverity = 'critical' | 'error' | 'warning' | 'info';

/**
 * Error domains following DOMAIN_CATEGORY_NUMBER pattern
 */
export type ErrorDomain =
  | 'AUTH'    // Authentication/authorization errors
  | 'API'     // API and network errors
  | 'STATE'   // State management errors
  | 'CONFIG'  // Configuration errors
  | 'VALID'   // Validation errors
  | 'RENDER'  // React rendering errors
  | 'PERF';   // Performance budget violations

/**
 * Error code definition
 */
export interface ErrorCodeDefinition {
  /** Full error code (e.g., "AUTH_TOKEN_001") */
  code: string;
  /** Error domain */
  domain: ErrorDomain;
  /** Error category within domain */
  category: string;
  /** Human-readable error message template */
  message: string;
  /** Error severity */
  severity: ErrorSeverity;
  /** Whether this error is retryable */
  retryable: boolean;
  /** Remediation hint for developers */
  remediation: string;
  /** Documentation URL */
  documentation?: string;
  /** Related error codes */
  relatedCodes?: string[];
}

/**
 * Error context for rich error information
 */
export interface ErrorContext {
  /** Timestamp when error occurred */
  timestamp: Date;
  /** Component or module where error occurred */
  component?: string;
  /** User ID if applicable */
  userId?: string;
  /** Request ID for tracing */
  requestId?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Stack trace */
  stack?: string;
  /** Error location */
  location?: {
    file?: string;
    line?: number;
    column?: number;
  };
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Initial delay in milliseconds */
  initialDelay: number;
  /** Maximum delay in milliseconds */
  maxDelay: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
  /** Whether to use exponential backoff */
  exponentialBackoff: boolean;
}

/**
 * Recovery strategy
 */
export type RecoveryStrategy =
  | { type: 'retry'; config: RetryConfig }
  | { type: 'fallback'; value: unknown }
  | { type: 'ignore' }
  | { type: 'throw' };

/**
 * Serialized error format
 */
export interface SerializedError {
  code: string;
  domain: string;
  category: string;
  message: string;
  severity: ErrorSeverity;
  context: ErrorContext;
  remediation: string;
  retryable: boolean;
  documentation?: string;
  originalError?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * i18n translation function
 */
export type TranslationFunction = (key: string, params?: Record<string, unknown>) => string;

/**
 * Locale configuration
 */
export interface LocaleConfig {
  locale: string;
  translations: Record<string, string>;
}

// ============================================================================
// Error Code Registry
// ============================================================================

/**
 * Central registry of all error codes
 */
export const ERROR_CODE_REGISTRY: Record<string, ErrorCodeDefinition> = {
  // AUTH Domain - Authentication/Authorization Errors
  AUTH_TOKEN_001: {
    code: 'AUTH_TOKEN_001',
    domain: 'AUTH',
    category: 'TOKEN',
    message: 'Authentication token is missing or invalid',
    severity: 'error',
    retryable: false,
    remediation: 'Ensure you are logged in and have a valid authentication token. Try refreshing your session or logging in again.',
    documentation: 'https://enzyme.dev/docs/errors/AUTH_TOKEN_001',
    relatedCodes: ['AUTH_TOKEN_002', 'AUTH_SESSION_001'],
  },
  AUTH_TOKEN_002: {
    code: 'AUTH_TOKEN_002',
    domain: 'AUTH',
    category: 'TOKEN',
    message: 'Authentication token has expired',
    severity: 'warning',
    retryable: true,
    remediation: 'Your session has expired. Please log in again to obtain a new token.',
    documentation: 'https://enzyme.dev/docs/errors/AUTH_TOKEN_002',
  },
  AUTH_PERMISSION_001: {
    code: 'AUTH_PERMISSION_001',
    domain: 'AUTH',
    category: 'PERMISSION',
    message: 'Insufficient permissions to perform this action',
    severity: 'error',
    retryable: false,
    remediation: 'Contact your administrator to request the necessary permissions for this operation.',
    documentation: 'https://enzyme.dev/docs/errors/AUTH_PERMISSION_001',
  },
  AUTH_SESSION_001: {
    code: 'AUTH_SESSION_001',
    domain: 'AUTH',
    category: 'SESSION',
    message: 'User session not found or has been terminated',
    severity: 'error',
    retryable: false,
    remediation: 'Please log in again to establish a new session.',
    documentation: 'https://enzyme.dev/docs/errors/AUTH_SESSION_001',
  },

  // API Domain - Network and API Errors
  API_NETWORK_001: {
    code: 'API_NETWORK_001',
    domain: 'API',
    category: 'NETWORK',
    message: 'Network request failed',
    severity: 'error',
    retryable: true,
    remediation: 'Check your internet connection and try again. If the problem persists, the server may be unavailable.',
    documentation: 'https://enzyme.dev/docs/errors/API_NETWORK_001',
  },
  API_TIMEOUT_001: {
    code: 'API_TIMEOUT_001',
    domain: 'API',
    category: 'TIMEOUT',
    message: 'Request timeout exceeded',
    severity: 'warning',
    retryable: true,
    remediation: 'The server took too long to respond. Try again or increase the timeout configuration.',
    documentation: 'https://enzyme.dev/docs/errors/API_TIMEOUT_001',
  },
  API_RESPONSE_001: {
    code: 'API_RESPONSE_001',
    domain: 'API',
    category: 'RESPONSE',
    message: 'Invalid response format from server',
    severity: 'error',
    retryable: false,
    remediation: 'The server returned an unexpected response format. This may indicate a server-side issue or API version mismatch.',
    documentation: 'https://enzyme.dev/docs/errors/API_RESPONSE_001',
  },
  API_RATE_LIMIT_001: {
    code: 'API_RATE_LIMIT_001',
    domain: 'API',
    category: 'RATE_LIMIT',
    message: 'Rate limit exceeded',
    severity: 'warning',
    retryable: true,
    remediation: 'You have made too many requests. Wait a moment before trying again.',
    documentation: 'https://enzyme.dev/docs/errors/API_RATE_LIMIT_001',
  },

  // STATE Domain - State Management Errors
  STATE_INVALID_001: {
    code: 'STATE_INVALID_001',
    domain: 'STATE',
    category: 'INVALID',
    message: 'Invalid state transition attempted',
    severity: 'error',
    retryable: false,
    remediation: 'The requested state change is not allowed from the current state. Review your state machine configuration.',
    documentation: 'https://enzyme.dev/docs/errors/STATE_INVALID_001',
  },
  STATE_SYNC_001: {
    code: 'STATE_SYNC_001',
    domain: 'STATE',
    category: 'SYNC',
    message: 'State synchronization failed',
    severity: 'warning',
    retryable: true,
    remediation: 'Failed to sync state across contexts. Check your state provider configuration.',
    documentation: 'https://enzyme.dev/docs/errors/STATE_SYNC_001',
  },
  STATE_HYDRATION_001: {
    code: 'STATE_HYDRATION_001',
    domain: 'STATE',
    category: 'HYDRATION',
    message: 'State hydration mismatch detected',
    severity: 'error',
    retryable: false,
    remediation: 'Server and client state do not match. Ensure SSR serialization is correct.',
    documentation: 'https://enzyme.dev/docs/errors/STATE_HYDRATION_001',
  },

  // CONFIG Domain - Configuration Errors
  CONFIG_INVALID_001: {
    code: 'CONFIG_INVALID_001',
    domain: 'CONFIG',
    category: 'INVALID',
    message: 'Invalid configuration provided',
    severity: 'error',
    retryable: false,
    remediation: 'Review your configuration file and ensure all required fields are present and valid.',
    documentation: 'https://enzyme.dev/docs/errors/CONFIG_INVALID_001',
  },
  CONFIG_MISSING_001: {
    code: 'CONFIG_MISSING_001',
    domain: 'CONFIG',
    category: 'MISSING',
    message: 'Required configuration field is missing',
    severity: 'error',
    retryable: false,
    remediation: 'Add the required configuration field to your config file. See documentation for required fields.',
    documentation: 'https://enzyme.dev/docs/errors/CONFIG_MISSING_001',
  },
  CONFIG_TYPE_001: {
    code: 'CONFIG_TYPE_001',
    domain: 'CONFIG',
    category: 'TYPE',
    message: 'Configuration field has incorrect type',
    severity: 'error',
    retryable: false,
    remediation: 'Ensure the configuration field is the correct type. Check the documentation for type requirements.',
    documentation: 'https://enzyme.dev/docs/errors/CONFIG_TYPE_001',
  },

  // VALID Domain - Validation Errors
  VALID_SCHEMA_001: {
    code: 'VALID_SCHEMA_001',
    domain: 'VALID',
    category: 'SCHEMA',
    message: 'Schema validation failed',
    severity: 'error',
    retryable: false,
    remediation: 'The provided data does not match the expected schema. Review validation errors for details.',
    documentation: 'https://enzyme.dev/docs/errors/VALID_SCHEMA_001',
  },
  VALID_FORMAT_001: {
    code: 'VALID_FORMAT_001',
    domain: 'VALID',
    category: 'FORMAT',
    message: 'Invalid data format',
    severity: 'error',
    retryable: false,
    remediation: 'Ensure data is in the correct format (e.g., valid email, URL, phone number).',
    documentation: 'https://enzyme.dev/docs/errors/VALID_FORMAT_001',
  },
  VALID_RANGE_001: {
    code: 'VALID_RANGE_001',
    domain: 'VALID',
    category: 'RANGE',
    message: 'Value is out of acceptable range',
    severity: 'error',
    retryable: false,
    remediation: 'Ensure the value is within the acceptable min/max range.',
    documentation: 'https://enzyme.dev/docs/errors/VALID_RANGE_001',
  },

  // RENDER Domain - React Rendering Errors
  RENDER_COMPONENT_001: {
    code: 'RENDER_COMPONENT_001',
    domain: 'RENDER',
    category: 'COMPONENT',
    message: 'Component render error',
    severity: 'error',
    retryable: false,
    remediation: 'A React component encountered an error during render. Check component props and state.',
    documentation: 'https://enzyme.dev/docs/errors/RENDER_COMPONENT_001',
  },
  RENDER_HOOK_001: {
    code: 'RENDER_HOOK_001',
    domain: 'RENDER',
    category: 'HOOK',
    message: 'React Hook error',
    severity: 'error',
    retryable: false,
    remediation: 'React Hook was called incorrectly. Ensure hooks are only called at the top level of components.',
    documentation: 'https://enzyme.dev/docs/errors/RENDER_HOOK_001',
  },
  RENDER_SUSPENSE_001: {
    code: 'RENDER_SUSPENSE_001',
    domain: 'RENDER',
    category: 'SUSPENSE',
    message: 'Suspense boundary error',
    severity: 'warning',
    retryable: true,
    remediation: 'An error occurred in a Suspense boundary. Check async data loading logic.',
    documentation: 'https://enzyme.dev/docs/errors/RENDER_SUSPENSE_001',
  },

  // PERF Domain - Performance Errors
  PERF_BUDGET_001: {
    code: 'PERF_BUDGET_001',
    domain: 'PERF',
    category: 'BUDGET',
    message: 'Performance budget exceeded',
    severity: 'warning',
    retryable: false,
    remediation: 'Operation exceeded performance budget. Consider optimization or increasing budget threshold.',
    documentation: 'https://enzyme.dev/docs/errors/PERF_BUDGET_001',
  },
  PERF_MEMORY_001: {
    code: 'PERF_MEMORY_001',
    domain: 'PERF',
    category: 'MEMORY',
    message: 'Memory limit exceeded',
    severity: 'critical',
    retryable: false,
    remediation: 'Application is using too much memory. Check for memory leaks or reduce data size.',
    documentation: 'https://enzyme.dev/docs/errors/PERF_MEMORY_001',
  },
  PERF_RENDER_001: {
    code: 'PERF_RENDER_001',
    domain: 'PERF',
    category: 'RENDER',
    message: 'Render performance degradation detected',
    severity: 'warning',
    retryable: false,
    remediation: 'Component is re-rendering too frequently. Consider memoization or state optimization.',
    documentation: 'https://enzyme.dev/docs/errors/PERF_RENDER_001',
  },
};

// ============================================================================
// Levenshtein Distance for Fuzzy Matching
// ============================================================================

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching error codes to suggest corrections for typos
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Calculate distances
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Find similar error codes using fuzzy matching
 */
function findSimilarErrorCodes(input: string, maxDistance = 3, maxSuggestions = 5): string[] {
  const codes = Object.keys(ERROR_CODE_REGISTRY);
  const similarities = codes
    .map(code => ({
      code,
      distance: levenshteinDistance(input.toUpperCase(), code),
    }))
    .filter(item => item.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maxSuggestions)
    .map(item => item.code);

  return similarities;
}

// ============================================================================
// Error Class Hierarchy
// ============================================================================

/**
 * Base EnzymeError class with rich context and metadata
 */
export class EnzymeError extends Error {
  /** Error code (e.g., "AUTH_TOKEN_001") */
  public readonly code: string;
  /** Error domain */
  public readonly domain: ErrorDomain;
  /** Error category within domain */
  public readonly category: string;
  /** Error severity */
  public readonly severity: ErrorSeverity;
  /** Error context */
  public readonly context: ErrorContext;
  /** Remediation hint */
  public readonly remediation: string;
  /** Whether error is retryable */
  public readonly retryable: boolean;
  /** Documentation URL */
  public readonly documentation?: string;
  /** Original error if this wraps another error */
  public readonly originalError?: Error;
  /** Related error codes */
  public readonly relatedCodes?: string[];

  constructor(
    codeOrDefinition: string | ErrorCodeDefinition,
    contextOrMessage?: Partial<ErrorContext> | string,
    originalError?: Error
  ) {
    // Resolve error definition
    const definition = typeof codeOrDefinition === 'string'
      ? ERROR_CODE_REGISTRY[codeOrDefinition]
      : codeOrDefinition;

    if (!definition) {
      // Error code not found, suggest alternatives
      const suggestions = findSimilarErrorCodes(
        typeof codeOrDefinition === 'string' ? codeOrDefinition : ''
      );
      const suggestionText = suggestions.length > 0
        ? ` Did you mean: ${suggestions.join(', ')}?`
        : '';
      throw new Error(
        `Unknown error code: ${codeOrDefinition}.${suggestionText}`
      );
    }

    // Parse error code
    const [domain, category] = definition.code.split('_');

    // Handle context or message parameter
    let context: Partial<ErrorContext>;
    let message = definition.message;

    if (typeof contextOrMessage === 'string') {
      message = contextOrMessage;
      context = {};
    } else {
      context = contextOrMessage || {};
    }

    // Call parent constructor
    super(message);

    // Set error name
    this.name = 'EnzymeError';

    // Set properties
    this.code = definition.code;
    this.domain = domain as ErrorDomain;
    this.category = category;
    this.severity = definition.severity;
    this.remediation = definition.remediation;
    this.retryable = definition.retryable;
    this.documentation = definition.documentation;
    this.relatedCodes = definition.relatedCodes;
    this.originalError = originalError;

    // Build full context
    this.context = {
      timestamp: new Date(),
      ...context,
      stack: this.stack,
    };

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Get formatted error message with code and remediation
   */
  toString(): string {
    let str = `[${this.code}] ${this.message}`;

    if (this.remediation) {
      str += `\n\nRemediation: ${this.remediation}`;
    }

    if (this.documentation) {
      str += `\n\nDocumentation: ${this.documentation}`;
    }

    if (this.relatedCodes && this.relatedCodes.length > 0) {
      str += `\n\nRelated errors: ${this.relatedCodes.join(', ')}`;
    }

    return str;
  }

  /**
   * Serialize error to JSON for logging or transport
   */
  toJSON(): SerializedError {
    return {
      code: this.code,
      domain: this.domain,
      category: this.category,
      message: this.message,
      severity: this.severity,
      context: this.context,
      remediation: this.remediation,
      retryable: this.retryable,
      documentation: this.documentation,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack,
      } : undefined,
    };
  }
}

/**
 * Authentication/Authorization error
 */
export class AuthError extends EnzymeError {
  constructor(
    code: string,
    context?: Partial<ErrorContext>,
    originalError?: Error
  ) {
    super(code, context, originalError);
    this.name = 'AuthError';
  }
}

/**
 * API/Network error
 */
export class ApiError extends EnzymeError {
  constructor(
    code: string,
    context?: Partial<ErrorContext>,
    originalError?: Error
  ) {
    super(code, context, originalError);
    this.name = 'ApiError';
  }
}

/**
 * State management error
 */
export class StateError extends EnzymeError {
  constructor(
    code: string,
    context?: Partial<ErrorContext>,
    originalError?: Error
  ) {
    super(code, context, originalError);
    this.name = 'StateError';
  }
}

/**
 * Configuration error
 */
export class ConfigError extends EnzymeError {
  constructor(
    code: string,
    context?: Partial<ErrorContext>,
    originalError?: Error
  ) {
    super(code, context, originalError);
    this.name = 'ConfigError';
  }
}

/**
 * Validation error
 */
export class ValidationError extends EnzymeError {
  constructor(
    code: string,
    context?: Partial<ErrorContext>,
    originalError?: Error
  ) {
    super(code, context, originalError);
    this.name = 'ValidationError';
  }
}

/**
 * Render error
 */
export class RenderError extends EnzymeError {
  constructor(
    code: string,
    context?: Partial<ErrorContext>,
    originalError?: Error
  ) {
    super(code, context, originalError);
    this.name = 'RenderError';
  }
}

/**
 * Performance error
 */
export class PerformanceError extends EnzymeError {
  constructor(
    code: string,
    context?: Partial<ErrorContext>,
    originalError?: Error
  ) {
    super(code, context, originalError);
    this.name = 'PerformanceError';
  }
}

// ============================================================================
// Error Aggregation
// ============================================================================

/**
 * Aggregate multiple errors into a single error
 */
export class AggregateError extends EnzymeError {
  public readonly errors: EnzymeError[];

  constructor(errors: EnzymeError[], message?: string) {
    super(
      {
        code: 'AGGREGATE_001',
        domain: 'STATE',
        category: 'AGGREGATE',
        message: message || `Multiple errors occurred (${errors.length} errors)`,
        severity: 'error',
        retryable: errors.some(e => e.retryable),
        remediation: 'Review individual errors for specific remediation steps.',
      },
      { metadata: { errorCount: errors.length } }
    );
    this.name = 'AggregateError';
    this.errors = errors;
  }

  /**
   * Get all error codes
   */
  getCodes(): string[] {
    return this.errors.map(e => e.code);
  }

  /**
   * Get errors by domain
   */
  getByDomain(domain: ErrorDomain): EnzymeError[] {
    return this.errors.filter(e => e.domain === domain);
  }

  /**
   * Get errors by severity
   */
  getBySeverity(severity: ErrorSeverity): EnzymeError[] {
    return this.errors.filter(e => e.severity === severity);
  }

  /**
   * Override toString to show all errors
   */
  toString(): string {
    let str = `[AGGREGATE] ${this.message}\n\n`;
    str += 'Individual errors:\n';
    this.errors.forEach((error, index) => {
      str += `\n${index + 1}. ${error.toString()}\n`;
    });
    return str;
  }
}

// ============================================================================
// Error Recovery Mechanisms
// ============================================================================

/**
 * Retry an operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  let lastError: Error | undefined;
  let delay = config.initialDelay;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry if not retryable
      if (error instanceof EnzymeError && !error.retryable) {
        throw error;
      }

      // Last attempt, throw error
      if (attempt === config.maxAttempts) {
        break;
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));

      // Calculate next delay
      if (config.exponentialBackoff) {
        delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
      }
    }
  }

  throw lastError;
}

/**
 * Execute operation with recovery strategy
 */
export async function executeWithRecovery<T>(
  operation: () => Promise<T>,
  strategy: RecoveryStrategy
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    switch (strategy.type) {
      case 'retry':
        return await retryWithBackoff(operation, strategy.config);

      case 'fallback':
        return strategy.value as T;

      case 'ignore':
        return undefined as T;

      case 'throw':
      default:
        throw error;
    }
  }
}

// ============================================================================
// Error Utilities
// ============================================================================

/**
 * Type guard to check if error is an EnzymeError
 */
export function isEnzymeError(error: unknown): error is EnzymeError {
  return error instanceof EnzymeError;
}

/**
 * Type guard to check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  return isEnzymeError(error) && error.retryable;
}

/**
 * Format error for display
 */
export function formatError(error: unknown): string {
  if (isEnzymeError(error)) {
    return error.toString();
  }

  if (error instanceof Error) {
    return `[UNKNOWN] ${error.message}`;
  }

  return `[UNKNOWN] ${String(error)}`;
}

/**
 * Serialize error for transport/logging
 */
export function serializeError(error: unknown): SerializedError | { message: string } {
  if (isEnzymeError(error)) {
    return error.toJSON();
  }

  if (error instanceof Error) {
    return {
      message: error.message,
    };
  }

  return {
    message: String(error),
  };
}

/**
 * Create error from serialized data
 */
export function deserializeError(data: SerializedError): EnzymeError {
  const definition = ERROR_CODE_REGISTRY[data.code];

  if (!definition) {
    throw new Error(`Cannot deserialize unknown error code: ${data.code}`);
  }

  return new EnzymeError(definition, data.context);
}

// ============================================================================
// i18n Support
// ============================================================================

/**
 * Error message translations
 */
const translations: Map<string, LocaleConfig> = new Map();

/**
 * Register translations for a locale
 */
export function registerTranslations(locale: string, translationMap: Record<string, string>): void {
  translations.set(locale, {
    locale,
    translations: translationMap,
  });
}

/**
 * Get translated error message
 */
export function getTranslatedMessage(
  code: string,
  locale: string,
  params?: Record<string, unknown>
): string {
  const localeConfig = translations.get(locale);

  if (!localeConfig) {
    // Fallback to English
    const definition = ERROR_CODE_REGISTRY[code];
    return definition?.message || code;
  }

  let message = localeConfig.translations[code] || ERROR_CODE_REGISTRY[code]?.message || code;

  // Replace parameters
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    });
  }

  return message;
}

/**
 * Create localized error
 */
export function createLocalizedError(
  code: string,
  locale: string,
  context?: Partial<ErrorContext>,
  originalError?: Error
): EnzymeError {
  const definition = ERROR_CODE_REGISTRY[code];

  if (!definition) {
    throw new Error(`Unknown error code: ${code}`);
  }

  const localizedMessage = getTranslatedMessage(code, locale);

  return new EnzymeError(
    { ...definition, message: localizedMessage },
    context,
    originalError
  );
}

// ============================================================================
// Extension Interface
// ============================================================================

/**
 * EnzymeExtension type (simplified version for standalone usage)
 */
export interface EnzymeExtension {
  name: string;
  version?: string;
  description?: string;
  client?: Record<string, (...args: unknown[]) => unknown>;
}

/**
 * Errors extension for enzyme framework
 */
export const errorsExtension: EnzymeExtension = {
  name: 'enzyme:errors',
  version: '2.0.0',
  description: 'Comprehensive structured error handling system with fuzzy matching, recovery, and i18n support',

  client: {
    /**
     * Create a structured error
     */
    $createError(
      code: string,
      context?: Partial<ErrorContext>,
      originalError?: Error
    ): EnzymeError {
      return new EnzymeError(code, context, originalError);
    },

    /**
     * Register a custom error code
     */
    $registerErrorCode(code: string, definition: Omit<ErrorCodeDefinition, 'code'>): void {
      ERROR_CODE_REGISTRY[code] = {
        code,
        ...definition,
      };
    },

    /**
     * Get error code suggestions using fuzzy matching
     */
    $getErrorSuggestions(input: string, maxSuggestions = 5): string[] {
      return findSimilarErrorCodes(input, 3, maxSuggestions);
    },

    /**
     * Format error for display
     */
    $formatError(error: unknown): string {
      return formatError(error);
    },

    /**
     * Serialize error for transport
     */
    $serializeError(error: unknown): SerializedError | { message: string } {
      return serializeError(error);
    },

    /**
     * Deserialize error from JSON
     */
    $deserializeError(data: SerializedError): EnzymeError {
      return deserializeError(data);
    },

    /**
     * Type guard for EnzymeError
     */
    $isEnzymeError(error: unknown): boolean {
      return isEnzymeError(error);
    },

    /**
     * Check if error is retryable
     */
    $isRetryableError(error: unknown): boolean {
      return isRetryableError(error);
    },

    /**
     * Retry operation with backoff
     */
    $retryWithBackoff<T>(
      operation: () => Promise<T>,
      config: Partial<RetryConfig> = {}
    ): Promise<T> {
      const defaultConfig: RetryConfig = {
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        exponentialBackoff: true,
      };

      return retryWithBackoff(operation, { ...defaultConfig, ...config });
    },

    /**
     * Execute with recovery strategy
     */
    $executeWithRecovery<T>(
      operation: () => Promise<T>,
      strategy: RecoveryStrategy
    ): Promise<T> {
      return executeWithRecovery(operation, strategy);
    },

    /**
     * Create aggregate error
     */
    $createAggregateError(errors: EnzymeError[], message?: string): AggregateError {
      return new AggregateError(errors, message);
    },

    /**
     * Register translations for a locale
     */
    $registerTranslations(locale: string, translationMap: Record<string, string>): void {
      registerTranslations(locale, translationMap);
    },

    /**
     * Create localized error
     */
    $createLocalizedError(
      code: string,
      locale: string,
      context?: Partial<ErrorContext>,
      originalError?: Error
    ): EnzymeError {
      return createLocalizedError(code, locale, context, originalError);
    },

    /**
     * Get all registered error codes
     */
    $getAllErrorCodes(): string[] {
      return Object.keys(ERROR_CODE_REGISTRY);
    },

    /**
     * Get error codes by domain
     */
    $getErrorCodesByDomain(domain: ErrorDomain): string[] {
      return Object.keys(ERROR_CODE_REGISTRY).filter(
        code => ERROR_CODE_REGISTRY[code].domain === domain
      );
    },

    /**
     * Get error definition
     */
    $getErrorDefinition(code: string): ErrorCodeDefinition | undefined {
      return ERROR_CODE_REGISTRY[code];
    },
  },
};

// ============================================================================
// Default Export
// ============================================================================

export default errorsExtension;
