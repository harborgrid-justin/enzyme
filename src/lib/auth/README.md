# Auth Module

> **Purpose:** Enterprise authentication and authorization system with Active Directory integration, RBAC, SSO, and comprehensive security features.

## Overview

The Auth module provides a complete identity and access management solution for React applications. It handles everything from basic authentication flows to complex enterprise requirements like Active Directory integration, Single Sign-On (SSO), Multi-Factor Authentication (MFA), and Role-Based Access Control (RBAC).

Built with security and scalability in mind, this module supports multiple authentication providers (Azure AD, ADFS, B2C, on-premises AD), fine-grained permission systems, and seamless integration with routing guards and API security.

Whether you're building a simple login system or implementing enterprise-grade access control with complex role hierarchies and conditional permissions, this module provides the patterns and tools needed.

## Key Features

- User authentication with JWT token management
- Active Directory integration (Azure AD, ADFS, B2C, on-prem)
- Single Sign-On (SSO) with cross-domain support
- Multi-Factor Authentication (MFA) support
- Role-Based Access Control (RBAC) engine
- Permission matrix with hierarchical roles
- Resource-level permissions with scopes
- Policy-based authorization with conditions
- Route guards for protected pages
- React components for auth UI (RequireAuth, RequireRole, RequirePermission)
- Token refresh and automatic renewal
- Session management across tabs
- Group-to-role mapping for AD
- Attribute extraction from tokens
- Comprehensive audit logging

## Quick Start

```tsx
import { AuthProvider, useAuth } from '@/lib/auth';

// 1. Wrap your app with AuthProvider
function App() {
  return (
    <AuthProvider>
      <YourApp />
    </AuthProvider>
  );
}

// 2. Use auth in components
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
    <button onClick={() => login({ email: 'user@example.com', password: 'pass' })}>
      Login
    </button>
  );
}

// 3. Protect routes
import { RequireAuth, RequireRole } from '@/lib/auth';

function AdminPage() {
  return (
    <RequireAuth>
      <RequireRole role="admin">
        <AdminDashboard />
      </RequireRole>
    </RequireAuth>
  );
}
```

## Exports

### Components
- `AuthProvider` - Core authentication context provider
- `RequireAuth` - Route guard requiring authentication
- `RequireRole` - Route guard requiring specific role
- `RequirePermission` - Route guard requiring specific permission
- `AuthGuardLoading` - Loading state for auth guards
- `ADProvider` - Active Directory authentication provider
- `RBACProvider` - Role-based access control provider

### Hooks
- `useAuth` - Access authentication state and methods
- `useHasRole` - Check if user has specific role
- `useHasPermission` - Check if user has specific permission
- `useActiveDirectory` - Access Active Directory features
- `useRBAC` - Access RBAC engine and permission checks
- `usePermissions` - Get user's permissions list
- `useRoles` - Get user's roles list
- `useResourceAccess` - Check access to specific resource
- `usePermissionGate` - Conditional rendering based on permissions
- `useRoleGate` - Conditional rendering based on roles
- `useAccessChecks` - Batch permission checks

### Services
- `authService` - Core authentication service
  - `login()` - Authenticate user
  - `logout()` - End user session
  - `register()` - Register new user
  - `refreshToken()` - Refresh access token
  - `resetPassword()` - Initiate password reset
  - `verifyEmail()` - Verify email address
  - `enableMFA()` - Enable multi-factor authentication

### Active Directory
- `ADClient` - Active Directory client
- `ADTokenHandler` - Token acquisition and refresh
- `SSOManager` - Single Sign-On orchestration
- `CrossDomainSSO` - Cross-domain SSO support
- `ADGroupMapper` - Map AD groups to application roles
- `ADAttributeMapper` - Extract user attributes from tokens

### RBAC Engine
- `RBACEngine` - Core permission evaluation engine
- `PermissionMatrixBuilder` - Build permission matrices
- `RoleHierarchyManager` - Manage role inheritance
- `ResourcePermissionManager` - Resource-level permissions
- `PolicyEvaluator` - Evaluate authorization policies

### Utilities
- `routeMetadata` - Define route authentication requirements
- `getRouteAuthConfig()` - Get auth config for route
- `canAccessRoute()` - Check if user can access route
- `createRoleGuard()` - Factory for role guards
- `createPermissionGuard()` - Factory for permission guards
- `validateADConfig()` - Validate AD configuration
- `mergeGroupMappings()` - Combine group mappings

### Types
- `User` - User object structure
- `Role` - Role definition
- `Permission` - Permission string or structured
- `AuthTokens` - JWT tokens (access, refresh, ID)
- `AuthState` - Authentication state
- `LoginCredentials` - Login form data
- `ADConfig` - Active Directory configuration
- `ADUser` - AD user with claims
- `RBACConfig` - RBAC engine configuration
- `PermissionMatrix` - Permission matrix type
- `Policy` - Authorization policy
- `AccessRequest` - Permission check request

