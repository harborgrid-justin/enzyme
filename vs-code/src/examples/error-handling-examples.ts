/**
 * Error Handling Examples for Enzyme VS Code Extension
 *
 * This file demonstrates best practices for error handling in the extension.
 * These examples show how to use the error handling system effectively.
 *
 * @module examples/error-handling
 */

import * as vscode from 'vscode';
import { errorHandler } from '../core/error-handler';
import {
  EnzymeError,
  FileSystemError,
  NetworkError,
  ConfigurationError,
  WorkspaceError,
  CommandError,
  ErrorCode,
  ErrorCategory as _ErrorCategory,
  ErrorSeverity as _ErrorSeverity,
  wrapError,
  getUserMessage as _getUserMessage
} from '../core/errors';
import { logger } from '../core/logger';

/**
 * Example 14: Decorator for Automatic Error Handling
 */
import type {
  RecoveryAction} from '../core/errors';

/**
 * Example 1: Basic Error Handling with Try-Catch
 */
export async function example1_BasicErrorHandling(): Promise<void> {
  try {
    // Simulate an operation that might fail
    const result = await someRiskyOperation();
    logger.info('Operation succeeded', { result });
  } catch (error) {
    // Handle the error with the error handler
    await errorHandler.handleError(error, {
      component: 'Example1',
      operation: 'someRiskyOperation',
    });
  }
}

/**
 * Example 2: Creating and Throwing Custom Errors
 * @param filePath
 */
export async function example2_CustomErrors(filePath: string): Promise<void> {
  // Check if file exists
  try {
    await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
  } catch {
    // Create a detailed FileSystemError
    throw new FileSystemError(
      `Configuration file not found at ${filePath}`,
      ErrorCode.FILE_NOT_FOUND,
      {
        filePath,
        component: 'ConfigLoader',
        operation: 'loadConfig',
      },
      'The configuration file could not be found. Please ensure enzyme.config.ts exists in your project root.'
    );
  }
}

/**
 * Example 3: Error Handling with Recovery Actions
 */
export async function example3_RecoveryActions(): Promise<void> {
  try {
    await loadConfiguration();
  } catch (error) {
    const recoveryActions: RecoveryAction[] = [
      {
        label: 'Create Default Config',
        description: 'Generate a new enzyme.config.ts with default values',
        handler: async () => {
          await createDefaultConfiguration();
          vscode.window.showInformationMessage('Default configuration created');
        },
        primary: true,
      },
      {
        label: 'Open Documentation',
        description: 'View configuration documentation',
        handler: async () => {
          await vscode.env.openExternal(
            vscode.Uri.parse('https://enzyme.dev/docs/configuration')
          );
        },
      },
    ];

    await errorHandler.handleError(error, {
      component: 'ConfigLoader',
      operation: 'loadConfiguration',
    }, {
      userMessage: 'Failed to load Enzyme configuration',
      recoveryActions,
    });
  }
}

/**
 * Example 4: Retry Logic with Exponential Backoff
 */
export async function example4_RetryLogic(): Promise<any> {
  return await errorHandler.executeWithRetry(
    async () => {
      // Simulate API call that might fail
      return await fetchDataFromAPI();
    },
    'fetchDataFromAPI',
    {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      exponentialBackoff: true,
      shouldRetry: (error, attempt) => {
        // Only retry on network errors
        return error instanceof NetworkError && attempt < 3;
      },
    }
  );
}

/**
 * Example 5: Timeout Handling
 */
export async function example5_TimeoutHandling(): Promise<any> {
  try {
    return await errorHandler.executeWithTimeout(
      async () => {
        // Long-running operation
        return await performLongOperation();
      },
      5000, // 5 second timeout
      'performLongOperation'
    );
  } catch (error) {
    if (error instanceof CommandError && error.code === ErrorCode.COMMAND_TIMEOUT) {
      // Handle timeout specifically
      logger.warn('Operation timed out, will retry with longer timeout');
      return await errorHandler.executeWithTimeout(
        async () => performLongOperation(),
        10000, // 10 second timeout
        'performLongOperation'
      );
    }
    throw error;
  }
}

/**
 * Example 6: Workspace Error Handling
 */
