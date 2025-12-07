# Enzyme Error Handling Extension

Comprehensive structured error handling system for the enzyme library implementing enterprise-grade error management patterns.

## Features

### 1. Error Code System (DOMAIN_CATEGORY_NUMBER)
Structured error codes following the `DOMAIN_CATEGORY_NUMBER` pattern for easy identification and debugging.

```typescript
// Example: AUTH_TOKEN_001
// Domain: AUTH (Authentication)
// Category: TOKEN
// Number: 001
```

### 2. Error Domains

- **AUTH** - Authentication/authorization errors
- **API** - API and network errors
- **STATE** - State management errors
- **CONFIG** - Configuration errors
- **VALID** - Validation errors
- **RENDER** - React rendering errors
- **PERF** - Performance budget violations

### 3. Error Hierarchy

Base `EnzymeError` class with specialized subtypes:

```typescript
EnzymeError (base)
├── AuthError
├── ApiError
├── StateError
├── ConfigError
├── ValidationError
├── RenderError
├── PerformanceError
└── AggregateError (for multiple errors)
```

### 4. Rich Context & Metadata

Every error includes detailed context:

```typescript
{
  timestamp: Date;
  component?: string;
  userId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
  stack?: string;
  location?: { file?: string; line?: number; column?: number };
}
```

### 5. Remediation Hints

Every error includes actionable remediation steps to help developers fix issues quickly.

### 6. Fuzzy Matching (Typo Recovery)

Uses Levenshtein distance algorithm to suggest correct error codes when typos are detected:

```typescript
// Typo in error code
throw new EnzymeError('AUTH_TOKE_001');
// Error: Unknown error code: AUTH_TOKE_001. Did you mean: AUTH_TOKEN_001, AUTH_TOKEN_002?
```

### 7. Error Serialization

JSON serialization for logging and transport:

```typescript
const error = new EnzymeError('AUTH_TOKEN_001', { userId: '123' });
const serialized = error.toJSON();
// Can be sent to logging service or stored
```

### 8. Error Recovery Mechanisms

Built-in retry logic with exponential backoff:

```typescript
await retryWithBackoff(
  () => fetchUserData(),
  {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    exponentialBackoff: true
  }
);
```

### 9. Error Aggregation

Collect and manage multiple errors:

```typescript
const errors = [
  new ValidationError('VALID_SCHEMA_001'),
  new ValidationError('VALID_FORMAT_001')
];
const aggregate = new AggregateError(errors, 'Multiple validation errors');
```

### 10. i18n Support

Localized error messages:

```typescript
// Register translations
registerTranslations('es', {
  'AUTH_TOKEN_001': 'El token de autenticación falta o es inválido',
  // ... more translations
});

// Create localized error
const error = createLocalizedError('AUTH_TOKEN_001', 'es');
```

## Usage Examples

### Basic Error Creation

```typescript
import { EnzymeError, AuthError } from '@enzyme/extensions/built-in/errors';

// Using error code
throw new EnzymeError('AUTH_TOKEN_001');

// With context
throw new EnzymeError('AUTH_TOKEN_001', {
  userId: 'user123',
  component: 'LoginForm',
  requestId: 'req-abc-123'
});

// Using specialized error class
throw new AuthError('AUTH_PERMISSION_001', {
  metadata: { requiredRole: 'admin', userRole: 'user' }
});
```

### Error Recovery with Retry

```typescript
import { retryWithBackoff, executeWithRecovery } from '@enzyme/extensions/built-in/errors';

// Automatic retry with backoff
const data = await retryWithBackoff(
  () => api.fetchData(),
  {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 5000,
    backoffMultiplier: 2,
    exponentialBackoff: true
  }
);

// With recovery strategy
const result = await executeWithRecovery(
  () => api.fetchData(),
  { type: 'fallback', value: defaultData }
);
```

### Error Handling in Components

