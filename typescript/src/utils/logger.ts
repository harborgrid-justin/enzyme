/**
 * Logging Utilities
 *
 * Provides a flexible logging system with levels, formatting,
 * and customizable output handlers.
 *
 * @module utils/logger
 * @example
 * ```typescript
 * import { createLogger, LogLevel } from '@missionfabric-js/enzyme-typescript/utils';
 *
 * const logger = createLogger({ level: LogLevel.INFO, prefix: 'MyApp' });
 * logger.info('Application started');
 * logger.error('An error occurred', { error });
 * ```
 */

/**
 * Log levels in order of severity.
 */
export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5,
  SILENT = 6,
}

/**
 * Log entry structure.
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  data?: any;
  prefix?: string;
}

/**
 * Logger configuration.
 */
export interface LoggerConfig {
  /** Minimum log level to output */
  level?: LogLevel;
  /** Prefix for all log messages */
  prefix?: string;
  /** Whether to include timestamps */
  timestamps?: boolean;
  /** Custom output handler */
  handler?: (entry: LogEntry) => void;
  /** Whether to use colors in console output */
  colors?: boolean;
}

/**
 * Logger interface.
 */
export interface Logger {
  trace(message: string, data?: any): void;
  debug(message: string, data?: any): void;
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, data?: any): void;
  fatal(message: string, data?: any): void;
  setLevel(level: LogLevel): void;
  getLevel(): LogLevel;
  child(config: Partial<LoggerConfig>): Logger;
}

/**
 * ANSI color codes for console output.
 */
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

/**
 * Log level names.
 */
const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.TRACE]: 'TRACE',
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.FATAL]: 'FATAL',
  [LogLevel.SILENT]: 'SILENT',
};

/**
 * Log level colors.
 */
const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.TRACE]: COLORS.gray,
  [LogLevel.DEBUG]: COLORS.cyan,
  [LogLevel.INFO]: COLORS.green,
  [LogLevel.WARN]: COLORS.yellow,
  [LogLevel.ERROR]: COLORS.red,
  [LogLevel.FATAL]: COLORS.magenta,
  [LogLevel.SILENT]: COLORS.reset,
};

/**
 * Formats a log entry as a string.
 *
 * @param entry - The log entry
 * @param config - Logger configuration
 * @returns The formatted log string
 */
function formatLogEntry(entry: LogEntry, config: LoggerConfig): string {
  const parts: string[] = [];

  // Timestamp
  if (config.timestamps !== false) {
    const timestamp = entry.timestamp.toISOString();
    parts.push(config.colors ? `${COLORS.gray}[${timestamp}]${COLORS.reset}` : `[${timestamp}]`);
  }

  // Level
  const levelName = LOG_LEVEL_NAMES[entry.level];
  if (config.colors) {
    const color = LOG_LEVEL_COLORS[entry.level];
    parts.push(`${color}${levelName.padEnd(5)}${COLORS.reset}`);
  } else {
    parts.push(levelName.padEnd(5));
  }

  // Prefix
  if (entry.prefix || config.prefix) {
    const prefix = entry.prefix || config.prefix;
    parts.push(config.colors ? `${COLORS.blue}[${prefix}]${COLORS.reset}` : `[${prefix}]`);
  }

  // Message
  parts.push(entry.message);

  return parts.join(' ');
}

/**
 * Default console log handler.
 *
 * @param entry - The log entry
 * @param config - Logger configuration
 */
function defaultHandler(entry: LogEntry, config: LoggerConfig): void {
  const formatted = formatLogEntry(entry, config);

  switch (entry.level) {
    case LogLevel.TRACE:
    case LogLevel.DEBUG:
      console.debug(formatted, entry.data !== undefined ? entry.data : '');
      break;
    case LogLevel.INFO:
      console.info(formatted, entry.data !== undefined ? entry.data : '');
      break;
    case LogLevel.WARN:
      console.warn(formatted, entry.data !== undefined ? entry.data : '');
      break;
    case LogLevel.ERROR:
    case LogLevel.FATAL:
      console.error(formatted, entry.data !== undefined ? entry.data : '');
      break;
  }
}

/**
 * Creates a logger instance.
 *
 * @param config - Logger configuration
 * @returns A logger instance
 *
 * @example
 * ```typescript
 * const logger = createLogger({
 *   level: LogLevel.INFO,
 *   prefix: 'MyApp',
 *   colors: true
 * });
 *
 * logger.info('Server started', { port: 3000 });
 * logger.error('Connection failed', { error });
 * ```
 */
