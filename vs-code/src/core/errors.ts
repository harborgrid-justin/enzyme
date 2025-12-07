/**
 * Comprehensive Error Types and Hierarchies for Enzyme VS Code Extension
 *
 * This module provides a structured error handling system with:
 * - Custom error classes with context and metadata
 * - Error codes for categorization and telemetry
 * - Stack trace enrichment
 * - User-friendly error messages
 * - Recovery suggestions
 *
 * @module errors
 */

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  /** Minor issue, extension continues normally */
  LOW = 'low',
  /** Notable issue, some functionality may be affected */
  MEDIUM = 'medium',
  /** Serious issue, significant functionality impaired */
  HIGH = 'high',
  /** Critical issue, extension may be unusable */
  CRITICAL = 'critical',
}

/**
 * Error category for classification and routing
 */
export enum ErrorCategory {
  /** File system operations */
  FILE_SYSTEM = 'FileSystem',
  /** Network and API calls */
  NETWORK = 'Network',
  /** Parsing and syntax errors */
  PARSE = 'Parse',
  /** Configuration errors */
  CONFIGURATION = 'Configuration',
  /** User input validation */
  VALIDATION = 'Validation',
  /** Internal extension logic */
  INTERNAL = 'Internal',
  /** Workspace and project structure */
  WORKSPACE = 'Workspace',
  /** Command execution */
  COMMAND = 'Command',
  /** Provider operations */
  PROVIDER = 'Provider',
  /** Telemetry and analytics */
  TELEMETRY = 'Telemetry',
  /** Authentication and authorization */
  AUTH = 'Auth',
  /** Unknown or uncategorized */
  UNKNOWN = 'Unknown',
}

/**
 * Error codes for specific error types
 * Format: {CATEGORY}_{SPECIFIC_ERROR}_{NUMBER}
 */
export enum ErrorCode {
  // File System Errors (1xxx)
  FILE_NOT_FOUND = 'FS_NOT_FOUND_1001',
  FILE_READ_ERROR = 'FS_READ_ERROR_1002',
  FILE_WRITE_ERROR = 'FS_WRITE_ERROR_1003',
  FILE_PERMISSION_DENIED = 'FS_PERMISSION_DENIED_1004',
  DIRECTORY_NOT_FOUND = 'FS_DIR_NOT_FOUND_1005',
  DIRECTORY_CREATE_ERROR = 'FS_DIR_CREATE_ERROR_1006',

  // Network Errors (2xxx)
  NETWORK_TIMEOUT = 'NET_TIMEOUT_2001',
  NETWORK_UNREACHABLE = 'NET_UNREACHABLE_2002',
  API_ERROR = 'NET_API_ERROR_2003',
  API_RATE_LIMIT = 'NET_RATE_LIMIT_2004',
  API_AUTH_FAILED = 'NET_AUTH_FAILED_2005',

  // Parse Errors (3xxx)
  JSON_PARSE_ERROR = 'PARSE_JSON_3001',
  TS_PARSE_ERROR = 'PARSE_TS_3002',
  CONFIG_PARSE_ERROR = 'PARSE_CONFIG_3003',
  INVALID_SYNTAX = 'PARSE_SYNTAX_3004',

  // Configuration Errors (4xxx)
  CONFIG_NOT_FOUND = 'CFG_NOT_FOUND_4001',
  CONFIG_INVALID = 'CFG_INVALID_4002',
  CONFIG_VALIDATION_ERROR = 'CFG_VALIDATION_4003',
  CONFIG_MIGRATION_ERROR = 'CFG_MIGRATION_4004',

  // Validation Errors (5xxx)
  VALIDATION_FAILED = 'VAL_FAILED_5001',
  INVALID_INPUT = 'VAL_INVALID_INPUT_5002',
  MISSING_REQUIRED = 'VAL_MISSING_REQUIRED_5003',
  INVALID_FORMAT = 'VAL_INVALID_FORMAT_5004',