```typescript
import { isEnzymeError, formatError } from '@enzyme/extensions/built-in/errors';

function MyComponent() {
  try {
    // ... some operation
  } catch (error) {
    if (isEnzymeError(error)) {
      console.error(`[${error.code}] ${error.message}`);
      console.error(`Remediation: ${error.remediation}`);

      if (error.documentation) {
        console.error(`Docs: ${error.documentation}`);
      }
    } else {
      console.error(formatError(error));
    }
  }
}
```

### Custom Error Codes

```typescript
import { errorsExtension } from '@enzyme/extensions/built-in/errors';

// Via extension client methods
const enzyme = createEnzymeClient().$extends(errorsExtension);

enzyme.$registerErrorCode('CUSTOM_001', {
  domain: 'API',
  category: 'CUSTOM',
  message: 'Custom error occurred',
  severity: 'error',
  retryable: false,
  remediation: 'Check your custom integration configuration'
});
```

### Error Aggregation

```typescript
import { AggregateError, ValidationError } from '@enzyme/extensions/built-in/errors';

const errors: ValidationError[] = [];

// Collect validation errors
if (!email.includes('@')) {
  errors.push(new ValidationError('VALID_FORMAT_001', {
    metadata: { field: 'email', value: email }
  }));
}

if (password.length < 8) {
  errors.push(new ValidationError('VALID_RANGE_001', {
    metadata: { field: 'password', minLength: 8 }
  }));
}

// Throw aggregate if there are errors
if (errors.length > 0) {
  throw new AggregateError(errors, 'Form validation failed');
}
```

### Serialization for Logging

```typescript
import { serializeError } from '@enzyme/extensions/built-in/errors';

try {
  // ... operation
} catch (error) {
  const serialized = serializeError(error);

  // Send to logging service
  await loggingService.log({
    level: 'error',
    error: serialized,
    timestamp: new Date().toISOString()
  });
}
```

## Extension Client Methods

When using the extension, the following methods are available:

```typescript
// Create structured error
$createError(code: string, context?: Partial<ErrorContext>, originalError?: Error): EnzymeError

// Register custom error code
$registerErrorCode(code: string, definition: ErrorCodeDefinition): void

// Get fuzzy match suggestions
$getErrorSuggestions(input: string, maxSuggestions?: number): string[]

// Format error for display
$formatError(error: unknown): string

// Serialize error for transport
$serializeError(error: unknown): SerializedError | { message: string }

// Deserialize error from JSON
$deserializeError(data: SerializedError): EnzymeError

// Type guard for EnzymeError
$isEnzymeError(error: unknown): boolean

// Check if error is retryable
$isRetryableError(error: unknown): boolean

// Retry with backoff
$retryWithBackoff<T>(operation: () => Promise<T>, config?: Partial<RetryConfig>): Promise<T>

// Execute with recovery strategy
$executeWithRecovery<T>(operation: () => Promise<T>, strategy: RecoveryStrategy): Promise<T>

// Create aggregate error
$createAggregateError(errors: EnzymeError[], message?: string): AggregateError

// Register translations
$registerTranslations(locale: string, translations: Record<string, string>): void

// Create localized error
$createLocalizedError(code: string, locale: string, context?: Partial<ErrorContext>): EnzymeError

// Get all error codes
$getAllErrorCodes(): string[]

// Get error codes by domain
$getErrorCodesByDomain(domain: ErrorDomain): string[]

// Get error definition
$getErrorDefinition(code: string): ErrorCodeDefinition | undefined
```

## Predefined Error Codes

### Authentication Errors (AUTH)

- `AUTH_TOKEN_001` - Token missing or invalid
- `AUTH_TOKEN_002` - Token expired
- `AUTH_PERMISSION_001` - Insufficient permissions
- `AUTH_SESSION_001` - Session not found or terminated

### API Errors (API)

- `API_NETWORK_001` - Network request failed
- `API_TIMEOUT_001` - Request timeout
- `API_RESPONSE_001` - Invalid response format
- `API_RATE_LIMIT_001` - Rate limit exceeded

