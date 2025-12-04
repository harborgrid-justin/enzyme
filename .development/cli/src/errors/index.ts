/**
 * @file Enhanced Error System
 * @description Enterprise-grade error handling inspired by Prisma and axios
 *
 * Key patterns implemented:
 * - Prisma: Structured error codes with documentation links
 * - axios: Rich error context with request/response info
 * - socket.io: Error recovery with retry mechanisms
 * - DX research: Helpful error messages with suggestions
 */

// ============================================================================
// Error Code Registry (Prisma Pattern)
// ============================================================================

/**
 * Structured error codes following DOMAIN_CATEGORY_NUMBER pattern
 */
export const ENZYME_ERROR_CODES = {
  // Configuration Errors (CFG_XXX)
  CFG_INVALID_CONFIG: {
    code: 'CFG_001',
    message: 'Invalid configuration file',
    category: 'configuration' as const,
    severity: 'error' as const,
    retryable: false,
    documentation: 'https://enzyme.dev/docs/errors/CFG_001',
  },
  CFG_MISSING_REQUIRED: {
    code: 'CFG_002',
    message: 'Missing required configuration field',
    category: 'configuration' as const,
    severity: 'error' as const,
    retryable: false,
    documentation: 'https://enzyme.dev/docs/errors/CFG_002',
  },
  CFG_INVALID_VALUE: {
    code: 'CFG_003',
    message: 'Invalid configuration value',
    category: 'configuration' as const,
    severity: 'error' as const,
    retryable: false,
    documentation: 'https://enzyme.dev/docs/errors/CFG_003',
  },

  // Generator Errors (GEN_XXX)
  GEN_INVALID_NAME: {
    code: 'GEN_001',
    message: 'Invalid generator name',
    category: 'generator' as const,
    severity: 'error' as const,
    retryable: false,
    documentation: 'https://enzyme.dev/docs/errors/GEN_001',
  },
  GEN_FILE_EXISTS: {
    code: 'GEN_002',
    message: 'File already exists',
    category: 'generator' as const,
    severity: 'warning' as const,
    retryable: false,
    documentation: 'https://enzyme.dev/docs/errors/GEN_002',
  },
  GEN_TEMPLATE_NOT_FOUND: {
    code: 'GEN_003',
    message: 'Template not found',
    category: 'generator' as const,
    severity: 'error' as const,
    retryable: false,
    documentation: 'https://enzyme.dev/docs/errors/GEN_003',
  },
  GEN_VALIDATION_FAILED: {
    code: 'GEN_004',
    message: 'Validation failed',
    category: 'generator' as const,
    severity: 'error' as const,
    retryable: false,
    documentation: 'https://enzyme.dev/docs/errors/GEN_004',
  },

  // Plugin Errors (PLG_XXX)
  PLG_NOT_FOUND: {
    code: 'PLG_001',
    message: 'Plugin not found',
    category: 'plugin' as const,
    severity: 'error' as const,
    retryable: true,
    documentation: 'https://enzyme.dev/docs/errors/PLG_001',
  },
  PLG_INVALID_STRUCTURE: {
    code: 'PLG_002',
    message: 'Invalid plugin structure',
    category: 'plugin' as const,
    severity: 'error' as const,
    retryable: false,
    documentation: 'https://enzyme.dev/docs/errors/PLG_002',
  },
  PLG_HOOK_FAILED: {
    code: 'PLG_003',
    message: 'Plugin hook execution failed',
    category: 'plugin' as const,
    severity: 'error' as const,
    retryable: true,
    documentation: 'https://enzyme.dev/docs/errors/PLG_003',
  },

  // File System Errors (FS_XXX)
  FS_READ_ERROR: {
    code: 'FS_001',
    message: 'Failed to read file',
    category: 'filesystem' as const,
    severity: 'error' as const,
    retryable: true,
    documentation: 'https://enzyme.dev/docs/errors/FS_001',
  },
  FS_WRITE_ERROR: {
    code: 'FS_002',
    message: 'Failed to write file',
    category: 'filesystem' as const,
    severity: 'error' as const,
    retryable: true,
    documentation: 'https://enzyme.dev/docs/errors/FS_002',
  },
  FS_PERMISSION_DENIED: {
    code: 'FS_003',
    message: 'Permission denied',
    category: 'filesystem' as const,
    severity: 'error' as const,
    retryable: false,
    documentation: 'https://enzyme.dev/docs/errors/FS_003',
  },
  FS_DISK_FULL: {
    code: 'FS_004',
    message: 'Disk space is full',
    category: 'filesystem' as const,
    severity: 'error' as const,
    retryable: false,
    documentation: 'https://enzyme.dev/docs/errors/FS_004',
  },

  // Command Errors (CMD_XXX)
  CMD_NOT_FOUND: {
    code: 'CMD_001',
    message: 'Command not found',
    category: 'command' as const,
    severity: 'error' as const,
    retryable: false,
    documentation: 'https://enzyme.dev/docs/errors/CMD_001',
  },
  CMD_INVALID_ARGS: {
    code: 'CMD_002',
    message: 'Invalid command arguments',
    category: 'command' as const,
    severity: 'error' as const,
    retryable: false,
    documentation: 'https://enzyme.dev/docs/errors/CMD_002',
  },
  CMD_EXECUTION_FAILED: {
    code: 'CMD_003',
    message: 'Command execution failed',
    category: 'command' as const,
    severity: 'error' as const,
    retryable: true,
    documentation: 'https://enzyme.dev/docs/errors/CMD_003',
  },

  // Extension Errors (EXT_XXX)
  EXT_NOT_FOUND: {
    code: 'EXT_001',
    message: 'Extension not found',
    category: 'extension' as const,
    severity: 'error' as const,
    retryable: false,
    documentation: 'https://enzyme.dev/docs/errors/EXT_001',
  },
  EXT_INVALID_HOOK: {
    code: 'EXT_002',
    message: 'Invalid extension hook',
    category: 'extension' as const,
    severity: 'error' as const,
    retryable: false,
    documentation: 'https://enzyme.dev/docs/errors/EXT_002',
  },
  EXT_COMPOSITION_ERROR: {
    code: 'EXT_003',
    message: 'Extension composition failed',
    category: 'extension' as const,
    severity: 'error' as const,
    retryable: false,
    documentation: 'https://enzyme.dev/docs/errors/EXT_003',
  },
} as const;

