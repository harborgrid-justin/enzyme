# Error Monitoring & Error Boundaries

> Comprehensive error handling, monitoring, and recovery system with hierarchical error boundaries and context-aware error messages.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Error Boundaries](#error-boundaries)
- [Error Types](#error-types)
- [Error Reporting](#error-reporting)
- [Alert Setup](#alert-setup)
- [Best Practices](#best-practices)

## Overview

The monitoring system provides a complete error handling infrastructure with hierarchical error boundaries, intelligent error categorization, context-aware error messages, and comprehensive error reporting.

### Core Features

- **Hierarchical Error Boundaries** - Multi-level error containment
- **Error Type System** - Normalized error categorization
- **Context-Aware Messages** - User-friendly error messages
- **Error Recovery** - Multiple recovery strategies
- **Crash Analytics** - Session recording and breadcrumbs
- **Error Reporting** - Centralized error tracking

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Error Monitoring System                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Critical   │  │   Feature    │  │  Component   │ │
│  │   Boundary   │  │   Boundary   │  │   Boundary   │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                 │                 │          │
│         └────────┬────────┴────────┬────────┘          │
│                  │                 │                   │
│         ┌────────▼─────────────────▼────────┐          │
│         │     Error Reporter & Analytics     │          │
│         └────────────────────────────────────┘          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Error Flow

```
Component Error
    ↓
Caught by Nearest Boundary
    ↓
Normalize Error → Categorize → Get User Message
    ↓              ↓                ↓
Report         Determine        Display
    ↓          Recovery         Fallback UI
Analytics      Strategy              ↓
              ↓                  User Action
         Retry/Reset/Escalate
```

## Error Boundaries

### Hierarchy Levels

The system provides four levels of error boundaries:

| Level | Scope | Recovery | Use Case |
|-------|-------|----------|----------|
| **Critical** | App-wide | Page reload | Root-level crashes |
| **Feature** | Page/feature | Retry/reset/escalate | Feature isolation |
| **Component** | Component | Retry/degrade | Complex components |
| **Widget** | Small UI | Degrade gracefully | Small elements |

### Quick Start

```tsx
import {
  CriticalErrorBoundary,
  FeatureErrorBoundary,
  ComponentErrorBoundary,
  WidgetErrorBoundary
} from '@/lib/monitoring';

function App() {
  return (
    <CriticalErrorBoundary>
      <Router>
        <FeatureErrorBoundary>
          <Dashboard />
        </FeatureErrorBoundary>

        <ComponentErrorBoundary>
          <ComplexComponent />
        </ComponentErrorBoundary>

        <WidgetErrorBoundary>
          <SmallWidget />
        </WidgetErrorBoundary>
      </Router>
    </CriticalErrorBoundary>
  );
}
```

### See Also

- [Error Boundaries Documentation](./ERROR_BOUNDARIES.md) - Complete guide to error boundaries
- [Error Types Documentation](./TYPES.md) - Error categorization and types

## Error Types

### Error Categories

```typescript
type ErrorCategory =
  | 'network'         // Network/fetch errors
  | 'authentication'  // Auth errors (401)
  | 'authorization'   // Permission errors (403)
  | 'validation'      // Input validation (400, 422)
  | 'server'          // Server errors (5xx)
  | 'client'          // Client-side errors
  | 'timeout'         // Request timeouts
  | 'rate_limit'      // Rate limiting (429)
  | 'unknown';        // Unknown errors
```

### Error Severity

```typescript
type ErrorSeverity =
  | 'low'       // Minor issues, recoverable
  | 'medium'    // Notable issues, may need attention
  | 'high'      // Serious issues, user impact
  | 'critical'; // Critical failures, major impact
```

### Normalized Error Structure

```typescript
interface AppError {
  id: string;                    // Unique error ID
  message: string;               // Error message
  code?: string;                 // Error code
  category: ErrorCategory;       // Error category
  severity: ErrorSeverity;       // Severity level
  timestamp: string;             // ISO timestamp
  stack?: string;                // Stack trace
  context?: Record<string, unknown>; // Additional context
  originalError?: unknown;       // Original error object
}
```

## Error Reporting

### Initialize Error Reporter

```typescript
import { initErrorReporter } from '@/lib/monitoring';

initErrorReporter({
  enabled: true,
  endpoint: '/api/errors',
  sampleRate: 1.0,           // 100% in dev
  includeContext: true,
  includeStackTrace: true,
  beforeSend: (error) => {
    // Filter sensitive data
    if (error.context?.password) {
      delete error.context.password;
    }
    return error;
  },
});
```

### Report Errors

```typescript
import { reportError, reportWarning, reportInfo } from '@/lib/monitoring';

// Report error
reportError(new Error('Something went wrong'), {
  component: 'UserProfile',
  action: 'save-profile',
  metadata: {
    userId: user.id,
  },
});

// Report warning
reportWarning('API rate limit approaching', {
  endpoint: '/api/users',
  remaining: 10,
});

// Report info
reportInfo('User completed onboarding', {
  userId: user.id,
  duration: 45000,
});
```

### Set User Context

```typescript
import { setUserContext } from '@/lib/monitoring';

// Set user context for error reports
setUserContext({
  userId: user.id,
  email: user.email,
  role: user.role,
});
```

### Add Breadcrumbs

```typescript
import { addBreadcrumb } from '@/lib/monitoring';

// Track user actions
addBreadcrumb({
  type: 'navigation',
  category: 'user-action',
  message: 'Navigated to /dashboard',
  level: 'info',
  timestamp: Date.now(),
  data: {
    from: '/home',
    to: '/dashboard',
  },
});
```

## Logging Strategies

### Development Logging

```typescript
const logger = {
  debug: (...args: unknown[]) => {
    if (import.meta.env.DEV) {
      console.log('[DEBUG]', ...args);
    }
  },

  info: (...args: unknown[]) => {
    console.info('[INFO]', ...args);
  },

  warn: (...args: unknown[]) => {
    console.warn('[WARN]', ...args);
  },

  error: (error: Error, context?: unknown) => {
    console.error('[ERROR]', error, context);
    reportError(error, context);
  },
};
```

### Production Logging

```typescript
import { ErrorReporter } from '@/lib/monitoring';

const logger = {
  debug: () => {}, // Disabled in production

  info: (message: string, data?: unknown) => {
    if (Math.random() < 0.1) { // 10% sampling
      reportInfo(message, data);
    }
  },

  warn: (message: string, data?: unknown) => {
    reportWarning(message, data);
  },

  error: (error: Error, context?: unknown) => {
    ErrorReporter.reportError(error, context);
  },
};
```

### Structured Logging

```typescript
interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: Error;
}

function log(entry: LogEntry) {
  const structured = {
    ...entry,
    timestamp: new Date().toISOString(),
    environment: import.meta.env.MODE,
    version: import.meta.env.VITE_APP_VERSION,
  };

  // Send to logging service
  if (import.meta.env.PROD) {
    sendToLoggingService(structured);
  } else {
    console.log(structured);
  }
}
```

## Alert Setup

### Configure Alerts

```typescript
import { ErrorReporter } from '@/lib/monitoring';

ErrorReporter.configure({
  onError: (error) => {
    // Critical errors
    if (error.severity === 'critical') {
      sendSlackAlert({
        channel: '#critical-errors',
        message: `🚨 Critical Error: ${error.message}`,
        error,
      });
    }

    // High severity errors
    if (error.severity === 'high') {
      sendEmail({
        to: 'dev-team@example.com',
        subject: `High Severity Error: ${error.message}`,
        body: formatErrorEmail(error),
      });
    }
  },
});
```

### Error Rate Alerts

```typescript
class ErrorRateMonitor {
  private errorCount = 0;
  private windowStart = Date.now();
  private readonly windowSize = 60000; // 1 minute
  private readonly threshold = 10;     // 10 errors per minute

  recordError(error: AppError) {
    const now = Date.now();

    // Reset window if needed
    if (now - this.windowStart > this.windowSize) {
      this.errorCount = 0;
      this.windowStart = now;
    }

    this.errorCount++;

    // Alert if threshold exceeded
    if (this.errorCount >= this.threshold) {
      this.sendAlert();
    }
  }

  private sendAlert() {
    console.error('⚠️ Error rate threshold exceeded!');
    // Send to monitoring service
  }
}
```

### Slack Integration

```typescript
async function sendSlackAlert(alert: {
  channel: string;
  message: string;
  error: AppError;
}) {
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channel: alert.channel,
      text: alert.message,
      attachments: [
        {
          color: 'danger',
          fields: [
            { title: 'Error', value: alert.error.message, short: false },
            { title: 'Category', value: alert.error.category, short: true },
            { title: 'Severity', value: alert.error.severity, short: true },
            { title: 'Timestamp', value: alert.error.timestamp, short: false },
          ],
        },
      ],
    }),
  });
}
```

### Email Integration

```typescript
async function sendEmail(email: {
  to: string;
  subject: string;
  body: string;
}) {
  await fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(email),
  });
}

function formatErrorEmail(error: AppError): string {
  return `
    Error: ${error.message}
    Category: ${error.category}
    Severity: ${error.severity}
    Timestamp: ${error.timestamp}

    Stack Trace:
    ${error.stack}

    Context:
    ${JSON.stringify(error.context, null, 2)}
  `;
}
```

## Best Practices

### 1. Use Hierarchical Boundaries

```tsx
// Good - layered error boundaries
<CriticalErrorBoundary>
  <App>
    <FeatureErrorBoundary>
      <Dashboard />
    </FeatureErrorBoundary>
  </App>
</CriticalErrorBoundary>

// Bad - single global boundary
<GlobalErrorBoundary>
  <App />
</GlobalErrorBoundary>
```

### 2. Provide Meaningful Fallbacks

```tsx
// Good - informative fallback
<ComponentErrorBoundary
  fallback={(error, retry) => (
    <ErrorCard
      title="Failed to load dashboard"
      message="We couldn't load your dashboard data."
      actions={[
        <Button onClick={retry}>Retry</Button>,
        <Button onClick={goBack}>Go Back</Button>
      ]}
    />
  )}
>
  <Dashboard />
</ComponentErrorBoundary>

// Bad - generic error
<ComponentErrorBoundary
  fallback="Error"
>
  <Dashboard />
</ComponentErrorBoundary>
```

### 3. Set Appropriate Context

```typescript
// Good - rich context
reportError(error, {
  component: 'UserProfile',
  action: 'update-profile',
  metadata: {
    userId: user.id,
    fields: changedFields,
    timestamp: Date.now(),
  },
});

// Bad - minimal context
reportError(error);
```

### 4. Filter Sensitive Data

```typescript
// Good - filter before sending
initErrorReporter({
  beforeSend: (error) => {
    const filtered = { ...error };

    // Remove sensitive fields
    if (filtered.context) {
      delete filtered.context.password;
      delete filtered.context.token;
      delete filtered.context.ssn;
    }

    return filtered;
  },
});
```

### 5. Sample in Production

```typescript
// Good - sample high-volume errors
initErrorReporter({
  sampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  shouldSample: (error) => {
    // Always report critical errors
    if (error.severity === 'critical') return true;

    // Sample others
    return Math.random() < 0.1;
  },
});
```

### 6. Monitor Error Trends

```typescript
// Track error frequency
const errorMetrics = {
  total: 0,
  byCategory: new Map<string, number>(),
  bySeverity: new Map<string, number>(),

  record(error: AppError) {
    this.total++;
    this.byCategory.set(
      error.category,
      (this.byCategory.get(error.category) || 0) + 1
    );
    this.bySeverity.set(
      error.severity,
      (this.bySeverity.get(error.severity) || 0) + 1
    );
  },

  getReport() {
    return {
      total: this.total,
      byCategory: Object.fromEntries(this.byCategory),
      bySeverity: Object.fromEntries(this.bySeverity),
    };
  },
};
```

### 7. Test Error Boundaries

```tsx
// Development error trigger
function ErrorTrigger() {
  const [shouldError, setShouldError] = useState(false);

  if (shouldError) {
    throw new Error('Test error');
  }

  return (
    <button onClick={() => setShouldError(true)}>
      Trigger Error
    </button>
  );
}

// Use in development
{import.meta.env.DEV && <ErrorTrigger />}
```

## Related Documentation

- [Error Boundaries Guide](./ERROR_BOUNDARIES.md)
- [Error Types Reference](./TYPES.md)

## Debugging

### Enable Debug Mode

```typescript
initErrorReporter({
  debug: import.meta.env.DEV,
});

// Or set globally
window.__ENZYME_DEBUG__ = true;
```

### View Error History

```typescript
import { ErrorReporter } from '@/lib/monitoring';

// Get recent errors
const recentErrors = ErrorReporter.getRecentErrors(10);

console.table(recentErrors.map(e => ({
  message: e.message,
  category: e.category,
  severity: e.severity,
  timestamp: new Date(e.timestamp).toLocaleTimeString(),
})));
```

### Export Error Log

```typescript
function exportErrorLog() {
  const errors = ErrorReporter.getAllErrors();
  const json = JSON.stringify(errors, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `error-log-${Date.now()}.json`;
  a.click();
}
```

## Support

For issues or questions:
- Check the [Error Boundaries documentation](./ERROR_BOUNDARIES.md)
- Review the [Error Types documentation](./TYPES.md)
- File an issue on GitHub
