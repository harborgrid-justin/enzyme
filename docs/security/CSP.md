# Content Security Policy (CSP)

Enterprise-grade Content Security Policy management with nonce generation, violation reporting, and dynamic policy configuration for @missionfabric-js/enzyme.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [CSP Nonce Management](#csp-nonce-management)
- [Policy Configuration](#policy-configuration)
- [Violation Reporting](#violation-reporting)
- [CSP Manager](#csp-manager)
- [Integration Patterns](#integration-patterns)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The CSP system provides comprehensive Content Security Policy management to protect your application from XSS attacks, clickjacking, and other code injection vulnerabilities.

### Key Features

- **Nonce Generation**: Cryptographically secure nonces for inline scripts and styles
- **Dynamic Policy Management**: Runtime CSP configuration and updates
- **Violation Reporting**: Track and report CSP violations
- **Multiple Directives**: Support for all CSP directives
- **Policy Merging**: Combine multiple CSP policies
- **Strict Policies**: Pre-configured strict CSP presets
- **React Integration**: Hooks and components for CSP nonces

## Quick Start

### Basic CSP Setup

```tsx
import { SecurityProvider } from '@missionfabric-js/enzyme/security';

function App() {
  return (
    <SecurityProvider
      config={{
        csp: {
          enabled: true,
          reportViolations: true,
          enableNonce: true,
          directives: {
            'default-src': ["'self'"],
            'script-src': ["'self'", "'nonce-{NONCE}'"],
            'style-src': ["'self'", "'nonce-{NONCE}'"],
            'img-src': ["'self'", 'data:', 'https:'],
          },
        },
      }}
    >
      <YourApp />
    </SecurityProvider>
  );
}
```

### Using CSP Nonces

```tsx
import { useCSPNonce } from '@/lib/security';

function InlineScript() {
  const nonce = useCSPNonce();

  return (
    <script nonce={nonce}>
      {`console.log('Safe inline script with CSP nonce');`}
    </script>
  );
}
```

## CSP Nonce Management

### Generating Nonces

Nonces are automatically generated using the Web Crypto API:

```typescript
import { generateNonce } from '@/lib/security';

// Generate cryptographically secure nonce
const nonce = generateNonce(); // Returns base64-encoded random string
```

### Using Nonces in React

#### useCSPNonce Hook

```tsx
import { useCSPNonce } from '@/lib/security';

function Component() {
  const nonce = useCSPNonce();

  return (
    <>
      <script nonce={nonce}>
        {`console.log('Safe script');`}
      </script>
      <style nonce={nonce}>
        {`.safe { color: blue; }`}
      </style>
    </>
  );
}
```

#### useNonceScript Hook

```tsx
import { useNonceScript } from '@/lib/security';

function Analytics() {
  const scriptProps = useNonceScript();

  return (
    <script {...scriptProps}>
      {`gtag('config', 'GA_MEASUREMENT_ID');`}
    </script>
  );
}
```

#### useNonceStyle Hook

```tsx
import { useNonceStyle } from '@/lib/security';

function CustomStyles() {
  const styleProps = useNonceStyle();

  return (
    <style {...styleProps}>
      {`.custom { background: red; }`}
    </style>
  );
}
```

### Nonce Regeneration

```tsx
import { useSecurityContext } from '@/lib/security';

function NonceManager() {
  const { cspNonce, regenerateNonce } = useSecurityContext();

  const handleRegenerate = () => {
    const newNonce = regenerateNonce();
    console.log('New nonce:', newNonce);
  };

  return (
    <div>
      <p>Current nonce: {cspNonce}</p>
      <button onClick={handleRegenerate}>Regenerate Nonce</button>
    </div>
  );
}
```

## Policy Configuration

### CSP Directives

All standard CSP directives are supported:

```typescript
interface CSPPolicy {
  // Fetch directives
  'default-src'?: string[];
  'script-src'?: string[];
  'style-src'?: string[];
  'img-src'?: string[];
  'font-src'?: string[];
  'connect-src'?: string[];
  'media-src'?: string[];
  'object-src'?: string[];
  'frame-src'?: string[];
  'worker-src'?: string[];
  'manifest-src'?: string[];

  // Document directives
  'base-uri'?: string[];
  'sandbox'?: string[];

  // Navigation directives
  'form-action'?: string[];
  'frame-ancestors'?: string[];
  'navigate-to'?: string[];

  // Reporting directives
  'report-uri'?: string[];
  'report-to'?: string[];

  // Other directives
  'upgrade-insecure-requests'?: boolean;
  'block-all-mixed-content'?: boolean;
  'require-trusted-types-for'?: string[];
  'trusted-types'?: string[];
}
```

### Creating Policies

#### Strict Policy

```typescript
import { createStrictPolicy } from '@/lib/security';

const strictPolicy = createStrictPolicy({
  nonce: true,
  allowInlineStyles: false,
  trustedDomains: ['cdn.example.com', 'api.example.com'],
});

// Result:
{
  'default-src': ["'self'"],
  'script-src': ["'self'", "'nonce-{NONCE}'"],
  'style-src': ["'self'", "'nonce-{NONCE}'"],
  'img-src': ["'self'", 'data:', 'https:'],
  'font-src': ["'self'"],
  'connect-src': ["'self'", 'cdn.example.com', 'api.example.com'],
  'object-src': ["'none'"],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'upgrade-insecure-requests': true,
}
```

#### Custom Policy

```typescript
const customPolicy: CSPPolicy = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'nonce-{NONCE}'", 'https://cdn.jsdelivr.net'],
  'style-src': ["'self'", "'nonce-{NONCE}'", 'https://fonts.googleapis.com'],
  'font-src': ["'self'", 'https://fonts.gstatic.com'],
  'img-src': ["'self'", 'data:', 'https:', 'blob:'],
  'connect-src': ["'self'", 'https://api.example.com', 'wss://ws.example.com'],
  'frame-src': ["'none'"],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'upgrade-insecure-requests': true,
};
```

### Merging Policies

```typescript
import { mergeCSPPolicies } from '@/lib/security';

const basePolicy: CSPPolicy = {
  'default-src': ["'self'"],
  'script-src': ["'self'"],
};

const extensionPolicy: CSPPolicy = {
  'script-src': ["'nonce-{NONCE}'", 'https://cdn.example.com'],
  'style-src': ["'self'", "'nonce-{NONCE}'"],
};

const merged = mergeCSPPolicies(basePolicy, extensionPolicy);

// Result:
{
  'default-src': ["'self'"],
  'script-src': ["'self'", "'nonce-{NONCE}'", 'https://cdn.example.com'],
  'style-src': ["'self'", "'nonce-{NONCE}'"],
}
```

## Violation Reporting

### CSP Violation Handler

```tsx
import { SecurityProvider } from '@/lib/security';

function App() {
  const handleViolation = (violation) => {
    console.error('CSP Violation:', {
      type: violation.type,
      blockedURI: violation.details.blockedURI,
      violatedDirective: violation.details.violatedDirective,
      sourceFile: violation.details.sourceFile,
      lineNumber: violation.details.lineNumber,
    });

    // Send to monitoring service
    fetch('/api/security/violations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(violation),
      keepalive: true,
    });
  };

  return (
    <SecurityProvider
      config={{
        csp: {
          enabled: true,
          reportViolations: true,
          reportUri: '/api/csp-violations',
        },
      }}
      onViolation={handleViolation}
    >
      <YourApp />
    </SecurityProvider>
  );
}
```

### Monitoring Violations

```tsx
import { useSecurityContext } from '@/lib/security';

function SecurityMonitor() {
  const { violations, clearViolations } = useSecurityContext();

  const cspViolations = violations.filter(v => v.type === 'csp-violation');

  return (
    <div>
      <h2>CSP Violations ({cspViolations.length})</h2>
      {cspViolations.map(violation => (
        <div key={violation.id}>
          <h3>{violation.details.violatedDirective}</h3>
          <p>Blocked: {violation.details.blockedURI}</p>
          <p>Source: {violation.details.sourceFile}:{violation.details.lineNumber}</p>
          <p>Time: {new Date(violation.timestamp).toLocaleString()}</p>
        </div>
      ))}
      <button onClick={clearViolations}>Clear</button>
    </div>
  );
}
```

### Violation Reporter Hook

```tsx
import { useViolationReporter } from '@/lib/security';

function Component() {
  const reportViolation = useViolationReporter();

  const handleSuspiciousActivity = () => {
    reportViolation({
      type: 'csp-violation',
      severity: 'high',
      details: {
        violatedDirective: 'script-src',
        blockedURI: 'inline',
        sourceFile: 'component.tsx',
      },
    });
  };

  return <button onClick={handleSuspiciousActivity}>Report</button>;
}
```

## CSP Manager

### Using CSP Manager

```typescript
import { CSPManager } from '@/lib/security';

// Create CSP manager
const csp = new CSPManager({
  policy: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'nonce-{NONCE}'"],
    'style-src': ["'self'", "'nonce-{NONCE}'"],
  },
  reportUri: '/api/csp-report',
  reportOnly: false, // Enforce policy (set true for report-only mode)
});

// Generate nonce
const nonce = csp.generateNonce();

// Get CSP header value
const headerValue = csp.getHeaderValue(nonce);

// Set header in response
response.setHeader('Content-Security-Policy', headerValue);
```

### Parsing CSP Strings

```typescript
import { parseCSPString } from '@/lib/security';

const cspString = "default-src 'self'; script-src 'self' 'nonce-abc123'";
const policy = parseCSPString(cspString);

// Result:
{
  'default-src': ["'self'"],
  'script-src': ["'self'", "'nonce-abc123'"],
}
```

### Validating CSP Policies

```typescript
import { validateCSPPolicy } from '@/lib/security';

const policy = {
  'default-src': ["'self'"],
  'script-src': ["'unsafe-inline'"], // Potentially unsafe
};

const validation = validateCSPPolicy(policy);

if (!validation.valid) {
  console.warn('CSP Policy Issues:', validation.warnings);
  // Example warning: "script-src contains 'unsafe-inline' which is insecure"
}
```

## Integration Patterns

### Server-Side Rendering

```tsx
// Server-side (Node.js/Express)
import { generateNonce, CSPManager } from '@/lib/security';

app.get('*', (req, res) => {
  const nonce = generateNonce();

  const csp = new CSPManager({
    policy: createStrictPolicy({ nonce: true }),
    reportUri: '/api/csp-report',
  });

  // Set CSP header
  res.setHeader('Content-Security-Policy', csp.getHeaderValue(nonce));

  // Pass nonce to React app
  const html = renderToString(<App nonce={nonce} />);
  res.send(html);
});
```

### Static Site Generation

```tsx
// Next.js example - next.config.js
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self';
`;

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy.replace(/\s{2,}/g, ' ').trim(),
  },
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

### API Integration

```tsx
import { useSecureFetch } from '@/lib/security';

function DataFetcher() {
  const secureFetch = useSecureFetch();

  const fetchData = async () => {
    // Automatically includes CSP-compliant headers
    const response = await secureFetch('/api/data');
    return response.json();
  };

  return <button onClick={fetchData}>Fetch Data</button>;
}
```

## Best Practices

### 1. Use Nonces for Inline Content

```tsx
// Good: Use nonce for inline scripts
const nonce = useCSPNonce();
<script nonce={nonce}>{inlineScript}</script>

// Bad: Unsafe-inline directive
// 'script-src': ["'self'", "'unsafe-inline'"]
```

### 2. Avoid Unsafe Directives

```typescript
// Good: Strict policy
{
  'script-src': ["'self'", "'nonce-{NONCE}'"],
}

// Bad: Unsafe directives
{
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
}
```

### 3. Use Report-Only Mode for Testing

```typescript
// Development: Report-only mode
const csp = new CSPManager({
  policy: strictPolicy,
  reportOnly: import.meta.env.DEV,
  reportUri: '/api/csp-report',
});
```

### 4. Whitelist Specific Sources

```typescript
// Good: Specific trusted sources
{
  'script-src': ["'self'", 'https://cdn.example.com'],
  'connect-src': ["'self'", 'https://api.example.com'],
}

// Bad: Wildcard sources
{
  'script-src': ["'self'", 'https:'],
  'connect-src': ["*"],
}
```

### 5. Monitor and Respond to Violations

```tsx
const handleViolation = (violation) => {
  // Log for analysis
  console.error('CSP Violation:', violation);

  // Send to monitoring service
  Sentry.captureException(new Error('CSP Violation'), {
    extra: violation.details,
  });

  // Alert on critical violations
  if (violation.severity === 'critical') {
    notifySecurityTeam(violation);
  }
};
```

### 6. Use Upgrade Insecure Requests

```typescript
const policy = {
  'default-src': ["'self'"],
  'upgrade-insecure-requests': true, // Auto-upgrade HTTP to HTTPS
};
```

## Troubleshooting

### Issue: CSP Blocking Legitimate Scripts

**Solution:** Add specific source to policy or use nonce:

```typescript
// Option 1: Whitelist the source
{
  'script-src': ["'self'", 'https://trusted-cdn.com'],
}

// Option 2: Use nonce
const nonce = useCSPNonce();
<script nonce={nonce} src="https://external-script.com/script.js" />
```

### Issue: Nonce Not Working

**Solution:** Ensure nonce is correctly generated and passed:

```tsx
// Check SecurityProvider is wrapping your app
<SecurityProvider config={{ csp: { enableNonce: true } }}>
  <App />
</SecurityProvider>

// Verify nonce is being used
const { cspNonce } = useSecurityContext();
console.log('CSP Nonce:', cspNonce);
```

### Issue: CSP Violations in Development

**Solution:** Use report-only mode in development:

```tsx
<SecurityProvider
  config={{
    csp: {
      enabled: true,
      reportOnly: import.meta.env.DEV, // Report-only in dev
    },
  }}
/>
```

### Issue: Third-Party Scripts Blocked

**Solution:** Whitelist trusted third-party sources:

```typescript
const policy = {
  'script-src': [
    "'self'",
    "'nonce-{NONCE}'",
    'https://www.google-analytics.com',
    'https://cdn.segment.com',
  ],
  'connect-src': [
    "'self'",
    'https://analytics.google.com',
    'https://api.segment.io',
  ],
};
```

## See Also

- [XSS Prevention](./XSS.md) - Cross-site scripting protection
- [CSRF Protection](./CSRF.md) - Cross-site request forgery protection
- [Security Overview](./README.md) - Security module overview
- [Auth Integration](../auth/README.md) - Authentication system
- [MDN CSP Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/) - Google's CSP validation tool

---

**Version:** 3.0.0
**Last Updated:** 2025-11-29
