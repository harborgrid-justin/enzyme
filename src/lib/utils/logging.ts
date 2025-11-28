/**
 * @file Logging Utilities
 * @description Centralized logging with levels and context
 */

/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Log level priority
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Logger configuration
 */
export interface LoggerConfig {
  /** Minimum log level */
  level: LogLevel;
  
  /** Enable console output */
  console: boolean;
  
  /** Enable remote logging */
  remote: boolean;
  
  /** Remote logging endpoint */
  remoteEndpoint?: string;
  
  /** Include timestamp */
  timestamp: boolean;
  
  /** Include caller info */
  caller: boolean;
  
  /** Custom log handler */
  handler?: (entry: LogEntry) => void;
}

/**
 * Log entry
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, unknown>;
  caller?: string;
  tags?: string[];
}

/**
 * Default logger configuration
 */
const defaultConfig: LoggerConfig = {
  level: 'info',
  console: true,
  remote: false,
  timestamp: true,
  caller: false,
};

/**
 * Current logger configuration
 */
let currentConfig: LoggerConfig = { ...defaultConfig };

/**
 * Configure logger
 */
export function configureLogger(config: Partial<LoggerConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

/**
 * Get current configuration
 */
export function getLoggerConfig(): LoggerConfig {
  return { ...currentConfig };
}

/**
 * Check if level should be logged
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[currentConfig.level];
}

/**
 * Get caller information
 */
function getCallerInfo(): string {
  const error = new Error();
  const stack = error.stack?.split('\n');
  
  if (stack !== undefined && stack.length > 4) {
    const [callerLine] = stack.slice(4);
    if (callerLine !== undefined && callerLine !== '') {
      const match = callerLine.match(/at\s+(.+)\s+\((.+):(\d+):(\d+)\)/);
    
      if (match) {
        return `${match[1]} (${match[2]}:${match[3]})`;
      }
    
      const simpleMatch = callerLine.match(/at\s+(.+):(\d+):(\d+)/);
      if (simpleMatch) {
        return `${simpleMatch[1]}:${simpleMatch[2]}`;
      }
    }
  }
  
  return 'unknown';
}

/**
 * Format log entry for console
 */
function formatForConsole(entry: LogEntry): string {
  const parts: string[] = [];
  
  if (currentConfig.timestamp) {
    parts.push(`[${entry.timestamp.toISOString()}]`);
  }
  
  parts.push(`[${entry.level.toUpperCase()}]`);
  
  if (entry.tags !== undefined && entry.tags.length > 0) {
    parts.push(`[${entry.tags.join(', ')}]`);
  }
  
  parts.push(entry.message);
  
  if (currentConfig.caller && entry.caller !== undefined && entry.caller !== '') {
    parts.push(`@ ${entry.caller}`);
  }
  
  return parts.join(' ');
}

/**
 * Send log to remote endpoint
 *
 * Note: This function intentionally uses raw fetch() rather than apiClient because:
 * 1. Logging should be independent to avoid circular dependencies
 * 2. Log endpoints may be on different domains (e.g., log aggregation services)
 * 3. Logging must work even when apiClient encounters errors
 *
 * @see {@link @/lib/api/api-client} for application API calls
 */
async function sendToRemote(entry: LogEntry): Promise<void> {
  if (!currentConfig.remote || !currentConfig.remoteEndpoint) {
    return;
  }

  try {
    // Raw fetch is intentional - logging must be independent of apiClient
    await fetch(currentConfig.remoteEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
  } catch {
    // Silently fail remote logging
  }
}

/**
 * Log function
 */
function log(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  tags?: string[]
): void {
  if (!shouldLog(level)) {
    return;
  }
  
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date(),
    context,
    tags,
  };
  
  if (currentConfig.caller) {
    entry.caller = getCallerInfo();
  }
  
  // Custom handler
  if (currentConfig.handler) {
    currentConfig.handler(entry);
    return;
  }
  
  // Console output
  if (currentConfig.console) {
    const formatted = formatForConsole(entry);
    let consoleMethod: 'error' | 'warn' | 'info';
    if (level === 'error') {
      consoleMethod = 'error';
    } else if (level === 'warn') {
      consoleMethod = 'warn';
    } else {
      consoleMethod = 'info';
    }
    
    if (context !== undefined && Object.keys(context).length > 0) {
      console[consoleMethod](formatted, context);
    } else {
      console[consoleMethod](formatted);
    }
  }
  
  // Remote logging
  if (currentConfig.remote) {
    void sendToRemote(entry);
  }
}

/**
 * Logger object
 */
export const logger = {
  debug: (message: string, context?: Record<string, unknown>, tags?: string[]): void =>
    log('debug', message, context, tags),
  
  info: (message: string, context?: Record<string, unknown>, tags?: string[]): void =>
    log('info', message, context, tags),
  
  warn: (message: string, context?: Record<string, unknown>, tags?: string[]): void =>
    log('warn', message, context, tags),
  
  error: (message: string, context?: Record<string, unknown>, tags?: string[]): void =>
    log('error', message, context, tags),
  
  /**
   * Create a logger with preset tags
   */
  withTags: (...tags: string[]): {
    debug: (message: string, context?: Record<string, unknown>) => void;
    info: (message: string, context?: Record<string, unknown>) => void;
    warn: (message: string, context?: Record<string, unknown>) => void;
    error: (message: string, context?: Record<string, unknown>) => void;
  } => ({
    debug: (message: string, context?: Record<string, unknown>): void =>
      log('debug', message, context, tags),
    info: (message: string, context?: Record<string, unknown>): void =>
      log('info', message, context, tags),
    warn: (message: string, context?: Record<string, unknown>): void =>
      log('warn', message, context, tags),
    error: (message: string, context?: Record<string, unknown>): void =>
      log('error', message, context, tags),
  }),
  
  /**
   * Create a logger with preset context
   */
  withContext: (baseContext: Record<string, unknown>) => ({
    debug: (message: string, context?: Record<string, unknown>) =>
      log('debug', message, { ...baseContext, ...context }),
    info: (message: string, context?: Record<string, unknown>) =>
      log('info', message, { ...baseContext, ...context }),
    warn: (message: string, context?: Record<string, unknown>) =>
      log('warn', message, { ...baseContext, ...context }),
    error: (message: string, context?: Record<string, unknown>) =>
      log('error', message, { ...baseContext, ...context }),
  }),
};

/**
 * Performance logging helper
 */
export function logPerformance(label: string): () => void {
  const start = performance.now();
  
  return () => {
    const duration = performance.now() - start;
    logger.debug(`[Perf] ${label}: ${duration.toFixed(2)}ms`);
  };
}

/**
 * Measure async function performance
 */
export async function measureAsync<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  const end = logPerformance(label);
  try {
    return await fn();
  } finally {
    end();
  }
}
