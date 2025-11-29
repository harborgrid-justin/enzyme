# Authentication Hooks Reference

React hooks for accessing authentication state and actions in your components.

## Overview

The auth module provides several React hooks for authentication:

- `useAuth()` - Main authentication hook with full functionality
- `useAuthState()` - Read-only authentication state
- `useAuthActions()` - Authentication actions only
- `useUser()` - Current user information
- `useTokens()` - Token access and management

## useAuth()

The primary hook for authentication functionality. Provides access to authentication state and all authentication methods.

### Import

```tsx
import { useAuth } from '@/lib/auth';
```

### Usage

```tsx
function MyComponent() {
  const {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshSession,
  } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <button onClick={() => login({ email, password })}>Login</button>;
  }

  return (
    <div>
      <h1>Welcome, {user.displayName}</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Return Value

```tsx
interface UseAuthReturn {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthenticating: boolean;
  error: AuthError | null;

  // Auth Actions
  login: (credentials: LoginCredentials, options?: LoginOptions) => Promise<void>;
  logout: (options?: LogoutOptions) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  refreshSession: () => Promise<void>;

  // Token Management
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  isTokenExpired: (bufferMs?: number) => boolean;

  // Password Management
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;

  // Email Verification
  sendVerificationEmail: () => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;

  // MFA
  setupMFA: () => Promise<MFASetupResult>;
  verifyMFA: (code: string) => Promise<void>;
  disableMFA: (password: string) => Promise<void>;

  // Utility
  clearError: () => void;
}
```

### Examples

#### Login Flow

```tsx
function LoginForm() {
  const { login, isAuthenticating, error } = useAuth();
  const [credentials, setCredentials] = useState({ email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(credentials);
      // Redirect on success
      router.push('/dashboard');
    } catch (err) {
      console.error('Login failed:', err);
    }
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
      <button type="submit" disabled={isAuthenticating}>
        {isAuthenticating ? 'Logging in...' : 'Login'}
      </button>
      {error && <p className="error">{error.message}</p>}
    </form>
  );
}
```

#### Logout

```tsx
function UserMenu() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div className="user-menu">
      <span>Welcome, {user?.displayName}</span>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}
