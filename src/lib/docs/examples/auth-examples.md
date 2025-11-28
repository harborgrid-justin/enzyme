# Authentication Examples

> 25+ practical authentication examples for the Harbor React Library.

## Table of Contents

- [Basic Authentication](#basic-authentication)
- [Login and Logout](#login-and-logout)
- [Registration](#registration)
- [Password Management](#password-management)
- [Session Management](#session-management)
- [Token Handling](#token-handling)
- [Social Authentication](#social-authentication)
- [Multi-Factor Authentication](#multi-factor-authentication)
- [Advanced Patterns](#advanced-patterns)

---

## Basic Authentication

### Example 1: AuthProvider Setup

```tsx
import { AuthProvider } from '@/lib/auth';

function App() {
  return (
    <AuthProvider
      config={{
        endpoints: {
          login: '/api/auth/login',
          logout: '/api/auth/logout',
          refresh: '/api/auth/refresh',
          me: '/api/auth/me',
        },
        tokenStorage: 'secure',
        sessionTimeout: 30 * 60 * 1000,
      }}
    >
      <MainApp />
    </AuthProvider>
  );
}
```

### Example 2: Access Auth State

```tsx
import { useAuth } from '@/lib/auth';

function UserGreeting() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <Skeleton />;

  if (!isAuthenticated) {
    return <p>Please sign in</p>;
  }

  return <p>Welcome, {user.displayName}!</p>;
}
```

### Example 3: Protected Content

```tsx
import { useAuth } from '@/lib/auth';

function Dashboard() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Email: {user.email}</p>
      <p>Roles: {user.roles.join(', ')}</p>
    </div>
  );
}
```

---

## Login and Logout

### Example 4: Login Form

```tsx
import { useAuth } from '@/lib/auth';
import { useState } from 'react';

function LoginForm() {
  const { login, isLoading, error } = useAuth();
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await login(credentials);
      navigate('/dashboard');
    } catch (err) {
      // Error is also available via the error state
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Email"
        value={credentials.email}
        onChange={(e) => setCredentials(prev => ({
          ...prev,
          email: e.target.value,
        }))}
        required
      />

      <input
        type="password"
        placeholder="Password"
        value={credentials.password}
        onChange={(e) => setCredentials(prev => ({
          ...prev,
          password: e.target.value,
        }))}
        required
      />

      <label>
        <input
          type="checkbox"
          checked={credentials.rememberMe}
          onChange={(e) => setCredentials(prev => ({
            ...prev,
            rememberMe: e.target.checked,
          }))}
        />
        Remember me
      </label>

      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
}
```

### Example 5: Login with Redirect

```tsx
function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleLogin = async (credentials) => {
    await login(credentials);
    navigate(from, { replace: true });
  };

  return <LoginForm onSubmit={handleLogin} />;
}
```

### Example 6: Logout Button

```tsx
import { useAuth } from '@/lib/auth';

function LogoutButton() {
  const { logout, isLoading } = useAuth();

  const handleLogout = async () => {
    await logout();
    // Redirect happens automatically via AuthProvider config
  };

  return (
    <button onClick={handleLogout} disabled={isLoading}>
      {isLoading ? 'Signing out...' : 'Sign Out'}
    </button>
  );
}
```

### Example 7: Logout with Confirmation

```tsx
function LogoutWithConfirmation() {
  const { logout } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleLogout = async () => {
    await logout();
    setShowConfirm(false);
  };

  return (
    <>
      <button onClick={() => setShowConfirm(true)}>Sign Out</button>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <h2>Sign Out?</h2>
          <p>Are you sure you want to sign out?</p>
          <div className="actions">
            <button onClick={() => setShowConfirm(false)}>Cancel</button>
            <button onClick={handleLogout}>Sign Out</button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

---

## Registration

### Example 8: Registration Form

```tsx
import { useAuth } from '@/lib/auth';

function RegistrationForm() {
  const { register, isLoading, error } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    await register({
      email: formData.email,
      password: formData.password,
      firstName: formData.firstName,
      lastName: formData.lastName,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="firstName"
        placeholder="First Name"
        value={formData.firstName}
        onChange={handleChange}
        required
      />
      <input
        name="lastName"
        placeholder="Last Name"
        value={formData.lastName}
        onChange={handleChange}
        required
      />
      <input
        type="email"
        name="email"
        placeholder="Email"
        value={formData.email}
        onChange={handleChange}
        required
      />
      <input
        type="password"
        name="password"
        placeholder="Password"
        value={formData.password}
        onChange={handleChange}
        required
      />
      <input
        type="password"
        name="confirmPassword"
        placeholder="Confirm Password"
        value={formData.confirmPassword}
        onChange={handleChange}
        required
      />

      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Creating account...' : 'Create Account'}
      </button>
    </form>
  );
}
```

### Example 9: Password Strength Indicator

```tsx
function PasswordInput({ value, onChange }) {
  const strength = useMemo(() => {
    let score = 0;
    if (value.length >= 8) score++;
    if (value.length >= 12) score++;
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
    if (/\d/.test(value)) score++;
    if (/[^a-zA-Z0-9]/.test(value)) score++;
    return score;
  }, [value]);

  const strengthLabel = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'][strength];
  const strengthColor = ['red', 'orange', 'yellow', 'lightgreen', 'green'][strength];

  return (
    <div>
      <input
        type="password"
        value={value}
        onChange={onChange}
        placeholder="Password"
      />
      {value && (
        <div className="strength-indicator">
          <div
            className="strength-bar"
            style={{
              width: `${(strength / 5) * 100}%`,
              backgroundColor: strengthColor,
            }}
          />
          <span>{strengthLabel}</span>
        </div>
      )}
    </div>
  );
}
```

### Example 10: Email Verification

```tsx
import { authService } from '@/lib/auth';

function EmailVerification() {
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const { token } = useParams();

  useEffect(() => {
    authService
      .verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  if (status === 'pending') {
    return <p>Verifying your email...</p>;
  }

  if (status === 'success') {
    return (
      <div>
        <h2>Email Verified!</h2>
        <p>Your email has been verified. You can now sign in.</p>
        <Link to="/login">Sign In</Link>
      </div>
    );
  }

  return (
    <div>
      <h2>Verification Failed</h2>
      <p>The verification link is invalid or expired.</p>
      <button onClick={() => authService.resendVerification()}>
        Resend Verification Email
      </button>
    </div>
  );
}
```

---

## Password Management

### Example 11: Forgot Password Form

```tsx
import { authService } from '@/lib/auth';

function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch (error) {
      toast.error('Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <div>
        <h2>Check Your Email</h2>
        <p>We've sent password reset instructions to {email}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Forgot Password</h2>
      <p>Enter your email to receive reset instructions</p>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Sending...' : 'Send Reset Link'}
      </button>
    </form>
  );
}
```

### Example 12: Reset Password Form

```tsx
import { authService } from '@/lib/auth';

function ResetPasswordForm() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      await authService.resetPassword(token, password);
      toast.success('Password reset successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Failed to reset password');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Reset Password</h2>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="New Password"
        required
      />
      <input
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Confirm Password"
        required
      />
      <button type="submit">Reset Password</button>
    </form>
  );
}
```

### Example 13: Change Password

```tsx
import { authService } from '@/lib/auth';

function ChangePasswordForm() {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    try {
      await authService.changePassword(
        formData.currentPassword,
        formData.newPassword
      );
      toast.success('Password changed successfully');
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error('Failed to change password');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Change Password</h2>
      <input
        type="password"
        placeholder="Current Password"
        value={formData.currentPassword}
        onChange={(e) => setFormData(prev => ({
          ...prev,
          currentPassword: e.target.value,
        }))}
        required
      />
      <input
        type="password"
        placeholder="New Password"
        value={formData.newPassword}
        onChange={(e) => setFormData(prev => ({
          ...prev,
          newPassword: e.target.value,
        }))}
        required
      />
      <input
        type="password"
        placeholder="Confirm New Password"
        value={formData.confirmPassword}
        onChange={(e) => setFormData(prev => ({
          ...prev,
          confirmPassword: e.target.value,
        }))}
        required
      />
      <button type="submit">Change Password</button>
    </form>
  );
}
```

---

## Session Management

### Example 14: Session Timeout Warning

```tsx
import { useSessionMonitor } from '@/lib/auth';

function SessionWarning() {
  const { timeRemaining, isExpiringSoon, extendSession } = useSessionMonitor({
    warningThreshold: 5 * 60 * 1000, // 5 minutes
  });

  if (!isExpiringSoon) return null;

  const minutes = Math.floor(timeRemaining / 60000);
  const seconds = Math.floor((timeRemaining % 60000) / 1000);

  return (
    <Dialog open>
      <DialogContent>
        <h2>Session Expiring</h2>
        <p>
          Your session will expire in {minutes}:{seconds.toString().padStart(2, '0')}
        </p>
        <button onClick={extendSession}>Stay Signed In</button>
      </DialogContent>
    </Dialog>
  );
}
```

### Example 15: Activity-Based Session Extension

```tsx
import { useAuth } from '@/lib/auth';
import { useEffect, useCallback } from 'react';
import { debounce } from 'lodash';

function ActivityTracker() {
  const { refreshSession } = useAuth();

  const extendSession = useCallback(
    debounce(() => {
      refreshSession();
    }, 60000), // At most once per minute
    []
  );

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

    events.forEach(event => {
      window.addEventListener(event, extendSession, { passive: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, extendSession);
      });
    };
  }, [extendSession]);

  return null;
}
```

---

## Token Handling

### Example 16: Manual Token Access

```tsx
import { useAuth } from '@/lib/auth';

function CustomApiCall() {
  const { getAccessToken } = useAuth();

  const fetchWithAuth = async (url: string) => {
    const token = await getAccessToken();

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.json();
  };

  return <button onClick={() => fetchWithAuth('/api/data')}>Fetch Data</button>;
}
```

### Example 17: Token Refresh Handler

```tsx
import { AuthProvider } from '@/lib/auth';

function App() {
  return (
    <AuthProvider
      config={{
        tokenRefreshThreshold: 5 * 60 * 1000,
        onTokenRefresh: (tokens) => {
          console.log('Tokens refreshed, expires at:', tokens.expiresAt);
        },
        onTokenRefreshError: (error) => {
          console.error('Token refresh failed:', error);
          // Force re-login
          navigate('/login');
        },
      }}
    >
      <MainApp />
    </AuthProvider>
  );
}
```

---

## Social Authentication

### Example 18: OAuth Login Buttons

```tsx
import { useAuth } from '@/lib/auth';

function SocialLogin() {
  const { loginWithSSO } = useAuth();

  return (
    <div className="social-login">
      <button onClick={() => loginWithSSO('google')}>
        <GoogleIcon />
        Continue with Google
      </button>

      <button onClick={() => loginWithSSO('microsoft')}>
        <MicrosoftIcon />
        Continue with Microsoft
      </button>

      <button onClick={() => loginWithSSO('github')}>
        <GitHubIcon />
        Continue with GitHub
      </button>
    </div>
  );
}
```

### Example 19: OAuth Callback Handler

```tsx
import { useAuth } from '@/lib/auth';

function OAuthCallback() {
  const { handleOAuthCallback } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleOAuthCallback()
      .then(() => navigate('/dashboard'))
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div>
        <h2>Authentication Failed</h2>
        <p>{error}</p>
        <Link to="/login">Try Again</Link>
      </div>
    );
  }

  return <p>Completing sign in...</p>;
}
```

### Example 20: Link Social Account

```tsx
import { useAuth } from '@/lib/auth';

function LinkedAccounts() {
  const { user, linkProvider, unlinkProvider } = useAuth();

  const linkedProviders = user?.linkedProviders || [];

  return (
    <div>
      <h2>Linked Accounts</h2>

      {['google', 'github', 'microsoft'].map(provider => {
        const isLinked = linkedProviders.includes(provider);

        return (
          <div key={provider} className="provider-row">
            <span>{provider}</span>
            {isLinked ? (
              <button onClick={() => unlinkProvider(provider)}>
                Unlink
              </button>
            ) : (
              <button onClick={() => linkProvider(provider)}>
                Link
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

---

## Multi-Factor Authentication

### Example 21: MFA Setup with TOTP

```tsx
import { useMFA } from '@/lib/auth';

function MFASetup() {
  const { setupMFA, verifyMFA, mfaSetup } = useMFA();
  const [step, setStep] = useState<'init' | 'verify' | 'backup'>('init');
  const [code, setCode] = useState('');

  const initSetup = async () => {
    await setupMFA('totp');
    setStep('verify');
  };

  const verify = async () => {
    await verifyMFA(code);
    setStep('backup');
  };

  if (step === 'init') {
    return (
      <div>
        <h2>Enable Two-Factor Authentication</h2>
        <p>Add an extra layer of security to your account</p>
        <button onClick={initSetup}>Set Up 2FA</button>
      </div>
    );
  }

  if (step === 'verify') {
    return (
      <div>
        <h2>Scan QR Code</h2>
        <img src={mfaSetup.qrCode} alt="QR Code" />
        <p>Or enter manually: <code>{mfaSetup.secret}</code></p>

        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter 6-digit code"
        />
        <button onClick={verify}>Verify</button>
      </div>
    );
  }

  return (
    <div>
      <h2>Save Backup Codes</h2>
      <p>Store these codes in a safe place</p>
      <ul>
        {mfaSetup.backupCodes.map(backupCode => (
          <li key={backupCode}><code>{backupCode}</code></li>
        ))}
      </ul>
      <button onClick={() => downloadCodes(mfaSetup.backupCodes)}>
        Download Codes
      </button>
    </div>
  );
}
```

### Example 22: MFA Login Challenge

```tsx
function MFAChallenge({ onSuccess }) {
  const { verifyMFA } = useAuth();
  const [code, setCode] = useState('');
  const [useBackup, setUseBackup] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await verifyMFA(code, { isBackupCode: useBackup });
      onSuccess();
    } catch (error) {
      toast.error('Invalid code');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Two-Factor Authentication</h2>

      {useBackup ? (
        <input
          type="text"
          placeholder="Backup code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      ) : (
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="6-digit code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        />
      )}

      <button type="submit">Verify</button>

      <button type="button" onClick={() => setUseBackup(!useBackup)}>
        {useBackup ? 'Use authenticator app' : 'Use backup code'}
      </button>
    </form>
  );
}
```

---

## Advanced Patterns

### Example 23: Auth State Persistence

```tsx
import { useAuth } from '@/lib/auth';

function AuthStateDebug() {
  const auth = useAuth();

  // Persist auth state changes for debugging
  useEffect(() => {
    console.log('Auth state changed:', {
      isAuthenticated: auth.isAuthenticated,
      user: auth.user,
    });
  }, [auth.isAuthenticated, auth.user]);

  return null;
}
```

### Example 24: Impersonation

```tsx
import { useAuth } from '@/lib/auth';

function AdminImpersonation() {
  const { user, impersonate, stopImpersonating, isImpersonating } = useAuth();

  if (isImpersonating) {
    return (
      <div className="impersonation-banner">
        <p>Viewing as: {user.email}</p>
        <button onClick={stopImpersonating}>
          Return to Admin
        </button>
      </div>
    );
  }

  return (
    <div>
      <h3>Impersonate User</h3>
      <UserSelect
        onSelect={(userId) => impersonate(userId)}
      />
    </div>
  );
}
```

### Example 25: Auth Event Listeners

```tsx
import { useAuth } from '@/lib/auth';
import { useEffect } from 'react';

function AuthEventHandler() {
  const { onAuthStateChange } = useAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChange((event, session) => {
      switch (event) {
        case 'SIGNED_IN':
          analytics.identify(session.user.id);
          break;
        case 'SIGNED_OUT':
          analytics.reset();
          break;
        case 'TOKEN_REFRESHED':
          console.log('Token refreshed');
          break;
        case 'SESSION_EXPIRED':
          toast.warning('Session expired');
          break;
      }
    });

    return unsubscribe;
  }, []);

  return null;
}
```

---

## See Also

- [Authentication Guide](../AUTHENTICATION.md) - Complete auth documentation
- [RBAC Examples](./rbac-examples.md) - Role and permission examples
- [Documentation Index](../INDEX.md) - All documentation resources
- [Routing Examples](./routing-examples.md) - Protected route examples
