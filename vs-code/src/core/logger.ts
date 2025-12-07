/**
 * Enterprise Logging Utility for Enzyme VS Code Extension
 * Provides structured logging with multiple output channels and telemetry integration
 *
 * Features:
 * - Multiple log levels (DEBUG, INFO, WARN, ERROR)
 * - Structured logging with context
 * - Integration with VS Code Output Channel
 * - Telemetry integration for error tracking
 * - Operation timing and performance tracking
 * - Error enrichment with stack traces
 * - Log filtering and search
 *
 * @module logger
 */

import * as vscode from 'vscode';
import { getExtensionConfig, onSettingChange } from '../config/extension-config';
import { LogLevel } from '../types';
import { OUTPUT_CHANNELS, CONFIG_KEYS as _CONFIG_KEYS, TELEMETRY_EVENTS as _TELEMETRY_EVENTS } from './constants';
import type { EnzymeError } from './errors';

/**
 * Logger class for structured logging with multiple severity levels
 * Uses ExtensionConfig for type-safe configuration access
 */
export class Logger {
  private static instance: Logger;
  private readonly outputChannel: vscode.OutputChannel;
  private logLevel: LogLevel = LogLevel.INFO;
  private telemetryEnabled = false;
  private configDisposable?: vscode.Disposable;

  /**
   *
   * @param channelName
   */
  private constructor(channelName: string = OUTPUT_CHANNELS.MAIN) {
    this.outputChannel = vscode.window.createOutputChannel(channelName);
    this.loadConfiguration();
    this.watchConfiguration();
  }

