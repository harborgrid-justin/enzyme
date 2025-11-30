# CSRF Protection

Enterprise-grade Cross-Site Request Forgery (CSRF) protection with token generation, validation, and automatic request handling for @missionfabric-js/enzyme.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [CSRF Token Management](#csrf-token-management)
- [Form Protection](#form-protection)
- [API Request Protection](#api-request-protection)
- [Token Lifecycle](#token-lifecycle)
- [Integration Patterns](#integration-patterns)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

CSRF protection prevents unauthorized commands from being transmitted from a user that the web application trusts. The system provides automatic token generation, validation, and injection into requests.

### Key Features

- **Automatic Token Generation**: Cryptographically secure CSRF tokens
- **Token Validation**: Server-side and client-side validation
- **Form Integration**: Automatic hidden input injection
- **API Integration**: Automatic header injection in fetch requests
- **Token Rotation**: Periodic token refresh for enhanced security
- **One-Time Tokens**: Support for single-use tokens
- **Meta Tag Support**: CSRF tokens via meta tags
- **React Hooks**: Easy integration with React components

## Quick Start

### Enable CSRF Protection

```tsx
import { SecurityProvider } from '@missionfabric-js/enzyme/security';

function App() {
  return (
    <SecurityProvider
      config={{
        csrf: {
          enabled: true,
          headerName: 'X-CSRF-Token',
          cookieName: '_csrf',
          excludePaths: ['/api/public/*'],
        },
      }}
    >
      <YourApp />
    </SecurityProvider>
  );
}
```

### Protect Forms

```tsx
import { useCSRFToken } from '@/lib/security';

function ContactForm() {
  const { formInputProps } = useCSRFToken();

  return (
    <form method="POST" action="/api/contact">
      <input {...formInputProps} /> {/* Hidden CSRF token */}
      <input name="email" type="email" required />
      <textarea name="message" required />
      <button type="submit">Send</button>
    </form>
  );
}
```

### Protect API Calls

```tsx
import { useSecureFetch } from '@/lib/security';

function DataSubmit() {
  const secureFetch = useSecureFetch();

  const handleSubmit = async (data) => {
    // Automatically includes CSRF token in headers
    const response = await secureFetch('/api/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    return response.json();
  };

  return <button onClick={() => handleSubmit({ value: 123 })}>Submit</button>;
}
```

## CSRF Token Management

### Accessing CSRF Tokens

#### useCSRFToken Hook

```tsx
import { useCSRFToken } from '@/lib/security';

function Component() {
  const {
    token,              // Current CSRF token
    formInputProps,     // Props for hidden form input
    metaProps,          // Props for meta tag
    headerName,         // Header name for API requests
  } = useCSRFToken();

  return (
    <div>
      <p>CSRF Token: {token}</p>
      <form method="POST">
        <input {...formInputProps} />
        {/* Form fields */}
      </form>
    </div>
  );
}
```

#### useSecurityContext Hook

```tsx
import { useSecurityContext } from '@/lib/security';

function Component() {
  const { csrfToken, regenerateCsrfToken } = useSecurityContext();

  const handleRegenerate = () => {
    const newToken = regenerateCsrfToken();
    console.log('New CSRF token:', newToken);
  };

  return (
    <div>
      <p>Current token: {csrfToken}</p>
      <button onClick={handleRegenerate}>Regenerate Token</button>
    </div>
  );
}
```

### Generating Tokens

```typescript
import { CSRFProtection } from '@/lib/security';

// Create CSRF protection instance
const csrf = new CSRFProtection({
  secret: process.env.CSRF_SECRET,
  tokenLength: 32,
  algorithm: 'sha256',
});

// Generate token
const token = csrf.generateToken();

// Generate one-time token
const oneTimeToken = csrf.generateOneTimeToken();
```

### One-Time Tokens

```typescript
import { generateOneTimeToken } from '@/lib/security';

// Generate single-use token
const oneTimeToken = generateOneTimeToken({
  userId: user.id,
  action: 'delete-account',
  expiresIn: 300000, // 5 minutes
});

// Validate and consume token
const isValid = csrf.validateOneTimeToken(oneTimeToken);
// Token is now consumed and cannot be reused
```

## Form Protection

### Basic Form Protection

```tsx
import { useCSRFToken } from '@/lib/security';

function SimpleForm() {
  const { formInputProps } = useCSRFToken();

  return (
    <form method="POST" action="/api/submit">
      <input {...formInputProps} />
      <input name="data" type="text" />
      <button type="submit">Submit</button>
    </form>
  );
}
```

### React Hook Form Integration

```tsx
import { useForm } from 'react-hook-form';
import { useCSRFToken } from '@/lib/security';

function ProtectedForm() {
  const { token } = useCSRFToken();
  const { register, handleSubmit } = useForm();

  const onSubmit = async (data) => {
    const response = await fetch('/api/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': token,
      },
      body: JSON.stringify(data),
    });

    return response.json();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} type="email" />
      <input {...register('name')} type="text" />
      <button type="submit">Submit</button>
    </form>
  );
}
```

### Protected Form Submit Handler

```tsx
import { useSecureFormSubmit } from '@/lib/security';

function CommentForm() {
  const { handleSubmit, isSubmitting, error } = useSecureFormSubmit({
    url: '/api/comments',
    method: 'POST',
    onSuccess: (data) => {
      console.log('Comment posted:', data);
    },
    onError: (err) => {
      console.error('Failed to post comment:', err);
    },
  });

  return (
    <form onSubmit={handleSubmit}>
      <textarea name="comment" required />
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Posting...' : 'Post Comment'}
      </button>
      {error && <div className="error">{error.message}</div>}
    </form>
  );
}
```

### Meta Tag Approach

```tsx
import { useCSRFToken } from '@/lib/security';

function AppHead() {
  const { metaProps } = useCSRFToken();

  return (
    <head>
      <meta {...metaProps} />
      {/* Other meta tags */}
    </head>
  );
}

// Access token from meta tag in JavaScript
function getCSRFTokenFromMeta() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta?.getAttribute('content');
}
```

### Creating Form Input Props

```typescript
import { createCSRFInputProps } from '@/lib/security';

const inputProps = createCSRFInputProps(csrfToken);

// Result:
{
  type: 'hidden',
  name: '_csrf',
  value: 'token-value',
}
```

## API Request Protection

### Secure Fetch Hook

```tsx
import { useSecureFetch } from '@/lib/security';

function ApiClient() {
  const secureFetch = useSecureFetch();

  const createResource = async (data) => {
    // CSRF token automatically included
    const response = await secureFetch('/api/resources', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    return response.json();
  };

  const updateResource = async (id, data) => {
    const response = await secureFetch(`/api/resources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    return response.json();
  };

  const deleteResource = async (id) => {
    const response = await secureFetch(`/api/resources/${id}`, {
      method: 'DELETE',
    });

    return response.json();
  };

  return { createResource, updateResource, deleteResource };
}
```

### Creating Secure Request Init

```typescript
import { createSecureRequestInit } from '@/lib/security';

const csrfToken = 'your-csrf-token';

const requestInit = createSecureRequestInit(csrfToken, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ data: 'value' }),
});

