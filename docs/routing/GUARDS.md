# Route Guards

> Enterprise-grade route protection with authentication, authorization, and feature flags

## Overview

Route guards provide declarative route protection patterns inspired by Angular, Next.js middleware, and Vue Router. Guards control access to routes based on authentication, user roles, permissions, and feature flags.

## Features

- **Authentication Guards**: Protect routes requiring login
- **Role-Based Guards**: Control access by user roles
- **Permission Guards**: Fine-grained permission checking
- **Feature Flag Guards**: Route access based on feature flags
- **Composite Guards**: Combine multiple guards with AND/OR logic
- **Guard Resolver**: Centralized guard management and execution

## Installation

```typescript
import {
  createAuthGuard,
  createRoleGuard,
  createPermissionGuard,
  createFeatureGuard,
  allGuards,
  GuardResolver,
} from '@/lib/routing/guards';
```

## Authentication Guard

Protect routes that require user authentication.

### Basic Usage

```typescript
import { createAuthGuard } from '@/lib/routing/guards';

const authGuard = createAuthGuard({
  loginPath: '/login',
  returnUrlParam: 'returnUrl',
  publicPaths: ['/login', '/register', '/forgot-password'],
});

// Use with guard resolver
const resolver = new GuardResolver();
resolver.register(authGuard, {
  routes: ['/dashboard/**', '/profile/**'],
});
```

### Configuration

```typescript
interface AuthGuardConfig {
  loginPath: string;              // Redirect path when not authenticated
  returnUrlParam?: string;        // Query param for return URL
  publicPaths?: string[];         // Paths that don't require auth
  getAuthState: () => AuthState | Promise<AuthState>;
}

interface AuthState {
  isAuthenticated: boolean;
  user?: {
    id: string;
    email?: string;
    name?: string;
  };
  token?: string;
  expiresAt?: number;
}
```

### Examples

```typescript
// Simple auth check
const simpleGuard = createSimpleAuthGuard({
  isAuthenticated: () => !!localStorage.getItem('token'),
  loginPath: '/login',
});

// Token-based auth
const tokenGuard = createTokenAuthGuard({
  getToken: () => localStorage.getItem('authToken'),
  validateToken: async (token) => {
    const response = await fetch('/api/auth/validate', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.ok;
  },
  loginPath: '/login',
});

// With custom auth provider
const authGuard = createAuthGuard({
  loginPath: '/login',
  getAuthState: async () => {
    const user = await authService.getCurrentUser();
    return {
      isAuthenticated: !!user,
      user: user ? {
        id: user.id,
        email: user.email,
        name: user.name,
      } : undefined,
    };
  },
});
```

### Utilities

```typescript
// Build return URL with current path
const returnUrl = buildReturnUrl('/login', '/dashboard');
// => '/login?returnUrl=%2Fdashboard'

// Parse return URL from query params
const destination = parseReturnUrl(searchParams);
// => '/dashboard'

// Check if path requires auth
if (pathRequiresAuth('/dashboard', authGuard)) {
  // Redirect to login
}

// Type guards
if (isAuthGuard(guard)) {
  // TypeScript knows this is an AuthGuard
}

if (isAuthState(state)) {
  // TypeScript knows this is an AuthState
}
```

## Role-Based Guard

Control access based on user roles.

### Basic Usage

```typescript
import { createRoleGuard, requireRole } from '@/lib/routing/guards';

// Single role requirement
const adminGuard = createRoleGuard({
  requiredRoles: ['admin'],
  redirectTo: '/unauthorized',
});

// Multiple roles (any match)
const moderatorGuard = createRoleGuard({
  requiredRoles: ['admin', 'moderator'],
  matchStrategy: 'any',
});

// Multiple roles (all required)
const superAdminGuard = createRoleGuard({
  requiredRoles: ['admin', 'superuser'],
  matchStrategy: 'all',
});
```

### Configuration

```typescript
interface RoleGuardConfig {
  requiredRoles: readonly string[];
  matchStrategy?: 'any' | 'all';  // Default: 'any'
  redirectTo?: string;
  getUserRoles: (user: GuardUser) => string[] | Promise<string[]>;
}

type RoleMatchStrategy = 'any' | 'all';
```

