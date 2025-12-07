/**
 * Enterprise Logging Utility for Enzyme VS Code Extension
 * Provides structured logging with multiple output channels and telemetry integration
 */

import * as vscode from 'vscode';
import { LogLevel } from '../types';
import { OUTPUT_CHANNELS, CONFIG_KEYS, TELEMETRY_EVENTS } from './constants';

/**
 * Logger class for structured logging with multiple severity levels
 */
export class Logger {
  private static instance: Logger;
  private outputChannel: vscode.OutputChannel;
  private logLevel: LogLevel = LogLevel.INFO;
  private telemetryEnabled: boolean = false;

  private constructor(channelName: string = OUTPUT_CHANNELS.MAIN) {
    this.outputChannel = vscode.window.createOutputChannel(channelName);
    this.loadConfiguration();
  }

  /**
   * Get the singleton instance of the Logger
   */
  public static getInstance(channelName?: string): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(channelName);
    }
    return Logger.instance;
  }

  /**
   * Create a new logger instance with a specific channel name
   */
  public static createLogger(channelName: string): Logger {
    return new Logger(channelName);
  }

  /**
   * Load configuration from VS Code settings
   */
  private loadConfiguration(): void {
    const config = vscode.workspace.getConfiguration();
    const levelString = config.get<string>(CONFIG_KEYS.LOGGING_LEVEL, 'info');
    this.logLevel = this.parseLogLevel(levelString);
    this.telemetryEnabled = config.get<boolean>(CONFIG_KEYS.TELEMETRY_ENABLED, false);
  }

  /**
   * Parse log level string to LogLevel enum
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
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * Format a log message with timestamp and level
   */
  private formatMessage(level: LogLevel, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase().padEnd(5);
    let formatted = `[${timestamp}] [${levelStr}] ${message}`;

    if (data !== undefined) {
      try {
        const dataStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        formatted += `\n${dataStr}`;
      } catch (error) {
        formatted += `\n[Unable to stringify data: ${String(error)}]`;
      }
    }

    return formatted;
  }

  /**
   * Write a log message to the output channel
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
   */
  public debug(message: string, data?: unknown): void {
    this.write(LogLevel.DEBUG, message, data);
  }

  /**
   * Log an info message
   */
  public info(message: string, data?: unknown): void {
    this.write(LogLevel.INFO, message, data);
  }

  /**
   * Log a warning message
   */
  public warn(message: string, data?: unknown): void {
    this.write(LogLevel.WARN, message, data);
  }

  /**
   * Log an error message
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
   */
  public success(message: string, data?: unknown): void {
    this.info(`✓ ${message}`, data);
  }

  /**
   * Log the start of an operation
   */
  public startOperation(operationName: string, context?: unknown): void {
    this.info(`Starting: ${operationName}`, context);
  }

  /**
   * Log the end of an operation with elapsed time
   */
  public endOperation(operationName: string, startTime: number, result?: unknown): void {
    const elapsed = Date.now() - startTime;
    this.info(`Completed: ${operationName} (${elapsed}ms)`, result);
  }

  /**
   * Log an operation with automatic timing
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
   */
  public show(preserveFocus: boolean = true): void {
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
    this.outputChannel.dispose();
    // Reset singleton instance
    if (Logger.instance === this) {
      Logger.instance = null as any;
    }
  }

  /**
   * Set the log level
   */
  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    this.info(`Log level set to: ${level}`);
  }

  /**
   * Enable or disable telemetry
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
   */
  public header(title: string): void {
    this.divider();
    this.info(title);
    this.divider();
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
