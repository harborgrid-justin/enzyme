# Authentication Guide

> Complete guide to authentication, session management, and SSO integration in the Harbor React Library.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [AuthProvider Setup](#authprovider-setup)
- [Authentication Hooks](#authentication-hooks)
- [Auth Service](#auth-service)
- [Token Management](#token-management)
- [Session Management](#session-management)
- [SSO Integration](#sso-integration)
- [Active Directory Integration](#active-directory-integration)
- [Multi-Factor Authentication](#multi-factor-authentication)
- [Security Best Practices](#security-best-practices)

---

## Overview

The authentication system provides:

- **React Context-based state management** for auth state
- **Secure token storage** with automatic refresh
- **Route guards** for protecting pages
- **SSO support** for SAML, OAuth2, and OIDC
- **Active Directory integration** for enterprise environments
- **MFA support** with TOTP and WebAuthn

---

## Quick Start

### Basic Authentication Setup

```tsx
import { AuthProvider, useAuth, RequireAuth } from '@/lib/auth';

// 1. Wrap your app with AuthProvider
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<RequireAuth />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

// 2. Create login page
function Login() {
  const { login, isLoading, error } = useAuth();
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await login(credentials);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={credentials.email}
        onChange={(e) => setCredentials(prev => ({
          ...prev,
          email: e.target.value,
        }))}
      />
      <input
        type="password"
        value={credentials.password}
        onChange={(e) => setCredentials(prev => ({
          ...prev,
          password: e.target.value,
        }))}
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}

// 3. Access user in protected pages
function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div>
      <h1>Welcome, {user.displayName}!</h1>
      <button onClick={logout}>Sign Out</button>
    </div>
  );
}
```

---

## AuthProvider Setup

### Basic Configuration

```tsx
import { AuthProvider } from '@/lib/auth';

function App() {
  return (
    <AuthProvider
      config={{
        // API endpoints
        endpoints: {
          login: '/api/auth/login',
          logout: '/api/auth/logout',
          refresh: '/api/auth/refresh',
          me: '/api/auth/me',
        },

        // Token configuration
        tokenStorage: 'secure', // 'secure' | 'memory' | 'local'
        tokenRefreshThreshold: 5 * 60 * 1000, // 5 minutes

        // Session configuration
        sessionTimeout: 30 * 60 * 1000, // 30 minutes
        extendSessionOnActivity: true,

        // Callbacks
        onLogin: (user) => {
          analytics.identify(user.id);
        },
        onLogout: () => {
          analytics.reset();
        },
        onSessionExpired: () => {
          toast.warning('Your session has expired');
        },
      }}
    >
      <App />
    </AuthProvider>
  );
}
```

### Configuration Options

```typescript
interface AuthProviderConfig {
  // API Endpoints
  endpoints: {
    login: string;
    logout: string;
    refresh: string;
    me: string;
    register?: string;
    forgotPassword?: string;
    resetPassword?: string;
    verifyEmail?: string;
    mfa?: {
      setup: string;
      verify: string;
      disable: string;
    };
  };

  // Token Management
  tokenStorage: 'secure' | 'memory' | 'local' | 'session';
  tokenRefreshThreshold: number;
  accessTokenKey?: string;
  refreshTokenKey?: string;

  // Session Management
  sessionTimeout: number;
  extendSessionOnActivity: boolean;
  activityEvents?: string[];

  // Persistence
  persistSession: boolean;
  rememberMeEnabled: boolean;
  rememberMeDuration: number;

  // Callbacks
  onLogin?: (user: User) => void;
  onLogout?: () => void;
  onSessionExpired?: () => void;
  onTokenRefresh?: (tokens: AuthTokens) => void;
  onError?: (error: AuthError) => void;

  // Redirect Configuration
  loginRedirect: string;
  logoutRedirect: string;
  unauthorizedRedirect: string;
}
```

### Custom Token Storage

```tsx
import { AuthProvider, createTokenStorage } from '@/lib/auth';

// Create custom token storage
const customStorage = createTokenStorage({
  get: async (key) => {
    // Custom retrieval logic
    return await secureStore.get(key);
  },
  set: async (key, value) => {
    // Custom storage logic
    await secureStore.set(key, value);
  },
  remove: async (key) => {
    // Custom removal logic
    await secureStore.remove(key);
  },
});

<AuthProvider tokenStorage={customStorage}>
  <App />
</AuthProvider>
```

---

## Authentication Hooks

### useAuth Hook

```tsx
import { useAuth } from '@/lib/auth';

function MyComponent() {
  const {
    // State
    user,              // Current user or null
    isAuthenticated,   // Boolean auth status
    isLoading,         // Loading state
    error,             // Error message or null

    // Actions
    login,             // Login function
    logout,            // Logout function
    register,          // Registration function
    refreshSession,    // Manual session refresh

    // Role/Permission checks
    hasRole,           // Check single role
    hasAnyRole,        // Check any of roles
    hasPermission,     // Check single permission
    hasAnyPermission,  // Check any of permissions
  } = useAuth();

  // Usage examples
  if (isLoading) return <Spinner />;
  if (!isAuthenticated) return <LoginPrompt />;

  return (
    <div>
      <p>Welcome, {user.displayName}</p>
      {hasRole('admin') && <AdminPanel />}
      {hasPermission('users:create') && <CreateUserButton />}
    </div>
  );
}
```

### useHasRole Hook

```tsx
import { useHasRole } from '@/lib/auth';

function AdminButton() {
  const isAdmin = useHasRole('admin');

  if (!isAdmin) return null;

  return <button>Admin Action</button>;
}

// Multiple roles (any)
function ManagerContent() {
  const canManage = useHasRole(['admin', 'manager']);

  if (!canManage) return null;

  return <ManagementPanel />;
}
```

### useHasPermission Hook

```tsx
import { useHasPermission } from '@/lib/auth';

function ActionButtons() {
  const canCreate = useHasPermission('users:create');
  const canDelete = useHasPermission('users:delete');

  return (
    <div>
      {canCreate && <button>Create User</button>}
      {canDelete && <button>Delete User</button>}
    </div>
  );
}
```

### useAuthContext Hook

```tsx
import { useAuthContext } from '@/lib/auth';

// Access the full context value
function DebugAuth() {
  const context = useAuthContext();

  console.log('Auth context:', context);

  return null;
}
```

---

## Auth Service

### Direct Service Access

```tsx
import { authService } from '@/lib/auth';

// Login
const user = await authService.login({
  email: 'user@example.com',
  password: 'password123',
  rememberMe: true,
});

// Logout
await authService.logout();

// Register
const newUser = await authService.register({
  email: 'user@example.com',
  password: 'password123',
  firstName: 'John',
  lastName: 'Doe',
});

// Get current user
const currentUser = await authService.getCurrentUser();

// Refresh tokens
const newTokens = await authService.refreshTokens();

// Password reset
await authService.forgotPassword('user@example.com');
await authService.resetPassword(token, newPassword);

// Email verification
await authService.verifyEmail(token);
await authService.resendVerification();
```

### Service Methods

```typescript
interface AuthService {
  // Authentication
  login(credentials: LoginCredentials): Promise<User>;
  logout(): Promise<void>;
  register(credentials: RegisterCredentials): Promise<User>;

  // Session Management
  getCurrentUser(): Promise<User | null>;
  refreshTokens(): Promise<AuthTokens>;
  isAuthenticated(): boolean;

  // Password Management
  forgotPassword(email: string): Promise<void>;
  resetPassword(token: string, password: string): Promise<void>;
  changePassword(oldPassword: string, newPassword: string): Promise<void>;

  // Email Verification
  verifyEmail(token: string): Promise<void>;
  resendVerification(): Promise<void>;

  // MFA
  setupMFA(method: 'totp' | 'webauthn'): Promise<MFASetup>;
  verifyMFA(code: string): Promise<void>;
  disableMFA(code: string): Promise<void>;

  // Social Auth
  loginWithProvider(provider: string): Promise<void>;
  linkProvider(provider: string): Promise<void>;
  unlinkProvider(provider: string): Promise<void>;
}
```

---

## Token Management

### Token Structure

```typescript
interface AuthTokens {
  accessToken: string;     // Short-lived JWT
  refreshToken: string;    // Long-lived refresh token
  expiresAt: number;       // Access token expiration timestamp
  tokenType: 'Bearer';     // Token type
}

interface AccessTokenPayload {
  sub: string;             // User ID
  email: string;
  roles: string[];
  permissions: string[];
  iat: number;             // Issued at
  exp: number;             // Expires at
  jti: string;             // Token ID
}
```

### Automatic Token Refresh

```tsx
// Token refresh is handled automatically by AuthProvider
// Configuration options:
<AuthProvider
  config={{
    tokenRefreshThreshold: 5 * 60 * 1000, // Refresh 5 min before expiry
    onTokenRefresh: (tokens) => {
      console.log('Tokens refreshed:', tokens.expiresAt);
    },
  }}
>
```

### Manual Token Access

```tsx
import { useAuth } from '@/lib/auth';

function ApiTester() {
  const { getAccessToken, refreshSession } = useAuth();

  const makeCustomRequest = async () => {
    const token = await getAccessToken();

    const response = await fetch('/api/custom', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      // Token expired, refresh and retry
      await refreshSession();
      return makeCustomRequest();
    }

    return response.json();
  };

  return <button onClick={makeCustomRequest}>Test API</button>;
}
```

### Token Storage Security

```tsx
// Secure storage (recommended) - encrypted in SecureStorage
<AuthProvider config={{ tokenStorage: 'secure' }}>

// Memory storage - tokens lost on page refresh
<AuthProvider config={{ tokenStorage: 'memory' }}>

// Local storage - persisted but less secure
<AuthProvider config={{ tokenStorage: 'local' }}>

// Session storage - persisted for session only
<AuthProvider config={{ tokenStorage: 'session' }}>
```

---

## Session Management

### Session Timeout

```tsx
<AuthProvider
  config={{
    // Session expires after 30 minutes of inactivity
    sessionTimeout: 30 * 60 * 1000,

    // Extend session on user activity
    extendSessionOnActivity: true,

    // Activity events that extend session
    activityEvents: [
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
    ],

    // Callback when session expires
    onSessionExpired: () => {
      toast.warning('Your session has expired. Please log in again.');
    },
  }}
>
```

### Session Monitoring Hook

```tsx
import { useSessionMonitor } from '@/lib/auth';

function SessionWarning() {
  const {
    timeRemaining,      // Milliseconds until expiration
    isExpiringSoon,     // True if < 5 min remaining
    extendSession,      // Manual session extension
    sessionExpired,     // True if session expired
  } = useSessionMonitor({
    warningThreshold: 5 * 60 * 1000, // Show warning at 5 min
    onWarning: () => {
      // Show warning modal
    },
  });

  if (!isExpiringSoon) return null;

  return (
    <Dialog open>
      <DialogContent>
        <h2>Session Expiring Soon</h2>
        <p>Your session will expire in {Math.ceil(timeRemaining / 1000)} seconds.</p>
        <button onClick={extendSession}>Stay Signed In</button>
      </DialogContent>
    </Dialog>
  );
}
```

---

## SSO Integration

### OAuth2 / OpenID Connect

```tsx
import { AuthProvider, OAuthConfig } from '@/lib/auth';

const oauthConfig: OAuthConfig = {
  provider: 'oidc',
  clientId: process.env.VITE_OAUTH_CLIENT_ID,
  authority: 'https://auth.example.com',
  redirectUri: `${window.location.origin}/auth/callback`,
  scopes: ['openid', 'profile', 'email'],
  responseType: 'code',
  pkce: true, // Use PKCE for security
};

<AuthProvider sso={oauthConfig}>
  <App />
</AuthProvider>
```

### OAuth Login Flow

```tsx
import { useAuth } from '@/lib/auth';

function LoginPage() {
  const { loginWithSSO, ssoProviders } = useAuth();

  return (
    <div>
      <h1>Sign In</h1>

      {/* SSO Buttons */}
      <div className="sso-buttons">
        <button onClick={() => loginWithSSO('google')}>
          Sign in with Google
        </button>
        <button onClick={() => loginWithSSO('microsoft')}>
          Sign in with Microsoft
        </button>
        <button onClick={() => loginWithSSO('okta')}>
          Sign in with Okta
        </button>
      </div>

      {/* Or traditional login form */}
      <LoginForm />
    </div>
  );
}

// OAuth callback handler
function AuthCallback() {
  const { handleOAuthCallback } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    handleOAuthCallback()
      .then(() => navigate('/dashboard'))
      .catch((error) => {
        toast.error('Authentication failed');
        navigate('/login');
      });
  }, []);

  return <LoadingSpinner />;
}
```

### SAML Configuration

```tsx
import { AuthProvider, SAMLConfig } from '@/lib/auth';

const samlConfig: SAMLConfig = {
  provider: 'saml',
  entryPoint: 'https://idp.example.com/sso/saml',
  issuer: 'my-app',
  cert: process.env.VITE_SAML_CERT,
  callbackUrl: `${window.location.origin}/auth/saml/callback`,
  signatureAlgorithm: 'sha256',
  wantAssertionsSigned: true,
};

<AuthProvider sso={samlConfig}>
  <App />
</AuthProvider>
```

---

## Active Directory Integration

### Azure AD Configuration

```tsx
import { AuthProvider } from '@/lib/auth';

const azureADConfig = {
  provider: 'azure-ad',
  clientId: process.env.VITE_AZURE_CLIENT_ID,
  tenantId: process.env.VITE_AZURE_TENANT_ID,
  redirectUri: `${window.location.origin}/auth/callback`,
  scopes: ['User.Read', 'profile', 'email'],
  authority: `https://login.microsoftonline.com/${process.env.VITE_AZURE_TENANT_ID}`,
};

<AuthProvider sso={azureADConfig}>
  <App />
</AuthProvider>
```

### AD Group Mapping

```tsx
import { AuthProvider } from '@/lib/auth';

const config = {
  sso: azureADConfig,

  // Map AD groups to application roles
  groupMapping: {
    'DOMAIN\\Administrators': ['admin'],
    'DOMAIN\\Managers': ['manager'],
    'DOMAIN\\Users': ['user'],
  },

  // Transform claims to user object
  claimsTransform: (claims) => ({
    id: claims.oid,
    email: claims.email,
    displayName: claims.name,
    firstName: claims.given_name,
    lastName: claims.family_name,
    roles: mapGroupsToRoles(claims.groups),
  }),
};

<AuthProvider {...config}>
  <App />
</AuthProvider>
```

### On-Premises AD with LDAP

```tsx
// Server-side configuration (for LDAP auth)
// Frontend configuration
const ldapConfig = {
  provider: 'ldap',
  loginEndpoint: '/api/auth/ldap/login',
  domain: 'MYDOMAIN',
};

<AuthProvider sso={ldapConfig}>
  <App />
</AuthProvider>

// Login component for LDAP
function LDAPLogin() {
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login({
      username: `MYDOMAIN\\${username}`, // or username@domain.com
      password,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>Domain Username</label>
      <input
        placeholder="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit">Sign In</button>
    </form>
  );
}
```

---

## Multi-Factor Authentication

### MFA Setup Flow

```tsx
import { useAuth, useMFA } from '@/lib/auth';

function MFASetup() {
  const { setupMFA, verifyMFA, mfaSetup, mfaMethods } = useMFA();

  const [step, setStep] = useState('choose');
  const [code, setCode] = useState('');

  // Step 1: Choose MFA method
  if (step === 'choose') {
    return (
      <div>
        <h2>Enable Two-Factor Authentication</h2>
        <button onClick={() => initSetup('totp')}>
          Authenticator App
        </button>
        <button onClick={() => initSetup('sms')}>
          SMS Code
        </button>
        <button onClick={() => initSetup('webauthn')}>
          Security Key
        </button>
      </div>
    );
  }

  // Step 2: Setup TOTP
  if (step === 'totp-setup') {
    return (
      <div>
        <h2>Scan QR Code</h2>
        <img src={mfaSetup.qrCode} alt="QR Code" />
        <p>Or enter manually: {mfaSetup.secret}</p>
        <input
          placeholder="Enter 6-digit code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button onClick={() => verify(code)}>Verify</button>
      </div>
    );
  }

  // Step 3: Backup codes
  if (step === 'backup') {
    return (
      <div>
        <h2>Save Your Backup Codes</h2>
        <p>Store these codes safely. Each can only be used once.</p>
        <ul>
          {mfaSetup.backupCodes.map((code) => (
            <li key={code}>{code}</li>
          ))}
        </ul>
        <button onClick={() => downloadCodes()}>Download</button>
        <button onClick={() => setStep('complete')}>Done</button>
      </div>
    );
  }

  async function initSetup(method) {
    await setupMFA(method);
    setStep(`${method}-setup`);
  }

  async function verify(verifyCode) {
    await verifyMFA(verifyCode);
    setStep('backup');
  }
}
```

### MFA Login Flow

```tsx
function LoginWithMFA() {
  const { login, verifyMFA, mfaRequired, mfaMethods } = useAuth();
  const [step, setStep] = useState('credentials');
  const [code, setCode] = useState('');

  if (step === 'credentials') {
    return (
      <form onSubmit={handleLogin}>
        <input type="email" name="email" required />
        <input type="password" name="password" required />
        <button type="submit">Sign In</button>
      </form>
    );
  }

  if (step === 'mfa') {
    return (
      <form onSubmit={handleMFA}>
        <h2>Two-Factor Authentication</h2>
        <p>Enter the code from your authenticator app</p>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button type="submit">Verify</button>
        <button type="button" onClick={() => setStep('backup')}>
          Use Backup Code
        </button>
      </form>
    );
  }

  async function handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
      await login({
        email: formData.get('email'),
        password: formData.get('password'),
      });
    } catch (error) {
      if (error.code === 'MFA_REQUIRED') {
        setStep('mfa');
      } else {
        throw error;
      }
    }
  }

  async function handleMFA(e) {
    e.preventDefault();
    await verifyMFA(code);
  }
}
```

### WebAuthn (Security Key)

```tsx
import { useAuth } from '@/lib/auth';

function WebAuthnSetup() {
  const { setupWebAuthn, credentials } = useAuth();

  const registerSecurityKey = async () => {
    try {
      await setupWebAuthn({
        name: 'My Security Key',
        platform: false, // false for roaming authenticators
      });
      toast.success('Security key registered');
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        toast.error('Operation cancelled');
      } else {
        toast.error('Failed to register security key');
      }
    }
  };

  return (
    <div>
      <h2>Security Keys</h2>
      <ul>
        {credentials.map((cred) => (
          <li key={cred.id}>
            {cred.name}
            <button onClick={() => removeCred(cred.id)}>Remove</button>
          </li>
        ))}
      </ul>
      <button onClick={registerSecurityKey}>Add Security Key</button>
    </div>
  );
}
```

---

## Security Best Practices

### 1. Secure Token Storage

```tsx
// Always use secure storage for tokens
<AuthProvider config={{ tokenStorage: 'secure' }}>

// Never log tokens
console.log(token); // DON'T DO THIS

// Clear tokens on logout
const logout = async () => {
  await authService.logout();
  // Tokens are automatically cleared
};
```

### 2. HTTPS Only

```tsx
// Ensure cookies are secure
const config = {
  cookie: {
    secure: true,       // Only send over HTTPS
    httpOnly: true,     // Not accessible via JS
    sameSite: 'strict', // CSRF protection
  },
};
```

### 3. Password Requirements

```tsx
import { validatePassword } from '@/lib/auth';

function RegistrationForm() {
  const [password, setPassword] = useState('');
  const validation = validatePassword(password);

  return (
    <div>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <ul>
        <li className={validation.length ? 'pass' : 'fail'}>
          At least 12 characters
        </li>
        <li className={validation.uppercase ? 'pass' : 'fail'}>
          Contains uppercase letter
        </li>
        <li className={validation.lowercase ? 'pass' : 'fail'}>
          Contains lowercase letter
        </li>
        <li className={validation.number ? 'pass' : 'fail'}>
          Contains number
        </li>
        <li className={validation.special ? 'pass' : 'fail'}>
          Contains special character
        </li>
      </ul>
    </div>
  );
}
```

### 4. Rate Limiting

```tsx
// Configure rate limiting on login
const config = {
  rateLimit: {
    maxAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    onLockout: (remainingTime) => {
      toast.error(`Too many attempts. Try again in ${remainingTime / 1000}s`);
    },
  },
};
```

### 5. Session Security

```tsx
// Rotate session on privilege escalation
const config = {
  rotateSessionOnLogin: true,
  rotateSessionOnPrivilegeEscalation: true,
};

// Detect concurrent sessions
const config = {
  singleSession: true, // Only one active session
  onConcurrentSession: () => {
    toast.warning('You were signed out because another session started');
  },
};
```

### 6. Audit Logging

```tsx
<AuthProvider
  config={{
    onLogin: (user) => {
      auditLog.log('LOGIN', { userId: user.id, ip: getClientIP() });
    },
    onLogout: () => {
      auditLog.log('LOGOUT', { userId: currentUser.id });
    },
    onPasswordChange: () => {
      auditLog.log('PASSWORD_CHANGE', { userId: currentUser.id });
    },
  }}
>
```

---

## Type Definitions

```typescript
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  avatarUrl?: string;
  roles: Role[];
  permissions: Permission[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

type Role = 'admin' | 'manager' | 'user' | 'guest';
type Permission = string;

interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
  mfaCode?: string;
}

interface RegisterCredentials {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  refreshSession: () => Promise<void>;
  hasRole: (role: Role) => boolean;
  hasAnyRole: (roles: Role[]) => boolean;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
}
```

---

## See Also

### Core Authentication
- [Auth Examples](./examples/auth-examples.md) - 25+ authentication examples
- [RBAC Guide](./RBAC.md) - Role-based access control patterns
- [Routing Guide](./ROUTING.md) - Route guards and protected routes
- [API Documentation](../../docs/API.md) - API authentication integration

### Security & Configuration
- [Security Guide](../../docs/SECURITY.md) - Security best practices
- [Configuration Guide](../../docs/CONFIGURATION.md) - Auth configuration options
- [Environment Setup](../../docs/ENVIRONMENT.md) - Auth environment variables

### Architecture & Development
- [Architecture Overview](../../docs/ARCHITECTURE.md) - Auth system architecture
- [State Management](../../docs/STATE.md) - Auth state management
- [Testing Guide](../../docs/TESTING.md) - Testing authentication flows

### Reference
- [Documentation Index](./INDEX.md) - All library documentation
- [Template Index](../../docs/INDEX.md) - Template documentation