### Factory Functions

```typescript
// Require specific role
const adminGuard = requireRole('admin', { redirectTo: '/unauthorized' });

// Require any of multiple roles
const staffGuard = requireAnyRole(['admin', 'editor', 'moderator']);

// Require all roles
const superAdminGuard = requireAllRoles(['admin', 'superuser']);

// Exclude roles
const regularUserGuard = excludeRoles(['banned', 'suspended']);

// Shorthand for admin
const adminGuard = createAdminGuard();
```

### Utilities

```typescript
// Check if user has role
hasRole(user, 'admin'); // => true/false

// Check if user has any role
hasAnyRole(user, ['admin', 'editor']); // => true/false

// Check if user has all roles
hasAllRoles(user, ['admin', 'verified']); // => true/false

// Get missing roles
getMissingRoles(user, ['admin', 'editor']);
// => ['admin'] (if user doesn't have admin role)

// Type guards
if (isRoleGuard(guard)) {
  // TypeScript knows this is a RoleGuard
}

if (isRoleCheckResult(result)) {
  // TypeScript knows this is a RoleCheckResult
}
```

### Examples

```typescript
// Admin-only routes
const adminRoutes = ['/admin/**'];
resolver.register(requireRole('admin'), { routes: adminRoutes });

// Content editor routes
const editorRoutes = ['/cms/**', '/posts/**'];
resolver.register(requireAnyRole(['admin', 'editor']), { routes: editorRoutes });

// Super admin routes (requires both roles)
const superAdminRoutes = ['/admin/settings/**'];
resolver.register(requireAllRoles(['admin', 'superuser']), { routes: superAdminRoutes });
```

## Permission Guard

Fine-grained access control with resource-level permissions.

### Basic Usage

```typescript
import { createPermissionGuard, requirePermission } from '@/lib/routing/guards';

const postEditGuard = createPermissionGuard({
  requiredPermissions: ['posts:edit'],
  getUserPermissions: async (user) => {
    return await fetchUserPermissions(user.id);
  },
});
```

### Configuration

```typescript
interface PermissionGuardConfig {
  requiredPermissions: readonly Permission[];
  matchStrategy?: 'any' | 'all';  // Default: 'any'
  redirectTo?: string;
  getUserPermissions: (user: GuardUser) => Permission[] | Promise<Permission[]>;
}

// Permission can be string or structured
type Permission = string | StructuredPermission;

interface StructuredPermission {
  resource: string;
  action: string;
  scope?: string;
  conditions?: Record<string, unknown>;
}

// Common actions
const PermissionActions = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  MANAGE: 'manage',
} as const;
```

### Factory Functions

```typescript
// Single permission
const editGuard = requirePermission('posts:edit');

// Multiple permissions (any)
const contentGuard = requireAnyPermission([
  'posts:edit',
  'pages:edit',
  'media:upload',
]);

// Multiple permissions (all required)
const publishGuard = requireAllPermissions([
  'posts:edit',
  'posts:publish',
]);

// Resource-specific permission
const postManageGuard = requireResourcePermission('posts', 'manage');
```

### Permission Parsing

```typescript
// Parse permission string
parsePermission('posts:edit:own');
// => {
//   resource: 'posts',
//   action: 'edit',
//   scope: 'own'
// }

// Build permission string
buildPermission({
  resource: 'posts',
  action: 'edit',
  scope: 'own',
});
// => 'posts:edit:own'

// Build from components
buildPermission('posts', 'edit', 'own');
// => 'posts:edit:own'
```

### Utilities

```typescript
// Check if user has permission
hasPermission(user, 'posts:edit'); // => true/false

// Check any permission
hasAnyPermission(user, ['posts:edit', 'pages:edit']);

// Check all permissions
hasAllPermissions(user, ['posts:edit', 'posts:publish']);

// Get missing permissions
getMissingPermissions(user, ['posts:edit', 'posts:delete']);
// => ['posts:delete'] (if user doesn't have it)

// Type guards
if (isPermissionGuard(guard)) {
  // TypeScript knows this is a PermissionGuard
}

if (isStructuredPermission(perm)) {
  // TypeScript knows this is a StructuredPermission
}
```