  // Internal Errors (6xxx)
  INTERNAL_ERROR = 'INT_ERROR_6001',
  NOT_IMPLEMENTED = 'INT_NOT_IMPLEMENTED_6002',
  ASSERTION_FAILED = 'INT_ASSERTION_6003',
  STATE_CORRUPTION = 'INT_STATE_CORRUPT_6004',

  // Workspace Errors (7xxx)
  NO_WORKSPACE = 'WS_NO_WORKSPACE_7001',
  WORKSPACE_NOT_ENZYME = 'WS_NOT_ENZYME_7002',
  WORKSPACE_ANALYSIS_FAILED = 'WS_ANALYSIS_FAILED_7003',
  WORKSPACE_CACHE_ERROR = 'WS_CACHE_ERROR_7004',

  // Command Errors (8xxx)
  COMMAND_FAILED = 'CMD_FAILED_8001',
  COMMAND_CANCELLED = 'CMD_CANCELLED_8002',
  COMMAND_TIMEOUT = 'CMD_TIMEOUT_8003',
  COMMAND_INVALID_ARGS = 'CMD_INVALID_ARGS_8004',

  // Provider Errors (9xxx)
  PROVIDER_INIT_FAILED = 'PROV_INIT_FAILED_9001',
  PROVIDER_OPERATION_FAILED = 'PROV_OP_FAILED_9002',
  PROVIDER_NOT_READY = 'PROV_NOT_READY_9003',

  // Telemetry Errors (10xxx)
  TELEMETRY_SEND_FAILED = 'TEL_SEND_FAILED_10001',
  TELEMETRY_DISABLED = 'TEL_DISABLED_10002',

  // Unknown
  UNKNOWN = 'UNKNOWN_0000',
}

/**
 * Error context interface for additional metadata
 */
export interface ErrorContext {
  /** File path related to the error */
  filePath?: string;
  /** Line number where error occurred */
  line?: number;
  /** Column number where error occurred */
  column?: number;
  /** Component or module name */
  component?: string;
  /** Operation being performed */
  operation?: string;
  /** User input that caused the error */
  userInput?: unknown;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Original error if this is a wrapped error */
  originalError?: Error;
  /** Timestamp when error occurred */
  timestamp?: number;
}

/**
 * Recovery action that can be suggested to users
 */
export interface RecoveryAction {
  /** Action label for UI */
  label: string;
  /** Action description */
  description?: string;
  /** Action handler function */
  handler: () => void | Promise<void>;
  /** Whether this is a primary action */
  primary?: boolean;
}

/**
 * Base error class for all Enzyme extension errors
 *
 * @example
 * ```typescript
 * throw new EnzymeError(
 *   'Failed to load configuration',
 *   ErrorCode.CONFIG_NOT_FOUND,
 *   ErrorCategory.CONFIGURATION,
 *   ErrorSeverity.HIGH,
 *   { filePath: '/path/to/enzyme.config.ts' }
 * );
 * ```
 */
export class EnzymeError extends Error {
  /** Error code for categorization */
  public readonly code: ErrorCode;
  /** Error category */
  public readonly category: ErrorCategory;
  /** Error severity */
  public readonly severity: ErrorSeverity;
  /** Additional context */
  public readonly context: ErrorContext;
  /** User-friendly message */
  public readonly userMessage: string;
  /** Recovery suggestions */
  public readonly recoverySuggestions: string[];
  /** Recovery actions */
  public readonly recoveryActions: RecoveryAction[];
  /** Whether error should be reported to telemetry */
  public readonly reportable: boolean;

