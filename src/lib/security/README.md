# Security Module

> **Purpose:** Enterprise-grade security infrastructure with XSS prevention, CSRF protection, CSP management, and encrypted storage.

## Overview

The Security module provides comprehensive defense-in-depth security features for React applications. It protects against common web vulnerabilities including Cross-Site Scripting (XSS), Cross-Site Request Forgery (CSRF), and injection attacks through automatic sanitization, token management, and Content Security Policy enforcement.

This module goes beyond basic security by providing context-aware encoding for different HTML contexts, encrypted local storage with automatic key rotation, CSP nonce generation for inline scripts, violation reporting, and React hooks that make security features easy to use without sacrificing developer experience.

Perfect for applications handling sensitive data or requiring compliance with security standards (SOC2, PCI-DSS, HIPAA), this module provides battle-tested security utilities with minimal performance overhead and maximum protection.

## Key Features

- XSS prevention with context-aware sanitization
- CSRF protection with token management
- Content Security Policy (CSP) with nonce support
- Encrypted localStorage/sessionStorage
- HTML encoding for multiple contexts
- Dangerous content detection and reporting
- Safe innerHTML handling
- URL validation and sanitization
- Email validation
- Secure form handling
- CSRF meta tags and hidden inputs
- CSP violation reporting
- Security event tracking
- React hooks for all security features
- TypeScript type safety

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
    <SecurityProvider>
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
      <textarea name="message" />
      <button type="submit">Send</button>
    </form>
  );
}

// 3. Sanitize user content
function UserPost({ post }) {
  const safeContent = useSanitizedContent(post.content);

  return (
    <div dangerouslySetInnerHTML={{ __html: safeContent }} />
  );
}

// 4. Use encrypted storage
function Settings() {
  const [apiKey, setApiKey] = useSecureStorage('api_key', '');

  return (
    <input
      value={apiKey}
      onChange={(e) => setApiKey(e.target.value)}
      type="password"
    />
  );
}
```

## Exports

### Components
- `SecurityProvider` - Context provider for security features
- `SecurityConsumer` - Context consumer

### XSS Prevention
- `sanitizeHTML()` - Sanitize HTML content
- `encodeHTML()` - Encode for HTML context
- `encodeHTMLAttribute()` - Encode for HTML attributes
- `encodeJavaScript()` - Encode for JavaScript context
- `encodeCSS()` - Encode for CSS context
- `encodeURL()` - Encode for URL context
- `encodeForContext()` - Context-aware encoding
- `stripTags()` - Remove all HTML tags
- `detectDangerousContent()` - Detect XSS attempts
- `isDangerous()` - Quick danger check
- `createSafeHTMLProps()` - Safe props for dangerouslySetInnerHTML
- `isValidEmail()` - Email validation
- `isValidURL()` - URL validation

### CSRF Protection
- `CSRFProtection` - CSRF manager class
- `generateOneTimeToken()` - Generate single-use token
- `createSecureRequestInit()` - Add CSRF headers to fetch
- `createProtectedFormHandler()` - Form submit with CSRF
- `validateRequest()` - Validate CSRF token
- `createCSRFInputProps()` - Hidden input props
- `createCSRFMetaProps()` - Meta tag props

### Content Security Policy
- `CSPManager` - CSP configuration manager
- `generateNonce()` - Generate CSP nonce
- `parseCSPString()` - Parse CSP header
- `mergeCSPPolicies()` - Combine CSP policies
- `createStrictPolicy()` - Strict CSP preset
- `validateCSPPolicy()` - Validate CSP config

### Secure Storage
- `SecureStorage` - Encrypted storage class
- `createSecureLocalStorage()` - Encrypted localStorage
- `createSecureSessionStorage()` - Encrypted sessionStorage
- `initSecureStorage()` - Initialize with config
- `secureWipe()` - Securely delete data
- `generateEncryptionKey()` - Generate encryption key

### Hooks
- `useSecurityContext()` - Access security context
- `useCSRFToken()` - CSRF token management
- `useSecureFetch()` - Fetch with CSRF headers
- `useSecureFormSubmit()` - Form submit with CSRF
- `useSanitizedContent()` - Sanitize HTML content
- `useSafeInnerHTML()` - Safe dangerouslySetInnerHTML
- `useValidatedInput()` - Input validation
- `useSafeText()` - Text-only content
- `useCSPNonce()` - CSP nonce for scripts/styles
- `useNonceScript()` - Script tag with nonce
- `useNonceStyle()` - Style tag with nonce
- `useSecureStorage()` - Encrypted storage hook
- `useViolationReporter()` - Report security violations

### Types
- `CSPPolicy` - CSP configuration type
- `CSPDirective` - CSP directive names
- `CSRFToken` - CSRF token structure
- `CSRFConfig` - CSRF configuration
- `SanitizationOptions` - Sanitization config
- `SecurityViolation` - Security event type
- `SecureStorageConfig` - Storage configuration

## Architecture

The security module provides defense in depth:

```
┌──────────────────────────────────────┐
│         Application Layer             │
│   (Components using secure hooks)    │
└─────────────────┬────────────────────┘
                  │