// Result:
{
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': 'your-csrf-token',
  },
  body: '{"data":"value"}',
}
```

### Axios Integration

```typescript
import axios from 'axios';
import { useSecurityContext } from '@/lib/security';

function useSecureAxios() {
  const { csrfToken } = useSecurityContext();

  const axiosInstance = axios.create({
    baseURL: '/api',
    headers: {
      'X-CSRF-Token': csrfToken,
    },
  });

  // Add interceptor for token refresh
  axiosInstance.interceptors.request.use((config) => {
    config.headers['X-CSRF-Token'] = csrfToken;
    return config;
  });

  return axiosInstance;
}
```

## Token Lifecycle

### Token Rotation

```tsx
import { useEffect } from 'react';
import { useSecurityContext } from '@/lib/security';

function TokenRotation() {
  const { csrfToken, regenerateCsrfToken } = useSecurityContext();

  useEffect(() => {
    // Rotate token every 30 minutes
    const interval = setInterval(() => {
      const newToken = regenerateCsrfToken();
      console.log('CSRF token rotated:', newToken);
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [regenerateCsrfToken]);

  return <div>Token: {csrfToken}</div>;
}
```

### Token Validation

```typescript
import { validateRequest } from '@/lib/security';

// Server-side validation
app.post('/api/protected', (req, res) => {
  const token = req.headers['x-csrf-token'] || req.body._csrf;

  const isValid = validateRequest(token, req.session.csrfToken);

  if (!isValid) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  // Process request
  res.json({ success: true });
});
```

### Token Expiration

```typescript
interface CSRFToken {
  value: string;
  expiresAt: number;
  issuedAt: number;
}

const token: CSRFToken = {
  value: 'token-value',
  expiresAt: Date.now() + 3600000, // 1 hour
  issuedAt: Date.now(),
};

// Check expiration
function isTokenExpired(token: CSRFToken): boolean {
  return Date.now() > token.expiresAt;
}
```

## Integration Patterns

### Auth Integration

```tsx
import { useAuth } from '@/lib/auth';
import { useCSRFToken } from '@/lib/security';

function ProtectedAction() {
  const { isAuthenticated } = useAuth();
  const { token } = useCSRFToken();

  const performAction = async () => {
    if (!isAuthenticated) {
      throw new Error('Not authenticated');
    }

    const response = await fetch('/api/action', {
      method: 'POST',
      headers: {
        'X-CSRF-Token': token,
      },
    });

    return response.json();
  };

  return <button onClick={performAction}>Perform Action</button>;
}
```

### API Module Integration

```tsx
import { createApiClient } from '@/lib/api';
import { useSecurityContext } from '@/lib/security';

function useProtectedApi() {
  const { csrfToken } = useSecurityContext();

  const api = createApiClient({
    baseURL: '/api',
    headers: {
      'X-CSRF-Token': csrfToken,
    },
  });

  return api;
}
```

### Form Library Integration

```tsx
import { Formik, Form, Field } from 'formik';
import { useCSRFToken } from '@/lib/security';

function FormikForm() {
  const { formInputProps } = useCSRFToken();

  return (
    <Formik
      initialValues={{ email: '', message: '' }}
      onSubmit={async (values) => {
        // Submit with CSRF protection
      }}
    >
      <Form>
        <input {...formInputProps} />
        <Field name="email" type="email" />
        <Field name="message" as="textarea" />
        <button type="submit">Submit</button>
      </Form>
    </Formik>
  );
}
```

## Best Practices

### 1. Always Include CSRF Tokens in State-Changing Requests

```tsx
// Good: POST request with CSRF token
const response = await fetch('/api/delete', {
  method: 'POST',
  headers: { 'X-CSRF-Token': csrfToken },
});

// Bad: POST request without CSRF token
const response = await fetch('/api/delete', {
  method: 'POST',
});
```

### 2. Use Secure CSRF Token Generation

```typescript
// Good: Cryptographically secure random token
import { generateNonce } from '@/lib/security';
const token = generateNonce();

// Bad: Predictable token
const token = Math.random().toString(36);
```

### 3. Validate Tokens on Server

```typescript
// Good: Server-side validation
app.post('/api/action', (req, res) => {
  const token = req.headers['x-csrf-token'];

  if (!csrf.validate(token, req.session.csrfToken)) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  // Process request
});

// Bad: No server-side validation (client-side only)
```

### 4. Rotate Tokens Periodically

```tsx
useEffect(() => {
  // Rotate token every 30 minutes
  const interval = setInterval(regenerateCsrfToken, 30 * 60 * 1000);
  return () => clearInterval(interval);
}, []);
```

### 5. Exclude Public Endpoints

```tsx
<SecurityProvider
  config={{
    csrf: {
      enabled: true,
      excludePaths: [
        '/api/public/*',
        '/api/webhooks/*',
        '/health',
      ],
    },
  }}
/>
```

### 6. Use SameSite Cookies

```typescript
// Server-side cookie configuration
res.cookie('csrf_token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 3600000, // 1 hour
});
```

## Troubleshooting

### Issue: CSRF Token Missing

**Solution:** Ensure SecurityProvider wraps your app:

```tsx
<SecurityProvider config={{ csrf: { enabled: true } }}>
  <App />
</SecurityProvider>
```

### Issue: Token Validation Failing

**Solution:** Check token is being sent correctly:

```tsx
// Log token before request
const { token } = useCSRFToken();
console.log('Sending CSRF token:', token);

// Check server receives token
console.log('Received token:', req.headers['x-csrf-token']);
```

### Issue: Token Expired

**Solution:** Implement token refresh:

```tsx
const { csrfToken, regenerateCsrfToken } = useSecurityContext();

if (isTokenExpired(csrfToken)) {
  const newToken = regenerateCsrfToken();
  // Retry request with new token
}
```

### Issue: Double Submit Cookie Not Working

**Solution:** Ensure cookie and header match:

```typescript
// Server: Set cookie
res.cookie('_csrf', token, { httpOnly: false });

// Client: Read cookie and set header
const token = document.cookie
  .split('; ')
  .find(row => row.startsWith('_csrf='))
  ?.split('=')[1];

fetch('/api/action', {
  headers: { 'X-CSRF-Token': token },
});
```

## Related Documentation

### Security Module
- [Security Overview](./README.md) - Complete security infrastructure
- [XSS Prevention](./XSS.md) - Cross-site scripting protection
- [CSP Management](./CSP.md) - Content Security Policy with nonces
- [Secure Storage](./SECURE_STORAGE.md) - Encrypted token storage

### Authentication & API Integration
- [Authentication Module](../auth/README.md) - Authentication with CSRF protection
- [Auth Service](../auth/AUTH_SERVICE.md) - Token management and security
- [API Module](../api/README.md) - API client with automatic CSRF headers
- [Security Best Practices](../SECURITY.md) - CSRF protection guidelines

### External Resources
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) - Comprehensive CSRF guide
- [MDN Same-Origin Policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy)

---

**Version:** 3.0.0
**Last Updated:** 2025-11-29