  /**
   * Creates a new EnzymeError
   *
   * @param message - Technical error message for logging
   * @param code - Error code for categorization
   * @param category - Error category
   * @param severity - Error severity level
   * @param context - Additional error context
   * @param userMessage - User-friendly error message (defaults to message)
   * @param recoverySuggestions - Suggestions for recovering from error
   * @param recoveryActions - Actions user can take to recover
   * @param reportable - Whether error should be reported to telemetry
   */
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context: ErrorContext = {},
    userMessage?: string,
    recoverySuggestions: string[] = [],
    recoveryActions: RecoveryAction[] = [],
    reportable = true
  ) {
    super(message);
    this.name = 'EnzymeError';
    this.code = code;
    this.category = category;
    this.severity = severity;
    this.context = {
      ...context,
      timestamp: context.timestamp || Date.now(),
    };
    this.userMessage = userMessage || message;
    this.recoverySuggestions = recoverySuggestions;
    this.recoveryActions = recoveryActions;
    this.reportable = reportable;

    // Capture stack trace (check if available)
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON for serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      severity: this.severity,
      userMessage: this.userMessage,
      context: this.context,
      recoverySuggestions: this.recoverySuggestions,
      stack: this.stack,
    };
  }

  /**
   * Convert error to string representation
   */
  override toString(): string {
    return `${this.name} [${this.code}]: ${this.message}`;
  }
}

/**
 * File system operation errors
 */
export class FileSystemError extends EnzymeError {
  /**
   *
   * @param message
   * @param code
   * @param context
   * @param userMessage
   */
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.FILE_NOT_FOUND,
    context: ErrorContext = {},
    userMessage?: string
  ) {
    super(
      message,
      code,
      ErrorCategory.FILE_SYSTEM,
      ErrorSeverity.MEDIUM,
      context,
      userMessage,
      ['Check if the file exists', 'Verify file permissions', 'Try refreshing the workspace']
    );
    this.name = 'FileSystemError';
  }
}

/**
 * Network and API errors
 */
export class NetworkError extends EnzymeError {
  /**
   *
   * @param message
   * @param code
   * @param context
   * @param userMessage
   */
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.NETWORK_TIMEOUT,
    context: ErrorContext = {},
    userMessage?: string
  ) {
    super(
      message,
      code,
      ErrorCategory.NETWORK,
      ErrorSeverity.MEDIUM,
      context,
      userMessage,
      ['Check your internet connection', 'Verify API endpoint configuration', 'Try again later']
    );
    this.name = 'NetworkError';
  }
}

/**
 * Parse errors
 */
export class ParseError extends EnzymeError {
  /**
   *
   * @param message
   * @param code
   * @param context
   * @param userMessage
   */
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.INVALID_SYNTAX,
    context: ErrorContext = {},
    userMessage?: string
  ) {
    super(
      message,
      code,
      ErrorCategory.PARSE,
      ErrorSeverity.MEDIUM,
      context,
      userMessage,
      ['Check syntax in the file', 'Validate JSON/TypeScript structure', 'Review documentation']
    );
    this.name = 'ParseError';
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends EnzymeError {
  /**
   *
   * @param message
   * @param code
   * @param context
   * @param userMessage
   */
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.CONFIG_INVALID,
    context: ErrorContext = {},
    userMessage?: string
  ) {
    super(
      message,
      code,
      ErrorCategory.CONFIGURATION,
      ErrorSeverity.HIGH,
      context,
      userMessage,
      ['Check enzyme.config.ts', 'Review configuration documentation', 'Validate configuration schema']
    );
    this.name = 'ConfigurationError';
  }
}

/**
 * Validation errors
 */
export class ValidationError extends EnzymeError {
  /**
   *
   * @param message
   * @param code
   * @param context
   * @param userMessage
   */
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.VALIDATION_FAILED,
    context: ErrorContext = {},
    userMessage?: string
  ) {
    super(
      message,
      code,
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW,
      context,
      userMessage,
      ['Check input values', 'Review validation requirements', 'See documentation for valid formats']
    );
    this.name = 'ValidationError';
  }
}

/**
 * Workspace errors
 */
