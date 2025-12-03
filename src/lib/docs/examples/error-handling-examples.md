# Error Handling Examples

> 20+ practical error handling examples for the Harbor React Library covering boundaries, recovery, and user feedback.

## Table of Contents

- [Error Boundaries](#error-boundaries)
- [Error Recovery](#error-recovery)
- [Fallback UI](#fallback-ui)
- [Retry Mechanisms](#retry-mechanisms)
- [Error Logging](#error-logging)
- [User Notifications](#user-notifications)
- [Best Practices](#best-practices)
- [Anti-Patterns](#anti-patterns)

---

## Error Boundaries

### Example 1: Basic Error Boundary

**Use Case:** Catch React rendering errors
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>Please refresh the page and try again.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage
function App() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <MainApp />
    </ErrorBoundary>
  );
}
```

**Explanation:** Error boundaries catch errors in component tree and display fallback UI.

**See Also:**

- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)

---

### Example 2: Error Boundary with Reset

**Use Case:** Allow users to recover from errors
**Difficulty:** ⭐⭐ Intermediate

```tsx
interface ErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
}

class ResettableErrorBoundary extends Component<ErrorBoundaryProps, State> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Oops! Something went wrong</h2>
          <p className="text-gray-600 mb-6">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <Button onClick={this.resetError}>
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage with reset handler
function App() {
  const handleReset = () => {
    // Reset app state, clear cache, etc.
    queryClient.clear();
  };

  return (
    <ResettableErrorBoundary onReset={handleReset}>
      <MainApp />
    </ResettableErrorBoundary>
  );
}
```

**Explanation:** Resettable boundaries allow users to attempt recovery without page refresh.

---

### Example 3: Nested Error Boundaries

**Use Case:** Isolate errors to specific features
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
function App() {
  return (
    <ErrorBoundary fallback={<AppErrorFallback />}>
      <Header />

      <main>
        <ErrorBoundary fallback={<SidebarErrorFallback />}>
          <Sidebar />
        </ErrorBoundary>

        <ErrorBoundary fallback={<ContentErrorFallback />}>
          <Content />
        </ErrorBoundary>
      </main>

      <Footer />
    </ErrorBoundary>
  );
}

function SidebarErrorFallback() {
  return (
    <div className="sidebar-error p-4 bg-red-50 border border-red-200 rounded">
      <p className="text-sm text-red-800">
        Unable to load sidebar. The rest of the app is still working.
      </p>
    </div>
  );
}
```

**Explanation:** Nested boundaries prevent one feature's errors from crashing the entire app.

---

## Error Recovery

### Example 4: Automatic Retry

**Use Case:** Retry failed operations automatically
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { useQuery } from '@tanstack/react-query';

function DataComponent() {
  const { data, error, isError } = useQuery({
    queryKey: ['data'],
    queryFn: fetchData,
    retry: 3, // Retry 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  if (isError) {
    return (
      <div className="error">
        <p>Failed to load data after multiple attempts</p>
        <p className="text-sm text-gray-600">{error.message}</p>
      </div>
    );
  }

  return <div>{data}</div>;
}
```

**Explanation:** Automatic retry with exponential backoff for transient failures.

---

### Example 5: Manual Retry Button

**Use Case:** Let users manually retry failed operations
**Difficulty:** ⭐ Basic

```tsx
function DataComponentWithRetry() {
  const { data, error, isError, refetch, isLoading } = useQuery({
    queryKey: ['data'],
    queryFn: fetchData,
    retry: false, // Manual retry only
  });

  if (isError) {
    return (
      <div className="error-state p-8 text-center">
        <ErrorIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Failed to load data</h3>
        <p className="text-gray-600 mb-4">{error.message}</p>
        <Button onClick={() => refetch()} disabled={isLoading}>
          {isLoading ? 'Retrying...' : 'Try Again'}
        </Button>
      </div>
    );
  }

  return <div>{data}</div>;
}
```

**Explanation:** Give users control over retry timing.

---

### Example 6: Graceful Degradation

**Use Case:** Provide reduced functionality when errors occur
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
function UserProfile({ userId }: { userId: string }) {
  const { data: user, error: userError } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });

  const { data: posts, error: postsError } = useQuery({
    queryKey: ['posts', userId],
    queryFn: () => fetchUserPosts(userId),
  });

  const { data: stats, error: statsError } = useQuery({
    queryKey: ['stats', userId],
    queryFn: () => fetchUserStats(userId),
  });

  // Critical error - can't show profile without user data
  if (userError) {
    return <ErrorFallback error={userError} />;
  }

  return (
    <div className="user-profile">
      <UserInfo user={user} />

      {/* Non-critical error - show message but keep rest of UI */}
      {postsError ? (
        <div className="error-message">
          <p>Unable to load posts</p>
        </div>
      ) : (
        <UserPosts posts={posts} />
      )}

      {/* Another non-critical section */}
      {statsError ? (
        <div className="error-message">
          <p>Stats temporarily unavailable</p>
        </div>
      ) : (
        <UserStats stats={stats} />
      )}
    </div>
  );
}
```

**Explanation:** Distinguish critical vs. non-critical errors for better UX.

---

## Fallback UI

### Example 7: Custom Error Pages

**Use Case:** Branded error experiences
**Difficulty:** ⭐⭐ Intermediate

```tsx
interface ErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
}

function NotFoundError() {
  return (
    <div className="error-page min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-800">404</h1>
        <p className="text-2xl text-gray-600 mt-4">Page not found</p>
        <p className="text-gray-500 mt-2">
          The page you're looking for doesn't exist.
        </p>
        <Button className="mt-8" asChild>
          <Link to="/">Go Home</Link>
        </Button>
      </div>
    </div>
  );
}

function ServerError() {
  return (
    <div className="error-page min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-red-600">500</h1>
        <p className="text-2xl text-gray-600 mt-4">Server Error</p>
        <p className="text-gray-500 mt-2">
          Something went wrong on our end. We're working to fix it.
        </p>
        <Button className="mt-8" onClick={() => window.location.reload()}>
          Refresh Page
        </Button>
      </div>
    </div>
  );
}
```

**Explanation:** Custom error pages maintain brand experience during errors.

---

### Example 8: Contextual Error Messages

**Use Case:** Show relevant error info based on context
**Difficulty:** ⭐⭐ Intermediate

```tsx
interface ErrorContext {
  action: string;
  resource: string;
}

function ContextualError({ error, context }: { error: Error; context: ErrorContext }) {
  const getErrorMessage = () => {
    if (error.message.includes('network')) {
      return {
        title: 'Connection Error',
        message: `Unable to ${context.action} ${context.resource}. Please check your internet connection.`,
        suggestion: 'Try again when your connection is restored.',
      };
    }

    if (error.message.includes('401')) {
      return {
        title: 'Authentication Required',
        message: `You need to be logged in to ${context.action} ${context.resource}.`,
        suggestion: 'Please sign in and try again.',
      };
    }

    if (error.message.includes('403')) {
      return {
        title: 'Permission Denied',
        message: `You don't have permission to ${context.action} this ${context.resource}.`,
        suggestion: 'Contact an administrator if you believe this is a mistake.',
      };
    }

    return {
      title: 'Error',
      message: `Failed to ${context.action} ${context.resource}.`,
      suggestion: 'Please try again later.',
    };
  };

  const errorInfo = getErrorMessage();

  return (
    <div className="contextual-error border-l-4 border-red-500 bg-red-50 p-4">
      <h3 className="font-semibold text-red-800">{errorInfo.title}</h3>
      <p className="text-red-700 mt-1">{errorInfo.message}</p>
      <p className="text-sm text-red-600 mt-2">{errorInfo.suggestion}</p>
    </div>
  );
}

// Usage
<ContextualError
  error={error}
  context={{ action: 'delete', resource: 'user' }}
/>
```

**Explanation:** Context-aware messages help users understand and resolve errors.

---

## Retry Mechanisms

### Example 9: Exponential Backoff

**Use Case:** Smart retry strategy
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
  } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 30000 } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff with jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelay
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Usage
const data = await fetchWithRetry(() => fetch('/api/data').then((r) => r.json()), {
  maxRetries: 5,
  baseDelay: 1000,
  maxDelay: 30000,
});
```

**Explanation:** Exponential backoff prevents overwhelming servers during outages.

---

### Example 10: Circuit Breaker Pattern

**Use Case:** Prevent cascading failures
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime?: number;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000
  ) {
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime! > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = 'open';
    }
  }
}