## Architecture

The Auth module is organized into three main layers:

```
┌─────────────────────────────────────────┐
│         React Components & Hooks         │
│    (AuthProvider, useAuth, guards)      │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────┴───────────────────────┐
│         Authentication Layer             │
│  (authService, AD Integration, SSO)     │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────┴───────────────────────┐
│         Authorization Layer              │
│     (RBAC Engine, Policies, Guards)     │
└─────────────────────────────────────────┘
```

### Integration Points

- **Routing Module**: Route guards and metadata
- **API Module**: Token injection via interceptors
- **State Module**: Auth state synchronization
- **Security Module**: CSRF tokens, secure storage

## Common Patterns

### Pattern 1: Basic Authentication
```tsx
import { AuthProvider, useAuth, RequireAuth } from '@/lib/auth';

function LoginPage() {
  const { login, isLoading, error } = useAuth();
  const [credentials, setCredentials] = useState({ email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(credentials);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={credentials.email}
        onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
      />
      <input
        type="password"
        value={credentials.password}
        onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
      {error && <div className="error">{error.message}</div>}
    </form>
  );
}

// Protect routes
function Dashboard() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}
```

### Pattern 2: Active Directory Integration
```tsx
import { ADProvider, useActiveDirectory } from '@/lib/auth/active-directory';

function App() {
  return (
    <ADProvider
      config={{
        providerType: 'azure-ad',
        azure: {
          clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
          tenantId: import.meta.env.VITE_AZURE_TENANT_ID,
          redirectUri: window.location.origin,
        },
        scopes: ['User.Read', 'openid', 'profile'],
        groupMapping: {
          'IT-Admins': ['admin'],
          'Support-Team': ['support', 'user'],
        },
      }}
    >
      <YourApp />
    </ADProvider>
  );
}

function UserProfile() {
  const { user, groups, loginWithPopup, logout } = useActiveDirectory();

  if (!user) {
    return <button onClick={() => loginWithPopup()}>Sign in with Microsoft</button>;
  }

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <p>Email: {user.email}</p>
      <p>Groups: {groups.join(', ')}</p>
      <button onClick={logout}>Sign out</button>
    </div>
  );
}
```

### Pattern 3: Role-Based Access Control
```tsx
import { RBACProvider, useRBAC, RequireRole } from '@/lib/auth';

function App() {
  return (
    <AuthProvider>
      <RBACProvider
        config={{
          roles: {
            admin: { permissions: ['*'] },
            editor: { permissions: ['posts:read', 'posts:write', 'posts:delete'] },
            viewer: { permissions: ['posts:read'] },
          },
          hierarchy: {
            admin: ['editor', 'viewer'],
            editor: ['viewer'],
          },
        }}
      >
        <YourApp />
      </RBACProvider>
    </AuthProvider>
  );
}

function PostActions({ post }) {
  const { can } = useRBAC();

  return (
    <div>
      {can('write', 'posts') && (
        <button onClick={() => editPost(post)}>Edit</button>
      )}
      {can('delete', 'posts') && (
        <button onClick={() => deletePost(post)}>Delete</button>
      )}
    </div>
  );
}

// Component-level guards
function AdminPanel() {
  return (
    <RequireRole role="admin">
      <AdminDashboard />
    </RequireRole>
  );
}
```

### Pattern 4: Permission Matrix
```tsx
import {
  RBACProvider,
  PermissionMatrixBuilder,
  createStandardMatrix,
} from '@/lib/auth';

// Define permission matrix
const matrix = new PermissionMatrixBuilder()
  .resource('posts')
    .role('admin', ['create', 'read', 'update', 'delete', 'publish'])
    .role('editor', ['create', 'read', 'update', 'delete'])
    .role('author', ['create', 'read', 'update'])
    .role('viewer', ['read'])
  .resource('users')
    .role('admin', ['create', 'read', 'update', 'delete'])
    .role('editor', ['read'])
  .resource('settings')
    .role('admin', ['read', 'update'])
  .build();

function App() {
  return (
    <RBACProvider
      config={{
        permissionMatrix: matrix,
      }}
    >
      <YourApp />
    </RBACProvider>
  );
}
```

