/**
 * @file Logger Unit Tests
 * @description Comprehensive unit tests for the Logger class
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock vscode module
vi.mock('vscode');

import { Logger, LoggerFactory } from '../../../core/logger';
import { LogLevel } from '../../../types';

describe('Logger', () => {
  let logger: Logger;
  let outputChannel: any;

  beforeEach(() => {
    // Create a new logger instance for each test
    const mockVscode = require('vscode');
    logger = Logger.createLogger('Test Channel');
    // Get the output channel created by the logger
    outputChannel = mockVscode.window.createOutputChannel.mock.results[mockVscode.window.createOutputChannel.mock.results.length - 1]?.value;
  });

  afterEach(() => {
    logger.dispose();
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance when calling getInstance', () => {
      const instance1 = Logger.getInstance();
      const instance2 = Logger.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should create separate instances with createLogger', () => {
      const logger1 = Logger.createLogger('Channel1');
      const logger2 = Logger.createLogger('Channel2');
      expect(logger1).not.toBe(logger2);

      logger1.dispose();
      logger2.dispose();
    });
  });

  describe('Log Level Filtering', () => {
    it('should log DEBUG messages when log level is DEBUG', () => {
      logger.setLogLevel(LogLevel.DEBUG);
      logger.debug('Debug message');

      const messages = outputChannel.getMessages();
      expect(messages.length).toBeGreaterThan(0);
      expect(messages.some(msg => msg.includes('Debug message'))).toBe(true);
    });

    it('should not log DEBUG messages when log level is INFO', () => {
      logger.setLogLevel(LogLevel.INFO);
      logger.debug('Debug message');

      const messages = outputChannel.getMessages();
      expect(messages.every(msg => !msg.includes('Debug message'))).toBe(true);
    });

    it('should log INFO messages when log level is INFO', () => {
      logger.setLogLevel(LogLevel.INFO);
      logger.info('Info message');

      const messages = outputChannel.getMessages();
      expect(messages.some(msg => msg.includes('Info message'))).toBe(true);
    });

    it('should log WARN messages when log level is INFO', () => {
      logger.setLogLevel(LogLevel.INFO);
      logger.warn('Warning message');

      const messages = outputChannel.getMessages();
      expect(messages.some(msg => msg.includes('Warning message'))).toBe(true);
    });

    it('should log ERROR messages when log level is INFO', () => {
      logger.setLogLevel(LogLevel.INFO);
      logger.error('Error message');

      const messages = outputChannel.getMessages();
      expect(messages.some(msg => msg.includes('Error message'))).toBe(true);
    });

    it('should only log ERROR messages when log level is ERROR', () => {
      logger.setLogLevel(LogLevel.ERROR);
      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warning');
      logger.error('Error');

      const messages = outputChannel.getMessages();
      expect(messages.length).toBe(1);
      expect(messages[0]).toContain('Error');
    });
  });

  describe('Message Formatting', () => {
    it('should include timestamp in log messages', () => {
      logger.info('Test message');
      const lastMessage = outputChannel.getLastMessage();

      expect(lastMessage).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
    });

    it('should include log level in messages', () => {
      logger.info('Info test');
      logger.warn('Warning test');
      logger.error('Error test');

      const messages = outputChannel.getMessages();
      expect(messages[0]).toContain('[INFO ]');
      expect(messages[1]).toContain('[WARN ]');
      expect(messages[2]).toContain('[ERROR]');
    });

    it('should format additional data as JSON', () => {
      const data = { key: 'value', number: 42 };
      logger.info('Test with data', data);

      const lastMessage = outputChannel.getLastMessage();
      expect(lastMessage).toContain('"key": "value"');
      expect(lastMessage).toContain('"number": 42');
    });

    it('should handle non-serializable data gracefully', () => {
      const circular: any = { a: 1 };
      circular.self = circular;

      logger.info('Test with circular', circular);

      const lastMessage = outputChannel.getLastMessage();
      expect(lastMessage).toContain('Test with circular');
      // Should not throw, and should include some error message
      expect(lastMessage).toBeTruthy();
    });
  });

  describe('Error Logging', () => {
    it('should format Error objects properly', () => {
      const error = new Error('Test error');
      error.stack = 'Error stack trace';

      logger.error('An error occurred', error);

      const lastMessage = outputChannel.getLastMessage();
      expect(lastMessage).toContain('Test error');
      expect(lastMessage).toContain('Error stack trace');
    });

    it('should handle non-Error objects', () => {
      logger.error('Error with string', 'simple error');

      const lastMessage = outputChannel.getLastMessage();
      expect(lastMessage).toContain('Error with string');
      expect(lastMessage).toContain('simple error');
    });
  });

  describe('Success Logging', () => {
    it('should prefix success messages with checkmark', () => {
      logger.success('Operation completed');

      const lastMessage = outputChannel.getLastMessage();
      expect(lastMessage).toContain('✓ Operation completed');
    });
  });

  describe('Operation Logging', () => {
    it('should log operation start', () => {
      logger.startOperation('TestOperation');

      const lastMessage = outputChannel.getLastMessage();
      expect(lastMessage).toContain('Starting: TestOperation');
    });

    it('should log operation end with timing', () => {
      const startTime = Date.now() - 100; // Simulate 100ms operation
      logger.endOperation('TestOperation', startTime);

      const lastMessage = outputChannel.getLastMessage();
      expect(lastMessage).toContain('Completed: TestOperation');
      expect(lastMessage).toMatch(/\(\d+ms\)/);
    });

    it('should log async operations with timing', async () => {
      const operation = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'result';
      };

      const result = await logger.logOperation('AsyncOperation', operation);

      expect(result).toBe('result');
      const messages = outputChannel.getMessages();
      expect(messages.some(msg => msg.includes('Starting: AsyncOperation'))).toBe(true);
      expect(messages.some(msg => msg.includes('Completed: AsyncOperation'))).toBe(true);
    });

    it('should log failed operations', async () => {
      const operation = async () => {
        throw new Error('Operation failed');
      };

      await expect(logger.logOperation('FailedOperation', operation)).rejects.toThrow('Operation failed');

      const messages = outputChannel.getMessages();
      expect(messages.some(msg => msg.includes('Failed: FailedOperation'))).toBe(true);
    });
  });

  describe('Output Channel Management', () => {
    it('should show the output channel', () => {
      const spy = vi.spyOn(outputChannel, 'show');
      logger.show();
      expect(spy).toHaveBeenCalled();
    });

    it('should hide the output channel', () => {
      const spy = vi.spyOn(outputChannel, 'hide');
      logger.hide();
      expect(spy).toHaveBeenCalled();
    });

    it('should clear the output channel', () => {
      logger.info('Message 1');
      logger.info('Message 2');
      logger.clear();

      const messages = outputChannel.getMessages();
      expect(messages.length).toBe(0);
    });
  });

  describe('Visual Formatting', () => {
    it('should log dividers', () => {
      logger.divider();
      const lastMessage = outputChannel.getLastMessage();
      expect(lastMessage).toMatch(/─+/);
    });

    it('should log headers with dividers', () => {
      logger.header('Test Header');
      const messages = outputChannel.getMessages();

      expect(messages.length).toBe(3); // divider, header, divider
      expect(messages[1]).toContain('Test Header');
    });
  });

  describe('Telemetry', () => {
    it('should track telemetry state', () => {
      expect(logger.isTelemetryEnabled()).toBe(false);

      logger.setTelemetry(true);
      expect(logger.isTelemetryEnabled()).toBe(true);

      logger.setTelemetry(false);
      expect(logger.isTelemetryEnabled()).toBe(false);
    });
  });

  describe('Disposal', () => {
    it('should dispose resources properly', () => {
      const spy = vi.spyOn(outputChannel, 'dispose');
      logger.dispose();
      expect(spy).toHaveBeenCalled();
    });

    it('should reset singleton instance on dispose', () => {
      const instance1 = Logger.getInstance();
      instance1.dispose();

      // After dispose, getInstance should create a new instance
      const instance2 = Logger.getInstance();
      expect(instance2).not.toBe(instance1);

      instance2.dispose();
    });
  });
});

describe('LoggerFactory', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create analyzer logger', () => {
    const logger = LoggerFactory.createAnalyzerLogger();
    expect(logger).toBeDefined();
    logger.dispose();
  });

  it('should create generator logger', () => {
    const logger = LoggerFactory.createGeneratorLogger();
    expect(logger).toBeDefined();
    logger.dispose();
  });

  it('should create validator logger', () => {
    const logger = LoggerFactory.createValidatorLogger();
    expect(logger).toBeDefined();
    logger.dispose();
  });

  it('should create main logger', () => {
    const logger = LoggerFactory.createMainLogger();
    expect(logger).toBeDefined();
  });
});