### Examples

```typescript
// Content management permissions
resolver.register(requirePermission('posts:edit'), {
  routes: ['/posts/:id/edit'],
});

// Admin permissions
resolver.register(requireResourcePermission('users', 'manage'), {
  routes: ['/admin/users/**'],
});

// Complex permission requirements
const publishGuard = requireAllPermissions([
  'posts:edit',
  'posts:publish',
  'media:upload',
]);
resolver.register(publishGuard, {
  routes: ['/posts/:id/publish'],
});
```

## Feature Flag Guard

Control route access based on feature flags.

### Basic Usage

```typescript
import { createFeatureGuard, requireFeature } from '@/lib/routing/guards';

const newDashboardGuard = createFeatureGuard({
  requiredFlags: ['new-dashboard'],
  getFlagState: async (flag) => {
    return await featureFlagService.isEnabled(flag);
  },
});
```

### Configuration

```typescript
interface FeatureGuardConfig {
  requiredFlags: readonly string[];
  matchStrategy?: 'any' | 'all';  // Default: 'any'
  redirectTo?: string;
  fallbackPath?: string;
  getFlagState: (flag: string) => FeatureFlagState | Promise<FeatureFlagState>;
}

interface FeatureFlagState {
  enabled: boolean;
  variant?: string;
  metadata?: Record<string, unknown>;
}

type FeatureFlagMatchStrategy = 'any' | 'all';
```

### Factory Functions

```typescript
// Single feature flag
const betaDashboard = requireFeature('beta-dashboard');

// Multiple flags (any)
const experimentalFeatures = requireAnyFeature([
  'new-ui',
  'experimental-editor',
]);

// Multiple flags (all required)
const premiumFeatures = requireAllFeatures([
  'premium-plan',
  'advanced-analytics',
]);

// Mark as deprecated
const oldFeature = deprecatedFeature('old-editor', {
  message: 'This feature is deprecated. Use new-editor instead.',
});

// Beta feature
const betaFeature = betaFeature('new-feature', {
  betaPath: '/beta/new-feature',
});
```

### Flag Providers

```typescript
// Static flags (for testing)
const staticProvider = createStaticFlagProvider({
  'beta-dashboard': true,
  'new-ui': false,
});

// LocalStorage flags
const localStorageProvider = createLocalStorageFlagProvider({
  prefix: 'feature_',
  defaultEnabled: false,
});

// URL flags (for testing)
const urlProvider = createUrlFlagProvider({
  paramName: 'features',
});

// Combine providers (first match wins)
const combinedProvider = combineFlagProviders([
  urlProvider,
  localStorageProvider,
  staticProvider,
]);

const guard = createFeatureGuard({
  requiredFlags: ['new-ui'],
  getFlagState: combinedProvider,
});
```

### Examples

```typescript
// Beta features
resolver.register(requireFeature('beta-dashboard'), {
  routes: ['/beta/dashboard'],
});

// A/B testing
resolver.register(
  createFeatureGuard({
    requiredFlags: ['experiment-a'],
    getFlagState: async (flag) => ({
      enabled: await abTestService.isInVariant(flag, 'a'),
    }),
  }),
  { routes: ['/experiment/variant-a'] }
);

// Premium features
resolver.register(requireAllFeatures(['premium-plan', 'analytics']), {
  routes: ['/analytics/**'],
});
```

## Composite Guards

Combine multiple guards with logical operators.

### Basic Usage

```typescript
import { allGuards, anyGuard, sequentialGuards } from '@/lib/routing/guards';

// Require auth AND admin role
const adminAreaGuard = allGuards([authGuard, adminGuard]);

// Require auth OR beta access
const earlyAccessGuard = anyGuard([authGuard, betaAccessGuard]);

// Execute guards in sequence
const strictGuard = sequentialGuards([
  authGuard,
  roleGuard,
  permissionGuard,
]);
```