┌─────────────────┴────────────────────┐
│      Security Hooks Layer             │
│  (useCSRFToken, useSanitizedContent) │
└─────────────────┬────────────────────┘
                  │
┌─────────────────┴────────────────────┐
│       Security Utilities              │
│ (sanitize, encode, validate, etc.)   │
└─────────────────┬────────────────────┘
                  │
┌─────────────────┴────────────────────┐
│      Browser Security APIs            │
│   (Web Crypto, CSP, SameSite, etc.)  │
└──────────────────────────────────────┘
```

### Integration Points

- **API Module**: CSRF token injection in requests
- **Auth Module**: Secure token storage
- **Forms**: CSRF protection for all POST forms

## Common Patterns

### Pattern 1: Safe User-Generated Content
```tsx
import { useSanitizedContent } from '@/lib/security';

function BlogPost({ post }) {
  const safeContent = useSanitizedContent(post.content, {
    allowedTags: ['p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li'],
    allowedAttributes: {
      'a': ['href', 'title'],
    },
  });

  return (
    <article>
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: safeContent }} />
    </article>
  );
}
```

### Pattern 2: CSRF-Protected Forms
```tsx
import { useCSRFToken, useSecureFormSubmit } from '@/lib/security';

function CommentForm() {
  const { token, formInputProps } = useCSRFToken();
  const { handleSubmit, isSubmitting } = useSecureFormSubmit({
    url: '/api/comments',
    onSuccess: () => {
      alert('Comment posted!');
    },
  });

  return (
    <form onSubmit={handleSubmit}>
      <input {...formInputProps} />
      <textarea name="comment" required />
      <button type="submit" disabled={isSubmitting}>
        Post Comment
      </button>
    </form>
  );
}
```

### Pattern 3: Encrypted Sensitive Data
```tsx
import { useSecureStorage } from '@/lib/security';

function APIKeyManager() {
  const [apiKey, setApiKey] = useSecureStorage('api_key', '', {
    ttl: 3600000, // 1 hour
    encrypt: true,
  });

  const [secretToken, setSecretToken] = useSecureStorage('secret_token', '');

  return (
    <div>
      <input
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="API Key"
      />
      <input
        type="password"
        value={secretToken}
        onChange={(e) => setSecretToken(e.target.value)}
        placeholder="Secret Token"
      />
    </div>
  );
}
```

### Pattern 4: CSP Nonce for Inline Scripts
```tsx
import { useCSPNonce, useNonceScript } from '@/lib/security';

function Analytics() {
  const nonce = useCSPNonce();

  return (
    <script nonce={nonce}>
      {`
        gtag('config', 'GA_MEASUREMENT_ID', {
          page_path: window.location.pathname,
        });
      `}
    </script>
  );
}

// Or use the hook
function CustomScript() {
  const scriptProps = useNonceScript();

  return (
    <script {...scriptProps}>
      {`console.log('This script has CSP nonce');`}
    </script>
  );
}
```

### Pattern 5: Secure API Calls
```tsx
import { useSecureFetch } from '@/lib/security';

function DataFetcher() {
  const secureFetch = useSecureFetch();

  const handleSubmit = async (data) => {
    // Automatically includes CSRF token
    const response = await secureFetch('/api/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (response.ok) {
      console.log('Success!');
    }
  };

  return <Form onSubmit={handleSubmit} />;
}
```

### Pattern 6: Input Validation
```tsx
import { useValidatedInput } from '@/lib/security';

function EmailInput() {
  const {
    value,
    setValue,
    isValid,
    error,
  } = useValidatedInput('', {
    validate: (val) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(val) ? null : 'Invalid email';
    },
    sanitize: (val) => val.trim().toLowerCase(),
  });

  return (
    <div>
      <input
        type="email"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={!isValid && value ? 'error' : ''}
      />
      {error && <span className="error">{error}</span>}
    </div>
  );
}
```

## Configuration

### Security Provider Configuration
```tsx
import { SecurityProvider } from '@/lib/security';

