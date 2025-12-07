# Security Examples

> 28+ practical security examples for the Harbor React Library covering CSRF, XSS, CSP, secure storage, and more.

## Table of Contents

- [CSRF Protection](#csrf-protection)
- [XSS Prevention](#xss-prevention)
- [Content Security Policy](#content-security-policy)
- [Secure Storage](#secure-storage)
- [Input Sanitization](#input-sanitization)
- [Authentication Security](#authentication-security)
- [Security Headers](#security-headers)
- [Audit Logging](#audit-logging)
- [Rate Limiting](#rate-limiting)
- [Data Encryption](#data-encryption)
- [Best Practices](#best-practices)
- [Anti-Patterns](#anti-patterns)

---

## CSRF Protection

### Example 1: CSRF Token Implementation

**Use Case:** Protect state-changing operations
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { useEffect, useState } from 'react';

// Fetch CSRF token on app initialization
export function useCsrfToken() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/csrf-token')
      .then((res) => res.json())
      .then((data) => setToken(data.token));
  }, []);

  return token;
}

// Axios interceptor to add CSRF token
import axios from 'axios';

export function setupCsrfProtection() {
  axios.interceptors.request.use((config) => {
    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

    if (token && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(config.method?.toUpperCase() || '')) {
      config.headers['X-CSRF-Token'] = token;
    }

    return config;
  });
}

// Component usage
function CreatePost() {
  const csrfToken = useCsrfToken();

  const handleSubmit = async (data: PostData) => {
    await axios.post('/api/posts', data, {
      headers: {
        'X-CSRF-Token': csrfToken,
      },
    });
  };

  return <PostForm onSubmit={handleSubmit} />;
}
```

**Explanation:** CSRF tokens prevent malicious sites from making authenticated requests on behalf of users.

**See Also:**

- [OWASP CSRF Guide](https://owasp.org/www-community/attacks/csrf)

---

### Example 2: SameSite Cookie Configuration

**Use Case:** Browser-level CSRF protection
**Difficulty:** ⭐ Basic

```tsx
// Server-side cookie configuration (Express example)
import cookieParser from 'cookie-parser';
import session from 'express-session';

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict', // or 'lax' for some cross-site scenarios
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Client-side: Respect cookie settings
function AuthService() {
  const login = async (credentials: Credentials) => {
    // SameSite cookie automatically sent by browser
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include', // Include cookies in cross-origin requests
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    return response.json();
  };
}
```

**Explanation:** SameSite cookies restrict cross-origin requests, providing built-in CSRF protection.

---

## XSS Prevention

### Example 3: Safe HTML Rendering

**Use Case:** Prevent XSS in user-generated content
**Difficulty:** ⭐⭐ Intermediate

```tsx
import DOMPurify from 'dompurify';

interface Props {
  content: string;
}

// ❌ DANGEROUS - Never do this
function DangerousComponent({ content }: Props) {
  return <div dangerouslySetInnerHTML={{ __html: content }} />;
}

// ✅ SAFE - Sanitize first
function SafeHTMLComponent({ content }: Props) {
  const sanitizedContent = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'title'],
  });

  return <div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />;
}

// Example with markdown
import { marked } from 'marked';

function MarkdownContent({ markdown }: { markdown: string }) {
  const htmlContent = marked(markdown);
  const sanitized = DOMPurify.sanitize(htmlContent);

  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

**Explanation:** Always sanitize HTML before rendering to prevent XSS attacks.

---

### Example 4: URL Sanitization

**Use Case:** Prevent javascript: protocol attacks
**Difficulty:** ⭐⭐ Intermediate

```tsx
function isSafeUrl(url: string): boolean {
  const SAFE_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:'];

  try {
    const parsed = new URL(url, window.location.href);
    return SAFE_PROTOCOLS.includes(parsed.protocol);
  } catch {
    return false;
  }
}

function sanitizeUrl(url: string): string {
  return isSafeUrl(url) ? url : 'about:blank';
}

// Safe link component
interface SafeLinkProps {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}

function SafeLink({ href, children, external }: SafeLinkProps) {
  const safeHref = sanitizeUrl(href);

  return (
    <a
      href={safeHref}
      {...(external && {
        target: '_blank',
        rel: 'noopener noreferrer', // Prevent tabnabbing
      })}
    >
      {children}
    </a>
  );
}

// Usage
function UserProfile({ website }: { website: string }) {
  return (
    <div>
      <SafeLink href={website} external>
        Visit Website
      </SafeLink>
    </div>
  );
}
```

**Explanation:** Validate URLs to prevent javascript: and data: protocol XSS attacks.

---

### Example 5: Input Escaping

**Use Case:** Safely display user input
**Difficulty:** ⭐ Basic

```tsx
// React automatically escapes text content
function UserComment({ comment }: { comment: string }) {
  // Safe - React escapes special characters
  return <p>{comment}</p>;
}

// For attributes, also safe
function UserProfile({ username }: { username: string }) {
  return <div data-username={username}>{username}</div>;
}

// Manual escaping function (if needed outside React)
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

**Explanation:** React automatically escapes text content. Avoid dangerouslySetInnerHTML unless necessary.

---

## Content Security Policy

### Example 6: CSP Meta Tag

**Use Case:** Define allowed content sources
**Difficulty:** ⭐⭐ Intermediate

```tsx
// In your HTML head or Helmet component
import { Helmet } from 'react-helmet-async';

function SecurityHeaders() {
  return (
    <Helmet>
      <meta
        httpEquiv="Content-Security-Policy"
        content="
          default-src 'self';
          script-src 'self' 'unsafe-inline' https://cdn.example.com;
          style-src 'self' 'unsafe-inline';
          img-src 'self' data: https:;
          font-src 'self' data:;
          connect-src 'self' https://api.example.com;
          frame-ancestors 'none';
          base-uri 'self';
          form-action 'self';
        "
      />
    </Helmet>
  );
}
```

**Explanation:** CSP restricts content sources, preventing many XSS attacks.

---

### Example 7: CSP Nonce for Inline Scripts

**Use Case:** Allow specific inline scripts with CSP
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
// Server-side: Generate nonce per request
import crypto from 'crypto';

app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  res.setHeader(
    'Content-Security-Policy',
    `script-src 'self' 'nonce-${res.locals.nonce}'`
  );
  next();
});

// In your template
function AppShell({ nonce }: { nonce: string }) {
  return (
    <html>
      <head>
        <script nonce={nonce}>{`
          window.__INITIAL_STATE__ = ${JSON.stringify(initialState)};
        `}</script>
      </head>
      <body>
        <div id="root"></div>
      </body>
    </html>
  );
}
```

**Explanation:** Nonces allow specific inline scripts while maintaining strict CSP.

---

## Secure Storage

### Example 8: Secure Token Storage

**Use Case:** Store auth tokens securely
**Difficulty:** ⭐⭐ Intermediate

```tsx
// ❌ INSECURE - Vulnerable to XSS
function insecureStorage() {
  localStorage.setItem('token', 'sensitive-token');
}

// ✅ SECURE - Use httpOnly cookies (set by server)
// Server-side
res.cookie('auth_token', token, {
  httpOnly: true, // Inaccessible to JavaScript
  secure: true, // HTTPS only
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000, // 15 minutes
});

// Client-side: Token automatically sent with requests
async function fetchProtectedData() {
  const response = await fetch('/api/protected', {
    credentials: 'include', // Send cookies
  });
  return response.json();
}

// For tokens that must be accessible (e.g., third-party APIs)
// Use short-lived tokens and encrypted storage
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'fallback-key';

export const secureStorage = {
  setItem(key: string, value: string) {
    const encrypted = CryptoJS.AES.encrypt(value, ENCRYPTION_KEY).toString();
    sessionStorage.setItem(key, encrypted);
  },

  getItem(key: string): string | null {
    const encrypted = sessionStorage.getItem(key);
    if (!encrypted) return null;

    try {
      const decrypted = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch {
      return null;
    }
  },

  removeItem(key: string) {
    sessionStorage.removeItem(key);
  },
};
```

**Explanation:** HttpOnly cookies are most secure. If localStorage is needed, encrypt sensitive data.

---

### Example 9: Secure Session Storage

**Use Case:** Temporary sensitive data storage
**Difficulty:** ⭐⭐ Intermediate

```tsx
interface SecureSessionManager {
  set(key: string, value: any): void;
  get<T>(key: string): T | null;
  remove(key: string): void;
  clear(): void;
}

const createSecureSession = (): SecureSessionManager => {
  const PREFIX = '__secure__';

  return {
    set(key: string, value: any) {
      try {
        const encrypted = CryptoJS.AES.encrypt(
          JSON.stringify(value),
          getEncryptionKey()
        ).toString();

        sessionStorage.setItem(`${PREFIX}${key}`, encrypted);
      } catch (error) {
        console.error('Secure storage set error:', error);
      }
    },

    get<T>(key: string): T | null {
      try {
        const encrypted = sessionStorage.getItem(`${PREFIX}${key}`);
        if (!encrypted) return null;

        const decrypted = CryptoJS.AES.decrypt(encrypted, getEncryptionKey());
        return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
      } catch (error) {
        console.error('Secure storage get error:', error);
        return null;
      }
    },

    remove(key: string) {
      sessionStorage.removeItem(`${PREFIX}${key}`);
    },

    clear() {
      Object.keys(sessionStorage)
        .filter((key) => key.startsWith(PREFIX))
        .forEach((key) => sessionStorage.removeItem(key));
    },
  };
};

// Usage
const secureSession = createSecureSession();

function useSecureFormDraft() {
  const saveDraft = (formData: FormData) => {
    secureSession.set('form_draft', formData);
  };

  const loadDraft = () => {
    return secureSession.get<FormData>('form_draft');
  };

  return { saveDraft, loadDraft };
}
```

**Explanation:** Encrypt sessionStorage data for temporary sensitive information.

---

## Input Sanitization

### Example 10: Form Input Validation

**Use Case:** Validate and sanitize user inputs
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { z } from 'zod';
import validator from 'validator';

const userSchema = z.object({
  email: z.string().email('Invalid email format'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  website: z
    .string()
    .optional()
    .refine((url) => !url || validator.isURL(url), 'Invalid URL'),
  bio: z.string().max(500, 'Bio must be at most 500 characters').optional(),
});

function ProfileForm() {
  const handleSubmit = async (data: unknown) => {
    try {
      // Validate and sanitize
      const validated = userSchema.parse(data);

      // Additional sanitization
      const sanitized = {
        ...validated,
        username: validator.escape(validated.username),
        bio: validated.bio ? validator.escape(validated.bio) : undefined,
      };

      await api.updateProfile(sanitized);
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Handle validation errors
        console.error(error.errors);
      }
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

**Explanation:** Validate input format and sanitize before processing or storage.

---

### Example 11: SQL Injection Prevention

**Use Case:** Safe database queries
**Difficulty:** ⭐⭐ Intermediate

```tsx
// ❌ NEVER DO THIS - Vulnerable to SQL injection
function unsafeQuery(username: string) {
  const query = `SELECT * FROM users WHERE username = '${username}'`;
  return db.execute(query);
}

// ✅ SAFE - Use parameterized queries
function safeQuery(username: string) {
  const query = 'SELECT * FROM users WHERE username = ?';
  return db.execute(query, [username]);
}

// Using an ORM (TypeORM example)
import { getRepository } from 'typeorm';
import { User } from './entities/User';

async function findUserSafely(username: string) {
  const userRepository = getRepository(User);

  // Safe - ORM handles parameterization
  return userRepository.findOne({
    where: { username },
  });
}

// Using Prisma
import { prisma } from './prisma';

async function findUserWithPrisma(username: string) {
  // Safe - Prisma automatically parameterizes
  return prisma.user.findUnique({
    where: { username },
  });
}
```

**Explanation:** Always use parameterized queries or ORMs to prevent SQL injection.

---

### Example 12: Path Traversal Prevention

**Use Case:** Secure file access
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
import path from 'path';
import fs from 'fs/promises';

const UPLOADS_DIR = path.join(__dirname, 'uploads');

// ❌ UNSAFE - Vulnerable to path traversal
async function unsafeFileAccess(filename: string) {
  const filePath = path.join(UPLOADS_DIR, filename);
  return fs.readFile(filePath);
}

// ✅ SAFE - Validate path stays within allowed directory
async function safeFileAccess(filename: string) {
  // Normalize and resolve path
  const filePath = path.normalize(path.join(UPLOADS_DIR, filename));

  // Ensure the resolved path is still within UPLOADS_DIR
  if (!filePath.startsWith(UPLOADS_DIR)) {
    throw new Error('Access denied: Invalid file path');
  }

  // Additional validation
  if (!/^[a-zA-Z0-9_\-\.]+$/.test(filename)) {
    throw new Error('Invalid filename characters');
  }

  return fs.readFile(filePath);
}

// Usage in API endpoint
app.get('/api/files/:filename', async (req, res) => {
  try {
    const content = await safeFileAccess(req.params.filename);
    res.send(content);
  } catch (error) {
    res.status(403).json({ error: 'Access denied' });
  }
});
```

**Explanation:** Validate file paths to prevent directory traversal attacks.

---

## Authentication Security

### Example 13: Secure Password Hashing

**Use Case:** Store passwords securely
**Difficulty:** ⭐⭐ Intermediate

```tsx
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export const passwordService = {
  // Hash password before storage
  async hash(password: string): Promise<string> {
    // Validate password strength
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    return bcrypt.hash(password, SALT_ROUNDS);
  },

  // Verify password
  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  },
};

// Usage in registration
async function registerUser(data: RegistrationData) {
  // Hash password before storing
  const hashedPassword = await passwordService.hash(data.password);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword, // Store hash, never plain text
    },
  });

  return user;
}

// Usage in login
async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isValid = await passwordService.verify(password, user.password);

  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  return user;
}
```

**Explanation:** Use bcrypt or similar for password hashing. Never store plain text passwords.

---

### Example 14: JWT Security

**Use Case:** Secure token-based authentication
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET!;

interface TokenPayload {
  userId: string;
  email: string;
}

export const tokenService = {
  // Generate short-lived access token
  generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
      expiresIn: '15m',
      issuer: 'your-app',
      audience: 'your-app-users',
    });
  },

  // Generate long-lived refresh token
  generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
      expiresIn: '7d',
      issuer: 'your-app',
    });
  },

  // Verify access token
  verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, ACCESS_TOKEN_SECRET, {
        issuer: 'your-app',
        audience: 'your-app-users',
      }) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  },

  // Verify refresh token
  verifyRefreshToken(token: string): TokenPayload {
    return jwt.verify(token, REFRESH_TOKEN_SECRET, {
      issuer: 'your-app',
    }) as TokenPayload;
  },
};

// Middleware to protect routes
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const payload = tokenService.verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

**Explanation:** Use short-lived access tokens and rotate refresh tokens for security.

---

### Example 15: Rate Limiting Authentication

**Use Case:** Prevent brute force attacks
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Strict rate limit for login attempts
export const loginRateLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:login:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

// Per-IP + per-account tracking
export const createAccountRateLimiter = (identifier: string) => {
  return rateLimit({
    store: new RedisStore({
      client: redis,
      prefix: `rl:account:${identifier}:`,
    }),
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
  });
};

// Usage
app.post('/api/auth/login', loginRateLimiter, async (req, res) => {
  // Login logic
});

// Client-side: Handle rate limit errors
async function login(credentials: Credentials) {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      throw new Error(`Too many attempts. Try again in ${retryAfter} seconds`);
    }

    return response.json();
  } catch (error) {
    // Handle error
  }
}
```

**Explanation:** Rate limiting prevents brute force and credential stuffing attacks.

---

## Security Headers

### Example 16: Security Headers Configuration

**Use Case:** Set security-related HTTP headers
**Difficulty:** ⭐⭐ Intermediate

```tsx
import helmet from 'helmet';

// Express middleware
app.use(
  helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.example.com'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'api.example.com'],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },

    // Prevent clickjacking
    frameguard: {
      action: 'deny',
    },

    // Prevent MIME type sniffing
    noSniff: true,

    // Hide X-Powered-By header
    hidePoweredBy: true,

    // Strict Transport Security
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },

    // XSS Protection
    xssFilter: true,

    // Referrer Policy
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
  })
);

// Custom headers
app.use((req, res, next) => {
  // Prevent browsers from MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Permissions Policy (formerly Feature Policy)
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=()'
  );

  next();
});
```

**Explanation:** Security headers provide defense-in-depth against various attacks.

---

### Example 17: CORS Configuration

**Use Case:** Secure cross-origin requests
**Difficulty:** ⭐⭐ Intermediate

```tsx
import cors from 'cors';

// Strict CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://yourdomain.com',
      'https://app.yourdomain.com',
    ];

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies
  maxAge: 86400, // Cache preflight for 24 hours
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
};

app.use(cors(corsOptions));

// Client-side: Include credentials
async function apiCall() {
  const response = await fetch('https://api.yourdomain.com/data', {
    credentials: 'include', // Send cookies
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return response.json();
}
```

**Explanation:** Properly configured CORS prevents unauthorized cross-origin access.

---

## Audit Logging

### Example 18: Security Event Logging

**Use Case:** Track security-relevant events
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
import winston from 'winston';

const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'security-audit.log' }),
    new winston.transports.Console(),
  ],
});

