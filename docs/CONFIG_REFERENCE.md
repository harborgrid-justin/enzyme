# Configuration Reference

> **Complete reference for all configuration options** - Environment variables, route configuration, API settings, and design tokens.

---

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Route Configuration](#route-configuration)
3. [API Configuration](#api-configuration)
4. [Timing Configuration](#timing-configuration)
5. [Storage Configuration](#storage-configuration)
6. [Auth Configuration](#auth-configuration)
7. [Feature Flags](#feature-flags)
8. [Design Tokens](#design-tokens)

---

## Environment Variables

### Application

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `VITE_APP_NAME` | `string` | `'Harbor React'` | Application name |
| `VITE_APP_ENV` | `'development' \| 'staging' \| 'production'` | `'development'` | Environment |
| `VITE_APP_VERSION` | `string` | `'1.0.0'` | Application version |
| `VITE_LOG_LEVEL` | `'debug' \| 'info' \| 'warn' \| 'error'` | `'info'` | Log level |

### API

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `VITE_API_BASE_URL` | `string` | required | API base URL |
| `VITE_API_TIMEOUT` | `number` | `30000` | Request timeout (ms) |
| `VITE_API_RETRY_COUNT` | `number` | `3` | Retry attempts |

### Real-time

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `VITE_WS_URL` | `string` | - | WebSocket URL |
| `VITE_SSE_URL` | `string` | - | Server-Sent Events URL |

### Feature Flags

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `VITE_FEATURE_FLAGS_ENABLED` | `boolean` | `true` | Enable feature flags |
| `VITE_FEATURE_FLAGS_SOURCE` | `'local' \| 'remote'` | `'local'` | Flag source |
| `VITE_FEATURE_FLAGS_URL` | `string` | - | Remote flags endpoint |

### Authentication

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `VITE_AUTH_TOKEN_KEY` | `string` | `'auth_token'` | Token storage key |
| `VITE_AUTH_REFRESH_INTERVAL` | `number` | `300000` | Refresh interval (ms) |

### Monitoring

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `VITE_SENTRY_DSN` | `string` | - | Sentry DSN |
| `VITE_ENABLE_ERROR_REPORTING` | `boolean` | `false` | Enable error reporting |
| `VITE_ENABLE_PERFORMANCE_MONITORING` | `boolean` | `true` | Enable perf monitoring |
| `VITE_ANALYTICS_ENABLED` | `boolean` | `false` | Enable analytics |

### Development

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `VITE_ENABLE_DEVTOOLS` | `boolean` | `true` | Enable dev tools |
| `VITE_MOCK_API` | `boolean` | `false` | Use mock API |

---

## Route Configuration

### ROUTES Object

```typescript
import { ROUTES } from '@/config';

// Static routes
ROUTES.home         // '/'
ROUTES.dashboard    // '/dashboard'
ROUTES.settings     // '/settings'

// Nested routes
ROUTES.users.list      // '/users'
ROUTES.users.detail    // '/users/:id' (template)
ROUTES.users.create    // '/users/new'

ROUTES.products.list      // '/products'
ROUTES.products.detail    // '/products/:id'
ROUTES.products.category  // '/products/category/:category'

// Auth routes
ROUTES.auth.login          // '/login'
ROUTES.auth.logout         // '/logout'
ROUTES.auth.register       // '/register'
ROUTES.auth.forgotPassword // '/forgot-password'
```

### Route Builders

```typescript
import { buildRoute, buildRouteWithQuery, buildFullRoute } from '@/config';

// Build dynamic route
buildRoute(ROUTES.users.detail, { id: '123' })
// '/users/123'

// Build with query params
buildRouteWithQuery(ROUTES.products.list, { category: 'electronics', page: '1' })
// '/products?category=electronics&page=1'

// Build full URL
buildFullRoute(ROUTES.users.detail, { id: '123' })
// 'https://example.com/users/123'
```

### Route Metadata

```typescript
interface RouteMetadata {
  title: string;
  description?: string;
  requiresAuth: boolean;
  roles?: Role[];
  permissions?: Permission[];
  breadcrumb: string[];
  icon?: string;
}

import { getRouteMetadata } from '@/config';

getRouteMetadata(ROUTES.dashboard)
// { title: 'Dashboard', requiresAuth: true, breadcrumb: ['Home', 'Dashboard'] }
```

---

## API Configuration

### API_CONFIG

```typescript
import { API_CONFIG } from '@/config';

API_CONFIG.baseUrl    // Base URL from env
API_CONFIG.timeout    // Request timeout
API_CONFIG.retryCount // Retry attempts
API_CONFIG.headers    // Default headers
```

### API_ENDPOINTS

```typescript
import { API_ENDPOINTS } from '@/config';

// Users
API_ENDPOINTS.users.list           // '/users'
API_ENDPOINTS.users.detail('123')  // '/users/123'
API_ENDPOINTS.users.create         // '/users'
API_ENDPOINTS.users.update('123')  // '/users/123'
API_ENDPOINTS.users.delete('123')  // '/users/123'

// Products
API_ENDPOINTS.products.list          // '/products'
API_ENDPOINTS.products.detail('abc') // '/products/abc'
API_ENDPOINTS.products.search        // '/products/search'
API_ENDPOINTS.products.categories    // '/products/categories'

// Auth
API_ENDPOINTS.auth.login    // '/auth/login'
API_ENDPOINTS.auth.logout   // '/auth/logout'
API_ENDPOINTS.auth.refresh  // '/auth/refresh'
API_ENDPOINTS.auth.me       // '/auth/me'
```

### QUERY_KEYS

```typescript
import { QUERY_KEYS } from '@/config';

// Users
QUERY_KEYS.users.all           // ['users']
QUERY_KEYS.users.lists()       // ['users', 'list']
QUERY_KEYS.users.list(filters) // ['users', 'list', filters]
QUERY_KEYS.users.details()     // ['users', 'detail']
QUERY_KEYS.users.detail('123') // ['users', 'detail', '123']

// Products
QUERY_KEYS.products.all
QUERY_KEYS.products.list(filters)
QUERY_KEYS.products.detail(id)
QUERY_KEYS.products.categories()
```

---

## Timing Configuration

### TIMING

```typescript
import { TIMING } from '@/config';

// Query timing
TIMING.query.staleTime.default    // 5 * 60 * 1000 (5 minutes)
TIMING.query.staleTime.short      // 1 * 60 * 1000 (1 minute)
TIMING.query.staleTime.long       // 30 * 60 * 1000 (30 minutes)
TIMING.query.staleTime.infinite   // Infinity

TIMING.query.gcTime.default       // 30 * 60 * 1000 (30 minutes)
TIMING.query.gcTime.short         // 5 * 60 * 1000 (5 minutes)
TIMING.query.gcTime.long          // 60 * 60 * 1000 (1 hour)

// API timing
TIMING.api.timeout                // 30000 (30 seconds)
TIMING.api.retryDelay             // 1000 (1 second)
TIMING.api.maxRetries             // 3

// UI timing
TIMING.ui.debounce.search         // 300ms
TIMING.ui.debounce.input          // 150ms
TIMING.ui.debounce.resize         // 100ms

TIMING.ui.animation.fast          // 150ms
TIMING.ui.animation.normal        // 300ms
TIMING.ui.animation.slow          // 500ms

TIMING.ui.toast.success           // 3000ms
TIMING.ui.toast.error             // 5000ms
TIMING.ui.toast.warning           // 4000ms

// Polling
TIMING.polling.fast               // 5000 (5 seconds)
TIMING.polling.normal             // 30000 (30 seconds)
TIMING.polling.slow               // 60000 (1 minute)
```

### Convenience Exports

```typescript
import {
  QUERY_STALE_TIMES,
  QUERY_GC_TIMES,
  API_TIMING,
  UI_TIMING,
  BACKGROUND_TIMING,
} from '@/config';
```

---

## Storage Configuration

### STORAGE_KEYS

```typescript
import { STORAGE_KEYS } from '@/config';

// Authentication
STORAGE_KEYS.AUTH_TOKEN       // 'harbor_auth_token'
STORAGE_KEYS.REFRESH_TOKEN    // 'harbor_refresh_token'
STORAGE_KEYS.USER_PROFILE     // 'harbor_user_profile'

// Preferences
STORAGE_KEYS.THEME            // 'harbor_theme'
STORAGE_KEYS.LANGUAGE         // 'harbor_language'
STORAGE_KEYS.SIDEBAR_COLLAPSED // 'harbor_sidebar_collapsed'

// Cache
STORAGE_KEYS.FEATURE_FLAGS_CACHE   // 'harbor_feature_flags'
STORAGE_KEYS.NAVIGATION_HISTORY    // 'harbor_nav_history'

// Session
STORAGE_KEYS.SESSION_ID       // 'harbor_session_id'
STORAGE_KEYS.LAST_ACTIVITY    // 'harbor_last_activity'
```

### Storage Utilities

```typescript
import {
  getStorageItem,
  setStorageItem,
  removeStorageItem,
  hasStorageItem,
  clearAppStorage,
  clearAuthStorage,
  clearPreferenceStorage,
} from '@/config';

// Type-safe storage access
const theme = getStorageItem(STORAGE_KEYS.THEME); // string | null
setStorageItem(STORAGE_KEYS.THEME, 'dark');
removeStorageItem(STORAGE_KEYS.THEME);

// Check existence
if (hasStorageItem(STORAGE_KEYS.AUTH_TOKEN)) {
  // User is logged in
}

// Clear storage
clearAuthStorage();      // Clear auth-related keys
clearPreferenceStorage(); // Clear preference keys
clearAppStorage();       // Clear all app keys
```

---

## Auth Configuration

### authConfig

```typescript
import { authConfig } from '@/config';

authConfig.tokenKey        // 'harbor_auth_token'
authConfig.refreshInterval // 5 * 60 * 1000 (5 minutes)
authConfig.sessionTimeout  // 30 * 60 * 1000 (30 minutes)
```

### Roles

```typescript
import { roles, roleHierarchy } from '@/config';

roles // ['viewer', 'user', 'manager', 'admin']

roleHierarchy
// { viewer: 1, user: 2, manager: 3, admin: 4 }
```

### Permissions

```typescript
import { permissions, rolePermissions } from '@/config';

permissions
// ['users:view', 'users:create', 'users:update', 'users:delete',
//  'products:view', 'products:create', 'products:update', 'products:delete',
//  'reports:view', 'reports:export', 'admin:access']

rolePermissions
// {
//   viewer: ['users:view', 'reports:view'],
//   user: ['users:view', 'users:create', 'reports:view'],
//   manager: ['users:view', 'users:create', 'users:update', 'reports:view', 'reports:export'],
//   admin: [...permissions],
// }
```

### Permission Utilities

```typescript
import { hasPermission, hasMinimumRole, getAllPermissions } from '@/config';

// Check permission
hasPermission(user, 'users:create') // boolean

// Check role hierarchy
hasMinimumRole(user, 'manager') // true if manager or admin

// Get all permissions for role
getAllPermissions('manager') // Permission[]
```

---

## Feature Flags

### featureFlagConfig

```typescript
import { featureFlagConfig, getDefaultFlagValue, getDefaultFlags } from '@/config';

// Get single flag default
getDefaultFlagValue('new_dashboard') // false

// Get all defaults
getDefaultFlags()
// { new_dashboard: false, beta_features: false, analytics_v2: true }
```

### Flag Definitions

```typescript
interface FeatureFlagDefinition {
  defaultValue: boolean;
  description: string;
  environments: ('development' | 'staging' | 'production')[];
}

featureFlagConfig.flags
// {
//   new_dashboard: {
//     defaultValue: false,
//     description: 'Enable new dashboard UI',
//     environments: ['development', 'staging'],
//   },
//   beta_features: {
//     defaultValue: false,
//     description: 'Enable beta features',
//     environments: ['development'],
//   },
//   analytics_v2: {
//     defaultValue: true,
//     description: 'Use new analytics system',
//     environments: ['development', 'staging', 'production'],
//   },
// }
```

---

## Design Tokens

### Colors

```typescript
import { COLORS } from '@/config';

// Background
COLORS.background.primary    // 'bg-white dark:bg-gray-900'
COLORS.background.secondary  // 'bg-gray-50 dark:bg-gray-800'
COLORS.background.elevated   // 'bg-white dark:bg-gray-800 shadow'

// Text
COLORS.text.primary   // 'text-gray-900 dark:text-gray-100'
COLORS.text.secondary // 'text-gray-600 dark:text-gray-400'
COLORS.text.muted     // 'text-gray-400 dark:text-gray-500'

// Brand
COLORS.brand.primary       // 'bg-blue-600 text-white'
COLORS.brand.primaryLight  // 'bg-blue-100 text-blue-800'

// Semantic
COLORS.success.light  // 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
COLORS.error.light    // 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
COLORS.warning.light  // 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
COLORS.info.light     // 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
```

### Status Badges

```typescript
import { STATUS_BADGES } from '@/config';

STATUS_BADGES.success  // Green badge classes
STATUS_BADGES.warning  // Yellow badge classes
STATUS_BADGES.error    // Red badge classes
STATUS_BADGES.info     // Blue badge classes
STATUS_BADGES.neutral  // Gray badge classes

// Entity-specific
STATUS_BADGES.entity.active   // Green
STATUS_BADGES.entity.pending  // Yellow
STATUS_BADGES.entity.archived // Gray
```

### Layouts

```typescript
import { LAYOUTS } from '@/config';

// Flexbox
LAYOUTS.flex.center        // 'flex items-center justify-center'
LAYOUTS.flex.centerBetween // 'flex items-center justify-between'
LAYOUTS.flex.column        // 'flex flex-col'
LAYOUTS.flex.wrap          // 'flex flex-wrap'

// Grid
LAYOUTS.grid.cols2  // 'grid grid-cols-2 gap-4'
LAYOUTS.grid.cols3  // 'grid grid-cols-3 gap-4'
LAYOUTS.grid.cols4  // 'grid grid-cols-4 gap-4'

// Container
LAYOUTS.container.default  // 'container mx-auto px-4'
LAYOUTS.container.narrow   // 'max-w-2xl mx-auto px-4'
LAYOUTS.container.wide     // 'max-w-7xl mx-auto px-4'
```

### Spacing

```typescript
import { SPACING } from '@/config';

// Padding
SPACING.padding.sm  // 'p-2'
SPACING.padding.md  // 'p-4'
SPACING.padding.lg  // 'p-6'
SPACING.padding.xl  // 'p-8'

// Margin
SPACING.margin.sm   // 'm-2'
SPACING.margin.md   // 'm-4'
SPACING.margin.lg   // 'm-6'

// Gap
SPACING.gap.sm  // 'gap-2'
SPACING.gap.md  // 'gap-4'
SPACING.gap.lg  // 'gap-6'
```

### Typography

```typescript
import { TYPOGRAPHY } from '@/config';

TYPOGRAPHY.h1     // 'text-4xl font-bold tracking-tight'
TYPOGRAPHY.h2     // 'text-3xl font-semibold'
TYPOGRAPHY.h3     // 'text-2xl font-semibold'
TYPOGRAPHY.h4     // 'text-xl font-semibold'

TYPOGRAPHY.body.default  // 'text-base'
TYPOGRAPHY.body.small    // 'text-sm'
TYPOGRAPHY.body.large    // 'text-lg'

TYPOGRAPHY.muted  // 'text-sm text-gray-500 dark:text-gray-400'
TYPOGRAPHY.code   // 'font-mono text-sm bg-gray-100 dark:bg-gray-800 px-1 rounded'
```

### Components

```typescript
import { CARDS, BUTTON_VARIANTS, BUTTON_SIZES } from '@/config';

// Cards
CARDS.default      // 'bg-white dark:bg-gray-800 rounded-lg border'
CARDS.elevated     // 'bg-white dark:bg-gray-800 rounded-lg shadow-lg'
CARDS.interactive  // 'bg-white dark:bg-gray-800 rounded-lg border hover:shadow-md transition-shadow cursor-pointer'

// Buttons
BUTTON_VARIANTS.primary    // 'bg-blue-600 text-white hover:bg-blue-700'
BUTTON_VARIANTS.secondary  // 'bg-gray-200 text-gray-900 hover:bg-gray-300'
BUTTON_VARIANTS.danger     // 'bg-red-600 text-white hover:bg-red-700'
BUTTON_VARIANTS.ghost      // 'bg-transparent hover:bg-gray-100'

BUTTON_SIZES.sm  // 'px-3 py-1.5 text-sm'
BUTTON_SIZES.md  // 'px-4 py-2 text-base'
BUTTON_SIZES.lg  // 'px-6 py-3 text-lg'
```

### Utilities

```typescript
import { combineTokens, conditionalToken, getStatusBadge } from '@/config';

// Combine multiple tokens
combineTokens(LAYOUTS.flex.center, SPACING.padding.md, COLORS.background.primary)
// 'flex items-center justify-center p-4 bg-white dark:bg-gray-900'

// Conditional token
conditionalToken(isActive, STATUS_BADGES.success, STATUS_BADGES.neutral)

// Dynamic status badge
getStatusBadge(entity.status) // Returns appropriate badge classes
```

---

## Related Documentation

- [Configuration Guide](./CONFIGURATION.md)
- [Design System](./DESIGN_SYSTEM.md)
- [Environment Variables](#environment-variables)

---

<p align="center">
  <strong>Configuration Reference</strong><br>
  Complete configuration options
</p>
