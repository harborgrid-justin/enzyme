# Configuration System Overview

Comprehensive configuration management system for @missionfabric-js/enzyme with type-safe environment variables, dynamic configuration, and runtime validation.

## Table of Contents

- [Architecture](#architecture)
- [Configuration Layers](#configuration-layers)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Environment Setup](#environment-setup)
- [Best Practices](#best-practices)
- [Related Documentation](#related-documentation)

## Architecture

The configuration system is built on multiple layers providing flexibility and type safety:

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  (React Hooks, Components, Context)                         │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────┐
│                  Dynamic Config Layer                        │
│  (Runtime Updates, Feature Flags, A/B Tests)                │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────┐
│                   Registry Layer                             │
│  (Config Storage, Discovery, Validation)                    │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────┐
│                  Environment Layer                           │
│  (Static Config, .env Variables, Validation)                │
└─────────────────────────────────────────────────────────────┘
```

### Key Modules

- **Environment** (`/config/env.ts`, `env.schema.ts`): Static environment variables
- **Registry** (`/config/config-registry.ts`): Central configuration store
- **Dynamic** (`/config/dynamic-config.ts`): Runtime configuration updates
- **Discovery** (`/config/config-discovery.ts`): Auto-discovery and module loading
- **Validation** (`/config/config-validation.ts`): Type-safe validation with Zod
- **Providers** (`/config/ConfigProvider.tsx`): React context providers
- **Hooks** (`/config/hooks/`): React hooks for configuration access

## Configuration Layers

### 1. Static Environment (.env)

Compile-time configuration from environment variables:

```bash
# .env
VITE_APP_ENV=development
VITE_API_BASE_URL=http://localhost:3001/api
VITE_FEATURE_FLAGS_ENABLED=true
```

### 2. Validated Configuration

Type-safe, validated configuration:

```typescript
import { env } from '@/config';

// Fully typed and validated
console.log(env.apiBaseUrl);    // string
console.log(env.apiTimeout);    // number
console.log(env.isDev);         // boolean
```

### 3. Dynamic Configuration

Runtime-updatable configuration:

```typescript
import { getDynamicConfig } from '@/config';

const config = getDynamicConfig();
await config.initialize();

// Subscribe to changes
config.subscribeToConfig('features', 'newFeature', (event) => {
  console.log('Config changed:', event);
});
```

### 4. Registry Configuration

Namespaced configuration storage:

```typescript
import { getConfigRegistry } from '@/config';

const registry = getConfigRegistry();

// Set config
registry.set('app', 'theme', 'dark');

// Get config
const theme = registry.get('app', 'theme');
```

## Quick Start

### 1. Environment Setup

Create `.env` file:

```bash
# Core Application
VITE_APP_ENV=development
VITE_APP_VERSION=1.0.0
VITE_APP_NAME="My App"

# API Configuration
VITE_API_BASE_URL=http://localhost:3001/api
VITE_API_TIMEOUT=30000

# Feature Flags
VITE_FEATURE_FLAGS_ENABLED=true
VITE_FEATURE_FLAGS_SOURCE=local
```

### 2. Initialize Configuration

```typescript
// main.tsx
import { initializeConfig } from '@/config';

// Validate config on startup
initializeConfig();

// Then render app
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
```

### 3. Use Configuration

```tsx
import { env } from '@/config';
import { useConfig } from '@/config/hooks';

function MyComponent() {
  // Static config
  const apiUrl = env.apiBaseUrl;

  // Dynamic config with hook
  const [theme, setTheme] = useConfig('app', 'theme', 'light');

  return (
    <div className={theme}>
      API: {apiUrl}
    </div>
  );
}
```

### 4. Use Provider

```tsx
import { ConfigProvider } from '@/config';

function App() {
  return (
    <ConfigProvider
      config={{
        app: { theme: 'dark', language: 'en' },
        features: { beta: true }
      }}
    >
      <YourApp />
    </ConfigProvider>
  );
}
```

## Core Concepts

### Namespaces

Configuration is organized into namespaces:

```typescript
const CONFIG_NAMESPACES = {
  APP: 'app',           // App-level settings
  API: 'api',           // API configuration
  UI: 'ui',             // UI preferences
  FEATURES: 'features', // Feature toggles
  PERFORMANCE: 'performance',
  SECURITY: 'security',
  STREAMING: 'streaming',
  HYDRATION: 'hydration',
  LAYOUTS: 'layouts',
  VDOM: 'vdom'
} as const;
```

### Configuration Sources

Config values can come from multiple sources:

```typescript
type ConfigSource =
  | 'default'      // Hard-coded defaults
  | 'environment'  // Environment variables
  | 'static'       // Static config files
  | 'remote'       // Remote API
  | 'runtime'      // Runtime updates
  | 'override';    // Developer overrides
```

Priority: `override` > `runtime` > `remote` > `static` > `environment` > `default`

### Configuration Environments

```typescript
type ConfigEnvironment =
  | 'development'
  | 'staging'
  | 'production'
  | 'test';
```

### Type Safety

All configuration is fully typed:

```typescript
import { env } from '@/config';

// TypeScript knows all properties and types
env.apiBaseUrl;        // string
env.apiTimeout;        // number
env.featureFlagsEnabled; // boolean
env.appEnv;            // 'development' | 'staging' | 'production'
```

## Environment Setup

### Development Environment

```bash
# .env.development
VITE_APP_ENV=development
VITE_DEBUG_MODE=true
VITE_LOG_LEVEL=debug
VITE_API_BASE_URL=http://localhost:3001/api
VITE_FEATURE_FLAGS_SOURCE=local
```

### Staging Environment

```bash
# .env.staging
VITE_APP_ENV=staging
VITE_DEBUG_MODE=false
VITE_LOG_LEVEL=info
VITE_API_BASE_URL=https://staging-api.example.com
VITE_FEATURE_FLAGS_SOURCE=remote
VITE_SENTRY_DSN=https://...
```

### Production Environment

```bash
# .env.production
VITE_APP_ENV=production
VITE_DEBUG_MODE=false
VITE_LOG_LEVEL=error
VITE_API_BASE_URL=https://api.example.com
VITE_FEATURE_FLAGS_SOURCE=launchdarkly
VITE_SENTRY_DSN=https://...
VITE_ENABLE_ERROR_REPORTING=true
VITE_ENABLE_ANALYTICS=true
```

### Environment Validation

```typescript
import { parseEnvOrThrow } from '@/config';

// Validates environment variables against schema
const validatedEnv = parseEnvOrThrow(import.meta.env);

// Throws detailed errors if validation fails
```

## Best Practices

### 1. Use Type-Safe Access

```typescript
// Good: Type-safe
import { env } from '@/config';
const apiUrl = env.apiBaseUrl;

// Bad: Direct access
const apiUrl = import.meta.env.VITE_API_BASE_URL;
```

### 2. Validate Early

```typescript
// main.tsx
import { initializeConfig } from '@/config';

try {
  initializeConfig();
} catch (error) {
  console.error('Configuration error:', error);
  // Show error UI
}
```

### 3. Use Namespaces

```typescript
// Good: Organized by namespace
registry.set('ui', 'theme', 'dark');
registry.set('ui', 'language', 'en');

// Bad: Flat structure
registry.set('global', 'uiTheme', 'dark');
registry.set('global', 'uiLanguage', 'en');
```

### 4. Provide Defaults

```typescript
const config = registry.get('app', 'theme', 'light'); // Default: 'light'
```

### 5. Subscribe to Changes

```typescript
useEffect(() => {
  const unsubscribe = registry.subscribe('app', 'theme', (event) => {
    console.log('Theme changed to:', event.newValue);
  });

  return unsubscribe;
}, []);
```

### 6. Use Environment Helpers

```typescript
import { env, inDev, inProd } from '@/config';

inDev(() => {
  console.log('Development only code');
});

if (env.isProd) {
  // Production-only code
}
```

### 7. Document Configuration

```typescript
/**
 * Generate .env documentation
 */
import { generateEnvDocs } from '@/config';

const docs = generateEnvDocs();
console.log(docs);
```

## Configuration Patterns

### Environment-Specific Configuration

```typescript
import { env } from '@/config';

const config = {
  api: {
    baseUrl: env.apiBaseUrl,
    timeout: env.isDev ? 60000 : env.apiTimeout,
    retry: env.isProd ? 3 : 0
  },
  logging: {
    level: env.logLevel,
    enableConsole: env.isDev
  }
};
```

### Feature Flag Integration

```typescript
import { useFeatureFlag } from '@/lib/flags';
import { useConfig } from '@/config/hooks';

function AdaptiveFeature() {
  const flagEnabled = useFeatureFlag('new-feature');
  const [config, setConfig] = useConfig('features', 'newFeature');

  return flagEnabled ? (
    <NewFeature config={config} />
  ) : (
    <OldFeature />
  );
}
```

### Dynamic Configuration Updates

```typescript
import { getDynamicConfig } from '@/config';

const dynamicConfig = getDynamicConfig();

// Initialize with polling
await dynamicConfig.initialize();

// Get current state
const state = dynamicConfig.getState();

// Force refresh
await dynamicConfig.forceRefresh();
```

### Validated Configuration

```typescript
import { validateConfigSchema } from '@/config';
import { z } from 'zod';

const myConfigSchema = z.object({
  feature: z.string(),
  enabled: z.boolean(),
  settings: z.object({
    timeout: z.number().positive()
  })
});

const result = validateConfigSchema(myConfig, myConfigSchema);

if (!result.success) {
  console.error('Validation errors:', result.errors);
}
```

## Testing

### Mock Environment

```typescript
import { vi } from 'vitest';

vi.mock('@/config', () => ({
  env: {
    apiBaseUrl: 'http://test-api',
    isDev: true,
    isProd: false
  }
}));
```

### Test Configuration Provider

```tsx
import { ConfigProvider } from '@/config';

function renderWithConfig(ui, config = {}) {
  return render(
    <ConfigProvider config={config}>
      {ui}
    </ConfigProvider>
  );
}

// Usage
renderWithConfig(<MyComponent />, {
  app: { theme: 'dark' }
});
```

### Validate Test Configs

```typescript
import { parseEnv } from '@/config';

describe('Configuration', () => {
  it('validates test environment', () => {
    const result = parseEnv({
      VITE_APP_ENV: 'test',
      VITE_API_BASE_URL: 'http://test'
    });

    expect(result.success).toBe(true);
  });
});
```

## Performance Considerations

### 1. Memoize Config Access

```tsx
const config = useMemo(() => ({
  api: env.apiBaseUrl,
  timeout: env.apiTimeout
}), []);
```

### 2. Selective Subscriptions

```tsx
// Good: Subscribe to specific key
const theme = useConfigValue('ui', 'theme');

// Bad: Subscribe to entire namespace
const allUiConfig = useConfigNamespace('ui');
```

### 3. Lazy Initialization

```tsx
const dynamicConfig = useMemo(
  () => getDynamicConfig({ pollingInterval: 60000 }),
  []
);
```

## Debugging

### Configuration Summary

```typescript
import { getConfigSummary } from '@/config';

const summary = getConfigSummary();
console.table(summary);
```

### Validation Errors

```typescript
import { validateConfig, formatEnvErrors } from '@/config';

const result = validateConfig();

if (!result.valid) {
  console.error('Configuration errors:');
  result.errors.forEach(error => console.error(`  - ${error}`));
}
```

### Config Inspector

```tsx
import { useAllConfig } from '@/config/hooks';

function ConfigInspector() {
  const allConfig = useAllConfig();

  return (
    <details>
      <summary>Configuration</summary>
      <pre>{JSON.stringify(allConfig, null, 2)}</pre>
    </details>
  );
}
```

## Related Documentation

- [ENV.md](./ENV.md) - Environment configuration and validation
- [DYNAMIC.md](./DYNAMIC.md) - Dynamic configuration and runtime updates
- [REGISTRY.md](./REGISTRY.md) - Configuration registry and discovery
- [HOOKS.md](./HOOKS.md) - Configuration React hooks
- [PROVIDERS.md](./PROVIDERS.md) - Configuration providers
- [TYPES.md](./TYPES.md) - TypeScript types and schemas

## See Also

- `/config/` - Configuration implementation
- `/config/hooks/` - React hooks
- Feature flags documentation (`/docs/flags/`)