interface SecurityEvent {
  eventType: 'login' | 'logout' | 'failed_login' | 'password_change' | 'permission_change';
  userId?: string;
  ip?: string;
  userAgent?: string;
  success: boolean;
  details?: Record<string, any>;
}

export function logSecurityEvent(event: SecurityEvent) {
  securityLogger.info({
    ...event,
    timestamp: new Date().toISOString(),
  });

  // Alert on suspicious events
  if (event.eventType === 'failed_login' && !event.success) {
    checkForBruteForce(event.ip);
  }
}

// Usage in authentication
async function login(req: Request, credentials: Credentials) {
  try {
    const user = await authenticateUser(credentials);

    logSecurityEvent({
      eventType: 'login',
      userId: user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
    });

    return user;
  } catch (error) {
    logSecurityEvent({
      eventType: 'failed_login',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      success: false,
      details: { email: credentials.email },
    });

    throw error;
  }
}

// Detect brute force attempts
const failedAttempts = new Map<string, number[]>();

function checkForBruteForce(ip: string) {
  const now = Date.now();
  const attempts = failedAttempts.get(ip) || [];

  // Keep only attempts from last 15 minutes
  const recentAttempts = attempts.filter((time) => now - time < 15 * 60 * 1000);
  recentAttempts.push(now);

  failedAttempts.set(ip, recentAttempts);

  // Alert if more than 5 attempts in 15 minutes
  if (recentAttempts.length > 5) {
    securityLogger.warn({
      eventType: 'brute_force_detected',
      ip,
      attempts: recentAttempts.length,
    });

    // Trigger additional security measures
    blockIP(ip);
  }
}
```

**Explanation:** Audit logging helps detect and respond to security incidents.

---

### Example 19: Data Access Logging

**Use Case:** Track access to sensitive data
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
interface DataAccessLog {
  userId: string;
  resource: string;
  action: 'read' | 'write' | 'delete';
  resourceId: string;
  timestamp: Date;
  success: boolean;
  ip?: string;
}

async function logDataAccess(log: DataAccessLog) {
  await prisma.dataAccessLog.create({
    data: log,
  });

  // Real-time monitoring for suspicious patterns
  await checkAccessPatterns(log.userId);
}

// Middleware for sensitive routes
function auditDataAccess(resourceType: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = function (data: any) {
      // Log after successful response
      logDataAccess({
        userId: req.user.id,
        resource: resourceType,
        action: req.method === 'GET' ? 'read' : 'write',
        resourceId: req.params.id,
        timestamp: new Date(),
        success: res.statusCode < 400,
        ip: req.ip,
      });

      return originalJson(data);
    };

    next();
  };
}

// Usage
app.get('/api/users/:id', requireAuth, auditDataAccess('user'), getUser);
```