// Usage
const breaker = new CircuitBreaker(5, 60000);

function DataComponent() {
  const { data, error } = useQuery({
    queryKey: ['data'],
    queryFn: () => breaker.execute(() => fetchData()),
  });

  if (error?.message === 'Circuit breaker is open') {
    return <div>Service temporarily unavailable. Please try again later.</div>;
  }

  // ... rest of component
}
```

**Explanation:** Circuit breaker stops requests to failing services.

---

## Error Logging

### Example 11: Error Tracking Service

**Use Case:** Send errors to monitoring service
**Difficulty:** ⭐⭐ Intermediate

```tsx
import * as Sentry from '@sentry/react';

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

// Error boundary with logging
class LoggingErrorBoundary extends Component<Props, State> {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to Sentry
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught:', error, errorInfo);
    }
  }

  // ... rest of error boundary
}

// Logging in async operations
async function submitForm(data: FormData) {
  try {
    await api.submit(data);
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        action: 'form_submission',
      },
      extra: {
        formData: data,
      },
    });

    throw error;
  }
}
```

**Explanation:** Centralized error logging helps diagnose production issues.

---

### Example 12: Custom Error Logger

**Use Case:** Log errors with context
**Difficulty:** ⭐⭐ Intermediate

```tsx
interface ErrorContext {
  userId?: string;
  action?: string;
  metadata?: Record<string, any>;
}

