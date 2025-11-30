# Security Guide

> **Scope**: This document covers security best practices for the Harbor React Template.
> It includes authentication, authorization, input validation, and protection against common vulnerabilities.

---

## Table of Contents

1. [Security Overview](#security-overview)
2. [Authentication](#authentication)
3. [Authorization](#authorization)
4. [Input Validation](#input-validation)
5. [XSS Prevention](#xss-prevention)
6. [CSRF Protection](#csrf-protection)
7. [Secure Storage](#secure-storage)
8. [Content Security Policy](#content-security-policy)
9. [API Security](#api-security)
10. [Security Checklist](#security-checklist)

---

## Security Overview

### Defense in Depth

Harbor React implements multiple security layers:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      SECURITY LAYERS                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Layer 1: NETWORK                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  HTTPS | CSP Headers | CORS | Rate Limiting                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  Layer 2: AUTHENTICATION                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  JWT Tokens | Secure Storage | Session Management                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  Layer 3: AUTHORIZATION                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  RBAC | Permission Guards | Route Protection                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  Layer 4: INPUT VALIDATION                                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Zod Schemas | Sanitization | Type Safety                        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  Layer 5: OUTPUT ENCODING                                                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  React Auto-escaping | DOMPurify | CSP                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Authentication

> **See Also:** [Authentication Module Documentation](./auth/README.md) - Complete authentication system with AD integration, RBAC, SSO, and MFA.

The Harbor React Template includes a comprehensive authentication system. For detailed documentation, see:
- [Authentication Overview](./auth/OVERVIEW.md) - Architecture and features
- [Auth Service](./auth/AUTH_SERVICE.md) - Core authentication API
- [Common Patterns](./auth/PATTERNS.md) - Real-world examples
- [Troubleshooting](./auth/TROUBLESHOOTING.md) - Common issues

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      AUTHENTICATION FLOW                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. LOGIN                                                                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  User credentials → API → JWT tokens → Secure storage           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  2. AUTHENTICATED REQUESTS                                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Request → Attach token → API validates → Response              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  3. TOKEN REFRESH                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Token expiring → Refresh token → New access token              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  4. LOGOUT                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Clear tokens → Invalidate session → Redirect to login          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Using Authentication

```tsx
import { useAuth, AuthProvider } from '@/lib/auth';

// Wrap app with AuthProvider
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

// Use auth in components
function LoginForm() {
  const { login, isLoading, error } = useAuth();

  const handleSubmit = async (credentials) => {
    try {
      await login(credentials);
      // Redirects to dashboard on success
    } catch (err) {
      // Error handled by auth context
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <ErrorMessage error={error} />}
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

For more authentication patterns, see [Authentication Patterns](./auth/PATTERNS.md).

### Protected Routes

```tsx
import { RequireAuth } from '@/lib/auth';

// Protect entire route
function ProtectedRoute() {
  return (
    <RequireAuth fallback={<Navigate to="/login" />}>
      <Dashboard />
    </RequireAuth>
  );
}

// In router
const router = createBrowserRouter([
  {
    path: '/dashboard',
    element: (
      <RequireAuth>
        <DashboardPage />
      </RequireAuth>
    ),
  },
]);
```

For advanced route protection, see [Route Guards Documentation](./auth/GUARDS.md).

### Session Management

```typescript
import { authService } from '@/lib/auth';

// Configure session
const sessionConfig = {
  // Token refresh before expiry
  refreshBeforeExpiry: 5 * 60 * 1000, // 5 minutes

  // Session timeout
  sessionTimeout: 30 * 60 * 1000, // 30 minutes

  // Inactivity timeout
  inactivityTimeout: 15 * 60 * 1000, // 15 minutes

  // Multi-tab sync
  syncAcrossTabs: true,
};

// Monitor session
authService.onSessionExpiring(() => {
  showSessionExpiringWarning();
});

authService.onSessionExpired(() => {
  redirectToLogin();
});
```

For session troubleshooting, see [Session Issues](./auth/TROUBLESHOOTING.md#session-issues).

---

## Authorization

> **See Also:** [RBAC Documentation](./auth/RBAC.md) - Complete Role-Based Access Control system with hierarchies, permission matrices, and policies.

The auth module provides a comprehensive RBAC system. For detailed documentation, see:
- [RBAC Overview](./auth/RBAC.md) - Role hierarchy and permission matrix
- [RBAC Patterns](./auth/PATTERNS.md#pattern-3-role-based-access-control) - Implementation examples
- [RBAC Troubleshooting](./auth/TROUBLESHOOTING.md#rbac-issues) - Common issues

### Role-Based Access Control

```typescript
import { authConfig, hasPermission, hasMinimumRole } from '@/config';

// Define roles and permissions
export const roles = ['viewer', 'user', 'manager', 'admin'] as const;
type Role = typeof roles[number];

export const permissions = [
  'users:view',
  'users:create',
  'users:update',
  'users:delete',
  'reports:view',
  'reports:export',
  'admin:access',
] as const;
type Permission = typeof permissions[number];

// Role permission mapping
export const rolePermissions: Record<Role, Permission[]> = {
  viewer: ['users:view', 'reports:view'],
  user: ['users:view', 'users:create', 'reports:view'],
  manager: ['users:view', 'users:create', 'users:update', 'reports:view', 'reports:export'],
  admin: [...permissions],
};

// Role hierarchy
export const roleHierarchy: Record<Role, number> = {
  viewer: 1,
  user: 2,
  manager: 3,
  admin: 4,
};
```

For advanced RBAC features including permission matrices and policy-based authorization, see [RBAC Documentation](./auth/RBAC.md).

### Authorization Guards

```tsx
import { RequireRole, RequirePermission } from '@/lib/auth';

// Role-based guard
function AdminPanel() {
  return (
    <RequireRole roles={['admin']} fallback={<AccessDenied />}>
      <AdminContent />
    </RequireRole>
  );
}

// Permission-based guard
function CreateUserButton() {
  return (
    <RequirePermission
      permissions={['users:create']}
      fallback={null}
    >
      <button>Create User</button>
    </RequirePermission>
  );
}

// Combined guards
function SensitiveFeature() {
  return (
    <RequireAuth>
      <RequireRole roles={['manager', 'admin']}>
        <RequirePermission permissions={['reports:export']}>
          <ExportReports />
        </RequirePermission>
      </RequireRole>
    </RequireAuth>
  );
}
```

For more guard patterns, see [Route Guards Documentation](./auth/GUARDS.md).

### Programmatic Checks

```typescript
import { useAuth } from '@/lib/auth';
import { hasPermission, hasMinimumRole } from '@/config';

function UserActions({ user }) {
  const { currentUser } = useAuth();

  const canEdit = hasPermission(currentUser, 'users:update');
  const canDelete = hasPermission(currentUser, 'users:delete');
  const isManager = hasMinimumRole(currentUser, 'manager');

  return (
    <div>
      {canEdit && <button>Edit</button>}
      {canDelete && <button>Delete</button>}
      {isManager && <button>Assign Role</button>}
    </div>
  );
}
```

For more authorization patterns, see [RBAC Patterns](./auth/PATTERNS.md#pattern-3-role-based-access-control).

---

## Input Validation

### Schema Validation with Zod

```typescript
import { z } from 'zod';

// Define schemas
const userSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[0-9]/, 'Password must contain number'),
  name: z.string().min(2).max(100),
  role: z.enum(['viewer', 'user', 'manager', 'admin']),
});

type User = z.infer<typeof userSchema>;

// Validate input
function validateUser(data: unknown): User {
  return userSchema.parse(data);
}

// Safe validation (returns result instead of throwing)
function safeValidateUser(data: unknown) {
  return userSchema.safeParse(data);
}
```

### Form Validation

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const registrationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

function RegistrationForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(registrationSchema),
  });

  const onSubmit = (data) => {
    // Data is validated and typed
    registerUser(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}

      <input {...register('password')} type="password" />
      {errors.password && <span>{errors.password.message}</span>}

      <input {...register('confirmPassword')} type="password" />
      {errors.confirmPassword && <span>{errors.confirmPassword.message}</span>}

      <button type="submit">Register</button>
    </form>
  );
}
```

### API Response Validation

```typescript
const apiResponseSchema = z.object({
  data: z.array(userSchema),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
  }),
});

async function fetchUsers() {
  const response = await api.get('/users');

  // Validate API response
  const validated = apiResponseSchema.parse(response.data);

  return validated;
}
```

---

## XSS Prevention

### React's Built-in Protection

React automatically escapes values in JSX:

```tsx
// Safe: React escapes this
function UserName({ name }) {
  return <div>{name}</div>; // "<script>" becomes "&lt;script&gt;"
}

// Dangerous: Only use with trusted content
function RichContent({ html }) {
  // ONLY use for trusted content (e.g., from CMS with sanitization)
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
```

### Sanitizing HTML

```typescript
import DOMPurify from 'dompurify';

// Sanitize user-provided HTML
function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}

// Use in component
function UserContent({ html }) {
  const sanitized = sanitizeHTML(html);
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

### URL Validation

```typescript
// Validate URLs before using
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// Safe link component
function SafeLink({ href, children }) {
  if (!isValidUrl(href)) {
    return <span>{children}</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
}
```

---

## CSRF Protection

### Token-Based CSRF Protection

```typescript
// Include CSRF token in requests
const api = axios.create({
  baseURL: env.apiBaseUrl,
  withCredentials: true, // Include cookies
  headers: {
    'X-CSRF-Token': getCsrfToken(),
  },
});

// Refresh token on each request
api.interceptors.request.use((config) => {
  config.headers['X-CSRF-Token'] = getCsrfToken();
  return config;
});
```

### SameSite Cookies

```typescript
// Configure cookie settings (server-side)
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict', // or 'lax'
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};
```

---

## Secure Storage

> **See Also:** [Token Management](./auth/AUTH_SERVICE.md#token-management) - Secure token storage and encryption in the auth module.

### Token Storage Best Practices

The auth module provides built-in encrypted token storage. For configuration details, see [Auth Service Documentation](./auth/AUTH_SERVICE.md#security-considerations).

```typescript
import { STORAGE_KEYS, setStorageItem, getStorageItem } from '@/config';

// DO: Store in memory for sensitive tokens
class TokenManager {
  private accessToken: string | null = null;

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  getAccessToken() {
    return this.accessToken;
  }

  clearTokens() {
    this.accessToken = null;
  }
}

// AVOID: localStorage for sensitive tokens (XSS vulnerable)
// Only use for non-sensitive preferences
setStorageItem(STORAGE_KEYS.THEME, 'dark'); // OK
setStorageItem(STORAGE_KEYS.AUTH_TOKEN, token); // RISKY

// PREFERRED: Use auth service with encrypted storage
import { AuthProvider } from '@/lib/auth';

<AuthProvider config={{
  tokenStorage: 'sessionStorage', // Automatically encrypted
  encryptTokens: true,
}}>
  <App />
</AuthProvider>
```

### Secure Local Storage Wrapper

The auth module includes built-in AES-GCM encryption for token storage. For manual encryption needs:

```typescript
// Encrypted storage for sensitive data
import CryptoJS from 'crypto-js';

const encryptionKey = getEncryptionKey(); // Derived from user session

function setSecureItem(key: string, value: string) {
  const encrypted = CryptoJS.AES.encrypt(value, encryptionKey).toString();
  localStorage.setItem(key, encrypted);
}

function getSecureItem(key: string): string | null {
  const encrypted = localStorage.getItem(key);
  if (!encrypted) return null;

  try {
    const decrypted = CryptoJS.AES.decrypt(encrypted, encryptionKey);
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch {
    return null;
  }
}
```

For token storage troubleshooting, see [Token Issues](./auth/TROUBLESHOOTING.md#token-issues).

---

## Content Security Policy

### CSP Configuration

```html
<!-- In index.html or server headers -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'nonce-{NONCE}';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self';
  connect-src 'self' https://api.example.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
">
```

### Using CSP Nonces

```tsx
import { useCSPNonce } from '@/lib/security';

function InlineScript({ code }) {
  const nonce = useCSPNonce();

  return (
    <script nonce={nonce}>
      {code}
    </script>
  );
}
```

---

## API Security

### Request Interceptors

```typescript
import { http } from '@/lib/services';

// Add authentication
http.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
http.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Try to refresh token
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Retry original request
        return http.request(error.config);
      }
      // Redirect to login
      redirectToLogin();
    }
    return Promise.reject(error);
  }
);
```

### Rate Limiting

```typescript
import { RateLimiter } from '@/lib/utils';

const apiRateLimiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
});

async function makeRequest(url: string) {
  if (!apiRateLimiter.canMakeRequest()) {
    throw new Error('Rate limit exceeded');
  }

  return api.get(url);
}
```

### Sensitive Data Handling

```typescript
// Redact sensitive data in logs
function sanitizeForLogging(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sensitiveKeys = ['password', 'token', 'secret', 'apiKey'];
  const result = { ...data };

  for (const key of Object.keys(result)) {
    if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
      result[key] = '[REDACTED]';
    }
  }

  return result;
}
```

---

## Security Checklist

### Authentication

- [ ] Secure token storage (memory or httpOnly cookies)
- [ ] Token refresh mechanism
- [ ] Session timeout
- [ ] Secure logout (clear all tokens)
- [ ] Password strength requirements
- [ ] MFA support (if required)

### Authorization

- [ ] Role-based access control
- [ ] Permission-based guards
- [ ] Protected routes
- [ ] API endpoint authorization

### Input Validation

- [ ] Schema validation (Zod)
- [ ] Form validation
- [ ] API response validation
- [ ] File upload validation

### XSS Prevention

- [ ] React auto-escaping used
- [ ] dangerouslySetInnerHTML sanitized
- [ ] URL validation
- [ ] CSP headers configured

### CSRF Protection

- [ ] CSRF tokens implemented
- [ ] SameSite cookies
- [ ] Origin validation

### Storage

- [ ] Sensitive data not in localStorage
- [ ] Encrypted storage for semi-sensitive data
- [ ] Secure cookie flags

### API Security

- [ ] HTTPS only
- [ ] Authorization headers
- [ ] Rate limiting
- [ ] Error messages don't leak info

### Headers

- [ ] Content-Security-Policy
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY
- [ ] Strict-Transport-Security

---

## Related Documentation

### Authentication & Authorization
- [Authentication Module](./auth/README.md) - Complete authentication system
- [Auth Overview](./auth/OVERVIEW.md) - Architecture and features
- [Auth Service](./auth/AUTH_SERVICE.md) - Token management and secure storage
- [Auth Patterns](./auth/PATTERNS.md) - Implementation examples
- [RBAC System](./auth/RBAC.md) - Role-based access control
- [Active Directory](./auth/ACTIVE_DIRECTORY.md) - AD/Azure AD integration
- [Auth Troubleshooting](./auth/TROUBLESHOOTING.md) - Common issues and solutions

### Security Module
- [Security Infrastructure](./security/README.md) - XSS, CSRF, CSP, and secure storage
- [CSRF Protection](./security/CSRF.md) - Cross-site request forgery prevention
- [XSS Prevention](./security/XSS.md) - Cross-site scripting protection
- [CSP Management](./security/CSP.md) - Content Security Policy
- [Secure Storage](./security/SECURE_STORAGE.md) - Encrypted client-side storage

### Integration
- [Auth-Security-State Integration](./integration/AUTH_SECURITY_STATE.md) - Integrated system usage
- [API Module](./api/README.md) - API client with security features
- [Routing Module](./routing/README.md) - Protected routes

### General Documentation
- [Getting Started](./GETTING_STARTED.md) - Quick start guide
- [Architecture Overview](./ARCHITECTURE.md) - System architecture
- [Configuration Guide](./config/README.md) - Application configuration

---

<p align="center">
  <strong>Security Best Practices</strong><br>
  Defense in depth for enterprise applications
</p>
