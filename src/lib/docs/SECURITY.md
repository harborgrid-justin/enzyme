# Security Guide

> **Scope**: This document covers comprehensive security practices, patterns, and implementations for the Harbor React
> Library.
> For general best practices, see [Best Practices Guide](./BEST_PRACTICES.md).

## Table of Contents

- [Security Philosophy](#security-philosophy)
- [CSRF Protection Implementation](#csrf-protection-implementation)
- [XSS Prevention Patterns](#xss-prevention-patterns)
- [Content Security Policy](#content-security-policy)
- [Secure Storage Usage](#secure-storage-usage)
- [Input Validation and Sanitization](#input-validation-and-sanitization)
- [Output Encoding](#output-encoding)
- [Authentication Security](#authentication-security)
- [Authorization (RBAC) Security](#authorization-rbac-security)
- [API Security](#api-security)
- [Security Headers Configuration](#security-headers-configuration)
- [Sensitive Data Handling](#sensitive-data-handling)
- [Audit Logging](#audit-logging)
- [Rate Limiting](#rate-limiting)
- [Security Testing](#security-testing)
- [Security Checklist](#security-checklist)
- [Reporting Vulnerabilities](#reporting-vulnerabilities)

---

## Security Philosophy

### Security Principles

1. **Defense in Depth**: Multiple layers of security
2. **Least Privilege**: Minimum necessary permissions
3. **Fail Securely**: Errors should not expose information
4. **Never Trust Input**: Validate and sanitize everything
5. **Secure by Default**: Safe defaults, opt-in to risk
6. **Separation of Concerns**: Isolate security-critical code

### Threat Model

```
┌─────────────────────────────────────────────────────┐
│                  Attack Vectors                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  • XSS (Cross-Site Scripting)                       │
│  • CSRF (Cross-Site Request Forgery)                │
│  • Injection Attacks (SQL, NoSQL, Command)          │
│  • Broken Authentication                            │
│  • Sensitive Data Exposure                          │
│  • Broken Access Control                            │
│  • Security Misconfiguration                        │
│  • Insecure Deserialization                         │
│  • Using Components with Known Vulnerabilities      │
│  • Insufficient Logging & Monitoring                │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## CSRF Protection Implementation

### Overview

CSRF (Cross-Site Request Forgery) protection prevents unauthorized commands from being transmitted from a user that the
application trusts.

### Automatic CSRF Protection

```typescript
import { apiClient } from '@/lib/api';

// ✅ Good: apiClient automatically adds CSRF tokens
async function updateUser(userId: string, data: UserUpdate) {
  // CSRF token automatically included in headers
  return apiClient.put(`/users/${userId}`, data);
}

// ❌ Bad: Raw fetch without CSRF protection
async function updateUser(userId: string, data: UserUpdate) {
  return fetch(`/api/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    // Missing CSRF token!
  });
}
```

### Manual CSRF Token Usage

```typescript
import { CSRFProtection } from '@/lib/security/csrf-protection';

// Initialize CSRF protection
await CSRFProtection.initialize();

// Get token for manual use
const token = await CSRFProtection.getToken();

// Add to headers
const headers = await CSRFProtection.getHeaders();
// { 'X-CSRF-Token': 'token-value' }

// For forms
function ContactForm() {
  const csrfInputProps = CSRFProtection.getFormInputProps();

  return (
    <form method="POST" action="/api/contact">
      <input {...csrfInputProps} />
      <input name="email" type="email" />
      <button type="submit">Submit</button>
    </form>
  );
}
```

### CSRF Protection Configuration

```typescript
// config/security.config.ts
export const csrfConfig: CSRFConfig = {
  // Protection mode
  mode: 'double-submit-cookie', // or 'synchronizer-token', 'origin-check', 'custom-header'

  // Token configuration
  headerName: 'X-CSRF-Token',
  cookieName: 'csrf-token',
  fieldName: '_csrf',

  // Token rotation
  rotateAfterUse: false,
  tokenTtl: 3600000, // 1 hour

  // Security options
  secureCookies: true,
  sameSite: 'strict', // 'strict', 'lax', or 'none'

  // Origin validation
  validateOrigin: true,
  allowedOrigins: [
    'https://yourdomain.com',
    'https://app.yourdomain.com',
  ],

  // Excluded paths (public APIs)
  excludedPaths: [
    '/api/health',
    '/api/public/*',
  ],
};
```

### CSRF Token Validation

```typescript
import { CSRFProtection, validateRequest } from '@/lib/security/csrf-protection';

// Validate incoming request
function handleRequest(request: Request) {
  const validation = validateRequest({
    method: request.method,
    headers: request.headers,
    url: request.url,
  });

  if (!validation.isValid) {
    throw new Error(`CSRF validation failed: ${validation.reason}`);
  }

  // Rotate token if configured
  if (validation.shouldRotate) {
    await CSRFProtection.regenerateToken();
  }

  // Process request
}
```

### CSRF Protection for Forms

```typescript
import { createProtectedFormHandler } from '@/lib/security/csrf-protection';

function ContactForm() {
  const handleSubmit = createProtectedFormHandler(async (formData) => {
    // CSRF token automatically validated
    const email = formData.get('email') as string;
    const message = formData.get('message') as string;

    await apiClient.post('/contact', { email, message });
  });

  return (
    <form onSubmit={handleSubmit}>
      {/* CSRF token added automatically */}
      <input name="email" type="email" required />
      <textarea name="message" required />
      <button type="submit">Send</button>
    </form>
  );
}
```

---

## XSS Prevention Patterns

### Never Use dangerouslySetInnerHTML Without Sanitization

```typescript
import DOMPurify from 'dompurify';

// ❌ DANGER: XSS vulnerability
function UserContent({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

// ✅ Safe: Sanitized HTML
function UserContent({ html }: { html: string }) {
  const sanitized = useMemo(() => {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a'],
      ALLOWED_ATTR: ['href', 'title'],
      ALLOW_DATA_ATTR: false,
    });
  }, [html]);

  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

### Escape User Input in URLs

```typescript
// ❌ Dangerous: Unescaped user input
function UserLink({ url }: { url: string }) {
  return <a href={url}>Link</a>;
}

// ✅ Safe: Validate and sanitize URLs
function UserLink({ url }: { url: string }) {
  const safeUrl = useMemo(() => {
    try {
      const parsed = new URL(url);

      // Only allow http/https protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return null;
      }

      return parsed.toString();
    } catch {
      return null;
    }
  }, [url]);

  if (!safeUrl) {
    return null;
  }

  return (
    <a href={safeUrl} rel="noopener noreferrer" target="_blank">
      Link
    </a>
  );
}
```

### Sanitize Rich Text Content

```typescript
import DOMPurify from 'dompurify';

interface RichTextConfig {
  allowImages?: boolean;
  allowLinks?: boolean;
  allowLists?: boolean;
}

function sanitizeRichText(html: string, config: RichTextConfig = {}): string {
  const {
    allowImages = false,
    allowLinks = true,
    allowLists = true,
  } = config;

  const allowedTags = [
    'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    ...(allowLinks ? ['a'] : []),
    ...(allowImages ? ['img'] : []),
    ...(allowLists ? ['ul', 'ol', 'li'] : []),
  ];

  const allowedAttrs = [
    ...(allowLinks ? ['href', 'title'] : []),
    ...(allowImages ? ['src', 'alt', 'title'] : []),
  ];

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: allowedAttrs,
    ALLOW_DATA_ATTR: false,
    FORCE_BODY: true,
  });
}

function RichTextDisplay({ content }: { content: string }) {
  const sanitized = useMemo(() => {
    return sanitizeRichText(content, {
      allowImages: true,
      allowLinks: true,
      allowLists: true,
    });
  }, [content]);

  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

### Prevent Script Injection in Attributes

```typescript
// ❌ Dangerous: User input in event handlers
<div onClick={eval(userInput)} />

// ❌ Dangerous: User input in inline styles
<div style={{ backgroundImage: `url(${userInput})` }} />

// ✅ Safe: No user input in attributes
<div onClick={handleClick} />

// ✅ Safe: Validated and sanitized
function SafeBackground({ imageUrl }: { imageUrl: string }) {
  const style = useMemo(() => {
    // Validate URL
    try {
      const url = new URL(imageUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return {};
      }
      return { backgroundImage: `url(${url.toString()})` };
    } catch {
      return {};
    }
  }, [imageUrl]);

  return <div style={style} />;
}
```

---

## Content Security Policy

### CSP Configuration

```typescript
// config/security.config.ts
export const cspConfig = {
  directives: {
    // Default source for all content
    defaultSrc: ["'self'"],

    // Script sources
    scriptSrc: [
      "'self'",
      "'unsafe-inline'", // Required for inline scripts (avoid if possible)
      "'unsafe-eval'", // Required for eval (avoid if possible)
      'https://cdn.example.com',
    ],

    // Style sources
    styleSrc: [
      "'self'",
      "'unsafe-inline'", // Required for inline styles
      'https://fonts.googleapis.com',
    ],

    // Image sources
    imgSrc: [
      "'self'",
      'data:',
      'https:',
      'https://images.example.com',
    ],

    // Font sources
    fontSrc: [
      "'self'",
      'data:',
      'https://fonts.gstatic.com',
    ],

    // API/fetch sources
    connectSrc: [
      "'self'",
      process.env.VITE_API_URL || 'https://api.example.com',
      'wss://ws.example.com',
    ],

    // Frame sources
    frameSrc: ["'none'"],

    // Object sources (plugins)
    objectSrc: ["'none'"],

    // Media sources
    mediaSrc: ["'self'"],

    // Worker sources
    workerSrc: ["'self'", 'blob:'],

    // Form submission targets
    formAction: ["'self'"],

    // Frame ancestors (embedding)
    frameAncestors: ["'none'"],

    // Base URI
    baseUri: ["'self'"],

    // Upgrade insecure requests
    upgradeInsecureRequests: [],

    // Block mixed content
    blockAllMixedContent: [],
  },
};
```

### Applying CSP Headers

```typescript
// Server-side (Express example)
import helmet from 'helmet';

app.use(
  helmet.contentSecurityPolicy({
    directives: cspConfig.directives,
  })
);

// Or via meta tag (less secure, use headers when possible)
function CSPMeta() {
  const cspString = Object.entries(cspConfig.directives)
    .map(([key, values]) => {
      const directive = key.replace(/[A-Z]/g, '-$&').toLowerCase();
      return `${directive} ${values.join(' ')}`;
    })
    .join('; ');

  return (
    <meta httpEquiv="Content-Security-Policy" content={cspString} />
  );
}
```

### CSP Reporting

```typescript
// Add report-uri directive
export const cspConfig = {
  directives: {
    // ... other directives
    reportUri: ['/api/csp-report'],
  },
};

// Handle CSP violation reports
app.post('/api/csp-report', (req, res) => {
  const report = req.body['csp-report'];

  console.error('CSP Violation:', {
    documentUri: report['document-uri'],
    violatedDirective: report['violated-directive'],
    blockedUri: report['blocked-uri'],
    lineNumber: report['line-number'],
    sourceFile: report['source-file'],
  });

  // Log to monitoring service
  // logger.error('CSP Violation', report);

  res.status(204).end();
});
```

---

## Secure Storage Usage

### Never Store Sensitive Data in localStorage

```typescript
// ❌ DANGER: Sensitive data exposed to XSS
localStorage.setItem('jwt-token', token);
localStorage.setItem('password', password);
localStorage.setItem('credit-card', cardNumber);

// ✅ Safe: Use secure, HttpOnly cookies for sensitive data
// Server sets: Set-Cookie: token=xyz; HttpOnly; Secure; SameSite=Strict
```

### Safe Storage Patterns

```typescript
import { SecureStorage } from '@/lib/storage/secure-storage';

// ✅ Good: Encrypted storage for non-critical but private data
const secureStorage = new SecureStorage('app-data', {
  encrypt: true,
  keyDerivation: 'pbkdf2',
});

// Store user preferences (not sensitive)
await secureStorage.setItem('theme', 'dark');
await secureStorage.setItem('language', 'en');

// ❌ Don't store:
// - Authentication tokens (use HttpOnly cookies)
// - Passwords (never store client-side)
// - Credit cards (use payment processor)
// - SSNs or other PII
// - API keys
```

### Storage Security Utilities

```typescript
// lib/storage/secure-storage.ts
export class SecureStorage {
  private storage: Storage;
  private prefix: string;
  private encryptionKey?: CryptoKey;

  constructor(prefix: string, options: SecureStorageOptions = {}) {
    this.storage = options.sessionOnly ? sessionStorage : localStorage;
    this.prefix = prefix;

    if (options.encrypt) {
      this.initializeEncryption();
    }
  }

  async setItem(key: string, value: any): Promise<void> {
    const serialized = JSON.stringify(value);
    const encrypted = this.encryptionKey
      ? await this.encrypt(serialized)
      : serialized;

    this.storage.setItem(`${this.prefix}:${key}`, encrypted);
  }

  async getItem<T>(key: string): Promise<T | null> {
    const stored = this.storage.getItem(`${this.prefix}:${key}`);
    if (!stored) return null;

    try {
      const decrypted = this.encryptionKey
        ? await this.decrypt(stored)
        : stored;

      return JSON.parse(decrypted);
    } catch {
      return null;
    }
  }

  removeItem(key: string): void {
    this.storage.removeItem(`${this.prefix}:${key}`);
  }

  clear(): void {
    const keys = Object.keys(this.storage);
    keys.forEach((key) => {
      if (key.startsWith(`${this.prefix}:`)) {
        this.storage.removeItem(key);
      }
    });
  }

  private async encrypt(data: string): Promise<string> {
    // Encryption implementation
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey!,
      data
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  private async decrypt(encrypted: string): Promise<string> {
    // Decryption implementation
    const combined = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey!,
      data
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }
}
```

---

## Input Validation and Sanitization

### Form Input Validation

```typescript
import { z } from 'zod';

// Define validation schema
const contactFormSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  message: z.string().min(10).max(1000),
});

function ContactForm() {
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      message: formData.get('message'),
    };

    // Validate input
    try {
      const validated = contactFormSchema.parse(data);

      // Send validated data
      await apiClient.post('/contact', validated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Handle validation errors
        console.error('Validation failed:', error.errors);
      }
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### URL Validation

```typescript
function isValidUrl(url: string, allowedProtocols = ['http:', 'https:']): boolean {
  try {
    const parsed = new URL(url);
    return allowedProtocols.includes(parsed.protocol);
  } catch {
    return false;
  }
}

// Usage
function ExternalLink({ href, children }: LinkProps) {
  if (!isValidUrl(href)) {
    return <span>{children}</span>;
  }

  return (
    <a href={href} rel="noopener noreferrer" target="_blank">
      {children}
    </a>
  );
}
```

### File Upload Validation

```typescript
interface FileValidationOptions {
  maxSize: number; // bytes
  allowedTypes: string[];
  allowedExtensions: string[];
}

function validateFile(
  file: File,
  options: FileValidationOptions
): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > options.maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${options.maxSize / 1024 / 1024}MB`,
    };
  }

  // Check MIME type
  if (!options.allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} not allowed`,
    };
  }

  // Check extension
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !options.allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `File extension .${extension} not allowed`,
    };
  }

  return { valid: true };
}

// Usage
function FileUpload() {
  const handleFile = (file: File) => {
    const validation = validateFile(file, {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
    });

    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    // Process file
    uploadFile(file);
  };

  return <input type = "file"
  onChange = {(e)
=>
  e.target.files?.[0] && handleFile(e.target.files[0])
}
  />;
}
```

### SQL Injection Prevention (API Guidelines)

```typescript
// ❌ DANGER: SQL injection vulnerability
const query = `SELECT * FROM users WHERE email = '${userInput}'`;
db.query(query);

// ✅ Safe: Parameterized queries
const query = 'SELECT * FROM users WHERE email = ?';
db.query(query, [userInput]);

// ✅ Safe: ORM with parameterization
const user = await prisma.user.findUnique({
  where: { email: userInput },
});
```

---

## Output Encoding

### HTML Encoding

```typescript
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Usage
function UserComment({ comment }: { comment: string }) {
  return <div>{escapeHtml(comment)}</div>;
}

// React does this automatically for text content
function UserComment({ comment }: { comment: string }) {
  return <div>{comment}</div>; // Automatically escaped
}
```

### URL Encoding

```typescript
function buildUrl(base: string, params: Record<string, string>): string {
  const url = new URL(base);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value); // Automatically encoded
  });

  return url.toString();
}

// Usage
const searchUrl = buildUrl('https://api.example.com/search', {
  query: 'user input with spaces & special chars',
  category: 'books & music',
});
```

### JSON Encoding

```typescript
// ✅ Safe: JSON.stringify handles encoding
function sendData(data: unknown) {
  fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data), // Safe encoding
  });
}
```

---

## Authentication Security

### Secure Token Storage

```typescript
// ❌ DANGER: Token in localStorage (XSS vulnerable)
localStorage.setItem('access-token', token);

// ✅ Safe: Server-side HttpOnly cookie
// Server response:
// Set-Cookie: access-token=xyz; HttpOnly; Secure; SameSite=Strict; Max-Age=900

// ✅ Safe: In-memory storage for SPAs
let accessToken: string | null = null;

export function setAccessToken(token: string): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function clearAccessToken(): void {
  accessToken = null;
}
```

### Token Refresh Pattern

```typescript
import { isTokenExpired, refreshAccessToken } from '@/lib/auth/token';

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

async function getValidToken(): Promise<string> {
  const currentToken = getAccessToken();

  // Check if token is expired
  if (currentToken && !isTokenExpired(currentToken)) {
    return currentToken;
  }

  // If already refreshing, wait for it
  if (isRefreshing) {
    return new Promise((resolve) => {
      refreshSubscribers.push(resolve);
    });
  }

  // Start refresh
  isRefreshing = true;

  try {
    const newToken = await refreshAccessToken();
    setAccessToken(newToken);

    // Notify subscribers
    refreshSubscribers.forEach((callback) => callback(newToken));
    refreshSubscribers = [];

    return newToken;
  } catch (error) {
    // Refresh failed, redirect to login
    clearAccessToken();
    window.location.href = '/login';
    throw error;
  } finally {
    isRefreshing = false;
  }
}

// Use in API client
apiClient.interceptors.request.use(async (config) => {
  const token = await getValidToken();
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

### Password Requirements

```typescript
interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}

const passwordRequirements: PasswordRequirements = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
};

function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < passwordRequirements.minLength) {
    errors.push(`Password must be at least ${passwordRequirements.minLength} characters`);
  }

  if (passwordRequirements.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain an uppercase letter');
  }

  if (passwordRequirements.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain a lowercase letter');
  }

  if (passwordRequirements.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain a number');
  }

  if (passwordRequirements.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain a special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

### Secure Password Reset

```typescript
// Request reset
async function requestPasswordReset(email: string): Promise<void> {
  // Server generates secure token and sends email
  await apiClient.post('/auth/reset-password/request', { email });

  // Don't reveal if email exists (timing-safe response)
  // Always show same message
}

// Reset with token
async function resetPassword(token: string, newPassword: string): Promise<void> {
  // Validate password requirements
  const validation = validatePassword(newPassword);
  if (!validation.valid) {
    throw new Error(validation.errors.join(', '));
  }

  // Server validates token and updates password
  await apiClient.post('/auth/reset-password/confirm', {
    token,
    password: newPassword,
  });

  // Invalidate all existing sessions
  // Send email notification
}
```

---

## Authorization (RBAC) Security

### Permission Checks

```typescript
import { usePermissions } from '@/lib/rbac';

function AdminPanel() {
  const { hasPermission } = usePermissions();

  // Check before rendering
  if (!hasPermission('admin.view')) {
    return <AccessDenied />;
  }

  return (
    <div>
      <h1>Admin Panel</h1>
      {/* Admin content */}
    </div>
  );
}
```

### Resource-Based Authorization

```typescript
import { useResourcePermissions } from '@/lib/rbac';

function DocumentEditor({ documentId }: { documentId: string }) {
  const { canEdit, canDelete } = useResourcePermissions('document', documentId);

  return (
    <div>
      <Document id={documentId} />

      {canEdit && <button onClick={handleEdit}>Edit</button>}
      {canDelete && <button onClick={handleDelete}>Delete</button>}
    </div>
  );
}
```

### Server-Side Authorization

```typescript
// ❌ DANGER: Client-side only authorization
function DeleteButton({ userId }: { userId: string }) {
  const { isAdmin } = useAuth();

  if (!isAdmin) return null;

  const handleDelete = () => {
    // Anyone can call this API if they know the endpoint!
    fetch(`/api/users/${userId}`, { method: 'DELETE' });
  };

  return <button onClick={handleDelete}>Delete</button>;
}

// ✅ Safe: Server validates permissions
// Server endpoint:
app.delete('/api/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
  // Double-check permissions server-side
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await deleteUser(req.params.id);
  res.status(204).end();
});
```

---

## API Security

### API Client Security

```typescript
import { apiClient } from '@/lib/api';

// ✅ Good: Centralized API client with security
const response = await apiClient.post('/users', userData);

// Automatically includes:
// - CSRF tokens
// - Authentication headers
// - Security headers
// - Request validation
// - Error handling
```

### Rate Limiting

```typescript
import { RateLimiter } from '@/lib/api/advanced/rate-limiter';

const limiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60000, // 1 minute
  message: 'Too many requests, please try again later',
});

// Apply to specific endpoints
async function searchAPI(query: string) {
  await limiter.checkLimit('search');
  return apiClient.get('/search', { params: { q: query } });
}

// Or apply globally
apiClient.interceptors.request.use(async (config) => {
  await limiter.checkLimit(config.url || 'default');
  return config;
});
```

### API Key Security

```typescript
// ❌ DANGER: API key in client code
const API_KEY = 'sk-1234567890abcdef';
fetch(`https://api.example.com/data?key=${API_KEY}`);

// ✅ Safe: Server-side API key
// Client makes request to your backend
const data = await apiClient.get('/api/data');

// Your server adds API key
app.get('/api/data', async (req, res) => {
  const response = await fetch('https://api.example.com/data', {
    headers: {
      'Authorization': `Bearer ${process.env.EXTERNAL_API_KEY}`,
    },
  });
  res.json(await response.json());
});
```

---

## Security Headers Configuration

### Essential Security Headers

```typescript
// Server configuration (Express/Node.js)
import helmet from 'helmet';

app.use(helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: cspConfig.directives,
  },

  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },

  // X-Frame-Options
  frameguard: {
    action: 'deny', // or 'sameorigin'
  },

  // X-Content-Type-Options
  noSniff: true,

  // Referrer-Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },

  // Permissions-Policy
  permissionsPolicy: {
    features: {
      geolocation: ["'self'"],
      microphone: ["'none'"],
      camera: ["'none'"],
      payment: ["'self'"],
    },
  },
}));

// Additional headers
app.use((req, res, next) => {
  // X-XSS-Protection (legacy, CSP is better)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Remove X-Powered-By
  res.removeHeader('X-Powered-By');

  next();
});
```

---

## Sensitive Data Handling

### Redacting Sensitive Information

```typescript
interface SensitiveData {
  ssn?: string;
  creditCard?: string;
  password?: string;
  apiKey?: string;
}

function redactSensitive<T extends Record<string, any>>(
  data: T,
  sensitiveFields: (keyof T)[]
): T {
  const redacted = { ...data };

  sensitiveFields.forEach((field) => {
    if (field in redacted) {
      redacted[field] = '[REDACTED]' as any;
    }
  });

  return redacted;
}

// Usage in logging
function logUserAction(user: User, action: string) {
  const safeUser = redactSensitive(user, ['password', 'apiKey', 'ssn']);
  logger.info('User action', { user: safeUser, action });
}
```

### Masking Credit Cards

```typescript
function maskCreditCard(cardNumber: string): string {
  // Show only last 4 digits
  return cardNumber.replace(/\d(?=\d{4})/g, '*');
}

// Usage
const masked = maskCreditCard('4532123456789012'); // ************9012
```

### Secure Data Transmission

```typescript
// ✅ Always use HTTPS in production
if (window.location.protocol !== 'https:' && isProd()) {
  window.location.href = window.location.href.replace('http:', 'https:');
}

// ✅ Validate SSL certificates
const response = await fetch('https://api.example.com/data', {
  // Don't set rejectUnauthorized: false in production!
});
```

---

## Audit Logging

### Security Event Logging

```typescript
interface SecurityEvent {
  type: 'auth' | 'access' | 'data' | 'config';
  action: string;
  userId?: string;
  resource?: string;
  status: 'success' | 'failure';
  ipAddress?: string;
  userAgent?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

class SecurityLogger {
  logEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
    const fullEvent: SecurityEvent = {
      ...event,
      timestamp: Date.now(),
    };

    // Send to logging service
    this.sendToLoggingService(fullEvent);

    // In development, also log to console
    if (isDev()) {
      console.log('[Security Event]', fullEvent);
    }
  }

  private sendToLoggingService(event: SecurityEvent): void {
    // Send to centralized logging (e.g., Datadog, Sentry)
    apiClient.post('/api/audit-log', event).catch((error) => {
      // Fallback if logging fails
      console.error('Failed to log security event:', error);
    });
  }
}

export const securityLogger = new SecurityLogger();
```

### Usage Examples

```typescript
// Log authentication events
async function login(credentials: Credentials) {
  try {
    const user = await apiClient.post('/auth/login', credentials);

    securityLogger.logEvent({
      type: 'auth',
      action: 'login',
      userId: user.id,
      status: 'success',
    });

    return user;
  } catch (error) {
    securityLogger.logEvent({
      type: 'auth',
      action: 'login',
      status: 'failure',
      metadata: { email: credentials.email },
    });

    throw error;
  }
}

// Log access control events
function AccessControlledComponent({ resourceId }: { resourceId: string }) {
  const { hasPermission } = usePermissions();

  const canAccess = hasPermission('resource.view', resourceId);

  securityLogger.logEvent({
    type: 'access',
    action: 'resource.view',
    resource: resourceId,
    status: canAccess ? 'success' : 'failure',
  });

  if (!canAccess) {
    return <AccessDenied />;
  }

  return <Resource id={resourceId} />;
}
```

---

## Rate Limiting

### Client-Side Rate Limiting

```typescript
class ClientRateLimiter {
  private requests: Map<string, number[]> = new Map();

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {
  }

  async checkLimit(key: string): Promise<void> {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing requests for this key
    let requests = this.requests.get(key) || [];

    // Remove old requests outside window
    requests = requests.filter((time) => time > windowStart);

    // Check if limit exceeded
    if (requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...requests);
      const retryAfter = oldestRequest + this.windowMs - now;

      throw new Error(
        `Rate limit exceeded. Retry after ${Math.ceil(retryAfter / 1000)} seconds.`
      );
    }

    // Add current request
    requests.push(now);
    this.requests.set(key, requests);
  }

  reset(key?: string): void {
    if (key) {
      this.requests.delete(key);
    } else {
      this.requests.clear();
    }
  }
}