### Configuration

```typescript
interface CompositeGuardConfig {
  guards: readonly RouteGuard[];
  strategy: CompositeStrategy;
  stopOnFirstDeny?: boolean;
  parallel?: boolean;
}

type CompositeStrategy = 'all' | 'any' | 'sequential';
```

### Factory Functions

```typescript
// All guards must pass
const allPass = allGuards([guard1, guard2, guard3]);

// Any guard can pass
const anyPass = anyGuard([guard1, guard2, guard3]);

// Execute in sequence (short-circuit on first deny)
const sequential = sequentialGuards([guard1, guard2, guard3]);

// Execute in parallel
const parallel = parallelGuards([guard1, guard2, guard3]);

// General composition
const composite = combineGuards([guard1, guard2], {
  strategy: 'all',
  parallel: true,
});
```

### Examples

```typescript
// Admin area: require auth and admin role
const adminAreaGuard = allGuards([
  authGuard,
  requireRole('admin'),
]);
resolver.register(adminAreaGuard, { routes: ['/admin/**'] });

// Premium content: require auth and (premium OR trial)
const premiumGuard = allGuards([
  authGuard,
  anyGuard([
    requireFeature('premium-plan'),
    requireFeature('trial-access'),
  ]),
]);
resolver.register(premiumGuard, { routes: ['/premium/**'] });

// Complex permission flow
const publishGuard = sequentialGuards([
  authGuard,                           // Must be logged in
  requireRole('editor'),               // Must be an editor
  requirePermission('posts:publish'),  // Must have publish permission
  requireFeature('publish-enabled'),   // Feature must be enabled
]);
resolver.register(publishGuard, { routes: ['/posts/:id/publish'] });
```

## Guard Resolver

Centralized guard management and execution.

### Basic Usage

```typescript
import { GuardResolver, createGuardResolver } from '@/lib/routing/guards';

// Create resolver
const resolver = createGuardResolver({
  defaultRedirect: '/unauthorized',
  enableLogging: true,
});

// Register guards
resolver.register(authGuard, {
  routes: ['/dashboard/**', '/profile/**'],
  priority: 100,
});

resolver.register(adminGuard, {
  routes: ['/admin/**'],
  priority: 200,
});

// Resolve guards for a path
const result = await resolver.resolve({
  path: '/admin/users',
  params: {},
  query: {},
  user: currentUser,
});

if (result.allowed) {
  // Proceed to route
} else if (result.redirectTo) {
  navigate(result.redirectTo);
} else {
  // Show error
}
```

### Configuration

```typescript
interface GuardResolverConfig {
  defaultRedirect?: string;
  enableLogging?: boolean;
  parallel?: boolean;
  stopOnFirstDeny?: boolean;
}

interface GuardRegistrationOptions {
  routes?: readonly string[];
  exclude?: readonly string[];
  priority?: number;
}
```

### Registration

```typescript
// Register with route patterns
resolver.register(authGuard, {
  routes: ['/dashboard/**', '/profile/**'],
  exclude: ['/dashboard/public'],
  priority: 100,
});

// Register globally
resolver.registerGlobal(loggingGuard, { priority: 1 });

// Unregister
resolver.unregister('guard-id');

// Clear all guards
resolver.clear();
```

### Resolution

```typescript
// Resolve guards for a navigation
const result = await resolver.resolve({
  path: '/admin/users',
  params: { section: 'list' },
  query: { page: '1' },
  user: {
    id: '123',
    isAuthenticated: true,
    roles: ['admin'],
    permissions: ['users:manage'],
  },
  features: {
    'admin-panel': true,
  },
});

// Result types
interface GuardResolutionResult {
  allowed: boolean;
  redirectTo?: string;
  reason?: string;
  guardResults: GuardExecutionResult[];
}
```

### Singleton Access

```typescript
// Get global instance
const resolver = getGuardResolver();

// Initialize with config
initGuardResolver({
  defaultRedirect: '/login',
  enableLogging: process.env.NODE_ENV === 'development',
});

// Reset to default state
resetGuardResolver();
```

