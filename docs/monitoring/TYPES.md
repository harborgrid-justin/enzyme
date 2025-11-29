# Monitoring TypeScript Types

> Complete type definitions for the error monitoring and handling system.

## Table of Contents

- [Error Types](#error-types)
- [Error Context](#error-context)
- [Error Categories](#error-categories)
- [Error Reporter Types](#error-reporter-types)
- [Error Boundary Types](#error-boundary-types)
- [Utility Functions](#utility-functions)

## Error Types

### AppError

Normalized application error with category and severity.

```typescript
interface AppError {
  /** Unique error identifier */
  id: string;

  /** Error message */
  message: string;

  /** Optional error code */
  code?: string;

  /** Error category for classification */
  category: ErrorCategory;

  /** Error severity level */
  severity: ErrorSeverity;

  /** ISO timestamp when error occurred */
  timestamp: string;

  /** Stack trace if available */
  stack?: string;

  /** Additional context data */
  context?: Record<string, unknown>;

  /** Original error object */
  originalError?: unknown;
}
```

**Example:**

```typescript
const error: AppError = {
  id: 'err_1234567890_abc123',
  message: 'Failed to fetch user data',
  code: 'FETCH_ERROR',
  category: 'network',
  severity: 'medium',
  timestamp: '2025-01-15T10:30:00.000Z',
  stack: 'Error: Failed to fetch...',
  context: {
    url: '/api/users/123',
    method: 'GET',
  },
  originalError: fetchError,
};
```

### ErrorSeverity

Error severity levels.

```typescript
type ErrorSeverity =
  | 'low'       // Minor issues, fully recoverable
  | 'medium'    // Notable issues, may need user action
  | 'high'      // Serious issues, significant user impact
  | 'critical'; // Critical failures, app-wide impact
```

**Severity Guidelines:**

| Severity | Impact | Examples | Action |
|----------|--------|----------|--------|
| `low` | Minimal | UI glitch, minor validation | Log only |
| `medium` | Moderate | Failed request, timeout | Log + notify |
| `high` | Significant | Auth failure, data loss | Alert + escalate |
| `critical` | Severe | App crash, security breach | Immediate response |

### ErrorCategory

Error categories for classification and handling.

```typescript
type ErrorCategory =
  | 'network'         // Network/connectivity errors
  | 'authentication'  // Authentication failures (401)
  | 'authorization'   // Permission errors (403)
  | 'validation'      // Input validation errors (400, 422)
  | 'server'          // Server errors (5xx)
  | 'client'          // Client-side errors (4xx)
  | 'timeout'         // Request timeouts
  | 'rate_limit'      // Rate limiting errors (429)
  | 'unknown';        // Unknown/uncategorized errors
```

**Category Details:**

```typescript
const categoryDetails = {
  network: {
    description: 'Network connectivity issues',
    retryable: true,
    userMessage: 'Unable to connect. Please check your internet connection.',
  },
  authentication: {
    description: 'User authentication required',
    retryable: false,
    userMessage: 'Your session has expired. Please log in again.',
  },
  authorization: {
    description: 'Insufficient permissions',
    retryable: false,
    userMessage: 'You do not have permission to perform this action.',
  },
  validation: {
    description: 'Invalid input data',
    retryable: false,
    userMessage: 'Please check your input and try again.',
  },
  timeout: {
    description: 'Request timed out',
    retryable: true,
    userMessage: 'The request timed out. Please try again.',
  },
  rate_limit: {
    description: 'Too many requests',
    retryable: true,
    userMessage: 'Too many requests. Please wait a moment and try again.',
  },
  server: {
    description: 'Server-side error',
    retryable: true,
    userMessage: 'Something went wrong on our end. Please try again later.',
  },
  client: {
    description: 'Client-side error',
    retryable: false,
    userMessage: 'An unexpected error occurred. Please try again.',
  },
  unknown: {
    description: 'Unknown error type',
    retryable: false,
    userMessage: 'An unexpected error occurred. Please try again.',
  },
};
```

## Error Context

### ErrorContext

Context information for error reporting.

```typescript
interface ErrorContext extends Record<string, unknown> {
  /** User ID */
  userId?: string;

  /** Session ID */
  sessionId?: string;

  /** Current route/path */
  route?: string;

  /** Component where error occurred */
  component?: string;

  /** Action being performed */
  action?: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}
```

**Example:**

```typescript
const context: ErrorContext = {
  userId: 'user_123',
  sessionId: 'session_abc',
  route: '/dashboard',
  component: 'DashboardWidget',
  action: 'load-stats',
  metadata: {
    widget: 'sales-chart',
    timeRange: 'last-7-days',
  },
};
```

### ErrorReport

Complete error report for external services.

```typescript
interface ErrorReport extends AppError {
  /** Error context */
  context: ErrorContext;

  /** User agent string */
  userAgent: string;

  /** Current URL */
  url: string;

  /** Environment (dev, staging, prod) */
  environment: string;

  /** App version */
  version: string;
}
```

**Example:**

```typescript
const report: ErrorReport = {
  // AppError fields
  id: 'err_123',
  message: 'Failed to save',
  category: 'network',
  severity: 'medium',
  timestamp: '2025-01-15T10:30:00.000Z',

  // ErrorReport fields
  context: {
    userId: 'user_123',
    component: 'SaveButton',
    action: 'save-document',
  },
  userAgent: 'Mozilla/5.0...',
  url: 'https://app.example.com/editor',
  environment: 'production',
  version: '1.2.3',
};
```

### Network Error Details

Specific details for network errors.

```typescript
interface NetworkErrorDetails {
  /** HTTP status code */
  status?: number;

  /** HTTP status text */
  statusText?: string;

  /** Request URL */
  url?: string;

  /** HTTP method */
  method?: string;

  /** Response body */
  responseBody?: unknown;
}
```

**Example:**

```typescript
const networkError: AppError = {
  id: 'err_network_123',
  message: 'Request failed',
  category: 'network',
  severity: 'medium',
  timestamp: '2025-01-15T10:30:00.000Z',
  context: {
    status: 503,
    statusText: 'Service Unavailable',
    url: '/api/users',
    method: 'GET',
    responseBody: { error: 'Service temporarily unavailable' },
  } as NetworkErrorDetails,
};
```

### Validation Error Details

Specific details for validation errors.

```typescript
interface ValidationErrorDetails {
  /** Field that failed validation */
  field: string;

  /** Constraint that was violated */
  constraint: string;

  /** Value that was provided */
  value?: unknown;
}
```

**Example:**

```typescript
const validationError: AppError = {
  id: 'err_validation_123',
  message: 'Email is invalid',
  category: 'validation',
  severity: 'low',
  timestamp: '2025-01-15T10:30:00.000Z',
  context: {
    field: 'email',
    constraint: 'email',
    value: 'invalid-email',
  } as ValidationErrorDetails,
};
```

## Error Reporter Types

### ErrorReporterConfig

Configuration for error reporter.

```typescript
interface ErrorReporterConfig {
  /** Enable error reporting */
  enabled?: boolean;

  /** Reporting endpoint */
  endpoint?: string;

  /** Batch size before sending */
  batchSize?: number;

  /** Flush interval (ms) */
  flushInterval?: number;

  /** Sample rate (0-1) */
  sampleRate?: number;

  /** Include stack traces */
  includeStackTrace?: boolean;

  /** Include context data */
  includeContext?: boolean;

  /** Max errors in queue */
  maxQueueSize?: number;

  /** Filter before sending */
  beforeSend?: (error: AppError) => AppError | null;

  /** Callback after send */
  afterSend?: (error: AppError, success: boolean) => void;

  /** Debug mode */
  debug?: boolean;
}
```

**Example:**

```typescript
const config: ErrorReporterConfig = {
  enabled: true,
  endpoint: '/api/errors',
  batchSize: 10,
  flushInterval: 30000,
  sampleRate: 0.1,
  includeStackTrace: true,
  includeContext: true,
  maxQueueSize: 100,
  beforeSend: (error) => {
    // Filter sensitive data
    if (error.context?.password) {
      delete error.context.password;
    }
    return error;
  },
  debug: import.meta.env.DEV,
};
```

## Error Boundary Types

### Error Boundary Levels

```typescript
type ErrorBoundaryLevel =
  | 'critical'   // App-wide errors
  | 'feature'    // Feature/page level
  | 'component'  // Component level
  | 'widget';    // Small UI element
```

### Recovery Actions

```typescript
type RecoveryAction =
  | 'retry'      // Retry rendering
  | 'reset'      // Reset state and retry
  | 'reload'     // Reload entire page
  | 'navigate'   // Navigate to home/safe page
  | 'escalate'   // Escalate to parent boundary
  | 'degrade';   // Show degraded/simplified UI
```

### Error Boundary Context

```typescript
interface ErrorBoundaryContextValue {
  /** Current boundary level */
  level: ErrorBoundaryLevel;

  /** Boundary identifier */
  boundaryId: string;

  /** Parent boundary ID (null if root) */
  parentBoundaryId: string | null;

  /** Escalate error to parent */
  escalateError: (error: AppError) => void;

  /** Reset this boundary */
  resetBoundary: () => void;

  /** Whether boundary has error */
  hasError: boolean;

  /** Current error (if any) */
  error: AppError | null;
}
```

### Error Fallback Props

Props passed to error fallback components.

```typescript
interface ErrorFallbackProps {
  /** The error that occurred */
  error: AppError;

  /** Boundary level */
  level: ErrorBoundaryLevel;

  /** Boundary identifier */
  boundaryId: string;

  /** Available recovery actions */
  allowedActions: RecoveryAction[];

  /** Execute recovery action */
  onAction: (action: RecoveryAction) => Promise<void>;

  /** Whether recovery in progress */
  isRecovering: boolean;

  /** Number of retry attempts */
  retryCount: number;
}
```

**Example:**

```typescript
function CustomErrorFallback({
  error,
  level,
  allowedActions,
  onAction,
  isRecovering,
  retryCount,
}: ErrorFallbackProps) {
  return (
    <div className="error-fallback">
      <h3>{error.message}</h3>
      <p>Level: {level}</p>
      <p>Attempts: {retryCount}</p>

      {allowedActions.map(action => (
        <button
          key={action}
          onClick={() => onAction(action)}
          disabled={isRecovering}
        >
          {action}
        </button>
      ))}
    </div>
  );
}
```

### Query Error Fallback Props

Props for query error boundaries.

```typescript
interface QueryErrorFallbackProps {
  /** The error that occurred */
  error: AppError;

  /** Reset the boundary */
  reset: () => void;

  /** Retry the query */
  retry: () => void;

  /** Whether error is retryable */
  isRetryable: boolean;
}
```

## Utility Functions

### categorizeError

Determine error category from error object.

```typescript
function categorizeError(error: unknown): ErrorCategory;
```

**Example:**

```typescript
const error = new Error('Network request failed');
const category = categorizeError(error); // 'network'

const httpError = { status: 401 };
const category2 = categorizeError(httpError); // 'authentication'
```

### getSeverity

Get severity level from error category.

```typescript
function getSeverity(category: ErrorCategory): ErrorSeverity;
```

**Example:**

```typescript
getSeverity('network');        // 'medium'
getSeverity('authentication'); // 'high'
getSeverity('validation');     // 'low'
getSeverity('server');         // 'high'
```

### normalizeError

Create normalized AppError from any error type.

```typescript
function normalizeError(
  error: unknown,
  context?: Partial<AppError>
): AppError;
```

**Example:**

```typescript
// From Error object
const error = new Error('Something went wrong');
const normalized = normalizeError(error);

// With context
const normalized2 = normalizeError(error, {
  category: 'network',
  severity: 'high',
  context: { userId: '123' },
});

// From string
const normalized3 = normalizeError('Error message');

// From HTTP response
const normalized4 = normalizeError({
  status: 404,
  statusText: 'Not Found',
});
```

### isRetryableError

Check if error should be retried.

```typescript
function isRetryableError(error: AppError): boolean;
```

**Example:**

```typescript
const networkError: AppError = {
  category: 'network',
  // ... other fields
};

isRetryableError(networkError);  // true

const validationError: AppError = {
  category: 'validation',
  // ... other fields
};

isRetryableError(validationError); // false
```

**Retryable Categories:**
- `network`
- `timeout`
- `rate_limit`
- `server`

**Non-Retryable Categories:**
- `authentication`
- `authorization`
- `validation`
- `client`
- `unknown`

### getUserFriendlyMessage

Get user-friendly error message.

```typescript
function getUserFriendlyMessage(error: AppError): string;
```

**Example:**

```typescript
const error: AppError = {
  category: 'network',
  // ... other fields
};

getUserFriendlyMessage(error);
// "Unable to connect. Please check your internet connection."

const authError: AppError = {
  category: 'authentication',
  // ... other fields
};

getUserFriendlyMessage(authError);
// "Your session has expired. Please log in again."
```

## Type Guards

### Type Guard Examples

```typescript
// Check if error is AppError
function isAppError(error: unknown): error is AppError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'id' in error &&
    'category' in error &&
    'severity' in error
  );
}

// Check if error is network error
function isNetworkError(error: AppError): boolean {
  return error.category === 'network';
}

// Check if error is critical
function isCriticalError(error: AppError): boolean {
  return error.severity === 'critical';
}

// Check if context has network details
function hasNetworkDetails(
  context: unknown
): context is NetworkErrorDetails {
  return (
    typeof context === 'object' &&
    context !== null &&
    'status' in context
  );
}
```

## Complete Type Index

```typescript
// Error Types
export type {
  AppError,
  ErrorSeverity,
  ErrorCategory,
  ErrorContext,
  ErrorReport,
  NetworkErrorDetails,
  ValidationErrorDetails,
};

// Error Reporter
export type {
  ErrorReporterConfig,
};

// Error Boundaries
export type {
  ErrorBoundaryLevel,
  RecoveryAction,
  ErrorBoundaryContextValue,
  ErrorFallbackProps,
  QueryErrorFallbackProps,
  HierarchicalErrorBoundaryProps,
  GlobalErrorBoundaryProps,
  QueryErrorBoundaryProps,
  WithErrorBoundaryOptions,
};

// Utility Functions
export {
  categorizeError,
  getSeverity,
  normalizeError,
  isRetryableError,
  getUserFriendlyMessage,
};
```

## Related Documentation

- [Monitoring Overview](./README.md)
- [Error Boundaries Guide](./ERROR_BOUNDARIES.md)