export class WorkspaceError extends EnzymeError {
  /**
   *
   * @param message
   * @param code
   * @param context
   * @param userMessage
   */
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.NO_WORKSPACE,
    context: ErrorContext = {},
    userMessage?: string
  ) {
    super(
      message,
      code,
      ErrorCategory.WORKSPACE,
      ErrorSeverity.HIGH,
      context,
      userMessage,
      ['Open a workspace folder', 'Verify Enzyme project structure', 'Check package.json for Enzyme dependencies']
    );
    this.name = 'WorkspaceError';
  }
}

/**
 * Command execution errors
 */
export class CommandError extends EnzymeError {
  /**
   *
   * @param message
   * @param code
   * @param context
   * @param userMessage
   */
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.COMMAND_FAILED,
    context: ErrorContext = {},
    userMessage?: string
  ) {
    super(
      message,
      code,
      ErrorCategory.COMMAND,
      ErrorSeverity.MEDIUM,
      context,
      userMessage,
      ['Try running the command again', 'Check command arguments', 'View logs for more details']
    );
    this.name = 'CommandError';
  }
}

/**
 * Provider errors
 */
export class ProviderError extends EnzymeError {
  /**
   *
   * @param message
   * @param code
   * @param context
   * @param userMessage
   */
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.PROVIDER_OPERATION_FAILED,
    context: ErrorContext = {},
    userMessage?: string
  ) {
    super(
      message,
      code,
      ErrorCategory.PROVIDER,
      ErrorSeverity.MEDIUM,
      context,
      userMessage,
      ['Reload VS Code window', 'Check provider configuration', 'Disable and re-enable the extension']
    );
    this.name = 'ProviderError';
  }
}

/**
 * Utility functions for error handling
 */

/**
 * Wrap an unknown error into an EnzymeError
 *
 * @param error - The error to wrap
 * @param defaultMessage - Default message if error is not an Error object
 * @param context - Additional context
 * @returns EnzymeError instance
 *
 * @example
 * ```typescript
 * try {
 *   // some operation
 * } catch (error) {
 *   throw wrapError(error, 'Failed to perform operation', { component: 'MyComponent' });
 * }
 * ```
 */
export function wrapError(
  error: unknown,
  defaultMessage = 'An unexpected error occurred',
  context: ErrorContext = {}
): EnzymeError {
  if (error instanceof EnzymeError) {
    // Already an EnzymeError, just add additional context
    return new EnzymeError(
      error.message,
      error.code,
      error.category,
      error.severity,
      { ...error.context, ...context, originalError: error },
      error.userMessage,
      error.recoverySuggestions,
      error.recoveryActions,
      error.reportable
    );
  }

  if (error instanceof Error) {
    return new EnzymeError(
      error.message,
      ErrorCode.UNKNOWN,
      ErrorCategory.UNKNOWN,
      ErrorSeverity.MEDIUM,
      { ...context, originalError: error },
      defaultMessage
    );
  }

  // Not an Error object
  return new EnzymeError(
    String(error),
    ErrorCode.UNKNOWN,
    ErrorCategory.UNKNOWN,
    ErrorSeverity.MEDIUM,
    context,
    defaultMessage
  );
}

/**
 * Check if an error is of a specific type
 *
 * @param error - Error to check
 * @param errorType - Error constructor to check against
 * @returns True if error is of the specified type
 *
 * @example
 * ```typescript
 * if (isErrorOfType(error, FileSystemError)) {
 *   // Handle file system error
 * }
 * ```
 */
export function isErrorOfType<T extends EnzymeError>(
  error: unknown,
  errorType: new (...args: any[]) => T
): error is T {
  return error instanceof errorType;
}

/**
 * Check if an error has a specific error code
 *
 * @param error - Error to check
 * @param code - Error code to check for
 * @returns True if error has the specified code
 *
 * @example
 * ```typescript
 * if (hasErrorCode(error, ErrorCode.FILE_NOT_FOUND)) {
 *   // Handle file not found
 * }
 * ```
 */
