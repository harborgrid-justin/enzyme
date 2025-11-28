# Migration Guide

> Guide for migrating between versions of the Harbor React Library.

## Table of Contents

- [Migration Overview](#migration-overview)
- [Version Compatibility](#version-compatibility)
- [Migration Steps](#migration-steps)
- [Breaking Changes by Version](#breaking-changes-by-version)
- [Codemods](#codemods)
- [Common Migration Patterns](#common-migration-patterns)
- [Troubleshooting](#troubleshooting)

---

## Migration Overview

This guide helps you upgrade between major versions of the Harbor React Library. Each section covers:

1. **Breaking changes** that require code updates
2. **Deprecated features** that should be replaced
3. **New features** that may simplify your code
4. **Codemods** for automated migration

### Before You Start

1. **Backup your code** or ensure you can revert via version control
2. **Read the changelog** for your target version
3. **Run tests** before and after migration
4. **Update incrementally** if skipping multiple major versions

---

## Version Compatibility

| Library Version | React | React Router | React Query | TypeScript |
|-----------------|-------|--------------|-------------|------------|
| 3.x | 18.x | 6.x | 5.x | 5.x |
| 2.x | 18.x | 6.x | 4.x | 5.x |
| 1.x | 17.x - 18.x | 6.x | 3.x - 4.x | 4.x - 5.x |

---

## Migration Steps

### General Migration Process

```bash
# 1. Update the library
npm update @harbor/react-lib

# 2. Run the migration codemod (if available)
npx @harbor/codemod v2-to-v3

# 3. Update your code manually for remaining changes

# 4. Run TypeScript compiler to catch type errors
npx tsc --noEmit

# 5. Run your test suite
npm test

# 6. Test the application manually
npm run dev
```

---

## Breaking Changes by Version

### Version 3.0 (Current)

#### React Query 5 Migration

```tsx
// Before (v2.x with React Query 4)
const { data, isLoading } = useApiRequest({
  url: '/api/users',
  queryKey: ['users'],
  cacheTime: 30000,
});

// After (v3.x with React Query 5)
const { data, isLoading } = useApiRequest({
  url: '/api/users',
  queryKey: ['users'],
  gcTime: 30000,  // Renamed from cacheTime
});
```

#### Auth Guard Changes

```tsx
// Before (v2.x)
import { ProtectedRoute } from '@/lib/auth';

<ProtectedRoute requiredRole="admin">
  <AdminPage />
</ProtectedRoute>

// After (v3.x)
import { RequireAuth, RequireRole } from '@/lib/auth';

<RequireAuth>
  <RequireRole roles={['admin']}>
    <AdminPage />
  </RequireRole>
</RequireAuth>

// Or combined
<Route element={<RequireAuth />}>
  <Route element={<RequireRole roles={['admin']} />}>
    <Route path="/admin" element={<AdminPage />} />
  </Route>
</Route>
```

#### Routing API Changes

```tsx
// Before (v2.x)
import { createTypedRouter } from '@/lib/routing';

const router = createTypedRouter(routes, {
  authConfig: { requireAuth: true },
});

// After (v3.x)
import { createRouter } from '@/lib/routing';

const router = createRouter({
  routes,
  defaultMeta: { requireAuth: true },
});
```

#### Feature Flag Changes

```tsx
// Before (v2.x)
import { useFlag, FeatureGate } from '@/lib/flags';

const enabled = useFlag('my-feature');

<FeatureGate feature="my-feature">
  <NewFeature />
</FeatureGate>

// After (v3.x)
import { useFeatureFlag, FlagGate } from '@/lib/flags';

const enabled = useFeatureFlag('my-feature');

<FlagGate flag="my-feature">
  <NewFeature />
</FlagGate>
```

#### Hook Renames

```tsx
// Before (v2.x)
import {
  useAuthentication,
  useApiQuery,
  useApiMutate,
} from '@/lib';

// After (v3.x)
import {
  useAuth,          // Renamed
  useApiRequest,    // Renamed
  useApiMutation,   // Renamed
} from '@/lib';
```

### Version 2.0

#### Provider Restructuring

```tsx
// Before (v1.x)
import { AppProvider } from '@/lib';

<AppProvider config={config}>
  <App />
</AppProvider>

// After (v2.x)
import {
  AuthProvider,
  FeatureFlagProvider,
  SecurityProvider,
} from '@/lib';

<SecurityProvider>
  <AuthProvider>
    <FeatureFlagProvider flags={flags}>
      <App />
    </FeatureFlagProvider>
  </AuthProvider>
</SecurityProvider>
```

#### API Client Changes

```tsx
// Before (v1.x)
import { api } from '@/lib/api';

const users = await api.fetch('/users');
const user = await api.post('/users', data);

// After (v2.x)
import { apiClient } from '@/lib/api';

const users = await apiClient.get('/users');
const user = await apiClient.post('/users', data);
```

#### State Management Migration

```tsx
// Before (v1.x) - Custom store
import { createStore } from '@/lib/state';

const store = createStore({
  state: { count: 0 },
  actions: {
    increment: (state) => ({ count: state.count + 1 }),
  },
});

// After (v2.x) - Zustand-based
import { createAppStore, createSlice } from '@/lib/state';

const countSlice = createSlice({
  name: 'count',
  state: { value: 0 },
  actions: (set) => ({
    increment: () => set((s) => ({ value: s.value + 1 })),
  }),
});

const useStore = createAppStore({
  slices: { count: countSlice },
});
```

---

## Codemods

### Available Codemods

```bash
# List available codemods
npx @harbor/codemod --list

# Available migrations:
#   v1-to-v2    Migrate from v1 to v2
#   v2-to-v3    Migrate from v2 to v3
#   react-query-5  Update React Query 4 to 5 patterns
```

### Running Codemods

```bash
# Migrate entire project
npx @harbor/codemod v2-to-v3

# Migrate specific directory
npx @harbor/codemod v2-to-v3 --path src/features

# Dry run (see changes without applying)
npx @harbor/codemod v2-to-v3 --dry-run

# With verbose output
npx @harbor/codemod v2-to-v3 --verbose
```

### What Codemods Handle

| Transformation | v1->v2 | v2->v3 |
|---------------|--------|--------|
| Import paths | Yes | Yes |
| Hook renames | Yes | Yes |
| Component renames | Yes | Yes |
| API changes | Yes | Yes |
| Type updates | Partial | Partial |
| Provider restructure | No | No |

---

## Common Migration Patterns

### Pattern 1: Updating Import Paths

```tsx
// Use VS Code's "Organize Imports" or this script:

// find-replace.js
const replacements = [
  // v2 -> v3 import changes
  ['@/lib/auth/ProtectedRoute', '@/lib/auth'],
  ['useAuthentication', 'useAuth'],
  ['useApiQuery', 'useApiRequest'],
  ['useApiMutate', 'useApiMutation'],
  ['FeatureGate', 'FlagGate'],
  ['useFlag', 'useFeatureFlag'],
];

// Run with your preferred tool (sed, jscodeshift, etc.)
```

### Pattern 2: Updating Hook Usage

```tsx
// Before: Multiple separate hooks
function Component() {
  const auth = useAuthentication();
  const hasRole = useRoleCheck('admin');
  const hasPermission = usePermissionCheck('users:read');

  // ...
}

// After: Unified auth hook
function Component() {
  const { user, hasRole, hasPermission } = useAuth();

  const isAdmin = hasRole('admin');
  const canReadUsers = hasPermission('users:read');

  // ...
}
```

### Pattern 3: Updating Error Boundaries

```tsx
// Before (v1.x)
import { ErrorBoundary } from '@/lib/errors';

<ErrorBoundary onError={handleError}>
  <App />
</ErrorBoundary>

// After (v2.x/v3.x)
import { GlobalErrorBoundary, FeatureErrorBoundary } from '@/lib/monitoring';

<GlobalErrorBoundary
  onError={handleError}
  fallback={<ErrorPage />}
>
  <FeatureErrorBoundary fallback={<FeatureError />}>
    <Feature />
  </FeatureErrorBoundary>
</GlobalErrorBoundary>
```

### Pattern 4: Updating Routing

```tsx
// Before (v1.x) - Object-based routes
const routes = {
  home: '/',
  users: '/users',
  userDetail: '/users/:id',
};

// After (v2.x/v3.x) - Type-safe route builders
import { createRouteBuilder } from '@/lib/routing';

const routes = {
  home: createRouteBuilder('/'),
  users: createRouteBuilder('/users'),
  userDetail: createRouteBuilder('/users/:id'),
};

// Usage
const path = routes.userDetail.build({ id: '123' });
```

### Pattern 5: Updating Feature Flags

```tsx
// Before (v1.x)
import { isFeatureEnabled } from '@/lib/features';

if (isFeatureEnabled('new-dashboard')) {
  // ...
}

// After (v3.x)
import { useFeatureFlag, FlagGate } from '@/lib/flags';

// Hook approach
const isEnabled = useFeatureFlag('new-dashboard');

// Component approach
<FlagGate flag="new-dashboard" fallback={<OldDashboard />}>
  <NewDashboard />
</FlagGate>
```

---

## Troubleshooting

### Common Issues

#### TypeScript Errors After Migration

```bash
# Clear TypeScript cache
rm -rf node_modules/.cache
rm -rf tsconfig.tsbuildinfo

# Reinstall dependencies
npm ci

# Rebuild
npm run build
```

#### "Module not found" Errors

```tsx
// Check for renamed exports
// Old import that might fail:
import { someOldExport } from '@/lib';

// Solution 1: Check the new location
import { someNewExport } from '@/lib/specific-module';

// Solution 2: Check if it was renamed
import { renamedExport } from '@/lib';
```

#### Hook Rule Violations

```tsx
// If you see "Invalid hook call" after migration,
// ensure hooks are called at the top level:

// Wrong (after migration issues)
function Component() {
  if (condition) {
    const data = useApiRequest({ ... }); // Error!
  }
}

// Correct
function Component() {
  const data = useApiRequest({
    ...,
    enabled: condition,  // Use enabled option instead
  });
}
```

#### Provider Order Issues

```tsx
// Ensure providers are in correct order
// Inner providers may depend on outer ones

// Correct order (v3.x)
<SecurityProvider>          {/* 1. Security first */}
  <QueryClientProvider>     {/* 2. Query client */}
    <AuthProvider>          {/* 3. Auth (needs query) */}
      <FeatureFlagProvider> {/* 4. Flags (needs auth) */}
        <App />
      </FeatureFlagProvider>
    </AuthProvider>
  </QueryClientProvider>
</SecurityProvider>
```

### Getting Help

1. **Check the changelog** for your version
2. **Search existing issues** on GitHub
3. **Check the documentation** for updated APIs
4. **Open an issue** with:
   - Current version
   - Target version
   - Error message
   - Minimal reproduction

---

## Deprecation Notices

### Deprecated in v3.x (Remove in v4.x)

```tsx
// useAuthentication -> useAuth
// @deprecated Use useAuth instead
import { useAuthentication } from '@/lib/auth';

// ProtectedRoute -> RequireAuth
// @deprecated Use RequireAuth and RequireRole
import { ProtectedRoute } from '@/lib/auth';

// FeatureGate -> FlagGate
// @deprecated Use FlagGate
import { FeatureGate } from '@/lib/flags';
```

### Deprecated in v2.x (Removed in v3.x)

These have been removed in v3.x:

- `AppProvider` - Use individual providers
- `api.fetch()` - Use `apiClient.get/post/etc()`
- `createStore` - Use `createAppStore` with slices

---

## Version-Specific Notes

### Upgrading to v3.x

1. Update React Query to v5
2. Update hook names
3. Update guard components
4. Update feature flag components
5. Test thoroughly

### Upgrading to v2.x

1. Split `AppProvider` into individual providers
2. Migrate to new API client
3. Migrate to Zustand-based state
4. Update error boundaries
5. Test thoroughly

---

## See Also

- [CHANGELOG](../CHANGELOG.md) - Detailed version history
- [Architecture Guide](./ARCHITECTURE.md) - System design
- [Configuration Guide](./CONFIGURATION.md) - Setup options
- [Documentation Index](./INDEX.md) - All documentation resources
