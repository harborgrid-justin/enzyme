/**
 * LoggerService - Enterprise logging service for the Enzyme VS Code Extension
 * Provides structured logging with multiple channels and telemetry integration
 */

import * as vscode from 'vscode';
import { LogLevel } from '../types';
import { OUTPUT_CHANNELS, CONFIG_KEYS } from '../core/constants';

/**
 * LoggerService - Singleton service for structured logging
 */
export class LoggerService {
  private static instance: LoggerService;
  private outputChannels: Map<string, vscode.OutputChannel> = new Map();
  private logLevel: LogLevel = LogLevel.INFO;
  private telemetryEnabled: boolean = false;
  private logHistory: Array<{ level: LogLevel; message: string; timestamp: number; data?: unknown }> = [];
  private maxHistorySize: number = 1000;

  private constructor() {
    this.loadConfiguration();
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
   * Get or create an output channel
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
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * Format a log message
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
   * Write a log message
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
   */
  public debug(message: string, data?: unknown, channelName?: string): void {
    this.write(LogLevel.DEBUG, message, data, channelName);
  }

  /**
   * Log an info message
   */
  public info(message: string, data?: unknown, channelName?: string): void {
    this.write(LogLevel.INFO, message, data, channelName);
  }

  /**
   * Log a warning message
   */
  public warn(message: string, data?: unknown, channelName?: string): void {
    this.write(LogLevel.WARN, message, data, channelName);
  }

  /**
   * Log an error message
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
   */
  public success(message: string, data?: unknown, channelName?: string): void {
    this.info(`✓ ${message}`, data, channelName);
  }

  /**
   * Show an output channel
   */
  public show(channelName?: string, preserveFocus: boolean = true): void {
    const channel = this.getChannel(channelName);
    channel.show(preserveFocus);
  }

  /**
   * Clear an output channel
   */
  public clear(channelName?: string): void {
    const channel = this.getChannel(channelName);
    channel.clear();
  }

  /**
   * Set log level
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
    // Reset singleton instance
    if (LoggerService.instance === this) {
      LoggerService.instance = null as any;
    }
  }
}
