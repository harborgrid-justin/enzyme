# Harbor React Library

> Enterprise-grade React infrastructure library providing authentication, routing, state management, performance monitoring, and security features.

## Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
- [Architecture Overview](#architecture-overview)
- [Module Map](#module-map)
- [Feature Configuration](#feature-configuration)
- [Common Patterns](#common-patterns)
- [Documentation](#documentation)

---

## Quick Start

```tsx
// 1. Initialize the system in your app entry point
import { initializeSystem, defaultSystemConfig } from '@/lib/system';
import { AuthProvider } from '@/lib/auth';
import { FeatureFlagProvider } from '@/lib/flags';
import { SecurityProvider } from '@/lib/security';
import { HydrationProvider } from '@/lib/hydration';
import { createRouter } from '@/lib/routing';

// Initialize system monitoring and error tracking
initializeSystem(defaultSystemConfig);

// 2. Create your router
const router = createRouter({
  routes: yourRoutes,
  defaultMeta: { requireAuth: true },
});

// 3. Wrap your app with providers
function App() {
  return (
    <SecurityProvider>
      <AuthProvider>
        <FeatureFlagProvider flags={flagConfig}>
          <HydrationProvider>
            <RouterProvider router={router} />
          </HydrationProvider>
        </FeatureFlagProvider>
      </AuthProvider>
    </SecurityProvider>
  );
}
```

### Making Authenticated API Calls

```tsx
import { useApiRequest, useApiMutation } from '@/lib/api';

function UserProfile() {
  // Fetch data with automatic caching and error handling
  const { data: user, isLoading } = useApiRequest<User>({
    url: '/api/users/me',
    queryKey: ['users', 'me'],
  });

  // Mutation with optimistic updates
  const updateUser = useApiMutation<User, UpdateUserDto>({
    url: '/api/users/me',
    method: 'PATCH',
    invalidateKeys: [['users', 'me']],
  });

  if (isLoading) return <Skeleton />;

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      updateUser.mutate(formData);
    }}>
      {/* Form fields */}
    </form>
  );
}
```

### Protecting Routes with RBAC

```tsx
import { RequireAuth, RequireRole, RequirePermission } from '@/lib/auth';

// Basic authentication guard
<RequireAuth>
  <ProtectedContent />
</RequireAuth>

// Role-based access
<RequireRole roles={['admin', 'manager']}>
  <AdminDashboard />
</RequireRole>

// Permission-based access
<RequirePermission permissions={['users:write', 'users:delete']}>
  <UserManagement />
</RequirePermission>
```

### Using Feature Flags

```tsx
import { useFeatureFlag, FlagGate } from '@/lib/flags';

function Dashboard() {
  // Hook-based approach
  const isNewDashboardEnabled = useFeatureFlag('new-dashboard');

  // Component-based approach
  return (
    <FlagGate flag="analytics-v2" fallback={<LegacyAnalytics />}>
      <NewAnalytics />
    </FlagGate>
  );
}
```

---

## Installation

The library is included as part of the Harbor React template. All modules are available via the `@/lib` path alias.

```tsx
// Import specific modules for better tree-shaking
import { useAuth, AuthProvider } from '@/lib/auth';
import { createRouter, RouteRegistry } from '@/lib/routing';
import { useApiRequest, apiClient } from '@/lib/api';
import { useFeatureFlag } from '@/lib/flags';

// Or import from the barrel (convenient but less tree-shakeable)
import { useAuth, createRouter, useApiRequest } from '@/lib';
```

### Peer Dependencies

```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.20.0",
  "@tanstack/react-query": "^5.0.0",
  "zustand": "^4.4.0"
}
```

---

## Architecture Overview

```
lib/
+-- auth/           # Authentication & authorization
+-- api/            # HTTP client & React Query integration
+-- routing/        # Type-safe routing with auto-discovery
+-- flags/          # Feature flag system
+-- security/       # CSP, CSRF, XSS protection
+-- performance/    # Web Vitals, monitoring, prefetching
+-- hydration/      # Progressive hydration system
+-- state/          # Zustand-based state management
+-- feature/        # Feature module factory
+-- monitoring/     # Error boundaries & reporting
+-- hooks/          # Shared utility hooks
+-- ui/             # Base UI components
+-- theme/          # Theming system
+-- system/         # System initialization
+-- utils/          # Utility functions
```

### Design Principles

1. **Type Safety First**: Full TypeScript coverage with strict types
2. **Zero Runtime Overhead**: Tree-shakeable exports, lazy loading
3. **Framework Agnostic Core**: Business logic separated from React
4. **Progressive Enhancement**: Works without JS, enhances with it
5. **Security by Default**: CSRF, XSS, CSP protection built-in
6. **Observable Everything**: Comprehensive monitoring and telemetry

---

## Module Map

### Authentication (`@/lib/auth`)

| Export | Type | Description |
|--------|------|-------------|
| `AuthProvider` | Component | Context provider for auth state |
| `useAuth` | Hook | Access auth state and methods |
| `useHasRole` | Hook | Check if user has specific role |
| `useHasPermission` | Hook | Check if user has permission |
| `RequireAuth` | Component | Route guard requiring authentication |
| `RequireRole` | Component | Route guard requiring specific roles |
| `RequirePermission` | Component | Route guard requiring permissions |
| `authService` | Service | Auth operations (login, logout, refresh) |

### API (`@/lib/api`)

| Export | Type | Description |
|--------|------|-------------|
| `apiClient` | Instance | Pre-configured HTTP client |
| `createApiClient` | Factory | Create custom API client |
| `useApiRequest` | Hook | Fetch data with React Query |
| `useApiMutation` | Hook | Mutate data with React Query |
| `useApiHealth` | Hook | Monitor API health status |
| `RequestBuilder` | Class | Fluent request construction |
| `mockServer` | Instance | Development mock server |

### Routing (`@/lib/routing`)

| Export | Type | Description |
|--------|------|-------------|
| `createRouter` | Factory | Create type-safe router |
| `RouteRegistry` | Class | Runtime route management |
| `createRouteBuilder` | Factory | Type-safe route building |
| `useTypedNavigate` | Hook | Type-safe navigation |
| `usePrefetchHandlers` | Hook | Route prefetch on hover |
| `detectRouteConflicts` | Function | Validate route configuration |

### Feature Flags (`@/lib/flags`)

| Export | Type | Description |
|--------|------|-------------|
| `FeatureFlagProvider` | Component | Flag context provider |
| `useFeatureFlag` | Hook | Check single flag |
| `useFeatureFlags` | Hook | Check multiple flags |
| `FlagGate` | Component | Conditional rendering |
| `withFeatureFlag` | HOC | Feature-gated component |
| `flagKeys` | Object | Type-safe flag keys |

### Security (`@/lib/security`)

| Export | Type | Description |
|--------|------|-------------|
| `SecurityProvider` | Component | Security context provider |
| `useCSRFToken` | Hook | Get CSRF token for forms |
| `useSecureStorage` | Hook | Encrypted localStorage |
| `useSanitizedContent` | Hook | XSS-safe content |
| `CSPManager` | Class | Content Security Policy |
| `sanitizeHTML` | Function | HTML sanitization |

### Performance (`@/lib/performance`)

| Export | Type | Description |
|--------|------|-------------|
| `initPerformanceMonitoring` | Function | Initialize monitoring |
| `VitalsCollector` | Class | Web Vitals collection |
| `PerformanceObservatory` | Component | Performance dashboard |
| `usePredictivePrefetch` | Hook | AI-driven prefetching |
| `usePerformanceBudget` | Hook | Budget-aware rendering |
| `useMemoryPressure` | Hook | Memory monitoring |

### Hydration (`@/lib/hydration`)

| Export | Type | Description |
|--------|------|-------------|
| `HydrationProvider` | Component | Hydration scheduler |
| `HydrationBoundary` | Component | Priority-based hydration |
| `useHydration` | Hook | Hydration control |
| `useHydrationMetrics` | Hook | Hydration telemetry |

### State (`@/lib/state`)

| Export | Type | Description |
|--------|------|-------------|
| `createAppStore` | Factory | Create global store |
| `createSlice` | Factory | Create state slice |
| `createFeatureStore` | Factory | Feature-scoped store |
| `createSelector` | Factory | Memoized selectors |

---

## Feature Configuration

### Environment Variables

```bash
# .env
VITE_API_BASE_URL=https://api.example.com
VITE_AUTH_DOMAIN=auth.example.com
VITE_FEATURE_FLAGS_ENDPOINT=/api/flags
VITE_ERROR_REPORTING_DSN=https://sentry.io/...
VITE_ENABLE_DEBUG=false
```

### System Configuration

```tsx
import { initializeSystem } from '@/lib/system';

initializeSystem({
  environment: 'production',
  debug: false,
  logLevel: 'warn',
  errorReporting: {
    enabled: true,
    dsn: import.meta.env.VITE_ERROR_REPORTING_DSN,
    sampleRate: 0.1,
  },
  performance: {
    enabled: true,
    collectWebVitals: true,
    collectLongTasks: true,
  },
  memory: {
    enabled: true,
    moderateThreshold: 0.7,
    criticalThreshold: 0.9,
  },
});
```

### Feature Flags Configuration

```tsx
import { FeatureFlagProvider } from '@/lib/flags';

const flagConfig = {
  'new-dashboard': true,
  'analytics-v2': false,
  'dark-mode': true,
  'experimental-features': process.env.NODE_ENV === 'development',
};

<FeatureFlagProvider flags={flagConfig}>
  <App />
</FeatureFlagProvider>
```

---

## Common Patterns

### Pattern 1: Protected Feature Module

```tsx
import { createFeaturePage } from '@/lib/feature';
import { RequirePermission } from '@/lib/auth';
import { FlagGate } from '@/lib/flags';

const UsersFeature = createFeaturePage({
  id: 'users',
  metadata: {
    title: 'User Management',
    icon: 'users',
    category: 'admin',
  },
  access: {
    roles: ['admin', 'manager'],
    permissions: ['users:read'],
  },
});

// Usage with nested guards
function UserManagement() {
  return (
    <FlagGate flag="users-v2">
      <RequirePermission permissions={['users:write']}>
        <UsersFeature />
      </RequirePermission>
    </FlagGate>
  );
}
```

### Pattern 2: Optimistic Updates

```tsx
import { useApiMutation, createOptimisticUpdate } from '@/lib/api';

function TodoItem({ todo }) {
  const toggleTodo = useApiMutation({
    url: `/api/todos/${todo.id}`,
    method: 'PATCH',
    optimistic: createOptimisticUpdate({
      queryKey: ['todos'],
      update: (old, variables) =>
        old.map(t => t.id === todo.id ? { ...t, ...variables } : t),
    }),
  });

  return (
    <Checkbox
      checked={todo.completed}
      onChange={() => toggleTodo.mutate({ completed: !todo.completed })}
    />
  );
}
```

### Pattern 3: Performance-Aware Loading

```tsx
import { useNetworkQuality, useMemoryPressure } from '@/lib/performance';

function ImageGallery({ images }) {
  const { quality } = useNetworkQuality();
  const { level: memoryLevel } = useMemoryPressure();

  const imageQuality = useMemo(() => {
    if (memoryLevel === 'critical' || quality === 'slow-2g') return 'thumbnail';
    if (memoryLevel === 'warning' || quality === '2g') return 'low';
    if (quality === '3g') return 'medium';
    return 'high';
  }, [quality, memoryLevel]);

  return (
    <div className="gallery">
      {images.map(img => (
        <Image key={img.id} src={img[imageQuality]} alt={img.alt} />
      ))}
    </div>
  );
}
```

### Pattern 4: Secure Form Handling

```tsx
import { useCSRFToken, useSanitizedContent } from '@/lib/security';
import { useApiMutation } from '@/lib/api';

function CommentForm({ postId }) {
  const { formInputProps } = useCSRFToken();
  const [content, setContent] = useState('');
  const sanitize = useSanitizedContent();

  const submitComment = useApiMutation({
    url: `/api/posts/${postId}/comments`,
    method: 'POST',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    submitComment.mutate({
      content: sanitize(content),
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" {...formInputProps} />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <button type="submit">Submit</button>
    </form>
  );
}
```

---

## Documentation

**[Documentation Index](./docs/INDEX.md)** - Complete documentation hub with all resources.

### Core Documentation

| Document | Description |
|----------|-------------|
| [Architecture](./docs/ARCHITECTURE.md) | System architecture deep dive |
| [API Reference](./docs/API.md) | API handling patterns |
| [Configuration](./docs/CONFIGURATION.md) | Configuration management |
| [Migration](./docs/MIGRATION.md) | Version migration guide |

### Feature Guides

| Document | Description |
|----------|-------------|
| [Authentication](./docs/AUTHENTICATION.md) | Auth and SSO guide |
| [RBAC](./docs/RBAC.md) | Role-based access control |
| [Routing](./docs/ROUTING.md) | Complete routing guide |
| [Feature Flags](./docs/FEATURE-FLAGS.md) | Feature flag system |
| [Performance](./docs/PERFORMANCE.md) | Performance optimization |

### Examples

| Document | Description |
|----------|-------------|
| [Routing Examples](./docs/examples/routing-examples.md) | 25+ routing examples |
| [Auth Examples](./docs/examples/auth-examples.md) | 25+ authentication examples |
| [RBAC Examples](./docs/examples/rbac-examples.md) | 25+ RBAC examples |
| [Performance Examples](./docs/examples/performance-examples.md) | 25+ performance examples |

### Shared Utilities

| Document | Description |
|----------|-------------|
| [Shared Hook Utilities](./hooks/shared/README.md) | Reusable hook utilities |
| [Quick Reference](./hooks/shared/QUICK_REFERENCE.md) | Quick API lookup |
| [Migration Checklist](./hooks/shared/MIGRATION_CHECKLIST.md) | Migration guide |

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history.

---

## License

MIT License - see LICENSE file for details.