**Explanation:** Log access to sensitive data for compliance and security monitoring.

---

## Rate Limiting

### Example 20: API Rate Limiting

**Use Case:** Prevent API abuse
**Difficulty:** ⭐⭐ Intermediate

```tsx
import rateLimit from 'express-rate-limit';

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limit for expensive operations
const heavyOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many requests for this operation',
});

// Usage
app.use('/api/', apiLimiter);
app.post('/api/reports/generate', heavyOperationLimiter, generateReport);

// Client-side: Handle rate limits gracefully
async function apiRequest(url: string, options?: RequestInit) {
  const response = await fetch(url, options);

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');

    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      throw new RateLimitError(`Rate limit exceeded. Retry after ${seconds}s`);
    }
  }

  return response;
}

class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}
```

**Explanation:** Rate limiting protects against abuse and ensures fair resource usage.

---

### Example 21: User-Based Rate Limiting

**Use Case:** Per-user request limits
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
import { Redis } from 'ioredis';

const redis = new Redis();

interface RateLimitConfig {
  points: number; // Number of requests
  duration: number; // Time window in seconds
}

class UserRateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  async consume(userId: string): Promise<boolean> {
    const key = `ratelimit:user:${userId}`;
    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, this.config.duration);
    }

    return current <= this.config.points;
  }

  async reset(userId: string): Promise<void> {
    await redis.del(`ratelimit:user:${userId}`);
  }

  async getRemaining(userId: string): Promise<number> {
    const key = `ratelimit:user:${userId}`;
    const current = await redis.get(key);
    return this.config.points - (parseInt(current || '0', 10));
  }
}

