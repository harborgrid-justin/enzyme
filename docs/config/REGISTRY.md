# Configuration Registry

Central configuration storage, discovery, and validation system.

**Locations**:
- `/home/user/enzyme/src/config/config-registry.ts` - Configuration registry
- `/home/user/enzyme/src/config/config-discovery.ts` - Auto-discovery
- `/home/user/enzyme/src/config/config-validation.ts` - Validation schemas

## Table of Contents

- [ConfigRegistry](#configregistry)
- [Configuration Discovery](#configuration-discovery)
- [Configuration Validation](#configuration-validation)
- [Usage Patterns](#usage-patterns)
- [Best Practices](#best-practices)

## ConfigRegistry

Central store for all configuration values with namespace organization.

### Basic Usage

```typescript
import { getConfigRegistry } from '@/config';

const registry = getConfigRegistry();

// Set configuration
registry.set('app', 'theme', 'dark');
registry.set('ui', 'language', 'en');

// Get configuration
const theme = registry.get('app', 'theme');
const language = registry.get('ui', 'language');

// Get with default
const fontSize = registry.get('ui', 'fontSize', 14);
```

### Namespaces

Configuration is organized by namespaces:

```typescript
const CONFIG_NAMESPACES = {
  APP: 'app',              // Application settings
  API: 'api',              // API configuration
  UI: 'ui',                // UI preferences
  FEATURES: 'features',    // Feature toggles
  PERFORMANCE: 'performance',
  SECURITY: 'security',
  STREAMING: 'streaming',
  HYDRATION: 'hydration',
  LAYOUTS: 'layouts',
  VDOM: 'vdom'
} as const;
```

### API Reference

#### set

Set a configuration value:

```typescript
registry.set<T>(
  namespace: ConfigNamespace,
  key: string,
  value: T,
  options?: ConfigSetOptions
): void;

interface ConfigSetOptions {
  /** Configuration source */
  source?: ConfigSource;

  /** Metadata */
  metadata?: ConfigEntryMeta;

  /** Merge strategy for objects */
  merge?: boolean;
}
```

**Example:**

```typescript
registry.set('ui', 'theme', 'dark', {
  source: 'runtime',
  metadata: {
    updatedBy: 'user-123',
    updatedAt: new Date().toISOString()
  }
});
```

#### get

Get a configuration value:

```typescript
registry.get<T>(
  namespace: ConfigNamespace,
  key: string,
  defaultValue?: T
): T | undefined;
```

**Example:**

```typescript
const theme = registry.get<string>('ui', 'theme', 'light');
const settings = registry.get<UiSettings>('ui', 'settings');
```

#### getNamespace

Get all configuration in a namespace:

```typescript
registry.getNamespace(namespace: ConfigNamespace): ConfigRecord;
```

**Example:**

```typescript
const allUiConfig = registry.getNamespace('ui');
// { theme: 'dark', language: 'en', fontSize: 14 }
```

#### has

Check if configuration exists:

```typescript
registry.has(namespace: ConfigNamespace, key: string): boolean;
```

**Example:**

```typescript
if (registry.has('features', 'newDashboard')) {
  // Feature config exists
}
```

#### delete

Delete a configuration value:

```typescript
registry.delete(namespace: ConfigNamespace, key: string): boolean;
```

#### subscribe

Subscribe to configuration changes:

```typescript
registry.subscribe(
  namespace: ConfigNamespace,
  key: string,
  listener: ConfigChangeListener
): ConfigUnsubscribe;

type ConfigChangeListener = (event: ConfigChangeEvent) => void;

interface ConfigChangeEvent {
  namespace: ConfigNamespace;
  key: string;
  oldValue?: ConfigValue;
  newValue?: ConfigValue;
  source: ConfigSource;
  timestamp: string;
}
```

**Example:**

```typescript
const unsubscribe = registry.subscribe('ui', 'theme', (event) => {
  console.log('Theme changed from', event.oldValue, 'to', event.newValue);
});

// Later: cleanup
unsubscribe();
```

#### export

Export all configuration:

```typescript
registry.export(): Record<ConfigNamespace, ConfigRecord>;
```

**Example:**

```typescript
const allConfig = registry.export();
console.log(JSON.stringify(allConfig, null, 2));
```

#### import

Import configuration:

```typescript
registry.import(config: Record<ConfigNamespace, ConfigRecord>): void;
```

**Example:**

```typescript
registry.import({
  app: { theme: 'dark', version: '1.0.0' },
  ui: { language: 'en' }
});
```

#### clear

Clear a namespace or all configuration:

```typescript
// Clear specific namespace
registry.clear('ui');

// Clear all
registry.clear();
```

### Typed Namespace Access

Create type-safe namespace accessors:

```typescript
import { createTypedNamespace } from '@/config';

interface UiConfig {
  theme: 'light' | 'dark';
  language: string;
  fontSize: number;
}

const uiConfig = createTypedNamespace<UiConfig>('ui');

// Fully typed access
uiConfig.set('theme', 'dark');
const theme = uiConfig.get('theme'); // Type: 'light' | 'dark'
```

### Configuration Sources

Values can come from different sources:

```typescript
type ConfigSource =
  | 'default'      // Hard-coded defaults
  | 'environment'  // Environment variables
  | 'static'       // Static config files
  | 'remote'       // Remote API
  | 'runtime'      // Runtime updates
  | 'override';    // Developer overrides
```

Priority (highest to lowest):
1. override
2. runtime
3. remote
4. static
5. environment
6. default

## Configuration Discovery

Automatic discovery and registration of configuration modules.

### Auto-Discovery

```typescript
import { getConfigDiscovery, initializeConfigDiscovery } from '@/config';

const discovery = getConfigDiscovery();

// Initialize with default patterns
await initializeConfigDiscovery();

// Or with custom patterns
await initializeConfigDiscovery({
  patterns: ['**/*.config.ts', '**/*.config.js'],
  exclude: ['**/node_modules/**', '**/*.test.ts']
});
```

### Register Modules

```typescript
import { registerConfigModule } from '@/config';

// Register a configuration module
registerConfigModule({
  namespace: 'myFeature',
  config: {
    enabled: true,
    settings: {
      timeout: 5000,
      retries: 3
    }
  },
  schema: myFeatureSchema,
  metadata: {
    version: '1.0.0',
    author: 'team@example.com'
  }
});
```

### Plugin Configuration

```typescript
import { registerPluginConfig, getPluginConfig } from '@/config';

// Register plugin
registerPluginConfig({
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  config: {
    enabled: true,
    apiKey: process.env.PLUGIN_API_KEY
  }
});

// Get plugin config
const pluginConfig = getPluginConfig('my-plugin');
```

### Feature Configuration

```typescript
import { registerFeatureConfig, isFeatureEnabled } from '@/config';

// Register feature
registerFeatureConfig({
  key: 'advanced-editor',
  enabled: true,
  config: {
    spellCheck: true,
    autoSave: true,
    saveInterval: 30000
  }
});

// Check if enabled
if (isFeatureEnabled('advanced-editor')) {
  // Enable feature
}
```

### Environment-Based Loading

```typescript
import { loadEnvironmentConfig } from '@/config';

// Load environment-specific config
const config = await loadEnvironmentConfig('production');

// Automatically selects:
// - config.production.ts
// - config.production.json
// etc.
```

## Configuration Validation

Type-safe validation using Zod schemas.

### Schema Definitions

```typescript
import { z } from 'zod';
import { createConfigSchema } from '@/config';

// Define schema
const uiConfigSchema = createConfigSchema({
  theme: z.enum(['light', 'dark']).default('light'),
  language: z.string().min(2).max(5).default('en'),
  fontSize: z.number().min(8).max(72).default(14),
  animations: z.boolean().default(true)
});

// Export type
type UiConfig = z.infer<typeof uiConfigSchema>;
```

### Validation

```typescript
import { validateConfigSchema, validateConfigOrThrow } from '@/config';

// Safe validation
const result = validateConfigSchema(config, uiConfigSchema);

if (!result.success) {
  console.error('Validation errors:', result.errors);
} else {
  // Use validated config
  const validatedConfig = result.data;
}

// Strict validation (throws on error)
const validatedConfig = validateConfigOrThrow(config, uiConfigSchema);
```

### Pre-built Schemas

The system includes pre-built schemas for common configurations:

```typescript
import {
  STREAMING_CONFIG_SCHEMA,
  HYDRATION_CONFIG_SCHEMA,
  LAYOUTS_CONFIG_SCHEMA,
  VDOM_CONFIG_SCHEMA,
  PERFORMANCE_CONFIG_SCHEMA,
  SECURITY_CONFIG_SCHEMA,
  MASTER_CONFIG_SCHEMA
} from '@/config';

// Validate streaming config
const streamingConfig = validateConfigSchema(
  config.streaming,
  STREAMING_CONFIG_SCHEMA
);
```

### Error Formatting

```typescript
import { formatValidationErrors, formatValidationWarnings } from '@/config';

const result = validateConfigSchema(config, schema);

if (!result.success) {
  // Format errors for display
  const errors = formatValidationErrors(result.errors);
  errors.forEach(error => console.error(error));

  // Format warnings
  const warnings = formatValidationWarnings(result.warnings);
  warnings.forEach(warning => console.warn(warning));
}
```

### Schema Documentation

Generate documentation from schemas:

```typescript
import { generateSchemaDocumentation } from '@/config';

const docs = generateSchemaDocumentation(uiConfigSchema);

console.log(docs);
// Output:
// ## UiConfig
//
// - theme: 'light' | 'dark' (default: 'light')
// - language: string (default: 'en')
// - fontSize: number (default: 14)
// - animations: boolean (default: true)
```

## Usage Patterns

### Centralized Configuration

```typescript
// config/index.ts
import { getConfigRegistry } from '@/config';

const registry = getConfigRegistry();

// Initialize all configuration
export function initializeAppConfig() {
  // App config
  registry.set('app', 'name', 'My App');
  registry.set('app', 'version', '1.0.0');

  // UI config
  registry.set('ui', 'theme', 'light');
  registry.set('ui', 'language', 'en');

  // Feature flags
  registry.set('features', 'betaAccess', false);
  registry.set('features', 'advancedEditor', true);
}
```

### Module-Based Configuration

```typescript
// features/analytics/config.ts
import { registerConfigModule } from '@/config';

export function registerAnalyticsConfig() {
  registerConfigModule({
    namespace: 'analytics',
    config: {
      enabled: true,
      trackingId: process.env.ANALYTICS_ID,
      sampleRate: 1.0,
      anonymize: true
    },
    schema: analyticsConfigSchema
  });
}
```

### Environment-Aware Configuration

```typescript
import { env } from '@/config';
import { getConfigRegistry } from '@/config';

const registry = getConfigRegistry();

// Set environment-specific values
if (env.isDev) {
  registry.set('api', 'timeout', 60000);
  registry.set('features', 'debugPanel', true);
} else if (env.isProd) {
  registry.set('api', 'timeout', 30000);
  registry.set('features', 'debugPanel', false);
}
```

### Configuration Migrations

```typescript
interface ConfigMigration {
  version: string;
  up: (config: ConfigRecord) => ConfigRecord;
  down: (config: ConfigRecord) => ConfigRecord;
}

const migrations: ConfigMigration[] = [
  {
    version: '2.0.0',
    up: (config) => ({
      ...config,
      newField: 'default-value'
    }),
    down: (config) => {
      const { newField, ...rest } = config;
      return rest;
    }
  }
];

// Apply migrations
function migrateConfig(config: ConfigRecord, targetVersion: string) {
  let current = config;

  for (const migration of migrations) {
    if (shouldApply(migration.version, targetVersion)) {
      current = migration.up(current);
    }
  }

  return current;
}
```

## Best Practices

### 1. Use Namespaces

```typescript
// Good: Organized by namespace
registry.set('ui', 'theme', 'dark');
registry.set('ui', 'language', 'en');

// Bad: Flat structure
registry.set('global', 'uiTheme', 'dark');
```

### 2. Validate Configuration

```typescript
// Always validate external configuration
const result = validateConfigSchema(externalConfig, schema);

if (!result.success) {
  // Handle validation errors
}
```

### 3. Subscribe to Changes

```typescript
// React to configuration changes
registry.subscribe('ui', 'theme', (event) => {
  applyTheme(event.newValue);
});
```

### 4. Export for Debugging

```typescript
// Export all config for debugging
if (env.isDev) {
  console.log('Config:', registry.export());
}
```

### 5. Use Typed Accessors

```typescript
// Create type-safe accessors
const uiConfig = createTypedNamespace<UiConfig>('ui');

// Fully typed
uiConfig.set('theme', 'dark'); // ✓
uiConfig.set('theme', 'blue'); // ✗ Type error
```

### 6. Document Schemas

```typescript
// Generate documentation
const docs = generateSchemaDocumentation(configSchema);

// Save to file
fs.writeFileSync('CONFIG.md', docs);
```

## Testing

### Mock Registry

```typescript
import { vi } from 'vitest';

vi.mock('@/config', () => ({
  getConfigRegistry: () => ({
    get: vi.fn().mockReturnValue('mock-value'),
    set: vi.fn(),
    subscribe: vi.fn()
  })
}));
```

### Test Configuration

```typescript
import { getConfigRegistry } from '@/config';

describe('ConfigRegistry', () => {
  let registry: ConfigRegistry;

  beforeEach(() => {
    registry = getConfigRegistry();
    registry.clear();
  });

  it('stores and retrieves values', () => {
    registry.set('test', 'key', 'value');
    expect(registry.get('test', 'key')).toBe('value');
  });

  it('emits change events', () => {
    const listener = vi.fn();
    registry.subscribe('test', 'key', listener);

    registry.set('test', 'key', 'new-value');

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        newValue: 'new-value'
      })
    );
  });
});
```

## See Also

- [README.md](./README.md) - Configuration overview
- [ENV.md](./ENV.md) - Environment configuration
- [DYNAMIC.md](./DYNAMIC.md) - Dynamic configuration
- [TYPES.md](./TYPES.md) - TypeScript types
- [HOOKS.md](./HOOKS.md) - Configuration hooks
