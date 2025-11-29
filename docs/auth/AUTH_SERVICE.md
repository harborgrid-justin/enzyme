# Core Authentication Service

The auth service provides low-level authentication functionality including user login/logout, token management, and session handling.

## Overview

The `authService` module provides a comprehensive authentication service that can be used standalone or integrated with the React auth provider. It handles:

- User authentication (login/logout)
- Token management (access & refresh tokens)
- Secure token storage with encryption
- Session persistence and restoration
- Password reset flows
- Email verification
- Multi-factor authentication (MFA)
- CSRF protection

## Import

```tsx
import { authService } from '@/lib/auth/authService';
```

## Authentication Methods

### login()

Authenticate a user with credentials and obtain tokens.

```tsx
async function login(
  credentials: LoginCredentials,
  options?: LoginOptions
): Promise<LoginResult>
```

#### Parameters

- `credentials`: Login credentials
  - `email: string` - User's email address
  - `password: string` - User's password
  - `mfaCode?: string` - Multi-factor authentication code (if MFA is enabled)
- `options`: Optional login options
  - `remember?: boolean` - Remember user session (default: false)
  - `deviceId?: string` - Device identifier for multi-device management
  - `redirectTo?: string` - Post-login redirect URL

#### Returns

`Promise<LoginResult>` containing:
- `user: User` - Authenticated user object
- `tokens: AuthTokens` - Access and refresh tokens
- `requiresMfa: boolean` - Whether MFA is required
- `mfaToken?: string` - Temporary token for MFA flow

#### Example

```tsx
import { authService } from '@/lib/auth/authService';

try {
  const result = await authService.login({
    email: 'user@example.com',
    password: 'securePassword123',
  });

  if (result.requiresMfa) {
    // Prompt for MFA code
    const mfaCode = await promptForMFACode();
    const finalResult = await authService.login({
      email: 'user@example.com',
      password: 'securePassword123',
      mfaCode,
    });
    console.log('Logged in:', finalResult.user);
  } else {
    console.log('Logged in:', result.user);
  }
} catch (error) {
  console.error('Login failed:', error.message);
}
```

#### Error Handling

```tsx
try {
  await authService.login(credentials);
} catch (error) {
  if (error.code === 'invalid_credentials') {
    // Handle invalid email/password
  } else if (error.code === 'mfa_required') {
    // Handle MFA requirement
  } else if (error.code === 'account_locked') {
    // Handle locked account
  }
}
```

### logout()

End the current user session and clear stored tokens.

```tsx
async function logout(options?: LogoutOptions): Promise<void>
```

#### Parameters

- `options`: Optional logout options
  - `everywhere?: boolean` - Logout from all devices (default: false)
  - `redirectTo?: string` - Post-logout redirect URL

#### Example

```tsx
// Logout from current device
await authService.logout();

// Logout from all devices
await authService.logout({ everywhere: true });

// Logout with redirect
await authService.logout({ redirectTo: '/goodbye' });
```

### getCurrentUser()

Get the currently authenticated user.

```tsx
async function getCurrentUser(): Promise<User | null>
```

#### Returns

`Promise<User | null>` - The current user or null if not authenticated

#### Example

```tsx
const user = await authService.getCurrentUser();

if (user) {
  console.log('Current user:', user.email);
} else {
  console.log('Not authenticated');
}
```

### refreshSession()

Refresh the current session using the refresh token.

```tsx
async function refreshSession(): Promise<AuthTokens>
```

#### Returns

`Promise<AuthTokens>` - New access and refresh tokens

#### Example

```tsx
try {
  const newTokens = await authService.refreshSession();
  console.log('Session refreshed');
} catch (error) {
  console.error('Session refresh failed, please login again');
}
```

## Token Management

### getAccessToken()

Get the current access token.

```tsx
function getAccessToken(): string | null
```

#### Returns

`string | null` - The access token or null if not authenticated

#### Example

```tsx
const token = authService.getAccessToken();

if (token) {
  // Use token for API calls
  fetch('/api/protected', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
}
```

### getRefreshToken()

Get the current refresh token.

```tsx
function getRefreshToken(): string | null
```

#### Returns

`string | null` - The refresh token or null if not available

### isTokenExpired()

Check if the current access token is expired or about to expire.

```tsx
function isTokenExpired(bufferMs?: number): boolean
```

#### Parameters

- `bufferMs`: Buffer time in milliseconds (default: 300000 / 5 minutes)

#### Returns

`boolean` - True if token is expired or will expire within the buffer time

#### Example

```tsx
if (authService.isTokenExpired()) {
  // Token is expired, refresh it
  await authService.refreshSession();
}
```