// Usage in middleware
const userLimiter = new UserRateLimiter({
  points: 1000,
  duration: 3600, // 1000 requests per hour
});

async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const allowed = await userLimiter.consume(req.user.id);

  if (!allowed) {
    const remaining = await userLimiter.getRemaining(req.user.id);

    return res.status(429).json({
      error: 'Rate limit exceeded',
      remaining,
    });
  }

  next();
}
```

**Explanation:** Per-user rate limiting provides fine-grained control over API usage.

---

## Data Encryption

### Example 22: Field-Level Encryption

**Use Case:** Encrypt sensitive database fields
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
import crypto from 'crypto';

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
const IV_LENGTH = 16;

export const encryption = {
  encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
  },

  decrypt(text: string): string {
    const [ivHex, encryptedHex] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  },
};

// Usage with Prisma middleware
prisma.$use(async (params, next) => {
  // Encrypt sensitive fields before create/update
  if (params.model === 'User' && (params.action === 'create' || params.action === 'update')) {
    if (params.args.data.ssn) {
      params.args.data.ssn = encryption.encrypt(params.args.data.ssn);
    }
  }

  const result = await next(params);

  // Decrypt after read
  if (params.model === 'User' && params.action === 'findUnique' && result) {
    if (result.ssn) {
      result.ssn = encryption.decrypt(result.ssn);
    }
  }

  return result;
});
```