export type EnzymeErrorCode = keyof typeof ENZYME_ERROR_CODES;

// ============================================================================
// Error Categories and Severity
// ============================================================================

export type ErrorCategory =
  | 'configuration'
  | 'generator'
  | 'plugin'
  | 'filesystem'
  | 'command'
  | 'extension'
  | 'validation'
  | 'unknown';

export type ErrorSeverity = 'error' | 'warning' | 'info';

// ============================================================================
// Enhanced Error Class
// ============================================================================

export interface EnzymeErrorOptions {
  code?: EnzymeErrorCode;
  category?: ErrorCategory;
  severity?: ErrorSeverity;
  cause?: Error;
  context?: Record<string, unknown>;
  suggestions?: string[];
  helpUrl?: string;
  retryable?: boolean;
}

/**
 * Enhanced Enzyme Error with rich context and suggestions
 *
 * @example
 * throw new EnzymeError('Component name is invalid', {
 *   code: 'GEN_INVALID_NAME',
 *   context: { name: 'my-component' },
 *   suggestions: [
 *     'Use PascalCase for component names (e.g., MyComponent)',
 *     'Avoid special characters except underscores',
 *   ],
 * });
 */
export class EnzymeError extends Error {
  /** Error code for programmatic handling */
  readonly code: string;
  /** Error category */
  readonly category: ErrorCategory;
  /** Error severity */
  readonly severity: ErrorSeverity;
  /** Original error that caused this */
  readonly cause?: Error;
  /** Additional context */
  readonly context: Record<string, unknown>;
  /** Helpful suggestions for resolving the error */
  readonly suggestions: string[];
  /** Link to documentation */
  readonly helpUrl?: string;
  /** Whether this error is retryable */
  readonly retryable: boolean;
  /** Timestamp when error occurred */
  readonly timestamp: number;

