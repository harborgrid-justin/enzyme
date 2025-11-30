# Auth Provider Component

The `AuthProvider` component is a React context provider that manages global authentication state and makes it available to all child components.

## Overview

The Auth Provider:

- Manages authentication state (user, tokens, loading states)
- Handles automatic token refresh
- Provides authentication methods to child components
- Persists and restores sessions
- Handles authentication errors
- Integrates with the auth service

## Import

```tsx
import { AuthProvider } from '@/lib/auth';
```

## Basic Usage

```tsx
import { AuthProvider } from '@/lib/auth';

function App() {
  return (
    <AuthProvider>
      <YourApplication />
    </AuthProvider>
  );
}
```

## Props

### children

**Type**: `ReactNode`

**Required**: Yes

Child components that will have access to the authentication context.

```tsx
<AuthProvider>
  <App />
</AuthProvider>
```

### config

**Type**: `AuthConfig`

**Required**: No

Configuration options for the auth provider.

```tsx
const authConfig = {
  apiEndpoint: '/api/auth',
  autoRefresh: true,
  tokenExpiry: 3600,
  refreshBuffer: 300000,
};

<AuthProvider config={authConfig}>
  <App />
</AuthProvider>
```

### onAuthStateChange

**Type**: `(state: AuthState) => void`

**Required**: No

Callback fired when authentication state changes.

```tsx
<AuthProvider
  onAuthStateChange={(state) => {
    console.log('Auth state changed:', state.isAuthenticated);

    // Track authentication events
    if (state.isAuthenticated) {
      analytics.track('user_logged_in', {
        userId: state.user?.id,
      });
    }
  }}
>
  <App />
</AuthProvider>
```

### loadingComponent

**Type**: `ReactNode`

**Required**: No

Component to display while authentication state is being initialized.

```tsx
<AuthProvider loadingComponent={<SplashScreen />}>
  <App />
</AuthProvider>
```

### errorFallback

**Type**: `(error: Error) => ReactNode`

**Required**: No

Function that returns a component to display when authentication errors occur.

```tsx
<AuthProvider
  errorFallback={(error) => (
    <div>
      <h1>Authentication Error</h1>
      <p>{error.message}</p>
    </div>
  )}
>
  <App />
</AuthProvider>
```

## Configuration Options

### AuthConfig

```tsx
interface AuthConfig {
  // API Configuration
  apiEndpoint?: string;

  // Token Configuration
  tokenExpiry?: number;
  refreshTokenExpiry?: number;
  autoRefresh?: boolean;
  refreshBuffer?: number;

  // Storage Configuration
  storage?: 'sessionStorage' | 'localStorage' | 'memory';
  storageKey?: string;

  // Security Configuration
  csrf?: {
    enabled: boolean;
    headerName?: string;
  };
  secureCookies?: boolean;

  // Feature Flags
  features?: {
    mfa?: boolean;
    passwordReset?: boolean;
    emailVerification?: boolean;
  };

  // Callbacks
  onTokenExpired?: () => void;
  onSessionRestored?: (user: User) => void;
  onLogout?: () => void;
}
```

## Complete Example

```tsx
import { AuthProvider, useAuth } from '@/lib/auth';

const authConfig = {
  apiEndpoint: process.env.NEXT_PUBLIC_API_URL + '/auth',
  autoRefresh: true,
  refreshBuffer: 300000, // 5 minutes
  storage: 'sessionStorage',
  csrf: {
    enabled: true,
  },
  features: {
    mfa: true,
    passwordReset: true,
    emailVerification: true,
  },
  onTokenExpired: () => {
    console.log('Token expired, redirecting to login');
    window.location.href = '/login';
  },
};

function App() {
  const handleAuthChange = (state) => {
    if (state.isAuthenticated) {
      analytics.identify(state.user.id, {
        email: state.user.email,
        name: state.user.displayName,
      });
    }
  };

  return (
    <AuthProvider
      config={authConfig}
      onAuthStateChange={handleAuthChange}
      loadingComponent={<LoadingSpinner />}
      errorFallback={(error) => (
        <ErrorBoundary error={error} />
      )}
    >
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
```

## Context Value

The Auth Provider makes the following values available through the `useAuth()` hook:

```tsx
interface AuthContextValue {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  refreshSession: () => Promise<void>;

  // Token Management
  getAccessToken: () => string | null;
  isTokenExpired: () => boolean;

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
}
```

## Session Persistence

The Auth Provider automatically:

1. Saves sessions to secure storage after login
2. Restores sessions on application load
3. Clears sessions on logout
4. Handles session expiration

```tsx
// Sessions are automatically persisted
const { login } = useAuth();
await login(credentials);
// Session is saved to secure storage

// On page reload
// Session is automatically restored
useEffect(() => {
  // User is already logged in!
  if (user) {
    console.log('Session restored:', user.email);
  }
}, [user]);
```