export async function example6_WorkspaceErrors(): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

  if (!workspaceFolder) {
    throw new WorkspaceError(
      'No workspace folder is open',
      ErrorCode.NO_WORKSPACE,
      {
        component: 'WorkspaceChecker',
      },
      'Please open a folder or workspace to use Enzyme features.'
    );
  }

  // Check if it's an Enzyme project
  const isEnzyme = await detectEnzymeProject(workspaceFolder);

  if (!isEnzyme) {
    throw new WorkspaceError(
      'Current workspace is not an Enzyme project',
      ErrorCode.WORKSPACE_NOT_ENZYME,
      {
        component: 'WorkspaceChecker',
      },
      'This folder does not appear to be an Enzyme project. Please ensure you have Enzyme installed.'
    );
  }
}

/**
 * Example 7: Logging Different Error Types
 */
export async function example7_LoggingExamples(): Promise<void> {
  try {
    await performOperation();
  } catch (error) {
    // Log EnzymeError with full context
    if (error instanceof EnzymeError) {
      logger.logError(error, { additionalInfo: 'Custom context' });
    }

    // Log with stack trace
    if (error instanceof Error) {
      logger.errorWithStack('Operation failed', error, {
        component: 'Example7',
      });
    }

    // Log critical errors
    logger.critical('Critical system failure', error);

    // Rethrow
    throw error;
  }
}

/**
 * Example 8: Using Child Loggers
 */
export async function example8_ChildLoggers(): Promise<void> {
  const commandLogger = logger.createChild('Commands');
  const validatorLogger = logger.createChild('Validator');

  commandLogger.info('Executing command'); // Logs: "[Commands] Executing command"
  validatorLogger.warn('Validation warning'); // Logs: "[Validator] Validation warning"

  try {
    await runCommand();
  } catch (error) {
    commandLogger.error('Command failed', error);
  }
}

/**
 * Example 9: Performance Tracking
 */
export async function example9_PerformanceTracking(): Promise<void> {
  // Measure operation time
  await logger.measure('Heavy Computation', async () => {
    return await heavyComputation();
  });

  // Manual timing
  const start = Date.now();
  await anotherOperation();
  const duration = Date.now() - start;

  // Log performance warning if threshold exceeded
  const threshold = 100; // ms
  if (duration > threshold) {
    logger.performanceWarning('anotherOperation', duration, threshold);
  }
}

/**
 * Example 10: Wrapping Unknown Errors
 */
export async function example10_WrappingErrors(): Promise<void> {
  try {
    // Third-party library call that might throw unknown error types
    await thirdPartyLibrary.doSomething();
  } catch (error) {
    // Wrap unknown error into EnzymeError
    const wrappedError = wrapError(
      error,
      'Third-party library operation failed',
      {
        component: 'ThirdPartyIntegration',
        operation: 'doSomething',
      }
    );

    await errorHandler.handleError(wrappedError);
    throw wrappedError;
  }
}

/**
 * Example 11: Error Aggregation and Monitoring
 */
export async function example11_ErrorAggregation(): Promise<void> {
  // Errors are automatically aggregated
  try {
    await failingOperation();
  } catch (error) {
    await errorHandler.handleError(error);
  }

  // Later, check aggregations
  const aggregations = errorHandler.getErrorAggregations();

  for (const [_key, agg] of aggregations) {
    if (agg.count > 10) {
      logger.warn(`Error occurred ${agg.count} times`, {
        error: agg.error.code,
        firstOccurrence: new Date(agg.firstOccurrence),
        lastOccurrence: new Date(agg.lastOccurrence),
      });
    }
  }

  // Clear aggregations if needed
  errorHandler.clearAggregations();
}

/**
 * Example 12: Circuit Breaker Pattern
 */
export async function example12_CircuitBreaker(): Promise<void> {
  // Circuit breaker automatically tracks failures
  // After threshold failures, circuit opens and rejects calls

  try {
    await errorHandler.executeWithRetry(
      async () => await unreliableService(),
      'unreliableService'
    );
  } catch {
    // Check circuit breaker status
    const breakers = errorHandler.getCircuitBreakers();
    const serviceBreaker = breakers.get('unreliableService');

    if (serviceBreaker?.state === 'open') {
      logger.warn('Circuit breaker is open for unreliableService');

      // Manually reset if needed
      errorHandler.resetCircuitBreaker('unreliableService');
    }
  }
}