  constructor(message: string, options: EnzymeErrorOptions = {}) {
    super(message);
    this.name = 'EnzymeError';

    // Get error template from registry
    const template = options.code ? ENZYME_ERROR_CODES[options.code] : null;

    this.code = template?.code ?? options.code ?? 'UNKNOWN';
    this.category = options.category ?? template?.category ?? 'unknown';
    this.severity = options.severity ?? template?.severity ?? 'error';
    this.cause = options.cause;
    this.context = options.context ?? {};
    this.suggestions = options.suggestions ?? [];
    this.helpUrl = options.helpUrl ?? template?.documentation;
    this.retryable = options.retryable ?? template?.retryable ?? false;
    this.timestamp = Date.now();

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EnzymeError);
    }
  }

  /**
   * Format error for console output with colors
   */
  format(colorize = true): string {
    const red = colorize ? '\x1b[31m' : '';
    const yellow = colorize ? '\x1b[33m' : '';
    const cyan = colorize ? '\x1b[36m' : '';
    const gray = colorize ? '\x1b[90m' : '';
    const bold = colorize ? '\x1b[1m' : '';
    const reset = colorize ? '\x1b[0m' : '';

    let output = '';

    // Error header
    output += `${red}${bold}✖ ${this.name}${reset} ${gray}[${this.code}]${reset}\n`;
    output += `  ${this.message}\n`;

    // Context
    if (Object.keys(this.context).length > 0) {
      output += `\n${cyan}Context:${reset}\n`;
      for (const [key, value] of Object.entries(this.context)) {
        output += `  ${gray}${key}:${reset} ${JSON.stringify(value)}\n`;
      }
    }

    // Suggestions
    if (this.suggestions.length > 0) {
      output += `\n${yellow}💡 Suggestions:${reset}\n`;
      for (const suggestion of this.suggestions) {
        output += `  • ${suggestion}\n`;
      }
    }

    // Help URL
    if (this.helpUrl) {
      output += `\n${cyan}📚 Learn more:${reset} ${this.helpUrl}\n`;
    }

    // Cause chain
    if (this.cause) {
      output += `\n${gray}Caused by: ${this.cause.message}${reset}\n`;
    }

    return output;
  }

  /**
   * Convert to JSON for logging/telemetry
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      severity: this.severity,
      context: this.context,
      suggestions: this.suggestions,
      helpUrl: this.helpUrl,
      retryable: this.retryable,
      timestamp: this.timestamp,
      stack: this.stack,
      cause: this.cause ? {
        name: this.cause.name,
        message: this.cause.message,
        stack: this.cause.stack,
      } : undefined,
    };
  }
}

// ============================================================================
// Error Factory Functions
// ============================================================================

/**
 * Create an Enzyme error from an error code
 */
export function createError(
  code: EnzymeErrorCode,
  message?: string,
  options?: Omit<EnzymeErrorOptions, 'code'>
): EnzymeError {
  const template = ENZYME_ERROR_CODES[code];
  return new EnzymeError(message ?? template.message, {
    ...options,
    code,
  });
}

/**
 * Create a configuration error
 */
export function createConfigError(
  message: string,
  options?: Omit<EnzymeErrorOptions, 'category'>
): EnzymeError {
  return new EnzymeError(message, {
    ...options,
    category: 'configuration',
    code: options?.code ?? 'CFG_INVALID_CONFIG',
  });
}

/**
 * Create a generator error
 */
export function createGeneratorError(
  message: string,
  options?: Omit<EnzymeErrorOptions, 'category'>
): EnzymeError {
  return new EnzymeError(message, {
    ...options,
    category: 'generator',
    code: options?.code ?? 'GEN_VALIDATION_FAILED',
  });
}

/**
 * Create a file system error
 */
export function createFileSystemError(
  message: string,
  options?: Omit<EnzymeErrorOptions, 'category'>
): EnzymeError {
  return new EnzymeError(message, {
    ...options,
    category: 'filesystem',
    code: options?.code ?? 'FS_READ_ERROR',
  });
}

/**
 * Create a plugin error
 */
export function createPluginError(
  message: string,
  options?: Omit<EnzymeErrorOptions, 'category'>
): EnzymeError {
  return new EnzymeError(message, {
    ...options,
    category: 'plugin',
    code: options?.code ?? 'PLG_HOOK_FAILED',
  });
}