// Usage
const searchLimiter = new ClientRateLimiter(10, 60000); // 10 requests per minute

async function searchAPI(query: string) {
  try {
    await searchLimiter.checkLimit('search');
    return await apiClient.get('/search', { params: { q: query } });
  } catch (error) {
    // Show rate limit error to user
    toast.error(error.message);
    throw error;
  }
}
```

---

## Security Testing

### Testing CSRF Protection

```typescript
import { CSRFProtection } from '@/lib/security/csrf-protection';

describe('CSRF Protection', () => {
  beforeEach(async () => {
    await CSRFProtection.initialize();
  });

  it('adds CSRF token to POST requests', async () => {
    const token = await CSRFProtection.getToken();
    expect(token).toBeTruthy();

    // Verify token is added to headers
    const headers = await CSRFProtection.getHeaders();
    expect(headers['X-CSRF-Token']).toBe(token);
  });

  it('validates CSRF tokens', async () => {
    const token = await CSRFProtection.getToken();

    const validation = CSRFProtection.validateToken(token);
    expect(validation.isValid).toBe(true);
  });

  it('rejects invalid tokens', () => {
    const validation = CSRFProtection.validateToken('invalid-token');
    expect(validation.isValid).toBe(false);
  });
});
```

### Testing XSS Prevention

```typescript
describe('XSS Prevention', () => {
  it('sanitizes dangerous HTML', () => {
    const dangerous = '<script>alert("XSS")</script><p>Safe content</p>';
    const sanitized = sanitizeRichText(dangerous);

    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toContain('<p>Safe content</p>');
  });

  it('removes javascript: URLs', () => {
    const dangerous = '<a href="javascript:alert(1)">Click</a>';
    const sanitized = sanitizeRichText(dangerous);

    expect(sanitized).not.toContain('javascript:');
  });
});
```

### Security Audit Checklist

```typescript
// Run security audit
npm audit

