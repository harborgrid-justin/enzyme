# Configuration Guide

> **Scope**: This document covers the Harbor React Library's configuration system (initialization options, runtime
> config).
> For template-level configuration (`src/config/`), see [Template Configuration](../../../docs/CONFIGURATION.md).

## Table of Contents

- [Overview](#overview)
- [Environment Variables](#environment-variables)
- [System Configuration](#system-configuration)
- [API Configuration](#api-configuration)
- [Auth Configuration](#auth-configuration)
- [Security Configuration](#security-configuration)
- [Performance Configuration](#performance-configuration)
- [Feature Flags Configuration](#feature-flags-configuration)
- [Theme Configuration](#theme-configuration)
- [Environment-Specific Setup](#environment-specific-setup)

---

## Overview

Configuration in the Harbor React Library follows these principles:

1. **Environment variables** for secrets and environment-specific values
2. **TypeScript config objects** for type-safe application settings
3. **Runtime configuration** for dynamic settings
4. **Sensible defaults** that work out of the box

---

## Environment Variables

### Required Variables

```bash
# .env
# API Configuration
VITE_API_BASE_URL=https://api.example.com
VITE_API_VERSION=v1

# Authentication
VITE_AUTH_DOMAIN=auth.example.com
VITE_AUTH_CLIENT_ID=your-client-id

# Feature Flags
VITE_FEATURE_FLAGS_ENDPOINT=/api/flags
```

### Optional Variables

```bash
# .env
# Error Reporting
VITE_ERROR_REPORTING_DSN=https://sentry.io/...
VITE_ERROR_SAMPLE_RATE=0.1

# Analytics
VITE_ANALYTICS_ID=UA-XXXXX-Y
VITE_ANALYTICS_ENABLED=true

# Debug
VITE_ENABLE_DEBUG=false
VITE_LOG_LEVEL=warn

# Performance
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_PERFORMANCE_SAMPLE_RATE=1.0

# Security
VITE_CSP_REPORT_URI=/api/csp-report
VITE_SECURE_STORAGE_KEY=your-encryption-key
```

### Environment Files

```bash
# .env                 # Shared defaults
# .env.local           # Local overrides (gitignored)
# .env.development     # Development environment
# .env.staging         # Staging environment
# .env.production      # Production environment
```

### Accessing Environment Variables

```typescript
// Type-safe environment access
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_AUTH_DOMAIN: string;
  readonly VITE_AUTH_CLIENT_ID: string;
  readonly VITE_ENABLE_DEBUG?: string;
  // Add all your env vars here
}

// Usage
const apiUrl = import.meta.env.VITE_API_BASE_URL;
const isDebug = import.meta.env.VITE_ENABLE_DEBUG === 'true';
```

---

## System Configuration

### System Initialization

```typescript
// config/system.config.ts
import { SystemConfig } from '@/lib/system';

export const systemConfig: SystemConfig = {
  environment: import.meta.env.MODE as 'development' | 'staging' | 'production',
  debug: import.meta.env.DEV,
  logLevel: import.meta.env.DEV ? 'debug' : 'warn',

  errorReporting: {
    enabled: import.meta.env.PROD,
    dsn: import.meta.env.VITE_ERROR_REPORTING_DSN,
    sampleRate: parseFloat(import.meta.env.VITE_ERROR_SAMPLE_RATE || '0.1'),
  },

  performance: {
    enabled: true,
    collectWebVitals: true,
    collectLongTasks: true,
    sampleRate: 1.0,
  },

  memory: {
    enabled: true,
    moderateThreshold: 0.7,
    criticalThreshold: 0.9,
    onPressure: (level) => {
      if (level === 'critical') {
        // Trigger emergency cleanup
      }
    },
  },

  requestQueue: {
    enabled: true,
    concurrency: 5,
    maxQueueSize: 100,
  },
};

// Usage in app entry
import { initializeSystem } from '@/lib/system';
import { systemConfig } from '@/config/system.config';

initializeSystem(systemConfig);
```

### Logging Configuration

```typescript
// config/logging.config.ts
export const loggingConfig = {
  level: import.meta.env.DEV ? 'debug' : 'warn',
  console: true,
  timestamp: true,
  caller: import.meta.env.DEV,

  // Remote logging
  remote: {
    enabled: import.meta.env.PROD,
    endpoint: '/api/logs',
    batchSize: 10,
    flushInterval: 5000,
  },

  // Log filtering
  filters: {
    // Don't log these in production
    excludePatterns: import.meta.env.PROD ? [
      /^\[DEBUG\]/,
      /^\[TRACE\]/,
    ] : [],
  },
};
```

---

## API Configuration

### API Client Configuration

```typescript
// config/api.config.ts
export const apiConfig = {
  baseURL: import.meta.env.VITE_API_BASE_URL,
  version: import.meta.env.VITE_API_VERSION || 'v1',
  timeout: 30000,

  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Client-Version': APP_VERSION,
  },

  retry: {
    maxAttempts: 3,
    backoff: 'exponential' as const,
    initialDelay: 1000,
    maxDelay: 10000,
    retryableStatuses: [408, 429, 500, 502, 503, 504],
  },

  deduplication: {
    enabled: true,
    ttl: 100,
  },

  cache: {
    defaultStaleTime: 5 * 60 * 1000,  // 5 minutes
    defaultGcTime: 30 * 60 * 1000,     // 30 minutes
  },
};

// Endpoint definitions
export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    me: '/auth/me',
  },
  users: {
    list: '/users',
    get: (id: string) => `/users/${id}`,
    create: '/users',
    update: (id: string) => `/users/${id}`,
    delete: (id: string) => `/users/${id}`,
  },
  // Add more endpoints
};

// Query key factory
export const QUERY_KEYS = {
  users: {
    all: ['users'] as const,
    lists: () => [...QUERY_KEYS.users.all, 'list'] as const,
    list: (filters: object) => [...QUERY_KEYS.users.lists(), filters] as const,
    details: () => [...QUERY_KEYS.users.all, 'detail'] as const,
    detail: (id: string) => [...QUERY_KEYS.users.details(), id] as const,
  },
  // Add more query keys
};
```

### React Query Configuration

```typescript
// config/query.config.ts
import { QueryClientConfig } from '@tanstack/react-query';

export const queryConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: import.meta.env.PROD,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
};
```

---

## Auth Configuration

### Authentication Provider Configuration

```typescript
// config/auth.config.ts
export const authConfig = {
  endpoints: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    refresh: '/api/auth/refresh',
    me: '/api/auth/me',
    register: '/api/auth/register',
    forgotPassword: '/api/auth/forgot-password',
    resetPassword: '/api/auth/reset-password',
  },

  tokenStorage: 'secure' as const,
  tokenRefreshThreshold: 5 * 60 * 1000, // 5 minutes before expiry

  session: {
    timeout: 30 * 60 * 1000, // 30 minutes
    extendOnActivity: true,
    activityEvents: ['mousedown', 'keydown', 'scroll', 'touchstart'],
  },

  redirects: {
    afterLogin: '/dashboard',
    afterLogout: '/login',
    unauthorized: '/unauthorized',
  },

  rememberMe: {
    enabled: true,
    duration: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
};

// SSO Configuration (if using)
export const ssoConfig = {
  provider: 'oidc',
  clientId: import.meta.env.VITE_AUTH_CLIENT_ID,
  authority: `https://${import.meta.env.VITE_AUTH_DOMAIN}`,
  redirectUri: `${window.location.origin}/auth/callback`,
  scopes: ['openid', 'profile', 'email'],
  responseType: 'code',
  pkce: true,
};
```

### Role and Permission Configuration

```typescript
// config/rbac.config.ts
export const rbacConfig = {
  roles: {
    admin: {
      level: 4,
      permissions: ['*'],
    },
    manager: {
      level: 3,
      inherits: ['user'],
      permissions: [
        'users:read',
        'users:create',
        'users:update',
        'reports:*',
        'team:manage',
      ],
    },
    user: {
      level: 2,
      inherits: ['guest'],
      permissions: [
        'profile:*',
        'content:read',
        'content:create',
      ],
    },
    guest: {
      level: 1,
      permissions: ['content:read'],
    },
  },

  defaultRole: 'user',
  superAdminRole: 'admin',
};
```

---

## Security Configuration

### Security Provider Configuration

```typescript
// config/security.config.ts
export const securityConfig = {
  csp: {
    enabled: import.meta.env.PROD,
    reportOnly: false,
    reportUri: import.meta.env.VITE_CSP_REPORT_URI,

    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'nonce-{nonce}'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", import.meta.env.VITE_API_BASE_URL],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },

  csrf: {
    enabled: true,
    headerName: 'X-CSRF-Token',
    cookieName: 'csrf-token',
    excludePaths: ['/api/public/*'],
  },

  xss: {
    sanitizeByDefault: true,
    allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
    },
  },

  secureStorage: {
    algorithm: 'AES-GCM',
    keyDerivation: 'PBKDF2',
    iterations: 100000,
  },
};

// Allowed origins for CORS
export const allowedOrigins = [
  'https://example.com',
  'https://api.example.com',
  import.meta.env.DEV && 'http://localhost:3000',
].filter(Boolean);
```

---

## Performance Configuration

### Performance Monitoring Configuration

```typescript
// config/performance.config.ts
export const performanceConfig = {
  vitals: {
    enabled: true,
    sampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    reportEndpoint: '/api/vitals',

    budgets: {
      LCP: 2500,
      INP: 200,
      CLS: 0.1,
      FCP: 1800,
      TTFB: 800,
    },
  },

  monitoring: {
    enabled: true,
    longTaskThreshold: 50,
    memoryCheckInterval: 30000,
    fpsTrackingEnabled: import.meta.env.DEV,
  },

  prefetch: {
    enabled: true,
    predictiveEnabled: true,
    confidenceThreshold: 0.7,
    maxPrefetchCount: 3,
    respectDataSaver: true,
    minConnectionQuality: '3g',
  },

  hydration: {
    enabled: true,
    collectMetrics: import.meta.env.DEV,
    interactionStrategy: 'replay',
    budget: {
      frameTime: 50,
      idleTime: 10,
    },
  },

  budgets: {
    js: { max: 300 * 1024, warning: 250 * 1024 },
    css: { max: 50 * 1024, warning: 40 * 1024 },
    images: { max: 500 * 1024, warning: 400 * 1024 },
    fonts: { max: 100 * 1024, warning: 80 * 1024 },
  },
};
```

---

## Feature Flags Configuration

### Feature Flags Setup

```typescript
// config/flags.config.ts
export const flagsConfig = {
  // Static flags
  flags: {
    'new-dashboard': import.meta.env.PROD,
    'dark-mode': true,
    'experimental-features': import.meta.env.DEV,
    'analytics-v2': import.meta.env.PROD,
  },

  // Remote flags configuration
  remote: {
    enabled: import.meta.env.PROD,
    endpoint: import.meta.env.VITE_FEATURE_FLAGS_ENDPOINT,
    refreshInterval: 60000,
    timeout: 5000,
  },

  // Fallback flags if remote fails
  fallback: {
    'critical-feature': true,
  },

  // Default value for unknown flags
  defaultValue: false,

  // Caching
  cache: {
    enabled: true,
    key: 'feature-flags',
    ttl: 5 * 60 * 1000,
  },
};

// Flag keys for type safety
export const FLAG_KEYS = {
  NEW_DASHBOARD: 'new-dashboard',
  DARK_MODE: 'dark-mode',
  EXPERIMENTAL_FEATURES: 'experimental-features',
  ANALYTICS_V2: 'analytics-v2',
} as const;
```

---

## Theme Configuration

### Theme Setup

```typescript
// config/theme.config.ts
export const themeConfig = {
  defaultTheme: 'system' as 'light' | 'dark' | 'system',
  storageKey: 'theme-preference',

  tokens: {
    colors: {
      light: {
        primary: '#3b82f6',
        secondary: '#64748b',
        background: '#ffffff',
        surface: '#f8fafc',
        text: '#1e293b',
        textSecondary: '#64748b',
        border: '#e2e8f0',
        error: '#ef4444',
        warning: '#f59e0b',
        success: '#22c55e',
      },
      dark: {
        primary: '#60a5fa',
        secondary: '#94a3b8',
        background: '#0f172a',
        surface: '#1e293b',
        text: '#f8fafc',
        textSecondary: '#94a3b8',
        border: '#334155',
        error: '#f87171',
        warning: '#fbbf24',
        success: '#4ade80',
      },
    },

    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      '2xl': '3rem',
    },

    borderRadius: {
      sm: '0.25rem',
      md: '0.375rem',
      lg: '0.5rem',
      full: '9999px',
    },

    typography: {
      fontFamily: {
        sans: 'Inter, system-ui, sans-serif',
        mono: 'JetBrains Mono, monospace',
      },
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
      },
    },

    shadows: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    },
  },
};
```

---

## Environment-Specific Setup

### Development Configuration

```typescript
// config/environments/development.ts
export const developmentConfig = {
  api: {
    baseURL: 'http://localhost:3001/api',
    mockEnabled: true,
  },

  features: {
    debugMode: true,
    devTools: true,
    performanceOverlay: true,
  },

  logging: {
    level: 'debug',
    console: true,
  },
};
```

### Staging Configuration

```typescript
// config/environments/staging.ts
export const stagingConfig = {
  api: {
    baseURL: 'https://staging-api.example.com',
    mockEnabled: false,
  },

  features: {
    debugMode: true,
    devTools: false,
    performanceOverlay: false,
  },

  logging: {
    level: 'info',
    console: true,
    remote: true,
  },

  errorReporting: {
    enabled: true,
    sampleRate: 1.0, // Report all errors in staging
  },
};
```

### Production Configuration

```typescript
// config/environments/production.ts
export const productionConfig = {
  api: {
    baseURL: 'https://api.example.com',
    mockEnabled: false,
  },

  features: {
    debugMode: false,
    devTools: false,
    performanceOverlay: false,
  },

  logging: {
    level: 'warn',
    console: false,
    remote: true,
  },

  errorReporting: {
    enabled: true,
    sampleRate: 0.1,
  },

  performance: {
    vitalsSampleRate: 0.1,
    prefetchEnabled: true,
  },
};
```

### Configuration Loader

```typescript
// config/index.ts
import { developmentConfig } from './environments/development';
import { stagingConfig } from './environments/staging';
import { productionConfig } from './environments/production';

export function loadConfig() {
  const env = import.meta.env.MODE;

  switch (env) {
    case 'development':
      return developmentConfig;
    case 'staging':
      return stagingConfig;
    case 'production':
      return productionConfig;
    default:
      return developmentConfig;
  }
}

export const config = loadConfig();
```

---

## Configuration Validation

### Schema Validation

```typescript
// config/validation.ts
import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
  VITE_AUTH_DOMAIN: z.string().min(1),
  VITE_AUTH_CLIENT_ID: z.string().min(1),
  VITE_ERROR_REPORTING_DSN: z.string().url().optional(),
});

export function validateEnv() {
  const result = envSchema.safeParse(import.meta.env);

  if (!result.success) {
    console.error('Invalid environment configuration:');
    result.error.issues.forEach(issue => {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    });

    if (import.meta.env.PROD) {
      throw new Error('Invalid environment configuration');
    }
  }

  return result.success;
}

// Call at app startup
validateEnv();
```

---

## See Also

- [Architecture Guide](./ARCHITECTURE.md) - System architecture
- [Migration Guide](./MIGRATION.md) - Upgrading versions
- [README](../README.md) - Quick start guide
- [Documentation Index](./INDEX.md) - All documentation resources
