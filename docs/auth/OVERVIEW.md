# Authentication Module Overview

> **Purpose:** Enterprise authentication and authorization system with Active Directory integration, RBAC, SSO, and comprehensive security features.

## Introduction

The Auth module provides a complete identity and access management solution for React applications. It handles everything from basic authentication flows to complex enterprise requirements like Active Directory integration, Single Sign-On (SSO), Multi-Factor Authentication (MFA), and Role-Based Access Control (RBAC).

Built with security and scalability in mind, this module supports multiple authentication providers (Azure AD, ADFS, B2C, on-premises AD), fine-grained permission systems, and seamless integration with routing guards and API security.

Whether you're building a simple login system or implementing enterprise-grade access control with complex role hierarchies and conditional permissions, this module provides the patterns and tools needed.

## Key Features

### Authentication
- **User Authentication**: Secure login/logout with JWT token management
- **Session Management**: Persistent sessions across tabs and page refreshes
- **Token Management**: Automatic token refresh and renewal
- **Password Management**: Reset, change, and recovery flows
- **Email Verification**: Email-based account verification
- **Multi-Factor Authentication (MFA)**: TOTP-based 2FA support

### Active Directory Integration
- **Azure AD**: Full support for Azure Active Directory
- **Azure AD B2C**: Consumer identity and access management
- **AD FS**: Active Directory Federation Services integration
- **On-Premises AD**: Direct LDAP integration for legacy systems
- **Single Sign-On (SSO)**: Cross-domain and cross-tab session sharing
- **Group Mapping**: Automatic role assignment from AD groups
- **Attribute Extraction**: Custom attribute mapping from tokens
- **Microsoft Graph API**: Full Graph API integration for user data

### Authorization & Access Control
- **Role-Based Access Control (RBAC)**: Comprehensive RBAC engine
- **Permission Matrix**: Efficient permission lookup and management
- **Role Hierarchy**: Parent-child relationships with inheritance
- **Resource-Level Permissions**: Fine-grained access control per resource
- **Policy-Based Authorization**: Conditional access with policies
- **Wildcard Permissions**: Flexible permission patterns
- **Dynamic Permission Checks**: Runtime permission evaluation

### React Integration
- **Auth Provider**: Global authentication state management
- **React Hooks**: Comprehensive hook library for auth operations
- **Route Guards**: Component-based route protection
  - `RequireAuth` - Authentication guard
  - `RequireRole` - Role-based guard
  - `RequirePermission` - Permission-based guard
- **Loading States**: Built-in loading and error handling
- **TypeScript Support**: Full type safety and IntelliSense

### Security Features
- **Secure Token Storage**: AES-GCM encrypted token storage
- **CSRF Protection**: Built-in cross-site request forgery protection
- **Secure Cookies**: HttpOnly, Secure, SameSite cookie support
- **Session Timeout**: Configurable session and inactivity timeouts
- **Audit Logging**: Comprehensive authentication event logging
- **XSS Prevention**: Automatic output encoding and sanitization

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

### File Structure

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

## Integration Points

The Auth module integrates with other parts of the enzyme system:

### Routing Module
- **Route Guards**: Protect routes based on auth state, roles, and permissions
- **Route Metadata**: Define authentication requirements per route
- **Navigation**: Automatic redirects for unauthorized access

See: [Routing Module Documentation](../routing/README.md)

### API Module
- **Token Injection**: Automatic Bearer token injection via interceptors
- **Token Refresh**: Automatic token refresh on 401 responses
- **Request Signing**: CSRF token inclusion in state-changing requests

See: [API Module Documentation](../api/README.md)

### State Module
- **Auth State Sync**: Synchronize auth state with global state
- **User Preferences**: Store user-specific preferences
- **Session Persistence**: Persist auth state across sessions

See: [State Module Documentation](../state/README.md)

### Security Module
- **CSRF Tokens**: Generate and validate CSRF tokens
- **Secure Storage**: Encrypted storage for sensitive data
- **XSS Prevention**: Sanitization and output encoding
- **CSP Integration**: Content Security Policy support

See: [Security Documentation](../SECURITY.md)

## Performance Characteristics

### Bundle Sizes (gzipped)
- **Core Auth**: ~12 KB
- **RBAC Engine**: ~8 KB
- **Active Directory**: ~15 KB
- **Total (all features)**: ~35 KB

