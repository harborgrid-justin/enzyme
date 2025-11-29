# Error Boundaries

> Multi-level error containment with context-aware recovery strategies for resilient React applications.

## Table of Contents

- [Overview](#overview)
- [Boundary Levels](#boundary-levels)
- [Global Error Boundary](#global-error-boundary)
- [Hierarchical Error Boundaries](#hierarchical-error-boundaries)
- [Query Error Boundary](#query-error-boundary)
- [withErrorBoundary HOC](#witherrorbound

ary-hoc)
- [Error Handling Patterns](#error-handling-patterns)
- [Recovery Strategies](#recovery-strategies)
- [Best Practices](#best-practices)

## Overview

Error boundaries catch JavaScript errors anywhere in the component tree, log those errors, and display fallback UI. The Enzyme monitoring system provides four specialized error boundaries for different use cases.

### Error Boundary Types

1. **Global Error Boundary** - Catches app-wide errors
2. **Hierarchical Error Boundaries** - Multi-level containment
3. **Query Error Boundary** - Specialized for data-fetching errors
4. **withErrorBoundary HOC** - Wrap individual components

## Boundary Levels

### Level Configuration

| Level | Priority | Auto-Retry | Max Retries | Use Case |
|-------|----------|------------|-------------|----------|
| **Critical** | 0 | No | 0 | App root, fatal errors |
| **Feature** | 1 | Yes | 2 | Pages, major features |
| **Component** | 2 | Yes | 3 | Complex components |
| **Widget** | 3 | Yes | 3 | Small UI elements |

### Level Hierarchy

```
Critical (Priority 0)
  └─ Feature (Priority 1)
      └─ Component (Priority 2)
          └─ Widget (Priority 3)
```

**Errors escalate up the hierarchy when:**
- Severity is critical
- Max retry attempts exceeded
- Custom `shouldEscalate()` returns true

## Global Error Boundary

Catches all unhandled errors at the application root.

### Props

```typescript
interface GlobalErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: AppError, reset: () => void) => ReactNode);
  onError?: (error: AppError, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}
```

### Basic Usage

```tsx
import { GlobalErrorBoundary } from '@/lib/monitoring';

function App() {
  return (
    <GlobalErrorBoundary>
      <YourApp />
    </GlobalErrorBoundary>
  );
}
```

### With Custom Fallback

```tsx
<GlobalErrorBoundary
  fallback={(error, reset) => (
    <div className="error-page">
      <h1>Something went wrong</h1>
      <p>{error.message}</p>
      <button onClick={reset}>Try Again</button>
      <button onClick={() => window.location.href = '/'}>
        Go Home
      </button>
    </div>
  )}
  onError={(error, errorInfo) => {
    console.error('Global error:', error);
    analytics.track('global-error', { error, errorInfo });
  }}
  showDetails={import.meta.env.DEV}
>
  <App />
</GlobalErrorBoundary>
```

### Default Fallback UI

The default fallback shows:
- Error message (user-friendly)
- Error ID for support
- "Try Again" button
- "Reload Page" button
- Stack trace (if `showDetails` enabled)

## Hierarchical Error Boundaries

Multi-level error containment with automatic recovery.

### HierarchicalErrorBoundary

Main component supporting all levels.

```typescript
interface HierarchicalErrorBoundaryProps {
  children: ReactNode;
  level: 'critical' | 'feature' | 'component' | 'widget';
  boundaryId?: string;
  fallback?: ReactNode | ((props: ErrorFallbackProps) => ReactNode);
  allowedActions?: RecoveryAction[];
  onRecover?: (action: RecoveryAction, error: AppError) => Promise<boolean>;
  shouldEscalate?: (error: AppError) => boolean;
  onError?: (error: AppError, errorInfo: ErrorInfo) => void;
  degradedComponent?: ReactNode;
  maxAutoRetry?: number;
  autoRetryDelay?: number;
}
```

### Recovery Actions

```typescript
type RecoveryAction =
  | 'retry'      // Retry rendering
  | 'reset'      // Reset state and retry
  | 'reload'     // Reload page
  | 'navigate'   // Navigate to home
  | 'escalate'   // Escalate to parent
  | 'degrade';   // Show degraded UI
```

### Critical Boundary

For app-wide fatal errors.

```tsx
import { CriticalErrorBoundary } from '@/lib/monitoring';

<CriticalErrorBoundary
  onError={(error) => {
    // Log critical errors immediately
    logger.critical('App crash', error);
  }}
>
  <App />
</CriticalErrorBoundary>
```

**Default Actions:** `['reload']`

### Feature Boundary

For page/feature isolation.

```tsx
import { FeatureErrorBoundary } from '@/lib/monitoring';

<FeatureErrorBoundary
  boundaryId="dashboard-boundary"
  onError={(error) => {
    analytics.track('feature-error', {
      feature: 'dashboard',
      error,
    });
  }}
>
  <Dashboard />
</FeatureErrorBoundary>
```

**Default Actions:** `['retry', 'reset', 'escalate']`

### Component Boundary

For complex component isolation.

```tsx
import { ComponentErrorBoundary } from '@/lib/monitoring';

<ComponentErrorBoundary
  degradedComponent={<SimplifiedEditor />}
  maxAutoRetry={3}
  autoRetryDelay={1000}
>
  <RichTextEditor />
</ComponentErrorBoundary>
```

**Default Actions:** `['retry', 'reset', 'degrade']`

### Widget Boundary

For small UI element isolation.

```tsx
import { WidgetErrorBoundary } from '@/lib/monitoring';

<WidgetErrorBoundary
  fallback={(error) => (
    <div className="widget-error">
      Unable to load widget
    </div>
  )}
>
  <WeatherWidget />
</WidgetErrorBoundary>
```

**Default Actions:** `['retry', 'degrade']`

### Custom Fallback with Actions

```tsx
<HierarchicalErrorBoundary
  level="component"
  fallback={({ error, allowedActions, onAction, isRecovering }) => (
    <div className="error-fallback">
      <h3>Component Error</h3>
      <p>{error.message}</p>

      <div className="actions">
        {allowedActions.includes('retry') && (
          <button
            onClick={() => onAction('retry')}
            disabled={isRecovering}
          >
            {isRecovering ? 'Retrying...' : 'Retry'}
          </button>
        )}

        {allowedActions.includes('reset') && (
          <button onClick={() => onAction('reset')}>
            Reset
          </button>
        )}

        {allowedActions.includes('degrade') && (
          <button onClick={() => onAction('degrade')}>
            Use Basic Version
          </button>
        )}
      </div>
    </div>
  )}
>
  <ComplexComponent />
</HierarchicalErrorBoundary>
```

### Hooks

#### useErrorBoundary

Access nearest error boundary context.

```tsx
import { useErrorBoundary } from '@/lib/monitoring';

function MyComponent() {
  const {
    level,
    boundaryId,
    escalateError,
    resetBoundary,
    hasError,
    error,
  } = useErrorBoundary();

  // Manually escalate error
  const handleCriticalError = () => {
    escalateError(new Error('Critical issue'));
  };

  return <div>...</div>;
}
```

#### useErrorTrigger

Programmatically throw errors.

```tsx
import { useErrorTrigger } from '@/lib/monitoring';

function MyComponent() {
  const triggerError = useErrorTrigger();

  const handleAction = async () => {
    try {
      await riskyOperation();
    } catch (error) {
      // Throw to nearest boundary
      triggerError(error);
    }
  };

  return <button onClick={handleAction}>Do Action</button>;
}
```

## Query Error Boundary

Specialized boundary for data-fetching errors.

### Props

```typescript
interface QueryErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((props: QueryErrorFallbackProps) => ReactNode);
  onError?: (error: AppError) => void;
  onRetry?: () => void;
  queryKey?: string;
}
```

### Basic Usage

```tsx
import { QueryErrorBoundary } from '@/lib/monitoring';

<QueryErrorBoundary
  queryKey="user-data"
  onRetry={() => {
    queryClient.invalidateQueries(['user-data']);
  }}
>
  <UserProfile />
</QueryErrorBoundary>
```

### With React Query

```tsx
import { QueryErrorBoundary } from '@/lib/monitoring';
import { useQuery } from '@tanstack/react-query';

function UserProfile() {
  const { data } = useQuery({
    queryKey: ['user'],
    queryFn: fetchUser,
    // Throw errors to boundary
    throwOnError: true,
  });

  return <div>{data.name}</div>;
}

// Wrap with query boundary
<QueryErrorBoundary
  queryKey="user"
  onRetry={() => queryClient.invalidateQueries(['user'])}
  fallback={({ error, retry, isRetryable }) => (
    <div>
      <p>Failed to load user</p>
      {isRetryable && (
        <button onClick={retry}>Retry</button>
      )}
    </div>
  )}
>
  <UserProfile />
</QueryErrorBoundary>
```

### Custom Fallback

```tsx
<QueryErrorBoundary
  fallback={({ error, reset, retry, isRetryable }) => (
    <div className="query-error">
      <ErrorIcon />
      <h3>Failed to load data</h3>
      <p>{error.message}</p>

      <div className="actions">
        {isRetryable && (
          <button onClick={retry}>
            Retry Request
          </button>
        )}
        <button onClick={reset}>
          Dismiss
        </button>
      </div>
    </div>
  )}
>
  <DataComponent />
</QueryErrorBoundary>
```

### Retryable Errors

Automatically determined based on error category:
- `network` - Retryable
- `timeout` - Retryable
- `rate_limit` - Retryable
- `server` - Retryable
- `validation` - Not retryable
- `authentication` - Not retryable

## withErrorBoundary HOC

Wrap individual components with error boundary.

### Basic Usage

```tsx
import { withErrorBoundary } from '@/lib/monitoring';

const SafeComponent = withErrorBoundary(MyComponent, {
  componentName: 'MyComponent',
  showReset: true,
});
```

### With Options

```tsx
const SafeComponent = withErrorBoundary(MyComponent, {
  componentName: 'MyComponent',
  fallback: (error, reset) => (
    <div>
      <p>Error in MyComponent</p>
      <button onClick={reset}>Reset</button>
    </div>
  ),
  onError: (error, errorInfo) => {
    console.error('Component error:', error);
  },
  showReset: true,
});
```

### Declarative ErrorBoundary

Use as component instead of HOC.

```tsx
import { ErrorBoundary } from '@/lib/monitoring';

<ErrorBoundary
  fallback={(error, reset) => (
    <ErrorCard error={error} onReset={reset} />
  )}
  onError={(error) => {
    logger.error('Boundary caught error', error);
  }}
  showReset
>
  <MyComponent />
</ErrorBoundary>
```

## Error Handling Patterns

### Pattern 1: Layered Protection

```tsx
<CriticalErrorBoundary>
  <App>
    <FeatureErrorBoundary>
      <Dashboard>
        <ComponentErrorBoundary>
          <ComplexWidget />
        </ComponentErrorBoundary>
      </Dashboard>
    </FeatureErrorBoundary>
  </App>
</CriticalErrorBoundary>
```

### Pattern 2: Isolated Features

```tsx
function AppRoutes() {
  return (
    <Routes>
      <Route path="/dashboard" element={
        <FeatureErrorBoundary boundaryId="dashboard">
          <Dashboard />
        </FeatureErrorBoundary>
      } />

      <Route path="/profile" element={
        <FeatureErrorBoundary boundaryId="profile">
          <Profile />
        </FeatureErrorBoundary>
      } />
    </Routes>
  );
}
```

### Pattern 3: Degraded Mode

```tsx
<ComponentErrorBoundary
  degradedComponent={<BasicEditor />}
  onError={(error) => {
    if (error.category === 'validation') {
      // Don't degrade on validation errors
      return;
    }
    // Auto-degrade on other errors
    return 'degrade';
  }}
>
  <RichTextEditor />
</ComponentErrorBoundary>
```

### Pattern 4: Escalation Control

```tsx
<FeatureErrorBoundary
  shouldEscalate={(error) => {
    // Escalate authentication errors to app level
    if (error.category === 'authentication') {
      return true;
    }
    // Handle others locally
    return false;
  }}
>
  <ProtectedFeature />
</FeatureErrorBoundary>
```

### Pattern 5: Custom Recovery

```tsx
<ComponentErrorBoundary
  onRecover={async (action, error) => {
    if (action === 'retry') {
      // Custom retry logic
      await clearCache();
      await reloadData();
      return true; // Handled
    }
    return false; // Use default handling
  }}
>
  <DataComponent />
</ComponentErrorBoundary>
```

## Recovery Strategies

### Automatic Retry

```tsx
<HierarchicalErrorBoundary
  level="component"
  maxAutoRetry={3}
  autoRetryDelay={1000}  // 1s, then 2s, then 4s (exponential backoff)
>
  <Component />
</HierarchicalErrorBoundary>
```

### Manual Recovery

```tsx
<HierarchicalErrorBoundary
  level="feature"
  fallback={({ error, onAction }) => (
    <div>
      <h3>Error Occurred</h3>
      <button onClick={() => onAction('retry')}>
        Retry
      </button>
      <button onClick={() => onAction('reset')}>
        Reset State
      </button>
      <button onClick={() => onAction('reload')}>
        Reload Page
      </button>
    </div>
  )}
>
  <Feature />
</HierarchicalErrorBoundary>
```

### Graceful Degradation

```tsx
<ComponentErrorBoundary
  degradedComponent={
    <div className="degraded">
      <p>Some features unavailable</p>
      <BasicVersion />
    </div>
  }
  allowedActions={['retry', 'degrade']}
>
  <FullFeaturedComponent />
</ComponentErrorBoundary>
```

### Error Escalation

```tsx
<FeatureErrorBoundary
  level="feature"
  shouldEscalate={(error) => {
    // Escalate critical errors
    return error.severity === 'critical';
  }}
>
  <Feature />
</FeatureErrorBoundary>
```

## Best Practices

### 1. Use Appropriate Levels

```tsx
// Good - appropriate hierarchy
<CriticalErrorBoundary>           {/* App crashes */}
  <FeatureErrorBoundary>           {/* Feature failures */}
    <ComponentErrorBoundary>       {/* Component failures */}
      <WidgetErrorBoundary>        {/* Widget failures */}
        <SmallWidget />
      </WidgetErrorBoundary>
    </ComponentErrorBoundary>
  </FeatureErrorBoundary>
</CriticalErrorBoundary>

// Bad - all critical level
<CriticalErrorBoundary>
  <CriticalErrorBoundary>
    <CriticalErrorBoundary>
      <Widget />
    </CriticalErrorBoundary>
  </CriticalErrorBoundary>
</CriticalErrorBoundary>
```

### 2. Provide Clear Fallbacks

```tsx
// Good - informative and actionable
<ErrorBoundary
  fallback={(error, reset) => (
    <div className="error-card">
      <ErrorIcon />
      <h3>Failed to load comments</h3>
      <p>We couldn't load the comments for this post.</p>
      <div className="actions">
        <button onClick={reset}>Try Again</button>
        <button onClick={() => reload()}>Refresh Page</button>
      </div>
      <details>
        <summary>Error Details</summary>
        <code>{error.message}</code>
      </details>
    </div>
  )}
>
  <Comments />
</ErrorBoundary>

// Bad - vague and unhelpful
<ErrorBoundary fallback="Error">
  <Comments />
</ErrorBoundary>
```

### 3. Handle Recovery Properly

```tsx
// Good - multiple recovery options
<ComponentErrorBoundary
  allowedActions={['retry', 'reset', 'degrade']}
  degradedComponent={<BasicVersion />}
  onRecover={async (action, error) => {
    if (action === 'retry') {
      await clearComponentCache();
    }
    return false; // Use default handling
  }}
>
  <ComplexComponent />
</ComponentErrorBoundary>

// Bad - no recovery options
<ComponentErrorBoundary>
  <ComplexComponent />
</ComponentErrorBoundary>
```

### 4. Log Errors Appropriately

```tsx
<FeatureErrorBoundary
  onError={(error, errorInfo) => {
    // Log with context
    logger.error('Feature error', {
      error,
      errorInfo,
      feature: 'dashboard',
      userId: currentUser.id,
      timestamp: new Date().toISOString(),
    });

    // Send to monitoring
    monitoring.trackError(error);
  }}
>
  <Dashboard />
</FeatureErrorBoundary>
```

### 5. Test Error Scenarios

```tsx
// Development error triggers
function ErrorTestPanel() {
  const trigger = useErrorTrigger();

  if (!import.meta.env.DEV) return null;

  return (
    <div className="error-test-panel">
      <button onClick={() => trigger(new Error('Test error'))}>
        Trigger Error
      </button>
      <button onClick={() => {
        const error = new Error('Network error');
        error.category = 'network';
        trigger(error);
      }}>
        Trigger Network Error
      </button>
    </div>
  );
}
```

### 6. Use Boundary IDs

```tsx
// Good - unique boundary IDs
<FeatureErrorBoundary boundaryId="dashboard-main">
  <Dashboard />
</FeatureErrorBoundary>

<FeatureErrorBoundary boundaryId="profile-settings">
  <Settings />
</FeatureErrorBoundary>

// Bad - no identification
<FeatureErrorBoundary>
  <Dashboard />
</FeatureErrorBoundary>
```

### 7. Handle Async Errors

```tsx
function AsyncComponent() {
  const trigger = useErrorTrigger();

  useEffect(() => {
    fetchData()
      .catch(error => {
        // Throw to boundary
        trigger(error);
      });
  }, [trigger]);

  return <div>...</div>;
}

<ComponentErrorBoundary>
  <AsyncComponent />
</ComponentErrorBoundary>
```

## Related Documentation

- [Monitoring Overview](./README.md)
- [Error Types](./TYPES.md)
