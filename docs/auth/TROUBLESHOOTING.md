# Authentication Troubleshooting Guide

Common issues, solutions, and debugging tips for the authentication module.

## Table of Contents

1. [Token Issues](#token-issues)
2. [Active Directory Issues](#active-directory-issues)
3. [Permission Issues](#permission-issues)
4. [Session Issues](#session-issues)
5. [Login Issues](#login-issues)
6. [RBAC Issues](#rbac-issues)
7. [Performance Issues](#performance-issues)
8. [Security Issues](#security-issues)
9. [Debugging Tips](#debugging-tips)

---

## Token Issues

### Token Expires Too Quickly

**Problem:** Access token expires before user completes their work.

**Solution:** Configure auto-refresh to renew tokens before expiry.

```tsx
<AuthProvider config={{
  autoRefresh: true,
  refreshBeforeExpiry: 300, // Start refreshing 5 minutes before expiry
  tokenExpiry: 3600, // 1 hour token lifetime
}}>
  <App />
</AuthProvider>
```

**Alternative:** Implement token refresh on user activity.

```tsx
function useActivityRefresh() {
  const { isTokenExpired, refreshSession } = useAuth();

  useEffect(() => {
    const handleActivity = async () => {
      if (isTokenExpired(60000)) { // 1 minute buffer
        await refreshSession();
      }
    };

    window.addEventListener('click', handleActivity);
    window.addEventListener('keypress', handleActivity);

    return () => {
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keypress', handleActivity);
    };
  }, [isTokenExpired, refreshSession]);
}
```

### Token Refresh Fails

**Problem:** Token refresh returns 401 or fails silently.

**Diagnosis:**
1. Check if refresh token is present: `authService.getRefreshToken()`
2. Verify refresh endpoint is configured correctly
3. Check server logs for refresh token validation errors

**Solution:**

```tsx
// Add error handling to refresh
const { refreshSession, error } = useAuth();

useEffect(() => {
  if (error?.code === 'refresh_failed') {
    // Clear auth and redirect to login
    authService.clearSession();
    window.location.href = '/login';
  }
}, [error]);

// Implement retry logic
async function refreshWithRetry(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await refreshSession();
      return;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

### Token Not Included in Requests

**Problem:** API requests don't include the Authorization header.

**Diagnosis:**
1. Check if token exists: `authService.getAccessToken()`
2. Verify axios/fetch interceptor is configured
3. Check network tab for Authorization header

**Solution:**

```tsx
// Ensure interceptor is set up before any requests
import { setupAuthInterceptor } from '@/lib/auth';

setupAuthInterceptor(api);

// Or manually add token
const token = authService.getAccessToken();
const response = await fetch('/api/data', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});
```

### Token Storage Not Persisting

**Problem:** User logged out on page refresh.

**Solution:** Enable session persistence.

```tsx
<AuthProvider config={{
  persistAuth: true,
  tokenStorage: 'sessionStorage', // or 'localStorage'
}}>
  <App />
</AuthProvider>
```

**Check:** Verify storage isn't being cleared by browser extensions or privacy settings.

```tsx
// Debug storage
console.log('Session storage:', sessionStorage.getItem('auth_tokens'));
console.log('Local storage:', localStorage.getItem('auth_tokens'));
```

---

## Active Directory Issues

### AD Login Popup Blocked

**Problem:** Browser blocks the AD login popup.

**Solution:** Use redirect flow instead of popup.

```tsx
const { loginWithRedirect } = useActiveDirectory();

<button onClick={loginWithRedirect}>Sign in with Azure AD</button>
```

**Alternative:** Show user instructions if popup is blocked.

```tsx
function ADLoginButton() {
  const { loginWithPopup } = useActiveDirectory();
  const [popupBlocked, setPopupBlocked] = useState(false);

  const handleLogin = async () => {
    try {
      await loginWithPopup();
    } catch (error) {
      if (error.code === 'popup_blocked') {
        setPopupBlocked(true);
      }
    }
  };

  if (popupBlocked) {
    return (
      <div>
        <p>Popup blocked. Please allow popups or use:</p>
        <button onClick={loginWithRedirect}>Sign in (redirect)</button>
      </div>
    );
  }

  return <button onClick={handleLogin}>Sign in</button>;
}
```

### AD Groups Not Loading

**Problem:** User groups are empty or not mapping to roles.

**Diagnosis:**
1. Check if groups scope is requested: `GroupMember.Read.All`
2. Verify tenant permissions for group access
3. Check network tab for Graph API errors

**Solution:**

```tsx
// Ensure proper scopes
const adConfig = {
  azure: {
    scopes: [
      'openid',
      'profile',
      'email',
      'User.Read',
      'GroupMember.Read.All', // Required for groups
    ],
  },
};

// Check group loading
const { groups, isLoading } = useActiveDirectory();

if (isLoading) {
  return <p>Loading groups...</p>;
}

console.log('User groups:', groups);
```

**If groups still don't load:** Request admin consent for the application.

```tsx
// Force admin consent
const { loginWithPopup } = useActiveDirectory();

loginWithPopup({ prompt: 'admin_consent' });
```

### AD Token Acquisition Fails

**Problem:** `interaction_required` or `consent_required` errors.

**Solution:**

```tsx
const { error, login, clearError } = useActiveDirectory();

useEffect(() => {
  if (error) {
    switch (error.code) {
      case 'interaction_required':
        // Trigger interactive login
        login({ prompt: 'select_account' });
        break;
      case 'consent_required':
        // Request consent
        login({ prompt: 'consent' });
        break;
      case 'invalid_grant':
        // Token expired, re-authenticate
        clearError();
        login();
        break;
      default:
        console.error('AD Error:', error);
    }
  }
}, [error]);
```

### Cross-Tenant Issues

**Problem:** Users from different tenants can't sign in.

**Solution:** Enable multi-tenant support.

```tsx
const adConfig = {
  azure: {
    tenantId: 'common', // Allow any Azure AD tenant
    // Or use 'organizations' for work/school accounts only
  },
  multiTenant: true,
};
```

### Silent Token Refresh Fails

**Problem:** Silent token refresh not working.

**Diagnosis:**
1. Check if third-party cookies are enabled
2. Verify iframe sandbox settings
3. Check browser console for errors

**Solution:**

```tsx
const adConfig = {
  azure: {
    cacheLocation: 'sessionStorage', // Use session storage
    storeAuthStateInCookie: true, // For IE11/Edge
  },
  silentRefresh: true,
};

// Fallback to interactive refresh
const { refreshTokens, loginWithPopup } = useActiveDirectory();

try {
  await refreshTokens();
} catch (error) {
  if (error.code === 'silent_refresh_failed') {
    await loginWithPopup();
  }
}
```

---

## Permission Issues

### Permission Check Always Returns False

**Problem:** `hasPermission()` or `can()` always returns false.

**Diagnosis:**
1. Check if user roles are loaded
2. Verify RBAC is initialized
3. Check permission strings match exactly

**Solution:**

```tsx
const { can, isReady, userRoles, effectivePermissions } = useRBAC();

// Wait for RBAC to initialize
if (!isReady) {
  return <Loading />;
}

// Debug permissions
console.log('User roles:', userRoles);
console.log('Effective permissions:', effectivePermissions);
console.log('Can create posts:', can('create', 'posts'));

// Check exact permission string
const hasPermission = effectivePermissions.includes('posts:create');
console.log('Has posts:create:', hasPermission);
```

**Common mistakes:**
- Wrong permission format: `'posts:create'` vs `'create:posts'`
- Case sensitivity: `'Posts:Create'` vs `'posts:create'`
- Missing RBAC configuration

```tsx
// Ensure RBAC is properly configured
<RBACProvider
  config={{
    roles: [
      { id: 'admin', permissions: ['*'], priority: 100 },
      { id: 'user', permissions: ['posts:read'], priority: 10 },
    ],
    defaultDecision: 'deny',
  }}
  user={user}
  userRoles={user?.roles || []}
>
  <App />
</RBACProvider>
```

### Wildcard Permissions Not Working

**Problem:** Wildcard permissions like `'*'` or `'posts:*'` don't match.

**Solution:** Ensure RBAC engine is configured to expand wildcards.

```tsx
const rbacConfig = {
  roles: {
    admin: {
      permissions: ['*'], // All permissions
    },
    editor: {
      permissions: ['posts:*'], // All post permissions
    },
  },
  expandWildcards: true, // Enable wildcard expansion
};
```

### Permission Denied for Owner

**Problem:** Resource owner can't access their own resources.

**Solution:** Implement owner-based policies.

```tsx
const policies = [
  {
    id: 'allow-owner-access',
    effect: 'allow',
    actions: ['read', 'update', 'delete'],
    resources: ['posts', 'documents'],
    conditions: [
      (context) => context.resource.ownerId === context.user.id,
    ],
  },
];

<RBACProvider config={{ policies }}>
  <App />
</RBACProvider>
```

---

## Session Issues

### Session Lost on Page Refresh

**Problem:** User is logged out when refreshing the page.

**Solution:** Enable session persistence.

```tsx
<AuthProvider config={{
  persistAuth: true,
  tokenStorage: 'sessionStorage',
}}>
  <App />
</AuthProvider>
```

**Check:** Ensure tokens are being saved.

```tsx
// Debug session persistence
useEffect(() => {
  const session = authService.loadSession();
  console.log('Loaded session:', session);
}, []);
```

### Session Not Syncing Across Tabs

**Problem:** Login in one tab doesn't reflect in other tabs.

**Solution:** Use localStorage and listen for storage events.

```tsx
<AuthProvider config={{
  tokenStorage: 'localStorage', // Required for cross-tab sync
  syncAcrossTabs: true,
}}>
  <App />
</AuthProvider>

// Manually implement sync
function useTabSync() {
  const { loadSession } = useAuth();

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'auth_tokens') {
        loadSession();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [loadSession]);
}
```

### Unexpected Session Timeout

**Problem:** Session expires too quickly.

**Solution:** Configure session timeout and activity tracking.

```tsx
<AuthProvider config={{
  sessionTimeout: 3600000, // 1 hour
  inactivityTimeout: 900000, // 15 minutes
  trackActivity: true, // Extend session on user activity
}}>
  <App />
</AuthProvider>
```

### Session Timeout Not Working

**Problem:** Session doesn't timeout when expected.

**Solution:** Implement session monitoring.

```tsx
function useSessionMonitor() {
  const { isTokenExpired, logout } = useAuth();

  useEffect(() => {
    const interval = setInterval(() => {
      if (isTokenExpired()) {
        logout({ redirectTo: '/session-expired' });
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [isTokenExpired, logout]);
}
```

---

## Login Issues

### Login Redirects to Wrong Page

**Problem:** After login, user is redirected to unexpected page.

**Solution:** Configure redirect URLs properly.

```tsx
<AuthProvider config={{
  loginRedirect: '/dashboard',
  logoutRedirect: '/login',
}}>
  <App />
</AuthProvider>

// Preserve original destination
function LoginPage() {
  const { login } = useAuth();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const handleLogin = async (credentials) => {
    await login(credentials);
    navigate(from, { replace: true });
  };

  return <LoginForm onSubmit={handleLogin} />;
}
```

### Login Fails with CORS Error

**Problem:** CORS error when calling login endpoint.

**Solution:** Configure CORS on the server and include credentials.

```tsx
// Client configuration
<AuthProvider config={{
  apiEndpoint: '/api/auth',
  withCredentials: true, // Include cookies
}}>
  <App />
</AuthProvider>

// Axios configuration
const api = axios.create({
  baseURL: 'https://api.example.com',
  withCredentials: true,
});
```

**Server configuration (Express example):**
```javascript
app.use(cors({
  origin: 'https://your-app.com',
  credentials: true,
}));
```

### Infinite Login Loop

**Problem:** After login, user is immediately redirected back to login.

**Diagnosis:**
1. Check if token is being saved
2. Verify auth state is updating
3. Check for conflicting route guards

**Solution:**

```tsx
// Debug auth state
function DebugAuth() {
  const { isAuthenticated, user, isLoading } = useAuth();

  useEffect(() => {
    console.log('Auth state:', { isAuthenticated, user, isLoading });
  }, [isAuthenticated, user, isLoading]);

  return null;
}

// Ensure proper loading handling
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <Loading />; // Don't redirect while loading
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return children;
}
```

---

## RBAC Issues

### Role Hierarchy Not Working

**Problem:** Child roles don't inherit parent permissions.

**Solution:** Verify role hierarchy configuration.

```tsx
const rbacConfig = {
  roles: [
    {
      id: 'admin',
      permissions: ['*'],
      priority: 100,
    },
    {
      id: 'manager',
      permissions: ['manage:*'],
      inherits: ['user'], // Inherits user permissions
      priority: 50,
    },
    {
      id: 'user',
      permissions: ['read:*'],
      priority: 10,
    },
  ],
  hierarchy: {
    admin: ['manager', 'user'],
    manager: ['user'],
  },
};

// Debug effective permissions
const { getEffectivePermissions } = useRBAC();
console.log('Effective permissions:', getEffectivePermissions());
```

### Permission Cache Stale

**Problem:** Permission changes don't reflect immediately.

**Solution:** Clear cache or disable caching.

```tsx
const rbacConfig = {
  enableCaching: false, // Disable for development
  // Or set short TTL
  cacheTTL: 60000, // 1 minute
};

// Manually clear cache
const { clearCache, refreshPermissions } = useRBAC();

const handleRoleChange = async () => {
  clearCache();
  await refreshPermissions();
};
```

### Policy Evaluation Slow

**Problem:** Complex policies cause UI lag.

**Solution:** Optimize policy evaluation and enable caching.

```tsx
const rbacConfig = {
  enableCaching: true,
  cacheTTL: 300000, // 5 minutes
  // Simplify conditions
  policies: [
    {
      id: 'owner-access',
      effect: 'allow',
      actions: ['update', 'delete'],
      resources: ['posts'],
      conditions: [
        // Use simple comparisons
        (context) => context.resource.ownerId === context.user.id,
      ],
    },
  ],
};

// Memoize expensive checks
const canEdit = useMemo(
  () => checkResourcePermission('posts', postId, 'update'),
  [postId, userRoles] // Only recalculate when these change
);
```

---

## Performance Issues

### Slow Authentication Check

**Problem:** `isAuthenticated` check is slow.

**Solution:** Use memoization and optimize token validation.

```tsx
// Memoize authentication state
const authState = useMemo(
  () => ({
    isAuthenticated: !!user && !isTokenExpired(),
    user,
  }),
  [user] // Only recalculate when user changes
);

// Use lightweight state check
const { isAuthenticated } = useAuthState(); // Lighter than useAuth()
```

### Too Many Re-renders

**Problem:** Auth context causes excessive re-renders.

**Solution:** Split context and use selectors.

```tsx
// Use specific hooks instead of full context
const { user } = useUser(); // Only subscribes to user changes
const { login } = useAuthActions(); // Doesn't subscribe to state

// Instead of
const { user, login, logout, isAuthenticated } = useAuth(); // Subscribes to everything
```

### Large Bundle Size

**Problem:** Auth module increases bundle size significantly.

**Solution:** Lazy load AD and RBAC modules.

```tsx
// Lazy load AD
const ADProvider = lazy(() => import('@/lib/auth/active-directory'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <ADProvider config={adConfig}>
        <YourApp />
      </ADProvider>
    </Suspense>
  );
}

// Only import what you need
import { useAuth } from '@/lib/auth'; // Core only
// Don't import entire module
// import * as auth from '@/lib/auth'; // Avoid this
```

---

## Security Issues

### XSS Vulnerability in User Data

**Problem:** User-provided data not sanitized.

**Solution:** Always sanitize user data.

```tsx
import DOMPurify from 'dompurify';

function UserProfile({ user }) {
  const sanitizedBio = DOMPurify.sanitize(user.bio);

  return (
    <div>
      <h1>{user.name}</h1> {/* React auto-escapes */}
      <div dangerouslySetInnerHTML={{ __html: sanitizedBio }} />
    </div>
  );
}
```

### Token Exposed in URL

**Problem:** Token appears in browser history or logs.

**Solution:** Never include tokens in URLs.

```tsx
// Bad
window.location.href = `/dashboard?token=${token}`;

// Good
authService.setTokens(tokens);
navigate('/dashboard');
```

### Insecure Token Storage

**Problem:** Tokens stored in localStorage vulnerable to XSS.

**Solution:** Use sessionStorage or memory, enable encryption.

```tsx
<AuthProvider config={{
  tokenStorage: 'sessionStorage', // Better than localStorage
  encryptTokens: true, // Enable encryption
}}>
  <App />
</AuthProvider>

// For high security, use memory storage
const memoryStorage = new MemoryTokenStorage();
<AuthProvider config={{
  tokenStorage: memoryStorage,
}}>
  <App />
</AuthProvider>
```

---

## Debugging Tips

### Enable Debug Logging

```tsx
<AuthProvider config={{
  debug: true, // Enable debug logs
}}>
  <App />
</AuthProvider>

// Or manually
import { enableAuthDebug } from '@/lib/auth';
enableAuthDebug();
```

### Inspect Auth State

```tsx
function AuthDebugger() {
  const auth = useAuth();

  useEffect(() => {
    console.log('Auth state:', {
      isAuthenticated: auth.isAuthenticated,
      user: auth.user,
      tokens: {
        access: auth.getAccessToken()?.substring(0, 20) + '...',
        refresh: auth.getRefreshToken()?.substring(0, 20) + '...',
      },
      isExpired: auth.isTokenExpired(),
    });
  }, [auth]);

  return null;
}
```

### Network Debugging

```tsx
// Log all auth requests
api.interceptors.request.use((config) => {
  if (config.url.includes('/auth')) {
    console.log('Auth request:', {
      url: config.url,
      method: config.method,
      headers: config.headers,
    });
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (response.config.url.includes('/auth')) {
      console.log('Auth response:', {
        status: response.status,
        data: response.data,
      });
    }
    return response;
  },
  (error) => {
    console.error('Auth error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
    });
    return Promise.reject(error);
  }
);
```

### Performance Profiling

```tsx
import { Profiler } from 'react';

function App() {
  const onRenderCallback = (
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime
  ) => {
    if (id === 'auth-provider' && actualDuration > 10) {
      console.warn(`Auth render took ${actualDuration}ms`);
    }
  };

  return (
    <Profiler id="auth-provider" onRender={onRenderCallback}>
      <AuthProvider>
        <YourApp />
      </AuthProvider>
    </Profiler>
  );
}
```

### Common Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `invalid_credentials` | Wrong email/password | Check credentials |
| `account_locked` | Account is locked | Contact admin |
| `mfa_required` | MFA code needed | Prompt for MFA code |
| `token_expired` | Token has expired | Refresh token |
| `refresh_failed` | Token refresh failed | Re-authenticate |
| `invalid_grant` | Invalid refresh token | Login again |
| `interaction_required` | User interaction needed | Trigger login popup |
| `consent_required` | User consent needed | Request consent |
| `popup_blocked` | Popup was blocked | Use redirect flow |
| `insufficient_permissions` | User lacks permissions | Check roles/permissions |

---

## Getting Help

If you're still experiencing issues:

1. **Check the documentation:**
   - [Authentication Overview](./OVERVIEW.md)
   - [Common Patterns](./PATTERNS.md)
   - [API Reference](./TYPES.md)

2. **Search existing issues:**
   - [GitHub Issues](https://github.com/your-org/enzyme/issues)

3. **Ask for help:**
   - [Discord Community](https://discord.gg/enzyme)
   - [Stack Overflow](https://stackoverflow.com/questions/tagged/enzyme)

4. **Report a bug:**
   - [Create an Issue](https://github.com/your-org/enzyme/issues/new)
   - Include: error messages, code samples, browser/environment details

## See Also

- [Security Best Practices](../SECURITY.md)
- [Performance Optimization](../PERFORMANCE.md)
- [Testing Guide](../TESTING.md)
