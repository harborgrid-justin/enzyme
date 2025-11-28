# @defendr/enzyme - Complete API Documentation

> Enterprise React Framework with Advanced Routing, State Management, Performance Optimizations, and Plug-and-Play Architecture

**Version:** 1.0.0 | **License:** MIT | **Node:** >=20.0.0

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Module Reference](#module-reference)
   - [API Module](#api-module)
   - [Auth Module](#auth-module)
   - [Config Module](#config-module)
   - [Contexts Module](#contexts-module)
   - [Coordination Module](#coordination-module)
   - [Data Module](#data-module)
   - [Flags Module](#flags-module)
   - [Hydration Module](#hydration-module)
   - [Layouts Module](#layouts-module)
   - [Monitoring Module](#monitoring-module)
   - [Performance Module](#performance-module)
   - [Queries Module](#queries-module)
   - [Realtime Module](#realtime-module)
   - [Routing Module](#routing-module)
   - [Security Module](#security-module)
   - [Services Module](#services-module)
   - [Shared Module](#shared-module)
   - [State Module](#state-module)
   - [Streaming Module](#streaming-module)
   - [Theme Module](#theme-module)
   - [UI Module](#ui-module)
   - [Utils Module](#utils-module)
   - [UX Module](#ux-module)
   - [VDOM Module](#vdom-module)
   - [Core Module](#core-module)
   - [Feature Module](#feature-module)
   - [Hooks Module](#hooks-module)
   - [System Module](#system-module)
4. [Type Reference](#type-reference)
5. [Examples & Patterns](#examples--patterns)
6. [Migration Guide](#migration-guide)

---

## Quick Start

### Installation

```bash
npm install @defendr/enzyme
```

### Basic Setup

```tsx
import React from 'react';
import {
  // Core providers
  AuthProvider,
  RBACProvider,
  ThemeProvider,

  // Routing
  createRouter,

  // State
  useStore,

  // API
  useApiRequest,
} from '@defendr/enzyme';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RBACProvider>
          <Router />
        </RBACProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           @defendr/enzyme                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        PRESENTATION LAYER                             │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │  │
│  │  │   UI    │  │  Theme  │  │   UX    │  │ Layouts │  │Streaming│   │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         APPLICATION LAYER                             │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │  │
│  │  │ Routing │  │  Auth   │  │  Flags  │  │ Feature │  │  Hooks  │   │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                           DATA LAYER                                  │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │  │
│  │  │  State  │  │   API   │  │ Queries │  │  Data   │  │Realtime │   │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                       INFRASTRUCTURE LAYER                            │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │  │
│  │  │  Core   │  │Security │  │Services │  │Hydration│  │  VDOM   │   │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         FOUNDATION LAYER                              │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │  │
│  │  │ Config  │  │ Shared  │  │  Utils  │  │Monitoring│ │ System  │   │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Module Reference

---

## API Module

**Import:** `import { ... } from '@defendr/enzyme/api'`

Enterprise-grade HTTP client with retry logic, interceptors, request deduplication, and React Query integration.

### Core Classes

#### `ApiClient`

Type-safe HTTP client with automatic retry, interceptors, and request deduplication.

```typescript
import { ApiClient, createApiClient, apiClient } from '@defendr/enzyme/api';

// Use singleton
const users = await apiClient.get<User[]>('/users');

// Or create custom instance
const client = createApiClient({
  baseUrl: 'https://api.example.com',
  timeout: 30000,
  retry: { maxAttempts: 3, baseDelay: 1000 },
});
```

**Methods:**
| Method | Signature | Description |
|--------|-----------|-------------|
| `get` | `get<T>(url, config?): Promise<ApiResponse<T>>` | GET request |
| `post` | `post<T>(url, data?, config?): Promise<ApiResponse<T>>` | POST request |
| `put` | `put<T>(url, data?, config?): Promise<ApiResponse<T>>` | PUT request |
| `patch` | `patch<T>(url, data?, config?): Promise<ApiResponse<T>>` | PATCH request |
| `delete` | `delete<T>(url, config?): Promise<ApiResponse<T>>` | DELETE request |

#### `RequestBuilder`

Fluent API for constructing type-safe requests.

```typescript
import { get, post, RequestBuilder } from '@defendr/enzyme/api';

// Simple GET request
const config = get<User[]>('/users')
  .query({ page: 1, limit: 10 })
  .timeout(5000)
  .build();

// POST with body
const createConfig = post<User>('/users')
  .body({ name: 'John', email: 'john@example.com' })
  .header('X-Custom', 'value')
  .build();
```

### React Hooks

#### `useApiRequest`

```typescript
function useApiRequest<T>(options: UseApiRequestOptions<T>): UseApiRequestResult<T>
```

Fetch data with automatic caching, refetching, and error handling.

```typescript
import { useApiRequest } from '@defendr/enzyme/api';

function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading, error, refetch } = useApiRequest<User>({
    url: `/users/${userId}`,
    queryKey: ['users', userId],
    staleTime: 60000,
    onSuccess: (user) => console.log('Loaded:', user.name),
  });

  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  return <div>{data?.name}</div>;
}
```

#### `useApiMutation`

```typescript
function useApiMutation<TData, TVariables>(
  options: UseApiMutationOptions<TData, TVariables>
): UseApiMutationResult<TData, TVariables>
```

Perform mutations with optimistic updates.

```typescript
import { useApiMutation, createOptimisticAdd } from '@defendr/enzyme/api';

function CreateUser() {
  const mutation = useApiMutation<User, CreateUserDto>({
    url: '/users',
    method: 'POST',
    ...createOptimisticAdd(['users', 'list'], (body) => ({
      ...body,
      id: 'temp-id',
      createdAt: new Date().toISOString(),
    })),
  });

  return (
    <button
      onClick={() => mutation.mutate({ name: 'John' })}
      disabled={mutation.isPending}
    >
      Create User
    </button>
  );
}
```

#### Additional Hooks

| Hook | Description |
|------|-------------|
| `useGet<T>` | Simplified GET hook |
| `usePost<T>` | Simplified POST hook |
| `usePut<T>` | Simplified PUT hook |
| `usePatch<T>` | Simplified PATCH hook |
| `useDelete<T>` | Simplified DELETE hook |
| `usePolling` | Poll endpoint at intervals |
| `useLazyQuery` | Manual trigger queries |
| `useApiCache` | Cache management |
| `useApiHealth` | Monitor API health |

### Types

```typescript
interface ApiResponse<T> {
  data: T;
  status: number;
  headers: ResponseHeaders;
  timing: ResponseTiming;
  cached: boolean;
}

interface ApiError {
  message: string;
  code: string;
  status: number;
  category: ErrorCategory;
  severity: ErrorSeverity;
  retryable: boolean;
  details?: Record<string, unknown>;
}

type ErrorCategory =
  | 'network' | 'timeout' | 'auth' | 'validation'
  | 'not_found' | 'rate_limit' | 'server' | 'unknown';
```

---

## Auth Module

**Import:** `import { ... } from '@defendr/enzyme/auth'`

Comprehensive authentication with RBAC, Active Directory integration, and route protection.

### Core Authentication

#### `AuthProvider`

```typescript
import { AuthProvider, useAuth } from '@defendr/enzyme/auth';

function App() {
  return (
    <AuthProvider>
      <MyApp />
    </AuthProvider>
  );
}

function LoginButton() {
  const { login, logout, isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
    return (
      <div>
        Welcome, {user.name}
        <button onClick={logout}>Logout</button>
      </div>
    );
  }

  return (
    <button onClick={() => login({ email, password })}>
      Login
    </button>
  );
}
```

#### `useAuth` Hook

```typescript
interface UseAuthReturn {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  refreshToken: () => Promise<void>;

  // Utilities
  hasRole: (role: Role) => boolean;
  hasPermission: (permission: Permission) => boolean;
}
```

### RBAC (Role-Based Access Control)

#### `RBACProvider` & `useRBAC`

```typescript
import { RBACProvider, useRBAC } from '@defendr/enzyme/auth';

function App() {
  return (
    <RBACProvider>
      <SecureApp />
    </RBACProvider>
  );
}

function AdminPanel() {
  const {
    can,
    canAll,
    canAny,
    hasRole,
    hasAnyRole
  } = useRBAC();

  // Check single permission
  if (!can('manage', 'users')) {
    return <AccessDenied />;
  }

  // Check multiple permissions
  const canManageContent = canAll([
    ['create', 'posts'],
    ['edit', 'posts'],
    ['delete', 'posts'],
  ]);

  return (
    <div>
      {hasRole('admin') && <AdminTools />}
      {canManageContent && <ContentEditor />}
    </div>
  );
}
```

#### Permission Matrix Builder

```typescript
import {
  createPermissionMatrixBuilder,
  createStandardMatrix,
  CRUD_ACTIONS
} from '@defendr/enzyme/auth';

const matrix = createPermissionMatrixBuilder()
  .addRole('admin', { inherits: ['manager'] })
  .addRole('manager', { inherits: ['user'] })
  .addRole('user')
  .grant('admin', 'users', CRUD_ACTIONS)
  .grant('manager', 'reports', ['read', 'create'])
  .grant('user', 'profile', ['read', 'update'])
  .build();
```

### Active Directory Integration

```typescript
import { ADProvider, useActiveDirectory } from '@defendr/enzyme/auth';

function App() {
  return (
    <ADProvider config={{
      providerType: 'azure-ad',
      azure: {
        clientId: 'your-client-id',
        tenantId: 'your-tenant-id',
        redirectUri: window.location.origin,
      },
      sso: { enabled: true },
      groupMapping: {
        enabled: true,
        mappings: [
          { adGroup: 'IT-Admins', appRole: 'admin' },
          { adGroup: 'IT-Users', appRole: 'user' },
        ],
      },
    }}>
      <MyApp />
    </ADProvider>
  );
}

function ADLogin() {
  const { login, user, isAuthenticated } = useActiveDirectory();

  return (
    <button onClick={() => login()}>
      Sign in with Microsoft
    </button>
  );
}
```

---

## Routing Module

**Import:** `import { ... } from '@defendr/enzyme/routing'`

Type-safe file-based routing with auto-discovery, guards, and advanced patterns.

### Router Factory

```typescript
import { createRouter, createSimpleRouter } from '@defendr/enzyme/routing';

// Full-featured router
const router = createRouter({
  routes: [
    { path: '/', element: <Home /> },
    { path: '/users/:id', element: <UserProfile /> },
    { path: '/admin/*', element: <AdminLayout />, guards: [adminGuard] },
  ],
  defaultLoading: <Spinner />,
  defaultError: <ErrorPage />,
  defaultNotFound: <NotFound />,
});

// Simple router
const simpleRouter = createSimpleRouter([
  { path: '/', component: Home },
  { path: '/about', component: About },
]);
```

### Type-Safe Path Building

```typescript
import { buildPath, createRouteBuilder } from '@defendr/enzyme/routing';

// Compile-time type checking for route params
const userPath = buildPath('/users/:id', { id: '123' });
// Result: '/users/123'

// With query params
const searchPath = buildPath('/search', {}, { q: 'term', page: 1 });
// Result: '/search?q=term&page=1'

// Create typed builders
const routes = createRouteBuilders({
  home: '/',
  user: '/users/:id',
  userPosts: '/users/:userId/posts/:postId',
});

routes.user({ id: '123' }); // '/users/123'
routes.userPosts({ userId: '1', postId: '42' }); // '/users/1/posts/42'
```

### Route Guards

```typescript
import {
  createRoleGuard,
  createPermissionGuard,
  createFeatureGuard,
  createCompositeGuard,
  allGuards,
} from '@defendr/enzyme/routing';

// Role-based guard
const adminGuard = createRoleGuard({
  roles: ['admin', 'superadmin'],
  matchStrategy: 'any',
  redirectTo: '/unauthorized',
});

// Permission-based guard
const editorGuard = createPermissionGuard({
  permissions: [{ action: 'edit', resource: 'content' }],
});

// Feature flag guard
const betaGuard = createFeatureGuard({
  flags: ['beta-features'],
  fallbackPath: '/coming-soon',
});

// Combine guards
const protectedGuard = createCompositeGuard({
  guards: [adminGuard, betaGuard],
  strategy: 'all', // all guards must pass
});
```

### Auto-Discovery

```typescript
import {
  createAutoScanner,
  DiscoveryEngine
} from '@defendr/enzyme/routing';

// Scan routes from file system (build time)
const scanner = createAutoScanner({
  routesDir: './src/routes',
  extensions: ['.tsx', '.ts'],
  ignore: ['*.test.*', '*.spec.*'],
});

const routes = await scanner.scan();

// File naming conventions:
// src/routes/
//   index.tsx          → /
//   about.tsx          → /about
//   users/
//     index.tsx        → /users
//     [id].tsx         → /users/:id
//     [id]/posts.tsx   → /users/:id/posts
//   [[...slug]].tsx    → /*slug (catch-all)
```

### Navigation Hooks

```typescript
import {
  useRouteNavigate,
  useQueryParams,
  useRouteInfo,
} from '@defendr/enzyme/routing';

function MyComponent() {
  const navigate = useRouteNavigate();
  const [params, setParams] = useQueryParams();
  const { path, params: routeParams } = useRouteInfo();

  // Type-safe navigation
  navigate('/users/:id', { id: '123' });

  // Update query params
  setParams({ page: 2, sort: 'name' });

  return <div>Current path: {path}</div>;
}
```

---

## State Module

**Import:** `import { ... } from '@defendr/enzyme/state'`

Production-grade state management built on Zustand with Immer, DevTools, and multi-tab sync.

### Store Setup

```typescript
import {
  useStore,
  createAppStore,
  createSlice
} from '@defendr/enzyme/state';

// Define slices
const userSlice = createSlice({
  name: 'user',
  initialState: {
    currentUser: null as User | null,
    preferences: { theme: 'light', language: 'en' },
  },
  actions: (set, get) => ({
    setUser: (user: User) => set({ currentUser: user }),
    updatePreferences: (prefs: Partial<Preferences>) =>
      set((state) => ({
        preferences: { ...state.preferences, ...prefs },
      })),
    logout: () => set({ currentUser: null }),
  }),
});

// Create store
const store = createAppStore({
  slices: [userSlice],
  devtools: { enabled: true, name: 'MyApp' },
  persist: {
    enabled: true,
    key: 'app-state',
    whitelist: ['user.preferences'],
  },
});
```

### Using the Store

```typescript
import { useStore } from '@defendr/enzyme/state';

function UserProfile() {
  // Select state
  const user = useStore((state) => state.user.currentUser);
  const theme = useStore((state) => state.user.preferences.theme);

  // Get actions
  const { setUser, updatePreferences } = useStore((state) => state.user);

  return (
    <div>
      <p>Welcome, {user?.name}</p>
      <button onClick={() => updatePreferences({ theme: 'dark' })}>
        Toggle Theme
      </button>
    </div>
  );
}
```

### Selectors

```typescript
import {
  createSelector,
  createParameterizedSelector,
} from '@defendr/enzyme/state';

// Memoized selector
const selectUserName = createSelector(
  (state) => state.user.currentUser,
  (user) => user?.name ?? 'Guest'
);

// Parameterized selector
const selectUserById = createParameterizedSelector(
  (state) => state.users.list,
  (users, id: string) => users.find((u) => u.id === id)
);

// Usage
const userName = useStore(selectUserName);
const user = useStore((state) => selectUserById(state, '123'));
```

### Multi-Tab Sync

```typescript
import { createBroadcastSync, useBroadcastSync } from '@defendr/enzyme/state';

// Setup broadcast sync
const sync = createBroadcastSync({
  channelName: 'app-sync',
  syncKeys: ['user.preferences', 'notifications'],
  conflictStrategy: 'last-write-wins',
  throttleMs: 100,
});

// Use in components
function SyncedComponent() {
  const { isLeader, tabCount } = useBroadcastSync();

  return (
    <div>
      {isLeader && <span>Leader Tab</span>}
      <span>{tabCount} tabs open</span>
    </div>
  );
}
```

### Feature Stores

```typescript
import { createFeatureStore } from '@defendr/enzyme/state';

// Create isolated feature store
const cartStore = createFeatureStore({
  name: 'cart',
  initialState: {
    items: [] as CartItem[],
    total: 0,
  },
  actions: (set, get) => ({
    addItem: (item: CartItem) =>
      set((state) => {
        state.items.push(item);
        state.total = state.items.reduce((sum, i) => sum + i.price, 0);
      }),
    removeItem: (id: string) =>
      set((state) => {
        state.items = state.items.filter((i) => i.id !== id);
        state.total = state.items.reduce((sum, i) => sum + i.price, 0);
      }),
    clear: () => set({ items: [], total: 0 }),
  }),
});

// Use feature store
const { items, addItem } = cartStore.useStore();
```

---

## Data Module

**Import:** `import { ... } from '@defendr/enzyme/data'`

Data validation, normalization, synchronization, and integrity checking.

### Schema Validation

```typescript
import {
  createSchema,
  useDataValidation
} from '@defendr/enzyme/data';

// Define schema
const userSchema = createSchema({
  id: { type: 'string', required: true },
  email: { type: 'string', format: 'email', required: true },
  age: { type: 'number', min: 0, max: 150 },
  roles: { type: 'array', items: { type: 'string' } },
});

// Validate data
const result = userSchema.validate(data);
if (!result.valid) {
  console.error(result.errors);
}

// Use in React
function UserForm() {
  const { validate, errors, isValid } = useDataValidation(userSchema);

  const handleSubmit = (data: unknown) => {
    if (validate(data)) {
      // Submit valid data
    }
  };

  return (
    <form>
      {errors.email && <span>{errors.email}</span>}
    </form>
  );
}
```

### Data Normalization

```typescript
import {
  createNormalizer,
  useNormalizedData
} from '@defendr/enzyme/data';

// Define entities
const normalizer = createNormalizer({
  entities: {
    users: { idAttribute: 'id' },
    posts: {
      idAttribute: 'id',
      relations: {
        author: { entity: 'users', type: 'belongsTo' },
      },
    },
  },
});

// Normalize API response
const normalized = normalizer.normalize('posts', apiResponse);
// { entities: { users: {...}, posts: {...} }, result: [...] }

// Denormalize for display
const posts = normalizer.denormalize('posts', normalized);
```

### Data Sync

```typescript
import { createSyncEngine, useDataSync } from '@defendr/enzyme/data';

const syncEngine = createSyncEngine({
  sources: ['local', 'remote'],
  conflictResolution: 'server-wins',
  retryConfig: { maxAttempts: 3, backoff: 'exponential' },
});

function SyncedComponent() {
  const {
    sync,
    isSyncing,
    lastSyncTime,
    conflicts
  } = useDataSync(syncEngine);

  return (
    <div>
      <button onClick={sync} disabled={isSyncing}>
        Sync Now
      </button>
      {conflicts.length > 0 && <ConflictResolver conflicts={conflicts} />}
    </div>
  );
}
```

---

## Performance Module

**Import:** `import { ... } from '@defendr/enzyme/performance'`

Web Vitals collection, performance budgets, and optimization utilities.

### Web Vitals

```typescript
import {
  collectWebVitals,
  PerformanceObservatory
} from '@defendr/enzyme/performance';

// Collect Core Web Vitals
collectWebVitals({
  onLCP: (value) => console.log('LCP:', value),
  onINP: (value) => console.log('INP:', value),
  onCLS: (value) => console.log('CLS:', value),
  onFCP: (value) => console.log('FCP:', value),
  onTTFB: (value) => console.log('TTFB:', value),
});

// Real-time dashboard
function Dashboard() {
  return <PerformanceObservatory position="bottom-right" />;
}
```

### Performance Budgets

```typescript
import {
  usePerformanceBudget,
  useDegradedMode
} from '@defendr/enzyme/performance';

function HeavyComponent() {
  const { withinBudget, currentMetrics } = usePerformanceBudget({
    LCP: 2500,
    INP: 200,
    CLS: 0.1,
  });

  const isDegraded = useDegradedMode();

  if (isDegraded) {
    return <LightweightVersion />;
  }

  return <FullFeaturedVersion />;
}
```

### Performance Hooks

| Hook | Description |
|------|-------------|
| `useRenderMetrics` | Track component render times |
| `useWastedRenderDetector` | Detect unnecessary re-renders |
| `useLongTaskDetector` | Detect long-running tasks |
| `useDeferredRender` | Defer non-critical renders |
| `useMemoryPressure` | Monitor memory usage |
| `useNetworkQuality` | Adapt to network conditions |
| `useAdaptiveImageQuality` | Auto-adjust image quality |

```typescript
import {
  useRenderMetrics,
  useDeferredRender,
  useNetworkQuality
} from '@defendr/enzyme/performance';

function OptimizedComponent() {
  const { renderCount, avgRenderTime } = useRenderMetrics();
  const { shouldRender } = useDeferredRender({ priority: 'low' });
  const { effectiveType, downlink } = useNetworkQuality();

  if (!shouldRender) return null;

  return (
    <div>
      {effectiveType === '4g' ? <HDContent /> : <SDContent />}
    </div>
  );
}
```

---

## Security Module

**Import:** `import { ... } from '@defendr/enzyme/security'`

CSP management, XSS prevention, CSRF protection, and secure storage.

### Content Security Policy

```typescript
import {
  CSPManager,
  useCSPNonce
} from '@defendr/enzyme/security';

const cspManager = new CSPManager({
  directives: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'nonce-{nonce}'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https:'],
  },
  reportUri: '/csp-report',
});

function SecureScript() {
  const nonce = useCSPNonce();

  return (
    <script nonce={nonce}>
      {`console.log('Secure inline script')`}
    </script>
  );
}
```

### XSS Prevention

```typescript
import {
  sanitizeHtml,
  useSanitizedContent
} from '@defendr/enzyme/security';

// Sanitize HTML
const safeHtml = sanitizeHtml(userInput, {
  allowedTags: ['b', 'i', 'em', 'strong', 'a'],
  allowedAttributes: { a: ['href'] },
});

// React hook
function UserContent({ html }: { html: string }) {
  const { sanitized, threats } = useSanitizedContent(html);

  if (threats.length > 0) {
    console.warn('XSS threats detected:', threats);
  }

  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

### CSRF Protection

```typescript
import {
  useCSRFToken,
  CSRFTokenProvider
} from '@defendr/enzyme/security';

function App() {
  return (
    <CSRFTokenProvider>
      <Forms />
    </CSRFTokenProvider>
  );
}

function SecureForm() {
  const { token, refresh } = useCSRFToken();

  return (
    <form method="POST">
      <input type="hidden" name="_csrf" value={token} />
      {/* form fields */}
    </form>
  );
}
```

### Secure Storage

```typescript
import { useSecureStorage } from '@defendr/enzyme/security';

function SensitiveData() {
  const {
    setItem,
    getItem,
    removeItem
  } = useSecureStorage({
    encryptionKey: process.env.STORAGE_KEY,
    storage: 'local',
  });

  // Data is encrypted at rest
  await setItem('apiKey', sensitiveValue);
  const value = await getItem('apiKey');
}
```

---

## Monitoring Module

**Import:** `import { ... } from '@defendr/enzyme/monitoring'`

Error tracking, crash analytics, and error boundaries.

### Error Boundaries

```typescript
import {
  GlobalErrorBoundary,
  FeatureErrorBoundary,
  withErrorBoundary,
} from '@defendr/enzyme/monitoring';

// Global boundary
function App() {
  return (
    <GlobalErrorBoundary
      fallback={<CriticalError />}
      onError={(error) => reportToService(error)}
    >
      <MyApp />
    </GlobalErrorBoundary>
  );
}

// Feature-level boundary
function Dashboard() {
  return (
    <FeatureErrorBoundary
      featureName="dashboard"
      fallback={<DashboardError />}
    >
      <DashboardContent />
    </FeatureErrorBoundary>
  );
}

// HOC pattern
const SafeWidget = withErrorBoundary(Widget, {
  fallback: <WidgetError />,
  level: 'widget',
});
```

### Error Reporter

```typescript
import {
  errorReporter,
  configureErrorReporter
} from '@defendr/enzyme/monitoring';

// Configure
configureErrorReporter({
  service: 'sentry', // or 'datadog', 'custom'
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  sampleRate: 1.0,
  beforeSend: (event) => {
    // Sanitize PII
    return sanitizeEvent(event);
  },
});

// Report errors
try {
  riskyOperation();
} catch (error) {
  errorReporter.captureException(error, {
    tags: { feature: 'checkout' },
    extra: { userId: user.id },
  });
}
```

### Crash Analytics

```typescript
import { useCrashAnalytics } from '@defendr/enzyme/monitoring';

function App() {
  const {
    recordBreadcrumb,
    setUser,
    addContext
  } = useCrashAnalytics();

  useEffect(() => {
    setUser({ id: user.id, email: user.email });
    addContext('session', { startTime: Date.now() });
  }, [user]);

  const handleClick = () => {
    recordBreadcrumb({
      category: 'ui',
      message: 'Button clicked',
      level: 'info',
    });
  };
}
```

---

## Hydration Module

**Import:** `import { ... } from '@defendr/enzyme/hydration'`

Progressive hydration with priority queues and interaction capture.

### Hydration Boundary

```typescript
import {
  HydrationBoundary,
  HydrationPriority
} from '@defendr/enzyme/hydration';

function App() {
  return (
    <div>
      {/* Critical - hydrates immediately */}
      <HydrationBoundary priority="critical">
        <Navigation />
      </HydrationBoundary>

      {/* High - hydrates when visible */}
      <HydrationBoundary priority="high" trigger="visible">
        <HeroSection />
      </HydrationBoundary>

      {/* Normal - hydrates on interaction */}
      <HydrationBoundary priority="normal" trigger="interaction">
        <Comments />
      </HydrationBoundary>

      {/* Low - hydrates when idle */}
      <HydrationBoundary priority="low" trigger="idle">
        <RelatedContent />
      </HydrationBoundary>
    </div>
  );
}
```

### Hydration Hooks

```typescript
import {
  useHydrationStatus,
  useHydrationControl
} from '@defendr/enzyme/hydration';

function HydrationAwareComponent() {
  const { isHydrated, hydrationTime } = useHydrationStatus();
  const { forceHydrate, pause, resume } = useHydrationControl();

  if (!isHydrated) {
    return <Skeleton />;
  }

  return <FullComponent />;
}
```

---

## Theme Module

**Import:** `import { ... } from '@defendr/enzyme/theme'`

Design tokens, theme management, and color palettes.

### Theme Provider

```typescript
import {
  ThemeProvider,
  useTheme,
  lightPalette,
  darkPalette
} from '@defendr/enzyme/theme';

function App() {
  return (
    <ThemeProvider
      defaultTheme="system"
      themes={{ light: lightPalette, dark: darkPalette }}
    >
      <MyApp />
    </ThemeProvider>
  );
}

function ThemeToggle() {
  const { theme, setTheme, systemPreference } = useTheme();

  return (
    <select value={theme} onChange={(e) => setTheme(e.target.value)}>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="system">System ({systemPreference})</option>
    </select>
  );
}
```

### Design Tokens

```typescript
import { tokens } from '@defendr/enzyme/theme';

// Spacing
tokens.spacing.xs   // 4px
tokens.spacing.sm   // 8px
tokens.spacing.md   // 16px
tokens.spacing.lg   // 24px
tokens.spacing.xl   // 32px

// Typography
tokens.fontSize.xs  // 12px
tokens.fontSize.sm  // 14px
tokens.fontSize.md  // 16px
tokens.fontSize.lg  // 18px
tokens.fontSize.xl  // 20px

// Colors (from active palette)
tokens.colors.primary
tokens.colors.secondary
tokens.colors.success
tokens.colors.error
tokens.colors.warning
tokens.colors.background
tokens.colors.text

// Shadows
tokens.shadows.sm
tokens.shadows.md
tokens.shadows.lg

// Transitions
tokens.transitions.fast    // 150ms
tokens.transitions.normal  // 300ms
tokens.transitions.slow    // 500ms
```

---

## UI Module

**Import:** `import { ... } from '@defendr/enzyme/ui'`

Layout components, navigation, feedback, and inputs.

### Layout Components

```typescript
import { Page, Sidebar, TopNav } from '@defendr/enzyme/ui';

function AppLayout() {
  return (
    <div className="app">
      <TopNav
        logo={<Logo />}
        items={navItems}
        user={currentUser}
        userMenuItems={userMenuItems}
      />
      <div className="main">
        <Sidebar
          items={sidebarItems}
          collapsed={isCollapsed}
          onCollapsedChange={setCollapsed}
        />
        <Page title="Dashboard" maxWidth="xl">
          <Content />
        </Page>
      </div>
    </div>
  );
}
```

### Feedback Components

```typescript
import {
  Spinner,
  ToastProvider,
  useToast,
  LoadingOverlay
} from '@defendr/enzyme/ui';

// Toast notifications
function MyComponent() {
  const { showToast } = useToast();

  const handleSave = async () => {
    try {
      await saveData();
      showToast('Saved successfully!', 'success');
    } catch {
      showToast('Failed to save', 'error');
    }
  };
}

// Loading states
<Spinner size="md" variant="primary" />
<LoadingOverlay visible={isLoading} text="Please wait..." />
```

### Input Components

```typescript
import { Button, IconButton, ButtonGroup } from '@defendr/enzyme/ui';

<Button variant="primary" size="md" onClick={handleClick}>
  Save Changes
</Button>

<Button
  variant="secondary"
  leftIcon={<SaveIcon />}
  isLoading={isSaving}
>
  Save
</Button>

<IconButton
  icon={<DeleteIcon />}
  variant="destructive"
  aria-label="Delete item"
/>

<ButtonGroup direction="horizontal" gap="sm">
  <Button variant="outline">Cancel</Button>
  <Button variant="primary">Confirm</Button>
</ButtonGroup>
```

---

## UX Module

**Import:** `import { ... } from '@defendr/enzyme/ux'`

Loading states, skeleton screens, and optimistic UI.

### Skeleton Factory

```typescript
import {
  createCardSkeleton,
  createListSkeleton,
  createTableSkeleton,
  SkeletonFactory
} from '@defendr/enzyme/ux';

// Quick skeletons
function LoadingList() {
  return createListSkeleton(5); // 5 items
}

function LoadingTable() {
  return createTableSkeleton(10, 4); // 10 rows, 4 columns
}

// Custom skeleton
const factory = new SkeletonFactory({
  animation: 'shimmer',
  baseColor: '#e5e7eb',
  highlightColor: '#f3f4f6',
});

factory.registerPattern({
  name: 'user-card',
  elements: [
    { type: 'avatar', width: 48, height: 48 },
    { type: 'text', width: '60%' },
    { type: 'text', width: '40%' },
  ],
});
```

### Optimistic UI

```typescript
import {
  OptimisticListManager,
  createOptimisticManager
} from '@defendr/enzyme/ux';

const todoManager = new OptimisticListManager<Todo>([], {
  autoRetry: true,
  maxRetries: 3,
});

// Add with optimistic update
async function addTodo(text: string) {
  await todoManager.add(
    { id: tempId(), text, completed: false },
    () => api.createTodo(text)
  );
}

// Update with optimistic update
async function toggleTodo(id: string) {
  await todoManager.update(
    id,
    (todo) => ({ ...todo, completed: !todo.completed }),
    () => api.updateTodo(id)
  );
}

// Delete with optimistic update
async function deleteTodo(id: string) {
  await todoManager.remove(id, () => api.deleteTodo(id));
}
```

---

## Hooks Module

**Import:** `import { ... } from '@defendr/enzyme/hooks'`

50+ production-ready React hooks.

### Network & Connectivity

```typescript
import {
  useOnlineStatus,
  useNetworkQuality,
} from '@defendr/enzyme/hooks';

function NetworkAware() {
  const isOnline = useOnlineStatus();
  const { effectiveType, downlink, rtt } = useNetworkQuality();

  if (!isOnline) {
    return <OfflineMessage />;
  }

  return (
    <div>
      Connection: {effectiveType} ({downlink}Mbps)
    </div>
  );
}
```

### Performance & Timing

```typescript
import {
  useDebounce,
  useThrottle,
  useDeferredValue,
} from '@defendr/enzyme/hooks';

function SearchInput() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery) {
      search(debouncedQuery);
    }
  }, [debouncedQuery]);
}
```

### Accessibility

```typescript
import {
  useScreenReaderAnnounce,
  useKeyboardShortcuts,
  useFocusTrap,
} from '@defendr/enzyme/hooks';

function AccessibleModal() {
  const announce = useScreenReaderAnnounce();
  const trapRef = useFocusTrap();

  useKeyboardShortcuts({
    'Escape': closeModal,
    'Ctrl+S': saveAndClose,
  });

  useEffect(() => {
    announce('Modal opened');
  }, []);

  return <div ref={trapRef}>...</div>;
}
```

### Error Recovery

```typescript
import {
  useAsyncWithRecovery,
  useRetry,
} from '@defendr/enzyme/hooks';

function DataLoader() {
  const {
    data,
    error,
    retry,
    retryCount
  } = useAsyncWithRecovery(
    () => fetchData(),
    { maxRetries: 3, backoff: 'exponential' }
  );

  if (error && retryCount >= 3) {
    return <FatalError error={error} />;
  }

  if (error) {
    return (
      <div>
        Error occurred.
        <button onClick={retry}>Retry ({retryCount}/3)</button>
      </div>
    );
  }

  return <DataDisplay data={data} />;
}
```

---

## Shared Module

**Import:** `import { ... } from '@defendr/enzyme/shared'`

Common utilities, type guards, and helpers.

### Async Utilities

```typescript
import {
  sleep,
  withRetry,
  withTimeout,
  debounce,
  throttle,
  Mutex,
} from '@defendr/enzyme/shared';

// Sleep
await sleep(1000);

// Retry with backoff
const result = await withRetry(
  () => fetchData(),
  { maxAttempts: 3, baseDelay: 1000, backoffFactor: 2 }
);

// Timeout
const data = await withTimeout(fetchData(), 5000);

// Mutex for async operations
const mutex = new Mutex();
await mutex.acquire();
try {
  // Critical section
} finally {
  mutex.release();
}
```

### Type Guards

```typescript
import {
  isDefined,
  isString,
  isNonEmptyString,
  isNumber,
  isEmail,
  isUrl,
  isUuid,
  createShapeGuard,
} from '@defendr/enzyme/shared';

// Basic guards
if (isString(value)) {
  console.log(value.toUpperCase());
}

// Shape guard
const isUser = createShapeGuard<User>({
  id: isString,
  name: isString,
  email: isEmail,
  age: isNumber,
});

if (isUser(data)) {
  // data is typed as User
}
```

### Result Type

```typescript
import { ok, err, isOk, isErr, Result } from '@defendr/enzyme/shared';

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) return err('Division by zero');
  return ok(a / b);
}

const result = divide(10, 2);
if (isOk(result)) {
  console.log(result.value); // 5
} else {
  console.error(result.error);
}
```

---

## Utils Module

**Import:** `import { ... } from '@defendr/enzyme/utils'`

Logging, time formatting, storage, and analytics.

### Logger

```typescript
import { logger, configureLogger } from '@defendr/enzyme/utils';

configureLogger({
  level: 'debug',
  console: true,
  remote: true,
  remoteEndpoint: '/api/logs',
});

logger.info('User logged in', { userId: '123' });
logger.error('API failed', { endpoint: '/users', status: 500 });

// Scoped logger
const apiLogger = logger.withTags('api', 'http');
apiLogger.info('Request started');
```

### Time Utilities

```typescript
import {
  formatDate,
  formatRelative,
  formatDuration,
  isToday,
  addTime,
} from '@defendr/enzyme/utils';

formatDate(new Date(), 'long');     // "January 15, 2024"
formatRelative(Date.now() - 3600000); // "1 hour ago"
formatDuration(125000);             // "2m 5s"
isToday(new Date());                // true
addTime(new Date(), 7, 'days');     // Date 7 days from now
```

### Storage

```typescript
import { StorageManager, setLocal, getLocal } from '@defendr/enzyme/utils';

// Simple API
await setLocal('theme', 'dark');
const theme = await getLocal('theme');

// With encryption and TTL
const secureStorage = new StorageManager(localStorage, {
  prefix: 'app',
  enableEncryption: true,
  encryptionKey: 'secret',
  defaultTTL: 3600000, // 1 hour
});

await secureStorage.set('token', sensitiveData);
```

---

## VDOM Module

**Import:** `import { ... } from '@defendr/enzyme/vdom'`

Virtual module system with lazy loading and security sandboxing.

### Module Registration

```typescript
import {
  registerModule,
  loadModule,
  ModuleProvider
} from '@defendr/enzyme/vdom';

// Register module
registerModule({
  id: 'dashboard',
  name: 'Dashboard Module',
  version: '1.0.0',
  load: () => import('./modules/Dashboard'),
});

// Use in app
function App() {
  return (
    <ModuleProvider>
      <ModuleSlot moduleId="dashboard" />
    </ModuleProvider>
  );
}
```

### Module Hooks

```typescript
import {
  useModule,
  useModuleState,
  useModuleBoundary
} from '@defendr/enzyme/vdom';

function DynamicFeature() {
  const {
    module,
    isLoading,
    error,
    load
  } = useModule('analytics');

  if (isLoading) return <Spinner />;
  if (error) return <ModuleError error={error} />;

  return <module.Component />;
}
```

---

## System Module

**Import:** `import { ... } from '@defendr/enzyme/system'`

System initialization, health checks, and lifecycle management.

### System Manager

```typescript
import {
  initializeSystem,
  getSystemStatus,
  systemHealthCheck,
  shutdownSystem
} from '@defendr/enzyme/system';

// Initialize on app start
await initializeSystem({
  monitoring: { enabled: true },
  performance: { collectWebVitals: true },
  errorReporting: { service: 'sentry' },
});

// Check health
const health = await systemHealthCheck();
console.log(health.components);
// { auth: 'healthy', api: 'healthy', storage: 'healthy' }

// Get status
const status = getSystemStatus();
console.log(status.initialized, status.uptime);

// Graceful shutdown
await shutdownSystem();
```

---

## Type Reference

### Branded Types

```typescript
import type {
  UserId,
  Email,
  UUID,
  AccessToken,
  ISODateString,
  PositiveInteger,
} from '@defendr/enzyme';

// Type-safe IDs that can't be mixed
function getUser(id: UserId): Promise<User>;
function getOrder(id: OrderId): Promise<Order>;

// Can't pass OrderId to getUser - compile error!
```

### Utility Types

```typescript
import type {
  DeepPartial,
  DeepRequired,
  DeepReadonly,
  PartialBy,
  RequiredBy,
  PickByType,
  OmitByType,
  Merge,
  ValueOf,
  Result,
} from '@defendr/enzyme';

// Deep partial - all nested properties optional
type Config = DeepPartial<AppConfig>;

// Partial by keys
type UserUpdate = PartialBy<User, 'name' | 'email'>;

// Pick properties by type
type StringFields = PickByType<User, string>;
```

---

## Examples & Patterns

### Complete App Setup

```typescript
import React from 'react';
import {
  // Providers
  ThemeProvider,
  AuthProvider,
  RBACProvider,
  ToastProvider,

  // Router
  createRouter,

  // Error handling
  GlobalErrorBoundary,

  // System
  initializeSystem,
} from '@defendr/enzyme';

// Initialize system
initializeSystem({
  monitoring: { enabled: true },
  errorReporting: { service: 'sentry', dsn: process.env.SENTRY_DSN },
});

// Create router
const router = createRouter({
  routes: appRoutes,
  defaultLoading: <AppSpinner />,
  defaultError: <ErrorPage />,
});

function App() {
  return (
    <GlobalErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <RBACProvider>
            <ToastProvider>
              <RouterProvider router={router} />
            </ToastProvider>
          </RBACProvider>
        </AuthProvider>
      </ThemeProvider>
    </GlobalErrorBoundary>
  );
}
```

### Protected Route Pattern

```typescript
import { useAuth, useRBAC } from '@defendr/enzyme';

function ProtectedRoute({
  children,
  roles,
  permissions
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const { hasAnyRole, canAll } = useRBAC();

  if (isLoading) return <LoadingPage />;
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (roles && !hasAnyRole(roles)) return <Forbidden />;
  if (permissions && !canAll(permissions)) return <Forbidden />;

  return children;
}

// Usage
<Route
  path="/admin"
  element={
    <ProtectedRoute roles={['admin']}>
      <AdminDashboard />
    </ProtectedRoute>
  }
/>
```

### Data Fetching Pattern

```typescript
import { useApiRequest, useApiMutation } from '@defendr/enzyme/api';

function UserList() {
  // Fetch users
  const {
    data: users,
    isLoading,
    error,
    refetch
  } = useApiRequest<User[]>({
    url: '/users',
    queryKey: ['users'],
  });

  // Delete mutation
  const deleteMutation = useApiMutation<void, string>({
    url: (id) => `/users/${id}`,
    method: 'DELETE',
    onSuccess: () => refetch(),
  });

  if (isLoading) return <UserListSkeleton />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <ul>
      {users?.map(user => (
        <li key={user.id}>
          {user.name}
          <button onClick={() => deleteMutation.mutate(user.id)}>
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
}
```

---

## Migration Guide

### From Plain React

```typescript
// Before: Manual state
const [users, setUsers] = useState([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

useEffect(() => {
  setLoading(true);
  fetchUsers()
    .then(setUsers)
    .catch(setError)
    .finally(() => setLoading(false));
}, []);

// After: @defendr/enzyme
const { data: users, isLoading, error } = useApiRequest({
  url: '/users',
  queryKey: ['users'],
});
```

### From React Router

```typescript
// Before: React Router
import { Routes, Route, useNavigate } from 'react-router-dom';

// After: @defendr/enzyme
import { createRouter, useRouteNavigate } from '@defendr/enzyme/routing';

const router = createRouter({ routes: [...] });
const navigate = useRouteNavigate();
navigate('/users/:id', { id: '123' }); // Type-safe!
```

### From Zustand

```typescript
// Before: Plain Zustand
const useStore = create((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
}));

// After: @defendr/enzyme (with DevTools, persistence, sync)
const countSlice = createSlice({
  name: 'counter',
  initialState: { count: 0 },
  actions: (set) => ({
    increment: () => set((s) => { s.count += 1; }), // Immer!
  }),
});
```

---

## Support

- **GitHub:** https://github.com/harborgrid-justin/enzyme
- **Issues:** https://github.com/harborgrid-justin/enzyme/issues
- **License:** MIT

---

**Built with care by the Defendr Team**