### Examples

```typescript
// React Router integration
import { useLocation, useNavigate } from 'react-router-dom';
import { getGuardResolver } from '@/lib/routing/guards';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const resolver = getGuardResolver();
    resolver.resolve({
      path: location.pathname,
      params: {},
      query: Object.fromEntries(new URLSearchParams(location.search)),
      user: getCurrentUser(),
    }).then(result => {
      if (result.allowed) {
        setAllowed(true);
      } else if (result.redirectTo) {
        navigate(result.redirectTo);
      } else {
        setAllowed(false);
      }
    });
  }, [location.pathname]);

  if (allowed === null) return <Loading />;
  if (!allowed) return <Unauthorized />;
  return <>{children}</>;
}
```

## Best Practices

### Guard Organization

```typescript
// guards/index.ts
export const authGuard = createAuthGuard({ ... });
export const adminGuard = requireRole('admin');
export const editorGuard = requireAnyRole(['admin', 'editor']);
export const premiumGuard = requireFeature('premium');

// Register in one place
export function setupGuards() {
  const resolver = getGuardResolver();

  resolver.register(authGuard, {
    routes: ['/dashboard/**', '/profile/**'],
    priority: 100,
  });

  resolver.register(adminGuard, {
    routes: ['/admin/**'],
    priority: 200,
  });
}
```

### Composition Patterns

```typescript
// Build complex guards from simple ones
const contentEditor = allGuards([
  authGuard,
  anyGuard([
    requireRole('admin'),
    requireRole('editor'),
  ]),
  requirePermission('content:edit'),
]);

// Reuse common patterns
const authenticatedUser = allGuards([authGuard, requireRole('user')]);
const authenticatedAdmin = allGuards([authGuard, requireRole('admin')]);
```

### Error Handling

```typescript
const guard = createAuthGuard({
  loginPath: '/login',
  getAuthState: async () => {
    try {
      const user = await authService.getCurrentUser();
      return { isAuthenticated: !!user, user };
    } catch (error) {
      console.error('Auth check failed:', error);
      return { isAuthenticated: false };
    }
  },
});
```

### Testing Guards

```typescript
import { createAuthGuard } from '@/lib/routing/guards';

describe('AuthGuard', () => {
  it('allows authenticated users', async () => {
    const guard = createAuthGuard({
      loginPath: '/login',
      getAuthState: async () => ({ isAuthenticated: true }),
    });

    const result = await guard.canActivate({
      path: '/dashboard',
      params: {},
      query: {},
      user: mockUser,
    });

    expect(result.type).toBe('allow');
  });

  it('redirects unauthenticated users', async () => {
    const guard = createAuthGuard({
      loginPath: '/login',
      getAuthState: async () => ({ isAuthenticated: false }),
    });

    const result = await guard.canActivate({
      path: '/dashboard',
      params: {},
      query: {},
    });

    expect(result.type).toBe('redirect');
    expect(result.redirectTo).toBe('/login?returnUrl=%2Fdashboard');
  });
});
```

## Related Documentation

### Routing System
- [README.md](./README.md) - Routing overview
- [CORE.md](./CORE.md) - Core routing utilities
- [NAVIGATION.md](./NAVIGATION.md) - Navigation components
- [LOADERS.md](./LOADERS.md) - Data loaders
- [ADVANCED.md](./ADVANCED.md) - Advanced routing patterns
- [TYPES.md](./TYPES.md) - Type definitions

### Authentication
- [Auth Guards](../auth/GUARDS.md) - Authentication guard implementations
- [Auth System](../auth/README.md) - Authentication overview
- [Auth Patterns](../auth/PATTERNS.md) - Auth integration patterns
- [RBAC](../auth/RBAC.md) - Role-based access control

### State & Integration
- [State System](../state/README.md) - State with route guards
- [State Stores](../state/STORES.md) - Auth state management
- [Routing Integration](../integration/ROUTING_STATE_GUARDS.md) - Complete routing, state, and guards guide
