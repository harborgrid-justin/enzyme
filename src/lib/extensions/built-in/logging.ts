/**
 * @file Enterprise Logging Extension
 * @description Comprehensive logging system for React applications with enterprise-grade features
 *
 * @version 2.0.0
 * @author Enzyme Team
 * @license MIT
 *
 * ## Features
 *
 * 1. **Structured Logging** - Six log levels (trace, debug, info, warn, error, fatal)
 * 2. **Operation Tracking** - Track React lifecycle, API calls, state changes
 * 3. **Context Injection** - Automatic correlationId, userId, sessionId, requestId
 * 4. **Log Formatters** - JSON, human-readable, browser console with colors
 * 5. **Transport System** - Console, localStorage, remote endpoint, custom transports
 * 6. **Log Buffering** - Batch logs for performance with configurable flush intervals
 * 7. **Log Filtering** - Filter by level, category, pattern, or custom predicate
 * 8. **Performance Metrics** - Automatic timing of operations with thresholds
 * 9. **Breadcrumbs** - Track user actions for debugging (last N actions)
 * 10. **Sensitive Data Masking** - Automatic PII masking for compliance
 *
 * @example Basic Usage
 * ```typescript
 * import { loggingExtension } from '@defendr/enzyme/extensions/built-in';
 *
 * // In your app initialization
 * const logger = loggingExtension.initialize({
 *   level: 'info',
 *   enableBreadcrumbs: true,
 *   bufferSize: 100,
 *   flushInterval: 5000,
 * });
 *
 * // Use client methods
 * logger.$log('info', 'User logged in', { userId: '123' });
 * logger.$startOperation('fetchUserData');
 * // ... async operation
 * logger.$endOperation('fetchUserData');
 * logger.$addBreadcrumb({ type: 'navigation', message: 'User navigated to /dashboard' });
 * ```
 *
 * @example With React
 * ```typescript
 * import { useLogger } from '@defendr/enzyme/extensions/built-in';
 *
 * function MyComponent() {
 *   const logger = useLogger();
 *
 *   useEffect(() => {
 *     const op = logger.$startOperation('componentMount');
 *     // ... initialization
 *     logger.$endOperation(op);
 *   }, []);
 *
 *   return <div>My Component</div>;
 * }
 * ```
 *
 * @example Remote Logging
 * ```typescript
 * logger.addTransport({
 *   name: 'remote',
 *   async write(entries) {
 *     await fetch('/api/logs', {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify(entries),
 *     });
 *   },
 * });
 * ```
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5,
}

/**
 * Log level names for human readability
 */
export type LogLevelName = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Map log level names to enum values
 */
export const LOG_LEVEL_MAP: Record<LogLevelName, LogLevel> = {
  trace: LogLevel.TRACE,
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR,
  fatal: LogLevel.FATAL,
};

/**
 * Operation category for tracking
 */
export type OperationCategory =
  | 'lifecycle'
  | 'api'
  | 'state'
  | 'navigation'
  | 'user-action'
  | 'render'
  | 'custom';

/**
 * Breadcrumb type for user action tracking
 */
export interface Breadcrumb {
  /** Timestamp when breadcrumb was created */
  timestamp: number;
  /** Type of action */
  type: 'navigation' | 'user-action' | 'api' | 'state-change' | 'error' | 'custom';
  /** Human-readable message */
  message: string;
  /** Additional metadata */
  data?: Record<string, unknown>;
  /** Severity level */
  level?: LogLevelName;
}

/**
 * Log context for correlation and debugging
 */
export interface LogContext {
  /** Correlation ID for tracking requests across services */
  correlationId?: string;
  /** User ID for user-specific logs */
  userId?: string;
  /** Session ID for session tracking */
  sessionId?: string;
  /** Request ID for tracking individual requests */
  requestId?: string;
  /** Component name for React component logs */
  component?: string;
  /** Additional custom context */
  [key: string]: unknown;
}

/**
 * Log entry structure
 */
