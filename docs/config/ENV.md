# Environment Configuration

Type-safe environment variable management with runtime validation using Zod schemas.

**Locations**:
- `/home/user/enzyme/src/config/env.ts` - Environment configuration
- `/home/user/enzyme/src/config/env.schema.ts` - Zod validation schema

## Table of Contents

- [Overview](#overview)
- [Environment Variables](#environment-variables)
- [Validation](#validation)
- [Usage](#usage)
- [Environment-Specific Setup](#environment-specific-setup)
- [Best Practices](#best-practices)

## Overview

The environment configuration system provides:

- **Type Safety**: Full TypeScript typing for all environment variables
- **Runtime Validation**: Zod schema validation with detailed error messages
- **Default Values**: Sensible defaults for optional variables
- **Environment Detection**: Helper methods for environment checks
- **Documentation Generation**: Auto-generate `.env.example` files

## Environment Variables

### Core Application

```bash
# Application environment
VITE_APP_ENV=development          # development | staging | production

# Application version (semver)
VITE_APP_VERSION=1.0.0

# Application name
VITE_APP_NAME="Enterprise App"
```

### API Configuration

```bash
# Base URL for API requests
VITE_API_BASE_URL=http://localhost:3001/api

# API request timeout (milliseconds)
VITE_API_TIMEOUT=30000

# Maximum retry attempts for failed requests
VITE_API_RETRY_ATTEMPTS=3
```

### Real-time Communication

```bash
# WebSocket endpoint URL
VITE_WS_URL=ws://localhost:3001/ws

# Server-Sent Events endpoint URL
VITE_SSE_URL=http://localhost:3001/sse
```

### Authentication

```bash
# Storage key prefix for auth tokens
VITE_AUTH_TOKEN_KEY=auth_token

# Token refresh interval (milliseconds)
VITE_AUTH_REFRESH_INTERVAL=300000

# Session timeout (milliseconds)
VITE_SESSION_TIMEOUT=1800000
```

### Feature Flags

```bash
# Enable feature flag system
VITE_FEATURE_FLAGS_ENABLED=true

# Feature flag source (local | remote | launchdarkly)
VITE_FEATURE_FLAGS_SOURCE=local

# Remote feature flags URL (if source is 'remote')
VITE_FEATURE_FLAGS_URL=https://flags.example.com
```

### Monitoring & Analytics

```bash
# Sentry DSN for error reporting
VITE_SENTRY_DSN=https://...

# Enable error reporting to Sentry
VITE_ENABLE_ERROR_REPORTING=false

# Enable analytics tracking
VITE_ENABLE_ANALYTICS=false
```

### Development

```bash
# Enable debug mode (extra logging, dev tools)
VITE_DEBUG_MODE=true
```

## Validation

### Zod Schema

All environment variables are validated using Zod:

```typescript
import { z } from 'zod';

export const envSchema = z.object({
  VITE_APP_ENV: z.enum(['development', 'staging', 'production'])
    .default('development'),

  VITE_APP_VERSION: z.string()
    .regex(/^\d+\.\d+\.\d+(-[\w.]+)?$/, 'Must be valid semver')
    .default('1.0.0'),

  VITE_API_BASE_URL: z.string().url()
    .default('http://localhost:3001/api'),

  VITE_API_TIMEOUT: z.coerce.number().int().positive()
    .default(30000),

  // ... more fields
});
```

### Validation Functions

#### parseEnv

Safe parsing with error handling:

```typescript
import { parseEnv } from '@/config';

const result = parseEnv(import.meta.env);

if (result.success) {
  console.log('Config:', result.data);
} else {
  console.error('Errors:', result.errors);
}
```

#### parseEnvOrThrow

Strict parsing that throws on errors:

```typescript
import { parseEnvOrThrow } from '@/config';

try {
  const config = parseEnvOrThrow(import.meta.env);
  // Use validated config
} catch (error) {
  console.error('Invalid configuration:', error.message);
}
```

#### formatEnvErrors

Format validation errors for display:

```typescript
import { formatEnvErrors } from '@/config';

const result = parseEnv(import.meta.env);

if (!result.success) {
  const errors = formatEnvErrors(result.errors);
  errors.forEach(error => console.error(error));
}
```

### Validation Example

```typescript
// main.tsx
import { parseEnvOrThrow } from '@/config';

// Validate on startup
try {
  const config = parseEnvOrThrow(import.meta.env);
  console.log('Configuration validated successfully');
} catch (error) {
  // Show error UI
  document.body.innerHTML = `
    <div style="padding: 20px; color: red;">
      <h1>Configuration Error</h1>
      <pre>${error.message}</pre>
    </div>
  `;
  throw error;
}
```

## Usage

### Basic Access

```typescript
import { env } from '@/config';

// All properties are fully typed
const apiUrl = env.apiBaseUrl;        // string
const timeout = env.apiTimeout;       // number
const isDev = env.isDev;              // boolean
const environment = env.appEnv;       // 'development' | 'staging' | 'production'
```

### Environment Checks

```typescript
import { env, isEnv, inDev, inProd } from '@/config';

// Direct property checks
if (env.isDev) {
  console.log('Development mode');
}

if (env.isProd) {
  console.log('Production mode');
}

// Function checks
if (isEnv('development')) {
  console.log('Is development');
}

// Callback execution
inDev(() => {
  console.log('Only runs in development');
});

inProd(() => {
  console.log('Only runs in production');
});
```

### Environment-Specific Logic

```typescript
import { env } from '@/config';

const apiConfig = {
  baseUrl: env.apiBaseUrl,
  timeout: env.isDev ? 60000 : env.apiTimeout,
  retries: env.isProd ? 3 : 0,
  cache: env.isProd
};

const loggingConfig = {
  level: env.isDev ? 'debug' : 'error',
  console: env.isDev,
  sentry: env.isProd && env.enableErrorReporting
};
```

### Type Definitions

```typescript
interface EnvConfig {
  // API Configuration
  readonly apiBaseUrl: string;
  readonly apiTimeout: number;
  readonly apiRetryCount: number;

  // Feature Flags
  readonly featureFlagsEnabled: boolean;
  readonly featureFlagsSource: 'local' | 'remote' | 'launchdarkly';

  // Environment
  readonly appEnv: 'development' | 'staging' | 'production';
  readonly appVersion: string;
  readonly appName: string;

  // Computed flags
  readonly isDev: boolean;
  readonly isProd: boolean;
  readonly isStaging: boolean;
  readonly isTest: boolean;
}
```

## Environment-Specific Setup

### Development (.env.development)

```bash
# Core
VITE_APP_ENV=development
VITE_APP_VERSION=1.0.0-dev
VITE_APP_NAME="Dev Environment"

# API
VITE_API_BASE_URL=http://localhost:3001/api
VITE_API_TIMEOUT=60000

# WebSocket
VITE_WS_URL=ws://localhost:3001/ws
VITE_SSE_URL=http://localhost:3001/sse

# Feature Flags
VITE_FEATURE_FLAGS_ENABLED=true
VITE_FEATURE_FLAGS_SOURCE=local

# Debug
VITE_DEBUG_MODE=true

# Monitoring (disabled in dev)
VITE_ENABLE_ERROR_REPORTING=false
VITE_ENABLE_ANALYTICS=false
```

### Staging (.env.staging)

```bash
# Core
VITE_APP_ENV=staging
VITE_APP_VERSION=1.0.0-rc.1
VITE_APP_NAME="Staging Environment"

# API
VITE_API_BASE_URL=https://staging-api.example.com
VITE_API_TIMEOUT=30000
VITE_API_RETRY_ATTEMPTS=3

# WebSocket
VITE_WS_URL=wss://staging-ws.example.com
VITE_SSE_URL=https://staging-sse.example.com

# Feature Flags
VITE_FEATURE_FLAGS_ENABLED=true
VITE_FEATURE_FLAGS_SOURCE=remote
VITE_FEATURE_FLAGS_URL=https://staging-flags.example.com

# Monitoring
VITE_SENTRY_DSN=https://...@sentry.io/staging
VITE_ENABLE_ERROR_REPORTING=true
VITE_ENABLE_ANALYTICS=true

# Debug
VITE_DEBUG_MODE=false
```

### Production (.env.production)

```bash
# Core
VITE_APP_ENV=production
VITE_APP_VERSION=1.0.0
VITE_APP_NAME="Production App"

# API
VITE_API_BASE_URL=https://api.example.com
VITE_API_TIMEOUT=30000
VITE_API_RETRY_ATTEMPTS=3

# WebSocket
VITE_WS_URL=wss://ws.example.com
VITE_SSE_URL=https://sse.example.com

# Feature Flags
VITE_FEATURE_FLAGS_ENABLED=true
VITE_FEATURE_FLAGS_SOURCE=launchdarkly
VITE_FEATURE_FLAGS_URL=https://flags.launchdarkly.com

# Auth
VITE_AUTH_TOKEN_KEY=prod_auth_token
VITE_AUTH_REFRESH_INTERVAL=300000
VITE_SESSION_TIMEOUT=1800000

# Monitoring
VITE_SENTRY_DSN=https://...@sentry.io/production
VITE_ENABLE_ERROR_REPORTING=true
VITE_ENABLE_ANALYTICS=true

# Debug (disabled in production)
VITE_DEBUG_MODE=false
```

## Best Practices

### 1. Always Validate Early

```typescript
// main.tsx
import { initializeConfig } from '@/config';

// Validate before rendering
initializeConfig();

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
```

### 2. Use Type-Safe Access

```typescript
// Good: Type-safe
import { env } from '@/config';
const url = env.apiBaseUrl;

// Bad: Direct import.meta.env access
const url = import.meta.env.VITE_API_BASE_URL as string;
```

### 3. Provide .env.example

```bash
# Generate documentation
npm run env:generate-docs

# Or programmatically
import { generateEnvDocs } from '@/config';
const docs = generateEnvDocs();
```

### 4. Environment-Specific Defaults

```typescript
const config = {
  timeout: env.isDev ? 60000 : env.apiTimeout,
  logging: env.isDev ? 'debug' : 'error',
  cache: !env.isDev
};
```

### 5. Secret Management

```bash
# Never commit secrets
.env.local        # Gitignored by default
.env.*.local      # Gitignored by default

# Commit templates only
.env.example      # Safe to commit
```

### 6. CI/CD Configuration

```yaml
# GitHub Actions example
- name: Create .env file
  run: |
    echo "VITE_APP_ENV=production" >> .env
    echo "VITE_API_BASE_URL=${{ secrets.API_URL }}" >> .env
    echo "VITE_SENTRY_DSN=${{ secrets.SENTRY_DSN }}" >> .env
```

### 7. Runtime Validation in Tests

```typescript
import { parseEnv } from '@/config';

describe('Environment', () => {
  it('validates test environment', () => {
    const result = parseEnv({
      VITE_APP_ENV: 'test',
      VITE_API_BASE_URL: 'http://test-api'
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid configuration', () => {
    const result = parseEnv({
      VITE_APP_ENV: 'invalid',
      VITE_API_BASE_URL: 'not-a-url'
    });

    expect(result.success).toBe(false);
  });
});
```

## Documentation Generation

### Generate .env.example

```typescript
import { generateEnvDocs } from '@/config';

// Generate complete .env template with comments
const envTemplate = generateEnvDocs();

// Write to file
import fs from 'fs';
fs.writeFileSync('.env.example', envTemplate);
```

### Output Example

```bash
# Environment Configuration
# Generated from env.schema.ts

# =============================================================================
# Core Application
# =============================================================================
VITE_APP_ENV=development          # development | staging | production
VITE_APP_VERSION=1.0.0            # Semantic version
VITE_APP_NAME="Enterprise App"    # Application display name

# =============================================================================
# API Configuration
# =============================================================================
VITE_API_BASE_URL=http://localhost:3001/api
VITE_API_TIMEOUT=30000            # Request timeout in ms
VITE_API_RETRY_ATTEMPTS=3         # Max retry attempts

# ... more sections
```

## Helper Functions

### isDevelopment

```typescript
import { isDevelopment } from '@/config';

const config = { /* ... */ };

if (isDevelopment(config)) {
  console.log('Running in development');
}
```

### isProduction

```typescript
import { isProduction } from '@/config';

if (isProduction(config)) {
  // Initialize production monitoring
}
```

### isDebugMode

```typescript
import { isDebugMode } from '@/config';

if (isDebugMode(config)) {
  // Enable debug features
}
```

## Troubleshooting

### Common Errors

**Error: Missing required environment variable**

```bash
# Solution: Add missing variable to .env
VITE_API_BASE_URL=http://localhost:3001/api
```

**Error: Invalid URL format**

```bash
# Bad
VITE_API_BASE_URL=localhost:3001

# Good
VITE_API_BASE_URL=http://localhost:3001
```

**Error: Invalid semver version**

```bash
# Bad
VITE_APP_VERSION=1.0

# Good
VITE_APP_VERSION=1.0.0
```

### Debug Environment

```typescript
import { env, getConfigSummary } from '@/config';

// Log all environment variables
console.table(env);

// Get diagnostic summary
const summary = getConfigSummary();
console.log(summary);
```

## Related Documentation

### Configuration System
- [README.md](./README.md) - Configuration overview
- [DYNAMIC.md](./DYNAMIC.md) - Dynamic configuration
- [REGISTRY.md](./REGISTRY.md) - Configuration registry
- [HOOKS.md](./HOOKS.md) - Configuration hooks
- [PROVIDERS.md](./PROVIDERS.md) - Configuration providers
- [TYPES.md](./TYPES.md) - TypeScript types

### State Management
- [State System](../state/README.md) - State initialization with env config
- [State Stores](../state/STORES.md) - Environment-aware stores

### API & Auth
- [API Client](../api/README.md) - API configuration from environment
- [API Types](../api/TYPES.md) - API environment types
- [Auth System](../auth/README.md) - Auth environment configuration
- [Auth Service](../auth/AUTH_SERVICE.md) - Auth service configuration