### setTokens()

Manually set authentication tokens (advanced use only).

```tsx
function setTokens(tokens: AuthTokens): void
```

#### Parameters

- `tokens`: Token object
  - `accessToken: string` - JWT access token
  - `refreshToken: string` - JWT refresh token
  - `expiresAt: number` - Expiration timestamp (Unix milliseconds)

#### Security Note

Only use this method when integrating with external authentication systems. Normal applications should use the `login()` method.

## Session Management

### saveSession()

Save the current session to secure storage.

```tsx
async function saveSession(user: User, tokens: AuthTokens): Promise<void>
```

#### Parameters

- `user`: User object to save
- `tokens`: Authentication tokens

### loadSession()

Load a saved session from secure storage.

```tsx
async function loadSession(): Promise<SessionData | null>
```

#### Returns

`Promise<SessionData | null>` - Saved session data or null if no session exists

#### Example

```tsx
// On app initialization
const session = await authService.loadSession();

if (session && !authService.isTokenExpired()) {
  console.log('Restored session for:', session.user.email);
} else {
  console.log('No valid session found');
}
```

### clearSession()

Clear the current session from storage.

```tsx
function clearSession(): void
```

## Password Management

### requestPasswordReset()

Request a password reset email.

```tsx
async function requestPasswordReset(email: string): Promise<void>
```

#### Parameters

- `email`: Email address to send reset link to

#### Example

```tsx
try {
  await authService.requestPasswordReset('user@example.com');
  console.log('Password reset email sent');
} catch (error) {
  console.error('Failed to send reset email:', error);
}
```

### resetPassword()

Reset password using a reset token.

```tsx
async function resetPassword(
  token: string,
  newPassword: string
): Promise<void>
```

#### Parameters

- `token`: Password reset token from email
- `newPassword`: New password to set

#### Example

```tsx
try {
  await authService.resetPassword(resetToken, newPassword);
  console.log('Password reset successful');
} catch (error) {
  console.error('Password reset failed:', error);
}
```

### changePassword()

Change password for the current authenticated user.

```tsx
async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void>
```

#### Parameters

- `currentPassword`: Current password for verification
- `newPassword`: New password to set

#### Example

```tsx
try {
  await authService.changePassword(currentPassword, newPassword);
  console.log('Password changed successfully');
} catch (error) {
  if (error.code === 'invalid_password') {
    console.error('Current password is incorrect');
  }
}
```

## Email Verification

### sendVerificationEmail()

Send a verification email to the user.

```tsx
async function sendVerificationEmail(): Promise<void>
```

#### Example

```tsx
await authService.sendVerificationEmail();
console.log('Verification email sent');
```

### verifyEmail()

Verify user's email address using a verification token.

```tsx
async function verifyEmail(token: string): Promise<void>
```

#### Parameters

- `token`: Email verification token from email

#### Example

```tsx
try {
  await authService.verifyEmail(verificationToken);
  console.log('Email verified successfully');
} catch (error) {
  console.error('Email verification failed:', error);
}
```

## Multi-Factor Authentication

### setupMFA()

Set up multi-factor authentication for the current user.

```tsx
async function setupMFA(): Promise<MFASetupResult>
```

#### Returns

`Promise<MFASetupResult>` containing:
- `secret: string` - MFA secret key
- `qrCode: string` - QR code data URL for authenticator apps
- `backupCodes: string[]` - Backup recovery codes

#### Example

```tsx
const mfa = await authService.setupMFA();

// Display QR code to user
console.log('Scan this QR code:', mfa.qrCode);

// Save backup codes securely
console.log('Backup codes:', mfa.backupCodes);
```

### verifyMFA()

Verify an MFA code to complete MFA setup.

```tsx
async function verifyMFA(code: string): Promise<void>
```

#### Parameters

- `code`: 6-digit MFA code from authenticator app

#### Example

```tsx
try {
  await authService.verifyMFA(code);
  console.log('MFA enabled successfully');
} catch (error) {
  console.error('Invalid MFA code');
}
```

### disableMFA()

Disable multi-factor authentication.

```tsx
async function disableMFA(password: string): Promise<void>
```

#### Parameters

- `password`: Current password for verification

#### Example

```tsx
try {
  await authService.disableMFA(currentPassword);
  console.log('MFA disabled');
} catch (error) {
  console.error('Failed to disable MFA:', error);
}
```

## Utility Functions

### isAuthenticated()

Check if a user is currently authenticated.

```tsx
function isAuthenticated(): boolean
```

#### Returns

`boolean` - True if authenticated

