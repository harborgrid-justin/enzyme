# Configuration Guide

> **Scope**: This document covers the Harbor React Template's configuration system.
> It provides a single source of truth for all application configuration with type-safe access and runtime validation.
> For environment-specific setup, see [Environment Setup](./ENVIRONMENT.md).

---

## Table of Contents

1. [Overview](#overview)
2. [Configuration Architecture](#configuration-architecture)
3. [Environment Variables](#environment-variables)
4. [Route Configuration](#route-configuration)
5. [API Configuration](#api-configuration)
6. [Storage Configuration](#storage-configuration)
7. [Timing Configuration](#timing-configuration)
8. [Design Tokens](#design-tokens)
9. [Feature Flags](#feature-flags)
10. [Auth Configuration](#auth-configuration)
11. [Runtime Validation](#runtime-validation)
12. [Best Practices](#best-practices)

---

## Overview

Harbor React uses a **centralized configuration hub** that provides:

- **Single Import**: All configuration from `@/config`
- **Type Safety**: Full TypeScript support with autocomplete
- **Validation**: Runtime validation with Zod schemas
- **Documentation**: Self-documenting configuration
- **Environment Awareness**: Different configs for dev/staging/prod

```typescript
import {
  env,           // Environment variables
  ROUTES,        // Route definitions
  API_CONFIG,    // API settings
  STORAGE_KEYS,  // Storage keys
  TIMING,        // Timing constants
  COLORS,        // Design tokens
  FEATURES,      // Feature flags
  authConfig,    // Auth configuration
  initializeConfig,
} from '@/config';
```

---

## Configuration Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      CONFIGURATION HUB                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  src/config/                                                             │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  index.ts ─── Unified exports (ALWAYS import from here)          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                              │                                           │
│  ┌────────────┬────────────┬┴───────────┬─────────────┬────────────┐  │
│  │   env.ts   │  routes.   │  api.      │   design-   │  timing.   │  │
│  │            │  registry  │  config    │   tokens    │  constants │  │
│  │ Environment│ Route defs │ API setup  │  UI tokens  │ Time values│  │
│  └────────────┴────────────┴────────────┴─────────────┴────────────┘  │
│  ┌────────────┬────────────┬────────────┬─────────────┐               │
│  │  storage.  │  auth      │  feature   │  app.       │               │
│  │  config    │  Config    │  FlagConfig│  config     │               │
│  │ Storage    │ Auth setup │ FF setup   │ App meta    │               │
│  └────────────┴────────────┴────────────┴─────────────┘               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Import Rule

Always import from `@/config`, never from individual files:

```typescript
// CORRECT
import { env, ROUTES, API_CONFIG } from '@/config';

// INCORRECT - Do not do this
import { env } from '@/config/env';
import { ROUTES } from '@/config/routes.registry';
```

---

## Environment Variables

### Environment File Structure

```
.env                    # Default values (committed)
.env.local              # Local overrides (gitignored)
.env.development        # Development overrides
.env.staging            # Staging overrides
.env.production         # Production overrides
```

### Available Environment Variables

```env
# =============================================================================
# Application
# =============================================================================
VITE_APP_NAME=Harbor React
VITE_APP_ENV=development          # development | staging | production
VITE_APP_VERSION=1.0.0
VITE_LOG_LEVEL=debug              # debug | info | warn | error

# =============================================================================
# API Configuration
# =============================================================================
VITE_API_BASE_URL=http://localhost:3001/api
VITE_API_TIMEOUT=30000            # milliseconds
VITE_API_RETRY_COUNT=3

# =============================================================================
# Real-time Communication
# =============================================================================
VITE_WS_URL=ws://localhost:3001/ws
VITE_SSE_URL=http://localhost:3001/events

# =============================================================================
# Feature Flags
# =============================================================================
VITE_FEATURE_FLAGS_ENABLED=true
VITE_FEATURE_FLAGS_SOURCE=local   # local | remote
VITE_FEATURE_FLAGS_URL=           # Remote feature flag endpoint

# =============================================================================
# Authentication
# =============================================================================
VITE_AUTH_TOKEN_KEY=auth_token
VITE_AUTH_REFRESH_INTERVAL=300000 # 5 minutes

# =============================================================================
# Monitoring
# =============================================================================
VITE_SENTRY_DSN=
VITE_ENABLE_ERROR_REPORTING=false
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_ANALYTICS_ENABLED=false

# =============================================================================
# Development
# =============================================================================
VITE_ENABLE_DEVTOOLS=true
VITE_MOCK_API=false
```

### Accessing Environment Variables

```typescript
import { env, inDev, inProd } from '@/config';

// Access values
console.log(env.apiBaseUrl);      // 'http://localhost:3001/api'
console.log(env.appEnv);          // 'development'
console.log(env.isDev);           // true

// Environment checks
if (inDev()) {
  console.log('Development mode');
}

if (inProd()) {
  // Production-only code
}

// Type-safe access
const config: EnvConfig = env;
```

### Environment Schema

```typescript
// src/config/env.schema.ts
import { z } from 'zod';

export const envSchema = z.object({
  // Application
  appName: z.string().default('Harbor React'),
  appEnv: z.enum(['development', 'staging', 'production']),
  appVersion: z.string(),

  // API
  apiBaseUrl: z.string().url(),
  apiTimeout: z.number().positive().default(30000),
  apiRetryCount: z.number().min(0).max(10).default(3),

  // Feature Flags
  featureFlagsEnabled: z.boolean().default(true),
  featureFlagsSource: z.enum(['local', 'remote']).default('local'),

  // ... more fields
});

export type EnvConfig = z.infer<typeof envSchema>;
```

---

## Route Configuration

### Route Registry

```typescript
import { ROUTES, buildRoute, buildRouteWithQuery } from '@/config';

// Static routes
const dashboardUrl = ROUTES.dashboard; // '/dashboard'

// Dynamic routes
const userUrl = buildRoute(ROUTES.users.detail, { id: '123' });
// '/users/123'

// Routes with query params
const searchUrl = buildRouteWithQuery(ROUTES.products.list, {
  category: 'electronics',
  page: '1',
});
// '/products?category=electronics&page=1'
```

### Route Definition

```typescript
// src/config/routes.registry.ts
export const ROUTES = {
  // Static routes
  home: '/',
  dashboard: '/dashboard',
  settings: '/settings',

  // Nested routes
  users: {
    list: '/users',
    detail: '/users/:id',
    edit: '/users/:id/edit',
    create: '/users/new',
  },

  products: {
    list: '/products',
    detail: '/products/:id',
    category: '/products/category/:category',
  },

  // Auth routes
  auth: {
    login: '/login',
    logout: '/logout',
    register: '/register',
    forgotPassword: '/forgot-password',
  },
} as const;
```

### Route Metadata

```typescript
import { ROUTE_METADATA, getRouteMetadata } from '@/config';

const metadata = getRouteMetadata(ROUTES.dashboard);
// {
//   title: 'Dashboard',
//   requiresAuth: true,
//   permissions: ['dashboard:view'],
//   breadcrumb: ['Home', 'Dashboard'],
// }
```

---

## API Configuration

### API Config

```typescript
import { API_CONFIG, API_ENDPOINTS, QUERY_KEYS } from '@/config';

// Configuration
console.log(API_CONFIG.baseUrl);    // API base URL
console.log(API_CONFIG.timeout);    // Request timeout
console.log(API_CONFIG.retryCount); // Retry count

// Endpoints
const usersEndpoint = API_ENDPOINTS.users.list;
// '/api/users'

const userEndpoint = API_ENDPOINTS.users.detail('123');
// '/api/users/123'

// Query keys for TanStack Query
const queryKey = QUERY_KEYS.users.list({ role: 'admin' });
// ['users', 'list', { role: 'admin' }]
```

### Endpoint Definition

```typescript
// src/config/api.config.ts
export const API_ENDPOINTS = {
  users: {
    list: '/users',
    detail: (id: string) => `/users/${id}`,
    create: '/users',
    update: (id: string) => `/users/${id}`,
    delete: (id: string) => `/users/${id}`,
  },
  products: {
    list: '/products',
    detail: (id: string) => `/products/${id}`,
    search: '/products/search',
    categories: '/products/categories',
  },
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    me: '/auth/me',
  },
} as const;
```

### Query Key Factory

```typescript
// src/config/api.config.ts
export const QUERY_KEYS = {
  users: {
    all: ['users'] as const,
    lists: () => [...QUERY_KEYS.users.all, 'list'] as const,
    list: (filters?: UserFilters) => [...QUERY_KEYS.users.lists(), filters] as const,
    details: () => [...QUERY_KEYS.users.all, 'detail'] as const,
    detail: (id: string) => [...QUERY_KEYS.users.details(), id] as const,
  },
  // ... other entities
};
```

---

## Storage Configuration

### Storage Keys

```typescript
import {
  STORAGE_KEYS,
  getStorageItem,
  setStorageItem,
  removeStorageItem,
} from '@/config';

// Type-safe storage access
const theme = getStorageItem(STORAGE_KEYS.THEME);
// Returns typed value or null

setStorageItem(STORAGE_KEYS.THEME, 'dark');

removeStorageItem(STORAGE_KEYS.THEME);
```

### Storage Key Definition

```typescript
// src/config/storage.config.ts
export const STORAGE_KEYS = {
  // Authentication
  AUTH_TOKEN: 'harbor_auth_token',
  REFRESH_TOKEN: 'harbor_refresh_token',
  USER_PROFILE: 'harbor_user_profile',

  // Preferences
  THEME: 'harbor_theme',
  LANGUAGE: 'harbor_language',
  SIDEBAR_COLLAPSED: 'harbor_sidebar_collapsed',

  // Cache
  FEATURE_FLAGS_CACHE: 'harbor_feature_flags',
  NAVIGATION_HISTORY: 'harbor_nav_history',

  // Session
  SESSION_ID: 'harbor_session_id',
  LAST_ACTIVITY: 'harbor_last_activity',
} as const;
```

### Storage Utilities

```typescript
import {
  clearAppStorage,
  clearAuthStorage,
  estimateStorageSize,
  isStorageNearCapacity,
} from '@/config';

// Clear all app storage
clearAppStorage();

// Clear only auth-related storage
clearAuthStorage();

// Monitor storage usage
const size = estimateStorageSize();
console.log(`Storage used: ${size} bytes`);

if (isStorageNearCapacity()) {
  console.warn('Storage nearly full');
}
```

---

## Timing Configuration

### Timing Constants

```typescript
import {
  TIMING,
  QUERY_STALE_TIMES,
  QUERY_GC_TIMES,
  API_TIMING,
  UI_TIMING,
} from '@/config';

// Query timing
const staleTime = QUERY_STALE_TIMES.default; // 5 minutes
const gcTime = QUERY_GC_TIMES.default;       // 30 minutes

// API timing
const timeout = API_TIMING.defaultTimeout;   // 30 seconds
const retryDelay = API_TIMING.retryDelay;    // 1 second

// UI timing
const debounce = UI_TIMING.debounce.search;  // 300ms
const animation = UI_TIMING.animation.fast;  // 150ms
```

### Timing Definition

```typescript
// src/config/timing.constants.ts
export const TIMING = {
  query: {
    staleTime: {
      default: 5 * 60 * 1000,     // 5 minutes
      short: 1 * 60 * 1000,       // 1 minute
      long: 30 * 60 * 1000,       // 30 minutes
      infinite: Infinity,
    },
    gcTime: {
      default: 30 * 60 * 1000,    // 30 minutes
      short: 5 * 60 * 1000,       // 5 minutes
      long: 60 * 60 * 1000,       // 1 hour
    },
  },
  api: {
    timeout: 30000,               // 30 seconds
    retryDelay: 1000,             // 1 second
    maxRetries: 3,
  },
  ui: {
    debounce: {
      search: 300,
      input: 150,
      resize: 100,
    },
    animation: {
      fast: 150,
      normal: 300,
      slow: 500,
    },
    toast: {
      success: 3000,
      error: 5000,
      warning: 4000,
    },
  },
  polling: {
    fast: 5000,                   // 5 seconds
    normal: 30000,                // 30 seconds
    slow: 60000,                  // 1 minute
  },
} as const;
```

---

## Design Tokens

### Using Design Tokens

```tsx
import { COLORS, STATUS_BADGES, LAYOUTS, SPACING } from '@/config';

function Card({ status, children }) {
  return (
    <div className={`${CARDS.default} ${SPACING.padding.md}`}>
      <span className={STATUS_BADGES[status]}>
        {status}
      </span>
      <div className={LAYOUTS.flex.column}>
        {children}
      </div>
    </div>
  );
}
```

### Available Tokens

```typescript
// Colors
COLORS.background.primary
COLORS.text.primary
COLORS.brand.primary

// Status Badges
STATUS_BADGES.success
STATUS_BADGES.warning
STATUS_BADGES.error

// Layouts
LAYOUTS.flex.center
LAYOUTS.flex.between
LAYOUTS.grid.cols3

// Spacing
SPACING.padding.sm
SPACING.margin.lg
SPACING.gap.md

// Cards
CARDS.default
CARDS.elevated
CARDS.interactive

// Typography
TYPOGRAPHY.h1
TYPOGRAPHY.body.default
```

See [Design System Guide](./DESIGN_SYSTEM.md) for complete documentation.

---

## Feature Flags

### Using Feature Flags

```tsx
import { useFeatureFlag, FlagGate } from '@/lib/flags';
import { FEATURES } from '@/config';

function Dashboard() {
  const showNewDashboard = useFeatureFlag('new_dashboard');

  return showNewDashboard ? <NewDashboard /> : <LegacyDashboard />;
}

// Or use FlagGate component
function App() {
  return (
    <FlagGate flag="beta_features" fallback={<StandardView />}>
      <BetaView />
    </FlagGate>
  );
}
```

### Feature Flag Configuration

```typescript
// src/config/featureFlagConfig.ts
export const featureFlagConfig: FeatureFlagConfig = {
  flags: {
    new_dashboard: {
      defaultValue: false,
      description: 'Enable new dashboard UI',
      environments: ['development', 'staging'],
    },
    beta_features: {
      defaultValue: false,
      description: 'Enable beta features',
      environments: ['development'],
    },
    analytics_v2: {
      defaultValue: true,
      description: 'Use new analytics system',
      environments: ['development', 'staging', 'production'],
    },
  },
  source: 'local', // or 'remote'
  remoteUrl: '/api/feature-flags',
  cacheTime: 5 * 60 * 1000, // 5 minutes
};
```

---

## Auth Configuration

### Auth Settings

```typescript
import { authConfig, hasPermission, hasMinimumRole } from '@/config';

// Check permissions
if (hasPermission(user, 'users:create')) {
  // User can create users
}

// Check role hierarchy
if (hasMinimumRole(user, 'manager')) {
  // User is manager or higher
}
```

### Auth Configuration

```typescript
// src/config/authConfig.ts
export const authConfig = {
  tokenKey: 'harbor_auth_token',
  refreshInterval: 5 * 60 * 1000, // 5 minutes
  sessionTimeout: 30 * 60 * 1000,  // 30 minutes
};

export const roles = ['viewer', 'user', 'manager', 'admin'] as const;

export const permissions = [
  'users:view',
  'users:create',
  'users:update',
  'users:delete',
  'products:view',
  'products:create',
  'products:update',
  'products:delete',
  'reports:view',
  'reports:export',
  'admin:access',
] as const;

export const rolePermissions: Record<Role, Permission[]> = {
  viewer: ['users:view', 'products:view', 'reports:view'],
  user: ['users:view', 'products:view', 'products:create', 'reports:view'],
  manager: ['users:view', 'users:create', 'products:view', 'products:create', 'products:update', 'reports:view', 'reports:export'],
  admin: [...permissions], // All permissions
};

export const roleHierarchy: Record<Role, number> = {
  viewer: 1,
  user: 2,
  manager: 3,
  admin: 4,
};
```

---

## Runtime Validation

### Validating Configuration

```typescript
import { validateConfig, initializeConfig } from '@/config';

// Validate configuration (returns result)
const result = validateConfig();

if (!result.valid) {
  console.error('Configuration errors:', result.errors);
}

if (result.warnings.length > 0) {
  console.warn('Configuration warnings:', result.warnings);
}

// Initialize with strict validation (throws on error)
try {
  initializeConfig();
} catch (error) {
  console.error('Configuration failed:', error.message);
  // Show error UI or halt application
}
```

### Configuration Summary

```typescript
import { getConfigSummary } from '@/config';

const summary = getConfigSummary();
// {
//   app: { environment: 'development', version: '1.0.0', ... },
//   api: { baseUrl: 'http://localhost:3001/api', ... },
//   features: { featureFlagsEnabled: true, ... },
//   auth: { tokenKey: '[REDACTED]', ... },
//   monitoring: { sentryEnabled: false, ... },
// }
```

### Startup Validation

```typescript
// src/main.tsx
import { initializeConfig } from '@/config';

// Validate configuration before rendering
try {
  initializeConfig();
} catch (error) {
  document.body.innerHTML = `
    <div style="padding: 20px; color: red;">
      <h1>Configuration Error</h1>
      <pre>${error.message}</pre>
    </div>
  `;
  throw error;
}

// Continue with app rendering
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

---

## Best Practices

### 1. Always Import from @/config

```typescript
// CORRECT
import { env, ROUTES, API_CONFIG } from '@/config';

// INCORRECT
import { env } from '@/config/env';
```

### 2. Use Type-Safe Builders

```typescript
// CORRECT
const url = buildRoute(ROUTES.users.detail, { id: userId });

// INCORRECT
const url = `/users/${userId}`;
```

### 3. Validate at Startup

```typescript
// In main.tsx, before rendering
initializeConfig();
```

### 4. Use Environment Checks

```typescript
import { inDev, inProd } from '@/config';

if (inDev()) {
  // Development-only code
}
```

### 5. Document Custom Configuration

```typescript
// Add JSDoc comments
/**
 * Custom API timeout for slow endpoints
 * Used for report generation endpoints
 */
export const REPORT_TIMEOUT = 120000; // 2 minutes
```

### 6. Group Related Configuration

```typescript
// Group by feature or domain
export const REPORTS_CONFIG = {
  maxExportRows: 10000,
  defaultFormat: 'xlsx',
  timeout: 120000,
} as const;
```

---

## Related Documentation

- [Getting Started](./GETTING_STARTED.md) - Quick start guide
- [Config Reference](./CONFIG_REFERENCE.md) - Complete configuration reference
- [Environment Setup](./ENVIRONMENT.md) - Environment variables and setup
- [Design System](./DESIGN_SYSTEM.md) - Design tokens and styling
- [Auto-Routes](./AUTO_ROUTES.md) - File-system based routing
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment

---

<p align="center">
  <strong>Enterprise Configuration Hub</strong><br>
  One import, all configuration
</p>