**Explanation:** Encrypt sensitive fields at rest for additional security layer.

---

### Example 23: End-to-End Encryption

**Use Case:** Client-side encryption for maximum privacy
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
import { generateKeyPair, encrypt, decrypt } from './crypto-utils';

// Generate key pair on client
async function setupE2EE() {
  const { publicKey, privateKey } = await generateKeyPair();

  // Store private key securely (never send to server)
  await secureStorage.setItem('e2ee_private_key', privateKey);

  // Send public key to server
  await api.uploadPublicKey(publicKey);

  return { publicKey, privateKey };
}

// Encrypt message before sending
async function sendSecureMessage(recipientId: string, message: string) {
  // Get recipient's public key
  const recipientPublicKey = await api.getPublicKey(recipientId);

  // Encrypt with recipient's public key
  const encrypted = await encrypt(message, recipientPublicKey);

  // Send encrypted message
  await api.sendMessage({
    recipientId,
    encryptedContent: encrypted,
  });
}

// Decrypt received message
async function readSecureMessage(encryptedMessage: string) {
  // Get own private key
  const privateKey = await secureStorage.getItem('e2ee_private_key');

  if (!privateKey) {
    throw new Error('E2EE not set up');
  }

  // Decrypt with private key
  const decrypted = await decrypt(encryptedMessage, privateKey);

  return decrypted;
}
```

**Explanation:** E2EE ensures only sender and recipient can read messages, not even the server.

---

### Example 24: Secure File Upload

**Use Case:** Validate and sanitize uploaded files
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';

// File validation
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/temp/');
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueName = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueName}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(new Error('Invalid file type'));
      return;
    }

    // Additional validation
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.gif', '.pdf'].includes(ext)) {
      cb(new Error('Invalid file extension'));
      return;
    }

    cb(null, true);
  },
});

// Process and sanitize uploaded images
async function processUploadedImage(filePath: string) {
  try {
    // Strip EXIF data and resize
    await sharp(filePath)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85, progressive: true })
      .toFile(filePath.replace('/temp/', '/processed/'));

    // Delete temp file
    await fs.unlink(filePath);

    return filePath.replace('/temp/', '/processed/');
  } catch (error) {
    console.error('Image processing error:', error);
    throw new Error('Failed to process image');
  }
}

// API endpoint
app.post('/api/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Process image
    const processedPath = await processUploadedImage(req.file.path);

    // Store file metadata
    const file = await prisma.file.create({
      data: {
        userId: req.user.id,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: processedPath,
      },
    });

    res.json({ file });
  } catch (error) {
    res.status(500).json({ error: 'Upload failed' });
  }
});
```