class ErrorLogger {
  static log(error: Error, context?: ErrorContext) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...context,
    };

    // Send to logging service
    fetch('/api/logs/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorData),
    }).catch(console.error);

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', errorData);
    }
  }
}

// Usage
function handleError(error: Error) {
  ErrorLogger.log(error, {
    userId: currentUser?.id,
    action: 'checkout',
    metadata: { cartTotal: 99.99 },
  });
}
```

**Explanation:** Custom logger captures relevant context for debugging.

---

## User Notifications

### Example 13: Toast Notifications for Errors

**Use Case:** Non-intrusive error notifications
**Difficulty:** ⭐ Basic

```tsx
import { toast } from 'sonner';

function useErrorToast() {
  const showError = (error: Error | string) => {
    const message = typeof error === 'string' ? error : error.message;

    toast.error(message, {
      duration: 5000,
      action: {
        label: 'Dismiss',
        onClick: () => {},
      },
    });
  };

  return { showError };
}

// Usage
function DataComponent() {
  const { showError } = useErrorToast();

  const mutation = useMutation({
    mutationFn: submitData,
    onError: (error) => {
      showError(error);
    },
  });

  return <form onSubmit={handleSubmit}>...</form>;
}
```

**Explanation:** Toast notifications provide error feedback without blocking UI.

---

### Example 14: Error Banner

**Use Case:** Persistent error display
**Difficulty:** ⭐⭐ Intermediate

```tsx
function ErrorBanner({ error, onDismiss }: { error: Error; onDismiss: () => void }) {
  return (
    <div className="error-banner bg-red-50 border-b border-red-200 p-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircleIcon className="text-red-600" />
          <div>
            <p className="font-medium text-red-900">Error</p>
            <p className="text-sm text-red-700">{error.message}</p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-red-600 hover:text-red-800"
          aria-label="Dismiss error"
        >
          <XIcon />
        </button>
      </div>
    </div>
  );
}

