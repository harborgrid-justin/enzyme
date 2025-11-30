# Authentication & RBAC Module

> **Enterprise authentication and authorization system for @missionfabric-js/enzyme**

Comprehensive authentication and role-based access control (RBAC) system with Active Directory integration, SSO, MFA, and enterprise-grade security features.

## Table of Contents

### Getting Started
- [Overview](./OVERVIEW.md) - Module overview, features, and architecture
- [Quick Start](#quick-start) - Get up and running in 5 minutes
- [Common Patterns](./PATTERNS.md) - Real-world usage patterns and examples
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues and solutions

### Core Documentation
- [Authentication Service](./AUTH_SERVICE.md) - Core authentication functionality
- [Auth Provider](./AUTH_PROVIDER.md) - React context provider
- [Hooks](./HOOKS.md) - React hooks reference
- [Route Guards](./GUARDS.md) - Component-based route protection
- [Type Definitions](./TYPES.md) - TypeScript types and interfaces

### Advanced Features
- [RBAC System](./RBAC.md) - Role-based access control
- [Active Directory](./ACTIVE_DIRECTORY.md) - AD/Azure AD integration
- [Security](../SECURITY.md) - Security best practices

### Related Documentation
- [API Module](../api/README.md) - Token injection and API integration
- [Routing Module](../routing/README.md) - Route metadata and navigation
- [State Module](../state/README.md) - Auth state synchronization
- [Security Module](../security/README.md) - Comprehensive security infrastructure
- [Integration Guide](../integration/AUTH_SECURITY_STATE.md) - Auth, security, and state integration

---

## Module Overview

The auth module provides a complete authentication solution with support for:

- **Multiple Authentication Methods**: JWT tokens, session-based auth, Active Directory/Azure AD integration
- **Role-Based Access Control (RBAC)**: Fine-grained permission system with role hierarchies
- **Route Guards**: Protected routes based on authentication status, roles, and permissions
- **Active Directory Integration**: Enterprise-grade AD, Azure AD, Azure AD B2C, and AD FS support
- **Single Sign-On (SSO)**: Cross-tab session synchronization and SSO support
- **Token Management**: Automatic token refresh, secure storage, and expiration handling
- **React Integration**: Hooks, providers, and components for seamless React integration

For a comprehensive overview including key features and architecture, see [OVERVIEW.md](./OVERVIEW.md).

## Architecture

The authentication module is structured into several key components:

```
src/lib/auth/
├── authService.ts          # Core authentication service
├── AuthProvider.tsx        # React context provider
├── useAuth.ts              # Main authentication hook
├── types.ts                # Type definitions
├── authGuards/             # Route protection components
│   ├── RequireAuth.tsx     # Authentication guard
│   ├── RequireRole.tsx     # Role-based guard
│   ├── RequirePermission.tsx # Permission-based guard
│   └── AuthGuardLoading.tsx # Loading component
├── rbac/                   # RBAC engine and utilities
│   ├── rbac-engine.ts      # Core RBAC engine
│   ├── policy-evaluator.ts # Policy evaluation
│   ├── permission-matrix.ts # Permission matrix
│   ├── role-hierarchy.ts   # Role hierarchy management
│   ├── resource-permissions.ts # Resource-level permissions
│   ├── rbac-context.tsx    # RBAC provider
│   └── useRBAC.ts          # RBAC hooks
└── active-directory/       # AD/Azure AD integration
    ├── ad-client.ts        # Graph API client
    ├── ad-config.ts        # Configuration helpers
    ├── ad-provider.tsx     # AD provider component
    ├── ad-token-handler.ts # Token management
    ├── ad-sso.ts           # SSO support
    ├── ad-groups.ts        # Group mapping
    ├── ad-attributes.ts    # Attribute mapping
    └── useActiveDirectory.ts # AD hooks
```

## Quick Start

### Basic Authentication

```tsx
import { AuthProvider, useAuth } from '@/lib/auth';

// Wrap your app with AuthProvider
function App() {
  return (
    <AuthProvider>
      <YourApp />
    </AuthProvider>
  );
}

// Use authentication in components
function LoginButton() {
  const { login, logout, isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
    return (
      <div>
        <span>Welcome, {user?.displayName}</span>
        <button onClick={logout}>Logout</button>
      </div>
    );
  }

  return <button onClick={() => login({ email, password })}>Login</button>;
}
```

### Protected Routes

```tsx
import { RequireAuth, RequireRole } from '@/lib/auth/authGuards';

function ProtectedRoutes() {
  return (
    <Routes>
      {/* Requires authentication */}
      <Route path="/dashboard" element={
        <RequireAuth>
          <Dashboard />
        </RequireAuth>
      } />

      {/* Requires specific role */}
      <Route path="/admin" element={
        <RequireRole roles={['admin']}>
          <AdminPanel />
        </RequireRole>
      } />
    </Routes>
  );
}
```

### RBAC Integration

```tsx
import { RBACProvider, useRBAC } from '@/lib/auth/rbac';

// Configure RBAC
const rbacConfig = {
  roles: [
    {
      id: 'admin',
      name: 'Administrator',
      permissions: ['*'],
      priority: 100
    },
    {
      id: 'user',
      name: 'User',
      permissions: ['read:*'],
      priority: 10
    }
  ],
  defaultDecision: 'deny'
};

// Wrap with RBACProvider
function App() {
  const { user } = useAuth();

  return (
    <RBACProvider
      config={rbacConfig}
      user={user}
      userRoles={user?.roles}
    >
      <YourApp />
    </RBACProvider>
  );
}

// Use RBAC in components
function FeatureComponent() {
  const { canCreate, canDelete, hasPermission } = useRBAC();

  return (
    <div>
      {canCreate('documents') && <CreateButton />}
      {canDelete('documents') && <DeleteButton />}
      {hasPermission('reports:export') && <ExportButton />}
    </div>
  );
}
```

### Active Directory Integration

```tsx
import { ADProvider, useActiveDirectory, createADConfig } from '@/lib/auth/active-directory';

// Configure Azure AD
const adConfig = createADConfig('azure-ad', {
  tenantId: process.env.AZURE_AD_TENANT_ID,
  clientId: process.env.AZURE_AD_CLIENT_ID,
  redirectUri: window.location.origin,
});

// Wrap with ADProvider
function App() {
  return (
    <ADProvider
      config={adConfig}
      enableSSO
      groupMappings="azureSecurityGroups"
    >
      <YourApp />
    </ADProvider>
  );
}

// Use AD authentication
function LoginPage() {
  const { login, isAuthenticated, user, isInGroup } = useActiveDirectory();

  if (!isAuthenticated) {
    return <button onClick={() => login()}>Sign in with Azure AD</button>;
  }

  return (
    <div>
      <h1>Welcome, {user?.displayName}</h1>
      {isInGroup('sg-app-admins') && <AdminPanel />}
    </div>
  );
}
```

## Core Features

### Authentication Service

The auth service provides core authentication functionality:

- User login/logout
- Token management (access & refresh tokens)
- Session persistence
- Password reset flows
- Email verification
- MFA support

See [AUTH_SERVICE.md](./AUTH_SERVICE.md) for detailed documentation.

### Auth Provider

React context provider for authentication state:

- Global authentication state management
- Automatic token refresh
- Session persistence and restoration
- Loading states
- Error handling

See [AUTH_PROVIDER.md](./AUTH_PROVIDER.md) for detailed documentation.

### Authentication Hooks

React hooks for accessing authentication state and actions:

- `useAuth()` - Main authentication hook
- `useAuthState()` - Read-only authentication state
- `useAuthActions()` - Authentication actions only

See [HOOKS.md](./HOOKS.md) for detailed documentation.

### Route Guards

Components for protecting routes based on authentication and permissions:

- `<RequireAuth>` - Requires authentication
- `<RequireRole>` - Requires specific role(s)
- `<RequirePermission>` - Requires specific permission(s)
- `<AuthGuardLoading>` - Customizable loading component

See [GUARDS.md](./GUARDS.md) for detailed documentation.

### RBAC System

Comprehensive role-based access control with:

- Role hierarchy
- Permission matrix
- Policy evaluation
- Resource-level permissions
- Dynamic permission checking
- Wildcard permissions
- Context-aware access control

See [RBAC.md](./RBAC.md) for detailed documentation.

### Active Directory Integration

Enterprise-grade Active Directory support:

- Azure AD
- Azure AD B2C
- AD FS
- On-premises AD (via LDAP)
- Microsoft Graph API integration
- Group membership resolution
- SSO support
- Token management
- Attribute mapping

See [ACTIVE_DIRECTORY.md](./ACTIVE_DIRECTORY.md) for detailed documentation.

## Security Best Practices

### Token Storage

Tokens are stored securely using encrypted storage:

- **Encryption**: AES-GCM encryption for all stored tokens
- **Session Keys**: Cryptographically random session keys
- **Storage Options**: SessionStorage (default), LocalStorage, or Memory
- **Automatic Cleanup**: Tokens cleared on logout

```tsx
// Tokens are automatically encrypted when stored
const authConfig = {
  tokenStorage: 'sessionStorage', // Encrypted by default
  autoRefresh: true,
  refreshBuffer: 300000, // 5 minutes before expiry
};
```

### Authentication Flows

Always use the built-in authentication flows:

```tsx
// Good: Use the auth service
const { login } = useAuth();
await login({ email, password });

// Bad: Manual token handling
localStorage.setItem('token', token); // Insecure!
```

### CSRF Protection

Enable CSRF protection for all state-changing operations:

```tsx
const authConfig = {
  csrf: {
    enabled: true,
    headerName: 'X-CSRF-Token',
  },
};
```

### Secure Redirects

Always validate redirect URLs to prevent open redirect vulnerabilities:

```tsx
const { login } = useAuth();

// Good: Relative URL
await login({ email, password }, { redirectTo: '/dashboard' });

// Good: Validated absolute URL
await login({ email, password }, { redirectTo: window.location.origin + '/dashboard' });

// Bad: Unvalidated external URL
await login({ email, password }, { redirectTo: userInput }); // Security risk!
```

### Permission Checking

Always check permissions on both client and server:

```tsx
// Client-side: UI control
function DeleteButton({ documentId }) {
  const { canDelete } = useRBAC();

  if (!canDelete('documents')) {
    return null; // Hide button
  }

  return <button onClick={handleDelete}>Delete</button>;
}

// Server-side: Enforce permission
app.delete('/api/documents/:id', requirePermission('documents:delete'), async (req, res) => {
  // Delete document
});
```

### Token Expiration

Handle token expiration gracefully:

```tsx
const authConfig = {
  silentRefresh: true, // Auto-refresh tokens
  refreshBuffer: 300000, // Refresh 5 minutes before expiry
  onTokenExpired: () => {
    // Redirect to login or show re-auth prompt
  },
};
```

## Configuration

### Environment Variables

```env
# Basic Auth
AUTH_SECRET=your-secret-key-min-32-chars
AUTH_TOKEN_EXPIRY=3600
AUTH_REFRESH_TOKEN_EXPIRY=604800

# Azure AD
AZURE_AD_TENANT_ID=your-tenant-id
AZURE_AD_CLIENT_ID=your-client-id
AZURE_AD_CLIENT_SECRET=your-client-secret

# Feature Flags
FEATURE_RBAC=true
FEATURE_AD_AUTH=true
FEATURE_MFA=true
```

### Auth Configuration

```tsx
import { createAuthConfig } from '@/lib/auth';

const authConfig = createAuthConfig({
  // Token settings
  tokenExpiry: 3600, // 1 hour
  refreshTokenExpiry: 604800, // 7 days
  autoRefresh: true,
  refreshBuffer: 300000, // 5 minutes

  // Storage
  tokenStorage: 'sessionStorage',

  // Security
  csrf: { enabled: true },
  secureCookies: true,

  // Features
  features: {
    mfa: true,
    passwordReset: true,
    emailVerification: true,
  },
});
```

## Documentation Index

### Core Functionality
| Document | Description |
|----------|-------------|
| [OVERVIEW.md](./OVERVIEW.md) | Complete module overview, architecture, and integration points |
| [AUTH_SERVICE.md](./AUTH_SERVICE.md) | Core authentication service API reference |
| [AUTH_PROVIDER.md](./AUTH_PROVIDER.md) | React context provider configuration and usage |
| [HOOKS.md](./HOOKS.md) | Complete hooks reference (useAuth, useUser, etc.) |
| [GUARDS.md](./GUARDS.md) | Route protection components (RequireAuth, RequireRole, etc.) |
| [TYPES.md](./TYPES.md) | TypeScript type definitions and interfaces |

### Advanced Features
| Document | Description |
|----------|-------------|
| [RBAC.md](./RBAC.md) | Role-Based Access Control engine and configuration |
| [ACTIVE_DIRECTORY.md](./ACTIVE_DIRECTORY.md) | Azure AD, AD FS, and on-premises AD integration |
| [PATTERNS.md](./PATTERNS.md) | 8 common patterns with complete code examples |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Solutions for common issues and debugging tips |

### Related Resources
| Document | Description |
|----------|-------------|
| [../SECURITY.md](../SECURITY.md) | Security best practices and guidelines |
| [../security/README.md](../security/README.md) | Security module - XSS, CSRF, CSP, and secure storage |
| [../security/CSRF.md](../security/CSRF.md) | CSRF protection for authentication requests |
| [../security/SECURE_STORAGE.md](../security/SECURE_STORAGE.md) | Encrypted token storage |
| [../api/README.md](../api/README.md) | API integration and token management |
| [../routing/README.md](../routing/README.md) | Route guards and navigation integration |
| [../config/README.md](../config/README.md) | Configuration management |

## Common Use Cases

### Role-Based Access

```tsx
import { useRBAC } from '@/lib/auth/rbac';

function Dashboard() {
  const { hasRole, canAccess, isAdmin } = useRBAC();

  return (
    <div>
      {isAdmin && <AdminWidget />}
      {hasRole('manager') && <ManagerWidget />}
      {canAccess('reports', 'read') && <ReportsWidget />}
    </div>
  );
}
```

### Permission-Based Features

```tsx
import { useRBAC } from '@/lib/auth/rbac';

function DocumentActions({ document }) {
  const { canCreate, canUpdate, canDelete } = useRBAC();

  return (
    <div>
      {canCreate('documents') && <CreateButton />}
      {canUpdate('documents') && <EditButton document={document} />}
      {canDelete('documents') && <DeleteButton document={document} />}
    </div>
  );
}
```

### AD Group-Based Access

```tsx
import { useActiveDirectory } from '@/lib/auth/active-directory';

function FeatureGate() {
  const { isInGroup, isInAnyGroup } = useActiveDirectory();

  if (!isInAnyGroup(['sg-app-users', 'sg-app-admins'])) {
    return <AccessDenied />;
  }

  return (
    <div>
      {isInGroup('sg-app-admins') && <AdminFeatures />}
      {isInGroup('sg-app-powerusers') && <PowerUserFeatures />}
      <StandardFeatures />
    </div>
  );
}
```

### Resource-Level Permissions

```tsx
import { useResourceAccess } from '@/lib/auth/rbac';

function DocumentViewer({ documentId }) {
  const { checkResource, canRead, canUpdate, canDelete } = useResourceAccess('documents');

  const canViewThis = checkResource(documentId, 'read');
  const canEditThis = checkResource(documentId, 'update');
  const canDeleteThis = checkResource(documentId, 'delete');

  if (!canViewThis) {
    return <AccessDenied />;
  }

  return (
    <div>
      <DocumentContent />
      {canEditThis && <EditButton />}
      {canDeleteThis && <DeleteButton />}
    </div>
  );
}
```

## Testing

### Mocking Authentication

```tsx
import { renderWithAuth } from '@/lib/auth/test-utils';

describe('ProtectedComponent', () => {
  it('renders for authenticated users', () => {
    const { getByText } = renderWithAuth(<ProtectedComponent />, {
      user: {
        id: '1',
        email: 'test@example.com',
        roles: ['user'],
      },
      isAuthenticated: true,
    });

    expect(getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects for unauthenticated users', () => {
    const { queryByText } = renderWithAuth(<ProtectedComponent />, {
      isAuthenticated: false,
    });

    expect(queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
```

### Mocking RBAC

```tsx
import { renderWithRBAC } from '@/lib/auth/rbac/test-utils';

describe('AdminPanel', () => {
  it('renders for admin users', () => {
    const { getByText } = renderWithRBAC(<AdminPanel />, {
      user: { id: '1', email: 'admin@example.com' },
      userRoles: ['admin'],
      config: {
        roles: [{ id: 'admin', name: 'Admin', permissions: ['*'] }],
      },
    });

    expect(getByText('Admin Panel')).toBeInTheDocument();
  });
});
```

## Troubleshooting

### Token Refresh Issues

If tokens are not refreshing automatically:

1. Check `autoRefresh` is enabled
2. Verify refresh token is present
3. Check token expiry times
4. Ensure refresh endpoint is configured correctly

```tsx
const { refreshTokens, error } = useAuth();

useEffect(() => {
  if (error?.code === 'token_expired') {
    refreshTokens().catch(console.error);
  }
}, [error]);
```

### Permission Denied

If permission checks are failing unexpectedly:

1. Verify user roles are assigned correctly
2. Check RBAC configuration
3. Ensure permissions are properly defined
4. Check for typos in permission strings

```tsx
const { userRoles, effectivePermissions } = useRBAC();

console.log('User roles:', userRoles);
console.log('Effective permissions:', effectivePermissions);
```

### AD Authentication Issues

If AD authentication is failing:

1. Verify AD configuration (tenant ID, client ID)
2. Check redirect URI matches Azure AD configuration
3. Ensure required scopes are requested
4. Check network connectivity to Azure AD endpoints

```tsx
const { error, clearError } = useActiveDirectory();

if (error) {
  console.error('AD Error:', error);
  // Handle specific error codes
  if (error.code === 'interaction_required') {
    // Trigger interactive login
  }
}
```

## Migration Guide

### From v1 to v2

```tsx
// v1
import { useAuth } from '@/lib/auth';
const { user, login } = useAuth();

// v2 (no changes needed)
import { useAuth } from '@/lib/auth';
const { user, login } = useAuth();
```

### Adding RBAC to Existing App

```tsx
// Step 1: Define roles
const rbacConfig = {
  roles: [
    { id: 'admin', permissions: ['*'], priority: 100 },
    { id: 'user', permissions: ['read:*'], priority: 10 },
  ],
};

// Step 2: Wrap with provider
<RBACProvider config={rbacConfig} user={user} userRoles={user?.roles}>
  <App />
</RBACProvider>

// Step 3: Use in components
const { canAccess } = useRBAC();
if (canAccess('documents', 'create')) {
  // Show create button
}
```

## Additional Resources

### Learning Paths

**New to Authentication?**
1. Read the [Overview](./OVERVIEW.md) to understand the module
2. Follow the [Quick Start](#quick-start) guide above
3. Explore [Common Patterns](./PATTERNS.md) for real-world examples

**Implementing RBAC?**
1. Start with [RBAC.md](./RBAC.md) for core concepts
2. See [PATTERNS.md - Pattern 3](./PATTERNS.md#pattern-3-role-based-access-control) for implementation
3. Check [TROUBLESHOOTING.md - RBAC Issues](./TROUBLESHOOTING.md#rbac-issues) for common problems

**Integrating Active Directory?**
1. Review [ACTIVE_DIRECTORY.md](./ACTIVE_DIRECTORY.md) for setup
2. See [PATTERNS.md - Pattern 2](./PATTERNS.md#pattern-2-active-directory-integration) for examples
3. Check [TROUBLESHOOTING.md - AD Issues](./TROUBLESHOOTING.md#active-directory-issues) for solutions

**Security Concerns?**
1. Review [../SECURITY.md](../SECURITY.md) for best practices
2. See [AUTH_SERVICE.md - Security](./AUTH_SERVICE.md#security-considerations) for implementation
3. Check [TROUBLESHOOTING.md - Security Issues](./TROUBLESHOOTING.md#security-issues) for common vulnerabilities

### Feature Matrix

| Feature | Basic Auth | AD Integration | RBAC | SSO | MFA |
|---------|-----------|----------------|------|-----|-----|
| Login/Logout | ✓ | ✓ | ✓ | ✓ | ✓ |
| Token Management | ✓ | ✓ | ✓ | ✓ | ✓ |
| Role-Based Access | - | ✓ | ✓ | ✓ | ✓ |
| Permission System | - | - | ✓ | ✓ | ✓ |
| Group Mapping | - | ✓ | ✓ | ✓ | ✓ |
| Cross-Tab Sync | ✓ | ✓ | ✓ | ✓ | ✓ |
| Password Reset | ✓ | - | ✓ | - | ✓ |
| 2FA/MFA | ✓ | ✓ | ✓ | ✓ | ✓ |

### Configuration Quick Reference

```tsx
// Basic Authentication
<AuthProvider config={{
  loginEndpoint: '/api/auth/login',
  autoRefresh: true,
  persistAuth: true,
}}>

// Active Directory
<ADProvider config={{
  providerType: 'azure-ad',
  azure: { tenantId, clientId },
  enableSSO: true,
}}>

// RBAC
<RBACProvider config={{
  roles: { admin: { permissions: ['*'] } },
  defaultDecision: 'deny',
}}>
```

See [OVERVIEW.md - Configuration](./OVERVIEW.md#getting-started) for complete configuration options.

## Support & Contributing

### Getting Help
- [Troubleshooting Guide](./TROUBLESHOOTING.md) - Common issues and solutions
- [GitHub Issues](https://github.com/your-org/enzyme/issues) - Report bugs
- [Documentation](https://docs.enzyme.dev) - Full documentation
- [Discord Community](https://discord.gg/enzyme) - Community support

### Contributing
- [Contributing Guide](../../CONTRIBUTING.md) - How to contribute
- [Code of Conduct](../../CODE_OF_CONDUCT.md) - Community guidelines
- [Development Setup](../../DEVELOPMENT.md) - Local development

## Version Information

**Current Version:** 3.0.0
**Last Updated:** 2025-11-29
**Stability:** Stable
**Breaking Changes:** See [CHANGELOG](../../CHANGELOG.md)

## License

MIT License - see [LICENSE](../../LICENSE) file for details