#### Example

```tsx
if (authService.isAuthenticated()) {
  // User is logged in
  console.log('User is authenticated');
} else {
  // Redirect to login
  router.push('/login');
}
```

### validateToken()

Validate a JWT token.

```tsx
function validateToken(token: string): boolean
```

#### Parameters

- `token`: JWT token to validate

#### Returns

`boolean` - True if token is valid

#### Example

```tsx
const isValid = authService.validateToken(accessToken);

if (!isValid) {
  console.log('Token is invalid or expired');
}
```

## Configuration

### Initialize Service

```tsx
import { initAuthService } from '@/lib/auth/authService';

initAuthService({
  apiEndpoint: '/api/auth',
  tokenExpiry: 3600, // 1 hour
  refreshTokenExpiry: 604800, // 7 days
  autoRefresh: true,
  refreshBuffer: 300000, // 5 minutes
  storage: 'sessionStorage', // 'localStorage', 'sessionStorage', or 'memory'
  csrf: {
    enabled: true,
    headerName: 'X-CSRF-Token',
  },
});
```

## Security Considerations

### Token Storage

Tokens are automatically encrypted before storage using AES-GCM encryption:

```tsx
// Tokens are automatically encrypted
await authService.login(credentials);
// Tokens are stored encrypted in sessionStorage

// Tokens are automatically decrypted when retrieved
const token = authService.getAccessToken();
```

### CSRF Protection

CSRF tokens are automatically handled:

```tsx
// CSRF token is automatically included in requests
await authService.login(credentials);

// Manual CSRF token access (if needed)
const csrfToken = authService.getCSRFToken();
```

### Secure Cookies

When using cookie-based sessions:

```tsx
const authConfig = {
  secureCookies: true, // HTTPS only
  sameSite: 'strict', // CSRF protection
  httpOnly: true, // Prevent XSS
};
```

## Error Handling

All auth service methods throw typed errors:

```tsx
try {
  await authService.login(credentials);
} catch (error) {
  switch (error.code) {
    case 'invalid_credentials':
      // Handle wrong email/password
      break;
    case 'account_locked':
      // Handle locked account
      break;
    case 'mfa_required':
      // Handle MFA requirement
      break;
    case 'network_error':
      // Handle network issues
      break;
    default:
      // Handle other errors
      break;
  }
}
```

## Integration with React

### With AuthProvider

```tsx
import { AuthProvider } from '@/lib/auth';

// The AuthProvider uses authService internally
function App() {
  return (
    <AuthProvider>
      <YourApp />
    </AuthProvider>
  );
}
```

### Standalone Usage

```tsx
import { authService } from '@/lib/auth/authService';

// Use directly without React
async function handleLogin(email, password) {
  try {
    const { user, tokens } = await authService.login({ email, password });
    console.log('Logged in as:', user.email);
  } catch (error) {
    console.error('Login failed:', error);
  }
}
```

## API Reference

### Types

```tsx
interface LoginCredentials {
  email: string;
  password: string;
  mfaCode?: string;
}

interface LoginOptions {
  remember?: boolean;
  deviceId?: string;
  redirectTo?: string;
}

interface LoginResult {
  user: User;
  tokens: AuthTokens;
  requiresMfa: boolean;
  mfaToken?: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface LogoutOptions {
  everywhere?: boolean;
  redirectTo?: string;
}

interface MFASetupResult {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

interface SessionData {
  user: User;
  tokens: AuthTokens;
  expiresAt: number;
}
```

## Best Practices

1. **Always check authentication state**:
   ```tsx
   if (!authService.isAuthenticated()) {
     router.push('/login');
   }
   ```

2. **Handle token expiration**:
   ```tsx
   if (authService.isTokenExpired()) {
     await authService.refreshSession();
   }
   ```

3. **Use error handling**:
   ```tsx
   try {
     await authService.login(credentials);
   } catch (error) {
     showErrorMessage(error.message);
   }
   ```

4. **Secure password resets**:
   ```tsx
   // Always validate reset tokens server-side
   await authService.resetPassword(token, newPassword);
   ```

5. **Enable MFA for sensitive accounts**:
   ```tsx
   if (user.role === 'admin') {
     const mfa = await authService.setupMFA();
     // Prompt user to complete MFA setup
   }
   ```

## See Also

- [AUTH_PROVIDER.md](./AUTH_PROVIDER.md) - React auth provider
- [HOOKS.md](./HOOKS.md) - Authentication hooks
- [TYPES.md](./TYPES.md) - Type definitions
- [GUARDS.md](./GUARDS.md) - Route protection
