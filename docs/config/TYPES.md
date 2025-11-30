# Configuration Types

Complete TypeScript type definitions for the configuration system in @missionfabric-js/enzyme.

**Location**: `/home/user/enzyme/src/config/types.ts`

## Table of Contents

- [Core Types](#core-types)
- [Namespace Types](#namespace-types)
- [Dynamic Configuration Types](#dynamic-configuration-types)
- [Validation Types](#validation-types)
- [Utility Types](#utility-types)
- [Type Guards](#type-guards)

## Core Types

### ConfigValue

Base type for configuration values:

```typescript
type ConfigValue =
  | string
  | number
  | boolean
  | null
  | ConfigValue[]
  | { [key: string]: ConfigValue };
```

**Usage:**

```typescript
const stringValue: ConfigValue = 'dark';
const numberValue: ConfigValue = 42;
const objectValue: ConfigValue = { theme: 'dark', fontSize: 14 };
const arrayValue: ConfigValue = ['en', 'es', 'fr'];
```

### ConfigRecord

Key-value configuration object:

```typescript
type ConfigRecord = Record<string, ConfigValue>;
```

**Usage:**

```typescript
const uiConfig: ConfigRecord = {
  theme: 'dark',
  language: 'en',
  fontSize: 14,
  animations: true
};
```

### ConfigNamespace

Valid configuration namespace:

```typescript
type ConfigNamespace =
  | 'app'
  | 'api'
  | 'ui'
  | 'features'
  | 'performance'
  | 'security'
  | 'streaming'
  | 'hydration'
  | 'layouts'
  | 'vdom';
```

**Usage:**

```typescript
const namespace: ConfigNamespace = 'ui';
registry.set(namespace, 'theme', 'dark');
```

### ConfigEntry

Configuration entry with metadata:

```typescript
interface ConfigEntry {
  /** Configuration value */
  readonly value: ConfigValue;

  /** Source of the value */
  readonly source: ConfigSource;

  /** Entry metadata */
  readonly metadata?: ConfigEntryMeta;
}

interface ConfigEntryMeta {
  /** When the entry was created */
  readonly createdAt?: string;

  /** When the entry was last updated */
  readonly updatedAt?: string;

  /** Who created the entry */
  readonly createdBy?: string;

  /** Who last updated the entry */
  readonly updatedBy?: string;

  /** Additional metadata */
  readonly tags?: string[];
  readonly description?: string;
}
```

### ConfigSource

Source of configuration value:

```typescript
type ConfigSource =
  | 'default'      // Hard-coded defaults
  | 'environment'  // Environment variables
  | 'static'       // Static config files
  | 'remote'       // Remote API
  | 'runtime'      // Runtime updates
  | 'override';    // Developer overrides
```

**Usage:**

```typescript
registry.set('ui', 'theme', 'dark', {
  source: 'runtime',
  metadata: {
    updatedBy: 'user-123',
    updatedAt: new Date().toISOString()
  }
});
```

### ConfigEnvironment

Application environment:

```typescript
type ConfigEnvironment =
  | 'development'
  | 'staging'
  | 'production'
  | 'test';
```

## Namespace Types

### Create Namespace

Helper to create typed namespace:

```typescript
function createNamespace<T extends ConfigRecord>(
  namespace: ConfigNamespace
): TypedNamespaceAccessor<T>;

interface TypedNamespaceAccessor<T extends ConfigRecord> {
  get<K extends keyof T>(key: K): T[K] | undefined;
  set<K extends keyof T>(key: K, value: T[K]): void;
  getAll(): T;
  subscribe<K extends keyof T>(
    key: K,
    listener: (value: T[K]) => void
  ): () => void;
}
```

**Usage:**

```typescript
interface UiConfig {
  theme: 'light' | 'dark';
  language: string;
  fontSize: number;
}

const uiNamespace = createNamespace<UiConfig>('ui');

// Fully typed
uiNamespace.set('theme', 'dark'); // ✓
uiNamespace.set('theme', 'blue'); // ✗ Type error

const theme = uiNamespace.get('theme'); // Type: 'light' | 'dark'
```

## Dynamic Configuration Types

### DynamicConfigOptions

Options for dynamic configuration manager:

```typescript
interface DynamicConfigOptions {
  /** Polling interval in milliseconds */
  readonly pollingInterval?: number;

  /** Enable WebSocket for real-time updates */
  readonly enableWebSocket?: boolean;

  /** Cache duration in milliseconds */
  readonly cacheDuration?: number;

  /** Retry configuration */
  readonly retry?: {
    readonly maxAttempts: number;
    readonly baseDelay: number;
    readonly maxDelay: number;
  };

  /** Fallback strategy on error */
  readonly fallback?: 'cache' | 'default' | 'throw';
}
```

### DynamicConfigState

Current state of dynamic configuration:

```typescript
interface DynamicConfigState {
  /** Whether config is initialized */
  readonly initialized: boolean;

  /** Whether currently syncing */
  readonly syncing: boolean;

  /** Last successful sync timestamp */
  readonly lastSyncedAt?: string;

  /** Last sync error */
  readonly lastError?: ConfigSyncError;

  /** Connection status */
  readonly connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'error';
}

interface ConfigSyncError {
  readonly message: string;
  readonly code: string;
  readonly timestamp: string;
  readonly retryCount: number;
}
```

### FeatureFlagConfig

Feature flag configuration:

```typescript
interface FeatureFlagConfig {
  /** Unique flag key */
  readonly key: string;

  /** Default value */
  readonly defaultValue: boolean;

  /** Display name */
  readonly name?: string;

  /** Description */
  readonly description?: string;

  /** Target environments */
  readonly environments?: ConfigEnvironment[];

  /** Minimum required role */
  readonly minRole?: string;

  /** Rollout percentage (0-100) */
  readonly rolloutPercentage?: number;

  /** Expiration date */
  readonly expiresAt?: string;

  /** Variant identifier */
  readonly variant?: string;

  /** Additional metadata */
  readonly metadata?: Record<string, unknown>;
}
```

### FeatureFlagContext

Context for flag evaluation:

```typescript
interface FeatureFlagContext {
  /** Current environment */
  readonly environment: ConfigEnvironment;

  /** User ID for consistent bucketing */
  readonly userId?: string;

  /** Session ID fallback */
  readonly sessionId?: string;

  /** User role for targeting */
  readonly userRole?: string;

  /** Custom attributes for rules */
  readonly customAttributes?: Record<string, JsonValue>;
}
```

### FeatureFlagResult

Result of flag evaluation:

```typescript
interface FeatureFlagResult {
  /** Flag key */
  readonly key: string;

  /** Evaluated value */
  readonly value: boolean;

  /** Evaluation reason */
  readonly reason: FeatureFlagReason;

  /** Variant identifier */
  readonly variant?: string;
}

type FeatureFlagReason =
  | 'DEFAULT'
  | 'ROLLOUT'
  | 'OVERRIDE'
  | 'EXPIRED'
  | 'TARGETING';
```

### ABTestConfig

A/B test configuration:

```typescript
interface ABTestConfig {
  /** Unique test ID */
  readonly id: string;

  /** Display name */
  readonly name: string;

  /** Test status */
  readonly status: 'draft' | 'running' | 'paused' | 'completed';

  /** Test variants */
  readonly variants: ABTestVariant[];

  /** Traffic allocation percentage */
  readonly allocation: Record<string, number>;

  /** Start date */
  readonly startDate?: string;

  /** End date */
  readonly endDate?: string;

  /** Target environments */
  readonly environments?: ConfigEnvironment[];
}

interface ABTestVariant {
  /** Variant ID */
  readonly id: string;

  /** Display name */
  readonly name: string;

  /** Is control group */
  readonly isControl?: boolean;

  /** Variant configuration */
  readonly config?: ConfigRecord;
}
```

## Validation Types

### ConfigSchema

Zod schema for configuration:

```typescript
type ConfigSchema<T = unknown> = z.ZodSchema<T>;
```

### ConfigMigration

Configuration migration:

```typescript
interface ConfigMigration {
  /** Migration version */
  readonly version: string;

  /** Upgrade function */
  readonly up: (config: ConfigRecord) => ConfigRecord;

  /** Downgrade function */
  readonly down: (config: ConfigRecord) => ConfigRecord;

  /** Description */
  readonly description?: string;
}

interface MigrationResult {
  /** Whether migration succeeded */
  readonly success: boolean;

  /** Migrated configuration */
  readonly config?: ConfigRecord;

  /** Migration errors */
  readonly errors?: string[];
}
```

## Utility Types

### DeepPartial

Make all properties optional recursively:

```typescript
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
```

**Usage:**

```typescript
interface Config {
  app: {
    name: string;
    version: string;
  };
  ui: {
    theme: string;
  };
}

// All properties optional
const partial: DeepPartial<Config> = {
  app: {
    name: 'MyApp'
    // version is optional
  }
};
```

### DeepReadonly

Make all properties readonly recursively:

```typescript
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object
    ? DeepReadonly<T[P]>
    : T[P];
};
```

**Usage:**

```typescript
const config: DeepReadonly<Config> = {
  app: { name: 'MyApp', version: '1.0.0' },
  ui: { theme: 'dark' }
};

// Error: Cannot assign to 'name' because it is a read-only property
config.app.name = 'NewApp';
```

### DeepRequired

Make all properties required recursively:

```typescript
type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object
    ? DeepRequired<T[P]>
    : T[P];
};
```

**Usage:**

```typescript
interface PartialConfig {
  app?: {
    name?: string;
  };
}

// All properties required
const config: DeepRequired<PartialConfig> = {
  app: {
    name: 'MyApp' // Required
  }
};
```

## Type Guards

### isConfigValue

Check if value is valid ConfigValue:

```typescript
function isConfigValue(value: unknown): value is ConfigValue {
  if (value === null) return true;
  if (typeof value === 'string') return true;
  if (typeof value === 'number') return true;
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) {
    return value.every(isConfigValue);
  }
  if (typeof value === 'object') {
    return Object.values(value).every(isConfigValue);
  }
  return false;
}
```

**Usage:**

```typescript
const value: unknown = getUserInput();

if (isConfigValue(value)) {
  registry.set('app', 'setting', value);
}
```

### isConfigNamespace

Check if string is valid namespace:

```typescript
function isConfigNamespace(value: string): value is ConfigNamespace {
  const validNamespaces: ConfigNamespace[] = [
    'app', 'api', 'ui', 'features',
    'performance', 'security', 'streaming',
    'hydration', 'layouts', 'vdom'
  ];
  return validNamespaces.includes(value as ConfigNamespace);
}
```

### isConfigSource

Check if string is valid source:

```typescript
function isConfigSource(value: string): value is ConfigSource {
  const validSources: ConfigSource[] = [
    'default', 'environment', 'static',
    'remote', 'runtime', 'override'
  ];
  return validSources.includes(value as ConfigSource);
}
```

## Event Types

### ConfigChangeEvent

Configuration change event:

```typescript
interface ConfigChangeEvent {
  /** Namespace of changed config */
  readonly namespace: ConfigNamespace;

  /** Key that changed */
  readonly key: string;

  /** Previous value */
  readonly oldValue?: ConfigValue;

  /** New value */
  readonly newValue?: ConfigValue;

  /** Source of change */
  readonly source: ConfigSource;

  /** Timestamp of change */
  readonly timestamp: string;

  /** Additional metadata */
  readonly metadata?: Record<string, unknown>;
}
```

### ConfigChangeListener

Listener for configuration changes:

```typescript
type ConfigChangeListener = (event: ConfigChangeEvent) => void;

type ConfigUnsubscribe = () => void;
```

**Usage:**

```typescript
const unsubscribe: ConfigUnsubscribe = registry.subscribe(
  'ui',
  'theme',
  (event: ConfigChangeEvent) => {
    console.log(`Theme changed from ${event.oldValue} to ${event.newValue}`);
  }
);

// Later: cleanup
unsubscribe();
```

## Advanced Types

### Branded Types

Create branded types for additional type safety:

```typescript
type Brand<T, B> = T & { __brand: B };

type ConfigKey = Brand<string, 'ConfigKey'>;
type FlagKey = Brand<string, 'FlagKey'>;

function createConfigKey(key: string): ConfigKey {
  return key as ConfigKey;
}

// Usage
const key = createConfigKey('theme');
registry.set('ui', key, 'dark');
```

### Constrained Types

Constrained configuration types:

```typescript
type ThemeConfig = {
  theme: 'light' | 'dark' | 'auto';
  primaryColor: `#${string}`;
  fontSize: number & { __min: 8; __max: 72 };
};

// Validation
function isValidThemeConfig(config: unknown): config is ThemeConfig {
  // Validation logic
  return true;
}
```

## Type Inference

### Infer from Schema

```typescript
import { z } from 'zod';

const configSchema = z.object({
  theme: z.enum(['light', 'dark']),
  fontSize: z.number().min(8).max(72)
});

// Infer type from schema
type ConfigType = z.infer<typeof configSchema>;
// { theme: 'light' | 'dark'; fontSize: number }
```

### Infer from Provider

```typescript
function createConfigProvider<T extends ConfigRecord>() {
  return {
    get<K extends keyof T>(key: K): T[K] | undefined {
      // Implementation
    },
    set<K extends keyof T>(key: K, value: T[K]): void {
      // Implementation
    }
  };
}

interface MyConfig {
  theme: string;
  language: string;
}

const provider = createConfigProvider<MyConfig>();

// Fully typed
provider.set('theme', 'dark'); // ✓
provider.set('invalid', 'value'); // ✗ Type error
```

## Best Practices

### 1. Use Strict Types

```typescript
// Good: Strict enum
type Theme = 'light' | 'dark';

// Bad: Any string
type Theme = string;
```

### 2. Leverage Type Inference

```typescript
// Good: Let TypeScript infer
const config = {
  theme: 'dark' as const,
  fontSize: 14
};

// Bad: Explicit typing when not needed
const config: { theme: string; fontSize: number } = {
  theme: 'dark',
  fontSize: 14
};
```

### 3. Use Branded Types

```typescript
type UserId = Brand<string, 'UserId'>;
type FlagKey = Brand<string, 'FlagKey'>;

function evaluateFlag(flagKey: FlagKey, userId: UserId) {
  // Type-safe API
}
```

### 4. Document Complex Types

```typescript
/**
 * Configuration for feature flags.
 *
 * @example
 * ```typescript
 * const config: FeatureFlagConfig = {
 *   key: 'new-dashboard',
 *   defaultValue: false,
 *   rolloutPercentage: 25
 * };
 * ```
 */
interface FeatureFlagConfig {
  // ...
}
```

## Related Documentation

### Configuration System
- [README.md](./README.md) - Configuration overview
- [REGISTRY.md](./REGISTRY.md) - Configuration registry
- [DYNAMIC.md](./DYNAMIC.md) - Dynamic configuration
- [ENV.md](./ENV.md) - Environment configuration
- [HOOKS.md](./HOOKS.md) - Configuration hooks
- [PROVIDERS.md](./PROVIDERS.md) - Configuration providers

### Type Systems
- [State Types](../state/TYPES.md) - State type definitions
- [API Types](../api/TYPES.md) - API type definitions
- [Auth Types](../auth/TYPES.md) - Authentication types

### Integration
- [State System](../state/README.md) - State type integration
- [API Client](../api/README.md) - API type usage
- [Auth System](../auth/README.md) - Auth type patterns