export function hasErrorCode(error: unknown, code: ErrorCode): boolean {
  return error instanceof EnzymeError && error.code === code;
}

/**
 * Extract user-friendly message from any error
 *
 * @param error - Error to extract message from
 * @param defaultMessage - Default message if no user message available
 * @returns User-friendly error message
 *
 * @example
 * ```typescript
 * const message = getUserMessage(error, 'Something went wrong');
 * vscode.window.showErrorMessage(message);
 * ```
 */
export function getUserMessage(error: unknown, defaultMessage = 'An error occurred'): string {
  if (error instanceof EnzymeError) {
    return error.userMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return defaultMessage;
}

/**
 * Get recovery suggestions from an error
 *
 * @param error - Error to get suggestions from
 * @returns Array of recovery suggestions
 *
 * @example
 * ```typescript
 * const suggestions = getRecoverySuggestions(error);
 * suggestions.forEach(s => console.log('Try:', s));
 * ```
 */
export function getRecoverySuggestions(error: unknown): string[] {
  if (error instanceof EnzymeError) {
    return error.recoverySuggestions;
  }
  return [];
}

/**
 * Format error for logging
 *
 * @param error - Error to format
 * @param includeStack - Whether to include stack trace
 * @returns Formatted error string
 *
 * @example
 * ```typescript
 * logger.error(formatErrorForLogging(error, true));
 * ```
 */
export function formatErrorForLogging(error: unknown, includeStack = true): string {
  if (error instanceof EnzymeError) {
    let formatted = `[${error.code}] ${error.category}: ${error.message}`;

    if (error.context.filePath) {
      formatted += `\n  File: ${error.context.filePath}`;
    }

    if (error.context.line !== undefined) {
      formatted += `:${error.context.line}`;
      if (error.context.column !== undefined) {
        formatted += `:${error.context.column}`;
      }
    }

    if (error.context.component) {
      formatted += `\n  Component: ${error.context.component}`;
    }

    if (error.context.operation) {
      formatted += `\n  Operation: ${error.context.operation}`;
    }

    if (includeStack && error.stack) {
      formatted += `\n  Stack: ${error.stack}`;
    }

    return formatted;
  }

  if (error instanceof Error) {
    let formatted = `${error.name}: ${error.message}`;
    if (includeStack && error.stack) {
      formatted += `\n${error.stack}`;
    }
    return formatted;
  }

  return String(error);
}

/**
 * Create a timeout error
 *
 * @param operation - Operation that timed out
 * @param timeout - Timeout duration in ms
 * @param context - Additional context
 * @returns CommandError for timeout
 *
 * @example
 * ```typescript
 * throw createTimeoutError('API call', 5000);
 * ```
 */
export function createTimeoutError(
  operation: string,
  timeout: number,
  context: ErrorContext = {}
): CommandError {
  return new CommandError(
    `Operation '${operation}' timed out after ${timeout}ms`,
    ErrorCode.COMMAND_TIMEOUT,
    { ...context, operation },
    `The operation took too long to complete (timeout: ${timeout}ms)`
  );
}

/**
 * Create a not implemented error
 *
 * @param feature - Feature that is not implemented
 * @param context - Additional context
 * @returns EnzymeError for not implemented
 *
 * @example
 * ```typescript
 * throw createNotImplementedError('Export to PDF');
 * ```
 */
export function createNotImplementedError(
  feature: string,
  context: ErrorContext = {}
): EnzymeError {
  return new EnzymeError(
    `Feature '${feature}' is not yet implemented`,
    ErrorCode.NOT_IMPLEMENTED,
    ErrorCategory.INTERNAL,
    ErrorSeverity.LOW,
    context,
    `${feature} is coming soon!`,
    ['Check documentation for workarounds', 'Watch for updates']
  );
}