export interface LogEntry {
  /** Unique log entry ID */
  id: string;
  /** Timestamp in milliseconds */
  timestamp: number;
  /** ISO 8601 timestamp string */
  timestampISO: string;
  /** Log level */
  level: LogLevel;
  /** Log level name */
  levelName: LogLevelName;
  /** Log message */
  message: string;
  /** Log context */
  context: LogContext;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Error object if applicable */
  error?: Error;
  /** Stack trace if error */
  stack?: string;
  /** Operation name if tracking operation */
  operation?: string;
  /** Operation category */
  category?: OperationCategory;
  /** Operation duration in ms */
  duration?: number;
}

/**
 * Operation tracking info
 */
export interface OperationInfo {
  /** Operation name */
  name: string;
  /** Operation category */
  category: OperationCategory;
  /** Start time */
  startTime: number;
  /** Context at operation start */
  context: LogContext;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Log formatter function
 */
export type LogFormatter = (entry: LogEntry) => string;

/**
 * Log transport for sending logs to different destinations
 */
export interface LogTransport {
  /** Transport name */
  name: string;
  /** Minimum log level for this transport */
  level?: LogLevel;
  /** Write log entries */
  write: (entries: LogEntry[]) => Promise<void> | void;
  /** Flush any buffered logs */
  flush?: () => Promise<void> | void;
  /** Transport-specific formatter */
  formatter?: LogFormatter;
}

/**
 * Log filter predicate
 */
export type LogFilter = (entry: LogEntry) => boolean;

/**
 * Logger configuration
 */
export interface LoggerConfig {
  /** Minimum log level to capture */
  level?: LogLevelName;
  /** Enable breadcrumb tracking */
  enableBreadcrumbs?: boolean;
  /** Maximum breadcrumbs to keep */
  maxBreadcrumbs?: number;
  /** Buffer size before auto-flush */
  bufferSize?: number;
  /** Auto-flush interval in milliseconds */
  flushInterval?: number;
  /** Enable sensitive data masking */
  enableMasking?: boolean;
  /** Custom masking patterns */
  maskPatterns?: RegExp[];
  /** Global log context */
  context?: LogContext;
  /** Custom log formatters */
  formatters?: Record<string, LogFormatter>;
  /** Initial transports */
  transports?: LogTransport[];
  /** Custom filters */
  filters?: LogFilter[];
  /** Enable performance tracking */
  enablePerformanceTracking?: boolean;
  /** Slow operation threshold in ms */
  slowOperationThreshold?: number;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  /** Total operations tracked */
  totalOperations: number;
  /** Average operation duration */
  averageDuration: number;
  /** Slowest operations */
  slowestOperations: Array<{
    name: string;
    duration: number;
    timestamp: number;
  }>;
  /** Operations by category */
  operationsByCategory: Record<OperationCategory, number>;
}

/**
 * Logger instance interface
 */
export interface Logger {
  /** Log a message at specified level */
  $log(level: LogLevelName, message: string, context?: Record<string, unknown>): void;
  /** Log trace message */
  $trace(message: string, context?: Record<string, unknown>): void;
  /** Log debug message */
  $debug(message: string, context?: Record<string, unknown>): void;
  /** Log info message */
  $info(message: string, context?: Record<string, unknown>): void;
  /** Log warning message */
  $warn(message: string, context?: Record<string, unknown>): void;
  /** Log error message */
  $error(message: string, error?: Error, context?: Record<string, unknown>): void;
  /** Log fatal message */
  $fatal(message: string, error?: Error, context?: Record<string, unknown>): void;
  /** Start tracking an operation */
  $startOperation(name: string, category?: OperationCategory, metadata?: Record<string, unknown>): string;
  /** End tracking an operation */
  $endOperation(operationId: string): void;
  /** Add a breadcrumb */
  $addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void;
  /** Get breadcrumb history */
  $getBreadcrumbs(): Breadcrumb[];
  /** Get log history */
  $getLogHistory(options?: {
    level?: LogLevelName;
    limit?: number;
    offset?: number;
    category?: OperationCategory;
  }): LogEntry[];
  /** Set log level dynamically */
  $setLogLevel(level: LogLevelName): void;
  /** Flush buffered logs */
  $flushLogs(): Promise<void>;
  /** Add a transport */
  $addTransport(transport: LogTransport): void;
  /** Remove a transport */
  $removeTransport(name: string): boolean;
  /** Add a filter */
  $addFilter(filter: LogFilter): void;
  /** Clear filters */
  $clearFilters(): void;
  /** Update global context */
  $updateContext(context: Partial<LogContext>): void;
  /** Get performance metrics */
  $getMetrics(): PerformanceMetrics;
  /** Clear all logs and metrics */
  $clear(): void;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate unique ID for log entries
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate correlation ID
 */
function generateCorrelationId(): string {
  return `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Default sensitive data patterns
 */
const DEFAULT_MASK_PATTERNS = [
  // Credit card numbers
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  // Social Security Numbers
  /\b\d{3}-\d{2}-\d{4}\b/g,
  // Email addresses (partial masking)
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  // Phone numbers
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  // API keys (common patterns)
  /\b[A-Za-z0-9]{32,}\b/g,
  // Passwords (field names)
  /("password"\s*:\s*")[^"]*"/gi,
  /("passwd"\s*:\s*")[^"]*"/gi,
  /("pwd"\s*:\s*")[^"]*"/gi,
  // Tokens
  /("token"\s*:\s*")[^"]*"/gi,
  /("accessToken"\s*:\s*")[^"]*"/gi,
  /("refreshToken"\s*:\s*")[^"]*"/gi,
];

/**
 * Mask sensitive data in a string
 */
function maskSensitiveData(text: string, patterns: RegExp[] = DEFAULT_MASK_PATTERNS): string {
  let masked = text;

  for (const pattern of patterns) {
    masked = masked.replace(pattern, (match) => {
      // For field-value patterns, preserve the field name
      if (match.includes(':')) {
        const [field] = match.split(':');
        return `${field}: "***MASKED***"`;
      }
      // For standalone values, mask completely
      return '***MASKED***';
    });
  }

  return masked;
}

/**
 * Deep mask sensitive data in objects
 */
function maskObject(obj: unknown, patterns: RegExp[] = DEFAULT_MASK_PATTERNS): unknown {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return maskSensitiveData(obj, patterns);
  }

  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => maskObject(item, patterns));
  }

  const masked: Record<string, unknown> = {};
  const sensitiveKeys = ['password', 'passwd', 'pwd', 'token', 'accessToken', 'refreshToken', 'apiKey', 'secret'];

  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveKeys.includes(key.toLowerCase())) {
      masked[key] = '***MASKED***';
    } else {
      masked[key] = maskObject(value, patterns);
    }
  }

  return masked;
}

// ============================================================================
// Log Formatters
// ============================================================================

/**
 * JSON formatter for structured logging
 */
export const jsonFormatter: LogFormatter = (entry: LogEntry): string => {
  return JSON.stringify(entry);
};

/**
 * Human-readable formatter
 */
export const humanFormatter: LogFormatter = (entry: LogEntry): string => {
  const timestamp = new Date(entry.timestamp).toISOString();
  const level = entry.levelName.toUpperCase().padEnd(5);
  const context = Object.keys(entry.context).length > 0
    ? ` [${Object.entries(entry.context).map(([k, v]) => `${k}=${v}`).join(', ')}]`
    : '';
  const duration = entry.duration ? ` (${entry.duration.toFixed(2)}ms)` : '';

  let message = `[${timestamp}] ${level} ${entry.message}${context}${duration}`;

  if (entry.metadata && Object.keys(entry.metadata).length > 0) {
    message += `\n  Metadata: ${JSON.stringify(entry.metadata, null, 2)}`;
  }

  if (entry.error) {
    message += `\n  Error: ${entry.error.message}`;
    if (entry.stack) {
      message += `\n  Stack: ${entry.stack}`;
    }
  }

  return message;
};

/**
 * Browser console formatter with colors
 */
export const consoleFormatter: LogFormatter = (entry: LogEntry): string => {
  const timestamp = new Date(entry.timestamp).toLocaleTimeString();
  const emoji = {
    trace: '🔍',
    debug: '🐛',
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
    fatal: '💀',
  }[entry.levelName];

  let message = `${emoji} [${timestamp}] ${entry.message}`;

  if (entry.duration) {
    message += ` (${entry.duration.toFixed(2)}ms)`;
  }

  return message;
};

/**
 * Compact formatter for production
 */
export const compactFormatter: LogFormatter = (entry: LogEntry): string => {
  const parts = [
    entry.timestampISO,
    entry.levelName.toUpperCase(),
    entry.message,
  ];

  if (entry.context.correlationId) {
    parts.push(`corr=${entry.context.correlationId}`);
  }

  if (entry.duration) {
    parts.push(`${entry.duration.toFixed(2)}ms`);
  }

  return parts.join(' | ');
};

// ============================================================================
// Default Transports
// ============================================================================

/**
 * Console transport with color support
 */
export const consoleTransport: LogTransport = {
  name: 'console',
  formatter: consoleFormatter,
  write(entries: LogEntry[]) {
    for (const entry of entries) {
      const formatted = consoleFormatter(entry);
      const style = {
        trace: 'color: #888',
        debug: 'color: #00f',
        info: 'color: #0a0',
        warn: 'color: #f80',
        error: 'color: #f00',
        fatal: 'color: #f00; font-weight: bold',
      }[entry.levelName];

      const consoleMethod = {
        trace: console.trace,
        debug: console.debug,
        info: console.info,
        warn: console.warn,
        error: console.error,
        fatal: console.error,
      }[entry.levelName];

      if (entry.metadata || entry.error) {
        consoleMethod.call(console, `%c${formatted}`, style, entry.metadata || entry.error);
      } else {
        consoleMethod.call(console, `%c${formatted}`, style);
      }
    }
  },
};

/**
 * LocalStorage transport for persistence
 */
export const localStorageTransport: LogTransport = {
  name: 'localStorage',
  formatter: jsonFormatter,
  write(entries: LogEntry[]) {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      const key = 'enzyme:logs';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const combined = [...existing, ...entries];

      // Keep last 1000 entries
      const trimmed = combined.slice(-1000);
      localStorage.setItem(key, JSON.stringify(trimmed));
    } catch (error) {
      console.error('Failed to write to localStorage:', error);
    }
  },
  flush() {
    // LocalStorage writes immediately, no flush needed
  },
};

/**
 * Remote transport for sending logs to a server
 */
export function createRemoteTransport(endpoint: string, options?: {
  headers?: Record<string, string>;
  batchSize?: number;
}): LogTransport {
  return {
    name: 'remote',
    formatter: jsonFormatter,
    async write(entries: LogEntry[]) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
          },
          body: JSON.stringify(entries),
        });

        if (!response.ok) {
          console.error('Failed to send logs to remote:', response.statusText);
        }
      } catch (error) {
        console.error('Failed to send logs to remote:', error);
      }
    },
  };
}

// ============================================================================
// Logger Implementation
// ============================================================================

/**
 * Create a logger instance
 */
export function createLogger(config: LoggerConfig = {}): Logger {
  // Configuration with defaults
  const cfg: Required<LoggerConfig> = {
    level: config.level || 'info',
    enableBreadcrumbs: config.enableBreadcrumbs ?? true,
    maxBreadcrumbs: config.maxBreadcrumbs || 50,
    bufferSize: config.bufferSize || 100,
    flushInterval: config.flushInterval || 5000,
    enableMasking: config.enableMasking ?? true,
    maskPatterns: config.maskPatterns || DEFAULT_MASK_PATTERNS,
    context: config.context || {},
    formatters: config.formatters || {
      json: jsonFormatter,
      human: humanFormatter,
      console: consoleFormatter,
      compact: compactFormatter,
    },
    transports: config.transports || [consoleTransport],
    filters: config.filters || [],
    enablePerformanceTracking: config.enablePerformanceTracking ?? true,
    slowOperationThreshold: config.slowOperationThreshold || 1000,
  };

  // State
  let currentLevel = LOG_LEVEL_MAP[cfg.level];
  const logBuffer: LogEntry[] = [];
  const breadcrumbs: Breadcrumb[] = [];
  const operations = new Map<string, OperationInfo>();
  const transports: LogTransport[] = [...cfg.transports];
  const filters: LogFilter[] = [...cfg.filters];
  let globalContext: LogContext = { ...cfg.context };
  let flushTimer: NodeJS.Timeout | number | null = null;

  // Performance metrics
  const metrics: PerformanceMetrics = {
    totalOperations: 0,
    averageDuration: 0,
    slowestOperations: [],
    operationsByCategory: {
      lifecycle: 0,
      api: 0,
      state: 0,
      navigation: 0,
      'user-action': 0,
      render: 0,
      custom: 0,
    },
  };

  /**
   * Initialize global context
   */
  if (!globalContext.correlationId) {
    globalContext.correlationId = generateCorrelationId();
  }

  if (typeof window !== 'undefined') {
    if (!globalContext.sessionId) {
      globalContext.sessionId = sessionStorage.getItem('enzyme:sessionId') || generateId();
      sessionStorage.setItem('enzyme:sessionId', globalContext.sessionId);
    }
  }

  /**
   * Schedule auto-flush
   */
  function scheduleFlush() {
    if (flushTimer) return;

    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flushLogs();
    }, cfg.flushInterval);
  }

  /**
   * Flush logs to transports
   */
  async function flushLogs(): Promise<void> {
    if (logBuffer.length === 0) return;

    const entries = [...logBuffer];
    logBuffer.length = 0;

    // Write to all transports
    await Promise.all(
      transports.map(async (transport) => {
        try {
          const filtered = entries.filter((entry) => {
            if (transport.level !== undefined && entry.level < transport.level) {
              return false;
            }
            return true;
          });

          if (filtered.length > 0) {
            await transport.write(filtered);
          }
        } catch (error) {
          console.error(`Transport ${transport.name} failed:`, error);
        }
      })
    );
  }

  /**
   * Add log entry to buffer
   */
  function addLogEntry(entry: LogEntry): void {
    // Apply filters
    for (const filter of filters) {
      if (!filter(entry)) return;
    }

    // Check log level
    if (entry.level < currentLevel) return;

    // Mask sensitive data if enabled
    if (cfg.enableMasking) {
      entry.message = maskSensitiveData(entry.message, cfg.maskPatterns);
      if (entry.metadata) {
        entry.metadata = maskObject(entry.metadata, cfg.maskPatterns) as Record<string, unknown>;
      }
    }

    // Add to buffer
    logBuffer.push(entry);

    // Auto-flush if buffer is full
    if (logBuffer.length >= cfg.bufferSize) {
      void flushLogs();
    } else {
      scheduleFlush();
    }
  }

  /**
   * Create log entry
   */
  function createLogEntry(
    level: LogLevelName,
    message: string,
    additionalContext?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    const timestamp = Date.now();
    const entry: LogEntry = {
      id: generateId(),
      timestamp,
      timestampISO: new Date(timestamp).toISOString(),
      level: LOG_LEVEL_MAP[level],
      levelName: level,
      message,
      context: { ...globalContext, ...additionalContext },
      metadata: additionalContext,
    };

    if (error) {
      entry.error = error;
      entry.stack = error.stack;
    }

    return entry;
  }

  // ============================================================================
  // Public API
  // ============================================================================

  const logger: Logger = {
    $log(level: LogLevelName, message: string, context?: Record<string, unknown>): void {
      const entry = createLogEntry(level, message, context);
      addLogEntry(entry);
    },

    $trace(message: string, context?: Record<string, unknown>): void {
      logger.$log('trace', message, context);
    },

    $debug(message: string, context?: Record<string, unknown>): void {
      logger.$log('debug', message, context);
    },

    $info(message: string, context?: Record<string, unknown>): void {
      logger.$log('info', message, context);
    },

    $warn(message: string, context?: Record<string, unknown>): void {
      logger.$log('warn', message, context);
    },

    $error(message: string, error?: Error, context?: Record<string, unknown>): void {
      const entry = createLogEntry('error', message, context, error);
      addLogEntry(entry);
    },

    $fatal(message: string, error?: Error, context?: Record<string, unknown>): void {
      const entry = createLogEntry('fatal', message, context, error);
      addLogEntry(entry);
      // Fatal errors flush immediately
      void flushLogs();
    },

    $startOperation(
      name: string,
      category: OperationCategory = 'custom',
      metadata?: Record<string, unknown>
    ): string {
      const operationId = generateId();
      const operation: OperationInfo = {
        name,
        category,
        startTime: performance.now(),
        context: { ...globalContext },
        metadata,
      };

      operations.set(operationId, operation);

      if (cfg.enablePerformanceTracking) {
        logger.$debug(`Operation started: ${name}`, { operationId, category, ...metadata });
      }

      return operationId;
    },

    $endOperation(operationId: string): void {
      const operation = operations.get(operationId);
      if (!operation) {
        logger.$warn(`Operation not found: ${operationId}`);
        return;
      }

      const endTime = performance.now();
      const duration = endTime - operation.startTime;

      operations.delete(operationId);

      // Update metrics
      if (cfg.enablePerformanceTracking) {
        metrics.totalOperations++;
        metrics.operationsByCategory[operation.category]++;

        // Update average
        const totalDuration = metrics.averageDuration * (metrics.totalOperations - 1) + duration;
        metrics.averageDuration = totalDuration / metrics.totalOperations;

        // Track slow operations
        if (duration > cfg.slowOperationThreshold) {
          metrics.slowestOperations.push({
            name: operation.name,
            duration,
            timestamp: Date.now(),
          });

          // Keep only top 10 slowest
          metrics.slowestOperations.sort((a, b) => b.duration - a.duration);
          metrics.slowestOperations = metrics.slowestOperations.slice(0, 10);
        }

        // Log operation completion
        const level = duration > cfg.slowOperationThreshold ? 'warn' : 'debug';
        const entry = createLogEntry(
          level,
          `Operation completed: ${operation.name}`,
          { operationId, category: operation.category, ...operation.metadata }
        );
        entry.operation = operation.name;
        entry.category = operation.category;
        entry.duration = duration;

        addLogEntry(entry);
      }
    },

    $addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void {
      if (!cfg.enableBreadcrumbs) return;

      const fullBreadcrumb: Breadcrumb = {
        ...breadcrumb,
        timestamp: Date.now(),
      };

      breadcrumbs.push(fullBreadcrumb);

      // Keep only last N breadcrumbs
      if (breadcrumbs.length > cfg.maxBreadcrumbs) {
        breadcrumbs.shift();
      }

      logger.$trace(`Breadcrumb: ${breadcrumb.message}`, {
        type: breadcrumb.type,
        ...breadcrumb.data,
      });
    },

    $getBreadcrumbs(): Breadcrumb[] {
      return [...breadcrumbs];
    },

    $getLogHistory(options: {
      level?: LogLevelName;
      limit?: number;
      offset?: number;
      category?: OperationCategory;
    } = {}): LogEntry[] {
      let filtered = [...logBuffer];

      if (options.level) {
        const minLevel = LOG_LEVEL_MAP[options.level];
        filtered = filtered.filter((entry) => entry.level >= minLevel);
      }

      if (options.category) {
        filtered = filtered.filter((entry) => entry.category === options.category);
      }

      const offset = options.offset || 0;
      const limit = options.limit || filtered.length;

      return filtered.slice(offset, offset + limit);
    },

    $setLogLevel(level: LogLevelName): void {
      currentLevel = LOG_LEVEL_MAP[level];
      logger.$info(`Log level changed to: ${level}`);
    },

    async $flushLogs(): Promise<void> {
      await flushLogs();
    },

    $addTransport(transport: LogTransport): void {
      transports.push(transport);
      logger.$debug(`Transport added: ${transport.name}`);
    },

    $removeTransport(name: string): boolean {
      const index = transports.findIndex((t) => t.name === name);
      if (index === -1) return false;

      transports.splice(index, 1);
      logger.$debug(`Transport removed: ${name}`);
      return true;
    },

    $addFilter(filter: LogFilter): void {
      filters.push(filter);
    },

    $clearFilters(): void {
      filters.length = 0;
    },

    $updateContext(context: Partial<LogContext>): void {
      globalContext = { ...globalContext, ...context };
      logger.$debug('Global context updated', context);
    },

    $getMetrics(): PerformanceMetrics {
      return { ...metrics };
    },

    $clear(): void {
      logBuffer.length = 0;
      breadcrumbs.length = 0;
      operations.clear();
      metrics.totalOperations = 0;
      metrics.averageDuration = 0;
      metrics.slowestOperations = [];
      Object.keys(metrics.operationsByCategory).forEach((key) => {
        metrics.operationsByCategory[key as OperationCategory] = 0;
      });
      logger.$info('Logger cleared');
    },
  };

  return logger;
}

// ============================================================================
// Global Logger Instance
// ============================================================================

let globalLogger: Logger | null = null;

/**
 * Initialize global logger
 *
 * @example
 * ```typescript
 * import { initializeLogger } from '@defendr/enzyme/extensions/built-in';
 *
 * initializeLogger({
 *   level: 'info',
 *   enableBreadcrumbs: true,
 *   transports: [consoleTransport, localStorageTransport],
 * });
 * ```
 */
export function initializeLogger(config?: LoggerConfig): Logger {
  globalLogger = createLogger(config);
  return globalLogger;
}

/**
 * Get global logger instance
 *
 * @example
 * ```typescript
 * import { getLogger } from '@defendr/enzyme/extensions/built-in';
 *
 * const logger = getLogger();
 * logger.$info('Application started');
 * ```
 */
export function getLogger(): Logger {
  if (!globalLogger) {
    globalLogger = createLogger();
  }
  return globalLogger;
}

// ============================================================================
// React Integration
// ============================================================================

/**
 * React hook for using logger
 *
 * @example
 * ```typescript
 * import { useLogger } from '@defendr/enzyme/extensions/built-in';
 *
 * function MyComponent() {
 *   const logger = useLogger();
 *
 *   useEffect(() => {
 *     logger.$info('Component mounted');
 *     return () => logger.$info('Component unmounted');
 *   }, []);
 *
 *   return <div>My Component</div>;
 * }
 * ```
 */
export function useLogger(): Logger {
  return getLogger();
}

// ============================================================================
// Extension Export
// ============================================================================

/**
 * Enzyme logging extension
 *
 * This extension provides comprehensive logging capabilities for React applications.
 *
 * @example
 * ```typescript
 * import { loggingExtension } from '@defendr/enzyme/extensions/built-in';
 * import { Enzyme } from '@defendr/enzyme/cli';
 *
 * const enzyme = new Enzyme().$extends(loggingExtension);
 * ```
 */
export const loggingExtension = {
  name: 'enzyme:logging',
  version: '2.0.0',
  description: 'Enterprise-grade logging extension with structured logging, operation tracking, and performance metrics',

  /**
   * Initialize the extension
   */
  initialize(config?: LoggerConfig): Logger {
    return initializeLogger(config);
  },

  /**
   * Get logger instance
   */
  getLogger,

  /**
   * Create a new logger instance
   */
  createLogger,

  /**
   * React hook
   */
  useLogger,

  /**
   * Formatters
   */
  formatters: {
    json: jsonFormatter,
    human: humanFormatter,
    console: consoleFormatter,
    compact: compactFormatter,
  },

  /**
   * Transports
   */
  transports: {
    console: consoleTransport,
    localStorage: localStorageTransport,
    createRemote: createRemoteTransport,
  },

  /**
   * Utilities
   */
  utils: {
    maskSensitiveData,
    maskObject,
    generateCorrelationId,
  },
};

// ============================================================================
// Export All
// ============================================================================

export default loggingExtension;