### Pattern 5: Conditional Permissions with Policies
```tsx
import { RBACProvider, PolicyEvaluator } from '@/lib/auth';

const policies = [
  {
    id: 'own-posts-edit',
    effect: 'allow',
    actions: ['update', 'delete'],
    resources: ['posts'],
    conditions: [
      (context) => context.resource.authorId === context.user.id,
    ],
  },
  {
    id: 'published-posts-no-delete',
    effect: 'deny',
    actions: ['delete'],
    resources: ['posts'],
    conditions: [
      (context) => context.resource.status === 'published',
    ],
  },
];

function PostActions({ post }) {
  const { can } = useRBAC();
  const canEdit = can('update', 'posts', post);
  const canDelete = can('delete', 'posts', post);

  return (
    <div>
      {canEdit && <button>Edit</button>}
      {canDelete && <button>Delete</button>}
    </div>
  );
}
```

## Configuration

### Basic Auth Configuration
```tsx
import { AuthProvider } from '@/lib/auth';

<AuthProvider
  config={{
    // API endpoints
    loginEndpoint: '/api/auth/login',
    logoutEndpoint: '/api/auth/logout',
    refreshEndpoint: '/api/auth/refresh',

    // Token storage
    tokenStorageKey: 'auth_tokens',
    persistAuth: true,

    // Redirect behavior
    loginRedirect: '/dashboard',
    logoutRedirect: '/login',

    // Token refresh
    autoRefresh: true,
    refreshBeforeExpiry: 300, // seconds

    // Session timeout
    sessionTimeout: 3600000, // 1 hour in ms
  }}
>
  <App />
</AuthProvider>
```

### Active Directory Configuration
```tsx
import { ADProvider } from '@/lib/auth/active-directory';

<ADProvider
  config={{
    providerType: 'azure-ad',
    azure: {
      clientId: 'your-client-id',
      tenantId: 'your-tenant-id',
      redirectUri: 'http://localhost:3000',
    },
    scopes: ['User.Read', 'openid', 'profile', 'email'],

    // Group mapping
    groupMapping: {
      'Admin-Group': ['admin'],
      'Editor-Group': ['editor'],
      'User-Group': ['user'],
    },

    // SSO configuration
    sso: {
      enabled: true,
      crossDomain: true,
      domains: ['app1.example.com', 'app2.example.com'],
    },
  }}
/>
```

## Testing

### Testing with Mock Auth
```tsx
import { AuthProvider } from '@/lib/auth';
import { render, screen } from '@testing-library/react';

// Mock auth context
const mockAuthContext = {
  user: { id: '1', email: 'test@example.com', roles: ['user'] },
  isAuthenticated: true,
  login: jest.fn(),
  logout: jest.fn(),
};

function renderWithAuth(ui, { authValue = mockAuthContext } = {}) {
  return render(
    <AuthProvider value={authValue}>
      {ui}
    </AuthProvider>
  );
}

describe('Dashboard', () => {
  it('shows user name when authenticated', () => {
    renderWithAuth(<Dashboard />);
    expect(screen.getByText(/test@example.com/)).toBeInTheDocument();
  });

  it('redirects to login when not authenticated', () => {
    renderWithAuth(<Dashboard />, {
      authValue: { ...mockAuthContext, isAuthenticated: false },
    });
    expect(screen.getByText(/please log in/i)).toBeInTheDocument();
  });
});
```

## Performance Considerations

1. **Token Storage**: Tokens stored in httpOnly cookies for security
2. **Token Refresh**: Background refresh before expiry to prevent interruptions
3. **Permission Caching**: Permission checks cached to avoid repeated evaluations
4. **SSO Sync**: Efficient BroadcastChannel for cross-tab synchronization
5. **Bundle Size**: Core auth ~12KB, RBAC ~8KB, AD integration ~15KB gzipped

## Troubleshooting

### Issue: Token Expires Too Quickly
**Solution:** Configure auto-refresh to renew tokens before expiry:
```tsx
<AuthProvider config={{ autoRefresh: true, refreshBeforeExpiry: 300 }}>
```

### Issue: AD Login Popup Blocked
**Solution:** Use redirect flow instead of popup:
```tsx
const { loginWithRedirect } = useActiveDirectory();
<button onClick={loginWithRedirect}>Sign in</button>
```

### Issue: Permission Check Always Returns False
**Solution:** Ensure user roles are loaded and RBAC is configured:
```tsx
const { can, isReady } = useRBAC();
if (!isReady) return <Loading />;
```

### Issue: Session Lost on Page Refresh
**Solution:** Enable auth persistence:
```tsx
<AuthProvider config={{ persistAuth: true }}>
```

## See Also

- [Auth Configuration](/reuse/templates/react/src/config/auth.config.ts)
- [RBAC Documentation](./rbac/README.md)
- [Active Directory Integration](./active-directory/README.md)
- [Routing Module](../routing/README.md) - Route guards
- [Security Module](../security/README.md) - CSRF and secure storage
- [API Module](../api/README.md) - Token injection

---

**Version:** 3.0.0
**Last Updated:** 2025-11-27