**Explanation:** Validate, sanitize, and process uploaded files to prevent malicious uploads.

---

### Example 25: Dependency Security Scanning

**Use Case:** Automated vulnerability detection
**Difficulty:** ⭐⭐ Intermediate

```json
// package.json scripts
{
  "scripts": {
    "audit": "npm audit",
    "audit:fix": "npm audit fix",
    "security:check": "npm audit && snyk test",
    "security:monitor": "snyk monitor"
  }
}
```

```tsx
// GitHub Actions workflow
// .github/workflows/security.yml
name: Security Audit

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0' # Weekly

jobs:
  security:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run npm audit
        run: npm audit --audit-level=moderate

      - name: Run Snyk Security Scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

      - name: OWASP Dependency Check
        uses: dependency-check/Dependency-Check_Action@main
        with:
          project: 'my-app'
          path: '.'
          format: 'HTML'

      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: security-reports
          path: reports/
```

**Explanation:** Regular security scanning catches known vulnerabilities in dependencies.

---

### Example 26: Environment Variable Security

**Use Case:** Secure configuration management
**Difficulty:** ⭐⭐ Intermediate

```tsx
// ❌ NEVER commit .env files to git
// .gitignore
.env
.env.local
.env.production

// ✅ Use .env.example as template
// .env.example
DATABASE_URL=postgresql://user:password@localhost:5432/db
JWT_SECRET=your-secret-key-here
ENCRYPTION_KEY=your-encryption-key-here

// Validate environment variables on startup
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  ENCRYPTION_KEY: z.string().length(64),
  API_KEY: z.string().min(20),
});

function validateEnv() {
  try {
    envSchema.parse(process.env);
  } catch (error) {
    console.error('Invalid environment variables:', error);
    process.exit(1);
  }
}

validateEnv();

// Type-safe environment access
export const config = {
  nodeEnv: process.env.NODE_ENV as 'development' | 'production' | 'test',
  database: {
    url: process.env.DATABASE_URL!,
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY!,
  },
} as const;

// For client-side (Next.js example)
// Only expose necessary variables with NEXT_PUBLIC_ prefix
export const publicConfig = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL!,
  analyticsId: process.env.NEXT_PUBLIC_ANALYTICS_ID!,
} as const;
```