// Check for vulnerable dependencies
npm audit --audit-level=moderate

// Fix vulnerabilities
npm audit fix

// Manual security checks
const securityChecklist = [
  '✓ CSRF protection enabled',
  '✓ XSS prevention implemented',
  '✓ CSP headers configured',
  '✓ HTTPS enforced',
  '✓ Secure cookies (HttpOnly, Secure, SameSite)',
  '✓ Input validation on all forms',
  '✓ Output encoding for user content',
  '✓ Rate limiting implemented',
  '✓ Authentication tokens secure',
  '✓ Authorization checks server-side',
  '✓ Sensitive data not in localStorage',
  '✓ API keys not in client code',
  '✓ Security headers configured',
  '✓ Audit logging implemented',
  '✓ Dependencies up to date',
];
```

---

## Security Checklist

### Pre-Deployment Security Review

- [ ] **Authentication**
    - [ ] Tokens stored securely (HttpOnly cookies or in-memory)
    - [ ] Token refresh mechanism implemented
    - [ ] Password requirements enforced
    - [ ] Login rate limiting enabled

- [ ] **Authorization**
    - [ ] Server-side permission checks
    - [ ] Resource-based authorization
    - [ ] Least privilege principle applied

- [ ] **Input Validation**
    - [ ] All user input validated
    - [ ] File upload validation
    - [ ] URL validation
    - [ ] SQL injection prevention (parameterized queries)

- [ ] **Output Encoding**
    - [ ] HTML escaping for user content
    - [ ] URL encoding where needed
    - [ ] JSON encoding for API responses

- [ ] **XSS Prevention**
    - [ ] No dangerouslySetInnerHTML without sanitization
    - [ ] Content Security Policy configured
    - [ ] User-generated content sanitized

- [ ] **CSRF Protection**
    - [ ] CSRF tokens on all mutations
    - [ ] SameSite cookies configured
    - [ ] Origin validation enabled

- [ ] **Data Protection**
    - [ ] HTTPS enforced
    - [ ] Sensitive data not in localStorage
    - [ ] Encryption for sensitive storage
    - [ ] Secure data transmission

- [ ] **API Security**
    - [ ] Rate limiting implemented
    - [ ] API keys server-side only
    - [ ] Request validation
    - [ ] Error messages don't leak information

- [ ] **Security Headers**
    - [ ] CSP configured
    - [ ] HSTS enabled
    - [ ] X-Frame-Options set
    - [ ] X-Content-Type-Options set

- [ ] **Audit & Monitoring**
    - [ ] Security events logged
    - [ ] Error tracking configured
    - [ ] Anomaly detection enabled

- [ ] **Dependencies**
    - [ ] npm audit passing
    - [ ] Dependencies up to date
    - [ ] No known vulnerabilities

---

## Reporting Vulnerabilities

### How to Report

If you discover a security vulnerability, please:

1. **Do NOT** open a public GitHub issue
2. **Do NOT** discuss publicly before disclosure

3. **Email** security@example.com with:
    - Description of the vulnerability
    - Steps to reproduce
    - Potential impact
    - Suggested fix (if any)

4. **Wait** for confirmation and coordinated disclosure

### Response Timeline

- **24 hours**: Initial response
- **7 days**: Assessment and fix development
- **30 days**: Patch release and public disclosure

### Recognition

We maintain a hall of fame for security researchers who responsibly disclose vulnerabilities.

---

## See Also

- [Best Practices](./BEST_PRACTICES.md) - General best practices
- [Authentication Guide](./AUTHENTICATION.md) - Authentication patterns
- [RBAC Guide](./RBAC.md) - Authorization and access control
- [API Reference](./API.md) - API documentation

---

**Last Updated**: 2025-11-27
**Version**: 1.0.0
