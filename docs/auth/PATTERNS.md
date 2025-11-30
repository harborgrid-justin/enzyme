# Common Authentication Patterns

This guide covers common usage patterns for the authentication module, from basic authentication to complex enterprise scenarios.

## Table of Contents

1. [Pattern 1: Basic Authentication](#pattern-1-basic-authentication)
2. [Pattern 2: Active Directory Integration](#pattern-2-active-directory-integration)
3. [Pattern 3: Role-Based Access Control](#pattern-3-role-based-access-control)
4. [Pattern 4: Permission Matrix](#pattern-4-permission-matrix)
5. [Pattern 5: Conditional Permissions with Policies](#pattern-5-conditional-permissions-with-policies)
6. [Pattern 6: Multi-Factor Authentication](#pattern-6-multi-factor-authentication)
7. [Pattern 7: SSO and Cross-Tab Sync](#pattern-7-sso-and-cross-tab-sync)
8. [Pattern 8: API Integration](#pattern-8-api-integration)

---

## Pattern 1: Basic Authentication

Complete user authentication with login, logout, and session management.

### Setup

```tsx
import { AuthProvider, useAuth, RequireAuth } from '@/lib/auth';

function App() {
  return (
    <AuthProvider
      config={{
        loginEndpoint: '/api/auth/login',
        logoutEndpoint: '/api/auth/logout',
        refreshEndpoint: '/api/auth/refresh',
        tokenStorageKey: 'auth_tokens',
        persistAuth: true,
        autoRefresh: true,
        refreshBeforeExpiry: 300, // 5 minutes
        sessionTimeout: 3600000, // 1 hour
      }}
    >
      <YourApp />
    </AuthProvider>
  );
}
```

### Login Form

```tsx
function LoginPage() {
  const { login, isLoading, error } = useAuth();
  const [credentials, setCredentials] = useState({ email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(credentials);
    // Automatically redirects on success
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={credentials.email}
        onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={credentials.password}
        onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
        placeholder="Password"
        required
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
      {error && <div className="error">{error.message}</div>}
    </form>
  );
}
```

### Protected Routes

```tsx
function Dashboard() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}

// With custom redirect
function AdminDashboard() {
  return (
    <RequireAuth redirectTo="/login">
      <AdminContent />
    </RequireAuth>
  );
}
```

### User Profile Display

```tsx
function UserMenu() {
  const { user, logout, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Link to="/login">Login</Link>;
  }

  return (
    <div className="user-menu">
      <Avatar src={user.avatar} alt={user.name} />
      <span>Welcome, {user.name}</span>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

---

## Pattern 2: Active Directory Integration

Enterprise authentication with Azure AD, including group mapping and SSO.

### Azure AD Setup

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
        scopes: ['User.Read', 'openid', 'profile', 'email'],
        groupMapping: {
          'IT-Admins': ['admin'],
          'Support-Team': ['support', 'user'],
          'Engineering': ['developer', 'user'],
        },
        sso: {
          enabled: true,
          crossDomain: true,
          domains: ['app1.example.com', 'app2.example.com'],
        },
      }}
      enableSSO
    >
      <YourApp />
    </ADProvider>
  );
}
```

### AD Login

```tsx
function UserProfile() {
  const { user, groups, loginWithPopup, logout, isAuthenticated } = useActiveDirectory();

  if (!isAuthenticated) {
    return (
      <button onClick={() => loginWithPopup()}>
        Sign in with Microsoft
      </button>
    );
  }

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <p>Email: {user.email}</p>
      <p>Department: {user.adAttributes.department}</p>
      <p>Groups: {groups.map(g => g.displayName).join(', ')}</p>
      <button onClick={logout}>Sign out</button>
    </div>
  );
}
```

### Group-Based Access Control

```tsx
function FeatureGate() {
  const { isInGroup, isInAnyGroup } = useActiveDirectory();

  if (!isInAnyGroup(['IT-Admins', 'Support-Team'])) {
    return <AccessDenied />;
  }

  return (
    <div>
      {isInGroup('IT-Admins') && <AdminFeatures />}
      {isInGroup('Support-Team') && <SupportFeatures />}
      <StandardFeatures />
    </div>
  );
}
```

### Azure AD B2C Configuration

```tsx
const b2cConfig = {
  providerType: 'azure-ad-b2c',
  azure: {
    clientId: process.env.AZURE_B2C_CLIENT_ID,
    tenantId: process.env.AZURE_B2C_TENANT_ID,
    b2cTenantName: 'yourcompany',
    policies: {
      signUpSignIn: 'B2C_1_SignUpSignIn',
      resetPassword: 'B2C_1_PasswordReset',
      editProfile: 'B2C_1_ProfileEdit',
    },
    knownAuthorities: ['yourcompany.b2clogin.com'],
  },
};

<ADProvider config={b2cConfig}>
  <App />
</ADProvider>
```

---

## Pattern 3: Role-Based Access Control

Implement comprehensive RBAC with role hierarchies and permission inheritance.

### RBAC Configuration

```tsx
import { RBACProvider, useRBAC, RequireRole } from '@/lib/auth';

function App() {
  const { user } = useAuth();

  return (
    <AuthProvider>
      <RBACProvider
        config={{
          roles: {
            admin: {
              permissions: ['*'], // All permissions
              priority: 100,
            },
            editor: {
              permissions: ['posts:read', 'posts:write', 'posts:delete'],
              inherits: ['viewer'],
              priority: 50,
            },
            viewer: {
              permissions: ['posts:read'],
              priority: 10,
            },
          },
          hierarchy: {
            admin: ['editor', 'viewer'],
            editor: ['viewer'],
          },
          defaultDecision: 'deny',
        }}
        user={user}
        userRoles={user?.roles}
      >
        <YourApp />
      </RBACProvider>
    </AuthProvider>
  );
}
```

### Permission Checks

```tsx
function PostActions({ post }) {
  const { can } = useRBAC();

  return (
    <div className="post-actions">
      {can('write', 'posts') && (
        <button onClick={() => editPost(post)}>Edit</button>
      )}
      {can('delete', 'posts') && (
        <button onClick={() => deletePost(post)}>Delete</button>
      )}
    </div>
  );
}
```

### Role-Based Components

```tsx
function AdminPanel() {
  return (
    <RequireRole role="admin">
      <AdminDashboard />
    </RequireRole>
  );
}

function EditorPanel() {
  return (
    <RequireRole roles={['admin', 'editor']}>
      <EditorDashboard />
    </RequireRole>
  );
}
```

### Dynamic Permission Checks

```tsx
function DocumentEditor({ document }) {
  const { canUpdate, canDelete, hasRole } = useRBAC();
  const isOwner = document.authorId === user.id;

  const canEditThis = canUpdate('documents') && (isOwner || hasRole('admin'));
  const canDeleteThis = canDelete('documents') && (isOwner || hasRole('admin'));

  return (
    <div>
      <DocumentViewer document={document} />
      {canEditThis && <EditButton />}
      {canDeleteThis && <DeleteButton />}
    </div>
  );
}
```

---

## Pattern 4: Permission Matrix

Define and manage permissions using a permission matrix for efficient lookups.

### Building Permission Matrix

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
    .role('viewer', ['read'])
  .resource('settings')
    .role('admin', ['read', 'update'])
  .resource('reports')
    .role('admin', ['create', 'read', 'export'])
    .role('manager', ['read', 'export'])
    .role('user', ['read'])
  .build();

function App() {
  return (
    <RBACProvider
      config={{
        permissionMatrix: matrix,
        defaultDecision: 'deny',
      }}
    >
      <YourApp />
    </RBACProvider>
  );
}
```

### Using Permission Matrix

```tsx
function ResourceActions({ resource }) {
  const { canCreate, canUpdate, canDelete } = useRBAC();

  return (
    <div className="actions">
      {canCreate(resource.type) && (
        <button>Create New</button>
      )}
      {canUpdate(resource.type) && (
        <button>Edit</button>
      )}
      {canDelete(resource.type) && (
        <button>Delete</button>
      )}
    </div>
  );
}
```

### Pre-built Matrix Templates

```tsx
import { createStandardMatrix, createAdminMatrix } from '@/lib/auth';

// Standard CRUD matrix
const standardMatrix = createStandardMatrix({
  resources: ['posts', 'users', 'comments'],
  roles: ['admin', 'editor', 'user'],
});

// Admin-focused matrix
const adminMatrix = createAdminMatrix({
  adminRole: 'super_admin',
  resources: ['*'],
});
```

---

## Pattern 5: Conditional Permissions with Policies

Implement fine-grained access control with conditional policies.

### Policy Definitions

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
    priority: 100, // High priority deny
  },
  {
    id: 'business-hours-only',
    effect: 'allow',
    actions: ['*'],
    resources: ['sensitive-data'],
    conditions: [
      (context) => {
        const hour = new Date().getHours();
        return hour >= 9 && hour <= 17;
      },
    ],
  },
  {
    id: 'department-access',
    effect: 'allow',
    actions: ['read'],
    resources: ['reports'],
    conditions: [
      (context) => context.resource.department === context.user.department,
    ],
  },
];

<RBACProvider
  config={{
    policies,
    defaultDecision: 'deny',
  }}
>
  <App />
</RBACProvider>
```

### Using Policies

```tsx
function PostActions({ post }) {
  const { can } = useRBAC();
  const { user } = useAuth();

  // Policy evaluation happens automatically
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

### Resource-Specific Policies

```tsx
function DocumentViewer({ documentId }) {
  const { checkResourcePermission } = useRBAC();
  const { user } = useAuth();

  const canView = checkResourcePermission('documents', documentId, 'read');
  const canEdit = checkResourcePermission('documents', documentId, 'update');
  const canShare = checkResourcePermission('documents', documentId, 'share');

  if (!canView) {
    return <AccessDenied />;
  }

  return (
    <div>
      <DocumentContent />
      {canEdit && <EditButton />}
      {canShare && <ShareButton />}
    </div>
  );
}
```

---

## Pattern 6: Multi-Factor Authentication

Add an extra layer of security with TOTP-based MFA.

### MFA Setup Flow

```tsx
function MFASetupPage() {
  const { setupMFA, verifyMFA } = useAuth();
  const [mfaData, setMfaData] = useState(null);
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSetup = async () => {
    const result = await setupMFA();
    setMfaData(result);
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      await verifyMFA(code);
      alert('MFA enabled successfully!');
    } catch (error) {
      alert('Invalid code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (!mfaData) {
    return (
      <div>
        <h2>Enable Two-Factor Authentication</h2>
        <button onClick={handleSetup}>Set up MFA</button>
      </div>
    );
  }

  return (
    <div>
      <h2>Scan QR Code</h2>
      <img src={mfaData.qrCode} alt="MFA QR Code" />
      <p>Or enter this key manually: {mfaData.secret}</p>

      <h3>Backup Codes</h3>
      <p>Save these codes in a secure location:</p>
      <ul>
        {mfaData.backupCodes.map(code => (
          <li key={code}>{code}</li>
        ))}
      </ul>

      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Enter 6-digit code"
        maxLength={6}
      />
      <button onClick={handleVerify} disabled={isVerifying}>
        Verify & Enable
      </button>
    </div>
  );
}
```

### MFA Login Flow

```tsx
function LoginPage() {
  const { login } = useAuth();
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [mfaCode, setMfaCode] = useState('');

  const handleLogin = async () => {
    try {
      const result = await login(credentials);

      if (result.requiresMfa) {
        setRequiresMfa(true);
      } else {
        // Login successful
        router.push('/dashboard');
      }
    } catch (error) {
      alert(error.message);
    }
  };

  const handleMfaSubmit = async () => {
    try {
      await login({ ...credentials, mfaCode });
      router.push('/dashboard');
    } catch (error) {
      alert('Invalid MFA code');
    }
  };

  if (requiresMfa) {
    return (
      <div>
        <h2>Enter Authentication Code</h2>
        <input
          type="text"
          value={mfaCode}
          onChange={(e) => setMfaCode(e.target.value)}
          placeholder="6-digit code"
          maxLength={6}
        />
        <button onClick={handleMfaSubmit}>Verify</button>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
      <input
        type="email"
        value={credentials.email}
        onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
        placeholder="Email"
      />
      <input
        type="password"
        value={credentials.password}
        onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
        placeholder="Password"
      />
      <button type="submit">Login</button>
    </form>
  );
}
```

---

## Pattern 7: SSO and Cross-Tab Sync

Implement Single Sign-On with cross-tab session synchronization.

### SSO Configuration

```tsx
<ADProvider
  config={adConfig}
  enableSSO
  ssoConfig={{
    crossTabSync: true,
    sessionTimeout: 28800000, // 8 hours
    autoExtendSession: true,
    trackActivity: true,
  }}
>
  <App />
</ADProvider>
```

### Cross-Domain SSO

```tsx
import { createCrossDomainSSO } from '@/lib/auth/active-directory';

const crossDomainSSO = createCrossDomainSSO([
  'https://app1.yourcompany.com',
  'https://app2.yourcompany.com',
  'https://app3.yourcompany.com',
]);

// Share session when opening another app
function openApp2() {
  const { session, tokens } = useActiveDirectory();
  const newWindow = window.open('https://app2.yourcompany.com');

  crossDomainSSO.shareSession(
    'https://app2.yourcompany.com',
    newWindow,
    session,
    tokens
  );
}

// Listen for shared sessions
useEffect(() => {
  const cleanup = crossDomainSSO.listen((session, tokens) => {
    // Use shared session
    setSession(session);
    setTokens(tokens);
  });

  return cleanup;
}, []);
```

### Session Sync Across Tabs

```tsx
function useSessionSync() {
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    // Listen for session changes in other tabs
    const handleStorageChange = (e) => {
      if (e.key === 'auth_session' && !e.newValue) {
        // Session cleared in another tab
        window.location.href = '/login';
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return { user, isAuthenticated };
}
```

---

## Pattern 8: API Integration

Integrate authentication with API calls and handle token management.

### Axios Integration

```tsx
import axios from 'axios';
import { authService } from '@/lib/auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const token = authService.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await authService.refreshSession();
        const newToken = authService.getAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

### Fetch Integration

```tsx
async function authenticatedFetch(url, options = {}) {
  const { getAccessToken, isTokenExpired, refreshSession } = authService;

  // Refresh token if needed
  if (isTokenExpired(60000)) { // 1 minute buffer
    await refreshSession();
  }

  const token = getAccessToken();

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

// Usage
const response = await authenticatedFetch('/api/users');
const data = await response.json();
```

### React Query Integration

```tsx
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';

function useAuthenticatedQuery(key, endpoint) {
  const { getAccessToken } = useAuth();

  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const token = getAccessToken();
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      return response.json();
    },
  });
}

// Usage
function UsersList() {
  const { data, isLoading } = useAuthenticatedQuery(
    ['users'],
    '/api/users'
  );

  if (isLoading) return <Spinner />;

  return (
    <ul>
      {data.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

---

## Best Practices

### 1. Always Handle Loading States

```tsx
function ProtectedPage() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return <PageContent user={user} />;
}
```

### 2. Implement Error Boundaries

```tsx
function AuthErrorBoundary({ children }) {
  const { error, clearError } = useAuth();

  useEffect(() => {
    if (error) {
      console.error('Auth error:', error);
      toast.error(error.message);
      setTimeout(clearError, 5000);
    }
  }, [error, clearError]);

  return children;
}
```

### 3. Use TypeScript for Type Safety

```tsx
import type { User, LoginCredentials, AuthError } from '@/lib/auth/types';

const handleLogin = async (credentials: LoginCredentials): Promise<User> => {
  try {
    return await authService.login(credentials);
  } catch (error) {
    const authError = error as AuthError;
    console.error(authError.code, authError.message);
    throw error;
  }
};
```

### 4. Secure Token Storage

```tsx
// Prefer session storage or memory over localStorage
<AuthProvider
  config={{
    tokenStorage: 'sessionStorage', // or 'memory'
    persistAuth: true,
  }}
>
  <App />
</AuthProvider>
```

### 5. Implement Proper Logout

```tsx
function LogoutButton() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout({ everywhere: true }); // Logout from all devices
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return <button onClick={handleLogout}>Logout</button>;
}
```

## Related Documentation

### Authentication Module
- [Authentication Module](./README.md) - Main authentication documentation
- [Auth Overview](./OVERVIEW.md) - Architecture and pattern design
- [Auth Service](./AUTH_SERVICE.md) - Service methods used in patterns
- [Auth Provider](./AUTH_PROVIDER.md) - Provider configuration
- [Auth Hooks](./HOOKS.md) - Hooks used in patterns
- [Route Guards](./GUARDS.md) - Guards demonstrated in patterns
- [RBAC System](./RBAC.md) - RBAC patterns and examples
- [Active Directory](./ACTIVE_DIRECTORY.md) - AD integration patterns
- [Troubleshooting](./TROUBLESHOOTING.md) - Pattern-specific issues

### Implementation Guides
- [Security Best Practices](../SECURITY.md) - Secure implementation patterns
- [State Management](../state/README.md) - State patterns with auth
- [API Module](../api/README.md) - API integration patterns
- [Configuration](../config/README.md) - Configuration patterns
