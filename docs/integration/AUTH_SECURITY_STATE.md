# Auth + Security + State Integration Guide

> **Harbor React Framework** - Comprehensive integration patterns for authentication, security, and state management.

## Table of Contents
- [Provider Composition](#provider-composition)
- [Authentication + Secure Storage](#authentication--secure-storage)
- [Auth Guards + State](#auth-guards--state)
- [CSRF + Authenticated Requests](#csrf--authenticated-requests)
- [Role-Based UI](#role-based-ui)
- [Session Persistence](#session-persistence)
- [Multi-Tenant Patterns](#multi-tenant-patterns)
- [Common Mistakes](#common-mistakes)

---

## Provider Composition

### Correct Nesting Order

```
┌─────────────────────────────────────────────────────────┐
│  SecurityProvider (outermost - CSP, base security)      │
│  ┌───────────────────────────────────────────────────┐  │
│  │  AuthProvider (auth context, token management)    │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │  StoreProvider (Zustand state)              │  │  │
│  │  │  ┌───────────────────────────────────────┐  │  │  │
│  │  │  │  App Components                       │  │  │  │
│  │  │  └───────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

#### Example 1: Root Provider Setup

```tsx
// app/RootProviders.tsx
import { SecurityProvider } from '@/lib/security';
import { AuthProvider } from '@/lib/auth';
import { StoreProvider } from '@/lib/state';

export function RootProviders({ children }: { children: React.ReactNode }) {
  return (
    <SecurityProvider
      cspConfig={{ defaultSrc: ["'self'"], scriptSrc: ["'self'"] }}
      enableCSRF={true}
    >
      <AuthProvider
        storage="secure" // Uses SecureStorage from security module
        tokenRefreshThreshold={300}
      >
        <StoreProvider>
          {children}
        </StoreProvider>
      </AuthProvider>
    </SecurityProvider>
  );
}
```

#### Example 2: Why This Order Matters

```tsx
// CORRECT: Security wraps Auth - CSRF token available for auth requests
<SecurityProvider>
  <AuthProvider>
    {/* Auth can use CSRF tokens for login/logout */}
  </AuthProvider>
</SecurityProvider>

// INCORRECT: Auth wraps Security - CSRF not available during auth
<AuthProvider>
  <SecurityProvider>
    {/* Login requests won't have CSRF protection! */}
  </SecurityProvider>
</AuthProvider>
```

---

## Authentication + Secure Storage

### Example 3: Encrypted Token Storage

```tsx
import { useAuth } from '@/lib/auth';
import { useSecureStorage } from '@/lib/security';

export function useSecureAuth() {
  const { user, tokens } = useAuth();
  const secureStorage = useSecureStorage();

  // Store sensitive user data encrypted
  const storeUserSecrets = async (secrets: UserSecrets) => {
    await secureStorage.setItem(
      `user:${user.id}:secrets`,
      JSON.stringify(secrets),
      { encrypt: true, expiry: tokens.expiresAt }
    );
  };

  // Retrieve with automatic decryption
  const getUserSecrets = async (): Promise<UserSecrets | null> => {
    const data = await secureStorage.getItem(`user:${user.id}:secrets`);
    return data ? JSON.parse(data) : null;
  };

  return { storeUserSecrets, getUserSecrets };
}
```

### Example 4: Secure Token Refresh Flow

```tsx
import { useAuth, authService } from '@/lib/auth';
import { useStore } from '@/lib/state';
import { useCSRFToken } from '@/lib/security';

export function useSecureTokenRefresh() {
  const { refreshToken } = useAuth();
  const csrfToken = useCSRFToken();
  const setSession = useStore((s) => s.setSession);

  const secureRefresh = async () => {
    try {
      // Include CSRF token in refresh request
      const newTokens = await authService.refreshTokens({
        headers: { 'X-CSRF-Token': csrfToken }
      });

      // Update state with new session info
      setSession({
        lastRefresh: Date.now(),
        expiresAt: newTokens.expiresAt
      });

      return newTokens;
    } catch (error) {
      // Clear state on refresh failure
      setSession(null);
      throw error;
    }
  };

  return { secureRefresh };
}
```

### Example 5: Auto-Encrypting User Preferences

```tsx
import { useAuth } from '@/lib/auth';
import { SecureStorage } from '@/lib/security';
import { useStore } from '@/lib/state';

export function useSecurePreferences() {
  const { user, isAuthenticated } = useAuth();
  const preferences = useStore((s) => s.preferences);
  const setPreferences = useStore((s) => s.setPreferences);

  // Sync preferences with encrypted storage
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const loadPreferences = async () => {
      const stored = await SecureStorage.getItem(`prefs:${user.id}`);
      if (stored) {
        setPreferences(JSON.parse(stored));
      }
    };

    loadPreferences();
  }, [isAuthenticated, user?.id]);

  // Save preferences encrypted
  const savePreferences = async (newPrefs: Partial<Preferences>) => {
    const merged = { ...preferences, ...newPrefs };
    setPreferences(merged);

    if (user) {
      await SecureStorage.setItem(
        `prefs:${user.id}`,
        JSON.stringify(merged)
      );
    }
  };

  return { preferences, savePreferences };
}
```

---

## Auth Guards + State

### Example 6: State-Aware Auth Guard

```tsx
import { RequireAuth } from '@/lib/auth/authGuards';
import { useStore } from '@/lib/state';

export function RequireOnboarded({ children }: { children: React.ReactNode }) {
  const hasCompletedOnboarding = useStore((s) => s.session?.onboardingComplete);

  return (
    <RequireAuth fallback={<Navigate to="/login" />}>
      {hasCompletedOnboarding ? (
        children
      ) : (
        <Navigate to="/onboarding" />
      )}
    </RequireAuth>
  );
}
```

### Example 7: Permission Guard with State Cache

```tsx
import { RequirePermission } from '@/lib/auth/authGuards';
import { useStore } from '@/lib/state';
import { useMemo } from 'react';

export function RequireCachedPermission({
  permission,
  children,
  fallback
}: {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const cachedPermissions = useStore((s) => s.session?.permissions ?? []);

  // Check cache first for instant rendering
  const hasCachedPermission = useMemo(
    () => cachedPermissions.includes(permission),
    [cachedPermissions, permission]
  );

  if (hasCachedPermission) {
    return <>{children}</>;
  }

  // Fall back to server validation
  return (
    <RequirePermission permission={permission} fallback={fallback}>
      {children}
    </RequirePermission>
  );
}
```

### Example 8: Nested Role + Permission Guards

```tsx
import { RequireRole, RequirePermission } from '@/lib/auth/authGuards';

// Admin section requiring both role AND specific permission
export function AdminDashboard() {
  return (
    <RequireRole
      role="admin"
      fallback={<AccessDenied reason="Admin role required" />}
    >
      <RequirePermission
        permission="dashboard:view"
        fallback={<AccessDenied reason="Dashboard permission required" />}
      >
        <DashboardContent />
      </RequirePermission>
    </RequireRole>
  );
}

// Composable guard pattern
export function RequireAdminWithPermission({
  permission,
  children
}: {
  permission: string;
  children: React.ReactNode;
}) {
  return (
    <RequireRole role="admin">
      <RequirePermission permission={permission}>
        {children}
      </RequirePermission>
    </RequireRole>
  );
}
```

### Example 9: Dynamic Guards from State

```tsx
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/state';

export function DynamicFeatureGuard({
  featureKey,
  children
}: {
  featureKey: string;
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const featureAccess = useStore((s) => s.featureAccess);

  // Combine user tier + feature configuration from state
  const hasAccess = useMemo(() => {
    const feature = featureAccess[featureKey];
    if (!feature) return false;

    return feature.allowedTiers.includes(user?.tier ?? 'free');
  }, [featureAccess, featureKey, user?.tier]);

  if (!hasAccess) {
    return <UpgradePrompt feature={featureKey} />;
  }

  return <>{children}</>;
}
```

---

## CSRF + Authenticated Requests

### Example 10: CSRF-Protected API Client

```tsx
import { useAuth } from '@/lib/auth';
import { useCSRFToken } from '@/lib/security';
import { createResourceClient } from '@/lib/services';

export function useSecureApiClient() {
  const { getAccessToken } = useAuth();
  const csrfToken = useCSRFToken();

  const client = useMemo(() => {
    return createResourceClient({
      baseURL: '/api',
      tokenProvider: getAccessToken,
      headers: {
        'X-CSRF-Token': csrfToken
      }
    });
  }, [getAccessToken, csrfToken]);

  return client;
}
```

### Example 11: Secure Form Submission

```tsx
import { useAuth } from '@/lib/auth';
import { useCSRFToken, useSanitizedInput } from '@/lib/security';
import { useStore } from '@/lib/state';

export function SecureContactForm() {
  const { user } = useAuth();
  const csrfToken = useCSRFToken();
  const addNotification = useStore((s) => s.addNotification);
  const sanitize = useSanitizedInput();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Sanitize all inputs
    const sanitizedData = {
      name: sanitize(formData.get('name') as string),
      message: sanitize(formData.get('message') as string),
      email: user?.email // Use authenticated email
    };

    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        'Authorization': `Bearer ${await getAccessToken()}`
      },
      body: JSON.stringify(sanitizedData)
    });

    if (response.ok) {
      addNotification({ type: 'success', message: 'Message sent!' });
    }
  };

  return <form onSubmit={handleSubmit}>{/* ... */}</form>;
}
```

### Example 12: Mutation with CSRF + Optimistic Update

```tsx
import { useAuth } from '@/lib/auth';
import { useCSRFToken } from '@/lib/security';
import { useStore } from '@/lib/state';
import { useOptimisticMutation } from '@/lib/services';

export function useSecureUpdateProfile() {
  const { user, getAccessToken } = useAuth();
  const csrfToken = useCSRFToken();
  const updateUserInStore = useStore((s) => s.updateUser);

  return useOptimisticMutation({
    mutationFn: async (updates: ProfileUpdates) => {
      const response = await fetch(`/api/users/${user!.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
          'Authorization': `Bearer ${await getAccessToken()}`
        },
        body: JSON.stringify(updates)
      });
      return response.json();
    },
    // Optimistic update in state
    onMutate: (updates) => {
      const previous = { ...user };
      updateUserInStore(updates);
      return { previous };
    },
    // Rollback on error
    onError: (_, __, context) => {
      if (context?.previous) {
        updateUserInStore(context.previous);
      }
    }
  });
}
```

---

## Role-Based UI

### Example 13: Role-Conditional Rendering

```tsx
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/state';

export function useRoleBasedUI() {
  const { user } = useAuth();
  const uiConfig = useStore((s) => s.uiConfig);

  const canEdit = user?.roles.includes('editor') || user?.roles.includes('admin');
  const canDelete = user?.roles.includes('admin');
  const canViewAnalytics = user?.permissions.includes('analytics:view');

  return {
    canEdit,
    canDelete,
    canViewAnalytics,
    showAdvancedFeatures: uiConfig.showAdvanced && canEdit
  };
}

// Usage in component
export function DocumentActions({ documentId }: { documentId: string }) {
  const { canEdit, canDelete } = useRoleBasedUI();

  return (
    <div className="actions">
      {canEdit && <Button onClick={() => edit(documentId)}>Edit</Button>}
      {canDelete && <Button variant="danger" onClick={() => del(documentId)}>Delete</Button>}
    </div>
  );
}
```

### Example 14: Dynamic Navigation by Role

```tsx
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/state';
import { NavLink } from '@/lib/routing';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', roles: ['user', 'admin'] },
  { path: '/users', label: 'Users', roles: ['admin'] },
  { path: '/settings', label: 'Settings', roles: ['admin', 'manager'] },
  { path: '/reports', label: 'Reports', permissions: ['reports:view'] }
];

export function RoleBasedNav() {
  const { user } = useAuth();
  const navState = useStore((s) => s.navigation);

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.roles && !item.roles.some((r) => user?.roles.includes(r))) {
      return false;
    }
    if (item.permissions && !item.permissions.some((p) => user?.permissions.includes(p))) {
      return false;
    }
    return true;
  });

  return (
    <nav aria-label="Main navigation">
      {visibleItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          isActive={navState.currentPath === item.path}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
```

### Example 15: Secure Data Masking by Role

```tsx
import { useAuth } from '@/lib/auth';
import { useSanitizedContent } from '@/lib/security';

export function SensitiveDataDisplay({ data }: { data: SensitiveRecord }) {
  const { user } = useAuth();
  const sanitize = useSanitizedContent();

  const canViewPII = user?.permissions.includes('pii:view');
  const canViewFinancial = user?.permissions.includes('financial:view');

  return (
    <dl>
      <dt>Name</dt>
      <dd>{sanitize(data.name)}</dd>

      <dt>Email</dt>
      <dd>{canViewPII ? data.email : maskEmail(data.email)}</dd>

      <dt>SSN</dt>
      <dd>{canViewPII ? data.ssn : '***-**-****'}</dd>

      <dt>Salary</dt>
      <dd>{canViewFinancial ? formatCurrency(data.salary) : '[REDACTED]'}</dd>
    </dl>
  );
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  return `${local[0]}***@${domain}`;
}
```

---

## Session Persistence

### Example 16: Encrypted Session Hydration

```tsx
import { useAuth, authService } from '@/lib/auth';
import { SecureStorage } from '@/lib/security';
import { useStore } from '@/lib/state';
import { useHydration } from '@/lib/hydration';

export function useSessionHydration() {
  const { login, isAuthenticated } = useAuth();
  const hydrateSession = useStore((s) => s.hydrateSession);
  const { markHydrated } = useHydration();

  useEffect(() => {
    const hydrateFromStorage = async () => {
      // Get encrypted session from secure storage
      const encryptedSession = await SecureStorage.getItem('session');

      if (encryptedSession) {
        try {
          const session = JSON.parse(encryptedSession);

          // Validate tokens are still valid
          if (session.expiresAt > Date.now()) {
            // Restore auth state
            await authService.restoreSession(session.tokens);

            // Hydrate store state
            hydrateSession({
              user: session.user,
              preferences: session.preferences,
              lastActive: session.lastActive
            });
          }
        } catch {
          // Clear corrupted session
          await SecureStorage.removeItem('session');
        }
      }

      markHydrated('session');
    };

    hydrateFromStorage();
  }, []);
}
```

### Example 17: Session Persistence on Auth Changes

```tsx
import { useAuth } from '@/lib/auth';
import { SecureStorage } from '@/lib/security';
import { useStore } from '@/lib/state';

export function useSessionPersistence() {
  const { user, tokens, isAuthenticated } = useAuth();
  const session = useStore((s) => s.session);
  const preferences = useStore((s) => s.preferences);

  // Persist session changes
  useEffect(() => {
    const persistSession = async () => {
      if (isAuthenticated && user && tokens) {
        await SecureStorage.setItem('session', JSON.stringify({
          user,
          tokens,
          preferences,
          lastActive: Date.now(),
          expiresAt: tokens.expiresAt
        }));
      } else {
        await SecureStorage.removeItem('session');
      }
    };

    persistSession();
  }, [isAuthenticated, user, tokens, preferences]);
}
```

### Example 18: Cross-Tab Session Sync

```tsx
import { useAuth, authService } from '@/lib/auth';
import { SecureStorage } from '@/lib/security';
import { useStore } from '@/lib/state';

export function useCrossTabSessionSync() {
  const { logout, refreshSession } = useAuth();
  const clearSession = useStore((s) => s.clearSession);

  useEffect(() => {
    const handleStorageChange = async (e: StorageEvent) => {
      if (e.key === 'session_sync') {
        const event = JSON.parse(e.newValue || '{}');

        switch (event.type) {
          case 'logout':
            // Another tab logged out
            clearSession();
            await authService.clearTokens();
            break;

          case 'refresh':
            // Another tab refreshed tokens
            await refreshSession();
            break;

          case 'login':
            // Another tab logged in
            window.location.reload();
            break;
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Broadcast session events
  const broadcastSessionEvent = (type: 'login' | 'logout' | 'refresh') => {
    localStorage.setItem('session_sync', JSON.stringify({
      type,
      timestamp: Date.now()
    }));
  };

  return { broadcastSessionEvent };
}
```

---

## Multi-Tenant Patterns

### Example 19: Tenant-Isolated Security Context

```tsx
import { SecurityProvider } from '@/lib/security';
import { AuthProvider } from '@/lib/auth';
import { useStore } from '@/lib/state';

export function TenantSecurityWrapper({ children }: { children: React.ReactNode }) {
  const tenant = useStore((s) => s.tenant);

  // Tenant-specific security configuration
  const securityConfig = useMemo(() => ({
    cspConfig: {
      defaultSrc: ["'self'", tenant?.cdnDomain].filter(Boolean),
      scriptSrc: ["'self'", ...(tenant?.trustedScripts || [])]
    },
    csrfConfig: {
      cookieName: `${tenant?.id}_csrf`,
      headerName: 'X-CSRF-Token'
    }
  }), [tenant]);

  return (
    <SecurityProvider {...securityConfig}>
      <AuthProvider
        // Tenant-specific auth endpoints
        authEndpoint={`/api/tenants/${tenant?.id}/auth`}
        tokenStorageKey={`${tenant?.id}_tokens`}
      >
        {children}
      </AuthProvider>
    </SecurityProvider>
  );
}
```

### Example 20: Tenant-Scoped Secure Storage

```tsx
import { useAuth } from '@/lib/auth';
import { SecureStorage } from '@/lib/security';
import { useStore } from '@/lib/state';

export function useTenantSecureStorage() {
  const { user } = useAuth();
  const tenantId = useStore((s) => s.tenant?.id);

  const getKey = (key: string) => `${tenantId}:${user?.id}:${key}`;

  return {
    getItem: (key: string) => SecureStorage.getItem(getKey(key)),
    setItem: (key: string, value: string) => SecureStorage.setItem(getKey(key), value),
    removeItem: (key: string) => SecureStorage.removeItem(getKey(key)),

    // Clear all tenant data on tenant switch
    clearTenantData: async () => {
      const keys = await SecureStorage.keys();
      const tenantKeys = keys.filter((k) => k.startsWith(`${tenantId}:`));
      await Promise.all(tenantKeys.map((k) => SecureStorage.removeItem(k)));
    }
  };
}
```

---

## Common Mistakes

### Mistake 1: Wrong Provider Order

```tsx
// WRONG: State can't access auth context
<StoreProvider>
  <AuthProvider>
    <App />
  </AuthProvider>
</StoreProvider>

// CORRECT: Auth wraps state, state can react to auth
<AuthProvider>
  <StoreProvider>
    <App />
  </StoreProvider>
</AuthProvider>
```

### Mistake 2: Missing CSRF in Auth Requests

```tsx
// WRONG: Login without CSRF protection
const login = async (credentials) => {
  await fetch('/api/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  });
};

// CORRECT: Include CSRF token
const login = async (credentials) => {
  await fetch('/api/login', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrfToken },
    body: JSON.stringify(credentials)
  });
};
```

### Mistake 3: Storing Sensitive Data Unencrypted

```tsx
// WRONG: Plain localStorage
localStorage.setItem('userSecrets', JSON.stringify(secrets));

// CORRECT: Use SecureStorage
await SecureStorage.setItem('userSecrets', JSON.stringify(secrets));
```

### Mistake 4: Auth Check Without Loading State

```tsx
// WRONG: Flash of unauthorized content
if (!isAuthenticated) {
  return <Navigate to="/login" />;
}

// CORRECT: Handle loading state
if (isLoading) {
  return <AuthGuardLoading />;
}
if (!isAuthenticated) {
  return <Navigate to="/login" />;
}
```

### Mistake 5: State Updates Without Auth Validation

```tsx
// WRONG: Update state without checking auth
const updateProfile = (data) => {
  setUser(data); // User might be logged out!
};

// CORRECT: Validate auth state first
const updateProfile = (data) => {
  if (!isAuthenticated) {
    throw new Error('Not authenticated');
  }
  setUser(data);
};
```

---

## Quick Reference

| Pattern | Auth | Security | State | Use Case |
|---------|------|----------|-------|----------|
| Secure Login | `useAuth` | `useCSRFToken` | `setSession` | Login flow |
| Token Refresh | `authService` | `SecureStorage` | `updateSession` | Background refresh |
| Protected Route | `RequireAuth` | - | `useStore` | Route guarding |
| Role-Based UI | `user.roles` | - | `uiConfig` | Conditional render |
| Encrypted Data | `user.id` | `SecureStorage` | `preferences` | User data |
| Multi-Tenant | `AuthProvider` | `SecurityProvider` | `tenant` | SaaS apps |

## Related Documentation

### Integration Guides
- [README.md](./README.md) - Integration overview
- [ROUTING_STATE_GUARDS.md](./ROUTING_STATE_GUARDS.md) - Routing with auth guards
- [FEATURE_FLAGS_ERROR_BOUNDARIES_FULLSTACK.md](./FEATURE_FLAGS_ERROR_BOUNDARIES_FULLSTACK.md) - Feature flags with auth

### Authentication
- [Auth System](../auth/README.md) - Authentication overview
- [Auth Guards](../auth/GUARDS.md) - Route guards implementation
- [Auth Patterns](../auth/PATTERNS.md) - Auth patterns and best practices
- [Auth Provider](../auth/AUTH_PROVIDER.md) - Auth provider setup
- [RBAC](../auth/RBAC.md) - Role-based access control
- [Auth Service](../auth/AUTH_SERVICE.md) - Auth service API

### State Management
- [State System](../state/README.md) - State management overview
- [State Stores](../state/STORES.md) - Store patterns
- [State Slices](../state/SLICES.md) - Session and settings slices
- [State Hooks](../state/HOOKS.md) - State hooks
- [State Sync](../state/SYNC.md) - Multi-tab synchronization

### Routing & API
- [Routing](../routing/README.md) - Routing system
- [Route Guards](../routing/GUARDS.md) - Route protection
- [API Client](../api/README.md) - API integration
- [API Hooks](../api/HOOKS.md) - Data fetching hooks

---

*Last updated: 2024 | Harbor React Framework v2.0*
