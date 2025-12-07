/**
 * LoggerService - Enterprise logging service for the Enzyme VS Code Extension
 * Provides structured logging with multiple channels and telemetry integration
 */

import * as vscode from 'vscode';
import { getExtensionConfig, onSettingChange } from '../config/extension-config';
import { OUTPUT_CHANNELS, CONFIG_KEYS as _CONFIG_KEYS } from '../core/constants';
import { LogLevel } from '../types';

/**
 * LoggerService - Singleton service for structured logging
 * Uses ExtensionConfig for type-safe configuration access with auto-reload
 */
export class LoggerService {
  private static instance: LoggerService;
  private readonly outputChannels = new Map<string, vscode.OutputChannel>();
  private logLevel: LogLevel = LogLevel.INFO;
  private logHistory: Array<{ level: LogLevel; message: string; timestamp: number; data?: unknown }> = [];
  private readonly maxHistorySize = 1000;
  private configDisposable?: vscode.Disposable;

  /**
   *
   */
  public constructor() {
    this.loadConfiguration();
    this.watchConfiguration();
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  /**
   * Load configuration from VS Code settings using ExtensionConfig
   * Provides type-safe access to logging settings
   */
  private loadConfiguration(): void {
    const config = getExtensionConfig();
    const levelString = config.get('enzyme.logging.level');
    this.logLevel = this.parseLogLevel(levelString);
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
   * Get or create an output channel
   * @param channelName
   */
  private getChannel(channelName: string = OUTPUT_CHANNELS.MAIN): vscode.OutputChannel {
    let channel = this.outputChannels.get(channelName);
    if (!channel) {
      channel = vscode.window.createOutputChannel(channelName);
      this.outputChannels.set(channelName, channel);
    }
    return channel;
  }

  /**
   * Check if a log level should be logged
   * @param level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * Format a log message
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
   * Write a log message
   * @param level
   * @param message
   * @param data
   * @param channelName
   */
  private write(level: LogLevel, message: string, data?: unknown, channelName?: string): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const formatted = this.formatMessage(level, message, data);
    const channel = this.getChannel(channelName);
    channel.appendLine(formatted);

    // Add to history
    this.logHistory.push({ level, message, timestamp: Date.now(), data });
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }
  }

  /**
   * Log a debug message
   * @param message
   * @param data
   * @param channelName
   */
  public debug(message: string, data?: unknown, channelName?: string): void {
    this.write(LogLevel.DEBUG, message, data, channelName);
  }

  /**
   * Log an info message
   * @param message
   * @param data
   * @param channelName
   */
  public info(message: string, data?: unknown, channelName?: string): void {
    this.write(LogLevel.INFO, message, data, channelName);
  }

  /**
   * Log a warning message
   * @param message
   * @param data
   * @param channelName
   */
  public warn(message: string, data?: unknown, channelName?: string): void {
    this.write(LogLevel.WARN, message, data, channelName);
  }

  /**
   * Log an error message
   * @param message
   * @param error
   * @param channelName
   */
  public error(message: string, error?: Error | unknown, channelName?: string): void {
    let errorData: unknown = error;

    if (error instanceof Error) {
      errorData = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    this.write(LogLevel.ERROR, message, errorData, channelName);
  }

  /**
   * Log a success message
   * @param message
   * @param data
   * @param channelName
   */
  public success(message: string, data?: unknown, channelName?: string): void {
    this.info(`✓ ${message}`, data, channelName);
  }

  /**
   * Show an output channel
   * @param channelName
   * @param preserveFocus
   */
  public show(channelName?: string, preserveFocus = true): void {
    const channel = this.getChannel(channelName);
    channel.show(preserveFocus);
  }

  /**
   * Clear an output channel
   * @param channelName
   */
  public clear(channelName?: string): void {
    const channel = this.getChannel(channelName);
    channel.clear();
  }

  /**
   * Set log level
   * @param level
   */
  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    this.info(`Log level set to: ${level}`);
  }

  /**
   * Get log level
   */
  public getLogLevel(): LogLevel {
    return this.logLevel;
  }

  /**
   * Get log history
   * @param count
   */
  public getHistory(count?: number): typeof this.logHistory {
    if (count) {
      return this.logHistory.slice(-count);
    }
    return [...this.logHistory];
  }

  /**
   * Clear log history
   */
  public clearHistory(): void {
    this.logHistory = [];
  }

  /**
   * Dispose all output channels
   * FIXED: Now properly resets singleton instance to prevent memory leaks
   */
  public dispose(): void {
    this.outputChannels.forEach(channel => channel.dispose());
    this.outputChannels.clear();
    this.logHistory = [];
    this.configDisposable?.dispose();
    // Reset singleton instance
    if (LoggerService.instance === this) {
      LoggerService.instance = null as any;
    }
  }
}