  /**
   * Get the singleton instance of the Logger
   * @param channelName
   */
  public static getInstance(channelName?: string): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(channelName);
    }
    return Logger.instance;
  }

  /**
   * Create a new logger instance with a specific channel name
   * @param channelName
   */
  public static createLogger(channelName: string): Logger {
    return new Logger(channelName);
  }

  /**
   * Load configuration from VS Code settings using ExtensionConfig
   * Provides type-safe access to logging settings
   */
  private loadConfiguration(): void {
    const config = getExtensionConfig();
    const levelString = config.get('enzyme.logging.level');
    this.logLevel = this.parseLogLevel(levelString);
    this.telemetryEnabled = config.get('enzyme.telemetry.enabled');
  }

  /**
   * Watch for configuration changes and reload automatically
   * Ensures logger stays in sync with user settings
   */
  private watchConfiguration(): void {
    this.configDisposable = onSettingChange('*', (event) => {
      if (event.key === 'enzyme.logging.level' || event.key === 'enzyme.telemetry.enabled') {
        this.loadConfiguration();
      }
    });
  }

  /**
   * Parse log level string to LogLevel enum
   * @param level
   */
  private parseLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'debug':
        return LogLevel.DEBUG;
      case 'info':
        return LogLevel.INFO;
      case 'warn':
        return LogLevel.WARN;
      case 'error':
        return LogLevel.ERROR;
      default:
        return LogLevel.INFO;
    }
  }

  /**
   * Check if a log level should be logged based on current log level
   * @param level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * Format a log message with timestamp and level
   * @param level
   * @param message
   * @param data
   */
  private formatMessage(level: LogLevel, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    const levelString = level.toUpperCase().padEnd(5);
    let formatted = `[${timestamp}] [${levelString}] ${message}`;

    if (data !== undefined) {
      try {
        const dataString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        formatted += `\n${dataString}`;
      } catch (error) {
        formatted += `\n[Unable to stringify data: ${String(error)}]`;
      }
    }

    return formatted;
  }

  /**
   * Write a log message to the output channel
   * @param level
   * @param message
   * @param data
   */
  private write(level: LogLevel, message: string, data?: unknown): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const formatted = this.formatMessage(level, message, data);
    this.outputChannel.appendLine(formatted);

    // Send telemetry for errors if enabled
    if (level === LogLevel.ERROR && this.telemetryEnabled) {
      this.sendTelemetry('error', message, data);
    }
  }

  /**
   * Send telemetry event (placeholder for actual telemetry implementation)
   * @param eventType
   * @param message
   * @param data
   */
  private sendTelemetry(eventType: string, message: string, data?: unknown): void {
    // TODO: Implement actual telemetry sending
    // This is a placeholder for future telemetry integration
    if (this.telemetryEnabled) {
      console.log(`[Telemetry] ${eventType}: ${message}`, data);
    }
  }

  /**
   * Log a debug message
   * @param message
   * @param data
   */
  public debug(message: string, data?: unknown): void {
    this.write(LogLevel.DEBUG, message, data);
  }

  /**
   * Log an info message
   * @param message
   * @param data
   */
  public info(message: string, data?: unknown): void {
    this.write(LogLevel.INFO, message, data);
  }

  /**
   * Log a warning message
   * @param message
   * @param data
   */
  public warn(message: string, data?: unknown): void {
    this.write(LogLevel.WARN, message, data);
  }

  /**
   * Log an error message
   * @param message
   * @param error
   */
  public error(message: string, error?: Error | unknown): void {
    let errorData: unknown = error;

    if (error instanceof Error) {
      errorData = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    this.write(LogLevel.ERROR, message, errorData);
  }

  /**
   * Log a success message (info level with green checkmark)
   * @param message
   * @param data
   */
  public success(message: string, data?: unknown): void {
    this.info(`✓ ${message}`, data);
  }

  /**
   * Log the start of an operation
   * @param operationName
   * @param context
   */
  public startOperation(operationName: string, context?: unknown): void {
    this.info(`Starting: ${operationName}`, context);
  }

  /**
   * Log the end of an operation with elapsed time
   * @param operationName
   * @param startTime
   * @param result
   */
  public endOperation(operationName: string, startTime: number, result?: unknown): void {
    const elapsed = Date.now() - startTime;
    this.info(`Completed: ${operationName} (${elapsed}ms)`, result);
  }

  /**
   * Log an operation with automatic timing
   * @param operationName
   * @param operation
   * @param context
   */
  public async logOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    context?: unknown
  ): Promise<T> {
    const startTime = Date.now();
    this.startOperation(operationName, context);

    try {
      const result = await operation();
      this.endOperation(operationName, startTime);
      return result;
    } catch (error) {
      const elapsed = Date.now() - startTime;
      this.error(`Failed: ${operationName} (${elapsed}ms)`, error);
      throw error;
    }
  }

  /**
   * Show the output channel
   * @param preserveFocus
   */
  public show(preserveFocus = true): void {
    this.outputChannel.show(preserveFocus);
  }

  /**
   * Hide the output channel
   */
  public hide(): void {
    this.outputChannel.hide();
  }

  /**
   * Clear the output channel
   */
  public clear(): void {
    this.outputChannel.clear();
  }

  /**
   * Dispose the output channel
   * FIXED: Now properly resets singleton instance to prevent memory leaks
   */
  public dispose(): void {
    // Dispose configuration watcher
    if (this.configDisposable) {
      this.configDisposable.dispose();
    }

    this.outputChannel.dispose();
    // Reset singleton instance
    if (Logger.instance === this) {
      Logger.instance = null as any;
    }
  }

  /**
   * Set the log level
   * @param level
   */
  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    this.info(`Log level set to: ${level}`);
  }

  /**
   * Enable or disable telemetry
   * @param enabled
   */
  public setTelemetry(enabled: boolean): void {
    this.telemetryEnabled = enabled;
    this.info(`Telemetry ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get current log level
   */
  public getLogLevel(): LogLevel {
    return this.logLevel;
  }

  /**
   * Check if telemetry is enabled
   */
  public isTelemetryEnabled(): boolean {
    return this.telemetryEnabled;
  }

  /**
   * Log a divider for visual separation
   */
  public divider(): void {
    this.outputChannel.appendLine('─'.repeat(80));
  }

  /**
   * Log a header
   * @param title
   */
  public header(title: string): void {
    this.divider();
    this.info(title);
    this.divider();
  }

  /**
   * Log an EnzymeError with full context
   *
   * @param error - EnzymeError to log
   * @param additionalContext - Additional context to include
   *
   * @example
   * ```typescript
   * logger.logError(enzymeError, { userId: '123' });
   * ```
   */
  public logError(error: any, additionalContext?: Record<string, unknown>): void {
    // Check if it's an EnzymeError with additional properties
    const isEnzymeError = error && typeof error === 'object' && 'code' in error && 'category' in error;

    if (isEnzymeError) {
      const enzymeError = error as EnzymeError;
      const context = {
        code: enzymeError.code,
        category: enzymeError.category,
        severity: enzymeError.severity,
        ...enzymeError.context,
        ...additionalContext,
      };

      this.error(enzymeError.message, context);

      // Log recovery suggestions if available
      if (enzymeError.recoverySuggestions && enzymeError.recoverySuggestions.length > 0) {
        this.info('Recovery suggestions:', {
          suggestions: enzymeError.recoverySuggestions,
        });
      }
    } else {
      // Regular error
      this.error('Error occurred', error);
    }
  }

  /**
   * Log a critical error that requires immediate attention
   *
   * @param message - Error message
   * @param error - Error object or data
   */
  public critical(message: string, error?: Error | unknown): void {
    this.outputChannel.appendLine('');
    this.outputChannel.appendLine('═'.repeat(80));
    this.error(`CRITICAL: ${message}`, error);
    this.outputChannel.appendLine('═'.repeat(80));
    this.outputChannel.appendLine('');

    // Always send critical errors to telemetry if enabled
    if (this.telemetryEnabled) {
      this.sendTelemetry('critical_error', message, error);
    }
  }

  /**
   * Log an error with stack trace enrichment
   *
   * @param message - Error message
   * @param error - Error object
   * @param context - Additional context
   */
  public errorWithStack(message: string, error: Error, context?: Record<string, unknown>): void {
    const enrichedData = {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').map(line => line.trim()),
      context,
    };

    this.write(LogLevel.ERROR, message, enrichedData);
  }

  /**
   * Log a performance warning
   *
   * @param operation - Operation name
   * @param duration - Duration in milliseconds
   * @param threshold - Performance threshold
   */
  public performanceWarning(operation: string, duration: number, threshold: number): void {
    this.warn(`Performance Warning: ${operation} took ${duration}ms (threshold: ${threshold}ms)`, {
      operation,
      duration,
      threshold,
      exceedBy: duration - threshold,
    });
  }

  /**
   * Log an event with structured data
   *
   * @param eventName - Event name
   * @param data - Event data
   */
  public event(eventName: string, data?: Record<string, unknown>): void {
    this.info(`Event: ${eventName}`, data);

    if (this.telemetryEnabled) {
      this.sendTelemetry(eventName, eventName, data);
    }
  }

  /**
   * Create a child logger with a specific prefix
   *
   * @param prefix - Prefix for all log messages
   * @returns Child logger instance
   *
   * @example
   * ```typescript
   * const commandLogger = logger.createChild('Commands');
   * commandLogger.info('Command executed'); // Logs: "[Commands] Command executed"
   * ```
   */
  public createChild(prefix: string): ChildLogger {
    return new ChildLogger(this, prefix);
  }

  /**
   * Log a table of data for better visualization
   *
   * @param title - Table title
   * @param data - Array of objects to display
   */
  public table(title: string, data: Array<Record<string, unknown>>): void {
    this.info(title);
    if (data.length === 0) {
      this.outputChannel.appendLine('  (empty)');
      return;
    }

    try {
      // Simple table formatting
      const keys = Object.keys(data[0]!);
      const rows = data.map(item =>
        keys.map(key => String(item[key] ?? '')).join(' | ')
      );

      this.outputChannel.appendLine(`  ${keys.join(' | ')}`);
      this.outputChannel.appendLine(`  ${keys.map(() => '---').join(' | ')}`);
      rows.forEach(row => this.outputChannel.appendLine(`  ${row}`));
    } catch (error) {
      this.error('Failed to format table', error);
    }
  }

  /**
   * Measure and log execution time of a function
   *
   * @param label - Label for the measurement
   * @param fn - Function to measure
   * @returns Result of the function
   *
   * @example
   * ```typescript
   * const result = await logger.measure('Database Query', async () => {
   *   return await db.query();
   * });
   * ```
   */
  public async measure<T>(label: string, fn: () => Promise<T> | T): Promise<T> {
    const start = Date.now();
    this.debug(`Starting: ${label}`);

    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.debug(`Completed: ${label} (${duration}ms)`);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(`Failed: ${label} (${duration}ms)`, error);
      throw error;
    }
  }

  /**
   * Log a deprecation warning
   *
   * @param feature - Deprecated feature
   * @param alternative - Alternative to use
   * @param version - Version when feature will be removed
   */
  public deprecation(feature: string, alternative?: string, version?: string): void {
    let message = `DEPRECATED: ${feature}`;
    if (alternative) {
      message += ` - Use ${alternative} instead`;
    }
    if (version) {
      message += ` (will be removed in v${version})`;
    }
    this.warn(message);
  }

  /**
   * Log with a custom log level color/style
   *
   * @param level - Log level
   * @param message - Message to log
   * @param data - Additional data
   */
  public log(level: LogLevel, message: string, data?: unknown): void {
    this.write(level, message, data);
  }
}

/**
 * Child Logger with prefix support
 */
export class ChildLogger {
  /**
   *
   * @param parent
   * @param prefix
   */
  constructor(
    private readonly parent: Logger,
    private readonly prefix: string
  ) {}

  /**
   *
   * @param message
   */
  private formatMessage(message: string): string {
    return `[${this.prefix}] ${message}`;
  }

  /**
   *
   * @param message
   * @param data
   */
  public debug(message: string, data?: unknown): void {
    this.parent.debug(this.formatMessage(message), data);
  }

  /**
   *
   * @param message
   * @param data
   */
  public info(message: string, data?: unknown): void {
    this.parent.info(this.formatMessage(message), data);
  }

  /**
   *
   * @param message
   * @param data
   */
  public warn(message: string, data?: unknown): void {
    this.parent.warn(this.formatMessage(message), data);
  }

  /**
   *
   * @param message
   * @param error
   */
  public error(message: string, error?: Error | unknown): void {
    this.parent.error(this.formatMessage(message), error);
  }

  /**
   *
   * @param message
   * @param data
   */
  public success(message: string, data?: unknown): void {
    this.parent.success(this.formatMessage(message), data);
  }
}

/**
 * Create specialized loggers for different subsystems
 */
export class LoggerFactory {
  /**
   * Create a logger for the analyzer
   */
  public static createAnalyzerLogger(): Logger {
    return Logger.createLogger(OUTPUT_CHANNELS.ANALYZER);
  }

  /**
   * Create a logger for the generator
   */
  public static createGeneratorLogger(): Logger {
    return Logger.createLogger(OUTPUT_CHANNELS.GENERATOR);
  }

  /**
   * Create a logger for the validator
   */
  public static createValidatorLogger(): Logger {
    return Logger.createLogger(OUTPUT_CHANNELS.VALIDATOR);
  }

  /**
   * Create a logger for the main extension
   */
  public static createMainLogger(): Logger {
    return Logger.getInstance(OUTPUT_CHANNELS.MAIN);
  }
}

/**
 * Default logger instance
 */
export const logger = Logger.getInstance();

/**
 * Specialized logger instances
 */
export const analyzerLogger = LoggerFactory.createAnalyzerLogger();
export const generatorLogger = LoggerFactory.createGeneratorLogger();
export const validatorLogger = LoggerFactory.createValidatorLogger();
