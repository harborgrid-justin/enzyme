# @missionfabric-js/enzyme Framework - Module Documentation

> **Version:** 1.0.0
> **License:** MIT

This document provides comprehensive API documentation for the core modules of the @missionfabric-js/enzyme framework.

---

## Table of Contents

1. [Monitoring Module](#monitoring-module)
2. [Queries Module](#queries-module)
3. [Layouts Module](#layouts-module)
4. [Performance Module](#performance-module)

---

# Monitoring Module

The Monitoring module provides comprehensive error handling, tracking, and recovery capabilities for React applications.

## Module Architecture

```
┌─────────────────────────────────────────────────────┐
│                 Application Layer                    │
└─────────────────────┬───────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
   ┌────▼────┐   ┌───▼────┐   ┌───▼────────┐
   │  Error  │   │ Error  │   │  Crash     │
   │  Types  │   │Reporter│   │ Analytics  │
   └────┬────┘   └───┬────┘   └───┬────────┘
        │            │            │
        └────────┬───┴────────────┘
                 │
        ┌────────▼──────────┐
        │  Error Boundaries │
        │  (Hierarchical)   │
        └───────────────────┘
```

---

## Error Types

### `AppError`

Normalized application error structure.

```typescript
interface AppError {
  id: string;
  message: string;
  code?: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  timestamp: string;
  stack?: string;
  context?: Record<string, unknown>;
  originalError?: unknown;
}
```

### `ErrorCategory`

Error classification types:

```typescript
type ErrorCategory =
  | 'network'       // Network connectivity issues
  | 'authentication' // Auth/session errors
  | 'authorization' // Permission errors
  | 'validation'    // Input validation failures
  | 'server'        // Server-side errors (5xx)
  | 'client'        // Client-side errors (4xx)
  | 'timeout'       // Request timeouts
  | 'rate_limit'    // Rate limiting
  | 'unknown';      // Unclassified errors
```

### `ErrorSeverity`

```typescript
type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
```

### Functions

#### `categorizeError(error: unknown): ErrorCategory`

Automatically categorizes errors based on type and properties.

**Example:**
```typescript
const category = categorizeError(new Error('Network request failed'));
// => 'network'

const category = categorizeError({ status: 401 });
// => 'authentication'
```

#### `getSeverity(category: ErrorCategory): ErrorSeverity`

Maps error categories to severity levels.

**Example:**
```typescript
const severity = getSeverity('server');
// => 'high'

const severity = getSeverity('validation');
// => 'low'
```

#### `normalizeError(error: unknown, context?: Partial<AppError>): AppError`

Converts any error type to a normalized `AppError`.

**Parameters:**
- `error` - Any error value (Error, string, object, etc.)
- `context` - Optional additional context

**Returns:** Normalized `AppError` object

**Example:**
```typescript
const normalized = normalizeError(
  new TypeError('Invalid argument'),
  { code: 'INVALID_ARG' }
);
// => AppError with category: 'client', severity: 'low'
```

#### `isRetryableError(error: AppError): boolean`

Determines if an error can be retried.

**Returns:** `true` for network, timeout, rate_limit, or server errors

**Example:**
```typescript
const canRetry = isRetryableError(error);
if (canRetry) {
  setTimeout(retryOperation, 1000);
}
```

#### `getUserFriendlyMessage(error: AppError): string`

Gets user-friendly error message.

**Example:**
```typescript
const message = getUserFriendlyMessage(error);
// => "Unable to connect. Please check your internet connection."
```

---

## Error Reporter

Global error reporting service for external monitoring (Sentry, Datadog, etc.).

### Configuration

```typescript
interface ErrorReporterConfig {
  enabled: boolean;
  dsn?: string;
  environment: string;
  version: string;
  sampleRate?: number;
  beforeSend?: (report: ErrorReport) => ErrorReport | null;
  ignoredErrors?: (string | RegExp)[];
}
```

### Initialization

#### `initErrorReporter(options?: Partial<ErrorReporterConfig>): void`

Initializes the error reporter with global error handlers.

**Example:**
```typescript
import { initErrorReporter } from '@missionfabric-js/enzyme/monitoring';

initErrorReporter({
  enabled: true,
  dsn: 'https://your-sentry-dsn',
  environment: 'production',
  version: '1.0.0',
  sampleRate: 0.5,
  ignoredErrors: [
    'ResizeObserver loop limit exceeded',
    /^Loading chunk .* failed/
  ]
});
```

### Functions

#### `reportError(error: unknown, context?: Partial<ErrorContext>): void`

Reports an error to monitoring services.

**Parameters:**
- `error` - Error to report
- `context` - Additional error context

**Example:**
```typescript
try {
  await fetchData();
} catch (error) {
  reportError(error, {
    component: 'DataFetcher',
    action: 'fetch_user_data',
    metadata: { userId: '123' }
  });
}
```

#### `reportWarning(message: string, context?: Partial<ErrorContext>): void`

Reports a warning (low severity).

**Example:**
```typescript
reportWarning('Deprecated API usage detected', {
  component: 'LegacyComponent',
  metadata: { apiVersion: 'v1' }
});
```

#### `addBreadcrumb(type: string, message: string, data?: Record<string, unknown>): void`

Adds a breadcrumb for error context tracking.

**Example:**
```typescript
addBreadcrumb('navigation', 'User navigated to dashboard', {
  from: '/login',
  to: '/dashboard'
});
```

#### `setUserContext(userId?: string, sessionId?: string): void`

Sets user context for error reports.

**Example:**
```typescript
setUserContext('user-123', 'session-abc');
```

#### `setErrorContext(context: Partial<ErrorContext>): void`

Sets additional error context.

**Example:**
```typescript
setErrorContext({
  route: '/dashboard',
  feature: 'analytics'
});
```

---

## Error Messages

Context-aware, user-friendly error messaging system.

### Types

#### `ErrorMessageContext`

```typescript
interface ErrorMessageContext {
  userAction?: string;    // e.g., "save your changes"
  resource?: string;      // e.g., "dashboard"
  feature?: string;       // e.g., "Reports"
  metadata?: Record<string, unknown>;
}
```

#### `StructuredErrorMessage`

```typescript
interface StructuredErrorMessage {
  title: string;
  description: string;
  suggestions: string[];
  technicalDetails?: string;
  recoverable: boolean;
  retryAfter?: number;
}
```

### Functions

#### `getStructuredErrorMessage(error: AppError, context?: ErrorMessageContext): StructuredErrorMessage`

Generates structured error message with recovery suggestions.

**Example:**
```typescript
const message = getStructuredErrorMessage(error, {
  userAction: 'save your document',
  feature: 'Documents'
});

// => {
//   title: 'Connection Issue',
//   description: "We couldn't save your document because of a network issue.",
//   suggestions: [
//     'Check your internet connection',
//     'Try again in a few moments',
//     'If the problem persists, try refreshing the page'
//   ],
//   recoverable: true,
//   retryAfter: 3000
// }
```

#### `getToastMessage(error: AppError, context?: ErrorMessageContext): string`

Gets short message for toast notifications.

**Example:**
```typescript
const toast = getToastMessage(error, { userAction: 'load data' });
// => "Unable to connect while loading data. Check your internet connection."
```

#### `httpStatusToMessage(status: number): string`

Converts HTTP status to user-friendly message.

**Example:**
```typescript
httpStatusToMessage(404);
// => "The requested resource was not found."

httpStatusToMessage(429);
// => "Too many requests. Please slow down."
```

#### `createContextualMessage(error: AppError, action: string, resource?: string): string`

Creates contextual error message.

**Example:**
```typescript
const msg = createContextualMessage(error, 'save', 'document');
// => "Server error while saving document. We're looking into it."
```

#### `getRecoveryActions(error: AppError): RecoveryActions`

Gets appropriate recovery action buttons.

**Example:**
```typescript
const actions = getRecoveryActions(error);
// => {
//   primaryAction: 'retry',
//   primaryLabel: 'Try Again',
//   secondaryAction: 'dismiss',
//   secondaryLabel: 'Dismiss'
// }
```

---

## Error Boundaries

### Hierarchical Error Boundary

Multi-level error containment with automatic recovery.

#### Error Boundary Levels

```
┌─────────────────────────────────────┐
│   Critical (App-wide)               │  Level 0 - Full reload
│   ┌─────────────────────────────┐   │
│   │  Feature (Page-level)       │   │  Level 1 - Retry/Reset/Escalate
│   │  ┌─────────────────────┐    │   │
│   │  │ Component           │    │   │  Level 2 - Retry/Reset/Degrade
│   │  │  ┌─────────────┐    │    │   │
│   │  │  │ Widget      │    │    │   │  Level 3 - Retry/Degrade
│   │  │  └─────────────┘    │    │   │
│   │  └─────────────────────┘    │   │
│   └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

#### `HierarchicalErrorBoundary`

**Props:**
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

**Example:**
```typescript
import { HierarchicalErrorBoundary } from '@missionfabric-js/enzyme/monitoring';

function App() {
  return (
    <HierarchicalErrorBoundary
      level="critical"
      onError={(error) => console.error('Critical error:', error)}
    >
      <HierarchicalErrorBoundary
        level="feature"
        fallback={<FeatureErrorFallback />}
        allowedActions={['retry', 'reset']}
      >
        <DashboardFeature />
      </HierarchicalErrorBoundary>
    </HierarchicalErrorBoundary>
  );
}
```

#### Convenience Components

##### `CriticalErrorBoundary`
App-wide error boundary (level: critical).

```typescript
<CriticalErrorBoundary>
  <App />
</CriticalErrorBoundary>
```

##### `FeatureErrorBoundary`
Feature/page level errors (level: feature).

```typescript
<FeatureErrorBoundary>
  <DashboardPage />
</FeatureErrorBoundary>
```

##### `ComponentErrorBoundary`
Component level errors (level: component).

```typescript
<ComponentErrorBoundary>
  <ComplexDataGrid />
</ComponentErrorBoundary>
```

##### `WidgetErrorBoundary`
Small UI element errors (level: widget).

```typescript
<WidgetErrorBoundary degradedComponent={<Skeleton />}>
  <UserAvatar />
</WidgetErrorBoundary>
```

#### Hooks

##### `useErrorBoundary(): ErrorBoundaryContextValue`

Access nearest error boundary context.

**Example:**
```typescript
function MyComponent() {
  const { resetBoundary, escalateError, hasError } = useErrorBoundary();

  const handleError = (error: Error) => {
    escalateError(normalizeError(error));
  };

  return <div>...</div>;
}
```

##### `useErrorTrigger(): (error: unknown) => void`

Programmatically trigger error in nearest boundary.

**Example:**
```typescript
function MyComponent() {
  const triggerError = useErrorTrigger();

  const handleClick = () => {
    triggerError(new Error('Something went wrong'));
  };

  return <button onClick={handleClick}>Trigger Error</button>;
}
```

### Global Error Boundary

Simple app-wide error boundary.

**Example:**
```typescript
import { GlobalErrorBoundary } from '@missionfabric-js/enzyme/monitoring';

<GlobalErrorBoundary
  fallback={(error, reset) => (
    <div>
      <h1>Error: {error.message}</h1>
      <button onClick={reset}>Try Again</button>
    </div>
  )}
  showDetails={process.env.NODE_ENV === 'development'}
  onError={(error) => console.error(error)}
>
  <App />
</GlobalErrorBoundary>
```

### Query Error Boundary

Specialized boundary for data-fetching errors.

**Example:**
```typescript
import { QueryErrorBoundary } from '@missionfabric-js/enzyme/monitoring';

<QueryErrorBoundary
  queryKey="users"
  onRetry={() => refetchUsers()}
>
  <UsersList />
</QueryErrorBoundary>
```

### HOC: `withErrorBoundary`

Wrap components with error boundaries.

**Example:**
```typescript
const SafeComponent = withErrorBoundary(MyComponent, {
  fallback: <ErrorFallback />,
  onError: (error) => logError(error),
  showReset: true
});
```

---

## Crash Analytics

Session recording and breadcrumb tracking.

### `CrashAnalytics`

#### Types

```typescript
interface Breadcrumb {
  type: 'navigation' | 'ui' | 'http' | 'console' | 'error' | 'user' | 'custom';
  category: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: number;
  level: 'debug' | 'info' | 'warning' | 'error';
}

interface SessionData {
  sessionId: string;
  userId?: string;
  startTime: number;
  breadcrumbs: Breadcrumb[];
  userActions: UserAction[];
  performanceMetrics: PerformanceMetrics;
  deviceInfo: DeviceInfo;
  errors: AppError[];
}
```

#### Global Instance

```typescript
import { crashAnalytics } from '@missionfabric-js/enzyme/monitoring';

// Initialize
crashAnalytics.init();

// Add custom breadcrumb
crashAnalytics.addBreadcrumb({
  type: 'custom',
  category: 'checkout',
  message: 'User started checkout',
  level: 'info',
  data: { cartItems: 3 }
});

// Get session data for crash report
const sessionData = crashAnalytics.getSessionData();

// Record error
crashAnalytics.recordError(normalizedError);

// Get recent breadcrumbs
const recent = crashAnalytics.getRecentBreadcrumbs(20);
```

#### Configuration

```typescript
interface CrashAnalyticsConfig {
  maxBreadcrumbs?: number;           // Default: 100
  maxUserActions?: number;           // Default: 500
  autoCaptureClicks?: boolean;       // Default: true
  autoCaptureNavigation?: boolean;   // Default: true
  autoCaptureConsole?: boolean;      // Default: true
  autoCaptureNetwork?: boolean;      // Default: true
  maskInputs?: boolean;              // Default: true
  sessionSampleRate?: number;        // Default: 1.0
  getUserId?: () => string | undefined;
}
```

---

# Queries Module

React Query integration with offline support, retry logic, and smart caching.

## Architecture

```
┌─────────────────────────────────────────┐
│         React Components                │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
┌───▼────┐         ┌─────▼─────┐
│ Hooks  │◄────────┤  Query    │
│        │         │  Client   │
└───┬────┘         └─────┬─────┘
    │                    │
    │              ┌─────▼─────┐
    │              │   API     │
    └──────────────►  Client   │
                   └───────────┘
```

---

## Query Client

Enhanced React Query client with production-ready defaults.

### `createQueryClient(config?: QueryClientConfig): QueryClient`

Creates configured query client instance.

**Configuration:**
```typescript
interface QueryClientConfig {
  defaultStaleTime?: number;        // Default: 5 minutes
  defaultGcTime?: number;           // Default: 30 minutes
  maxRetries?: number;              // Default: 3
  deduplication?: boolean;          // Default: true
  backgroundRefetch?: boolean;      // Default: false
  offlineFirst?: boolean;           // Default: true
  onError?: (error: unknown, query?: Query) => void;
  onSuccess?: (data: unknown, query?: Query) => void;
}
```

**Example:**
```typescript
import { createQueryClient } from '@missionfabric-js/enzyme/queries';

const queryClient = createQueryClient({
  defaultStaleTime: 10 * 60 * 1000, // 10 minutes
  maxRetries: 5,
  onError: (error) => Sentry.captureException(error)
});
```

### Default Instance

```typescript
import { queryClient } from '@missionfabric-js/enzyme/queries';

// Use the default pre-configured instance
queryClient.prefetchQuery({ ... });
```

---

## Query Keys

Type-safe query key factory.

```typescript
import { queryKeys } from '@missionfabric-js/enzyme/queries';

// Dashboard
queryKeys.dashboard.stats();
queryKeys.dashboard.charts('7d');
queryKeys.dashboard.activity(1);

// Users
queryKeys.users.all;
queryKeys.users.list({ status: 'active' });
queryKeys.users.detail('user-123');
queryKeys.users.profile();

// Reports
queryKeys.reports.list({ type: 'monthly' });
queryKeys.reports.detail('report-456');

// Notifications
queryKeys.notifications.list(1);
queryKeys.notifications.unreadCount();
```

**Invalidation:**
```typescript
// Invalidate all user queries
queryClient.invalidateQueries({ queryKey: queryKeys.users.all });

// Invalidate specific user
queryClient.invalidateQueries({ queryKey: queryKeys.users.detail('123') });
```

---

## Dashboard Queries

### Types

```typescript
interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalReports: number;
  pendingTasks: number;
  recentActivity: number;
  growthRate: number;
}

interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

interface DashboardCharts {
  userGrowth: ChartDataPoint[];
  reportTrends: ChartDataPoint[];
  activityByDay: ChartDataPoint[];
}

interface ActivityItem {
  id: string;
  type: 'create' | 'update' | 'delete' | 'view';
  entityType: string;
  entityId: string;
  userId: string;
  userName: string;
  timestamp: string;
  description: string;
}
```

### Hooks

#### `useDashboardStats()`

Fetches dashboard statistics.

**Example:**
```typescript
function DashboardStats() {
  const { data, isLoading, error } = useDashboardStats();

  if (isLoading) return <Spinner />;
  if (error) return <Error error={error} />;

  return (
    <div>
      <Stat label="Total Users" value={data.totalUsers} />
      <Stat label="Active Users" value={data.activeUsers} />
    </div>
  );
}
```

#### `useDashboardCharts(range?: string)`

Fetches dashboard charts data.

**Parameters:**
- `range` - Time range (default: '7d'). Options: '7d', '30d', '90d'

**Example:**
```typescript
function ChartsView() {
  const { data } = useDashboardCharts('30d');

  return <LineChart data={data.userGrowth} />;
}
```

#### `useActivity(page?: number)`

Fetches paginated activity feed.

**Example:**
```typescript
function ActivityFeed() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useActivity(page);

  return (
    <div>
      {data.items.map(item => <ActivityItem key={item.id} {...item} />)}
      {data.hasMore && <button onClick={() => setPage(p => p + 1)}>Load More</button>}
    </div>
  );
}
```

### Suspense Variants

```typescript
// Throws promise while loading (use with React Suspense)
const { data } = useDashboardStatsSuspense();
const { data } = useDashboardChartsSuspense('7d');
const { data } = useActivitySuspense(1);
```

**Example with Suspense:**
```typescript
<Suspense fallback={<Spinner />}>
  <DashboardStatsComponent />
</Suspense>

function DashboardStatsComponent() {
  const { data } = useDashboardStatsSuspense();
  return <StatsDisplay {...data} />;
}
```

---

## User Queries

### Types

```typescript
type UserRole = 'admin' | 'manager' | 'user' | 'viewer';
type UserStatus = 'active' | 'inactive' | 'pending' | 'suspended';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

interface UserFilters {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  page?: number;
  pageSize?: number;
  sortBy?: keyof User;
  sortOrder?: 'asc' | 'desc';
}
```

### Hooks

#### `useUsers(filters?: UserFilters)`

Fetches paginated users list.

**Example:**
```typescript
function UsersList() {
  const [filters, setFilters] = useState({ status: 'active' });
  const { data, isLoading } = useUsers(filters);

  return (
    <div>
      <SearchFilter onChange={setFilters} />
      <UserTable users={data.users} total={data.total} />
    </div>
  );
}
```

#### `useUser(id: string)`

Fetches single user by ID.

**Example:**
```typescript
function UserProfile({ userId }: { userId: string }) {
  const { data: user, isLoading } = useUser(userId);

  if (isLoading) return <Skeleton />;

  return <ProfileCard user={user} />;
}
```

#### `useUserProfile()`

Fetches current authenticated user profile.

**Example:**
```typescript
function CurrentUserMenu() {
  const { data: user } = useUserProfile();

  return (
    <Menu>
      <Avatar src={user.avatar} />
      <span>{user.displayName}</span>
    </Menu>
  );
}
```

### Mutations

#### `useCreateUser(options?)`

Creates a new user.

**Example:**
```typescript
function CreateUserForm() {
  const createUser = useCreateUser({
    onSuccess: () => {
      toast.success('User created successfully');
      navigate('/users');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const handleSubmit = (data: CreateUserPayload) => {
    createUser.mutate(data);
  };

  return <UserForm onSubmit={handleSubmit} loading={createUser.isPending} />;
}
```

#### `useUpdateUser(options?)`

Updates an existing user.

**Example:**
```typescript
function EditUserForm({ userId }: { userId: string }) {
  const updateUser = useUpdateUser({
    onSuccess: () => toast.success('User updated')
  });

  const handleSubmit = (payload: UpdateUserPayload) => {
    updateUser.mutate({ id: userId, payload });
  };

  return <UserForm onSubmit={handleSubmit} />;
}
```

#### `useDeleteUser(options?)`

Deletes a user.

**Example:**
```typescript
function DeleteUserButton({ userId }: { userId: string }) {
  const deleteUser = useDeleteUser({
    onSuccess: () => toast.success('User deleted')
  });

  return (
    <ConfirmButton
      onConfirm={() => deleteUser.mutate(userId)}
      loading={deleteUser.isPending}
    >
      Delete User
    </ConfirmButton>
  );
}
```

---

## Common Query Helpers

### `usePrefetch()`

Prefetch queries on demand.

**Example:**
```typescript
function UserLink({ userId }: { userId: string }) {
  const { prefetch } = usePrefetch();

  const handleMouseEnter = () => {
    prefetch(
      queryKeys.users.detail(userId),
      () => fetchUserById(userId),
      { staleTime: 5 * 60 * 1000 }
    );
  };

  return <Link onMouseEnter={handleMouseEnter}>View User</Link>;
}
```

### `useInvalidateQueries()`

Invalidate queries programmatically.

**Example:**
```typescript
function RefreshButton() {
  const { invalidateAll, invalidateByKey } = useInvalidateQueries();

  return (
    <>
      <button onClick={invalidateAll}>Refresh All</button>
      <button onClick={() => invalidateByKey(queryKeys.users.all)}>
        Refresh Users
      </button>
    </>
  );
}
```

### `useOptimisticUpdate<T>()`

Manage optimistic updates.

**Example:**
```typescript
function LikeButton({ postId }: { postId: string }) {
  const { update } = useOptimisticUpdate<Post>();

  const handleLike = async () => {
    await update(
      queryKeys.posts.detail(postId),
      (old) => ({ ...old, likes: old.likes + 1 }),
      () => likePost(postId),
      {
        onError: (error, previousData) => {
          // Rollback handled automatically
          toast.error('Failed to like post');
        }
      }
    );
  };

  return <button onClick={handleLike}>Like</button>;
}
```

### Utility Functions

#### `mergePaginatedData<T>(existing?: T[], incoming: T[]): T[]`

Merges paginated data by ID.

#### `calculateRetryDelay(attemptIndex: number): number`

Calculates exponential backoff retry delay.

#### `isQueryStale(state: QueryState, staleTime: number): boolean`

Checks if query data is stale.

#### `createQueryKeyFactory<T>(scope: string)`

Creates typed query key factory.

**Example:**
```typescript
const productKeys = createQueryKeyFactory<{ category: string }>('products');

productKeys.all;              // ['products']
productKeys.list({ category: 'electronics' }); // ['products', 'list', { category: 'electronics' }]
productKeys.detail('123');    // ['products', 'detail', '123']
```

---

# Layouts Module

Advanced layout systems for adaptive and context-aware React applications.

## Module Overview

The Layouts module provides two complementary systems:

1. **Adaptive Layouts** - Content-aware layout computation with FLIP animations
2. **Context-Aware Layouts** - DOM ancestry tracking and viewport-relative positioning

---

## Adaptive Layout System

### Core Concepts

- **Layout Modes**: Automatic switching between grid, list, and stack layouts
- **FLIP Transitions**: Smooth morphing between layout states
- **Constraint Solving**: Declarative layout constraints with priority-based solving
- **CLS Prevention**: Cumulative Layout Shift mitigation strategies

### Layout Engine

#### `LayoutEngine`

Core layout computation engine.

```typescript
const engine = createLayoutEngine({
  performanceTarget: 'balanced',
  enableGPUAcceleration: true,
  clsGuardEnabled: true
});

const result = engine.computeLayout({
  mode: 'grid',
  items: items,
  containerDimensions: { width: 1200, height: 800 },
  contentAnalysis: { dominantAspectRatio: 1.5 }
});
```

**Singleton Access:**
```typescript
const engine = getSharedLayoutEngine();
engine.updateConfig({ performanceTarget: 'performance' });
```

### Components

#### `<AdaptiveLayout>`

Main adaptive layout component with automatic mode switching.

**Props:**
```typescript
interface AdaptiveLayoutProps {
  children: ReactNode;
  mode?: 'auto' | 'grid' | 'list' | 'stack';
  contentDensity?: 'compact' | 'comfortable' | 'spacious';
  enableMorph?: boolean;
  clsGuard?: boolean;
  containerQuery?: boolean;
  breakpoints?: ContainerBreakpoints;
  onLayoutChange?: (mode: LayoutMode) => void;
}
```

**Example:**
```typescript
<AdaptiveLayout
  mode="auto"
  contentDensity="comfortable"
  enableMorph={true}
  clsGuard={true}
  onLayoutChange={(mode) => console.log('Layout changed to:', mode)}
>
  {items.map(item => (
    <Card key={item.id}>{item.content}</Card>
  ))}
</AdaptiveLayout>
```

#### `<AdaptiveGrid>`

Adaptive grid layout with responsive columns.

**Example:**
```typescript
<AdaptiveGrid
  minItemWidth={250}
  gap={16}
  autoFlow="dense"
  contentDensity="comfortable"
>
  {items.map(item => <GridItem key={item.id} {...item} />)}
</AdaptiveGrid>
```

#### `<AdaptiveStack>`, `<HStack>`, `<VStack>`

Flex-based stack layouts.

**Example:**
```typescript
<VStack spacing={16} align="start">
  <Header />
  <Content />
  <Footer />
</VStack>

<HStack spacing={8} justify="space-between">
  <Logo />
  <Navigation />
  <UserMenu />
</HStack>

<ResponsiveStack
  direction={{ base: 'column', md: 'row' }}
  spacing={{ base: 8, md: 16 }}
>
  <Sidebar />
  <MainContent />
</ResponsiveStack>
```

#### `<MorphTransition>`

FLIP-based morph transitions between states.

**Example:**
```typescript
<MorphTransition
  morphKey={viewMode}
  duration={300}
  easing="ease-out"
  onComplete={() => console.log('Transition complete')}
>
  {viewMode === 'grid' ? <GridView /> : <ListView />}
</MorphTransition>
```

### Hooks

#### `useAdaptiveLayout(options?)`

Main adaptive layout hook.

**Returns:**
```typescript
interface UseAdaptiveLayoutReturn {
  mode: LayoutMode;
  setMode: (mode: LayoutMode) => void;
  contentDensity: ContentDensity;
  setContentDensity: (density: ContentDensity) => void;
  containerDimensions: Dimensions;
  isTransitioning: boolean;
  performLayout: () => LayoutComputeResult;
}
```

**Example:**
```typescript
function AdaptiveGallery() {
  const {
    mode,
    setMode,
    contentDensity,
    containerDimensions
  } = useAdaptiveLayout({
    initialMode: 'grid',
    initialDensity: 'comfortable'
  });

  return (
    <div>
      <ModeToggle value={mode} onChange={setMode} />
      <DensitySlider value={contentDensity} onChange={setContentDensity} />
      <Gallery mode={mode} density={contentDensity} />
    </div>
  );
}
```

#### `useLayoutMode(options?)`

Simpler hook for layout mode management.

**Example:**
```typescript
function Gallery() {
  const { mode, setMode, isLayoutMode } = useLayoutMode('auto');

  return (
    <div>
      <button disabled={isLayoutMode('grid')} onClick={() => setMode('grid')}>
        Grid
      </button>
      <button disabled={isLayoutMode('list')} onClick={() => setMode('list')}>
        List
      </button>
    </div>
  );
}
```

#### `useLayoutMorph(options?)`

FLIP animation control hook.

**Example:**
```typescript
function AnimatedCard() {
  const { triggerMorph, isTransitioning } = useLayoutMorph({
    duration: 300,
    easing: 'ease-out'
  });

  const handleExpand = () => {
    setExpanded(true);
    triggerMorph();
  };

  return <Card expanded={expanded} onClick={handleExpand} />;
}
```

#### `useContentDensity(options?)`

Content density management.

**Example:**
```typescript
function DensityControl() {
  const {
    density,
    setDensity,
    spacing,
    fontSize
  } = useContentDensity('comfortable');

  return (
    <div style={{ fontSize, gap: spacing }}>
      <select value={density} onChange={e => setDensity(e.target.value)}>
        <option value="compact">Compact</option>
        <option value="comfortable">Comfortable</option>
        <option value="spacious">Spacious</option>
      </select>
    </div>
  );
}
```

#### `useCLSGuard(options?)`

Cumulative Layout Shift prevention.

**Example:**
```typescript
function ImageGallery() {
  const { reserveSpace, releaseSpace } = useCLSGuard({
    strategy: 'aspect-ratio'
  });

  const handleImageLoad = (img: HTMLImageElement) => {
    releaseSpace(img.id);
  };

  return images.map(img => (
    <img
      key={img.id}
      ref={el => el && reserveSpace(img.id, { width: img.width, height: img.height })}
      onLoad={() => handleImageLoad(img)}
    />
  ));
}
```

---

## Context-Aware Layout System

### Core Concepts

- **DOM Ancestry**: Track parent layout containers (flex, grid, positioned)
- **Viewport Awareness**: Monitor element visibility and position
- **Scroll Context**: Detect scroll containers and scroll state
- **Portal Bridging**: Maintain context across React portals
- **Z-Index Management**: Layered z-index system

### Architecture

```
┌──────────────────────────────────────────┐
│         Component Tree                    │
└─────────────┬────────────────────────────┘
              │
    ┌─────────┼─────────┐
    │         │         │
┌───▼───┐ ┌──▼───┐ ┌──▼────────┐
│  DOM  │ │Scroll│ │  Viewport │
│Context│ │Track.│ │  Tracker  │
└───┬───┘ └──┬───┘ └──┬────────┘
    │        │        │
    └────────┼────────┘
             │
      ┌──────▼──────┐
      │   Portal    │
      │   Manager   │
      └─────────────┘
```

### Components

#### `<DOMContextProvider>`

Provides DOM context to children.

**Example:**
```typescript
<DOMContextProvider
  trackAncestry={true}
  trackScroll={true}
  trackViewport={true}
>
  <App />
</DOMContextProvider>
```

#### `<ContextAwareBox>`

Layout box with full context awareness.

**Example:**
```typescript
<ContextAwareBox
  layout="flex"
  direction="column"
  align="center"
  gap={16}
  onContextReady={(context) => {
    console.log('Available width:', context.availableWidth);
    console.log('Is in viewport:', context.isInViewport);
  }}
>
  <Header />
  <Content />
</ContextAwareBox>
```

#### `<PortalBridge>`

Maintains context across portals.

**Example:**
```typescript
function Modal() {
  return (
    <PortalBridge container={document.body}>
      <ModalContent />
    </PortalBridge>
  );
}
```

#### `<ScrollAwareContainer>`

Scroll-aware container with edge detection.

**Example:**
```typescript
<ScrollAwareContainer
  onScrollEdge={(edge) => {
    if (edge === 'bottom') loadMore();
  }}
  onScrollDirection={(dir) => {
    if (dir === 'down') hideHeader();
    else showHeader();
  }}
>
  <LongContent />
</ScrollAwareContainer>
```

#### `<ViewportAnchor>`

Anchors content to viewport position.

**Example:**
```typescript
<ViewportAnchor
  position="top-right"
  offset={{ x: 16, y: 16 }}
  sticky={true}
>
  <FloatingActionButton />
</ViewportAnchor>
```

### Hooks

#### `useDOMContext()`

Access full DOM context.

**Example:**
```typescript
function ResponsiveComponent() {
  const context = useDOMContext();

  const { availableWidth, ancestors, isInViewport } = context;

  return (
    <div style={{ width: availableWidth < 600 ? '100%' : '50%' }}>
      {isInViewport && <ExpensiveContent />}
    </div>
  );
}
```

#### `useLayoutAncestry()`

Track layout ancestors.

**Example:**
```typescript
function FlexItem() {
  const { flexAncestor, gridAncestor, isInFlex } = useLayoutAncestry();

  if (isInFlex && flexAncestor) {
    // Adjust styling based on flex container properties
    const { direction, justifyContent } = flexAncestor.properties;
  }

  return <div>Content</div>;
}
```

#### `useViewportPosition()`

Monitor viewport position and visibility.

**Example:**
```typescript
function LazyImage({ src }: { src: string }) {
  const {
    isInViewport,
    isFullyVisible,
    intersectionRatio,
    distanceFromViewport
  } = useViewportPosition({
    threshold: [0, 0.5, 1],
    rootMargin: '200px'
  });

  return (
    <img
      src={isInViewport ? src : placeholder}
      style={{ opacity: intersectionRatio }}
    />
  );
}
```

#### `useScrollContext()`

Access scroll container context.

**Example:**
```typescript
function StickyHeader() {
  const {
    scrollContainer,
    scrollPosition,
    scrollDirection,
    isScrolling,
    isAtTop,
    isAtBottom
  } = useScrollContext();

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        boxShadow: isAtTop ? 'none' : '0 2px 4px rgba(0,0,0,0.1)'
      }}
    >
      Header {scrollDirection === 'down' ? '↓' : '↑'}
    </header>
  );
}
```

#### `usePortalContext()`

Access portal context information.

**Example:**
```typescript
function PortalContent() {
  const {
    isInPortal,
    sourceContext,
    portalDepth
  } = usePortalContext();

  if (isInPortal) {
    // Use source context for styling
    const theme = sourceContext.theme;
  }

  return <div>Portal Content (depth: {portalDepth})</div>;
}
```

---

# Performance Module

Comprehensive performance monitoring and optimization system.

## Module Overview

The Performance module provides:

1. **Web Vitals Monitoring** - LCP, INP, CLS, FCP, TTFB
2. **Performance Observatory** - Real-time dashboard
3. **Performance Budgets** - Configurable limits with auto-degradation
4. **Render Tracking** - Component render time analysis
5. **Network Performance** - Connection quality and adaptive loading
6. **Predictive Prefetch** - AI-driven navigation prediction
7. **Advanced Optimizations** - Memory, bundle, idle scheduling

## Core Web Vitals Targets

```
┌─────────────────────────────────────────────┐
│ Metric │ Target  │ Description              │
├────────┼─────────┼──────────────────────────┤
│ LCP    │ <2500ms │ Largest Contentful Paint │
│ INP    │ <200ms  │ Interaction to Next Paint│
│ CLS    │ <0.1    │ Cumulative Layout Shift  │
│ FCP    │ <1800ms │ First Contentful Paint   │
│ TTFB   │ <800ms  │ Time to First Byte       │
└─────────────────────────────────────────────┘
```

---

## Quick Start

### Initialization

```typescript
import { initPerformanceMonitoring } from '@missionfabric-js/enzyme/performance';

const cleanup = await initPerformanceMonitoring({
  debug: import.meta.env.DEV,
  reportToAnalytics: import.meta.env.PROD,
  onVitalMetric: (metric) => {
    console.log(`${metric.name}: ${metric.value}`);
  },
  onBudgetViolation: (violation) => {
    console.warn('Budget exceeded:', violation);
  },
  onLongTask: (task) => {
    console.warn('Long task detected:', task);
  },
  onMemoryPressure: (level) => {
    console.warn('Memory pressure:', level);
  }
});

// Cleanup on app unmount
return cleanup;
```

---

## Web Vitals Collection

### `VitalsCollector`

Tracks Core Web Vitals metrics.

**Example:**
```typescript
import { getVitalsCollector, initVitals } from '@missionfabric-js/enzyme/performance';

// Initialize vitals collection
const cleanup = initVitals({
  debug: true,
  reportToAnalytics: true,
  onMetric: (metric) => {
    console.log(`${metric.name}: ${metric.value}ms (${metric.rating})`);
  }
});

// Access collector
const collector = getVitalsCollector();
const snapshot = collector.getSnapshot();

console.log('LCP:', snapshot.lcp);
console.log('INP:', snapshot.inp);
console.log('Overall Score:', calculateOverallScore(snapshot));
```

### Metrics Types

```typescript
type VitalMetricName = 'LCP' | 'FCP' | 'INP' | 'CLS' | 'TTFB';
type PerformanceRating = 'good' | 'needs-improvement' | 'poor';

interface VitalMetricEntry {
  name: VitalMetricName;
  value: number;
  rating: PerformanceRating;
  delta: number;
  navigationType: 'navigate' | 'reload' | 'back-forward' | 'prerender';
  timestamp: number;
}
```

### Utility Functions

```typescript
// Format metric value
formatMetricValue('LCP', 2543);
// => "2.54s"

// Get rating color
getRatingColor('good');
// => "#0cce6b"

// Calculate overall score
const score = calculateOverallScore(snapshot);
// => 87 (0-100)
```

---

## Performance Observatory

Real-time performance dashboard component.

### `<PerformanceObservatory>`

**Example:**
```typescript
import {
  PerformanceProvider,
  PerformanceObservatory
} from '@missionfabric-js/enzyme/performance';

function App() {
  return (
    <PerformanceProvider>
      <YourApp />
      {process.env.NODE_ENV === 'development' && (
        <PerformanceObservatory
          position="bottom-right"
          defaultOpen={false}
        />
      )}
    </PerformanceProvider>
  );
}
```

### Features

- **Live Web Vitals** - Real-time LCP, INP, CLS, FCP, TTFB
- **Long Tasks** - Detection and attribution
- **Memory Usage** - Heap size monitoring
- **Resource Stats** - Network performance
- **Frame Rate** - FPS monitoring
- **Network Quality** - Connection speed tier

---

## Performance Budgets

### `PerformanceBudgetManager`

Enforces performance budgets with auto-degradation.

**Example:**
```typescript
import { getBudgetManager } from '@missionfabric-js/enzyme/performance';

const manager = getBudgetManager({
  debug: true,
  onViolation: (violation) => {
    if (violation.severity === 'critical') {
      // Trigger degradation
      disableAnimations();
      reduceImageQuality();
    }
  }
});

// Set custom budgets
manager.setBudget('LCP', {
  good: 2000,
  poor: 3000,
  strategy: 'disable-animations'
});

// Check budget status
const status = manager.getBudgetStatus();
if (status.isViolating) {
  console.log('Budget violations:', status.violations);
}

// Get degradation state
const degraded = manager.getDegradationState();
if (degraded.isActive) {
  console.log('Active degradations:', degraded.strategies);
}
```

### Budget Configuration

```typescript
interface BudgetThreshold {
  good: number;
  poor: number;
  strategy: DegradationStrategy;
}

type DegradationStrategy =
  | 'disable-animations'
  | 'reduce-quality'
  | 'lazy-load'
  | 'remove-features';
```

---

## Performance Hooks

### Budget Hooks

#### `usePerformanceBudget(metricName?)`

Monitor budget status.

**Example:**
```typescript
function AdaptiveUI() {
  const { budget, isViolating, rating } = usePerformanceBudget('LCP');

  return (
    <div>
      <AnimatedHeader disabled={isViolating} />
      {rating === 'poor' && <LowPerformanceWarning />}
    </div>
  );
}
```

#### `useDegradedMode()`

Check if degraded mode is active.

**Example:**
```typescript
function Gallery() {
  const { isActive, strategies } = useDegradedMode();

  const showAnimations = !strategies.includes('disable-animations');
  const imageQuality = strategies.includes('reduce-quality') ? 'low' : 'high';

  return (
    <ImageGallery
      animate={showAnimations}
      quality={imageQuality}
    />
  );
}
```

### Render Hooks

#### `useRenderMetrics(componentName?)`

Track component render performance.

**Example:**
```typescript
function ExpensiveComponent() {
  const { renderCount, avgRenderTime, slowRenders } = useRenderMetrics('ExpensiveComponent');

  useEffect(() => {
    if (avgRenderTime > 16) {
      console.warn('Component is slow:', avgRenderTime);
    }
  }, [avgRenderTime]);

  return <div>Render #{renderCount}</div>;
}
```

#### `useWastedRenderDetector()`

Detect unnecessary re-renders.

**Example:**
```typescript
function OptimizedComponent({ data }) {
  const wastedRenders = useWastedRenderDetector(data);

  if (wastedRenders > 5) {
    console.warn('Too many wasted renders, consider memoization');
  }

  return <div>{data}</div>;
}
```

### Long Task Hooks

#### `useLongTaskDetector(options?)`

Detect long tasks blocking main thread.

**Example:**
```typescript
function TaskMonitor() {
  const { longTasks, totalBlockingTime, hasActiveLongTask } = useLongTaskDetector({
    threshold: 50,
    onLongTask: (task) => {
      console.warn('Long task detected:', task.duration);
    }
  });

  return (
    <div>
      {hasActiveLongTask && <BlockingWarning />}
      <p>Total Blocking Time: {totalBlockingTime}ms</p>
    </div>
  );
}
```

#### `useDeferredRender(priority?)`

Defer render to idle time.

**Example:**
```typescript
function HeavyComponent() {
  const isReady = useDeferredRender('low');

  if (!isReady) return <Skeleton />;

  return <ExpensiveChart />;
}
```

### Memory Hooks

#### `useMemoryPressure(options?)`

Monitor memory pressure.

**Example:**
```typescript
function MemoryAwareCache() {
  const {
    pressure,
    usage,
    limit,
    trend,
    shouldCleanup
  } = useMemoryPressure({
    threshold: 0.8,
    onPressure: (level) => {
      if (level === 'critical') {
        clearCache();
      }
    }
  });

  return (
    <div>
      Memory: {usage} / {limit} ({pressure})
      {trend === 'increasing' && <MemoryWarning />}
    </div>
  );
}
```

#### `useMemoryCleanup(cleanupFn)`

Register cleanup for memory pressure.

**Example:**
```typescript
function CachedDataComponent() {
  useMemoryCleanup(() => {
    cache.clear();
    console.log('Cache cleared due to memory pressure');
  });

  return <DataView data={cache.getData()} />;
}
```

### Network Hooks

#### `useNetworkQuality()`

Monitor network connection quality.

**Example:**
```typescript
function AdaptiveContent() {
  const {
    quality,
    effectiveType,
    downlink,
    rtt,
    saveData
  } = useNetworkQuality();

  const imageQuality = quality === 'slow' ? 'low' : 'high';
  const enableVideo = quality !== 'slow' && !saveData;

  return (
    <div>
      <Image quality={imageQuality} />
      {enableVideo && <VideoBackground />}
      {saveData && <DataSaverBadge />}
    </div>
  );
}
```

#### `useAdaptiveImageQuality()`

Automatically adjust image quality based on network.

**Example:**
```typescript
function ResponsiveImage({ src }: { src: string }) {
  const quality = useAdaptiveImageQuality();

  const imageSrc = `${src}?quality=${quality}`;

  return <img src={imageSrc} />;
}
```

#### `useNetworkAwareLazyLoad()`

Lazy load based on network quality.

**Example:**
```typescript
function ImageGallery({ images }: { images: string[] }) {
  const shouldLazyLoad = useNetworkAwareLazyLoad();

  return (
    <div>
      {images.map((img, i) => (
        <img
          key={i}
          src={shouldLazyLoad && i > 3 ? placeholder : img}
          loading={shouldLazyLoad ? 'lazy' : 'eager'}
        />
      ))}
    </div>
  );
}
```

---

## Render Tracker

Track component render performance.

### `RenderTracker`

**Example:**
```typescript
import {
  getRenderTracker,
  trackRender,
  withRenderTracking
} from '@missionfabric-js/enzyme/performance';

// Manual tracking
function MyComponent() {
  useEffect(() => {
    trackRender('MyComponent', {
      phase: 'mount',
      duration: performance.now() - startTime
    });
  });

  return <div>Content</div>;
}

// HOC tracking
const TrackedComponent = withRenderTracking(MyComponent);

// Get stats
const tracker = getRenderTracker();
const stats = tracker.getComponentStats('MyComponent');
console.log('Avg render time:', stats.avgRenderTime);
console.log('Render count:', stats.renderCount);
console.log('Slow renders:', stats.slowRenders);
```

---

## Network Performance

### `NetworkPerformanceAnalyzer`

Analyzes network conditions and provides adaptive loading strategies.

**Example:**
```typescript
import {
  getNetworkAnalyzer,
  getNetworkQuality,
  isSlowConnection,
  getAdaptiveLoadingStrategy
} from '@missionfabric-js/enzyme/performance';

const analyzer = getNetworkAnalyzer({ autoMonitor: true });

// Get network quality
const quality = getNetworkQuality();
console.log('Effective type:', quality.effectiveType); // '4g'
console.log('Downlink:', quality.downlink); // 10 (Mbps)
console.log('RTT:', quality.rtt); // 50 (ms)

// Check for slow connection
if (isSlowConnection()) {
  // Reduce image quality
  // Disable auto-play videos
}

// Get adaptive strategy
const strategy = getAdaptiveLoadingStrategy();
// => { imageQuality: 'high', prefetch: true, lazyLoad: false }
```

---

## Predictive Prefetch

AI-driven navigation prediction and prefetching.

### `PredictivePrefetchEngine`

**Example:**
```typescript
import {
  getPredictivePrefetchEngine,
  usePredictivePrefetch
} from '@missionfabric-js/enzyme/performance';

// Initialize engine
const engine = getPredictivePrefetchEngine({
  debug: true,
  enableLearning: true
});

// Register routes
engine.registerRoute('/products', () => import('./pages/Products'));
engine.registerRoute('/checkout', () => import('./pages/Checkout'));

// Hook usage
function Navigation() {
  const { prefetchRoute, isPrefetched } = usePredictivePrefetch();

  return (
    <nav>
      <Link
        to="/products"
        onMouseEnter={() => prefetchRoute('/products')}
        data-prefetched={isPrefetched('/products')}
      >
        Products
      </Link>
    </nav>
  );
}
```

### `<PredictiveLink>`

Automatically prefetches on hover.

**Example:**
```typescript
import { PredictiveLink } from '@missionfabric-js/enzyme/performance';

<PredictiveLink
  to="/products"
  prefetchDelay={100}
  onPrefetchComplete={() => console.log('Prefetched!')}
>
  View Products
</PredictiveLink>
```

---

## Advanced Performance Features

### Lazy Loading System

#### `<LazyImage>`

Optimized lazy-loaded images.

**Example:**
```typescript
import { LazyImage } from '@missionfabric-js/enzyme/performance';

<LazyImage
  src="/image.jpg"
  placeholder="/placeholder.jpg"
  threshold={0.1}
  onLoad={() => console.log('Loaded')}
  priority="low"
/>
```

#### `createLazyComponent()`

Create lazy-loaded components.

**Example:**
```typescript
import { createLazyComponent } from '@missionfabric-js/enzyme/performance';

const LazyDashboard = createLazyComponent({
  loader: () => import('./Dashboard'),
  loading: <Spinner />,
  error: <ErrorFallback />,
  preload: {
    on: 'viewport',
    threshold: 0.5
  },
  strategy: 'network-aware'
});
```

### Render Scheduler

Intelligent task scheduling for optimal frame rate.

#### `useScheduledRender()`

**Example:**
```typescript
import { useScheduledRender } from '@missionfabric-js/enzyme/performance';

function HeavyComponent({ data }) {
  const shouldRender = useScheduledRender({
    priority: 'low',
    budget: 16 // ms per frame
  });

  if (!shouldRender) return <Skeleton />;

  return <ExpensiveVisualization data={data} />;
}
```

#### `scheduleWork()`

Schedule work in idle time.

**Example:**
```typescript
import { scheduleWork } from '@missionfabric-js/enzyme/performance';

const taskId = scheduleWork(
  () => {
    // Heavy computation
    processLargeDataset();
  },
  { priority: 'low' }
);

// Cancel if needed
cancelWork(taskId);
```

### Memory Guardian

Advanced memory management system.

#### `useMemoryGuard()`

**Example:**
```typescript
import { useMemoryGuard } from '@missionfabric-js/enzyme/performance';

function MemoryIntensiveComponent() {
  const guard = useMemoryGuard({
    budget: 50 * 1024 * 1024, // 50MB
    onExceed: () => {
      console.warn('Memory budget exceeded');
    }
  });

  useEffect(() => {
    const data = allocateLargeBuffer();
    guard.track('largeBuffer', data);

    return () => guard.release('largeBuffer');
  }, []);

  return <div>Current usage: {guard.currentUsage} bytes</div>;
}
```

### Bundle Optimizer

Runtime bundle optimization.

#### `useBundleOptimizer()`

**Example:**
```typescript
import { useBundleOptimizer } from '@missionfabric-js/enzyme/performance';

function App() {
  const { loadOptimalModule, deviceTier } = useBundleOptimizer();

  useEffect(() => {
    if (deviceTier === 'high') {
      loadOptimalModule('advanced-features');
    }
  }, [deviceTier]);

  return <div>Optimized for {deviceTier} tier device</div>;
}
```

### Critical CSS

Automatic critical CSS extraction and injection.

#### `useCriticalCSS()`

**Example:**
```typescript
import { useCriticalCSS } from '@missionfabric-js/enzyme/performance';

function App() {
  useCriticalCSS({
    enabled: true,
    viewport: { width: 1920, height: 1080 },
    onExtracted: (css) => {
      console.log('Critical CSS:', css.length, 'bytes');
    }
  });

  return <div>App Content</div>;
}
```

---

## Performance Monitoring

### Real User Monitoring (RUM)

Track real user performance metrics.

**Example:**
```typescript
import {
  initRUM,
  trackPageView,
  trackCustomEvent,
  getRUMSessionSummary
} from '@missionfabric-js/enzyme/performance';

// Initialize
initRUM({
  endpoint: '/api/rum',
  sampleRate: 0.1,
  trackErrors: true,
  trackPerformance: true
});

// Track page view
trackPageView('/dashboard', {
  referrer: document.referrer
});

// Track custom event
trackCustomEvent('checkout_completed', {
  revenue: 99.99,
  items: 3
});

// Get session summary
const summary = getRUMSessionSummary();
console.log('Session duration:', summary.duration);
console.log('Page views:', summary.pageViews);
console.log('Errors:', summary.errors);
```

### Regression Detection

Automatic performance regression detection.

**Example:**
```typescript
import {
  getRegressionDetector,
  recordPerformanceSample,
  analyzePerformanceTrend
} from '@missionfabric-js/enzyme/performance';

const detector = getRegressionDetector();

// Record samples
recordPerformanceSample('page-load', 1523);
recordPerformanceSample('page-load', 1687);

// Analyze trend
const trend = analyzePerformanceTrend('page-load');
if (trend.status === 'regression') {
  console.warn('Performance regression detected!');
  console.log('Degradation:', trend.degradation);
}
```

---

## Performance Configuration

### Global Configuration

```typescript
import { performanceConfig, getPerformanceConfig } from '@missionfabric-js/enzyme/performance';

// Access config
const config = getPerformanceConfig();

// Web Vitals thresholds
config.vitals.LCP.good; // 2500
config.vitals.INP.poor; // 500

// Bundle budgets
config.bundle.total; // 500KB
config.bundle.perChunk; // 100KB

// Memory limits
config.memory.warningThreshold; // 0.7 (70%)
config.memory.criticalThreshold; // 0.9 (90%)
```

### Budget Configuration

```typescript
import { VITAL_THRESHOLDS, RUNTIME_BUDGET } from '@missionfabric-js/enzyme/performance';

// Vital thresholds
VITAL_THRESHOLDS.LCP.good; // 2500ms
VITAL_THRESHOLDS.CLS.poor; // 0.25

// Runtime budgets
RUNTIME_BUDGET.maxLongTaskDuration; // 50ms
RUNTIME_BUDGET.maxMemoryUsage; // 100MB
```

---

## Performance Best Practices

### 1. Budget Configuration

```typescript
// Set aggressive budgets for critical pages
const budgetManager = getBudgetManager();
budgetManager.setBudget('LCP', {
  good: 1500,
  poor: 2500,
  strategy: 'disable-animations'
});
```

### 2. Adaptive Loading

```typescript
function AdaptiveComponent() {
  const { quality } = useNetworkQuality();
  const { pressure } = useMemoryPressure();

  // Adapt based on conditions
  if (pressure === 'critical' || quality === 'slow') {
    return <LightweightVersion />;
  }

  return <FullFeaturedVersion />;
}
```

### 3. Scheduled Rendering

```typescript
function ExpensiveList({ items }) {
  return (
    <div>
      {items.map((item, i) => (
        <ScheduledItem
          key={item.id}
          data={item}
          priority={i < 10 ? 'high' : 'low'}
        />
      ))}
    </div>
  );
}
```

### 4. Memory Management

```typescript
function CachedComponent() {
  const guard = useMemoryGuard({ budget: 10 * 1024 * 1024 });

  useMemoryCleanup(() => {
    cache.clear();
  });

  return <div>Content</div>;
}
```

---

## Data Flow Diagrams

### Performance Monitoring Flow

```
┌──────────────┐
│  Component   │
└──────┬───────┘
       │
       ▼
┌──────────────┐      ┌────────────────┐
│ Performance  │─────►│  Vitals        │
│ Hooks        │      │  Collector     │
└──────┬───────┘      └────────┬───────┘
       │                       │
       ▼                       ▼
┌──────────────┐      ┌────────────────┐
│   Budget     │      │   Analytics    │
│   Manager    │      │   Reporter     │
└──────┬───────┘      └────────────────┘
       │
       ▼
┌──────────────┐
│  Degradation │
│   Strategy   │
└──────────────┘
```

### Network-Aware Loading Flow

```
┌──────────────┐
│   Network    │
│   Analyzer   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Quality    │◄─── Connection API
│  Assessment  │     Navigator
└──────┬───────┘
       │
       ├──► Fast: Load HD images
       ├──► Medium: Load standard images
       └──► Slow: Load low-res images
```

---

## Summary

The @missionfabric-js/enzyme framework provides four comprehensive modules:

1. **Monitoring** - Error handling, boundaries, crash analytics
2. **Queries** - React Query integration with offline support
3. **Layouts** - Adaptive and context-aware layout systems
4. **Performance** - Web vitals, budgets, optimization tools

Each module is designed to work independently or together, providing a complete solution for building production-ready React applications with excellent UX, performance, and reliability.

---

**Documentation Version:** 1.0.0
**Last Updated:** 2025-11-28
**Framework Version:** 1.0.0

For more information, visit the project repository or contact the maintainers.