// Usage
function App() {
  const [globalError, setGlobalError] = useState<Error | null>(null);

  return (
    <>
      {globalError && (
        <ErrorBanner
          error={globalError}
          onDismiss={() => setGlobalError(null)}
        />
      )}
      <MainApp onError={setGlobalError} />
    </>
  );
}
```

**Explanation:** Banners display important errors that need user attention.

---

### Example 15: Inline Error Messages

**Use Case:** Field-level validation errors
**Difficulty:** ⭐ Basic

```tsx
function FormFieldError({ error }: { error?: string }) {
  if (!error) return null;

  return (
    <div className="flex items-center gap-2 mt-1">
      <AlertCircleIcon className="w-4 h-4 text-red-600" />
      <p className="text-sm text-red-600">{error}</p>
    </div>
  );
}

// Usage in form
function LoginForm() {
  const { register, formState: { errors } } = useForm();

  return (
    <form>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" {...register('email')} />
        <FormFieldError error={errors.email?.message} />
      </div>
    </form>
  );
}
```

**Explanation:** Inline messages provide immediate, contextual feedback.

---

### Example 16: Empty State vs Error State

**Use Case:** Distinguish between no data and errors
**Difficulty:** ⭐⭐ Intermediate

```tsx
function DataList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['items'],
    queryFn: fetchItems,
  });

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <div className="error-state text-center py-12">
        <ErrorIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Failed to load items
        </h3>
        <p className="text-gray-600 mb-4">{error.message}</p>
        <Button onClick={() => refetch()}>Try Again</Button>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="empty-state text-center py-12">
        <EmptyIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No items yet
        </h3>
        <p className="text-gray-600 mb-4">
          Get started by creating your first item.
        </p>
        <Button>Create Item</Button>
      </div>
    );
  }

  return <List items={data} />;
}
```

**Explanation:** Differentiate between errors and legitimate empty states.

---

### Example 17: Error Modal Dialog

**Use Case:** Critical errors requiring acknowledgment
**Difficulty:** ⭐⭐ Intermediate

```tsx
function ErrorDialog({ error, onClose }: { error: Error; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircleIcon className="w-6 h-6 text-red-600" />
            <DialogTitle>Error</DialogTitle>
          </div>
        </DialogHeader>

        <div className="py-4">
          <p className="text-gray-700">{error.message}</p>

          {process.env.NODE_ENV === 'development' && error.stack && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-gray-600">
                Stack Trace
              </summary>
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                {error.stack}
              </pre>
            </details>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Okay</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Explanation:** Modal dialogs ensure users see critical errors.

---

### Example 18: Error with Support Link

**Use Case:** Guide users to help resources
**Difficulty:** ⭐ Basic

```tsx
function ErrorWithSupport({ error }: { error: Error }) {
  const errorId = generateErrorId();

  return (
    <div className="error-support border border-red-200 bg-red-50 rounded p-6">
      <h3 className="text-lg font-semibold text-red-900 mb-2">
        Something went wrong
      </h3>
      <p className="text-red-700 mb-4">{error.message}</p>

      <div className="bg-white border border-red-200 rounded p-3 mb-4">
        <p className="text-sm text-gray-600 mb-1">Error ID:</p>
        <code className="text-sm font-mono">{errorId}</code>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" asChild>
          <a href="/support">Contact Support</a>
        </Button>
        <Button variant="outline" asChild>
          <a href="/docs/troubleshooting">View Documentation</a>
        </Button>
      </div>
    </div>
  );
}
```

**Explanation:** Provide error ID and support links for user assistance.

---

### Example 19: Network Error Handling

**Use Case:** Detect and handle network issues
**Difficulty:** ⭐⭐ Intermediate

```tsx
function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

function NetworkAwareComponent() {
  const isOnline = useNetworkStatus();

  if (!isOnline) {
    return (
      <div className="network-error bg-yellow-50 border border-yellow-200 p-4 rounded">
        <div className="flex items-center gap-2">
          <WifiOffIcon className="text-yellow-600" />
          <div>
            <p className="font-medium text-yellow-900">No internet connection</p>
            <p className="text-sm text-yellow-700">
              Please check your connection and try again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <DataComponent />;
}
```

**Explanation:** Detect network status and show appropriate messaging.

---

### Example 20: Error Aggregation

**Use Case:** Handle multiple simultaneous errors
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
function useErrorAggregator() {
  const [errors, setErrors] = useState<Map<string, Error>>(new Map());

  const addError = (key: string, error: Error) => {
    setErrors((prev) => new Map(prev).set(key, error));
  };

  const removeError = (key: string) => {
    setErrors((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  };

  const clearErrors = () => {
    setErrors(new Map());
  };

  return {
    errors: Array.from(errors.entries()),
    addError,
    removeError,
    clearErrors,
    hasErrors: errors.size > 0,
  };
}

function App() {
  const { errors, addError, removeError, hasErrors } = useErrorAggregator();

  return (
    <>
      {hasErrors && (
        <div className="error-summary bg-red-50 border-b border-red-200 p-4">
          <h3 className="font-medium text-red-900 mb-2">
            {errors.length} error{errors.length > 1 ? 's' : ''} occurred
          </h3>
          <ul className="space-y-1">
            {errors.map(([key, error]) => (
              <li key={key} className="flex items-center justify-between">
                <span className="text-sm text-red-700">{error.message}</span>
                <button
                  onClick={() => removeError(key)}
                  className="text-red-600 hover:text-red-800"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <MainApp onError={addError} />
    </>
  );
}
```

**Explanation:** Aggregate multiple errors for comprehensive error reporting.

---

## Best Practices

### Error Handling Strategy

- ✅ **DO** catch errors at appropriate boundaries
- ✅ **DO** provide clear, actionable error messages
- ✅ **DO** log errors for debugging
- ✅ **DO** implement retry strategies
- ❌ **DON'T** silently swallow errors
- ❌ **DON'T** show technical stack traces to users

### User Experience

- ✅ **DO** provide recovery options
- ✅ **DO** maintain context during errors
- ✅ **DO** use appropriate notification levels
- ✅ **DO** distinguish error types
- ❌ **DON'T** block UI unnecessarily
- ❌ **DON'T** show generic "error occurred" messages

### Recovery

- ✅ **DO** implement graceful degradation
- ✅ **DO** preserve user data during errors
- ✅ **DO** provide clear next steps
- ✅ **DO** allow manual retry
- ❌ **DON'T** force page refresh for all errors
- ❌ **DON'T** lose user input on error

---

## Anti-Patterns

### ❌ Silent Failures

```tsx
// BAD
try {
  await submitForm(data);
} catch (error) {
  // Nothing - user never knows it failed
}

// GOOD
try {
  await submitForm(data);
  toast.success('Form submitted');
} catch (error) {
  toast.error('Submission failed');
  console.error(error);
}
```

### ❌ Generic Error Messages

```tsx
// BAD
<p>An error occurred</p>

// GOOD
<p>Failed to load user profile. Please try again.</p>
```

### ❌ Throwing from Error Boundaries

```tsx
// BAD
componentDidCatch(error: Error) {
  throw error; // Creates error loop
}

// GOOD
componentDidCatch(error: Error) {
  this.setState({ hasError: true, error });
  logError(error);
}
```

---

## See Also

- [Error Handling Guide](../ERROR-HANDLING.md) - Complete error handling documentation
- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary) -
  Official docs
- [Sentry Documentation](https://docs.sentry.io/) - Error tracking service
- [Documentation Index](../INDEX.md) - All documentation resources