/**
 * Example 13: Configuration Errors
 */
export async function example13_ConfigurationErrors(): Promise<void> {
  try {
    const config = await loadConfig();

    // Validate configuration
    if (!config.features || config.features.length === 0) {
      throw new ConfigurationError(
        'No features defined in enzyme.config.ts',
        ErrorCode.CONFIG_VALIDATION_ERROR,
        {
          filePath: './enzyme.config.ts',
          component: 'ConfigValidator',
        },
        'Your Enzyme configuration does not define any features. Please add at least one feature to your config.'
      );
    }
  } catch (error) {
    await errorHandler.handleError(error, {}, {
      recoveryActions: [
        {
          label: 'View Example Config',
          handler: async () => {
            await showExampleConfiguration();
          },
        },
      ],
    });
  }
}

/**
 *
 */
export class CommandService {
  /**
   * Method with automatic error handling via decorator
   * Note: Decorator disabled due to type compatibility issues
   * @param commandId
   */
  // @handleErrors
  async executeCommand(commandId: string): Promise<void> {
    logger.info(`Executing command: ${commandId}`);

    // If an error is thrown here, it will be automatically:
    // 1. Caught
    // 2. Logged
    // 3. Reported to telemetry
    // 4. Shown to user
    // 5. Re-thrown

    await performCommandAction(commandId);
  }
}

/**
 * Example 15: Structured Error Context
 */
export async function example15_ErrorContext(): Promise<void> {
  try {
    await processFile('src/features/auth/index.ts');
  } catch {
    throw new FileSystemError(
      'Failed to process file',
      ErrorCode.FILE_READ_ERROR,
      {
        filePath: 'src/features/auth/index.ts',
        line: 42,
        column: 15,
        component: 'FileProcessor',
        operation: 'processFile',
        metadata: {
          fileSize: 1024,
          encoding: 'utf-8',
          lastModified: Date.now(),
        },
      },
      'An error occurred while processing the file. The file may be corrupted or in use by another process.'
    );
  }
}

// Helper functions (simulated)
/**
 *
 */
async function someRiskyOperation(): Promise<string> {
  return 'success';
}

/**
 *
 */
async function loadConfiguration(): Promise<any> {
  throw new Error('Config not found');
}

/**
 *
 */
async function createDefaultConfiguration(): Promise<void> {
  // Implementation
}

/**
 *
 */
async function fetchDataFromAPI(): Promise<any> {
  return { data: 'example' };
}

/**
 *
 */
async function performLongOperation(): Promise<any> {
  return new Promise(resolve => setTimeout(() => resolve('done'), 3000));
}

/**
 *
 * @param _folder
 */
async function detectEnzymeProject(_folder: vscode.WorkspaceFolder): Promise<boolean> {
  return true;
}

/**
 *
 */
async function performOperation(): Promise<void> {
  // Implementation
}

/**
 *
 */
async function runCommand(): Promise<void> {
  // Implementation
}

/**
 *
 */
async function heavyComputation(): Promise<number> {
  return 42;
}

/**
 *
 */
async function anotherOperation(): Promise<void> {
  // Implementation
}

/**
 *
 */
async function thirdPartyLibrary(): Promise<void> {
  // Placeholder
}
thirdPartyLibrary.doSomething = async () => {};

/**
 *
 */
async function failingOperation(): Promise<void> {
  throw new Error('Operation failed');
}

/**
 *
 */
async function unreliableService(): Promise<any> {
  return {};
}

/**
 *
 */
async function loadConfig(): Promise<any> {
  return { features: [] };
}

/**
 *
 */
async function showExampleConfiguration(): Promise<void> {
  // Implementation
}

/**
 *
 * @param _commandId
 */
async function performCommandAction(_commandId: string): Promise<void> {
  // Implementation
}

/**
 *
 * @param _path
 */
async function processFile(_path: string): Promise<void> {
  // Implementation
}
