# Error Handling & Logging Guide

## Overview

This document describes the comprehensive error handling and logging system implemented for the Enzyme VS Code Extension. The system provides robust error management, user-friendly notifications, telemetry integration, and automatic recovery mechanisms.

## Architecture

### Components

1. **Error Types** (`src/core/errors.ts`)
   - Comprehensive error hierarchy
   - Error codes for categorization
   - Context and metadata support
   - Recovery suggestions

2. **Error Handler** (`src/core/error-handler.ts`)
   - Centralized error handling
   - Retry mechanisms with exponential backoff
   - Circuit breaker pattern
   - Error aggregation and reporting

3. **Logger** (`src/core/logger.ts`)
   - Structured logging with multiple levels
   - Output channel integration
   - Telemetry integration
   - Performance tracking

4. **Telemetry Service** (`src/orchestration/telemetry-service.ts`)
   - Opt-in error tracking
   - Privacy-compliant data anonymization
   - Error analytics

## Error Types Hierarchy

```
EnzymeError (base class)
├── FileSystemError
├── NetworkError
├── ParseError
├── ConfigurationError
├── ValidationError
├── WorkspaceError
├── CommandError
└── ProviderError
```

### Error Codes

Errors are categorized using structured error codes:

- **1xxx**: File System Errors
- **2xxx**: Network Errors
- **3xxx**: Parse Errors
- **4xxx**: Configuration Errors
- **5xxx**: Validation Errors
- **6xxx**: Internal Errors
- **7xxx**: Workspace Errors
- **8xxx**: Command Errors
- **9xxx**: Provider Errors
- **10xxx**: Telemetry Errors

## Usage Patterns

### Basic Error Handling

```typescript
import { errorHandler, FileSystemError, ErrorCode } from './core/error-handler';

async function readConfigFile(path: string): Promise<Config> {
  try {
    const content = await vscode.workspace.fs.readFile(vscode.Uri.file(path));
    return JSON.parse(content.toString());
  } catch (error) {
    // Wrap and handle the error
    await errorHandler.handleError(error, {
      component: 'ConfigReader',
      operation: 'readConfigFile',
    }, {
      userMessage: 'Failed to read configuration file',
      recoveryActions: [{
        label: 'Create Config',
        description: 'Create a new configuration file',
        handler: async () => {
          await createDefaultConfig();
        },
        primary: true,
      }],
    });
    throw error;
  }
}
```

### Creating Custom Errors

```typescript
import { FileSystemError, ErrorCode, ErrorSeverity } from './core/errors';

throw new FileSystemError(
  'Configuration file not found',
  ErrorCode.FILE_NOT_FOUND,
  {
    filePath: '/path/to/enzyme.config.ts',
    component: 'ConfigLoader',
  },
  'Could not find enzyme.config.ts in your project'
);
```

### Using Retry Logic

```typescript
import { errorHandler } from './core/error-handler';

const data = await errorHandler.executeWithRetry(
  async () => await fetchDataFromAPI(),
  'fetchDataFromAPI',
  {
    maxRetries: 3,
    initialDelay: 1000,
    exponentialBackoff: true,
    shouldRetry: (error, attempt) => {
      // Custom retry logic
      return error instanceof NetworkError && attempt < 3;
    },
  }
);
```

### Using Timeout

```typescript
import { errorHandler } from './core/error-handler';

const result = await errorHandler.executeWithTimeout(
  async () => await longRunningOperation(),
  5000, // 5 second timeout
  'longRunningOperation'
);
```

### Logging Errors

```typescript
import { logger } from './core/logger';

try {
  await performOperation();
} catch (error) {
  // Log EnzymeError with full context
  logger.logError(error);

  // Or use standard error logging
  logger.error('Operation failed', error);

  // Log critical errors
  logger.critical('Critical failure in core system', error);
}
```

### Using Decorator for Automatic Error Handling

```typescript
import { handleErrors } from './core/error-handler';

class MyService {
  @handleErrors
  async performOperation(): Promise<void> {
    // Method implementation
    // Errors are automatically caught, logged, and reported
  }
}
```

## Logging Best Practices

### Log Levels

- **DEBUG**: Detailed information for debugging (not shown in production)
- **INFO**: General informational messages
- **WARN**: Warning messages for potentially harmful situations
- **ERROR**: Error messages for failures
- **CRITICAL**: Critical errors requiring immediate attention

### Structured Logging

```typescript
import { logger } from './core/logger';

// Log with context
logger.info('Processing file', {
  fileName: 'config.ts',
  size: 1024,
  lastModified: Date.now(),
});

// Log operations with timing
await logger.measure('Database Query', async () => {
  return await db.query();
});

// Log tables
logger.table('Users', [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
]);

// Create child loggers
const commandLogger = logger.createChild('Commands');
commandLogger.info('Executing generate command');
```

### Performance Logging

```typescript
// Log performance warnings
logger.performanceWarning('renderComponent', 150, 100); // took 150ms, threshold 100ms

// Log events
logger.event('feature.enabled', { featureId: 'dark-mode' });

// Deprecation warnings
logger.deprecation('oldMethod', 'newMethod', '2.0.0');
```

## Error Recovery Mechanisms

