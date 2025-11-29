# Security Module

Enterprise-grade security infrastructure with XSS prevention, CSRF protection, CSP management, and encrypted storage for @missionfabric-js/enzyme.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Core Features](#core-features)
  - [Content Security Policy (CSP)](#content-security-policy-csp)
  - [CSRF Protection](#csrf-protection)
  - [XSS Prevention](#xss-prevention)
  - [Secure Storage](#secure-storage)
- [SecurityProvider](#securityprovider)
- [Security Hooks](#security-hooks)
- [Security Configuration](#security-configuration)
- [Integration](#integration)
- [Best Practices](#best-practices)
- [Common Vulnerabilities](#common-vulnerabilities)
- [Security Checklist](#security-checklist)
- [Detailed Documentation](#detailed-documentation)
- [See Also](#see-also)

## Overview

The Security module provides comprehensive defense-in-depth security features for React applications. It protects against common web vulnerabilities including Cross-Site Scripting (XSS), Cross-Site Request Forgery (CSRF), and injection attacks through automatic sanitization, token management, and Content Security Policy enforcement.

This module goes beyond basic security by providing context-aware encoding for different HTML contexts, encrypted local storage with automatic key rotation, CSP nonce generation for inline scripts, violation reporting, and React hooks that make security features easy to use without sacrificing developer experience.

Perfect for applications handling sensitive data or requiring compliance with security standards (SOC2, PCI-DSS, HIPAA), this module provides battle-tested security utilities with minimal performance overhead and maximum protection.

### Key Features

- **Content Security Policy (CSP)**: Nonce-based CSP management with violation reporting
- **CSRF Protection**: Automatic token generation, rotation, and validation
- **XSS Prevention**: Context-aware content sanitization and encoding
- **Secure Storage**: AES-GCM encrypted localStorage/sessionStorage with TTL
- **Violation Tracking**: Real-time security violation monitoring and reporting
- **URL Validation**: Safe URL and email validation
- **Safe HTML Rendering**: React-friendly safe innerHTML handling
- **React Integration**: Comprehensive hooks and context providers

## Quick Start

```tsx
import {
  SecurityProvider,
  useCSRFToken,
  useSanitizedContent,
  useSecureStorage,
} from '@/lib/security';

// 1. Wrap app with SecurityProvider
function App() {
  return (
    <SecurityProvider
      config={{
        csp: { enabled: true, enableNonce: true },
        csrf: { enabled: true },
        storage: { enableEncryption: true },
      }}
    >
      <YourApp />
    </SecurityProvider>
  );
}

// 2. Use CSRF protection in forms
function ContactForm() {
  const { formInputProps } = useCSRFToken();

  return (
    <form method="POST" action="/api/contact">
      <input {...formInputProps} /> {/* Hidden CSRF token */}
      <input name="email" type="email" />
      <button type="submit">Send</button>
    </form>
  );
}

// 3. Sanitize user content
function UserPost({ post }) {
  const safeContent = useSanitizedContent(post.content);
  return <div dangerouslySetInnerHTML={{ __html: safeContent }} />;
}

// 4. Use encrypted storage
function Settings() {
  const [apiKey, setApiKey] = useSecureStorage('api_key', '');
  return <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} type="password" />;
}
```

## Core Features

### Content Security Policy (CSP)

Protect against XSS attacks and code injection with nonce-based CSP:

- Cryptographically secure nonce generation
- Automatic nonce injection for inline scripts/styles
- CSP violation tracking and reporting
- Policy merging and validation
- React hooks for nonce management

**Learn more:** [CSP.md](./CSP.md)

### CSRF Protection

Prevent unauthorized state-changing requests:

- Automatic CSRF token generation and rotation
- Token validation for all POST/PUT/DELETE requests
- Form and API integration
- One-time token support
- Meta tag and hidden input injection

**Learn more:** [CSRF.md](./CSRF.md)

### XSS Prevention

Comprehensive cross-site scripting protection:

- Context-aware HTML sanitization
- Multi-context encoding (HTML, JavaScript, CSS, URL)
- Dangerous content detection
- URL and email validation
- Safe innerHTML rendering with React hooks

**Learn more:** [XSS.md](./XSS.md)

### Secure Storage

Encrypted client-side storage with automatic key rotation:

- AES-GCM encryption using Web Crypto API
- Automatic key generation and rotation
- TTL-based expiration
- Multiple backends (localStorage, sessionStorage)
- Secure data wiping

**Learn more:** [SECURE_STORAGE.md](./SECURE_STORAGE.md)

## SecurityProvider

Root security provider for the application.

```tsx
import { SecurityProvider } from '@missionfabric-js/enzyme/security';

function App() {
  return (
    <SecurityProvider
      config={{
        reportToServer: true,
        reportEndpoint: '/api/security/violations',
        enableLogging: true,
        csp: {
          reportViolations: true,
          enableNonce: true
        },
        csrf: {
          enabled: true,
          headerName: 'X-CSRF-Token'
        },
        storage: {
          enableEncryption: true,
          encryptionKey: generateKey()
        }
      }}
      encryptionKey={process.env.STORAGE_ENCRYPTION_KEY}
      onInitialized={() => console.log('Security initialized')}
      onSecurityEvent={(event) => console.log('Security event:', event)}
      onViolation={(violation) => reportToMonitoring(violation)}
    >
      <YourApp />
    </SecurityProvider>
  );
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `config` | `SecurityConfiguration` | See below | Security configuration |
| `encryptionKey` | `string` | Auto-generated | Encryption key for storage |
| `onInitialized` | `() => void` | - | Called when initialized |
| `onSecurityEvent` | `(event: SecurityEvent) => void` | - | Security event callback |
| `onViolation` | `(violation: SecurityViolation) => void` | - | Violation callback |
| `skipInitialization` | `boolean` | `false` | Skip init (testing) |
| `children` | `ReactNode` | - | Child components |

### SecurityConfiguration

```typescript
interface SecurityConfiguration {
  // CSP configuration
  csp: {
    enabled?: boolean;
    reportViolations?: boolean;
    enableNonce?: boolean;
  };

  // CSRF configuration
  csrf: {
    enabled?: boolean;
    headerName?: string;
    cookieName?: string;
  };

  // Secure storage configuration
  storage: {
    enableEncryption?: boolean;
    storageBackend?: 'localStorage' | 'sessionStorage' | 'indexedDB';
  };

  // Violation reporting
  reportToServer?: boolean;
  reportEndpoint?: string;
  maxViolationHistory?: number;

  // Logging
  enableLogging?: boolean;
}
```

## CSP Management

### CSP Nonce

Automatically inject CSP nonces for inline scripts and styles.

```tsx
import { useSecurityContext } from '@missionfabric-js/enzyme/security';

function Component() {
  const { cspNonce } = useSecurityContext();

  return (
    <>
      {/* Inline script with nonce */}
      <script nonce={cspNonce}>
        {`console.log('Safe inline script');`}
      </script>

      {/* Inline style with nonce */}
      <style nonce={cspNonce}>
        {`.class { color: red; }`}
      </style>
    </>
  );
}
```

### CSP Violation Tracking

```tsx
import { useSecurityContext } from '@missionfabric-js/enzyme/security';

function SecurityMonitor() {
  const { violations, clearViolations } = useSecurityContext();

  return (
    <div>
      <h2>Security Violations ({violations.length})</h2>
      {violations.map(violation => (
        <div key={violation.id}>
          <p>Type: {violation.type}</p>
          <p>Details: {violation.details}</p>
          <p>Severity: {violation.severity}</p>
          <p>Time: {new Date(violation.timestamp).toLocaleString()}</p>
        </div>
      ))}
      <button onClick={clearViolations}>Clear</button>
    </div>
  );
}
```

### Regenerate Nonce

```tsx
import { useSecurityContext } from '@missionfabric-js/enzyme/security';

function NonceManager() {
  const { cspNonce, regenerateNonce } = useSecurityContext();

  return (
    <div>
      <p>Current nonce: {cspNonce}</p>
      <button onClick={() => {
        const newNonce = regenerateNonce();
        console.log('New nonce:', newNonce);
      }}>
        Regenerate Nonce
      </button>
    </div>
  );
}
```

## CSRF Protection

### CSRF Token Management

```tsx
import { useSecurityContext } from '@missionfabric-js/enzyme/security';

function ApiClient() {
  const { csrfToken } = useSecurityContext();

  const makeRequest = async (url, data) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify(data)
    });

    return response.json();
  };

  return (
    <button onClick={() => makeRequest('/api/data', { value: 123 })}>
      Submit
    </button>
  );
}
```

### Token Rotation

```tsx
import { useSecurityContext } from '@missionfabric-js/enzyme/security';

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

## XSS Prevention

### Content Sanitization

```tsx
import { useSecurityContext } from '@missionfabric-js/enzyme/security';

function UserContent({ html }) {
  const { sanitize } = useSecurityContext();

  const safeHtml = sanitize(html);

  return (
    <div dangerouslySetInnerHTML={{ __html: safeHtml }} />
  );
}
```

### URL Validation

```tsx
import { useSecurityContext } from '@missionfabric-js/enzyme/security';

function Link({ href, children }) {
  const { validateUrl } = useSecurityContext();

  if (!validateUrl(href)) {
    console.warn('Invalid URL:', href);
    return <span>{children}</span>;
  }

  return <a href={href}>{children}</a>;
}
```

### Report XSS Attempt

```tsx
import { useSecurityContext } from '@missionfabric-js/enzyme/security';

function InputField() {
  const { reportViolation, sanitize } = useSecurityContext();

  const handleChange = (e) => {
    const value = e.target.value;

    // Check for suspicious patterns
    if (/<script|javascript:|onerror=/i.test(value)) {
      reportViolation({
        type: 'xss-attempt',
        severity: 'high',
        details: `Suspicious input detected: ${value}`,
        blocked: true
      });

      // Sanitize the input
      e.target.value = sanitize(value);
    }
  };

  return <input onChange={handleChange} />;
}
```

## Secure Storage

### Using Secure Storage

```tsx
import { useSecurityContext } from '@missionfabric-js/enzyme/security';

function SecureSettings() {
  const { getSecureStorage } = useSecurityContext();
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    const storage = getSecureStorage();

    // Load encrypted data
    const savedKey = storage.getItem('api-key');
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, [getSecureStorage]);

  const saveApiKey = (key) => {
    const storage = getSecureStorage();

    // Store encrypted
    storage.setItem('api-key', key);
    setApiKey(key);
  };

  return (
    <div>
      <input
        type="password"
        value={apiKey}
        onChange={(e) => saveApiKey(e.target.value)}
        placeholder="API Key"
      />
    </div>
  );
}
```

### Storage API

```typescript
interface SecureStorageInterface {
  // Store encrypted value
  setItem(key: string, value: string): void;

  // Retrieve and decrypt value
  getItem(key: string): string | null;

  // Remove item
  removeItem(key: string): void;

  // Clear all items
  clear(): void;

  // Get all keys
  keys(): string[];
}
```

## Security Configuration

### Development Configuration

```tsx
const devConfig = {
  reportToServer: false,
  enableLogging: true,
  csp: {
    reportViolations: true,
    enableNonce: true
  },
  csrf: {
    enabled: true
  },
  storage: {
    enableEncryption: false // Easier debugging
  }
};

<SecurityProvider config={devConfig}>
  <App />
</SecurityProvider>
```

### Production Configuration

```tsx
const prodConfig = {
  reportToServer: true,
  reportEndpoint: '/api/security/violations',
  enableLogging: false,
  maxViolationHistory: 50,
  csp: {
    reportViolations: true,
    enableNonce: true
  },
  csrf: {
    enabled: true,
    headerName: 'X-CSRF-Token'
  },
  storage: {
    enableEncryption: true,
    storageBackend: 'indexedDB'
  }
};

<SecurityProvider
  config={prodConfig}
  encryptionKey={process.env.STORAGE_ENCRYPTION_KEY}
  onViolation={(violation) => {
    // Send to monitoring service
    Sentry.captureException(new Error(violation.details), {
      tags: {
        type: violation.type,
        severity: violation.severity
      }
    });
  }}
>
  <App />
</SecurityProvider>
```

## Best Practices

### 1. CSP Headers

Configure CSP headers on your server:

```nginx
# nginx example
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'nonce-${CSP_NONCE}'; style-src 'self' 'nonce-${CSP_NONCE}'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';";
```

### 2. CSRF Token in Forms

Always include CSRF token in forms:

```tsx
import { useSecurityContext } from '@missionfabric-js/enzyme/security';

function Form() {
  const { csrfToken } = useSecurityContext();

  return (
    <form method="POST" action="/api/submit">
      <input type="hidden" name="_csrf" value={csrfToken} />
      <input type="text" name="data" />
      <button type="submit">Submit</button>
    </form>
  );
}
```

### 3. Sanitize User Input

Always sanitize user-generated content:

```tsx
import { useSecurityContext } from '@missionfabric-js/enzyme/security';

function Comment({ comment }) {
  const { sanitize } = useSecurityContext();

  return (
    <div className="comment">
      <div className="author">{comment.author}</div>
      <div
        className="content"
        dangerouslySetInnerHTML={{
          __html: sanitize(comment.content)
        }}
      />
    </div>
  );
}
```

### 4. Secure API Calls

Include security headers in all API calls:

```tsx
import { useSecurityContext } from '@missionfabric-js/enzyme/security';

function useSecureApi() {
  const { csrfToken } = useSecurityContext();

  const api = useMemo(() => ({
    async post(url, data) {
      return fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify(data)
      });
    },

    async get(url) {
      return fetch(url, {
        headers: {
          'X-CSRF-Token': csrfToken
        }
      });
    }
  }), [csrfToken]);

  return api;
}
```

### 5. Monitor Violations

Set up violation monitoring:

```tsx
import { SecurityProvider } from '@missionfabric-js/enzyme/security';

function App() {
  const handleViolation = (violation) => {
    // Log to monitoring service
    console.error('[Security Violation]', violation);

    // Send to backend
    fetch('/api/security/violations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(violation),
      keepalive: true
    });

    // Alert for critical violations
    if (violation.severity === 'critical') {
      alert('Critical security violation detected!');
    }
  };

  return (
    <SecurityProvider
      config={{ reportToServer: true }}
      onViolation={handleViolation}
    >
      <YourApp />
    </SecurityProvider>
  );
}
```

### 6. Secure Storage for Sensitive Data

Use secure storage for sensitive information:

```tsx
import { useSecurityContext } from '@missionfabric-js/enzyme/security';

function AuthToken() {
  const { getSecureStorage } = useSecurityContext();

  const saveToken = (token) => {
    const storage = getSecureStorage();
    storage.setItem('auth-token', token);
  };

  const getToken = () => {
    const storage = getSecureStorage();
    return storage.getItem('auth-token');
  };

  const clearToken = () => {
    const storage = getSecureStorage();
    storage.removeItem('auth-token');
  };

  return { saveToken, getToken, clearToken };
}
```

## Security Checklist

- [ ] Configure CSP headers on server
- [ ] Enable CSRF protection for state-changing requests
- [ ] Sanitize all user-generated content
- [ ] Use secure storage for sensitive data
- [ ] Monitor and log security violations
- [ ] Validate and sanitize URLs
- [ ] Use HTTPS in production
- [ ] Implement rate limiting on API endpoints
- [ ] Regular security audits
- [ ] Keep dependencies updated

## Common Vulnerabilities

### XSS (Cross-Site Scripting)

**Vulnerable:**
```tsx
function Comment({ html }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
```

**Secure:**
```tsx
function Comment({ html }) {
  const { sanitize } = useSecurityContext();
  return <div dangerouslySetInnerHTML={{ __html: sanitize(html) }} />;
}
```

### CSRF (Cross-Site Request Forgery)

**Vulnerable:**
```tsx
fetch('/api/delete-account', { method: 'POST' });
```

**Secure:**
```tsx
const { csrfToken } = useSecurityContext();
fetch('/api/delete-account', {
  method: 'POST',
  headers: { 'X-CSRF-Token': csrfToken }
});
```

### Insecure Storage

**Vulnerable:**
```tsx
localStorage.setItem('api-key', apiKey);
```

**Secure:**
```tsx
const { getSecureStorage } = useSecurityContext();
const storage = getSecureStorage();
storage.setItem('api-key', apiKey);
```

## Security Hooks

The security module provides comprehensive React hooks:

- `useSecurityContext()` - Access security context and features
- `useCSRFToken()` - CSRF token management
- `useSecureFetch()` - Fetch with CSRF headers
- `useSecureFormSubmit()` - Form submit with CSRF protection
- `useSanitizedContent()` - Sanitize HTML content
- `useSafeInnerHTML()` - Safe dangerouslySetInnerHTML
- `useValidatedInput()` - Input validation
- `useSafeText()` - Text-only content (strips HTML)
- `useCSPNonce()` - CSP nonce for scripts/styles
- `useNonceScript()` - Script tag with nonce
- `useNonceStyle()` - Style tag with nonce
- `useSecureStorage()` - Encrypted storage hook
- `useViolationReporter()` - Report security violations

## Integration

### With Authentication

```tsx
import { useAuth } from '@/lib/auth';
import { useSecureStorage } from '@/lib/security';

function AuthenticatedApp() {
  const { user, logout } = useAuth();
  const [token, setToken] = useSecureStorage('auth_token', '');

  const handleLogout = () => {
    setToken(''); // Clear encrypted token
    logout();
  };

  return <button onClick={handleLogout}>Logout</button>;
}
```

See [Auth Integration](../auth/README.md#security-integration) for more details.

### With API Module

```tsx
import { useSecureFetch } from '@/lib/security';

function DataFetcher() {
  const secureFetch = useSecureFetch();

  const submit = async (data) => {
    // Automatically includes CSRF token
    const response = await secureFetch('/api/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.json();
  };

  return <button onClick={() => submit({ value: 123 })}>Submit</button>;
}
```

See [API Module](../api/README.md#security) for more details.

### With Feature Flags

```tsx
import { useFeatureFlag } from '@/lib/flags';
import { useSecurityContext } from '@/lib/security';

function ConditionalSecurity() {
  const advancedSecurity = useFeatureFlag('advanced-security');
  const { config } = useSecurityContext();

  // Enable advanced features based on flag
  if (advancedSecurity) {
    config.csrf.tokenRotationInterval = 300000; // 5 minutes
  }

  return <SecureApp />;
}
```

See [Feature Flags](../flags/README.md) for more details.

## Performance Considerations

1. **Sanitization**: Cached per unique input (~1-2ms per sanitization)
2. **CSRF Tokens**: Generated once per session
3. **Encryption**: Web Crypto API is hardware-accelerated
4. **Bundle Size**: Core ~10KB, CSP ~3KB, encryption ~5KB gzipped
5. **Memory**: Minimal overhead (<100KB for typical usage)

## Detailed Documentation

For in-depth information on specific security features:

- **[CSP.md](./CSP.md)** - Content Security Policy implementation, nonce management, violation reporting
- **[CSRF.md](./CSRF.md)** - CSRF protection, token lifecycle, form and API integration
- **[XSS.md](./XSS.md)** - XSS prevention, sanitization, context-aware encoding
- **[SECURE_STORAGE.md](./SECURE_STORAGE.md)** - Encrypted storage, key management, TTL support

## See Also

### Internal Documentation
- [Authentication Module](../auth/README.md) - Secure authentication with token storage
- [API Module](../api/README.md) - API client with CSRF protection
- [Feature Flags](../flags/README.md) - Feature-flag driven security
- [Configuration](../config/README.md) - Security configuration management

### External Resources
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [CSP Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)

---

**Version:** 3.0.0
**Last Updated:** 2025-11-29