**Explanation:** Validate and type-check environment variables. Never expose secrets to client.

---

### Example 27: Secure API Key Management

**Use Case:** Manage API keys securely
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
import crypto from 'crypto';

interface ApiKey {
  id: string;
  name: string;
  keyHash: string;
  userId: string;
  permissions: string[];
  createdAt: Date;
  expiresAt?: Date;
  lastUsedAt?: Date;
}

class ApiKeyManager {
  // Generate new API key
  async generateKey(userId: string, name: string, permissions: string[]): Promise<string> {
    // Generate random key
    const key = `sk_${crypto.randomBytes(32).toString('hex')}`;

    // Hash for storage (never store plain key)
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');

    // Store in database
    await prisma.apiKey.create({
      data: {
        name,
        keyHash,
        userId,
        permissions,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      },
    });

    // Return key once (user must save it)
    return key;
  }

  // Validate API key
  async validateKey(key: string): Promise<ApiKey | null> {
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');

    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
    });

    if (!apiKey) return null;

    // Check expiration
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return null;
    }

    // Update last used
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return apiKey;
  }

  // Revoke key
  async revokeKey(keyId: string): Promise<void> {
    await prisma.apiKey.delete({
      where: { id: keyId },
    });
  }
}

// Middleware
async function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  const keyManager = new ApiKeyManager();
  const validKey = await keyManager.validateKey(apiKey);

  if (!validKey) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  req.apiKey = validKey;
  req.user = { id: validKey.userId };

  next();
}
```

**Explanation:** Hash API keys before storage and implement expiration and revocation.

---

### Example 28: Security Monitoring Dashboard

**Use Case:** Monitor security events in real-time
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
import { useQuery } from '@tanstack/react-query';

interface SecurityMetrics {
  failedLogins: number;
  suspiciousIps: string[];
  rateLimitViolations: number;
  recentSecurityEvents: SecurityEvent[];
}

function SecurityDashboard() {
  const { data: metrics } = useQuery({
    queryKey: ['security-metrics'],
    queryFn: () => fetch('/api/admin/security/metrics').then((r) => r.json()),
    refetchInterval: 30000, // Refresh every 30s
  });

  return (
    <div className="security-dashboard">
      <h1>Security Monitoring</h1>

      <div className="metrics-grid">
        <MetricCard
          title="Failed Login Attempts"
          value={metrics?.failedLogins}
          trend="up"
          severity={metrics?.failedLogins > 10 ? 'high' : 'low'}
        />

        <MetricCard
          title="Rate Limit Violations"
          value={metrics?.rateLimitViolations}
          severity={metrics?.rateLimitViolations > 50 ? 'high' : 'low'}
        />

        <MetricCard
          title="Suspicious IPs"
          value={metrics?.suspiciousIps.length}
          severity={metrics?.suspiciousIps.length > 0 ? 'high' : 'low'}
        />
      </div>

      <div className="security-events">
        <h2>Recent Security Events</h2>
        <SecurityEventTable events={metrics?.recentSecurityEvents} />
      </div>

      <div className="ip-blocklist">
        <h2>Blocked IPs</h2>
        <IPBlocklist ips={metrics?.suspiciousIps} />
      </div>
    </div>
  );
}

function SecurityEventTable({ events }: { events: SecurityEvent[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Event Type</th>
          <th>User</th>
          <th>IP Address</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {events?.map((event) => (
          <tr key={event.id} className={event.success ? '' : 'failed'}>
            <td>{new Date(event.timestamp).toLocaleString()}</td>
            <td>{event.eventType}</td>
            <td>{event.userId || 'Anonymous'}</td>
            <td>{event.ip}</td>
            <td>
              <span className={event.success ? 'success' : 'failed'}>
                {event.success ? 'Success' : 'Failed'}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

**Explanation:** Real-time monitoring helps detect and respond to security threats quickly.

---

## Best Practices

### General Security

- ✅ **DO** follow principle of least privilege
- ✅ **DO** validate all user inputs
- ✅ **DO** use HTTPS everywhere in production
- ✅ **DO** keep dependencies updated
- ✅ **DO** implement defense in depth
- ❌ **DON'T** trust client-side validation alone
- ❌ **DON'T** expose sensitive data in error messages

### Authentication & Authorization

- ✅ **DO** use strong password requirements
- ✅ **DO** implement MFA for sensitive operations
- ✅ **DO** use secure session management
- ✅ **DO** implement proper RBAC
- ❌ **DON'T** store passwords in plain text
- ❌ **DON'T** use predictable session IDs

### Data Protection

- ✅ **DO** encrypt sensitive data at rest
- ✅ **DO** use HTTPS for data in transit
- ✅ **DO** sanitize user inputs
- ✅ **DO** implement proper access controls
- ❌ **DON'T** log sensitive information
- ❌ **DON'T** expose internal implementation details

### Security Headers

- ✅ **DO** implement CSP
- ✅ **DO** set security headers
- ✅ **DO** configure CORS properly
- ✅ **DO** use SameSite cookies
- ❌ **DON'T** use overly permissive policies
- ❌ **DON'T** ignore browser security features

---

## Anti-Patterns

### ❌ Storing Secrets in Code

```tsx
// BAD
const API_KEY = 'sk_live_1234567890abcdef';

// GOOD
const API_KEY = process.env.API_KEY;
```

### ❌ Client-Side Only Validation

```tsx
// BAD - Client validation can be bypassed
function handleSubmit(data) {
  if (data.email) {
    await api.submit(data);
  }
}

// GOOD - Always validate on server
async function handleSubmit(data) {
  try {
    await api.submit(data); // Server validates
  } catch (validationError) {
    // Handle error
  }
}
```

### ❌ Exposing Error Details

```tsx
// BAD
catch (error) {
  res.json({ error: error.stack });
}

// GOOD
catch (error) {
  logger.error(error);
  res.json({ error: 'An error occurred' });
}
```

### ❌ Using Weak Cryptography

```tsx
// BAD
const hash = crypto.createHash('md5').update(password).digest('hex');

// GOOD
const hash = await bcrypt.hash(password, 12);
```

---

## See Also

- [OWASP Top 10](https://owasp.org/www-project-top-ten/) - Critical web application security risks
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/) - Security best practices
- [Security Guide](../SECURITY.md) - Comprehensive security documentation
- [Authentication Examples](./auth-examples.md) - Auth implementation patterns
- [Documentation Index](../INDEX.md) - All documentation resources