/**
 * Create an extension error
 */
export function createExtensionError(
  message: string,
  options?: Omit<EnzymeErrorOptions, 'category'>
): EnzymeError {
  return new EnzymeError(message, {
    ...options,
    category: 'extension',
    code: options?.code ?? 'EXT_INVALID_HOOK',
  });
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if an error is an EnzymeError
 */
export function isEnzymeError(error: unknown): error is EnzymeError {
  return error instanceof EnzymeError;
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (isEnzymeError(error)) {
    return error.retryable;
  }
  return false;
}

// ============================================================================
// Error Suggestions Generator
// ============================================================================

/**
 * Generate suggestions based on error type and context
 */
export function generateSuggestions(
  code: EnzymeErrorCode,
  context: Record<string, unknown> = {}
): string[] {
  const suggestions: string[] = [];

  switch (code) {
    case 'GEN_INVALID_NAME':
      suggestions.push(
        'Use PascalCase for component names (e.g., MyComponent)',
        'Use camelCase starting with "use" for hooks (e.g., useMyHook)',
        'Avoid special characters except underscores',
        'Names must start with a letter'
      );
      break;

    case 'GEN_FILE_EXISTS':
      suggestions.push(
        'Use --force flag to overwrite existing files',
        'Choose a different name for the component',
        'Delete the existing file manually if it\'s no longer needed'
      );
      if (context.path) {
        suggestions.push(`File location: ${context.path}`);
      }
      break;

    case 'GEN_TEMPLATE_NOT_FOUND':
      suggestions.push(
        'Check the template name is spelled correctly',
        'Run "enzyme generate --help" to see available templates',
        'Custom templates should be in the templates/ directory'
      );
      break;

    case 'CFG_INVALID_CONFIG':
      suggestions.push(
        'Run "enzyme config validate" to check your configuration',
        'Run "enzyme config init" to create a new configuration file',
        'Check the configuration documentation for valid options'
      );
      break;

    case 'PLG_NOT_FOUND':
      suggestions.push(
        'Install the plugin: npm install <plugin-name>',
        'Check the plugin name is spelled correctly in your config',
        'Ensure the plugin is listed in package.json dependencies'
      );
      break;

    case 'FS_PERMISSION_DENIED':
      suggestions.push(
        'Check file/directory permissions',
        'Try running with elevated privileges (not recommended)',
        'Ensure the target directory is not read-only'
      );
      break;

    case 'CMD_NOT_FOUND':
      suggestions.push(
        'Run "enzyme --help" to see available commands',
        'Check for typos in the command name'
      );
      if (context.input && typeof context.input === 'string') {
        const similar = findSimilarCommands(context.input);
        if (similar.length > 0) {
          suggestions.push(`Did you mean: ${similar.join(', ')}?`);
        }
      }
      break;

    default:
      suggestions.push(
        'Check the documentation for more information',
        'Run with --verbose flag for detailed output',
        'Report this issue on GitHub if it persists'
      );
  }

  return suggestions;
}

/**
 * Find similar commands using Levenshtein distance
 */
function findSimilarCommands(input: string): string[] {
  const commands = ['new', 'generate', 'config', 'add', 'remove', 'analyze', 'migrate', 'docs', 'upgrade', 'validate', 'doctor', 'info'];
  const threshold = 3; // Max edit distance

  return commands
    .map(cmd => ({ cmd, distance: levenshteinDistance(input.toLowerCase(), cmd) }))
    .filter(({ distance }) => distance <= threshold)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3)
    .map(({ cmd }) => cmd);
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

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

// ============================================================================
// Error Handler
// ============================================================================

/**
 * Global error handler for CLI
 */
export function handleError(error: unknown, verbose = false): void {
  if (isEnzymeError(error)) {
    console.error(error.format(true));

    if (verbose && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
  } else if (error instanceof Error) {
    console.error(`\n✖ Error: ${error.message}`);

    if (verbose && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
  } else {
    console.error('\n✖ An unexpected error occurred:', error);
  }

  console.error('\n💡 Run with --verbose for more details');
  console.error('📚 Documentation: https://enzyme.dev/docs');
}