### State Errors (STATE)

- `STATE_INVALID_001` - Invalid state transition
- `STATE_SYNC_001` - State synchronization failed
- `STATE_HYDRATION_001` - State hydration mismatch

### Configuration Errors (CONFIG)

- `CONFIG_INVALID_001` - Invalid configuration
- `CONFIG_MISSING_001` - Required field missing
- `CONFIG_TYPE_001` - Incorrect field type

### Validation Errors (VALID)

- `VALID_SCHEMA_001` - Schema validation failed
- `VALID_FORMAT_001` - Invalid data format
- `VALID_RANGE_001` - Value out of range

### Render Errors (RENDER)

- `RENDER_COMPONENT_001` - Component render error
- `RENDER_HOOK_001` - React Hook error
- `RENDER_SUSPENSE_001` - Suspense boundary error

### Performance Errors (PERF)

- `PERF_BUDGET_001` - Performance budget exceeded
- `PERF_MEMORY_001` - Memory limit exceeded
- `PERF_RENDER_001` - Render performance degradation

## Best Practices

### 1. Always Use Structured Errors

```typescript
// ❌ Bad
throw new Error('Token is invalid');

// ✅ Good
throw new AuthError('AUTH_TOKEN_001', { component: 'AuthProvider' });
```

### 2. Include Relevant Context

```typescript
throw new ApiError('API_NETWORK_001', {
  component: 'UserService',
  requestId: req.id,
  metadata: {
    url: req.url,
    method: req.method,
    statusCode: response?.status
  }
});
```

### 3. Handle Retryable Errors

```typescript
if (isRetryableError(error)) {
  return await retryWithBackoff(() => operation(), { maxAttempts: 3 });
}
```

### 4. Use Aggregate Errors for Multiple Issues

```typescript
const validationErrors = validateForm(data);
if (validationErrors.length > 0) {
  throw new AggregateError(validationErrors, 'Form validation failed');
}
```

### 5. Log Serialized Errors

```typescript
catch (error) {
  logger.error(serializeError(error));
}
```

## TypeScript Support

The error system is fully typed:

```typescript
import type {
  ErrorCodeDefinition,
  ErrorContext,
  ErrorDomain,
  ErrorSeverity,
  RetryConfig,
  RecoveryStrategy,
  SerializedError
} from '@enzyme/extensions/built-in/errors';
```

## Integration with Enzyme Extension System

```typescript
import { createEnzymeClient } from '@enzyme/core';
import { errorsExtension } from '@enzyme/extensions/built-in/errors';

const enzyme = createEnzymeClient().$extends(errorsExtension);

// Now you can use error handling methods
enzyme.$createError('AUTH_TOKEN_001');
enzyme.$getErrorSuggestions('AUTH_TOKE_001'); // Returns: ['AUTH_TOKEN_001', 'AUTH_TOKEN_002']
```

## Testing

```typescript
import { EnzymeError, isEnzymeError } from '@enzyme/extensions/built-in/errors';

describe('Error Handling', () => {
  it('should create structured errors', () => {
    const error = new EnzymeError('AUTH_TOKEN_001');

    expect(isEnzymeError(error)).toBe(true);
    expect(error.code).toBe('AUTH_TOKEN_001');
    expect(error.domain).toBe('AUTH');
    expect(error.category).toBe('TOKEN');
    expect(error.retryable).toBe(false);
  });

  it('should suggest similar codes on typos', () => {
    expect(() => {
      new EnzymeError('AUTH_TOKE_001');
    }).toThrow(/Did you mean: AUTH_TOKEN_001/);
  });
});
```

## Performance Considerations

- Error code lookup is O(1) using hash map
- Fuzzy matching uses optimized Levenshtein distance algorithm
- Error serialization is JSON-compatible for efficient transport
- Lazy loading of translations to minimize bundle size

## License

MIT
