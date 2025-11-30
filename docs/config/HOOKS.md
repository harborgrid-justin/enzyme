# Configuration Hooks

React hooks for accessing and managing configuration in @missionfabric-js/enzyme.

**Location**: `/home/user/enzyme/src/config/hooks/`

## Table of Contents

- [useConfig](#useconfig)
- [useConfigValue](#useconfigvalue)
- [useDynamicConfig](#usedynamicconfig)
- [useConfigValidation](#useconfigvalidation)
- [Usage Patterns](#usage-patterns)
- [Best Practices](#best-practices)

## useConfig

Primary hook for accessing and updating configuration values.

**Location**: `/home/user/enzyme/src/config/hooks/useConfig.ts`

### Basic Usage

```tsx
import { useConfig } from '@/config/hooks';

function ThemeSelector() {
  const [theme, setTheme] = useConfig('ui', 'theme', 'light');

  return (
    <select value={theme} onChange={(e) => setTheme(e.target.value)}>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  );
}
```

### Type Definition

```typescript
function useConfig<T extends ConfigValue>(
  namespace: ConfigNamespace,
  key: string,
  defaultValue?: T,
  options?: UseConfigOptions
): UseConfigResult<T>;

interface UseConfigOptions {
  /** Suspend component while loading */
  suspense?: boolean;

  /** Persist changes to localStorage */
  persist?: boolean;

  /** Validation schema */
  schema?: z.ZodSchema<T>;
}

interface UseConfigResult<T> {
  /** Current value */
  value: T;

  /** Update value */
  setValue: (value: T) => void;

  /** Reset to default */
  reset: () => void;

  /** Loading state */
  isLoading: boolean;

  /** Error state */
  error: Error | null;
}
```

### With Options

```tsx
import { z } from 'zod';

const themeSchema = z.enum(['light', 'dark']);

function ThemeConfig() {
  const config = useConfig('ui', 'theme', 'light', {
    persist: true,
    schema: themeSchema
  });

  return (
    <div>
      <p>Current: {config.value}</p>
      <button onClick={() => config.setValue('dark')}>
        Switch to Dark
      </button>
      <button onClick={config.reset}>
        Reset to Default
      </button>
    </div>
  );
}
```

### useConfigNamespace

Get entire namespace:

```tsx
import { useConfigNamespace } from '@/config/hooks';

function UiSettings() {
  const [uiConfig, setUiConfig] = useConfigNamespace('ui');

  return (
    <div>
      <div>Theme: {uiConfig.theme}</div>
      <div>Language: {uiConfig.language}</div>

      <button
        onClick={() =>
          setUiConfig({ ...uiConfig, theme: 'dark' })
        }
      >
        Update Theme
      </button>
    </div>
  );
}
```

## useConfigValue

Read-only access to configuration values with type safety.

**Location**: `/home/user/enzyme/src/config/hooks/useConfigValue.ts`

### Basic Usage

```tsx
import { useConfigValue } from '@/config/hooks';

function ApiClient() {
  const apiUrl = useConfigValue<string>('api', 'baseUrl');
  const timeout = useConfigValue<number>('api', 'timeout', 30000);

  return <div>API: {apiUrl}</div>;
}
```

### Type Definition

```typescript
function useConfigValue<T extends ConfigValue>(
  namespace: ConfigNamespace,
  key: string,
  defaultValue?: T,
  options?: UseConfigValueOptions
): T | undefined;

interface UseConfigValueOptions {
  /** Subscribe to changes */
  subscribe?: boolean;

  /** Transform value */
  transform?: (value: ConfigValue) => T;
}
```

### Specialized Hooks

#### useConfigBoolean

```tsx
import { useConfigBoolean } from '@/config/hooks';

function FeatureToggle() {
  const isEnabled = useConfigBoolean('features', 'newDashboard', false);

  return isEnabled ? <NewDashboard /> : <OldDashboard />;
}
```

#### useConfigNumber

```tsx
import { useConfigNumber } from '@/config/hooks';

function TimeoutConfig() {
  const timeout = useConfigNumber('api', 'timeout', 30000);

  return <div>Timeout: {timeout}ms</div>;
}
```

#### useConfigString

```tsx
import { useConfigString } from '@/config/hooks';

function LanguageSelector() {
  const language = useConfigString('ui', 'language', 'en');

  return <div>Language: {language}</div>;
}
```

#### useConfigEnum

```tsx
import { useConfigEnum } from '@/config/hooks';

type Theme = 'light' | 'dark' | 'auto';

function ThemeDisplay() {
  const theme = useConfigEnum<Theme>('ui', 'theme', 'auto', {
    validValues: ['light', 'dark', 'auto']
  });

  return <div>Theme: {theme}</div>;
}
```

## useDynamicConfig

Access dynamic configuration with runtime updates.

**Location**: `/home/user/enzyme/src/config/hooks/useDynamicConfig.ts`

### Basic Usage

```tsx
import { useDynamicConfig } from '@/config/hooks';

function DynamicConfigPanel() {
  const config = useDynamicConfig();

  return (
    <div>
      <div>Initialized: {config.initialized ? 'Yes' : 'No'}</div>
      <div>Syncing: {config.syncing ? 'Yes' : 'No'}</div>
      <div>Last Sync: {config.lastSyncedAt}</div>

      <button onClick={config.forceRefresh}>
        Force Refresh
      </button>
    </div>
  );
}
```

### Type Definition

```typescript
interface UseDynamicConfigResult {
  /** Initialization state */
  initialized: boolean;

  /** Sync state */
  syncing: boolean;

  /** Last sync timestamp */
  lastSyncedAt?: string;

  /** Last error */
  lastError?: ConfigSyncError;

  /** Connection status */
  connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'error';

  /** Force refresh */
  forceRefresh: () => Promise<void>;

  /** Stop polling */
  stopPolling: () => void;
}
```

### useFeatureFlag

Dynamic feature flag evaluation:

```tsx
import { useFeatureFlag } from '@/config/hooks';

function BetaFeature() {
  const isEnabled = useFeatureFlag('beta-feature', {
    defaultValue: false,
    context: {
      userId: currentUser.id
    }
  });

  return isEnabled ? <BetaContent /> : null;
}
```

### useFlag

Alias for useFeatureFlag:

```tsx
import { useFlag } from '@/config/hooks';

function Feature() {
  const enabled = useFlag('my-feature');

  return enabled ? <Content /> : null;
}
```

### useFeatureFlags

Get multiple flags:

```tsx
import { useFeatureFlags } from '@/config/hooks';

function Dashboard() {
  const flags = useFeatureFlags([
    'analytics',
    'reports',
    'exports'
  ]);

  return (
    <div>
      {flags.analytics && <Analytics />}
      {flags.reports && <Reports />}
      {flags.exports && <Exports />}
    </div>
  );
}
```

### useABTest

A/B testing support:

```tsx
import { useABTest } from '@/config/hooks';

function CheckoutExperiment() {
  const { variant, config } = useABTest('checkout-test', {
    userId: currentUser.id
  });

  switch (variant?.id) {
    case 'variant-a':
      return <OptimizedCheckout config={config} />;
    case 'variant-b':
      return <ExpressCheckout config={config} />;
    default:
      return <StandardCheckout />;
  }
}
```

### useFeatureFlagOverride

Override flags for testing:

```tsx
import { useFeatureFlagOverride } from '@/config/hooks';

function DebugPanel() {
  const [override, setOverride, clearOverride] = useFeatureFlagOverride('my-feature');

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={override ?? false}
          onChange={(e) => setOverride(e.target.checked)}
        />
        Override Feature
      </label>
      <button onClick={clearOverride}>Clear Override</button>
    </div>
  );
}
```

### useRemoteConfig

Remote configuration sync:

```tsx
import { useRemoteConfig } from '@/config/hooks';

function RemoteConfigStatus() {
  const { syncing, lastSyncedAt, error, sync } = useRemoteConfig();

  return (
    <div>
      <div>Status: {syncing ? 'Syncing...' : 'Ready'}</div>
      <div>Last Sync: {lastSyncedAt}</div>
      {error && <div>Error: {error.message}</div>}
      <button onClick={sync}>Sync Now</button>
    </div>
  );
}
```

## useConfigValidation

Validate configuration with schemas.

**Location**: `/home/user/enzyme/src/config/hooks/useConfigValidation.ts`

### Basic Usage

```tsx
import { useConfigValidation } from '@/config/hooks';
import { z } from 'zod';

const configSchema = z.object({
  theme: z.enum(['light', 'dark']),
  language: z.string(),
  fontSize: z.number().min(8).max(72)
});

function ConfigValidator() {
  const validation = useConfigValidation(config, configSchema);

  if (!validation.isValid) {
    return (
      <div>
        <h3>Validation Errors</h3>
        {validation.errors.map((error, i) => (
          <div key={i}>{error.message}</div>
        ))}
      </div>
    );
  }

  return <div>Configuration is valid</div>;
}
```

### Type Definition

```typescript
interface UseConfigValidationResult {
  /** Validation state */
  isValid: boolean;

  /** Validation errors */
  errors: ValidationError[];

  /** Validation warnings */
  warnings: ValidationWarning[];

  /** Validate function */
  validate: () => boolean;

  /** Validated data */
  data?: unknown;
}
```

### useNamespaceValidation

Validate entire namespace:

```tsx
import { useNamespaceValidation } from '@/config/hooks';

function NamespaceValidator() {
  const validation = useNamespaceValidation('ui', uiConfigSchema);

  return (
    <div>
      <div>Valid: {validation.isValid ? 'Yes' : 'No'}</div>
      <div>Errors: {validation.errors.length}</div>
      <div>Warnings: {validation.warnings.length}</div>
    </div>
  );
}
```

### useValidationErrors

Get validation errors:

```tsx
import { useValidationErrors } from '@/config/hooks';

function ErrorDisplay() {
  const errors = useValidationErrors('ui');

  if (errors.length === 0) return null;

  return (
    <div>
      {errors.map((error, i) => (
        <div key={i} className="error">
          {error.path}: {error.message}
        </div>
      ))}
    </div>
  );
}
```

### useValidationWarnings

Get validation warnings:

```tsx
import { useValidationWarnings } from '@/config/hooks';

function WarningDisplay() {
  const warnings = useValidationWarnings('ui');

  if (warnings.length === 0) return null;

  return (
    <div>
      {warnings.map((warning, i) => (
        <div key={i} className="warning">
          {warning.message}
        </div>
      ))}
    </div>
  );
}
```

### useConfigHealthCheck

Check configuration health:

```tsx
import { useConfigHealthCheck } from '@/config/hooks';

function HealthStatus() {
  const health = useConfigHealthCheck();

  return (
    <div>
      <div>Status: {health.status}</div>
      <div>Valid Namespaces: {health.validNamespaces.length}</div>
      <div>Invalid Namespaces: {health.invalidNamespaces.length}</div>
      <div>Total Errors: {health.totalErrors}</div>
    </div>
  );
}
```

## Usage Patterns

### Persistent Configuration

```tsx
import { useConfig } from '@/config/hooks';

function UserPreferences() {
  const [preferences, setPreferences] = useConfig(
    'user',
    'preferences',
    {},
    { persist: true }
  );

  return (
    <div>
      <PreferenceEditor
        value={preferences}
        onChange={setPreferences}
      />
    </div>
  );
}
```

### Validated Configuration

```tsx
import { useConfig } from '@/config/hooks';
import { z } from 'zod';

const settingsSchema = z.object({
  notifications: z.boolean(),
  autoSave: z.boolean(),
  interval: z.number().min(1000)
});

function Settings() {
  const config = useConfig('app', 'settings', {}, {
    schema: settingsSchema
  });

  if (config.error) {
    return <div>Invalid configuration</div>;
  }

  return <SettingsForm value={config.value} />;
}
```

### Conditional Features

```tsx
import { useFeatureFlag } from '@/config/hooks';

function ConditionalFeature() {
  const showAnalytics = useFeatureFlag('analytics');
  const showReports = useFeatureFlag('reports');

  return (
    <div>
      {showAnalytics && <Analytics />}
      {showReports && <Reports />}
    </div>
  );
}
```

### Real-time Configuration

```tsx
import { useConfigValue } from '@/config/hooks';

function RealtimeConfig() {
  const config = useConfigValue('app', 'settings', null, {
    subscribe: true
  });

  // Automatically updates when config changes

  return <ConfigDisplay config={config} />;
}
```

## Best Practices

### 1. Use Appropriate Hook

```tsx
// Read-only: useConfigValue
const apiUrl = useConfigValue('api', 'baseUrl');

// Read-write: useConfig
const [theme, setTheme] = useConfig('ui', 'theme');

// Feature flags: useFeatureFlag
const enabled = useFeatureFlag('my-feature');
```

### 2. Provide Defaults

```tsx
// Always provide default values
const timeout = useConfigValue('api', 'timeout', 30000);
const theme = useConfig('ui', 'theme', 'light');
```

### 3. Type Configuration

```tsx
interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
}

const apiConfig = useConfigValue<ApiConfig>('api', 'config');
```

### 4. Validate Early

```tsx
const validation = useConfigValidation(config, schema);

if (!validation.isValid) {
  // Handle invalid configuration
  return <ErrorState errors={validation.errors} />;
}
```

### 5. Memoize Complex Values

```tsx
const config = useConfigValue('app', 'complex');

const processedConfig = useMemo(
  () => processConfig(config),
  [config]
);
```

## Testing

### Mock Hooks

```typescript
import { vi } from 'vitest';

vi.mock('@/config/hooks', () => ({
  useConfig: vi.fn().mockReturnValue(['light', vi.fn()]),
  useConfigValue: vi.fn().mockReturnValue('mock-value'),
  useFeatureFlag: vi.fn().mockReturnValue(true)
}));
```

### Test Component

```tsx
import { renderHook } from '@testing-library/react';
import { useConfig } from '@/config/hooks';

describe('useConfig', () => {
  it('returns value and setter', () => {
    const { result } = renderHook(() =>
      useConfig('test', 'key', 'default')
    );

    expect(result.current.value).toBe('default');
    expect(typeof result.current.setValue).toBe('function');
  });
});
```

## Related Documentation

### Configuration System
- [README.md](./README.md) - Configuration overview
- [REGISTRY.md](./REGISTRY.md) - Configuration registry
- [PROVIDERS.md](./PROVIDERS.md) - Configuration providers
- [DYNAMIC.md](./DYNAMIC.md) - Dynamic configuration
- [ENV.md](./ENV.md) - Environment configuration
- [TYPES.md](./TYPES.md) - TypeScript types

### Other Hooks
- [State Hooks](../state/HOOKS.md) - State management hooks
- [API Hooks](../api/HOOKS.md) - API data fetching hooks
- [Feature Flag Hooks](../flags/HOOKS.md) - Feature flag hooks
- [Auth Hooks](../auth/HOOKS.md) - Authentication hooks

### State & API Integration
- [State System](../state/README.md) - Using config with state
- [API Client](../api/README.md) - API configuration patterns