### Optimization Features
- **Token Storage**: In-memory storage option for minimal footprint
- **Token Refresh**: Background refresh prevents interruptions
- **Permission Caching**: Cached permission checks reduce computations
- **SSO Sync**: Efficient BroadcastChannel for cross-tab sync
- **Lazy Loading**: AD and RBAC modules can be loaded on-demand
- **Tree Shaking**: Unused features are eliminated by bundlers

### Runtime Performance
- **Token Validation**: ~0.1ms (cached)
- **Permission Check**: ~0.5ms (cached), ~2ms (uncached)
- **RBAC Evaluation**: ~1-3ms for complex policies
- **AD Token Refresh**: ~100-300ms (network dependent)

## Component Exports

### React Components
```tsx
import {
  AuthProvider,        // Core authentication context provider
  ADProvider,          // Active Directory authentication provider
  RBACProvider,        // Role-based access control provider
  RequireAuth,         // Route guard requiring authentication
  RequireRole,         // Route guard requiring specific role
  RequirePermission,   // Route guard requiring specific permission
  AuthGuardLoading,    // Loading state for auth guards
} from '@/lib/auth';
```

### Hooks
```tsx
import {
  useAuth,             // Access authentication state and methods
  useAuthState,        // Read-only authentication state
  useAuthActions,      // Authentication actions only
  useUser,             // Current user information
  useTokens,           // Token access and management
  useHasRole,          // Check if user has specific role
  useHasPermission,    // Check if user has specific permission
  useActiveDirectory,  // Access Active Directory features
  useRBAC,             // Access RBAC engine and permission checks
  usePermissions,      // Get user's permissions list
  useRoles,            // Get user's roles list
  useResourceAccess,   // Check access to specific resource
  usePermissionGate,   // Conditional rendering based on permissions
  useRoleGate,         // Conditional rendering based on roles
  useAccessChecks,     // Batch permission checks
} from '@/lib/auth';
```

### Services
```tsx
import {
  authService,         // Core authentication service
  ADClient,            // Active Directory client
  ADTokenHandler,      // Token acquisition and refresh
  SSOManager,          // Single Sign-On orchestration
  CrossDomainSSO,      // Cross-domain SSO support
  ADGroupMapper,       // Map AD groups to application roles
  ADAttributeMapper,   // Extract user attributes from tokens
  RBACEngine,          // Core permission evaluation engine
  PermissionMatrixBuilder, // Build permission matrices
  RoleHierarchyManager,    // Manage role inheritance
  ResourcePermissionManager, // Resource-level permissions
  PolicyEvaluator,     // Evaluate authorization policies
} from '@/lib/auth';
```

### Utilities
```tsx
import {
  routeMetadata,       // Define route authentication requirements
  getRouteAuthConfig,  // Get auth config for route
  canAccessRoute,      // Check if user can access route
  createRoleGuard,     // Factory for role guards
  createPermissionGuard, // Factory for permission guards
  validateADConfig,    // Validate AD configuration
  mergeGroupMappings,  // Combine group mappings
} from '@/lib/auth';
```

## Getting Started

### Basic Setup

1. **Wrap your app with AuthProvider**:

```tsx
import { AuthProvider } from '@/lib/auth';

function App() {
  return (
    <AuthProvider>
      <YourApp />
    </AuthProvider>
  );
}
```

2. **Use authentication in components**:

```tsx
import { useAuth } from '@/lib/auth';

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
```

3. **Protect routes**:

```tsx
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

## Next Steps

- **[Common Patterns](./PATTERNS.md)** - Learn common usage patterns and best practices
- **[Authentication Service](./AUTH_SERVICE.md)** - Core authentication functionality
- **[React Hooks](./HOOKS.md)** - Complete hook reference
- **[Route Guards](./GUARDS.md)** - Protecting routes and components
- **[RBAC System](./RBAC.md)** - Role-based access control
- **[Active Directory](./ACTIVE_DIRECTORY.md)** - AD integration guide
- **[Troubleshooting](./TROUBLESHOOTING.md)** - Common issues and solutions
- **[Security](../SECURITY.md)** - Security best practices

## Version Information

**Current Version:** 3.0.0
**Last Updated:** 2025-11-29
**Stability:** Stable
**Breaking Changes:** See [CHANGELOG](../../CHANGELOG.md)

## Support & Contributing

For issues, questions, or contributions:
- [GitHub Issues](https://github.com/your-org/enzyme/issues)
- [Documentation](https://docs.enzyme.dev)
- [API Reference](./TYPES.md)
- [Contributing Guide](../../CONTRIBUTING.md)
