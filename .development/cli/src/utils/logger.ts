/**
 * @file Logger utility with colored output and log levels
 * @module utils/logger
 */

import chalk from 'chalk';
import ora, { Ora } from 'ora';
import { LogLevel, Logger as ILogger } from '../types/index.js';

/**
 * Logger implementation with colored output
 */
export class Logger implements ILogger {
  private level: LogLevel = LogLevel.INFO;
  private verbose = false;
  private spinner: Ora | null = null;
  private noColor = false;

  /**
   * Create a new logger instance
   * @param options - Logger options
   */
  constructor(options?: { verbose?: boolean; noColor?: boolean }) {
    this.verbose = options?.verbose || false;
    this.noColor = options?.noColor || false;

    if (this.noColor) {
      chalk.level = 0; // Disable colors
    }
  }

  /**
   * Log debug message (only shown in verbose mode)
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.verbose || this.level === LogLevel.DEBUG) {
      const formattedArgs = args.map((arg) => this.formatArg(arg)).join(' ');
      console.log(chalk.gray(`[DEBUG] ${message}`), formattedArgs);
    }
  }

  /**
   * Log info message
   */
  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const formattedArgs = args.map((arg) => this.formatArg(arg)).join(' ');
      console.log(chalk.blue(`ℹ ${message}`), formattedArgs);
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const formattedArgs = args.map((arg) => this.formatArg(arg)).join(' ');
      console.warn(chalk.yellow(`⚠ ${message}`), formattedArgs);
    }
  }

  /**
   * Log error message
   */
  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const formattedArgs = args.map((arg) => this.formatArg(arg)).join(' ');
      console.error(chalk.red(`✖ ${message}`), formattedArgs);
    }
  }

  /**
   * Log success message
   */
  success(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.SUCCESS)) {
      const formattedArgs = args.map((arg) => this.formatArg(arg)).join(' ');
      console.log(chalk.green(`✔ ${message}`), formattedArgs);
    }
  }

  /**
   * Start a spinner with a message
   */
  startSpinner(message: string): void {
    if (this.spinner) {
      this.spinner.stop();
    }
    this.spinner = ora({
      text: message,
      color: 'cyan',
      spinner: 'dots',
    }).start();
  }

  /**
   * Update spinner message
   */
  updateSpinner(message: string): void {
    if (this.spinner) {
      this.spinner.text = message;
    }
  }

  /**
   * Stop spinner with success
   */
  succeedSpinner(message?: string): void {
    if (this.spinner) {
      if (message) {
        this.spinner.succeed(message);
      } else {
        this.spinner.succeed();
      }
      this.spinner = null;
    }
  }

  /**
   * Stop spinner with failure
   */
  failSpinner(message?: string): void {
    if (this.spinner) {
      if (message) {
        this.spinner.fail(message);
      } else {
        this.spinner.fail();
      }
      this.spinner = null;
    }
  }

  /**
   * Stop spinner with warning
   */
  warnSpinner(message?: string): void {
    if (this.spinner) {
      if (message) {
        this.spinner.warn(message);
      } else {
        this.spinner.warn();
      }
      this.spinner = null;
    }
  }

  /**
   * Stop spinner with info
   */
  infoSpinner(message?: string): void {
    if (this.spinner) {
      if (message) {
        this.spinner.info(message);
      } else {
        this.spinner.info();
      }
      this.spinner = null;
    }
  }

  /**
   * Stop spinner
   */
  stopSpinner(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Set verbose mode
   */
  setVerbose(verbose: boolean): void {
    this.verbose = verbose;
  }

  /**
   * Log a blank line
   */
  newLine(): void {
    console.log();
  }

  /**
   * Log a divider
   */
  divider(): void {
    console.log(chalk.gray('─'.repeat(50)));
  }

  /**
   * Log a header
   */
  header(message: string): void {
    console.log();
    console.log(chalk.bold.cyan(message));
    this.divider();
  }

  /**
   * Log a table
   */
  table(data: Record<string, string | number>[]): void {
    console.table(data);
  }

  /**
   * Log a list
   */
  list(items: string[], options?: { bullet?: string; indent?: number }): void {
    const bullet = options?.bullet || '•';
    const indent = options?.indent || 2;
    const prefix = ' '.repeat(indent);

    items.forEach((item) => {
      console.log(`${prefix}${chalk.cyan(bullet)} ${item}`);
    });
  }

  /**
   * Log object as JSON
   */
  json(obj: unknown, pretty = true): void {
    console.log(JSON.stringify(obj, null, pretty ? 2 : 0));
  }

  /**
   * Create a child logger with a prefix
   */
  child(prefix: string): Logger {
    const childLogger = new Logger({
      verbose: this.verbose,
      noColor: this.noColor,
    });
    childLogger.setLevel(this.level);

    // Wrap all methods to add prefix
    const originalDebug = childLogger.debug.bind(childLogger);
    const originalInfo = childLogger.info.bind(childLogger);
    const originalWarn = childLogger.warn.bind(childLogger);
    const originalError = childLogger.error.bind(childLogger);
    const originalSuccess = childLogger.success.bind(childLogger);

    childLogger.debug = (msg, ...args) => originalDebug(`[${prefix}] ${msg}`, ...args);
    childLogger.info = (msg, ...args) => originalInfo(`[${prefix}] ${msg}`, ...args);
    childLogger.warn = (msg, ...args) => originalWarn(`[${prefix}] ${msg}`, ...args);
    childLogger.error = (msg, ...args) => originalError(`[${prefix}] ${msg}`, ...args);
    childLogger.success = (msg, ...args) => originalSuccess(`[${prefix}] ${msg}`, ...args);

    return childLogger;
  }

  /**
   * Format argument for logging
   */
  private formatArg(arg: unknown): string {
    if (typeof arg === 'object' && arg !== null) {
      return JSON.stringify(arg, null, 2);
    }
    return String(arg);
  }

  /**
   * Check if log level should be displayed
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.SUCCESS];
    const currentIndex = levels.indexOf(this.level);
    const messageIndex = levels.indexOf(level);

    return messageIndex >= currentIndex;
  }
}

/**
 * Create a new logger instance
 */
export function createLogger(options?: { verbose?: boolean; noColor?: boolean }): Logger {
  return new Logger(options);
}

/**
 * Default logger instance
 */
export const logger = new Logger();