export function createLogger(config: LoggerConfig = {}): Logger {
  let currentLevel = config.level ?? LogLevel.INFO;

  const log = (level: LogLevel, message: string, data?: any): void => {
    if (level < currentLevel || currentLevel === LogLevel.SILENT) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      data,
      prefix: config.prefix,
    };

    if (config.handler) {
      config.handler(entry);
    } else {
      defaultHandler(entry, config);
    }
  };

  return {
    trace: (message: string, data?: any) => log(LogLevel.TRACE, message, data),
    debug: (message: string, data?: any) => log(LogLevel.DEBUG, message, data),
    info: (message: string, data?: any) => log(LogLevel.INFO, message, data),
    warn: (message: string, data?: any) => log(LogLevel.WARN, message, data),
    error: (message: string, data?: any) => log(LogLevel.ERROR, message, data),
    fatal: (message: string, data?: any) => log(LogLevel.FATAL, message, data),

    setLevel: (level: LogLevel) => {
      currentLevel = level;
    },

    getLevel: () => currentLevel,

    child: (childConfig: Partial<LoggerConfig>) =>
      createLogger({
        ...config,
        ...childConfig,
        prefix: childConfig.prefix
          ? config.prefix
            ? `${config.prefix}:${childConfig.prefix}`
            : childConfig.prefix
          : config.prefix,
      }),
  };
}

/**
 * Default global logger instance.
 */
export const logger = createLogger({
  level: LogLevel.INFO,
  colors: true,
});

/**
 * Logger utility class for more advanced use cases.
 *
 * @example
 * ```typescript
 * class MyService {
 *   private logger = LoggerUtil.for('MyService');
 *
 *   async process() {
 *     this.logger.info('Processing started');
 *     try {
 *       // ... processing logic
 *       this.logger.info('Processing completed');
 *     } catch (error) {
 *       this.logger.error('Processing failed', { error });
 *     }
 *   }
 * }
 * ```
 */
export class LoggerUtil {
  private static loggers = new Map<string, Logger>();
  private static config: LoggerConfig = {
    level: LogLevel.INFO,
    colors: true,
  };

  /**
   * Gets or creates a logger for a specific context.
   *
   * @param prefix - The logger prefix/context
   * @returns A logger instance
   */
  static for(prefix: string): Logger {
    if (!this.loggers.has(prefix)) {
      this.loggers.set(
        prefix,
        createLogger({
          ...this.config,
          prefix,
        })
      );
    }
    return this.loggers.get(prefix)!;
  }

  /**
   * Configures all loggers.
   *
   * @param config - Logger configuration
   */
  static configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };

    // Update existing loggers
    for (const [prefix, logger] of this.loggers.entries()) {
      if (config.level !== undefined) {
        logger.setLevel(config.level);
      }
    }
  }

  /**
   * Clears all cached loggers.
   */
  static clear(): void {
    this.loggers.clear();
  }
}

/**
 * Creates a simple console logger with preset formatting.
 *
 * @param prefix - Optional prefix for all messages
 * @returns A logger instance
 *
 * @example
 * ```typescript
 * const log = consoleLogger('API');
 * log.info('Request received');
 * log.error('Request failed');
 * ```
 */
export function consoleLogger(prefix?: string): Logger {
  return createLogger({
    level: LogLevel.INFO,
    prefix,
    colors: true,
    timestamps: true,
  });
}

/**
 * Creates a JSON logger that outputs structured JSON logs.
 *
 * @param config - Logger configuration
 * @returns A logger instance
 *
 * @example
 * ```typescript
 * const logger = jsonLogger({ prefix: 'API' });
 * logger.info('Request received', { userId: 123 });
 * // {"level":"INFO","message":"Request received","timestamp":"...","data":{"userId":123}}
 * ```
 */
export function jsonLogger(config: Partial<LoggerConfig> = {}): Logger {
  return createLogger({
    ...config,
    colors: false,
    handler: (entry) => {
      const json = JSON.stringify({
        level: LOG_LEVEL_NAMES[entry.level],
        message: entry.message,
        timestamp: entry.timestamp.toISOString(),
        prefix: entry.prefix,
        data: entry.data,
      });
      console.log(json);
    },
  });
}

/**
 * Creates a silent logger that doesn't output anything.
 *
 * @returns A logger instance
 *
 * @example
 * ```typescript
 * const logger = silentLogger();
 * logger.info('This will not be logged');
 * ```
 */
export function silentLogger(): Logger {
  return createLogger({
    level: LogLevel.SILENT,
  });
}

/**
 * Memory log handler that stores logs in memory.
 */
export class MemoryLogHandler {
  private logs: LogEntry[] = [];
  private maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  /**
   * Handler function for logger.
   */
  handle = (entry: LogEntry): void => {
    this.logs.push(entry);
    if (this.logs.length > this.maxSize) {
      this.logs.shift();
    }
  };

  /**
   * Gets all stored logs.
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Gets logs filtered by level.
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter((log) => log.level === level);
  }

  /**
   * Clears all stored logs.
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * Gets the number of stored logs.
   */
  get size(): number {
    return this.logs.length;
  }
}

/**
 * Creates a logger that stores logs in memory.
 *
 * @param config - Logger configuration
 * @returns Logger instance and memory handler
 *
 * @example
 * ```typescript
 * const { logger, handler } = memoryLogger();
 * logger.info('Test');
 * const logs = handler.getLogs();
 * ```
 */
export function memoryLogger(
  config: Partial<LoggerConfig> = {}
): { logger: Logger; handler: MemoryLogHandler } {
  const handler = new MemoryLogHandler();
  const logger = createLogger({
    ...config,
    handler: handler.handle,
  });

  return { logger, handler };
}