```

#### Token Refresh

```tsx
function ProtectedPage() {
  const { isTokenExpired, refreshSession } = useAuth();

  useEffect(() => {
    // Check token expiration periodically
    const interval = setInterval(async () => {
      if (isTokenExpired(60000)) { // 1 minute buffer
        await refreshSession();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isTokenExpired, refreshSession]);

  return <div>Protected content</div>;
}
```

#### Password Reset

```tsx
function PasswordResetForm() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await requestPasswordReset(email);
    setSubmitted(true);
  };

  if (submitted) {
    return <p>Password reset email sent to {email}</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
      />
      <button type="submit">Reset Password</button>
    </form>
  );
}
```

## useAuthState()

Hook for read-only access to authentication state. Useful when you only need to check authentication status without performing actions.

### Import

```tsx
import { useAuthState } from '@/lib/auth';
```

### Usage

```tsx
function Header() {
  const { isAuthenticated, user, isLoading } = useAuthState();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <header>
      {isAuthenticated ? (
        <UserMenu user={user} />
      ) : (
        <Link to="/login">Login</Link>
      )}
    </header>
  );
}
```

### Return Value

```tsx
interface UseAuthStateReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthenticating: boolean;
  error: AuthError | null;
}
```

## useAuthActions()

Hook for authentication actions only. Useful when you need to perform auth actions but don't need state.

### Import

```tsx
import { useAuthActions } from '@/lib/auth';
```

### Usage

```tsx
function LoginButton() {
  const { login } = useAuthActions();

  return (
    <button onClick={() => login({ email, password })}>
      Login
    </button>
  );
}
```

### Return Value

```tsx
interface UseAuthActionsReturn {
  login: (credentials: LoginCredentials, options?: LoginOptions) => Promise<void>;
  logout: (options?: LogoutOptions) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  refreshSession: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  setupMFA: () => Promise<MFASetupResult>;
  verifyMFA: (code: string) => Promise<void>;
  disableMFA: (password: string) => Promise<void>;
}
```

## useUser()

Hook for accessing current user information.

### Import

```tsx
import { useUser } from '@/lib/auth';
```

### Usage

```tsx
function UserProfile() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <p>Not logged in</p>;
  }

  return (
    <div>
      <h1>{user.displayName}</h1>
      <p>{user.email}</p>
      <p>Member since: {new Date(user.createdAt).toLocaleDateString()}</p>
    </div>
  );
}
```

### Return Value

```tsx
interface UseUserReturn {
  user: User | null;
  isLoading: boolean;
}
```

## useTokens()

Hook for accessing and managing authentication tokens. Use with caution.

### Import

```tsx
import { useTokens } from '@/lib/auth';
```

### Usage

```tsx
function ApiClient() {
  const { accessToken, isExpired, refreshTokens } = useTokens();

  const makeApiCall = async (endpoint) => {
    // Refresh token if expired
    if (isExpired()) {
      await refreshTokens();
    }

    const response = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    return response.json();
  };

  return <button onClick={() => makeApiCall('/api/data')}>Load Data</button>;
}
```

### Return Value

```tsx
interface UseTokensReturn {
  accessToken: string | null;
  refreshToken: string | null;
  isExpired: (bufferMs?: number) => boolean;
  refreshTokens: () => Promise<void>;
}
```

### Security Note

Direct token access should be avoided when possible. Use the built-in API client which automatically handles tokens.

## Hook Composition

You can compose multiple hooks for specific use cases:

```tsx
function ComplexComponent() {
  const { user } = useUser();
  const { login, logout } = useAuthActions();
  const { isExpired, refreshTokens } = useTokens();

  // Your component logic
}
```

## Error Handling

All hooks provide access to the current error state:

```tsx
function MyComponent() {
  const { error, clearError } = useAuth();

  useEffect(() => {
    if (error) {
      // Show error notification
      toast.error(error.message);

      // Clear error after showing
      setTimeout(clearError, 5000);
    }
  }, [error, clearError]);

  return <div>Content</div>;
}
```

## Best Practices

1. **Use the right hook**: Choose the appropriate hook for your use case.

   ```tsx
   // Good: Only need state
   const { isAuthenticated } = useAuthState();

   // Bad: Using full hook when only state is needed
   const { isAuthenticated } = useAuth();
   ```

2. **Handle loading states**: Always check loading states before rendering.

   ```tsx
   const { user, isLoading } = useUser();

   if (isLoading) return <Spinner />;
   if (!user) return <LoginPrompt />;

   return <UserProfile user={user} />;
   ```

3. **Error handling**: Implement proper error handling.

   ```tsx
   const { login, error } = useAuth();

   const handleLogin = async () => {
     try {
       await login(credentials);
     } catch (err) {
       // Error is also available in error state
       console.error('Login failed:', error);
     }
   };
   ```

4. **Avoid token access**: Use the API client instead of manual token management.

   ```tsx
   // Good: Use API client
   const { apiClient } = useAuth();
   await apiClient.get('/api/data');

   // Bad: Manual token management
   const { accessToken } = useTokens();
   await fetch('/api/data', {
     headers: { 'Authorization': `Bearer ${accessToken}` }
   });
   ```

## TypeScript Support

All hooks are fully typed:

```tsx
import { useAuth } from '@/lib/auth';
import type { User, LoginCredentials } from '@/lib/auth/types';

function LoginComponent() {
  const {
    login,
    user, // Type: User | null
    isAuthenticated, // Type: boolean
  } = useAuth();

  const handleLogin = async (credentials: LoginCredentials) => {
    await login(credentials);
  };

  return <div>{user?.email}</div>;
}
```

## See Also

- [AUTH_PROVIDER.md](./AUTH_PROVIDER.md) - Auth Provider component
- [AUTH_SERVICE.md](./AUTH_SERVICE.md) - Core auth service
- [GUARDS.md](./GUARDS.md) - Route guards
- [TYPES.md](./TYPES.md) - Type definitions