<SecurityProvider
  config={{
    // CSRF configuration
    csrf: {
      enabled: true,
      tokenHeader: 'X-CSRF-Token',
      cookieName: '_csrf',
      excludePaths: ['/api/public/*'],
    },

    // CSP configuration
    csp: {
      enabled: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'nonce-{NONCE}'"],
        'style-src': ["'self'", "'nonce-{NONCE}'"],
        'img-src': ["'self'", 'data:', 'https:'],
      },
      reportUri: '/api/csp-violations',
    },

    // Secure storage
    secureStorage: {
      enabled: true,
      encryptionKey: process.env.ENCRYPTION_KEY,
      keyRotationInterval: 86400000, // 24 hours
    },

    // Violation reporting
    onViolation: (violation) => {
      console.error('Security violation:', violation);
      // Send to monitoring service
    },
  }}
>
  <App />
</SecurityProvider>
```

### CSP Header Configuration
```tsx
import { CSPManager, createStrictPolicy } from '@/lib/security';

const csp = new CSPManager({
  policy: createStrictPolicy({
    nonce: true,
    allowInlineStyles: false,
    trustedDomains: ['cdn.example.com', 'api.example.com'],
  }),
  reportUri: '/api/csp-report',
  reportOnly: import.meta.env.DEV, // Report-only in dev
});

// Get CSP header value
const cspHeader = csp.getHeaderValue();
```

## Testing

### Testing with Security Context
```tsx
import { render } from '@testing-library/react';
import { SecurityProvider } from '@/lib/security';

function renderWithSecurity(ui, securityConfig = {}) {
  return render(
    <SecurityProvider config={securityConfig}>
      {ui}
    </SecurityProvider>
  );
}

describe('SecureForm', () => {
  it('includes CSRF token', () => {
    const { container } = renderWithSecurity(<SecureForm />);

    const csrfInput = container.querySelector('input[name="_csrf"]');
    expect(csrfInput).toBeInTheDocument();
    expect(csrfInput.value).toBeTruthy();
  });
});
```

### Testing Sanitization
```tsx
import { sanitizeHTML } from '@/lib/security';

describe('sanitizeHTML', () => {
  it('removes dangerous scripts', () => {
    const dirty = '<p>Hello</p><script>alert("XSS")</script>';
    const clean = sanitizeHTML(dirty);

    expect(clean).toBe('<p>Hello</p>');
    expect(clean).not.toContain('script');
  });

  it('preserves safe content', () => {
    const safe = '<p>Hello <strong>world</strong></p>';
    const result = sanitizeHTML(safe);

    expect(result).toBe(safe);
  });
});
```

## Performance Considerations

1. **Sanitization**: Cached per unique input (~1-2ms per sanitization)
2. **CSRF Tokens**: Generated once per session
3. **Encryption**: Web Crypto API is hardware-accelerated
4. **Bundle Size**: Core ~10KB, CSP ~3KB, encryption ~5KB gzipped
5. **Memory**: Minimal overhead (<100KB for typical usage)

## Troubleshooting

### Issue: CSP Blocking Inline Scripts
**Solution:** Use nonce for inline scripts:
```tsx
const { nonce } = useCSPNonce();
<script nonce={nonce}>{inlineScript}</script>
```

### Issue: CSRF Token Missing
**Solution:** Ensure SecurityProvider wraps your app:
```tsx
<SecurityProvider>
  <App />
</SecurityProvider>
```

### Issue: Sanitization Removing Valid HTML
**Solution:** Configure allowed tags and attributes:
```tsx
const safe = useSanitizedContent(html, {
  allowedTags: ['p', 'br', 'strong', 'em', 'a'],
  allowedAttributes: { 'a': ['href'] },
});
```

### Issue: Encrypted Storage Not Working
**Solution:** Ensure Web Crypto API is available (HTTPS required):
```tsx
if (window.crypto && window.crypto.subtle) {
  const storage = createSecureLocalStorage();
} else {
  console.error('Secure storage requires HTTPS');
}
```

## See Also

- [Security Configuration](/reuse/templates/react/src/config/security.config.ts)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CSP Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Auth Module](../auth/README.md) - Authentication
- [API Module](../api/README.md) - CSRF in API calls

---

**Version:** 3.0.0
**Last Updated:** 2025-11-27
