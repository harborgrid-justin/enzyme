# Security Features

Comprehensive security features including CSP, CSRF protection, XSS prevention, and secure storage.

## Table of Contents

- [Overview](#overview)
- [SecurityProvider](#securityprovider)
- [CSP Management](#csp-management)
- [CSRF Protection](#csrf-protection)
- [XSS Prevention](#xss-prevention)
- [Secure Storage](#secure-storage)
- [Security Configuration](#security-configuration)
- [Best Practices](#best-practices)

## Overview

The Security module provides a comprehensive suite of security features designed to protect your application from common web vulnerabilities.

### Key Features

- **Content Security Policy (CSP)**: Nonce-based CSP management
- **CSRF Protection**: Token generation and validation
- **XSS Prevention**: Content sanitization and validation
- **Secure Storage**: Encrypted client-side storage
- **Violation Tracking**: Monitor and report security violations
- **Security Headers**: Automatic security header management

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

## API Reference

See the [Advanced Features Overview](../advanced/README.md) for complete API documentation.