### Circuit Breaker

The error handler implements a circuit breaker pattern to prevent cascading failures:

```typescript
// Circuit breaker automatically opens after threshold failures
// Operations are rejected while circuit is open
// Circuit enters half-open state after reset timeout
// Circuit closes on successful operation
```

Configuration:
- **Threshold**: 5 failures (default)
- **Reset Timeout**: 60 seconds (default)

### Error Aggregation

Errors are aggregated for batch reporting and analysis:

```typescript
// Get aggregated errors
const aggregations = errorHandler.getErrorAggregations();

for (const [key, agg] of aggregations) {
  console.log(`Error occurred ${agg.count} times`);
  console.log(`First: ${new Date(agg.firstOccurrence)}`);
  console.log(`Last: ${new Date(agg.lastOccurrence)}`);
}

// Clear aggregations
errorHandler.clearAggregations();
```

## User Notifications

### Notification Levels

Notifications are shown based on error severity:

- **CRITICAL/HIGH**: Error message (red)
- **MEDIUM**: Warning message (yellow)
- **LOW**: Information message (blue)

### Recovery Actions

Recovery actions provide users with actionable steps:

```typescript
{
  recoveryActions: [
    {
      label: 'Retry',
      description: 'Try the operation again',
      handler: async () => {
        await retryOperation();
      },
      primary: true,
    },
    {
      label: 'Open Documentation',
      description: 'View help documentation',
      handler: async () => {
        await vscode.env.openExternal(docsUrl);
      },
    },
  ],
}
```

## Telemetry Integration

### Opt-In Error Tracking

Telemetry respects VS Code's global telemetry setting and extension-specific opt-in:

```typescript
// Check telemetry status
if (telemetryService.isEnabled()) {
  // Track errors
  telemetryService.trackError(error, {
    component: 'MyComponent',
  });
}
```

### Privacy

All telemetry data is anonymized:
- File paths are replaced with placeholders
- UUIDs are sanitized
- User-identifiable information is removed

## Testing Error Handling

### Unit Tests

```typescript
import { EnzymeError, ErrorCode, ErrorSeverity } from '../core/errors';

describe('Error Handling', () => {
  it('should create error with correct properties', () => {
    const error = new EnzymeError(
      'Test error',
      ErrorCode.FILE_NOT_FOUND,
      ErrorCategory.FILE_SYSTEM,
      ErrorSeverity.HIGH
    );

    expect(error.code).toBe(ErrorCode.FILE_NOT_FOUND);
    expect(error.severity).toBe(ErrorSeverity.HIGH);
  });

  it('should wrap unknown errors', () => {
    const error = wrapError(new Error('Unknown'), 'Failed operation');
    expect(error).toBeInstanceOf(EnzymeError);
  });
});
```

## Migration Guide

### Updating Existing Error Handling

**Before:**
```typescript
try {
  await operation();
} catch (error) {
  console.error('Operation failed:', error);
  vscode.window.showErrorMessage('Operation failed');
}
```

**After:**
```typescript
import { errorHandler } from './core/error-handler';

try {
  await operation();
} catch (error) {
  await errorHandler.handleError(error, {
    component: 'MyComponent',
    operation: 'operation',
  });
}
```

### Creating Specific Errors

**Before:**
```typescript
throw new Error('File not found');
```

**After:**
```typescript
import { FileSystemError, ErrorCode } from './core/errors';

throw new FileSystemError(
  'Configuration file not found',
  ErrorCode.FILE_NOT_FOUND,
  { filePath: configPath },
  'Could not find enzyme.config.ts'
);
```

## Configuration

Error handler can be configured:

```typescript
import { errorHandler } from './core/error-handler';

errorHandler.updateConfig({
  showNotifications: true,
  logErrors: true,
  reportToTelemetry: true,
  maxRetries: 3,
  circuitBreakerThreshold: 5,
  circuitBreakerResetTimeout: 60000,
});
```

## Troubleshooting

### Common Issues

1. **Errors not showing notifications**
   - Check if `showNotifications` is enabled
   - Verify error severity is appropriate

2. **Circuit breaker stuck open**
   - Reset manually: `errorHandler.resetCircuitBreaker('operationName')`
   - Check threshold and timeout configuration

3. **Telemetry not tracking errors**
   - Verify VS Code telemetry is enabled
   - Check extension telemetry setting
   - Ensure error has `reportable: true`

### Debugging

Enable debug logging:

```typescript
import { logger } from './core/logger';
import { LogLevel } from './types';

logger.setLogLevel(LogLevel.DEBUG);
```

View circuit breaker status:

```typescript
const breakers = errorHandler.getCircuitBreakers();
for (const [name, breaker] of breakers) {
  console.log(`${name}: ${breaker.state} (failures: ${breaker.failureCount})`);
}
```

## Examples

See `src/examples/error-handling-examples.ts` for complete working examples.

## API Reference

See TypeScript documentation in source files:
- `src/core/errors.ts`
- `src/core/error-handler.ts`
- `src/core/logger.ts`

## Contributing

When adding new error handling:

1. Use appropriate error types
2. Provide context and recovery suggestions
3. Add JSDoc documentation
4. Include unit tests
5. Update this documentation