## Automatic Token Refresh

When `autoRefresh` is enabled, the Auth Provider automatically refreshes tokens before they expire:

```tsx
const authConfig = {
  autoRefresh: true,
  refreshBuffer: 300000, // Refresh 5 minutes before expiry
};

<AuthProvider config={authConfig}>
  <App />
</AuthProvider>

// Tokens are automatically refreshed in the background
// No action required from your application
```

## Error Handling

The Auth Provider handles various error scenarios:

```tsx
function App() {
  return (
    <AuthProvider
      errorFallback={(error) => {
        if (error.code === 'network_error') {
          return <NetworkErrorScreen />;
        }
        if (error.code === 'session_expired') {
          return <SessionExpiredScreen />;
        }
        return <GenericErrorScreen error={error} />;
      }}
    >
      <YourApp />
    </AuthProvider>
  );
}
```

## Loading States

The provider manages various loading states:

```tsx
function MyComponent() {
  const { isLoading, isAuthenticating } = useAuth();

  if (isLoading) {
    return <Spinner />;
  }

  if (isAuthenticating) {
    return <p>Logging in...</p>;
  }

  return <Dashboard />;
}
```

## Integration with Routing

### React Router

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/auth';

function PrivateRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

### Next.js

```tsx
// pages/_app.tsx
import { AuthProvider } from '@/lib/auth';
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}

// pages/dashboard.tsx
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function Dashboard() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return <DashboardContent />;
}
```

## Testing

### Mocking the Auth Provider

```tsx
import { renderWithAuth } from '@/lib/auth/test-utils';

describe('MyComponent', () => {
  it('renders for authenticated users', () => {
    const { getByText } = renderWithAuth(<MyComponent />, {
      user: {
        id: '1',
        email: 'test@example.com',
        displayName: 'Test User',
      },
      isAuthenticated: true,
    });

    expect(getByText('Welcome, Test User')).toBeInTheDocument();
  });

  it('redirects unauthenticated users', () => {
    const { queryByText } = renderWithAuth(<MyComponent />, {
      isAuthenticated: false,
    });

    expect(queryByText('Dashboard')).not.toBeInTheDocument();
  });
});
```

### Custom Test Wrapper

```tsx
import { AuthProvider } from '@/lib/auth';
import { render } from '@testing-library/react';

const AllTheProviders = ({ children, authState }) => {
  return (
    <AuthProvider initialState={authState}>
      {children}
    </AuthProvider>
  );
};

const customRender = (ui, { authState, ...options } = {}) =>
  render(ui, { wrapper: (props) => <AllTheProviders {...props} authState={authState} />, ...options });

// Usage
customRender(<MyComponent />, {
  authState: {
    user: { id: '1', email: 'test@example.com' },
    isAuthenticated: true,
  },
});
```

## Best Practices

1. **Wrap at the root level**: Place the AuthProvider at the highest level of your component tree.

   ```tsx
   // Good
   <AuthProvider>
     <Router>
       <App />
     </Router>
   </AuthProvider>

   // Bad
   <Router>
     <AuthProvider>
       <App />
     </AuthProvider>
   </Router>
   ```

2. **Use configuration**: Centralize your auth configuration.

   ```tsx
   // config/auth.ts
   export const authConfig = {
     apiEndpoint: process.env.API_URL,
     autoRefresh: true,
   };

   // App.tsx
   <AuthProvider config={authConfig}>
     <App />
   </AuthProvider>
   ```

3. **Handle loading states**: Always check loading states before rendering protected content.

   ```tsx
   const { isAuthenticated, isLoading } = useAuth();

   if (isLoading) return <Spinner />;
   if (!isAuthenticated) return <Navigate to="/login" />;

   return <ProtectedContent />;
   ```

4. **Track state changes**: Use the `onAuthStateChange` callback for analytics and side effects.

   ```tsx
   <AuthProvider
     onAuthStateChange={(state) => {
       if (state.isAuthenticated) {
         initializeServices(state.user);
       } else {
         cleanupServices();
       }
     }}
   >
     <App />
   </AuthProvider>
   ```

## Related Documentation

### Authentication Module
- [Authentication Module](./README.md) - Main authentication documentation
- [Auth Overview](./OVERVIEW.md) - Architecture and features
- [Auth Service](./AUTH_SERVICE.md) - Core authentication service API
- [Auth Hooks](./HOOKS.md) - React hooks (useAuth, useAuthState, etc.)
- [Route Guards](./GUARDS.md) - Component-based route protection
- [RBAC System](./RBAC.md) - Role-Based Access Control
- [Common Patterns](./PATTERNS.md) - Implementation examples
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues

### Security & Integration
- [Security Module](../security/README.md) - Security infrastructure
- [Secure Storage](../security/SECURE_STORAGE.md) - Encrypted token storage
- [State Management](../state/README.md) - Auth state management
- [API Module](../api/README.md) - API client integration
