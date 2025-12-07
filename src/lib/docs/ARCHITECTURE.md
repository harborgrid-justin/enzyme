# Architecture Guide

> **Scope**: This document covers the Harbor React Library's internal architecture and design patterns.
> For template-level architecture, see [Template Architecture](../../../docs/ARCHITECTURE.md).

## Table of Contents

- [System Overview](#system-overview)
- [Layer Architecture](#layer-architecture)
- [Module Dependencies](#module-dependencies)
- [Data Flow](#data-flow)
- [Provider Hierarchy](#provider-hierarchy)
- [State Architecture](#state-architecture)
- [Security Architecture](#security-architecture)
- [Performance Architecture](#performance-architecture)
- [Error Handling Architecture](#error-handling-architecture)

---

## System Overview

The Harbor React Library follows a layered architecture with clear separation of concerns:

```
+------------------------------------------------------------------+
|                        Application Layer                          |
|  (Pages, Features, Business Logic)                                |
+------------------------------------------------------------------+
                              |
+------------------------------------------------------------------+
|                       Integration Layer                           |
|  (Providers, Contexts, Hooks)                                     |
+------------------------------------------------------------------+
                              |
+------------------------------------------------------------------+
|                         Core Layer                                |
|  (Services, Managers, Utilities)                                  |
+------------------------------------------------------------------+
                              |
+------------------------------------------------------------------+
|                      Infrastructure Layer                         |
|  (HTTP Client, Storage, Monitoring)                               |
+------------------------------------------------------------------+
```

### Design Principles

1. **Dependency Inversion**: High-level modules depend on abstractions
2. **Single Responsibility**: Each module has one reason to change
3. **Open/Closed**: Open for extension, closed for modification
4. **Interface Segregation**: Specific interfaces over general ones
5. **Composition over Inheritance**: Hooks and HOCs for reuse

---

## Layer Architecture

### Infrastructure Layer

The foundation providing low-level capabilities:

```
infrastructure/
+-- http/
|   +-- ApiClient           # Base HTTP client with interceptors
|   +-- RequestBuilder      # Fluent request construction
|   +-- ResponseHandler     # Response parsing and normalization
|
+-- storage/
|   +-- SecureStorage       # Encrypted localStorage/sessionStorage
|   +-- CacheManager        # In-memory caching with TTL
|
+-- monitoring/
|   +-- ErrorReporter       # Error tracking and reporting
|   +-- VitalsCollector     # Web Vitals collection
|   +-- PerformanceMonitor  # Runtime performance tracking
```

#### API Client Architecture

```typescript
// Request flow through interceptors
Request => [Auth]
->
[CSRF]
->
[Logging]
->
[Retry]
->
Response
|
v
  [Cache] < -[Transform] < -[Error Handler]
```

```typescript
// ApiClient configuration
interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  headers: Record<string, string>;
  interceptors: {
    request: RequestInterceptor[];
    response: ResponseInterceptor[];
    error: ErrorInterceptor[];
  };
  retry: {
    maxAttempts: number;
    backoff: 'linear' | 'exponential';
    retryableStatuses: number[];
  };
  deduplication: {
    enabled: boolean;
    ttl: number;
  };
}
```

### Core Layer

Business logic and domain services:

```
core/
+-- auth/
|   +-- AuthService         # Authentication operations
|   +-- TokenManager        # Token storage and refresh
|   +-- SessionManager      # Session lifecycle
|
+-- routing/
|   +-- RouteRegistry       # Runtime route management
|   +-- RouteScanner        # File-based route discovery
|   +-- ConflictDetector    # Route validation
|
+-- state/
|   +-- StoreFactory        # Zustand store creation
|   +-- SliceFactory        # State slice creation
|   +-- SelectorFactory     # Memoized selector creation
|
+-- performance/
|   +-- PrefetchEngine      # Predictive prefetching
|   +-- BudgetManager       # Performance budget enforcement
|   +-- HydrationScheduler  # Progressive hydration
```

### Integration Layer

React-specific bindings and context providers:

```
integration/
+-- providers/
|   +-- AuthProvider        # Authentication context
|   +-- SecurityProvider    # Security context
|   +-- FeatureFlagProvider # Feature flags context
|   +-- HydrationProvider   # Hydration control context
|
+-- hooks/
|   +-- useAuth             # Authentication state access
|   +-- useApiRequest       # Data fetching
|   +-- useFeatureFlag      # Feature flag checking
|   +-- usePerformance      # Performance monitoring
|
+-- guards/
|   +-- RequireAuth         # Authentication guard
|   +-- RequireRole         # Role-based guard
|   +-- RequirePermission   # Permission-based guard
```

### Application Layer

Feature modules and pages:

```
application/
+-- features/
|   +-- FeatureRegistry     # Feature registration
|   +-- FeatureFactory      # Feature page creation
|   +-- FeatureDI           # Dependency injection
|
+-- pages/
|   +-- createFeaturePage   # Page factory
|   +-- SharedComponents    # Reusable UI patterns
```

---

## Module Dependencies

### Dependency Graph

```
                    +------------+
                    |   system   |
                    +------------+
                          |
          +---------------+---------------+
          |               |               |
    +-----v-----+   +-----v-----+   +-----v-----+
    |  security |   |   auth    |   |   api     |
    +-----------+   +-----------+   +-----------+
          |               |               |
          +-------+-------+-------+-------+
                  |               |
            +-----v-----+   +-----v-----+
            |  routing  |   |   state   |
            +-----------+   +-----------+
                  |               |
            +-----v-----+   +-----v-----+
            |  feature  |   |   flags   |
            +-----------+   +-----------+
                  |               |
            +-----v-----+   +-----v-----+
            |performance|   | hydration |
            +-----------+   +-----------+
                  |               |
            +-----v-----+   +-----v-----+
            |    ui     |   |   hooks   |
            +-----------+   +-----------+
                  |               |
                  +-------+-------+
                          |
                    +-----v-----+
                    |   utils   |
                    +-----------+
```

### Import Rules

```typescript
// ALLOWED: Lower layers import from utils
import { debounce } from '@/lib/utils';

// ALLOWED: Same-layer imports
import { useAuth } from './useAuth';

// ALLOWED: Higher layers import from lower
import { apiClient } from '@/lib/api';

// FORBIDDEN: Lower layers importing from higher
// import { useAuth } from '@/lib/auth'; // Don't do this in utils!
```

---

## Data Flow

### Unidirectional Data Flow

```
                    +-------------------+
                    |   User Action     |
                    +-------------------+
                            |
                            v
                    +-------------------+
                    |   Event Handler   |
                    +-------------------+
                            |
            +---------------+---------------+
            |                               |
            v                               v
    +---------------+               +---------------+
    |   API Call    |               | State Update  |
    +---------------+               +---------------+
            |                               |
            v                               v
    +---------------+               +---------------+
    |   Response    |               |   Selector    |
    +---------------+               +---------------+
            |                               |
            +---------------+---------------+
                            |
                            v
                    +-------------------+
                    |   UI Re-render    |
                    +-------------------+
```

### React Query Data Flow

```typescript
// 1. Component requests data
const { data } = useApiRequest({
  url: '/api/users',
  queryKey: ['users'],
});

// 2. React Query checks cache
// 3. If stale/missing, API call is made
// 4. Response is cached and returned
// 5. Component re-renders with data

// Mutation flow
const mutation = useApiMutation({
  url: '/api/users',
  method: 'POST',
  onSuccess: () => {
    queryClient.invalidateQueries(['users']);
  },
});

// 1. mutation.mutate(data) called
// 2. Optimistic update applied (if configured)
// 3. API call made
// 4. On success: cache invalidated, queries refetch
// 5. On error: rollback optimistic update
```

### State Management Flow

```typescript
// Zustand store flow
const useStore = createAppStore({
  slices: {
    user: userSlice,
    ui: uiSlice,
  },
});

// 1. Component subscribes to state
const user = useStore((state) => state.user.current);

// 2. Action dispatched
useStore.getState().user.setUser(newUser);

// 3. State updated immutably
// 4. Subscribed components re-render
```

---

## Provider Hierarchy

### Recommended Provider Order

```tsx
function App() {
  return (
    // 1. Security (CSP, CSRF) - outermost
    <SecurityProvider>
      {/* 2. Error Boundary - catches all errors */}
      <GlobalErrorBoundary>
        {/* 3. Query Client - data fetching */}
        <QueryClientProvider client={queryClient}>
          {/* 4. Auth - user state */}
          <AuthProvider>
            {/* 5. Feature Flags - conditional features */}
            <FeatureFlagProvider>
              {/* 6. Hydration - progressive rendering */}
              <HydrationProvider>
                {/* 7. Theme - styling */}
                <ThemeProvider>
                  {/* 8. Router - navigation */}
                  <RouterProvider router={router} />
                </ThemeProvider>
              </HydrationProvider>
            </FeatureFlagProvider>
          </AuthProvider>
        </QueryClientProvider>
      </GlobalErrorBoundary>
    </SecurityProvider>
  );
}
```

### Provider Responsibilities

| Provider              | Responsibility                          |
|-----------------------|-----------------------------------------|
| `SecurityProvider`    | CSP nonces, CSRF tokens, secure storage |
| `GlobalErrorBoundary` | Top-level error catching and reporting  |
| `QueryClientProvider` | React Query cache and configuration     |
| `AuthProvider`        | User state, tokens, auth methods        |
| `FeatureFlagProvider` | Feature flag evaluation                 |
| `HydrationProvider`   | Progressive hydration scheduling        |
| `ThemeProvider`       | Theme tokens and mode switching         |
| `RouterProvider`      | Route matching and navigation           |

---

## State Architecture

### Three-Tier State Model

```
+-------------------+     +-------------------+     +-------------------+
|    Server State   |     |   Global State    |     |   Local State     |
|   (React Query)   |     |    (Zustand)      |     |   (useState)      |
+-------------------+     +-------------------+     +-------------------+
        |                         |                         |
        v                         v                         v
+-------------------+     +-------------------+     +-------------------+
| - API responses   |     | - User session    |     | - Form inputs     |
| - Entity data     |     | - UI preferences  |     | - Modal state     |
| - List data       |     | - App settings    |     | - Hover/focus     |
| - Pagination      |     | - Navigation      |     | - Animations      |
+-------------------+     +-------------------+     +-------------------+
```

### State Categories

```typescript
// 1. Server State - React Query
const { data: users } = useQuery({
  queryKey: ['users'],
  queryFn: () => api.get('/users'),
});

// 2. Global UI State - Zustand
const useUIStore = createSlice({
  name: 'ui',
  state: {
    sidebarOpen: true,
    theme: 'light',
    notifications: [],
  },
  actions: (set) => ({
    toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    setTheme: (theme) => set({ theme }),
  }),
});

// 3. Local Component State - useState
function Modal() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  // ...
}

// 4. URL State - Router
const [searchParams, setSearchParams] = useSearchParams();
const page = searchParams.get('page') || '1';

// 5. Form State - React Hook Form / useState
const { register, handleSubmit } = useForm<FormData>();
```

### Store Structure

```typescript
// Recommended store structure
interface AppState {
  // User/Auth slice
  user: {
    current: User | null;
    preferences: UserPreferences;
    setUser: (user: User) => void;
    clearUser: () => void;
  };

  // UI slice
  ui: {
    sidebarOpen: boolean;
    modals: Record<string, boolean>;
    toggleSidebar: () => void;
    openModal: (id: string) => void;
    closeModal: (id: string) => void;
  };

  // Settings slice
  settings: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    setTheme: (theme: string) => void;
    setLanguage: (lang: string) => void;
  };
}
```

---

## Security Architecture

### Defense in Depth

```
+------------------------------------------------------------------+
|                      Browser Security                             |
|  CSP | CORS | SameSite Cookies | Secure Headers                  |
+------------------------------------------------------------------+
                              |
+------------------------------------------------------------------+
|                    Application Security                           |
|  CSRF Protection | XSS Prevention | Input Validation             |
+------------------------------------------------------------------+
                              |
+------------------------------------------------------------------+
|                      Data Security                                |
|  Encrypted Storage | Token Management | Secure Transmission      |
+------------------------------------------------------------------+
                              |
+------------------------------------------------------------------+
|                    Authentication/Authorization                   |
|  JWT Validation | Role Checks | Permission Guards                |
+------------------------------------------------------------------+
```

### Security Flow

```typescript
// 1. CSP Nonces for inline scripts/styles
<script nonce={nonce}>{/* ... */}</script>

// 2. CSRF Token in forms and API calls
const { formInputProps } = useCSRFToken();
<input type="hidden" {...formInputProps} />

// 3. XSS Prevention in user content
const safeContent = sanitizeHTML(userContent);
<div dangerouslySetInnerHTML={{ __html: safeContent }} />

// 4. Secure token storage
const storage = useSecureStorage();
await storage.set('sensitiveData', data);

// 5. Auth header injection
apiClient.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${getToken()}`;
  return config;
});
```

---

## Performance Architecture

### Performance Monitoring Stack

```
+-------------------+
|  Web Vitals       |  LCP, INP, CLS, FCP, TTFB
+-------------------+
        |
+-------------------+
|  Long Tasks       |  >50ms JavaScript tasks
+-------------------+
        |
+-------------------+
|  Memory Pressure  |  Heap usage monitoring
+-------------------+
        |
+-------------------+
|  Network Quality  |  Connection type, bandwidth
+-------------------+
        |
+-------------------+
|  Render Tracking  |  Component render times
+-------------------+
```

### Optimization Strategies

```typescript
// 1. Predictive Prefetching
const PredictiveLink = ({ to, children }) => {
  const prefetch = usePredictivePrefetch();

  return (
    <Link
      to={to}
      onMouseEnter={() => prefetch(to)}
      onFocus={() => prefetch(to)}
    >
      {children}
    </Link>
  );
};

// 2. Progressive Hydration
<HydrationBoundary priority="critical" trigger="immediate">
  <HeroSection />
</HydrationBoundary>

<HydrationBoundary priority="low" trigger="visible">
  <BelowFoldContent />
</HydrationBoundary>

// 3. Performance Budgets
const { isWithinBudget, currentUsage } = usePerformanceBudget({
  js: { max: 300 * 1024 },      // 300KB JS
  firstPaint: { max: 1500 },     // 1.5s FCP
  interactive: { max: 3500 },    // 3.5s TTI
});

// 4. Adaptive Loading
const { quality } = useNetworkQuality();
const imageQuality = quality === '4g' ? 'high' : 'low';
```

---

## Error Handling Architecture

### Error Boundary Hierarchy

```
+---------------------------------------------------------------+
|                    GlobalErrorBoundary                        |
|  Catches: Fatal errors, unhandled exceptions                  |
|  Recovery: Full page error, reload option                     |
+---------------------------------------------------------------+
                              |
+---------------------------------------------------------------+
|                    FeatureErrorBoundary                       |
|  Catches: Feature-level errors                                |
|  Recovery: Feature fallback, retry option                     |
+---------------------------------------------------------------+
                              |
+---------------------------------------------------------------+
|                   ComponentErrorBoundary                      |
|  Catches: Component-level errors                              |
|  Recovery: Component fallback, continue using app             |
+---------------------------------------------------------------+
                              |
+---------------------------------------------------------------+
|                    QueryErrorBoundary                         |
|  Catches: Data fetching errors                                |
|  Recovery: Retry button, stale data display                   |
+---------------------------------------------------------------+
```

### Error Flow

```typescript
// 1. Error occurs in component
throw new Error('Something went wrong');

// 2. Nearest error boundary catches it
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    // 3. Report to error tracking
    ErrorReporter.reportError(error, {
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      // 4. Render fallback UI
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// 5. User can retry or navigate away
```

### Error Categories

```typescript
enum ErrorCategory {
  NETWORK = 'network',      // API/fetch errors
  VALIDATION = 'validation', // Form/input errors
  AUTHENTICATION = 'auth',   // Auth failures
  AUTHORIZATION = 'authz',   // Permission errors
  RUNTIME = 'runtime',       // JavaScript errors
  RESOURCE = 'resource',     // Asset loading errors
}

// Error handling by category
function handleError(error: AppError) {
  switch (error.category) {
    case ErrorCategory.NETWORK:
      // Retry with backoff
      break;
    case ErrorCategory.AUTHENTICATION:
      // Redirect to login
      break;
    case ErrorCategory.AUTHORIZATION:
      // Show permission denied
      break;
    case ErrorCategory.VALIDATION:
      // Show field errors
      break;
    default:
      // Report and show generic error
      break;
  }
}
```

---

## Summary

The Harbor React Library architecture provides:

1. **Clear Separation**: Each layer has defined responsibilities
2. **Type Safety**: Full TypeScript coverage throughout
3. **Scalability**: Feature modules can be added independently
4. **Security**: Defense in depth at every layer
5. **Performance**: Built-in monitoring and optimization
6. **Reliability**: Comprehensive error handling hierarchy

For implementation details, see the specific module documentation.

---

## See Also

- [Documentation Index](./INDEX.md) - All documentation resources
- [API Reference](./API.md) - Complete API documentation
- [Configuration Guide](./CONFIGURATION.md) - System configuration
- [Performance Guide](./PERFORMANCE.md) - Performance optimization
